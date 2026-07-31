import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Download,
  Target,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Shield,
  Zap,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Building2,
  FileText,
  Settings,
  Layers,
  Bot,
  Globe,
  Database,
  Cloud,
  Server,
  Lock,
  Loader2,
  Play,
  Pause,
  Award,
  Briefcase,
  PieChart,
  Activity,
  GitBranch,
  ClipboardList,
  UserCheck,
  Cpu,
  Network,
  RefreshCw,
  FileCheck,
  CircleDot,
  CheckSquare,
  XCircle,
  Minus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

// Page structure
const PAGES = [
  { id: 1, title: "Title", label: "Intro" },
  { id: 2, title: "Agenda", label: "Agenda" },
  { id: 3, title: "Strategic Framing", label: "Strategy" },
  { id: 4, title: "Phased Model", label: "Phases" },
  { id: 5, title: "Scope", label: "Scope" },
  { id: 6, title: "Architecture", label: "Tech" },
  { id: 7, title: "Governance", label: "Govern" },
  { id: 8, title: "Risk & Reporting", label: "Risk" },
  { id: 9, title: "Roadmap", label: "Roadmap" },
  { id: 10, title: "Resources", label: "Team" },
  { id: 11, title: "Commercial", label: "Cost" },
  { id: 12, title: "Decisions", label: "Decision" },
  { id: 13, title: "Credentials", label: "About" },
];

// Color palette
const colors = {
  navy: "#0F172A",
  navyLight: "#1E293B",
  teal: "#14B8A6",
  tealDark: "#0D9488",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  orange: "#F97316",
  pink: "#EC4899",
  cyan: "#06B6D4",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#EAB308",
  white: "#FFFFFF",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1E293B",
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
  })
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
  })
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
  })
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.12, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
  })
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 }
  }
};

const countUp = (target, duration = 1500) => {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: duration / 1000 }
    }
  };
};

