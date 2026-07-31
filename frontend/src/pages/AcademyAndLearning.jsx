import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  ArrowLeft, 
  ChevronRight,
  BookOpen,
  Users,
  Award,
  Play,
  Clock,
  CheckCircle2,
  Star,
  TrendingUp,
  Plus,
  Filter,
  UserCheck,
  Route,
  Code2,
  Zap,
  History,
  Rocket
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";

// AI Agents for Academy & Learning (from Agent Registry)
const AI_AGENTS = [
  {
    id: 22,
    name: "#22 Applicant Screening Agent",
    description: "Screens Day Learning applicants: scoring, interview scheduling. Shortlists top candidates",
    icon: UserCheck,
    priority: "medium",
    trigger: "New application",
    status: "coming_soon"
  },
  {
    id: 26,
    name: "#26 Curriculum & Learning Path Agent",
    description: "Personalized learning paths based on track + career goals. Progress tracking, recommendations",
    icon: Route,
    priority: "low",
    trigger: "Trainee onboarding / milestone",
    status: "coming_soon"
  },
  {
    id: 27,
    name: "#27 Code Review & Mentoring Agent",
    description: "Reviews trainee code, provides feedback. Tracks skill progression. Flags for mentor attention",
    icon: Code2,
    priority: "low",
    trigger: "PR submitted / assignment due",
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
    name: "Day Learning Platform",
    slug: "day-learning",
    icon: BookOpen,
    description: "Access to Day Learning courses and AI Engineer tracks",
    gradient: "from-amber-500 to-orange-600",
    active: true
  },
  {
    name: "Trainee Tracker",
    slug: "trainee-tracker",
    icon: Users,
    description: "Track trainee progress, certifications, and placements",
    gradient: "from-emerald-500 to-teal-600",
    active: true
  },
  {
    name: "Course Builder",
    slug: "course-builder",
    icon: Play,
    description: "Create and manage training courses and curricula",
    gradient: "from-blue-500 to-indigo-600",
    active: false
  },
  {
    name: "Certification Manager",
    slug: "certification-manager",
    icon: Award,
    description: "Issue and track professional certifications",
    gradient: "from-emerald-500 to-emerald-600",
    active: false
  }
];

// Learning tracks from Operating Cycle
const LEARNING_TRACKS = [
  {
    id: "ai_engineer",
    name: "AI Engineer Track",
    duration: "12 weeks",
    enrolled: 24,
    completed: 18,
    modules: 8,
    color: "from-emerald-500 to-emerald-600"
  },
  {
    id: "brand_architect",
    name: "Brand Architect Track",
    duration: "8 weeks",
    enrolled: 15,
    completed: 12,
    modules: 6,
    color: "from-pink-500 to-rose-600"
  },
  {
    id: "tech_fundamentals",
    name: "Tech Fundamentals",
    duration: "6 weeks",
    enrolled: 32,
    completed: 28,
    modules: 5,
    color: "from-cyan-500 to-blue-600"
  }
];

// Sample trainees
const SAMPLE_TRAINEES = [
  {
    id: 1,
    name: "Adaeze Okoro",
    track: "AI Engineer Track",
    progress: 85,
    status: "active",
    startDate: "2026-01-15",
    mentor: "James"
  },
  {
    id: 2,
    name: "Chidi Nnamdi",
    track: "AI Engineer Track",
    progress: 72,
    status: "active",
    startDate: "2026-01-20",
    mentor: "Emmanuel"
  },
  {
    id: 3,
    name: "Fatima Bello",
    track: "Brand Architect Track",
    progress: 95,
    status: "graduating",
    startDate: "2025-11-01",
    mentor: "Havilah"
  },
  {
    id: 4,
    name: "Olumide Adeyemi",
    track: "Tech Fundamentals",
    progress: 100,
    status: "placed",
    startDate: "2025-10-15",
    mentor: "James"
  },
  {
    id: 5,
    name: "Amara Eze",
    track: "AI Engineer Track",
    progress: 45,
    status: "active",
    startDate: "2026-02-01",
    mentor: "James"
  }
];

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-blue-100 text-blue-700" },
  graduating: { label: "Graduating", color: "bg-amber-100 text-amber-700" },
  placed: { label: "Placed", color: "bg-green-100 text-green-700" },
  paused: { label: "Paused", color: "bg-gray-100 text-gray-600" }
};

