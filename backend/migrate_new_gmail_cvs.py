"""Add the Gmail-imported CVs that exist locally but not yet in production.

Strictly an ADD: nothing already in production is updated, merged, or deleted.
Production is only appended to.

Idempotency keys (a re-run adds nothing):
  * candidates       -> candidate_id   (unique index in prod)
  * resume_files     -> version_id     (UUID; no unique index, deduped here)
  * resume_versions  -> version_id     (UUID; no unique index, deduped here)
  * candidate_activity is intentionally NOT copied (append-only audit log with
    no stable natural key; it is not CV content and is not needed for the CV to
    open).

Resumability: each collection computes "what is missing from prod" fresh at the
start of a run, so a crash partway through one collection resumes cleanly on the
next run -- already-inserted rows are skipped, still-missing rows are not.

The dry run uses cheap counts only. resume_files is reported as an estimate
derived from resume_versions (the two share version_id); counting the binary
collection would require reading ~20 GB of CV content.

Usage:
    python migrate_new_gmail_cvs.py            # dry run: report only
    python migrate_new_gmail_cvs.py --apply    # append the new CVs to prod
    python migrate_new_gmail_cvs.py --verify   # report prod counts afterwards
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import (AutoReconnect, BulkWriteError, ExecutionTimeout,
                            OperationFailure, PyMongoError)

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Production connection lives in sync_from_prod.py; read it, never print it.
from sync_from_prod import PROD_URL, DB_NAME as PROD_DB

SOURCE = "gmail"

# (batch size for prod inserts, throttle seconds between batches). resume_files
# carry binary CV content (~288 KB each), so they use the smallest batch. All
# batches are sized to finish inside Cosmos DB's per-command time limit on the
# free tier (the original 500/50/500 sizes died with code 50 timeouts).
CAND_BATCH, CAND_THROTTLE = 100, 0.5
RV_BATCH, RV_THROTTLE = 200, 0.5
RF_BATCH, RF_THROTTLE = 25, 1.0

# candidate_ids fetched per indexed resume_files query (keeps each cursor short).
RF_CANDIDATE_CHUNK = 100


def id_set(coll, key, query=None, page=2000, page_timeout_ms=120_000):
    """Set of `key` values present in a collection (optionally filtered).

    Read a page at a time rather than in one cursor. Cosmos DB ends a command
    that outruns its time limit (code 50), and on the free tier a single pass
    over a collection this size no longer finishes: candidates reached 33k
    documents and resume_versions 76k, which is enough to kill the read before
    the migration reaches the step it was resumed for.

    Paging walks `_id`, which is indexed on every collection whatever else is
    not, so each query is bounded and index-backed. The cost is more round
    trips; the benefit is that it finishes.
    """
    found = set()
    base = dict(query or {})
    last = None
    while True:
        q = dict(base)
        if last is not None:
            q["_id"] = {"$gt": last}
        page_docs = list(
            coll.find(q, {"_id": 1, key: 1})
            .sort("_id", 1)
            .limit(page)
            .max_time_ms(page_timeout_ms)
        )
        if not page_docs:
            return found
        for d in page_docs:
            if key in d:
                found.add(d[key])
        last = page_docs[-1]["_id"]


def local_gmail_ids(ldb):
    return id_set(ldb.candidates, "candidate_id", {"source": SOURCE})


def insert_batch(coll, docs, key, retries=10):
    """Insert with backoff for the slow/free-tier target (429s, timeouts).

    `key` is the idempotency key of `coll`. Because resume_files/resume_versions
    have no unique index, a timeout can leave part of a batch written; on retry
    we re-read prod and drop any doc already present so a partial write can never
    turn into a duplicate.
    """
    for attempt in range(retries):
        try:
            coll.insert_many(docs, ordered=False)
            return len(docs)
        except BulkWriteError as e:
            # 11000 = duplicate key -> already present (idempotent skip)
            dups = sum(1 for w in e.details.get("writeErrors", [])
                       if w.get("code") == 11000)
            return len(docs) - len(e.details.get("writeErrors", [])) + dups
        except (AutoReconnect, ExecutionTimeout, OperationFailure, PyMongoError):
            if attempt == retries - 1:
                raise
            time.sleep(min(2 ** attempt * 2, 60))
            # De-duplicate the retry against what actually landed in prod.
            keys = [d[key] for d in docs if key in d]
            if keys:
                present = id_set(coll, key, {key: {"$in": keys}})
                docs = [d for d in docs if d.get(key) not in present]
            if not docs:
                return 0


def sync_candidates(ldb, pdb, missing, batch_size, throttle):
    """Insert the gmail candidates missing from prod (candidate_id indexed)."""
    ids = sorted(missing)
    inserted = 0
    for i in range(0, len(ids), batch_size):
        chunk = ids[i:i + batch_size]
        docs = list(ldb.candidates.find({"candidate_id": {"$in": chunk}}))
        for d in docs:
            d.pop("_id", None)
        inserted += insert_batch(pdb.candidates, docs, "candidate_id")
        done = i + len(chunk)
        if done % (batch_size * 20) == 0 or done == len(ids):
            print(f"  candidates: {done}/{len(ids)}", flush=True)
        time.sleep(throttle)
    return inserted


def sync_resume_versions(ldb, pdb, gmail_ids, prod_ver_ids, batch_size,
                         throttle, apply):
    """One streaming scan of the (small) resume_versions collection.

    resume_versions has no candidate_id index, so a single full scan is cheaper
    than per-id lookups. In dry-run mode it only counts; in apply mode it also
    inserts.
    """
    batch = []
    counted = inserted = 0
    for d in ldb.resume_versions.find({}):
        if d.get("candidate_id") not in gmail_ids:
            continue
        if d.get("version_id") in prod_ver_ids:
            continue
        counted += 1
        if apply:
            d.pop("_id", None)
            batch.append(d)
            if len(batch) >= batch_size:
                inserted += insert_batch(pdb.resume_versions, batch, "version_id")
                batch = []
                if counted % (batch_size * 20) == 0:
                    print(f"  resume_versions: {counted} ...", flush=True)
                time.sleep(throttle)
    if apply and batch:
        inserted += insert_batch(pdb.resume_versions, batch, "version_id")
    return counted, inserted


def prod_file_ids_for(pdb, gmail_ids, chunk_size=RF_CANDIDATE_CHUNK):
    """prod resume_files version_ids for the gmail candidates, index-backed.

    ``resume_files`` holds the binary CV content (~288 KB/doc). A full-collection
    scan (even projected to one field) reads ~1.8 GB and exceeds Cosmos free
    tier's per-command time limit (code 50). The collection is indexed on
    ``(candidate_id, version)``, so querying it in bounded candidate_id chunks
    touches only the documents for those candidates.
    """
    ids = sorted(gmail_ids)
    out = set()
    for i in range(0, len(ids), chunk_size):
        cids = ids[i:i + chunk_size]
        out.update(d.get("version_id") for d in pdb.resume_files.find(
            {"candidate_id": {"$in": cids}}, {"_id": 0, "version_id": 1}))
    return out


def sync_resume_files(ldb, pdb, gmail_ids, prod_file_ids, batch_size, throttle):
    """Insert gmail resume_files missing from prod, via the candidate_id index.

    resume_files is the binary-heavy collection (~288 KB/doc), so we fetch it in
    bounded candidate_id chunks (short-lived cursors) rather than one scan that
    would exceed MongoDB's 30-minute cursor cap.
    """
    gmail_sorted = sorted(gmail_ids)
    batch = []
    counted = inserted = 0
    for i in range(0, len(gmail_sorted), RF_CANDIDATE_CHUNK):
        cids = gmail_sorted[i:i + RF_CANDIDATE_CHUNK]
        for d in ldb.resume_files.find({"candidate_id": {"$in": cids}}):
            if d.get("version_id") in prod_file_ids:
                continue
            counted += 1
            d.pop("_id", None)
            batch.append(d)
            if len(batch) >= batch_size:
                inserted += insert_batch(pdb.resume_files, batch, "version_id")
                batch = []
                if counted % (batch_size * 20) == 0:
                    print(f"  resume_files: {counted} ...", flush=True)
                time.sleep(throttle)
        if i % (RF_CANDIDATE_CHUNK * 20) == 0:
            print(f"  resume_files: scanned {i}/{len(gmail_sorted)} candidates",
                  flush=True)
    if batch:
        inserted += insert_batch(pdb.resume_files, batch, "version_id")
    return counted, inserted


def main(apply, verify):
    local = MongoClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=15000)
    prod = MongoClient(PROD_URL, tls=True, serverSelectionTimeoutMS=60000)
    ldb = local[os.environ["DB_NAME"]]
    pdb = prod[PROD_DB]

    prod.admin.command("ping")
    local.admin.command("ping")

    gmail_ids = local_gmail_ids(ldb)
    prod_cand_ids = id_set(pdb.candidates, "candidate_id")
    prod_ver_ids = id_set(pdb.resume_versions, "version_id")

    missing_cand = gmail_ids - prod_cand_ids

    print(f"local gmail candidates : {len(gmail_ids)}")
    print(f"prod candidates (all)  : {len(prod_cand_ids)}")
    print(f"NEW gmail to ADD       : {len(missing_cand)}")

    if verify:
        for coll in ("candidates", "resume_files", "resume_versions"):
            print(f"  prod {coll}: {pdb[coll].count_documents({})}")
        return 0

    missing_ver, _ = sync_resume_versions(ldb, pdb, gmail_ids, prod_ver_ids,
                                          RV_BATCH, RV_THROTTLE, apply=False)

    print(f"  candidates: {len(missing_cand)} docs to append")
    print(f"  resume_versions: {missing_ver} docs to append")
    print(f"  resume_files: ~{missing_ver} docs to append (est. via version_id)")

    if not apply:
        print("\nDry run -- nothing written. Re-run with --apply to append.")
        return 0

    prod_file_ids = prod_file_ids_for(pdb, gmail_ids)

    before = {c: pdb[c].count_documents({}) for c in
              ("candidates", "resume_files", "resume_versions")}
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    progress_path = f"added_gmail_cvs_{stamp}.json"
    state = {"run_started": stamp,
             "pending_candidates": len(missing_cand),
             "pending_resume_versions": missing_ver,
             "completed": []}
    json.dump(state, open(progress_path, "w"))

    print(f"\n  appending candidates: {len(missing_cand)} docs ...", flush=True)
    sync_candidates(ldb, pdb, missing_cand, CAND_BATCH, CAND_THROTTLE)
    state["completed"].append("candidates")
    json.dump(state, open(progress_path, "w"))
    print("  candidates done", flush=True)

    print(f"  appending resume_versions: {missing_ver} docs ...", flush=True)
    _, ins = sync_resume_versions(ldb, pdb, gmail_ids, prod_ver_ids,
                                  RV_BATCH, RV_THROTTLE, apply=True)
    state["completed"].append("resume_versions")
    json.dump(state, open(progress_path, "w"))
    print(f"  resume_versions done (inserted {ins})", flush=True)

    print(f"  appending resume_files: ~{missing_ver} docs ...", flush=True)
    _, ins = sync_resume_files(ldb, pdb, gmail_ids, prod_file_ids,
                               RF_BATCH, RF_THROTTLE)
    state["completed"].append("resume_files")
    json.dump(state, open(progress_path, "w"))
    print(f"  resume_files done (inserted {ins})", flush=True)

    print("\nProduction counts:")
    for c in ("candidates", "resume_files", "resume_versions"):
        after = pdb[c].count_documents({})
        print(f"  {c}: {before[c]} -> {after}  (+{after - before[c]})")

    n = pdb.candidates.count_documents({})
    nd = len(pdb.candidates.distinct("candidate_id"))
    print(f"\ncandidates distinct vs total: {nd} / {n}  "
          f"{'OK, no duplicates' if nd == n else 'DUPLICATES PRESENT'}")

    print(f"\nRollback record: {progress_path}")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--verify", action="store_true")
    args = p.parse_args()
    raise SystemExit(main(args.apply, args.verify))
