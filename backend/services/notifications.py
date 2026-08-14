"""In-app notifications, with an email alongside.

Staff no longer open their own projects: a unit head opens the project and
places people on it. That inverts who knows what -- somebody can now be given
work without having asked for it, and would otherwise only discover it by
noticing a new row on their dashboard. So every placement tells the person
directly.

Two channels, because they fail in different ways. The email reaches somebody
who is not logged in today; the in-app record survives a deleted or unread
mailbox and is still there next week. Email is best-effort: a Resend outage
must never prevent a person from being added to a project, so a failed send is
logged and swallowed while the in-app notification stands on its own.
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Notification kinds. Kept as constants so the UI can branch on them without
# matching against prose that might later be reworded.
ADDED_TO_PROJECT = "added_to_project"
ASSIGNED_TO_TASK = "assigned_to_task"
REMOVED_FROM_PROJECT = "removed_from_project"
MADE_UNIT_HEAD = "made_unit_head"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _app_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


async def create(
    db,
    *,
    user_id: str,
    kind: str,
    title: str,
    body: str = "",
    link: str = "",
    actor_id: str = "",
    actor_name: str = "",
    entity_type: str = "",
    entity_id: str = "",
) -> Dict[str, Any]:
    """Record one in-app notification for one person."""
    doc = {
        "notification_id": f"ntf_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "body": body,
        "link": link,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "read": False,
        "created_at": _now(),
    }
    await db.notifications.insert_one(doc)
    doc.pop("_id", None)
    return doc


def _project_email_html(person_name: str, project: Dict[str, Any], actor_name: str, link: str) -> str:
    name = project.get("name") or "a project"
    client = project.get("client_name_snapshot") or ""
    client_line = (
        f'<p style="margin:4px 0;color:#9AA0AB">Client<br>'
        f'<strong style="color:#fff">{client}</strong></p>'
        if client else ""
    )
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0C0F13;border-radius:12px;color:#E8E6F0">
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">THCO Control Room</div>
      <p style="color:#9AA0AB;margin:0 0 18px">Hello, <strong style="color:#fff">{person_name}</strong></p>
      <p style="color:#E8E6F0">
        <strong style="color:#fff">{actor_name}</strong> has added you to a project.
        You are now a collaborator and it will appear on your dashboard.
      </p>
      <div style="background:#161B22;border:1px solid #2a2f38;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#9AA0AB">Project<br><strong style="color:#fff">{name}</strong></p>
        {client_line}
      </div>
      <a href="{link}" style="display:inline-block;background:#1FB58A;color:#0C0F13;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none">Open the project</a>
      <p style="color:#6B7280;font-size:12px;margin-top:18px">Or copy this link into your browser: {link}</p>
    </div>
    """


