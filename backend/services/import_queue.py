"""A durable work queue for mailbox imports.

The import used to be a cursor and a long-running loop: one process read a
batch of messages, and only when the whole batch finished did the cursor move.
That arrangement loses work for reasons that have nothing to do with the mail.
Restarting the API mid-batch discarded it. A laptop going to sleep stalled it
for as long as the lid stayed shut. Nothing recorded which message failed, so
"6 rejected" could not be traced to six documents. And because progress was a
single number, a second worker would have re-read everything the first was
already doing.

So the unit of work is one message, and it is a row.

A worker *leases* a row rather than taking it: it marks the row with its own
id and a time by which it promises to be finished. If the worker dies -- killed
process, closed laptop, lost network -- the lease simply expires and the row
becomes claimable again. Nothing needs to detect the failure or clean up after
it; the absence of a heartbeat is the signal. This is the same reason database
locks expire rather than being released explicitly.

Claiming is a single atomic find-one-and-update, so two workers racing for the
same row cannot both win: the loser's filter no longer matches and it moves to
the next row. That is what makes it safe to run several workers at once.
"""

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# How long a worker may hold a row before it is presumed dead. A single message
# means one IMAP fetch and one PDF parse; the slowest observed are a few
# minutes, so this is generous enough not to revoke a lease from a worker that
# is merely slow.
LEASE_SECONDS = int(os.environ.get("IMPORT_LEASE_SECONDS", "900"))

# A message that fails this many times is set aside rather than retried
# forever. A CV that cannot be parsed will not become parseable on the fourth
# attempt, and retrying it blocks the rest of the backlog.
MAX_ATTEMPTS = int(os.environ.get("IMPORT_MAX_ATTEMPTS", "3"))

PENDING, LEASED, DONE, FAILED = "pending", "leased", "done", "failed"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def ensure_indexes(db) -> None:
    """Indexes the queue needs to claim rows without scanning.

    The unique key is what makes enqueueing idempotent: filling the queue twice
    from the same mailbox cannot produce the same message twice.
    """
    await db.import_tasks.create_index(
        [("connector", 1), ("ref", 1)], unique=True, name="task_identity"
    )
    # The claim query: rows for this connector, in one of the claimable states,
    # oldest first.
    await db.import_tasks.create_index(
        [("connector", 1), ("state", 1), ("lease_until", 1), ("ref_sort", 1)],
        name="task_claim",
    )
    await db.import_tasks.create_index([("state", 1)], name="task_state")


async def enqueue(db, connector: str, refs: List[str]) -> int:
    """Add message references to the queue, ignoring any already present.

    Returns how many were genuinely new. Safe to call repeatedly -- the unique
    index means re-filling from a mailbox adds only what has appeared since.
    """
    if not refs:
        return 0

    now = _now()
    rows = [
        {
            "connector": connector,
            "ref": str(r),
            # Kept alongside `ref` so the queue drains in mailbox order.
            # A string sort would put UID 9 after UID 10.
            "ref_sort": int(r) if str(r).isdigit() else 0,
            "state": PENDING,
            "attempts": 0,
            "lease_until": None,
            "worker": None,
            "queued_at": now.isoformat(),
        }
        for r in refs
    ]

    added = 0
    # Chunked so one oversized insert cannot exhaust memory on a large mailbox,
    # and unordered so a single duplicate does not abandon the rest of the
    # chunk -- duplicates are the expected case here, not an error.
    for start in range(0, len(rows), 1000):
        chunk = rows[start:start + 1000]
        try:
            result = await db.import_tasks.insert_many(chunk, ordered=False)
            added += len(result.inserted_ids)
        except Exception as e:  # BulkWriteError for the duplicates we expect
            written = getattr(e, "details", {}).get("nInserted")
            if written is None:
                raise
            added += written
    return added


