"""THCO Flow — Project Management System.

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
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/flow", tags=["flow"])
db = None


def set_db(database):
    global db
    db = database


async def _get_user(request: Request) -> dict:
    from server import get_current_user
    return await get_current_user(request)


# ===========================================================================
# THE 12 STAGES + ROLE MAP
# ===========================================================================
STAGES = {
    1:  {"key": "new_client",          "label": "New Client",              "role_next": "is_delivery_coordinator", "track": "main"},
    2:  {"key": "coordinator_picked",  "label": "Coordinator Picked",      "role_next": "is_delivery_owner",    "track": "main"},
    3:  {"key": "meeting_scheduled",   "label": "Meeting Scheduled",       "role_next": "is_delivery_owner",    "track": "main"},
    4:  {"key": "package_building",    "label": "Package Building",        "role_next": "is_delivery_owner",    "track": "main"},
    5:  {"key": "send_package",        "label": "Send Package",            "role_next": "is_operations_owner",  "track": "main"},
    # SPLIT at 5 → two sibling records: proposal track (6-8) + build track (9-10)
    6:  {"key": "proposal",            "label": "Proposal",                "role_next": "is_executive_approver","track": "proposal"},
    7:  {"key": "exec_approval",       "label": "Executive Approval",      "role_next": "is_operations_owner",  "track": "proposal"},
    8:  {"key": "proposal_sent",       "label": "Proposal Sent to Client", "role_next": None,                   "track": "proposal"},
    9:  {"key": "in_build",            "label": "In Build (Engineering)",  "role_next": "is_delivery_owner",    "track": "build"},
    10: {"key": "completed",           "label": "Completed",               "role_next": None,                   "track": "build"},
}
# Lost / declined sub-state
LOST_STAGE_KEY = "lost"
BUILD_STATUS_OPTIONS = ["planning", "building", "blocked", "ready_for_qa"]

FLOW_ROLE_FLAGS = [
    ("is_delivery_coordinator",   "Delivery Coordinator"),
    ("is_delivery_owner",         "Delivery Owner (project lead)"),
    ("is_operations_owner",       "Operations Owner (Proposals)"),
    ("is_executive_approver",     "Executive Approver"),
    ("is_engineer",               "Engineer"),
    ("is_relationship_owner",     "Relationship Owner (touch plan)"),
    ("is_prospect_owner",         "Prospect / Outbound Owner"),
]


# ===========================================================================
# HELPERS
# ===========================================================================
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_project_id() -> str:
    year = datetime.now(timezone.utc).year
    # Find current max number for the year
    return f"THCO-{year}-{uuid.uuid4().hex[:6].upper()}"


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


async def _users_with_flag(flag: str) -> List[dict]:
    cursor = db.users.find({flag: True, "status": "active"}, {"_id": 0, "user_id": 1, "email": 1, "name": 1})
    return await cursor.to_list(100)


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
    if _can_view_contact_pii(user):
        contact["_pii_visible"] = True
        return contact
    redacted = dict(contact)
    # Drop PII fields entirely — frontend will simply not render those rows,
    # so the contact card looks natural (as if those fields were never filled).
    for f in PII_FIELDS:
        redacted[f] = ""
    redacted["_pii_visible"] = False
    return redacted


async def _send_stage_email(stage: int, project: dict, actor: dict):
    """Send Resend email to users matching the role for the NEXT stage's role_next."""
    from services import send_email
    from services.email_templates import _base

    cfg = STAGES.get(stage)
    if not cfg or not cfg.get("role_next"):
        return
    recipients = await _users_with_flag(cfg["role_next"])
    if not recipients:
        return

    project_link = f"/flow/projects/{project['id']}"
    subject = f"[THCO Flow] {cfg['label']} — {project.get('name', 'Project')}"
    body_html = f"""
      <h2 style="margin:0 0 16px;color:#1B4332;font-size:20px;">Stage {stage}: {cfg['label']}</h2>
      <p>Project <strong>{project.get('name')}</strong> for client
      <strong>{project.get('client_name_snapshot') or 'Unknown'}</strong>
      has advanced to <strong>{cfg['label']}</strong>.</p>
      <p>Moved by: <strong>{actor.get('name')}</strong> at {_now()}.</p>
      <p>You are receiving this because you hold the <code>{cfg['role_next']}</code> role.</p>
    """
    html = _base(subject, body_html, cta_url=project_link, cta_text="Open Project")

    emails = [u["email"] for u in recipients]
    await send_email(
        to=emails,
        subject=subject,
        html=html,
        template_name=f"flow_stage_{stage}",
        context={"stage": stage, "project_id": project["id"]},
    )


