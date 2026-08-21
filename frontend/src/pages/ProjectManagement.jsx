import { useState, useEffect } from "react";
import IconBadge from "../components/ui/icon-badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FolderKanban, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Users,
  ArrowRight,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  Brain,
  LayoutDashboard,
  Zap,
  History
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import BuildHistory from "../components/BuildHistory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";

import { FLOWFORGE_ENABLED } from "../config/features";
// AI Agents for Project Management (from Agent Registry)
const AI_AGENTS = [
  {
    id: 15,
    name: "#15 Project Management Agent",
    description: "Victoria's daily dashboard: project statuses, stall alerts, overload warnings, deadlines",
    icon: LayoutDashboard,
    priority: "high",
    trigger: "06:00 daily schedule",
    status: "coming_soon"
  },
  {
    id: 25,
    name: "#25 Knowledge Capture Agent",
    description: "Post-project learnings from retros, demos, support. Searchable knowledge base. Case study drafts",
    icon: Brain,
    priority: "low",
    trigger: "Project milestone / Friday demos",
    status: "coming_soon"
  }
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200"
};

// Sample project data based on Crowther Operating Cycle
const SAMPLE_PROJECTS = [
  {
    id: "proj_001",
    name: "HomeEasy Platform Enhancement",
    client: "HomeEasy",
    status: "in_progress",
    phase: "BUILD",
    pod: "Pod A",
    pp: "Kenny",
    sa: "James",
    startDate: "2026-02-01",
    dueDate: "2026-03-15",
    progress: 65,
    pillar: "Technology"
  },
  {
    id: "proj_002",
    name: "Talent Acquisition - Senior Engineers",
    client: "TechCorp Nigeria",
    status: "scoping",
    phase: "SCOPE",
    pod: null,
    pp: "Christiana",
    sa: null,
    startDate: "2026-02-10",
    dueDate: "2026-02-28",
    progress: 25,
    pillar: "Talent"
  },
  {
    id: "proj_003",
    name: "HR Consulting Assessment",
    client: "FinBank Ltd",
    status: "review",
    phase: "REVIEW",
    pod: null,
    pp: "Christiana",
    sa: null,
    startDate: "2026-01-15",
    dueDate: "2026-02-20",
    progress: 90,
    pillar: "Advisory"
  },
  {
    id: "proj_004",
    name: "AI Workflow Training Program",
    client: "Day Learning",
    status: "delivered",
    phase: "LEARN",
    pod: null,
    pp: "Babatunde",
    sa: null,
    startDate: "2026-01-01",
    dueDate: "2026-02-01",
    progress: 100,
    pillar: "Academy"
  },
  {
    id: "proj_005",
    name: "CRM Integration Project",
    client: "RetailMax",
    status: "intake",
    phase: "FIND",
    pod: null,
    pp: null,
    sa: null,
    startDate: "2026-02-15",
    dueDate: "2026-04-30",
    progress: 5,
    pillar: "Technology"
  }
];

const PHASES = ["FIND", "SCOPE", "BUILD", "REVIEW", "EARN", "LEARN", "GROW"];
const STATUSES = {
  intake: { label: "Intake", color: "bg-gray-100 text-gray-700" },
  scoping: { label: "Scoping", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  review: { label: "Review", color: "bg-emerald-100 text-emerald-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  on_hold: { label: "On Hold", color: "bg-red-100 text-red-700" }
};

const PILLARS = ["Technology", "Talent", "Advisory", "Academy", "Operate"];

const ProjectManagement = () => {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterPillar, setFilterPillar] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    pillar: "",
    pp: "",
    dueDate: ""
  });

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = filterPhase === "all" || project.phase === filterPhase;
    const matchesPillar = filterPillar === "all" || project.pillar === filterPillar;
    return matchesSearch && matchesPhase && matchesPillar;
  });

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === "in_progress").length,
    review: projects.filter(p => p.status === "review").length,
    delivered: projects.filter(p => p.status === "delivered").length
  };

  const handleAddProject = () => {
    if (!newProject.name || !newProject.client) {
      toast.error("Please fill in project name and client");
      return;
    }
    
    const project = {
      id: `proj_${Date.now()}`,
      ...newProject,
      status: "intake",
      phase: "FIND",
      pod: null,
      sa: null,
      startDate: new Date().toISOString().split('T')[0],
      progress: 0
    };
    
    setProjects([project, ...projects]);
    setNewProject({ name: "", client: "", pillar: "", pp: "", dueDate: "" });
    setIsAddModalOpen(false);
    toast.success("Project added successfully");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="text-gray-500 mt-1">Track projects through the Crowther Operating Cycle</p>
        </div>
        <div className="flex gap-3">
          {/* FlowForge needs Supabase and n8n, neither configured here, so this

              returned 503 on every click. See config/features.js. */}

          {FLOWFORGE_ENABLED && (

            <Link to="/project-management/build/new">
            <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
              <Zap className="w-4 h-4 mr-2" />
              Build New Tool
            </Button>
          </Link>

          )}
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        <button onClick={() => setActiveTab("main")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "main" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-main">Overview</button>
        <button onClick={() => setActiveTab("build-history")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "build-history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-build-history"><History className="w-4 h-4" />Build History</button>
      </div>

      {activeTab === "build-history" ? (
        <BuildHistory unit="project-management" />
      ) : (
      <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center gap-3">
            <IconBadge icon={FolderKanban} accent="#8E8A82" size={40} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Projects</p>
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
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
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
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.review}</p>
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
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
              <p className="text-sm text-gray-500">Delivered</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Phase Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Operating Cycle Pipeline</h3>
        <div className="flex items-center gap-2">
          {PHASES.map((phase, index) => {
            const count = projects.filter(p => p.phase === phase).length;
            return (
              <div key={phase} className="flex items-center">
                <div 
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    count > 0 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {phase}
                  {count > 0 && <span className="ml-2 bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full">{count}</span>}
                </div>
                {index < PHASES.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Agents */}
      <div className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">AI Agents ({AI_AGENTS.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AI_AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={Icon} gradient="from-teal-500" size={40} />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-teal-600 transition-colors">
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

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPhase} onValueChange={setFilterPhase}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {PHASES.map(phase => (
              <SelectItem key={phase} value={phase}>{phase}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPillar} onValueChange={setFilterPillar}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pillar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {PILLARS.map(pillar => (
              <SelectItem key={pillar} value={pillar}>{pillar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Project</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pillar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phase</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProjects.map((project, index) => (
              <motion.tr
                key={project.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{project.name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600">{project.client}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {project.pillar}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold text-teal-600">{project.phase}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUSES[project.status].color}`}>
                    {STATUSES[project.status].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600">{project.pp || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600">{project.dueDate}</p>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* Add Project Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <Input
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <Input
                value={newProject.client}
                onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pillar</label>
              <Select value={newProject.pillar} onValueChange={(v) => setNewProject({ ...newProject, pillar: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pillar" />
                </SelectTrigger>
                <SelectContent>
                  {PILLARS.map(pillar => (
                    <SelectItem key={pillar} value={pillar}>{pillar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Partner</label>
              <Input
                value={newProject.pp}
                onChange={(e) => setNewProject({ ...newProject, pp: e.target.value })}
                placeholder="Assign PP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={newProject.dueDate}
                onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProject} className="bg-teal-600 hover:bg-teal-700">Add Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagement;
