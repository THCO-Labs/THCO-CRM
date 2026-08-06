import { useEffect, useState } from "react";
import { Loader2, FolderKanban, LayoutDashboard, User, CheckCircle2, Clock } from "lucide-react";
import { tasksAPI } from "../../lib/api";

/**
 * Projects Workspace — the landing view of the Task page.
 *
 * Lists all existing (Flow) projects in a responsive grid, each annotated
 * with board/task counts. Selecting a project opens its Trello workspace.
 * Reuses the application's existing projects data source (no duplicates).
 */
export default function ProjectsWorkspace({ onSelect }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await tasksAPI.listProjectSummary();
        if (active) setProjects(data || []);
      } catch {
        /* non-fatal */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

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
            className="text-left bg-white rounded-xl border border-[#EAE7E0] p-5 shadow-sm hover:shadow-md hover:border-[#C6A15B]/50 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
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
            <h3 className="font-display text-lg text-gray-900 mb-1 group-hover:text-[#8F7340] transition-colors truncate">
              {p.name}
            </h3>
            {p.project_id_display && (
              <p className="text-[10px] font-mono text-gray-400 mb-3">{p.project_id_display}</p>
            )}

            {/* Coordinator */}
            {p.coordinator_name && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                <User className="w-3 h-3" />
                <span className="truncate">{p.coordinator_name}</span>
              </div>
            )}

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
                  <div
                    className="h-full rounded-full bg-[#C6A15B]"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
