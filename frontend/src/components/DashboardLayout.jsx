import { useState, useEffect } from "react";
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
import { authAPI, flowforgeAPI, unitsAPI } from "../lib/api";
import { toast } from "sonner";
import { AnalyticsProvider, useAnalytics } from "../context/AnalyticsContext";
import { useTheme } from "../context/ThemeContext";
import { hasUnitAccess, hasFullAccess, canManageUsers } from "../context/UserContext";
import FlowForgeFAB from "./FlowForgeFAB";

const UNITS = [
  { name: "Talent & Delivery", slug: "talent", icon: Users, path: "/talent" },
  { name: "THCO HR", slug: "thco-hr", icon: UserCog, path: "/thco-hr" },
  { name: "THCO Flow", slug: "flow", icon: FolderKanban, path: "/flow" },
  { name: "IT & THCO Tools", slug: "it-tools", icon: Wrench, path: "/it-tools" },
  { name: "Sales & Business Dev", slug: "sales", icon: TrendingUp, path: "/sales" },
  { name: "Marketing & Brand", slug: "marketing", icon: Megaphone, path: "/marketing" },
  { name: "Advisory & Consulting", slug: "advisory", icon: Briefcase, path: "/advisory" },
  { name: "Technology & Build", slug: "technology", icon: Code, path: "/technology" },
  { name: "Operations & Finance", slug: "operations", icon: Building2, path: "/operations" },
  { name: "Academy & Learning", slug: "academy", icon: GraduationCap, path: "/academy" },
  { name: "Client Delivery", slug: "client-delivery", icon: Truck, path: "/client-delivery" },
];