const ProcureAIExecutivePack = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [captureInProgress, setCaptureInProgress] = useState(false);
  const contentRef = useRef(null);
  const navigate = useNavigate();

  const totalPages = PAGES.length;

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setDirection(page > currentPage ? 1 : -1);
      setCurrentPage(page);
    }
  };

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setDirection(1);
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setDirection(-1);
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isGeneratingPdf) return;
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, isGeneratingPdf]);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDownload = async () => {
    setIsGeneratingPdf(true);
    setDownloadProgress(0);
    setDownloadStatus('Preparing document...');
    
    const originalPage = currentPage;
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const pdfWidth = 1056;
      const pdfHeight = 816;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      for (let i = 1; i <= totalPages; i++) {
        const progressPercent = Math.round(((i - 1) / totalPages) * 85);
        setDownloadProgress(progressPercent);
        setDownloadStatus(`Capturing page ${i}/${totalPages}: ${PAGES[i-1].title}...`);
        
        setDirection(0);
        setCurrentPage(i);
        await sleep(5000);
        
        setCaptureInProgress(true);
        await sleep(300);
        
        const sidebar = document.querySelector('aside');
        const header = document.querySelector('header');
        const bottomNav = document.querySelectorAll('[class*="fixed bottom-0"]');
        const mainContent = document.querySelector('main');
        
        const originalStyles = {
          sidebar: sidebar?.style.cssText,
          header: header?.style.cssText,
          main: mainContent?.style.cssText,
        };
        
        if (sidebar) sidebar.style.display = 'none';
        if (header) header.style.display = 'none';
        bottomNav.forEach(el => el.style.display = 'none');
        if (mainContent) {
          mainContent.style.marginLeft = '0';
          mainContent.style.marginTop = '0';
        }
        
        await sleep(200);
        
        if (contentRef.current) {
          try {
            const canvas = await html2canvas(contentRef.current, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: [1, 12, 13].includes(i) ? colors.navy : colors.gray50,
              width: 1400,
              height: 850,
              windowWidth: 1400,
              windowHeight: 850,
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            
            if (i > 1) {
              pdf.addPage([pdfWidth, pdfHeight], 'landscape');
            }
            
            const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
            const scaledWidth = canvas.width * ratio;
            const scaledHeight = canvas.height * ratio;
            const xOffset = (pdfWidth - scaledWidth) / 2;
            const yOffset = (pdfHeight - scaledHeight) / 2;
            
            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, scaledWidth, scaledHeight);
          } catch (err) {
            console.error(`Error capturing page ${i}:`, err);
          }
        }
        
        if (sidebar) sidebar.style.cssText = originalStyles.sidebar || '';
        if (header) header.style.cssText = originalStyles.header || '';
        bottomNav.forEach(el => el.style.display = '');
        if (mainContent) mainContent.style.cssText = originalStyles.main || '';
        
        setCaptureInProgress(false);
      }
      
      setDownloadProgress(95);
      setDownloadStatus('Finalizing PDF...');
      await sleep(800);
      
      pdf.save('ProcureAI-Executive-Pack.pdf');
      
      setDownloadProgress(100);
      setDownloadStatus('Download complete!');
      await sleep(1000);
      
      setCurrentPage(originalPage);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      setDownloadStatus('Error generating PDF.');
      await sleep(2000);
    }
    
    setIsGeneratingPdf(false);
    setDownloadProgress(0);
    setDownloadStatus('');
    setCaptureInProgress(false);
  };

  const pageVariants = {
    enter: (direction) => ({ x: direction > 0 ? 1000 : -1000, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 1000 : -1000, opacity: 0 })
  };

  return (
    <div className="min-h-screen bg-slate-900 flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Download Progress Overlay */}
      {isGeneratingPdf && !captureInProgress && (
        <div data-pdf-overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[500px]"
          >
            <div className="text-center mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-teal-50"
              >
                <Loader2 className="w-8 h-8 text-teal-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Generating PDF</h3>
              <p className="text-gray-500 text-sm">{downloadStatus}</p>
            </div>
            
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
              Capturing {totalPages} pages
            </p>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6" style={{ marginLeft: sidebarExpanded ? '240px' : '72px', transition: 'margin-left 0.3s' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold">Procure AI</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-sm">Executive Kick-Off Pack</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 shadow-lg shadow-teal-500/25 transition-all disabled:opacity-70"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isGeneratingPdf ? `${downloadProgress}%` : "Download PDF"}
              <ChevronDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
            <DropdownMenuItem onClick={handleDownload} className="cursor-pointer text-slate-200 hover:bg-slate-700">
              <Download className="w-4 h-4 mr-2" />
              Download as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ${sidebarExpanded ? 'w-60' : 'w-[72px]'}`}
        style={{ backgroundColor: colors.navy }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col h-full py-4">
          <div className="px-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <span className="text-white font-bold text-lg">P</span>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
            {PAGES.map((page) => (
              <button
                key={page.id}
                onClick={() => goToPage(page.id)}
                className={`w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all relative ${
                  currentPage === page.id 
                    ? 'bg-teal-500/20 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {currentPage === page.id && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-teal-400 to-cyan-500"
                  />
                )}
                <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  currentPage === page.id 
                    ? 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {page.id}
                </span>
                {sidebarExpanded && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-medium whitespace-nowrap truncate"
                  >
                    {page.title}
                  </motion.span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarExpanded ? 'ml-60' : 'ml-[72px]'} mt-14 transition-all duration-300`}>
        <div ref={contentRef}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="min-h-[calc(100vh-56px)]"
            >
              {currentPage === 1 && <TitleSection />}
              {currentPage === 2 && <AgendaSection />}
              {currentPage === 3 && <StrategicFramingSection />}
              {currentPage === 4 && <PhasedModelSection />}
              {currentPage === 5 && <ScopeSection />}
              {currentPage === 6 && <ArchitectureSection />}
              {currentPage === 7 && <GovernanceSection />}
              {currentPage === 8 && <RiskSection />}
              {currentPage === 9 && <RoadmapSection />}
              {currentPage === 10 && <ResourcesSection />}
              {currentPage === 11 && <CommercialSection />}
              {currentPage === 12 && <DecisionSection />}
              {currentPage === 13 && <CredentialsSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div 
        className="fixed bottom-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 px-6 py-3"
        style={{ left: sidebarExpanded ? '240px' : '72px', right: 0, transition: 'left 0.3s' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <motion.div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${(currentPage / totalPages) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {PAGES.map((page) => (
                <button
                  key={page.id}
                  onClick={() => goToPage(page.id)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentPage === page.id 
                      ? 'w-6 bg-gradient-to-r from-teal-400 to-cyan-500' 
                      : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-slate-400">
              <span className="text-white font-semibold">{currentPage}</span>/{totalPages}
            </span>
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === totalPages 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
            }`}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== SLIDE 1: TITLE ====================
