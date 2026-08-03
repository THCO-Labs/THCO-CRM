import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Sparkles, Download, Loader2, ExternalLink, Check, Code, Globe, Linkedin, Copy, Wand2 } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { talentAPI } from "../lib/api";
import { toast } from "sonner";

const ExternalSourcing = () => {
  const [mode, setMode] = useState("ai");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [requestId, setRequestId] = useState(null);

  // AI Search state
  const [keywords, setKeywords] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [provider, setProvider] = useState("serper"); // "serpapi" | "serper" — serper default (more credits)

  // Boolean pack state
  const [packRole, setPackRole] = useState("");
  const [packSkills, setPackSkills] = useState("");
  const [packLocation, setPackLocation] = useState("");
  const [packCompany, setPackCompany] = useState("");
  const [booleanPacks, setBooleanPacks] = useState(null);

  const handleAISearch = async (e) => {
    e.preventDefault();
    if (!role.trim() && !keywords.trim()) {
      toast.error("Enter a role or skills to search for");
      return;
    }
    setSearching(true);
    setResults(null);
    const searchStart = Date.now();
    try {
      const keywordList = keywords.split(",").map(k => k.trim()).filter(Boolean);
      const exp = experienceYears ? parseInt(experienceYears) : null;
      const data = await talentAPI.searchExternal({
        keywords: keywordList,
        role,
        location,
        experience_years: exp,
        experience_years: exp,
        max_results: 100,
        preferred_provider: provider,
      });
      setResults(data.candidates || []);
      setRequestId(data.request_id);
      if (!data.total || data.total === 0) {
        toast.info("No candidates found. Try adjusting your search terms.");
      } else {
        toast.success(`Found ${data.total} candidates`);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error("Search failed: " + (detail || err.message));
    } finally {
      setSearching(false);
    }
  };

  const handleBuildPacks = async () => {
    if (!packRole.trim() && !packSkills.trim()) {
      toast.error("Enter a role or skills");
      return;
    }
    try {
      const skillList = packSkills.split(",").map(s => s.trim()).filter(Boolean);
      const data = await talentAPI.buildBooleanPack({
        role: packRole,
        skills: skillList,
        location: packLocation,
        company: packCompany,
      });
      setBooleanPacks(data.packs || []);
      toast.success("Boolean search packs generated");
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  };

  const toggleCandidate = (index) => {
    const next = new Set(selectedCandidates);
    if (next.has(index)) next.delete(index); else next.add(index);
    setSelectedCandidates(next);
  };

  const selectAll = () => {
    if (results && selectedCandidates.size === results.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(results.map((_, i) => i)));
    }
  };

  const handleSaveToNetwork = async () => {
    const toSave = Array.from(selectedCandidates).map(i => results[i]);
    if (toSave.length === 0) {
      toast.error("Select candidates to save");
      return;
    }
    setSaving(true);
    try {
      const data = await talentAPI.saveDiscovered(toSave, provider, {
        role,
        keywords,
        location,
        experience_years: experienceYears,
      });
      toast.success(`${data.created} saved, ${data.updated} updated in Talent Network`);
      setSelectedCandidates(new Set());
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.response?.statusText || err.message || "Unknown error";
      toast.error("Save failed: " + JSON.stringify(msg).slice(0, 200));
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence) => {
    const styles = {
      High: "bg-emerald-100 text-emerald-700",
      Medium: "bg-amber-100 text-amber-700",
      Low: "bg-red-100 text-red-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[confidence] || "bg-gray-100 text-gray-600"}`}>
        {confidence || "Unknown"}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="external-sourcing-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/talent" className="text-gray-500 hover:text-gray-900">Talent</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-medium">External Sourcing</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">External Candidate Sourcing</h1>
          <p className="text-gray-500 mt-1">Google-powered search via Serper + manual boolean search packs</p>
        </div>
        <div className="flex gap-2">
          <Link to="/talent/network">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Talent Network</Button>
          </Link>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setMode("ai")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            mode === "ai" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Search (Google)
        </button>
        <button
          onClick={() => setMode("boolean")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            mode === "boolean" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Code className="w-4 h-4" />
          Boolean Search Packs
        </button>
      </div>

      {mode === "ai" ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <form onSubmit={handleAISearch} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Searches LinkedIn & the web via Google. Results saved to your Talent Intelligence Network.
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 font-medium">Search via:</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="serper">Serper (100 results, 2,500 free)</option>
                <option value="serpapi">SerpAPI (100 results, paid)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Role / Title *</label>
                <Input placeholder="e.g. Backend Engineer, React Developer" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Skills (comma-separated)</label>
                <Input placeholder="e.g. python, django, aws" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Location</label>
                <Input placeholder="e.g. Lagos, Remote" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Min Experience (years)</label>
                <Input type="number" placeholder="e.g. 3" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={searching} className="w-full" size="lg">
              {searching ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching Google...</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" />Find Candidates</>
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Globe className="w-4 h-4 text-blue-500" />
            Generate search queries for LinkedIn, Google X-Ray, and GitHub. Copy and paste into the respective platform.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Role *</label>
              <Input placeholder="e.g. Backend Engineer" value={packRole} onChange={(e) => setPackRole(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Skills (comma-separated)</label>
              <Input placeholder="python, django, aws" value={packSkills} onChange={(e) => setPackSkills(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Location</label>
              <Input placeholder="Lagos, Remote" value={packLocation} onChange={(e) => setPackLocation(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Company Context</label>
              <Input placeholder="e.g. Fintech startup" value={packCompany} onChange={(e) => setPackCompany(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <Button onClick={handleBuildPacks}>
            <Code className="w-4 h-4 mr-2" />Generate Search Packs
          </Button>

          {booleanPacks && (
            <div className="space-y-3 mt-4">
              {booleanPacks.map((pack, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{pack.label}</p>
                    <button onClick={() => copyToClipboard(pack.query)} className="flex items-center gap-1 text-xs text-[#1FB58A] hover:underline">
                      <Copy className="w-3 h-3" />Copy
                    </button>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white rounded-lg p-3 border border-gray-200">{pack.query}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {results && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{results.length} candidates found</h3>
                <button onClick={selectAll} className="text-xs text-[#1FB58A] hover:underline">
                  {selectedCandidates.size === results.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <Button onClick={handleSaveToNetwork} disabled={saving || selectedCandidates.size === 0} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Save to Network ({selectedCandidates.size})
              </Button>
            </div>

            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {results.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                    selectedCandidates.has(i) ? "bg-emerald-50/50" : ""
                  }`}
                  onClick={() => toggleCandidate(i)}
                >
                  <div className="mt-0.5">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedCandidates.has(i) ? "bg-[#1FB58A] border-[#1FB58A]" : "border-gray-300"
                    }`}>
                      {selectedCandidates.has(i) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                          {c.confidence && getConfidenceBadge(c.confidence)}
                        </div>
                        {c.currentRole && (
                          <p className="text-xs text-gray-600 mt-0.5">{c.currentRole}{c.currentCompany ? ` at ${c.currentCompany}` : ""}</p>
                        )}
                        {c.location && <p className="text-xs text-gray-400">{c.location}</p>}
                        {c.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.summary}</p>}
                        {c.matchReasons && c.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.matchReasons.slice(0, 3).map((r, j) => (
                              <span key={j} className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.linkedinUrl && (
                          <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        {c.sourceUrl && (
                          <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1FB58A] hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-3 h-3" />View
                          </a>
                        )}
                      </div>
                    </div>
                    {c.skills && c.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.skills.slice(0, 6).map(s => (
                          <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExternalSourcing;
