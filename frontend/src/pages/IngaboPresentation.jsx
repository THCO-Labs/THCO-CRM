import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ═══ COLORS ═══ */
const C = { bg: "#12121E", gold: "#C4933F", cyan: "#5DCAA5", white: "#FFFFFF", offWhite: "#F0EBE0", cold: "#0A0E1A" };
const IMG = "/images/ingabo";

/* ═══ GLOBAL CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@300;400;500;600&display=swap');
.ing * { box-sizing: border-box; margin: 0; padding: 0; }
.ing { font-family: 'Inter', sans-serif; overflow: hidden; background: ${C.bg}; }

/* Keyframes */
@keyframes ing-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes ing-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ing-fadeUp30 { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ing-slideL { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes ing-slideR { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes ing-dropIn { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ing-scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes ing-drawLineH { from { width: 0; } to { width: 80px; } }
@keyframes ing-drawLineFull { from { width: 0%; } to { width: 100%; } }
@keyframes ing-glow { 0%,100% { opacity: 0.03; } 50% { opacity: 0.08; } }
@keyframes ing-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@keyframes ing-typeChar { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ing-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes ing-flipIn { from { opacity: 0; transform: rotateX(90deg); } to { opacity: 1; transform: rotateX(0deg); } }
@keyframes ing-curtainL { from { transform: translateX(0); } to { transform: translateX(-100%); } }
@keyframes ing-curtainR { from { transform: translateX(0); } to { transform: translateX(100%); } }
@keyframes ing-brightUp { from { filter: brightness(0.3); } to { filter: brightness(1); } }
@keyframes ing-drift { 0% { transform: translate(0,0); } 50% { transform: translate(20px, -10px); } 100% { transform: translate(0,0); } }
@keyframes ing-signalPulse { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
@keyframes ing-bounce { 0% { transform: translateY(-40px); opacity: 0; } 60% { transform: translateY(5px); opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }

/* Active page animations */
.ing-page[data-active="false"] { opacity: 0; pointer-events: none; }
.ing-page[data-active="true"] { opacity: 1; }

.ing-page[data-active="true"] .a-fi { animation: ing-fadeIn 600ms ease-out both; }
.ing-page[data-active="true"] .a-fu { animation: ing-fadeUp 600ms ease-out both; }
.ing-page[data-active="true"] .a-fu3 { animation: ing-fadeUp30 600ms ease-out both; }
.ing-page[data-active="true"] .a-sl { animation: ing-slideL 600ms ease-out both; }
.ing-page[data-active="true"] .a-sr { animation: ing-slideR 600ms ease-out both; }
.ing-page[data-active="true"] .a-di { animation: ing-dropIn 600ms ease-out both; }
.ing-page[data-active="true"] .a-su { animation: ing-scaleUp 600ms ease-out both; }
.ing-page[data-active="true"] .a-dh { animation: ing-drawLineH 600ms ease-out both; }
.ing-page[data-active="true"] .a-df { animation: ing-drawLineFull 1200ms ease-out both; }
.ing-page[data-active="true"] .a-tc { animation: ing-typeChar 400ms ease-out both; }
.ing-page[data-active="true"] .a-sh { animation: ing-shake 200ms ease-out both; }
.ing-page[data-active="true"] .a-fl { animation: ing-flipIn 600ms ease-out both; }
.ing-page[data-active="true"] .a-bo { animation: ing-bounce 600ms ease-out both; }
.ing-page[data-active="true"] .a-bu { animation: ing-brightUp 2000ms ease-out both; }

.ing-page[data-active="false"] .a-fi,.ing-page[data-active="false"] .a-fu,
.ing-page[data-active="false"] .a-fu3,.ing-page[data-active="false"] .a-sl,
.ing-page[data-active="false"] .a-sr,.ing-page[data-active="false"] .a-di,
.ing-page[data-active="false"] .a-su,.ing-page[data-active="false"] .a-dh,
.ing-page[data-active="false"] .a-df,.ing-page[data-active="false"] .a-tc,
.ing-page[data-active="false"] .a-sh,.ing-page[data-active="false"] .a-fl,
.ing-page[data-active="false"] .a-bo,.ing-page[data-active="false"] .a-bu { opacity: 0; }

/* Gold dust particles */
.ing-dust { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.ing-dust-p { position: absolute; width: 2px; height: 2px; background: ${C.gold}; border-radius: 50%; opacity: 0.3; animation: ing-drift 12s infinite ease-in-out; }

/* Gold vignette */
.ing-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 50%, rgba(196,147,63,0.05) 100%); animation: ing-glow 4s infinite ease-in-out; }

/* Page transition */
.ing-page { transition: opacity 400ms ease-in-out; position: absolute; inset: 0; }

/* Serif heading */
.ing-serif { font-family: 'Playfair Display', 'Georgia', serif; }

@media print { .ing-nav { display: none !important; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }
`;

const d = (ms) => ({ animationDelay: `${ms}ms` });

/* ═══ HELPERS ═══ */
const GoldDust = () => (
  <div className="ing-dust">
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="ing-dust-p" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 12}s`, animationDuration: `${10 + Math.random() * 8}s` }} />
    ))}
  </div>
);

const PageBg = ({ src, opacity = 0.4, zoom = false, brighten = false, className = "" }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <img src={src} alt="" className={className} style={{ width: "100%", height: "100%", objectFit: "cover", opacity, transition: "all 2s ease-out", transform: zoom ? "scale(1.15)" : "scale(1)" }} />
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${C.bg}dd, ${C.bg}ee)` }} />
  </div>
);

const CharImg = ({ src, side = "right", slow = false, drop = false, className = "" }) => (
  <div className={className} style={{ position: "absolute", [side]: 0, bottom: 0, top: 0, width: "45%", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
    <img src={src} alt="" style={{ maxHeight: "90%", maxWidth: "90%", objectFit: "contain", objectPosition: "bottom" }} />
  </div>
);

/* ═══════════════════════════════════════════════
   PAGE 1 — TITLE REVEAL
   ═══════════════════════════════════════════════ */
const P1 = ({ active }) => {
  const letters = "INGABO".split("");
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {active && letters.map((ch, i) => (
          <span key={i} className="a-tc ing-serif" style={{ ...d(1000 + i * 300), color: C.gold, fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 800, textShadow: "0 0 30px rgba(196,147,63,0.3)" }}>{ch}</span>
        ))}
      </div>
      {/* Signal pulse from O */}
      {active && <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1px solid ${C.cyan}`, animation: "ing-signalPulse 2s ease-out 3s forwards", opacity: 0 }} />
      </div>}
      <p className="a-fi" style={{ ...d(3500), color: C.white, fontSize: "clamp(14px, 1.5vw, 20px)", fontWeight: 300, marginTop: 24 }}>Rise of the Thousand Hills</p>
    </div>
  );
};

