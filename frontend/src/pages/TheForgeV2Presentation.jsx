import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ═══ PALETTE ═══ */
const C = {
  bg: "#0A0705", amber: "#E8791A", bronze: "#A0622A", warm: "#F5EAD7",
  muted: "#B89070", cold: "#070B12", coldBlue: "#2A4B7C", greyBlue: "#5A7A9A",
  white: "#FFFFFF", flash: "#E8791A",
};
const IMG = "/images/theforge";

/* ═══ CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
.fv2 * { box-sizing: border-box; margin: 0; padding: 0; }
.fv2 { font-family: 'Inter', sans-serif; overflow: hidden; background: ${C.bg}; }
.fv2-h { font-family: 'Oswald', 'Arial Narrow', sans-serif; text-transform: uppercase; }

@keyframes fv2-burn { 0% { opacity: 0; text-shadow: 0 0 0 transparent; clip-path: inset(0 100% 0 0); } 40% { opacity: 1; text-shadow: 0 0 20px rgba(232,121,26,0.6); clip-path: inset(0 0% 0 0); } 100% { opacity: 1; text-shadow: 0 0 8px rgba(232,121,26,0.2); clip-path: inset(0 0% 0 0); } }
@keyframes fv2-drop { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fv2-slideL { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fv2-slideR { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fv2-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fv2-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fv2-riseUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fv2-drawH { from { width: 0; } to { width: 100%; } }
@keyframes fv2-drawV { from { height: 0; } to { height: 100%; } }
@keyframes fv2-ignite { 0% { opacity: 0; text-shadow: 0 0 0 transparent; } 30% { opacity: 1; text-shadow: 0 0 30px rgba(232,121,26,0.8); } 100% { opacity: 1; text-shadow: 0 0 10px rgba(232,121,26,0.3); } }
@keyframes fv2-bright { from { filter: brightness(0.05); } to { filter: brightness(1); } }
@keyframes fv2-pulse { 0%,100% { text-shadow: 0 0 8px rgba(232,121,26,0.2); } 50% { text-shadow: 0 0 20px rgba(232,121,26,0.5); } }
@keyframes fv2-emberUp { 0% { transform: translateY(0) scale(1); opacity: 0.5; } 100% { transform: translateY(-100vh) scale(0.3); opacity: 0; } }
@keyframes fv2-crackOpen { 0% { width: 0; opacity: 0; } 30% { width: 120px; opacity: 1; } 100% { width: 200px; opacity: 0.6; } }
@keyframes fv2-heatLine { from { background-position: -200% 0; } to { background-position: 200% 0; } }

/* Active animations */
.fv2-pg[data-active="true"] .ab { animation: fv2-burn 800ms ease-out both; }
.fv2-pg[data-active="true"] .ad { animation: fv2-drop 500ms ease-out both; }
.fv2-pg[data-active="true"] .asl { animation: fv2-slideL 600ms ease-out both; }
.fv2-pg[data-active="true"] .asr { animation: fv2-slideR 600ms ease-out both; }
.fv2-pg[data-active="true"] .af { animation: fv2-fadeIn 600ms ease-out both; }
.fv2-pg[data-active="true"] .au { animation: fv2-fadeUp 600ms ease-out both; }
.fv2-pg[data-active="true"] .ar { animation: fv2-riseUp 600ms ease-out both; }
.fv2-pg[data-active="true"] .adh { animation: fv2-drawH 800ms ease-out both; }
.fv2-pg[data-active="true"] .adv { animation: fv2-drawV 800ms ease-out both; }
.fv2-pg[data-active="true"] .aig { animation: fv2-ignite 800ms ease-out both; }
.fv2-pg[data-active="true"] .abr { animation: fv2-bright 1500ms ease-out both; }

.fv2-pg[data-active="false"] .ab,.fv2-pg[data-active="false"] .ad,
.fv2-pg[data-active="false"] .asl,.fv2-pg[data-active="false"] .asr,
.fv2-pg[data-active="false"] .af,.fv2-pg[data-active="false"] .au,
.fv2-pg[data-active="false"] .ar,.fv2-pg[data-active="false"] .adh,
.fv2-pg[data-active="false"] .adv,.fv2-pg[data-active="false"] .aig,
.fv2-pg[data-active="false"] .abr { opacity: 0; }

/* Flash transition */
.fv2-flash { position: fixed; inset: 0; z-index: 100; background: ${C.amber}; pointer-events: none; opacity: 0; transition: opacity 50ms; }
.fv2-flash.active { opacity: 0.7; }

/* Heat line divider */
.fv2-heat-line { height: 1px; background: linear-gradient(90deg, ${C.amber}, ${C.bronze}44, ${C.amber}); background-size: 200% 100%; }
.fv2-pg[data-active="true"] .fv2-heat-line { animation: fv2-heatLine 2s ease-out both; }

/* Vertical stamp */
.fv2-stamp { writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 0.15em; font-size: 9px; font-weight: 600; text-transform: uppercase; color: ${C.amber}; opacity: 0.5; }

