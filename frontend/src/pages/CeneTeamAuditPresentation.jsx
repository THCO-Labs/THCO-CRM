import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight, Code, Server, AlertTriangle, Shield, CheckCircle, XCircle, Database, CreditCard, Monitor, Smartphone, Users, GitBranch, Lock, Bell, Rocket, FileText, Activity, Zap } from "lucide-react";

const C = {
  dark: "#0e0e0e", light: "#f0f0f0", red: "#c0392b", white: "#FFFFFF",
  navy: "#1a1a2e", gray: "#aaaaaa", green: "#2ecc71", orange: "#e67e22",
  darkCard: "#1a1a1a", darkSurface: "#161616",
};
const ease = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 28 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1, ease } }) };
const fadeIn = { hidden: { opacity: 0, scale: 0.96 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.5, delay: i * 0.1, ease } }) };
const slideL = { hidden: { opacity: 0, x: -30 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.6, delay: i * 0.1, ease } }) };

const RedBar = () => <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: C.red }} />;
const Badge = ({ children, color }) => <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider" style={{ background: color, color: C.white }}>{children}</span>;
const Heading = ({ children, light = true }) => <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-2" style={{ color: light ? C.white : C.navy }}>{children}</motion.h2>;
const SubHead = ({ children }) => <motion.p variants={fadeUp} custom={1} className="text-sm italic mb-6" style={{ color: C.gray }}>{children}</motion.p>;
const XBullet = ({ children, delay = 0 }) => (
  <motion.div variants={fadeUp} custom={delay} className="flex gap-2 items-start mb-2">
    <XCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.red }} />
    <span className="text-sm" style={{ color: C.gray }}>{children}</span>
  </motion.div>
);
const Footer = ({ children }) => <motion.p variants={fadeUp} custom={12} className="text-[10px] italic mt-6" style={{ color: "#555" }}>{children}</motion.p>;

const Slide = ({ children, dark = true, className = "" }) => (
  <div className={`relative min-h-screen flex items-center ${className}`} style={{ background: dark ? C.dark : C.light }}>
    <RedBar />
    <motion.div className="relative z-10 w-full max-w-[1100px] mx-auto px-6 md:px-10 py-20" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      {children}
    </motion.div>
  </div>
);

/* Critical finding slide template */
const CriticalSlide = ({ id, title, impact, techLabel, techBullets, footer }) => (
  <Slide>
    <motion.div variants={fadeIn} custom={0}><Badge color={C.red}>CRITICAL</Badge></motion.div>
    <Heading>{id}: {title}</Heading>
    <motion.div variants={fadeUp} custom={2} className="rounded-lg p-4 mb-5 flex gap-3 items-start" style={{ background: `${C.red}18`, border: `1px solid ${C.red}44` }}>
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.red }} />
      <div><div className="text-xs font-bold mb-1" style={{ color: C.red }}>IMPACT — WHAT THIS MEANS FOR YOUR BUSINESS</div><p className="text-sm leading-relaxed" style={{ color: C.gray }}>{impact}</p></div>
    </motion.div>
    <motion.div variants={fadeUp} custom={3} className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: C.green }}>Technical Details</motion.div>
    <motion.div variants={fadeIn} custom={4} className="rounded-lg px-4 py-2 mb-4 inline-block font-mono text-sm" style={{ background: C.darkCard, color: C.green, border: `1px solid ${C.green}33` }}>{techLabel}</motion.div>
    <div className="mb-2">{techBullets.map((b, i) => <XBullet key={i} delay={i + 5}>{b}</XBullet>)}</div>
    <Footer>{footer}</Footer>
  </Slide>
);

