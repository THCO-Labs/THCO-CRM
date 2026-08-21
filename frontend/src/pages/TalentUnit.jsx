import { useState } from "react";
import IconBadge, { accentFromClass } from "../components/ui/icon-badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Search, Database, Mail, Calendar, GitBranch, ChevronRight, ArrowLeft, Bot, UserCheck, Send, FileText, Zap, History, Rocket, FolderOpen, Globe, Upload, Wand2 } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";

import { FLOWFORGE_ENABLED } from "../config/features";
// AI Agents for Recruiting (from Agent Registry)
const AI_AGENTS = [
  {
    id: 4,
    name: "#4 Candidate Sourcing Agent",
    description: "Searches LinkedIn, GitHub, job boards. Ranked longlist of 20-50 candidates per role",
    icon: Search,
    priority: "critical",
    trigger: "New role from Amalina",
    status: "active"
  },
  {
    id: 10,
    name: "#10 Candidate Screening Agent",
    description: "Deep screens longlist → shortlist of 5-10 with scores, red flags, interview Qs",
    icon: UserCheck,
    priority: "high",
    trigger: "Longlist from #4",
    status: "coming_soon"
  },
  {
    id: 11,
    name: "#11 Candidate Outreach Agent",
    description: "Personalized outreach via email + LinkedIn. Response tracking + interview scheduling",
    icon: Send,
    priority: "high",
    trigger: "Shortlist from #10",
    status: "coming_soon"
  },
  {
    id: 17,
    name: "#17 Client Reporting Agent",
    description: "Weekly client reports: candidates sourced, screened, shortlisted, pipeline viz",
    icon: FileText,
    priority: "medium",
    trigger: "Weekly schedule",
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
    name: "Discover Candidates (Web)",
    slug: "external-sourcing",
    icon: Globe,
    path: "/talent/sourcing/external",
    active: true,
    description: "Search Google via SerpAPI for real candidates on LinkedIn, GitHub, and the web. Results save automatically to your Talent Network.",
    gradient: "from-[#1FB58A] to-emerald-600"
  },
  {
    name: "Network (External DB)",
    slug: "network",
    icon: Users,
    path: "/talent/network",
    active: true,
    description: "Browse all discovered external candidates. Filter by skills, location, seniority. Enrich with AI.",
    gradient: "from-purple-500 to-indigo-600"
  },
  {
    name: "Find Talent (Both DBs)",
    slug: "find",
    icon: Wand2,
    path: "/talent/find",
    active: true,
    description: "Search across internal CV database and external Talent Network. No web search — databases only.",
    gradient: "from-blue-500 to-cyan-600"
  },
  {
    name: "Internal CV Database",
    slug: "candidates",
    icon: Database,
    path: "/talent/candidates",
    active: true,
    description: "Your uploaded CVs and imported candidates. Upload, search by skills, track status.",
    gradient: "from-emerald-500 to-green-600"
  },
  {
    name: "Upload CVs",
    slug: "cv-upload",
    icon: Upload,
    path: "/talent/candidates/upload",
    active: true,
    description: "Upload resumes or import from Google Drive. Auto-parses skills, experience, and contact info.",
    gradient: "from-purple-500 to-indigo-600"
  },
  {
    name: "AI Sourcing Strategy",
    slug: "sourcing",
    icon: Search,
    path: "/talent/sourcing",
    active: true,
    description: "Generate Boolean search packs for LinkedIn, Google X-Ray, and GitHub.",
    gradient: "from-amber-500 to-orange-600"
  },
  {
    name: "Database Search (Legacy)",
    slug: "database-search",
    icon: Search,
    path: "/talent/database-search",
    active: true,
    description: "Legacy database search tool.",
    gradient: "from-gray-400 to-gray-500"
  },
];

const TalentUnit = () => {
  const [activeTab, setActiveTab] = useState("tools");
  
  return (
    <div className="space-y-8" data-testid="talent-unit-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Talent & Delivery</BreadcrumbPage>
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
            <h1 className="font-display text-4xl text-gray-900 leading-tight">Talent & Delivery</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">AI-powered recruiting, sourcing, and talent operations</p>
          </div>
          {/* Build New Tool Button */}
          {/* FlowForge needs Supabase and n8n, neither configured here, so this

              returned 503 on every click. See config/features.js. */}

          {FLOWFORGE_ENABLED && (

            <Link to="/talent/build/new">
            <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
              <Zap className="w-4 h-4 mr-2" />
              Build New Tool
            </Button>
          </Link>

          )}
        </div>
        <div className="lux-divider mt-8" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("tools")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "tools" 
              ? "bg-white text-gray-900 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          data-testid="tab-tools"
        >
          Tools
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
          to="/talent/projects"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-gray-500 hover:text-gray-700"
          data-testid="tab-project-fulfillment"
        >
          <FolderOpen className="w-4 h-4" />
          Project Fulfillment
        </Link>
      </div>

      {/* Tab Content */}
      {activeTab === "tools" ? (
        <>

      {/* Tools Grid */}
      <div>
        <h2 className="thco-section-label mb-4">Available Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            
            if (tool.active) {
              return (
                <Link
                  key={tool.slug}
                  to={tool.path}
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
                    
                    <h3 className="font-display text-lg text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">
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
                </Link>
              );
            }
            
            return (
              <div
                key={tool.slug}
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
                    <span className="text-sm text-gray-400">
                      Under development
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
                className={`group bg-white rounded-xl border p-4 transition-all ${
                  agent.status === 'active' 
                    ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <IconBadge
                      icon={Icon}
                      accent={agent.status === 'active' ? accentFromClass('bg-emerald-500') : '#9CA3AF'}
                      size={40}
                    />
                    <div>
                      <h3 className={`font-semibold text-sm ${
                        agent.status === 'active' 
                          ? 'text-gray-900 group-hover:text-emerald-600' 
                          : 'text-gray-700'
                      } transition-colors`}>
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
                  {agent.status === 'active' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      COMING SOON
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Back to Dashboard */}
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        data-testid="back-to-dashboard-link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
        </>
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-2">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="talent" />
        </div>
      ) : (
        <div>
          <BuildHistory unit="talent" />
        </div>
      )}

      {/* Back to Dashboard - Always visible */}
      {(activeTab === "build-history" || activeTab === "deployed") && (
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
          data-testid="back-to-dashboard-link"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      )}
    </div>
  );
};

export default TalentUnit;
