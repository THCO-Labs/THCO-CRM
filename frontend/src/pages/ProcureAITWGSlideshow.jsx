import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import html2pdf from "html2pdf.js";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Loader2,
  ArrowLeft
} from "lucide-react";

// Color palette
const colors = {
  teal: "#0D9488",
  navy: "#1E2761",
  darkNavy: "#283378",
  dark: "#0F172A",
  body: "#333333",
  slate: "#64748B",
  lightBg: "#F8FAFC",
  iceBlue: "#CADCFC",
  white: "#FFFFFF",
  orange: "#EA580C",
  green: "#059669",
  border: "#E2E8F0",
};

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } }
};

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } }
};

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.08 } }
};

const itemFade = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Footer Component
const Footer = () => (
  <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-between px-8 text-xs border-t" style={{ borderColor: colors.border }}>
    <span style={{ color: colors.slate }}>
      Procure AI | IHS Towers Nigeria | Technical Working Group | 23 February 2026
    </span>
    <span style={{ color: colors.teal }} className="font-semibold">CONFIDENTIAL</span>
  </div>
);

// Section Title Component
const SectionTitle = ({ number, title, subtitle, light = false }) => (
  <motion.div variants={fadeIn} initial="initial" animate="animate" className="mb-8">
    <div className="flex items-baseline gap-4 mb-2">
      {number && (
        <span className="text-4xl font-bold" style={{ color: colors.teal, fontFamily: "Georgia, serif" }}>
          {number}
        </span>
      )}
      <h1 className="text-3xl font-bold" style={{ color: light ? colors.white : colors.dark, fontFamily: "Georgia, serif" }}>
        {title}
      </h1>
    </div>
    {subtitle && (
      <p className="text-base" style={{ color: light ? colors.iceBlue : colors.slate }}>{subtitle}</p>
    )}
  </motion.div>
);

// Card Component
const Card = ({ title, headerColor = colors.teal, children, className = "" }) => (
  <motion.div 
    variants={itemFade}
    className={`rounded-lg overflow-hidden ${className}`}
    style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}
  >
    <div className="px-4 py-2 font-semibold text-white text-sm" style={{ backgroundColor: headerColor }}>
      {title}
    </div>
    <div className="p-4">{children}</div>
  </motion.div>
);