/* ═══ PAGE 2 — VIDEO ═══ */
const P2 = ({ active }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (active && videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}); }
    if (!active && videoRef.current) { videoRef.current.pause(); }
  }, [active]);
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <video ref={videoRef} src={`${IMG}/ingabo-video.mp4`} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted controls={active} data-testid="ingabo-video" />
    </div>
  );
};

/* ═══ PAGE 3 — COVER / TITLE CARD ═══ */
const P3 = ({ active }) => (
  <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", padding: "0 24px" }}>
    <GoldDust />
    <div className="ing-vignette" />
    <h1 className="a-fu ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(48px, 7vw, 80px)", fontWeight: 800 }}>INGABO</h1>
    <p className="a-fi" style={{ ...d(700), color: C.white, fontSize: "clamp(16px, 1.6vw, 22px)", fontWeight: 300, marginTop: 8 }}>Rise of the Thousand Hills</p>
    <p className="a-fi" style={{ ...d(1200), color: C.offWhite, fontSize: "clamp(13px, 1.1vw, 16px)", fontWeight: 400, marginTop: 24, maxWidth: 560 }}>A mobile empire builder. An original IP. A sovereign partnership.</p>
    <div style={{ marginTop: 32, display: "flex", gap: 24 }}>
      {["BUILD.", "RESTORE.", "UNITE."].map((w, i) => (
        <span key={i} className="a-fi" style={{ ...d(1700 + i * 400), color: C.cyan, fontSize: "clamp(14px, 1.3vw, 18px)", fontWeight: 600, letterSpacing: "0.1em" }}>{w}</span>
      ))}
    </div>
  </div>
);

/* ═══ PAGE 4 — THE PITCH LINE ═══ */
const P4 = ({ active }) => {
  const q1 = "You are not building a castle.";
  const q2 = "You are turning the lights back on for an entire people.";
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" }}>
      <div style={{ maxWidth: 700 }}>
        {active && (
          <>
            <p className="ing-serif" style={{ color: C.gold, fontSize: "clamp(22px, 2.8vw, 36px)", fontWeight: 600, fontStyle: "italic", lineHeight: 1.4 }}>
              {q1.split(" ").map((w, i) => <span key={i} className="a-tc" style={{ ...d(300 + i * 120), display: "inline-block", marginRight: 8 }}>{w}</span>)}
            </p>
            <p className="ing-serif" style={{ color: C.gold, fontSize: "clamp(22px, 2.8vw, 36px)", fontWeight: 600, fontStyle: "italic", lineHeight: 1.4, marginTop: 12 }}>
              {q2.split(" ").map((w, i) => <span key={i} className="a-tc" style={{ ...d(1800 + i * 100), display: "inline-block", marginRight: 8 }}>{w}</span>)}
            </p>
          </>
        )}
        <p className="a-fi" style={{ ...d(3500), color: C.offWhite, fontSize: "clamp(13px, 1.1vw, 16px)", marginTop: 36, lineHeight: 1.6 }}>
          Clash of Clans meets Black Panther worldbuilding — grounded in real African culture and infrastructure politics.
        </p>
      </div>
    </div>
  );
};

