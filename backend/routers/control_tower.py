"""Crowther OS control and visibility (Tier 3).

Tier 1 made a project travel. Tier 2 gave it delivery mechanics. This is the
layer that lets somebody see across the whole portfolio without opening
seventeen projects one at a time, and it is deliberately a *reader* of what
the earlier tiers already record rather than a new place to record things.

Four ideas run through it:

**Nothing here invents state.** Health, forced gates, scope changes, risks,
milestones and the closure checklist are all written elsewhere by the people
who own them. This router aggregates and ranks; it does not become a second
source of truth that can disagree with the project page.

**Exceptions, not dashboards.** CROWTHER_MIGRATION_PLAN.md 13 asks for a
Senior Partner view of "red health, forced gates, scope changes moving time or
money, stage 6 waiting on them". A screen that lists everything tells you
nothing, so `/exceptions` returns only what somebody has to act on, each row
carrying why it is there and where to go.

**Scope is the caller's, always.** Every read starts from
`permissions.project_scope_filter`, so an engineer's control tower is their
own projects and an administrator's is the portfolio. Legal and Finance get
the commercial slice, exactly as they do on the project page -- a different
object, never the whole record with fields hidden.

**Blockers are the one new record**, because a blocker that is not a board
card has nowhere to live today (12 in the plan: cross-project and
non-task blockers "stay a Tier 3 concern"). Everything else is a join.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services import permissions
from services.delivery_stages import (
    CLOSURE_CHECKLIST,
    LAST_STAGE,
    PHASES,
    STAGES,
    VALIDATION_STAGE,
    stage_label,
    stage_owner,
    stage_phase,
)

router = APIRouter(prefix="/control-tower", tags=["control-tower"])

db = None


def set_db(database):
    global db
    db = database


# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------
# A project that has not moved in this long is not necessarily late, but it is
# worth a question. Kept deliberately generous: several stages legitimately sit
# waiting on a client, and crying wolf at 3 days would make the view useless.
STALLED_AFTER_DAYS = 14

# Mirrors delivery.py. A scope change only reaches the Senior Partner when it
# actually moves time or money past these; anything smaller is the TSD's call
# and putting it here would drown the signal.
SCOPE_CHANGE_TIMELINE_THRESHOLD_DAYS = 2
SCOPE_CHANGE_COST_THRESHOLD_PCT = 5

# A forced gate is an alert -- "this just happened, look at it" -- not a
# permanent mark. Nothing ever resolves one, so without a window every forced
# gate ever recorded would sit in this view forever and the list would slowly
# become unreadable, which is the exact failure this view exists to avoid.
# Past the window it is still in the project's stage history and in its report,
# which is where a months-old governance fact belongs.
FORCED_GATE_ALERT_DAYS = 30

# Stage 6 is the single place the Senior Partner sits on the critical path, so
# a project waiting there is waiting on *them* specifically. Derived from the
# stage table rather than written as 6, so a renumbering cannot silently point
# this at the wrong stage.
ARCHITECT_STAGE = next(
    (num for num, cfg in STAGES.items() if cfg.get("key") == "request_architect"), 6
)

BLOCKER_KINDS = ("internal", "client", "third_party", "dependency")
BLOCKER_SEVERITIES = ("low", "medium", "high", "critical")

# How an exception is ordered when the view is read. Severity is a property of
# the *kind* of exception, not of the row, so it lives here once.
EXCEPTION_SEVERITY = {
    "health_red": 100,
    "blocker_critical": 95,
    "gate_forced": 90,
    "scope_change_material": 80,
    "architect_waiting": 70,
    "milestone_overdue": 60,
    "blocker_open": 50,
    "stalled": 40,
    "risk_open_high": 30,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


async def _get_user(request: Request) -> dict:
    from server import get_current_user

    return await get_current_user(request)


def _parse_iso(value: Any) -> Optional[datetime]:
    """Parse a stored timestamp, tolerating the several shapes in this data.

    Dates in this database were written by different generations of code: some
    carry a timezone, some do not, some end in `Z`, and `target_date` on a
    milestone is often a bare `YYYY-MM-DD` from a date input. A parser that
    threw on any of those would make the whole view fail on one bad row.
    """
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _days_since(value: Any) -> Optional[int]:
    parsed = _parse_iso(value)
    if not parsed:
        return None
    return max(0, (datetime.now(timezone.utc) - parsed).days)


def _days_until(value: Any) -> Optional[int]:
    parsed = _parse_iso(value)
    if not parsed:
        return None
    return (parsed - datetime.now(timezone.utc)).days


async def _scoped_projects(user: dict, extra: Optional[Dict[str, Any]] = None) -> List[dict]:
    """Every project this caller may see, archived ones excluded.

    The scope filter is the same one the pipeline and the board use, so the
    control tower can never show a project its owner could not open.
    """
    query: Dict[str, Any] = {
        **permissions.project_scope_filter(user),
        "archived_by_migration": {"$ne": True},
        **(extra or {}),
    }
    return await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


async def _project_for_read(request: Request, project_id: str) -> tuple:
    """Load one project the caller is entitled to, or refuse.

    Same shape as `delivery.py`'s helper, and same reasoning: re-query with the
    caller's own filter rather than fetching and then hiding, so knowing an id
    is not a way in.
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


async def _count_by_project(collection, match: Dict[str, Any]) -> Dict[str, int]:
    """`{project_id: count}` in one round trip.

    The portfolio needs six or seven different counts across every project on
    screen. Asking per project would be a query per project per metric, which
    is how a control tower becomes the slowest page in the product.
    """
    rows = await collection.aggregate([
        {"$match": match},
        {"$group": {"_id": "$project_id", "n": {"$sum": 1}}},
    ]).to_list(5000)
    return {row["_id"]: row["n"] for row in rows if row.get("_id")}


def _last_movement(project: dict) -> Optional[str]:
    history = project.get("stage_history") or []
    if history:
        return history[-1].get("at")
    return project.get("created_at")


def _forced_gates(project: dict) -> List[dict]:
    """Every forced gate in this project's history, newest first.

    A forced gate is the system recording that somebody knowingly moved past an
    unmet condition. It is never deleted and never silently absorbed, so the
    exception view reads it straight from the history rather than from a flag
    that could be cleared.
    """
    out = []
    for entry in project.get("stage_history") or []:
        if not entry.get("forced"):
            continue
        unmet = [
            c.get("label") for c in (entry.get("gate_conditions") or [])
            if c.get("satisfied") is False
        ]
        out.append({
            "at": entry.get("at"),
            "by_name": entry.get("by_name"),
            "from_stage": entry.get("from_stage"),
            "to_stage": entry.get("to_stage"),
            "to_stage_label": stage_label(entry.get("to_stage") or 1),
            "why": entry.get("why"),
            "unmet": unmet,
        })
    return sorted(out, key=lambda e: e.get("at") or "", reverse=True)


def _scope_change_is_material(sc: dict) -> bool:
    """Did this approved change actually move time or money?

    Only approved changes count -- a rejected or deferred one moved nothing.
    The numeric fields are optional by design (impact is free text in Tier 1),
    so a change with neither filled in is simply not material *as far as the
    system can tell*, and is left out rather than guessed at.
    """
    if sc.get("decision") != "approved":
        return False
    days = sc.get("impact_timeline_days")
    pct = sc.get("impact_cost_pct")
    if isinstance(days, (int, float)) and days > SCOPE_CHANGE_TIMELINE_THRESHOLD_DAYS:
        return True
    if isinstance(pct, (int, float)) and pct > SCOPE_CHANGE_COST_THRESHOLD_PCT:
        return True
    return False


