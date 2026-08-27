"""Crowther OS delivery artefacts.

The things a project produces as it moves: requirements, the Product Brief,
user journeys, uploaded architecture, demo rounds, client feedback and
documents. The pipeline in `flow.py` moves the project; this router is what
the stages actually produce, and what the gates in `_resolve_gate` read.

One rule runs through all of it: **there is no separate architect briefing.**
The architect reads the same requirements, journeys, briefs and transcripts
everyone else reads, from the moment they are named. A briefing package would
be a copy, and a copy goes stale the moment the project moves on.

Access follows the project, not the artefact. If you can open the project you
can read its artefacts; writing is narrower and stated per endpoint.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services import permissions

router = APIRouter(prefix="/delivery", tags=["delivery"])

db = None

UPLOADS_DIR = Path(__file__).parent.parent / "uploads" / "delivery"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Architecture arrives as a document rather than a diagram built in the app.
# Markdown is preferred because it reads as text; images and PDFs are accepted
# because that is what people actually have.
ARCHITECTURE_EXTENSIONS = {".md", ".markdown", ".txt", ".pdf", ".png", ".jpg", ".jpeg", ".svg", ".drawio"}
DOCUMENT_EXTENSIONS = ARCHITECTURE_EXTENSIONS | {".docx", ".doc", ".xlsx", ".csv", ".pptx"}
# Only the types `cv_parser.extract_text` (or a plain-text read) can actually
# turn into readable content. A transcript nobody can read without
# downloading it first defeats the point of not having a briefing pack.
TRANSCRIPT_EXTENSIONS = {".txt", ".md", ".pdf", ".docx", ".doc"}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024


def set_db(database):
    global db
    db = database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


async def _get_user(request: Request) -> dict:
    from server import get_current_user

    return await get_current_user(request)


async def _project_for_read(request: Request, project_id: str) -> tuple:
    """Load a project the caller is entitled to see, or refuse.

    Scoping is applied by re-querying with the caller's filter rather than by
    fetching and then hiding fields. A project nobody can find should not be
    readable to anyone who knows its id.
    """
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not permissions.can_view_all_projects(user):
        mine = await db.projects.find_one(
            {"id": project_id, **permissions.project_scope_filter(user)}, {"_id": 0, "id": 1}
        )
        if not mine:
            raise HTTPException(
                status_code=403, detail="You can only open projects you work on"
            )
    return user, project


def _summarise(entity_type: str, action: str, details: Dict[str, Any]) -> str:
    """One readable line for the activity feed."""
    noun = ENTITY_LABELS.get(entity_type, entity_type.replace("_", " ").capitalize())
    verb = action.replace("_", " ")

    if entity_type == "requirement" and details.get("req_ref"):
        noun = f"Requirement {details['req_ref']}"
    elif entity_type == "architecture" and details.get("version"):
        noun = f"Architecture v{details['version']}"
    elif entity_type == "product_brief" and details.get("version"):
        noun = f"Product Brief v{details['version']}"
    elif entity_type == "demo" and details.get("round"):
        noun = f"Demo round {details['round']}"

    if action.startswith("outcome_"):
        return f"{noun} {action.split('_', 1)[1]}"
    if action == "updated" and details.get("changed"):
        return f"{noun} updated ({', '.join(details['changed'])})"
    return f"{noun} {verb}"


# What each entity is called when an activity line is read back. "created" on
# its own tells nobody anything; "Requirement created" does.
ENTITY_LABELS = {
    "requirement": "Requirement",
    "journey": "User journey",
    "product_brief": "Product Brief",
    "architecture": "Architecture",
    "demo": "Demo round",
    "feedback": "Client feedback",
    "document": "Document",
    "scope_change": "Scope change",
    "decision": "Decision",
    "risk": "Risk",
}


async def _audit(entity_type: str, entity_id: str, action: str, user: dict,
                 project_id: str, details: Optional[Dict[str, Any]] = None):
    await db.audit_log.insert_one({
        "log_id": _new_id(),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "project_id": project_id,
        "action": action,
        # Written once, here, so every reader shows the same sentence rather
        # than each one reassembling it from parts and disagreeing.
        "summary": _summarise(entity_type, action, details or {}),
        "user_id": user.get("user_id"),
        "user_name": user.get("name"),
        "timestamp": _now(),
        "details": details or {},
    })


def _save_upload(file: UploadFile, project_id: str, prefix: str, allowed: set) -> tuple:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"{ext or 'That file type'} is not accepted here. Allowed: "
                   f"{', '.join(sorted(allowed))}",
        )
    content = file.file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 50MB limit")

    target_dir = UPLOADS_DIR / project_id
    target_dir.mkdir(parents=True, exist_ok=True)
    saved_name = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
    (target_dir / saved_name).write_bytes(content)
    return f"/api/delivery/files/{project_id}/{saved_name}", file.filename, len(content)


@router.get("/files/{project_id}/{filename}")
async def download_file(project_id: str, filename: str, request: Request):
    """Serve an uploaded file to somebody entitled to the project.

    The path is rebuilt from its parts rather than trusted, so a filename
    containing traversal segments cannot climb out of the project directory.
    """
    await _project_for_read(request, project_id)
    safe = Path(filename).name
    path = UPLOADS_DIR / project_id / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


# ===========================================================================
# REQUIREMENTS
# ===========================================================================
# The unit of scope. A kanban card is the unit of execution; a requirement is
# the thing the client is owed. Everything that talks about scope talks about
# these.
class RequirementIn(BaseModel):
    description: str
    category: Optional[str] = "Functional"
    priority: Optional[str] = "medium"
    status: Optional[str] = "proposed"      # proposed | committed | open_question | rejected
    acceptance_criteria: Optional[str] = ""
    source_type: Optional[str] = "manual"   # intake | transcript | demo_feedback | scope_change
    source_id: Optional[str] = None


class RequirementUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    acceptance_criteria: Optional[str] = None


@router.get("/projects/{project_id}/requirements")
async def list_requirements(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.requirements.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("req_ref", 1).to_list(500)


@router.post("/projects/{project_id}/requirements")
async def add_requirement(project_id: str, data: RequirementIn, request: Request):
    """Add a requirement.

    Once scope is frozen this refuses. A new requirement after client
    validation is a scope change with a decision behind it, not an edit, and
    quietly accepting it here is exactly how scope creep stops being visible.
    """
    user, project = await _project_for_read(request, project_id)
    if project.get("scope_frozen"):
        raise HTTPException(
            status_code=409,
            detail="Scope is frozen for this project. Raise a scope change instead, "
                   "so the impact is assessed and somebody decides.",
        )

    count = await db.requirements.count_documents({"project_id": project_id})
    doc = {
        "requirement_id": _new_id(),
        "project_id": project_id,
        "req_ref": f"R-{count + 1:02d}",
        **data.model_dump(),
        "superseded_by": None,
        "created_at": _now(),
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name"),
    }
    await db.requirements.insert_one(doc)
    doc.pop("_id", None)
    await db.projects.update_one(
        {"id": project_id}, {"$set": {"product_status": "drafting"}}
    )
    await _audit("requirement", doc["requirement_id"], "created", user, project_id,
                 {"req_ref": doc["req_ref"]})
    return doc


@router.patch("/projects/{project_id}/requirements/{requirement_id}")
async def update_requirement(project_id: str, requirement_id: str,
                             data: RequirementUpdate, request: Request):
    user, project = await _project_for_read(request, project_id)
    existing = await db.requirements.find_one(
        {"requirement_id": requirement_id, "project_id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Requirement not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return existing

    # After the freeze, only the status may move -- closing something out, or
    # marking it superseded. Rewriting what was agreed is a scope change.
    if project.get("scope_frozen") and set(updates) - {"status", "acceptance_criteria"}:
        raise HTTPException(
            status_code=409,
            detail="Scope is frozen. A requirement's wording cannot be changed here; "
                   "raise a scope change so the difference is recorded.",
        )

    await db.requirements.update_one({"requirement_id": requirement_id}, {"$set": updates})
    await _audit("requirement", requirement_id, "updated", user, project_id,
                 {"changed": sorted(updates)})
    return await db.requirements.find_one({"requirement_id": requirement_id}, {"_id": 0})


@router.delete("/projects/{project_id}/requirements/{requirement_id}")
async def delete_requirement(project_id: str, requirement_id: str, request: Request):
    user, project = await _project_for_read(request, project_id)
    if project.get("scope_frozen"):
        raise HTTPException(
            status_code=409,
            detail="Scope is frozen. Mark the requirement rejected rather than removing it, "
                   "so the record of what was agreed stays intact.",
        )
    result = await db.requirements.delete_one(
        {"requirement_id": requirement_id, "project_id": project_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Requirement not found")
    await _audit("requirement", requirement_id, "deleted", user, project_id, {})
    return {"deleted": True}


# ===========================================================================
# USER JOURNEYS
# ===========================================================================
class JourneyIn(BaseModel):
    title: str
    persona: Optional[str] = ""
    steps: Optional[str] = ""
    requirement_ids: List[str] = []


@router.get("/projects/{project_id}/journeys")
async def list_journeys(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.user_journeys.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(200)


@router.post("/projects/{project_id}/journeys")
async def add_journey(project_id: str, data: JourneyIn, request: Request):
    user, _ = await _project_for_read(request, project_id)
    doc = {
        "journey_id": _new_id(),
        "project_id": project_id,
        **data.model_dump(),
        "created_at": _now(),
        "created_by": user.get("user_id"),
    }
    await db.user_journeys.insert_one(doc)
    doc.pop("_id", None)
    await _audit("journey", doc["journey_id"], "created", user, project_id,
                 {"title": data.title})
    return doc


class JourneyUpdate(BaseModel):
    title: Optional[str] = None
    persona: Optional[str] = None
    steps: Optional[str] = None
    requirement_ids: Optional[List[str]] = None


@router.patch("/projects/{project_id}/journeys/{journey_id}")
async def update_journey(project_id: str, journey_id: str,
                         data: JourneyUpdate, request: Request):
    """Edit a journey in place.

    Journeys are the same kind of thing as requirements: a working statement of
    what the product must do, argued over during discovery and settled at scope
    freeze. So they are edited the same way, and they lock the same way.
    """
    user, project = await _project_for_read(request, project_id)
    existing = await db.user_journeys.find_one(
        {"journey_id": journey_id, "project_id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Journey not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return existing

    if project.get("scope_frozen"):
        raise HTTPException(
            status_code=409,
            detail="Scope is frozen. Raise a scope change so the difference is recorded.",
        )

    await db.user_journeys.update_one({"journey_id": journey_id}, {"$set": updates})
    await _audit("journey", journey_id, "updated", user, project_id,
                 {"changed": sorted(updates)})
    return await db.user_journeys.find_one({"journey_id": journey_id}, {"_id": 0})


@router.delete("/projects/{project_id}/journeys/{journey_id}")
async def delete_journey(project_id: str, journey_id: str, request: Request):
    user, _ = await _project_for_read(request, project_id)
    result = await db.user_journeys.delete_one(
        {"journey_id": journey_id, "project_id": project_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Journey not found")
    await _audit("journey", journey_id, "deleted", user, project_id, {})
    return {"deleted": True}


# ===========================================================================
# PRODUCT BRIEF
# ===========================================================================
# Versioned, never overwritten. The canonical statement of what is being built
# and why, and the thing Legal reads to write a contract.
class ProductBriefIn(BaseModel):
    problem: str
    outcomes: Optional[str] = ""
    success_metrics: Optional[str] = ""
    in_scope: Optional[str] = ""
    out_of_scope: Optional[str] = ""
    assumptions: Optional[str] = ""


@router.get("/projects/{project_id}/product-briefs")
async def list_product_briefs(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.product_briefs.find(
        {"project_id": project_id}, {"_id": 0}).sort("version", -1).to_list(50)


@router.post("/projects/{project_id}/product-briefs")
async def add_product_brief(project_id: str, data: ProductBriefIn, request: Request):
    """Write a new version of the Product Brief.

    Earlier versions are kept. A brief that can be edited in place cannot
    answer "what did we agree in June", which is the question it exists for.
    """
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project),
        "The Product Brief belongs to this project's TSD",
    )
    latest = await db.product_briefs.find_one(
        {"project_id": project_id}, {"_id": 0, "version": 1}, sort=[("version", -1)])
    version = (latest or {}).get("version", 0) + 1

    doc = {
        "brief_id": _new_id(),
        "project_id": project_id,
        "version": version,
        **data.model_dump(),
        "author_id": user.get("user_id"),
        "author_name": user.get("name"),
        "created_at": _now(),
    }
    await db.product_briefs.insert_one(doc)
    doc.pop("_id", None)
    await db.projects.update_one({"id": project_id}, {"$set": {"product_status": "defined"}})
    await _audit("product_brief", doc["brief_id"], "created", user, project_id,
                 {"version": version})
    return doc


# ===========================================================================
# ARCHITECTURE
# ===========================================================================
# Uploaded, not drawn. There is no canvas and no component graph: the architect
# submits a document, which is how architecture is actually produced here.
@router.get("/projects/{project_id}/architecture")
async def list_architecture(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.architecture_documents.find(
        {"project_id": project_id}, {"_id": 0}).sort("version", -1).to_list(100)


@router.post("/projects/{project_id}/architecture")
async def upload_architecture(
    project_id: str,
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    note: str = Form(""),
):
    """Upload an architecture document. The named architect alone.

    Not every architect-capable engineer: the architecture of a project belongs
    to the person accountable for it.
    """
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.can_upload_architecture(user, project),
        "Only this project's Solution Architect uploads its architecture",
    )

    url, original_name, size = _save_upload(file, project_id, "arch", ARCHITECTURE_EXTENSIONS)
    latest = await db.architecture_documents.find_one(
        {"project_id": project_id}, {"_id": 0, "version": 1}, sort=[("version", -1)])
    version = (latest or {}).get("version", 0) + 1

    doc = {
        "architecture_id": _new_id(),
        "project_id": project_id,
        "version": version,
        "title": (title or "").strip() or original_name or f"Architecture v{version}",
        "note": note or "",
        "file_url": url,
        "original_filename": original_name,
        "size_bytes": size,
        "uploaded_by": user.get("user_id"),
        "uploaded_by_name": user.get("name"),
        "uploaded_at": _now(),
    }
    await db.architecture_documents.insert_one(doc)
    doc.pop("_id", None)
    await db.projects.update_one(
        {"id": project_id}, {"$set": {"architecture_status": "uploaded"}})
    await _audit("architecture", doc["architecture_id"], "uploaded", user, project_id,
                 {"version": version})
    return doc


# ===========================================================================
# DEMOS
# ===========================================================================
# A collection, not a field. Several rounds before the client validates is
# normal and expected, and the system should be able to say how many there
# were rather than leaving it to memory.
class DemoIn(BaseModel):
    scheduled_for: Optional[str] = None
    materials_url: Optional[str] = ""
    notes: Optional[str] = ""


class DemoUpdate(BaseModel):
    scheduled_for: Optional[str] = None
    materials_url: Optional[str] = None
    notes: Optional[str] = None


class DemoOutcomeIn(BaseModel):
    outcome: str                       # iterate | validated | declined
    notes: Optional[str] = ""


@router.get("/projects/{project_id}/demos")
async def list_demos(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.demos.find(
        {"project_id": project_id}, {"_id": 0}).sort("round", 1).to_list(50)


@router.post("/projects/{project_id}/demos")
async def add_demo(project_id: str, data: DemoIn, request: Request):
    """Open a new demo round."""
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user)
        or permissions.is_project_tsd(user, project)
        or permissions.is_project_architect(user, project),
        "Demo rounds belong to this project's TSD or Solution Architect",
    )
    count = await db.demos.count_documents({"project_id": project_id})
    doc = {
        "demo_id": _new_id(),
        "project_id": project_id,
        "round": count + 1,
        "scheduled_for": data.scheduled_for,
        "materials_url": data.materials_url or "",
        "notes": data.notes or "",
        "outcome": "pending",
        "held_at": None,
        "created_at": _now(),
        "created_by": user.get("user_id"),
    }
    await db.demos.insert_one(doc)
    doc.pop("_id", None)
    await db.projects.update_one({"id": project_id}, {"$set": {"demo_status": "scheduled"}})
    await _audit("demo", doc["demo_id"], "created", user, project_id, {"round": doc["round"]})
    return doc


@router.patch("/projects/{project_id}/demos/{demo_id}")
async def update_demo(project_id: str, demo_id: str, data: DemoUpdate, request: Request):
    """Edit a round: its date, a link to the prototype, or the notes."""
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user)
        or permissions.is_project_tsd(user, project)
        or permissions.is_project_architect(user, project),
        "Demo rounds belong to this project's TSD or Solution Architect",
    )
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return await db.demos.find_one({"demo_id": demo_id}, {"_id": 0})

    result = await db.demos.update_one(
        {"demo_id": demo_id, "project_id": project_id}, {"$set": updates})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Demo not found")
    await _audit("demo", demo_id, "updated", user, project_id, {"changed": sorted(updates)})
    return await db.demos.find_one({"demo_id": demo_id}, {"_id": 0})


@router.post("/projects/{project_id}/demos/{demo_id}/materials")
async def upload_demo_material(
    project_id: str,
    demo_id: str,
    request: Request,
    file: UploadFile = File(...),
):
    """Attach wireframes, a deck or a recording to a demo round.

    Materials were the hole in this flow: the gate on stage 9 asks for a round
    with materials, and there was nowhere to put any, so the stage could never
    be satisfied however many times somebody marked the demo held.

    They are stored as ordinary project documents with `doc_type: "demo"`, so
    they also appear under Documents. A prototype built in an app builder is a
    link on the round instead; both count.
    """
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user)
        or permissions.is_project_tsd(user, project)
        or permissions.is_project_architect(user, project),
        "Demo materials belong to this project's TSD or Solution Architect",
    )
    demo = await db.demos.find_one({"demo_id": demo_id, "project_id": project_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found")

    url, original_name, size = _save_upload(file, project_id, "demo", DOCUMENT_EXTENSIONS)
    doc = {
        "document_id": _new_id(),
        "project_id": project_id,
        "demo_id": demo_id,
        "title": original_name,
        "doc_type": "demo",
        "content": "",
        "source_label": f"Demo round {demo.get('round')}",
        "source_date": None,
        "file_url": url,
        "original_filename": original_name,
        "size_bytes": size,
        "version": 1,
        "author_id": user.get("user_id"),
        "author_name": user.get("name"),
        "created_at": _now(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    await _audit("demo", demo_id, "material_added", user, project_id,
                 {"round": demo.get("round"), "file": original_name})
    return doc


@router.get("/projects/{project_id}/demos/{demo_id}/materials")
async def list_demo_materials(project_id: str, demo_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.documents.find(
        {"project_id": project_id, "demo_id": demo_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)


class DemoHeldIn(BaseModel):
    # When it actually happened. Defaulting to "now" was wrong for the ordinary
    # case: somebody records the demo after it finishes, often the next
    # morning, and the record then says it happened at a time it did not. The
    # closure report reads these timestamps, so the drift ends up in the
    # narrative of how the project ran.
    held_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    attendees: Optional[str] = ""


@router.post("/projects/{project_id}/demos/{demo_id}/held")
async def mark_demo_held(
    project_id: str, demo_id: str, request: Request,
    data: Optional[DemoHeldIn] = None,
):
    """Record that a demo happened, and when.

    `held_at` accepts a full date and time. Omitted, it still means now, so
    marking one held the moment it ends stays a single click.
    """
    user, project = await _project_for_read(request, project_id)
    # The architect too, not the TSD alone. Stage 9 (Mockup and Demo) is
    # architect-owned and `demo_held` is one of its two gate conditions -- so
    # refusing them here meant the person who owns the stage, creates the
    # round and uploads the materials could not satisfy their own gate, and
    # had to ask the TSD to click it. That contradicts the rule that an
    # architect advances the stages they own.
    #
    # The *outcome* stays with the TSD deliberately: that is what the client
    # said, and the TSD is the single channel for client information.
    permissions.require(
        permissions.is_admin(user)
        or permissions.is_project_tsd(user, project)
        or permissions.is_project_architect(user, project),
        "Whether a demo was held is recorded by this project's TSD or its Solution Architect",
    )
    payload = data or DemoHeldIn()
    updates: Dict[str, Any] = {"held_at": (payload.held_at or "").strip() or _now()}
    if payload.duration_minutes is not None:
        updates["duration_minutes"] = payload.duration_minutes
    if payload.attendees:
        updates["attendees"] = payload.attendees.strip()

    result = await db.demos.update_one(
        {"demo_id": demo_id, "project_id": project_id}, {"$set": updates})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Demo not found")
    await db.projects.update_one({"id": project_id}, {"$set": {"demo_status": "completed"}})
    await _audit("demo", demo_id, "held", user, project_id, {"held_at": updates["held_at"]})
    return {"held": True, **updates}


@router.delete("/projects/{project_id}/demos/{demo_id}")
async def delete_demo(project_id: str, demo_id: str, request: Request):
    """Delete a demo round.

    For the round opened by mistake, which otherwise sits in the list forever
    and miscounts every later round. A round the client has actually seen is
    refused: `held_at` or a recorded outcome makes it part of the project's
    history, and history is corrected by recording what happened next, not by
    deleting it.
    """
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user)
        or permissions.is_project_tsd(user, project)
        or permissions.is_project_architect(user, project),
        "Demo rounds belong to this project's TSD or Solution Architect",
    )
    demo = await db.demos.find_one({"demo_id": demo_id, "project_id": project_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found")
    if demo.get("held_at") or demo.get("outcome") not in (None, "", "pending"):
        raise HTTPException(
            status_code=409,
            detail="This round was held or has an outcome recorded. It is part of the "
                   "project's history — open a further round instead of deleting it.",
        )

    await db.demos.delete_one({"demo_id": demo_id})
    # Materials uploaded against it would otherwise be orphaned in the
    # documents list with no round to explain them.
    await db.documents.delete_many({"project_id": project_id, "demo_id": demo_id})

    # Renumber what is left, so rounds stay 1..n rather than gaining a hole
    # that makes "round 3" mean the second demo the client saw.
    remaining = await db.demos.find(
        {"project_id": project_id}, {"_id": 0, "demo_id": 1}
    ).sort("created_at", 1).to_list(200)
    for index, row in enumerate(remaining, start=1):
        await db.demos.update_one({"demo_id": row["demo_id"]}, {"$set": {"round": index}})

    await _audit("demo", demo_id, "deleted", user, project_id, {"round": demo.get("round")})
    return {"deleted": True, "rounds_remaining": len(remaining)}


@router.post("/projects/{project_id}/demos/{demo_id}/outcome")
async def set_demo_outcome(project_id: str, demo_id: str, data: DemoOutcomeIn, request: Request):
    """Record what the client said about a demo round.

    `validated` is the one that matters: it is what stage 11 checks, and it is
    what turns a demo into permission to build.
    """
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project),
        "Only this project's TSD records a client decision",
    )
    if data.outcome not in ("iterate", "validated", "declined"):
        raise HTTPException(
            status_code=400, detail="Outcome is iterate, validated or declined")

    demo = await db.demos.find_one({"demo_id": demo_id, "project_id": project_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found")

    await db.demos.update_one({"demo_id": demo_id}, {"$set": {
        "outcome": data.outcome,
        "notes": data.notes or demo.get("notes", ""),
        "held_at": demo.get("held_at") or _now(),
    }})

    project_updates = {
        "iterate": {"demo_status": "iteration_required"},
        "validated": {"demo_status": "client_validated", "client_status": "validated"},
        "declined": {"demo_status": "client_declined"},
    }[data.outcome]
    await db.projects.update_one({"id": project_id}, {"$set": project_updates})
    await _audit("demo", demo_id, f"outcome_{data.outcome}", user, project_id,
                 {"round": demo.get("round")})
    return {"outcome": data.outcome}


# ===========================================================================
# CLIENT FEEDBACK
# ===========================================================================
class FeedbackIn(BaseModel):
    demo_id: Optional[str] = None
    raw_text: str
    classification: Optional[str] = "within_scope"  # within_scope | scope_change | question | rejected


@router.get("/projects/{project_id}/feedback")
async def list_feedback(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.feedback_items.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/projects/{project_id}/feedback")
async def add_feedback(project_id: str, data: FeedbackIn, request: Request):
    """Capture what the client said.

    The TSD types this, because the TSD is the single channel for client
    information. It arrives by phone, email or WhatsApp and lands here so
    there is one place that knows what was asked for.
    """
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project),
        "Client feedback is recorded by this project's TSD",
    )
    doc = {
        "feedback_id": _new_id(),
        "project_id": project_id,
        **data.model_dump(),
        "captured_by": user.get("user_id"),
        "captured_by_name": user.get("name"),
        "created_at": _now(),
    }
    doc["attachments"] = []
    await db.feedback_items.insert_one(doc)
    doc.pop("_id", None)
    await _audit("feedback", doc["feedback_id"], "created", user, project_id,
                 {"classification": data.classification})
    return doc


@router.post("/feedback/{feedback_id}/attachments")
async def attach_to_feedback(
    feedback_id: str,
    request: Request,
    file: UploadFile = File(...),
):
    """Attach a file to a piece of client feedback.

    What a client sends is rarely only words: a marked-up screenshot, a
    spreadsheet of corrections, a forwarded email. Typing a summary and losing
    the original is how the detail gets argued about later, so the file is kept
    beside the feedback it belongs to rather than in the general document pile
    where nobody can tell which comment it came with.

    Anyone who can open the project may attach: whoever received the file is
    usually not the person who typed the feedback.
    """
    item = await db.feedback_items.find_one({"feedback_id": feedback_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
    user, _ = await _project_for_read(request, item["project_id"])

    url, original_name, size = _save_upload(
        file, item["project_id"], "feedback", DOCUMENT_EXTENSIONS
    )
    attachment = {
        "attachment_id": _new_id(),
        "filename": original_name,
        "file_url": url,
        "size_bytes": size,
        "uploaded_by_id": user.get("user_id"),
        "uploaded_by_name": user.get("name"),
        "uploaded_at": _now(),
    }
    await db.feedback_items.update_one(
        {"feedback_id": feedback_id}, {"$push": {"attachments": attachment}}
    )
    await _audit("feedback", feedback_id, "attachment_added", user, item["project_id"],
                 {"file": original_name})
    return attachment


@router.post("/milestones/{milestone_id}/deliverables")
async def attach_milestone_deliverable(
    milestone_id: str,
    request: Request,
    file: UploadFile = File(...),
):
    """Attach the actual deliverable to a milestone.

    A milestone names what is owed and when. Until now the deliverable itself
    was a line of text describing a file that lived somewhere else — which is
    exactly the arrangement that makes a payment conversation turn into a
    search through inboxes. The file goes on the milestone it satisfies.
    """
    milestone = await db.milestones.find_one({"milestone_id": milestone_id}, {"_id": 0})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    user, _ = await _project_for_read(request, milestone["project_id"])

    url, original_name, size = _save_upload(
        file, milestone["project_id"], "milestone", DOCUMENT_EXTENSIONS
    )
    attachment = {
        "attachment_id": _new_id(),
        "filename": original_name,
        "file_url": url,
        "size_bytes": size,
        "uploaded_by_id": user.get("user_id"),
        "uploaded_by_name": user.get("name"),
        "uploaded_at": _now(),
    }
    await db.milestones.update_one(
        {"milestone_id": milestone_id}, {"$push": {"deliverables": attachment}}
    )
    await _audit("milestone", milestone_id, "deliverable_added", user,
                 milestone["project_id"], {"file": original_name})
    return attachment


@router.delete("/milestones/{milestone_id}/deliverables/{attachment_id}")
async def remove_milestone_deliverable(milestone_id: str, attachment_id: str, request: Request):
    milestone = await db.milestones.find_one({"milestone_id": milestone_id}, {"_id": 0})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    user, project = await _project_for_read(request, milestone["project_id"])
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project),
        "Only this project's TSD can remove a deliverable",
    )
    await db.milestones.update_one(
        {"milestone_id": milestone_id},
        {"$pull": {"deliverables": {"attachment_id": attachment_id}}},
    )
    await _audit("milestone", milestone_id, "deliverable_removed", user,
                 milestone["project_id"], {})
    return {"removed": True}


@router.delete("/feedback/{feedback_id}/attachments/{attachment_id}")
async def remove_feedback_attachment(feedback_id: str, attachment_id: str, request: Request):
    """Remove an attachment. The feedback itself is never deleted."""
    item = await db.feedback_items.find_one({"feedback_id": feedback_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
    user, project = await _project_for_read(request, item["project_id"])
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project),
        "Only this project's TSD can remove an attachment",
    )
    await db.feedback_items.update_one(
        {"feedback_id": feedback_id},
        {"$pull": {"attachments": {"attachment_id": attachment_id}}},
    )
    await _audit("feedback", feedback_id, "attachment_removed", user, item["project_id"], {})
    return {"removed": True}


# ===========================================================================
# SCOPE CHANGES (CROWTHER_MIGRATION_PLAN.md §9.4)
# ===========================================================================
# Once `scope_frozen` is true (stage 11, Client Validation), a new or changed
# requirement can no longer edit the requirement set directly -- it creates a
# row here instead, so the impact is assessed and somebody decides. Rejected
# rows are kept and visible, never deleted (SPEC §52 rule 14: scope changes
# are never silently absorbed).
#
# The Senior Partner is notified, not asked, on an approved change that moves
# the timeline or the price above a threshold -- Informed and Consulted, not
# Responsible or Accountable. Impact is free text in Tier 1 (Tier 4 generates
# it); the two numeric fields below exist only so that threshold has
# something to actually check against, since free text alone can't be.
SCOPE_CHANGE_TIMELINE_THRESHOLD_DAYS = 2
SCOPE_CHANGE_COST_THRESHOLD_PCT = 5


class ScopeChangeIn(BaseModel):
    description: str
    origin_type: Optional[str] = "manual"     # demo_round | feedback | transcript | manual
    origin_id: Optional[str] = None
    impact_timeline: Optional[str] = ""
    impact_effort: Optional[str] = ""
    impact_cost: Optional[str] = ""
    impact_architecture: Optional[str] = ""
    # Optional structured hints behind the free text above, so the Senior
    # Partner notify-threshold can be computed. Leaving them blank just
    # means no automatic check runs for this particular change.
    impact_timeline_days: Optional[float] = None
    impact_cost_pct: Optional[float] = None


class ScopeChangeDecide(BaseModel):
    decision: str                              # approved | rejected | deferred
    decision_reason: Optional[str] = ""


@router.get("/projects/{project_id}/scope-changes")
async def list_scope_changes(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.scope_changes.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/projects/{project_id}/scope-changes")
async def raise_scope_change(project_id: str, data: ScopeChangeIn, request: Request):
    """Raise a scope change. The architect is always notified, since
    `impact_architecture` is their assessment to give, not the raiser's."""
    user, project = await _project_for_read(request, project_id)
    doc = {
        "scope_change_id": _new_id(),
        "project_id": project_id,
        **data.model_dump(),
        "decision": "pending",
        "decided_by_id": None, "decided_at": None,
        "creates_requirement_id": None,
        "raised_by_id": user.get("user_id"), "raised_by_name": user.get("name"),
        "created_at": _now(),
    }
    await db.scope_changes.insert_one(doc)
    doc.pop("_id", None)
    await _audit("scope_change", doc["scope_change_id"], "raised", user, project_id,
                 {"description": data.description[:120]})

    architect_id = project.get("architect_id")
    if architect_id:
        from services import notifications
        await notifications.notify_user_ids(
            db,
            user_ids=[architect_id],
            kind="scope_change_raised",
            title=f"Scope change needs your impact assessment: {project.get('name') or ''}",
            reason=data.description,
            link=f"/flow/projects/{project_id}",
            entity_type="scope_change", entity_id=doc["scope_change_id"],
            actor=user,
        )
    return doc


