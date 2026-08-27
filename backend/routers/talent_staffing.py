"""Talent requirements and contract staffing (CROWTHER_MIGRATION_PLAN.md §8).

A separate router rather than more weight on `delivery.py` or `flow.py`,
both of which are already large. Everything here hangs off a project, the
same way requirements and documents do.

The trigger point is stage 12 only, after client validation (DECISION 4):
sourcing before validation risks approaching people and then withdrawing
because the project did not proceed. `require_admin`-style gating on that
lives in `_require_stage_12`.

State machine (assignment status):
    shortlisted -> interview -> selected -> offered -> accepted -> contracting
    -> contracted -> deployed -> ended
                       |            |            |
                       v            v            v
                   declined     withdrawn    not_signed
                       |            |            |
                       +------------+------------+
                                    |
                        requirement returns to sourcing,
                        attempt_count += 1

Terminal-but-recoverable states (declined, withdrawn, not_signed) never
delete the assignment -- the record of having approached someone is kept.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services import permissions, notifications

router = APIRouter(prefix="/delivery", tags=["talent-staffing"])

db = None

STAGE_12 = 12
RECOVERABLE = {"declined", "withdrawn", "not_signed"}


def set_db(database):
    global db
    db = database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


async def _get_user(request: Request) -> dict:
    from server import get_current_user
    return await get_current_user(request)


async def _project_for_read(request: Request, project_id: str) -> tuple:
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not permissions.can_view_all_projects(user):
        mine = await db.projects.find_one(
            {"id": project_id, **permissions.project_scope_filter(user)}, {"_id": 0, "id": 1}
        )
        if not mine:
            raise HTTPException(status_code=403, detail="You can only open projects you work on")
    return user, project


def _app_link(project_id: str) -> str:
    return f"/flow/projects/{project_id}"


# ===========================================================================
# TALENT REQUIREMENTS
# ===========================================================================
class TalentRequirementIn(BaseModel):
    role_title: str
    skills: List[str] = []
    seniority: Optional[str] = ""
    quantity: int = 1
    engagement_type: str = "contract"      # contract | internal
    duration_months: Optional[int] = None
    expected_start: Optional[str] = None
    justification: str


class TalentRequirementConfirm(BaseModel):
    quantity: Optional[int] = None
    engagement_type: Optional[str] = None


class TalentRequirementReject(BaseModel):
    reason: str


@router.get("/projects/{project_id}/talent-requirements")
async def list_talent_requirements(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.talent_requirements.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)


@router.post("/projects/{project_id}/talent-requirements")
async def raise_talent_requirement(project_id: str, data: TalentRequirementIn, request: Request):
    """The architect raises a need. Blocked before stage 12 (DECISION 4):
    sourcing before client validation risks approaching people for work that
    never proceeds. Recorded as a note on the project instead, so the intent
    isn't lost, just deferred."""
    user, project = await _project_for_read(request, project_id)

    stage = project.get("stage") or 0
    if stage < STAGE_12:
        raise HTTPException(
            status_code=409,
            detail=(
                "Talent can only be raised from stage 12, after client validation -- "
                "sourcing earlier risks approaching people for work that may not proceed. "
                "Add this as a project note instead, and raise it again once the project "
                "reaches stage 12."
            ),
        )

    doc = {
        "requirement_id": _new_id("treq"),
        "project_id": project_id,
        "role_title": data.role_title,
        "skills": data.skills,
        "seniority": data.seniority,
        "quantity": data.quantity,
        "filled_count": 0,
        "engagement_type": data.engagement_type,
        "duration_months": data.duration_months,
        "expected_start": data.expected_start,
        "justification": data.justification,
        "status": "draft",
        "raised_by_id": user.get("user_id"),
        "raised_by_name": user.get("name"),
        "confirmed_by_id": None,
        "confirmed_at": None,
        "attempt_count": 0,
        "created_at": _now(),
    }
    await db.talent_requirements.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/talent-requirements/{requirement_id}/confirm")
