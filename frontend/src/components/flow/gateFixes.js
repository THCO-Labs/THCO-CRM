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
// `tab`, `drawer` and `focus` are read by ProjectWorkspace from the URL, so
// these double as shareable links: sending somebody
// `/flow/projects/{id}?drawer=demos` opens the drawer for them.
//
// `focus` names the section *inside* a tab and is what makes the link land on
// the actual control. Opening the Product tab and leaving somebody to find
// Requirements among three sections is most of the hunt this exists to remove:
// the condition says "add requirements", so the link opens the add form and
// scrolls to it.

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
    hint: "Three at minimum. Opens the form.",
    tab: "product",
    focus: "requirements",
  },
  has_product_brief: {
    action: "Write the Product Brief",
    hint: "Opens the brief. Only the problem statement is required to save it.",
    tab: "product",
    focus: "brief",
  },
  has_journeys: {
    action: "Add a user journey",
    hint: "Opens the form under User journeys.",
    tab: "product",
    focus: "journeys",
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
    hint: "Opens the pod, on the Build tab.",
    tab: "build",
    focus: "pod",
  },
  has_milestones: {
    action: "Add a milestone",
    hint: "Opens the form under Milestones.",
    tab: "build",
    focus: "milestones",
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
  if (fix.tab) {
    const focus = fix.focus ? `&focus=${fix.focus}` : "";
    return `/flow/projects/${projectId}?tab=${fix.tab}${focus}`;
  }
  if (fix.drawer) return `/flow/projects/${projectId}?drawer=${fix.drawer}`;
  if (fix.edit) return `/flow/projects/${projectId}?edit=1`;
  return `/flow/projects/${projectId}`;
}