def _closure_progress(project: dict) -> dict:
    checklist = project.get("closure_checklist") or []
    done = sum(1 for item in checklist if item.get("done"))
    return {
        "total": len(checklist),
        "done": done,
        "complete": bool(checklist) and done == len(checklist),
    }


def _project_card(project: dict, signals: Dict[str, Any]) -> dict:
    """One project as the control tower shows it.

    Named fields rather than the whole record: this is a list of a hundred
    projects, and shipping every field of each one down the wire to render a
    row is how the page gets slow for no benefit.
    """
    stage = project.get("stage") or 1
    return {
        "id": project.get("id"),
        "name": project.get("name"),
        "project_id_display": project.get("project_id_display"),
        "client_name": project.get("client_name_snapshot"),
        "stage": stage,
        "stage_label": stage_label(stage),
        "stage_owner": stage_owner(stage),
        "phase": stage_phase(stage),
        "status": project.get("status") or "active",
        "health": (project.get("health") or "GREEN").upper(),
        "health_reason": project.get("health_reason") or "",
        "tsd_id": project.get("tsd_id"),
        "tsd_name": project.get("tsd_name"),
        "architect_id": project.get("architect_id"),
        "architect_name": project.get("architect_name"),
        "scope_frozen": bool(project.get("scope_frozen")),
        "created_at": project.get("created_at"),
        "completed_at": project.get("completed_at"),
        "last_movement_at": _last_movement(project),
        **signals,
    }


# ===========================================================================
# PORTFOLIO
# ===========================================================================
@router.get("/portfolio")
async def portfolio(request: Request, include_closed: bool = False):
    """Every project the caller may see, with the signals that matter, at once.

    "Per-role exposure" (TRANSCRIPT @00:33:51) is handled by the scope filter
    plus the commercial slice, not by a role switch in the UI: an engineer gets
    their own projects, a Senior Partner gets the portfolio, and Legal and
    Finance get a commercial view with the delivery internals absent rather
    than merely hidden.
    """
    user = await _get_user(request)
    extra: Dict[str, Any] = {}
    if not include_closed:
        # A closed project is still readable, but it is not something to watch,
        # and leaving it in makes every count on the page slowly drift upward.
        extra["stage"] = {"$lt": LAST_STAGE}
    projects = await _scoped_projects(user, extra)
    ids = [p.get("id") for p in projects if p.get("id")]

    commercial_only = permissions.sees_commercial_slice_only(user)

    in_scope = {"project_id": {"$in": ids}}
    open_blockers = await _count_by_project(db.delivery_blockers, {**in_scope, "status": "open"})
    critical_blockers = await _count_by_project(
        db.delivery_blockers, {**in_scope, "status": "open", "severity": "critical"}
    )
    pending_scope = await _count_by_project(
        db.scope_changes, {**in_scope, "decision": "pending"}
    )
    open_risks = await _count_by_project(db.risks, {**in_scope, "status": "open"})
    requirements = await _count_by_project(db.requirements, in_scope)

    # Milestones are read in full rather than counted, because "overdue" is a
    # comparison against today that Mongo cannot do against a mixed bag of
    # date formats -- see `_parse_iso` for why the formats are mixed.
    milestone_rows = await db.milestones.find(
        in_scope, {"_id": 0, "project_id": 1, "target_date": 1, "delivered_date": 1}
    ).to_list(5000)
    overdue_milestones: Dict[str, int] = {}
    for row in milestone_rows:
        if row.get("delivered_date"):
            continue
        remaining = _days_until(row.get("target_date"))
        if remaining is not None and remaining < 0:
            pid = row.get("project_id")
            overdue_milestones[pid] = overdue_milestones.get(pid, 0) + 1

    cards = []
    for project in projects:
        pid = project.get("id")
        stage = project.get("stage") or 1
        idle_days = _days_since(_last_movement(project))
        forced = _forced_gates(project)

        signals: Dict[str, Any] = {
            "days_since_movement": idle_days,
            "stalled": bool(
                idle_days is not None
                and idle_days >= STALLED_AFTER_DAYS
                and (project.get("status") or "active") == "active"
                and stage < LAST_STAGE
            ),
            "open_blockers": open_blockers.get(pid, 0),
            "critical_blockers": critical_blockers.get(pid, 0),
            "pending_scope_changes": pending_scope.get(pid, 0),
            "overdue_milestones": overdue_milestones.get(pid, 0),
            "forced_gates": len(forced),
            "closure": _closure_progress(project),
        }
        if not commercial_only:
            signals["open_risks"] = open_risks.get(pid, 0)
            signals["requirements"] = requirements.get(pid, 0)
            signals["awaiting_architect"] = bool(
                stage == ARCHITECT_STAGE and not project.get("architect_id")
            )
        cards.append(_project_card(project, signals))

    # Counts the header reads. Computed here rather than in the browser so the
    # number and the list can never disagree about what "at risk" means.
    def _count(predicate) -> int:
        return sum(1 for c in cards if predicate(c))

    return {
        "projects": cards,
        "commercial_slice": commercial_only,
        "can_see_all": permissions.can_view_all_projects(user),
        "summary": {
            "total": len(cards),
            "red": _count(lambda c: c["health"] == "RED"),
            "amber": _count(lambda c: c["health"] == "AMBER"),
            "green": _count(lambda c: c["health"] == "GREEN"),
            "stalled": _count(lambda c: c["stalled"]),
            "blocked": _count(lambda c: c["open_blockers"] > 0),
            "forced_gates": sum(c["forced_gates"] for c in cards),
            "pending_scope_changes": sum(c["pending_scope_changes"] for c in cards),
            "overdue_milestones": sum(c["overdue_milestones"] for c in cards),
        },
        "by_phase": [
            {
                "key": key,
                "label": cfg.get("label", key),
                "order": cfg.get("order", 0),
                "count": _count(lambda c, k=key: c["phase"] == k),
            }
            for key, cfg in sorted(PHASES.items(), key=lambda kv: kv[1].get("order", 0))
        ],
    }


