import { useState, useEffect, useCallback } from "react";
import { assessmentAPI } from "../lib/api";
import { ArrowLeft, Download, Search, ChevronUp, ChevronDown, Eye, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const QUESTIONS = [
  { id: "q1", text: "Tell us about yourself — but don't tell us what you've built. Tell us who you are." },
  { id: "q2", text: "If you could only work at ONE company for the rest of your career, which would you choose?" },
  { id: "q3", text: "Why did you pick that? Be completely honest." },
  { id: "q4", text: "What drives you? Pick the ONE that is most honest." },
  { id: "q5", text: 'What does "being part of something big" actually mean to you?' },
  { id: "q6", text: "How smart do you think you are?" },
  { id: "q7", text: "Why did you pick that? What makes you believe this about yourself?" },
  { id: "q8", text: "Does order and structure make sense to you?" },
  { id: "q9", text: "Why that answer? Give a real example from your work." },
  { id: "q10", text: "Have you ever taken credit for something you didn't fully do?" },
  { id: "q11", text: "Do you think you are replaceable?" },
  { id: "q12", text: "What's one thing about yourself that most people get wrong?" },
  { id: "q13", text: "What is something you are genuinely not good at?" },
  { id: "q14", text: "Do you have a faith or belief system?" },
  { id: "q15", text: "What is the most important book, chapter, or verse in your holy text?" },
  { id: "q16", text: "Who do you consider the most important person — dead or alive?" },
  { id: "q17", text: "If you were an animal, what would you be? Why?" },
  { id: "q18", text: "What's one thing you love most about your family?" },
  { id: "q19", text: "Do you believe you have the ability to build anything?" },
  { id: "q20", text: "48 hours, no sleep, unlimited compute. What do you build?" },
  { id: "q21", text: 'What is your standard for "done"?' },
  { id: "q22", text: "Do you think AI can build anything?" },
  { id: "q23", text: "What is the hardest thing you've ever built?" },
  { id: "q24", text: "Have you ever known the right thing to do, but doing it would cost you something?" },
  { id: "q25", text: "If the technical lead was making a fundamentally wrong decision, what would you do?" },
  { id: "q26", text: "Tell us about a time you failed badly." },
  { id: "q27", text: "If you found a critical security vulnerability, what would you do?" },
  { id: "q28", text: 'A project outside your experience, 4 weeks — first 48 hours?' },
  { id: "q29", text: "Are you a 9-to-5 person, or do you lose track of time?" },
  { id: "q30", text: "Describe the best place to work for you." },
  { id: "q31", text: "If Crowther became Africa's most important tech firm, what role do you play?" },
  { id: "q32", text: "Is there anything about you that we should know but didn't ask?" },
  { id: "q33", text: "When you are old and retired, what do you want to look back and say you did with your life?" },
  { id: "q34", text: "Why that one? What would it feel like to actually achieve it?" },
  { id: "q35", text: "Your team lead makes a decision you think is wrong. You've raised your concern once. What do you do?" },
  { id: "q36", text: "You've been at a company for 2 years. An opportunity comes along. How do you handle the transition?" },
  { id: "q37", text: "Building your own name and reputation, or building something incredible as part of a team?" },
  { id: "q38", text: "A close friend needs you to rebuild a system you built at your last company to save lives. What do you do?" },
  { id: "q39", text: "The person leading your project has less technical experience than you. How does this affect how you work with them?" },
];

const formatMinutes = (seconds) => {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  return `${m} min`;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// --- Detail View ---
const DetailView = ({ assessmentId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await assessmentAPI.adminGet(assessmentId);
        setData(d);
      } catch (err) {
        toast.error("Failed to load assessment");
      } finally {
        setLoading(false);
      }
    })();
  }, [assessmentId]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-gray-300 border-t-[#5a54d4] rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-gray-500 p-8">Assessment not found.</p>;

  const handleExport = () => {
    window.open(assessmentAPI.adminExportSingle(assessmentId), "_blank");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button data-testid="back-to-list-btn" onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to list
        </button>
        <button data-testid="export-single-json-btn" onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700">
          <Download size={14} /> Download JSON
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6" data-testid="assessment-detail-header">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{data.name}</h2>
        <p className="text-sm text-gray-500 mb-4">{data.email}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Location</span>
            <span className="text-gray-800">{[data.location_city, data.location_country].filter(Boolean).join(", ") || "—"}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Salary</span>
            <span className="text-gray-800">{data.salary_expectation || "—"}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Onsite/Hybrid</span>
            <span className={`font-medium ${data.onsite_hybrid === "Yes" ? "text-green-600" : data.onsite_hybrid === "No" ? "text-red-500" : "text-gray-400"}`}>
              {data.onsite_hybrid || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Preference</span>
            <span className="text-gray-800">{data.work_preference || "—"}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Time Taken</span>
            <span className="text-gray-800">{formatMinutes(data.total_time_taken_seconds)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Status</span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${data.status === "completed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              {data.status === "completed" ? "Completed" : "In Progress"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Completion</span>
            <span className="text-gray-800">{data.questions_answered}/39 ({data.completion_pct}%)</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Submitted</span>
            <span className="text-gray-800">{formatDate(data.completed_at || data.started_at)}</span>
          </div>
        </div>
      </div>

      {/* Responses */}
      <div className="space-y-4" data-testid="assessment-responses">
        {QUESTIONS.map((q) => {
          const answer = data.answers?.[q.id] || "";
          return (
            <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex gap-2 mb-2">
                <span className="text-[#5a54d4] font-semibold text-sm shrink-0">{q.id.toUpperCase()}</span>
                <p className="text-gray-500 text-sm">{q.text}</p>
              </div>
              <p className="text-gray-900 text-sm whitespace-pre-wrap leading-relaxed pl-8">
                {answer || <span className="text-gray-300 italic">No response</span>}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- List View ---
export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("started_at");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await assessmentAPI.adminList(filter);
      setAssessments(data);
    } catch (err) {
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (selectedId) return <DetailView assessmentId={selectedId} onBack={() => { setSelectedId(null); fetchData(); }} />;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = assessments
    .filter(a => {
      if (!search) return true;
      const s = search.toLowerCase();
      return a.name?.toLowerCase().includes(s) || a.email?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === "started_at" || sortKey === "completed_at") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const ThBtn = ({ col, children }) => (
    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4 cursor-pointer select-none hover:text-gray-600" onClick={() => toggleSort(col)}>
      <span className="flex items-center gap-1">{children} <SortIcon col={col} /></span>
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900" data-testid="assessments-title">Candidate Assessments</h1>
          <p className="text-sm text-gray-500">{assessments.length} total submission{assessments.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={assessmentAPI.adminExportJson()} data-testid="export-json-btn" className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700">
            <FileJson size={14} /> Export JSON
          </a>
          <a href={assessmentAPI.adminExportCsv()} data-testid="export-csv-btn" className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700">
            <FileSpreadsheet size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            data-testid="search-assessments"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4]"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[["all", "All"], ["completed", "Completed"], ["in_progress", "In Progress"]].map(([val, label]) => (
            <button
              key={val}
              data-testid={`filter-${val}`}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filter === val ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#5a54d4] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No assessments found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="assessments-table">
              <thead className="border-b border-gray-100">
                <tr>
                  <ThBtn col="name">Name</ThBtn>
                  <ThBtn col="email">Email</ThBtn>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Location</th>
                  <ThBtn col="salary_expectation">Salary</ThBtn>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Onsite</th>
                  <ThBtn col="status">Status</ThBtn>
                  <ThBtn col="completion_pct">Completion</ThBtn>
                  <ThBtn col="total_time_taken_seconds">Time</ThBtn>
                  <ThBtn col="started_at">Date</ThBtn>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition-colors" data-testid={`assessment-row-${a.id}`}>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{a.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{a.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{[a.location_city, a.location_country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{a.salary_expectation || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{a.onsite_hybrid || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${a.status === "completed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                        {a.status === "completed" ? "Completed" : "In Progress"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{a.questions_answered}/39 ({a.completion_pct}%)</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatMinutes(a.total_time_taken_seconds)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatDate(a.started_at)}</td>
                    <td className="py-3 px-4">
                      <button
                        data-testid={`view-assessment-${a.id}`}
                        onClick={() => setSelectedId(a.id)}
                        className="flex items-center gap-1 text-xs text-[#5a54d4] hover:text-[#4e48c4] font-medium transition-colors"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
