import os
import re
import json
import logging
import time
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.0-flash')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_API_KEY_FALLBACK = os.environ.get('GEMINI_API_KEY_FALLBACK', '')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
SERPAPI_KEY = os.environ.get('SERPAPI_KEY', '')
SERPER_KEY = os.environ.get('SERPER_KEY', '')

DEFAULT_SITES = [
    "linkedin.com/in",
    "github.com",
    "stackoverflow.com/users",
]


# ── Real Web Search (DuckDuckGo) ──────────────────────────────────────

def _search_web_for_candidates(
    role: str,
    skills: List[str],
    location: str = "Nigeria",
    max_results: int = 50,
    sites: List[str] = None,
) -> List[Dict[str, Any]]:
    """Search the real web for Nigerian candidates using DuckDuckGo. Free and unlimited."""
    if sites is None:
        sites = ["linkedin.com/in"]

    # Force Nigerian location if not specified
    nigerian_locations = ["Nigeria", "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Remote", "Kano", "Enugu"]
    if not location or location.lower() in ("remote", "any", ""):
        search_locations = nigerian_locations
    elif location.lower() not in [n.lower() for n in nigerian_locations]:
        search_locations = [location] + nigerian_locations[:3]
    else:
        search_locations = nigerian_locations

    candidates = []
    seen_urls = set()

    # Build diverse skill combos
    skill_pairs = []
    for i in range(0, len(skills), 2):
        pair = skills[i:i+2]
        if pair:
            skill_pairs.append(pair)

    if not skill_pairs:
        skill_pairs = [[role]]

    # Also search with individual skills for broader coverage
    for s in skills[:3]:
        if [s] not in skill_pairs:
            skill_pairs.append([s])

    if role and [role] not in skill_pairs:
        skill_pairs.insert(0, [role])

    # Search with different location + skill combinations
    for loc in search_locations[:3]:
        for pair in skill_pairs[:5]:  # 5 combos per location for more breadth
            skill_str = " ".join(pair)
            if role:
                query = f'site:linkedin.com/in "{role}" {skill_str} "{loc}"'
            else:
                query = f'site:linkedin.com/in {skill_str} "{loc}"'

            # Add exclusion to avoid job posts
            query += ' -jobs -hiring -"we are hiring" -recruiter'

            try:
                from ddgs import DDGS
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=min(25, max_results - len(candidates))))
                    for r in results:
                        url = r.get("href", "")
                        if url in seen_urls:
                            continue

                        # Filter: only Nigerian profiles
                        title = (r.get("title", "") or "").lower()
                        body = (r.get("body", "") or "").lower()
                        url_lower = url.lower()

                        is_nigerian = any(n in title or n in body for n in [
                            "nigeria", "lagos", "abuja", "port harcourt", "ibadan",
                            "kano", "enugu", "benin city", "owerri", "abia",
                            "ng.linkedin", ".ng/", "/ng/", "oyo", "delta", "rivers",
                        ])

                        if not is_nigerian:
                            continue

                        seen_urls.add(url)
                        candidates.append({
                            "name": _extract_name_from_title(r.get("title", "")),
                            "title": r.get("title", ""),
                            "currentRole": None,
                            "currentCompany": None,
                            "location": loc,
                            "linkedinUrl": url if "linkedin.com/in" in url else None,
                            "sourceUrl": url,
                            "sourcePlatform": "LinkedIn",
                            "skills": [],
                            "summary": (r.get("body", "") or "")[:200],
                            "matchReasons": [],
                            "confidence": "Medium",
                        })
            except Exception as e:
                logger.warning(f"DuckDuckGo search error: {e}")
                continue

            time.sleep(0.1)

            if len(candidates) >= max_results:
                break

        if len(candidates) >= max_results:
            break

    # Unique by URL
    return candidates[:max_results]


def _extract_name_from_title(title: str) -> Optional[str]:
    """Try to extract a person's name from a search result title."""
    for sep in [" - ", " | ", " – ", " — "]:
        if sep in title:
            parts = title.split(sep)
            first = parts[0].strip()
            words = first.split()
            if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
                return first
            if "linkedin" in first.lower() and len(parts) >= 2:
                for p in parts:
                    clean = p.strip()
                    words = clean.split()
                    if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
                        return clean
            return first
    clean = title.strip()
    if "/" in clean and "http" not in clean:
        return clean.split("/")[0].strip()
    return title.split(" - ")[0].split(" | ")[0].strip()[:80]


