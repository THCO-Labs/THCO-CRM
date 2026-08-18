import { useState } from "react";
import IconBadge from "../components/ui/icon-badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Wrench, 
  ArrowLeft, 
  ChevronRight,
  Bot,
  Mail,
  Globe,
  Shield,
  Server,
  Database,
  Code,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Zap,
  Plus,
  History,
  Rocket
} from 'lucide-react';
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";
import { Button } from "../components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";

import { FLOWFORGE_ENABLED } from "../config/features";
// The 22 AI Agents from Operating Cycle - now showing IT-specific agents
const AI_AGENTS = [
  {
    id: 13,
    name: "#13 Tool Health Monitor Agent",
    department: "IT & Tools",
    description: "Monitors email deliverability, domain reputation, bounce rates, API quotas 24/7",
    priority: "high",
    trigger: "Continuous monitoring",
    status: "coming_soon"
  },
  {
    id: 37,
    name: "#37 Security & Compliance Agent",
    department: "IT & Tools",
    description: "Multi-jurisdiction compliance (GDPR, NDPR, PIPEDA). Data exposure alerts. Audit docs",
    priority: "low",
    trigger: "Continuous + quarterly",
    status: "coming_soon"
  }
];

// All 37 agents for overview display
const ALL_AGENTS = [
  { id: 1, name: "Lead Research Agent", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 2, name: "Email Outreach Agent", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 3, name: "Inbox Management Agent", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 4, name: "Candidate Sourcing Agent", department: "Recruiting", status: "active", lastRun: "2 min ago" },
  { id: 5, name: "Spec-to-Tasks Agent", department: "Technology", status: "coming_soon", lastRun: "—" },
  { id: 6, name: "Content Generation Agent", department: "Marketing", status: "coming_soon", lastRun: "—" },
  { id: 7, name: "Client Reactivation Intel", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 8, name: "Intake Call Processing", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 9, name: "Follow-Up & Cadence", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 10, name: "Candidate Screening", department: "Recruiting", status: "coming_soon", lastRun: "—" },
  { id: 11, name: "Candidate Outreach", department: "Recruiting", status: "coming_soon", lastRun: "—" },
  { id: 12, name: "MVP/Proposal Generator", department: "Technology", status: "coming_soon", lastRun: "—" },
  { id: 13, name: "Tool Health Monitor", department: "IT & Tools", status: "coming_soon", lastRun: "—" },
  { id: 14, name: "Meeting Prep Agent", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 15, name: "Project Management", department: "Operations", status: "coming_soon", lastRun: "—" },
  { id: 16, name: "Social Media Scheduling", department: "Marketing", status: "coming_soon", lastRun: "—" },
  { id: 17, name: "Client Reporting", department: "Recruiting", status: "coming_soon", lastRun: "—" },
  { id: 18, name: "Project Status Tracker", department: "Technology", status: "coming_soon", lastRun: "—" },
  { id: 19, name: "Workforce Assessment", department: "Advisory", status: "coming_soon", lastRun: "—" },
  { id: 20, name: "HR Policy Generator", department: "Advisory", status: "coming_soon", lastRun: "—" },
  { id: 21, name: "Research & Analysis", department: "Advisory", status: "coming_soon", lastRun: "—" },
  { id: 22, name: "Applicant Screening", department: "Academy", status: "coming_soon", lastRun: "—" },
  { id: 23, name: "Document Automation", department: "Operations", status: "coming_soon", lastRun: "—" },
  { id: 24, name: "Performance Tracking", department: "Operations", status: "coming_soon", lastRun: "—" },
  { id: 25, name: "Knowledge Capture", department: "Insights", status: "coming_soon", lastRun: "—" },
  { id: 26, name: "Curriculum & Learning", department: "Academy", status: "coming_soon", lastRun: "—" },
  { id: 27, name: "Code Review & Mentoring", department: "Academy", status: "coming_soon", lastRun: "—" },
  { id: 28, name: "Newsletter & Nurture", department: "Marketing", status: "coming_soon", lastRun: "—" },
  { id: 29, name: "Internal HR & People Ops", department: "THCO HR", status: "coming_soon", lastRun: "—" },
  { id: 30, name: "CRM & Pipeline Intel", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 31, name: "Competitive Intelligence", department: "Sales", status: "coming_soon", lastRun: "—" },
  { id: 32, name: "Client Onboarding", department: "Operations", status: "coming_soon", lastRun: "—" },
  { id: 33, name: "Invoicing & Collections", department: "Operations", status: "coming_soon", lastRun: "—" },
  { id: 34, name: "QA & Testing", department: "Technology", status: "coming_soon", lastRun: "—" },
  { id: 35, name: "Scope Creep Detection", department: "Technology", status: "coming_soon", lastRun: "—" },
  { id: 36, name: "Timesheet & Utilization", department: "Operations", status: "coming_soon", lastRun: "—" },
  { id: 37, name: "Security & Compliance", department: "IT & Tools", status: "coming_soon", lastRun: "—" },
];

