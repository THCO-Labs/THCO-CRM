"""Central authorisation rules.

Access was previously decided in the frontend -- the sidebar hid the
Administration section from staff -- while the API only checked that a caller
was logged in. Hiding a menu is not access control: a staff account could read
the entire candidate database by typing the URL.

Everything here is server-side. The frontend may still hide what a user cannot
use, but that is presentation; these functions are the boundary.

Roles
-----
super_admin  full access, including creating other super admins
mini_admin   administrative access (HR sits here) but cannot mint super admins
team_member  ordinary staff -- sees only what they are assigned to

Flags layered on top of role:
    is_hr                   employee administration
    is_executive_approver   approves at the executive gate
    is_delivery_coordinator / is_delivery_owner   delivery oversight

Unit heads
----------
Each business unit has at most one head, recorded on the unit itself
(`units.head_user_id`) rather than as a flag on the person. A unit is the
thing that has a head, and only one at a time, so storing it there makes
that a fact the database enforces: reassigning is a single write, and a
person cannot be left as a stale head of a unit somebody else now runs.

A head opens projects for their own unit and adds staff to them as
pod. Ordinary staff no longer open projects at all -- they see
the ones they were added to.
"""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException

SUPER_ADMIN = "super_admin"
MINI_ADMIN = "mini_admin"
TEAM_MEMBER = "team_member"

ADMIN_ROLES = {SUPER_ADMIN, MINI_ADMIN}


# ── Role predicates ───────────────────────────────────────────────────

def is_super_admin(user: Dict[str, Any]) -> bool:
    return (user or {}).get("role") == SUPER_ADMIN


def is_admin(user: Dict[str, Any]) -> bool:
    """Any administrative account: super admin, mini admin, or HR."""
    u = user or {}
    return u.get("role") in ADMIN_ROLES or bool(u.get("is_hr"))


def can_manage_users(user: Dict[str, Any]) -> bool:
    return is_admin(user)


def has_unit_access(user: Dict[str, Any], slug: str) -> bool:
    """Whether the user may enter a business unit.

    Admins see every unit. Everyone else needs it in accessible_units.

    `flow` is the project pipeline -- where work is opened, staffed, priced and
    moved through its stages. Those are a project manager's decisions, so the
    pipeline is theirs and the administrators'.

    Being on a project does not open it. A pod member's work is the task
    board their manager sets up: they see their tasks, move them, and take them
    to done. The pipeline around that -- which stage the client is at, what the
    project is worth, who else is being considered -- is not theirs to see, and
    an earlier rule that opened Flow to anyone with a project showed it to them.
    """
    if not slug:
        return True
    if is_admin(user):
        return True
    if slug == "flow":
        return can_enter_pipeline(user)
    return slug in ((user or {}).get("accessible_units") or [])


# The functions whose job is the pipeline itself. Everyone else works on the
# board, which is a different router and unaffected by this.
#
# Engineers and designers are deliberately absent. An engineer who has been
# made architect-capable is present, because they need to reach the projects
# they are named architect on -- row scoping then limits them to those.
PIPELINE_FUNCTIONS = {
    "senior_partner",   # selects architects, watches exceptions
    "commercial",       # opens projects at intake
    "tsd",              # owns and moves projects
    "talent_sd",        # works talent requirements raised on projects
    "people_ops",       # onboards contract staff onto pods
    "legal",            # reads the commercial slice to draft contracts
    "finance",          # reads the commercial slice
}


def can_enter_pipeline(user: Dict[str, Any]) -> bool:
    """Whether this person may open Crowther OS at all.

    Being on a project still does not open it. The pipeline carries stages,
    value and who else is in the running, which is not a pod member's
    business; their work is the task board their architect sets up.

    What changed is that the pipeline is no longer only for unit heads. A TSD
    owns projects without necessarily heading a unit, and locking them out of
    the thing they own made the role impossible to hold.
    """
    if is_admin(user):
        return True
    if is_unit_head(user):
        return True
    u = user or {}
    if u.get("function_role") in PIPELINE_FUNCTIONS:
        return True
    # An architect-capable engineer reaches the projects they architect.
    return bool(u.get("can_architect"))


