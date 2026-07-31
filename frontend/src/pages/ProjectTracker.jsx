import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, AlertTriangle, CheckCircle, Play, Flag } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import api from "../lib/api";

const TRACKER_STATUS_STYLES = {
  on_track: { label: "On Track", color: "bg-green-100 text-green-700" },
  at_risk: { label: "At Risk", color: "bg-yellow-100 text-yellow-700" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700" },
};

export default function ProjectTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [percentComplete, setPercentComplete] = useState(0);
  const [status, setStatus] = useState("on_track");
  const [eta, setEta] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, trackRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tracker`),
      ]);
      setProject(projRes.data);
      setHistory(trackRes.data || []);

      // Pre-fill today's entry if exists
      const todayStr = new Date().toISOString().split("T")[0];
      const todayEntry = (trackRes.data || []).find(u => u.update_date === todayStr);
      if (todayEntry) {
        setYesterday(todayEntry.yesterday || "");
        setToday(todayEntry.today || "");
        setBlockers(todayEntry.blockers || "");
        setPercentComplete(todayEntry.percent_complete || 0);
        setStatus(todayEntry.status || "on_track");
        setEta(todayEntry.eta || "");
      }
    } catch { toast.error("Failed to load project"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!yesterday.trim() || !today.trim()) { toast.error("Yesterday and Today fields are required"); return; }
    setSubmitting(true);
    try {
      await api.post(`/projects/${id}/tracker`, {
        yesterday: yesterday.trim(),
        today: today.trim(),
        blockers: blockers.trim() || null,
        percent_complete: percentComplete,
        status,
        eta,
      });
      toast.success("Standup submitted!");
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to submit"); }
    finally { setSubmitting(false); }
  };

  const handleStartBuild = async () => {
    try {
      await api.post(`/projects/${id}/start-build`);
      toast.success("Build started!");
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleComplete = async () => {
    try {
      await api.post(`/projects/${id}/complete`);
      toast.success("Project marked as completed!");
      navigate("/technology/my-projects");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!project) return <div className="text-center py-12 text-red-500">Project not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="project-tracker-page">
      <div className="flex items-center gap-3">
        <Link to="/technology/my-projects"><ArrowLeft className="w-5 h-5 text-gray-400 hover:text-gray-700" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500">{project.client_name_snapshot}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${project.status === "in_build" ? "bg-emerald-100 text-emerald-700" : project.status === "approved_for_build" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {project.status === "in_build" ? "In Build" : project.status === "approved_for_build" ? "Approved" : project.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-[#1B4332]">{percentComplete}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#1B4332] to-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }} />
        </div>
      </div>

      {/* Action buttons */}
      {project.status === "approved_for_build" && (
        <Button onClick={handleStartBuild} className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90 text-white py-5" data-testid="start-build-btn">
          <Play className="w-4 h-4 mr-2" /> Start Build
        </Button>
      )}

      {/* Standup form */}
      {["approved_for_build", "in_build"].includes(project.status) && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4" data-testid="standup-form">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9A84C]" /> Today's Standup
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What did you work on yesterday? <span className="text-red-500">*</span></label>
            <textarea value={yesterday} onChange={e => setYesterday(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1B4332]/20 resize-none" data-testid="yesterday-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What are you working on today? <span className="text-red-500">*</span></label>
            <textarea value={today} onChange={e => setToday(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1B4332]/20 resize-none" data-testid="today-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blockers <span className="text-gray-400">(optional)</span></label>
            <textarea value={blockers} onChange={e => setBlockers(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1B4332]/20 resize-none" data-testid="blockers-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">% Complete</label>
              <input type="range" min="0" max="100" value={percentComplete} onChange={e => setPercentComplete(Number(e.target.value))}
                className="w-full accent-[#1B4332]" data-testid="percent-slider" />
              <p className="text-xs text-gray-500 text-center mt-1">{percentComplete}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" data-testid="status-select">
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ETA</label>
            <input type="date" value={eta} onChange={e => setEta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="eta-input" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="submit-standup-btn">
            {submitting ? "Submitting..." : "Submit Standup"}
          </Button>
        </form>
      )}

      {project.status === "in_build" && (
        <Button onClick={handleComplete} variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50" data-testid="complete-project-btn">
          <Flag className="w-4 h-4 mr-2" /> Mark Project Complete
        </Button>
      )}

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Standup History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No standups yet</p>
        ) : (
          <div className="space-y-3">
            {history.map(h => {
              const ts = TRACKER_STATUS_STYLES[h.status] || {};
              return (
                <div key={h.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm" data-testid={`tracker-entry-${h.update_date}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">{h.update_date}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ts.color || "bg-gray-100"}`}>{ts.label || h.status}</span>
                      <span className="text-xs text-gray-400">{h.percent_complete}%</span>
                    </div>
                  </div>
                  <div className="text-sm space-y-1 text-gray-600">
                    <p><strong>Yesterday:</strong> {h.yesterday}</p>
                    <p><strong>Today:</strong> {h.today}</p>
                    {h.blockers && <p className="text-red-600"><strong>Blockers:</strong> {h.blockers}</p>}
                    {h.eta && <p className="text-xs text-gray-400">ETA: {h.eta}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
