import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, Users, Layers, Shield, AlertTriangle, CheckCircle, Server, Globe, FileText, BarChart3, GitBranch, Lock, Zap, Target, ArrowRight } from "lucide-react";

const C = {
  navy: "#1A2744", teal: "#0D9488", white: "#FFFFFF", light: "#F8FAFC",
  border: "#E2E8F0", text: "#1E293B", textMuted: "#64748B", red: "#DC2626",
  amber: "#D97706", green: "#16A34A", tealLight: "#CCFBF1", navyLight: "#1E3A5F",
};
const ease = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease } }) };
const fadeIn = { hidden: { opacity: 0, scale: 0.96 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.5, delay: i * 0.1, ease } }) };
const slideL = { hidden: { opacity: 0, x: -30 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.6, delay: i * 0.1, ease } }) };

const SectionNum = ({ num }) => (
  <motion.div variants={fadeIn} custom={0} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold mb-3" style={{ background: C.teal, color: C.white }}>{num}</motion.div>
);
const SlideTitle = ({ children, light = false }) => (
  <motion.h2 variants={fadeUp} custom={0} className="text-2xl md:text-3xl font-bold mb-1" style={{ color: light ? C.white : C.navy }}>{children}</motion.h2>
);
const SubTitle = ({ children, light = false }) => (
  <motion.p variants={fadeUp} custom={1} className="text-xs md:text-sm mb-5" style={{ color: light ? "#94A3B8" : C.textMuted }}>{children}</motion.p>
);
const Footer = () => (
  <div className="absolute bottom-0 left-0 right-0 px-8 py-2 flex items-center justify-between text-[10px]" style={{ color: C.textMuted, borderTop: `1px solid ${C.border}` }}>
    <span>Procure AI | EY–TN Macaulay Alignment | March 2026</span>
    <span className="font-bold tracking-wider" style={{ color: C.red }}>CONFIDENTIAL</span>
  </div>
);
const FooterDark = () => (
  <div className="absolute bottom-0 left-0 right-0 px-8 py-2 flex items-center justify-between text-[10px]" style={{ color: "#475569", borderTop: `1px solid ${C.navyLight}` }}>
    <span>Procure AI | EY–TN Macaulay Alignment | March 2026</span>
    <span className="font-bold tracking-wider" style={{ color: "#EF4444" }}>CONFIDENTIAL</span>
  </div>
);

const Slide = ({ children, dark = false, className = "" }) => (
  <div className={`relative min-h-screen flex items-center ${className}`} style={{ background: dark ? C.navy : C.white }}>
    <motion.div className="relative z-10 w-full max-w-[1100px] mx-auto px-8 py-20" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      {children}
    </motion.div>
    {dark ? <FooterDark /> : <Footer />}
  </div>
);

/* Table helper */
const Table = ({ headers, rows, highlightLast = false, raciMode = false }) => (
  <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${C.border}` }}>
    <table className="w-full text-[11px]">
      <thead>
        <tr style={{ background: C.navy }}>
          {headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-white whitespace-nowrap">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <motion.tr key={ri} variants={fadeUp} custom={ri + 2} className={`${highlightLast && ri === rows.length - 1 ? "font-bold" : ""}`} style={{ background: ri % 2 === 0 ? C.light : C.white, borderBottom: `1px solid ${C.border}` }}>
            {row.map((cell, ci) => (
              <td key={ci} className={`px-3 py-2 whitespace-nowrap ${raciMode && ci > 0 ? "text-center" : ""}`} style={{ color: highlightLast && ri === rows.length - 1 ? C.navy : C.text }}>
                {raciMode && ci > 0 ? (
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${cell.includes("R") || cell.includes("A") ? "bg-teal-100 text-teal-800" : cell.includes("C") ? "bg-slate-100 text-slate-600" : cell.includes("I") ? "bg-slate-50 text-slate-400" : ""}`}>{cell}</span>
                ) : cell}
              </td>
            ))}
          </motion.tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ═══ SLIDE 1 — TITLE ═══ */
const S1 = () => (
  <Slide dark>
    <div className="text-center min-h-[60vh] flex flex-col items-center justify-center">
      <motion.div variants={fadeIn} custom={0} className="flex items-center gap-4 mb-8">
        {["IHS Towers Nigeria", "TN Macaulay", "EY Nigeria"].map((n, i) => (
          <div key={i} className="px-4 py-1.5 rounded text-[10px] font-semibold" style={{ background: C.navyLight, color: "#94A3B8", border: `1px solid ${C.navyLight}` }}>{n}</div>
        ))}
      </motion.div>
      <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-6xl font-bold mb-3" style={{ color: C.white }}>Procure AI</motion.h1>
      <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl mb-2" style={{ color: C.teal }}>PMO / TQA Alignment Session</motion.p>
      <motion.p variants={fadeUp} custom={3} className="text-sm mb-8" style={{ color: "#94A3B8" }}>TN Macaulay (Solution Developer) x EY Nigeria (PMO/TQA)</motion.p>
      <motion.div variants={fadeIn} custom={4} className="w-16 h-[1px] mb-6" style={{ background: C.teal }} />
      <motion.p variants={fadeUp} custom={5} className="text-xs" style={{ color: "#64748B" }}>March 2026 | Virtual Session | Ahead of Group CIO Executive Presentation</motion.p>
      <motion.div variants={fadeUp} custom={6} className="mt-6 text-[10px] font-bold tracking-widest" style={{ color: "#EF4444" }}>CONFIDENTIAL</motion.div>
    </div>
  </Slide>
);

