import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Grid, X, Check } from "lucide-react";

/* ═══ DESIGN TOKENS ═══ */
const C = {
  bg: "#0A0A0A", card: "#121212", white: "#FFFFFF", text: "#EDEDE9",
  sec: "#6B7280", muted: "#4B5563", border: "rgba(255,255,255,0.1)",
  blue: "#3B82F6", grey: "#9CA3AF", red: "#EF4444", green: "#4ADE80",
  amber: "#F59E0B",
};

/* ═══ GLOBAL CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
.rl * { box-sizing: border-box; margin: 0; padding: 0; }
.rl { font-family: 'Inter', sans-serif; background: ${C.bg}; color: ${C.white}; overflow: hidden; }
.rl-pf { font-family: 'Playfair Display', serif; }
.rl-mono { font-family: 'JetBrains Mono', monospace; }
@keyframes rl-up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
@keyframes rl-fade { from { opacity:0; } to { opacity:1; } }
@keyframes rl-left { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
@keyframes rl-right { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
@keyframes rl-scale { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
.rl-pg[data-active="true"] .au { animation: rl-up 500ms ease-out both; }
.rl-pg[data-active="true"] .af { animation: rl-fade 500ms ease-out both; }
.rl-pg[data-active="true"] .al { animation: rl-left 500ms ease-out both; }
.rl-pg[data-active="true"] .ar { animation: rl-right 500ms ease-out both; }
.rl-pg[data-active="true"] .as { animation: rl-scale 500ms ease-out both; }
.rl-pg[data-active="false"] .au,.rl-pg[data-active="false"] .af,.rl-pg[data-active="false"] .al,
.rl-pg[data-active="false"] .ar,.rl-pg[data-active="false"] .as { opacity:0; }
.rl-pill { display:inline-block; padding:4px 12px; border:1px solid ${C.border}; border-radius:2px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:${C.sec}; margin-bottom:16px; }
.rl-card { background:${C.card}; border:1px solid ${C.border}; border-radius:2px; padding:24px; }
.rl-grid-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.95); display:flex; flex-wrap:wrap; gap:8px; padding:40px; overflow-y:auto; align-content:flex-start; }
.rl-grid-overlay .rl-thumb { width:calc(12.5% - 7px); aspect-ratio:16/9; background:${C.card}; border:1px solid ${C.border}; border-radius:2px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; color:${C.sec}; transition:border-color 200ms; }
.rl-grid-overlay .rl-thumb:hover { border-color:${C.white}; color:${C.white}; }
.rl-grid-overlay .rl-thumb.active { border-color:${C.blue}; color:${C.blue}; }
`;

const dl = (ms) => ({ animationDelay: `${ms}ms` });

/* ═══ HOOKS ═══ */
const useCount = (target, active, dur = 800, delay = 0) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) { setV(0); return; }
    const t = setTimeout(() => {
      let s = 0; const step = target / (dur / 16);
      const id = setInterval(() => { s += step; if (s >= target) { setV(target); clearInterval(id); } else setV(Math.floor(s)); }, 16);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [active, target, dur, delay]);
  return v;
};

/* ═══ SHARED CHROME ═══ */
const Header = () => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", zIndex: 5 }}>
    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.15em", color: C.white }}>REALLOC</span>
    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.muted }}>Prepared for Sagicor Financial Company</span>
  </div>
);

const Badge = ({ text, delay = 0 }) => (
  <div className="af rl-pill" style={dl(delay)}>{text}</div>
);

const DataCard = ({ children, delay = 0, style = {} }) => (
  <div className="au rl-card" style={{ ...dl(delay), ...style }}>{children}</div>
);

/* ═══ SLIDE 1: TITLE ═══ */
const S1 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    <Header />
    <span className="af rl-pf" style={{ ...dl(400), fontSize: "clamp(54px,6.5vw,80px)", fontWeight: 700, letterSpacing: "0.08em", color: C.white }}>REALLOC</span>
    <p className="au" style={{ ...dl(800), fontSize: 23, color: C.white, marginTop: 16 }}>AI Capability Program for Sagicor Financial Company</p>
    <p className="af" style={{ ...dl(1200), fontSize: 16, color: C.muted, marginTop: 12 }}>Diagnose. Reallocate. Equip.</p>
    <div style={{ position: "absolute", bottom: 60, textAlign: "center" }}>
      <p className="af" style={{ ...dl(1600), fontSize: 15, color: C.muted }}>Prepared by THCO | Powered by the Realloc Platform | March 2026</p>
      <p className="af" style={{ ...dl(2000), fontSize: 14, color: C.sec, marginTop: 8, maxWidth: 600 }}>Supported by 269 vetted AI practitioners from Meta, McKinsey, NVIDIA, OpenAI, Morgan Stanley, xAI, IBM, SAP, AWS, and 50+ other leading organizations.</p>
    </div>
  </div>
);

/* ═══ SLIDE 2: OPENING QUOTE ═══ */
const S2 = () => (
  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(40px,10vw,200px)" }}>
    <Header />
    <p className="au rl-pf" style={{ ...dl(600), fontSize: "clamp(26px,2.6vw,34px)", fontWeight: 400, fontStyle: "italic", color: C.white, lineHeight: 1.6, textAlign: "center", maxWidth: 700 }}>
      "The question is no longer whether AI will change your workforce. The question is whether you will lead that change or react to it."
    </p>
  </div>
);

/* ═══ SLIDE 3: THE PROBLEM ═══ */
const S3 = () => (
  <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
    <Header />
    <div style={{ maxWidth: "60%" }}>
      <Badge text="THE CHALLENGE" delay={200} />
      <h2 className="au rl-pf" style={{ ...dl(400), fontSize: "clamp(32px,3.2vw,46px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 24 }}>AI Is Restructuring Work. Right Now. Inside Sagicor.</h2>
      <p className="au" style={{ ...dl(700), fontSize: 18, color: C.text, lineHeight: 1.8 }}>
        AI is not eliminating jobs overnight. It is changing what makes each role valuable.
      </p>
      <p className="au" style={{ ...dl(900), fontSize: 18, color: C.text, lineHeight: 1.8, marginTop: 16 }}>
        Some of Sagicor's 498 technology employees are about to become more valuable than ever. Others are in roles that AI is actively commoditizing.
      </p>
      <p className="au" style={{ ...dl(1100), fontSize: 18, color: C.text, lineHeight: 1.8, marginTop: 16 }}>
        Until now, there has been no way to tell which is which.
      </p>
    </div>
  </div>
);

/* ═══ SLIDE 4: WHAT MOST ORGS DO ═══ */
const S4 = () => {
  const cards = [
    { t: "Generic Training", l: ["Same AI course for everyone", "Wastes budget on the wrong people"] },
    { t: "Consulting Firms", l: ["3-6 months of discovery first", "Slow, expensive, starts without data"] },
    { t: "Vendor Certifications", l: ["One vendor's tools for everyone", "Narrow, no personalization"] },
    { t: "Doing Nothing", l: ["Wait and see", "Competitors recruit your best people"] },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 32 }}>How Companies Typically Respond</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {cards.map((c, i) => (
          <DataCard key={i} delay={400 + i * 200}>
            <p style={{ fontSize: 18, fontWeight: 600, color: C.white, marginBottom: 12 }}>{c.t}</p>
            {c.l.map((line, j) => <p key={j} style={{ fontSize: 16, color: C.sec, lineHeight: 1.6, marginBottom: 4 }}>{line}</p>)}
          </DataCard>
        ))}
      </div>
      <p className="au" style={{ ...dl(1400), fontSize: 18, fontWeight: 700, color: C.white, marginTop: 28 }}>All four approaches start without data.</p>
    </div>
  );
};

/* ═══ SLIDE 5: THE REALLOC DIFFERENCE ═══ */
const S5 = ({ active }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const ts = [600, 1200, 1800, 2400, 3000, 4000, 5000].map((t, i) => setTimeout(() => setPhase(i + 1), t));
    return () => ts.forEach(clearTimeout);
  }, [active]);
  const lines = [
    "What if every worker had already been assessed?",
    "Their tasks decomposed.",
    "Their displacement direction scored.",
    "Their gaps identified.",
    "Their manager's validation recorded.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(32px,3.2vw,46px)", fontWeight: 700, marginBottom: 32 }}>What If You Already Had the Data?</h2>
      {lines.map((l, i) => phase > i && <p key={i} className="au" style={{ fontSize: 18, color: C.text, lineHeight: 1.8, marginBottom: 6 }}>{l}</p>)}
      {phase >= 6 && <p className="au" style={{ fontSize: 20, fontWeight: 700, color: C.white, marginTop: 28 }}>Sagicor already has that data.</p>}
    </div>
  );
};