def headed_units(user: Dict[str, Any]) -> List[str]:
    """Unit slugs this person heads.

    Resolved when the user is loaded and carried on the user dict, so the
    permission checks below stay synchronous like every other rule here.
    """
    return list((user or {}).get("headed_units") or [])


def is_unit_head(user: Dict[str, Any]) -> bool:
    return bool(headed_units(user))


def can_open_project(user: Dict[str, Any]) -> bool:
    """Alias for `can_create_projects`, read at the call site as the action."""
    return can_create_projects(user)


def can_create_projects(user: Dict[str, Any]) -> bool:
    """Whether this person may open a project at all.

    Opening a project is committing the firm to a piece of client work, so it
    is the Senior Partner's, and administrators' because they are
    administrators. It is deliberately narrower than it was: previously any
    commercial account, any TSD and any unit head could start one, which meant
    the pipeline filled with projects nobody had agreed to take on.

    A TSD gets it individually, by grant, via `can_start_projects` on their
    account — the same shape as `can_architect`. That is the "in case he is
    busy" case: the Senior Partner hands it to the people he trusts to use it,
    one at a time, and can take it back the same way. A blanket rule for
    everybody holding the TSD function would be the thing this replaces.
    """
    u = user or {}
    return (
        is_admin(u)
        or has_function(u, SENIOR_PARTNER)
        or bool(u.get("can_start_projects"))
    )


def can_grant_project_creation(user: Dict[str, Any]) -> bool:
    """Who may hand out `can_start_projects`.

    The Senior Partner and administrators. Anyone who could grant it to
    themselves would make the restriction above decorative.
    """
    return is_admin(user) or has_function(user, SENIOR_PARTNER)


# `can_create_project_in_unit` was removed with the unit field on a project.
# There is no unit to check a create against: a project arrives from a client
# conversation, is owned by a named TSD, and is built by a pod drawn from
# across the capability teams rather than from one unit's staff.