/* ═══ SLIDE 1 — TITLE ═══ */
const S1 = () => (
  <Slide>
    <div className="text-center min-h-[60vh] flex flex-col items-center justify-center">
      <motion.h1 variants={fadeUp} custom={0} className="text-6xl md:text-8xl font-bold tracking-wider mb-4" style={{ color: C.white }}>CENETEAM</motion.h1>
      <motion.p variants={fadeUp} custom={1} className="text-2xl md:text-3xl font-medium mb-2" style={{ color: C.white }}>Security & Architecture Audit</motion.p>
      <motion.p variants={fadeUp} custom={2} className="text-lg mb-6" style={{ color: C.gray }}>Executive Summary Presentation</motion.p>
      <motion.div variants={fadeIn} custom={3} className="w-[40%] h-px mx-auto mb-6" style={{ background: `${C.white}33` }} />
      <motion.p variants={fadeUp} custom={4} className="text-xs mb-1" style={{ color: C.gray }}>CONFIDENTIAL | February 2026 | For Internal Review Only</motion.p>
      <motion.p variants={fadeUp} custom={5} className="text-xs" style={{ color: C.gray }}>Based on: Repository Code Analysis + Architecture Review Session</motion.p>
      <motion.div variants={fadeUp} custom={6} className="absolute bottom-6 right-8 text-sm font-semibold" style={{ color: `${C.white}88` }}>
        <span style={{ color: C.red }}>&#10022;</span> thco
      </motion.div>
    </div>
  </Slide>
);

/* ═══ SLIDE 2 — WHAT WE REVIEWED ═══ */
const S2 = () => (
  <Slide dark={false}>
    <Heading light={false}>What We Reviewed</Heading>
    <div className="grid md:grid-cols-2 gap-4 mt-4">
      {[
        { icon: <Code className="w-6 h-6" />, title: "Repository Scan", items: ["5 private GitHub repositories", "cene-web (consumer app)", "cene-admin (internal portal)", "cene-mobile (iOS/Android)", "ceneplus-mobile (exclusive app)", "Backend (Supabase Edge Functions)"], note: "Scanned: auth flows, payment code, CI/CD, configs, dependencies, database policies" },
        { icon: <Server className="w-6 h-6" />, title: "Architecture Review", items: ["In-person session with leadership team", "Platform architecture walkthrough", "Infrastructure & environment design", "Database & auth strategy", "Payment systems review", "Team structure & access controls"], note: "Assessed: operational readiness, governance, compliance posture, scalability" },
      ].map((card, ci) => (
        <motion.div key={ci} variants={fadeIn} custom={ci + 2} className="rounded-xl p-5" style={{ background: C.darkCard, color: C.white }}>
          <div className="flex items-center gap-3 mb-3">
            <div style={{ color: C.red }}>{card.icon}</div>
            <span className="text-lg font-bold">{card.title}</span>
          </div>
          {card.items.map((item, i) => <div key={i} className="text-sm mb-1.5 pl-4" style={{ color: C.gray }}>• {item}</div>)}
          <p className="text-xs italic mt-3 pt-3" style={{ color: "#777", borderTop: `1px solid #333` }}>{card.note}</p>
        </motion.div>
      ))}
    </div>
  </Slide>
);

/* ═══ SLIDE 3 — THE BOTTOM LINE ═══ */
const S3 = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const stats = [
    { val: 33, label: "Total Findings", color: C.white },
    { val: 4, label: "Critical", color: C.red },
    { val: 9, label: "High", color: C.orange },
    { val: 11, label: "Medium", color: "#f1c40f" },
    { val: 9, label: "Low", color: C.gray },
  ];
  return (
    <Slide>
      <Heading>The Bottom Line</Heading>
      <div ref={ref} className="flex flex-wrap justify-center gap-6 md:gap-10 my-8">
        {stats.map((s, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 1} className="text-center">
            <div className="text-5xl md:text-7xl font-bold" style={{ color: s.color }}>{inView ? s.val : 0}</div>
            <div className="text-xs mt-1" style={{ color: C.gray }}>{s.label}</div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={fadeUp} custom={7} className="text-xs text-center italic mb-6" style={{ color: C.gray }}>
        Security Report: 3 Critical, 5 High, 5 Medium, 4 Low | Architecture Report: 1 Critical, 4 High, 6 Medium, 5 Low
      </motion.p>
      <motion.div variants={fadeUp} custom={8} className="rounded-lg p-4 flex gap-3 items-start" style={{ background: `${C.red}18`, border: `1px solid ${C.red}44` }}>
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.orange }} />
        <div>
          <div className="text-xs font-bold mb-1" style={{ color: C.white }}>WHAT THIS MEANS</div>
          <p className="text-sm leading-relaxed" style={{ color: C.gray }}>The platform is not ready for public launch. An unauthenticated admin endpoint, exposed credentials, weak access controls, and no staging environment represent fundamental risks that must be addressed before any market expansion.</p>
        </div>
      </motion.div>
    </Slide>
  );
};