/* ═══ SLIDE 6: ASSESSMENT AT A GLANCE ═══ */
const S6 = ({ active }) => {
  const v1 = useCount(498, active, 800, 600);
  const v2 = useCount(6, active, 500, 800);
  const v3 = useCount(242, active, 800, 1000);
  const metrics = [
    { v: v1, l: "Workers Assessed" },
    { v: v2, l: "Countries" },
    { v: v3, l: "Self-Assessments Completed" },
    { v: "2,500+", l: "Tasks Decomposed", s: true },
    { v: "10,000+", l: "Data Points Collected", s: true },
  ];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <div style={{ flex: 1 }}>
        <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, lineHeight: 1.3, maxWidth: 500 }}>The Most Comprehensive Technology Workforce Assessment in Sagicor's History</h2>
      </div>
      <div className="au rl-card" style={{ ...dl(500), width: 340 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.sec, textTransform: "uppercase", letterSpacing: "0.1em" }}>LIVE METRICS</span>
        </div>
        {metrics.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <span className="rl-mono" style={{ fontSize: 28, fontWeight: 700, color: C.white }}>{m.s ? m.v : v1 === 0 ? 0 : m.v}</span>
            <span style={{ fontSize: 15, color: C.sec }}>{m.l}</span>
          </div>
        ))}
        <p style={{ fontSize: 14, color: C.muted, marginTop: 16 }}>Jamaica. Canada. USA. Barbados. Trinidad and Tobago. Curacao.</p>
      </div>
    </div>
  );
};

/* ═══ SLIDE 7: ASSESSMENT PHASES ═══ */
const S7 = () => {
  const phases = [
    { n: "Phase 1", t: "Self-Assessment", s: "Complete", sc: C.green, d: "242 responses. How workers perceive their own capabilities." },
    { n: "Phase 2", t: "Manager Validation", s: "Underway", sc: C.amber, d: "How managers independently rate capability and classify builders." },
    { n: "Phase 3", t: "Technical Assessment", s: "Upcoming", sc: C.grey, d: "Objective measurement through structured simulations." },
    { n: "Phase 4", t: "Hands On Simulation", s: "Upcoming", sc: C.grey, d: "Applied AI problem-solving under realistic conditions." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>Where We Are in the Assessment Process</h2>
      {phases.map((p, i) => (
        <DataCard key={i} delay={400 + i * 250} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 14, color: C.muted, fontWeight: 600, textTransform: "uppercase", width: 60 }}>{p.n}</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.white, width: 200 }}>{p.t}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, width: 100 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.sc }} />
            <span style={{ fontSize: 14, color: p.sc, fontWeight: 500 }}>{p.s}</span>
          </span>
          <span style={{ fontSize: 16, color: C.sec, flex: 1 }}>{p.d}</span>
        </DataCard>
      ))}
      <DataCard delay={1500} style={{ marginTop: 8, borderColor: `${C.muted}40` }}>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>All displacement scores, builder core rankings, and group distributions in this presentation are based on Self-Assessment inference and Manager Validation data received so far. They are directional, not definitive. As Technical Assessments complete, these will sharpen.</p>
      </DataCard>
    </div>
  );
};

/* ═══ SLIDE 8: THREE GROUPS ═══ */
const S8 = ({ active }) => {
  const groups = [
    { pct: "~32%", label: "RISING", color: C.blue, desc: "AI automates the routine. Their core expertise becomes more valuable.", act: "They need acceleration, not retraining." },
    { pct: "~41%", label: "STABLE", color: C.grey, desc: "Displacement direction unclear. Could move either way.", act: "They need monitoring and targeted upskilling." },
    { pct: "~27%", label: "AT RISK", color: C.red, desc: "AI automates the expertise itself. Generic upskilling will not help.", act: "They need structural reallocation." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 6 }}>Early Signals: Your Workforce Falls Into Three Groups</h2>
      <p className="af" style={{ ...dl(400), fontSize: 15, color: C.muted, marginBottom: 28 }}>Based on SA inference and MV data to date.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {groups.map((g, i) => (
          <DataCard key={i} delay={600 + i * 300} style={{ borderTop: `2px solid ${g.color}` }}>
            <span className="rl-mono" style={{ fontSize: 54, fontWeight: 700, color: g.color, lineHeight: 1 }}>{g.pct}</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: g.color, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 8, marginBottom: 12 }}>{g.label}</p>
            <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.6, marginBottom: 12 }}>{g.desc}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{g.act}</p>
          </DataCard>
        ))}
      </div>
    </div>
  );
};

