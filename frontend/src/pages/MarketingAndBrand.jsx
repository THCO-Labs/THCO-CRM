import { useState } from "react";
import IconBadge from "../components/ui/icon-badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Megaphone, 
  ArrowLeft, 
  ChevronRight,
  FileText,
  Linkedin,
  Mail,
  BookOpen,
  Calendar,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Plus,
  Filter,
  PenTool,
  Zap,
  History,
  Rocket
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import BuildHistory from "../components/BuildHistory";
import DeployedTools from "../components/flowforge/DeployedTools";

import { FLOWFORGE_ENABLED } from "../config/features";
// AI Agents for Marketing & Brand (from Agent Registry)
const AI_AGENTS = [
  {
    id: 6,
    name: "#6 Content Generation Agent",
    description: "Drafts: 20 blog articles, 130+ LinkedIn posts, 4 newsletters, PDF lead magnets monthly",
    icon: PenTool,
    priority: "critical",
    trigger: "Daily per content calendar",
    status: "coming_soon"
  },
  {
    id: 16,
    name: "#16 Social Media Scheduling Agent",
    description: "Schedules 130+ posts/month across 12 LinkedIn pages. Optimizes timing. Tracks engagement",
    icon: Linkedin,
    priority: "medium",
    trigger: "Approved content from #6",
    status: "coming_soon"
  },
  {
    id: 28,
    name: "#28 Newsletter & Lead Nurture Agent",
    description: "4 monthly newsletters: 2 client + 2 talent. Segments subscribers. Flags sales-ready leads",
    icon: Mail,
    priority: "low",
    trigger: "Monthly schedule",
    status: "coming_soon"
  }
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200"
};

// Content targets from Operating Cycle
const CONTENT_TARGETS = {
  articles: { target: 20, current: 14, label: "Articles/Month" },
  linkedinPosts: { target: 130, current: 98, label: "LinkedIn Posts/Month" },
  newsletters: { target: 4, current: 3, label: "Newsletters/Month" },
  caseStudies: { target: 2, current: 1, label: "Case Studies/Month" }
};

const TOOLS = [
  {
    name: "Content Calendar",
    slug: "content-calendar",
    icon: Calendar,
    description: "Plan and schedule content across all channels",
    gradient: "from-pink-500 to-rose-600",
    active: false
  },
  {
    name: "LinkedIn Scheduler",
    slug: "linkedin-scheduler",
    icon: Linkedin,
    description: "Schedule and track LinkedIn posts and engagement",
    gradient: "from-blue-500 to-indigo-600",
    active: false
  },
  {
    name: "Newsletter Manager",
    slug: "newsletter-manager",
    icon: Mail,
    description: "Create and send newsletters to subscribers",
    gradient: "from-emerald-500 to-teal-600",
    active: false
  },
  {
    name: "Case Study Builder",
    slug: "case-study-builder",
    icon: BookOpen,
    description: "Create compelling case studies from client success stories",
    gradient: "from-amber-500 to-orange-600",
    active: false
  }
];

// Sample content items
const RECENT_CONTENT = [
  {
    id: 1,
    title: "How AI is Transforming Talent Acquisition in Africa",
    type: "article",
    status: "published",
    date: "2026-02-15",
    views: 1240,
    engagement: 89
  },
  {
    id: 2,
    title: "THCO's 5 Pillars of Digital Transformation",
    type: "linkedin",
    status: "scheduled",
    date: "2026-02-18",
    views: 0,
    engagement: 0
  },
  {
    id: 3,
    title: "Q1 2026 Newsletter: Tech Trends & Insights",
    type: "newsletter",
    status: "draft",
    date: "2026-02-20",
    views: 0,
    engagement: 0
  },
  {
    id: 4,
    title: "Case Study: How TechNova Scaled Their Engineering Team",
    type: "case_study",
    status: "published",
    date: "2026-02-10",
    views: 856,
    engagement: 124
  },
  {
    id: 5,
    title: "The Future of Remote Work in Nigeria",
    type: "linkedin",
    status: "published",
    date: "2026-02-14",
    views: 2340,
    engagement: 156
  }
];

