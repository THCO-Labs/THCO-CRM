import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Code, 
  ArrowLeft, 
  ChevronRight,
  Users,
  GitBranch,
  Layers,
  Cpu,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Plus,
  Filter,
  FileText,
  ListChecks,
  Activity,
  Bug,
  Scale,
  TestTube,
  Zap,
  History,
  Hammer,
  Rocket
} from "lucide-react";
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";
import { Button } from "../components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";

// AI Agents for Technology & Build (from Agent Registry)
const AI_AGENTS = [
  {
    id: 5,
    name: "#5 Spec-to-Tasks Agent",
    description: "Converts project spec into sprint-organized engineering tickets with acceptance criteria",
    icon: ListChecks,
    priority: "critical",
    trigger: "Approved project enters build",
    status: "coming_soon"
  },
  {
    id: 12,
    name: "#12 MVP/Proposal Generator Agent",
    description: "Generates proposal draft: MVP scope, tech approach, timeline, pricing from rate card",
    icon: FileText,
    priority: "high",
    trigger: "Intake Brief from #8",
    status: "coming_soon"
  },
  {
    id: 18,
    name: "#18 Project Status Tracker Agent",
    description: "Daily engineering progress → client-friendly language. Sprint tracking, blocker flags",
    icon: Activity,
    priority: "medium",
    trigger: "Daily + sprint events",
    status: "coming_soon"
  },
  {
    id: 34,
    name: "#34 QA & Testing Agent",
    description: "Automated test suites, regression, code quality, security scans before Friday demos",
    icon: TestTube,
    priority: "medium",
    trigger: "PR created / pre-deployment",
    status: "coming_soon"
  },
  {
    id: 35,
    name: "#35 Scope Creep Detection Agent",
    description: "Compares tickets vs SOW. Flags out-of-scope work. Auto-drafts change orders",
    icon: Scale,
    priority: "medium",
    trigger: "New ticket created",
    status: "coming_soon"
  }
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200"
};

// 3 Engineering Pods from Operating Cycle
const ENGINEERING_PODS = [
  {
    id: "pod_a",
    name: "Pod A",
    lead: "James",
    focus: "Enterprise Solutions",
    members: 4,
    activeProjects: 2,
    status: "active",
    color: "from-cyan-500 to-blue-600"
  },
  {
    id: "pod_b",
    name: "Pod B",
    lead: "TBD",
    focus: "AI & Automation",
    members: 3,
    activeProjects: 1,
    status: "active",
    color: "from-emerald-500 to-emerald-600"
  },
  {
    id: "pod_c",
    name: "Pod C",
    lead: "TBD",
    focus: "Mobile & Web Apps",
    members: 3,
    activeProjects: 2,
    status: "active",
    color: "from-emerald-500 to-teal-600"
  }
];

const TOOLS = [
  {
    name: "Engineering Board",
    slug: "engineering-board",
    icon: Layers,
    description: "Track all engineering projects and sprint progress",
    gradient: "from-cyan-500 to-blue-600",
    active: true
  },
  {
    name: "Pod Assignment",
    slug: "pod-assignment",
    icon: Users,
    description: "Assign projects to engineering pods and manage capacity",
    gradient: "from-emerald-500 to-emerald-600",
    active: true
  },
  {
    name: "Sprint Tracker",
    slug: "sprint-tracker",
    icon: GitBranch,
    description: "Manage sprints, backlog, and deliverables",
    gradient: "from-emerald-500 to-teal-600",
    active: false
  },
  {
    name: "AI Tools Hub",
    slug: "ai-tools-hub",
    icon: Cpu,
    description: "Access to AI development tools and APIs",
    gradient: "from-amber-500 to-orange-600",
    active: false
  }
];

// Sample projects
const SAMPLE_PROJECTS = [
  {
    id: "TECH-001",
    name: "HomeEasy Platform v2.0",
    client: "HomeEasy",
    pod: "Pod A",
    status: "in_progress",
    progress: 65,
    dueDate: "2026-03-15",
    sa: "James"
  },
  {
    id: "TECH-002",
    name: "AI Recruiting Agent",
    client: "Internal",
    pod: "Pod B",
    status: "in_progress",
    progress: 40,
    dueDate: "2026-04-01",
    sa: "James"
  },
  {
    id: "TECH-003",
    name: "CRM Mobile App",
    client: "RetailMax",
    pod: "Pod C",
    status: "review",
    progress: 90,
    dueDate: "2026-02-28",
    sa: "James"
  },
  {
    id: "TECH-004",
    name: "Analytics Dashboard",
    client: "FinBank",
    pod: "Pod A",
    status: "planning",
    progress: 15,
    dueDate: "2026-05-01",
    sa: "James"
  },
  {
    id: "TECH-005",
    name: "E-commerce Portal",
    client: "ShopNow",
    pod: "Pod C",
    status: "in_progress",
    progress: 55,
    dueDate: "2026-03-30",
    sa: "James"
  }
];

