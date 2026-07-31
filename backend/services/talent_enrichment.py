import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def enrich_candidate(db, candidate_id: str, llm_available: bool = True) -> Optional[Dict]:
    """Enrich an external candidate with AI intelligence: summary, strengths, roles, skills, confidence."""
    doc = await db.external_candidates.find_one({"candidate_id": candidate_id})
    if not doc:
        return None

    # Skip if already enriched
    if doc.get("enriched") and not doc.get("stale"):
        return doc

    if llm_available:
        try:
            enriched = await _ai_enrich(db, doc)
            if enriched:
                return enriched
        except Exception as e:
            logger.warning(f"AI enrichment failed for {candidate_id}: {e}")

    # Deterministic enrichment fallback
    doc = _deterministic_enrich(doc)
    doc["enriched"] = True
    doc["enriched_at"] = datetime.now(timezone.utc).isoformat()
    doc["enrichment_method"] = "deterministic"

    await db.external_candidates.update_one(
        {"candidate_id": candidate_id},
        {"$set": {
            "enriched": True,
            "enriched_at": doc["enriched_at"],
            "enrichment_method": "deterministic",
            "ai_summary": doc.get("ai_summary"),
            "strengths": doc.get("strengths"),
            "recommended_roles": doc.get("recommended_roles"),
            "skill_categories": doc.get("skill_categories"),
            "seniority": doc.get("seniority"),
            "industries": doc.get("industries"),
            "confidence_score": doc.get("confidence_score"),
        }}
    )
    return doc


