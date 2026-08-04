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
    Note `flow` is deliberately open to all staff: the project pipeline is the
    shared workspace, and rows inside it are scoped per-user by
    `project_scope_filter` rather than by hiding the unit.
    """
    if not slug:
        return True
    if is_admin(user):
        return True
    if slug == "flow":
        return True
    return slug in ((user or {}).get("accessible_units") or [])


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

    return {
        "$or": [
            {"assigned_engineer_id": uid},
            {"assigned_to": {"$in": identities}},
            {"team_members": {"$in": identities}},
            {"members": {"$in": identities}},
            {"owner_id": uid},
            {"created_by": {"$in": identities}},
            {"delivery_coordinator_id": uid},
            {"executive_approver_id": uid},
        ]
    }


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
