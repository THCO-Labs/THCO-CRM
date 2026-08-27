"""Reset all local user passwords to a common test password so everyone can log in."""

import asyncio
import os
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "thco_crm"
# Never a literal. This script rewrites *every* password in the database,
# and the value it used was committed to the repository -- which made it
# the known password of every account, including the super admin, in any
# environment where this had ever been run.
TEST_PASSWORD = os.environ.get("SEED_TEST_PASSWORD")
if not TEST_PASSWORD:
    raise SystemExit(
        "Set SEED_TEST_PASSWORD to the password you want. It is deliberately
"
        "not defaulted: this rewrites every password in the database."
    )

async def reset():
    client = AsyncIOMotorClient(LOCAL_URL)
    db = client[DB_NAME]

    pw_hash = bcrypt.hashpw(TEST_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    result = await db.users.update_many(
        {},
        {"$set": {"password_hash": pw_hash}}
    )

    print(f"Reset {result.modified_count} user(s) to password: {TEST_PASSWORD}")

    # List all users
    print("\nAll accounts:")
    async for u in db.users.find({}, {"_id": 0, "email": 1, "name": 1, "role": 1}):
        print(f"  {u['name']:30} {u['email']:35} [{u.get('role','?')}]")

asyncio.run(reset())
