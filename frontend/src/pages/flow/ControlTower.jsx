// The Portfolio Control Tower (Tier 3).
//
// Everything the delivery system knows, read across every project at once,
// for somebody whose job is oversight rather than any single project.
//
// Three views, and the order is the argument:
//
//   Exceptions   what needs somebody, worst first. Opens here on purpose.
//   Portfolio    every project as one row, with the signals that matter.
//   Search       across requirements, decisions, risks, feedback, documents.
//
// It opens on Exceptions because a control tower that opens on a list of
// everything is a list of everything. The portfolio is one click away and is
// where you go to browse; exceptions is where you go to act.
//
// Nothing here decides what a person may see. The server scopes every read to
// the caller's own projects, so an engineer opening this gets a control tower
// of their work and a Senior Partner gets the portfolio, from the same code.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, Ban, CircleDot, Clock, FileWarning, Flag,
  Gauge, Loader2, Search as SearchIcon, ShieldAlert, TrendingUp, UserX, X,
} from "lucide-react";

import FlowShell from "./FlowShell";
import { controlTowerAPI } from "../../lib/api";
import { PHASES } from "./stages";
import { Button } from "../../components/ui/button";

const VIEWS = [
  { key: "exceptions", label: "Needs attention", icon: AlertTriangle },
  { key: "portfolio", label: "Portfolio", icon: Gauge },
  { key: "search", label: "Search", icon: SearchIcon },
];

// How each kind of exception is drawn. The icon and colour say what sort of
// problem it is before the text is read, which is the whole point of a list
// somebody scans rather than reads.
const EXCEPTION_STYLE = {
  health_red:            { icon: ShieldAlert,  tone: "red",   label: "Red health" },
  blocker_critical:      { icon: Ban,          tone: "red",   label: "Critical blocker" },
  gate_forced:           { icon: FileWarning,  tone: "amber", label: "Forced gate" },
  scope_change_material: { icon: TrendingUp,   tone: "amber", label: "Scope change" },
  architect_waiting:     { icon: UserX,        tone: "amber", label: "Waiting on you" },
  milestone_overdue:     { icon: Clock,        tone: "amber", label: "Overdue milestone" },
  blocker_open:          { icon: Ban,          tone: "slate", label: "Blocker" },
  stalled:               { icon: Clock,        tone: "slate", label: "Stalled" },
  risk_open_high:        { icon: Flag,         tone: "slate", label: "High risk" },
};

const TONE = {
  red:   { chip: "bg-red-50 text-red-700 border-red-200", icon: "text-red-600", bar: "bg-red-500" },
  amber: { chip: "bg-[#C6A15B]/10 text-[#7A6234] border-[#C6A15B]/30", icon: "text-[#A9834E]", bar: "bg-[#C6A15B]" },
  slate: { chip: "bg-gray-50 text-gray-600 border-gray-200", icon: "text-gray-400", bar: "bg-gray-300" },
};

const HEALTH_DOT = { RED: "bg-red-500", AMBER: "bg-[#C6A15B]", GREEN: "bg-[#1FB58A]" };

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

// "3 days ago" reads faster than a date when the question is "how long has
// this been sitting there", which is the only question this column answers.
const ago = (iso) => {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(days)) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
};

