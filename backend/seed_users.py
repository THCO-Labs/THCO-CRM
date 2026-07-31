"""Seed local dev accounts: admin (super_admin), hr (team_member + is_hr), user (team_member).

Run with:  python seed_users.py
Idempotent — re-running updates passwords/roles but won't duplicate users.
"""
import asyncio
import bcrypt
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

ALL_UNITS = ["talent", "sales", "marketing", "advisory", "technology",
             "operations", "academy", "client-delivery"]

# (email, password, name, role, is_hr, accessible_units)
SEED_ACCOUNTS = [
    ("admin@thco.dev", "Admin123!", "Dev Admin", "super_admin", False, ALL_UNITS),
    ("hr@thco.dev",    "Hr123!",    "Dev HR",    "team_member", True,  ["talent", "operations"]),
    ("user@thco.dev",  "User123!",  "Dev User",  "team_member", False, []),
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main():
    for email, password, name, role, is_hr, units in SEED_ACCOUNTS:
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "password_hash": hash_password(password),
                    "name": name,
                    "role": role,
                    "is_hr": is_hr,
                    "accessible_units": units,
                    "status": "active",
                }},
            )
            print(f"updated  {email} (role={role}, is_hr={is_hr})")
        else:
            user_id = f"user_{__import__('uuid').uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "password_hash": hash_password(password),
                "name": name,
                "role": role,
                "is_hr": is_hr,
                "accessible_units": units,
                "status": "active",
                "picture": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            print(f"created  {email} (role={role}, is_hr={is_hr})")
    print("done.")


if __name__ == "__main__":
    asyncio.run(main())
