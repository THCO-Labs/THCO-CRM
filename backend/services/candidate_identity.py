"""Decide whether an incoming CV belongs to a candidate already on file.

People apply more than once. Without this, every application creates a new
record and the database slowly fills with the same people -- which is already
visible: twenty phone numbers are shared across fifty-five records.

The rule is that a candidate is never created without first attempting to
match. Where the evidence is strong the existing record is updated; where it
is suggestive but not conclusive the pair is queued for a human to decide.
Nothing is merged automatically on a weak signal.

Signals are weighted by how strongly they identify a person:

    resume hash     an identical file -- conclusive
    email           near-conclusive; people rarely share one
    phone           strong, but families and small firms do share numbers
    LinkedIn        strong when present
    GitHub          strong when present
    name            weak alone; two people share a common name easily
    education       corroborating only
    employer        corroborating only

Bands:
    >= 0.85  update the existing candidate
    >= 0.55  create the record, queue a merge review
    <  0.55  a new person
"""

import hashlib
import logging
import time
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

AUTO_MATCH = 0.85
REVIEW_MATCH = 0.55

WEIGHTS = {
    "resume_hash": 1.00,
    "email": 0.80,
    "phone": 0.55,
    "linkedin": 0.55,
    "github": 0.45,
    "name_exact": 0.30,
    "name_partial": 0.15,
    "education": 0.10,
    "employer": 0.10,
}


def resume_hash(file_bytes: bytes) -> str:
    """SHA256 of the uploaded file, used to spot an identical resubmission."""
    return hashlib.sha256(file_bytes).hexdigest()


def text_hash(text: str) -> str:
    """Hash of normalised CV text.

    Catches the same document re-exported or re-saved, where the bytes differ
    but the content does not.
    """
    normalised = re.sub(r"\s+", " ", (text or "").strip().lower())
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


def normalise_email(value: Optional[str]) -> Optional[str]:
    if not value or "@" not in value:
        return None
    local, _, domain = value.strip().lower().partition("@")
    # Gmail ignores dots and anything after a plus.
    if domain in ("gmail.com", "googlemail.com"):
        stripped = local.split("+", 1)[0].replace(".", "")
        # Only when something is left. A CV that runs a phone number into the
        # address -- "+2348022747706.femooshad@gmail.com" -- has no local part
        # before the plus, and taking it anyway produced "@gmail.com": a key
        # that three unrelated people shared and that identity matching would
        # have treated as the same person.
        if stripped:
            local = stripped
    if not local:
        return None
    return f"{local}@{domain}"


def normalise_phone(value: Optional[str]) -> Optional[str]:
    """Reduce a phone number to comparable digits.

    Nigerian numbers appear as 0803..., +234803... and 234803... for the same
    line, so the national trunk zero and country code are stripped to leave a
    common form.
    """
    if not value:
        return None
    digits = re.sub(r"\D", "", str(value))
    if not digits:
        return None
    if digits.startswith("234") and len(digits) > 10:
        digits = digits[3:]
    elif digits.startswith("00234"):
        digits = digits[5:]
    digits = digits.lstrip("0")
    return digits[-10:] if len(digits) >= 10 else digits


def normalise_name(value: Optional[str]) -> str:
    if not value:
        return ""
    cleaned = re.sub(r"[^a-z\s]", " ", str(value).lower())
    return " ".join(cleaned.split())


def _name_tokens(value: Optional[str]) -> set:
    return {t for t in normalise_name(value).split() if len(t) > 2}


def linkedin_slug(url: Optional[str]) -> Optional[str]:
    """The profile handle from a LinkedIn URL, lowercased.

    Public because it is stored on the candidate as `linkedin_slug`, so that
    matching is an indexed equality rather than a regex across every record.
    """
    if not url:
        return None
    match = re.search(r"linkedin\.com/in/([^/?#]+)", str(url), re.IGNORECASE)
    return match.group(1).strip().lower().rstrip("/") if match else None


# Kept for the existing internal call sites.
_linkedin_slug = linkedin_slug


