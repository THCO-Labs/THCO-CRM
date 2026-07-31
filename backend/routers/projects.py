"""Project Delivery Workflow API router."""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path
import uuid
import shutil
import os

router = APIRouter(prefix="/projects", tags=["projects"])

db = None
UPLOADS_DIR = Path(__file__).parent.parent / "uploads" / "projects"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


def set_db(database):
    global db
    db = database


async def _get_user(request: Request) -> dict:
    from server import get_current_user
    return await get_current_user(request)


def _validate_file(file: UploadFile):
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{ext}'. Only PDF and DOCX allowed.")


async def _save_file(file: UploadFile, project_id: str, prefix: str) -> tuple:
    """Save uploaded file, return (url_path, original_name)."""
    project_dir = UPLOADS_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix.lower()
    saved_name = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = project_dir / saved_name
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 100MB limit.")
    with open(file_path, "wb") as f:
        f.write(content)
    return f"/api/projects/files/{project_id}/{saved_name}", file.filename


# === ENDPOINTS ===

@router.post("")
async def create_project(
    request: Request,
    name: str = Form(...),
    client_id: str = Form(...),
    client_name: str = Form(""),
    website: str = Form(""),
    description: str = Form(""),
    brief: UploadFile = File(...),
    roadmap: UploadFile = File(...),
    client_documents: list[UploadFile] = File(None),
):
    """Fulfillment creates a new project with Brief + Roadmap uploads."""
    user = await _get_user(request)
    if not (user.get("is_fulfillment") or user.get("role") == "super_admin"):
        raise HTTPException(status_code=403, detail="Only fulfillment team can create projects")

    _validate_file(brief)
    _validate_file(roadmap)

    project_id = str(uuid.uuid4())
    brief_url, brief_name = await _save_file(brief, project_id, "brief")
    roadmap_url, roadmap_name = await _save_file(roadmap, project_id, "roadmap")

    # Save client documents (multiple, optional)
    client_docs_list = []
    if client_documents:
        for doc in client_documents:
            if doc.filename:
                doc_url, doc_name = await _save_file(doc, project_id, "client_doc")
                client_docs_list.append({"url": doc_url, "name": doc_name})

    # Resolve client name: use provided name, or lookup from existing client
    resolved_client_name = client_name.strip() if client_name.strip() else None
    if not resolved_client_name and client_id and client_id != "custom":
        client = await db.clients.find_one({"client_id": client_id}, {"_id": 0, "name": 1})
        resolved_client_name = client["name"] if client else client_id
    if not resolved_client_name:
        resolved_client_name = "Unknown Client"

    now = datetime.now(timezone.utc).isoformat()
    project = {
        "id": project_id,
        "name": name,
        "client_id": client_id if client_id != "custom" else None,
        "client_name_snapshot": resolved_client_name,
        "website": website.strip() if website else "",
        "description": description[:500] if description else "",
        "brief_document_url": brief_url,
        "brief_document_name": brief_name,
        "roadmap_document_url": roadmap_url,
        "roadmap_document_name": roadmap_name,
        "client_documents": client_docs_list,
        "status": "awaiting_delegation",
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": now,
        "assigned_engineer_id": None,
        "assigned_engineer_name": None,
        "delegated_by": None,
        "delegated_by_name": None,
        "delegated_at": None,
        "delegation_note": None,
        "approved_at": None,
        "completed_at": None,
        "current_review_id": None,
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)

    # Email HR
    from services import send_email
    from services.email_templates import project_uploaded_to_hr
    hr_users = await db.users.find({"is_hr": True}, {"_id": 0, "email": 1}).to_list(100)
    hr_emails = [u["email"] for u in hr_users]
    if hr_emails:
        ctx = {"project_name": name, "client_name": resolved_client_name, "creator_name": user["name"], "description": description}
        subject, html = project_uploaded_to_hr(ctx)
        await send_email(to=hr_emails, subject=subject, html=html, template_name="project_uploaded_to_hr", context=ctx)

    return project


@router.get("")
async def list_projects(request: Request):
    """List projects filtered by user role."""
    user = await _get_user(request)
    query = {}

    if user.get("role") == "super_admin":
        pass  # see all
    elif user.get("is_fulfillment"):
        pass  # fulfillment sees all
    elif user.get("is_hr"):
        pass  # HR sees all
    elif user.get("is_engineer"):
        query["assigned_engineer_id"] = user["user_id"]
    else:
        query["$or"] = [
            {"created_by": user["user_id"]},
            {"assigned_engineer_id": user["user_id"]},
        ]

    cursor = db.projects.find(query, {"_id": 0}).sort("created_at", -1)
    projects = await cursor.to_list(length=500)

    # Attach last tracker update for each
    for p in projects:
        last_update = await db.project_tracker_updates.find_one(
            {"project_id": p["id"]}, {"_id": 0}, sort=[("submitted_at", -1)]
        )
        p["last_tracker_update"] = last_update
        if last_update:
            submitted = last_update.get("submitted_at", "")
            if submitted:
                try:
                    ts = datetime.fromisoformat(submitted)
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    p["days_since_update"] = (datetime.now(timezone.utc) - ts).days
                except Exception:
                    p["days_since_update"] = None
            p["percent_complete"] = last_update.get("percent_complete", 0)
        else:
            p["days_since_update"] = None
            p["percent_complete"] = 0

    return projects


