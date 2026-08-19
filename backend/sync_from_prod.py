"""Pull production data and restore to local MongoDB."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import sys

import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# This used to be a hardcoded connection string in a committed file, so the
# production database password was readable by anyone with repository access.
# It now comes from backend/.env, which git ignores. The password remains in
# git history and should be rotated.
PROD_URL = os.environ.get("PROD_MONGO_URL", "")
if not PROD_URL:
    raise RuntimeError(
        "PROD_MONGO_URL is not set. Put the production connection string in "
        "backend/.env as PROD_MONGO_URL=..."
    )
LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "thco_crm"

SKIP_COLLECTIONS = {"sessions", "api_logs", "scheduled_job_locks", "system.indexes"}

async def pull_and_restore():
    print("Connecting to production...")
    prod_client = AsyncIOMotorClient(PROD_URL, serverSelectionTimeoutMS=15000)
    try:
        await prod_client.admin.command("ping")
        print("Production: connected")
    except Exception as e:
        print(f"Production: FAILED — {e}")
        return

    local_client = AsyncIOMotorClient(LOCAL_URL, serverSelectionTimeoutMS=5000)
    try:
        await local_client.admin.command("ping")
        print("Local: connected")
    except Exception as e:
        print(f"Local: FAILED — {e}")
        return

    prod_db = prod_client[DB_NAME]
    local_db = local_client[DB_NAME]

    collections = await prod_db.list_collection_names()
    print(f"\nProduction collections: {len(collections)}")

    total_docs = 0
    for coll_name in collections:
        if coll_name in SKIP_COLLECTIONS:
            continue

        count = await prod_db[coll_name].count_documents({})
        if count == 0:
            print(f"  {coll_name}: 0 docs — skipping")
            continue

        # Drop local and re-import
        await local_db[coll_name].drop()
        print(f"  {coll_name}: {count} docs — importing...", end=" ", flush=True)

        batch = []
        batch_size = 500
        imported = 0

        async for doc in prod_db[coll_name].find({}):
            batch.append(doc)
            if len(batch) >= batch_size:
                try:
                    await local_db[coll_name].insert_many(batch, ordered=False)
                except Exception:
                    pass  # ignore duplicates
                imported += len(batch)
                batch = []

        if batch:
            try:
                await local_db[coll_name].insert_many(batch, ordered=False)
            except Exception:
                pass
            imported += len(batch)

        total_docs += imported
        print(f"done ({imported} docs)")

    print(f"\nTotal imported: {total_docs} documents")
    print("Restart the backend for changes to take effect.")


if __name__ == "__main__":
    asyncio.run(pull_and_restore())