/* ═══ PAGE 5 — WHAT INSPIRED THIS ═══ */
const P5 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
    <div style={{ maxWidth: 800 }}>
      <h2 className="a-sl ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 28 }}>Built from Your Words</h2>
      <p className="a-fi" style={{ ...d(500), color: C.offWhite, fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.8, marginBottom: 20 }}>
        In our conversation you were clear about what a great mobile game needs. World building as the foundation — not an afterthought. Resource collection that feels earned through the labor of your avatar. A base that grows into something worth defending. A guild system that means something — wars, federations, collective purpose. Champion collection that makes you want to keep playing. And a spending loop so natural that ninety dollars feels like nothing because you are enjoying yourself too much to stop.
      </p>
      <p className="a-fi" style={{ ...d(1500), color: C.offWhite, fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.8, marginBottom: 20 }}>
        You mentioned Clash of Clans as the benchmark. The guild. The wars. The base. You described the rationalisation — this is my guilty pleasure, let it be.
      </p>
      <p className="a-fi" style={{ ...d(2500), color: C.gold, fontSize: "clamp(14px, 1.1vw, 17px)", fontWeight: 500, borderBottom: `1px solid ${C.gold}`, display: "inline-block", paddingBottom: 4 }}>
        INGABO was designed from those exact words.
      </p>
    </div>
  </div>
);

/* ═══ PAGE 6 — WHY RWANDA ═══ */
const P6 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <div className="a-bu" style={{ position: "absolute", inset: 0 }}>
      <img src={`${IMG}/thousand-hills.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.1)", transition: "transform 8s ease-out" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg}ee 0%, ${C.bg}cc 50%, transparent 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(32px, 6vw, 80px)", maxWidth: 650 }}>
      <h2 className="a-fu ing-serif" style={{ ...d(300), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 20, textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>The Land of a Thousand Hills</h2>
      <p className="a-fi" style={{ ...d(600), color: C.offWhite, fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.8, marginBottom: 16 }}>
        Rwanda is one of the most remarkable countries on earth. A nation that survived unimaginable fracture and rebuilt itself into one of the fastest growing economies in Africa — through unity, infrastructure, community, and collective will.
      </p>
      <p className="a-fi" style={{ ...d(1200), color: C.gold, fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.8, marginBottom: 16 }}>
        We did not invent INGABO's themes. We listened to what Rwanda has already lived.
      </p>
      <p className="a-fi" style={{ ...d(1800), color: C.offWhite, fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.8 }}>
        INGABO is set in a fictional but Rwanda-inspired world where elevation is strategy, infrastructure is power, and community is survival. No gods. No magic. No borrowed mythology. Real culture given an epic story.
      </p>
    </div>
  </div>
);

/* ═══ PAGE 7 — THE LANGUAGE ═══ */
const P7 = () => {
  const terms = [
    ["INGABO", "The Shield. The warriors who protect. The game's name."],
    ["INZIRA", "The Pathway. The hilltop communication network players must restore."],
    ["UBUMWE", "Unity. Rwanda's national value. The guild alliance system."],
    ["UMUGANDA", "Community service. Rwanda's monthly tradition. The guild event mechanic."],
    ["IJORO RIBI", "The Bad Night. The night the network was sabotaged."],
    ["COLTAN", "Rwanda's most valuable mineral. The game's primary resource."],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 750 }}>
        <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 32 }}>The Words of the Hills</h2>
        {terms.map(([word, def], i) => (
          <div key={i} className="a-sl" style={{ ...d(500 + i * 400), display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.cyan, marginTop: 7, flexShrink: 0, animation: `ing-pulse 2s ease-in-out ${i * 0.4}s infinite` }} />
            <div>
              <span style={{ color: C.gold, fontSize: 16, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{word}</span>
              <span style={{ color: C.offWhite, fontSize: 14, marginLeft: 8 }}>— {def}</span>
            </div>
          </div>
        ))}
        <p className="a-fi" style={{ ...d(3200), color: C.offWhite, fontStyle: "italic", fontSize: 14, marginTop: 28 }}>
          Every word is real Kinyarwanda. Nothing is invented. Nothing is borrowed.
        </p>
      </div>
    </div>
  );
};

/* ═══ PAGE 8 — THE STORY ═══ */
const P8 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <div className="a-bu" style={{ ...d(0), position: "absolute", inset: 0 }}>
      <img src={`${IMG}/ijori-ribi.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${C.bg}f5 0%, ${C.bg}cc 40%, ${C.bg}88 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 clamp(32px, 6vw, 80px) 60px" }}>
      <h2 className="a-fu ing-serif" style={{ ...d(300), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 20 }}>The Blackout — Ijoro Ribi</h2>
      <p className="a-fu" style={{ ...d(800), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 12, maxWidth: 700 }}>
        For generations the Thousand Hills were connected by a network of hilltop signal towers called the Inzira. No community was alone. No hill was isolated.
      </p>
      <p className="a-fu" style={{ ...d(1800), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 12, maxWidth: 700 }}>
        Then in a single coordinated night — every tower went dark. The people called it Ijoro Ribi. The Bad Night. That was twelve years ago.
      </p>
      <p className="a-fu" style={{ ...d(2800), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 20, maxWidth: 700 }}>
        Someone knew the architecture of the Inzira well enough to collapse it in one night. Someone planned it for years. And someone has been profiting from the division ever since.
      </p>
      <p className="a-fi ing-serif" style={{ ...d(3800), color: C.gold, fontSize: "clamp(16px, 1.5vw, 22px)", fontWeight: 600, fontStyle: "italic", maxWidth: 700, textShadow: "0 0 40px rgba(176,49,64,0.3)" }}>
        "Who ordered the Blackout — and why was your hill specifically targeted — is the spine of the entire game."
      </p>
    </div>
  </div>
);

