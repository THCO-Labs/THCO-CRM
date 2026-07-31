import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ═══ PALETTE ═══ */
const C = {
  bg: "#04080F", gold: "#D4860A", copper: "#8B5E2A", sea: "#E8F0EC",
  muted: "#6B8A7A", guild: "#2C3540", coldBg: "#070C12", coldSilver: "#8A9BAA",
  coldBlue: "#4A6A7A", white: "#FFFFFF",
};
const IMG = "/images/tidewar";

/* ═══ CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500&display=swap');
.tw * { box-sizing: border-box; margin: 0; padding: 0; }
.tw { font-family: 'Libre Baskerville', 'Georgia', serif; overflow: hidden; background: ${C.bg}; }
.tw-h { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.18em; }

@keyframes tw-sweepR { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
@keyframes tw-driftL { from { opacity: 0; transform: translateX(-50px) rotate(-0.5deg); } to { opacity: 1; transform: translateX(0) rotate(0deg); } }
@keyframes tw-driftR { from { opacity: 0; transform: translateX(50px) rotate(0.5deg); } to { opacity: 1; transform: translateX(0) rotate(0deg); } }
@keyframes tw-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes tw-fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tw-riseUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tw-dropIn { from { opacity: 0; transform: translateY(-35px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tw-reveal { 0% { opacity: 0; clip-path: inset(0 100% 0 0); } 60% { opacity: 1; clip-path: inset(0 0% 0 0); } 100% { opacity: 1; } }
@keyframes tw-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes tw-currentLine { 0% { transform: translateX(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateX(200vw); opacity: 0; } }
@keyframes tw-drawCurve { from { width: 0; } to { width: 100%; } }
@keyframes tw-bright { from { filter: brightness(0.05); } to { filter: brightness(1); } }
@keyframes tw-brightHalf { from { filter: brightness(0.05); } to { filter: brightness(0.5); } }
@keyframes tw-clockPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.05); opacity: 1; } }
@keyframes tw-appear { from { opacity: 0; } to { opacity: 1; } }

.tw-pg[data-active="true"] .adl { animation: tw-driftL 700ms ease-out both; }
.tw-pg[data-active="true"] .adr { animation: tw-driftR 700ms ease-out both; }
.tw-pg[data-active="true"] .af { animation: tw-fadeIn 600ms ease-out both; }
.tw-pg[data-active="true"] .au { animation: tw-fadeUp 600ms ease-out both; }
.tw-pg[data-active="true"] .ar { animation: tw-riseUp 700ms ease-out both; }
.tw-pg[data-active="true"] .adi { animation: tw-dropIn 500ms ease-out both; }
.tw-pg[data-active="true"] .arv { animation: tw-reveal 900ms ease-out both; }
.tw-pg[data-active="true"] .abr { animation: tw-bright 1800ms ease-out both; }
.tw-pg[data-active="true"] .abrh { animation: tw-brightHalf 1800ms ease-out both; }
.tw-pg[data-active="true"] .aap { animation: tw-appear 300ms ease-out both; }

.tw-pg[data-active="false"] .adl,.tw-pg[data-active="false"] .adr,
.tw-pg[data-active="false"] .af,.tw-pg[data-active="false"] .au,
.tw-pg[data-active="false"] .ar,.tw-pg[data-active="false"] .adi,
.tw-pg[data-active="false"] .arv,.tw-pg[data-active="false"] .abr,
.tw-pg[data-active="false"] .abrh,.tw-pg[data-active="false"] .aap { opacity: 0; }

/* Current sweep transition */
.tw-sweep { position: fixed; inset: 0; z-index: 100; pointer-events: none; overflow: hidden; }
.tw-sweep .tw-sweep-line { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, ${C.gold}55 40%, ${C.gold}aa 50%, ${C.gold}55 60%, transparent 100%); transform: translateX(-110%); }
.tw-sweep.active .tw-sweep-line { animation: tw-sweepR 400ms ease-in-out both; }

/* Current divider */
.tw-divider { height: 1px; background: ${C.copper}; position: relative; overflow: hidden; }
.tw-divider::after { content: ''; position: absolute; top: -1px; left: 30%; width: 40%; height: 3px; background: radial-gradient(ellipse, ${C.copper}88, transparent); border-radius: 50%; }
.tw-pg[data-active="true"] .tw-divider { animation: tw-drawCurve 800ms ease-out both; }

/* Closure clock */
.tw-clock { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; animation: tw-clockPulse 4s ease-in-out infinite; }

/* Vertical annotation */
.tw-vanno { writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 0.15em; font-size: 8px; font-weight: 500; text-transform: uppercase; color: ${C.copper}; opacity: 0.5; font-family: 'Oswald', sans-serif; }

