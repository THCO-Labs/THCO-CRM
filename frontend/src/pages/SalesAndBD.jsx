import { useState } from "react";
import IconBadge from "../components/ui/icon-badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  ArrowLeft, 
  ChevronRight,
  Globe,
  Mail,
  Users,
  RefreshCw,
  Target,
  Phone,
  MessageSquare,
  BarChart3,
  Building2,
  Plus,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  Send,
  Inbox,
  Calendar,
  Swords,
  Database,
  Mic,
  Repeat,
  Zap,
  History,
  Rocket
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { toast } from "sonner";
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";

import { FLOWFORGE_ENABLED } from "../config/features";
// The 4 Intake Paths from THCO Operating Cycle
const INTAKE_PATHS = [
  {
    id: "outbound",
    name: "Outbound",
    icon: Globe,
    description: "AI agents research → Emmanuel warms → Rebecca closes",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    leads: 45,
    conversion: "12%"
  },
  {
    id: "inbound",
    name: "Inbound",
    icon: Mail,
    description: "Marketing content → 'Speak with us' form → Qualification",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    leads: 28,
    conversion: "18%"
  },
  {
    id: "referrals",
    name: "Referrals",
    icon: Users,
    description: "Happy clients tell others → Direct introductions",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    leads: 15,
    conversion: "35%"
  },
  {
    id: "reactivation",
    name: "Reactivation",
    icon: RefreshCw,
    description: "320 existing clients → Cross-sell opportunities",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    leads: 32,
    conversion: "22%"
  }
];

// The 5 Pillars
const PILLARS = ["Technology", "Talent", "Advisory", "Academy", "Operate"];

// Sample leads data
const SAMPLE_LEADS = [
  {
    id: "lead_001",
    company: "TechNova Solutions",
    contact: "Sarah Johnson",
    email: "sarah@technova.com",
    intakePath: "inbound",
    pillar: "Technology",
    status: "qualified",
    value: "$75,000",
    lastContact: "2026-02-15",
    assignedTo: "Rebecca"
  },
  {
    id: "lead_002",
    company: "FinBank Nigeria",
    contact: "Adebayo Okonkwo",
    email: "adebayo@finbank.ng",
    intakePath: "referrals",
    pillar: "Talent",
    status: "proposal",
    value: "$120,000",
    lastContact: "2026-02-14",
    assignedTo: "Christiana"
  },
  {
    id: "lead_003",
    company: "RetailMax Ltd",
    contact: "James Chen",
    email: "j.chen@retailmax.com",
    intakePath: "outbound",
    pillar: "Technology",
    status: "contacted",
    value: "$45,000",
    lastContact: "2026-02-13",
    assignedTo: "Emmanuel"
  },
  {
    id: "lead_004",
    company: "EduFirst Academy",
    contact: "Maria Santos",
    email: "maria@edufirst.edu",
    intakePath: "reactivation",
    pillar: "Academy",
    status: "new",
    value: "$30,000",
    lastContact: "2026-02-12",
    assignedTo: null
  },
  {
    id: "lead_005",
    company: "ConsultCorp",
    contact: "David Williams",
    email: "d.williams@consultcorp.com",
    intakePath: "inbound",
    pillar: "Advisory",
    status: "won",
    value: "$95,000",
    lastContact: "2026-02-10",
    assignedTo: "Rebecca"
  }
];

// AI Agents for Sales & BD (from Agent Registry)
const AI_AGENTS = [
  {
    id: 1,
    name: "#1 Lead Research Agent",
    description: "Daily prospect list (10-25 qualified leads) from LinkedIn, news, job boards",
    icon: Search,
    priority: "critical",
    trigger: "Daily schedule",
    status: "coming_soon"
  },
  {
    id: 2,
    name: "#2 Email Outreach Agent",
    description: "Personalized cold email sequences (50-100+/day). Multi-step campaigns",
    icon: Send,
    priority: "critical",
    trigger: "New prospects from #1",
    status: "coming_soon"
  },
  {
    id: 3,
    name: "#3 Inbox Management Agent",
    description: "Categorizes replies: Hot/Warm/Not Now/Not Interested. Instant alerts on hot leads",
    icon: Inbox,
    priority: "critical",
    trigger: "Real-time email monitoring",
    status: "coming_soon"
  },
  {
    id: 7,
    name: "#7 Client Reactivation Intel Agent",
    description: "Researches 320 clients for cross-sell. Generates tailored value guides",
    icon: RefreshCw,
    priority: "critical",
    trigger: "Weekly batch",
    status: "coming_soon"
  },
  {
    id: 8,
    name: "#8 Intake Call Processing Agent",
    description: "Transcribes calls, extracts structured Intake Brief: client, needs, budget, timeline",
    icon: Mic,
    priority: "critical",
    trigger: "Recording uploaded",
    status: "coming_soon"
  },
  {
    id: 9,
    name: "#9 Follow-Up & Cadence Agent",
    description: "Multi-step follow-up sequences. Re-engages after 30/60/90 days",
    icon: Repeat,
    priority: "high",
    trigger: "Prospect status from #3",
    status: "coming_soon"
  },
  {
    id: 14,
    name: "#14 Meeting Prep Agent",
    description: "24hrs before meeting: company overview, pain points, competitive context, pricing",
    icon: Calendar,
    priority: "high",
    trigger: "Calendar event",
    status: "coming_soon"
  },
  {
    id: 30,
    name: "#30 CRM & Pipeline Intelligence Agent",
    description: "Auto-logs, deduplicates, enriches leads. Pipeline analytics, stale deal alerts",
    icon: Database,
    priority: "critical",
    trigger: "Any lead event",
    status: "coming_soon"
  },
  {
    id: 31,
    name: "#31 Competitive Intelligence Agent",
    description: "Monitors competitor pricing, positioning, wins/losses. Per-meeting briefs",
    icon: Swords,
    priority: "high",
    trigger: "Weekly scan + pre-meeting",
    status: "coming_soon"
  }
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200"
};