def _extract_role_from_title(title: str) -> Optional[str]:
    """Extract job role from LinkedIn search result title."""
    # Title format: "Name - Data Analyst | LinkedIn" or "Name · Data Analyst · Company"
    separators = [" - ", " – ", " · ", " | "]
    for sep in separators:
        if sep in title:
            parts = [p.strip() for p in title.split(sep)]
            if len(parts) >= 2:
                # Check each part after the name for a role
                for part in parts[1:]:
                    lower = part.lower()
                    # Skip LinkedIn, company descriptions, locations
                    if lower in ("linkedin", "linkedin.com") or lower.startswith("http"):
                        continue
                    # Must contain a job-related keyword
                    role_signals = ["engineer", "developer", "analyst", "manager", "designer",
                        "architect", "scientist", "consultant", "lead", "director", "specialist",
                        "administrator", "coordinator", "officer", "strategist", "devops",
                        "full stack", "frontend", "backend", "software", "cloud", "qa",
                        "product", "project", "data", "marketing", "sales", "support",
                        "operations", "hr", "financial", "tutor", "instructor",
                        "technician", "researcher", "associate", "accountant", "nurse",
                        "doctor", "writer", "editor", "design"]
                    if any(k in lower for k in role_signals):
                        # Clean: remove trailing pipe, at-company, etc
                        clean = part.split("|")[0].split(" at ")[0].strip()
                        return clean[:80]
    return None


def _get_genai_client(api_key: str = None):
    from google import genai
    key = api_key or GEMINI_API_KEY or GEMINI_API_KEY_FALLBACK
    if not key:
        return None
    return genai.Client(api_key=key)


def _generate_gemini_text(prompt: str, grounded: bool = False, temperature: float = 0.3, json_mode: bool = False) -> str:
    client = _get_genai_client()
    if not client:
        raise RuntimeError("No Gemini API key configured")

    from google.genai import types

    config_kwargs = {"temperature": temperature}
    tools = []

    if grounded:
        tools = [types.Tool(google_search=types.GoogleSearch())]
        config_kwargs["max_output_tokens"] = 8192
    elif json_mode:
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["max_output_tokens"] = 16384
    else:
        config_kwargs["max_output_tokens"] = 8192

    if tools:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(tools=tools, **config_kwargs),
        )
    else:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs),
        )

    return response.text


def _generate_groq_text(prompt: str, temperature: float = 0.3, json_mode: bool = False) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("No Groq API key configured")

    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)

    messages = [{"role": "user", "content": prompt}]
    kwargs = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 8192,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def _generate_llm_text(prompt: str, grounded: bool = False, temperature: float = 0.3, json_mode: bool = False) -> str:
    """Provider chain: primary Gemini → fallback Gemini → Groq (Llama), same as Recruit-flow."""
    has_gemini = bool(GEMINI_API_KEY or GEMINI_API_KEY_FALLBACK)
    has_groq = bool(GROQ_API_KEY)

    if not has_gemini and not has_groq:
        raise RuntimeError("No LLM API key configured (GEMINI_API_KEY or GROQ_API_KEY)")

    # Try primary Gemini first
    if GEMINI_API_KEY:
        try:
            client = _get_genai_client(GEMINI_API_KEY)
            return _generate_gemini_text(prompt, grounded=grounded, temperature=temperature, json_mode=json_mode)
        except Exception as e:
            logger.warning(f"Primary Gemini failed: {e}")

    # Try fallback Gemini key
    if GEMINI_API_KEY_FALLBACK:
        try:
            client = _get_genai_client(GEMINI_API_KEY_FALLBACK)
            return _generate_gemini_text(prompt, grounded=grounded, temperature=temperature, json_mode=json_mode)
        except Exception as e:
            logger.warning(f"Fallback Gemini failed: {e}")

    # Fall through to Groq (Llama) — note: Groq doesn't support Google Search grounding,
    # so we inject instructions instead
    if has_groq:
        groq_prompt = prompt
        if grounded:
            groq_prompt = prompt + "\n\nIMPORTANT: Use your knowledge of the web to find real candidates. Search LinkedIn, GitHub, and public professional profiles in your training data. Always cite source URLs. Do not fabricate people — only list those you're confident exist."
        logger.info("Using Groq (Llama) as fallback")
        return _generate_groq_text(groq_prompt, temperature=temperature, json_mode=json_mode)

    raise RuntimeError("All LLM providers failed")