/* ═══ SLIDE 9: HEATMAP ═══ */
const S9 = ({ active }) => {
  const dots = useMemo(() => {
    const pts = []; const seed = (s) => { let x = s; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; };
    const r = seed(42);
    const gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    // Rising: x 7-10
    for (let i = 0; i < 160; i++) { pts.push({ x: 7 + r() * 3, y: 3.0 + gauss() * 0.7, c: C.blue }); }
    // Stable: x 4-7
    for (let i = 0; i < 200; i++) { pts.push({ x: 4 + r() * 3, y: 3.0 + gauss() * 0.7, c: C.grey }); }
    // At Risk: x 1-4
    for (let i = 0; i < 138; i++) { pts.push({ x: 1 + r() * 3, y: 3.0 + gauss() * 0.7, c: C.red }); }
    return pts.map(p => ({ ...p, y: Math.max(1, Math.min(5, p.y)), x: Math.max(1, Math.min(10, p.x)) }));
  }, []);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,5vw,80px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 20 }}>Workforce Heatmap: 498 Workers Visualized</h2>
      <div className="as" style={{ ...dl(600), position: "relative", width: "100%", height: 360, background: C.card, border: `1px solid ${C.border}`, borderRadius: 2 }}>
        {/* Axes */}
        <span style={{ position: "absolute", left: -32, top: "50%", transform: "rotate(-90deg) translateX(50%)", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>Capability Score (1-5)</span>
        <span style={{ position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)", fontSize: 12, color: C.muted }}>Displacement Direction Score (1-10)</span>
        {/* Grid lines */}
        {[1,2,3,4,5].map(v => <div key={v} style={{ position: "absolute", left: 40, right: 10, top: `${10 + (5 - v) * 68}px`, height: 1, background: `${C.white}06` }}><span style={{ position: "absolute", left: -28, top: -6, fontSize: 11, color: C.muted }}>{v}</span></div>)}
        {[1,2,3,4,5,6,7,8,9,10].map(v => <div key={v} style={{ position: "absolute", top: 10, bottom: 24, left: `${40 + (v - 1) * ((100 - 6) / 9)}%`, width: 1, background: `${C.white}06` }}><span style={{ position: "absolute", bottom: -16, left: -4, fontSize: 11, color: C.muted }}>{v}</span></div>)}
        {/* Zone labels */}
        <div style={{ position: "absolute", top: 14, left: 60, fontSize: 12, color: `${C.red}80`, fontWeight: 600 }}>AT RISK</div>
        <div style={{ position: "absolute", top: 14, left: "42%", fontSize: 12, color: `${C.grey}80`, fontWeight: 600 }}>STABLE</div>
        <div style={{ position: "absolute", top: 14, right: 40, fontSize: 12, color: `${C.blue}80`, fontWeight: 600 }}>RISING</div>
        {/* Dots */}
        {dots.map((dot, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${40 + ((dot.x - 1) / 9) * 90}%`,
            top: `${10 + ((5 - dot.y) / 4) * 310}px`,
            width: 5, height: 5, borderRadius: "50%",
            background: dot.c, opacity: active ? 0.7 : 0,
            transition: `opacity 800ms ease-out ${300 + (i % 60) * 15}ms`,
          }} />
        ))}
      </div>
      <div className="au" style={{ ...dl(1400), display: "flex", gap: 28, marginTop: 20, justifyContent: "center" }}>
        {[["164 Rising", C.blue], ["199 Stable", C.grey], ["135 At Risk", C.red]].map(([l, c], i) => (
          <span key={i} className="rl-mono" style={{ fontSize: 16, color: c, fontWeight: 500 }}>{l}</span>
        ))}
      </div>
      <p className="af" style={{ ...dl(1800), fontSize: 14, color: C.muted, marginTop: 10 }}>Based on SA inference and MV data. Click any dot in the live platform to see that person's full diagnostic.</p>
    </div>
  );
};

/* ═══ SLIDE 10: PIPELINE ═══ */
const S10 = ({ active }) => {
  const steps = [
    ["Assessment Data Collected", "498 workers. SA + MV. Technical Assessment upcoming."],
    ["Displacement Direction Scoring", "Each worker scored 1-10."],
    ["Builder Core Identification", "Top candidates ranked by three criteria."],
    ["Cohort Design", "Grouped by gaps, geography, multiplier potential."],
    ["Personalized Curriculum Generation", "No two programs are the same."],
    ["Mentor Matching", "Practitioners matched to diagnostic profiles."],
    ["Business Case Scoping", "Capstones target real workflow inefficiencies."],
    ["Outcome Measurement", "Actual impact against assessment baselines."],
    ["Model Improvement", "Every cycle makes the next one smarter."],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 20, alignSelf: "flex-start" }}>From Assessment to Action</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%", maxWidth: 700 }}>
        {steps.map(([t, d], i) => (
          <div key={i}>
            <div className="al" style={{ ...dl(300 + i * 150), display: "flex", alignItems: "center", gap: 16, padding: "8px 16px", background: active && i <= Math.floor((Date.now() / 300) % 20) ? C.card : C.card, border: `1px solid ${C.border}`, borderRadius: 2 }}>
              <span className="rl-mono" style={{ fontSize: 14, color: C.muted, width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.white, width: 260 }}>{t}</span>
              <span style={{ fontSize: 15, color: C.sec }}>{d}</span>
            </div>
            {i < steps.length - 1 && <div className="af" style={{ ...dl(350 + i * 150), width: 1, height: 8, background: C.border, marginLeft: 24 }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══ SLIDE 11: DATA MOAT ═══ */
const S11 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
    <Header />
    <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(32px,3.2vw,46px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 28 }}>Why No Competitor Can Replicate This</h2>
    <p className="au" style={{ ...dl(600), fontSize: 18, color: C.text, lineHeight: 1.8, maxWidth: 600 }}>The assessment was the precursor to everything in this proposal.</p>
    <p className="au" style={{ ...dl(800), fontSize: 18, color: C.text, lineHeight: 1.8, marginTop: 16, maxWidth: 600 }}>Every training path, every cohort selection, every mentor match, every business outcome projection is built from Sagicor's own workforce data.</p>
    <p className="au" style={{ ...dl(1000), fontSize: 18, color: C.text, lineHeight: 1.8, marginTop: 16, maxWidth: 600 }}>Any vendor who wants to compete must first replicate the assessment. That means starting four months behind.</p>
    <p className="au" style={{ ...dl(1400), fontSize: 23, fontWeight: 700, color: C.white, marginTop: 36, maxWidth: 600 }}>THCO is not asking Sagicor to start over. THCO is asking Sagicor to activate the data it already owns.</p>
  </div>
);

/* ═══ SLIDE 12: BUILDER CORE INTRO ═══ */
const S12 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
    <Header />
    <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(32px,3.2vw,46px)", fontWeight: 700, marginBottom: 24 }}>Identifying Who to Invest In First</h2>
    <p className="au" style={{ ...dl(600), fontSize: 18, color: C.text, lineHeight: 1.8, maxWidth: 580 }}>Not everyone should go through intensive training at the same time. The first cohort should be the people with the highest return on investment.</p>
    <p className="au" style={{ ...dl(900), fontSize: 18, color: C.text, lineHeight: 1.8, marginTop: 16, maxWidth: 580 }}>We identified the builder core using three quantitative signals from the assessment data.</p>
    <p className="af" style={{ ...dl(1300), fontSize: 14, color: C.muted, marginTop: 28 }}>Current rankings based on Self-Assessment and Manager Validation data. Will be refined as Technical Assessment completes.</p>
  </div>
);

/* ═══ SLIDE 13: SELECTION CRITERIA ═══ */
const S13 = () => {
  const cards = [
    { t: "Manager Validation", d: "We prioritized individuals whose direct managers independently rated them highest and classified them as Core Builders. Organizational confirmation of capability." },
    { t: "Self-Awareness", d: "Workers who rate themselves lower than their managers rate them (humble performers) demonstrate stronger learning outcomes. They absorb feedback. They do not waste investment." },
    { t: "Strategic Role Relevance", d: "We prioritized roles on the critical path of AI deployment: data analytics, infrastructure, application modernization, enterprise risk, systems architecture." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>Three Criteria. All From the Data.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {cards.map((c, i) => (
          <DataCard key={i} delay={500 + i * 300}>
            <p style={{ fontSize: 18, fontWeight: 600, color: C.white, marginBottom: 12 }}>{c.t}</p>
            <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.7 }}>{c.d}</p>
          </DataCard>
        ))}
      </div>
      <p className="au rl-mono" style={{ ...dl(1600), fontSize: 15, color: C.sec, marginTop: 24 }}>Composite Score = (SA Average x 0.30) + (MV Average x 0.50) + (Strategic Fit x 0.20)</p>
    </div>
  );
};

/* ═══ BUILDER CARD COMPONENT ═══ */
const BuilderCard = ({ rank, name, role, sa, mv, comp, gap, gapLabel, gapColor, desc, delay = 0 }) => (
  <DataCard delay={delay} style={{ borderTop: `2px solid ${C.border}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
      <span className="rl-mono" style={{ fontSize: 14, color: C.muted }}>#{rank}</span>
      <span style={{ fontSize: 12, color: gapColor, padding: "2px 8px", border: `1px solid ${gapColor}40`, borderRadius: 2 }}>{gapLabel}</span>
    </div>
    <p style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 4 }}>{name}</p>
    <p style={{ fontSize: 14, color: C.sec, marginBottom: 12 }}>{role}</p>
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      {[["SA", sa], ["MV", mv], ["Comp", comp], ["Gap", gap]].map(([l, v], i) => (
        <div key={i}>
          <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase" }}>{l}</span>
          <p className="rl-mono" style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{v}</p>
        </div>
      ))}
    </div>
    <p style={{ fontSize: 15, color: C.sec, lineHeight: 1.6 }}>{desc}</p>
  </DataCard>
);

/* ═══ SLIDE 14: BUILDER CORE 1-3 ═══ */
const S14 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,5vw,80px)", position: "relative" }}>
    <Header />
    <Badge text="BUILDER CORE" delay={200} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <BuilderCard rank={1} name="Eugene McDermott" role="BCM Specialist, IT Risk and Security, Canada" sa="4.62" mv="4.83" comp="4.65" gap="-0.21" gapLabel="Slight Under-rater" gapColor={C.blue} desc="Highest MV score in the entire pool. Manager describes him operating with very little guidance. Received quarterly Award of Excellence. Enterprise-wide BCM expertise." delay={400} />
      <BuilderCard rank={2} name="Helen (Hua) Xia" role="Manager, Corporate Systems, Canada" sa="4.55" mv="4.50" comp="4.32" gap="0.05" gapLabel="Well-calibrated" gapColor={C.grey} desc="Most accurately self-aware candidate (gap 0.05). People manager, training cascades to direct reports. Led IFRS17 system solution. Manager endorses 'AI training.'" delay={650} />
      <BuilderCard rank={3} name="Carol Blackwood" role="Sr Business Systems Specialist, Data Analytics, Canada" sa="3.97" mv="4.33" comp="4.06" gap="-0.36" gapLabel="Slight Under-rater" gapColor={C.blue} desc="Manager rates her higher than she rates herself. Data analytics department, directly on the AI critical path. Requests 'a mentee or successor to develop.' Knowledge-sharing behavior." delay={900} />
    </div>
  </div>
);

/* ═══ SLIDE 15: BUILDER CORE 4-6 ═══ */
const S15 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,5vw,80px)", position: "relative" }}>
    <Header />
    <Badge text="BUILDER CORE" delay={200} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <BuilderCard rank={4} name="Anna (YueHua) Chen" role="Technical Lead, Application Modernization, Canada" sa="4.05" mv="4.17" comp="4.05" gap="-0.12" gapLabel="Well-calibrated" gapColor={C.grey} desc="Manager explicitly endorses for 'leading the new AI-driven development.' Technical Lead for Application Modernization. Creates documentation and encourages developers to follow same practice." delay={400} />
      <BuilderCard rank={5} name="Clarence Chai" role="Sr Systems Specialist, Data Analytics, Canada" sa="4.37" mv="4.00" comp="3.93" gap="0.37" gapLabel="Slight Over-rater" gapColor={C.amber} desc="Already actively building Azure and Fabric expertise. Creating solution architecture diagrams. Aspiration aligns perfectly: 'Cloud data platforms, Python, ETL modernization.' Self-directing toward AI." delay={650} />
      <BuilderCard rank={6} name="Karen McCulloch" role="Sr Business Systems Specialist, Corporate Systems, Canada" sa="3.01" mv="4.43" comp="3.92" gap="-1.42" gapLabel="Significant Under-rater" gapColor={C.blue} desc="Largest positive gap in the pool. Classic hidden talent. Submitted 184 SA responses, the most detailed in the entire assessment. 20+ years of system conversion experience. Manager rates her 4.43 while she rates herself 3.01." delay={900} />
    </div>
  </div>
);

