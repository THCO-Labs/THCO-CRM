"""The Crowther OS delivery lifecycle: stages, phases, gates and playbooks.

This module is the single source of truth for the shape of the pipeline. The
router reads it, the migration reads it, and `frontend/src/pages/flow/stages.js`
mirrors the parts the browser needs. Change a stage here and nowhere else on
the backend.

Three things live here, and they are deliberately separate:

STAGES      what the stages are, who owns each one, and which phase it sits in.
STAGE_GATES what must be true before a project may leave a stage. Taken from
            SPEC section 28. In this first version they are checkboxes a human
            ticks; the tick is recorded against their name. Later some of them
            resolve from data, and the shape of the record does not change.
PLAYBOOKS   what to actually do while in a stage. Taken from the Inputs / Core
            Activities / Outputs lists in SPEC sections 6 to 23.

The playbook is why this product can answer "what happens next" without an AI
model. The specification already wrote the answer down for every stage; it only
had to be typed in rather than generated.
"""

from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Phases
# ---------------------------------------------------------------------------
# Seventeen columns is unusable, so the board groups stages into six phases and
# shows the stage as a line inside the card. Amber is reserved across this app
# for "Under Review" alone, so the phase that waits on the client uses gold.
PHASES: Dict[str, Dict[str, Any]] = {
    "intake":     {"label": "Intake",     "order": 1, "accent": "#4C5B6B"},
    "definition": {"label": "Definition", "order": 2, "accent": "#1FB58A"},
    "design":     {"label": "Design",     "order": 3, "accent": "#2D6A4F"},
    "validation": {"label": "Validation", "order": 4, "accent": "#C6A15B"},
    "delivery":   {"label": "Delivery",   "order": 5, "accent": "#1B4332"},
    "close":      {"label": "Close",      "order": 6, "accent": "#14342A"},
}

# ---------------------------------------------------------------------------
# Stages
# ---------------------------------------------------------------------------
# `owner` is the function_role accountable for moving the project out of this
# stage. It drives both the notification on arrival and the label on the
# next-step panel. `notify` is who else hears about the arrival.
STAGES: Dict[int, Dict[str, Any]] = {
    1: {
        "key": "intake", "label": "Client Project Intake",
        "phase": "intake", "owner": "commercial", "notify": ["tsd", "senior_partner"],
    },
    2: {
        "key": "tsd_assignment", "label": "TSD Assignment",
        "phase": "intake", "owner": "senior_partner", "notify": [],
    },
    3: {
        "key": "tsd_receives", "label": "TSD Receives Project",
        "phase": "intake", "owner": "tsd", "notify": [],
    },
    4: {
        "key": "discovery", "label": "TSD Intake and Discovery",
        "phase": "definition", "owner": "tsd", "notify": [],
    },
    5: {
        "key": "product_definition", "label": "Product Definition and Outcome Brief",
        "phase": "definition", "owner": "tsd", "notify": [],
    },
    6: {
        "key": "request_architect", "label": "Request Solution Architect",
        "phase": "design", "owner": "senior_partner", "notify": ["tsd"],
    },
    7: {
        "key": "scoping", "label": "Product Discovery and Scoping",
        "phase": "design", "owner": "tsd", "notify": ["solution_architect", "product_designer"],
    },
    8: {
        "key": "architecture", "label": "Solution Architecture",
        "phase": "design", "owner": "solution_architect", "notify": ["tsd"],
    },
    9: {
        "key": "demo", "label": "Mockup and Demo",
        "phase": "validation", "owner": "solution_architect", "notify": ["tsd", "product_designer"],
    },
    10: {
        "key": "feedback", "label": "Client Feedback and Iteration",
        "phase": "validation", "owner": "tsd", "notify": ["solution_architect"],
    },
    11: {
        "key": "validation", "label": "Validation and Readiness",
        "phase": "validation", "owner": "tsd", "notify": ["senior_partner"],
    },
    12: {
        "key": "delivery_prep", "label": "Delivery Preparation and Pod Formation",
        "phase": "delivery", "owner": "tsd", "notify": ["solution_architect", "talent_sd"],
    },
    13: {
        "key": "build", "label": "Engineering and Build",
        "phase": "delivery", "owner": "solution_architect", "notify": ["tsd"],
    },
    14: {
        "key": "qa", "label": "QA and Testing",
        "phase": "delivery", "owner": "solution_architect", "notify": ["qa", "tsd"],
    },
    15: {
        "key": "acceptance", "label": "Client Acceptance and UAT",
        "phase": "close", "owner": "tsd", "notify": [],
    },
    16: {
        "key": "handover", "label": "Handover",
        "phase": "close", "owner": "tsd", "notify": [],
    },
    17: {
        "key": "closure", "label": "Project Closure",
        "phase": "close", "owner": "tsd", "notify": ["senior_partner"],
    },
}

