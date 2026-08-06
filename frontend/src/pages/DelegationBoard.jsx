import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Briefcase, AlertTriangle, Check, ChevronRight, X, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import api from "../lib/api";

const WORKLOAD_STYLES = {
  available: { emoji: "\u{1F7E2}", label: "Available", color: "text-green-600 bg-green-50 border-green-200" },
  at_capacity: { emoji: "\u{1F7E1}", label: "At Capacity", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  busy: { emoji: "\u{1F534}", label: "Busy", color: "text-red-600 bg-red-50 border-red-200" },
};

const STATUS_LABELS = {
  awaiting_delegation: "Awaiting Delegation",
  delegated: "Delegated",
  under_review: "Under Review",
  revision_requested: "Revision Requested",
  approved_for_build: "Approved",
  in_build: "In Build",
  completed: "Completed",
};

export default function DelegationBoard() {
  const [queue, setQueue] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delegateModal, setDelegateModal] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, engRes] = await Promise.all([
        api.get("/projects"),
        api.get("/projects/engineers/workload"),
      ]);
      setQueue((projRes.data || []).filter(p => p.status === "awaiting_delegation"));
      setEngineers(engRes.data || []);
    } catch (e) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6" data-testid="delegation-board-page">
      <div className="flex items-center gap-3">
        <Link to="/thco-hr"><ArrowLeft className="w-5 h-5 text-gray-400 hover:text-gray-700" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Project Delegation</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Queue */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Delegation Queue ({queue.length})</h2>
            {queue.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
                <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p>All projects delegated</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" data-testid={`queue-card-${p.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{p.name}</h3>
                        <p className="text-sm text-gray-500">{p.client_name_snapshot}</p>
                      </div>
                      <span className="text-xs text-gray-400">{Math.floor((Date.now() - new Date(p.created_at)) / 3600000)}h in queue</span>
                    </div>
                    {p.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-2 mb-4">
                      <a href={p.brief_document_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                        <FileText className="w-3 h-3" /> Brief
                      </a>
                      <a href={p.roadmap_document_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 flex items-center gap-1 hover:underline">
                        <FileText className="w-3 h-3" /> Roadmap
                      </a>
                    </div>
                    <Button onClick={() => setDelegateModal(p)} className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid={`delegate-btn-${p.id}`}>
                      Delegate to Engineer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Engineer Board */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Engineer Workload ({engineers.length})</h2>
            <div className="space-y-3">
              {engineers.map(eng => {
                const ws = WORKLOAD_STYLES[eng.workload_status] || WORKLOAD_STYLES.available;
                return (
                  <div key={eng.user_id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm" data-testid={`engineer-card-${eng.user_id}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-bold text-sm">
                        {eng.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{eng.name}</p>
                        <p className="text-xs text-gray-500">{eng.email}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ws.color}`}>
                        {ws.emoji} {ws.label} ({eng.active_project_count})
                      </span>
                    </div>
                    {eng.active_projects?.length > 0 && (
                      <div className="ml-13 space-y-1 mt-2">
                        {eng.active_projects.map(ap => (
                          <div key={ap.id} className="flex items-center gap-2 text-xs text-gray-500">
                            <Briefcase className="w-3 h-3" />
                            <span>{ap.name}</span>
                            <span className="ml-auto px-1.5 py-0.5 rounded bg-gray-100 text-[10px]">{STATUS_LABELS[ap.status] || ap.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {engineers.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
                  <User className="w-8 h-8 mx-auto mb-2" />
                  <p>No engineers flagged yet</p>
                  <p className="text-xs mt-1">Go to Staff Management to flag engineers</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {delegateModal && (
        <DelegateModal project={delegateModal} engineers={engineers} onClose={() => { setDelegateModal(null); fetchData(); }} />
      )}
    </div>
  );
}

function DelegateModal({ project, engineers, onClose }) {
  const [selectedEng, setSelectedEng] = useState(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDelegate = async () => {
    if (!selectedEng) { toast.error("Select an engineer"); return; }
    if (selectedEng.workload_status === "busy" && !confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/projects/${project.id}/delegate`, {
        engineer_id: selectedEng.user_id,
        note: note.trim() || undefined,
      });
      toast.success(`Project delegated to ${selectedEng.name}`);
      onClose();
    } catch (e) { toast.error(e.response?.data?.detail || "Delegation failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delegate-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Delegate: {project.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Select Engineer</p>
          {engineers.map(eng => {
            const ws = WORKLOAD_STYLES[eng.workload_status] || WORKLOAD_STYLES.available;
            const isSelected = selectedEng?.user_id === eng.user_id;
            return (
              <button key={eng.user_id} onClick={() => { setSelectedEng(eng); setConfirming(false); }}
                className={`w-full text-left p-3 rounded-lg border transition ${isSelected ? "border-[#1B4332] bg-[#1B4332]/5" : "border-gray-100 hover:border-gray-200"}`}
                data-testid={`select-eng-${eng.user_id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-bold text-xs">{eng.name?.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{eng.name}</p>
                    <p className="text-xs text-gray-500">{eng.active_project_count} active projects</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ws.color}`}>{ws.emoji} {ws.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {confirming && selectedEng?.workload_status === "busy" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="busy-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">This engineer is busy with {selectedEng.active_project_count} active projects.</p>
                <p className="text-xs text-red-600 mt-1">Click "Confirm Delegation" again to proceed anyway.</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add context for the engineer..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1B4332]/20 resize-none" data-testid="delegation-note" />
        </div>

        <Button onClick={handleDelegate} disabled={!selectedEng || submitting}
          className={`w-full text-white ${confirming ? "bg-red-600 hover:bg-red-700" : "bg-[#1B4332] hover:bg-[#1B4332]/90"}`} data-testid="confirm-delegate-btn">
          {submitting ? "Delegating..." : confirming ? "Confirm Delegation (Override)" : "Delegate Project"}
        </Button>
      </div>
    </div>
  );
}
