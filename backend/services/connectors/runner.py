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
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from services import import_queue
from services.candidate_import import import_cv, parse_bytes, persist_parsed
from services.connectors.base import Connector

logger = logging.getLogger(__name__)

# Reading a document and deciding whose it is have opposite requirements.
# Parsing is slow, self-contained, and safe to do several at a time. Identity
# resolution reads every candidate who might be a match and then writes, so two
# workers running it at once would each find no match for the same person and
# create them twice. One lock, held only across the decision, keeps
# de-duplication exact while the expensive part still runs in parallel.
_identity_lock = asyncio.Lock()


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
) -> Dict[str, Any]:
    """Import everything a connector offers.

    Returns counts and a per-document log. A failure on one document is
    recorded and the run continues -- a single malformed attachment should not
    abandon the rest of a mailbox.
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

    counts = {"created": 0, "updated": 0, "rejected": 0, "failed": 0}
    log = []
    newest_seen = since

    async for document in connector.fetch(since=since, limit=limit):
        # The connector decides what its resume point looks like -- a
        # timestamp for date-searched sources, a message UID for IMAP.
        point = connector.cursor_for(document)
        if connector.cursor_is_newer(point, newest_seen):
            newest_seen = point

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
            counts[action if action in counts else "failed"] += 1
            log.append({
                "filename": document.filename,
                "action": action,
                "candidate_id": outcome.get("candidate_id"),
                "version": outcome.get("version"),
                "changes": outcome.get("changes"),
                "sender": document.sender_email,
                "message_id": document.message_id,
            })
        except Exception as e:
            counts["failed"] += 1
            log.append({"filename": document.filename, "action": "failed", "error": str(e)[:200]})
            logger.warning("Import failed for %s: %s", document.filename, e)

    if not dry_run and newest_seen and use_cursor:
        await _save_cursor(db, connector.name, newest_seen)

    result = {
        "connector": connector.name,
        "status": "completed",
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

    counts = {"created": 0, "updated": 0, "rejected": 0, "failed": 0}
    log = []

    for document in documents:
        # Parsing a PDF is CPU-bound and takes seconds. Run on the event loop
        # it stalls every other request to the API for that whole time, which
        # is why the site crawled during earlier imports.
        parsed = await asyncio.to_thread(
            parse_bytes, document.content, document.filename
        )
        # A message with many attachments can outlast its lease honestly.
        await import_queue.extend(db, connector.name, ref, row["worker"])

        async with _identity_lock:
            outcome = await persist_parsed(
                db, parsed, document.filename, document.import_source(), document.content
            )

        action = outcome.get("action", "failed")
        counts[action if action in counts else "failed"] += 1
        log.append({"filename": document.filename, "action": action,
                    "candidate_id": outcome.get("candidate_id"),
                    "reason": outcome.get("reason")})

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
    totals = {"created": 0, "updated": 0, "rejected": 0, "failed": 0}
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