@router.post("/scope-changes/{scope_change_id}/decide")
async def decide_scope_change(scope_change_id: str, data: ScopeChangeDecide, request: Request):
    """The TSD decides: approve, reject or defer (decisions 2, 11, 12 all put
    the project's judgement calls with the TSD). Approved mints a requirement
    with status `committed` and `source_type: scope_change`."""
    user = await _get_user(request)
    sc = await db.scope_changes.find_one({"scope_change_id": scope_change_id}, {"_id": 0})
    if not sc:
        raise HTTPException(status_code=404, detail="Scope change not found")
    project = await db.projects.find_one({"id": sc["project_id"]}, {"_id": 0})
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project or {}),
        "Only this project's TSD can decide a scope change",
    )
    if data.decision not in ("approved", "rejected", "deferred"):
        raise HTTPException(status_code=400, detail="decision must be approved, rejected or deferred")

    update = {
        "decision": data.decision, "decision_reason": data.decision_reason,
        "decided_by_id": user.get("user_id"), "decided_at": _now(),
    }

    created_requirement_id = None
    if data.decision == "approved":
        count = await db.requirements.count_documents({"project_id": sc["project_id"]})
        req_doc = {
            "requirement_id": _new_id(),
            "project_id": sc["project_id"],
            "req_ref": f"R{count + 1}",
            "description": sc["description"],
            "category": "Functional",
            "priority": "medium",
            "status": "committed",
            "acceptance_criteria": "",
            "source_type": "scope_change",
            "source_id": scope_change_id,
            "created_by": user.get("user_id"),
            "created_at": _now(),
        }
        await db.requirements.insert_one(req_doc)
        created_requirement_id = req_doc["requirement_id"]
        update["creates_requirement_id"] = created_requirement_id

    await db.scope_changes.update_one({"scope_change_id": scope_change_id}, {"$set": update})
    await _audit("scope_change", scope_change_id, f"decided_{data.decision}", user, sc["project_id"],
                 {"reason": data.decision_reason})

    # Notified, not asked -- Informed and Consulted, never Responsible or
    # Accountable, and only above the threshold so every small tweak doesn't
    # become inbox noise.
    if data.decision == "approved":
        over_timeline = (sc.get("impact_timeline_days") or 0) > SCOPE_CHANGE_TIMELINE_THRESHOLD_DAYS
        over_cost = abs(sc.get("impact_cost_pct") or 0) > SCOPE_CHANGE_COST_THRESHOLD_PCT
        if over_timeline or over_cost:
            from services import notifications
            await notifications.notify_function_role_holders(
                db,
                function_roles=[permissions.SENIOR_PARTNER],
                kind=notifications.SCOPE_CHANGE_IMPACT_ALERT,
                title=f"Approved scope change moves timeline/price: {(project or {}).get('name') or ''}",
                reason=sc["description"],
                link=f"/flow/projects/{sc['project_id']}",
                entity_type="scope_change", entity_id=scope_change_id,
                actor=user,
            )

    return await db.scope_changes.find_one({"scope_change_id": scope_change_id}, {"_id": 0})


