import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, FolderKanban, LayoutDashboard, User, Users, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";
import { tasksAPI } from "../../lib/api";

/**
 * Projects Workspace — the landing view of the Task page.
 *
 * Lists all existing (Flow) projects in a responsive grid, each annotated
 * with board/task counts. Selecting a project opens its Trello workspace.
 * Reuses the application's existing projects data source (no duplicates).
 */
/** "12m ago", "3h ago", "5d ago" — or nothing when there is no timestamp. */
function lastMoved(p) {
  const iso = p.updated_at || p.completed_at || p.created_at;
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProjectsWorkspace({ onSelect }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    try {
      setProjects((await tasksAPI.listProjectSummary()) || []);
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // One frame after the first paint, so the width transition has a start.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // This is the page people leave open. Loading once meant the counts sat at
  // whatever they were when the tab was opened -- a board could gain a dozen
  // tasks and this grid would still say none. Refreshed while it is on screen,
  // paused when it is not.
  useEffect(() => {
    let timer = null;
    const start = () => { stop(); timer = setInterval(() => { if (!document.hidden) load(); }, 30000); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => { if (document.hidden) { stop(); } else { load(); start(); } };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20" data-testid="projects-empty">
        <div className="w-16 h-16 mb-5 rounded-2xl bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center">
          <FolderKanban className="w-7 h-7 text-[#C6A15B]" />
        </div>
        <h3 className="font-display text-xl text-gray-900 mb-2">No projects yet</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Projects from your pipeline will appear here. Create one in THCO Flow to start organizing its tasks.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">
        Select a project to open its task board workspace.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            data-testid={`project-card-${p.id}`}
            className="text-left bg-white rounded-xl border border-[#EAE7E0] p-5 shadow-sm transition-all duration-200 ease-out hover:shadow-lg hover:border-[#C6A15B]/50 hover:-translate-y-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
          >
            {/* Status pill */}
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                p.status === "lost"
                  ? "bg-red-50 text-red-600"
                  : p.stage === 10
                  ? "bg-[#1B4332]/10 text-[#1B4332]"
                  : "bg-[#C6A15B]/15 text-[#8F7340]"
              }`}>
                {p.status === "lost" ? null : p.stage === 10 ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {p.stage_label}
              </span>
              {/* Sample data from before unit heads existed — marked so nobody
                  mistakes it for live client work. */}
              {p.is_demo && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                  title="Sample data, not a live project"
                  data-testid={`demo-badge-${p.id}`}
                >
                  Demo
                </span>
              )}
              {p.client_name && !p.is_demo && (
                <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{p.client_name}</span>
              )}
            </div>

            {/* Name */}
            <div className="flex items-start gap-1 mb-1 group/name">
              <h3 className="font-display text-lg text-gray-900 group-hover/name:text-[#8F7340] transition-colors flex-1 min-w-0">
                <span className="truncate block">{p.name}</span>
              </h3>
              <Link
                to={`/flow/projects/${p.id}?edit=1`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 p-0.5 rounded opacity-0 group-hover/name:opacity-100 hover:bg-gray-100 transition-all"
                title="Edit project details"
                data-testid={`edit-btn-${p.id}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </Link>
            </div>
            {p.project_id_display && (
              <p className="text-[10px] font-mono text-gray-400 mb-3">{p.project_id_display}</p>
            )}

            {/* Who runs the unit this project belongs to. */}
            {(p.unit_head_name || p.coordinator_name) && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <User className="w-3 h-3" />
                <span className="truncate">
                  {p.unit_head_name || p.coordinator_name}
                  {p.unit_head_name && <span className="text-gray-400"> · project manager</span>}
                </span>
              </div>
            )}

            {/* The team. Everybody on the project sees who else is on it --
                knowing who you are working alongside is part of being on it. */}
            <div className="mb-4" data-testid={`team-${p.id}`}>
              {(p.collaborators || []).length === 0 ? (
                <p className="text-[11px] text-gray-400">No one added yet</p>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  <Users className="w-3 h-3 text-gray-400 shrink-0" />
                  {p.collaborators.slice(0, 3).map((c) => (
                    <span
                      key={c.user_id}
                      className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#F7F6F3] border border-[#EAE7E0] text-gray-600"
                      title={c.name}
                    >
                      {(c.name || "").split(" ")[0]}
                    </span>
                  ))}
                  {p.collaborators.length > 3 && (
                    <span
                      className="text-[11px] text-gray-400"
                      title={p.collaborators.map((c) => c.name).join(", ")}
                    >
                      +{p.collaborators.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Counts */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <LayoutDashboard className="w-3.5 h-3.5 text-[#C6A15B]" />
                <span className="font-semibold text-gray-900">{p.board_count}</span> boards
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <FolderKanban className="w-3.5 h-3.5 text-[#1B4332]" />
                <span className="font-semibold text-gray-900">{p.task_count}</span> tasks
              </div>
            </div>

            {/* Progress */}
            {typeof p.progress === "number" && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Progress</span>
                  <span className="text-[11px] font-semibold text-gray-700">{p.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  {/* Grows to its value on load rather than being drawn at it,
                      so the figure registers as a measurement of something
                      moving. */}
                  <div
                    className="h-full rounded-full bg-[#C6A15B] transition-[width] duration-700 ease-out"
                    style={{ width: mounted ? `${p.progress}%` : "0%" }}
                  />
                </div>
              </div>
            )}

            {/* When this project last changed. Without it the grid reads as a
                filing cabinet; with it, as work in progress. */}
            {lastMoved(p) && (
              <p className="mt-3 text-[10px] text-gray-400">Updated {lastMoved(p)}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
