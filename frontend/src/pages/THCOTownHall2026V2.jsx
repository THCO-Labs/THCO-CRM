import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Loader2, ArrowLeft } from "lucide-react";

// THCO Town Hall Color Palette
const colors = {
  darkBg: "#0B0620",
  purple: "#7C3AED",
  deepPurple: "#5B21B6",
  teal: "#14B8A6",
  darkTeal: "#0F766E",
  amber: "#F59E0B",
  green: "#10B981",
  red: "#EF4444",
  lightBg: "#FAFAFF",
  warmBg: "#F5F3FF",
  darkText: "#1E1B2E",
  bodyText: "#374151",
  muted: "#6B7280",
  white: "#FFFFFF",
};

// Animation variants
const pageVariants = {
  initial: { opacity: 0, x: 100, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -100, scale: 0.98, transition: { duration: 0.3 } }
};

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
};

const fadeInLeft = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const fadeInRight = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const staggerItem = {
  initial: { opacity: 0, y: 25 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const pulseGlow = {
  initial: { boxShadow: "0 0 0 0 rgba(124, 58, 237, 0)" },
  animate: { 
    boxShadow: ["0 0 0 0 rgba(124, 58, 237, 0)", "0 0 30px 10px rgba(124, 58, 237, 0.3)", "0 0 0 0 rgba(124, 58, 237, 0)"],
    transition: { duration: 2, repeat: Infinity }
  }
};

// Decorative Oval Component with animation
const DecorativeOval = ({ className = "", style = {}, color = colors.purple, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 1.2, delay, ease: "easeOut" }}
    className={`absolute rounded-full blur-3xl ${className}`}
    style={{ 
      background: `radial-gradient(ellipse, ${color}30, transparent)`,
      ...style 
    }}
  />
);

// Card Component with enhanced animations
const Card = ({ children, accent, header, headerColor, className = "", dark = false, delay = 0 }) => (
  <motion.div 
    variants={staggerItem}
    whileHover={{ y: -4, boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.4)" : "0 20px 40px rgba(0,0,0,0.1)" }}
    transition={{ duration: 0.3 }}
    className={`rounded-xl overflow-hidden ${className}`}
    style={{ 
      backgroundColor: dark ? 'rgba(255,255,255,0.05)' : colors.white,
      border: dark ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${colors.lightBg}`,
      borderLeft: accent ? `5px solid ${accent}` : undefined,
      boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.08)"
    }}
  >
    {header && (
      <div className="px-4 py-2.5 font-bold text-sm text-white tracking-wide" style={{ backgroundColor: headerColor || colors.purple }}>
        {header}
      </div>
    )}
    <div className="p-5">{children}</div>
  </motion.div>
);

// Stat Box Component with counting animation
const StatBox = ({ value, label, color = colors.purple, dark = true }) => (
  <motion.div 
    variants={scaleIn}
    whileHover={{ scale: 1.05 }}
    className="rounded-xl p-6 text-center relative overflow-hidden"
    style={{ 
      backgroundColor: dark ? 'rgba(255,255,255,0.05)' : colors.lightBg,
      border: dark ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${colors.lightBg}`
    }}
  >
    <motion.div 
      className="absolute inset-0 opacity-20"
      style={{ background: `radial-gradient(circle at center, ${color}40, transparent 70%)` }}
    />
    <motion.div 
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
      className="text-5xl font-bold mb-2 relative z-10" 
      style={{ color }}
    >
      {value}
    </motion.div>
    <div className={`text-sm relative z-10 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</div>
  </motion.div>
);

// Section Divider Component (Dark)
const SectionDivider = ({ title, subtitle }) => (
  <div className="h-full flex flex-col relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <DecorativeOval className="w-[500px] h-[400px] top-10 -left-40" delay={0} />
    <DecorativeOval className="w-[400px] h-[350px] bottom-20 right-10" delay={0.2} color={colors.teal} />
    <DecorativeOval className="w-[300px] h-[250px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" delay={0.4} />
    
    <div className="flex-1 flex flex-col justify-center px-16 z-10">
      <motion.h1 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-5xl font-bold text-white mb-4"
      >
        {title}
      </motion.h1>
      <motion.div 
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-24 h-1 mb-4"
        style={{ backgroundColor: colors.teal, transformOrigin: 'left' }}
      />
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-xl"
        style={{ color: colors.teal }}
      >
        {subtitle}
      </motion.p>
    </div>
  </div>
);

// ============ SLIDES ============

// Slide 1: Title
const Slide1 = () => (
  <div className="h-full flex flex-col relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <DecorativeOval className="w-[600px] h-[500px] top-10 right-0" delay={0} />
    <DecorativeOval className="w-[400px] h-[350px] bottom-20 left-20" delay={0.3} color={colors.teal} />
    <DecorativeOval className="w-[300px] h-[250px] top-1/3 left-1/4" delay={0.5} />
    
    <div className="flex-1 flex flex-col justify-center px-16 z-10">
      <motion.p 
        initial={{ opacity: 0, y: -30, letterSpacing: "0.1em" }}
        animate={{ opacity: 1, y: 0, letterSpacing: "0.3em" }}
        transition={{ duration: 0.6 }}
        className="text-sm font-semibold mb-8"
        style={{ color: colors.teal }}
      >
        THCO
      </motion.p>
      
      <motion.h1 
        initial={{ opacity: 0, y: 50, clipPath: "inset(100% 0 0 0)" }}
        animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="text-7xl font-bold text-white mb-4"
      >
        The Future Is Now
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-xl mb-6"
        style={{ color: colors.muted }}
      >
        Town Hall 2026
      </motion.p>
      
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="w-16 h-1 mb-4"
        style={{ backgroundColor: colors.teal, transformOrigin: 'left' }}
      />
      
      <motion.p 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        className="text-lg italic"
        style={{ color: colors.purple }}
      >
        Human Insight. Amplified.
      </motion.p>
    </div>
  </div>
);

// Slide 2: The Line in the Sand
const Slide2 = () => (
  <div className="h-full flex flex-col justify-center items-center relative overflow-hidden px-16" style={{ backgroundColor: colors.darkBg }}>
    <DecorativeOval className="w-[700px] h-[500px] top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="text-center z-10 max-w-4xl"
    >
      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl font-bold text-white mb-3"
      >
        The future is not coming.
      </motion.p>
      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-5xl font-bold mb-10"
        style={{ color: colors.teal }}
      >
        The future is already here.
      </motion.p>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="text-xl"
        style={{ color: colors.muted }}
      >
        And it is separating companies into two groups.
      </motion.p>
    </motion.div>
  </div>
);

// Slide 3: Section - Pattern of History
const Slide3 = () => <SectionDivider title="The Pattern of History" subtitle="Companies that saw the future — and companies that didn't" />;

// Slide 4: Four Industrial Revolutions
const Slide4 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.div {...fadeInUp} className="mb-8">
      <h1 className="text-4xl font-bold mb-2" style={{ color: colors.darkText }}>The Four Industrial Revolutions</h1>
      <p style={{ color: colors.bodyText }}>Each one reset how the world works. We are in the fourth reset right now.</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-4 gap-4 flex-1">
      {[
        { num: "1ST", era: "Late 1700s", tech: "Steam & Mechanisation", impact: "GDP flat for 1,000 years. Steam broke the ceiling.", color: colors.purple },
        { num: "2ND", era: "Late 1800s", tech: "Electricity & Steel", impact: "Living standards multiplied 3-5x.", color: colors.deepPurple },
        { num: "3RD", era: "Mid 1900s", tech: "Computers & Internet", impact: "2-4% global growth. Billions lifted.", color: colors.teal },
        { num: "4TH", era: "Now", tech: "AI, IoT & Biotech", impact: "Physical + digital worlds merging.", color: colors.amber },
      ].map((rev, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          whileHover={{ y: -8, transition: { duration: 0.3 } }}
          className="rounded-xl overflow-hidden shadow-lg bg-white"
        >
          <motion.div 
            className="py-4 text-center font-bold text-white text-xl"
            style={{ backgroundColor: rev.color }}
            whileHover={{ backgroundColor: rev.color + "dd" }}
          >
            {rev.num}
          </motion.div>
          <div className="p-5">
            <p className="text-sm font-semibold mb-1" style={{ color: colors.darkText }}>{rev.era}</p>
            <p className="text-sm font-bold mb-3" style={{ color: rev.color }}>{rev.tech}</p>
            <p className="text-sm" style={{ color: colors.bodyText }}>{rev.impact}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-sm italic mt-6" 
      style={{ color: colors.purple }}
    >
      Since 1800, total human prosperity has grown 10-20x. All of it traces to these revolutions.
    </motion.p>
  </div>
);

// Slide 5: Nokia vs Apple
const Slide5 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-8" style={{ color: colors.darkText }}>
      Nokia vs Apple
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-8 flex-1">
      <motion.div variants={fadeInLeft}>
        <Card headerColor={colors.red} header="NOKIA">
          <p className="text-2xl font-bold mb-4" style={{ color: colors.darkText }}>2007: 40% Global Market Share</p>
          <p className="italic text-lg mb-2" style={{ color: colors.bodyText }}>"We didn't do anything wrong, but somehow we lost."</p>
          <p className="text-sm mb-4" style={{ color: colors.muted }}>— Nokia CEO, 2013</p>
          <p className="text-sm font-semibold" style={{ color: colors.red }}>Sold to Microsoft for a fraction of its value</p>
        </Card>
      </motion.div>
      
      <motion.div variants={fadeInRight}>
        <Card headerColor={colors.green} header="APPLE">
          <p className="text-2xl font-bold mb-4" style={{ color: colors.darkText }}>2007: Glass Rectangle, No Keyboard</p>
          <p className="italic text-lg mb-2" style={{ color: colors.bodyText }}>"Today, Apple is going to reinvent the phone."</p>
          <p className="text-sm mb-4" style={{ color: colors.muted }}>— Steve Jobs, 2007</p>
          <p className="text-sm font-semibold" style={{ color: colors.green }}>Now the world's most valuable company</p>
        </Card>
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-sm italic mt-6" 
      style={{ color: colors.purple }}
    >
      They saw it coming. They chose to believe it wouldn't matter.
    </motion.p>
  </div>
);

// Slide 6: Pattern Repeats
const Slide6 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-8" style={{ color: colors.darkText }}>
      The Pattern Repeats
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-6 mb-6">
      <Card accent={colors.purple}>
        <p className="font-bold text-lg mb-2" style={{ color: colors.purple }}>Netflix vs Blockbuster</p>
        <p className="text-sm" style={{ color: colors.bodyText }}>
          DVD-by-mail company. Board said streaming was too early. Stock dropped 75%. Today worth $400B+. Blockbuster is a single tourist-attraction store.
        </p>
      </Card>
      <Card accent={colors.teal}>
        <p className="font-bold text-lg mb-2" style={{ color: colors.teal }}>Amazon vs Borders</p>
        <p className="text-sm" style={{ color: colors.bodyText }}>
          Sold books online. Built AWS while everyone focused on products. Borders outsourced their online business to Amazon. Bankrupt by 2011.
        </p>
      </Card>
    </motion.div>
    
    <motion.div 
      variants={staggerItem}
      initial="initial"
      animate="animate"
      className="rounded-xl p-6"
      style={{ backgroundColor: colors.darkBg }}
    >
      <p className="font-bold text-white text-lg mb-2">Every losing company had more money, more people, more market share, and more time.</p>
      <p style={{ color: colors.teal }}>They lost because they believed the future would wait for them. It never does.</p>
    </motion.div>
  </div>
);

// Slide 7: Two Futures for THCO
const Slide7 = () => (
  <div className="h-full flex flex-col p-12 relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <DecorativeOval className="w-[500px] h-[400px] bottom-0 right-0" />
    
    <motion.h1 {...fadeInUp} className="text-4xl font-bold text-white mb-8 z-10">
      Two Futures for THCO
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-8 flex-1 z-10">
      <motion.div variants={fadeInLeft}>
        <Card dark headerColor={colors.red} header="FUTURE A">
          <p className="font-bold text-white text-lg mb-4">Stay a Normal Recruiting Firm</p>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li>• Manual operations</li>
            <li>• Price pressure from commoditization</li>
            <li>• Slower delivery, higher costs</li>
            <li>• Interchangeable with thousands of firms</li>
          </ul>
        </Card>
      </motion.div>
      
      <motion.div variants={fadeInRight}>
        <Card dark headerColor={colors.teal} header="FUTURE B">
          <p className="font-bold text-white text-lg mb-4">AI-Native Professional Services</p>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li>• Agent-powered leverage at scale</li>
            <li>• Productised delivery, premium pricing</li>
            <li>• Five revenue engines, not one</li>
            <li>• Scale without headcount explosion</li>
          </ul>
        </Card>
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="text-xl italic mt-6 z-10" 
      style={{ color: colors.amber }}
    >
      Which future are we building?
    </motion.p>
  </div>
);

// Slide 8: Africa's Adoption Gap
const Slide8 = () => (
  <div className="h-full flex flex-col p-12 relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <motion.div {...fadeInUp} className="mb-6 z-10">
      <h1 className="text-4xl font-bold text-white mb-2">Africa's Adoption Gap</h1>
      <p style={{ color: colors.teal }}>And why AI changes everything</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-6 flex-1 z-10">
      <div className="space-y-3">
        {[
          { wave: "Steam", impact: "Still feeling economic consequences 200 years later", label: "Late" },
          { wave: "Electricity", impact: "Parts of Nigeria still lack stable power in 2026", label: "Late" },
          { wave: "Internet", impact: "Deep broadband still a work in progress", label: "Late" },
        ].map((item, i) => (
          <motion.div 
            key={i}
            variants={staggerItem}
            whileHover={{ x: 8 }}
            className="rounded-lg p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${colors.red}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-white">{item.wave}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{item.label}</span>
            </div>
            <p className="text-sm text-gray-400">{item.impact}</p>
          </motion.div>
        ))}
      </div>
      
      <Card dark headerColor={colors.teal} header="AI Is Different">
        <p className="text-gray-300 text-sm leading-relaxed">
          AI doesn't require railways, power plants, or fibre optic cables. It spreads through workflows, devices, teams, and software — tools we already have today.
        </p>
      </Card>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-lg font-bold mt-6 z-10" 
      style={{ color: colors.amber }}
    >
      This might be the first revolution where Africa can move at the speed of the world.
    </motion.p>
  </div>
);

// Slide 9: Talent's Own Revolution
const Slide9 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-8" style={{ color: colors.darkText }}>
      Talent's Own Industrial Revolution
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex-1">
      <Card accent={colors.purple} className="mb-6">
        <p className="font-bold text-lg mb-2" style={{ color: colors.purple }}>A New Role Is Emerging</p>
        <p className="text-sm" style={{ color: colors.bodyText }}>
          xAI, Tesla, CoreWeave, Ramp, The Boring Company — all hiring Talent Engineers. Treating recruiting as an engineering problem.
        </p>
      </Card>
      
      <motion.div 
        variants={staggerItem}
        className="rounded-xl p-6"
        style={{ backgroundColor: colors.darkBg }}
      >
        <p className="text-gray-400 mb-2">The real future isn't "every company hires engineers for talent."</p>
        <p className="font-bold text-white text-lg mb-2">The real future: recruiters and talent leaders who build these systems themselves.</p>
        <p style={{ color: colors.teal }}>That is exactly what we are building at THCO.</p>
      </motion.div>
    </motion.div>
  </div>
);

// Slide 10: Section - What THCO Is Becoming
const Slide10 = () => <SectionDivider title="What THCO Is Becoming" subtitle="The AI-native professional services firm of the future" />;

// Slide 11: Five Integrated Pillars
const Slide11 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.div {...fadeInUp} className="mb-6">
      <h1 className="text-4xl font-bold mb-2" style={{ color: colors.darkText }}>Five Integrated Pillars</h1>
      <p style={{ color: colors.bodyText }}>One client. Five revenue streams. Fully integrated.</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-5 gap-3 mb-6">
      {[
        { name: "Advisory", desc: "Assess what's working and what isn't", color: colors.deepPurple },
        { name: "Talent", desc: "Find and place exceptional people", color: colors.purple },
        { name: "Technology", desc: "Don't just advise — build the solution", color: colors.teal },
        { name: "Academy", desc: "Upgrade people for the AI era", color: colors.darkTeal },
        { name: "Operate", desc: "Manage it ongoing. Recurring revenue.", color: colors.amber },
      ].map((pillar, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          whileHover={{ y: -6, scale: 1.02 }}
          className="rounded-xl overflow-hidden shadow-lg bg-white"
        >
          <div className="py-3 text-center font-bold text-white text-sm" style={{ backgroundColor: pillar.color }}>{pillar.name}</div>
          <div className="p-3">
            <p className="text-xs" style={{ color: colors.bodyText }}>{pillar.desc}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-lg p-4 text-sm text-center"
      style={{ backgroundColor: colors.warmBg, color: colors.bodyText }}
    >
      <span className="inline-flex items-center gap-2 flex-wrap justify-center">
        <span>Advisory reveals gaps</span>
        <span style={{ color: colors.purple }}>→</span>
        <span>Technology builds solutions</span>
        <span style={{ color: colors.purple }}>→</span>
        <span>Talent fills roles</span>
        <span style={{ color: colors.purple }}>→</span>
        <span>Academy trains teams</span>
        <span style={{ color: colors.purple }}>→</span>
        <span>Operate manages ongoing</span>
      </span>
    </motion.div>
  </div>
);

// Slide 12: How We Deliver Differently
const Slide12 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-8" style={{ color: colors.darkText }}>
      How We Deliver Differently
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3 mb-8">
      {[
        { layer: "Consultants", desc: "Client-facing. Strategic judgment. Trust.", width: "100%", color: colors.purple, highlight: false },
        { layer: "Expert Network", desc: "Domain specialists activated on demand.", width: "85%", color: colors.purple, highlight: false },
        { layer: "Proprietary AI", desc: "70% of all analytical work. Our moat.", width: "70%", highlight: true, color: colors.deepPurple },
        { layer: "Nigeria Operations", desc: "Execution, coordination, quality. The backbone.", width: "55%", color: colors.teal, highlight: false },
      ].map((item, i) => (
        <motion.div 
          key={i}
          variants={staggerItem}
          whileHover={{ scale: 1.01, x: 8 }}
          className={`rounded-lg p-4 ${item.highlight ? 'shadow-xl' : 'shadow-sm'}`}
          style={{ 
            width: item.width, 
            backgroundColor: item.highlight ? item.color : colors.white,
            border: item.highlight ? 'none' : `1px solid ${colors.lightBg}`
          }}
        >
          <p className={`font-bold ${item.highlight ? 'text-white' : ''}`} style={{ color: item.highlight ? undefined : colors.darkText }}>{item.layer}</p>
          <p className={`text-sm ${item.highlight ? 'text-gray-200' : ''}`} style={{ color: item.highlight ? undefined : colors.bodyText }}>{item.desc}</p>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.7 }}
      className="text-xl font-bold text-center" 
      style={{ color: colors.darkText }}
    >
      Team of 5 at THCO = Team of 20 at a traditional firm
    </motion.p>
  </div>
);

// Slide 13: Section - The Machine We're Building
const Slide13 = () => <SectionDivider title="The Machine We're Building" subtitle="Agents do volume. Humans do judgment." />;

// Slide 14: AI Agent Fleet
const Slide14 = () => (
  <div className="h-full flex flex-col p-12 relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold text-white mb-8 z-10">
      An AI Agent Fleet
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-4 gap-4 mb-8 z-10">
      <StatBox value="37" label="Specialised AI Agents" color={colors.purple} />
      <StatBox value="94" label="Data Connections" color={colors.teal} />
      <StatBox value="18" label="Automated Trigger Chains" color={colors.amber} />
      <StatBox value="24/7" label="Always On, Never Stops" color={colors.green} />
    </motion.div>
    
    <motion.div {...fadeInUp} className="z-10">
      <p className="text-gray-400 mb-4">Every engine works the same way:</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "TRIGGER", desc: "Something starts the chain", color: colors.amber },
          { label: "PIPELINE", desc: "Agents do the work", color: colors.purple },
          { label: "HUMAN MOVE", desc: "Your judgment makes it count", color: colors.teal },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -4 }}
            className="rounded-lg p-4" 
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderTop: `4px solid ${item.color}` }}
          >
            <p className="text-xs font-bold tracking-wider mb-1" style={{ color: item.color }}>{item.label}</p>
            <p className="text-sm text-gray-300">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

// Slide 15: Acquisition Engine
const Slide15 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.div {...fadeInUp} className="mb-6">
      <h1 className="text-3xl font-bold mb-1" style={{ color: colors.darkText }}>The Acquisition Engine</h1>
      <p className="text-sm" style={{ color: colors.bodyText }}>How we win clients</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-3 gap-4 flex-1">
      <div className="col-span-2 space-y-2">
        {[
          { step: "Lead Research", desc: "Daily: scans LinkedIn, news, job boards. 10-25 qualified prospects.", trigger: true },
          { step: "Email Outreach", desc: "Personalised cold emails. 50-100/day. Multi-step sequences.", trigger: false },
          { step: "Inbox + CRM", desc: "Real-time reply monitoring. Auto-categorise. Pipeline tracking.", trigger: false },
          { step: "Reactivation", desc: "Weekly batch: intelligence cards on dormant client accounts.", trigger: false },
          { step: "Meeting Prep", desc: "24hrs before: full briefing pack with competitive context.", trigger: false },
        ].map((item, i) => (
          <motion.div 
            key={i}
            variants={staggerItem}
            whileHover={{ x: 6 }}
            className="rounded-lg p-3 bg-white"
            style={{ borderLeft: `4px solid ${item.trigger ? colors.amber : colors.purple}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider" style={{ color: item.trigger ? colors.amber : colors.purple }}>
                {item.trigger ? 'TRIGGER' : 'PIPELINE'}
              </span>
              <span className="font-semibold text-sm" style={{ color: colors.darkText }}>{item.step}</span>
            </div>
            <p className="text-xs" style={{ color: colors.bodyText }}>{item.desc}</p>
          </motion.div>
        ))}
      </div>
      
      <Card headerColor={colors.teal} header="HUMAN FINISHING MOVE">
        <p className="text-sm" style={{ color: colors.bodyText }}>
          Rebecca walks in fully briefed, fully armed, fully dangerous.
        </p>
      </Card>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-sm italic mt-4" 
      style={{ color: colors.purple }}
    >
      Agents do volume. Humans do judgment.
    </motion.p>
  </div>
);