# ===========================================================================
# EXCEPTIONS
# ===========================================================================
@router.get("/exceptions")
async def exceptions(request: Request):
    """Only what somebody has to act on, newest and worst first.

    This is the Senior Partner view from CROWTHER_MIGRATION_PLAN.md 13, but
    it is not restricted to them: scoping already decides *which* projects a
    caller sees, so an engineer gets the same view of their own work. What
    makes it a Senior Partner screen is that the Senior Partner is the one
    whose scope is the whole portfolio.

    Every row carries `kind`, `severity`, a human `title` and `detail`, and a
    `link`, because an exception you cannot navigate to is a complaint.
    """
    user = await _get_user(request)
    projects = await _scoped_projects(user)
    by_id = {p.get("id"): p for p in projects}
    ids = list(by_id)

    rows: List[dict] = []

    def add(kind: str, project: dict, title: str, detail: str, at: Optional[str] = None,
            extra: Optional[Dict[str, Any]] = None):
        rows.append({
            "kind": kind,
            "severity": EXCEPTION_SEVERITY.get(kind, 10),
            "project_id": project.get("id"),
            "project_name": project.get("name"),
            "project_ref": project.get("project_id_display"),
            "client_name": project.get("client_name_snapshot"),
            "stage": project.get("stage"),
            "stage_label": stage_label(project.get("stage") or 1),
            "tsd_name": project.get("tsd_name"),
            "title": title,
            "detail": detail,
            "at": at,
            "link": f"/flow/projects/{project.get('id')}",
            **(extra or {}),
        })

    for project in projects:
        stage = project.get("stage") or 1
        closed = stage >= LAST_STAGE or (project.get("status") or "active") != "active"

        # Red health. The TSD set it and had to give a reason, so the reason is
        # the detail -- restating "this project is red" would add nothing.
        # Shown even on a closed project: red health that survived closure is
        # itself the thing worth looking at.
        if (project.get("health") or "").upper() == "RED":
            add("health_red", project,
                "Health is red",
                project.get("health_reason") or "No reason recorded.",
                project.get("health_set_at"))

        if closed:
            continue

        # Forced gates, recent ones only -- see FORCED_GATE_ALERT_DAYS. Every
        # one in the window, not just the latest: a project forced three times
        # is a different conversation from one forced once.
        for forced in _forced_gates(project):
            age = _days_since(forced.get("at"))
            if age is not None and age > FORCED_GATE_ALERT_DAYS:
                continue
            unmet = ", ".join(forced["unmet"]) or "conditions not recorded"
            add("gate_forced", project,
                f"Gate forced into {forced['to_stage_label']}",
                f"{forced.get('by_name') or 'Someone'} moved past: {unmet}. "
                f"Reason given: {forced.get('why') or 'none'}",
                forced.get("at"))

        # Stage 6 waiting on the Senior Partner. This is the one stage that
        # blocks on them personally, so it is called out by name.
        if stage == ARCHITECT_STAGE and not project.get("architect_id"):
            requested = project.get("architect_requested_at")
            waited = _days_since(requested) if requested else None
            add("architect_waiting", project,
                "Waiting on a Solution Architect",
                (f"Requested {waited} day(s) ago and nobody is named yet."
                 if waited is not None
                 else "This project is at stage 6 with no architect named."),
                requested)

        idle = _days_since(_last_movement(project))
        if idle is not None and idle >= STALLED_AFTER_DAYS:
            add("stalled", project,
                f"No movement in {idle} days",
                f"Still at {stage_label(stage)}, owned by "
                f"{stage_owner(stage) or 'nobody'}.",
                _last_movement(project))

    in_scope = {"project_id": {"$in": ids}}

    # Scope changes that actually moved time or money. Approved only -- a
    # rejected change is recorded and visible on the project, but it did not
    # change anything, so it is not an exception.
    for sc in await db.scope_changes.find(in_scope, {"_id": 0}).to_list(2000):
        project = by_id.get(sc.get("project_id"))
        if not project or not _scope_change_is_material(sc):
            continue
        impact = []
        if isinstance(sc.get("impact_timeline_days"), (int, float)):
            impact.append(f"{sc['impact_timeline_days']:g} day(s)")
        if isinstance(sc.get("impact_cost_pct"), (int, float)):
            impact.append(f"{sc['impact_cost_pct']:g}% cost")
        add("scope_change_material", project,
            "Approved scope change moved time or money",
            f"{sc.get('description') or 'No description'} "
            f"({', '.join(impact) or 'impact not quantified'})",
            sc.get("decided_at"),
            {"scope_change_id": sc.get("scope_change_id")})

    for blocker in await db.delivery_blockers.find(
        {**in_scope, "status": "open"}, {"_id": 0}
    ).to_list(2000):
        project = by_id.get(blocker.get("project_id"))
        if not project:
            continue
        critical = blocker.get("severity") == "critical"
        add("blocker_critical" if critical else "blocker_open", project,
            f"Blocked: {blocker.get('title')}",
            f"{blocker.get('kind', 'internal').replace('_', ' ')} blocker, "
            f"{blocker.get('severity', 'medium')} severity. "
            f"{blocker.get('description') or ''}".strip(),
            blocker.get("created_at"),
            {"blocker_id": blocker.get("blocker_id")})

    for milestone in await db.milestones.find(in_scope, {"_id": 0}).to_list(5000):
        project = by_id.get(milestone.get("project_id"))
        if not project or milestone.get("delivered_date"):
            continue
        remaining = _days_until(milestone.get("target_date"))
        if remaining is None or remaining >= 0:
            continue
        add("milestone_overdue", project,
            f"Milestone overdue: {milestone.get('milestone_name') or 'unnamed'}",
            f"Target was {milestone.get('target_date')}, {abs(remaining)} day(s) ago.",
            milestone.get("target_date"),
            {"milestone_id": milestone.get("milestone_id")})

    for risk in await db.risks.find(
        {**in_scope, "status": "open", "impact": "high"}, {"_id": 0}
    ).to_list(2000):
        project = by_id.get(risk.get("project_id"))
        if not project:
            continue
        add("risk_open_high", project,
            f"Open high-impact risk: {risk.get('title')}",
            risk.get("mitigation") or "No mitigation recorded.",
            risk.get("created_at"),
            {"risk_id": risk.get("risk_id")})

    # Worst first, then newest within a severity. `at` can be missing on older
    # rows, so it sorts as empty rather than throwing the whole list away.
    rows.sort(key=lambda r: (-r["severity"], r.get("at") or ""), reverse=False)
    rows.sort(key=lambda r: r["severity"], reverse=True)

    counts: Dict[str, int] = {}
    for row in rows:
        counts[row["kind"]] = counts.get(row["kind"], 0) + 1

    return {
        "exceptions": rows,
        "counts": counts,
        "total": len(rows),
        "projects_affected": len({r["project_id"] for r in rows}),
    }


# ===========================================================================
# BLOCKERS
# ===========================================================================
# The one thing this tier records rather than reads. A blocker that is a task
# is a card on the board and belongs there; this is for the ones that are not
# -- waiting on a client decision, a third-party API, a contract, or another
# project entirely. 12 of the migration plan calls these out explicitly as
# the part the `Dependencies` column cannot carry.
class BlockerIn(BaseModel):
    title: str
    description: Optional[str] = ""
    kind: Optional[str] = "internal"          # internal | client | third_party | dependency
    severity: Optional[str] = "medium"        # low | medium | high | critical
    # When this project is blocked *by another project*, rather than by
    # something outside the system. This is the cross-project case the board
    # cannot express at all, since a card belongs to exactly one board.
    blocking_project_id: Optional[str] = None
    target_date: Optional[str] = None


class BlockerResolve(BaseModel):
    resolution: Optional[str] = ""


@router.get("/projects/{project_id}/blockers")
async def list_blockers(project_id: str, request: Request):
    await _project_for_read(request, project_id)
    rows = await db.delivery_blockers.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return rows


