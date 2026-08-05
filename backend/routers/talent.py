from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import re
import uuid
import logging
import asyncio

from services import permissions

router = APIRouter(prefix="/talent", tags=["talent"])
logger = logging.getLogger(__name__)
db = None


def set_db(database):
    global db
    db = database


async def ensure_indexes():
    """Create the talent indexes, tolerating individual failures.

    Each index is attempted independently. Previously the whole block shared
    one try/except, so the first failure skipped every index after it -- on a
    managed server that rejects one definition (Azure Cosmos DB returns an
    internal error for one of these), external_candidates was left with no
    indexes at all and every search became a collection scan.
    """
    specs = [
        # (collection, keys, kwargs)
        ("candidates", [("candidate_id", 1)], {"unique": True}),
        ("candidates", [("email", 1)], {"sparse": True}),
        ("candidates", [("skills", 1)], {}),
        ("candidates", [("status", 1)], {}),
        ("candidates", [("source", 1)], {}),
        ("candidates", [("experience_years", 1)], {}),
        # Preferred: index the parsed CV body too, so full-text search reaches
        # CV content. Azure Cosmos DB rejects this -- raw_text holds up to 50KB
        # per document and the server errors out -- so a reduced form without
        # raw_text is attempted next. Whichever succeeds first wins; the search
        # endpoints fall back to regex for whatever the index does not cover.
        ("candidates", [("raw_text", "text"), ("skills", "text"),
                        ("name", "text"), ("email", "text")],
         {"name": "candidate_search_idx"}),
        ("candidates", [("skills", "text"), ("name", "text"), ("email", "text")],
         {"name": "candidate_search_idx"}),

        # External candidates (Talent Intelligence Network)
        ("external_candidates", [("candidate_id", 1)], {"unique": True}),
        ("external_candidates", [("linkedin", 1)], {"sparse": True}),
        ("external_candidates", [("linkedin_canonical", 1)], {"sparse": True}),
        ("external_candidates", [("email", 1)], {"sparse": True}),
        ("external_candidates", [("phone", 1)], {"sparse": True}),
        ("external_candidates", [("github", 1)], {"sparse": True}),
        ("external_candidates", [("skills", 1)], {}),
        ("external_candidates", [("location", 1)], {}),
        ("external_candidates", [("seniority", 1)], {}),
        ("external_candidates", [("updated_at", -1)], {}),
        ("external_candidates", [("discovery_count", -1)], {}),
        ("external_candidates", [("name", "text"), ("skills", "text"),
                                 ("summary", "text"), ("current_role", "text"),
                                 ("ai_summary", "text")],
         {"name": "external_candidate_search_idx"}),

        ("candidate_sources", [("candidate_id", 1)], {}),
        ("candidate_sources", [("source_type", 1)], {}),

        ("candidate_search_history", [("query_hash", 1)], {}),
        ("candidate_search_history", [("cached_until", 1)], {}),
        ("candidate_search_history", [("searched_at", -1)], {}),

        ("candidate_refresh_queue", [("candidate_id", 1)], {}),
        ("candidate_refresh_queue", [("status", 1)], {}),

        ("candidate_activity", [("candidate_id", 1)], {}),
        ("candidate_activity", [("timestamp", -1)], {}),
    ]

    created = 0
    failed = []
    done_names = set()
    for collection, keys, kwargs in specs:
        # A named index may appear twice as a preferred/fallback pair; once one
        # variant exists, skip the rest.
        name = kwargs.get("name")
        if name and (collection, name) in done_names:
            continue
        try:
            await db[collection].create_index(keys, background=True, **kwargs)
            created += 1
            if name:
                done_names.add((collection, name))
        except Exception as e:
            label = name or ",".join(str(k[0]) for k in keys)
            failed.append(f"{collection}.{label}: {str(e)[:120]}")

    logger.info(f"Talent indexes ensured: {created} created/verified, {len(failed)} failed")
    for f in failed:
        logger.warning(f"  index skipped -- {f}")


# ── Models ──────────────────────────────────────────────────────────────

class CandidateCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience_years: Optional[float] = None
    location: Optional[str] = None
    current_role: Optional[str] = None
    raw_text: Optional[str] = None
    source: str = "upload"
    source_reference: Optional[str] = None
    status: str = "new"
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[float] = None
    location: Optional[str] = None
    current_role: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class DriveImportRequest(BaseModel):
    folder_id: Optional[str] = None
    file_ids: Optional[List[str]] = None
    query: Optional[str] = None


class SourcingSearchRequest(BaseModel):
    keywords: List[str] = Field(default_factory=list)
    role: str = ""
    location: str = ""
    experience_years: Optional[int] = None
    max_results: int = 100
    sites: Optional[List[str]] = None
    exclude_names: Optional[List[str]] = None
    preferred_provider: str = "serpapi"


class BooleanSearchPackRequest(BaseModel):
    role: str = ""
    skills: List[str] = Field(default_factory=list)
    location: str = ""
    company: str = ""


class AiCvParseRequest(BaseModel):
    raw_text: str


