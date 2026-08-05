"""Run a connector's documents through the candidate import pipeline.

Deliberately thin. All the judgement -- parsing, matching, versioning,
auditing -- lives in `candidate_import`, so every source behaves identically
and a new connector inherits that behaviour without restating it.

A cursor is stored per connector so a run resumes where the last one finished
rather than re-reading a mailbox from the beginning. Re-reading would be safe
in any case, since an identical document is recognised by its hash, but it
would be slow and would spend API quota needlessly.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from services.candidate_import import import_cv
from services.connectors.base import Connector

logger = logging.getLogger(__name__)


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
