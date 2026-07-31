import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";

// ==================== DESIGN SYSTEM ====================
const colors = {
  navy: "#1E2761",
  teal: "#0D9488",
  white: "#FFFFFF",
  lightGrey: "#F8FAFC",
  iceBlue: "#CADCFC",
  slate: "#64748B",
  dark: "#0F172A",
  green: "#059669",
  blue: "#2563EB",
  orange: "#EA580C",
  red: "#DC2626",
};

// Stagger animation helper
const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const fadeLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const fadeRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } }
};

// ==================== MAIN COMPONENT ====================
const ProcureAIExecutivePackV3 = () => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [direction, setDirection] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const totalSlides = 12;

  const goToSlide = (slide) => {
    if (slide >= 1 && slide <= totalSlides && slide !== currentSlide && !isGeneratingPdf) {
      setDirection(slide > currentSlide ? 1 : -1);
      setCurrentSlide(slide);
    }
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides && !isGeneratingPdf) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide, isGeneratingPdf]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 1 && !isGeneratingPdf) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide, isGeneratingPdf]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isGeneratingPdf) return;
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, toggleFullscreen, isGeneratingPdf]);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadProgress(0);
    setDownloadStatus('Initializing...');
    
    const originalSlide = currentSlide;
    const slideNames = ['Title', 'Agenda', 'Strategic Framing', 'Scope', 'Architecture', 'Governance', 'Risk', 'Roadmap', 'Resources', 'Performance', 'Decisions', 'Credentials'];
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const pdfWidth = 1920;
      const pdfHeight = 1080;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      for (let i = 1; i <= totalSlides; i++) {
        const progress = Math.round(((i - 1) / totalSlides) * 90);
        setDownloadProgress(progress);
        setDownloadStatus(`Rendering: ${slideNames[i-1]}...`);
        
        setDirection(0);
        setCurrentSlide(i);
        
        // Wait for React to re-render
        await sleep(100);
        
        // Wait for Framer Motion animations to complete (most animations have delays up to 1.5s)
        await sleep(2500);
        
        // Force a repaint
        if (contentRef.current) {
          contentRef.current.offsetHeight; // Force reflow
        }
        
        // Additional wait to ensure all animations are settled
        await sleep(500);
        
        setDownloadStatus(`Capturing: ${slideNames[i-1]}...`);
        
        if (contentRef.current) {
          try {
            // Use requestAnimationFrame to ensure rendering is complete
            await new Promise(resolve => requestAnimationFrame(resolve));
            await sleep(200);
            
            const canvas = await html2canvas(contentRef.current, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: [1, 11].includes(i) ? colors.navy : colors.lightGrey,
              width: 1920,
              height: 1080,
              windowWidth: 1920,
              windowHeight: 1080,
              onclone: (clonedDoc) => {
                // Ensure all animations are in final state in cloned document
                const clonedElement = clonedDoc.body;
                const motionElements = clonedElement.querySelectorAll('[style*="opacity"]');
                motionElements.forEach(el => {
                  el.style.opacity = '1';
                  el.style.transform = 'none';
                });
              }
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            
            if (i > 1) {
              pdf.addPage([pdfWidth, pdfHeight], 'landscape');
            }
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          } catch (err) {
            console.error(`Error capturing slide ${i}:`, err);
          }
        }
      }
      
      setDownloadProgress(95);
      setDownloadStatus('Finalizing PDF...');
      await sleep(500);
      
      pdf.save('ProcureAI-Executive-Pack.pdf');
      
      setDownloadProgress(100);
      setDownloadStatus('Complete!');
      await sleep(800);
      
      setCurrentSlide(originalSlide);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      setDownloadStatus('Error generating PDF');
      await sleep(2000);
    }
    
    setIsGeneratingPdf(false);
    setDownloadProgress(0);
    setDownloadStatus('');
  };

  const slideVariants = {
    enter: (direction) => ({ opacity: 0, x: direction > 0 ? 100 : -100, scale: 0.98 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (direction) => ({ opacity: 0, x: direction < 0 ? 100 : -100, scale: 0.98 })
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}
      onMouseEnter={() => setShowArrows(true)}
      onMouseLeave={() => setShowArrows(false)}
    >
      {/* Download Progress Overlay */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[420px]"
          >
            <div className="text-center mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.iceBlue }}
              >
                <Loader2 className="w-7 h-7" style={{ color: colors.teal }} />
              </motion.div>
              <h3 className="text-lg font-bold mb-1" style={{ color: colors.dark }}>Generating PDF</h3>
              <p className="text-sm" style={{ color: colors.slate }}>{downloadStatus}</p>
            </div>
            
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.lightGrey }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colors.teal, width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-center text-xs mt-3" style={{ color: colors.slate }}>
              {downloadProgress}% — Slide {Math.min(Math.ceil((downloadProgress / 90) * 12), 12)} of 12
            </p>
          </motion.div>
        </div>
      )}

      {/* Teal accent stripe at top */}
      <div className="absolute top-0 left-0 right-0 h-1 z-50" style={{ backgroundColor: colors.teal }} />

      {/* Download PDF Button */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
        className="absolute top-4 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
        style={{ backgroundColor: colors.teal }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Download className="w-4 h-4" />
        Download PDF
      </motion.button>

      {/* Slide content */}
      <div ref={contentRef} className="w-full h-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full h-full"
          >
            {currentSlide === 1 && <Slide1Title />}
            {currentSlide === 2 && <Slide2Agenda />}
            {currentSlide === 3 && <Slide3StrategicFraming />}
            {currentSlide === 4 && <Slide4Scope />}
            {currentSlide === 5 && <Slide5Architecture />}
            {currentSlide === 6 && <Slide6Governance />}
            {currentSlide === 7 && <Slide7Risk />}
            {currentSlide === 8 && <Slide8Roadmap />}
            {currentSlide === 9 && <Slide9Resources />}
            {currentSlide === 10 && <Slide10Commercial />}
            {currentSlide === 11 && <Slide11Decisions />}
            {currentSlide === 12 && <Slide12Credentials />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      <AnimatePresence>
        {showArrows && currentSlide > 1 && !isGeneratingPdf && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/95 shadow-xl flex items-center justify-center hover:bg-white transition-all z-40"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-7 h-7" style={{ color: colors.dark }} />
          </motion.button>
        )}
        {showArrows && currentSlide < totalSlides && !isGeneratingPdf && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/95 shadow-xl flex items-center justify-center hover:bg-white transition-all z-40"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight className="w-7 h-7" style={{ color: colors.dark }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-40"
      >
        {Array.from({ length: totalSlides }, (_, i) => (
          <motion.button
            key={i + 1}
            onClick={() => goToSlide(i + 1)}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            className="rounded-full transition-all"
            style={{ 
              width: currentSlide === i + 1 ? 28 : 10,
              height: 10,
              backgroundColor: currentSlide === i + 1 ? colors.teal : colors.slate + '50'
            }}
          />
        ))}
      </motion.div>

      {/* Slide counter */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-8 right-10 text-base font-medium z-40"
        style={{ color: colors.slate }}
      >
        <span style={{ color: colors.teal, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: '1.25rem' }}>{currentSlide}</span>
        <span> / {totalSlides}</span>
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 1: TITLE ====================
const Slide1Title = () => (
  <div className="w-full h-full flex flex-col" style={{ backgroundColor: colors.navy }}>
    {/* Animated background elements */}
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ duration: 2 }}
        className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full border-2"
        style={{ borderColor: colors.teal }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.05, scale: 1 }}
        transition={{ duration: 2, delay: 0.3 }}
        className="absolute -bottom-20 -left-20 w-[600px] h-[600px] rounded-full border"
        style={{ borderColor: colors.iceBlue }}
      />
    </div>

    <div className="flex-1 flex flex-col items-center justify-center px-20 relative z-10">
      <motion.h1 
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        className="text-6xl font-bold mb-5"
        style={{ fontFamily: "Georgia, serif", color: colors.white }}
      >
        Procure AI
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="text-2xl mb-8"
        style={{ color: colors.iceBlue }}
      >
        Procurement Transformation Programme
      </motion.p>
      
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-52 h-1 mb-8 rounded-full"
        style={{ backgroundColor: colors.teal }}
      />
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-xl font-bold mb-4"
        style={{ color: colors.white }}
      >
        Executive Kick-Off Pack
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-base mb-3"
        style={{ color: colors.slate }}
      >
        Strategic Validation Session with Group CIO
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="text-base"
        style={{ color: colors.slate }}
      >
        23 February 2026
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-sm"
        style={{ color: colors.iceBlue }}
      >
        Press <kbd className="px-2 py-1 rounded mx-1" style={{ backgroundColor: colors.dark }}>←</kbd> <kbd className="px-2 py-1 rounded mx-1" style={{ backgroundColor: colors.dark }}>→</kbd> to navigate
      </motion.div>
    </div>
    
    {/* Footer */}
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="h-16 px-20 flex items-center justify-between" 
      style={{ backgroundColor: colors.dark }}
    >
      <span className="text-sm" style={{ color: colors.slate }}>
        IHS Towers Nigeria | TN Macaulay | Future Africa
      </span>
      <motion.span 
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-sm tracking-widest font-medium"
        style={{ color: colors.teal }}
      >
        CONFIDENTIAL
      </motion.span>
    </motion.div>
  </div>
);

// ==================== SLIDE 2: AGENDA ====================
const Slide2Agenda = () => {
  const agendaItems = [
    { num: "01", section: "Strategic Framing", time: "15–20 min", desc: "Programme objectives, transformation thesis, and phased capability model. Understanding the current procurement landscape and envisioning the AI-powered future state." },
    { num: "02", section: "Scope Confirmation", time: "20 min", desc: "Detailed review of interfaces, data governance requirements, key assumptions requiring CIO validation, and explicit exclusions that fall under IHS responsibility." },
    { num: "03", section: "Target Architecture", time: "20–25 min", desc: "Azure-native microservices solution design, D365 deep integration points, cybersecurity framework, and scalability considerations for enterprise deployment." },
    { num: "04", section: "Governance & Delivery Model", time: "20–25 min", desc: "Steering committee structure, PMO operations, RACI matrix for all workstreams, reporting cadence, and risk management protocols." },
    { num: "05", section: "Milestones & Execution Roadmap", time: "20–25 min", desc: "13-month delivery timeline with critical path analysis, resource mobilisation plan, change management strategy, and go-live preparation." },
    { num: "06", section: "Performance Framework", time: "10–15 min", desc: "KPI framework with baseline and target metrics, programme timeline across three phases, and competitive analysis." },
    { num: "07", section: "Decision Points", time: "10–15 min", desc: "Three key decisions required: Go/no-go for 1 March mobilisation, governance model approval, and IT infrastructure provisioning instructions." },
  ];

  return (
    <div className="w-full h-full p-14" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <motion.h2 
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-4xl font-bold mb-2"
        style={{ fontFamily: "Georgia, serif", color: colors.dark }}
      >
        Session Agenda
      </motion.h2>
      <motion.p 
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
        className="text-base mb-8"
        style={{ color: colors.slate }}
      >
        1.5–2 hour strategic validation — structured for executive decision-making
      </motion.p>

      <motion.div 
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        {agendaItems.map((item, i) => (
          <motion.div
            key={item.num}
            variants={fadeLeft}
            whileHover={{ x: 8, transition: { duration: 0.2 } }}
            className="flex items-center py-4 px-6 rounded-xl cursor-default"
            style={{ 
              backgroundColor: i % 2 === 0 ? colors.white : 'transparent',
              boxShadow: i % 2 === 0 ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <motion.span 
              className="w-14 text-xl font-bold"
              style={{ fontFamily: "Georgia, serif", color: colors.teal }}
            >
              {item.num}
            </motion.span>
            <span className="w-72 font-bold text-base" style={{ color: colors.dark }}>
              {item.section}
            </span>
            <span className="w-28 text-center text-sm font-bold rounded-full py-1 px-3" style={{ backgroundColor: colors.iceBlue, color: colors.teal }}>
              {item.time}
            </span>
            <span className="flex-1 text-sm pl-6" style={{ color: colors.slate }}>
              {item.desc}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 3: STRATEGIC FRAMING ====================
const Slide3StrategicFraming = () => {
  const currentState = [
    "Manual Excel-based procurement workflows across all spend categories with limited automation and high error rates",
    "45-day average purchase cycle from initial request to PO issuance, causing project delays and vendor frustration",
    "Limited vendor pool restricted to established local networks, missing cost-saving opportunities from global sourcing",
    "No real-time spend visibility — finance teams compile reports manually with 2-3 week lag in analytics",
    "Manual vendor due diligence and compliance tracking with spreadsheet-based risk assessments prone to gaps",
    "No structured process for asset recovery, disposal, or surplus equipment monetisation"
  ];

  const futureState = [
    "AI-powered end-to-end procurement automation with intelligent workflow routing and exception handling",
    "15-day procurement cycles representing 67% reduction — accelerating project delivery and improving vendor relations",
    "Global vendor discovery integrating Alibaba, D&B, and Global Sources for competitive sourcing and price benchmarking",
    "Real-time dashboards with spend analytics, budget forecasting, and automated anomaly detection alerts",
    "Automated compliance scoring with continuous risk monitoring, document verification, and audit trail maintenance",
    "Competitive reverse auctions for asset disposal maximising recovery value with transparent bidding process"
  ];

  const phases = [
    { num: 1, title: "Foundation & Core", desc: "Vendor Portal with self-registration, Due Diligence automation, Risk Monitor dashboard, AI Overview Bot, and Reverse Auction module", time: "Feb–May 2026 (4 months)", color: colors.blue },
    { num: 2, title: "RFx Workflows", desc: "RFx Creation engine, Global Vendor Sourcing, Scope Validation tools, BAFO management, and Template library", time: "Jun–Oct 2026 (5 months)", color: colors.teal },
    { num: 3, title: "Intelligence Suite", desc: "Demand Forecasting, Category Management, TCO Reporting, Risk Register, Audit trails, and Settings configuration", time: "Nov 2026–Feb 2027 (4 months)", color: colors.green },
  ];

  return (
    <div className="w-full h-full p-10 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-2xl font-bold"
          style={{ fontFamily: "Georgia, serif", color: colors.teal }}
        >
          01
        </motion.span>
        <div>
          <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>
            Strategic Framing
          </motion.h2>
          <motion.p variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="text-sm" style={{ color: colors.slate }}>
            Programme objectives and transformation thesis — from manual processes to AI-powered procurement
          </motion.p>
        </div>
      </div>

      {/* Current vs Future State */}
      <div className="flex gap-5 mb-6">
        {/* Current State */}
        <motion.div 
          variants={fadeLeft}
          initial="hidden"
          animate="visible"
          className="flex-1 rounded-xl overflow-hidden shadow-lg"
        >
          <div className="px-5 py-3" style={{ backgroundColor: colors.red }}>
            <h3 className="text-sm font-bold text-white tracking-wide">CURRENT STATE</h3>
          </div>
          <div className="p-4 bg-white">
            {currentState.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.red }} />
                <p className="text-xs leading-relaxed" style={{ color: colors.slate }}>{item}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Arrow */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center"
        >
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="50" height="50" viewBox="0 0 50 50">
              <motion.path 
                d="M10 25 L35 25 M28 18 L35 25 L28 32" 
                stroke={colors.teal} 
                strokeWidth="3" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* Future State */}
        <motion.div 
          variants={fadeRight}
          initial="hidden"
          animate="visible"
          className="flex-1 rounded-xl overflow-hidden shadow-lg"
        >
          <div className="px-5 py-3" style={{ backgroundColor: colors.green }}>
            <h3 className="text-sm font-bold text-white tracking-wide">FUTURE STATE (PROCURE AI)</h3>
          </div>
          <div className="p-4 bg-white">
            {futureState.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.green }} />
                <p className="text-xs leading-relaxed" style={{ color: colors.slate }}>{item}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Phase Cards */}
      <div className="flex gap-4">
        {phases.map((phase, i) => (
          <motion.div
            key={phase.num}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15, type: "spring", stiffness: 100 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="flex-1 rounded-xl p-5 text-white relative overflow-hidden cursor-default"
            style={{ backgroundColor: phase.color }}
          >
            <div className="relative z-10">
              <p className="text-xs font-bold opacity-80 mb-1 tracking-wider">PHASE {phase.num}</p>
              <h4 className="text-lg font-bold mb-2">{phase.title}</h4>
              <p className="text-xs opacity-90 mb-3 leading-relaxed">{phase.desc}</p>
              <p className="text-xs italic opacity-70 mb-3">{phase.time}</p>
            </div>
            {/* Decorative circle */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: colors.white }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ==================== SLIDE 4: SCOPE ====================
const Slide4Scope = () => {
  const scopeData = [
    { phase: 1, module: "Vendor Portal + Interface", pages: 15, ai: "Agentic AI, Decision Engine", ext: "D&B, NAVEX, Docusign" },
    { phase: 1, module: "Due Diligence & Risk Monitor", pages: 7, ai: "Decision Engine", ext: "D&B, NAVEX" },
    { phase: 1, module: "AI Overview Bot", pages: 1, ai: "LLM (Azure OpenAI)", ext: "—" },
    { phase: 1, module: "Reverse Auction Portal", pages: 8, ai: "Analytics + Decision Engine", ext: "—" },
    { phase: 2, module: "RFx Creation + Source Vendor", pages: 9, ai: "Agentic AI, Decision Engine", ext: "Alibaba, Global Sources" },
    { phase: 2, module: "Scope Validation + Review & Rank", pages: 16, ai: "Analytics + Decision Engine", ext: "—" },
    { phase: 2, module: "BAFO Rank & Award + Templates", pages: "20+", ai: "Analytics + Decision Engine", ext: "—" },
    { phase: 3, module: "Forecasting + Category Mgmt", pages: 11, ai: "Agentic AI, Forecasting Engine", ext: "Redcube, D365" },
    { phase: 3, module: "Cost/TCO + Risk Register Reporting", pages: 14, ai: "Forecasting + Decision Engine", ext: "D365" },
    { phase: 3, module: "Settings + Exception + Audit + Perf Mgmt", pages: 19, ai: "—", ext: "—" },
  ];

  const assumptions = [
    "IHS provides timely access to systems, environments, and SME resources as per the agreed project schedule",
    "LLM usage costs, cloud hosting, and third-party service licences are IHS financial responsibility",
    "Requirements documented in the scoping worksheet are complete, final, and approved by stakeholders",
    "D365 Finance & Operations environment supports required API integrations without major customisation",
    "Change requests will be managed via formal CR process with impact assessment and approval gates"
  ];

  const exclusions = [
    "LLM API usage costs (Azure OpenAI or equivalent)",
    "Cloud hosting and infrastructure costs (Azure subscription)",
    "Third-party service licences: D&B, NAVEX, Docusign",
    "Microsoft Dynamics 365 licensing and any required licence upgrades for API access",
    "D365 core ERP modifications, legacy system decommissioning, and historical data archival"
  ];

  const getPhaseColor = (phase) => phase === 1 ? colors.blue : phase === 2 ? colors.teal : colors.green;

  return (
    <div className="w-full h-full p-8 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <div className="flex items-center gap-4 mb-4">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>02</motion.span>
        <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>Scope Confirmation & Boundaries</motion.h2>
      </div>

      {/* Scope Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: colors.dark }}>
              <th className="px-3 py-2.5 text-left text-white font-bold">Phase</th>
              <th className="px-3 py-2.5 text-left text-white font-bold">Module</th>
              <th className="px-3 py-2.5 text-center text-white font-bold">Pages</th>
              <th className="px-3 py-2.5 text-left text-white font-bold">AI Components</th>
              <th className="px-3 py-2.5 text-left text-white font-bold">External Integration</th>
            </tr>
          </thead>
          <tbody>
            {scopeData.map((row, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded text-white text-xs font-bold" style={{ backgroundColor: getPhaseColor(row.phase) }}>P{row.phase}</span>
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: colors.dark }}>{row.module}</td>
                <td className="px-3 py-2 text-center font-bold" style={{ color: colors.teal }}>{row.pages}</td>
                <td className="px-3 py-2" style={{ color: colors.slate }}>{row.ai}</td>
                <td className="px-3 py-2" style={{ color: colors.slate }}>{row.ext}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Assumptions & Exclusions */}
      <div className="flex gap-4">
        <motion.div variants={fadeLeft} initial="hidden" animate="visible" transition={{ delay: 0.5 }} className="flex-1 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-2.5" style={{ backgroundColor: colors.orange }}>
            <h3 className="text-xs font-bold text-white tracking-wide">KEY ASSUMPTIONS (CIO VALIDATION REQUIRED)</h3>
          </div>
          <div className="p-4 bg-white">
            {assumptions.map((item, i) => (
              <motion.p 
                key={i} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="text-xs py-1.5 flex items-start gap-2"
                style={{ color: colors.slate }}
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.orange }} />
                {item}
              </motion.p>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeRight} initial="hidden" animate="visible" transition={{ delay: 0.6 }} className="flex-1 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-2.5" style={{ backgroundColor: colors.red }}>
            <h3 className="text-xs font-bold text-white tracking-wide">EXCLUSIONS (IHS FINANCIAL RESPONSIBILITY)</h3>
          </div>
          <div className="p-4 bg-white">
            {exclusions.map((item, i) => (
              <motion.p 
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.05 }}
                className="text-xs py-1.5 flex items-start gap-2"
                style={{ color: colors.slate }}
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.red }} />
                {item}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== SLIDE 5: ARCHITECTURE ====================
const Slide5Architecture = () => {
  const ihsSystems = ["D365 Finance & Operations", "ServiceNow ITSM", "Azure Data Lake", "Azure OpenAI Service", "Azure AD / Entra ID"];
  const services = [
    { name: "Procurement Service", color: colors.blue },
    { name: "Vendor Service", color: colors.green },
    { name: "AI/ML Service", color: colors.navy },
    { name: "Analytics Service", color: colors.teal },
    { name: "Auction Service", color: colors.orange },
    { name: "Contract Service", color: colors.slate },
  ];
  const infra = [
    { cat: "Cloud", req: "Azure Subscription with compute, storage, networking, and monitoring services", env: "Dev, Staging, Production", by: "Week 1" },
    { cat: "Database", req: "Azure SQL Database or PostgreSQL with geo-redundancy and automated backups", env: "Dev, Staging, Production", by: "Week 1" },
    { cat: "AI/LLM", req: "Azure OpenAI Service with GPT-4 access and content filtering configured", env: "All environments", by: "Month 2" },
    { cat: "Integration", req: "D365 API credentials with appropriate scopes + ServiceNow REST API access", env: "All environments", by: "Week 2" },
    { cat: "Third-Party", req: "API keys for D&B, NAVEX, and Docusign with sandbox environments for testing", env: "Staging, Production", by: "Month 3" },
    { cat: "Security", req: "VPN access for development team, CI/CD pipeline tools, and SSL certificates", env: "All environments", by: "Week 1" },
  ];

  return (
    <div className="w-full h-full p-8 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <div className="flex items-center gap-4 mb-4">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>03</motion.span>
        <div>
          <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>Target Architecture & Technical Design</motion.h2>
          <motion.p variants={fadeUp} initial="hidden" animate="visible" className="text-sm" style={{ color: colors.slate }}>Azure-native microservices with D365 deep integration and enterprise-grade security</motion.p>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="flex gap-4 mb-5 items-stretch">
        {/* IHS Systems */}
        <motion.div variants={fadeLeft} initial="hidden" animate="visible" className="w-52">
          <div className="px-4 py-2.5 rounded-t-xl" style={{ backgroundColor: colors.navy }}>
            <h3 className="text-xs font-bold text-white text-center tracking-wide">IHS EXISTING SYSTEMS</h3>
          </div>
          <div className="bg-white rounded-b-xl p-3 shadow-lg space-y-2">
            {ihsSystems.map((sys, i) => (
              <motion.div 
                key={sys}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                whileHover={{ scale: 1.02 }}
                className="px-3 py-2 rounded-lg text-xs text-center font-medium"
                style={{ backgroundColor: colors.iceBlue, color: colors.dark }}
              >
                {sys}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* API Hub */}
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="flex flex-col items-center justify-center">
          <motion.div animate={{ scaleY: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-0.5 h-10" style={{ backgroundColor: colors.teal }} />
          <motion.div whileHover={{ scale: 1.1 }} className="px-4 py-3 rounded-xl text-xs font-bold text-white shadow-lg" style={{ backgroundColor: colors.teal }}>
            API Gateway
          </motion.div>
          <motion.div animate={{ scaleY: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} className="w-0.5 h-10" style={{ backgroundColor: colors.teal }} />
        </motion.div>

        {/* Procure AI Platform */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="flex-1 border-2 rounded-xl p-4" style={{ borderColor: colors.teal }}>
          <h3 className="text-xs font-bold mb-3 tracking-wide" style={{ color: colors.teal }}>PROCURE AI PLATFORM (AZURE)</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {services.map((svc, i) => (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                whileHover={{ scale: 1.05 }}
                className="px-2 py-2.5 rounded-lg text-xs text-white text-center font-medium"
                style={{ backgroundColor: svc.color }}
              >
                {svc.name}
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="px-3 py-2 rounded-lg text-xs text-center font-medium" style={{ backgroundColor: colors.iceBlue, color: colors.dark }}>
            Azure SQL | Cosmos DB | Redis Cache | Blob Storage | Cognitive Search
          </motion.div>
        </motion.div>

        {/* External */}
        <motion.div variants={fadeRight} initial="hidden" animate="visible" transition={{ delay: 0.7 }} className="w-48 flex flex-col justify-center">
          <div className="px-3 py-3 rounded-xl text-xs text-center text-white font-medium" style={{ backgroundColor: colors.orange }}>
            <p className="font-bold mb-1">External APIs</p>
            <p className="opacity-90">Alibaba | Global Sources | D&B | NAVEX | Docusign</p>
          </div>
        </motion.div>
      </div>

      {/* Infrastructure Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.8 }} className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-2.5" style={{ backgroundColor: colors.dark }}>
          <h3 className="text-xs font-bold text-white tracking-wide">IHS TECHNICAL INFRASTRUCTURE REQUIREMENTS</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ backgroundColor: colors.lightGrey }}>
              <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}>Category</th>
              <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}>Requirement</th>
              <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}>Environment</th>
              <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}>Required By</th>
            </tr>
          </thead>
          <tbody>
            {infra.map((row, i) => (
              <motion.tr 
                key={i} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-bold" style={{ color: colors.teal }}>{row.cat}</td>
                <td className="px-4 py-2" style={{ color: colors.slate }}>{row.req}</td>
                <td className="px-4 py-2" style={{ color: colors.slate }}>{row.env}</td>
                <td className="px-4 py-2 font-bold" style={{ color: colors.dark }}>{row.by}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 6: GOVERNANCE ====================
const Slide6Governance = () => {
  const raciData = [
    { activity: "Platform development and feature delivery", tn: "R/A", it: "C", proc: "I", exec: "I" },
    { activity: "D365 and external system integration", tn: "R", it: "A/C", proc: "C", exec: "I" },
    { activity: "Data migration, bulk upload, and validation", tn: "R", it: "R", proc: "A", exec: "I" },
    { activity: "UAT execution and go-live sign-off", tn: "R", it: "C", proc: "R", exec: "A" },
    { activity: "Change management, training, and adoption", tn: "C", it: "C", proc: "R/A", exec: "I" },
  ];

  const deps = ["D1: Azure environment (Week 1)", "D2: D365 API credentials (Week 2)", "D3: ServiceNow specs (Month 2)", "D4: Vendor master export (Month 1)", "D5: RFx templates (Month 2)", "D6: 3rd-party APIs (Month 3)", "D7: UAT environment (Month 3)", "D8: Security review (Month 4)"];

  return (
    <div className="w-full h-full p-10 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <div className="flex items-center gap-4 mb-5">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>04</motion.span>
        <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>Governance & Delivery Model</motion.h2>
      </div>

      {/* Hierarchy */}
      <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col items-center mb-5">
        <motion.div variants={scaleUp} className="px-10 py-3 rounded-xl text-white text-sm font-bold text-center shadow-lg" style={{ backgroundColor: colors.navy }}>
          STEERING COMMITTEE (Monthly) — Exec Sponsor, Project Director, IT Lead, Project Owner
        </motion.div>
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.3 }} className="w-0.5 h-5" style={{ backgroundColor: colors.teal }} />
        <motion.div variants={scaleUp} className="px-10 py-3 rounded-xl text-white text-sm font-bold text-center shadow-lg" style={{ backgroundColor: colors.teal }}>
          PROJECT STATUS REVIEW (Weekly) — PM, IT Lead, Business Analysts, Solution Architect
        </motion.div>
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.5 }} className="w-0.5 h-5" style={{ backgroundColor: colors.teal }} />
        <motion.div variants={stagger} className="flex gap-3">
          {[
            { title: "Sprint Demo", sub: "Bi-weekly — Full team + stakeholders", color: colors.blue },
            { title: "Technical Review", sub: "Weekly — Architect + Devs + IT Lead", color: colors.teal },
            { title: "Change Mgmt & Training", sub: "IHS Project Owner + Champions", color: colors.green },
            { title: "Integration Coordination", sub: "IT Lead + TN Macaulay", color: colors.orange },
          ].map((item, i) => (
            <motion.div 
              key={i} 
              variants={scaleUp}
              whileHover={{ y: -4 }}
              className="px-4 py-3 rounded-xl text-white text-center shadow-lg cursor-default" 
              style={{ backgroundColor: item.color }}
            >
              <p className="text-xs font-bold">{item.title}</p>
              <p className="text-xs opacity-80 mt-1">{item.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* RACI */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.6 }} className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: colors.dark }}>
              <th className="px-4 py-2.5 text-left text-white font-bold">Activity</th>
              <th className="px-4 py-2.5 text-center text-white font-bold">TN Macaulay</th>
              <th className="px-4 py-2.5 text-center text-white font-bold">IHS IT</th>
              <th className="px-4 py-2.5 text-center text-white font-bold">IHS Procurement</th>
              <th className="px-4 py-2.5 text-center text-white font-bold">Exec Sponsor</th>
            </tr>
          </thead>
          <tbody>
            {raciData.map((row, i) => (
              <motion.tr 
                key={i} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.08 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2.5" style={{ color: colors.dark }}>{row.activity}</td>
                <td className="px-4 py-2.5 text-center font-bold" style={{ color: row.tn.includes("A") ? colors.blue : colors.slate }}>{row.tn}</td>
                <td className="px-4 py-2.5 text-center font-bold" style={{ color: row.it.includes("A") ? colors.blue : colors.slate }}>{row.it}</td>
                <td className="px-4 py-2.5 text-center font-bold" style={{ color: row.proc.includes("A") ? colors.blue : colors.slate }}>{row.proc}</td>
                <td className="px-4 py-2.5 text-center font-bold" style={{ color: row.exec.includes("A") ? colors.blue : colors.slate }}>{row.exec}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs" style={{ backgroundColor: colors.lightGrey, color: colors.slate }}>
          <strong>R</strong> = Responsible | <strong>A</strong> = Accountable | <strong>C</strong> = Consulted | <strong>I</strong> = Informed
        </div>
      </motion.div>

      {/* Dependencies */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="px-5 py-3 rounded-xl text-xs flex flex-wrap gap-x-4 gap-y-2"
        style={{ backgroundColor: colors.iceBlue }}
      >
        <span className="font-bold" style={{ color: colors.dark }}>Critical Dependencies:</span>
        {deps.map((d, i) => (
          <motion.span 
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 + i * 0.05 }}
            style={{ color: colors.dark }}
          >
            {d}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 7: RISK ====================
const Slide7Risk = () => {
  const risks = [
    { id: "R1", risk: "D365 integration complexity exceeds estimates due to customisations or API limitations", l: "Med", i: "High", mit: "Early POC in Month 1, dedicated integration specialist, weekly sync with IHS IT", owner: "TN Macaulay" },
    { id: "R2", risk: "Delayed IHS environment access impacting development velocity and timeline", l: "Med", i: "High", mit: "Parallel development environment setup, early dependency tracking, escalation path defined", owner: "IHS IT" },
    { id: "R3", risk: "Scope creep from new requirements discovered during development phase", l: "High", i: "Med", mit: "Formal change control process with impact assessment, weekly scope reviews, CR log", owner: "Joint" },
    { id: "R4", risk: "Key resource unavailability on either side affecting delivery continuity", l: "Low", i: "High", mit: "Cross-training programme, comprehensive documentation, identified backup resources", owner: "TN Macaulay" },
    { id: "R5", risk: "Data migration quality issues requiring extensive cleansing and rework", l: "Med", i: "Med", mit: "Data profiling in Month 1, validation scripts, automated cleansing rules, sample migration", owner: "Joint" },
    { id: "R6", risk: "User adoption resistance from procurement team due to process changes", l: "Med", i: "Med", mit: "Early engagement sessions, training programme, change champion network, feedback loops", owner: "IHS" },
    { id: "R7", risk: "Third-party API changes or deprecations during implementation", l: "Low", i: "Med", mit: "Abstraction layer design, API versioning strategy, monitoring and alerting", owner: "TN Macaulay" },
    { id: "R8", risk: "Security or compliance gaps identified during pen testing", l: "Low", i: "High", mit: "Security review gates at each phase, compliance checklist, pre-UAT penetration testing", owner: "Joint" },
  ];

  const reporting = [
    { cadence: "Weekly", forum: "Sprint Review", content: "Sprint velocity, blockers, demo of completed features, upcoming priorities", audience: "PM + IT Lead + BAs" },
    { cadence: "Bi-weekly", forum: "Sprint Demo", content: "Feature walkthrough, stakeholder feedback collection, UAT preparation", audience: "Full project team" },
    { cadence: "Monthly", forum: "SteerCo Pack", content: "Strategic progress update, key decisions required, risk escalations, budget status", audience: "Exec Sponsor + SteerCo" },
    { cadence: "Phase Gate", forum: "Go/No-Go Review", content: "UAT results summary, readiness checklist, production deployment sign-off", audience: "Exec Sponsor (final authority)" },
  ];

  const getColor = (level) => level === "High" ? colors.red : level === "Med" ? colors.orange : colors.green;

  return (
    <div className="w-full h-full p-8 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <div className="flex items-center gap-4 mb-4">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>04</motion.span>
        <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>Risk Register & Reporting Cadence</motion.h2>
      </div>

      {/* Risk Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: colors.dark }}>
              <th className="px-2 py-2 text-left text-white font-bold w-10">ID</th>
              <th className="px-2 py-2 text-left text-white font-bold">Risk Description</th>
              <th className="px-2 py-2 text-center text-white font-bold w-12">L</th>
              <th className="px-2 py-2 text-center text-white font-bold w-12">I</th>
              <th className="px-2 py-2 text-left text-white font-bold w-80">Mitigation Strategy</th>
              <th className="px-2 py-2 text-left text-white font-bold w-24">Owner</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-2 py-1.5 font-bold" style={{ color: colors.dark }}>{r.id}</td>
                <td className="px-2 py-1.5" style={{ color: colors.slate }}>{r.risk}</td>
                <td className="px-2 py-1.5 text-center"><span className="font-bold" style={{ color: getColor(r.l) }}>{r.l}</span></td>
                <td className="px-2 py-1.5 text-center"><span className="font-bold" style={{ color: getColor(r.i) }}>{r.i}</span></td>
                <td className="px-2 py-1.5" style={{ color: colors.slate }}>{r.mit}</td>
                <td className="px-2 py-1.5 font-medium" style={{ color: colors.dark }}>{r.owner}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Reporting Framework */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: colors.teal }}>
              <th className="px-4 py-2 text-left text-white font-bold">Cadence</th>
              <th className="px-4 py-2 text-left text-white font-bold">Forum</th>
              <th className="px-4 py-2 text-left text-white font-bold">Content</th>
              <th className="px-4 py-2 text-left text-white font-bold">Audience</th>
            </tr>
          </thead>
          <tbody>
            {reporting.map((r, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-bold" style={{ color: colors.teal }}>{r.cadence}</td>
                <td className="px-4 py-2 font-bold" style={{ color: colors.dark }}>{r.forum}</td>
                <td className="px-4 py-2" style={{ color: colors.slate }}>{r.content}</td>
                <td className="px-4 py-2" style={{ color: colors.slate }}>{r.audience}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs" style={{ backgroundColor: colors.lightGrey, color: colors.slate }}>
          <strong>Escalation Path:</strong> Workstream Lead (24hr) → Project Manager (48hr) → SteerCo (72hr) → Executive Sponsor (exception basis)
        </div>
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 8: ROADMAP ====================
const Slide8Roadmap = () => {
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  const deliverables = [
    { month: "1 (Feb)", key: "Project kickoff, requirements validation workshops, architecture design and review", gate: "Architecture Sign-off", gateColor: colors.blue },
    { month: "2 (Mar)", key: "Vendor Portal development (9 interfaces), API foundation, authentication framework", gate: "Vendor Portal Alpha", gateColor: colors.slate },
    { month: "3 (Apr)", key: "Vendor Interface (6 pages), Due Diligence module, Risk Monitor dashboard", gate: "Integration Testing", gateColor: colors.slate },
    { month: "4 (May)", key: "AI Overview Bot, Reverse Auction Portal (8 pages), Phase 1 UAT execution", gate: "PHASE 1 GO-LIVE", gateColor: colors.blue },
    { month: "5 (Jun)", key: "RFx Creation engine (4 pages), Source Vendor module (5 pages), vendor matching", gate: "RFx Module Alpha", gateColor: colors.slate },
    { month: "6 (Jul)", key: "Scope Validation workflows (11 pages), D365 bidirectional integration", gate: "Integration Complete", gateColor: colors.slate },
    { month: "7–9", key: "Review & Rank, BAFO management, Automated Planning, Template library, Phase 2 UAT", gate: "PHASE 2 GO-LIVE", gateColor: colors.teal },
    { month: "10–11", key: "Demand Forecasting, Category Management, Risk Register, Cost/TCO Reporting", gate: "Reporting Suite Live", gateColor: colors.slate },
    { month: "12–13", key: "Performance Management, Exception Requests, Settings, Audit trails, Final UAT", gate: "PROJECT GO-LIVE", gateColor: colors.green },
  ];

  const payments = [
    { num: 1, trigger: "Project kickoff and contract signature", pct: "50%", target: "Feb 2026" },
    { num: 2, trigger: "Phase 1 completion (core modules + vendor portal live)", pct: "20%", target: "May 2026" },
    { num: 3, trigger: "Phase 2 completion (RFx workflows live in production)", pct: "15%", target: "Oct 2026" },
    { num: 4, trigger: "Final delivery, go-live, and hypercare handover", pct: "15%", target: "Feb 2027" },
  ];

  return (
    <div className="w-full h-full p-8 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <div className="flex items-center gap-4 mb-4">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>05</motion.span>
        <div>
          <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>Milestones & Execution Roadmap</motion.h2>
          <motion.p variants={fadeUp} initial="hidden" animate="visible" className="text-sm" style={{ color: colors.slate }}>13-month delivery timeline — February 2026 to February 2027</motion.p>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-2 px-1" style={{ color: colors.slate }}>
          {months.map((m, i) => <span key={i} className="w-12 text-center font-medium">{m}</span>)}
        </div>
        <div className="relative h-10 flex gap-1">
          <motion.div 
            initial={{ scaleX: 0 }} 
            animate={{ scaleX: 1 }} 
            transition={{ duration: 0.8 }}
            style={{ originX: 0, backgroundColor: colors.blue, width: `${(4/13)*100}%` }}
            className="h-full rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-lg"
          >
            Phase 1: Foundation & Core
          </motion.div>
          <motion.div 
            initial={{ scaleX: 0 }} 
            animate={{ scaleX: 1 }} 
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ originX: 0, backgroundColor: colors.teal, width: `${(5/13)*100}%` }}
            className="h-full rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-lg"
          >
            Phase 2: RFx Workflows
          </motion.div>
          <motion.div 
            initial={{ scaleX: 0 }} 
            animate={{ scaleX: 1 }} 
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{ originX: 0, backgroundColor: colors.green, width: `${(4/13)*100}%` }}
            className="h-full rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-lg"
          >
            Phase 3: Intelligence
          </motion.div>
        </div>
      </div>

      {/* Deliverables Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: colors.dark }}>
              <th className="px-3 py-2 text-left text-white font-bold w-20">Month</th>
              <th className="px-3 py-2 text-left text-white font-bold">Key Deliverables</th>
              <th className="px-3 py-2 text-left text-white font-bold w-40">Milestone Gate</th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.04 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-3 py-1.5 font-bold" style={{ color: colors.dark }}>{d.month}</td>
                <td className="px-3 py-1.5" style={{ color: colors.slate }}>{d.key}</td>
                <td className="px-3 py-1.5 font-bold" style={{ color: d.gateColor }}>{d.gate}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Payment Milestones */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.8 }} className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-2 font-bold text-xs text-white" style={{ backgroundColor: colors.teal }}>PAYMENT MILESTONES</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ backgroundColor: colors.lightGrey }}>
              <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}>#</th>
              <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}>Trigger</th>
              <th className="px-4 py-2 text-center font-bold" style={{ color: colors.dark }}>%</th>
              <th className="px-4 py-2 text-right font-bold" style={{ color: colors.dark }}>Target</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <motion.tr 
                key={p.num}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-bold" style={{ color: colors.teal }}>{p.num}</td>
                <td className="px-4 py-2" style={{ color: colors.slate }}>{p.trigger}</td>
                <td className="px-4 py-2 text-center font-bold" style={{ color: colors.dark }}>{p.pct}</td>
                <td className="px-4 py-2 text-right" style={{ color: colors.slate }}>{p.target}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 9: RESOURCES ====================
const Slide9Resources = () => {
  const tnTeam = [
    { role: "Project Director", p1: "10 hrs/wk", p2: "10 hrs/wk", p3: "10 hrs/wk", total: "520 hrs" },
    { role: "Technical Project Manager", p1: "40 hrs/wk", p2: "40 hrs/wk", p3: "40 hrs/wk", total: "2,080 hrs" },
    { role: "Solution Architect", p1: "40 hrs/wk", p2: "20 hrs/wk", p3: "10 hrs/wk", total: "1,200 hrs" },
    { role: "Senior Full-Stack Developers (2)", p1: "40 hrs/wk ea", p2: "40 hrs/wk ea", p3: "40 hrs/wk ea", total: "4,160 hrs" },
    { role: "AI/ML Engineer", p1: "20 hrs/wk", p2: "30 hrs/wk", p3: "40 hrs/wk", total: "1,560 hrs" },
    { role: "QA Engineer", p1: "20 hrs/wk", p2: "40 hrs/wk", p3: "40 hrs/wk", total: "1,760 hrs" },
    { role: "DevOps Engineer", p1: "30 hrs/wk", p2: "20 hrs/wk", p3: "30 hrs/wk", total: "1,360 hrs" },
  ];

  const ihsTeam = [
    { role: "Executive Sponsor", weekly: "1 hr/week", activities: "Monthly steering committee participation, critical escalation decisions, budget approvals, strategic direction" },
    { role: "Project Owner (Procurement)", weekly: "8 hrs/week", activities: "Requirements validation, UAT coordination, business process decisions, vendor communication, sign-offs" },
    { role: "IT Lead", weekly: "8 hrs/week", activities: "Technical review participation, integration support, security review, infrastructure coordination" },
    { role: "Business Analysts (2)", weekly: "20 hrs/week each", activities: "Requirements documentation, process mapping, test case development, UAT execution, training support" },
    { role: "SMEs + Change Champions", weekly: "4 hrs/week each", activities: "Domain expertise provision, training coordination, feedback collection, adoption monitoring" },
  ];

  return (
    <div className="w-full h-full p-8 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <div className="flex items-center gap-4 mb-5">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>05</motion.span>
        <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>Resource Mobilisation & Change Management</motion.h2>
      </div>

      {/* TN Macaulay Team */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
        <div className="px-4 py-2.5 flex justify-between items-center" style={{ backgroundColor: colors.teal }}>
          <span className="text-sm font-bold text-white">TN MACAULAY DELIVERY TEAM</span>
          <span className="text-sm text-white opacity-90">12,640 total hours over 13 months</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ backgroundColor: colors.lightGrey }}>
              <th className="px-3 py-2 text-left font-bold" style={{ color: colors.dark }}>Role</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: colors.blue }}>Phase 1 (4 mo)</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: colors.teal }}>Phase 2 (5 mo)</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: colors.green }}>Phase 3 (4 mo)</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: colors.dark }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {tnTeam.map((r, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-3 py-2" style={{ color: colors.dark }}>{r.role}</td>
                <td className="px-3 py-2 text-center" style={{ color: colors.slate }}>{r.p1}</td>
                <td className="px-3 py-2 text-center" style={{ color: colors.slate }}>{r.p2}</td>
                <td className="px-3 py-2 text-center" style={{ color: colors.slate }}>{r.p3}</td>
                <td className="px-3 py-2 text-right font-bold" style={{ color: colors.teal }}>{r.total}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* IHS Team */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
        <div className="px-4 py-2.5 flex justify-between items-center" style={{ backgroundColor: colors.navy }}>
          <span className="text-sm font-bold text-white">IHS TOWERS RESOURCES REQUIRED</span>
          <span className="text-sm text-white opacity-90">3,380 total hours over 13 months</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ backgroundColor: colors.lightGrey }}>
              <th className="px-3 py-2 text-left font-bold" style={{ color: colors.dark }}>Role</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: colors.dark }}>Weekly Commitment</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: colors.dark }}>Key Activities</th>
            </tr>
          </thead>
          <tbody>
            {ihsTeam.map((r, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-3 py-2 font-medium" style={{ color: colors.dark }}>{r.role}</td>
                <td className="px-3 py-2 text-center font-bold" style={{ color: colors.teal }}>{r.weekly}</td>
                <td className="px-3 py-2 text-sm" style={{ color: colors.slate }}>{r.activities}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Post-Deployment */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-5 py-3 rounded-xl text-sm flex gap-8"
        style={{ backgroundColor: colors.iceBlue }}
      >
        <span style={{ color: colors.dark }}><strong>Hypercare:</strong> 3 months (4-hour response SLA)</span>
        <span style={{ color: colors.dark }}><strong>Critical issues:</strong> 24/7 coverage</span>
        <span style={{ color: colors.dark }}><strong>Knowledge transfer:</strong> Month 13</span>
        <span style={{ color: colors.dark }}><strong>Optional maintenance:</strong> Available</span>
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 10: PERFORMANCE FRAMEWORK ====================
const Slide10Commercial = () => {
  const phases = [
    { phase: "Phase 1: Foundation & Core", time: "Feb–May 2026" },
    { phase: "Phase 2: RFx Workflows", time: "Jun–Oct 2026" },
    { phase: "Phase 3: Intelligence Suite", time: "Nov–Feb 2027" },
  ];

  const kpis = [
    { kpi: "Procurement cycle time", baseline: "45 days", target: "15 days" },
    { kpi: "Vendor onboarding duration", baseline: "3–4 weeks", target: "3–5 days" },
    { kpi: "Spend visibility coverage", baseline: "~40%", target: ">85%" },
    { kpi: "Cost savings (Year 1)", baseline: "Baseline", target: "10–15% YoY" },
    { kpi: "Process automation rate", baseline: "<10%", target: "80%+" },
  ];

  const competitive = [
    { metric: "AI/ML capabilities", procure: "5+ AI engines", ariba: "Basic analytics", oracle: "Basic analytics", inhouse: "None" },
    { metric: "D365 integration depth", procure: "Deep, proven", ariba: "Available", oracle: "Available", inhouse: "Custom build" },
    { metric: "Source code ownership", procure: "Full to IHS", ariba: "No (SaaS)", oracle: "No (SaaS)", inhouse: "Yes" },
    { metric: "Time to deployment", procure: "13 months", ariba: "6-12 months", oracle: "6-12 months", inhouse: "18+ months" },
    { metric: "Customization flexibility", procure: "Unlimited", ariba: "Limited", oracle: "Limited", inhouse: "Unlimited" },
  ];

  return (
    <div className="w-full h-full p-10 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <div className="flex items-center gap-4 mb-5">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>06</motion.span>
        <motion.h2 variants={fadeUp} initial="hidden" animate="visible" className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>Performance Framework</motion.h2>
      </div>

      <div className="flex gap-5 mb-5">
        {/* Programme Timeline */}
        <motion.div variants={fadeLeft} initial="hidden" animate="visible" className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-3" style={{ backgroundColor: colors.dark }}>
            <h3 className="text-sm font-bold text-white">PROGRAMME TIMELINE</h3>
          </div>
          <div className="p-5">
            {phases.map((i, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm font-medium" style={{ color: colors.dark }}>{i.phase}</span>
                <span className="text-sm" style={{ color: colors.teal }}>{i.time}</span>
              </motion.div>
            ))}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-between pt-4 mt-3 border-t-2 border-gray-200"
            >
              <span className="text-base font-bold" style={{ color: colors.dark }}>TOTAL DURATION</span>
              <span className="text-base font-bold" style={{ color: colors.green }}>13 Months</span>
            </motion.div>
          </div>
        </motion.div>

        {/* KPI Framework */}
        <motion.div variants={fadeRight} initial="hidden" animate="visible" className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-3" style={{ backgroundColor: colors.teal }}>
            <h3 className="text-sm font-bold text-white">KPI FRAMEWORK</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ backgroundColor: colors.lightGrey }}>
                <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}>KPI</th>
                <th className="px-4 py-2 text-center font-bold" style={{ color: colors.slate }}>Baseline</th>
                <th className="px-4 py-2 text-center font-bold" style={{ color: colors.green }}>Target</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k, i) => (
                <motion.tr 
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="border-b border-gray-100"
                >
                  <td className="px-4 py-2" style={{ color: colors.dark }}>{k.kpi}</td>
                  <td className="px-4 py-2 text-center" style={{ color: colors.slate }}>{k.baseline}</td>
                  <td className="px-4 py-2 text-center font-bold" style={{ color: colors.green }}>{k.target}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* Competitive Context */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-2.5" style={{ backgroundColor: colors.navy }}>
          <h3 className="text-sm font-bold text-white">COMPETITIVE CONTEXT</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ backgroundColor: colors.lightGrey }}>
              <th className="px-4 py-2 text-left font-bold" style={{ color: colors.dark }}></th>
              <th className="px-4 py-2 text-center font-bold" style={{ color: colors.teal }}>Procure AI</th>
              <th className="px-4 py-2 text-center font-bold" style={{ color: colors.slate }}>SAP Ariba</th>
              <th className="px-4 py-2 text-center font-bold" style={{ color: colors.slate }}>Oracle</th>
              <th className="px-4 py-2 text-center font-bold" style={{ color: colors.slate }}>In-House Build</th>
            </tr>
          </thead>
          <tbody>
            {competitive.map((c, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="border-b border-gray-100"
              >
                <td className="px-4 py-2 font-medium" style={{ color: colors.dark }}>{c.metric}</td>
                <td className="px-4 py-2 text-center font-bold" style={{ color: colors.green }}>{c.procure}</td>
                <td className="px-4 py-2 text-center" style={{ color: colors.slate }}>{c.ariba}</td>
                <td className="px-4 py-2 text-center" style={{ color: colors.slate }}>{c.oracle}</td>
                <td className="px-4 py-2 text-center" style={{ color: colors.slate }}>{c.inhouse}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 11: DECISIONS ====================
const Slide11Decisions = () => {
  const decisions = [
    { num: "01", title: "Confirm Programme Start Date", desc: "Approve project mobilisation for the 1 March 2026 start date. TN Macaulay team begins immediately with Azure environment provisioning, D365 API integration planning, and detailed architecture design during Month 1.", btn: "GO / NO-GO" },
    { num: "02", title: "Approve Governance Model & Team Allocation", desc: "Formally endorse the Steering Committee composition, monthly reporting cadence, RACI matrix for all workstreams, and escalation protocol. Confirm IHS project team role assignments including Project Owner, IT Lead, 2 Business Analysts, Subject Matter Experts, and Change Champions. Team members should be available from Week 1.", btn: "APPROVE" },
    { num: "03", title: "Instruct IT to Provision Infrastructure Access", desc: "Direct IHS IT to provision the following critical infrastructure: Azure subscription with required services (Week 1), D365 Finance & Operations API credentials with appropriate scopes (Week 2), VPN access for TN Macaulay development team (Week 1), and ServiceNow integration specifications (Month 2). Delays here directly impact project timeline.", btn: "APPROVE" },
  ];

  return (
    <div className="w-full h-full flex flex-col p-14" style={{ backgroundColor: colors.navy, paddingLeft: 80 }}>
      <div className="mb-8">
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="text-2xl font-bold"
          style={{ fontFamily: "Georgia, serif", color: colors.teal }}
        >
          07
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold mt-3 mb-4"
          style={{ fontFamily: "Georgia, serif", color: colors.white }}
        >
          Decision Points
        </motion.h2>
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2 }}
          className="w-52 h-1 mb-5 rounded-full"
          style={{ backgroundColor: colors.teal }}
        />
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ color: colors.slate }}
        >
          Three decisions required from the Group CIO to proceed with 1 March 2026 mobilisation:
        </motion.p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4 flex-1">
        {decisions.map((d, i) => (
          <motion.div
            key={d.num}
            variants={fadeLeft}
            whileHover={{ x: 8 }}
            className="flex items-center gap-6 p-5 rounded-xl cursor-default"
            style={{ backgroundColor: colors.dark }}
          >
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
              className="text-4xl font-bold"
              style={{ fontFamily: "Georgia, serif", color: colors.teal }}
            >
              {d.num}
            </motion.span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">{d.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: colors.slate }}>{d.desc}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: `0 0 25px ${colors.teal}60` }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-lg font-bold text-white flex-shrink-0"
              style={{ backgroundColor: colors.teal }}
            >
              {d.btn}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-6 px-6 py-4 rounded-xl border"
        style={{ borderColor: colors.teal }}
      >
        <p className="text-sm italic" style={{ color: colors.iceBlue }}>
          Thursday follow-up session will incorporate feedback from this meeting and conclude with formal written endorsement to proceed with project mobilisation.
        </p>
      </motion.div>
    </div>
  );
};

// ==================== SLIDE 12: CREDENTIALS ====================
const Slide12Credentials = () => {
  const projects = [
    { title: "Meristem Investment Bank", year: "2016", desc: "One of Nigeria's earliest enterprise AI chatbots deployed in production. NLP-powered investment advisory system processing thousands of customer queries daily with high accuracy and response times under 2 seconds. Integrated with core banking system for real-time portfolio updates.", color: colors.blue },
    { title: "Vodacom Procurement Platform", year: "2017–2019", desc: "Comprehensive three-in-one solution: internal procurement workflows, external vendor enablement portal, and real-time reverse auction capability. Deep D365 Finance & Operations integration with bidirectional sync. 200+ active vendors, processing over ₦2B annually in procurement transactions.", color: colors.teal },
    { title: "Enterprise Financial Wallet", year: "2018", desc: "Multi-tenant enterprise wallet platform supporting multiple large corporate clients. Features include D365 reconciliation automation, real-time transaction processing, and comprehensive audit trails. Over 50,000 active users across all tenant organisations with 99.9% uptime.", color: colors.green },
    { title: "Multi-Tenant AI Platform", year: "2018–Present", desc: "Enterprise-grade AI platform serving 15+ organisations on shared infrastructure with complete data isolation. Kubernetes-based deployment ensuring security and scalability. Processing 50K+ transactions monthly across HR, customer experience, and operations use cases.", color: colors.navy },
  ];

  const stats = [
    { value: "8+", label: "Years D365/Azure Experience" },
    { value: "15+", label: "Enterprise Tenant Organisations" },
    { value: "5", label: "D365 Deep Integrations" },
    { value: "50K+", label: "Monthly Transactions" },
    { value: "12", label: "Azure Production Apps" },
  ];

  return (
    <div className="w-full h-full p-12 overflow-hidden" style={{ backgroundColor: colors.lightGrey, paddingLeft: 80 }}>
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center mb-8">
        <p className="text-sm font-medium mb-2" style={{ color: colors.teal }}>APPENDIX</p>
        <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "Georgia, serif", color: colors.dark }}>TN Macaulay Team Credentials</h2>
        <p className="text-base" style={{ color: colors.slate }}>Pioneering enterprise AI solutions in Nigeria since 2016</p>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 gap-5 mb-8">
        {projects.map((p, i) => (
          <motion.div
            key={p.title}
            variants={scaleUp}
            whileHover={{ y: -4 }}
            className="rounded-xl overflow-hidden shadow-lg cursor-default"
          >
            <div className="px-5 py-3 flex justify-between items-center" style={{ backgroundColor: p.color }}>
              <h3 className="text-sm font-bold text-white">{p.title}</h3>
              <span className="text-xs text-white opacity-80 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>{p.year}</span>
            </div>
            <div className="p-5 bg-white">
              <p className="text-sm leading-relaxed" style={{ color: colors.slate }}>{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex justify-around py-6 rounded-xl"
        style={{ backgroundColor: colors.iceBlue }}
      >
        {stats.map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className="text-center"
          >
            <motion.p 
              className="text-4xl font-bold mb-1"
              style={{ fontFamily: "Georgia, serif", color: colors.teal }}
            >
              {s.value}
            </motion.p>
            <p className="text-xs" style={{ color: colors.slate }}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default ProcureAIExecutivePackV3;
