"""
Task Board router — Trello-like boards and cards, scoped per project.

A board is a Trello "list" (a column). A card is a task inside a board.
Every board and card belongs to exactly ONE project (project_id). Boards
and cards live in two collections so a card move never rewrites a whole
board document, and the project workspace stays a single round-trip.

Projects are NOT duplicated — this module reuses the existing `projects`
collection (the THCO Flow project pipeline). We only annotate those
projects with board/task counts for the Projects workspace grid.

Permissions: only a Project Coordinator (user with is_delivery_coordinator,
or a super_admin) can mutate boards/cards/labels. Reads are open to any
authenticated user. This matches the app's existing coordinator concept
used in flow.py (Stage 1→2 gate).

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
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re
import secrets

from services import permissions

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
# "QA Review" intentionally appears only once.
DEFAULT_BOARD_TITLES = [
    "UI/UX Tasks",
    "Dependencies",
    "Backlog",
    "Frontend Todo",
    "Backend Todo",
    "QA Review",
    "Ready For Merge",
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


class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    labels: Optional[List[LabelRef]] = None
    assignees: Optional[List[AssigneeRef]] = None
    due_date: Optional[str] = None


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
            detail="Only a project manager or an administrator can manage labels",
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


async def _project_or_404(project_id: Optional[str]) -> dict:
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _require_board_manager(request: Request, project_id: Optional[str]) -> tuple:
    """For changing a board's shape: the project's unit head, or an admin.

    Boards used to be gated on the delivery-coordinator flag alone, which no
    unit head carries -- so the person now responsible for a project could
    open it and then find its board read-only.
    """
    user = await _current(request)
    project = await _project_or_404(project_id)
    permissions.require(
        permissions.can_manage_boards(user, project),
        "Only this project's project manager or an administrator can change its boards",
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
# Projects — reuse the existing `projects` collection (THCO Flow), annotated
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

    # Unit heads, so each card can name who runs the unit its project sits in.
    unit_heads = {
        u["slug"]: u.get("head_name")
        async for u in db.units.find({}, {"_id": 0, "slug": 1, "head_name": 1})
    }

    # Stage label map (mirrors flow.py STAGES) for a human-readable status
    stage_labels = {
        1: "New Client", 2: "Coordinator Picked", 3: "Meeting Scheduled",
        4: "Package Building", 5: "Send Package", 6: "Proposal",
        7: "Exec Approval", 8: "Proposal Sent", 9: "In Build", 10: "Completed",
    }

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
            "stage_label": "Lost" if is_lost else stage_labels.get(stage, "Unknown"),
            "status": p.get("status"),
            "track": p.get("track"),
            # progress = how far along the 10-stage pipeline this project is
            "progress": 0 if is_lost else min(100, round(stage / 10 * 100)),
            # display "coordinator" = the project's delivery owner if assigned,
            # otherwise whoever created it
            "coordinator_name": p.get("delivery_owner_name") or p.get("created_by_name"),
            "coordinator_id": p.get("delivery_owner_id") or p.get("created_by"),
            "engineer_name": p.get("assigned_engineer_name"),
            "engineer_id": p.get("assigned_engineer_id"),
            "created_by_name": p.get("created_by_name"),
            "created_at": p.get("created_at"),
            "completed_at": p.get("completed_at"),
            "board_count": board_counts.get(pid, 0),
            "task_count": task_counts.get(pid, 0),
            # Projects that predate unit heads are demo data, and the board
            # should say so rather than presenting them as live work.
            "is_demo": bool(p.get("is_demo")),
            # The board UI decides from these whether this viewer shapes the
            # board, works inside it, or only reads it.
            "unit_slug": p.get("unit_slug"),
            "collaborator_ids": p.get("collaborator_ids") or [],
            # Who is on the project, and who runs the unit it belongs to.
            # Everybody on a project can see the rest of the team -- knowing
            # who you are working alongside is part of being on it.
            "collaborators": [
                {"user_id": c.get("user_id"), "name": c.get("name")}
                for c in (p.get("collaborators") or [])
            ],
            # This project's own manager if one is named, otherwise whoever
            # runs its unit. A project handed to somebody specific should say
            # so rather than crediting the unit's manager.
            "unit_head_name": p.get("project_manager_name") or unit_heads.get(p.get("unit_slug")),
            "project_manager_name": p.get("project_manager_name"),
            "project_manager_id": p.get("project_manager_id"),
        })
    return out


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
    return boards


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
    return serialize(card)


@router.patch("/cards/{card_id}")
async def update_card(card_id: str, data: CardUpdate, request: Request):
    existing = await db.task_cards.find_one({"card_id": card_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    await _require_board_user(request, existing.get("project_id"))

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
    # part of working the board, so collaborators may do it.
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
# Internal
# ---------------------------------------------------------------------------
async def _current(request: Request) -> dict:
    from server import get_current_user
    return await get_current_user(request)
