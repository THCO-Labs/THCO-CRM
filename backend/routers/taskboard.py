"""
Task Board router — Trello-like boards and cards, scoped per project.

A board is a Trello "list" (a column). A card is a task inside a board.
Every board and card belongs to exactly ONE project (project_id). Boards
and cards live in two collections so a card move never rewrites a whole
board document, and the project workspace stays a single round-trip.

Projects are NOT duplicated — this module reuses the existing `projects`
collection (the Crowther OS delivery pipeline). We only annotate those
projects with board/task counts for the Projects workspace grid.

Permissions: the board is the technical build, so its shape belongs to the
project's Solution Architect, with the TSD and administrators alongside
(`permissions.can_manage_boards`). Anybody on the project may move their own
cards -- that is the point of being on it.

This used to admit anyone holding `is_delivery_coordinator`. That flag is
retired: the coordinator's job was choosing who runs a project, which is now
stage 2 of the lifecycle rather than a standing privilege.

  GET    /api/tasks/projects/summary       Flow projects + board/task counts
  GET    /api/tasks/boards?project_id=     project-scoped boards (cards embedded)
  POST   /api/tasks/boards                 create a board (coordinator only)
  PATCH  /api/tasks/boards/{id}            rename a board (coordinator only)
  DELETE /api/tasks/boards/{id}            delete a board + cards (coordinator)
  POST   /api/tasks/boards/{id}/cards      add a card (coordinator only)
  PATCH  /api/tasks/cards/{id}             edit a card (coordinator only)
  DELETE /api/tasks/cards/{id}             delete a card (coordinator only)
  POST   /api/tasks/reorder                persist a new layout (coordinator only)
  GET    /api/tasks/team-members?project_id=  candidate assignees (+ project members)
  ...labels CRUD (coordinator only)

Sharing — each project has at most one share link (Google-Docs-style),
managed by the coordinator and consumed anonymously by clients:

  GET    /api/tasks/projects/{id}/share            current link, if any (coordinator)
  POST   /api/tasks/projects/{id}/share            generate a link (coordinator)
  POST   /api/tasks/projects/{id}/share/regenerate rotate the token, invalidating the old one (coordinator)
  PATCH  /api/tasks/projects/{id}/share            update permission / enabled (coordinator)
  GET    /api/tasks/shared/{token}                 public: board + card data
  POST   /api/tasks/shared/{token}/boards/{id}/cards  public: create a card (edit links only)
  PATCH  /api/tasks/shared/{token}/cards/{id}      public: edit a card (edit links only)
  POST   /api/tasks/shared/{token}/reorder         public: move/reorder cards (edit links only)
"""
from fastapi import APIRouter, HTTPException, Request, Response, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re
import secrets

import logging

from services import permissions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Will be set from server.py
db = None


def set_db(database):
    global db
    db = database


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
# Predefined board titles shown in the "Add another board" dropdown.
# "QA Review" intentionally appears only once. "Design QA" sits between
# "Ready For Merge" and "Done" per CROWTHER_MIGRATION_PLAN.md §10.2 -- it was
# named in the stage 13 playbook copy but never actually offered as a column.
DEFAULT_BOARD_TITLES = [
    "UI/UX Tasks",
    "Dependencies",
    "Backlog",
    "Frontend Todo",
    "Backend Todo",
    "QA Review",
    "Ready For Merge",
    "Design QA",
    "Done",
]

# Cycle through these colors for newly created labels.
LABEL_COLORS = [
    "#1B4332", "#4C5B6B", "#8F7340", "#A94E5B", "#6B4C5B", "#4C6B5B", "#5B4C6B", "#73408F",
    "#C6A15B", "#D6BC8A", "#2D6A4F", "#1FB58A",
]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class BoardCreate(BaseModel):
    title: str
    project_id: str


class BoardUpdate(BaseModel):
    title: Optional[str] = None


class LabelRef(BaseModel):
    """A label attached to a card. Persisted as a rich object (id + name + color)
    so cards render correctly even if a label is later renamed/deleted."""
    label_id: str
    name: str
    color: str = "#1B4332"


class AssigneeRef(BaseModel):
    """An assignee attached to a card. Persisted as a rich object snapshot
    (id + name + email + picture + role) for fast rendering."""
    user_id: str
    name: str = ""
    email: str = ""
    picture: Optional[str] = None
    role: str = ""


class CardCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"  # low | medium | high | urgent
    labels: List[LabelRef] = []
    assignees: List[AssigneeRef] = []
    due_date: Optional[str] = None
    # Optional traceability back to the requirement this card delivers
    # (CROWTHER_MIGRATION_PLAN.md §13, Tier 3). Optional on purpose: most cards
    # are chores, spikes and fixes that no requirement will ever name, and
    # demanding a link would only get a wrong one. Validated and normally set
    # via `PATCH /control-tower/cards/{id}/requirement`, which also checks the
    # requirement belongs to this card's project.
    requirement_id: Optional[str] = None


class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    labels: Optional[List[LabelRef]] = None
    assignees: Optional[List[AssigneeRef]] = None
    due_date: Optional[str] = None
    requirement_id: Optional[str] = None


class CardPosition(BaseModel):
    card_id: str
    board_id: str
    position: int


class ReorderRequest(BaseModel):
    board_order: List[str] = []
    cards: List[CardPosition] = []


class LabelCreate(BaseModel):
    name: str
    color: str = "#1B4332"


class LabelUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class ShareUpdate(BaseModel):
    """Coordinator-only patch to a project's share link."""
    permission: Optional[str] = None  # "view" | "edit"
    enabled: Optional[bool] = None


# Narrower than CardCreate/CardUpdate on purpose: a public share link — even
# an "editable" one — can never set `assignees`. Assignment stays an
# internal, coordinator-only concept (see _is_coordinator), so the field is
# structurally absent here rather than merely ignored at runtime.
class SharedCardCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    labels: List[LabelRef] = []
    due_date: Optional[str] = None


class SharedCardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    labels: Optional[List[LabelRef]] = None
    due_date: Optional[str] = None


class SharedReorderRequest(BaseModel):
    """Card-only reorder for shared links — board reordering/management is
    never exposed publicly, so there is no `board_order` field to accept."""
    cards: List[CardPosition] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


def _is_coordinator(user: dict) -> bool:
    """Whether this person may manage the shared label vocabulary.

    Labels are global rather than per-project, so this is not tied to one
    board: administrators, unit heads and the older delivery-coordinator
    role. A head running her unit's boards needs to be able to create the
    labels those boards use without asking somebody else.
    """
    return bool(
        permissions.is_admin(user)
        or permissions.is_unit_head(user)
        or user.get("is_delivery_coordinator")
    )


async def _require_coordinator(request: Request) -> dict:
    user = await _current(request)
    if not _is_coordinator(user):
        raise HTTPException(
            status_code=403,
            detail="Only this project's TSD, its architect, or an administrator can manage labels",
        )
    return user


async def _assert_project_access(user: dict, project_id: Optional[str]) -> None:
    """A staff member may only reach the boards of a project they are on.

    Boards and cards inherit their project's confidentiality: the board of a
    client engagement names the client, the deliverables and who is behind.
    Administrators and delivery oversight see the whole portfolio, for which
    project_scope_filter returns an empty filter.
    """
    if permissions.can_view_all_projects(user):
        return
    if not project_id:
        raise HTTPException(status_code=403, detail="You can only view projects you are assigned to")
    scope = permissions.project_scope_filter(user)
    mine = await db.projects.find_one({"id": project_id, **scope}, {"_id": 0, "id": 1})
    if not mine:
        raise HTTPException(
            status_code=403,
            detail="You can only view projects you are assigned to",
        )


