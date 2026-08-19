"""Set headed_units on production users (non-tech members get project privileges)."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

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