def _deterministic_enrich(doc: Dict) -> Dict:
    skills = doc.get("skills", []) or []
    role = (doc.get("current_role") or doc.get("title") or "").lower()
    exp = doc.get("experience_years") or 0

    # Skill categories
    skill_categories = {}
    category_map = {
        "programming": {"python", "java", "javascript", "typescript", "c#", "go", "rust", "ruby", "php", "swift", "kotlin", "scala"},
        "frontend": {"react", "angular", "vue", "next.js", "svelte", "html", "css", "tailwind", "bootstrap"},
        "backend": {"django", "flask", "fastapi", "spring", "express", "node.js", "laravel", "rails", ".net", "graphql", "rest"},
        "cloud": {"aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "serverless", "lambda"},
        "data": {"sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "snowflake", "bigquery", "spark", "hadoop", "kafka", "pandas", "numpy"},
        "devops": {"jenkins", "ci/cd", "github actions", "ansible", "helm", "prometheus", "grafana", "linux", "bash"},
        "ai_ml": {"machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "scikit-learn", "llm", "rag"},
        "mobile": {"android", "ios", "react native", "flutter", "xamarin", "swift", "kotlin"},
        "design": {"figma", "sketch", "adobe", "photoshop", "illustrator", "ui", "ux"},
    }

    for category, keywords in category_map.items():
        matched = [s for s in skills if s.lower() in keywords]
        if matched:
            skill_categories[category] = matched

    # Seniority detection
    seniority = "Mid"
    seniority_signals = {
        "Entry": ["junior", "entry", "intern", "graduate", "trainee"],
        "Mid": ["mid", "intermediate", "developer", "engineer"],
        "Senior": ["senior", "sr", "lead", "principal", "staff"],
        "Head": ["head", "manager", "director", "vp", "chief", "cto"],
    }
    for level, signals in seniority_signals.items():
        if any(s in role for s in signals):
            seniority = level

    # Experience-based seniority override
    if exp >= 8:
        seniority = "Senior"
    elif exp >= 5:
        seniority = "Mid"
    elif exp <= 2:
        seniority = "Entry"

    # Industries
    industry_signals = {
        "fintech": ["fintech", "payment", "bank", "financial", "insurance"],
        "health": ["health", "medical", "pharma", "hospital", "clinic"],
        "ecommerce": ["ecommerce", "e-commerce", "retail", "marketplace"],
        "saas": ["saas", "software", "platform", "b2b"],
        "telecom": ["telecom", "telco", "network", "isp"],
        "oil_gas": ["oil", "gas", "energy", "petroleum"],
        "consulting": ["consulting", "advisory", "professional services"],
        "education": ["education", "edtech", "learning", "university"],
    }

    raw_text = (doc.get("raw_text") or doc.get("summary") or "").lower()
    industries = []
    for ind, signals in industry_signals.items():
        if any(s in raw_text for s in signals):
            industries.append(ind)

    # Strengths from skill density
    strengths = []
    if len(skills) > 10:
        strengths.append(f"Broad technical expertise across {len(skills)} skills")
    if exp >= 5:
        strengths.append(f"{exp}+ years of professional experience")
    for cat, cskills in skill_categories.items():
        if len(cskills) >= 3:
            strengths.append(f"Strong {cat} background ({', '.join(cskills[:3])})")

    # Recommended roles from skills
    recommended_roles = []
    if any(s in [x.lower() for x in skills] for s in ["python", "django", "flask", "fastapi"]):
        recommended_roles.append("Backend Python Developer")
    if any(s in [x.lower() for x in skills] for s in ["java", "spring"]):
        recommended_roles.append("Java Developer")
    if any(s in [x.lower() for x in skills] for s in ["react", "angular", "vue"]):
        recommended_roles.append("Frontend Developer")
    if any(s in [x.lower() for x in skills] for s in ["react", "node"]):
        recommended_roles.append("Full Stack Developer")
    if any(s in [x.lower() for x in skills] for s in ["aws", "docker", "kubernetes", "terraform"]):
        recommended_roles.append("DevOps Engineer")
    if any(s in [x.lower() for x in skills] for s in ["tensorflow", "pytorch", "machine learning"]):
        recommended_roles.append("ML Engineer")

    # Confidence score
    confidence = 50
    if doc.get("linkedin"):
        confidence += 20
    if doc.get("email"):
        confidence += 10
    if skills and len(skills) >= 5:
        confidence += 10
    if doc.get("current_role"):
        confidence += 5
    if doc.get("experience_years"):
        confidence += 5
    confidence = min(100, confidence)

    return {
        **doc,
        "ai_summary": None,
        "strengths": strengths[:5] or ["Technical professional with relevant skills"],
        "recommended_roles": recommended_roles[:3] or [role.title() or "Technical Professional"],
        "skill_categories": {k: v[:5] for k, v in skill_categories.items() if v},
        "seniority": seniority,
        "industries": industries[:3],
        "confidence_score": confidence,
    }


async def _ai_enrich(db, doc: Dict) -> Optional[Dict]:
    """Use LLM to generate AI intelligence for a candidate."""
    try:
        from services.talent_search import _generate_llm_text, _try_extract_json, GEMINI_API_KEY, GROQ_API_KEY

        if not GEMINI_API_KEY and not GROQ_API_KEY:
            return None
    except Exception:
        return None

    skills = doc.get("skills", []) or []
    role = doc.get("current_role") or doc.get("title") or ""
    location = doc.get("location") or ""
    summary = doc.get("summary") or doc.get("raw_text", "") or ""

    prompt = f"""Analyze this candidate profile and return structured intelligence:

Name: {doc.get('name', 'Unknown')}
Current Role: {role}
Skills: {', '.join(skills)}
Location: {location}
Background: {summary[:500]}

Return JSON:
{{
  "ai_summary": "2-3 sentence professional overview",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "recommended_roles": ["role 1", "role 2"],
  "seniority": "Entry|Mid|Senior|Lead|Head",
  "industries": ["industry 1"],
  "confidence_score": 75
}}"""

    text = None
    try:
        text = _generate_llm_text(prompt, grounded=False, temperature=0.2, json_mode=True)
    except Exception as e:
        logger.warning(f"LLM enrichment call failed: {e}")
        return None

    if not text:
        return None
    result = _try_extract_json(text)

    if result:
        doc["ai_summary"] = result.get("ai_summary")
        doc["strengths"] = result.get("strengths", [])
        doc["recommended_roles"] = result.get("recommended_roles", [])
        doc["seniority"] = result.get("seniority")
        doc["industries"] = result.get("industries", [])
        doc["confidence_score"] = result.get("confidence_score", 50)
        doc["enriched"] = True
        doc["enriched_at"] = datetime.now(timezone.utc).isoformat()
        doc["enrichment_method"] = "ai"

        await db.external_candidates.update_one(
            {"candidate_id": doc["candidate_id"]},
            {"$set": {
                "ai_summary": doc["ai_summary"],
                "strengths": doc["strengths"],
                "recommended_roles": doc["recommended_roles"],
                "seniority": doc["seniority"],
                "industries": doc["industries"],
                "confidence_score": doc["confidence_score"],
                "enriched": True,
                "enriched_at": doc["enriched_at"],
                "enrichment_method": "ai",
            }}
        )
        return doc
    return None
