"""Migrate the THCO Flow pipeline to the Crowther OS delivery lifecycle.

What this does, in order:

  1. Projects   old stages 1..10 (and the 11/12 legacy range) become the new
                1..17 lifecycle. Sibling records from the split-track model are
                merged back into their build-track parent. Commercial state
                moves from being a stage to being a field.
  2. Users      the old boolean role flags become a single `function_role`.
  3. Backfill   every project gets the new lifecycle, workstream, health and
                closure fields with sensible defaults.

Safety
------
Runs in dry-run mode unless `--apply` is passed, and prints exactly what it
would change either way.

Every write is reversible from `crowther_migration_backup`, which is written
before anything is touched. A migration that consolidated two sources of the
manager grant once stripped every manager's rights across the firm, which is
why this one keeps the original documents rather than trusting itself.

Usage
-----
    ./venv/Scripts/python.exe scripts/migrate_to_crowther_os.py            # dry run
    ./venv/Scripts/python.exe scripts/migrate_to_crowther_os.py --apply
    ./venv/Scripts/python.exe scripts/migrate_to_crowther_os.py --rollback
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# The script lives in backend/scripts/ but imports backend/ modules.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from services.delivery_stages import (  # noqa: E402
    CLOSURE_CHECKLIST,
    FIRST_STAGE,
    LEGACY_STAGE_MAP,
    STAGES,
    stage_key,
    stage_phase,
)

load_dotenv(BACKEND_DIR / ".env")

BACKUP_COLLECTION = "crowther_migration_backup"

# The old flags, and what each becomes. `is_delivery_coordinator` has no
# successor on purpose: its job was choosing who runs a project, which is now
# stage 2 of the lifecycle rather than a standing privilege on a person.
FLAG_TO_FUNCTION = [
    ("is_executive_approver", "senior_partner"),
    ("is_delivery_owner", "tsd"),
    ("is_operations_owner", "people_ops"),
    ("is_engineer", "engineer"),
    ("is_relationship_owner", "commercial"),
    ("is_prospect_owner", "commercial"),
]

LEGACY_FLAGS = [f for f, _ in FLAG_TO_FUNCTION] + ["is_delivery_coordinator"]

# Old status strings that predate numeric stages.
LEGACY_STATUS_TO_OLD_STAGE = {
    "prospect": 1, "new_client": 1, "awaiting_delegation": 4,
    "delegated": 9, "under_review": 9, "revision_requested": 6,
    "approved_for_build": 9, "in_build": 9, "completed": 10,
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect():
    url, name = os.environ.get("MONGO_URL"), os.environ.get("DB_NAME")
    if not url or not name:
        raise SystemExit("MONGO_URL and DB_NAME must be set in backend/.env")
    return AsyncIOMotorClient(url)[name]


# ---------------------------------------------------------------------------
# Backup and rollback
# ---------------------------------------------------------------------------
async def take_backup(db, projects, users):
    await db[BACKUP_COLLECTION].delete_many({})
    if projects:
        await db[BACKUP_COLLECTION].insert_one({
            "kind": "projects", "taken_at": now(),
            "documents": [{k: v for k, v in p.items() if k != "_id"} for p in projects],
        })
    if users:
        await db[BACKUP_COLLECTION].insert_one({
            "kind": "users", "taken_at": now(),
            "documents": [{k: v for k, v in u.items() if k != "_id"} for u in users],
        })
    print(f"  backup written: {len(projects)} projects, {len(users)} users")


async def rollback(db):
    docs = await db[BACKUP_COLLECTION].find({}, {"_id": 0}).to_list(10)
    if not docs:
        raise SystemExit("No backup found. Nothing to roll back.")
    for entry in docs:
        coll = entry["kind"]
        key = "id" if coll == "projects" else "user_id"
        for original in entry["documents"]:
            await db[coll].replace_one({key: original[key]}, original)
        print(f"  restored {len(entry['documents'])} {coll} from {entry['taken_at']}")
    print("Rollback complete.")


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
MIGRATION_MARKER = "crowther_migrated_at"


def already_migrated(project) -> bool:
    """Whether this project is already on the new lifecycle.

    Two ways to be sure, because there are two ways to get here. A project the
    migration has touched carries its marker. A project created after the code
    changed never needed migrating and carries a `stage_key` from the new
    lifecycle instead.

    This matters more than it looks. The stage maps are not identities: old
    stage 2 becomes new stage 3. Run without this guard a second time and every
    project quietly advances a stage, which is the kind of damage that reads as
    somebody moving work rather than as a bug.
    """
    if project.get(MIGRATION_MARKER):
        return True
    key = project.get("stage_key")
    stage = project.get("stage")
    return bool(key) and isinstance(stage, int) and STAGES.get(stage, {}).get("key") == key


def resolve_old_stage(project) -> int:
    stage = project.get("stage")
    if isinstance(stage, int) and stage > 0:
        return stage
    return LEGACY_STATUS_TO_OLD_STAGE.get(project.get("status"), 1)


def plan_project(project) -> dict:
    """Work out the new shape of one project without writing anything."""
    old_stage = resolve_old_stage(project)

    # Stages 11 and 12 existed in an even older twelve-stage pipeline.
    if old_stage == 11:
        old_stage = 9
    elif old_stage == 12:
        old_stage = 10

    mapped = LEGACY_STAGE_MAP.get(old_stage, {"stage": FIRST_STAGE, "commercial_status": None})
    new_stage = mapped["stage"]

    updates = {
        "stage": new_stage,
        "stage_key": stage_key(new_stage),
        "phase": stage_phase(new_stage),
        "status": project.get("status") if project.get("status") in ("lost", "on_hold") else "active",
    }

    if mapped["commercial_status"]:
        updates["commercial_status"] = mapped["commercial_status"]
    else:
        updates.setdefault("commercial_status", project.get("commercial_status") or "none")

    # The delivery owner becomes the TSD. Where no owner was ever named, the
    # project's creator is not promoted into the role: an unowned project
    # should look unowned so somebody assigns it, rather than quietly
    # inheriting an owner who never agreed to it.
    if project.get("delivery_owner_id"):
        updates["tsd_id"] = project["delivery_owner_id"]
        updates["tsd_name"] = project.get("delivery_owner_name")
    else:
        updates.setdefault("tsd_id", project.get("tsd_id"))
        updates.setdefault("tsd_name", project.get("tsd_name"))

    # The single assigned engineer becomes the first pod member rather than
    # the architect. Being the only engineer on a project did not make anybody
    # its technical owner, and inventing an architect here would put a name
    # against a decision the Senior Partner never made.
    pod_ids = list(project.get("pod_member_ids") or [])
    # "Project team" and "the pod" were two names for one set of people. The
    # pod is the word the delivery model uses, so the collaborators fold into
    # it rather than sitting beside it.
    for uid in project.get("collaborator_ids") or []:
        if uid not in pod_ids:
            pod_ids.append(uid)
    if project.get("assigned_engineer_id") and project["assigned_engineer_id"] not in pod_ids:
        pod_ids.append(project["assigned_engineer_id"])
    updates["pod_member_ids"] = pod_ids
    updates["pod"] = project.get("pod") or project.get("collaborators") or []

    updates.setdefault("architect_id", project.get("architect_id"))
    updates.setdefault("architect_name", project.get("architect_name"))
    updates.setdefault("architect_requested_at", None)
    updates.setdefault("designer_id", None)
    updates.setdefault("designer_name", None)

    # Scope is frozen for anything that already reached build or beyond,
    # because those projects are being delivered against an agreed scope
    # whether or not the system was recording that fact at the time.
    frozen = new_stage >= 12
    updates["scope_frozen"] = frozen
    updates["scope_frozen_at"] = project.get("scope_frozen_at") or (now() if frozen else None)

    for field, default in [
        ("product_status", "not_started"),
        ("architecture_status", "not_started"),
        ("demo_status", "preparing"),
        ("client_status", "not_engaged"),
        ("talent_status", "none"),
        ("qa_status", "not_started"),
        ("health", "GREEN"),
        ("health_reason", ""),
        ("desired_outcome", ""),
        ("original_brief", ""),
        ("template", None),
        ("created_from_prospect_id", None),
        ("validated_at", None),
    ]:
        if project.get(field) is None:
            updates[field] = default

    if not project.get("closure_checklist"):
        updates["closure_checklist"] = [
            {"label": item, "done": False, "done_by": None, "done_at": None}
            for item in CLOSURE_CHECKLIST
        ]

    # Stage history entries used {stage, from_stage, at, by, by_name, note}.
    # The lifecycle records why a move happened and which gate conditions were
    # satisfied, so old entries are widened rather than dropped: losing the
    # history to gain a tidier shape is a bad trade.
    history = []
    for entry in project.get("stage_history") or []:
        history.append({
            "from_stage": entry.get("from_stage"),
            "to_stage": entry.get("to_stage", entry.get("stage")),
            "at": entry.get("at"),
            "by": entry.get("by"),
            "by_name": entry.get("by_name"),
            "why": entry.get("note") or entry.get("why") or "",
            "gate_conditions": entry.get("gate_conditions") or [],
            "forced": bool(entry.get("forced")),
            "legacy_stage_numbering": True,
        })
    history.append({
        "from_stage": None,
        "to_stage": new_stage,
        "at": now(),
        "by": "migration",
        "by_name": "Crowther OS migration",
        "why": f"Migrated from old stage {old_stage} to {STAGES[new_stage]['label']}",
        "gate_conditions": [],
        "forced": False,
    })
    updates["stage_history"] = history
    updates[MIGRATION_MARKER] = now()

    return updates


async def migrate_projects(db, apply: bool):
    projects = await db.projects.find({}, {"_id": 0}).to_list(2000)
    print(f"\nPROJECTS ({len(projects)} found)")
    if not projects:
        return projects

    # Merge split-track siblings. The build sibling is the survivor because it
    # is the one delivery actually continues on; the proposal sibling's
    # commercial state is folded onto it and the record is archived rather
    # than deleted, so the merge can be inspected afterwards.
    by_id = {p["id"]: p for p in projects}
    merged_away = set()
    for p in projects:
        sib_id = p.get("sibling_project_id")
        if not sib_id or sib_id not in by_id or p["id"] in merged_away:
            continue
        sibling = by_id[sib_id]
        proposal, build = (p, sibling) if p.get("track") == "proposal" else (sibling, p)
        if proposal["id"] in merged_away or build["id"] in merged_away:
            continue
        merged_away.add(proposal["id"])
        for field in ("proposal_url", "contract_url", "total_value", "currency", "pricing_data"):
            if not build.get(field) and proposal.get(field):
                build[field] = proposal[field]
        print(f"  merge  {proposal['id'][:8]} (proposal) -> {build['id'][:8]} (build)")
        if apply:
            await db.projects.update_one(
                {"id": proposal["id"]},
                {"$set": {"archived_by_migration": True, "merged_into": build["id"],
                          "archived_at": now()}},
            )

    RETIRED_FIELDS = {
        "track": "", "parent_project_id": "", "sibling_project_id": "",
        "delivery_owner_id": "", "delivery_owner_name": "",
        "pricing_owner_id": "", "pricing_owner_name": "",
        "assigned_engineer_id": "", "assigned_engineer_name": "",
        "unit_slug": "",
        "collaborator_ids": "", "collaborators": "",
    }

    changed = 0
    tidied = 0
    for p in projects:
        if p["id"] in merged_away:
            continue

        # Already on the new lifecycle. Restaging it would advance it a stage,
        # so only the retired fields are cleared.
        if already_migrated(p):
            stale = {k: v for k, v in RETIRED_FIELDS.items() if k in p}
            if not stale:
                continue

            # Carry anything worth keeping off a retired field before it goes.
            # Clearing `collaborator_ids` without folding it into the pod first
            # does not tidy the record, it empties the project of its people --
            # and it does so quietly, on projects that looked already migrated.
            carried = {}
            pod_ids = list(p.get("pod_member_ids") or [])
            added = [uid for uid in (p.get("collaborator_ids") or []) if uid not in pod_ids]
            if added:
                carried["pod_member_ids"] = pod_ids + added
                by_id = {m.get("user_id"): m for m in (p.get("pod") or [])}
                for m in (p.get("collaborators") or []):
                    by_id.setdefault(m.get("user_id"), m)
                carried["pod"] = [m for m in by_id.values() if m.get("user_id")]

            tidied += 1
            moved = f", folding {len(added)} into the pod" if added else ""
            print(f"  tidy   {p.get('name', '?')[:38]:38} clearing {', '.join(sorted(stale))}{moved}")
            if apply:
                update = {"$unset": stale}
                if carried:
                    update["$set"] = carried
                await db.projects.update_one({"id": p["id"]}, update)
            continue

        updates = plan_project(p)
        updates["track"] = None
        updates["parent_project_id"] = None
        updates["sibling_project_id"] = None
        old = resolve_old_stage(p)
        print(f"  stage  {p.get('name', '?')[:38]:38} {old:>2} -> {updates['stage']:>2}  "
              f"{STAGES[updates['stage']]['label']}")
        changed += 1
        if apply:
            await db.projects.update_one(
                {"id": p["id"]},
                {"$set": updates,
                 # Units opened and owned work under the old model. A project
                 # is owned by a named TSD now and built by a pod drawn from
                 # across the capability teams, so it belongs to no unit.
                 "$unset": RETIRED_FIELDS},
            )
    print(f"  {changed} projects restaged, {tidied} already migrated and tidied, "
          f"{len(merged_away)} siblings merged away")
    return projects


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
async def migrate_users(db, apply: bool):
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    print(f"\nUSERS ({len(users)} found)")
    assigned = 0

    for u in users:
        if u.get("function_role"):
            continue

        function = None
        for flag, target in FLAG_TO_FUNCTION:
            if u.get(flag):
                function = target
                break

        # Nobody carried a flag. Whoever manages a unit is doing a TSD's job,
        # so that is the sane default; everyone else is left unassigned rather
        # than guessed at, because a wrong function role grants real access.
        if not function:
            heads = u.get("headed_units") or []
            if heads:
                function = "tsd"
            elif u.get("is_hr"):
                function = "people_ops"

        if not function:
            print(f"  skip   {u.get('email', '?'):40} no flags, left unassigned")
            continue

        updates = {"function_role": function}
        # Architects come from engineering, so being an engineer is what makes
        # somebody selectable rather than a separate role. Nobody is made
        # architect-capable automatically; an administrator grants it.
        if function == "engineer":
            updates["can_architect"] = bool(u.get("can_architect"))

        print(f"  set    {u.get('email', '?'):40} -> {function}")
        assigned += 1
        if apply:
            await db.users.update_one(
                {"user_id": u["user_id"]},
                {"$set": updates, "$unset": {f: "" for f in LEGACY_FLAGS}},
            )

    print(f"  {assigned} users given a function role")
    return users


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
async def main():
    parser = argparse.ArgumentParser(description="Migrate THCO Flow to Crowther OS")
    parser.add_argument("--apply", action="store_true", help="write changes (default is a dry run)")
    parser.add_argument("--rollback", action="store_true", help="restore from the backup")
    args = parser.parse_args()

    db = connect()
    print(f"Database: {os.environ.get('DB_NAME')} at {os.environ.get('MONGO_URL', '').split('@')[-1]}")

    if args.rollback:
        await rollback(db)
        return

    if not args.apply:
        print("\n*** DRY RUN. Nothing will be written. Pass --apply to commit. ***")

    if args.apply:
        print("\nBACKUP")
        await take_backup(
            db,
            await db.projects.find({}, {"_id": 0}).to_list(2000),
            await db.users.find({}, {"_id": 0}).to_list(1000),
        )

    await migrate_projects(db, args.apply)
    await migrate_users(db, args.apply)

    if args.apply:
        # Rights are resolved once per session and cached for 45 seconds, so a
        # change to who manages what is not felt until that clears. The cache
        # lives in the running server's memory, which this script is not, so
        # the server must be restarted or the cache left to expire.
        print("\nDone. Restart the backend, or wait 45 seconds, for cached "
              "identities to pick up the new function roles.")
    else:
        print("\nDry run complete. Re-run with --apply to commit.")


if __name__ == "__main__":
    asyncio.run(main())
