import io
import os
import re
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path

logger = logging.getLogger(__name__)

COMMON_SKILLS = {
    "javascript", "typescript", "python", "java", "c#", "c++", "c", "ruby", "go", "golang",
    "rust", "swift", "kotlin", "php", "scala", "r", "dart", "perl", "lua", "haskell",
    "react", "angular", "vue", "next.js", "nextjs", "node.js", "nodejs", "express",
    "django", "flask", "fastapi", "spring", "spring boot", "asp.net", ".net", "laravel",
    "rails", "ruby on rails", "svelte", "nuxt", "gatsby", "jquery",
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform",
    "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci", "circleci",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "dynamodb", "snowflake", "bigquery", "oracle", "sql server", "sqlite", "mariadb",
    "graphql", "rest", "grpc", "websocket", "soap", "microservices",
    "machine learning", "deep learning", "nlp", "computer vision", "data science",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "spark",
    "hadoop", "kafka", "rabbitmq", "airflow", "dbt",
    "html", "css", "sass", "scss", "less", "tailwind", "bootstrap", "material ui",
    "redux", "mobx", "zustand", "context api",
    "git", "svn", "linux", "unix", "bash", "shell scripting",
    "agile", "scrum", "kanban", "jira", "confluence",
    "figma", "sketch", "adobe xd", "photoshop", "illustrator",
    "solidity", "web3", "blockchain", "smart contracts",
    "power bi", "tableau", "looker", "excel",
    "devops", "sre", "mlops", "data engineering", "data analytics",
    "cybersecurity", "penetration testing", "network security",
    "android", "ios", "react native", "flutter", "xamarin",
    "unity", "unreal engine", "blender",
    "salesforce", "sap", "workday", "servicenow",
    "csharp", "dotnet", "c-sharp",
}

SKILL_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(s) for s in sorted(COMMON_SKILLS, key=len, reverse=True)) + r')\b',
    re.IGNORECASE
)

# The local part must begin with a letter or digit. Without that, a CV listing
# a phone number immediately before an address yields
# "+2348022747706.femooshad@gmail.com" as the email -- which is not one, and
# which normalised down to a key several unrelated people shared.
EMAIL_PATTERN = re.compile(r'[A-Za-z0-9][\w.+-]*@[\w-]+\.[\w.-]*[A-Za-z]')
PHONE_PATTERN = re.compile(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
LINKEDIN_PATTERN = re.compile(r'linkedin\.com/in/[\w\-%]+', re.IGNORECASE)
YEARS_PATTERN = re.compile(r'(\d+)[\+]?\s*(?:years?|yrs?)(?:\s*(?:of\s*)?experience)?', re.IGNORECASE)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    # Strategy 1: pdfplumber (best quality)
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        result = '\n'.join(text_parts)
        if result.strip():
            return result
    except Exception:
        pass

    # Strategy 2: pypdf (handles more PDF formats)
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
        result = '\n'.join(text_parts)
        if result.strip():
            return result
    except Exception:
        pass

    # Strategy 3: read raw bytes as strings (last resort for text-based PDFs)
    try:
        text = file_bytes.decode('utf-8', errors='replace')
        import string
        printable = set(string.printable)
        text = ''.join(c for c in text if c in printable)
        if len(text.strip()) > 100:
            return text
    except Exception:
        pass

    # Strategy 4: OCR with Tesseract (for scanned PDFs/images)
    try:
        import pytesseract
        # Only pin the Windows install path when running on Windows. On Linux
        # hosts (Azure App Service, containers) tesseract is on PATH, and
        # forcing a C:\ path made this strategy raise and be swallowed by the
        # except below -- OCR appeared to work but silently never ran, so
        # scanned PDFs parsed as empty. TESSERACT_CMD overrides either way.
        _tess = os.environ.get('TESSERACT_CMD')
        if not _tess and os.name == 'nt':
            _tess = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        if _tess:
            pytesseract.pytesseract.tesseract_cmd = _tess
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(file_bytes, first_page=1, last_page=3)
        text_parts = []
        for img in images:
            t = pytesseract.image_to_string(img)
            if t.strip():
                text_parts.append(t)
        result = '\n'.join(text_parts)
        if result.strip():
            return result
    except Exception:
        pass

    return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    from docx import Document
    try:
        doc = Document(io.BytesIO(file_bytes))
        return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception:
        # A .docx is a zip, and python-docx gives up on the whole file when any
        # member fails its checksum -- usually an embedded photo, while the text
        # is perfectly readable. Losing a candidate over a corrupt image in
        # their CV is not a good trade, so read the document part on its own.
        return _docx_text_ignoring_damage(file_bytes)


def _docx_text_ignoring_damage(file_bytes: bytes) -> str:
    """Read a .docx's words directly, skipping whatever else is broken."""
    import xml.etree.ElementTree as ET
    import zipfile

    W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            with z.open("word/document.xml") as f:
                root = ET.parse(f).getroot()
    except Exception:
        return ""

    lines = []
    for para in root.iter(f"{W}p"):
        text = "".join(node.text or "" for node in para.iter(f"{W}t"))
        if text.strip():
            lines.append(text)
    return "\n".join(lines)


def extract_text_from_doc(file_bytes: bytes) -> str:
    """Extract text from old .doc files (multiple strategies)."""
    # Strategy 1: Try olefile + antiword approach
    try:
        import olefile
        ole = olefile.OleFileIO(io.BytesIO(file_bytes))
        if ole.exists('WordDocument'):
            # Try to extract the Word text stream
            stream = ole.openstream('1Table')
            # Simple: just try to read as text with encoding detection
            raw = file_bytes.decode('utf-8', errors='replace')
            import string as _string
            printable = set(_string.printable)
            text = ''.join(c for c in raw if c in printable)
            # Filter to likely text regions
            lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 20]
            if len(lines) > 5:
                return '\n'.join(lines)
    except ImportError:
        pass
    except Exception:
        pass

    # Strategy 2: Raw text extraction (many .doc files have readable ASCII)
    try:
        raw = file_bytes.decode('latin-1', errors='replace')
        import re as _re
        # Extract readable text segments (consecutive printable chars)
        segments = _re.findall(r'[\x20-\x7E]{20,}', raw)
        if segments:
            return '\n'.join(segments[:200])
    except Exception:
        pass

    return ""


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode('utf-8', errors='replace')


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_bytes)
    elif ext == '.docx':
        return extract_text_from_docx(file_bytes)
    elif ext == '.doc':
        return extract_text_from_doc(file_bytes)
    elif ext == '.txt':
        return extract_text_from_txt(file_bytes)
    else:
        return ''


