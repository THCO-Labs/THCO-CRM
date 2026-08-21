"""Crowther OS — the delivery pipeline.

Extends the existing projects collection with the 12-stage state machine
and adds collections for contacts, milestones, prospects, tickets, messages,
events, audit_log, and question_library.

Phase A: full data model + project pipeline + contacts + prospects + tickets
         + messages skeleton + events + audit log + role assignment.
Phase B (deferred, marked TODO_PHASE_B): LLM proposal/contract generation,
        e-signature, WhatsApp, Stripe invoice automation.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from services import permissions
from services import delivery_stages
from services.notifications import notify_added_to_project, notify_removed_from_project
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/flow", tags=["flow"])
db = None


def set_db(database):
    global db
    db = database


async def _get_user(request: Request) -> dict:
    """Everything in this router goes through here, so the rule is stated once.

    Crowther OS is the delivery pipeline, and it belongs to the TSDs who own
    administrators. Hiding the menu entry was not enough on its own: every
    route below was reachable by any signed-in person who knew the address,
    and rows were merely scoped rather than refused.

    A pod member's work is the task board, which lives in its own router and
    is unaffected by this -- it admits anyone assigned to the project.
    """
    from server import get_current_user

    user = await get_current_user(request)
    permissions.require(
        permissions.has_unit_access(user, "flow"),
        "Crowther OS is for TSDs and administrators. Your work is on "
        "the task board under Tasks.",
    )
    return user


# ===========================================================================
# THE DELIVERY LIFECYCLE
# ===========================================================================
# The stages, their gates and their playbooks live in one module so that the
# router, the migration and the browser cannot drift apart. Everything below
# reads from there rather than holding its own copy.
from services.delivery_stages import (  # noqa: E402
    STAGES,
    PHASES,
    STAGE_GATES,
    PLAYBOOKS,
    CLOSURE_CHECKLIST,
    LEGACY_STAGE_MAP,
    FIRST_STAGE,
    LAST_STAGE,
    VALIDATION_STAGE,
    BUILD_STAGE,
    DEMO_ITERATION_MOVE,
    stage_key,
    stage_label,
    stage_phase,
    stage_owner,
    is_valid_stage,
)

# Lost / declined sub-state
LOST_STAGE_KEY = "lost"
BUILD_STATUS_OPTIONS = ["planning", "building", "blocked", "ready_for_qa"]

# The old boolean flags. Retained only so the migration can read them off
# existing accounts; nothing in the running system should test these.
LEGACY_ROLE_FLAGS = [
    "is_delivery_coordinator",
    "is_delivery_owner",
    "is_operations_owner",
    "is_executive_approver",
    "is_engineer",
    "is_relationship_owner",
    "is_prospect_owner",
]

# What each old flag becomes. `is_delivery_coordinator` has no successor: its
# job was choosing who runs a project, which is now stage 2 rather than a
# standing privilege.
LEGACY_FLAG_TO_FUNCTION = {
    "is_executive_approver": permissions.SENIOR_PARTNER,
    "is_delivery_owner": permissions.TSD,
    "is_operations_owner": permissions.PEOPLE_OPS,
    "is_engineer": permissions.ENGINEER,
    "is_relationship_owner": permissions.COMMERCIAL,
    "is_prospect_owner": permissions.COMMERCIAL,
}

FUNCTION_ROLE_LABELS = [
    (permissions.SENIOR_PARTNER, "Senior Partner"),
    (permissions.COMMERCIAL, "Commercial / Initiator"),
    (permissions.TSD, "TSD (delivery owner)"),
    (permissions.ENGINEER, "Engineer"),
    (permissions.PRODUCT_DESIGNER, "Product Designer"),
    (permissions.QA, "QA / Tester"),
    (permissions.TALENT_SD, "TalentSD"),
    (permissions.PEOPLE_OPS, "People & Operations"),
    (permissions.LEGAL, "Legal"),
    (permissions.FINANCE, "Finance"),
]


# ===========================================================================
# HELPERS
# ===========================================================================
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_project_id() -> str:
    year = datetime.now(timezone.utc).year
    # New references carry the new name. The ones already issued keep theirs:
    # a reference number is quoted in emails and written down, so reissuing one
    # somebody already holds is worse than a prefix that changed on a date.
    return f"CROW-{year}-{uuid.uuid4().hex[:6].upper()}"


async def _resolve_pod(user_ids: List[str]) -> List[Dict[str, Any]]:
    """Turn submitted user ids into the name/email snapshots stored on a project.

    Unknown ids are dropped rather than rejected: a stale id from a removed
    account should not block a head from saving the rest of their team. The
    name is denormalised so the project still reads correctly later, while
    pod_member_ids stays the field permission checks match on.
    """
    wanted = [uid for uid in dict.fromkeys(user_ids or []) if uid]
    if not wanted:
        return []
    found = await db.users.find(
        {"user_id": {"$in": wanted}, "status": {"$ne": "disabled"}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1},
    ).to_list(length=len(wanted))
    by_id = {u["user_id"]: u for u in found}
    return [
        {"user_id": uid, "name": by_id[uid].get("name"), "email": by_id[uid].get("email")}
        for uid in wanted
        if uid in by_id
    ]


async def _audit(entity_type: str, entity_id: str, action: str, user: dict, details: Optional[Dict[str, Any]] = None):
    await db.audit_log.insert_one({
        "log_id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "user_id": user.get("user_id"),
        "user_name": user.get("name"),
        "timestamp": _now(),
        "details": details or {},
    })


async def _users_with_function(*function_roles: str) -> List[dict]:
    """Active accounts holding any of these function roles.

    Recipients are resolved by what a person does, not by a boolean flag on
    their account. The old flags are migrated onto `function_role` and are no
    longer read here.
    """
    wanted = [r for r in function_roles if r]
    if not wanted:
        return []
    cursor = db.users.find(
        {"function_role": {"$in": wanted}, "status": "active"},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "function_role": 1},
    )
    return await cursor.to_list(100)


async def _users_by_id(*user_ids: str) -> List[dict]:
    wanted = [uid for uid in user_ids if uid]
    if not wanted:
        return []
    cursor = db.users.find(
        {"user_id": {"$in": wanted}, "status": "active"},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "function_role": 1},
    )
    return await cursor.to_list(len(wanted))


# ---------------------------------------------------------------------------
# PII access control — client contact email/phone/whatsapp restricted to:
#   • super_admin                       ("Myself" — Joshua / Executive Approver)
#   • is_executive_approver
#   • is_delivery_coordinator           ("Project Coordinator")
#   • is_delivery_owner                 ("Delivery Owner")
# Everyone else sees REDACTED placeholder.
# ---------------------------------------------------------------------------
PII_FIELDS = ("email", "phone", "whatsapp", "spouse_birthday", "spouse_name")


def _can_view_contact_pii(user: dict) -> bool:
    return (
        user.get("role") == "super_admin"
        or user.get("is_executive_approver")
        or user.get("is_delivery_coordinator")
        or user.get("is_delivery_owner")
    )


def _redact_contact(contact: dict, user: dict) -> dict:
    # The person who created a contact always sees the details they entered —
    # otherwise editing it blanks the fields back out. Privileged roles see
    # every contact's PII; everyone else sees the redacted placeholder.
    if _can_view_contact_pii(user) or contact.get("created_by") == user.get("user_id"):
        contact["_pii_visible"] = True
        return contact
    redacted = dict(contact)
    # Drop PII fields entirely — frontend will simply not render those rows,
    # so the contact card looks natural (as if those fields were never filled).
    for f in PII_FIELDS:
        redacted[f] = ""
    redacted["_pii_visible"] = False
    return redacted


# ---------------------------------------------------------------------------
# Contact ownership — a PM sees only the contacts they created; administrators
# see the whole directory. This is enforced server-side: the frontend may hide
# buttons, but these predicates are the boundary.
# ---------------------------------------------------------------------------
def _can_view_all_contacts(user: dict) -> bool:
    return permissions.is_admin(user)


def _can_manage_contact(contact: dict, user: dict) -> bool:
    return permissions.is_admin(user) or contact.get("created_by") == user.get("user_id")


async def _can_manage_ticket(ticket: dict, user: dict) -> bool:
    """Whether this person may edit or remove a ticket.

    The same three people who could already act on the work it belongs to:
    whoever raised it, whoever manages its project, and administrators. No
    new privilege is introduced here -- `can_manage_project` is the rule the
    project itself, its board and its stage transitions already use.
    """
    if permissions.is_admin(user):
        return True
    if ticket.get("created_by_id") == user.get("user_id"):
        return True
    project = await db.projects.find_one(
        {"id": ticket.get("project_id")}, {"_id": 0}
    )
    return bool(project) and permissions.can_manage_project(user, project)


async def _stage_recipients(stage: int, project: dict) -> List[dict]:
    """Who hears that a project has arrived at this stage.

    The person accountable for the stage comes first. Where that role is held
    by a named person on this project -- the TSD, the architect -- it is that
    person rather than everybody who happens to hold the role, because a
    project's TSD is not every TSD in the firm.
    """
    cfg = STAGES.get(stage) or {}
    owner = cfg.get("owner")
    named = {
        "tsd": project.get("tsd_id"),
        "solution_architect": project.get("architect_id"),
        "product_designer": project.get("designer_id"),
    }

    recipients: List[dict] = []
    seen = set()

    async def add(users):
        for u in users:
            if u.get("email") and u["email"] not in seen:
                seen.add(u["email"])
                recipients.append(u)

    for role in [owner] + list(cfg.get("notify") or []):
        if not role:
            continue
        named_id = named.get(role)
        if named_id:
            await add(await _users_by_id(named_id))
        else:
            await add(await _users_with_function(role))
    return recipients


async def _send_stage_email(stage: int, project: dict, actor: dict):
    """Tell the people who now have work to do that they have work to do."""
    from services import send_email
    from services.email_templates import _base

    cfg = STAGES.get(stage)
    if not cfg:
        return
    recipients = await _stage_recipients(stage, project)
    if not recipients:
        return

    book = PLAYBOOKS.get(stage) or {}
    next_line = book.get("next", "")
    activities = "".join(f"<li>{a}</li>" for a in (book.get("activities") or [])[:4])

    project_link = f"/flow/projects/{project['id']}"
    subject = f"[Crowther OS] {cfg['label']} - {project.get('name', 'Project')}"
    body_html = f"""
      <h2 style="margin:0 0 16px;color:#1B4332;font-size:20px;">Stage {stage}: {cfg['label']}</h2>
      <p>Project <strong>{project.get('name')}</strong> for client
      <strong>{project.get('client_name_snapshot') or 'Unknown'}</strong>
      is now at <strong>{cfg['label']}</strong>.</p>
      <p style="margin:16px 0;padding:12px;background:#F7F6F3;border-radius:6px;">
        <strong>What happens next:</strong><br/>{next_line}
      </p>
      <ul style="color:#4C5B6B;font-size:14px;">{activities}</ul>
      <p style="color:#8A8A8A;font-size:13px;">Moved by {actor.get('name')}.</p>
    """
    html = _base(subject, body_html, cta_url=project_link, cta_text="Open Project")

    await send_email(
        to=[u["email"] for u in recipients],
        subject=subject,
        html=html,
        template_name=f"crowther_stage_{stage}",
        context={"stage": stage, "project_id": project["id"]},
    )


async def _alert_senior_partner(project: dict, actor: dict, subject_line: str, body: str):
    """Reach the Senior Partner by email and in-app at once.

    Used for the two things they asked to be told about without being asked to
    act: a forced gate, and a project going red.
    """
    from services import send_email
    from services.email_templates import _base

    partners = await _users_with_function(permissions.SENIOR_PARTNER)
    if not partners:
        return
    link = f"/flow/projects/{project['id']}"
    html = _base(subject_line, body, cta_url=link, cta_text="Open Project")
    await send_email(
        to=[u["email"] for u in partners],
        subject=subject_line,
        html=html,
        template_name="crowther_partner_alert",
        context={"project_id": project["id"]},
    )
    for p in partners:
        await db.notifications.insert_one({
            "notification_id": str(uuid.uuid4()),
            "user_id": p["user_id"],
            "title": subject_line,
            "body": body,
            "link": link,
            "project_id": project["id"],
            "read": False,
            "created_at": _now(),
        })


# What Legal and Finance see of a project row. They write contracts, so they
# get the identity of the work, where it has reached, and its commercial state.
# Not the architect, not the pod, not the internal notes.
COMMERCIAL_PROJECT_FIELDS = (
    "id", "project_id_display", "name", "client_id", "client_name_snapshot",
    "website", "description", "desired_outcome", "original_brief",
    "stage", "stage_key", "stage_label", "phase", "status", "health",
    "total_value", "currency", "commercial_status",
    "created_at", "start_date", "end_date", "validated_at", "completed_at",
    "scope_frozen", "tsd_name",
)


def _serialize_for(user: dict, project: dict) -> dict:
    """Serialise a project for whoever is asking.

    Legal and Finance get a smaller object, built by naming the fields they
    are entitled to rather than by deleting the ones they are not. A denylist
    grows a hole every time somebody adds a field.
    """
    full = _serialize_project(project)
    if not permissions.sees_commercial_slice_only(user):
        return full
    return {k: full.get(k) for k in COMMERCIAL_PROJECT_FIELDS}


def _serialize_project(p: dict) -> dict:
    p.pop("_id", None)
    stage = p.get("stage") or FIRST_STAGE
    p["stage"] = stage
    p["stage_label"] = stage_label(stage)
    p["stage_key"] = stage_key(stage)
    p["phase"] = stage_phase(stage)
    p["stage_owner"] = stage_owner(stage)
    return p





# ===========================================================================
# PROJECTS (12-stage pipeline)
# ===========================================================================
class ProjectCreate(BaseModel):
    name: str
    client_id: Optional[str] = None
    client_name: str
    website: Optional[str] = ""
    description: Optional[str] = ""
    project_type: str = "new_client"  # new_client | existing_expansion
    source: Optional[str] = ""        # who brought the prospect in
    notes: Optional[str] = ""
    # Staff to place on the project from the outset. Each is notified.
    pod_member_ids: List[str] = []
    # A picture from the shared library. Claimed after the project exists,
    # because the claim needs something to belong to.
    thumbnail_id: Optional[str] = None

    # --- Intake (SPEC section 7) -------------------------------------------
    # The client project form is the formal entry point to the lifecycle, so
    # everything the commercial side already knows is captured here rather
    # than chased afterwards.
    template: Optional[str] = None
    desired_outcome: Optional[str] = ""
    original_brief: Optional[str] = ""
    # Conversations that have already happened, pasted in. Each carries the
    # source and date it came from, because "what did the client actually say"
    # is unanswerable without knowing which call it was said on.
    transcripts: List["TranscriptIn"] = []
    # A prospect this project grew out of, if it did.
    prospect_id: Optional[str] = None
    # Whoever opens the project may already know who will run it. Naming them
    # here settles stage 2 on the spot, and the project opens at stage 3
    # instead of waiting to be assigned to somebody already decided.
    tsd_id: Optional[str] = None


class TranscriptIn(BaseModel):
    source_label: str          # "Initial call", "Discovery meeting"
    source_date: Optional[str] = None
    content: str


ProjectCreate.model_rebuild()


@router.post("/projects")
async def create_project(data: ProjectCreate, request: Request):
    """Create a project at Stage 1 (Prospect).

    Opening a project belongs to Commercial, a TSD or the Senior Partner.
    Staff do not create their own -- they are added to one and see it appear
    on their dashboard.

    A project no longer belongs to a unit. Units opened and owned work under
    the old model; delivery is owned by a named TSD now, and a pod is drawn
    from across the capability teams rather than from one unit's staff.
    """
    user = await _get_user(request)

    # Who opens a project is a function, not a unit. The commercial side does
    # it at intake, and a TSD or the Senior Partner opens one directly when a
    # prospect turns real. Units used to own this, and a project used to have
    # to belong to one; neither is true now, so there is nothing to choose.
    permissions.require(
        permissions.can_open_project(user),
        "Opening a project belongs to Commercial, a TSD or the Senior Partner.",
    )

    pod = await _resolve_pod(data.pod_member_ids)

    project_id = str(uuid.uuid4())
    project_id_display = _generate_project_id()
    project = {
        "id": project_id,
        "project_id_display": project_id_display,
        "name": data.name,
        "client_id": data.client_id if data.client_id and data.client_id != "custom" else None,
        "client_name_snapshot": data.client_name,
        "website": data.website or "",
        "description": (data.description or "")[:500],
        "project_type": data.project_type,
        "source": data.source or "",
        "notes": data.notes or "",
        # --- lifecycle ---------------------------------------------------
        # One record, one lifecycle. The old split-track model (a proposal
        # sibling and a build sibling from stage 5) is retired: commercial work
        # is a status on the project, not a second copy of it.
        "stage": FIRST_STAGE,
        "stage_key": stage_key(FIRST_STAGE),
        "phase": stage_phase(FIRST_STAGE),
        "status": "active",
        "stage_history": [{
            "from_stage": None,
            "to_stage": FIRST_STAGE,
            "at": _now(),
            "by": user.get("user_id"),
            "by_name": user.get("name"),
            "why": "Project created from the client intake form",
            "gate_conditions": [],
            "forced": False,
        }],
        # Scope churns freely during discovery; that is the job, not creep.
        # It freezes when the client validates, and from then on a change to
        # the requirement set is a scope change with a decision behind it.
        "scope_frozen": False,
        "scope_frozen_at": None,
        # ownership
        # Explicitly not demo. Written on every new project so the one-off
        # migration that labels the pre-unit-head projects can recognise those
        # by the absence of this field, and never touch anything created since.
        "is_demo": False,
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name"),
        # staff placed on the project by its unit head
        "pod_member_ids": [c["user_id"] for c in pod],
        "pod": pod,
        # --- people --------------------------------------------------------
        # The TSD owns the client and the project. The Solution Architect owns
        # the technical direction and the build board. Both are named on the
        # project rather than inferred from who holds a role, because a firm
        # has many TSDs and a project has one.
        "tsd_id": None,
        "tsd_name": None,
        # Filled in below when the intake form named one.
        "architect_id": None,
        "architect_name": None,
        "architect_requested_at": None,
        "designer_id": None,
        "designer_name": None,
        "pod_member_ids": [],
        # docs / data
        "brief_document_url": None,
        "brief_document_name": None,
        "brief_data": None,
        "roadmap_document_url": None,
        "roadmap_document_name": None,
        "client_documents": [],
        "package_url": None,
        "pricing_data": None,
        "proposal_url": None,
        "contract_url": None,
        # --- definition ------------------------------------------------------
        "template": data.template,
        "desired_outcome": (data.desired_outcome or "")[:2000],
        "original_brief": data.original_brief or "",
        "created_from_prospect_id": data.prospect_id,
        # --- workstream status (SPEC appendix A) -----------------------------
        # One field per stream so the project can say where each is without
        # anyone opening a tab. These are what the status strip renders.
        "product_status": "not_started",
        "architecture_status": "not_started",
        "demo_status": "preparing",
        "client_status": "not_engaged",
        "talent_status": "none",
        "qa_status": "not_started",
        "commercial_status": "none",
        # --- health ----------------------------------------------------------
        "health": "GREEN",
        "health_reason": "",
        "health_set_by": None,
        "health_set_at": None,
        # --- closure ---------------------------------------------------------
        "closure_checklist": [
            {"label": item, "done": False, "done_by": None, "done_at": None}
            for item in CLOSURE_CHECKLIST
        ],
        # financials
        "total_value": None,
        "currency": "USD",
        # dates
        "created_at": _now(),
        "start_date": None,
        "end_date": None,
        "signed_at": None,
        "validated_at": None,
        "completed_at": None,
        "lost_at": None,
        "lost_reason": None,
        # build-track specifics
        "build_status": None,   # planning | building | blocked | ready_for_qa
        "build_comments": [],   # list of {by, by_name, at, text}
        # legacy compat
        "current_review_id": None,
    }
    # A named TSD settles stage 2 before it is reached. The project opens at
    # "TSD Receives Project" instead, because the assignment the stage exists
    # to make has already been made.
    if data.tsd_id:
        chosen = await db.users.find_one(
            {"user_id": data.tsd_id, "status": {"$ne": "disabled"}},
            {"_id": 0, "user_id": 1, "name": 1},
        )
        if not chosen:
            raise HTTPException(status_code=404, detail="That person does not have an active account")
        project["tsd_id"] = chosen["user_id"]
        project["tsd_name"] = chosen.get("name")
        project["stage"] = 3
        project["stage_key"] = stage_key(3)
        project["phase"] = stage_phase(3)
        project["stage_history"].append({
            "from_stage": FIRST_STAGE,
            "to_stage": 3,
            "at": _now(),
            "by": user.get("user_id"),
            "by_name": user.get("name"),
            "why": f"TSD named on the intake form: {chosen.get('name')}",
            "gate_conditions": [],
            "forced": False,
        })
        if chosen["user_id"] not in project["pod_member_ids"]:
            project["pod_member_ids"].append(chosen["user_id"])

    await db.projects.insert_one(project)
    project.pop("_id", None)

    # The picture is claimed after the project exists, because a claim needs
    # something to belong to. Losing the race for it does not undo the project
    # -- a cover is not worth discarding somebody's work over; they are told
    # and can pick another.
    if data.thumbnail_id:
        from routers import taskboard

        claimed = await taskboard.claim_thumbnail_for(project_id, data.thumbnail_id)
        if claimed:
            await db.projects.update_one(
                {"id": project_id}, {"$set": {"thumbnail_id": data.thumbnail_id}}
            )
            project["thumbnail_id"] = data.thumbnail_id
        else:
            project["thumbnail_unavailable"] = True

    # Transcripts pasted at intake become documents on the project straight
    # away, so that everyone who joins later -- the TSD at stage 3, the
    # architect at stage 6 -- reads the same source material rather than being
    # handed a summary of it.
    for t in (data.transcripts or []):
        if not (t.content or "").strip():
            continue
        await db.documents.insert_one({
            "document_id": str(uuid.uuid4()),
            "project_id": project_id,
            "title": t.source_label or "Transcript",
            "doc_type": "transcript",
            "content": t.content,
            "source_label": t.source_label or "",
            "source_date": t.source_date,
            "file_url": None,
            "version": 1,
            "author_id": user.get("user_id"),
            "author_name": user.get("name"),
            "created_at": _now(),
        })

    if (data.original_brief or "").strip():
        await db.documents.insert_one({
            "document_id": str(uuid.uuid4()),
            "project_id": project_id,
            "title": "Original brief",
            "doc_type": "brief",
            "content": data.original_brief,
            "source_label": "Intake",
            "source_date": None,
            "file_url": None,
            "version": 1,
            "author_id": user.get("user_id"),
            "author_name": user.get("name"),
            "created_at": _now(),
        })

    # A project opened from a prospect closes that prospect, so the same piece
    # of work is not sitting in two places looking like two.
    if data.prospect_id:
        await db.prospects.update_one(
            {"prospect_id": data.prospect_id},
            {"$set": {"status": "converted", "converted_project_id": project_id,
                      "converted_at": _now()}},
        )

    await _audit("project", project_id, "created", user,
                 {"stage": project["stage"], "client": data.client_name})
    await _send_stage_email(project["stage"], project, user)

    if pod:
        await notify_added_to_project(db, project, pod, user)

    return _serialize_project(project)


@router.get("/projects")
async def list_projects(
    request: Request,
    stage: Optional[int] = None,
    owner: Optional[str] = None,
    client: Optional[str] = None,
    q: Optional[str] = None,
):
    """List projects with filters."""
    user = await _get_user(request)
    # Staff see only the projects they are attached to. Administrators and
    # delivery oversight roles get the full portfolio, for which this returns
    # an empty filter.
    query: Dict[str, Any] = dict(permissions.project_scope_filter(user))
    if stage:
        query["stage"] = stage
    if owner:
        query["delivery_owner_id"] = owner
    if client:
        query["client_id"] = client
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"client_name_snapshot": {"$regex": q, "$options": "i"}},
            {"project_id_display": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.projects.find(query, {"_id": 0}).sort("created_at", -1)
    projects = await cursor.to_list(500)
    return [_serialize_for(user, p) for p in projects]


@router.get("/projects/board")
async def board(request: Request):
    """The pipeline board, grouped into phases.

    Seventeen columns is unusable, so projects are grouped by the six phases
    of the lifecycle and each card carries its own stage. A caller wanting the
    detail asks for one phase and gets its stages as columns instead.

    Projects that never made it onto the new lifecycle are not silently
    repaired here. That was the old behaviour and it meant a read could
    quietly rewrite rows; the migration script does it once, deliberately,
    with a backup behind it.
    """
    user = await _get_user(request)
    cursor = db.projects.find(
        {**permissions.project_scope_filter(user), "archived_by_migration": {"$ne": True}},
        {"_id": 0},
    ).sort("created_at", -1)
    projects = await cursor.to_list(1000)

    by_phase: Dict[str, List[dict]] = {key: [] for key in PHASES}
    by_stage: Dict[int, List[dict]] = {num: [] for num in STAGES}
    unmigrated = []

    for p in projects:
        stage = p.get("stage")
        if not is_valid_stage(stage):
            unmigrated.append({"id": p.get("id"), "name": p.get("name"), "stage": stage})
            continue
        serialised = _serialize_for(user, p)
        by_stage[stage].append(serialised)
        by_phase[stage_phase(stage)].append(serialised)

    return {
        "phases": [
            {"key": key, **cfg, "count": len(by_phase[key])}
            for key, cfg in sorted(PHASES.items(), key=lambda kv: kv[1]["order"])
        ],
        "stages": [{"stage": num, **cfg, "count": len(by_stage[num])} for num, cfg in STAGES.items()],
        "by_phase": by_phase,
        "by_stage": by_stage,
        # Anything the migration has not reached yet, named rather than hidden.
        "unmigrated": unmigrated,
    }


@router.get("/meta")
async def pipeline_meta(request: Request):
    """Stages, phases, gates and playbooks in one payload.

    The browser needs all of it to render the board and the next-step panel,
    and it never changes between requests, so it is one call rather than four.
    """
    await _get_user(request)
    return delivery_stages.meta()


@router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request):
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # The list was scoped and this was not, so a project nobody could find
    # was still readable to anyone who knew its id -- including a colleague's
    # client engagement in the same unit, with its notes and stage history.
    if not permissions.can_view_all_projects(user):
        mine = await db.projects.find_one(
            {"id": project_id, **permissions.project_scope_filter(user)}, {"_id": 0, "id": 1}
        )
        if not mine:
            raise HTTPException(
                status_code=403,
                detail="You can only open projects you manage or work on",
            )
    # Attach milestones, tickets
    milestones = await db.milestones.find({"project_id": project_id}, {"_id": 0}).sort("target_date", 1).to_list(100)
    tickets = await db.tickets.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    project["milestones"] = milestones
    project["tickets"] = tickets
    return _serialize_project(project)


class StageTransition(BaseModel):
    target_stage: int = Field(..., ge=FIRST_STAGE, le=LAST_STAGE)
    # Why the project moved. Required going backwards, and required to force a
    # gate. It is written into the stage history, which is the only durable
    # record of why a project is where it is.
    note: Optional[str] = None
    # Advance despite an unmet gate condition. The TSD alone, never silently:
    # the Senior Partner is emailed and alerted every time.
    force: bool = False
    payload: Optional[Dict[str, Any]] = None  # arbitrary stage data (package_url, etc.)


class ProjectEdit(BaseModel):
    """Correctable details of a project.

    Deliberately excludes stage, track and ownership: those move through the
    transition and assignment endpoints, which record who changed what. This
    is for fixing a mistyped name or a wrong description, not for bypassing
    the pipeline.
    """
    name: Optional[str] = None
    client_name: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None


class ProjectManagerSet(BaseModel):
    # Null hands the project back to whoever manages its unit.
    user_id: Optional[str] = None


@router.put("/projects/{project_id}/manager")
async def set_project_manager(project_id: str, data: ProjectManagerSet, request: Request):
    """Name the person running this particular project.

    A unit's manager runs everything in it, which is the right default and the
    wrong fit when one project belongs to somebody else. An administrator can
    hand a single project over without making that person responsible for the
    whole unit; clearing it returns the project to the unit's manager.

    Administrators only. Who is accountable for a project is not a decision to
    delegate to whoever currently holds it.
    """
    user = await _get_user(request)
    permissions.require_admin(user)

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    previous = project.get("tsd_name") or project.get("project_manager_name")

    if not data.user_id:
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"tsd_id": None, "tsd_name": None, "updated_at": _now()},
             # The old field goes with it, so nothing is left claiming an owner
             # the project no longer has.
             "$unset": {"project_manager_id": "", "project_manager_name": ""}},
        )
        await _audit("project", project_id, "tsd_cleared", user, {"previous": previous})
        return {"project_id": project_id, "tsd_id": None, "tsd_name": None,
                "project_manager_name": None, "previous": previous}

    person = await db.users.find_one(
        {"user_id": data.user_id, "status": {"$ne": "disabled"}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1},
    )
    if not person:
        raise HTTPException(status_code=404, detail="That person does not have an active account")

    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"tsd_id": person["user_id"],
                  "tsd_name": person.get("name"),
                  "updated_at": _now()},
         "$unset": {"project_manager_id": "", "project_manager_name": ""}},
    )
    # Running a project you cannot see would be a dead end.
    await db.projects.update_one(
        {"id": project_id, "pod_member_ids": {"$ne": person["user_id"]}},
        {"$addToSet": {"pod_member_ids": person["user_id"],
                       "pod": {"user_id": person["user_id"],
                                         "name": person.get("name"),
                                         "email": person.get("email")}}},
    )
    await _audit("project", project_id, "tsd_set", user,
                 {"tsd": person.get("name"), "previous": previous})

    return {
        "project_id": project_id,
        "tsd_id": person["user_id"],
        "tsd_name": person.get("name"),
        # Kept so older callers that read this key still work.
        "project_manager_id": person["user_id"],
        "project_manager_name": person.get("name"),
        "previous": previous,
    }


class PodSet(BaseModel):
    # The full intended team. Sent whole rather than as add/remove deltas so
    # two managers editing at once cannot interleave into a half-applied team.
    pod_member_ids: List[str] = []
    # Those among them who co-manage the project. Two managers on one project
    # is ordinary, and a co-manager can staff it and run its boards -- an
    # engineer on the same project cannot.
    manager_ids: List[str] = []


@router.put("/projects/{project_id}/pod")
async def set_pod(project_id: str, data: PodSet, request: Request):
    """Set the pod: everyone working on this project.

    A project had two ways of saying this, `collaborator_ids` and
    `pod_member_ids`. Two names for one set is how they drift apart, and a
    "project team" separate from "the pod" was a distinction nobody was making.
    The pod won, because that is the word the delivery model uses.

    The TSD and the architect staff it. Being on a pod does not let you add
    others to it. People newly added are notified; people already on it are
    not notified again, so re-saving the same pod sends nothing.
    """
    user = await _get_user(request)

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    permissions.require(
        permissions.can_manage_project(user, project),
        "Only this project's project manager can change who works on it",
    )

    before = set(project.get("pod_member_ids") or [])
    pod = await _resolve_pod(data.pod_member_ids)
    after_ids = [c["user_id"] for c in pod]

    # A co-manager has to be on the project to manage it, so anyone marked a
    # manager but left off the team is simply kept out of the manager list
    # rather than granted rights over work they cannot see.
    manager_ids = [uid for uid in dict.fromkeys(data.manager_ids or []) if uid in after_ids]

    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"pod_member_ids": after_ids, "pod": pod,
                  "project_manager_ids": manager_ids,
                  "updated_at": _now()}},
    )

    added = [c for c in pod if c["user_id"] not in before]
    if added:
        await notify_added_to_project(db, project, added, user)

    removed = [c for c in (project.get("pod") or [])
               if c["user_id"] in (before - set(after_ids))]
    if removed:
        await notify_removed_from_project(db, project, removed, user)

    await _audit("project", project_id, "collaborators_set", user,
                 {"added": len(added), "total": len(after_ids),
                  "managers": len(manager_ids)})

    return {
        "project_id": project_id,
        "pod": pod,
        "manager_ids": manager_ids,
        "added": len(added),
        "removed": len(before - set(after_ids)),
    }


@router.put("/projects/{project_id}")
async def edit_project(project_id: str, data: ProjectEdit, request: Request):
    """Correct a project's details.

    There was previously no way to fix a project after creating it, so a
    mistyped name stayed wrong for the life of the record.

    Anyone attached to the project may edit it, as may administrators and
    delivery oversight. Every change is written to the audit log with its old
    and new value, so a correction is traceable rather than silent.
    """
    user = await _get_user(request)

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    permissions.require(
        permissions.can_manage_project(user, project),
        "Only this project's project manager or an administrator can edit it",
    )

    # The create endpoint stores the client under client_name_snapshot, so an
    # edit writing `client_name` would add a stray field the rest of the app
    # never reads.
    FIELD_MAP = {"client_name": "client_name_snapshot"}

    changes: Dict[str, Any] = {}
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        cleaned = value.strip() if isinstance(value, str) else value
        if field == "name" and not cleaned:
            raise HTTPException(status_code=400, detail="Project name cannot be empty")

        stored_field = FIELD_MAP.get(field, field)
        current = project.get(stored_field)
        # An absent field and an empty one are the same thing here; treating
        # them as different recorded edits that changed nothing.
        if (cleaned or "") == (current or ""):
            continue
        changes[stored_field] = cleaned

    if not changes:
        return {"message": "No changes", "project": _serialize_project(project)}

    before = {k: project.get(k) for k in changes}
    changes["updated_at"] = _now()
    await db.projects.update_one({"id": project_id}, {"$set": changes})

    await _audit("project", project_id, "edited", user,
                 {"before": before, "after": {k: v for k, v in changes.items() if k != "updated_at"}})

    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return {"message": "Project updated", "changed": list(before), "project": _serialize_project(updated)}


@router.get("/projects/user/{user_id}")
async def projects_for_user(user_id: str, request: Request):
    """Return all projects a specific user created or collaborates on.

    Only administrators and HR may look up another person's projects.
    """
    u = await _get_user(request)
    if not permissions.is_admin(u) and not u.get("is_hr"):
        raise HTTPException(status_code=403, detail="Only admins and HR may view another person's projects")

    created = await db.projects.find({"created_by": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    collab = await db.projects.find({"pod_member_ids": user_id, "created_by": {"$ne": user_id}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"created": [_serialize_project(p) for p in created], "collaborating": [_serialize_project(p) for p in collab]}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request, permanent: bool = False):
    """Remove a project.

    Archived rather than destroyed. The brief for this system is to be able to
    look back at what happened, and a deleted project takes its stage history,
    documents and audit trail with it. An archived one can be restored.

    Anyone attached to the project may archive it; only a super administrator
    may delete permanently, and even then the archive copy is kept.
    """
    user = await _get_user(request)

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    permissions.require(
        permissions.can_manage_project(user, project),
        "Only this project's project manager or an administrator can remove it",
    )

    if permanent and not permissions.is_super_admin(user):
        raise HTTPException(
            status_code=403,
            detail="Only a super administrator can delete a project permanently",
        )

    now = _now()
    await db.projects_archived.update_one(
        {"id": project_id},
        {"$set": {**project, "archived_at": now,
                  "archived_by": user.get("user_id"),
                  "archived_by_name": user.get("name")}},
        upsert=True,
    )
    await db.projects.delete_one({"id": project_id})
    await _audit("project", project_id, "deleted" if permanent else "archived", user,
                 {"name": project.get("name"), "stage": project.get("stage")})

    return {
        "message": "Project archived" if not permanent else "Project deleted",
        "project_id": project_id,
        "restorable": True,
    }


@router.post("/projects/{project_id}/restore")
async def restore_project(project_id: str, request: Request):
    """Put an archived project back."""
    user = await _get_user(request)
    permissions.require_admin(user)

    archived = await db.projects_archived.find_one({"id": project_id}, {"_id": 0})
    if not archived:
        raise HTTPException(status_code=404, detail="No archived project with that id")

    existing = await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(status_code=400, detail="A live project already has that id")

    for field in ("archived_at", "archived_by", "archived_by_name"):
        archived.pop(field, None)

    await db.projects.insert_one(archived)
    await db.projects_archived.delete_one({"id": project_id})
    await _audit("project", project_id, "restored", user, {"name": archived.get("name")})

    return {"message": "Project restored", "project": _serialize_project(archived)}


@router.get("/projects-archived")
async def list_archived_projects(request: Request, limit: int = 50):
    """Projects that have been archived, newest first."""
    user = await _get_user(request)
    permissions.require_admin(user)
    items = await db.projects_archived.find({}, {"_id": 0}).sort("archived_at", -1).to_list(min(limit, 200))
    return {"total": len(items), "projects": items}


async def _resolve_gate(project: dict) -> List[dict]:
    """Which of this stage's gate conditions are already satisfied by data.

    A condition with an `auto` key can be answered by looking; the rest are a
    human judgement and stay a tick. This is the seam the intelligence layer
    later widens: more conditions answer themselves, the shape stays the same,
    and the panel does not move.
    """
    stage = project.get("stage") or FIRST_STAGE
    pid = project["id"]
    conditions = STAGE_GATES.get(stage, [])
    if not conditions:
        return []

    needed = {c["auto"] for c in conditions if c.get("auto")}
    resolved: Dict[str, bool] = {}

    if "has_outcome" in needed:
        resolved["has_outcome"] = bool((project.get("desired_outcome") or "").strip())
    if "has_source" in needed:
        resolved["has_source"] = await db.documents.count_documents({"project_id": pid}) > 0
    if "has_tsd" in needed:
        resolved["has_tsd"] = bool(project.get("tsd_id"))
    if "has_architect" in needed:
        resolved["has_architect"] = bool(project.get("architect_id"))
    if "has_requirements" in needed:
        resolved["has_requirements"] = await db.requirements.count_documents({"project_id": pid}) >= 3
    if "has_product_brief" in needed:
        resolved["has_product_brief"] = await db.product_briefs.count_documents({"project_id": pid}) > 0
    if "has_journeys" in needed:
        resolved["has_journeys"] = await db.user_journeys.count_documents({"project_id": pid}) > 0
    if "has_architecture" in needed:
        resolved["has_architecture"] = await db.architecture_documents.count_documents({"project_id": pid}) > 0
    if "has_demo_materials" in needed:
        # Either a link to a prototype, or a file attached to a round. Both are
        # materials; only accepting a link left the gate unsatisfiable for
        # anybody whose wireframes were a file.
        linked = await db.demos.count_documents(
            {"project_id": pid, "materials_url": {"$nin": [None, ""]}})
        uploaded = await db.documents.count_documents(
            {"project_id": pid, "doc_type": "demo"})
        resolved["has_demo_materials"] = (linked + uploaded) > 0
    if "demo_held" in needed:
        resolved["demo_held"] = await db.demos.count_documents(
            {"project_id": pid, "held_at": {"$ne": None}}) > 0
    if "has_feedback" in needed:
        resolved["has_feedback"] = await db.feedback_items.count_documents({"project_id": pid}) > 0
    if "demo_validated" in needed:
        resolved["demo_validated"] = await db.demos.count_documents(
            {"project_id": pid, "outcome": "validated"}) > 0
    if "has_pod" in needed:
        resolved["has_pod"] = len(project.get("pod_member_ids") or []) > 0
    if "has_milestones" in needed:
        resolved["has_milestones"] = await db.milestones.count_documents({"project_id": pid}) > 0
    if "board_build_clear" in needed or "board_qa_clear" in needed:
        boards = await db.boards.find({"project_id": pid}, {"_id": 0, "board_id": 1, "title": 1}).to_list(50)
        qa_ids = [b["board_id"] for b in boards if "qa" in (b.get("title") or "").lower()]
        done_ids = [b["board_id"] for b in boards if (b.get("title") or "").lower() in ("done", "complete")]
        open_ids = [b["board_id"] for b in boards
                    if b["board_id"] not in qa_ids and b["board_id"] not in done_ids]
        if "board_qa_clear" in needed:
            resolved["board_qa_clear"] = (
                await db.cards.count_documents({"board_id": {"$in": qa_ids}}) == 0
                if qa_ids else False
            )
        if "board_build_clear" in needed:
            resolved["board_build_clear"] = (
                await db.cards.count_documents({"board_id": {"$in": open_ids}}) == 0
                if boards else False
            )
    if "closure_complete" in needed:
        checklist = project.get("closure_checklist") or []
        resolved["closure_complete"] = bool(checklist) and all(i.get("done") for i in checklist)

    out = []
    for c in conditions:
        key = c.get("auto")
        out.append({
            "label": c["label"],
            "auto": key,
            # None means nobody can tell from the data, so a person ticks it.
            "satisfied": resolved.get(key) if key else None,
        })
    return out


@router.get("/projects/{project_id}/gate")
async def get_gate(project_id: str, request: Request):
    """What stands between this project and its next stage."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not permissions.can_view_all_projects(user):
        mine = await db.projects.find_one(
            {"id": project_id, **permissions.project_scope_filter(user)}, {"_id": 0, "id": 1})
        if not mine:
            raise HTTPException(status_code=403, detail="You can only open projects you work on")

    stage = project.get("stage") or FIRST_STAGE
    conditions = await _resolve_gate(project)
    blocking = [c["label"] for c in conditions if c["satisfied"] is False]
    return {
        "stage": stage,
        "stage_label": stage_label(stage),
        "next_stage": stage + 1 if stage < LAST_STAGE else None,
        "next_stage_label": stage_label(stage + 1) if stage < LAST_STAGE else None,
        "conditions": conditions,
        "blocking": blocking,
        "can_advance": not blocking and stage < LAST_STAGE,
        "playbook": PLAYBOOKS.get(stage, {}),
        "owner_function": stage_owner(stage),
        "can_move": permissions.can_move_stage(user, project),
    }


