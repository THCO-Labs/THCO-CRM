import os, sys, time, asyncio
from concurrent.futures import ThreadPoolExecutor
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

executor = ThreadPoolExecutor(max_workers=10)

def download_file_sync(fid):
    from services.google_drive import download_file_by_name
    return download_file_by_name(fid)

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    from services.google_drive import list_cv_files
    from services.cv_parser import parse_cv

    # Get already-imported file IDs to skip
    imported_refs = set()
    async for doc in db.candidates.find({"source": "drive"}, {"source_reference": 1}):
        ref = doc.get("source_reference", "")
        if ref.startswith("gdrive:"):
            imported_refs.add(ref.split("gdrive:")[1])

    new = 0
    skipped = 0
    failed = 0
    start = time.time()

    for fid in FOLDER_IDS:
        print(f"\nFolder: {fid}")
        files = list_cv_files(folder_id=fid, page_size=100000, recursive=True)
        to_process = [f for f in files if f['id'] not in imported_refs]
        print(f"  {len(to_process)} new files to import (skipping {len(files) - len(to_process)} already imported)")

        for i, f in enumerate(to_process):
            try:
                # Download in thread pool
                file_bytes, filename = await asyncio.get_event_loop().run_in_executor(
                    executor, download_file_sync, f['id']
                )
                if not file_bytes:
                    failed += 1
                    continue

                parsed = parse_cv(file_bytes, filename or f['name'])

                existing = None
                if parsed.get("email"):
                    existing = await db.candidates.find_one({"email": parsed["email"]})

                if existing:
                    skipped += 1
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
                    new += 1

                if (new + skipped + failed) % 20 == 0:
                    elapsed = time.time() - start
                    total_done = new + skipped + failed
                    rate = total_done / elapsed if elapsed > 0 else 0
                    remaining = len(to_process) - total_done
                    eta = remaining / rate if rate > 0 else 0
                    print(f"  {total_done}/{len(to_process)} ({rate:.1f}/s) | New: {new} | ETA: {eta:.0f}s")

            except Exception as e:
                failed += 1
                if failed <= 3:
                    print(f"  FAIL: {f.get('name', '?')[:40]} - {str(e)[:100]}")

    elapsed = time.time() - start
    total = await db.candidates.count_documents({"source": "drive"})
    print(f"\nDone in {elapsed:.0f}s. Total in DB: {total}")
    executor.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