async def _board_for_access(user: dict, board_id: str) -> dict:
    """Load a board, having confirmed the caller may reach its project."""
    board = await db.task_boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    await _assert_project_access(user, board.get("project_id"))
    return board


async def _announce_assignees(card: dict, before: list, after: list,
                              board: dict, actor: dict) -> None:
    """Tell anyone newly put on a task, and make sure they can reach it.

    Being added to a project was already announced; being handed one of its
    tasks was not, so work could be assigned to somebody who never found out
    unless they happened to open the board. Assigning also puts them on the
    project, since a task you cannot open is not an assignment.
    """
    had = {a.get("user_id") for a in (before or []) if a.get("user_id")}
    added = [a for a in (after or []) if a.get("user_id") and a["user_id"] not in had]
    if not added:
        return

    project = await db.projects.find_one({"id": board.get("project_id")}, {"_id": 0})
    if not project:
        return

    for a in added:
        await db.projects.update_one(
            {"id": project["id"], "pod_member_ids": {"$ne": a["user_id"]}},
            {"$addToSet": {
                "pod_member_ids": a["user_id"],
                "pod": {"user_id": a["user_id"], "name": a.get("name"),
                                  "email": a.get("email")},
            }},
        )

    from services.notifications import notify_assigned_to_task
    await notify_assigned_to_task(db, card, added, project, board.get("title") or "", actor)


async def _project_or_404(project_id: Optional[str]) -> dict:
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _require_board_manager(request: Request, project_id: Optional[str]) -> tuple:
    """For changing a board's shape: the project's TSD, its architect, or an admin.

    The board is the technical build, so its shape is the architect's; the TSD
    keeps it too because they own the project and should not have to find the
    architect to fix a column. Both create boards, not only administrators.

    Boards used to be gated on the delivery-coordinator flag alone, which
    neither of them carries -- so the people actually responsible for a project
    could open it and find its board read-only.
    """
    user = await _current(request)
    project = await _project_or_404(project_id)
    permissions.require(
        permissions.can_manage_boards(user, project),
        "Only this project's TSD, its architect, or an administrator can change its boards",
    )
    return user, project


async def _require_board_user(request: Request, project_id: Optional[str]) -> tuple:
    """For working inside a board: anybody on the project.

    Collaborators post their progress here, so cards are theirs to add, edit
    and move even though the board layout is not.
    """
    user = await _current(request)
    project = await _project_or_404(project_id)
    permissions.require(
        permissions.can_use_board(user, project),
        "You can only work on the board of a project you are on",
    )
    return user, project


async def _next_board_position(project_id: str) -> int:
    """Position a new board after the last existing one in this project."""
    last = await db.task_boards.find_one({"project_id": project_id}, sort=[("position", -1)])
    return (last.get("position", -1) + 1) if last else 0


async def _next_card_position(board_id: str) -> int:
    last = await db.task_cards.find_one({"board_id": board_id}, sort=[("position", -1)])
    return (last.get("position", -1) + 1) if last else 0


async def _next_label_color() -> str:
    current_labels_count = await db.task_labels.count_documents({})
    return LABEL_COLORS[current_labels_count % len(LABEL_COLORS)]


