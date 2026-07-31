import os, sys, json, time, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

FOLDER_IDS = [
    "1jG27r8UjLs7L9SjQ-nKLhRH2nddJAhpg",
    "1SSCzKSQ192mpFLrHKf52QP7iubxeCPoe",
]

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    from services.google_drive import list_cv_files, download_file_by_name
    from services.cv_parser import parse_cv

    stats = {"new": 0, "updated": 0, "failed": 0, "total": 0}
    start_time = time.time()

    for fid in FOLDER_IDS:
        print(f"\nFolder: {fid}")
        files = list_cv_files(folder_id=fid, page_size=100000, recursive=True)
        print(f"  Found {len(files)} CVs")

        for i, f in enumerate(files):
            try:
                file_bytes, filename = download_file_by_name(f['id'])
                if not file_bytes:
                    stats["failed"] += 1
                    continue

                parsed = parse_cv(file_bytes, filename or f['name'])
                stats["total"] += 1

                existing = None
                if parsed.get("email"):
                    existing = await db.candidates.find_one({"email": parsed["email"]})

                if existing:
                    await db.candidates.update_one(
                        {"candidate_id": existing["candidate_id"]},
                        {"$set": {
                            "skills": list(set(existing.get("skills", []) + parsed.get("skills", []))),
                            "raw_text": parsed.get("raw_text", "")[:50000],
                            "updated_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
                        }}
                    )
                    stats["updated"] += 1
                else:
                    import uuid as _uuid
                    candidate = {
                        "candidate_id": f"cand_{_uuid.uuid4().hex[:12]}",
                        "name": parsed.get("name"),
                        "email": parsed.get("email"),
                        "phone": parsed.get("phone"),
                        "linkedin": parsed.get("linkedin"),
                        "skills": parsed.get("skills", []),
                        "experience_years": parsed.get("experience_years"),
                        "raw_text": parsed.get("raw_text", "")[:50000],
                        "source": "drive",
                        "source_reference": f"gdrive:{f['id']}",
                        "status": "new",
                        "filename": filename,
                        "created_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
                        "updated_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
                    }
                    await db.candidates.insert_one(candidate)
                    stats["new"] += 1

                if (i + 1) % 50 == 0 or i == 0:
                    elapsed = time.time() - start_time
                    rate = (i + 1) / elapsed if elapsed > 0 else 0
                    remaining = len(files) - (i + 1)
                    eta = remaining / rate if rate > 0 else 0
                    print(f"  {i+1}/{len(files)} ({rate:.1f}/s) | New: {stats['new']} | Updated: {stats['updated']} | Failed: {stats['failed']} | ETA: {eta:.0f}s")

            except Exception as e:
                stats["failed"] += 1
                if stats["failed"] <= 5:
                    print(f"  FAIL: {f.get('name', '?')[:40]} - {str(e)[:100]}")
                continue  # Always continue to next file

    elapsed = time.time() - start_time
    print(f"\nDone in {elapsed:.0f}s. New: {stats['new']}, Updated: {stats['updated']}, Failed: {stats['failed']}")

if __name__ == "__main__":
    asyncio.run(main())
