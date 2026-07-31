import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Building2, Smartphone, Target, CreditCard, Scale, Zap, TrendingUp, BarChart3, Receipt, LayoutDashboard, CheckCircle2, Clock, X, Calendar, Play, FileText } from "lucide-react";

/* ═══ COLOR SYSTEM ═══ */
const C = {
  crimson: "#B03140", silver: "#B2BAC0", dark: "#0A1628", teal: "#1D9E75",
  tealLight: "#E1F5EE", white: "#FFFFFF", offWhite: "#F8F9FA",
  text: "#1A1A2E", muted: "#6B7280", cardDark: "#132036",
  border: "rgba(255,255,255,0.1)", borderLight: "#E5E7EB",
};

/* ═══ CSS ANIMATION STYLES ═══ */
const animCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.gdl-pres * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
.gdl-pres { overflow: hidden; }

/* Base animation classes */
@keyframes gdl-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes gdl-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes gdl-slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes gdl-drawLine { from { width: 0; } to { width: 80px; } }
@keyframes gdl-drawLineFull { from { width: 0%; } to { width: 100%; } }
@keyframes gdl-scaleIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
@keyframes gdl-slideFromLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes gdl-slideFromRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes gdl-dropIn { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes gdl-charReveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* Active slide animations */
.gdl-slide[data-active="true"] .gdl-anim-fadeUp { animation: gdl-fadeUp 600ms ease-out forwards; }
.gdl-slide[data-active="true"] .gdl-anim-fadeIn { animation: gdl-fadeIn 600ms ease-out forwards; }
.gdl-slide[data-active="true"] .gdl-anim-slideUp { animation: gdl-slideUp 600ms ease-out forwards; }
.gdl-slide[data-active="true"] .gdl-anim-drawLine { animation: gdl-drawLine 600ms ease-out forwards; }
.gdl-slide[data-active="true"] .gdl-anim-scaleIn { animation: gdl-scaleIn 300ms ease-out forwards; }
.gdl-slide[data-active="true"] .gdl-anim-slideLeft { animation: gdl-slideFromLeft 600ms ease-out forwards; }
.gdl-slide[data-active="true"] .gdl-anim-slideRight { animation: gdl-slideFromRight 600ms ease-out forwards; }
.gdl-slide[data-active="true"] .gdl-anim-dropIn { animation: gdl-dropIn 600ms ease-out forwards; }

/* Inactive — hide all animated elements */
.gdl-slide[data-active="false"] .gdl-anim-fadeUp,
.gdl-slide[data-active="false"] .gdl-anim-fadeIn,
.gdl-slide[data-active="false"] .gdl-anim-slideUp,
.gdl-slide[data-active="false"] .gdl-anim-drawLine,
.gdl-slide[data-active="false"] .gdl-anim-scaleIn,
.gdl-slide[data-active="false"] .gdl-anim-slideLeft,
.gdl-slide[data-active="false"] .gdl-anim-slideRight,
.gdl-slide[data-active="false"] .gdl-anim-dropIn { opacity: 0; }

/* Dot grid background */
.gdl-dotgrid {
  background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Slide transitions */
.gdl-slide-container { transition: transform 400ms ease-out; }

/* Print */
@media print { .gdl-nav-el { display: none !important; } .gdl-slide { page-break-after: always; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
`;

const d = (ms) => ({ animationDelay: `${ms}ms`, animationFillMode: "forwards" });

/* ═══ REUSABLE COMPONENTS ═══ */
const SectionLabel = ({ children, color = C.crimson }) => (
  <div className="gdl-anim-fadeUp" style={{ ...d(0), color, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{children}</div>
);
const Heading = ({ children, light = false, style = {} }) => (
  <h2 className="gdl-anim-fadeUp" style={{ ...d(100), color: light ? C.white : C.text, fontSize: "clamp(28px, 3.2vw, 38px)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 8px", ...style }}>{children}</h2>
);
const SubText = ({ children, light = false, style = {} }) => (
  <p className="gdl-anim-fadeUp" style={{ ...d(200), color: light ? "rgba(255,255,255,0.6)" : C.muted, fontSize: "clamp(14px, 1.2vw, 16px)", fontWeight: 400, margin: "0 0 32px", ...style }}>{children}</p>
);

/* Pebbles Logo */
const PebblesLogo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 14, fontWeight: 700 }}>P</div>
    <span style={{ color: C.white, fontSize: 18, fontWeight: 600 }}>Pebbles</span>
  </div>
);
/* GDL Logo */
const GDLLogo = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
    <span style={{ color: C.crimson, fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>GDL</span>
    <div style={{ width: 32, height: 2, background: C.crimson, marginTop: 2 }} />
  </div>
);

/* Counter that counts up when active */
const Counter = ({ value, active, suffix = "", color = C.crimson }) => {
  const [display, setDisplay] = useState(0);
  const numVal = typeof value === "string" ? parseInt(value.replace(/,/g, "")) : value;
  useEffect(() => {
    if (!active) { setDisplay(0); return; }
    const dur = 1200; const steps = 40; const inc = numVal / steps;
    let step = 0;
    const timer = setInterval(() => { step++; setDisplay(Math.min(Math.round(inc * step), numVal)); if (step >= steps) clearInterval(timer); }, dur / steps);
    return () => clearInterval(timer);
  }, [active, numVal]);
  return <span style={{ color, fontSize: "clamp(36px, 4vw, 48px)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{display.toLocaleString()}{suffix}</span>;
};

/* ═══════════════════════════════════════
   SLIDE 1 — COVER
   ═══════════════════════════════════════ */
const S1 = ({ active }) => {
  const title = "GDL × Pebbles";
  return (
    <div className="gdl-dotgrid" style={{ background: C.dark, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "32px 48px" }}>
        <PebblesLogo />
        <GDLLogo />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
        <div className="gdl-anim-fadeIn" style={{ ...d(200), color: C.teal, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 }}>
          STRATEGIC ASSESSMENT & PARTNERSHIP PROPOSAL
        </div>
        <div className="gdl-anim-drawLine" style={{ ...d(400), height: 2, background: C.crimson, margin: "0 auto 24px" }} />
        <h1 style={{ color: C.white, fontSize: "clamp(36px, 4.5vw, 52px)", fontWeight: 700, lineHeight: 1.1, margin: "0 0 16px", display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {active && title.split("").map((ch, i) => (
            <span key={i} className="gdl-anim-fadeUp" style={{ ...d(500 + i * 30), display: ch === " " ? "inline" : "inline-block" }}>
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
          {!active && <span style={{ opacity: 0 }}>{title}</span>}
        </h1>
        <p className="gdl-anim-fadeUp" style={{ ...d(1000), color: C.white, fontSize: "clamp(18px, 1.8vw, 22px)", fontWeight: 300, margin: "0 0 40px" }}>
          A New Infrastructure for a New GDL
        </p>
        <p className="gdl-anim-fadeIn" style={{ ...d(1200), color: C.muted, fontSize: 14, margin: "0 0 8px" }}>
          Prepared for: Kola Ayeye, Executive Vice Chairman & GCEO
        </p>
        <p className="gdl-anim-fadeIn" style={{ ...d(1400), color: C.muted, fontSize: 12 }}>
          Confidential — 2026
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 2 — WHAT WE HEARD
   ═══════════════════════════════════════ */
const S2 = ({ active }) => {
  const cards = [
    { icon: Building2, title: "A Diversified Financial Group", body: "Three licenses. Three businesses. GDL Finance, GDL Asset Management, and GDL Stockbroking — each serving a different dimension of the financial life of the Nigerian middle class." },
    { icon: Smartphone, title: "GDL+ as the One-Stop Platform", body: "One app where a customer can manage their salary, invest in the Money Market Fund, check their stock portfolio, pay bills, and access cheap credit — all in one place, seamlessly." },
    { icon: Target, title: "A Clear Third Behind OPay and Moniepoint", body: "Not eventually. Now. Services so excellent the comparison is undeniable. 100,000 civil servants in year one. A capital raise in April. Q2 go-to-market." },
  ];
  return (
    <div style={{ background: C.offWhite, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <SectionLabel>01 — CONTEXT</SectionLabel>
        <Heading>What We Heard</Heading>
        <SubText style={{ maxWidth: 600 }}>Three conversations. One clear ambition.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
          {cards.map((c, i) => (
            <div key={i} className="gdl-anim-slideUp" style={{ ...d(300 + i * 150), background: C.white, borderRadius: 12, padding: 24, borderLeft: `4px solid ${C.crimson}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <c.icon size={20} color={C.crimson} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{c.body}</div>
            </div>
          ))}
        </div>
        <div className="gdl-anim-fadeUp" style={{ ...d(900), display: "flex", justifyContent: "center", gap: "clamp(24px, 5vw, 64px)", flexWrap: "wrap" }}>
          {[{ val: 3, label: "Conversations" }, { val: 3, label: "Licenses" }, { val: 100000, label: "Target civil servants year 1" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <Counter value={s.val} active={active} />
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 3 — WHAT GDL IS RUNNING TODAY
   ═══════════════════════════════════════ */
const S3 = ({ active }) => {
  const platforms = [
    { label: "GDL FINANCE", title: "Bank One", body: "Core banking. Every deposit, withdrawal, and loan for GDL Finance lives here. Your CBN-regulated financial backbone." },
    { label: "GDL ASSET MANAGEMENT", title: "SingPlus", body: "Fund administration. MMF subscriptions, Canary Fund investments, Income Fund positions, NAV calculations. All managed here." },
    { label: "GDL STOCKBROKERS", title: "Infoware", body: "Stockbroking platform. NSE trades, client securities accounts, portfolio management, daily price lists." },
    { label: "PAYMENT RAILS", title: "NIBSS / NIP", body: "Interbank settlement. Inflows and outflows. Almost fully integrated. Routes through Bank One." },
    { label: "BILLS & COLLECTIONS", title: "Interswitch & Rand", body: "Bills payment and collections. Airtime, data, electricity, cable. Currently in integration discussions." },
  ];
  return (
    <div style={{ background: C.dark, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <SectionLabel color={C.teal}>02 — CURRENT STATE</SectionLabel>
        <Heading light>What GDL Is Running Today</Heading>
        <SubText light>Significant foundations. Significant fragmentation.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          {platforms.map((p, i) => (
            <div key={i} className="gdl-anim-slideUp" style={{ ...d(300 + i * 120), background: C.cardDark, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.crimson}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: C.crimson, marginBottom: 8 }}>{p.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{p.body}</div>
            </div>
          ))}
        </div>
        <div className="gdl-anim-fadeUp" style={{ ...d(1000), background: "rgba(176,49,64,0.15)", borderLeft: `4px solid ${C.crimson}`, borderRadius: 8, padding: "16px 20px" }}>
          <span style={{ color: C.white, fontSize: 15, fontWeight: 500 }}>
            These five platforms do not talk to each other. There is no unified view of the customer. This is the problem we are here to solve.
          </span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 4 — THE COMPLEXITY
   ═══════════════════════════════════════ */
const S4 = () => {
  const items = [
    { n: 1, title: "Payments & Wallet", body: "Salary inflows, deductions, transfers, balance management for hundreds of thousands of users. In real time. Without errors." },
    { n: 2, title: "Lending", body: "Loan booking, reducing balance calculations, deduction at source, default tracking, Lagos State and IPPIS integration." },
    { n: 3, title: "Investments", body: "MMF subscriptions and redemptions, Canary Fund, Income Fund — integrated with SingPlus." },
    { n: 4, title: "Stockbroking", body: "Real-time portfolio visibility powered by Infoware, trading account funding." },
    { n: 5, title: "Bills Payment", body: "Daily utility — airtime, electricity, data, cable. Drives engagement. Keeps customers in the app." },
  ];
  return (
    <div style={{ background: C.offWhite, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <SectionLabel>03 — THE CHALLENGE</SectionLabel>
        <Heading style={{ maxWidth: 700 }}>The Complexity of What You Are Building</Heading>
        <SubText>Most advisors will not say this to you directly.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <div className="gdl-anim-fadeUp" style={{ ...d(300), fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 24 }}>
              You are not building one product. You are building five.
            </div>
            {items.map((it, i) => (
              <div key={i} className="gdl-anim-slideUp" style={{ ...d(400 + i * 120), display: "flex", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.crimson, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{it.n}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{it.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{it.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="gdl-anim-slideRight" style={{ ...d(500) }}>
            <div style={{ background: C.dark, borderRadius: 16, padding: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: C.teal, marginBottom: 8 }}>THE HARDEST PART</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.white, marginBottom: 12 }}>The infrastructure underneath all five products</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
{`Before any product works, the foundation must be solid.

Virtual accounts that receive salaries.
Deductions that happen in seconds at 3am.
Ledgers that track every naira.
Reconciliation that runs every night.
Operations that catch failures before morning.

OPay and Moniepoint are not winning because of their products. They are winning because their infrastructure is bulletproof.

That is the standard you said you want to meet.`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 5 — WHERE GDL IS TODAY
   ═══════════════════════════════════════ */
const S5 = () => {
  const exists = ["NIBSS integration (inflows + outflows)", "Bank One core banking", "Basic deposits and withdrawals", "Money Market Fund on app", "Lagos State lending license", "SingPlus relationship", "Infoware relationship"];
  const inProgress = ["Bills payment (Interswitch/Rand)", "GDL+ app relaunch", "Loan PRD documentation", "Front-end engineer hire"];
  const notBuilt = ["Individual virtual accounts per customer", "Automated loan deduction at source", "Unified wallet across all three businesses", "Reconciliation system", "Real-time admin operations dashboard", "Unified customer identity layer"];
  return (
    <div style={{ background: C.offWhite, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <SectionLabel>04 — GAP ASSESSMENT</SectionLabel>
        <Heading>Where GDL Is Today</Heading>
        <SubText>What exists. What is being built. What is missing.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
          {[{ title: "EXISTS TODAY", color: C.teal, items: exists, Icon: CheckCircle2 },
            { title: "IN PROGRESS", color: "#F59E0B", items: inProgress, Icon: Clock },
            { title: "NOT YET BUILT", color: C.crimson, items: notBuilt, Icon: X }
          ].map((col, ci) => (
            <div key={ci} className="gdl-anim-slideUp" style={{ ...d(300 + ci * 200) }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${col.color}18`, color: col.color, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 16 }}>{col.title}</div>
              {col.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, fontSize: 13, color: C.text }}>
                  <col.Icon size={15} color={col.color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="gdl-anim-fadeUp" style={{ ...d(1100), background: C.dark, borderRadius: 12, padding: 24, textAlign: "center" }}>
          <span style={{ color: C.white, fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>
            The gap between where GDL is and where it needs to be to compete with OPay and Moniepoint is real. The question is how fast you close it.
          </span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 6 — ARCHITECTURE DIAGRAM
   ═══════════════════════════════════════ */
const S6 = ({ active }) => {
  return (
    <div style={{ background: C.dark, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <SectionLabel color={C.teal}>05 — THE SOLUTION</SectionLabel>
        <Heading light>What a Unified Infrastructure Layer Does</Heading>
        <SubText light>One orchestration layer. Five platforms. One customer experience.</SubText>
        {/* Architecture SVG Diagram */}
        <div style={{ position: "relative", width: "100%", maxWidth: 900, margin: "0 auto", height: "clamp(320px, 42vh, 440px)" }}>
          <svg viewBox="0 0 900 440" width="100%" height="100%" style={{ overflow: "visible" }}>
            {/* Connecting lines - draw animation via stroke-dasharray */}
            {active && <>
              {/* Left lines */}
              <line x1="200" y1="110" x2="390" y2="200" stroke="white" strokeWidth="1.5" strokeDasharray="250" strokeDashoffset="250" style={{ animation: "gdl-strokeDraw 400ms ease-out 800ms forwards" }} />
              <line x1="200" y1="220" x2="390" y2="220" stroke="white" strokeWidth="1.5" strokeDasharray="190" strokeDashoffset="190" style={{ animation: "gdl-strokeDraw 400ms ease-out 900ms forwards" }} />
              <line x1="200" y1="330" x2="390" y2="240" stroke="white" strokeWidth="1.5" strokeDasharray="250" strokeDashoffset="250" style={{ animation: "gdl-strokeDraw 400ms ease-out 1000ms forwards" }} />
              {/* Right lines */}
              <line x1="510" y1="200" x2="700" y2="110" stroke="white" strokeWidth="1.5" strokeDasharray="250" strokeDashoffset="250" style={{ animation: "gdl-strokeDraw 400ms ease-out 800ms forwards" }} />
              <line x1="510" y1="220" x2="700" y2="220" stroke="white" strokeWidth="1.5" strokeDasharray="190" strokeDashoffset="190" style={{ animation: "gdl-strokeDraw 400ms ease-out 900ms forwards" }} />
              <line x1="510" y1="240" x2="700" y2="330" stroke="white" strokeWidth="1.5" strokeDasharray="250" strokeDashoffset="250" style={{ animation: "gdl-strokeDraw 400ms ease-out 1000ms forwards" }} />
              {/* Top line */}
              <line x1="450" y1="160" x2="450" y2="60" stroke="white" strokeWidth="1.5" strokeDasharray="100" strokeDashoffset="100" style={{ animation: "gdl-strokeDraw 400ms ease-out 1100ms forwards" }} />
              {/* Bottom lines */}
              <line x1="420" y1="280" x2="340" y2="380" stroke="white" strokeWidth="1.5" strokeDasharray="130" strokeDashoffset="130" style={{ animation: "gdl-strokeDraw 400ms ease-out 1200ms forwards" }} />
              <line x1="480" y1="280" x2="560" y2="380" stroke="white" strokeWidth="1.5" strokeDasharray="130" strokeDashoffset="130" style={{ animation: "gdl-strokeDraw 400ms ease-out 1200ms forwards" }} />
            </>}
            {/* Centre node - Pebbles */}
            <g className="gdl-anim-scaleIn" style={{ ...d(300), transformOrigin: "450px 220px" }}>
              <circle cx="450" cy="220" r="60" fill={C.teal} />
              <text x="450" y="216" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Inter">PEBBLES</text>
              <text x="450" y="234" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9" fontFamily="Inter">Wallet Infrastructure Layer</text>
            </g>
            {/* Top node - GDL+ App */}
            <g className="gdl-anim-dropIn" style={{ ...d(1200) }}>
              <rect x="390" y="16" width="120" height="40" rx="8" fill={C.crimson} />
              <text x="450" y="41" textAnchor="middle" fill="white" fontSize="12" fontWeight="600" fontFamily="Inter">GDL+ App</text>
            </g>
            {/* Left nodes */}
            {[{ y: 94, label: "Bank One" }, { y: 204, label: "SingPlus" }, { y: 314, label: "Infoware" }].map((n, i) => (
              <g key={i} className="gdl-anim-slideLeft" style={{ ...d(500 + i * 150) }}>
                <rect x="80" y={n.y} width="120" height="36" rx="8" fill={C.cardDark} stroke={C.crimson} strokeWidth="1" />
                <text x="140" y={n.y + 22} textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Inter">{n.label}</text>
              </g>
            ))}
            {/* Right nodes */}
            {[{ y: 94, label: "NIBSS" }, { y: 204, label: "Interswitch" }, { y: 314, label: "Assets MFB", sub: "Virtual Accounts" }].map((n, i) => (
              <g key={i} className="gdl-anim-slideRight" style={{ ...d(500 + i * 150) }}>
                <rect x="700" y={n.y} width="120" height={n.sub ? 42 : 36} rx="8" fill={C.cardDark} stroke={C.border} strokeWidth="1" />
                <text x="760" y={n.y + (n.sub ? 18 : 22)} textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Inter">{n.label}</text>
                {n.sub && <text x="760" y={n.y + 34} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="Inter">{n.sub}</text>}
              </g>
            ))}
            {/* Bottom nodes */}
            {[{ x: 290, label: "Civil Servant" }, { x: 510, label: "GDL Customer" }].map((n, i) => (
              <g key={i} className="gdl-anim-fadeIn" style={{ ...d(1300 + i * 100) }}>
                <rect x={n.x} y="380" width="120" height="36" rx="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text x={n.x + 60} y="403" textAnchor="middle" fill="white" fontSize="11" fontWeight="500" fontFamily="Inter">{n.label}</text>
              </g>
            ))}
          </svg>
          <style>{`@keyframes gdl-strokeDraw { to { stroke-dashoffset: 0; } }`}</style>
        </div>
        <p className="gdl-anim-fadeIn" style={{ ...d(1500), textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 16 }}>
          GDL's customers see one app. Pebbles orchestrates everything underneath.
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 7 — WHAT PEBBLES IS
   ═══════════════════════════════════════ */
const S7 = () => {
  const boxes = [
    { label: "WHAT YOU ALREADY DID", title: "Bank One", body: "You did not build your own core banking system. You integrated with Bank One. That decision let GDL focus on financial products, not infrastructure.", dark: false },
    { label: "WHAT YOU ARE DOING NOW", title: "Pebbles", body: "The same decision — applied to your wallet, virtual accounts, deduction engine, and customer orchestration layer.", dark: false },
    { label: "THE OUTCOME", title: "One GDL", body: "One customer. One balance. One experience. All three businesses unified. Competing with OPay from day one.", dark: true },
  ];
  return (
    <div style={{ background: C.offWhite, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <SectionLabel>06 — PEBBLES</SectionLabel>
        <Heading style={{ maxWidth: 640 }}>Pebbles Is the Infrastructure Layer</Heading>
        <SubText style={{ maxWidth: 640 }}>The same decision you made with Bank One.</SubText>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginBottom: 40, flexWrap: "wrap", justifyContent: "center" }}>
          {boxes.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <div className="gdl-anim-slideUp" style={{ ...d(300 + i * 200), background: b.dark ? C.dark : C.white, borderTop: `3px solid ${b.dark ? C.teal : C.crimson}`, borderRadius: 12, padding: 28, width: 280, boxShadow: b.dark ? "none" : "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: b.dark ? C.teal : C.muted, marginBottom: 8 }}>{b.label}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: b.dark ? C.white : C.text, marginBottom: 8 }}>{b.title}</div>
                <div style={{ fontSize: 13, color: b.dark ? "rgba(255,255,255,0.7)" : C.muted, lineHeight: 1.6 }}>{b.body}</div>
              </div>
              {i < 2 && <div className="gdl-anim-fadeIn" style={{ ...d(600 + i * 200), fontSize: 28, color: i === 0 ? C.crimson : C.teal, padding: "0 12px", fontWeight: 300 }}>→</div>}
            </div>
          ))}
        </div>
        <div className="gdl-anim-fadeUp" style={{ ...d(1000), textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ fontSize: "clamp(20px, 2.2vw, 28px)", fontWeight: 600, color: C.text, marginBottom: 8 }}>
            Pebbles does not replace Bank One, SingPlus, or Infoware. It connects them.
          </div>
          <div style={{ fontSize: 15, color: C.muted }}>
            Your existing platforms stay. Your licenses stay. Your brand stays. Pebbles orchestrates everything underneath GDL+ so your customers never see the complexity.
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 8 — WHAT PEBBLES GIVES GDL
   ═══════════════════════════════════════ */
const S8 = () => {
  const caps = [
    { icon: CreditCard, title: "Virtual Accounts", body: "Every customer gets a dedicated account number. Salary lands directly with GDL." },
    { icon: Scale, title: "Unified Wallet + Ledger", body: "Every naira tracked. Double-entry. CBN audit-ready from day one." },
    { icon: Zap, title: "Automatic Deduction at Source", body: "Salary lands. Repayment ring-fenced instantly. GDL never chases a borrower." },
    { icon: TrendingUp, title: "Fund Investment Gateway", body: "MMF, Canary Fund, Income Fund accessible directly from the customer's wallet." },
    { icon: BarChart3, title: "Stockbroking View", body: "Portfolio data from Infoware surfaced inside GDL+. One app. Everything." },
    { icon: Receipt, title: "Bills Payment", body: "Airtime, data, electricity, cable — daily utility that drives app engagement." },
    { icon: LayoutDashboard, title: "Admin Operations Dashboard", body: "Every customer, every balance, every repayment — real time. One view." },
    { icon: CheckCircle2, title: "Automated Reconciliation", body: "Every wallet balanced every night. Mismatches flagged before morning." },
  ];
  return (
    <div style={{ background: C.dark, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <SectionLabel color={C.teal}>07 — CAPABILITIES</SectionLabel>
        <Heading light>What Pebbles Gives GDL Today</Heading>
        <SubText light>Not future promises. Capabilities that exist right now.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {caps.map((c, i) => (
            <div key={i} className="gdl-anim-slideUp" style={{ ...d(300 + i * 100), background: C.cardDark, border: `1px solid rgba(255,255,255,0.08)`, borderLeft: `3px solid ${C.teal}`, borderRadius: 10, padding: 18 }}>
              <c.icon size={18} color={C.teal} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{c.body}</div>
            </div>
          ))}
        </div>
        <div className="gdl-anim-fadeUp" style={{ ...d(1200), background: "rgba(29,158,117,0.15)", borderLeft: `4px solid ${C.teal}`, borderRadius: 8, padding: "16px 20px" }}>
          <span style={{ color: C.white, fontSize: 15, fontWeight: 500 }}>
            All of this. Live. For GDL. Within 30 days of signing.
          </span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 9 — THE DEMO
   ═══════════════════════════════════════ */
const S9 = () => {
  const demos = [
    { n: 1, title: "Civil Servant Onboarding", body: "Watch a civil servant join GDL+ and receive their dedicated account number in real time." },
    { n: 2, title: "Salary Landing + Auto Deduction", body: "See a salary land and the loan repayment deducted automatically — wallet updating live on screen." },
    { n: 3, title: "Bills Payment", body: "A civil servant pays electricity and buys airtime in two taps." },
    { n: 4, title: "MMF Investment", body: "Invest in the GDL Money Market Fund directly from the wallet. Watch it grow." },
    { n: 5, title: "Stock Portfolio View", body: "Dangote Cement, MTN Nigeria, Zenith Bank — the customer's portfolio inside GDL+, powered by GDL Stockbrokers." },
    { n: 6, title: "Admin Dashboard", body: "Nine civil servants. Live loan health. Collection rate. Overdue accounts flagged. Everything GDL needs to manage at scale." },
  ];
  return (
    <div style={{ background: C.offWhite, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <SectionLabel>08 — DEMONSTRATION</SectionLabel>
        <Heading>We Did Not Just Come With Slides</Heading>
        <SubText style={{ maxWidth: 600 }}>We built a working demo of GDL+ powered by Pebbles — using GDL's real products, real fund names, and real customer scenarios.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 36 }}>
          {demos.map((dm, i) => (
            <div key={i} className="gdl-anim-slideUp" style={{ ...d(300 + i * 120), display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.crimson, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{dm.n}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{dm.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{dm.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="gdl-anim-fadeUp" style={{ ...d(1100), textAlign: "center" }}>
          <div style={{ display: "inline-block", background: C.crimson, padding: "16px 48px", borderRadius: 50, cursor: "pointer" }} data-testid="gdl-demo-btn">
            <span style={{ color: C.white, fontSize: 16, fontWeight: 600 }}>&#9654;&nbsp;&nbsp;View Live Demo</span>
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Built specifically for GDL. Every fund name is yours. Every scenario is real.</div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 10 — PATH A vs PATH B
   ═══════════════════════════════════════ */
const S10 = ({ active }) => (
  <div style={{ background: C.dark, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <SectionLabel color={C.teal}>09 — YOUR OPTIONS</SectionLabel>
      <Heading light>Two Paths Forward</Heading>
      <SubText light>We will describe both honestly.</SubText>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* Path A */}
        <div className="gdl-anim-slideUp" style={{ ...d(300), background: C.cardDark, border: `2px solid ${C.teal}`, borderTop: "none", borderRadius: 16, padding: 32, position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: C.teal, borderRadius: "16px 16px 0 0" }} />
          <div style={{ position: "absolute", top: 16, right: 16, background: C.teal, color: C.white, fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "4px 12px", borderRadius: 4 }}>RECOMMENDED</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.white, marginBottom: 16 }}>Integrate with Pebbles</div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 16 }} />
          {["Live in 30 days", "Your brand, your licenses, your platforms", "No infrastructure debt", "Built for Nigerian scale from day one", "Security-first architecture", "Operational before your April board meeting"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: C.white, fontSize: 14, lineHeight: 2 }}>
              <CheckCircle2 size={14} color={C.teal} /> {item}
            </div>
          ))}
          <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", alignItems: "baseline", gap: 6 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Time to market</div>
            <Counter value={30} active={active} color={C.teal} /><span style={{ color: C.white, fontSize: 18 }}>days</span>
          </div>
        </div>
        {/* Path B */}
        <div className="gdl-anim-slideUp" style={{ ...d(500), background: "#0D1F38", border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: C.crimson, borderRadius: "16px 16px 0 0" }} />
          <div style={{ fontSize: 22, fontWeight: 600, color: C.white, marginBottom: 16 }}>Build It Yourself</div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 16 }} />
          {["Full ownership and control", "No platform fees", "Requires 2 senior fintech engineers", "Engineers available (we can source them)", "Infrastructure must be rebuilt from scratch", "Security architecture must be designed and tested"].map((item, i) => (
            <div key={i} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 2 }}>
              <span style={{ color: C.muted, marginRight: 10 }}>—</span>{item}
            </div>
          ))}
          <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", alignItems: "baseline", gap: 6 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Time to market</div>
            <span style={{ color: C.crimson, fontSize: 52, fontWeight: 700 }}>3-6</span><span style={{ color: C.white, fontSize: 18 }}>months</span>
          </div>
        </div>
      </div>
      <p className="gdl-anim-fadeUp" style={{ ...d(900), color: "rgba(255,255,255,0.7)", fontSize: 15, fontStyle: "italic", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
        GDL's advantage is not infrastructure. It is your licenses, your rate, your products, and your credibility. Let Pebbles handle the infrastructure. Let GDL do what GDL is built to do.
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════
   SLIDE 11 — THE 30-DAY PLAN
   ═══════════════════════════════════════ */
const S11 = ({ active }) => {
  const steps = [
    { week: "WEEK 1", title: "Contract & Kickoff", body: "Contract signed. Integration kickoff with Michael's team. Three subsidiary entities configured on Pebbles.", final: false },
    { week: "WEEK 2", title: "Loan Engine & Bills", body: "Loan booking engine configured. Deduction scheduler live. Bills payment integrated.", final: false },
    { week: "WEEK 3", title: "Fund & Portfolio Integration", body: "SingPlus fund gateway live. Infoware portfolio view complete. Full end-to-end testing.", final: false },
    { week: "WEEK 4", title: "GDL+ Goes Live", body: "Pilot launch. First civil servants onboarded. GDL+ powered by Pebbles is live.", final: true },
  ];
  return (
    <div style={{ background: C.offWhite, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <SectionLabel>10 — IMPLEMENTATION</SectionLabel>
        <Heading>Live in 30 Days</Heading>
        <SubText>If GDL decides to move forward with Path A.</SubText>
        {/* Timeline */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
          {/* Progress line */}
          <div style={{ position: "absolute", top: 18, left: "5%", right: "5%", height: 3, background: C.borderLight, zIndex: 0 }}>
            {active && <div style={{ height: "100%", background: C.crimson, animation: "gdl-drawLineFull 1200ms ease-out 400ms forwards", width: 0 }} />}
          </div>
          {steps.map((s, i) => (
            <div key={i} className="gdl-anim-fadeUp" style={{ ...d(400 + i * 200), position: "relative", zIndex: 1, textAlign: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: s.final ? C.teal : C.crimson, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, margin: "0 auto 12px" }}>{i + 1}</div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: C.muted, marginBottom: 4 }}>{s.week}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{s.body}</div>
            </div>
          ))}
        </div>
        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="gdl-anim-slideUp" style={{ ...d(1200), background: C.white, borderLeft: `4px solid ${C.crimson}`, borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>What GDL Provides</div>
            {["SingPlus API credentials", "Infoware read API access", "Settlement account for loan repayments", "Michael's team for integration support"].map((it, i) => (
              <div key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>→ {it}</div>
            ))}
          </div>
          <div className="gdl-anim-slideUp" style={{ ...d(1400), background: C.white, borderLeft: `4px solid ${C.teal}`, borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>What Pebbles Provides</div>
            {["Virtual account infrastructure", "Wallet and ledger system", "Loan deduction engine", "Admin operations dashboard", "Full technical support throughout"].map((it, i) => (
              <div key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>→ {it}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SLIDE 12 — CLOSING
   ═══════════════════════════════════════ */
const S12 = () => (
  <div className="gdl-dotgrid" style={{ background: C.dark, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px" }}>
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div className="gdl-anim-fadeIn" style={{ ...d(0), marginBottom: 24 }}>
        <PebblesLogo />
      </div>
      <div className="gdl-anim-fadeUp" style={{ ...d(200), color: C.teal, fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 24 }}>
        PEBBLES FINANCIAL
      </div>
      <h2 className="gdl-anim-fadeUp" style={{ ...d(400), color: C.white, fontSize: "clamp(28px, 3.8vw, 46px)", fontWeight: 700, lineHeight: 1.1, margin: "0 auto 20px", maxWidth: 700 }}>
        GDL has everything it needs to compete with OPay and Moniepoint.
      </h2>
      <p className="gdl-anim-fadeUp" style={{ ...d(600), color: "rgba(255,255,255,0.6)", fontSize: "clamp(16px, 1.6vw, 20px)", fontWeight: 300, margin: "0 auto 32px", maxWidth: 580 }}>
        The infrastructure to power it is ready. The decision is yours.
      </p>
      <div className="gdl-anim-drawLine" style={{ ...d(800), height: 2, background: C.crimson, margin: "0 auto 36px" }} />
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 48, flexWrap: "wrap" }}>
        {[
          { icon: Calendar, label: "NEXT STEP", text: "Schedule integration kickoff", color: C.teal },
          { icon: Play, label: "DEMO", text: "Live demo available now", color: C.crimson },
          { icon: FileText, label: "CONTACT", text: "pebbles.financial", color: C.teal },
        ].map((item, i) => (
          <div key={i} className="gdl-anim-slideUp" style={{ ...d(1000 + i * 150), background: C.cardDark, padding: "20px 28px", borderRadius: 12, textAlign: "center", minWidth: 180 }}>
            <item.icon size={18} color={item.color} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.white }}>{item.text}</div>
          </div>
        ))}
      </div>
      <p className="gdl-anim-fadeIn" style={{ ...d(1500), color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
        Confidential — Prepared exclusively for GDL Group — 2026
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════
   MAIN PRESENTATION
   ═══════════════════════════════════════ */
const SLIDES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12];
const TOTAL = SLIDES.length;

export default function GDLPebblesPresentation() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < TOTAL) setCurrent(idx);
  }, []);

  /* Keyboard + touch navigation */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

  /* Touch swipe */
  useEffect(() => {
    let startX = 0;
    const onStart = (e) => { startX = e.touches[0].clientX; };
    const onEnd = (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) { diff > 0 ? goTo(current + 1) : goTo(current - 1); }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [current, goTo]);

  return (
    <div className="gdl-pres" ref={containerRef} style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }} data-testid="gdl-presentation">
      <style>{animCSS}</style>
      {/* Slide container */}
      <div className="gdl-slide-container" style={{ transform: `translateY(-${current * 100}vh)` }}>
        {SLIDES.map((SC, i) => (
          <div key={i} className="gdl-slide" data-active={i === current ? "true" : "false"} data-testid={`gdl-slide-${i + 1}`} style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
            <SC active={i === current} />
          </div>
        ))}
      </div>
      {/* Nav — fixed overlay */}
      <div className="gdl-nav-el" style={{ position: "fixed", bottom: 20, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>← → to navigate</span>
        <button onClick={() => goTo(current - 1)} disabled={current === 0} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: current === 0 ? 0.2 : 1 }} data-testid="gdl-prev">
          <ChevronLeft size={16} color="white" />
        </button>
        <button onClick={() => goTo(current + 1)} disabled={current === TOTAL - 1} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: current === TOTAL - 1 ? 0.2 : 1 }} data-testid="gdl-next">
          <ChevronRight size={16} color="white" />
        </button>
        <span style={{ fontSize: 14, fontFamily: "'Inter', monospace", fontWeight: 600, color: "white", minWidth: 50, textAlign: "center" }} data-testid="gdl-counter">{current + 1} / {TOTAL}</span>
      </div>
      {/* Progress bar */}
      <div className="gdl-nav-el" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)", zIndex: 50 }}>
        <div style={{ height: "100%", background: C.crimson, width: `${((current + 1) / TOTAL) * 100}%`, transition: "width 400ms ease-out" }} />
      </div>
    </div>
  );
}
