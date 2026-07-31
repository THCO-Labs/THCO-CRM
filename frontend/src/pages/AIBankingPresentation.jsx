import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Shield, Scale, Globe, Zap, Database, Link, Lock, Eye, Layers, FileText, RefreshCw,
  AlertTriangle, CheckCircle, Clock, MessageCircle, Users, Headphones, Bell, Phone,
  MessageSquare, Server, ArrowRight, ChevronLeft, ChevronRight, Brain, Settings,
  TrendingUp, Activity, Target, Cpu, GitBranch, MonitorSpeaker, X, ChevronUp,
  Maximize, BarChart3, PhoneOff, Repeat, Ban
} from "lucide-react";

/* ═══════════════════════════════════════════════
   COLOR SYSTEM
   ═══════════════════════════════════════════════ */
const P = {
  dark: "#0A1628",
  navy: "#1B3A5C",
  blue: "#2E75B6",
  iceBlue: "#D5E8F0",
  gold: "#C5963A",
  white: "#FFFFFF",
  lightGrey: "#F4F6F8",
  textDark: "#1A1A2E",
  green: "#27AE60",
  amber: "#F39C12",
  red: "#E74C3C",
};

/* ═══════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════ */
function useCountUp(end, duration = 1800, inView = true) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);
  useEffect(() => {
    if (!inView || hasRun.current) return;
    hasRun.current = true;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, inView]);
  return count;
}

/* ═══════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════ */
const ease = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.12, ease } }) };
const fadeIn = { hidden: { opacity: 0, scale: 0.95 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.6, delay: i * 0.12, ease } }) };
const slideL = { hidden: { opacity: 0, x: -40 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.7, delay: i * 0.12, ease } }) };
const slideR = { hidden: { opacity: 0, x: 40 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.7, delay: i * 0.12, ease } }) };

/* ═══════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════ */
const SectionLabel = ({ children, color = P.gold }) => (
  <motion.div variants={fadeUp} custom={0} className="text-xs font-semibold tracking-[3px] uppercase mb-3" style={{ color, fontFamily: "Inter, sans-serif" }}>{children}</motion.div>
);

const Headline = ({ children, light = false, size = "text-4xl md:text-5xl" }) => (
  <motion.h2 variants={fadeUp} custom={1} className={`${size} font-bold leading-tight mb-4`} style={{ color: light ? P.white : P.textDark, fontFamily: "Inter, sans-serif" }}>{children}</motion.h2>
);

const Quote = ({ children }) => (
  <motion.blockquote variants={fadeUp} custom={2} className="border-l-4 pl-4 italic text-base md:text-lg leading-relaxed my-4" style={{ borderColor: P.gold, color: P.gold + "dd" }}>{children}</motion.blockquote>
);

const StatCard = ({ value, label, sublabel, color = P.gold, delay = 0, dark = true }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const numVal = typeof value === "string" && /^\d/.test(value) ? parseInt(value.replace(/[^\d]/g, "")) : null;
  const prefix = typeof value === "string" ? value.match(/^[^\d]*/)?.[0] || "" : "";
  const suffix = typeof value === "string" ? value.replace(/^[^\d]*\d+/, "") : "";
  const count = useCountUp(numVal || 0, 1800, inView);
  return (
    <motion.div ref={ref} variants={fadeIn} custom={delay} className="rounded-xl p-5 text-center" style={{ background: dark ? `${P.navy}88` : P.white, border: `1px solid ${dark ? P.navy : P.iceBlue}`, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
      <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color, fontFamily: "Inter, sans-serif" }}>{prefix}{numVal !== null ? count.toLocaleString() : value}{suffix}</div>
      <div className="text-sm font-semibold mb-0.5" style={{ color: dark ? P.white : P.textDark }}>{label}</div>
      {sublabel && <div className="text-xs" style={{ color: dark ? "#8896A7" : "#8896A7" }}>{sublabel}</div>}
    </motion.div>
  );
};

const CaseStudySlide = ({ icon, region, challenge, solution, results, callout, stat }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const statNum = stat ? parseInt(stat.value.replace(/[^\d]/g, "")) : null;
  const statCount = useCountUp(statNum || 0, 1800, inView);
  return (
    <div ref={ref} className="max-w-4xl mx-auto px-6">
      <motion.div variants={fadeIn} custom={0} className="rounded-2xl overflow-hidden" style={{ background: P.white, boxShadow: "0 8px 40px rgba(0,0,0,0.1)" }}>
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${P.navy}, ${P.blue})` }}>
          <span className="text-lg">{icon}</span>
          <span className="text-white font-bold text-sm tracking-wide">{region}</span>
        </div>
        <div className="p-6 space-y-5">
          {[{ label: "CHALLENGE", items: challenge, color: P.red }, { label: "SOLUTION", items: solution, color: P.blue }, { label: "RESULTS", items: results, color: P.green }].map((s, si) => (
            <motion.div key={si} variants={fadeUp} custom={si + 1} className="rounded-lg pl-4 py-3 pr-4" style={{ borderLeft: `4px solid ${s.color}`, background: s.color + "08" }}>
              <div className="text-xs font-bold tracking-[2px] uppercase mb-2" style={{ color: s.color }}>{s.label}</div>
              {stat && s.label === "RESULTS" && <div className="text-3xl font-bold mb-2" style={{ color: P.green }}>{stat.prefix || ""}{statNum ? statCount : stat.value}{stat.suffix || ""} <span className="text-sm font-normal" style={{ color: P.textDark }}>{stat.label}</span></div>}
              {s.items.map((item, i) => <div key={i} className="text-sm leading-relaxed mb-1" style={{ color: P.textDark }}>{item}</div>)}
            </motion.div>
          ))}
          {callout && <motion.div variants={fadeUp} custom={4} className="rounded-lg p-4 text-sm leading-relaxed" style={{ background: P.gold + "18", border: `1px solid ${P.gold}44`, color: P.textDark }}><strong>{callout}</strong></motion.div>}
        </div>
      </motion.div>
    </div>
  );
};

const InteractiveSlide = ({ headline, subhead, prompts }) => (
  <div className="max-w-3xl mx-auto px-6 text-center">
    <motion.div variants={fadeIn} custom={0}><MessageCircle className="w-16 h-16 mx-auto mb-6" style={{ color: P.white }} /></motion.div>
    <Headline light size="text-4xl md:text-5xl">{headline}</Headline>
    <motion.p variants={fadeUp} custom={2} className="text-xl md:text-2xl mb-10" style={{ color: P.iceBlue }}>{subhead}</motion.p>
    <div className="text-left space-y-4">
      {prompts.map((q, i) => (
        <motion.div key={i} variants={slideL} custom={i + 3} className="flex gap-3 items-start">
          <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: P.gold + "33", color: P.gold }}>{i + 1}</span>
          <span className="text-base md:text-lg leading-relaxed pt-1" style={{ color: P.white }}>{q}</span>
        </motion.div>
      ))}
    </div>
    <motion.div variants={fadeUp} custom={9} className="mt-10 pt-4" style={{ borderTop: `1px solid ${P.gold}44` }}>
      <span className="text-sm italic" style={{ color: P.gold }}>5-10 minute open discussion</span>
    </motion.div>
  </div>
);

/* Background gradient mesh for dark slides */
const DarkBg = () => (
  <div className="absolute inset-0 overflow-hidden" style={{ background: P.dark }}>
    <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 20% 50%, ${P.navy}88 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${P.blue}44 0%, transparent 50%)`, animation: "meshShift 25s ease-in-out infinite alternate" }} />
  </div>
);