@router.post("/projects/{project_id}/blockers")
async def raise_blocker(project_id: str, data: BlockerIn, request: Request):
    """Anyone on the project may raise a blocker.

    Deliberately not gated to the TSD. The person who discovers that a third
    party has gone quiet is usually the engineer waiting on them, and a
    blocker nobody is allowed to record is a blocker nobody finds out about.
    """
    user, project = await _project_for_read(request, project_id)

    kind = (data.kind or "internal").strip().lower()
    if kind not in BLOCKER_KINDS:
        raise HTTPException(
            status_code=400, detail=f"kind must be one of {', '.join(BLOCKER_KINDS)}"
        )
    severity = (data.severity or "medium").strip().lower()
    if severity not in BLOCKER_SEVERITIES:
        raise HTTPException(
            status_code=400,
            detail=f"severity must be one of {', '.join(BLOCKER_SEVERITIES)}",
        )
    if not (data.title or "").strip():
        raise HTTPException(status_code=400, detail="A blocker needs a title")

    blocking_name = None
    if data.blocking_project_id:
        other = await db.projects.find_one(
            {"id": data.blocking_project_id}, {"_id": 0, "name": 1}
        )
        if not other:
            raise HTTPException(status_code=404, detail="Blocking project not found")
        blocking_name = other.get("name")

    doc = {
        "blocker_id": _new_id(),
        "project_id": project_id,
        "title": data.title.strip(),
        "description": (data.description or "").strip(),
        "kind": kind,
        "severity": severity,
        "blocking_project_id": data.blocking_project_id,
        "blocking_project_name": blocking_name,
        "target_date": data.target_date,
        "status": "open",
        "raised_by_id": user.get("user_id"),
        "raised_by_name": user.get("name"),
        "created_at": _now(),
        "resolved_at": None,
        "resolved_by_id": None,
        "resolved_by_name": None,
        "resolution": None,
    }
    await db.delivery_blockers.insert_one(doc)
    doc.pop("_id", None)

    await db.audit_log.insert_one({
        "log_id": _new_id(),
        "entity_type": "blocker",
        "entity_id": doc["blocker_id"],
        "project_id": project_id,
        "action": "raised",
        "summary": f"Blocker raised: {doc['title']}",
        "user_id": user.get("user_id"),
        "user_name": user.get("name"),
        "timestamp": _now(),
        "details": {"kind": kind, "severity": severity},
    })

    # A critical blocker is the one case worth interrupting somebody over, and
    # the TSD owns unblocking the project, so they are told rather than left
    # to notice. Below critical this would be noise on every project.
    if severity == "critical" and project.get("tsd_id") != user.get("user_id"):
        tsd_id = project.get("tsd_id")
        if tsd_id:
            from services import notifications

            await notifications.notify_user_ids(
                db,
                user_ids=[tsd_id],
                kind="blocker_critical",
                title=f"Critical blocker on {project.get('name') or 'a project'}",
                reason=doc["title"],
                link=f"/flow/projects/{project_id}",
                entity_type="blocker",
                entity_id=doc["blocker_id"],
                actor=user,
            )
    return doc


@router.post("/blockers/{blocker_id}/resolve")
async def resolve_blocker(blocker_id: str, data: BlockerResolve, request: Request):
    """Resolve a blocker. Resolved, never deleted.

    The record of what held a project up is exactly what the closure report
    needs later, so this closes the row rather than removing it.
    """
    blocker = await db.delivery_blockers.find_one({"blocker_id": blocker_id}, {"_id": 0})
    if not blocker:
        raise HTTPException(status_code=404, detail="Blocker not found")
    user, _ = await _project_for_read(request, blocker["project_id"])

    if blocker.get("status") == "resolved":
        return blocker

    update = {
        "status": "resolved",
        "resolution": (data.resolution or "").strip(),
        "resolved_at": _now(),
        "resolved_by_id": user.get("user_id"),
        "resolved_by_name": user.get("name"),
    }
    await db.delivery_blockers.update_one({"blocker_id": blocker_id}, {"$set": update})
    await db.audit_log.insert_one({
        "log_id": _new_id(),
        "entity_type": "blocker",
        "entity_id": blocker_id,
        "project_id": blocker["project_id"],
        "action": "resolved",
        "summary": f"Blocker resolved: {blocker.get('title')}",
        "user_id": user.get("user_id"),
        "user_name": user.get("name"),
        "timestamp": _now(),
        "details": {"resolution": update["resolution"]},
    })
    return {**blocker, **update}


@router.get("/blockers")
async def all_blockers(request: Request, status: str = "open"):
    """Every blocker across the caller's portfolio, newest first."""
    user = await _get_user(request)
    projects = await _scoped_projects(user)
    by_id = {p.get("id"): p for p in projects}

    query: Dict[str, Any] = {"project_id": {"$in": list(by_id)}}
    if status in ("open", "resolved"):
        query["status"] = status

    rows = await db.delivery_blockers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for row in rows:
        project = by_id.get(row.get("project_id")) or {}
        row["project_name"] = project.get("name")
        row["project_ref"] = project.get("project_id_display")
        row["stage_label"] = stage_label(project.get("stage") or 1)
        row["age_days"] = _days_since(row.get("created_at"))
    return rows


# ===========================================================================
# TRACEABILITY
# ===========================================================================
@router.get("/projects/{project_id}/traceability")
async def traceability(project_id: str, request: Request):
    """Which requirement is which card, and what is not covered either way.

    Two questions this answers that nothing else in the product can:
    a requirement with no card is scope nobody has started, and a card with no
    requirement is work nobody asked for. Both are worth seeing before a
    closure conversation, and neither is visible from the board or the Product
    tab alone.

    The link is `requirement_id` on the card, set from the card itself. It is
    optional on purpose -- most cards are chores, spikes and fixes that no
    requirement will ever name, so demanding a link would just get a wrong one.
    """
    _user, _project = await _project_for_read(request, project_id)

    requirements = await db.requirements.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("req_ref", 1).to_list(1000)
    boards = await db.task_boards.find(
        {"project_id": project_id}, {"_id": 0, "board_id": 1, "title": 1, "position": 1}
    ).sort("position", 1).to_list(100)
    board_titles = {b["board_id"]: b.get("title") for b in boards}
    cards = await db.task_cards.find({"project_id": project_id}, {"_id": 0}).to_list(5000)

    # A column named "done" or "complete" is the only place the board records
    # that work finished, so requirement coverage is measured against it.
    done_board_ids = {
        b["board_id"] for b in boards
        if (b.get("title") or "").strip().lower() in ("done", "complete")
    }

    by_requirement: Dict[str, List[dict]] = {}
    unlinked: List[dict] = []
    for card in cards:
        summary = {
            "card_id": card.get("card_id"),
            "title": card.get("title"),
            "board_id": card.get("board_id"),
            "board_title": board_titles.get(card.get("board_id")),
            "done": card.get("board_id") in done_board_ids,
            "assignees": card.get("assignees") or [],
        }
        req_id = card.get("requirement_id")
        if req_id:
            by_requirement.setdefault(req_id, []).append(summary)
        else:
            unlinked.append(summary)

    traced = []
    for req in requirements:
        linked = by_requirement.get(req.get("requirement_id"), [])
        traced.append({
            "requirement_id": req.get("requirement_id"),
            "req_ref": req.get("req_ref"),
            "description": req.get("description"),
            "status": req.get("status"),
            "priority": req.get("priority"),
            "source_type": req.get("source_type"),
            "cards": linked,
            "card_count": len(linked),
            "all_done": bool(linked) and all(c["done"] for c in linked),
        })

    covered = sum(1 for t in traced if t["card_count"] > 0)
    delivered = sum(1 for t in traced if t["all_done"])
    return {
        "requirements": traced,
        "unlinked_cards": unlinked,
        "summary": {
            "requirements": len(traced),
            "covered": covered,
            "uncovered": len(traced) - covered,
            "delivered": delivered,
            "cards": len(cards),
            "unlinked_cards": len(unlinked),
            "coverage_pct": round((covered / len(traced)) * 100) if traced else 0,
        },
    }


