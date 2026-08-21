"""Seed a local database with a working Crowther OS delivery pipeline.

Creates one account per function role, and projects spread across the six
lifecycle phases so every part of the board has something in it. Enough to
walk a project from intake to closure by hand and see the gates, the
next-step panel and the notifications behave.

Local only. It refuses to run against anything that is not localhost, because
seeding invents people and projects and doing that to production would be
difficult to unpick.

Usage
-----
    ./venv/Scripts/python.exe scripts/seed_crowther_local.py
    ./venv/Scripts/python.exe scripts/seed_crowther_local.py --reset
"""

import argparse
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import bcrypt  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from services.delivery_stages import (  # noqa: E402
    CLOSURE_CHECKLIST,
    STAGES,
    stage_key,
    stage_phase,
)

load_dotenv(BACKEND_DIR / ".env")

PASSWORD = "localdev-2026"
ALL_UNITS = ["talent", "thco-hr", "flow", "it-tools", "sales", "marketing",
             "advisory", "technology", "operations", "academy", "client-delivery"]

SEED_MARKER = "seeded_by_crowther_local"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def days(n: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=n)).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# email, name, role, function_role, can_architect
PEOPLE = [
    ("partner@thcohq.com",   "Ayo Omomia",      "super_admin", "senior_partner",   False),
    ("commercial@thcohq.com", "Chidi Bello",    "team_member", "commercial",       False),
    ("tsd@thcohq.com",       "Anabel Emekene",  "team_member", "tsd",              False),
    ("tsd2@thcohq.com",      "Timothy Victor",  "team_member", "tsd",              False),
    ("architect@thcohq.com", "Success Okoro",   "team_member", "engineer",         True),
    ("eng1@thcohq.com",      "Emeka Nwosu",     "team_member", "engineer",         True),
    ("eng2@thcohq.com",      "Fatima Bello",    "team_member", "engineer",         False),
    ("designer@thcohq.com",  "Lena Vogt",       "team_member", "product_designer", False),
    ("qa@thcohq.com",        "Tom Reeves",      "team_member", "qa",               False),
    ("talent@thcohq.com",    "Bola Ade",        "team_member", "talent_sd",        False),
    ("people@thcohq.com",    "Victoria Ade",    "mini_admin",  "people_ops",       False),
    ("legal@thcohq.com",     "David Mensah",    "team_member", "legal",            False),
    ("finance@thcohq.com",   "Priya Nair",      "team_member", "finance",          False),
]

# name, client, stage, health, outcome
PROJECTS = [
    ("Barbados Language Model Programme", "Government of Barbados", 1, "GREEN",
     "Train AI models in local language for the national banking system."),
    ("Meridian Fraud Copilot", "Meridian Bank", 4, "GREEN",
     "Real-time fraud detection copilot for analysts."),
    ("GDL Knowledge Assistant", "Global Dynamics Ltd", 6, "AMBER",
     "Internal knowledge assistant over policies and procedures."),
    ("Aster Health Data Platform", "Aster Health", 8, "GREEN",
     "Unified clinical data platform."),
    ("Pebbles Vendor Portal", "Pebbles Group", 10, "GREEN",
     "Self-service vendor onboarding portal."),
    ("IHS Field Operations App", "IHS Towers", 13, "AMBER",
     "Field engineer scheduling and reporting application."),
    ("Cene Payments Integration", "Cene", 17, "GREEN",
     "Payment gateway integration and reconciliation."),
]

REQUIREMENTS = [
    ("Employees search internal policies in natural language", "Functional", "high", "committed"),
    ("Every answer cites the source document", "Functional", "high", "committed"),
    ("Role-based access so people see only permitted documents", "Security", "high", "committed"),
    ("Ingest PDF, Word and SharePoint content", "Data", "high", "proposed"),
    ("Response within an acceptable latency (target to confirm)", "Non-Functional", "medium", "open_question"),
    ("Audit log of all queries for compliance", "Compliance", "medium", "proposed"),
]


