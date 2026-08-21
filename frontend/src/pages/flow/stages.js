// Crowther OS delivery lifecycle, browser side.
//
// The backend is the source of truth: backend/services/delivery_stages.py.
// GET /api/flow/meta returns the stages, phases, gates and playbooks, so
// anything that needs the full detail should read that rather than hardcode it.
//
// What lives here is only what the browser needs before that call returns, or
// to paint something: labels, colours and the phase grouping. Keep it in step
// with the Python module.

export const PHASES = {
  intake:     { label: "Intake",     order: 1, accent: "#4C5B6B" },
  definition: { label: "Definition", order: 2, accent: "#1FB58A" },
  design:     { label: "Design",     order: 3, accent: "#2D6A4F" },
  // Gold, not amber. Amber is reserved across this app for "Under Review",
  // the one status that asks somebody to act.
  validation: { label: "Validation", order: 4, accent: "#C6A15B" },
  delivery:   { label: "Delivery",   order: 5, accent: "#1B4332" },
  close:      { label: "Close",      order: 6, accent: "#14342A" },
};

export const PHASE_ORDER = ["intake", "definition", "design", "validation", "delivery", "close"];

export const STAGES = {
  1:  { key: "intake",             label: "Client Project Intake",                phase: "intake",     owner: "commercial" },
  2:  { key: "tsd_assignment",     label: "TSD Assignment",                       phase: "intake",     owner: "senior_partner" },
  3:  { key: "tsd_receives",       label: "TSD Receives Project",                 phase: "intake",     owner: "tsd" },
  4:  { key: "discovery",          label: "TSD Intake and Discovery",             phase: "definition", owner: "tsd" },
  5:  { key: "product_definition", label: "Product Definition and Outcome Brief", phase: "definition", owner: "tsd" },
  6:  { key: "request_architect",  label: "Request Solution Architect",           phase: "design",     owner: "senior_partner" },
  7:  { key: "scoping",            label: "Product Discovery and Scoping",        phase: "design",     owner: "tsd" },
  8:  { key: "architecture",       label: "Solution Architecture",                phase: "design",     owner: "solution_architect" },
  9:  { key: "demo",               label: "Mockup and Demo",                      phase: "validation", owner: "solution_architect" },
  10: { key: "feedback",           label: "Client Feedback and Iteration",        phase: "validation", owner: "tsd" },
  11: { key: "validation",         label: "Validation and Readiness",             phase: "validation", owner: "tsd" },
  12: { key: "delivery_prep",      label: "Delivery Preparation",                 phase: "delivery",   owner: "tsd" },
  13: { key: "build",              label: "Engineering and Build",                phase: "delivery",   owner: "solution_architect" },
  14: { key: "qa",                 label: "QA and Testing",                       phase: "delivery",   owner: "solution_architect" },
  15: { key: "acceptance",         label: "Client Acceptance and UAT",            phase: "close",      owner: "tsd" },
  16: { key: "handover",           label: "Handover",                             phase: "close",      owner: "tsd" },
  17: { key: "closure",            label: "Project Closure",                      phase: "close",      owner: "tsd" },
};

export const FIRST_STAGE = 1;
export const LAST_STAGE = 17;

// Client validation. Scope freezes here, and it is the gate the whole system
// turns on: a demo is not permission to build.
export const VALIDATION_STAGE = 11;
export const BUILD_STAGE = 13;

// Short labels for the function roles, for chips and owner lines.
export const FUNCTION_LABELS = {
  senior_partner: "Senior Partner",
  commercial: "Commercial",
  tsd: "TSD",
  solution_architect: "Solution Architect",
  engineer: "Engineer",
  product_designer: "Product Designer",
  qa: "QA",
  talent_sd: "TalentSD",
  people_ops: "People & Ops",
  legal: "Legal",
  finance: "Finance",
};

export const HEALTH = {
  GREEN: { label: "On track", dot: "bg-[#1FB58A]", text: "text-[#1B4332]", ring: "border-[#1FB58A]/30" },
  AMBER: { label: "At risk",  dot: "bg-amber-500", text: "text-amber-700", ring: "border-amber-300" },
  RED:   { label: "Blocked",  dot: "bg-red-500",   text: "text-red-700",   ring: "border-red-300" },
};

// Workstream status vocabularies, from SPEC appendix A. Used for the compact
// status strip on the project page.
export const WORKSTREAM_LABELS = {
  product_status: "Product",
  architecture_status: "Architecture",
  demo_status: "Demo",
  client_status: "Client",
  talent_status: "Talent",
  qa_status: "QA",
  commercial_status: "Commercial",
};

export const stageLabel = (stage) => STAGES[stage]?.label ?? "Unknown";
export const stagePhase = (stage) => STAGES[stage]?.phase ?? "intake";
export const phaseAccent = (phase) => PHASES[phase]?.accent ?? "#4C5B6B";

/** Human sentence for where a project is, e.g. "Stage 8 of 17 . Solution Architecture". */
export const stageSummary = (stage) =>
  `Stage ${stage} of ${LAST_STAGE} · ${stageLabel(stage)}`;

// A status value that reads as a word rather than a database enum.
export const humanise = (value) =>
  !value ? "" : String(value).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Build sub-status, for a project that has reached Engineering. This survives
// the lifecycle change unaltered: it describes how the build is going, not
// where the project is.
export const BUILD_STATUS_LABELS = {
  planning:     { label: "Planning",     color: "bg-gray-100 text-gray-700" },
  building:     { label: "Building",     color: "bg-blue-100 text-blue-700" },
  blocked:      { label: "Blocked",      color: "bg-red-100 text-red-700" },
  ready_for_qa: { label: "Ready for QA", color: "bg-emerald-100 text-emerald-700" },
};

// Column accent for a stage, taken from its phase rather than set per stage.
// Seventeen hand-picked borders would be noise; the phase is the thing a
// reader is actually tracking.
export const PHASE_BORDER = {
  intake:     "border-[#4C5B6B]",
  definition: "border-[#1FB58A]",
  design:     "border-[#2D6A4F]",
  validation: "border-[#C6A15B]",
  delivery:   "border-[#1B4332]",
  close:      "border-[#14342A]",
};

export const STAGE_BORDER = new Proxy(
  {},
  {
    get: (_target, stage) => PHASE_BORDER[stagePhase(Number(stage))] ?? "border-gray-300",
  }
);
