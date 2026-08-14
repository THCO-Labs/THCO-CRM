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
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

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
    name_from_filename,
)

logger = logging.getLogger(__name__)

# Fields carried from a parsed CV onto the candidate record.
PROFILE_FIELDS = (
    "name", "email", "phone", "linkedin", "github", "portfolio",
    "skills", "experience_years", "education", "employment", "certifications",
)

# A mailbox carries far more than CVs. Contracts, invoices, proposals and
# signed agreements are all PDFs bearing a name, an email and a phone number,
# so the presence of contact details is not evidence that a document is a
# resume. These signals decide it on content instead.
_CV_SECTION_WORDS = (
    # English
    "work experience", "professional experience", "employment history",
    "career history", "education", "qualifications", "academic",
    "skills", "competencies", "certifications", "referees", "references",
    "career objective", "personal profile", "professional summary",
    "work history", "achievements", "personal details", "date of birth",
    # The corpus is international -- CVs arrive in French, Spanish,
    # Portuguese, Indonesian and Turkish. Judging them on English headings
    # alone rejected roughly one real candidate in ten.
    "expérience professionnelle", "experience professionnelle", "formation",
    "compétences", "competences", "coordonnées", "coordonnees", "état civil",
    "experiencia laboral", "experiencia profesional", "formación académica",
    "formacion academica", "habilidades", "datos personales", "objetivo",
    "experiência profissional", "formação", "competências",
    "pengalaman kerja", "pendidikan", "keahlian", "data pribadi",
    "riwayat hidup", "biografi", "jenis kelamin", "tempat, tanggal lahir",
    "iş deneyimi", "eğitim bilgileri", "kişisel bilgiler", "iletişim bilgileri",
)

# "Curriculum vitae" states outright what the document is, in most of the
# languages that matter here. Weighted separately because it is close to
# conclusive on its own.
_CV_DECLARATIONS = (
    "curriculum vitae", "resume", "résumé", "curriculo", "currículo",
    "hoja de vida", "lebenslauf", "özgeçmiş", "riwayat hidup", "cv",
)

# Wording that indicates a different kind of business document. Present in
# strength, these outweigh an incidental "education" mention.
_NON_CV_MARKERS = (
    "invoice", "purchase order", "tax invoice", "amount due", "bill to",
    "terms and conditions", "this agreement", "hereinafter", "the parties",
    "witnesseth", "in witness whereof", "statement of work",
    "scope of work", "payment terms", "remittance", "vat registration",
    "quotation", "proforma", "receipt no", "account number",
    "non-disclosure", "confidentiality agreement", "memorandum of understanding",
)


# Addresses that belong to the sender or the agency rather than a candidate,
# and so should not be counted when deciding how many people a document covers.
_NON_CANDIDATE_EMAIL = re.compile(
    r"@(thcohq|thco)\.|noreply|no-reply|donotreply|info@|admin@|careers@|hr@|"
    r"recruit|support@|sales@|example\.(com|org)",
    re.IGNORECASE,
)


# The cover and section wording of an agency profile deck. Two or more of
# these is the deck's own structure repeating, once per candidate inside it.
_BUNDLE_MARKERS = re.compile(
    r"talent profiles|candidate profile|profiles presented|shortlisted candidates",
    re.IGNORECASE,
)


def people_in(text: str) -> int:
    """How many distinct people a document appears to describe.

    Counted on email addresses, which are the one identifier a CV almost always
    carries exactly one of.
    """
    found = {
        m.group(0).lower()
        for m in re.finditer(r"[A-Za-z0-9][\w.+-]*@[\w-]+\.[\w.-]*[A-Za-z]", text or "")
        if not _NON_CANDIDATE_EMAIL.search(m.group(0))
    }
    return len(found)


def is_bundle(text: str, filename: str = "") -> tuple:
    """Whether a document is several CVs merged into one file.

    Both signals are required. Counting addresses alone is far too eager --
    plenty of ordinary CVs list two or three referees with their emails, and on
    this corpus a three-address rule condemned 959 documents to catch about a
    dozen real bundles. Deck wording alone is not enough either, since a single
    CV can say "candidate profile" about itself. Together they are specific:
    they match the agency decks and almost nothing else.
    """
    text = text or ""
    people = people_in(text)
    if people < 3:
        return False, ""
    if len(_BUNDLE_MARKERS.findall(text)) >= 2 or "merged" in (filename or "").lower():
        return True, f"appears to bundle {people} people; needs splitting before import"
    return False, ""