/* ═══ SLIDE 16: BUILDER CORE 7-10 ═══ */
const S16 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,5vw,80px)", position: "relative" }}>
    <Header />
    <Badge text="BUILDER CORE" delay={200} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <BuilderCard rank={7} name="Ben Wong" role="Sr Enterprise Architect Lead, Data Analytics, Canada" sa="3.60" mv="4.00" comp="3.88" gap="-0.40" gapLabel="Slight Under-rater" gapColor={C.blue} desc="Sought-after across IT and business. Manager endorses 'Agentic AI software development.' Aspires to CTO. Career spans HBC, Manulife, Canada Life." delay={400} />
      <BuilderCard rank={8} name="Aftab Siddiqi" role="Sr Business Systems Specialist, JDE, Corporate Systems, Canada" sa="4.41" mv="3.83" comp="3.84" gap="0.58" gapLabel="Over-rater" gapColor={C.amber} desc="Deep JDE, Oracle, SAP, SQL expertise. Designed IFRS dual reporting structure. Over-rating gap to be addressed through mentor coaching." delay={600} />
      <BuilderCard rank={9} name="Allan (Xin Long) Yu" role="Sr Network Analyst, Infrastructure, Canada" sa="4.07" mv="3.83" comp="3.79" gap="0.24" gapLabel="Slight Over-rater" gapColor={C.amber} desc="Network architecture, firewall, VPN, AWS/Azure cloud integration. Documentation described as 'invaluable to the team.' AI deployment requires robust network infrastructure." delay={800} />
      <BuilderCard rank={10} name="Ivan (Ho Wai) Tang" role="Inter Business Systems Analyst, Web Services, Canada" sa="4.27" mv="3.83" comp="3.75" gap="0.44" gapLabel="Slight Over-rater" gapColor={C.amber} desc="Already Scrum Master for Sense.AI team. Manager endorses 'advancing AI and eForm capabilities.' Built EasySend implementation end-to-end. Embedded in Sagicor's AI initiative." delay={1000} />
    </div>
  </div>
);

/* ═══ SLIDE 17: BUILDER CORE COMPOSITION ═══ */
const S17 = () => (
  <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 clamp(40px,6vw,100px)", gap: 40, position: "relative" }}>
    <Header />
    <div style={{ flex: 1 }}>
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 20 }}>Builder Core Composition</h2>
      <div className="au" style={{ ...dl(500), marginBottom: 16 }}>
        <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.7 }}>From 51 employees with both SA and MV data complete</p>
        <p style={{ fontSize: 16, color: C.white, fontWeight: 600, marginTop: 8 }}>Top 10: Canada (10)</p>
        <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.7, marginTop: 8 }}>Jamaica appears from rank 11: Charis Pringle, Shanakaye Ferguson, Carllel Colquhoun, Damion Case, Tatianna Thomas-Hill, Shona Richards</p>
        <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.7, marginTop: 8 }}>Barbados, USA: No candidates with both SA + MV complete yet</p>
      </div>
    </div>
    <DataCard delay={800} style={{ width: 360 }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 14 }}>What Changes as More Data Arrives</p>
      {[
        ["More MV from Caribbean", "Caribbean candidates enter top 20"],
        ["Technical Assessment", "Objective capability, may reorder rankings"],
        ["Hands On Simulation", "Applied problem-solving, may surface hidden talent"],
      ].map(([phase, impact], i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 15, color: C.white, fontWeight: 500, width: 160 }}>{phase}</span>
          <span style={{ fontSize: 15, color: C.sec }}>{impact}</span>
        </div>
      ))}
      <p style={{ fontSize: 14, color: C.muted, marginTop: 12 }}>Full top 20 list with diagnostic profiles provided as separate deliverable.</p>
    </DataCard>
  </div>
);

/* ═══ SLIDE 18: MULTIPLIER EFFECT ═══ */
const S18 = () => {
  const leaders = [
    ["Charis Pringle", "Manager, Technical Systems, Jamaica", "6+ developers"],
    ["Anna Chen", "Technical Lead, Modernization, Canada", "Modernization team"],
    ["Helen Xia", "Manager, Corporate Systems, Canada", "Direct reports"],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>Training 20 People. Impacting 60+.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
        {leaders.map(([name, role, impact], i) => (
          <DataCard key={i} delay={500 + i * 250}>
            <p style={{ fontSize: 17, fontWeight: 600, color: C.white, marginBottom: 4 }}>{name}</p>
            <p style={{ fontSize: 14, color: C.sec, marginBottom: 12 }}>{role}</p>
            <p style={{ fontSize: 16, color: C.blue }}>{impact}</p>
          </DataCard>
        ))}
      </div>
      <p className="au" style={{ ...dl(1300), fontSize: 18, fontWeight: 700, color: C.white }}>Conservative estimate: Training 20 people directly impacts 40-60 through knowledge transfer.</p>
    </div>
  );
};

/* ═══ SLIDE 19: RETENTION ═══ */
const S19 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
    <Header />
    <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(32px,3.2vw,46px)", fontWeight: 700, marginBottom: 24 }}>This Is Also a Retention Strategy</h2>
    <p className="au" style={{ ...dl(600), fontSize: 18, color: C.text, lineHeight: 1.8, maxWidth: 560 }}>Top technology talent is being actively recruited by consulting firms and competitors.</p>
    <p className="au" style={{ ...dl(800), fontSize: 18, color: C.text, lineHeight: 1.8, marginTop: 16, maxWidth: 560 }}>At least one Sagicor team member has already been recruited away.</p>
    <p className="au" style={{ ...dl(1000), fontSize: 18, color: C.text, lineHeight: 1.8, marginTop: 16, maxWidth: 560 }}>A personalized development program with access to practitioners from Meta, McKinsey, OpenAI, and leading banks sends a clear signal:</p>
    <p className="au" style={{ ...dl(1400), fontSize: 28, fontWeight: 700, color: C.white, marginTop: 28, maxWidth: 560 }}>"We see you. We are investing in you. Your future is here."</p>
  </div>
);

/* ═══ SLIDE 20: COMPARISON TABLE ═══ */
const S20 = () => {
  const rows = [
    ["Discovery", "3-6 months", "None (generic)", "Already complete"],
    ["Assessment data", "Survey/interviews", "None", "498 workers, task-level"],
    ["Personalization", "Cohort-level", "None", "Individual-level"],
    ["Curriculum basis", "Consultant opinion", "Vendor products", "Sagicor's own data"],
    ["Who teaches", "Junior consultants", "Certified trainers", "THCO AI professionals + 269 practitioners"],
    ["Platform", "PDF reports", "Vendor LMS", "Live enterprise dashboard"],
    ["Self-sufficiency", "Vendor dependency", "Vendor lock-in", "12-month path to independence"],
    ["Time to launch", "6-9 months", "2-3 months", "April 2026"],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,4vw,60px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 20 }}>How THCO + Realloc Compares</h2>
      <div className="au" style={{ ...dl(500) }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr 1fr", fontSize: 14 }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }} />
          {["Consulting Firm", "Technology Vendor", "THCO + Realloc"].map((h, i) => (
            <div key={i} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: i === 2 ? C.white : C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
          ))}
          {rows.map(([label, c1, c2, c3], i) => (<span key={i} style={{ display: "contents" }}>
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, color: C.sec, fontWeight: 500 }}>{label}</div>
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, color: C.muted }}>{c1}</div>
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, color: C.muted }}>{c2}</div>
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, color: C.white, fontWeight: 500 }}>{c3}</div>
          </span>))}
        </div>
      </div>
    </div>
  );
};

/* ═══ SLIDE 21: THREE-LAYER MODEL ═══ */
const S21 = () => {
  const layers = [
    { t: "THCO AI PROFESSIONALS", d: "Design curriculum. Facilitate boot camp. Deliver practitioner briefings. Lead group sessions. The team that has been working with Sagicor's data for four months.", bc: C.white },
    { t: "REALLOC PLATFORM", d: "Analyze assessment data. Generate personalized curricula. Recommend capstone topics. Track progress. Produce board reports. The intelligence engine.", bc: C.blue },
    { t: "EXPERT MENTOR COMMUNITY", d: "269 practitioners from Meta, McKinsey, OpenAI, NVIDIA, Morgan Stanley. Review every submission. Available for 1-on-1 sessions. Enforce production-quality standards.", bc: C.sec },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 28 }}>Three Layers. One System. All Connected by Data.</h2>
      {layers.map((l, i) => (
        <DataCard key={i} delay={500 + i * 350} style={{ marginBottom: 12, borderTop: `2px solid ${l.bc}` }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 6, letterSpacing: "0.04em" }}>{l.t}</p>
          <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.7 }}>{l.d}</p>
        </DataCard>
      ))}
      <p className="au" style={{ ...dl(1800), fontSize: 17, fontWeight: 600, color: C.sec, marginTop: 12 }}>THCO teaches. Realloc prescribes. The Expert Community mentors.</p>
    </div>
  );
};

/* ═══ SLIDE 22: HOW LAYERS WORK TOGETHER ═══ */
const S22 = () => {
  const rows = [
    ["THCO AI Professionals", "Teach", "\"Here is how AI architecture patterns work in enterprise financial services.\""],
    ["Realloc Platform", "Prescribe", "\"Based on your assessment, your primary gap is AI deployment. Your program weights Production AI at 25%.\""],
    ["Expert Mentor Community", "Quality Control", "\"Your architecture needs a circuit breaker pattern. At Meta we learned this the hard way.\""],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 24 }}>How the Three Layers Work Together</h2>
      {rows.map(([layer, role, ex], i) => (
        <DataCard key={i} delay={500 + i * 350} style={{ marginBottom: 12, display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 200, flexShrink: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.white }}>{layer}</p>
            <p style={{ fontSize: 14, color: C.blue, marginTop: 2 }}>{role}</p>
          </div>
          <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.6, fontStyle: "italic" }}>{ex}</p>
        </DataCard>
      ))}
      <p className="au" style={{ ...dl(1700), fontSize: 16, color: C.sec, lineHeight: 1.7, marginTop: 12, maxWidth: 600 }}>No other provider has all three layers. A consulting firm has people but no diagnostic platform. A technology vendor has a platform but no practitioner community. A training company has content but no assessment data.</p>
    </div>
  );
};