def _github_user(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    match = re.search(r"github\.com/([\w\-.]+)", str(url), re.IGNORECASE)
    return match.group(1).strip().lower() if match else None


def score_pair(incoming: Dict[str, Any], existing: Dict[str, Any]) -> Tuple[float, List[str]]:
    """Score how likely two candidate records are the same person.

    Returns the score capped at 1.0 and the reasons that contributed, so a
    reviewer can see why a pair was proposed rather than being handed a bare
    number.
    """
    score = 0.0
    reasons: List[str] = []

    for field in ("resume_hash", "text_hash"):
        a, b = incoming.get(field), existing.get(field)
        if a and b and a == b:
            return 1.0, ["identical resume content"]

    a, b = normalise_email(incoming.get("email")), normalise_email(existing.get("email"))
    if a and b and a == b:
        score += WEIGHTS["email"]
        reasons.append("same email")

    a, b = normalise_phone(incoming.get("phone")), normalise_phone(existing.get("phone"))
    if a and b and a == b and len(a) >= 7:
        score += WEIGHTS["phone"]
        reasons.append("same phone")

    a, b = _linkedin_slug(incoming.get("linkedin")), _linkedin_slug(existing.get("linkedin"))
    if a and b and a == b:
        score += WEIGHTS["linkedin"]
        reasons.append("same LinkedIn")

    a, b = _github_user(incoming.get("github")), _github_user(existing.get("github"))
    if a and b and a == b:
        score += WEIGHTS["github"]
        reasons.append("same GitHub")

    name_a, name_b = normalise_name(incoming.get("name")), normalise_name(existing.get("name"))
    if name_a and name_b:
        if name_a == name_b:
            score += WEIGHTS["name_exact"]
            reasons.append("same name")
        else:
            shared = _name_tokens(name_a) & _name_tokens(name_b)
            if len(shared) >= 2:
                score += WEIGHTS["name_partial"]
                reasons.append("overlapping name")

    inst_a = {
        (e.get("institution") or "").lower()
        for e in (incoming.get("education") or []) if e.get("institution")
    }
    inst_b = {
        (e.get("institution") or "").lower()
        for e in (existing.get("education") or []) if e.get("institution")
    }
    if inst_a & inst_b:
        score += WEIGHTS["education"]
        reasons.append("shared institution")

    return min(score, 1.0), reasons


async def find_match(db, incoming: Dict[str, Any]) -> Dict[str, Any]:
    """Look for the candidate this CV belongs to.

    Only records sharing at least one identifying value are scored, rather
    than the whole collection -- with 1,305 candidates and growing, scanning
    everything on each import would not hold up.
    """
    email = normalise_email(incoming.get("email"))
    phone = normalise_phone(incoming.get("phone"))
    slug = _linkedin_slug(incoming.get("linkedin"))
    name_tokens = _name_tokens(incoming.get("name"))

    clauses: List[Dict[str, Any]] = []
    if incoming.get("resume_hash"):
        clauses.append({"resume_hash": incoming["resume_hash"]})
    if incoming.get("text_hash"):
        clauses.append({"text_hash": incoming["text_hash"]})
    if email:
        clauses.append({"email_normalised": email})
    if phone:
        clauses.append({"phone_normalised": phone})
    # Matched on stored normalised forms rather than case-insensitive regex.
    # A regex with $options "i" cannot use an index, so each of these clauses
    # was reading the whole collection -- fine at a thousand candidates,
    # ruinous at twenty thousand, and it degraded as the import succeeded.
    if slug:
        clauses.append({"linkedin_slug": slug})
    if name_tokens:
        clauses.append({"name_normalised": normalise_name(incoming.get("name"))})

    if not clauses:
        return {"decision": "create", "score": 0.0, "candidate": None, "reasons": []}

    best, best_score, best_reasons = None, 0.0, []

    # One query per clause rather than a single `$or` over all of them.
    #
    # Every field here is indexed, so `$or` ought to be the obvious way to ask.
    # On Cosmos it is not: measured against production over five candidates,
    # the `$or` took 23-73 seconds (median 36) while the same clauses asked one
    # at a time took 0.5-7.9 seconds (median 1.5). Every sample agreed. That one
    # query was most of the cost of importing a CV -- documents were taking
    # around 20 seconds each, and two in a run of ten took 52 and 112 seconds.
    #
    # The set considered is unchanged: the union of everything matching any
    # clause, still capped at 50 records so a common name cannot make this
    # unbounded.
    _t0 = time.monotonic()
    found: Dict[str, Any] = {}
    for clause in clauses:
        if len(found) >= 50:
            break
        async for existing in db.candidates.find(clause).limit(50):
            key = existing.get("candidate_id") or str(existing.get("_id"))
            if key not in found:
                found[key] = existing
            if len(found) >= 50:
                break

    for existing in found.values():
        # A pair a recruiter has already judged to be different people is not
        # raised again, however similar the records look.
        if incoming.get("candidate_id") in (existing.get("not_duplicates_of") or []):
            continue
        score, reasons = score_pair(incoming, existing)
        if score > best_score:
            best, best_score, best_reasons = existing, score, reasons

    _elapsed = time.monotonic() - _t0
    if _elapsed > 1.0:
        logger.info("identity lookup took %.1fs over %d clause(s), %d record(s) scored",
                    _elapsed, len(clauses), len(found))

    # A name-only agreement is not identification. Two people called
    # "Chinedu Okeke" are not the same person, and merging them loses a real
    # candidate -- so anything resting on the name alone is sent for review.
    identifying = {"identical resume content", "same email", "same phone",
                   "same LinkedIn", "same GitHub"}
    has_identifier = any(r in identifying for r in best_reasons)

    if best is None:
        decision = "create"
    elif best_score >= AUTO_MATCH and has_identifier:
        decision = "update"
    elif best_score >= REVIEW_MATCH:
        decision = "review"
    else:
        decision = "create"

    if best is not None:
        best.pop("_id", None)

    return {
        "decision": decision,
        "score": round(best_score, 3),
        "candidate": best,
        "reasons": best_reasons,
    }