def extract_skills(text: str) -> List[str]:
    found = set()
    for match in SKILL_PATTERN.finditer(text):
        found.add(match.group(0).lower())
    normalized = set()
    for s in found:
        if s in ('csharp', 'c-sharp'):
            normalized.add('c#')
        elif s == 'dotnet':
            normalized.add('.net')
        elif s == 'nodejs':
            normalized.add('node.js')
        elif s in ('nextjs',):
            normalized.add('next.js')
        elif s == 'k8s':
            normalized.add('kubernetes')
        elif s == 'golang':
            normalized.add('go')
        elif s in ('c-sharp',):
            normalized.add('c#')
        else:
            normalized.add(s)
    return sorted(normalized)


# Words that appear at the top of a CV but are never a person's name. The
# previous extractor matched "Curriculum Vitae" and "Professional Summary" as
# names because they are two capitalised words, which is why 144 candidates in
# the database are called things like "Professional Summary".
_NAME_STOPWORDS = {
    "curriculum", "vitae", "resume", "cv", "profile", "summary", "personal",
    "data", "details", "information", "contact", "objective", "career",
    "professional", "education", "experience", "employment", "history",
    "skills", "competencies", "references", "referees", "qualifications",
    "achievements", "certifications", "certificates", "awards", "interests",
    "hobbies", "languages", "nationality", "address", "phone", "mobile",
    "email", "date", "birth", "gender", "marital", "status", "statement",
    "work", "about", "me", "bio", "biodata", "portfolio", "projects",
    "declaration", "signature", "confidential",
    # Cover-page wording from agency profile decks, which open with a title
    # slide rather than a person. "Presented on" was being stored as the name
    # of seventy-four candidates.
    "presented", "prepared", "submitted", "profiles", "talent", "candidate",
    "shortlist", "introduction", "overview", "agenda", "contents",
    # Job titles and role words. Without these the extractor happily returns
    # "SENIOR SOFTWARE ENGINEER" as somebody's name.
    "senior", "junior", "lead", "head", "chief", "officer", "manager",
    "engineer", "developer", "analyst", "consultant", "specialist",
    "executive", "director", "administrator", "administration", "assistant",
    "coordinator", "supervisor", "intern", "trainee", "graduate", "student",
    "architect", "designer", "scientist", "technician", "operations",
    "operation", "marketing", "sales", "finance", "accountant", "accounting",
    "human", "resource", "resources", "management", "functions", "enthusiast",
    "enthusia", "software", "hardware", "network", "security", "support",
    "service", "services", "product", "project", "business", "technology",
    "digital", "content", "strategist", "writer", "editor", "nurse", "doctor",
    # Places and address words that sit where a name is expected.
    "street", "road", "avenue", "lane", "close", "estate", "city", "town",
    "state", "country", "nigeria", "lagos", "abuja", "india", "malaysia",
    "bangladesh", "dhaka", "pakistan", "lahore", "kenya", "ghana", "house",
    "flat", "apartment", "block", "plot",
}