/* ═══ SLIDE 23: EXPERT QUOTE ═══ */
const S23 = () => (
  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(40px,10vw,200px)", position: "relative" }}>
    <Header />
    <p className="au rl-pf" style={{ ...dl(600), fontSize: "clamp(24px,2.4vw,32px)", fontWeight: 400, fontStyle: "italic", color: C.white, lineHeight: 1.6, textAlign: "center", maxWidth: 700 }}>
      "The person reviewing your team's work is not a junior consultant. They are a practitioner who has built exactly what Sagicor needs to build."
    </p>
  </div>
);

/* ═══ SLIDE 24: EXPERT COMMUNITY NUMBERS ═══ */
const S24 = ({ active }) => {
  const v = useCount(269, active, 800, 400);
  const data = [
    ["Leading Tech", "Meta, NVIDIA, OpenAI, xAI, IBM, SAP, AWS, McKinsey, Snorkel AI"],
    ["Financial Services", "Morgan Stanley, Bank of America, American Express, Northern Trust, CPP Investments"],
    ["Doctoral Researchers", "23 (ML, NLP, AI safety, computational science)"],
    ["Senior/Lead/Architect", "70+"],
    ["Based in Canada", "108"],
    ["Based in USA", "93"],
  ];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 clamp(40px,6vw,100px)", gap: 40, position: "relative" }}>
      <Header />
      <div style={{ flex: "0 0 auto" }}>
        <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700 }}>
          <span className="rl-mono" style={{ fontSize: 54 }}>{v}</span><br />Vetted AI Practitioners
        </h2>
      </div>
      <div style={{ flex: 1 }}>
        {data.map(([cat, detail], i) => (
          <div key={i} className="al" style={{ ...dl(500 + i * 150), display: "flex", gap: 16, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.white, width: 180, flexShrink: 0 }}>{cat}</span>
            <span style={{ fontSize: 15, color: C.sec }}>{detail}</span>
          </div>
        ))}
        <p className="af" style={{ ...dl(1600), fontSize: 15, color: C.muted, marginTop: 16 }}>These are not career trainers. They are active practitioners who build, deploy, and maintain AI systems in production.</p>
      </div>
    </div>
  );
};

/* ═══ SLIDE 25: MENTOR MATCHING ═══ */
const S25 = () => {
  const matches = [
    ["Gap: AI integration for legacy modernization", "Built AI workflow tools at Meta for 3,000+ engineers"],
    ["Gap: Infrastructure readiness for AI", "Deployed production AI on Azure for tier-1 Canadian bank"],
    ["Gap: AI agent design and prompt engineering", "Developed LLM applications at OpenAI"],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 28 }}>Assessment Data Drives Mentor Assignment</h2>
      {matches.map(([gap, mentor], i) => (
        <div key={i} className="au" style={{ ...dl(500 + i * 350), display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div className="rl-card" style={{ flex: 1, padding: "16px 20px" }}>
            <p style={{ fontSize: 16, color: C.sec }}>{gap}</p>
          </div>
          <ChevronRight size={16} color={C.blue} />
          <div className="rl-card" style={{ flex: 1, padding: "16px 20px", borderColor: `${C.blue}30` }}>
            <p style={{ fontSize: 16, color: C.white }}>{mentor}</p>
          </div>
        </div>
      ))}
      <p className="af" style={{ ...dl(1800), fontSize: 16, fontWeight: 600, color: C.sec, marginTop: 12 }}>This matching is impossible without the assessment data.</p>
    </div>
  );
};

/* ═══ SLIDE 26: PLATFORM OVERVIEW ═══ */
const S26 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
    <Header />
    <h2 className="au rl-pf" style={{ ...dl(300), fontSize: "clamp(32px,3.2vw,48px)", fontWeight: 700, lineHeight: 1.2 }}>One Platform. Three Views.<br />Connected by Data.</h2>
    <p className="au" style={{ ...dl(800), fontSize: 18, color: C.sec, marginTop: 16 }}>This is not a PDF report. It is live enterprise infrastructure.</p>
  </div>
);