class CardRequirementLink(BaseModel):
    # Null unlinks. Explicitly nullable rather than "omit to unlink", so the
    # caller can clear a wrong link without a second endpoint.
    requirement_id: Optional[str] = None


@router.patch("/cards/{card_id}/requirement")
async def link_card_requirement(card_id: str, data: CardRequirementLink, request: Request):
    """Point a board card at the requirement it delivers, or clear the link."""
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    user, _project = await _project_for_read(request, card.get("project_id"))

    req_ref = None
    if data.requirement_id:
        req = await db.requirements.find_one(
            {"requirement_id": data.requirement_id}, {"_id": 0, "project_id": 1, "req_ref": 1}
        )
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")
        # A card can only trace to a requirement on its own project. Allowing
        # otherwise would make the coverage figure meaningless.
        if req.get("project_id") != card.get("project_id"):
            raise HTTPException(
                status_code=400,
                detail="That requirement belongs to a different project",
            )
        req_ref = req.get("req_ref")

    await db.task_cards.update_one(
        {"card_id": card_id},
        {"$set": {
            "requirement_id": data.requirement_id,
            "requirement_ref": req_ref,
            "updated_at": _now(),
        }},
    )
    await db.audit_log.insert_one({
        "log_id": _new_id(),
        "entity_type": "card",
        "entity_id": card_id,
        "project_id": card.get("project_id"),
        "action": "traced" if data.requirement_id else "untraced",
        "summary": (f"Card linked to requirement {req_ref}" if req_ref
                    else "Card unlinked from its requirement"),
        "user_id": user.get("user_id"),
        "user_name": user.get("name"),
        "timestamp": _now(),
        "details": {"requirement_id": data.requirement_id},
    })
    return {"card_id": card_id, "requirement_id": data.requirement_id, "requirement_ref": req_ref}


# ===========================================================================
# REPORTS
# ===========================================================================
@router.get("/projects/{project_id}/report")
async def project_report(project_id: str, request: Request):
    """The project report, assembled from what the project already recorded.

    Nothing here is typed by hand and nothing is generated: every section is a
    read of a record somebody made at the time, which is the whole argument for
    having made them. At stage 17 this *is* the closure report the gate asks
    for -- the same assembly, read at the end rather than in the middle.

    Deliberately not a PDF. It is JSON so the page can render it, and the page
    can be printed; a server-side document generator would be a second
    formatting system to keep in step with the first.
    """
    user, project = await _project_for_read(request, project_id)
    stage = project.get("stage") or 1

    requirements = await db.requirements.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("req_ref", 1).to_list(1000)
    briefs = await db.product_briefs.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("version", -1).to_list(50)
    demos = await db.demos.find({"project_id": project_id}, {"_id": 0}).sort("round", 1).to_list(100)
    scope_changes = await db.scope_changes.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    decisions = await db.decisions.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    risks = await db.risks.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    milestones = await db.milestones.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("target_date", 1).to_list(200)
    blockers = await db.delivery_blockers.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    architecture = await db.architecture_documents.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("version", -1).to_list(50)

    boards = await db.task_boards.find(
        {"project_id": project_id}, {"_id": 0, "board_id": 1, "title": 1, "position": 1}
    ).sort("position", 1).to_list(100)
    card_counts = await _count_by_project(db.task_cards, {"project_id": project_id})
    per_board = await db.task_cards.aggregate([
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$board_id", "n": {"$sum": 1}}},
    ]).to_list(200)
    per_board_counts = {r["_id"]: r["n"] for r in per_board}

    # The timeline, with how long each stage actually took. Duration is the gap
    # between consecutive history entries, which is the only honest measure --
    # a stage has no start field of its own.
    history = list(project.get("stage_history") or [])
    timeline = []
    for index, entry in enumerate(history):
        started = _parse_iso(entry.get("at"))
        nxt = _parse_iso(history[index + 1].get("at")) if index + 1 < len(history) else None
        held_days = (nxt - started).days if started and nxt else (
            _days_since(entry.get("at")) if started else None
        )
        timeline.append({
            "from_stage": entry.get("from_stage"),
            "to_stage": entry.get("to_stage"),
            "to_stage_label": stage_label(entry.get("to_stage") or 1),
            "at": entry.get("at"),
            "by_name": entry.get("by_name"),
            "why": entry.get("why"),
            "forced": bool(entry.get("forced")),
            "days_held": held_days,
            "still_here": nxt is None,
        })

    by_status: Dict[str, int] = {}
    for req in requirements:
        key = req.get("status") or "proposed"
        by_status[key] = by_status.get(key, 0) + 1

    validated_demo = next((d for d in demos if d.get("outcome") == "validated"), None)
    closure = _closure_progress(project)

    return {
        "generated_at": _now(),
        "generated_by": user.get("name"),
        "is_closure_report": stage >= LAST_STAGE,
        "project": {
            "id": project.get("id"),
            "name": project.get("name"),
            "ref": project.get("project_id_display"),
            "client_name": project.get("client_name_snapshot"),
            "desired_outcome": project.get("desired_outcome"),
            "description": project.get("description"),
            "stage": stage,
            "stage_label": stage_label(stage),
            "phase": stage_phase(stage),
            "status": project.get("status"),
            "health": (project.get("health") or "GREEN").upper(),
            "health_reason": project.get("health_reason"),
            "tsd_name": project.get("tsd_name"),
            "architect_name": project.get("architect_name"),
            "pod_size": len(project.get("pod_member_ids") or []),
            "created_at": project.get("created_at"),
            "start_date": project.get("start_date"),
            "validated_at": project.get("validated_at"),
            "scope_frozen": bool(project.get("scope_frozen")),
            "scope_frozen_at": project.get("scope_frozen_at"),
            "completed_at": project.get("completed_at"),
            "elapsed_days": _days_since(project.get("created_at")),
        },
        "timeline": timeline,
        "definition": {
            "product_brief": briefs[0] if briefs else None,
            "brief_versions": len(briefs),
            "architecture_versions": len(architecture),
            "latest_architecture": architecture[0] if architecture else None,
        },
        "requirements": {
            "total": len(requirements),
            "by_status": by_status,
            "items": requirements,
        },
        "validation": {
            "demo_rounds": len(demos),
            "validated": bool(validated_demo),
            "validated_round": validated_demo.get("round") if validated_demo else None,
            "demos": [
                {
                    "round": d.get("round"),
                    "outcome": d.get("outcome"),
                    "held_at": d.get("held_at"),
                }
                for d in demos
            ],
        },
        "scope_changes": {
            "total": len(scope_changes),
            "approved": sum(1 for s in scope_changes if s.get("decision") == "approved"),
            "rejected": sum(1 for s in scope_changes if s.get("decision") == "rejected"),
            "pending": sum(1 for s in scope_changes if s.get("decision") == "pending"),
            "material": sum(1 for s in scope_changes if _scope_change_is_material(s)),
            "items": scope_changes,
        },
        "delivery": {
            "boards": [
                {
                    "board_id": b["board_id"],
                    "title": b.get("title"),
                    "cards": per_board_counts.get(b["board_id"], 0),
                }
                for b in boards
            ],
            "total_cards": card_counts.get(project_id, 0),
            "milestones": milestones,
            "milestones_delivered": sum(1 for m in milestones if m.get("delivered_date")),
        },
        "governance": {
            "decisions": decisions,
            "risks": risks,
            "risks_open": sum(1 for r in risks if r.get("status") == "open"),
            "blockers": blockers,
            "blockers_open": sum(1 for b in blockers if b.get("status") == "open"),
            "forced_gates": _forced_gates(project),
        },
        "closure": {
            **closure,
            "checklist": project.get("closure_checklist") or [],
            "template_size": len(CLOSURE_CHECKLIST),
        },
    }


