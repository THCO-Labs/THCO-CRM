import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckSquare, FileText, Download, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import api from "../lib/api";

function SLACountdown({ targetIso, label }) {
  const [remaining, setRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime() + 120 * 60 * 1000;
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining("EXPIRED"); setIsUrgent(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
      setIsUrgent(diff < 30 * 60 * 1000);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;
  return (
    <div className={`px-4 py-3 rounded-lg flex items-center gap-3 ${isUrgent ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200"}`} data-testid="sla-countdown">
      <Clock className={`w-5 h-5 ${isUrgent ? "text-red-500" : "text-yellow-600"}`} />
      <div>
        <p className={`text-sm font-semibold ${isUrgent ? "text-red-700" : "text-yellow-700"}`}>{label}</p>
        <p className={`text-lg font-mono font-bold ${isUrgent ? "text-red-600" : "text-yellow-600"}`}>{remaining}</p>
      </div>
    </div>
  );
}

export default function ProjectReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [review, setReview] = useState(null);
  const [prdApproved, setPrdApproved] = useState(false);
  const [roadmapApproved, setRoadmapApproved] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      setReview(data.active_review || null);

      // Mark as opened (idempotent)
      if (data.active_review && !data.active_review.first_opened_at) {
        await api.post(`/projects/${id}/review/open`);
        const { data: refreshed } = await api.get(`/projects/${id}`);
        setProject(refreshed);
        setReview(refreshed.active_review || null);
      }
    } catch (e) { toast.error("Failed to load project"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const handleSubmit = async () => {
    if (!prdApproved || !roadmapApproved) {
      if (!notes.trim()) { toast.error("Notes are required when not approving both documents"); return; }
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/projects/${id}/review/decision`, {
        prd_approved: prdApproved,
        roadmap_approved: roadmapApproved,
        notes: notes.trim() || undefined,
      });
      toast.success(data.status === "approved_for_build" ? "Project approved!" : "Revision requested - fulfillment has been notified");
      navigate("/technology/my-projects");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to submit"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!project) return <div className="text-center py-12 text-red-500">Project not found</div>;

  const alreadyDecided = review?.decision_at;
  const slaRef = review?.first_opened_at || review?.delegation_email_sent_at;
  const slaLabel = review?.first_opened_at
    ? "Window 2: Submit your decision"
    : "Window 1: Open and review documents";

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="project-review-page">
      <div className="flex items-center gap-3">
        <Link to="/technology/my-projects"><ArrowLeft className="w-5 h-5 text-gray-400 hover:text-gray-700" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500">{project.client_name_snapshot} &middot; Delegated by {project.delegated_by_name} on {new Date(project.delegated_at).toLocaleDateString()}</p>
        </div>
      </div>

      {project.delegation_note && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>HR Note:</strong> {project.delegation_note}
        </div>
      )}

      {!alreadyDecided && <SLACountdown targetIso={slaRef} label={slaLabel} />}
      {alreadyDecided && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          Decision already submitted on {new Date(review.decision_at).toLocaleString()}
        </div>
      )}

      {/* Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Full Brief / PRD</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">{project.brief_document_name}</p>
          <a href={project.brief_document_url} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full" data-testid="view-brief-btn">
              <Download className="w-4 h-4 mr-2" /> Download Brief
            </Button>
          </a>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Roadmap Design</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">{project.roadmap_document_name}</p>
          <a href={project.roadmap_document_url} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full" data-testid="view-roadmap-btn">
              <Download className="w-4 h-4 mr-2" /> Download Roadmap
            </Button>
          </a>
        </div>
      </div>

      {/* Client Documents */}
      {project.client_documents?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Documents from Client ({project.client_documents.length})</h3>
          </div>
          <div className="space-y-2">
            {project.client_documents.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition" data-testid={`client-doc-${i}`}>
                <FileText className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium flex-1">{doc.name}</span>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Decision form */}
      {!alreadyDecided && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-5">
          <h3 className="font-semibold text-gray-900">Your Decision</h3>
          <label className="flex items-center gap-3 cursor-pointer" data-testid="approve-prd-checkbox">
            <input type="checkbox" checked={prdApproved} onChange={e => setPrdApproved(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#1B4332] focus:ring-[#1B4332]" />
            <span className="text-sm font-medium">I approve the PRD / Full Brief</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer" data-testid="approve-roadmap-checkbox">
            <input type="checkbox" checked={roadmapApproved} onChange={e => setRoadmapApproved(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#1B4332] focus:ring-[#1B4332]" />
            <span className="text-sm font-medium">I approve the Roadmap Design</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes {(!prdApproved || !roadmapApproved) && <span className="text-red-500">(required if not approving)</span>}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add review feedback..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1B4332]/20 resize-none" data-testid="review-notes" />
          </div>
          <Button onClick={handleSubmit} disabled={submitting}
            className={`w-full text-white py-5 ${prdApproved && roadmapApproved ? "bg-[#1B4332] hover:bg-[#1B4332]/90" : "bg-orange-500 hover:bg-orange-600"}`}
            data-testid="submit-decision-btn">
            {submitting ? "Submitting..." : prdApproved && roadmapApproved ? "Approve Project" : "Request Revision"}
          </Button>
        </div>
      )}
    </div>
  );
}