# ---------------------------------------------------------------------------
# Projects — reuse the existing `projects` collection (Crowther OS), annotated
# ---------------------------------------------------------------------------
@router.get("/projects/summary")
async def projects_summary(request: Request):
    """List existing projects (from the Flow pipeline) annotated with the
    number of boards and tasks each has. Does NOT duplicate project data."""
    user = await _current(request)
    # Staff see only their own projects here, exactly as they do in Flow.
    scope = permissions.project_scope_filter(user)
    projects = await db.projects.find(scope, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Aggregate board counts per project
    board_counts = {}
    async for b in db.task_boards.aggregate([
        {"$group": {"_id": "$project_id", "count": {"$sum": 1}}},
    ]):
        board_counts[b["_id"]] = b["count"]

    # Aggregate task counts per project (cards carry a denormalized project_id)
    task_counts = {}
    async for c in db.task_cards.aggregate([
        {"$group": {"_id": "$project_id", "count": {"$sum": 1}}},
    ]):
        task_counts[c["_id"]] = c["count"]

    # Cards sitting in a column that means finished. The board is free-form, so
    # this matches on the column's name rather than on a status field it does
    # not have.
    done_counts = {}
    # Was reading `boards`/`cards`, which nothing writes to -- this always
    # returned zero regardless of how much work was actually done.
    done_boards = await db.task_boards.find(
        {"title": {"$regex": r"^(done|complete[d]?)$", "$options": "i"}},
        {"_id": 0, "board_id": 1, "project_id": 1},
    ).to_list(500)
    done_board_ids = [b["board_id"] for b in done_boards]
    if done_board_ids:
        by_board = {b["board_id"]: b["project_id"] for b in done_boards}
        async for c in db.task_cards.aggregate([
            {"$match": {"board_id": {"$in": done_board_ids}}},
            {"$group": {"_id": "$board_id", "count": {"$sum": 1}}},
        ]):
            pid_for_board = by_board.get(c["_id"])
            if pid_for_board:
                done_counts[pid_for_board] = done_counts.get(pid_for_board, 0) + c["count"]

    # Stage labels come from the lifecycle itself. This used to be a copy kept
    # by hand, which is exactly the kind of thing that goes quietly wrong: it
    # still described the old ten-stage sales pipeline, so a project at stage 4
    # was labelled "Package Building" long after that stage stopped existing.
    from services.delivery_stages import stage_label

    out = []
    for p in projects:
        pid = p.get("id")
        stage = p.get("stage") or 1
        is_lost = p.get("status") == "lost"
        out.append({
            "id": pid,
            "name": p.get("name"),
            "project_id_display": p.get("project_id_display"),
            "client_name": p.get("client_name_snapshot"),
            "stage": stage,
            "stage_label": "Lost" if is_lost else stage_label(stage),
            "status": p.get("status"),
            "track": p.get("track"),
            # On a task board, progress means how much of the work is done, so
            # it counts cards rather than stages. It used to divide the stage by
            # ten, which after the move to seventeen stages meant everything
            # past stage 10 read "100%" -- next to "0 boards, 0 tasks", which is
            # the opposite of true. Where there are no cards there is no number,
            # because a bar at 0% and a bar that means nothing look identical.
            "progress": None if not task_counts.get(pid) else round(
                done_counts.get(pid, 0) / task_counts[pid] * 100),
            "tasks_done": done_counts.get(pid, 0),
            # Who runs this project. `delivery_owner_name` is retired, and
            # reading it meant the card silently credited whoever created the
            # project instead.
            "coordinator_name": p.get("tsd_name") or p.get("created_by_name"),
            "coordinator_id": p.get("tsd_id") or p.get("created_by"),
            "engineer_name": p.get("assigned_engineer_name"),
            "engineer_id": p.get("assigned_engineer_id"),
            "created_by_name": p.get("created_by_name"),
            "created_at": p.get("created_at"),
            # Sent so the workspace can say when a project last moved. Without
            # it the card would date itself by when it was created, which is
            # not the same claim and is wrong on anything long-running.
            "updated_at": p.get("updated_at"),
            # The project's picture, so the workspace grid can show it.
            "thumbnail_id": p.get("thumbnail_id"),
            "completed_at": p.get("completed_at"),
            "board_count": board_counts.get(pid, 0),
            "task_count": task_counts.get(pid, 0),
            # Projects that predate unit heads are demo data, and the board
            # should say so rather than presenting them as live work.
            "is_demo": bool(p.get("is_demo")),
            # The board UI decides from these whether this viewer shapes the
            # board, works inside it, or only reads it.
            "pod_member_ids": p.get("pod_member_ids") or [],
            # Who is on the project, and who runs the unit it belongs to.
            # Everybody on a project can see the rest of the team -- knowing
            # who you are working alongside is part of being on it.
            "pod": [
                {"user_id": c.get("user_id"), "name": c.get("name")}
                for c in (p.get("pod") or [])
            ],
            # Who runs this project. The TSD owns it; the older
            # project_manager_name is still read for rows the migration has
            # not reached. `unit_head_name` is kept as the key the board UI
            # already renders, so the label survives while what fills it
            # changes -- a project no longer belongs to a unit.
            "unit_head_name": p.get("tsd_name") or p.get("project_manager_name"),
            "tsd_name": p.get("tsd_name"),
            "project_manager_name": p.get("project_manager_name"),
            # Who may shape this board, sent so the UI reaches the same verdict
            # the server does.
            #
            # `tsd_id` and `architect_id` are the current fields and were
            # missing here: the server let a project's TSD add a column while
            # the interface, unable to see who the TSD was, showed them a
            # read-only board. The legacy `project_manager_*` keys are still
            # sent for rows the migration has not rewritten.
            "created_by": p.get("created_by"),
            "tsd_id": p.get("tsd_id"),
            "architect_id": p.get("architect_id"),
            "collaborator_ids": p.get("collaborator_ids") or [],
            "project_manager_id": p.get("project_manager_id"),
            "project_manager_ids": p.get("project_manager_ids") or [],
        })
    return out


# A card is not "done" by a flag; it is done because somebody dragged it into
# the Done column, which is how the board has always worked. So the only place
# that fact lives is the title of the board the card currently sits in.
DONE_BOARD_TITLES = {"done"}


@router.get("/cards/mine")
async def my_cards(request: Request, limit: int = 8):
    """The caller's own assigned work, with the counts a dashboard needs.

    The dashboard used to be a grid of links to business units -- navigation
    dressed as content, and no answer at all to "what do I owe anyone today".
    This is that answer for everybody who is not looking at the portfolio:
    what is assigned to me, what is late, what lands this week.

    Scoped twice on purpose. Assignment is the first filter, but a card also
    belongs to a project, and somebody taken off a project should stop seeing
    its work even if an old assignment was never cleared -- so the project
    scope filter is applied as well.
    """
    user = await _current(request)
    uid = user.get("user_id")

    cards = await db.task_cards.find(
        {"assignees.user_id": uid}, {"_id": 0}
    ).to_list(2000)
    if not cards:
        return {"cards": [], "open": 0, "overdue": 0, "due_this_week": 0, "done": 0}

    # Which of those projects this person is still entitled to see.
    scope = permissions.project_scope_filter(user)
    if scope:
        allowed = {
            p["id"]
            for p in await db.projects.find(scope, {"_id": 0, "id": 1}).to_list(1000)
        }
        cards = [c for c in cards if not c.get("project_id") or c.get("project_id") in allowed]

    boards = {
        b["board_id"]: b
        for b in await db.task_boards.find(
            {"board_id": {"$in": list({c.get("board_id") for c in cards})}},
            {"_id": 0, "board_id": 1, "title": 1, "project_id": 1, "project_name": 1},
        ).to_list(2000)
    }

    now = datetime.now(timezone.utc)
    week_out = now.timestamp() + 7 * 86400

    open_rows, done_count, overdue, due_week = [], 0, 0, 0
    for card in cards:
        board = boards.get(card.get("board_id")) or {}
        if (board.get("title") or "").strip().lower() in DONE_BOARD_TITLES:
            done_count += 1
            continue

        due = _due_timestamp(card.get("due_date"))
        if due is not None:
            if due < now.timestamp():
                overdue += 1
            elif due <= week_out:
                due_week += 1

        open_rows.append({
            "card_id": card.get("card_id"),
            "title": card.get("title"),
            "priority": card.get("priority") or "medium",
            "due_date": card.get("due_date"),
            "board_title": board.get("title") or "",
            "project_id": card.get("project_id") or board.get("project_id"),
            "project_name": board.get("project_name") or "",
            "_due": due,
        })

    # Soonest first, and anything without a date after everything that has one:
    # a card nobody dated is not more urgent than one that is late today.
    open_rows.sort(key=lambda r: (r["_due"] is None, r["_due"] or 0))
    for row in open_rows:
        row.pop("_due", None)

    return {
        "cards": open_rows[: max(0, limit)],
        "open": len(open_rows),
        "overdue": overdue,
        "due_this_week": due_week,
        "done": done_count,
    }


def _due_timestamp(value) -> Optional[float]:
    """Seconds since the epoch for a stored due date, or None.

    Due dates arrive from the picker as ISO datetimes and from milestones as
    plain dates, and older rows can carry a trailing "Z" that
    `fromisoformat` refused before 3.11. A date with no time is treated as the
    end of that day, so a task due today is not already late this morning.
    """
    if not value or not isinstance(value, str):
        return None
    raw = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if len(raw) <= 10:
        parsed = parsed.replace(hour=23, minute=59, second=59)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


# ---------------------------------------------------------------------------
# Sharing — one Google-Docs-style link per project, managed by the
# coordinator. Stored in its own `task_shares` collection (one doc per
# project_id) rather than on the Flow project itself, so the sharing
# feature stays fully decoupled from the Flow pipeline and easy to extend
# later (password, expiry, audit log, ...) without touching `projects`.
# ---------------------------------------------------------------------------
def _new_share_token() -> str:
    return secrets.token_urlsafe(32)


@router.get("/projects/{project_id}/share")
async def get_share(project_id: str, request: Request):
    user, _ = await _require_board_manager(request, project_id)
    share = await db.task_shares.find_one({"project_id": project_id}, {"_id": 0})
    if not share:
        return {"exists": False}
    return {"exists": True, **share}


@router.post("/projects/{project_id}/share")
async def generate_share(project_id: str, request: Request):
    """Create this project's share link. Idempotent — if one already exists
    it's returned as-is rather than rotated (use /regenerate for that)."""
    user, _ = await _require_board_manager(request, project_id)
    existing = await db.task_shares.find_one({"project_id": project_id}, {"_id": 0})
    if existing:
        return {"exists": True, **existing}

    proj = await db.projects.find_one({"id": project_id}, {"_id": 0, "name": 1})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    share = {
        "project_id": project_id,
        "share_token": _new_share_token(),
        "permission": "view",
        "enabled": True,
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.task_shares.insert_one(share)
    return {"exists": True, **serialize(share)}


@router.post("/projects/{project_id}/share/regenerate")
async def regenerate_share(project_id: str, request: Request):
    """Rotate the token. The old token stops resolving immediately since only
    the current `share_token` value is ever looked up."""
    user, _ = await _require_board_manager(request, project_id)
    existing = await db.task_shares.find_one({"project_id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="No share link exists for this project yet")

    new_token = _new_share_token()
    await db.task_shares.update_one(
        {"project_id": project_id},
        {"$set": {"share_token": new_token, "updated_at": now_iso()}},
    )
    share = await db.task_shares.find_one({"project_id": project_id}, {"_id": 0})
    return {"exists": True, **share}


@router.patch("/projects/{project_id}/share")
async def update_share(project_id: str, data: ShareUpdate, request: Request):
    user, _ = await _require_board_manager(request, project_id)
    existing = await db.task_shares.find_one({"project_id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="No share link exists for this project yet")

    update = {}
    if data.permission is not None:
        if data.permission not in ("view", "edit"):
            raise HTTPException(status_code=400, detail="permission must be 'view' or 'edit'")
        update["permission"] = data.permission
    if data.enabled is not None:
        update["enabled"] = data.enabled

    if update:
        update["updated_at"] = now_iso()
        await db.task_shares.update_one({"project_id": project_id}, {"$set": update})
    share = await db.task_shares.find_one({"project_id": project_id}, {"_id": 0})
    return {"exists": True, **share}


# ---------------------------------------------------------------------------
# Team Members — candidate assignees (incl. the project's own members)
# ---------------------------------------------------------------------------
@router.get("/team-members")
async def list_team_members(request: Request, project_id: Optional[str] = None):
    """Return candidate assignees: all active members, plus — if a project is
    given — that project's delivery owner and assigned engineer (in case they
    aren't in the default member roles)."""
    user = await _current(request)

    members = await db.users.find(
        {"role": {"$in": ["team_member", "mini_admin", "super_admin"]}, "status": "active"},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "role": 1},
    ).to_list(length=1000)

    by_id = {m["user_id"]: m for m in members}

    # Fold in project-specific people if requested
    if project_id:
        await _assert_project_access(user, project_id)
        proj = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if proj:
            for uid, extra in (
                (proj.get("delivery_owner_id"), {"role": "delivery_owner"}),
                (proj.get("assigned_engineer_id"), {"role": "engineer"}),
                (proj.get("created_by"), {"role": "creator"}),
            ):
                if uid and uid not in by_id:
                    u = await db.users.find_one(
                        {"user_id": uid},
                        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "role": 1},
                    )
                    if u:
                        by_id[uid] = {**u, **extra}

    return list(by_id.values())


# ---------------------------------------------------------------------------
# Labels — persistent, reusable across all tasks/boards (coordinator-gated writes)
# ---------------------------------------------------------------------------
@router.get("/labels")
async def list_labels(request: Request):
    await _current(request)
    labels = await db.task_labels.find({}, {"_id": 0}).sort("name", 1).to_list(length=1000)
    return labels


@router.post("/labels")
async def create_label(data: LabelCreate, request: Request):
    await _require_coordinator(request)
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Label name cannot be empty")

    existing = await db.task_labels.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=409, detail="Label with this name already exists")

    label = {
        "label_id": f"label_{uuid.uuid4().hex[:12]}",
        "name": name,
        "color": data.color if data.color else await _next_label_color(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.task_labels.insert_one(label)
    return serialize(label)


@router.patch("/labels/{label_id}")
async def update_label(label_id: str, data: LabelUpdate, request: Request):
    await _require_coordinator(request)
    existing = await db.task_labels.find_one({"label_id": label_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Label not found")

    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "name" in update and not update["name"].strip():
        raise HTTPException(status_code=400, detail="Label name cannot be empty")

    if "name" in update and update["name"].lower() != existing["name"].lower():
        conflict = await db.task_labels.find_one(
            {"label_id": {"$ne": label_id}, "name": {"$regex": f"^{re.escape(update['name'])}$", "$options": "i"}}
        )
        if conflict:
            raise HTTPException(status_code=409, detail="Another label with this name already exists")

    update["updated_at"] = now_iso()
    await db.task_labels.update_one({"label_id": label_id}, {"$set": update})
    label = await db.task_labels.find_one({"label_id": label_id}, {"_id": 0})
    return serialize(label)


@router.delete("/labels/{label_id}")
async def delete_label(label_id: str, request: Request):
    await _require_coordinator(request)
    res = await db.task_labels.delete_one({"label_id": label_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Label not found")

    # Cascade: remove this label from any tasks that use it (rich objects)
    await db.task_cards.update_many(
        {"labels.label_id": label_id},
        {"$pull": {"labels": {"label_id": label_id}}},
    )
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Boards — always scoped to a project
# ---------------------------------------------------------------------------
@router.get("/boards")
async def list_boards(request: Request, project_id: str):
    """Return the boards for ONE project (cards embedded), sorted by position."""
    user = await _current(request)
    await _assert_project_access(user, project_id)
    boards = []
    async for b in db.task_boards.find({"project_id": project_id}, {"_id": 0}).sort("position", 1):
        b = dict(b)
        cards = (
            await db.task_cards.find({"board_id": b["board_id"]}, {"_id": 0})
            .sort("position", 1)
            .to_list(length=10000)
        )
        b["cards"] = cards
        boards.append(b)

    # How many files each card carries, and the first image among them, so the
    # board can show a card has something attached without every board load
    # dragging the files themselves through the query.
    card_ids = [c["card_id"] for b in boards for c in b["cards"]]
    if card_ids:
        summary: dict = {}
        async for a in db.task_attachments.find(
            {"card_id": {"$in": card_ids}},
            {"_id": 0, "card_id": 1, "attachment_id": 1, "content_type": 1, "uploaded_at": 1},
        ).sort("uploaded_at", 1):
            entry = summary.setdefault(a["card_id"], {"count": 0, "preview": None})
            entry["count"] += 1
            if entry["preview"] is None and (a.get("content_type") or "").startswith("image/"):
                entry["preview"] = a["attachment_id"]
        for b in boards:
            for c in b["cards"]:
                s = summary.get(c["card_id"])
                c["attachment_count"] = s["count"] if s else 0
                c["preview_attachment_id"] = s["preview"] if s else None
    return boards


async def seed_default_boards(project_id: str, project_name: str, owner_id: str, owner_name: str) -> None:
    """Give a project its board the moment it reaches Engineering and Build.

    CROWTHER_MIGRATION_PLAN.md §10.3: "The board is created when the project
    enters stage 13, seeded with the default columns plus Design QA. It is
    not created earlier, because an empty board on a project at stage 4 is
    noise." That was the plan; nothing ever called it, so every project
    reaching stage 13 got no board at all until someone manually added all
    eight columns, in order, spelling each title exactly right for the
    `board_build_clear` / `board_qa_clear` gates to recognise them.

    Idempotent: does nothing if this project already has any board, so
    moving back into stage 13 later never creates a duplicate set.
    """
    if await db.task_boards.count_documents({"project_id": project_id}, limit=1):
        return
    now = now_iso()
    for position, title in enumerate(DEFAULT_BOARD_TITLES):
        await db.task_boards.insert_one({
            "board_id": f"board_{uuid.uuid4().hex[:12]}",
            "project_id": project_id,
            "project_name": project_name,
            "title": title,
            "owner_id": owner_id,
            "owner_name": owner_name,
            "position": position,
            "created_at": now,
            "updated_at": now,
        })

    # Milestones agreed at stage 12 become cards the moment the board exists.
    # Without this the board opens empty on a project that already has a
    # delivery plan, and somebody retypes what was agreed a stage ago.
    await seed_milestone_cards(project_id, owner_id, owner_name)


async def seed_milestone_cards(project_id: str, owner_id: str, owner_name: str) -> int:
    """Put a card on the backlog for every milestone that has not got one.

    Idempotent by `milestone_id` on the card, so calling it again after a new
    milestone is added tops the board up rather than duplicating what is there.
    """
    backlog = await db.task_boards.find_one(
        {"project_id": project_id, "title": "Backlog"}, {"_id": 0, "board_id": 1}
    )
    if not backlog:
        return 0

    milestones = await db.milestones.find(
        {"project_id": project_id},
        {"_id": 0, "milestone_id": 1, "milestone_name": 1, "deliverable": 1, "target_date": 1},
    ).sort("target_date", 1).to_list(200)
    if not milestones:
        return 0

    existing = set(await db.task_cards.distinct(
        "milestone_id", {"project_id": project_id, "milestone_id": {"$ne": None}}
    ))
    position = await db.task_cards.count_documents({"board_id": backlog["board_id"]})
    created = 0

    for milestone in milestones:
        mid = milestone.get("milestone_id")
        if not mid or mid in existing:
            continue
        await db.task_cards.insert_one({
            "card_id": f"card_{uuid.uuid4().hex[:12]}",
            "board_id": backlog["board_id"],
            "project_id": project_id,
            "owner_id": owner_id,
            "title": milestone.get("milestone_name") or "Milestone",
            "description": milestone.get("deliverable") or "",
            "priority": "high",
            "labels": [],
            "assignees": [],
            "due_date": milestone.get("target_date"),
            # What ties the card back to the milestone it delivers, and what
            # keeps this idempotent.
            "milestone_id": mid,
            "position": position,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
        position += 1
        created += 1
    return created


@router.post("/boards")
async def create_board(data: BoardCreate, request: Request):
    user, _ = await _require_board_manager(request, data.project_id)
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Board title cannot be empty")

    # Prevent duplicate board titles within the same project (case-insensitive)
    existing = await db.task_boards.find_one(
        {"project_id": data.project_id, "title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(status_code=409, detail="A board with this title already exists in this project")

    # Verify the project exists (reuse Flow's projects collection)
    proj = await db.projects.find_one({"id": data.project_id}, {"_id": 0, "name": 1})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    board = {
        "board_id": f"board_{uuid.uuid4().hex[:12]}",
        "project_id": data.project_id,
        "project_name": proj.get("name"),
        "title": title,
        "owner_id": user.get("user_id"),
        "owner_name": user.get("name"),
        "position": await _next_board_position(data.project_id),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.task_boards.insert_one(board)
    board["cards"] = []
    return serialize(board)


@router.patch("/boards/{board_id}")
async def update_board(board_id: str, data: BoardUpdate, request: Request):
    existing = await db.task_boards.find_one({"board_id": board_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Board not found")
    await _require_board_manager(request, existing.get("project_id"))

    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "title" in update:
        title = update["title"].strip()
        if not title:
            raise HTTPException(status_code=400, detail="Board title cannot be empty")
        # dedupe within the project
        dup = await db.task_boards.find_one(
            {"project_id": existing["project_id"], "board_id": {"$ne": board_id},
             "title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}},
            {"_id": 0},
        )
        if dup:
            raise HTTPException(status_code=409, detail="A board with this title already exists in this project")
        update["title"] = title
    update["updated_at"] = now_iso()
    await db.task_boards.update_one({"board_id": board_id}, {"$set": update})
    board = await db.task_boards.find_one({"board_id": board_id}, {"_id": 0})
    return serialize(board)


@router.delete("/boards/{board_id}")
async def delete_board(board_id: str, request: Request):
    existing = await db.task_boards.find_one({"board_id": board_id}, {"_id": 0, "project_id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Board not found")
    await _require_board_manager(request, existing.get("project_id"))
    res = await db.task_boards.delete_one({"board_id": board_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Board not found")
    # cascade: delete the board's cards too
    await db.task_cards.delete_many({"board_id": board_id})
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Cards
# ---------------------------------------------------------------------------
@router.post("/boards/{board_id}/cards")
async def create_card(board_id: str, data: CardCreate, request: Request):
    board = await db.task_boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    user, _ = await _require_board_user(request, board.get("project_id"))

    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Card title cannot be empty")

    card = {
        "card_id": f"card_{uuid.uuid4().hex[:12]}",
        "board_id": board_id,
        "project_id": board.get("project_id"),  # denormalized for fast per-project counts
        "owner_id": user.get("user_id"),
        "title": title,
        "description": data.description,
        "priority": data.priority if data.priority in ("low", "medium", "high", "urgent") else "medium",
        "labels": [l.dict() for l in data.labels],
        "assignees": [a.dict() for a in data.assignees],
        "due_date": data.due_date,
        "position": await _next_card_position(board_id),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.task_cards.insert_one(card)
    await _announce_assignees(card, [], card["assignees"], board, user)
    return serialize(card)


@router.patch("/cards/{card_id}")
async def update_card(card_id: str, data: CardUpdate, request: Request):
    existing = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    user, _ = await _require_board_user(request, existing.get("project_id"))

    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "title" in update and not update["title"].strip():
        raise HTTPException(status_code=400, detail="Card title cannot be empty")
    if "priority" in update and update["priority"] not in ("low", "medium", "high", "urgent"):
        update["priority"] = "medium"
    # Convert nested label/assignee model objects to plain dicts for Mongo
    if "labels" in update:
        update["labels"] = [l if isinstance(l, dict) else l.dict() for l in update["labels"]]
    if "assignees" in update:
        update["assignees"] = [a if isinstance(a, dict) else a.dict() for a in update["assignees"]]
    update["updated_at"] = now_iso()
    await db.task_cards.update_one({"card_id": card_id}, {"$set": update})
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0})

    # Only whoever was newly added is told; re-saving a card with the same
    # people on it announces nothing.
    if "assignees" in update:
        board = await db.task_boards.find_one({"board_id": existing["board_id"]}, {"_id": 0})
        if board:
            await _announce_assignees(card, existing.get("assignees") or [],
                                      update["assignees"], board, user)

    return serialize(card)


@router.delete("/cards/{card_id}")
async def delete_card(card_id: str, request: Request):
    existing = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0, "project_id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    await _require_board_user(request, existing.get("project_id"))
    await db.task_cards.delete_one({"card_id": card_id})
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Reorder — persist a full board/card layout after a drag (coordinator only)
# ---------------------------------------------------------------------------
@router.post("/reorder")
async def reorder(data: ReorderRequest, request: Request):
    user = await _current(request)
    now = now_iso()

    # Every board named in the payload -- both those being reordered and those
    # cards are being dropped into -- must be one this caller may touch, or a
    # single request could rearrange another team's board. Moving a card is
    # part of working the board, so pod may do it.
    for board_id in {*data.board_order, *(i.board_id for i in data.cards)}:
        b = await db.task_boards.find_one({"board_id": board_id}, {"_id": 0, "project_id": 1})
        if not b:
            raise HTTPException(status_code=404, detail="Board not found")
        await _require_board_user(request, b.get("project_id"))

    # 1. Reorder boards
    for index, board_id in enumerate(data.board_order):
        await db.task_boards.update_one(
            {"board_id": board_id}, {"$set": {"position": index, "updated_at": now}}
        )

    # 2. Reorder/move cards (keep project_id in sync with the destination board)
    board_project = {}
    for item in data.cards:
        if item.board_id not in board_project:
            b = await db.task_boards.find_one({"board_id": item.board_id}, {"_id": 0, "project_id": 1})
            board_project[item.board_id] = b.get("project_id") if b else None
        await db.task_cards.update_one(
            {"card_id": item.card_id},
            {"$set": {
                "board_id": item.board_id,
                "project_id": board_project[item.board_id],
                "position": item.position,
                "updated_at": now,
            }},
        )

    return {"ok": True, "boards": len(data.board_order), "cards": len(data.cards)}


# ---------------------------------------------------------------------------
# Public sharing — no auth. A share link's token is the only thing exposed
# in the URL; the project's own id is never returned to the client, and
# every mutation below re-validates that the board/card it touches actually
# belongs to the token's project before writing anything.
# ---------------------------------------------------------------------------
async def _get_enabled_share(share_token: str) -> dict:
    share = await db.task_shares.find_one(
        {"share_token": share_token, "enabled": True}, {"_id": 0}
    )
    if not share:
        raise HTTPException(status_code=404, detail="This link is unavailable or has been disabled")
    return share


async def _get_editable_share(share_token: str) -> dict:
    share = await _get_enabled_share(share_token)
    if share.get("permission") != "edit":
        raise HTTPException(status_code=403, detail="This link is view-only")
    return share


@router.get("/shared/{share_token}")
async def get_shared_board(share_token: str):
    share = await _get_enabled_share(share_token)
    project_id = share["project_id"]

    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="This link is unavailable or has been disabled")

    boards = []
    async for b in db.task_boards.find({"project_id": project_id}, {"_id": 0}).sort("position", 1):
        b = dict(b)
        b.pop("project_id", None)
        cards = await db.task_cards.find({"board_id": b["board_id"]}, {"_id": 0}).sort("position", 1).to_list(length=10000)
        for c in cards:
            c.pop("project_id", None)
        b["cards"] = cards
        boards.append(b)

    stage = project.get("stage") or 1
    is_lost = project.get("status") == "lost"
    return {
        "project_name": project.get("name"),
        "permission": share.get("permission", "view"),
        "progress": 0 if is_lost else min(100, round(stage / 10 * 100)),
        "boards": boards,
    }


@router.post("/shared/{share_token}/boards/{board_id}/cards")
async def create_shared_card(share_token: str, board_id: str, data: SharedCardCreate):
    share = await _get_editable_share(share_token)
    board = await db.task_boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board or board.get("project_id") != share["project_id"]:
        raise HTTPException(status_code=404, detail="Board not found")

    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Card title cannot be empty")

    card = {
        "card_id": f"card_{uuid.uuid4().hex[:12]}",
        "board_id": board_id,
        "project_id": share["project_id"],
        "owner_id": None,
        "owner_name": "Shared link",
        "created_via_share": True,
        "title": title,
        "description": data.description,
        "priority": data.priority if data.priority in ("low", "medium", "high", "urgent") else "medium",
        "labels": [l.dict() for l in data.labels],
        "assignees": [],
        "due_date": data.due_date,
        "position": await _next_card_position(board_id),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.task_cards.insert_one(card)
    card.pop("project_id", None)
    return serialize(card)


@router.patch("/shared/{share_token}/cards/{card_id}")
async def update_shared_card(share_token: str, card_id: str, data: SharedCardUpdate):
    share = await _get_editable_share(share_token)
    existing = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0})
    if not existing or existing.get("project_id") != share["project_id"]:
        raise HTTPException(status_code=404, detail="Card not found")

    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "title" in update and not update["title"].strip():
        raise HTTPException(status_code=400, detail="Card title cannot be empty")
    if "priority" in update and update["priority"] not in ("low", "medium", "high", "urgent"):
        update["priority"] = "medium"
    if "labels" in update:
        update["labels"] = [l if isinstance(l, dict) else l.dict() for l in update["labels"]]
    update["updated_at"] = now_iso()
    await db.task_cards.update_one({"card_id": card_id}, {"$set": update})
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0})
    card.pop("project_id", None)
    return serialize(card)


@router.post("/shared/{share_token}/reorder")
async def reorder_shared(share_token: str, data: SharedReorderRequest):
    """Move/reorder cards within the shared project only — board reordering
    and board management are never exposed on a share link."""
    share = await _get_editable_share(share_token)
    project_id = share["project_id"]

    valid_board_ids = {
        b["board_id"]
        async for b in db.task_boards.find({"project_id": project_id}, {"_id": 0, "board_id": 1})
    }

    now = now_iso()
    for item in data.cards:
        if item.board_id not in valid_board_ids:
            raise HTTPException(status_code=400, detail="Invalid board for this project")
        existing = await db.task_cards.find_one({"card_id": item.card_id}, {"_id": 0, "project_id": 1})
        if not existing or existing.get("project_id") != project_id:
            raise HTTPException(status_code=404, detail="Card not found")
        await db.task_cards.update_one(
            {"card_id": item.card_id},
            {"$set": {"board_id": item.board_id, "position": item.position, "updated_at": now}},
        )

    return {"ok": True, "cards": len(data.cards)}


# ---------------------------------------------------------------------------
# Card comments
# ---------------------------------------------------------------------------
# Anybody on the project may comment, which is the point: the person doing a
# piece of work is usually not the person who wrote the card, and until now
# they had nowhere to say "blocked on the staging key" except a chat app the
# project cannot see. Kept in their own collection for the same reason as
# attachments -- a board load reads every card and should not drag a thread
# of discussion along with each one.
COMMENT_FIELDS = {
    "_id": 0, "comment_id": 1, "card_id": 1, "body": 1, "created_at": 1,
    "edited_at": 1, "author_id": 1, "author_name": 1,
}


class CommentIn(BaseModel):
    body: str


@router.get("/cards/{card_id}/comments")
async def list_comments(card_id: str, request: Request):
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0, "project_id": 1})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await _require_board_user(request, card.get("project_id"))
    return await db.task_comments.find(
        {"card_id": card_id}, COMMENT_FIELDS
    ).sort("created_at", 1).to_list(500)


@router.post("/cards/{card_id}/comments")
async def add_comment(card_id: str, data: CommentIn, request: Request):
    """Comment on a card. Anybody working on the project."""
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0, "project_id": 1, "title": 1})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    user, _ = await _require_board_user(request, card.get("project_id"))

    body = (data.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="A comment needs something in it")

    doc = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:12]}",
        "card_id": card_id,
        "project_id": card.get("project_id"),
        "body": body,
        "author_id": user.get("user_id"),
        "author_name": user.get("name"),
        "created_at": now_iso(),
        "edited_at": None,
    }
    await db.task_comments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/comments/{comment_id}")
async def edit_comment(comment_id: str, data: CommentIn, request: Request):
    """Edit your own comment. Only your own -- correcting somebody else's
    words in place would make the thread unreadable as a record."""
    comment = await db.task_comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    user, _ = await _require_board_user(request, comment.get("project_id"))
    if comment.get("author_id") != user.get("user_id") and not permissions.is_admin(user):
        raise HTTPException(status_code=403, detail="You can only edit your own comment")

    body = (data.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="A comment needs something in it")
    await db.task_comments.update_one(
        {"comment_id": comment_id},
        {"$set": {"body": body, "edited_at": now_iso()}},
    )
    return await db.task_comments.find_one({"comment_id": comment_id}, COMMENT_FIELDS)


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, request: Request):
    comment = await db.task_comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    user, project = await _require_board_user(request, comment.get("project_id"))
    # Your own, or somebody who runs the project clearing up.
    if (comment.get("author_id") != user.get("user_id")
            and not permissions.can_manage_boards(user, project)):
        raise HTTPException(status_code=403, detail="You can only delete your own comment")
    await db.task_comments.delete_one({"comment_id": comment_id})
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------
# A card may carry as many attachments as the work needs; nothing limits the
# count. Each individual file is capped, because one enormous upload blocks the
# request for everybody else and the database this runs on answers a large
# write with a timeout rather than storing it.
MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

# Kept in their own collection rather than on the card. Cards are read on every
# board load -- a card carrying its files inline would drag megabytes of binary
# through a query that only wanted a title.
ATTACHMENT_FIELDS = {
    "_id": 0, "attachment_id": 1, "card_id": 1, "filename": 1, "content_type": 1,
    "size": 1, "uploaded_at": 1, "uploaded_by_id": 1, "uploaded_by_name": 1,
}


def _is_viewable(content_type: str) -> bool:
    """Whether a browser can show this in place rather than download it."""
    ct = (content_type or "").lower()
    return ct.startswith("image/") or ct == "application/pdf"


# ---------------------------------------------------------------------------
# Thumbnails
# ---------------------------------------------------------------------------
# A shared pool of images any task may take a cover from. As many as anyone
# cares to upload -- nothing limits the size of the pool.
#
# A thumbnail belongs to at most one task. That is held by a unique index on
# `claimed_by` rather than by checking first and writing after: two
# people opening the picker at the same moment see the same free image, and a
# check-then-write would let them both take it. The index makes the second
# write fail, and the loser is told to pick again.
THUMBNAIL_FIELDS = {
    "_id": 0, "thumbnail_id": 1, "filename": 1, "content_type": 1, "size": 1,
    "uploaded_at": 1, "uploaded_by_name": 1, "claimed_by": 1,
}


async def ensure_thumbnail_indexes() -> None:
    """Index the pool, and make single ownership a rule the database keeps."""
    try:
        await db.task_thumbnails.create_index(
            [("thumbnail_id", 1)], unique=True, background=True, name="thumbnail_id"
        )
        # Partial, so the many unclaimed rows (all holding null) do not collide
        # with each other -- only actual claims are constrained.
        await db.task_thumbnails.create_index(
            [("claimed_by", 1)],
            unique=True,
            background=True,
            name="thumbnail_one_owner",
            partialFilterExpression={"claimed_by": {"$type": "string"}},
        )
    except Exception as e:
        logger.warning("Thumbnail indexes skipped: %s", str(e)[:160])


@router.get("/thumbnails")
async def list_thumbnails(request: Request, card_id: Optional[str] = None, owner_id: Optional[str] = None):
    """The images available to choose from.

    Free ones, plus whichever this card already holds so its own cover still
    shows as the current choice rather than vanishing from its own picker.
    """
    await _current(request)

    # `owner_id` is the general form -- a project or a card. `card_id` is kept
    # because the task picker already calls with it.
    mine = owner_id or card_id
    query: dict = {"$or": [{"claimed_by": None}, {"claimed_by": {"$exists": False}}]}
    if mine:
        query = {"$or": query["$or"] + [{"claimed_by": mine}]}

    rows = await db.task_thumbnails.find(query, THUMBNAIL_FIELDS).sort("uploaded_at", -1).to_list(1000)
    for r in rows:
        r["is_current"] = bool(mine) and r.get("claimed_by") == mine
    return rows


@router.post("/thumbnails")
async def upload_thumbnail(request: Request, file: UploadFile = File(...)):
    """Add an image to the pool. Unclaimed until a task takes it."""
    user = await _current(request)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="That file is empty")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="A thumbnail has to be an image")
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"{file.filename} is {len(content) / 1024 / 1024:.1f} MB. "
                   f"The limit per image is {MAX_ATTACHMENT_BYTES // 1024 // 1024} MB.",
        )

    doc = {
        "thumbnail_id": f"thumb_{uuid.uuid4().hex[:12]}",
        "filename": (file.filename or "image").replace('"', "")[:200],
        "content_type": file.content_type,
        "size": len(content),
        "content": content,
        "uploaded_at": now_iso(),
        "uploaded_by_id": user.get("user_id"),
        "uploaded_by_name": user.get("name"),
        "claimed_by": None,
    }
    await db.task_thumbnails.insert_one(doc)
    return {k: doc[k] for k in doc if k in THUMBNAIL_FIELDS and k != "_id"}


@router.delete("/thumbnails/{thumbnail_id}")
async def delete_thumbnail(thumbnail_id: str, request: Request):
    """Remove an image from the pool for good.

    Claiming and releasing were the only operations that existed -- a picture
    nobody wanted was still stuck in the shared pool forever, showing up in
    every other project and task's picker with no way to get rid of it. This
    is the missing third option. Whoever uploaded it may remove it; so may an
    administrator, since the pool is shared and a mistaken upload is everyone's
    problem until somebody with reach can clear it.

    A claimed thumbnail is released first -- deleting out from under whichever
    card or project currently shows it would leave a `thumbnail_id` pointing
    at nothing.
    """
    user = await _current(request)
    doc = await db.task_thumbnails.find_one({"thumbnail_id": thumbnail_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    permissions.require(
        permissions.is_admin(user) or doc.get("uploaded_by_id") == user.get("user_id"),
        "Only the person who added this picture, or an administrator, can remove it",
    )

    claimed_by = doc.get("claimed_by")
    if claimed_by:
        unset = {"thumbnail_id": ""}
        if claimed_by.startswith("card_"):
            await db.task_cards.update_many({"card_id": claimed_by}, {"$unset": unset})
        else:
            await db.projects.update_many({"id": claimed_by}, {"$unset": unset})

    await db.task_thumbnails.delete_one({"thumbnail_id": thumbnail_id})
    return {"deleted": True}


@router.get("/thumbnails/{thumbnail_id}/image")
async def get_thumbnail_image(thumbnail_id: str, request: Request):
    await _current(request)
    doc = await db.task_thumbnails.find_one({"thumbnail_id": thumbnail_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return Response(
        content=doc["content"],
        media_type=doc.get("content_type") or "image/png",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.post("/cards/{card_id}/thumbnail")
async def claim_thumbnail(card_id: str, data: dict, request: Request):
    """Give a card a cover, taking that image out of the pool for everyone."""
    thumbnail_id = (data or {}).get("thumbnail_id")
    if not thumbnail_id:
        raise HTTPException(status_code=400, detail="thumbnail_id is required")

    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0, "project_id": 1})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await _require_board_user(request, card.get("project_id"))

    claimed = await claim_thumbnail_for(card_id, thumbnail_id)
    if not claimed:
        raise HTTPException(
            status_code=409,
            detail="That image has already been used on another task. Choose a different one.",
        )

    await db.task_cards.update_one(
        {"card_id": card_id},
        {"$set": {"thumbnail_id": thumbnail_id, "updated_at": now_iso()}},
    )
    return claimed


@router.delete("/cards/{card_id}/thumbnail")
async def release_thumbnail(card_id: str, request: Request):
    """Take the cover off a card and return the image to the pool."""
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0, "project_id": 1})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await _require_board_user(request, card.get("project_id"))

    await db.task_thumbnails.update_many(
        {"claimed_by": card_id}, {"$set": {"claimed_by": None}}
    )
    await db.task_cards.update_one(
        {"card_id": card_id},
        {"$set": {"updated_at": now_iso()}, "$unset": {"thumbnail_id": ""}},
    )
    return {"ok": True}


async def claim_thumbnail_for(owner_id: str, thumbnail_id: str) -> Optional[dict]:
    """Give `owner_id` a picture, taking it from whatever held it before.

    Shared by tasks and projects, and by project creation, so the rule that a
    picture belongs to one thing is written once. Returns None when the picture
    was already taken -- an ordinary outcome when two people choose at the same
    moment, not an error in the caller.
    """
    await db.task_thumbnails.update_many(
        {"claimed_by": owner_id}, {"$set": {"claimed_by": None}}
    )
    return await db.task_thumbnails.find_one_and_update(
        {"thumbnail_id": thumbnail_id,
         "$or": [{"claimed_by": None}, {"claimed_by": {"$exists": False}}]},
        {"$set": {"claimed_by": owner_id, "claimed_at": now_iso()}},
        projection=THUMBNAIL_FIELDS,
        return_document=True,
    )


@router.post("/projects/{project_id}/thumbnail")
async def claim_project_thumbnail(project_id: str, data: dict, request: Request):
    """Give a project its picture."""
    thumbnail_id = (data or {}).get("thumbnail_id")
    if not thumbnail_id:
        raise HTTPException(status_code=400, detail="thumbnail_id is required")

    user = await _current(request)
    await _assert_project_access(user, project_id)

    claimed = await claim_thumbnail_for(project_id, thumbnail_id)
    if not claimed:
        raise HTTPException(
            status_code=409,
            detail="That picture is already in use. Choose a different one.",
        )
    await db.projects.update_one(
        {"id": project_id}, {"$set": {"thumbnail_id": thumbnail_id, "updated_at": now_iso()}}
    )
    return claimed


@router.delete("/projects/{project_id}/thumbnail")
async def release_project_thumbnail(project_id: str, request: Request):
    """Take a project's picture off and return it to the library."""
    user = await _current(request)
    await _assert_project_access(user, project_id)

    await db.task_thumbnails.update_many(
        {"claimed_by": project_id}, {"$set": {"claimed_by": None}}
    )
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"updated_at": now_iso()}, "$unset": {"thumbnail_id": ""}},
    )
    return {"ok": True}


async def ensure_attachment_indexes() -> None:
    """Index the lookups attachments are read by.

    Every board load asks for the attachments of a page of cards at once, so
    without an index on card_id that query reads the whole collection --
    including the binary content of every file in it.
    """
    try:
        await db.task_attachments.create_index(
            [("card_id", 1), ("uploaded_at", 1)], background=True, name="attachment_by_card"
        )
        await db.task_attachments.create_index(
            [("attachment_id", 1)], background=True, unique=True, name="attachment_id"
        )
    except Exception as e:  # an existing index under another name is not a failure
        logger.warning("Attachment indexes skipped: %s", str(e)[:120])


@router.get("/cards/{card_id}/attachments")
async def list_attachments(card_id: str, request: Request):
    """What is attached to a card, without the file contents."""
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0, "project_id": 1})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await _require_board_user(request, card.get("project_id"))

    rows = await db.task_attachments.find(
        {"card_id": card_id}, ATTACHMENT_FIELDS
    ).sort("uploaded_at", 1).to_list(500)
    for r in rows:
        r["is_viewable"] = _is_viewable(r.get("content_type"))
    return rows