# Common titles to strip from the front of a detected name.
_NAME_TITLES = {"mr", "mrs", "miss", "ms", "dr", "prof", "engr", "arc", "barr"}


def _unspace_letters(line: str) -> str:
    """Collapse letter-spaced headings such as "D U R O T I M I" into a word.

    Some CV templates letter-space the name for visual effect. Left as-is the
    name is unusable and the extractor skips past it to a section heading.

    Word boundaries in such lines are marked by a wider gap, so runs of two or
    more spaces are treated as separators before collapsing -- otherwise
    "D U R O T I M I  J O H N S O N" becomes one unsplittable token.
    """
    if not line:
        return line

    groups = re.split(r"\s{2,}", line.strip())
    collapsed = []
    for group in groups:
        tokens = group.split()
        if len(tokens) >= 3 and all(len(t) == 1 and t.isalpha() for t in tokens):
            collapsed.append("".join(tokens).capitalize())
            continue
        # Mixed: runs of single letters interleaved with whole words.
        out, run = [], []
        for t in tokens:
            if len(t) == 1 and t.isalpha():
                run.append(t)
            else:
                if run:
                    out.append("".join(run).capitalize() if len(run) >= 3 else " ".join(run))
                    run = []
                out.append(t)
        if run:
            out.append("".join(run).capitalize() if len(run) >= 3 else " ".join(run))
        collapsed.append(" ".join(out))

    return " ".join(collapsed)


def _looks_like_name(line: str) -> bool:
    """Whether a line could plausibly be a person's name."""
    if not line or len(line) > 60:
        return False
    if any(ch.isdigit() for ch in line):
        return False
    if "@" in line or "http" in line.lower() or "/" in line:
        return False

    words = [w for w in re.split(r"[\s,]+", line.strip()) if w]
    if not (2 <= len(words) <= 5):
        return False

    lowered = [re.sub(r"[^a-z]", "", w.lower()) for w in words]
    # Any section-heading word disqualifies the whole line.
    if any(w in _NAME_STOPWORDS for w in lowered if w):
        return False
    # Names are letters, hyphens and apostrophes only.
    if not all(re.fullmatch(r"[A-Za-z][A-Za-z'\-\.]*", w) for w in words):
        return False
    # Reject single-letter fragments beyond an initial.
    if sum(1 for w in words if len(w.strip(".")) == 1) > 2:
        return False
    return True


def _name_from_email(email: Optional[str]) -> Optional[str]:
    """Derive a name from an email local part, e.g. mandonglawrence@ -> Mandong Lawrence.

    Used only as a fallback. Many Nigerian CVs in the corpus carry the full
    name in the address even when the document's own layout defeats parsing.
    """
    if not email or "@" not in email:
        return None
    local = email.split("@", 1)[0]
    local = re.sub(r"\d+", "", local)
    parts = [p for p in re.split(r"[._\-]+", local) if len(p) > 1]

    if len(parts) >= 2:
        return " ".join(p.capitalize() for p in parts[:3])
    return None