const CONTENT_TYPES = {
  article: { label: "Article", color: "bg-pink-100 text-pink-700", icon: FileText },
  linkedin: { label: "LinkedIn", color: "bg-blue-100 text-blue-700", icon: Linkedin },
  newsletter: { label: "Newsletter", color: "bg-emerald-100 text-emerald-700", icon: Mail },
  case_study: { label: "Case Study", color: "bg-amber-100 text-amber-700", icon: BookOpen }
};

const STATUS_CONFIG = {
  published: { label: "Published", color: "bg-green-100 text-green-700" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" }
};

const MarketingAndBrand = () => {
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("main");

  const filteredContent = selectedType === "all" 
    ? RECENT_CONTENT 
    : RECENT_CONTENT.filter(c => c.type === selectedType);

  return (
    <div className="space-y-8" data-testid="marketing-brand-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Marketing & Brand</BreadcrumbPage>
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
            <h1 className="font-display text-4xl text-gray-900 leading-tight">Marketing & Brand</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">Content engine: 20 articles, 130+ LinkedIn posts, 4 newsletters per month</p>
            <p className="text-xs text-gray-400 mt-2">Lead: Havilah</p>
          </div>
          <div className="flex gap-3">
            {/* FlowForge needs Supabase and n8n, neither configured here, so this

                returned 503 on every click. See config/features.js. */}

            {FLOWFORGE_ENABLED && (

              <Link to="/marketing/build/new">
              <Button className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] text-white hover:opacity-90 shadow-lg shadow-emerald-500/20" data-testid="build-new-tool-btn">
                <Zap className="w-4 h-4 mr-2" />
                Build New Tool
              </Button>
            </Link>

            )}
            <Button className="bg-pink-600 hover:bg-pink-700" disabled title="Not available yet">
              <Plus className="w-4 h-4 mr-2" />
              Create Content
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
        <BuildHistory unit="marketing" />
      ) : activeTab === "deployed" ? (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-2">Deployed Tools</h2>
          <p className="text-sm text-gray-500 mb-6">Tools you've built and approved that are now live in the automation engine.</p>
          <DeployedTools unit="marketing" />
        </div>
      ) : (
      <>
      {/* Content Targets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(CONTENT_TARGETS).map(([key, data], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl border border-[#EAE7E0] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{data.label}</span>
              <span className="text-xs text-pink-600 font-medium">
                {Math.round((data.current / data.target) * 100)}%
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-display text-3xl text-gray-900">{data.current}</span>
              <span className="text-sm text-gray-400 mb-1">/ {data.target}</span>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all"
                style={{ width: `${Math.min((data.current / data.target) * 100, 100)}%` }}
              />
            </div>
          </motion.div>
        ))}
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
                className="group bg-white rounded-xl border border-[#EAE7E0] p-4 hover:border-pink-300 hover:shadow-md transition-all"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={Icon} gradient="from-pink-500" size={40} />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-pink-600 transition-colors">
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
        <h2 className="lux-eyebrow mb-4">Marketing Tools</h2>
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
                    
                    <h3 className="font-display text-lg text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
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
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <IconBadge icon={Icon} accent="#8E8A82" size={48} />
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

      {/* Recent Content */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="lux-eyebrow">Recent Content</h2>
          <div className="flex items-center gap-2">
            {["all", "article", "linkedin", "newsletter", "case_study"].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedType === type 
                    ? 'bg-pink-100 text-pink-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid={`filter-${type}`}
              >
                {type === "all" ? "All" : CONTENT_TYPES[type]?.label || type}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EAE7E0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Content</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContent.map((content, index) => {
                const typeConfig = CONTENT_TYPES[content.type];
                const TypeIcon = typeConfig?.icon || FileText;
                return (
                  <motion.tr
                    key={content.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                    data-testid={`content-row-${content.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeConfig?.color}`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {content.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeConfig?.color}`}>
                        {typeConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CONFIG[content.status].color}`}>
                        {STATUS_CONFIG[content.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{content.date}</span>
                    </td>
                    <td className="px-4 py-3">
                      {content.views > 0 ? (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {content.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {content.engagement}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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

export default MarketingAndBrand;