@router.post("/cards/{card_id}/attachments")
async def add_attachment(card_id: str, request: Request, file: UploadFile = File(...)):
    """Attach a file to a card.

    One file per call, and the page sends one call per file, so a person can
    select as many as they like and each is written on its own. Sending them
    together would mean the whole selection failing because one file in it was
    too large.
    """
    card = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0, "project_id": 1})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    user, _ = await _require_board_user(request, card.get("project_id"))

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="That file is empty")
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"{file.filename} is {len(content) / 1024 / 1024:.1f} MB. "
                   f"The limit per file is {MAX_ATTACHMENT_BYTES // 1024 // 1024} MB.",
        )

    doc = {
        "attachment_id": f"att_{uuid.uuid4().hex[:12]}",
        "card_id": card_id,
        "project_id": card.get("project_id"),
        "filename": (file.filename or "attachment").replace('"', "")[:200],
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content),
        "content": content,
        "uploaded_at": now_iso(),
        "uploaded_by_id": user.get("user_id"),
        "uploaded_by_name": user.get("name"),
    }
    await db.task_attachments.insert_one(doc)

    # The card's own timestamp moves, so the board shows it as recently touched.
    await db.task_cards.update_one({"card_id": card_id}, {"$set": {"updated_at": now_iso()}})

    # `_id` is a key of ATTACHMENT_FIELDS (set to 0 for the projection), and
    # insert_one puts one on the document, so filtering by that mapping alone
    # hands back a raw ObjectId and the response fails to serialise.
    stored = {k: doc[k] for k in doc if k in ATTACHMENT_FIELDS and k != "_id"}
    stored["is_viewable"] = _is_viewable(doc["content_type"])
    return stored