def _project_removal_email_html(person_name: str, project: Dict[str, Any], actor_name: str) -> str:
    name = project.get("name") or "a project"
    client = project.get("client_name_snapshot") or ""
    client_line = (
        f'<p style="margin:4px 0;color:#9AA0AB">Client<br>'
        f'<strong style="color:#fff">{client}</strong></p>'
        if client else ""
    )
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0C0F13;border-radius:12px;color:#E8E6F0">
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">THCO Control Room</div>
      <p style="color:#9AA0AB;margin:0 0 18px">Hello, <strong style="color:#fff">{person_name}</strong></p>
      <p style="color:#E8E6F0">
        <strong style="color:#fff">{actor_name}</strong> has removed you from a project.
        Your access to it has been revoked and it will no longer appear on your dashboard.
      </p>
      <div style="background:#161B22;border:1px solid #2a2f38;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#9AA0AB">Project<br><strong style="color:#fff">{name}</strong></p>
        {client_line}
      </div>
      <p style="color:#6B7280;font-size:12px;margin-top:18px">No action is needed from you.</p>
    </div>
    """


async def notify_added_to_project(
    db,
    project: Dict[str, Any],
    collaborators: List[Dict[str, Any]],
    actor: Dict[str, Any],
) -> Dict[str, int]:
    """Tell each newly placed person, in-app and by email.

    Never notifies the person doing the adding -- a head who puts themselves
    on their own project does not need telling.
    """
    actor_id = (actor or {}).get("user_id")
    actor_name = (actor or {}).get("name") or "A unit head"
    project_name = project.get("name") or "a project"
    link = f"{_app_url()}/flow/projects/{project.get('id')}"

    in_app = 0
    emailed = 0

    for person in collaborators:
        uid = person.get("user_id")
        if not uid or uid == actor_id:
            continue

        await create(
            db,
            user_id=uid,
            kind=ADDED_TO_PROJECT,
            title=f"You were added to {project_name}",
            body=f"{actor_name} added you as a collaborator.",
            link=f"/flow/projects/{project.get('id')}",
            actor_id=actor_id or "",
            actor_name=actor_name,
            entity_type="project",
            entity_id=project.get("id") or "",
        )
        in_app += 1

        email = person.get("email")
        if not email:
            continue
        try:
            from services import send_email
            await send_email(
                to=[email],
                subject=f"You've been added to {project_name}",
                html=_project_email_html(person.get("name") or "there", project, actor_name, link),
                template_name="added_to_project",
                context={"project_id": project.get("id"), "project_name": project_name},
            )
            emailed += 1
        except Exception as e:
            # The placement itself already succeeded; losing the email must
            # not undo it, and the in-app notification still tells them.
            logger.warning("Could not email %s about project %s: %s", email, project.get("id"), e)

    return {"in_app": in_app, "emailed": emailed}


async def notify_removed_from_project(
    db,
    project: Dict[str, Any],
    removed: List[Dict[str, Any]],
    actor: Dict[str, Any],
) -> Dict[str, int]:
    """Tell each person taken off a project, in-app and by email.

    The mirror of notify_added_to_project: removal is a change the person did
    not initiate, so they are told directly. The link points at the dashboard
    rather than the project because they have just lost access to it. Never
    notifies the person doing the removing.
    """
    actor_id = (actor or {}).get("user_id")
    actor_name = (actor or {}).get("name") or "A project manager"
    project_name = project.get("name") or "a project"

    in_app = 0
    emailed = 0

    for person in removed:
        uid = person.get("user_id")
        if not uid or uid == actor_id:
            continue

        await create(
            db,
            user_id=uid,
            kind=REMOVED_FROM_PROJECT,
            title=f"You were removed from {project_name}",
            body=f"{actor_name} removed you from this project.",
            link="/",
            actor_id=actor_id or "",
            actor_name=actor_name,
            entity_type="project",
            entity_id=project.get("id") or "",
        )
        in_app += 1

        email = person.get("email")
        if not email:
            continue
        try:
            from services import send_email
            await send_email(
                to=[email],
                subject=f"You've been removed from {project_name}",
                html=_project_removal_email_html(person.get("name") or "there", project, actor_name),
                template_name="removed_from_project",
                context={"project_id": project.get("id"), "project_name": project_name},
            )
            emailed += 1
        except Exception as e:
            # The removal itself already succeeded; losing the email must not
            # undo it, and the in-app notification still tells them.
            logger.warning("Could not email %s about project removal %s: %s", email, project.get("id"), e)

    return {"in_app": in_app, "emailed": emailed}


def _task_email_html(person_name: str, card_title: str, project_name: str,
                     board_title: str, actor_name: str, link: str) -> str:
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0C0F13;border-radius:12px;color:#E8E6F0">
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">THCO Control Room</div>
      <p style="color:#9AA0AB;margin:0 0 18px">Hello, <strong style="color:#fff">{person_name}</strong></p>
      <p style="color:#E8E6F0">
        <strong style="color:#fff">{actor_name}</strong> has assigned you a task.
      </p>
      <div style="background:#161B22;border:1px solid #2a2f38;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#9AA0AB">Task<br><strong style="color:#fff">{card_title}</strong></p>
        <p style="margin:12px 0 4px;color:#9AA0AB">Project<br><strong style="color:#fff">{project_name}</strong></p>
        <p style="margin:12px 0 4px;color:#9AA0AB">List<br><strong style="color:#fff">{board_title}</strong></p>
      </div>
      <a href="{link}" style="display:inline-block;background:#1FB58A;color:#0C0F13;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none">Open the board</a>
      <p style="color:#6B7280;font-size:12px;margin-top:18px">Or copy this link into your browser: {link}</p>
    </div>
    """