const LEAD_STATUSES = {
  new: { label: "New", color: "bg-gray-100 text-gray-700", icon: Clock },
  contacted: { label: "Contacted", color: "bg-blue-100 text-blue-700", icon: Phone },
  qualified: { label: "Qualified", color: "bg-emerald-100 text-emerald-700", icon: Target },
  proposal: { label: "Proposal Sent", color: "bg-amber-100 text-amber-700", icon: MessageSquare },
  won: { label: "Won", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  lost: { label: "Lost", color: "bg-red-100 text-red-700", icon: AlertCircle }
};

const SalesAndBD = () => {
  const [leads, setLeads] = useState(SAMPLE_LEADS);
  const [selectedPath, setSelectedPath] = useState("all");
  const [selectedPillar, setSelectedPillar] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("main");

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPath = selectedPath === "all" || lead.intakePath === selectedPath;
    const matchesPillar = selectedPillar === "all" || lead.pillar === selectedPillar;
    return matchesSearch && matchesPath && matchesPillar;
  });

  const totalLeads = INTAKE_PATHS.reduce((sum, path) => sum + path.leads, 0);
  const totalValue = leads.reduce((sum, lead) => {
    const value = parseInt(lead.value.replace(/[$,]/g, ''));
    return sum + value;
  }, 0);

  return (
    <div className="space-y-8" data-testid="sales-bd-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Sales & Business Development</BreadcrumbPage>
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
            <h1 className="font-display text-4xl text-gray-900 leading-tight">Sales & Business Development</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">Lead management across 4 intake paths and 5 pillars</p>
            <p className="text-xs text-gray-400 mt-2">Lead: Rebecca</p>
          </div>
          <div className="flex gap-3">
            {/* FlowForge needs Supabase and n8n, neither configured here, so this

                returned 503 on every click. See config/features.js. */}

            {FLOWFORGE_ENABLED && (

              <Link to="/sales/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>

            )}
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled title="Not available yet">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
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
        <BuildHistory unit="sales" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-2">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="sales" />
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
              <p className="font-display text-[26px] leading-none text-gray-900">{totalLeads}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Active Leads</p>
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
              <BarChart3 className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">${(totalValue / 1000).toFixed(0)}K</p>
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
              <Users className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">320</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Existing Clients</p>
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
              <p className="font-display text-[26px] leading-none text-gray-900">21%</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Avg Conversion</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 4 Intake Paths */}
      <div>
        <h2 className="lux-eyebrow mb-4">The 4 Intake Paths</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {INTAKE_PATHS.map((path, index) => {
            const Icon = path.icon;
            return (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedPath(selectedPath === path.id ? "all" : path.id)}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                  selectedPath === path.id ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200'
                }`}
                data-testid={`intake-path-${path.id}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <IconBadge icon={Icon} gradient={path.color} size={40} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{path.name}</h3>
                    <p className="text-xs text-gray-500">{path.leads} leads</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">{path.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${path.bgColor} ${path.textColor}`}>
                    {path.conversion} conversion
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Agents */}
      <div>
        <h2 className="lux-eyebrow mb-4">AI Agents ({AI_AGENTS.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <IconBadge icon={Icon} gradient="from-emerald-500" size={40} />
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

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="lead-search-input"
          />
        </div>
        <Select value={selectedPillar} onValueChange={setSelectedPillar}>
          <SelectTrigger className="w-40" data-testid="pillar-filter">
            <SelectValue placeholder="Pillar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {PILLARS.map(pillar => (
              <SelectItem key={pillar} value={pillar}>{pillar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setSelectedPath("all"); setSelectedPillar("all"); setSearchTerm(""); }}>
          <Filter className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-[#EAE7E0] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Lead Pipeline</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Intake Path</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pillar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.map((lead, index) => {
              const pathInfo = INTAKE_PATHS.find(p => p.id === lead.intakePath);
              const StatusIcon = LEAD_STATUSES[lead.status].icon;
              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                  data-testid={`lead-row-${lead.id}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{lead.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900">{lead.contact}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${pathInfo?.bgColor} ${pathInfo?.textColor}`}>
                      {pathInfo?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {lead.pillar}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${LEAD_STATUSES[lead.status].color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {LEAD_STATUSES[lead.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">{lead.value}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{lead.assignedTo || "—"}</span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No leads found matching your filters
          </div>
        )}
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

export default SalesAndBD;
