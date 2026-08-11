"""Split a recruiter's merged deck back into one document per candidate.

Agencies send several CVs bundled into a single PDF behind a title slide. The
importer used to read one of these as a single person -- the cover page became
the name, the first email became the identity, and everybody else in the file
was lost. Rejecting the deck stops the wrong record being created but still
loses the people, so the file has to be taken apart.

Two ways in, tried in order:

    A divider page. Decks built from an agency template introduce each
    candidate on a page of their own carrying a number and a name. It is a
    deliberate marker, so where it exists it is exact.

    A new email address. Where there is no template, the first appearance of
    an address nobody has used yet is taken as the start of the next CV. Much
    weaker -- a referee's address looks the same -- so it is only used when
    the page also opens something that reads like a CV.

Anything this cannot split confidently is left alone and reported as such. A
bad split is worse than none: it would produce half a CV under one name and
the rest under another, and nothing downstream could tell.
"""

import io
import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

logger = logging.getLogger(__name__)

# Deck templates number their candidates. The number sits alone on its line,
# with the name on the next -- which is why a single-line pattern misses it.
_BARE_NUMBER = re.compile(r"^\s*(\d{1,2})\s*[.)|]?\s*$")

_EMAIL = re.compile(r"[A-Za-z0-9][\w.+-]*@[\w-]+\.[\w.-]*[A-Za-z]")

# Addresses belonging to the agency or the mail system rather than a candidate.
_NOT_A_CANDIDATE = re.compile(
    r"@(thcohq|thco)\.|noreply|no-reply|donotreply|info@|admin@|careers@|hr@|"
    r"recruit|support@|sales@|example\.(com|org)",
    re.IGNORECASE,
)

# A page opening somebody's CV rather than continuing one.
_CV_OPENING = re.compile(
    r"curriculum vitae|personal (details|information|profile)|professional summary|"
    r"career (objective|summary|profile)|work experience|employment history|"
    r"contact (details|information)",
    re.IGNORECASE,
)

# Deck furniture: section dividers that belong to no candidate.
_DECK_FURNITURE = re.compile(
    r"talent (within|above|below) the budget|who we are|contents|agenda|"
    r"thank you|our process|why (us|choose)",
    re.IGNORECASE,
)

MAX_PAGES = 400


def _looks_like_a_name(line: str) -> bool:
    line = (line or "").strip()
    if not (4 <= len(line) <= 48):
        return False
    if any(ch.isdigit() for ch in line) or "@" in line:
        return False
    words = [w for w in re.split(r"[\s,]+", line) if w]
    if not (2 <= len(words) <= 5):
        return False
    return all(re.fullmatch(r"[A-Za-z][A-Za-z'\-.]*", w) for w in words)


@dataclass
class Segment:
    """One candidate's pages within a deck."""
    start: int                      # 0-based, inclusive
    end: int                        # 0-based, exclusive
    name_hint: Optional[str] = None
    emails: List[str] = field(default_factory=list)

    @property
    def pages(self) -> int:
        return self.end - self.start