@media print { .tw-nav,.tw-sweep { display: none !important; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration: 0.01ms !important; } }
`;

const d = (ms) => ({ animationDelay: `${ms}ms` });

/* Current Particles — horizontal amber lines moving right */
const CurrentParticles = ({ density = 8, color = C.gold }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    {Array.from({ length: density }).map((_, i) => (
      <div key={i} style={{ position: "absolute", height: 1, width: 40 + Math.random() * 80, background: `linear-gradient(90deg, transparent, ${color}${Math.floor(20 + Math.random() * 40).toString(16)}, transparent)`, left: "-120px", top: `${5 + Math.random() * 90}%`, animation: `tw-currentLine ${6 + Math.random() * 10}s linear ${Math.random() * 8}s infinite` }} />
    ))}
  </div>
);

/* Amber number box */
const NumBox = ({ n, cold }) => (
  <div style={{ width: 34, height: 34, background: cold ? C.coldSilver : C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <span className="tw-h" style={{ color: cold ? C.coldBg : C.bg, fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>{n}</span>
  </div>
);

/* Closure Clock */
const Clock = ({ weeks = 52, cold = false }) => (
  <div className="tw-clock af" style={{ ...d(3500), position: "absolute", bottom: 16, right: 24, zIndex: 20, display: "flex", alignItems: "baseline", gap: 6 }}>
    <span style={{ color: cold ? C.coldSilver : C.copper, fontSize: 10, fontWeight: 500 }}>{weeks} WEEKS</span>
  </div>
);

/* Copper divider with wave */
const WaveDivider = ({ delay = 0, style = {} }) => (
  <div className="tw-divider af" style={{ ...d(delay), maxWidth: 180, ...style }} />
);

/* Vertical annotation */
const VAnno = ({ words, side = "left" }) => (
  <div className="tw-vanno af" style={{ ...d(3500), position: "absolute", [side]: 10, top: "50%", transform: "translateY(-50%)" }}>
    {words.join(" / ")}
  </div>
);

/* ═══ PAGE 1 — TITLE REVEAL ═══ */
const P1 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
    {active && <CurrentParticles density={12} />}
    {active && (
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <h1 className="arv tw-h" style={{ ...d(3000), color: C.gold, fontSize: "clamp(52px, 9vw, 110px)", fontWeight: 700, letterSpacing: "0.25em" }}>TIDE WAR</h1>
        <p className="au" style={{ ...d(4500), color: C.sea, fontSize: "clamp(14px, 1.4vw, 20px)", fontWeight: 400, letterSpacing: "0.3em", marginTop: 12 }}>Current Shift</p>
      </div>
    )}
  </div>
);

/* ═══ PAGE 2 — ONE-SENTENCE PITCH ═══ */
const P2 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 8vw, 140px)", position: "relative" }}>
    <div style={{ maxWidth: 700 }}>
      {active && <>
        <p className="adl tw-h" style={{ ...d(800), color: C.gold, fontSize: "clamp(22px, 2.5vw, 36px)", fontWeight: 600, letterSpacing: "0.15em" }}>The sea moved.</p>
        <p className="adl tw-h" style={{ ...d(2200), color: C.gold, fontSize: "clamp(22px, 2.5vw, 36px)", fontWeight: 600, letterSpacing: "0.15em", marginTop: 24 }}>You were ready.</p>
        <p className="adl tw-h" style={{ ...d(4000), color: C.gold, fontSize: "clamp(26px, 3vw, 42px)", fontWeight: 700, letterSpacing: "0.15em", marginTop: 32 }}>Take the lanes before the clock runs out.</p>
      </>}
    </div>
    <Clock weeks={52} />
  </div>
);

/* ═══ PAGE 3 — COVER ═══ */
const P3 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)", position: "relative" }}>
    {active && <CurrentParticles density={6} />}
    <div style={{ position: "relative", zIndex: 2 }}>
      <h1 className="adl tw-h" style={{ ...d(400), color: C.gold, fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 700, letterSpacing: "0.2em", transform: "rotate(-0.5deg)" }}>TIDE WAR</h1>
      <p className="adr" style={{ ...d(900), color: C.sea, fontSize: "clamp(15px, 1.4vw, 22px)", letterSpacing: "0.25em", marginTop: 8 }}>Current Shift</p>
      <WaveDivider delay={1200} style={{ marginTop: 16, marginBottom: 24 }} />
      <p className="adl" style={{ ...d(1500), color: C.sea, fontSize: "clamp(13px, 1vw, 16px)", maxWidth: 460 }}>A mobile island empire. An original IP. A conquest.</p>
      <div className="af" style={{ ...d(2200), display: "flex", gap: 20, marginTop: 28 }}>
        {["BUILD.", "CLAIM.", "HOLD."].map((w, i) => (
          <span key={i} className="adl tw-h" style={{ ...d(2200 + i * 800), color: C.gold, fontSize: "clamp(15px, 1.3vw, 20px)", fontWeight: 600, letterSpacing: "0.12em" }}>{w}</span>
        ))}
      </div>
    </div>
    <Clock weeks={52} />
  </div>
);

/* ═══ PAGE 4 — BUILT FROM YOUR WORDS ═══ */
const P4 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)", position: "relative" }}>
    <div style={{ maxWidth: 680 }}>
      <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 38px)", fontWeight: 700 }}>Built From What You Said</h2>
      <WaveDivider delay={500} style={{ marginTop: 10, marginBottom: 20 }} />
      <p className="adl" style={{ ...d(700), color: C.sea, fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>In our conversation you were clear about what a great mobile game needs. World building as the foundation. Resource collection that feels earned through the labor of your avatar — you cut the trees, you mine the ore, you haul the cargo. A base that grows into something worth defending. Guild wars with real territory at stake. A spending loop so natural that ninety dollars feels like nothing because you are enjoying yourself too much to stop.</p>
      <p className="adl" style={{ ...d(1400), color: C.sea, fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}>You mentioned Clash of Clans as the benchmark. The guild. The wars. The base. You described the rationalisation — "this is my guilty pleasure, let it be."</p>
      <div style={{ paddingLeft: 16, borderLeft: `2px solid ${C.copper}44` }}>
        {["You said: figure out the metrics of value.", "You said: I don't want to slow down my progress.", "You said: that skin looks really cool, that weapon is really bad."].map((line, i) => (
          <p key={i} className="adl" style={{ ...d(2100 + i * 500), color: C.sea, fontSize: 13, lineHeight: 1.6, marginBottom: 6, fontStyle: "italic" }}>{line}</p>
        ))}
      </div>
      <p className="adl tw-h" style={{ ...d(3800), color: C.gold, fontSize: 16, fontWeight: 600, marginTop: 20, letterSpacing: "0.1em" }}>TIDE WAR was built from those exact words.</p>
      <div style={{ marginTop: 16 }}>
        {["The sea is the map. The Gates are the territory.", "Your dock-fortress is the base.", "The Closure Clock is the war."].map((line, i) => (
          <p key={i} className="adl" style={{ ...d(4200 + i * 300), color: C.sea, fontSize: 12, lineHeight: 1.5 }}>{line}</p>
        ))}
      </div>
    </div>
    <Clock weeks={52} />
  </div>
);

/* ═══ PAGE 5 — THE HUNDRED ISLES ═══ */
const P5 = ({ active }) => (
  <div style={{ height: "100%", position: "relative" }}>
    <div className={active ? "abrh" : ""} style={{ ...d(200), position: "absolute", inset: 0, filter: "brightness(0.05)" }}>
      <img src={`${IMG}/archipelago.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${C.bg}f0 0%, ${C.bg}aa 50%, ${C.bg}55 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 clamp(32px, 5vw, 80px) 50px" }}>
      <h2 className="adl tw-h" style={{ ...d(300), color: C.gold, fontSize: "clamp(26px, 2.8vw, 40px)", fontWeight: 700, marginBottom: 14 }}>The Hundred Isles</h2>
      <p className="adl" style={{ ...d(600), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 620 }}>A mythic Caribbean archipelago. Volcanic peaks, coral atolls, forest islands, flat trade-wind islands where every village faces west and every dock was built facing the lanes.</p>
      <p className="adl" style={{ ...d(1200), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 620 }}>The archipelago runs on Gates — massive seabed engineering structures built by the founding island confederacy centuries ago. Open a Gate and the current-lane activates: ships move in hours instead of days, cargo arrives intact, communities stay connected.</p>
      <p className="adl" style={{ ...d(1800), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 620 }}>For three centuries the Cartographers' Guild has managed every Gate. Every lane contracted. Every captain licensed. An institutional monopoly so old that most people treat it like weather.</p>
      <p className="adl" style={{ ...d(2400), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 14, maxWidth: 620 }}>Three weeks ago the seabed moved. Seven new passages opened that the Guild has no contract on.</p>
      <p className="adl tw-h" style={{ ...d(3200), color: C.gold, fontSize: "clamp(16px, 1.4vw, 22px)", fontWeight: 600, letterSpacing: "0.1em" }}>That condition just changed.</p>
    </div>
    <Clock weeks={52} />
  </div>
);

