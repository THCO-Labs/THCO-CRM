import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Building2, 
  ArrowLeft, 
  ChevronRight,
  Receipt,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Plus,
  Filter,
  Search,
  Download,
  LayoutDashboard,
  UserCheck,
  ClipboardList,
  Timer,
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
// AI Agents for Operations & Finance (from Agent Registry)
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
    id: 23,
    name: "#23 Document & Proposal Automation",
    description: "Generates proposals, MSAs, SOWs, invoices, NDAs from templates. Pre-populates all details",
    icon: FileText,
    priority: "medium",
    trigger: "Intake form / milestone event",
    status: "coming_soon"
  },
  {
    id: 24,
    name: "#24 Performance Tracking Agent",
    description: "Revenue per person, utilization, satisfaction, completion rates. Monthly reports",
    icon: TrendingUp,
    priority: "low",
    trigger: "Monthly schedule",
    status: "coming_soon"
  },
  {
    id: 32,
    name: "#32 Client Onboarding & Kickoff Agent",
    description: "Contract → kickoff in 48hrs. Checklists, access provisioning, welcome packets",
    icon: UserCheck,
    priority: "high",
    trigger: "Contract signed",
    status: "coming_soon"
  },
  {
    id: 33,
    name: "#33 Invoicing & Collections Agent",
    description: "Milestone-triggered invoicing, payment reminders (7/14/30 days), AR dashboard",
    icon: Receipt,
    priority: "high",
    trigger: "Milestone completed",
    status: "coming_soon"
  },
  {
    id: 36,
    name: "#36 Timesheet & Utilization Agent",
    description: "Auto-captures hours from PM tools, calendar, git. Utilization rates, project cost analysis",
    icon: Timer,
    priority: "medium",
    trigger: "Passive continuous",
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
    name: "Invoice Tracker",
    slug: "invoice-tracker",
    icon: Receipt,
    description: "Track invoices, payment status, and milestones (managed by Victoria)",
    gradient: "from-red-500 to-rose-600",
    active: false
  },
  {
    name: "Contract Manager",
    slug: "contract-manager",
    icon: FileText,
    description: "Manage client contracts, renewals, and terms",
    gradient: "from-blue-500 to-indigo-600",
    active: false
  },
  {
    name: "Financial Dashboard",
    slug: "financial-dashboard",
    icon: TrendingUp,
    description: "Revenue tracking, forecasting, and financial reports",
    gradient: "from-emerald-500 to-teal-600",
    active: false
  },
  {
    name: "Expense Management",
    slug: "expense-management",
    icon: DollarSign,
    description: "Track and approve team expenses and reimbursements",
    gradient: "from-amber-500 to-orange-600",
    active: false
  }
];

// Sample invoices
const SAMPLE_INVOICES = [
  {
    id: "INV-2026-001",
    client: "TechNova Solutions",
    project: "Platform Enhancement",
    amount: 45000,
    status: "paid",
    dueDate: "2026-02-01",
    paidDate: "2026-01-28",
    milestone: "Phase 1 Complete"
  },
  {
    id: "INV-2026-002",
    client: "FinBank Nigeria",
    project: "Talent Acquisition",
    amount: 32000,
    status: "pending",
    dueDate: "2026-02-28",
    paidDate: null,
    milestone: "Initial Placement"
  },
  {
    id: "INV-2026-003",
    client: "RetailMax Ltd",
    project: "CRM Integration",
    amount: 28000,
    status: "overdue",
    dueDate: "2026-02-10",
    paidDate: null,
    milestone: "Milestone 2"
  },
  {
    id: "INV-2026-004",
    client: "EduFirst Academy",
    project: "Training Program",
    amount: 18000,
    status: "draft",
    dueDate: "2026-03-15",
    paidDate: null,
    milestone: "Course Development"
  },
  {
    id: "INV-2026-005",
    client: "ConsultCorp",
    project: "HR Assessment",
    amount: 25000,
    status: "paid",
    dueDate: "2026-02-05",
    paidDate: "2026-02-03",
    milestone: "Final Delivery"
  }
];

const INVOICE_STATUSES = {
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: FileText }
};

const OperationsAndFinance = () => {
  const [invoices, setInvoices] = useState(SAMPLE_INVOICES);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("main");

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    paidAmount: invoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + inv.amount, 0),
    pendingAmount: invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0),
    overdueCount: invoices.filter(i => i.status === "overdue").length
  };

  return (
    <div className="space-y-8" data-testid="operations-finance-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Operations & Finance</BreadcrumbPage>
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
            <h1 className="font-display text-4xl text-gray-900 leading-tight">Operations & Finance</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">Invoicing, contracts, financial tracking, and office administration</p>
            <p className="text-xs text-gray-400 mt-2">Lead: Victoria</p>
          </div>
          <div className="flex gap-3">
            {/* FlowForge needs Supabase and n8n, neither configured here, so this

                returned 503 on every click. See config/features.js. */}

            {FLOWFORGE_ENABLED && (

              <Link to="/operations/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>

            )}
            <Button className="bg-red-600 hover:bg-red-700" disabled title="Not available yet">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
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
        <BuildHistory unit="operations" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-2">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="operations" />
        </div>
      ) : (
      <>
      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#EAE7E0] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Total Revenue</p>
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
              <CheckCircle2 className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">${(stats.paidAmount / 1000).toFixed(0)}K</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Collected</p>
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
              <p className="font-display text-[26px] leading-none text-gray-900">${(stats.pendingAmount / 1000).toFixed(0)}K</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Outstanding</p>
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
              <AlertCircle className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">{stats.overdueCount}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Overdue</p>
            </div>
          </div>
        </motion.div>
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
                className="group bg-white rounded-xl border border-[#EAE7E0] p-4 hover:border-red-300 hover:shadow-md transition-all"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-red-600 transition-colors">
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
        <h2 className="lux-eyebrow mb-4">Finance Tools</h2>
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
                    
                    <h3 className="font-display text-lg text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                      <span className="text-sm text-red-600 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
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

      {/* Invoice Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="lux-eyebrow">Recent Invoices</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
                data-testid="invoice-search"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              data-testid="status-filter"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
            </select>
            <Button variant="outline" size="sm" disabled title="Not available yet">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EAE7E0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice, index) => {
                const statusConfig = INVOICE_STATUSES[invoice.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                    data-testid={`invoice-row-${invoice.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-gray-900">{invoice.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{invoice.client}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-700">{invoice.project}</p>
                        <p className="text-xs text-gray-400">{invoice.milestone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        ${invoice.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{invoice.dueDate}</span>
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

export default OperationsAndFinance;
