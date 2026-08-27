import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FolderKanban,
  ListChecks,
  PauseCircle,
  Plus,
  Target,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { activityAPI, authAPI, controlTowerAPI, tasksAPI } from "../lib/api";
import { useAnalytics } from "../context/AnalyticsContext";
import NewProjectDialog from "../components/flow/NewProjectDialog";
import FunctionView, { FunctionSwitcher, useFunctionViews } from "../components/flow/FunctionView";
import { canCreateProjects } from "../context/UserContext";

// The control tower opens *here*, in place, rather than sending anyone to
// another screen -- a headline number and the rows behind it are the same
// question, and navigating away loses the context the number was read in.
// Loaded on demand: it is a large component and most visits never open it,
// so the landing page should not pay for it on first paint.
const ControlTowerPanel = lazy(() =>
  import("./flow/ControlTower").then((m) => ({ default: m.ControlTowerPanel }))
);

/**
 * The dashboard.
 *
 * This was a grid of links to business units — navigation dressed up as
 * content. It answered "where can I go", which the sidebar already answers,
 * and never answered the only question the person signing in actually has:
 * what needs me today. The units are gone; what replaces them is the state of
 * the work.
 *
 * Two audiences, one page, decided by what the caller can see rather than by
 * their job title:
 *
 *   - Somebody with projects in scope (the Senior Partner sees them all) gets
 *     the portfolio — how many are running, what is off track, what has
 *     stopped moving, and the exceptions worst-first with a way into each.
 *   - Everybody else gets their own work — what is assigned to them, what is
 *     late, what lands this week.
 *
 * Nothing here is computed in the browser. `/control-tower/portfolio` already
 * decides what "at risk" and "stalled" mean for the Control Tower, and this
 * page reads the same numbers so the two screens can never disagree.
 */

// A project's health as the pipeline records it.
const HEALTH = {
  RED: { label: "Red", color: "#A94E5B" },
  AMBER: { label: "Amber", color: "#C6A15B" },
  GREEN: { label: "Green", color: "#2D6A4F" },
};

// Exceptions arrive carrying the server's own severity score. Three bands is
// as much as a glance can use: act now, look today, know about it.
const severityColor = (severity) =>
  severity >= 90 ? "#A94E5B" : severity >= 60 ? "#C6A15B" : "#6B7280";