/* ═══ SLIDE 27: LEADERSHIP VIEW ═══ */
const S27 = ({ active }) => {
  const w = useCount(498, active, 800, 800);
  const features = ["Workforce Heatmap: 498 workers visualized by displacement direction", "Builder Core Rankings: top candidates with data visible", "ROI Projection: cost to retrain vs. replace", "Risk Reduction Trend: at-risk declining, rising increasing", "Board Report Generator: one click, downloadable PDF"];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 clamp(40px,5vw,80px)", gap: 32, position: "relative" }}>
      <Header />
      <div style={{ flex: 1 }}>
        <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 20 }}>What Sagicor Leadership Sees</h2>
        {features.map((f, i) => (
          <div key={i} className="al" style={{ ...dl(400 + i * 200), display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 16, color: C.sec }}>-</span>
            <span style={{ fontSize: 16, color: C.text, lineHeight: 1.6 }}>{f}</span>
          </div>
        ))}
      </div>
      <div className="as rl-card" style={{ ...dl(800), width: 380, padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[["498", "Workers"], ["6", "Countries"], ["1", "Active Cohort"], ["73%", "Completion"]].map(([v, l], i) => (
            <div key={i} style={{ background: `${C.white}06`, padding: "12px", borderRadius: 2 }}>
              <span className="rl-mono" style={{ fontSize: 23, fontWeight: 700, color: C.white }}>{v}</span>
              <p style={{ fontSize: 12, color: C.sec, marginTop: 2 }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", height: 24, borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: "32%", background: C.blue, transition: "width 1s ease-out" }} />
          <div style={{ width: "41%", background: C.grey }} />
          <div style={{ width: "27%", background: C.red }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sec }}>
          <span>32% Rising</span><span>41% Stable</span><span>27% At Risk</span>
        </div>
      </div>
    </div>
  );
};

/* ═══ SLIDE 28: ROI DATA ═══ */
const S28 = ({ active }) => {
  const retrain = useCount(168000, active, 1200, 600);
  const replace = useCount(2030000, active, 1200, 800);
  const savings = useCount(1862000, active, 1200, 1200);
  const fmt = (n) => "$" + n.toLocaleString();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 32 }}>The Business Case</h2>
      <div style={{ display: "flex", gap: 40, alignItems: "center", marginBottom: 28 }}>
        <DataCard delay={500} style={{ textAlign: "center", padding: "28px 36px" }}>
          <p style={{ fontSize: 14, color: C.sec, textTransform: "uppercase", marginBottom: 8 }}>Cost to Retrain</p>
          <span className="rl-mono" style={{ fontSize: 42, fontWeight: 700, color: C.white }}>{fmt(retrain)}</span>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>14 workers x $12,000</p>
        </DataCard>
        <DataCard delay={700} style={{ textAlign: "center", padding: "28px 36px", borderColor: `${C.red}30` }}>
          <p style={{ fontSize: 14, color: C.sec, textTransform: "uppercase", marginBottom: 8 }}>Cost to Replace</p>
          <span className="rl-mono" style={{ fontSize: 42, fontWeight: 700, color: C.red }}>{fmt(replace)}</span>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>14 workers x $145,000</p>
        </DataCard>
      </div>
      <div className="au" style={{ ...dl(1000), textAlign: "center" }}>
        <p style={{ fontSize: 14, color: C.sec, textTransform: "uppercase", marginBottom: 4 }}>Projected Annual Savings</p>
        <span className="rl-mono" style={{ fontSize: 54, fontWeight: 700, color: C.green }}>{fmt(savings)}</span>
      </div>
      <div className="au" style={{ ...dl(1500), display: "flex", gap: 20, marginTop: 24 }}>
        {[["120", "Hours Reclaimed/Week"], ["35%", "Speed Improvement"], ["95%+", "Actionable Development Plans"]].map(([v, l], i) => (
          <div key={i} className="rl-card" style={{ padding: "16px 20px", textAlign: "center" }}>
            <span className="rl-mono" style={{ fontSize: 26, fontWeight: 700, color: C.white }}>{v}</span>
            <p style={{ fontSize: 13, color: C.sec, marginTop: 4 }}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══ SLIDE 29: PARTICIPANT VIEW ═══ */
const S29 = () => {
  const features = ["Personal Diagnostic: displacement score, task decomposition", "AI Readiness Score: animated circular gauge", "Skill Profile Radar: six dimensions, before and after", "Personalized Learning Path: four weighted domains", "Mentor Connection: book 1-on-1 sessions, view feedback", "Cohort Community: activity feed, Q&A, peer collaboration"];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 clamp(40px,5vw,80px)", gap: 32, position: "relative" }}>
      <Header />
      <div style={{ flex: 1 }}>
        <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 20 }}>What Your People See</h2>
        {features.map((f, i) => (
          <div key={i} className="al" style={{ ...dl(400 + i * 150), display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 16, color: C.sec }}>-</span>
            <span style={{ fontSize: 16, color: C.text, lineHeight: 1.6 }}>{f}</span>
          </div>
        ))}
      </div>
      <div className="as rl-card" style={{ ...dl(800), width: 320, padding: 20 }}>
        {/* AI Readiness Ring */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ margin: "0 auto", display: "block" }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke={`${C.white}10`} strokeWidth="6" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={C.blue} strokeWidth="6" strokeDasharray="251" strokeDashoffset="170" strokeLinecap="round" transform="rotate(-90 50 50)" />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill={C.white} fontFamily="'JetBrains Mono'" fontSize="20" fontWeight="700">32%</text>
          </svg>
          <p style={{ fontSize: 12, color: C.sec, marginTop: 4 }}>AI Readiness Score</p>
        </div>
        {/* Domain progress */}
        {[["Production AI", 25], ["AI Architecture", 35], ["Data Engineering", 25], ["Capstone", 15]].map(([l, v], i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sec, marginBottom: 3 }}>
              <span>{l}</span><span>{v}%</span>
            </div>
            <div style={{ height: 4, background: `${C.white}10`, borderRadius: 1 }}>
              <div style={{ height: "100%", width: `${v}%`, background: C.blue, borderRadius: 1 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══ SLIDE 30: INDIVIDUAL DIAGNOSTIC ═══ */
const S30 = () => {
  const tasks = [
    ["Legacy code refactoring", "Automates Easy Part", "Rising", C.blue],
    ["Architecture design", "Minimal Impact", "Stable", C.grey],
    ["Team mentoring", "Minimal Impact", "Stable", C.grey],
    ["Test writing", "Automates Easy Part", "Rising", C.blue],
    ["Documentation", "Automates Easy Part", "Rising", C.blue],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,4vw,60px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 20 }}>Every Worker. Fully Diagnosed.</h2>
      <div style={{ display: "flex", gap: 24 }}>
        {/* Displacement Gauge */}
        <DataCard delay={500} style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: C.sec, textTransform: "uppercase", marginBottom: 12 }}>Displacement Direction</p>
          <div style={{ height: 20, borderRadius: 2, background: `linear-gradient(90deg, ${C.red}, ${C.grey}, ${C.blue})`, position: "relative", marginBottom: 8 }}>
            <div style={{ position: "absolute", top: -4, left: "68%", width: 3, height: 28, background: C.white, borderRadius: 1 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
            <span>Commoditizing</span><span>Specializing</span>
          </div>
        </DataCard>
        {/* Growth Radar */}
        <DataCard delay={700} style={{ width: 200, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.sec, textTransform: "uppercase", marginBottom: 8 }}>Growth Radar</p>
          <svg width="140" height="120" viewBox="0 0 140 120" style={{ margin: "0 auto" }}>
            {[0,1,2,3,4,5].map(i => { const a = (Math.PI * 2 * i) / 6 - Math.PI/2; return <line key={i} x1="70" y1="60" x2={70+Math.cos(a)*45} y2={60+Math.sin(a)*45} stroke={`${C.white}10`} />; })}
            <polygon points={[0,1,2,3,4,5].map(i => { const a = (Math.PI * 2 * i) / 6 - Math.PI/2; const r = [30,25,35,20,28,32][i]; return `${70+Math.cos(a)*r},${60+Math.sin(a)*r}`; }).join(" ")} fill={`${C.blue}20`} stroke={C.blue} strokeWidth="1.5" />
            <polygon points={[0,1,2,3,4,5].map(i => { const a = (Math.PI * 2 * i) / 6 - Math.PI/2; const r = [22,18,25,15,20,24][i]; return `${70+Math.cos(a)*r},${60+Math.sin(a)*r}`; }).join(" ")} fill="none" stroke={`${C.white}30`} strokeWidth="1" strokeDasharray="3" />
          </svg>
        </DataCard>
      </div>
      {/* Task Table */}
      <DataCard delay={1000} style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 0, fontSize: 15 }}>
          <div style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Task</div>
          <div style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>AI Impact</div>
          <div style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Direction</div>
          {tasks.map(([t, imp, dir, col], i) => (<span key={i} style={{ display: "contents" }}>
            <div style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, color: C.text }}>{t}</div>
            <div style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, color: C.sec }}>{imp}</div>
            <div style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, color: col, fontWeight: 600 }}>{dir}</div>
          </span>))}
        </div>
      </DataCard>
      <p className="af" style={{ ...dl(1500), fontSize: 15, color: C.muted, marginTop: 10 }}>When a board member asks "show me one specific person," this is the page you open.</p>
    </div>
  );
};

/* ═══ SLIDE 31: PROGRAM OVERVIEW ═══ */
const S31 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
    <Header />
    <h2 className="au rl-pf" style={{ ...dl(400), fontSize: "clamp(36px,3.8vw,50px)", fontWeight: 700, lineHeight: 1.2 }}>12 Weeks. Personalized.<br />Mentored. Measured.</h2>
  </div>
);

/* ═══ SLIDE 32: PROGRAM STRUCTURE ═══ */
const S32 = () => {
  const blocks = [
    { t: "BOOT CAMP", w: "Week 1, Barbados, In-Person", d: "Foundations. Team formation. Business case workshop. Meet mentors." },
    { t: "PERSONALIZED DOMAINS", w: "Weeks 2-8, Realloc Platform", d: "Each participant follows their own curriculum. Weekly builds. Mentor reviews." },
    { t: "CAPSTONE SPRINT", w: "Weeks 9-11", d: "Build and deploy a real AI solution inside Sagicor." },
    { t: "MEASUREMENT", w: "Week 12 + 30 Days", d: "Deploy to production. Measure actual impact. Board report." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>The 12-Week Journey</h2>
      <div style={{ display: "flex", gap: 0, position: "relative" }}>
        <div className="af" style={{ ...dl(400), position: "absolute", top: 20, left: 0, right: 0, height: 1, background: C.border }} />
        {blocks.map((b, i) => (
          <div key={i} className="au" style={{ ...dl(500 + i * 350), flex: 1, position: "relative", paddingTop: 32 }}>
            <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: i === 0 ? C.white : C.card, border: `2px solid ${C.white}`, zIndex: 2 }} />
            <div className="rl-card" style={{ margin: "0 6px", padding: "16px 14px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.white, letterSpacing: "0.06em", marginBottom: 6 }}>{b.t}</p>
              <p style={{ fontSize: 13, color: C.blue, marginBottom: 8 }}>{b.w}</p>
              <p style={{ fontSize: 15, color: C.sec, lineHeight: 1.6 }}>{b.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══ SLIDE 33: PERSONALIZATION ═══ */
const S33 = () => {
  const a = [["AI-Augmented Architecture Design", "35%"], ["Production AI Deployment", "25%"], ["AI Workflow Automation", "25%"], ["Capstone", "15%"]];
  const b = [["Data Architecture for AI Systems", "35%"], ["AI-Augmented Data Engineering", "25%"], ["Data Governance for AI", "25%"], ["Capstone", "15%"]];
  const Table = ({ data, title, delay }) => (
    <DataCard delay={delay}>
      <p style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 14 }}>{title}</p>
      {data.map(([d, w], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 15, color: C.sec }}>{d}</span>
          <span className="rl-mono" style={{ fontSize: 15, color: C.white, fontWeight: 700 }}>{w}</span>
        </div>
      ))}
    </DataCard>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>No Two Programs Are the Same</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Table data={a} title="Participant A: Technical Lead" delay={500} />
        <Table data={b} title="Participant B: Data Architect" delay={700} />
      </div>
      <p className="au" style={{ ...dl(1200), fontSize: 17, fontWeight: 700, color: C.white, marginTop: 24 }}>Same cohort. Same boot camp. Same mentors. Fundamentally different programs. Because the assessment identified different gaps.</p>
    </div>
  );
};

/* ═══ SLIDE 34: WEEKLY RHYTHM ═══ */
const S34 = () => {
  const days = [
    ["Monday", "New module unlocks. Practitioner briefing. Resources. Scenario."],
    ["Tue-Thu", "Participant builds. Cohort Q&A. Peer and mentor responses."],
    ["Friday", "Submission through platform."],
    ["Next Week", "Mentor reviews with written feedback. 1-on-1 sessions available."],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 24 }}>How Each Week Works</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {days.map((d, i) => (
          <DataCard key={i} delay={400 + i * 250} style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 6 }}>{d[0]}</p>
            <p style={{ fontSize: 15, color: C.sec, lineHeight: 1.6 }}>{d[1]}</p>
          </DataCard>
        ))}
      </div>
      <DataCard delay={1400} style={{ borderLeft: `2px solid ${C.blue}`, maxWidth: 600 }}>
        <p style={{ fontSize: 16, color: C.text, fontStyle: "italic", lineHeight: 1.7 }}>"This module addresses your identified growth area: AI integration for modernization workflows. Your assessment showed strength in architecture with a gap in prompt engineering."</p>
      </DataCard>
      <p className="af" style={{ ...dl(1800), fontSize: 16, color: C.sec, marginTop: 16 }}>The participant always knows WHY they are learning what they are learning.</p>
    </div>
  );
};

