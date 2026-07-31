import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FlowShell from "./FlowShell";
import { flowAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Loader2, Plus, Search, Building2, User } from "lucide-react";

export default function FlowProjects() {
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get("q") || "");
  const stage = params.get("stage");

  const load = async () => {
    setLoading(true);
    const filters = {};
    if (q) filters.q = q;
    if (stage) filters.stage = parseInt(stage);
    const data = await flowAPI.listProjects(filters);
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [stage]);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (q) next.set("q", q); else next.delete("q");
    setParams(next);
    load();
  };

  return (
    <FlowShell
      title={stage ? `Stage ${stage} projects` : "All Projects"}
      action={
        <Link to="/flow/projects/new">
          <Button className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="projects-new-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
        </Link>
      }
    >
      <form onSubmit={submitSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, client, project ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none"
            data-testid="projects-search"
          />
        </div>
        <Button type="submit" variant="outline" data-testid="projects-search-btn">Search</Button>
        {stage && (
          <Link to="/flow/projects"><Button type="button" variant="ghost" data-testid="clear-stage-btn">Clear stage filter</Button></Link>
        )}
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500 mb-3">No projects yet.</p>
          <Link to="/flow/projects/new"><Button className="bg-[#1B4332] text-white">Create first project</Button></Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-testid="projects-list">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" data-testid={`row-${p.id}`}>
                  <td className="px-4 py-3"><Link to={`/flow/projects/${p.id}`} className="text-gray-900 font-medium hover:text-[#1B4332]">{p.name}</Link></td>
                  <td className="px-4 py-3 text-gray-600">{p.client_name_snapshot}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] font-medium">
                      {p.stage}: {p.stage_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.delivery_owner_name || <span className="text-gray-400 italic">unassigned</span>}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{p.project_id_display}</td>
                  <td className="px-4 py-3 text-gray-400">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FlowShell>
  );
}
