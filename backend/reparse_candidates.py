"""Re-extract structured fields from candidate CVs already in the database.

Candidates were parsed by an earlier extractor that mistook CV section
headings for names -- 144 records were called things like "Professional
Summary" -- and captured no education, employment or certifications at all.

94% of candidates retain their `raw_text`, so they can be re-parsed in place
without asking anyone to re-upload a document.

    python reparse_candidates.py                 # dry run, reports what would change
    python reparse_candidates.py --apply         # writes
    python reparse_candidates.py --apply --names-only

`--apply` snapshots the collection to candidates_backup_<timestamp> first.

Existing values are never overwritten with nothing: a field is only written
when the new extraction found something and the stored value is empty or was
junk. Manually corrected names are therefore preserved.
"""

import argparse
import asyncio
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.cv_parser import (  # noqa: E402
    extract_certifications,
    extract_education,
    extract_employment,
    extract_github,
    extract_name,
    extract_portfolio,
)

load_dotenv()

# Names the previous extractor produced from section headings, job titles and
# addresses. A stored name matching this is treated as replaceable.
JUNK_NAME = re.compile(
    r"curriculum|resume|^cv$|professional summary|personal (data|details)|"
    r"^profile|^contact|objective|^education|^experience|^skills|references|"
    r"nationality|engineer|manager|developer|analyst|specialist|officer|"
    r"executive|administration|operations|resource|management|statement|"
    r"street|road|avenue|estate|^house|record$",
    re.IGNORECASE,
)


def _is_replaceable(name) -> bool:
    if not name or not str(name).strip():
        return True
    value = str(name).strip()
    if len(value) > 45 or JUNK_NAME.search(value):
        return True
    # Run-together text with no spaces is extraction debris, not a name.
    if " " not in value and len(value) > 18:
        return True
    return False


async def main(apply: bool, names_only: bool):
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    coll = db.candidates

    total = await coll.count_documents({})
    with_text = await coll.count_documents({"raw_text": {"$nin": [None, ""]}})
    print(f"candidates: {total}   with raw_text: {with_text}\n")

    if apply:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup = f"candidates_backup_{stamp}"
        docs = [d async for d in coll.find({})]
        if docs:
            await db[backup].insert_many([dict(d) for d in docs])
        print(f"Backup written to `{backup}` ({len(docs)} docs)\n")

    stats = Counter()
    updates = []

    async for doc in coll.find({"raw_text": {"$nin": [None, ""]}}):
        text = doc.get("raw_text") or ""
        email = doc.get("email")
        changes = {}

        new_name = extract_name(text, email)
        if new_name and _is_replaceable(doc.get("name")) and new_name != doc.get("name"):
            changes["name"] = new_name
            stats["name"] += 1

        if not names_only:
            if not doc.get("education"):
                education = extract_education(text)
                if education:
                    changes["education"] = education
                    stats["education"] += 1

            if not doc.get("employment"):
                employment = extract_employment(text)
                if employment:
                    changes["employment"] = employment
                    stats["employment"] += 1

            if not doc.get("certifications"):
                certifications = extract_certifications(text)
                if certifications:
                    changes["certifications"] = certifications
                    stats["certifications"] += 1

            if not doc.get("github"):
                github = extract_github(text)
                if github:
                    changes["github"] = github
                    stats["github"] += 1

            if not doc.get("portfolio"):
                portfolio = extract_portfolio(text)
                if portfolio:
                    changes["portfolio"] = portfolio
                    stats["portfolio"] += 1

        if changes:
            updates.append((doc["candidate_id"], changes))

    print(f"{len(updates)} candidate(s) would change:\n")
    for field in ("name", "education", "employment", "certifications", "github", "portfolio"):
        if stats[field]:
            print(f"  {field:16} {stats[field]}")

    print("\n  sample name corrections:")
    shown = 0
    async for doc in coll.find({"raw_text": {"$nin": [None, ""]}}):
        if shown >= 8:
            break
        new_name = extract_name(doc.get("raw_text") or "", doc.get("email"))
        if new_name and _is_replaceable(doc.get("name")) and new_name != doc.get("name"):
            old = str(doc.get("name"))[:30]
            print(f"    {old:32} -> {new_name[:30]}")
            shown += 1

    if not apply:
        print("\nDry run - nothing written. Re-run with --apply.")
        return 0

    written = 0
    for candidate_id, changes in updates:
        changes["reparsed_at"] = datetime.now(timezone.utc).isoformat()
        await coll.update_one({"candidate_id": candidate_id}, {"$set": changes})
        written += 1

    print(f"\nUpdated {written} candidates.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    parser.add_argument("--names-only", action="store_true", help="only correct names")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.apply, args.names_only)))
