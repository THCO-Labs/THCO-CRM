import hashlib
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24
REFRESH_DAYS = 30


def _hash_query(query: Dict) -> str:
    return hashlib.md5(str(sorted(query.items())).encode()).hexdigest()


async def get_cached_search(db, query: Dict) -> Optional[List[Dict]]:
    """Check if a search was executed within the last 24 hours."""
    qhash = _hash_query(query)
    cached = await db.candidate_search_history.find_one(
        {"query_hash": qhash, "cached_until": {"$gt": datetime.now(timezone.utc).isoformat()}},
        sort=[("searched_at", -1)]
    )
    if cached:
        return cached.get("results", [])
    return None


async def cache_search(db, query: Dict, results: List[Dict], provider: str, recruiter_id: str = None):
    """Cache search results for 24 hours."""
    qhash = _hash_query(query)
    cached_until = (datetime.now(timezone.utc) + timedelta(hours=CACHE_TTL_HOURS)).isoformat()

    # Update existing cache entry or create new
    await db.candidate_search_history.update_one(
        {"query_hash": qhash},
        {"$set": {
            "query": query,
            "results": results,
            "result_count": len(results),
            "provider": provider,
            "recruiter_id": recruiter_id,
            "searched_at": datetime.now(timezone.utc).isoformat(),
            "cached_until": cached_until,
        }},
        upsert=True
    )

    # Also track individual candidate discovery
    for candidate in results:
        cid = candidate.get("candidate_id") or candidate.get("sourceUrl")
        if cid:
            await db.candidate_search_history.update_one(
                {"candidate_id": cid, "query_hash": qhash},
                {"$setOnInsert": {
                    "candidate_id": cid,
                    "candidate_name": candidate.get("name"),
                    "query_hash": qhash,
                    "provider": provider,
                    "recruiter_id": recruiter_id,
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True
            )


async def add_to_refresh_queue(db, candidate_id: str):
    """Add a candidate to the refresh queue if profile is older than 30 days."""
    candidate = await db.external_candidates.find_one({"candidate_id": candidate_id})
    if not candidate:
        return

    stale = False
    updated_at = candidate.get("updated_at") or candidate.get("first_discovered")
    if updated_at:
        last_update = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - last_update > timedelta(days=REFRESH_DAYS):
            stale = True

    if stale:
        await db.candidate_refresh_queue.update_one(
            {"candidate_id": candidate_id},
            {"$set": {
                "candidate_id": candidate_id,
                "name": candidate.get("name"),
                "linkedin": candidate.get("linkedin"),
                "queued_at": datetime.now(timezone.utc).isoformat(),
                "status": "pending",
                "last_updated": updated_at,
            }},
            upsert=True
        )
        await db.external_candidates.update_one(
            {"candidate_id": candidate_id},
            {"$set": {"stale": True}}
        )


async def process_refresh_queue(db, limit: int = 10):
    """Process the refresh queue — re-enrich stale profiles."""
    cursor = db.candidate_refresh_queue.find({"status": "pending"}).limit(limit)
    async for item in cursor:
        try:
            from services.talent_enrichment import enrich_candidate
            await enrich_candidate(db, item["candidate_id"])
            await db.candidate_refresh_queue.update_one(
                {"candidate_id": item["candidate_id"]},
                {"$set": {"status": "completed", "processed_at": datetime.now(timezone.utc).isoformat()}}
            )
        except Exception as e:
            logger.error(f"Refresh failed for {item['candidate_id']}: {e}")
            await db.candidate_refresh_queue.update_one(
                {"candidate_id": item["candidate_id"]},
                {"$set": {"status": "failed", "error": str(e)}}
            )


async def log_activity(db, candidate_id: str, action: str, details: Dict = None):
    """Log candidate activity (viewed, refreshed, imported, enriched, deleted)."""
    await db.candidate_activity.insert_one({
        "candidate_id": candidate_id,
        "action": action,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def get_activity_timeline(db, candidate_id: str) -> List[Dict]:
    """Get activity timeline for a candidate."""
    cursor = db.candidate_activity.find({"candidate_id": candidate_id}).sort("timestamp", -1).limit(50)
    return [doc async for doc in cursor]
