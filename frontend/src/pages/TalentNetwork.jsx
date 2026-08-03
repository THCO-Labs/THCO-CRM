import { useState, useEffect } from "react";
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, ArrowLeft, Users, ExternalLink, Download, RefreshCw, Trash2, Sparkles, MapPin, Briefcase, Star, BarChart3, Clock, Activity, Linkedin, X } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { talentAPI } from "../lib/api";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 30;

const TalentNetwork = () => {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [hovered, setHovered] = useState(null);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const params = { skip: page * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE };
      if (search) params.q = search;
      if (skillFilter) params.skills = skillFilter;
      if (locationFilter) params.location = locationFilter;
      if (seniorityFilter) params.seniority = seniorityFilter;
      const data = await talentAPI.listNetworkCandidates(params);
      setCandidates(data.candidates || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try { setStats(await talentAPI.getNetworkStats()); } catch {}
  };

  useEffect(() => { loadCandidates(); }, [page, search, skillFilter, locationFilter, seniorityFilter]);
  useEffect(() => { loadStats(); }, []);

  const handleSearch = (e) => { e.preventDefault(); setPage(0); };

  const handleEnrich = async (cid) => {
    try { await talentAPI.enrichNetworkCandidate(cid); toast.success("Enriched"); loadCandidates(); }
    catch { toast.error("Failed"); }
  };

  const handleRefresh = async (cid) => {
    try { await talentAPI.refreshNetworkCandidate(cid); toast.success("Refreshed"); loadCandidates(); }
    catch { toast.error("Failed"); }
  };

  const handleImport = async (cid) => {
    try { const r = await talentAPI.importNetworkCandidate(cid); toast.success(r.status === "already_exists" ? "Already in internal DB" : "Imported"); }
    catch { toast.error("Failed"); }
  };

  const handleDelete = async (cid) => {
    try { await talentAPI.deleteNetworkCandidate(cid); toast.success("Deleted"); loadCandidates(); }
    catch { toast.error("Failed"); }
  };

  const openProfile = (c) => setSelectedCandidate(c);
  const closeProfile = () => setSelectedCandidate(null);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/talent" className="text-gray-500 hover:text-gray-900">Talent</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem><BreadcrumbPage className="text-gray-900 font-medium">Talent Network</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Network</h1>
          <p className="text-gray-500 mt-1">{total.toLocaleString()} external candidates discovered</p>
        </div>
        <Link to="/talent/sourcing/external">
          <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white"><RefreshCw className="w-4 h-4 mr-2" />Discover More</Button>
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Profiles", value: stats.total_external, icon: Users },
            { label: "Enriched", value: `${stats.enrichment_rate}%`, icon: Sparkles },
            { label: "New Today", value: stats.new_today, icon: Activity },
            { label: "Stale", value: stats.stale_profiles, icon: Clock },
            { label: "Pending Refresh", value: stats.pending_refresh, icon: RefreshCw },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <item.icon className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="Search by name, skills, or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11" />
            </div>
            <Button type="submit">Search</Button>
            <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />Filters
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Skills</label>
                <Input placeholder="react, python" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Location</label>
                <Input placeholder="Lagos" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Seniority</label>
                <select value={seniorityFilter} onChange={(e) => setSeniorityFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-9">
                  <option value="">All</option>
                  <option value="Entry">Entry</option>
                  <option value="Mid">Mid</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                  <option value="Head">Head</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1FB58A]" /></div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-20"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No external candidates yet</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Candidate</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Occupation</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Skills</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Seniority</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <React.Fragment key={c.candidate_id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer relative"
                      onClick={() => openProfile(c)}
                      onMouseEnter={() => setHovered(c)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                            {(c.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{c.name || "Unknown"}</p>
                            <p className="text-xs text-gray-400">{c.location || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 font-medium">
                          {/* The title's first segment is the person's name, so
                              falling back to it printed the name under
                              "Occupation". Show nothing when no role was parsed. */}
                          {c.current_role || c.currentRole || "-"}
                        </span>
                        {c.current_company && <p className="text-xs text-gray-400">{c.current_company}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(c.skills || []).slice(0, 3).map(s => <span key={s} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{s}</span>)}
                          {(c.skills || []).length > 3 && <span className="text-xs text-gray-400">+{c.skills.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          c.seniority === "Senior" ? "bg-emerald-100 text-emerald-700" :
                          c.seniority === "Lead" || c.seniority === "Head" ? "bg-purple-100 text-purple-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{c.seniority || "Mid"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-[#1FB58A] h-1.5 rounded-full" style={{ width: `${c.confidence_score || 50}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{c.confidence_score || 50}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600"><ExternalLink className="w-4 h-4" /></a>}
                          <button onClick={() => handleEnrich(c.candidate_id)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600"><Sparkles className="w-4 h-4" /></button>
                          <button onClick={() => handleRefresh(c.candidate_id)} className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600"><RefreshCw className="w-4 h-4" /></button>
                          <button onClick={() => handleImport(c.candidate_id)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600"><Download className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c.candidate_id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    {hovered?.candidate_id === c.candidate_id && (
                    <tr key={`h-${c.candidate_id}`} className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-3 text-sm">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {c.current_role && <span className="font-medium text-gray-900">{c.current_role}</span>}
                              {c.seniority && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">{c.seniority}</span>}
                              {c.experience_years && <span className="text-xs text-gray-500">{c.experience_years} yrs</span>}
                              {c.confidence_score && <span className="text-xs text-gray-400">Match: {c.confidence_score}/100</span>}
                            </div>
                            {c.summary && <p className="text-xs text-gray-600">{c.summary.slice(0, 250)}</p>}
                            {c.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1">{c.skills.map(s => <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded-full">{s}</span>)}</div>
                            )}
                            <div className="flex gap-3">
                              {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Linkedin className="w-3 h-3" />LinkedIn</a>}
                              {c.sourceUrl && <a href={c.sourceUrl} target="_blank" rel="noopener" className="text-xs text-gray-500 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Source</a>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Showing {page * ITEMS_PER_PAGE + 1}-{Math.min((page + 1) * ITEMS_PER_PAGE, total)} of {total}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedCandidate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeProfile}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedCandidate.name || "Unknown"}</h2>
              <button onClick={closeProfile} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              {selectedCandidate.current_role && <div><p className="text-xs text-gray-500 mb-1">Occupation</p><p className="text-gray-900 font-medium">{selectedCandidate.current_role}{selectedCandidate.current_company ? ` at ${selectedCandidate.current_company}` : ""}</p></div>}
              <div className="grid grid-cols-2 gap-4">
                {selectedCandidate.seniority && <div><p className="text-xs text-gray-500">Seniority</p><p className="text-gray-900">{selectedCandidate.seniority}</p></div>}
                {selectedCandidate.location && <div><p className="text-xs text-gray-500">Location</p><p className="text-gray-900">{selectedCandidate.location}</p></div>}
                {selectedCandidate.experience_years && <div><p className="text-xs text-gray-500">Experience</p><p className="text-gray-900">{selectedCandidate.experience_years} years</p></div>}
                {selectedCandidate.confidence_score && <div><p className="text-xs text-gray-500">Match Score</p><p className="text-gray-900">{selectedCandidate.confidence_score}/100</p></div>}
              </div>
              {selectedCandidate.skills?.length > 0 && <div><p className="text-xs text-gray-500 mb-1">Skills</p><div className="flex flex-wrap gap-1">{selectedCandidate.skills.map(s => <span key={s} className="text-xs px-2 py-1 bg-gray-100 rounded-full">{s}</span>)}</div></div>}
              {selectedCandidate.ai_summary && <div><p className="text-xs text-gray-500 mb-1">AI Summary</p><p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedCandidate.ai_summary}</p></div>}
              {selectedCandidate.strengths?.length > 0 && <div><p className="text-xs text-gray-500 mb-1">Strengths</p><ul className="space-y-1">{selectedCandidate.strengths.map((s,i) => <li key={i} className="text-gray-700 flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{s}</li>)}</ul></div>}
              {selectedCandidate.summary && <div><p className="text-xs text-gray-500 mb-1">Summary</p><p className="text-gray-700">{selectedCandidate.summary}</p></div>}
              <div className="flex gap-2 border-t border-gray-100 pt-3">
                {selectedCandidate.linkedin && <a href={selectedCandidate.linkedin} target="_blank" rel="noopener" className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100"><Linkedin className="w-3 h-3 inline mr-1" />LinkedIn</a>}
                {selectedCandidate.sourceUrl && <a href={selectedCandidate.sourceUrl} target="_blank" rel="noopener" className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-100"><ExternalLink className="w-3 h-3 inline mr-1" />Source</a>}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TalentNetwork;
