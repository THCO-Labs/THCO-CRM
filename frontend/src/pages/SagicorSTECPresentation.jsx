import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ═══ PALETTE ═══ */
const C = {
  bg: "#0A1628", bgAlt: "#1A1A2E", blue: "#00D4FF", gold: "#C9A227",
  green: "#00E676", coral: "#FF6B6B", gray: "#8892A0", white: "#FFFFFF",
  light: "#B0B8C4", dark: "#060D18", card: "#111D30",
};

/* ═══ CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
.sg * { box-sizing: border-box; margin: 0; padding: 0; }
.sg { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; overflow: hidden; background: ${C.bg}; color: ${C.white}; }
.sg-h { font-weight: 700; letter-spacing: -0.02em; }

@keyframes sg-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes sg-fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sg-fadeDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sg-fadeLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes sg-fadeRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes sg-slam { 0% { opacity: 0; transform: scale(1.6); } 60% { opacity: 1; transform: scale(0.95); } 100% { transform: scale(1); } }
@keyframes sg-grow { from { width: 0; } to { width: var(--tw); } }
@keyframes sg-pulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes sg-glow { 0%,100% { box-shadow: 0 0 8px var(--gc); } 50% { box-shadow: 0 0 24px var(--gc); } }
@keyframes sg-countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sg-scaleIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
@keyframes sg-drawLine { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
@keyframes sg-fillBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes sg-sweep { from { transform: translateX(-110%); } to { transform: translateX(110%); } }

.sg-pg[data-active="true"] .afu { animation: sg-fadeUp 500ms ease-out both; }
.sg-pg[data-active="true"] .afd { animation: sg-fadeDown 400ms ease-out both; }
.sg-pg[data-active="true"] .afl { animation: sg-fadeLeft 500ms ease-out both; }
.sg-pg[data-active="true"] .afr { animation: sg-fadeRight 500ms ease-out both; }
.sg-pg[data-active="true"] .af { animation: sg-fadeIn 500ms ease-out both; }
.sg-pg[data-active="true"] .asl { animation: sg-slam 400ms ease-out both; }
.sg-pg[data-active="true"] .asi { animation: sg-scaleIn 400ms ease-out both; }
.sg-pg[data-active="false"] .afu,.sg-pg[data-active="false"] .afd,.sg-pg[data-active="false"] .afl,
.sg-pg[data-active="false"] .afr,.sg-pg[data-active="false"] .af,.sg-pg[data-active="false"] .asl,
.sg-pg[data-active="false"] .asi { opacity: 0; }

.sg-sweep { position: fixed; inset: 0; z-index: 100; pointer-events: none; overflow: hidden; }
.sg-sweep .sg-sweep-line { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, ${C.blue}18 40%, ${C.blue}30 50%, ${C.blue}18 60%, transparent 100%); transform: translateX(-110%); }
.sg-sweep.active .sg-sweep-line { animation: sg-sweep 350ms ease-in-out both; }
`;

const d = (ms) => ({ animationDelay: `${ms}ms` });

/* Counter hook */
const useCounter = (target, active, duration = 1200, delay = 0) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const t = setTimeout(() => {
      let start = 0;
      const step = target / (duration / 16);
      const id = setInterval(() => {
        start += step;
        if (start >= target) { setVal(target); clearInterval(id); }
        else setVal(Math.floor(start));
      }, 16);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [active, target, duration, delay]);
  return val;
};

