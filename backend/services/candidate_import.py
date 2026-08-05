"""One import pipeline for candidate CVs, whatever the source.

Every route into the candidate database -- manual upload, Google Drive, and
the Gmail connector that follows -- goes through `import_cv`. Sources differ
only in how they obtain the bytes and what provenance they can describe; the
parsing, identity resolution, versioning and audit behaviour is identical, so
adding a connector does not mean reimplementing any of it.

Two guarantees:

    a candidate is never created without first attempting to match an
    existing one, and

    a resume is never overwritten -- each upload is retained as a version.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from services import candidate_identity as identity
from services.cv_parser import (
    extract_certifications,
    extract_education,
    extract_email,
    extract_employment,
    extract_experience_years,
    extract_github,
    extract_linkedin,
    extract_name,
    extract_phone,
    extract_portfolio,
    extract_skills,
    extract_text,
)

logger = logging.getLogger(__name__)

# Fields carried from a parsed CV onto the candidate record.
PROFILE_FIELDS = (
    "name", "email", "phone", "linkedin", "github", "portfolio",
    "skills", "experience_years", "education", "employment", "certifications",
)


def parse_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Parse a CV into the structured shape the pipeline works with."""
    text = extract_text(file_bytes, filename) or ""
    email = extract_email(text)

    return {
        "name": extract_name(text, email),
        "email": email,
        "phone": extract_phone(text),
        "linkedin": extract_linkedin(text),
        "github": extract_github(text),
        "portfolio": extract_portfolio(text),
        "skills": extract_skills(text),
        "experience_years": extract_experience_years(text),
        "education": extract_education(text),
        "employment": extract_employment(text),
        "certifications": extract_certifications(text),
        "raw_text": text[:50000],
        "resume_hash": identity.resume_hash(file_bytes),
        "text_hash": identity.text_hash(text),
        "filename": filename,
    }


