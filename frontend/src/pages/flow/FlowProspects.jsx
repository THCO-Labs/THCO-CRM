import { useEffect, useState } from "react";
import FlowShell from "./FlowShell";
import { flowAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Loader2, Plus, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const PROSPECT_STATUSES = [
  { key: "researched", label: "Researched", color: "bg-gray-100 text-gray-600" },
  { key: "outbound_sent", label: "Outbound Sent", color: "bg-blue-100 text-blue-700" },
  { key: "responded", label: "Responded", color: "bg-cyan-100 text-cyan-700" },
  { key: "qualified", label: "Qualified", color: "bg-amber-100 text-amber-700" },
  { key: "handed_off", label: "Handed Off → Project", color: "bg-green-100 text-green-700" },
  { key: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

export default function FlowProspects() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await flowAPI.listProspects();
    setProspects(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      const r = await flowAPI.updateProspectStatus(id, status);
      toast.success(r.message || "Updated");
      load();
    } catch (e) { toast.error("Failed"); }
  };

  const grouped = prospects.reduce((acc, p) => {
    const s = p.status || "researched";
    acc[s] = acc[s] || [];
    acc[s].push(p);
    return acc;
  }, {});

  return (
    <FlowShell
      title="Prospect pipeline"
      action={
        <Button onClick={() => setShowForm(true)} className="bg-[#1B4332] text-white" data-testid="prospects-new-btn">
          <Plus className="w-4 h-4 mr-1.5" />Add Prospect
        </Button>
      }
    >
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div> : (
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-min" data-testid="prospects-board">
            {PROSPECT_STATUSES.map((s) => (
              <div key={s.key} className="min-w-[260px] w-[260px] bg-gray-50 rounded-xl p-3" data-testid={`prospect-col-${s.key}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{s.label}</h3>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200">{(grouped[s.key] || []).length}</span>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {(grouped[s.key] || []).map((p) => (
                    <div key={p.prospect_id} className="bg-white rounded-lg p-3 border border-gray-100" data-testid={`prospect-${p.prospect_id}`}>
                      <p className="font-medium text-sm text-gray-900">{p.company_name}</p>
                      {p.contact_name && <p className="text-xs text-gray-500">{p.contact_name}</p>}
                      {p.industry && <p className="text-[10px] text-gray-400 mt-1">{p.industry}</p>}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {PROSPECT_STATUSES.filter(x => x.key !== p.status).slice(0, 3).map(x => (
                          <button key={x.key} onClick={() => updateStatus(p.prospect_id, x.key)} className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">
                            → {x.label.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(grouped[s.key] || []).length === 0 && <p className="text-xs text-gray-300 italic text-center py-4">Empty</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showForm && <ProspectForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </FlowShell>
  );
}

const ProspectForm = ({ onClose, onSaved }) => {
  const [f, setF] = useState({ company_name: "", contact_name: "", contact_email: "", contact_linkedin: "", industry: "", size: "", research_notes: "", outbound_sequence: "" });
  const set = (k, v) => setF({ ...f, [k]: v });
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!f.company_name.trim()) { toast.error("Company required"); return; }
    setSaving(true);
    try { await flowAPI.createProspect(f); toast.success("Added"); onSaved(); }
    catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">New Prospect</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[["company_name","Company *","pr-company"],["contact_name","Contact Name"],["contact_email","Contact Email"],["contact_linkedin","LinkedIn URL"],["industry","Industry"],["size","Company Size"]].map(([k,l,t]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
              <input value={f[k]} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid={t} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Research Notes</label>
          <textarea rows={3} value={f.research_notes} onChange={(e) => set("research_notes", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-[#1B4332] text-white" data-testid="pr-save">Save</Button>
        </div>
      </form>
    </div>
  );
};
