import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Download,
  Server,
  FileText,
  Cloud,
  HardDrive,
  Check,
  ArrowRight,
  ArrowDown,
  Globe,
  Database,
  Users,
  Shield,
  Zap,
  BarChart3,
  Package,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Building2,
  FileCheck,
  UserCheck,
  Gavel,
  Upload,
  Target,
  CheckCircle2,
  Circle,
  Bot,
  FileSearch,
  ClipboardCheck,
  CreditCard,
  Truck,
  Eye,
  Timer,
  Award,
  Link,
  RefreshCw,
  Settings,
  Layers,
  FolderOpen,
  Image,
  Lock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

// Updated page structure matching PPTX
const PAGES = [
  { id: 1, title: "Title", label: "Intro" },
  { id: 2, title: "Architecture", label: "System" },
  { id: 3, title: "RFQ Flow", label: "RFQ" },
  { id: 4, title: "Vendor Onboarding", label: "Vendor" },
  { id: 5, title: "Reverse Auction", label: "Auction" },
  { id: 6, title: "Database", label: "Database" },
  { id: 7, title: "Data Upload", label: "Upload" },
  { id: 8, title: "Next Steps", label: "Next" },
];

// Professional color palette
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
  white: "#FFFFFF",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  })
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

const fadeInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1]
    }
  })
};