def _serialize_project(p: dict) -> dict:
    p.pop("_id", None)
    stage = p.get("stage", 1)
    p["stage"] = stage
    p["stage_label"] = STAGES.get(stage, {}).get("label", "Unknown")
    p["stage_key"] = STAGES.get(stage, {}).get("key", "unknown")
    p["track"] = p.get("track") or STAGES.get(stage, {}).get("track", "main")
    return p


# Legacy stage migration (old 12-stage → new 10-stage)
LEGACY_STAGE_MAP = {
    # old stage -> (new stage, track)
    1: (1, "main"),   # prospect -> new_client
    2: (2, "main"),   # qualified_assigned -> coordinator_picked
    3: (3, "main"),   # discovery_scheduled -> meeting_scheduled
    4: (4, "main"),   # package_building -> package_building
    5: (5, "main"),   # package_sent -> send_package
    6: (6, "proposal"),  # proposal_drafted -> Proposal
    7: (7, "proposal"),  # proposal_approved -> Exec Approval
    8: (8, "proposal"),  # proposal_sent -> Proposal Sent
    9: (9, "build"),     # contract_drafting → REMOVED, fold to In Build
    10: (9, "build"),    # contract_signed → REMOVED, fold to In Build
    11: (9, "build"),    # in_delivery -> In Build
    12: (10, "build"),   # completed -> completed
}


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


@router.post("/projects")
async def create_project(data: ProjectCreate, request: Request):
    """Create a project at Stage 1 (Prospect)."""
    user = await _get_user(request)

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
        # 10-stage state machine (split tracks: main 1-5, proposal 6-8, build 9-10)
        "stage": 1,
        "status": "new_client",
        "track": "main",
        "parent_project_id": None,
        "sibling_project_id": None,
        "stage_history": [{"stage": 1, "at": _now(), "by": user.get("user_id"), "by_name": user.get("name")}],
        # ownership
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name"),
        "delivery_owner_id": None,
        "delivery_owner_name": None,
        "pricing_owner_id": None,
        "pricing_owner_name": None,
        "assigned_engineer_id": None,
        "assigned_engineer_name": None,
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
        # financials
        "total_value": None,
        "currency": "USD",
        # dates
        "created_at": _now(),
        "start_date": None,
        "end_date": None,
        "signed_at": None,
        "completed_at": None,
        "lost_at": None,
        "lost_reason": None,
        # build-track specifics
        "build_status": None,   # planning | building | blocked | ready_for_qa
        "build_comments": [],   # list of {by, by_name, at, text}
        # legacy compat
        "current_review_id": None,
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)

    await _audit("project", project_id, "created", user, {"stage": 1, "client": data.client_name})
    await _send_stage_email(1, project, user)

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
    await _get_user(request)
    query: Dict[str, Any] = {}
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
    return [_serialize_project(p) for p in projects]