const TitleSection = () => (
  <div className="min-h-[calc(100vh-56px)] flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #0c1929 100%)` }}>
    <div className="absolute inset-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ duration: 2 }}
        className="absolute top-10 left-10 w-96 h-96 rounded-full border border-teal-500/30" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} transition={{ duration: 2, delay: 0.3 }}
        className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full border border-cyan-500/20" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.05 }} transition={{ duration: 2.5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-teal-500/20 to-transparent blur-3xl" />
    </div>

    <div className="text-center z-10 px-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }} className="mb-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/40">
          <Bot className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
        className="text-6xl font-bold text-white mb-4 tracking-tight">
        Procure <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
      </motion.h1>
      
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
        className="text-2xl text-slate-300 mb-2 font-light">
        Procurement Transformation Programme
      </motion.p>
      
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
        className="text-lg text-teal-400 mb-8 font-medium">
        Executive Kick-Off Pack
      </motion.p>

      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.6 }}
        className="w-24 h-1 mx-auto mb-8 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500" />
      
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }}
        className="text-slate-400 mb-1">Strategic Validation Session with Group CIO</motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.8 }}
        className="text-slate-500 text-sm mb-6">23 February 2026</motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }}
        className="flex items-center justify-center gap-4 text-slate-500 text-sm">
        <span>IHS Towers Nigeria</span>
        <span className="text-slate-700">|</span>
        <span>TN Macaulay</span>
        <span className="text-slate-700">|</span>
        <span>Future Africa</span>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.1 }}
        className="mt-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
          <Lock className="w-4 h-4" />
          CONFIDENTIAL
        </div>
      </motion.div>
    </div>
  </div>
);