const drawLine = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.5, ease: "easeInOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const ProcureAIProposalV2 = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [captureInProgress, setCaptureInProgress] = useState(false);
  const contentRef = useRef(null);
  const navigate = useNavigate();

  const goToPage = (page) => {
    if (page >= 1 && page <= 8 && page !== currentPage) {
      setDirection(page > currentPage ? 1 : -1);
      setCurrentPage(page);
    }
  };

  const nextPage = useCallback(() => {
    if (currentPage < 8) {
      setDirection(1);
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setDirection(-1);
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Keyboard navigation
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
    const totalPages = 8;
    const pageNames = ['Title', 'Architecture', 'RFQ Flow', 'Vendor Onboarding', 'Reverse Auction', 'Database', 'Data Upload', 'Next Steps'];
    
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
        setDownloadStatus(`Capturing page ${i}/${totalPages}: ${pageNames[i-1]}...`);
        
        setDirection(0);
        setCurrentPage(i);
        await sleep(7000);
        
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
          mainContent.style.paddingTop = '0';
        }
        
        await sleep(200);
        
        if (contentRef.current) {
          try {
            const canvas = await html2canvas(contentRef.current, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: i === 1 || i === 8 ? colors.navy : colors.gray100,
              width: 1400,
              height: 850,
              windowWidth: 1400,
              windowHeight: 850,
              scrollX: 0,
              scrollY: 0,
              allowTaint: true,
              foreignObjectRendering: false,
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            
            if (i > 1) {
              pdf.addPage([pdfWidth, pdfHeight], 'landscape');
            }
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const scaledWidth = imgWidth * ratio;
            const scaledHeight = imgHeight * ratio;
            const xOffset = (pdfWidth - scaledWidth) / 2;
            const yOffset = (pdfHeight - scaledHeight) / 2;
            
            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, scaledWidth, scaledHeight);
          } catch (captureError) {
            console.error(`Error capturing page ${i}:`, captureError);
          }
        }
        
        if (sidebar) sidebar.style.cssText = originalStyles.sidebar || '';
        if (header) header.style.cssText = originalStyles.header || '';
        bottomNav.forEach(el => el.style.display = '');
        if (mainContent) mainContent.style.cssText = originalStyles.main || '';
        
        setCaptureInProgress(false);
        await sleep(100);
      }
      
      setDownloadProgress(92);
      setDownloadStatus('Finalizing PDF...');
      await sleep(1000);
      
      pdf.save('Procure-AI-Presentation.pdf');
      
      setDownloadProgress(100);
      setDownloadStatus('Download complete!');
      await sleep(1500);
      
      setDirection(originalPage > currentPage ? 1 : -1);
      setCurrentPage(originalPage);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      setDownloadStatus('Error generating PDF. Please try again.');
      await sleep(2000);
    }
    
    setIsGeneratingPdf(false);
    setDownloadProgress(0);
    setDownloadStatus('');
    setCaptureInProgress(false);
  };

  const pageVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
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
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-bold text-teal-600">{downloadProgress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                  style={{ width: `${downloadProgress}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            
            <div className="flex justify-center gap-1 mt-4">
              {[1,2,3,4,5,6,7,8].map((page) => (
                <div 
                  key={page}
                  className={`w-8 h-2 rounded-full transition-colors ${
                    Math.ceil((downloadProgress / 85) * 8) >= page 
                      ? 'bg-teal-500' 
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Capturing all 8 pages (7 seconds per page)
            </p>
          </motion.div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6" style={{ marginLeft: sidebarExpanded ? '224px' : '72px', transition: 'margin-left 0.3s' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (isGeneratingPdf) return;
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/proposals');
              }
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            data-testid="back-to-proposals-btn"
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
          <span className="text-slate-400 text-sm">Process Flowcharts & Database Architecture</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 shadow-lg shadow-teal-500/25 transition-all disabled:opacity-70"
              data-testid="download-pdf-btn"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isGeneratingPdf ? `${downloadProgress}%` : "Download PDF"}
              <ChevronDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
            <DropdownMenuItem onClick={handleDownload} className="cursor-pointer text-slate-200 hover:bg-slate-700 focus:bg-slate-700">
              <Download className="w-4 h-4 mr-2" />
              Download as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ${sidebarExpanded ? 'w-56' : 'w-[72px]'}`}
        style={{ backgroundColor: colors.navy }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col h-full py-6">
          {/* Logo */}
          <div className="px-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <span className="text-white font-bold text-lg">P</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2">
            {PAGES.map((page) => (
              <button
                key={page.id}
                onClick={() => goToPage(page.id)}
                className={`w-full flex items-center gap-3 py-3 px-3 rounded-xl transition-all relative ${
                  currentPage === page.id 
                    ? 'bg-teal-500/20 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {currentPage === page.id && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-teal-400 to-cyan-500"
                  />
                )}
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  currentPage === page.id 
                    ? 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-500/30' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {page.id}
                </span>
                {sidebarExpanded && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {page.title}
                  </motion.span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          {sidebarExpanded && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 pt-4 border-t border-slate-800"
            >
              <p className="text-slate-500 text-xs">IHS Towers Nigeria</p>
              <p className="text-slate-600 text-xs">February 2026</p>
            </motion.div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarExpanded ? 'ml-56' : 'ml-[72px]'} mt-14 transition-all duration-300`}>
        <div ref={contentRef}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="min-h-[calc(100vh-56px)]"
            >
              {currentPage === 1 && <TitleSection />}
              {currentPage === 2 && <ArchitectureSection />}
              {currentPage === 3 && <RFQFlowSection />}
              {currentPage === 4 && <VendorOnboardingSection />}
              {currentPage === 5 && <ReverseAuctionSection />}
              {currentPage === 6 && <DatabaseSection />}
              {currentPage === 7 && <DataUploadSection />}
              {currentPage === 8 && <NextStepsSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div 
        className="fixed bottom-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 px-6 py-4"
        style={{ left: sidebarExpanded ? '224px' : '72px', right: 0, transition: 'left 0.3s' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <motion.div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${(currentPage / 8) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 1 
                ? 'text-slate-600 cursor-not-allowed' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            data-testid="prev-page-btn"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {PAGES.map((page) => (
                <button
                  key={page.id}
                  onClick={() => goToPage(page.id)}
                  className={`h-2 rounded-full transition-all ${
                    currentPage === page.id 
                      ? 'w-8 bg-gradient-to-r from-teal-400 to-cyan-500' 
                      : 'w-2 bg-slate-700 hover:bg-slate-600'
                  }`}
                  data-testid={`page-dot-${page.id}`}
                />
              ))}
            </div>
            <span className="text-sm text-slate-400">
              <span className="text-white font-semibold">{currentPage}</span>/{8}
              <span className="text-slate-600 mx-2">·</span>
              <span className="text-slate-300">{PAGES[currentPage - 1].title}</span>
            </span>
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === 8}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 8 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 hover:from-teal-400 hover:to-cyan-400'
            }`}
            data-testid="next-page-btn"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== SECTION 1: TITLE ====================
const TitleSection = () => (
  <div className="min-h-[calc(100vh-56px)] flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)` }}>
    {/* Animated background elements */}
    <div className="absolute inset-0 overflow-hidden">
      {/* Floating circles */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute top-20 left-20 w-96 h-96 rounded-full border-2 border-teal-400/30"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
        className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full border-2 border-cyan-400/20"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-teal-500/20 to-transparent blur-3xl"
      />
      
      {/* Grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-5">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    {/* Content */}
    <div className="text-center z-10 px-8 max-w-4xl">
      {/* AI Icon */}
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-8"
      >
        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/40">
          <Bot className="w-14 h-14 text-white" />
        </div>
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-7xl font-bold text-white mb-6 tracking-tight"
      >
        Procure{" "}
        <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
          AI
        </span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="text-2xl text-slate-300 mb-6 font-light"
      >
        Process Flowcharts & Back-End Database Architecture
      </motion.p>
      
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="w-32 h-1 mx-auto mb-8 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500"
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="space-y-2"
      >
        <p className="text-slate-400 text-lg">IHS Towers Nigeria — Pre-Alignment Session</p>
        <p className="text-slate-500">February 2026</p>
      </motion.div>

      {/* Bottom badges */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="flex items-center justify-center gap-4 mt-12"
      >
        <div className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium flex items-center gap-2">
          <Lock className="w-4 h-4" />
          CONFIDENTIAL
        </div>
        <div className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 text-sm flex items-center gap-2">
          <span>Use</span>
          <ChevronLeft className="w-4 h-4" />
          <ChevronRight className="w-4 h-4" />
          <span>to navigate</span>
        </div>
      </motion.div>
    </div>
  </div>
);

// ==================== SECTION 2: ARCHITECTURE ====================
const ArchitectureSection = () => {
  const ihsSystems = [
    { name: "D365 ERP", icon: Building2, color: colors.blue },
    { name: "ServiceNow", icon: Settings, color: colors.purple },
    { name: "Azure Data Lake", icon: Database, color: colors.cyan },
    { name: "Lumen Contracts", icon: FileText, color: colors.orange },
    { name: "Active Directory", icon: Users, color: colors.pink },
  ];

  const procureModules = [
    { name: "RFQ Engine", icon: FileSearch, color: colors.teal },
    { name: "Vendor Portal", icon: Globe, color: colors.blue },
    { name: "Auction System", icon: Gavel, color: colors.purple },
    { name: "AI/ML Service", icon: Bot, color: colors.orange },
    { name: "Analytics", icon: BarChart3, color: colors.pink },
    { name: "Contract Mgmt", icon: FileCheck, color: colors.cyan },
  ];

  const dataStores = [
    { name: "Azure SQL", icon: Database },
    { name: "Cosmos DB", icon: Cloud },
    { name: "Redis Cache", icon: Zap },
    { name: "Blob Storage", icon: HardDrive },
  ];

  const externalApis = [
    { name: "Alibaba" },
    { name: "Global Sources" },
    { name: "Dun & Bradstreet" },
    { name: "Exchange Rates" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-10"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-3">High-Level System Architecture</h2>
          <p className="text-slate-500 text-lg">How Procure AI connects with IHS's existing infrastructure</p>
        </motion.div>

        {/* Main Architecture Diagram */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
          {/* IHS Systems */}
          <motion.div
            variants={fadeInLeft}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">IHS EXISTING SYSTEMS</h3>
                <p className="text-sm text-slate-500">Current infrastructure</p>
              </div>
            </div>
            <div className="space-y-3">
              {ihsSystems.map((system, i) => (
                <motion.div
                  key={system.name}
                  custom={i}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${system.color}15` }}>
                    <system.icon className="w-5 h-5" style={{ color: system.color }} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{system.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* API Integration Hub */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col items-center"
          >
            {/* Connection Lines */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="w-24 h-0.5 bg-gradient-to-r from-blue-400 to-teal-400 origin-left"
            />
            
            <div className="my-4 p-5 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-xl shadow-teal-500/30">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <RefreshCw className="w-8 h-8 text-white" />
              </div>
              <p className="text-white text-sm font-bold text-center">API Integration</p>
              <p className="text-white/80 text-xs text-center">Hub</p>
            </div>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="w-24 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400 origin-left"
            />
          </motion.div>

          {/* Procure AI Platform */}
          <motion.div
            variants={fadeInRight}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">PROCURE AI PLATFORM</h3>
                <p className="text-sm text-slate-500">New AI-powered solution</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {procureModules.map((module, i) => (
                <motion.div
                  key={module.name}
                  custom={i}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${module.color}15` }}>
                    <module.icon className="w-4 h-4" style={{ color: module.color }} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{module.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row - Data Stores & External APIs */}
        <div className="mt-8 grid grid-cols-2 gap-6">
          {/* Data Stores */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200"
          >
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-500" />
              Data Storage Layer
            </h4>
            <div className="flex gap-3">
              {dataStores.map((store, i) => (
                <motion.div
                  key={store.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.1, duration: 0.4 }}
                  className="flex-1 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-center"
                >
                  <store.icon className="w-5 h-5 text-teal-500 mx-auto mb-2" />
                  <span className="text-xs font-medium text-slate-600">{store.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* External APIs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200"
          >
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              External APIs
            </h4>
            <div className="flex gap-3">
              {externalApis.map((api, i) => (
                <motion.div
                  key={api.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3 + i * 0.1, duration: 0.4 }}
                  className="flex-1 p-3 rounded-xl bg-emerald-50 text-center"
                >
                  <Link className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                  <span className="text-xs font-medium text-slate-600">{api.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ==================== SECTION 3: RFQ FLOW ====================
const RFQFlowSection = () => {
  const steps = [
    { num: 1, title: "Business User Raises Request", icon: Users, color: colors.blue },
    { num: 2, title: "Scope Validation", icon: ClipboardCheck, color: colors.purple },
    { num: 3, title: "Budget & Approval Check", icon: Shield, color: colors.orange },
    { num: 4, title: "AI Vendor Discovery", icon: Bot, color: colors.teal },
    { num: 5, title: "RFQ Generation", icon: FileText, color: colors.cyan },
    { num: 6, title: "Vendor Bid Submission", icon: Upload, color: colors.pink },
    { num: 7, title: "AI Bid Evaluation", icon: Bot, color: colors.teal },
    { num: 8, title: "Technical & Financial Scoring", icon: BarChart3, color: colors.purple },
    { num: 9, title: "BAFO Round (if required)", icon: RefreshCw, color: colors.orange },
    { num: 10, title: "Award & Contract", icon: Award, color: colors.teal },
  ];

  const dbTables = ["rfq_requests", "rfq_line_items", "rfq_vendor_invitations", "vendor_bids", "bid_evaluations", "awards"];

  const integrations = [
    { system: "D365", action: "Budget validation, cost center lookup" },
    { system: "Azure Data Lake", action: "Historical pricing for AI scoring" },
    { system: "External APIs", action: "Vendor discovery (Alibaba, Global Sources)" },
    { system: "Lumen", action: "Contract generation after award" },
    { system: "ServiceNow", action: "Automated ticket creation on exceptions" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-3">Process Flow: RFQ / Tender Creation</h2>
          <p className="text-slate-500 text-lg">End-to-end flow from requirement to vendor award</p>
        </motion.div>

        {/* Flow Steps */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 mb-6"
        >
          <div className="grid grid-cols-5 gap-4">
            {steps.slice(0, 5).map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={scaleIn}
                className="relative"
              >
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all hover:scale-105">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                    style={{ backgroundColor: step.color }}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <p className="text-xs font-medium text-slate-700 leading-tight">{step.title}</p>
                </div>
                {i < 4 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                    className="absolute top-1/2 -right-2 w-4 h-0.5 bg-teal-400 origin-left"
                  />
                )}
              </motion.div>
            ))}
          </div>
          
          {/* Arrow down */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="flex justify-end my-4 pr-20"
          >
            <ArrowDown className="w-6 h-6 text-teal-500" />
          </motion.div>

          <div className="grid grid-cols-5 gap-4">
            {steps.slice(5, 10).map((step, i) => (
              <motion.div
                key={step.num}
                custom={i + 5}
                variants={scaleIn}
                className="relative"
              >
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all hover:scale-105">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                    style={{ backgroundColor: step.color }}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <p className="text-xs font-medium text-slate-700 leading-tight">{step.title}</p>
                </div>
                {i < 4 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 1.2 + i * 0.1, duration: 0.3 }}
                    className="absolute top-1/2 -right-2 w-4 h-0.5 bg-teal-400 origin-left"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Database Tables */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200"
          >
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-500" />
              Key Database Tables
            </h4>
            <div className="flex flex-wrap gap-2">
              {dbTables.map((table, i) => (
                <motion.span
                  key={table}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.7 + i * 0.05, duration: 0.3 }}
                  className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-mono"
                >
                  {table}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Integration Points */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200"
          >
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Link className="w-4 h-4 text-emerald-500" />
              Integration Points
            </h4>
            <div className="space-y-2">
              {integrations.map((int, i) => (
                <motion.div
                  key={int.system}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.8 + i * 0.1, duration: 0.3 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="font-bold text-emerald-600 w-28">{int.system}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-600">{int.action}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ==================== SECTION 4: VENDOR ONBOARDING ====================
const VendorOnboardingSection = () => {
  const vendorSteps = [
    { num: 1, title: "Self-Registration", desc: "Portal / Invite Link", icon: Users },
    { num: 2, title: "Upload Documents", desc: "Company Profile & Docs", icon: Upload },
    { num: 3, title: "Due Diligence Forms", desc: "Complete all forms", icon: ClipboardCheck },
    { num: 4, title: "Accept T&C", desc: "Terms & Conditions", icon: FileCheck },
  ];

  const aiSteps = [
    { num: 5, title: "AI Profile Enrichment", icon: Bot },
    { num: 6, title: "Document Verification", icon: FileSearch },
    { num: 7, title: "Risk & Compliance", icon: Shield },
    { num: 8, title: "Vendor Scoring", icon: BarChart3 },
  ];

  const ihsSteps = [
    { num: 9, title: "Review & Approve", icon: CheckCircle2 },
    { num: 10, title: "Category Assignment", icon: Layers },
    { num: 11, title: "D365 Sync", icon: RefreshCw },
  ];

  const dbTables = ["vendors", "vendor_contacts", "vendor_documents", "vendor_compliance", "vendor_categories", "vendor_risk_scores", "vendor_bank_details"];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-3">Process Flow: Vendor Registration & Onboarding</h2>
          <p className="text-slate-500 text-lg">Self-service registration through to D365 sync</p>
        </motion.div>

        {/* Swimlane Diagram */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Vendor Actions Lane */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 border-b border-slate-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">VENDOR ACTIONS</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {vendorSteps.map((step, i) => (
                <motion.div
                  key={step.num}
                  custom={i}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center text-center p-4 rounded-xl bg-blue-50 relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center mb-3">
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <p className="text-xs font-semibold text-slate-800">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
                  {i < 3 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="absolute top-1/2 -right-2 w-4 h-0.5 bg-blue-400"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI Automated Lane */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="p-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-slate-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">PROCURE AI (AUTOMATED)</h3>
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">AI-Powered</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {aiSteps.map((step, i) => (
                <motion.div
                  key={step.num}
                  custom={i + 4}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center text-center p-4 rounded-xl bg-white shadow-sm relative"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mb-3"
                  >
                    <step.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <p className="text-xs font-semibold text-slate-800">{step.title}</p>
                  {i < 3 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 + i * 0.1 }}
                      className="absolute top-1/2 -right-2 w-4 h-0.5 bg-teal-400"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* IHS Procurement Lane */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">IHS PROCUREMENT</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {ihsSteps.map((step, i) => (
                <motion.div
                  key={step.num}
                  custom={i + 8}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center text-center p-4 rounded-xl bg-emerald-50 relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center mb-3">
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <p className="text-xs font-semibold text-slate-800">{step.title}</p>
                  {i < 2 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5 + i * 0.1 }}
                      className="absolute top-1/2 -right-2 w-4 h-0.5 bg-emerald-400"
                    />
                  )}
                </motion.div>
              ))}
              {/* Success indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2, duration: 0.5, type: "spring" }}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 border-2 border-green-200"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                <p className="text-xs font-bold text-green-700">Vendor Active</p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Database Tables */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.5 }}
          className="mt-6 bg-white rounded-2xl p-5 shadow-lg border border-slate-200"
        >
          <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-500" />
            Database Tables
          </h4>
          <div className="flex flex-wrap gap-2">
            {dbTables.map((table, i) => (
              <motion.span
                key={table}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.4 + i * 0.05, duration: 0.3 }}
                className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-mono"
              >
                {table}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SECTION 5: REVERSE AUCTION ====================
const ReverseAuctionSection = () => {
  const steps = [
    { num: 1, title: "Asset Listed for Disposal", desc: "Finance team validates asset for sale", icon: Package, color: colors.blue },
    { num: 2, title: "Vendor Invitation", desc: "Pre-qualified buyers notified via portal", icon: Users, color: colors.purple },
    { num: 3, title: "Inspection Period", desc: "Vendors inspect assets onsite or via photos", icon: Eye, color: colors.orange },
    { num: 4, title: "Live Bidding Rounds", desc: "Real-time competitive bidding with AI floor", icon: Timer, color: colors.teal },
    { num: 5, title: "Winner Determination", desc: "Highest bid verified against reserve price", icon: Award, color: colors.pink },
    { num: 6, title: "Payment & Collection", desc: "Invoice generated, asset handover", icon: CreditCard, color: colors.cyan },
  ];

  const techStack = [
    { name: "WebSocket connections", desc: "Live bid updates", icon: Zap },
    { name: "Azure SignalR Service", desc: "Real-time broadcast", icon: RefreshCw },
    { name: "Redis cache", desc: "Bid queue & leaderboard", icon: Database },
    { name: "AI reserve price", desc: "Historical data analysis", icon: Bot },
    { name: "Audit trail", desc: "Every bid immutably logged", icon: FileCheck },
  ];

  const dbTables = ["auctions", "auction_lots", "auction_bids", "auction_invitations", "auction_results"];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-3">Process Flow: Reverse Auction</h2>
          <p className="text-slate-500 text-lg">Asset disposal through competitive bidding</p>
        </motion.div>

        {/* Process Flow */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 mb-6"
        >
          <div className="grid grid-cols-6 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={scaleIn}
                className="relative"
              >
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all hover:scale-105 h-full">
                  <motion.div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
                    style={{ backgroundColor: step.color }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <step.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
                {i < 5 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                    className="absolute top-1/3 -right-2 w-4"
                  >
                    <ArrowRight className="w-4 h-4 text-teal-400" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Real-Time Bidding Architecture */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 shadow-xl text-white"
          >
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Real-Time Bidding Architecture
            </h4>
            <div className="space-y-3">
              {techStack.map((tech, i) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4 + i * 0.1, duration: 0.3 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <tech.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tech.name}</p>
                    <p className="text-xs text-white/70">{tech.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Database Tables */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
          >
            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-500" />
              Database Tables
            </h4>
            <div className="space-y-3">
              {dbTables.map((table, i) => (
                <motion.div
                  key={table}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 + i * 0.1, duration: 0.3 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Database className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-sm font-mono text-slate-700">{table}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ==================== SECTION 6: DATABASE ARCHITECTURE ====================
const DatabaseSection = () => {
  const databases = [
    {
      name: "AZURE SQL DATABASE",
      icon: Database,
      color: colors.blue,
      desc: "Transactional Data",
      tables: ["vendors", "items", "rfq_requests", "rfq_line_items", "vendor_bids", "awards", "purchase_orders", "contracts", "approvals"]
    },
    {
      name: "AZURE COSMOS DB",
      icon: Cloud,
      color: colors.purple,
      desc: "Vendor Profiles & Documents",
      tables: ["vendor_profiles (JSON)", "vendor_documents", "audit_logs", "activity_feeds", "notifications", "chat_history"]
    },
    {
      name: "AZURE DATA LAKE",
      icon: Layers,
      color: colors.cyan,
      desc: "Analytics & ML Training",
      tables: ["historical_po_data", "spend_analytics", "price_trends", "vendor_performance", "demand_forecasting"]
    },
    {
      name: "AZURE BLOB STORAGE",
      icon: HardDrive,
      color: colors.orange,
      desc: "Files & Attachments",
      tables: ["vendor_certificates", "rfq_attachments", "bid_docs", "contract_documents", "auction_photos"]
    }
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-3">Back-End Database Architecture</h2>
          <p className="text-slate-500 text-lg">Core data domains and storage strategy</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          {databases.map((db, i) => (
            <motion.div
              key={db.name}
              custom={i}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100" style={{ backgroundColor: `${db.color}08` }}>
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: db.color }}
                  >
                    <db.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{db.name}</h3>
                    <p className="text-xs text-slate-500">{db.desc}</p>
                  </div>
                </div>
              </div>

              {/* Tables */}
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {db.tables.map((table, j) => (
                    <motion.span
                      key={table}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.2 + j * 0.05, duration: 0.3 }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono"
                      style={{ backgroundColor: `${db.color}10`, color: db.color }}
                    >
                      {table}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== SECTION 7: DATA UPLOAD ====================
const DataUploadSection = () => {
  const dataSets = [
    { name: "Vendor Master", format: "CSV / XLSX", volume: "2,000–5,000", source: "D365", priority: "P1", priorityColor: colors.teal },
    { name: "Category Master", format: "CSV / XLSX", volume: "100–300", source: "D365 / Manual", priority: "P1", priorityColor: colors.teal },
    { name: "Item Catalogue", format: "CSV / XLSX", volume: "5,000–15,000", source: "D365 / Readcube", priority: "P1", priorityColor: colors.teal },
    { name: "Historical POs", format: "CSV / XLSX", volume: "50,000–200,000", source: "D365", priority: "P2", priorityColor: colors.orange },
    { name: "Vendor Compliance", format: "CSV + PDF", volume: "5,000–15,000", source: "Manual / Drive", priority: "P2", priorityColor: colors.orange },
  ];

  const fileSpecs = [
    { label: "Encoding", value: "UTF-8" },
    { label: "Date format", value: "YYYY-MM-DD" },
    { label: "Decimal separator", value: "period (.)" },
    { label: "Boolean", value: "TRUE / FALSE" },
    { label: "Currency codes", value: "ISO 4217 (NGN, USD, EUR)" },
    { label: "Country codes", value: "ISO 3166-1 Alpha-3" },
  ];

  const loadOrder = [
    { num: 1, name: "Category Master", deps: "no dependencies" },
    { num: 2, name: "Vendor Master", deps: "refs: Category" },
    { num: 3, name: "Item Catalogue", deps: "refs: Category, Vendor" },
    { num: 4, name: "Historical POs", deps: "refs: Vendor, Item" },
    { num: 5, name: "Vendor Compliance", deps: "refs: Vendor" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-3">Bulk Data Upload: Format Requirements</h2>
          <p className="text-slate-500 text-lg">What IHS needs to prepare for initial data migration</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {/* Data Sets Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-500" />
                Data Set Requirements
              </h3>
            </div>
            <div className="p-5">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="text-left pb-3">Data Set</th>
                    <th className="text-left pb-3">Format</th>
                    <th className="text-left pb-3">Est. Volume</th>
                    <th className="text-left pb-3">Source</th>
                    <th className="text-left pb-3">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSets.map((ds, i) => (
                    <motion.tr
                      key={ds.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                      className="border-t border-slate-100"
                    >
                      <td className="py-3 text-sm font-medium text-slate-800">{ds.name}</td>
                      <td className="py-3 text-sm text-slate-600">{ds.format}</td>
                      <td className="py-3 text-sm text-slate-600">{ds.volume}</td>
                      <td className="py-3 text-sm text-slate-600">{ds.source}</td>
                      <td className="py-3">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: ds.priorityColor }}
                        >
                          {ds.priority}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* File Format Specs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                File Format Specs
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {fileSpecs.map((spec, i) => (
                <motion.div
                  key={spec.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                >
                  <span className="text-xs text-slate-500">{spec.label}</span>
                  <span className="text-xs font-mono text-slate-800">{spec.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Load Order */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl p-6 shadow-xl"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Upload Load Order (Critical Dependencies)
          </h3>
          <div className="flex items-center gap-4">
            {loadOrder.map((item, i) => (
              <motion.div
                key={item.num}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.15, duration: 0.4 }}
                className="flex-1"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="w-8 h-8 rounded-full bg-white text-teal-600 font-bold flex items-center justify-center mx-auto mb-2">
                    {item.num}
                  </div>
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-white/70 mt-1">{item.deps}</p>
                </div>
                {i < loadOrder.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                    className="flex justify-center mt-2"
                  >
                    <ArrowRight className="w-5 h-5 text-white/50" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SECTION 8: NEXT STEPS ====================
const NextStepsSection = () => {
  const steps = [
    { num: 1, title: "IHS to extract D365 vendor master data", desc: "Using provided CSV/XLSX templates", icon: Database, color: colors.blue },
    { num: 2, title: "IHS to compile category taxonomy", desc: "3-level hierarchy with CapEx/OpEx classification", icon: Layers, color: colors.purple },
    { num: 3, title: "IHS IT to confirm API access", desc: "D365, ServiceNow, Azure Data Lake endpoints", icon: Link, color: colors.orange },
    { num: 4, title: "Joint session to validate flowcharts", desc: "Confirm process alignment with current operations", icon: Users, color: colors.pink },
    { num: 5, title: "Procure AI team to deliver staging environment", desc: "For test uploads and validation ahead of go-live", icon: Server, color: colors.cyan },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)` }}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          transition={{ duration: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-teal-500 to-transparent blur-3xl"
        />
      </div>

      <div className="max-w-5xl mx-auto px-8 z-10">
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-10"
        >
          <h2 className="text-5xl font-bold text-white mb-4">Next Steps</h2>
          <p className="text-slate-400 text-lg">Action items for successful implementation</p>
        </motion.div>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              custom={i}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="flex items-center gap-5 p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
            >
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 10 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: step.color }}
              >
                <step.icon className="w-7 h-7 text-white" />
              </motion.div>
              <div className="w-10 h-10 rounded-full bg-white/10 text-white font-bold flex items-center justify-center">
                {step.num}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.desc}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-slate-600" />
            </motion.div>
          ))}
        </div>

        {/* Target Date */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-10 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/30">
            <Target className="w-6 h-6 text-teal-400" />
            <span className="text-white font-semibold">Target:</span>
            <span className="text-teal-300">All data templates populated by 28 February 2026</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProcureAIProposalV2;