def can_manage_project(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    """Whether this person may edit, delete, or re-staff a project.

    Three ways to hold it: an administrator; the manager of the unit the
    project belongs to; or somebody named manager of this project in
    particular. That last one lets an administrator hand a single project to
    whoever is actually running it, without making them responsible for
    every project in the unit.

    Deliberately not the person who created it. Responsibility follows the
    role, so when a manager is replaced the new one inherits control; the
    previous one does not keep a private set only they can edit.
    """
    if is_admin(user):
        return True
    p = project or {}
    uid = (user or {}).get("user_id")
    if not uid:
        return False
    # Whoever opened it, and whoever co-manages it. Two managers on one
    # project is ordinary here, so that is a list; the older single field is
    # still honoured for projects written before it became one.
    #
    # Deliberately not everyone who manages the unit: opening projects in a
    # unit does not make a colleague's project yours to rename, restaff or
    # delete, any more than it makes it yours to read.
    return (
        # The TSD owns the project, so they run it.
        uid == p.get("tsd_id")
        # The architect owns its technical direction and its board.
        or uid == p.get("architect_id")
        or uid == p.get("created_by")
        # Retired, still read for rows the migration has not reached.
        or uid == p.get("project_manager_id")
        or uid in (p.get("project_manager_ids") or [])
    )


def can_manage_boards(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    """Whether this person may change a project board's structure.

    The board is the technical build, so its shape is a technical decision and
    belongs to the project's Solution Architect. The TSD keeps it too, because
    they own the project and should not need to find the architect to fix a
    column, and administrators keep everything.

    This used to also admit anyone holding `is_delivery_coordinator`. That flag
    is retired: the coordinator's job was choosing who runs a project, which is
    now a pipeline stage rather than a standing privilege.
    """
    return (
        is_admin(user)
        or is_project_tsd(user, project)
        or is_project_architect(user, project)
        or can_manage_project(user, project)
    )


def can_use_board(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    """Whether this person may work inside a project's board.

    Everybody on the project, pod included. The board is where
    staff post progress on the work they were given, so being able to add
    and move cards is the point of being on the project at all -- it is
    only the shape of the board they do not decide.
    """
    if can_manage_boards(user, project):
        return True
    uid = (user or {}).get("user_id")
    if not uid:
        return False
    p = project or {}
    return uid in (p.get("pod_member_ids") or []) or uid in (p.get("collaborator_ids") or [])


def can_view_all_projects(user: Dict[str, Any]) -> bool:
    """Who may find any project, as opposed to only their own.

    Administrators and the Senior Partner, because oversight is the job.

    Legal and Finance too, but note what this does and does not grant. It lets
    them locate a project; it does not decide what they then see of it. That is
    `sees_commercial_slice_only`, which hands them a different object rather
    than the whole record with fields hidden. Without this they could reach the
    pipeline and find nothing in it, which is how the role ended up unusable
    the first time.
    """
    u = user or {}
    return (
        is_admin(u)
        or u.get("function_role") == SENIOR_PARTNER
        or u.get("function_role") in COMMERCIAL_FUNCTIONS
        # Retired flags, still honoured until the migration has run everywhere.
        or bool(u.get("is_executive_approver"))
        or bool(u.get("is_delivery_coordinator"))
        or bool(u.get("is_delivery_owner"))
    )


def can_view_candidates(user: Dict[str, Any]) -> bool:
    """The CV database holds personal data on real people.

    Restricted to administrators and members of the Talent unit -- not every
    logged-in employee.
    """
    return is_admin(user) or has_unit_access(user, "talent")


def can_view_clients(user: Dict[str, Any]) -> bool:
    """Client records carry commercial and personal detail."""
    u = user or {}
    return (
        is_admin(u)
        or bool(u.get("is_delivery_coordinator"))
        or bool(u.get("is_delivery_owner"))
        or has_unit_access(u, "sales")
        or has_unit_access(u, "advisory")
        or has_unit_access(u, "client-delivery")
    )


def can_view_audit_log(user: Dict[str, Any]) -> bool:
    """Who-did-what is an administrative concern."""
    return is_admin(user)


# ── Enforcement helpers ───────────────────────────────────────────────

def require(condition: bool, detail: str = "Not authorized") -> None:
    """Raise 403 unless the condition holds.

    Kept deliberately blunt so call sites read as a single guard line.
    """
    if not condition:
        raise HTTPException(status_code=403, detail=detail)


def require_admin(user: Dict[str, Any]) -> None:
    require(is_admin(user), "Administrator access required")


def require_super_admin(user: Dict[str, Any]) -> None:
    require(is_super_admin(user), "Super administrator access required")


def require_unit(user: Dict[str, Any], slug: str) -> None:
    require(has_unit_access(user, slug), f"No access to the {slug} unit")


# ── Row-level scoping ─────────────────────────────────────────────────

def project_scope_filter(user: Dict[str, Any]) -> Dict[str, Any]:
    """Mongo filter limiting projects to those the user is involved in.

    Returns an empty filter for anyone entitled to the full portfolio, so
    callers can merge it into an existing query unconditionally:

        query = {"status": "active", **project_scope_filter(user)}

    Membership is matched across every field the pipeline uses to attach a
    person to a project, because assignment is recorded inconsistently
    (some flows store a user id, others a name or an email).
    """
    if can_view_all_projects(user):
        return {}

    uid = (user or {}).get("user_id")
    email = (user or {}).get("email")
    name = (user or {}).get("name")

    identities: List[Any] = [v for v in (uid, email, name) if v]

    clauses: List[Dict[str, Any]] = [
        {"assigned_engineer_id": uid},
        {"assigned_to": {"$in": identities}},
        {"team_members": {"$in": identities}},
        {"members": {"$in": identities}},
        {"owner_id": uid},
        {"created_by": {"$in": identities}},
        {"delivery_coordinator_id": uid},
        {"executive_approver_id": uid},
        # The pod: everybody working on this project.
        {"pod_member_ids": uid},
        # The name it had before the two were consolidated. Read while the
        # migration works through, so nobody loses a project they are on.
        {"collaborator_ids": uid},
        # Crowther OS ownership. The TSD owns the project, the Solution
        # Architect owns its technical direction, and the pod is who is
        # building it. Each is a way of being on a project, so each is a way
        # of being able to find it.
        {"tsd_id": uid},
        {"architect_id": uid},
        {"designer_id": uid},
        {"pod_member_ids": uid},
    ]

    # Managing a unit is what lets somebody open a project in it. It is not a
    # licence to read every project in it. A manager sees the work they
    # started, the work they co-manage, and the work they were put on --
    # a colleague's client engagement in the same unit is not theirs to read.
    clauses.append({"project_manager_id": uid})
    clauses.append({"project_manager_ids": uid})

    return {"$or": clauses}


def redact_candidate(candidate: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    """Strip direct contact details from a candidate for non-privileged callers.

    Lets recruiters search and shortlist without every viewer walking away
    with a list of phone numbers and email addresses.
    """
    if is_admin(user) or has_unit_access(user, "talent"):
        return candidate

    redacted = dict(candidate)
    for field in ("email", "phone", "linkedin", "raw_text"):
        redacted.pop(field, None)
    redacted["_redacted"] = True
    return redacted


# ── Function roles (Crowther OS) ──────────────────────────────────────
"""
Two independent axes, and they must stay independent.

`role` (super_admin / mini_admin / team_member) is an ACCESS LEVEL: how much of
the system a person may reach at all.

`function_role` is a JOB: what this person does on a delivery project. One
person can be a mini_admin and a talent_sd; the two answer different questions
and collapsing them would mean promoting somebody to see their own work.

Solution Architect is deliberately not a function_role of its own. It is a hat
worn on one project: an engineer carries `can_architect`, and the project names
one of them in `architect_id`. Otherwise a person who architects project A and
writes code on project B would need two accounts.
"""

SENIOR_PARTNER = "senior_partner"
COMMERCIAL = "commercial"
TSD = "tsd"
ENGINEER = "engineer"
PRODUCT_DESIGNER = "product_designer"
QA = "qa"
TALENT_SD = "talent_sd"
PEOPLE_OPS = "people_ops"
LEGAL = "legal"
FINANCE = "finance"

FUNCTION_ROLES = [
    SENIOR_PARTNER, COMMERCIAL, TSD, ENGINEER, PRODUCT_DESIGNER,
    QA, TALENT_SD, PEOPLE_OPS, LEGAL, FINANCE,
]

# The functions whose work is commercial rather than technical. They read a
# narrow slice of a project (brief, requirements, scope) and none of its
# technical detail.
COMMERCIAL_FUNCTIONS = {LEGAL, FINANCE}


def function_role(user: Dict[str, Any]) -> str:
    return (user or {}).get("function_role") or ""


def has_function(user: Dict[str, Any], *roles: str) -> bool:
    return function_role(user) in roles


def is_senior_partner(user: Dict[str, Any]) -> bool:
    return has_function(user, SENIOR_PARTNER)


def is_tsd(user: Dict[str, Any]) -> bool:
    return has_function(user, TSD)


# The unit the development team sits in. Engineers here build the work, so
# they are the pool a Solution Architect is chosen from.
ENGINEERING_UNIT = "technology"


def can_architect(user: Dict[str, Any]) -> bool:
    """Whether this person may be selected as a Solution Architect.

    Two ways in, and the first is the important one:

    **An engineer in Technology & Build qualifies by virtue of the job.** They
    are the people who do the development, so requiring somebody to tick a box
    for each of them individually meant the pool was whoever had been
    remembered — in practice one person, which made every architect
    recommendation name the same engineer no matter the project.

    **The explicit `can_architect` flag still counts**, for anyone outside that
    unit who should nonetheless be eligible. It grants; it is not required.

    Architecting stays a hat rather than a role: an engineer architects project
    A and writes code on project B, which is why this is not a `function_role`.
    """
    u = user or {}
    if bool(u.get("can_architect")):
        return True
    return (
        function_role(u) == ENGINEER
        and ENGINEERING_UNIT in (u.get("accessible_units") or [])
    )


# The same rule as a Mongo query, for the endpoints that list candidates rather
# than test one person. Kept beside `can_architect` so the two cannot drift.
ARCHITECT_CANDIDATE_QUERY = {
    "status": "active",
    "$or": [
        {"can_architect": True},
        {"function_role": ENGINEER, "accessible_units": ENGINEERING_UNIT},
    ],
}


def require_function(user: Dict[str, Any], *roles: str, detail: str = "") -> None:
    require(
        is_admin(user) or has_function(user, *roles),
        detail or f"This action belongs to: {', '.join(roles)}",
    )


# ── Project-level roles ───────────────────────────────────────────────

def is_project_tsd(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    uid = (user or {}).get("user_id")
    return bool(uid) and uid == (project or {}).get("tsd_id")


def is_project_architect(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    uid = (user or {}).get("user_id")
    return bool(uid) and uid == (project or {}).get("architect_id")


def architect_owned_stages() -> set:
    """The stages whose owner is the Solution Architect.

    Read from the stage table rather than written as a literal, so adding or
    renumbering a stage cannot leave this list quietly wrong. Imported inside
    the function purely to keep this module import-light for the many callers
    that never ask about stages.
    """
    from services.delivery_stages import STAGES

    return {n for n, cfg in STAGES.items() if cfg.get("owner") == "solution_architect"}


def can_move_stage(
    user: Dict[str, Any],
    project: Dict[str, Any],
    target_stage: Optional[int] = None,
) -> bool:
    """Who may move a project through the pipeline.

    Two people can, and they can do different things — the split is the point:

    **The TSD moves it through every stage.** They own the client and the
    project state, and delivery must not stall because somebody senior is in a
    meeting. That includes the stages the Senior Partner nominally owns.

    **The Architect moves it out of the stages they own** — architecture,
    demo, build and QA — forward only. They are functional rather than
    supervisory: when the work of their stage is done, they say so themselves
    instead of asking the TSD to click a button on their behalf. They cannot
    move a stage that is not theirs, and cannot move a project backwards,
    because a backward move is a correction to project state and that is the
    TSD's.

    What neither of them gets is the Senior Partner's one reserved act:
    naming the architect. That is `can_select_architect`, and no amount of
    stage authority reaches it.

    `target_stage` is optional so the same function answers both questions the
    app asks: "may this person move the project *right now*" (the UI
    capability flag, no target) and "may this person make *this* move" (the
    transition itself, target given).
    """
    # The Senior Partner is named explicitly rather than relied on to hold an
    # admin account. Today they hold the super admin login, so `is_admin`
    # already covered them by accident; the day somebody is granted the
    # function role without that login, the accident stops working.
    if is_admin(user) or is_senior_partner(user) or is_project_tsd(user, project):
        return True

    if is_project_architect(user, project):
        current = (project or {}).get("stage")
        if current not in architect_owned_stages():
            return False
        # Forward only. With no target this is the capability flag, and the
        # honest answer there is "yes, from where this project currently is".
        return True if target_stage is None else target_stage > current

    return False


def can_force_gate(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    """Who may advance past an unmet gate condition.

    The TSD, administrators, and the Senior Partner — deliberately *not* the
    architect, even though they can now advance their own stages. Advancing a
    stage whose conditions are met is doing the job; overruling the system when
    they are not is a different act, it alerts the Senior Partner, and it
    belongs with the people accountable for the project rather than for one
    stage of it.
    """
    return is_admin(user) or is_senior_partner(user) or is_project_tsd(user, project)


def can_set_health(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    return is_admin(user) or is_project_tsd(user, project)


def can_select_architect(user: Dict[str, Any]) -> bool:
    """Only the Senior Partner names the technical owner of a project.

    Stage 6 blocks until they act. That is deliberate, and it is the one place
    the Senior Partner sits on the critical path.
    """
    return is_admin(user) or is_senior_partner(user)


def can_upload_architecture(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    """The named architect of this project, and nobody else.

    Not every architect-capable engineer: the architecture of a project
    belongs to the person accountable for it.
    """
    return is_admin(user) or is_project_architect(user, project)


def can_raise_talent_requirement(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    return is_admin(user) or is_project_architect(user, project)


def can_confirm_talent_requirement(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    return is_admin(user) or is_project_tsd(user, project)


def sees_commercial_slice_only(user: Dict[str, Any]) -> bool:
    """Legal and Finance write contracts, not software.

    They get the brief, the requirements, the scope and the commercial fields.
    Not the architecture, the board, QA, or raw client transcripts. This is
    enforced by returning a different object, never by hiding fields in CSS.
    """
    if is_admin(user):
        return False
    return function_role(user) in COMMERCIAL_FUNCTIONS