@router.post("/projects/{project_id}/transition")
async def transition_stage(project_id: str, data: StageTransition, request: Request):
    """Move a project to another stage.

    Three rules, and they are the spine of the pipeline:

      forward   one stage at a time, and only when the gate conditions that
                can be checked are satisfied. Forcing past them is possible,
                recorded, and tells the Senior Partner.
      backward  allowed, but a reason is required, except iterating on a demo,
                which is the designed behaviour rather than a correction.
      who       the TSD, because they own the client and the project state.
    """
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target = data.target_stage
    if not is_valid_stage(target):
        raise HTTPException(status_code=400, detail="Invalid stage")

    permissions.require(
        permissions.can_move_stage(user, project),
        "Only this project's TSD moves it through the pipeline",
    )

    current = project.get("stage") or FIRST_STAGE
    if target == current:
        raise HTTPException(status_code=400, detail="Project is already at that stage")

    forward = target > current
    is_demo_iteration = (current, target) == DEMO_ITERATION_MOVE

    if forward and target != current + 1:
        raise HTTPException(
            status_code=400,
            detail=f"A project advances one stage at a time. {stage_label(current)} is followed "
                   f"by {stage_label(current + 1)}.",
        )

    # Going back is how a project is corrected, and the record of why is the
    # point. Returning for a further demo round is exempt: the demo loop is the
    # design, and demanding a written excuse for using it teaches people to
    # write nothing.
    if not forward and not is_demo_iteration and not (data.note or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Moving a project backwards needs a reason. It is kept in the stage history.",
        )

    # Whatever this move carries is applied to the project in memory first, so
    # the gate is resolved against what the project will be rather than what it
    # was. Naming the TSD as part of the move to stage 3 is exactly this case:
    # checked against the stored record, "TSD selected" could never pass.
    payload = data.payload or {}
    resolved_payload: Dict[str, Any] = {}
    if payload.get("tsd_id"):
        chosen = await db.users.find_one(
            {"user_id": payload["tsd_id"], "status": "active"},
            {"_id": 0, "user_id": 1, "name": 1},
        )
        if not chosen:
            raise HTTPException(status_code=404, detail="That person was not found")
        resolved_payload["tsd_id"] = chosen["user_id"]
        resolved_payload["tsd_name"] = chosen["name"]

    if target == 3 and not project.get("tsd_id") and not resolved_payload.get("tsd_id"):
        raise HTTPException(
            status_code=400,
            detail="Name the TSD before the project moves to them.",
        )

    gate_view = {**project, **resolved_payload}

    forced = False
    blocking: List[str] = []
    conditions: List[dict] = []
    if forward:
        conditions = await _resolve_gate(gate_view)
        blocking = [c["label"] for c in conditions if c["satisfied"] is False]
        if blocking:
            if not data.force:
                raise HTTPException(
                    status_code=400,
                    detail={"error": "Gate conditions are not met", "blocking": blocking},
                )
            permissions.require(
                permissions.can_force_gate(user, project),
                "Only this project's TSD may advance past an unmet gate",
            )
            if not (data.note or "").strip():
                raise HTTPException(
                    status_code=400,
                    detail="Forcing a gate needs a reason. The Senior Partner is told.",
                )
            forced = True

    now = _now()
    updates: Dict[str, Any] = {
        "stage": target,
        "stage_key": stage_key(target),
        "phase": stage_phase(target),
        "status": project.get("status") if project.get("status") in ("lost", "on_hold") else "active",
    }

    # Client validation is the gate the whole system turns on. Passing it
    # freezes scope: from here a change to the requirement set is a scope
    # change with a decision behind it, not an edit.
    if target > VALIDATION_STAGE and not project.get("scope_frozen"):
        updates["scope_frozen"] = True
        updates["scope_frozen_at"] = now
        updates["validated_at"] = project.get("validated_at") or now
        updates["client_status"] = "validated"

    if target == BUILD_STAGE and not project.get("start_date"):
        updates["start_date"] = now
    if target == LAST_STAGE:
        updates["completed_at"] = now

    history = list(project.get("stage_history") or [])
    history.append({
        "from_stage": current,
        "to_stage": target,
        "at": now,
        "by": user.get("user_id"),
        "by_name": user.get("name"),
        "why": (data.note or "").strip() or ("Advanced" if forward else "Moved back"),
        "gate_conditions": [
            {"label": c["label"], "satisfied": c["satisfied"]} for c in conditions
        ],
        "forced": forced,
    })
    updates["stage_history"] = history

    # The owner named above, now that the move is going ahead.
    updates.update(resolved_payload)

    # Everything else a stage may carry, still whitelisted: a transition should
    # not be a way to write any field on a project.
    ALLOWED_PAYLOAD = {"package_url", "proposal_url", "contract_url", "total_value",
                       "currency", "commercial_status", "demo_status"}
    for k, v in payload.items():
        if k in ALLOWED_PAYLOAD:
            updates[k] = v

    await db.projects.update_one({"id": project_id}, {"$set": updates})
    project.update(updates)

    await _audit("project", project_id, f"stage_{target}", user, {
        "from_stage": current, "to_stage": target,
        "why": data.note, "forced": forced,
    })
    await _send_stage_email(target, project, user)

    if forced:
        await _alert_senior_partner(
            project, user,
            f"Gate forced on {project.get('name')}",
            f"<p><strong>{user.get('name')}</strong> advanced "
            f"<strong>{project.get('name')}</strong> from {stage_label(current)} to "
            f"{stage_label(target)} without meeting every gate condition.</p>"
            f"<p><strong>Unmet:</strong> {', '.join(blocking)}</p>"
            f"<p><strong>Reason given:</strong> {data.note}</p>",
        )

    return _serialize_project(project)