// ==================== SLIDE 2: AGENDA ====================
const AgendaSection = () => {
  const agendaItems = [
    { num: "01", title: "Strategic Framing", time: "15–20 min", desc: "Objectives, transformation thesis, phased capability model", icon: Target, color: colors.teal },
    { num: "02", title: "Scope Confirmation", time: "20 min", desc: "Interfaces, data governance, assumptions, exclusions", icon: ClipboardList, color: colors.blue },
    { num: "03", title: "Target Architecture", time: "20–25 min", desc: "Solution design, integrations, cybersecurity, scalability", icon: Cpu, color: colors.purple },
    { num: "04", title: "Governance & Delivery", time: "20–25 min", desc: "SteerCo, PMO, RACI, reporting, risk management", icon: Users, color: colors.orange },
    { num: "05", title: "Milestones & Roadmap", time: "20–25 min", desc: "13-month timeline, critical path, resources, change mgmt", icon: Calendar, color: colors.pink },
    { num: "06", title: "Commercial & Performance", time: "10–15 min", desc: "Budget phasing, payment milestones, KPIs, exclusions", icon: DollarSign, color: colors.cyan },
    { num: "07", title: "Decision Points", time: "10–15 min", desc: "Go/no-go for 1 March, governance approval, IT access", icon: CheckCircle2, color: colors.green },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-8">
          <h2 className="text-4xl font-bold text-slate-900 mb-2">Session Agenda</h2>
          <p className="text-slate-500">1.5–2 hour strategic validation — structured for executive decision</p>
        </motion.div>

        <div className="space-y-3">
          {agendaItems.map((item, i) => (
            <motion.div
              key={item.num}
              custom={i}
              variants={fadeInLeft}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 flex items-center gap-4 hover:shadow-xl transition-shadow"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                <item.icon className="w-7 h-7" style={{ color: item.color }} />
              </div>
              <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">{item.num}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
              <div className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium flex-shrink-0">
                {item.time}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== SLIDE 3: STRATEGIC FRAMING ====================
const StrategicFramingSection = () => {
  const currentState = [
    "Manual Excel-based procurement across all categories",
    "45-day average purchase cycle from request to PO",
    "Limited to established local vendor networks",
    "No real-time spend visibility or analytics",
    "Manual vendor due diligence and compliance tracking",
    "No structured asset recovery or disposal process"
  ];

  const futureState = [
    "AI-powered end-to-end procurement automation",
    "15-day procurement cycles (67% reduction)",
    "Global vendor discovery (Alibaba, D&B, Global Sources)",
    "Real-time dashboards, spend analytics, forecasting",
    "Automated compliance scoring and risk monitoring",
    "Competitive reverse auctions for asset disposal"
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-4">
            01 Strategic Framing
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-2">Programme Objectives</h2>
          <p className="text-slate-500">Transformation thesis: From manual to AI-powered procurement</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          {/* Current State */}
          <motion.div variants={fadeInLeft} initial="hidden" animate="visible"
            className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-red-500 to-orange-500">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <XCircle className="w-6 h-6" />
                CURRENT STATE
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {currentState.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-red-50"
                >
                  <Minus className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Future State */}
          <motion.div variants={fadeInRight} initial="hidden" animate="visible"
            className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-teal-500 to-cyan-500">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                FUTURE STATE (PROCURE AI)
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {futureState.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-teal-50"
                >
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Key Metric Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-6 text-center text-white"
        >
          <div className="flex items-center justify-center gap-8">
            <div>
              <p className="text-4xl font-bold">45 days</p>
              <p className="text-teal-100 text-sm">Current Cycle</p>
            </div>
            <ArrowRight className="w-8 h-8" />
            <div>
              <p className="text-4xl font-bold">15 days</p>
              <p className="text-teal-100 text-sm">Future Cycle</p>
            </div>
            <div className="h-16 w-px bg-white/30" />
            <div>
              <p className="text-5xl font-bold">67%</p>
              <p className="text-teal-100 text-sm">Reduction</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SLIDE 4: PHASED MODEL ====================
const PhasedModelSection = () => {
  const phases = [
    {
      num: 1,
      title: "Foundation & Core",
      timeline: "Feb–May 2026 (4 mo)",
      cost: "$47,500",
      modules: ["Vendor Portal", "Due Diligence", "Risk Monitor", "AI Bot", "Reverse Auction"],
      color: colors.blue
    },
    {
      num: 2,
      title: "RFx Workflows",
      timeline: "Jun–Oct 2026 (5 mo)",
      cost: "$60,000",
      modules: ["RFx Creation", "Vendor Sourcing", "Scope Validation", "BAFO", "Templates"],
      color: colors.purple
    },
    {
      num: 3,
      title: "Intelligence",
      timeline: "Nov 2026–Feb 2027 (4 mo)",
      cost: "$60,000",
      modules: ["Forecasting", "Category Mgmt", "TCO Reporting", "Audit", "Settings"],
      color: colors.teal
    }
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-8">
          <h2 className="text-4xl font-bold text-slate-900 mb-2">Phased Capability Model</h2>
          <p className="text-slate-500">13-month delivery in three strategic phases</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {phases.map((phase, i) => (
            <motion.div
              key={phase.num}
              custom={i}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5" style={{ backgroundColor: phase.color }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm font-medium">PHASE {phase.num}</span>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-bold">{phase.cost}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{phase.title}</h3>
                <p className="text-white/80 text-sm mt-1">{phase.timeline}</p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500 uppercase font-medium mb-3">Key Modules</p>
                <div className="space-y-2">
                  {phase.modules.map((module, j) => (
                    <motion.div
                      key={module}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.2 + j * 0.05 }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50"
                    >
                      <CheckCircle2 className="w-4 h-4" style={{ color: phase.color }} />
                      <span className="text-sm text-slate-700">{module}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Total Investment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-6 bg-slate-900 rounded-2xl p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Programme Investment</p>
              <p className="text-2xl font-bold text-white">$167,500</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-400">13</p>
              <p className="text-slate-400 text-sm">Months</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-400">3</p>
              <p className="text-slate-400 text-sm">Phases</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-400">120+</p>
              <p className="text-slate-400 text-sm">Pages</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SLIDE 5: SCOPE ====================
const ScopeSection = () => {
  const assumptions = [
    "IHS provides timely access to systems & environments",
    "LLM usage, hosting, and 3rd-party licences are IHS cost",
    "Scoping worksheet requirements are complete and final",
    "D365 environment supports required API integrations",
    "Change requests managed via formal CR process"
  ];

  const exclusions = [
    "LLM API usage costs (Azure OpenAI or equivalent)",
    "Cloud hosting and infrastructure costs (Azure)",
    "Third-party service licences (D&B, NAVEX, Docusign)",
    "Microsoft Dynamics 365 licensing",
    "D365 core ERP modifications, legacy decommissioning"
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-3">
            02 Scope Confirmation
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Scope Confirmation & Boundaries</h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          {/* Assumptions */}
          <motion.div variants={fadeInLeft} initial="hidden" animate="visible"
            className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                KEY ASSUMPTIONS (CIO Validation)
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {assumptions.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-blue-50"
                >
                  <CheckSquare className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Exclusions */}
          <motion.div variants={fadeInRight} initial="hidden" animate="visible"
            className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                EXCLUSIONS (IHS Responsibility)
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {exclusions.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-orange-50"
                >
                  <XCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ==================== SLIDE 6: ARCHITECTURE ====================
const ArchitectureSection = () => {
  const ihsSystems = ["D365 Finance & Ops", "ServiceNow", "Azure Data Lake", "Azure OpenAI", "Azure AD / Entra ID"];
  const procureServices = ["Procurement Service", "Vendor Service", "AI/ML Service", "Analytics Service", "Auction Service", "Contract Service"];
  const dataStores = ["Azure SQL", "Cosmos DB", "Redis", "Blob Storage", "Cognitive Search"];
  const external = ["Alibaba", "Global Sources", "D&B", "NAVEX", "Docusign"];

  return (
    <div className="min-h-[calc(100vh-56px)] p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-3">
            03 Target Architecture
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Target Architecture & Technical Design</h2>
          <p className="text-slate-500">Azure-native microservices with D365 deep integration</p>
        </motion.div>

        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-center">
          {/* IHS Systems */}
          <motion.div variants={fadeInLeft} initial="hidden" animate="visible"
            className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">IHS SYSTEMS</h3>
            </div>
            <div className="space-y-2">
              {ihsSystems.map((sys, i) => (
                <motion.div key={sys} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="p-2 rounded-lg bg-blue-50 text-xs text-slate-700">{sys}</motion.div>
              ))}
            </div>
          </motion.div>

          {/* Arrow */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-col items-center">
            <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-teal-400" />
          </motion.div>

          {/* Procure AI Platform */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 shadow-xl text-white">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/20">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold">PROCURE AI PLATFORM</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {procureServices.map((svc, i) => (
                <motion.div key={svc} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05 }}
                  className="p-2 rounded-lg bg-white/10 text-xs">{svc}</motion.div>
              ))}
            </div>
            <div className="pt-3 border-t border-white/20">
              <p className="text-xs text-white/70 mb-2">Data Layer</p>
              <div className="flex flex-wrap gap-1">
                {dataStores.map((ds, i) => (
                  <span key={ds} className="px-2 py-1 rounded bg-white/10 text-xs">{ds}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Arrow */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="flex flex-col items-center">
            <div className="w-8 h-0.5 bg-gradient-to-r from-teal-400 to-emerald-400" />
          </motion.div>

          {/* External */}
          <motion.div variants={fadeInRight} initial="hidden" animate="visible"
            className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">EXTERNAL</h3>
            </div>
            <div className="space-y-2">
              {external.map((ext, i) => (
                <motion.div key={ext} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.05 }}
                  className="p-2 rounded-lg bg-emerald-50 text-xs text-slate-700">{ext}</motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ==================== SLIDE 7: GOVERNANCE ====================
const GovernanceSection = () => {
  const bodies = [
    { name: "STEERING COMMITTEE", freq: "Monthly", members: "Exec Sponsor, Project Director, IT Lead, Project Owner", color: colors.teal },
    { name: "PROJECT STATUS REVIEW", freq: "Weekly", members: "PM, IT Lead, Business Analysts", color: colors.blue },
    { name: "Sprint Demo", freq: "Bi-weekly", members: "Full team + stakeholders", color: colors.purple },
    { name: "Technical Review", freq: "Weekly", members: "Architect + Devs + IT Lead", color: colors.orange },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-3">
            04 Governance
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Governance & Delivery Model</h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          {bodies.map((body, i) => (
            <motion.div
              key={body.name}
              custom={i}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-xl p-4 shadow-lg border border-slate-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900">{body.name}</h3>
                <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: body.color }}>
                  {body.freq}
                </span>
              </div>
              <p className="text-sm text-slate-600">{body.members}</p>
            </motion.div>
          ))}
        </div>

        {/* RACI Legend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="mt-6 bg-slate-900 rounded-xl p-4 flex items-center justify-center gap-8 text-white">
          <span className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center text-xs font-bold">R</span> Responsible</span>
          <span className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold">A</span> Accountable</span>
          <span className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-xs font-bold">C</span> Consulted</span>
          <span className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-600 flex items-center justify-center text-xs font-bold">I</span> Informed</span>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SLIDE 8: RISK ====================
const RiskSection = () => {
  const risks = [
    { id: "R1", risk: "D365 integration complexity", l: "Med", i: "High", mitigation: "Early POC in Month 1", owner: "TN Mac" },
    { id: "R2", risk: "Delayed IHS environment access", l: "Med", i: "High", mitigation: "Parallel dev env, early tracking", owner: "IHS IT" },
    { id: "R3", risk: "Scope creep from new requirements", l: "High", i: "Med", mitigation: "Formal change control", owner: "Joint" },
    { id: "R4", risk: "Key resource unavailability", l: "Low", i: "High", mitigation: "Cross-training, documentation", owner: "TN Mac" },
    { id: "R5", risk: "User adoption resistance", l: "Med", i: "Med", mitigation: "Early engagement, training", owner: "IHS" },
  ];

  const getLikelihoodColor = (l) => l === "High" ? colors.red : l === "Med" ? colors.yellow : colors.green;
  const getImpactColor = (i) => i === "High" ? colors.red : i === "Med" ? colors.yellow : colors.green;

  return (
    <div className="min-h-[calc(100vh-56px)] p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium mb-3">
            04 Risk Register
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Risk Register & Reporting</h2>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible"
          className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Risk</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">L</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">I</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Mitigation</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Owner</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r, i) => (
                <motion.tr key={r.id} variants={fadeInUp} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{r.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.risk}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: getLikelihoodColor(r.l) }}>{r.l}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: getImpactColor(r.i) }}>{r.i}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.mitigation}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{r.owner}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SLIDE 9: ROADMAP ====================
const RoadmapSection = () => {
  const milestones = [
    { month: "Feb", deliverable: "Kickoff, requirements, architecture", gate: "Architecture Sign-off" },
    { month: "Mar", deliverable: "Vendor Portal (9 interfaces)", gate: "Portal Alpha" },
    { month: "Apr", deliverable: "Due Diligence, Risk Monitor", gate: "Integration Testing" },
    { month: "May", deliverable: "AI Bot, Reverse Auction, Phase 1 UAT", gate: "PHASE 1 GO-LIVE", highlight: true },
    { month: "Jun-Oct", deliverable: "RFx Workflows, D365 Integration", gate: "PHASE 2 GO-LIVE", highlight: true },
    { month: "Nov-Feb", deliverable: "Intelligence Suite, Final UAT", gate: "PROJECT GO-LIVE", highlight: true },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-pink-100 text-pink-700 text-sm font-medium mb-3">
            05 Execution Roadmap
          </div>
          <h2 className="text-3xl font-bold text-slate-900">13-Month Delivery Timeline</h2>
          <p className="text-slate-500">February 2026 to February 2027</p>
        </motion.div>

        {/* Timeline */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible"
          className="bg-white rounded-xl shadow-xl border border-slate-200 p-6">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 rounded" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="absolute top-6 left-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-teal-500 rounded"
            />

            <div className="grid grid-cols-6 gap-2">
              {milestones.map((m, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={scaleIn}
                  className="text-center"
                >
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${m.highlight ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white' : 'bg-slate-100 text-slate-600'} font-bold text-sm mb-3 relative z-10`}>
                    {m.month}
                  </div>
                  <p className="text-xs text-slate-600 mb-2 leading-tight">{m.deliverable}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${m.highlight ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                    {m.gate}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Payment Milestones */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
          className="mt-6 grid grid-cols-4 gap-4">
          {[
            { num: 1, trigger: "Project kickoff", pct: "50%", amt: "$83,750", date: "Feb 2026" },
            { num: 2, trigger: "Phase 1 complete", pct: "20%", amt: "$33,500", date: "May 2026" },
            { num: 3, trigger: "Phase 2 complete", pct: "15%", amt: "$25,125", date: "Oct 2026" },
            { num: 4, trigger: "Final delivery", pct: "15%", amt: "$25,125", date: "Feb 2027" },
          ].map((p, i) => (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.1 }}
              className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 text-center"
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-2">{p.num}</div>
              <p className="text-xs text-slate-500 mb-1">{p.trigger}</p>
              <p className="text-xl font-bold text-slate-900">{p.pct}</p>
              <p className="text-sm text-teal-600 font-medium">{p.amt}</p>
              <p className="text-xs text-slate-400 mt-1">{p.date}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SLIDE 10: RESOURCES ====================
const ResourcesSection = () => {
  const tnTeam = [
    { role: "Project Director", hours: "10 hrs/wk", total: "520 hrs" },
    { role: "Technical PM", hours: "40 hrs/wk", total: "2,080 hrs" },
    { role: "Solution Architect", hours: "40→20→10 hrs", total: "1,200 hrs" },
    { role: "Senior Developers (2)", hours: "40 hrs/wk ea", total: "4,160 hrs" },
    { role: "AI/ML Engineer", hours: "20→30→40 hrs", total: "1,560 hrs" },
    { role: "QA Engineer", hours: "20→40→40 hrs", total: "1,760 hrs" },
  ];

  const ihsTeam = [
    { role: "Executive Sponsor", hours: "1 hr/week", activity: "Steering committee, escalations" },
    { role: "Project Owner", hours: "8 hrs/week", activity: "Requirements, UAT, decisions" },
    { role: "IT Lead", hours: "8 hrs/week", activity: "Technical review, integration" },
    { role: "Business Analysts (2)", hours: "20 hrs/week ea", activity: "Requirements, testing" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-100 text-cyan-700 text-sm font-medium mb-3">
            05 Resources
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Resource Mobilisation</h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          {/* TN Macaulay Team */}
          <motion.div variants={fadeInLeft} initial="hidden" animate="visible"
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-500">
              <h3 className="text-lg font-bold text-white">TN Macaulay Delivery Team</h3>
              <p className="text-teal-100 text-sm">12,640 total hours</p>
            </div>
            <div className="p-4 space-y-2">
              {tnTeam.map((m, i) => (
                <motion.div key={m.role} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="text-sm text-slate-700">{m.role}</span>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{m.hours}</p>
                    <p className="text-xs font-bold text-teal-600">{m.total}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* IHS Team */}
          <motion.div variants={fadeInRight} initial="hidden" animate="visible"
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500">
              <h3 className="text-lg font-bold text-white">IHS Towers Resources</h3>
              <p className="text-blue-100 text-sm">3,380 total hours</p>
            </div>
            <div className="p-4 space-y-2">
              {ihsTeam.map((m, i) => (
                <motion.div key={m.role} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="p-2 rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{m.role}</span>
                    <span className="text-xs text-blue-600 font-medium">{m.hours}</span>
                  </div>
                  <p className="text-xs text-slate-500">{m.activity}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ==================== SLIDE 11: COMMERCIAL ====================
const CommercialSection = () => {
  const kpis = [
    { kpi: "Procurement cycle time", baseline: "45 days", target: "15 days" },
    { kpi: "Vendor onboarding", baseline: "3–4 weeks", target: "3–5 days" },
    { kpi: "Spend visibility", baseline: "~40%", target: ">85%" },
    { kpi: "Cost savings", baseline: "Baseline", target: "10–15% YoY" },
    { kpi: "Automation rate", baseline: "<10%", target: "80%+" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-3">
            06 Commercial
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Commercial & Performance Framework</h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          {/* Investment Summary */}
          <motion.div variants={fadeInLeft} initial="hidden" animate="visible"
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-teal-400" />
              Investment Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/10">
                <span className="text-slate-300">Phase 1: Foundation</span>
                <span className="font-bold">$47,500</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/10">
                <span className="text-slate-300">Phase 2: RFx Workflows</span>
                <span className="font-bold">$60,000</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/10">
                <span className="text-slate-300">Phase 3: Intelligence</span>
                <span className="font-bold">$60,000</span>
              </div>
              <div className="pt-3 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">TOTAL</span>
                  <span className="text-2xl font-bold text-teal-400">$167,500</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">+ 7.5% VAT = $180,062.50</p>
              </div>
            </div>
          </motion.div>

          {/* KPI Framework */}
          <motion.div variants={fadeInRight} initial="hidden" animate="visible"
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-500">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                KPI Framework
              </h3>
            </div>
            <div className="p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="text-left pb-2">KPI</th>
                    <th className="text-center pb-2">Baseline</th>
                    <th className="text-center pb-2">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((k, i) => (
                    <motion.tr key={k.kpi} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                      className="border-t border-slate-100">
                      <td className="py-2 text-sm text-slate-700">{k.kpi}</td>
                      <td className="py-2 text-center text-sm text-red-500">{k.baseline}</td>
                      <td className="py-2 text-center text-sm font-bold text-teal-600">{k.target}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ==================== SLIDE 12: DECISIONS ====================
const DecisionSection = () => {
  const decisions = [
    {
      num: "01",
      title: "Confirm Programme Start & Milestone 1 Payment",
      desc: "Approve mobilisation and authorise Payment 1 ($83,750 + VAT). Team begins with Azure provisioning, D365 integration, and architecture design in Month 1.",
      action: "GO / NO-GO",
      color: colors.teal
    },
    {
      num: "02",
      title: "Approve Governance Model & Team Allocation",
      desc: "Endorse SteerCo composition, reporting cadence, RACI matrix, and escalation protocol. Confirm IHS project team roles.",
      action: "APPROVE",
      color: colors.blue
    },
    {
      num: "03",
      title: "Instruct IT to Provision Infrastructure Access",
      desc: "Direct IHS IT to provision: Azure subscription (Week 1), D365 API credentials (Week 2), VPN access for dev team (Week 1).",
      action: "APPROVE",
      color: colors.purple
    }
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-8" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #0c1929 100%)` }}>
      <div className="max-w-4xl w-full">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-teal-500/20 text-teal-400 text-sm font-medium mb-4">
            07 Decision Points
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">Three Decisions Required</h2>
          <p className="text-slate-400">To proceed with 1 March 2026 mobilisation</p>
        </motion.div>

        <div className="space-y-4">
          {decisions.map((d, i) => (
            <motion.div
              key={d.num}
              custom={i}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: d.color }}>
                  <span className="text-white font-bold text-lg">{d.num}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{d.title}</h3>
                  <p className="text-sm text-slate-400">{d.desc}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 rounded-lg font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                >
                  {d.action}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-slate-500 text-sm mt-8"
        >
          Thursday follow-up session will incorporate feedback and conclude with formal endorsement to proceed.
        </motion.p>
      </div>
    </div>
  );
};

// ==================== SLIDE 13: CREDENTIALS ====================
const CredentialsSection = () => {
  const projects = [
    { year: "2016", name: "Meristem Investment Bank", desc: "One of Nigeria's earliest enterprise AI chatbots. NLP-powered investment advisory." },
    { year: "2017-19", name: "Vodafone Procurement Platform", desc: "Three-in-one: procurement + vendor enablement + reverse auctions. D365 integration." },
    { year: "2018", name: "Enterprise Financial Wallet", desc: "Multi-tenant platform for P&G, Vodafone, Dangote. 50,000+ users." },
    { year: "2018+", name: "Multi-Tenant AI Platform", desc: "15+ enterprises on shared infra. 50K+ monthly transactions." },
  ];

  const stats = [
    { value: "8+", label: "Years D365/Azure" },
    { value: "15+", label: "Enterprise tenants" },
    { value: "5", label: "D365 integrations" },
    { value: "50K+", label: "Monthly txns" },
    { value: "12", label: "Azure apps live" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-8" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #0c1929 100%)` }}>
      <div className="max-w-5xl w-full">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-8">
          <p className="text-teal-400 text-sm font-medium mb-2">Appendix</p>
          <h2 className="text-4xl font-bold text-white mb-2">TN Macaulay Credentials</h2>
          <p className="text-slate-400">Pioneering enterprise AI in Nigeria since 2016</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {projects.map((p, i) => (
            <motion.div
              key={p.name}
              custom={i}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
            >
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-xs font-medium">{p.year}</span>
              <h3 className="text-lg font-bold text-white mt-3 mb-1">{p.name}</h3>
              <p className="text-sm text-slate-400">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-6"
        >
          <div className="flex items-center justify-around">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-teal-100">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProcureAIExecutivePack;
