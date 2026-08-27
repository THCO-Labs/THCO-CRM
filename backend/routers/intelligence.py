"""Crowther OS intelligence endpoints (Tier 4).

Every route here is a **read that suggests**. None of them writes to a
project — not the health field, not a requirement, not a scope change. The
existing Tier 1-3 endpoints remain the only way anything is saved, which is
what makes "AI recommends, humans decide" (SPEC §44) a property of the system
rather than a promise in a comment.

That has a pleasant consequence for permissions: since nothing here mutates,
these need only the right to *read* the project, and the write permission is
still checked by whichever existing endpoint the person's confirmation
eventually calls. There is no path where a suggestion becomes a change
without passing the same gate a typed change would.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services import delivery_intelligence as intel
from services import llm, permissions

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

db = None


def set_db(database):
    global db
    db = database
    intel.set_db(database)


async def _get_user(request: Request) -> dict:
    from server import get_current_user

    return await get_current_user(request)


async def _project_for_read(request: Request, project_id: str) -> tuple:
    """Same scoping rule as everywhere else: re-query with the caller's filter."""
    user = await _get_user(request)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not permissions.can_view_all_projects(user):
        mine = await db.projects.find_one(
            {"id": project_id, **permissions.project_scope_filter(user)}, {"_id": 0, "id": 1}
        )
        if not mine:
            raise HTTPException(
                status_code=403, detail="You can only open projects you work on"
            )
    return user, project


@router.get("/status")
async def status(request: Request, verify: bool = True):
    """Whether the intelligence layer is on, and if not, exactly why.

    The browser asks this once so a panel can say "no model configured" and
    name the missing variable, rather than rendering an empty box that reads
    as a bug. Reports the model name and provider; never the key.

    `verify` defaults on and makes one tiny cached call to prove the key
    actually works — a present-but-revoked key would otherwise report as
    available and every feature would then fail silently, which is the worst
    of both. Pass `verify=false` for a pure configuration check.
    """
    await _get_user(request)
    state = await llm.verify() if verify else {**llm.availability(), "verified": None}
    return {
        **state,
        # What still works with no model at all. Saying so is the difference
        # between "the AI is broken" and "the drafting is off, the ranking
        # isn't" -- and only one of those is true.
        "data_only_features": [
            "tsd_recommendation", "architect_recommendation", "health_recommendation",
            "next_step",
        ],
        "model_features": [
            "scope_change_impact", "risk_suggestions", "requirement_extraction",
            "report_narrative",
        ],
    }


@router.get("/projects/{project_id}/recommend-tsd")
async def recommend_tsd(project_id: str, request: Request):
    """Who should run this project. Stage 2. Runs on data, no model needed."""
    _user, project = await _project_for_read(request, project_id)
    return await intel.recommend_tsd(project)


@router.get("/projects/{project_id}/recommend-architect")
async def recommend_architect(project_id: str, request: Request):
    """Who should architect this project. Stage 6. Runs on data."""
    _user, project = await _project_for_read(request, project_id)
    return await intel.recommend_architect(project)


@router.get("/projects/{project_id}/recommend-health")
async def recommend_health(project_id: str, request: Request):
    """What colour this project looks like from its records.

    Suggestion only. The TSD's override is untouched: setting health still
    goes through `POST /flow/projects/{id}/health`, still requires the TSD,
    and still demands a written reason.
    """
    _user, project = await _project_for_read(request, project_id)
    return await intel.recommend_health(project)


@router.get("/projects/{project_id}/next-step")
async def next_step(project_id: str, request: Request):
    """What this project needs next, specific to it rather than to its stage."""
    _user, project = await _project_for_read(request, project_id)

    # The gate is the input, so it is read through the same resolver the
    # pipeline uses rather than recomputed here -- two implementations of
    # "what is blocking" would eventually disagree, and the panel would then
    # contradict the gate checklist directly above it.
    from routers.flow import _resolve_gate
    from services.delivery_stages import stage_label, stage_owner

    stage = project.get("stage") or 1
    conditions = await _resolve_gate(project)
    gate = {
        "conditions": conditions,
        "stage_label": stage_label(stage),
        "owner_function": stage_owner(stage),
    }
    return await intel.next_step(project, gate)


@router.post("/scope-changes/{scope_change_id}/analyse")
async def analyse_scope_change(scope_change_id: str, request: Request):
    """Draft the impact assessment on a scope change. Needs a model."""
    scope_change = await db.scope_changes.find_one(
        {"scope_change_id": scope_change_id}, {"_id": 0}
    )
    if not scope_change:
        raise HTTPException(status_code=404, detail="Scope change not found")
    _user, project = await _project_for_read(request, scope_change["project_id"])
    return await intel.analyse_scope_change(project, scope_change)


@router.get("/projects/{project_id}/suggest-risks")
async def suggest_risks(project_id: str, request: Request):
    """Risks this project has not written down yet. Needs a model."""
    _user, project = await _project_for_read(request, project_id)
    return await intel.suggest_risks(project)


class ExtractIn(BaseModel):
    # Either read a stored document, or take text pasted straight in. Both
    # exist because a transcript arrives either way.
    document_id: Optional[str] = None
    text: Optional[str] = None


@router.post("/projects/{project_id}/extract-requirements")
async def extract_requirements(project_id: str, data: ExtractIn, request: Request):
    """Read a transcript or brief and draft requirements from it. Needs a model."""
    _user, project = await _project_for_read(request, project_id)

    source = (data.text or "").strip()
    if not source and data.document_id:
        document = await db.documents.find_one(
            {"document_id": data.document_id, "project_id": project_id},
            {"_id": 0, "content": 1, "title": 1},
        )
        if not document:
            raise HTTPException(status_code=404, detail="Document not found on this project")
        source = document.get("content") or ""
        if not source.strip():
            raise HTTPException(
                status_code=400,
                detail="That document has no extracted text to read. "
                       "Only .txt, .md, .pdf, .docx and .doc are extracted.",
            )
    return await intel.extract_requirements(project, source)


@router.get("/projects/{project_id}/report-narrative")
async def report_narrative(project_id: str, request: Request):
    """The written summary over the assembled report. Needs a model."""
    _user, _project = await _project_for_read(request, project_id)

    # Built from the Tier 3 report rather than from the collections directly,
    # so the narrative can only ever describe figures the reader can see on
    # the same page and check.
    from routers.control_tower import project_report

    report = await project_report(project_id, request)
    return await intel.report_narrative(report)