class HealthUpdate(BaseModel):
    health: str
    reason: Optional[str] = ""


@router.post("/projects/{project_id}/health")
async def set_health(project_id: str, data: HealthUpdate, request: Request):
    """Set project health. The TSD alone, and never without a reason."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    permissions.require(
        permissions.can_set_health(user, project),
        "Only this project's TSD sets its health",
    )
    health = (data.health or "").upper()
    if health not in ("GREEN", "AMBER", "RED"):
        raise HTTPException(status_code=400, detail="Health is GREEN, AMBER or RED")
    reason = (data.reason or "").strip()
    if health != "GREEN" and not reason:
        raise HTTPException(
            status_code=400,
            detail="A project that is not green needs a reason. It is what makes the status useful.",
        )

    previous = project.get("health")
    await db.projects.update_one({"id": project_id}, {"$set": {
        "health": health,
        "health_reason": reason,
        "health_set_by": user.get("user_id"),
        "health_set_at": _now(),
    }})
    await _audit("project", project_id, "health", user,
                 {"from": previous, "to": health, "reason": reason})

    # Red is the Senior Partner's cue to intervene, which is the whole of what
    # they asked to be told about.
    if health == "RED" and previous != "RED":
        await _alert_senior_partner(
            project, user,
            f"{project.get('name')} is RED",
            f"<p><strong>{project.get('name')}</strong> for "
            f"<strong>{project.get('client_name_snapshot')}</strong> has been set to RED by "
            f"{user.get('name')}.</p><p><strong>Reason:</strong> {reason}</p>",
        )

    return {"health": health, "health_reason": reason}


class ArchitectSelection(BaseModel):
    user_id: str


@router.post("/projects/{project_id}/request-architect")
async def request_architect(project_id: str, request: Request):
    """The TSD asks for a Solution Architect.

    This produces no package. The architect reads the project itself: the
    brief, the transcripts, the requirements, the journeys, the history. A
    briefing bundle would be a copy, and a copy goes stale the moment the
    project moves.
    """
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    permissions.require(
        permissions.can_move_stage(user, project),
        "Only this project's TSD requests an architect",
    )
    if project.get("architect_id"):
        raise HTTPException(status_code=400, detail="This project already has an architect")

    await db.projects.update_one({"id": project_id},
                                 {"$set": {"architect_requested_at": _now()}})
    await _audit("project", project_id, "architect_requested", user, {})
    await _alert_senior_partner(
        project, user,
        f"Architect needed on {project.get('name')}",
        f"<p><strong>{user.get('name')}</strong> has requested a Solution Architect for "
        f"<strong>{project.get('name')}</strong>.</p>"
        f"<p>This stage waits for your selection.</p>",
    )
    candidates = await db.users.find(
        {"can_architect": True, "status": "active"},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1},
    ).to_list(100)
    return {"requested_at": _now(), "candidates": candidates}


@router.get("/staff")
async def list_staff(request: Request):
    """Everybody who can be put on a project.

    This used to be the staff of the project's unit. A pod deliberately mixes
    people from across the capability teams -- an architect from Frontier, a
    model engineer from Foundry, security from Firewall -- so narrowing the
    list to one unit made forming a correct pod impossible rather than merely
    inconvenient.

    Names, emails and function roles only. The full staff directory, with the
    fields that are nobody else's business, stays administrators-only.
    """
    await _get_user(request)
    people = await db.users.find(
        {"status": {"$ne": "disabled"}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "function_role": 1,
         "can_architect": 1, "picture": 1},
    ).sort("name", 1).to_list(1000)
    return {"staff": people, "total": len(people)}


@router.get("/architect-candidates")
async def architect_candidates(request: Request):
    """Engineers who may be named Solution Architect.

    Architects come from the engineering team, so this is engineers carrying
    `can_architect` rather than a separate pool of people.
    """
    await _get_user(request)
    return await db.users.find(
        {"can_architect": True, "status": "active"},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "function_role": 1},
    ).to_list(100)


@router.post("/projects/{project_id}/select-architect")
async def select_architect(project_id: str, data: ArchitectSelection, request: Request):
    """Name the technical owner. The Senior Partner alone.

    This is the one place the Senior Partner sits on the critical path, and it
    is deliberate: stage 6 waits for them rather than routing around them.
    """
    user = await _get_user(request)
    permissions.require(
        permissions.can_select_architect(user),
        "Only the Senior Partner selects the Solution Architect",
    )
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    chosen = await db.users.find_one(
        {"user_id": data.user_id, "status": "active"}, {"_id": 0, "user_id": 1, "name": 1})
    if not chosen:
        raise HTTPException(status_code=404, detail="That person was not found")
    if not await db.users.count_documents({"user_id": data.user_id, "can_architect": True}):
        raise HTTPException(
            status_code=400,
            detail=f"{chosen['name']} is not marked as able to architect. An administrator "
                   f"grants that on their account.",
        )

    await db.projects.update_one({"id": project_id}, {"$set": {
        "architect_id": chosen["user_id"],
        "architect_name": chosen["name"],
        "architecture_status": "in_progress",
    }})
    await _audit("project", project_id, "architect_selected", user,
                 {"architect_id": chosen["user_id"], "architect_name": chosen["name"]})

    project["architect_id"] = chosen["user_id"]
    project["architect_name"] = chosen["name"]
    await _send_stage_email(project.get("stage") or FIRST_STAGE, project, user)
    return {"architect_id": chosen["user_id"], "architect_name": chosen["name"]}



@router.post("/projects/{project_id}/lose")
async def mark_lost(project_id: str, request: Request, reason: Optional[str] = None):
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    now = _now()
    await db.projects.update_one({"id": project_id}, {"$set": {
        "status": LOST_STAGE_KEY,
        "lost_at": now,
        "lost_reason": reason or "",
    }})
    await _audit("project", project_id, "lost", user, {"reason": reason})
    return {"message": "Project marked as lost"}


class AssignOwner(BaseModel):
    delivery_owner_id: str


@router.post("/projects/{project_id}/assign-owner")
async def assign_owner(project_id: str, data: AssignOwner, request: Request):
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    owner = await db.users.find_one({"user_id": data.delivery_owner_id}, {"_id": 0, "name": 1, "email": 1})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    await db.projects.update_one({"id": project_id}, {"$set": {
        "delivery_owner_id": data.delivery_owner_id,
        "delivery_owner_name": owner["name"],
    }})
    await _audit("project", project_id, "owner_assigned", user, {"owner": owner["name"]})
    return {"message": "Delivery owner assigned", "owner_name": owner["name"]}


# ===========================================================================
# PROJECT-SCOPED CONTACTS (Client Profile sub-page)
# ===========================================================================
@router.get("/projects/{project_id}/contacts")
async def project_contacts(project_id: str, request: Request):
    """Return all contacts attached to the project's client, plus events + upcoming birthdays."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "client_id": 1, "client_name_snapshot": 1})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not permissions.can_view_all_projects(user):
        mine = await db.projects.find_one(
            {"id": project_id, **permissions.project_scope_filter(user)}, {"_id": 0, "id": 1}
        )
        if not mine:
            raise HTTPException(status_code=403, detail="You can only open projects you manage or work on")


    client_name = project.get("client_name_snapshot") or ""
    client_id = project.get("client_id")

    or_conditions = []
    if client_id:
        or_conditions.append({"client_id": client_id})
    if client_name:
        or_conditions.append({"client_name": {"$regex": f"^{client_name}$", "$options": "i"}})

    contacts = []
    if or_conditions:
        cursor = db.contacts.find({"$or": or_conditions}, {"_id": 0}).sort("full_name", 1)
        contacts = await cursor.to_list(200)

    # Compute upcoming birthdays in the next 14 days from contact.birthday + spouse_birthday + work_anniversary
    today = datetime.now(timezone.utc).date()
    upcoming = []
    for c in contacts:
        for field, kind in (("birthday", "birthday"),
                            ("work_anniversary", "work_anniversary"),
                            ("spouse_birthday", "spouse_birthday")):
            ds = c.get(field) or ""
            if not ds:
                continue
            try:
                parts = ds.split("-")
                if len(parts) == 2:
                    day, month = int(parts[0]), int(parts[1])
                elif len(parts) == 3:
                    day, month = int(parts[2]), int(parts[1])
                else:
                    continue
                try:
                    nxt = today.replace(year=today.year, month=month, day=day)
                except ValueError:
                    continue
                if nxt < today:
                    nxt = nxt.replace(year=today.year + 1)
                delta = (nxt - today).days
                if delta <= 14:
                    label = c["full_name"] if kind == "birthday" else (
                        f"{c.get('spouse_name','Spouse')} (spouse of {c['full_name']})" if kind == "spouse_birthday"
                        else f"{c['full_name']} — work anniversary"
                    )
                    upcoming.append({
                        "contact_id": c["contact_id"],
                        "label": label,
                        "kind": kind,
                        "days_until": delta,
                        "date": nxt.isoformat(),
                    })
            except Exception:
                continue
    upcoming.sort(key=lambda x: x["days_until"])

    # Pull stored upcoming events for these contacts too
    contact_ids = [c["contact_id"] for c in contacts]
    events = []
    if contact_ids:
        events_cursor = db.events.find({"contact_id": {"$in": contact_ids}}, {"_id": 0})
        events = await events_cursor.to_list(200)

    return {
        "client_name": client_name,
        "contacts": [_redact_contact(c, user) for c in contacts],
        "events": events,
        "upcoming_birthdays": upcoming,
        "pii_visible": _can_view_contact_pii(user),
    }