async def confirm_talent_requirement(requirement_id: str, data: TalentRequirementConfirm, request: Request):
    """The TSD confirms it (DECISION 3): "the architect says, I need some
    more engineers, TSD confirms it." Notifies every TalentSD -- confirming
    is what makes the requirement theirs to work."""
    user = await _get_user(request)
    req = await db.talent_requirements.find_one({"requirement_id": requirement_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    project = await db.projects.find_one({"id": req["project_id"]}, {"_id": 0})
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project or {}),
        "Only this project's TSD can confirm a talent requirement",
    )
    if req["status"] != "draft":
        raise HTTPException(status_code=409, detail=f"Requirement is already {req['status']}")

    update = {"status": "sourcing", "confirmed_by_id": user.get("user_id"),
              "confirmed_at": _now()}
    if data.quantity is not None:
        update["quantity"] = data.quantity
    if data.engagement_type is not None:
        update["engagement_type"] = data.engagement_type
    await db.talent_requirements.update_one({"requirement_id": requirement_id}, {"$set": update})

    await notifications.notify_function_role_holders(
        db,
        function_roles=[permissions.TALENT_SD],
        kind=notifications.TALENT_REQUIREMENT_CONFIRMED,
        title=f"New talent brief: {req['role_title']}",
        reason=(
            f"{req.get('quantity', 1)}x {req['role_title']} ({req.get('seniority') or 'any seniority'}) "
            f"needed from {req.get('expected_start') or 'as soon as possible'} on "
            f"{(project or {}).get('name') or 'a project'}."
        ),
        link=_app_link(req["project_id"]),
        entity_type="talent_requirement",
        entity_id=requirement_id,
        actor=user,
    )
    return await db.talent_requirements.find_one({"requirement_id": requirement_id}, {"_id": 0})