/* ═══ CHARACTER PAGE TEMPLATE ═══ */
const CharPage = ({ name, subtitle, paragraphs, tags, imgSrc, side = "right", goldHighlight, bgColor = C.bg, animClass = "a-sr", titleEffect = "", tagStyle = "fade" }) => (
  <div style={{ background: bgColor, height: "100%", position: "relative", overflow: "hidden" }}>
    <CharImg src={imgSrc} side={side} className={animClass} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 clamp(32px, 5vw, 80px)`, maxWidth: side === "right" ? "55%" : "55%", marginLeft: side === "left" ? "auto" : 0 }}>
      <h2 className={`a-sl ing-serif ${titleEffect}`} style={{ ...d(500), color: C.gold, fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 800, marginBottom: 4 }}>{name}</h2>
      <p className="a-fi" style={{ ...d(800), color: C.offWhite, fontSize: 16, marginBottom: 20 }}>{subtitle}</p>
      {paragraphs.map((p, i) => (
        <p key={i} className="a-fi" style={{ ...d(1100 + i * 700), color: p === goldHighlight ? C.gold : C.offWhite, fontSize: p === goldHighlight ? 15 : 14, fontWeight: p === goldHighlight ? 500 : 400, lineHeight: 1.7, marginBottom: 12, maxWidth: 500 }}>{p}</p>
      ))}
      <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
        {tags.map((t, i) => (
          <span key={i} className={tagStyle === "slam" ? "a-fi" : "a-fu"} style={{ ...d(3000 + i * 200), color: C.cyan, fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${C.cyan}`, paddingBottom: 2 }}>{t}</span>
        ))}
      </div>
    </div>
  </div>
);

/* ═══ PAGE 9-13 — CHARACTERS ═══ */
const P9 = () => <CharPage name="THE NEW INGABO" subtitle="The Shield — Player Character" paragraphs={["You are not a warlord. You are not a king. You are someone who left.", "Diaspora. Built a life elsewhere. Then a message found you: \"Your tower is the last one they haven't touched. If you're ever coming back — now is the time.\"", "Coming back is not heroism. It is honesty. Your compound is not a castle. It is a debt you are finally paying."]} tags={["Warrior", "Returner", "The Shield"]} imgSrc={`${IMG}/new-ingabo.jpg`} side="right" titleEffect="a-sh" />;
const P10 = () => <CharPage name="GASORE" subtitle="The Scout Captain" paragraphs={["Young. Fast. Deeply angry.", "He sent the message that brought you back. Not because he believed in you. Because your tower was the last one standing and he was running out of options.", "He does not trust you yet. Earning that trust is the first arc of the game."]} tags={["Scout", "Intelligence", "Watchful"]} imgSrc={`${IMG}/gasore.jpg`} side="left" animClass="a-sl" />;
const P11 = () => <CharPage name="MUKAMANA" subtitle="The Elder Architect" paragraphs={["She knows where every cable of the Inzira ran. Every node. Every redundancy. Without her you cannot restore the network.", "She also knows more about the night of the Blackout than she has ever said out loud. She was there. She was sent away on a false errand. She has always suspected why.", "She is not a quest-giver. She is a woman carrying twelve years of guilt about something that was not entirely her fault."]} goldHighlight="She is not a quest-giver. She is a woman carrying twelve years of guilt about something that was not entirely her fault." tags={["Engineer", "Architect", "Keeper of Truth"]} imgSrc={`${IMG}/mukamana.jpg`} side="right" animClass="a-fi" />;
const P12 = () => <CharPage name="KEZA NKUSI" subtitle="The Architect" paragraphs={["He was the most brilliant strategist the Inzira ever produced.", "He did not destroy the network to profit from division. He destroyed it because he intended to rebuild it — under his control. He believes collective governance made the hills weak. He intends to own the network and run it himself.", "He is not trying to destroy the hills. He is trying to own them. That distinction makes him dangerous."]} goldHighlight="He is not trying to destroy the hills. He is trying to own them. That distinction makes him dangerous." tags={["Strategist", "Ideologist", "The Architect"]} imgSrc={`${IMG}/keza-nkusi.jpg`} side="right" bgColor={C.cold} tagStyle="slam" />;
const P13 = () => <CharPage name="AKAVUNJA" subtitle="The Breakers" paragraphs={["They are not monsters. They are people who chose a paycheck over community.", "Hired by the Brokers to keep towers offline and communities afraid. They carry dismantled tower components on their backs. The broken circle on their chest is not just a symbol. To be called Akavunja is a shame.", "Some of them can be turned. Some were once Ingabo themselves."]} tags={["Mercenary", "Enemy", "The Breakers"]} imgSrc={`${IMG}/akavunja.jpg`} side="right" animClass="a-bo" tagStyle="slam" />;