@router.get("/attachments/{attachment_id}")
async def get_attachment(attachment_id: str, request: Request, download: bool = False):
    """Serve one attachment, inline where a browser can show it."""
    doc = await db.task_attachments.find_one({"attachment_id": attachment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Attachment not found")
    await _require_board_user(request, doc.get("project_id"))

    disposition = "attachment" if download or not _is_viewable(doc.get("content_type")) else "inline"
    return Response(
        content=doc["content"],
        media_type=doc.get("content_type") or "application/octet-stream",
        headers={
            "Content-Disposition": f'{disposition}; filename="{doc.get("filename")}"',
            "Cache-Control": "private, max-age=300",
        },
    )


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(attachment_id: str, request: Request):
    """Remove an attachment.

    Whoever put it there, or anybody who shapes the board -- the same people
    who may delete the card it hangs on, so removing a file is never harder
    than removing the task that carries it.
    """
    doc = await db.task_attachments.find_one(
        {"attachment_id": attachment_id}, {"_id": 0, "content": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Attachment not found")
    user, perms = await _require_board_user(request, doc.get("project_id"))

    if doc.get("uploaded_by_id") != user.get("user_id"):
        await _require_board_manager(request, doc.get("project_id"))

    await db.task_attachments.delete_one({"attachment_id": attachment_id})
    await db.task_cards.update_one(
        {"card_id": doc.get("card_id")}, {"$set": {"updated_at": now_iso()}}
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------
async def _current(request: Request) -> dict:
    from server import get_current_user
    return await get_current_user(request)