@router.get("/dashboard")
async def project_dashboard(request: Request):
    """Master dashboard view for fulfillment/admin."""
    user = await _get_user(request)
    if not (user.get("is_fulfillment") or user.get("role") == "super_admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_counts = {}
    async for doc in db.projects.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]

    return {"status_counts": status_counts, "total": sum(status_counts.values())}


@router.get("/pipeline")
async def get_project_pipeline(request: Request):
    """Get project counts by status for dashboard card."""
    await _get_user(request)
    pipeline_agg = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    result = {}
    async for doc in db.projects.aggregate(pipeline_agg):
        result[doc["_id"]] = doc["count"]
    return result


@router.get("/engineers/workload")
async def get_engineer_workload(request: Request):
    """Get all engineers with their workload status."""
    user = await _get_user(request)
    if not (user.get("is_hr") or user.get("role") == "super_admin"):
        raise HTTPException(status_code=403, detail="HR or admin access required")

    cursor = db.users.find({"is_engineer": True}, {"_id": 0, "password_hash": 0})
    engineers = await cursor.to_list(length=100)

    active_statuses = ["delegated", "under_review", "revision_requested", "approved_for_build", "in_build"]
    for eng in engineers:
        count = await db.projects.count_documents({
            "assigned_engineer_id": eng["user_id"],
            "status": {"$in": active_statuses},
        })
        cap = eng.get("engineer_capacity_override")
        if cap:
            eng["workload_status"] = "available" if count <= cap // 3 else ("at_capacity" if count <= 2 * cap // 3 else "busy")
        else:
            eng["workload_status"] = "available" if count <= 1 else ("at_capacity" if count == 2 else "busy")
        eng["active_project_count"] = count

        proj_cursor = db.projects.find(
            {"assigned_engineer_id": eng["user_id"], "status": {"$in": active_statuses}},
            {"_id": 0, "id": 1, "name": 1, "status": 1, "client_name_snapshot": 1}
        )
        eng["active_projects"] = await proj_cursor.to_list(length=20)

    return engineers


@router.get("/files/{project_id}/{filename}")
async def download_file(project_id: str, filename: str, request: Request):
    """Download project document (auth required)."""
    await _get_user(request)
    file_path = UPLOADS_DIR / project_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename)


