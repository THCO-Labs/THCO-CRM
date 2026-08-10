import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  ArrowLeft, 
  ChevronRight,
  FileText,
  Calculator,
  Users,
  Target,
  ClipboardList,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Search,
  UserSearch,
  BookText,
  FlaskConical,
  Zap,
  History,
  Rocket
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";

import { FLOWFORGE_ENABLED } from "../config/features";
// AI Agents for Advisory & Consulting (from Agent Registry)
const AI_AGENTS = [
  {
    id: 19,
    name: "#19 Workforce Assessment Agent",
    description: "Org data → skills heat map, bench strength, org health score. Recommendations summary",
    icon: UserSearch,
    priority: "medium",
    trigger: "New advisory project",
    status: "coming_soon"
  },
  {
    id: 20,
    name: "#20 HR Policy Generator Agent",
    description: "Generates jurisdiction-compliant HR policies from templates. Pre-populates client specifics",
    icon: BookText,
    priority: "medium",
    trigger: "Policy request / new client",
    status: "coming_soon"
  },
  {
    id: 21,
    name: "#21 Research & Analysis Agent",
    description: "Deep research: market sizing, competitive analysis, industry benchmarks. Cited reports",
    icon: FlaskConical,
    priority: "medium",
    trigger: "Research request",
    status: "coming_soon"
  }
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200"
};

// Pricing approval gates from Operating Cycle
const PRICING_GATES = [
  {
    range: "Under $30K",
    approvers: "Christiana + Rebecca",
    process: "Direct pricing",
    color: "bg-green-100 text-green-700"
  },
  {
    range: "$30K - $75K",
    approvers: "Ayo (async)",
    process: "Async approval",
    color: "bg-amber-100 text-amber-700"
  },
  {
    range: "Over $75K",
    approvers: "Ayo joins call",
    process: "Live discussion",
    color: "bg-red-100 text-red-700"
  }
];

const TOOLS = [
  {
    name: "Scoping Tool",
    slug: "scoping-tool",
    icon: ClipboardList,
    description: "Define project scope, requirements, and deliverables",
    gradient: "from-blue-500 to-indigo-600",
    active: false
  },
  {
    name: "Proposal Generator",
    slug: "proposal-generator",
    icon: FileText,
    description: "AI-powered proposal creation based on scoping",
    gradient: "from-emerald-500 to-emerald-600",
    active: false
  },
  {
    name: "Pricing Calculator",
    slug: "pricing-calculator",
    icon: Calculator,
    description: "Calculate project pricing with approval workflows",
    gradient: "from-emerald-500 to-teal-600",
    active: false
  },
  {
    name: "Workforce Assessment",
    slug: "workforce-assessment",
    icon: Users,
    description: "HR consulting and organizational assessment tools",
    gradient: "from-amber-500 to-orange-600",
    active: false
  }
];

// Sample engagements
const SAMPLE_ENGAGEMENTS = [
  {
    id: "ENG-001",
    client: "TechNova Solutions",
    type: "HR Consulting",
    value: 45000,
    status: "scoping",
    advisor: "Christiana",
    createdAt: "2026-02-15"
  },
  {
    id: "ENG-002",
    client: "FinBank Nigeria",
    type: "Workforce Planning",
    value: 85000,
    status: "proposal",
    advisor: "Christiana",
    createdAt: "2026-02-12"
  },
  {
    id: "ENG-003",
    client: "RetailMax Ltd",
    type: "Org Assessment",
    value: 28000,
    status: "approved",
    advisor: "Rebecca",
    createdAt: "2026-02-10"
  },
  {
    id: "ENG-004",
    client: "EduFirst Academy",
    type: "HR Advisory",
    value: 35000,
    status: "scoping",
    advisor: "Christiana",
    createdAt: "2026-02-08"
  }
];

