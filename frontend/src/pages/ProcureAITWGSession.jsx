import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import html2pdf from "html2pdf.js";
import { 
  Presentation,
  Server,
  FileText,
  Users,
  Shield,
  Database,
  Clock,
  ArrowRight,
  Download,
  ArrowLeft,
  Loader2,
  Globe,
  Zap,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Cloud,
  Settings,
  Calendar,
  Building2,
  Target,
  Layers,
  GitBranch,
  MessageSquare
} from "lucide-react";

// Color palette - IHS/Procure AI branding
const colors = {
  navy: "#1E2761",
  teal: "#0D9488",
  iceBlue: "#CADCFC",
  slate: "#0F172A",
  white: "#FFFFFF",
  lightGray: "#F8FAFC",
  green: "#059669",
  blue: "#2563EB",
  orange: "#EA580C",
  purple: "#7C3AED",
};

// Navigation items for the presentation
const NAV_ITEMS = [
  { id: "title", label: "Title", icon: Presentation },
  { id: "agenda", label: "Agenda", icon: FileText },
  { id: "overview", label: "Overview", icon: Target },
  { id: "transformation", label: "Transformation", icon: Zap },
  { id: "phases", label: "Phases", icon: Layers },
  { id: "architecture", label: "Architecture", icon: Server },
  { id: "d365", label: "D365 Integration", icon: Database },
  { id: "ai-security", label: "AI Security", icon: Shield },
  { id: "compliance", label: "Compliance", icon: Lock },
  { id: "governance", label: "Governance", icon: Building2 },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "risks", label: "Risks", icon: AlertTriangle },
  { id: "next-steps", label: "Next Steps", icon: ArrowRight },
  { id: "questions", label: "Questions", icon: MessageSquare },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } }
};

// Animated Section Wrapper
const AnimatedSection = ({ children, className = "", id, startVisible = false, style = {} }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={startVisible ? "visible" : "hidden"}
      animate={(isInView || startVisible) ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
      style={style}
    >
      {children}
    </motion.section>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, value, label, color = colors.teal }) => (
  <motion.div 
    variants={scaleIn}
    className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20"
  >
    <Icon className="w-8 h-8 mx-auto mb-3" style={{ color }} />
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-gray-300 text-sm">{label}</div>
  </motion.div>
);

// Phase Card Component
const PhaseCard = ({ phase, title, duration, modules, color, delay = 0 }) => (
  <motion.div
    variants={fadeInUp}
    className="bg-white rounded-xl shadow-xl overflow-hidden"
    style={{ borderTop: `4px solid ${color}` }}
  >
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: color }}>
          {phase}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{duration}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {modules.map((module, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle2 className="w-4 h-4" style={{ color }} />
            {module}
          </li>
        ))}
      </ul>
    </div>
  </motion.div>
);

