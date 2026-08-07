"""Seed local dev with realistic data so local mirrors production behaviour.

Run:  python seed_local_dev.py
"""

import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

ALL_UNITS = ["talent", "sales", "marketing", "advisory", "technology",
             "operations", "academy", "client-delivery"]

TEST_PROJECTS = [
    {
        "title": "Talent Sourcing Pipeline",
        "description": "Build out the end-to-end candidate sourcing and enrichment pipeline.",
        "unit_slug": "talent",
        "stage": "in_progress",
        "status": "active",
        "priority": "high",
    },
    {
        "title": "CV Parser Improvements",
        "description": "Enhance OCR handling and add support for additional file formats.",
        "unit_slug": "technology",
        "stage": "in_progress",
        "status": "active",
        "priority": "medium",
    },
    {
        "title": "Client Onboarding Portal",
        "description": "Build the self-service client onboarding experience.",
        "unit_slug": "client-delivery",
        "stage": "planning",
        "status": "active",
        "priority": "medium",
    },
    {
        "title": "Sales Dashboard Redesign",
        "description": "Redesign the sales pipeline dashboard with real-time metrics.",
        "unit_slug": "sales",
        "stage": "planning",
        "status": "active",
        "priority": "low",
    },
    {
        "title": "Marketing Campaign Tracker",
        "description": "Track and measure marketing campaigns across channels.",
        "unit_slug": "marketing",
        "stage": "in_progress",
        "status": "active",
        "priority": "high",
    },
]


async def main():
    # 1 --- Make joshua a unit head with all units and has_projects flag
    result = await db.users.update_one(
        {"email": "joshua@thcohq.com"},
        {"$set": {
            "has_projects": True,
            "role": "super_admin",
            "status": "active",
        }}
    )
    if result.matched_count:
        print("Updated joshua@thcohq.com: has_projects=True, role=super_admin")
    else:
        print("joshua@thcohq.com NOT FOUND — create the account first")

    # 2 --- Create test projects (skip if a project with same title already exists)
    created = 0
    now = datetime.now(timezone.utc).isoformat()

    for p in TEST_PROJECTS:
        existing = await db.projects.find_one({"title": p["title"]}, {"_id": 1})
        if existing:
            print(f"  SKIP (exists): {p['title']}")
            continue

        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        doc = {
            "project_id": project_id,
            "title": p["title"],
            "description": p["description"],
            "unit_slug": p["unit_slug"],
            "stage": p["stage"],
            "status": p["status"],
            "priority": p["priority"],
            "created_by": "joshua@thcohq.com",
            "created_at": now,
            "updated_at": now,
            "staff": [],
            "labels": [],
            "is_demo": False,
        }
        await db.projects.insert_one(doc)
        created += 1
        print(f"  CREATED [{p['unit_slug']}] {p['title']}")

    print(f"\nCreated {created} new project(s)")

    # 3 --- Create default task boards for each project
    projects = await db.projects.find({}, {"_id": 0, "project_id": 1, "title": 1}).to_list(None)
    boards_created = 0

    default_columns = ["To Do", "In Progress", "Review", "Done"]

    for proj in projects:
        pid = proj.get("project_id")
        if not pid:
            print(f"  SKIP (no project_id): {proj.get('title', 'unknown')}")
            continue
        existing_boards = await db.task_boards.count_documents({"project_id": pid})
        if existing_boards > 0:
            print(f"  Boards already exist for: {proj.get('title', pid)}")
            continue

        for i, col_name in enumerate(default_columns):
            board_id = f"board_{uuid.uuid4().hex[:12]}"
            board = {
                "board_id": board_id,
                "project_id": pid,
                "title": col_name,
                "position": i,
                "cards": [],
                "created_at": now,
                "updated_at": now,
            }
            await db.task_boards.insert_one(board)
            boards_created += 1
        print(f"  +4 boards for: {proj.get('title', pid)}")

    print(f"\nCreated {boards_created} task board(s)")
    print("Done — restart the backend for changes to take effect.")


if __name__ == "__main__":
    asyncio.run(main())