const STATUS_CONFIG = {
  scoping: { label: "Scoping", color: "bg-blue-100 text-blue-700" },
  proposal: { label: "Proposal", color: "bg-emerald-100 text-emerald-700" },
  pending_approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" }
};

const AdvisoryAndConsulting = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("main");

  const filteredEngagements = SAMPLE_ENGAGEMENTS.filter(eng => 
    eng.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eng.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalEngagements: SAMPLE_ENGAGEMENTS.length,
    totalValue: SAMPLE_ENGAGEMENTS.reduce((sum, e) => sum + e.value, 0),
    inScoping: SAMPLE_ENGAGEMENTS.filter(e => e.status === "scoping").length,
    approved: SAMPLE_ENGAGEMENTS.filter(e => e.status === "approved").length
  };

  return (
    <div className="space-y-8" data-testid="advisory-consulting-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Advisory & Consulting</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Unit Header */}
      {/* Header in the dashboard's voice: an eyebrow, a display-face title
          and quiet supporting text, rather than a coloured tile and a bold
          sans heading. */}
      <div className="pt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="lux-eyebrow mb-3">Business Unit</p>
            <h1 className="font-display text-4xl text-gray-900 leading-tight">Advisory & Consulting</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">Client advisory, scoping, HR consulting, workforce assessments</p>
            <p className="text-xs text-gray-400 mt-2">Lead: Christiana</p>
          </div>
          <div className="flex gap-3">
            {/* FlowForge needs Supabase and n8n, neither configured here, so this

                returned 503 on every click. See config/features.js. */}

            {FLOWFORGE_ENABLED && (

              <Link to="/advisory/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>

            )}
            <Button className="bg-blue-600 hover:bg-blue-700" disabled title="Not available yet">
              <Plus className="w-4 h-4 mr-2" />
              New Engagement
            </Button>
          </div>
        </div>
        <div className="lux-divider mt-8" />
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
      </div>

      {activeTab === "build-history" ? (
        <BuildHistory unit="advisory" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-2">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="advisory" />
        </div>
      ) : (
      <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#EAE7E0] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">{stats.totalEngagements}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Engagements</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-[#EAE7E0] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">${(stats.totalValue / 1000).toFixed(0)}K</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Pipeline Value</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-[#EAE7E0] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">{stats.inScoping}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">In Scoping</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-[#EAE7E0] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">{stats.approved}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Approved</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pricing Approval Gates */}
      <div>
        <h2 className="lux-eyebrow mb-4">Pricing Approval Gates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_GATES.map((gate, index) => (
            <motion.div
              key={gate.range}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-[#EAE7E0] p-5"
            >
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${gate.color}`}>
                {gate.range}
              </span>
              <p className="text-lg font-semibold text-gray-900 mt-3">{gate.approvers}</p>
              <p className="text-sm text-gray-500">{gate.process}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Agents */}
      <div>
        <h2 className="lux-eyebrow mb-4">AI Agents ({AI_AGENTS.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AI_AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white rounded-xl border border-[#EAE7E0] p-4 hover:border-blue-300 hover:shadow-md transition-all"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
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
        <h2 className="lux-eyebrow mb-4">Advisory Tools</h2>
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
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-lg transition-all duration-300"
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
                    
                    <h3 className="font-display text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                      <span className="text-sm text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
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
                  
                  <h3 className="font-display text-lg text-gray-700 mb-2">{tool.name}</h3>
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

      {/* Engagements Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="lux-eyebrow">Active Engagements</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search engagements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="engagement-search"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EAE7E0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Advisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEngagements.map((engagement, index) => (
                <motion.tr
                  key={engagement.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                  data-testid={`engagement-row-${engagement.id}`}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium text-gray-900">{engagement.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{engagement.client}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{engagement.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">
                      ${engagement.value.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CONFIG[engagement.status].color}`}>
                      {STATUS_CONFIG[engagement.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{engagement.advisor}</span>
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

export default AdvisoryAndConsulting;
