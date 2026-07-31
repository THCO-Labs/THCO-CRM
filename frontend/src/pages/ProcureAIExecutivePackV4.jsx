import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Maximize, Minimize } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Design System Colors
const colors = {
  navy: '#1E2761',
  teal: '#0D9488',
  white: '#FFFFFF',
  lightGrey: '#F8FAFC',
  iceBlue: '#CADCFC',
  slate: '#64748B',
  dark: '#0F172A',
  green: '#059669',
  blue: '#2563EB',
  orange: '#EA580C',
  red: '#DC2626',
};

// Slide Components
const TitleSlide = () => (
  <div className="w-full h-full flex flex-col justify-center items-center relative" style={{ backgroundColor: colors.navy }}>
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center px-8"
    >
      <h1 
        className="text-5xl md:text-6xl font-bold mb-4" 
        style={{ fontFamily: 'Georgia, serif', color: colors.white }}
      >
        Procure AI
      </h1>
      <p className="text-xl md:text-2xl mb-6" style={{ color: colors.iceBlue }}>
        Procurement Transformation Programme
      </p>
      <motion.div 
        className="mx-auto mb-6" 
        style={{ width: 180, height: 3, backgroundColor: colors.teal }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      />
      <p className="text-lg font-semibold mb-2" style={{ color: colors.white }}>
        Executive Kick-Off Pack
      </p>
      <p className="text-sm mb-2" style={{ color: colors.slate }}>
        Strategic Validation Session with Group CIO
      </p>
      <p className="text-sm" style={{ color: '#9CA3AF' }}>
        23 February 2026
      </p>
    </motion.div>
    
    {/* Footer */}
    <div className="absolute bottom-0 left-0 right-0 py-4 px-8 flex justify-between items-center" style={{ backgroundColor: '#151D4A' }}>
      <span className="text-sm" style={{ color: '#9CA3AF' }}>
        IHS Towers Nigeria | TN Macaulay | Future Africa
      </span>
      <span className="text-sm tracking-widest" style={{ color: colors.teal }}>
        CONFIDENTIAL
      </span>
    </div>
  </div>
);

const AgendaSlide = () => {
  const agendaItems = [
    { num: '01', title: 'Strategic Framing', time: '15–20 min', desc: 'Objectives, transformation thesis, phased capability model' },
    { num: '02', title: 'Scope Confirmation', time: '20 min', desc: 'Interfaces, data governance, assumptions, exclusions' },
    { num: '03', title: 'Target Architecture', time: '20–25 min', desc: 'Solution design, integrations, cybersecurity, scalability' },
    { num: '04', title: 'Governance & Delivery Model', time: '20–25 min', desc: 'SteerCo, PMO, RACI, reporting, risk management' },
    { num: '05', title: 'Milestones & Execution Roadmap', time: '20–25 min', desc: '13-month timeline, critical path, resources, change mgmt' },
    { num: '06', title: 'Commercial & Performance', time: '10–15 min', desc: 'Budget phasing, payment milestones, KPIs, exclusions' },
    { num: '07', title: 'Decision Points', time: '10–15 min', desc: 'Go/no-go for 1 March, governance approval, IT access' },
  ];

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-12">
        <motion.h2 
          className="text-3xl font-bold mb-2" 
          style={{ fontFamily: 'Georgia, serif', color: colors.dark }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Session Agenda
        </motion.h2>
        <p className="text-base mb-8" style={{ color: colors.slate }}>
          1.5–2 hour strategic validation — structured for executive decision
        </p>
      </div>
      
      <div className="flex-1 px-20 pb-8 overflow-hidden">
        <div className="space-y-1">
          {agendaItems.map((item, index) => (
            <motion.div
              key={item.num}
              className="flex items-center py-4 px-6 rounded-lg"
              style={{ 
                backgroundColor: index % 2 === 0 ? colors.white : 'transparent',
                boxShadow: index % 2 === 0 ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
              }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <span 
                className="text-xl font-bold w-12" 
                style={{ fontFamily: 'Georgia, serif', color: colors.teal }}
              >
                {item.num}
              </span>
              <span 
                className="text-base font-semibold w-64" 
                style={{ color: colors.navy }}
              >
                {item.title}
              </span>
              <span 
                className="text-sm font-bold w-24 text-center" 
                style={{ color: colors.teal }}
              >
                {item.time}
              </span>
              <span className="text-sm flex-1" style={{ color: colors.slate }}>
                {item.desc}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StrategicFramingSlide = () => {
  const currentState = [
    'Manual Excel-based procurement across all categories',
    '45-day average purchase cycle from request to PO',
    'Limited to established local vendor networks',
    'No real-time spend visibility or analytics',
    'Manual vendor due diligence and compliance tracking',
    'No structured asset recovery or disposal process',
  ];

  const futureState = [
    'AI-powered end-to-end procurement automation',
    '15-day procurement cycles (67% reduction)',
    'Global vendor discovery (Alibaba, D&B, Global Sources)',
    'Real-time dashboards, spend analytics, forecasting',
    'Automated compliance scoring and risk monitoring',
    'Competitive reverse auctions for asset disposal',
  ];

  const phases = [
    { color: colors.blue, label: 'Phase 1', name: 'Foundation & Core', desc: 'Vendor Portal, Due Diligence, Risk Monitor, AI Bot, Reverse Auction', time: 'Feb–May 2026 (4 mo)', cost: '$47,500' },
    { color: colors.teal, label: 'Phase 2', name: 'RFx Workflows', desc: 'RFx Creation, Vendor Sourcing, Scope Validation, BAFO, Templates', time: 'Jun–Oct 2026 (5 mo)', cost: '$60,000' },
    { color: colors.green, label: 'Phase 3', name: 'Intelligence', desc: 'Forecasting, Category Mgmt, TCO Reporting, Audit, Settings', time: 'Nov 2026–Feb 2027 (4 mo)', cost: '$60,000' },
  ];

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-8">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>01</span>
        <motion.h2 
          className="text-3xl font-bold mb-1" 
          style={{ fontFamily: 'Georgia, serif', color: colors.dark }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Strategic Framing
        </motion.h2>
        <p className="text-sm mb-4" style={{ color: colors.slate }}>
          Programme objectives and transformation thesis
        </p>
      </div>
      
      {/* Current vs Future State */}
      <div className="px-20 mb-4">
        <div className="flex gap-4 items-stretch">
          <motion.div 
            className="flex-1 rounded-lg overflow-hidden"
            style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="py-2 px-4" style={{ backgroundColor: colors.red }}>
              <span className="text-sm font-bold text-white">CURRENT STATE</span>
            </div>
            <ul className="p-4 space-y-2">
              {currentState.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: colors.slate }}>
                  <span className="mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.teal }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex-1 rounded-lg overflow-hidden"
            style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="py-2 px-4" style={{ backgroundColor: colors.green }}>
              <span className="text-sm font-bold text-white">FUTURE STATE (PROCURE AI)</span>
            </div>
            <ul className="p-4 space-y-2">
              {futureState.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: colors.slate }}>
                  <span className="mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="px-20 pb-6">
        <div className="flex gap-3">
          {phases.map((phase, index) => (
            <motion.div 
              key={phase.label}
              className="flex-1 rounded-lg p-4 text-white"
              style={{ backgroundColor: phase.color }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.15 }}
            >
              <div className="text-xs font-bold mb-1 opacity-80">{phase.label}</div>
              <div className="text-base font-bold mb-2">{phase.name}</div>
              <div className="text-xs mb-3 opacity-90 leading-relaxed">{phase.desc}</div>
              <div className="text-xs italic opacity-80 mb-2">{phase.time}</div>
              <div className="text-xl font-bold">{phase.cost}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ScopeConfirmationSlide = () => {
  const scopeData = [
    { phase: 'Phase 1', phaseColor: colors.blue, module: 'Vendor Portal + Interface', pages: '15', ai: 'Agentic AI, Decision Engine', external: 'D&B, NAVEX, Docusign' },
    { phase: '', module: 'Due Diligence & Risk Monitor', pages: '7', ai: 'Decision Engine', external: 'D&B, NAVEX' },
    { phase: '', module: 'AI Overview Bot', pages: '1', ai: 'LLM', external: '—' },
    { phase: '', module: 'Reverse Auction Portal', pages: '8', ai: 'Analytics + Decision Engine', external: '—' },
    { phase: 'Phase 2', phaseColor: colors.teal, module: 'RFx Creation + Source Vendor', pages: '9', ai: 'Agentic AI, Decision Engine', external: 'Alibaba, Global Sources' },
    { phase: '', module: 'Scope Validation + Review & Rank', pages: '16', ai: 'Analytics + Decision Engine', external: '—' },
    { phase: '', module: 'BAFO Rank & Award + Templates', pages: '20+', ai: 'Analytics + Decision Engine', external: '—' },
    { phase: 'Phase 3', phaseColor: colors.green, module: 'Forecasting + Category Mgmt', pages: '11', ai: 'Agentic AI, Forecasting Engine', external: 'Redcube, D365' },
    { phase: '', module: 'Cost/TCO + Risk Register Reporting', pages: '14', ai: 'Forecasting + Decision Engine', external: 'D365' },
    { phase: '', module: 'Settings + Exception + Audit + Perf Mgmt', pages: '19', ai: '—', external: '—' },
  ];

  const assumptions = [
    'IHS provides timely access to systems & environments',
    'LLM usage, hosting, and 3rd-party licences are IHS cost',
    'Scoping worksheet requirements are complete and final',
    'D365 environment supports required API integrations',
    'Change requests managed via formal CR process',
  ];

  const exclusions = [
    'LLM API usage costs (Azure OpenAI or equivalent)',
    'Cloud hosting and infrastructure costs (Azure)',
    'Third-party service licences (D&B, NAVEX, Docusign)',
    'Microsoft Dynamics 365 licensing',
    'D365 core ERP modifications, legacy decommissioning',
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-6">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>02</span>
        <motion.h2 
          className="text-2xl font-bold" 
          style={{ fontFamily: 'Georgia, serif', color: colors.dark }}
        >
          Scope Confirmation & Boundaries
        </motion.h2>
      </div>
      
      {/* Scope Table */}
      <div className="px-20 py-3 flex-1 overflow-hidden">
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.navy }}>
                <th className="py-2 px-3 text-left text-white font-semibold">Phase</th>
                <th className="py-2 px-3 text-left text-white font-semibold">Module</th>
                <th className="py-2 px-3 text-center text-white font-semibold">Pages</th>
                <th className="py-2 px-3 text-left text-white font-semibold">AI Components</th>
                <th className="py-2 px-3 text-left text-white font-semibold">External Integration</th>
              </tr>
            </thead>
            <tbody>
              {scopeData.map((row, i) => (
                <motion.tr 
                  key={i}
                  className="border-b border-gray-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td className="py-1.5 px-3 font-bold" style={{ color: row.phaseColor || colors.slate }}>{row.phase}</td>
                  <td className="py-1.5 px-3" style={{ color: colors.dark }}>{row.module}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: colors.slate }}>{row.pages}</td>
                  <td className="py-1.5 px-3" style={{ color: colors.slate }}>{row.ai}</td>
                  <td className="py-1.5 px-3" style={{ color: colors.slate }}>{row.external}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions & Exclusions */}
      <div className="px-20 pb-4">
        <div className="flex gap-4">
          <motion.div 
            className="flex-1 rounded-lg overflow-hidden"
            style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="py-1.5 px-3" style={{ backgroundColor: colors.orange }}>
              <span className="text-xs font-bold text-white">KEY ASSUMPTIONS (CIO VALIDATION)</span>
            </div>
            <ul className="p-3 space-y-1">
              {assumptions.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: colors.slate }}>
                  <span>•</span><span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className="flex-1 rounded-lg overflow-hidden"
            style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="py-1.5 px-3" style={{ backgroundColor: colors.red }}>
              <span className="text-xs font-bold text-white">EXCLUSIONS (IHS RESPONSIBILITY)</span>
            </div>
            <ul className="p-3 space-y-1">
              {exclusions.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: colors.slate }}>
                  <span>•</span><span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const TargetArchitectureSlide = () => {
  const ihsSystems = ['D365 Finance & Ops', 'ServiceNow', 'Azure Data Lake', 'Azure OpenAI', 'Azure AD / Entra ID'];
  const procureServices = [
    { name: 'Procurement Service', color: colors.blue },
    { name: 'Vendor Service', color: colors.green },
    { name: 'AI/ML Service', color: colors.navy },
    { name: 'Analytics Service', color: colors.teal },
    { name: 'Auction Service', color: colors.orange },
    { name: 'Contract Service', color: colors.slate },
  ];

  const infraRequirements = [
    { category: 'Cloud', req: 'Azure Subscription (compute, storage, networking)', env: 'Dev, Staging, Prod', by: 'Week 1' },
    { category: 'Database', req: 'Azure SQL or PostgreSQL', env: 'Dev, Staging, Prod', by: 'Week 1' },
    { category: 'AI/LLM', req: 'Azure OpenAI Service (GPT-4 access)', env: 'All environments', by: 'Month 2' },
    { category: 'Integration', req: 'D365 API credentials + ServiceNow API', env: 'All environments', by: 'Week 2' },
    { category: 'Third-Party', req: 'D&B, NAVEX, Docusign APIs', env: 'Staging, Prod', by: 'Month 3' },
    { category: 'Security', req: 'VPN access for dev team + CI/CD pipeline tools', env: 'All environments', by: 'Week 1' },
  ];

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-6">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>03</span>
        <motion.h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.dark }}>
          Target Architecture & Technical Design
        </motion.h2>
        <p className="text-sm" style={{ color: colors.slate }}>Azure-native microservices with D365 deep integration</p>
      </div>

      {/* Architecture Diagram */}
      <div className="px-20 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* IHS Systems */}
          <motion.div 
            className="flex-1 rounded-lg p-4"
            style={{ backgroundColor: colors.navy }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-xs font-bold text-white mb-3">IHS SYSTEMS</div>
            <div className="space-y-2">
              {ihsSystems.map((sys, i) => (
                <div key={i} className="py-1.5 px-3 rounded text-xs text-center" style={{ backgroundColor: colors.iceBlue, color: colors.dark }}>
                  {sys}
                </div>
              ))}
            </div>
          </motion.div>

          {/* API Hub */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="py-2 px-4 rounded-full text-xs font-bold text-white" style={{ backgroundColor: colors.teal }}>
              API Hub
            </div>
            <div className="flex justify-center my-1">
              <span style={{ color: colors.teal }}>↔</span>
            </div>
          </motion.div>

          {/* Procure AI Platform */}
          <motion.div 
            className="flex-1 rounded-lg p-4 border-2"
            style={{ backgroundColor: colors.white, borderColor: colors.teal }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-xs font-bold mb-3" style={{ color: colors.teal }}>PROCURE AI PLATFORM (AZURE)</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {procureServices.map((svc, i) => (
                <div key={i} className="py-1.5 px-2 rounded text-xs text-center text-white" style={{ backgroundColor: svc.color }}>
                  {svc.name}
                </div>
              ))}
            </div>
            <div className="py-1.5 px-2 rounded text-xs text-center" style={{ backgroundColor: colors.iceBlue, color: colors.dark }}>
              Azure SQL | Cosmos DB | Redis | Blob Storage | Cognitive Search
            </div>
          </motion.div>
        </div>

        {/* External */}
        <motion.div 
          className="mt-3 py-2 px-4 rounded text-xs text-center"
          style={{ backgroundColor: colors.orange, color: colors.white }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          External: Alibaba | Global Sources | D&B | NAVEX | Docusign
        </motion.div>
      </div>

      {/* Infrastructure Table */}
      <div className="px-20 pb-4 flex-1">
        <div className="text-xs font-bold mb-2" style={{ color: colors.dark }}>IHS Infrastructure Requirements</div>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.navy }}>
                <th className="py-1.5 px-3 text-left text-white">Category</th>
                <th className="py-1.5 px-3 text-left text-white">Requirement</th>
                <th className="py-1.5 px-3 text-left text-white">Environment</th>
                <th className="py-1.5 px-3 text-left text-white">Required By</th>
              </tr>
            </thead>
            <tbody>
              {infraRequirements.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 px-3 font-semibold" style={{ color: colors.teal }}>{row.category}</td>
                  <td className="py-1.5 px-3" style={{ color: colors.dark }}>{row.req}</td>
                  <td className="py-1.5 px-3" style={{ color: colors.slate }}>{row.env}</td>
                  <td className="py-1.5 px-3 font-semibold" style={{ color: colors.blue }}>{row.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const GovernanceSlide = () => {
  const raciData = [
    { activity: 'Platform development', tn: 'R/A', ihs_it: 'C', ihs_proc: 'I', exec: 'I' },
    { activity: 'D365 / system integration', tn: 'R', ihs_it: 'A/C', ihs_proc: 'C', exec: 'I' },
    { activity: 'Data migration & bulk upload', tn: 'R', ihs_it: 'R', ihs_proc: 'A', exec: 'I' },
    { activity: 'UAT & go-live sign-off', tn: 'R', ihs_it: 'C', ihs_proc: 'R', exec: 'A' },
    { activity: 'Change management & training', tn: 'C', ihs_it: 'C', ihs_proc: 'R/A', exec: 'I' },
  ];

  const dependencies = 'D1: Azure env (Wk 1) | D2: D365 API creds (Wk 2) | D3: ServiceNow specs (Mo 2) | D4: Vendor master export (Mo 1) | D5: RFx templates (Mo 2) | D6: 3rd-party APIs (Mo 3) | D7: UAT env (Mo 3) | D8: Security review (Mo 4)';

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-6">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>04</span>
        <motion.h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.dark }}>
          Governance & Delivery Model
        </motion.h2>
      </div>

      {/* Hierarchy */}
      <div className="px-20 py-4">
        <div className="flex flex-col items-center gap-2">
          <motion.div 
            className="w-full py-2 px-4 rounded-lg text-center text-white text-xs font-bold"
            style={{ backgroundColor: colors.navy }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            STEERING COMMITTEE (Monthly) — Exec Sponsor, Project Director, IT Lead, Project Owner
          </motion.div>
          <div className="text-lg" style={{ color: colors.teal }}>↓</div>
          <motion.div 
            className="w-full py-2 px-4 rounded-lg text-center text-white text-xs font-bold"
            style={{ backgroundColor: colors.teal }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            PROJECT STATUS REVIEW (Weekly) — PM, IT Lead, Business Analysts
          </motion.div>
          <div className="text-lg" style={{ color: colors.teal }}>↓</div>
          <div className="flex gap-3 w-full">
            {[
              { name: 'Sprint Demo (Bi-weekly)', desc: 'Full team + stakeholders', color: colors.blue },
              { name: 'Technical Review (Weekly)', desc: 'Architect + Devs + IT Lead', color: colors.teal },
              { name: 'Change Mgmt & Training', desc: 'IHS Project Owner + Champions', color: colors.green },
              { name: 'Integration Coordination', desc: 'IT Lead + TN Macaulay', color: colors.orange },
            ].map((item, i) => (
              <motion.div 
                key={i}
                className="flex-1 py-2 px-3 rounded-lg text-center text-white text-xs"
                style={{ backgroundColor: item.color }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <div className="font-bold">{item.name}</div>
                <div className="opacity-80 mt-1">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* RACI Matrix */}
      <div className="px-20 py-2">
        <div className="text-xs font-bold mb-2" style={{ color: colors.dark }}>RACI Matrix</div>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.navy }}>
                <th className="py-1.5 px-3 text-left text-white">Activity</th>
                <th className="py-1.5 px-3 text-center text-white">TN Macaulay</th>
                <th className="py-1.5 px-3 text-center text-white">IHS IT</th>
                <th className="py-1.5 px-3 text-center text-white">IHS Procurement</th>
                <th className="py-1.5 px-3 text-center text-white">Exec Sponsor</th>
              </tr>
            </thead>
            <tbody>
              {raciData.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 px-3" style={{ color: colors.dark }}>{row.activity}</td>
                  <td className="py-1.5 px-3 text-center font-bold" style={{ color: colors.blue }}>{row.tn}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: colors.slate }}>{row.ihs_it}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: colors.slate }}>{row.ihs_proc}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: colors.slate }}>{row.exec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs mt-1" style={{ color: colors.slate }}>
          R = Responsible | A = Accountable | C = Consulted | I = Informed
        </div>
      </div>

      {/* Dependencies */}
      <div className="px-20 pb-4">
        <motion.div 
          className="py-2 px-4 rounded-lg text-xs"
          style={{ backgroundColor: colors.iceBlue, color: colors.dark }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="font-bold">Dependencies: </span>{dependencies}
        </motion.div>
      </div>
    </div>
  );
};

const RiskRegisterSlide = () => {
  const risks = [
    { id: 'R1', risk: 'D365 integration complexity', l: 'Med', lColor: colors.orange, i: 'High', iColor: colors.red, mitigation: 'Early POC in Month 1, dedicated integration specialist', owner: 'TN Mac' },
    { id: 'R2', risk: 'Delayed IHS environment access', l: 'Med', lColor: colors.orange, i: 'High', iColor: colors.red, mitigation: 'Parallel dev env, early dependency tracking', owner: 'IHS IT' },
    { id: 'R3', risk: 'Scope creep from new requirements', l: 'High', lColor: colors.red, i: 'Med', iColor: colors.orange, mitigation: 'Formal change control, weekly scope reviews', owner: 'Joint' },
    { id: 'R4', risk: 'Key resource unavailability', l: 'Low', lColor: colors.green, i: 'High', iColor: colors.red, mitigation: 'Cross-training, documentation, backup resources', owner: 'TN Mac' },
    { id: 'R5', risk: 'Data migration quality issues', l: 'Med', lColor: colors.orange, i: 'Med', iColor: colors.orange, mitigation: 'Data profiling, validation scripts, cleansing', owner: 'Joint' },
    { id: 'R6', risk: 'User adoption resistance', l: 'Med', lColor: colors.orange, i: 'Med', iColor: colors.orange, mitigation: 'Early engagement, training, change champions', owner: 'IHS' },
    { id: 'R7', risk: 'Third-party API changes', l: 'Low', lColor: colors.green, i: 'Med', iColor: colors.orange, mitigation: 'Abstraction layer, API versioning, monitoring', owner: 'TN Mac' },
    { id: 'R8', risk: 'Security / compliance gaps', l: 'Low', lColor: colors.green, i: 'High', iColor: colors.red, mitigation: 'Security review gates, compliance checklist, pen testing', owner: 'Joint' },
  ];

  const reporting = [
    { cadence: 'Weekly', forum: 'Sprint Review', content: 'Velocity, blockers, demo of features', audience: 'PM + IT Lead + BAs' },
    { cadence: 'Bi-weekly', forum: 'Sprint Demo', content: 'Feature walkthrough, stakeholder feedback', audience: 'Full project team' },
    { cadence: 'Monthly', forum: 'SteerCo Pack', content: 'Strategic progress, decisions, risk escalations', audience: 'Exec Sponsor + SteerCo' },
    { cadence: 'Phase Gate', forum: 'Go/No-Go', content: 'UAT results, readiness checklist, sign-off', audience: 'Exec Sponsor (final)' },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-6">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>04</span>
        <motion.h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.dark }}>
          Risk Register & Reporting Cadence
        </motion.h2>
      </div>

      {/* Risk Table */}
      <div className="px-20 py-3">
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.navy }}>
                <th className="py-1.5 px-2 text-left text-white">ID</th>
                <th className="py-1.5 px-2 text-left text-white">Risk</th>
                <th className="py-1.5 px-2 text-center text-white">L</th>
                <th className="py-1.5 px-2 text-center text-white">I</th>
                <th className="py-1.5 px-2 text-left text-white">Mitigation</th>
                <th className="py-1.5 px-2 text-left text-white">Owner</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((row, i) => (
                <motion.tr 
                  key={i} 
                  className="border-b border-gray-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td className="py-1 px-2 font-bold" style={{ color: colors.teal }}>{row.id}</td>
                  <td className="py-1 px-2" style={{ color: colors.dark }}>{row.risk}</td>
                  <td className="py-1 px-2 text-center font-bold" style={{ color: row.lColor }}>{row.l}</td>
                  <td className="py-1 px-2 text-center font-bold" style={{ color: row.iColor }}>{row.i}</td>
                  <td className="py-1 px-2" style={{ color: colors.slate }}>{row.mitigation}</td>
                  <td className="py-1 px-2 font-semibold" style={{ color: colors.dark }}>{row.owner}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reporting Framework */}
      <div className="px-20 py-2">
        <div className="text-xs font-bold mb-2" style={{ color: colors.dark }}>Reporting Framework</div>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.teal }}>
                <th className="py-1.5 px-3 text-left text-white">Cadence</th>
                <th className="py-1.5 px-3 text-left text-white">Forum</th>
                <th className="py-1.5 px-3 text-left text-white">Content</th>
                <th className="py-1.5 px-3 text-left text-white">Audience</th>
              </tr>
            </thead>
            <tbody>
              {reporting.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 px-3 font-bold" style={{ color: colors.teal }}>{row.cadence}</td>
                  <td className="py-1.5 px-3 font-semibold" style={{ color: colors.dark }}>{row.forum}</td>
                  <td className="py-1.5 px-3" style={{ color: colors.slate }}>{row.content}</td>
                  <td className="py-1.5 px-3" style={{ color: colors.slate }}>{row.audience}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs mt-2" style={{ color: colors.slate }}>
          <span className="font-bold">Escalation:</span> Workstream Lead (24hr) → PM (48hr) → SteerCo (72hr) → Exec Sponsor (exception)
        </div>
      </div>
    </div>
  );
};