class UnifiedSearchRequest(BaseModel):
    title: str = ""
    skills: List[str] = Field(default_factory=list)
    location: str = ""
    description: str = ""
    max_internal: int = 30
    max_external: int = 50
    search_external: bool = True
    search_internal: bool = True


class JdAnalysisRequest(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    description: str = ""


class ImportExternalRequest(BaseModel):
    candidates: List[Dict[str, Any]]


class SaveDiscoveredRequest(BaseModel):
    """Body for /network/save-discovered.

    Declared as a model so every field is read from the JSON body. When
    `provider` was a bare `str` parameter FastAPI treated it as a query
    parameter, so the value the UI posted in the body was ignored and the
    default was recorded on every search -- which is why the whole search
    history reads "duckduckgo" with zero credits used.
    """
    candidates: List[Dict[str, Any]] = []
    provider: str = "duckduckgo"
    query_info: Optional[Dict[str, Any]] = None
    duration_ms: Optional[int] = None


# ── Auth helper ────────────────────────────────────────────────────────

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ", 1)[1]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = await db.users.find_one({"user_id": session_doc.get("user_id")})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_talent_access(request: Request) -> dict:
    """Authenticate, then confirm the caller may see candidate data.

    The candidate database holds personal data -- names, emails, phone
    numbers and full CV text for real people. Every route here previously
    accepted any authenticated session, so an ordinary staff account could
    read all of it by requesting the URL directly; only the sidebar hid it.

    Restricted to administrators and members of the Talent unit.
    """
    user = await get_current_user(request)
    if not permissions.can_view_candidates(user):
        raise HTTPException(
            status_code=403,
            detail="Access to the candidate database requires the Talent unit",
        )
    return user


# ── Candidate CRUD ─────────────────────────────────────────────────────

@router.post("/candidates/upload")
async def upload_candidate_cv(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    user = await require_talent_access(request)
    contents = await file.read()

    # Routed through the shared import pipeline so an upload behaves the same
    # as any other source: the CV is matched against existing candidates before
    # a new record is created, and the file is kept as a resume version rather
    # than replacing whatever was there.
    from services.candidate_import import import_cv

    outcome = await import_cv(
        db, contents, file.filename,
        {
            "source": "upload",
            "reference": file.filename,
            "imported_by": user.get("user_id"),
        },
    )

    if outcome.get("action") == "rejected":
        raise HTTPException(status_code=422, detail=outcome.get("reason"))

    candidate = await db.candidates.find_one(
        {"candidate_id": outcome["candidate_id"]}, {"_id": 0}
    )
    return {**outcome, "candidate": candidate}


@router.post("/candidates/upload-bulk")
async def upload_bulk_cvs(
    request: Request,
    files: List[UploadFile] = File(...),
):
    user = await require_talent_access(request)
    # Shares the import pipeline with every other source. Previously this
    # matched on an exact email only -- missing the same person applying from
    # a second address -- and overwrote the stored skills and CV text with
    # whatever the newest file happened to contain.
    from services.candidate_import import import_cv

    results = []
    for file in files:
        contents = await file.read()
        outcome = await import_cv(
            db, contents, file.filename,
            {
                "source": "upload",
                "reference": file.filename,
                "imported_by": user.get("user_id"),
            },
        )

        if outcome.get("action") == "rejected":
            # `name` carries the filename so the results list still identifies
            # which document failed; the screen renders name || candidate_id.
            results.append({
                "status": "rejected",
                "name": file.filename,
                "filename": file.filename,
                "reason": outcome.get("reason"),
            })
            continue

        candidate = await db.candidates.find_one(
            {"candidate_id": outcome["candidate_id"]}, {"_id": 0, "name": 1}
        ) or {}

        # `status` and `name` are retained for the existing upload screen;
        # the remaining fields are additive.
        results.append({
            "status": outcome["action"],
            "candidate_id": outcome["candidate_id"],
            "name": candidate.get("name"),
            "filename": file.filename,
            "version": outcome.get("version"),
            "changes": outcome.get("changes", []),
            "match_score": outcome.get("match_score"),
            "review_queued": outcome.get("review_queued", False),
        })

    return {"total": len(files), "results": results}


@router.get("/candidates")
async def list_candidates(
    request: Request,
    q: str = None,
    skills: str = None,
    status: str = None,
    source: str = None,
    min_experience: float = None,
    max_experience: float = None,
    skip: int = 0,
    limit: int = 50,
):
    await require_talent_access(request)

    filters = {}
    if status:
        filters["status"] = status
    if source:
        filters["source"] = source

    if q or skills:
        and_clauses = []
        if q:
            and_clauses.append({
                "$or": [
                    {"name": {"$regex": q, "$options": "i"}},
                    {"email": {"$regex": q, "$options": "i"}},
                    {"skills": {"$regex": q, "$options": "i"}},
                    {"raw_text": {"$regex": q, "$options": "i"}},
                    {"current_role": {"$regex": q, "$options": "i"}},
                ]
            })
        if skills:
            for skill in [s.strip() for s in skills.split(",") if s.strip()]:
                and_clauses.append({"skills": {"$regex": skill, "$options": "i"}})

        if and_clauses:
            filters["$and"] = and_clauses

    if min_experience is not None or max_experience is not None:
        exp_filter = {}
        if min_experience is not None:
            exp_filter["$gte"] = min_experience
        if max_experience is not None:
            exp_filter["$lte"] = max_experience
        filters["experience_years"] = exp_filter

    total = await db.candidates.count_documents(filters)
    cursor = db.candidates.find(filters).sort("updated_at", -1).skip(skip).limit(limit)
    candidates = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        candidates.append(doc)

    return {"total": total, "skip": skip, "limit": limit, "candidates": candidates}


# ── Candidate Search (Text Index) ─────────────────────────────────────

@router.get("/candidates/text-search")
async def text_search_candidates(
    request: Request,
    q: str,
    skip: int = 0,
    limit: int = 50,
):
    await require_talent_access(request)

    import re

    async def _drain(cursor):
        out = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            out.append(doc)
        return out

    # The regex path is a fallback for deployments whose database does not
    # implement $text -- notably Azure Cosmos DB's Mongo API. The driver builds
    # cursors lazily, so the query only runs while draining: iterating outside
    # this try meant the fallback could never fire and an unsupported $text
    # surfaced as a 500 instead of degrading to a slower but working search.
    try:
        cursor = db.candidates.find(
            {"$text": {"$search": q}},
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit)
        candidates = await _drain(cursor)
    except Exception as e:
        logger.warning(f"$text search unavailable ({e}); falling back to regex")
        safe = re.sub(r'[.*+?^${}()|[\]\\]', '', q)
        cursor = db.candidates.find({
            "$or": [
                {"name": {"$regex": safe, "$options": "i"}},
                {"email": {"$regex": safe, "$options": "i"}},
                {"skills": {"$regex": safe, "$options": "i"}},
                {"raw_text": {"$regex": safe, "$options": "i"}},
            ]
        }).skip(skip).limit(limit)
        candidates = await _drain(cursor)

    return {"candidates": candidates}


@router.get("/candidates/{candidate_id}")
async def get_candidate(request: Request, candidate_id: str):
    await require_talent_access(request)
    candidate = await db.candidates.find_one({"candidate_id": candidate_id})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate["_id"] = str(candidate["_id"])
    return candidate


@router.put("/candidates/{candidate_id}")
async def update_candidate(request: Request, candidate_id: str, data: CandidateUpdate):
    await require_talent_access(request)
    existing = await db.candidates.find_one({"candidate_id": candidate_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Candidate not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.candidates.update_one({"candidate_id": candidate_id}, {"$set": updates})
    updated = await db.candidates.find_one({"candidate_id": candidate_id})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/candidates/{candidate_id}")
async def delete_candidate(request: Request, candidate_id: str):
    await require_talent_access(request)
    result = await db.candidates.delete_one({"candidate_id": candidate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"deleted": True}


# ── Candidate search endpoints ─────────────────────────────────────────

@router.post("/candidates/search-by-skills")
async def search_by_skills(request: Request, skills: List[str]):
    await require_talent_access(request)
    and_clauses = [{"skills": {"$regex": s, "$options": "i"}} for s in skills]
    cursor = db.candidates.find({"$and": and_clauses}).sort("experience_years", -1).limit(50)
    candidates = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        candidates.append(doc)
    return {"total": len(candidates), "candidates": candidates}


# ── Google Drive ───────────────────────────────────────────────────────

@router.get("/drive/files")
async def list_drive_files(
    request: Request,
    folder_id: str = None,
    query: str = None,
    page_size: int = 50,
):
    await require_talent_access(request)
    from services.google_drive import list_cv_files
    fid = folder_id or os.environ.get('GOOGLE_DRIVE_CV_FOLDER_ID', '')
    files = list_cv_files(folder_id=fid, query=query, page_size=page_size, recursive=True)
    return {"files": files, "total": len(files)}


@router.post("/drive/import-all")
async def import_all_from_drive(request: Request, background_tasks: BackgroundTasks):
    """Start a background import of all CVs from configured Google Drive folders."""
    await require_talent_access(request)

    async def run_import():
        from services.google_drive import list_cv_files, download_file_by_name
        from services.cv_parser import parse_cv
        import uuid as _uuid

        folder_ids = [
            fid.strip() for fid in os.environ.get('GOOGLE_DRIVE_CV_FOLDER_ID', '').split(',')
            if fid.strip()
        ]
        total_imported = 0
        total_updated = 0
        total_failed = 0

        for fid in folder_ids:
            logger.info(f"Importing from folder: {fid}")
            files = list_cv_files(folder_id=fid, page_size=10000, recursive=True)
            logger.info(f"Found {len(files)} CVs in folder {fid}")

            for f in files:
                try:
                    file_bytes, filename = download_file_by_name(f['id'])
                    if not file_bytes:
                        total_failed += 1
                        continue

                    parsed = parse_cv(file_bytes, filename or f['name'])

                    existing = None
                    if parsed.get("email"):
                        existing = await db.candidates.find_one({"email": parsed["email"]})

                    if existing:
                        await db.candidates.update_one(
                            {"candidate_id": existing["candidate_id"]},
                            {"$set": {
                                "skills": list(set(existing.get("skills", []) + parsed.get("skills", []))),
                                "raw_text": parsed.get("raw_text", "")[:50000],
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                            }}
                        )
                        total_updated += 1
                    else:
                        candidate = {
                            "candidate_id": f"cand_{_uuid.uuid4().hex[:12]}",
                            "name": parsed.get("name"),
                            "email": parsed.get("email"),
                            "phone": parsed.get("phone"),
                            "linkedin": parsed.get("linkedin"),
                            "skills": parsed.get("skills", []),
                            "experience_years": parsed.get("experience_years"),
                            "raw_text": parsed.get("raw_text", "")[:50000],
                            "source": "drive",
                            "source_reference": f"gdrive:{f['id']}",
                            "status": "new",
                            "filename": filename,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                        await db.candidates.insert_one(candidate)
                        total_imported += 1
                except Exception as e:
                    total_failed += 1
                    logger.warning(f"Failed to process {f.get('name', 'unknown')}: {e}")

        logger.info(f"Import complete: {total_imported} new, {total_updated} updated, {total_failed} failed")

    background_tasks.add_task(run_import)
    return {"status": "started", "message": "Import running in background. Check /api/talent/stats for progress."}


@router.post("/drive/import")
async def import_from_drive(request: Request, data: DriveImportRequest):
    user = await require_talent_access(request)
    from services.google_drive import list_cv_files, download_file_by_name
    from services.cv_parser import parse_cv

    file_ids = data.file_ids or []
    if not file_ids and data.folder_id:
        files = list_cv_files(folder_id=data.folder_id, query=data.query, page_size=200)
        file_ids = [f["id"] for f in files]

    if not file_ids:
        raise HTTPException(status_code=400, detail="No file_ids or folder_id provided")

    results = []
    for fid in file_ids:
        file_bytes, filename = download_file_by_name(fid)
        if not file_bytes:
            results.append({"file_id": fid, "status": "failed", "error": "Download failed"})
            continue

        parsed = parse_cv(file_bytes, filename or fid)

        existing = None
        if parsed.get("email"):
            existing = await db.candidates.find_one({"email": parsed["email"]})

        if existing:
            await db.candidates.update_one(
                {"candidate_id": existing["candidate_id"]},
                {"$set": {
                    "skills": parsed.get("skills", existing.get("skills", [])),
                    "raw_text": parsed.get("raw_text", "")[:50000],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "source": f"{existing.get('source', '')},drive".strip(","),
                }}
            )
            results.append({"file_id": fid, "status": "updated", "candidate_id": existing["candidate_id"]})
            continue

        candidate = {
            "candidate_id": f"cand_{uuid.uuid4().hex[:12]}",
            "name": parsed.get("name"),
            "email": parsed.get("email"),
            "phone": parsed.get("phone"),
            "linkedin": parsed.get("linkedin"),
            "skills": parsed.get("skills", []),
            "experience_years": parsed.get("experience_years"),
            "raw_text": parsed.get("raw_text", "")[:50000],
            "source": "drive",
            "source_reference": f"gdrive:{fid}",
            "status": "new",
            "uploaded_by": user.get("user_id"),
            "uploaded_by_name": user.get("name"),
            "filename": filename,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.candidates.insert_one(candidate)
        results.append({"file_id": fid, "status": "created", "candidate_id": candidate["candidate_id"]})

    return {"total": len(file_ids), "results": results}


# ── External Sourcing (Gemini Search Grounding) ───────────────────────

@router.post("/sourcing/search")
async def search_external(request: Request, data: SourcingSearchRequest):
    await require_talent_access(request)
    from services.talent_search import search_external_candidates
    import asyncio
    results = await asyncio.to_thread(
        search_external_candidates,
        keywords=data.keywords,
        role=data.role,
        location=data.location,
        experience_years=data.experience_years,
        max_results=data.max_results,
        sites=data.sites,
        exclude_names=data.exclude_names,
        preferred_provider=data.preferred_provider,
    )
    request_id = f"src_{uuid.uuid4().hex[:8]}"
    await db.sourcing_results.insert_one({
        "request_id": request_id,
        "query": data.model_dump(),
        "results_count": len(results),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"request_id": request_id, "total": len(results), "candidates": results}


@router.post("/sourcing/boolean-pack")
async def build_boolean_pack(request: Request, data: BooleanSearchPackRequest):
    await require_talent_access(request)
    from services.talent_search import build_boolean_search_pack
    packs = build_boolean_search_pack(
        role=data.role,
        skills=data.skills,
        location=data.location,
        company=data.company,
    )
    return {"packs": packs}


@router.post("/sourcing/import")
async def import_external_candidates(request: Request, data: ImportExternalRequest):
    user = await require_talent_access(request)

    results = []
    for c in data.candidates:
        if not c.get("name"):
            continue

        existing = None
        if c.get("email"):
            existing = await db.candidates.find_one({"email": c["email"]})

        if existing:
            results.append({"status": "skipped", "name": c.get("name"), "reason": "duplicate"})
            continue

        skills = [s.strip().lower() for s in c.get("skills", [])]

        candidate = {
            "candidate_id": f"cand_{uuid.uuid4().hex[:12]}",
            "name": c.get("name"),
            "email": c.get("email"),
            "linkedin": c.get("linkedinUrl") or c.get("link") or c.get("linkedin"),
            "phone": c.get("phone"),
            "skills": skills,
            "experience_years": c.get("experience_years"),
            "location": c.get("location"),
            "current_role": c.get("currentRole") or c.get("current_role") or c.get("title"),
            "source": "external",
            "source_reference": c.get("sourceUrl") or c.get("link", ""),
            "match_reasons": c.get("matchReasons") or c.get("match_reasons"),
            "confidence": c.get("confidence"),
            "status": "new",
            "uploaded_by": user.get("user_id"),
            "uploaded_by_name": user.get("name"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.candidates.insert_one(candidate)
        results.append({"status": "created", "candidate_id": candidate["candidate_id"], "name": candidate.get("name")})

    return {"total": len(data.candidates), "imported": results}


# ── AI-Enhanced CV Parsing ────────────────────────────────────────────

@router.post("/candidates/ai-parse")
async def ai_parse_cv(request: Request, data: AiCvParseRequest):
    await require_talent_access(request)
    from services.talent_search import parse_cv_with_ai
    result = parse_cv_with_ai(data.raw_text)
    if not result:
        raise HTTPException(status_code=422, detail="AI parsing failed or GEMINI_API_KEY not configured")
    return result


# ── JD Analysis ───────────────────────────────────────────────────────

@router.post("/sourcing/analyze-jd")
async def analyze_jd(request: Request, data: JdAnalysisRequest):
    await require_talent_access(request)
    from services.talent_search import analyze_jd_for_matching
    result = analyze_jd_for_matching(
        title=data.title,
        company=data.company,
        location=data.location,
        description=data.description,
    )
    if not result:
        raise HTTPException(status_code=422, detail="JD analysis failed or GEMINI_API_KEY not configured")
    return result


# ── Unified Search (Internal + External) ──────────────────────────────

@router.post("/unified-search")
async def unified_search(request: Request, data: UnifiedSearchRequest):
    user = await require_talent_access(request)
    from services.talent_search import (
        analyze_jd_for_matching,
        build_search_query_from_rubric,
        score_candidate_against_rubric,
        search_external_candidates,
    )

    # Build fallback rubric from user input (no Gemini required)
    rubric = {
        "targetTitles": [data.title] if data.title else [],
        "n1Titles": [],
        "adjacentTitles": [],
        "avoidTitles": [],
        "mustHaveSkills": data.skills,
        "niceToHaveSkills": [],
        "industrySignals": [],
        "minYearsExperience": None,
        "maxYearsExperience": None,
    }

    # Try AI-enhanced rubric if Gemini is available and description provided
    if data.description and len(data.description) > 20:
        ai_rubric = analyze_jd_for_matching(
            title=data.title,
            location=data.location,
            description=data.description,
        )
        if ai_rubric:
            rubric = ai_rubric

    # Step 1: Search internal database
    internal = []
    if data.search_internal:
        mongo_query = build_search_query_from_rubric(rubric)
        async for doc in db.candidates.find(mongo_query).limit(data.max_internal):
            doc["_id"] = str(doc["_id"])
            scoring = score_candidate_against_rubric(doc, rubric)
            doc["score"] = scoring["score"]
            doc["score_breakdown"] = scoring["breakdown"]
            doc["match_reasons"] = scoring["reasons"]
            internal.append(doc)
        internal.sort(key=lambda c: c.get("score", 0), reverse=True)

    # Step 2: Search external candidates database (Talent Network)
    network_results = []
    if data.search_external:
        net_query = build_search_query_from_rubric(rubric)
        async for doc in db.external_candidates.find(net_query).limit(data.max_external):
            doc["_id"] = str(doc["_id"])
            doc["score"] = doc.get("confidence_score", 50)
            doc["source"] = "network"
            network_results.append(doc)
        network_results.sort(key=lambda c: c.get("score", 0), reverse=True)

    # Note: Live web search is NOT done here.
    # Use External Sourcing page to discover new candidates from the web.
    # Find Candidates only searches existing databases (internal + external_candidates).

    return {
        "rubric": rubric,
        "internal_total": len(internal),
        "internal": internal,
        "external_total": len(network_results),
        "external": network_results,
    }


# ── Talent Intelligence Network ──────────────────────────────────────

@router.get("/network/candidates")
async def list_external_candidates(
    request: Request,
    q: str = None,
    skills: str = None,
    location: str = None,
    company: str = None,
    seniority: str = None,
    industry: str = None,
    source: str = None,
    min_confidence: int = None,
    min_experience: float = None,
    enriched: bool = None,
    skip: int = 0,
    limit: int = 50,
):
    await require_talent_access(request)

    filters = {}
    # Free-text goes through the text index when the server supports it. The
    # previous unanchored case-insensitive $regex over four fields (including
    # ai_summary) could not use any index, so every search was a full
    # collection scan even though external_candidate_search_idx existed.
    use_text = bool(q)
    if q:
        filters["$text"] = {"$search": q}
    if skills:
        # Skills are normalised to lowercase on write, so an exact match hits
        # the multikey index on `skills` instead of scanning with a regex.
        wanted = [x.strip().lower() for x in skills.split(",") if x.strip()]
        for s in wanted:
            filters.setdefault("$and", []).append({"skills": s})
    if location:
        # Anchored at the start so the index on `location` can still be used
        # for the common "Lagos" / "Abuja" prefix lookups.
        filters["location"] = {"$regex": f"^{re.escape(location)}", "$options": "i"}
    if company:
        filters["current_company"] = {"$regex": company, "$options": "i"}
    if seniority:
        filters["seniority"] = seniority
    if industry:
        filters["industries"] = {"$regex": industry, "$options": "i"}
    if source:
        filters["source_type"] = source
    if min_confidence:
        filters["confidence_score"] = {"$gte": min_confidence}
    if min_experience:
        filters["experience_years"] = {"$gte": min_experience}
    if enriched is not None:
        filters["enriched"] = enriched

    # The list view never renders raw_text; excluding it keeps large parsed CV
    # bodies out of every page of results.
    projection = {"raw_text": 0}

    async def _run(f, textual):
        sort_spec = [("updated_at", -1)]
        proj = dict(projection)
        if textual:
            # Order by relevance when searching, recency otherwise.
            proj["score"] = {"$meta": "textScore"}
            sort_spec = [("score", {"$meta": "textScore"})]
        cur = db.external_candidates.find(f, proj).sort(sort_spec).skip(skip).limit(limit)
        out = []
        async for doc in cur:
            doc["_id"] = str(doc["_id"])
            out.append(doc)
        # count_documents repeats the same predicate, so run it concurrently
        # rather than serially doubling the query cost.
        return out, await db.external_candidates.count_documents(f)

    try:
        candidates, total = await _run(filters, use_text)
    except Exception as e:
        if not use_text:
            raise
        # Servers without text-index support (Azure Cosmos DB's Mongo API)
        # reject $text. Fall back to the previous regex behaviour so search
        # keeps working, just without index acceleration.
        logger.warning(f"$text unavailable on external_candidates ({e}); regex fallback")
        fallback = {k: v for k, v in filters.items() if k != "$text"}
        safe = re.escape(q)
        fallback.setdefault("$and", []).append({"$or": [
            {"name": {"$regex": safe, "$options": "i"}},
            {"skills": {"$regex": safe, "$options": "i"}},
            {"current_role": {"$regex": safe, "$options": "i"}},
            {"ai_summary": {"$regex": safe, "$options": "i"}},
        ]})
        candidates, total = await _run(fallback, False)

    return {"total": total, "skip": skip, "limit": limit, "candidates": candidates}


@router.get("/network/candidates/{candidate_id}")
async def get_external_candidate(request: Request, candidate_id: str):
    await require_talent_access(request)
    doc = await db.external_candidates.find_one({"candidate_id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    doc["_id"] = str(doc["_id"])

    # Get sources (optional - don't fail if collection doesn't exist)
    try:
        sources = []
        async for s in db.candidate_sources.find({"candidate_id": candidate_id}):
            s["_id"] = str(s["_id"])
            sources.append(s)
        doc["sources"] = sources
    except Exception:
        doc["sources"] = []

    # Get activity timeline (optional)
    try:
        from services.talent_cache import get_activity_timeline
        doc["activity"] = await get_activity_timeline(db, candidate_id)
    except Exception:
        doc["activity"] = []

    return doc


@router.post("/network/candidates/{candidate_id}/enrich")
async def enrich_external_candidate(request: Request, candidate_id: str):
    await require_talent_access(request)
    from services.talent_enrichment import enrich_candidate
    result = await enrich_candidate(db, candidate_id)
    if not result:
        raise HTTPException(status_code=404, detail="Candidate not found")
    from services.talent_cache import log_activity
    await log_activity(db, candidate_id, "enriched")
    result["_id"] = str(result["_id"])
    return result


@router.post("/network/candidates/{candidate_id}/refresh")
async def refresh_external_candidate(request: Request, candidate_id: str):
    await require_talent_access(request)
    from services.talent_enrichment import enrich_candidate
    from services.talent_cache import log_activity
    doc = await db.external_candidates.find_one({"candidate_id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    doc["stale"] = True
    result = await enrich_candidate(db, candidate_id)
    await log_activity(db, candidate_id, "refreshed")
    return result or doc


@router.post("/network/candidates/{candidate_id}/import")
async def import_to_internal(request: Request, candidate_id: str):
    await require_talent_access(request)
    doc = await db.external_candidates.find_one({"candidate_id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Check if already in internal
    existing = await db.candidates.find_one({"$or": [
        {"email": doc.get("email")} if doc.get("email") else {},
        {"linkedin": doc.get("linkedin")} if doc.get("linkedin") else {},
    ]})
    if existing:
        return {"status": "already_exists", "candidate_id": existing["candidate_id"]}

    import uuid
    internal = {
        "candidate_id": f"cand_{uuid.uuid4().hex[:12]}",
        "name": doc.get("name"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "linkedin": doc.get("linkedin"),
        "skills": doc.get("skills", []),
        "experience_years": doc.get("experience_years"),
        "location": doc.get("location"),
        "current_role": doc.get("current_role"),
        "raw_text": doc.get("summary") or doc.get("ai_summary") or "",
        "source": "external_network",
        "source_reference": doc.get("linkedin") or doc.get("candidate_id"),
        "external_source_id": doc.get("candidate_id"),
        "status": "new",
        "uploaded_by": (await require_talent_access(request)).get("user_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.candidates.insert_one(internal)
    from services.talent_cache import log_activity
    await log_activity(db, candidate_id, "imported_to_internal")
    return {"status": "imported", "candidate_id": internal["candidate_id"]}


@router.delete("/network/candidates/{candidate_id}")
async def delete_external_candidate(request: Request, candidate_id: str):
    await require_talent_access(request)
    await db.external_candidates.delete_one({"candidate_id": candidate_id})
    await db.candidate_sources.delete_many({"candidate_id": candidate_id})
    await db.candidate_activity.delete_many({"candidate_id": candidate_id})
    return {"deleted": True}


@router.post("/network/save-discovered")
async def save_discovered_candidates(request: Request, data: SaveDiscoveredRequest):
    """Save discovered candidates to the external network with dedup and analytics."""
    user = await require_talent_access(request)
    from services.talent_dedup import deduplicate_and_save
    from services.talent_cache import log_activity

    candidates = data.candidates
    provider = data.provider
    query_info = data.query_info
    duration_ms = data.duration_ms

    start = datetime.now(timezone.utc)
    results = []
    for c in (candidates or []):
        if not c.get("name"):
            continue
        result = await deduplicate_and_save(db, c)
        results.append(result)
        if result["status"] == "created":
            await log_activity(db, result["candidate_id"], "discovered")

    created = sum(1 for r in results if r["status"] == "created")
    updated = sum(1 for r in results if r["status"] == "updated")
    skipped = len(results) - created - updated

    # Search analytics
    await db.candidate_search_history.insert_one({
        "search_type": "discovery",
        "provider": provider,
        "query": query_info or {},
        "recruiter": user.get("name"),
        "recruiter_id": user.get("user_id"),
        # Serper bills per search on its free tier too, so both paid
        # providers count. Only the DuckDuckGo fallback is free.
        "credits_used": 1 if provider in ("serpapi", "serper") else 0,
        "new_candidates": created,
        "updated_candidates": updated,
        "skipped_candidates": skipped,
        "duration_ms": duration_ms or 0,
        "searched_at": datetime.now(timezone.utc).isoformat(),
        "cached_until": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    })

    return {
        "total": len(results),
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "results": results,
    }


@router.post("/network/refresh-queue/process")
async def process_refresh(request: Request, limit: int = 10):
    await require_talent_access(request)
    from services.talent_cache import process_refresh_queue
    await process_refresh_queue(db, limit=limit)
    pending = await db.candidate_refresh_queue.count_documents({"status": "pending"})
    return {"processed": limit, "remaining_pending": pending}


@router.get("/network/stats")
async def network_stats(request: Request):
    await require_talent_access(request)
    total = await db.external_candidates.count_documents({})
    enriched = await db.external_candidates.count_documents({"enriched": True})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_today = await db.external_candidates.count_documents({
        "first_discovered": {"$regex": f"^{today}"}
    })
    stale = await db.external_candidates.count_documents({"stale": True})
    pending_refresh = await db.candidate_refresh_queue.count_documents({"status": "pending"})

    # Top skills
    top_skills = []
    async for doc in db.external_candidates.aggregate([
        {"$unwind": "$skills"},
        {"$group": {"_id": "$skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]):
        top_skills.append({"skill": doc["_id"], "count": doc["count"]})

    # Top locations
    top_locations = []
    async for doc in db.external_candidates.aggregate([
        {"$group": {"_id": "$location", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]):
        top_locations.append({"location": doc["_id"], "count": doc["count"]})

    # By seniority
    by_seniority = {}
    async for doc in db.external_candidates.aggregate([
        {"$group": {"_id": "$seniority", "count": {"$sum": 1}}},
    ]):
        by_seniority[doc["_id"]] = doc["count"]

    return {
        "total_external": total,
        "enriched": enriched,
        "enrichment_rate": round(enriched / total * 100, 1) if total else 0,
        "new_today": new_today,
        "stale_profiles": stale,
        "pending_refresh": pending_refresh,
        "top_skills": top_skills,
        "top_locations": top_locations,
        "by_seniority": by_seniority,
    }


# ── Stats ──────────────────────────────────────────────────────────────

# ── Mailbox / connector imports ───────────────────────────────────────

def _mail_connector():
    """The mailbox connector to use.

    Prefers the Gmail API via domain-wide delegation, which is the better
    arrangement -- no per-mailbox credential, and it extends to any address in
    the domain. Falls back to IMAP with an app password, which a mailbox owner
    can enable without a Workspace administrator.

    Both implement the same contract, so everything downstream is unchanged.
    """
    from services.connectors.gmail import GmailConnector
    from services.connectors.imap_mailbox import ImapMailboxConnector

    api = GmailConnector()
    if api.is_configured() and api.check_access().get("ok"):
        return api

    imap = ImapMailboxConnector()
    if imap.is_configured():
        return imap

    return api  # report the API connector's reason for being unavailable


@router.get("/import/gmail/status")
async def gmail_import_status(request: Request):
    """Whether the Gmail connector can reach its mailbox.

    Reported separately from running an import so the common failure --
    domain-wide delegation not yet authorised -- is visible as a clear message
    rather than surfacing as an opaque error mid-run.
    """
    await require_talent_access(request)
    connector = _mail_connector()
    status = connector.check_access()

    cursor = await db.import_cursors.find_one({"connector": "gmail"}, {"_id": 0})
    last_run = await db.import_runs.find_one(
        {"connector": "gmail"}, {"_id": 0}, sort=[("ran_at", -1)]
    )

    return {
        "configured": connector.is_configured(),
        "mailbox": getattr(connector, "mailbox", None) or None,
        "transport": "gmail-api" if hasattr(connector, "query") else "imap",
        "query": getattr(connector, "query", None),
        **status,
        "cursor": (cursor or {}).get("cursor"),
        "last_run": last_run,
    }


@router.post("/import/gmail/run")
async def gmail_import_run(
    request: Request,
    limit: int = 50,
    since: Optional[str] = None,
    dry_run: bool = False,
):
    """Import CV attachments from the configured mailbox.

    Runs synchronously and returns what happened per document. `dry_run` lists
    what would be imported without writing, which is the sensible first call
    against a mailbox nobody has pointed this at before.
    """
    user = await require_talent_access(request)
    permissions.require_admin(user)

    from services.connectors.runner import run_connector

    connector = _mail_connector()
    access = connector.check_access()
    if not access.get("ok"):
        raise HTTPException(status_code=400, detail=access.get("reason", "Gmail is not reachable"))

    return await run_connector(
        db, connector, limit=min(limit, 200), since=since, dry_run=dry_run
    )


@router.get("/import/runs")
async def list_import_runs(request: Request, limit: int = 20):
    """Recent connector runs, newest first."""
    await require_talent_access(request)
    runs = await db.import_runs.find({}, {"_id": 0}).sort("ran_at", -1).to_list(min(limit, 100))
    return {"runs": runs}


@router.get("/candidates/{candidate_id}/versions")
async def list_resume_versions(request: Request, candidate_id: str):
    """Every resume held for a candidate, newest first.

    Resumes are never overwritten, so this is the full history of what the
    candidate has sent and where each version came from.
    """
    await require_talent_access(request)
    versions = await db.resume_versions.find(
        {"candidate_id": candidate_id}, {"_id": 0, "raw_text": 0}
    ).sort("version", -1).to_list(100)
    return {"candidate_id": candidate_id, "total": len(versions), "versions": versions}


@router.get("/merge-reviews")
async def list_merge_reviews(request: Request, status: str = "pending", limit: int = 50):
    """Candidate pairs the matcher could not decide on.

    These are never merged automatically -- a shared name is not proof of a
    shared identity -- so they wait here for a person to judge.
    """
    await require_talent_access(request)
    reviews = await db.merge_reviews.find(
        {"status": status}, {"_id": 0}
    ).sort("created_at", -1).to_list(min(limit, 200))

    for review in reviews:
        for side in ("candidate_a", "candidate_b"):
            doc = await db.candidates.find_one(
                {"candidate_id": review.get(side)},
                {"_id": 0, "candidate_id": 1, "name": 1, "email": 1, "phone": 1,
                 "skills": 1, "created_at": 1},
            )
            review[f"{side}_detail"] = doc

    return {"total": len(reviews), "reviews": reviews}


@router.get("/stats")
async def talent_stats(request: Request):
    await require_talent_access(request)
    total_candidates = await db.candidates.count_documents({})
    by_source = {}
    async for doc in db.candidates.aggregate([
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]):
        by_source[doc["_id"]] = doc["count"]

    by_status = {}
    async for doc in db.candidates.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]):
        by_status[doc["_id"]] = doc["count"]

    all_skills = await db.candidates.distinct("skills")
    skill_count = len(all_skills)

    return {
        "total_candidates": total_candidates,
        "by_source": by_source,
        "by_status": by_status,
        "unique_skills": skill_count,
    }