FIRST_STAGE = 1
LAST_STAGE = 17

# Client validation. Scope freezes on arrival here, and this is the gate the
# whole system turns on: a demo is not permission to build (SPEC section 17).
VALIDATION_STAGE = 11
BUILD_STAGE = 13

# Iterating on a demo is the designed behaviour rather than a correction, so
# this one backward move does not demand a written reason the way the others do.
DEMO_ITERATION_MOVE = (10, 9)

# ---------------------------------------------------------------------------
# Gates (SPEC section 28)
# ---------------------------------------------------------------------------
# Every condition a project must satisfy before it may leave a stage. `auto` is
# the key a later version resolves from data; `None` means a human judgement
# that will always be a tick.
STAGE_GATES: Dict[int, List[Dict[str, Optional[str]]]] = {
    1: [
        {"label": "Project form submitted with client and outcome", "auto": "has_outcome"},
        {"label": "Source information attached (brief, transcript or document)", "auto": "has_source"},
    ],
    2: [
        {"label": "TSD selected", "auto": "has_tsd"},
    ],
    3: [
        {"label": "TSD has reviewed the source information", "auto": None},
        # Was a judgement call with nothing behind it. The TSD now accepts the
        # project explicitly -- one click, which tells the Senior Partner -- so
        # this is a fact the system can check rather than a tick somebody gives
        # themselves. Handing a project over and never hearing back was the
        # gap; the acceptance is the answer.
        {"label": "TSD accepts ownership of the project", "auto": "tsd_accepted"},
    ],
    4: [
        {"label": "Client context understood and recorded", "auto": None},
        {"label": "At least three requirements captured", "auto": "has_requirements"},
        {"label": "Open questions listed or resolved", "auto": None},
    ],
    5: [
        {"label": "Product Brief exists", "auto": "has_product_brief"},
        {"label": "Problem and outcomes defined", "auto": None},
        {"label": "Success metrics defined", "auto": None},
        {"label": "Scope boundaries set", "auto": None},
    ],
    6: [
        {"label": "Senior Partner has selected the Solution Architect", "auto": "has_architect"},
    ],
    7: [
        {"label": "At least three requirements captured", "auto": "has_requirements"},
        {"label": "User journeys defined", "auto": "has_journeys"},
        {"label": "Technical feasibility validated", "auto": None},
        {"label": "Integrations and data needs identified", "auto": None},
    ],
    8: [
        {"label": "Architecture document uploaded", "auto": "has_architecture"},
        {"label": "Technical decisions recorded", "auto": None},
        {"label": "Solution Architect confirms the architecture is ready", "auto": None},
    ],
    9: [
        {"label": "Demo round created with materials", "auto": "has_demo_materials"},
        {"label": "Demo held with the client", "auto": "demo_held"},
    ],
    10: [
        {"label": "Client feedback captured against this demo round", "auto": "has_feedback"},
        {"label": "Feedback classified and impact understood", "auto": None},
        {"label": "Artefacts updated where the feedback required it", "auto": None},
    ],
    11: [
        {"label": "Client has validated the direction", "auto": "demo_validated"},
        {"label": "Final scope confirmed", "auto": None},
        {"label": "Acceptance criteria confirmed", "auto": None},
    ],
    12: [
        {"label": "Pod formed", "auto": "has_pod"},
        {"label": "Milestones defined", "auto": "has_milestones"},
        {"label": "Talent requirements raised where needed", "auto": None},
        {"label": "Delivery plan agreed", "auto": None},
    ],
    13: [
        {"label": "Build work complete on the board", "auto": "board_build_clear"},
        {"label": "Technical documentation updated", "auto": None},
    ],
    14: [
        {"label": "QA Review column clear", "auto": "board_qa_clear"},
        {"label": "Acceptance criteria tested", "auto": None},
        {"label": "Readiness decision recorded", "auto": None},
    ],
    15: [
        {"label": "Client acceptance received", "auto": None},
        {"label": "Outstanding acceptance issues resolved", "auto": None},
    ],
    16: [
        {"label": "Knowledge transfer complete", "auto": None},
        {"label": "Handover documentation delivered", "auto": None},
        {"label": "Operational readiness confirmed", "auto": None},
    ],
    17: [
        {"label": "Closure checklist complete", "auto": "closure_complete"},
        {"label": "Closure report produced", "auto": None},
    ],
}