# ===========================================================================
# SEARCH
# ===========================================================================
# What a search covers. Each entry says which collection to look in, which
# fields carry text worth matching, and how to turn a hit into a readable line.
# Kept as data rather than six near-identical query functions, because the only
# thing that actually differs between them is these three facts.
SEARCH_SOURCES = [
    {
        "type": "requirement", "collection": "requirements", "label": "Requirement",
        "fields": ["description", "acceptance_criteria", "req_ref"],
        "id_field": "requirement_id",
        "title": lambda r: f"{r.get('req_ref') or 'R?'} — {r.get('description') or ''}",
        "detail": lambda r: r.get("acceptance_criteria") or r.get("category") or "",
    },
    {
        "type": "decision", "collection": "decisions", "label": "Decision",
        "fields": ["title", "description", "rationale"],
        "id_field": "decision_id",
        "title": lambda r: r.get("title") or "Decision",
        "detail": lambda r: r.get("rationale") or r.get("description") or "",
    },
    {
        "type": "risk", "collection": "risks", "label": "Risk",
        "fields": ["title", "description", "mitigation"],
        "id_field": "risk_id",
        "title": lambda r: r.get("title") or "Risk",
        "detail": lambda r: r.get("mitigation") or r.get("description") or "",
    },
    {
        "type": "scope_change", "collection": "scope_changes", "label": "Scope change",
        "fields": ["description", "impact_timeline", "impact_cost", "decision_reason"],
        "id_field": "scope_change_id",
        "title": lambda r: r.get("description") or "Scope change",
        "detail": lambda r: f"{r.get('decision') or 'pending'} — {r.get('decision_reason') or ''}",
    },
    {
        "type": "blocker", "collection": "delivery_blockers", "label": "Blocker",
        "fields": ["title", "description", "resolution"],
        "id_field": "blocker_id",
        "title": lambda r: r.get("title") or "Blocker",
        "detail": lambda r: f"{r.get('status') or 'open'} — {r.get('description') or ''}",
    },
    {
        "type": "feedback", "collection": "feedback_items", "label": "Client feedback",
        "fields": ["raw_text"],
        "id_field": "feedback_id",
        "title": lambda r: (r.get("raw_text") or "Feedback")[:160],
        "detail": lambda r: r.get("classification") or "",
    },
    {
        # `content` is the extracted text of an uploaded transcript or brief,
        # which is exactly the thing worth searching and much too long to
        # return -- hence the snippet window below.
        "type": "document", "collection": "documents", "label": "Document",
        "fields": ["title", "original_filename", "source_label", "content"],
        "id_field": "document_id",
        "title": lambda r: r.get("title") or r.get("original_filename") or "Document",
        "detail": lambda r: r.get("doc_type") or r.get("source_label") or "",
    },
]

# Documents and transcripts can hold an entire extracted PDF. Matching them is
# the point of a search, but returning them is not -- a hit shows a window
# around the match instead.
SNIPPET_RADIUS = 90


def _snippet(text: Any, needle: str) -> str:
    if not isinstance(text, str) or not text:
        return ""
    lowered = text.lower()
    at = lowered.find(needle.lower())
    if at < 0:
        return text[: SNIPPET_RADIUS * 2].strip()
    start = max(0, at - SNIPPET_RADIUS)
    end = min(len(text), at + len(needle) + SNIPPET_RADIUS)
    return ("…" if start > 0 else "") + text[start:end].strip() + ("…" if end < len(text) else "")


@router.get("/search")
async def search(request: Request, q: str, limit: int = 60):
    """Search across everything a project knows, not just its name.

    The pipeline's own search matches project names and client names. This one
    also reaches requirements, decisions, risks, scope changes, blockers,
    client feedback and document text, because "what did we decide about the
    invoice export" is the question people actually have, and today the only
    way to answer it is to remember which project it was.

    Regex rather than a text index: the corpus is small, the collections are
    many, and a `$text` index per collection is infrastructure to maintain for
    a feature that has not yet earned it. If this gets slow, that is the fix.
    """
    user = await _get_user(request)
    term = (q or "").strip()
    if len(term) < 2:
        return {"query": term, "results": [], "total": 0, "truncated": False}

    projects = await _scoped_projects(user)
    by_id = {p.get("id"): p for p in projects}
    ids = list(by_id)
    if not ids:
        return {"query": term, "results": [], "total": 0, "truncated": False}

    # Escaped, so a user typing a bracket or a dot gets a literal search rather
    # than a regex error or an accidental wildcard.
    import re as _re

    pattern = {"$regex": _re.escape(term), "$options": "i"}
    commercial_only = permissions.sees_commercial_slice_only(user)

    results: List[dict] = []

    # Projects themselves first: the most likely thing somebody means.
    for project in projects:
        haystacks = [
            project.get("name"), project.get("client_name_snapshot"),
            project.get("project_id_display"), project.get("desired_outcome"),
            project.get("description"),
        ]
        if any(isinstance(h, str) and term.lower() in h.lower() for h in haystacks):
            results.append({
                "type": "project",
                "label": "Project",
                "entity_id": project.get("id"),
                "project_id": project.get("id"),
                "project_name": project.get("name"),
                "stage_label": stage_label(project.get("stage") or 1),
                "title": project.get("name"),
                "detail": project.get("client_name_snapshot") or "",
                "snippet": _snippet(project.get("desired_outcome"), term),
                "link": f"/flow/projects/{project.get('id')}",
            })

    for source in SEARCH_SOURCES:
        # Legal and Finance see the commercial slice of a project, and raw
        # client conversation is explicitly outside it (5.3). Searching it
        # would be a way around that, so those sources are skipped for them
        # rather than filtered afterwards.
        if commercial_only and source["type"] in ("feedback", "document", "blocker"):
            continue

        collection = getattr(db, source["collection"])
        rows = await collection.find(
            {
                "project_id": {"$in": ids},
                "$or": [{field: pattern} for field in source["fields"]],
            },
            {"_id": 0},
        ).limit(limit).to_list(limit)

        for row in rows:
            project = by_id.get(row.get("project_id")) or {}
            matched_text = next(
                (row.get(f) for f in source["fields"]
                 if isinstance(row.get(f), str) and term.lower() in row[f].lower()),
                "",
            )
            results.append({
                "type": source["type"],
                "label": source["label"],
                "entity_id": row.get(source["id_field"]),
                "project_id": row.get("project_id"),
                "project_name": project.get("name"),
                "stage_label": stage_label(project.get("stage") or 1),
                "title": str(source["title"](row))[:200],
                "detail": str(source["detail"](row))[:200],
                "snippet": _snippet(matched_text, term),
                "link": f"/flow/projects/{row.get('project_id')}",
            })

    truncated = len(results) > limit
    return {
        "query": term,
        "results": results[:limit],
        "total": len(results),
        "truncated": truncated,
        "by_type": {
            t: sum(1 for r in results if r["type"] == t)
            for t in {r["type"] for r in results}
        },
    }


