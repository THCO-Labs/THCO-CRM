import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ═══ BRAND PALETTE ═══ */
const B = {
  pink: "#FF2D8A",
  dark: "#0D0D0D",
  darkSurface: "#1A1A2E",
  white: "#FFFFFF",
  lightGray: "#F7F7F7",
  pinkTint: "#FFF0F5",
  textDark: "#212121",
  textGray: "#666666",
  textMuted: "#999999",
  textLight: "#AAAAAA",
};

const ease = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 28 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.13, ease } }) };
const fadeIn = { hidden: { opacity: 0, scale: 0.96 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.6, delay: i * 0.12, ease } }) };
const slideL = { hidden: { opacity: 0, x: -35 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.7, delay: i * 0.13, ease } }) };
const slideR = { hidden: { opacity: 0, x: 35 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.7, delay: i * 0.13, ease } }) };

/* ═══ REUSABLE COMPONENTS ═══ */
const SectionLabel = ({ children }) => (
  <motion.div variants={fadeUp} custom={1} className="text-[11px] font-bold tracking-[4px] uppercase mb-6" style={{ color: B.pink }}>
    {children}
  </motion.div>
);

const SlideTitle = ({ children, light = false }) => (
  <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-2" style={{ color: light ? B.white : B.textDark, fontFamily: "'Outfit', 'Inter', 'DM Sans', sans-serif" }}>
    {children}
  </motion.h2>
);

const PinkDot = () => <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: B.pink }} />;

const PinkAccentBar = () => (
  <motion.div
    initial={{ scaleY: 0 }}
    whileInView={{ scaleY: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, ease }}
    className="absolute left-0 top-0 bottom-0 w-[5px] origin-top"
    style={{ background: B.pink }}
  />
);

const SlideContainer = ({ children, dark = false, className = "" }) => (
  <div className={`relative min-h-screen flex items-center ${className}`} style={{ background: dark ? B.dark : B.white }}>
    <motion.div className="relative z-10 w-full max-w-[1100px] mx-auto px-8 md:px-12 py-20" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      {children}
    </motion.div>
  </div>
);

/* ═══════════════════════════════════════
   SLIDE 1 — TITLE
   ═══════════════════════════════════════ */
const Slide1 = () => (
  <SlideContainer dark>
    <div className="flex flex-col items-center justify-center text-center min-h-[60vh]">
      <motion.img
        variants={fadeIn}
        custom={0}
        src="/logos/pebbles/logo_white.png"
        alt="Pebbles"
        className="h-16 md:h-20 mb-10 object-contain"
        data-testid="pebbles-logo"
      />
      <motion.p variants={fadeUp} custom={1} className="text-lg md:text-xl italic leading-relaxed max-w-md mb-8" style={{ color: B.textLight, lineHeight: 1.5 }}>
        "Your salary is not one big rock.<br />It's made of pebbles."
      </motion.p>
      <motion.div variants={fadeUp} custom={2} className="text-[13px] font-bold tracking-[4px] uppercase mb-10" style={{ color: B.pink }}>
        BRAND IDENTITY & VISION
      </motion.div>
      <motion.p variants={fadeUp} custom={3} className="text-[11px]" style={{ color: "#555555" }}>
        pebbles.financial
      </motion.p>
    </div>
  </SlideContainer>
);

/* ═══════════════════════════════════════
   SLIDE 2 — WHY PEBBLES?
   ═══════════════════════════════════════ */
const Slide2 = () => (
  <SlideContainer>
    <PinkAccentBar />
    <div className="grid md:grid-cols-5 gap-8 items-center">
      <div className="md:col-span-3">
        <SlideTitle>WHY PEBBLES?</SlideTitle>
        <SectionLabel>THE NAME</SectionLabel>

        <motion.p variants={fadeUp} custom={2} className="text-base font-bold leading-relaxed mb-4" style={{ color: B.textDark }}>
          Your salary isn't one big, immovable rock.
        </motion.p>
        <motion.p variants={fadeUp} custom={3} className="text-sm leading-relaxed mb-3" style={{ color: B.textGray }}>
          It's made of hundreds of small choices — how much goes to your pension, what health plan you need, whether you want meals or cash, insurance or investment.
        </motion.p>
        <motion.p variants={fadeUp} custom={4} className="text-sm leading-relaxed mb-3" style={{ color: B.textGray }}>
          Most payroll systems treat compensation like a boulder — heavy, immovable, one-size-fits-all.
        </motion.p>
        <motion.p variants={fadeUp} custom={5} className="text-sm font-bold leading-relaxed" style={{ color: B.textDark }}>
          We think it should be like pebbles — small, flexible pieces you arrange to fit your life.
        </motion.p>
      </div>
      <motion.div variants={slideR} custom={3} className="md:col-span-2 flex items-center justify-center">
        <img src="/logos/pebbles/icon_color.png" alt="Pebbles Icon" className="w-32 md:w-40 object-contain" />
      </motion.div>
    </div>
    {/* Bottom quote strip */}
    <motion.div variants={fadeUp} custom={6} className="mt-10 -mx-8 md:-mx-12 px-8 md:px-12 py-4 text-center" style={{ background: B.pinkTint }}>
      <p className="text-xs md:text-sm italic max-w-2xl mx-auto" style={{ color: B.pink }}>
        "Some months you need more health coverage. Some months you want more cash. Your life changes. Your pay should too."
      </p>
    </motion.div>
  </SlideContainer>
);

