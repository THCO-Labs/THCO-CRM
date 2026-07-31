import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, ArrowLeft, Check, X, ArrowRight, Shield, Lock, Eye, AlertTriangle, FileCheck, Server, Database, Cloud, Users, Target, Clock, Zap, TrendingUp, Award, Building, Settings, FileText, BarChart3, Bot, Gavel, Search } from "lucide-react";

// Design System Colors
const colors = {
  teal: "#0D9488",
  navy: "#1E2761",
  navyLight: "#2A3578",
  dark: "#0F172A",
  slate: "#64748B",
  iceBlue: "#CADCFC",
  lightBg: "#F8FAFC",
  white: "#FFFFFF",
  body: "#333333",
  green: "#059669",
  orange: "#EA580C",
  blue: "#3B82F6",
  purple: "#7C3AED",
  red: "#EF4444"
};

// Animation variants - ENHANCED
const pageVariants = {
  initial: { opacity: 0, x: 60, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -60, scale: 0.98, transition: { duration: 0.25 } }
};

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const fadeInLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const fadeInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, type: "spring", stiffness: 200 } }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const staggerItem = {
  initial: { opacity: 0, y: 20, x: -10 },
  animate: { opacity: 1, y: 0, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const countUp = {
  initial: { opacity: 0, scale: 0.5, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, type: "spring", stiffness: 150 } }
};

const slideInFromBottom = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const popIn = {
  initial: { opacity: 0, scale: 0 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, type: "spring", stiffness: 300, damping: 15 } }
};

const tableRowVariant = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

// Footer Component
const Footer = () => (
  <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-between px-8 text-[10px]" style={{ color: colors.slate }}>
    <span>Procure AI  |  IHS Towers Nigeria  |  February 2026</span>
    <span className="font-bold" style={{ color: colors.teal }}>CONFIDENTIAL</span>
  </div>
);

// Section Header Component
const SectionHeader = ({ number, title, subtitle }) => (
  <motion.div {...fadeInUp} className="mb-6">
    <div className="flex items-center gap-3 mb-1">
      {number && <span className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>{number}</span>}
      <h1 className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.navy }}>{title}</h1>
    </div>
    {subtitle && <p className="text-sm" style={{ color: colors.slate }}>{subtitle}</p>}
  </motion.div>
);

// Card Component with enhanced animations
const Card = ({ children, accent, header, headerBg, className = "" }) => (
  <motion.div 
    variants={staggerItem}
    whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.12)", transition: { duration: 0.2 } }}
    className={`rounded-lg overflow-hidden bg-white shadow-sm ${className}`}
    style={{ borderLeft: accent ? `4px solid ${accent}` : undefined }}
  >
    {header && (
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-4 py-2 text-xs font-bold tracking-wide" 
        style={{ backgroundColor: headerBg || colors.navy, color: colors.white }}
      >
        {header}
      </motion.div>
    )}
    <div className="p-4">{children}</div>
  </motion.div>
);

// Stat Box with animated counter
const StatBox = ({ value, label, color = colors.teal }) => (
  <motion.div 
    variants={countUp}
    whileHover={{ scale: 1.08, transition: { duration: 0.2 } }}
    className="text-center"
  >
    <motion.div 
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      className="text-3xl font-bold" 
      style={{ fontFamily: "Georgia, serif", color }}
    >
      {value}
    </motion.div>
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-xs mt-1" 
      style={{ color: colors.slate }}
    >
      {label}
    </motion.div>
  </motion.div>
);

// Badge Component with pop animation
const Badge = ({ children, color = colors.green }) => (
  <motion.span 
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 400, damping: 15 }}
    whileHover={{ scale: 1.1 }}
    className="px-2 py-1 rounded text-xs font-bold text-white" 
    style={{ backgroundColor: color }}
  >
    {children}
  </motion.span>
);

// Risk Level Pill with animation
const RiskPill = ({ level }) => {
  const bg = level === "High" ? colors.red : level === "Med" ? colors.orange : colors.green;
  return (
    <motion.span 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500 }}
      className="px-2 py-0.5 rounded text-xs font-medium text-white" 
      style={{ backgroundColor: bg }}
    >
      {level}
    </motion.span>
  );
};

// ============ PAGE COMPONENTS ============

// Page 1: Title - ENHANCED ANIMATIONS
const Page1 = () => (
  <div className="h-full flex flex-col justify-center items-center relative overflow-hidden" style={{ backgroundColor: colors.dark }}>
    {/* Animated background elements */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.1, scale: 1 }}
      transition={{ duration: 1.5 }}
      className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl"
      style={{ background: `radial-gradient(circle, ${colors.teal}40, transparent)` }}
    />
    <motion.div 
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.1, scale: 1 }}
      transition={{ duration: 1.5, delay: 0.3 }}
      className="absolute bottom-20 left-20 w-80 h-80 rounded-full blur-3xl"
      style={{ background: `radial-gradient(circle, ${colors.navy}60, transparent)` }}
    />
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="text-center z-10"
    >
      <motion.h1 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-6xl font-bold text-white mb-2" 
        style={{ fontFamily: "Georgia, serif" }}
      >
        Procure AI
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-xl mb-6" 
        style={{ color: colors.iceBlue }}
      >
        Procurement Transformation Programme
      </motion.p>
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-32 h-px mx-auto mb-6" 
        style={{ backgroundColor: colors.teal, transformOrigin: 'center' }} 
      />
      <motion.h2 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="text-3xl font-bold text-white mb-2" 
        style={{ fontFamily: "Georgia, serif" }}
      >
        Executive Kick-Off Pack
      </motion.h2>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="text-base mb-1" 
        style={{ color: colors.iceBlue }}
      >
        Strategic Validation Session with Group CIO
      </motion.p>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="text-sm" 
        style={{ color: colors.slate }}
      >
        24 February 2026
      </motion.p>
    </motion.div>
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
      className="absolute bottom-8 left-0 right-0 flex justify-between px-8 text-xs" 
      style={{ color: colors.slate }}
    >
      <span>IHS Towers Nigeria  |  TN Macaulay</span>
      <motion.span 
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="font-bold" 
        style={{ color: colors.teal }}
      >
        CONFIDENTIAL
      </motion.span>
    </motion.div>
  </div>
);

// Page 2: Session Agenda - ENHANCED
const Page2 = () => {
  const agenda = [
    { num: "01", topic: "Strategic Framing", time: "15–20 min", desc: "Objectives, transformation thesis, phased capability model" },
    { num: "02", topic: "Scope Confirmation", time: "15–20 min", desc: "Interfaces, assumptions, exclusions, IHS responsibilities" },
    { num: "03", topic: "Architecture & AI Data Sovereignty", time: "20–25 min", desc: "Solution design, integrations, LLM hosting options" },
    { num: "04", topic: "Platform Security & Compliance", time: "10–15 min", desc: "Encryption, authentication, pen testing, compliance" },
    { num: "05", topic: "Data Governance & Boundaries", time: "10–15 min", desc: "Data flows, residency, access control, classification" },
    { num: "06", topic: "Governance & Delivery Model", time: "15–20 min", desc: "SteerCo, PMO, RACI, reporting, dependencies" },
    { num: "07", topic: "Risk Register & Reporting", time: "10 min", desc: "Programme risks, reporting cadence, escalation" },
    { num: "08", topic: "Milestones & Execution Roadmap", time: "15–20 min", desc: "13-month timeline, critical path, deliverables" },
    { num: "09", topic: "Resource Mobilisation", time: "10 min", desc: "Team allocation, IHS resources, change management" },
    { num: "10", topic: "Decision Points", time: "10–15 min", desc: "Go/no-go for 1 March, governance approval, IT access" },
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader title="Session Agenda" subtitle="1.5–2 hour strategic validation — structured for executive decision" />
      <motion.div 
        variants={staggerContainer} 
        initial="initial" 
        animate="animate" 
        className="flex-1 space-y-1"
      >
        {agenda.map((item, i) => (
          <motion.div 
            key={i} 
            variants={staggerItem}
            whileHover={{ x: 8, scale: 1.01, transition: { duration: 0.2 } }}
            className="flex items-center gap-4 px-4 py-2 rounded cursor-pointer"
            style={{ backgroundColor: i % 2 === 0 ? colors.navy : colors.navyLight }}
          >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.05 + 0.2, type: "spring", stiffness: 200 }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" 
              style={{ backgroundColor: colors.teal }}
            >
              {item.num}
            </motion.div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">{item.topic}</p>
              <p className="text-xs" style={{ color: colors.iceBlue }}>{item.desc}</p>
            </div>
            <motion.p 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 + 0.3 }}
              className="text-xs text-white"
            >
              {item.time}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>
      <Footer />
    </div>
  );
};

