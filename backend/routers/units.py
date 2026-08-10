"""
Business Units router.

Lets a super admin:
  - create / list / update / delete business units (each with a configurable
    page: which sections show, and what members of the unit are responsible for)
  - invite members by email: creates (or updates) accounts, grants access to the
    unit + THCO Flow, and emails each person their login credentials.

Lifecycle of a unit member invite:
  admin supplies emails (+ optional shared password) -> accounts created with
  accessible_units = [unit_slug, "flow"] -> credentials emailed via Resend.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import uuid
import re

from services import permissions
from services import notifications

router = APIRouter(prefix="/units", tags=["units"])

# Will be set from server.py
db = None


def set_db(database):
    global db
    db = database


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class UnitSectionConfig(BaseModel):
    overview: bool = True
    tools: bool = True
    team: bool = True
    flow: bool = True
    feedback: bool = True


class UnitConfig(BaseModel):
    sections: UnitSectionConfig = UnitSectionConfig()
    userTasks: List[str] = []


class UnitCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "layers"
    accent: str = "#1FB58A"
    lead: str = ""
    config: UnitConfig = UnitConfig()


class UnitHeadSet(BaseModel):
    # Null clears the role, leaving the unit without a head.
    user_id: Optional[str] = None


class UnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    accent: Optional[str] = None
    lead: Optional[str] = None
    config: Optional[UnitConfig] = None


class InviteMember(BaseModel):
    emails: List[EmailStr]
    password: Optional[str] = None  # shared password for all; auto-generated if omitted
    role: str = "team_member"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or f"unit-{uuid.uuid4().hex[:6]}"


def serialize(unit: dict) -> dict:
    unit = dict(unit)
    unit.pop("_id", None)
    return unit


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("")
async def list_units(request: Request):
    user = await _current(request)
    units = []
    async for u in db.units.find({}, {"_id": 0}).sort("created_at", 1):
        # member count
        cnt = await db.users.count_documents({"accessible_units": u.get("slug")})
        u = dict(u)
        u["member_count"] = cnt
        units.append(u)
    return units


@router.post("")
async def create_unit(data: UnitCreate, request: Request):
    user = await _current(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create business units")

    slug = slugify(data.name)
    existing = await db.units.find_one({"slug": slug}, {"_id": 0})
    if existing:
        # make slug unique
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    unit = {
        "unit_id": f"unit_{uuid.uuid4().hex[:12]}",
        "slug": slug,
        "name": data.name,
        "description": data.description,
        "icon": data.icon,
        "accent": data.accent,
        "lead": data.lead,
        "config": data.config.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id"),
    }
    await db.units.insert_one(unit)
    return serialize(unit)


@router.get("/{slug}")
async def get_unit(slug: str, request: Request):
    await _current(request)
    unit = await db.units.find_one({"slug": slug}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    unit = dict(unit)
    unit["member_count"] = await db.users.count_documents({"accessible_units": slug})
    return unit


@router.patch("/{slug}")
async def update_unit(slug: str, data: UnitUpdate, request: Request):
    user = await _current(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can edit business units")

    existing = await db.units.find_one({"slug": slug}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Unit not found")

    update = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.units.update_one({"slug": slug}, {"$set": update})
    unit = await db.units.find_one({"slug": slug}, {"_id": 0})
    return serialize(unit)


# The unit that builds. Projects belong to whichever unit sold or owns them,
# but the people doing the work are engineers here, so they are offered
# alongside the owning unit's own people when a team is being picked.
DELIVERY_UNIT = "technology"


@router.get("/{slug}/staff")
async def list_unit_staff(slug: str, request: Request):
    """The people a project in this unit can be staffed with.

    That is the unit's own members plus Technology & Build, because a project
    owned by Client Delivery or Talent is still built by engineers. Offering
    only the owning unit's members meant a manager could not put the people
    doing the work onto the project.

    The full staff directory stays administrators-only. This returns names and
    emails for two units -- enough to choose somebody, not a copy of the
    directory -- and each person carries the unit they come from so the
    chooser can tell a colleague from an engineer.
    """
    user = await _current(request)
    permissions.require(
        permissions.is_admin(user) or slug in permissions.headed_units(user),
        "You can only see the staff of a unit you manage",
    )

    slugs = [slug] if slug == DELIVERY_UNIT else [slug, DELIVERY_UNIT]
    names = {
        u["slug"]: u.get("name")
        async for u in db.units.find({"slug": {"$in": slugs}}, {"_id": 0, "slug": 1, "name": 1})
    }
    heads = {
        u["slug"]: u.get("head_user_id")
        async for u in db.units.find({"slug": {"$in": slugs}}, {"_id": 0, "slug": 1, "head_user_id": 1})
    }

    people = await db.users.find(
        {"accessible_units": {"$in": slugs}, "status": {"$ne": "disabled"}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1, "accessible_units": 1},
    ).sort("name", 1).to_list(length=1000)

    for p in people:
        acc = p.pop("accessible_units", []) or []
        # Somebody in both units is shown under the one that owns the project.
        home = slug if slug in acc else DELIVERY_UNIT
        p["unit"] = home
        p["unit_name"] = names.get(home, home)
        p["is_head"] = p["user_id"] == heads.get(home)

    return {"slug": slug, "staff": people, "total": len(people),
            "units": [{"slug": s, "name": names.get(s, s)} for s in slugs]}


@router.put("/{slug}/head")
async def set_unit_head(slug: str, data: UnitHeadSet, request: Request):
    """Appoint, change or clear the head of a unit.

    A unit has at most one head, so appointing a new one replaces whoever
    held it -- companies reorganise, and the admin must be able to move the
    role without editing anyone's account. Passing a null user_id clears it,
    which leaves the unit with nobody able to open projects under it until
    a new head is named.
    """
    user = await _current(request)
    permissions.require_admin(user)

    unit = await db.units.find_one({"slug": slug}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    previous_id = unit.get("head_user_id")
    previous_name = unit.get("head_name")

    if not data.user_id:
        await db.units.update_one(
            {"slug": slug},
            {"$set": {"head_user_id": None, "head_name": None,
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"slug": slug, "head_user_id": None, "head_name": None,
                "previous_head_id": previous_id, "previous_head_name": previous_name}

    head = await db.users.find_one(
        {"user_id": data.user_id}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "accessible_units": 1}
    )
    if not head:
        raise HTTPException(status_code=404, detail="That person does not have an account")

    await db.units.update_one(
        {"slug": slug},
        {"$set": {
            "head_user_id": head["user_id"],
            "head_name": head.get("name"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    # Heading a unit you cannot open is a dead end, so grant access alongside.
    await db.users.update_one(
        {"user_id": head["user_id"]},
        {"$addToSet": {"accessible_units": {"$each": [slug, "flow"]}}},
    )

    if head["user_id"] != previous_id:
        await notifications.notify_made_unit_head(
            db, head, slug, unit.get("name") or slug, user
        )

    return {
        "slug": slug,
        "head_user_id": head["user_id"],
        "head_name": head.get("name"),
        "previous_head_id": previous_id,
        "previous_head_name": previous_name,
    }


@router.delete("/{slug}")
async def delete_unit(slug: str, request: Request):
    user = await _current(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can delete business units")
    res = await db.units.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"deleted": True}


@router.post("/{slug}/invite")
async def invite_members(slug: str, data: InviteMember, request: Request):
    """Create/update accounts for each email, grant unit+flow access, email credentials."""
    user = await _current(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can invite members")

    unit = await db.units.find_one({"slug": slug}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    if data.role not in ["super_admin", "mini_admin", "team_member"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    if user.get("role") != "super_admin" and data.role == "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create super admins")

    shared_pw = (data.password or "").strip()
    if shared_pw and len(shared_pw) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    created, updated, emails_sent, errors = [], [], [], []

    for email in data.emails:
        email = str(email).lower().strip()
        try:
            existing = await db.users.find_one({"email": email}, {"_id": 0})
            if existing:
                # Add unit access (idempotent)
                units = list(existing.get("accessible_units", []))
                if slug not in units:
                    units.append(slug)
                if "flow" not in units:
                    units.append("flow")
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"accessible_units": units, "status": "active"}},
                )
                updated.append(email)
                pw = shared_pw or "(your existing password)"
            else:
                pw = shared_pw or f"Thco{datetime.now(timezone.utc).strftime('%m%d')}{uuid.uuid4().hex[:4]}"
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                from server import hash_password
                new_user = {
                    "user_id": user_id,
                    "email": email,
                    "password_hash": hash_password(pw),
                    "name": email.split("@")[0].replace(".", " ").title(),
                    "role": data.role,
                    "accessible_units": [slug, "flow"],
                    "status": "active",
                    "picture": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": user.get("user_id"),
                }
                await db.users.insert_one(new_user)
                created.append(email)

            # send credentials email
            try:
                from services import send_email
                html = _credentials_email_html(unit["name"], email, pw)
                await send_email(
                    to=[email],
                    subject=f"Your THCO Control Room access — {unit['name']}",
                    html=html,
                )
                emails_sent.append(email)
            except Exception as e:  # email is best-effort; don't fail the invite
                errors.append(f"{email}: email not sent ({str(e)[:80]})")
        except Exception as e:
            errors.append(f"{email}: {str(e)[:120]}")

    return {
        "created": created,
        "updated": updated,
        "emails_sent": emails_sent,
        "errors": errors,
        "login_url": "/login",
    }


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------
async def _current(request: Request) -> dict:
    from server import get_current_user
    return await get_current_user(request)


def _credentials_email_html(unit_name: str, email: str, password: str) -> str:
    login_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5178')}/login"
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0C0F13;border-radius:12px;color:#E8E6F0">
      <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">THCO Control Room</div>
      <p style="color:#9AA0AB;margin:0 0 18px">Welcome to <strong style="color:#fff">{unit_name}</strong></p>
      <p style="color:#E8E6F0">Your account has been created. Use the details below to sign in:</p>
      <div style="background:#161B22;border:1px solid #2a2f38;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#9AA0AB">Email<br><strong style="color:#fff">{email}</strong></p>
        <p style="margin:12px 0 4px;color:#9AA0AB">Password<br><strong style="color:#fff">{password}</strong></p>
      </div>
      <p style="color:#9AA0AB">Sign in at <a href="{login_link}" style="color:#1FB58A">the THCO Control Room</a> and open <strong style="color:#fff">{unit_name}</strong> from your dashboard.</p>
      <p style="color:#6B7280;font-size:12px;margin-top:6px">Or copy this link into your browser: {login_link}</p>
      <p style="color:#6B7280;font-size:12px;margin-top:18px">If you already had an account, your password is unchanged and the unit was added to your access.</p>
    </div>
    """
