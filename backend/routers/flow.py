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
from services import permissions
from services.notifications import notify_added_to_project, notify_removed_from_project
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


async def _resolve_collaborators(user_ids: List[str]) -> List[Dict[str, Any]]:
    """Turn submitted user ids into the name/email snapshots stored on a project.

    Unknown ids are dropped rather than rejected: a stale id from a removed
    account should not block a head from saving the rest of their team. The
    name is denormalised so the project still reads correctly later, while
    collaborator_ids stays the field permission checks match on.
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


# ---------------------------------------------------------------------------
# Contact ownership — a PM sees only the contacts they created; administrators
# see the whole directory. This is enforced server-side: the frontend may hide
# buttons, but these predicates are the boundary.
# ---------------------------------------------------------------------------
def _can_view_all_contacts(user: dict) -> bool:
    return permissions.is_admin(user)


def _can_manage_contact(contact: dict, user: dict) -> bool:
    return permissions.is_admin(user) or contact.get("created_by") == user.get("user_id")


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
    # The unit this work belongs to. A head may only open projects under the
    # unit they head, so this decides whether the create is allowed at all.
    unit_slug: Optional[str] = None
    # Staff to place on the project from the outset. Each is notified.
    collaborator_ids: List[str] = []


@router.post("/projects")
async def create_project(data: ProjectCreate, request: Request):
    """Create a project at Stage 1 (Prospect).

    Only a unit's head opens work under it. Staff no longer create their own
    projects -- they are added to one as a collaborator and see it appear on
    their dashboard.
    """
    user = await _get_user(request)

    unit_slug = (data.unit_slug or "").strip() or None
    if not permissions.is_admin(user):
        if not permissions.is_unit_head(user):
            raise HTTPException(
                status_code=403,
                detail="Only a project manager can open a project. Ask your unit's "
                       "project manager to create it and add you to it.",
            )
        if not unit_slug:
            raise HTTPException(status_code=400, detail="Choose the unit this project belongs to")
        if not permissions.can_create_project_in_unit(user, unit_slug):
            raise HTTPException(
                status_code=403,
                detail=f"You head {', '.join(permissions.headed_units(user))}, not {unit_slug}",
            )

    collaborators = await _resolve_collaborators(data.collaborator_ids)

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
        "unit_slug": unit_slug,
        # Explicitly not demo. Written on every new project so the one-off
        # migration that labels the pre-unit-head projects can recognise those
        # by the absence of this field, and never touch anything created since.
        "is_demo": False,
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name"),
        # staff placed on the project by its unit head
        "collaborator_ids": [c["user_id"] for c in collaborators],
        "collaborators": collaborators,
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

    if collaborators:
        await notify_added_to_project(db, project, collaborators, user)

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
    return [_serialize_project(p) for p in projects]


@router.get("/projects/board")
async def board(request: Request):
    """Kanban board — projects grouped by 10 new stages with track migration of legacy data."""
    user = await _get_user(request)
    # The board read every project in the database. The list beside it was
    # scoped, so a manager saw their own work in one view and everybody's in
    # the other.
    cursor = db.projects.find(permissions.project_scope_filter(user), {"_id": 0}).sort("created_at", -1)
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
    target_stage: int = Field(..., ge=1, le=10)
    note: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None  # arbitrary stage data (pricing, package_url, etc.)


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

    previous = project.get("project_manager_name")

    if not data.user_id:
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"project_manager_id": None, "project_manager_name": None,
                      "updated_at": _now()}},
        )
        await _audit("project", project_id, "manager_cleared", user, {"previous": previous})
        return {"project_id": project_id, "project_manager_name": None, "previous": previous}

    person = await db.users.find_one(
        {"user_id": data.user_id, "status": {"$ne": "disabled"}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1},
    )
    if not person:
        raise HTTPException(status_code=404, detail="That person does not have an active account")

    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"project_manager_id": person["user_id"],
                  "project_manager_name": person.get("name"),
                  "updated_at": _now()}},
    )
    # Running a project you cannot see would be a dead end.
    await db.projects.update_one(
        {"id": project_id, "collaborator_ids": {"$ne": person["user_id"]}},
        {"$addToSet": {"collaborator_ids": person["user_id"],
                       "collaborators": {"user_id": person["user_id"],
                                         "name": person.get("name"),
                                         "email": person.get("email")}}},
    )
    await _audit("project", project_id, "manager_set", user,
                 {"manager": person.get("name"), "previous": previous})

    return {
        "project_id": project_id,
        "project_manager_id": person["user_id"],
        "project_manager_name": person.get("name"),
        "previous": previous,
    }


class CollaboratorsSet(BaseModel):
    # The full intended team. Sent whole rather than as add/remove deltas so
    # two managers editing at once cannot interleave into a half-applied team.
    collaborator_ids: List[str] = []
    # Those among them who co-manage the project. Two managers on one project
    # is ordinary, and a co-manager can staff it and run its boards -- an
    # engineer on the same project cannot.
    manager_ids: List[str] = []


@router.put("/projects/{project_id}/collaborators")
async def set_collaborators(project_id: str, data: CollaboratorsSet, request: Request):
    """Set the staff working on a project.

    Only the head of the project's unit (or whoever opened it, or an admin)
    may change this -- being added to a project does not let you add others.
    Newly added people are notified; people already on it are not notified
    again, so re-saving the same team sends nothing.
    """
    user = await _get_user(request)

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    permissions.require(
        permissions.can_manage_project(user, project),
        "Only this project's project manager can change who works on it",
    )

    before = set(project.get("collaborator_ids") or [])
    collaborators = await _resolve_collaborators(data.collaborator_ids)
    after_ids = [c["user_id"] for c in collaborators]

    # A co-manager has to be on the project to manage it, so anyone marked a
    # manager but left off the team is simply kept out of the manager list
    # rather than granted rights over work they cannot see.
    manager_ids = [uid for uid in dict.fromkeys(data.manager_ids or []) if uid in after_ids]

    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"collaborator_ids": after_ids, "collaborators": collaborators,
                  "project_manager_ids": manager_ids,
                  "updated_at": _now()}},
    )

    added = [c for c in collaborators if c["user_id"] not in before]
    if added:
        await notify_added_to_project(db, project, added, user)

    removed = [c for c in (project.get("collaborators") or [])
               if c["user_id"] in (before - set(after_ids))]
    if removed:
        await notify_removed_from_project(db, project, removed, user)

    await _audit("project", project_id, "collaborators_set", user,
                 {"added": len(added), "total": len(after_ids),
                  "managers": len(manager_ids)})

    return {
        "project_id": project_id,
        "collaborators": collaborators,
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
    collab = await db.projects.find({"collaborator_ids": user_id, "created_by": {"$ne": user_id}}, {"_id": 0}).sort("created_at", -1).to_list(200)
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


@router.post("/projects/{project_id}/transition")
async def transition_stage(project_id: str, data: StageTransition, request: Request):
    """Advance or revert a project to any stage. Records history + sends email."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if data.target_stage not in STAGES:
        raise HTTPException(status_code=400, detail="Invalid stage")

    # Nothing checked who may move a project through the pipeline. Whoever runs
    # the project does -- the same rule as editing or restaffing it.
    permissions.require(
        permissions.can_manage_project(user, project),
        "Only this project's manager can move it through the pipeline",
    )

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
    # Stage 2 names the person who will own delivery. It used to be reserved
    # for whoever carried is_delivery_coordinator; nobody does, so the stage
    # could not be reached at all. The manager check above is the gate now --
    # the requirement that survives is naming somebody, not holding a flag.
    if target == 2:
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
            ops = await db.users.find_one({"user_id": ops_in}, {"_id": 0, "name": 1})
            if not ops:
                raise HTTPException(status_code=404, detail="Operations Owner user not found")
            updates["pricing_owner_id"] = ops_in  # column kept for back-compat
            updates["pricing_owner_name"] = ops["name"]
            operations_owner_id = ops_in
        if "engineer_id" in payload and payload["engineer_id"]:
            # Requiring the chosen person to carry is_engineer made the stage
            # impossible: one person in the company holds it.
            eng = await db.users.find_one({"user_id": payload["engineer_id"]}, {"_id": 0, "name": 1})
            if not eng:
                raise HTTPException(status_code=404, detail="Engineer user not found")
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

    # A status value belongs to the build track, but a written progress note
    # does not -- anyone working a project should be able to record where it
    # stands. Requiring the build track for both meant staff on every other
    # project had nowhere to post an update.
    if data.status and project.get("track") != "build":
        raise HTTPException(
            status_code=400,
            detail="Build status applies to build-track projects; post a comment instead",
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