def guard_local():
    url = os.environ.get("MONGO_URL", "")
    if not any(h in url for h in ("localhost", "127.0.0.1")):
        raise SystemExit(
            f"Refusing to seed: MONGO_URL is not local ({url.split('@')[-1]}).\n"
            "This script invents users and projects and is for local development only."
        )


async def reset(db):
    """Remove only what this script created. Anything else is left alone."""
    for coll in ["projects", "documents", "requirements", "boards", "cards",
                 "audit_log", "notifications", "email_logs"]:
        result = await db[coll].delete_many({SEED_MARKER: True})
        if result.deleted_count:
            print(f"  removed {result.deleted_count} from {coll}")
    result = await db.users.delete_many({SEED_MARKER: True})
    print(f"  removed {result.deleted_count} users")


async def seed_users(db):
    print("\nUSERS")
    ids = {}
    for email, name, role, function_role, can_arch in PEOPLE:
        existing = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
        doc = {
            "email": email,
            "name": name,
            "role": role,
            "function_role": function_role,
            "can_architect": can_arch,
            "accessible_units": ALL_UNITS if role != "team_member" else ["flow", "technology"],
            "status": "active",
            "picture": None,
            SEED_MARKER: True,
        }
        if existing:
            ids[function_role if function_role not in ids else email] = existing["user_id"]
            ids[email] = existing["user_id"]
            await db.users.update_one({"email": email}, {"$set": doc})
            print(f"  update {email:26} {function_role}")
        else:
            uid = f"user_{uuid.uuid4().hex[:12]}"
            doc.update({
                "user_id": uid,
                "password_hash": hash_password(PASSWORD),
                "created_at": now(),
            })
            await db.users.insert_one(doc)
            ids[email] = uid
            print(f"  create {email:26} {function_role}")
    return ids


async def seed_projects(db, ids):
    print("\nPROJECTS")
    tsd_id = ids["tsd@thcohq.com"]
    architect_id = ids["architect@thcohq.com"]
    commercial_id = ids["commercial@thcohq.com"]

    created = []
    for name, client, stage, health, outcome in PROJECTS:
        pid = str(uuid.uuid4())
        # Anything past stage 2 has a TSD; anything past stage 6 has an
        # architect. Seeding a project at stage 8 with no architect would be a
        # state the lifecycle cannot actually produce.
        has_tsd = stage >= 3
        has_architect = stage >= 7

        doc = {
            "id": pid,
            "project_id_display": f"THCO-2026-{uuid.uuid4().hex[:6].upper()}",
            "name": name,
            "client_id": None,
            "client_name_snapshot": client,
            "website": "",
            "description": outcome,
            "created_from_prospect_id": None,

            "stage": stage,
            "stage_key": stage_key(stage),
            "phase": stage_phase(stage),
            "status": "active",
            "scope_frozen": stage >= 12,
            "scope_frozen_at": now() if stage >= 12 else None,
            "stage_history": [{
                "from_stage": None, "to_stage": stage, "at": now(),
                "by": "seed", "by_name": "Seed data",
                "why": "Seeded at this stage", "gate_conditions": [], "forced": False,
            }],

            "tsd_id": tsd_id if has_tsd else None,
            "tsd_name": "Anabel Emekene" if has_tsd else None,
            "architect_id": architect_id if has_architect else None,
            "architect_name": "Success Okoro" if has_architect else None,
            "architect_requested_at": now() if stage >= 6 else None,
            "designer_id": None,
            "designer_name": None,
            "pod_member_ids": [ids["eng1@thcohq.com"], ids["eng2@thcohq.com"]] if stage >= 12 else [],
            "pod_member_ids": [],
            "pod": [],

            "template": None,
            "desired_outcome": outcome,
            "original_brief": f"{client} approached us about: {outcome}",

            "product_status": "defined" if stage >= 5 else "drafting" if stage >= 4 else "not_started",
            "architecture_status": "uploaded" if stage >= 9 else "in_progress" if stage >= 8 else "not_started",
            "demo_status": "client_validated" if stage >= 11 else "completed" if stage >= 10 else "preparing",
            "client_status": "accepted" if stage >= 15 else "validated" if stage >= 11 else "in_discovery" if stage >= 4 else "not_engaged",
            "talent_status": "none",
            "qa_status": "passed" if stage >= 15 else "in_progress" if stage == 14 else "not_started",
            "commercial_status": "contracted" if stage >= 12 else "none",

            "health": health,
            "health_reason": "Integration scope still unconfirmed." if health == "AMBER" else "",
            "health_set_by": tsd_id if health != "GREEN" else None,
            "health_set_at": now() if health != "GREEN" else None,

            "closure_checklist": [
                {"label": item, "done": stage == 17, "done_by": None, "done_at": None}
                for item in CLOSURE_CHECKLIST
            ],

            "total_value": None,
            "currency": "USD",
            "created_at": now(),
            "created_by": commercial_id,
            "created_by_name": "Chidi Bello",
            "start_date": days(-30) if stage >= 13 else None,
            "validated_at": now() if stage >= 11 else None,
            "completed_at": now() if stage == 17 else None,
            "is_demo": False,
            SEED_MARKER: True,
        }
        await db.projects.insert_one(doc)
        created.append(doc)
        print(f"  {STAGES[stage]['label'][:30]:30} {name[:36]:36} {health}")
    return created


