"""One-off repair of the external_candidates collection.

Fixes data written before the Nigerian-only geo gate, canonical LinkedIn
URLs and single-schema documents were introduced:

  1. Removes profiles on non-Nigerian LinkedIn country domains.
  2. Merges rows that are the same profile under different URL spellings.
  3. Re-derives `location` from the profile instead of the search query.
  4. Collapses camelCase/snake_case duplicate fields into one shape.
  5. Flags rows whose name contradicts their LinkedIn URL.

Runs read-only by default:

    python cleanup_external_candidates.py            # dry run, prints plan
    python cleanup_external_candidates.py --apply    # writes changes

`--apply` snapshots the collection to external_candidates_backup_<ts>
before making any change.
"""

import argparse
import asyncio
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.talent_normalize import (  # noqa: E402
    canonical_linkedin_url,
    detect_location,
    is_nigerian_result,
    linkedin_country_code,
    name_matches_slug,
    to_db_document,
)

load_dotenv()

CAMEL_KEYS = [
    "linkedinUrl", "currentRole", "currentCompany", "sourceUrl",
    "sourcePlatform", "matchReasons", "experienceYears", "aiSummary",
]


def _url_of(doc):
    return doc.get("linkedin") or doc.get("linkedinUrl") or doc.get("sourceUrl") or ""


def _completeness(doc):
    """Rank a document so the richest row survives a merge."""
    score = 0
    for f in ("email", "phone", "skills", "current_role", "currentRole",
              "current_company", "summary", "ai_summary", "experience_years"):
        v = doc.get(f)
        if v not in (None, "", [], {}):
            score += 1
    if doc.get("enriched"):
        score += 2
    return score