def _try_extract_json(text: str) -> Optional[Any]:
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                pass
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                pass
    return None


# ── External Candidate Sourcing (Gemini Search Grounding) ──────────────

EXTERNAL_SOURCING_PROMPT = """You are the THCO Recruit Flow external sourcing agent.

Goal:
Use web search to find real, currently-findable people who plausibly fit this role — candidates who are NOT already in THCO's internal database. Surface leads a recruiter would otherwise have to hand-search on LinkedIn, GitHub, or Google.

Rules:
- Return ONLY the JSON object. No prose, no markdown fences.
- Every lead MUST come from an actual search result. Do not invent a person, a URL, a title, or a company.
- Prefer public professional profiles: LinkedIn, GitHub, personal portfolios, conference speaker pages, published articles/papers with an author profile, company "team" pages.
- Never fabricate contact details. Only include an email or phone if it was literally visible in the search result; otherwise omit the field.
- For each lead, cite the real URL you found them at as sourceUrl.
- Summarize only what the source page actually shows — do not guess salary, notice period, or availability.
- Skip anyone matching a name in the exclusion list.
- Confidence: "High" = strong direct title/skill match; "Medium" = plausible but some assumptions; "Low" = weak or partial match.
- Return at most 15 leads. Fewer real leads is better than padding with weak or invented ones.

Job:
%s

%s
%s

Return exactly this JSON shape:
{
  "leads": [
    {
      "name": "Full Name",
      "currentRole": "title or null",
      "currentCompany": "company or null",
      "location": "city, country or null",
      "linkedinUrl": "https://linkedin.com/in/... or null",
      "sourcePlatform": "LinkedIn | GitHub | Portfolio | Article | Company Page",
      "sourceUrl": "https://... the real URL you found this person at",
      "skills": ["skill evidence found on the page"],
      "summary": "1-2 sentences of what the source page actually says about them",
      "matchReasons": ["specific evidence this person fits the role"],
      "confidence": "High" | "Medium" | "Low"
    }
  ]
}"""


def _try_serpapi(keywords, role, location, max_results) -> List[Dict]:
    if not SERPAPI_KEY:
        return []
    try:
        from serpapi import Client
        client = Client(api_key=SERPAPI_KEY)
        query = " ".join(f'"{k}"' for k in ([role] + keywords[:3]) if k)
        if location:
            query += f' "{location}"'
        results = client.search({
            "engine": "google", "q": f'site:linkedin.com/in {query}',
            "num": min(max_results, 100),
        }, timeout=15)
        out = []
        for r in results.get("organic_results", []):
            title = r.get("title", "")
            out.append({
                "name": _extract_name_from_title(title), "title": title,
                "currentRole": _extract_role_from_title(title),
                "currentCompany": None, "location": location,
                "linkedinUrl": r.get("link") if "linkedin.com/in" in (r.get("link") or "") else None,
                "sourceUrl": r.get("link", ""), "sourcePlatform": "LinkedIn",
                "skills": [], "summary": (r.get("snippet", "") or "")[:200],
                "matchReasons": [], "confidence": "Medium",
            })
        logger.info(f"SerpAPI returned {len(out)} results")
        return out
    except Exception as e:
        logger.warning(f"SerpAPI failed: {e}")
        return []