/* ═══════════════════════════════════════
   SLIDE 3 — ROOTED IN SCRIPTURE
   ═══════════════════════════════════════ */
const Slide3 = () => {
  const scriptures = [
    {
      ref: "Luke 19:40",
      quote: '"If they keep quiet, the stones will cry out."',
      note: "Pebbles carries truth that speaks for itself. When benefits are structured correctly and compensation is fair, the numbers don't need defending — they stand on their own.",
    },
    {
      ref: "Joshua 4:6-7",
      quote: '"These stones are to be a memorial..."',
      note: "Every payslip, every allocation, every benefit election is a record — a witness — of fair dealing between employer and employee.",
    },
    {
      ref: "Luke 10:7 / 1 Timothy 5:18",
      quote: '"The worker deserves his wages."',
      note: "At its core, Pebbles exists to ensure workers are paid rightly, on time, and with maximum value from their compensation.",
    },
  ];

  return (
    <SlideContainer dark>
      <SlideTitle light>ROOTED IN SCRIPTURE</SlideTitle>
      <SectionLabel>THE INSPIRATION</SectionLabel>

      <div className="space-y-10 mt-4">
        {scriptures.map((s, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="flex gap-4">
            <PinkDot />
            <div>
              <div className="text-[13px] font-bold mb-1" style={{ color: B.pink }}>{s.ref}</div>
              <div className="text-sm italic mb-2" style={{ color: B.white }}>{s.quote}</div>
              <div className="text-[11px] leading-relaxed" style={{ color: B.textMuted }}>{s.note}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </SlideContainer>
  );
};

/* ═══════════════════════════════════════
   SLIDE 4 — THE ICON: THREE MEANINGS
   ═══════════════════════════════════════ */
const Slide4 = () => {
  const meanings = [
    { num: 1, title: "Coins", subtitle: "STACKED PAY", body: "The shapes look like coins stacked on each other — representing payroll, salary, and the financial core of what Pebbles does. Money, structured and organized." },
    { num: 2, title: "Food", subtitle: "BENEFITS", body: "They also resemble stacked bread or burger patties — a nod to food benefits, meal allowances, and the tangible benefits employees receive through the platform." },
    { num: 3, title: "Pebbles", subtitle: "THE NAME", body: "And of course, they look like 2D pebbles stacked together — directly reflecting the brand name and the idea of small pieces building something meaningful." },
  ];

  return (
    <SlideContainer>
      <PinkAccentBar />
      <SlideTitle>THE ICON</SlideTitle>
      <SectionLabel>THREE MEANINGS IN ONE MARK</SectionLabel>

      <div className="grid md:grid-cols-3 gap-5 mt-2">
        {meanings.map((m, i) => (
          <motion.div
            key={i}
            variants={fadeIn}
            custom={i + 2}
            className="rounded p-6"
            style={{ background: B.lightGray, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mb-4" style={{ background: B.pink }}>
              {m.num}
            </div>
            <div className="text-lg font-bold mb-0.5" style={{ color: B.textDark }}>{m.title}</div>
            <div className="text-[11px] font-bold tracking-[3px] uppercase mb-3" style={{ color: B.pink }}>{m.subtitle}</div>
            <p className="text-xs leading-relaxed" style={{ color: B.textGray }}>{m.body}</p>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} custom={6} className="flex justify-center mt-8">
        <img src="/logos/pebbles/icon_color.png" alt="Pebbles Icon" className="h-8 object-contain opacity-40" />
      </motion.div>
    </SlideContainer>
  );
};

/* ═══════════════════════════════════════
   SLIDE 5 — THE COLOR: WHY PINK?
   ═══════════════════════════════════════ */
const Slide5 = () => {
  const reasons = [
    { title: "Unconventional by Design", body: "Most fintech and payroll brands default to blue. We intentionally chose pink to break from convention. In a sea of sameness, Pebbles refuses to blend in." },
    { title: "Impossible to Ignore", body: "Imagine a row of app icons on your phone — blue, blue, blue, blue, then pink. You'd want to know what that is. The color is a statement before you even read the name." },
    { title: "Care and Wellbeing", body: "Pebbles is like a motherly presence for your finances — it cares about your benefits, your wellbeing, your take-home pay. The warmth of pink reflects that nurturing quality without being tied to any stereotype." },
    { title: "Brand Identity, Not Convention", body: "Ultimately, the pink is Pebbles. It doesn't represent a category or a cliché. It represents us — bold, different, and unapologetically committed to standing out." },
  ];

  return (
    <SlideContainer dark>
      {/* Decorative pink circle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.08, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: B.pink }}
      />

      <SlideTitle light>THE COLOR</SlideTitle>
      <SectionLabel>WHY PINK?</SectionLabel>

      <div className="space-y-8 mt-2">
        {reasons.map((r, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="flex gap-4">
            <PinkDot />
            <div>
              <div className="text-[15px] font-bold mb-1" style={{ color: B.white }}>{r.title}</div>
              <div className="text-[11.5px] leading-relaxed" style={{ color: B.textLight }}>{r.body}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Color swatch */}
      <motion.div variants={fadeIn} custom={7} className="absolute bottom-12 right-12 text-center hidden md:block">
        <div className="w-16 h-16 rounded-full mx-auto mb-2" style={{ background: B.pink }} />
        <span className="text-xs font-mono" style={{ color: B.textMuted }}>#FF2D8A</span>
      </motion.div>
    </SlideContainer>
  );
};

/* ═══════════════════════════════════════
   SLIDE 6 — WHAT PEBBLES DOES
   ═══════════════════════════════════════ */
const Slide6 = () => {
  const employers = [
    "Structure employee compensation into cash and compliant benefits",
    "Ensure full compliance with Nigerian tax law (NTA 2025)",
    "Maintain a complete audit trail for every allocation",
    "Attract and retain talent with flexible compensation",
    "One dashboard for all benefits administration",
  ];
  const employees = [
    "Choose how your salary is allocated each month",
    "Access food, health, transport, and lifestyle benefits",
    "See your estimated tax impact in real-time",
    "Change your benefit elections as your life changes",
    "Keep more of what you earn, compliantly",
  ];

  return (
    <SlideContainer>
      <PinkAccentBar />
      <SlideTitle>WHAT PEBBLES DOES</SlideTitle>
      <SectionLabel>HIGH LEVEL</SectionLabel>

      <div className="grid md:grid-cols-2 gap-5 mt-2">
        {/* Employer card — light */}
        <motion.div variants={slideL} custom={2} className="rounded p-6" style={{ background: B.lightGray, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="text-lg font-bold mb-4" style={{ color: B.textDark }}>For Employers</div>
          <ul className="space-y-2.5">
            {employers.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: B.textGray }}>
                <span className="shrink-0 mt-0.5">•</span> {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Employee card — dark */}
        <motion.div variants={slideR} custom={2} className="rounded p-6" style={{ background: B.dark, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
          <div className="text-lg font-bold mb-4" style={{ color: B.white }}>For Employees</div>
          <ul className="space-y-2.5">
            {employees.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: "#BBBBBB" }}>
                <span className="shrink-0 mt-0.5">•</span> {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </SlideContainer>
  );
};

/* ═══════════════════════════════════════
   SLIDE 7 — THE VISION
   ═══════════════════════════════════════ */
const Slide7 = () => {
  const visions = [
    { num: "01", title: "Compliance Infrastructure", body: "Help governments and regulators track benefits, tax compliance, and payroll structures transparently. Every transaction documented, every election auditable." },
    { num: "02", title: "Employee Empowerment", body: "Give every worker the power to structure their compensation in a way that fits their life — not a one-size-fits-all approach decided in an office they've never visited." },
    { num: "03", title: "Workforce Commerce", body: "Build the platform where payroll meets commerce — connecting employees to vendors, benefits, financial services, and eventually an entire ecosystem of value, all routed through salary." },
    { num: "04", title: "Pan-African and Beyond", body: "Starting with Nigeria, expanding across Africa and into emerging markets worldwide. Wherever employees are underserved by rigid payroll systems, Pebbles belongs." },
  ];

  return (
    <SlideContainer dark>
      <SlideTitle light>THE VISION</SlideTitle>
      <SectionLabel>WHERE WE'RE GOING</SectionLabel>

      <div className="space-y-8 mt-2">
        {visions.map((v, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="flex gap-5">
            <div className="text-xl font-bold shrink-0 w-10" style={{ color: B.pink }}>{v.num}</div>
            <div>
              <div className="text-[15px] font-bold mb-1" style={{ color: B.white }}>{v.title}</div>
              <div className="text-[11.5px] leading-relaxed" style={{ color: B.textMuted }}>{v.body}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </SlideContainer>
  );
};

/* ═══════════════════════════════════════
   SLIDE 8 — CLOSING
   ═══════════════════════════════════════ */
const Slide8 = () => (
  <SlideContainer dark>
    <div className="flex flex-col items-center justify-center text-center min-h-[55vh]">
      <motion.img
        variants={fadeIn}
        custom={0}
        src="/logos/pebbles/icon_white.png"
        alt="Pebbles Icon"
        className="w-24 md:w-28 mb-8 object-contain"
      />
      <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-bold mb-4" style={{ color: B.white, fontFamily: "'Outfit', 'Inter', 'DM Sans', sans-serif" }}>
        Pebbles
      </motion.h2>
      <motion.p variants={fadeUp} custom={2} className="text-base italic mb-8" style={{ color: B.pink }}>
        Your salary, in pieces you control.
      </motion.p>
      <motion.p variants={fadeUp} custom={3} className="text-xs" style={{ color: B.textGray }}>
        pebbles.financial
      </motion.p>
    </div>
  </SlideContainer>
);

/* ═══════════════════════════════════════
   MAIN PRESENTATION COMPONENT
   ═══════════════════════════════════════ */
const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8];
const TOTAL = SLIDES.length;

export default function PebblesBrandPresentation() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < TOTAL) {
      setCurrent(idx);
      const el = document.getElementById(`pebbles-slide-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, goTo]);

  useEffect(() => {
    const handleScroll = () => {
      const vh = window.innerHeight;
      const idx = Math.round(window.scrollY / vh);
      if (idx !== current && idx >= 0 && idx < TOTAL) setCurrent(idx);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [current]);

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
        @media print { .pebbles-nav { display: none !important; } * { animation: none !important; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ─── Top Nav ─── */}
      <div className="pebbles-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3" style={{ background: "rgba(13,13,13,0.8)", backdropFilter: "blur(14px)", borderBottom: `1px solid rgba(255,45,138,0.12)` }} data-testid="pebbles-nav">
        <div className="flex items-center gap-2.5">
          <img src="/logos/pebbles/icon_white.png" alt="Pebbles" className="h-5 object-contain" />
          <span className="text-xs font-semibold hidden sm:inline" style={{ color: B.white }}>Pebbles</span>
        </div>
        <div className="text-sm font-mono font-bold" style={{ color: B.white }} data-testid="pebbles-slide-counter">
          {String(current + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
        </div>
      </div>

      {/* ─── Left Progress Dots ─── */}
      <div className="pebbles-nav fixed left-3 top-1/2 -translate-y-1/2 z-40 flex-col gap-2 hidden lg:flex">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: i === current ? B.pink : `${B.white}33`, transform: i === current ? "scale(1.6)" : "scale(1)" }} />
        ))}
      </div>

      {/* ─── Bottom Progress Bar ─── */}
      <div className="pebbles-nav fixed bottom-0 left-0 right-0 z-40 h-[3px]" style={{ background: `${B.dark}` }}>
        <motion.div className="h-full" style={{ background: B.pink }} animate={{ width: `${((current + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.4, ease }} />
      </div>

      {/* ─── Navigation Arrows ─── */}
      <div className="pebbles-nav fixed bottom-5 right-5 z-40 flex gap-2">
        <button onClick={() => goTo(current - 1)} disabled={current === 0} className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-20" style={{ background: `${B.white}15`, backdropFilter: "blur(8px)" }} data-testid="pebbles-prev">
          <ChevronLeft className="w-4 h-4" style={{ color: B.white }} />
        </button>
        <button onClick={() => goTo(current + 1)} disabled={current === TOTAL - 1} className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-20" style={{ background: `${B.white}15`, backdropFilter: "blur(8px)" }} data-testid="pebbles-next">
          <ChevronRight className="w-4 h-4" style={{ color: B.white }} />
        </button>
      </div>

      {/* ─── All Slides ─── */}
      {SLIDES.map((SlideComp, i) => (
        <div key={i} id={`pebbles-slide-${i}`} data-testid={`pebbles-slide-${i + 1}`}>
          <SlideComp />
        </div>
      ))}
    </div>
  );
}