def looks_like_cv(parsed: Dict[str, Any]) -> tuple:
    """Judge whether a parsed document is actually somebody's CV.

    Returns (is_cv, reason). Scored rather than decided on any single signal,
    because CV layouts vary enormously -- some carry no explicit headings at
    all, and a strict rule would reject real candidates.
    """
    text = (parsed.get("raw_text") or "").lower()
    if len(text) < 200:
        return False, "document contains too little text to be a CV"

    # Note that nothing is rejected here for looking like a bundle. Whether a
    # document holds several people is decided by trying to take it apart --
    # see `split_out_candidates` -- because the text alone is not evidence.
    # Agencies name ordinary single-candidate CVs "..._merged.pdf" and put
    # their own deck wording on them, and rejecting on that discarded real
    # people. A document only fails to import here on its own merits.

    sections = sum(1 for w in _CV_SECTION_WORDS if w in text)
    negatives = sum(1 for w in _NON_CV_MARKERS if w in text)
    # Only the opening of a document declares what it is; the word "resume"
    # appearing deep in a contract's prose means nothing.
    declared = any(d in text[:400] for d in _CV_DECLARATIONS)

    structured = sum(bool(parsed.get(f)) for f in ("education", "employment", "certifications"))
    contact = sum(bool(parsed.get(f)) for f in ("email", "phone", "linkedin"))
    skills = len(parsed.get("skills") or [])

    score = 0.0
    score += min(sections, 5) * 0.9        # section headings are the clearest tell
    score += structured * 1.2              # parsed education/employment is stronger still
    score += min(skills, 6) * 0.25
    score += contact * 0.4
    if declared:
        score += 2.0                       # the document names itself a CV
    # Business documents state their own nature repeatedly; one stray mention
    # should not condemn a CV, several should.
    score -= negatives * 1.6

    if negatives >= 3 and structured == 0 and not declared:
        return False, "reads as a business document rather than a CV"
    if score < 2.2:
        return False, f"does not read as a CV (score {score:.1f})"
    return True, ""


