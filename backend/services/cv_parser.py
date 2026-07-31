import io
import re
import logging
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

EMAIL_PATTERN = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
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
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
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
    doc = Document(io.BytesIO(file_bytes))
    return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())


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


def extract_name(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return None
    first_line = lines[0]
    name_match = re.match(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})$', first_line)
    if name_match:
        return name_match.group(1)
    for line in lines[:5]:
        cleaned = re.sub(r'[^a-zA-Z\s]', '', line).strip()
        parts = cleaned.split()
        if 2 <= len(parts) <= 3 and all(p[0].isupper() and len(p) > 1 for p in parts):
            return ' '.join(parts)
    return None


def extract_email(text: str) -> Optional[str]:
    match = EMAIL_PATTERN.search(text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    match = PHONE_PATTERN.search(text)
    return match.group(0) if match else None


def extract_linkedin(text: str) -> Optional[str]:
    match = LINKEDIN_PATTERN.search(text)
    return f"https://{match.group(0)}" if match else None


def extract_experience_years(text: str) -> Optional[float]:
    all_years = YEARS_PATTERN.findall(text)
    if not all_years:
        return None
    values = [int(y) for y in all_years if y.isdigit()]
    return float(max(values)) if values else None


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