/* Animated bar */
const Bar = ({ pct, color, delay = 0, label, value, active }) => (
  <div className="afl" style={{ ...d(delay), display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
    <span style={{ color: C.light, fontSize: 14, fontWeight: 500, width: 180, flexShrink: 0, textAlign: "right" }}>{label}</span>
    <div style={{ flex: 1, height: 28, background: `${C.white}08`, borderRadius: 3, overflow: "hidden", position: "relative" }}>
      <div style={{ height: "100%", background: color, borderRadius: 3, transformOrigin: "left", transform: active ? `scaleX(1)` : "scaleX(0)", width: `${pct}%`, transition: `transform ${800 + delay * 0.5}ms ease-out ${delay}ms` }} />
    </div>
    <span style={{ color, fontSize: 16, fontWeight: 700, width: 50, textAlign: "right" }}>{value}</span>
  </div>
);

/* Card */
const Card = ({ children, delay = 0, style = {} }) => (
  <div className="afu" style={{ ...d(delay), background: C.card, border: `1px solid ${C.white}10`, borderRadius: 8, padding: "20px 24px", ...style }}>
    {children}
  </div>
);

/* Country dot for map */
const Dot = ({ x, y, size, color, label, count, delay, active }) => {
  const c = useCounter(count, active, 1000, delay + 500);
  return (
    <div className="asi" style={{ ...d(delay), position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", textAlign: "center" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: `${color}40`, border: `2px solid ${color}`, margin: "0 auto 4px", boxShadow: `0 0 ${size}px ${color}60`, animation: active ? "sg-pulse 3s ease-in-out infinite" : "none" }} />
      <span style={{ fontSize: 13, color: C.light, display: "block", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{c}</span>
    </div>
  );
};

/* ═══ SLIDES ═══ */

/* 1 — TITLE COVER */
const S0 = () => (
  <div style={{ height: "100%", background: C.dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    <p className="afd" style={{ ...d(400), color: C.blue, fontSize: 15, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 16 }}>Sagicor Technology</p>
    <h1 className="afu sg-h" style={{ ...d(800), fontSize: "clamp(48px, 7vw, 100px)", color: C.white, lineHeight: 1.05 }}>STEC Executive Briefing</h1>
    <div className="af" style={{ ...d(1400), width: 60, height: 2, background: C.gold, margin: "24px auto" }} />
    <p className="af" style={{ ...d(1800), color: C.gray, fontSize: 16, letterSpacing: "0.08em" }}>Technology Capability Assessment</p>
  </div>
);

/* 2 — THE MAP */
const S1 = ({ active }) => (
  <div style={{ height: "100%", background: C.dark, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "relative", width: "80%", height: "70%" }}>
      {/* Simplified map region */}
      <svg viewBox="0 0 600 400" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
        <path d="M50,80 Q120,60 200,70 L280,50 Q350,40 400,55 L450,80 Q480,100 470,130 L440,160 Q400,180 350,170 L300,180 Q250,200 200,190 L150,170 Q100,150 80,120 Z" fill={C.blue} opacity="0.3" />
        <path d="M200,220 Q240,210 280,230 L320,250 Q340,270 320,290 L280,300 Q250,310 220,290 L200,260 Q190,240 200,220 Z" fill={C.gold} opacity="0.3" />
      </svg>
      {/* Connecting lines */}
      {active && <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {[[28,62,42,35],[42,35,50,28],[28,62,55,68],[28,62,62,72],[28,62,18,42]].map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke={C.blue} strokeWidth="0.3" opacity="0.25" strokeDasharray="1000" strokeDashoffset="1000" style={{ animation: active ? `sg-drawLine 2s ease-out ${1500 + i*200}ms both` : "none" }} />
        ))}
      </svg>}
      <Dot x={28} y={62} size={28} color={C.gold} label="Jamaica" count={319} delay={400} active={active} />
      <Dot x={18} y={42} size={20} color={C.blue} label="Canada" count={60} delay={800} active={active} />
      <Dot x={42} y={35} size={16} color={C.blue} label="USA" count={19} delay={1200} active={active} />
      <Dot x={55} y={68} size={18} color={C.green} label="Barbados" count={74} delay={1600} active={active} />
      <Dot x={62} y={72} size={14} color={C.green} label="Trinidad" count={24} delay={2000} active={active} />
      <Dot x={50} y={78} size={10} color={C.gray} label="Panama" count={2} delay={2400} active={active} />
    </div>
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", padding: "0 40px 40px" }}>
      <h1 className="afu sg-h" style={{ ...d(3200), fontSize: "clamp(28px, 3vw, 48px)", color: C.white, marginBottom: 8 }}>The Technology Workforce is Ready.</h1>
      <p className="af" style={{ ...d(3800), color: C.light, fontSize: 18, marginBottom: 12 }}>Here's What We Found.</p>
      <p className="af" style={{ ...d(4200), color: C.gray, fontSize: 15 }}>498 employees. 6 countries. 11,897 data points.</p>
    </div>
  </div>
);

/* 2 — THE NUMBER */
const S2 = ({ active }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 3000);
    const t4 = setTimeout(() => setPhase(4), 4000);
    const t5 = setTimeout(() => setPhase(5), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [active]);
  return (
    <div style={{ height: "100%", background: C.dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {phase >= 1 && <span className="asl" style={{ fontSize: "clamp(120px, 18vw, 220px)", fontWeight: 900, color: C.blue, lineHeight: 1 }}>2</span>}
      {phase >= 2 && <p className="af" style={{ ...d(0), color: C.light, fontSize: "clamp(16px, 1.4vw, 22px)", marginTop: 20, maxWidth: 500, textAlign: "center" }}>out of 242 employees expressed fear of job loss due to AI.</p>}
      <div style={{ marginTop: 30, textAlign: "center" }}>
        {phase >= 3 && <p className="af" style={{ color: C.white, fontSize: "clamp(20px, 2vw, 32px)", fontWeight: 700 }}>Two.</p>}
        {phase >= 4 && <p className="af" style={{ color: C.gray, fontSize: "clamp(14px, 1.2vw, 20px)", marginTop: 8 }}>Not two hundred.</p>}
        {phase >= 5 && <p className="af" style={{ color: C.blue, fontSize: "clamp(20px, 2vw, 32px)", fontWeight: 700, marginTop: 8 }}>Two.</p>}
      </div>
    </div>
  );
};

/* 3 — WORKFORCE AT A GLANCE */
const S3 = ({ active }) => {
  const v1 = useCounter(242, active, 1000, 400);
  const v2 = useCounter(183, active, 1000, 600);
  const v3 = useCounter(11897, active, 1500, 800);
  const v4 = useCounter(46, active, 800, 1000);
  const cards = [
    { label: "Self-Assessments Completed", val: v1, sub: "49%", color: C.green, icon: "checkmark" },
    { label: "In Progress", val: v2, sub: "37%", color: C.blue, icon: "progress" },
    { label: "Qualitative Responses", val: v3.toLocaleString(), sub: null, color: C.gold, icon: "data" },
    { label: "Avg Responses / Employee", val: v4, sub: null, color: C.blue, icon: "person" },
    { label: "Countries Active", val: "6/6", sub: null, color: C.green, icon: "globe" },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 28 }}>The Workforce at a Glance</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        {cards.map((c, i) => (
          <Card key={i} delay={200 + i * 200}>
            <p style={{ color: C.gray, fontSize: 13, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{c.label}</p>
            <span style={{ fontSize: 36, fontWeight: 900, color: c.color }}>{c.val}</span>
            {c.sub && <span style={{ fontSize: 16, color: C.light, marginLeft: 6 }}>{c.sub}</span>}
          </Card>
        ))}
      </div>
      <div className="af" style={{ ...d(1600), display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(${C.green} 0% 86%, ${C.white}10 86% 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: C.green }}>86%</span>
          </div>
        </div>
        <span style={{ color: C.light, fontSize: 16 }}>Total Engagement<br />(Completed + In Progress)</span>
      </div>
      <p className="af" style={{ ...d(2200), color: C.gray, fontSize: 15, fontStyle: "italic" }}>This is not a survey. This is a capability map of every technology professional in the organization.</p>
    </div>
  );
};

/* 4 — AI READINESS SPECTRUM */
const S4 = ({ active }) => {
  const segs = [
    { label: "Actively Embracing", pct: 7.2, color: C.blue },
    { label: "Open & Curious", pct: 9.1, color: "#4DC9F6" },
    { label: "Cautiously Neutral", pct: 80.3, color: C.gray },
    { label: "Concerned / Resistant", pct: 3.4, color: `${C.coral}88` },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 32 }}>The AI Readiness Spectrum</h2>
      <div style={{ display: "flex", height: 56, borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ width: active ? `${s.pct}%` : "0%", background: s.color, transition: `width 800ms ease-out ${400 + i * 400}ms`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {s.pct > 10 && <span style={{ fontSize: 16, fontWeight: 700, color: s.color === C.gray ? C.white : C.dark }}>{s.pct}%</span>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
        {segs.map((s, i) => (
          <div key={i} className="af" style={{ ...d(800 + i * 300), display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            <span style={{ color: C.light, fontSize: 14 }}>{s.label}: <strong style={{ color: C.white }}>{s.pct}%</strong></span>
          </div>
        ))}
      </div>
      <p className="af" style={{ ...d(2400), color: C.gray, fontSize: 16, fontStyle: "italic", maxWidth: 600 }}>The 80% are not skeptics. They are professionals waiting for organizational clarity.</p>
    </div>
  );
};

/* 5 — WHAT WORKFORCE IS ASKING FOR */
const S5 = ({ active }) => {
  const asks = [
    { label: "Formal training or certification", val: 252, pct: 100, color: C.gold },
    { label: "Pride in expertise", val: 184, pct: 73, color: C.blue },
    { label: "Broader role", val: 131, pct: 52, color: C.blue },
    { label: "Mentoring/leading", val: 119, pct: 47, color: C.blue },
    { label: "More responsibility", val: 115, pct: 46, color: C.blue },
    { label: "AI/emerging tech", val: 66, pct: 26, color: C.blue },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 28 }}>What the Workforce is Asking For</h2>
      {asks.map((a, i) => <Bar key={i} label={a.label} pct={a.pct} color={a.color} value={a.val} delay={300 + i * 200} active={active} />)}
      <p className="af" style={{ ...d(2000), color: C.gray, fontSize: 16, fontStyle: "italic", marginTop: 16 }}>They did not wait to be asked. They wrote it in.</p>
    </div>
  );
};

/* 6 — POSITIVE-TO-NEGATIVE RATIO */
const S6 = ({ active }) => {
  const pos = [
    ["Proud of work", 393], ["Strong team cohesion", 298], ["Supported by manager", 235],
    ["Enjoying work", 208], ["Feeling valued", 203], ["Empowered to decide", 179], ["Positive with manager", 165],
  ];
  const neg = [["Unsupported", 49], ["Career uncertainty", 34], ["Workload concern", 34], ["Overlooked", 23], ["Tech keeping up", 23]];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(24px, 2.5vw, 38px)", marginBottom: 20 }}>The Positive-to-Negative Ratio</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        <div>
          <p className="af" style={{ ...d(200), color: C.green, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Positive Signals</p>
          {pos.map(([l, v], i) => (
            <div key={i} className="afl" style={{ ...d(300 + i * 100), display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.white}06` }}>
              <span style={{ color: C.light, fontSize: 15 }}>{l}</span>
              <span style={{ color: C.green, fontSize: 16, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="af" style={{ ...d(200), color: C.coral, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Challenging Signals</p>
          {neg.map(([l, v], i) => (
            <div key={i} className="afr" style={{ ...d(1200 + i * 100), display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.white}06` }}>
              <span style={{ color: C.light, fontSize: 15 }}>{l}</span>
              <span style={{ color: C.coral, fontSize: 16, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="asl" style={{ ...d(2000), textAlign: "center", marginTop: 24 }}>
        <span style={{ fontSize: "clamp(48px, 5vw, 72px)", fontWeight: 900, color: C.green }}>9:1</span>
        <p style={{ color: C.light, fontSize: 16, marginTop: 4 }}>Ratio: 9 to 1 positive.</p>
      </div>
    </div>
  );
};

/* 7 — ENGAGEMENT SIGNAL (with score explanation) */
const S7 = ({ active }) => {
  const tiers = [
    { label: "Low Response (<30)", count: 48, score: "3.05", color: C.gray },
    { label: "Medium Response (30-50)", count: 112, score: "3.13", color: C.blue },
    { label: "High Response (50+)", count: 82, score: "3.26", color: C.gold },
  ];
  const scale = [
    ["1", "No experience or exposure", C.coral],
    ["2", "Basic awareness, needs support", C.gray],
    ["3", "Competent, works independently", C.blue],
    ["4", "Proficient, handles complexity, guides others", C.green],
    ["5", "Expert, deep mastery, leads and innovates", C.gold],
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 4vw, 70px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(24px, 2.5vw, 38px)", marginBottom: 18 }}>The Engagement Signal</h2>
      <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
        {tiers.map((t, i) => (
          <div key={i} className="afu" style={{ ...d(300 + i * 400), flex: 1, background: C.card, borderRadius: 6, padding: "14px 16px", borderLeft: `4px solid ${t.color}` }}>
            <p style={{ color: C.light, fontSize: 13, fontWeight: 500 }}>{t.label}</p>
            <p style={{ color: C.white, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{t.count} employees</p>
            <div style={{ marginTop: 6 }}>
              <p style={{ color: C.gray, fontSize: 11, textTransform: "uppercase" }}>Avg Score</p>
              <p style={{ color: t.color, fontSize: 30, fontWeight: 900 }}>{t.score}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="af" style={{ ...d(1600), height: 1, background: `${C.white}12`, margin: "4px 0 14px" }} />
      <div style={{ display: "flex", gap: 28 }}>
        <div style={{ flex: "0 0 280px" }}>
          <p className="af" style={{ ...d(1800), color: C.blue, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>The 1-5 Scale</p>
          {scale.map(([n, desc, c], i) => (
            <div key={i} className="afl" style={{ ...d(2000 + i * 150), display: "flex", gap: 8, marginBottom: 4, alignItems: "baseline" }}>
              <span style={{ color: c, fontSize: 16, fontWeight: 800, width: 14 }}>{n}</span>
              <span style={{ color: C.light, fontSize: 13 }}>{desc}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <p className="af" style={{ ...d(2800), color: C.gold, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>The Insight</p>
          <div className="afr" style={{ ...d(3000), display: "flex", gap: 16, marginBottom: 10 }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: C.gray, fontSize: 26, fontWeight: 900 }}>3.05</span>
              <p style={{ color: C.light, fontSize: 12, marginTop: 2 }}>Competent</p>
            </div>
            <span style={{ color: C.gray, fontSize: 20, alignSelf: "center" }}>&rarr;</span>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: C.gold, fontSize: 26, fontWeight: 900 }}>3.26</span>
              <p style={{ color: C.light, fontSize: 12, marginTop: 2 }}>Toward Proficient</p>
            </div>
          </div>
          <p className="afr" style={{ ...d(3400), color: C.light, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>The 0.21 gap matters. High responders handle complex scenarios and guide others. Depth of articulation correlates with depth of capability.</p>
          <p className="afr" style={{ ...d(3800), color: C.gold, fontSize: 14, fontWeight: 600 }}>These 82 employees are candidates to watch for development investment.</p>
        </div>
      </div>
      <p className="af" style={{ ...d(4200), color: C.gray, fontSize: 14, fontStyle: "italic", marginTop: 10 }}>Employees who invested more, scored higher.</p>
    </div>
  );
};

/* 8 — COMPLETION MOMENTUM */
const S8 = ({ active }) => {
  const weeks = [
    { w: "Week 1", v: 43, note: "Canada/USA launch" },
    { w: "Week 2", v: 96, note: "Jamaica activation", highlight: true },
    { w: "Week 3", v: 34 }, { w: "Week 4", v: 56, note: "Second surge" },
    { w: "Week 5", v: 7 }, { w: "Week 6", v: 8, note: "Barbados/Trinidad" },
  ];
  const max = 96;
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 28 }}>Completion Momentum</h2>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 220, marginBottom: 16 }}>
        {weeks.map((wk, i) => (
          <div key={i} className="afu" style={{ ...d(300 + i * 300), flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {wk.note && <span style={{ fontSize: 11, color: wk.highlight ? C.gold : C.gray, marginBottom: 4, textAlign: "center", lineHeight: 1.2 }}>{wk.note}</span>}
            <div style={{ width: "100%", maxWidth: 60, background: wk.highlight ? C.gold : C.blue, borderRadius: "4px 4px 0 0", height: active ? `${(wk.v / max) * 180}px` : 0, transition: `height 600ms ease-out ${300 + i * 300}ms`, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{wk.v}</span>
            </div>
            <span style={{ fontSize: 13, color: C.gray, marginTop: 6 }}>{wk.w}</span>
          </div>
        ))}
      </div>
      <p className="af" style={{ ...d(2400), color: C.gray, fontSize: 15, fontStyle: "italic" }}>When Jamaica opened, the workforce moved. When Barbados opened, 93% engaged within 24 hours.</p>
    </div>
  );
};

/* 9 — THE CRITICAL GAP */
const S9 = ({ active }) => {
  const [show, setShow] = useState(false);
  useEffect(() => { if (active) { const t = setTimeout(() => setShow(true), 500); return () => clearTimeout(t); } setShow(false); }, [active]);
  const rows = [
    ["Canada", 47, 15, "32%", false], ["Jamaica", 213, 10, "5%", false],
    ["Barbados", 74, 2, "3%", false], ["USA", 16, 0, "0%", true],
    ["Trinidad", 24, 0, "0%", false], ["Panama", 2, 0, "0%", false],
  ];
  return (
    <div style={{ height: "100%", background: C.dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {show && <span className="asl" style={{ fontSize: "clamp(100px, 15vw, 200px)", fontWeight: 900, color: C.coral, lineHeight: 1 }}>7%</span>}
      {show && <p className="af" style={{ ...d(800), color: C.light, fontSize: "clamp(16px, 1.4vw, 22px)", marginTop: 12, marginBottom: 28 }}>of manager validations are complete</p>}
      <div className="af" style={{ ...d(1600), width: "100%", maxWidth: 500 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 60px", gap: 0, fontSize: 14 }}>
          <div style={{ color: C.gray, fontWeight: 600, padding: "6px 12px", borderBottom: `1px solid ${C.white}15` }}>Region</div>
          <div style={{ color: C.gray, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.white}15`, textAlign: "right" }}>Sent</div>
          <div style={{ color: C.gray, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.white}15`, textAlign: "right" }}>Done</div>
          <div style={{ color: C.gray, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.white}15`, textAlign: "right" }}>Rate</div>
          {rows.map(([r, s, c, rate, em], i) => (<>
            <div key={`r${i}`} style={{ color: C.light, padding: "6px 12px", borderBottom: `1px solid ${C.white}06` }}>{r}</div>
            <div key={`s${i}`} style={{ color: C.light, padding: "6px 8px", textAlign: "right", borderBottom: `1px solid ${C.white}06` }}>{s}</div>
            <div key={`c${i}`} style={{ color: c === 0 ? C.coral : C.light, padding: "6px 8px", textAlign: "right", fontWeight: c === 0 ? 700 : 400, borderBottom: `1px solid ${C.white}06` }}>{c}</div>
            <div key={`rt${i}`} style={{ color: em ? C.coral : C.light, padding: "6px 8px", textAlign: "right", fontWeight: em ? 900 : 400, borderBottom: `1px solid ${C.white}06`, background: em ? `${C.coral}15` : "transparent" }}>{rate}</div>
          </>))}
        </div>
      </div>
      <p className="af" style={{ ...d(2400), color: C.gray, fontSize: 15, marginTop: 20, fontStyle: "italic" }}>We need 50 to 100 manager validation responses to enrich the final assessment picture.</p>
    </div>
  );
};

/* 10 — REGIONAL PICTURE */
const S10 = ({ active }) => {
  const regions = [
    { name: "Jamaica", x: 28, y: 60, emp: 319, stat: "55% complete", note: "7,982 qualitative responses", color: C.gold },
    { name: "Canada", x: 18, y: 38, emp: 60, stat: "83% complete", note: "Leading dual completion", color: C.green },
    { name: "USA", x: 42, y: 32, emp: 19, stat: "84% complete", note: "Highest self-confidence", color: C.green },
    { name: "Barbados", x: 58, y: 66, emp: 74, stat: "Day 1 activation", note: "93% Day 1", color: C.green },
    { name: "Trinidad", x: 65, y: 72, emp: 24, stat: "In progress", note: "Deliberate, thorough", color: C.blue },
    { name: "Panama", x: 50, y: 78, emp: 2, stat: "In progress", note: null, color: C.gray },
  ];
  return (
    <div style={{ height: "100%", background: C.dark, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h2 className="afu sg-h" style={{ ...d(100), position: "absolute", top: 32, left: 40, fontSize: "clamp(22px, 2.2vw, 34px)" }}>The Regional Picture</h2>
      <div style={{ position: "relative", width: "85%", height: "70%" }}>
        {regions.map((r, i) => (
          <div key={i} className="asi" style={{ ...d(400 + i * 400), position: "absolute", left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%,-50%)" }}>
            <div style={{ background: C.card, border: `1px solid ${r.color}40`, borderRadius: 6, padding: "8px 12px", minWidth: 130, position: "relative" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", boxShadow: `0 0 12px ${r.color}` }} />
              <p style={{ color: r.color, fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>{r.name}</p>
              <p style={{ color: C.white, fontSize: 20, fontWeight: 900 }}>{r.emp} <span style={{ fontSize: 13, color: C.gray, fontWeight: 400 }}>employees</span></p>
              <p style={{ color: C.light, fontSize: 12 }}>{r.stat}</p>
              {r.note && <p style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>{r.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 11 — WHAT SCORES TELL US */
const S11 = ({ active }) => {
  const bands = [
    { range: "4.0 - 5.0", meaning: "Proficient to Expert — handles complexity, guides others, deep mastery", pct: 6, count: 17, color: C.green },
    { range: "3.0 - 4.0", meaning: "Competent — works independently on standard tasks, solid foundation", pct: 59, count: 172, color: C.gold },
    { range: "2.0 - 3.0", meaning: "Developing — basic awareness, needs support on complex work", pct: 34, count: "~99", color: C.gray },
    { range: "1.0 - 2.0", meaning: "Early Stage — minimal experience, requires significant guidance", pct: 1, count: "~3", color: `${C.coral}88` },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 70px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(24px, 2.5vw, 38px)", marginBottom: 6 }}>What the Scores Tell Us</h2>
      <p className="af" style={{ ...d(250), color: C.light, fontSize: 15, marginBottom: 20, maxWidth: 600 }}>Employees rated themselves on a 1-5 scale across technical skills, tools, processes, and behaviors.</p>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 32 }}>
        {/* Donut Chart */}
        <div className="asi" style={{ ...d(400), width: 170, height: 170, borderRadius: "50%", background: `conic-gradient(${C.green} 0% 6%, ${C.gold} 6% 65%, ${C.gray} 65% 99%, ${C.coral}88 99% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: C.gold }}>59%</span>
            <span style={{ fontSize: 11, color: C.gray }}>3.0-4.0 range</span>
          </div>
        </div>
        {/* Score Band Table */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 50px 50px", gap: "0", fontSize: 13 }}>
            <div className="af" style={{ ...d(500), color: C.gray, fontWeight: 700, padding: "4px 6px", borderBottom: `1px solid ${C.white}15`, textTransform: "uppercase", fontSize: 11 }}>Score</div>
            <div className="af" style={{ ...d(500), color: C.gray, fontWeight: 700, padding: "4px 6px", borderBottom: `1px solid ${C.white}15`, textTransform: "uppercase", fontSize: 11 }}>What It Means</div>
            <div className="af" style={{ ...d(500), color: C.gray, fontWeight: 700, padding: "4px 6px", borderBottom: `1px solid ${C.white}15`, textTransform: "uppercase", fontSize: 11, textAlign: "right" }}>%</div>
            <div className="af" style={{ ...d(500), color: C.gray, fontWeight: 700, padding: "4px 6px", borderBottom: `1px solid ${C.white}15`, textTransform: "uppercase", fontSize: 11, textAlign: "right" }}>Count</div>
            {bands.map((b, i) => (<span key={i} style={{ display: "contents" }}>
              <div className="afl" style={{ ...d(600 + i * 150), padding: "6px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.white}06` }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color, flexShrink: 0 }} />
                <span style={{ color: C.white, fontWeight: 700 }}>{b.range}</span>
              </div>
              <div className="af" style={{ ...d(700 + i * 150), padding: "6px", color: C.light, fontSize: 12, lineHeight: 1.4, borderBottom: `1px solid ${C.white}06` }}>{b.meaning}</div>
              <div className="af" style={{ ...d(800 + i * 150), padding: "6px", color: C.white, fontWeight: 700, textAlign: "right", borderBottom: `1px solid ${C.white}06` }}>{b.pct}%</div>
              <div className="af" style={{ ...d(800 + i * 150), padding: "6px", color: C.gray, textAlign: "right", borderBottom: `1px solid ${C.white}06` }}>({b.count})</div>
            </span>))}
          </div>
        </div>
      </div>
      {/* Key Insight Callout */}
      <div className="afu" style={{ ...d(1600), marginTop: 18, background: `${C.gold}10`, border: `1px solid ${C.gold}25`, borderRadius: 6, padding: "12px 18px", maxWidth: 600 }}>
        <p style={{ color: C.gold, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>59% of the workforce has a solid foundation.</p>
        <p style={{ color: C.light, fontSize: 14, lineHeight: 1.5 }}>These are the employees ready for targeted investment — the "medium talent" who can become "top talent" with the right development.</p>
      </div>
      <p className="af" style={{ ...d(2000), color: C.gray, fontSize: 14, fontStyle: "italic", marginTop: 10 }}>Only 1% rated themselves at the lowest tier. The workforce is not starting from zero.</p>
    </div>
  );
};

/* 12 — TOP THEMES */
const S12 = ({ active }) => {
  const themes = [
    { label: "Team Collaboration", val: 298, pct: 100 },
    { label: "Process Improvement", val: 252, pct: 85 },
    { label: "Career Growth", val: 231, pct: 78 },
    { label: "Technical Excellence", val: 208, pct: 70 },
    { label: "Innovation Mindset", val: 184, pct: 62 },
    { label: "Customer Focus", val: 165, pct: 55 },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 28 }}>The Top Themes</h2>
      {themes.map((t, i) => (
        <div key={i} className="afr" style={{ ...d(300 + i * 200), display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ color: i < 3 ? C.gold : C.light, fontSize: 15, fontWeight: i < 3 ? 700 : 400, width: 180, textAlign: "right" }}>{t.label}</span>
          <div style={{ flex: 1, height: 24, background: `${C.white}06`, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", background: i < 3 ? C.gold : C.blue, borderRadius: 3, width: active ? `${t.pct}%` : "0%", transition: `width 700ms ease-out ${300 + i * 200}ms` }} />
          </div>
          <span style={{ color: i < 3 ? C.gold : C.light, fontSize: 16, fontWeight: 700, width: 40, textAlign: "right" }}>{t.val}</span>
        </div>
      ))}
      <p className="af" style={{ ...d(2000), color: C.gray, fontSize: 16, fontStyle: "italic", marginTop: 16 }}>Collaboration. Improvement. Growth. These are the words that define this workforce.</p>
    </div>
  );
};

/* 13 — SENTIMENT BY DEPARTMENT */
const S13 = ({ active }) => {
  const depts = [
    { label: "Application Dev (USA)", score: 9.4 },
    { label: "Enterprise Architecture", score: 8.8 },
    { label: "Infrastructure (Canada)", score: 8.5 },
    { label: "Digital & Innovation", score: 8.2 },
    { label: "Security Operations", score: 7.9 },
    { label: "Data & Analytics", score: 7.6 },
    { label: "IT Operations (Jamaica)", score: 7.3 },
    { label: "Service Delivery", score: 7.1 },
  ];
  const scale = [
    ["9.0 - 10.0", "Exceptional — highly engaged, strong advocacy", C.gold],
    ["8.0 - 8.9", "Very Positive — engaged, collaborative, satisfied", C.green],
    ["7.0 - 7.9", "Positive — functional, stable, some room to grow", C.blue],
    ["6.0 - 6.9", "Neutral — neither strong positive nor negative signals", C.gray],
    ["Below 6.0", "Attention needed — friction, disengagement, or concerns", C.coral],
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 70px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(24px, 2.5vw, 38px)", marginBottom: 4 }}>Sentiment by Department</h2>
      <p className="af" style={{ ...d(200), color: C.light, fontSize: 14, marginBottom: 14, maxWidth: 650 }}>Sentiment score reflects how positively employees describe their work environment, team dynamics, and manager relationships — derived from qualitative response analysis.</p>
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* Bar Chart */}
        <div style={{ flex: 1 }}>
          {depts.map((dep, i) => {
            const color = dep.score >= 9 ? C.gold : dep.score >= 8 ? C.green : C.blue;
            return (
              <div key={i} className="afl" style={{ ...d(300 + i * 120), display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ color: C.light, fontSize: 13, width: 160, textAlign: "right", flexShrink: 0 }}>{dep.label}</span>
                <div style={{ flex: 1, height: 20, background: `${C.white}06`, borderRadius: 3, overflow: "hidden", position: "relative" }}>
                  <div style={{ height: "100%", background: color, borderRadius: 3, width: active ? `${(dep.score / 10) * 100}%` : "0%", transition: `width 600ms ease-out ${300 + i * 120}ms` }} />
                  {/* 7.0 Threshold Line */}
                  <div style={{ position: "absolute", left: "70%", top: 0, bottom: 0, width: 1, background: `${C.white}30`, borderLeft: "1px dashed rgba(255,255,255,0.25)" }} />
                </div>
                <span style={{ color, fontSize: 16, fontWeight: 800, width: 32 }}>{dep.score}</span>
              </div>
            );
          })}
          <div className="af" style={{ ...d(1600), display: "flex", alignItems: "center", gap: 6, marginLeft: 172, marginTop: 2 }}>
            <div style={{ width: 12, borderTop: "1px dashed rgba(255,255,255,0.4)" }} />
            <span style={{ color: C.gray, fontSize: 11 }}>7.0 Positive Threshold</span>
          </div>
        </div>
        {/* Score Interpretation */}
        <div className="afr" style={{ ...d(1200), width: 220, flexShrink: 0 }}>
          <p style={{ color: C.gray, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Score Interpretation</p>
          {scale.map(([range, desc, c], i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c, marginTop: 3, flexShrink: 0 }} />
              <div>
                <span style={{ color: C.white, fontSize: 12, fontWeight: 700 }}>{range}</span>
                <p style={{ color: C.light, fontSize: 11, lineHeight: 1.3 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Key Insight Callout */}
      <div className="afu" style={{ ...d(1800), marginTop: 12, background: `${C.green}10`, border: `1px solid ${C.green}25`, borderRadius: 6, padding: "10px 16px", display: "flex", gap: 20, alignItems: "center" }}>
        <div>
          <p style={{ color: C.green, fontSize: 15, fontWeight: 700 }}>Every department scores above 7.0.</p>
          <p style={{ color: C.light, fontSize: 13 }}>No department is in crisis. Even Service Delivery at 7.1 is in positive territory.</p>
        </div>
        <div style={{ height: 30, width: 1, background: `${C.white}15`, flexShrink: 0 }} />
        <div>
          <p style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}>Application Dev (USA) leads at 9.4 — exceptional engagement.</p>
          <p style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>The 2.3-point spread suggests consistency, not isolated pockets of concern.</p>
        </div>
      </div>
    </div>
  );
};

/* 14 — HIDDEN TALENT PATTERN */
const S14 = ({ active }) => (
  <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
    <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 32 }}>The Hidden Talent Pattern</h2>
    <div style={{ display: "flex", gap: 32, alignItems: "flex-end", height: 220, marginBottom: 20 }}>
      <div className="afu" style={{ ...d(400), textAlign: "center" }}>
        <div style={{ width: 120, background: C.blue, borderRadius: "6px 6px 0 0", height: active ? 140 : 0, transition: "height 800ms ease-out 400ms", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 12 }}>
          <span style={{ color: C.dark, fontWeight: 800, fontSize: 16 }}>Self</span>
        </div>
        <p style={{ color: C.light, fontSize: 14, marginTop: 8 }}>Self-Assessment</p>
      </div>
      <div className="afu" style={{ ...d(1000), textAlign: "center" }}>
        <div style={{ width: 120, background: C.gold, borderRadius: "6px 6px 0 0", height: active ? 190 : 0, transition: "height 800ms ease-out 1000ms", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 12 }}>
          <span style={{ color: C.dark, fontWeight: 800, fontSize: 16 }}>Manager</span>
        </div>
        <p style={{ color: C.light, fontSize: 14, marginTop: 8 }}>Manager Assessment</p>
      </div>
    </div>
    <p className="af" style={{ ...d(1800), color: C.gold, fontSize: 20, fontWeight: 700 }}>Managers see more than employees see in themselves.</p>
    <p className="af" style={{ ...d(2400), color: C.gray, fontSize: 16, fontStyle: "italic", marginTop: 12 }}>The purpose is not to rank people. It is to find them.</p>
  </div>
);

/* 15 — WHAT WE NAVIGATED */
const S15 = () => {
  const solved = [
    ["Data fragmented across 12+ sources", "Unified roster built"],
    ["Reporting lines mismatched", "Real-time corrections"],
    ["Assessment caused anxiety (North America)", "Blueprint revised"],
    ["Wrong employees in scope", "Removed on confirmation"],
    ["Outdated role mappings", "Profiles corrected"],
    ["DPA awaiting signatories", "Signatories confirmed"],
    ["SBBL missing manager data", "Data received"],
    ["Southern Caribbean gaps", "Titles/emails received"],
    ["Central America incomplete", "Profiles complete"],
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 60px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(24px, 2.5vw, 38px)", marginBottom: 16 }}>What We Navigated</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 28px 1fr 56px", gap: "4px 6px", alignItems: "center", fontSize: 13 }}>
        <p className="af" style={{ ...d(150), color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", paddingBottom: 4 }}>Challenge</p>
        <div />
        <p className="af" style={{ ...d(150), color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", paddingBottom: 4 }}>Resolution</p>
        <p className="af" style={{ ...d(150), color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", paddingBottom: 4, textAlign: "center" }}>Status</p>
        {solved.map(([ch, res], i) => (<span key={`row${i}`} style={{ display: "contents" }}>
          <div className="afl" style={{ ...d(200 + i * 140), background: `${C.white}05`, borderRadius: 4, padding: "5px 10px" }}>
            <span style={{ color: C.light }}>{ch}</span>
          </div>
          <div className="af" style={{ ...d(300 + i * 140), textAlign: "center" }}>
            <span style={{ color: C.gray, fontSize: 14 }}>&rarr;</span>
          </div>
          <div className="afr" style={{ ...d(400 + i * 140), background: `${C.green}0a`, borderRadius: 4, padding: "5px 10px" }}>
            <span style={{ color: C.light }}>{res}</span>
          </div>
          <div className="af" style={{ ...d(500 + i * 140), textAlign: "center" }}>
            <span style={{ color: C.green, fontWeight: 800, fontSize: 12, background: `${C.green}18`, padding: "2px 6px", borderRadius: 3 }}>SOLVED</span>
          </div>
        </span>))}
        {/* IN PROGRESS ROW — same style as solved rows */}
        <div className="afl" style={{ ...d(200 + 9 * 140), background: `${C.white}05`, borderRadius: 4, padding: "5px 10px" }}>
          <span style={{ color: C.light }}>Platform issues reported by users</span>
        </div>
        <div className="af" style={{ ...d(300 + 9 * 140), textAlign: "center" }}>
          <span style={{ color: C.gray, fontSize: 14 }}>&rarr;</span>
        </div>
        <div className="afr" style={{ ...d(400 + 9 * 140), background: `${C.green}0a`, borderRadius: 4, padding: "5px 10px" }}>
          <span style={{ color: C.light }}>Team receiving feedback and actively working on fixes</span>
        </div>
        <div className="af" style={{ ...d(500 + 9 * 140), textAlign: "center" }}>
          <span style={{ color: C.green, fontWeight: 800, fontSize: 12, background: `${C.green}18`, padding: "2px 6px", borderRadius: 3, whiteSpace: "nowrap" }}>IN PROGRESS</span>
        </div>
      </div>
      <div className="af" style={{ ...d(2200), textAlign: "center", marginTop: 12 }}>
        <p style={{ color: C.green, fontSize: 17, fontWeight: 700 }}>40+ issues identified. 9 resolved. 1 actively being addressed.</p>
        <p style={{ color: C.light, fontSize: 14, marginTop: 4 }}>Platform fully operational across all six countries.</p>
      </div>
    </div>
  );
};

/* 16 — ITEMS REQUIRING ACTION */
const S16 = () => {
  const items = [
    { title: "DPA Execution", desc: "Awaiting signatories", icon: "doc" },
    { title: "SBBL Data", desc: "Missing manager details", icon: "data" },
    { title: "Southern Caribbean", desc: "Missing job titles", icon: "map" },
    { title: "Central America", desc: "Missing employee profiles", icon: "people" },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 28 }}>Items Requiring Action</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {items.map((it, i) => (
          <Card key={i} delay={300 + i * 300} style={{ borderLeft: `3px solid ${C.coral}`, position: "relative" }}>
            <div style={{ position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: "50%", background: C.coral, animation: "sg-pulse 2s ease-in-out infinite" }} />
            <p className="sg-h" style={{ color: C.white, fontSize: 18, marginBottom: 4 }}>{it.title}</p>
            <p style={{ color: C.light, fontSize: 15 }}>{it.desc}</p>
            <p style={{ color: C.coral, fontSize: 13, fontWeight: 600, marginTop: 8, textTransform: "uppercase" }}>Awaiting Action</p>
          </Card>
        ))}
      </div>
      <p className="af" style={{ ...d(1800), color: C.gray, fontSize: 15, fontStyle: "italic", marginTop: 20 }}>Leadership escalation will accelerate resolution.</p>
    </div>
  );
};

/* 17 — WHAT'S NEXT (ENHANCED) */
const S17 = ({ active }) => {
  const phases = [
    { label: "THIS WEEK", items: ["Manager validations continue — need 50-100 before Phase 2/3 merges", "Dashboard links to unit heads going out"], color: C.blue },
    { label: "MONDAY", items: ["Phase 2/3: Technical Assessment + Hands-On Simulation", "Validates practical capability through real scenarios", "Produces observable, comparable data across all regions"], color: C.green, highlight: true },
    { label: "APRIL", items: ["Executive readout", "Final analysis and recommendations presented to leadership"], color: "#9B59B6" },
    { label: "FOLLOWING", items: ["Employees receive development plans", "Personalized, actionable plans for every employee"], color: C.gold },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 60px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 24 }}>What's Next</h2>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, position: "relative" }}>
        <div className="af" style={{ ...d(300), position: "absolute", top: 20, left: 0, right: 0, height: 2, background: `${C.white}12` }} />
        {phases.map((p, i) => (
          <div key={i} className="afu" style={{ ...d(400 + i * 500), flex: 1, position: "relative", paddingTop: 32 }}>
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: p.highlight ? p.color : `${p.color}60`, border: `2px solid ${p.color}`, boxShadow: p.highlight && active ? `0 0 16px ${p.color}` : "none", zIndex: 2 }} />
            <div style={{ background: C.card, border: `1px solid ${p.color}25`, borderTop: `3px solid ${p.color}`, borderRadius: 6, padding: "14px 12px", margin: "0 6px" }}>
              <p style={{ color: p.color, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{p.label}</p>
              {p.items.map((it, j) => (
                <p key={j} style={{ color: C.light, fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>{it}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="af" style={{ ...d(2800), color: C.gold, fontSize: 17, fontWeight: 700, textAlign: "center", marginTop: 24 }}>The work continues. The investment is real.</p>
    </div>
  );
};

/* 18 — YOUR DASHBOARD */
const S18 = () => (
  <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
    <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 24 }}>Your Dashboard</h2>
    <div className="asi" style={{ ...d(400), width: "100%", maxWidth: 700, background: C.card, border: `1px solid ${C.white}12`, borderRadius: 10, padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <div className="afu" style={{ ...d(600), background: `${C.white}06`, borderRadius: 8, padding: 16, textAlign: "center" }}>
        <p style={{ color: C.gray, fontSize: 12, textTransform: "uppercase", marginBottom: 8 }}>Completion Status</p>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: `conic-gradient(${C.green} 0% 49%, ${C.blue} 49% 86%, ${C.white}10 86% 100%)`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.card, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>86%</span>
          </div>
        </div>
      </div>
      <div className="afu" style={{ ...d(800), background: `${C.white}06`, borderRadius: 8, padding: 16, textAlign: "center" }}>
        <p style={{ color: C.gray, fontSize: 12, textTransform: "uppercase", marginBottom: 8 }}>Manager Validation</p>
        <div style={{ height: 12, background: `${C.white}10`, borderRadius: 6, overflow: "hidden", margin: "24px 0" }}>
          <div style={{ width: "7%", height: "100%", background: C.coral, borderRadius: 6 }} />
        </div>
        <span style={{ color: C.coral, fontSize: 28, fontWeight: 900 }}>7%</span>
      </div>
      <div className="afu" style={{ ...d(1000), background: `${C.white}06`, borderRadius: 8, padding: 16, textAlign: "center" }}>
        <p style={{ color: C.gray, fontSize: 12, textTransform: "uppercase", marginBottom: 8 }}>Score Trend</p>
        <svg viewBox="0 0 100 60" style={{ width: "100%", height: 60 }}>
          <polyline points="10,45 30,40 50,35 70,28 90,22" fill="none" stroke={C.gold} strokeWidth="2" />
          <circle cx="90" cy="22" r="3" fill={C.gold} />
        </svg>
        <span style={{ color: C.gold, fontSize: 16, fontWeight: 700 }}>Trending Up</span>
      </div>
    </div>
    <p className="af" style={{ ...d(1400), color: C.gray, fontSize: 15, marginTop: 20 }}>Real-time visibility into your team's participation. Your dashboard link will be sent this week.</p>
  </div>
);

/* 19 — WHAT WE NEED FROM YOU */
const S19 = () => {
  const asks = [
    { n: "1", title: "Drive Manager Validation Completion", desc: "50-100 responses before Monday", color: C.coral },
    { n: "2", title: "Escalate the Data Gaps", desc: "DPA, SBBL, Southern Caribbean, Central America", color: C.gold },
    { n: "3", title: "Flag Anticipated Problems", desc: "What should we prepare for?", color: C.blue },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 28 }}>What We Need From You</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {asks.map((a, i) => (
          <Card key={i} delay={400 + i * 500} style={{ borderTop: `3px solid ${a.color}`, textAlign: "center", padding: "28px 20px" }}>
            <span style={{ fontSize: 54, fontWeight: 900, color: a.color, lineHeight: 1 }}>{a.n}</span>
            <p className="sg-h" style={{ color: C.white, fontSize: 18, marginTop: 12, marginBottom: 8 }}>{a.title}</p>
            <p style={{ color: C.light, fontSize: 15 }}>{a.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* NEW — WHAT EMPLOYEES WILL RECEIVE */
const SReceive = () => {
  const items = [
    { title: "Personal Capability Profile", desc: "Where they stand across technical skills, behaviors, and AI readiness", color: C.blue },
    { title: "Development Plan", desc: "Actionable steps tailored to their role and growth trajectory", color: C.green },
    { title: "Training Recommendations", desc: "Specific courses, certifications, and learning paths", color: C.gold },
    { title: "Milestones", desc: "Clear markers of progress they can track", color: "#9B59B6" },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 8 }}>What Every Employee Gets</h2>
      <p className="af" style={{ ...d(300), color: C.light, fontSize: 16, marginBottom: 24 }}>Once the full assessment is complete, every technology employee will receive:</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {items.map((it, i) => (
          <Card key={i} delay={500 + i * 300} style={{ borderLeft: `3px solid ${it.color}` }}>
            <p className="sg-h" style={{ color: it.color, fontSize: 17, marginBottom: 6 }}>{it.title}</p>
            <p style={{ color: C.light, fontSize: 14, lineHeight: 1.5 }}>{it.desc}</p>
          </Card>
        ))}
      </div>
      <p className="af" style={{ ...d(1800), color: C.light, fontSize: 15, marginBottom: 8 }}>This is not a one-time report. This is an ongoing development journey.</p>
      <p className="af" style={{ ...d(2200), color: C.gold, fontSize: 18, fontWeight: 700 }}>Goal: 95%+ of employees with actionable development plans and clear evidence of progress.</p>
    </div>
  );
};

/* NEW — TRAINING IS BEING LINED UP */
const STraining = () => {
  const items = [
    { title: "Structured Learning Paths", desc: "Role-specific development tracks being designed", color: C.blue },
    { title: "Mentorship and Coaching", desc: "Pairing emerging builders with senior technical leaders", color: C.green },
    { title: "Ongoing Capability Building", desc: "Not a one-time event — continuous investment", color: C.gold },
  ];
  return (
    <div style={{ height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <h2 className="afu sg-h" style={{ ...d(100), fontSize: "clamp(26px, 2.8vw, 42px)", marginBottom: 8 }}>Development Investment is Coming</h2>
      <p className="af" style={{ ...d(300), color: C.light, fontSize: 16, marginBottom: 24 }}>Training capabilities are being prepared:</p>
      <div style={{ maxWidth: 560 }}>
        {items.map((it, i) => (
          <div key={i} className="afl" style={{ ...d(500 + i * 500), display: "flex", gap: 16, marginBottom: 18, background: C.card, borderRadius: 6, padding: "18px 20px", borderLeft: `4px solid ${it.color}` }}>
            <div>
              <p className="sg-h" style={{ color: it.color, fontSize: 17, marginBottom: 4 }}>{it.title}</p>
              <p style={{ color: C.light, fontSize: 15, lineHeight: 1.5 }}>{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="af" style={{ ...d(2200), marginTop: 20 }}>
        <p style={{ color: C.white, fontSize: 16, fontWeight: 600 }}>The assessment tells us WHO to invest in and WHAT they need.</p>
        <p style={{ color: C.gold, fontSize: 16, fontWeight: 600, marginTop: 6 }}>The training program delivers that investment.</p>
      </div>
    </div>
  );
};

/* 20 — THE BOTTOM LINE (ENHANCED) */
const S20 = ({ active }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4600),
      setTimeout(() => setPhase(5), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);
  return (
    <div style={{ height: "100%", background: C.dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      {phase >= 1 && <p className="afu" style={{ color: C.white, fontSize: "clamp(20px, 2.2vw, 32px)", fontWeight: 700, maxWidth: 600 }}>The workforce is not waiting to be convinced.</p>}
      {phase >= 2 && <p className="afu" style={{ color: C.gold, fontSize: "clamp(20px, 2.2vw, 32px)", fontWeight: 700, marginTop: 12, maxWidth: 600 }}>They are waiting for investment.</p>}
      {phase >= 3 && (
        <div style={{ marginTop: 24 }}>
          {[
            ["Where they stand", "Clear, data-driven capability picture"],
            ["Where they're going", "Personalized development pathway"],
            ["How they'll get there", "Training, mentorship, and support"],
            ["That leadership is serious", "Real investment, not just talk"],
          ].map(([bold, desc], i) => (
            <div key={i} className="afl" style={{ ...d(i * 200), display: "flex", gap: 10, marginBottom: 6, justifyContent: "center" }}>
              <span style={{ color: C.gold, fontSize: 15, fontWeight: 700 }}>{bold}</span>
              <span style={{ color: C.gray, fontSize: 15 }}>— {desc}</span>
            </div>
          ))}
        </div>
      )}
      {phase >= 4 && (
        <div className="asi" style={{ marginTop: 24, background: C.card, border: `1px solid ${C.gold}30`, borderRadius: 8, padding: "16px 28px" }}>
          <p style={{ color: C.light, fontSize: 16, fontStyle: "italic" }}>"They're really serious. They're really investing in us."</p>
        </div>
      )}
      {phase >= 5 && <p className="afu" style={{ color: C.gold, fontSize: 18, fontWeight: 700, marginTop: 20 }}>This assessment is how that investment begins.</p>}
    </div>
  );
};

/* ═══ MAIN ENGINE ═══ */
const SLIDES = [S0, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S18, SReceive, STraining, S17, S19, S20];
const TOTAL = SLIDES.length;

export default function SagicorSTECPresentation() {
  const [cur, setCur] = useState(0);
  const [sweep, setSweep] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const containerRef = useRef(null);

  const go = useCallback((i) => {
    if (i >= 0 && i < TOTAL && i !== cur) {
      setSweep(true);
      setTimeout(() => { setCur(i); setSweep(false); }, 300);
    }
  }, [cur]);

  const downloadPDF = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setDlProgress(0);
    const container = containerRef.current;
    if (!container) return;

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });
    const pages = container.querySelectorAll(".sg-pg");

    for (let i = 0; i < pages.length; i++) {
      setDlProgress(Math.round(((i + 1) / pages.length) * 100));
      // Show this slide, hide others
      pages.forEach((p, j) => {
        p.style.visibility = j === i ? "visible" : "hidden";
        p.style.zIndex = j === i ? "10" : "0";
        p.setAttribute("data-active", j === i ? "true" : "false");
      });
      // Wait for animations to settle
      await new Promise(r => setTimeout(r, 1800));

      const canvas = await html2canvas(pages[i], {
        backgroundColor: null,
        scale: 2,
        width: container.offsetWidth,
        height: container.offsetHeight,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([1920, 1080], "landscape");
      pdf.addImage(imgData, "JPEG", 0, 0, 1920, 1080);
    }

    // Restore current slide
    pages.forEach((p, j) => {
      p.style.visibility = j === cur ? "visible" : "hidden";
      p.style.zIndex = j === cur ? "10" : "0";
      p.setAttribute("data-active", j === cur ? "true" : "false");
    });

    pdf.save("STEC-Executive-Briefing.pdf");
    setDownloading(false);
    setDlProgress(0);
  }, [downloading, cur]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); go(cur + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(cur - 1); }
      if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cur, go]);

  useEffect(() => {
    let sx = 0;
    const ts = (e) => { sx = e.touches[0].clientX; };
    const te = (e) => { const dx = sx - e.changedTouches[0].clientX; if (Math.abs(dx) > 60) { dx > 0 ? go(cur + 1) : go(cur - 1); } };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });
    return () => { window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, [cur, go]);

  return (
    <div className="sg" ref={containerRef} style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }} data-testid="sagicor-stec-presentation">
      <style>{css}</style>
      <div className={`sg-sweep ${sweep ? "active" : ""}`}><div className="sg-sweep-line" /></div>
      {SLIDES.map((SC, i) => (
        <div key={i} className="sg-pg" data-active={i === cur ? "true" : "false"} data-testid={`stec-slide-${i + 1}`} style={{ position: "absolute", inset: 0, zIndex: i === cur ? 10 : 0, visibility: i === cur ? "visible" : "hidden" }}>
          <SC active={i === cur} />
        </div>
      ))}
      {/* Download overlay */}
      {downloading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <p style={{ color: C.white, fontSize: 20, fontWeight: 600 }}>Generating PDF...</p>
          <div style={{ width: 240, height: 4, background: `${C.white}15`, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: C.blue, borderRadius: 2, width: `${dlProgress}%`, transition: "width 300ms ease-out" }} />
          </div>
          <p style={{ color: C.gray, fontSize: 15 }}>{dlProgress}% — Capturing slide {Math.ceil((dlProgress / 100) * TOTAL)} of {TOTAL}</p>
        </div>
      )}
      <div style={{ position: "fixed", bottom: 16, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={downloadPDF} disabled={downloading} title="Download PDF" style={{ width: 30, height: 30, background: `${C.white}08`, border: `1px solid ${C.white}15`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6, marginRight: 6 }} data-testid="stec-download"><Download size={13} color={C.white} /></button>
        <button onClick={() => go(cur - 1)} disabled={cur === 0} style={{ width: 30, height: 30, background: `${C.white}08`, border: `1px solid ${C.white}15`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === 0 ? 0.2 : 0.6 }} data-testid="stec-prev"><ChevronLeft size={14} color={C.white} /></button>
        <span style={{ fontSize: 14, fontWeight: 600, color: `${C.white}60`, minWidth: 50, textAlign: "center", fontFamily: "'Inter', sans-serif" }} data-testid="stec-counter">{cur + 1} / {TOTAL}</span>
        <button onClick={() => go(cur + 1)} disabled={cur === TOTAL - 1} style={{ width: 30, height: 30, background: `${C.white}08`, border: `1px solid ${C.white}15`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === TOTAL - 1 ? 0.2 : 0.6 }} data-testid="stec-next"><ChevronRight size={14} color={C.white} /></button>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 2, background: `${C.white}08`, zIndex: 50 }}>
        <div style={{ height: "100%", background: C.blue, width: `${((cur + 1) / TOTAL) * 100}%`, transition: "width 300ms ease-out" }} />
      </div>
    </div>
  );
}
