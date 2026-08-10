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
collaborators. Ordinary staff no longer open projects at all -- they see
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

    `flow` is the project pipeline. It used to be open to every logged-in
    person on the reasoning that rows inside it are scoped per-user anyway --
    but somebody with no project sees an empty pipeline, which is a menu entry
    that only ever shows them nothing. So it now opens once they actually have
    work in it: a project collaborator, a unit head, or an administrator.
    """
    if not slug:
        return True
    if is_admin(user):
        return True
    if slug == "flow":
        return bool((user or {}).get("has_projects")) or is_unit_head(user)
    return slug in ((user or {}).get("accessible_units") or [])


def headed_units(user: Dict[str, Any]) -> List[str]:
    """Unit slugs this person heads.

    Resolved when the user is loaded and carried on the user dict, so the
    permission checks below stay synchronous like every other rule here.
    """
    return list((user or {}).get("headed_units") or [])


def is_unit_head(user: Dict[str, Any]) -> bool:
    return bool(headed_units(user))


def can_create_projects(user: Dict[str, Any]) -> bool:
    """Whether this person may open a project at all.

    Used to decide whether to offer the action; the unit-specific check
    below is what actually authorises a given create.
    """
    return is_admin(user) or is_unit_head(user)


def can_create_project_in_unit(user: Dict[str, Any], slug: str) -> bool:
    """Whether this person may open a project under a particular unit.

    Administrators may open one anywhere. A head is confined to the unit
    they head: the head of Technology & Build does not open work under
    Marketing.
    """
    if is_admin(user):
        return True
    return bool(slug) and slug in headed_units(user)


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
    # Named on this project in particular. Two managers on one project is
    # ordinary here, so this is a list; the older single field is still
    # honoured for projects written before it became one.
    if uid == p.get("project_manager_id") or uid in (p.get("project_manager_ids") or []):
        return True
    return bool(p.get("unit_slug")) and p.get("unit_slug") in headed_units(user)


def can_manage_boards(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    """Whether this person may change a project board's structure.

    Adding, renaming and deleting boards is the head's job -- they decide
    how their unit's work is laid out. Administrators and HR keep it too,
    as does the delivery coordinator role that ran boards before units had
    heads.
    """
    return can_manage_project(user, project) or bool((user or {}).get("is_delivery_coordinator"))


def can_use_board(user: Dict[str, Any], project: Dict[str, Any]) -> bool:
    """Whether this person may work inside a project's board.

    Everybody on the project, collaborators included. The board is where
    staff post progress on the work they were given, so being able to add
    and move cards is the point of being on the project at all -- it is
    only the shape of the board they do not decide.
    """
    if can_manage_boards(user, project):
        return True
    uid = (user or {}).get("user_id")
    return bool(uid) and uid in ((project or {}).get("collaborator_ids") or [])


def can_view_all_projects(user: Dict[str, Any]) -> bool:
    """Admins and delivery oversight roles see the whole portfolio."""
    u = user or {}
    return (
        is_admin(u)
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
        # Staff added to a project by its unit head.
        {"collaborator_ids": uid},
    ]

    # A head sees everything under the unit they run, including work they
    # did not open themselves.
    headed = headed_units(user)
    if headed:
        clauses.append({"unit_slug": {"$in": headed}})

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