def _merge_profile(existing: Dict[str, Any], parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Combine a new parse into an existing candidate without losing anything.

    Scalar fields fill gaps only -- a newer CV does not overwrite a value
    somebody may have corrected by hand. List fields are unioned, so skills and
    qualifications accumulate across applications rather than being replaced by
    whatever the latest document happened to mention.
    """
    updates: Dict[str, Any] = {}

    for field in ("name", "email", "phone", "linkedin", "github", "portfolio"):
        if parsed.get(field) and not existing.get(field):
            updates[field] = parsed[field]

    if parsed.get("experience_years") is not None:
        current = existing.get("experience_years")
        # Experience only accrues; take the higher figure.
        if current is None or parsed["experience_years"] > current:
            updates["experience_years"] = parsed["experience_years"]

    if parsed.get("skills"):
        merged = list(dict.fromkeys((existing.get("skills") or []) + parsed["skills"]))
        if merged != (existing.get("skills") or []):
            updates["skills"] = merged

    if parsed.get("certifications"):
        merged = list(dict.fromkeys(
            (existing.get("certifications") or []) + parsed["certifications"]
        ))
        if merged != (existing.get("certifications") or []):
            updates["certifications"] = merged

    for field in ("education", "employment"):
        incoming = parsed.get(field) or []
        if not incoming:
            continue
        current = existing.get(field) or []
        seen = {str(sorted(e.items())) for e in current if isinstance(e, dict)}
        added = [e for e in incoming
                 if isinstance(e, dict) and str(sorted(e.items())) not in seen]
        if added:
            updates[field] = current + added

    return updates


def _changes_between(existing: Dict[str, Any], updates: Dict[str, Any]) -> List[str]:
    """Human-readable summary of what a new CV added, for the timeline."""
    notes: List[str] = []
    for field, value in updates.items():
        if field in ("skills", "certifications"):
            added = len(value) - len(existing.get(field) or [])
            if added > 0:
                notes.append(f"added {added} {field.rstrip('s')}(s)")
        elif field in ("education", "employment"):
            added = len(value) - len(existing.get(field) or [])
            if added > 0:
                notes.append(f"added {added} {field} entr{'y' if added == 1 else 'ies'}")
        elif field == "experience_years":
            notes.append(f"experience updated to {value} years")
        elif not existing.get(field):
            notes.append(f"added {field.replace('_', ' ')}")
    return notes


async def _record_version(db, candidate_id: str, parsed: Dict[str, Any],
                          source: Dict[str, Any]) -> int:
    """Store this upload as a new resume version. Never replaces an earlier one."""
    version = await db.resume_versions.count_documents({"candidate_id": candidate_id}) + 1

    await db.resume_versions.insert_one({
        "version_id": str(uuid.uuid4()),
        "candidate_id": candidate_id,
        "version": version,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "filename": parsed.get("filename"),
        "resume_hash": parsed.get("resume_hash"),
        "text_hash": parsed.get("text_hash"),
        "raw_text": parsed.get("raw_text"),
        "import_source": source.get("source"),
        "source_reference": source.get("reference"),
        "sender_email": source.get("sender_email"),
        "message_id": source.get("message_id"),
        "imported_by": source.get("imported_by"),
    })
    return version


async def _log_timeline(db, candidate_id: str, event: str, detail: str = "",
                        meta: Optional[Dict[str, Any]] = None) -> None:
    await db.candidate_activity.insert_one({
        "candidate_id": candidate_id,
        "event": event,
        "detail": detail,
        "meta": meta or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def import_cv(db, file_bytes: bytes, filename: str,
                    source: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Import one CV, matching it to an existing candidate where possible.

    `source` describes provenance and is stored on the version record:
        source            "upload" | "drive" | "gmail" | ...
        reference         file id, path, or similar
        sender_email      who sent it, for mailbox imports
        message_id        provider message id, for mailbox imports
        imported_by       user id, when a person initiated the import

    Returns the action taken, the candidate id, the resume version number and
    -- when an existing profile was updated -- what changed.
    """
    source = source or {"source": "upload"}
    parsed = parse_bytes(file_bytes, filename)

    if not any(parsed.get(f) for f in ("name", "email", "phone")):
        return {
            "action": "rejected",
            "reason": "no identifying details could be read from the document",
            "filename": filename,
        }

    match = await identity.find_match(db, parsed)
    now = datetime.now(timezone.utc).isoformat()

    # ---- existing candidate -------------------------------------------------
    if match["decision"] == "update" and match["candidate"]:
        existing = match["candidate"]
        candidate_id = existing["candidate_id"]

        updates = _merge_profile(existing, parsed)
        changes = _changes_between(existing, updates)

        updates["updated_at"] = now
        updates["last_resume_at"] = now
        if parsed.get("email"):
            updates["email_normalised"] = identity.normalise_email(parsed["email"])
        if parsed.get("phone"):
            updates["phone_normalised"] = identity.normalise_phone(parsed["phone"])

        await db.candidates.update_one({"candidate_id": candidate_id}, {"$set": updates})
        version = await _record_version(db, candidate_id, parsed, source)

        await _log_timeline(
            db, candidate_id, "resume_updated",
            f"Version {version} imported from {source.get('source')}",
            {"changes": changes, "match_score": match["score"], "reasons": match["reasons"]},
        )

        return {
            "action": "updated",
            "candidate_id": candidate_id,
            "version": version,
            "match_score": match["score"],
            "match_reasons": match["reasons"],
            "changes": changes,
        }

    # ---- new candidate ------------------------------------------------------
    candidate_id = f"cand_{uuid.uuid4().hex[:12]}"
    document = {
        "candidate_id": candidate_id,
        **{f: parsed.get(f) for f in PROFILE_FIELDS},
        "raw_text": parsed.get("raw_text"),
        "resume_hash": parsed.get("resume_hash"),
        "text_hash": parsed.get("text_hash"),
        "filename": filename,
        "email_normalised": identity.normalise_email(parsed.get("email")),
        "phone_normalised": identity.normalise_phone(parsed.get("phone")),
        "source": source.get("source", "upload"),
        "source_reference": source.get("reference"),
        "status": "new",
        "uploaded_by": source.get("imported_by"),
        "created_at": now,
        "updated_at": now,
        "last_resume_at": now,
    }
    await db.candidates.insert_one(document)
    version = await _record_version(db, candidate_id, parsed, source)
    await _log_timeline(
        db, candidate_id, "resume_imported",
        f"Imported from {source.get('source')}", {"version": version},
    )

    result = {
        "action": "created",
        "candidate_id": candidate_id,
        "version": version,
    }

    # A suggestive but inconclusive match is queued rather than acted on. The
    # record is created either way, so nothing is lost while it waits.
    if match["decision"] == "review" and match["candidate"]:
        await db.merge_reviews.insert_one({
            "review_id": str(uuid.uuid4()),
            "candidate_a": candidate_id,
            "candidate_b": match["candidate"]["candidate_id"],
            "score": match["score"],
            "reasons": match["reasons"],
            "status": "pending",
            "created_at": now,
        })
        result["review_queued"] = True
        result["match_score"] = match["score"]
        result["match_reasons"] = match["reasons"]
        logger.info(
            "Possible duplicate queued for review: %s ~ %s (%.2f)",
            candidate_id, match["candidate"]["candidate_id"], match["score"],
        )

    return result