async def seed_artefacts(db, projects, ids):
    """Give the mid-lifecycle project real content so the tabs are not empty."""
    print("\nARTEFACTS")
    target = next((p for p in projects if p["stage"] == 8), projects[0])
    pid = target["id"]

    for i, (desc, cat, pri, status) in enumerate(REQUIREMENTS, 1):
        await db.requirements.insert_one({
            "requirement_id": str(uuid.uuid4()),
            "project_id": pid,
            "req_ref": f"R-{i:02d}",
            "description": desc,
            "category": cat,
            "priority": pri,
            "status": status,
            "acceptance_criteria": "",
            "source_type": "intake",
            "source_id": None,
            "superseded_by": None,
            "created_at": now(),
            SEED_MARKER: True,
        })
    print(f"  {len(REQUIREMENTS)} requirements on {target['name']}")

    await db.documents.insert_one({
        "document_id": str(uuid.uuid4()),
        "project_id": pid,
        "title": "Discovery call, 12 June",
        "doc_type": "transcript",
        "content": (
            "Client confirmed the assistant is for internal use across 8,000 staff. "
            "Helen raised data privacy concerns. Source documents live in SharePoint "
            "and a legacy file share. Latency expectations were not agreed."
        ),
        "source_label": "Discovery call",
        "source_date": days(-14),
        "file_url": None,
        "version": 1,
        "author_id": ids["tsd@thcohq.com"],
        "author_name": "Anabel Emekene",
        "created_at": now(),
        SEED_MARKER: True,
    })
    await db.documents.insert_one({
        "document_id": str(uuid.uuid4()),
        "project_id": pid,
        "title": "Original brief",
        "doc_type": "brief",
        "content": target["original_brief"],
        "source_label": "Intake",
        "source_date": None,
        "file_url": None,
        "version": 1,
        "author_id": ids["commercial@thcohq.com"],
        "author_name": "Chidi Bello",
        "created_at": now(),
        SEED_MARKER: True,
    })
    print(f"  2 documents on {target['name']}")


async def main():
    parser = argparse.ArgumentParser(description="Seed Crowther OS local data")
    parser.add_argument("--reset", action="store_true", help="remove seeded data first")
    args = parser.parse_args()

    guard_local()
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    print(f"Database: {os.environ['DB_NAME']} at {os.environ['MONGO_URL']}")

    if args.reset:
        print("\nRESET")
        await reset(db)

    ids = await seed_users(db)
    projects = await seed_projects(db, ids)
    await seed_artefacts(db, projects, ids)

    print(f"\nDone. Sign in as any of these with password: {PASSWORD}")
    print("  partner@thcohq.com    Senior Partner, selects architects")
    print("  tsd@thcohq.com        TSD, owns and moves projects")
    print("  architect@thcohq.com  Engineer who can architect")
    print("  talent@thcohq.com     TalentSD")


if __name__ == "__main__":
    asyncio.run(main())
