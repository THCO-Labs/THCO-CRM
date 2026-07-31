"""
Feedback & IT Support router.

Lifecycle of a feedback item:
  sent        -> user submitted it (default)
  in_review   -> an IT team member opened it
  in_progress -> IT is actively working on it
  done        -> IT marked it fixed and sent a reply back to the reporter

Access rules:
  - Any authenticated user can POST feedback and GET only their own.
  - IT team (users with `is_it` True OR `it-tools` in accessible_units)
    plus super_admin can GET all feedback and PATCH status / reply.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/feedback", tags=["feedback"])

db = None


def set_db(database):
    global db
    db = database


# --- helpers ---------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc).isoformat()


async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("status") == "disabled":
        raise HTTPException(status_code=403, detail="Account disabled")
    return user


def is_it_team(user: dict) -> bool:
    return (
        bool(user.get("is_it"))
        or user.get("role") == "super_admin"
        or "it-tools" in (user.get("accessible_units") or [])
    )


VALID_STATUS = {"sent", "in_review", "in_progress", "done"}


def _serialize(doc):
    doc.pop("_id", None)
    return doc


# --- request models --------------------------------------------------------

class FeedbackCreate(BaseModel):
    subject: str
    message: str
    category: str = "general"          # general | bug | feature | complaint
    unit: Optional[str] = None         # related business unit slug, if any


class FeedbackUpdate(BaseModel):
    status: Optional[str] = None
    it_reply: Optional[str] = None


# --- endpoints --------------------------------------------------------------

@router.post("")
async def create_feedback(data: FeedbackCreate, request: Request):
    user = await get_current_user(request)
    if not data.subject.strip() or not data.message.strip():
        raise HTTPException(status_code=400, detail="Subject and message are required")

    feedback = {
        "feedback_id": f"fb_{uuid.uuid4().hex[:12]}",
        "user_id": user.get("user_id"),
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "subject": data.subject.strip(),
        "message": data.message.strip(),
        "category": data.category,
        "unit": data.unit,
        "status": "sent",
        "it_reply": None,
        "it_reply_at": None,
        "assigned_to": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.feedback.insert_one(feedback)
    return _serialize(feedback)


@router.get("/mine", response_model=None)
async def my_feedback(request: Request):
    user = await get_current_user(request)
    cursor = db.feedback.find({"user_id": user.get("user_id")}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=200)
    return items


@router.get("/all", response_model=None)
async def all_feedback(request: Request):
    user = await get_current_user(request)
    if not is_it_team(user):
        raise HTTPException(status_code=403, detail="IT team access required")
    cursor = db.feedback.find({}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=1000)
    return items


@router.get("/{feedback_id}", response_model=None)
async def get_one(feedback_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.feedback.find_one({"feedback_id": feedback_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    # Only owner or IT team may view
    if doc.get("user_id") != user.get("user_id") and not is_it_team(user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return doc


@router.patch("/{feedback_id}", response_model=None)
async def update_feedback(feedback_id: str, data: FeedbackUpdate, request: Request):
    user = await get_current_user(request)
    if not is_it_team(user):
        raise HTTPException(status_code=403, detail="IT team access required")

    doc = await db.feedback.find_one({"feedback_id": feedback_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    update = {"updated_at": _now()}

    if data.status is not None:
        if data.status not in VALID_STATUS:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {sorted(VALID_STATUS)}")
        update["status"] = data.status
        # Auto-stamp assignment when an IT member starts review/progress
        if data.status in ("in_review", "in_progress"):
            update["assigned_to"] = user.get("name")

    if data.it_reply is not None:
        update["it_reply"] = data.it_reply
        update["it_reply_at"] = _now()
        # Replying effectively closes the loop; mark done if not already set
        if data.status is None:
            update["status"] = "done"
        update["assigned_to"] = user.get("name")

    await db.feedback.update_one({"feedback_id": feedback_id}, {"$set": update})
    updated = await db.feedback.find_one({"feedback_id": feedback_id}, {"_id": 0})
    return updated


@router.get("/meta/statuses", response_model=None)
async def status_meta():
    return {
        "statuses": [
            {"key": "sent", "label": "Sent"},
            {"key": "in_review", "label": "In Review"},
            {"key": "in_progress", "label": "In Progress"},
            {"key": "done", "label": "Done & Fixed"},
        ]
    }
