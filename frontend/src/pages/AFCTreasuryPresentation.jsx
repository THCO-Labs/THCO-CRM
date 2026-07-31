import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Grid, X, Check, Download } from "lucide-react";

/* ═══ DESIGN TOKENS ═══ */
const C = {
  bg: "#0B1120", card: "#111827", cardAlt: "#0F1219",
  white: "#F5F5F0", sec: "#6B7280", muted: "#4B5563", body: "#D1D5DB",
  border: "rgba(255,255,255,0.08)", dash: "rgba(255,255,255,0.15)",
  teal: "#1D9E75", tealL: "#5DCAA5", tealD: "#0F3D2E", tealFlow: "#0F6E56",
  coral: "#D85A30", coralL: "#F0997B", coralD: "#2D1810",
  purple: "#6C5CE7", purpleL: "#AFA9EC", purpleD: "#1A1530",
  gray: "#9CA3AF", green: "#4ADE80", amber: "#F59E0B", red: "#EF4444",
};

/* ═══ CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
.afc *{box-sizing:border-box;margin:0;padding:0}
.afc{font-family:'Inter',sans-serif;background:${C.bg};color:${C.white};overflow:hidden;-webkit-font-smoothing:antialiased}
.pf{font-family:'Playfair Display',serif}
.mono{font-family:'JetBrains Mono',monospace}

@keyframes afc-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes afc-fade{from{opacity:0}to{opacity:1}}
@keyframes afc-left{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes afc-scale{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes afc-draw{to{stroke-dashoffset:0}}
@keyframes afc-pulse{0%,100%{opacity:0.5}50%{opacity:1}}
@keyframes afc-glow{0%,100%{box-shadow:0 0 0 0 rgba(108,92,231,0)}50%{box-shadow:0 0 24px 4px rgba(108,92,231,0.15)}}
@keyframes afc-badge-in{from{opacity:0;transform:translateY(-4px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}

.afc-pg[data-active="true"] .au{animation:afc-up 500ms cubic-bezier(0.22,1,0.36,1) both}
.afc-pg[data-active="true"] .af{animation:afc-fade 500ms cubic-bezier(0.22,1,0.36,1) both}
.afc-pg[data-active="true"] .al{animation:afc-left 500ms cubic-bezier(0.22,1,0.36,1) both}
.afc-pg[data-active="true"] .as{animation:afc-scale 500ms cubic-bezier(0.22,1,0.36,1) both}
.afc-pg[data-active="false"] .au,.afc-pg[data-active="false"] .af,.afc-pg[data-active="false"] .al,.afc-pg[data-active="false"] .as{opacity:0}

.afc-pill{display:inline-block;padding:5px 14px;border:1px solid ${C.teal};border-radius:2px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${C.teal};margin-bottom:18px}
.afc-card{background:${C.card};border:1px solid ${C.border};border-radius:2px;padding:20px}
.afc-grid{position:fixed;inset:0;z-index:200;background:rgba(11,17,32,0.97);backdrop-filter:blur(12px);display:flex;flex-wrap:wrap;gap:10px;padding:48px;overflow-y:auto;align-content:flex-start}
.afc-grid .th{width:calc(12.5% - 9px);aspect-ratio:16/9;background:${C.card};border:1px solid ${C.border};border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:${C.sec};transition:all 200ms ease}
.afc-grid .th:hover{border-color:${C.white};color:${C.white};transform:scale(1.04)}
.afc-grid .th.on{border-color:${C.teal};color:${C.teal}}

.svg-draw{stroke-dashoffset:var(--len);stroke-dasharray:var(--len);animation:afc-draw var(--dur,600ms) ease-out var(--del,0ms) both}
.pulse-node{animation:afc-glow 2s ease-in-out 1}
.badge-pop{animation:afc-badge-in 300ms ease-out both}

.nav-btn{width:32px;height:32px;background:rgba(255,255,255,0.03);border:1px solid ${C.border};border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 200ms}
.nav-btn:hover:not(:disabled){background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.15)}
.nav-btn:disabled{opacity:0.15;cursor:default}
`;

const dl = (ms) => ({ animationDelay: `${ms}ms` });

/* ═══ HOOKS ═══ */
const useCount = (target, active, dur = 800, delay = 0) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) { setV(0); return; }
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setV(Math.round(target * ease));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [active, target, dur, delay]);
  return v;
};

const usePhase = (active, count, intervals) => {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!active) { setP(0); return; }
    const ts = intervals.map((t, i) => setTimeout(() => setP(i + 1), t));
    return () => ts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return p;
};

/* ═══ CHROME ═══ */
const Header = () => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", zIndex: 5 }}>
    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.white }}>AFC</span>
    <span style={{ fontSize: 11, color: C.muted, letterSpacing: "0.02em" }}>Cross-Border Treasury System</span>
  </div>
);

const Badge = ({ text, d = 0 }) => <div className="af afc-pill" style={dl(d)}>{text}</div>;
const Card = ({ children, d = 0, style = {} }) => <div className="au afc-card" style={{ ...dl(d), ...style }}>{children}</div>;

