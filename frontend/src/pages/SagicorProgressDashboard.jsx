import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { RefreshCw, CheckCircle, Globe, Info, AlertTriangle, Clock, ChevronRight, Shield, Target, Users, BarChart3, Activity, Zap, Monitor, Smartphone, ArrowDown } from "lucide-react";

/* ─── Color Palette ─── */
const C = {
  navy: "#1B3A5C",
  deepNavy: "#0F2440",
  gold: "#D4A843",
  offWhite: "#F7F8FA",
  white: "#FFFFFF",
  lightGray: "#E8ECF1",
  medGray: "#8896A7",
  green: "#2E8B57",
  blue: "#3B82C4",
  amber: "#E8943A",
  red: "#C04040",
};

/* ─── Data ─── */
const progressData = {
  lastUpdated: "2026-02-26T12:27:00Z",
  hero: { totalSessions: 294, completed: 180, completionRate: 60.9, almostComplete: 59, activeNow: 6 },
  platform: { totalSessions: 1188, pageViews: 2884, avgActiveTime: "2.9h", totalActions: 674, dataPoints: 27421, questionsTracked: 2727, devices: { desktop: 1159, mobile: 29 }, userTypes: { candidate: 1184, anonymous: 4 } },
  sessionStatus: { completed: { count: 180, pct: 60.9 }, started: { count: 115, pct: 39.1 } },
  progressDistribution: [
    { range: "100%", count: 180, color: C.green },
    { range: "75-99%", count: 59, color: C.blue },
    { range: "50-74%", count: 8, color: C.gold },
    { range: "25-49%", count: 4, color: C.amber },
    { range: "1-24%", count: 21, color: C.red },
    { range: "0%", count: 22, color: C.medGray },
  ],
  regions: [
    { name: "Jamaica", status: "Active", employeesInScope: 329, sessions: 171, avgCompletionTime: "32h 30m", responses: 19316, questionsAnswered: 1769, avgTimePerQuestion: "1m 39s" },
    { name: "Canada", status: "Complete", employeesInScope: 67, sessions: 43, avgCompletionTime: "52h 3m", responses: 6860, questionsAnswered: 1609, avgTimePerQuestion: "1m 57s" },
    { name: "United States", status: "Complete", employeesInScope: 19, sessions: 12, avgCompletionTime: "72h 19m", responses: 1245, questionsAnswered: 662, avgTimePerQuestion: "1m 38s" },
  ],
  southernCaribbean: { employeesInScope: 90, status: "In Progress", expectedCompletion: "Week of March 3-7" },
  efficiency: { totalAnalyzed: 271, avgEfficiency: 4.3, high: { count: 82, threshold: "\u226570%" }, medium: { count: 28, threshold: "30-70%" }, low: { count: 161, threshold: "<30%" }, focused: { count: 82, avgActiveTime: "118min", medianActiveTime: "96min" } },
  dropOff: [
    { category: "Almost Complete (75-99%)", count: 59, color: C.blue },
    { category: "Not Started (0%)", count: 22, color: C.medGray },
    { category: "Early Drop-off (1-24%)", count: 21, color: C.red },
    { category: "Late Drop-off (50-74%)", count: 8, color: C.amber },
    { category: "Mid Drop-off (25-49%)", count: 4, color: C.gold },
  ],
  blockers: [
    { title: "Manager Validation Data Corrections", severity: "AMBER", description: "Manager validation forms depend on the manager feedback we receive during the self-assessments. Some employee data continues to be corrected as candidates complete their forms and identify their correct reporting managers. This creates a dependency for generating accurate manager validation documents.", mitigation: "Expected to be fully cleared by next week. All candidates will receive manager validation forms starting the week of March 3." },
    { title: "Southern Caribbean Assessments", severity: "IN PROGRESS", description: "The Southern Caribbean team (Barbados and Trinidad) assessments are still in progress. Manager validation for this region may be slightly delayed as the self-assessment data is still being collected.", mitigation: "Southern Caribbean assessments expected to complete within the next 1-2 weeks." },
  ],
  timeline: [
    { phase: "THIS WEEK", dates: "Feb 24-28", status: "NOW", isCurrent: true, items: "Complete remaining self-assessments; finalize manager data corrections; Southern Caribbean collection continues" },
    { phase: "NEXT WEEK", dates: "Mar 3-7", status: "UPCOMING", isCurrent: false, items: "Manager validation forms deployed to all regions; technical assessments and hands-on simulations begin (batched together); Southern Caribbean assessments complete" },
    { phase: "WEEKS 3-4", dates: "Mar 10-21", status: "PLANNED", isCurrent: false, items: "All assessment layers complete by mid-March; score aggregation begins; talent segmentation drafts; individual profile generation" },
    { phase: "WEEKS 5-6", dates: "Mar 24 - Apr 4", status: "PLANNED", isCurrent: false, items: "Two-week deep analysis period; dashboard build; all 17 deliverables completed; workforce blueprint finalized" },
    { phase: "DELIVERY", dates: "Apr 7-18", status: "TARGET", isCurrent: false, items: "Comprehensive executive presentation across all teams; results delivery and manager enablement; handover and close" },
  ],
  methodology: [
    { layer: "Self-Assessment", weight: "0%", purpose: "Diagnostic Only", status: "IN PROGRESS", statusColor: C.medGray, description: "Understanding self-perception and career aspirations. No scoring impact \u2014 eliminates gaming risk." },
    { layer: "Manager Validation", weight: "20%", purpose: "Supervisory Input", status: "NEXT WEEK", statusColor: C.navy, description: "Performance context, potential assessment, team dynamics, and leadership observations from direct managers." },
    { layer: "Technical Assessment", weight: "30%", purpose: "Skills Verification", status: "NEXT WEEK", statusColor: C.blue, description: "Verified technical competencies across DevSecOps, BOAT, Data & AI, Cloud Native, Automation, and Modern Development." },
    { layer: "Hands-On Simulation", weight: "30%", purpose: "Practical Problem-Solving", status: "NEXT WEEK", statusColor: C.green, description: "Real-world capability, decision-making under pressure, and collaboration style evaluation." },
    { layer: "Delivery Habits & ICARE", weight: "20%", purpose: "Values & Collaboration", status: "ONGOING", statusColor: C.gold, description: "Integrity, Community, Accountability, Responsiveness, and Excellence values along with delivery habit assessment." },
  ],
};

