"""Re-sync only the broken collections from production."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

PROD_URL = "mongodb://thcoadmin:Thco042148521dfac6d6185cCrm!@fc-ecf1916945d5-000.mongocluster.cosmos.azure.com:10260/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000"
LOCAL_URL = "mongodb://localhost:27017"

FIX_COLLECTIONS = ["units", "projects_archived", "resume_files", "import_cursors", "import_runs", "merge_reviews", "resume_versions"]

async def fix():
    prod = AsyncIOMotorClient(PROD_URL, serverSelectionTimeoutMS=30000)
    local = AsyncIOMotorClient(LOCAL_URL, serverSelectionTimeoutMS=5000)
    
    await prod.admin.command("ping")
    await local.admin.command("ping")
    
    prod_db = prod["thco_crm"]
    local_db = local["thco_crm"]

    for coll_name in FIX_COLLECTIONS:
        if coll_name not in await prod_db.list_collection_names():
            print(f"  {coll_name}: doesn't exist in production — skip")
            continue

        count = await prod_db[coll_name].count_documents({})
        if count == 0:
            print(f"  {coll_name}: 0 docs — skip")
            continue

        await local_db[coll_name].drop()
        print(f"  {coll_name}: {count} docs — importing...", end=" ", flush=True)

        imported = 0
        batch = []
        batch_size = 500

        async for doc in prod_db[coll_name].find({}):
            batch.append(doc)
            if len(batch) >= batch_size:
                try:
                    await local_db[coll_name].insert_many(batch, ordered=False)
                except Exception:
                    pass
                imported += len(batch)
                batch = []

        if batch:
            try:
                await local_db[coll_name].insert_many(batch, ordered=False)
            except Exception:
                pass
            imported += len(batch)

        print(f"done ({imported})")

    # Verify
    u = await local_db.units.find_one()
    keys = [k for k in u.keys() if k != "_id"] if u else []
    print(f"\nUnits now have {len(keys)} fields: {keys[:5]}...")

    print("\nDone — restart backend.")

asyncio.run(fix())