@media print { .fv2-nav { display: none !important; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration: 0.01ms !important; } }
`;

const d = (ms) => ({ animationDelay: `${ms}ms` });

/* Embers - only on select pages */
const Embers = () => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    {Array.from({ length: 14 }).map((_, i) => (
      <div key={i} style={{ position: "absolute", width: 2 + Math.random() * 2, height: 2 + Math.random() * 2, background: C.amber, borderRadius: "50%", left: `${5 + Math.random() * 90}%`, bottom: "-5%", opacity: 0.3 + Math.random() * 0.3, animation: `fv2-emberUp ${7 + Math.random() * 8}s linear ${Math.random() * 6}s infinite` }} />
    ))}
  </div>
);

/* Bronze divider with heat animation */
const HeatDiv = ({ delay = 0, style = {} }) => (
  <div className="adh fv2-heat-line" style={{ ...d(delay), ...style }} />
);

/* Amber number box */
const NumBox = ({ n }) => (
  <div style={{ width: 36, height: 36, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <span className="fv2-h" style={{ color: C.bg, fontSize: 16, fontWeight: 700 }}>{n}</span>
  </div>
);

/* Vertical stamp text */
const VStamp = ({ words, side = "left" }) => (
  <div className="fv2-stamp af" style={{ ...d(3500), position: "absolute", [side]: 12, top: "50%", transform: "translateY(-50%)" }}>
    {words.join(" / ")}
  </div>
);

/* ═══════════════════════════════════════
   PAGE 1 — TITLE REVEAL
   ═══════════════════════════════════════ */
const P1 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
    {/* Crack of light */}
    {active && <div style={{ position: "absolute", top: "54%", left: "50%", transform: "translate(-50%,-50%)", height: 2, background: `radial-gradient(ellipse, ${C.amber}cc, transparent)`, animation: "fv2-crackOpen 2s ease-out 1s both" }} />}
    <div style={{ display: "flex", gap: 4, position: "relative", zIndex: 2 }}>
      {active && "THE FORGE".split("").map((ch, i) => (
        <span key={i} className="aig fv2-h" style={{ ...d(2000 + i * 180), color: C.amber, fontSize: "clamp(44px, 8vw, 96px)", fontWeight: 700, animation: active ? `fv2-ignite 800ms ease-out ${2000 + i * 180}ms both, fv2-pulse 3s ease-in-out ${4000}ms infinite` : "none" }}>{ch === " " ? "\u00A0" : ch}</span>
      ))}
    </div>
    <p className="au" style={{ ...d(4200), color: C.warm, fontSize: "clamp(13px, 1.3vw, 18px)", fontWeight: 300, letterSpacing: "0.2em", marginTop: 16 }}>Fire and Memory</p>
    <Embers />
  </div>
);

/* ═══ PAGE 2 — VIDEO ═══ */
const P2 = ({ active }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (active && ref.current) { ref.current.currentTime = 0; ref.current.play().catch(() => {}); }
    if (!active && ref.current) ref.current.pause();
  }, [active]);
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <video ref={ref} src={`${IMG}/forge-video.mp4`} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted controls={active} data-testid="forgev2-video" />
    </div>
  );
};

/* ═══ PAGE 3 — COVER ═══ */
const P3 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)", position: "relative" }}>
    <h1 className="ad fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 700, lineHeight: 0.95 }}>THE FORGE</h1>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
      <p className="asl" style={{ ...d(600), color: C.warm, fontSize: "clamp(15px, 1.5vw, 22px)", fontWeight: 300, letterSpacing: "0.15em" }}>Fire and Memory</p>
    </div>
    <HeatDiv delay={800} style={{ maxWidth: 200, marginTop: 16, marginBottom: 24 }} />
    <p className="asl" style={{ ...d(1000), color: C.warm, fontSize: "clamp(13px, 1vw, 16px)", maxWidth: 440 }}>A mobile night market empire. An original IP. A cultural reclamation.</p>
    <div className="af" style={{ ...d(1500), marginTop: 28, display: "flex", gap: 16 }}>
      {["BUILD.", "BURN.", "WIN."].map((w, i) => (
        <span key={i} style={{ color: C.amber, fontSize: "clamp(14px, 1.2vw, 18px)", fontWeight: 600, letterSpacing: "0.1em", fontFamily: "'Oswald', sans-serif" }}>{w}</span>
      ))}
    </div>
  </div>
);

/* ═══ PAGE 4 — PITCH LINE ═══ */
const P4 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
    <div style={{ maxWidth: 700 }}>
      {active && <>
        <p className="fv2-h" style={{ color: C.amber, fontSize: "clamp(20px, 2.5vw, 34px)", fontWeight: 600, lineHeight: 1.3 }}>
          {"You are not building a castle.".split(" ").map((w, i) => <span key={i} className="ab" style={{ ...d(300 + i * 80), display: "inline-block", marginRight: 8 }}>{w}</span>)}
        </p>
        <p className="fv2-h" style={{ color: C.amber, fontSize: "clamp(20px, 2.5vw, 34px)", fontWeight: 600, lineHeight: 1.3, marginTop: 8 }}>
          {"You are keeping the fire alive for an entire people.".split(" ").map((w, i) => <span key={i} className="ab" style={{ ...d(1200 + i * 70), display: "inline-block", marginRight: 8 }}>{w}</span>)}
        </p>
      </>}
      <p className="af" style={{ ...d(3000), color: C.warm, fontSize: "clamp(12px, 0.95vw, 15px)", lineHeight: 1.6, marginTop: 32, maxWidth: 600 }}>
        Clash of Clans structure in a Night Market world — grounded in the iron legacy of Meroë, the bronze archives of Benin, and the warrior tradition of the Dahomey Agojie.
      </p>
    </div>
  </div>
);

/* ═══ PAGE 5 — BUILT FROM YOUR WORDS ═══ */
const P5 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
    <div style={{ maxWidth: 700 }}>
      <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(28px, 3vw, 44px)", fontWeight: 700 }}>Built From Your Words</h2>
      <HeatDiv delay={500} style={{ maxWidth: 160, marginTop: 10, marginBottom: 24 }} />
      <p className="asl" style={{ ...d(700), color: C.warm, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>In our conversation you were clear about what a great mobile game needs. Base building as the priority — not collectibles. Resource collection that feels earned through the labor of your avatar. A base that grows into something worth defending. A guild system with real wars and real stakes. A spending loop so natural that the larger bundle always looks smarter.</p>
      <p className="asl" style={{ ...d(1700), color: C.warm, fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>You mentioned Clash of Clans as the benchmark. The guild. The wars. The base. You described the rationalisation — this is my guilty pleasure, let it be.</p>
      <p className="ab" style={{ ...d(2700), color: C.amber, fontSize: 15, fontWeight: 500 }}>THE FORGE was designed from those exact words.</p>
    </div>
  </div>
);

/* ═══ PAGE 6 — THREE ROOTS ═══ */
const P6 = () => {
  const civs = [
    { name: "MEROË", text: "The iron kingdom of Kush. Industrial blast furnaces. Warriors so advanced that Rome paid tribute rather than fight. Warrior queens — the Kandakes — who personally led armies. When Meroë fell, the iron knowledge carried. Across generations. Across an ocean. Into the ground beneath Oja Nla." },
    { name: "BENIN", text: "The bronze-casting guilds whose archive tradition gave us the Market Bronzes. Not decoration. Living memory in metal. When the bronzes were taken, the world lost something irreplaceable. This game is about getting them back." },
    { name: "DAHOMEY", text: "The Agojie. The all-female royal warrior regiment. Two centuries of protecting their kingdom. Not ceremonial. The last to stop fighting. Their tradition crossed the Atlantic and became The Mothers." },
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/bronze-hall.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.25 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg}f0 0%, ${C.bg}cc 65%, transparent 100%)` }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(26px, 2.8vw, 40px)", fontWeight: 700, marginBottom: 8 }}>Three Civilisations. One City.</h2>
        <p className="af" style={{ ...d(400), color: C.warm, fontSize: 14, marginBottom: 20 }}>The game states this clearly. It is the premise, not the subtext.</p>
        {civs.map((c, i) => (
          <div key={i} className="ar" style={{ ...d(700 + i * 800), borderLeft: `3px solid ${C.bronze}`, paddingLeft: 16, marginBottom: 16, maxWidth: 600 }}>
            <span className="fv2-h" style={{ color: C.amber, fontSize: 20, fontWeight: 700 }}>{c.name}</span>
            <p style={{ color: C.warm, fontSize: 12, lineHeight: 1.7, marginTop: 4 }}>{c.text}</p>
          </div>
        ))}
        <p className="ab" style={{ ...d(3500), color: C.amber, fontSize: 14, fontStyle: "italic", marginTop: 8 }}>Nothing in this game is invented. Everything is inherited.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 7 — THE WORLD ═══ */
