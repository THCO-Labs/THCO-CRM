import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import html2pdf from "html2pdf.js";
import { 
  Presentation,
  Server,
  FileText,
  Users,
  Gavel,
  Database,
  Upload,
  ArrowRight,
  Download,
  ArrowLeft,
  Loader2,
  Globe,
  Zap,
  BarChart3,
  Package,
  AlertCircle
} from "lucide-react";

// Color palette
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
};

// Navigation items
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Presentation },
  { id: "architecture", label: "Architecture", icon: Server },
  { id: "rfq-flow", label: "RFQ Flow", icon: FileText },
  { id: "vendor-onboarding", label: "Vendor Onboarding", icon: Users },
  { id: "reverse-auction", label: "Reverse Auction", icon: Gavel },
  { id: "database", label: "Database", icon: Database },
  { id: "data-upload", label: "Data Upload", icon: Upload },
  { id: "next-steps", label: "Next Steps", icon: ArrowRight },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};

// Animated Section Wrapper
const AnimatedSection = ({ children, className = "", id, startVisible = false, style = {} }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
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

const ProcureAIScrollPresentation = () => {
  const [activeSection, setActiveSection] = useState("overview");
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
      filename: 'Procure-AI-Scroll-Presentation.pdf',
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
      <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4" style={{ marginLeft: sidebarExpanded ? '220px' : '60px', transition: 'margin-left 0.3s' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors mr-2"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-gray-300">|</span>
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: colors.teal }}>
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-gray-700 font-medium text-sm">Procure AI | Scroll Presentation</span>
        </div>
        
        {/* Download Button */}
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70"
          style={{ backgroundColor: colors.teal }}
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
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ${sidebarExpanded ? 'w-56' : 'w-16'}`}
        style={{ backgroundColor: colors.navy }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col h-full py-6">
          <div className="px-4 mb-8">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: colors.teal }}>
              <span className="text-white font-bold text-sm">P</span>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center gap-3 py-3 transition-all relative ${
                    activeSection === item.id ? 'bg-white/5' : 'hover:bg-white/5'
                  }`}
                  style={{ paddingLeft: sidebarExpanded ? '16px' : '18px' }}
                >
                  {activeSection === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ backgroundColor: colors.teal }} />
                  )}
                  <Icon className={`w-5 h-5 ${activeSection === item.id ? 'text-teal-400' : 'text-white/50'}`} />
                  {sidebarExpanded && (
                    <span className={`text-sm ${activeSection === item.id ? 'text-white' : 'text-white/50'}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {sidebarExpanded && (
            <div className="px-4 pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs">IHS Towers Nigeria</p>
              <p className="text-white/30 text-xs">February 2026</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main 
        ref={contentRef}
        className={`${sidebarExpanded ? 'ml-56' : 'ml-16'} pt-12 transition-all duration-300`}
      >
        {/* Section 1: Hero */}
        <AnimatedSection id="overview" startVisible={true} className="min-h-screen flex items-center justify-center relative" style={{ backgroundColor: colors.navy }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colors.teal }} />
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-teal-500/20" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full border border-teal-500/10" />
          
          <div className="text-center z-10 px-8">
            <motion.h1 
              variants={fadeInUp}
              className="text-7xl font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Procure AI
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-2xl mb-8" style={{ color: colors.iceBlue }}>
              Process Flowcharts & Back-End Database Architecture
            </motion.p>
            
            <motion.div variants={fadeInUp} className="w-20 h-1 mx-auto mb-8" style={{ backgroundColor: colors.teal }} />
            
            <motion.p variants={fadeInUp} className="text-gray-400 mb-2">
              IHS Towers Nigeria — Pre-Alignment Session
            </motion.p>
            
            <motion.p variants={fadeInUp} className="text-gray-500 text-sm">
              February 2026
            </motion.p>
          </div>
          
          <div className="absolute bottom-8 left-8 text-teal-500 text-xs tracking-widest uppercase">
            Confidential
          </div>
        </AnimatedSection>

        {/* Section 2: Architecture */}
        <AnimatedSection id="architecture" className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
          <div className="max-w-7xl mx-auto">
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>
              High-Level System Architecture
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-500 mb-12">
              How Procure AI connects with IHS's existing infrastructure
            </motion.p>

            <div className="grid grid-cols-3 gap-8 items-start">
              {/* IHS Systems */}
              <motion.div variants={fadeInUp} className="space-y-3">
                <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.navy }}>
                  IHS EXISTING SYSTEMS
                </div>
                <div className="space-y-2">
                  {["D365 ERP", "ServiceNow", "Azure Data Lake", "Lumen Contracts", "Active Directory"].map((system, i) => (
                    <motion.div
                      key={system}
                      variants={fadeInUp}
                      className="bg-white/80 backdrop-blur p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
                    >
                      <Server className="w-5 h-5 text-navy" style={{ color: colors.navy }} />
                      <span className="text-sm font-medium" style={{ color: colors.slate }}>{system}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* API Hub */}
              <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center h-full">
                <div className="relative">
                  <motion.div
                    animate={{ boxShadow: ["0 0 20px rgba(13,148,136,0.3)", "0 0 40px rgba(13,148,136,0.5)", "0 0 20px rgba(13,148,136,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="px-8 py-6 rounded-2xl text-white font-bold text-lg"
                    style={{ backgroundColor: colors.teal }}
                  >
                    API Integration Hub
                  </motion.div>
                </div>
                <div className="mt-8 text-center text-xs text-gray-400">
                  ← Bidirectional Data Flow →
                </div>
              </motion.div>

              {/* Procure AI Platform */}
              <motion.div variants={fadeInUp} className="space-y-3">
                <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.teal }}>
                  PROCURE AI PLATFORM
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "RFQ Engine", color: colors.green },
                    { name: "Vendor Portal", color: colors.blue },
                    { name: "Auction System", color: colors.orange },
                    { name: "AI/ML Service", color: colors.navy },
                    { name: "Analytics", color: colors.teal },
                    { name: "Contract Mgmt", color: "#64748B" },
                  ].map((mod) => (
                    <motion.div
                      key={mod.name}
                      variants={fadeInUp}
                      whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}
                      className="p-3 rounded-lg text-white text-xs font-medium text-center cursor-pointer"
                      style={{ backgroundColor: mod.color }}
                    >
                      {mod.name}
                    </motion.div>
                  ))}
                </div>
                <div className="text-center text-xs text-gray-400 mt-4 py-2 bg-gray-100 rounded">
                  Azure SQL | Cosmos DB | Redis Cache | Blob Storage
                </div>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="mt-8 py-3 px-6 rounded-xl text-center text-sm" style={{ backgroundColor: "#FEF3C7", color: colors.orange }}>
              <Globe className="w-4 h-4 inline mr-2" />
              External APIs: Alibaba | Global Sources | Dun & Bradstreet | Exchange Rates
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Section 3: RFQ Flow */}
        <AnimatedSection id="rfq-flow" className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.white }}>
          <div className="max-w-7xl mx-auto">
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Process Flow: RFQ / Tender Creation
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-500 mb-12">
              End-to-end flow from requirement to vendor award
            </motion.p>

            {/* Flow Steps */}
            <div className="space-y-8">
              {/* Row 1 */}
              <div className="flex justify-between items-start">
                {[
                  { num: 1, label: "Business User Raises Request", color: colors.blue },
                  { num: 2, label: "Scope Validation", color: colors.teal },
                  { num: 3, label: "Budget & Approval Check", color: colors.orange },
                  { num: 4, label: "AI Vendor Discovery", color: colors.green },
                  { num: 5, label: "RFQ Generation", color: colors.navy },
                ].map((step, i) => (
                  <motion.div key={step.num} variants={fadeInUp} className="flex flex-col items-center w-40">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mb-3" style={{ backgroundColor: step.color }}>
                      {step.num}
                    </div>
                    <div className="text-center text-sm font-medium text-gray-700">{step.label}</div>
                    {i < 4 && <ArrowRight className="absolute right-0 top-5 w-4 h-4 text-gray-300" />}
                  </motion.div>
                ))}
              </div>

              {/* Row 2 */}
              <div className="flex justify-between items-start">
                {[
                  { num: 6, label: "Vendor Bid Submission", color: colors.blue },
                  { num: 7, label: "AI Bid Evaluation", color: colors.green },
                  { num: 8, label: "Technical & Financial Scoring", color: colors.teal },
                  { num: 9, label: "BAFO Round (if required)", color: colors.orange },
                  { num: 10, label: "Award & Contract", color: colors.navy },
                ].map((step) => (
                  <motion.div key={step.num} variants={fadeInUp} className="flex flex-col items-center w-40">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mb-3" style={{ backgroundColor: step.color }}>
                      {step.num}
                    </div>
                    <div className="text-center text-sm font-medium text-gray-700">{step.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-6 mt-12">
              <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" style={{ color: colors.teal }} />
                  Key Database Tables
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><span className="font-mono text-teal-600">rfq_requests</span> — Stores all RFQ/RFP metadata</li>
                  <li><span className="font-mono text-teal-600">rfq_line_items</span> — Individual items per RFQ</li>
                  <li><span className="font-mono text-teal-600">rfq_vendor_invitations</span> — Invited vendors per RFQ</li>
                  <li><span className="font-mono text-teal-600">vendor_bids</span> — Submitted bid details and pricing</li>
                  <li><span className="font-mono text-teal-600">bid_evaluations</span> — Scoring (technical, financial, risk)</li>
                  <li><span className="font-mono text-teal-600">awards</span> — Final vendor selection and award details</li>
                </ul>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" style={{ color: colors.orange }} />
                  Integration Points
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><span className="font-semibold">D365</span> → Budget validation, cost center lookup</li>
                  <li><span className="font-semibold">Azure Data Lake</span> → Historical pricing for AI scoring</li>
                  <li><span className="font-semibold">External APIs</span> → Vendor discovery (Alibaba, Global Sources)</li>
                  <li><span className="font-semibold">Lumen</span> → Contract generation after award</li>
                  <li><span className="font-semibold">ServiceNow</span> → Automated ticket creation on exceptions</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>

        {/* Section 4: Vendor Onboarding */}
        <AnimatedSection id="vendor-onboarding" className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
          <div className="max-w-7xl mx-auto">
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Process Flow: Vendor Registration & Onboarding
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-500 mb-12">
              Self-service registration through to D365 sync
            </motion.p>

            {/* Swimlane Diagram */}
            <div className="grid grid-cols-3 gap-6">
              {/* Lane 1: Vendor Actions */}
              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.blue }}>
                  VENDOR ACTIONS
                </div>
                {["Self-Registration (Portal / Invite Link)", "Upload Company Profile & Documents", "Complete Due Diligence Forms", "Accept Terms & Conditions"].map((step, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: colors.blue }}>{i + 1}</span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Lane 2: Procure AI */}
              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.teal }}>
                  PROCURE AI (AUTOMATED)
                </div>
                {["AI Profile Enrichment", "Document Verification", "Risk & Compliance Screening", "Vendor Scoring & Classification"].map((step, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: colors.teal }}>{i + 5}</span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Lane 3: IHS Procurement */}
              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.navy }}>
                  IHS PROCUREMENT
                </div>
                {["Review & Approve Vendor Profile", "Category Assignment", "D365 Vendor Master Sync"].map((step, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: colors.navy }}>{i + 9}</span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Bottom Bar */}
            <motion.div variants={fadeInUp} className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Database Tables:</span> vendors | vendor_contacts | vendor_documents | vendor_compliance | vendor_categories | vendor_risk_scores | vendor_bank_details
              </p>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Section 5: Reverse Auction */}
        <AnimatedSection id="reverse-auction" className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.white }}>
          <div className="max-w-7xl mx-auto">
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Process Flow: Reverse Auction
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-500 mb-12">
              Asset disposal through competitive bidding
            </motion.p>

            {/* Auction Flow */}
            <div className="grid grid-cols-6 gap-4 mb-12">
              {[
                { num: 1, label: "Asset Listed for Disposal", desc: "Finance team validates asset for sale", color: colors.orange },
                { num: 2, label: "Vendor Invitation", desc: "Pre-qualified buyers notified via portal", color: colors.blue },
                { num: 3, label: "Inspection Period", desc: "Vendors inspect assets onsite or via photos", color: colors.teal },
                { num: 4, label: "Live Bidding Rounds", desc: "Real-time competitive bidding with AI floor", color: colors.green },
                { num: 5, label: "Winner Determination", desc: "Highest bid verified against reserve price", color: colors.navy },
                { num: 6, label: "Payment & Collection", desc: "Invoice generated, asset handover", color: colors.orange },
              ].map((step) => (
                <motion.div key={step.num} variants={fadeInUp} className="text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3" style={{ backgroundColor: step.color }}>
                    {step.num}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{step.label}</h4>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-6">
              <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" style={{ color: colors.teal }} />
                  Database Tables
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><span className="font-mono text-teal-600">auctions</span> — Auction metadata, status, dates</li>
                  <li><span className="font-mono text-teal-600">auction_lots</span> — Individual assets/lots per auction</li>
                  <li><span className="font-mono text-teal-600">auction_bids</span> — All bids with timestamps</li>
                  <li><span className="font-mono text-teal-600">auction_invitations</span> — Invited vendors per auction</li>
                  <li><span className="font-mono text-teal-600">auction_results</span> — Winner, final price, settlement</li>
                </ul>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" style={{ color: colors.green }} />
                  Real-Time Bidding Architecture
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>WebSocket connections for live bid updates</li>
                  <li>Azure SignalR Service for real-time broadcast</li>
                  <li>Redis cache for bid queue and leaderboard</li>
                  <li>AI-calculated reserve price from historical data</li>
                  <li>Audit trail: every bid immutably logged</li>
                </ul>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs text-green-600">Real-time updates enabled</span>
                </div>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>

        {/* Section 6: Database Architecture */}
        <AnimatedSection id="database" className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
          <div className="max-w-7xl mx-auto">
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Back-End Database Architecture
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-500 mb-12">
              Core data domains and storage strategy
            </motion.p>

            {/* Database Cards */}
            <div className="grid grid-cols-4 gap-4 mb-12">
              {[
                { name: "AZURE SQL DATABASE", color: colors.blue, subtitle: "Transactional Data", icon: Server, items: ["vendors", "items", "rfq_requests", "rfq_line_items", "vendor_bids", "awards", "purchase_orders", "contracts", "approvals"] },
                { name: "AZURE COSMOS DB", color: colors.teal, subtitle: "Vendor Profiles & Documents", icon: Database, items: ["vendor_profiles (JSON)", "vendor_documents", "audit_logs", "activity_feeds", "notifications", "chat_history"] },
                { name: "AZURE DATA LAKE", color: colors.green, subtitle: "Analytics & ML Training", icon: BarChart3, items: ["historical_po_data", "spend_analytics", "price_trends", "vendor_performance_history", "demand_forecasting_data"] },
                { name: "AZURE BLOB STORAGE", color: colors.orange, subtitle: "Files & Attachments", icon: Package, items: ["vendor_certificates (PDF)", "rfq_attachments", "bid_docs", "contract_documents", "auction_asset_photos"] },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div key={card.name} variants={fadeInUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 text-white flex items-center gap-2" style={{ backgroundColor: card.color }}>
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold text-sm">{card.name}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-3">{card.subtitle}</p>
                      <ul className="space-y-1">
                        {card.items.map((item) => (
                          <li key={item} className="text-xs text-gray-600 font-mono">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bulk Upload Pipeline */}
            <motion.div variants={fadeInUp}>
              <h3 className="font-semibold text-gray-900 mb-4">Bulk Data Upload Pipeline</h3>
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100">
                {[
                  { label: "CSV/XLSX Upload", color: colors.blue },
                  { label: "Schema Validation", color: colors.teal },
                  { label: "Staging Tables", color: colors.orange },
                  { label: "Admin Review", color: colors.navy },
                  { label: "Production Write", color: colors.green },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center">
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2" style={{ backgroundColor: step.color }}>
                        {i + 1}
                      </div>
                      <span className="text-xs text-gray-600">{step.label}</span>
                    </div>
                    {i < 4 && <ArrowRight className="w-6 h-6 text-gray-300 mx-4" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* Section 7: Data Upload Requirements */}
        <AnimatedSection id="data-upload" className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.white }}>
          <div className="max-w-7xl mx-auto">
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Bulk Data Upload: Format Requirements
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-500 mb-12">
              What IHS needs to prepare for initial data migration
            </motion.p>

            {/* Data Table */}
            <motion.div variants={fadeInUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Data Set</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Format</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Est. Volume</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Source System</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { dataset: "Vendor Master", format: "CSV / XLSX", volume: "2,000–5,000", source: "D365", priority: "P1", critical: true },
                    { dataset: "Category Master", format: "CSV / XLSX", volume: "100–300", source: "D365 / Manual", priority: "P1", critical: true },
                    { dataset: "Item Catalogue", format: "CSV / XLSX", volume: "5,000–15,000", source: "D365 / Readcube", priority: "P1", critical: true },
                    { dataset: "Historical POs", format: "CSV / XLSX", volume: "50,000–200,000", source: "D365", priority: "P2", critical: false },
                    { dataset: "Vendor Compliance", format: "CSV + PDF files", volume: "5,000–15,000", source: "Manual / Shared Drive", priority: "P2", critical: false },
                  ].map((row) => (
                    <tr key={row.dataset} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-900 font-medium">{row.dataset}</td>
                      <td className="p-4 text-sm text-gray-600">{row.format}</td>
                      <td className="p-4 text-sm text-gray-600">{row.volume}</td>
                      <td className="p-4 text-sm text-gray-600">{row.source}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.critical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {row.priority} — {row.critical ? 'Critical' : 'High'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-6">
              <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">File Format Specifications</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>Encoding: <span className="font-mono text-teal-600">UTF-8</span></li>
                  <li>Date format: <span className="font-mono text-teal-600">YYYY-MM-DD</span></li>
                  <li>Decimal separator: <span className="font-mono text-teal-600">period (.)</span></li>
                  <li>Boolean: <span className="font-mono text-teal-600">TRUE / FALSE</span></li>
                  <li>Currency codes: <span className="font-mono text-teal-600">ISO 4217 (NGN, USD, EUR)</span></li>
                  <li>Country codes: <span className="font-mono text-teal-600">ISO 3166-1 Alpha-3 (NGA, GHA)</span></li>
                  <li>No thousands separators in numeric fields</li>
                </ul>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Upload Load Order</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span> Category Master (no dependencies)</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span> Vendor Master (refs: Category)</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">3</span> Item Catalogue (refs: Category, Vendor)</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">4</span> Historical POs (refs: Vendor, Item)</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">5</span> Vendor Compliance (refs: Vendor)</li>
                </ol>
              </motion.div>
            </div>

            <motion.p variants={fadeInUp} className="mt-6 text-sm text-gray-500 italic flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Templates provided in accompanying Excel workbook
            </motion.p>
          </div>
        </AnimatedSection>

        {/* Section 8: Next Steps */}
        <AnimatedSection id="next-steps" className="min-h-screen p-12 pb-24 flex items-center" style={{ backgroundColor: colors.navy }}>
          <div className="max-w-4xl mx-auto w-full">
            <div className="h-1 w-full mb-8" style={{ backgroundColor: colors.teal }} />
            
            <motion.h2 variants={fadeInUp} className="text-5xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Next Steps
            </motion.h2>
            <motion.div variants={fadeInUp} className="w-20 h-1 mb-12" style={{ backgroundColor: colors.teal }} />

            <div className="space-y-8">
              {[
                { num: "01", title: "IHS to extract D365 vendor master data", desc: "Using provided CSV/XLSX templates" },
                { num: "02", title: "IHS to compile category taxonomy", desc: "3-level hierarchy with CapEx/OpEx classification" },
                { num: "03", title: "IHS IT to confirm API access", desc: "D365, ServiceNow, Azure Data Lake endpoints" },
                { num: "04", title: "Joint session to validate flowcharts", desc: "Confirm process alignment with current operations" },
                { num: "05", title: "Procure AI team to deliver staging environment", desc: "For test uploads and validation ahead of go-live" },
              ].map((step) => (
                <motion.div key={step.num} variants={fadeInUp} className="flex items-start gap-6">
                  <span className="text-4xl font-bold" style={{ color: colors.teal }}>{step.num}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-gray-400">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.p variants={fadeInUp} className="mt-12 text-lg italic" style={{ color: colors.teal }}>
              Target: All data templates populated by 28 February 2026
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-white/40 text-sm">Procure AI</p>
                <p className="text-white/30 text-xs">IHS Towers Nigeria — Pre-Alignment Session — February 2026</p>
              </div>
              <span className="text-teal-500 text-xs tracking-widest uppercase">Confidential</span>
            </motion.div>
          </div>
        </AnimatedSection>
      </main>
    </div>
  );
};

export default ProcureAIScrollPresentation;