/* ─── Animated Counter Hook ─── */
function useCountUp(end, duration = 1800, startOnView = false, inView = true) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (startOnView && !inView) return;
    if (hasRun.current) return;
    hasRun.current = true;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, startOnView, inView]);

  return count;
}

/* ─── Section Wrapper with Scroll Reveal ─── */
const Section = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

/* ─── KPI Card ─── */
const KPICard = ({ value, label, sublabel, accentColor, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useCountUp(value, 2000, true, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
      className="bg-white rounded-xl overflow-hidden cursor-default"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="h-1" style={{ background: accentColor }} />
      <div className="p-5 md:p-6">
        <div className="text-4xl md:text-5xl font-bold" style={{ color: accentColor, fontFamily: "Georgia, serif" }}>
          {count.toLocaleString()}
        </div>
        <div className="text-sm font-semibold mt-1" style={{ color: C.deepNavy, fontFamily: "Calibri, sans-serif" }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: C.medGray }}>{sublabel}</div>
      </div>
    </motion.div>
  );
};

/* ─── Mini KPI Card ─── */
const MiniKPI = ({ value, label, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const numericVal = typeof value === "number" ? value : null;
  const count = useCountUp(numericVal || 0, 1600, true, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-lg p-4 text-center"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="text-xl md:text-2xl font-bold" style={{ color: C.navy, fontFamily: "Georgia, serif" }}>
        {numericVal ? count.toLocaleString() : value}
      </div>
      <div className="text-xs mt-1" style={{ color: C.medGray }}>{label}</div>
    </motion.div>
  );
};

/* ─── Progress Bar ─── */
const AnimatedBar = ({ pct, color, label, count, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: C.medGray }}>
        <span className="font-semibold" style={{ color: C.deepNavy }}>{label}</span>
        <span>{count} ({pct}%)</span>
      </div>
      <div className="w-full h-8 rounded-full overflow-hidden" style={{ background: C.lightGray }}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full flex items-center justify-center"
          style={{ background: color }}
        >
          <span className="text-xs font-bold text-white drop-shadow">{pct}%</span>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── Region Card ─── */
const RegionCard = ({ region, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useCountUp(region.employeesInScope, 1800, true, inView);
  const statusColor = region.status === "Active" ? C.green : C.blue;
  const metrics = [
    { label: "Sessions", value: region.sessions },
    { label: "Avg Completion Time", value: region.avgCompletionTime },
    { label: "Responses Collected", value: typeof region.responses === "number" ? region.responses.toLocaleString() : region.responses },
    { label: "Questions Answered", value: typeof region.questionsAnswered === "number" ? region.questionsAnswered.toLocaleString() : region.questionsAnswered },
    { label: "Avg Time per Question", value: region.avgTimePerQuestion },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}
      className="bg-white rounded-xl overflow-hidden cursor-pointer"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      data-testid={`region-card-${region.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: C.navy }}>
        <span className="text-white font-semibold text-sm">{region.name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: statusColor }}>{region.status}</span>
      </div>
      <div className="p-5">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold" style={{ color: C.navy, fontFamily: "Georgia, serif" }}>{count}</div>
          <div className="text-xs" style={{ color: C.medGray }}>Employees in Scope</div>
        </div>
        <div className="space-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex justify-between py-1.5 border-b" style={{ borderColor: C.lightGray }}>
              <span className="text-xs" style={{ color: C.medGray }}>{m.label}</span>
              <span className="text-xs font-semibold" style={{ color: C.deepNavy }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Timeline Milestone ─── */
const TimelineMilestone = ({ item, index, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const statusColors = { NOW: C.gold, UPCOMING: C.blue, PLANNED: C.navy, TARGET: C.green };
  const dotColor = statusColors[item.status] || C.medGray;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-4 md:gap-6 relative"
      data-testid={`timeline-${item.status.toLowerCase()}`}
    >
      {/* Dot + Line */}
      <div className="flex flex-col items-center">
        <motion.div
          className="w-4 h-4 rounded-full z-10 shrink-0"
          style={{ background: dotColor, boxShadow: item.isCurrent ? `0 0 0 6px ${dotColor}33, 0 0 16px ${dotColor}55` : "none" }}
          animate={item.isCurrent ? { scale: [1, 1.3, 1], boxShadow: [`0 0 0 6px ${dotColor}33`, `0 0 0 10px ${dotColor}22`, `0 0 0 6px ${dotColor}33`] } : {}}
          transition={item.isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        />
        {index < 4 && <div className="w-0.5 flex-1 min-h-[40px]" style={{ background: C.lightGray }} />}
      </div>
      {/* Content */}
      <div
        className="flex-1 rounded-xl p-4 md:p-5 mb-4"
        style={{
          background: C.white,
          boxShadow: item.isCurrent ? `0 4px 20px ${dotColor}22` : "0 2px 8px rgba(0,0,0,0.06)",
          borderLeft: `4px solid ${dotColor}`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: dotColor }}>{item.status}</span>
          <span className="text-sm font-bold" style={{ color: C.deepNavy }}>{item.phase}</span>
          <span className="text-xs" style={{ color: C.medGray }}>{item.dates}</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: C.medGray }}>{item.items}</p>
      </div>
    </motion.div>
  );
};

/* ─── Methodology Card ─── */
const MethodologyCard = ({ item, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-4 bg-white rounded-xl p-4 md:p-5"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
    >
      {/* Weight Circle */}
      <div className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-[3px]" style={{ borderColor: item.statusColor }}>
        <span className="text-sm font-bold" style={{ color: item.statusColor, fontFamily: "Georgia, serif" }}>{item.weight}</span>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-bold" style={{ color: C.deepNavy }}>{item.layer}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: item.statusColor }}>{item.status}</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: C.medGray }}>{item.description}</p>
      </div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function SagicorProgressDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <div style={{ background: C.offWhite, fontFamily: "'Calibri', 'Segoe UI', sans-serif" }} className="min-h-screen overflow-x-hidden">
      {/* ─── Print Styles ─── */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          * { box-shadow: none !important; }
          body { background: white !important; }
          section { break-inside: avoid; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,168,67,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(212,168,67,0); }
        }
      `}</style>

      {/* ═══ TOP NAV BAR ═══ */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 no-print"
        style={{ background: C.deepNavy, borderBottom: `2px solid ${C.gold}` }}
        data-testid="top-nav-bar"
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* THCO Logo Placeholder */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: C.gold }}>
                <span className="text-xs font-bold" style={{ color: C.deepNavy }}>T</span>
              </div>
              <div>
                <div className="text-white font-bold text-sm tracking-wide">THCO GLOBAL</div>
                <div className="text-xs" style={{ color: C.gold }}>Sagicor Assessment</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-8" style={{ background: "rgba(255,255,255,0.15)" }} />
            <h1 className="hidden md:block text-white font-semibold text-sm tracking-wide">Progress Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs" style={{ color: C.medGray }}>
              Last Updated: February 26, 2026
            </span>
            <motion.button
              onClick={handleRefresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: `${C.gold}22`, color: C.gold, border: `1px solid ${C.gold}44` }}
              data-testid="refresh-button"
            >
              <motion.span animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}>
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.span>
              Refresh Data
            </motion.button>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">

        {/* ═══ SECTION 1: HERO METRICS BAR ═══ */}
        <div className="py-6" data-testid="hero-metrics-section">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <h2 className="text-lg font-bold" style={{ color: C.deepNavy }}>Executive Summary</h2>
            <p className="text-xs" style={{ color: C.medGray }}>Real-time assessment progress across all active regions</p>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard value={progressData.hero.totalSessions} label="Total Sessions" sublabel="Across 3 Active Regions" accentColor={C.navy} delay={0.1} />
            <KPICard value={progressData.hero.completed} label="Assessments Completed" sublabel="60.9% Completion Rate" accentColor={C.green} delay={0.2} />
            <KPICard value={progressData.hero.almostComplete} label="Almost Complete" sublabel="75-99% Progress" accentColor={C.blue} delay={0.3} />
            <KPICard value={progressData.hero.activeNow} label="Active Right Now" sublabel="Real-Time Engagement" accentColor={C.gold} delay={0.4} />
          </div>
        </div>

        {/* ═══ SECTION 2: PLATFORM ANALYTICS ═══ */}
        <Section className="pb-8" data-testid="platform-analytics-section">
          <h2 className="text-lg font-bold mb-4" style={{ color: C.deepNavy }}>Platform Analytics Overview</h2>

          {/* Mini KPI Row */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <MiniKPI value={progressData.platform.totalSessions} label="Total Sessions" delay={0.05} />
            <MiniKPI value={progressData.platform.pageViews} label="Page Views" delay={0.1} />
            <MiniKPI value={progressData.platform.avgActiveTime} label="Avg Active Time" delay={0.15} />
            <MiniKPI value={progressData.platform.totalActions} label="Total Actions" delay={0.2} />
            <MiniKPI value={progressData.platform.dataPoints} label="Data Points Collected" delay={0.25} />
            <MiniKPI value={progressData.platform.questionsTracked} label="Questions Tracked" delay={0.3} />
          </div>

          {/* Two Panels */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Session Completion Panel */}
            <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4" style={{ color: C.green }} />
                <span className="text-sm font-bold" style={{ color: C.deepNavy }}>Session Completion Status</span>
              </div>
              <AnimatedBar pct={60.9} color={C.green} label="Completed" count={180} delay={0.2} />
              <AnimatedBar pct={39.1} color={C.blue} label="In Progress" count={115} delay={0.4} />

              <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.lightGray}` }}>
                <div className="text-xs font-semibold mb-3" style={{ color: C.deepNavy }}>Progress Distribution</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {progressData.progressDistribution.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="rounded-lg p-2 text-center border-2"
                      style={{ borderColor: d.color }}
                    >
                      <div className="text-base font-bold" style={{ color: d.color }}>{d.count}</div>
                      <div className="text-[10px]" style={{ color: C.medGray }}>{d.range}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Engagement Panel */}
            <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4" style={{ color: C.blue }} />
                <span className="text-sm font-bold" style={{ color: C.deepNavy }}>Platform Engagement</span>
              </div>

              {/* Device Breakdown */}
              <div className="mb-5">
                <div className="text-xs font-semibold mb-3" style={{ color: C.deepNavy }}>Sessions by Device</div>
                {[
                  { icon: <Monitor className="w-3.5 h-3.5" />, label: "Desktop", value: 1159, pct: 97.6 },
                  { icon: <Smartphone className="w-3.5 h-3.5" />, label: "Mobile", value: 29, pct: 2.4 },
                ].map((d, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5" style={{ color: C.deepNavy }}>
                        {d.icon} {d.label}
                      </div>
                      <span style={{ color: C.medGray }}>{d.value.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.lightGray }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.2 }}
                        className="h-full rounded-full"
                        style={{ background: C.navy }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* User Type Breakdown */}
              <div>
                <div className="text-xs font-semibold mb-3" style={{ color: C.deepNavy }}>Sessions by User Type</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs py-2 px-3 rounded-lg" style={{ background: C.offWhite }}>
                    <span style={{ color: C.deepNavy }}>Candidate Sessions</span>
                    <span className="font-semibold" style={{ color: C.navy }}>1,184 (100%)</span>
                  </div>
                  <div className="flex justify-between text-xs py-2 px-3 rounded-lg" style={{ background: C.offWhite }}>
                    <span style={{ color: C.deepNavy }}>Anonymous Sessions</span>
                    <span className="font-semibold" style={{ color: C.medGray }}>4 (0%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ SECTION 3: REGIONAL PERFORMANCE ═══ */}
        <Section className="pb-8" delay={0.1}>
          <h2 className="text-lg font-bold mb-4" style={{ color: C.deepNavy }}>Regional Performance Breakdown</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {progressData.regions.map((r, i) => (
              <RegionCard key={r.name} region={r} delay={i * 0.15} />
            ))}
          </div>
          {/* Southern Caribbean Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: `${C.blue}12`, border: `1px solid ${C.blue}33` }}
            data-testid="southern-caribbean-banner"
          >
            <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.blue }} />
            <div>
              <span className="text-sm font-semibold" style={{ color: C.deepNavy }}>Southern Caribbean (Barbados & Trinidad)</span>
              <span className="text-sm" style={{ color: C.medGray }}> — 90 employees | Assessments in progress | Expected completion: Week of March 3-7</span>
            </div>
          </motion.div>
        </Section>

        {/* ═══ SECTION 4: ENGAGEMENT & EFFICIENCY ═══ */}
        <Section className="pb-8" delay={0.1}>
          <h2 className="text-lg font-bold mb-4" style={{ color: C.deepNavy }}>Engagement & Efficiency Analysis</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Efficiency Distribution */}
            <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4" style={{ color: C.navy }} />
                <span className="text-sm font-bold" style={{ color: C.deepNavy }}>Efficiency Distribution</span>
              </div>
              <p className="text-xs mb-4" style={{ color: C.medGray }}>271 Total Analyzed | 4.3% Avg Efficiency</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: `High Efficiency (${progressData.efficiency.high.threshold})`, count: progressData.efficiency.high.count, color: C.green, sublabel: "Focused, minimal breaks" },
                  { label: `Medium Efficiency (${progressData.efficiency.medium.threshold})`, count: progressData.efficiency.medium.count, color: C.gold, sublabel: "Some breaks taken" },
                  { label: `Low Efficiency (${progressData.efficiency.low.threshold})`, count: progressData.efficiency.low.count, color: C.red, sublabel: "Many drop-offs/breaks" },
                ].map((e, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="rounded-lg p-3 border-2 text-center"
                    style={{ borderColor: e.color }}
                  >
                    <div className="text-2xl font-bold" style={{ color: e.color, fontFamily: "Georgia, serif" }}>{e.count}</div>
                    <div className="text-[10px] font-semibold mt-1" style={{ color: C.deepNavy }}>{e.label}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: C.medGray }}>{e.sublabel}</div>
                  </motion.div>
                ))}
              </div>

              <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: C.offWhite, color: C.medGray }}>
                <strong style={{ color: C.deepNavy }}>Efficiency</strong> = Active Time / Elapsed Time x 100%. Low efficiency indicates candidates are taking breaks across multiple sessions, which is expected and acceptable for a thorough self-assessment.
              </div>
            </div>

            {/* Focused Participants */}
            <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4" style={{ color: C.gold }} />
                <span className="text-sm font-bold" style={{ color: C.deepNavy }}>Focused Participants View</span>
              </div>
              <p className="text-xs mb-4" style={{ color: C.medGray }}>Candidates with 70%+ efficiency (minimal breaks)</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { value: "82", label: "Focused Participants" },
                  { value: "118min", label: "Avg Active Time" },
                  { value: "96min", label: "Median Active Time" },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.12 }}
                    className="rounded-lg p-4 text-center"
                    style={{ background: C.deepNavy }}
                  >
                    <div className="text-xl font-bold" style={{ color: C.gold, fontFamily: "Georgia, serif" }}>{f.value}</div>
                    <div className="text-[10px] text-white/70 mt-1">{f.label}</div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="rounded-lg p-3 text-xs leading-relaxed"
                style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}33`, color: C.deepNavy }}
              >
                <strong>Key Insight:</strong> 82 participants (30% of total) completed with focused effort. Their median completion time of 96 minutes suggests the assessment takes approximately 60-90 minutes of focused attention.
              </motion.div>
            </div>
          </div>
        </Section>

        {/* ═══ SECTION 5: DROP-OFF ANALYSIS ═══ */}
        <Section className="pb-8" delay={0.1}>
          <h2 className="text-lg font-bold mb-4" style={{ color: C.deepNavy }}>Drop-Off Analysis</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {progressData.dropOff.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3 }}
                className="bg-white rounded-xl p-4 text-center"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                data-testid={`dropoff-card-${i}`}
              >
                <div className="text-3xl font-bold" style={{ color: d.color, fontFamily: "Georgia, serif" }}>{d.count}</div>
                <div className="text-xs font-semibold mt-1" style={{ color: C.deepNavy }}>{d.category.split("(")[0].trim()}</div>
                <div className="text-[10px] mt-0.5" style={{ color: C.medGray }}>({d.category.match(/\(([^)]+)\)/)?.[1] || ""})</div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="rounded-xl p-4 text-xs leading-relaxed"
            style={{ background: `${C.blue}0D`, border: `1px solid ${C.blue}22`, color: C.medGray }}
            data-testid="dropoff-insight-bar"
          >
            <strong style={{ color: C.deepNavy }}>59 candidates</strong> are at 75-99% completion and are expected to finish imminently. The <strong style={{ color: C.deepNavy }}>22 'Not Started'</strong> are primarily from the Southern Caribbean region where assessments are still being deployed.
          </motion.div>
        </Section>

        {/* ═══ SECTION 6: BLOCKERS & MITIGATIONS ═══ */}
        <Section className="pb-8" delay={0.1}>
          <h2 className="text-lg font-bold mb-4" style={{ color: C.deepNavy }}>Current Blockers & Mitigations</h2>
          <div className="space-y-4 mb-4">
            {progressData.blockers.map((b, i) => {
              const isAmber = b.severity === "AMBER";
              const barColor = isAmber ? C.amber : C.blue;
              const badgeBg = isAmber ? C.amber : C.blue;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="bg-white rounded-xl overflow-hidden flex"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                  data-testid={`blocker-card-${i}`}
                >
                  <motion.div
                    className="w-1.5 shrink-0"
                    style={{ background: barColor }}
                    animate={isAmber ? { opacity: [1, 0.4, 1] } : {}}
                    transition={isAmber ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                  />
                  <div className="p-5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: badgeBg }}>{b.severity}</span>
                      <span className="text-sm font-bold" style={{ color: C.deepNavy }}>{b.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: C.medGray }}>{b.description}</p>
                    <p className="text-xs leading-relaxed font-semibold" style={{ color: C.green }}>
                      Mitigation: {b.mitigation}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Confidence Statement */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="rounded-xl py-4 px-6 text-center"
            style={{ background: C.navy }}
            data-testid="confidence-statement"
          >
            <p className="text-sm font-bold" style={{ color: C.gold }}>
              Neither blocker impacts the overall project timeline. We remain confident in meeting the mid-March completion target.
            </p>
          </motion.div>
        </Section>

        {/* ═══ SECTION 7: PATH FORWARD & TIMELINE ═══ */}
        <Section className="pb-8" delay={0.1}>
          <h2 className="text-lg font-bold mb-6" style={{ color: C.deepNavy }}>Path Forward & Timeline</h2>
          <div className="pl-2">
            {progressData.timeline.map((t, i) => (
              <TimelineMilestone key={i} item={t} index={i} delay={i * 0.15} />
            ))}
          </div>
        </Section>

        {/* ═══ SECTION 8: ASSESSMENT METHODOLOGY ═══ */}
        <Section className="pb-8" delay={0.1}>
          <h2 className="text-lg font-bold mb-1" style={{ color: C.deepNavy }}>Assessment Methodology Reminder</h2>
          <p className="text-xs mb-4" style={{ color: C.medGray }}>5-Layer Assessment Approach with Updated Scoring Weights</p>
          <div className="space-y-3">
            {progressData.methodology.map((m, i) => (
              <MethodologyCard key={i} item={m} delay={i * 0.12} />
            ))}
          </div>
        </Section>

        {/* ═══ FOOTER ═══ */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="py-8 text-center space-y-1"
          style={{ borderTop: `1px solid ${C.lightGray}` }}
          data-testid="dashboard-footer"
        >
          <p className="text-xs font-semibold" style={{ color: C.navy }}>THCO Global LLC | Sagicor Technology Capability Assessment | Confidential</p>
          <p className="text-xs" style={{ color: C.medGray }}>Last Updated: February 26, 2026</p>
          <p className="text-xs" style={{ color: C.medGray }}>For questions, contact Ayo, Managing Partner, THCO Global LLC</p>
        </motion.footer>
      </div>
    </div>
  );
}