def _try_serper(keywords, role, location, max_results) -> List[Dict]:
    if not SERPER_KEY:
        return []
    try:
        import httpx
        query = " ".join(f'"{k}"' for k in ([role] + keywords[:3]) if k)
        if location:
            query += f' "{location}"'

        # Paginate to get up to max_results (free tier: 10 per page)
        all_results = []
        seen_urls = set()
        page = 1
        while len(all_results) < max_results and page <= 10:
            resp = httpx.post(
                "https://google.serper.dev/search",
                json={
                    "q": f'site:linkedin.com/in {query}',
                    "num": 10,
                    "page": page,
                },
                headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"}, timeout=15,
            )
            data = resp.json()
            organic = data.get("organic", [])
            if not organic:
                break
            for r in organic:
                url = r.get("link", "")
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                title = r.get("title", "")
                all_results.append({
                    "name": _extract_name_from_title(title), "title": title,
                    "currentRole": _extract_role_from_title(title),
                    "currentCompany": None, "location": location,
                    "linkedinUrl": url if "linkedin.com/in" in url else None,
                    "sourceUrl": url, "sourcePlatform": "LinkedIn",
                    "skills": [], "summary": (r.get("snippet", "") or "")[:200],
                    "matchReasons": [], "confidence": "Medium",
                })
                if len(all_results) >= max_results:
                    break
            page += 1
        logger.info(f"Serper returned {len(all_results)} results across {page-1} pages")
        return all_results
    except Exception as e:
        logger.warning(f"Serper failed: {e}")
        return []


def search_external_candidates(
    keywords: List[str] = None,
    role: str = "",
    location: str = "",
    experience_years: int = None,
    max_results: int = 100,
    sites: List[str] = None,
    exclude_names: List[str] = None,
    use_ai_enrich: bool = True,
    preferred_provider: str = "serpapi",
) -> List[Dict[str, Any]]:
    keywords = keywords or []

    # Provider chain: respects preferred_provider order
    web_results = []

    if preferred_provider == "serper":
        # User chose Serper first
        web_results = _try_serper(keywords, role, location, max_results)
        if not web_results:
            web_results = _try_serpapi(keywords, role, location, max_results)
    else:
        # Default: SerpAPI first
        web_results = _try_serpapi(keywords, role, location, max_results)
        if not web_results:
            web_results = _try_serper(keywords, role, location, max_results)

    # Step 2: Fall back to DuckDuckGo (free, unlimited)
    if not web_results:
        web_results = _search_web_for_candidates(
            role=role, skills=keywords, location=location,
            max_results=max_results, sites=sites,
        )

    # Filter out excluded names
    if exclude_names:
        exclude_lower = {n.lower() for n in exclude_names if n}
        web_results = [r for r in web_results if (r.get("name") or "").lower() not in exclude_lower]

    # AI enrichment — disabled in web search to prevent Gemini timeouts
    # Re-enable by setting use_ai_enrich=True and having a working Gemini/Groq key

    return web_results[:max_results]


def _enrich_with_ai(web_results: List[Dict], role: str, skills: List[str]) -> List[Dict]:
    """Use Groq/Gemini to enrich web search results with skills and role extraction."""
    # Only enrich if we have an LLM available
    has_llm = bool(GEMINI_API_KEY or GEMINI_API_KEY_FALLBACK or GROQ_API_KEY)
    if not has_llm:
        return web_results

    try:
        titles_text = "\n".join([f"{i+1}. {r.get('title', '')}" for i, r in enumerate(web_results[:20])])

        prompt = f"""You are a talent sourcing assistant. Given a list of search result titles for the role "{role}" requiring skills: {json.dumps(skills)}, extract structured data.

For each result, determine:
- name: the person's full name (if visible in the title)
- currentRole: their likely job title
- skills: skills mentioned or implied
- confidence: High/Medium/Low based on how well they match

Search results:
{titles_text}

Return JSON: {{"candidates": [{{"index": 1, "name": "...", "currentRole": "...", "skills": [...], "confidence": "Medium"}}]}}"""

        text = _generate_llm_text(prompt, grounded=False, temperature=0.2, json_mode=True)
        enriched = _try_extract_json(text)

        if enriched and isinstance(enriched.get("candidates"), list):
            enrich_map = {c["index"] - 1: c for c in enriched["candidates"] if "index" in c}
            for i, r in enumerate(web_results):
                if i in enrich_map:
                    e = enrich_map[i]
                    if e.get("name"):
                        r["name"] = e["name"]
                    if e.get("currentRole"):
                        r["currentRole"] = e["currentRole"]
                    if e.get("skills"):
                        r["skills"] = e["skills"]
                    if e.get("confidence"):
                        r["confidence"] = e["confidence"]
    except Exception as e:
        logger.warning(f"Enrichment parse error: {e}")

    return web_results


