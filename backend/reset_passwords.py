"""Reset all local user passwords to a common test password so everyone can log in."""

import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "thco_crm"
TEST_PASSWORD = "THCOAdmin2024!"

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
