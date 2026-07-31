import { useEffect, useState } from "react";
import FlowShell from "./FlowShell";
import { flowAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { key: "queued", label: "Queued", color: "bg-gray-100 text-gray-600" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { key: "in_review", label: "In Review", color: "bg-amber-100 text-amber-700" },
  { key: "shipped", label: "Shipped", color: "bg-green-100 text-green-700" },
];

export default function FlowTickets() {
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [t, p] = await Promise.all([flowAPI.listTickets(), flowAPI.listProjects()]);
    setTickets(t); setProjects(p);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const move = async (id, status) => {
    try { await flowAPI.updateTicketStatus(id, status); toast.success("Moved"); load(); }
    catch { toast.error("Failed"); }
  };

  const grouped = tickets.reduce((acc, t) => {
    (acc[t.status] = acc[t.status] || []).push(t);
    return acc;
  }, {});

  return (
    <FlowShell
      title="Engineering tickets"
      action={
        <Button onClick={() => setShowForm(true)} className="bg-[#1B4332] text-white" data-testid="tickets-new-btn">
          <Plus className="w-4 h-4 mr-1.5" />New Ticket
        </Button>
      }
    >
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div> : (
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-min" data-testid="tickets-board">
            {STATUSES.map((s) => (
              <div key={s.key} className="min-w-[280px] w-[280px] bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{s.label}</h3>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border">{(grouped[s.key] || []).length}</span>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {(grouped[s.key] || []).map((t) => (
                    <div key={t.ticket_id} className="bg-white rounded-lg p-3 border border-gray-100" data-testid={`ticket-${t.ticket_id}`}>
                      <p className="font-medium text-sm text-gray-900">{t.title}</p>
                      {t.acceptance_criteria && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.acceptance_criteria}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 rounded">{t.estimated_effort}</span>
                        {t.assigned_engineer_name && <span className="text-[10px] text-gray-500">{t.assigned_engineer_name}</span>}
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {STATUSES.filter(x => x.key !== t.status).map(x => (
                          <button key={x.key} onClick={() => move(t.ticket_id, x.key)} className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">→ {x.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showForm && <TicketForm projects={projects} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </FlowShell>
  );
}

const TicketForm = ({ projects, onClose, onSaved }) => {
  const [f, setF] = useState({ project_id: "", title: "", acceptance_criteria: "", estimated_effort: "M" });
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!f.project_id || !f.title.trim()) { toast.error("Project + title required"); return; }
    setSaving(true);
    try { await flowAPI.createTicket(f); toast.success("Ticket created"); onSaved(); }
    catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">New Ticket</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project *</label>
          <select value={f.project_id} onChange={(e) => setF({...f, project_id: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="tk-project">
            <option value="">— select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.client_name_snapshot})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
          <input value={f.title} onChange={(e) => setF({...f, title: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="tk-title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Acceptance Criteria</label>
          <textarea rows={3} value={f.acceptance_criteria} onChange={(e) => setF({...f, acceptance_criteria: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Effort</label>
          <select value={f.estimated_effort} onChange={(e) => setF({...f, estimated_effort: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="S">S (small)</option><option value="M">M (medium)</option><option value="L">L (large)</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-[#1B4332] text-white" data-testid="tk-save">Create</Button>
        </div>
      </form>
    </div>
  );
};
