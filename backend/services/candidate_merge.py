"""Merge two candidate records that turned out to be the same person.

Identity resolution deliberately refuses to merge on ambiguous evidence, so
pairs it cannot decide are queued for a person to judge. This carries out that
decision.

Merging is additive. One record survives and absorbs the other's detail;
nothing is discarded. The absorbed record is archived rather than deleted, so
a mistaken merge can be undone and the history of what happened stays
readable.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Fields where a missing value should be filled from the other record.
SCALAR_FIELDS = (
    "name", "email", "phone", "linkedin", "github", "portfolio",
    "location", "current_role", "current_company", "raw_text",
    "resume_hash", "text_hash", "filename",
)

# Fields combined rather than chosen between.
LIST_FIELDS = ("skills", "certifications", "education", "employment", "tags")


def _richness(candidate: Dict[str, Any]) -> int:
    """How much a record actually holds, used to pick which one survives.

    The fuller record is kept so the merge moves as little as possible, which
    keeps the surviving candidate_id stable for anything already referencing
    it.
    """
    score = 0
    for field in SCALAR_FIELDS:
        if candidate.get(field):
            score += 1
    for field in LIST_FIELDS:
        score += len(candidate.get(field) or [])
    return score


def choose_survivor(a: Dict[str, Any], b: Dict[str, Any]) -> tuple:
    """Return (survivor, absorbed).

    The fuller record wins; ties go to the older one, since it is likelier to
    be referenced elsewhere.
    """
    ra, rb = _richness(a), _richness(b)
    if ra != rb:
        return (a, b) if ra > rb else (b, a)
    return (a, b) if (a.get("created_at") or "") <= (b.get("created_at") or "") else (b, a)


def combine(survivor: Dict[str, Any], absorbed: Dict[str, Any]) -> Dict[str, Any]:
    """Build the update that folds `absorbed` into `survivor`.

    Values already present on the survivor are never overwritten -- somebody
    may have corrected them by hand.
    """
    updates: Dict[str, Any] = {}

    for field in SCALAR_FIELDS:
        if not survivor.get(field) and absorbed.get(field):
            updates[field] = absorbed[field]

    for field in LIST_FIELDS:
        current = survivor.get(field) or []
        incoming = absorbed.get(field) or []
        if not incoming:
            continue
        if field in ("education", "employment"):
            seen = {str(sorted(e.items())) for e in current if isinstance(e, dict)}
            added = [e for e in incoming
                     if isinstance(e, dict) and str(sorted(e.items())) not in seen]
            if added:
                updates[field] = current + added
        else:
            merged = list(dict.fromkeys(list(current) + list(incoming)))
            if merged != list(current):
                updates[field] = merged

    # Experience only accrues.
    a_years, b_years = survivor.get("experience_years"), absorbed.get("experience_years")
    if b_years is not None and (a_years is None or b_years > a_years):
        updates["experience_years"] = b_years

    return updates


async def merge_candidates(db, keep_id: str, absorb_id: str, user: Dict[str, Any],
                           review_id: Optional[str] = None) -> Dict[str, Any]:
    """Fold one candidate into another.

    Resume versions and timeline entries move across and are renumbered, so
    the surviving candidate carries the full application history rather than
    half of it.
    """
    survivor = await db.candidates.find_one({"candidate_id": keep_id})
    absorbed = await db.candidates.find_one({"candidate_id": absorb_id})
    if not survivor or not absorbed:
        raise ValueError("One or both candidates no longer exist")
    if keep_id == absorb_id:
        raise ValueError("Cannot merge a candidate into itself")

    survivor.pop("_id", None)
    absorbed.pop("_id", None)
    now = datetime.now(timezone.utc).isoformat()

    updates = combine(survivor, absorbed)
    updates["updated_at"] = now
    updates.setdefault("merged_from", [])
    updates["merged_from"] = list(survivor.get("merged_from") or []) + [absorb_id]

    await db.candidates.update_one({"candidate_id": keep_id}, {"$set": updates})

    # Move resume versions across, renumbering so the survivor's history reads
    # as one sequence rather than two overlapping ones.
    existing = await db.resume_versions.count_documents({"candidate_id": keep_id})
    moved = 0
    async for version in db.resume_versions.find({"candidate_id": absorb_id}).sort("version", 1):
        existing += 1
        await db.resume_versions.update_one(
            {"_id": version["_id"]},
            {"$set": {"candidate_id": keep_id, "version": existing,
                      "merged_from_candidate": absorb_id}},
        )
        moved += 1

    await db.candidate_activity.update_many(
        {"candidate_id": absorb_id}, {"$set": {"candidate_id": keep_id}}
    )

    # Archived, not deleted: a merge decided by a person can still be wrong,
    # and the original record is the only way back.
    await db.candidates_merged.insert_one({
        **absorbed,
        "merged_into": keep_id,
        "merged_at": now,
        "merged_by": user.get("user_id"),
        "merged_by_name": user.get("name"),
    })
    await db.candidates.delete_one({"candidate_id": absorb_id})

    await db.candidate_activity.insert_one({
        "candidate_id": keep_id,
        "event": "candidates_merged",
        "detail": f"Merged {absorbed.get('name') or absorb_id} into this record",
        "meta": {"absorbed": absorb_id, "fields_added": list(updates), "versions_moved": moved},
        "timestamp": now,
    })

    if review_id:
        await db.merge_reviews.update_one(
            {"review_id": review_id},
            {"$set": {"status": "merged", "resolved_at": now,
                      "resolved_by": user.get("user_id"), "kept": keep_id}},
        )

    logger.info("Merged candidate %s into %s by %s", absorb_id, keep_id, user.get("name"))

    return {
        "kept": keep_id,
        "absorbed": absorb_id,
        "fields_added": [k for k in updates if k not in ("updated_at", "merged_from")],
        "versions_moved": moved,
    }


async def resolve_review(db, review_id: str, decision: str, user: Dict[str, Any]) -> Dict[str, Any]:
    """Record a decision that does not merge -- kept separate, or deferred."""
    review = await db.merge_reviews.find_one({"review_id": review_id}, {"_id": 0})
    if not review:
        raise ValueError("Review not found")

    now = datetime.now(timezone.utc).isoformat()
    status = {"separate": "kept_separate", "later": "deferred"}.get(decision)
    if not status:
        raise ValueError("decision must be 'separate' or 'later'")

    await db.merge_reviews.update_one(
        {"review_id": review_id},
        {"$set": {"status": status, "resolved_at": now,
                  "resolved_by": user.get("user_id"),
                  "resolved_by_name": user.get("name")}},
    )

    # Recording that two records are genuinely different people stops the
    # same pair being raised again on the next import.
    if status == "kept_separate":
        for a, b in ((review["candidate_a"], review["candidate_b"]),
                     (review["candidate_b"], review["candidate_a"])):
            await db.candidates.update_one(
                {"candidate_id": a}, {"$addToSet": {"not_duplicates_of": b}}
            )

    return {"review_id": review_id, "status": status}