# ── Boolean Search Pack Generation ─────────────────────────────────────

def _split_terms(value) -> List[str]:
    if isinstance(value, list):
        raw = ", ".join(value)
    elif value:
        raw = str(value)
    else:
        return []

    import re
    terms = re.split(r'[\r\n|,;\/]+', raw)
    return [t.strip() for t in terms if len(t.strip()) > 1]


def build_boolean_search_pack(
    role: str = "",
    skills: List[str] = None,
    location: str = "",
    company: str = "",
) -> List[Dict[str, str]]:
    skills = skills or []
    must_skills = skills[:5]
    location_terms = _split_terms(location)
    role_terms = [role]
    if role:
        alt = role.replace("Engineer", "").replace("engineer", "").replace("Developer", "").replace("developer", "").strip()
        if alt and alt != role:
            role_terms.append(alt)

    role_group = " OR ".join(f'"{t}"' for t in role_terms if t)
    skill_group = " OR ".join(f'"{s}"' for s in must_skills) if must_skills else f'"{role}"'
    location_group = ""
    if location_terms:
        location_group = " (" + " OR ".join(f'"{l}"' for l in location_terms) + ")"
    exclusions = '-jobs -hiring -recruiter -"we are hiring"'

    return [
        {
            "label": "LinkedIn / Recruiter Boolean",
            "query": f"({role_group}) AND ({skill_group}){location_group}",
        },
        {
            "label": "Google X-Ray LinkedIn",
            "query": f"site:linkedin.com/in ({role_group}) ({skill_group}){location_group} {exclusions}",
        },
        {
            "label": "GitHub Technical X-Ray",
            "query": f"site:github.com ({skill_group}) ({role_group}){location_group} -jobs -issues",
        },
        {
            "label": "ContactOut / Enrichment Brief",
            "query": f"Role: {role or 'target role'}; skills: {', '.join(must_skills) or 'use JD must-haves'}; location: {location or 'open'}; company context: {company}",
        },
    ]


# ── AI-Enhanced CV Parsing (Gemini) ────────────────────────────────────

CV_EXTRACTION_PROMPT = """You are the THCO Recruit Flow CV extraction agent.

Goal: Read this CV and extract structured candidate data accurately.

Rules:
- Return valid JSON only. No prose, no markdown fences.
- Do not invent information. If a field is not present in the CV, return null for that field.
- For skills: extract ALL skills mentioned anywhere in the CV — technical tools, platforms, programming languages, functional skills, soft skills relevant to a professional context.
- For achievements: extract only statements that show measurable impact, business outcomes, or notable accomplishments. Prefer quantified ones.
- For industryBackground: infer the primary industry or domain from the companies and roles.
- For currentRole and currentCompany: use the most recent position.
- For previousRoles and previousCompanies: list earlier jobs in reverse chronological order, excluding the current one.
- For seniorityLevel: classify as exactly one of "Entry", "Mid", "Senior", "Lead", "Head", "Director", "Executive".
- For yearsOfExperience: calculate from earliest work entry to today. Return as a number.
- For education: extract highest qualification — include degree type, institution, and year if present.
- Salary figures: return as numbers without currency symbols. If stated in millions, convert.

CV text:
%s

Return exactly this JSON shape:
{
  "name": "Full Name or null",
  "email": "email or null",
  "phone": "phone or null",
  "linkedinUrl": "URL or null",
  "currentRole": "Most recent job title or null",
  "currentCompany": "Most recent employer or null",
  "previousRoles": ["Earlier title 1"],
  "previousCompanies": ["Earlier employer 1"],
  "seniorityLevel": "Entry | Mid | Senior | Lead | Head | Director | Executive or null",
  "yearsOfExperience": 5,
  "industryBackground": "Industry / Domain or null",
  "education": "Degree, Institution, Year or null",
  "location": "City, Country or null",
  "skills": ["skill1"],
  "achievements": ["quantified achievement"],
  "currentSalary": null,
  "expectedSalary": null,
  "noticePeriod": null
}"""


