"""Remove the projects the API test suites leave behind.

Both suites create a project and leave it, so they can be run repeatedly
without resetting anything. That is the right trade for a test and the wrong
one for a board somebody is about to look at, so this clears them out.

It matches on the names the suites use, not on "anything I do not recognise",
because deleting by exclusion is how real work gets swept away with the test
data. Local only.

    ./venv/Scripts/python.exe scripts/clean_test_projects.py
"""

import asyncio
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")

# The exact prefixes the suites use. Anchored, so a real project called
# "Lifecycle testing for Acme" is not caught by accident.
TEST_NAME_PATTERNS = [
    r"^Lifecycle test [0-9a-f]{6}$",
    r"^Artefact walk [0-9a-f]{6}$",
    r"^Sprint1 assigned [0-9a-f]{6}$",
    r"^Sprint1 unassigned [0-9a-f]{6}$",
]

CHILD_COLLECTIONS = [
    "requirements", "user_journeys", "product_briefs", "architecture_documents",
    "demos", "feedback_items", "documents", "milestones", "boards", "cards",
    "audit_log", "scope_changes", "talent_requirements", "talent_assignments",
]


async def main():
    url = os.environ.get("MONGO_URL", "")
    if not any(h in url for h in ("localhost", "127.0.0.1")):
        raise SystemExit(f"Refusing to run: MONGO_URL is not local ({url.split('@')[-1]})")

    db = AsyncIOMotorClient(url)[os.environ["DB_NAME"]]
    query = {"$or": [{"name": {"$regex": p}} for p in TEST_NAME_PATTERNS]}

    doomed = await db.projects.find(query, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    if not doomed:
        print("No test projects found.")
        return

    print(f"Removing {len(doomed)} test projects and everything hanging off them:")
    ids = [p["id"] for p in doomed]
    for p in doomed:
        print(f"  {p['name']}")

    for coll in CHILD_COLLECTIONS:
        result = await db[coll].delete_many({"project_id": {"$in": ids}})
        if result.deleted_count:
            print(f"    {result.deleted_count:>4} from {coll}")

    result = await db.projects.delete_many({"id": {"$in": ids}})
    print(f"    {result.deleted_count:>4} projects")


if __name__ == "__main__":
    asyncio.run(main())