const PRIORITY_COLOR = {
  urgent: "#DC2626",
  high: "#A94E5B",
  medium: "#C6A15B",
  low: "#4C6B5B",
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [exceptions, setExceptions] = useState(null);
  const [myWork, setMyWork] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  // { view, filter } while the control tower is open in place, else null.
  const [tower, setTower] = useState(null);
  const towerRef = useRef(null);
  // Which delivery function this dashboard is answering. Your own, unless you
  // are an administrator who has deliberately switched.
  const { meta: functionMeta, active: functionKey, setActive: setFunctionKey } =
    useFunctionViews();
  const { trackAction } = useAnalytics();

  const load = async () => {
    // Each panel fails on its own. A dashboard that renders nothing because
    // one of five calls returned 403 is worse than one missing a panel.
    const settle = (p) => p.then((v) => v).catch(() => null);
    const [me, pf, ex, mine, logs] = await Promise.all([
      settle(authAPI.getMe()),
      settle(controlTowerAPI.portfolio()),
      settle(controlTowerAPI.exceptions()),
      settle(tasksAPI.myCards(6)),
      settle(activityAPI.getLogs({ limit: 6 })),
    ]);
    setUser(me);
    setPortfolio(pf);
    setExceptions(ex);
    setMyWork(mine);
    setActivities(logs || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The panel opens below the metrics, which can be past the fold on a laptop.
  // Without this the click would look like it did nothing.
  useEffect(() => {
    if (tower && towerRef.current) {
      towerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tower]);

  const openTower = (view, filter = null) => {
    trackAction("open", "dashboard_control_tower", { view, filter: filter || "none" });
    setTower({ view, filter });
  };

  const getRoleLabel = (u) => {
    if (u?.role === "super_admin") return "Super Admin";
    if (u?.role === "mini_admin") return "Admin";
    if (u?.is_hr) return "HR";
    return "Team Member";
  };

  const getCurrentDate = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Local to whoever is looking at the screen, not the server: the browser's
  // own clock decides morning/afternoon/evening, so someone signing in from a
  // different timezone gets a greeting that matches their own day.
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse" data-testid="dashboard-loading">
        <div className="h-28 bg-[#EFEDE8] rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#EFEDE8] rounded-2xl" />
          ))}
        </div>
        <div className="h-40 bg-[#EFEDE8] rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-[#EFEDE8] rounded-2xl lg:col-span-2" />
          <div className="h-72 bg-[#EFEDE8] rounded-2xl" />
        </div>
      </div>
    );
  }

  const summary = portfolio?.summary;
  const hasPortfolio = Boolean(summary && summary.total > 0);
  const phases = (portfolio?.by_phase || []).filter((p) => p.count > 0);
  const exceptionRows = exceptions?.exceptions || [];
  const work = myWork || { cards: [], open: 0, overdue: 0, due_this_week: 0, done: 0 };

  // Deliberately the same permission that already guards the button inside
  // Crowther OS — this surfaces the action, it does not widen who may take it.
  const canCreateProject = canCreateProjects(user);

  const metrics = hasPortfolio
    ? [
        {
          key: "active",
          label: "Active Projects",
          value: summary.total,
          icon: FolderKanban,
          detail: `${summary.green} green · ${summary.amber} amber · ${summary.red} red`,
          view: "portfolio",
        },
        {
          key: "attention",
          label: "Needs Attention",
          value: exceptions?.total ?? 0,
          icon: AlertTriangle,
          tone: (exceptions?.total ?? 0) > 0 ? "#A94E5B" : undefined,
          detail: `across ${exceptions?.projects_affected ?? 0} project${
            (exceptions?.projects_affected ?? 0) === 1 ? "" : "s"
          }`,
          view: "exceptions",
        },
        {
          key: "stalled",
          label: "Stalled",
          value: summary.stalled,
          icon: PauseCircle,
          tone: summary.stalled > 0 ? "#C6A15B" : undefined,
          detail: "no movement in 14+ days",
          view: "portfolio",
          filter: "stalled",
        },
        {
          key: "overdue",
          label: "Overdue Milestones",
          value: summary.overdue_milestones,
          icon: CalendarClock,
          tone: summary.overdue_milestones > 0 ? "#A94E5B" : undefined,
          detail: `${summary.blocked} project${summary.blocked === 1 ? "" : "s"} blocked`,
          view: "portfolio",
          filter: "overdue_milestones",
        },
      ]
    : [
        {
          key: "open",
          label: "My Open Tasks",
          value: work.open,
          icon: ListChecks,
          detail: work.open ? "assigned to you" : "nothing assigned yet",
          to: "/tasks",
        },
        {
          key: "overdue",
          label: "Overdue",
          value: work.overdue,
          icon: AlertTriangle,
          tone: work.overdue > 0 ? "#A94E5B" : undefined,
          detail: "past their due date",
          to: "/tasks",
        },
        {
          key: "week",
          label: "Due This Week",
          value: work.due_this_week,
          icon: CalendarClock,
          detail: "in the next seven days",
          to: "/tasks",
        },
        {
          key: "done",
          label: "Completed",
          value: work.done,
          icon: CheckCircle2,
          detail: "moved to Done",
          to: "/tasks",
        },
      ];

  const subtitle = hasPortfolio
    ? `Signed in as ${getRoleLabel(user)} · ${summary.total} active project${
        summary.total === 1 ? "" : "s"
      }${
        exceptions?.total
          ? ` · ${exceptions.total} need${exceptions.total === 1 ? "s" : ""} attention`
          : ""
      }`
    : `Signed in as ${getRoleLabel(user)}${
        work.open ? ` · ${work.open} open task${work.open === 1 ? "" : "s"}` : ""
      }`;

  return (
    <div className="max-w-[1400px] mx-auto space-y-10" data-testid="dashboard-page">
      {/* Welcome */}
      <div className="pt-2">
        <p className="lux-eyebrow mb-3">{getCurrentDate()}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl lg:text-[42px] text-gray-900 leading-[1.1]">
              {getGreeting()}, <em className="lux-gold-text not-italic">{user?.name?.split(" ")[0]}</em>.
            </h1>
            <p className="text-sm text-gray-500 mt-3" data-testid="dashboard-subtitle">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <FunctionSwitcher
              meta={functionMeta}
              active={functionKey}
              onChange={(key) => {
                trackAction("switch", "dashboard_function_view", { function: key });
                setFunctionKey(key);
              }}
            />
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
        </div>
        <div className="lux-divider mt-8" />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-metrics">
        {metrics.map(({ key, label, value, icon: Icon, detail, tone, to, view, filter }) => {
          const Tag = to ? Link : "button";
          const behaviour = to
            ? { to, onClick: () => trackAction("click", "dashboard_metric", { metric: key }) }
            : { type: "button", onClick: () => openTower(view, filter) };
          return (
          <Tag
            key={key}
            {...behaviour}
            className="group lux-card lux-card-hover p-6 block w-full text-left"
            data-testid={`dashboard-metric-${key}`}
          >
            <div className="flex items-start justify-between mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${tone || "#C6A15B"}14`,
                  border: `1px solid ${tone || "#C6A15B"}33`,
                }}
              >
                <Icon className="w-[17px] h-[17px]" style={{ color: tone || "#A9834E" }} strokeWidth={1.7} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#A9834E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            {/* A count only earns colour when there is something to count:
                a zero in alarm red reads as an alarm. */}
            <p
              className={`font-display text-[38px] leading-none tabular-nums ${
                tone && value > 0 ? "" : "text-gray-900"
              }`}
              style={tone && value > 0 ? { color: tone } : undefined}
            >
              {value}
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 mt-3">{label}</p>
            <p className="text-[12px] text-gray-500 mt-1.5 truncate">{detail}</p>
          </Tag>
          );
        })}
      </div>

      {/* The control tower, in place. Same component the /flow/control-tower
          route renders — not a copy of it. */}
      {tower && (
        <div ref={towerRef} className="lux-card p-6 scroll-mt-6" data-testid="dashboard-control-tower">
          <Suspense
            fallback={
              <p className="text-sm text-gray-500 py-10 text-center">Opening the control tower…</p>
            }
          >
            <ControlTowerPanel
              initialView={tower.view}
              initialFilter={tower.filter}
              onClose={() => setTower(null)}
              fullViewLink
            />
          </Suspense>
        </div>
      )}

      {/* The caller's own function, answered. Renders nothing at all when
          this person holds no delivery function, rather than an empty frame. */}
      <FunctionView functionKey={functionKey} />

      {/* Pipeline — one lane per phase, so the shape of the portfolio reads at
          a glance rather than as a list of seventeen stage names. */}
      {hasPortfolio && phases.length > 0 && (
        <div data-testid="dashboard-pipeline">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-[22px] text-gray-900">Pipeline</h2>
            <button
              type="button"
              onClick={() => openTower("portfolio")}
              data-testid="dashboard-open-tower"
              className="text-[11px] uppercase tracking-[0.18em] text-[#A9834E] hover:text-[#8F7340] transition-colors"
            >
              Control Tower
            </button>
          </div>
          <div className="lux-card p-6">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))` }}>
              {phases.map((phase) => (
                <div key={phase.key} className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[26px] leading-none text-gray-900 tabular-nums">
                      {phase.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 leading-snug break-words">{phase.label}</p>
                  <div className="h-1 rounded-full bg-[#F0EEE9] mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C6A15B]"
                      style={{ width: `${Math.round((phase.count / summary.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-5 mt-6 pt-5 border-t border-[#F0EEE9]">
              {Object.entries(HEALTH).map(([key, { label, color }]) => (
                <span key={key} className="inline-flex items-center gap-2 text-[12px] text-gray-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {summary[key.toLowerCase()]} {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Needs attention + My work */}
      <div className={`grid grid-cols-1 gap-6 ${hasPortfolio ? "lg:grid-cols-3" : ""}`}>
        {hasPortfolio && (
          <div className="lg:col-span-2" data-testid="dashboard-attention">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-display text-[22px] text-gray-900">Needs Attention</h2>
              {exceptionRows.length > 6 && (
                <button
                  type="button"
                  onClick={() => openTower("exceptions")}
                  data-testid="dashboard-all-exceptions"
                  className="text-[11px] uppercase tracking-[0.18em] text-[#A9834E] hover:text-[#8F7340] transition-colors"
                >
                  All {exceptionRows.length}
                </button>
              )}
            </div>
            {exceptionRows.length === 0 ? (
              <div className="lux-card px-6 py-10 text-center">
                <CheckCircle2 className="w-6 h-6 text-[#2D6A4F] mx-auto mb-3" strokeWidth={1.6} />
                <p className="text-sm text-gray-500">
                  Nothing is off track. Every project is moving and no gate is waiting on you.
                </p>
              </div>
            ) : (
              <div className="lux-card divide-y divide-[#F0EEE9]">
                {exceptionRows.slice(0, 6).map((row, i) => (
                  <Link
                    key={`${row.kind}-${row.project_id}-${i}`}
                    to={row.link}
                    onClick={() => trackAction("click", "dashboard_exception", { kind: row.kind })}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-[#FBFAF7] transition-colors"
                    data-testid={`dashboard-exception-${row.kind}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: severityColor(row.severity) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-gray-900 font-medium truncate">{row.title}</p>
                      <p className="text-[12px] text-gray-500 truncate mt-0.5">{row.detail}</p>
                      <p className="text-[11px] text-gray-400 mt-1.5 truncate">
                        {row.project_name}
                        {row.client_name ? ` · ${row.client_name}` : ""}
                        {row.stage_label ? ` · ${row.stage_label}` : ""}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div data-testid="dashboard-my-work">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-[22px] text-gray-900">My Work</h2>
            <Link
              to="/tasks"
              className="text-[11px] uppercase tracking-[0.18em] text-[#A9834E] hover:text-[#8F7340] transition-colors"
            >
              Task Board
            </Link>
          </div>
          {work.cards.length === 0 ? (
            <div className="lux-card px-6 py-10 text-center">
              <Target className="w-6 h-6 text-gray-300 mx-auto mb-3" strokeWidth={1.6} />
              <p className="text-sm text-gray-500">
                No tasks are assigned to you. They appear here the moment somebody puts your name on one.
              </p>
            </div>
          ) : (
            <div className="lux-card divide-y divide-[#F0EEE9]">
              {work.cards.map((card) => (
                <Link
                  key={card.card_id}
                  to="/tasks"
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#FBFAF7] transition-colors"
                >
                  <CircleDot
                    className="w-3.5 h-3.5 shrink-0 mt-1"
                    style={{ color: PRIORITY_COLOR[card.priority] || "#C6A15B" }}
                    strokeWidth={2}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-900 truncate">{card.title}</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {[card.project_name, card.board_title].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <DueBadge due={card.due_date} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {activities.length > 0 && (
        <div>
          <h2 className="font-display text-[22px] text-gray-900 mb-5">Recent Activity</h2>
          <div className="lux-card divide-y divide-[#F0EEE9]">
            {activities.slice(0, 5).map((a, i) => (
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
                <span className="text-[11px] text-gray-400 shrink-0">
                  {formatTimeAgo(a.timestamp || a.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opening a project happens here rather than in Flow. Once saved the
          dashboard reloads its own figures, so the new work shows up on the
          page you are already looking at. */}
      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={() => {
          trackAction("create", "project_from_dashboard");
          load();
        }}
      />
    </div>
  );
};

/**
 * How late, or how soon. Rendered as words rather than a date because the
 * question a task list answers is "when", not "what is the date".
 */
function DueBadge({ due }) {
  if (!due) return null;
  const at = new Date(due);
  if (Number.isNaN(at.getTime())) return null;

  const days = Math.ceil((at - new Date()) / 86400000);
  const overdue = days < 0;
  const label =
    overdue ? (days === -1 ? "1 day late" : `${Math.abs(days)} days late`)
    : days === 0 ? "Today"
    : days === 1 ? "Tomorrow"
    : `${days} days`;

  return (
    <span
      className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap"
      style={{
        color: overdue ? "#A94E5B" : days <= 2 ? "#8F7340" : "#6E6C68",
        backgroundColor: overdue ? "#A94E5B14" : days <= 2 ? "#C6A15B14" : "transparent",
      }}
    >
      {label}
    </span>
  );
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const diffMs = new Date() - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default Dashboard;
