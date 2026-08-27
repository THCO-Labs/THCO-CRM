// Where you go to satisfy a gate condition.
//
// A red condition tells you what is missing and then leaves you to work out
// where to put it. On a seventeen-stage machine with four tabs and eleven
// drawers, that is a real hunt — and the person hunting is usually the one who
// least wants to be learning the interface right now.
//
// Keyed by the gate's `auto` key, which is the same string the backend uses in
// `_resolve_gate`, so a condition and its fix cannot drift apart silently.
// Conditions with `auto: null` are judgement calls with nothing to open, and
// are deliberately absent.
//
// `tab` and `drawer` are read by ProjectWorkspace from the URL, so these
// double as shareable links: sending somebody
// `/flow/projects/{id}?drawer=demos` opens the drawer for them.

export const GATE_FIXES = {
  has_outcome: {
    action: "Edit the project details",
    hint: "The desired outcome is on the project header, under Edit details.",
    edit: true,
  },
  has_source: {
    action: "Add the brief or a transcript",
    hint: "Anything the client sent or said — a document, or pasted text.",
    drawer: "documents",
  },
  has_tsd: {
    action: "Name the TSD",
    hint: "Chosen in this dialog, in the field below.",
  },
  tsd_accepted: {
    action: "Accept the project",
    hint: "The three buttons under the project title. Accepting is what clears this.",
  },
  has_requirements: {
    action: "Add requirements",
    hint: "Three at minimum. Product tab.",
    tab: "product",
  },
  has_product_brief: {
    action: "Write the Product Brief",
    hint: "Product tab. Only the problem statement is required to save one.",
    tab: "product",
  },
  has_journeys: {
    action: "Add a user journey",
    hint: "Product tab, under User journeys.",
    tab: "product",
  },
  has_architect: {
    action: "The Senior Partner names the architect",
    hint: "This one is not yours to clear — stage 6 waits on them by design.",
    blockedByOther: true,
  },
  has_architecture: {
    action: "Upload the architecture",
    hint: "Architecture drawer. Only this project's named architect can.",
    drawer: "architecture",
  },
  has_demo_materials: {
    action: "Attach what the client will be shown",
    hint: "Demos drawer — a prototype link or an uploaded file both count.",
    drawer: "demos",
  },
  demo_held: {
    action: "Mark the demo held",
    hint: "Demos drawer, on the round you showed them.",
    drawer: "demos",
  },
  has_feedback: {
    action: "Capture what the client said",
    hint: "Client feedback drawer. The TSD is the single channel for this.",
    drawer: "feedback",
  },
  demo_validated: {
    action: "Record the demo outcome",
    hint: "Demos drawer — Client validated is what clears this.",
    drawer: "demos",
  },
  has_pod: {
    action: "Form the pod",
    hint: "Build tab, under Pod.",
    tab: "build",
  },
  has_milestones: {
    action: "Add a milestone",
    hint: "Build tab, under Milestones.",
    tab: "build",
  },
  board_build_clear: {
    action: "Clear the build columns",
    hint: "Every card must be in QA Review or Done. Opens the project board.",
    board: true,
  },
  board_qa_clear: {
    action: "Clear the QA Review column",
    hint: "Move or close the cards sitting in QA Review. Opens the project board.",
    board: true,
  },
  closure_complete: {
    action: "Work through the closure checklist",
    hint: "All ten items. Closure checklist drawer.",
    drawer: "closure",
  },
};

/**
 * Where clicking this condition should go.
 * Returns null when there is nothing to open — a judgement call, or somebody
 * else's job — so the caller can render it as plain text rather than a
 * dead link.
 */
export function fixFor(condition) {
  if (!condition?.auto || condition.satisfied !== false) return null;
  return GATE_FIXES[condition.auto] || null;
}

/** The URL that opens the right place on a project. */
export function fixHref(projectId, fix) {
  if (!fix) return null;
  if (fix.board) return `/tasks?project=${projectId}`;
  if (fix.tab) return `/flow/projects/${projectId}?tab=${fix.tab}`;
  if (fix.drawer) return `/flow/projects/${projectId}?drawer=${fix.drawer}`;
  if (fix.edit) return `/flow/projects/${projectId}?edit=1`;
  return `/flow/projects/${projectId}`;
}
