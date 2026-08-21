import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Megaphone,
  Briefcase,
  Code,
  Building2,
  GraduationCap,
  Truck,
  Wrench,
  Activity,
  Clock,
  Lock,
  ArrowUpRight,
  UserCog,
  FolderKanban,
  Plus,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { dashboardAPI, activityAPI, authAPI, unitsAPI } from "../lib/api";
import { useAnalytics } from "../context/AnalyticsContext";
import NewProjectDialog from "../components/flow/NewProjectDialog";
import { hasFullAccess, hasUnitAccess as sharedHasUnitAccess, canCreateProjects, canEnterUnits } from "../context/UserContext";

const UNITS = [
  {
    name: "Talent & Delivery",
    slug: "talent",
    icon: Users,
    path: "/talent",
    active: true,
    description: "AI-powered recruiting, sourcing, screening, placement, and workforce planning",
    toolCount: 2,
    accent: "#B855E8",
    lead: "Amalina",
  },
  {
    name: "Crowther HR",
    slug: "thco-hr",
    icon: UserCog,
    path: "/thco-hr",
    active: true,
    description: "Internal HR, employee records, people operations, performance & incentives",
    toolCount: 1,
    accent: "#8B5CF6",
    lead: "Victoria",
  },
  {
    name: "IT & Crowther Tools",
    slug: "it-tools",
    icon: Wrench,
    path: "/it-tools",
    active: true,
    description: "IT infrastructure, outbound tooling, email warming, AI agent management",
    toolCount: 1,
    accent: "#F97316",
    lead: "Emmanuel",
  },
  {
    name: "Sales & Business Development",
    slug: "sales",
    icon: TrendingUp,
    path: "/sales",
    active: true,
    description: "4 intake paths: Outbound, Inbound, Referrals, Reactivation across 5 pillars",
    toolCount: 1,
    accent: "#38D190",
    lead: "Rebecca",
  },
  {
    name: "Marketing & Brand",
    slug: "marketing",
    icon: Megaphone,
    path: "/marketing",
    active: true,
    description: "Content engine: 20 articles/mo, 130+ LinkedIn posts, 4 newsletters, case studies",
    toolCount: 1,
    accent: "#FF3D8D",
    lead: "Havilah",
  },
  {
    name: "Advisory & Consulting",
    slug: "advisory",
    icon: Briefcase,
    path: "/advisory",
    active: true,
    description: "Client advisory, scoping, HR consulting, workforce assessments, pricing",
    toolCount: 1,
    accent: "#3B82F6",
    lead: "Christiana",
  },
  {
    name: "Technology & Build",
    slug: "technology",
    icon: Code,
    path: "/technology",
    active: true,
    description: "3 engineering pods, AI tools, software delivery, product development",
    toolCount: 1,
    accent: "#06B6D4",
    lead: "James",
  },
  {
    name: "Operations & Finance",
    slug: "operations",
    icon: Building2,
    path: "/operations",
    active: true,
    description: "Invoicing, contracts, financial tracking, office admin, logistics",
    toolCount: 1,
    accent: "#EF4444",
    lead: "Victoria",
  },
  {
    name: "Academy & Learning",
    slug: "academy",
    icon: GraduationCap,
    path: "/academy",
    active: true,
    description: "Day Learning platform, AI Engineer tracks, brand architects training",
    toolCount: 1,
    accent: "#F59E0B",
    lead: "Babatunde",
  },
  {
    name: "Client Delivery",
    slug: "client-delivery",
    icon: Truck,
    path: "/client-delivery",
    active: true,
    description: "Managed services, SLA tracking, deployed staff at client sites",
    toolCount: 1,
    accent: "#EC4899",
    lead: "Isaiah",
  },
];

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total_tools: 0, pending_requests: 0, recent_activity: 0 });
  const [activities, setActivities] = useState([]);
  const [accessModal, setAccessModal] = useState({ open: false, unitName: "" });
  const [dynamicUnits, setDynamicUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const { trackAction } = useAnalytics();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, statsData, activityData] = await Promise.all([
          authAPI.getMe(),
          dashboardAPI.getStats(),
          activityAPI.getLogs({ limit: 10 }),
        ]);
        setUser(userData);
        setStats(statsData);
        setActivities(activityData);
        try {
          const du = await unitsAPI.list();
          setDynamicUnits(du || []);
        } catch (e) {
          // non-fatal
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Deliberately the shared rule rather than a copy of it. This was its own
  // version and had drifted: it returned true for Flow unconditionally, so the
  // pipeline card showed on the dashboard to people the sidebar and the server
  // both kept out of it.
  const hasUnitAccess = (slug) => {
    if (hasFullAccess(user)) return true;
    if (!canEnterUnits(user)) return false;
    return sharedHasUnitAccess(user, slug);
  };

  const handleUnitClick = (unit, e) => {
    trackAction("click", "unit_card", { unit_slug: unit.slug, unit_name: unit.name, has_access: hasUnitAccess(unit.slug) });
    if (!hasUnitAccess(unit.slug)) {
      e.preventDefault();
      setAccessModal({ open: true, unitName: unit.name });
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const getRoleLabel = (u) => {
    if (u?.role === "super_admin") return "Super Admin";
    if (u?.role === "mini_admin") return "Admin";
    if (u?.is_hr) return "HR";
    return "Team Member";
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const ICON_MAP = {
    "layers": Building2, "building-2": Building2, "users": Users, "briefcase": Briefcase,
    "wrench": Wrench, "trending-up": TrendingUp, "megaphone": Megaphone, "graduation-cap": GraduationCap,
    "code": Code, "truck": Truck, "clipboard-list": Users, "headphones": Wrench,
    "folder-kanban": FolderKanban, "lightbulb": Wrench,
  };
  // The units collection now carries a record for the built-in units too, so
  // anything already in UNITS is dropped here to stop each one rendering twice.
  const builtInSlugs = new Set(UNITS.map((u) => u.slug));
  const dynamicNavUnits = dynamicUnits
    .filter((u) => !builtInSlugs.has(u.slug) && hasUnitAccess(u.slug))
    .map((u) => ({
      name: u.name,
      slug: u.slug,
      icon: ICON_MAP[u.icon] || Building2,
      path: `/unit/${u.slug}`,
      active: true,
      description: u.description || "",
      toolCount: u.member_count || 0,
      accent: u.accent || "#1FB58A",
      lead: u.lead || "—",
    }));
  const accessibleUnits = [
    ...UNITS.filter((u) => hasUnitAccess(u.slug)),
    ...dynamicNavUnits,
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-28 bg-[#EFEDE8] rounded-2xl"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-[#EFEDE8] rounded-2xl"></div>
          <div className="h-24 bg-[#EFEDE8] rounded-2xl"></div>
          <div className="h-24 bg-[#EFEDE8] rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-[#EFEDE8] rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Deliberately the same permission that already guards the button inside
  // Crowther OS -- this surfaces the action, it does not widen or narrow who
  // may take it.
  // Opening a project is a unit head's job, not every Flow user's.
  const canCreateProject = canCreateProjects(user);

  return (
    <div className="max-w-[1400px] mx-auto space-y-10" data-testid="dashboard-page">
      {/* Welcome Section */}
      <div className="pt-2">
        <p className="lux-eyebrow mb-3">{getCurrentDate()}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl lg:text-[42px] text-gray-900 leading-[1.1]">
              Welcome back, <em className="lux-gold-text not-italic">{user?.name?.split(" ")[0]}</em>
            </h1>
            <p className="text-sm text-gray-500 mt-3">
              Signed in as {getRoleLabel(user)} · {accessibleUnits.length} unit{accessibleUnits.length !== 1 ? "s" : ""} in your portfolio
            </p>
          </div>

          {/* Starting a project was only reachable from inside Crowther OS, so
              anyone who did not already know where to look could not find it.
              It belongs on the page everyone lands on after signing in -- and
              it opens here rather than navigating into Flow, because losing
              the dashboard to fill in a short form and then finding the way
              back is an interruption the work does not require. */}
          {canCreateProject && (
            <Button
              onClick={() => setNewProjectOpen(true)}
              data-testid="dashboard-new-project"
              className="h-11 px-6 rounded-full bg-[#0C0F13] text-white hover:bg-[#1a1f26] shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
        <div className="lux-divider mt-8" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Tools Available", value: stats.total_tools, icon: Wrench },
          { label: "Pending Requests", value: stats.pending_requests, icon: Clock },
          { label: "Recent Activity", value: stats.recent_activity, icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="lux-card p-6 flex items-center gap-5">
            <div className="w-11 h-11 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <Icon className="w-[18px] h-[18px] text-[#A9834E]" strokeWidth={1.6} />
            </div>
            <div>
              <p className="font-display text-[32px] leading-none text-gray-900">{value}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 mt-2">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Units Section — hidden entirely for staff who are not on a project
          yet. An empty "Your Business Units" heading only advertises what
          they cannot open; their unit head adding them is what opens it. */}
      {accessibleUnits.length > 0 && (
      <div>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-[22px] text-gray-900">Your Business Units</h2>
          <span className="lux-eyebrow">The Control Room</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {accessibleUnits.map((unit) => {
            const Icon = unit.icon;
            return (
              <Link
                key={unit.slug}
                to={unit.path}
                onClick={(e) => handleUnitClick(unit, e)}
                className="group lux-card lux-card-hover overflow-hidden"
                data-testid={`unit-card-${unit.slug}`}
              >
                <div className="p-6 h-full flex flex-col min-h-[196px]">
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${unit.accent}14`, border: `1px solid ${unit.accent}33` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: unit.accent }} strokeWidth={1.7} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#A9834E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>

                  <h3 className="font-display text-[19px] text-gray-900 mb-2 leading-snug">{unit.name}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed mb-4 flex-grow">{unit.description}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-[#F0EEE9]">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-gray-400">
                      {unit.toolCount} tool{unit.toolCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Lead · <span className="text-gray-600 font-medium">{unit.lead}</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      )}

      {/* Recent Activity */}
      {activities.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-[22px] text-gray-900">Recent Activity</h2>
          </div>
          <div className="lux-card divide-y divide-[#F0EEE9]">
            {activities.slice(0, 6).map((a, i) => (
              <div key={a.log_id || i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-8 h-8 rounded-full bg-[#F7F6F3] border border-[#EAE7E0] flex items-center justify-center shrink-0">
                  <Activity className="w-3.5 h-3.5 text-[#A9834E]" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">
                    <span className="font-medium">{a.user_name}</span> — {a.action}
                  </p>
                  {a.details && <p className="text-[12px] text-gray-400 truncate">{a.details}</p>}
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{formatTimeAgo(a.timestamp || a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Restricted Modal */}
      <Dialog open={accessModal.open} onOpenChange={(open) => setAccessModal({ ...accessModal, open })}>
        <DialogContent className="bg-white border-[#EAE7E0] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-3 font-display text-xl">
              <div className="w-10 h-10 rounded-full border border-[#C6A15B]/40 flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#A9834E]" />
              </div>
              Access Restricted
            </DialogTitle>
            <DialogDescription className="text-gray-500 pt-4 leading-relaxed">
              You don't have access to <span className="text-gray-900 font-medium">{accessModal.unitName}</span>.
              Ask your administrator or HR to extend your permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setAccessModal({ open: false, unitName: "" })}
              className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-full px-6"
              data-testid="access-modal-dismiss-btn"
            >
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Opening a project happens here rather than in Flow. Once saved the
          dashboard reloads its own figures, so the new work shows up on the
          page you are already looking at. */}
      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={() => {
          trackAction("create", "project_from_dashboard");
          dashboardAPI.getStats().then(setStats).catch(() => {});
        }}
      />
    </div>
  );
};

export default Dashboard;
