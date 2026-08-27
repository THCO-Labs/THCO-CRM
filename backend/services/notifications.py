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
# Being made the TSD or the Architect of a project. Distinct from
# ADDED_TO_PROJECT because it is not the same event: a pod member is given
# work, these two are given the project.
PROJECT_ROLE_ASSIGNED = "project_role_assigned"
ASSIGNED_TO_TASK = "assigned_to_task"
REMOVED_FROM_PROJECT = "removed_from_project"
MADE_UNIT_HEAD = "made_unit_head"
TALENT_REQUIREMENT_CONFIRMED = "talent_requirement_confirmed"
TALENT_REQUIREMENT_REOPENED = "talent_requirement_reopened"
TALENT_CONTRACTING_STARTED = "talent_contracting_started"
TALENT_WITHDRAWN = "talent_withdrawn"
SCOPE_CHANGE_DECIDED = "scope_change_decided"
SCOPE_CHANGE_IMPACT_ALERT = "scope_change_impact_alert"
CONTRACT_EXPIRING = "contract_expiring"
CONTRACT_ENDED = "contract_ended"
# The TSD telling the Senior Partner where they are with a project they were
# handed: received, acknowledged, or accepted.
TSD_ACKNOWLEDGEMENT = "tsd_acknowledgement"

# Kept as a literal rather than imported from `permissions` so this module has
# no dependency on it; the value is asserted against it in `permissions` tests.
SENIOR_PARTNER_ROLE = "senior_partner"


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
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">Crowther Delivery OS</div>
      <p style="color:#9AA0AB;margin:0 0 18px">Hello, <strong style="color:#fff">{person_name}</strong></p>
      <p style="color:#E8E6F0">
        <strong style="color:#fff">{actor_name}</strong> has added you to a project.
        You are now a pod member and it will appear on your dashboard.
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
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">Crowther Delivery OS</div>
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