# ===========================================================================
# FUNCTION VIEWS
# ===========================================================================
# "View as function": the dashboard, answered for one delivery function rather
# than for the portfolio as a whole. A Senior Partner asking "what needs me"
# and a Legal officer asking it are asking different questions, and until now
# both got the same answer.
#
# Modelled on the Emergent reference build's /function/:role screens, with two
# deliberate departures:
#
#   1. **It is gated.** The reference renders the switcher for everyone and
#      /dashboard/role/{role} never checks that the caller is that role, so
#      anybody could read the CEO's at-risk portfolio. Here you always get your
#      own function, and somebody else's only if you could already see every
#      project anyway.
#   2. **Every section is backed by data we actually hold.** The reference has
#      Invoices, Offers & Onboarding and Defects tables; we have no invoices,
#      no offer records and no defect tracker, so those would be permanently
#      empty. Legal and Finance are answered from what a project really
#      carries -- its contract and its value -- instead.
#
# A section is {key, title, empty, columns, rows}. The shape is decided here so
# that adding a function view is a server change, not a new screen.

# From this stage on a project should be working under a signed contract --
# stage 11 validates readiness and stage 12 commits a pod. Before it, an
# unsigned contract is the normal state of affairs, and listing those would
# bury the ones that matter.
CONTRACT_STAGE = VALIDATION_STAGE

# The stages where the ball is in the client's court.
CLIENT_FACING_STAGES = {9, 10, 15}

FUNCTION_VIEWS = {
    permissions.SENIOR_PARTNER,
    permissions.TSD,
    permissions.ENGINEER,
    permissions.TALENT_SD,
    permissions.LEGAL,
    permissions.FINANCE,
    permissions.QA,
}

# What each view is called on screen. The engineer's view is labelled Solution
# Architect because that is the job it answers -- architecting is
# `can_architect` on an engineer rather than a function of its own, and calling
# the view "Engineer" would hide what it is for.
FUNCTION_VIEW_LABELS = {
    permissions.SENIOR_PARTNER: "Senior Partner",
    permissions.TSD: "TSD",
    permissions.ENGINEER: "Solution Architect",
    permissions.TALENT_SD: "TalentSD",
    permissions.LEGAL: "Legal",
    permissions.FINANCE: "Finance",
    permissions.QA: "QA",
}


def _section(key, title, empty, columns, rows):
    return {"key": key, "title": title, "empty": empty,
            "columns": columns, "rows": rows}


def _row(project, **extra):
    """The columns every function view shares, so a row is always clickable."""
    stage = project.get("stage") or 1
    row = {
        "project_id": project.get("id"),
        "name": project.get("name"),
        "client_name": project.get("client_name_snapshot"),
        "stage": stage,
        "stage_label": stage_label(stage),
        "health": (project.get("health") or "GREEN").upper(),
    }
    row.update(extra)
    return row


def _waited_label(days):
    if days is None:
        return "—"
    if days == 0:
        return "Today"
    return "%d day%s" % (days, "" if days == 1 else "s")


def _snippet_text(text, limit=90):
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


def _may_switch_function(user):
    """Who may look at a function view that is not their own.

    Administrators only. `can_view_all_projects` was the obvious gate and is
    the wrong one: it also admits Legal and Finance, so a Legal officer could
    have opened the Senior Partner's at-risk portfolio. Being able to *find*
    every project is not the same as being entitled to read the firm through
    somebody else's job.
    """
    return permissions.is_admin(user)


def _own_function(user):
    """Which view is this person's own.

    An architect-capable engineer gets the architect view rather than none:
    `can_architect` is the structural rule, and reading `function_role` alone
    would leave every engineer in Technology & Build without a view.
    """
    if permissions.can_architect(user):
        return permissions.ENGINEER
    role = permissions.function_role(user)
    return role if role in FUNCTION_VIEWS else None


@router.get("/functions")
async def function_views(request: Request):
    """Which function views this caller may open, and which one is theirs.

    The switcher is built from this rather than from a list in the browser.
    Offering a view the server will refuse is precisely the front-end/back-end
    drift that has bitten this codebase before.
    """
    user = await _get_user(request)
    mine = _own_function(user)
    everyone = _may_switch_function(user)
    available = sorted(FUNCTION_VIEWS) if everyone else ([mine] if mine else [])
    return {
        "mine": mine,
        "can_switch": everyone,
        "available": [{"key": k, "label": FUNCTION_VIEW_LABELS[k]} for k in available],
    }