def parse_cv_with_ai(raw_text: str) -> Optional[Dict[str, Any]]:
    if not raw_text or not GEMINI_API_KEY:
        return None
    try:
        prompt = CV_EXTRACTION_PROMPT % raw_text[:12000]
        text = _generate_llm_text(prompt, json_mode=True, temperature=0.1)
        return _try_extract_json(text)
    except Exception as e:
        logger.warning(f"AI CV parsing failed: {e}")
        return None


# ── JD Analysis / Candidate Matching Rubric ────────────────────────────

JD_ANALYSIS_PROMPT = """You are the THCO Recruit Flow JD analysis agent.

Goal: Synthesize the job description into a recruiter-grade matching rubric for scoring candidates.

Rules:
- Return valid JSON only.
- Use semantic matching guidance, not strict keyword search.
- Include N-1 role titles for senior roles.
- Include adjacent titles that can credibly move into the role.
- Include avoid titles for too senior, too junior, or wrong-function candidates.

Job:
Title: {title}
Company: {company}
Location: {location}
Description: {description}

Return exactly this JSON shape:
{{
  "targetTitles": ["exact/same-level titles"],
  "n1Titles": ["one-level-below titles"],
  "adjacentTitles": ["adjacent transferable titles"],
  "avoidTitles": ["too senior, junior, or wrong-function titles"],
  "mustHaveSkills": ["must-have capabilities"],
  "niceToHaveSkills": ["nice-to-have capabilities"],
  "industrySignals": ["preferred industries"],
  "companyStageSignals": ["preferred company stages"],
  "minYearsExperience": 0,
  "maxYearsExperience": 0,
  "scoringNotes": ["rubric application notes"]
}}"""


def analyze_jd_for_matching(
    title: str = "",
    company: str = "",
    location: str = "",
    description: str = "",
) -> Optional[Dict[str, Any]]:
    if not description or not GEMINI_API_KEY:
        return None
    try:
        prompt = JD_ANALYSIS_PROMPT.format(
            title=title,
            company=company,
            location=location,
            description=description[:4000],
        )
        text = _generate_llm_text(prompt, json_mode=True, temperature=0.2)
        return _try_extract_json(text)
    except Exception as e:
        logger.warning(f"JD analysis failed: {e}")
        return None


# ── Candidate Scoring (Recruit-flow style deterministic + weighted) ───

def _safe_lower(items):
    if not items:
        return set()
    return set(s.lower() for s in items if s)