/* ═══ SLIDE 2 — SESSION OBJECTIVES ═══ */
const S2 = () => {
  const items = [
    { num: "01", title: "Delivery Methodology", time: "15 min", desc: "Agile execution, sprint cadence, working software every 2 weeks" },
    { num: "02", title: "Roles & Responsibilities", time: "15 min", desc: "Developer vs PMO/TQA — clear swim lanes, no duplication" },
    { num: "03", title: "Solution Architecture", time: "15 min", desc: "6 microservices, 4 AI engines, D365 integration, dependencies" },
    { num: "04", title: "Governance & Reporting", time: "15 min", desc: "SteerCo, sprint reviews, escalation pathways, reporting cadence" },
    { num: "05", title: "Timelines & Critical Path", time: "15 min", desc: "13-month roadmap, milestones, phase gates, dependencies" },
    { num: "06", title: "Risks & Assumptions", time: "10 min", desc: "8 programme risks, mitigations, shared ownership model" },
  ];
  return (
    <Slide>
      <SlideTitle>Session Objectives & Agenda</SlideTitle>
      <SubTitle>Establish alignment between TN Macaulay (Developer) and EY (PMO/TQA) ahead of Group CIO presentation.</SubTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {items.map((it, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 2} className="rounded-lg p-4" style={{ background: C.light, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold" style={{ color: C.teal }}>{it.num}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.tealLight, color: C.teal }}>{it.time}</span>
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: C.navy }}>{it.title}</div>
            <div className="text-[11px]" style={{ color: C.textMuted }}>{it.desc}</div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={9} className="rounded-lg px-4 py-3 text-center text-xs font-semibold" style={{ background: C.navy, color: C.teal }}>
        Target: Coordinated delivery model for CIO presentation — one team, one plan, one voice.
      </motion.div>
    </Slide>
  );
};

/* ═══ SLIDE 3 — PROJECT SNAPSHOT ═══ */
const S3 = () => (
  <Slide>
    <SectionNum num="01" />
    <SlideTitle>Project Snapshot</SlideTitle>
    <SubTitle>Procure AI — AI-Powered Procurement Platform for IHS Towers Nigeria</SubTitle>
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[
        { val: "13 Months", label: "Programme Duration", sub: "Feb 2026 – Feb 2027", icon: <Clock className="w-5 h-5" /> },
        { val: "3 Phases", label: "Foundation → RFx → Intelligence", sub: "Phased delivery", icon: <Layers className="w-5 h-5" /> },
        { val: "7 People", label: "TN Macaulay Delivery Team", sub: "12,640 total hours", icon: <Users className="w-5 h-5" /> },
      ].map((s, i) => (
        <motion.div key={i} variants={fadeIn} custom={i + 2} className="rounded-lg p-4 text-center" style={{ background: C.light, border: `1px solid ${C.border}` }}>
          <div className="flex justify-center mb-2" style={{ color: C.teal }}>{s.icon}</div>
          <div className="text-xl font-bold" style={{ color: C.navy }}>{s.val}</div>
          <div className="text-xs font-semibold" style={{ color: C.text }}>{s.label}</div>
          <div className="text-[10px]" style={{ color: C.textMuted }}>{s.sub}</div>
        </motion.div>
      ))}
    </div>
    <div className="space-y-2">
      {[
        { phase: "Phase 1: Foundation & Core", time: "Feb–May 2026 (4 mo)", items: "Vendor Portal, Due Diligence, AI Bot, Reverse Auction", color: C.teal },
        { phase: "Phase 2: RFx Workflows", time: "Jun–Oct 2026 (5 mo)", items: "RFx Creation, Sourcing, Scope Validation, BAFO, Templates", color: "#3B82F6" },
        { phase: "Phase 3: Intelligence Suite", time: "Nov 2026–Feb 2027 (4 mo)", items: "Forecasting, Category Mgmt, TCO, Audit, Settings", color: C.navy },
      ].map((p, i) => (
        <motion.div key={i} variants={fadeUp} custom={i + 5} className="rounded-lg p-3 flex items-center gap-4" style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${p.color}` }}>
          <div className="min-w-[180px]"><span className="text-xs font-bold" style={{ color: p.color }}>{p.phase}</span><br /><span className="text-[10px]" style={{ color: C.textMuted }}>{p.time}</span></div>
          <div className="text-[11px]" style={{ color: C.text }}>{p.items}</div>
        </motion.div>
      ))}
    </div>
    <motion.p variants={fadeUp} custom={9} className="text-[10px] mt-3 italic" style={{ color: C.textMuted }}>Build-and-Transfer model — IHS owns all code, data, and IP. Not SaaS.</motion.p>
  </Slide>
);

/* ═══ SLIDE 4 — DELIVERY METHODOLOGY ═══ */
const S4 = () => {
  const steps = ["Sprint Planning", "Development & Build", "Integration Testing", "Sprint Demo", "Review & Retro"];
  const days = ["Day 1", "Days 2–8", "Days 9–10", "Day 10", "Day 10"];
  const principles = [
    { title: "Working software every sprint", desc: "No slides-only reviews, stakeholders see running features bi-weekly" },
    { title: "Dev → UAT → Production pipeline", desc: "Dev (TN Macaulay Azure) → UAT (IHS Azure) → Prod (IHS deploys)" },
    { title: "CI/CD with security gates", desc: "10-stage pipeline: build, test, static analysis, security scan, code review, deploy" },
    { title: "Phase gates with go/no-go", desc: "Each phase ends with UAT sign-off and formal go-live approval" },
    { title: "Formal change control", desc: "Any scope addition requires signed CR with timeline and cost impact" },
  ];
  return (
    <Slide>
      <SectionNum num="01" />
      <SlideTitle>Delivery Methodology & Execution</SlideTitle>
      <SubTitle>2-Week Sprint Cycle</SubTitle>
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 2} className="flex items-center gap-1">
            <div className="rounded-lg px-3 py-2 text-center min-w-[120px]" style={{ background: i === 3 ? C.teal : C.light, border: `1px solid ${i === 3 ? C.teal : C.border}`, color: i === 3 ? C.white : C.navy }}>
              <div className="text-[11px] font-semibold">{s}</div>
              <div className="text-[9px]" style={{ color: i === 3 ? "#D1FAE5" : C.textMuted }}>{days[i]}</div>
            </div>
            {i < 4 && <ArrowRight className="w-4 h-4 shrink-0" style={{ color: C.textMuted }} />}
          </motion.div>
        ))}
      </div>
      <div className="space-y-2">
        {principles.map((p, i) => (
          <motion.div key={i} variants={slideL} custom={i + 7} className="flex gap-3 items-start rounded-lg p-3" style={{ background: C.light, border: `1px solid ${C.border}` }}>
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.teal }} />
            <div><span className="text-xs font-semibold" style={{ color: C.navy }}>{p.title}</span> <span className="text-[11px]" style={{ color: C.textMuted }}>— {p.desc}</span></div>
          </motion.div>
        ))}
      </div>
    </Slide>
  );
};

/* ═══ SLIDE 5 — TEAM ═══ */
const S5 = () => (
  <Slide>
    <SectionNum num="02" />
    <SlideTitle>TN Macaulay Delivery Team</SlideTitle>
    <SubTitle>7 dedicated resources — 12,640 total hours across 13 months.</SubTitle>
    <Table
      headers={["Role", "Phase 1 (4 mo)", "Phase 2 (5 mo)", "Phase 3 (4 mo)", "Total Hours"]}
      rows={[
        ["Project Director", "10 hrs/wk", "10 hrs/wk", "10 hrs/wk", "520"],
        ["Technical PM", "40 hrs/wk", "40 hrs/wk", "40 hrs/wk", "2,080"],
        ["Solution Architect", "40 hrs/wk", "20 hrs/wk", "10 hrs/wk", "1,200"],
        ["Senior Full-Stack Dev x2", "40 hrs/wk ea", "40 hrs/wk ea", "40 hrs/wk ea", "4,160"],
        ["AI/ML Engineer", "20 hrs/wk", "30 hrs/wk", "40 hrs/wk", "1,560"],
        ["QA Engineer", "20 hrs/wk", "40 hrs/wk", "40 hrs/wk", "1,760"],
        ["DevOps Engineer", "30 hrs/wk", "20 hrs/wk", "30 hrs/wk", "1,360"],
        ["TOTAL", "", "", "", "12,640"],
      ]}
      highlightLast
    />
    <motion.p variants={fadeUp} custom={12} className="text-[10px] mt-3 italic" style={{ color: C.textMuted }}>Architecture-heavy in Phase 1 (Architect 40 hrs/wk), AI-heavy in Phase 3 (AI/ML Engineer 40 hrs/wk). Resources flex based on phase priorities.</motion.p>
  </Slide>
);

/* ═══ SLIDE 6 — ROLES & RESPONSIBILITIES ═══ */
const S6 = () => {
  const tn = ["Solution architecture & technical design", "Platform development (6 microservices)", "AI/ML engine development & training", "D365 & third-party integration build", "CI/CD pipeline & automated testing", "Sprint demos & working software delivery", "Technical documentation & API specs", "Performance testing & security scanning", "Knowledge transfer & handover (Month 13)", "L3 support (hypercare & retained)"];
  const ey = ["Programme governance & oversight", "Sprint tracking & velocity reporting", "Stakeholder communications & SteerCo", "Risk & issue management reporting", "Change control process management", "Quality assurance reviews & code audits", "UAT coordination & sign-off tracking", "Budget tracking & milestone verification", "Escalation management & resolution", "Executive reporting & SteerCo packs"];
  return (
    <Slide>
      <SectionNum num="02" />
      <SlideTitle>Roles & Responsibilities</SlideTitle>
      <SubTitle>Clear swim lanes — no duplication, no gaps.</SubTitle>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {[{ title: "TN MACAULAY — Solution Developer", items: tn, color: C.teal }, { title: "EY NIGERIA — PMO / TQA", items: ey, color: C.navy }].map((col, ci) => (
          <motion.div key={ci} variants={ci === 0 ? slideL : fadeUp} custom={2} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <div className="px-4 py-2 text-xs font-bold" style={{ background: col.color, color: C.white }}>{col.title}</div>
            <div className="p-3 space-y-1.5">
              {col.items.map((item, i) => (
                <motion.div key={i} variants={fadeUp} custom={i * 0.5 + 3} className="flex gap-2 items-start text-[11px]" style={{ color: C.text }}>
                  <CheckCircle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: col.color }} /> {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={14} className="rounded-lg px-4 py-2 text-center text-[11px]" style={{ background: C.tealLight, color: C.teal, border: `1px solid ${C.teal}33` }}>
        <strong>Shared:</strong> Requirements validation | Risk mitigation | Phase gate reviews | CIO presentation alignment
      </motion.div>
    </Slide>
  );
};

/* ═══ SLIDE 7 — SOLUTION ARCHITECTURE ═══ */
const S7 = () => {
  const svcs = [
    { name: "Procurement", desc: "RFQ, bids, awards", icon: <FileText className="w-4 h-4" /> },
    { name: "Vendor", desc: "Registration, onboarding", icon: <Users className="w-4 h-4" /> },
    { name: "AI/ML", desc: "Scoring, LLM, forecasting", icon: <Zap className="w-4 h-4" /> },
    { name: "Analytics", desc: "Dashboards, KPIs", icon: <BarChart3 className="w-4 h-4" /> },
    { name: "Auction", desc: "Real-time bidding", icon: <Target className="w-4 h-4" /> },
    { name: "Contract", desc: "DocuSign, templates", icon: <FileText className="w-4 h-4" /> },
  ];
  return (
    <Slide>
      <SectionNum num="03" />
      <SlideTitle>Solution Architecture Overview</SlideTitle>
      <SubTitle>Azure-native microservices platform — deployed within IHS's own Azure subscription.</SubTitle>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {svcs.map((s, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 2} className="rounded-lg p-3 text-center" style={{ background: C.light, border: `1px solid ${C.border}` }}>
            <div className="flex justify-center mb-1" style={{ color: C.teal }}>{s.icon}</div>
            <div className="text-[11px] font-semibold" style={{ color: C.navy }}>{s.name}</div>
            <div className="text-[9px]" style={{ color: C.textMuted }}>{s.desc}</div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={8} className="rounded-lg px-4 py-2 text-center text-[10px] font-semibold mb-4" style={{ background: C.navy, color: C.teal }}>
        API HUB — Azure API Management | Auth | Rate Limiting | Logging | Circuit Breaking
      </motion.div>
      <Table
        headers={["Integration", "Direction", "Required By", "Priority", "Blocking?"]}
        rows={[
          ["Azure AD / Entra ID", "SSO", "Week 1", "Critical", "Yes"],
          ["D365 OData API", "Bidirectional", "Week 2", "Critical", "Yes"],
          ["Azure Data Lake", "Read-only", "Month 1", "High", "AI training"],
          ["ServiceNow", "Bidirectional", "Month 2", "Medium", "No"],
          ["D&B + NAVEX", "Outbound", "Month 3", "High", "Due diligence"],
          ["DocuSign", "Bidirectional", "Month 3", "Medium", "No"],
        ]}
      />
    </Slide>
  );
};

/* ═══ SLIDE 8 — GOVERNANCE ═══ */
const S8 = () => {
  const tiers = [
    { name: "STEERING COMMITTEE", freq: "Monthly", desc: "Strategic decisions, budget, escalations, go/no-go", who: "Exec Sponsor, Project Director, IT Lead, Project Owner, EY Lead" },
    { name: "PROJECT STATUS REVIEW", freq: "Weekly", desc: "Sprint progress, blockers, dependency tracking, risk review", who: "EY PM, TN Mac PM, IT Lead, Business Analysts" },
    { name: "SPRINT DEMO", freq: "Bi-weekly", desc: "Working software walkthrough, feedback, acceptance", who: "Full team + stakeholders" },
    { name: "TECHNICAL REVIEW", freq: "Weekly", desc: "Code quality, integration status, architecture decisions", who: "TN Mac Architect + Devs, IHS IT Lead, EY TQA" },
  ];
  const esc = [
    { label: "Workstream Lead", time: "24 hrs" },
    { label: "PM (TN Mac + EY)", time: "48 hrs" },
    { label: "SteerCo", time: "72 hrs" },
    { label: "Exec Sponsor", time: "Exception" },
  ];
  return (
    <Slide>
      <SectionNum num="04" />
      <SlideTitle>Governance Structure & Reporting</SlideTitle>
      <SubTitle>Four-tier governance model with clear escalation pathway.</SubTitle>
      <div className="space-y-2 mb-5">
        {tiers.map((t, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 2} className="rounded-lg p-3 flex items-start gap-4" style={{ background: i === 0 ? C.navy : C.light, border: `1px solid ${i === 0 ? C.navy : C.border}` }}>
            <div className="min-w-[160px]">
              <div className="text-[11px] font-bold" style={{ color: i === 0 ? C.white : C.navy }}>{t.name}</div>
              <div className="text-[10px] font-semibold" style={{ color: i === 0 ? C.teal : C.teal }}>{t.freq}</div>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: i === 0 ? "#CBD5E1" : C.text }}>{t.desc}</div>
              <div className="text-[10px] italic" style={{ color: i === 0 ? "#64748B" : C.textMuted }}>{t.who}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={7} className="text-xs font-semibold mb-2" style={{ color: C.navy }}>Escalation Pathway</motion.div>
      <div className="flex items-center gap-1 flex-wrap">
        {esc.map((e, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 8} className="flex items-center gap-1">
            <div className="rounded-lg px-3 py-2 text-center" style={{ background: i === 3 ? `${C.red}15` : C.light, border: `1px solid ${i === 3 ? C.red : C.border}` }}>
              <div className="text-[11px] font-semibold" style={{ color: i === 3 ? C.red : C.navy }}>{e.label}</div>
              <div className="text-[9px]" style={{ color: C.textMuted }}>{e.time}</div>
            </div>
            {i < 3 && <ArrowRight className="w-4 h-4 shrink-0" style={{ color: C.textMuted }} />}
          </motion.div>
        ))}
      </div>
    </Slide>
  );
};

/* ═══ SLIDE 9 — RACI ═══ */
const S9 = () => (
  <Slide>
    <SectionNum num="04" />
    <SlideTitle>RACI Matrix</SlideTitle>
    <SubTitle>Proposed RACI — for discussion and agreement with EY.</SubTitle>
    <Table
      headers={["Activity", "TN Mac", "EY", "IHS IT", "IHS Proc", "Exec Sponsor"]}
      raciMode
      rows={[
        ["Platform development & delivery", "R/A", "C", "C", "I", "I"],
        ["Solution architecture & design", "R/A", "C", "C", "I", "I"],
        ["AI/ML engine development", "R/A", "I", "C", "I", "I"],
        ["D365 & system integration", "R", "C", "A/C", "C", "I"],
        ["Sprint planning & tracking", "R", "A", "C", "C", "I"],
        ["Programme reporting & SteerCo", "C", "R/A", "C", "C", "I"],
        ["Risk & issue management", "R", "A", "C", "C", "I"],
        ["Quality assurance & code audits", "R", "R/A", "C", "I", "I"],
        ["UAT coordination & testing", "R", "C", "C", "R", "A"],
        ["Change control process", "C", "R/A", "C", "C", "A"],
        ["Go-live approval & sign-off", "R", "C", "C", "R", "A"],
        ["Change mgmt & training", "C", "C", "C", "R/A", "I"],
      ]}
    />
    <motion.p variants={fadeUp} custom={15} className="text-[10px] mt-3" style={{ color: C.textMuted }}>
      <strong>R</strong> = Responsible | <strong>A</strong> = Accountable | <strong>C</strong> = Consulted | <strong>I</strong> = Informed
    </motion.p>
  </Slide>
);

/* ═══ SLIDE 10 — REPORTING ═══ */
const S10 = () => {
  const artifacts = [
    { name: "Sprint Backlog & Burndown", owner: "TN Macaulay" },
    { name: "Weekly Status Report (RAG)", owner: "EY PMO" },
    { name: "Risk & Issue Register", owner: "EY PMO" },
    { name: "Change Request Log", owner: "EY PMO" },
    { name: "SteerCo Monthly Pack", owner: "EY PMO + TN Mac" },
    { name: "Technical Architecture Docs", owner: "TN Macaulay" },
  ];
  return (
    <Slide>
      <SectionNum num="04" />
      <SlideTitle>Reporting Framework & Deliverables</SlideTitle>
      <Table
        headers={["Cadence", "Forum", "Content", "Owner", "Audience"]}
        rows={[
          ["Daily", "Stand-up", "Blockers, progress, priorities", "TN Mac PM", "Dev team"],
          ["Weekly", "Sprint Review", "Velocity, blockers, demo prep", "TN Mac + EY", "PM + IT + BAs"],
          ["Bi-weekly", "Sprint Demo", "Working software walkthrough", "TN Macaulay", "Full project team"],
          ["Weekly", "Status Report", "RAG status, risks, milestones", "EY PMO", "SteerCo distribution"],
          ["Monthly", "SteerCo Pack", "Strategic progress, decisions, budget", "EY PMO", "Exec Sponsor + SteerCo"],
          ["Phase Gate", "Go / No-Go", "UAT results, readiness checklist", "Joint", "Exec Sponsor (final)"],
        ]}
      />
      <motion.div variants={fadeUp} custom={10} className="text-xs font-semibold mt-5 mb-2" style={{ color: C.navy }}>Key Reporting Artifacts</motion.div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {artifacts.map((a, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 11} className="rounded-lg p-3 flex items-center gap-2" style={{ background: C.light, border: `1px solid ${C.border}` }}>
            <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} />
            <div><div className="text-[11px] font-semibold" style={{ color: C.navy }}>{a.name}</div><div className="text-[9px]" style={{ color: C.textMuted }}>{a.owner}</div></div>
          </motion.div>
        ))}
      </div>
    </Slide>
  );
};

/* ═══ SLIDE 11 — ROADMAP ═══ */
const S11 = () => {
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  const deliverables = [
    ["1 (Feb)", "Kickoff, architecture design, D365 POC", "Architecture Sign-off"],
    ["2 (Mar)", "Vendor Portal (9 interfaces), API foundation", "Vendor Portal Alpha"],
    ["3 (Apr)", "Vendor Interface, Due Diligence, Risk Monitor", "Integration Testing"],
    ["4 (May)", "AI Bot, Reverse Auction, Phase 1 UAT", "PHASE 1 GO-LIVE"],
    ["5–6 (Jun–Jul)", "RFx Creation, Source Vendor, Scope Validation", "RFx Module Alpha"],
    ["7–9 (Aug–Oct)", "Review & Rank, BAFO, Templates, Phase 2 UAT", "PHASE 2 GO-LIVE"],
    ["10–11 (Nov–Dec)", "Forecasting, Category Mgmt, TCO Reporting", "Reporting Suite Live"],
    ["12–13 (Jan–Feb)", "Performance, Settings, Audit, KT, Final UAT", "PROJECT GO-LIVE"],
  ];
  return (
    <Slide>
      <SectionNum num="05" />
      <SlideTitle>13-Month Roadmap & Critical Path</SlideTitle>
      {/* Timeline bar */}
      <div className="mb-5">
        <div className="flex text-[9px] mb-1" style={{ color: C.textMuted }}>
          {months.map((m, i) => <div key={i} className="flex-1 text-center">{m}</div>)}
        </div>
        <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
          <motion.div variants={fadeIn} custom={2} className="rounded-l-lg flex items-center justify-center text-[9px] font-bold text-white" style={{ background: C.teal, flex: 4 }}>Phase 1</motion.div>
          <motion.div variants={fadeIn} custom={3} className="flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#3B82F6", flex: 5 }}>Phase 2</motion.div>
          <motion.div variants={fadeIn} custom={4} className="rounded-r-lg flex items-center justify-center text-[9px] font-bold text-white" style={{ background: C.navy, flex: 4 }}>Phase 3</motion.div>
        </div>
      </div>
      <Table
        headers={["Month", "Key Deliverables", "Milestone Gate"]}
        rows={deliverables}
      />
    </Slide>
  );
};

/* ═══ SLIDE 12 — CRITICAL PATH ═══ */
const S12 = () => (
  <Slide>
    <SectionNum num="05" />
    <SlideTitle>Critical Path Dependencies</SlideTitle>
    <SubTitle>EY to track and escalate — these are the items that block progress.</SubTitle>
    <Table
      headers={["ID", "Dependency", "Owner", "Required By", "Blocking?", "Status"]}
      rows={[
        ["D1", "Azure subscription provisioned", "IHS IT Infra", "Week 1", "Yes — critical path", "TBC"],
        ["D2", "D365 OData API credentials", "IHS EA", "Week 2", "Yes — critical path", "TBC"],
        ["D3", "VPN access for dev team", "IHS IT Infra", "Week 1", "Yes — critical path", "TBC"],
        ["D4", "Vendor master data export", "IHS SC + IT", "Month 1", "High", "TBC"],
        ["D5", "RFx templates from procurement", "IHS Procurement", "Month 2", "Medium", "TBC"],
        ["D6", "ServiceNow API specs", "IHS IT", "Month 2", "Medium", "TBC"],
        ["D7", "3rd-party API keys (D&B, NAVEX)", "IHS IT", "Month 3", "High", "TBC"],
        ["D8", "UAT environment provisioned", "IHS IT Infra", "Month 3", "High", "TBC"],
      ]}
    />
    <motion.div variants={fadeUp} custom={12} className="text-xs font-semibold mt-5 mb-2" style={{ color: C.navy }}>IHS Resources Required</motion.div>
    <Table
      headers={["Role", "Weekly Hours", "Key Activities"]}
      rows={[
        ["Executive Sponsor", "1 hr", "SteerCo, escalations, budget approval"],
        ["Project Owner (Procurement)", "8 hrs", "Requirements, UAT, business process decisions"],
        ["IT Lead", "8 hrs", "Technical review, integration support, security"],
        ["Business Analysts (x2)", "20 hrs each", "Requirements, process mapping, testing"],
        ["SMEs + Change Champions", "4 hrs each", "Domain expertise, training, feedback"],
      ]}
    />
  </Slide>
);

/* ═══ SLIDE 13 — RISK REGISTER ═══ */
const S13 = () => {
  const assumptions = [
    "IHS provides timely access to systems, environments, and API credentials per dependency schedule",
    "D365 supports required OData API integrations in its current configuration",
    "Scoping worksheet requirements are complete — new features go through change control",
    "LLM usage, cloud hosting, and third-party licences are IHS cost (not in TN Macaulay scope)",
    "EY handles programme reporting; TN Macaulay provides technical input and sprint data",
  ];
  return (
    <Slide>
      <SectionNum num="06" />
      <SlideTitle>Programme Risk Register</SlideTitle>
      <SubTitle>Jointly owned risks — EY to track, TN Macaulay and IHS to mitigate.</SubTitle>
      <Table
        headers={["ID", "Risk", "L", "I", "Mitigation", "Owner"]}
        rows={[
          ["R1", "D365 integration complexity", "Med", "High", "Early POC Month 1, integration specialist", "TN Mac"],
          ["R2", "Delayed IHS environment access", "Med", "High", "Parallel dev, dependency tracking", "IHS IT"],
          ["R3", "Scope creep from new requirements", "High", "Med", "Formal change control, weekly reviews", "Joint"],
          ["R4", "Key resource unavailability", "Low", "High", "Cross-training, backup resources", "TN Mac"],
          ["R5", "Data integration quality issues", "Med", "Med", "Data profiling, validation, cleansing", "Joint"],
          ["R6", "User adoption resistance", "Med", "Med", "Early engagement, training, champions", "IHS"],
          ["R7", "Third-party API changes", "Low", "Med", "Abstraction layer, API versioning", "TN Mac"],
          ["R8", "Security / compliance gaps", "Low", "High", "Review gates, pen testing, checklist", "Joint"],
        ]}
      />
      <motion.div variants={fadeUp} custom={12} className="text-xs font-semibold mt-5 mb-2" style={{ color: C.navy }}>Key Assumptions</motion.div>
      <div className="space-y-1.5">
        {assumptions.map((a, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 13} className="flex gap-2 items-start text-[11px]" style={{ color: C.text }}>
            <span className="font-bold shrink-0" style={{ color: C.teal }}>{i + 1}.</span> {a}
          </motion.div>
        ))}
      </div>
    </Slide>
  );
};

/* ═══ SLIDE 14 — NEXT STEPS ═══ */
const S14 = () => {
  const actions = [
    { num: 1, title: "Agree RACI matrix", owner: "EY + TN Mac", desc: "Confirm proposed responsibility split. Identify overlaps or gaps." },
    { num: 2, title: "Confirm reporting cadence & tools", owner: "EY Lead", desc: "Agree on sprint tracking tool, status report template, SteerCo pack format." },
    { num: 3, title: "Align on CIO presentation structure", owner: "Joint", desc: "Ensure coordinated narrative. One team, one plan, one voice." },
    { num: 4, title: "Agree change control process", owner: "EY PMO", desc: "Define CR template, approval workflow, impact assessment, turnaround SLAs." },
    { num: 5, title: "Confirm dependency tracking mechanism", owner: "EY PMO", desc: "EY to own dependency tracker with weekly updates. TN Mac flags blockers in sprint reviews." },
    { num: 6, title: "Schedule recurring governance meetings", owner: "EY + IHS", desc: "Weekly status review, bi-weekly sprint demo, monthly SteerCo." },
  ];
  return (
    <Slide>
      <SectionNum num="07" />
      <SlideTitle>Alignment Items & Next Steps</SlideTitle>
      <SubTitle>Decisions and actions needed from this session.</SubTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {actions.map((a, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 2} className="rounded-lg p-4" style={{ background: C.light, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: C.teal }}>{a.num}</span>
              <span className="text-[10px] font-semibold" style={{ color: C.textMuted }}>{a.owner}</span>
            </div>
            <div className="text-xs font-semibold mb-1" style={{ color: C.navy }}>{a.title}</div>
            <div className="text-[10px]" style={{ color: C.textMuted }}>{a.desc}</div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={9} className="rounded-lg px-4 py-3 text-center text-xs font-semibold" style={{ background: C.navy, color: C.teal }}>
        Target outcome: EY and TN Macaulay present as one coordinated delivery team to the Group CIO
      </motion.div>
    </Slide>
  );
};

/* ═══ SLIDE 15 — CLOSE ═══ */
const S15 = () => (
  <Slide dark>
    <div className="text-center min-h-[55vh] flex flex-col items-center justify-center">
      <motion.h2 variants={fadeUp} custom={0} className="text-4xl md:text-5xl font-bold mb-3" style={{ color: C.white }}>Thank You</motion.h2>
      <motion.p variants={fadeUp} custom={1} className="text-lg mb-6" style={{ color: C.teal }}>Let's build this together.</motion.p>
      <motion.div variants={fadeIn} custom={2} className="w-16 h-[1px] mb-6" style={{ background: C.teal }} />
      <motion.p variants={fadeUp} custom={3} className="text-sm mb-2" style={{ color: "#94A3B8" }}>TN Macaulay — Solution Developer | Procure AI Programme</motion.p>
      <motion.p variants={fadeUp} custom={4} className="text-xs italic mb-6" style={{ color: "#64748B" }}>Solution Architecture Document (47 pages) shared for detailed technical reference.</motion.p>
      <motion.div variants={fadeUp} custom={5} className="text-[10px] font-bold tracking-widest" style={{ color: "#EF4444" }}>CONFIDENTIAL</motion.div>
    </div>
  </Slide>
);

/* ═══════════════════════════════════════
   MAIN PRESENTATION
   ═══════════════════════════════════════ */
const SLIDES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15];
const TOTAL = SLIDES.length;

export default function ProcureAIEYPresentation() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < TOTAL) {
      setCurrent(idx);
      document.getElementById(`procure-slide-${idx}`)?.scrollIntoView({ behavior: "smooth" });
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
      <style>{`@media print { .procure-nav { display: none !important; } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`}</style>
      {/* Nav */}
      <div className="procure-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-2.5" style={{ background: "rgba(26,39,68,0.88)", backdropFilter: "blur(14px)", borderBottom: `1px solid rgba(13,148,136,0.15)` }} data-testid="procure-nav">
        <span className="text-xs font-bold" style={{ color: C.teal }}>Procure AI</span>
        <span className="text-sm font-mono font-bold" style={{ color: C.white }} data-testid="procure-counter">{String(current + 1).padStart(2, "0")} / {TOTAL}</span>
      </div>
      {/* Progress dots */}
      <div className="procure-nav fixed left-3 top-1/2 -translate-y-1/2 z-40 flex-col gap-1.5 hidden lg:flex">
        {SLIDES.map((_, i) => <button key={i} onClick={() => goTo(i)} className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: i === current ? C.teal : `${C.white}33`, transform: i === current ? "scale(1.5)" : "scale(1)" }} />)}
      </div>
      {/* Progress bar */}
      <div className="procure-nav fixed bottom-0 left-0 right-0 z-40 h-[3px]" style={{ background: C.navy }}>
        <motion.div className="h-full" style={{ background: C.teal }} animate={{ width: `${((current + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.4, ease }} />
      </div>
      {/* Nav arrows */}
      <div className="procure-nav fixed bottom-4 right-4 z-40 flex gap-2">
        <button onClick={() => goTo(current - 1)} disabled={current === 0} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20" style={{ background: `${C.white}15`, backdropFilter: "blur(8px)" }} data-testid="procure-prev"><ChevronLeft className="w-4 h-4" style={{ color: C.white }} /></button>
        <button onClick={() => goTo(current + 1)} disabled={current === TOTAL - 1} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20" style={{ background: `${C.white}15`, backdropFilter: "blur(8px)" }} data-testid="procure-next"><ChevronRight className="w-4 h-4" style={{ color: C.white }} /></button>
      </div>
      {/* Slides */}
      {SLIDES.map((SC, i) => <div key={i} id={`procure-slide-${i}`} data-testid={`procure-slide-${i + 1}`}><SC /></div>)}
    </div>
  );
}