async def claim(db, connector: str, worker: str) -> Optional[Dict[str, Any]]:
    """Take the next available row, or None when there is nothing to do.

    A row is available when it has never been started, or when whoever started
    it has stopped saying so. Both cases are expressed in one filter, and the
    update that claims it is part of the same operation, so the row cannot be
    claimed twice.
    """
    now = _now()
    claimable = {
        "connector": connector,
        "$or": [
            {"state": PENDING},
            # An expired lease. The previous worker is gone; nobody had to
            # notice or tidy up.
            {"state": LEASED, "lease_until": {"$lt": now.isoformat()}},
        ],
        "attempts": {"$lt": MAX_ATTEMPTS},
    }
    return await db.import_tasks.find_one_and_update(
        claimable,
        {
            "$set": {
                "state": LEASED,
                "worker": worker,
                "leased_at": now.isoformat(),
                "lease_until": (now + timedelta(seconds=LEASE_SECONDS)).isoformat(),
            },
            "$inc": {"attempts": 1},
        },
        sort=[("ref_sort", 1)],
        return_document=True,
        projection={"_id": 0},
    )


async def extend(db, connector: str, ref: str, worker: str) -> None:
    """Push a lease out while the work is still going.

    A message carrying twenty attachments can outlast a lease honestly. Without
    this, a slow row would be handed to a second worker while the first was
    still working on it, and both would import the same CVs.
    """
    await db.import_tasks.update_one(
        {"connector": connector, "ref": str(ref), "worker": worker},
        {"$set": {"lease_until": (_now() + timedelta(seconds=LEASE_SECONDS)).isoformat()}},
    )


async def finish(db, connector: str, ref: str, outcome: Dict[str, Any]) -> None:
    """Mark a row done and keep what happened to it.

    The per-document outcome is stored on the row, which is the point of having
    rows at all: "rejected" is now attributable to a message, a filename and a
    reason rather than being one number in a batch total.
    """
    await db.import_tasks.update_one(
        {"connector": connector, "ref": str(ref)},
        {"$set": {
            "state": DONE,
            "finished_at": _now().isoformat(),
            "lease_until": None,
            "worker": None,
            "outcome": outcome,
        },
         # An error from an earlier attempt is history once the message goes
         # through. Left in place it reads as a current fault, and a row that
         # says both "done" and "BadZipFile" invites the wrong conclusion.
         "$unset": {"last_error": "", "failed_at": ""}},
    )


async def fail(db, connector: str, ref: str, error: str) -> None:
    """Record a failure, and set the row aside once it has had its attempts.

    Left pending, a row that always fails is claimed again immediately and the
    queue makes no progress. Marking it failed keeps it visible and out of the
    way, so the backlog is never blocked by one unreadable attachment.
    """
    row = await db.import_tasks.find_one(
        {"connector": connector, "ref": str(ref)}, {"_id": 0, "attempts": 1}
    )
    attempts = (row or {}).get("attempts", MAX_ATTEMPTS)
    exhausted = attempts >= MAX_ATTEMPTS

    await db.import_tasks.update_one(
        {"connector": connector, "ref": str(ref)},
        {"$set": {
            "state": FAILED if exhausted else PENDING,
            "lease_until": None,
            "worker": None,
            "last_error": error[:400],
            "failed_at": _now().isoformat(),
        }},
    )
    if exhausted:
        logger.warning("Import gave up on %s message %s: %s", connector, ref, error[:160])


async def stats(db, connector: str) -> Dict[str, Any]:
    """Queue depth by state, plus the failures worth a person's attention."""
    counts = {r["_id"]: r["n"] async for r in db.import_tasks.aggregate([
        {"$match": {"connector": connector}},
        {"$group": {"_id": "$state", "n": {"$sum": 1}}},
    ])}
    total = sum(counts.values())
    done = counts.get(DONE, 0)
    return {
        "queued": total,
        "pending": counts.get(PENDING, 0),
        "in_progress": counts.get(LEASED, 0),
        "done": done,
        "failed": counts.get(FAILED, 0),
        "percent_complete": round(100 * done / total, 1) if total else 0.0,
        "recent_failures": await db.import_tasks.find(
            {"connector": connector, "state": FAILED},
            {"_id": 0, "ref": 1, "last_error": 1, "attempts": 1},
        ).sort("failed_at", -1).to_list(10),
    }


async def reset_failed(db, connector: str) -> int:
    """Return set-aside rows to the queue, for after a parser fix."""
    result = await db.import_tasks.update_many(
        {"connector": connector, "state": FAILED},
        {"$set": {"state": PENDING, "attempts": 0, "lease_until": None, "worker": None}},
    )
    return result.modified_count


def worker_id() -> str:
    """Identifies one worker for the life of its lease."""
    return f"{os.getpid()}-{uuid.uuid4().hex[:8]}"
