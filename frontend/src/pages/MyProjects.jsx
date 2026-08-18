import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, Hammer, FileSearch, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

/**
 * Brand seafoam (#1FB58A) and forest (#1B4332) rather than Tailwind's stock
 * blue and emerald, so this list reads as the same product as the Engineering
 * Board it sits beside.
 *
 * Amber stays on "Under Review": it is the one status that is asking someone to
 * do something, and the brand palette has no colour that carries a warning.
 */
const STATUS_GROUPS = [
  { key: "pending_review", label: "Pending Review", statuses: ["delegated", "under_review"], icon: FileSearch, color: "text-amber-600" },
  { key: "approved", label: "Approved - Ready to Start", statuses: ["approved_for_build"], icon: CheckCircle, color: "text-[#1FB58A]" },
  { key: "in_build", label: "In Build", statuses: ["in_build"], icon: Hammer, color: "text-[#158567]" },
  { key: "completed", label: "Completed", statuses: ["completed"], icon: CheckCircle, color: "text-[#1B4332]" },
];

// Delegated → completed reads as a deepening of the one brand green, so the
// further a project has come the darker its chip.
const STATUS_STYLES = {
  delegated: { label: "Delegated", bg: "bg-[#1FB58A]/10 text-[#158567] border border-[#1FB58A]/25" },
  under_review: { label: "Under Review", bg: "bg-amber-50 text-amber-700 border border-amber-200" },
  approved_for_build: { label: "Approved", bg: "bg-[#1FB58A]/20 text-[#127056] border border-[#1FB58A]/35" },
  in_build: { label: "In Build", bg: "bg-[#1B4332]/10 text-[#1B4332] border border-[#1B4332]/25" },
  completed: { label: "Completed", bg: "bg-[#1B4332] text-white border border-[#1B4332]" },
};

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch { toast.error("Failed to load projects"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6" data-testid="my-projects-page">
      <div className="flex items-center gap-3">
        <Link to="/technology"><ArrowLeft className="w-5 h-5 text-gray-400 hover:text-gray-700" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Hammer className="w-10 h-10 mx-auto mb-3" />
          <p>No projects assigned to you yet</p>
        </div>
      ) : (
        STATUS_GROUPS.map(group => {
          const groupProjects = projects.filter(p => group.statuses.includes(p.status));
          if (groupProjects.length === 0) return null;
          const Icon = group.icon;
          return (
            <div key={group.key} data-testid={`group-${group.key}`}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Icon className={`w-4 h-4 ${group.color}`} />
                {group.label} ({groupProjects.length})
              </h2>
              <div className="space-y-2">
                {groupProjects.map(p => {
                  const ss = STATUS_STYLES[p.status] || {};
                  const linkTo = ["delegated", "under_review"].includes(p.status)
                    ? `/technology/my-projects/${p.id}/review`
                    : `/technology/my-projects/${p.id}/tracker`;
                  return (
                    <Link key={p.id} to={linkTo} className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition" data-testid={`project-card-${p.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          <p className="text-sm text-gray-500">{p.client_name_snapshot}</p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ss.bg || "bg-gray-100"}`}>{ss.label || p.status}</span>
                        {p.percent_complete > 0 && p.status !== "completed" && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-[#EAE7E0] rounded-full overflow-hidden">
                              <div className="h-full bg-[#1FB58A] rounded-full transition-[width] duration-700 ease-out" style={{ width: `${p.percent_complete}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{p.percent_complete}%</span>
                          </div>
                        )}
                        {p.days_since_update != null && p.status === "in_build" && (
                          <span className={`text-xs ${p.days_since_update > 1 ? "text-red-500" : "text-gray-400"}`}>
                            <Clock className="w-3 h-3 inline mr-1" />{p.days_since_update}d
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
