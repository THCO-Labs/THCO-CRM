import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useUser, canManageUsers } from "../context/UserContext";
import { usersAPI, flowAPI, unitsAPI } from "../lib/api";
import { 
  UserCog, 
  ArrowLeft, 
  ChevronRight,
  Users,
  Award,
  Calendar,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Star,
  Building2,
  Plus,
  Search,
  Filter,
  Heart,
  Zap,
  History,
  Rocket
} from 'lucide-react';
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";

import { FLOWFORGE_ENABLED } from "../config/features";
// AI Agents for THCO HR (from Agent Registry)
const AI_AGENTS = [
  {
    id: 29,
    name: "#29 Internal HR & People Ops Agent",
    description: "THCO team admin: leave requests, expense reports, policy lookups, offboarding checklists",
    icon: Heart,
    priority: "low",
    trigger: "Employee request / HR event",
    status: "coming_soon"
  }
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200"
};

const TOOLS = [
  {
    name: "Employee Directory",
    slug: "employee-directory",
    icon: Users,
    description: "View and manage all THCO team members, roles, and departments",
    gradient: "from-emerald-500 to-emerald-600",
    // Genuinely built: the card scrolls to the directory further down this
    // page. The other three have nothing behind them yet and say so.
    active: true
  },
  {
    name: "Performance Reviews",
    slug: "performance-reviews",
    icon: Award,
    description: "Track performance metrics, goals, and review cycles",
    gradient: "from-emerald-500 to-teal-600",
    active: false
  },
  {
    name: "Leave Management",
    slug: "leave-management",
    icon: Calendar,
    description: "PTO requests, leave balances, and holiday calendar",
    gradient: "from-blue-500 to-cyan-600",
    active: false
  },
  {
    name: "Incentives & Bonuses",
    slug: "incentives",
    icon: DollarSign,
    description: "Track quarterly bonuses, incentive programs, and payouts",
    gradient: "from-amber-500 to-orange-600",
    active: false
  }
];

const DEPARTMENTS = ["Executive", "Technology", "Sales", "Operations", "Marketing", "Advisory", "Academy", "Delivery", "Talent"];

