"""Crowther OS intelligence (Tier 4).

`CROWTHER_MIGRATION_PLAN.md` §13 sets the shape of this tier in one line:
*"Each item replaces text inside a panel that already exists."* Nothing here
adds a screen, moves a control, or takes a decision. Every function returns a
**recommendation** that a person then accepts, edits or ignores — SPEC §44,
"AI recommends, humans decide".

Two things make that more than a slogan:

**Every recommendation carries its provenance.** The `basis` field says
whether a suggestion came from `data` (real records, checkable, deterministic,
free), from `model` (a language model, which can be wrong), or from
`data+model`. A reader who cannot tell the difference cannot sensibly decide
whether to trust it, and a system that blurs the two teaches people to trust
the wrong half.

**Half of this tier needs no model at all.** Choosing a TSD, choosing an
architect, and reading a project's health are ranking problems over records
the system already keeps: who is loaded, who knows this client, what is
blocked, what has not moved. Those run on data — with no key, no cost, and an
explanation you can verify line by line. The language model, when configured,
adds the parts that genuinely need language: drafting a scope-change impact,
reading a transcript, writing a narrative.

So an unconfigured deployment is not a broken one. It loses the drafting and
keeps the ranking.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from services import llm, permissions

logger = logging.getLogger(__name__)

db = None


def set_db(database):
    global db
    db = database


# How long without a stage move before a project is treated as drifting. Same
# figure the Control Tower uses; kept here rather than imported because a
# service importing from a router is the wrong direction.
STALLED_AFTER_DAYS = 14

# Confidence is reported, never computed to a decimal. A ranking over four
# people from three signals does not support "0.83", and printing one would
# claim precision the method does not have.
HIGH, MEDIUM, LOW = "high", "medium", "low"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_iso(value: Any) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _days_since(value: Any) -> Optional[int]:
    parsed = _parse_iso(value)
    return None if not parsed else max(0, (datetime.now(timezone.utc) - parsed).days)


def _days_until(value: Any) -> Optional[int]:
    parsed = _parse_iso(value)
    return None if not parsed else (parsed - datetime.now(timezone.utc)).days


def recommendation(
    kind: str,
    *,
    value: Any = None,
    display: str = "",
    rationale: Optional[List[str]] = None,
    confidence: str = MEDIUM,
    basis: str = "data",
    options: Optional[List[dict]] = None,
    fields: Optional[Dict[str, Any]] = None,
    unavailable: Optional[str] = None,
) -> dict:
    """The one shape every suggestion in this tier comes back in.

    `value` is machine-usable and `display` is what a person reads; keeping
    them separate is what lets the browser pre-fill a form field without
    showing a raw id to anybody.

    `requires_confirmation` is hard-coded true rather than a parameter. There
    is no path through this module that writes to a project, and making that
    a caller's choice is how it would eventually become one.
    """
    return {
        "kind": kind,
        "value": value,
        "display": display,
        "rationale": rationale or [],
        "confidence": confidence,
        # data | model | data+model — see the module docstring.
        "basis": basis,
        "model": llm.model_name() if "model" in basis else None,
        "options": options or [],
        # Pre-fill payload for a form the human then saves, per the chosen
        # "auto-fill drafts, human confirms" behaviour.
        "fields": fields or {},
        "unavailable": unavailable,
        "requires_confirmation": True,
        "generated_at": _now(),
    }


async def _unavailable(kind: str) -> dict:
    """A recommendation that could not be made, saying why in the open.

    Uses the *verified* state rather than the configuration state, because
    those differ in the case that matters most: a key that is present but
    revoked. Configuration alone would report "available" and leave the panel
    saying only that something went wrong; verification names the environment
    variable to fix. The probe is cached, so this costs nothing after the
    first call.
    """
    state = await llm.verify()
    return recommendation(
        kind,
        basis="model",
        confidence=LOW,
        unavailable=state.get("reason") or "The intelligence layer is not configured.",
        rationale=[state["fix"]] if state.get("fix") else [],
    )


async def _model_ready() -> bool:
    """Whether a model can actually be called, not merely whether a key is set."""
    return (await llm.verify()).get("verified") is True


# ===========================================================================
# PEOPLE — who should own this
# ===========================================================================
# Ranking, not language. Both of these run on records the system already
# keeps, so they work with no key configured and their reasoning can be
# checked against the database line by line.
async def _workload(user_ids: List[str], role_field: str) -> Dict[str, dict]:
    """Per-person delivery history in the role being filled.

    `role_field` is `tsd_id` or `architect_id`. Counting only the role being
    filled matters: an engineer with four architect projects is loaded *as an
    architect*, and mixing in projects where they were merely the TSD would
    read as load they do not actually carry.
    """
    if not user_ids:
        return {}
    out = {
        uid: {"active": 0, "red": 0, "done": 0, "clients": set()}
        for uid in user_ids
    }
    cursor = db.projects.find(
        {role_field: {"$in": user_ids}, "archived_by_migration": {"$ne": True}},
        {"_id": 0, role_field: 1, "stage": 1, "status": 1,
         "health": 1, "client_name_snapshot": 1},
    )
    async for project in cursor:
        uid = project.get(role_field)
        if uid not in out:
            continue
        stage = project.get("stage") or 1
        client = project.get("client_name_snapshot")
        if client:
            out[uid]["clients"].add(client)
        if stage < 17 and (project.get("status") or "active") == "active":
            out[uid]["active"] += 1
            if (project.get("health") or "").upper() == "RED":
                out[uid]["red"] += 1
        else:
            out[uid]["done"] += 1
    return out


async def _candidate_pool(role_query: Dict[str, Any], role_field: str) -> List[dict]:
    """Everybody who could take this role, best-qualified first.

    Follows the convention `users_by_function` already sets in `flow.py`:
    people who hold the grant come first, then everybody active — *"an empty
    dropdown is not a permission error, it is a dead end with no
    explanation."* The same is true of a recommendation: refusing to suggest
    anybody because a config flag was never set is not caution, it is the
    feature failing quietly.

    A third group sits between the two, and it is the useful one here: people
    who have **actually done this job** on a past project. That is behaviour
    rather than configuration, and in a system where nobody has yet been given
    a `function_role` it is the only real signal available.
    """
    fields = {"_id": 0, "user_id": 1, "name": 1, "email": 1,
              "function_role": 1, "can_architect": 1}

    holders = await db.users.find(
        {**role_query, "status": "active"}, fields
    ).to_list(200)
    held = {u["user_id"] for u in holders}
    for u in holders:
        u["qualification"] = "holds_role"

    # Who has held this role on a real project before.
    past_ids = [
        uid for uid in await db.projects.distinct(role_field, {role_field: {"$ne": None}})
        if uid and uid not in held
    ]
    experienced = await db.users.find(
        {"user_id": {"$in": past_ids}, "status": "active"}, fields
    ).to_list(200) if past_ids else []
    for u in experienced:
        u["qualification"] = "has_done_role"
    known = held | {u["user_id"] for u in experienced}

    others = await db.users.find(
        {"status": "active", "user_id": {"$nin": list(known)}}, fields
    ).to_list(300)
    for u in others:
        u["qualification"] = "available"

    return holders + experienced + others


# What each qualification is worth, and how it reads back to a person. The
# ordering is the claim: a deliberate grant beats demonstrated experience,
# which beats simply being available.
QUALIFICATION = {
    "holds_role":    (60, "Holds the role"),
    "has_done_role": (35, "Has done this role on {done} past project{s}"),
    "available":     (0,  "Available, but has not held this role before"),
}


def _rank(candidates: List[dict], load: Dict[str, dict], client: Optional[str]) -> List[dict]:
    """Score and sort people for an assignment.

    Four signals, in the order they matter:

    *Qualification* — whether they hold the role, have done it, or merely could.

    *Knows this client* — continuity with a client is the thing the TSD role
    exists to provide, so it is weighted heavily.

    *Current load* is why this is worth computing at all: the person a human
    picks from memory is usually the one they spoke to most recently, which
    correlates with being the busiest.

    *Projects already red* is a penalty, not a disqualifier. Someone
    firefighting one project should not be handed another, but they are not
    unassignable, and pretending otherwise would hide a real option.
    """
    scored = []
    for person in candidates:
        uid = person.get("user_id")
        stats = load.get(uid) or {"active": 0, "red": 0, "done": 0, "clients": set()}
        reasons: List[str] = []
        score = 100

        qualification = person.get("qualification", "available")
        points, template = QUALIFICATION[qualification]
        score += points
        reasons.append(template.format(
            done=stats["done"], s="s" if stats["done"] != 1 else ""
        ))

        knows_client = bool(client and client in stats["clients"])
        if knows_client:
            score += 40
            reasons.append(f"Has worked with {client} before")

        active = stats["active"]
        score -= active * 12
        reasons.append(
            "No live projects in this role" if active == 0
            else f"Currently on {active} live project{'s' if active != 1 else ''}"
        )

        if stats["red"]:
            score -= stats["red"] * 15
            reasons.append(
                f"{stats['red']} of those is red" if stats["red"] == 1
                else f"{stats['red']} of those are red"
            )

        scored.append({
            "user_id": uid,
            "name": person.get("name"),
            "email": person.get("email"),
            "function_role": person.get("function_role"),
            "qualification": qualification,
            "score": score,
            "active_projects": active,
            "past_projects": stats["done"],
            "red_projects": stats["red"],
            "knows_client": knows_client,
            "reasons": reasons,
        })

    scored.sort(key=lambda c: (-c["score"], c["name"] or ""))
    return scored


def _confidence_from_gap(ranked: List[dict]) -> str:
    """How sure we are is how far clear the top candidate is.

    One obvious choice is high confidence; a photo finish is low, and saying so
    is more useful than picking one and sounding certain.
    """
    if len(ranked) < 2:
        return MEDIUM if ranked else LOW
    gap = ranked[0]["score"] - ranked[1]["score"]
    return HIGH if gap >= 30 else (MEDIUM if gap >= 12 else LOW)


async def _recommend_person(project: dict, kind: str, role_query: Dict[str, Any],
                            role_field: str, field_name: str) -> dict:
    candidates = await _candidate_pool(role_query, role_field)
    if not candidates:
        return recommendation(
            kind, basis="data", confidence=LOW,
            unavailable="There are no active accounts to choose from.",
        )

    load = await _workload([c["user_id"] for c in candidates], role_field)
    ranked = _rank(candidates, load, project.get("client_name_snapshot"))
    top = ranked[0]

    # Said out loud rather than hidden in the score: when nobody has been
    # granted the role, this is a ranking of everybody active, and the reader
    # should weigh it accordingly.
    caveat = []
    if top["qualification"] != "holds_role":
        caveat = ["Nobody has been granted this role yet, so this ranks on "
                  "past work and current load instead."]

    return recommendation(
        kind,
        value=top["user_id"],
        display=top["name"],
        rationale=top["reasons"] + caveat,
        confidence=_confidence_from_gap(ranked),
        basis="data",
        options=ranked[:5],
        fields={field_name: top["user_id"]},
    )


async def recommend_tsd(project: dict) -> dict:
    """Who should run this project (stage 2). Data only."""
    return await _recommend_person(
        project, "tsd_assignment", {"function_role": "tsd"}, "tsd_id", "tsd_id"
    )


async def recommend_architect(project: dict) -> dict:
    """Who should architect this project (stage 6). Data only."""
    return await _recommend_person(
        # The same rule the endpoints use: the flag, or an engineer in the
        # engineering unit. Querying the flag alone made this rank one
        # person forever.
        project, "architect_selection",
        {k: v for k, v in permissions.ARCHITECT_CANDIDATE_QUERY.items() if k != "status"},
        "architect_id", "architect_id"
    )


# ===========================================================================
# HEALTH — what colour is this project really
# ===========================================================================
async def recommend_health(project: dict) -> dict:
    """Suggest GREEN / AMBER / RED from what the project actually shows.

    **The TSD override stays intact** (§13 says so explicitly, and it is the
    right rule): this only ever suggests. Nothing here writes `health`, and the
    endpoint that does still requires the TSD and still demands a reason.

    Its value is not the colour — it is catching the project that is quietly
    amber while its header still says green, which is the failure mode a
    manually-set field always has.
    """
    pid = project.get("id")
    signals: List[str] = []
    score = 0

    idle = _days_since(
        (project.get("stage_history") or [{}])[-1].get("at") or project.get("created_at")
    )
    if idle is not None and idle >= STALLED_AFTER_DAYS:
        score += 2
        signals.append(f"No stage movement in {idle} days")

    blockers = await db.delivery_blockers.find(
        {"project_id": pid, "status": "open"}, {"_id": 0, "severity": 1, "title": 1}
    ).to_list(200)
    if blockers:
        # Weighted by severity rather than counted. Treating a high-severity
        # blocker the same as a low one is how a project with something
        # genuinely serious open still reads green.
        weight = {"critical": 3, "high": 2, "medium": 1, "low": 1}
        worst = max(blockers, key=lambda b: weight.get(b.get("severity"), 1))
        worst_severity = worst.get("severity") or "medium"
        score += weight.get(worst_severity, 1)
        signals.append(
            f"{len(blockers)} blocker{'s' if len(blockers) != 1 else ''} open, "
            f"worst is {worst_severity}: {worst.get('title')}"
        )

    overdue = 0
    for milestone in await db.milestones.find(
        {"project_id": pid}, {"_id": 0, "target_date": 1, "delivered_date": 1}
    ).to_list(200):
        if milestone.get("delivered_date"):
            continue
        remaining = _days_until(milestone.get("target_date"))
        if remaining is not None and remaining < 0:
            overdue += 1
    if overdue:
        score += 2
        signals.append(f"{overdue} milestone{'s' if overdue != 1 else ''} overdue")

    recent_forced = [
        entry for entry in (project.get("stage_history") or [])
        if entry.get("forced") and (_days_since(entry.get("at")) or 999) <= 30
    ]
    if recent_forced:
        score += 1
        signals.append(f"{len(recent_forced)} gate forced in the last 30 days")

    pending_scope = await db.scope_changes.count_documents(
        {"project_id": pid, "decision": "pending"}
    )
    if pending_scope:
        score += 1
        signals.append(f"{pending_scope} scope change{'s' if pending_scope != 1 else ''} undecided")

    suggested = "RED" if score >= 4 else ("AMBER" if score >= 2 else "GREEN")
    current = (project.get("health") or "GREEN").upper()

    if not signals:
        signals.append("Nothing in the record suggests trouble.")

    return recommendation(
        "health",
        value=suggested,
        display=suggested,
        rationale=signals,
        # A disagreement with the current setting is the interesting case, and
        # is exactly when a human should look rather than when we should be
        # most sure.
        confidence=HIGH if suggested == current else MEDIUM,
        basis="data",
        fields={"health": suggested, "reason": "; ".join(signals[:3])},
        options=[{"current": current, "suggested": suggested, "agrees": current == suggested}],
    )


# ===========================================================================
# NEXT STEP — what this project needs now
# ===========================================================================
async def next_step(project: dict, gate: dict) -> dict:
    """One sentence on what to actually do next.

    The panel already prints the stage playbook, which is correct and
    identical on every project at that stage. This narrows it to *this*
    project: what the gate is still missing, who owns it, and how long it has
    been waiting. That part is data. If a model is configured it rewrites the
    result as a sentence a person would say; if not, the assembled version is
    already useful and is what shows.
    """
    blocking = [c["label"] for c in (gate.get("conditions") or []) if c.get("satisfied") is False]
    judgement = [c["label"] for c in (gate.get("conditions") or []) if c.get("satisfied") is None]
    owner = gate.get("owner_function") or "nobody"
    stage_label = gate.get("stage_label") or f"stage {project.get('stage')}"
    idle = _days_since(
        (project.get("stage_history") or [{}])[-1].get("at") or project.get("created_at")
    )

    facts: List[str] = []
    if blocking:
        facts.append("Blocked on: " + ", ".join(blocking))
    if judgement:
        facts.append("Waiting on a judgement call: " + ", ".join(judgement))
    if idle is not None and idle >= STALLED_AFTER_DAYS:
        facts.append(f"Has not moved in {idle} days")
    if not facts:
        facts.append("The gate is clear — this can move on.")

    assembled = (
        f"{stage_label} is owned by {owner}. " + " ".join(f"{f}." for f in facts)
    )

    if not await _model_ready():
        return recommendation(
            "next_step", value=assembled, display=assembled,
            rationale=facts, confidence=MEDIUM, basis="data",
        )

    written = await llm.complete(
        system=(
            "You write one or two plain sentences telling a delivery team what to do next "
            "on a project. Be concrete and specific to the facts given. Name the owner. "
            "Do not invent facts, do not add pleasantries, do not use bullet points."
        ),
        prompt=(
            f"Project: {project.get('name')} for {project.get('client_name_snapshot')}\n"
            f"Stage: {stage_label}, owned by {owner}\n"
            f"Desired outcome: {llm.clip(project.get('desired_outcome'), 400)}\n"
            f"Facts:\n{llm.bulleted(facts)}\n\n"
            "Write the next action."
        ),
        max_tokens=200,
    )

    return recommendation(
        "next_step",
        value=written or assembled,
        display=written or assembled,
        rationale=facts,
        confidence=MEDIUM,
        basis="data+model" if written else "data",
    )


# ===========================================================================
# LANGUAGE — the parts that genuinely need a model
# ===========================================================================
async def analyse_scope_change(project: dict, scope_change: dict) -> dict:
    """Draft the four impact assessments on a scope change.

    These fields are free text in Tier 1 and the plan's own table
    (§9.4) says *"Generated in Tier 4."* This drafts them, plus the two
    numeric fields the Senior Partner notify-threshold actually checks — which
    is the point, because free text alone can never trip a threshold.

    It drafts. The TSD still decides, and the numbers still arrive in a form
    they can change before saving.
    """
    if not await _model_ready():
        return await _unavailable("scope_change_impact")

    requirements = await db.requirements.find(
        {"project_id": project.get("id")}, {"_id": 0, "req_ref": 1, "description": 1}
    ).to_list(200)
    architecture = await db.architecture_documents.find_one(
        {"project_id": project.get("id")}, {"_id": 0, "summary": 1, "version": 1},
        sort=[("version", -1)],
    )

    # Built before the f-string rather than inside it: a nested quote in an
    # f-string is a parse error on older Python, and this file should not be
    # the reason a deploy fails on a different interpreter.
    requirement_lines = [
        "{}: {}".format(r.get("req_ref") or "R?", r.get("description") or "")
        for r in requirements
    ]

    parsed = await llm.complete_json(
        system=(
            "You are a delivery lead assessing the impact of a requested scope change on a "
            "software project. You are given the current agreed requirements and the change. "
            "Assess only what the evidence supports; where you cannot tell, say so plainly "
            "in the text field and use null for the number. Never inflate an estimate to be safe.\n\n"
            "Return JSON with exactly these keys:\n"
            '  "impact_timeline": string, effect on the schedule, one or two sentences\n'
            '  "impact_effort": string, engineering effort involved\n'
            '  "impact_cost": string, effect on cost\n'
            '  "impact_architecture": string, whether the architecture is affected\n'
            '  "impact_timeline_days": number or null, added calendar days\n'
            '  "impact_cost_pct": number or null, percentage added to project cost\n'
            '  "confidence": "high" | "medium" | "low"'
        ),
        prompt=(
            f"Project: {project.get('name')} for {project.get('client_name_snapshot')}\n"
            f"Desired outcome: {llm.clip(project.get('desired_outcome'), 500)}\n"
            f"Architecture (v{(architecture or {}).get('version', '-')}): "
            f"{llm.clip((architecture or {}).get('summary'), 800)}\n\n"
            f"Agreed requirements:\n{llm.bulleted(requirement_lines)}\n\n"
            f"Requested change:\n{llm.clip(scope_change.get('description'), 1500)}"
        ),
        max_tokens=900,
    )
    if not parsed:
        return await _unavailable("scope_change_impact")

    def num(key):
        v = parsed.get(key)
        return v if isinstance(v, (int, float)) else None

    fields = {
        "impact_timeline": str(parsed.get("impact_timeline") or ""),
        "impact_effort": str(parsed.get("impact_effort") or ""),
        "impact_cost": str(parsed.get("impact_cost") or ""),
        "impact_architecture": str(parsed.get("impact_architecture") or ""),
        "impact_timeline_days": num("impact_timeline_days"),
        "impact_cost_pct": num("impact_cost_pct"),
    }
    confidence = parsed.get("confidence")
    return recommendation(
        "scope_change_impact",
        value=fields,
        display=fields["impact_timeline"],
        rationale=[v for k, v in fields.items() if k.startswith("impact_") and isinstance(v, str) and v],
        confidence=confidence if confidence in (HIGH, MEDIUM, LOW) else MEDIUM,
        basis="model",
        fields=fields,
    )


async def suggest_risks(project: dict) -> dict:
    """Suggest risks this project has not written down yet.

    Fed the risks already logged so it proposes additions rather than
    restating the list back — the common and useless failure of this feature.
    """
    if not await _model_ready():
        return await _unavailable("risk_suggestions")

    pid = project.get("id")
    existing = await db.risks.find({"project_id": pid}, {"_id": 0, "title": 1}).to_list(200)
    requirements = await db.requirements.find(
        {"project_id": pid}, {"_id": 0, "description": 1}
    ).to_list(100)
    blockers = await db.delivery_blockers.find(
        {"project_id": pid, "status": "open"}, {"_id": 0, "title": 1}
    ).to_list(100)

    parsed = await llm.complete_json(
        system=(
            "You are a delivery lead reviewing a software project for risks that have not "
            "been recorded yet. Propose at most four, each specific to this project — never "
            "generic project-management boilerplate. Do not repeat a risk already on the list.\n\n"
            'Return JSON: {"risks": [{"title": string, "description": string, '
            '"likelihood": "low"|"medium"|"high", "impact": "low"|"medium"|"high", '
            '"mitigation": string}]}'
        ),
        prompt=(
            f"Project: {project.get('name')} for {project.get('client_name_snapshot')}\n"
            f"Stage {project.get('stage')} of 17\n"
            f"Desired outcome: {llm.clip(project.get('desired_outcome'), 500)}\n\n"
            f"Requirements:\n{llm.bulleted([r.get('description') for r in requirements])}\n\n"
            f"Open blockers:\n{llm.bulleted([b.get('title') for b in blockers])}\n\n"
            f"Risks ALREADY recorded (do not repeat these):\n"
            f"{llm.bulleted([r.get('title') for r in existing])}"
        ),
        max_tokens=1200,
    )
    if not parsed:
        return await _unavailable("risk_suggestions")

    rows = [r for r in (parsed.get("risks") or []) if isinstance(r, dict) and r.get("title")][:4]
    if not rows:
        return recommendation(
            "risk_suggestions", basis="model", confidence=LOW,
            unavailable="Nothing new to suggest — the risks already recorded cover it.",
        )

    # `fields` carries the first suggestion in the shape the risk form takes,
    # so "draft this" fills the form rather than making somebody retype it.
    # The rest stay in `options` for a caller that wants to offer all four.
    first = rows[0]
    return recommendation(
        "risk_suggestions",
        value=rows,
        display=f"{len(rows)} risk{'s' if len(rows) != 1 else ''} worth recording",
        rationale=[r.get("title", "") for r in rows],
        confidence=MEDIUM,
        basis="model",
        options=rows,
        fields={
            "title": first.get("title") or "",
            "description": first.get("description") or "",
            "likelihood": first.get("likelihood") or "medium",
            "impact": first.get("impact") or "medium",
            "mitigation": first.get("mitigation") or "",
        },
    )


async def extract_requirements(project: dict, source_text: str) -> dict:
    """Read a transcript or brief and draft requirements from it.

    Deliberately conservative: it is told to extract only what was actually
    asked for. A transcript-extraction feature that infers requirements
    nobody stated produces scope the client never agreed to, which is the one
    thing the whole stage machine exists to prevent.
    """
    if not await _model_ready():
        return await _unavailable("requirement_extraction")
    if not (source_text or "").strip():
        return recommendation(
            "requirement_extraction", basis="model", confidence=LOW,
            unavailable="There is no transcript or brief text to read.",
        )

    existing = await db.requirements.find(
        {"project_id": project.get("id")}, {"_id": 0, "description": 1}
    ).to_list(200)

    parsed = await llm.complete_json(
        system=(
            "You extract client requirements from a meeting transcript or written brief. "
            "Extract only what the client actually asked for or agreed to. Do not infer, "
            "do not add sensible-sounding extras, do not repeat a requirement already "
            "recorded. If something is ambiguous, record it as an open question instead "
            "of guessing.\n\n"
            'Return JSON: {"requirements": [{"description": string, '
            '"category": "Functional"|"Non-functional"|"Constraint", '
            '"priority": "low"|"medium"|"high", '
            '"status": "proposed"|"open_question", '
            '"quote": string — the words in the source this came from}]}'
        ),
        prompt=(
            f"Project: {project.get('name')} for {project.get('client_name_snapshot')}\n"
            f"Desired outcome: {llm.clip(project.get('desired_outcome'), 400)}\n\n"
            f"Requirements ALREADY recorded (do not repeat):\n"
            f"{llm.bulleted([r.get('description') for r in existing])}\n\n"
            f"Source text:\n{llm.clip(source_text, 12000)}"
        ),
        max_tokens=2000,
    )
    if not parsed:
        return await _unavailable("requirement_extraction")

    rows = [
        r for r in (parsed.get("requirements") or [])
        if isinstance(r, dict) and str(r.get("description") or "").strip()
    ][:15]
    return recommendation(
        "requirement_extraction",
        value=rows,
        display=f"{len(rows)} requirement{'s' if len(rows) != 1 else ''} found",
        rationale=[r.get("description", "")[:120] for r in rows[:5]],
        confidence=MEDIUM,
        basis="model",
        options=rows,
    )


async def report_narrative(report: dict) -> dict:
    """A short written summary over the Tier 3 report.

    The report already assembles every number. This says what they add up to,
    which is the part a person would otherwise write by hand at closure — and
    the reason it is safe to generate is that every figure it is summarising
    is on the same page to check it against.
    """
    if not await _model_ready():
        return await _unavailable("report_narrative")

    project = report.get("project") or {}
    scope = report.get("scope_changes") or {}
    governance = report.get("governance") or {}
    validation = report.get("validation") or {}
    closure = report.get("closure") or {}
    timeline = report.get("timeline") or []
    longest = max(
        (t for t in timeline if isinstance(t.get("days_held"), int)),
        key=lambda t: t["days_held"], default=None,
    )

    written = await llm.complete(
        system=(
            "You write the summary paragraph of a delivery closure report for an internal "
            "consultancy. Three or four sentences. State what was delivered, how it went, "
            "and what is worth remembering next time. Use only the figures given. Be candid "
            "about problems — a report that reads as uniformly positive is not trusted. "
            "No headings, no bullet points, no preamble."
        ),
        prompt=(
            f"Project: {project.get('name')} for {project.get('client_name')}\n"
            f"Reached: stage {project.get('stage')} ({project.get('stage_label')})\n"
            f"Elapsed: {project.get('elapsed_days')} days over {len(timeline)} stage moves\n"
            f"Health at close: {project.get('health')}\n"
            f"TSD: {project.get('tsd_name')}; Architect: {project.get('architect_name')}; "
            f"pod of {project.get('pod_size')}\n"
            f"Requirements: {(report.get('requirements') or {}).get('total')}\n"
            f"Demo rounds: {validation.get('demo_rounds')}; client validated: "
            f"{validation.get('validated')}\n"
            f"Scope changes: {scope.get('total')} raised, {scope.get('approved')} approved, "
            f"{scope.get('material')} moved time or money\n"
            f"Gates forced: {len(governance.get('forced_gates') or [])}\n"
            f"Risks: {governance.get('risks_open')} still open\n"
            f"Blockers: {governance.get('blockers_open')} still open\n"
            f"Closure checklist: {closure.get('done')}/{closure.get('total')}\n"
            + (f"Longest stage: {longest.get('to_stage_label')} at {longest.get('days_held')} days\n"
               if longest else "")
            + "\nWrite the summary."
        ),
        max_tokens=500,
        temperature=0.3,
    )
    if not written:
        return await _unavailable("report_narrative")

    return recommendation(
        "report_narrative",
        value=written, display=written,
        confidence=MEDIUM, basis="model",
    )