class ScopeChangeImpact(BaseModel):
    """The impact assessment, separately from the decision.

    Split from `ScopeChangeDecide` on purpose: assessing what a change costs
    and deciding whether to accept it are two acts, often by two people at two
    times. The architect assesses (`impact_architecture` is their call, which
    is why they are notified when one is raised); the TSD decides.
    """
    impact_timeline: Optional[str] = None
    impact_effort: Optional[str] = None
    impact_cost: Optional[str] = None
    impact_architecture: Optional[str] = None
    impact_timeline_days: Optional[float] = None
    impact_cost_pct: Optional[float] = None


@router.patch("/scope-changes/{scope_change_id}")
async def update_scope_change_impact(
    scope_change_id: str, data: ScopeChangeImpact, request: Request
):
    """Record the impact assessment on a scope change.

    Only the impact fields, and only while the change is still pending. The
    decision, who made it and when are not writable here -- letting an
    assessment quietly rewrite a decision already taken would make the record
    useless as a record, and SPEC §52 rule 14 is that scope changes are never
    silently absorbed.
    """
    sc = await db.scope_changes.find_one({"scope_change_id": scope_change_id}, {"_id": 0})
    if not sc:
        raise HTTPException(status_code=404, detail="Scope change not found")
    user, project = await _project_for_read(request, sc["project_id"])
    permissions.require(
        permissions.is_admin(user)
        or permissions.is_project_tsd(user, project)
        or user.get("user_id") == project.get("architect_id"),
        "The TSD or this project's architect records the impact",
    )
    if sc.get("decision") != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"This scope change was already {sc['decision']}. "
                   "Its impact assessment is part of that record.",
        )

    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return sc

    await db.scope_changes.update_one({"scope_change_id": scope_change_id}, {"$set": updates})
    await _audit("scope_change", scope_change_id, "impact_assessed", user, sc["project_id"],
                 {"changed": list(updates)})
    return await db.scope_changes.find_one({"scope_change_id": scope_change_id}, {"_id": 0})


