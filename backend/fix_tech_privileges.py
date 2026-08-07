"""Fix: Technology & Build = Anabel only. All other units = members get full privileges."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "thco_crm"


async def main():
    client = AsyncIOMotorClient(LOCAL_URL)
    db = client[DB_NAME]

    # Remove headed_units from everyone first
    await db.users.update_many({}, {"$unset": {"headed_units": ""}})

    # Anabel keeps technology in her headed_units
    await db.users.update_one(
        {"email": "anabel@thcohqs.com"},
        {"$set": {"headed_units": ["technology", "flow"]}}
    )
    print("Anabel -> [technology, flow]  (unit head)")

    # Victoria keeps thco-hr
    await db.users.update_one(
        {"email": "hr@thcohqs.com"},
        {"$set": {"headed_units": ["thco-hr"]}}
    )
    print("Victoria -> [thco-hr]  (unit head)")

    # Everyone else: headed_units = their accessible_units MINUS technology
    async for u in db.users.find({}, {"_id": 0, "email": 1, "name": 1, "accessible_units": 1, "role": 1}):
        if u["email"] in ("anabel@thcohqs.com", "hr@thcohqs.com"):
            continue  # already handled

        units = [x for x in (u.get("accessible_units") or []) if x != "technology"]
        if not units:
            print(f"  {u['name']:30} -> (no non-tech units, skipping)")
            continue

        await db.users.update_one(
            {"email": u["email"]},
            {"$set": {"headed_units": units}}
        )
        print(f"  {u['name']:30} -> {units}")

    # Verify
    print("\n=== FINAL STATE ===")
    async for u in db.users.find({}, {"_id": 0, "email": 1, "name": 1, "headed_units": 1}).sort("name", 1):
        headed = u.get("headed_units") or []
        tag = " [UNIT HEAD]" if "technology" in headed else ""
        print(f"  {u['name']:30} {u['email']:35} -> {headed}{tag}")

    print("\nDone.")

asyncio.run(main())
