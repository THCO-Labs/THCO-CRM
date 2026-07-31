"""Seed one login account per business unit for manual testing.

Each unit user gets access to ONLY their own unit + THCO Flow (flow is org-wide).
The IT account is flagged is_it=True so it can see the IT Feedback Console.

Run:  python seed_unit_accounts.py
Idempotent — updates existing accounts instead of duplicating.
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

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

PW = "Unit123!"
FLOW = "flow"

# (email, name, slug, is_it)
ACCOUNTS = [
    ("talent@thco.dev",      "Talent Lead",      "talent",        False),
    ("thcohr@thco.dev",      "HR Lead",          "thco-hr",       False),
    ("flow@thco.dev",        "Flow Lead",        "flow",          False),
    ("it@thco.dev",          "IT Support",       "it-tools",      True),
    ("sales@thco.dev",       "Sales Lead",       "sales",         False),
    ("marketing@thco.dev",   "Marketing Lead",   "marketing",     False),
    ("advisory@thco.dev",    "Advisory Lead",    "advisory",      False),
    ("technology@thco.dev",  "Tech Lead",        "technology",    False),
    ("operations@thco.dev",  "Ops Lead",         "operations",    False),
    ("academy@thco.dev",     "Academy Lead",     "academy",       False),
    ("clientdelivery@thco.dev", "Delivery Lead",  "client-delivery", False),
]


def hash_password(p):
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main():
    for email, name, slug, is_it in ACCOUNTS:
        units = [slug, FLOW]
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "name": name,
                    "role": "team_member",
                    "password_hash": hash_password(PW),
                    "accessible_units": units,
                    "is_it": is_it,
                    "status": "active",
                }},
            )
            print(f"updated  {email:28s} units={units} is_it={is_it}")
        else:
            user_id = f"user_{__import__('uuid').uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "password_hash": hash_password(PW),
                "name": name,
                "role": "team_member",
                "accessible_units": units,
                "is_it": is_it,
                "status": "active",
                "picture": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            print(f"created  {email:28s} units={units} is_it={is_it}")
    print("\nDone. Password for all unit accounts:", PW)


if __name__ == "__main__":
    asyncio.run(main())