# ---------------------------------------------------------------------------
# Playbooks (SPEC sections 6 to 23)
# ---------------------------------------------------------------------------
# What to do while you are in a stage. Rendered on the next-step panel. The
# `next` line is the one-sentence answer to "what happens next", which is the
# question the whole product exists to answer.
PLAYBOOKS: Dict[int, Dict[str, Any]] = {
    1: {
        "next": "Capture the client's objective and everything already said, then hand it to delivery.",
        "inputs": ["Client details", "Desired outcome", "Initial brief", "Transcripts", "Documents"],
        "activities": [
            "Create the project record",
            "Attach the brief, transcripts and any documents received",
            "Select a template where one fits",
        ],
        "outputs": ["Formal project record", "Source information attached"],
    },
    2: {
        "next": "Name the TSD who will own this client and this project.",
        "inputs": ["All submitted information", "TSD availability and experience"],
        "activities": ["Review the intake", "Select the best-fit TSD"],
        "outputs": ["TSD assigned and notified"],
    },
    3: {
        "next": "TSD reads the source material and accepts ownership.",
        "inputs": ["Source materials", "Project summary"],
        "activities": ["Accept ownership", "Review context", "Plan the first client conversation"],
        "outputs": ["Owned project workspace", "Initial action plan"],
    },
    4: {
        "next": "Talk to the client, fill the gaps, and write down what they actually need.",
        "inputs": ["Client brief", "Transcripts", "Documents"],
        "activities": [
            "Understand the context",
            "Identify gaps and ask clarification questions",
            "Record client decisions",
            "Capture initial requirements",
        ],
        "outputs": ["Validated context", "Discovery notes", "Open questions", "Initial requirements"],
    },
    5: {
        "next": "Turn discovery into a Product Brief the client would recognise as their problem.",
        "inputs": ["Discovery information", "Client goals", "Business constraints"],
        "activities": [
            "Define the problem",
            "Define outcomes and success metrics",
            "Set scope boundaries",
            "Document assumptions",
            "Build the Product Brief",
        ],
        "outputs": ["Product Brief", "Initial scope and success criteria"],
    },
    6: {
        "next": "Request a Solution Architect. The Senior Partner selects; this stage waits for them.",
        "inputs": ["Product Brief", "Open technical questions"],
        "activities": [
            "TSD requests an architect",
            "Senior Partner selects from the engineers who can architect",
        ],
        "outputs": ["Solution Architect named and notified"],
    },
    7: {
        "next": "Architect, designer and TSD turn the brief into a scoped, feasible product.",
        "inputs": ["Product Brief", "Requirements", "Client context"],
        "activities": [
            "Refine user needs and define the product flow",
            "Validate technical feasibility",
            "Identify integrations and data needs",
            "Establish scope",
            "Identify security and compliance needs",
        ],
        "outputs": ["Refined requirements", "User journeys", "Design direction"],
    },
    8: {
        "next": "Solution Architect uploads the architecture.",
        "inputs": ["Product Brief", "Requirements", "User journeys", "Integrations"],
        "activities": [
            "Produce the architecture: components, data, APIs, integrations, security, infrastructure",
            "Record technical decisions and open questions",
            "Upload the architecture document to the project",
        ],
        "outputs": ["Versioned architecture document", "Technical decisions"],
    },
    9: {
        "next": "Build something tangible and show it to the client.",
        "inputs": ["Product Brief", "Architecture", "User journeys", "Design direction"],
        "activities": [
            "Prepare wireframes or a prototype",
            "Build the first working model",
            "Prepare and hold the demo",
        ],
        "outputs": ["Demo round with materials", "Demo held"],
    },
    10: {
        "next": "Capture what the client said and decide whether to iterate or take it to validation.",
        "inputs": ["Demo outcome", "Client feedback", "Notes and transcripts"],
        "activities": [
            "Capture feedback against this demo round",
            "Classify each item: within scope, scope change, question or rejected",
            "Update requirements and artefacts where needed",
            "Decide: iterate on a further demo round, or move to validation",
        ],
        "outputs": ["Structured feedback", "Updated artefacts", "Demo outcome recorded"],
    },
    11: {
        "next": "Get the client to validate. Scope freezes the moment they do.",
        "inputs": ["Demo outcome", "Updated product and architecture", "Scope"],
        "activities": [
            "Confirm the final direction and scope",
            "Confirm acceptance criteria",
            "Record client validation",
        ],
        "outputs": ["CLIENT VALIDATED", "Scope frozen"],
    },
    12: {
        "next": "Form the pod, set the milestones, and raise any talent you need.",
        "inputs": ["Validated Product Brief", "Architecture", "Scope", "Acceptance criteria"],
        "activities": [
            "Create the delivery plan and milestones",
            "Identify pod roles and confirm internal resources",
            "Architect raises talent requirements; TSD confirms them",
            "Prepare the build board",
        ],
        "outputs": ["Pod", "Milestones", "Talent requirements raised"],
    },
    13: {
        "next": "Build it. Work is tracked on the project board.",
        "inputs": ["Architecture", "Requirements", "Design", "Acceptance criteria"],
        "activities": [
            "Break requirements into cards on the board",
            "Development, code review and integration",
            "Design QA as features become ready",
            "Keep technical documentation current",
        ],
        "outputs": ["Working product", "Build artefacts"],
    },
    14: {
        "next": "Test it against the acceptance criteria and clear the QA Review column.",
        "inputs": ["Working build", "Acceptance criteria", "Security requirements"],
        "activities": [
            "Test planning and execution",
            "Track defects as cards in QA Review",
            "Security and readiness checks",
            "Regression and retest",
        ],
        "outputs": ["QA result", "Defects closed", "Readiness decision"],
    },
    15: {
        "next": "Client tests it themselves and accepts.",
        "inputs": ["Validated build", "Acceptance criteria", "QA results"],
        "activities": ["Run UAT with the client", "Resolve outstanding acceptance issues", "Document acceptance"],
        "outputs": ["Client acceptance"],
    },
    16: {
        "next": "Hand it over so the client can run it without us.",
        "inputs": ["Accepted solution", "Documentation", "Operational requirements"],
        "activities": ["Knowledge transfer", "Handover documentation", "Training", "Operational readiness"],
        "outputs": ["Handover complete"],
    },
    17: {
        "next": "Close it out and write down what we learned.",
        "inputs": ["Acceptance", "Handover", "Closure checklist"],
        "activities": [
            "Work through the closure checklist",
            "Produce the closure report",
            "Capture lessons learned",
            "Close outstanding delivery actions",
        ],
        "outputs": ["Project completed", "Reusable knowledge"],
    },
}

