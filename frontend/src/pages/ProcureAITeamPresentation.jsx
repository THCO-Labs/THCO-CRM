import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ═══ DESIGN TOKENS ═══ */
const C = {
  navy: "#1E2761", teal: "#0D9488", white: "#FFFFFF", light: "#F4F6F9",
  charcoal: "#1A1A2E", muted: "#94A3B8", border: "rgba(255,255,255,0.12)",
  darkBorder: "rgba(30,39,97,0.15)",
};

/* ═══ CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
.pai * { box-sizing:border-box; margin:0; padding:0; }
.pai { font-family:'Inter',sans-serif; overflow:hidden; }
@keyframes pai-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes pai-fade { from{opacity:0} to{opacity:1} }
@keyframes pai-left { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
@keyframes pai-right { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
@keyframes pai-scale { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
@keyframes pai-draw { from{width:0} to{width:100%} }
.pai-pg[data-active="true"] .pu { animation:pai-up 500ms ease-out both; }
.pai-pg[data-active="true"] .pf { animation:pai-fade 500ms ease-out both; }
.pai-pg[data-active="true"] .pl { animation:pai-left 500ms ease-out both; }
.pai-pg[data-active="true"] .pr { animation:pai-right 500ms ease-out both; }
.pai-pg[data-active="true"] .ps { animation:pai-scale 500ms ease-out both; }
.pai-pg[data-active="false"] .pu,.pai-pg[data-active="false"] .pf,.pai-pg[data-active="false"] .pl,
.pai-pg[data-active="false"] .pr,.pai-pg[data-active="false"] .ps { opacity:0; }
.pai-hl:hover { border-color:${C.teal} !important; box-shadow:0 0 12px ${C.teal}25 !important; }
.pai-chip { display:inline-flex; align-items:center; padding:6px 14px; border-radius:3px; font-size:13px; font-weight:600; white-space:nowrap; }
.pai-arrow { display:inline-flex; align-items:center; color:${C.teal}; font-size:14px; margin:0 4px; }
`;

const dl = (ms) => ({ animationDelay: `${ms}ms` });

/* ═══ SHARED COMPONENTS ═══ */
const Footer = () => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 40px", display: "flex", justifyContent: "center", zIndex: 5 }}>
    <span style={{ fontSize: 14, color: `${C.white}60`, letterSpacing: "0.04em" }}>TN Macaulay&ensp;|&ensp;IHS Towers Nigeria&ensp;|&ensp;Procure AI Engagement&ensp;|&ensp;Confidential</span>
  </div>
);

const FooterLight = () => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 40px", display: "flex", justifyContent: "center", zIndex: 5 }}>
    <span style={{ fontSize: 14, color: `${C.charcoal}50`, letterSpacing: "0.04em" }}>TN Macaulay&ensp;|&ensp;IHS Towers Nigeria&ensp;|&ensp;Procure AI Engagement&ensp;|&ensp;Confidential</span>
  </div>
);

const Timeline = ({ companies, delay = 0 }) => (
  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 20 }}>
    {companies.map((c, i) => (
      <span key={i} style={{ display: "contents" }}>
        <span className="pu pai-chip" style={{ ...dl(delay + i * 120), background: i === companies.length - 1 ? C.teal : `${C.navy}18`, color: i === companies.length - 1 ? C.white : C.navy }}>{c}</span>
        {i < companies.length - 1 && <span className="pf pai-arrow" style={dl(delay + i * 120 + 60)}>&rarr;</span>}
      </span>
    ))}
  </div>
);

const HighlightCard = ({ text, delay = 0 }) => (
  <div className="pu pai-hl" style={{ ...dl(delay), background: C.white, border: `1px solid ${C.darkBorder}`, borderRadius: 4, padding: "10px 14px", marginBottom: 8, transition: "border-color 200ms, box-shadow 200ms", cursor: "default" }}>
    <p style={{ fontSize: 17, color: C.charcoal, lineHeight: 1.6 }}>{text}</p>
  </div>
);