@router.get("/projects/board")
async def board(request: Request):
    """Kanban board — projects grouped by 10 new stages with track migration of legacy data."""
    await _get_user(request)
    cursor = db.projects.find({}, {"_id": 0}).sort("created_at", -1)
    projects = await cursor.to_list(1000)
    board: Dict[int, List[dict]] = {i: [] for i in range(1, 11)}
    for p in projects:
        stage = p.get("stage")
        track = p.get("track")
        needs_save = False
        if not stage:
            # Backfill from old internal status string
            legacy_status_map = {
                "awaiting_delegation": 4, "delegated": 9, "under_review": 9,
                "revision_requested": 6, "approved_for_build": 9, "in_build": 9, "completed": 10,
                "prospect": 1, "new_client": 1,
            }
            stage = legacy_status_map.get(p.get("status"), 1)
            needs_save = True

        # If stage is still in the old 12-stage range, remap to new 10-stage
        if stage in LEGACY_STAGE_MAP and stage > 10:
            new_stage, new_track = LEGACY_STAGE_MAP[stage]
            stage = new_stage
            track = new_track
            needs_save = True
        elif stage in LEGACY_STAGE_MAP and not track:
            track = LEGACY_STAGE_MAP[stage][1]
            needs_save = True

        if not track:
            track = STAGES.get(stage, {}).get("track", "main")
            needs_save = True

        if needs_save:
            await db.projects.update_one({"id": p["id"]}, {"$set": {"stage": stage, "track": track}})
        p["stage"] = stage
        p["track"] = track
        if 1 <= stage <= 10:
            board[stage].append(_serialize_project(p))

    return {
        "stages": [{"stage": k, **v} for k, v in STAGES.items()],
        "board": board,
    }


@router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request):
    await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Attach milestones, tickets
    milestones = await db.milestones.find({"project_id": project_id}, {"_id": 0}).sort("target_date", 1).to_list(100)
    tickets = await db.tickets.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    project["milestones"] = milestones
    project["tickets"] = tickets
    return _serialize_project(project)


class StageTransition(BaseModel):
    target_stage: int = Field(..., ge=1, le=10)
    note: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None  # arbitrary stage data (pricing, package_url, etc.)


