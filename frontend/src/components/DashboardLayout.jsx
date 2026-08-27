import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Users,
  TrendingUp,
  Megaphone,
  Briefcase,
  Code,
  Building2,
  GraduationCap,
  Truck,
  Settings,
  MessageSquare,
  Headphones,
  Bell,
  Volume2,
  VolumeX,
  Search,
  ChevronDown,
  LogOut,
  User,
  FileText,
  UserCog,
  FolderKanban,
  Wrench,
  ClipboardCheck,
  ClipboardList,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  KanbanSquare,
  Cake,
  Menu,
  X,
  Home,
  Scale,
  DollarSign,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { authAPI, flowforgeAPI, unitsAPI, notificationsAPI } from "../lib/api";
import {
  alertNewNotifications, soundEnabled, setSoundEnabled,
  desktopPermission, requestDesktopPermission, playNotificationSound,
} from "../lib/notificationAlert";
import { toast } from "sonner";
import { AnalyticsProvider, useAnalytics } from "../context/AnalyticsContext";
import { useTheme } from "../context/ThemeContext";
import { hasUnitAccess, hasFullAccess, canManageUsers, canCreateProjects, isUnitHead } from "../context/UserContext";
import FlowForgeFAB from "./FlowForgeFAB";

// Routing + default icon for the units that predate the generic
// `UnitPage.jsx` template and have their own bespoke page instead. This map
// is the ONLY thing that's static -- whether one of these units still exists
// and what it's called always comes from the units collection (`dynamicUnits`
// below), so a rename or delete in Business Units Admin shows up here
// immediately instead of being masked by a hardcoded name.
//
// Crowther OS ("flow") is deliberately not in this map: it's the delivery
// pipeline product, not a business unit, has no record in the units
// collection, and already gets its own fixed nav item further down.
const BUILTIN_UNIT_META = {
  "talent": { icon: Users, path: "/talent" },
  "thco-hr": { icon: UserCog, path: "/thco-hr" },
  "it-tools": { icon: Wrench, path: "/it-tools" },
  "sales": { icon: TrendingUp, path: "/sales" },
  "marketing": { icon: Megaphone, path: "/marketing" },
  "advisory": { icon: Briefcase, path: "/advisory" },
  "technology": { icon: Code, path: "/technology" },
  "operations": { icon: Building2, path: "/operations" },
  "academy": { icon: GraduationCap, path: "/academy" },
  "client-delivery": { icon: Truck, path: "/client-delivery" },
};

// Map stored icon keys (admin-created units) to lucide components for the sidebar
const DYN_ICON_MAP = {
  "layers": Layers, "building-2": Building2, "users": Users, "briefcase": Briefcase,
  "wrench": Wrench, "trending-up": TrendingUp, "megaphone": Megaphone, "graduation-cap": GraduationCap,
  "code": Code, "truck": Truck, "clipboard-list": ClipboardList, "headphones": Headphones,
  "folder-kanban": FolderKanban, "lightbulb": Layers,
  "home": Home, "scale": Scale, "dollar-sign": DollarSign, "shield-check": ShieldCheck,
};