@router.get("/{project_id}")
async def get_project(project_id: str, request: Request):
    """Get project details with review info."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Access check
    is_admin = user.get("role") == "super_admin"
    is_creator = project.get("created_by") == user["user_id"]
    is_assigned = project.get("assigned_engineer_id") == user["user_id"]
    is_hr = user.get("is_hr", False)
    is_fulfillment = user.get("is_fulfillment", False)
    if not (is_admin or is_creator or is_assigned or is_hr or is_fulfillment):
        raise HTTPException(status_code=403, detail="Access denied")

    # Attach active review
    if project.get("current_review_id"):
        review = await db.engineer_reviews.find_one({"id": project["current_review_id"]}, {"_id": 0})
        project["active_review"] = review

    return project


class DelegateRequest(BaseModel):
    engineer_id: str
    note: Optional[str] = None


@router.post("/{project_id}/delegate")
async def delegate_project(project_id: str, data: DelegateRequest, request: Request):
    """HR delegates project to an engineer."""
    user = await _get_user(request)
    if not (user.get("is_hr") or user.get("role") == "super_admin"):
        raise HTTPException(status_code=403, detail="Only HR can delegate")

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["status"] not in ("awaiting_delegation", "revision_requested"):
        raise HTTPException(status_code=400, detail=f"Cannot delegate in status '{project['status']}'")

    engineer = await db.users.find_one({"user_id": data.engineer_id}, {"_id": 0})
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")

    now = datetime.now(timezone.utc).isoformat()
    review_id = str(uuid.uuid4())

    # Create review record
    review = {
        "id": review_id,
        "project_id": project_id,
        "engineer_id": data.engineer_id,
        "engineer_email": engineer["email"],
        "delegation_email_sent_at": now,
        "first_opened_at": None,
        "decision_at": None,
        "prd_approved": False,
        "roadmap_approved": False,
        "notes": None,
        "window_1_breached": False,
        "window_2_breached": False,
        "reminders_sent": [],
        "is_active": True,
    }
    await db.engineer_reviews.insert_one(review)

    # Update project
    await db.projects.update_one({"id": project_id}, {"$set": {
        "status": "delegated",
        "assigned_engineer_id": data.engineer_id,
        "assigned_engineer_name": engineer["name"],
        "delegated_by": user["user_id"],
        "delegated_by_name": user["name"],
        "delegated_at": now,
        "delegation_note": data.note,
        "current_review_id": review_id,
    }})

    # Email engineer
    from services import send_email
    from services.email_templates import engineer_delegated
    ctx = {
        "project_id": project_id,
        "project_name": project["name"],
        "client_name": project["client_name_snapshot"],
        "engineer_name": engineer["name"],
        "delegated_by": user["name"],
        "note": data.note or "",
    }
    subject, html = engineer_delegated(ctx)
    await send_email(to=[engineer["email"]], subject=subject, html=html,
                     template_name="engineer_delegated", context=ctx)

    review.pop("_id", None)
    return {"message": "Project delegated", "review": review}


@router.post("/{project_id}/review/open")
async def open_review(project_id: str, request: Request):
    """Engineer marks they've opened the documents. Starts Window 2."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("assigned_engineer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")

    review = await db.engineer_reviews.find_one(
        {"project_id": project_id, "is_active": True}, {"_id": 0}
    )
    if not review:
        raise HTTPException(status_code=404, detail="No active review")
    if review.get("first_opened_at"):
        return {"message": "Already opened", "first_opened_at": review["first_opened_at"]}

    now = datetime.now(timezone.utc).isoformat()
    await db.engineer_reviews.update_one({"id": review["id"]}, {"$set": {"first_opened_at": now}})
    await db.projects.update_one({"id": project_id}, {"$set": {"status": "under_review"}})

    # Send window2 started email
    from services import send_email
    from services.email_templates import window2_started
    ctx = {"project_id": project_id, "project_name": project["name"], "engineer_name": user["name"]}
    subject, html = window2_started(ctx)
    await send_email(to=[user["email"]], subject=subject, html=html,
                     template_name="window2_started", context=ctx)

    return {"message": "Review opened", "first_opened_at": now}


class ReviewDecision(BaseModel):
    prd_approved: bool
    roadmap_approved: bool
    notes: Optional[str] = None