# ===========================================================================
# DECISIONS AND RISKS
# ===========================================================================
# Lightweight logs, one row each -- a decision worth remembering, or a risk
# worth tracking, without a scoring model or a workflow of its own. Anyone
# on the project may add either; nothing here is a gate.
class DecisionIn(BaseModel):
    title: str
    description: Optional[str] = ""
    rationale: Optional[str] = ""


class RiskIn(BaseModel):
    title: str
    description: Optional[str] = ""
    likelihood: Optional[str] = "medium"   # low | medium | high
    impact: Optional[str] = "medium"       # low | medium | high
    mitigation: Optional[str] = ""


class RiskUpdate(BaseModel):
    status: Optional[str] = None           # open | mitigated | closed
    mitigation: Optional[str] = None


@router.get("/projects/{project_id}/decisions")
async def list_decisions(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.decisions.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/projects/{project_id}/decisions")
async def add_decision(project_id: str, data: DecisionIn, request: Request):
    user, _ = await _project_for_read(request, project_id)
    doc = {
        "decision_id": _new_id(),
        "project_id": project_id,
        **data.model_dump(),
        "decided_by_id": user.get("user_id"), "decided_by_name": user.get("name"),
        "created_at": _now(),
    }
    await db.decisions.insert_one(doc)
    doc.pop("_id", None)
    await _audit("decision", doc["decision_id"], "recorded", user, project_id, {"title": data.title})
    return doc


@router.get("/projects/{project_id}/risks")
async def list_risks(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.risks.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/projects/{project_id}/risks")
async def add_risk(project_id: str, data: RiskIn, request: Request):
    user, _ = await _project_for_read(request, project_id)
    doc = {
        "risk_id": _new_id(),
        "project_id": project_id,
        **data.model_dump(),
        "status": "open",
        "owner_id": user.get("user_id"), "owner_name": user.get("name"),
        "created_at": _now(),
    }
    await db.risks.insert_one(doc)
    doc.pop("_id", None)
    await _audit("risk", doc["risk_id"], "logged", user, project_id, {"title": data.title})
    return doc


@router.patch("/risks/{risk_id}")
async def update_risk(risk_id: str, data: RiskUpdate, request: Request):
    user = await _get_user(request)
    risk = await db.risks.find_one({"risk_id": risk_id}, {"_id": 0})
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    await _project_for_read(request, risk["project_id"])
    update = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.risks.update_one({"risk_id": risk_id}, {"$set": update})
        await _audit("risk", risk_id, "updated", user, risk["project_id"], {"changed": list(update)})
    return await db.risks.find_one({"risk_id": risk_id}, {"_id": 0})


# ===========================================================================
# DOCUMENTS AND TRANSCRIPTS
# ===========================================================================
# Everything the project knows that is not structured: the original brief, call
# transcripts, uploaded files. The architect reads these, and so does anyone
# else on the project, which is the whole point of not having a briefing pack.
class TranscriptIn(BaseModel):
    source_label: str
    source_date: Optional[str] = None
    content: str


@router.get("/projects/{project_id}/documents")
async def list_documents(project_id: str, request: Request, doc_type: Optional[str] = None):
    await _project_for_read(request, project_id)
    query: Dict[str, Any] = {"project_id": project_id}
    if doc_type:
        query["doc_type"] = doc_type
    return await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(300)


@router.post("/projects/{project_id}/transcripts")
async def add_transcript(project_id: str, data: TranscriptIn, request: Request):
    """Paste in a conversation that has already happened.

    The source label and date matter: "what did the client actually say" is
    unanswerable without knowing which call it was said on.
    """
    user, _ = await _project_for_read(request, project_id)
    if not (data.content or "").strip():
        raise HTTPException(status_code=400, detail="A transcript needs some content")
    doc = {
        "document_id": _new_id(),
        "project_id": project_id,
        "title": data.source_label or "Transcript",
        "doc_type": "transcript",
        "content": data.content,
        "source_label": data.source_label or "",
        "source_date": data.source_date,
        "file_url": None,
        "version": 1,
        "author_id": user.get("user_id"),
        "author_name": user.get("name"),
        "created_at": _now(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    await _audit("document", doc["document_id"], "transcript_added", user, project_id,
                 {"source": data.source_label})
    return doc


@router.post("/projects/{project_id}/transcripts/upload")
async def upload_transcript(
    project_id: str,
    request: Request,
    file: UploadFile = File(...),
    source_label: str = Form(""),
    source_date: str = Form(""),
):
    """A conversation that already happened, handed over as a file instead of
    pasted in by hand -- a call recording's transcript, a shared Google Doc
    exported to .docx, notes emailed as a PDF.

    Text is extracted so the transcript reads the same way a pasted one
    does -- the whole point of not having a separate architect briefing is
    that everyone reads the same thing, and a raw file nobody can read
    without downloading it first defeats that. The original file is kept
    too, since extraction is not always perfect.
    """
    user, _ = await _project_for_read(request, project_id)
    url, original_name, size = _save_upload(file, project_id, "transcript", TRANSCRIPT_EXTENSIONS)

    from services.cv_parser import extract_text
    ext = Path(original_name).suffix.lower()
    if ext in (".txt", ".md"):
        content = (UPLOADS_DIR / project_id / Path(url).name).read_bytes().decode("utf-8", errors="replace")
    else:
        content = extract_text((UPLOADS_DIR / project_id / Path(url).name).read_bytes(), original_name)

    doc = {
        "document_id": _new_id(),
        "project_id": project_id,
        "title": source_label or original_name,
        "doc_type": "transcript",
        "content": content,
        "source_label": source_label or original_name,
        "source_date": source_date or None,
        "file_url": url,
        "original_filename": original_name,
        "size_bytes": size,
        "version": 1,
        "author_id": user.get("user_id"),
        "author_name": user.get("name"),
        "created_at": _now(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    await _audit("document", doc["document_id"], "transcript_uploaded", user, project_id,
                 {"source": source_label or original_name})
    return doc


@router.post("/projects/{project_id}/documents")
async def upload_document(
    project_id: str,
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    doc_type: str = Form("other"),
):
    user, _ = await _project_for_read(request, project_id)
    url, original_name, size = _save_upload(file, project_id, "doc", DOCUMENT_EXTENSIONS)
    doc = {
        "document_id": _new_id(),
        "project_id": project_id,
        "title": (title or "").strip() or original_name,
        "doc_type": doc_type or "other",
        "content": "",
        "source_label": "",
        "source_date": None,
        "file_url": url,
        "original_filename": original_name,
        "size_bytes": size,
        "version": 1,
        "author_id": user.get("user_id"),
        "author_name": user.get("name"),
        "created_at": _now(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    await _audit("document", doc["document_id"], "uploaded", user, project_id,
                 {"doc_type": doc_type})
    return doc


@router.delete("/projects/{project_id}/documents/{document_id}")
async def delete_document(project_id: str, document_id: str, request: Request):
    user, project = await _project_for_read(request, project_id)
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project),
        "Only this project's TSD removes documents",
    )
    result = await db.documents.delete_one(
        {"document_id": document_id, "project_id": project_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Document not found")
    await _audit("document", document_id, "deleted", user, project_id, {})
    return {"deleted": True}


# ===========================================================================
# THE WORKSPACE READ
# ===========================================================================
@router.get("/projects/{project_id}/workspace")
async def workspace(project_id: str, request: Request):
    """Everything the project page needs, in one request.

    The page is four tabs and six drawers over one project, so it is one round
    trip rather than nine. It also means the architect, who is handed no
    briefing package, gets the whole project in a single call from the moment
    they are named.
    """
    user, project = await _project_for_read(request, project_id)

    requirements = await db.requirements.find(
        {"project_id": project_id}, {"_id": 0}).sort("req_ref", 1).to_list(500)
    journeys = await db.user_journeys.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    briefs = await db.product_briefs.find(
        {"project_id": project_id}, {"_id": 0}).sort("version", -1).to_list(50)
    architecture = await db.architecture_documents.find(
        {"project_id": project_id}, {"_id": 0}).sort("version", -1).to_list(100)
    demos = await db.demos.find(
        {"project_id": project_id}, {"_id": 0}).sort("round", 1).to_list(50)
    feedback = await db.feedback_items.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    documents = await db.documents.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(300)
    milestones = await db.milestones.find(
        {"project_id": project_id}, {"_id": 0}).sort("due_date", 1).to_list(100)
    scope_changes = await db.scope_changes.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    decisions = await db.decisions.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    risks = await db.risks.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    talent_requirements = await db.talent_requirements.find(
        {"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    talent_assignments = await db.talent_assignments.find(
        {"project_id": project_id}, {"_id": 0}).sort("sourced_at", 1).to_list(500)
    activity = await db.audit_log.find(
        {"project_id": project_id}, {"_id": 0}).sort("timestamp", -1).to_list(60)

    # Legal and Finance write contracts, not software. They get the definition
    # of the work and the conversations behind it, and none of the technical
    # detail: the architecture, the board and QA are not theirs to read.
    if permissions.sees_commercial_slice_only(user):
        return {
            "project": {k: project.get(k) for k in (
                "id", "project_id_display", "name", "client_name_snapshot", "website",
                "stage", "stage_key", "phase", "status", "health",
                "desired_outcome", "original_brief", "description",
                "total_value", "currency", "commercial_status",
                "created_at", "start_date", "end_date", "validated_at",
                "scope_frozen", "tsd_name",
            )},
            "requirements": requirements,
            "journeys": journeys,
            "product_briefs": briefs,
            "documents": documents,
            "milestones": milestones,
            # Scope changes carry price and timeline impact, which is
            # exactly the commercial slice's business -- unlike decisions
            # and risks, which are delivery-execution detail.
            "scope_changes": scope_changes,
            "commercial_slice": True,
        }

    return {
        "project": project,
        "requirements": requirements,
        "journeys": journeys,
        "product_briefs": briefs,
        "architecture": architecture,
        "demos": demos,
        "feedback": feedback,
        "documents": documents,
        "milestones": milestones,
        "scope_changes": scope_changes,
        "decisions": decisions,
        "risks": risks,
        "talent_requirements": talent_requirements,
        "talent_assignments": talent_assignments,
        "activity": activity,
        "commercial_slice": False,
        "can": {
            "move_stage": permissions.can_move_stage(user, project),
            "set_health": permissions.can_set_health(user, project),
            "select_architect": permissions.can_select_architect(user),
            "upload_architecture": permissions.can_upload_architecture(user, project),
            "manage_board": permissions.can_manage_boards(user, project),
            "edit_requirements": not project.get("scope_frozen"),
        },
    }
