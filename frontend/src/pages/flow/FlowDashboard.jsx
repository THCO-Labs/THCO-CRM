import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FlowShell from "./FlowShell";
import { flowAPI } from "../../lib/api";
import { Briefcase, ClipboardCheck, FileText, Hammer, Calendar, AlertCircle, Target, Ticket, Loader2, Mail, X } from "lucide-react";
import { STAGES, BUILD_STATUS_LABELS } from "./stages";

const StatCard = ({ icon: Icon, label, value, color, link, testId }) => {
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition ${link ? "cursor-pointer" : ""}`} data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
};

export default function FlowDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // The orientation banner is a one-time nudge; once dismissed it stays gone
  // for this browser until we deliberately reintroduce it.
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem("flow-dashboard-guide-dismissed") !== "1");
  const dismissGuide = () => {
    localStorage.setItem("flow-dashboard-guide-dismissed", "1");
    setShowGuide(false);
  };

  useEffect(() => {
    flowAPI.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <FlowShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div></FlowShell>;
  }
  if (!data) {
    return <FlowShell><p className="text-gray-500">Could not load dashboard.</p></FlowShell>;
  }

  const pipeline = data.pipeline_counts || {};
  const stages = data.stages_meta || STAGES;
  const buildStatuses = data.build_status_counts || {};

  return (
    <FlowShell title="Dashboard">
      {/* Quick orientation banner */}
      {showGuide && (
        <div className="bg-gradient-to-r from-[#1B4332]/5 to-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3" data-testid="dashboard-guide">
          <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-gray-900">Adding contacts + birthdays?</p>
            <p className="text-gray-600 mt-1">
              Open any project's <strong>Client profile</strong> section to add the client's people — name, birthday, work anniversary, spouse, etc.
              Saved birthdays automatically appear on the <Link to="/flow/calendar" className="text-[#1B4332] underline">Calendar</Link>.
              Or browse the full directory at <Link to="/flow/contacts" className="text-[#1B4332] underline">/flow/contacts</Link>.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissGuide}
            aria-label="Dismiss message"
            data-testid="dashboard-guide-close"
            className="shrink-0 p-1 -mt-0.5 -mr-1 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard testId="stat-active" icon={Briefcase} label="My active projects" value={data.my_active_projects} color="bg-[#1B4332]" link="/flow/projects" />
        <StatCard testId="stat-approval" icon={ClipboardCheck} label="Awaiting executive approval" value={data.approval_queue} color="bg-amber-500" link="/flow/projects?stage=7" />
        <StatCard testId="stat-proposals" icon={FileText} label="Pending proposals" value={data.pending_proposals} color="bg-indigo-600" link="/flow/projects?stage=6" />
        <StatCard testId="stat-build" icon={Hammer} label="In Build" value={data.in_build_count} color="bg-emerald-600" link="/flow/projects?stage=9" />
        <StatCard testId="stat-events" icon={Calendar} label="Events next 7 days" value={data.upcoming_events_7d} color="bg-pink-500" link="/flow/calendar" />
        <StatCard testId="stat-invoices" icon={AlertCircle} label="Overdue invoices" value={data.overdue_invoices} color="bg-red-500" />
        <StatCard testId="stat-tickets" icon={Ticket} label="My tickets" value={data.my_tickets} color="bg-cyan-600" link="/flow/tickets" />
        <StatCard testId="stat-prospects" icon={Target} label="Prospects total" value={Object.values(data.prospect_counts || {}).reduce((a, b) => a + b, 0)} color="bg-emerald-600" link="/flow/prospects" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline by stage</h3>
          <div className="space-y-2">
            {Object.entries(stages).map(([k, v]) => {
              const count = pipeline[k] || 0;
              const max = Math.max(...Object.values(pipeline), 1);
              return (
                <Link key={k} to={`/flow/projects?stage=${k}`} className="flex items-center gap-3 group" data-testid={`pipeline-row-${k}`}>
                  <span className="text-xs text-gray-400 w-6">{k}</span>
                  <span className="text-sm text-gray-700 w-44 truncate group-hover:text-[#1B4332]">{v.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1B4332] rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-6 text-right">{count}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming events</h3>
            <Link to="/flow/calendar" className="text-xs text-[#1B4332] hover:underline">View all</Link>
          </div>
          {(data.events || []).length === 0 ? (
            <p className="text-sm text-gray-400">No events in the next 7 days.</p>
          ) : (
            <ul className="space-y-2">
              {data.events.map((e) => (
                <li key={e.event_id} className="flex items-center justify-between text-sm" data-testid={`event-${e.event_id}`}>
                  <div>
                    <p className="text-gray-900 font-medium">{e.contact_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{e.event_type}</p>
                  </div>
                  <span className="text-xs text-[#1B4332] font-semibold">{e.days_until === 0 ? "Today" : `${e.days_until}d`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <EmailHealthCard />
    </FlowShell>
  );
}

// ---------------------------------------------------------------------------
// EMAIL HEALTH widget — shows Resend send activity for THCO Flow
// ---------------------------------------------------------------------------
const EmailHealthCard = () => {
  const [data, setData] = useState(null);
  useEffect(() => { flowAPI.emailHealth().then(setData).catch(() => {}); }, []);
  if (!data) return null;

  const failedColor = data.failed_today > 0 ? "text-red-600" : "text-gray-400";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mt-6" data-testid="email-health">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-4 h-4" />Email health (Resend)
        </h3>
        <span className="text-[10px] text-gray-400 font-mono">last 7 days</span>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center" data-testid="email-sent-today">
          <p className="text-2xl font-bold text-emerald-600">{data.sent_today}</p>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Sent today</p>
        </div>
        <div className="text-center" data-testid="email-failed-today">
          <p className={`text-2xl font-bold ${failedColor}`}>{data.failed_today}</p>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Failed today</p>
        </div>
        <div className="text-center" data-testid="email-total-week">
          <p className="text-2xl font-bold text-gray-900">{data.total_week}</p>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Last 7d</p>
        </div>
      </div>

      {data.top_templates?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Top templates (7d)</p>
          <ul className="space-y-1">
            {data.top_templates.map((t, i) => {
              const max = Math.max(...data.top_templates.map(x => x.count), 1);
              return (
                <li key={i} className="flex items-center gap-2 text-xs" data-testid={`template-${t.template}`}>
                  <span className="text-gray-600 w-40 truncate font-mono">{t.template}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1B4332] rounded-full" style={{ width: `${(t.count / max) * 100}%` }} />
                  </div>
                  <span className="text-gray-900 font-medium w-8 text-right">{t.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.recent_failures?.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs uppercase tracking-wider text-red-600 font-semibold mb-2">Recent failures</p>
          <ul className="space-y-1">
            {data.recent_failures.slice(0, 3).map((f, i) => (
              <li key={i} className="text-[11px] text-gray-600" data-testid={`failure-${i}`}>
                <span className="text-red-600 font-semibold">{f.status}:</span> {f.template_name || "—"}
                {f.error && <span className="text-gray-400 italic"> · {f.error.slice(0, 80)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