// Slide 16: Recruiting Engine
const Slide16 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.warmBg }}>
    <motion.div {...fadeInUp} className="mb-6">
      <h1 className="text-3xl font-bold mb-1" style={{ color: colors.darkText }}>The Recruiting Engine</h1>
      <p className="text-sm" style={{ color: colors.bodyText }}>How we deliver talent</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-4 mb-6">
      {[
        { title: "Client Onboarding", desc: "Intake forms, refined JDs, project setup — within 48 hours" },
        { title: "Personalised Outreach", desc: "Industry-specific language — pharma vs construction vs fintech" },
        { title: "Candidate Sourcing", desc: "LinkedIn, GitHub, job boards — ranked longlist while you sleep" },
        { title: "Market Intelligence", desc: "Real-time hiring trends, salary benchmarks, talent shortages" },
        { title: "Deep Screening", desc: "Skills matching, salary estimation, red flags, interview questions" },
        { title: "Client Reporting", desc: "Automated weekly progress reports with pipeline visualisation" },
      ].map((item, i) => (
        <Card key={i} accent={colors.purple}>
          <p className="font-bold text-sm mb-1" style={{ color: colors.darkText }}>{item.title}</p>
          <p className="text-xs" style={{ color: colors.bodyText }}>{item.desc}</p>
        </Card>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-xl p-4"
      style={{ backgroundColor: colors.darkBg }}
    >
      <p className="text-white text-center">You stop spending 3 hours sourcing. You start spending 3 hours in conversations. That's where deals close.</p>
    </motion.div>
  </div>
);

// Slide 17: Every Engine Same Pattern
const Slide17 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-3xl font-bold mb-6" style={{ color: colors.darkText }}>
      Every Engine. Same Pattern.
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-xs font-bold tracking-wider mb-2">
        <span></span>
        <span style={{ color: colors.amber }}>TRIGGER</span>
        <span style={{ color: colors.purple }}>AGENT PIPELINE</span>
        <span style={{ color: colors.teal }}>HUMAN MOVE</span>
      </div>
      
      {[
        { engine: "Advisory", trigger: "Engagement kicks off", pipeline: "Data requests, stakeholder maps, benchmarking, skills gap analysis", human: "Senior consultant refines and presents", color: colors.deepPurple },
        { engine: "Technology", trigger: "Project is signed", pipeline: "Spec-to-tasks, QA testing, scope creep detection, auto-timesheets", human: "Architecture decisions, ambiguous trade-offs", color: colors.teal },
        { engine: "Marketing", trigger: "Monthly content calendar", pipeline: "Blog articles, LinkedIn posts, newsletters, lead scoring at scale", human: "Havilah sets direction, Godwin owns design quality", color: colors.purple },
        { engine: "Operations", trigger: "6 AM every morning", pipeline: "Project status, utilisation, invoicing, document automation, HR", human: "Victoria reviews dashboard, makes the calls", color: colors.amber },
      ].map((row, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          whileHover={{ scale: 1.01 }}
          className="grid grid-cols-4 gap-2 items-center"
        >
          <div className="rounded-lg p-2 bg-white font-bold text-sm shadow-sm" style={{ borderLeft: `4px solid ${row.color}`, color: colors.darkText }}>{row.engine}</div>
          <div className="rounded-lg p-2 bg-white text-xs shadow-sm" style={{ color: colors.bodyText }}>{row.trigger}</div>
          <div className="rounded-lg p-2 bg-white text-xs shadow-sm" style={{ color: colors.bodyText }}>{row.pipeline}</div>
          <div className="rounded-lg p-2 bg-white text-xs shadow-sm" style={{ color: colors.bodyText }}>{row.human}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="text-sm italic mt-6" 
      style={{ color: colors.purple }}
    >
      Agents do volume. Humans do judgment.
    </motion.p>
  </div>
);

// Slide 18: The Flywheel
const Slide18 = () => (
  <div className="h-full flex flex-col p-12 relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <motion.div {...fadeInUp} className="mb-6 z-10">
      <h1 className="text-4xl font-bold text-white mb-1">The Flywheel</h1>
      <p style={{ color: colors.teal }}>Every cycle makes the next one faster, smarter, and more profitable</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="z-10 flex-1">
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        {["Complete Project", "→", "Knowledge Capture", "→", "Content Generation", "→", "Publish Across 12 LinkedIn Pages", "→", "Attract New Leads", "→", "CRM + Meeting Prep"].map((step, i) => (
          step === "→" ? (
            <motion.span 
              key={i} 
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ color: colors.teal }}
            >
              →
            </motion.span>
          ) : (
            <motion.div 
              key={i} 
              variants={scaleIn}
              whileHover={{ scale: 1.05 }}
              className="rounded-lg px-3 py-2 text-xs text-white" 
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {step}
            </motion.div>
          )
        ))}
      </div>
      
      <motion.p 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-center text-sm mb-6" 
        style={{ color: colors.muted }}
      >
        ↻ Cycle restarts — every engagement makes the next one better
      </motion.p>
      
      <div className="grid grid-cols-2 gap-4">
        <Card dark headerColor={colors.teal} header="Pricing Intelligence Loop">
          <p className="text-sm text-gray-300">Real cost data from completed projects feeds back into the Proposal Generator. Pricing accuracy improves with every engagement.</p>
        </Card>
        <Card dark headerColor={colors.amber} header="Reactivation Learning Loop">
          <p className="text-sm text-gray-300">Agent learns which pillars each client has used — targets unused ones. Every completed engagement creates smarter cross-sell.</p>
        </Card>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-center italic mt-6 z-10 text-white"
    >
      "McKinsey's memory lives in retiring partners' heads. Ours lives in a system that never forgets."
    </motion.p>
  </div>
);

// Slide 19: Section - Products
const Slide19 = () => <SectionDivider title="The Products We're Launching" subtitle="Services + Products = A fundamentally different kind of company" />;

// Slide 20: Day Learning
const Slide20 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.div {...fadeInUp} className="mb-6">
      <h1 className="text-4xl font-bold" style={{ color: colors.darkText }}>Day Learning</h1>
      <p style={{ color: colors.purple }}>AI Upskilling Platform</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-6 flex-1">
      <motion.div 
        variants={fadeInLeft}
        className="rounded-xl p-6" 
        style={{ backgroundColor: colors.darkBg }}
      >
        <p className="font-bold text-white mb-4">Named After Thomas Day</p>
        <p className="text-sm text-gray-300 leading-relaxed">
          A Black man during the slave trade era in North Carolina. His furniture craftsmanship was so exceptional he became the largest employer in his entire state. Not despite where he came from. Because of how good he was.
        </p>
      </motion.div>
      
      <motion.div variants={fadeInRight}>
        <p className="font-bold text-sm mb-3" style={{ color: colors.purple }}>Track 1: AI Engineering</p>
        <div className="grid grid-cols-3 gap-2">
          {["1. Apply", "2. AI Screens", "3. Onboard", "4. Video Training", "5. Build Real Project", "6. Review & Graduate"].map((step, i) => (
            <motion.div 
              key={i} 
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
              className="rounded-lg p-2 text-center text-xs font-medium text-white" 
              style={{ backgroundColor: colors.purple }}
            >
              {step}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-lg p-4 mt-4"
      style={{ backgroundColor: colors.warmBg }}
    >
      <p className="text-sm text-center" style={{ color: colors.bodyText }}>
        Strategic loop: Academy trains → Talent places → Operate deploys → <span className="font-bold">Every THCO hire should be a Day Learning graduate</span>
      </p>
    </motion.div>
  </div>
);

// Slide 21: Product Portfolio
const Slide21 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.warmBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-6" style={{ color: colors.darkText }}>
      Product Portfolio
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-6">
      <motion.div variants={fadeInLeft}>
        <Card headerColor={colors.teal} header="Pebbles">
          <p className="text-sm" style={{ color: colors.bodyText }}>
            Benefits election & payroll support platform for the Nigerian market. Compliance-safe. Auditable. Enterprise-grade. <span className="font-bold">Services scale linearly. Products scale exponentially.</span>
          </p>
        </Card>
      </motion.div>
    </motion.div>
    
    <motion.div 
      variants={staggerItem}
      initial="initial"
      animate="animate"
      className="rounded-xl p-6"
      style={{ backgroundColor: colors.darkBg }}
    >
      <p className="font-bold text-white text-lg mb-2">2028: A CEO in Nairobi needs to restructure their tech division.</p>
      <p style={{ color: colors.teal }}>
        They don't call McKinsey. They call THCO. Within 48 hours, Advisory agents produce a first-draft assessment. Day Learning upskills the team. Talent fills new roles. Technology builds infrastructure. Operate manages it ongoing. One call. One relationship. Full transformation.
      </p>
    </motion.div>
  </div>
);

// Slide 22: Section - New Structure
const Slide22 = () => <SectionDivider title="The New Structure" subtitle="Where you sit. How you connect to revenue." />;

// Slide 23: Three Organisational Layers
const Slide23 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-3xl font-bold mb-6" style={{ color: colors.darkText }}>
      Three Organisational Layers
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 mb-6">
      {[
        { layer: "LAYER 1", name: "Strategic Professionals", desc: "Client-facing. Partners, sales, engineering leadership, talent leads, brand. AI prepares everything — they deliver.", team: "Rebecca, Havilah, Godwin", color: colors.deepPurple },
        { layer: "LAYER 2", name: "Agent Operations", desc: "THCO's engine room and moat. Build, maintain, and optimise the AI agent fleet. What makes us fundamentally different.", team: "Emmanuel, Tunde, Friday", color: colors.teal },
        { layer: "LAYER 3", name: "Delivery Engine", desc: "Execute. Operations, fulfilment, recruiting, marketing, admin. Without this layer, nothing ships. You are the backbone.", team: "Victoria, Christiana, Recruiter Pods", color: colors.amber },
      ].map((item, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          whileHover={{ x: 8 }}
          className="rounded-xl p-5 bg-white shadow-sm" 
          style={{ borderLeft: `6px solid ${item.color}` }}
        >
          <p className="text-xs font-bold tracking-wider mb-1" style={{ color: item.color }}>{item.layer}</p>
          <p className="font-bold text-lg mb-2" style={{ color: colors.darkText }}>{item.name}</p>
          <p className="text-sm mb-2" style={{ color: colors.bodyText }}>{item.desc}</p>
          <p className="text-xs italic" style={{ color: colors.muted }}>{item.team}</p>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="text-sm" 
      style={{ color: colors.purple }}
    >
      <span className="font-bold">A-Team (cross-functional):</span> Rebecca · Tunde · Emmanuel · Friday — go where the biggest need is
    </motion.p>
  </div>
);

// Slide 24: Your Role Is Upgrading
const Slide24 = () => (
  <div className="h-full flex flex-col p-12 relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <motion.div {...fadeInUp} className="mb-6 z-10">
      <h1 className="text-4xl font-bold text-white mb-1">Your Role Is Upgrading</h1>
      <p style={{ color: colors.teal }}>Same people. Upgraded roles.</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 z-10">
      {[
        { before: "Operations", after: "Operations Strategist", change: "Start every morning with an automated briefing. Move from gathering data to making decisions" },
        { before: "Marketing", after: "Brand Architect", change: "Direct an engine that produces content at the scale of a team 10x your size" },
        { before: "Technology", after: "AI Systems Builder", change: "Build the agent infrastructure that powers this entire company" },
      ].map((row, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          whileHover={{ x: 8, backgroundColor: 'rgba(255,255,255,0.08)' }}
          className="rounded-lg p-4" 
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-4 mb-2">
            <span className="text-gray-400">{row.before}</span>
            <motion.span 
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ color: colors.teal }}
            >
              →
            </motion.span>
            <span className="font-bold text-white">{row.after}</span>
          </div>
          <p className="text-sm text-gray-400">{row.change}</p>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

// Slide 25: What Changes When
const Slide25 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-8" style={{ color: colors.darkText }}>
      What Changes and When
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 flex-1">
      {[
        { time: "This Week", desc: "Execution rhythm introduced. Clear KPIs per role. Planning Mondays. Check-ins Wednesdays. Demos Fridays.", color: colors.amber },
        { time: "By May", desc: "Leadership programme launches. Agent operations maturing. Day Learning opens first track. Agents supporting daily work.", color: colors.purple },
        { time: "By December", desc: "Every team has agents embedded in daily workflow. Not experimental. Not optional. Standard operating procedure.", color: colors.teal },
      ].map((item, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          whileHover={{ x: 8 }}
          className="rounded-xl p-5 bg-white shadow-sm" 
          style={{ borderLeft: `6px solid ${item.color}` }}
        >
          <p className="font-bold text-lg mb-2" style={{ color: item.color }}>{item.time}</p>
          <p className="text-sm" style={{ color: colors.bodyText }}>{item.desc}</p>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="text-sm italic mt-4" 
      style={{ color: colors.purple }}
    >
      The transition is phased. But it is happening. Lean in early — grow fastest.
    </motion.p>
  </div>
);

// Slide 26: Section - The Standard
const Slide26 = () => <SectionDivider title="The Standard" subtitle="We'll be demanding. And we'll be supportive. High standards with real investment." />;

// Slide 27: Extreme Ownership
const Slide27 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.lightBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-8" style={{ color: colors.darkText }}>
      Extreme Ownership & 2:1 Minimum
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-6 mb-6">
      <motion.div variants={fadeInLeft}>
        <Card headerColor={colors.deepPurple} header="Extreme Ownership">
          <ul className="space-y-2 text-sm" style={{ color: colors.bodyText }}>
            <li>• Don't wait to be chased</li>
            <li>• Close loops — do what you said</li>
            <li>• Fix what you touch</li>
            <li>• Every lead owns a number</li>
          </ul>
          <p className="text-sm italic mt-4" style={{ color: colors.muted }}>Test: If I'm unavailable for one full week, does the company continue delivering?</p>
        </Card>
      </motion.div>
      
      <motion.div variants={fadeInRight}>
        <Card headerColor={colors.teal} header="2:1 Minimum">
          <p className="text-sm mb-4" style={{ color: colors.bodyText }}>
            Your work is clear. Your work is sharp. Your thinking is structured. Your output is not average.
          </p>
          <p className="text-sm font-bold" style={{ color: colors.darkText }}>
            If the design doesn't match Accenture, don't post it. If the thinking doesn't match McKinsey, don't send it.
          </p>
        </Card>
      </motion.div>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-lg p-4"
      style={{ backgroundColor: colors.warmBg }}
    >
      <p className="text-sm text-center" style={{ color: colors.bodyText }}>
        Thoughtful mistakes from speed and ambition = growth. Careless mistakes from not checking = what we're leaving behind.
      </p>
    </motion.div>
  </div>
);

// Slide 28: Leadership Training
const Slide28 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.warmBg }}>
    <motion.div {...fadeInUp} className="mb-6">
      <h1 className="text-3xl font-bold" style={{ color: colors.darkText }}>Leadership Training Programme</h1>
      <p style={{ color: colors.purple }}>Launching May 2026</p>
    </motion.div>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        {["Decision-making under pressure", "Communication & management", "Execution rhythm", "Hiring & performance standards", "Leading in an AI-enabled world"].map((topic, i) => (
          <motion.div 
            key={i} 
            variants={staggerItem}
            whileHover={{ x: 6 }}
            className="rounded-lg p-3 bg-white shadow-sm" 
            style={{ borderLeft: `4px solid ${colors.purple}` }}
          >
            <p className="text-sm" style={{ color: colors.darkText }}>{topic}</p>
          </motion.div>
        ))}
      </div>
      
      <motion.div 
        variants={fadeInRight}
        className="rounded-xl p-6" 
        style={{ backgroundColor: colors.darkBg }}
      >
        <p className="font-bold text-white text-lg mb-2">This is not a training exercise.</p>
        <p className="font-bold text-lg mb-4" style={{ color: colors.teal }}>This is succession planning.</p>
        <p className="text-sm text-gray-300">
          The people we invest in are the people we see running parts of this company in 12-24 months.
        </p>
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="text-sm italic mt-6" 
      style={{ color: colors.purple }}
    >
      We are building a company where leaders are produced, not where only founders drive momentum.
    </motion.p>
  </div>
);

// Slide 29: Section - Big Goals
const Slide29 = () => <SectionDivider title="The Big Audacious Goals" subtitle="24-Month Targets — December 2027" />;

// Slide 30: By December 2027
const Slide30 = () => (
  <div className="h-full flex flex-col p-12 relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold text-white mb-8 z-10">
      By December 2027
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-4 gap-4 mb-8 z-10">
      <StatBox value="10,000" label="People trained through Day Learning" color={colors.purple} />
      <StatBox value="6" label="Continents with physical THCO presence" color={colors.teal} />
      <StatBox value="1,000" label="Active client relationships" color={colors.amber} />
      <StatBox value="₦1M" label="Minimum salary for every team member" color={colors.green} />
    </motion.div>
    
    <motion.div {...fadeInUp} className="z-10">
      <p className="text-gray-400 mb-4">Built on real logic. Real pipeline. Real math.</p>
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className="rounded-lg p-4" 
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <p className="text-white">We will track this publicly. Updated monthly. Visible to everyone. <span style={{ color: colors.teal }}>Transparent. No hiding.</span></p>
      </motion.div>
    </motion.div>
  </div>
);

// Slide 31: Excellence Rewarded
const Slide31 = () => (
  <div className="h-full flex flex-col p-12" style={{ backgroundColor: colors.warmBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold mb-8" style={{ color: colors.darkText }}>
      Excellence. Rewarded Loudly.
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <motion.div 
        variants={scaleIn}
        whileHover={{ scale: 1.02 }}
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: colors.darkBg }}
      >
        <p className="font-bold text-white text-2xl mb-2">The highest-performing THCO team member this year will receive a car.</p>
        <p style={{ color: colors.amber }}>Measured transparently against KPIs. No maybe. No raffle. Performance, rewarded.</p>
      </motion.div>
      
      <Card headerColor={colors.purple} header="Competing with the Giants">
        <p className="text-sm" style={{ color: colors.bodyText }}>
          A company built from Lagos and Toronto. Powered by AI agents, data connections, and automated workflows. Staffed by people most of the world would overlook. Delivering work the world has to respect. Already proven. Now we do it again and again until the market cannot ignore us.
        </p>
      </Card>
    </motion.div>
  </div>
);

// Slide 32: Three Commitments
const Slide32 = () => (
  <div className="h-full flex flex-col p-12 relative overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
    <motion.h1 {...fadeInUp} className="text-4xl font-bold text-white mb-8 z-10">
      Three Commitments
    </motion.h1>
    
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 z-10">
      {[
        { time: "By Friday", desc: "Every person identifies one task and begins automating it", color: colors.amber },
        { time: "By May", desc: "Leadership programme running. Day Learning live. Everyone completes AI intro module.", color: colors.purple },
        { time: "By December", desc: "Every team has agents embedded in daily workflow. Not experimental. Not optional. Standard.", color: colors.teal },
      ].map((item, i) => (
        <motion.div 
          key={i} 
          variants={staggerItem}
          whileHover={{ x: 8, backgroundColor: 'rgba(255,255,255,0.08)' }}
          className="rounded-lg p-5" 
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderLeft: `6px solid ${item.color}` }}
        >
          <p className="font-bold text-lg mb-1" style={{ color: item.color }}>{item.time}</p>
          <p className="text-gray-300">{item.desc}</p>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="text-xl font-bold mt-8 z-10" 
      style={{ color: colors.amber }}
    >
      THCO is not a spectator company. We are builders.
    </motion.p>
  </div>
);

// Slide 33: Closing
const Slide33 = () => (
  <div className="h-full flex flex-col justify-center items-center relative overflow-hidden px-16" style={{ backgroundColor: colors.darkBg }}>
    <DecorativeOval className="w-[700px] h-[500px] top-10 right-0" delay={0} />
    <DecorativeOval className="w-[500px] h-[400px] bottom-10 left-10" delay={0.3} color={colors.teal} />
    <DecorativeOval className="w-[400px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" delay={0.5} />
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="text-center z-10 max-w-4xl"
    >
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg mb-4" 
        style={{ color: colors.muted }}
      >
        Steam. Electricity. Internet. Africa was late to all three.
      </motion.p>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-bold text-white mb-8"
      >
        AI is the fourth wave. We are not going to be late.
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.6, type: "spring" }}
        className="text-7xl font-bold mb-6"
        style={{ color: colors.teal }}
      >
        The Future Is Now.
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-3xl text-white mb-10"
      >
        Let's go build it.
      </motion.p>
      
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="w-32 h-1 mx-auto mb-6"
        style={{ backgroundColor: colors.teal }}
      />
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="text-sm"
        style={{ color: colors.purple }}
      >
        Built from Lagos. Built from Toronto. Built from right here.
      </motion.p>
    </motion.div>
  </div>
);

// ============ MAIN COMPONENT ============

const THCOTownHall2026V2 = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const navigate = useNavigate();
  const totalPages = 33;

  const pages = [
    Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10,
    Slide11, Slide12, Slide13, Slide14, Slide15, Slide16, Slide17, Slide18, Slide19, Slide20,
    Slide21, Slide22, Slide23, Slide24, Slide25, Slide26, Slide27, Slide28, Slide29, Slide30,
    Slide31, Slide32, Slide33
  ];
  const CurrentPageComponent = pages[currentPage - 1];

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

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
    setTimeout(() => {
      setIsGeneratingPdf(false);
      alert("PDF download - connect to your PDF generation service");
    }, 1000);
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ backgroundColor: colors.darkBg, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-50 bg-white/95 backdrop-blur-sm border-b" style={{ borderColor: colors.lightBg }}>
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity" 
          style={{ color: colors.muted }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wider" style={{ color: colors.teal }}>THCO</span>
          <span className="text-sm" style={{ color: colors.muted }}>Town Hall 2026</span>
        </div>
        <button 
          onClick={handleDownloadPdf} 
          disabled={isGeneratingPdf} 
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" 
          style={{ backgroundColor: colors.purple }}
        >
          {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isGeneratingPdf ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {/* Page Content */}
      <div className="absolute inset-0 pt-14">
        <AnimatePresence mode="wait">
          <motion.div key={currentPage} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
            <CurrentPageComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      {currentPage > 1 && (
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={prevPage} 
          className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform z-40 shadow-lg" 
          style={{ backgroundColor: colors.purple }}
        >
          <ChevronLeft className="w-7 h-7 text-white" />
        </motion.button>
      )}
      {currentPage < totalPages && (
        <motion.button 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={nextPage} 
          className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform z-40 shadow-lg" 
          style={{ backgroundColor: colors.teal }}
        >
          <ChevronRight className="w-7 h-7 text-white" />
        </motion.button>
      )}

      {/* Pagination Dots */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 z-40 flex-wrap px-12">
        {Array.from({ length: totalPages }, (_, i) => (
          <motion.button
            key={i}
            onClick={() => goToPage(i + 1)}
            whileHover={{ scale: 1.5 }}
            className="w-2 h-2 rounded-full transition-all"
            style={{ 
              backgroundColor: currentPage === i + 1 ? colors.teal : 'rgba(255,255,255,0.3)',
              transform: currentPage === i + 1 ? "scale(1.4)" : "scale(1)"
            }}
          />
        ))}
      </div>

      {/* Page Counter */}
      <div className="absolute bottom-6 right-8 text-sm font-medium z-40" style={{ color: colors.teal }}>
        {currentPage} / {totalPages}
      </div>
    </div>
  );
};

export default THCOTownHall2026V2;
