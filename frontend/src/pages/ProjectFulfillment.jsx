import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Clock, User, Building, RefreshCw, ChevronRight, AlertTriangle, FileText, Download, X, Upload, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import api from "../lib/api";

const STATUS_STYLES = {
  awaiting_delegation: { label: "Awaiting Delegation", bg: "bg-gray-100 text-gray-700" },
  delegated: { label: "Delegated", bg: "bg-blue-100 text-blue-700" },
  under_review: { label: "Under Review", bg: "bg-yellow-100 text-yellow-700" },
  revision_requested: { label: "Revision Requested", bg: "bg-orange-100 text-orange-700" },
  approved_for_build: { label: "Approved for Build", bg: "bg-green-100 text-green-700" },
  in_build: { label: "In Build", bg: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", bg: "bg-emerald-100 text-emerald-800" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { label: status, bg: "bg-gray-100 text-gray-600" };
  return <span data-testid={`status-badge-${status}`} className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.bg}`}>{s.label}</span>;
}

function ProjectDetailDrawer({ project, onClose, onReupload }) {
  if (!project) return null;
  const review = project.active_review;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="project-detail-drawer">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{project.name}</h2>
          <button onClick={onClose} data-testid="close-drawer-btn"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500">Client</p><p className="font-medium">{project.client_name_snapshot}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={project.status} /></div>
            <div><p className="text-xs text-gray-500">Created</p><p className="text-sm">{new Date(project.created_at).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-gray-500">Engineer</p><p className="text-sm">{project.assigned_engineer_name || "Not assigned"}</p></div>
          </div>
          {project.description && <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700">{project.description}</p></div>}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Documents</p>
            <a href={project.brief_document_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition" data-testid="brief-download">
              <FileText className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium">{project.brief_document_name}</span><Download className="w-3 h-3 ml-auto text-gray-400" />
            </a>
            <a href={project.roadmap_document_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition" data-testid="roadmap-download">
              <FileText className="w-4 h-4 text-emerald-600" /><span className="text-sm font-medium">{project.roadmap_document_name}</span><Download className="w-3 h-3 ml-auto text-gray-400" />
            </a>
            {project.client_documents?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Documents from Client</p>
                {project.client_documents.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition mb-1.5" data-testid={`client-doc-download-${i}`}>
                    <FileText className="w-4 h-4 text-orange-500" /><span className="text-sm font-medium">{doc.name}</span><Download className="w-3 h-3 ml-auto text-gray-400" />
                  </a>
                ))}
              </div>
            )}
          </div>
          {review && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium mb-2">Engineer Review</p>
              <div className="text-sm space-y-1">
                <p>PRD Approved: {review.prd_approved ? "Yes" : "No"}</p>
                <p>Roadmap Approved: {review.roadmap_approved ? "Yes" : "No"}</p>
                {review.notes && <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded text-orange-800 text-sm"><strong>Notes:</strong> {review.notes}</div>}
              </div>
            </div>
          )}
          {project.status === "revision_requested" && (
            <Button onClick={() => onReupload(project)} className="w-full bg-orange-500 hover:bg-orange-600 text-white" data-testid="reupload-btn">
              <Upload className="w-4 h-4 mr-2" /> Re-upload Documents
            </Button>
          )}
          {project.last_tracker_update && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium mb-2">Last Standup ({project.last_tracker_update.update_date})</p>
              <div className="text-sm space-y-1">
                <p><strong>Yesterday:</strong> {project.last_tracker_update.yesterday}</p>
                <p><strong>Today:</strong> {project.last_tracker_update.today}</p>
                {project.last_tracker_update.blockers && <p><strong>Blockers:</strong> {project.last_tracker_update.blockers}</p>}
                <p><strong>Progress:</strong> {project.last_tracker_update.percent_complete}%</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ProjectFulfillment() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showReupload, setShowReupload] = useState(null);
  const navigate = useNavigate();

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch (e) { toast.error("Failed to load projects"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openDetail = async (p) => {
    try {
      const { data } = await api.get(`/projects/${p.id}`);
      setSelectedProject(data);
    } catch { setSelectedProject(p); }
  };

  const handleReupload = async (project) => {
    setShowReupload(project);
    setSelectedProject(null);
  };

  return (
    <div className="space-y-6" data-testid="project-fulfillment-page">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/talent"><ArrowLeft className="w-5 h-5 text-gray-400 hover:text-gray-700 cursor-pointer" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Project Fulfillment</h1>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-gray-500">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        <Link to="/talent/projects/new">
          <Button className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="new-project-btn">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No projects yet</p>
          <Link to="/talent/projects/new">
            <Button className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="empty-new-project-btn">
              <Plus className="w-4 h-4 mr-2" /> Create First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full" data-testid="projects-table">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Engineer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Update</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => openDetail(p)} data-testid={`project-row-${p.id}`}>
                  <td className="px-6 py-4"><p className="font-medium text-gray-900 text-sm">{p.name}</p></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.client_name_snapshot}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.assigned_engineer_name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.days_since_update != null ? `${p.days_since_update}d ago` : "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1B4332] rounded-full" style={{ width: `${p.percent_complete || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{p.percent_complete || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedProject && <ProjectDetailDrawer project={selectedProject} onClose={() => setSelectedProject(null)} onReupload={handleReupload} />}

      {showReupload && <ReuploadModal project={showReupload} onClose={() => { setShowReupload(null); fetchProjects(); }} />}
    </div>
  );
}

function ReuploadModal({ project, onClose }) {
  const [brief, setBrief] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!brief && !roadmap) { toast.error("Select at least one file"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      if (brief) fd.append("brief", brief);
      if (roadmap) fd.append("roadmap", roadmap);
      await api.post(`/projects/${project.id}/reupload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Documents re-uploaded successfully");
      onClose();
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="reupload-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <h3 className="text-lg font-bold">Re-upload Documents</h3>
        <p className="text-sm text-gray-500">Upload revised Brief and/or Roadmap for <strong>{project.name}</strong></p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brief (PDF/DOCX)</label>
          <input type="file" accept=".pdf,.docx" onChange={e => setBrief(e.target.files[0])} data-testid="reupload-brief-input" className="w-full text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Roadmap (PDF/DOCX)</label>
          <input type="file" accept=".pdf,.docx" onChange={e => setRoadmap(e.target.files[0])} data-testid="reupload-roadmap-input" className="w-full text-sm" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="reupload-cancel-btn">Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading} className="flex-1 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="reupload-submit-btn">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