// Table Component
const Table = ({ headers, rows, headerBg = colors.navy }) => (
  <motion.div variants={itemFade} className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${colors.border}` }}>
    <table className="w-full text-sm">
      <thead>
        <tr style={{ backgroundColor: headerBg }}>
          {headers.map((h, i) => (
            <th key={i} className="px-3 py-2 text-left text-white font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-white" : ""} style={{ backgroundColor: i % 2 !== 0 ? colors.lightBg : undefined }}>
            {row.map((cell, j) => (
              <td key={j} className="px-3 py-2 border-t" style={{ borderColor: colors.border, color: colors.body }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </motion.div>
);

// ============ PAGE COMPONENTS ============

// Page 1: Title
const Page1 = () => (
  <div className="h-full flex flex-col relative" style={{ backgroundColor: colors.dark }}>
    <div className="h-1 w-full" style={{ backgroundColor: colors.teal }} />
    
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <motion.h1 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-6xl font-bold text-white mb-4"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Procure AI
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.3 }}
        className="text-xl mb-6"
        style={{ color: colors.iceBlue }}
      >
        Procurement Transformation Programme
      </motion.p>
      
      <motion.div 
        initial={{ scaleX: 0 }} 
        animate={{ scaleX: 1 }} 
        transition={{ delay: 0.5, duration: 0.4 }}
        className="w-36 h-1 mb-6"
        style={{ backgroundColor: colors.teal }}
      />
      
      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.6 }}
        className="text-lg text-white mb-2"
      >
        Technical Working Group Session
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.7 }}
        className="text-sm mb-4"
        style={{ color: colors.slate }}
      >
        Introductory Technical Alignment & Architecture Walkthrough
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.8 }}
        className="text-sm font-bold"
        style={{ color: colors.teal }}
      >
        23 February 2026
      </motion.p>
    </div>
    
    <div className="h-12 flex items-center justify-between px-8 text-xs">
      <span style={{ color: colors.iceBlue }}>IHS Towers Nigeria | TN Macaulay</span>
      <span style={{ color: colors.teal }} className="font-semibold">CONFIDENTIAL</span>
    </div>
  </div>
);

// Page 2: Session Agenda
const Page2 = () => {
  const agendaItems = [
    { num: "01", title: "Technical Proposal & Implementation Approach", time: "20 min", desc: "What Procure AI does, phased delivery, key capabilities" },
    { num: "02", title: "Solution Architecture & Integration Model", time: "25 min", desc: "Azure microservices, D365 OData, ServiceNow, Data Lake" },
    { num: "03", title: "AI Data Sovereignty & LLM Hosting", time: "15 min", desc: "Azure OpenAI vs on-premise, data isolation model" },
    { num: "04", title: "Platform Security & Compliance", time: "15 min", desc: "Encryption, auth, pen testing, NDPR, audit logging" },
    { num: "05", title: "Data Governance & Boundaries", time: "10 min", desc: "Data flows, residency, access control, classification, exit" },
    { num: "06", title: "Infrastructure Requirements & Assumptions", time: "15 min", desc: "Azure resources, environments, APIs, provisioning timeline" },
    { num: "07", title: "Delivery Methodology & Timeline", time: "15 min", desc: "Agile sprints, 13-month roadmap, dependencies" },
    { num: "08", title: "Governance, Reporting & Next Steps", time: "10 min", desc: "RACI, cadences, risks, immediate actions" },
  ];

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="flex-1 px-8 pt-8 pb-14 overflow-auto">
        <SectionTitle title="Session Agenda" subtitle="Technical alignment session — structured for working group validation" />
        
        <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-1">
          {agendaItems.map((item, i) => (
            <motion.div 
              key={i}
              variants={itemFade}
              className="flex items-center gap-4 px-4 py-3 rounded"
              style={{ backgroundColor: i % 2 === 0 ? colors.navy : colors.darkNavy }}
            >
              <span className="text-2xl font-bold w-12" style={{ color: colors.teal, fontFamily: "Georgia, serif" }}>
                {item.num}
              </span>
              <div className="flex-1">
                <span className="font-semibold text-white">{item.title}</span>
                <p className="text-xs" style={{ color: colors.iceBlue }}>{item.desc}</p>
              </div>
              <span className="text-sm font-medium" style={{ color: colors.teal }}>{item.time}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

// Page 3: What is Procure AI?
const Page3 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="01" title="What is Procure AI?" subtitle="AI-powered end-to-end procurement automation for IHS Towers" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        {/* Current vs Future State */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card title="CURRENT STATE" headerColor={colors.teal}>
            <ul className="space-y-1.5 text-sm" style={{ color: colors.body }}>
              {["Manual Excel-based procurement across all categories", "45-day average purchase cycle from request to PO", "Limited to established local vendor networks", "No real-time spend visibility or analytics", "Manual vendor due diligence and compliance tracking", "No structured asset recovery or disposal process"].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>{item}
                </li>
              ))}
            </ul>
          </Card>
          
          <Card title="FUTURE STATE (PROCURE AI)" headerColor={colors.green}>
            <ul className="space-y-1.5 text-sm" style={{ color: colors.body }}>
              {["AI-powered end-to-end procurement automation", "15-day procurement cycles (67% reduction)", "Global vendor discovery (Alibaba, D&B, Global Sources)", "Real-time dashboards, spend analytics, forecasting", "Automated compliance scoring and risk monitoring", "Competitive reverse auctions for asset disposal"].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>{item}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Phased Capability Model */}
        <motion.div variants={itemFade} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
          <div className="px-4 py-2 font-semibold text-white text-sm" style={{ backgroundColor: colors.navy }}>
            PHASED CAPABILITY MODEL
          </div>
          <div className="grid grid-cols-3">
            {[
              { phase: "Phase 1: Foundation & Core", time: "Feb–May 2026 (4 mo)", items: "Vendor Portal, Due Diligence, Risk Monitor, AI Bot, Reverse Auction", bg: colors.teal },
              { phase: "Phase 2: RFx Workflows", time: "Jun–Oct 2026 (5 mo)", items: "RFx Creation, Vendor Sourcing, Scope Validation, BAFO, Templates", bg: colors.navy },
              { phase: "Phase 3: Intelligence Suite", time: "Nov 2026–Feb 2027 (4 mo)", items: "Forecasting, Category Mgmt, TCO Reporting, Audit, Settings", bg: colors.darkNavy },
            ].map((p, i) => (
              <div key={i} className="p-4 text-white" style={{ backgroundColor: p.bg }}>
                <h4 className="font-semibold text-sm mb-1">{p.phase}</h4>
                <p className="text-xs mb-2" style={{ color: colors.teal }}>{p.time}</p>
                <p className="text-xs" style={{ color: colors.iceBlue }}>{p.items}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 4: Detailed Scope
const Page4 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="01" title="Detailed Scope by Phase" subtitle="Module breakdown with AI components and external integrations" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <Table 
          headers={["Phase", "Module", "Pages", "AI Components", "External Integration"]}
          rows={[
            ["Phase 1", "Vendor Portal + Interface", "15", "Agentic AI, Decision Engine", "D&B, NAVEX, Docusign"],
            ["", "Due Diligence & Risk Monitor", "7", "Decision Engine", "D&B, NAVEX"],
            ["", "AI Overview Bot", "1", "LLM", "—"],
            ["", "Reverse Auction Portal", "8", "Analytics + Decision Engine", "—"],
            ["Phase 2", "RFx Creation + Source Vendor", "9", "Agentic AI, Decision Engine", "Alibaba, Global Sources"],
            ["", "Scope Validation + Review & Rank", "16", "Analytics + Decision Engine", "—"],
            ["", "BAFO Rank & Award + Templates", "20+", "Analytics + Decision Engine", "—"],
            ["Phase 3", "Forecasting + Category Mgmt", "11", "Agentic AI, Forecasting Engine", "Redcube, D365"],
            ["", "Cost/TCO + Risk Register Reporting", "14", "Forecasting + Decision Engine", "D365"],
            ["", "Settings + Exception + Audit + Perf", "19", "—", "—"],
          ]}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card title="KEY ASSUMPTIONS" headerColor={colors.teal}>
            <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
              {["IHS provides timely access to systems & environments", "Scoping worksheet requirements are complete and final", "D365 environment supports required API integrations", "Change requests managed via formal CR process"].map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </Card>
          <Card title="EXCLUSIONS (IHS RESPONSIBILITY)" headerColor={colors.navy}>
            <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
              {["LLM API usage costs (Azure OpenAI or equivalent)", "Cloud hosting and infrastructure costs (Azure)", "Third-party service licences (D&B, NAVEX, Docusign)", "D365 core ERP modifications, legacy decommissioning"].map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </Card>
        </div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 5: Solution Architecture
const Page5 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="02" title="Solution Architecture" subtitle="Azure-native microservices with D365 deep integration" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        {/* Architecture Diagram */}
        <motion.div variants={itemFade} className="flex items-center justify-between gap-4 mb-4">
          {/* IHS Systems */}
          <div className="w-1/4">
            <div className="px-3 py-2 text-white text-xs font-semibold rounded-t" style={{ backgroundColor: colors.navy }}>IHS SYSTEMS</div>
            <div className="space-y-1 p-2 rounded-b" style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}>
              {["D365 Finance & Ops", "ServiceNow", "Azure Data Lake", "Azure AD / Entra ID"].map((s, i) => (
                <div key={i} className="px-2 py-1.5 text-xs bg-white rounded" style={{ border: `1px solid ${colors.border}` }}>{s}</div>
              ))}
            </div>
          </div>

          <div className="text-2xl" style={{ color: colors.teal }}>→</div>

          {/* Procure AI Platform */}
          <div className="flex-1">
            <div className="px-3 py-2 text-white text-xs font-semibold rounded-t" style={{ backgroundColor: colors.teal }}>PROCURE AI PLATFORM (AZURE)</div>
            <div className="p-2 rounded-b" style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {["Procurement Service", "Vendor Service", "AI/ML Service", "Analytics Service", "Auction Service", "Contract Service"].map((s, i) => (
                  <div key={i} className="px-2 py-1.5 text-xs text-white text-center rounded" style={{ backgroundColor: colors.navy }}>{s}</div>
                ))}
              </div>
              <div className="px-2 py-1 text-xs text-white text-center rounded mb-1" style={{ backgroundColor: colors.teal }}>API Hub | Azure API Management</div>
              <div className="px-2 py-1 text-xs text-white text-center rounded" style={{ backgroundColor: colors.darkNavy }}>Azure SQL | Cosmos DB | Redis | Blob Storage</div>
            </div>
          </div>

          {/* Azure OpenAI */}
          <div className="w-1/4">
            <div className="px-3 py-2 font-semibold text-xs rounded-t" style={{ backgroundColor: colors.teal, color: colors.white }}>Azure OpenAI</div>
            <div className="p-2 text-xs rounded-b" style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}>
              <p className="font-semibold mb-1">GPT-4 in IHS tenant</p>
              <ul className="space-y-0.5 text-xs" style={{ color: colors.slate }}>
                <li>• Zero data to OpenAI</li>
                <li>• Vendor scoring</li>
                <li>• Bid evaluation</li>
                <li>• Document analysis</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* External Bar */}
        <motion.div variants={itemFade} className="px-3 py-2 text-xs text-center rounded mb-4" style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}>
          <span style={{ color: colors.slate }}>External:</span> Alibaba | Global Sources | D&B | NAVEX | Docusign | Redcube
        </motion.div>

        {/* Infrastructure Table */}
        <Table 
          headers={["Category", "Requirement", "Environments", "Required By"]}
          rows={[
            ["Cloud", "Azure Subscription (compute, storage, networking)", "Dev, Staging, Prod", "Week 1"],
            ["Database", "Azure SQL or PostgreSQL", "Dev, Staging, Prod", "Week 1"],
            ["AI/LLM", "Azure OpenAI Service (GPT-4 access)", "All environments", "Month 2"],
            ["Integration", "D365 API credentials + ServiceNow API", "All environments", "Week 2"],
            ["Security", "VPN access for dev team + CI/CD pipeline tools", "All environments", "Week 1"],
          ]}
        />
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 6: D365 Integration
const Page6 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="02" title="D365 Integration Model" subtitle="OData API integration with bidirectional data sync" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card title="INTEGRATION APPROACH" headerColor={colors.teal}>
            <ul className="space-y-1.5 text-xs" style={{ color: colors.body }}>
              <li><strong>Protocol:</strong> OData v4 REST API over HTTPS</li>
              <li><strong>Authentication:</strong> OAuth 2.0 via Azure AD / Entra ID</li>
              <li><strong>Direction:</strong> Bidirectional (read + write)</li>
              <li><strong>Sync Pattern:</strong> Near real-time event-driven + scheduled batch</li>
              <li><strong>Error Handling:</strong> Retry with exponential backoff, dead letter queue</li>
              <li><strong>Initial Load:</strong> CSV/XLSX templates, then API for ongoing sync</li>
            </ul>
          </Card>
          <Card title="D365 ENTITIES WE ACCESS" headerColor={colors.navy}>
            <div className="text-xs">
              <table className="w-full">
                <tbody>
                  {[
                    ["Vendor Master (VendTable)", "Read + Write", "Real-time"],
                    ["Purchase Orders", "Read + Write", "Real-time"],
                    ["Product Categories", "Read", "Daily batch"],
                    ["Item Catalog", "Read", "Daily batch"],
                    ["Financial Dimensions", "Read", "Weekly"],
                    ["Compliance Records", "Write", "Event-driven"],
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : ""} style={{ backgroundColor: i % 2 !== 0 ? colors.lightBg : undefined }}>
                      <td className="py-1">{row[0]}</td>
                      <td className="py-1" style={{ color: colors.teal }}>{row[1]}</td>
                      <td className="py-1" style={{ color: colors.slate }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Table 
          headerBg={colors.teal}
          headers={["System", "Protocol", "Direction", "Purpose", "Status"]}
          rows={[
            ["ServiceNow", "REST API", "Read-only", "Exception tickets, incident management", <span key="1" className="text-green-600 font-medium">Confirmed</span>],
            ["Azure Data Lake", "Azure SDK", "Read-only", "Historical data for AI training models", <span key="2" className="text-green-600 font-medium">Confirmed</span>],
            ["Azure AD / Entra ID", "OAuth 2.0 / OIDC", "Read", "SSO, RBAC, user provisioning", <span key="3" className="text-green-600 font-medium">Confirmed</span>],
            ["Alibaba / Global Sources", "REST API", "Outbound only", "Vendor discovery (search queries)", <span key="4" style={{ color: colors.orange }}>Phase 2</span>],
            ["D&B / NAVEX", "REST API", "Outbound only", "Vendor due diligence, compliance checks", <span key="5" style={{ color: colors.orange }}>Phase 1</span>],
          ]}
        />
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 7: AI Data Sovereignty
const Page7 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="03" title="AI Data Sovereignty & Security" subtitle="How IHS data is protected across all AI components" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <motion.div variants={itemFade} className="rounded-lg overflow-hidden relative" style={{ border: `2px solid ${colors.teal}` }}>
            <div className="absolute -top-0 right-4 px-2 py-0.5 text-xs font-bold text-white rounded-b" style={{ backgroundColor: colors.green }}>RECOMMENDED</div>
            <div className="px-4 py-2 font-semibold text-white text-sm" style={{ backgroundColor: colors.teal }}>
              OPTION A: AZURE OPENAI
            </div>
            <div className="p-4 text-xs" style={{ color: colors.body }}>
              <ul className="space-y-1.5 mb-3">
                <li>• Model runs inside IHS's own Azure subscription</li>
                <li>• OpenAI the company never sees IHS data</li>
                <li>• Microsoft enterprise data agreements apply</li>
                <li>• SOC 2, ISO 27001 compliance built in</li>
                <li>• IHS chooses Azure region for data residency</li>
                <li>• Full GPT-4 capability for all AI functions</li>
              </ul>
              <p style={{ color: colors.teal }}>No hardware to buy or models to maintain</p>
              <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                <p className="font-bold" style={{ color: colors.navy }}>How it works:</p>
                <p style={{ color: colors.slate }}>Microsoft licensed the model from OpenAI and runs it inside Azure infrastructure. IHS data never leaves the Azure tenant. OpenAI has zero access.</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemFade} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
            <div className="px-4 py-2 font-semibold text-white text-sm" style={{ backgroundColor: colors.navy }}>
              OPTION B: ON-PREMISE OPEN-SOURCE
            </div>
            <div className="p-4 text-xs" style={{ color: colors.body }}>
              <ul className="space-y-1.5 mb-3">
                <li>• Model runs on physical hardware IHS controls</li>
                <li>• Zero external connectivity (full air-gap possible)</li>
                <li>• Uses open-source models (LLaMA, Mistral, Phi)</li>
                <li>• IHS owns everything: hardware, model, data</li>
                <li>• Total physical control and sovereignty</li>
              </ul>
              <p style={{ color: colors.orange }}>Lower AI capability vs enterprise models</p>
              <p style={{ color: colors.orange }}>IHS team manages model updates</p>
              <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                <p className="font-bold" style={{ color: colors.navy }}>When to choose this:</p>
                <p style={{ color: colors.slate }}>Only if IHS security policy requires a fully air-gapped solution with no cloud AI dependency.</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemFade} className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: colors.navy }}>
          <span className="font-bold text-white">Recommendation: Option A.</span>
          <span style={{ color: colors.iceBlue }}> IHS is already on Azure. Data stays in your tenant. OpenAI never sees it. Enterprise-grade AI with zero infrastructure overhead.</span>
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 8: Security & Compliance
const Page8 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="04" title="Platform Security & Compliance" subtitle="Enterprise-grade security across every layer of Procure AI" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid grid-cols-3 gap-3 mb-4">
        <Card title="Encryption" headerColor={colors.teal}>
          <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
            <li>• TLS 1.2+ on all API calls and webhooks</li>
            <li>• AES-256 encryption at rest</li>
            <li>• Key management via Azure Key Vault</li>
          </ul>
        </Card>
        <Card title="Authentication & Access" headerColor={colors.teal}>
          <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
            <li>• SSO via Azure AD / Entra ID</li>
            <li>• OAuth 2.0 + OpenID Connect</li>
            <li>• Role-based access control (RBAC)</li>
            <li>• Multi-factor authentication</li>
          </ul>
        </Card>
        <Card title="Audit & Logging" headerColor={colors.teal}>
          <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
            <li>• Full audit trail on every action</li>
            <li>• API call logging with timestamps</li>
            <li>• Azure Monitor + Log Analytics</li>
            <li>• SIEM integration ready</li>
          </ul>
        </Card>
        <Card title="Penetration Testing" headerColor={colors.navy}>
          <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
            <li>• Pre-launch pen test (IHS nominates)</li>
            <li>• Vulnerability scanning in CI/CD</li>
            <li>• OWASP Top 10 compliance</li>
            <li>• Remediation SLAs for findings</li>
          </ul>
        </Card>
        <Card title="Compliance Standards" headerColor={colors.navy}>
          <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
            <li>• SOC 2 Type II (via Azure)</li>
            <li>• ISO 27001 (via Azure)</li>
            <li>• NDPR compliant</li>
            <li>• GDPR-aligned data handling</li>
          </ul>
        </Card>
        <Card title="Network & Infrastructure" headerColor={colors.navy}>
          <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
            <li>• Azure VNet isolation</li>
            <li>• Private endpoints for databases</li>
            <li>• Azure WAF + DDoS Protection</li>
            <li>• VPN for dev team during build</li>
          </ul>
        </Card>
      </motion.div>

      <motion.div variants={itemFade} className="px-4 py-2 rounded-lg text-xs text-center" style={{ backgroundColor: colors.navy, color: colors.iceBlue }}>
        IHS InfoSec: We welcome your review and validation of all security controls in this session.
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 9: Data Governance
const Page9 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="05" title="Data Governance & Boundaries" subtitle="How IHS data flows, where it lives, and who controls it" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card title="DATA FLOW MODEL" headerColor={colors.teal}>
            <ul className="space-y-2 text-xs" style={{ color: colors.body }}>
              <li><strong>IHS D365</strong> — Vendor, PO, category, item data via OData API. Bidirectional.</li>
              <li><strong>IHS ServiceNow</strong> — Exception tickets via API. Read-only from Procure AI.</li>
              <li><strong>Azure Data Lake</strong> — Historical data feeds AI models. Read-only, no write-back.</li>
              <li><strong>External APIs</strong> — Outbound search queries only. No IHS data sent externally.</li>
            </ul>
          </Card>
          <Card title="GOVERNANCE POLICIES" headerColor={colors.navy}>
            <ul className="space-y-2 text-xs" style={{ color: colors.body }}>
              <li><strong>Data Residency</strong> — All data in IHS-selected Azure region. Nothing leaves Azure.</li>
              <li><strong>Access Control</strong> — RBAC, least-privilege. IHS approves all grants.</li>
              <li><strong>Data Retention</strong> — IHS defines policies. Automated purge. Full export any time.</li>
              <li><strong>Contract Exit</strong> — IHS owns all data and code. Full DB export within 30 days.</li>
            </ul>
          </Card>
        </div>

        <motion.div variants={itemFade} className="px-4 py-3 rounded-lg text-xs mb-3" style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}>
          <strong style={{ color: colors.navy }}>Key principle:</strong> <span style={{ color: colors.body }}>IHS data never leaves the Azure boundary. External API calls send only search queries, never IHS proprietary data.</span>
        </motion.div>

        <motion.div variants={itemFade} className="px-4 py-2 rounded-lg text-xs mb-3" style={{ backgroundColor: colors.navy }}>
          <strong className="text-white">Data Classification within Procure AI</strong>
          <p style={{ color: colors.iceBlue }}>Confidential: Vendor financials, pricing, bid data | Internal: Category structures, PO history | Public: Tender notices, vendor registration</p>
        </motion.div>

        <motion.div variants={itemFade} className="px-4 py-2 rounded-lg text-xs" style={{ backgroundColor: colors.teal }}>
          <strong className="text-white">IHS owns everything.</strong>
          <span className="text-white"> All code, all data, all IP. Build-and-transfer engagement, not SaaS. Full source code handover at project completion.</span>
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 10: Delivery Methodology
const Page10 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="07" title="Delivery Methodology" subtitle="Agile sprints within a phased delivery framework" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card title="METHODOLOGY" headerColor={colors.teal}>
            <ul className="space-y-1.5 text-xs" style={{ color: colors.body }}>
              <li><strong>Framework:</strong> Agile (2-week sprints) within phased waterframe</li>
              <li><strong>Sprint Cadence:</strong> 2-week sprints, demo at end of each sprint</li>
              <li><strong>Environments:</strong> Dev → Staging → Production (Azure-based)</li>
              <li><strong>CI/CD:</strong> Azure DevOps or GitHub Actions, automated testing</li>
              <li><strong>Change Control:</strong> Formal CR process, impact assessed within 48hrs</li>
              <li><strong>Quality Gates:</strong> Code review, automated tests, UAT sign-off per phase</li>
            </ul>
          </Card>
          <Card title="CRITICAL DEPENDENCIES" headerColor={colors.navy}>
            <div className="text-xs">
              <table className="w-full">
                <tbody>
                  {[
                    ["D1", "Azure subscription provisioned", "Week 1"],
                    ["D2", "D365 API credentials", "Week 2"],
                    ["D3", "VPN access for TN Macaulay dev team", "Week 1"],
                    ["D4", "Vendor master data export (CSV)", "Month 1"],
                    ["D5", "RFx templates and process flowcharts", "Month 2"],
                    ["D6", "ServiceNow API specs", "Month 2"],
                    ["D7", "Third-party API keys (D&B, NAVEX)", "Month 3"],
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="py-1 font-medium" style={{ color: colors.teal }}>{row[0]}</td>
                      <td className="py-1">{row[1]}</td>
                      <td className="py-1" style={{ color: colors.slate }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Timeline */}
        <motion.div variants={itemFade} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
          <div className="px-3 py-2 font-semibold text-white text-sm" style={{ backgroundColor: colors.teal }}>13-MONTH EXECUTION ROADMAP</div>
          <div className="p-4">
            <div className="flex text-xs text-center mb-2" style={{ color: colors.slate }}>
              {["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"].map((m, i) => (
                <div key={i} className="flex-1">{m}</div>
              ))}
            </div>
            <div className="flex gap-1 mb-3">
              <div className="flex-1 text-center text-xs text-white py-1 rounded" style={{ backgroundColor: colors.teal, flex: 4 }}>Phase 1: Foundation</div>
              <div className="flex-1 text-center text-xs text-white py-1 rounded" style={{ backgroundColor: colors.navy, flex: 5 }}>Phase 2: RFx Workflows</div>
              <div className="flex-1 text-center text-xs text-white py-1 rounded" style={{ backgroundColor: colors.darkNavy, flex: 4 }}>Phase 3: Intelligence</div>
            </div>
            <div className="text-xs space-y-1" style={{ color: colors.body }}>
              <p><strong>Month 1:</strong> Kickoff, architecture design, requirements validation</p>
              <p><strong>Month 4:</strong> Phase 1 UAT → GO-LIVE (Vendor Portal, AI Bot, Reverse Auction)</p>
              <p><strong>Months 7-9:</strong> Phase 2 UAT → GO-LIVE (Full RFx workflows)</p>
              <p><strong>Months 12-13:</strong> Final UAT → PROJECT GO-LIVE</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 11: Governance & RACI
const Page11 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="08" title="Governance, Reporting & RACI" subtitle="Structured oversight with clear accountability" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        {/* Governance Structure */}
        <motion.div variants={itemFade} className="mb-4">
          <div className="px-3 py-2 font-semibold text-white text-sm rounded-t" style={{ backgroundColor: colors.teal }}>GOVERNANCE STRUCTURE</div>
          <div className="space-y-1 p-2 rounded-b" style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}>
            {[
              { level: "STEERING COMMITTEE", cadence: "Monthly", attendees: "Exec Sponsor, Project Director, IT Lead, Project Owner", bg: colors.navy },
              { level: "PROJECT STATUS REVIEW", cadence: "Weekly", attendees: "PM, IT Lead, Business Analysts, Procurement Team", bg: colors.teal },
              { level: "SPRINT DEMO", cadence: "Bi-weekly", attendees: "Full team + stakeholders — feature walkthrough", bg: colors.darkNavy },
              { level: "TECHNICAL REVIEW", cadence: "Weekly", attendees: "Solution Architect, Developers, IHS IT Lead", bg: colors.slate },
            ].map((g, i) => (
              <div key={i} className="flex items-center px-3 py-2 rounded text-white text-xs" style={{ backgroundColor: g.bg }}>
                <span className="w-1/4 font-semibold">{g.level}</span>
                <span className="w-1/6" style={{ color: colors.teal }}>{g.cadence}</span>
                <span className="flex-1" style={{ color: colors.iceBlue }}>{g.attendees}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RACI Matrix */}
        <Table 
          headers={["Activity", "TN Macaulay", "IHS IT", "IHS Procurement", "Exec Sponsor"]}
          rows={[
            ["Platform development", <span key="1" className="font-bold" style={{ color: colors.teal }}>R/A</span>, "C", "I", "I"],
            ["D365 / system integration", "R", <span key="2" className="font-bold" style={{ color: colors.teal }}>A/C</span>, "C", "I"],
            ["Data migration & bulk upload", "R", "R", <span key="3" className="font-bold" style={{ color: colors.teal }}>A</span>, "I"],
            ["UAT & go-live sign-off", "R", "C", "R", <span key="4" className="font-bold" style={{ color: colors.teal }}>A</span>],
            ["Change management & training", "C", "C", <span key="5" className="font-bold" style={{ color: colors.teal }}>R/A</span>, "I"],
          ]}
        />
        
        <motion.div variants={itemFade} className="mt-3 text-xs" style={{ color: colors.slate }}>
          <strong>R</strong> = Responsible | <strong>A</strong> = Accountable | <strong>C</strong> = Consulted | <strong>I</strong> = Informed
          <p className="mt-2"><strong>Escalation:</strong> Workstream Lead (24hr) → PM (48hr) → SteerCo (72hr) → Exec Sponsor (exception)</p>
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 12: Risk Register
const Page12 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle number="08" title="Programme Risk Register" subtitle="Proactive risk identification with clear ownership and mitigation" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <Table 
          headers={["ID", "Risk", "L", "I", "Mitigation", "Owner"]}
          rows={[
            [<span key="r1" style={{ color: colors.teal }} className="font-bold">R1</span>, "D365 integration complexity", "Med", "High", "Early POC in Month 1, dedicated integration specialist", "TN Mac"],
            [<span key="r2" style={{ color: colors.teal }} className="font-bold">R2</span>, "Delayed IHS environment access", "Med", "High", "Parallel dev env, early dependency tracking", "IHS IT"],
            [<span key="r3" style={{ color: colors.teal }} className="font-bold">R3</span>, "Scope creep from new requirements", "High", "Med", "Formal change control, weekly scope reviews", "Joint"],
            [<span key="r4" style={{ color: colors.teal }} className="font-bold">R4</span>, "Key resource unavailability", "Low", "High", "Cross-training, documentation, backup resources", "TN Mac"],
            [<span key="r5" style={{ color: colors.teal }} className="font-bold">R5</span>, "Data migration quality issues", "Med", "Med", "Data profiling, validation scripts, cleansing", "Joint"],
            [<span key="r6" style={{ color: colors.teal }} className="font-bold">R6</span>, "User adoption resistance", "Med", "Med", "Early engagement, training, change champions", "IHS"],
            [<span key="r7" style={{ color: colors.teal }} className="font-bold">R7</span>, "Third-party API changes", "Low", "Med", "Abstraction layer, API versioning, monitoring", "TN Mac"],
            [<span key="r8" style={{ color: colors.teal }} className="font-bold">R8</span>, "Security / compliance gaps", "Low", "High", "Security review gates, compliance checklist, pen testing", "Joint"],
          ]}
        />

        <div className="mt-4">
          <Card title="IHS RESOURCES REQUIRED" headerColor={colors.teal}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: colors.slate }}>
                  <th className="text-left py-1">Role</th>
                  <th className="text-left py-1">Weekly Commitment</th>
                  <th className="text-left py-1">Key Activities</th>
                </tr>
              </thead>
              <tbody style={{ color: colors.body }}>
                {[
                  ["Executive Sponsor", "1 hr/week", "Steering committee, escalations, budget approval"],
                  ["Project Owner (Procurement)", "8 hrs/week", "Requirements, UAT, business process decisions"],
                  ["IT Lead", "8 hrs/week", "Technical review, integration support, security"],
                  ["Business Analysts (2)", "20 hrs/week each", "Requirements docs, process mapping, testing"],
                  ["SMEs + Change Champions", "4 hrs/week each", "Domain expertise, training coordination, feedback"],
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-1 font-medium">{row[0]}</td>
                    <td className="py-1" style={{ color: colors.teal }}>{row[1]}</td>
                    <td className="py-1">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 13: Next Steps
const Page13 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle title="Next Steps & Discussion" subtitle="Actions required to proceed with 1 March 2026 mobilisation" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <motion.div variants={itemFade} className="rounded-lg overflow-hidden mb-4" style={{ border: `1px solid ${colors.border}` }}>
          <div className="px-4 py-2 font-semibold text-white text-sm" style={{ backgroundColor: colors.teal }}>
            IMMEDIATE ACTIONS FROM THIS SESSION
          </div>
          <div className="divide-y" style={{ borderColor: colors.border }}>
            {[
              { num: "01", action: "IHS IT to provision Azure subscription and VPN access", deadline: "Week 1 (by 28 Feb)", owner: "IHS IT Infrastructure" },
              { num: "02", action: "IHS IT to register Procure AI app in Azure AD, grant OData API access", deadline: "Week 2", owner: "IHS Enterprise Architecture" },
              { num: "03", action: "IHS InfoSec to confirm LLM hosting decision (Azure OpenAI recommended)", deadline: "By Tuesday CIO meeting", owner: "IHS Information Security" },
              { num: "04", action: "IHS Procurement to share remaining flowcharts (.mmd files, raw data)", deadline: "Week 1", owner: "IHS Procurement" },
              { num: "05", action: "Both teams to schedule weekly technical sync", deadline: "This week", owner: "Joint" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <span className="text-2xl font-bold" style={{ color: colors.teal, fontFamily: "Georgia, serif" }}>{item.num}</span>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: colors.body }}>{item.action}</p>
                  <p className="text-xs"><span style={{ color: colors.navy }} className="font-bold">{item.deadline}</span> <span style={{ color: colors.slate }}>| {item.owner}</span></p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <Card title="TUESDAY CIO SESSION" headerColor={colors.navy}>
          <p className="text-sm mb-2" style={{ color: colors.body }}><strong>Goal:</strong> Executive comfort and go/no-go decision for 1 March mobilisation</p>
          <p className="text-sm" style={{ color: colors.body }}><strong>What we need from this working group:</strong> Technical endorsement that architecture, security model, and integration approach are sound. Any blockers or concerns raised today will be addressed before Tuesday.</p>
        </Card>

        <motion.div variants={itemFade} className="mt-4 px-4 py-4 rounded-lg text-center" style={{ backgroundColor: colors.teal }}>
          <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Georgia, serif" }}>Open Discussion</h3>
          <p className="text-sm text-white">Questions, concerns, and alignment points from IT Infrastructure, Enterprise Architecture, Governance, and Information Security</p>
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 14: Appendix Divider
const Page14 = () => (
  <div className="h-full flex flex-col relative" style={{ backgroundColor: colors.dark }}>
    <div className="h-1 w-full" style={{ backgroundColor: colors.teal }} />
    
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <motion.h1 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-5xl font-bold text-white mb-4"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Appendix
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.3 }}
        className="text-lg mb-4"
        style={{ color: colors.iceBlue }}
      >
        Process Flowcharts & Database Architecture
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="text-sm"
        style={{ color: colors.slate }}
      >
        Reference material for technical deep-dives
      </motion.p>
    </div>
    
    <div className="h-10 flex items-center justify-between px-8 text-xs border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
      <span style={{ color: colors.iceBlue }}>Procure AI | IHS Towers Nigeria | Technical Working Group | 23 February 2026</span>
      <span style={{ color: colors.teal }} className="font-semibold">CONFIDENTIAL</span>
    </div>
  </div>
);

// Page 15: Process Flow - RFQ/Tender Creation
const Page15 = () => {
  const flowSteps = [
    { num: 1, label: "Business User Raises Request", color: "#3B82F6" },
    { num: 2, label: "Scope Validation", color: colors.teal },
    { num: 3, label: "Budget & Approval Check", color: colors.orange },
    { num: 4, label: "AI Vendor Discovery", color: "#0F766E" },
    { num: 5, label: "RFQ Generation", color: colors.navy },
    { num: 6, label: "Vendor Bid Submission", color: "#3B82F6" },
    { num: 7, label: "AI Bid Evaluation", color: colors.teal },
    { num: 8, label: "Technical & Financial Scoring", color: colors.orange },
    { num: 9, label: "BAFO Round (if required)", color: "#F97316" },
    { num: 10, label: "Award & Contract", color: colors.navy },
  ];

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
        <SectionTitle title="Process Flow: RFQ / Tender Creation" subtitle="End-to-end flow from requirement to vendor award" />
        
        <motion.div variants={staggerChildren} initial="initial" animate="animate">
          {/* Flow Diagram - Row 1 */}
          <motion.div variants={itemFade} className="flex items-center justify-between gap-2 mb-2">
            {flowSteps.slice(0, 5).map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1" style={{ backgroundColor: step.color }}>
                    {step.num}
                  </div>
                  <div className="w-28 h-14 rounded-lg flex items-center justify-center p-2 text-center" style={{ border: `2px solid ${step.color}`, backgroundColor: `${step.color}10` }}>
                    <span className="text-xs font-medium" style={{ color: step.color }}>{step.label}</span>
                  </div>
                </div>
                {i < 4 && <div className="w-4 h-0.5 mx-1" style={{ backgroundColor: colors.border }} />}
              </div>
            ))}
          </motion.div>

          {/* Curved Arrow Down */}
          <div className="flex justify-end pr-12 my-1">
            <div className="w-8 h-8 border-r-2 border-b-2 rounded-br-lg" style={{ borderColor: colors.border }} />
          </div>

          {/* Flow Diagram - Row 2 */}
          <motion.div variants={itemFade} className="flex items-center justify-between gap-2 mb-4">
            {flowSteps.slice(5, 10).map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1" style={{ backgroundColor: step.color }}>
                    {step.num}
                  </div>
                  <div className="w-28 h-14 rounded-lg flex items-center justify-center p-2 text-center" style={{ border: `2px solid ${step.color}`, backgroundColor: `${step.color}10` }}>
                    <span className="text-xs font-medium" style={{ color: step.color }}>{step.label}</span>
                  </div>
                </div>
                {i < 4 && <div className="w-4 h-0.5 mx-1" style={{ backgroundColor: colors.border }} />}
              </div>
            ))}
          </motion.div>

          {/* Two Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card title="Key Database Tables" headerColor={colors.teal}>
              <ul className="space-y-1 text-xs font-mono" style={{ color: colors.body }}>
                <li><strong>rfq_requests</strong> — Stores all RFQ/RFP metadata</li>
                <li><strong>rfq_line_items</strong> — Individual items per RFQ</li>
                <li><strong>rfq_vendor_invitations</strong> — Invited vendors per RFQ</li>
                <li><strong>vendor_bids</strong> — Submitted bid details and pricing</li>
                <li><strong>bid_evaluations</strong> — Scoring (technical, financial, risk)</li>
                <li><strong>awards</strong> — Final vendor selection and award details</li>
              </ul>
            </Card>
            <Card title="Integration Points" headerColor={colors.navy}>
              <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
                <li><strong>D365</strong> → Budget validation, cost center lookup</li>
                <li><strong>Azure Data Lake</strong> → Historical pricing for AI scoring</li>
                <li><strong>External APIs</strong> → Vendor discovery (Alibaba, Global Sources)</li>
                <li><strong>Lumen</strong> → Contract generation after award</li>
                <li><strong>ServiceNow</strong> → Automated ticket creation on exceptions</li>
              </ul>
            </Card>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

// Page 16: Process Flow - Vendor Registration
const Page16 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle title="Process Flow: Vendor Registration & Onboarding" subtitle="Self-service registration through to D365 sync" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        {/* Swimlane Headers */}
        <motion.div variants={itemFade} className="grid grid-cols-3 gap-2 mb-2">
          <div className="px-3 py-2 text-center text-sm font-semibold text-white rounded-t" style={{ backgroundColor: "#3B82F6" }}>VENDOR ACTIONS</div>
          <div className="px-3 py-2 text-center text-sm font-semibold text-white rounded-t" style={{ backgroundColor: colors.teal }}>PROCURE AI (AUTOMATED)</div>
          <div className="px-3 py-2 text-center text-sm font-semibold text-white rounded-t" style={{ backgroundColor: colors.navy }}>IHS PROCUREMENT</div>
        </motion.div>

        {/* Swimlane Content */}
        <motion.div variants={itemFade} className="grid grid-cols-3 gap-2 mb-4" style={{ minHeight: '280px' }}>
          {/* Vendor Column */}
          <div className="p-2 rounded-b space-y-2" style={{ backgroundColor: "#3B82F610", border: `1px solid #3B82F6` }}>
            {[
              { num: 1, label: "Self-Registration (Portal / Invite Link)" },
              { num: 2, label: "Upload Company Profile & Documents" },
              { num: 3, label: "Complete Due Diligence Forms" },
              { num: 4, label: "Accept Terms & Conditions" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-white rounded text-xs">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#3B82F6" }}>{s.num}</div>
                <span style={{ color: colors.body }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Procure AI Column */}
          <div className="p-2 rounded-b space-y-2" style={{ backgroundColor: `${colors.teal}10`, border: `1px solid ${colors.teal}` }}>
            {[
              { num: 5, label: "AI Profile Enrichment" },
              { num: 6, label: "Document Verification" },
              { num: 7, label: "Risk & Compliance Screening" },
              { num: 8, label: "Vendor Scoring & Classification" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-white rounded text-xs">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: colors.teal }}>{s.num}</div>
                <span style={{ color: colors.body }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* IHS Column */}
          <div className="p-2 rounded-b space-y-2" style={{ backgroundColor: `${colors.navy}10`, border: `1px solid ${colors.navy}` }}>
            {[
              { num: 9, label: "Review & Approve Vendor Profile" },
              { num: 10, label: "Category Assignment" },
              { num: 11, label: "D365 Vendor Master Sync" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-white rounded text-xs">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: colors.navy }}>{s.num}</div>
                <span style={{ color: colors.body }}>{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Database Tables Bar */}
        <motion.div variants={itemFade} className="px-3 py-2 rounded text-xs mb-2" style={{ backgroundColor: colors.lightBg, border: `1px solid ${colors.border}` }}>
          <strong style={{ color: colors.navy }}>Database Tables:</strong>
          <span className="font-mono ml-2" style={{ color: colors.body }}>vendors | vendor_contacts | vendor_documents | vendor_compliance | vendor_categories | vendor_risk_scores | vendor_bank_details</span>
        </motion.div>

        <motion.div variants={itemFade} className="text-xs italic" style={{ color: colors.teal }}>
          <strong>Bulk Upload:</strong> CSV/XLSX via Admin Portal → Validated against schema → Loaded to staging tables → Approved → Written to production
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 17: Process Flow - Reverse Auction
const Page17 = () => {
  const auctionSteps = [
    { num: 1, label: "Asset Listed for Disposal", desc: "Finance team validates asset for sale", color: colors.orange },
    { num: 2, label: "Vendor Invitation", desc: "Pre-qualified buyers notified via portal", color: "#3B82F6" },
    { num: 3, label: "Inspection Period", desc: "Vendors inspect assets onsite or via photos", color: colors.teal },
    { num: 4, label: "Live Bidding Rounds", desc: "Real-time competitive bidding with AI floor", color: "#0F766E" },
    { num: 5, label: "Winner Determination", desc: "Highest bid verified against reserve price", color: colors.navy },
    { num: 6, label: "Payment & Collection", desc: "Invoice generated, asset handover", color: colors.orange },
  ];

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
        <SectionTitle title="Process Flow: Reverse Auction" subtitle="Asset disposal through competitive bidding" />
        
        <motion.div variants={staggerChildren} initial="initial" animate="animate">
          {/* Flow Steps */}
          <motion.div variants={itemFade} className="flex items-start justify-between gap-2 mb-6">
            {auctionSteps.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center w-24">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2" style={{ backgroundColor: step.color }}>
                    {step.num}
                  </div>
                  <div className="w-full h-20 rounded-lg flex flex-col items-center justify-center p-2 text-center text-white" style={{ backgroundColor: step.color }}>
                    <span className="text-xs font-semibold leading-tight">{step.label}</span>
                  </div>
                  <p className="text-xs text-center mt-1" style={{ color: colors.slate }}>{step.desc}</p>
                </div>
                {i < 5 && <div className="w-4 h-0.5 mt-6" style={{ backgroundColor: colors.border }} />}
              </div>
            ))}
          </motion.div>

          {/* Two Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card title="Database Tables" headerColor={colors.teal}>
              <ul className="space-y-1 text-xs font-mono" style={{ color: colors.body }}>
                <li><strong>auctions</strong> — Auction metadata, status, dates</li>
                <li><strong>auction_lots</strong> — Individual assets/lots per auction</li>
                <li><strong>auction_bids</strong> — All bids with timestamps</li>
                <li><strong>auction_invitations</strong> — Invited vendors per auction</li>
                <li><strong>auction_results</strong> — Winner, final price, settlement</li>
              </ul>
            </Card>
            <Card title="Real-Time Bidding Architecture" headerColor={colors.navy}>
              <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
                <li>• WebSocket connections for live bid updates</li>
                <li>• Azure SignalR Service for real-time broadcast</li>
                <li>• Redis cache for bid queue and leaderboard</li>
                <li>• AI-calculated reserve price from historical data</li>
                <li>• Audit trail: every bid immutably logged</li>
              </ul>
            </Card>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

// Page 18: Back-End Database Architecture
const Page18 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle title="Back-End Database Architecture" subtitle="Core data domains and storage strategy" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        {/* 4 Database Columns */}
        <motion.div variants={itemFade} className="grid grid-cols-4 gap-3 mb-4">
          {[
            { title: "AZURE SQL DATABASE", subtitle: "Transactional Data", color: "#3B82F6", items: ["vendors | items | rfq_requests", "rfq_line_items | vendor_bids", "awards | purchase_orders", "contracts | approvals"] },
            { title: "AZURE COSMOS DB", subtitle: "Vendor Profiles & Documents", color: colors.teal, items: ["vendor_profiles (JSON)", "vendor_documents (metadata)", "audit_logs | activity_feeds", "notifications | chat_history"] },
            { title: "AZURE DATA LAKE", subtitle: "Analytics & ML Training", color: "#0F766E", items: ["historical_po_data", "spend_analytics | price_trends", "vendor_performance_history", "demand_forecasting_data"] },
            { title: "AZURE BLOB STORAGE", subtitle: "Files & Attachments", color: colors.orange, items: ["vendor_certificates (PDF)", "rfq_attachments | bid_docs", "contract_documents", "auction_asset_photos"] },
          ].map((db, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
              <div className="px-3 py-2 text-center font-semibold text-white text-xs" style={{ backgroundColor: db.color }}>{db.title}</div>
              <div className="p-3" style={{ backgroundColor: colors.lightBg }}>
                <p className="text-xs font-semibold mb-2" style={{ color: db.color }}>{db.subtitle}</p>
                <ul className="space-y-1 text-xs font-mono" style={{ color: colors.body }}>
                  {db.items.map((item, j) => <li key={j}>• {item}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Bulk Data Pipeline */}
        <motion.div variants={itemFade} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
          <div className="px-3 py-2 font-semibold text-white text-sm" style={{ backgroundColor: colors.navy }}>Bulk Data Upload Pipeline</div>
          <div className="p-4 flex items-center justify-between gap-2">
            {[
              { label: "CSV/XLSX Upload", color: "#3B82F6" },
              { label: "Schema Validation", color: colors.teal },
              { label: "Staging Tables", color: colors.green },
              { label: "Admin Review", color: colors.navy },
              { label: "Production Write", color: colors.teal },
            ].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="px-3 py-2 rounded text-white text-xs font-medium text-center" style={{ backgroundColor: step.color, minWidth: '100px' }}>
                  {step.label}
                </div>
                {i < 4 && <div className="w-6 text-center" style={{ color: colors.border }}>→</div>}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 19: Bulk Data Upload Format Requirements
const Page19 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle title="Bulk Data Upload: Format Requirements" subtitle="What IHS needs to prepare for initial data migration" />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate">
        <Table 
          headers={["Data Set", "Format", "Est. Volume", "Source System", "Priority"]}
          rows={[
            ["Vendor Master", "CSV / XLSX", "2,000–5,000", "D365", <span key="p1" style={{ color: colors.orange }} className="font-semibold">P1 — Critical</span>],
            ["Category Master", "CSV / XLSX", "100–300", "D365 / Manual", <span key="p2" style={{ color: colors.orange }} className="font-semibold">P1 — Critical</span>],
            ["Item Catalogue", "CSV / XLSX", "5,000–15,000", "D365 / Readcube", <span key="p3" style={{ color: colors.orange }} className="font-semibold">P1 — Critical</span>],
            ["Historical POs", "CSV / XLSX", "50,000–200,000", "D365", <span key="p4" style={{ color: "#3B82F6" }} className="font-semibold">P2 — High</span>],
            ["Vendor Compliance", "CSV + PDF files", "5,000–15,000", "Manual / Shared Drive", <span key="p5" style={{ color: "#3B82F6" }} className="font-semibold">P2 — High</span>],
          ]}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card title="File Format Specifications" headerColor={colors.teal}>
            <ul className="space-y-1 text-xs" style={{ color: colors.body }}>
              <li>• <strong>Encoding:</strong> UTF-8</li>
              <li>• <strong>Date format:</strong> YYYY-MM-DD</li>
              <li>• <strong>Decimal separator:</strong> period (.)</li>
              <li>• <strong>Boolean:</strong> TRUE / FALSE</li>
              <li>• <strong>Currency codes:</strong> ISO 4217 (NGN, USD, EUR)</li>
              <li>• <strong>Country codes:</strong> ISO 3166-1 Alpha-3 (NGA, GHA)</li>
              <li>• No thousands separators in numeric fields</li>
            </ul>
          </Card>
          <Card title="Upload Load Order" headerColor={colors.navy}>
            <ol className="space-y-1 text-xs" style={{ color: colors.body }}>
              <li><strong>1.</strong> Category Master (no dependencies)</li>
              <li><strong>2.</strong> Vendor Master (refs: Category)</li>
              <li><strong>3.</strong> Item Catalogue (refs: Category, Vendor)</li>
              <li><strong>4.</strong> Historical POs (refs: Vendor, Item)</li>
              <li><strong>5.</strong> Vendor Compliance (refs: Vendor)</li>
            </ol>
            <p className="mt-3 text-xs italic" style={{ color: colors.teal }}>Templates provided in accompanying Excel workbook</p>
          </Card>
        </div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// Page 20: Questions (formerly Page 14)
const Page20 = () => (
  <div className="h-full flex flex-col bg-white relative">
    <div className="flex-1 px-8 pt-6 pb-14 overflow-auto">
      <SectionTitle title="Questions for the Working Group" subtitle="We want to build this right. These questions will help us tailor Procure AI to your environment." />
      
      <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-2">
        {[
          { num: "01", q: "What Azure regions does IHS currently use?", ctx: "Determines where Procure AI deploys and where all data resides. Must match existing region for D365 latency and data residency compliance.", team: "IT Infrastructure" },
          { num: "02", q: "Do you have an API gateway standard (e.g. Azure API Management)?", ctx: "We route all integrations through an API hub. If IHS has a standard, we align to it rather than introducing a new one.", team: "Enterprise Architecture" },
          { num: "03", q: "What is your D365 Finance & Operations version and environment setup?", ctx: "OData API capabilities differ between versions. We need to understand dev/staging/prod setup — separate subscriptions or resource groups.", team: "Enterprise Architecture" },
          { num: "04", q: "What is your security assessment process for new applications?", ctx: "We want to build your security requirements into development from Day 1. If you have a standard questionnaire or pen test provider, we'd like it this week.", team: "Information Security" },
          { num: "05", q: "Does IHS have an existing policy on AI and Large Language Models?", ctx: "Directly affects our LLM hosting recommendation. If policy prohibits cloud AI, we plan for on-premise. If no policy exists, we can help draft one.", team: "InfoSec / Governance" },
          { num: "06", q: "What governance framework does IHS follow (COBIT, ITIL, custom)?", ctx: "We align delivery reporting, change control, and documentation to your existing framework so Procure AI fits how IHS already manages projects.", team: "Governance / PMO" },
        ].map((item, i) => (
          <motion.div 
            key={i}
            variants={itemFade}
            className="flex rounded-lg overflow-hidden"
            style={{ backgroundColor: i % 2 === 0 ? colors.lightBg : colors.white, border: `1px solid ${colors.border}` }}
          >
            <div className="w-1" style={{ backgroundColor: colors.teal }} />
            <div className="flex items-start gap-3 p-3 flex-1">
              <span className="text-xl font-bold" style={{ color: colors.teal, fontFamily: "Georgia, serif" }}>{item.num}</span>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1" style={{ color: colors.navy }}>{item.q}</p>
                <p className="text-xs" style={{ color: colors.slate }}>{item.ctx}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.navy, color: colors.white }}>{item.team}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemFade} initial="initial" animate="animate" className="mt-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: colors.navy }}>
        <span className="font-bold text-white">We don't need all answers today.</span>
        <span style={{ color: colors.iceBlue }}> But understanding your environment early means we build to your standards from Day 1 — not retrofit later.</span>
      </motion.div>
    </div>
    <Footer />
  </div>
);

// ============ MAIN COMPONENT ============

const ProcureAITWGSlideshow = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const navigate = useNavigate();
  const totalPages = 20;

  const pages = [Page1, Page2, Page3, Page4, Page5, Page6, Page7, Page8, Page9, Page10, Page11, Page12, Page13, Page14, Page15, Page16, Page17, Page18, Page19, Page20];
  const CurrentPageComponent = pages[currentPage - 1];

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextPage();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevPage();
      } else if (e.key === "Escape") {
        setCurrentPage(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage]);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    // Placeholder for PDF generation
    setTimeout(() => {
      setIsGeneratingPdf(false);
      alert("PDF download functionality - connect to your PDF generation service");
    }, 1000);
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4 z-50 bg-white/95 backdrop-blur-sm border-b" style={{ borderColor: colors.border }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
          style={{ color: colors.slate }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: colors.teal }}
        >
          {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isGeneratingPdf ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {/* Page Content */}
      <div className="absolute inset-0 pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full"
          >
            <CurrentPageComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Left Arrow */}
      {currentPage > 1 && (
        <button
          onClick={prevPage}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 z-40"
          style={{ backgroundColor: colors.navy, color: colors.white }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Right Arrow */}
      {currentPage < totalPages && (
        <button
          onClick={nextPage}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 z-40"
          style={{ backgroundColor: colors.teal, color: colors.white }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Navigation */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 z-40">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => goToPage(i + 1)}
            className="w-2.5 h-2.5 rounded-full transition-all hover:scale-125"
            style={{ 
              backgroundColor: currentPage === i + 1 ? colors.teal : colors.border,
              transform: currentPage === i + 1 ? "scale(1.2)" : "scale(1)"
            }}
          />
        ))}
      </div>

      {/* Page Counter */}
      <div 
        className="absolute bottom-4 right-6 text-sm font-medium z-40"
        style={{ color: colors.teal }}
      >
        {currentPage} / {totalPages}
      </div>
    </div>
  );
};

export default ProcureAITWGSlideshow;
