"""Shared normalization for external candidate sourcing.

Single source of truth for three things that were previously duplicated
(or missing) across the SerpAPI / Serper / DuckDuckGo search paths:

1. Nigerian-only geo verification  -- `is_nigerian_result`
2. LinkedIn URL canonicalization   -- `canonical_linkedin_url`
3. Search-result -> DB document    -- `to_db_document`

The search layer speaks camelCase (consumed by ExternalSourcing.jsx);
the DB layer speaks snake_case (consumed by TalentNetwork.jsx and
FindCandidates.jsx). `to_db_document` is the only bridge between them.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

# ── Geography ─────────────────────────────────────────────────────────

# Cities/states used to positively identify a Nigerian profile. Matched on
# word boundaries -- naive substring matching produced false positives
# ("Delta Air Lines", surnames containing "Rivers").
NIGERIAN_PLACES = [
    "nigeria", "nigerian", "lagos", "abuja", "port harcourt", "ibadan",
    "kano", "enugu", "benin city", "owerri", "abeokuta", "ilorin", "jos",
    "kaduna", "warri", "uyo", "calabar", "onitsha", "aba", "akure",
    "maiduguri", "zaria", "oyo state", "delta state", "rivers state",
    "anambra", "abia state", "ogun state", "osun", "ekiti", "kwara",
    "edo state", "imo state", "bayelsa", "cross river", "akwa ibom",
]

_NG_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(p) for p in NIGERIAN_PLACES) + r")\b", re.I
)

# Nigerian LinkedIn subdomain, plus generic .ng domain markers.
_NG_URL_PATTERN = re.compile(r"(^|//)ng\.linkedin\.com|\.ng/|/ng/|\.com\.ng\b", re.I)

# Any two/three letter LinkedIn country subdomain, e.g. uk.linkedin.com
_CC_PATTERN = re.compile(r"https?://([a-z]{2,3})\.linkedin\.com", re.I)

# Subdomains that are not country-specific and carry no geo signal.
_NEUTRAL_SUBDOMAINS = {"www", "ng"}

# Search terms that are locations but prove nothing about nationality.
AMBIGUOUS_LOCATIONS = {"remote", "any", "", "africa", "worldwide"}


def linkedin_country_code(url: str) -> Optional[str]:
    """Return the LinkedIn country subdomain ('ng', 'uk', ...) or None."""
    if not url:
        return None
    m = _CC_PATTERN.match(url.strip())
    return m.group(1).lower() if m else None


def is_nigerian_result(
    url: str = "", title: str = "", snippet: str = ""
) -> Tuple[bool, str]:
    """Decide whether a search result belongs to a Nigeria-based person.

    Returns (is_nigerian, reason). Strict by design: the platform sources
    Nigerian talent only, so anything not positively verified is rejected
    rather than assumed. This prevents paid SerpAPI/Serper credits from
    being spent storing profiles that will never be shortlisted.
    """
    url = url or ""
    blob = f"{title or ''} {snippet or ''}"

    cc = linkedin_country_code(url)

    # Strong negative: an explicit non-Nigerian country subdomain.
    if cc and cc not in _NEUTRAL_SUBDOMAINS:
        return False, f"non-Nigerian LinkedIn domain ({cc}.linkedin.com)"

    # Strong positive: Nigerian domain markers.
    if _NG_URL_PATTERN.search(url):
        return True, "Nigerian LinkedIn domain"

    # Positive: a Nigerian place named in the title or snippet.
    m = _NG_PATTERN.search(blob)
    if m:
        return True, f"Nigerian location in profile text ({m.group(1).lower()})"

    return False, "no Nigerian location signal"


def detect_location(
    url: str = "", title: str = "", snippet: str = "", fallback: str = ""
) -> Optional[str]:
    """Derive the candidate's location from the profile itself.

    The caller's *search query* is deliberately never used as a fallback.
    Stamping it onto every result is what made a Chile-based profile read
    "Lagos" and gave the location field 100% coverage with only four
    distinct values. An unknown location is recorded as None so the UI can
    show it as missing rather than as a confident wrong answer.

    `fallback` is accepted for call-site compatibility and ignored.
    """
    blob = f"{title or ''} {snippet or ''}"

    m = _NG_PATTERN.search(blob)
    if m:
        found = m.group(1).lower()
        if found in ("nigeria", "nigerian"):
            return "Nigeria"
        return " ".join(w.capitalize() for w in found.split())

    if _NG_URL_PATTERN.search(url or ""):
        return "Nigeria"

    return None


# ── LinkedIn URL canonicalization ─────────────────────────────────────

_SLUG_PATTERN = re.compile(r"linkedin\.com/in/([^/?#]+)", re.I)


def linkedin_slug(url: str) -> Optional[str]:
    """Extract the profile slug from a LinkedIn URL."""
    if not url:
        return None
    m = _SLUG_PATTERN.search(url.strip())
    if not m:
        return None
    slug = m.group(1).strip().lower().rstrip("/")
    return slug or None


def canonical_linkedin_url(url: str) -> Optional[str]:
    """Reduce any LinkedIn profile URL to one canonical form.

    ``https://ng.linkedin.com/in/Jane-Doe/?trk=abc`` and
    ``http://www.linkedin.com/in/jane-doe`` are the same person, but were
    previously stored as two separate candidates because dedup compared
    raw URL strings.
    """
    slug = linkedin_slug(url)
    if not slug:
        return None
    return f"https://www.linkedin.com/in/{slug}"


def name_matches_slug(name: str, url: str) -> bool:
    """Check that a name is consistent with the profile URL it is attached to.

    Used to reject LLM-assigned names that drifted onto the wrong result.
    Conservative: only returns False when there is a positive contradiction,
    so custom vanity slugs are not discarded.
    """
    slug = linkedin_slug(url)
    if not slug or not name:
        return True

    # Drop the trailing hash LinkedIn appends, e.g. "jane-doe-04872836".
    # The lookahead requires a digit so that a genuine final name part is
    # not mistaken for a hash ("the-macdonald" must keep "macdonald").
    slug_clean = re.sub(r"-(?=[0-9a-z]*\d)[0-9a-z]{6,}$", "", slug).replace("-", " ")
    slug_tokens = {t for t in slug_clean.split() if len(t) > 2}
    if not slug_tokens:
        return True

    name_tokens = [t for t in re.split(r"\W+", name.lower()) if len(t) > 2]
    if not name_tokens:
        return True

    # Accept on any shared token, or on a prefix match ("vic" vs "victor").
    for nt in name_tokens:
        for st in slug_tokens:
            if nt == st or nt.startswith(st) or st.startswith(nt):
                return True
    return False


# ── Search result -> DB document ──────────────────────────────────────

# Camel-cased keys produced by the search layer. They are mapped to their
# snake_case equivalents on save and must not be written to the database,
# otherwise documents carry both spellings and dedup silently misses.
_CAMEL_TO_SNAKE = {
    "linkedinUrl": "linkedin",
    "currentRole": "current_role",
    "currentCompany": "current_company",
    "sourceUrl": "source_url",
    "sourcePlatform": "source_platform",
    "matchReasons": "match_reasons",
    "experienceYears": "experience_years",
    "aiSummary": "ai_summary",
}

# Fields allowed in an external_candidates document.
_DB_FIELDS = {
    "candidate_id", "name", "title", "email", "phone", "linkedin",
    "linkedin_canonical", "github", "location", "current_role",
    "current_company", "experience_years", "skills", "seniority",
    "industries", "summary", "ai_summary", "raw_text", "source_url",
    "source_platform", "match_reasons", "confidence", "geo_reason",
    "discovery_count", "first_discovered", "updated_at", "stale",
    "enriched", "name_verified", "geo_verified",
}


def to_db_document(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a search-layer result into a canonical DB document.

    Collapses camelCase aliases into snake_case, drops unknown keys, and
    derives ``linkedin_canonical`` for reliable deduplication.
    """
    doc: Dict[str, Any] = {}

    for key, value in (candidate or {}).items():
        target = _CAMEL_TO_SNAKE.get(key, key)
        # Never let an empty alias clobber a populated canonical value.
        if target in doc and doc[target] not in (None, "", []):
            continue
        doc[target] = value

    linkedin = doc.get("linkedin") or doc.get("source_url")
    canonical = canonical_linkedin_url(linkedin)
    if canonical:
        doc["linkedin"] = canonical
        doc["linkedin_canonical"] = canonical

    if isinstance(doc.get("skills"), list):
        seen, cleaned = set(), []
        for s in doc["skills"]:
            s = (str(s) or "").strip().lower()
            if s and s not in seen:
                seen.add(s)
                cleaned.append(s)
        doc["skills"] = cleaned

    return {k: v for k, v in doc.items() if k in _DB_FIELDS}