# ---------------------------------------------------------------------------
# Closure checklist (SPEC section 23)
# ---------------------------------------------------------------------------
CLOSURE_CHECKLIST = [
    "Client deliverables complete",
    "Client acceptance received",
    "QA complete",
    "Documentation complete",
    "Technical handover complete",
    "Contract obligations complete",
    "Talent assignments closed",
    "Outstanding issues resolved",
    "Closure report produced",
    "Lessons learned captured",
]

# ---------------------------------------------------------------------------
# Migration from the old ten-stage sales pipeline
# ---------------------------------------------------------------------------
# The old stages were sales-shaped. Six, seven and eight were the proposal
# track, which is commercial work and now sits outside the delivery flow
# (SPEC section 2), so those projects land at Product Definition with their
# commercial state recorded on a field instead of a stage.
LEGACY_STAGE_MAP: Dict[int, Dict[str, Any]] = {
    1:  {"stage": 1,  "commercial_status": None},
    2:  {"stage": 3,  "commercial_status": None},
    3:  {"stage": 4,  "commercial_status": None},
    4:  {"stage": 5,  "commercial_status": None},
    5:  {"stage": 5,  "commercial_status": None},
    6:  {"stage": 5,  "commercial_status": "proposal"},
    7:  {"stage": 5,  "commercial_status": "awaiting_approval"},
    8:  {"stage": 5,  "commercial_status": "sent"},
    9:  {"stage": 13, "commercial_status": "contracted"},
    10: {"stage": 17, "commercial_status": "contracted"},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def stage_config(stage: int) -> Dict[str, Any]:
    return STAGES.get(stage, {})


def stage_key(stage: int) -> str:
    return STAGES.get(stage, {}).get("key", "unknown")


def stage_label(stage: int) -> str:
    return STAGES.get(stage, {}).get("label", "Unknown")


def stage_phase(stage: int) -> str:
    return STAGES.get(stage, {}).get("phase", "intake")


def stage_owner(stage: int) -> Optional[str]:
    return STAGES.get(stage, {}).get("owner")


def is_valid_stage(stage: Any) -> bool:
    return isinstance(stage, int) and stage in STAGES


def meta() -> Dict[str, Any]:
    """Everything the browser needs to render the pipeline, in one payload."""
    return {
        "stages": [{"stage": num, **cfg} for num, cfg in STAGES.items()],
        "phases": [{"key": key, **cfg} for key, cfg in PHASES.items()],
        "gates": {str(num): conds for num, conds in STAGE_GATES.items()},
        "playbooks": {str(num): book for num, book in PLAYBOOKS.items()},
        "validation_stage": VALIDATION_STAGE,
        "build_stage": BUILD_STAGE,
        "first_stage": FIRST_STAGE,
        "last_stage": LAST_STAGE,
        "closure_checklist": CLOSURE_CHECKLIST,
    }
