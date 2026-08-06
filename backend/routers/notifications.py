"""Notification endpoints.

Everything here is scoped to the caller: a person reads and clears their own
notifications and nobody else's. There is deliberately no endpoint to create
one from the client -- notifications are raised by the server when something
actually happens, so they cannot be forged.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

from services import notifications as notify

router = APIRouter(prefix="/notifications", tags=["notifications"])

db = None


def set_db(database):
    global db
    db = database


async def _current(request: Request) -> dict:
    from server import get_current_user
    return await get_current_user(request)


class MarkRead(BaseModel):
    # Omitted marks every unread notification for this user as read.
    notification_id: Optional[str] = None


@router.get("")
async def list_notifications(request: Request, limit: int = 30, unread_only: bool = False):
    user = await _current(request)
    items = await notify.list_for(db, user["user_id"], limit=limit, unread_only=unread_only)
    return {
        "notifications": items,
        "unread": await notify.unread_count(db, user["user_id"]),
    }


@router.get("/unread-count")
async def get_unread_count(request: Request):
    """Cheap enough for the bell to poll without dragging the list along."""
    user = await _current(request)
    return {"unread": await notify.unread_count(db, user["user_id"])}


@router.post("/read")
async def mark_notifications_read(data: MarkRead, request: Request):
    user = await _current(request)
    changed = await notify.mark_read(db, user["user_id"], data.notification_id)
    return {"marked": changed, "unread": await notify.unread_count(db, user["user_id"])}
