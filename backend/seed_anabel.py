"""Fix local data: make Anabel a unit head and create her projects."""

import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

NOW = datetime.now(timezone.utc).isoformat()

ANABEL_PROJECTS = [
    {
        "title": "Technology Unit Dashboard",
        "description": "Build the technology team's internal dashboard for tracking tools and deployments.",
        "unit_slug": "technology",
        "stage": "in_progress",
        "status": "active",
        "priority": "high",
    },
    {
        "title": "Flow Platform Migration",
        "description": "Migrate the Flow platform to the new architecture.",
        "unit_slug": "flow",
        "stage": "planning",
        "status": "active",
        "priority": "medium",
    },
]

DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done"]


async def main():
    # 1 --- Make Anabel a unit head
    result = await db.users.update_one(
        {"email": "anabel@thcohqs.com"},
        {"$set": {
            "has_projects": True,
            "head_of_units": ["technology", "flow"],
            "role": "team_member",
            "status": "active",
        }}
    )
    if result.matched_count:
        print("Updated Anabel: head_of_units=[technology, flow], has_projects=True")
    else:
        print("Anabel NOT FOUND")

    # 2 --- Remove corrupted project
    deleted = await db.projects.delete_one({"title": None})
    if deleted.deleted_count:
        print(f"Removed {deleted.deleted_count} corrupted project(s)")

    # 3 --- Create Anabel's projects
    created = 0
    for p in ANABEL_PROJECTS:
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
            "created_by": "anabel@thcohqs.com",
            "created_at": NOW,
            "updated_at": NOW,
            "staff": [],
            "labels": [],
            "is_demo": False,
        }
        await db.projects.insert_one(doc)

        # Create boards for this project
        for i, col in enumerate(DEFAULT_COLUMNS):
            board_id = f"board_{uuid.uuid4().hex[:12]}"
            await db.task_boards.insert_one({
                "board_id": board_id,
                "project_id": project_id,
                "title": col,
                "position": i,
                "cards": [],
                "created_at": NOW,
                "updated_at": NOW,
            })
        created += 1
        print(f"  CREATED [{p['unit_slug']}] {p['title']} (+4 boards)")

    print(f"\nCreated {created} project(s)")
    print("Done — log out and back in to see changes.")


if __name__ == "__main__":
    asyncio.run(main())
