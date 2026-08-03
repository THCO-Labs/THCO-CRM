import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from services.talent_normalize import canonical_linkedin_url, to_db_document

logger = logging.getLogger(__name__)


async def find_duplicates(db, candidate: Dict) -> List[Dict]:
    """Find duplicate external candidates by LinkedIn URL, email, phone, GitHub, or name+company."""
    matches = []

    # Strong match: LinkedIn URL. Compared in canonical form so the same
    # profile under a different country subdomain, casing, trailing slash
    # or tracking parameter resolves to one candidate.
    linkedin = candidate.get("linkedin") or candidate.get("linkedinUrl") or candidate.get("sourceUrl")
    canonical = canonical_linkedin_url(linkedin)
    if canonical:
        existing = await db.external_candidates.find_one({
            "$or": [
                {"linkedin_canonical": canonical},
                {"linkedin": canonical},
            ]
        })
        if existing:
            existing["_id"] = str(existing["_id"])
            existing["match_type"] = "linkedin"
            matches.append(existing)

    # Strong match: email
    email = candidate.get("email")
    if email:
        existing = await db.external_candidates.find_one({"email": email})
        if existing:
            existing["_id"] = str(existing["_id"])
            existing["match_type"] = "email"
            if existing not in matches:
                matches.append(existing)

    # Strong match: phone
    phone = candidate.get("phone")
    if phone:
        existing = await db.external_candidates.find_one({"phone": phone})
        if existing:
            existing["_id"] = str(existing["_id"])
            existing["match_type"] = "phone"
            if existing not in matches:
                matches.append(existing)

    # Strong match: GitHub
    github = candidate.get("github")
    if github:
        existing = await db.external_candidates.find_one({"github": github})
        if existing:
            existing["_id"] = str(existing["_id"])
            existing["match_type"] = "github"
            if existing not in matches:
                matches.append(existing)

    # Medium match: name + company
    name = candidate.get("name")
    company = candidate.get("current_company") or candidate.get("currentCompany")
    if name and company:
        existing = await db.external_candidates.find_one({
            "name": {"$regex": f"^{name}$", "$options": "i"},
            "current_company": company,
        })
        if existing:
            existing["_id"] = str(existing["_id"])
            existing["match_type"] = "name_company"
            if existing not in matches:
                matches.append(existing)

    return matches


async def deduplicate_and_save(db, candidate: Dict) -> Dict:
    """Check for duplicates, update if existing, insert if new."""
    # Collapse the search layer's camelCase aliases into the canonical
    # snake_case document shape. Writing the raw search dict was what left
    # most rows carrying both spellings, which dedup could not match on.
    doc = to_db_document(candidate)

    duplicates = await find_duplicates(db, doc)

    if duplicates:
        existing = duplicates[0]
        match_type = existing.pop("match_type", "linkedin")
        existing_id = existing["candidate_id"]

        # Merge fields (don't overwrite existing non-null fields)
        updates = {}
        for field in ["name", "email", "phone", "location", "current_role", "current_company",
                       "experience_years", "skills", "raw_text", "summary", "linkedin",
                       "linkedin_canonical", "source_url", "github", "title"]:
            new_val = doc.get(field)
            old_val = existing.get(field)
            if new_val and not old_val:
                updates[field] = new_val

        # Skills merge must run whether or not `skills` was an empty-to-full
        # transition, so newly discovered skills accumulate on repeat hits.
        new_skills = doc.get("skills") or []
        if isinstance(new_skills, list) and new_skills:
            merged = list(dict.fromkeys((existing.get("skills") or []) + new_skills))
            if merged != (existing.get("skills") or []):
                updates["skills"] = merged

        # A repeat sighting is itself signal -- the Talent Network sorts on
        # discovery_count -- so it is recorded even when the new result
        # carried no field the stored profile was missing.
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["discovery_count"] = (existing.get("discovery_count", 1) + 1)
        # Seeing a profile again means it is not stale.
        updates["stale"] = False

        await db.external_candidates.update_one(
            {"candidate_id": existing_id},
            {"$set": updates}
        )

        return {"status": "updated", "candidate_id": existing_id, "match_type": match_type}

    # No duplicate: insert
    import uuid
    cid = doc.get("candidate_id") or f"ext_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc.update({
        "candidate_id": cid,
        "discovery_count": 1,
        "first_discovered": now,
        "updated_at": now,
        "stale": False,
        "enriched": False,
    })
    await db.external_candidates.insert_one(doc)
    return {"status": "created", "candidate_id": cid}