/* ═══ SLIDE 1: TITLE ═══ */
const S1 = ({ active }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const ts = [800, 1600, 2400].map((t, i) => setTimeout(() => setPhase(i + 1), t));
    return () => ts.forEach(clearTimeout);
  }, [active]);

  const introLines = [
    "The Procure AI delivery team brings together a carefully selected group of enterprise technologists, AI engineers, cloud architects, and delivery specialists.",
    "Each with deep hands-on experience across Azure cloud infrastructure, AI/ML platform development, and enterprise systems integration.",
    "Every member of this team has been chosen for their direct relevance to the challenges IHS Towers faces, and their proven ability to deliver at enterprise scale.",
  ];

  return (
    <div style={{ height: "100%", background: `linear-gradient(135deg, ${C.navy} 0%, #151D4A 50%, ${C.navy} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", textAlign: "center" }}>
      {/* Corner accents */}
      <div style={{ position: "absolute", top: 20, left: 20, width: 60, height: 60, borderTop: `2px solid ${C.teal}`, borderLeft: `2px solid ${C.teal}`, opacity: 0.5 }} />
      <div style={{ position: "absolute", bottom: 40, right: 20, width: 60, height: 60, borderBottom: `2px solid ${C.teal}`, borderRight: `2px solid ${C.teal}`, opacity: 0.5 }} />

      <h1 className="ps" style={{ ...dl(300), fontSize: 60, fontWeight: 900, color: C.white, letterSpacing: "0.1em" }}>PROCURE AI</h1>
      <p className="pf" style={{ ...dl(700), fontSize: 28, color: `${C.white}cc`, marginTop: 8, fontWeight: 300 }}>Delivery Team</p>
      <div className="pf" style={{ ...dl(1000), width: 60, height: 2, background: C.teal, margin: "20px auto" }} />
      <p className="pu" style={{ ...dl(1200), fontSize: 20, color: `${C.white}90`, marginBottom: 32 }}>TN Macaulay | IHS Towers Nigeria</p>

      <div style={{ maxWidth: 700, padding: "0 40px" }}>
        {introLines.map((line, i) => phase > i && (
          <p key={i} className="pu" style={{ fontSize: 19, color: `${C.white}b0`, lineHeight: 1.8, marginBottom: 8 }}>{line}</p>
        ))}
      </div>

      {/* TN Macaulay wordmark bottom right */}
      <div style={{ position: "absolute", bottom: 36, right: 40 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.teal, letterSpacing: "0.04em" }}>TN Macaulay</span>
      </div>
      <Footer />
    </div>
  );
};

/* ═══ PROFILE SLIDE TEMPLATE ═══ */
const ProfileSlide = ({ name, designation, role, companies, bio, highlights, delay = 0 }) => (
  <div style={{ height: "100%", background: C.light, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
    {/* Header bar */}
    <div style={{ background: C.navy, padding: "20px 40px", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 className="ps" style={{ ...dl(200), fontSize: 36, fontWeight: 800, color: C.white }}>{name}</h2>
          <p className="pf" style={{ ...dl(400), fontSize: 20, color: C.teal, fontWeight: 500, marginTop: 4 }}>{designation}</p>
        </div>
        <span className="pf" style={{ ...dl(500), fontSize: 15, color: `${C.white}70`, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", background: `${C.teal}20`, padding: "5px 14px", borderRadius: 3 }}>{role}</span>
      </div>
    </div>

    {/* Timeline */}
    <div style={{ padding: "14px 40px 0", flexShrink: 0 }}>
      <Timeline companies={companies} delay={600} />
    </div>

    {/* Accent line */}
    <div className="pf" style={{ ...dl(500), height: 2, background: `linear-gradient(90deg, ${C.teal}, transparent)`, margin: "0 40px 12px" }} />

    {/* Two-column content */}
    <div style={{ flex: 1, display: "flex", gap: 24, padding: "0 40px 40px", overflow: "hidden" }}>
      {/* Bio - left */}
      <div className="pl" style={{ ...dl(800), flex: "1 1 55%", overflowY: "auto", paddingRight: 8 }}>
        {bio.map((para, i) => (
          <p key={i} style={{ fontSize: 17, color: C.charcoal, lineHeight: 1.75, marginBottom: 12 }}>{para}</p>
        ))}
      </div>

      {/* Highlights - right */}
      <div style={{ flex: "1 1 45%", overflowY: "auto" }}>
        <p className="pf" style={{ ...dl(900), fontSize: 14, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Key Highlights</p>
        {highlights.map((h, i) => (
          <HighlightCard key={i} text={h} delay={1000 + i * 100} />
        ))}
      </div>
    </div>
    <FooterLight />
  </div>
);

/* ═══ SLIDE DATA ═══ */

const S2 = () => <ProfileSlide
  name="Motunrayo Ogunneye"
  designation="Service Delivery Manager"
  role="Project Lead / Client Coordination / Delivery Oversight"
  companies={["Globacom", "Tek Experts", "IKEA", "TN Macaulay"]}
  bio={[
    "Motunrayo is the Service Delivery Manager on the Procure AI engagement, responsible for end-to-end delivery operations, SLA adherence, client coordination, and cross-functional team alignment across the programme. She brings over 12 years of experience in customer success, IT service delivery, operations management, and people leadership across telecommunications, global technology, and retail sectors.",
    "She holds a First Class degree in Philosophy from Obafemi Awolowo University, graduating as the second-best overall student in her cohort and winning the Iyabo Bolarinwa Prize for academic excellence, a foundation that built her analytical rigour, structured thinking, and people-first leadership philosophy. She is certified in ITIL 4 Foundation (IT Service Management) and holds a Professional Diploma in Human Resource Management (CIPMN).",
    "Her most formative experience came at Tek Experts, where over nearly five years she rose from Pioneer Team Manager to Customer Success and Operations Manager for Microsoft Office 365 Commercial across EMEA, managing 150+ support engineers, 10 team managers, and 3 SMEs. She led the successful launch of a brand new M365 Commercial technical support unit, improved SLA adherence while reducing turnaround time by 20% through workflow optimisation, and used Power BI and CRM analytics to surface operational trends and drive strategic improvements in CSAT and efficiency. Critically, she managed Azure Subscription and Billing support operations, giving her direct familiarity with the Microsoft Azure ecosystem that underpins the Procure AI platform. At IKEA, she delivered multi-channel customer success operations, resolved complex service escalations, and led service improvement initiatives that enhanced efficiency and satisfaction across cross-functional teams.",
    "At TN Macaulay, Motunrayo leads service delivery operations for Procure AI, implementing SLA-driven workflows, coordinating sprint-aligned delivery schedules, overseeing client communication frameworks, and ensuring the programme delivers to IHS Towers' expectations at every phase gate.",
  ]}
  highlights={[
    "12+ years in IT service delivery, operations, and customer success",
    "Managed 150+ engineers and 10 team managers across EMEA for Microsoft O365",
    "ITIL 4 Foundation certified: IT Service Management",
    "Azure Subscription and Billing operations management at Tek Experts",
    "Power BI analytics for KPI tracking and service performance optimisation",
    "First Class, OAU: 2nd best overall student; Iyabo Bolarinwa Prize winner",
    "SLA adherence improvement: 20% turnaround time reduction through workflow redesign",
    "Launched and scaled Microsoft O365 Pioneer Team from the ground up",
  ]}
/>;

const S3 = () => <ProfileSlide
  name="Ayo Omomia"
  designation="Technical Project Delivery Lead"
  role="Technical Lead / AI Architecture / Resource Allocation"
  companies={["Atom Group", "Diageo", "G54 Africa", "Pn Advisory", "Open Advisory", "Vodafone/Vodacom", "Andela", "THCO", "TN Macaulay"]}
  bio={[
    "Ayo is the Technical Project Delivery Lead for Procure AI at TN Macaulay, responsible for overall AI solution architecture, resource allocation, technical governance, and programme delivery direction for IHS Towers. He brings nearly two decades of experience spanning hands-on software engineering, product design, marketing technology, enterprise AI advisory, and global talent technology leadership. His career began as a Product Designer and Software Engineer at Atom Group, where he spent close to six years building digital products from the ground up, a foundation of engineering instinct that informs every architectural decision he makes today.",
    "At Diageo, he served as a Marketing Software Engineer, designing and managing brand technology systems, software-driven event coordination platforms, and product visibility tools across markets. At Open Advisory, as Senior Technology Advisor, he was part of the core team that built West Africa's first AI-powered chatbot for an investment bank, one of the earliest applied AI deployments in West African financial services.",
    "His most directly relevant experience is the procurement and reverse auction platform he designed and delivered for Vodafone, a system built to automate supplier sourcing, competitive tendering, automated bid evaluation, and real-time reverse auction mechanics across Vodafone's supply chain. This is directly analogous to Procure AI's RFQ, tendering, and reverse auction modules. He also drove Digital HR and human-centric technology programmes during his time at Vodafone, earning Staff of the Month in February 2018. At Andela, he led the global internship and talent expansion programme, earning the Spotlight Award in 2019. As Senior Partner at THCO, he leads a global growth and productivity company spanning talent, technology, and business solutions with a mission to connect 1 billion people. On Procure AI, Ayo contributes directly to solution design decisions, D365 integration architecture, and the platform's Azure cloud deployment strategy.",
  ]}
  highlights={[
    "Built a procurement and reverse auction platform for Vodafone: direct Procure AI precedent",
    "Co-developed West Africa's first AI-powered investment banking chatbot",
    "Nearly 20 years spanning engineering, product design, and enterprise technology leadership",
    "Azure cloud platform delivery and AI solution architecture",
    "Andela: Led global talent expansion programme (Spotlight Award, 2019)",
    "Diageo: Marketing Software Engineer: brand technology and software systems",
    "Atom Group: Nearly 6 years as Product Designer & Software Engineer",
    "Senior Partner, THCO: global growth and productivity platform leadership",
  ]}
/>;

const S4 = () => <ProfileSlide
  name="Emmanuel Daniel"
  designation="Solution Architect"
  role="Solution Architecture / Technical Design"
  companies={["Djemb Computer Center", "Freelance", "Andela", "Access Bank", "Woven Finance", "Stax Payments (USA)", "Kirgawa Technologies", "Suretree Systems", "TN Macaulay"]}
  bio={[
    "Emmanuel is the Solution Architect on the Procure AI engagement, responsible for translating IHS Towers' procurement transformation objectives into a coherent, secure, and scalable technical blueprint governing delivery across all platform modules. He brings over 10 years of experience designing cloud-native, AI-powered, and enterprise-grade systems across fintech, banking, and e-commerce, combining deep full-stack engineering capability with cloud architecture, AI/ML deployment, and enterprise security frameworks.",
    "At Access Bank, he delivered 6 enterprise-grade banking applications in 8 months, including Swift payment integrations and payment gateway systems processing over 70,000 live transactions in production. At Stax Payments in the USA, he designed scalable fintech solutions integrating Experian, Coris, and third-party APIs on AWS Lambda, improving fraud detection accuracy by 20% through ML-powered analytics. At Kirgawa Technologies, he delivered cloud migration strategies reducing client infrastructure costs by 25% and produced comprehensive end-to-end architecture documentation. At Suretree Systems, he led enterprise solution architecture across multiple industries, deploying AI/ML fraud detection and recommendation modules that reduced system downtime by 30%. At Woven Finance, he built and optimised frontend banking applications in React and Vue.js across both business and customer-facing platforms.",
    "Emmanuel holds both AWS Solutions Architect and Azure Solutions Architect certifications and is one of a rare group of multi-cloud certified architects in Nigeria's technology ecosystem. On Procure AI, he owns the technical blueprint, microservices architecture design, D365 integration patterns, and the platform's security compliance framework.",
  ]}
  highlights={[
    "AWS Solutions Architect & Azure Solutions Architect certified: dual cloud credentials",
    "10+ years enterprise architecture across fintech, banking, and e-commerce",
    "Delivered 6 enterprise banking applications in 8 months at Access Bank: 70,000+ live transactions",
    "AI/ML module deployment: 20% fraud detection improvement at Stax Payments (USA)",
    "Cloud migration strategy delivering 25% infrastructure cost reduction at Kirgawa",
    "Microservices architecture reducing system downtime by 30% at Suretree Systems",
    "React and Vue.js fintech frontend delivery at Woven Finance",
    "Full-stack architecture from blueprint to production across regulated environments",
  ]}
/>;

const S5 = () => <ProfileSlide
  name="David Temitope"
  designation="Machine Learning Engineer"
  role="AI Model Development & Training"
  companies={["Meristem Securities", "Quidax", "Fincra", "Talen AI", "Lyft (USA)", "TN Macaulay"]}
  bio={[
    "David is one of West Africa's most experienced enterprise AI and machine learning engineers, with deep expertise in designing intelligent systems for regulated, high-scale environments. On Procure AI, he leads AI model development and training, owning the vendor matching engine, NLP document processing pipeline, decision engine, and demand forecasting models that form the platform's intelligence core.",
    "His career began at Meristem Securities, where he co-developed West Africa's first AI-powered financial services chatbot, a system that resolved 85% of new customer queries, handled over 10,000 monthly interactions, and reduced customer service costs by 40%. He built NLP-driven conversational interfaces for investment products, portfolio performance, and market information. At Quidax, he built cryptocurrency trading systems and reduced API response time from 850ms to 120ms through Redis caching, serving 2M+ daily requests. At Fincra, he led engineering teams scaling a cross-border payments platform from $1M to $10M monthly transaction volume across 30 countries, achieving SOC2, ISO27001, and PCI-DSS compliance with zero security breaches and reducing system latency by 80%. At Talen AI, he architected a platform managing over 300 million candidate profiles, built AI ranking algorithms improving match rates by 70%, and reduced time-to-hire from 45 days to 15 days. At Lyft in the USA, he built AI-powered dynamic pricing systems processing over 100,000 requests per second at sub-50ms latency, with full MLOps infrastructure for continuous model training and deployment.",
    "On Procure AI, David has designed vendor-to-RFx matching algorithms analysing 20+ decision factors; built NLP parsers processing 4,000+ procurement documents daily with 70-85% accuracy reducing manual review time by 80%; architected a 5TB+ enterprise data warehouse with 200ms average query response time; and built real-time Apache Kafka and Airflow data streaming pipelines. He architects bi-directional real-time integration between Procure AI and Microsoft Dynamics 365/AX using OData, REST APIs, and AIF services for automated purchase order creation, invoice processing, and vendor master data synchronisation. He implements zero-trust architecture, AES encryption, and full audit logging across the platform.",
  ]}
  highlights={[
    "Co-developed West Africa's first AI-powered investment banking chatbot: Meristem Securities",
    "Microsoft Dynamics 365/AX integration specialist: OData, REST APIs, AIF services",
    "4,000+ procurement documents processed daily at 70-85% NLP accuracy",
    "Vendor matching algorithms analysing 20+ decision factors: 70% match rate improvement",
    "SOC2, ISO27001 & PCI-DSS compliance delivery with zero security breaches",
    "Lyft USA: 100K+ AI pricing requests/second at sub-50ms latency",
    "Talen AI: 300M+ record AI platform at 99.9% data accuracy",
    "$1M to $10M cross-border payments scaling across 30 countries: Fincra",
  ]}
/>;

const S6 = () => <ProfileSlide
  name="Tunbosun Ogunlana"
  designation="Senior Software Engineer"
  role="Core Platform Development, API Integration & Backend Services"
  companies={["Quidax (Founding)", "Branch Digital Bank", "Cover Financial (USA)", "HotelEngine (USA)", "Andela", "Quidax (Staff)", "FundThrough (Canada)", "TN Macaulay"]}
  bio={[
    "Tunbosun is a Senior Software Engineer with over 9 years of experience building secure, scalable production systems across fintech, payments, and enterprise technology, with direct international delivery experience across Nigeria, the USA, and Canada. On Procure AI, he owns core platform development, API integration, and backend services, building the application layer that connects the AI engine, architecture, and infrastructure into a cohesive working platform.",
    "His career includes time as a Founding Engineer at Quidax, where he built the Crypto Instant Buy/Sell product from zero to production, generating 40% of the company's revenue and earning the Best Employee Award. He later returned as Staff Software Engineer, leading 10+ engineers managing trading and payment infrastructure serving 50,000+ active users processing $300M+ monthly across 100+ cryptocurrency pairs at 99.95% uptime. At Branch Digital Bank, he built foundational systems for multi-country savings, investments, and payments, delivering a Bill Payment product from zero to launch that increased monthly active users by 5%. At HotelEngine in Denver USA, he implemented real-time Salesforce data synchronisation that reduced infrastructure costs by over $100,000 annually and eliminated a 24-hour data lag. At FundThrough in Canada, he increased client in-app funding submissions from 15% to over 90% and built internal observability tooling that reduced incident detection time by 90%.",
    "Tunbosun holds a B.Sc. in Electrical and Electronic Engineering from the University of Ibadan, one of Nigeria's most respected engineering programmes. His deep experience with Kafka, Redis, PostgreSQL, and AWS/Azure infrastructure maps directly to Procure AI's data pipeline and API integration requirements.",
  ]}
  highlights={[
    "$300M+ monthly transaction processing at 99.95% uptime: Quidax Staff Engineer",
    "FundThrough Canada: Client funding submissions increased from 15% to 90%",
    "HotelEngine USA: $100,000+ annual infrastructure cost reduction through Salesforce integration",
    "Founding Engineer: built Crypto Instant Buy/Sell generating 40% of company revenue",
    "Incident detection time reduced by 90% through internal observability tooling",
    "Kafka, Redis, PostgreSQL, AWS & Azure: enterprise data pipeline expertise",
    "B.Sc. Electrical and Electronic Engineering: University of Ibadan",
    "International delivery: Nigeria, USA (Denver), Canada (Toronto)",
  ]}
/>;

const S7 = () => <ProfileSlide
  name="James Anih"
  designation="DevOps / Cloud Engineer & Software Engineer"
  role="Deployment, Monitoring & Infrastructure Support"
  companies={["Alicktish Limited", "Loyalty Solutions Nigeria", "Talen.ai", "Pakam Nigeria", "TN Macaulay"]}
  bio={[
    "James is the DevOps and Cloud Engineer on the Procure AI engagement, currently embedded within the TN Macaulay delivery team and responsible for all deployment pipelines, infrastructure monitoring, and Azure cloud infrastructure support. He ensures the Procure AI platform's microservices run reliably, securely, and at scale on IHS Towers' Azure environment.",
    "With over 7 years of backend and cloud infrastructure engineering experience, James brings proven Azure cloud delivery expertise. At Pakam Nigeria, he led the development of high-performance backend infrastructure that increased overall system performance by 40%, engineered Azure cloud high-availability solutions that improved system reliability and fault tolerance, introduced automated monitoring and alerting systems reducing operational downtime by 25%, and applied OWASP security best practices and Node.js security libraries to safeguard user data. At Talen.ai, he led core infrastructure design for an AI-powered enterprise talent platform, architecting backend systems supporting AI-driven candidate matching engines and automated AI interview agents at scale. At Loyalty Solutions Nigeria, he built high-availability RESTful backend infrastructure integrating Tango Card, Amazon Gift Cards, and Amadeus flight booking APIs, delivering a third-party redemption management application that reduced manual intervention by 50% and improved end-to-end redemption efficiency by 35%.",
  ]}
  highlights={[
    "Azure cloud high-availability engineering: system performance increased by 40%",
    "Automated monitoring and alerting: operational downtime reduced by 25%",
    "OWASP security implementation for enterprise Node.js platforms",
    "Talen.ai: AI platform infrastructure delivery: matching engines and automated interview agents",
    "CI/CD pipeline management: Docker, GitHub Actions, Azure DevOps",
    "Loyalty platform: Amadeus, Tango Card, and Amazon Gift Card API integrations",
    "Manual intervention reduced by 50% through redemption management automation",
    "Full backend-to-infrastructure ownership across enterprise platforms",
  ]}
/>;

const S8 = () => <ProfileSlide
  name="Davies Okpeta"
  designation="Frontend Engineer"
  role="UI Development & Frontend Implementation"
  companies={["Chronicles Software", "Bex-IT Digital Solutions", "THCO / Talen AI", "Tiqwa", "TN Macaulay"]}
  bio={[
    "Davies is the Frontend Engineer on the Procure AI engagement, responsible for building all user-facing interfaces including the vendor portal, procurement dashboard, RFQ screens, reverse auction interface, approval workflows, role-based access control UI, and admin panels. He specialises in scalable, distributed frontend systems that deliver high performance, resilient UX, and clean component architecture across enterprise platforms.",
    "At THCO, Davies developed and launched the company's first AI-driven recruitment software from zero to production, a platform that generated a net gain of $98,000 in its first month. He owned all advanced styling, animation, logic, API fetch automation, email systems and campaign management, and the complete user and admin application interfaces including the app, admin dashboard, and job boards, giving him direct, hands-on experience building AI-powered enterprise platforms in the same category as Procure AI. At Bex-IT Digital Solutions, he developed applications using React, Nuxt, Vue, and Laravel, reducing project delivery timelines from 8 months to 4-5 months and improving development efficiency by 50% through automated testing and engineering SOPs, achieving a 95% client retention rate. At Tiqwa, he implemented complex enterprise role-based permission and restriction systems validating functions, pages, and user content based on provisioned roles, directly analogous to Procure AI's multi-role vendor portal, alongside multiple payment channel integrations and advanced data visualisation dashboards with custom charts and downloadable reports.",
  ]}
  highlights={[
    "Built and launched AI-driven platform at THCO generating $98,000 in first month",
    "Enterprise RBAC implementation: role-based permission and restriction systems",
    "Reduced delivery timelines from 8 months to 4-5 months: 50% efficiency improvement",
    "React, Vue.js, Nuxt.js, Next.js, TypeScript: full modern frontend stack",
    "Advanced data visualisation dashboards with custom charts and progress reporting",
    "95% client retention rate through strong code architecture and client engagement",
    "Zero-to-production AI platform delivery experience: direct Procure AI relevance",
    "Multi-payment channel integration with frontend restriction and access control logic",
  ]}
/>;

const S9 = () => <ProfileSlide
  name="Mustapha Sanusi"
  designation="UI/UX & Product Designer"
  role="User Experience Design, Interface Design & Prototyping"
  companies={["GBROSSOFT", "Anter", "FutureX Digital", "Digital Marketing Skill Institute", "THCO", "TN Macaulay"]}
  bio={[
    "Mustapha is the UI/UX and Product Designer on the Procure AI engagement, responsible for the complete user experience design of the platform, from initial wireframes and user research through to high-fidelity interfaces, interactive prototypes, and design systems ensuring consistent, intuitive experience across all modules including the vendor portal, procurement dashboard, RFQ workflows, reverse auction screens, and approval interfaces.",
    "He brings over 6 years of product design experience alongside over 6 years of frontend development capability, giving him the rare ability to bridge design and engineering. Every interface he creates is not only visually refined but technically feasible, responsive, and scalable. At THCO, Mustapha designed and delivered high-fidelity interfaces and interactive prototypes for AI-driven digital platforms including Talen AI and Clead AI, making him one of the few designers in Nigeria with direct experience designing interfaces for AI-powered enterprise platforms. He built reusable design component systems and design guidelines maintaining consistency across platforms, and collaborated closely with developers to ensure pixel-perfect implementation. At FutureX Digital, he single-handedly built and launched over 100 websites in 8 months, demonstrating exceptional delivery speed and design quality at scale. At Anter, he led both qualitative and quantitative user research for Fairshop, a B2B/B2C mobile platform, designing full wireframe-to-hi-fi workflows with reusable UI component libraries, iterating on designs based on user feedback and analytics.",
  ]}
  highlights={[
    "Designed AI-driven platform interfaces at THCO: Talen AI and Clead AI",
    "One of few Nigerian designers with direct AI platform UX design experience",
    "Figma, Framer, Webflow: full enterprise design toolchain",
    "Reusable design systems and component libraries for platform-wide consistency",
    "Qualitative and quantitative UX research informing enterprise product decisions",
    "100+ websites delivered in 8 months: exceptional design delivery at scale",
    "Bridges design and frontend development for accurate, pixel-perfect implementation",
    "B2B/B2C mobile platform UX: Anter / Fairshop",
  ]}
/>;

const S10 = () => <ProfileSlide
  name="Christianah Olatunji"
  designation="Junior Project Coordinator"
  role="Delivery Coordination & Stakeholder Support"
  companies={["Kay Computer Institute", "Jossid Global Limited", "St. James College", "THCO", "TN Macaulay"]}
  bio={[
    "Christianah is the Junior Project Coordinator on the Procure AI engagement, supporting delivery coordination, stakeholder communication, sprint scheduling, and project tracking across the programme. She brings over 3 years of experience in human capital management and client engagement at THCO, an environment demanding rigorous process management, multi-stakeholder coordination, proactive communication, and the ability to manage multiple concurrent workstreams with precision.",
    "At THCO, she managed full-cycle global recruitment processes across engineering, finance, sales, and management functions, coordinating candidates, hiring managers, and clients across Nigeria and international markets including Ghana, Kenya, South Africa, the USA, and Egypt. She successfully placed senior executive and technical roles including CFO, CTO, CIO, and CEO positions across Fintech, Telco, IT Consulting, Healthtech, and Oil & Gas sectors, demonstrating her ability to engage confidently with executive and technical stakeholders at the highest level. She scheduled and coordinated virtual interviews across time zones, maintained proactive communication pipelines with multiple concurrent clients, sourced candidates using multi-channel approaches including LinkedIn, job boards, and targeted networking, and continuously evaluated and optimised processes for greater efficiency. These skills translate directly into sprint coordination, stakeholder update management, delivery tracking, and client communication on the Procure AI programme.",
  ]}
  highlights={[
    "3+ years coordinating complex multi-stakeholder processes at enterprise level",
    "C-suite placement experience: CFO, CTO, CIO, CEO roles across regulated industries",
    "Multi-timezone coordination across Nigeria, Ghana, Kenya, South Africa, USA, Egypt",
    "Client engagement across Fintech, Telco, IT Consulting, Oil & Gas, and Healthtech",
    "Proactive delivery tracking and process optimisation across concurrent workstreams",
    "Operates within TN Macaulay / THCO environment: deep organisational familiarity",
    "Virtual coordination, scheduling, and stakeholder communication across distributed teams",
    "Recognised internally at THCO: Staff of the Year Award recipient",
  ]}
/>;

/* ═══ SLIDE 11: IHS ILORIN INNOVATION HUB ═══ */
const S11Hub = () => (
  <div style={{ height: "100%", background: C.light, display: "flex", flexDirection: "column", position: "relative" }}>
    <div style={{ background: C.navy, padding: "28px 40px", flexShrink: 0 }}>
      <h2 className="ps" style={{ ...dl(200), fontSize: 36, fontWeight: 800, color: C.white }}>+ Supporting Software Engineers</h2>
      <p className="pf" style={{ ...dl(400), fontSize: 20, color: C.teal, fontWeight: 500, marginTop: 4 }}>IHS Ilorin Innovation Hub</p>
    </div>
    <div className="pf" style={{ ...dl(500), height: 2, background: `linear-gradient(90deg, ${C.teal}, transparent)`, margin: "0 40px 24px" }} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px 40px" }}>
      <p className="pu" style={{ ...dl(600), fontSize: 19, color: C.charcoal, lineHeight: 1.8, maxWidth: 700, marginBottom: 24 }}>
        The Procure AI delivery team is further supported by additional software engineers based at the IHS Ilorin Innovation Hub, providing extended development capacity, local platform knowledge, and dedicated engineering bandwidth to accelerate delivery timelines.
      </p>
      <div className="pu" style={{ ...dl(900), display: "flex", gap: 20 }}>
        <div style={{ background: C.white, border: `1px solid ${C.darkBorder}`, borderRadius: 4, padding: "20px 28px", borderTop: `3px solid ${C.teal}`, flex: 1 }}>
          <p style={{ fontSize: 17, color: C.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>What This Means</p>
          <p style={{ fontSize: 18, color: C.charcoal, lineHeight: 1.7 }}>Dedicated engineering resources from IHS Towers' own innovation centre, working alongside the core TN Macaulay team to deliver platform modules with local context and operational familiarity.</p>
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.darkBorder}`, borderRadius: 4, padding: "20px 28px", borderTop: `3px solid ${C.navy}`, flex: 1 }}>
          <p style={{ fontSize: 17, color: C.navy, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Contribution Areas</p>
          {["Feature development and module implementation", "Platform testing and quality assurance", "Local infrastructure and integration support", "Extended sprint capacity during peak delivery phases"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ color: C.teal, fontSize: 15, flexShrink: 0 }}>-</span>
              <span style={{ fontSize: 17, color: C.charcoal, lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <FooterLight />
  </div>
);

/* ═══ SLIDE 12: CLOSING ═══ */
const S12 = ({ active }) => {
  const team = [
    ["Motunrayo Ogunneye", "Service Delivery Manager"],
    ["Ayo Omomia", "Technical Project Delivery Lead"],
    ["Emmanuel Daniel", "Solution Architect"],
    ["David Temitope", "Machine Learning Engineer"],
    ["Tunbosun Ogunlana", "Senior Software Engineer"],
    ["James Anih", "DevOps / Cloud Engineer & Software Engineer"],
    ["Davies Okpeta", "Frontend Engineer"],
    ["Mustapha Sanusi", "UI/UX & Product Designer"],
    ["Christianah Olatunji", "Junior Project Coordinator"],
    ["IHS Ilorin Innovation Hub", "Supporting Software Engineers"],
  ];
  return (
    <div style={{ height: "100%", background: `linear-gradient(135deg, ${C.navy} 0%, #151D4A 50%, ${C.navy} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", textAlign: "center", padding: "0 clamp(40px,6vw,100px)" }}>
      <div style={{ position: "absolute", top: 20, left: 20, width: 60, height: 60, borderTop: `2px solid ${C.teal}`, borderLeft: `2px solid ${C.teal}`, opacity: 0.5 }} />
      <div style={{ position: "absolute", bottom: 40, right: 20, width: 60, height: 60, borderBottom: `2px solid ${C.teal}`, borderRight: `2px solid ${C.teal}`, opacity: 0.5 }} />

      <h2 className="ps" style={{ ...dl(300), fontSize: 44, fontWeight: 800, color: C.white }}>Built for Enterprise. Designed for IHS Towers.</h2>
      <div className="pf" style={{ ...dl(600), width: 60, height: 2, background: C.teal, margin: "16px auto 20px" }} />
      <p className="pu" style={{ ...dl(800), fontSize: 19, color: `${C.white}b0`, lineHeight: 1.8, maxWidth: 700, marginBottom: 28 }}>
        The Procure AI delivery team represents a deliberate assembly of enterprise technologists, AI specialists, cloud engineers, and delivery professionals, each selected for the specific capabilities IHS Towers requires. Every member brings direct Azure cloud delivery experience, enterprise AI platform credentials, and a proven record of performing in regulated, high-stakes environments. Together, this team is structured to deliver Procure AI on time, to specification, and to the standard IHS Towers expects.
      </p>

      {/* Team table */}
      <div style={{ width: "100%", maxWidth: 560 }}>
        {team.map(([name, des], i) => (
          <div key={i} className="pu" style={{ ...dl(1000 + i * 100), display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: C.white }}>{name}</span>
            <span style={{ fontSize: 17, color: C.teal }}>{des}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: 36, right: 40 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.teal, letterSpacing: "0.04em" }}>TN Macaulay</span>
      </div>
      <Footer />
    </div>
  );
};

/* ═══ MAIN ENGINE ═══ */
const SLIDES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11Hub, S12];
const TOTAL = SLIDES.length;

export default function ProcureAITeamPresentation() {
  const [cur, setCur] = useState(0);

  const go = useCallback((i) => {
    if (i >= 0 && i < TOTAL && i !== cur) setCur(i);
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
    <div className="pai" style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: C.navy }} data-testid="procureai-team-presentation">
      <style>{css}</style>
      {/* Progress */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: `${C.white}08`, zIndex: 60 }}>
        <div style={{ height: "100%", background: C.teal, width: `${((cur + 1) / TOTAL) * 100}%`, transition: "width 300ms ease-out" }} />
      </div>
      {/* Slides */}
      {SLIDES.map((SC, i) => (
        <div key={i} className="pai-pg" data-active={i === cur ? "true" : "false"} data-testid={`procureai-slide-${i + 1}`} style={{ position: "absolute", inset: 0, zIndex: i === cur ? 10 : 0, opacity: i === cur ? 1 : 0, visibility: i === cur ? "visible" : "hidden", transition: "opacity 300ms ease" }}>
          <SC active={i === cur} />
        </div>
      ))}
      {/* Nav */}
      <div style={{ position: "fixed", bottom: 16, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => go(cur - 1)} disabled={cur === 0} style={{ width: 28, height: 28, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === 0 ? 0.15 : 0.5 }} data-testid="pai-prev"><ChevronLeft size={14} color={C.white} /></button>
        <span style={{ fontSize: 15, color: `${C.white}60`, minWidth: 50, textAlign: "center", fontFamily: "'Inter',sans-serif" }} data-testid="pai-counter">{cur + 1} / {TOTAL}</span>
        <button onClick={() => go(cur + 1)} disabled={cur === TOTAL - 1} style={{ width: 28, height: 28, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cur === TOTAL - 1 ? 0.15 : 0.5 }} data-testid="pai-next"><ChevronRight size={14} color={C.white} /></button>
      </div>
    </div>
  );
}