/* ═══ SLIDE 35: CAPSTONE ═══ */
const S35 = () => {
  const fields = ["Problem being solved", "Current state: hours, cost, error rate", "Proposed AI solution", "Outcome category: Revenue / Cost / Quality / Speed", "Projected measurable impact"];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 clamp(40px,6vw,100px)", gap: 32, position: "relative" }}>
      <Header />
      <div style={{ flex: 1 }}>
        <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 16 }}>Every Capstone Targets Real Business Value</h2>
        <p className="au" style={{ ...dl(500), fontSize: 17, color: C.text, lineHeight: 1.7 }}>Before building, each participant submits a structured business case:</p>
      </div>
      <DataCard delay={700} style={{ width: 360 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.sec, textTransform: "uppercase", marginBottom: 14 }}>Business Case Form</p>
        {fields.map((f, i) => (
          <div key={i} style={{ padding: "10px 12px", marginBottom: 6, background: `${C.white}04`, border: `1px solid ${C.border}`, borderRadius: 2 }}>
            <span style={{ fontSize: 14, color: C.sec }}>{f}</span>
          </div>
        ))}
        <p style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>The Realloc platform suggests capstone topics from the participant's task decomposition. The data scopes the opportunity.</p>
      </DataCard>
    </div>
  );
};

/* ═══ SLIDE 36: BUSINESS OUTCOMES ═══ */
const S36 = () => {
  const cats = [
    ["Revenue Acceleration", "Serve more customers. Launch faster. Unlock new capabilities."],
    ["Cost Reduction", "Eliminate manual processes. Reduce dependency. Lower overhead."],
    ["Quality and Risk", "Reduce errors. Strengthen compliance. Improve decisions."],
    ["Speed and Capacity", "Same team, more volume. Compress cycles. Automate routine."],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 28 }}>Measured by Business Impact. Not Completion Rates.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
        {cats.map(([t, d], i) => (
          <DataCard key={i} delay={400 + i * 250} style={{ borderTop: `2px solid ${C.white}` }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: C.white, marginBottom: 10 }}>{t}</p>
            <p style={{ fontSize: 15, color: C.sec, lineHeight: 1.6 }}>{d}</p>
          </DataCard>
        ))}
      </div>
      <p className="af" style={{ ...dl(1600), fontSize: 16, color: C.sec, marginTop: 20 }}>Each project quantifies projected impact before deployment and measures actual impact 30 days after.</p>
    </div>
  );
};

/* ═══ SLIDE 37: RISK REDUCTION TREND ═══ */
const S37 = ({ active }) => {
  const months = ["Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"];
  const atRisk = [38, 35, 32, 29, 26, 24];
  const rising = [27, 28, 30, 31, 33, 34];
  const w = 700, h = 280, px = 60, py = 30;
  const x = (i) => px + (i / 5) * (w - px * 2);
  const yr = (v) => py + ((40 - v) / 20) * (h - py * 2);
  const pathR = rising.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${yr(v)}`).join(" ");
  const pathA = atRisk.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${yr(v)}`).join(" ");
  const areaR = `${pathR} L${x(5)},${h - py} L${x(0)},${h - py} Z`;
  const areaA = `${pathA} L${x(5)},${h - py} L${x(0)},${h - py} Z`;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 clamp(40px,5vw,80px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 20, alignSelf: "flex-start" }}>The Trend Line That Matters</h2>
      <svg className="as" style={{ ...dl(600) }} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Grid */}
        {[20, 25, 30, 35, 40].map(v => <line key={v} x1={px} y1={yr(v)} x2={w - px} y2={yr(v)} stroke={`${C.white}08`} />)}
        {[20, 25, 30, 35, 40].map(v => <text key={v} x={px - 8} y={yr(v) + 4} fill={C.muted} fontSize="12" textAnchor="end" fontFamily="'JetBrains Mono'">{v}%</text>)}
        {months.map((m, i) => <text key={i} x={x(i)} y={h - 8} fill={C.muted} fontSize="12" textAnchor="middle" fontFamily="'Inter'">{m}</text>)}
        {/* Areas */}
        <path d={areaA} fill={`${C.red}15`} opacity={active ? 1 : 0} style={{ transition: "opacity 1s ease-out 800ms" }} />
        <path d={areaR} fill={`${C.blue}15`} opacity={active ? 1 : 0} style={{ transition: "opacity 1s ease-out 800ms" }} />
        {/* Lines */}
        <path d={pathA} fill="none" stroke={C.red} strokeWidth="2" opacity={active ? 1 : 0} style={{ transition: "opacity 800ms ease-out 1000ms" }} />
        <path d={pathR} fill="none" stroke={C.blue} strokeWidth="2" opacity={active ? 1 : 0} style={{ transition: "opacity 800ms ease-out 1000ms" }} />
        {/* Labels */}
        <text x={x(5) + 8} y={yr(24)} fill={C.red} fontSize="13" fontFamily="'Inter'" fontWeight="600">At Risk {atRisk[5]}%</text>
        <text x={x(5) + 8} y={yr(34)} fill={C.blue} fontSize="13" fontFamily="'Inter'" fontWeight="600">Rising {rising[5]}%</text>
      </svg>
      <p className="af" style={{ ...dl(1600), fontSize: 16, color: C.sec, marginTop: 16, maxWidth: 600, textAlign: "center" }}>As the assessment and training program progresses, at-risk declines and rising increases. The widening gap is Sagicor's AI transformation in motion.</p>
    </div>
  );
};

/* ═══ SLIDE 38: BOARD REPORTING ═══ */
const S38 = () => {
  const items = [
    "Assessed 498 technology employees across six countries",
    "Identified displacement direction: ~32% rising, ~41% stable, ~27% at risk",
    "Selected builder core using data-driven criteria",
    "Deployed first AI training cohort in Q2 2026",
    "Each participant completed a personalized 12-week program",
    "Deployed AI solutions with measured business impact",
    "Projected annual savings of $1.8M+ from retraining vs. replacement",
    "95%+ of participants with actionable development plans",
    "On track for 4 cohorts in 2026",
    "Building toward self-sufficient AI Skills Development Center",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(28px,2.8vw,40px)", fontWeight: 700, marginBottom: 24 }}>What Sagicor Reports to the Board</h2>
      {items.map((it, i) => (
        <div key={i} className="al" style={{ ...dl(400 + i * 120), display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Check size={14} color={C.white} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 16, color: C.text, lineHeight: 1.5 }}>{it}</span>
        </div>
      ))}
      <p className="af" style={{ ...dl(1800), fontSize: 15, color: C.muted, marginTop: 16 }}>One-click board report from the Realloc platform. PDF. Ready for the CEO.</p>
    </div>
  );
};

/* ═══ SLIDE 39: SUSTAINABILITY ═══ */
const S39 = () => {
  const stages = [
    { t: "Cohort 1-2 (Q2-Q3 2026)", d: "Full THCO delivery via Realloc platform. Expert community mentors assigned. Sagicor builds familiarity." },
    { t: "Cohort 3-4 (Q4 2026 - Q1 2027)", d: "Transition begins. Sagicor hires internal AI capability lead. Trains through program. Becomes trainer of trainers." },
    { t: "2027 Onward", d: "Sagicor runs own cohorts on Realloc platform. Internal mentors certified. Realloc provides diagnostic intelligence." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>The Path to Self-Sufficiency</h2>
      {stages.map((s, i) => (
        <DataCard key={i} delay={500 + i * 400} style={{ marginBottom: 12, borderLeft: `2px solid ${i === 2 ? C.white : C.border}` }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 6 }}>{s.t}</p>
          <p style={{ fontSize: 16, color: C.sec, lineHeight: 1.7 }}>{s.d}</p>
        </DataCard>
      ))}
      <p className="au" style={{ ...dl(1800), fontSize: 18, fontWeight: 700, color: C.white, marginTop: 16 }}>12 months from vendor-dependent to self-sufficient.</p>
    </div>
  );
};