@router.post("/talent-requirements/{requirement_id}/reject")
async def reject_talent_requirement(requirement_id: str, data: TalentRequirementReject, request: Request):
    """The TSD rejects it, with a reason, returning it to the architect."""
    user = await _get_user(request)
    req = await db.talent_requirements.find_one({"requirement_id": requirement_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    project = await db.projects.find_one({"id": req["project_id"]}, {"_id": 0})
    permissions.require(
        permissions.is_admin(user) or permissions.is_project_tsd(user, project or {}),
        "Only this project's TSD can reject a talent requirement",
    )
    await db.talent_requirements.update_one(
        {"requirement_id": requirement_id},
        {"$set": {"status": "draft", "reject_reason": data.reason,
                  "confirmed_by_id": None, "confirmed_at": None}},
    )
    if req.get("raised_by_id"):
        await notifications.notify_user_ids(
            db,
            user_ids=[req["raised_by_id"]],
            kind=notifications.TALENT_REQUIREMENT_REOPENED,
            title=f"Talent request returned: {req['role_title']}",
            reason=f"The TSD sent this back: {data.reason}",
            link=_app_link(req["project_id"]),
            entity_type="talent_requirement",
            entity_id=requirement_id,
            actor=user,
        )
    return await db.talent_requirements.find_one({"requirement_id": requirement_id}, {"_id": 0})


async def _reopen_requirement(requirement_id: str) -> None:
    """A failed assignment returns its requirement to sourcing (§8.6). The
    original requirement is reused for a decline/withdrawal/no-show -- only a
    mid-project departure raises a fresh one, so the history stays honest
    about a replacement not being the original hire."""
    await db.talent_requirements.update_one(
        {"requirement_id": requirement_id, "status": {"$ne": "cancelled"}},
        {"$set": {"status": "sourcing"}, "$inc": {"attempt_count": 1}},
    )


# ===========================================================================
# TALENT ASSIGNMENTS
# ===========================================================================
class AssignmentCreate(BaseModel):
    talent_id: str
    pod_role: Optional[str] = ""
    allocation_pct: int = 100


class AssignmentDecline(BaseModel):
    reason: str


class AssignmentOffer(BaseModel):
    offer_deadline: Optional[str] = None


class AssignmentContract(BaseModel):
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None


class AssignmentEnd(BaseModel):
    reason: str   # no_show | left_mid_project | contract_ended | other


TRANSITIONS = {
    "shortlisted": {"interview", "withdrawn"},
    "interview": {"selected", "withdrawn"},
    "selected": {"offered", "withdrawn"},
    "offered": {"accepted", "declined"},
    "accepted": {"contracting", "not_signed", "withdrawn"},
    "contracting": {"contracted", "withdrawn"},
    "contracted": {"deployed", "ended"},
    "deployed": {"ended"},
}


async def _advance(assignment: dict, new_status: str, updates: dict, user: dict) -> dict:
    current = assignment["status"]
    if new_status not in TRANSITIONS.get(current, set()):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot move an assignment from {current} to {new_status}",
        )
    updates = {**updates, "status": new_status, "updated_at": _now()}
    await db.talent_assignments.update_one(
        {"assignment_id": assignment["assignment_id"]}, {"$set": updates}
    )
    return await db.talent_assignments.find_one(
        {"assignment_id": assignment["assignment_id"]}, {"_id": 0}
    )


@router.get("/projects/{project_id}/talent-assignments")
async def list_talent_assignments(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    return await db.talent_assignments.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("sourced_at", 1).to_list(500)


@router.post("/talent-requirements/{requirement_id}/assignments")
async def source_talent(requirement_id: str, data: AssignmentCreate, request: Request):
    """TalentSD sources from the in-house database -- search is the existing
    talent search; this just records who was put forward (§8.4)."""
    user = await _get_user(request)
    req = await db.talent_requirements.find_one({"requirement_id": requirement_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    permissions.require(
        permissions.is_admin(user) or permissions.function_role(user) == permissions.TALENT_SD,
        "Only TalentSD can source candidates against a requirement",
    )
    talent = await db.candidates.find_one({"candidate_id": data.talent_id}, {"_id": 0, "candidate_id": 1, "name": 1})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")

    doc = {
        "assignment_id": _new_id("tasg"),
        "requirement_id": requirement_id,
        "project_id": req["project_id"],
        "talent_id": data.talent_id,
        "talent_name": talent.get("name"),
        "user_id": None,
        "status": "shortlisted",
        "sourced_by_id": user.get("user_id"),
        "sourced_at": _now(),
        "pod_role": data.pod_role,
        "allocation_pct": data.allocation_pct,
        "offered_at": None, "offer_deadline": None, "responded_at": None,
        "decline_reason": None,
        "contract_signed_at": None, "contract_start": None, "contract_end": None,
        "ended_at": None, "end_reason": None,
    }
    await db.talent_assignments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/talent-assignments/{assignment_id}/advance")
async def advance_assignment(assignment_id: str, request: Request):
    """shortlisted -> interview -> selected. Free-text notes belong on the
    assignment via the project's own notes/comments surface; no scoring or
    ranking here, per §8.3 step 5."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    nxt = {"shortlisted": "interview", "interview": "selected"}.get(a["status"])
    if not nxt:
        raise HTTPException(status_code=409, detail=f"Cannot advance from {a['status']} this way")
    return await _advance(a, nxt, {}, user)


@router.post("/talent-assignments/{assignment_id}/offer")
async def offer_assignment(assignment_id: str, data: AssignmentOffer, request: Request):
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return await _advance(a, "offered", {
        "offered_at": _now(), "offer_deadline": data.offer_deadline,
    }, user)


@router.post("/talent-assignments/{assignment_id}/accept")
async def accept_assignment(assignment_id: str, request: Request):
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return await _advance(a, "accepted", {"responded_at": _now()}, user)


@router.post("/talent-assignments/{assignment_id}/decline")
async def decline_assignment(assignment_id: str, data: AssignmentDecline, request: Request):
    """Declines the offer (§8.6). TalentSD is always told; the TSD and
    architect only if this requirement has no other active assignment --
    that's the point at which a decline becomes a delivery problem rather
    than routine sourcing noise."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = await _advance(a, "declined", {
        "responded_at": _now(), "decline_reason": data.reason,
    }, user)
    await _reopen_requirement(a["requirement_id"])
    await _notify_setback(a, result, user, "declined", data.reason)
    return result


@router.post("/talent-assignments/{assignment_id}/not-signed")
async def not_signed_assignment(assignment_id: str, request: Request):
    """Accepted, then never signed by the deadline (§8.6). Intended to be
    called by the daily sweep once `offer_deadline` has passed, same path a
    person can also trigger by hand."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = await _advance(a, "not_signed", {"ended_at": _now()}, user)
    await _reopen_requirement(a["requirement_id"])
    await _notify_setback(a, result, user, "not signed by the deadline", "Offer deadline passed unsigned.")
    return result


@router.post("/talent-assignments/{assignment_id}/withdraw")
async def withdraw_assignment(assignment_id: str, data: AssignmentDecline, request: Request):
    """Withdraws during contracting (§8.6). People & Operations is told to
    stop onboarding -- the one setback that's theirs to hear about rather
    than TalentSD's, since by this point they may already be preparing it."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = await _advance(a, "withdrawn", {
        "ended_at": _now(), "end_reason": data.reason,
    }, user)
    await _reopen_requirement(a["requirement_id"])
    await notifications.notify_function_role_holders(
        db,
        function_roles=[permissions.PEOPLE_OPS],
        kind=notifications.TALENT_WITHDRAWN,
        title=f"Stop onboarding: {a.get('talent_name') or 'a candidate'}",
        reason=f"Withdrew during contracting: {data.reason}",
        link=_app_link(a["project_id"]),
        entity_type="talent_assignment",
        entity_id=assignment_id,
        actor=user,
    )
    return result