/* ═══ SLIDE 4 — FINDINGS BY SEVERITY ═══ */
const S4 = () => {
  const rows = [
    { label: "CRITICAL", count: 4, color: C.red, ids: "SEC-001 (9.8) | SEC-003 (8.8) | SEC-002 (8.6) | ARCH-001: No staging" },
    { label: "HIGH", count: 9, color: C.orange, ids: "SEC-004: XSS (7.5) | SEC-017: Webhook (7.5) | SEC-005 (7.3) | SEC-006 (7.1) | SEC-007 (6.5) | ARCH-002–005, ARCH-012" },
    { label: "MEDIUM", count: 11, color: "#f1c40f", ids: "SEC-008–012 | ARCH-006–010, ARCH-013" },
    { label: "LOW", count: 9, color: C.gray, ids: "SEC-013–016 | ARCH-011, ARCH-014–016" },
  ];
  return (
    <Slide>
      <Heading>Findings by Severity</Heading>
      <div className="space-y-3 mt-4">
        {rows.map((r, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="rounded-lg p-4 flex flex-wrap items-center gap-3" style={{ background: C.darkCard, borderLeft: `4px solid ${r.color}` }}>
            <Badge color={r.color}>{r.label} {r.count}</Badge>
            <span className="text-xs font-mono" style={{ color: C.gray }}>{r.ids}</span>
          </motion.div>
        ))}
      </div>
      <Footer>All finding IDs match the detailed Security Audit Report (SEC-xxx) and Architecture & Systems Audit Report (ARCH-xxx)</Footer>
    </Slide>
  );
};

/* ═══ SLIDE 5 — SEC-001 ═══ */
const S5 = () => (
  <CriticalSlide
    id="SEC-001" title="Unauthenticated Admin Invitation Endpoint"
    impact="Anyone can send a single HTTP request to create admin accounts with full platform access. CVSS 9.8 — the highest severity possible. This grants complete access to user data, events, and payment systems."
    techLabel="invite-to-organization edge function performs no authentication check"
    techBullets={["No authentication required to call the endpoint", "Allows creation of admin-level accounts", "Full access to user data, events, and payments", "Exploitable with a single unauthenticated HTTP request"]}
    footer="OWASP A01:2021 — Broken Access Control | CVSS: 9.8 (Critical) | Security Audit Report p.4"
  />
);

/* ═══ SLIDE 6 — SEC-002 ═══ */
const S6 = () => (
  <CriticalSlide
    id="SEC-002" title="Firebase Credentials in Mobile Repositories"
    impact="google-services.json and GoogleService-Info.plist are committed to source repositories. An attacker can extract these credentials to send unauthorized push notifications, abuse cloud resources, and access Firebase services."
    techLabel="google-services.json and GoogleService-Info.plist committed to repos"
    techBullets={["Firebase credentials exposed in version control history", "API keys extractable from compiled mobile binaries", "No Firebase App Check or domain restrictions configured", "Enables unauthorized access to Firebase services"]}
    footer="OWASP A02:2021 — Cryptographic Failures | CVSS: 8.6 (Critical) | Security Audit Report p.5"
  />
);

/* ═══ SLIDE 7 — SEC-003 ═══ */
const S7 = () => (
  <CriticalSlide
    id="SEC-003" title="RBAC Privilege Escalation via Direct Access"
    impact="Role-based access control can be bypassed. A regular authenticated user can escalate their own privileges to admin level by directly modifying the permissions table, gaining full access to all user data, events, and financial records."
    techLabel="user_roles table accessible via wildcard RLS policies"
    techBullets={["Wildcard permission grants bypass RBAC", "Authenticated users can self-elevate to admin", "Full access to all user data, events, financial records", "Undermines the entire authorization model"]}
    footer="OWASP A01:2021 — Broken Access Control | CVSS: 8.8 (Critical) | Security Audit Report p.6"
  />
);

