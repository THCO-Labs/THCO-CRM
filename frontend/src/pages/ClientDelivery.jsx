import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Truck, 
  ArrowLeft, 
  ChevronRight,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BarChart3,
  Plus,
  Filter,
  Search,
  Zap,
  History,
  Rocket
} from 'lucide-react';
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";

const TOOLS = [
  {
    name: "Deployed Staff Manager",
    slug: "deployed-staff",
    icon: Users,
    description: "Track staff deployed at client sites and their assignments",
    gradient: "from-pink-500 to-rose-600",
    active: true
  },
  {
    name: "SLA Tracker",
    slug: "sla-tracker",
    icon: Clock,
    description: "Monitor service level agreements and performance metrics",
    gradient: "from-blue-500 to-indigo-600",
    active: true
  },
  {
    name: "Client Site Dashboard",
    slug: "client-sites",
    icon: Building2,
    description: "Overview of all active client engagement sites",
    gradient: "from-emerald-500 to-teal-600",
    active: false
  },
  {
    name: "Performance Reports",
    slug: "performance-reports",
    icon: BarChart3,
    description: "Generate delivery performance and satisfaction reports",
    gradient: "from-amber-500 to-orange-600",
    active: false
  }
];

// Sample deployed staff
const SAMPLE_DEPLOYED_STAFF = [
  {
    id: 1,
    name: "David Okonkwo",
    role: "Senior Developer",
    client: "TechNova Solutions",
    startDate: "2025-10-01",
    endDate: "2026-04-01",
    status: "active",
    slaScore: 98
  },
  {
    id: 2,
    name: "Grace Adeyemi",
    role: "Data Analyst",
    client: "FinBank Nigeria",
    startDate: "2025-11-15",
    endDate: "2026-05-15",
    status: "active",
    slaScore: 95
  },
  {
    id: 3,
    name: "Samuel Eze",
    role: "DevOps Engineer",
    client: "RetailMax Ltd",
    startDate: "2025-09-01",
    endDate: "2026-02-28",
    status: "ending_soon",
    slaScore: 97
  },
  {
    id: 4,
    name: "Amina Bello",
    role: "UX Designer",
    client: "EduFirst Academy",
    startDate: "2026-01-15",
    endDate: "2026-07-15",
    status: "active",
    slaScore: 100
  },
  {
    id: 5,
    name: "Peter Nnamdi",
    role: "Backend Developer",
    client: "ConsultCorp",
    startDate: "2025-08-01",
    endDate: "2026-01-31",
    status: "completed",
    slaScore: 94
  }
];

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  ending_soon: { label: "Ending Soon", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
  issue: { label: "Issue", color: "bg-red-100 text-red-700", icon: AlertCircle }
};

const ClientDelivery = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("main");

  const filteredStaff = SAMPLE_DEPLOYED_STAFF.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          staff.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || staff.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalDeployed: SAMPLE_DEPLOYED_STAFF.length,
    activeDeployments: SAMPLE_DEPLOYED_STAFF.filter(s => s.status === "active").length,
    avgSlaScore: Math.round(SAMPLE_DEPLOYED_STAFF.reduce((sum, s) => sum + s.slaScore, 0) / SAMPLE_DEPLOYED_STAFF.length),
    endingSoon: SAMPLE_DEPLOYED_STAFF.filter(s => s.status === "ending_soon").length
  };

  const getSlaColor = (score) => {
    if (score >= 95) return "text-green-600";
    if (score >= 85) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-8" data-testid="client-delivery-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Client Delivery</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Unit Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Delivery</h1>
              <p className="text-gray-500 text-lg">
                Managed services, SLA tracking, deployed staff at client sites
              </p>
              <p className="text-sm text-gray-400 mt-1">Lead: Isaiah</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/client-delivery/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>
            <Button className="bg-pink-600 hover:bg-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              New Deployment
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
        <BuildHistory unit="client-delivery" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="client-delivery" />
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
            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDeployed}</p>
              <p className="text-sm text-gray-500">Total Deployed</p>
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
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDeployments}</p>
              <p className="text-sm text-gray-500">Active</p>
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
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgSlaScore}%</p>
              <p className="text-sm text-gray-500">Avg SLA Score</p>
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
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.endingSoon}</p>
              <p className="text-sm text-gray-500">Ending Soon</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Delivery Tools</h2>
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
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                      <span className="text-sm text-pink-600 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
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

      {/* Deployed Staff Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Deployed Staff</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search staff or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-56"
                data-testid="staff-search"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              data-testid="status-filter"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="ending_soon">Ending Soon</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SLA Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff, index) => {
                const statusConfig = STATUS_CONFIG[staff.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <motion.tr
                    key={staff.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    data-testid={`staff-row-${staff.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-medium">
                          {staff.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{staff.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{staff.client}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        <p>{staff.startDate}</p>
                        <p className="text-gray-400">to {staff.endDate}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${getSlaColor(staff.slaScore)}`}>
                        {staff.slaScore}%
                      </span>
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

export default ClientDelivery;