const STATUS_CONFIG = {
  planning: { label: "Planning", color: "bg-gray-100 text-gray-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: GitBranch },
  review: { label: "Review", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700", icon: AlertCircle }
};

const TechnologyAndBuild = () => {
  const [selectedPod, setSelectedPod] = useState("all");
  const [activeTab, setActiveTab] = useState("main");

  const filteredProjects = selectedPod === "all" 
    ? SAMPLE_PROJECTS 
    : SAMPLE_PROJECTS.filter(p => p.pod === selectedPod);

  const stats = {
    totalProjects: SAMPLE_PROJECTS.length,
    inProgress: SAMPLE_PROJECTS.filter(p => p.status === "in_progress").length,
    inReview: SAMPLE_PROJECTS.filter(p => p.status === "review").length,
    totalEngineers: ENGINEERING_PODS.reduce((sum, p) => sum + p.members, 0)
  };

  return (
    <div className="space-y-8" data-testid="technology-build-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Technology & Build</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Unit Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Code className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Technology & Build</h1>
              <p className="text-gray-500 text-lg">
                3 engineering pods, AI tools, software delivery, product development
              </p>
              <p className="text-sm text-gray-400 mt-1">Lead: James (Solution Architect)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/technology/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>
            {/* Had neither an onClick nor a link, so clicking it did nothing. */}
            <Link to="/flow/projects/new">
              <Button className="bg-cyan-600 hover:bg-cyan-700" data-testid="tech-new-project-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("main")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "main" 
              ? "bg-white text-gray-900 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          data-testid="tab-main"
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("deployed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "deployed"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
          data-testid="tab-deployed"
        >
          <Rocket className="w-4 h-4" />
          My Tools
        </button>
        <button
          onClick={() => setActiveTab("build-history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "build-history" 
              ? "bg-white text-gray-900 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          data-testid="tab-build-history"
        >
          <History className="w-4 h-4" />
          Build History
        </button>
        <Link
          to="/technology/my-projects"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-gray-500 hover:text-gray-700"
          data-testid="tab-my-projects"
        >
          <Hammer className="w-4 h-4" />
          My Projects
        </Link>
      </div>

      {activeTab === "build-history" ? (
        <BuildHistory unit="technology" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="technology" />
        </div>
      ) : (
      <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
              <p className="text-sm text-gray-500">Active Projects</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Development</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inReview}</p>
              <p className="text-sm text-gray-500">In Review</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEngineers}</p>
              <p className="text-sm text-gray-500">Engineers</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Engineering Pods */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Engineering Pods</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ENGINEERING_PODS.map((pod, index) => (
            <motion.div
              key={pod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedPod(selectedPod === pod.name ? "all" : pod.name)}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedPod === pod.name ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200'
              }`}
              data-testid={`pod-card-${pod.id}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pod.color} flex items-center justify-center`}>
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{pod.name}</h3>
                  <p className="text-sm text-gray-500">{pod.focus}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Lead</p>
                  <p className="font-medium text-gray-900">{pod.lead}</p>
                </div>
                <div>
                  <p className="text-gray-400">Members</p>
                  <p className="font-medium text-gray-900">{pod.members}</p>
                </div>
                <div>
                  <p className="text-gray-400">Projects</p>
                  <p className="font-medium text-gray-900">{pod.activeProjects}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Development Tools</h2>
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
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-cyan-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                      <span className="text-sm text-cyan-600 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
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
                  
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">{tool.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{tool.description}</p>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-400">Under development</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Agents */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">AI Agents ({AI_AGENTS.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-cyan-600 transition-colors">
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

      {/* Projects Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Projects {selectedPod !== "all" && `(${selectedPod})`}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setSelectedPod("all")}>
            <Filter className="w-4 h-4 mr-2" />
            {selectedPod === "all" ? "Filter by Pod" : "Clear Filter"}
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pod</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.map((project, index) => {
                const statusConfig = STATUS_CONFIG[project.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    data-testid={`project-row-${project.id}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-400">{project.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{project.client}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-cyan-100 text-cyan-700">
                        {project.pod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{project.dueDate}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
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

export default TechnologyAndBuild;