const NavItem = ({ to, icon: Icon, label, active, collapsed, badge, testId }) => (
  <Link
    to={to}
    data-testid={testId}
    title={collapsed ? label : undefined}
    className={`group relative flex items-center gap-3 px-3 py-[9px] rounded-lg transition-all duration-200
      ${active ? "bg-white/[0.07] text-white" : "text-[#9AA0AB] hover:text-white hover:bg-white/[0.04]"}
      ${collapsed ? "justify-center" : ""}`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-[#C6A15B]" />
    )}
    <span className="relative">
      <Icon size={17} strokeWidth={active ? 2 : 1.6} className={active ? "text-[#C6A15B]" : ""} />
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-[#C6A15B] text-[#0C0F13] text-[9px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </span>
    {!collapsed && <span className="text-[13px] tracking-wide truncate">{label}</span>}
    {!collapsed && badge > 0 && (
      <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-[#C6A15B]/15 text-[#D6BC8A] rounded-full font-semibold">
        {badge}
      </span>
    )}
  </Link>
);

const SectionLabel = ({ children, collapsed }) =>
  collapsed ? (
    <div className="my-4 mx-3 h-px bg-white/[0.06]" />
  ) : (
    <div className="mt-7 mb-2 px-3">
      <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#5C626D]">{children}</span>
    </div>
  );

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const DashboardLayoutInner = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // On a phone the sidebar is a drawer that starts shut. It used to be
  // `fixed` below lg with nothing to hide it, so 248px of menu sat on top of a
  // 375px screen and left a third of the page readable, with no way to move
  // it -- `sidebarOpen` only ever changed its width.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches
  );
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [dynamicUnits, setDynamicUnits] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // What the count was at the previous poll, so a rise can be told from a
  // steady state. A ref rather than state: changing it must not re-render, and
  // the polling closure needs to read the latest value.
  const lastUnreadRef = useRef(null);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [desktopState, setDesktopState] = useState(desktopPermission);
  const location = useLocation();
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => {
      setIsDesktop(e.matches);
      // Rotating to landscape must not leave a drawer open over a layout that
      // no longer needs one.
      if (e.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Following a link should get you to the page, not leave you looking at the
  // menu you tapped it from.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Collapsing to icons is a desktop affordance. On a phone the drawer is
  // either shown in full or not at all, so labels are always readable.
  const collapsed = isDesktop && !sidebarOpen;

  // A birthday is something only the person themselves can supply, so the
  // application has to ask rather than wait. The mark sits on their own avatar
  // and stays until they fill it in -- a prompt they can ignore today and will
  // still see tomorrow, without a dialog interrupting whatever they opened the
  // app to do.
  const needsBirthday = Boolean(user) && !user.birthday;

  // Fetch pending approvals count
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      if (user?.role === "super_admin") {
        try {
          const stats = await flowforgeAPI.getApprovalStats();
          setPendingApprovals(stats.pending || 0);
        } catch (error) {
          console.error("Failed to fetch approval stats:", error);
        }
      }
    };

    fetchPendingApprovals();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingApprovals, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Notification bell: poll the cheap unread count, and pull the full list only
  // when the dropdown is opened.
  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.list({ limit: 30 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread || 0);
      lastUnreadRef.current = data.unread || 0;
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  useEffect(() => {
    // Compared against the previous poll to detect *arrival* rather than
    // presence. `null` on the first run so a person who logs in with unread
    // notifications already waiting is not greeted by a chime for things they
    // have seen before.
    const refreshUnread = async () => {
      try {
        const { unread = 0 } = await notificationsAPI.unreadCount();
        setUnreadCount(unread);

        const previous = lastUnreadRef.current;
        lastUnreadRef.current = unread;
        if (previous === null || unread <= previous) return;

        // Something new landed. Fetch just enough to name it in the desktop
        // popup -- the count alone would make for a useless notification.
        let latest = null;
        try {
          const data = await notificationsAPI.list({ limit: 1, unread_only: true });
          latest = (data.notifications || [])[0] || null;
          setNotifications(data.notifications || []);
        } catch {
          /* the sound still fires without it */
        }
        alertNewNotifications({
          count: unread - previous,
          latest,
          onNavigate: (link) => navigate(link),
        });
      } catch {
        /* a failed poll is not worth surfacing; the next one is 20s away */
      }
    };

    refreshUnread();
    // 20s rather than 30: this is now how somebody working in another window
    // finds out at all, so the delay is the delay before they hear anything.
    const interval = setInterval(refreshUnread, 20000);
    return () => clearInterval(interval);
  }, [navigate]);

  const openNotification = async (n) => {
    if (!n.read) {
      try {
        await notificationsAPI.markRead(n.notification_id);
      } catch (error) {
        console.error("Failed to mark notification read:", error);
      }
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((list) =>
        list.map((x) => (x.notification_id === n.notification_id ? { ...x, read: true } : x))
      );
    }
    if (n.link) navigate(n.link);
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationsAPI.markRead();
      setUnreadCount(0);
      setNotifications((list) => list.map((x) => ({ ...x, read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  };

  const handleLogout = async () => {
    try {
      trackAction("click", "logout_button", { method: "user_dropdown" });
      await authAPI.logout();
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/settings") return "Settings";
    if (path === "/proposals") return "Proposals";
    if (path === "/tasks") return "Tasks";
    if (path === "/admin/approvals") return "Approval Queue";
    if (path === "/admin/users") return "Staff Management";
    if (path.startsWith("/admin/assessments")) return "Talent Assessments";
    if (path.startsWith("/talent")) {
      if (path === "/talent") return dynamicUnits.find((u) => u.slug === "talent")?.name || "Talent & Delivery";
      if (path === "/talent/sourcing") return "AI Candidate Sourcing";
      if (path === "/talent/database-search") return "Database Search";
      if (path === "/talent/candidates") return "Talent Database";
      if (path === "/talent/candidates/upload") return "Upload CVs";
      if (path === "/talent/sourcing/external") return "External Sourcing";
      if (path === "/talent/find") return "Find Talent";
      if (path === "/talent/network") return "Talent Network";
      if (path === "/talent/duplicates") return "Duplicate Review";
    }
    if (path === "/thco-hr") return dynamicUnits.find((u) => u.slug === "thco-hr")?.name || "Crowther HR";
    if (path === "/project-management") return "Project Management";
    if (path.startsWith("/flow")) return "Crowther OS";
    if (path === "/it-tools") return dynamicUnits.find((u) => u.slug === "it-tools")?.name || "IT & Crowther Tools";
    // Generic unit pages: same fetched list as the sidebar, so a rename
    // reflects here too.
    if (path.startsWith("/unit/")) {
      const slug = path.split("/")[2];
      const unit = dynamicUnits.find((u) => u.slug === slug);
      if (unit) return unit.name;
    }
    return "Dashboard";
  };

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  // Fetch admin-created business units (dynamic) and merge into the nav
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await unitsAPI.list();
        if (active) setDynamicUnits(data || []);
      } catch (e) {
        // non-fatal: hardcoded units still render
      }
    })();
    return () => { active = false; };
  }, []);

  // Only show the units this person is allowed to enter.
  // Super admins and HR see every unit; everyone else sees their assignments.
  //
  // Every entry here -- built-in or admin-created -- is sourced from
  // `dynamicUnits` (the live units collection), so a rename or delete in
  // Business Units Admin is reflected the moment this list is refetched.
  // BUILTIN_UNIT_META only overrides the route + default icon for units that
  // have a bespoke page; anything not in that map falls through to the
  // generic `UnitPage.jsx` template at `/unit/:slug`.
  const dynamicNavUnits = dynamicUnits
    .filter((u) => !u.hidden && hasUnitAccess(user, u.slug))
    .map((u) => {
      const meta = BUILTIN_UNIT_META[u.slug];
      return {
        slug: u.slug,
        name: u.name,
        path: meta ? meta.path : `/unit/${u.slug}`,
        // "layers" is the default every unit is created with, so a built-in
        // unit that was never given a custom icon keeps its bespoke default
        // instead of showing the same generic icon as everything else.
        icon: (u.icon !== "layers" && DYN_ICON_MAP[u.icon]) || (meta && meta.icon) || DYN_ICON_MAP[u.icon] || Building2,
      };
    });

  // Staff who have not been put on a project yet get no business units at
  // all -- not Flow, not a unit page. Everything under this heading is work
  // they have not been given, so it stays closed until their unit head adds
  // them to a project.
  const seesBusinessUnits =
    hasFullAccess(user) || canManageUsers(user) || isUnitHead(user) || Boolean(user?.has_projects);

  const visibleUnits = seesBusinessUnits ? dynamicNavUnits : [];

  const showAdminSection = user?.role === "super_admin" || canManageUsers(user) || user?.is_hr;

  // Quick navigator: every destination this person can reach, searchable from the top bar
  const searchIndex = [
    // Only a unit head (or an admin) can open a project, so offering it to
    // anyone else is a route to a refusal.
    ...(canCreateProjects(user)
      ? [{ label: "New Project", path: "/flow/projects/new", group: "Portal" }]
      : []),
    { label: "Dashboard", path: "/dashboard", group: "Portal" },
    // Proposals stay out of quick search for non-administrators too; a hidden
    // menu item still reachable from the search bar is not hidden.
    ...(showAdminSection
      ? [{ label: "Proposals & Clients", path: "/proposals", group: "Portal" }]
      : []),
    { label: "Feedback & IT Support", path: "/feedback", group: "Portal" },
    { label: "Tasks", path: "/tasks", group: "Portal" },
    ...visibleUnits.map((u) => ({ label: u.name, path: u.path, group: "Units" })),
    // Flow is hidden from staff who are not on a project, so it must be out
    // of quick search for them too -- a hidden menu item still reachable from
    // the search bar is not hidden.
    ...(hasUnitAccess(user, "flow")
      ? [
          { label: "Pipeline Board", path: "/flow/board", group: "Crowther OS" },
          { label: "Projects", path: "/flow/projects", group: "Crowther OS" },
          { label: "Contacts", path: "/flow/contacts", group: "Crowther OS" },
          { label: "Calendar", path: "/flow/calendar", group: "Crowther OS" },
          { label: "Prospects", path: "/flow/prospects", group: "Crowther OS" },
          { label: "Tickets", path: "/flow/tickets", group: "Crowther OS" },
          { label: "Messages", path: "/flow/messages", group: "Crowther OS" },
        ]
      : []),
    ...(hasUnitAccess(user, "talent")
      ? [
          { label: "AI Candidate Sourcing", path: "/talent/sourcing", group: "Talent Tools" },
          { label: "Database Search", path: "/talent/database-search", group: "Talent Tools" },
          { label: "Talent Projects", path: "/talent/projects", group: "Talent Tools" },
          { label: "Talent Database", path: "/talent/candidates", group: "Talent Tools" },
          { label: "Upload CVs", path: "/talent/candidates/upload", group: "Talent Tools" },
          { label: "Find Talent", path: "/talent/find", group: "Talent Tools" },
          { label: "External Sourcing", path: "/talent/sourcing/external", group: "Talent Tools" },
          { label: "Talent Network", path: "/talent/network", group: "Talent Tools" },
          { label: "Duplicate Review", path: "/talent/duplicates", group: "Talent Tools" },
        ]
      : []),
    ...(canManageUsers(user) ? [{ label: "Staff Management", path: "/admin/users", group: "Admin" }] : []),
    ...(user?.role === "super_admin" || user?.is_hr
      ? [{ label: "Talent Assessments", path: "/admin/assessments", group: "Admin" }]
      : []),
    ...(user?.role === "super_admin"
      ? [
          { label: "Approval Queue", path: "/admin/approvals", group: "Admin" },
          { label: "Settings & Integrations", path: "/settings", group: "Admin" },
        ]
      : []),
  ];

  const searchResults = searchQuery.trim()
    ? searchIndex.filter((r) => r.label.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  const goToResult = (path) => {
    trackAction("click", "search_navigate", { path, query: searchQuery });
    setSearchQuery("");
    setSearchFocused(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex">
      {/* Tapping away from the drawer closes it, which is what everybody
          expects and the only way out on a screen with no room to spare. */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar — deep ink with gold accents */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 bg-[#0C0F13] transition-all duration-300 flex flex-col
          ${collapsed ? "w-[72px]" : "w-[248px]"}
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Aurora background */}
        <img
          src="/login-aurora.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        {/* Dark overlay for legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(8,12,16,0.80) 0%, rgba(8,12,16,0.62) 50%, rgba(8,12,16,0.85) 100%)" }}
        />
        {/* Logo */}
        <div className={`h-[68px] flex items-center border-b border-white/[0.06] ${collapsed ? "px-0 justify-center" : "px-5 justify-between"} relative z-10`}>
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 shrink-0 rounded-md bg-[#0C0F13] border border-[#1FB58A]/30 flex items-center justify-center p-1">
              <img src="/crowther-icon.png" alt="Crowther" className="w-full h-full object-contain" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block font-display text-white text-[15px] leading-tight tracking-wide">Crowther</span>
                <span className="block text-[8px] uppercase tracking-[0.35em] text-[#6B7280]">Delivery OS</span>
              </span>
            )}
          </Link>

          {/* On a phone this closes the drawer. Collapsing to icons is a
              desktop idea and would only leave a narrower obstruction. */}
          <button
            onClick={() => setMobileNavOpen(false)}
            title="Close menu"
            data-testid="sidebar-close-mobile"
            className="lg:hidden p-1.5 text-[#9AA0AB] hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>

          {sidebarOpen ? (
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              data-testid="sidebar-retract-toggle"
              className="hidden lg:block p-1.5 text-[#9AA0AB] hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <PanelLeftClose size={18} />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Expand sidebar"
              data-testid="sidebar-retract-toggle"
              className="hidden lg:block p-1.5 text-white/[0.85] hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 py-5 px-3 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#2a2f38_transparent]">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} collapsed={collapsed} testId="nav-dashboard" />
          {/* Crowther OS is the delivery pipeline and the reason most people
              are here, so it sits in the main navigation rather than under a
              "Business Units" heading it is not a member of. Who may enter is
              still decided by the API. */}
          {hasUnitAccess(user, "flow") && (
            <div className="mt-1">
              <NavItem to="/flow" icon={FolderKanban} label="Crowther OS" active={isActive("/flow")} collapsed={collapsed} testId="nav-crowther-os" />
            </div>
          )}
          {/* Proposals carry commercial terms and client pricing, so they are
              administrative. The API enforces this too -- hiding a menu is not
              access control. */}
          {showAdminSection && (
            <div className="mt-1">
              <NavItem to="/proposals" icon={FileText} label="Proposals" active={isActive("/proposals")} collapsed={collapsed} testId="nav-proposals" />
            </div>
          )}
          {/* Everyone keeps this: it is where staff raise an IT problem, not
              the console that handles them. That console lives under
              Administration as "IT Console" and stays restricted. */}
          <div className="mt-1">
            <NavItem to="/feedback" icon={MessageSquare} label="Feedback & IT Support" active={isActive("/feedback")} collapsed={collapsed} testId="nav-feedback" />
          </div>
          <div className="mt-1">
            <NavItem to="/tasks" icon={KanbanSquare} label="Tasks" active={isActive("/tasks")} collapsed={collapsed} testId="nav-tasks" />
          </div>

          {/* Hidden entirely for staff with no project: an empty heading is
              just a reminder of rooms they cannot enter. */}
          {visibleUnits.length > 0 && (
            <SectionLabel collapsed={collapsed}>Business Units</SectionLabel>
          )}
          <div className="space-y-0.5">
            {visibleUnits.map((unit) => (
              <NavItem
                key={unit.slug}
                to={unit.path}
                icon={unit.icon}
                label={unit.name}
                active={isActive(unit.path)}
                collapsed={collapsed}
                testId={`nav-unit-${unit.slug}`}
              />
            ))}
          </div>

          {showAdminSection && (
            <>
              <SectionLabel collapsed={collapsed}>Administration</SectionLabel>
              <div className="space-y-0.5">
                {user?.role === "super_admin" && (
                  <NavItem
                    to="/admin/approvals"
                    icon={ClipboardCheck}
                    label="Approval Queue"
                    active={isActive("/admin/approvals")}
                    collapsed={collapsed}
                    badge={pendingApprovals}
                    testId="nav-approval-queue"
                  />
                )}
                {canManageUsers(user) && (
                  <NavItem
                    to="/admin/users"
                    icon={ShieldCheck}
                    label="Staff Management"
                    active={isActive("/admin/users")}
                    collapsed={collapsed}
                    testId="nav-user-management"
                  />
                )}
                {canManageUsers(user) && (
                  <NavItem
                    to="/admin/business-units"
                    icon={Building2}
                    label="Business Units"
                    active={isActive("/admin/business-units")}
                    collapsed={collapsed}
                    testId="nav-business-units"
                  />
                )}
                {(user?.role === "super_admin" || user?.is_hr) && (
                  <NavItem
                    to="/admin/assessments"
                    icon={ClipboardList}
                    label="Assessments"
                    active={isActive("/admin/assessments")}
                    collapsed={collapsed}
                    testId="nav-assessments"
                  />
                )}
                {(user?.role === "super_admin" || user?.is_it || (user?.accessible_units || []).includes("it-tools")) && (
                  <NavItem
                    to="/it-feedback"
                    icon={Headphones}
                    label="IT Console"
                    active={isActive("/it-feedback")}
                    collapsed={collapsed}
                    testId="nav-it-console"
                  />
                )}
              </div>
            </>
          )}
        </nav>

        {/* User Profile at Bottom */}
        <div className="relative z-10 p-3 border-t border-white/[0.06]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.06] transition-colors ${collapsed ? "justify-center" : ""}`}>
                <span className="relative shrink-0">
                  <Avatar className="w-8 h-8 border border-white/10">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-[#C6A15B]/20 text-[#D6BC8A] text-xs font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {needsBirthday && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5" data-testid="birthday-nudge-sidebar">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6A15B] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C6A15B] ring-2 ring-[#0C0F13]" />
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[13px] font-medium text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-[#6B7280] truncate">
                      {user?.role === "super_admin" ? "Super Admin" : user?.is_hr ? "HR" : "Team Member"}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 bg-white border-[#EAE7E0] shadow-xl rounded-xl">
              <div className="px-3 py-2.5">
                <p className="text-[13px] font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-[#F0EEE9]" />
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="text-gray-700 focus:bg-[#F7F6F3] focus:text-gray-900 cursor-pointer rounded-lg text-[13px]"
                data-testid="menu-profile-bottom"
              >
                <User size={15} className="mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className="text-gray-700 focus:bg-[#F7F6F3] focus:text-gray-900 cursor-pointer rounded-lg text-[13px]"
                data-testid="menu-settings-bottom"
              >
                <Settings size={15} className="mr-2" />
                Settings
              </DropdownMenuItem>
              {user?.role === "super_admin" && (
                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className="text-gray-700 focus:bg-[#F7F6F3] focus:text-gray-900 cursor-pointer rounded-lg text-[13px]"
                  data-testid="menu-admin-settings-bottom"
                >
                  <ShieldCheck size={15} className="mr-2" />
                  Admin & Integrations
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-[#F0EEE9]" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer rounded-lg text-[13px]"
                data-testid="logout-btn-bottom"
              >
                <LogOut size={15} className="mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-[68px] bg-[#F7F6F3]/85 backdrop-blur-md border-b border-[#EAE7E0] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
            {/* The only way to reach the menu on a phone. Sized to the 44px
                minimum a thumb can reliably hit. */}
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              data-testid="sidebar-open-mobile"
              className="lg:hidden -ml-1 p-3 text-gray-700 hover:text-gray-900 hover:bg-black/[0.04] rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Page Title */}
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#A9834E] leading-none mb-1">Crowther</p>
              <h1 className="font-display text-[17px] text-gray-900 leading-none">{getPageTitle()}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search — quick navigator */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <Input
                placeholder="Go to…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) goToResult(searchResults[0].path);
                  if (e.key === "Escape") { setSearchQuery(""); e.target.blur(); }
                }}
                className="w-56 h-9 pl-9 bg-white border-[#EAE7E0] text-gray-900 placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-[#C6A15B]/20 rounded-full text-[13px]"
                data-testid="search-input"
              />
              {searchFocused && searchResults.length > 0 && (
                <div className="absolute top-11 right-0 w-72 bg-white border border-[#EAE7E0] rounded-xl shadow-xl overflow-hidden z-50" data-testid="search-results">
                  {searchResults.map((r) => (
                    <button
                      key={r.path}
                      onMouseDown={(e) => { e.preventDefault(); goToResult(r.path); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#FBFAF7] transition-colors"
                    >
                      <span className="text-[13px] text-gray-800">{r.label}</span>
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[#A9834E]">{r.group}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchFocused && searchQuery.trim() && searchResults.length === 0 && (
                <div className="absolute top-11 right-0 w-72 bg-white border border-[#EAE7E0] rounded-xl shadow-xl px-4 py-3 z-50">
                  <span className="text-[13px] text-gray-400">No matches for "{searchQuery}"</span>
                </div>
              )}
            </div>

            {/* Build New Tool */}
            <FlowForgeFAB />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="text-gray-500 hover:text-gray-800 hover:bg-[#EFEDE8] rounded-full"
              data-testid="theme-toggle-btn"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            {/* Notifications */}
            <DropdownMenu onOpenChange={(open) => { if (open) loadNotifications(); }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-gray-500 hover:text-gray-800 hover:bg-[#EFEDE8] rounded-full"
                  data-testid="notifications-btn"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#C6A15B] text-[#0C0F13] text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 bg-white border-[#EAE7E0] shadow-xl rounded-xl">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#F0EEE9]">
                  <p className="text-[13px] font-semibold text-gray-900">Notifications</p>
                  <div className="flex items-center gap-2">
                    {/* Muting is one click and it sticks. Somebody who cannot
                        silence an alert silences the whole tab instead. */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !soundOn;
                        setSoundEnabled(next);
                        setSoundOn(next);
                        // Play it when switching on, so "on" is audibly proved
                        // rather than promised -- and this click is also the
                        // user gesture browsers require before audio works.
                        if (next) playNotificationSound({ force: true });
                      }}
                      title={soundOn ? "Sound on — click to mute" : "Sound off — click to unmute"}
                      className="text-gray-400 hover:text-gray-700"
                      data-testid="notification-sound-toggle"
                    >
                      {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-medium text-[#A9834E] hover:text-[#8a6a3e]"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop alerts have to be asked for from a click, so the ask
                    lives here rather than firing on page load — where browsers
                    ignore it and people reflexively hit Block. Shown only while
                    the answer is still "default". */}
                {desktopState === "default" && (
                  <button
                    type="button"
                    onClick={async () => setDesktopState(await requestDesktopPermission())}
                    className="w-full text-left px-3 py-2 bg-[#C6A15B]/[0.08] border-b border-[#F0EEE9]
                               hover:bg-[#C6A15B]/[0.14]"
                    data-testid="enable-desktop-notifications"
                  >
                    <span className="block text-[12px] font-medium text-[#7A6234]">
                      Get alerted in other apps
                    </span>
                    <span className="block text-[11px] text-[#8F7340]">
                      Show a desktop notification when this tab is not in front.
                    </span>
                  </button>
                )}
                <div className="max-h-[360px] overflow-y-auto py-1">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Bell className="w-6 h-6 mx-auto text-gray-300" />
                      <p className="mt-2 text-[13px] text-gray-400">You're all caught up.</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.notification_id}
                        type="button"
                        onClick={() => openNotification(n)}
                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-[#F7F6F3] transition-colors ${n.read ? "" : "bg-[#C6A15B]/[0.06]"}`}
                        data-testid={`notification-item-${n.notification_id}`}
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-[#C6A15B]"}`} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-medium text-gray-900 truncate">{n.title}</span>
                          {n.body && <span className="block text-[12px] text-gray-500 truncate">{n.body}</span>}
                          <span className="block text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-[#EFEDE8] rounded-full px-1.5"
                  data-testid="user-dropdown-trigger"
                >
                  <span className="relative">
                    <Avatar className="w-8 h-8 border border-[#EAE7E0]">
                      <AvatarImage src={user?.picture} />
                      <AvatarFallback className="bg-[#14181D] text-[#D6BC8A] text-xs font-semibold">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {needsBirthday && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5" data-testid="birthday-nudge-header">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6A15B] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C6A15B] ring-2 ring-white" />
                      </span>
                    )}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-[#EAE7E0] shadow-xl rounded-xl">
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                  {needsBirthday && (
                    <button
                      type="button"
                      onClick={() => navigate("/profile")}
                      className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8F7340] hover:text-[#6f5a32] transition-colors"
                      data-testid="birthday-nudge-cta"
                    >
                      <Cake className="w-3 h-3" />
                      Add your birthday
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-[#F0EEE9]" />
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="text-gray-700 focus:bg-[#F7F6F3] focus:text-gray-900 cursor-pointer rounded-lg text-[13px]"
                  data-testid="menu-profile"
                >
                  <User size={15} className="mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className="text-gray-700 focus:bg-[#F7F6F3] focus:text-gray-900 cursor-pointer rounded-lg text-[13px]"
                  data-testid="menu-settings"
                >
                  <Settings size={15} className="mr-2" />
                  Settings
                </DropdownMenuItem>
                {user?.role === "super_admin" && (
                  <DropdownMenuItem
                    onClick={() => navigate("/settings")}
                    className="text-gray-700 focus:bg-[#F7F6F3] focus:text-gray-900 cursor-pointer rounded-lg text-[13px]"
                    data-testid="menu-admin-settings"
                  >
                    <ShieldCheck size={15} className="mr-2" />
                    Admin & Integrations
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#F0EEE9]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer rounded-lg text-[13px]"
                  data-testid="logout-btn"
                >
                  <LogOut size={15} className="mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// Wrapper component that provides analytics context
const DashboardLayout = ({ children, user }) => {
  return (
    <AnalyticsProvider user={user}>
      <DashboardLayoutInner user={user}>
        {children}
      </DashboardLayoutInner>
    </AnalyticsProvider>
  );
};

export default DashboardLayout;