const AcademyAndLearning = () => {
  const [selectedTrack, setSelectedTrack] = useState("all");
  const [activeTab, setActiveTab] = useState("main");

  const filteredTrainees = selectedTrack === "all"
    ? SAMPLE_TRAINEES
    : SAMPLE_TRAINEES.filter(t => t.track === selectedTrack);

  const stats = {
    totalTrainees: SAMPLE_TRAINEES.length,
    activeTrainees: SAMPLE_TRAINEES.filter(t => t.status === "active").length,
    placedTrainees: SAMPLE_TRAINEES.filter(t => t.status === "placed").length,
    avgProgress: Math.round(SAMPLE_TRAINEES.reduce((sum, t) => sum + t.progress, 0) / SAMPLE_TRAINEES.length)
  };

  return (
    <div className="space-y-8" data-testid="academy-learning-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Academy & Learning</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Unit Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Academy & Learning</h1>
              <p className="text-gray-500 text-lg">
                Day Learning platform, AI Engineer tracks, brand architects training
              </p>
              <p className="text-sm text-gray-400 mt-1">Lead: Babatunde</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/academy/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Enroll Trainee
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button onClick={() => setActiveTab("main")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "main" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-main">Overview</button>
        <button onClick={() => setActiveTab("deployed")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "deployed" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-deployed"><Rocket className="w-4 h-4" />My Tools</button>
        <button onClick={() => setActiveTab("build-history")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "build-history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-build-history"><History className="w-4 h-4" />Build History</button>
      </div>

      {activeTab === "build-history" ? (
        <BuildHistory unit="academy" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="academy" />
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
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTrainees}</p>
              <p className="text-sm text-gray-500">Total Trainees</p>
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
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTrainees}</p>
              <p className="text-sm text-gray-500">Currently Learning</p>
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
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.placedTrainees}</p>
              <p className="text-sm text-gray-500">Successfully Placed</p>
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
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
              <p className="text-sm text-gray-500">Avg Progress</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Learning Tracks */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Learning Tracks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LEARNING_TRACKS.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedTrack(selectedTrack === track.name ? "all" : track.name)}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedTrack === track.name ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200'
              }`}
              data-testid={`track-card-${track.id}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${track.color} flex items-center justify-center`}>
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{track.name}</h3>
                  <p className="text-sm text-gray-500">{track.duration}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{track.enrolled}</p>
                  <p className="text-xs text-gray-500">Enrolled</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{track.completed}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{track.modules}</p>
                  <p className="text-xs text-gray-500">Modules</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Agents */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">AI Agents ({AI_AGENTS.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AI_AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-amber-600 transition-colors">
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
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Academy Tools</h2>
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
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                      <span className="text-sm text-amber-600 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
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

      {/* Trainees Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Trainees {selectedTrack !== "all" && `(${selectedTrack})`}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setSelectedTrack("all")}>
            <Filter className="w-4 h-4 mr-2" />
            {selectedTrack === "all" ? "Filter by Track" : "Clear Filter"}
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trainee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Track</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mentor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Start Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrainees.map((trainee, index) => (
                <motion.tr
                  key={trainee.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 cursor-pointer"
                  data-testid={`trainee-row-${trainee.id}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-medium">
                        {trainee.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{trainee.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{trainee.track}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${trainee.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{trainee.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CONFIG[trainee.status].color}`}>
                      {STATUS_CONFIG[trainee.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{trainee.mentor}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{trainee.startDate}</span>
                  </td>
                </motion.tr>
              ))}
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

export default AcademyAndLearning;