def _page_texts(file_bytes: bytes) -> List[str]:
    """Text of each page, in order. Empty strings for pages that yield none."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            if len(pdf.pages) > MAX_PAGES:
                raise ValueError(f"document has {len(pdf.pages)} pages")
            return [(p.extract_text() or "") for p in pdf.pages]
    except Exception as e:
        logger.debug("pdfplumber could not read the deck (%s); trying pypdf", e)

    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(file_bytes))
    if len(reader.pages) > MAX_PAGES:
        raise ValueError(f"document has {len(reader.pages)} pages")
    return [(p.extract_text() or "") for p in reader.pages]


def _candidate_emails(text: str) -> List[str]:
    return [m.group(0).lower() for m in _EMAIL.finditer(text or "")
            if not _NOT_A_CANDIDATE.search(m.group(0))]


def _divider_starts(pages: List[str]) -> List[tuple]:
    """Pages that introduce a candidate, as (page index, name).

    A divider is short -- it is a title slide, not a CV page -- and its first
    line is a bare number with a name under it.
    """
    found = []
    for i, text in enumerate(pages):
        lines = [l.strip() for l in (text or "").split("\n") if l.strip()]
        if not (1 < len(lines) <= 6):
            continue
        if not _BARE_NUMBER.match(lines[0]):
            continue
        if not _looks_like_a_name(lines[1]):
            continue
        found.append((i, lines[1]))
    return found


def _email_starts(pages: List[str]) -> List[tuple]:
    """Pages where an address nobody has used yet opens a new CV."""
    seen, found = set(), []
    for i, text in enumerate(pages):
        addresses = _candidate_emails(text)
        fresh = [a for a in addresses if a not in seen]
        seen.update(addresses)
        # An address on its own is not a boundary -- referees have addresses
        # too. The page has to read like the start of a CV as well.
        if fresh and _CV_OPENING.search(text or ""):
            found.append((i, None))
    return found


def plan(file_bytes: bytes) -> tuple:
    """Work out how a deck divides, without writing anything.

    Returns (segments, method). An empty list means it could not be split
    confidently, which is a result rather than a failure.
    """
    pages = _page_texts(file_bytes)
    if len(pages) < 2:
        return [], "single page"

    starts = _divider_starts(pages)
    method = "divider pages"
    if len(starts) < 2:
        starts = _email_starts(pages)
        method = "new email addresses"
    if len(starts) < 2:
        return [], "no candidate boundaries found"

    segments = []
    for n, (page_index, name) in enumerate(starts):
        end = starts[n + 1][0] if n + 1 < len(starts) else len(pages)
        # Trailing deck furniture belongs to the deck, not to the candidate
        # whose section happens to precede it.
        while end - 1 > page_index:
            tail = pages[end - 1] or ""
            if tail.strip() and not _DECK_FURNITURE.search(tail):
                break
            end -= 1
        body = "\n".join(pages[page_index:end])
        segments.append(Segment(
            start=page_index, end=end, name_hint=name,
            emails=sorted(set(_candidate_emails(body))),
        ))

    # A segment of nothing but a title slide has no CV in it.
    segments = [s for s in segments if s.pages >= 1 and
                len("".join(pages[s.start:s.end]).strip()) > 200]
    if len(segments) < 2:
        return [], "only one candidate could be isolated"
    return segments, method


def extract(file_bytes: bytes, segment: Segment) -> bytes:
    """The pages of one segment, as a PDF in its own right."""
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(io.BytesIO(file_bytes))
    writer = PdfWriter()
    for i in range(segment.start, min(segment.end, len(reader.pages))):
        writer.add_page(reader.pages[i])
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def split(file_bytes: bytes, filename: str = "") -> List[tuple]:
    """Take a deck apart into (bytes, filename) per candidate.

    Returns an empty list when the file cannot be split confidently, leaving
    the caller to handle it as it did before.
    """
    try:
        segments, method = plan(file_bytes)
    except Exception as e:
        logger.warning("Could not read deck %s: %s", filename, e)
        return []

    if not segments:
        return []

    stem = re.sub(r"\.pdf$", "", filename or "deck", flags=re.IGNORECASE)
    out = []
    for n, seg in enumerate(segments, start=1):
        # The candidate's own name where the deck gave one, so the split file
        # is recognisable to whoever opens it later.
        label = re.sub(r"[^\w \-]", "", seg.name_hint or f"candidate {n}").strip()
        try:
            out.append((extract(file_bytes, seg), f"{stem} - {label}.pdf"))
        except Exception as e:
            logger.warning("Could not extract pages %d-%d of %s: %s",
                           seg.start + 1, seg.end, filename, e)
    logger.info("Split %s into %d candidate(s) by %s", filename, len(out), method)
    return out
