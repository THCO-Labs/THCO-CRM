import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, Briefcase, Award, Shield, Globe, Code2, Cpu, Users, Zap, Server } from "lucide-react";

const C = {
  navy: "#1E2761", teal: "#0D9488", white: "#FFFFFF", light: "#F8FAFC",
  border: "#E2E8F0", text: "#1E293B", textMuted: "#64748B", red: "#DC2626",
  navyLight: "#263175", tealLight: "#CCFBF1", slate: "#94A3B8",
};
const ease = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease } }) };
const fadeIn = { hidden: { opacity: 0, scale: 0.96 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.5, delay: i * 0.1, ease } }) };
const slideR = { hidden: { opacity: 0, x: 30 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.6, delay: i * 0.12, ease } }) };

const Footer = () => (
  <div className="absolute bottom-0 left-0 right-0 px-8 py-2 flex items-center justify-between text-[10px]" style={{ color: C.textMuted, borderTop: `1px solid ${C.border}` }}>
    <span>TN Macaulay | Confidential</span>
    <span className="font-bold tracking-wider" style={{ color: C.red }}>CONFIDENTIAL</span>
  </div>
);
const FooterDark = () => (
  <div className="absolute bottom-0 left-0 right-0 px-8 py-2 flex items-center justify-between text-[10px]" style={{ color: "#475569", borderTop: `1px solid ${C.navyLight}` }}>
    <span>TN Macaulay | Confidential</span>
    <span className="font-bold tracking-wider" style={{ color: "#EF4444" }}>CONFIDENTIAL</span>
  </div>
);

const Slide = ({ children, dark = false, className = "" }) => (
  <div className={`relative min-h-screen flex items-center ${className}`} style={{ background: dark ? C.navy : C.white }}>
    <motion.div className="relative z-10 w-full max-w-[1100px] mx-auto px-6 md:px-8 py-20" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      {children}
    </motion.div>
    {dark ? <FooterDark /> : <Footer />}
  </div>
);

/* ── Reusable: experience bullet ── */
const ExpItem = ({ icon: Icon, org, years, desc, i }) => (
  <motion.div variants={slideR} custom={i} className="flex gap-3 mb-3">
    <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center mt-0.5" style={{ background: `${C.teal}18` }}>
      <Icon className="w-3.5 h-3.5" style={{ color: C.teal }} />
    </div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[13px] font-semibold" style={{ color: C.navy }}>{org}</span>
        {years && <span className="text-[10px]" style={{ color: C.textMuted }}>{years}</span>}
      </div>
      <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: C.text }}>{desc}</p>
    </div>
  </motion.div>
);

/* ── Header bar for team slides ── */
const MemberHeader = ({ name, role, email }) => (
  <motion.div variants={fadeUp} custom={0} className="rounded-lg px-6 py-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2" style={{ background: C.navy }}>
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-white">{name}</h2>
      <p className="text-sm" style={{ color: C.teal }}>{role}</p>
    </div>
    <div className="flex items-center gap-2 text-xs" style={{ color: C.slate }}>
      <Mail className="w-3.5 h-3.5" style={{ color: C.teal }} />
      {email}
    </div>
  </motion.div>
);

/* ── Cert/Security badge row ── */
const Badges = ({ items, i }) => (
  <motion.div variants={fadeUp} custom={i} className="flex flex-wrap gap-2 mt-4">
    {items.map((b, j) => (
      <span key={j} className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: C.tealLight, color: C.teal }}>{b}</span>
    ))}
  </motion.div>
);

/* ═══════════════════════════════════════
   SLIDE 1 — TITLE
   ═══════════════════════════════════════ */
