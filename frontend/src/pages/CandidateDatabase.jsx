import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronRight, ArrowLeft, Users, Mail, Phone, Linkedin, Briefcase, MapPin, Star, Clock, Trash2, ExternalLink, Upload, Sparkles, Check, X, Download } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { talentAPI } from "../lib/api";
import { toast } from "sonner";

const STATUS_OPTIONS = ["new", "contacted", "interviewing", "shortlisted", "hired", "rejected", "on-hold"];
const SOURCE_OPTIONS = ["upload", "drive", "external"];

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  interviewing: "bg-amber-100 text-amber-700",
  shortlisted: "bg-emerald-100 text-emerald-700",
  hired: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  "on-hold": "bg-gray-100 text-gray-600",
};

const ITEMS_PER_PAGE = 30;

const CandidateDatabase = () => {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [minExp, setMinExp] = useState("");
  const [maxExp, setMaxExp] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [stats, setStats] = useState(null);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const params = { skip: page * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE };
      if (search) params.q = search;
      if (skillFilter) params.skills = skillFilter;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (minExp) params.min_experience = parseFloat(minExp);
      if (maxExp) params.max_experience = parseFloat(maxExp);

      const data = await talentAPI.listCandidates(params);
      setCandidates(data.candidates || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await talentAPI.getStats();
      setStats(data);
    } catch {}
  };

  useEffect(() => {
    loadCandidates();
  }, [page, search, skillFilter, statusFilter, sourceFilter, minExp, maxExp]);

  useEffect(() => {
    loadStats();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (page !== 0) {
      setPage(0);
    } else {
      loadCandidates();
    }
  };

  const handleDelete = async (candidateId) => {
    try {
      await talentAPI.deleteCandidate(candidateId);
      toast.success("Candidate deleted");
      loadCandidates();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      await talentAPI.updateCandidate(candidateId, { status: newStatus });
      toast.success("Status updated");
      loadCandidates();
    } catch {
      toast.error("Failed to update");
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6" data-testid="candidate-database-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/talent" className="text-gray-500 hover:text-gray-900">Talent</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-medium">Candidate Database</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Database</h1>
          <p className="text-gray-500 mt-1">
            {total.toLocaleString()} candidates indexed
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/talent/candidates/upload">
            <Button variant="outline" data-testid="upload-cv-btn">
              <Upload className="w-4 h-4 mr-2" />
              Upload CVs
            </Button>
          </Link>
          <Link to="/talent/sourcing/external">
            <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90" data-testid="external-sourcing-btn">
              <Sparkles className="w-4 h-4 mr-2" />
              Source Externally
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.by_source || {}).map(([src, count]) => (
            <div key={src} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{src}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by name, email, skills, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11"
                data-testid="candidate-search-input"
              />
            </div>
            <Button type="submit" data-testid="candidate-search-btn">Search</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="toggle-filters-btn"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {(skillFilter || statusFilter || sourceFilter || minExp || maxExp) && (
                <span className="ml-1 w-2 h-2 rounded-full bg-[#1FB58A]" />
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Source</label>
                    <select
                      value={sourceFilter}
                      onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All</option>
                      {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Skills (comma-separated)</label>
                    <Input
                      placeholder="e.g. react, python"
                      value={skillFilter}
                      onChange={(e) => { setSkillFilter(e.target.value); }}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Min Exp (years)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minExp}
                      onChange={(e) => { setMinExp(e.target.value); }}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Max Exp (years)</label>
                    <Input
                      type="number"
                      placeholder="20"
                      value={maxExp}
                      onChange={(e) => { setMaxExp(e.target.value); }}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Results */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1FB58A]" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No candidates found</p>
            <p className="text-sm text-gray-400 mt-1">Upload CVs or source externally to get started</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <motion.tr
                      key={c.candidate_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCandidate(selectedCandidate?.candidate_id === c.candidate_id ? null : c)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                            {(c.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{c.name || "Unknown"}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                              {c.linkedin && (
                                <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <Linkedin className="w-3 h-3" />LinkedIn
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(c.skills || []).slice(0, 4).map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{s}</span>
                          ))}
                          {(c.skills || []).length > 4 && (
                            <span className="text-xs text-gray-400">+{c.skills.length - 4} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Briefcase className="w-3 h-3 text-gray-400" />
                          {c.experience_years ? `${c.experience_years} yrs` : "-"}
                        </div>
                        {c.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <MapPin className="w-3 h-3" />{c.location}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                          {c.source || "unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={c.status || "new"}
                          onChange={(e) => handleStatusChange(c.candidate_id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.linkedin && (
                            <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600" onClick={e => e.stopPropagation()}>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(c.candidate_id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {page * ITEMS_PER_PAGE + 1}-{Math.min((page + 1) * ITEMS_PER_PAGE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Candidate Detail Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCandidate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedCandidate.name || "Unknown Candidate"}
                </h2>
                <button onClick={() => setSelectedCandidate(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedCandidate.email && (
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{selectedCandidate.email}</p>
                    </div>
                  )}
                  {selectedCandidate.phone && (
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{selectedCandidate.phone}</p>
                    </div>
                  )}
                  {selectedCandidate.linkedin && (
                    <div>
                      <p className="text-xs text-gray-500">LinkedIn</p>
                      <a href={selectedCandidate.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        {selectedCandidate.linkedin}
                      </a>
                    </div>
                  )}
                  {selectedCandidate.experience_years && (
                    <div>
                      <p className="text-xs text-gray-500">Experience</p>
                      <p className="text-sm text-gray-900">{selectedCandidate.experience_years} years</p>
                    </div>
                  )}
                  {selectedCandidate.location && (
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm text-gray-900">{selectedCandidate.location}</p>
                    </div>
                  )}
                  {selectedCandidate.current_role && (
                    <div>
                      <p className="text-xs text-gray-500">Current Role</p>
                      <p className="text-sm text-gray-900">{selectedCandidate.current_role}</p>
                    </div>
                  )}
                </div>

                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.skills.map(s => (
                        <span key={s} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.raw_text && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500">Full CV / Resume</p>
                      <span className="text-xs text-gray-400">{selectedCandidate.filename}</span>
                    </div>
                    {(selectedCandidate.source_reference || "").startsWith("gdrive:") && (
                      <a
                        href={`https://drive.google.com/file/d/${selectedCandidate.source_reference.replace("gdrive:", "")}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
                      >
                        <ExternalLink className="w-3 h-3" /> Open CV on Google Drive
                      </a>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-100">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedCandidate.raw_text}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CandidateDatabase;