def extract_name(text: str, email: Optional[str] = None) -> Optional[str]:
    """Find the candidate's name.

    Looks for a plausible name near the top of the document, preferring lines
    corroborated by the email address, and falls back to deriving one from the
    email when the layout defeats parsing.
    """
    raw_lines = [l.strip() for l in text.split("\n") if l.strip()]
    if not raw_lines:
        return _name_from_email(email)

    # An explicit label is the most reliable signal a CV can give, and it is
    # common in the corpus. Checked before the positional heuristics below,
    # which would otherwise reject the line for containing the word "Name".
    for line in raw_lines[:25]:
        labelled = re.match(
            r"^\s*(?:full\s+|sur|other\s+)?names?\s*[:\-]\s*(.+)$", line, re.I
        )
        if labelled:
            value = _unspace_letters(labelled.group(1)).strip(" ,.-|")
            value = re.sub(r"\s{2,}.*$", "", value)  # drop trailing columns
            if _looks_like_name(value):
                words = value.split()
                if words[0].lower().strip(".") in _NAME_TITLES:
                    words = words[1:]
                if len(words) >= 2:
                    return " ".join(words)

    lines = [_unspace_letters(l) for l in raw_lines[:15]]
    email_local = ""
    if email and "@" in email:
        email_local = re.sub(r"[^a-z]", "", email.split("@", 1)[0].lower())

    best, best_score = None, 0
    for index, line in enumerate(lines):
        candidate = re.sub(r"\s+", " ", line).strip(" ,.-|")
        if not _looks_like_name(candidate):
            continue

        words = candidate.split()
        if words and words[0].lower().strip(".") in _NAME_TITLES:
            words = words[1:]
            if len(words) < 2:
                continue
            candidate = " ".join(words)

        # Earlier lines are far more likely to be the name.
        score = max(0, 12 - index)
        # Corroboration by the email address is the strongest signal available.
        if email_local:
            joined = re.sub(r"[^a-z]", "", candidate.lower())
            if joined and (joined in email_local or email_local in joined):
                score += 30
            elif any(len(w) > 3 and w.lower() in email_local for w in words):
                score += 15
        # Title Case reads more like a name than a shouted heading.
        if candidate == candidate.title():
            score += 3

        if score > best_score:
            best, best_score = candidate, score

    # When an email is available it is the better authority. A line that the
    # email does not corroborate scores below 15, and at that point a guess
    # drawn from the document is as likely to be a job title or an address as
    # a name -- returning nothing is more honest, and identity matching can
    # still work from the email itself.
    if best and (not email_local or best_score >= 15):
        return best

    from_email = _name_from_email(email)
    if from_email:
        return from_email

    return best if best_score >= 10 else None


# Short abbreviations need word boundaries or they match inside ordinary
# words -- an unanchored "OND" matches "c(ond)ucted", "HND" matches "beh(ind)".
_DEGREE_PATTERN = re.compile(
    r"\b("
    r"B\.?Sc|M\.?Sc|B\.?A|M\.?A|B\.?Eng|M\.?Eng|B\.?Tech|M\.?Tech|"
    r"MBA|Ph\.?D|LL\.?B|LL\.?M|MBBS|HND|OND|NCE|PGD|"
    r"Bachelors?|Masters?|Doctorate|Diploma|Higher National|Ordinary National"
    r")\b",
    re.IGNORECASE,
)

_INSTITUTION_PATTERN = re.compile(
    r"\b([A-Z][\w'&.\-]*(?:\s+[A-Z][\w'&.\-]*){0,5}\s+"
    r"(?:University|Polytechnic|College|Institute|School of \w+))\b"
)
_INSTITUTION_PREFIX = re.compile(
    r"\b((?:University|Institute|College|Polytechnic)\s+of\s+"
    r"[A-Z][\w'&.\-]*(?:\s+[A-Z][\w'&.\-]*){0,3})\b"
)

# The open-ended alternatives use [\w ] rather than [\w\s]: \s matches a
# newline, so a pattern could run past the end of its line and swallow the
# certification below it, yielding "AWS Certified Solutions Architect PMP".
_CERT_PATTERN = re.compile(
    r"\b("
    r"AWS Certified [\w ]{3,40}|Microsoft Certified[\w :]{0,40}|"
    r"Azure (?:Fundamentals|Administrator|Developer|Solutions Architect)|"
    r"Google (?:Cloud )?(?:Certified|Professional)[\w ]{0,30}|"
    r"CCNA|CCNP|CISSP|CISM|CISA|CompTIA [\w+]{1,12}|"
    r"PMP|PRINCE2|CAPM|ITIL(?:\s+v?\d)?|"
    r"Certified Scrum(?:Master| Product Owner)?|CSM|PSM ?[I]{0,3}|"
    r"Six Sigma(?: Green| Black)? Belt|"
    r"ACCA|ACA|CFA|CPA|CIPM|SHRM-?[CS]P|PHR|SPHR|"
    r"Chartered [\w\s]{3,30}"
    r")\b",
    re.IGNORECASE,
)