async def notify_assigned_to_task(db, card: Dict[str, Any], assignees: List[Dict[str, Any]],
                                  project: Dict[str, Any], board_title: str,
                                  actor: Dict[str, Any]) -> Dict[str, int]:
    """Tell each person newly put on a task, in-app and by email.

    Being added to a project was already announced; being handed one of its
    tasks was not, so work could be assigned to somebody who never found out
    unless they happened to open the board.
    """
    actor_id = (actor or {}).get("user_id")
    actor_name = (actor or {}).get("name") or "A project manager"
    title = card.get("title") or "a task"
    project_name = (project or {}).get("name") or "a project"
    link = f"{_app_url()}/tasks"

    in_app = emailed = 0
    for person in assignees:
        uid = person.get("user_id")
        if not uid or uid == actor_id:
            continue

        await create(
            db,
            user_id=uid,
            kind=ASSIGNED_TO_TASK,
            title=f"{actor_name} assigned you: {title}",
            body=f"On {project_name} · {board_title}",
            link="/tasks",
            actor_id=actor_id or "",
            actor_name=actor_name,
            entity_type="task",
            entity_id=card.get("card_id") or "",
        )
        in_app += 1

        email = person.get("email")
        if not email:
            continue
        try:
            from services import send_email
            await send_email(
                to=[email],
                subject=f"You've been assigned: {title}",
                html=_task_email_html(person.get("name") or "there", title,
                                      project_name, board_title, actor_name, link),
                template_name="assigned_to_task",
                context={"card_id": card.get("card_id"), "project": project_name},
            )
            emailed += 1
        except Exception as e:
            logger.warning("Could not email %s about task %s: %s", email, card.get("card_id"), e)

    return {"in_app": in_app, "emailed": emailed}


async def notify_made_unit_head(db, person: Dict[str, Any], unit_slug: str,
                                unit_name: str, actor: Dict[str, Any]) -> None:
    """Tell somebody they now head a unit, since it changes what they can do."""
    uid = person.get("user_id")
    if not uid or uid == (actor or {}).get("user_id"):
        return
    await create(
        db,
        user_id=uid,
        kind=MADE_UNIT_HEAD,
        title=f"You now head {unit_name or unit_slug}",
        body="You can open projects for this unit and add staff to them.",
        link=f"/{unit_slug}",
        actor_id=(actor or {}).get("user_id") or "",
        actor_name=(actor or {}).get("name") or "An administrator",
        entity_type="unit",
        entity_id=unit_slug,
    )


async def unread_count(db, user_id: str) -> int:
    return await db.notifications.count_documents({"user_id": user_id, "read": False})


async def list_for(db, user_id: str, limit: int = 30, unread_only: bool = False) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    return await (
        db.notifications.find(query, {"_id": 0})
        .sort("created_at", -1)
        .to_list(length=limit)
    )


async def mark_read(db, user_id: str, notification_id: Optional[str] = None) -> int:
    """Mark one notification read, or all of this user's when none is given.

    Scoped by user_id as well as id so a guessed id cannot clear somebody
    else's notifications.
    """
    query: Dict[str, Any] = {"user_id": user_id, "read": False}
    if notification_id:
        query["notification_id"] = notification_id
    res = await db.notifications.update_many(query, {"$set": {"read": True, "read_at": _now()}})
    return res.modified_count
