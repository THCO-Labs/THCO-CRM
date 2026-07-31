import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import html2pdf from "html2pdf.js";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Download,
  Server,
  FileJson,
  Cloud,
  HardDrive,
  Check,
  ArrowRight,
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
  ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const PAGES = [
  { id: 1, title: "Overview", label: "Title" },
  { id: 2, title: "Architecture", label: "System" },
  { id: 3, title: "RFQ Flow", label: "Process" },
  { id: 4, title: "Vendor Onboarding", label: "Onboard" },
  { id: 5, title: "Reverse Auction", label: "Auction" },
  { id: 6, title: "Database", label: "Data" },
  { id: 7, title: "Data Upload", label: "Upload" },
  { id: 8, title: "Next Steps", label: "Action" },
];

// Color palette
const colors = {
  navy: "#1E2761",
  teal: "#0D9488",
  iceBlue: "#CADCFC",
  slate: "#0F172A",
  lightGray: "#F8FAFC",
  white: "#FFFFFF",
};

const ProcureAIProposal = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
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
      if (isGeneratingPdf) return; // Disable keyboard nav during PDF generation
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, isGeneratingPdf]);

  // Sleep function for delays
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const [captureInProgress, setCaptureInProgress] = useState(false);

  const handleDownload = async () => {
    setIsGeneratingPdf(true);
    setDownloadProgress(0);
    setDownloadStatus('Preparing document...');
    
    const originalPage = currentPage;
    const totalPages = 8;
    const pageNames = ['Overview', 'Architecture', 'RFQ Flow', 'Vendor Onboarding', 'Reverse Auction', 'Database', 'Data Upload', 'Next Steps'];
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // PDF dimensions (landscape letter size in pixels at 96 DPI)
      const pdfWidth = 1056; // 11 inches * 96
      const pdfHeight = 816; // 8.5 inches * 96
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      // Capture each page - we need to show the overlay between captures
      for (let i = 1; i <= totalPages; i++) {
        // Update progress - this WILL show because we're not hiding it yet
        const progressPercent = Math.round(((i - 1) / totalPages) * 85);
        setDownloadProgress(progressPercent);
        setDownloadStatus(`Capturing page ${i}/${totalPages}: ${pageNames[i-1]}...`);
        console.log(`PDF: Navigating to page ${i}/${totalPages}: ${pageNames[i-1]}`);
        
        // Navigate to the page
        setDirection(0);
        setCurrentPage(i);
        
        // CRITICAL: Wait 7 seconds for ALL animations to complete
        // This includes Framer Motion page transitions AND internal section animations
        await sleep(7000);
        
        console.log(`PDF: Starting capture of page ${i}`);
        
        // NOW hide overlay and UI for capture
        setCaptureInProgress(true);
        await sleep(300); // Let React hide the overlay
        
        // Hide sidebar, header, and bottom nav
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
        
        await sleep(200); // Let styles apply
        
        // Capture the content
        if (contentRef.current) {
          try {
            const canvas = await html2canvas(contentRef.current, {
              scale: 2,
              useCORS: true,
              logging: true,
              backgroundColor: i === 1 || i === 8 ? '#1E2761' : '#F8FAFC',
              width: 1400,
              height: 850,
              windowWidth: 1400,
              windowHeight: 850,
              scrollX: 0,
              scrollY: 0,
              allowTaint: true,
              foreignObjectRendering: false,
              ignoreElements: (element) => {
                // Ignore progress overlay and fixed elements
                if (element.hasAttribute('data-pdf-overlay')) return true;
                if (element.classList?.contains('fixed') && element.classList?.contains('inset-0')) return true;
                return false;
              }
            });
            
            console.log(`PDF: Page ${i} captured, canvas size: ${canvas.width}x${canvas.height}`);
            
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            
            if (i > 1) {
              pdf.addPage([pdfWidth, pdfHeight], 'landscape');
            }
            
            // Add image with proper scaling to fit page
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const scaledWidth = imgWidth * ratio;
            const scaledHeight = imgHeight * ratio;
            const xOffset = (pdfWidth - scaledWidth) / 2;
            const yOffset = (pdfHeight - scaledHeight) / 2;
            
            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, scaledWidth, scaledHeight);
            console.log(`PDF: Page ${i} added to PDF`);
          } catch (captureError) {
            console.error(`Error capturing page ${i}:`, captureError);
          }
        }
        
        // Restore UI elements after each capture
        if (sidebar) sidebar.style.cssText = originalStyles.sidebar || '';
        if (header) header.style.cssText = originalStyles.header || '';
        bottomNav.forEach(el => el.style.display = '');
        if (mainContent) mainContent.style.cssText = originalStyles.main || '';
        
        // Show overlay again for progress display
        setCaptureInProgress(false);
        await sleep(100);
      }
      
      setDownloadProgress(92);
      setDownloadStatus('Finalizing PDF...');
      await sleep(1000);
      
      // Save the PDF
      console.log('PDF: Saving document...');
      pdf.save('Procure-AI-Presentation.pdf');
      
      setDownloadProgress(100);
      setDownloadStatus('Download complete!');
      await sleep(1500);
      
      // Restore original page
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
    <div className="min-h-screen bg-white flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Download Progress Overlay - Hidden during actual capture */}
      {isGeneratingPdf && !captureInProgress && (
        <div data-pdf-overlay className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[500px]"
          >
            <div className="text-center mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.teal}20` }}
              >
                <Loader2 className="w-8 h-8" style={{ color: colors.teal }} />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Generating PDF</h3>
              <p className="text-gray-500 text-sm">{downloadStatus}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-bold" style={{ color: colors.teal }}>{downloadProgress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ 
                    background: `linear-gradient(90deg, ${colors.teal}, ${colors.navy})`,
                    width: `${downloadProgress}%`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            
            {/* Page indicator */}
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
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4" style={{ marginLeft: sidebarExpanded ? '224px' : '64px', transition: 'margin-left 0.3s' }}>
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            onClick={() => {
              if (isGeneratingPdf) return;
              // Try to go back in history, fallback to proposals page
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/proposals');
              }
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors mr-2"
            data-testid="back-to-proposals-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-gray-300">|</span>
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: colors.teal }}>
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-gray-700 font-medium text-sm">Procure AI | Process Flowcharts</span>
        </div>
        
        {/* Download Button with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70"
              style={{ backgroundColor: colors.teal }}
              data-testid="download-pdf-btn"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isGeneratingPdf ? `${downloadProgress}%` : "Download"}
              <ChevronDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleDownload} className="cursor-pointer">
              <Download className="w-4 h-4 mr-2" />
              Download as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ${sidebarExpanded ? 'w-56' : 'w-16'}`}
        style={{ backgroundColor: colors.navy }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col h-full py-6">
          {/* Logo */}
          <div className="px-4 mb-8">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: colors.teal }}>
              <span className="text-white font-bold text-sm">P</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {PAGES.map((page) => (
              <button
                key={page.id}
                onClick={() => goToPage(page.id)}
                className={`w-full flex items-center gap-3 py-2.5 transition-all relative ${
                  currentPage === page.id 
                    ? 'bg-white/5' 
                    : 'hover:bg-white/5'
                }`}
                style={{ paddingLeft: sidebarExpanded ? '16px' : '20px' }}
              >
                {/* Teal accent line for active page */}
                {currentPage === page.id && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: colors.teal }}
                  />
                )}
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentPage === page.id 
                    ? 'text-white' 
                    : 'text-white/50'
                }`} style={{ 
                  backgroundColor: currentPage === page.id ? colors.teal : 'transparent',
                  border: currentPage === page.id ? 'none' : '1px solid rgba(255,255,255,0.2)'
                }}>
                  {page.id}
                </span>
                {sidebarExpanded && (
                  <span className={`text-sm ${currentPage === page.id ? 'text-white' : 'text-white/50'}`}>
                    {page.title}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          {sidebarExpanded && (
            <div className="px-4 pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs">IHS Towers Nigeria</p>
              <p className="text-white/30 text-xs">February 2026</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarExpanded ? 'ml-56' : 'ml-16'} mt-12 transition-all duration-300`}>
        <div ref={contentRef}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="min-h-[calc(100vh-48px)]"
            >
              {currentPage === 1 && <HeroSection />}
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
        className="fixed bottom-0 z-40 bg-white border-t border-gray-200 px-6 py-4"
        style={{ left: sidebarExpanded ? '224px' : '64px', right: 0, transition: 'left 0.3s' }}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${(currentPage / 8) * 100}%`,
              background: `linear-gradient(90deg, ${colors.teal}, ${colors.navy})`
            }}
          />
        </div>

        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Previous */}
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            data-testid="prev-page-btn"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          {/* Page Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {PAGES.map((page) => (
                <button
                  key={page.id}
                  onClick={() => goToPage(page.id)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentPage === page.id 
                      ? 'w-6 bg-teal-500' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  data-testid={`page-dot-${page.id}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {currentPage}/{8}<span className="text-gray-400">·</span><span className="text-gray-700">{PAGES[currentPage - 1].title}</span>
            </span>
          </div>

          {/* Next */}
          <button
            onClick={nextPage}
            disabled={currentPage === 8}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 8 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-white'
            }`}
            style={{ 
              backgroundColor: currentPage === 8 ? '#e5e7eb' : colors.teal
            }}
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

// Section 1: Hero
const HeroSection = () => (
  <div className="min-h-screen flex items-center justify-center relative" style={{ backgroundColor: colors.navy }}>
    {/* Top Accent Line */}
    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colors.teal }} />
    
    {/* Decorative Circles */}
    <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-teal-500/20" />
    <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full border border-teal-500/10" />
    
    {/* Content */}
    <div className="text-center z-10 px-8">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-7xl font-bold text-white mb-6"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        Procure AI
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-2xl mb-8"
        style={{ color: colors.iceBlue }}
      >
        Process Flowcharts & Back-End Database Architecture
      </motion.p>
      
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="w-20 h-1 mx-auto mb-8"
        style={{ backgroundColor: colors.teal }}
      />
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-gray-400 mb-2"
      >
        IHS Towers Nigeria — Pre-Alignment Session
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="text-gray-500 text-sm"
      >
        February 2026
      </motion.p>
    </div>
    
    {/* Confidential Badge */}
    <div className="absolute bottom-8 left-8 text-teal-500 text-xs tracking-widest uppercase">
      Confidential
    </div>
    
    {/* Keyboard Hint */}
    <div className="absolute bottom-8 right-8 flex items-center gap-2 text-gray-500 text-sm">
      Use
      <kbd className="px-2 py-1 bg-white/10 rounded text-white text-xs">←</kbd>
      <kbd className="px-2 py-1 bg-white/10 rounded text-white text-xs">→</kbd>
      to navigate
    </div>
  </div>
);

// Section 2: Architecture
const ArchitectureSection = () => {
  // Thin Bidirectional Arrow SVG - shows flow going both directions (left and right)
  const ThinBidirectionalArrow = ({ delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="flex flex-col items-center justify-center"
    >
      <svg width="100" height="50" viewBox="0 0 100 50">
        <defs>
          <linearGradient id={`gradRight-${delay}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.teal} />
            <stop offset="100%" stopColor={colors.navy} />
          </linearGradient>
          <linearGradient id={`gradLeft-${delay}`} x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.navy} />
            <stop offset="100%" stopColor={colors.teal} />
          </linearGradient>
        </defs>
        
        {/* Right arrow (top) - pointing right */}
        <motion.line
          x1="10" y1="18" x2="80" y2="18"
          stroke={`url(#gradRight-${delay})`}
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.5 }}
        />
        <motion.polygon
          points="78,12 90,18 78,24"
          fill={colors.navy}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5 }}
        />
        
        {/* Left arrow (bottom) - pointing left */}
        <motion.line
          x1="90" y1="32" x2="20" y2="32"
          stroke={`url(#gradLeft-${delay})`}
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.4, duration: 0.5 }}
        />
        <motion.polygon
          points="22,26 10,32 22,38"
          fill={colors.teal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.7 }}
        />
        
        {/* Animated dot going right */}
        <motion.circle
          r="4"
          fill={colors.teal}
          initial={{ cx: 10, cy: 18, opacity: 0.8 }}
          animate={{ cx: [10, 85, 10], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: delay + 1 }}
        />
        {/* Animated dot going left */}
        <motion.circle
          r="4"
          fill={colors.navy}
          initial={{ cx: 90, cy: 32, opacity: 0.8 }}
          animate={{ cx: [90, 15, 90], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: delay + 1.5 }}
        />
      </svg>
      <span className="text-xs text-gray-400 mt-1">← Data Sync →</span>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Fraunces', serif" }}>
            High-Level System Architecture
          </h2>
          <p className="text-gray-500 mb-12">How Procure AI connects with IHS's existing infrastructure</p>
        </motion.div>

        <div className="grid grid-cols-5 gap-4 items-center">
          {/* Left Column - IHS Systems */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-1 space-y-3"
          >
            <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.navy }}>
              IHS EXISTING SYSTEMS
            </div>
            {["D365 ERP", "ServiceNow", "Azure Data Lake", "Lumen Contracts", "Active Directory"].map((system, i) => (
              <motion.div 
                key={system}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
                className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2"
              >
                <Server className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700 text-sm">{system}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Left Bidirectional Arrows */}
          <div className="col-span-1 flex items-center justify-center">
            <ThinBidirectionalArrow delay={0.5} />
          </div>

          {/* Center - API Hub */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="col-span-1 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <motion.div 
                className="w-36 h-36 rounded-2xl flex items-center justify-center text-white font-semibold text-center shadow-xl"
                style={{ backgroundColor: colors.teal }}
                animate={{ 
                  boxShadow: [
                    `0 0 20px ${colors.teal}40`,
                    `0 0 60px ${colors.teal}60`,
                    `0 0 20px ${colors.teal}40`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-8 h-8 mx-auto mb-2" />
                  </motion.div>
                  <span className="text-sm">API Integration Hub</span>
                </div>
              </motion.div>
              {/* Pulse rings */}
              <motion.div 
                className="absolute inset-0 rounded-2xl border-2 border-teal-400"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="absolute inset-0 rounded-2xl border-2 border-teal-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Right Bidirectional Arrows */}
          <div className="col-span-1 flex items-center justify-center">
            <ThinBidirectionalArrow delay={0.7} />
          </div>

          {/* Right Column - Procure AI */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-1"
          >
            <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.teal }}>
              PROCURE AI PLATFORM
            </div>
            <div className="bg-white p-3 rounded-b-xl border border-gray-200 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "RFQ Engine", color: "#059669" },
                  { name: "Vendor Portal", color: "#2563EB" },
                  { name: "Auction System", color: "#EA580C" },
                  { name: "AI/ML Service", color: colors.navy },
                  { name: "Analytics", color: colors.teal },
                  { name: "Contract Mgmt", color: "#64748B" },
                ].map((module, i) => (
                  <motion.div 
                    key={module.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                    whileHover={{ scale: 1.05, boxShadow: `0 5px 20px ${module.color}40` }}
                    className="p-2 rounded-lg text-white text-xs font-medium text-center cursor-pointer"
                    style={{ backgroundColor: module.color }}
                  >
                    {module.name}
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
                Azure SQL | Cosmos DB | Redis | Blob
              </div>
            </div>
          </motion.div>
        </div>

        {/* External APIs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.01 }}
          className="mt-8 p-4 rounded-xl text-center"
          style={{ backgroundColor: '#FEF3C7' }}
        >
          <motion.span 
            className="text-orange-800 font-medium"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🌐 External APIs: Alibaba | Global Sources | Dun & Bradstreet | Exchange Rates
          </motion.span>
        </motion.div>
      </div>
    </div>
  );
};

// Section 3: RFQ Flow
const RFQFlowSection = () => {
  const row1Steps = [
    { num: 1, label: "Business User Raises Request", color: "#2563EB" },
    { num: 2, label: "Scope Validation", color: colors.teal },
    { num: 3, label: "Budget & Approval Check", color: "#EA580C" },
    { num: 4, label: "AI Vendor Discovery", color: "#059669" },
    { num: 5, label: "RFQ Generation", color: colors.navy },
  ];
  
  const row2Steps = [
    { num: 6, label: "Vendor Bid Submission", color: "#2563EB" },
    { num: 7, label: "AI Bid Evaluation", color: "#059669" },
    { num: 8, label: "Technical & Financial Scoring", color: colors.teal },
    { num: 9, label: "BAFO Round (if required)", color: "#EA580C" },
    { num: 10, label: "Award & Contract", color: colors.navy },
  ];

  // Thin Animated Arrow Component
  const ThinAnimatedArrow = ({ delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="flex items-center justify-center mx-1"
    >
      <svg width="32" height="16" viewBox="0 0 32 16">
        <defs>
          <linearGradient id={`thinGrad-${delay}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.teal} />
            <stop offset="100%" stopColor={colors.navy} />
          </linearGradient>
          <marker id={`thinArrowHead-${delay}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0 L0,5 L5,2.5 z" fill={colors.teal} />
          </marker>
        </defs>
        <motion.path
          d="M2,8 L24,8"
          stroke={`url(#thinGrad-${delay})`}
          strokeWidth="1.5"
          fill="none"
          markerEnd={`url(#thinArrowHead-${delay})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4 }}
        />
      </svg>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-12 pb-24 overflow-hidden" style={{ backgroundColor: colors.lightGray }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Fraunces', serif" }}>
            Process Flow: RFQ / Tender Creation
          </h2>
          <p className="text-gray-500 mb-12">End-to-end flow from requirement to vendor award</p>
        </motion.div>

        {/* Flow Rows */}
        <div className="space-y-4">
          {/* Row 1 */}
          <div className="flex items-center justify-center">
            {row1Steps.map((step, i) => (
              <div key={step.num} className="flex items-center">
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.15, type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center w-36"
                >
                  <motion.div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-3 shadow-lg"
                    style={{ backgroundColor: step.color }}
                    whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${step.color}60` }}
                    animate={{ 
                      boxShadow: [`0 0 0px ${step.color}40`, `0 0 15px ${step.color}40`, `0 0 0px ${step.color}40`]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {step.num}
                  </motion.div>
                  <motion.div 
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center w-full"
                    whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                  >
                    <span className="text-xs font-medium text-gray-700">{step.label}</span>
                  </motion.div>
                </motion.div>
                {i < 4 && <ThinAnimatedArrow delay={i * 0.15 + 0.3} />}
              </div>
            ))}
          </div>

          {/* Curved Connector from Step 5 to Step 6 */}
          <div className="flex justify-end pr-16">
            <motion.svg 
              width="50" height="50" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <defs>
                <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.teal} />
                  <stop offset="100%" stopColor={colors.navy} />
                </linearGradient>
                <marker id="curveArrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L0,5 L5,2.5 z" fill={colors.navy} />
                </marker>
              </defs>
              <motion.path
                d="M25,5 L25,25 L5,25 L5,45"
                stroke="url(#curveGrad)"
                strokeWidth="1.5"
                fill="none"
                markerEnd="url(#curveArrow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              />
            </motion.svg>
          </div>

          {/* Row 2 */}
          <div className="flex items-center justify-center">
            {row2Steps.map((step, i) => (
              <div key={step.num} className="flex items-center">
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.15, type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center w-36"
                >
                  <motion.div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-3 shadow-lg"
                    style={{ backgroundColor: step.color }}
                    whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${step.color}60` }}
                    animate={{ 
                      boxShadow: [`0 0 0px ${step.color}40`, `0 0 15px ${step.color}40`, `0 0 0px ${step.color}40`]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  >
                    {step.num}
                  </motion.div>
                  <motion.div 
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center w-full"
                    whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                  >
                    <span className="text-xs font-medium text-gray-700">{step.label}</span>
                  </motion.div>
                </motion.div>
                {i < 4 && <ThinAnimatedArrow delay={1.2 + i * 0.15 + 0.3} />}
              </div>
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-6 mt-12">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2, type: "spring" }}
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" style={{ color: colors.teal }} />
              Key Database Tables
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><code className="bg-gray-100 px-1 rounded">rfq_requests</code> — Stores all RFQ/RFP metadata</li>
              <li><code className="bg-gray-100 px-1 rounded">rfq_line_items</code> — Individual items per RFQ</li>
              <li><code className="bg-gray-100 px-1 rounded">vendor_bids</code> — Submitted bid details and pricing</li>
              <li><code className="bg-gray-100 px-1 rounded">bid_evaluations</code> — Scoring (technical, financial, risk)</li>
              <li><code className="bg-gray-100 px-1 rounded">awards</code> — Final vendor selection and award details</li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.1, type: "spring" }}
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" style={{ color: colors.teal }} />
              Integration Points
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>D365 → Budget validation, cost center lookup</li>
              <li>Azure Data Lake → Historical pricing for AI scoring</li>
              <li>External APIs → Vendor discovery (Alibaba, Global Sources)</li>
              <li>Lumen → Contract generation after award</li>
              <li>ServiceNow → Automated ticket creation on exceptions</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Section 4: Vendor Onboarding
const VendorOnboardingSection = () => {
  // Horizontal Arrow between lanes
  const LaneArrow = ({ delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="absolute top-1/2 -right-8 transform -translate-y-1/2 z-10"
    >
      <svg width="60" height="40" viewBox="0 0 60 40">
        <defs>
          <linearGradient id={`laneArrow-${delay}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.teal} />
            <stop offset="100%" stopColor={colors.navy} />
          </linearGradient>
          <marker id={`laneHead-${delay}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L0,8 L8,4 z" fill={colors.navy} />
          </marker>
        </defs>
        <motion.path
          d="M5,20 L45,20"
          stroke={`url(#laneArrow-${delay})`}
          strokeWidth="4"
          fill="none"
          markerEnd={`url(#laneHead-${delay})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.5 }}
        />
        {/* Animated pulse dot */}
        <motion.circle
          r="5"
          fill={colors.teal}
          initial={{ cx: 5, cy: 20 }}
          animate={{ cx: [5, 45, 5], cy: 20 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: delay + 0.8 }}
        />
      </svg>
    </motion.div>
  );

  // Vertical connector arrow within a lane
  const VerticalArrow = ({ delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="flex justify-center my-1"
    >
      <svg width="20" height="24" viewBox="0 0 20 24">
        <motion.path
          d="M10,2 L10,18"
          stroke={colors.teal}
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.1, duration: 0.3 }}
        />
        <motion.path
          d="M5,14 L10,22 L15,14"
          fill={colors.teal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.3 }}
        />
      </svg>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Fraunces', serif" }}>
            Process Flow: Vendor Registration & Onboarding
          </h2>
          <p className="text-gray-500 mb-12">Self-service registration through to D365 sync</p>
        </motion.div>

        {/* Swimlane Diagram */}
        <div className="grid grid-cols-3 gap-12 relative">
          {/* Lane 1 - Vendor Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: "#2563EB" }}>
              VENDOR ACTIONS
            </div>
            <div className="bg-white p-6 rounded-b-xl border border-gray-200">
              {[
                { num: 1, text: "Self-Registration (Portal / Invite Link)" },
                { num: 2, text: "Upload Company Profile & Documents" },
                { num: 3, text: "Complete Due Diligence Forms" },
                { num: 4, text: "Accept Terms & Conditions" },
              ].map((step, i) => (
                <div key={step.num}>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <motion.span 
                      className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shadow-md"
                      animate={{ boxShadow: ["0 0 0px rgba(37,99,235,0.3)", "0 0 15px rgba(37,99,235,0.3)", "0 0 0px rgba(37,99,235,0.3)"] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    >
                      {step.num}
                    </motion.span>
                    <span className="text-sm text-gray-700 font-medium">{step.text}</span>
                  </motion.div>
                  {i < 3 && <VerticalArrow delay={0.4 + i * 0.15} />}
                </div>
              ))}
            </div>
            <LaneArrow delay={0.8} />
          </motion.div>

          {/* Lane 2 - Procure AI */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.teal }}>
              PROCURE AI (AUTOMATED)
            </div>
            <div className="bg-white p-6 rounded-b-xl border border-gray-200">
              {[
                { num: 5, text: "AI Profile Enrichment" },
                { num: 6, text: "Document Verification" },
                { num: 7, text: "Risk & Compliance Screening" },
                { num: 8, text: "Vendor Scoring & Classification" },
              ].map((step, i) => (
                <div key={step.num}>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.15 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    <motion.span 
                      className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm shadow-md"
                      animate={{ boxShadow: ["0 0 0px rgba(13,148,136,0.3)", "0 0 15px rgba(13,148,136,0.3)", "0 0 0px rgba(13,148,136,0.3)"] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    >
                      {step.num}
                    </motion.span>
                    <span className="text-sm text-gray-700 font-medium">{step.text}</span>
                  </motion.div>
                  {i < 3 && <VerticalArrow delay={0.6 + i * 0.15} />}
                </div>
              ))}
            </div>
            <LaneArrow delay={1.2} />
          </motion.div>

          {/* Lane 3 - IHS Procurement */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="text-center py-3 rounded-t-xl text-white font-semibold" style={{ backgroundColor: colors.navy }}>
              IHS PROCUREMENT
            </div>
            <div className="bg-white p-6 rounded-b-xl border border-gray-200">
              {[
                { num: 9, text: "Review & Approve Vendor Profile" },
                { num: 10, text: "Category Assignment" },
                { num: 11, text: "D365 Vendor Master Sync" },
              ].map((step, i) => (
                <div key={step.num}>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.15 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <motion.span 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md"
                      style={{ backgroundColor: colors.navy }}
                      animate={{ boxShadow: ["0 0 0px rgba(30,39,97,0.3)", "0 0 15px rgba(30,39,97,0.3)", "0 0 0px rgba(30,39,97,0.3)"] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    >
                      {step.num}
                    </motion.span>
                    <span className="text-sm text-gray-700 font-medium">{step.text}</span>
                  </motion.div>
                  {i < 2 && <VerticalArrow delay={0.8 + i * 0.15} />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          whileHover={{ scale: 1.01 }}
          className="mt-8 bg-white p-6 rounded-xl border border-gray-200"
        >
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Database Tables</h4>
              <code className="text-sm text-gray-600">
                vendors | vendor_contacts | vendor_documents | vendor_compliance | vendor_categories | vendor_risk_scores | vendor_bank_details
              </code>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Bulk Upload Pipeline</h4>
              <p className="text-sm text-gray-600">
                CSV/XLSX via Admin Portal → Validated against schema → Loaded to staging tables → Approved → Written to production
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Section 5: Reverse Auction
const ReverseAuctionSection = () => {
  const steps = [
    { num: 1, label: "Asset Listed for Disposal", desc: "Finance team validates asset for sale", color: "#EA580C" },
    { num: 2, label: "Vendor Invitation", desc: "Pre-qualified buyers notified via portal", color: "#2563EB" },
    { num: 3, label: "Inspection Period", desc: "Vendors inspect assets onsite or via photos", color: colors.teal },
    { num: 4, label: "Live Bidding Rounds", desc: "Real-time competitive bidding with AI floor", color: "#059669" },
    { num: 5, label: "Winner Determination", desc: "Highest bid verified against reserve price", color: colors.navy },
    { num: 6, label: "Payment & Collection", desc: "Invoice generated, asset handover", color: "#EA580C" },
  ];

  // Thin Arrow Component
  const ThinArrow = ({ delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="flex items-center justify-center"
    >
      <svg width="30" height="20" viewBox="0 0 30 20">
        <defs>
          <linearGradient id={`thinArrow-${delay}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.teal} />
            <stop offset="100%" stopColor={colors.navy} />
          </linearGradient>
          <marker id={`thinHead-${delay}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={colors.teal} />
          </marker>
        </defs>
        <motion.path
          d="M2,10 L22,10"
          stroke={`url(#thinArrow-${delay})`}
          strokeWidth="1.5"
          fill="none"
          markerEnd={`url(#thinHead-${delay})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4 }}
        />
      </svg>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Fraunces', serif" }}>
            Process Flow: Reverse Auction
          </h2>
          <p className="text-gray-500 mb-12">Asset disposal through competitive bidding</p>
        </motion.div>

        {/* Flow with Arrows */}
        <div className="flex items-start justify-center gap-2 mb-12">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center w-36"
              >
                <motion.div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3 shadow-lg"
                  style={{ backgroundColor: step.color }}
                  whileHover={{ scale: 1.1 }}
                  animate={{ 
                    boxShadow: [`0 0 0px ${step.color}40`, `0 0 12px ${step.color}40`, `0 0 0px ${step.color}40`]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {step.num}
                </motion.div>
                <motion.div 
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-32"
                  whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}
                >
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">{step.label}</h4>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </motion.div>
              </motion.div>
              {i < 5 && (
                <div className="flex items-center h-14 mx-1">
                  <ThinArrow delay={i * 0.1 + 0.3} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" style={{ color: colors.teal }} />
              Database Tables
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><code className="bg-gray-100 px-1 rounded">auctions</code> — Auction metadata, status, dates</li>
              <li><code className="bg-gray-100 px-1 rounded">auction_lots</code> — Individual assets/lots per auction</li>
              <li><code className="bg-gray-100 px-1 rounded">auction_bids</code> — All bids with timestamps</li>
              <li><code className="bg-gray-100 px-1 rounded">auction_results</code> — Winner, final price, settlement</li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: colors.teal }} />
              Real-Time Bidding Architecture
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>WebSocket connections for live bid updates</li>
              <li>Azure SignalR Service for real-time broadcast</li>
              <li>Redis cache for bid queue and leaderboard</li>
              <li>AI-calculated reserve price from historical data</li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Real-time updates enabled
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Section 6: Database
const DatabaseSection = () => {
  const databases = [
    { name: "AZURE SQL DATABASE", color: "#2563EB", icon: Server, subtitle: "Transactional Data", tables: "vendors, items, rfq_requests, rfq_line_items, vendor_bids, awards, purchase_orders, contracts, approvals" },
    { name: "AZURE COSMOS DB", color: colors.teal, icon: FileJson, subtitle: "Vendor Profiles & Documents", tables: "vendor_profiles (JSON), vendor_documents (metadata), audit_logs, activity_feeds, notifications, chat_history" },
    { name: "AZURE DATA LAKE", color: "#059669", icon: Cloud, subtitle: "Analytics & ML Training", tables: "historical_po_data, spend_analytics, price_trends, vendor_performance_history, demand_forecasting_data" },
    { name: "AZURE BLOB STORAGE", color: "#EA580C", icon: HardDrive, subtitle: "Files & Attachments", tables: "vendor_certificates (PDF), rfq_attachments, bid_docs, contract_documents, auction_asset_photos" },
  ];

  const pipeline = [
    { num: 1, label: "CSV/XLSX Upload", color: "#2563EB" },
    { num: 2, label: "Schema Validation", color: colors.teal },
    { num: 3, label: "Staging Tables", color: "#EA580C" },
    { num: 4, label: "Admin Review", color: colors.navy },
    { num: 5, label: "Production Write", color: "#059669" },
  ];

  return (
    <div className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Fraunces', serif" }}>
            Back-End Database Architecture
          </h2>
          <p className="text-gray-500 mb-12">Core data domains and storage strategy</p>
        </motion.div>

        {/* Database Cards */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          {databases.map((db, i) => {
            const Icon = db.icon;
            return (
              <motion.div
                key={db.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 text-white flex items-center gap-2" style={{ backgroundColor: db.color }}>
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{db.name}</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500 mb-3">{db.subtitle}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{db.tables}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pipeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-xl border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-6">Bulk Data Upload Pipeline</h3>
          <div className="flex items-center justify-between">
            {pipeline.map((step, i) => (
              <div key={step.num} className="flex items-center">
                <div className="text-center">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.num}
                  </div>
                  <span className="text-sm text-gray-600">{step.label}</span>
                </div>
                {i < 4 && <ArrowRight className="w-6 h-6 text-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Section 7: Data Upload
const DataUploadSection = () => {
  const datasets = [
    { name: "Vendor Master", format: "CSV / XLSX", volume: "2,000–5,000", source: "D365", priority: "P1", critical: true },
    { name: "Category Master", format: "CSV / XLSX", volume: "100–300", source: "D365 / Manual", priority: "P1", critical: true },
    { name: "Item Catalogue", format: "CSV / XLSX", volume: "5,000–15,000", source: "D365 / Readcube", priority: "P1", critical: true },
    { name: "Historical POs", format: "CSV / XLSX", volume: "50,000–200,000", source: "D365", priority: "P2", critical: false },
    { name: "Vendor Compliance", format: "CSV + PDF files", volume: "5,000–15,000", source: "Manual / Shared Drive", priority: "P2", critical: false },
  ];

  return (
    <div className="min-h-screen p-12 pb-24" style={{ backgroundColor: colors.lightGray }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-4xl font-bold mb-2" style={{ color: colors.navy, fontFamily: "'Fraunces', serif" }}>
            Bulk Data Upload: Format Requirements
          </h2>
          <p className="text-gray-500 mb-12">What IHS needs to prepare for initial data migration</p>
        </motion.div>

        {/* Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8"
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.navy }}>
                <th className="text-left text-white text-sm font-semibold px-6 py-4">Data Set</th>
                <th className="text-left text-white text-sm font-semibold px-6 py-4">Format</th>
                <th className="text-left text-white text-sm font-semibold px-6 py-4">Est. Volume</th>
                <th className="text-left text-white text-sm font-semibold px-6 py-4">Source System</th>
                <th className="text-left text-white text-sm font-semibold px-6 py-4">Priority</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((row, i) => (
                <tr key={row.name} className="border-b border-gray-100">
                  <td className="px-6 py-4 text-gray-900 font-medium">{row.name}</td>
                  <td className="px-6 py-4 text-gray-600">{row.format}</td>
                  <td className="px-6 py-4 text-gray-600">{row.volume}</td>
                  <td className="px-6 py-4 text-gray-600">{row.source}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      row.critical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
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
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-4">File Format Specifications</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Encoding: UTF-8</li>
              <li>Date format: YYYY-MM-DD</li>
              <li>Decimal separator: period (.)</li>
              <li>Boolean: TRUE / FALSE</li>
              <li>Currency codes: ISO 4217 (NGN, USD, EUR)</li>
              <li>Country codes: ISO 3166-1 Alpha-3 (NGA, GHA)</li>
              <li>No thousands separators in numeric fields</li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Upload Load Order</h3>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>Category Master (no dependencies)</li>
              <li>Vendor Master (refs: Category)</li>
              <li>Item Catalogue (refs: Category, Vendor)</li>
              <li>Historical POs (refs: Vendor, Item)</li>
              <li>Vendor Compliance (refs: Vendor)</li>
            </ol>
          </motion.div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-sm text-gray-500 italic flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Templates provided in accompanying Excel workbook
        </motion.p>
      </div>
    </div>
  );
};

// Section 8: Next Steps
const NextStepsSection = () => {
  const steps = [
    { num: "01", title: "IHS to extract D365 vendor master data", desc: "Using provided CSV/XLSX templates" },
    { num: "02", title: "IHS to compile category taxonomy", desc: "3-level hierarchy with CapEx/OpEx classification" },
    { num: "03", title: "IHS IT to confirm API access", desc: "D365, ServiceNow, Azure Data Lake endpoints" },
    { num: "04", title: "Joint session to validate flowcharts", desc: "Confirm process alignment with current operations" },
    { num: "05", title: "Procure AI team to deliver staging environment", desc: "For test uploads and validation ahead of go-live" },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-center relative" style={{ backgroundColor: colors.navy }}>
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colors.teal }} />
      
      <div className="max-w-4xl mx-auto px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
            Next Steps
          </h2>
          <div className="w-20 h-1 mb-12" style={{ backgroundColor: colors.teal }} />
        </motion.div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex gap-6"
            >
              <span className="text-4xl font-bold" style={{ color: colors.teal }}>{step.num}</span>
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 p-4 rounded-lg text-center italic"
          style={{ color: colors.teal }}
        >
          Target: All data templates populated by 28 February 2026
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-white">Procure AI</span>
          <span className="text-gray-500">IHS Towers Nigeria — Pre-Alignment Session — February 2026</span>
        </div>
        <span className="text-teal-500 text-xs tracking-widest uppercase">Confidential</span>
      </div>
    </div>
  );
};

export default ProcureAIProposal;