@router.post("/{project_id}/review/decision")
async def submit_decision(project_id: str, data: ReviewDecision, request: Request):
    """Engineer submits review decision."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("assigned_engineer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")

    review = await db.engineer_reviews.find_one(
        {"project_id": project_id, "is_active": True}, {"_id": 0}
    )
    if not review:
        raise HTTPException(status_code=404, detail="No active review")
    if review.get("decision_at"):
        raise HTTPException(status_code=400, detail="Decision already submitted")

    now = datetime.now(timezone.utc).isoformat()
    both_approved = data.prd_approved and data.roadmap_approved

    await db.engineer_reviews.update_one({"id": review["id"]}, {"$set": {
        "prd_approved": data.prd_approved,
        "roadmap_approved": data.roadmap_approved,
        "notes": data.notes,
        "decision_at": now,
    }})

    from services import send_email
    creator = await db.users.find_one({"user_id": project["created_by"]}, {"_id": 0, "email": 1})
    creator_email = creator["email"] if creator else None

    if both_approved:
        await db.projects.update_one({"id": project_id}, {"$set": {"status": "approved_for_build", "approved_at": now}})
        if creator_email:
            from services.email_templates import engineer_approved
            ctx = {"project_name": project["name"], "engineer_name": user["name"]}
            subject, html = engineer_approved(ctx)
            await send_email(to=[creator_email], subject=subject, html=html,
                             template_name="engineer_approved", context=ctx)
        return {"message": "Approved", "status": "approved_for_build"}
    else:
        await db.projects.update_one({"id": project_id}, {"$set": {"status": "revision_requested"}})
        if creator_email:
            from services.email_templates import engineer_rejected
            ctx = {"project_name": project["name"], "engineer_name": user["name"], "notes": data.notes or ""}
            subject, html = engineer_rejected(ctx)
            await send_email(to=[creator_email], subject=subject, html=html,
                             template_name="engineer_rejected", context=ctx)
        return {"message": "Revision requested", "status": "revision_requested"}


@router.post("/{project_id}/reupload")
async def reupload_documents(
    request: Request,
    project_id: str,
    brief: UploadFile = File(None),
    roadmap: UploadFile = File(None),
):
    """Fulfillment re-uploads documents after revision request."""
    user = await _get_user(request)
    if not (user.get("is_fulfillment") or user.get("role") == "super_admin"):
        raise HTTPException(status_code=403, detail="Only fulfillment can re-upload")

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["status"] != "revision_requested":
        raise HTTPException(status_code=400, detail="Project not in revision_requested status")

    updates = {}
    if brief:
        _validate_file(brief)
        url, name = await _save_file(brief, project_id, "brief")
        updates["brief_document_url"] = url
        updates["brief_document_name"] = name
    if roadmap:
        _validate_file(roadmap)
        url, name = await _save_file(roadmap, project_id, "roadmap")
        updates["roadmap_document_url"] = url
        updates["roadmap_document_name"] = name

    if not updates:
        raise HTTPException(status_code=400, detail="No files provided")

    # Deactivate old review
    await db.engineer_reviews.update_many(
        {"project_id": project_id, "is_active": True},
        {"$set": {"is_active": False}}
    )

    # Create new review
    now = datetime.now(timezone.utc).isoformat()
    review_id = str(uuid.uuid4())
    engineer = await db.users.find_one({"user_id": project["assigned_engineer_id"]}, {"_id": 0})

    new_review = {
        "id": review_id,
        "project_id": project_id,
        "engineer_id": project["assigned_engineer_id"],
        "engineer_email": engineer["email"] if engineer else "",
        "delegation_email_sent_at": now,
        "first_opened_at": None,
        "decision_at": None,
        "prd_approved": False,
        "roadmap_approved": False,
        "notes": None,
        "window_1_breached": False,
        "window_2_breached": False,
        "reminders_sent": [],
        "is_active": True,
    }
    await db.engineer_reviews.insert_one(new_review)

    updates["status"] = "delegated"
    updates["current_review_id"] = review_id
    await db.projects.update_one({"id": project_id}, {"$set": updates})

    # Email engineer about re-upload
    if engineer:
        from services import send_email
        from services.email_templates import engineer_delegated
        ctx = {
            "project_id": project_id,
            "project_name": project["name"],
            "client_name": project["client_name_snapshot"],
            "engineer_name": engineer["name"],
            "delegated_by": user["name"],
            "note": "Documents have been re-uploaded after revision. Please review again.",
        }
        subject, html = engineer_delegated(ctx)
        await send_email(to=[engineer["email"]], subject=subject, html=html,
                         template_name="engineer_delegated", context=ctx)

    return {"message": "Documents re-uploaded, new review created"}


@router.post("/{project_id}/start-build")
async def start_build(project_id: str, request: Request):
    """Engineer starts the build phase."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("assigned_engineer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    if project["status"] != "approved_for_build":
        raise HTTPException(status_code=400, detail="Project not approved yet")
    await db.projects.update_one({"id": project_id}, {"$set": {"status": "in_build"}})
    return {"message": "Build started", "status": "in_build"}


@router.post("/{project_id}/complete")
async def complete_project(project_id: str, request: Request):
    """Engineer marks project as completed."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("assigned_engineer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    if project["status"] != "in_build":
        raise HTTPException(status_code=400, detail="Project not in build")
    now = datetime.now(timezone.utc).isoformat()
    await db.projects.update_one({"id": project_id}, {"$set": {"status": "completed", "completed_at": now}})
    return {"message": "Project completed", "status": "completed"}


class TrackerUpdate(BaseModel):
    yesterday: str
    today: str
    blockers: Optional[str] = None
    percent_complete: int = 0
    status: str = "on_track"
    eta: str = ""


@router.post("/{project_id}/tracker")
async def submit_tracker(project_id: str, data: TrackerUpdate, request: Request):
    """Engineer submits daily standup (upsert per day)."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("assigned_engineer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.project_tracker_updates.find_one(
        {"project_id": project_id, "engineer_id": user["user_id"], "update_date": today_str},
        {"_id": 0}
    )

    if existing:
        await db.project_tracker_updates.update_one(
            {"id": existing["id"]},
            {"$set": {
                "yesterday": data.yesterday,
                "today": data.today,
                "blockers": data.blockers,
                "percent_complete": max(0, min(100, data.percent_complete)),
                "status": data.status,
                "eta": data.eta,
                "submitted_at": now,
            }}
        )
        return {"message": "Standup updated", "update_date": today_str}
    else:
        update_doc = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "engineer_id": user["user_id"],
            "update_date": today_str,
            "yesterday": data.yesterday,
            "today": data.today,
            "blockers": data.blockers,
            "percent_complete": max(0, min(100, data.percent_complete)),
            "status": data.status,
            "eta": data.eta,
            "submitted_at": now,
        }
        await db.project_tracker_updates.insert_one(update_doc)
        update_doc.pop("_id", None)
        return {"message": "Standup submitted", "update_date": today_str}


@router.get("/{project_id}/tracker")
async def get_tracker(project_id: str, request: Request):
    """Get tracker history for a project."""
    await _get_user(request)
    cursor = db.project_tracker_updates.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("update_date", -1)
    return await cursor.to_list(length=365)