/* ═══ SVG ARROW COMPONENT ═══ */
const SvgArrow = ({ x1, y1, x2, y2, color = C.tealFlow, dashed = false, delay = 0, dur = 600, label = "", labelColor = C.muted }) => {
  const len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  const ax = x2 - headLen * Math.cos(angle - Math.PI / 7);
  const ay = y2 - headLen * Math.sin(angle - Math.PI / 7);
  const bx = x2 - headLen * Math.cos(angle + Math.PI / 7);
  const by = y2 - headLen * Math.sin(angle + Math.PI / 7);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5}
        strokeDasharray={dashed ? "5 4" : "none"}
        className="svg-draw"
        style={{ "--len": len, "--dur": `${dur}ms`, "--del": `${delay}ms` }} />
      <polyline points={`${ax},${ay} ${x2},${y2} ${bx},${by}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        className="svg-draw"
        style={{ "--len": 30, "--dur": "200ms", "--del": `${delay + dur}ms` }} />
      {label && <text x={mx} y={my - 6} fill={labelColor} fontSize={10} textAnchor="middle" fontFamily="Inter" opacity={0} style={{ animation: `afc-fade 300ms ease-out ${delay + dur + 100}ms both` }}>{label}</text>}
    </g>
  );
};

/* ═══ S1: TITLE ═══ */
const S1 = ({ active }) => {
  const p = usePhase(active, 6, [0, 300, 600, 900, 1100, 1300]);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
      <Header />
      {p >= 1 && <h1 className="af pf" style={{ fontSize: "clamp(36px, 4vw, 48px)", fontWeight: 700, maxWidth: 720, lineHeight: 1.15 }}>Cross-Border Treasury and Settlement System</h1>}
      {p >= 2 && <p className="au" style={{ ...dl(0), fontSize: "clamp(15px, 1.5vw, 18px)", color: C.sec, marginTop: 16, maxWidth: 640, lineHeight: 1.6 }}>A Centralized Framework for Multi-Currency Collection, Internal Settlement, and USD Consolidation</p>}
      {p >= 3 && <div className="af" style={{ width: 60, height: 1, background: C.teal, margin: "24px auto", transition: "width 300ms ease" }} />}
      {p >= 4 && <p className="af" style={{ fontSize: 14, fontWeight: 500 }}>Africa Finance Corporation</p>}
      {p >= 5 && <p className="af" style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Prepared by Future Africa | March 2026</p>}
      {p >= 6 && <p className="af" style={{ fontSize: 12, color: C.muted, marginTop: 8, position: "absolute", bottom: 44 }}>$12.34 billion disbursed across 36 African countries. 44 member states.</p>}
    </div>
  );
};

/* ═══ S2: QUOTE ═══ */
const S2 = () => (
  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(40px,12vw,220px)", position: "relative" }}>
    <Header />
    <p className="au pf" style={{ ...dl(400), fontSize: "clamp(22px, 2.5vw, 28px)", fontStyle: "italic", lineHeight: 1.65, textAlign: "center", maxWidth: 720 }}>
      "The infrastructure that moves money between your portfolio companies is itself a piece of infrastructure worth building."
    </p>
  </div>
);

/* ═══ S3: THE PROBLEM ═══ */
const S3 = () => {
  const cos = [
    { n: "ARISE IIP", c: "Gabon", d: "Converts XOF through bank" },
    { n: "Infinity Power", c: "Egypt", d: "Converts EGP through bank" },
    { n: "Pecan Energies", c: "Ghana", d: "Converts GHS through bank" },
    { n: "Segilola", c: "Nigeria", d: "Converts NGN through bank" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 40px", gap: 36, position: "relative" }}>
      <Header />
      <div style={{ flex: "0 0 54%" }}>
        <Badge text="THE PROBLEM" d={200} />
        <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 24 }}>Your Portfolio Companies Convert Currency Independently. Every Conversion Costs Money.</h2>
        {["AFC has invested $12.34 billion across 36 African countries.", "Portfolio companies in Nigeria earn naira. In Ghana, cedis. In Gabon, CFA francs. In Egypt, pounds.", "When returns flow to AFC, each entity converts independently through local banks. Each bank takes a spread. Each conversion is uncoordinated.", "Multiply that across dozens of companies in dozens of countries, and the aggregate FX cost is significant."].map((t, i) => (
          <p key={i} className="au" style={{ ...dl(500 + i * 150), fontSize: 15, color: C.body, lineHeight: 1.85, marginBottom: 10 }}>{t}</p>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        {cos.map((c, i) => (
          <Card key={i} d={1200 + i * 200} style={{ marginBottom: 12, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{c.n}</p>
                <p style={{ fontSize: 12, color: C.sec }}>{c.c}</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{c.d}</p>
              </div>
              <span className="mono" style={{ fontSize: 11, color: C.red, background: `${C.red}15`, padding: "4px 10px", borderRadius: 2, fontWeight: 500 }}>3-5% spread</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ═══ S4: THE INSIGHT ═══ */
const S4 = ({ active }) => {
  const p = usePhase(active, 6, [400, 800, 1200, 1600, 2000, 2800]);
  const lines = [
    "What if AFC held local currency accounts in every country?",
    "What if portfolio returns flowed into those accounts automatically?",
    "What if cross-border payments were matched against existing balances?",
    "What if only the true surplus, the money nobody needs, got converted?",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
      <Header />
      <h2 className="au pf" style={{ ...dl(200), fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, marginBottom: 28 }}>What If the Money Never Had to Leave AFC's Accounts?</h2>
      {lines.map((l, i) => p > i && <p key={i} className="au" style={{ fontSize: 16, color: C.body, lineHeight: 1.85, marginBottom: 8 }}>{l}</p>)}
      {p >= 5 && <p className="au" style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>That is what this system does.</p>}
    </div>
  );
};

/* ═══ S5: TWO STREAMS ═══ */
const S5 = () => {
  const tealEx = [["ARISE IIP:", "Dividend XOF 800M (on AFC's 21% stake)"], ["Infinity Power:", "Interest EGP 500M (on debt facility)"], ["Segilola:", "Repayment NGN 800M (loan principal)"]];
  const coralEx = [["ARISE needs", "NGN 200M paid to Nigerian equipment supplier"], ["Segilola needs", "XOF 90M paid to Gabonese logistics vendor"], ["Pecan needs", "EGP 50M paid to Egyptian equipment vendor"]];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <Badge text="THE TWO STREAMS" d={200} />
      <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 22 }}>Two Types of Money Flow Into AFC's Treasury</h2>
      <div style={{ display: "flex", gap: 24 }}>
        <div className="au" style={{ ...dl(500), flex: 1, borderLeft: `2px solid ${C.teal}`, paddingLeft: 18 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: C.teal, marginBottom: 10 }}>Stream 1: AFC's Own Money</p>
          <p style={{ fontSize: 14, color: C.body, lineHeight: 1.75, marginBottom: 14 }}>Portfolio companies pay AFC what they owe: dividends on equity stakes, interest on debt facilities, principal repayments on loans. This money belongs to AFC. It lands in AFC's local currency accounts in each country.</p>
          {tealEx.map(([h, d], i) => <Card key={i} d={800 + i * 150} style={{ padding: "10px 14px", marginBottom: 8, borderLeft: `2px solid ${C.teal}` }}><span style={{ fontSize: 13, fontWeight: 600, color: C.tealL }}>{h}</span> <span style={{ fontSize: 13, color: C.body }}>{d}</span></Card>)}
        </div>
        <div className="au" style={{ ...dl(600), flex: 1, borderLeft: `2px solid ${C.coral}`, paddingLeft: 18 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: C.coral, marginBottom: 10 }}>Stream 2: Portfolio Company Money</p>
          <p style={{ fontSize: 14, color: C.body, lineHeight: 1.75, marginBottom: 14 }}>Portfolio companies need to make cross-border payments. Instead of going through banks, they deposit local currency with AFC and request AFC to pay on their behalf. This is not AFC's money. AFC holds it temporarily.</p>
          {coralEx.map(([h, d], i) => <Card key={i} d={900 + i * 150} style={{ padding: "10px 14px", marginBottom: 8, borderLeft: `2px solid ${C.coral}` }}><span style={{ fontSize: 13, fontWeight: 600, color: C.coralL }}>{h}</span> <span style={{ fontSize: 13, color: C.body }}>{d}</span></Card>)}
        </div>
      </div>
      <Card d={1500} style={{ marginTop: 14, padding: 14 }}>
        <p style={{ fontSize: 13, color: C.body }}>Both streams fill the same local currency accounts. The combined pool is what gives AFC the liquidity to match and settle.</p>
      </Card>
    </div>
  );
};

/* S6: HERO FLOWCHART */
const S6 = ({ active }) => {
  const p = usePhase(active, 9, [0, 1000, 1500, 2500, 3500, 4500, 5000, 5500, 6000]);
  const [dims, setDims] = useState({ w: 1840, h: 620 });
  const containerRef = useCallback(node => {
    if (node) {
      const r = node.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    }
  }, []);

  const { w, h } = dims;

  /* Y positions as proportions of container height */
  const pct = (frac) => Math.round(h * frac);
  const compY = pct(0);       const compH = 50;
  const contY = pct(0.12);
  const acctY = pct(0.19);    const acctH = 38;
  const actY  = pct(0.33);    const actH = 46;
  const contBY = pct(0.45);
  const outY  = pct(0.52);    const outH = 46;
  const usdY  = pct(0.67);
  const textY = pct(0.80);

  /* X centers from measured width */
  const compW = 175, compG = 14;
  const compS = (w - (4*compW + 3*compG)) / 2;
  const compCx = [0,1,2,3].map(i => compS + compW/2 + i*(compW+compG));

  const acctW = 140, acctG = 12;
  const acctS = (w - (4*acctW + 3*acctG)) / 2;
  const acctCx = [0,1,2,3].map(i => acctS + acctW/2 + i*(acctW+acctG));

  const actW = 195, actG = 14;
  const actS = (w - (3*actW + 2*actG)) / 2;
  const actCx = [0,1,2].map(i => actS + actW/2 + i*(actW+actG));

  const outCx = [w * 0.28, w * 0.72];
  const usdCx = w / 2;

  const cos = [["ARISE IIP","Gabon, XOF"],["Infinity Power","Egypt, EGP"],["Pecan Energies","Ghana, GHS"],["Segilola","Nigeria, NGN"]];
  const accts = ["NGN Account","GHS Account","XOF Account","EGP Account"];
  const acts = [
    ["Match & pay locally","Zero FX spread",C.teal,C.tealL],
    ["Update ledger","Track interco. debts",C.gray,C.gray],
    ["Convert surplus","Sell FX for USD",C.purple,C.purpleL],
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", padding:"48px 40px 0", position:"relative" }}>
      <Header />
      <p className="af" style={{ ...dl(100), fontSize:18, fontWeight:600, marginBottom:8 }}>The complete system</p>

      <div ref={containerRef} style={{ position:"relative", flex:1, marginBottom:66 }}>

        {/* SVG ARROW LAYER */}
        <svg width={w} height={h} style={{ position:"absolute", top:0, left:0, pointerEvents:"none", zIndex:2, overflow:"visible" }}>
          <defs>
            <marker id="at" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke={C.tealFlow} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
            <marker id="ac" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke={C.coral} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
            <marker id="ap" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke={C.purple} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
            <marker id="ag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke={C.gray} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
          </defs>

          {/* Phase 2: Input arrows (companies to container) */}
          {p >= 2 && compCx.map((x, i) => (
            <g key={`in${i}`}>
              <line x1={x-10} y1={compY+compH} x2={x-10} y2={contY+6}
                stroke={C.tealFlow} strokeWidth={1.5} markerEnd="url(#at)"
                className="svg-draw" style={{ "--len":contY-compY-compH+10, "--dur":"400ms", "--del":`${i*100}ms` }} />
              <line x1={x+10} y1={compY+compH} x2={x+10} y2={contY+6}
                stroke={C.coral} strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#ac)"
                className="svg-draw" style={{ "--len":contY-compY-compH+10, "--dur":"400ms", "--del":`${i*100+180}ms` }} />
            </g>
          ))}

          {/* Phase 4: Internal arrows (accounts to activities) */}
          {p >= 4 && acctCx.map((x, i) => (
            <line key={`ia${i}`} x1={x} y1={acctY+acctH} x2={actCx[Math.min(i,2)]} y2={actY}
              stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}
              className="svg-draw" style={{ "--len":80, "--dur":"300ms", "--del":`${i*60}ms` }} />
          ))}

          {/* Phase 5: EXIT arrows - activities to outputs */}
          {p >= 5 && <line x1={actCx[0]} y1={actY+actH} x2={outCx[0]} y2={outY}
            stroke={C.tealFlow} strokeWidth={1.5} markerEnd="url(#at)"
            className="svg-draw" style={{ "--len":Math.hypot(actCx[0]-outCx[0], outY-actY-actH), "--dur":"500ms", "--del":"0ms" }} />}
          {p >= 5 && <line x1={actCx[2]} y1={actY+actH} x2={outCx[1]} y2={outY}
            stroke={C.purple} strokeWidth={1.5} markerEnd="url(#ap)"
            className="svg-draw" style={{ "--len":Math.hypot(actCx[2]-outCx[1], outY-actY-actH), "--dur":"500ms", "--del":"200ms" }} />}

          {/* Phase 7: Remittance to USD Treasury */}
          {p >= 7 && <>
            <line x1={outCx[1]} y1={outY+outH} x2={usdCx} y2={usdY}
              stroke={C.purple} strokeWidth={1.5} markerEnd="url(#ap)"
              className="svg-draw" style={{ "--len":Math.hypot(outCx[1]-usdCx, usdY-outY-outH), "--dur":"400ms", "--del":"0ms" }} />
            <text x={(outCx[1]+usdCx)/2+14} y={(outY+outH+usdY)/2} fill={C.purple} fontSize="10" fontFamily="JetBrains Mono"
              opacity="0" style={{ animation:"afc-fade 300ms ease-out 400ms both" }}>USD</text>
          </>}

          {/* Phase 9: Feedback loop */}
          {p >= 9 && <>
            <path d={`M${actCx[1]} ${actY+actH} L${actCx[1]} ${actY+actH+14} Q${actCx[1]} ${actY+actH+26} ${actCx[1]+22} ${actY+actH+26} L${w-28} ${actY+actH+26} Q${w-14} ${actY+actH+26} ${w-14} ${actY+actH+12} L${w-14} ${compY+28} Q${w-14} ${compY+14} ${w-28} ${compY+14} L${compCx[3]+90} ${compY+14}`}
              fill="none" stroke={C.gray} strokeWidth={1} strokeDasharray="4 3" opacity={0.3} markerEnd="url(#ag)"
              className="svg-draw" style={{ "--len":900, "--dur":"800ms", "--del":"0ms" }} />
            <text x={w-6} y={(actY+compY+50)/2} fill={C.muted} fontSize="9" fontFamily="Inter" textAnchor="start"
              opacity="0" style={{ animation:"afc-fade 300ms ease-out 600ms both" }}
              transform={`rotate(-90, ${w-6}, ${(actY+compY+50)/2})`}>Settled vs next dividend</text>
          </>}
        </svg>

        {/* HTML NODES */}

        {/* Row 1: Companies */}
        <div style={{ position:"absolute", top:compY, left:0, right:0, display:"flex", gap:compG, justifyContent:"center", zIndex:3 }}>
          {cos.map(([n,s],i) => p >= 1 && (
            <div key={i} className="as" style={{ ...dl(i*180), width:compW, padding:"11px 14px", background:C.tealD, border:`0.5px solid ${C.teal}`, borderRadius:8, textAlign:"center" }}>
              <p style={{ fontSize:13, fontWeight:600, color:C.tealL }}>{n}</p>
              <p style={{ fontSize:11, color:C.teal, marginTop:1 }}>{s}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        {p >= 2 && <div className="af" style={{ ...dl(500), position:"absolute", top:compY+4, right:0, fontSize:10, color:C.muted, zIndex:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><div style={{ width:16, height:2, background:C.teal }} /><span>AFC returns</span></div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:16, height:2, background:C.coral, backgroundImage:`repeating-linear-gradient(to right, ${C.coral} 0 4px, transparent 4px 7px)` }} /><span>Portfolio deposits</span></div>
        </div>}

        {/* AFC Treasury container */}
        {p >= 3 && <div className="af" style={{ position:"absolute", top:contY, left:"3%", right:"3%", height:contBY-contY, border:`1px dashed ${C.dash}`, borderRadius:16, zIndex:1 }}>
          <div style={{ textAlign:"center", paddingTop:8 }}>
            <p style={{ fontSize:16, fontWeight:600 }}>AFC Treasury</p>
            <p style={{ fontSize:10, color:C.muted, marginTop:1 }}>Lagos HQ, 3a Osborne Road, Ikoyi</p>
          </div>
        </div>}

        {/* Accounts */}
        {p >= 3 && <div style={{ position:"absolute", top:acctY, left:0, right:0, display:"flex", gap:acctG, justifyContent:"center", zIndex:3 }}>
          {accts.map((a,i) => (
            <div key={i} className="as" style={{ ...dl(i*110), background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 16px", textAlign:"center", width:acctW }}>
              <p style={{ fontSize:12, fontWeight:600 }}>{a}</p>
            </div>
          ))}
        </div>}

        {/* Activities */}
        {p >= 4 && <div style={{ position:"absolute", top:actY, left:0, right:0, display:"flex", gap:actG, justifyContent:"center", zIndex:3 }}>
          {acts.map(([t,s,c,cl],i) => (
            <div key={i} className="au" style={{ ...dl(i*180), background:C.card, borderLeft:`2px solid ${c}`, borderRadius:8, padding:"10px 14px", width:actW }}>
              <p style={{ fontSize:12, fontWeight:600, color:cl }}>{t}</p>
              <p style={{ fontSize:10, color:c, marginTop:1 }}>{s}</p>
            </div>
          ))}
        </div>}

        {/* Output nodes positioned to match SVG arrow endpoints */}
        {p >= 6 && <>
          <div className="au" style={{ position:"absolute", top:outY, left:outCx[0]-70, zIndex:3, background:C.coralD, border:`0.5px solid ${C.coral}`, borderRadius:8, padding:"10px 14px", width:140 }}>
            <p style={{ fontSize:12, fontWeight:600, color:C.coralL }}>Suppliers paid</p>
            <p style={{ fontSize:10, color:C.coral }}>In local currency</p>
          </div>
          <div className="au" style={{ ...dl(250), position:"absolute", top:outY, left:outCx[1]-80, zIndex:3, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", width:160 }}>
            <p style={{ fontSize:12, fontWeight:600 }}>Remittance providers</p>
            <p style={{ fontSize:10, color:C.sec }}>Buy surplus FX</p>
          </div>
        </>}

        {/* USD Treasury */}
        {p >= 8 && <div style={{ position:"absolute", top:usdY, left:0, right:0, display:"flex", justifyContent:"center", zIndex:3 }}>
          <div className="au pulse-node" style={{ background:C.purpleD, border:`1px solid ${C.purple}`, borderRadius:8, padding:"10px 22px", textAlign:"center" }}>
            <p style={{ fontSize:14, fontWeight:600, color:C.purpleL }}>AFC Centralized USD Treasury</p>
            <p style={{ fontSize:11, color:C.purple }}>Single consolidated pool</p>
          </div>
        </div>}

        {/* Bottom text */}
        {p >= 9 && <p className="af" style={{ ...dl(400), position:"absolute", top:textY, left:0, right:0, textAlign:"center", fontSize:10, color:C.muted, zIndex:3 }}>Cycle repeats monthly as new returns flow in.</p>}
      </div>
    </div>
  );
};


/* ═══ S7: DEEP DIVE STREAM 1 ═══ */
const S7 = ({ active }) => {
  const payments = [["ARISE IIP", "Dividend: XOF 800M", "(on AFC's 21% stake)"], ["Infinity Power", "Interest: EGP 500M", "(on debt facility)"], ["Pecan Energies", "Dividend: GHS 230M", "(from Kpone IPP)"], ["Segilola", "Repayment: NGN 800M", "(loan principal)"]];
  const accounts = [["AFC Gabon", "XOF", "2.6B"], ["AFC Egypt", "EGP", "1.4B"], ["AFC Ghana", "GHS", "680M"], ["AFC Nigeria", "NGN", "4.7B"]];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <Badge text="STREAM 1" d={200} />
      <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 10 }}>AFC's Own Money: Returns on Investment</h2>
      <p className="au" style={{ ...dl(400), fontSize: 15, color: C.body, marginBottom: 22, lineHeight: 1.7 }}>Portfolio companies pay AFC what they owe. Dividends on equity stakes, interest on debt facilities, loan repayments. This is money AFC owns.</p>
      <div style={{ display: "flex", gap: 14 }}>
        {payments.map(([n, pmt, l], i) => (
          <Card key={i} d={600 + i * 150} style={{ flex: 1, borderTop: `2px solid ${C.teal}`, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.tealL }}>{n}</p>
            <p className="mono" style={{ fontSize: 16, color: C.teal, marginTop: 8 }}>{pmt}</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{l}</p>
          </Card>
        ))}
      </div>
      {/* SVG arrows */}
      {active && <div style={{ position: "relative", height: 28 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {[0, 1, 2, 3].map(i => {
            const x = (i + 0.5) * 25 + "%";
            return <line key={i} x1={x} y1="0" x2={x} y2="28" stroke={C.tealFlow} strokeWidth={1.5}
              className="svg-draw" style={{ "--len": 28, "--dur": "400ms", "--del": `${1200 + i * 100}ms` }} />;
          })}
        </svg>
      </div>}
      <div style={{ display: "flex", gap: 14 }}>
        {accounts.map(([n, cur, val], i) => (
          <Card key={i} d={1500 + i * 150} style={{ flex: 1, padding: 16, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: C.sec }}>{n}</p>
            <p className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }}>{cur} {val}</p>
          </Card>
        ))}
      </div>
      <Card d={2200} style={{ marginTop: 16, padding: 14 }}>
        <p style={{ fontSize: 13, color: C.body }}>This money now sits in AFC's own accounts, available for local payments or conversion to USD.</p>
      </Card>
    </div>
  );
};

/* ═══ S8: DEEP DIVE STREAM 2 ═══ */
const S8 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
    <Header />
    <Badge text="STREAM 2" d={200} />
    <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 10 }}>Portfolio Company Money: Cross-Border Payments</h2>
    <p className="au" style={{ ...dl(400), fontSize: 15, color: C.body, marginBottom: 22, lineHeight: 1.7 }}>Portfolio companies need to pay suppliers and contractors in other countries. Instead of each company going through banks and paying FX spread, they deposit with AFC and AFC pays locally.</p>
    <div style={{ display: "flex", gap: 24 }}>
      {[
        { co: "ARISE IIP (Gabon)", need: "Needs to pay a Nigerian equipment supplier NGN 200M.", without: "Without AFC: buys naira through a Gabonese bank.", wCost: "Cost: 4-6% spread = ~$15,000-$22,000 lost", with: "With AFC: deposits XOF into AFC's Gabon account. AFC pays from existing NGN balance.", aCost: "Cost: $0 FX spread" },
        { co: "Segilola (Nigeria)", need: "Needs to pay a Gabonese logistics vendor XOF 90M.", without: "Without AFC: buys CFA through a Nigerian bank.", wCost: "Cost: 3-5% spread", with: "With AFC: deposits NGN into AFC's Nigeria account. AFC pays from existing XOF balance.", aCost: "Cost: $0 FX spread" },
      ].map((ex, i) => (
        <Card key={i} d={600 + i * 300} style={{ flex: 1, borderLeft: `2px solid ${C.coral}` }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.coral, marginBottom: 10 }}>{ex.co}</p>
          <p style={{ fontSize: 14, color: C.body, marginBottom: 8 }}>{ex.need}</p>
          <p style={{ fontSize: 13, color: C.sec, marginBottom: 6 }}>{ex.without}</p>
          <span className="mono" style={{ fontSize: 12, color: C.red, background: `${C.red}15`, padding: "3px 10px", borderRadius: 2 }}>{ex.wCost}</span>
          <p style={{ fontSize: 13, color: C.sec, marginTop: 12, marginBottom: 6 }}>{ex.with}</p>
          <span className="mono" style={{ fontSize: 12, color: C.green, background: `${C.green}15`, padding: "3px 10px", borderRadius: 2 }}>{ex.aCost}</span>
        </Card>
      ))}
    </div>
    <Card d={1400} style={{ marginTop: 16, padding: 14 }}>
      <p style={{ fontSize: 13, color: C.body }}>The money ARISE deposited is not AFC's. AFC holds it temporarily and executes the payment. The ledger tracks the debt.</p>
    </Card>
  </div>
);

/* ═══ S9: MATCHING ENGINE ═══ */
const S9 = ({ active }) => {
  const p = usePhase(active, 5, [200, 1000, 2200, 3700, 5200]);
  const bals = [["NIGERIA", "NGN", 4700, 4500, 200], ["GHANA", "GHS", 680, 640, 40], ["GABON", "XOF", 2600, 2510, 90], ["EGYPT", "EGP", 1400, 1375, 25]];
  const reqs = [["ARISE requests", "Pay Nigerian supplier NGN 200M", "NGN 4.7B > 200M needed"], ["Infinity Power requests", "Pay Ghanaian logistics firm GHS 40M", "GHS 680M > 40M needed"], ["Segilola requests", "Pay Egyptian lab vendor EGP 25M", "EGP 1.4B > 25M needed"], ["Pecan requests", "Pay Ivorian contractor XOF 90M", "XOF 2.6B > 90M needed"]];
  const showDec = p >= 4;

  const formatBal = (cur, start, end, delta) => {
    const val = showDec ? end : start;
    if (cur === "GHS") return `${val}M`;
    return `${(val / 1000).toFixed(cur === "EGP" ? 3 : 1)}B`;
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <Badge text="THE ENGINE" d={100} />
      <h2 className="au pf" style={{ ...dl(150), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 18 }}>Inside AFC's Treasury: The Matching Engine</h2>

      {/* Balances */}
      {p >= 1 && <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
        {bals.map(([country, cur, start, end, delta], i) => (
          <div key={i} className="as afc-card" style={{ ...dl(i * 120), flex: 1, textAlign: "center", position: "relative", padding: "16px 12px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: C.muted, letterSpacing: "0.06em" }}>{country}</p>
            <p className="mono" style={{ fontSize: 28, fontWeight: 600, marginTop: 6, transition: "all 500ms ease" }}>{cur} {formatBal(cur, start, end, delta)}</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Current balance</p>
            {showDec && <span className="mono badge-pop" style={{ position: "absolute", top: 6, right: 8, fontSize: 11, color: C.coral, background: `${C.coral}20`, padding: "3px 8px", borderRadius: 2 }}>-{delta}M</span>}
          </div>
        ))}
      </div>}

      {/* Requests */}
      {p >= 2 && <>
        <p className="af" style={{ ...dl(0), fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: C.muted, letterSpacing: "0.06em", marginBottom: 10 }}>INCOMING REQUESTS</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {reqs.map(([h, d, m], i) => (
            <div key={i} className="au afc-card" style={{ ...dl(i * 150), flex: 1, padding: "14px 14px", borderLeft: `2px solid ${C.coral}` }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.coralL }}>{h}</p>
              <p style={{ fontSize: 13, color: C.body, marginTop: 5 }}>{d}</p>
              {p >= 3 && <div className="af" style={{ ...dl(i * 350), display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${C.teal}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={11} color={C.teal} /></div>
                <span className="mono" style={{ fontSize: 11, color: C.green }}>{m}</span>
                <span style={{ fontSize: 10, color: C.teal, background: `${C.teal}20`, padding: "3px 8px", borderRadius: 2, marginLeft: "auto", fontWeight: 500, flexShrink: 0 }}>Approved</span>
              </div>}
            </div>
          ))}
        </div>
      </>}

      {/* Result */}
      {p >= 5 && <div className="au" style={{ display: "flex", gap: 24, justifyContent: "center", paddingTop: 4 }}>
        {[["4", "Cross-border payments", C.white], ["0", "Bank conversions", C.green], ["$0", "FX spread paid", C.green]].map(([v, l, c], i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <span className="mono" style={{ fontSize: 32, fontWeight: 600, color: c }}>{v}</span>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{l}</p>
          </div>
        ))}
      </div>}
    </div>
  );
};

/* ═══ S10: THE LEDGER ═══ */
const S10 = ({ active }) => {
  const p = usePhase(active, 2, [2500, 4000]);
  const rows = [
    ["ARISE IIP", "NGN 200M to Nigerian supplier", "XOF equiv. at NAFEM mid-rate", "Netted vs next quarterly dividend"],
    ["Infinity Power", "GHS 40M to Ghanaian firm", "EGP equiv. at CBE reference rate", "Deducted from next interest payment"],
    ["Segilola", "EGP 25M to Egyptian lab", "NGN equiv. at interbank mid-rate", "Netted vs next loan repayment"],
    ["Pecan Energies", "XOF 90M to Ivorian contractor", "GHS equiv. at BOG reference rate", "Quarterly cash settlement"],
  ];
  const settled = [0, 2];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <Badge text="THE LEDGER" d={200} />
      <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 8 }}>Tracking Who Owes What</h2>
      <p className="au" style={{ ...dl(400), fontSize: 15, color: C.body, marginBottom: 18, lineHeight: 1.7 }}>After AFC makes cross-border payments on behalf of portfolio companies, intercompany debts are created. Every transaction is priced at the official benchmark rate on the day of execution.</p>
      <div className="au" style={{ ...dl(600), borderRadius: 2, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr 90px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, padding: "12px 16px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
          <span>Company</span><span>Payment Made</span><span>Debt Created</span><span>Settlement Method</span><span>Status</span>
        </div>
        {rows.map(([co, pay, debt, method], i) => (
          <div key={i} className="au" style={{ ...dl(800 + i * 200), display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr 90px", fontSize: 13, padding: "12px 16px", background: i % 2 === 0 ? C.card : C.cardAlt, borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>{co}</span>
            <span style={{ color: C.body }}>{pay}</span>
            <span style={{ color: C.body }}>{debt}</span>
            <span style={{ color: C.body }}>{method}</span>
            <span className="mono" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 2, textAlign: "center", transition: "all 400ms ease", background: p >= 1 && settled.includes(i) ? `${C.teal}20` : `${C.amber}20`, color: p >= 1 && settled.includes(i) ? C.teal : C.amber, fontWeight: 500 }}>{p >= 1 && settled.includes(i) ? "Settled" : "Pending"}</span>
          </div>
        ))}
      </div>
      <Card d={1800} style={{ marginTop: 16, padding: 14 }}>
        <p style={{ fontSize: 13, color: C.body }}>Using official benchmark rates satisfies transfer pricing requirements across all jurisdictions. No preferential rates. No regulatory risk. Full audit trail.</p>
      </Card>
    </div>
  );
};

/* ═══ S11: SURPLUS CONVERSION ═══ */
const S11 = ({ active }) => {
  const p = usePhase(active, 3, [200, 1200, 2800]);
  const bals = [["NGN", "4.5B", "500M", "4.0B"], ["GHS", "640M", "50M", "590M"], ["XOF", "2.51B", "200M", "2.31B"], ["EGP", "1.375B", "100M", "1.275B"]];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <Badge text="THE CONVERSION" d={200} />
      <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 8 }}>Converting What Nobody Needs</h2>
      <p className="au" style={{ ...dl(400), fontSize: 15, color: C.body, marginBottom: 18, lineHeight: 1.7 }}>After all local payments are made, AFC still holds large local currency balances. This surplus gets sold to remittance providers who need African currencies for diaspora payouts.</p>
      {p >= 1 && <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
        {bals.map(([cur, start, end, sold], i) => (
          <div key={i} className="as afc-card" style={{ ...dl(i * 120), flex: 1, textAlign: "center", position: "relative", padding: "14px 12px" }}>
            <p className="mono" style={{ fontSize: 24, fontWeight: 600, transition: "all 500ms" }}>{cur} {p >= 3 ? end : start}</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{p >= 3 ? "Retained buffer" : "After local payments"}</p>
            {p >= 3 && <span className="mono badge-pop" style={{ position: "absolute", top: 5, right: 7, fontSize: 10, color: C.coral, background: `${C.coral}20`, padding: "3px 7px", borderRadius: 2 }}>-{sold} sold</span>}
          </div>
        ))}
      </div>}
      {p >= 2 && <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 18 }}>
        <Card d={0} style={{ flex: 1, borderLeft: `2px solid ${C.purple}`, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.purple }}>AFC has</p>
          <p style={{ fontSize: 13, color: C.body, marginTop: 5 }}>Surplus NGN, GHS, XOF, EGP</p>
          <p style={{ fontSize: 13, color: C.sec }}>Wants: USD</p>
        </Card>
        <div style={{ textAlign: "center", flexShrink: 0, padding: "0 10px" }}>
          <div style={{ fontSize: 22, color: C.purple }}>&harr;</div>
          <p style={{ fontSize: 11, color: C.muted, maxWidth: 170, marginTop: 5, lineHeight: 1.5 }}>Direct trade. Both sides get better rates than banks.</p>
        </div>
        <Card d={200} style={{ flex: 1, borderLeft: `2px solid ${C.purple}`, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.purple }}>Remittance companies have</p>
          <p style={{ fontSize: 13, color: C.body, marginTop: 5 }}>USD, GBP, EUR from diaspora senders</p>
          <p style={{ fontSize: 13, color: C.sec }}>Want: NGN, GHS, XOF, EGP for last-mile payouts</p>
        </Card>
      </div>}
      {p >= 3 && <Card d={400} style={{ textAlign: "center", borderTop: `2px solid ${C.purple}`, padding: 16 }}>
        <p className="mono" style={{ fontSize: 24, fontWeight: 600, color: C.purpleL }}>AFC Centralized USD Treasury</p>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>Small buffers retained in each country for next cycle's local payments.</p>
      </Card>}
    </div>
  );
};

/* ═══ S12: ARISE + SEGILOLA EXAMPLE ═══ */
const S12 = ({ active }) => {
  const p = usePhase(active, 5, [200, 1000, 2000, 3500, 4500]);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "56px 40px 36px", position: "relative" }}>
      <Header />
      <Badge text="EXAMPLE" d={100} />
      <h2 className="au pf" style={{ ...dl(150), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 16 }}>How It Works: ARISE and Segilola</h2>
      <div style={{ flex: 1, position: "relative" }}>
        {/* Phase 1: Companies */}
        {p >= 1 && <div style={{ display: "flex", gap: 48, justifyContent: "center" }}>
          <Card d={0} style={{ width: 310, borderTop: `2px solid ${C.teal}`, padding: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.tealL }}>ARISE IIP (Gabon)</p>
            <p style={{ fontSize: 13, color: C.body, marginTop: 5 }}>Earns XOF from port fees</p>
            <p style={{ fontSize: 13, color: C.sec }}>Needs NGN 200M for Nigerian supplier</p>
          </Card>
          <Card d={200} style={{ width: 310, borderTop: `2px solid ${C.teal}`, padding: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.tealL }}>Segilola (Nigeria)</p>
            <p style={{ fontSize: 13, color: C.body, marginTop: 5 }}>Earns NGN from gold sales</p>
            <p style={{ fontSize: 13, color: C.sec }}>Needs XOF 90M for Gabonese vendor</p>
          </Card>
        </div>}

        {/* Phase 2: Treasury */}
        {p >= 2 && <div className="af" style={{ margin: "18px auto", width: "72%", border: `1px dashed ${C.dash}`, borderRadius: 16, padding: "16px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>AFC Treasury</p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "center" }}>
            <div className="afc-card" style={{ padding: "10px 22px" }}><p style={{ fontSize: 13, fontWeight: 600 }}>AFC Gabon (XOF)</p></div>
            {p >= 3 && <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
              <div className="af" style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 11, color: C.coralL, fontWeight: 500 }}>AFC pays NGN 200M</span><span style={{ color: C.coral }}>&rarr;</span></div>
              <div className="af" style={{ ...dl(400), display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: C.coral }}>&larr;</span><span style={{ fontSize: 11, color: C.coralL, fontWeight: 500 }}>AFC pays XOF 90M</span></div>
            </div>}
            <div className="afc-card" style={{ padding: "10px 22px" }}><p style={{ fontSize: 13, fontWeight: 600 }}>AFC Nigeria (NGN)</p></div>
          </div>
          {p >= 3 && <p className="af" style={{ ...dl(800), fontSize: 12, color: C.green, marginTop: 10, fontWeight: 500 }}>No bank involved. No FX spread. No SWIFT fees.</p>}
        </div>}

        {/* Phase 4: Suppliers */}
        {p >= 4 && <div style={{ display: "flex", gap: 48, justifyContent: "center" }}>
          <Card d={0} style={{ width: 290, borderTop: `2px solid ${C.coral}`, padding: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.coralL }}>Nigerian supplier</p>
            <p style={{ fontSize: 12, color: C.body, marginTop: 4 }}>Receives NGN 200M from AFC Nigeria account</p>
          </Card>
          <Card d={200} style={{ width: 290, borderTop: `2px solid ${C.coral}`, padding: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.coralL }}>Gabonese vendor</p>
            <p style={{ fontSize: 12, color: C.body, marginTop: 4 }}>Receives XOF 90M from AFC Gabon account</p>
          </Card>
        </div>}

        {/* Phase 5: Settlement */}
        {p >= 5 && <Card d={0} style={{ marginTop: 16, padding: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ledger settlement</p>
          <p style={{ fontSize: 12, color: C.body }}>ARISE: XOF deposit offsets NGN 200M payment. Settled.</p>
          <p style={{ fontSize: 12, color: C.body }}>Segilola: NGN deposit offsets XOF 90M payment. Settled.</p>
          <p style={{ fontSize: 12, color: C.sec, marginTop: 5 }}>Remaining difference netted vs next dividend cycle.</p>
        </Card>}
      </div>
    </div>
  );
};

/* ═══ S13: NETWORK EFFECT ═══ */
const S13 = ({ active }) => {
  const bars = [{ l: "5 companies", v: 15 }, { l: "10 companies", v: 30 }, { l: "20 companies", v: 45 }, { l: "36 countries", v: 62 }];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 40px", gap: 36, position: "relative" }}>
      <Header />
      <div style={{ flex: "0 0 47%" }}>
        <h2 className="au pf" style={{ ...dl(200), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 18 }}>More Companies. Higher Matching. Less Conversion.</h2>
        {["With 4 portfolio companies, AFC can match some cross-border payments internally.", "With 10 companies across 10 countries, the matching ratio increases. More payment needs can be offset against existing balances.", "With 20+ companies across 20+ countries, the system approaches a tipping point: the majority of cross-border flows can be settled internally, and only a fraction touches external FX markets.", "Every company that joins the system makes it more efficient for every other company."].map((t, i) => (
          <p key={i} className="au" style={{ ...dl(400 + i * 150), fontSize: 15, color: C.body, lineHeight: 1.85, marginBottom: 10 }}>{t}</p>
        ))}
        <p className="au" style={{ ...dl(1200), fontSize: 18, fontWeight: 700, marginTop: 20 }}>It is a network effect applied to treasury management.</p>
      </div>
      <div style={{ flex: 1 }}>
        <p className="af" style={{ ...dl(500), fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, fontWeight: 600 }}>% of flows matched internally</p>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-end", height: 260 }}>
          {bars.map((b, i) => (
            <div key={i} className="au" style={{ ...dl(600 + i * 200), flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span className="mono" style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{b.v}%</span>
              <div style={{ width: "100%", height: 240, background: `${C.white}06`, borderRadius: 2, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, width: "100%", height: active ? `${b.v}%` : "0%", background: `linear-gradient(to top, ${C.teal}, ${C.tealFlow})`, transition: `height 1000ms cubic-bezier(0.22,1,0.36,1) ${600 + i * 200}ms`, borderRadius: "2px 2px 0 0" }} />
                <div style={{ position: "absolute", bottom: active ? `${b.v}%` : "0%", width: "100%", height: active ? `${100 - b.v}%` : "0%", background: `${C.purple}25`, transition: `all 1000ms cubic-bezier(0.22,1,0.36,1) ${600 + i * 200}ms` }} />
              </div>
              <span style={{ fontSize: 12, color: C.sec, marginTop: 8 }}>{b.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══ S14: IMPLEMENTATION ═══ */
const S14 = () => {
  const cards = [
    { n: "01", t: "Visibility Dashboard", d: "Real-time or daily view of AFC's local currency balances across all country accounts. Current state: likely spreadsheets and monthly reports. Target: live dashboard.", c: C.teal },
    { n: "02", t: "Payment Request Workflow", d: "Standardized process for portfolio companies to submit cross-border payment needs. Company, amount, currency, destination, urgency.", c: C.coral },
    { n: "03", t: "Matching Engine", d: "Automated system to pair incoming requests against available balances. Flag matches. Prioritize by urgency and size. Calculate optimal netting.", c: C.purple },
    { n: "04", t: "Ledger and Settlement", d: "Track intercompany positions, benchmark rates used, settlement schedules, and full audit trail. Transfer pricing compliant across all jurisdictions.", c: C.gray },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <Badge text="IMPLEMENTATION" d={200} />
      <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, marginBottom: 28 }}>Four Components. One System.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {cards.map((c, i) => (
          <Card key={i} d={500 + i * 200} style={{ borderTop: `2px solid ${c.c}`, padding: "20px 22px" }}>
            <span className="mono" style={{ fontSize: 26, color: c.c, fontWeight: 600 }}>{c.n}</span>
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 8, marginBottom: 10 }}>{c.t}</p>
            <p style={{ fontSize: 13, color: C.body, lineHeight: 1.65 }}>{c.d}</p>
          </Card>
        ))}
      </div>
      <p className="af" style={{ ...dl(1400), fontSize: 14, color: C.muted, marginTop: 20 }}>Phase 1: Pilot with 4-5 portfolio companies across Nigeria, Ghana, Gabon, and Egypt.</p>
    </div>
  );
};

/* ═══ S15: SAVINGS ═══ */
const S15 = ({ active }) => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 40px", position: "relative" }}>
    <Header />
    <h2 className="au pf" style={{ ...dl(200), fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, marginBottom: 32 }}>The Business Case</h2>
    <div style={{ display: "flex", gap: 36, marginBottom: 28 }}>
      <Card d={400} style={{ textAlign: "center", padding: "28px 36px", borderTop: `2px solid ${C.red}` }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: C.muted, letterSpacing: "0.06em" }}>CURRENT COST</p>
        <span className="mono" style={{ fontSize: 52, fontWeight: 600, color: C.red, display: "block", marginTop: 8 }}>3-5%</span>
        <p style={{ fontSize: 13, color: C.body, marginTop: 6 }}>Average FX spread per conversion</p>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Across all portfolio companies, all countries, all banks</p>
      </Card>
      <Card d={600} style={{ textAlign: "center", padding: "28px 36px", borderTop: `2px solid ${C.green}` }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: C.muted, letterSpacing: "0.06em" }}>WITH AFC TREASURY SYSTEM</p>
        <span className="mono" style={{ fontSize: 52, fontWeight: 600, color: C.green, display: "block", marginTop: 8 }}>0%</span>
        <p style={{ fontSize: 13, color: C.body, marginTop: 6 }}>FX spread on internally matched payments</p>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Estimated 30-40% of total flows matched in Phase 1</p>
      </Card>
    </div>
    <p className="au mono" style={{ ...dl(900), fontSize: "clamp(20px, 2.2vw, 28px)", fontWeight: 600, textAlign: "center" }}>Estimated annual savings: 2-4% of total cross-border flow volume</p>
    <div className="au" style={{ ...dl(1200), display: "flex", gap: 28, marginTop: 28 }}>
      {[["30-40%", "Flows matched internally (Phase 1)", C.teal], ["60-70%", "Via remittance providers (better rate)", C.purple], ["0", "Payments requiring traditional bank FX", C.green]].map(([v, l, c], i) => (
        <div key={i} className="afc-card" style={{ textAlign: "center", padding: "16px 22px" }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 600, color: c }}>{v}</span>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{l}</p>
        </div>
      ))}
    </div>
  </div>
);

/* ═══ S16: COMPARISON ═══ */
const S16 = () => {
  const rows = [
    ["Who converts", "Each company independently", "Centralized but still through banks", "AFC matches internally first"],
    ["FX spread", "3-5% per transaction", "1-3% (negotiated volume rate)", "0% on matched flows"],
    ["Cross-border method", "SWIFT through correspondent banks", "Same", "Internal ledger settlement"],
    ["Settlement speed", "2-3 business days", "1-2 business days", "Instant (ledger entry)"],
    ["Visibility", "Monthly reports", "Weekly reports", "Real-time dashboard"],
    ["Netting", "None", "Bilateral", "Multilateral across full portfolio"],
    ["Surplus conversion", "Through banks", "Through banks (better rate)", "Through remittance providers (best rate)"],
    ["Network effect", "None", "None", "Improves with every company added"],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <h2 className="au pf" style={{ ...dl(200), fontSize: "clamp(26px, 2.8vw, 34px)", fontWeight: 700, marginBottom: 22 }}>How This Compares to the Current Approach</h2>
      <div className="au" style={{ ...dl(400), borderRadius: 2, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 1fr", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 16px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
          <span /><span style={{ color: C.muted }}>Current State</span><span style={{ color: C.muted }}>Traditional Optimization</span><span style={{ color: C.white }}>AFC Treasury System</span>
        </div>
        {rows.map(([label, c1, c2, c3], i) => (
          <div key={i} className="au" style={{ ...dl(600 + i * 80), display: "grid", gridTemplateColumns: "150px 1fr 1fr 1fr", fontSize: 13, padding: "10px 16px", background: i % 2 === 0 ? C.card : C.cardAlt, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.sec, fontWeight: 500 }}>{label}</span>
            <span style={{ color: C.muted }}>{c1}</span>
            <span style={{ color: C.muted }}>{c2}</span>
            <span style={{ color: C.white, fontWeight: 500 }}>{c3}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══ S17: TIMELINE ═══ */
const S17 = () => {
  const ms = [
    { d: "March 2026", t: "System architecture and flowchart delivered", s: "Treasury framework documented. AFC reviews.", c: C.teal, active: true },
    { d: "April 2026", t: "Pilot design", s: "Select 4-5 portfolio companies. Map existing bank relationships. Identify remittance partners." },
    { d: "Q2 2026", t: "Visibility dashboard built", s: "Real-time view of AFC local currency balances across pilot countries." },
    { d: "Q3 2026", t: "Matching engine and ledger launched", s: "First internally matched cross-border payments executed. Settlement tracking live." },
    { d: "Q4 2026", t: "Remittance provider partnerships active", s: "Surplus conversion channel operational. First full cycle completed." },
    { d: "2027", t: "Full portfolio rollout", s: "Expand from pilot to all 36 countries. Network effect accelerates.", c: C.purple, big: true },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", position: "relative" }}>
      <Header />
      <Badge text="TIMELINE" d={200} />
      <h2 className="au pf" style={{ ...dl(300), fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, marginBottom: 28 }}>Implementation Roadmap</h2>
      <div style={{ position: "relative", paddingLeft: 32 }}>
        <div className="af" style={{ ...dl(400), position: "absolute", left: 6, top: 0, bottom: 0, width: 1, background: C.border }} />
        {ms.map((m, i) => (
          <div key={i} className="al" style={{ ...dl(500 + i * 200), display: "flex", gap: 18, marginBottom: 16, position: "relative" }}>
            <div style={{ position: "absolute", left: -30, top: 7, width: m.big ? 13 : 11, height: m.big ? 13 : 11, borderRadius: "50%", background: m.active ? C.white : m.c || C.card, border: `2px solid ${m.c || C.sec}` }} />
            <div>
              <span className="mono" style={{ fontSize: 14, color: m.c || C.sec, fontWeight: 500 }}>{m.d}</span>
              <p style={{ fontSize: m.big ? 16 : 14, fontWeight: m.big ? 700 : 500, marginTop: 3 }}>{m.t}</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{m.s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══ S18: NEXT STEPS ═══ */
const S18 = () => {
  const steps = [
    "AFC reviews the treasury system architecture and flowchart",
    "Identify 4-5 portfolio companies for the pilot (recommend ARISE, Infinity Power, Pecan, Segilola)",
    "Map current bank relationships and FX conversion costs in pilot countries",
    "Identify licensed remittance provider partners in Nigeria, Ghana, Gabon, Egypt",
    "Future Africa scopes the technology build for the visibility dashboard and matching engine",
    "Regulatory review: confirm intercompany settlement structure in each jurisdiction",
    "Define benchmark rate methodology and transfer pricing documentation requirements",
    "Pilot kickoff targeting Q2 2026",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,8vw,120px)", position: "relative" }}>
      <Header />
      <h2 className="au pf" style={{ ...dl(200), fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, marginBottom: 28 }}>Next Steps</h2>
      {steps.map((s, i) => (
        <div key={i} className="au" style={{ ...dl(400 + i * 150), display: "flex", alignItems: "baseline", gap: 18, marginBottom: 14 }}>
          <span className="mono" style={{ fontSize: 17, fontWeight: 600, width: 28, flexShrink: 0, color: C.white }}>{i + 1}</span>
          <span style={{ fontSize: 16, color: C.body, lineHeight: 1.5 }}>{s}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══ S19: CLOSING ═══ */
const S19 = ({ active }) => {
  const p = usePhase(active, 5, [0, 800, 1600, 2400, 3400]);
  const lines = ["AFC has the portfolio.", "The local currency is already flowing.", "The matching opportunities are already there.", "The only thing missing is the system to capture them."];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
      <Header />
      {lines.map((l, i) => p > i && <p key={i} className="au pf" style={{ fontSize: "clamp(22px, 2.5vw, 28px)", fontWeight: 700, marginBottom: 14, lineHeight: 1.4 }}>{l}</p>)}
      {p >= 5 && <p className="au pf" style={{ fontSize: "clamp(26px, 2.8vw, 32px)", fontWeight: 700, marginTop: 24 }}>We recommend building it now.</p>}
    </div>
  );
};

/* ═══ S20: END CARD ═══ */
const S20 = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    <Header />
    <p className="af" style={{ ...dl(400), fontSize: 16, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Future Africa</p>
    <div className="af" style={{ ...dl(700), width: 40, height: 1, background: C.teal, margin: "18px auto" }} />
    <p className="af" style={{ ...dl(900), fontSize: 14, color: C.muted }}>Cross-Border Treasury and Settlement System</p>
    <p className="af" style={{ ...dl(1100), fontSize: 13, color: C.muted, marginTop: 5 }}>Prepared for Africa Finance Corporation</p>
    <div className="au" style={{ ...dl(1400), marginTop: 40 }}>
      <p style={{ fontSize: 14, fontWeight: 500 }}>Ayo Omomia</p>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>Senior Partner and Co-Founder, Future Africa</p>
    </div>
  </div>
);

/* ═══ ENGINE ═══ */
const SLIDES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20];
const TOTAL = SLIDES.length;

export default function AFCTreasuryPresentation() {
  const [cur, setCur] = useState(0);
  const [grid, setGrid] = useState(false);

  const go = useCallback((i) => { if (i >= 0 && i < TOTAL && i !== cur) setCur(i); }, [cur]);

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
    <div className="afc" style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }} data-testid="afc-treasury-presentation">
      <style>{css}</style>

      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: `${C.white}08`, zIndex: 60 }}>
        <div style={{ height: "100%", background: C.white, width: `${((cur + 1) / TOTAL) * 100}%`, transition: "width 300ms ease-out", opacity: 0.5 }} />
      </div>

      {/* Slides */}
      {SLIDES.map((SC, i) => (
        <div key={i} className="afc-pg" data-active={i === cur ? "true" : "false"} data-testid={`afc-slide-${i + 1}`} style={{ position: "absolute", inset: 0, zIndex: i === cur ? 10 : 0, opacity: i === cur ? 1 : 0, visibility: i === cur ? "visible" : "hidden", transition: "opacity 300ms ease" }}>
          <SC active={i === cur} />
        </div>
      ))}

      {/* Navigation */}
      <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: 12 }}>
        <button className="nav-btn" onClick={() => go(cur - 1)} disabled={cur === 0} data-testid="afc-prev"><ChevronLeft size={14} color={C.white} /></button>
        <button className="nav-btn" onClick={() => go(cur + 1)} disabled={cur === TOTAL - 1} data-testid="afc-next"><ChevronRight size={14} color={C.white} /></button>
      </div>

      {/* Slide counter */}
      <span className="mono" style={{ position: "fixed", bottom: 20, right: 32, fontSize: 11, color: C.muted, zIndex: 50 }}>{String(cur + 1).padStart(2, "0")} / {TOTAL}</span>

      {/* Grid button */}
      <button onClick={() => setGrid(true)} style={{ position: "fixed", bottom: 20, left: 32, background: "transparent", border: "none", cursor: "pointer", opacity: 0.4, zIndex: 50 }} data-testid="afc-grid"><Grid size={15} color={C.white} /></button>

      {/* Grid overlay */}
      {grid && (
        <div className="afc-grid" onClick={() => setGrid(false)}>
          <div style={{ position: "absolute", top: 18, right: 18, cursor: "pointer", zIndex: 210 }} onClick={() => setGrid(false)}><X size={22} color={C.sec} /></div>
          {SLIDES.map((_, i) => (
            <div key={i} className={`th ${i === cur ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); setCur(i); setGrid(false); }}>{String(i + 1).padStart(2, "0")}</div>
          ))}
        </div>
      )}
    </div>
  );
}