_GITHUB_PATTERN = re.compile(r"github\.com/[\w\-.]+", re.IGNORECASE)
_PORTFOLIO_PATTERN = re.compile(
    r"\b((?:https?://)?(?:www\.)?[\w\-]+\.(?:dev|io|me|design|portfolio|site|xyz|tech)"
    r"(?:/[\w\-./]*)?)\b",
    re.IGNORECASE,
)

# Section headings that mark where employment history begins.
_EXPERIENCE_HEADING = re.compile(
    r"^\s*(?:work\s+)?(?:experience|employment|career|professional\s+experience|"
    r"work\s+history|employment\s+history)\s*:?\s*$",
    re.IGNORECASE,
)
_NEXT_HEADING = re.compile(
    r"^\s*(?:education|qualifications?|skills?|certifications?|references?|"
    r"projects?|interests?|hobbies|languages?|awards?)\s*:?\s*$",
    re.IGNORECASE,
)

_DATE_RANGE = re.compile(
    r"((?:19|20)\d{2})\s*[-–—to]{1,3}\s*((?:19|20)\d{2}|present|current|date|now)",
    re.IGNORECASE,
)


def extract_education(text: str) -> List[Dict[str, Any]]:
    """Pull degree and institution pairs out of the document.

    Returns a list of {degree, institution, year} with whichever parts were
    found. Entries are deliberately loose -- CV layouts vary enormously and a
    partial record is more useful than none.
    """
    results: List[Dict[str, Any]] = []
    seen = set()

    for raw in text.split("\n"):
        line = " ".join(raw.split())
        if not (12 <= len(line) <= 160):
            continue

        degree = _DEGREE_PATTERN.search(line)
        inst = _INSTITUTION_PREFIX.search(line) or _INSTITUTION_PATTERN.search(line)
        if not (degree or inst):
            continue

        year = None
        years = re.findall(r"\b(19[6-9]\d|20[0-4]\d)\b", line)
        if years:
            year = years[-1]

        entry = {
            "degree": degree.group(1).strip() if degree else None,
            "institution": inst.group(1).strip() if inst else None,
            "year": year,
        }
        key = (entry["degree"] or "", entry["institution"] or "", entry["year"] or "")
        if key in seen or not (entry["degree"] or entry["institution"]):
            continue
        seen.add(key)
        results.append(entry)

        if len(results) >= 8:
            break

    return results


def extract_certifications(text: str) -> List[str]:
    """Named professional certifications, de-duplicated.

    Matched line by line: the open-ended patterns (an AWS certification name
    can be several words) otherwise run past a line ending and swallow the
    next certification, producing entries like
    "AWS Certified Solutions Architect PMP".
    """
    found, seen = [], set()
    per_line = "\n".join(" ".join(l.split()) for l in text.split("\n"))
    for match in _CERT_PATTERN.finditer(per_line):
        value = " ".join(match.group(1).split()).strip(" .,-")
        key = value.lower()
        if key in seen or len(value) < 3:
            continue
        seen.add(key)
        found.append(value)
        if len(found) >= 15:
            break
    return found


def extract_employment(text: str) -> List[Dict[str, Any]]:
    """Employment entries taken from the experience section.

    Scoped to the experience section rather than the whole document, so that
    dated lines under Education or Projects are not misread as jobs.
    """
    lines = [" ".join(l.split()) for l in text.split("\n")]

    start = None
    for i, line in enumerate(lines):
        if _EXPERIENCE_HEADING.match(line):
            start = i + 1
            break
    if start is None:
        return []

    entries: List[Dict[str, Any]] = []
    for line in lines[start:start + 80]:
        if not line:
            continue
        if _NEXT_HEADING.match(line):
            break
        if not (8 <= len(line) <= 160):
            continue

        period = _DATE_RANGE.search(line)
        if not period:
            continue

        title = _DATE_RANGE.sub("", line).strip(" .,-–—|·•\t")
        title = re.sub(r"\s{2,}", " | ", title).strip(" |")
        if len(title) < 3:
            continue

        entries.append({
            "description": title[:140],
            "start": period.group(1),
            "end": period.group(2),
        })
        if len(entries) >= 12:
            break

    return entries