def parse_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Parse a CV into the structured shape the pipeline works with."""
    text = extract_text(file_bytes, filename) or ""
    email = extract_email(text)

    return {
        "name": extract_name(text, email) or name_from_filename(filename),
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


# Documents are kept so a recruiter can open the original rather than only the
# extracted text. Held in their own collection, fetched only when requested, so
# candidate listings are not dragging binaries around.
MAX_STORED_FILE_BYTES = 12 * 1024 * 1024

_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".rtf": "application/rtf",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".txt": "text/plain",
}


def content_type_for(filename: str) -> str:
    lowered = (filename or "").lower()
    for ext, mime in _CONTENT_TYPES.items():
        if lowered.endswith(ext):
            return mime
    return "application/octet-stream"


async def _record_version(db, candidate_id: str, parsed: Dict[str, Any],
                          source: Dict[str, Any],
                          file_bytes: Optional[bytes] = None) -> Tuple[int, bool]:
    """Store this upload as a new resume version. Never replaces an earlier one.

    Returns the version number and whether the document itself was kept, so
    the caller only advertises a viewable CV when there is one to view.
    """
    version = await db.resume_versions.count_documents({"candidate_id": candidate_id}) + 1
    version_id = str(uuid.uuid4())
    filename = parsed.get("filename")

    stored = False
    if file_bytes and len(file_bytes) <= MAX_STORED_FILE_BYTES:
        try:
            await db.resume_files.insert_one({
                "version_id": version_id,
                "candidate_id": candidate_id,
                "version": version,
                "filename": filename,
                "content_type": content_type_for(filename),
                "size": len(file_bytes),
                "content": file_bytes,
                "stored_at": datetime.now(timezone.utc).isoformat(),
            })
            stored = True
        except Exception as e:
            # The profile is worth keeping even if the document could not be.
            logger.warning("Could not store resume file for %s: %s", candidate_id, e)

    await db.resume_versions.insert_one({
        "version_id": version_id,
        "candidate_id": candidate_id,
        "version": version,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "filename": filename,
        "resume_hash": parsed.get("resume_hash"),
        "text_hash": parsed.get("text_hash"),
        "raw_text": parsed.get("raw_text"),
        "import_source": source.get("source"),
        "source_reference": source.get("reference"),
        "sender_email": source.get("sender_email"),
        "message_id": source.get("message_id"),
        "imported_by": source.get("imported_by"),
        "file_stored": stored,
        "file_size": len(file_bytes) if file_bytes else None,
    })
    return version, stored


async def _log_timeline(db, candidate_id: str, event: str, detail: str = "",
                        meta: Optional[Dict[str, Any]] = None) -> None:
    await db.candidate_activity.insert_one({
        "candidate_id": candidate_id,
        "event": event,
        "detail": detail,
        "meta": meta or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


def split_out_candidates(parsed: Dict[str, Any], file_bytes: bytes,
                         filename: str) -> List[Tuple[bytes, str]]:
    """Take a merged recruiter deck apart, or return nothing if it is not one.

    Trying the split is what decides the question. A text rule cannot: agencies
    name ordinary one-person CVs "..._merged.pdf" and carry their deck wording
    on every page, and treating that as proof rejected real candidates. A file
    that genuinely holds several people has several candidate sections in it,
    and either they can be found or the file is treated as the single CV it
    probably is.

    The cheap text signals are still used, but only to decide whether opening
    the PDF a second time is worth it -- not to decide the outcome.
    """
    if not (filename or "").lower().endswith(".pdf") or not file_bytes:
        return []
    maybe, _ = is_bundle(parsed.get("raw_text") or "", filename)
    if not maybe:
        return []

    from services import cv_splitter

    pieces = cv_splitter.split(file_bytes, filename)
    return pieces if len(pieces) >= 2 else []


async def import_cv(db, file_bytes: bytes, filename: str,
                    source: Optional[Dict[str, Any]] = None,
                    _split_depth: int = 0) -> Dict[str, Any]:
    """Import one CV, matching it to an existing candidate where possible.

    `source` describes provenance and is stored on the version record:
        source            "upload" | "drive" | "gmail" | ...
        reference         file id, path, or similar
        sender_email      who sent it, for mailbox imports
        message_id        provider message id, for mailbox imports
        imported_by       user id, when a person initiated the import

    Returns the action taken, the candidate id, the resume version number and
    -- when an existing profile was updated -- what changed.

    Reading a document and deciding who it belongs to are separate steps
    (`parse_bytes` then `persist_parsed`) because they have opposite
    requirements: parsing is slow and independent, so several may run at once,
    while identity resolution reads the candidate list and then writes to it,
    which must happen one at a time or two workers will each conclude a person
    is new and create them twice. Callers importing a single document have no
    such concern and should keep using this.
    """
    parsed = parse_bytes(file_bytes, filename)

    # A deck becomes its candidates, each imported as the CV it is. The depth
    # guard is belt and braces: a piece cut out of a deck should never look
    # like a deck itself, and if one ever did this would otherwise not stop.
    if _split_depth == 0:
        pieces = split_out_candidates(parsed, file_bytes, filename)
        if pieces:
            results = [
                await import_cv(db, body, name, source, _split_depth=1)
                for body, name in pieces
            ]
            return {
                "action": "split",
                "filename": filename,
                "candidates": len(pieces),
                "results": results,
            }

    return await persist_parsed(db, parsed, filename, source, file_bytes)


async def persist_parsed(db, parsed: Dict[str, Any], filename: str,
                         source: Optional[Dict[str, Any]] = None,
                         file_bytes: Optional[bytes] = None) -> Dict[str, Any]:
    """Decide who an already-parsed document belongs to, and record it.

    Everything here touches candidate identity, so concurrent callers must
    serialise around it -- see the note in `import_cv`.
    """
    source = source or {"source": "upload"}

    if not any(parsed.get(f) for f in ("name", "email", "phone")):
        return {
            "action": "rejected",
            "reason": "no identifying details could be read from the document",
            "filename": filename,
        }

    # A mailbox is not a CV folder. Contracts, invoices and proposals all carry
    # a name and contact details, so the document itself has to be judged.
    is_cv, why = looks_like_cv(parsed)
    if not is_cv:
        return {"action": "rejected", "reason": why, "filename": filename}

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
        version, stored = await _record_version(db, candidate_id, parsed, source, file_bytes)
        # Only claim a viewable document when one was actually stored. Setting
        # this unconditionally put a "View original CV" button on thousands of
        # candidates whose file had never been kept, and every click 404'd.
        if stored:
            await db.candidates.update_one(
                {"candidate_id": candidate_id}, {"$set": {"has_resume_file": True}}
            )

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
        # Stored so identity matching can compare with an indexed equality
        # rather than a case-insensitive regex over every candidate.
        "name_normalised": identity.normalise_name(parsed.get("name")),
        "linkedin_slug": identity.linkedin_slug(parsed.get("linkedin")),
        "source": source.get("source", "upload"),
        "source_reference": source.get("reference"),
        "status": "new",
        "uploaded_by": source.get("imported_by"),
        "created_at": now,
        "updated_at": now,
        "last_resume_at": now,
        "has_resume_file": True,
    }
    await db.candidates.insert_one(document)
    version, stored = await _record_version(db, candidate_id, parsed, source, file_bytes)
    if not stored:
        await db.candidates.update_one(
            {"candidate_id": candidate_id}, {"$set": {"has_resume_file": False}}
        )
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
