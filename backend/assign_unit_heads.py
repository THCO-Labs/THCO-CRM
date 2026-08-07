"""Assign unit heads to all units and give them project-creation privileges.

The permission model:
- user.headed_units: list of unit slugs this user heads (used by permissions.py)
- unit.head_user_id: references the head's user_id (used by the UI)

After this, every unit has a head who can create projects, task boards, and add staff.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "thco_crm"


# Map each unit slug -> (user email, user name)
# Existing heads from production: Anabel (technology), Victoria (thco-hr)
UNIT_HEAD_ASSIGNMENTS = {
    "talent":          ("rebecca@thcohqs.com",          "Rebecca Ifeyinwa Alina"),
    "thco-hr":         ("hr@thcohqs.com",               "Victoria"),               # existing
    "it-tools":        ("victor@thcohqs.com",            "Victor"),
    "sales":           ("adeyosola@thcohqs.com",         "Adeyosola Ademola"),
    "marketing":       ("florence@thcohqs.com",          "Florence Adebimpe Ojo"),
    "advisory":        ("kehinde@thcohqs.com",           "Kehinde Alawode"),
    "technology":      ("anabel@thcohqs.com",            "Anabel Emekene"),         # existing
    "operations":      ("christiana@thcohqs.com",        "Christiana Olansile Olatunji"),
    "academy":         ("ainaadoption@gmail.com",        "AINA ADOPTION"),
    "client-delivery": ("dean@thcohqs.com",              "Dean"),
}


async def main():
    client = AsyncIOMotorClient(LOCAL_URL)
    db = client[DB_NAME]

    # 1 --- Update the units collection with head_user_id and head_name
    print("Updating units...")
    for slug, (email, name) in UNIT_HEAD_ASSIGNMENTS.items():
        user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1, "name": 1})
        if not user:
            print(f"  SKIP {slug}: user {email} not found")
            continue

        user_id = user["user_id"]
        await db.units.update_one(
            {"slug": slug},
            {"$set": {
                "head_user_id": user_id,
                "head_name": name,
            }}
        )
        print(f"  {slug:20} -> {name} ({user_id})")

    # 2 --- Update the users collection with headed_units
    print("\nUpdating users...")
    for slug, (email, name) in UNIT_HEAD_ASSIGNMENTS.items():
        await db.users.update_one(
            {"email": email},
            {"$addToSet": {"headed_units": slug}}
        )
        print(f"  {name:30} heads [{slug}]")

    # 3 --- Verify
    print("\n=== VERIFICATION ===")
    async for u in db.units.find({}, {"_id": 0, "slug": 1, "head_user_id": 1, "head_name": 1}).sort("slug", 1):
        print(f"  [{u['slug']:20}] head={u.get('head_name','none')} ({u.get('head_user_id','none')})")

    print("\n=== USERS WITH headed_units ===")
    async for u in db.users.find(
        {"headed_units": {"$exists": True, "$ne": [], "$ne": None}},
        {"_id": 0, "email": 1, "name": 1, "headed_units": 1}
    ):
        print(f"  {u['name']:30} {u['email']:35} -> {u['headed_units']}")

    print("\nDone — log out and back in to see changes.")


if __name__ == "__main__":
    asyncio.run(main())