// Page 3: Strategic Framing - ENHANCED
const Page3 = () => {
  const current = [
    "Manual Excel-based procurement across all categories",
    "45-day average purchase cycle from request to PO",
    "Limited to established local vendor networks",
    "No real-time spend visibility or analytics",
    "Manual vendor due diligence and compliance tracking",
    "No structured asset recovery or disposal process"
  ];
  const future = [
    "AI-powered end-to-end procurement automation",
    "15-day procurement cycles (67% reduction)",
    "Global vendor discovery (Alibaba, D&B, Global Sources)",
    "Real-time dashboards, spend analytics, forecasting",
    "Automated compliance scoring and risk monitoring",
    "Competitive reverse auctions for asset disposal"
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader number="01" title="Strategic Framing" subtitle="Programme objectives and transformation thesis" />
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card header="CURRENT STATE" headerBg={colors.slate}>
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {current.map((item, i) => (
                <motion.div 
                  key={i} 
                  variants={staggerItem}
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.1 + 0.3 }}
                  >
                    <X className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                  </motion.div>
                  <span style={{ color: colors.body }}>{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card header="FUTURE STATE (PROCURE AI)" headerBg={colors.teal}>
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {future.map((item, i) => (
                <motion.div 
                  key={i} 
                  variants={staggerItem}
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 + 0.4, type: "spring", stiffness: 300 }}
                  >
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.teal }} />
                  </motion.div>
                  <span style={{ color: colors.body }}>{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-2"
      >
        <h3 className="text-sm font-bold mb-3" style={{ color: colors.navy }}>Phased Capability Model</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "PHASE 1: Foundation & Core", modules: "Vendor Portal, Due Diligence, Risk Monitor, AI Bot, Reverse Auction", period: "Feb–May 2026 (4 mo)", color: colors.teal, delay: 0 },
            { name: "PHASE 2: RFx Workflows", modules: "RFx Creation, Vendor Sourcing, Scope Validation, BAFO, Templates", period: "Jun–Oct 2026 (5 mo)", color: colors.navy, delay: 0.1 },
            { name: "PHASE 3: Intelligence", modules: "Forecasting, Category Mgmt, TCO Reporting, Audit, Settings", period: "Nov 2026–Feb 2027 (4 mo)", color: colors.dark, delay: 0.2 },
          ].map((phase, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.7 + phase.delay, type: "spring", stiffness: 150 }}
              whileHover={{ scale: 1.03, y: -5, transition: { duration: 0.2 } }}
              className="rounded-lg p-3 text-white text-center cursor-pointer" 
              style={{ backgroundColor: phase.color }}
            >
              <p className="text-xs font-bold mb-1">{phase.name}</p>
              <p className="text-[10px] opacity-90">{phase.modules}</p>
              <p className="text-[10px] mt-2 font-medium">{phase.period}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};

// Page 4: Scope Confirmation
const Page4 = () => {
  const scope = [
    { phase: 1, module: "Vendor Portal + Interface", pages: "15", ai: "Agentic AI, Decision Engine", ext: "D&B, NAVEX, Docusign" },
    { phase: 1, module: "Due Diligence & Risk Monitor", pages: "7", ai: "Decision Engine", ext: "D&B, NAVEX" },
    { phase: 1, module: "AI Overview Bot", pages: "1", ai: "LLM", ext: "—" },
    { phase: 1, module: "Reverse Auction Portal", pages: "8", ai: "Analytics + Decision Engine", ext: "—" },
    { phase: 2, module: "RFx Creation + Source Vendor", pages: "9", ai: "Agentic AI, Decision Engine", ext: "Alibaba, Global Sources" },
    { phase: 2, module: "Scope Validation + Review & Rank", pages: "16", ai: "Analytics + Decision Engine", ext: "—" },
    { phase: 2, module: "BAFO Rank & Award + Templates", pages: "20+", ai: "Analytics + Decision Engine", ext: "—" },
    { phase: 3, module: "Forecasting + Category Mgmt", pages: "11", ai: "Agentic AI, Forecasting Engine", ext: "Redcube, D365" },
    { phase: 3, module: "Cost/TCO + Risk Reporting", pages: "14", ai: "Forecasting + Decision Engine", ext: "D365" },
    { phase: 3, module: "Settings + Exception + Audit", pages: "19", ai: "—", ext: "—" },
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader number="02" title="Scope Confirmation & Boundaries" subtitle="Detailed Scope by Phase (from Implementation Plan)" />
      
      <div className="overflow-auto mb-4 text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: colors.navy }}>
              <th className="text-left text-white p-2 font-medium">Phase</th>
              <th className="text-left text-white p-2 font-medium">Module</th>
              <th className="text-left text-white p-2 font-medium">Pages</th>
              <th className="text-left text-white p-2 font-medium">AI Components</th>
              <th className="text-left text-white p-2 font-medium">External Integration</th>
            </tr>
          </thead>
          <tbody>
            {scope.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
                <td className="p-2 font-bold" style={{ color: row.phase === 1 ? colors.teal : row.phase === 2 ? colors.blue : colors.navy }}>P{row.phase}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.module}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.pages}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.ai}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.ext}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card accent={colors.teal} header="KEY ASSUMPTIONS (CIO VALIDATION)" headerBg={colors.teal}>
          <ul className="text-xs space-y-1" style={{ color: colors.body }}>
            <li>• IHS provides timely access to systems & environments</li>
            <li>• LLM usage, hosting, and 3rd-party licences are IHS cost</li>
            <li>• Scoping worksheet requirements are complete and final</li>
            <li>• D365 environment supports required API integrations</li>
            <li>• Change requests managed via formal CR process</li>
          </ul>
        </Card>
        <Card accent={colors.orange} header="EXCLUSIONS (IHS RESPONSIBILITY)" headerBg={colors.orange}>
          <ul className="text-xs space-y-1" style={{ color: colors.body }}>
            <li>• LLM API usage costs (Azure OpenAI or equivalent)</li>
            <li>• Cloud hosting and infrastructure costs (Azure)</li>
            <li>• Third-party service licences (D&B, NAVEX, Docusign)</li>
            <li>• Microsoft Dynamics 365 licensing</li>
            <li>• D365 core ERP modifications, legacy decommissioning</li>
          </ul>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