const TOOLS = [
  {
    name: "AI Agents Hub",
    slug: "ai-agents",
    icon: Bot,
    description: "Monitor and manage all 22 AI agents across departments",
    gradient: "from-emerald-500 to-emerald-600",
    active: false,
    stats: { total: 22, active: 9, idle: 13 }
  },
  {
    name: "Email Warming",
    slug: "email-warming",
    icon: Mail,
    description: "Outbound email warming and domain health management",
    gradient: "from-blue-500 to-cyan-600",
    active: false,
    stats: { domains: 5, warmingRate: "85%" }
  },
  {
    name: "Domain Manager",
    slug: "domain-manager",
    icon: Globe,
    description: "Manage outbound domains and DNS configuration",
    gradient: "from-emerald-500 to-teal-600",
    active: false,
    stats: null
  },
  {
    name: "Security & Access",
    slug: "security",
    icon: Shield,
    description: "User permissions, device locking, and audit logs",
    gradient: "from-red-500 to-rose-600",
    active: false,
    stats: null
  }
];

const STATUS_CONFIG = {
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Active" },
  coming_soon: { color: "bg-amber-100 text-amber-700", icon: Clock, label: "Coming Soon" },
  error: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Error" },
  warning: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Warning" }
};

const ITAndTools = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState("main");

  const activeAgents = ALL_AGENTS.filter(a => a.status === "active").length;
  const comingSoonAgents = ALL_AGENTS.filter(a => a.status === "coming_soon").length;

  return (
    <div className="space-y-8" data-testid="it-tools-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">IT & THCO Tools</BreadcrumbPage>
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
            <h1 className="font-display text-4xl text-gray-900 leading-tight">IT & THCO Tools</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">IT infrastructure, AI agents, outbound tooling, and system management</p>
            <p className="text-xs text-gray-400 mt-2">Lead: Emmanuel</p>
          </div>
          <div className="flex gap-3">
            {/* FlowForge needs Supabase and n8n, neither configured here, so this

                returned 503 on every click. See config/features.js. */}

            {FLOWFORGE_ENABLED && (

              <Link to="/it-tools/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>

            )}
            <Button className="bg-orange-600 hover:bg-orange-700" disabled title="Not available yet">
              <Plus className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>
        <div className="lux-divider mt-8" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button onClick={() => setActiveTab("main")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "main" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-main">Overview</button>
        <button onClick={() => setActiveTab("deployed")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "deployed" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-deployed"><Rocket className="w-4 h-4" />My Tools</button>
        <button onClick={() => setActiveTab("build-history")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "build-history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-build-history"><History className="w-4 h-4" />Build History</button>
      </div>

      {activeTab === "build-history" ? (
        <BuildHistory unit="it-tools" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-2">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="it-tools" />
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
              <Bot className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">{ALL_AGENTS.length}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Total AI Agents</p>
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
              <Activity className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">{activeAgents}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Active Agents</p>
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
              <p className="font-display text-[26px] leading-none text-gray-900">{comingSoonAgents}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Coming Soon</p>
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
              <Server className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">99.9%</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">System Uptime</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="lux-eyebrow mb-4">Available Tools</h2>
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
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <IconBadge icon={Icon} gradient={tool.gradient} size={48} />
                      <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                    
                    <h3 className="font-display text-lg text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {tool.description}
                    </p>
                    
                    {tool.stats && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        {tool.stats.total && <span>{tool.stats.total} agents</span>}
                        {tool.stats.active && <span className="text-green-600">{tool.stats.active} active</span>}
                        {tool.stats.domains && <span>{tool.stats.domains} domains</span>}
                        {tool.stats.warmingRate && <span className="text-blue-600">{tool.stats.warmingRate} health</span>}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                      <span className="text-sm text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
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
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <IconBadge icon={Icon} accent="#8E8A82" size={48} />
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

      {/* AI Agents Overview */}
      <div>
        <h2 className="lux-eyebrow mb-4">All 37 AI Agents Registry</h2>
        <div className="bg-white rounded-2xl border border-[#EAE7E0] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Agent Hub ({ALL_AGENTS.length} agents)</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" /> {activeAgents} Active
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="w-3 h-3" /> {comingSoonAgents} Coming Soon
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {ALL_AGENTS.map((agent, index) => {
              const statusConfig = STATUS_CONFIG[agent.status];
              const StatusIcon = statusConfig.icon;
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                  data-testid={`agent-${agent.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{agent.id} {agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
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

export default ITAndTools;