const P7 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/city-skyline.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg}f5 0%, ${C.bg}dd 50%, transparent 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)", maxWidth: "55%" }}>
      <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 14 }}>Oja Nla — City of the Great Market</h2>
      <p className="asl" style={{ ...d(600), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>On the northern Caribbean coast, built over ancient iron deposits, sits the greatest market city in the Western hemisphere.</p>
      <p className="asl" style={{ ...d(1200), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>The founding engineers drew on the Meroitic blast furnace tradition to build Forge Wells into the earth and Forge Veins through every district. The heat was communal.</p>
      <p className="asl" style={{ ...d(1800), color: C.white, fontSize: 15, fontWeight: 500, marginBottom: 10 }}>Then the Tremble happened. Forty-one people died.</p>
      <p className="asl" style={{ ...d(2400), color: C.amber, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>Within three years, Sovereign Systems had privatised The Forge entirely. And twenty-two Market Bronzes went into a basement downtown.</p>
      <p className="ab" style={{ ...d(3200), color: C.amber, fontSize: 14, fontWeight: 500 }}>Coco Baptise refused to let that be the end. For fifty years she kept it burning. Then she was gone.</p>
    </div>
  </div>
);

/* ═══ PAGE 8 — FORGE SYSTEM ═══ */
const P8 = () => {
  const terms = [
    ["FORGE WELLS", "Shafts drilled into the ore deposits in the Meroitic tradition."],
    ["FORGE VEINS", "Iron conduits running beneath every market district, carrying radiant dry heat upward."],
    ["FORGE HEAT", "Your lifeline. Generated by Wells. Consumed in real time. If heat hits zero — the market goes cold."],
  ];
  return (
    <div style={{ height: "100%", display: "flex", position: "relative" }}>
      <div style={{ width: "45%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 64px)", background: C.bg }}>
        <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 4 }}>Not Electricity. Not Magic. Iron.</h2>
        <p className="af" style={{ ...d(500), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>Dry heat — the same radiant warmth that powered Meroë's blast furnaces, stored in Caribbean iron ore deposits, accessed through engineering principles carried across the Atlantic.</p>
        {terms.map(([name, desc], i) => (
          <div key={i} className="ar" style={{ ...d(900 + i * 500), display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 3, background: C.amber, borderRadius: 1, flexShrink: 0 }} />
            <div>
              <span className="fv2-h" style={{ color: C.amber, fontSize: 14, fontWeight: 600 }}>{name}</span>
              <p style={{ color: C.warm, fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>{desc}</p>
            </div>
          </div>
        ))}
        <p className="af" style={{ ...d(2800), color: C.warm, fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>The feedback loop: your market economy powers your combat. Building is combat preparation.</p>
      </div>
      <div style={{ width: "55%", position: "relative" }}>
        <img src={`${IMG}/ketura.jpg`} alt="" className="af" style={{ ...d(400), width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </div>
  );
};

/* ═══ PAGE 9 — BRONZE HALL ═══ */
const P9 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/empty-cases.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} /></div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg}f0 0%, ${C.bg}bb 60%, transparent 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)", maxWidth: "60%" }}>
      <span className="af fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 700, opacity: 0.3 }}>22</span>
      <h2 className="ab fv2-h" style={{ ...d(600), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 14 }}>The Archive That Must Be Completed</h2>
      <p className="asl" style={{ ...d(900), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>The Market Bronzes were cast in the direct tradition of the Benin bronze archives — living memory in metal.</p>
      <p className="asl" style={{ ...d(1500), color: C.amber, fontSize: 15, fontWeight: 500, marginBottom: 10 }}>Twenty-two pieces were taken twenty-five years ago. Legally acquired. Documented. Gone.</p>
      <p className="asl" style={{ ...d(2100), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>Forty-one remain. Their cases are lit from below by forge warmth. The empty cases read: PENDING RETURN.</p>
      <p className="asl" style={{ ...d(2700), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>In the game — Bronze Fragments drop in Forge Runs and combat. Each piece grants a permanent passive buff. The archive is not decoration. It is power.</p>
      <p className="ab" style={{ ...d(3400), color: C.amber, fontSize: "clamp(15px, 1.3vw, 18px)", fontWeight: 600 }}>Win three consecutive Grand Oja championships. Trigger the legal petition. Bring them home.</p>
    </div>
  </div>
);

/* ═══ CHARACTER TEMPLATE (SPLIT LAYOUT) ═══ */
const CharSplit = ({ name, subtitle, intro, paras, stamps, imgSrc, imgSide = "right", highlight, bgColor = C.bg, titleColor = C.amber, accentColor = C.amber, subtitleColor = C.bronze }) => (
  <div style={{ height: "100%", display: "flex", flexDirection: imgSide === "left" ? "row-reverse" : "row", position: "relative", background: bgColor }}>
    <div style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 64px)", position: "relative" }}>
      <h2 className="ad fv2-h" style={{ ...d(300), color: titleColor, fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, textAlign: imgSide === "left" ? "right" : "left" }}>{name}</h2>
      <p className="af" style={{ ...d(600), color: subtitleColor, fontSize: 14, marginBottom: 12, textAlign: imgSide === "left" ? "right" : "left" }}>{subtitle}</p>
      {intro && <p className="af" style={{ ...d(800), color: C.warm, fontSize: 15, fontWeight: 500, marginBottom: 14, textAlign: imgSide === "left" ? "right" : "left" }}>{intro}</p>}
      {paras.map((p, i) => (
        <p key={i} className="asl" style={{ ...d(1100 + i * 600), color: p === highlight ? titleColor : C.warm, fontSize: p === highlight ? 15 : 13, fontWeight: p === highlight ? 500 : 400, lineHeight: 1.7, marginBottom: 8, textAlign: imgSide === "left" ? "right" : "left", maxWidth: 460 }}>{p}</p>
      ))}
      <VStamp words={stamps} side={imgSide === "left" ? "right" : "left"} />
    </div>
    <div style={{ width: "50%", position: "relative", overflow: "hidden" }}>
      <img src={imgSrc} alt="" className="af" style={{ ...d(200), width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  </div>
);

/* ═══ PAGES 10-14 — CHARACTERS ═══ */
const P10 = () => <CharSplit name="THE KEEPER" subtitle="Market Steward — Player Character" intro="Not family. Not an heir. Coco's protégé." paras={["She taught you how to read a crowd. How to drill a bootleg Forge tap in the dark. How to run a market night so electric that people talk about it for years.", "When the heirs deadlocked, the Vendors' Council invoked her own law. You were appointed Keeper.", "The market does not belong to you yet.", "Prove it should."]} highlight="Prove it should." stamps={["APPOINTED", "NOT INHERITED", "EARNED"]} imgSrc={`${IMG}/keeper.jpg`} />;

const P11 = () => <CharSplit name="ADESUWA" subtitle="Leader — The First Mothers" intro="Four months alone. No instruction. She just stayed." paras={["The eldest active Mother. Her order carries the Agojie tradition — the all-female warrior regiment of Dahomey that protected its kingdom for two centuries. Adesuwa leads the intelligence faction.", "She backed your appointment before anyone else. Not because she trusts you. Because the market needed someone.", "She is your eyes and ears. Earn her."]} stamps={["GUARDIAN", "INTELLIGENCE", "THE FIRST MOTHERS"]} imgSrc={`${IMG}/adesuwa.jpg`} />;

const P12 = () => <CharSplit name="KETURA PIERRE" subtitle="Leader — The Underground" intro={null} paras={["She does not want legitimacy. She wants to hold the line.", "Her grandmother drilled the first bootleg tap. Her mother maintained it through privatisation. She has been running counter-operations for fifteen years.", "She knows where every ancient Meroitic ore seam is — the deep Wells that Sovereign has never found because they didn't build them.", "She is loyal to the oath. Not to you. Not yet."]} highlight="She does not want legitimacy. She wants to hold the line." stamps={["OPERATOR", "UNDERGROUND", "DEEP WELLS"]} imgSrc={`${IMG}/ketura.jpg`} />;

const P13 = () => <CharSplit name="ADUKE" subtitle="Institutional Historian — Bronze Hall Curator" intro="Twenty years. Every record. Every provenance. Every legal filing Coco made and lost." paras={["She knows the history of all twenty-two stolen Bronzes by heart. She knows which of Hale's legal arguments are strong and which ones Coco spent years quietly dismantling.", "When you recover a Bronze, Aduke narrates the installation. Her voice is how the game tells you what you have won back.", "Every Memory Shard sounds like her translating Coco's handwriting for the first time."]} highlight="Every Memory Shard sounds like her translating Coco's handwriting for the first time." stamps={["ARCHIVIST", "MEMORY", "THE HALL"]} imgSrc={`${IMG}/aduke.jpg`} imgSide="left" />;

const P14 = () => <CharSplit name="MARCUS HALE" subtitle="CEO — Sovereign Systems" intro={null} paras={["He was there when the ground opened. He built the only thing standing between this city and another collapse.", "He also owns The Forge. He holds the twenty-two Bronzes in a climate-controlled basement. He is offering to return them — on his terms.", "He is not trying to destroy the market. He is offering to save it. That is the distinction that makes him the most dangerous person in Oja Nla.", "\"I was there when the ground opened. Were you?\"", "He came with a solution. He stayed as an owner."]} highlight="He came with a solution. He stayed as an owner." stamps={["STRATEGIST", "SOVEREIGN", "THE OFFER"]} imgSrc={`${IMG}/marcus-hale.jpg`} bgColor={C.cold} titleColor={C.coldBlue} accentColor={C.coldBlue} subtitleColor={C.greyBlue} />;

/* ═══ PAGE 15 — THREE HEIRS ═══ */
const P15 = () => {
  const heirs = [
    { name: "DAYO", sub: "The Moderniser", text: "Coco's eldest son. MBA, investors ready, premium vision. Every commercially sensible decision he advocates erodes what made the market worth fighting for." },
    { name: "SIMONE", sub: "The Preservationist", text: "Coco's daughter. City councillor, heritage protection vision. Preservation without growth is a slow death with better lighting." },
    { name: "RUBEN", sub: "The Corporate", text: "Coco's nephew. Sovereign regional director, legal property claim. His version of stability is Sovereign's ownership with a family face on it." },
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/heirs.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.2 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: `${C.bg}dd` }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 0 40px" }}>
        <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, padding: "0 clamp(32px, 5vw, 80px)", marginBottom: 20 }}>Three People Who Think You Are a Puppet</h2>
        {heirs.map((h, i) => (
          <div key={i} className="ar" style={{ ...d(600 + i * 700), borderTop: `1px solid ${C.bronze}44`, background: `${C.bg}aa`, backdropFilter: "blur(4px)", padding: "14px clamp(32px, 5vw, 80px)", display: "flex", gap: 14, alignItems: "baseline" }}>
            <span className="fv2-h" style={{ color: C.amber, fontSize: 16, fontWeight: 700, minWidth: 80 }}>{h.name}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>{h.sub}</span>
            <span style={{ color: C.warm, fontSize: 12, marginLeft: 8 }}>{h.text}</span>
          </div>
        ))}
        <p className="af" style={{ ...d(3000), color: C.warm, fontSize: 12, padding: "12px clamp(32px, 5vw, 80px) 0" }}>Let any heir reach maximum Influence and they override you — each with permanently different consequences. All three are occasionally right.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 16 — GRAND OJA ═══ */
const P16 = () => {
  const rivals = [
    { name: "OUSMANE SOW", text: "Nouvelle Rive. Three-time runner-up to Coco." },
    { name: "ADJUA MENSAH", text: "The Loom. Most disciplined competitor. Five years of preparation." },
    { name: "ZARA OBI", text: "Spark Row. First-time entrant. Completely unbothered." },
    { name: "THE SESSION", text: "Rhythm Yard. A collective. Nobody agrees. Dangerous anyway." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", position: "relative" }}>
      <div style={{ width: "55%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 64px)", background: C.bg }}>
        <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(20px, 2vw, 30px)", fontWeight: 700, marginBottom: 10, lineHeight: 1.2 }}>Five Districts. One Competition. Twenty Years of Free Heat.</h2>
        <p className="af" style={{ ...d(500), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>Every twenty years Oja Nla holds The Grand Oja. Five districts. The winner receives The Master Forge — twenty years of free heat.</p>
        <p className="af" style={{ ...d(1000), color: C.amber, fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>Coco wrote a provision into the charter: win three consecutive championships and you earn the right to petition for repatriation. She won two. You need one.</p>
        <p className="af" style={{ ...d(1500), color: C.warm, fontSize: 13, fontStyle: "italic", marginBottom: 16 }}>"Sorry about Coco. I assume you won't be entering this cycle?"</p>
        {rivals.map((r, i) => (
          <div key={i} className="asl" style={{ ...d(2000 + i * 400), display: "flex", gap: 10, marginBottom: 8, alignItems: "baseline" }}>
            <span className="fv2-h" style={{ color: C.amber, fontSize: 13, fontWeight: 600, minWidth: 120 }}>{r.name}</span>
            <span style={{ color: C.warm, fontSize: 11 }}>{r.text}</span>
          </div>
        ))}
      </div>
      <div style={{ width: "45%", position: "relative" }}>
        <img src={`${IMG}/rivals.jpg`} alt="" className="af" style={{ ...d(300), width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </div>
  );
};

/* ═══ PAGE 17 — GAME LOOP ═══ */
const P17 = () => {
  const steps = [
    ["01", "HARVEST", "Carry ore crates. Clear Forge Veins. Test food stalls. Fatigue slows progress — or spend to skip."],
    ["02", "UPGRADE", "Market HQ, Stalls Row, Workshop, Vault, Crew House. Each zone grows independently."],
    ["03", "RUN", "Forge Runs. 5–12 minutes. Pick champion. Pick 2 Amps. Three rooms. Fight."],
    ["04", "DEPOSIT", "Loot to the Vault. Net Worth climbs. That number is always visible."],
    ["05", "TRADE", "Player Market. Quick Swap for a market fee. The hustle is in the economy."],
    ["06", "REUNITE", "Market Alliance. Joint raids. Mothers Alliance Bonus when factions unify."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/market-builds.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: `${C.bg}ee` }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 20 }}>The Loop Is Proven. The World Is Original.</h2>
        <div style={{ position: "relative", paddingLeft: 48 }}>
          {/* Connecting line */}
          <div className="adv" style={{ ...d(2600), position: "absolute", left: 17, top: 0, width: 2, background: C.amber, borderRadius: 1 }} />
          {steps.map(([num, title, body], i) => (
            <div key={i} className="ad" style={{ ...d(400 + i * 300), display: "flex", gap: 12, marginBottom: 14, position: "relative" }}>
              <NumBox n={num} />
              <div>
                <span className="fv2-h" style={{ color: C.amber, fontSize: 13, fontWeight: 600 }}>{title}</span>
                <p style={{ color: C.warm, fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="ab" style={{ ...d(2800), color: C.amber, fontSize: 14, fontWeight: 500, marginTop: 10 }}>Every action feeds the next. No dead ends.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 18 — OJA ÌFÉ ═══ */
const P18 = ({ active }) => (
  <div style={{ height: "100%", position: "relative", background: "#010101" }}>
    <div className={active ? "abr" : ""} style={{ ...d(1500), position: "absolute", inset: 0, filter: "brightness(0.05)" }}>
      <img src={`${IMG}/mothers-united.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #010101cc 0%, #01010166 50%, #01010133 100%)" }} />
    {active && <Embers />}
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 clamp(32px, 5vw, 80px) 50px" }}>
      <h2 className="ab fv2-h" style={{ ...d(300), color: C.amber, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 4 }}>Oja Ìfé — The Moment That Keeps Players Coming Back</h2>
      <p className="af" style={{ ...d(600), color: C.muted, fontSize: 13, marginBottom: 12 }}>Based on the Dahomey Customs — the annual ceremony where the kingdom returned wealth to the people.</p>
      <p className="af" style={{ ...d(1000), color: C.warm, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 600 }}>Once a month every alliance contributes resources to fire a shared deep Forge Well simultaneously. Every allied market blazes at full heat at once.</p>
      <p className="af" style={{ ...d(1600), color: C.warm, fontSize: 13, marginBottom: 12, maxWidth: 600 }}>Fail to contribute enough and the Well does not fire. The market stays cold for another month.</p>
      <div className="af" style={{ ...d(2200), border: `1px solid ${C.amber}`, borderRadius: 4, padding: "10px 14px", display: "inline-block", maxWidth: 400 }}>
        <span style={{ color: C.amber, fontSize: 12, fontWeight: 500 }}>24-hour exclusive cosmetic drop. Available once. Gone when it ends.</span>
      </div>
      <p className="af" style={{ ...d(2800), color: C.warm, fontSize: 12, fontStyle: "italic", marginTop: 10 }}>This is the moment players feel like they are part of something that matters. That feeling is retention.</p>
    </div>
  </div>
);

/* ═══ PAGE 19 — WHY HISTORIC ═══ */
const P19 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
    <div style={{ maxWidth: 680 }}>
      <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(28px, 3vw, 44px)", fontWeight: 700, marginBottom: 6 }}>Nothing Like This Exists</h2>
      <HeatDiv delay={500} style={{ maxWidth: 140, marginBottom: 20 }} />
      <p className="asl" style={{ ...d(700), color: C.warm, fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}>No mobile game has ever been built on the iron legacy of Meroë, the bronze archives of Benin, and the warrior tradition of the Dahomey Agojie — with this level of mechanical depth.</p>
      <p className="asl" style={{ ...d(1400), color: C.warm, fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}><span style={{ color: C.amber }}>When something feels like ours — we wear it all over ourselves.</span> We spend. We evangelise. <span style={{ color: C.amber, fontSize: 15 }}>Black Panther proved it at the box office. THE FORGE proves it on mobile.</span></p>
      <p className="asl" style={{ ...d(2100), color: C.amber, fontSize: 16, fontWeight: 500, marginBottom: 14 }}>The Mothers are not a side quest. They are the spine.</p>
      <p className="asl" style={{ ...d(2800), color: C.warm, fontSize: 14, lineHeight: 1.8 }}>The Bronze Hall is the most original collectible system in mobile gaming. The most culturally significant objects generate the most economically active player market.</p>
    </div>
  </div>
);

/* ═══ PAGE 20 — MONETISATION ═══ */
const P20 = () => {
  const items = [
    ["01", "Forge Heat Bundles", "$1.99 to $39.99"],
    ["02", "Coin Bundle Upsell", "1,500 Heat for $10 or 6,500 for $40"],
    ["03", "Champion Drops", "Collectible characters with unique Forge Amp abilities"],
    ["04", "Forge Amp Packs", "Rare weapons with iron-and-bronze visual effects"],
    ["05", "Cosmetics and Identity", "Bronze signage, stall skins, Agojie murals"],
    ["06", "Player-to-Player Trading", "Quick Swap, platform takes market fee"],
    ["07", "Oja Ìfé Pass", "Monthly subscription, exclusive festival content"],
    ["08", "District Expansion Packs", "Rooftop forge market, underground iron hall, waterfront pier"],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)" }}>
      <div style={{ maxWidth: 680 }}>
        <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 20 }}>Eight Revenue Streams. All Player-Driven.</h2>
        {items.map(([num, title, desc], i) => (
          <div key={i} className="asl" style={{ ...d(400 + i * 180), display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start", borderBottom: `1px solid ${C.amber}15`, paddingBottom: 10 }}>
            <NumBox n={num} />
            <div style={{ paddingTop: 4 }}>
              <span style={{ color: C.white, fontSize: 13, fontWeight: 500 }}>{title}</span>
              <span className="af" style={{ ...d(600 + i * 180), color: C.muted, fontSize: 12, marginLeft: 6 }}>— {desc}</span>
            </div>
          </div>
        ))}
        <p className="af" style={{ ...d(2400), color: C.amber, fontSize: 14, fontStyle: "italic", marginTop: 14 }}>The same psychology you described — "what is ninety dollars if this is my guilty pleasure" — built into every layer.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 21 — ROADMAP ═══ */
const P21 = ({ active }) => {
  const months = [
    ["1", "Vision Lock", "Visual style, characters final, Rosebud demo reviewed."],
    ["2", "Core Loop Demo", "Playable market, first Forge Run, first Bronze Fragment."],
    ["3", "Mothers Faction", "Alliance mechanics. Oja Ìfé prototype active."],
    ["4", "Vertical Slice", "Five minutes of complete gameplay, Net Worth live."],
    ["5", "Sprint Testing", "Loop refinement based on feedback."],
    ["6", "Soft Launch Build", "Monetisation integrated. Bronze Hall complete."],
    ["7", "Soft Launch", "Key markets. Data collection begins."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/grand-oja-aerial.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: `${C.bg}ee` }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 24 }}>Seven Months to Soft Launch</h2>
        <div style={{ position: "relative", paddingLeft: 48 }}>
          <div className="adv" style={{ ...d(2800), position: "absolute", left: 17, top: 0, width: 2, background: C.amber, borderRadius: 1 }} />
          {months.map(([num, title, desc], i) => (
            <div key={i} className="ad" style={{ ...d(400 + i * 300), display: "flex", gap: 12, marginBottom: 12, position: "relative" }}>
              <NumBox n={num} />
              <div style={{ paddingTop: 4 }}>
                <span className="fv2-h" style={{ color: C.amber, fontSize: 13, fontWeight: 600 }}>{title}</span>
                <p style={{ color: C.warm, fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="ab" style={{ ...d(3200), color: C.amber, fontSize: 14, fontWeight: 500, marginTop: 10 }}>By the time your next major release lands — THE FORGE is already in market.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 22 — FIVE CHAPTERS ═══ */
const P22 = () => {
  const chs = [
    ["1", "THE COLD MARKET", "Rebuild. Recruit. Drill first tap. Find Coco's voice."],
    ["2", "THE ENTRY", "Grand Oja registration. Ketura opens the Underground. First Fragment."],
    ["3", "THE PRESSURE", "Three heirs escalate. Hargrove agents grow bolder. The Mothers fracture visibly."],
    ["4", "THE GRAND OJA BEGINS", "Judging starts. Sabotage intensifies. The Mothers move toward each other."],
    ["5", "THE GRAND MARKET NIGHT", "The power play. Forge Breakers arrive. The Mothers unite. You win. The Bronzes come home."],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
      <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 24 }}>The Story Roadmap</h2>
      {chs.map(([num, title, desc], i) => (
        <div key={i} className="asr" style={{ ...d(500 + i * 400), display: "flex", alignItems: "stretch", marginBottom: 8, background: `${C.amber}08`, borderRight: `3px solid ${C.amber}`, borderRadius: "4px 0 0 4px" }}>
          <div style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "baseline", flex: 1 }}>
            <span className="fv2-h" style={{ color: C.amber, fontSize: 24, fontWeight: 700, minWidth: 24 }}>{num}</span>
            <div>
              <span className="fv2-h" style={{ color: C.amber, fontSize: 13, fontWeight: 600 }}>{title}</span>
              <p style={{ color: num === "5" ? C.amber : C.warm, fontSize: 12, lineHeight: 1.4, marginTop: 2, fontWeight: num === "5" ? 500 : 400 }}>{desc}</p>
            </div>
          </div>
        </div>
      ))}
      <p className="af" style={{ ...d(3000), color: C.warm, fontSize: 12, marginTop: 16 }}>Each chapter is a season of content. The characters are built for a screen beyond mobile. The game is the engine.</p>
    </div>
  );
};

/* ═══ PAGE 23 — THE ASK ═══ */
const P23 = () => (
  <div style={{ height: "100%", display: "flex", position: "relative" }}>
    <div style={{ width: "55%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 64px)", background: C.bg }}>
      <h2 className="ab fv2-h" style={{ ...d(200), color: C.amber, fontSize: "clamp(28px, 3vw, 44px)", fontWeight: 700, marginBottom: 6 }}>Three Decisions. Two Weeks.</h2>
      <HeatDiv delay={500} style={{ maxWidth: 160, marginBottom: 28 }} />
      {[
        ["01", "Review the demo and tell us which concept direction you want to build."],
        ["02", "Approve the concept so we begin the full build sprint."],
        ["03", "Confirm a follow-up call within two weeks."],
      ].map(([num, text], i) => (
        <div key={i} className="ad" style={{ ...d(800 + i * 1000), display: "flex", gap: 12, marginBottom: 18, alignItems: "flex-start" }}>
          <NumBox n={num} />
          <p style={{ color: C.warm, fontSize: 14, lineHeight: 1.6, paddingTop: 6 }}>{text}</p>
        </div>
      ))}
      <p className="af" style={{ ...d(3800), color: C.warm, fontSize: 13, marginTop: 10 }}>The game can be in soft launch condition within seven months of a green light.</p>
      <p className="ab fv2-h" style={{ ...d(5000), color: C.amber, fontSize: "clamp(16px, 1.4vw, 20px)", fontWeight: 600, marginTop: 24 }}>The cases will not stay empty.</p>
    </div>
    <div style={{ width: "45%", position: "relative" }}>
      <img src={`${IMG}/title-card.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.2 }} />
    </div>
  </div>
);

/* ═══ PAGE 24 — BACK COVER ═══ */
const P24 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    <Embers />
    {active && <div className="af" style={{ ...d(200), position: "absolute", width: 250, height: 250, borderRadius: "50%", background: `radial-gradient(circle, rgba(232,121,26,0.1) 0%, transparent 70%)`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />}
    <h1 className={active ? "af" : ""} style={{ ...d(600), color: C.amber, fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2 }}>THE FORGE</h1>
    <p className="au" style={{ ...d(1200), color: C.warm, fontSize: "clamp(14px, 1.3vw, 18px)", fontWeight: 300, letterSpacing: "0.2em", marginTop: 12 }}>Fire and Memory</p>
    <div className="af" style={{ ...d(1800), marginTop: 24, display: "flex", gap: 16 }}>
      {["BUILD.", "BURN.", "WIN."].map((w, i) => (
        <span key={i} style={{ color: C.amber, fontSize: "clamp(14px, 1.2vw, 18px)", fontWeight: 600, letterSpacing: "0.1em", fontFamily: "'Oswald', sans-serif" }}>{w}</span>
      ))}
    </div>
    <p className="af" style={{ ...d(2800), color: C.bronze, fontSize: 10, marginTop: 44, letterSpacing: "0.1em" }}>Confidential — All concepts original IP — Not for distribution.</p>
  </div>
);

/* ═══════════════════════════════════════
   MAIN ENGINE
   ═══════════════════════════════════════ */
const PAGES = [P1, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21, P22, P23, P24, P2];
const TOTAL = PAGES.length;

export default function TheForgeV2Presentation() {
  const [cur, setCur] = useState(0);
  const [flash, setFlash] = useState(false);

  const go = useCallback((i) => {
    if (i >= 0 && i < TOTAL && i !== cur) {
      setFlash(true);
      setTimeout(() => { setCur(i); setFlash(false); }, 80);
    }
  }, [cur]);

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
    <div className="fv2" style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }} data-testid="forgev2-presentation">
      <style>{css}</style>
      <div className={`fv2-flash ${flash ? "active" : ""}`} />
      {PAGES.map((PC, i) => (
        <div key={i} className="fv2-pg" data-active={i === cur ? "true" : "false"} data-testid={`forgev2-page-${i + 1}`} style={{ position: "absolute", inset: 0, zIndex: i === cur ? 10 : 0, visibility: i === cur ? "visible" : "hidden" }}>
          <PC active={i === cur} />
        </div>
      ))}
      <div className="fv2-nav" style={{ position: "fixed", bottom: 16, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 24px", gap: 12 }}>
        <button onClick={() => go(cur - 1)} disabled={cur === 0} style={{ width: 32, height: 32, background: "rgba(232,121,26,0.08)", border: `1px solid ${C.amber}33`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === 0 ? 0.15 : 0.6 }} data-testid="forgev2-prev"><ChevronLeft size={14} color={C.amber} /></button>
        <span className="fv2-h" style={{ fontSize: 12, fontWeight: 500, color: `${C.amber}88`, minWidth: 50, textAlign: "center" }} data-testid="forgev2-counter">{cur + 1} / {TOTAL}</span>
        <button onClick={() => go(cur + 1)} disabled={cur === TOTAL - 1} style={{ width: 32, height: 32, background: "rgba(232,121,26,0.08)", border: `1px solid ${C.amber}33`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === TOTAL - 1 ? 0.15 : 0.6 }} data-testid="forgev2-next"><ChevronRight size={14} color={C.amber} /></button>
      </div>
      <div className="fv2-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 2, background: `${C.amber}10`, zIndex: 50 }}>
        <div style={{ height: "100%", background: C.amber, width: `${((cur + 1) / TOTAL) * 100}%`, transition: "width 300ms ease-out" }} />
      </div>
    </div>
  );
}
