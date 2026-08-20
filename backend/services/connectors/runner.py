"""Run a connector's documents through the candidate import pipeline.

Deliberately thin. All the judgement -- parsing, matching, versioning,
auditing -- lives in `candidate_import`, so every source behaves identically
and a new connector inherits that behaviour without restating it.

A cursor is stored per connector so a run resumes where the last one finished
rather than re-reading a mailbox from the beginning. Re-reading would be safe
in any case, since an identical document is recognised by its hash, but it
would be slow and would spend API quota needlessly.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from services import import_queue
from services.candidate_import import (
    import_cv,
    parse_bytes,
    persist_parsed,
    split_out_candidates,
)
from services.connectors.base import Connector

logger = logging.getLogger(__name__)

# Reading a document and deciding whose it is have opposite requirements.
# Parsing is slow, self-contained, and safe to do several at a time. Identity
# resolution reads every candidate who might be a match and then writes, so two
# workers running it at once would each find no match for the same person and
# create them twice. One lock, held only across the decision, keeps
# de-duplication exact while the expensive part still runs in parallel.
_identity_lock = asyncio.Lock()

# Container Apps ends any HTTP request at 240 seconds. A scheduled run has to
# finish well inside that, or the caller sees a 504 and retries while the first
# run is still going -- which is exactly what happened every morning from
# 10 August: two concurrent imports over an identical UID window. A partial run
# is harmless because the cursor makes whatever is left simply the next run's
# work, so stopping early is always preferable to being cut off.
DEFAULT_TIME_BUDGET_SECONDS = float(os.environ.get("MAILBOX_IMPORT_SECONDS", "180"))

# A document that keeps failing on its own merits must not hold the cursor
# still forever, so it is set aside after this many attempts and left in
# `import_failures` for someone to look at.
MAX_ATTEMPTS = 3

# Consecutive database timeouts mean the cluster is saturated, not that these
# particular documents are bad. Stop the run and let the next one try.
MAX_CONSECUTIVE_TRANSIENT = 5


def _is_transient(exc: BaseException) -> bool:
    """Whether a failure is the database being busy rather than a bad document.

    Cosmos on the free tier ends a command that runs too long with code 50
    while something else is loading the cluster -- a bulk migration, say.
    Counting that against the document would set aside a perfectly good CV and
    then skip past it, which is how ~81 messages were lost in August 2026.
    """
    if getattr(exc, "code", None) == 50:
        return True
    text = str(exc).lower()
    if "exceededtimelimit" in text or "command timeout" in text:
        return True
    try:
        from pymongo.errors import (
            AutoReconnect, ExecutionTimeout, NetworkTimeout,
            ServerSelectionTimeoutError,
        )
    except Exception:                                       # pragma: no cover
        return False
    return isinstance(exc, (AutoReconnect, ExecutionTimeout, NetworkTimeout,
                            ServerSelectionTimeoutError))


async def _record_failure(db, connector_name: str, point: Optional[str],
                          filename: str, error: str) -> int:
    """Note that a document failed on its own merits, and how often.

    Returns the attempt count so the caller can decide whether to keep the
    cursor behind it or set it aside.
    """
    now = datetime.now(timezone.utc).isoformat()
    doc = await db.import_failures.find_one_and_update(
        {"connector": connector_name, "point": point, "filename": filename},
        {"$inc": {"attempts": 1},
         "$set": {"last_error": error[:500], "last_seen": now},
         "$setOnInsert": {"first_seen": now}},
        upsert=True,
        return_document=True,
    )
    return int((doc or {}).get("attempts", 1))


async def _load_cursor(db, name: str) -> Optional[str]:
    doc = await db.import_cursors.find_one({"connector": name}, {"_id": 0})
    return (doc or {}).get("cursor")


async def _save_cursor(db, name: str, cursor: str) -> None:
    await db.import_cursors.update_one(
        {"connector": name},
        {"$set": {"connector": name, "cursor": cursor,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def run_connector(
    db,
    connector: Connector,
    limit: int = 100,
    since: Optional[str] = None,
    use_cursor: bool = True,
    dry_run: bool = False,
    time_budget: Optional[float] = DEFAULT_TIME_BUDGET_SECONDS,
) -> Dict[str, Any]:
    """Import everything a connector offers.

    Returns counts and a per-document log. A failure on one document is
    recorded and the run continues -- a single malformed attachment should not
    abandon the rest of a mailbox.

    The run stops when `time_budget` seconds have passed, or once the database
    has timed out several times in a row. Neither is a failure: the cursor only
    ever moves across documents that are genuinely finished with, so whatever
    is left is picked up by the next run. Pass `time_budget=None` for a
    long-running backfill that nothing is waiting on.
    """
    started = datetime.now(timezone.utc)

    if not connector.is_configured():
        return {
            "connector": connector.name,
            "status": "not_configured",
            "created": 0, "updated": 0, "rejected": 0, "failed": 0,
        }

    if since is None and use_cursor:
        since = await _load_cursor(db, connector.name)

    # "split" is a success: a merged recruiter deck broken into the people
    # inside it. Without a bucket of its own it fell through to "failed" -- the
    # first run after the 20 August restart reported failed=1 for a deck that
    # had imported perfectly well. The queue path has always counted it
    # properly; only this one was missing it.
    counts = {"created": 0, "updated": 0, "rejected": 0, "failed": 0, "split": 0}
    log = []
    # The resume point only moves across documents that are actually finished
    # with. It used to move for every document the connector produced, before
    # the import was even attempted, so a failure carried the cursor past a CV
    # that had never been read and nothing ever went back for it.
    newest_seen = since
    blocked = False              # an unresolved failure: do not advance past it
    consecutive_transient = 0
    stopped_early = None

    async for document in connector.fetch(since=since, limit=limit):
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        if time_budget and elapsed >= time_budget:
            stopped_early = "time_budget"
            logger.info("%s import stopping at %.0fs; the rest is the next run's work",
                        connector.name, elapsed)
            break

        # The connector decides what its resume point looks like -- a
        # timestamp for date-searched sources, a message UID for IMAP.
        point = connector.cursor_for(document)

        if dry_run:
            counts["created"] += 1
            log.append({"filename": document.filename, "action": "would_import",
                        "sender": document.sender_email})
            continue

        try:
            outcome = await import_cv(
                db, document.content, document.filename, document.import_source()
            )
            action = outcome.get("action", "failed")
            # An action with no bucket is something this code has never seen.
            # Counting it and walking on would carry the cursor past a document
            # nobody can say was imported, so it is treated as a failure.
            understood = action in counts
            counts[action if understood else "failed"] += 1
            log.append({
                "filename": document.filename,
                "action": action,
                "candidate_id": outcome.get("candidate_id"),
                "version": outcome.get("version"),
                "changes": outcome.get("changes"),
                "sender": document.sender_email,
                "message_id": document.message_id,
            })
            consecutive_transient = 0
            if not understood:
                logger.warning("Unrecognised import outcome %r for %s; holding "
                               "the cursor behind it", action, document.filename)
                blocked = True
            elif action == "failed":
                blocked = True
            elif not blocked and connector.cursor_is_newer(point, newest_seen):
                newest_seen = point
        except Exception as e:
            counts["failed"] += 1
            transient = _is_transient(e)
            log.append({"filename": document.filename, "action": "failed",
                        "transient": transient, "error": str(e)[:200]})
            logger.warning("Import failed for %s (%s): %s", document.filename,
                           "database busy" if transient else "document", e)

            if transient:
                # Nothing is wrong with this CV, so it must not be counted
                # against it, and the cursor must stay behind it.
                blocked = True
                consecutive_transient += 1
                if consecutive_transient >= MAX_CONSECUTIVE_TRANSIENT:
                    stopped_early = "database_busy"
                    logger.warning(
                        "%s import stopping: %d consecutive database timeouts. "
                        "The cursor stays at %s so nothing is skipped.",
                        connector.name, consecutive_transient, newest_seen,
                    )
                    break
            else:
                attempts = await _record_failure(
                    db, connector.name, point, document.filename, str(e))
                if attempts >= MAX_ATTEMPTS:
                    # Tried enough times to call it this document's own fault.
                    # Set it aside rather than let it hold up the mailbox.
                    logger.warning("Setting aside %s after %d attempts",
                                   document.filename, attempts)
                    if not blocked and connector.cursor_is_newer(point, newest_seen):
                        newest_seen = point
                else:
                    blocked = True

    if not dry_run and newest_seen and use_cursor:
        await _save_cursor(db, connector.name, newest_seen)

    result = {
        "connector": connector.name,
        # "partial" is a normal outcome, not a failure -- it means the run hit
        # its time budget or a busy database and left the rest for next time.
        "status": "partial" if stopped_early else "completed",
        "stopped_because": stopped_early,
        "since": since,
        "cursor": newest_seen,
        "seconds": round((datetime.now(timezone.utc) - started).total_seconds(), 1),
        **counts,
        "documents": log,
    }

    if not dry_run:
        await db.import_runs.insert_one({
            **{k: v for k, v in result.items() if k != "documents"},
            "document_count": len(log),
            "ran_at": started.isoformat(),
        })

    logger.info(
        "%s import: %d created, %d updated, %d rejected, %d failed",
        connector.name, counts["created"], counts["updated"],
        counts["rejected"], counts["failed"],
    )
    return result


# ---------------------------------------------------------------------------
# Queue-based import
# ---------------------------------------------------------------------------

async def fill_queue(db, connector: Connector, since: Optional[str] = None) -> Dict[str, Any]:
    """Put every message the connector can see into the queue.

    Cheap enough to re-run whenever new mail arrives: references already queued
    are rejected by a unique index, so this adds only what is genuinely new.
    """
    if not connector.is_configured():
        return {"status": "not_configured", "added": 0}

    await import_queue.ensure_indexes(db)
    refs = await connector.list_refs(since=since)
    added = await import_queue.enqueue(db, connector.name, refs)
    logger.info("%s queue: %d message(s) seen, %d newly queued", connector.name, len(refs), added)
    return {"status": "ok", "seen": len(refs), "added": added,
            **await import_queue.stats(db, connector.name)}


async def _process_one(db, connector: Connector, row: Dict[str, Any]) -> Dict[str, Any]:
    """Import the documents on one queued message."""
    ref = row["ref"]
    documents = await connector.fetch_ref(ref)

    counts = {"created": 0, "updated": 0, "rejected": 0, "failed": 0, "split": 0}
    log = []

    async def record(parsed, name, body):
        async with _identity_lock:
            outcome = await persist_parsed(
                db, parsed, name, document.import_source(), body
            )
        action = outcome.get("action", "failed")
        counts[action if action in counts else "failed"] += 1
        log.append({"filename": name, "action": action,
                    "candidate_id": outcome.get("candidate_id"),
                    "reason": outcome.get("reason")})

    for document in documents:
        # Parsing a PDF is CPU-bound and takes seconds. Run on the event loop
        # it stalls every other request to the API for that whole time, which
        # is why the site crawled during earlier imports.
        parsed = await asyncio.to_thread(
            parse_bytes, document.content, document.filename
        )
        # A message with many attachments can outlast its lease honestly.
        await import_queue.extend(db, connector.name, ref, row["worker"])

        # A recruiter's merged deck is imported as the people inside it rather
        # than as one candidate named after its cover page.
        pieces = await asyncio.to_thread(
            split_out_candidates, parsed, document.content, document.filename
        )
        if pieces:
            counts["split"] += 1
            log.append({"filename": document.filename, "action": "split",
                        "candidates": len(pieces)})
            for body, name in pieces:
                piece = await asyncio.to_thread(parse_bytes, body, name)
                await record(piece, name, body)
                await import_queue.extend(db, connector.name, ref, row["worker"])
            continue

        await record(parsed, document.filename, document.content)

    return {"documents": len(documents), **counts, "detail": log}


async def drain_queue(db, connector: Connector, limit: int = 200,
                      workers: int = 3) -> Dict[str, Any]:
    """Work the queue until it is empty or `limit` messages have been done.

    Each worker leases a message, imports it, and marks the row. Nothing is
    tracked in memory, so stopping this -- a restart, a lost connection, the
    machine sleeping -- costs at most the messages currently leased, and those
    return to the queue by themselves once their leases expire.
    """
    if not connector.is_configured():
        return {"status": "not_configured"}

    await import_queue.ensure_indexes(db)
    started = datetime.now(timezone.utc)
    totals = {"created": 0, "updated": 0, "rejected": 0, "failed": 0, "split": 0}
    processed = errors = 0
    # Claims left to hand out. Decremented before a worker claims, so the run
    # stops at `limit` messages rather than at limit plus however many workers
    # happened to be mid-flight. Safe without a lock: the workers share one
    # event loop, and this is not touched across an await.
    budget = limit

    async def work():
        nonlocal processed, errors, budget
        me = import_queue.worker_id()
        while True:
            if budget <= 0:
                return
            budget -= 1

            row = await import_queue.claim(db, connector.name, me)
            if not row:
                return

            try:
                result = await _process_one(db, connector, row)
                await import_queue.finish(db, connector.name, row["ref"], result)
                for k in totals:
                    totals[k] += result.get(k, 0)
                processed += 1
            except Exception as e:
                errors += 1
                await import_queue.fail(db, connector.name, row["ref"], f"{type(e).__name__}: {e}")
                logger.warning("Queued message %s failed: %s", row["ref"], e)

    await asyncio.gather(*[work() for _ in range(max(1, workers))])

    return {
        "connector": connector.name,
        "status": "completed",
        "messages": processed,
        "errors": errors,
        "seconds": round((datetime.now(timezone.utc) - started).total_seconds(), 1),
        **totals,
        **await import_queue.stats(db, connector.name),
    }