/* ═══ PAGE 14 — THE FULL CAST ═══ */
const P14 = () => {
  const cast = [
    { name: "THE NEW INGABO", role: "The Shield", color: C.gold },
    { name: "GASORE", role: "The Scout Captain", color: "#4CAF50" },
    { name: "MUKAMANA", role: "The Elder Architect", color: "#5B8FB9" },
    { name: "KEZA NKUSI", role: "The Architect", color: "#4A7AB5" },
    { name: "AKAVUNJA", role: "The Breakers", color: "#8B6F4E" },
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center" }}>
      <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 32 }}>Rise of the Thousand Hills — The Cast</h2>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        {cast.map((c, i) => (
          <div key={i} className="a-fu" style={{ ...d(800 + i * 300), textAlign: "center" }}>
            <div style={{ width: 10, height: 3, background: c.color, borderRadius: 2, margin: "0 auto 8px" }} />
            <div style={{ color: C.gold, fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{c.name}</div>
            <div style={{ color: C.offWhite, fontSize: 12, marginTop: 2 }}>{c.role}</div>
          </div>
        ))}
      </div>
      <p className="a-fi" style={{ ...d(3000), color: C.offWhite, fontSize: 14, fontStyle: "italic", maxWidth: 540 }}>
        Every character carries a piece of the mystery. Collecting and completing them is narrative archaeology.
      </p>
    </div>
  );
};