def _role_email_html(person_name: str, role_label: str, project: Dict[str, Any],
                     actor_name: str, link: str, duty: str) -> str:
    name = project.get("name") or "a project"
    client = project.get("client_name_snapshot") or ""
    client_line = (
        f'<p style="margin:4px 0;color:#9AA0AB">Client<br>'
        f'<strong style="color:#fff">{client}</strong></p>'
        if client else ""
    )
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0C0F13;border-radius:12px;color:#E8E6F0">
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">Crowther Delivery OS</div>
      <p style="color:#9AA0AB;margin:0 0 18px">Hello, <strong style="color:#fff">{person_name}</strong></p>
      <p style="color:#E8E6F0">
        <strong style="color:#fff">{actor_name}</strong> has made you the
        <strong style="color:#1FB58A">{role_label}</strong> on a project.
      </p>
      <div style="background:#161B22;border:1px solid #2a2f38;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#9AA0AB">Project<br><strong style="color:#fff">{name}</strong></p>
        {client_line}
      </div>
      <p style="color:#9AA0AB;font-size:13px">{duty}</p>
      <a href="{link}" style="display:inline-block;background:#1FB58A;color:#0C0F13;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none">Open the project</a>
      <p style="color:#6B7280;font-size:12px;margin-top:18px">Or copy this link into your browser: {link}</p>
    </div>
    """


# What each role is actually being handed. A notification that says only
# "you are the TSD" tells somebody their title; these say what is now theirs
# to do, which is the part they need at the moment of being told.
ROLE_DUTY = {
    "tsd": "You now own this client and this project's state, and you move it "
           "through every stage of the pipeline.",
    "architect": "You now own this project's architecture, and you advance it "
                 "through the stages you own: architecture, demo, build and QA.",
}


async def notify_project_role(
    db,
    project: Dict[str, Any],
    person: Dict[str, Any],
    role: str,
    actor: Dict[str, Any],
) -> bool:
    """Tell somebody they have been made the TSD or the Architect of a project.

    Being handed a project is the single most consequential thing that happens
    to a person in this system, and until now it happened in silence: the
    project record changed and nobody told them. Pod members were notified;
    the two people actually accountable for the project were not.

    Returns whether a notification was written. Never notifies somebody who
    assigned themselves, and never raises — a delivery failure must not roll
    back the assignment that has already been made.
    """
    uid = (person or {}).get("user_id")
    if not uid:
        return False
    actor_id = (actor or {}).get("user_id")
    if uid == actor_id:
        return False

    role_label = "TSD" if role == "tsd" else "Solution Architect"
    actor_name = (actor or {}).get("name") or "An administrator"
    project_name = project.get("name") or "a project"
    duty = ROLE_DUTY.get(role, "")
    link = f"{_app_url()}/flow/projects/{project.get('id')}"

    try:
        await create(
            db,
            user_id=uid,
            kind=PROJECT_ROLE_ASSIGNED,
            title=f"You are the {role_label} on {project_name}",
            body=f"{actor_name} assigned you. {duty}",
            link=f"/flow/projects/{project.get('id')}",
            actor_id=actor_id or "",
            actor_name=actor_name,
            entity_type="project",
            entity_id=project.get("id") or "",
        )
    except Exception as exc:
        logger.warning("Could not record role notification for %s: %s", uid, exc)
        return False

    email = (person or {}).get("email")
    if email:
        try:
            from services import send_email

            await send_email(
                to=email,
                subject=f"You are the {role_label} on {project_name}",
                html=_role_email_html(
                    (person or {}).get("name") or "there",
                    role_label, project, actor_name, link, duty,
                ),
            )
        except Exception as exc:
            # In-app already succeeded; email is the softer channel and its
            # failure should never surface as the assignment failing.
            logger.warning("Could not email role notification to %s: %s", email, exc)
    return True


async def notify_added_to_project(
    db,
    project: Dict[str, Any],
    pod: List[Dict[str, Any]],
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

    for person in pod:
        uid = person.get("user_id")
        if not uid or uid == actor_id:
            continue

        await create(
            db,
            user_id=uid,
            kind=ADDED_TO_PROJECT,
            title=f"You were added to {project_name}",
            body=f"{actor_name} added you as a pod member.",
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
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">Crowther Delivery OS</div>
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


async def function_role_recipients(db, function_roles: List[str]) -> List[Dict[str, Any]]:
    """Active accounts to notify for these function roles.

    With one fallback that matters: **if nobody holds `senior_partner`, the
    super admins stand in.** Several of the most important alerts in this
    system are addressed to the Senior Partner — a forced gate, a project
    going red, a scope change that moved time or money, a TSD accepting a
    project. Until somebody is actually granted that function role, every one
    of those resolved to an empty list and was silently delivered to nobody,
    which is a worse failure than a misdirected message because nothing
    reports it.

    The substitution is sound rather than a guess: the Senior Partner holds
    the super admin account here. It applies only when the role is genuinely
    unheld, so granting it to a real person takes over immediately.
    """
    fields = {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    people = await db.users.find(
        {"function_role": {"$in": function_roles}, "status": "active"}, fields
    ).to_list(200)
    if people or SENIOR_PARTNER_ROLE not in function_roles:
        return people

    fallback = await db.users.find(
        {"role": "super_admin", "status": "active"}, fields
    ).to_list(50)
    if fallback:
        logger.info(
            "No senior_partner function role is held; routing to %d super admin(s) instead.",
            len(fallback),
        )
    return fallback


async def notify_function_role_holders(
    db,
    *,
    function_roles: List[str],
    kind: str,
    title: str,
    reason: str,
    link: str,
    entity_type: str,
    entity_id: str,
    actor: Optional[Dict[str, Any]] = None,
) -> int:
    """Tell every active person holding one of these function roles.

    The routing rule (SPEC §37): notify only the people this actually
    affects -- resolved by what someone does, `function_role`, never a
    broadcast to everyone with a login -- and every notification carries the
    reason, a link to the entity it's about, and reads as something to act
    on rather than an unexplained ping. `reason` is folded into `body`
    instead of a separate field so every caller is forced to supply one
    rather than leaving it blank.
    """
    actor_id = (actor or {}).get("user_id")
    actor_name = (actor or {}).get("name") or "Crowther OS"
    people = await function_role_recipients(db, function_roles)

    sent = 0
    for person in people:
        uid = person.get("user_id")
        if not uid or uid == actor_id:
            continue
        await create(
            db,
            user_id=uid,
            kind=kind,
            title=title,
            body=reason,
            link=link,
            actor_id=actor_id or "",
            actor_name=actor_name,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        sent += 1
    return sent


async def notify_user_ids(
    db,
    *,
    user_ids: List[str],
    kind: str,
    title: str,
    reason: str,
    link: str,
    entity_type: str,
    entity_id: str,
    actor: Optional[Dict[str, Any]] = None,
) -> int:
    """The same routing rule as `notify_function_role_holders`, for a specific
    named set of people (e.g. one project's architect) rather than a whole
    function role."""
    actor_id = (actor or {}).get("user_id")
    actor_name = (actor or {}).get("name") or "Crowther OS"
    sent = 0
    for uid in {u for u in user_ids if u and u != actor_id}:
        await create(
            db,
            user_id=uid,
            kind=kind,
            title=title,
            body=reason,
            link=link,
            actor_id=actor_id or "",
            actor_name=actor_name,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        sent += 1
    return sent


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