/* ═══ SLIDE 8 — ARCH-001 ═══ */
const S8 = () => (
  <Slide>
    <motion.div variants={fadeIn} custom={0}><Badge color={C.red}>CRITICAL</Badge></motion.div>
    <Heading>ARCH-001: No Staging Environment — Code Goes Straight to Users</Heading>
    <motion.div variants={fadeUp} custom={2} className="rounded-lg p-4 mb-5 flex gap-3 items-start" style={{ background: `${C.red}18`, border: `1px solid ${C.red}44` }}>
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.red }} />
      <div>
        <div className="text-xs font-bold mb-1" style={{ color: C.red }}>IMPACT — WHAT THIS MEANS FOR YOUR BUSINESS</div>
        <p className="text-sm leading-relaxed" style={{ color: C.gray }}>Code changes go directly from development to production with no intermediate testing layer. The deployment pipeline (manual.yml) includes no automated tests, no approval gates, and no security scans. This creates scaling risk and compliance risk under NDPR and POPIA if development environments contain live user data.</p>
      </div>
    </motion.div>
    {/* Flow diagrams */}
    <div className="grid md:grid-cols-2 gap-4">
      <motion.div variants={slideL} custom={4} className="rounded-lg p-4" style={{ background: C.darkCard }}>
        <div className="text-xs font-bold mb-3" style={{ color: C.red }}>CURRENT FLOW</div>
        <div className="flex items-center gap-2 justify-center">
          <div className="rounded px-3 py-2 text-xs font-semibold" style={{ background: "#222", color: C.gray }}>Development</div>
          <span style={{ color: C.gray }}>→</span>
          <div className="rounded px-3 py-2 text-xs font-bold flex items-center gap-1" style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}` }}>
            <XCircle className="w-3.5 h-3.5" /> PRODUCTION
          </div>
        </div>
      </motion.div>
      <motion.div variants={fadeIn} custom={5} className="rounded-lg p-4" style={{ background: C.darkCard }}>
        <div className="text-xs font-bold mb-3" style={{ color: C.green }}>RECOMMENDED FLOW</div>
        <div className="flex items-center gap-2 justify-center">
          <div className="rounded px-3 py-2 text-xs font-semibold" style={{ background: "#222", color: C.gray }}>Development</div>
          <span style={{ color: C.gray }}>→</span>
          <div className="rounded px-3 py-2 text-xs font-semibold" style={{ background: "#222", color: C.orange }}>Staging/QA</div>
          <span style={{ color: C.gray }}>→</span>
          <div className="rounded px-3 py-2 text-xs font-bold flex items-center gap-1" style={{ background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}` }}>
            <CheckCircle className="w-3.5 h-3.5" /> Production
          </div>
        </div>
      </motion.div>
    </div>
    <Footer>Architecture & Systems Audit Report | ARCH-001</Footer>
  </Slide>
);

