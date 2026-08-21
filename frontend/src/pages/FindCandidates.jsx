import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Sparkles, Loader2, Download, Check, Users, Globe, ChevronDown, ChevronRight, ExternalLink, Mail, Linkedin, Star, Briefcase, MapPin, Database, Wand2 } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { talentAPI } from "../lib/api";
import { toast } from "sonner";

const FindCandidates = () => {
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("Nigeria");
  const [description, setDescription] = useState("");
  const [sourceMode, setSourceMode] = useState("both"); // "internal" | "external" | "both"

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedInternal, setExpandedInternal] = useState(new Set());
  const [expandedExternal, setExpandedExternal] = useState(new Set());
  const [selectedExternal, setSelectedExternal] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!title.trim() && !skills.trim() && !description.trim()) {
      toast.error("Enter a role, skills, or job description");
      return;
    }
    setSearching(true);
    setResults(null);
    setExpandedInternal(new Set());
    setExpandedExternal(new Set());
    setSelectedExternal(new Set());

    try {
      const skillList = skills.split(",").map(s => s.trim()).filter(Boolean);
      const data = await talentAPI.unifiedSearch({
        title,
        skills: skillList,
        location: location || "Nigeria",
        description,
        search_external: sourceMode !== "internal",
        search_internal: sourceMode !== "external",
        max_internal: 30,
        max_external: 50,
      });
      setResults(data);
      const total = (data.internal?.length || 0) + (data.external?.length || 0);
      toast.success(`${data.internal?.length || 0} internal + ${data.external?.length || 0} network candidates`);
    } catch (err) {
      toast.error("Search failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSearching(false);
    }
  };

  const toggleInternal = (i) => {
    const next = new Set(expandedInternal);
    next.has(i) ? next.delete(i) : next.add(i);
    setExpandedInternal(next);
  };

  const toggleExternal = (i) => {
    const next = new Set(expandedExternal);
    next.has(i) ? next.delete(i) : next.add(i);
    setExpandedExternal(next);
  };

  const toggleExternalSelect = (i) => {
    const next = new Set(selectedExternal);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelectedExternal(next);
  };

  const selectAllExternal = () => {
    if (results?.external && selectedExternal.size === results.external.length) {
      setSelectedExternal(new Set());
    } else {
      setSelectedExternal(new Set((results?.external || []).map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const toImport = Array.from(selectedExternal).map(i => results.external[i]);
    if (toImport.length === 0) {
      toast.error("Select external candidates to import");
      return;
    }
    setImporting(true);
    try {
      const data = await talentAPI.importExternal({ candidates: toImport });
      const imported = data.imported.filter(r => r.status === "created").length;
      const skipped = data.imported.filter(r => r.status === "skipped").length;
      toast.success(`Imported ${imported} (${skipped} duplicates skipped)`);
    } catch (err) {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "bg-emerald-100 text-emerald-700";
    if (score >= 50) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const getConfidenceBadge = (confidence) => {
    const styles = {
      High: "bg-emerald-100 text-emerald-700",
      Medium: "bg-amber-100 text-amber-700",
      Low: "bg-red-100 text-red-700",
    };
    return styles[confidence] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6" data-testid="find-candidates-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/talent" className="text-gray-500 hover:text-gray-900">Talent</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem><BreadcrumbPage className="text-gray-900 font-medium">Find Talent</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Talent</h1>
          <p className="text-gray-500 mt-1">Search internal database + Talent Intelligence Network</p>
        </div>
        <div className="flex gap-2">
          <Link to="/talent/candidates">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Database</Button>
          </Link>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Role / Title *</label>
              <Input placeholder="e.g. Backend Engineer" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="search-title" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Skills (comma-separated)</label>
              <Input placeholder="e.g. python, react, aws" value={skills} onChange={(e) => setSkills(e.target.value)} data-testid="search-skills" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Location</label>
              <Input placeholder="e.g. Lagos, Remote" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="search-location" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Job Description (paste full JD for AI-powered matching)</label>
            <textarea
              placeholder="Paste the full job description here for AI to extract must-haves, target titles, and scoring rubric..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A]"
              data-testid="search-description"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {[
                { value: "both", label: "Internal + Network" },
                { value: "internal", label: "Internal Only" },
                { value: "external", label: "Network Only" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSourceMode(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    sourceMode === opt.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button type="submit" disabled={searching} size="lg" data-testid="search-btn">
              {searching ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" />Find Talent</>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Sparkles className="w-3 h-3" />
            Paste a full JD for AI to automatically extract required skills, target titles, and experience range. Falls back to manual keywords if no JD is provided.
          </div>
        </form>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* AI Rubric */}
            {results.rubric && (results.rubric.mustHaveSkills?.length > 0 || results.rubric.targetTitles?.length > 0) && (
              <div className="bg-[#1FB58A]/5 rounded-2xl border border-[#1FB58A]/20 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#1FB58A]" />
                  <h3 className="text-sm font-semibold text-gray-900">AI Matching Rubric</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {results.rubric.targetTitles?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Target Titles</p>
                      <div className="flex flex-wrap gap-1">
                        {results.rubric.targetTitles.slice(0, 3).map((t, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-[#1FB58A]/10 text-[#1FB58A] rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {results.rubric.mustHaveSkills?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Must-Have Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {results.rubric.mustHaveSkills.slice(0, 5).map((s, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {results.rubric.minYearsExperience !== null && results.rubric.minYearsExperience !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Experience Range</p>
                      <span className="text-sm text-gray-900">{results.rubric.minYearsExperience} - {results.rubric.maxYearsExperience || "any"} years</span>
                    </div>
                  )}
                  {results.rubric.industrySignals?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Industry</p>
                      <div className="flex flex-wrap gap-1">
                        {results.rubric.industrySignals.slice(0, 3).map((s, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Internal Candidates */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Internal Database</h3>
                <span className="text-sm text-gray-500">{results.internal?.length || 0} candidates found</span>
                <span className="text-xs text-gray-400 ml-auto">scored & ranked</span>
              </div>

              {!results.internal?.length ? (
                <div className="text-center py-12 text-gray-400 text-sm">No matching candidates in internal database</div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                  {results.internal.map((c, i) => (
                    <div key={i}>
                      <div
                        className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => toggleInternal(i)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${
                            c.score >= 75 ? "bg-emerald-500" : c.score >= 50 ? "bg-amber-500" : "bg-gray-400"
                          }`}>
                            {c.score}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 text-sm">{c.name || "Unknown"}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreColor(c.score)}`}>{c.score}/100</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              {c.current_role && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.current_role}</span>}
                              {c.experience_years && <span>{c.experience_years}yrs exp</span>}
                              {c.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}</span>}
                              {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                            </div>
                          </div>
                        </div>
                        {expandedInternal.has(i) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </div>

                      <AnimatePresence>
                        {expandedInternal.has(i) && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-6 pb-4 bg-gray-50/30">
                              {(c.skills?.length > 0) && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {c.skills.map(s => (
                                    <span key={s} className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600">{s}</span>
                                  ))}
                                </div>
                              )}
                              {c.match_reasons?.length > 0 && (
                                <div className="space-y-1 mb-3">
                                  {c.match_reasons.map((r, j) => (
                                    <p key={j} className="text-xs text-gray-600 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-[#1FB58A]" />{r}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {c.raw_text && (
                                <details className="text-xs text-gray-500">
                                  <summary className="cursor-pointer hover:text-gray-700">View resume text</summary>
                                  <pre className="mt-2 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto bg-white border rounded-lg p-3">{c.raw_text.substring(0, 1000)}</pre>
                                </details>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Network Candidates */}
            {results.external?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <Globe className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Talent Intelligence Network</h3>
                  <span className="text-sm text-gray-500">{results.external.length} candidates from external DB</span>
                  <div className="ml-auto">
                    <Link to="/talent/network">
                      <Button variant="outline" size="sm">Open Network</Button>
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                  {results.external.slice(0, 20).map((c, i) => (
                    <div key={i} className="flex items-start gap-4 px-6 py-3 hover:bg-gray-50/50">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${
                        (c.score || c.confidence_score || 50) >= 75 ? "bg-purple-500" : (c.score || c.confidence_score || 50) >= 50 ? "bg-purple-300" : "bg-gray-400"
                      }`}>
                        {c.score || c.confidence_score || 50}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{c.name || "Unknown"}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          {c.current_role && <span>{c.current_role}</span>}
                          {c.seniority && <span className="px-1.5 py-0.5 rounded-full bg-gray-100">{c.seniority}</span>}
                          {c.location && <span>{c.location}</span>}
                        </div>
                        {(c.skills || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.skills.slice(0, 4).map(s => <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{s}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener" className="text-blue-600"><Linkedin className="w-4 h-4" /></a>}
                        <Link to={`/talent/network`} className="text-xs text-[#1FB58A] hover:underline"><ChevronRight className="w-4 h-4" /></Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(results.external?.length || 0) === 0 && sourceMode !== "internal" && !searching && (
              <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                <Globe className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No matching candidates in the Talent Intelligence Network</p>
                <Link to="/talent/sourcing/external">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Sparkles className="w-4 h-4 mr-1" />Discover New Candidates
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FindCandidates;