@router.get("/dashboard/email-health")
async def email_health(request: Request):
    """Email send health snapshot — today's count, failures, top templates."""
    await _get_user(request)
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_ago_iso = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    sent_today = await db.email_logs.count_documents({
        "sent_at": {"$gte": today_iso},
        "status": "sent",
    })
    failed_today = await db.email_logs.count_documents({
        "sent_at": {"$gte": today_iso},
        "status": {"$ne": "sent"},
    })
    total_week = await db.email_logs.count_documents({"sent_at": {"$gte": week_ago_iso}})

    # Top templates fired this week
    pipeline = [
        {"$match": {"sent_at": {"$gte": week_ago_iso}}},
        {"$group": {"_id": "$template_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_templates = []
    async for doc in db.email_logs.aggregate(pipeline):
        top_templates.append({"template": doc["_id"] or "unknown", "count": doc["count"]})

    # Recent failures (last 5)
    recent_failures = []
    async for doc in db.email_logs.find(
        {"status": {"$ne": "sent"}},
        {"_id": 0, "to": 1, "subject": 1, "status": 1, "error": 1, "sent_at": 1, "template_name": 1},
    ).sort("sent_at", -1).limit(5):
        recent_failures.append(doc)

    return {
        "sent_today": sent_today,
        "failed_today": failed_today,
        "total_week": total_week,
        "top_templates": top_templates,
        "recent_failures": recent_failures,
    }


# ===========================================================================
# BUILD TRACK — status + comment thread + daily standup
# ===========================================================================
class BuildUpdate(BaseModel):
    status: Optional[str] = None      # planning | building | blocked | ready_for_qa
    comment: Optional[str] = None     # free text comment to append to thread


@router.post("/projects/{project_id}/build-update")
async def build_update(project_id: str, data: BuildUpdate, request: Request):
    """Engineer or Delivery Owner posts a build status / comment.
    Status options: planning, building, blocked, ready_for_qa.
    """
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # A status value belongs to a project that is actually being built, but a
    # written progress note does not: anyone working a project should be able
    # to record where it stands.
    #
    # This used to test `track == "build"`. Tracks are retired, so that field
    # is now always absent and the check would have refused every update. What
    # it meant is expressed directly: has this project reached Engineering.
    if data.status and (project.get("stage") or FIRST_STAGE) < BUILD_STAGE:
        raise HTTPException(
            status_code=400,
            detail="Build status applies once a project reaches Engineering; post a comment instead",
        )

    if not permissions.can_view_all_projects(user):
        scope = permissions.project_scope_filter(user)
        mine = await db.projects.find_one({"id": project_id, **scope}, {"_id": 0, "id": 1})
        if not mine:
            raise HTTPException(
                status_code=403,
                detail="You can only post updates on projects you are assigned to",
            )

    now = _now()
    updates: Dict[str, Any] = {}

    if data.status:
        if data.status not in BUILD_STATUS_OPTIONS:
            raise HTTPException(status_code=400, detail=f"status must be one of {BUILD_STATUS_OPTIONS}")
        updates["build_status"] = data.status

    if data.comment:
        comments = project.get("build_comments", [])
        comments.append({
            "by": user.get("user_id"),
            "by_name": user.get("name"),
            "at": now,
            "text": data.comment,
        })
        updates["build_comments"] = comments

    if not updates:
        raise HTTPException(status_code=400, detail="Provide status and/or comment")

    await db.projects.update_one({"id": project_id}, {"$set": updates})
    await _audit("project", project_id, "build_update", user, {"status": data.status, "has_comment": bool(data.comment)})
    return {"message": "Build update saved", **updates}


@router.get("/projects/{project_id}/build-comments")
async def list_build_comments(project_id: str, request: Request):
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "build_comments": 1, "build_status": 1})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not permissions.can_view_all_projects(user):
        mine = await db.projects.find_one(
            {"id": project_id, **permissions.project_scope_filter(user)}, {"_id": 0, "id": 1}
        )
        if not mine:
            raise HTTPException(status_code=403, detail="You can only open projects you manage or work on")

    return {
        "build_status": project.get("build_status"),
        "build_comments": project.get("build_comments", []),
    }


# ===========================================================================
# MILESTONES
# ===========================================================================
class MilestoneCreate(BaseModel):
    project_id: str
    milestone_name: str
    deliverable: Optional[str] = ""
    target_date: Optional[str] = None
    payment_percent: Optional[float] = 0
    payment_amount: Optional[float] = 0


@router.post("/milestones")
async def create_milestone(data: MilestoneCreate, request: Request):
    user = await _get_user(request)
    milestone = {
        "milestone_id": str(uuid.uuid4()),
        **data.model_dump(),
        "delivered_date": None,
        "invoice_status": "pending",
        "invoice_url": None,
        "created_at": _now(),
    }
    await db.milestones.insert_one(milestone)
    await _audit("milestone", milestone["milestone_id"], "created", user, {"project_id": data.project_id})
    milestone.pop("_id", None)
    return milestone


@router.post("/milestones/{milestone_id}/deliver")
async def deliver_milestone(milestone_id: str, request: Request):
    user = await _get_user(request)
    await db.milestones.update_one({"milestone_id": milestone_id}, {"$set": {
        "delivered_date": _now(),
    }})
    await _audit("milestone", milestone_id, "delivered", user, {})
    return {"message": "Milestone delivered"}


# ===========================================================================
# CONTACTS
# ===========================================================================
class ContactCreate(BaseModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = ""    # free-text client name (when client_id not set)
    full_name: str
    preferred_name: Optional[str] = ""
    title: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    linkedin: Optional[str] = ""
    birthday: Optional[str] = ""        # "DD-MM"
    work_anniversary: Optional[str] = ""
    spouse_name: Optional[str] = ""
    spouse_birthday: Optional[str] = ""
    children: List[Dict[str, str]] = []
    preferences: Dict[str, str] = {}
    strength: str = "warm"               # cold | warm | strong | champion
    notes: Optional[str] = ""


@router.get("/contacts")
async def list_contacts(request: Request, client_id: Optional[str] = None, q: Optional[str] = None):
    user = await _get_user(request)
    query: Dict[str, Any] = {}
    if not _can_view_all_contacts(user):
        query["created_by"] = user.get("user_id")
    if client_id:
        query["client_id"] = client_id
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.contacts.find(query, {"_id": 0}).sort("full_name", 1)
    contacts = await cursor.to_list(500)
    return [
        {**_redact_contact(c, user), "_can_manage": _can_manage_contact(c, user)}
        for c in contacts
    ]


@router.post("/contacts")
async def create_contact(data: ContactCreate, request: Request):
    user = await _get_user(request)
    contact = {
        "contact_id": str(uuid.uuid4()),
        **data.model_dump(),
        "last_contact_date": None,
        "last_contact_notes": None,
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name"),
        "created_at": _now(),
    }
    await db.contacts.insert_one(contact)
    contact.pop("_id", None)
    contact["_can_manage"] = True
    await _audit("contact", contact["contact_id"], "created", user, {"name": data.full_name})

    # If birthday is set, create event
    if data.birthday:
        await db.events.insert_one({
            "event_id": str(uuid.uuid4()),
            "contact_id": contact["contact_id"],
            "contact_name": data.full_name,
            "event_type": "birthday",
            "event_date": data.birthday,
            "notes": "",
            "recurring": True,
            "last_celebrated": None,
            "created_at": _now(),
        })
    return contact


@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str, request: Request):
    user = await _get_user(request)
    contact = await db.contacts.find_one({"contact_id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if not _can_view_all_contacts(user) and not _can_manage_contact(contact, user):
        raise HTTPException(status_code=404, detail="Contact not found")
    redacted = _redact_contact(contact, user)
    redacted["_can_manage"] = _can_manage_contact(contact, user)
    return redacted


@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, data: ContactCreate, request: Request):
    user = await _get_user(request)
    contact = await db.contacts.find_one({"contact_id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    permissions.require(_can_manage_contact(contact, user), "You can only edit contacts you created")

    updates = data.model_dump()
    # Ownership is recorded at creation and must not be overwritten by an edit.
    updates.pop("created_by", None)
    updates.pop("created_by_name", None)
    await db.contacts.update_one({"contact_id": contact_id}, {"$set": updates})
    await _audit("contact", contact_id, "updated", user, {})
    return {"message": "Contact updated"}


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, request: Request):
    user = await _get_user(request)
    contact = await db.contacts.find_one({"contact_id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    permissions.require(_can_manage_contact(contact, user), "You can only delete contacts you created")

    await db.contacts.delete_one({"contact_id": contact_id})
    # The birthday/anniversary events belong to this contact and would otherwise
    # linger as orphans on the calendar.
    await db.events.delete_many({"contact_id": contact_id})
    await _audit("contact", contact_id, "deleted", user, {"name": contact.get("full_name")})
    return {"message": "Contact deleted"}


# ===========================================================================
# EVENTS (birthdays, anniversaries — calendar view)
# ===========================================================================
@router.get("/events")
async def list_events(request: Request, days: int = 90):
    """Return upcoming events within the next N days (default 90)."""
    await _get_user(request)
    cursor = db.events.find({}, {"_id": 0})
    events = await cursor.to_list(500)
    # Compute next occurrence
    today = datetime.now(timezone.utc).date()
    upcoming = []
    for e in events:
        date_str = e.get("event_date", "")
        if not date_str:
            continue
        try:
            # Accept DD-MM or YYYY-MM-DD
            parts = date_str.split("-")
            if len(parts) == 2:
                day, month = int(parts[0]), int(parts[1])
            elif len(parts) == 3:
                day, month = int(parts[2]), int(parts[1])
            else:
                continue
            year = today.year
            try:
                next_date = today.replace(year=year, month=month, day=day)
            except ValueError:
                continue
            if next_date < today:
                next_date = next_date.replace(year=year + 1)
            delta = (next_date - today).days
            if delta <= days:
                e["next_occurrence"] = next_date.isoformat()
                e["days_until"] = delta
                upcoming.append(e)
        except Exception:
            continue

    # Staff birthdays, from what each person set on their own profile.
    #
    # These are not rows in `events`: nobody types a colleague's birthday into
    # the contacts book, and waiting for an administrator to do it is why the
    # calendar had none. A person fills in their own, and it appears here.
    #
    # Only the day and month are published. The year is stored so a date field
    # can hold it, but showing it would tell the whole firm everybody's age,
    # which is not what anyone agreed to by filling in a birthday.
    async for u in db.users.find(
        {"status": "active", "birthday": {"$nin": [None, ""]}},
        {"_id": 0, "user_id": 1, "name": 1, "birthday": 1, "picture": 1},
    ):
        try:
            born = datetime.strptime(u["birthday"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            continue
        try:
            next_date = today.replace(month=born.month, day=born.day)
        except ValueError:
            continue                      # 29 February in a non-leap year
        if next_date < today:
            try:
                next_date = next_date.replace(year=today.year + 1)
            except ValueError:
                continue
        delta = (next_date - today).days
        if delta > days:
            continue
        # Shaped like the contact events it sits beside. The calendar reads
        # `event_type` and `contact_name` off every row, so a staff birthday
        # that named its fields differently took the whole page down rather
        # than simply rendering oddly.
        upcoming.append({
            "event_id": f"staff_birthday_{u['user_id']}",
            "event_type": "birthday",
            "contact_name": u.get("name"),
            "picture": u.get("picture"),
            "event_date": f"{born.day:02d}-{born.month:02d}",
            "next_occurrence": next_date.isoformat(),
            "days_until": delta,
            # Marks it as a colleague rather than a client contact.
            "is_staff": True,
        })

    upcoming.sort(key=lambda x: x.get("days_until", 999))
    return upcoming


# ===========================================================================
# PROSPECTS
# ===========================================================================
class ProspectCreate(BaseModel):
    company_name: str
    contact_name: Optional[str] = ""
    contact_email: Optional[str] = ""
    contact_linkedin: Optional[str] = ""
    industry: Optional[str] = ""
    size: Optional[str] = ""
    research_notes: Optional[str] = ""
    outbound_sequence: Optional[str] = ""


@router.get("/prospects")
async def list_prospects(request: Request, status: Optional[str] = None):
    await _get_user(request)
    query = {"status": status} if status else {}
    cursor = db.prospects.find(query, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)


@router.post("/prospects")
async def create_prospect(data: ProspectCreate, request: Request):
    user = await _get_user(request)
    prospect = {
        "prospect_id": str(uuid.uuid4()),
        **data.model_dump(),
        "status": "researched",
        "last_touch": None,
        "assigned_owner_id": user.get("user_id"),
        "assigned_owner_name": user.get("name"),
        "created_at": _now(),
    }
    await db.prospects.insert_one(prospect)
    prospect.pop("_id", None)
    await _audit("prospect", prospect["prospect_id"], "created", user, {"company": data.company_name})
    return prospect


class ProspectStatus(BaseModel):
    status: str  # researched | outbound_sent | responded | qualified | handed_off | rejected


@router.post("/prospects/{prospect_id}/status")
async def update_prospect_status(prospect_id: str, data: ProspectStatus, request: Request):
    user = await _get_user(request)
    await db.prospects.update_one({"prospect_id": prospect_id}, {"$set": {
        "status": data.status,
        "last_touch": _now(),
    }})
    await _audit("prospect", prospect_id, f"status_{data.status}", user, {})

    # If qualified -> hand off: create project at stage 1
    if data.status == "handed_off":
        prospect = await db.prospects.find_one({"prospect_id": prospect_id}, {"_id": 0})
        if prospect:
            project_id = str(uuid.uuid4())
            new_project = {
                "id": project_id,
                "project_id_display": _generate_project_id(),
                "name": f"{prospect['company_name']} — opportunity",
                "client_id": None,
                "client_name_snapshot": prospect["company_name"],
                "website": "",
                "description": prospect.get("research_notes", "")[:500],
                "source": prospect.get("assigned_owner_name", ""),
                "stage": 1,
                "status": "prospect",
                "stage_history": [{"stage": 1, "at": _now(), "by": user.get("user_id"), "by_name": user.get("name"), "note": f"Handed off from prospect {prospect_id}"}],
                "created_by": user.get("user_id"),
                "created_by_name": user.get("name"),
                "created_at": _now(),
                "prospect_id": prospect_id,
                "client_documents": [],
            }
            await db.projects.insert_one(new_project)
            await _send_stage_email(1, new_project, user)
            return {"message": "Handed off", "project_id": project_id}

    return {"message": "Status updated"}


# ===========================================================================
# TICKETS (engineer work)
# ===========================================================================
class TicketCreate(BaseModel):
    project_id: str
    milestone_id: Optional[str] = None
    title: str
    acceptance_criteria: Optional[str] = ""
    estimated_effort: str = "M"  # S | M | L
    assigned_engineer_id: Optional[str] = None


@router.get("/tickets")
async def list_tickets(
    request: Request,
    engineer_id: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
):
    user = await _get_user(request)
    query: Dict[str, Any] = {}
    if engineer_id:
        query["assigned_engineer_id"] = engineer_id
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    cursor = db.tickets.find(query, {"_id": 0}).sort("created_at", -1)
    tickets = await cursor.to_list(500)

    # Say who may act on each one, so the page can offer edit and delete to
    # the people who actually have them rather than to everybody.
    projects = {
        p["id"]: p
        async for p in db.projects.find(
            {"id": {"$in": sorted({t.get("project_id") for t in tickets if t.get("project_id")})}},
            {"_id": 0},
        )
    }
    admin = permissions.is_admin(user)
    uid = user.get("user_id")
    for t in tickets:
        t["_can_manage"] = bool(
            admin
            or t.get("created_by_id") == uid
            or permissions.can_manage_project(user, projects.get(t.get("project_id")) or {})
        )
    return tickets


@router.post("/tickets")
async def create_ticket(data: TicketCreate, request: Request):
    user = await _get_user(request)
    eng_name = None
    if data.assigned_engineer_id:
        eng = await db.users.find_one({"user_id": data.assigned_engineer_id}, {"_id": 0, "name": 1})
        eng_name = eng["name"] if eng else None
    ticket = {
        "ticket_id": str(uuid.uuid4()),
        **data.model_dump(),
        "assigned_engineer_name": eng_name,
        "status": "queued",
        "created_by_id": user.get("user_id"),
        "created_by_name": user.get("name"),
        "created_at": _now(),
        "shipped_at": None,
    }
    await db.tickets.insert_one(ticket)
    ticket.pop("_id", None)
    await _audit("ticket", ticket["ticket_id"], "created", user, {"title": data.title})
    return ticket


class TicketStatus(BaseModel):
    status: str  # queued | in_progress | in_review | shipped


@router.post("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, data: TicketStatus, request: Request):
    user = await _get_user(request)
    updates: Dict[str, Any] = {"status": data.status}
    if data.status == "shipped":
        updates["shipped_at"] = _now()
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": updates})
    await _audit("ticket", ticket_id, f"status_{data.status}", user, {})
    return {"message": "Ticket updated"}


class TicketUpdate(BaseModel):
    # All optional so a partial edit (e.g. retitle only) does not clobber the
    # fields that were not touched. `exclude_unset` is used below to tell the
    # difference between "not sent" and "sent as empty".
    project_id: Optional[str] = None
    milestone_id: Optional[str] = None
    title: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    estimated_effort: Optional[str] = None  # S | M | L
    assigned_engineer_id: Optional[str] = None


@router.put("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, data: TicketUpdate, request: Request):
    """Edit an engineering ticket's fields (not its status — that stays on
    /status so the two changes are audited separately)."""
    user = await _get_user(request)

    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Editing was open to anybody signed in, which is wider than the page ever
    # offered. The rule applied here is the one delete uses, so a ticket cannot
    # be changed by somebody who would not be allowed to remove it.
    permissions.require(
        await _can_manage_ticket(ticket, user),
        "Only the person who raised this ticket, its project's manager, or an administrator can change it",
    )

    updates: Dict[str, Any] = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    if "assigned_engineer_id" in updates:
        eng = await db.users.find_one(
            {"user_id": updates["assigned_engineer_id"]}, {"_id": 0, "name": 1}
        )
        updates["assigned_engineer_name"] = eng["name"] if eng else None
    updates["updated_at"] = _now()

    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": updates})
    await _audit("ticket", ticket_id, "updated", user, {"fields": sorted(updates.keys())})

    refreshed = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    return refreshed


@router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, request: Request):
    """Remove a ticket.

    Open to the same people who may edit it -- whoever raised it, the manager
    of its project, and administrators. A ticket that can be changed but never
    withdrawn leaves the board carrying work nobody intends to do.
    """
    user = await _get_user(request)

    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    permissions.require(
        await _can_manage_ticket(ticket, user),
        "Only the person who raised this ticket, its project's manager, or an administrator can delete it",
    )

    await db.tickets.delete_one({"ticket_id": ticket_id})
    # Recorded before it goes, so the log still says what was removed.
    await _audit("ticket", ticket_id, "deleted", user, {"title": ticket.get("title")})
    return {"message": "Ticket deleted"}


# ===========================================================================
# MESSAGES (relationship touches — skeleton; Phase B: WhatsApp/Email send)
# ===========================================================================
class MessageDraft(BaseModel):
    contact_id: str
    project_id: Optional[str] = None
    message_type: str = "checkin"     # birthday | anniversary | checkin | insight | celebration
    draft_content: str
    tier: int = 2                      # 1 | 2 | 3
    channel: str = "email"             # email only (WhatsApp/SMS removed)


@router.get("/messages")
async def list_messages(request: Request, status: Optional[str] = None):
    user = await _get_user(request)
    query = {"status": status} if status else {}
    cursor = db.messages.find(query, {"_id": 0}).sort("created_at", -1)
    messages = await cursor.to_list(500)
    # The drafter (or an administrator) may delete a message; everyone may view.
    is_admin = permissions.is_admin(user)
    for m in messages:
        m["_can_manage"] = is_admin or m.get("drafted_by_id") == user.get("user_id")
    return messages


@router.post("/messages")
async def create_message_draft(data: MessageDraft, request: Request):
    user = await _get_user(request)
    msg = {
        "message_id": str(uuid.uuid4()),
        **data.model_dump(),
        "final_content": data.draft_content,
        "drafted_by_id": user.get("user_id"),
        "drafted_by_name": user.get("name"),
        "approved_by_id": None,
        "approved_by_name": None,
        "sent_by_id": None,
        "sent_by_name": None,
        "status": "pending_approval" if data.tier == 1 else "approved",
        "sent_at": None,
        "created_at": _now(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    await _audit("message", msg["message_id"], "drafted", user, {})
    return msg


class MessageDecision(BaseModel):
    action: str  # approve | reject | send
    final_content: Optional[str] = None


@router.post("/messages/{message_id}/action")
async def message_action(message_id: str, data: MessageDecision, request: Request):
    user = await _get_user(request)
    msg = await db.messages.find_one({"message_id": message_id}, {"_id": 0})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    updates: Dict[str, Any] = {}
    if data.action == "approve":
        updates["status"] = "approved"
        updates["approved_by_id"] = user.get("user_id")
        updates["approved_by_name"] = user.get("name")
        if data.final_content:
            updates["final_content"] = data.final_content
    elif data.action == "reject":
        updates["status"] = "rejected"
    elif data.action == "send":
        channel = (msg.get("channel") or "email").strip().lower()
        if channel != "email":
            raise HTTPException(status_code=400, detail="Only email delivery is available")
        body_text = (msg.get("final_content") or msg.get("draft_content") or "").strip()

        contact = await db.contacts.find_one(
            {"contact_id": msg.get("contact_id")},
            {"_id": 0, "full_name": 1, "email": 1},
        )
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        import html as _html
        from services import send_email
        from services.email_templates import _base

        to_email = (contact.get("email") or "").strip()
        if not to_email:
            raise HTTPException(status_code=400, detail="This contact has no email on file")
        contact_name = contact.get("full_name") or "there"
        kind = (msg.get("message_type") or "checkin").replace("_", " ").capitalize()
        subject = f"{contact_name}, a {kind.lower()} from THCO"
        body_html = _base(subject, f"<p>{_html.escape(body_text).replace(chr(10), '<br/>')}</p>")
        result = await send_email(
            to=[to_email],
            subject=subject,
            html=body_html,
            template_name="flow_message",
            context={"contact_id": msg.get("contact_id"), "message_type": msg.get("message_type")},
        )

        if result.get("status") == "sent":
            updates["status"] = "sent"
            updates["sent_at"] = _now()
        else:
            updates["status"] = "failed"
            updates["send_error"] = result.get("error") or result.get("status") or "delivery failed"
        updates["sent_by_id"] = user.get("user_id")
        updates["sent_by_name"] = user.get("name")
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.messages.update_one({"message_id": message_id}, {"$set": updates})
    await _audit("message", message_id, data.action, user, {})
    verb = {"approve": "approved", "reject": "rejected", "send": "sent"}.get(data.action, data.action)
    if data.action == "send" and updates.get("status") != "sent":
        verb = "failed to send"
    return {"message": f"Message {verb}", **updates}


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, request: Request):
    user = await _get_user(request)
    msg = await db.messages.find_one({"message_id": message_id}, {"_id": 0})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    # A message may be removed by its drafter or an administrator. This mirrors
    # contact ownership: the record is team-visible, but only its author (or an
    # admin) can destroy it.
    permissions.require(
        permissions.is_admin(user) or msg.get("drafted_by_id") == user.get("user_id"),
        "You can only delete messages you drafted",
    )
    await db.messages.delete_one({"message_id": message_id})
    await _audit("message", message_id, "deleted", user, {"contact_id": msg.get("contact_id")})
    return {"message": "Message deleted"}


# ===========================================================================
# QUESTION LIBRARY (for brief templates)
# ===========================================================================
class QuestionItem(BaseModel):
    category: str
    question: str
    industry: Optional[str] = "general"
    order: int = 0


@router.get("/questions")
async def list_questions(request: Request, industry: Optional[str] = None):
    user = await _get_user(request)
    query = {"industry": industry} if industry else {}
    cursor = db.question_library.find(query, {"_id": 0}).sort([("category", 1), ("order", 1)])
    questions = await cursor.to_list(500)

    # So the page offers a delete only where the server would honour one.
    admin = permissions.is_admin(user)
    uid = user.get("user_id")
    for q in questions:
        q["_can_manage"] = bool(admin or q.get("created_by") == uid)
    return questions


@router.post("/questions")
async def add_question(data: QuestionItem, request: Request):
    user = await _get_user(request)
    item = {
        "question_id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": _now(),
        "created_by": user.get("user_id"),
    }
    await db.question_library.insert_one(item)
    item.pop("_id", None)
    return item


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str, request: Request):
    """Remove a question from the shared library.

    Whoever added it, or an administrator -- the same rule contacts and tickets
    use. This is a library everyone draws on, and it previously accepted a
    delete from anybody signed in, so one person could quietly empty a resource
    the whole firm relies on.
    """
    user = await _get_user(request)

    question = await db.question_library.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    permissions.require(
        permissions.is_admin(user) or question.get("created_by") == user.get("user_id"),
        "Only the person who added this question, or an administrator, can delete it",
    )

    await db.question_library.delete_one({"question_id": question_id})
    await _audit("question", question_id, "deleted", user,
                 {"text": (question.get("text") or "")[:120]})
    return {"message": "Deleted"}


# ===========================================================================
# AUDIT LOG
# ===========================================================================
@router.get("/audit-log")
async def list_audit(
    request: Request,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 200,
):
    await _get_user(request)
    query: Dict[str, Any] = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    cursor = db.audit_log.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(limit)


# ===========================================================================
# ROLE ASSIGNMENT (admin UI for assigning users to flow roles)
# ===========================================================================
@router.get("/users-by-function/{function_role}")
async def users_by_function(function_role: str, request: Request):
    """People to offer for a delivery assignment.

    Whoever actually holds the function comes first, because that is a
    deliberate grant. Everybody active follows, so a stage that needs a name
    can always be completed: an empty dropdown is not a permission error, it
    is a dead end with no explanation, and that is what the old flag-based
    lists produced once the flags stopped being maintained.
    """
    await _get_user(request)
    if function_role not in permissions.FUNCTION_ROLES:
        raise HTTPException(status_code=400, detail="Unknown function role")

    fields = {"_id": 0, "user_id": 1, "name": 1, "email": 1,
              "function_role": 1, "can_architect": 1}
    holders = await db.users.find(
        {"function_role": function_role, "status": "active"}, fields
    ).sort("name", 1).to_list(200)
    held_ids = {u["user_id"] for u in holders}

    others = await db.users.find(
        {"status": "active", "user_id": {"$nin": list(held_ids)}}, fields
    ).sort("name", 1).to_list(300)

    for u in holders:
        u["holds_function"] = True
    for u in others:
        u["holds_function"] = False
    return holders + others


@router.get("/users-by-role/{flag}")
async def users_by_role(flag: str, request: Request):
    """People to offer for a pipeline assignment.

    These flags predate project managers and are almost entirely unset -- one
    person in the company carries is_engineer and nobody carries the rest. So
    the dropdowns they fed came back empty, and the stages that require a name
    could not be completed by anybody: an empty list is not a permission
    error, it is a dead end with no explanation.

    Whoever holds the flag still comes first, since that is a deliberate
    assignment. Everybody active follows, so there is always somebody to pick.
    """
    await _get_user(request)
    valid = {f for f, _ in FLOW_ROLE_FLAGS}
    if flag not in valid:
        raise HTTPException(status_code=400, detail="Invalid role flag")

    fields = {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    holders = await db.users.find({flag: True, "status": "active"}, fields).to_list(100)
    held = {u["user_id"] for u in holders}
    others = await db.users.find(
        {"status": "active", "user_id": {"$nin": list(held)}}, fields
    ).sort("name", 1).to_list(300)

    for u in holders:
        u["holds_role"] = True
    return holders + others


@router.get("/roles")
async def list_flow_roles(request: Request):
    """Return all flow role flags with assigned users."""
    await _get_user(request)
    result = []
    for flag, label in FLOW_ROLE_FLAGS:
        users = await db.users.find(
            {flag: True, "status": "active"},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1}
        ).to_list(50)
        result.append({"flag": flag, "label": label, "users": users})
    return result


class RoleAssign(BaseModel):
    user_id: str
    flag: str
    value: bool


@router.post("/roles/assign")
async def assign_flow_role(data: RoleAssign, request: Request):
    user = await _get_user(request)
    # Admin guard — only super_admin or HR can assign flow roles
    if not (user.get("role") == "super_admin" or user.get("is_hr")):
        raise HTTPException(status_code=403, detail="Only admins or HR can assign flow roles")
    valid_flags = [f for f, _ in FLOW_ROLE_FLAGS]
    if data.flag not in valid_flags:
        raise HTTPException(status_code=400, detail="Invalid role flag")
    target = await db.users.find_one({"user_id": data.user_id}, {"_id": 0, "name": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"user_id": data.user_id}, {"$set": {data.flag: data.value}})
    await _audit("user_role", data.user_id, f"{'grant' if data.value else 'revoke'}_{data.flag}", user,
                 {"target": target["name"]})
    return {"message": "Role updated"}


# ===========================================================================
# DASHBOARD (role-based)
# ===========================================================================
@router.get("/dashboard")
async def my_dashboard(request: Request):
    user = await _get_user(request)
    user_id = user.get("user_id")

    # Common: active projects where I am delivery owner or creator (not completed)
    my_active = await db.projects.count_documents({
        "$or": [{"delivery_owner_id": user_id}, {"created_by": user_id}, {"assigned_engineer_id": user_id}, {"pricing_owner_id": user_id}],
        "stage": {"$lt": 10},
    })

    pipeline_counts: Dict[int, int] = {}
    async for doc in db.projects.aggregate([{"$group": {"_id": "$stage", "count": {"$sum": 1}}}]):
        pipeline_counts[doc["_id"] or 1] = doc["count"]

    # Approval queue (Stage 7 → awaiting Executive Approver)
    approval_queue = await db.projects.count_documents({"stage": 7})

    # Pending proposals (Stage 6 → awaiting pricing owner / ops to write proposal)
    # Projects waiting on the Senior Partner to name an architect. Stage 6 is
    # the one place the lifecycle deliberately blocks on a single person, so
    # it is worth counting on its own.
    pending_proposals = await db.projects.count_documents(
        {"stage": 6, "architect_id": None})

    # Anything from Engineering onward is being built.
    in_build_count = await db.projects.count_documents({"stage": {"$gte": BUILD_STAGE}})

    # Build statuses for the engineer dashboard. This matched `track: "build"`
    # before; tracks are retired, so it matches the stage that replaced them.
    build_status_counts: Dict[str, int] = {}
    async for doc in db.projects.aggregate([
        {"$match": {"stage": {"$gte": BUILD_STAGE}, "build_status": {"$ne": None}}},
        {"$group": {"_id": "$build_status", "count": {"$sum": 1}}}
    ]):
        build_status_counts[doc["_id"]] = doc["count"]

    # Upcoming events (7 days)
    events = await list_events(request, days=7)

    # Outstanding milestones (delivered but not invoiced)
    overdue_invoices = await db.milestones.count_documents({
        "delivered_date": {"$ne": None},
        "invoice_status": {"$in": ["pending", "overdue"]},
    })

    # Prospect counts by status
    prospect_counts: Dict[str, int] = {}
    async for doc in db.prospects.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        prospect_counts[doc["_id"] or "researched"] = doc["count"]

    # My tickets
    my_tickets = await db.tickets.count_documents({"assigned_engineer_id": user_id, "status": {"$ne": "shipped"}})

    return {
        "my_active_projects": my_active,
        "pipeline_counts": pipeline_counts,
        "approval_queue": approval_queue,
        "pending_proposals": pending_proposals,
        "in_build_count": in_build_count,
        "build_status_counts": build_status_counts,
        "upcoming_events_7d": len(events),
        "events": events[:10],
        "overdue_invoices": overdue_invoices,
        "prospect_counts": prospect_counts,
        "my_tickets": my_tickets,
        "stages_meta": STAGES,
    }