/* Slide wrapper with consistent layout */
const SlideContainer = ({ children, dark = false, gradient = false, className = "" }) => (
  <div className={`relative min-h-screen flex items-center justify-center py-20 ${className}`} style={{ background: dark ? undefined : gradient ? undefined : P.lightGrey }}>
    {dark && <DarkBg />}
    {gradient && <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${P.dark} 0%, ${P.navy} 50%, ${P.blue} 100%)` }} />}
    <motion.div className="relative z-10 w-full max-w-[1200px] mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
      {children}
    </motion.div>
  </div>
);

/* ═══════════════════════════════════════════════
   ALL 32 SLIDES
   ═══════════════════════════════════════════════ */

/* SLIDE 1 — TITLE */
const Slide1 = () => (
  <SlideContainer dark>
    <div className="text-center px-6">
      <SectionLabel>A LEARNING SESSION</SectionLabel>
      <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-bold mb-3" style={{ color: P.white, fontFamily: "Inter, sans-serif" }}>AI for Banking</motion.h1>
      <motion.p variants={fadeUp} custom={2} className="text-2xl md:text-4xl font-light mb-6" style={{ color: P.blue }}>From Monitoring to Intelligence</motion.p>
      <motion.div variants={fadeIn} custom={3} className="w-28 h-[2px] mx-auto mb-6" style={{ background: P.gold }} />
      <motion.p variants={fadeUp} custom={4} className="text-sm mb-2" style={{ color: "#8896A7" }}>Presented by THCO in partnership with Collaborative Technology</motion.p>
      <motion.p variants={fadeUp} custom={5} className="text-sm" style={{ color: "#8896A7" }}>February 2026</motion.p>
      <motion.div variants={fadeUp} custom={6} className="flex items-center justify-center gap-6 mt-8">
        {["THCO", "CoTi"].map((n, i) => <div key={i} className="px-5 py-2 rounded-lg text-xs font-semibold" style={{ background: P.navy, color: P.iceBlue, border: `1px solid ${P.blue}44` }}>{n}</div>)}
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 2 — ABOUT US */
const Slide2 = () => (
  <SlideContainer>
    <div className="grid md:grid-cols-5 gap-10 px-6 items-center">
      <div className="md:col-span-3">
        <SectionLabel color={P.blue}>WHO WE ARE</SectionLabel>
        <Headline>Applied AI Since 2015</Headline>
        {["Through the deep learning wave (TensorFlow, PyTorch) into today's large language model era", "Production AI systems delivered under regulated environments — banking, insurance, pharmaceutical, mobility", "Security-first, audit-first delivery — every system built with governance, logging, and measurable outcomes"].map((t, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="flex gap-3 items-start mb-3">
            <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: P.blue }} />
            <p className="text-base leading-relaxed" style={{ color: P.textDark }}>{t}</p>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeIn} custom={5} className="md:col-span-2 flex items-center justify-center">
        <div className="relative w-64 h-64">
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const r = 90;
            const x = 128 + Math.cos(angle) * r;
            const y = 128 + Math.sin(angle) * r;
            return <motion.div key={i} className="absolute w-3 h-3 rounded-full" style={{ left: x, top: y, background: P.blue }} animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, delay: i * 0.25, repeat: Infinity }} />;
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-12 h-12" style={{ color: P.gold }} />
          </div>
        </div>
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 3 — WHY NOW */
const Slide3 = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const branches = useCountUp(229, 1800, inView);
  const assets = useCountUp(53, 1800, inView);
  const stats = [
    { display: `~${branches}`, label: "Combined Branches", sub: "Nationwide presence across Nigeria" },
    { display: `₦${(assets / 10).toFixed(1)}T`, label: "Combined Assets", sub: "As of June 2025 reporting" },
    { display: "~9th", label: "Largest Bank by Assets", sub: "Post-merger ranking" },
  ];
  return (
    <SlideContainer dark>
      <div ref={ref} className="px-6">
        <div className="text-center mb-8">
          <SectionLabel>CONTEXT</SectionLabel>
          <Headline light>Why This Matters — Right Now</Headline>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeIn} custom={i} className="rounded-xl p-5 text-center" style={{ background: `${P.navy}88`, border: `1px solid ${P.navy}`, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: P.gold, fontFamily: "Inter, sans-serif" }}>{s.display}</div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: P.white }}>{s.label}</div>
              <div className="text-xs" style={{ color: "#8896A7" }}>{s.sub}</div>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: <Shield className="w-5 h-5" />, text: "CBN's fintech direction emphasises trust, safety, data governance, responsible AI" },
            { icon: <Scale className="w-5 h-5" />, text: "NDPA/NDPR requirements on automated decision-making" },
            { icon: <Globe className="w-5 h-5" />, text: "ISO/IEC 42001:2023 — first international AI management standard" },
            { icon: <Zap className="w-5 h-5" />, text: "Banks that operationalise governance early move faster with less risk" },
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} custom={i + 4} className="flex gap-3 items-start rounded-lg p-3" style={{ background: P.navy + "66" }}>
              <div style={{ color: P.gold }}>{item.icon}</div>
              <span className="text-sm" style={{ color: P.iceBlue }}>{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideContainer>
  );
};

/* SLIDE 4 — AI vs AUTOMATION */
const Slide4 = () => (
  <SlideContainer>
    <div className="px-6">
      <div className="text-center mb-8"><Headline>Clearing the Confusion: AI is Not Automation</Headline></div>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {[
          { label: "AUTOMATION", color: P.amber, icon: <Settings className="w-8 h-8" />, items: ["IF this, THEN do that", "Rules. Predictable. Static.", "Follows instructions exactly", "Handles the known"], code: "IF transaction fails → reverse" },
          { label: "ARTIFICIAL INTELLIGENCE", color: P.blue, icon: <Brain className="w-8 h-8" />, items: ["Based on patterns, THIS is likely happening, WHY, and WHAT to do", "Patterns. Probabilistic. Learning.", "Reasons with evidence", "Handles the unknown"], code: "87% probability of failure in 25 minutes.\nRoot cause: connection pool exhaustion.\nRecommended: increase timeout threshold." },
        ].map((col, ci) => (
          <motion.div key={ci} variants={ci === 0 ? slideL : slideR} custom={ci} className="rounded-xl overflow-hidden" style={{ background: P.white, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div className="h-1.5" style={{ background: col.color }} />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div style={{ color: col.color }}>{col.icon}</div>
                <span className="text-xs font-bold tracking-[2px] uppercase" style={{ color: col.color }}>{col.label}</span>
              </div>
              {col.items.map((item, i) => <div key={i} className="text-sm mb-2" style={{ color: P.textDark }}>{item}</div>)}
              <pre className="mt-3 text-xs p-3 rounded-lg leading-relaxed overflow-x-auto" style={{ background: P.dark, color: P.iceBlue, fontFamily: "monospace" }}>{col.code}</pre>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={4} className="rounded-xl p-4 text-center font-semibold text-sm" style={{ background: P.gold, color: P.dark }}>
        Your monitoring tools are the eyes and ears. AI is the brain.
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 5 — PYRAMID */
const Slide5 = () => {
  const layers = [
    { label: "LAYER 5: AI Strategy & Governance", color: P.gold, w: "40%" },
    { label: "LAYER 4: Customer Intelligence", color: P.iceBlue, w: "55%" },
    { label: "LAYER 3: Operational Intelligence", color: P.blue, w: "70%" },
    { label: "LAYER 2: Infrastructure Intelligence", color: `${P.blue}cc`, w: "85%" },
    { label: "LAYER 1: Data Foundation", color: P.navy, w: "100%" },
  ];
  return (
    <SlideContainer dark>
      <div className="px-6 text-center">
        <Headline light>The Five Layers of AI in Banking</Headline>
        <div className="flex flex-col items-center gap-2 mt-8 mb-6">
          {layers.map((l, i) => (
            <motion.div key={i} variants={fadeIn} custom={layers.length - 1 - i + 2} className="rounded-lg py-3 px-4 text-center text-xs md:text-sm font-bold" style={{ width: l.w, maxWidth: 600, background: l.color, color: l.color === P.gold || l.color === P.iceBlue ? P.dark : P.white }}>
              {l.label}
            </motion.div>
          ))}
        </div>
        <motion.p variants={fadeUp} custom={8} className="text-sm max-w-xl mx-auto" style={{ color: "#8896A7" }}>We'll walk through each layer, base to apex, with a case study from a different market.</motion.p>
      </div>
    </SlideContainer>
  );
};

/* SLIDE 6 — LAYER 1: DATA FOUNDATION */
const Slide6 = () => (
  <SlideContainer>
    <div className="grid md:grid-cols-2 gap-10 px-6 items-center">
      <div>
        <motion.div variants={fadeIn} custom={0} className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3" style={{ background: P.navy, color: P.white }}>LAYER 1</motion.div>
        <Headline>Data Foundation</Headline>
        <Quote>"You can't be intelligent about data you don't have, can't access, or can't trust."</Quote>
        {[
          { icon: <Database className="w-4 h-4" />, text: "Data Quality — clean, consistent, complete, deduplicated" },
          { icon: <Link className="w-4 h-4" />, text: "Data Accessibility — can your systems share data across silos?" },
          { icon: <Lock className="w-4 h-4" />, text: "Data Governance — who owns it, who accesses it, where does it live?" },
          { icon: <Shield className="w-4 h-4" />, text: "Data Security — where does your data go when AI processes it?" },
        ].map((item, i) => (
          <motion.div key={i} variants={slideL} custom={i + 3} className="flex gap-3 items-center mb-3">
            <div style={{ color: P.blue }}>{item.icon}</div>
            <span className="text-sm" style={{ color: P.textDark }}>{item.text}</span>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeIn} custom={7} className="flex items-center justify-center">
        <div className="relative w-60 h-60">
          {[0, 1].map(g => (
            <motion.div key={g} className="absolute rounded-xl flex items-center justify-center" style={{ width: 80, height: 80, background: g === 0 ? P.red + "22" : P.blue + "22", border: `2px solid ${g === 0 ? P.red : P.blue}44`, left: g === 0 ? 20 : 160, top: g === 0 ? 40 : 40 }} animate={{ left: 90, top: 90 }} transition={{ duration: 2, delay: 1 + g * 0.3, repeat: Infinity, repeatType: "reverse", repeatDelay: 2 }}>
              <Database className="w-6 h-6" style={{ color: g === 0 ? P.red : P.blue }} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
    <motion.div variants={fadeUp} custom={8} className="mx-6 mt-6 rounded-xl p-4 text-sm text-center" style={{ background: P.amber + "18", border: `1px solid ${P.amber}44`, color: P.textDark }}>
      Two banks merging = two data ecosystems colliding. AI built on messy data produces confident-sounding wrong answers.
    </motion.div>
  </SlideContainer>
);

/* SLIDE 7 — CASE STUDY: CANADA (DATA) */
const Slide7 = () => (
  <SlideContainer>
    <CaseStudySlide
      icon="🍁" region="CASE STUDY — Multi-Market Banking Group — Canada"
      challenge={["Banking group with separate legacy systems per market", "Same customer appearing as different entities across markets", "Wanted predictive analytics but data wasn't ready"]}
      solution={["AI-powered entity resolution — fuzzy matching across names, addresses, IDs", "Automated data quality scoring — every record gets a confidence score", "Data lineage mapping — tracking origin of every data point", "Unified data layer built as foundation for all AI services"]}
      results={["Consolidation completed in weeks, not months", "Clean foundation enabled every AI use case that followed"]}
      stat={{ value: "33", suffix: "%+", label: "of records had duplicates or inconsistencies" }}
    />
  </SlideContainer>
);

/* SLIDE 8 — DATA SECURITY */
const Slide8 = () => (
  <SlideContainer dark>
    <div className="px-6">
      <div className="text-center mb-6">
        <SectionLabel>CRITICAL DECISION</SectionLabel>
        <Headline light>Where Does Your Data Go When AI Processes It?</Headline>
      </div>
      <motion.div variants={fadeUp} custom={2} className="rounded-xl p-4 flex items-start gap-3 mb-6" style={{ background: P.red + "1a", border: `1px solid ${P.red}44` }}>
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: P.red }} />
        <span className="text-sm" style={{ color: P.iceBlue }}>The risk is uncontrolled data disclosure when staff use consumer-grade AI tools or unapproved configurations.</span>
      </motion.div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Private Cloud Instance", color: P.green, rec: true, items: ["Azure / AWS — data stays in your tenant", "Contractually bound enterprise agreements", "Fastest to deploy, governed, auditable", "Note: M365 Copilot tenant data not used for training — but governance still needed"] },
          { label: "On-Premise", color: P.blue, rec: false, items: ["Full control — your servers, your models", "Higher cost, requires maintenance team", "Open-source models (Llama, Mistral)"] },
          { label: "Hybrid", color: P.amber, rec: false, items: ["Sensitive data on-prem", "Less sensitive in governed cloud", "Balance of control and efficiency"] },
        ].map((c, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 3} className="rounded-xl overflow-hidden" style={{ background: P.navy + "88", border: `1px solid ${P.navy}` }}>
            <div className="h-1" style={{ background: c.color }} />
            <div className="p-4">
              {c.rec && <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2" style={{ background: P.green, color: P.white }}>RECOMMENDED</motion.span>}
              <div className="text-sm font-bold mb-2" style={{ color: P.white }}>{c.label}</div>
              {c.items.map((it, j) => <div key={j} className="text-xs mb-1.5" style={{ color: "#8896A7" }}>{it}</div>)}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={fadeUp} custom={7} className="text-xs text-center" style={{ color: "#8896A7" }}>Cost depends on concurrency, model choice, security controls, and integration depth. We scope based on expected usage — not guesswork.</motion.p>
    </div>
  </SlideContainer>
);

/* SLIDE 9 — LAYER 2: INFRASTRUCTURE INTELLIGENCE */
const Slide9 = () => {
  const [showAfter, setShowAfter] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => { if (inView) { const t = setTimeout(() => setShowAfter(true), 2000); return () => clearTimeout(t); } }, [inView]);
  return (
    <SlideContainer>
      <div ref={ref} className="grid md:grid-cols-2 gap-10 px-6 items-center">
        <div>
          <motion.div variants={fadeIn} custom={0} className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3" style={{ background: P.navy, color: P.white }}>LAYER 2</motion.div>
          <Headline>Infrastructure Intelligence</Headline>
          <Quote>"Stop telling me what failed. Tell me what's about to fail — and what to do about it."</Quote>
          <motion.p variants={fadeUp} custom={4} className="text-sm mt-4" style={{ color: P.textDark }}>The tools you already have are the eyes and ears. AI is the brain.</motion.p>
        </div>
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {!showAfter ? (
              <motion.div key="before" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="rounded-xl p-5" style={{ background: P.red + "12", border: `1px solid ${P.red}33` }}>
                <div className="text-xs font-bold mb-3" style={{ color: P.red }}>BEFORE — REACTIVE</div>
                <div className="flex gap-3 items-center justify-center">
                  {[<AlertTriangle />, <ArrowRight />, <Activity />, <ArrowRight />, <Users />, <ArrowRight />, <Settings />].map((ic, i) => <div key={i} style={{ color: i % 2 === 1 ? "#666" : P.red }} className="w-6 h-6">{ic}</div>)}
                </div>
                <p className="text-xs text-center mt-3" style={{ color: P.red }}>Reactive. Slow. Customer already affected.</p>
              </motion.div>
            ) : (
              <motion.div key="after" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-5" style={{ background: P.green + "12", border: `1px solid ${P.green}33` }}>
                <div className="text-xs font-bold mb-3" style={{ color: P.green }}>AFTER — PREDICTIVE</div>
                <div className="flex gap-3 items-center justify-center">
                  {[<TrendingUp />, <ArrowRight />, <Brain />, <ArrowRight />, <CheckCircle />, <ArrowRight />, <Shield />].map((ic, i) => <div key={i} style={{ color: i % 2 === 1 ? "#666" : P.green }} className="w-6 h-6">{ic}</div>)}
                </div>
                <p className="text-xs text-center mt-3" style={{ color: P.green }}>Predictive. Fast. Customer never noticed.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SlideContainer>
  );
};

/* SLIDE 10 — TRANSACTION PROBLEM */
const Slide10 = () => (
  <SlideContainer dark>
    <div className="px-6 text-center">
      <Headline light>The Transaction Failure Problem</Headline>
      <motion.p variants={fadeUp} custom={2} className="text-sm mb-8" style={{ color: "#8896A7" }}>A challenge every Nigerian bank faces</motion.p>
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-6">
        {[
          { label: "Customer Initiates", color: P.green },
          { label: "Core Banking", color: P.blue },
          { label: "Switch / ISO 8583", color: P.blue },
          { label: "NIBSS Settlement", color: P.blue },
          { label: "Destination Bank", color: P.blue },
        ].map((step, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 2} className="flex items-center gap-2">
            <div className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: step.color + "33", color: step.color, border: `1px solid ${step.color}55` }}>{step.label}</div>
            {i < 4 && <ChevronRight className="w-4 h-4" style={{ color: "#555" }} />}
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeIn} custom={7} className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-4" style={{ background: P.red + "22", border: `1px solid ${P.red}55` }}>
        <Zap className="w-4 h-4" style={{ color: P.red }} />
        <span className="text-xs font-bold" style={{ color: P.red }}>TIMEOUT — AUTO-REVERSAL TRIGGERED</span>
      </motion.div>
      <motion.div variants={fadeUp} custom={8} className="max-w-2xl mx-auto rounded-xl p-4 text-sm mb-4" style={{ background: P.navy + "88", color: P.iceBlue }}>
        But the transaction <strong>DID succeed</strong> at the destination. The response was just slow. Money reversed = financial loss.
      </motion.div>
      <motion.div variants={fadeUp} custom={9} className="max-w-2xl mx-auto rounded-xl p-4 text-sm font-semibold" style={{ background: P.gold + "22", border: `1px solid ${P.gold}44`, color: P.gold }}>
        "The identification is not the problem. It's intelligent execution — making the right decision with the right evidence in real-time."
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 11 — AGENTIC AI ARCHITECTURE */
const Slide11 = () => {
  const agents = [
    { label: "PREDICTIVE AGENT", desc: "Ingests observability + switch logs. Learns patterns → flags degradation. Output: Early warning + probability.", pos: "top" },
    { label: "ROOT CAUSE AGENT", desc: "Correlates CBS, switch codes, NIBSS. Output: Probable cause + supporting evidence.", pos: "right" },
    { label: "RECOMMENDATION AGENT", desc: "Maps diagnosis to runbooks + incident history. Output: Ranked options + confidence scores.", pos: "bottom" },
    { label: "EXECUTION AGENT", desc: "Auto-execute (low risk) OR escalate to human. Output: Action taken OR full context package.", pos: "left" },
  ];
  return (
    <SlideContainer dark>
      <div className="px-6 text-center">
        <Headline light>The Solution: Agentic AI Architecture</Headline>
        <div className="relative max-w-3xl mx-auto mt-8 mb-8">
          {/* Center KB */}
          <motion.div variants={fadeIn} custom={0} className="mx-auto w-44 h-44 rounded-full flex flex-col items-center justify-center text-center" style={{ background: P.dark, border: `2px solid ${P.gold}`, boxShadow: `0 0 30px ${P.gold}33` }}>
            <Brain className="w-8 h-8 mb-1" style={{ color: P.gold }} />
            <div className="text-xs font-bold" style={{ color: P.gold }}>KNOWLEDGE BASE</div>
            <div className="text-[9px] mt-1 leading-tight px-3" style={{ color: "#8896A7" }}>Bank data • Incident history • Runbooks • Policies</div>
          </motion.div>
          {/* Agent cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {agents.map((a, i) => (
              <motion.div key={i} variants={fadeIn} custom={i + 2} className="rounded-xl p-3 text-left" style={{ background: P.navy, border: `1px solid ${P.blue}44` }}>
                <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: P.blue }}>{a.label}</div>
                <div className="text-[11px] leading-relaxed" style={{ color: "#8896A7" }}>{a.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {["Evidence-first: Every output links to logs, metrics, or runbook entries", "Change-controlled: System-modifying actions route through ITSM approvals"].map((t, i) => (
            <motion.div key={i} variants={fadeUp} custom={i + 7} className="rounded-lg p-3 text-xs" style={{ background: P.gold + "18", color: P.gold, border: `1px solid ${P.gold}33` }}>{t}</motion.div>
          ))}
        </div>
      </div>
    </SlideContainer>
  );
};

/* SLIDE 12 — CASE STUDY: US (INFRASTRUCTURE) */
const Slide12 = () => (
  <SlideContainer>
    <CaseStudySlide
      icon="🇺🇸" region="CASE STUDY — Large Mobility Platform — United States"
      challenge={["Millions of events per day. Service degradations impacting revenue.", "Monitoring showed WHAT, not WHY or WHEN."]}
      solution={["ML models on 18 months of telemetry", "Predictive alerting. Root cause correlation across microservices.", "Automated evidence packaging."]}
      results={["Root cause identification: hours → seconds", "Incident recurrence reduced — systemic patterns identified"]}
      stat={{ value: "15", suffix: "-25 min", label: "predictive alert lead time before customer impact" }}
      callout="Same architecture principles. Banking adds switch/settlement complexity, but the intelligence layer is portable."
    />
  </SlideContainer>
);

/* SLIDE 13 — SUCCESS METRICS */
const Slide13 = () => (
  <SlideContainer>
    <div className="px-6">
      <div className="text-center mb-8">
        <Headline>How You Measure This</Headline>
        <motion.p variants={fadeUp} custom={2} className="text-sm" style={{ color: P.textDark }}>If we can't measure it, we don't build it.</motion.p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { icon: <Clock className="w-5 h-5" />, name: "MTTR", desc: "Mean Time to Resolution", target: "Target: 60%+ reduction" },
          { icon: <Ban className="w-5 h-5" />, name: "False Reversal Rate", desc: "Wrongful reversals per 1,000 txns", target: "Target: significant reduction" },
          { icon: <Bell className="w-5 h-5" />, name: "Predictive Lead Time", desc: "Warning before customer impact", target: "Target: 15-30 minutes" },
          { icon: <MessageSquare className="w-5 h-5" />, name: "Dispute Resolution", desc: "Complaint to resolution time", target: "Target: days → hours" },
          { icon: <Repeat className="w-5 h-5" />, name: "Incident Recurrence", desc: "Same root cause repeating", target: "Target: near elimination" },
          { icon: <PhoneOff className="w-5 h-5" />, name: "Call Centre Deflection", desc: "Incidents resolved before customer calls", target: "Target: measurable reduction" },
        ].map((m, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 1} className="rounded-xl p-4" style={{ background: P.white, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div className="mb-2" style={{ color: P.blue }}>{m.icon}</div>
            <div className="text-sm font-bold mb-0.5" style={{ color: P.textDark }}>{m.name}</div>
            <div className="text-xs mb-2" style={{ color: "#8896A7" }}>{m.desc}</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: P.green + "22", color: P.green }}>{m.target}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 14 — RISK & CONTROL MATRIX */
const Slide14 = () => (
  <SlideContainer dark>
    <div className="px-6">
      <div className="text-center mb-6">
        <Headline light>Risk & Control Matrix</Headline>
        <motion.p variants={fadeUp} custom={2} className="text-sm" style={{ color: "#8896A7" }}>Every AI system includes these controls by design.</motion.p>
      </div>
      <div className="max-w-3xl mx-auto rounded-xl overflow-hidden" style={{ border: `1px solid ${P.navy}` }}>
        {[
          { risk: "AI hallucination", control: "Evidence-first — outputs must link to logs/metrics/runbooks" },
          { risk: "Unauthorised action", control: "Approval gates — execution routes through ITSM" },
          { risk: "Data leakage", control: "Tenant isolation + DLP + sensitivity labels + audit logs" },
          { risk: "Model drift", control: "Periodic re-validation + drift monitoring + performance dashboards" },
          { risk: "Audit gap", control: "Immutable logs of prompts, evidence, outputs, actions" },
          { risk: "Access control", control: "RBAC — role-based access by team and capability" },
        ].map((row, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="flex items-center gap-4 px-5 py-3" style={{ background: i % 2 === 0 ? P.navy + "44" : "transparent", borderBottom: `1px solid ${P.navy}66` }}>
            <div className="w-40 shrink-0 text-xs font-semibold" style={{ color: P.iceBlue }}>{row.risk}</div>
            <div className="flex-1 text-xs" style={{ color: "#8896A7" }}>{row.control}</div>
            <CheckCircle className="w-4 h-4 shrink-0" style={{ color: P.green }} />
          </motion.div>
        ))}
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 15 — INTERACTIVE: BOTTLENECKS */
const Slide15 = () => (
  <SlideContainer gradient>
    <InteractiveSlide
      headline="Over to You"
      subhead="Where Does It Hurt?"
      prompts={[
        "What are your biggest infrastructure bottlenecks TODAY?",
        "Where do you spend the most time on manual investigation?",
        "What failures happen repeatedly — the 'usual suspects'?",
        "Where do monitoring tools tell you WHAT but not WHY?",
        "What keeps you up at night about the integration?",
      ]}
    />
  </SlideContainer>
);

/* SLIDE 16 — LAYER 3: OPERATIONAL INTELLIGENCE */
const Slide16 = () => (
  <SlideContainer>
    <div className="grid md:grid-cols-2 gap-10 px-6 items-center">
      <div>
        <motion.div variants={fadeIn} custom={0} className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3" style={{ background: P.navy, color: P.white }}>LAYER 3</motion.div>
        <Headline>Operational Intelligence</Headline>
        <Quote>"Making your back office as smart as your best employee — at scale."</Quote>
        {["Transaction reconciliation", "Compliance reporting", "Document processing", "Fraud / AML detection", "Intelligent workflow routing"].map((t, i) => (
          <motion.div key={i} variants={slideL} custom={i + 3} className="flex gap-2 items-center text-sm mb-2" style={{ color: P.textDark }}>
            <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: P.blue }} /> {t}
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeIn} custom={8} className="flex flex-col items-center">
        {/* Donut chart */}
        <svg viewBox="0 0 200 200" className="w-52 h-52">
          <motion.circle cx="100" cy="100" r="70" fill="none" stroke={P.blue} strokeWidth="24" strokeDasharray="439.82" strokeDashoffset="87.96" strokeLinecap="round" transform="rotate(-90 100 100)" initial={{ strokeDashoffset: 439.82 }} whileInView={{ strokeDashoffset: 87.96 }} viewport={{ once: true }} transition={{ duration: 1.5, ease }} />
          <motion.circle cx="100" cy="100" r="70" fill="none" stroke={P.gold} strokeWidth="24" strokeDasharray="439.82" strokeDashoffset="351.86" strokeLinecap="round" transform="rotate(198 100 100)" initial={{ strokeDashoffset: 439.82 }} whileInView={{ strokeDashoffset: 351.86 }} viewport={{ once: true }} transition={{ duration: 1.5, delay: 0.5, ease }} />
          <text x="100" y="95" textAnchor="middle" fill={P.textDark} fontSize="14" fontWeight="bold">80 / 20</text>
          <text x="100" y="115" textAnchor="middle" fill="#8896A7" fontSize="10">Split</text>
        </svg>
        <div className="flex gap-4 mt-3 text-xs">
          <span style={{ color: P.blue }}><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: P.blue }} /> 80% Automation handles</span>
          <span style={{ color: P.gold }}><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: P.gold }} /> 20% AI handles exceptions</span>
        </div>
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 17 — CASE STUDY: US PHARMA */
const Slide17 = () => (
  <SlideContainer>
    <CaseStudySlide
      icon="🇺🇸" region="CASE STUDY — Pharmaceutical Company — United States"
      challenge={["Highly regulated. Staff using consumer AI with sensitive data.", "Massive compliance risk."]}
      solution={["Private LLM instance. Role-based access.", "Full audit trail. DLP + sensitivity labels."]}
      results={["Zero uncontrolled data exposure", "Shadow AI usage effectively eliminated", "Became internal standard for AI across organisation"]}
      callout="The goal isn't to block AI. It's to provide a governed internal alternative that's better than the consumer options."
    />
  </SlideContainer>
);

/* SLIDE 18 — LAYER 4: CUSTOMER INTELLIGENCE */
const Slide18 = () => (
  <SlideContainer dark>
    <div className="px-6">
      <div className="text-center mb-6">
        <motion.div variants={fadeIn} custom={0} className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3" style={{ background: P.gold, color: P.dark }}>LAYER 4</motion.div>
        <Headline light>Customer Intelligence</Headline>
        <Quote>"Don't wait for the customer to complain. Know before they do."</Quote>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: <Bell className="w-6 h-6" />, label: "PROACTIVE ENGAGEMENT", desc: "Detect issues → notify customer before they notice" },
          { icon: <Users className="w-6 h-6" />, label: "PERSONALISED EXPERIENCE", desc: "Use data to treat each customer as an individual" },
          { icon: <Headphones className="w-6 h-6" />, label: "INTELLIGENT SERVICE", desc: "AI-powered support that resolves, not just responds" },
        ].map((c, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 3} className="rounded-xl p-5 text-center" style={{ background: P.navy + "88", border: `1px solid ${P.blue}33` }}>
            <div className="mb-3 flex justify-center" style={{ color: P.blue }}>{c.icon}</div>
            <div className="text-xs font-bold tracking-wider mb-2" style={{ color: P.white }}>{c.label}</div>
            <div className="text-xs" style={{ color: "#8896A7" }}>{c.desc}</div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={7} className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: P.red + "18", border: `1px solid ${P.red}44`, color: P.iceBlue }}>
        If an HNI customer experiences three failed transfers in a week, they don't call to complain. They move their billions to a competitor. <strong>You're not fixing a tech glitch. You're protecting the deposit base.</strong>
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 19 — PROACTIVE ENGAGEMENT FLOW */
const Slide19 = () => (
  <SlideContainer>
    <div className="px-6 max-w-3xl mx-auto">
      <div className="text-center mb-8"><Headline>Proactive Customer Engagement — How It Works</Headline></div>
      <div className="space-y-3">
        {[
          { icon: <AlertTriangle className="w-4 h-4" />, text: "AI detects customer-impacting event", color: P.blue },
          { icon: <Users className="w-4 h-4" />, text: "Identifies affected customers → segments by tier", color: P.blue },
          { icon: <FileText className="w-4 h-4" />, text: "Generates contextual brief — what happened, status, talking points", color: P.blue },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp} custom={i}>
            <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: s.color + "12", border: `1px solid ${s.color}33` }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <span className="text-sm" style={{ color: P.textDark }}>{s.text}</span>
            </div>
            {i < 2 && <div className="flex justify-center py-1"><ChevronUp className="w-4 h-4 rotate-180" style={{ color: "#ccc" }} /></div>}
          </motion.div>
        ))}
        {/* Split */}
        <div className="flex justify-center py-1"><ChevronUp className="w-4 h-4 rotate-180" style={{ color: "#ccc" }} /></div>
        <div className="grid grid-cols-2 gap-3">
          <motion.div variants={slideL} custom={4} className="rounded-lg p-3 text-center" style={{ background: P.gold + "18", border: `1px solid ${P.gold}44` }}>
            <Phone className="w-4 h-4 mx-auto mb-1" style={{ color: P.gold }} />
            <div className="text-xs font-bold" style={{ color: P.gold }}>HNI → RM calls within minutes</div>
          </motion.div>
          <motion.div variants={slideR} custom={4} className="rounded-lg p-3 text-center" style={{ background: P.blue + "12", border: `1px solid ${P.blue}33` }}>
            <MessageSquare className="w-4 h-4 mx-auto mb-1" style={{ color: P.blue }} />
            <div className="text-xs font-bold" style={{ color: P.blue }}>Standard → SMS / WhatsApp / Push</div>
          </motion.div>
        </div>
        <div className="flex justify-center py-1"><ChevronUp className="w-4 h-4 rotate-180" style={{ color: "#ccc" }} /></div>
        <motion.div variants={fadeUp} custom={5} className="rounded-lg p-3 flex items-center gap-3 text-center justify-center" style={{ background: P.green + "12", border: `1px solid ${P.green}33` }}>
          <Database className="w-4 h-4" style={{ color: P.green }} />
          <span className="text-xs font-bold" style={{ color: P.green }}>All interactions logged → feeds back into knowledge base</span>
        </motion.div>
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 20 — CASE STUDY: CARIBBEAN */
const Slide20 = () => (
  <SlideContainer>
    <CaseStudySlide
      icon="🌴" region="CASE STUDY — Banking Group — Caribbean Market"
      challenge={["HNI clients treated same as mass market", "No real-time context for relationship managers. Attrition risk."]}
      solution={["AI-powered event detection for HNIs", "Contextual briefing to RM mobile devices", "Tiered engagement automation. Sentiment tracking."]}
      results={["Significantly higher quality RM conversations — full context", "Measurable improvement in HNI retention", "Model extending to corporate clients"]}
      stat={{ value: "15", prefix: "< ", suffix: " min", label: "from incident to HNI engagement" }}
    />
  </SlideContainer>
);

/* SLIDE 21 — INTELLIGENT CUSTOMER SERVICE */
const Slide21 = () => (
  <SlideContainer>
    <div className="px-6">
      <div className="text-center mb-8"><Headline>Intelligent Customer Service</Headline></div>
      <div className="grid md:grid-cols-2 gap-6">
        {[
          { title: "TODAY", color: P.red, items: ["Customer: 'My transfer hasn't arrived'", "→ Call centre queue → Wait → Explain issue", "→ Agent investigates manually", "Resolution: Minutes to hours"] },
          { title: "WITH AI", color: P.green, items: ["Customer types in mobile app", "AI orchestrates checks across all systems", "Confirmed: 'Your ₦250,000 transfer debited at 11:32am. Pending at destination. ETA: 15 minutes.'", "Complex cases: Full context package to human agent → resolves in 2 minutes"] },
        ].map((panel, pi) => (
          <motion.div key={pi} variants={pi === 0 ? slideL : slideR} custom={pi} className="rounded-xl overflow-hidden" style={{ background: P.white, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div className="h-1.5" style={{ background: panel.color }} />
            <div className="p-5">
              <div className="text-xs font-bold tracking-wider mb-4" style={{ color: panel.color }}>{panel.title}</div>
              {panel.items.map((item, i) => <div key={i} className="text-sm mb-2 leading-relaxed" style={{ color: P.textDark }}>{item}</div>)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 22 — INTERACTIVE: CUSTOMER PAIN POINTS */
const Slide22 = () => (
  <SlideContainer gradient>
    <InteractiveSlide
      headline="Over to You"
      subhead="Customer Experience Bottlenecks"
      prompts={[
        "What are the top 3 customer complaints or contact centre drivers?",
        "Where do customers experience the most friction in digital channels?",
        "How do you handle HNI issues differently from mass market today?",
        "What proactive communication exists — and where are the gaps?",
        "With the Unity customer base incoming, what worries you about scale?",
      ]}
    />
  </SlideContainer>
);

/* SLIDE 23 — LAYER 5: GOVERNANCE */
const Slide23 = () => (
  <SlideContainer dark>
    <div className="px-6">
      <div className="text-center mb-6">
        <motion.div variants={fadeIn} custom={0} className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3" style={{ background: P.gold, color: P.dark }}>LAYER 5 — THE CAPSTONE</motion.div>
        <Headline light>AI Strategy & Governance</Headline>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { icon: <Eye className="w-5 h-5" />, label: "AI Inventory", desc: "Know every tool, model, and algorithm — including shadow AI" },
          { icon: <Layers className="w-5 h-5" />, label: "Risk Classification", desc: "Tier by impact — email helper ≠ credit decisioning" },
          { icon: <FileText className="w-5 h-5" />, label: "Policy Framework", desc: "Acceptable use, ethics, data handling, model risk" },
          { icon: <Scale className="w-5 h-5" />, label: "Regulatory Alignment", desc: "CBN, NDPA/NDPR, ISO/IEC 42001:2023" },
          { icon: <RefreshCw className="w-5 h-5" />, label: "Continuous Monitoring", desc: "Audit, measure, improve, repeat" },
        ].map((p, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 2} className="rounded-xl p-4 text-center" style={{ background: P.navy + "88", border: `1px solid ${P.blue}33` }}>
            <div className="mb-2 flex justify-center" style={{ color: P.blue }}>{p.icon}</div>
            <div className="text-xs font-bold mb-1" style={{ color: P.white }}>{p.label}</div>
            <div className="text-[10px]" style={{ color: "#8896A7" }}>{p.desc}</div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={8} className="rounded-xl p-4 text-sm text-center leading-relaxed" style={{ background: P.gold + "18", border: `1px solid ${P.gold}44`, color: P.gold }}>
        <strong>NDPA/NDPR:</strong> Automated decision-making gives customers the right to an explanation. Human-in-the-loop isn't philosophy — it's a legal requirement.
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 24 — CASE STUDY: CANADA (GOVERNANCE) */
const Slide24 = () => (
  <SlideContainer>
    <CaseStudySlide
      icon="🍁" region="CASE STUDY — Insurance Company — Canada"
      challenge={["Deploying AI for claims and underwriting", "Board demanded governance before production. No AI-specific policies existed."]}
      solution={["AI inventory (found 23 tools, 11 unapproved)", "Risk classification. Policy framework mapped to regulators + ISO 42001.", "Human-in-the-loop mandated. Quarterly reviews."]}
      results={["Board approved AI deployment — governance demonstrably in place", "Unapproved tools replaced or governed", "Time-to-production for new AI use cases reduced"]}
      callout="The counterintuitive finding: governance didn't slow them down. It sped them up. Governance isn't the brakes — it's the road."
    />
  </SlideContainer>
);

/* SLIDE 25 — GOVERNANCE DELIVERABLES */
const Slide25 = () => (
  <SlideContainer>
    <div className="px-6">
      <div className="text-center mb-8"><Headline>What We're Sharing With You</Headline></div>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {[
          { color: P.blue, title: "AI Governance Readiness Checklist", items: ["59 items across 9 domains", "Self-assessment tool", "Aligned: CBN, NDPA, ISO 42001"] },
          { color: P.navy, title: "AI Gap Analysis Framework", items: ["10 domains, maturity scoring 1-5", "Three-tier benchmarking", "Remediation roadmap template"] },
          { color: P.gold, title: "AI Readiness Assessment", items: ["48 scored questions, 6 dimensions", "25 pre-built banking use cases", "2×2 Readiness Matrix"] },
        ].map((c, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 1} className="rounded-xl overflow-hidden" style={{ background: P.white, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div className="h-1.5" style={{ background: c.color }} />
            <div className="p-5">
              <FileText className="w-5 h-5 mb-2" style={{ color: c.color }} />
              <div className="text-sm font-bold mb-3" style={{ color: P.textDark }}>{c.title}</div>
              {c.items.map((it, j) => <div key={j} className="text-xs mb-1.5" style={{ color: "#8896A7" }}>{it}</div>)}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={fadeUp} custom={5} className="text-xs text-center" style={{ color: "#8896A7" }}>Shared as a starting point for your governance journey.</motion.p>
    </div>
  </SlideContainer>
);

/* SLIDE 26 — MERGER INTEGRATION */
const Slide26 = () => (
  <SlideContainer dark>
    <div className="px-6">
      <div className="text-center mb-8"><Headline light>AI for the Providus-Unity Integration</Headline></div>
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div variants={slideL} custom={1} className="rounded-xl p-5" style={{ background: P.red + "0d", border: `1px solid ${P.red}33` }}>
          <div className="text-xs font-bold tracking-wider mb-4" style={{ color: P.red }}>THE CHALLENGE</div>
          {["Two core banking systems", "Two customer databases", "~229 branches combined", "Two operational cultures", "Heightened regulatory scrutiny"].map((t, i) => (
            <motion.div key={i} variants={slideL} custom={i + 2} className="flex gap-2 items-center text-sm mb-2" style={{ color: P.iceBlue }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: P.red }} /> {t}
            </motion.div>
          ))}
        </motion.div>
        <motion.div variants={slideR} custom={1} className="rounded-xl p-5" style={{ background: P.green + "0d", border: `1px solid ${P.green}33` }}>
          <div className="text-xs font-bold tracking-wider mb-4" style={{ color: P.green }}>WHERE AI ACCELERATES</div>
          {["Customer data deduplication (weeks vs months)", "System integration risk monitoring (predictive)", "Staff capability assessment (unified baseline)", "Product rationalisation (keep, merge, cross-sell)", "Day-one intelligent customer experience", "Internal knowledge bot for staff onboarding"].map((t, i) => (
            <motion.div key={i} variants={slideR} custom={i + 2} className="flex gap-2 items-center text-sm mb-2" style={{ color: P.iceBlue }}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: P.green }} /> {t}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 27 — TEAM READINESS */
const Slide27 = () => (
  <SlideContainer>
    <div className="px-6">
      <div className="text-center mb-8">
        <Headline>Building Internal AI Capability</Headline>
        <motion.p variants={fadeUp} custom={2} className="text-sm" style={{ color: "#8896A7" }}>5-Step Team Assessment Methodology</motion.p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {[
          { num: "1", label: "Self-Assessment", desc: "Knowledge + confidence evaluation" },
          { num: "2", label: "Technical Evaluation", desc: "Calibrated testing by role level" },
          { num: "3", label: "Hands-On Simulation", desc: "Real scenarios, real data" },
          { num: "4", label: "Manager Annotation", desc: "Context only humans provide" },
          { num: "5", label: "Development Roadmap", desc: "Personalised path per individual" },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 1} className="flex items-center gap-2">
            <div className="rounded-xl p-3 text-center w-36" style={{ background: P.white, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div className="w-7 h-7 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold text-white" style={{ background: P.blue }}>{s.num}</div>
              <div className="text-xs font-bold mb-0.5" style={{ color: P.textDark }}>{s.label}</div>
              <div className="text-[10px]" style={{ color: "#8896A7" }}>{s.desc}</div>
            </div>
            {i < 4 && <ChevronRight className="w-4 h-4 hidden md:block" style={{ color: "#ccc" }} />}
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={7} className="rounded-xl p-4 text-center text-sm" style={{ background: P.blue + "12", border: `1px solid ${P.blue}33`, color: P.textDark }}>
        <strong>Output:</strong> Dashboard showing capability distribution • Gaps by role/department • Prioritised training recommendations • Works for both Providus and Unity teams on one framework
      </motion.div>
    </div>
  </SlideContainer>
);

/* SLIDE 28 — WHY BUILD WITH US */
const Slide28 = () => (
  <SlideContainer dark>
    <div className="px-6">
      <div className="text-center mb-8"><Headline light>Why Build This With Us</Headline></div>
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div variants={slideL} custom={1} className="rounded-xl p-5" style={{ background: P.navy + "88", border: `1px solid ${P.blue}33` }}>
          <div className="text-xs font-bold tracking-wider mb-3" style={{ color: P.blue }}>WHAT WE BRING</div>
          {["Cross-industry pattern recognition — banking, insurance, pharma, tech", "Regulatory navigation — CBN, NDPA + ISO 42001", "Proven architecture templates", "Structured training IP", "Network of US/Canada practitioners"].map((t, i) => (
            <div key={i} className="flex gap-2 items-start text-xs mb-2" style={{ color: "#8896A7" }}>
              <CheckCircle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: P.blue }} /> {t}
            </div>
          ))}
        </motion.div>
        <motion.div variants={fadeUp} custom={2} className="rounded-xl p-5" style={{ background: P.navy + "88", border: `1px solid ${P.green}33` }}>
          <div className="text-xs font-bold tracking-wider mb-3" style={{ color: P.green }}>WHAT WE DON'T DO</div>
          {["Take the steering wheel — your team builds, we guide", "Create dependency — goal is your independence", "Sell black boxes — everything transparent, documented, transferable"].map((t, i) => (
            <div key={i} className="flex gap-2 items-start text-xs mb-2" style={{ color: "#8896A7" }}>
              <X className="w-3 h-3 shrink-0 mt-0.5" style={{ color: P.green }} /> {t}
            </div>
          ))}
        </motion.div>
        <motion.div variants={slideR} custom={3} className="rounded-xl p-5 flex items-center justify-center" style={{ background: P.gold + "22", border: `1px solid ${P.gold}44` }}>
          <p className="text-sm font-semibold text-center leading-relaxed italic" style={{ color: P.gold }}>
            "The fastest way to build internal capability is to build alongside people who've already done it."
          </p>
        </motion.div>
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 29 — PILOT PROPOSAL */
const Slide29 = () => (
  <SlideContainer>
    <div className="px-6 max-w-4xl mx-auto">
      <div className="text-center mb-6"><Headline>Proposed Pilot: Transaction Intelligence</Headline></div>
      <motion.div variants={fadeIn} custom={0} className="rounded-2xl overflow-hidden" style={{ background: P.white, boxShadow: "0 8px 40px rgba(0,0,0,0.1)" }}>
        {[
          { label: "SCOPE", color: P.blue, content: "False reversal reduction on specific channel/rail — defined together. 8 weeks. Measurable outcomes." },
          { label: "YOU PROVIDE", color: P.textDark, content: "Anonymised transaction logs + switch data • 2-3 designated engineers • Access to monitoring tools + runbooks • Weekly stakeholder reviews" },
          { label: "WE PROVIDE", color: P.textDark, content: "Architecture design + implementation guidance • Predictive model development • Root cause analysis engine • Evidence-based recommendation system • Guardrail design + human-in-the-loop config • Full knowledge transfer" },
          { label: "SUCCESS CRITERIA", color: P.green, content: "X% reduction in false reversals • Y% MTTR improvement • Z minutes average prediction lead time • Zero uncontrolled autonomous actions" },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 1} className="p-5" style={{ borderBottom: i < 3 ? `1px solid ${P.lightGrey}` : "none" }}>
            <div className="text-xs font-bold tracking-wider mb-2" style={{ color: s.color }}>{s.label}</div>
            <div className="text-sm leading-relaxed" style={{ color: P.textDark }}>{s.content}</div>
          </motion.div>
        ))}
      </motion.div>
      <motion.p variants={fadeUp} custom={6} className="text-xs text-center mt-4" style={{ color: "#8896A7" }}>Entry/exit criteria defined before pilot begins. Go/no-go for scale based on data.</motion.p>
    </div>
  </SlideContainer>
);

/* SLIDE 30 — DATA INTEGRATION MAP */
const Slide30 = () => (
  <SlideContainer dark>
    <div className="px-6">
      <div className="text-center mb-8"><Headline light>Data Sources & Integration Architecture</Headline></div>
      <div className="grid grid-cols-3 gap-3 items-start">
        <div className="space-y-2">
          <div className="text-[10px] font-bold tracking-wider text-center mb-2" style={{ color: P.blue }}>DATA INPUTS</div>
          {["Observability tools", "Core banking events", "Switch / ISO 8583", "NIBSS settlement", "CRM / customer data", "Contact centre logs", "Runbooks + incident history", "Policy documents"].map((t, i) => (
            <motion.div key={i} variants={slideL} custom={i * 0.5} className="rounded-lg px-2 py-1.5 text-[10px]" style={{ background: P.blue + "22", color: P.iceBlue, border: `1px solid ${P.blue}33` }}>{t}</motion.div>
          ))}
        </div>
        <motion.div variants={fadeIn} custom={3} className="rounded-xl p-4" style={{ background: P.dark, border: `2px solid ${P.gold}55` }}>
          <div className="text-[10px] font-bold tracking-wider text-center mb-3" style={{ color: P.gold }}>AI PROCESSING LAYER</div>
          {["Predictive Agent", "Root Cause Agent", "Recommendation Agent", "Execution Agent"].map((a, i) => (
            <div key={i} className="rounded-lg px-2 py-1.5 mb-1.5 text-[10px] text-center" style={{ background: P.navy, color: P.iceBlue }}>{a}</div>
          ))}
        </motion.div>
        <div className="space-y-2">
          <div className="text-[10px] font-bold tracking-wider text-center mb-2" style={{ color: P.green }}>OUTPUTS</div>
          {["Predictive alerts → Engineering", "Evidence packages → Operations", "Customer triggers → CRM / Mobile", "Audit logs → Compliance"].map((t, i) => (
            <motion.div key={i} variants={slideR} custom={i * 0.5} className="rounded-lg px-2 py-1.5 text-[10px]" style={{ background: P.green + "22", color: P.iceBlue, border: `1px solid ${P.green}33` }}>{t}</motion.div>
          ))}
        </div>
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 31 — PHASED ROADMAP */
const Slide31 = () => (
  <SlideContainer>
    <div className="px-6">
      <div className="text-center mb-8"><Headline>Your AI Journey — Phased Approach</Headline></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { phase: "PHASE 1: FOUNDATION", dates: "Months 1-3", color: P.blue, items: ["Governance checklist + gap analysis", "Private AI instance", "Team assessment", "Pilot begins"], exit: "AI use policy approved + pilot metrics defined" },
          { phase: "PHASE 2: BUILD & VALIDATE", dates: "Months 3-6", color: P.blue + "cc", items: ["Pilot produces results", "Governance operationalised", "Customer engagement workflows", "Data consolidation begins"], exit: "Target reversal + MTTR metrics achieved" },
          { phase: "PHASE 3: SCALE & EXTEND", dates: "Months 6-12", color: P.navy, items: ["Multi-channel deployment", "Integration infrastructure coverage", "Training programs", "First governance audit"], exit: "Multi-channel live + audit complete" },
          { phase: "PHASE 4: OPTIMISE & LEAD", dates: "Ongoing", color: P.gold, items: ["Continuous improvement", "Advanced use cases", "ISO 42001 pathway", "AI governance leader positioning"], exit: "" },
        ].map((p, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 1} className="rounded-xl overflow-hidden" style={{ background: P.white, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div className="h-1.5" style={{ background: p.color }} />
            <div className="p-4">
              <div className="text-[10px] font-bold tracking-wider mb-0.5" style={{ color: p.color }}>{p.phase}</div>
              <div className="text-[10px] mb-3" style={{ color: "#8896A7" }}>{p.dates}</div>
              {p.items.map((it, j) => <div key={j} className="text-[11px] mb-1" style={{ color: P.textDark }}>• {it}</div>)}
              {p.exit && <div className="text-[10px] mt-3 pt-2 italic" style={{ color: P.green, borderTop: `1px solid ${P.lightGrey}` }}>Exit: {p.exit}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </SlideContainer>
);

/* SLIDE 32 — CLOSING */
const Slide32 = () => (
  <SlideContainer dark>
    <div className="px-6 text-center">
      <Headline light size="text-4xl md:text-5xl">Next Steps</Headline>
      <div className="max-w-2xl mx-auto space-y-4 my-8">
        {[
          { label: "THIS WEEK", color: P.gold, text: "Governance documents shared. Distribute to CSO, Chief Auditor, risk team." },
          { label: "NEXT 2-4 WEEKS", color: P.blue, text: "Follow-up session with expanded team. Scope the pilot. Demo readiness assessment." },
          { label: "STANDING OFFER", color: P.iceBlue, text: "One-on-one deep dives with any team member. Evenings and weekends work." },
        ].map((s, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="flex gap-4 items-start rounded-xl p-4 text-left" style={{ background: P.navy + "88" }}>
            <div className="w-1 rounded-full shrink-0 self-stretch" style={{ background: s.color }} />
            <div>
              <div className="text-xs font-bold tracking-wider mb-1" style={{ color: s.color }}>{s.label}</div>
              <div className="text-sm" style={{ color: P.iceBlue }}>{s.text}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={fadeUp} custom={6} className="text-xl md:text-2xl font-bold mb-8" style={{ color: P.white }}>
        Let's start with governance. Let's scope the pilot. Let's build.
      </motion.p>
      <motion.div variants={fadeIn} custom={7} className="w-20 h-[2px] mx-auto mb-6" style={{ background: P.gold }} />
      <motion.div variants={fadeUp} custom={8} className="flex items-center justify-center gap-6">
        {["THCO", "CoTi"].map((n, i) => <div key={i} className="px-5 py-2 rounded-lg text-xs font-semibold" style={{ background: P.navy, color: P.iceBlue, border: `1px solid ${P.blue}44` }}>{n}</div>)}
      </motion.div>
    </div>
  </SlideContainer>
);

/* ═══════════════════════════════════════════════
   MAIN PRESENTATION COMPONENT
   ═══════════════════════════════════════════════ */
const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10, Slide11, Slide12, Slide13, Slide14, Slide15, Slide16, Slide17, Slide18, Slide19, Slide20, Slide21, Slide22, Slide23, Slide24, Slide25, Slide26, Slide27, Slide28, Slide29, Slide30, Slide31, Slide32];
const TOTAL = SLIDES.length;

export default function AIBankingPresentation() {
  const [current, setCurrent] = useState(0);
  const [isScrollMode, setIsScrollMode] = useState(true);
  const containerRef = useRef(null);

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < TOTAL) {
      setCurrent(idx);
      if (!isScrollMode) return;
      const el = document.getElementById(`slide-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [isScrollMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "f" || e.key === "F") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, goTo]);

  // Track scroll position to update current slide
  useEffect(() => {
    if (!isScrollMode) return;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const idx = Math.round(scrollY / vh);
      if (idx !== current && idx >= 0 && idx < TOTAL) setCurrent(idx);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [current, isScrollMode]);

  return (
    <div ref={containerRef} className="relative" style={{ fontFamily: "Inter, 'DM Sans', sans-serif" }}>
      {/* Global styles */}
      <style>{`
        @keyframes meshShift { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(-20px, 10px) scale(1.05); } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
        @media print { .nav-overlay, .progress-dots { display: none !important; } * { animation: none !important; } }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ─── Top Nav (Frosted Glass) ─── */}
      <div className="nav-overlay fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3" style={{ background: "rgba(10,22,40,0.75)", backdropFilter: "blur(16px)", borderBottom: `1px solid rgba(46,117,182,0.15)` }} data-testid="presentation-nav">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: P.gold }}>
            <span className="text-[10px] font-bold" style={{ color: P.dark }}>TH</span>
          </div>
          <span className="text-xs font-semibold hidden sm:inline" style={{ color: P.iceBlue }}>AI for Banking</span>
        </div>
        <div className="text-sm font-mono font-bold" style={{ color: P.white }} data-testid="slide-counter">
          {String(current + 1).padStart(2, "0")} / {TOTAL}
        </div>
      </div>

      {/* ─── Left Progress Dots ─── */}
      <div className="progress-dots fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5 hidden lg:flex">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: i === current ? P.gold : `${P.white}33`, transform: i === current ? "scale(1.5)" : "scale(1)" }} />
        ))}
      </div>

      {/* ─── Bottom Progress Bar ─── */}
      <div className="nav-overlay fixed bottom-0 left-0 right-0 z-40 h-1" style={{ background: `${P.dark}88` }}>
        <motion.div className="h-full" style={{ background: P.blue }} animate={{ width: `${((current + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.4, ease }} />
      </div>

      {/* ─── Navigation Arrows ─── */}
      <div className="nav-overlay fixed bottom-4 right-4 z-40 flex gap-2">
        <button onClick={() => goTo(current - 1)} disabled={current === 0} className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-20" style={{ background: `${P.white}22`, backdropFilter: "blur(8px)" }} data-testid="prev-slide">
          <ChevronLeft className="w-4 h-4" style={{ color: P.white }} />
        </button>
        <button onClick={() => goTo(current + 1)} disabled={current === TOTAL - 1} className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-20" style={{ background: `${P.white}22`, backdropFilter: "blur(8px)" }} data-testid="next-slide">
          <ChevronRight className="w-4 h-4" style={{ color: P.white }} />
        </button>
      </div>

      {/* ─── All Slides (Scroll Mode) ─── */}
      {SLIDES.map((SlideComp, i) => (
        <div key={i} id={`slide-${i}`} data-testid={`slide-${i + 1}`}>
          <SlideComp />
        </div>
      ))}
    </div>
  );
}