/* ═══ SLIDE 9 — HIGH SEVERITY ═══ */
const S9 = () => {
  const items = [
    { id: "SEC-004", title: "Cross-Site Scripting (XSS)", desc: "dangerouslySetInnerHTML without sanitization" },
    { id: "SEC-005", title: "Session Tokens in localStorage", desc: "Vulnerable to XSS token theft" },
    { id: "SEC-006", title: "No Rate Limiting on Auth", desc: "Brute-force attacks possible" },
    { id: "SEC-007", title: "Missing Security Headers", desc: "No CSP, X-Frame-Options, or HSTS" },
    { id: "ARCH-002", title: "No Access Control Policies", desc: "No offboarding process" },
    { id: "ARCH-003", title: "No Monitoring or Alerting", desc: "Platform outages undetected" },
    { id: "ARCH-004", title: "CI/CD Lacks Quality Gates", desc: "No tests or approvals before production" },
    { id: "ARCH-005", title: "Payment Flow Inconsistencies", desc: "Different providers on different screens" },
  ];
  return (
    <Slide dark={false}>
      <motion.div variants={fadeIn} custom={0}><Badge color={C.orange}>HIGH</Badge></motion.div>
      <Heading light={false}>9 High Severity Findings — Must Fix Before Launch</Heading>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {items.map((it, i) => (
          <motion.div key={i} variants={fadeIn} custom={i + 2} className="rounded-lg p-3" style={{ background: C.white, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
            <Badge color={C.orange}>{it.id}</Badge>
            <div className="text-sm font-bold mt-2 mb-1" style={{ color: C.navy }}>{it.title}</div>
            <div className="text-[11px]" style={{ color: "#666" }}>{it.desc}</div>
          </motion.div>
        ))}
      </div>
      <Footer>SEC-017: Unverified Payment Webhooks (CVSS 7.5) also rated High — see Security Audit Report</Footer>
    </Slide>
  );
};

/* ═══ SLIDE 10 — MEDIUM & LOW ═══ */
const S10 = () => {
  const mediums = [
    ["SEC-008", "Outdated Dependencies", "Known vulnerabilities in npm packages"],
    ["SEC-009", "Inconsistent Error Handling", "Stack traces leaked in responses"],
    ["SEC-010", "Multiple Auth Providers", "Fragmented authentication strategy"],
    ["SEC-011", "Insufficient Input Validation", "Missing server-side validation"],
    ["SEC-012", "Payment Data Handling", "Potential PCI DSS scope implications"],
    ["ARCH-006", "No Incident Response Plan", "No documented procedures"],
    ["ARCH-008", "Code Duplication Across Apps", "Shared logic not extracted"],
    ["ARCH-009", "No Load Testing Strategy", "Untested under peak traffic"],
  ];
  return (
    <Slide>
      <Heading>Medium & Low Severity Findings</Heading>
      <SubHead>Each item traceable to its source report by finding ID</SubHead>
      <motion.div variants={fadeUp} custom={2} className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "#f1c40f" }}>11 MEDIUM</motion.div>
      <div className="overflow-x-auto rounded-lg mb-5" style={{ border: `1px solid #333` }}>
        <table className="w-full text-[11px]">
          <tbody>
            {mediums.map((r, i) => (
              <motion.tr key={i} variants={fadeUp} custom={i + 3} style={{ background: i % 2 === 0 ? C.darkCard : C.dark, borderBottom: "1px solid #222" }}>
                <td className="px-3 py-2 font-mono font-bold" style={{ color: "#f1c40f" }}>{r[0]}</td>
                <td className="px-3 py-2 font-semibold" style={{ color: C.white }}>{r[1]}</td>
                <td className="px-3 py-2" style={{ color: C.gray }}>{r[2]}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <motion.div variants={fadeUp} custom={11} className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: C.gray }}>9 LOW</motion.div>
      <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid #333` }}>
        <table className="w-full text-[11px]">
          <tbody>
            {[["SEC-013", "Sensitive data in error responses", "Debug info exposed to users"], ["ARCH-011", "Notification single point of failure", "No fallback delivery channel"]].map((r, i) => (
              <motion.tr key={i} variants={fadeUp} custom={i + 12} style={{ background: i % 2 === 0 ? C.darkCard : C.dark, borderBottom: "1px solid #222" }}>
                <td className="px-3 py-2 font-mono font-bold" style={{ color: C.gray }}>{r[0]}</td>
                <td className="px-3 py-2 font-semibold" style={{ color: C.white }}>{r[1]}</td>
                <td className="px-3 py-2" style={{ color: C.gray }}>{r[2]}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer>+3 Medium (ARCH-007, ARCH-010, ARCH-013) +7 Low (SEC-014–016, ARCH-014–016) — see full reports for details</Footer>
    </Slide>
  );
};

/* ═══ SLIDE 11 — WHAT'S WORKING WELL ═══ */
const S11 = () => {
  const items = [
    { icon: <Database className="w-5 h-5" />, title: "Supabase with Row-Level Security", desc: "Database-level access control is a best practice many companies skip entirely" },
    { icon: <CreditCard className="w-5 h-5" />, title: "Dual Payment Providers", desc: "Paystack for Africa + Stripe for international gives broad market coverage" },
    { icon: <Monitor className="w-5 h-5" />, title: "Environment Separation", desc: "Dev and production use separate Supabase projects — but no staging/QA layer exists between them (ARCH-001)" },
    { icon: <Users className="w-5 h-5" />, title: "RBAC Implementation", desc: "Role-based access control at database level — good foundation, but SEC-003 identified escalation flaws" },
    { icon: <Smartphone className="w-5 h-5" />, title: "Mobile Ticket Security", desc: "QR codes restricted to mobile app shows security-conscious thinking about fraud" },
  ];
  return (
    <Slide>
      <Heading>What's Working Well</Heading>
      <SubHead>Several architectural decisions are solid and provide a good foundation</SubHead>
      <div className="space-y-3">
        {items.map((it, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="rounded-lg p-4 flex gap-4 items-start" style={{ background: C.darkCard, borderLeft: `4px solid ${C.green}` }}>
            <div style={{ color: C.green }}>{it.icon}</div>
            <div><div className="text-sm font-bold" style={{ color: C.white }}>{it.title}</div><div className="text-xs mt-0.5" style={{ color: C.gray }}>{it.desc}</div></div>
          </motion.div>
        ))}
      </div>
    </Slide>
  );
};

/* ═══ SLIDE 12 — REMEDIATION ROADMAP ═══ */
const S12 = () => {
  const phases = [
    { num: "PHASE 1", time: "Weeks 1–4", label: "Pre-Launch Critical", color: C.red, items: "Fix SEC-001 admin endpoint · Rotate Firebase creds (SEC-002) · Fix RBAC escalation (SEC-003) · Set up staging (ARCH-001) · Add auth rate limiting (SEC-006)" },
    { num: "PHASE 2", time: "Weeks 5–8", label: "Operational Readiness", color: C.orange, items: "Configure monitoring (ARCH-003) · Add security headers (SEC-007) · Fix XSS vectors (SEC-004) · Document access policies (ARCH-002) · Audit payment flows (ARCH-005)" },
    { num: "PHASE 3", time: "Months 3–4", label: "Architecture Optimization", color: "#3498db", items: "Extract shared code (ARCH-008) · Update dependencies (SEC-009) · Add CI/CD gates (ARCH-004/SEC-008) · Incident response plan (ARCH-006)" },
    { num: "PHASE 4", time: "Months 5–6", label: "Long-term Excellence", color: C.green, items: "Consolidate auth providers (SEC-010) · Notification resilience (ARCH-011) · Vendor risk mitigation (ARCH-014) · Hosting consolidation (ARCH-016)" },
  ];
  return (
    <Slide dark={false}>
      <Heading light={false}>Remediation Roadmap</Heading>
      <div className="space-y-3 mt-4">
        {phases.map((p, i) => (
          <motion.div key={i} variants={fadeUp} custom={i + 2} className="rounded-xl p-4" style={{ background: C.white, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `5px solid ${p.color}` }}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge color={p.color}>{p.num}</Badge>
              <span className="text-xs font-semibold" style={{ color: C.navy }}>{p.time}</span>
              <span className="text-xs" style={{ color: "#888" }}>|</span>
              <span className="text-xs font-bold" style={{ color: p.color }}>{p.label}</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#555" }}>{p.items}</p>
          </motion.div>
        ))}
      </div>
    </Slide>
  );
};

/* ═══ SLIDE 13 — CROSS-REFERENCE MATRIX ═══ */
const S13 = () => {
  const rows = [
    ["Authentication & Access", "SEC-001, SEC-003, SEC-005, SEC-006", "ARCH-002", "Fix admin endpoint + RBAC + access policies as one workstream"],
    ["CI/CD & Deployment", "SEC-002, SEC-008, SEC-009", "ARCH-001, ARCH-004", "Secrets management + staging + CI/CD gates + dependency updates"],
    ["Payment Security", "SEC-012, SEC-017", "ARCH-005", "Webhook verification + payment flow audit + privilege boundaries"],
    ["Monitoring & Response", "SEC-013, SEC-015", "ARCH-003, ARCH-006", "Monitoring, alerting, incident response, and error handling"],
    ["Testing & Quality", "SEC-010, SEC-011", "ARCH-008, ARCH-012", "Test strategy catches auth fragmentation; shared code reduces duplication"],
    ["Infrastructure", "SEC-014", "ARCH-014, ARCH-016", "Vendor risk mitigation + hosting consolidation"],
  ];
  return (
    <Slide>
      <Heading>Cross-Reference: Interconnected Findings</Heading>
      <SubHead>Many findings share root causes — fix them together to avoid duplicated effort</SubHead>
      <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid #333` }}>
        <table className="w-full text-[11px]">
          <thead><tr style={{ background: C.darkCard }}>{["Domain", "Security Findings", "Arch Findings", "Fix Together — Why It Matters"].map((h, i) => <th key={i} className="px-3 py-2 text-left font-bold" style={{ color: C.white }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, ri) => (
              <motion.tr key={ri} variants={fadeUp} custom={ri + 2} style={{ background: ri % 2 === 0 ? C.dark : C.darkCard, borderBottom: "1px solid #222" }}>
                <td className="px-3 py-2 font-semibold" style={{ color: C.white }}>{r[0]}</td>
                <td className="px-3 py-2 font-mono" style={{ color: C.red }}>{r[1]}</td>
                <td className="px-3 py-2 font-mono" style={{ color: C.orange }}>{r[2]}</td>
                <td className="px-3 py-2" style={{ color: C.gray }}>{r[3]}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer>Engineering teams should use this matrix to coordinate fixes and avoid addressing the same root cause twice</Footer>
    </Slide>
  );
};

/* ═══ SLIDE 14 — COMPLIANCE READINESS ═══ */
const S14 = () => {
  const rows = [
    { reg: "NDPR (Nigeria)", status: "PARTIAL", statusColor: C.orange, gap: "No Data Protection Officer, no privacy policy review" },
    { reg: "POPIA (South Africa)", status: "PARTIAL", statusColor: C.orange, gap: "No documented lawful basis for processing user data" },
    { reg: "GDPR (EU/International)", status: "LOW", statusColor: C.red, gap: "No data subject rights, no consent management system" },
    { reg: "PCI DSS (Payments)", status: "AT RISK", statusColor: C.red, gap: "Some flows may collect payment data directly — could bring full platform into PCI DSS scope" },
    { reg: "SOC 2 Type II", status: "NOT READY", statusColor: "#8B0000", gap: "No formal security policies, access docs, or monitoring" },
  ];
  return (
    <Slide>
      <Heading>Compliance Readiness</Heading>
      <SubHead>Where CeneTeam stands with key regulatory frameworks</SubHead>
      <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid #333` }}>
        <table className="w-full text-[11px]">
          <thead><tr style={{ background: C.darkCard }}>{["Regulation", "Status", "Key Gap"].map((h, i) => <th key={i} className="px-3 py-2 text-left font-bold" style={{ color: C.white }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, ri) => (
              <motion.tr key={ri} variants={fadeUp} custom={ri + 2} style={{ background: ri % 2 === 0 ? C.dark : C.darkCard, borderBottom: "1px solid #222" }}>
                <td className="px-3 py-2 font-semibold" style={{ color: C.white }}>{r.reg}</td>
                <td className="px-3 py-2"><Badge color={r.statusColor}>{r.status}</Badge></td>
                <td className="px-3 py-2" style={{ color: C.gray }}>{r.gap}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Slide>
  );
};

/* ═══ SLIDE 15 — WHAT HAPPENS NEXT ═══ */
const S15 = () => {
  const steps = [
    { num: "01", color: "#3498db", title: "Review the Full Reports", desc: "Two companion documents provide complete technical details: Security Audit Report (SEC-001 to SEC-017) and Architecture & Systems Audit Report (ARCH-001 to ARCH-016). Each finding includes remediation guidance." },
    { num: "02", color: C.orange, title: "Fix the 4 Critical Findings First", desc: "SEC-001, SEC-002, SEC-003, and ARCH-001 must be resolved before any market launch. Use the cross-reference matrix to coordinate." },
    { num: "03", color: C.green, title: "Schedule a Follow-Up Review", desc: "Once Phase 1 remediation is complete, a follow-up assessment will verify fixes and confirm the platform is ready for launch." },
  ];
  return (
    <Slide>
      <div className="text-center mb-6">
        <motion.div variants={fadeIn} custom={0}><Rocket className="w-16 h-16 mx-auto" style={{ color: C.white }} /></motion.div>
        <Heading>What Happens Next</Heading>
      </div>
      <div className="max-w-3xl mx-auto space-y-4">
        {steps.map((s, i) => (
          <motion.div key={i} variants={slideL} custom={i + 2} className="rounded-lg p-4 flex gap-4 items-start" style={{ background: C.darkCard, borderLeft: `5px solid ${s.color}` }}>
            <span className="text-2xl font-bold shrink-0" style={{ color: s.color }}>{s.num}</span>
            <div><div className="text-sm font-bold mb-1" style={{ color: C.white }}>{s.title}</div><div className="text-xs leading-relaxed" style={{ color: C.gray }}>{s.desc}</div></div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={fadeUp} custom={6} className="text-[10px] text-center italic mt-8" style={{ color: "#555" }}>CONFIDENTIAL | CeneTeam Security & Architecture Audit | February 2026</motion.p>
    </Slide>
  );
};

/* ═══ MAIN ═══ */
const SLIDES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15];
const TOTAL = SLIDES.length;

export default function CeneTeamAuditPresentation() {
  const [current, setCurrent] = useState(0);
  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < TOTAL) { setCurrent(idx); document.getElementById(`cene-slide-${idx}`)?.scrollIntoView({ behavior: "smooth" }); }
  }, []);
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [current, goTo]);
  useEffect(() => {
    const h = () => { const idx = Math.round(window.scrollY / window.innerHeight); if (idx !== current && idx >= 0 && idx < TOTAL) setCurrent(idx); };
    window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h);
  }, [current]);

  return (
    <div style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap'); @media print { .cene-nav { display: none !important; } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`}</style>
      <div className="cene-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-2.5" style={{ background: "rgba(14,14,14,0.88)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.red}22` }} data-testid="cene-nav">
        <span className="text-xs font-bold" style={{ color: C.white }}>CENETEAM <span style={{ color: C.red }}>AUDIT</span></span>
        <span className="text-sm font-mono font-bold" style={{ color: C.white }} data-testid="cene-counter">{String(current + 1).padStart(2, "0")} / {TOTAL}</span>
      </div>
      <div className="cene-nav fixed left-3 top-1/2 -translate-y-1/2 z-40 flex-col gap-1.5 hidden lg:flex">
        {SLIDES.map((_, i) => <button key={i} onClick={() => goTo(i)} className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: i === current ? C.red : `${C.white}33`, transform: i === current ? "scale(1.5)" : "scale(1)" }} />)}
      </div>
      <div className="cene-nav fixed bottom-0 left-0 right-0 z-40 h-[3px]" style={{ background: C.dark }}>
        <motion.div className="h-full" style={{ background: C.red }} animate={{ width: `${((current + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.4, ease }} />
      </div>
      <div className="cene-nav fixed bottom-4 right-4 z-40 flex gap-2">
        <button onClick={() => goTo(current - 1)} disabled={current === 0} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20" style={{ background: `${C.white}15`, backdropFilter: "blur(8px)" }} data-testid="cene-prev"><ChevronLeft className="w-4 h-4" style={{ color: C.white }} /></button>
        <button onClick={() => goTo(current + 1)} disabled={current === TOTAL - 1} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20" style={{ background: `${C.white}15`, backdropFilter: "blur(8px)" }} data-testid="cene-next"><ChevronRight className="w-4 h-4" style={{ color: C.white }} /></button>
      </div>
      {SLIDES.map((SC, i) => <div key={i} id={`cene-slide-${i}`} data-testid={`cene-slide-${i + 1}`}><SC /></div>)}
    </div>
  );
}
