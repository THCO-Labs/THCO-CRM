"""Revert unit head assignments and give members project-creation ability without being unit heads."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "thco_crm"


async def main():
    client = AsyncIOMotorClient(LOCAL_URL)
    db = client[DB_NAME]

    # 1 --- Revert units: only Anabel (technology) and Victoria (thco-hr) keep head
    print("Reverting unit heads to original state...")
    RESTORE_HEADS = {
        "technology": ("user_0fb0572494e1", "Anabel Emekene"),
        "thco-hr":    ("user_b35a9579e862", "Victoria"),
    }
    all_slugs = ["talent", "thco-hr", "it-tools", "sales", "marketing",
                 "advisory", "technology", "operations", "academy", "client-delivery"]

    for slug in all_slugs:
        if slug in RESTORE_HEADS:
            uid, name = RESTORE_HEADS[slug]
            await db.units.update_one(
                {"slug": slug},
                {"$set": {"head_user_id": uid, "head_name": name}}
            )
            print(f"  {slug:20} -> {name} (kept)")
        else:
            await db.units.update_one(
                {"slug": slug},
                {"$unset": {"head_user_id": "", "head_name": ""}}
            )
            print(f"  {slug:20} -> (none)")

    # 2 --- Remove all headed_units, then give each user headed_units matching their accessible_units
    #     This gives project-creation ability WITHOUT making them formal unit heads
    await db.users.update_many({}, {"$unset": {"headed_units": ""}})
    print("\nRemoved all headed_units")

    # Give each non-admin user headed_units for the units they can access
    print("\nGiving project privileges to members (no unit head assignment):")
    async for u in db.users.find({}, {"_id": 0, "email": 1, "name": 1, "accessible_units": 1, "role": 1}):
        units = u.get("accessible_units") or []
        if not units:
            continue
        await db.users.update_one(
            {"email": u["email"]},
            {"$set": {"headed_units": units}}
        )
        print(f"  {u['name']:30} -> {units}")

    # Verify
    print("\n=== UNITS (head assignments) ===")
    async for u in db.units.find({}, {"_id": 0, "slug": 1, "head_user_id": 1, "head_name": 1}).sort("slug", 1):
        print(f"  [{u['slug']:20}] head={u.get('head_name') or 'none'}")

    print("\nDone. Anabel = only unit head. All members can create projects in their units.")


if __name__ == "__main__":
    asyncio.run(main())