const THCOHRPage = () => {
  const user = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [activeTab, setActiveTab] = useState("main");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitMap, setUnitMap] = useState({});
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personProjects, setPersonProjects] = useState(null);
  const directoryRef = useRef(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await usersAPI.getAll();
        setEmployees(data || []);
      } catch {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const data = await unitsAPI.list();
        const map = {};
        (Array.isArray(data) ? data : []).forEach(u => {
          if (u.slug && u.name) map[u.slug] = u.name;
        });
        setUnitMap(map);
      } catch { /* ignore */ }
    };
    fetchUnits();
  }, []);

  const openPerson = async (emp) => {
    setSelectedPerson(emp);
    setPersonProjects(null);
    try {
      const data = await flowAPI.userProjects(emp.user_id);
      setPersonProjects(data);
    } catch {
      setPersonProjects({ created: [], collaborating: [] });
    }
  };

  // A person's units as separate names rather than one long string. Joining
  // them meant an administrator with eleven units rendered as a single pill
  // wrapping over four lines, which is what made the directory look broken.
  const unitList = (emp) => {
    const source = (emp.headed_units || []).length ? emp.headed_units : (emp.accessible_units || []);
    return source.filter((s) => s !== "flow").map((s) => unitMap[s] || s);
  };

  const roleLabel = (emp) =>
    emp.role === "super_admin" ? "Super Admin"
      : emp.role === "mini_admin" ? "Administrator"
      : emp.is_hr ? "HR"
      : "Team Member";

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.role || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === "all" || (emp.headed_units || []).includes(selectedDepartment.toLowerCase().replace(/\s+/g, "-")) || (emp.accessible_units || []).includes(selectedDepartment.toLowerCase().replace(/\s+/g, "-"));
    return matchesSearch && matchesDept;
  });

  const departmentCounts = DEPARTMENTS.reduce((acc, dept) => {
    const slug = dept.toLowerCase().replace(/\s+/g, "-");
    acc[dept] = employees.filter(e => (e.headed_units || []).includes(slug) || (e.accessible_units || []).includes(slug)).length;
    return acc;
  }, {});

  return (
    <div className="space-y-8" data-testid="thco-hr-page">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-medium">THCO HR</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Unit header, in the dashboard's voice: an eyebrow, a display-face
          title and quiet supporting text, rather than a coloured tile and a
          bold sans heading. */}
      <div className="pt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="lux-eyebrow mb-3">Business Unit</p>
            <h1 className="font-display text-4xl text-gray-900 leading-tight">THCO HR</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">
              Internal HR, employee records, people operations, performance and incentives.
            </p>
          </div>
          <div className="flex gap-3">
            {/* FlowForge needs Supabase and n8n, neither configured here, so this

                returned 503 on every click. See config/features.js. */}

            {FLOWFORGE_ENABLED && (

              <Link to="/thco-hr/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>

            )}
            {/* Had neither an onClick nor a link, so clicking it did nothing.
                Staff are invited in one place -- Staff Management -- and this
                opens that form directly rather than describing where to find
                it. Hidden from anybody who could not use it. */}
            {canManageUsers(user) && (
              <Link to="/admin/users?invite=1">
                <Button
                  className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-full px-6 h-11 gap-2"
                  data-testid="hr-add-staff-btn"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="lux-divider mt-8" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button onClick={() => setActiveTab("main")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "main" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-main">Overview</button>
        <button onClick={() => setActiveTab("deployed")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "deployed" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-deployed"><Rocket className="w-4 h-4" />My Tools</button>
        <button onClick={() => setActiveTab("build-history")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "build-history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-build-history"><History className="w-4 h-4" />Build History</button>
        <Link to="/thco-hr/delegation" className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-gray-500 hover:text-gray-700" data-testid="tab-delegation"><Users className="w-4 h-4" />Project Delegation</Link>
      </div>

      {activeTab === "build-history" ? (
        <BuildHistory unit="thco-hr" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-2">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="thco-hr" />
        </div>
      ) : (
      <>
      {/* Stat tiles in the dashboard's form: a ringed gold glyph, the figure
          in the display face, and a spaced small-caps label underneath. The
          previous tiles used four different accent colours, which made four
          equal facts look like four different kinds of thing. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Team Members", value: loading ? "…" : employees.length, icon: Users },
          { label: "Departments", value: DEPARTMENTS.length, icon: Building2 },
          { label: "Review Cycle", value: "Q1", icon: Star },
          {
            label: "Active",
            value: loading ? "…" : employees.filter((e) => e.status !== "disabled").length,
            icon: CheckCircle2,
          },
        ].map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-[#EAE7E0] p-5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-[26px] leading-none text-gray-900">{value}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5 truncate">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Agents */}
      <div>
        <h2 className="lux-eyebrow mb-4">AI Agents ({AI_AGENTS.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AI_AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white rounded-xl border border-[#EAE7E0] p-4 hover:border-emerald-300 hover:shadow-md transition-all"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">
                        {agent.name}
                      </h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[agent.priority]}`}>
                        {agent.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{agent.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">Trigger: {agent.trigger}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                    COMING SOON
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="lux-eyebrow mb-4">HR Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool, index) => {
            const Icon = tool.icon;
            
            if (tool.active) {
              return (
                <motion.div
                  key={tool.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => directoryRef.current?.scrollIntoView({ behavior: "smooth" })}
                  data-testid={`tool-card-${tool.slug}`}
                >
                  <div className={`h-2 bg-gradient-to-r ${tool.gradient}`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                    
                    <h3 className="font-display text-lg text-gray-900 mb-2 group-hover:text-[#8F7340] transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                      <span className="text-sm text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
                        Open Tool
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            }
            
            return (
              <motion.div
                key={tool.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden opacity-60"
                data-testid={`tool-card-${tool.slug}`}
              >
                <div className="h-2 bg-gray-200"></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-gray-400" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      COMING SOON
                    </span>
                  </div>
                  
                  <h3 className="font-display text-lg text-gray-700 mb-2">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {tool.description}
                  </p>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-400">Under development</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Employee Directory Preview */}
      <div ref={directoryRef}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="lux-eyebrow">Team Directory</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-56 rounded-full border-[#EAE7E0]"
                data-testid="employee-search"
              />
            </div>
            <select 
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3.5 py-2 text-[13px] border border-[#EAE7E0] rounded-full bg-white outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15"
              data-testid="department-filter"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept} ({departmentCounts[dept]})</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Cards of a fixed shape, matching the dashboard: a quiet surface, a
            single accent, and one line per fact. Previously every card grew to
            whatever its unit list needed, so one administrator stretched a row
            to four lines and left the others floating beside it. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-14 text-sm text-gray-400">Loading team…</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="col-span-full text-center py-14 text-sm text-gray-400">No team members found</div>
          ) : filteredEmployees.map((employee, index) => {
            const units = unitList(employee);
            const heads = (employee.headed_units || []).length > 0;
            return (
              <motion.button
                type="button"
                key={employee.user_id || index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 12) * 0.02 }}
                onClick={() => openPerson(employee)}
                className="text-left bg-white rounded-2xl border border-[#EAE7E0] p-5 hover:border-[#C6A15B]/50 hover:shadow-[0_2px_16px_rgba(0,0,0,0.04)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
                data-testid={`employee-card-${employee.user_id}`}
              >
                <div className="flex items-start gap-3.5">
                  <span className="shrink-0 w-11 h-11 rounded-full bg-[#14181D] text-[#D6BC8A] flex items-center justify-center text-[15px] font-semibold">
                    {(employee.name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-gray-900 truncate leading-tight">
                      {employee.name || "Unknown"}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400 mt-1">
                      {roleLabel(employee)}
                    </p>
                  </div>
                  {heads && (
                    <span
                      className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EAF8F3] text-[#12795C] border border-[#BFE7DA]"
                      title={`Project manager for ${units.join(", ")}`}
                    >
                      PM
                    </span>
                  )}
                </div>

                {/* Two units named, the rest counted. A directory card is for
                    recognising somebody, not for auditing their access. */}
                <div className="mt-3.5 pt-3.5 border-t border-[#F0EEE9] flex flex-wrap items-center gap-1.5 min-h-[30px]">
                  {units.length === 0 ? (
                    <span className="text-[11px] text-gray-300">No unit assigned</span>
                  ) : (
                    <>
                      {units.slice(0, 2).map((u) => (
                        <span
                          key={u}
                          className="text-[11px] text-gray-600 bg-[#F7F6F3] border border-[#EAE7E0] px-2 py-0.5 rounded-full truncate max-w-[130px]"
                          title={u}
                        >
                          {u}
                        </span>
                      ))}
                      {units.length > 2 && (
                        <span className="text-[11px] text-gray-400" title={units.join(", ")}>
                          +{units.length - 2} more
                        </span>
                      )}
                    </>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* Person detail modal */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedPerson(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="person-modal">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#14181D] text-[#D6BC8A] flex items-center justify-center font-semibold text-lg">
                  {(selectedPerson.name || "?").charAt(0)}
                </div>
                <div>
                  <h3 className="font-display text-xl text-gray-900">{selectedPerson.name}</h3>
                  <p className="text-sm text-gray-500">{selectedPerson.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Units</p>
                {/* Every unit here -- this is the detail view, where the full
                    picture belongs, unlike the card which names two. */}
                <div className="flex flex-wrap gap-1.5">
                  {unitList(selectedPerson).length === 0 ? (
                    <span className="text-sm text-gray-400">No unit assigned</span>
                  ) : (
                    unitList(selectedPerson).map((u) => (
                      <span
                        key={u}
                        className="text-[12px] text-gray-700 bg-[#F7F6F3] border border-[#EAE7E0] px-2.5 py-1 rounded-full"
                      >
                        {u}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">
                  {personProjects === null ? "Loading projects..." : `Projects (${(personProjects?.created?.length || 0) + (personProjects?.collaborating?.length || 0)})`}
                </p>
                {personProjects === null ? (
                  <div className="text-sm text-gray-400">Loading...</div>
                ) : (
                  <div className="space-y-3">
                    {(personProjects.created || []).length === 0 && (personProjects.collaborating || []).length === 0 && (
                      <p className="text-sm text-gray-400">No projects found</p>
                    )}
                    {(personProjects.created || []).map(p => (
                      <Link key={p.id} to={`/flow/projects/${p.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-[#C6A15B]/50 hover:bg-gray-50 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{p.name || p.project_id_display}</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Created</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{p.stage_label || `Stage ${p.stage}`}</p>
                      </Link>
                    ))}
                    {(personProjects.collaborating || []).map(p => (
                      <Link key={p.id} to={`/flow/projects/${p.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-[#C6A15B]/50 hover:bg-gray-50 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{p.name || p.project_id_display}</span>
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Collaborator</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{p.stage_label || `Stage ${p.stage}`}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back to Dashboard */}
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        data-testid="back-to-dashboard-link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
};

export default THCOHRPage;