/* ═══ PAGE 15 — THE GAME LOOP ═══ */
const P15 = () => {
  const steps = [
    ["01", "HARVEST", "Mine coltan, chop bamboo, haul stone. Your avatar labors. Fatigue slows progress — or spend to skip."],
    ["02", "UPGRADE", "Forge, barracks, granary, watchtower, market. Each zone upgrades independently."],
    ["03", "RAID", "Recovery Runs on Akavunja supply lines. Reclaim stolen tower components."],
    ["04", "RESTORE", "Activate tower nodes. Reconnect your hill to the Inzira signal network."],
    ["05", "UNITE", "Coordinate your Ubumwe guild. Territory campaigns. Alliance wars."],
    ["06", "UMUGANDA", "Monthly collective rebuild. The whole alliance works together. Lights come back on."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <PageBg src={`${IMG}/compound.jpg`} opacity={0.2} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 5vw, 64px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
          <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 6 }}>The Loop is Proven. The World is Original.</h2>
          <p className="a-fi" style={{ ...d(400), color: C.offWhite, fontSize: 14, marginBottom: 24 }}>Clash of Clans structure. Rwandan cultural world.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {steps.map(([num, title, body], i) => (
              <div key={i} className={i % 2 === 0 ? "a-sl" : "a-sr"} style={{ ...d(600 + i * 300), display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: C.gold, fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{num}</span>
                <div>
                  <span style={{ color: C.cyan, fontSize: 13, fontWeight: 600 }}>{title}</span>
                  <p style={{ color: C.offWhite, fontSize: 12, lineHeight: 1.6, marginTop: 2 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="a-fi" style={{ ...d(3000), color: C.cyan, fontSize: 14, fontWeight: 500, marginTop: 24 }}>Every action feeds the next. No dead ends.</p>
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 16 — UMUGANDA ═══ */
const P16 = ({ active }) => (
  <div style={{ height: "100%", position: "relative", background: "#000" }}>
    <div className={active ? "a-bu" : ""} style={{ ...d(2000), position: "absolute", inset: 0, filter: "brightness(0.3)" }}>
      <img src={`${IMG}/umuganda.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, #000e 0%, #0008 50%, #0005 100%)` }} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 clamp(32px, 5vw, 80px) 60px" }}>
      <h2 className="a-fu ing-serif" style={{ ...d(300), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 6 }}>Umuganda — The Moment That Keeps Players Coming Back</h2>
      <p className="a-fi" style={{ ...d(600), color: C.gold, fontSize: 14, fontWeight: 500, marginBottom: 16 }}>The single most culturally authentic mechanic in mobile gaming.</p>
      <p className="a-fi" style={{ ...d(1000), color: C.offWhite, fontSize: 14, lineHeight: 1.7, marginBottom: 12, maxWidth: 650 }}>
        Once a month every alliance participates in Umuganda Weekend — based on Rwanda's real national community service tradition. Every member must contribute to a collective infrastructure rebuild. Complete it and the lights come back on across a section of the map — visible to every player simultaneously.
      </p>
      <p className="a-fi" style={{ ...d(1800), color: C.offWhite, fontSize: 14, marginBottom: 16, maxWidth: 650 }}>Fail and the Brokers move in first.</p>
      <div className="a-fi" style={{ ...d(2400), border: `1px solid ${C.cyan}`, borderRadius: 8, padding: "12px 16px", display: "inline-block", maxWidth: 500, animation: `ing-pulse 3s infinite 2.4s` }}>
        <span style={{ color: C.cyan, fontSize: 13 }}>24-hour exclusive cosmetic drop available only during Umuganda Weekend. Available once. Gone when it ends.</span>
      </div>
      <p className="a-fi" style={{ ...d(3000), color: C.offWhite, fontSize: 13, marginTop: 16, fontStyle: "italic" }}>This is the moment players feel like they are doing something that matters. That feeling is retention.</p>
    </div>
  </div>
);

/* ═══ PAGE 17 — WHY HISTORIC ═══ */
const P17 = () => (
  <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
    <div style={{ maxWidth: 750 }}>
      <h2 className="a-su ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 24 }}>Nothing Like This Exists</h2>
      <p className="a-fi" style={{ ...d(500), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
        No mobile game has ever been built on real African culture with this level of depth. Not a skin. Not a filter. Not a borrowed aesthetic. A world built from real words, real traditions, real geography.
      </p>
      <p className="a-fi" style={{ ...d(1200), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
        The diaspora psychology is real. <span style={{ color: C.gold }}>When something feels like ours — we wear it all over ourselves.</span> We spend. We evangelise. We make it bigger than it was designed to be. <span style={{ color: C.cyan, borderBottom: `1px solid ${C.cyan}`, paddingBottom: 1 }}>Black Panther proved it at the box office. INGABO proves it on mobile.</span>
      </p>
      <p className="a-fi" style={{ ...d(1900), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
        Strong female characters built naturally into the game — not as tokens but as load-bearing story pillars. Mukamana is not a quest-giver. She is the reason the network can be rebuilt.
      </p>
      <p className="a-fi" style={{ ...d(2600), color: C.offWhite, fontSize: 14, lineHeight: 1.8 }}>
        The daily loop has no dead ends. The spending loop feels natural. The cultural hook is something no competitor can replicate.
      </p>
    </div>
  </div>
);

/* ═══ PAGE 18 — IBISIGO LEGACY ═══ */
const P18 = () => {
  const cards = [
    { label: "VISIBLE", desc: "Shareable across the alliance.", color: C.cyan },
    { label: "PERMANENT", desc: "Written by actions, not purchased.", color: C.gold },
    { label: "LEGENDARY", desc: "Premium illustrated inscriptions available as cosmetic upgrades.", color: C.gold },
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 750 }}>
        <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 24, textShadow: "0 0 30px rgba(196,147,63,0.2)" }}>Your History is Your Status</h2>
        <p className="a-fi" style={{ ...d(500), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>In Rwanda, Ibisigo is royal poetry used to record the deeds of those who shaped history.</p>
        <p className="a-fi" style={{ ...d(900), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>In INGABO every significant action gets written into your personal Ibisigo — your epic of the hills.</p>
        <p className="a-fi" style={{ ...d(1300), color: C.offWhite, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>When other players visit your hill they do not just see your defenses. They see your story.</p>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {cards.map((c, i) => (
            <div key={i} className="a-fl" style={{ ...d(1800 + i * 500), flex: 1, background: `${c.color}10`, border: `1px solid ${c.color}33`, borderRadius: 10, padding: 18, perspective: "600px" }}>
              <div style={{ color: c.color, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.label}</div>
              <div style={{ color: C.offWhite, fontSize: 12 }}>{c.desc}</div>
            </div>
          ))}
        </div>
        <p className="a-fi" style={{ ...d(3500), color: C.offWhite, fontSize: 13, fontStyle: "italic" }}>No other mobile game turns player history into social currency this way.</p>
      </div>
    </div>
  );
};

/* ═══ PAGE 19 — MONETISATION ═══ */
const P19 = () => {
  const items = [
    ["01", "Resource Bundles", "$1.99 to $19.99 (skip the fatigue timer)"],
    ["02", "Coin Bundle Upsell", "1,500 coins for $10 or 6,500 for $40"],
    ["03", "Champion Drops", "Collectible named warriors with missions"],
    ["04", "Player-to-Player Trading", "99 cent transactions, studio takes 50%"],
    ["05", "Ubumwe Season Pass", "Monthly subscription, predictable recurring revenue"],
    ["06", "Umuganda Weekend Drops", "24-hour exclusive cosmetics"],
    ["07", "Ibisigo Premium Inscriptions", "Cosmetic epic upgrades"],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 750 }}>
        <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 28 }}>Seven Revenue Streams. All Player-Driven.</h2>
        {items.map(([num, title, desc], i) => (
          <div key={i} className="a-sl" style={{ ...d(400 + i * 250), display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
            <span style={{ color: C.gold, fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", minWidth: 32 }}>{num}</span>
            <div>
              <span style={{ color: C.white, fontSize: 14, fontWeight: 600 }}>{title}</span>
              <span style={{ color: C.offWhite, fontSize: 13, marginLeft: 8 }}>— {desc}</span>
            </div>
          </div>
        ))}
        <p className="a-fi ing-serif" style={{ ...d(2600), color: C.gold, fontSize: 15, fontStyle: "italic", marginTop: 24, lineHeight: 1.6 }}>
          The same psychology you described — the rationalisation of "what's ninety dollars if this is my guilty pleasure" — built into every layer of INGABO.
        </p>
      </div>
    </div>
  );
};

/* ═══ PAGE 20 — RWANDA PARTNERSHIP ═══ */
const P20 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <PageBg src={`${IMG}/thousand-hills.jpg`} opacity={0.15} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 950 }}>
        <h2 className="a-sl ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, marginBottom: 20 }}>A Sovereign Government as Co-Signer of the IP</h2>
        <p className="a-fi" style={{ ...d(500), color: C.offWhite, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>This is not a revenue share. Rwanda does not take a cut. Rwanda gets something more valuable than money — cultural visibility at global scale.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div className="a-fi" style={{ ...d(800), background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#666", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>ARSENAL + PSG SPONSORSHIP</div>
            <p style={{ color: "#888", fontSize: 13 }}>Tens of millions of dollars. Passive logo on a shirt. Seen for 90 minutes. Then gone.</p>
          </div>
          <div className="a-fi" style={{ ...d(1200), background: `${C.gold}0d`, borderRadius: 10, padding: 20, border: `1px solid ${C.gold}33`, boxShadow: `0 0 20px ${C.gold}08` }}>
            <div style={{ color: C.gold, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>INGABO PARTNERSHIP</div>
            <p style={{ color: C.offWhite, fontSize: 13 }}>Millions of players spending hours inside a beautifully rendered Rwandan landscape. Every session. That is not a logo. That is immersive tourism marketing at a scale no jersey can match.</p>
          </div>
        </div>
        <p className="a-fi" style={{ ...d(1800), color: C.gold, fontSize: "clamp(15px, 1.3vw, 18px)", fontWeight: 500, marginTop: 8 }}>Your citizenship makes this exclusive by nature. No competitor can walk in and replicate this. That is the moat.</p>
      </div>
    </div>
  </div>
);

/* ═══ PAGE 21 — ROADMAP ═══ */
const P21 = ({ active }) => {
  const months = [
    ["Month 1", "Vision Lock", "Visual style, characters final, Rwanda partnership begins."],
    ["Month 2", "Core Loop Demo", "Playable compound, first raid, one tower restoration."],
    ["Month 3", "Champion System", "Guild mechanics. Umuganda prototype."],
    ["Month 4", "Vertical Slice", "Five minutes of complete gameplay."],
    ["Month 5", "Sprint Testing", "Loop refinement based on feedback."],
    ["Month 6", "Soft Launch Build", "Monetisation integration. Rwanda formalised."],
    ["Month 7", "Soft Launch", "Key markets. Data collection begins."],
  ];
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <PageBg src={`${IMG}/restored-network.jpg`} opacity={0.1} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 5vw, 64px)" }}>
        <div style={{ maxWidth: 950, margin: "0 auto", width: "100%" }}>
          <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 28 }}>Seven Months to Soft Launch</h2>
          {/* Timeline bar */}
          <div style={{ position: "relative", marginBottom: 40 }}>
            <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, position: "relative" }}>
              {active && <div className="a-df" style={{ ...d(400), height: "100%", background: C.gold, borderRadius: 2 }} />}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {months.map(([m, title, desc], i) => (
                <div key={i} className="a-fu" style={{ ...d(600 + i * 250), flex: 1, textAlign: "center", padding: "0 4px" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: i === 6 ? C.cyan : C.gold, margin: "-14px auto 8px", position: "relative", zIndex: 2 }} />
                  <div style={{ color: C.gold, fontSize: 11, fontWeight: 600 }}>{m}</div>
                  <div style={{ color: C.white, fontSize: 12, fontWeight: 500, marginTop: 4 }}>{title}</div>
                  <div style={{ color: C.offWhite, fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="a-fi" style={{ ...d(3000), color: C.offWhite, fontSize: 14 }}>By the time your next major release lands — INGABO is already in market.</p>
        </div>
      </div>
    </div>
  );
};

/* ═══ PAGE 22 — FIVE CHAPTERS ═══ */
const P22 = () => {
  const chapters = [
    ["1", "THE RETURN", "Rebuild compound. Meet characters. First raid."],
    ["2", "THE SILENT TOWERS", "Recover components. First Memory Shard discovered."],
    ["3", "THE HIGH GROUND", "Guild alliances form. Learn Keza is buying towers."],
    ["4", "THE BROKER WAR", "Hit supply lines. Mystery begins connecting."],
    ["5", "THE GRAND RELAY", "Massive Umuganda event. Keza's play. Truth revealed. Inzira restored."],
  ];
  return (
    <div style={{ background: C.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 800 }}>
        <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(24px, 2.5vw, 36px)", fontWeight: 700, marginBottom: 32 }}>The Story Roadmap</h2>
        <div style={{ display: "flex", gap: 14 }}>
          {chapters.map(([num, title, desc], i) => (
            <div key={i} className="a-fu3" style={{ ...d(600 + i * 400), flex: 1, background: `${C.gold}0a`, border: `1px solid ${C.gold}22`, borderRadius: 8, padding: "18px 14px", minHeight: 160, display: "flex", flexDirection: "column" }}>
              <div style={{ color: C.gold, fontSize: 28, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>{num}</div>
              <div style={{ color: C.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 8 }}>{title}</div>
              <div style={{ color: C.offWhite, fontSize: 11, lineHeight: 1.5, flex: 1 }}>{desc}</div>
            </div>
          ))}
        </div>
        <p className="a-fi" style={{ ...d(3200), color: C.offWhite, fontSize: 13, marginTop: 28, lineHeight: 1.6 }}>
          Each chapter is a natural season of content. The characters are built for a screen beyond mobile. Animated series. Merchandise. The game is the engine. The world is built for expansion.
        </p>
      </div>
    </div>
  );
};

/* ═══ PAGE 23 — THE ASK ═══ */
const P23 = () => (
  <div style={{ height: "100%", position: "relative" }}>
    <PageBg src={`${IMG}/command-room.jpg`} opacity={0.08} />
    <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(32px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 600 }}>
        <h2 className="a-fi ing-serif" style={{ ...d(200), color: C.gold, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, marginBottom: 36 }}>Three Decisions. Two Weeks.</h2>
        {[
          ["01", "Review the visual package and tell us which direction resonates most."],
          ["02", "Approve the concept so we begin the playable demo sprint."],
          ["03", "Confirm a follow-up call within two weeks."],
        ].map(([num, text], i) => (
          <div key={i} className="a-fi" style={{ ...d(800 + i * 1200), display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
            <span style={{ color: C.gold, fontSize: 36, fontWeight: 800, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{num}</span>
            <p style={{ color: C.white, fontSize: 15, lineHeight: 1.6, marginTop: 8 }}>{text}</p>
          </div>
        ))}
        <p className="a-fi" style={{ ...d(4500), color: C.cyan, fontSize: 14, fontWeight: 500, marginTop: 16 }}>
          The game can be in soft launch condition within seven months of a green light. Built for mobile. Built for the market. Built on your benchmark.
        </p>
      </div>
    </div>
  </div>
);

/* ═══ PAGE 24 — BACK COVER ═══ */
const P24 = ({ active }) => (
  <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
    <GoldDust />
    {/* Inward signal pulse */}
    {active && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1px solid ${C.cyan}`, animation: "ing-signalPulse 2s ease-out 200ms reverse forwards" }} />
    </div>}
    <h1 className="ing-serif" style={{ color: C.gold, fontSize: "clamp(48px, 7vw, 80px)", fontWeight: 800 }}>
      {active && "INGABO".split("").map((ch, i) => (
        <span key={i} className="a-tc" style={{ ...d(500 + i * 200), display: "inline-block" }}>{ch}</span>
      ))}
    </h1>
    <p className="a-fi" style={{ ...d(1800), color: C.white, fontSize: "clamp(14px, 1.4vw, 20px)", fontWeight: 300, marginTop: 12 }}>Rise of the Thousand Hills</p>
    <div style={{ marginTop: 28, display: "flex", gap: 24 }}>
      {["BUILD.", "RESTORE.", "UNITE."].map((w, i) => (
        <span key={i} className="a-fi" style={{ ...d(2400 + i * 400), color: C.cyan, fontSize: "clamp(14px, 1.2vw, 18px)", fontWeight: 600, letterSpacing: "0.1em" }}>{w}</span>
      ))}
    </div>
    <p className="a-fi" style={{ ...d(3800), color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 48 }}>Confidential — All concepts original IP — Not for distribution.</p>
  </div>
);

/* ═══════════════════════════════════════════════
   MAIN PRESENTATION ENGINE
   ═══════════════════════════════════════════════ */
const PAGES = [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21, P22, P23, P24];
const TOTAL = PAGES.length;

export default function IngaboPresentation() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx) => { if (idx >= 0 && idx < TOTAL) setCurrent(idx); }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [current, goTo]);

  useEffect(() => {
    let startX = 0;
    const onStart = (e) => { startX = e.touches[0].clientX; };
    const onEnd = (e) => { const diff = startX - e.changedTouches[0].clientX; if (Math.abs(diff) > 60) { diff > 0 ? goTo(current + 1) : goTo(current - 1); } };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [current, goTo]);

  return (
    <div className="ing" style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }} data-testid="ingabo-presentation">
      <style>{css}</style>
      {/* Pages */}
      {PAGES.map((PC, i) => (
        <div key={i} className="ing-page" data-active={i === current ? "true" : "false"} data-testid={`ingabo-page-${i + 1}`} style={{ zIndex: i === current ? 10 : 0 }}>
          <PC active={i === current} />
        </div>
      ))}
      {/* Navigation */}
      <div className="ing-nav" style={{ position: "fixed", bottom: 20, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <button onClick={() => goTo(current - 1)} disabled={current === 0} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: current === 0 ? 0.2 : 0.7 }} data-testid="ingabo-prev">
          <ChevronLeft size={16} color="white" />
        </button>
        <span style={{ fontSize: 13, fontFamily: "'Inter', monospace", fontWeight: 500, color: "rgba(255,255,255,0.5)", minWidth: 60, textAlign: "center" }} data-testid="ingabo-counter">{current + 1} / {TOTAL}</span>
        <button onClick={() => goTo(current + 1)} disabled={current === TOTAL - 1} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: current === TOTAL - 1 ? 0.2 : 0.7 }} data-testid="ingabo-next">
          <ChevronRight size={16} color="white" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="ing-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.05)", zIndex: 50 }}>
        <div style={{ height: "100%", background: C.gold, width: `${((current + 1) / TOTAL) * 100}%`, transition: "width 400ms ease-out" }} />
      </div>
    </div>
  );
}