/* ═══ SLIDE 40: SKILLS DEV CENTER ═══ */
const S40 = () => {
  const spokes = [
    { l: "THCO (Expert Community)", a: 0 }, { l: "Technology Partners", a: 72 },
    { l: "Cloud Providers", a: 144 }, { l: "Implementation Partners", a: 216 },
    { l: "Certification Bodies", a: 288 },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>The Bigger Vision</h2>
      <div className="as" style={{ ...dl(600), position: "relative", width: 400, height: 400 }}>
        {/* Center hub */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 140, height: 140, borderRadius: "50%", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.card }}>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.1em" }}>REALLOC</span>
          <span style={{ fontSize: 11, color: C.sec, marginTop: 4, textAlign: "center" }}>Diagnostic and<br />Orchestration Layer</span>
        </div>
        {/* Spokes */}
        {spokes.map((s, i) => {
          const rad = (s.a * Math.PI) / 180;
          const cx = 200 + Math.cos(rad) * 160;
          const cy = 200 + Math.sin(rad) * 160;
          const lx = 200 + Math.cos(rad) * 85;
          const ly = 200 + Math.sin(rad) * 85;
          return (
            <div key={i}>
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <line x1={lx} y1={ly} x2={cx} y2={cy} stroke={C.border} strokeWidth="1" />
              </svg>
              <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)", background: C.card, border: `1px solid ${C.border}`, borderRadius: 2, padding: "8px 12px", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{s.l}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="af" style={{ ...dl(1200), fontSize: 16, color: C.sec, marginTop: 16 }}>One platform. Multiple partners. All driven by Sagicor's assessment data.</p>
    </div>
  );
};

/* ═══ SLIDE 41: TIMELINE ═══ */
const S41 = () => {
  const ms = [
    ["Week of March 17", "Proposal delivery and builder core list", false],
    ["Week of March 24", "Platform demo for Neil", false],
    ["End of March", "Cohort 1 selection finalized", false],
    ["April", "Southern Caribbean assessments and Technical Assessments launch", false],
    ["First week of April", "Boot camp logistics confirmed (Barbados)", false],
    ["Mid-April", "BOOT CAMP KICKOFF", true],
    ["April-June", "Personalized domain work", false],
    ["June", "Capstone deployments", false],
    ["July", "30-day impact measurement + Board outcome report", false],
    ["July", "Cohort 2 planning and launch", false],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,6vw,100px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 24 }}>Timeline</h2>
      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div className="af" style={{ ...dl(300), position: "absolute", left: 4, top: 0, bottom: 0, width: 1, background: C.border }} />
        {ms.map(([date, desc, highlight], i) => (
          <div key={i} className="al" style={{ ...dl(400 + i * 120), display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 10, position: "relative" }}>
            <div style={{ position: "absolute", left: -23, top: 6, width: highlight ? 10 : 8, height: highlight ? 10 : 8, borderRadius: "50%", background: highlight ? C.white : C.card, border: `2px solid ${highlight ? C.white : C.sec}` }} />
            <span style={{ fontSize: 14, color: highlight ? C.white : C.sec, fontWeight: 600, width: 150, flexShrink: 0 }}>{date}</span>
            <span style={{ fontSize: highlight ? 15 : 14, color: highlight ? C.white : C.text, fontWeight: highlight ? 700 : 400 }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══ SLIDE 42: NEXT STEPS ═══ */
const S42 = () => {
  const steps = [
    "Neil reviews and approves builder core list (top 20)",
    "Align on Cohort 1 final participant selection",
    "Platform demo: enterprise dashboard, workforce heatmap, participant experience",
    "Confirm Barbados boot camp location and logistics",
    "Realloc assigns expert mentors matched to participant profiles",
    "Southern Caribbean and Technical Assessment phases continue",
    "Neil announces the program at the STEC meeting",
    "Boot camp kickoff in April",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
      <Header />
      <h2 className="au rl-pf" style={{ ...dl(200), fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, marginBottom: 28 }}>Next Steps</h2>
      {steps.map((s, i) => (
        <div key={i} className="al" style={{ ...dl(400 + i * 150), display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
          <span className="rl-mono" style={{ fontSize: 18, fontWeight: 700, color: C.white, width: 24 }}>{i + 1}</span>
          <span style={{ fontSize: 18, color: C.text }}>{s}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══ SLIDE 43: CLOSING ═══ */
const S43 = ({ active }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const ts = [600, 1800, 3000, 4200, 5800, 7200].map((t, i) => setTimeout(() => setPhase(i + 1), t));
    return () => ts.forEach(clearTimeout);
  }, [active]);
  const lines = [
    "Sagicor has the data.",
    "Realloc has the platform.",
    "269 practitioners are ready.",
    "The builder core has been identified.",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
      <Header />
      {lines.map((l, i) => phase > i && <p key={i} className="au rl-pf" style={{ fontSize: "clamp(28px,3vw,40px)", fontWeight: 700, color: C.white, marginBottom: 12 }}>{l}</p>)}
      {phase >= 5 && <p className="au" style={{ fontSize: "clamp(24px,2.5vw,34px)", fontWeight: 700, color: C.white, marginTop: 24 }}>The only remaining question is when to start.</p>}
      {phase >= 6 && <p className="au" style={{ fontSize: "clamp(22px,2.2vw,30px)", color: C.sec, marginTop: 12 }}>We recommend April.</p>}
    </div>
  );
};

/* ═══ SLIDE 44: END CARD ═══ */
const S44 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    <Header />
    <p className="af" style={{ ...dl(500), fontSize: 18, color: C.sec, letterSpacing: "0.06em" }}>THCO | Powered by the Realloc Platform</p>
    <p className="af" style={{ ...dl(800), fontSize: 16, color: C.muted, marginTop: 8 }}>reallocai.com</p>
  </div>
);

/* ═══ MAIN ENGINE ═══ */
const SLIDES = [S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12,S13,S14,S15,S16,S17,S18,S19,S20,S21,S22,S23,S24,S25,S26,S27,S28,S29,S30,S31,S32,S33,S34,S35,S36,S37,S38,S39,S40,S41,S42,S43,S44];
const TOTAL = SLIDES.length;

export default function ReallocPresentation() {
  const [cur, setCur] = useState(0);
  const [grid, setGrid] = useState(false);

  const go = useCallback((i) => {
    if (i >= 0 && i < TOTAL && i !== cur) setCur(i);
  }, [cur]);

  useEffect(() => {
    const h = (e) => {
      if (grid && e.key === "Escape") { setGrid(false); return; }
      if (e.key === "Escape") { setGrid(true); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); go(cur + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(cur - 1); }
      if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cur, go, grid]);

  useEffect(() => {
    let sx = 0;
    const ts = (e) => { sx = e.touches[0].clientX; };
    const te = (e) => { const dx = sx - e.changedTouches[0].clientX; if (Math.abs(dx) > 60) { dx > 0 ? go(cur + 1) : go(cur - 1); } };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });
    return () => { window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, [cur, go]);

  return (
    <div className="rl" style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }} data-testid="realloc-presentation">
      <style>{css}</style>
      {/* Progress bar top */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: `${C.white}08`, zIndex: 60 }}>
        <div style={{ height: "100%", background: C.white, width: `${((cur + 1) / TOTAL) * 100}%`, transition: "width 300ms ease-out" }} />
      </div>
      {/* Slides */}
      {SLIDES.map((SC, i) => (
        <div key={i} className="rl-pg" data-active={i === cur ? "true" : "false"} data-testid={`realloc-slide-${i + 1}`} style={{ position: "absolute", inset: 0, zIndex: i === cur ? 10 : 0, opacity: i === cur ? 1 : 0, visibility: i === cur ? "visible" : "hidden", transition: "opacity 300ms ease" }}>
          <SC active={i === cur} />
        </div>
      ))}
      {/* Nav */}
      <div style={{ position: "fixed", bottom: 16, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => setGrid(true)} title="Slide Overview (Esc)" style={{ width: 28, height: 28, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, marginRight: 4 }} data-testid="realloc-grid"><Grid size={12} color={C.white} /></button>
        <button onClick={() => go(cur - 1)} disabled={cur === 0} style={{ width: 28, height: 28, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === 0 ? 0.15 : 0.5 }} data-testid="realloc-prev"><ChevronLeft size={14} color={C.white} /></button>
        <span className="rl-mono" style={{ fontSize: 14, color: C.muted, minWidth: 50, textAlign: "center" }} data-testid="realloc-counter">{cur + 1} / {TOTAL}</span>
        <button onClick={() => go(cur + 1)} disabled={cur === TOTAL - 1} style={{ width: 28, height: 28, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === TOTAL - 1 ? 0.15 : 0.5 }} data-testid="realloc-next"><ChevronRight size={14} color={C.white} /></button>
      </div>
      {/* Slide number bottom right */}
      <span className="rl-mono" style={{ position: "fixed", bottom: 50, right: 32, fontSize: 12, color: C.muted, zIndex: 50 }}>{String(cur + 1).padStart(2, "0")}</span>
      {/* Thumbnail Grid */}
      {grid && (
        <div className="rl-grid-overlay" onClick={() => setGrid(false)}>
          <div style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", zIndex: 210 }} onClick={() => setGrid(false)}><X size={20} color={C.sec} /></div>
          {SLIDES.map((_, i) => (
            <div key={i} className={`rl-thumb ${i === cur ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setCur(i); setGrid(false); }}>
              {i + 1}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