// Map stored icon keys (admin-created units) to lucide components for the sidebar
const DYN_ICON_MAP = {
  "layers": Layers, "building-2": Building2, "users": Users, "briefcase": Briefcase,
  "wrench": Wrench, "trending-up": TrendingUp, "megaphone": Megaphone, "graduation-cap": GraduationCap,
  "code": Code, "truck": Truck, "clipboard-list": ClipboardList, "headphones": Headphones,
  "folder-kanban": FolderKanban, "lightbulb": Layers,
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

const DashboardLayoutInner = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [dynamicUnits, setDynamicUnits] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();
  const { theme, toggleTheme } = useTheme();

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
    if (path === "/admin/users") return "User Management";
    if (path.startsWith("/admin/assessments")) return "Candidate Assessments";
    if (path.startsWith("/talent")) {
      if (path === "/talent") return "Talent & Delivery";
      if (path === "/talent/sourcing") return "AI Candidate Sourcing";
      if (path === "/talent/database-search") return "Database Search";
      if (path === "/talent/candidates") return "Candidate Database";
      if (path === "/talent/candidates/upload") return "Upload CVs";
      if (path === "/talent/sourcing/external") return "External Sourcing";
      if (path === "/talent/find") return "Find Candidates";
      if (path === "/talent/network") return "Talent Network";
    }
    if (path === "/thco-hr") return "THCO HR";
    if (path === "/project-management") return "Project Management";
    if (path.startsWith("/flow")) return "THCO Flow";
    if (path === "/it-tools") return "IT & THCO Tools";
    const unit = UNITS.find((u) => path.startsWith(u.path));
    return unit?.name || "Dashboard";
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
  // Super admins and HR see every unit; everyone else sees their assignments (+ Flow, which is org-wide).
  // Merge hardcoded units with admin-created dynamic units.
  const dynamicNavUnits = dynamicUnits
    .filter((u) => hasUnitAccess(user, u.slug))
    .map((u) => ({
      slug: u.slug,
      name: u.name,
      path: `/unit/${u.slug}`,
      icon: DYN_ICON_MAP[u.icon] || Building2,
    }));
  const visibleUnits = [
    ...UNITS.filter((unit) => hasUnitAccess(user, unit.slug)),
    ...dynamicNavUnits,
  ];

  const showAdminSection = user?.role === "super_admin" || canManageUsers(user) || user?.is_hr;

  // Quick navigator: every destination this person can reach, searchable from the top bar
  const searchIndex = [
    { label: "New Project", path: "/flow/projects/new", group: "Portal" },
    { label: "Dashboard", path: "/dashboard", group: "Portal" },
    // Kept out of quick search for non-administrators too; a hidden menu item
    // that is still reachable from the search bar is not hidden.
    ...(showAdminSection
      ? [{ label: "Proposals & Clients", path: "/proposals", group: "Portal" },
         { label: "Feedback", path: "/feedback", group: "Portal" }]
      : []),
    { label: "Tasks", path: "/tasks", group: "Portal" },
    ...visibleUnits.map((u) => ({ label: u.name, path: u.path, group: "Units" })),
    { label: "Flow · Pipeline Board", path: "/flow/board", group: "THCO Flow" },
    { label: "Flow · Projects", path: "/flow/projects", group: "THCO Flow" },
    { label: "Flow · Contacts", path: "/flow/contacts", group: "THCO Flow" },
    { label: "Flow · Calendar", path: "/flow/calendar", group: "THCO Flow" },
    { label: "Flow · Prospects", path: "/flow/prospects", group: "THCO Flow" },
    { label: "Flow · Tickets", path: "/flow/tickets", group: "THCO Flow" },
    { label: "Flow · Messages", path: "/flow/messages", group: "THCO Flow" },
    ...(hasUnitAccess(user, "talent")
      ? [
          { label: "AI Candidate Sourcing", path: "/talent/sourcing", group: "Talent Tools" },
          { label: "Database Search", path: "/talent/database-search", group: "Talent Tools" },
          { label: "Talent Projects", path: "/talent/projects", group: "Talent Tools" },
          { label: "Candidate Database", path: "/talent/candidates", group: "Talent Tools" },
          { label: "Upload CVs", path: "/talent/candidates/upload", group: "Talent Tools" },
          { label: "Find Candidates", path: "/talent/find", group: "Talent Tools" },
          { label: "External Sourcing", path: "/talent/sourcing/external", group: "Talent Tools" },
          { label: "Talent Network", path: "/talent/network", group: "Talent Tools" },
        ]
      : []),
    ...(canManageUsers(user) ? [{ label: "User Management", path: "/admin/users", group: "Admin" }] : []),
    ...(user?.role === "super_admin" || user?.is_hr
      ? [{ label: "Candidate Assessments", path: "/admin/assessments", group: "Admin" }]
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
      {/* Sidebar — deep ink with gold accents */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 bg-[#0C0F13] transition-all duration-300 flex flex-col
          ${sidebarOpen ? "w-[248px]" : "w-[72px]"}`}
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
        <div className={`h-[68px] flex items-center border-b border-white/[0.06] ${sidebarOpen ? "px-5 justify-between" : "px-0 justify-center"} relative z-10`}>
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 shrink-0 rounded-md bg-gradient-to-br from-[#C6A15B] to-[#8F7340] flex items-center justify-center">
              <span className="font-display text-[#0C0F13] text-sm font-semibold">T</span>
            </span>
            {sidebarOpen && (
              <span className="min-w-0">
                <span className="block font-display text-white text-[15px] leading-tight tracking-wide">THCO</span>
                <span className="block text-[8px] uppercase tracking-[0.35em] text-[#6B7280]">Control Room</span>
              </span>
            )}
          </Link>
          {sidebarOpen ? (
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              data-testid="sidebar-retract-toggle"
              className="p-1.5 text-[#9AA0AB] hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <PanelLeftClose size={18} />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Expand sidebar"
              data-testid="sidebar-retract-toggle"
              className="p-1.5 text-white/[0.85] hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 py-5 px-3 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#2a2f38_transparent]">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} collapsed={!sidebarOpen} testId="nav-dashboard" />
          {/* Proposals carry commercial terms and feedback carries internal
              reports; both are administrative rather than general staff views.
              The API enforces this too -- hiding a menu is not access control. */}
          {showAdminSection && (
            <>
              <div className="mt-1">
                <NavItem to="/proposals" icon={FileText} label="Proposals" active={isActive("/proposals")} collapsed={!sidebarOpen} testId="nav-proposals" />
              </div>
              <div className="mt-1">
                <NavItem to="/feedback" icon={MessageSquare} label="Feedback" active={isActive("/feedback")} collapsed={!sidebarOpen} testId="nav-feedback" />
              </div>
            </>
          )}
          <div className="mt-1">
            <NavItem to="/tasks" icon={KanbanSquare} label="Tasks" active={isActive("/tasks")} collapsed={!sidebarOpen} testId="nav-tasks" />
          </div>

          <SectionLabel collapsed={!sidebarOpen}>Business Units</SectionLabel>
          <div className="space-y-0.5">
            {visibleUnits.map((unit) => (
              <NavItem
                key={unit.slug}
                to={unit.path}
                icon={unit.icon}
                label={unit.name}
                active={isActive(unit.path)}
                collapsed={!sidebarOpen}
                testId={`nav-unit-${unit.slug}`}
              />
            ))}
          </div>

          {showAdminSection && (
            <>
              <SectionLabel collapsed={!sidebarOpen}>Administration</SectionLabel>
              <div className="space-y-0.5">
                {user?.role === "super_admin" && (
                  <NavItem
                    to="/admin/approvals"
                    icon={ClipboardCheck}
                    label="Approval Queue"
                    active={isActive("/admin/approvals")}
                    collapsed={!sidebarOpen}
                    badge={pendingApprovals}
                    testId="nav-approval-queue"
                  />
                )}
                {canManageUsers(user) && (
                  <NavItem
                    to="/admin/users"
                    icon={ShieldCheck}
                    label="User Management"
                    active={isActive("/admin/users")}
                    collapsed={!sidebarOpen}
                    testId="nav-user-management"
                  />
                )}
                {user?.role === "super_admin" && (
                  <NavItem
                    to="/admin/business-units"
                    icon={Building2}
                    label="Business Units"
                    active={isActive("/admin/business-units")}
                    collapsed={!sidebarOpen}
                    testId="nav-business-units"
                  />
                )}
                {(user?.role === "super_admin" || user?.is_hr) && (
                  <NavItem
                    to="/admin/assessments"
                    icon={ClipboardList}
                    label="Assessments"
                    active={isActive("/admin/assessments")}
                    collapsed={!sidebarOpen}
                    testId="nav-assessments"
                  />
                )}
                {(user?.role === "super_admin" || user?.is_it || (user?.accessible_units || []).includes("it-tools")) && (
                  <NavItem
                    to="/it-feedback"
                    icon={Headphones}
                    label="IT Console"
                    active={isActive("/it-feedback")}
                    collapsed={!sidebarOpen}
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
              <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.06] transition-colors ${sidebarOpen ? "" : "justify-center"}`}>
                <Avatar className="w-8 h-8 border border-white/10">
                  <AvatarImage src={user?.picture} />
                  <AvatarFallback className="bg-[#C6A15B]/20 text-[#D6BC8A] text-xs font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {sidebarOpen && (
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
          <div className="flex items-center gap-4">
            {/* Page Title */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#A9834E] leading-none mb-1">THCO</p>
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
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-500 hover:text-gray-800 hover:bg-[#EFEDE8] rounded-full"
              data-testid="notifications-btn"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#C6A15B] rounded-full"></span>
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-[#EFEDE8] rounded-full px-1.5"
                  data-testid="user-dropdown-trigger"
                >
                  <Avatar className="w-8 h-8 border border-[#EAE7E0]">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-[#14181D] text-[#D6BC8A] text-xs font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown size={14} className="text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-[#EAE7E0] shadow-xl rounded-xl">
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
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