@router.post("/projects/{project_id}/transition")
async def transition_stage(project_id: str, data: StageTransition, request: Request):
    """Advance or revert a project to any stage. Records history + sends email."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if data.target_stage not in STAGES:
        raise HTTPException(status_code=400, detail="Invalid stage")

    now = _now()
    history = project.get("stage_history", [])
    history.append({
        "stage": data.target_stage,
        "from_stage": project.get("stage"),
        "at": now,
        "by": user.get("user_id"),
        "by_name": user.get("name"),
        "note": data.note or "",
    })

    target = data.target_stage
    payload = data.payload or {}
    updates: Dict[str, Any] = {
        "stage": target,
        "status": STAGES[target]["key"],
        "track": STAGES[target]["track"],
        "stage_history": history,
    }

    # ------- STRUCTURED VALIDATORS at gate stages -------
    # Gate 1→2: only Delivery Coordinator (is_delivery_coordinator) can pick a client, and must assign Delivery Owner
    if target == 2:
        if not (user.get("is_delivery_coordinator") or user.get("role") == "super_admin"):
            raise HTTPException(status_code=403, detail="Only the Delivery Coordinator can pick a new client")
        owner_id = payload.get("delivery_owner_id")
        if not owner_id:
            raise HTTPException(status_code=400, detail="delivery_owner_id is required to advance to Stage 2")
        owner = await db.users.find_one({"user_id": owner_id}, {"_id": 0, "name": 1})
        if not owner:
            raise HTTPException(status_code=404, detail="Delivery Owner user not found")
        updates["delivery_owner_id"] = owner_id
        updates["delivery_owner_name"] = owner["name"]

    # Gate 4→5: Delivery Owner sets operations_owner; Delivery Coordinator sets engineer.
    # Project must end Stage 5 with BOTH operations_owner_id and assigned_engineer_id set.
    if target == 5:
        operations_owner_id = payload.get("operations_owner_id") or payload.get("pricing_owner_id") or project.get("pricing_owner_id")
        engineer_id     = payload.get("engineer_id")      or project.get("assigned_engineer_id")
        # who is allowed to set what
        ops_in = payload.get("operations_owner_id") or payload.get("pricing_owner_id")
        if ops_in:
            if not (user.get("is_delivery_owner") or user.get("is_delivery_coordinator") or user.get("role") == "super_admin"):
                raise HTTPException(status_code=403, detail="Only Delivery Owner or Coordinator can set the Operations Owner")
            ops = await db.users.find_one({"user_id": ops_in}, {"_id": 0, "name": 1, "is_operations_owner": 1})
            if not ops:
                raise HTTPException(status_code=404, detail="Operations Owner user not found")
            if not ops.get("is_operations_owner"):
                raise HTTPException(status_code=400, detail="Selected user does not hold the is_operations_owner role")
            updates["pricing_owner_id"] = ops_in  # column kept for back-compat
            updates["pricing_owner_name"] = ops["name"]
            operations_owner_id = ops_in
        if "engineer_id" in payload and payload["engineer_id"]:
            if not (user.get("is_delivery_coordinator") or user.get("role") == "super_admin"):
                raise HTTPException(status_code=403, detail="Only the Delivery Coordinator can assign the Engineer")
            eng = await db.users.find_one({"user_id": payload["engineer_id"]}, {"_id": 0, "name": 1, "is_engineer": 1})
            if not eng:
                raise HTTPException(status_code=404, detail="Engineer user not found")
            if not eng.get("is_engineer"):
                raise HTTPException(status_code=400, detail="Selected user does not hold the is_engineer role")
            updates["assigned_engineer_id"] = payload["engineer_id"]
            updates["assigned_engineer_name"] = eng["name"]
            engineer_id = payload["engineer_id"]
        if not operations_owner_id:
            raise HTTPException(status_code=400, detail="Operations Owner must be set (Delivery Owner)")
        if not engineer_id:
            raise HTTPException(status_code=400, detail="Engineer must be set (Delivery Coordinator)")

    # Auto-set milestone timestamps on the new stage numbers
    if target == 9 and not project.get("start_date"):
        updates["start_date"] = now
        updates["build_status"] = updates.get("build_status") or "planning"
    if target == 10:
        updates["completed_at"] = now
    if target == 8:
        # Proposal marked as sent
        updates["proposal_sent_at"] = now

    # Apply remaining payload keys (whitelist write-once doc fields)
    ALLOWED_PAYLOAD = {"package_url", "pricing_data", "proposal_url", "total_value",
                       "currency", "brief_document_url", "roadmap_document_url",
                       "delivery_owner_id", "operations_owner_id", "pricing_owner_id", "engineer_id"}
    for k, v in payload.items():
        if k in ALLOWED_PAYLOAD and k not in ("delivery_owner_id", "operations_owner_id", "pricing_owner_id", "engineer_id"):
            updates[k] = v

    await db.projects.update_one({"id": project_id}, {"$set": updates})
    await _audit("project", project_id, f"stage_{target}", user, {"note": data.note})

    project.update(updates)

    # ------- SPLIT logic at Stage 5 → spawn sibling Proposal + Build records -------
    siblings = []
    if target == 5 and not project.get("split_done"):
        # 1) Proposal sibling at Stage 6 (owner = pricing_owner)
        proposal_id = str(uuid.uuid4())
        proposal_doc = {
            **{k: v for k, v in project.items() if k not in ("id", "_id", "stage_history", "split_done")},
            "id": proposal_id,
            "project_id_display": project["project_id_display"] + "-P",
            "stage": 6,
            "status": STAGES[6]["key"],
            "track": "proposal",
            "parent_project_id": project_id,
            "sibling_project_id": None,  # set after build created
            "stage_history": [{"stage": 6, "at": now, "by": user.get("user_id"),
                               "by_name": user.get("name"), "note": "Auto-spawned from Stage 5 split"}],
            "created_at": now,
        }
        # 2) Build sibling at Stage 9 (owner = delivery_owner, engineer assigned)
        build_id = str(uuid.uuid4())
        build_doc = {
            **{k: v for k, v in project.items() if k not in ("id", "_id", "stage_history", "split_done")},
            "id": build_id,
            "project_id_display": project["project_id_display"] + "-B",
            "stage": 9,
            "status": STAGES[9]["key"],
            "track": "build",
            "parent_project_id": project_id,
            "sibling_project_id": proposal_id,
            "stage_history": [{"stage": 9, "at": now, "by": user.get("user_id"),
                               "by_name": user.get("name"), "note": "Auto-spawned from Stage 5 split"}],
            "created_at": now,
            "start_date": now,
            "build_status": "planning",
            "build_comments": [],
        }
        proposal_doc["sibling_project_id"] = build_id
        await db.projects.insert_one(proposal_doc)
        await db.projects.insert_one(build_doc)
        await db.projects.update_one({"id": project_id}, {"$set": {"split_done": True,
                                                                    "sibling_project_id": proposal_id}})
        await _audit("project", project_id, "split", user, {"proposal_id": proposal_id, "build_id": build_id})

        # Email both tracks' next-stage roles
        await _send_stage_email(6, proposal_doc, user)
        await _send_stage_email(9, build_doc, user)

        siblings = [{"id": proposal_id, "track": "proposal"}, {"id": build_id, "track": "build"}]
    else:
        await _send_stage_email(target, project, user)

    result = _serialize_project(project)
    if siblings:
        result["siblings"] = siblings
        result["split_done"] = True
    return result


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
    if project.get("track") != "build":
        raise HTTPException(status_code=400, detail="Build updates only allowed on build-track projects")

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
    await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "build_comments": 1, "build_status": 1})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
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
    if client_id:
        query["client_id"] = client_id
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.contacts.find(query, {"_id": 0}).sort("full_name", 1)
    contacts = await cursor.to_list(500)
    return [_redact_contact(c, user) for c in contacts]


@router.post("/contacts")
async def create_contact(data: ContactCreate, request: Request):
    user = await _get_user(request)
    contact = {
        "contact_id": str(uuid.uuid4()),
        **data.model_dump(),
        "last_contact_date": None,
        "last_contact_notes": None,
        "created_at": _now(),
    }
    await db.contacts.insert_one(contact)
    contact.pop("_id", None)
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
    return _redact_contact(contact, user)


@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, data: ContactCreate, request: Request):
    user = await _get_user(request)
    await db.contacts.update_one({"contact_id": contact_id}, {"$set": data.model_dump()})
    await _audit("contact", contact_id, "updated", user, {})
    return {"message": "Contact updated"}


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
    await _get_user(request)
    query: Dict[str, Any] = {}
    if engineer_id:
        query["assigned_engineer_id"] = engineer_id
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    cursor = db.tickets.find(query, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)


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


# ===========================================================================
# MESSAGES (relationship touches — skeleton; Phase B: WhatsApp/Email send)
# ===========================================================================
class MessageDraft(BaseModel):
    contact_id: str
    project_id: Optional[str] = None
    message_type: str = "checkin"     # birthday | anniversary | checkin | insight | celebration
    draft_content: str
    tier: int = 2                      # 1 | 2 | 3
    channel: str = "whatsapp"          # whatsapp | email | sms


@router.get("/messages")
async def list_messages(request: Request, status: Optional[str] = None):
    await _get_user(request)
    query = {"status": status} if status else {}
    cursor = db.messages.find(query, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)


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
        # TODO_PHASE_B: integrate WhatsApp (Twilio) / Email (Resend) actual send
        updates["status"] = "sent"
        updates["sent_at"] = _now()
        updates["sent_by_id"] = user.get("user_id")
        updates["sent_by_name"] = user.get("name")
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.messages.update_one({"message_id": message_id}, {"$set": updates})
    await _audit("message", message_id, data.action, user, {})
    return {"message": f"Message {data.action}d", **updates}


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
    await _get_user(request)
    query = {"industry": industry} if industry else {}
    cursor = db.question_library.find(query, {"_id": 0}).sort([("category", 1), ("order", 1)])
    return await cursor.to_list(500)


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
    await _get_user(request)
    await db.question_library.delete_one({"question_id": question_id})
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
@router.get("/users-by-role/{flag}")
async def users_by_role(flag: str, request: Request):
    """List active users holding a given flow role flag (for assignment dropdowns)."""
    await _get_user(request)
    valid = {f for f, _ in FLOW_ROLE_FLAGS}
    if flag not in valid:
        raise HTTPException(status_code=400, detail="Invalid role flag")
    users = await db.users.find(
        {flag: True, "status": "active"},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    ).to_list(100)
    return users


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
    pending_proposals = await db.projects.count_documents({"stage": 6})

    # In Build (Stage 9)
    in_build_count = await db.projects.count_documents({"stage": 9})

    # Build statuses for engineer dashboard
    build_status_counts: Dict[str, int] = {}
    async for doc in db.projects.aggregate([
        {"$match": {"track": "build", "build_status": {"$ne": None}}},
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