def score_candidate_against_rubric(candidate: dict, rubric: dict) -> dict:
    """Score a candidate against a JD matching rubric. 10 weighted dimensions, 0-100 total."""

    cand_skills = _safe_lower(candidate.get("skills", []))
    cand_name = (candidate.get("name") or "").lower()
    cand_role = (candidate.get("current_role") or "").lower()
    cand_exp = candidate.get("experience_years") or 0
    cand_text = (candidate.get("raw_text") or "").lower()

    target_titles = _safe_lower(rubric.get("targetTitles", []))
    n1_titles = _safe_lower(rubric.get("n1Titles", []))
    adjacent_titles = _safe_lower(rubric.get("adjacentTitles", []))
    avoid_titles = _safe_lower(rubric.get("avoidTitles", []))
    must_skills = _safe_lower(rubric.get("mustHaveSkills", []))
    nice_skills = _safe_lower(rubric.get("niceToHaveSkills", []))
    industry_signals = _safe_lower(rubric.get("industrySignals", []))
    min_exp = rubric.get("minYearsExperience", 0) or 0
    max_exp = rubric.get("maxYearsExperience", 99) or 99

    scores = {}
    reasons = []

    # 1. Skills match (25 points)
    if must_skills:
        must_hit = sum(1 for s in must_skills if s in cand_skills or s in cand_text)
        must_ratio = must_hit / len(must_skills)
        scores["skills"] = int(must_ratio * 20)
        if nice_skills:
            nice_hit = sum(1 for s in nice_skills if s in cand_skills or s in cand_text)
            nice_ratio = nice_hit / len(nice_skills)
            scores["skills"] += int(nice_ratio * 5)
    else:
        scores["skills"] = 12
    if scores["skills"] >= 15:
        reasons.append(f"Strong skill match: {scores['skills']}/25")

    # 2. Title match (20 points)
    all_good_titles = target_titles | n1_titles | adjacent_titles
    if avoid_titles and cand_role in avoid_titles:
        scores["title"] = 0
        reasons.append("Title flagged as avoid")
    elif cand_role in target_titles:
        scores["title"] = 20
        reasons.append("Exact title match")
    elif cand_role in n1_titles:
        scores["title"] = 16
        reasons.append("N-1 title match (promotable)")
    elif cand_role in adjacent_titles:
        scores["title"] = 10
        reasons.append("Adjacent/transferable title")
    elif all_good_titles:
        scores["title"] = 5
    else:
        scores["title"] = 8

    # 3. Experience range (15 points)
    if min_exp <= cand_exp <= max_exp:
        scores["experience"] = 15
        reasons.append(f"Experience in range ({min_exp}-{max_exp}y)")
    elif cand_exp < min_exp and cand_exp >= min_exp * 0.7:
        scores["experience"] = 8
    elif cand_exp > max_exp and cand_exp <= max_exp * 1.5:
        scores["experience"] = 8
    else:
        scores["experience"] = 3

    # 4. Industry match (10 points)
    if industry_signals:
        industry_hit = any(inds in cand_text for inds in industry_signals)
        scores["industry"] = 10 if industry_hit else 3
        if industry_hit:
            reasons.append("Industry alignment")
    else:
        scores["industry"] = 5

    # 5. Seniority level (10 points)
    seniority = (candidate.get("seniority_level") or "").lower()
    if seniority in ("senior", "lead", "head"):
        scores["seniority"] = 10
    elif seniority == "mid":
        scores["seniority"] = 7
    elif seniority in ("entry", "junior"):
        scores["seniority"] = 4
    else:
        scores["seniority"] = 5

    # 6. Tools match (5 points)
    scores["tools"] = 5 if len(cand_skills) >= len(must_skills) * 0.5 else 2

    # 7. Location match (5 points)
    loc = (candidate.get("location") or "").lower()
    if loc:
        scores["location"] = 3
    else:
        scores["location"] = 0

    # 8. CV quality (5 points)
    text_len = len(candidate.get("raw_text", "") or "")
    if text_len > 2000:
        scores["cv_quality"] = 5
    elif text_len > 500:
        scores["cv_quality"] = 3
    else:
        scores["cv_quality"] = 1

    # 9. Engagement (3 points)
    status = candidate.get("status", "new")
    scores["engagement"] = 3 if status in ("shortlisted", "interviewing") else 1

    # 10. Consent/verification (2 points)
    scores["consent"] = 2 if candidate.get("email") else 0

    total = sum(scores.values())
    score = min(100, total)

    return {
        "score": score,
        "breakdown": scores,
        "reasons": reasons[:5],
    }


# ── Unified Search (Internal + External) ──────────────────────────────

def build_search_query_from_rubric(rubric: dict) -> dict:
    """Build MongoDB query from a JD matching rubric for internal search."""
    query_parts = []

    all_titles = list(rubric.get("targetTitles", [])) + list(rubric.get("n1Titles", [])) + list(rubric.get("adjacentTitles", []))
    if all_titles:
        title_regex = "|".join(re.escape(t) for t in all_titles if t)
        if title_regex:
            query_parts.append({
                "$or": [
                    {"current_role": {"$regex": title_regex, "$options": "i"}},
                    {"raw_text": {"$regex": title_regex, "$options": "i"}},
                ]
            })

    must_skills = rubric.get("mustHaveSkills", [])
    if must_skills:
        for skill in must_skills:
            if skill:
                query_parts.append({
                    "$or": [
                        {"skills": {"$regex": re.escape(skill), "$options": "i"}},
                        {"raw_text": {"$regex": re.escape(skill), "$options": "i"}},
                    ]
                })

    exp_filter = {}
    if rubric.get("minYearsExperience"):
        exp_filter["$gte"] = rubric["minYearsExperience"]
    else:
        exp_filter["$gte"] = 0
    if rubric.get("maxYearsExperience"):
        exp_filter["$lte"] = rubric["maxYearsExperience"]
    else:
        exp_filter["$lte"] = 99

    query = {"experience_years": exp_filter}
    if query_parts:
        query["$and"] = query_parts

    return query