async def main(apply: bool):
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    coll = db.external_candidates

    docs = [d async for d in coll.find({})]
    total = len(docs)
    print(f"Loaded {total} external candidates\n")

    if apply:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup = f"external_candidates_backup_{stamp}"
        await db[backup].insert_many([dict(d) for d in docs])
        print(f"Backup written to `{backup}` ({total} docs)\n")

    # ── 1. Non-Nigerian handling ──────────────────────────────────────
    # Two different situations, treated differently on purpose:
    #
    #   confirmed foreign -- the profile sits on another country's LinkedIn
    #       domain. That is positive evidence, so the row is deleted.
    #   unverified -- a www.linkedin.com profile whose snippet happened to
    #       name no Nigerian city. That is absence of evidence, not evidence
    #       of absence; many are plainly Nigerian. These are kept and
    #       flagged geo_verified=False for review rather than destroyed.
    confirmed_foreign, unverified = [], []
    for d in docs:
        url = _url_of(d)
        ok, reason = is_nigerian_result(url, d.get("title", ""), d.get("summary", ""))
        if ok:
            continue
        cc = linkedin_country_code(url)
        if cc and cc not in ("www", "ng"):
            confirmed_foreign.append((d, reason))
        else:
            unverified.append((d, reason))

    print(f"[1a] Confirmed non-Nigerian, will DELETE: {len(confirmed_foreign)}")
    by_cc = defaultdict(int)
    for d, _ in confirmed_foreign:
        by_cc[linkedin_country_code(_url_of(d)) or "?"] += 1
    print("       " + ", ".join(f"{k}:{v}" for k, v in sorted(by_cc.items(), key=lambda x: -x[1])))
    for d, _ in confirmed_foreign[:3]:
        print(f"        e.g. {d.get('name')!r} {_url_of(d)}")

    print(f"\n[1b] Unverified location, will KEEP + flag: {len(unverified)}")
    for d, _ in unverified[:5]:
        print(f"        {d.get('name')!r} {_url_of(d)}")
    print("       (geo_verified=False -- review, do not assume foreign)")

    foreign_ids = {d["candidate_id"] for d, _ in confirmed_foreign if d.get("candidate_id")}
    unverified_ids = {d["candidate_id"] for d, _ in unverified if d.get("candidate_id")}
    survivors = [d for d in docs if d.get("candidate_id") not in foreign_ids]

    # ── 2. Merge duplicates by canonical URL ──────────────────────────
    groups = defaultdict(list)
    for d in survivors:
        key = canonical_linkedin_url(_url_of(d))
        if key:
            groups[key].append(d)

    dupe_groups = {k: v for k, v in groups.items() if len(v) > 1}
    redundant = sum(len(v) - 1 for v in dupe_groups.values())
    print(f"\n[2] Duplicate profiles: {len(dupe_groups)} URLs -> {redundant} rows to merge")
    for k, v in list(dupe_groups.items())[:5]:
        names = ", ".join(sorted({str(x.get("name")) for x in v}))
        print(f"      {len(v)}x {k.split('/in/')[-1]:35} names: {names}")

    merge_deletes = []
    merge_updates = []
    for key, group in dupe_groups.items():
        group.sort(key=_completeness, reverse=True)
        keeper, losers = group[0], group[1:]
        merged = {}
        for field in ("email", "phone", "location", "current_role",
                      "current_company", "experience_years", "summary",
                      "ai_summary", "github", "title"):
            if keeper.get(field) in (None, "", []):
                for l in losers:
                    if l.get(field) not in (None, "", []):
                        merged[field] = l[field]
                        break
        skills = list(keeper.get("skills") or [])
        for l in losers:
            for s in (l.get("skills") or []):
                if s not in skills:
                    skills.append(s)
        if skills != (keeper.get("skills") or []):
            merged["skills"] = skills
        merged["discovery_count"] = sum(x.get("discovery_count", 1) for x in group)
        merge_updates.append((keeper["candidate_id"], merged))
        merge_deletes += [l["candidate_id"] for l in losers if l.get("candidate_id")]

    kept = [d for d in survivors if d.get("candidate_id") not in set(merge_deletes)]

    # ── 3/4/5. Location, schema, name verification ────────────────────
    loc_changes, schema_changes, name_flags = [], [], []
    for d in kept:
        url = _url_of(d)
        new_loc = detect_location(url, d.get("title", ""), d.get("summary", ""))
        if new_loc != d.get("location"):
            loc_changes.append((d.get("location"), new_loc))
        if any(k in d for k in CAMEL_KEYS):
            schema_changes.append(d["candidate_id"])
        if d.get("name") and not name_matches_slug(d["name"], url):
            name_flags.append((d.get("name"), url))

    print(f"\n[3] Location corrections: {len(loc_changes)}")
    seen = defaultdict(int)
    for old, new in loc_changes:
        seen[f"{old!r} -> {new!r}"] += 1
    for k, n in sorted(seen.items(), key=lambda x: -x[1])[:8]:
        print(f"      {n:>4}  {k}")

    print(f"\n[4] Documents with duplicate camelCase fields to collapse: {len(schema_changes)}")

    print(f"\n[5] Names contradicting their LinkedIn URL: {len(name_flags)}")
    for n, u in name_flags[:5]:
        print(f"      {n!r} -> {u.split('/in/')[-1]}")
    print("      (flagged as name_verified=False, not deleted -- review in UI)")

    print(f"\n{'='*58}")
    print(f"  before: {total}   after: {len(kept)}")
    print(f"  deleted: {len(confirmed_foreign)} confirmed foreign "
          f"+ {redundant} duplicates")
    print(f"  kept but flagged: {len(unverified)} unverified location, "
          f"{len(name_flags)} unverified name")
    print(f"{'='*58}")

    if not apply:
        print("\nDry run. Re-run with --apply to write these changes.")
        return

    # ── Apply ─────────────────────────────────────────────────────────
    if foreign_ids:
        r = await coll.delete_many({"candidate_id": {"$in": list(foreign_ids)}})
        print(f"\nDeleted {r.deleted_count} non-Nigerian profiles")

    for cid, updates in merge_updates:
        if updates:
            await coll.update_one({"candidate_id": cid}, {"$set": updates})
    if merge_deletes:
        r = await coll.delete_many({"candidate_id": {"$in": merge_deletes}})
        print(f"Merged and deleted {r.deleted_count} duplicate rows")

    fixed = 0
    async for d in coll.find({}):
        url = _url_of(d)
        clean = to_db_document(d)
        clean["location"] = detect_location(url, d.get("title", ""), d.get("summary", ""))
        clean["name_verified"] = bool(
            d.get("name") and name_matches_slug(d["name"], url)
        )
        clean["geo_verified"] = d.get("candidate_id") not in unverified_ids
        unset = {k: "" for k in CAMEL_KEYS if k in d}
        update = {"$set": clean}
        if unset:
            update["$unset"] = unset
        await coll.update_one({"_id": d["_id"]}, update)
        fixed += 1
    print(f"Normalized {fixed} documents")

    await coll.create_index("linkedin_canonical", sparse=True, background=True)
    await coll.create_index("name_verified", sparse=True, background=True)
    print("Indexes ensured on linkedin_canonical, name_verified")
    print(f"\nFinal count: {await coll.count_documents({})}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    asyncio.run(main(p.parse_args().apply))