/* ═══ PAGE 6 — THREE HISTORICAL ROOTS ═══ */
const P6 = () => {
  const roots = [
    { name: "TOBAGO", text: "The most contested island in the Caribbean. Changed hands more than twenty-two times. Not because it was the richest island — because of where it sat. Whoever held Tobago held the windward passage into the whole archipelago. Control the position. Control the movement. Every Tide Gate in this game is a Tobago." },
    { name: "THE HAITIAN REVOLUTION", text: "The first free Black republic in the Western hemisphere was not restored. It was invented. Toussaint Louverture and Dessalines built military capacity at a speed that shocked every professional army they faced. They did not wait for permission. They built for the window that opened. That is the player identity." },
    { name: "THE MAROON MARITIME NETWORKS", text: "Across Jamaica, Suriname, and the smaller islands, Maroon communities built hidden coastal access points — shallow channels through mangroves, false cove entrances, underwater ledges only flat-bottomed local vessels could clear. These were not improvised. They were engineered. Rael Marcelin runs them." },
  ];
  return (
    <div style={{ height: "100%", display: "flex", position: "relative" }}>
      <div style={{ width: "45%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 3vw, 48px)", background: C.bg }}>
        <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 8 }}>Three Histories. One Sea.</h2>
        <p className="af" style={{ ...d(400), color: C.sea, fontSize: 13, marginBottom: 18 }}>The game states this clearly. It is the premise, not the subtext.</p>
        {roots.map((r, i) => (
          <div key={i} className="ar" style={{ ...d(700 + i * 1200), background: `${C.bg}`, border: `1px solid ${C.copper}33`, padding: "10px 14px", marginBottom: 10 }}>
            <span className="tw-h" style={{ color: C.gold, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>{r.name}</span>
            <p style={{ color: C.sea, fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>{r.text}</p>
          </div>
        ))}
        <p className="adl" style={{ ...d(4600), color: C.gold, fontSize: 14, fontStyle: "italic", marginTop: 8 }}>Nothing in this game is invented. Everything is inherited.</p>
      </div>
      <div style={{ width: "55%", position: "relative" }}>
        <img src={`${IMG}/nav-chart.jpg`} alt="" className="af" style={{ ...d(300), width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <Clock weeks={52} />
    </div>
  );
};

/* ═══ PAGE 7 — GATE KEYS ═══ */
const P7 = () => (
  <div style={{ height: "100%", display: "flex", position: "relative" }}>
    <div style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 64px)", background: C.bg }}>
      <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700 }}>Gate Keys</h2>
      <p className="adl" style={{ ...d(500), color: C.sea, fontSize: 15, fontWeight: 400, marginBottom: 14, letterSpacing: "0.05em" }}>The Most Valuable Object in the Sea</p>
      <WaveDivider delay={700} style={{ marginBottom: 16 }} />
      <p className="adl" style={{ ...d(900), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>Gate Keys are ancient lock-devices that wake a dormant Gate and turn a wild passage into a fast lane.</p>
      <p className="adl" style={{ ...d(1500), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>They are built in your Deep Workshop from Relic components recovered in Shift Runs. Each Key is distinct — cast dark iron and aged bronze, carved with hydraulic channels and the geometric patterns of the founding confederacy's engineering guild.</p>
      <p className="adl" style={{ ...d(2100), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>Anchor a Key in a new passage. Hold it for seventy-two hours against everything that comes to pull it out. The claim is yours.</p>
      <p className="adl" style={{ ...d(2700), color: C.gold, fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Owning one before it is anchored is a status signal. Anchoring it successfully is a statement.</p>
      {["Collect them.", "Build them.", "Anchor them before someone else does."].map((line, i) => (
        <p key={i} className="adl tw-h" style={{ ...d(3200 + i * 400), color: C.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", marginBottom: 4 }}>{line}</p>
      ))}
    </div>
    <div style={{ width: "50%", position: "relative", background: "#000" }}>
      <img src={`${IMG}/gate-key.jpg`} alt="" className="af" style={{ ...d(400), width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <Clock weeks={52} />
  </div>
);

/* ═══ PAGE 8 — CLOSURE CLOCK ═══ */
const P8 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
    <div style={{ display: "flex", width: "100%", maxWidth: 900, gap: 40, alignItems: "center", padding: "0 clamp(24px, 4vw, 60px)" }}>
      <div className="af" style={{ ...d(600), flex: "0 0 auto" }}>
        <p className="af" style={{ ...d(200), color: C.sea, fontSize: 14, letterSpacing: "0.15em", textAlign: "center", marginBottom: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>The Clock That Runs Every Session</p>
      </div>
    </div>
    <div className="af" style={{ ...d(1000), textAlign: "center", margin: "30px 0" }}>
      <span className="tw-h" style={{ color: C.gold, fontSize: "clamp(60px, 10vw, 120px)", fontWeight: 700, letterSpacing: "0.15em", animation: active ? "tw-clockPulse 3s ease-in-out infinite" : "none" }}>52 WEEKS</span>
    </div>
    <div style={{ display: "flex", gap: 40, maxWidth: 800, padding: "0 clamp(24px, 4vw, 60px)" }}>
      <div style={{ flex: 1 }}>
        <p className="adl" style={{ ...d(1600), color: C.sea, fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>52 weeks before the Cartographers' Guild completes its emergency regulatory filing and locks every new passage under institutional authority permanently.</p>
        <p className="adl" style={{ ...d(2200), color: C.sea, fontSize: 12, lineHeight: 1.7 }}>Under the founding confederacy's original charter — the document that predates the Guild itself — the rule for unclaimed Gates is simple. First captain to anchor a Gate Key in a new passage and demonstrate seventy-two hours of uninterrupted hold owns the claim.</p>
      </div>
      <div style={{ flex: 1 }}>
        <p className="adr" style={{ ...d(1600), color: C.sea, fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>Active Gate claims registered before the clock hits zero are protected. Everything else belongs to the Guild.</p>
        <p className="adr" style={{ ...d(2200), color: C.sea, fontSize: 12, lineHeight: 1.7 }}>Every week the clock drops by one. Every session the grey creep of Guild filings moves closer to the amber passages on your chart.</p>
      </div>
    </div>
    <p className="adl tw-h" style={{ ...d(3200), color: C.gold, fontSize: "clamp(18px, 1.8vw, 26px)", fontWeight: 600, letterSpacing: "0.12em", marginTop: 30 }}>Move faster than it falls.</p>
  </div>
);

/* ═══ CHARACTER TEMPLATE ═══ */
const CharPage = ({ name, subtitle, intro, paras, highlight, highlightIdx, stamps, imgSrc, imgSide = "right", weeks = 51, dropTitle = false }) => (
  <div style={{ height: "100%", display: "flex", flexDirection: imgSide === "left" ? "row-reverse" : "row", position: "relative", background: C.bg }}>
    <div style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 56px)", position: "relative" }}>
      <h2 className={`${dropTitle ? "adi" : "adl"} tw-h`} style={{ ...d(300), color: C.gold, fontSize: "clamp(28px, 3vw, 44px)", fontWeight: 700, transform: "rotate(-0.3deg)" }}>{name}</h2>
      <p className="af" style={{ ...d(600), color: C.copper, fontSize: 13, marginBottom: 14, letterSpacing: "0.08em" }}>{subtitle}</p>
      {intro && <p className={imgSide === "left" ? "adr" : "adl"} style={{ ...d(800), color: C.sea, fontSize: 15, fontWeight: 400, marginBottom: 14 }}>{intro}</p>}
      {paras.map((p, i) => (
        <p key={i} className={imgSide === "left" ? "adr" : "adl"} style={{ ...d(1100 + i * 600), color: i === highlightIdx ? C.gold : C.sea, fontSize: i === highlightIdx ? 14 : 13, fontWeight: i === highlightIdx ? 500 : 400, fontStyle: p === highlight && highlightIdx === undefined ? "italic" : "normal", lineHeight: 1.7, marginBottom: 8, maxWidth: 440 }}>{p}</p>
      ))}
      <VAnno words={stamps} side={imgSide === "left" ? "right" : "left"} />
    </div>
    <div style={{ width: "50%", position: "relative", overflow: "hidden" }}>
      <img src={imgSrc} alt="" className="af" style={{ ...d(200), width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <Clock weeks={weeks} />
  </div>
);

/* ═══ PAGES 9-17 — CHARACTERS ═══ */
const P9 = () => <CharPage name="THE CAPTAIN" subtitle="Independent Operator — Player Character" intro="You are twenty-six. You grew up in the southern arc." paras={["You watched the independent operator economy of your islands die slowly across your childhood — every dock reclassified, every lane fee raised, every family business that couldn't sustain the toll quietly disappearing.", "You have been charting the deep current anomalies for eight months. Not because anyone trained you. Because something about the way the official charts described these waters never matched what you saw in the data.", "You want to be the first captain from the southern arc to ever own lanes.", "Not borrow them. Not pay to use someone else's.", "Own them.", "You are not chosen. You are prepared. That is the only qualification that matters in a frontier."]} highlightIdx={2} stamps={["PREPARED", "NOT INHERITED", "SOUTHERN ARC"]} imgSrc={`${IMG}/captain.jpg`} weeks={51} />;

const P10 = () => <CharPage name="RAEL MARCELIN" subtitle="Route Runner — Grey Market Navigator" intro="He has been running cargo through routes the Guild doesn't know exist for thirty years." paras={["He knows every hidden passage, every shallow-draft channel, every cove where a vessel can anchor invisibly for three days without a patrol finding it.", "Neither of you has the full picture without the other. Your charts say where. His body says how.", "He does not trust you when the game starts. He will say this directly. He ran this operation without you and would prefer to keep running it without you.", "Practical need is the foundation. The rest develops."]} highlightIdx={1} stamps={["THIRTY YEARS", "HIDDEN ROUTES", "NO TRUST YET"]} imgSrc={`${IMG}/rael.jpg`} imgSide="left" weeks={51} />;

const P11 = () => <CharPage name="NAYA CELESTIN" subtitle="Charter Scholar — Legal Protection" intro="Her father spent twenty years documenting current readings the Guild publicly declared incorrect." paras={["Three weeks ago the sea proved him right.", "She has been carrying his journals for two years, moving between vessels, trading navigational knowledge for passage, waiting for someone with enough active Gate claims to make her father's research matter in the present tense.", "Your Key anchors are her evidence. Her charter knowledge is your legal protection. The founding confederacy's original charter authorises exactly what you are doing. She has it.", "Neither of you chose the other. The work chose you both."]} highlightIdx={0} stamps={["TWENTY YEARS", "THE CHARTER", "PROOF READY"]} imgSrc={`${IMG}/naya.png`} weeks={51} />;

const P12 = () => <CharPage name="MARLENE DURAND" subtitle="Fleet Shipwright — Builder" intro="The best builder in the southern islands. Lineage tracing to the founding confederacy's original fleet engineers." paras={["She has been doing contract work for the Guild and Sovereign Wake alike because she needed to eat. She is done with both of them.", "She arrived at your dock with tools and three half-finished hulls she owns outright.", "The hull she is building right now is the fastest she has ever made. She knows it. She is not saying so. She is just building faster.", "She also holds the original founding confederacy ship-design documents — hull configurations structurally optimised for Shift passage conditions that the Guild has been actively suppressing for forty years."]} highlightIdx={0} stamps={["FOUNDING LINEAGE", "SUPPRESSED DESIGNS", "BUILDING NOW"]} imgSrc={`${IMG}/marlene.jpg`} weeks={51} dropTitle />;

const P13 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <div style={{ position: "absolute", inset: 0 }}>
      <img src={`${IMG}/kezia.jpg`} alt="" className="af" style={{ ...d(200), width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg}f0 0%, ${C.bg}cc 45%, transparent 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 70px)", maxWidth: "50%" }}>
      <h2 className="adl tw-h" style={{ ...d(300), color: C.gold, fontSize: "clamp(28px, 3vw, 44px)", fontWeight: 700 }}>KEZIA JOSEPH</h2>
      <p className="af" style={{ ...d(600), color: C.copper, fontSize: 13, marginBottom: 14 }}>Deep Diver — Relic Recovery</p>
      <p className="adl" style={{ ...d(800), color: C.sea, fontSize: 15, fontWeight: 400, marginBottom: 14 }}>She runs the dives other captains refuse.</p>
      <p className="adl" style={{ ...d(1400), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>Collapsed passage chambers. Active thermal vents. Gate structures at operational depth with three centuries of sediment on the pivot arms.</p>
      <p className="adl" style={{ ...d(2000), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>She does not have the activation sequence knowledge. She has the physical knowledge of every Gate's interior configuration. When she combines that with Naya's charter documentation, the Gates activate faster than any rival captain can match.</p>
      <p className="adl" style={{ ...d(2600), color: C.gold, fontSize: 14, fontWeight: 500 }}>She is also the person who drives the Gate Key into the chamber. The claim begins with her hands.</p>
      <VAnno words={["FOUR GATES ALREADY", "THE ANCHOR", "DEEP WATER"]} side="left" />
    </div>
    <Clock weeks={51} />
  </div>
);

const P14 = () => <CharPage name="DR. SIMONE BEAUMONT" subtitle="Maritime Historian — Legal Architect" intro="Twenty years building the most complete historical record of founding confederacy Gate management that exists." paras={["The Guild considers her work a nuisance. Sovereign Wake considers her irrelevant. She considers them a temporary problem.", "She is the person who makes everything permanent. Every Gate you claim she documents in historical context — what it was, who built it, what the founding charter says about its authority.", "She has been waiting for someone with enough active Gate claims to make the historical record matter in the present tense.", "In the final act, she drafts the Free Passage Compact — the governance document that becomes the new order because you have already built it in practice."]} highlightIdx={0} stamps={["TWO DECADES", "THE COMPACT", "PERMANENT RECORD"]} imgSrc={`${IMG}/simone.png`} weeks={51} />;

const P15 = () => <CharPage name="ADMIRAL LENNOX CARTY" subtitle="Legendary Captain — Strategic Counsel" intro="The greatest independent fleet captain the Hundred Isles ever produced." paras={["Thirty years ago he ran the largest independent fleet in the southern arc — until Sovereign Wake's fee increases made it economically unviable. He sold his last ship himself.", "He came back because he saw what you are building and recognised it. He built the same thing once. He got further than you are now and lost it.", "His presence changes the political dynamics of the archipelago immediately. What he endorses becomes credible.", "He endorses you.", "In the archipelago, that is worth more than three Gate claims."]} highlightIdx={1} stamps={["THIRTY YEARS", "LOST ONCE", "BACK NOW"]} imgSrc={`${IMG}/admiral-new.jpg`} weeks={51} dropTitle />;

const P16 = () => <CharPage name="SOLANGE RIVIÈRE" subtitle="Trade Strategist — Market Economy" intro={null} paras={["The economy doesn't wait for the paperwork to catch up.", "She has been operating in the space between Sovereign Wake's managed system and the grey-market networks her entire career. She understands both sides well enough to see the arbitrage opportunities the Current Shift has created.", "She is at your dock because your Gate claims, if they hold, create the lane access her family needs to stop depending on Sovereign Wake's partial exemption deal. Your success is her leverage. That has always been enough for Solange.", "She runs the Trade Pier. She built the Quick Swap system before you arrived. She is the reason the new lane economy is already generating revenue.", "She is the reason the Warehouse is always full."]} highlightIdx={0} stamps={["GREY MARKET", "QUICK SWAP", "THE PIER RUNS"]} imgSrc={`${IMG}/solange.jpg`} weeks={51} />;

const P17 = () => <CharPage name="SIMONETTE BAAS" subtitle="Elder — Duchy of the Stilled Water" intro="She has held one Gate for forty years." paras={["One captain. One island. One lane. Against four regime changes, two Sovereign Wake acquisition attempts, and every ambitious fleet that ever looked at the central passage and decided they wanted it.", "She is the only character in the entire game who wears a whale-bone Gate Keeper's cuff — carved with the hydraulic activation sequence of her Gate.", "She does not speak to you until your Fleet Worth crosses her threshold. When she does speak she asks one question.", "She has held one Gate for forty years. You want to hold seven. Have you thought carefully about the difference between claiming and holding?", "She is not a mentor. She is a mirror."]} highlightIdx={1} stamps={["FORTY YEARS", "ONE GATE", "THE QUESTION"]} imgSrc={`${IMG}/simonette.jpg`} weeks={51} />;

/* ═══ PAGE 18 — VILLAIN: SABLE FONTAINE ═══ */
const P18 = ({ active }) => (
  <div style={{ height: "100%", display: "flex", flexDirection: "row-reverse", position: "relative", background: C.coldBg }}>
    <div style={{ width: "55%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 56px)", position: "relative" }}>
      <h2 className="aap tw-h" style={{ ...d(600), color: C.coldSilver, fontSize: "clamp(28px, 3vw, 44px)", fontWeight: 700 }}>SABLE FONTAINE</h2>
      <p className="af" style={{ ...d(900), color: C.coldBlue, fontSize: 13, marginBottom: 14, letterSpacing: "0.08em" }}>Master Chart — Cartographers' Guild</p>
      <p className="adr" style={{ ...d(1200), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 460 }}>She is the best navigator the Guild has ever trained. She earned the rank of Master Chart at twenty-eight — the youngest in the Guild's history. She is entirely correct that Gates require technical knowledge to manage safely.</p>
      <p className="adr" style={{ ...d(1800), color: C.sea, fontSize: 15, fontWeight: 500, marginBottom: 10 }}>She is wrong about who gets to have that expertise and under what terms.</p>
      {active && <div className="af" style={{ ...d(2400), textAlign: "center", margin: "12px 0" }}>
        <span className="tw-h" style={{ color: C.coldSilver, fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "0.1em" }}>71:02:17</span>
      </div>}
      <p className="adr" style={{ ...d(3000), color: C.sea, fontSize: 12, lineHeight: 1.7, marginBottom: 10, maxWidth: 460 }}>Her signature tactic: she arrives at hour seventy-one. Not hour one when you are fresh. Not hour thirty-six in the middle. Hour seventy-one — one hour before your claim completes.</p>
      <p className="adr" style={{ ...d(3600), color: C.coldSilver, fontSize: 13, fontStyle: "italic", marginBottom: 10 }}>"The frontier belongs to the trained. Come back when you qualify."</p>
      <p className="adr" style={{ ...d(4200), color: C.sea, fontSize: 12, lineHeight: 1.7 }}>That is not an alliance. It is a complication.</p>
      <VAnno words={["HOUR SEVENTY-ONE", "ALWAYS", "COMING"]} side="right" />
    </div>
    <div style={{ width: "45%", position: "relative", overflow: "hidden" }}>
      <img src={`${IMG}/sable.jpg`} alt="" className="adr" style={{ ...d(400), width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <Clock weeks={51} cold />
  </div>
);

/* ═══ PAGE 19 — DOCK-FORTRESS ═══ */
const P19 = ({ active }) => {
  const buildings = [
    ["DOCKYARD HQ", "Your command centre. Starts as three functioning pylons, a shed, a Chart Room. Grows into a full fortified harbour with reinforced sea-walls, signal tower, fleet coordination deck."],
    ["SHIPWRIGHT", "Builds and upgrades the fleet. Hulls, boarding gear, anchor rigs, current-runners built for Shift passage conditions. Your ships are always visible in the dock."],
    ["WAREHOUSE", "The hoarding mechanic made visible. Stores everything: Cargo, Gate Key components, Relic materials. Bigger Warehouse means more Fleet Worth."],
    ["WATCHTOWER CLIFFS", "Anti-raid fortifications, patrol boat stations, cliff-mounted intercept rigs. Strategic placement matters. This is what keeps your claims alive at hour seventy-one."],
    ["CHART ROOM", "Your competitive edge made architectural. Current readings, passage charts, Relic loadouts. Every Shift Run is prepared here."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/dock-fortress.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.3 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg}f0 0%, ${C.bg}dd 50%, ${C.bg}88 100%)` }} />
      {active && <CurrentParticles density={5} />}
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 70px)", maxWidth: "55%" }}>
        <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 18 }}>Your Base Is an Island</h2>
        {buildings.map(([name, desc], i) => (
          <div key={i} className="adl" style={{ ...d(500 + i * 500), borderLeft: `3px solid ${C.gold}`, paddingLeft: 12, marginBottom: 12 }}>
            <span className="tw-h" style={{ color: C.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>{name}</span>
            <WaveDivider delay={600 + i * 500} style={{ maxWidth: 100, margin: "4px 0 6px" }} />
            <p style={{ color: C.sea, fontSize: 11, lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
        <p className="adl tw-h" style={{ ...d(3500), color: C.gold, fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", marginTop: 10 }}>Fleet Worth. Always visible. Always climbing.</p>
      </div>
      <Clock weeks={51} />
    </div>
  );
};

/* ═══ PAGE 20 — GAME LOOP ═══ */
const P20 = () => {
  const steps = [
    ["01", "LABOR", "Avatar works. Hauling timber to the Shipwright. Running current readings from the deep-water buoys. Fatigue slows progress — or spend to skip."],
    ["02", "BUILD", "Dockyard HQ, Shipwright, Warehouse, Watchtower Cliffs, Chart Room. Each zone upgrades independently and visually."],
    ["03", "RUN", "Shift Runs. 10 to 15 minutes. Pick your champion. Pick 2 Relics. Three rooms. Reach. Anchor. Hold."],
    ["04", "DEPOSIT", "Loot to the Warehouse. Fleet Worth climbs. That number is always visible. Always climbing."],
    ["05", "TRADE", "Trade Pier. List items. Quick Swap for a market fee. Relic components. Gate Key parts. The intelligence economy runs alongside the cargo economy."],
    ["06", "FLEET WARS", "Lane Wars for Gate control. Your Alliance holds lanes. Your rivals challenge them. Every lane held at the seventy-two hour mark generates passive revenue."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/dock-fortress.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: `${C.bg}ee` }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 20 }}>The Loop Is Proven. The World Is Original.</h2>
        <div style={{ position: "relative", paddingLeft: 46 }}>
          {steps.map(([num, title, body], i) => (
            <div key={i} className="adi" style={{ ...d(400 + i * 400), display: "flex", gap: 12, marginBottom: 12, position: "relative" }}>
              <NumBox n={num} />
              <div style={{ paddingTop: 4 }}>
                <span className="tw-h" style={{ color: C.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em" }}>{title}</span>
                <p style={{ color: C.sea, fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="adl tw-h" style={{ ...d(3200), color: C.gold, fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", marginTop: 10 }}>Every action feeds the next. No dead ends.</p>
      </div>
      <Clock weeks={51} />
    </div>
  );
};

/* ═══ PAGE 21 — THE GREAT CROSSING ═══ */
const P21 = ({ active }) => (
  <div style={{ height: "100%", position: "relative", background: "#020406" }}>
    <div className={active ? "abr" : ""} style={{ ...d(2000), position: "absolute", inset: 0, filter: "brightness(0.05)" }}>
      <img src={`${IMG}/archipelago.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #020406cc 0%, #02040666 50%, #02040633 100%)" }} />
    {active && <CurrentParticles density={18} />}
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 clamp(32px, 5vw, 80px) 50px" }}>
      <h2 className="adl tw-h" style={{ ...d(400), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 14 }}>The Great Crossing — The Moment That Keeps Alliances Together</h2>
      <p className="adl" style={{ ...d(800), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 620 }}>Once a month the Current Shift produces a significant movement — a deep tectonic expression that opens a temporary mega-passage into a new region of the sea. The passage is navigable for seventy-two hours before the current re-stabilises.</p>
      <p className="adl" style={{ ...d(1400), color: C.sea, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 620 }}>Every member of your Fleet Alliance contributes Cargo to fuel the passage transit simultaneously. The Relic drops and Gate Key components available in the Great Crossing zone are the rarest in the game.</p>
      <div className="adl" style={{ ...d(2000), border: `1px solid ${C.gold}`, padding: "8px 14px", display: "inline-block", maxWidth: 500, marginBottom: 10 }}>
        <span style={{ color: C.gold, fontSize: 12, fontWeight: 500 }}>The cosmetics available during the Great Crossing weekend are available for seventy-two hours only. They do not return.</span>
      </div>
      <p className="adl" style={{ ...d(2600), color: C.sea, fontSize: 13, fontStyle: "italic", maxWidth: 500 }}>This is the moment players feel like they are part of something that matters. That feeling is retention.</p>
    </div>
    <Clock weeks={51} />
  </div>
);

/* ═══ PAGE 22 — MONETISATION ═══ */
const P22 = () => {
  const items = [
    ["01", "Cargo Bundles", "$1.99 to $39.99"],
    ["02", "Value Bundles", "1,500 Cargo for $10 or 6,500 for $40"],
    ["03", "Champion Drops", "Collectible crew with unique Relic abilities"],
    ["04", "Relic Packs", "Rare Relics with resonance potential"],
    ["05", "Quick Swap Fee", "Studio cut on every player-to-player transaction"],
    ["06", "Fleet Pass", "$4.99/month — exclusive Great Crossing missions"],
    ["07", "Island Expansion Packs", "$9.99 to $19.99 — additional dock zones"],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 100px)", position: "relative" }}>
      <div style={{ maxWidth: 660 }}>
        <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(20px, 2vw, 28px)", fontWeight: 700, marginBottom: 20 }}>Seven Revenue Streams. All Player-Driven.</h2>
        {items.map(([num, title, desc], i) => (
          <div key={i} className="adl" style={{ ...d(400 + i * 200), display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start", borderBottom: `1px solid ${C.copper}20`, paddingBottom: 10 }}>
            <NumBox n={num} />
            <div style={{ paddingTop: 4 }}>
              <span style={{ color: C.white, fontSize: 13, fontWeight: 500 }}>{title}</span>
              <span className="af" style={{ ...d(600 + i * 200), color: C.muted, fontSize: 12, marginLeft: 8 }}>— {desc}</span>
            </div>
          </div>
        ))}
        <p className="af" style={{ ...d(2400), color: C.sea, fontSize: 13, fontStyle: "italic", marginTop: 14 }}>The same psychology you described — four-ninety-nine and you think, I can't even get a pizza for this — built into every layer of TIDE WAR.</p>
      </div>
      <Clock weeks={51} />
    </div>
  );
};

/* ═══ PAGE 23 — ROADMAP ═══ */
const P23 = ({ active }) => {
  const months = [
    ["1", "Vision Lock", "Visual style final. Character designs approved. Direction confirmed."],
    ["2", "Core Loop Demo", "Playable dock-fortress. First Shift Run. First Gate Key built and anchored."],
    ["3", "Alliance Mechanics", "Fleet Wars active. Great Crossing prototype. Lane control functional."],
    ["4", "Vertical Slice", "Ten minutes of complete gameplay. All five buildings upgraded. Trade Pier live."],
    ["5", "Sprint Testing", "Loop refinement. Sable Fontaine's hold-break raids tuned for the 71-hour mechanic."],
    ["6", "Soft Launch Build", "All seven revenue streams integrated. Gate Key cosmetic system live."],
    ["7", "Soft Launch", "Key markets. Data collection begins. The clock hits zero for the first real players."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><img src={`${IMG}/archipelago.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: `${C.bg}ee` }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 22 }}>Seven Months to Soft Launch</h2>
        {months.map(([num, title, desc], i) => (
          <div key={i} className="adl" style={{ ...d(400 + i * 500), display: "flex", gap: 12, marginBottom: 10, position: "relative" }}>
            <NumBox n={num} />
            <div style={{ paddingTop: 4, flex: 1, borderBottom: `1px solid ${C.copper}22`, paddingBottom: 8 }}>
              <span className="tw-h" style={{ color: C.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em" }}>{title}</span>
              <p style={{ color: C.sea, fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>{desc}</p>
            </div>
          </div>
        ))}
        <p className="adl tw-h" style={{ ...d(4200), color: C.gold, fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", marginTop: 12 }}>By the time your next major release lands — TIDE WAR is already in market.</p>
      </div>
      <Clock weeks={51} />
    </div>
  );
};

/* ═══ PAGE 24 — THE ASK ═══ */
const P24 = () => (
  <div style={{ height: "100%", display: "flex", position: "relative" }}>
    <div style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 64px)", background: C.bg }}>
      <h2 className="adl tw-h" style={{ ...d(200), color: C.gold, fontSize: "clamp(26px, 2.8vw, 40px)", fontWeight: 700, marginBottom: 6 }}>Three Decisions. Two Weeks.</h2>
      <WaveDivider delay={500} style={{ marginBottom: 24 }} />
      {[
        ["01", "Review the demo and tell us which direction you want to build on."],
        ["02", "Approve the concept so we begin the full sprint."],
        ["03", "Confirm a follow-up call within two weeks."],
      ].map(([num, text], i) => (
        <div key={i} className="adi" style={{ ...d(800 + i * 1500), display: "flex", gap: 12, marginBottom: 18, alignItems: "flex-start" }}>
          <NumBox n={num} />
          <p style={{ color: C.sea, fontSize: 14, lineHeight: 1.6, paddingTop: 6 }}>{text}</p>
        </div>
      ))}
      <p className="af" style={{ ...d(5000), color: C.sea, fontSize: 13, marginTop: 10 }}>TIDE WAR can be in soft launch condition within seven months of a green light.</p>
      <p className="adl tw-h" style={{ ...d(5800), color: C.gold, fontSize: "clamp(16px, 1.4vw, 22px)", fontWeight: 600, letterSpacing: "0.1em", marginTop: 24 }}>The sea is open.</p>
      <p className="adl" style={{ ...d(6600), color: C.copper, fontSize: "clamp(14px, 1.2vw, 18px)", marginTop: 8 }}>The clock is running.</p>
    </div>
    <div style={{ width: "50%", position: "relative" }}>
      <img src={`${IMG}/captain-dawn.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <Clock weeks={52} />
  </div>
);

/* ═══ PAGE 25 — VIDEO ═══ */
const P25 = ({ active }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (active && ref.current) { ref.current.currentTime = 0; ref.current.play().catch(() => {}); }
    if (!active && ref.current) ref.current.pause();
  }, [active]);
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <video ref={ref} src={`${IMG}/tidewar-video.mp4`} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted controls={active} data-testid="tidewar-video" />
    </div>
  );
};

/* ═══ PAGE 26 — BACK COVER ═══ */
const P26 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    {active && <CurrentParticles density={10} />}
    <h1 className={active ? "arv" : ""} style={{ ...d(800), color: C.gold, fontSize: "clamp(52px, 9vw, 110px)", fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.25em", position: "relative", zIndex: 2 }}>TIDE WAR</h1>
    <p className="au" style={{ ...d(1600), color: C.sea, fontSize: "clamp(14px, 1.4vw, 20px)", fontWeight: 400, letterSpacing: "0.3em", marginTop: 12, position: "relative", zIndex: 2 }}>Current Shift</p>
    <div className="af" style={{ ...d(2400), marginTop: 28, display: "flex", gap: 20, position: "relative", zIndex: 2 }}>
      {["BUILD.", "CLAIM.", "HOLD."].map((w, i) => (
        <span key={i} className="adl tw-h" style={{ ...d(2400 + i * 600), color: C.gold, fontSize: "clamp(15px, 1.3vw, 20px)", fontWeight: 600, letterSpacing: "0.12em" }}>{w}</span>
      ))}
    </div>
    <p className="af" style={{ ...d(4800), color: C.copper, fontSize: 10, marginTop: 44, letterSpacing: "0.12em", position: "relative", zIndex: 2 }}>Confidential — All concepts original IP — Not for distribution.</p>
    {active && <div className="af" style={{ ...d(5500), position: "absolute", bottom: 16, right: 24, zIndex: 20 }}>
      <span className="tw-h" style={{ color: C.gold, fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", animation: "tw-clockPulse 3s ease-in-out infinite" }}>51 WEEKS, 22 HOURS, 47 MINUTES</span>
    </div>}
  </div>
);

/* ═══════════════════════════════════════
   MAIN ENGINE
   ═══════════════════════════════════════ */
const PAGES = [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21, P22, P23, P24, P25, P26];
const TOTAL = PAGES.length;

export default function TideWarPresentation() {
  const [cur, setCur] = useState(0);
  const [sweep, setSweep] = useState(false);

  const go = useCallback((i) => {
    if (i >= 0 && i < TOTAL && i !== cur) {
      setSweep(true);
      setTimeout(() => { setCur(i); setSweep(false); }, 350);
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
    <div className="tw" style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }} data-testid="tidewar-presentation">
      <style>{css}</style>
      <div className={`tw-sweep ${sweep ? "active" : ""}`}><div className="tw-sweep-line" /></div>
      {PAGES.map((PC, i) => (
        <div key={i} className="tw-pg" data-active={i === cur ? "true" : "false"} data-testid={`tidewar-page-${i + 1}`} style={{ position: "absolute", inset: 0, zIndex: i === cur ? 10 : 0, visibility: i === cur ? "visible" : "hidden" }}>
          <PC active={i === cur} />
        </div>
      ))}
      <div className="tw-nav" style={{ position: "fixed", bottom: 16, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 24px", gap: 12 }}>
        <button onClick={() => go(cur - 1)} disabled={cur === 0} style={{ width: 32, height: 32, background: `${C.gold}10`, border: `1px solid ${C.gold}33`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === 0 ? 0.15 : 0.6 }} data-testid="tidewar-prev"><ChevronLeft size={14} color={C.gold} /></button>
        <span className="tw-h" style={{ fontSize: 11, fontWeight: 500, color: `${C.gold}88`, minWidth: 50, textAlign: "center", letterSpacing: "0.08em" }} data-testid="tidewar-counter">{cur + 1} / {TOTAL}</span>
        <button onClick={() => go(cur + 1)} disabled={cur === TOTAL - 1} style={{ width: 32, height: 32, background: `${C.gold}10`, border: `1px solid ${C.gold}33`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === TOTAL - 1 ? 0.15 : 0.6 }} data-testid="tidewar-next"><ChevronRight size={14} color={C.gold} /></button>
      </div>
      <div className="tw-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 2, background: `${C.gold}10`, zIndex: 50 }}>
        <div style={{ height: "100%", background: C.gold, width: `${((cur + 1) / TOTAL) * 100}%`, transition: "width 300ms ease-out" }} />
      </div>
    </div>
  );
}