const S1 = () => (
  <Slide dark>
    <div className="text-center min-h-[60vh] flex flex-col items-center justify-center">
      <motion.div variants={fadeIn} custom={0} className="flex items-center gap-4 mb-8">
        {["TN Macaulay", "IHS Towers Nigeria"].map((n, i) => (
          <div key={i} className="px-4 py-1.5 rounded text-[10px] font-semibold" style={{ background: C.navyLight, color: C.slate, border: `1px solid ${C.navyLight}` }}>{n}</div>
        ))}
      </motion.div>
      <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-6xl font-bold mb-3" style={{ color: C.white }}>Procure AI</motion.h1>
      <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl mb-2" style={{ color: C.teal }}>Delivery Team</motion.p>
      <motion.div variants={fadeIn} custom={3} className="w-16 h-[1px] my-6" style={{ background: C.teal }} />
      <motion.p variants={fadeUp} custom={4} className="text-sm mb-2" style={{ color: C.slate }}>TN Macaulay | IHS Towers Nigeria Engagement</motion.p>
      <motion.div variants={fadeUp} custom={5} className="flex items-center gap-3 mt-8">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${C.teal}22` }}>
          <Users className="w-5 h-5" style={{ color: C.teal }} />
        </div>
        <span className="text-xs font-medium" style={{ color: C.slate }}>4 Specialists | Architecture, AI, Cloud, Leadership</span>
      </motion.div>
      <motion.div variants={fadeUp} custom={6} className="mt-8 text-[10px] font-bold tracking-widest" style={{ color: "#EF4444" }}>CONFIDENTIAL</motion.div>
    </div>
  </Slide>
);

/* ═══════════════════════════════════════
   SLIDE 2 — Emmanuel Daniel
   ═══════════════════════════════════════ */
const S2 = () => (
  <Slide>
    <MemberHeader name="Emmanuel Daniel" role="Supporting Solution Architect / Technical Design Support" email="emmanuel@tnmacaulay.com" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Bio */}
      <motion.div variants={fadeUp} custom={1}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.teal }}>Biography</div>
        <p className="text-[12px] leading-relaxed" style={{ color: C.text }}>
          Emmanuel is a solutions architect and technology leader with over 10 years of experience designing cloud-native, AI-powered, and enterprise-grade systems across fintech, banking, and e-commerce. On the Procure AI engagement, he provides supporting architecture design — translating platform requirements into detailed technical specifications, system blueprints, and integration patterns that underpin delivery across all modules. His background combines deep full-stack engineering experience with cloud architecture, frontend systems, and AI/ML deployment across regulated financial environments.
        </p>
        <Badges items={["AWS Solutions Architect", "Azure Solutions Architect", "Mobile Web Specialist — Udacity"]} i={3} />
      </motion.div>
      {/* Right — Experience */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: C.teal }}>Key Experience</div>
        <ExpItem icon={Briefcase} org="TN Macaulay" years="Current" desc="Supporting Solution Architect on Procure AI — contributing to technical design, architecture documentation, and integration specifications." i={2} />
        <ExpItem icon={Server} org="Suretree Systems" years="2023–2026" desc="Led enterprise solution architecture across multiple industries; deployed AI/ML modules for fraud detection and recommendation systems; reduced system downtime by 30%." i={3} />
        <ExpItem icon={Globe} org="Kirgawa Technologies" years="2022–2023" desc="Delivered cloud migration strategies reducing client infrastructure costs by 25%; produced end-to-end architecture documentation and system design specifications." i={4} />
        <ExpItem icon={Zap} org="Stax Payments" years="2021–2022" desc="Designed scalable fintech solutions integrating Experian, Coris, and third-party APIs; built cloud-native applications using AWS Lambda and serverless frameworks." i={5} />
        <ExpItem icon={Code2} org="Woven Finance" years="2020–2022" desc="Frontend Engineer — built and optimised frontend features for enterprise fintech applications using React and Vue.js; integrated RESTful APIs across cross-functional teams; improved UI performance on business and customer-facing dashboards." i={6} />
        <ExpItem icon={Shield} org="Access Bank HQ" years="2019–2020" desc="Delivered 6 enterprise-grade banking applications in 8 months; built Swift payment integrations processing over 70,000 live transactions." i={7} />
      </div>
    </div>
  </Slide>
);

/* ═══════════════════════════════════════
   SLIDE 3 — David Temitope
   ═══════════════════════════════════════ */
const S3 = () => (
  <Slide>
    <MemberHeader name="David Temitope" role="AI Model Development & Training" email="david@thcohq.com" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Bio */}
      <motion.div variants={fadeUp} custom={1}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.teal }}>Biography</div>
        <p className="text-[12px] leading-relaxed" style={{ color: C.text }}>
          David is an accomplished machine learning engineer and AI platform builder with deep expertise in designing intelligent systems for enterprise environments. On Procure AI, he leads AI model development and training — building the vendor matching engine, NLP document processing pipeline, decision engine, and forecasting models that form the platform's intelligence core. His experience spans pioneering AI chatbot development for West Africa's investment banking sector, scaling AI-powered platforms to hundreds of millions of records, and delivering enterprise compliance frameworks across regulated industries. He brings hands-on Microsoft Dynamics 365 integration experience directly relevant to IHS Towers' ERP environment.
        </p>
        <Badges items={["SOC2", "ISO27001", "PCI-DSS", "Zero-trust Architecture", "Full Audit Logging"]} i={3} />
      </motion.div>
      {/* Right — Experience */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: C.teal }}>Key Experience</div>
        <ExpItem icon={Cpu} org="Procure AI / TN Macaulay" years="Current" desc="Full ownership of AI model development, D365 integration, microservices infrastructure, and platform security. Vendor-to-RFx matching algorithms improving accuracy by 70% across 20+ factors. NLP document parsers processing 4,000+ documents daily with 70–85% accuracy, reducing manual review by 80%." i={2} />
        <ExpItem icon={Zap} org="Lyft, USA" years="2025" desc="Senior Software AI Engineer — AI-powered dynamic pricing processing 100K+ requests/sec at sub-50ms latency; MLOps infrastructure for continuous model training; 50+ concurrent pricing experiments." i={3} />
        <ExpItem icon={Users} org="Talen AI" years="2021–2024" desc="Senior Engineering Lead — platform managing 300M+ candidate profiles; AI ranking algorithms improving match rates by 70%; reduced time-to-hire from 45 to 15 days." i={4} />
        <ExpItem icon={Globe} org="Fincra" years="2019–2021" desc="Engineering Lead — scaled cross-border payments from $1M to $10M monthly across 30 countries; achieved SOC2, ISO27001, PCI-DSS compliance with zero breaches; reduced latency by 80%." i={5} />
        <ExpItem icon={Code2} org="Meristem Securities" years="2016–2018" desc="Co-developed West Africa's first AI-powered financial services chatbot — resolved 85% of new customer queries, 10,000+ monthly interactions, reducing service costs by 40%." i={6} />
        <ExpItem icon={Server} org="Quidax" years="2018–2019" desc="Built cryptocurrency trading and market-making systems; reduced API response time from 850ms to 120ms via Redis caching, serving 2M+ daily requests." i={7} />
      </div>
    </div>
  </Slide>
);

/* ═══════════════════════════════════════
   SLIDE 4 — James Anih
   ═══════════════════════════════════════ */
const S4 = () => (
  <Slide>
    <MemberHeader name="James Anih" role="DevOps / Cloud Engineer & Software Engineer" email="james@thcohq.com" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Bio */}
      <motion.div variants={fadeUp} custom={1}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.teal }}>Biography</div>
        <p className="text-[12px] leading-relaxed" style={{ color: C.text }}>
          James is a senior software and cloud infrastructure engineer with over 7 years of experience building high-performance, Azure-hosted backend systems across enterprise platforms. Currently embedded within the TN Macaulay delivery team, he owns deployment pipelines, infrastructure monitoring, and cloud infrastructure support for Procure AI — ensuring the platform's microservices run reliably, securely, and at scale on IHS Towers' Azure environment. His background spans AI platform infrastructure, loyalty systems, and web application development across Nigerian and international technology environments.
        </p>
      </motion.div>
      {/* Right — Experience */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: C.teal }}>Key Experience</div>
        <ExpItem icon={Briefcase} org="TN Macaulay" years="Current" desc="DevOps / Cloud Engineer & Software Engineer on Procure AI — responsible for deployment pipelines, infrastructure monitoring, and Azure cloud infrastructure support." i={2} />
        <ExpItem icon={Server} org="Pakam Nigeria" years="2022–2024" desc="Senior Backend Developer — led high-performance backend infrastructure increasing performance by 40%; engineered Azure high-availability solutions; automated monitoring reducing downtime by 25%; applied OWASP security practices across the platform." i={3} />
        <ExpItem icon={Cpu} org="Talen.ai" years="2022–2023" desc="Senior Software Engineer — led core infrastructure design for AI-powered talent platform; architected AI-driven candidate matching algorithms; integrated AI agents for automated preliminary interviews." i={4} />
        <ExpItem icon={Award} org="Loyalty Solutions Nigeria" years="2020–2022" desc="Built custom loyalty programme infrastructure using PHP/Laravel; integrated Tango Card, Amazon Gift Cards, and Amadeus APIs; reduced manual intervention by 50% and improved redemption efficiency by 35%." i={5} />
        <ExpItem icon={Code2} org="Alicktish Limited" years="2018–2020" desc="Web Developer — designed web applications based on client requirements; managed web presence and built custom solutions using JavaScript and MySQL." i={6} />
      </div>
    </div>
  </Slide>
);

/* ═══════════════════════════════════════
   SLIDE 5 — Ayo Omomia
   ═══════════════════════════════════════ */
const S5 = () => (
  <Slide>
    <MemberHeader name="Ayo Omomia" role="Technical Lead / AI Solution Architect" email="ayo@thcohq.com" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Bio */}
      <motion.div variants={fadeUp} custom={1}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.teal }}>Biography</div>
        <p className="text-[12px] leading-relaxed" style={{ color: C.text }}>
          Ayo is a technologist, AI solution architect, and enterprise delivery leader with nearly two decades of experience spanning software engineering, product design, marketing technology, and AI platform development. Currently at TN Macaulay as Technical Lead on the Procure AI engagement, he owns overall AI architecture, resource allocation, and technical direction — ensuring the platform is built to IHS Towers' operational scale and integration requirements.
        </p>
        <p className="text-[12px] leading-relaxed mt-3" style={{ color: C.text }}>
          He brings rare breadth: beginning his career as a hands-on product designer and software engineer, progressing through enterprise technology advisory and marketing software engineering, and going on to lead large-scale AI and talent technology programmes globally. Notably, he previously led the design and delivery of a procurement and reverse auction platform for Vodafone — giving him direct, hands-on experience in the exact problem domain Procure AI addresses. He also co-developed West Africa's first AI-powered chatbot for an investment bank at Meristem Securities.
        </p>
      </motion.div>
      {/* Right — Experience */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: C.teal }}>Key Experience</div>
        <ExpItem icon={Briefcase} org="TN Macaulay" years="Current" desc="Technical Lead / AI Solution Architect on Procure AI — leading AI architecture, team resource allocation, and programme technical direction for IHS Towers." i={2} />
        <ExpItem icon={Globe} org="THCO" years="2020–Present" desc="Senior Partner — executive leadership of a global growth and productivity company spanning talent, technology, and business solutions; mission to connect 1 billion people through scalable, people-centric platforms." i={3} />
        <ExpItem icon={Users} org="Andela" years="2019–2020" desc="Led internship and global talent expansion programme; drove technical and non-technical growth initiatives across Africa and international markets (Spotlight Award, 2019)." i={4} />
        <ExpItem icon={Zap} org="Vodafone / Vodacom" years="2017–2019" desc="Built and deployed a procurement and reverse auction platform; drove human-centric technology development and Digital HR programmes (Staff of the Month, February 2018)." i={5} />
        <ExpItem icon={Shield} org="Open Advisory" years="2015–2019" desc="Senior Technology Advisor — part of the team that built West Africa's first AI-powered chatbot for an investment bank." i={6} />
        <ExpItem icon={Award} org="Diageo" years="2013–2014" desc="Marketing Software Engineer — brand technology systems, software-driven event coordination, and product visibility programmes across markets." i={7} />
        <ExpItem icon={Code2} org="Atom Group" years="2007–2013" desc="Product Designer & Software Engineer — nearly 6 years designing and engineering digital products, forming the foundation of his technical career." i={8} />
      </div>
    </div>
  </Slide>
);

/* ═══════════════════════════════════════
   MAIN PRESENTATION
   ═══════════════════════════════════════ */
const SLIDES = [S1, S2, S3, S4, S5];
const TOTAL = SLIDES.length;

export default function ProcureAIMeetTheTeam() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < TOTAL) {
      setCurrent(idx);
      document.getElementById(`team-slide-${idx}`)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [current, goTo]);

  useEffect(() => {
    const h = () => { const idx = Math.round(window.scrollY / window.innerHeight); if (idx !== current && idx >= 0 && idx < TOTAL) setCurrent(idx); };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, [current]);

  return (
    <div style={{ fontFamily: "Inter, 'DM Sans', sans-serif" }}>
      <style>{`@media print { .team-nav { display: none !important; } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`}</style>
      {/* Nav */}
      <div className="team-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-2.5" style={{ background: "rgba(30,39,97,0.92)", backdropFilter: "blur(14px)", borderBottom: `1px solid rgba(13,148,136,0.15)` }} data-testid="team-nav">
        <span className="text-xs font-bold" style={{ color: C.teal }}>Procure AI — Delivery Team</span>
        <span className="text-sm font-mono font-bold" style={{ color: C.white }} data-testid="team-counter">{String(current + 1).padStart(2, "0")} / {TOTAL}</span>
      </div>
      {/* Progress dots */}
      <div className="team-nav fixed left-3 top-1/2 -translate-y-1/2 z-40 flex-col gap-1.5 hidden lg:flex">
        {SLIDES.map((_, i) => <button key={i} onClick={() => goTo(i)} className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: i === current ? C.teal : `${C.white}33`, transform: i === current ? "scale(1.5)" : "scale(1)" }} aria-label={`Go to slide ${i + 1}`} />)}
      </div>
      {/* Progress bar */}
      <div className="team-nav fixed bottom-0 left-0 right-0 z-40 h-[3px]" style={{ background: C.navy }}>
        <motion.div className="h-full" style={{ background: C.teal }} animate={{ width: `${((current + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.4, ease }} />
      </div>
      {/* Nav arrows */}
      <div className="team-nav fixed bottom-4 right-4 z-40 flex gap-2">
        <button onClick={() => goTo(current - 1)} disabled={current === 0} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20" style={{ background: `${C.white}15`, backdropFilter: "blur(8px)" }} data-testid="team-prev"><ChevronLeft className="w-4 h-4" style={{ color: C.white }} /></button>
        <button onClick={() => goTo(current + 1)} disabled={current === TOTAL - 1} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20" style={{ background: `${C.white}15`, backdropFilter: "blur(8px)" }} data-testid="team-next"><ChevronRight className="w-4 h-4" style={{ color: C.white }} /></button>
      </div>
      {/* Slides */}
      {SLIDES.map((SC, i) => <div key={i} id={`team-slide-${i}`} data-testid={`team-slide-${i + 1}`}><SC /></div>)}
    </div>
  );
}