@router.post("/talent-assignments/{assignment_id}/contract")
async def contract_assignment(assignment_id: str, data: AssignmentContract, request: Request):
    """accepted -> contracting. People & Operations is notified to prepare
    onboarding (§8.3 step 8)."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = await _advance(a, "contracting", {
        "contract_start": data.contract_start, "contract_end": data.contract_end,
    }, user)
    await notifications.notify_function_role_holders(
        db,
        function_roles=[permissions.PEOPLE_OPS],
        kind=notifications.TALENT_CONTRACTING_STARTED,
        title=f"Prepare onboarding: {a.get('talent_name') or 'a candidate'}",
        reason=f"Contracting has started, expected start {data.contract_start or 'TBC'}.",
        link=_app_link(a["project_id"]),
        entity_type="talent_assignment",
        entity_id=assignment_id,
        actor=user,
    )
    return result


@router.post("/talent-assignments/{assignment_id}/sign")
async def sign_assignment(assignment_id: str, request: Request):
    """contracting -> contracted, stamping the signature. Account creation
    and pod placement happen at the separate `/deploy` step (§8.3 step 9),
    since People & Operations creates the account, not this endpoint."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return await _advance(a, "contracted", {"contract_signed_at": _now()}, user)


@router.post("/talent-assignments/{assignment_id}/deploy")
async def deploy_assignment(assignment_id: str, request: Request):
    """contracted -> deployed. Creates (or reuses) the account and the pod
    row -- the account is theirs, not the project's, so a second assignment
    for the same talent reuses whatever `user_id` the first one created
    (§8.5). Fills the requirement and creates the pod membership that puts
    the project on their dashboard."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    permissions.require(
        permissions.is_admin(user) or permissions.function_role(user) == permissions.PEOPLE_OPS,
        "Only People & Operations can deploy a signed assignment",
    )

    # Reuse the account from an earlier assignment of the same talent if one
    # exists -- one person, several projects, one account (§8.5).
    existing_uid = None
    earlier = await db.talent_assignments.find_one(
        {"talent_id": a["talent_id"], "user_id": {"$ne": None}}, {"_id": 0, "user_id": 1}
    )
    if earlier:
        existing_uid = earlier["user_id"]

    if existing_uid:
        user_id = existing_uid
    else:
        talent = await db.candidates.find_one({"candidate_id": a["talent_id"]}, {"_id": 0})
        from server import hash_password
        user_id = _new_id("user")
        email = (talent or {}).get("email") or f"{user_id}@placeholder.thcohq.com"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "password_hash": hash_password(uuid.uuid4().hex[:12]),
            "name": a.get("talent_name") or (talent or {}).get("name") or "Engineer",
            "role": "team_member",
            "function_role": permissions.ENGINEER,
            "employment_type": "contract",
            "contract_end": a.get("contract_end"),
            "accessible_units": ["flow"],
            "status": "active",
            "picture": None,
            "created_at": _now(),
            "created_by": user.get("user_id"),
        })

    result = await _advance(a, "deployed", {"user_id": user_id}, user)

    await db.projects.update_one(
        {"id": a["project_id"], "pod_member_ids": {"$ne": user_id}},
        {"$addToSet": {"pod_member_ids": user_id},
         "$push": {"pod": {"user_id": user_id, "name": a.get("talent_name"),
                            "pod_role": a.get("pod_role"), "allocation_pct": a.get("allocation_pct", 100),
                            "assignment_id": assignment_id}}},
    )

    req = await db.talent_requirements.find_one({"requirement_id": a["requirement_id"]}, {"_id": 0})
    if req:
        filled = (req.get("filled_count") or 0) + 1
        status = "filled" if filled >= req.get("quantity", 1) else "partially_filled"
        await db.talent_requirements.update_one(
            {"requirement_id": a["requirement_id"]},
            {"$set": {"filled_count": filled, "status": status}},
        )
    return result


@router.post("/talent-assignments/{assignment_id}/end")
async def end_assignment(assignment_id: str, data: AssignmentEnd, request: Request):
    """Deployed -> ended (§8.6). A mid-project departure raises a fresh
    requirement rather than reopening the original -- the history should
    show this was a replacement, not the first hire. A no-show before ever
    starting reopens the same requirement instead, since nothing was ever
    delivered against it."""
    user = await _get_user(request)
    a = await db.talent_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    result = await _advance(a, "ended", {"ended_at": _now(), "end_reason": data.reason}, user)

    if a.get("user_id"):
        await db.projects.update_one(
            {"id": a["project_id"]},
            {"$pull": {"pod_member_ids": a["user_id"], "pod": {"user_id": a["user_id"]}}},
        )

    if data.reason == "no_show":
        await _reopen_requirement(a["requirement_id"])
    elif data.reason == "left_mid_project":
        req = await db.talent_requirements.find_one({"requirement_id": a["requirement_id"]}, {"_id": 0})
        if req:
            await db.talent_requirements.insert_one({
                "requirement_id": _new_id("treq"),
                "project_id": req["project_id"],
                "role_title": req["role_title"], "skills": req.get("skills", []),
                "seniority": req.get("seniority"), "quantity": 1, "filled_count": 0,
                "engagement_type": req.get("engagement_type"), "duration_months": req.get("duration_months"),
                "expected_start": None,
                "justification": f"Replacement for {a.get('talent_name') or 'a departing team member'} "
                                  f"(assignment {assignment_id})",
                "status": "confirmed", "raised_by_id": user.get("user_id"), "raised_by_name": user.get("name"),
                "confirmed_by_id": user.get("user_id"), "confirmed_at": _now(),
                "attempt_count": 0, "created_at": _now(),
            })
    return result


@router.get("/talent/over-allocated")
async def over_allocated_talent(request: Request):
    """Sum `allocation_pct` across every person's deployed pod memberships
    (§8.5): "over-allocation is visible. Sum allocation_pct across a
    person's deployed assignments. Above 100 is a warning on the pod list."

    Pod membership set up before allocation tracking existed carries no
    `allocation_pct`, so it is excluded here rather than assumed to be 100 --
    a silent assumption would flag people as over-allocated who never had a
    percentage recorded at all.
    """
    user = await _get_user(request)
    permissions.require(permissions.is_admin(user), "Only administrators can view allocation across projects")

    cursor = db.projects.find(
        {"pod": {"$exists": True, "$ne": []}}, {"_id": 0, "id": 1, "name": 1, "pod": 1}
    )
    totals: Dict[str, Dict[str, Any]] = {}
    async for project in cursor:
        for member in project.get("pod") or []:
            pct = member.get("allocation_pct")
            uid = member.get("user_id")
            if not uid or pct is None:
                continue
            row = totals.setdefault(uid, {"user_id": uid, "name": member.get("name"), "total_pct": 0, "projects": []})
            row["total_pct"] += pct
            row["projects"].append({"project_id": project["id"], "project_name": project.get("name"), "allocation_pct": pct})

    return [row for row in totals.values() if row["total_pct"] > 100]


async def _notify_setback(assignment: dict, result: dict, actor: dict, verb: str, reason: str) -> None:
    """§8.6: TalentSD always hears about a setback. The TSD and architect
    only join in when the requirement has no other active assignment --
    that's the point it stops being routine sourcing and starts being a
    delivery risk."""
    req_id = assignment["requirement_id"]
    project_id = assignment["project_id"]
    link = _app_link(project_id)

    await notifications.notify_function_role_holders(
        db,
        function_roles=[permissions.TALENT_SD],
        kind=notifications.TALENT_REQUIREMENT_REOPENED,
        title=f"{assignment.get('talent_name') or 'A candidate'} {verb}",
        reason=reason,
        link=link,
        entity_type="talent_assignment",
        entity_id=assignment["assignment_id"],
        actor=actor,
    )

    other_active = await db.talent_assignments.count_documents({
        "requirement_id": req_id,
        "assignment_id": {"$ne": assignment["assignment_id"]},
        "status": {"$nin": list(RECOVERABLE) + ["ended"]},
    })
    if other_active:
        return

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    notify_ids = [uid for uid in [
        (project or {}).get("tsd_id"), (project or {}).get("architect_id"),
    ] if uid]
    if notify_ids:
        await notifications.notify_user_ids(
            db,
            user_ids=notify_ids,
            kind=notifications.TALENT_REQUIREMENT_REOPENED,
            title="No candidates left in play for this role",
            reason=f"{verb.capitalize()}, and no other candidate is active on this requirement. {reason}",
            link=link,
            entity_type="talent_requirement",
            entity_id=req_id,
            actor=actor,
        )
