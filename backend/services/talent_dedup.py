import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def find_duplicates(db, candidate: Dict) -> List[Dict]:
    """Find duplicate external candidates by LinkedIn URL, email, phone, GitHub, or name+company."""
    matches = []

    # Strong match: LinkedIn URL
    linkedin = candidate.get("linkedin") or candidate.get("linkedinUrl") or candidate.get("sourceUrl")
    if linkedin:
        existing = await db.external_candidates.find_one({"linkedin": linkedin})
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
    # Normalize linkedin field
    if not candidate.get("linkedin") and candidate.get("linkedinUrl"):
        candidate["linkedin"] = candidate["linkedinUrl"]
    if not candidate.get("linkedin") and candidate.get("sourceUrl"):
        if "linkedin.com/in" in (candidate.get("sourceUrl") or ""):
            candidate["linkedin"] = candidate["sourceUrl"]

    duplicates = await find_duplicates(db, candidate)

    if duplicates:
        existing = duplicates[0]
        match_type = existing.pop("match_type", "linkedin")
        existing_id = existing["candidate_id"]

        # Merge fields (don't overwrite existing non-null fields)
        updates = {}
        for field in ["name", "email", "phone", "location", "current_role", "current_company",
                       "experience_years", "skills", "raw_text", "summary", "linkedin", "sourceUrl"]:
            new_val = candidate.get(field)
            old_val = existing.get(field)
            if new_val and not old_val:
                updates[field] = new_val

        if "skills" in updates and isinstance(updates["skills"], list):
            updates["skills"] = list(set(existing.get("skills", []) + updates["skills"]))

        if updates:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            updates["discovery_count"] = (existing.get("discovery_count", 1) + 1)
            await db.external_candidates.update_one(
                {"candidate_id": existing_id},
                {"$set": updates}
            )

        return {"status": "updated", "candidate_id": existing_id, "match_type": match_type}

    # No duplicate: insert
    import uuid
    cid = candidate.get("candidate_id") or f"ext_{uuid.uuid4().hex[:12]}"
    doc = {
        **candidate,
        "candidate_id": cid,
        "discovery_count": 1,
        "first_discovered": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "stale": False,
        "enriched": False,
    }
    await db.external_candidates.insert_one(doc)
    return {"status": "created", "candidate_id": cid}