// Page 5: Architecture
const Page5 = () => {
  const infra = [
    { cat: "Cloud", req: "Azure Subscription (compute, storage, networking)", env: "Dev, Staging, Prod", by: "Week 1" },
    { cat: "Database", req: "Azure SQL or PostgreSQL", env: "Dev, Staging, Prod", by: "Week 1" },
    { cat: "AI/LLM", req: "Azure OpenAI Service (GPT-4 access)", env: "All environments", by: "Month 2" },
    { cat: "Integration", req: "D365 API credentials + ServiceNow API", env: "All environments", by: "Week 2" },
    { cat: "Third-Party", req: "D&B, NAVEX, Docusign APIs", env: "Staging, Prod", by: "Month 3" },
    { cat: "Security", req: "VPN access for dev team + CI/CD pipeline tools", env: "All environments", by: "Week 1" },
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader number="03" title="Target Architecture & Technical Design" subtitle="Azure-native microservices with D365 deep integration" />
      
      <div className="flex-1 grid grid-cols-12 gap-3 mb-4">
        {/* IHS Systems */}
        <div className="col-span-2 space-y-2">
          <p className="text-[10px] font-bold text-center mb-2" style={{ color: colors.slate }}>IHS SYSTEMS</p>
          {["D365 Finance & Ops", "ServiceNow", "Azure Data Lake"].map((sys, i) => (
            <div key={i} className="rounded p-2 text-[10px] text-center text-white" style={{ backgroundColor: colors.slate }}>{sys}</div>
          ))}
        </div>

        {/* Procure AI Platform */}
        <div className="col-span-7 rounded-lg p-3" style={{ border: `2px solid ${colors.teal}` }}>
          <p className="text-[10px] font-bold text-center mb-2" style={{ color: colors.teal }}>PROCURE AI PLATFORM (AZURE)</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {["Procurement Service", "Vendor Service", "AI/ML Service"].map((svc, i) => (
              <div key={i} className="rounded p-2 text-[10px] text-center text-white" style={{ backgroundColor: colors.navy }}>{svc}</div>
            ))}
          </div>
          <div className="rounded p-2 text-[10px] text-center text-white mb-2" style={{ backgroundColor: colors.navy }}>API Hub</div>
          <div className="grid grid-cols-3 gap-2">
            {["Analytics Service", "Auction Service", "Contract Service"].map((svc, i) => (
              <div key={i} className="rounded p-2 text-[10px] text-center text-white" style={{ backgroundColor: colors.navy }}>{svc}</div>
            ))}
          </div>
          <div className="rounded p-2 text-[10px] text-center text-white mt-2" style={{ backgroundColor: colors.dark }}>
            Azure SQL | Cosmos DB | Redis | Blob Storage | Cognitive Search
          </div>
        </div>

        {/* Azure OpenAI */}
        <div className="col-span-3">
          <div className="rounded-lg p-3 text-center text-white h-full flex flex-col justify-center" style={{ backgroundColor: colors.teal }}>
            <Cloud className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold">Azure OpenAI</p>
            <p className="text-[10px] mt-1">GPT-4 in IHS tenant</p>
            <p className="text-[10px]">Zero data to OpenAI</p>
          </div>
        </div>
      </div>

      <div className="rounded p-2 text-[10px] text-center mb-3" style={{ backgroundColor: colors.navy, color: colors.white }}>
        Azure AD / Entra ID
      </div>
      <div className="rounded p-2 text-[10px] text-center mb-4" style={{ backgroundColor: colors.slate, color: colors.white }}>
        External: Alibaba | Global Sources | D&B | NAVEX | Docusign
      </div>

      <p className="text-xs font-bold mb-2" style={{ color: colors.navy }}>Infrastructure Requirements</p>
      <div className="overflow-auto text-[10px]">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: colors.lightBg }}>
              <th className="text-left p-1.5 font-medium" style={{ color: colors.navy }}>Category</th>
              <th className="text-left p-1.5 font-medium" style={{ color: colors.navy }}>Requirement</th>
              <th className="text-left p-1.5 font-medium" style={{ color: colors.navy }}>Environment</th>
              <th className="text-left p-1.5 font-medium" style={{ color: colors.navy }}>Required By</th>
            </tr>
          </thead>
          <tbody>
            {infra.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
                <td className="p-1.5 font-medium" style={{ color: colors.teal }}>{row.cat}</td>
                <td className="p-1.5" style={{ color: colors.body }}>{row.req}</td>
                <td className="p-1.5" style={{ color: colors.body }}>{row.env}</td>
                <td className="p-1.5 font-medium" style={{ color: colors.navy }}>{row.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
};

// Page 6: AI Data Sovereignty
const Page6 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader number="03" title="AI Data Sovereignty & Security" subtitle="How IHS data is protected across all AI components" />
    
    <div className="grid grid-cols-2 gap-4 flex-1">
      <div className="rounded-lg overflow-hidden" style={{ border: `2px solid ${colors.teal}` }}>
        <div className="p-3 flex items-center justify-between" style={{ backgroundColor: colors.teal }}>
          <span className="text-white font-bold text-sm">OPTION A: AZURE OPENAI</span>
          <Badge color={colors.green}>RECOMMENDED</Badge>
        </div>
        <div className="p-4 text-xs space-y-2" style={{ color: colors.body }}>
          <p>• Model runs inside IHS's own Azure subscription</p>
          <p>• OpenAI the company never sees IHS data</p>
          <p>• Microsoft enterprise data agreements apply</p>
          <p>• SOC 2, ISO 27001 compliance built in</p>
          <p>• IHS chooses Azure region for data residency</p>
          <p>• Full GPT-4 capability for all AI functions</p>
          <p>• No hardware to buy or models to maintain</p>
          <div className="mt-3 p-3 rounded text-xs" style={{ backgroundColor: `${colors.teal}15` }}>
            <p className="font-bold mb-1" style={{ color: colors.teal }}>How it works:</p>
            <p>Microsoft licensed the model from OpenAI and runs it inside Azure infrastructure. IHS data never leaves the Azure tenant. OpenAI has zero access. Same security policies IHS already trusts for D365.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.slate}` }}>
        <div className="p-3" style={{ backgroundColor: colors.navy }}>
          <span className="text-white font-bold text-sm">OPTION B: ON-PREMISE OPEN-SOURCE</span>
        </div>
        <div className="p-4 text-xs space-y-2" style={{ color: colors.body }}>
          <p>• Model runs on physical hardware IHS controls</p>
          <p>• Zero external connectivity (full air-gap possible)</p>
          <p>• Uses open-source models (LLaMA, Mistral, Phi)</p>
          <p>• IHS owns everything: hardware, model, data</p>
          <p>• Total physical control and sovereignty</p>
          <p>• Lower AI capability vs enterprise models</p>
          <p>• IHS team manages model updates</p>
          <div className="mt-3 p-3 rounded text-xs" style={{ backgroundColor: colors.lightBg }}>
            <p className="font-bold mb-1" style={{ color: colors.slate }}>When to choose:</p>
            <p>Only if IHS security policy requires a fully air-gapped solution with no cloud AI dependency.</p>
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-lg p-4 text-sm text-white mt-4" style={{ backgroundColor: colors.teal }}>
      <p className="font-bold">Recommendation: Option A.</p>
      <p className="text-xs mt-1">IHS is already on Azure, data stays in your tenant, OpenAI never sees it, and you get enterprise-grade AI with zero infrastructure overhead. Option B available if policy requires air-gap.</p>
    </div>
    <p className="text-[10px] mt-2 italic" style={{ color: colors.slate }}>Note: LLM usage costs are IHS financial responsibility (listed in exclusions). Procure AI connects to whichever option IHS selects.</p>
    <Footer />
  </div>
);

// Page 7: Human Oversight - ENHANCED
const Page7 = () => {
  const oversight = [
    { cat: "Vendor Scoring", catColor: colors.teal, ai: "AI scores and recommends vendors", human: "Procurement officer approves shortlist" },
    { cat: "Bid Evaluation", catColor: colors.blue, ai: "AI evaluates bids and ranks them", human: "Procurement officer approves award" },
    { cat: "Risk Monitoring", catColor: colors.orange, ai: "AI flags compliance risks automatically", human: "Compliance team decides action" },
    { cat: "Reverse Auction", catColor: colors.purple, ai: "AI calculates reserve price from data", human: "Finance team approves auction listing" },
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader number="03" title="Human Oversight in AI Decisions" subtitle="Every AI recommendation requires human approval before action" />
      
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="rounded-lg p-4 text-white text-center mb-4" 
        style={{ backgroundColor: colors.navy }}
      >
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-bold"
        >
          AI is advisory, not authoritative.
        </motion.p>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm"
        >
          No financial, contractual, or reputational commitment is made without human sign-off.
        </motion.p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3 mb-4">
        {oversight.map((item, i) => (
          <motion.div 
            key={i} 
            variants={staggerItem}
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 + 0.2 }}
            whileHover={{ x: 10, transition: { duration: 0.2 } }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className="px-3 py-1 rounded text-xs font-bold text-white" 
              style={{ backgroundColor: item.catColor }}
            >
              {item.cat}
            </motion.span>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="flex-1 rounded p-2 flex items-center gap-2" 
              style={{ backgroundColor: colors.lightBg }}
            >
              <Bot className="w-4 h-4" style={{ color: colors.slate }} />
              <span className="text-xs" style={{ color: colors.body }}>{item.ai}</span>
            </motion.div>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4" style={{ color: colors.teal }} />
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="flex-1 rounded p-2 flex items-center gap-2" 
              style={{ backgroundColor: `${colors.green}15` }}
            >
              <Users className="w-4 h-4" style={{ color: colors.green }} />
              <span className="text-xs" style={{ color: colors.body }}>{item.human}</span>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 + 0.5, type: "spring", stiffness: 300 }}
            >
              <Badge color={colors.green}>APPROVED</Badge>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-3 gap-4 p-4 rounded-lg mb-4" 
        style={{ backgroundColor: colors.navy }}
      >
        <StatBox value="100%" label="of financial decisions require human approval" />
        <StatBox value="Zero" label="autonomous AI actions on contracts or payments" />
        <StatBox value="Full Audit" label="trail on every AI recommendation + human decision" />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.01 }}
        className="rounded-lg p-3 text-sm text-white" 
        style={{ backgroundColor: colors.teal }}
      >
        Procure AI amplifies human judgment — it never replaces it. Every AI output includes confidence scores and reasoning so humans make informed decisions.
      </motion.div>
      <Footer />
    </div>
  );
};

// Page 8: Security & Compliance
const Page8 = () => {
  const cards = [
    { title: "Encryption", icon: Lock, color: colors.teal, items: ["In Transit: TLS 1.2+ on all API calls, webhooks, and user connections", "At Rest: AES-256 encryption on Azure SQL, Blob Storage, and Cosmos DB"] },
    { title: "Authentication & Access", icon: Shield, color: colors.navy, items: ["SSO via Azure AD / Entra ID", "OAuth 2.0 + OpenID Connect", "Role-based access control (RBAC)", "Multi-factor authentication supported", "Session management and timeout policies"] },
    { title: "Audit & Logging", icon: Eye, color: colors.green, items: ["Full audit trail on every user action", "API call logging with timestamps", "Integration with Azure Monitor and Log Analytics", "Tamper-proof audit records", "Exportable for compliance reporting"] },
    { title: "Penetration Testing", icon: AlertTriangle, color: colors.orange, items: ["Pre-launch pen test before Phase 1 go-live", "Vulnerability scanning in CI/CD pipeline", "OWASP Top 10 compliance", "Remediation SLAs for findings"] },
    { title: "Compliance Standards", icon: FileCheck, color: colors.blue, items: ["SOC 2 Type II (via Azure)", "ISO 27001 (via Azure)", "NDPR compliant (Nigeria)", "GDPR-aligned data handling", "Annual security review commitment"] },
    { title: "Network & Infrastructure", icon: Server, color: colors.purple, items: ["Azure VNet isolation", "Private endpoints for database access", "Azure WAF", "DDoS Protection Standard", "VPN access for dev team", "Network Security Groups (NSGs)"] },
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader number="04" title="Platform Security & Compliance" subtitle="Enterprise-grade security across every layer of Procure AI" />
      
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-3 gap-3 flex-1">
        {cards.map((card, i) => (
          <motion.div key={i} variants={staggerItem} className="rounded-lg overflow-hidden" style={{ borderLeft: `4px solid ${card.color}` }}>
            <div className="p-3 flex items-center gap-2" style={{ backgroundColor: colors.lightBg }}>
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
              <span className="font-bold text-xs" style={{ color: colors.navy }}>{card.title}</span>
            </div>
            <div className="p-3">
              <ul className="text-[10px] space-y-1" style={{ color: colors.body }}>
                {card.items.map((item, j) => <li key={j}>• {item}</li>)}
              </ul>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="rounded-lg p-3 mt-3" style={{ backgroundColor: colors.lightBg, borderLeft: `4px solid ${colors.teal}` }}>
        <p className="text-xs" style={{ color: colors.body }}>IHS InfoSec team is invited to review and validate all security controls during the Monday technical working session.</p>
      </div>
      <Footer />
    </div>
  );
};

// Page 9: Data Governance
const Page9 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader number="05" title="Data Governance & Boundaries" subtitle="How IHS data flows, where it lives, and who controls it" />
    
    <div className="grid grid-cols-2 gap-6 flex-1">
      <div>
        <h3 className="font-bold text-sm mb-3" style={{ color: colors.navy }}>DATA FLOW MODEL</h3>
        <div className="space-y-2">
          {[
            { name: "IHS D365", desc: "Vendor, PO, category, item data via OData API. Bidirectional.", dir: "↔" },
            { name: "IHS ServiceNow", desc: "Exception tickets via API. Read-only from Procure AI.", dir: "→" },
            { name: "Azure Data Lake", desc: "Historical data feeds AI models. Read-only, no write-back.", dir: "→" },
            { name: "External APIs", desc: "Outbound search queries only. No IHS data sent externally.", dir: "←" },
          ].map((flow, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded" style={{ backgroundColor: colors.lightBg }}>
              <Database className="w-5 h-5" style={{ color: colors.teal }} />
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: colors.navy }}>{flow.name}</p>
                <p className="text-[10px]" style={{ color: colors.body }}>{flow.desc}</p>
              </div>
              <span className="text-lg font-bold" style={{ color: colors.teal }}>{flow.dir}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-3" style={{ color: colors.navy }}>GOVERNANCE POLICIES</h3>
        <div className="space-y-2">
          {[
            { title: "Data Residency", desc: "All data in IHS-selected Azure region. Nothing leaves Azure." },
            { title: "Access Control", desc: "RBAC, least-privilege. IHS approves all grants. TN Macaulay access revoked at handover." },
            { title: "Data Retention", desc: "IHS defines policies. Automated purge. Full export any time." },
            { title: "Contract Exit", desc: "IHS owns all data and code. Full DB export within 30 days. TN Macaulay deletes all copies on exit." },
          ].map((policy, i) => (
            <div key={i} className="p-2 rounded" style={{ backgroundColor: colors.lightBg }}>
              <p className="text-xs font-bold" style={{ color: colors.navy }}>{policy.title}</p>
              <p className="text-[10px]" style={{ color: colors.body }}>{policy.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: `${colors.teal}15`, borderLeft: `4px solid ${colors.teal}` }}>
      <p className="text-xs font-bold" style={{ color: colors.teal }}>Key principle:</p>
      <p className="text-xs" style={{ color: colors.body }}>IHS data never leaves the Azure boundary. External API calls send only search queries, never IHS proprietary data.</p>
    </div>

    <div className="grid grid-cols-4 gap-2 mb-3 text-center">
      {[
        { label: "Confidential", items: "Vendor financials, pricing, bid data" },
        { label: "Internal", items: "Category structures, PO history" },
        { label: "Public", items: "Published tender notices" },
        { label: "Aligned to IHS policy", items: "" },
      ].map((cat, i) => (
        <div key={i} className="rounded p-2 text-[10px]" style={{ backgroundColor: colors.lightBg }}>
          <p className="font-bold" style={{ color: colors.navy }}>{cat.label}</p>
          {cat.items && <p style={{ color: colors.body }}>{cat.items}</p>}
        </div>
      ))}
    </div>

    <div className="rounded-lg p-3 text-white text-center text-sm" style={{ backgroundColor: colors.navy }}>
      <p className="font-bold">IHS owns everything. All code, all data, all IP.</p>
      <p className="text-xs">This is a build-and-transfer engagement, not a SaaS subscription. No vendor lock-in. Full source code handover at project completion.</p>
    </div>
    <Footer />
  </div>
);

// Page 10: Governance & Delivery
const Page10 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader number="06" title="Governance & Delivery Model" />
    
    <div className="space-y-2 mb-4">
      {[
        { tier: "Tier 1", forum: "Steering Committee", cadence: "Monthly", who: "Exec Sponsor, Project Director, IT Lead, Project Owner" },
        { tier: "Tier 2", forum: "Project Status Review", cadence: "Weekly", who: "PM, IT Lead, Business Analysts" },
        { tier: "Tier 3", forum: "Sprint Demo / Technical Review", cadence: "Bi-weekly / Weekly", who: "Full team + stakeholders / Architect + Devs" },
        { tier: "Tier 4", forum: "Change Mgmt & Training / Integration", cadence: "Ongoing", who: "IHS Project Owner + Champions / IT Lead" },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded" style={{ backgroundColor: i === 0 ? colors.teal : i === 1 ? colors.navy : i === 2 ? colors.navyLight : colors.slate, width: `${100 - i * 5}%` }}>
          <span className="text-[10px] font-bold text-white w-12">{row.tier}</span>
          <span className="text-xs font-bold text-white flex-1">{row.forum}</span>
          <span className="text-[10px] text-white">{row.cadence}</span>
          <span className="text-[10px] text-white opacity-80">{row.who}</span>
        </div>
      ))}
    </div>

    <p className="text-xs font-bold mb-2" style={{ color: colors.navy }}>RACI Matrix</p>
    <div className="overflow-auto mb-4 text-[10px]">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: colors.lightBg }}>
            <th className="text-left p-2 font-medium" style={{ color: colors.navy }}>Activity</th>
            <th className="text-center p-2 font-medium" style={{ color: colors.navy }}>TN Macaulay</th>
            <th className="text-center p-2 font-medium" style={{ color: colors.navy }}>IHS IT</th>
            <th className="text-center p-2 font-medium" style={{ color: colors.navy }}>IHS Procurement</th>
            <th className="text-center p-2 font-medium" style={{ color: colors.navy }}>Exec Sponsor</th>
          </tr>
        </thead>
        <tbody>
          {[
            { act: "Platform development", tn: "R/A", it: "C", proc: "I", exec: "I" },
            { act: "D365 / system integration", tn: "R", it: "A/C", proc: "C", exec: "I" },
            { act: "Data migration & bulk upload", tn: "R", it: "R", proc: "A", exec: "I" },
            { act: "UAT & go-live sign-off", tn: "R", it: "C", proc: "R", exec: "A" },
            { act: "Change management & training", tn: "C", it: "C", proc: "R/A", exec: "I" },
          ].map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
              <td className="p-2" style={{ color: colors.body }}>{row.act}</td>
              <td className="p-2 text-center font-bold" style={{ color: colors.teal }}>{row.tn}</td>
              <td className="p-2 text-center font-bold" style={{ color: colors.navy }}>{row.it}</td>
              <td className="p-2 text-center font-bold" style={{ color: colors.navy }}>{row.proc}</td>
              <td className="p-2 text-center font-bold" style={{ color: colors.navy }}>{row.exec}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-[10px] mb-4" style={{ color: colors.slate }}>R = Responsible | A = Accountable | C = Consulted | I = Informed</p>

    <div className="rounded-lg p-3 text-[10px] text-white" style={{ backgroundColor: colors.navy }}>
      <span className="font-bold">Key Dependencies: </span>
      D1: Azure env (Wk 1) | D2: D365 API creds (Wk 2) | D3: ServiceNow specs (Mo 2) | D4: Vendor master export (Mo 1) | D5: RFx templates (Mo 2) | D6: 3rd-party APIs (Mo 3) | D7: UAT env (Mo 3) | D8: Security review (Mo 4)
    </div>
    <Footer />
  </div>
);

// Page 11: Risk Register
const Page11 = () => {
  const risks = [
    { id: "R1", risk: "D365 integration complexity", l: "Med", i: "High", mit: "Early POC in Month 1, dedicated integration specialist", owner: "TN Mac" },
    { id: "R2", risk: "Delayed IHS environment access", l: "Med", i: "High", mit: "Parallel dev env, early dependency tracking", owner: "IHS IT" },
    { id: "R3", risk: "Scope creep from new requirements", l: "High", i: "Med", mit: "Formal change control, weekly scope reviews", owner: "Joint" },
    { id: "R4", risk: "Key resource unavailability", l: "Low", i: "High", mit: "Cross-training, documentation, backup resources", owner: "TN Mac" },
    { id: "R5", risk: "Data migration quality issues", l: "Med", i: "Med", mit: "Data profiling, validation scripts, cleansing", owner: "Joint" },
    { id: "R6", risk: "User adoption resistance", l: "Med", i: "Med", mit: "Early engagement, training, change champions", owner: "IHS" },
    { id: "R7", risk: "Third-party API changes", l: "Low", i: "Med", mit: "Abstraction layer, API versioning, monitoring", owner: "TN Mac" },
    { id: "R8", risk: "Security / compliance gaps", l: "Low", i: "High", mit: "Security review gates, compliance checklist, pen testing", owner: "Joint" },
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader number="07" title="Risk Register & Reporting Cadence" subtitle="Programme Risk Register" />
      
      <div className="overflow-auto mb-4 text-[10px]">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: colors.navy }}>
              <th className="text-left text-white p-2 font-medium">ID</th>
              <th className="text-left text-white p-2 font-medium">Risk</th>
              <th className="text-center text-white p-2 font-medium">L</th>
              <th className="text-center text-white p-2 font-medium">I</th>
              <th className="text-left text-white p-2 font-medium">Mitigation</th>
              <th className="text-left text-white p-2 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
                <td className="p-2 font-bold" style={{ color: colors.navy }}>{row.id}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.risk}</td>
                <td className="p-2 text-center"><RiskPill level={row.l} /></td>
                <td className="p-2 text-center"><RiskPill level={row.i} /></td>
                <td className="p-2" style={{ color: colors.body }}>{row.mit}</td>
                <td className="p-2 font-medium" style={{ color: colors.navy }}>{row.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs font-bold mb-2" style={{ color: colors.navy }}>Reporting Framework</p>
      <div className="overflow-auto mb-3 text-[10px]">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: colors.lightBg }}>
              <th className="text-left p-2 font-medium" style={{ color: colors.navy }}>Cadence</th>
              <th className="text-left p-2 font-medium" style={{ color: colors.navy }}>Forum</th>
              <th className="text-left p-2 font-medium" style={{ color: colors.navy }}>Content</th>
              <th className="text-left p-2 font-medium" style={{ color: colors.navy }}>Audience</th>
            </tr>
          </thead>
          <tbody>
            {[
              { cad: "Weekly", forum: "Sprint Review", content: "Velocity, blockers, demo of features", aud: "PM + IT Lead + BAs" },
              { cad: "Bi-weekly", forum: "Sprint Demo", content: "Feature walkthrough, stakeholder feedback", aud: "Full project team" },
              { cad: "Monthly", forum: "SteerCo Pack", content: "Strategic progress, decisions, risk escalations", aud: "Exec Sponsor + SteerCo" },
              { cad: "Phase Gate", forum: "Go/No-Go", content: "UAT results, readiness checklist, sign-off", aud: "Exec Sponsor (final)" },
            ].map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
                <td className="p-2 font-medium" style={{ color: colors.teal }}>{row.cad}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.forum}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.content}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.aud}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg p-2 text-[10px] text-white text-center" style={{ backgroundColor: colors.navy }}>
        <span className="font-bold">Escalation:</span> Workstream Lead (24hr) → PM (48hr) → SteerCo (72hr) → Exec Sponsor (exception)
      </div>
      <Footer />
    </div>
  );
};

// Page 12: Milestones
const Page12 = () => {
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  const deliverables = [
    { month: "1", items: "Kickoff, requirements validation, architecture design", gate: "Architecture Sign-off" },
    { month: "2", items: "Vendor Portal (9 interfaces), API foundation", gate: "Vendor Portal Alpha" },
    { month: "3", items: "Vendor Interface (6 pages), Due Diligence, Risk Monitor", gate: "Integration Testing" },
    { month: "4", items: "AI Bot, Reverse Auction Portal (8 pages), Phase 1 UAT", gate: "PHASE 1 GO-LIVE", major: true },
    { month: "5", items: "RFx Creation (4 pages), Source Vendor (5 pages)", gate: "RFx Module Alpha" },
    { month: "6", items: "Scope Validation (11 pages), D365 integration", gate: "Integration Complete" },
    { month: "7–9", items: "Review & Rank, BAFO, Automated Planning, Templates, Phase 2 UAT", gate: "PHASE 2 GO-LIVE", major: true },
    { month: "10–11", items: "Forecasting, Category Mgmt, Risk Register, Cost/TCO Reporting", gate: "Reporting Suite Live" },
    { month: "12–13", items: "Performance Mgmt, Exception Requests, Settings, Audit, Final UAT", gate: "PROJECT GO-LIVE", major: true },
  ];

  return (
    <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
      <SectionHeader number="08" title="Milestones & Execution Roadmap" subtitle="13-month delivery — February 2026 to February 2027" />
      
      <div className="mb-4">
        <div className="flex text-[9px] text-center mb-1">
          {months.map((m, i) => (
            <div key={i} className="flex-1" style={{ color: colors.slate }}>{m}</div>
          ))}
        </div>
        <div className="flex text-[8px] text-center mb-2">
          <div className="flex-1" style={{ gridColumn: "span 11", color: colors.slate }}>2026</div>
          <div className="flex-1" style={{ gridColumn: "span 2", color: colors.slate }}>2027</div>
        </div>
        <div className="relative h-16">
          <motion.div initial={{ width: 0 }} animate={{ width: "31%" }} transition={{ duration: 0.5 }} className="absolute top-0 left-0 h-4 rounded-full" style={{ backgroundColor: colors.teal }} />
          <motion.div initial={{ width: 0 }} animate={{ width: "38%" }} transition={{ duration: 0.5, delay: 0.2 }} className="absolute top-0 left-[31%] h-4 rounded-full" style={{ backgroundColor: colors.blue }} />
          <motion.div initial={{ width: 0 }} animate={{ width: "31%" }} transition={{ duration: 0.5, delay: 0.4 }} className="absolute top-0 left-[69%] h-4 rounded-full" style={{ backgroundColor: colors.navy }} />
          <div className="absolute top-6 left-0 w-full flex justify-between text-[8px] px-2">
            <span style={{ color: colors.teal }}>Phase 1: Foundation</span>
            <span style={{ color: colors.blue }}>Phase 2: RFx Workflows</span>
            <span style={{ color: colors.navy }}>Phase 3: Intelligence</span>
          </div>
          {/* Milestone diamonds */}
          <div className="absolute top-2 left-[30%] w-3 h-3 rotate-45" style={{ backgroundColor: colors.teal, border: '2px solid white' }} />
          <div className="absolute top-2 left-[69%] w-3 h-3 rotate-45" style={{ backgroundColor: colors.blue, border: '2px solid white' }} />
          <div className="absolute top-2 left-[98%] w-3 h-3 rotate-45" style={{ backgroundColor: colors.navy, border: '2px solid white' }} />
        </div>
      </div>

      <p className="text-xs font-bold mb-2" style={{ color: colors.navy }}>Detailed Monthly Deliverables</p>
      <div className="overflow-auto text-[10px]">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: colors.navy }}>
              <th className="text-left text-white p-2 font-medium w-16">Month</th>
              <th className="text-left text-white p-2 font-medium">Key Deliverables</th>
              <th className="text-left text-white p-2 font-medium">Milestone Gate</th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
                <td className="p-2 font-bold" style={{ color: colors.teal }}>{row.month}</td>
                <td className="p-2" style={{ color: colors.body }}>{row.items}</td>
                <td className="p-2">
                  {row.major ? <Badge color={colors.teal}>{row.gate}</Badge> : <span style={{ color: colors.slate }}>{row.gate}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
};

// Page 13: Resource Mobilisation
const Page13 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader number="09" title="Resource Mobilisation & Change Management" />
    
    <div className="flex items-center gap-2 mb-2">
      <p className="text-xs font-bold" style={{ color: colors.navy }}>TN Macaulay Delivery Team</p>
      <Badge color={colors.teal}>12,640 total hours across 13 months</Badge>
    </div>
    <div className="overflow-auto mb-4 text-[10px]">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: colors.teal }}>
            <th className="text-left text-white p-2 font-medium">Role</th>
            <th className="text-center text-white p-2 font-medium">Phase 1 (4 mo)</th>
            <th className="text-center text-white p-2 font-medium">Phase 2 (5 mo)</th>
            <th className="text-center text-white p-2 font-medium">Phase 3 (4 mo)</th>
            <th className="text-center text-white p-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {[
            { role: "Project Director", p1: "10 hrs/wk", p2: "10 hrs/wk", p3: "10 hrs/wk", total: "520 hrs" },
            { role: "Technical Project Manager", p1: "40 hrs/wk", p2: "40 hrs/wk", p3: "40 hrs/wk", total: "2,080 hrs" },
            { role: "Solution Architect", p1: "40 hrs/wk", p2: "20 hrs/wk", p3: "10 hrs/wk", total: "1,200 hrs" },
            { role: "Senior Full-Stack Devs (2)", p1: "40 hrs/wk ea", p2: "40 hrs/wk ea", p3: "40 hrs/wk ea", total: "4,160 hrs" },
            { role: "AI/ML Engineer", p1: "20 hrs/wk", p2: "30 hrs/wk", p3: "40 hrs/wk", total: "1,560 hrs" },
            { role: "QA Engineer", p1: "20 hrs/wk", p2: "40 hrs/wk", p3: "40 hrs/wk", total: "1,760 hrs" },
            { role: "DevOps Engineer", p1: "30 hrs/wk", p2: "20 hrs/wk", p3: "30 hrs/wk", total: "1,360 hrs" },
          ].map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
              <td className="p-2" style={{ color: colors.body }}>{row.role}</td>
              <td className="p-2 text-center" style={{ color: colors.body }}>{row.p1}</td>
              <td className="p-2 text-center" style={{ color: colors.body }}>{row.p2}</td>
              <td className="p-2 text-center" style={{ color: colors.body }}>{row.p3}</td>
              <td className="p-2 text-center font-bold" style={{ color: colors.teal }}>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="flex items-center gap-2 mb-2">
      <p className="text-xs font-bold" style={{ color: colors.navy }}>IHS Towers Resources Required</p>
      <Badge color={colors.navy}>3,380 total hours</Badge>
    </div>
    <div className="overflow-auto mb-4 text-[10px]">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: colors.navy }}>
            <th className="text-left text-white p-2 font-medium">Role</th>
            <th className="text-center text-white p-2 font-medium">Weekly Commitment</th>
            <th className="text-left text-white p-2 font-medium">Key Activities</th>
          </tr>
        </thead>
        <tbody>
          {[
            { role: "Executive Sponsor", hrs: "1 hr/week", act: "Steering committee, escalations, budget approval" },
            { role: "Project Owner (Procurement)", hrs: "8 hrs/week", act: "Requirements, UAT, business process decisions" },
            { role: "IT Lead", hrs: "8 hrs/week", act: "Technical review, integration support, security" },
            { role: "Business Analysts (2)", hrs: "20 hrs/week each", act: "Requirements docs, process mapping, testing" },
            { role: "SMEs + Change Champions", hrs: "4 hrs/week each", act: "Domain expertise, training coordination, feedback" },
          ].map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
              <td className="p-2" style={{ color: colors.body }}>{row.role}</td>
              <td className="p-2 text-center font-medium" style={{ color: colors.navy }}>{row.hrs}</td>
              <td className="p-2" style={{ color: colors.body }}>{row.act}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="rounded-lg p-3 flex items-center justify-between text-[10px] text-white" style={{ backgroundColor: colors.teal }}>
      <span><strong>Hypercare:</strong> 3 months (4-hr response)</span>
      <span><strong>Critical issues:</strong> 24/7</span>
      <span><strong>Knowledge transfer:</strong> Month 13</span>
      <span><strong>Optional maintenance:</strong> $3,000/month</span>
    </div>
    <Footer />
  </div>
);

// Page 14: Performance Framework
const Page14 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader number="10" title="Performance Framework" />
    
    <div className="grid grid-cols-2 gap-6 mb-4">
      <div>
        <p className="text-xs font-bold mb-2" style={{ color: colors.navy }}>PROGRAMME TIMELINE</p>
        <div className="space-y-2">
          {[
            { name: "Phase 1: Foundation & Core", period: "Feb–May 2026", color: colors.teal },
            { name: "Phase 2: RFx Workflows", period: "Jun–Oct 2026", color: colors.blue },
            { name: "Phase 3: Intelligence Suite", period: "Nov–Feb 2027", color: colors.navy },
          ].map((phase, i) => (
            <div key={i} className="rounded p-2 text-white text-xs" style={{ backgroundColor: phase.color }}>
              <span className="font-bold">{phase.name}</span> — {phase.period}
            </div>
          ))}
        </div>
        <div className="mt-3 text-center p-3 rounded" style={{ backgroundColor: colors.lightBg }}>
          <p className="text-3xl font-bold" style={{ fontFamily: "Georgia, serif", color: colors.teal }}>13 Months</p>
          <p className="text-xs" style={{ color: colors.slate }}>TOTAL DURATION</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-2" style={{ color: colors.navy }}>KPI FRAMEWORK</p>
        <div className="overflow-auto text-[10px]">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: colors.lightBg }}>
                <th className="text-left p-2 font-medium" style={{ color: colors.navy }}>KPI</th>
                <th className="text-center p-2 font-medium" style={{ color: colors.red }}>Baseline</th>
                <th className="text-center p-2 font-medium" style={{ color: colors.teal }}>Target</th>
              </tr>
            </thead>
            <tbody>
              {[
                { kpi: "Procurement cycle time", base: "45 days", target: "15 days" },
                { kpi: "Vendor onboarding duration", base: "3–4 weeks", target: "3–5 days" },
                { kpi: "Spend visibility coverage", base: "~40%", target: ">85%" },
                { kpi: "Cost savings (Year 1)", base: "Baseline", target: "10–15% YoY" },
                { kpi: "Process automation rate", base: "<10%", target: "80%+" },
              ].map((row, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
                  <td className="p-2" style={{ color: colors.body }}>{row.kpi}</td>
                  <td className="p-2 text-center" style={{ color: colors.slate }}>{row.base}</td>
                  <td className="p-2 text-center font-bold" style={{ color: colors.teal }}>{row.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <p className="text-xs font-bold mb-2" style={{ color: colors.navy }}>COMPETITIVE CONTEXT</p>
    <div className="overflow-auto text-[10px]">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: colors.navy }}>
            <th className="text-left text-white p-2 font-medium">Capability</th>
            <th className="text-center p-2 font-medium" style={{ backgroundColor: colors.teal, color: colors.white }}>Procure AI</th>
            <th className="text-center text-white p-2 font-medium">SAP Ariba</th>
            <th className="text-center text-white p-2 font-medium">Oracle</th>
            <th className="text-center text-white p-2 font-medium">In-House Build</th>
          </tr>
        </thead>
        <tbody>
          {[
            { cap: "AI/ML capabilities", pa: "5+ AI engines ✓", ariba: "Basic analytics", oracle: "Basic analytics", inhouse: "None" },
            { cap: "D365 integration depth", pa: "Deep, proven ✓", ariba: "Available", oracle: "Available", inhouse: "Custom build" },
            { cap: "Source code ownership", pa: "Full to IHS ✓", ariba: "No (SaaS)", oracle: "No (SaaS)", inhouse: "Yes" },
            { cap: "Time to deployment", pa: "13 months", ariba: "6-12 months", oracle: "6-12 months", inhouse: "18+ months" },
            { cap: "Customization flexibility", pa: "Unlimited ✓", ariba: "Limited", oracle: "Limited", inhouse: "Unlimited" },
          ].map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? colors.white : colors.lightBg }}>
              <td className="p-2" style={{ color: colors.body }}>{row.cap}</td>
              <td className="p-2 text-center font-bold" style={{ backgroundColor: `${colors.teal}15`, color: colors.teal }}>{row.pa}</td>
              <td className="p-2 text-center" style={{ color: colors.slate }}>{row.ariba}</td>
              <td className="p-2 text-center" style={{ color: colors.slate }}>{row.oracle}</td>
              <td className="p-2 text-center" style={{ color: colors.slate }}>{row.inhouse}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Footer />
  </div>
);

// Page 15: Decision Points - ENHANCED WITH DRAMATIC ANIMATIONS
const Page15 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader number="11" title="Decision Points" subtitle="Three decisions required to proceed with 1 March 2026 mobilisation" />
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex-1 space-y-4">
      {[
        { num: "01", title: "Confirm Programme Start & Milestone 1 Payment", badge: "GO / NO-GO", badgeColor: colors.green, desc: "Approve mobilisation and authorise Payment 1. Team begins with Azure provisioning, D365 integration, and architecture design in Month 1.", accent: colors.teal },
        { num: "02", title: "Approve Governance Model & Team Allocation", badge: "APPROVE", badgeColor: colors.blue, desc: "Endorse SteerCo composition, reporting cadence, RACI matrix, and escalation protocol. Confirm IHS project team roles (Project Owner, IT Lead, 2 BAs, SMEs, Change Champions).", accent: colors.navy },
        { num: "03", title: "IT to Provision Infrastructure Access", badge: "APPROVE", badgeColor: colors.blue, desc: "Direct IHS IT to provision: Azure subscription (Week 1), D365 API credentials (Week 2), VPN access for dev team (Week 1), and ServiceNow specs (Month 2).", accent: colors.navy },
      ].map((item, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          initial={{ opacity: 0, x: -80, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: i * 0.15, duration: 0.5, type: "spring", stiffness: 100 }}
          whileHover={{ 
            scale: 1.02, 
            x: 10,
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            transition: { duration: 0.2 } 
          }}
          className="rounded-lg p-5 cursor-pointer" 
          style={{ borderLeft: `6px solid ${item.accent}`, backgroundColor: colors.lightBg }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <motion.span 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.15 + 0.2, type: "spring", stiffness: 200 }}
                className="text-3xl font-bold" 
                style={{ fontFamily: "Georgia, serif", color: colors.teal }}
              >
                {item.num}
              </motion.span>
              <h3 className="text-lg font-bold" style={{ color: colors.navy }}>{item.title}</h3>
            </div>
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.15 + 0.3, type: "spring", stiffness: 300 }}
              whileHover={{ scale: 1.1 }}
              className="px-4 py-2 rounded text-sm font-bold text-white" 
              style={{ backgroundColor: item.badgeColor }}
            >
              {item.badge}
            </motion.span>
          </div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.15 + 0.4 }}
            className="text-sm ml-12" 
            style={{ color: colors.body }}
          >
            {item.desc}
          </motion.p>
        </motion.div>
      ))}
    </motion.div>
    <Footer />
  </div>
);

// Page 16: Core Workflows
const Page16 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader title="Core Procurement Workflows" subtitle="Three end-to-end processes Procure AI automates for IHS" />
    
    {/* Flow 1: RFQ */}
    <div className="mb-4">
      <div className="flex items-center justify-between rounded-t-lg p-2 text-white text-xs" style={{ backgroundColor: colors.navy }}>
        <span className="font-bold">RFQ / TENDER CREATION</span>
        <span>10 steps | Phases 1 & 2</span>
      </div>
      <div className="flex gap-1 p-2 rounded-b-lg overflow-x-auto" style={{ backgroundColor: colors.lightBg }}>
        {["Request", "Validate", "Budget Check", "AI Vendor Discovery", "Generate RFQ", "Vendor Bids", "AI Bid Scoring", "BAFO", "Award", "Contract"].map((step, i) => {
          const stepColors = [colors.teal, colors.teal, colors.orange, colors.navy, colors.navy, colors.blue, colors.navy, colors.orange, colors.green, colors.green];
          return (
            <div key={i} className="flex items-center">
              <div className="rounded px-2 py-1 text-[9px] font-medium text-white whitespace-nowrap" style={{ backgroundColor: stepColors[i] }}>{step}</div>
              {i < 9 && <span className="mx-1 text-xs" style={{ color: colors.slate }}>→</span>}
            </div>
          );
        })}
      </div>
    </div>

    {/* Flow 2: Vendor Registration */}
    <div className="mb-4">
      <div className="flex items-center justify-between rounded-t-lg p-2 text-white text-xs" style={{ backgroundColor: colors.teal }}>
        <span className="font-bold">VENDOR REGISTRATION & ONBOARDING</span>
        <span>11 steps | Phase 1</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-2 rounded-b-lg" style={{ backgroundColor: colors.lightBg }}>
        <div>
          <p className="text-[10px] font-bold mb-1 text-center" style={{ backgroundColor: colors.blue, color: colors.white, padding: '2px' }}>VENDOR (Self-Service)</p>
          <div className="space-y-1">
            {["Register", "Upload Docs", "Due Diligence", "Accept T&Cs"].map((s, i) => (
              <div key={i} className="rounded p-1 text-[9px] text-center" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>{s}</div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold mb-1 text-center" style={{ backgroundColor: colors.teal, color: colors.white, padding: '2px' }}>PROCURE AI (Automated)</p>
          <div className="space-y-1">
            {["AI Profile Enrich", "Doc Verify", "Risk Screen", "Score & Classify"].map((s, i) => (
              <div key={i} className="rounded p-1 text-[9px] text-center" style={{ backgroundColor: `${colors.teal}15`, color: colors.teal }}>{s}</div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold mb-1 text-center" style={{ backgroundColor: colors.navy, color: colors.white, padding: '2px' }}>IHS PROCUREMENT (Approval)</p>
          <div className="space-y-1">
            {["Review & Approve", "Category Assign", "D365 Sync"].map((s, i) => (
              <div key={i} className="rounded p-1 text-[9px] text-center" style={{ backgroundColor: `${colors.navy}15`, color: colors.navy }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Flow 3: Reverse Auction */}
    <div className="mb-4">
      <div className="flex items-center justify-between rounded-t-lg p-2 text-white text-xs" style={{ backgroundColor: colors.orange }}>
        <span className="font-bold">REVERSE AUCTION (ASSET DISPOSAL)</span>
        <span>6 steps | Phase 1</span>
      </div>
      <div className="grid grid-cols-6 gap-1 p-2 rounded-b-lg" style={{ backgroundColor: colors.lightBg }}>
        {[
          { step: "Asset Listed", desc: "Finance validates asset for sale", color: colors.orange },
          { step: "Vendor Invitation", desc: "Pre-qualified buyers notified", color: colors.blue },
          { step: "Inspection Period", desc: "Onsite or photo inspection", color: colors.teal },
          { step: "Live Bidding", desc: "Real-time bids with AI floor price", color: colors.navy },
          { step: "Winner Determined", desc: "Highest bid vs reserve price", color: colors.navy },
          { step: "Payment & Collection", desc: "Invoice generated, asset handover", color: colors.green },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="rounded p-1.5 text-[9px] font-medium text-white mb-1" style={{ backgroundColor: item.color }}>{item.step}</div>
            <p className="text-[8px]" style={{ color: colors.slate }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-lg p-3 flex items-center justify-center gap-8 text-xs" style={{ backgroundColor: colors.lightBg, borderLeft: `4px solid ${colors.teal}` }}>
      <span><Users className="w-4 h-4 inline mr-1" style={{ color: colors.teal }} />Human approval at every critical gate</span>
      <span><Bot className="w-4 h-4 inline mr-1" style={{ color: colors.teal }} />AI handles scoring, discovery & monitoring</span>
      <span><BarChart3 className="w-4 h-4 inline mr-1" style={{ color: colors.teal }} />Full audit trail on every transaction</span>
    </div>
    <Footer />
  </div>
);

// Page 17: Appendix - ENHANCED
const Page17 = () => (
  <div className="h-full flex flex-col p-8 pb-12" style={{ backgroundColor: colors.white }}>
    <SectionHeader title="Appendix: TN Macaulay Credentials" subtitle="Pioneering enterprise AI in Nigeria since 2016" />
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-4 mb-6">
      {[
        { year: "2016", title: "Meristem Investment Bank", desc: "One of Nigeria's earliest enterprise AI chatbots. NLP-powered investment advisory processing thousands of queries daily." },
        { year: "2017–2019", title: "Vodafone Procurement Platform", desc: "Three-in-one: internal procurement + vendor enablement + reverse auctions. D365 integration. 200+ vendors, ₦2B+ annually." },
        { year: "2018", title: "Enterprise Financial Wallet", desc: "Multi-tenant platform for P&G, Vodafone, Dangote, Oando. D365 reconciliation. 50,000+ users across tenants." },
        { year: "2018–Present", title: "Multi-Tenant AI Platform", desc: "15+ enterprises on shared infra. Kubernetes-based isolation. 50K+ monthly transactions. HR, CX, and operations." },
      ].map((cred, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 150 }}
          whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", transition: { duration: 0.2 } }}
          className="rounded-lg overflow-hidden shadow-sm cursor-pointer" 
          style={{ border: `1px solid ${colors.lightBg}` }}
        >
          <div className="p-3 flex items-center justify-between" style={{ backgroundColor: colors.navy }}>
            <span className="text-white font-bold text-sm">{cred.title}</span>
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 + 0.3, type: "spring" }}
              className="px-2 py-0.5 rounded text-[10px] font-medium text-white" 
              style={{ backgroundColor: colors.teal }}
            >
              {cred.year}
            </motion.span>
          </div>
          <div className="p-3">
            <p className="text-xs" style={{ color: colors.body }}>{cred.desc}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>

    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex justify-center gap-8"
    >
      {[
        { value: "8+", label: "Years D365/Azure" },
        { value: "15+", label: "Enterprise tenants" },
        { value: "5", label: "D365 integrations" },
        { value: "50K+", label: "Monthly txns" },
        { value: "12", label: "Azure apps live" },
      ].map((stat, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, scale: 0, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
          className="text-center cursor-pointer"
        >
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            className="text-4xl font-bold" 
            style={{ fontFamily: "Georgia, serif", color: colors.teal }}
          >
            {stat.value}
          </motion.div>
          <div className="text-[10px] mt-1" style={{ color: colors.slate }}>{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
    <Footer />
  </div>
);

// ============ MAIN COMPONENT ============

const ProcureAIGCIOPack = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const totalPages = 17;

  const pages = [Page1, Page2, Page3, Page4, Page5, Page6, Page7, Page8, Page9, Page10, Page11, Page12, Page13, Page14, Page15, Page16, Page17];
  const CurrentPageComponent = pages[currentPage - 1];

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextPage(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevPage(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage]);

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Calibri, sans-serif", backgroundColor: colors.white }}>
      {/* Top Bar */}
      {currentPage > 1 && (
        <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-6 z-50" style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.lightBg}` }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs hover:opacity-70 transition-opacity" style={{ color: colors.slate }}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-xs font-medium" style={{ color: colors.slate }}>{currentPage} / {totalPages}</span>
          <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-opacity" style={{ border: `1px solid ${colors.teal}`, color: colors.teal }}>
            <Download className="w-3 h-3" />
            Download PDF
          </button>
        </div>
      )}

      {/* Page Content */}
      <div className={`absolute inset-0 ${currentPage > 1 ? 'pt-10' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={currentPage} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
            <CurrentPageComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows - ENHANCED */}
      {currentPage > 1 && (
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.15, x: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={prevPage} 
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-40 bg-white/90 backdrop-blur-sm shadow-lg" 
          style={{ border: `2px solid ${colors.teal}` }}
        >
          <ChevronLeft className="w-6 h-6" style={{ color: colors.teal }} />
        </motion.button>
      )}
      {currentPage < totalPages && (
        <motion.button 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.15, x: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={nextPage} 
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-40 shadow-lg text-white" 
          style={{ backgroundColor: colors.teal }}
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      )}

      {/* Pagination Dots - ENHANCED */}
      {currentPage > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-40">
          {Array.from({ length: totalPages }, (_, i) => (
            <motion.button 
              key={i} 
              onClick={() => goToPage(i + 1)} 
              whileHover={{ scale: 1.5 }}
              whileTap={{ scale: 0.8 }}
              animate={{ 
                scale: currentPage === i + 1 ? 1.3 : 1,
                backgroundColor: currentPage === i + 1 ? colors.teal : colors.slate + '40'
              }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-2 h-2 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcureAIGCIOPack;
