"""Set headed_units on production users (non-tech members get project privileges)."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

PROD_URL = "mongodb://thcoadmin:Thco042148521dfac6d6185cCrm!@fc-ecf1916945d5-000.mongocluster.cosmos.azure.com:10260/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000"
DB_NAME = "thco_crm"

async def main():
    prod = AsyncIOMotorClient(PROD_URL, serverSelectionTimeoutMS=15000)
    await prod.admin.command("ping")
    print("Connected to production")
    db = prod[DB_NAME]

    # For each user, set headed_units = accessible_units minus technology
    # Admins (super_admin, mini_admin) keep empty - admin role covers everything
    # Anabel keeps technology + flow (already set via units collection)
    updated = 0
    async for u in db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "role": 1, "accessible_units": 1}):
        if u["role"] in ("super_admin", "mini_admin"):
            print(f"  SKIP admin: {u['name']} ({u['email']})")
            continue

        units = [x for x in (u.get("accessible_units") or []) if x != "technology"]
        if u["email"] == "anabel@thcohqs.com":
            units = ["technology", "flow"]  # Anabel keeps her unit head units

        if not units:
            print(f"  SKIP (no units): {u['name']} ({u['email']})")
            continue

        await db.users.update_one(
            {"user_id": u["user_id"]},
            {"$set": {"headed_units": units}}
        )
        updated += 1
        print(f"  SET {u['name']:30} -> {units}")

    print(f"\nUpdated {updated} user(s)")
    print("Done — changes should take effect immediately (no restart needed)")

asyncio.run(main())