const MilestonesSlide = () => {
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  
  const deliverables = [
    { month: '1 (Feb)', deliverables: 'Kickoff, requirements validation, architecture design', milestone: 'Architecture Sign-off', color: colors.blue },
    { month: '2 (Mar)', deliverables: 'Vendor Portal (9 interfaces), API foundation', milestone: 'Vendor Portal Alpha', color: null },
    { month: '3 (Apr)', deliverables: 'Vendor Interface (6 pages), Due Diligence, Risk Monitor', milestone: 'Integration Testing', color: null },
    { month: '4 (May)', deliverables: 'AI Bot, Reverse Auction Portal (8 pages), Phase 1 UAT', milestone: 'PHASE 1 GO-LIVE', color: colors.blue },
    { month: '5 (Jun)', deliverables: 'RFx Creation (4 pages), Source Vendor (5 pages)', milestone: 'RFx Module Alpha', color: null },
    { month: '6 (Jul)', deliverables: 'Scope Validation (11 pages), D365 integration', milestone: 'Integration Complete', color: null },
    { month: '7–9', deliverables: 'Review & Rank, BAFO, Automated Planning, Templates, Phase 2 UAT', milestone: 'PHASE 2 GO-LIVE', color: colors.teal },
    { month: '10–11', deliverables: 'Forecasting, Category Mgmt, Risk Register, Cost/TCO Reporting', milestone: 'Reporting Suite Live', color: null },
    { month: '12–13', deliverables: 'Performance Mgmt, Exception Requests, Settings, Audit, Final UAT', milestone: 'PROJECT GO-LIVE', color: colors.green },
  ];

  const payments = [
    { num: '1', trigger: 'Project kickoff (contract signature)', pct: '50%', amount: '$83,750', target: 'Feb 2026' },
    { num: '2', trigger: 'Phase 1 completion (core modules + vendor portal)', pct: '20%', amount: '$33,500', target: 'May 2026' },
    { num: '3', trigger: 'Phase 2 completion (RFx workflows live)', pct: '15%', amount: '$25,125', target: 'Oct 2026' },
    { num: '4', trigger: 'Final delivery and go-live', pct: '15%', amount: '$25,125', target: 'Feb 2027' },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-6">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>05</span>
        <motion.h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.dark }}>
          Milestones & Execution Roadmap
        </motion.h2>
        <p className="text-sm" style={{ color: colors.slate }}>13-month delivery — February 2026 to February 2027</p>
      </div>

      {/* Timeline */}
      <div className="px-20 py-3">
        <div className="flex gap-1 mb-2">
          {months.map((m, i) => (
            <div key={i} className="flex-1 text-center text-xs font-semibold" style={{ color: colors.slate }}>{m}</div>
          ))}
        </div>
        <div className="relative h-16">
          <motion.div 
            className="absolute left-0 top-0 h-4 rounded text-xs flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: colors.blue, width: '30%' }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
          >
            Phase 1: Foundation ($47,500)
          </motion.div>
          <motion.div 
            className="absolute top-5 h-4 rounded text-xs flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: colors.teal, left: '30%', width: '38%' }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Phase 2: RFx Workflows ($60,000)
          </motion.div>
          <motion.div 
            className="absolute top-10 h-4 rounded text-xs flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: colors.green, left: '68%', width: '32%' }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Phase 3: Intelligence ($60,000)
          </motion.div>
        </div>
      </div>

      {/* Deliverables Table */}
      <div className="px-20 py-2 flex-1 overflow-hidden">
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.navy }}>
                <th className="py-1 px-2 text-left text-white">Month</th>
                <th className="py-1 px-2 text-left text-white">Key Deliverables</th>
                <th className="py-1 px-2 text-left text-white">Milestone Gate</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 px-2 font-semibold" style={{ color: colors.teal }}>{row.month}</td>
                  <td className="py-1 px-2" style={{ color: colors.dark }}>{row.deliverables}</td>
                  <td className="py-1 px-2 font-bold" style={{ color: row.color || colors.slate }}>{row.milestone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Milestones */}
      <div className="px-20 pb-4">
        <div className="text-xs font-bold mb-1" style={{ color: colors.dark }}>Payment Milestones</div>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.teal }}>
                <th className="py-1 px-2 text-left text-white">#</th>
                <th className="py-1 px-2 text-left text-white">Trigger</th>
                <th className="py-1 px-2 text-center text-white">%</th>
                <th className="py-1 px-2 text-right text-white">Amount</th>
                <th className="py-1 px-2 text-right text-white">Target</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 px-2 font-bold" style={{ color: colors.teal }}>{row.num}</td>
                  <td className="py-1 px-2" style={{ color: colors.dark }}>{row.trigger}</td>
                  <td className="py-1 px-2 text-center font-bold" style={{ color: colors.blue }}>{row.pct}</td>
                  <td className="py-1 px-2 text-right font-bold" style={{ color: colors.green }}>{row.amount}</td>
                  <td className="py-1 px-2 text-right" style={{ color: colors.slate }}>{row.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ResourceSlide = () => {
  const tnTeam = [
    { role: 'Project Director', p1: '10 hrs/wk', p2: '10 hrs/wk', p3: '10 hrs/wk', total: '520 hrs' },
    { role: 'Technical Project Manager', p1: '40 hrs/wk', p2: '40 hrs/wk', p3: '40 hrs/wk', total: '2,080 hrs' },
    { role: 'Solution Architect', p1: '40 hrs/wk', p2: '20 hrs/wk', p3: '10 hrs/wk', total: '1,200 hrs' },
    { role: 'Senior Full-Stack Developers (2)', p1: '40 hrs/wk ea', p2: '40 hrs/wk ea', p3: '40 hrs/wk ea', total: '4,160 hrs' },
    { role: 'AI/ML Engineer', p1: '20 hrs/wk', p2: '30 hrs/wk', p3: '40 hrs/wk', total: '1,560 hrs' },
    { role: 'QA Engineer', p1: '20 hrs/wk', p2: '40 hrs/wk', p3: '40 hrs/wk', total: '1,760 hrs' },
    { role: 'DevOps Engineer', p1: '30 hrs/wk', p2: '20 hrs/wk', p3: '30 hrs/wk', total: '1,360 hrs' },
  ];

  const ihsTeam = [
    { role: 'Executive Sponsor', commitment: '1 hr/week', activities: 'Steering committee, escalations, budget approval' },
    { role: 'Project Owner (Procurement)', commitment: '8 hrs/week', activities: 'Requirements, UAT, business process decisions' },
    { role: 'IT Lead', commitment: '8 hrs/week', activities: 'Technical review, integration support, security' },
    { role: 'Business Analysts (2)', commitment: '20 hrs/week each', activities: 'Requirements docs, process mapping, testing' },
    { role: 'SMEs + Change Champions', commitment: '4 hrs/week each', activities: 'Domain expertise, training coordination, feedback' },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-6">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>05</span>
        <motion.h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.dark }}>
          Resource Mobilisation & Change Management
        </motion.h2>
      </div>

      {/* TN Macaulay Team */}
      <div className="px-20 py-3">
        <div className="text-xs font-bold mb-1" style={{ color: colors.dark }}>TN Macaulay Delivery Team (12,640 total hours)</div>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.navy }}>
                <th className="py-1 px-2 text-left text-white">Role</th>
                <th className="py-1 px-2 text-center text-white">Phase 1 (4 mo)</th>
                <th className="py-1 px-2 text-center text-white">Phase 2 (5 mo)</th>
                <th className="py-1 px-2 text-center text-white">Phase 3 (4 mo)</th>
                <th className="py-1 px-2 text-right text-white">Total</th>
              </tr>
            </thead>
            <tbody>
              {tnTeam.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 px-2 font-semibold" style={{ color: colors.dark }}>{row.role}</td>
                  <td className="py-1 px-2 text-center" style={{ color: colors.blue }}>{row.p1}</td>
                  <td className="py-1 px-2 text-center" style={{ color: colors.teal }}>{row.p2}</td>
                  <td className="py-1 px-2 text-center" style={{ color: colors.green }}>{row.p3}</td>
                  <td className="py-1 px-2 text-right font-bold" style={{ color: colors.dark }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IHS Team */}
      <div className="px-20 py-2">
        <div className="text-xs font-bold mb-1" style={{ color: colors.dark }}>IHS Towers Resources Required (3,380 total hours)</div>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.teal }}>
                <th className="py-1 px-2 text-left text-white">Role</th>
                <th className="py-1 px-2 text-left text-white">Weekly Commitment</th>
                <th className="py-1 px-2 text-left text-white">Key Activities</th>
              </tr>
            </thead>
            <tbody>
              {ihsTeam.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 px-2 font-semibold" style={{ color: colors.dark }}>{row.role}</td>
                  <td className="py-1 px-2 font-bold" style={{ color: colors.teal }}>{row.commitment}</td>
                  <td className="py-1 px-2" style={{ color: colors.slate }}>{row.activities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post-Deployment */}
      <div className="px-20 pb-4">
        <motion.div 
          className="py-3 px-4 rounded-lg"
          style={{ backgroundColor: colors.iceBlue }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-xs font-bold mb-1" style={{ color: colors.dark }}>Post-Deployment Support</div>
          <div className="text-xs" style={{ color: colors.slate }}>
            Hypercare: 3 months (4-hr response) | Critical issues: 24/7 | Knowledge transfer: Month 13 | Optional maintenance: $3,000/month
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const CommercialSlide = () => {
  const investment = [
    { phase: 'Phase 1: Foundation & Core', amount: '$47,500', timeline: 'Feb–May 2026' },
    { phase: 'Phase 2: RFx Workflows', amount: '$60,000', timeline: 'Jun–Oct 2026' },
    { phase: 'Phase 3: Intelligence', amount: '$60,000', timeline: 'Nov–Feb 2027' },
    { phase: 'TOTAL', amount: '$167,500', timeline: '13 months', isTotal: true },
  ];

  const kpis = [
    { kpi: 'Procurement cycle time', baseline: '45 days', target: '15 days' },
    { kpi: 'Vendor onboarding', baseline: '3–4 weeks', target: '3–5 days' },
    { kpi: 'Spend visibility', baseline: '~40%', target: '>85%' },
    { kpi: 'Cost savings', baseline: 'Baseline', target: '10–15% YoY' },
    { kpi: 'Automation rate', baseline: '<10%', target: '80%+' },
  ];

  const competitive = [
    { feature: 'Total cost', procure: '$167.5K one-time', ariba: '$200K+/year', oracle: '$180K+/year', inhouse: '$300K+', highlight: true },
    { feature: 'AI capabilities', procure: '5+ AI engines', ariba: 'Basic', oracle: 'Basic', inhouse: 'None', highlight: true },
    { feature: 'D365 integration', procure: 'Deep, proven', ariba: 'Available', oracle: 'Available', inhouse: 'Build', highlight: true },
    { feature: 'Code ownership', procure: 'Full to IHS', ariba: 'No (SaaS)', oracle: 'No (SaaS)', inhouse: 'Yes', highlight: true },
    { feature: 'Annual licence', procure: 'None', ariba: '$200K+', oracle: '$180K+', inhouse: 'None', highlight: true },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-6">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>06</span>
        <motion.h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.dark }}>
          Commercial & Performance Framework
        </motion.h2>
      </div>

      <div className="px-20 py-3 flex gap-4">
        {/* Investment Summary */}
        <motion.div 
          className="flex-1 rounded-lg overflow-hidden"
          style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="py-2 px-4" style={{ backgroundColor: colors.navy }}>
            <span className="text-sm font-bold text-white">Investment Summary</span>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {investment.map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 ${row.isTotal ? 'font-bold' : ''}`} style={{ backgroundColor: row.isTotal ? colors.iceBlue : 'transparent' }}>
                  <td className="py-1.5 px-4" style={{ color: colors.dark }}>{row.phase}</td>
                  <td className="py-1.5 px-4 text-right font-bold" style={{ color: colors.green }}>{row.amount}</td>
                  <td className="py-1.5 px-4 text-right" style={{ color: colors.slate }}>{row.timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="py-2 px-4 text-xs" style={{ color: colors.slate }}>
            + 7.5% VAT = $180,062.50 | Optional maintenance: $3,000/month
          </div>
        </motion.div>

        {/* KPI Framework */}
        <motion.div 
          className="flex-1 rounded-lg overflow-hidden"
          style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="py-2 px-4" style={{ backgroundColor: colors.teal }}>
            <span className="text-sm font-bold text-white">KPI Framework</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.lightGrey }}>
                <th className="py-1 px-3 text-left" style={{ color: colors.dark }}>KPI</th>
                <th className="py-1 px-3 text-center" style={{ color: colors.dark }}>Baseline</th>
                <th className="py-1 px-3 text-center" style={{ color: colors.dark }}>Target</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 px-3" style={{ color: colors.dark }}>{row.kpi}</td>
                  <td className="py-1 px-3 text-center" style={{ color: colors.red }}>{row.baseline}</td>
                  <td className="py-1 px-3 text-center font-bold" style={{ color: colors.green }}>{row.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* Competitive Context */}
      <div className="px-20 pb-4 flex-1">
        <div className="text-xs font-bold mb-2" style={{ color: colors.dark }}>Competitive Context</div>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-1.5 px-3 text-left" style={{ backgroundColor: colors.lightGrey, color: colors.dark }}></th>
                <th className="py-1.5 px-3 text-center font-bold" style={{ backgroundColor: colors.teal, color: colors.white }}>Procure AI</th>
                <th className="py-1.5 px-3 text-center" style={{ backgroundColor: '#E5E7EB', color: colors.slate }}>SAP Ariba</th>
                <th className="py-1.5 px-3 text-center" style={{ backgroundColor: '#E5E7EB', color: colors.slate }}>Oracle</th>
                <th className="py-1.5 px-3 text-center" style={{ backgroundColor: '#E5E7EB', color: colors.slate }}>In-House</th>
              </tr>
            </thead>
            <tbody>
              {competitive.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 px-3 font-semibold" style={{ color: colors.dark }}>{row.feature}</td>
                  <td className="py-1.5 px-3 text-center font-bold" style={{ color: colors.green, backgroundColor: 'rgba(13, 148, 136, 0.1)' }}>{row.procure}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: colors.slate }}>{row.ariba}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: colors.slate }}>{row.oracle}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: colors.slate }}>{row.inhouse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DecisionPointsSlide = () => {
  const decisions = [
    {
      num: '01',
      title: 'Confirm Programme Start & Milestone 1 Payment',
      desc: 'Approve mobilisation and authorise Payment 1 ($83,750 + VAT). Team begins with Azure provisioning, D365 integration, and architecture design in Month 1.',
      button: 'GO / NO-GO',
    },
    {
      num: '02',
      title: 'Approve Governance Model & Team Allocation',
      desc: 'Endorse SteerCo composition, reporting cadence, RACI matrix, and escalation protocol. Confirm IHS project team roles (Project Owner, IT Lead, 2 BAs, SMEs, Change Champions).',
      button: 'APPROVE',
    },
    {
      num: '03',
      title: 'Instruct IT to Provision Infrastructure Access',
      desc: 'Direct IHS IT to provision: Azure subscription (Week 1), D365 API credentials (Week 2), VPN access for dev team (Week 1), and ServiceNow specs (Month 2).',
      button: 'APPROVE',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center" style={{ backgroundColor: colors.navy }}>
      <div className="px-20">
        <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>07</span>
        <motion.h2 
          className="text-4xl font-bold mb-2" 
          style={{ fontFamily: 'Georgia, serif', color: colors.white }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Decision Points
        </motion.h2>
        <motion.div 
          className="mb-4" 
          style={{ width: 180, height: 3, backgroundColor: colors.teal }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3 }}
        />
        <p className="text-base mb-8" style={{ color: colors.slate }}>
          Three decisions required to proceed with 1 March 2026 mobilisation:
        </p>

        <div className="space-y-4">
          {decisions.map((item, index) => (
            <motion.div
              key={item.num}
              className="rounded-lg p-5 flex items-center gap-6"
              style={{ backgroundColor: '#151D4A' }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.15 }}
            >
              <span 
                className="text-4xl font-bold" 
                style={{ fontFamily: 'Georgia, serif', color: colors.teal }}
              >
                {item.num}
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1" style={{ color: colors.white }}>{item.title}</h3>
                <p className="text-sm" style={{ color: colors.slate }}>{item.desc}</p>
              </div>
              <motion.button
                className="py-2 px-6 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: colors.teal }}
                whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${colors.teal}` }}
                whileTap={{ scale: 0.95 }}
              >
                {item.button}
              </motion.button>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="mt-8 py-3 px-4 rounded-lg border-2 text-center"
          style={{ borderColor: colors.teal }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <p className="text-sm italic" style={{ color: colors.iceBlue }}>
            Thursday follow-up session will incorporate feedback and conclude with formal endorsement to proceed.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const CredentialsSlide = () => {
  const credentials = [
    { title: 'Meristem Investment Bank', year: '2016', color: colors.blue, desc: "One of Nigeria's earliest enterprise AI chatbots. NLP-powered investment advisory processing thousands of queries daily." },
    { title: 'Vodacom Procurement Platform', year: '2017–2019', color: colors.teal, desc: 'Three-in-one: internal procurement + vendor enablement + reverse auctions. D365 integration. 200+ vendors, ₦2B+ annually.' },
    { title: 'Enterprise Financial Wallet', year: '2018', color: colors.green, desc: 'Multi-tenant platform for P&G, Dangote, Oando. D365 reconciliation. 50,000+ users across tenants.' },
    { title: 'Multi-Tenant AI Platform', year: '2018–Present', color: colors.navy, desc: '15+ enterprises on shared infra. Kubernetes-based isolation. 50K+ monthly transactions. HR, CX, and operations.' },
  ];

  const stats = [
    { value: '8+', label: 'Years D365/Azure' },
    { value: '15+', label: 'Enterprise tenants' },
    { value: '5', label: 'D365 integrations' },
    { value: '50K+', label: 'Monthly txns' },
    { value: '12', label: 'Azure apps live' },
  ];

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: colors.lightGrey }}>
      <div className="px-20 pt-8">
        <motion.h2 
          className="text-3xl font-bold mb-1" 
          style={{ fontFamily: 'Georgia, serif', color: colors.dark }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Appendix: TN Macaulay Credentials
        </motion.h2>
        <p className="text-base mb-6" style={{ color: colors.slate }}>
          Pioneering enterprise AI in Nigeria since 2016
        </p>
      </div>

      {/* Credential Cards */}
      <div className="px-20 flex-1">
        <div className="grid grid-cols-2 gap-4">
          {credentials.map((cred, index) => (
            <motion.div
              key={cred.title}
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="py-2 px-4 flex justify-between items-center" style={{ backgroundColor: cred.color }}>
                <span className="text-sm font-bold text-white">{cred.title}</span>
                <span className="text-xs text-white opacity-80">{cred.year}</span>
              </div>
              <div className="p-4">
                <p className="text-sm" style={{ color: colors.slate }}>{cred.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-20 pb-8">
        <div className="flex gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="flex-1 py-4 px-3 rounded-lg text-center"
              style={{ backgroundColor: colors.white, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: colors.teal }}>
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: colors.slate }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Presentation Component
const ProcureAIExecutivePackV4 = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [scale, setScale] = useState(1);
  const slideRef = useRef(null);
  const containerRef = useRef(null);

  // Calculate scale to fit viewport
  useEffect(() => {
    const calculateScale = () => {
      const targetWidth = 1920;
      const targetHeight = 1080;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const scaleX = viewportWidth / targetWidth;
      const scaleY = viewportHeight / targetHeight;
      const newScale = Math.min(scaleX, scaleY);
      
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const slides = [
    { component: TitleSlide, name: 'Title' },
    { component: AgendaSlide, name: 'Agenda' },
    { component: StrategicFramingSlide, name: 'Strategic Framing' },
    { component: ScopeConfirmationSlide, name: 'Scope Confirmation' },
    { component: TargetArchitectureSlide, name: 'Target Architecture' },
    { component: GovernanceSlide, name: 'Governance' },
    { component: RiskRegisterSlide, name: 'Risk Register' },
    { component: MilestonesSlide, name: 'Milestones' },
    { component: ResourceSlide, name: 'Resources' },
    { component: CommercialSlide, name: 'Commercial' },
    { component: DecisionPointsSlide, name: 'Decision Points' },
    { component: CredentialsSlide, name: 'Credentials' },
  ];

  const goToSlide = useCallback((index) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, toggleFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // PDF Download
  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    const originalSlide = currentSlide;
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080],
      });

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        
        // Wait for slide transition and render
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (slideRef.current) {
          const canvas = await html2canvas(slideRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: null,
            width: 1920,
            height: 1080,
          });

          const imgData = canvas.toDataURL('image/png');
          
          if (i > 0) {
            pdf.addPage([1920, 1080], 'landscape');
          }
          
          pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080);
        }
      }

      pdf.save('ProcureAI_Executive_KickOff_Pack.pdf');
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setCurrentSlide(originalSlide);
      setIsGeneratingPDF(false);
    }
  };

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen overflow-hidden relative"
      style={{ backgroundColor: colors.dark }}
    >
      {/* Teal accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 z-50" style={{ backgroundColor: colors.teal }} />

      {/* PDF Generation Overlay */}
      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: colors.teal, borderTopColor: 'transparent' }} />
              <p className="text-xl font-semibold" style={{ color: colors.white }}>Generating PDF...</p>
              <p className="text-sm mt-2" style={{ color: colors.slate }}>
                Processing slide {currentSlide + 1} of {slides.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide Content */}
      <div 
        className="absolute top-0 left-0 flex items-center justify-center w-full h-full"
      >
        <div 
          ref={slideRef}
          style={{ 
            width: '1920px', 
            height: '1080px', 
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              className="w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentSlideComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full transition-all z-40 hover:scale-110 disabled:opacity-30 active:scale-95"
        style={{ backgroundColor: 'rgba(13, 148, 136, 0.9)' }}
        data-testid="prev-slide-btn"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      <button
        onClick={nextSlide}
        disabled={currentSlide === slides.length - 1}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full transition-all z-40 hover:scale-110 disabled:opacity-30 active:scale-95"
        style={{ backgroundColor: 'rgba(13, 148, 136, 0.9)' }}
        data-testid="next-slide-btn"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      {/* Bottom Navigation - Scrollable on mobile */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-40 max-w-[80%] overflow-x-auto px-2 scrollbar-hide">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all flex-shrink-0"
            style={{ 
              backgroundColor: index === currentSlide ? colors.teal : 'rgba(255,255,255,0.3)',
              transform: index === currentSlide ? 'scale(1.2)' : 'scale(1)',
            }}
            data-testid={`slide-dot-${index}`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div 
        className="absolute bottom-4 sm:bottom-6 right-4 sm:right-8 text-xs sm:text-sm font-bold z-40"
        style={{ fontFamily: 'Georgia, serif', color: colors.teal }}
      >
        {currentSlide + 1} / {slides.length}
      </div>

      {/* Controls - Responsive layout */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-8 flex items-center gap-2 sm:gap-3 z-40">
        <button
          onClick={downloadPDF}
          disabled={isGeneratingPDF}
          className="hidden sm:flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
          style={{ backgroundColor: colors.teal }}
          data-testid="download-pdf-btn"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
        
        {/* Mobile PDF button - icon only */}
        <button
          onClick={downloadPDF}
          disabled={isGeneratingPDF}
          className="sm:hidden p-2 rounded-lg text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: colors.teal }}
          data-testid="download-pdf-btn-mobile"
        >
          <Download className="w-5 h-5" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'rgba(13, 148, 136, 0.9)' }}
          data-testid="fullscreen-btn"
        >
          {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </div>
    </div>
  );
};

export default ProcureAIExecutivePackV4;
