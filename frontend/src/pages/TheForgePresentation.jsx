import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const C = { bg: "#0E0C09", gold: "#C4841A", amber: "#E87A2A", white: "#FFFFFF", off: "#F5ECD7", cold: "#080C14", cardDark: "#1A1610" };
const IMG = "/images/theforge";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@300;400;500;600&display=swap');
.forge * { box-sizing: border-box; margin: 0; padding: 0; }
.forge { font-family: 'Inter', sans-serif; overflow: hidden; background: ${C.bg}; }
.forge-serif { font-family: 'Playfair Display', 'Georgia', serif; }

@keyframes f-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes f-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes f-fadeUp30 { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes f-slideL { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes f-slideR { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes f-dropIn { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
@keyframes f-scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes f-drawH { from { width: 0; } to { width: 80px; } }
@keyframes f-drawFull { from { width: 0%; } to { width: 100%; } }
@keyframes f-typeChar { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes f-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes f-flipIn { from { opacity: 0; transform: rotateX(90deg); } to { opacity: 1; transform: rotateX(0); } }
@keyframes f-glow { 0%,100% { opacity: 0.03; } 50% { opacity: 0.08; } }
@keyframes f-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@keyframes f-drift { 0% { transform: translateY(0); } 100% { transform: translateY(-100vh); } }
@keyframes f-forgeGlow { 0% { box-shadow: 0 0 20px rgba(232,122,42,0); } 50% { box-shadow: 0 0 40px rgba(232,122,42,0.3); } 100% { box-shadow: 0 0 20px rgba(232,122,42,0); } }
@keyframes f-ignite { 0% { opacity: 0; text-shadow: 0 0 0 transparent; } 30% { opacity: 1; text-shadow: 0 0 30px rgba(232,122,42,0.8); } 100% { opacity: 1; text-shadow: 0 0 15px rgba(196,132,26,0.4); } }
@keyframes f-brightUp { from { filter: brightness(0.2); } to { filter: brightness(1); } }

.f-pg[data-active="true"] .af { animation: f-fadeIn 600ms ease-out both; }
.f-pg[data-active="true"] .au { animation: f-fadeUp 600ms ease-out both; }
.f-pg[data-active="true"] .au3 { animation: f-fadeUp30 600ms ease-out both; }
.f-pg[data-active="true"] .asl { animation: f-slideL 600ms ease-out both; }
.f-pg[data-active="true"] .asr { animation: f-slideR 600ms ease-out both; }
.f-pg[data-active="true"] .adi { animation: f-dropIn 600ms ease-out both; }
.f-pg[data-active="true"] .asu { animation: f-scaleUp 600ms ease-out both; }
.f-pg[data-active="true"] .adh { animation: f-drawH 600ms ease-out both; }
.f-pg[data-active="true"] .adf { animation: f-drawFull 1200ms ease-out both; }
.f-pg[data-active="true"] .atc { animation: f-typeChar 400ms ease-out both; }
.f-pg[data-active="true"] .ash { animation: f-shake 200ms ease-out both; }
.f-pg[data-active="true"] .afl { animation: f-flipIn 600ms ease-out both; }
.f-pg[data-active="true"] .aig { animation: f-ignite 800ms ease-out both; }
.f-pg[data-active="true"] .abu { animation: f-brightUp 2000ms ease-out both; }

.f-pg[data-active="false"] .af,.f-pg[data-active="false"] .au,
.f-pg[data-active="false"] .au3,.f-pg[data-active="false"] .asl,
.f-pg[data-active="false"] .asr,.f-pg[data-active="false"] .adi,
.f-pg[data-active="false"] .asu,.f-pg[data-active="false"] .adh,
.f-pg[data-active="false"] .adf,.f-pg[data-active="false"] .atc,
.f-pg[data-active="false"] .ash,.f-pg[data-active="false"] .afl,
.f-pg[data-active="false"] .aig,.f-pg[data-active="false"] .abu { opacity: 0; }

.f-ember { position: absolute; width: 2px; height: 2px; background: ${C.amber}; border-radius: 50%; opacity: 0.4; }
.f-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 50%, rgba(232,122,42,0.04) 100%); animation: f-glow 4s infinite ease-in-out; }
.f-pg { transition: opacity 400ms ease-in-out; position: absolute; inset: 0; }
.f-pg[data-active="false"] { opacity: 0; pointer-events: none; }
.f-pg[data-active="true"] { opacity: 1; }
@media print { .f-nav { display: none !important; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }
`;

const d = (ms) => ({ animationDelay: `${ms}ms` });

/* Ember particles floating upward */
const Embers = () => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    {Array.from({ length: 18 }).map((_, i) => (
      <div key={i} className="f-ember" style={{ left: `${5 + Math.random() * 90}%`, bottom: `${-5 - Math.random() * 10}%`, animation: `f-drift ${8 + Math.random() * 10}s linear ${Math.random() * 8}s infinite`, opacity: 0.15 + Math.random() * 0.3, width: 1.5 + Math.random() * 2, height: 1.5 + Math.random() * 2 }} />
    ))}
  </div>
);

const BgImg = ({ src, opacity = 0.4, className = "" }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <img src={src} alt="" className={className} style={{ width: "100%", height: "100%", objectFit: "cover", opacity }} />
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${C.bg}dd, ${C.bg}ee)` }} />
  </div>
);

/* ═══════════════════════════════════════
   PAGE 1 — TITLE REVEAL
   ═══════════════════════════════════════ */
const P1 = ({ active }) => (
  <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
    {/* Forge glow */}
    {active && <div className="af" style={{ ...d(500), position: "absolute", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, rgba(232,122,42,0.15) 0%, transparent 70%)`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />}
    <div style={{ display: "flex", gap: 6 }}>
      {active && "THE FORGE".split("").map((ch, i) => (
        <span key={i} className="aig forge-serif" style={{ ...d(1500 + i * 200), color: C.gold, fontSize: "clamp(44px, 7vw, 88px)", fontWeight: 800 }}>{ch === " " ? "\u00A0" : ch}</span>
      ))}
    </div>
    <p className="af" style={{ ...d(4000), color: C.off, fontSize: "clamp(14px, 1.4vw, 20px)", fontWeight: 300, marginTop: 20 }}>Fire and Memory</p>
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
      <video ref={ref} src={`${IMG}/forge-video.mp4`} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted controls={active} data-testid="forge-video" />
    </div>
  );
};

/* ═══ PAGE 3 — COVER ═══ */
const P3 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", padding: "0 24px" }}>
    <Embers />
    <div className="f-vignette" />
    <h1 className="au forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(44px, 7vw, 80px)", fontWeight: 800 }}>THE FORGE</h1>
    <p className="af" style={{ ...d(700), color: C.off, fontSize: "clamp(15px, 1.5vw, 22px)", fontWeight: 300, marginTop: 8 }}>Fire and Memory</p>
    <p className="af" style={{ ...d(1200), color: C.off, fontSize: "clamp(13px, 1vw, 16px)", marginTop: 24, maxWidth: 520 }}>A mobile night market empire. An original IP. A cultural reclamation.</p>
    <div style={{ marginTop: 28, display: "flex", gap: 24 }}>
      {["BUILD.", "BURN.", "WIN."].map((w, i) => (
        <span key={i} className="af" style={{ ...d(1700 + i * 400), color: C.amber, fontSize: "clamp(14px, 1.2vw, 18px)", fontWeight: 600, letterSpacing: "0.1em" }}>{w}</span>
      ))}
    </div>
  </div>
);

/* ═══ PAGE 4 — PITCH LINE ═══ */
const P4 = ({ active }) => {
  const q1 = "You are not building a castle.";
  const q2 = "You are keeping the fire alive for an entire people.";
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" }}>
      <div style={{ maxWidth: 700 }}>
        {active && <>
          <p className="forge-serif" style={{ color: C.gold, fontSize: "clamp(20px, 2.6vw, 34px)", fontWeight: 600, fontStyle: "italic", lineHeight: 1.4 }}>
            {q1.split(" ").map((w, i) => <span key={i} className="atc" style={{ ...d(300 + i * 120), display: "inline-block", marginRight: 8 }}>{w}</span>)}
          </p>
          <p className="forge-serif" style={{ color: C.gold, fontSize: "clamp(20px, 2.6vw, 34px)", fontWeight: 600, fontStyle: "italic", lineHeight: 1.4, marginTop: 8 }}>
            {q2.split(" ").map((w, i) => <span key={i} className="atc" style={{ ...d(1600 + i * 100), display: "inline-block", marginRight: 8 }}>{w}</span>)}
          </p>
        </>}
        <p className="af" style={{ ...d(3200), color: C.off, fontSize: "clamp(13px, 1vw, 15px)", marginTop: 32, lineHeight: 1.6 }}>
          Clash of Clans structure in a Night Market world — grounded in the iron legacy of Meroë, the bronze archives of Benin, and the warrior tradition of the Dahomey Agojie.
        </p>
      </div>
    </div>
  );
};

/* ═══ PAGE 5 — BUILT FROM YOUR WORDS ═══ */
const P5 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
    <div style={{ maxWidth: 750 }}>
      <h2 className="asl forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 28 }}>Built from Your Words</h2>
      <p className="af" style={{ ...d(500), color: C.off, fontSize: 14, lineHeight: 1.8, marginBottom: 18 }}>
        In our conversation you were clear about what a great mobile game needs. Base building that is the priority — not collectibles. Resource collection that feels earned through the labor of your avatar. A base that grows into something worth defending. A guild system with real wars and real stakes. A spending loop so natural that the larger bundle always looks smarter.
      </p>
      <p className="af" style={{ ...d(1500), color: C.off, fontSize: 14, lineHeight: 1.8, marginBottom: 18 }}>
        You mentioned Clash of Clans as the benchmark. The guild. The wars. The base. You described the rationalisation — this is my guilty pleasure, let it be.
      </p>
      <p className="af" style={{ ...d(2500), color: C.gold, fontSize: 15, fontWeight: 500, borderBottom: `1px solid ${C.amber}`, display: "inline-block", paddingBottom: 4 }}>
        THE FORGE was designed from those exact words.
      </p>
    </div>
  </div>
);

/* ═══ PAGE 6 — THREE ROOTS ═══ */
const P6 = () => {
  const civs = [
    { name: "MEROË", text: "The iron kingdom of Kush whose blast furnace technology was so advanced that Rome paid tribute rather than fight. Their warrior queens — the Kandakes — personally led armies into battle. When Meroë fell, the iron knowledge travelled. It carried across generations, across an ocean, into the ground beneath Oja Nla." },
    { name: "BENIN", text: "The bronze-casting guilds whose archive tradition gave us the Market Bronzes. Not decoration. Living memory cast in metal. When those bronzes were taken, the world lost something irreplaceable. This game is about getting them back." },
    { name: "DAHOMEY", text: "The Agojie. The all-female royal warrior regiment that protected their kingdom for two centuries. Not ceremonial. Not symbolic. The last to stop fighting. Their tradition crossed the Atlantic and became The Mothers." },
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <BgImg src={`${IMG}/bronze-hall.jpg`} opacity={0.25} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 800 }}>
          <h2 className="au forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(26px, 2.8vw, 38px)", fontWeight: 700, marginBottom: 8 }}>Three Civilisations Built This World</h2>
          <p className="af" style={{ ...d(400), color: C.off, fontSize: 14, marginBottom: 24 }}>The game states this clearly. It is the premise, not the subtext.</p>
          {civs.map((c, i) => (
            <div key={i} className="asl" style={{ ...d(700 + i * 1000), marginBottom: 18, borderLeft: `3px solid ${C.amber}`, paddingLeft: 16 }}>
              <span className="forge-serif" style={{ color: C.gold, fontSize: 18, fontWeight: 700 }}>{c.name}</span>
              <p style={{ color: C.off, fontSize: 13, lineHeight: 1.7, marginTop: 4 }}>{c.text}</p>
            </div>
          ))}
          <p className="af forge-serif" style={{ ...d(4000), color: C.gold, fontSize: 15, fontStyle: "italic", marginTop: 8 }}>
            Nothing in this game is invented. Everything is inherited.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 7 — THE WORLD ═══ */
const P7 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <BgImg src={`${IMG}/city-skyline.jpg`} opacity={0.4} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 clamp(32px, 5vw, 80px) 50px" }}>
      <div style={{ maxWidth: 700 }}>
        <h2 className="au forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 16 }}>Oja Nla — City of the Great Market</h2>
        <p className="af" style={{ ...d(600), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>On the northern Caribbean coast, built over ancient iron deposits, sits the greatest market city in the Western hemisphere.</p>
        <p className="af" style={{ ...d(1200), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>The founding engineers — drawing on the Meroitic blast furnace tradition — discovered that the iron ore deposits beneath the Caribbean limestone still radiate dry thermal heat. They built Forge Wells into the earth and Forge Veins through every district. The heat was communal. No meters. No bills. No owner.</p>
        <p className="af" style={{ ...d(2000), color: C.white, fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Then the Tremble happened. Forty-one people died. An American investor arrived with a plan.</p>
        <p className="af" style={{ ...d(2800), color: C.gold, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>Within three years, Sovereign Systems had privatised The Forge entirely. And twenty-two Market Bronzes went into a basement downtown, registered as acquired cultural objects.</p>
        <p className="af" style={{ ...d(3600), color: C.gold, fontSize: 14, fontWeight: 500 }}>Coco Baptise refused to let that be the end. For fifty years she kept it burning. Then she was gone.</p>
      </div>
    </div>
  </div>
);

/* ═══ PAGE 8 — THE FORGE (LORE) ═══ */
const P8 = () => {
  const terms = [
    ["FORGE WELLS", "Shafts drilled into the ore deposits in the Meroitic tradition."],
    ["FORGE VEINS", "Iron conduits running beneath every market district."],
    ["FORGE HEAT", "Your lifeline. Generated by your Wells. Consumed in real time. If heat hits zero — the market goes cold."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <BgImg src={`${IMG}/ketura.jpg`} opacity={0.2} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 700 }}>
          <h2 className="au forge-serif" style={{ ...d(200), color: C.amber, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 4 }}>The Forge</h2>
          <p className="af" style={{ ...d(400), color: C.off, fontSize: 14, marginBottom: 16 }}>Not Electricity. Not Magic. Iron.</p>
          <p className="af" style={{ ...d(700), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>The Forge is dry heat — the same radiant warmth that powered Meroë's blast furnaces, stored in Caribbean iron ore deposits over centuries, accessed through engineering principles the Meroitic families carried across the Atlantic.</p>
          {terms.map(([name, desc], i) => (
            <div key={i} className="asl" style={{ ...d(1200 + i * 500), display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, marginTop: 5, flexShrink: 0, animation: `f-pulse 2s ease-in-out ${i * 0.3}s infinite` }} />
              <div>
                <span style={{ color: C.gold, fontSize: 14, fontWeight: 600 }}>{name}</span>
                <span style={{ color: C.off, fontSize: 13, marginLeft: 6 }}>— {desc}</span>
              </div>
            </div>
          ))}
          <p className="af" style={{ ...d(3000), color: C.off, fontSize: 13, lineHeight: 1.7, marginTop: 16 }}>The feedback loop: your market economy powers your combat. Neglect your Kitchen Hall and your Thermal Amp weakens. Building is combat preparation.</p>
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 9 — THE BRONZE HALL ═══ */
const P9 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <BgImg src={`${IMG}/empty-cases.jpg`} opacity={0.35} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 700 }}>
        <h2 className="au forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 16 }}>The Archive That Must Be Completed</h2>
        <p className="af" style={{ ...d(600), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>The Market Bronzes were cast in the direct tradition of the Benin bronze archives — not art objects, but living memory in metal. Every founding vendor, every Grand Oja victory, every moment worth remembering, recorded in bronze so it could not burn.</p>
        <p className="af" style={{ ...d(1200), color: C.gold, fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Twenty-two pieces were taken twenty-five years ago by Hargrove Cultural Assets — now Sovereign Systems. Legally acquired. Documented. Gone.</p>
        <p className="af" style={{ ...d(1800), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>Forty-one pieces remain in the Bronze Hall. Their cases are lit from below by forge warmth, waiting for the others to return.</p>
        <p className="af" style={{ ...d(2400), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>In the game: Bronze Fragments drop in Forge Runs and combat encounters. Recover enough and the Bronze is cast in your Workshop and installed in the Hall. Each piece grants a permanent passive buff.</p>
        <div className="af" style={{ ...d(3200), display: "inline-block", border: `1px solid ${C.amber}`, borderRadius: 6, padding: "10px 18px", animation: `f-forgeGlow 3s infinite 3.2s` }}>
          <span style={{ color: C.amber, fontSize: 14, fontWeight: 600, letterSpacing: "0.06em" }}>PENDING RETURN</span>
        </div>
      </div>
    </div>
  </div>
);

/* ═══ CHARACTER PAGE TEMPLATE ═══ */
const CharPage = ({ name, subtitle, paras, tags, imgSrc, side = "right", bgColor = C.bg, animIn = "asr", highlight, titleAnim = "asl" }) => (
  <div style={{ background: bgColor, height: "100%", position: "relative", overflow: "hidden" }}>
    <div className={animIn} style={{ ...d(300), position: "absolute", [side]: 0, bottom: 0, top: 0, width: "48%", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
      <img src={imgSrc} alt="" style={{ maxHeight: "95%", maxWidth: "95%", objectFit: "contain", objectPosition: "bottom" }} />
    </div>
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 clamp(32px, 5vw, 80px)`, maxWidth: "55%", marginLeft: side === "left" ? "auto" : 0 }}>
      <h2 className={`${titleAnim} forge-serif`} style={{ ...d(500), color: C.gold, fontSize: "clamp(30px, 3.5vw, 52px)", fontWeight: 800, marginBottom: 4 }}>{name}</h2>
      <p className="af" style={{ ...d(800), color: C.off, fontSize: 15, marginBottom: 18 }}>{subtitle}</p>
      {paras.map((p, i) => (
        <p key={i} className="af" style={{ ...d(1100 + i * 700), color: p === highlight ? C.gold : C.off, fontSize: p === highlight ? 15 : 13, fontWeight: p === highlight ? 500 : 400, lineHeight: 1.7, marginBottom: 10, maxWidth: 480 }}>{p}</p>
      ))}
      <div style={{ marginTop: 12, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {tags.map((t, i) => (
          <span key={i} className="au" style={{ ...d(3500 + i * 200), color: C.amber, fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${C.amber}`, paddingBottom: 2 }}>{t}</span>
        ))}
      </div>
    </div>
  </div>
);

/* ═══ PAGES 10-14 — CHARACTERS ═══ */
const P10 = () => <CharPage name="THE KEEPER" subtitle="The Market Steward — Player Character" paras={["You are not family. You are not an heir.", "Coco Baptise mentored you. She taught you how to read a crowd, drill a bootleg Forge tap in the dark, and run a market night so electric people talk about it for years. She taught you about the Kandakes of Meroë — queens who personally led armies and made Rome pay tribute.", "When the heirs deadlocked, the Vendors' Council invoked her own law. You were appointed Keeper.", "The market does not belong to you yet. Prove it should.", "Not by bloodline — by necessity."]} highlight="Not by bloodline — by necessity." tags={["Keeper", "Steward", "The Fire"]} imgSrc={`${IMG}/keeper.jpg`} titleAnim="ash" />;

const P11 = () => <CharPage name="ADESUWA" subtitle="Leader — The First Mothers" paras={["She has guarded the Bronze Hall door for four months. Alone. Without being asked.", "She is the eldest active Mother. Her order carries the Agojie tradition — the all-female warrior regiment of Dahomey that never stopped fighting. Adesuwa leads the intelligence faction: protect the Bronzes through knowledge and network.", "She backed your appointment before anyone else. Not because she trusts you yet. Because the market needed someone and you were the one who showed up.", "She is your eyes and ears. Earn her."]} tags={["Guardian", "Intelligence", "The First Mothers"]} imgSrc={`${IMG}/adesuwa.jpg`} side="left" animIn="asl" />;

const P12 = () => <CharPage name="KETURA PIERRE" subtitle="Leader — The Underground" paras={["Her grandmother was one of Coco's original Mothers. Her mother maintained bootleg Forge taps through the Sovereign privatisation years. She has been running counter-operations against Sovereign's Regulators since her late twenties.", "She does not want legitimacy. She wants to hold the line.", "She knows where every ancient Meroitic ore seam is — the deep Wells that Sovereign has never found because they didn't build them. Her trust level determines what she shares.", "She is not loyal to you. She is loyal to the oath."]} highlight="She does not want legitimacy. She wants to hold the line." tags={["Operator", "Underground", "The Deep Wells"]} imgSrc={`${IMG}/ketura.jpg`} animIn="adi" />;

const P13 = () => <CharPage name="ADUKE" subtitle="Institutional Historian — Bronze Hall Curator" paras={["She has managed the market's records and the Bronze archive for twenty years. She knows the provenance of all twenty-two stolen Bronzes by heart.", "When you recover a Bronze, Aduke narrates the installation — her voice is how the game tells you what you have won back.", "She does not take sides between heirs or factions. She serves the market as an institution.", "Every Memory Shard sounds like her translating Coco's handwriting for the first time."]} highlight="Every Memory Shard sounds like her translating Coco's handwriting for the first time." tags={["Archivist", "Memory", "The Hall"]} imgSrc={`${IMG}/aduke.jpg`} animIn="af" />;

const P14 = () => <CharPage name="MARCUS HALE" subtitle="CEO — Sovereign Systems" paras={["He was there when the ground opened. He built the only thing standing between this city and another collapse. He genuinely believes that.", "He also owns The Forge, holds the twenty-two Bronzes in a climate-controlled basement, and is offering to return them — at a ceremony, under Sovereign branding, on his terms.", "He is not trying to destroy the market. He is offering to save it. That distinction makes him the most dangerous person in Oja Nla.", "\"I was there when the ground opened. Were you?\"", "He came with a solution. He stayed as an owner."]} highlight="He came with a solution. He stayed as an owner." tags={["Strategist", "Sovereign", "The Offer"]} imgSrc={`${IMG}/marcus-hale.jpg`} bgColor={C.cold} />;

/* ═══ PAGE 15 — THREE HEIRS ═══ */
const P15 = () => {
  const heirs = [
    { name: "DAYO", sub: "The Moderniser", text: "Coco's eldest son. MBA, investors ready, premium vision. His trap: every commercially sensible decision he advocates erodes what made the market worth fighting for." },
    { name: "SIMONE", sub: "The Preservationist", text: "Coco's daughter. City councillor, council votes ready, heritage protection vision. Her trap: preservation without growth is a slow death with better lighting." },
    { name: "RUBEN", sub: "The Corporate", text: "Coco's nephew. Sovereign regional director, legal property claim, partnership vision. His trap: his version of stability is Sovereign's ownership with a family face on it." },
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <BgImg src={`${IMG}/heirs.jpg`} opacity={0.2} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 750 }}>
          <h2 className="au forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 24 }}>Three People Who Think You Are a Puppet</h2>
          {heirs.map((h, i) => (
            <div key={i} className="asl" style={{ ...d(600 + i * 800), marginBottom: 18, borderLeft: `3px solid ${C.amber}`, paddingLeft: 16 }}>
              <span className="forge-serif" style={{ color: C.gold, fontSize: 16, fontWeight: 700 }}>{h.name}</span>
              <span style={{ color: C.off, fontSize: 13, marginLeft: 8 }}>— {h.sub}</span>
              <p style={{ color: C.off, fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{h.text}</p>
            </div>
          ))}
          <p className="af" style={{ ...d(3200), color: C.off, fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>Let any one heir reach maximum Influence and they override you — each with permanently different consequences. The optimal play is balance. The game is designed so that all three are occasionally right.</p>
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 16 — FIVE RIVALS ═══ */
const P16 = () => {
  const rivals = [
    { name: "OUSMANE SOW", text: "Nouvelle Rive. Three-time runner-up to Coco. \"Sorry about Coco. I assume you won't be entering this cycle?\"" },
    { name: "ADJUA MENSAH", text: "The Loom. Most disciplined competitor. Preparation started five years ago." },
    { name: "ZARA OBI", text: "Spark Row. First-time entrant. Completely unbothered." },
    { name: "THE SESSION", text: "Rhythm Yard. A collective. Nobody agrees. Dangerous anyway." },
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <BgImg src={`${IMG}/rivals.jpg`} opacity={0.2} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 750 }}>
          <h2 className="au forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 8 }}>Five Districts. One Competition. Twenty Years of Free Heat.</h2>
          <p className="af" style={{ ...d(500), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>Every twenty years Oja Nla holds The Grand Oja — the greatest market competition on the Caribbean coast. Five districts. One month. The winner receives The Master Forge — twenty years of free heat.</p>
          <p className="af" style={{ ...d(1000), color: C.gold, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>Coco Baptise wrote a provision into the Grand Oja charter forty years ago: win three consecutive championships and you earn the right to petition for the legal repatriation of any market cultural property. She won two. You need one more.</p>
          {rivals.map((r, i) => (
            <div key={i} className="au" style={{ ...d(1500 + i * 400), display: "flex", gap: 10, marginBottom: 10, alignItems: "baseline" }}>
              <span className="forge-serif" style={{ color: C.gold, fontSize: 14, fontWeight: 700 }}>{r.name}</span>
              <span style={{ color: C.off, fontSize: 12 }}>— {r.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 17 — GAME LOOP ═══ */
const P17 = () => {
  const steps = [
    ["01", "HARVEST", "Your avatar carries ore crates, clears Forge Veins, tests food stalls, hauls fabric. Fatigue slows progress — or spend to skip."],
    ["02", "UPGRADE", "Market HQ, Stalls Row, Workshop, Vault, Crew House. Each zone grows independently and visually."],
    ["03", "RUN", "Forge Runs. 5 to 12 minutes. Pick your champion. Pick 2 Forge Amps. Three rooms. Fight."],
    ["04", "DEPOSIT", "Loot to the Vault. Watch your Net Worth climb. That number is always visible. Always climbing."],
    ["05", "TRADE", "Player Market. List Goods, Amps, Fragments. Quick Swap for a market fee. The hustle is built into the economy."],
    ["06", "REUNITE", "Coordinate your Market Alliance. Joint raids on Sovereign infrastructure. The Mothers Alliance Bonus activates when factions are unified."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <BgImg src={`${IMG}/market-builds.jpg`} opacity={0.15} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 5vw, 64px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
          <h2 className="af forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 4 }}>The Loop is Proven. The World is Original.</h2>
          <p className="af" style={{ ...d(400), color: C.off, fontSize: 14, marginBottom: 20 }}>Clash of Clans structure. Afrofuturist night market world.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {steps.map(([num, title, body], i) => (
              <div key={i} className={i % 2 === 0 ? "asl" : "asr"} style={{ ...d(600 + i * 250), display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="forge-serif" style={{ color: C.amber, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{num}</span>
                <div>
                  <span style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}>{title}</span>
                  <p style={{ color: C.off, fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="af" style={{ ...d(2800), color: C.amber, fontSize: 14, fontWeight: 500, marginTop: 18 }}>Every action feeds the next. No dead ends.</p>
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 18 — OJA ÌFÉ ═══ */
const P18 = ({ active }) => (
  <div style={{ height: "100%", position: "relative", background: "#000" }}>
    <div className={active ? "abu" : ""} style={{ ...d(1800), position: "absolute", inset: 0, filter: "brightness(0.2)" }}>
      <img src={`${IMG}/mothers-united.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, #000e 0%, #0008 50%, #0003 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 clamp(32px, 5vw, 80px) 50px" }}>
      <h2 className="au forge-serif" style={{ ...d(300), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 4 }}>Oja Ìfé — The Moment That Keeps Players Coming Back</h2>
      <p className="af" style={{ ...d(600), color: C.gold, fontSize: 14, fontWeight: 500, marginBottom: 14 }}>The single most culturally grounded mechanic in mobile gaming.</p>
      <p className="af" style={{ ...d(1000), color: C.off, fontSize: 13, lineHeight: 1.7, marginBottom: 10, maxWidth: 620 }}>Once a month every alliance contributes resources to fire a shared deep Forge Well simultaneously. Every allied market blazes at full heat at once — visible to all participating players simultaneously. The ground between every stall glows full amber.</p>
      <p className="af" style={{ ...d(1600), color: C.off, fontSize: 13, marginBottom: 14, maxWidth: 620 }}>Fail to contribute enough and the Well does not fire. The market stays cold for another month.</p>
      <div className="af" style={{ ...d(2200), border: `1px solid ${C.amber}`, borderRadius: 8, padding: "10px 16px", display: "inline-block", maxWidth: 460, animation: `f-pulse 3s infinite 2.2s` }}>
        <span style={{ color: C.amber, fontSize: 12 }}>24-hour exclusive cosmetic drop available only during Oja Ìfé weekend. Available once. Gone when it ends.</span>
      </div>
      <p className="af" style={{ ...d(2800), color: C.off, fontSize: 13, fontStyle: "italic", marginTop: 12 }}>This is the moment players feel like they are part of something that matters. That feeling is retention.</p>
    </div>
  </div>
);

/* ═══ PAGE 19 — WHY HISTORIC ═══ */
const P19 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
    <div style={{ maxWidth: 720 }}>
      <h2 className="asu forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 20 }}>Nothing Like This Exists</h2>
      <p className="af" style={{ ...d(500), color: C.off, fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}>No mobile game has ever been built on the iron legacy of Meroë, the bronze archives of Benin, and the warrior tradition of the Dahomey Agojie — with this level of mechanical depth. Not a skin. Not a filter. A world built from real civilisations given an epic story.</p>
      <p className="af" style={{ ...d(1200), color: C.off, fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}>The diaspora psychology is real. <span style={{ color: C.gold }}>When something feels like ours — we wear it all over ourselves.</span> We spend. We evangelise. <span style={{ color: C.amber, borderBottom: `1px solid ${C.amber}`, paddingBottom: 1 }}>Black Panther proved it at the box office. THE FORGE proves it on mobile.</span></p>
      <p className="af" style={{ ...d(1900), color: C.off, fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}><span style={{ color: C.gold }}>The Mothers are not a side quest. They are the spine.</span> Reuniting them is the central mechanic of the entire game.</p>
      <p className="af" style={{ ...d(2600), color: C.off, fontSize: 14, lineHeight: 1.8 }}>The daily loop has no dead ends. The spending loop feels natural. The cultural hook is something no competitor can replicate.</p>
    </div>
  </div>
);

/* ═══ PAGE 20 — MONETISATION ═══ */
const P20 = () => {
  const items = [
    ["01", "Forge Heat Bundles", "$1.99 to $39.99 (market goes cold without heat)"],
    ["02", "Coin Bundle Upsell", "1,500 Heat for $10 or 6,500 for $40"],
    ["03", "Champion Drops", "Collectible characters with unique Forge Amp abilities"],
    ["04", "Forge Amp Packs", "Rare weapons with iron-and-bronze visual effects"],
    ["05", "Cosmetics and Identity", "Bronze signage, stall skins, Agojie-style murals"],
    ["06", "Player-to-Player Trading", "Quick Swap transactions, platform takes market fee"],
    ["07", "Oja Ìfé Pass", "Monthly subscription, exclusive festival content"],
    ["08", "District Expansion Packs", "Rooftop forge market, underground iron hall, waterfront pier"],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 720 }}>
        <h2 className="af forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 24 }}>Eight Revenue Streams. All Player-Driven.</h2>
        {items.map(([num, title, desc], i) => (
          <div key={i} className="asl" style={{ ...d(400 + i * 200), display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <span className="forge-serif" style={{ color: C.amber, fontSize: 20, fontWeight: 700, minWidth: 28 }}>{num}</span>
            <div><span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{title}</span><span style={{ color: C.off, fontSize: 12, marginLeft: 6 }}>— {desc}</span></div>
          </div>
        ))}
        <p className="af forge-serif" style={{ ...d(2400), color: C.gold, fontSize: 14, fontStyle: "italic", marginTop: 18, lineHeight: 1.6 }}>The same psychology you described — the rationalisation of "what is ninety dollars if this is my guilty pleasure" — built into every layer of THE FORGE.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 21 — ROADMAP ═══ */
const P21 = ({ active }) => {
  const months = [
    ["Month 1", "Vision Lock", "Visual style, characters final, Rosebud demo reviewed."],
    ["Month 2", "Core Loop Demo", "Playable market, first Forge Run, first Bronze Fragment drop."],
    ["Month 3", "Mothers Faction", "Alliance mechanics. Oja Ìfé prototype active."],
    ["Month 4", "Vertical Slice", "Five minutes of complete gameplay, Net Worth live."],
    ["Month 5", "Sprint Testing", "Loop refinement based on feedback."],
    ["Month 6", "Soft Launch Build", "Monetisation integrated. Bronze Hall complete."],
    ["Month 7", "Soft Launch", "Key markets. Data collection begins."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <BgImg src={`${IMG}/grand-oja-aerial.jpg`} opacity={0.1} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 5vw, 64px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
          <h2 className="af forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 24 }}>Seven Months to Soft Launch</h2>
          <div style={{ position: "relative", marginBottom: 36 }}>
            <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
              {active && <div className="adf" style={{ ...d(400), height: "100%", background: C.amber, borderRadius: 2 }} />}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {months.map(([m, title, desc], i) => (
                <div key={i} className="au" style={{ ...d(600 + i * 200), flex: 1, textAlign: "center", padding: "0 3px" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === 6 ? C.gold : C.amber, margin: "-13px auto 6px", position: "relative", zIndex: 2 }} />
                  <div style={{ color: C.amber, fontSize: 10, fontWeight: 600 }}>{m}</div>
                  <div style={{ color: C.white, fontSize: 11, fontWeight: 500, marginTop: 3 }}>{title}</div>
                  <div style={{ color: C.off, fontSize: 9, marginTop: 2, lineHeight: 1.3 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="af" style={{ ...d(2600), color: C.off, fontSize: 14 }}>By the time your next major release lands — THE FORGE is already in market.</p>
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 22 — FIVE CHAPTERS ═══ */
const P22 = () => {
  const chs = [
    ["1", "THE COLD MARKET", "Rebuild basics. Recruit first vendors. Drill first bootleg Forge tap. Find first Memory Shard — Coco's voice."],
    ["2", "THE ENTRY", "Grand Oja registration. City shocked. Ketura opens the Underground. First Bronze Fragment drops."],
    ["3", "THE PRESSURE", "All three heirs escalate. Hargrove agents grow bolder. The Mothers begin to fracture visibly."],
    ["4", "THE GRAND OJA BEGINS", "Judging starts. Sabotage intensifies. The Mothers begin moving toward reconciliation."],
    ["5", "THE GRAND MARKET NIGHT", "The neglected heir's power play. Hale sends the Forge Breakers. The Mothers unite. You win. The Bronzes come home."],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 800 }}>
        <h2 className="af forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 28 }}>The Story Roadmap</h2>
        <div style={{ display: "flex", gap: 12 }}>
          {chs.map(([num, title, desc], i) => (
            <div key={i} className="au3" style={{ ...d(600 + i * 400), flex: 1, background: `${C.amber}08`, border: `1px solid ${C.amber}20`, borderRadius: 8, padding: "16px 12px", minHeight: 150, display: "flex", flexDirection: "column" }}>
              <div className="forge-serif" style={{ color: C.amber, fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{num}</div>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 6 }}>{title}</div>
              <div style={{ color: C.off, fontSize: 10, lineHeight: 1.5, flex: 1 }}>{desc}</div>
            </div>
          ))}
        </div>
        <p className="af" style={{ ...d(3200), color: C.off, fontSize: 13, marginTop: 24, lineHeight: 1.6 }}>Each chapter is a natural season of content. The characters are built for a screen beyond mobile. Animated series. Merchandise. The game is the engine. The world is built for expansion.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 23 — THE ASK ═══ */
const P23 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <BgImg src={`${IMG}/title-card.jpg`} opacity={0.08} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(32px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 560 }}>
        <h2 className="af forge-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 32 }}>Three Decisions. Two Weeks.</h2>
        {[
          ["01", "Review the demo and tell us which concept direction you want to build."],
          ["02", "Approve the concept so we begin the full build sprint."],
          ["03", "Confirm a follow-up call within two weeks."],
        ].map(([num, text], i) => (
          <div key={i} className="af" style={{ ...d(800 + i * 1200), display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 22 }}>
            <span className="forge-serif" style={{ color: C.amber, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{num}</span>
            <p style={{ color: C.white, fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>{text}</p>
          </div>
        ))}
        <p className="af" style={{ ...d(4200), color: C.off, fontSize: 14, marginTop: 12 }}>The game can be in soft launch condition within seven months of a green light.</p>
        <p className="af forge-serif" style={{ ...d(5000), color: C.gold, fontSize: "clamp(16px, 1.4vw, 20px)", fontWeight: 600, marginTop: 24 }}>The cases will not stay empty.</p>
      </div>
    </div>
  </div>
);

/* ═══ PAGE 24 — BACK COVER ═══ */
const P24 = ({ active }) => (
  <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    <Embers />
    {active && <div className="af" style={{ ...d(300), position: "absolute", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, rgba(232,122,42,0.12) 0%, transparent 70%)`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />}
    <h1 className="forge-serif" style={{ color: C.gold, fontSize: "clamp(44px, 7vw, 80px)", fontWeight: 800 }}>
      {active && "THE FORGE".split("").map((ch, i) => (
        <span key={i} className="aig" style={{ ...d(500 + i * 150), display: ch === " " ? "inline" : "inline-block" }}>{ch === " " ? "\u00A0" : ch}</span>
      ))}
    </h1>
    <p className="af" style={{ ...d(2000), color: C.off, fontSize: "clamp(14px, 1.4vw, 20px)", fontWeight: 300, marginTop: 12 }}>Fire and Memory</p>
    <div style={{ marginTop: 28, display: "flex", gap: 24 }}>
      {["BUILD.", "BURN.", "WIN."].map((w, i) => (
        <span key={i} className="af" style={{ ...d(2500 + i * 400), color: C.amber, fontSize: "clamp(14px, 1.2vw, 18px)", fontWeight: 600, letterSpacing: "0.1em" }}>{w}</span>
      ))}
    </div>
    <p className="af" style={{ ...d(4000), color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 44 }}>Confidential — All concepts original IP — Not for distribution.</p>
  </div>
);

/* ═══════════════════════════════════════
   MAIN PRESENTATION ENGINE
   ═══════════════════════════════════════ */
const PAGES = [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21, P22, P23, P24];
const TOTAL = PAGES.length;

export default function TheForgePresentation() {
  const [cur, setCur] = useState(0);
  const go = useCallback((i) => { if (i >= 0 && i < TOTAL) setCur(i); }, []);

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
    <div className="forge" style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }} data-testid="forge-presentation">
      <style>{css}</style>
      {PAGES.map((PC, i) => (
        <div key={i} className="f-pg" data-active={i === cur ? "true" : "false"} data-testid={`forge-page-${i + 1}`} style={{ zIndex: i === cur ? 10 : 0 }}>
          <PC active={i === cur} />
        </div>
      ))}
      <div className="f-nav" style={{ position: "fixed", bottom: 18, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <button onClick={() => go(cur - 1)} disabled={cur === 0} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === 0 ? 0.15 : 0.6 }} data-testid="forge-prev"><ChevronLeft size={16} color="white" /></button>
        <span style={{ fontSize: 13, fontFamily: "'Inter', monospace", fontWeight: 500, color: "rgba(255,255,255,0.4)", minWidth: 56, textAlign: "center" }} data-testid="forge-counter">{cur + 1} / {TOTAL}</span>
        <button onClick={() => go(cur + 1)} disabled={cur === TOTAL - 1} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === TOTAL - 1 ? 0.15 : 0.6 }} data-testid="forge-next"><ChevronRight size={16} color="white" /></button>
      </div>
      <div className="f-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.04)", zIndex: 50 }}>
        <div style={{ height: "100%", background: C.amber, width: `${((cur + 1) / TOTAL) * 100}%`, transition: "width 400ms ease-out" }} />
      </div>
    </div>
  );
}