def extract_github(text: str) -> Optional[str]:
    match = _GITHUB_PATTERN.search(text)
    if not match:
        return None
    url = match.group(0).rstrip("/.,)")
    # Skip repository links; the profile is what identifies a person.
    parts = url.split("/")
    if len(parts) >= 2 and parts[1].lower() in {"orgs", "topics", "features"}:
        return None
    return f"https://{url}"


def extract_portfolio(text: str) -> Optional[str]:
    for match in _PORTFOLIO_PATTERN.finditer(text):
        url = match.group(1).rstrip("/.,)")
        lowered = url.lower()
        # These are captured by their own fields, not as a portfolio.
        if any(d in lowered for d in ("github.com", "linkedin.com", "gmail",
                                      "yahoo", "hotmail", "outlook.")):
            continue
        return url if url.startswith("http") else f"https://{url}"
    return None


# A phone number running straight into an address, which CVs that set contact
# details on one line produce constantly: "+2348022747706.femooshad@gmail.com".
# The digits are not part of the address, and left on they became the identity
# the candidate was matched by.
# The separator is optional because plenty of layouts leave none at all
# ("+573112379170christianfdo777@..."). At least seven leading digits are
# required, so a handle that merely starts with a year -- 2023abc@ -- is left
# alone, and an all-digit local part like a student number is untouched
# because letters must follow.
_PHONE_GLUED_TO_EMAIL = re.compile(r"^\+?\d[\d\s\-()]{6,}[.\-_]?([A-Za-z][\w.+-]*)$")


def extract_email(text: str) -> Optional[str]:
    match = EMAIL_PATTERN.search(text)
    if not match:
        return None
    address = match.group(0)
    local, _, domain = address.partition("@")
    glued = _PHONE_GLUED_TO_EMAIL.match(local)
    return f"{glued.group(1)}@{domain}" if glued else address


def extract_phone(text: str) -> Optional[str]:
    match = PHONE_PATTERN.search(text)
    return match.group(0) if match else None


def extract_linkedin(text: str) -> Optional[str]:
    match = LINKEDIN_PATTERN.search(text)
    return f"https://{match.group(0)}" if match else None


# A self-description: "5+ years of experience", "over 7 years' experience".
# Requires the word experience nearby, so a line about a company's 77-year
# history or a 30-year mortgage is not read as a career length.
_YEARS_OF_EXPERIENCE = re.compile(
    r"(\d{1,2})\s*\+?\s*(?:years?|yrs?)[\s'’]*(?:of\s+)?"
    r"(?:relevant\s+|professional\s+|progressive\s+|hands[-\s]?on\s+|proven\s+|combined\s+)?"
    r"(?:work\s+|working\s+|industry\s+)?experience",
    re.IGNORECASE,
)

# Nobody has a professional career outside this range. Anything else came
# from a number that happened to sit next to the word "years".
_MIN_YEARS, _MAX_YEARS = 0.5, 50


def _years_from_employment(text: str) -> Optional[float]:
    """Career length derived from the dates in the experience section.

    Most CVs never state a total -- they list jobs and leave you to add up.
    Taking the earliest start to the latest end covers those, and it is
    also the more trustworthy figure when a CV states one that disagrees.
    """
    entries = extract_employment(text)
    if not entries:
        return None

    now = datetime.now(timezone.utc).year
    starts, ends = [], []
    for e in entries:
        for key, bucket in (("start", starts), ("end", ends)):
            raw = str(e.get(key) or "").strip()
            if re.match(r"(?i)^(present|current|date|now|till)", raw):
                bucket.append(now)
                continue
            found = re.search(r"(19|20)\d{2}", raw)
            if found:
                bucket.append(int(found.group(0)))

    if not starts:
        return None
    first = min(starts)
    last = max(ends) if ends else now
    # A typo can put an end date before a start; fall back to today.
    if last < first:
        last = now
    if not (1950 <= first <= now):
        return None

    span = last - first
    return float(span) if _MIN_YEARS <= span <= _MAX_YEARS else None