// Integration Card Component
const IntegrationCard = ({ system, protocol, direction, purpose, status }) => (
  <motion.div
    variants={fadeInUp}
    className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow border-l-4"
    style={{ borderLeftColor: status === "Confirmed" ? colors.green : colors.orange }}
  >
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-semibold text-gray-900">{system}</h4>
      <span className={`text-xs px-2 py-1 rounded-full ${status === "Confirmed" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
        {status}
      </span>
    </div>
    <div className="text-sm text-gray-600 space-y-1">
      <p><span className="text-gray-400">Protocol:</span> {protocol}</p>
      <p><span className="text-gray-400">Direction:</span> {direction}</p>
      <p><span className="text-gray-400">Purpose:</span> {purpose}</p>
    </div>
  </motion.div>
);

const ProcureAITWGSession = () => {
  const [activeSection, setActiveSection] = useState("title");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef(null);
  const navigate = useNavigate();

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_ITEMS.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(NAV_ITEMS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const element = contentRef.current;
    
    const opt = {
      margin: 0.5,
      filename: 'ProcureAI-TWG-Session.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
    setIsGeneratingPdf(false);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-6" style={{ marginLeft: sidebarExpanded ? '240px' : '64px', transition: 'margin-left 0.3s' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.teal})` }}>
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <span className="text-gray-800 font-semibold text-sm">Technical Working Group Session</span>
              <span className="text-gray-400 text-xs ml-2">23 Feb 2026</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
          style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.green})` }}
          data-testid="download-btn"
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isGeneratingPdf ? "Generating..." : "Download PDF"}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 shadow-xl ${sidebarExpanded ? 'w-60' : 'w-16'}`}
        style={{ backgroundColor: colors.navy }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col h-full py-6">
          <div className="px-4 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.green})` }}>
              <span className="text-white font-bold">AI</span>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center gap-3 py-2.5 transition-all relative ${
                    activeSection === item.id ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  style={{ paddingLeft: sidebarExpanded ? '16px' : '18px' }}
                >
                  {activeSection === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ backgroundColor: colors.teal }} />
                  )}
                  <Icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'text-teal-400' : 'text-white/50'}`} />
                  {sidebarExpanded && (
                    <span className={`text-sm whitespace-nowrap ${activeSection === item.id ? 'text-white font-medium' : 'text-white/60'}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {sidebarExpanded && (
            <div className="px-4 pt-4 border-t border-white/10">
              <p className="text-white/60 text-xs font-medium">IHS Towers Nigeria</p>
              <p className="text-white/40 text-xs">CONFIDENTIAL</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main 
        ref={contentRef}
        className={`${sidebarExpanded ? 'ml-60' : 'ml-16'} pt-14 transition-all duration-300`}
      >
        {/* Section 1: Title Slide */}
        <AnimatedSection 
          id="title" 
          startVisible={true} 
          className="min-h-screen flex items-center justify-center relative overflow-hidden" 
          style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.slate} 100%)` }}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-20 w-72 h-72 rounded-full border border-teal-500/20 animate-pulse" />
            <div className="absolute bottom-32 right-32 w-96 h-96 rounded-full border border-teal-500/10" />
            <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-teal-500/5 blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
          </div>
          
          <div className="text-center z-10 px-8 max-w-4xl">
            <motion.div variants={fadeInUp} className="mb-8">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-6" 
                style={{ backgroundColor: 'rgba(13, 148, 136, 0.2)', color: colors.teal }}>
                Technical Working Group Session
              </span>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-6xl md:text-7xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Procure AI
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-xl md:text-2xl mb-4" style={{ color: colors.iceBlue }}>
              Procurement Transformation Programme
            </motion.p>
            
            <motion.p variants={fadeInUp} className="text-lg text-gray-400 mb-8">
              Introductory Technical Alignment & Architecture Walkthrough
            </motion.p>
            
            <motion.div variants={fadeInUp} className="w-24 h-1 mx-auto mb-8" style={{ background: `linear-gradient(90deg, ${colors.teal}, ${colors.green})` }} />
            
            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-6 text-gray-400">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                23 February 2026
              </span>
              <span>|</span>
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                IHS Towers Nigeria
              </span>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="mt-12">
              <button 
                onClick={() => scrollToSection('agenda')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all hover:gap-4"
                style={{ backgroundColor: colors.teal }}
              >
                View Agenda
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Section 2: Agenda */}
        <AnimatedSection id="agenda" className="min-h-screen py-24 px-8 md:px-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.teal}15`, color: colors.teal }}>
                Session Structure
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Session Agenda</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">Technical alignment session - structured for working group validation</p>
            </motion.div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { num: "01", title: "Technical Proposal & Implementation", duration: "20 min", desc: "What Procure AI does, phased delivery, key capabilities", icon: Target },
                { num: "02", title: "Solution Architecture & Integration", duration: "25 min", desc: "Azure microservices, D365 OData, ServiceNow, Data Lake", icon: Server },
                { num: "03", title: "AI Data Sovereignty & LLM Hosting", duration: "15 min", desc: "Azure OpenAI vs on-premise, data isolation model", icon: Shield },
                { num: "04", title: "Platform Security & Compliance", duration: "15 min", desc: "Encryption, auth, pen testing, NDPR, audit logging", icon: Lock },
                { num: "05", title: "Data Governance & Boundaries", duration: "10 min", desc: "Data flows, residency, access control, classification", icon: Database },
                { num: "06", title: "Infrastructure Requirements", duration: "15 min", desc: "Azure resources, environments, APIs, provisioning", icon: Cloud },
                { num: "07", title: "Delivery Methodology & Timeline", duration: "15 min", desc: "Agile sprints, 13-month roadmap, dependencies", icon: Calendar },
                { num: "08", title: "Governance & Next Steps", duration: "10 min", desc: "RACI, cadences, risks, immediate actions", icon: ArrowRight },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="flex gap-4 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                  onClick={() => scrollToSection(NAV_ITEMS[i + 2]?.id || 'overview')}
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform"
                      style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.teal})` }}>
                      {item.num}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.duration}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Section 3: What is Procure AI */}
        <AnimatedSection id="overview" className="min-h-screen py-24 px-8 md:px-16" style={{ backgroundColor: colors.lightGray }}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.teal}15`, color: colors.teal }}>
                Introduction
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">What is Procure AI?</h2>
              <p className="text-xl text-gray-600">AI-powered end-to-end procurement automation for IHS Towers</p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-6 mb-16">
              <StatCard icon={Clock} value="67%" label="Cycle Reduction" color={colors.green} />
              <StatCard icon={Globe} value="Global" label="Vendor Discovery" color={colors.blue} />
              <StatCard icon={BarChart3} value="Real-time" label="Analytics & Insights" color={colors.purple} />
              <StatCard icon={Shield} value="Automated" label="Compliance Scoring" color={colors.orange} />
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <motion.h3 variants={fadeInUp} className="text-xl font-bold text-gray-900 mb-6 text-center">
                Key Capabilities
              </motion.h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: Zap, title: "AI-Powered Automation", desc: "End-to-end procurement workflow automation with intelligent decision support" },
                  { icon: Globe, title: "Global Vendor Discovery", desc: "Integration with Alibaba, D&B, Global Sources for worldwide sourcing" },
                  { icon: BarChart3, title: "Real-time Analytics", desc: "Live dashboards, spend analytics, and forecasting capabilities" },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeInUp} className="text-center p-6">
                    <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" 
                      style={{ background: `linear-gradient(135deg, ${colors.teal}20, ${colors.green}20)` }}>
                      <item.icon className="w-7 h-7" style={{ color: colors.teal }} />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Section 4: Current vs Future State */}
        <AnimatedSection id="transformation" className="min-h-screen py-24 px-8 md:px-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.orange}15`, color: colors.orange }}>
                Transformation
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Current State vs Future State</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Current State */}
              <motion.div variants={fadeInLeft} className="rounded-2xl p-8" style={{ backgroundColor: '#FEF2F2' }}>
                <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  Current State
                </h3>
                <ul className="space-y-4">
                  {[
                    "Manual Excel-based procurement across all categories",
                    "45-day average purchase cycle from request to PO",
                    "Limited to established local vendor networks",
                    "No real-time spend visibility or analytics",
                    "Manual vendor due diligence and compliance tracking",
                    "No structured asset recovery or disposal process"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-red-700">
                      <span className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Future State */}
              <motion.div variants={fadeInRight} className="rounded-2xl p-8" style={{ backgroundColor: '#F0FDF4' }}>
                <h3 className="text-xl font-bold text-green-800 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  Future State (Procure AI)
                </h3>
                <ul className="space-y-4">
                  {[
                    "AI-powered end-to-end procurement automation",
                    "15-day procurement cycles (67% reduction)",
                    "Global vendor discovery (Alibaba, D&B, Global Sources)",
                    "Real-time dashboards, spend analytics, forecasting",
                    "Automated compliance scoring and risk monitoring",
                    "Competitive reverse auctions for asset disposal"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-green-700">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>

        {/* Section 5: Phased Capability Model */}
        <AnimatedSection id="phases" className="min-h-screen py-24 px-8 md:px-16" style={{ backgroundColor: colors.lightGray }}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.purple}15`, color: colors.purple }}>
                Implementation Roadmap
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Phased Capability Model</h2>
              <p className="text-gray-500">13-month delivery across three strategic phases</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              <PhaseCard
                phase="1"
                title="Foundation & Core"
                duration="Feb - May 2026 (4 months)"
                color={colors.teal}
                modules={[
                  "Vendor Portal + Interface",
                  "Due Diligence & Risk Monitor",
                  "AI Overview Bot",
                  "Reverse Auction Portal"
                ]}
              />
              <PhaseCard
                phase="2"
                title="RFx Workflows"
                duration="Jun - Oct 2026 (5 months)"
                color={colors.blue}
                modules={[
                  "RFx Creation + Source Vendor",
                  "Scope Validation",
                  "Review & Rank",
                  "BAFO & Award + Templates"
                ]}
              />
              <PhaseCard
                phase="3"
                title="Intelligence Suite"
                duration="Nov 2026 - Feb 2027 (4 months)"
                color={colors.purple}
                modules={[
                  "Forecasting + Category Mgmt",
                  "Cost/TCO + Risk Reporting",
                  "Settings + Exception Handling",
                  "Audit + Performance"
                ]}
              />
            </div>
          </div>
        </AnimatedSection>

        {/* Section 6: Solution Architecture */}
        <AnimatedSection id="architecture" className="min-h-screen py-24 px-8 md:px-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.navy}15`, color: colors.navy }}>
                Technical Architecture
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Solution Architecture</h2>
              <p className="text-gray-500">Azure-native microservices with D365 deep integration</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
              <div className="grid md:grid-cols-3 gap-8">
                {/* IHS Systems */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">IHS Systems</h4>
                  <div className="space-y-3">
                    {["D365 Finance & Ops", "ServiceNow", "Azure Data Lake", "Azure AD / Entra ID"].map((sys, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg">
                        <Database className="w-5 h-5 text-teal-400" />
                        <span className="text-sm">{sys}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Procure AI Platform */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Procure AI Platform</h4>
                  <div className="space-y-3">
                    {["Procurement Service", "Vendor Service", "AI/ML Service", "Analytics Service", "Auction Service", "Contract Service"].map((svc, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 bg-teal-500/20 rounded-lg border border-teal-500/30">
                        <Layers className="w-4 h-4 text-teal-400" />
                        <span className="text-sm">{svc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* External Integrations */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">External APIs</h4>
                  <div className="space-y-3">
                    {["Alibaba", "Global Sources", "D&B", "NAVEX", "Docusign", "Redcube"].map((api, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">{api}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-center gap-3 text-center">
                  <div className="px-4 py-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <Zap className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <span className="text-xs">Azure OpenAI GPT-4</span>
                  </div>
                  <span className="text-gray-500">powers</span>
                  <div className="flex gap-2">
                    {["Vendor Scoring", "Bid Evaluation", "Document Analysis", "NL Queries"].map((use, i) => (
                      <span key={i} className="px-3 py-1 text-xs bg-white/10 rounded-full">{use}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Section 7: D365 Integration */}
        <AnimatedSection id="d365" className="min-h-screen py-24 px-8 md:px-16" style={{ backgroundColor: colors.lightGray }}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                Integration Model
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">D365 Integration</h2>
              <p className="text-gray-500">OData API integration with bidirectional data sync</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <motion.div variants={fadeInLeft} className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-6">Integration Approach</h3>
                <div className="space-y-4">
                  {[
                    { label: "Protocol", value: "OData v4 REST API over HTTPS" },
                    { label: "Authentication", value: "OAuth 2.0 via Azure AD / Entra ID" },
                    { label: "Direction", value: "Bidirectional (read + write)" },
                    { label: "Sync Pattern", value: "Near real-time event-driven + scheduled batch" },
                    { label: "Error Handling", value: "Retry with exponential backoff, dead letter queue" },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="font-medium text-gray-900 text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeInRight} className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-6">D365 Entities Accessed</h3>
                <div className="space-y-3">
                  {[
                    { entity: "Vendor Master", direction: "Read + Write", freq: "Real-time" },
                    { entity: "Purchase Orders", direction: "Read + Write", freq: "Real-time" },
                    { entity: "Product Categories", direction: "Read", freq: "Daily batch" },
                    { entity: "Item Catalog", direction: "Read", freq: "Daily batch" },
                    { entity: "Financial Dimensions", direction: "Read", freq: "Weekly" },
                    { entity: "Approval Workflows", direction: "Read", freq: "On-demand" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-800 text-sm">{item.entity}</span>
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{item.direction}</span>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">{item.freq}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp}>
              <h3 className="font-bold text-gray-900 mb-6 text-center">Other System Integrations</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <IntegrationCard system="ServiceNow" protocol="REST API" direction="Read-only" purpose="Exception tickets, incident management" status="Confirmed" />
                <IntegrationCard system="Azure Data Lake" protocol="Azure SDK" direction="Read-only" purpose="Historical data for AI training" status="Confirmed" />
                <IntegrationCard system="Azure AD" protocol="OAuth 2.0 / OIDC" direction="Read" purpose="SSO, RBAC, user provisioning" status="Confirmed" />
                <IntegrationCard system="Alibaba / Global Sources" protocol="REST API" direction="Outbound" purpose="Vendor discovery (search queries)" status="Phase 2" />
                <IntegrationCard system="D&B / NAVEX" protocol="REST API" direction="Outbound" purpose="Vendor due diligence, compliance" status="Phase 1" />
                <IntegrationCard system="Docusign" protocol="REST API" direction="Bidirectional" purpose="Contract signing workflows" status="Phase 1" />
              </div>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Section 8: AI Data Sovereignty */}
        <AnimatedSection id="ai-security" className="min-h-screen py-24 px-8 md:px-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.green}15`, color: colors.green }}>
                AI Security
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">AI Data Sovereignty & Security</h2>
              <p className="text-gray-500">How IHS data is protected across all AI components</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Option A - Recommended */}
              <motion.div variants={fadeInLeft} className="bg-gradient-to-br from-teal-50 to-green-50 rounded-2xl p-8 border-2 border-teal-200 relative">
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-teal-500 text-white text-xs font-medium rounded-full">RECOMMENDED</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 mt-2">Option A: Azure OpenAI</h3>
                <p className="text-sm text-gray-500 mb-6">Enterprise-grade AI within your Azure tenant</p>
                
                <ul className="space-y-3 mb-6">
                  {[
                    "Model runs inside IHS's own Azure subscription",
                    "OpenAI the company never sees IHS data",
                    "Microsoft enterprise data agreements apply",
                    "SOC 2, ISO 27001 compliance built in",
                    "IHS chooses Azure region for data residency",
                    "Full GPT-4 capability for all AI functions"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="bg-white rounded-lg p-4 border border-teal-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Estimated Cost</span>
                    <span className="font-bold text-teal-700">~$2-5K/month</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">On existing Azure billing</p>
                </div>
              </motion.div>

              {/* Option B */}
              <motion.div variants={fadeInRight} className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Option B: On-Premise Open-Source</h3>
                <p className="text-sm text-gray-500 mb-6">Full air-gap possible with physical control</p>
                
                <ul className="space-y-3 mb-6">
                  {[
                    "Model runs on physical hardware IHS controls",
                    "Zero external connectivity (full air-gap possible)",
                    "Uses open-source models (LLaMA, Mistral, Phi)",
                    "IHS owns everything: hardware, model, data",
                    "Total physical control and sovereignty",
                    "Lower AI capability vs enterprise models"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Estimated Cost</span>
                    <span className="font-bold text-gray-700">$15-30K hardware</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">+ ongoing maintenance</p>
                </div>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="mt-8 p-6 bg-teal-50 rounded-xl border border-teal-200">
              <p className="text-center text-teal-800">
                <strong>Recommendation:</strong> Option A. IHS is already on Azure. Data stays in your tenant. OpenAI never sees it. Enterprise-grade AI with zero infrastructure overhead.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Section 9: Security & Compliance */}
        <AnimatedSection id="compliance" className="min-h-screen py-24 px-8 md:px-16" style={{ backgroundColor: colors.slate }}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: colors.teal }}>
                Enterprise Security
              </span>
              <h2 className="text-4xl font-bold text-white mb-4">Platform Security & Compliance</h2>
              <p className="text-gray-400">Enterprise-grade security across every layer</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Encryption",
                  icon: Lock,
                  items: ["TLS 1.2+ on all API calls", "AES-256 encryption at rest", "Azure Key Vault management"]
                },
                {
                  title: "Authentication",
                  icon: Shield,
                  items: ["SSO via Azure AD / Entra ID", "OAuth 2.0 + OpenID Connect", "MFA + IP whitelisting"]
                },
                {
                  title: "Audit & Logging",
                  icon: FileText,
                  items: ["Full audit trail on every action", "Azure Monitor + Log Analytics", "SIEM integration ready"]
                },
                {
                  title: "Penetration Testing",
                  icon: Target,
                  items: ["Pre-launch pen test", "OWASP Top 10 compliance", "Remediation SLAs"]
                },
                {
                  title: "Compliance Standards",
                  icon: CheckCircle2,
                  items: ["SOC 2 Type II", "ISO 27001", "NDPR & GDPR aligned"]
                },
                {
                  title: "Network Security",
                  icon: Server,
                  items: ["Azure VNet isolation", "Private endpoints", "WAF + DDoS Protection"]
                }
              ].map((section, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                >
                  <section.icon className="w-8 h-8 text-teal-400 mb-4" />
                  <h3 className="font-bold text-white mb-4">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-teal-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Section 10: Governance */}
        <AnimatedSection id="governance" className="min-h-screen py-24 px-8 md:px-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.navy}15`, color: colors.navy }}>
                Project Governance
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Governance & Reporting</h2>
              <p className="text-gray-500">Structured oversight with clear accountability</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <motion.div variants={fadeInLeft} className="bg-gray-50 rounded-2xl p-8">
                <h3 className="font-bold text-gray-900 mb-6">Governance Structure</h3>
                <div className="space-y-4">
                  {[
                    { name: "Steering Committee", freq: "Monthly", attendees: "Exec Sponsor, Project Director, IT Lead" },
                    { name: "Project Status Review", freq: "Weekly", attendees: "PM, IT Lead, Business Analysts" },
                    { name: "Sprint Demo", freq: "Bi-weekly", attendees: "Full team + stakeholders" },
                    { name: "Technical Review", freq: "Weekly", attendees: "Solution Architect, Developers, IHS IT" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.attendees}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{item.freq}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeInRight} className="bg-gray-50 rounded-2xl p-8">
                <h3 className="font-bold text-gray-900 mb-6">RACI Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Activity</th>
                        <th className="pb-2">TN Mac</th>
                        <th className="pb-2">IHS IT</th>
                        <th className="pb-2">IHS Proc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { activity: "Platform development", tn: "R/A", it: "C", proc: "I" },
                        { activity: "D365 integration", tn: "R", it: "A/C", proc: "C" },
                        { activity: "Data migration", tn: "R", it: "R", proc: "A" },
                        { activity: "UAT & go-live sign-off", tn: "R", it: "C", proc: "R/A" },
                        { activity: "Change management", tn: "C", it: "C", proc: "R/A" },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td className="py-2 text-gray-800">{row.activity}</td>
                          <td className="py-2"><span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">{row.tn}</span></td>
                          <td className="py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{row.it}</span></td>
                          <td className="py-2"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">{row.proc}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-4">R = Responsible | A = Accountable | C = Consulted | I = Informed</p>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>

        {/* Section 11: Timeline */}
        <AnimatedSection id="timeline" className="min-h-screen py-24 px-8 md:px-16" style={{ backgroundColor: colors.lightGray }}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                Delivery Timeline
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">13-Month Execution Roadmap</h2>
              <p className="text-gray-500">Agile sprints within a phased delivery framework</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-xl p-8 overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Timeline Header */}
                <div className="flex items-center mb-8">
                  <div className="w-32 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-13 gap-1 text-center text-xs text-gray-500">
                    {["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"].map((m, i) => (
                      <div key={i}>{m}</div>
                    ))}
                  </div>
                </div>

                {/* Phase 1 */}
                <div className="flex items-center mb-4">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-900">Phase 1</span>
                    <p className="text-xs text-gray-500">Foundation</p>
                  </div>
                  <div className="flex-1 grid grid-cols-13 gap-1">
                    {[1,1,1,1,0,0,0,0,0,0,0,0,0].map((active, i) => (
                      <div key={i} className={`h-8 rounded ${active ? 'bg-teal-500' : 'bg-gray-100'}`} />
                    ))}
                  </div>
                </div>

                {/* Phase 2 */}
                <div className="flex items-center mb-4">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-900">Phase 2</span>
                    <p className="text-xs text-gray-500">RFx Workflows</p>
                  </div>
                  <div className="flex-1 grid grid-cols-13 gap-1">
                    {[0,0,0,0,1,1,1,1,1,0,0,0,0].map((active, i) => (
                      <div key={i} className={`h-8 rounded ${active ? 'bg-blue-500' : 'bg-gray-100'}`} />
                    ))}
                  </div>
                </div>

                {/* Phase 3 */}
                <div className="flex items-center">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-900">Phase 3</span>
                    <p className="text-xs text-gray-500">Intelligence</p>
                  </div>
                  <div className="flex-1 grid grid-cols-13 gap-1">
                    {[0,0,0,0,0,0,0,0,0,1,1,1,1].map((active, i) => (
                      <div key={i} className={`h-8 rounded ${active ? 'bg-emerald-500' : 'bg-gray-100'}`} />
                    ))}
                  </div>
                </div>

                {/* Milestones */}
                <div className="flex items-center mt-6 pt-6 border-t">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-xs text-gray-500">Milestones</span>
                  </div>
                  <div className="flex-1 grid grid-cols-13 gap-1">
                    {[0,0,0,1,0,0,0,0,1,0,0,0,1].map((milestone, i) => (
                      <div key={i} className="flex justify-center">
                        {milestone ? <div className="w-3 h-3 rounded-full bg-orange-500" /> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4 mt-8">
              {[
                { label: "Phase 1 Go-Live", date: "May 2026", desc: "Vendor Portal, AI Bot, Reverse Auction" },
                { label: "Phase 2 Go-Live", date: "Oct 2026", desc: "Full RFx Workflows" },
                { label: "Project Go-Live", date: "Feb 2027", desc: "Intelligence Suite, Audit, Settings" }
              ].map((ms, i) => (
                <motion.div key={i} variants={fadeInUp} className="bg-white rounded-xl p-4 shadow-md text-center">
                  <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-2" />
                  <h4 className="font-semibold text-gray-900">{ms.label}</h4>
                  <p className="text-sm text-orange-600 font-medium">{ms.date}</p>
                  <p className="text-xs text-gray-500 mt-1">{ms.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Section 12: Risk Register */}
        <AnimatedSection id="risks" className="min-h-screen py-24 px-8 md:px-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.orange}15`, color: colors.orange }}>
                Risk Management
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Programme Risk Register</h2>
              <p className="text-gray-500">Proactive risk identification with clear ownership</p>
            </motion.div>

            <div className="grid gap-4">
              {[
                { id: "R1", risk: "D365 integration complexity", level: "Med-High", mitigation: "Early POC in Month 1, dedicated integration specialist", owner: "TN Mac" },
                { id: "R2", risk: "Delayed IHS environment access", level: "Med-High", mitigation: "Parallel dev env, early dependency tracking", owner: "IHS IT" },
                { id: "R3", risk: "Scope creep from new requirements", level: "High-Med", mitigation: "Formal change control, weekly scope reviews", owner: "Joint" },
                { id: "R4", risk: "Key resource unavailability", level: "Low-High", mitigation: "Cross-training, documentation, backup resources", owner: "TN Mac" },
                { id: "R5", risk: "Data migration quality issues", level: "Med-Med", mitigation: "Data profiling, validation scripts, cleansing", owner: "Joint" },
                { id: "R6", risk: "User adoption resistance", level: "Med-Med", mitigation: "Early engagement, training, change champions", owner: "IHS" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="flex items-center gap-6 p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center font-bold text-gray-700">
                    {item.id}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{item.risk}</h4>
                    <p className="text-sm text-gray-500">{item.mitigation}</p>
                  </div>
                  <div className="text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.level.includes('High') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.level}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{item.owner}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Section 13: Next Steps */}
        <AnimatedSection id="next-steps" className="min-h-screen py-24 px-8 md:px-16" style={{ backgroundColor: colors.teal }}>
          <div className="max-w-4xl mx-auto text-center">
            <motion.div variants={fadeInUp} className="mb-12">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4 bg-white/20 text-white">
                Actions Required
              </span>
              <h2 className="text-4xl font-bold text-white mb-4">Next Steps</h2>
              <p className="text-teal-100">Actions required to proceed with 1 March 2026 mobilisation</p>
            </motion.div>

            <div className="space-y-4 text-left">
              {[
                { num: "01", action: "IHS IT to provision Azure subscription and VPN access", timing: "Week 1 (by 28 Feb)", owner: "IHS IT Infrastructure" },
                { num: "02", action: "Register Procure AI app in Azure AD, grant OData API access", timing: "Week 2", owner: "IHS Enterprise Architecture" },
                { num: "03", action: "Confirm LLM hosting decision (Azure OpenAI recommended)", timing: "By Tuesday CIO meeting", owner: "IHS Information Security" },
                { num: "04", action: "Share remaining flowcharts and raw data files", timing: "Week 1", owner: "IHS Procurement" },
                { num: "05", action: "Schedule weekly technical sync", timing: "This week", owner: "Joint" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="flex items-start gap-4 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-teal-600 flex-shrink-0">
                    {item.num}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">{item.action}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-teal-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timing}
                      </span>
                      <span className="text-teal-300">{item.owner}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Section 14: Questions */}
        <AnimatedSection id="questions" className="min-h-screen py-24 px-8 md:px-16 bg-white">
          <div className="max-w-4xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4" 
                style={{ backgroundColor: `${colors.navy}15`, color: colors.navy }}>
                Open Discussion
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Questions for the Working Group</h2>
              <p className="text-gray-500">Understanding your environment to build to your standards from Day 1</p>
            </motion.div>

            <div className="space-y-6">
              {[
                { num: "01", question: "What Azure regions does IHS currently use?", context: "Determines where Procure AI deploys and where all data resides.", owner: "IT Infrastructure" },
                { num: "02", question: "Do you have an API gateway standard (e.g. Azure API Management)?", context: "We route all integrations through an API hub. If IHS has a standard, we align to it.", owner: "Enterprise Architecture" },
                { num: "03", question: "What is your D365 Finance & Operations version and environment setup?", context: "OData API capabilities differ between versions. Need to understand dev/staging/prod setup.", owner: "Enterprise Architecture" },
                { num: "04", question: "What is your security assessment process for new applications?", context: "We want to build your security requirements into development from Day 1.", owner: "Information Security" },
                { num: "05", question: "Does IHS have an existing policy on AI and Large Language Models?", context: "Directly affects our LLM hosting recommendation.", owner: "InfoSec / Governance" },
                { num: "06", question: "What governance framework does IHS follow (COBIT, ITIL, custom)?", context: "We align delivery reporting to your existing framework.", owner: "Governance / PMO" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: colors.navy }}>
                      {item.num}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">{item.question}</h4>
                      <p className="text-sm text-gray-500 mb-2">{item.context}</p>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{item.owner}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp} className="mt-12 p-6 bg-gray-100 rounded-xl text-center">
              <p className="text-gray-600">
                We don't need all answers today. Understanding your environment early means we build to your standards from Day 1 — not retrofit later.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Footer */}
        <footer className="py-12 px-8 bg-slate-900 text-center">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="max-w-2xl mx-auto"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Thank You</h3>
            <p className="text-gray-400 mb-6">
              Technical Working Group Session — 23 February 2026
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>IHS Towers Nigeria</span>
              <span>|</span>
              <span>TN Macaulay</span>
              <span>|</span>
              <span className="text-teal-400">CONFIDENTIAL</span>
            </div>
          </motion.div>
        </footer>
      </main>
    </div>
  );
};

export default ProcureAITWGSession;