@router.get("/function/{function_key}")
async def function_view(function_key: str, request: Request):
    """One function's dashboard: the few lists that function actually acts on."""
    user = await _get_user(request)
    if function_key not in FUNCTION_VIEWS:
        raise HTTPException(status_code=404, detail="No such function view")

    mine = _own_function(user)
    if function_key != mine and not _may_switch_function(user):
        raise HTTPException(
            status_code=403,
            detail="You can only open your own function's view",
        )

    # Closed projects are excluded throughout: this is a list of things to do,
    # and a finished project is not one of them.
    projects = await _scoped_projects(user, {"stage": {"$lt": LAST_STAGE}})
    uid = user.get("user_id")
    sections = []

    # Somebody who sees every project has no "mine" to narrow to, so an
    # ownership filter would hand them an empty screen. They get the portfolio
    # instead -- but the section is then no longer "my projects", so the
    # caller is told which it is and titles the list honestly.
    def owned_by(field):
        rows = [p for p in projects if p.get(field) == uid]
        if rows or not _may_switch_function(user):
            return rows, True
        return projects, False

    def titled(is_own, own_title, all_title):
        return own_title if is_own else all_title

    if function_key == permissions.SENIOR_PARTNER:
        sections.append(_section(
            "at_risk", "Projects at risk",
            "No project is off track.",
            [{"key": "name", "label": "Project"},
             {"key": "client_name", "label": "Client"},
             {"key": "health", "label": "Health", "type": "health"},
             {"key": "reason", "label": "Reason"}],
            [_row(p, reason=p.get("health_reason") or "—")
             for p in projects
             if (p.get("health") or "").upper() in ("RED", "AMBER")],
        ))
        # Stage 6 is the one place the Senior Partner sits on the critical
        # path. The portfolio carries this as one exception among many; for the
        # person who has to make the decision it is the entire job.
        sections.append(_section(
            "needs_architect", "Awaiting your architect selection",
            "Nothing is waiting on you.",
            [{"key": "name", "label": "Project"},
             {"key": "client_name", "label": "Client"},
             {"key": "waiting", "label": "Waiting"}],
            [_row(p, waiting=_waited_label(_days_since(_last_movement(p))))
             for p in projects
             if (p.get("stage") or 1) == ARCHITECT_STAGE and not p.get("architect_id")],
        ))

    elif function_key == permissions.TSD:
        owned, is_own = owned_by("tsd_id")
        sections.append(_section(
            "my_projects",
            titled(is_own, "My projects", "Projects in delivery"),
            "You are not running any project yet.",
            [{"key": "name", "label": "Project"},
             {"key": "stage_label", "label": "Stage", "type": "stage"},
             {"key": "health", "label": "Health", "type": "health"},
             {"key": "waiting", "label": "Last moved"}],
            [_row(p, waiting=_waited_label(_days_since(_last_movement(p))))
             for p in sorted(owned, key=lambda p: p.get("stage") or 0, reverse=True)],
        ))

        # "Awaiting client", from the reference build. We hold no client_status
        # field, but a demo records when it was scheduled, when it was held and
        # what the client decided -- which is the same fact, actually captured.
        demo_rows = await db.demos.find(
            {"project_id": {"$in": [p.get("id") for p in owned]}}, {"_id": 0}
        ).to_list(1000)
        latest = {}
        for demo in demo_rows:
            pid = demo.get("project_id")
            if pid not in latest or (demo.get("round") or 0) > (latest[pid].get("round") or 0):
                latest[pid] = demo
        awaiting = []
        for project in owned:
            demo = latest.get(project.get("id"))
            if demo and not demo.get("held_at") and demo.get("scheduled_for"):
                awaiting.append(_row(project, client_status="Demo scheduled"))
            elif demo and demo.get("held_at") and (demo.get("outcome") or "pending") == "pending":
                awaiting.append(_row(project, client_status="Demo held, awaiting verdict"))
            elif (project.get("stage") or 1) in CLIENT_FACING_STAGES:
                awaiting.append(_row(project, client_status="With the client"))
        sections.append(_section(
            "awaiting_client", "Awaiting client",
            "Nothing is sitting with a client.",
            [{"key": "name", "label": "Project"},
             {"key": "client_status", "label": "Client status", "type": "status"}],
            awaiting,
        ))

        idle = [p for p in owned
                if (_days_since(_last_movement(p)) or 0) >= STALLED_AFTER_DAYS]
        sections.append(_section(
            "not_moving", "Not moving",
            "Everything has moved in the last %d days." % STALLED_AFTER_DAYS,
            [{"key": "name", "label": "Project"},
             {"key": "stage_label", "label": "Stuck at", "type": "stage"},
             {"key": "waiting", "label": "For"}],
            [_row(p, waiting=_waited_label(_days_since(_last_movement(p)))) for p in idle],
        ))

    elif function_key == permissions.ENGINEER:
        owned, is_own = owned_by("architect_id")
        counts = await _count_by_project(
            db.architecture_documents,
            {"project_id": {"$in": [p.get("id") for p in owned]}},
        )

        def architecture(pid):
            n = counts.get(pid, 0)
            return "None yet" if not n else "%d document%s" % (n, "" if n == 1 else "s")

        sections.append(_section(
            "my_projects",
            titled(is_own, "Projects I architect", "Projects with an architect view"),
            "You have not been named architect on a project yet.",
            [{"key": "name", "label": "Project"},
             {"key": "stage_label", "label": "Stage", "type": "stage"},
             {"key": "architecture", "label": "Architecture"},
             {"key": "health", "label": "Health", "type": "health"}],
            [_row(p, architecture=architecture(p.get("id"))) for p in owned],
        ))

    elif function_key == permissions.TALENT_SD:
        by_id = {p.get("id"): p for p in projects}
        reqs = await db.talent_requirements.find(
            {"project_id": {"$in": list(by_id)}, "status": {"$ne": "rejected"}}, {"_id": 0}
        ).to_list(500)
        sections.append(_section(
            "requests", "Open talent requests",
            "No pod roles are waiting to be filled.",
            [{"key": "name", "label": "Project"},
             {"key": "role", "label": "Role"},
             {"key": "skills", "label": "Skills"},
             {"key": "status", "label": "Status", "type": "status"}],
            [_row(by_id[r["project_id"]],
                  role=r.get("role") or r.get("title") or "—",
                  skills=", ".join(r.get("skills") or []) or "—",
                  status=r.get("status") or "pending")
             for r in reqs if r.get("project_id") in by_id],
        ))

    elif function_key == permissions.LEGAL:
        # There is no contracts collection. A project's contract is a URL on
        # the project with a `signed_at` beside it, so that is what Legal is
        # asked about here.
        sections.append(_section(
            "unsigned", "Contracts not yet signed",
            "Everything past validation is signed.",
            [{"key": "name", "label": "Project"},
             {"key": "client_name", "label": "Client"},
             {"key": "stage_label", "label": "Stage", "type": "stage"},
             {"key": "contract", "label": "Contract", "type": "status"}],
            [_row(p, contract="Uploaded, unsigned" if p.get("contract_url") else "Not uploaded")
             for p in projects
             if not p.get("signed_at") and (p.get("stage") or 1) >= CONTRACT_STAGE],
        ))

    elif function_key == permissions.FINANCE:
        signed = [p for p in projects if p.get("signed_at")]
        sections.append(_section(
            "signed_value", "Signed work in delivery",
            "Nothing signed is currently in delivery.",
            [{"key": "name", "label": "Project"},
             {"key": "client_name", "label": "Client"},
             {"key": "stage_label", "label": "Stage", "type": "stage"},
             {"key": "value", "label": "Value", "type": "money"}],
            [_row(p, value=p.get("total_value"), currency=p.get("currency") or "GBP")
             for p in signed],
        ))
        sections.append(_section(
            "unpriced", "Signed without a value recorded",
            "Every signed project carries a value.",
            [{"key": "name", "label": "Project"},
             {"key": "client_name", "label": "Client"},
             {"key": "stage_label", "label": "Stage", "type": "stage"}],
            [_row(p) for p in signed if not p.get("total_value")],
        ))

    elif function_key == permissions.QA:
        in_test = [p for p in projects if (p.get("stage") or 1) >= VALIDATION_STAGE]
        by_id = {p.get("id"): p for p in in_test}
        sections.append(_section(
            "in_test", "Projects in validation or build",
            "Nothing has reached validation yet.",
            [{"key": "name", "label": "Project"},
             {"key": "stage_label", "label": "Stage", "type": "stage"},
             {"key": "build", "label": "Build", "type": "status"},
             {"key": "health", "label": "Health", "type": "health"}],
            [_row(p, build=(p.get("build_status") or "not started").replace("_", " "))
             for p in in_test],
        ))
        # `feedback_items` records what the client said and how it was
        # classified; there is no status on it, so this lists what has come in
        # rather than pretending to know what is still open.
        feedback = await db.feedback_items.find(
            {"project_id": {"$in": list(by_id)}}, {"_id": 0}
        ).sort("created_at", -1).to_list(200)
        sections.append(_section(
            "feedback", "Client feedback captured",
            "No client feedback has been recorded.",
            [{"key": "name", "label": "Project"},
             {"key": "item", "label": "Feedback"},
             {"key": "classification", "label": "Type", "type": "status"}],
            [_row(by_id[f["project_id"]],
                  item=_snippet_text(f.get("raw_text") or ""),
                  classification=f.get("classification") or "unclassified")
             for f in feedback if f.get("project_id") in by_id],
        ))

    return {
        "function": function_key,
        "label": FUNCTION_VIEW_LABELS[function_key],
        "is_own": function_key == mine,
        "sections": sections,
        "total_rows": sum(len(s["rows"]) for s in sections),
    }