const Stat = ({ label, value, tone = "slate", onClick, active }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`text-left px-4 py-3 rounded-xl border transition-colors ${
      active ? "border-[#1B4332] bg-[#1B4332]/[0.04]" : "border-[#EAE7E0] bg-white"
    } ${onClick ? "hover:border-[#1B4332]/40 cursor-pointer" : "cursor-default"}`}
    data-testid={`ct-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
  >
    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{label}</p>
    <p className={`text-2xl font-semibold mt-0.5 ${
      value > 0 && tone === "red" ? "text-red-600"
      : value > 0 && tone === "amber" ? "text-[#A9834E]"
      : "text-gray-900"
    }`}>
      {value}
    </p>
  </button>
);

const Empty = ({ children }) => (
  <div className="rounded-xl border border-dashed border-[#EAE7E0] bg-white px-6 py-12 text-center">
    <p className="text-sm text-gray-500">{children}</p>
  </div>
);

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-5 h-5 animate-spin text-[#1B4332]" />
  </div>
);

/**
 * The control tower itself, with no page around it.
 *
 * Split out from the route so the dashboard can open it in place. A headline
 * number on the dashboard and the rows behind it are the same question, and
 * navigating to another screen to see the rows loses the context the number
 * was read in -- the same reasoning that already makes the numbers *inside*
 * this component filter the list under them rather than open a new page.
 *
 *   initialView    which of the three views to open on
 *   initialFilter  a portfolio filter to apply immediately (red, amber,
 *                  blocked, stalled, overdue_milestones)
 *   onClose        when given, an X appears; the host decides what closing means
 *   fullViewLink   when true, offers a way through to the standalone page
 */
export function ControlTowerPanel({
  initialView = "exceptions",
  initialFilter = null,
  onClose,
  fullViewLink = false,
}) {
  const [view, setView] = useState(initialView);
  const [portfolio, setPortfolio] = useState(null);
  const [exceptions, setExceptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [includeClosed, setIncludeClosed] = useState(false);
  // Clicking a headline number filters the list under it rather than opening
  // another screen: the number and the rows behind it are the same question.
  const [filter, setFilter] = useState(initialFilter);

  // Opening the panel again from a different number has to re-aim it. The
  // host keeps this component mounted between opens, so without this the
  // second click would show whatever the first one left behind.
  useEffect(() => { setView(initialView); }, [initialView]);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, e] = await Promise.all([
        controlTowerAPI.portfolio(includeClosed),
        controlTowerAPI.exceptions(),
      ]);
      setPortfolio(p);
      setExceptions(e);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load the control tower");
    } finally {
      setLoading(false);
    }
  }, [includeClosed]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5" data-testid="control-tower">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Control Tower</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {portfolio?.can_see_all
              ? "Every project, and what needs somebody."
              : "Your projects, and what needs you."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-[#EAE7E0] bg-white p-1">
            {VIEWS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                data-testid={`ct-view-${key}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === key ? "bg-[#1B4332] text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {key === "exceptions" && exceptions?.total > 0 && (
                  <span className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px]
                    font-semibold flex items-center justify-center ${
                      view === key ? "bg-white text-[#1B4332]" : "bg-red-500 text-white"
                    }`}>
                    {exceptions.total}
                  </span>
                )}
              </button>
            ))}
          </div>
          {fullViewLink && (
            <Link
              to="/flow/control-tower"
              className="text-[11px] uppercase tracking-[0.18em] text-[#A9834E] hover:text-[#8F7340] transition-colors px-2"
              data-testid="ct-full-view"
            >
              Full view
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close the control tower"
              data-testid="ct-close"
              className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {view === "exceptions" && (
            <ExceptionsView data={exceptions} onRefresh={() => load(true)} />
          )}
          {view === "portfolio" && (
            <PortfolioView
              data={portfolio}
              filter={filter}
              setFilter={setFilter}
              includeClosed={includeClosed}
              setIncludeClosed={setIncludeClosed}
            />
          )}
          {view === "search" && <SearchView />}
        </>
      )}
    </div>
  );
}

// The standalone page. Nothing but the Crowther OS chrome around the panel --
// the route and the dashboard render exactly the same component.
export default function ControlTower() {
  return (
    <FlowShell>
      <ControlTowerPanel />
    </FlowShell>
  );
}

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------
function ExceptionsView({ data, onRefresh }) {
  const [kind, setKind] = useState(null);
  const rows = data?.exceptions || [];
  const shown = kind ? rows.filter((r) => r.kind === kind) : rows;

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-[#EAE7E0] bg-white px-6 py-14 text-center"
           data-testid="ct-exceptions-clear">
        <div className="w-10 h-10 rounded-full bg-[#1FB58A]/10 flex items-center justify-center mx-auto mb-3">
          <CircleDot className="w-5 h-5 text-[#1FB58A]" />
        </div>
        <p className="text-sm font-medium text-gray-900">Nothing needs attention.</p>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
          No red health, no forced gates, no overdue milestones, nothing blocked and
          nothing sitting still. This is what a clear board looks like.
        </p>
      </div>
    );
  }

  const counts = data?.counts || {};

  return (
    <div className="space-y-4" data-testid="ct-exceptions">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{data.total}</span>
          {data.total === 1 ? " thing needs " : " things need "}
          attention across{" "}
          <span className="font-semibold text-gray-900">{data.projects_affected}</span>
          {data.projects_affected === 1 ? " project." : " projects."}
        </p>
        <Button size="sm" variant="outline" onClick={onRefresh} className="h-7 text-[11px]">
          Refresh
        </Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setKind(null)}
          className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
            !kind ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-gray-600 border-[#EAE7E0] hover:bg-gray-50"
          }`}
        >
          All {data.total}
        </button>
        {Object.entries(counts).map(([k, n]) => {
          const style = EXCEPTION_STYLE[k] || { label: k, tone: "slate" };
          return (
            <button
              key={k}
              onClick={() => setKind(kind === k ? null : k)}
              data-testid={`ct-filter-${k}`}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                kind === k
                  ? "bg-[#1B4332] text-white border-[#1B4332]"
                  : `${TONE[style.tone].chip} hover:opacity-80`
              }`}
            >
              {style.label} {n}
            </button>
          );
        })}
      </div>

      <ul className="space-y-2">
        {shown.map((row, i) => {
          const style = EXCEPTION_STYLE[row.kind] || { icon: AlertTriangle, tone: "slate", label: row.kind };
          const Icon = style.icon;
          const tone = TONE[style.tone];
          return (
            <li key={`${row.kind}-${row.project_id}-${i}`}
                className="rounded-xl border border-[#EAE7E0] bg-white overflow-hidden flex"
                data-testid="ct-exception-row">
              <span className={`w-1 shrink-0 ${tone.bar}`} />
              <div className="flex-1 min-w-0 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone.icon}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{row.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tone.chip}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{row.detail}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 flex-wrap">
                      <Link to={row.link} className="text-[#1B4332] hover:underline font-medium">
                        {row.project_name}
                      </Link>
                      {row.project_ref && <span className="font-mono text-gray-400">{row.project_ref}</span>}
                      <span>·</span>
                      <span>Stage {row.stage} · {row.stage_label}</span>
                      {row.tsd_name && <><span>·</span><span>TSD {row.tsd_name}</span></>}
                      {row.at && <><span>·</span><span>{ago(row.at)}</span></>}
                    </div>
                  </div>
                  <Link to={row.link} className="shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]">
                      Open <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------
// Which headline number maps to which row test. Kept as data so the number and
// the filtered list can never mean two different things.
const PORTFOLIO_FILTERS = {
  red: (p) => p.health === "RED",
  amber: (p) => p.health === "AMBER",
  stalled: (p) => p.stalled,
  blocked: (p) => p.open_blockers > 0,
  overdue_milestones: (p) => p.overdue_milestones > 0,
  pending_scope_changes: (p) => p.pending_scope_changes > 0,
};

function PortfolioView({ data, filter, setFilter, includeClosed, setIncludeClosed }) {
  const [phase, setPhase] = useState(null);
  const s = data?.summary || {};

  const rows = useMemo(() => {
    let out = data?.projects || [];
    if (filter && PORTFOLIO_FILTERS[filter]) out = out.filter(PORTFOLIO_FILTERS[filter]);
    if (phase) out = out.filter((p) => p.phase === phase);
    return out;
  }, [data, filter, phase]);

  const toggle = (key) => setFilter(filter === key ? null : key);

  return (
    <div className="space-y-4" data-testid="ct-portfolio">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Stat label="Projects" value={s.total || 0} />
        <Stat label="Red" value={s.red || 0} tone="red"
              onClick={() => toggle("red")} active={filter === "red"} />
        <Stat label="Amber" value={s.amber || 0} tone="amber"
              onClick={() => toggle("amber")} active={filter === "amber"} />
        <Stat label="Blocked" value={s.blocked || 0} tone="red"
              onClick={() => toggle("blocked")} active={filter === "blocked"} />
        <Stat label="Stalled" value={s.stalled || 0} tone="amber"
              onClick={() => toggle("stalled")} active={filter === "stalled"} />
        <Stat label="Overdue" value={s.overdue_milestones || 0} tone="amber"
              onClick={() => toggle("overdue_milestones")} active={filter === "overdue_milestones"} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setPhase(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
              !phase ? "bg-[#1B4332] text-white border-[#1B4332]"
                     : "bg-white text-gray-600 border-[#EAE7E0] hover:bg-gray-50"
            }`}
          >
            All phases
          </button>
          {(data?.by_phase || []).filter((p) => p.count > 0).map((p) => (
            <button
              key={p.key}
              onClick={() => setPhase(phase === p.key ? null : p.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors flex items-center gap-1.5 ${
                phase === p.key ? "bg-[#1B4332] text-white border-[#1B4332]"
                                : "bg-white text-gray-600 border-[#EAE7E0] hover:bg-gray-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: PHASES[p.key]?.accent || "#999" }} />
              {p.label} {p.count}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => setIncludeClosed(e.target.checked)}
            data-testid="ct-include-closed"
          />
          Include closed projects
        </label>
      </div>

      {(filter || phase) && (
        <button
          onClick={() => { setFilter(null); setPhase(null); }}
          className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear filters — showing {rows.length} of {data?.projects?.length || 0}
        </button>
      )}

      {rows.length === 0 ? (
        <Empty>No projects match that.</Empty>
      ) : (
        <div className="rounded-xl border border-[#EAE7E0] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EAE7E0] bg-[#F7F6F3]">
                  {["Project", "Stage", "Owner", "Idle", "Signals"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-mono
                                           uppercase tracking-wider text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-[#F7F6F3]/60"
                      data-testid="ct-portfolio-row">
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${HEALTH_DOT[p.health] || "bg-gray-300"}`}
                              title={p.health_reason || p.health} />
                        <div className="min-w-0">
                          <Link to={`/flow/projects/${p.id}`}
                                className="font-medium text-gray-900 hover:text-[#1B4332] hover:underline">
                            {p.name}
                          </Link>
                          <p className="text-[11px] text-gray-500 truncate">{p.client_name}</p>
                          {p.health === "RED" && p.health_reason && (
                            <p className="text-[11px] text-red-600 mt-0.5">{p.health_reason}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: PHASES[p.phase]?.accent || "#999" }} />
                        <span className="text-xs text-gray-700">{p.stage}. {p.stage_label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {p.tsd_name || <span className="text-amber-700">No TSD</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs ${p.stalled ? "text-[#A9834E] font-medium" : "text-gray-500"}`}>
                        {p.days_since_movement == null ? "—" : `${p.days_since_movement}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.open_blockers > 0 && (
                          <Badge tone="red" icon={Ban}>{p.open_blockers} blocked</Badge>
                        )}
                        {p.forced_gates > 0 && (
                          <Badge tone="amber" icon={FileWarning}>{p.forced_gates} forced</Badge>
                        )}
                        {p.pending_scope_changes > 0 && (
                          <Badge tone="amber" icon={TrendingUp}>{p.pending_scope_changes} scope</Badge>
                        )}
                        {p.overdue_milestones > 0 && (
                          <Badge tone="amber" icon={Clock}>{p.overdue_milestones} overdue</Badge>
                        )}
                        {p.awaiting_architect && (
                          <Badge tone="amber" icon={UserX}>No architect</Badge>
                        )}
                        {p.open_risks > 0 && (
                          <Badge tone="slate" icon={Flag}>{p.open_risks} risk{p.open_risks === 1 ? "" : "s"}</Badge>
                        )}
                        {p.closure?.total > 0 && (
                          <Badge tone="slate">Closure {p.closure.done}/{p.closure.total}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const Badge = ({ tone = "slate", icon: Icon, children }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border
                    whitespace-nowrap ${TONE[tone].chip}`}>
    {Icon && <Icon className="w-2.5 h-2.5" />}
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
function SearchView() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState(null);

  // Debounced, because this searches seven collections and firing on every
  // keystroke would put the server under load to answer a question the person
  // has not finished asking.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setData(null); return; }
    let live = true;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await controlTowerAPI.search(term);
        if (live) { setData(res); setType(null); }
      } catch (e) {
        if (live) toast.error(e.response?.data?.detail || "Search failed");
      } finally {
        if (live) setBusy(false);
      }
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [q]);

  const results = type ? (data?.results || []).filter((r) => r.type === type) : (data?.results || []);

  return (
    <div className="space-y-4" data-testid="ct-search">
      <div className="relative">
        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search requirements, decisions, risks, scope changes, blockers, feedback, documents…"
          data-testid="ct-search-input"
          className="w-full h-11 pl-9 pr-10 rounded-xl border border-[#EAE7E0] bg-white text-sm
                     text-gray-900 focus:outline-none focus:border-[#1B4332]"
        />
        {busy && <Loader2 className="w-4 h-4 animate-spin text-[#1B4332] absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>

      {!data && q.trim().length < 2 && (
        <Empty>
          Type at least two characters. This looks inside projects, not just at their
          names — a requirement, a decision, something the client said, or the text of
          an uploaded brief.
        </Empty>
      )}

      {data && data.results.length === 0 && (
        <Empty>Nothing matches “{data.query}”.</Empty>
      )}

      {data && data.results.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setType(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                !type ? "bg-[#1B4332] text-white border-[#1B4332]"
                      : "bg-white text-gray-600 border-[#EAE7E0] hover:bg-gray-50"
              }`}
            >
              Everything {data.total}
            </button>
            {Object.entries(data.by_type || {}).map(([t, n]) => (
              <button
                key={t}
                onClick={() => setType(type === t ? null : t)}
                className={`px-2.5 py-1 rounded-full text-[11px] border capitalize transition-colors ${
                  type === t ? "bg-[#1B4332] text-white border-[#1B4332]"
                             : "bg-white text-gray-600 border-[#EAE7E0] hover:bg-gray-50"
                }`}
              >
                {t.replace("_", " ")} {n}
              </button>
            ))}
          </div>

          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={`${r.type}-${r.entity_id}-${i}`}
                  className="rounded-xl border border-[#EAE7E0] bg-white px-4 py-3"
                  data-testid="ct-search-result">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1B4332]/[0.07]
                                       text-[#1B4332] border border-[#1B4332]/15">
                        {r.label}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    </div>
                    {r.snippet && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.snippet}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500 flex-wrap">
                      <Link to={r.link} className="text-[#1B4332] hover:underline font-medium">
                        {r.project_name}
                      </Link>
                      {r.stage_label && <><span>·</span><span>{r.stage_label}</span></>}
                      {r.detail && <><span>·</span><span className="truncate">{r.detail}</span></>}
                    </div>
                  </div>
                  <Link to={r.link} className="shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]">
                      Open <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {data.truncated && (
            <p className="text-[11px] text-gray-400 text-center">
              Showing the first {data.results.length}. Narrow the search to see the rest.
            </p>
          )}
        </>
      )}
    </div>
  );
}