def extract_experience_years(text: str) -> Optional[float]:
    """How long this person has been working.

    Previously the largest number anywhere in the document that happened to
    precede the word "years" -- which is how somebody ended up credited with
    77 years of experience. Two sources now, both bounded to a career that
    could actually have happened:

      1. what the CV says about itself ("6 years of experience"), taking the
         largest such claim, since a CV that mentions several is usually
         breaking a total into specialisms;
      2. failing that, the span of the jobs listed.
    """
    text = text or ""

    stated = [int(m.group(1)) for m in _YEARS_OF_EXPERIENCE.finditer(text)]
    plausible = [float(v) for v in stated if _MIN_YEARS <= v <= _MAX_YEARS]
    if plausible:
        return max(plausible)

    from_jobs = _years_from_employment(text)
    if from_jobs is not None:
        return from_jobs

    # Last resort: a bare "7 years" with no "experience" beside it, and only
    # from the opening of the CV, where the summary lives. Confining it there
    # is what keeps it honest -- the same phrasing deeper in the document is
    # usually a course length, a contract term or a company's age.
    opening = text[:1200]
    loose = [
        int(m.group(1))
        for m in YEARS_PATTERN.finditer(opening)
        if _MIN_YEARS <= int(m.group(1)) <= _MAX_YEARS
    ]
    return float(max(loose)) if loose else None


NIGERIAN_LOCATIONS = [
    "lagos", "abuja", "port harcourt", "ibadan", "kano", "enugu", "benin city",
    "owerri", "abia", "oyo", "delta", "rivers", "anambra", "imo", "edo",
    "kaduna", "jos", "akwa ibom", "bayelsa", "cross river", "ogun", "ondo",
    "ekiti", "kwara", "niger", "plateau", "bauchi", "borno", "gombe",
    "jigawa", "kebbi", "kogi", "nasarawa", "sokoto", "taraba", "yobe", "zamfara",
    "lekki", "ikeja", "surulere", "yaba", "victoria island", "apapa",
    "nigeria", "nigerian",
]

NIGERIAN_PHONE = re.compile(r'(\+234|0\d{10})')
NIGERIAN_EMAIL = re.compile(r'@.+(\.ng\b|\.com\.ng\b)', re.IGNORECASE)


def is_likely_nigerian(text: str, name: str = None) -> bool:
    """Check if a CV likely belongs to a Nigerian candidate."""
    if not text and not name:
        return False
    text_lower = (text or "").lower()
    score = 0

    # Nigerian locations found in CV
    for loc in NIGERIAN_LOCATIONS:
        if loc in text_lower:
            score += 3
            break

    # Nigerian phone number
    if NIGERIAN_PHONE.search(text_lower):
        score += 5

    # Nigerian email
    if NIGERIAN_EMAIL.search(text_lower):
        score += 3

    # Nigerian name patterns (common Nigerian first names)
    if name:
        nigerian_names = [
            "ade", "ola", "olu", "chi", "ife", "nne", "obi", "ude", "eme",
            "ayo", "tunde", "bola", "dapo", "segun", "funke", "bimpe", "titi",
            "yemi", "taiwo", "kehinde", "oluwaseun", "nnamdi", "ezekiel",
            "emeka", "chukwu", "ngozi", "amaka", "uche", "chinedu", "ada",
            "nkechi", "ebuka", "ifeanyi", "chiamaka", "tochukwu", "kemi",
            "tolu", "wale", "seun", "bisi", "yinka", "toyin", "femi",
            "blessing", "godwin", "gift", "precious", "favour", "ebenezer",
            "oluwatobi", "oluwafemi", "oluwasegun", "oluwadamilola",
        ]
        name_lower = name.lower()
        if any(n in name_lower for n in nigerian_names):
            score += 5

    return score >= 5


def parse_cv(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    text = extract_text(file_bytes, filename)
    if not text:
        return {
            "raw_text": "",
            "skills": [],
            "name": None,
            "email": None,
            "phone": None,
            "linkedin": None,
            "experience_years": None,
            "filename": filename,
        }

    return {
        "raw_text": text[:50000],
        "skills": extract_skills(text),
        "name": extract_name(text),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "linkedin": extract_linkedin(text),
        "experience_years": extract_experience_years(text),
        "filename": filename,
    }
