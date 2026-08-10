from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status, UploadFile, File, Form
from fastapi.security import HTTPBearer
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import shutil
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
import bcrypt
import jwt
import asyncio
import httpx
import resend

from services import permissions
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from user_agents import parse as parse_user_agent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Uploads directory for proposals
UPLOADS_DIR = ROOT_DIR / "uploads" / "proposals"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB connection (tolerant in preview environments)
mongo_url = os.environ.get('MONGO_URL')
db = None
client = None
if mongo_url:
    try:
        client = AsyncIOMotorClient(mongo_url)
        db_name = os.environ.get('DB_NAME', 'thco')
        db = client[db_name]
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB: {e}")
        client = None
        db = None
else:
    logger.warning('MONGO_URL not set; running without database connection (preview mode).')

# Resend setup
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'thco-super-secret-key-2024')
JWT_ALGORITHM = 'HS256'
SESSION_EXPIRY_DAYS = 7

# Create the main app
app = FastAPI(title="THCO Internal Portal API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "team_member"  # super_admin, mini_admin, team_member
    accessible_units: List[str] = []
    status: str = "active"  # active, disabled
    is_it: bool = False

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    accessible_units: List[str]
    status: str
    picture: Optional[str] = None
    created_at: datetime
    is_engineer: Optional[bool] = False
    is_fulfillment: Optional[bool] = False
    is_hr: Optional[bool] = False
    is_qualifier: Optional[bool] = False
    is_delivery_coordinator: Optional[bool] = False
    is_delivery_owner: Optional[bool] = False
    is_pricing_owner: Optional[bool] = False
    is_operations_owner: Optional[bool] = False
    is_executive_approver: Optional[bool] = False
    is_legal: Optional[bool] = False
    is_engineering_coordinator: Optional[bool] = False
    is_relationship_owner: Optional[bool] = False
    # Units this person heads. Resolved from the units collection on load, so
    # the frontend can offer "New Project" only where it will actually work.
    headed_units: List[str] = []
    # Whether they are on any project. Gates THCO Flow in the sidebar.
    has_projects: bool = False
    is_invoicing_owner: Optional[bool] = False
    is_prospect_owner: Optional[bool] = False
    is_legal: Optional[bool] = False
    is_it: Optional[bool] = False
    engineer_capacity_override: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    # Correctable after the invite goes out. A mistyped address is the
    # likeliest mistake and the worst one -- the invitation reaches nobody,
    # and the account cannot be signed into.
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    accessible_units: Optional[List[str]] = None
    status: Optional[str] = None
    is_engineer: Optional[bool] = None
    is_fulfillment: Optional[bool] = None
    is_hr: Optional[bool] = None
    is_it: Optional[bool] = None
    engineer_capacity_override: Optional[int] = None
    device_lock_enabled: Optional[bool] = None
    allowed_device_fingerprint: Optional[str] = None
    headed_units: Optional[List[str]] = None

class LoginRecordResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    record_id: str
    user_id: str
    user_name: str
    user_email: str
    login_time: datetime
    ip_address: str
    location: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    device_type: str
    device_os: str
    browser: str
    user_agent: str
    device_fingerprint: str
    login_method: str
    success: bool
    failure_reason: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class SourcingRequestCreate(BaseModel):
    job_title: str
    job_description: str
    company_name: str
    company_website: str
    company_location: str
    hiring_locations: str
    salary_budget: Optional[str] = ""
    target_companies: Optional[str] = ""
    companies_to_exclude: Optional[str] = ""
    accept_n_minus_one: str
    industry_segments: Optional[str] = ""
    additional_notes: Optional[str] = ""
    assigned_recruiter: str

class SourcingRequestResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str
    user_id: str
    job_title: str
    job_description: str
    company_name: str
    company_website: str
    company_location: str
    hiring_locations: str
    salary_budget: str
    target_companies: str
    companies_to_exclude: str
    accept_n_minus_one: str
    industry_segments: str
    additional_notes: str
    assigned_recruiter: str
    requester_email: str
    status: str
    created_at: datetime

class DatabaseSearchCreate(BaseModel):
    job_title: str
    job_description: str
    company_context: Optional[str] = ""
    seniority_level: str
    max_candidates: str

class DatabaseSearchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    search_id: str
    user_id: str
    job_title: str
    job_description: str
    company_context: str
    seniority_level: str
    max_candidates: str
    status: str
    created_at: datetime

class WebhookConfig(BaseModel):
    sourcing_webhook_url: Optional[str] = ""
    database_search_webhook_url: Optional[str] = ""

class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    user_id: str
    user_name: str
    action: str
    unit_slug: str
    entity_type: str
    entity_id: str
    details: str
    created_at: datetime

# ==================== PROPOSAL MODELS ====================

class ClientCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    client_id: str
    name: str
    description: str
    proposal_count: int
    created_by: str
    created_at: datetime

class ProposalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    proposal_id: str
    client_id: str
    client_name: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    share_token: str
    share_url: str
    uploaded_by: str
    uploaded_by_name: str
    created_at: datetime

# ==================== ANALYTICS MODELS ====================

class PageViewCreate(BaseModel):
    page_path: str
    page_title: Optional[str] = ""
    referrer: Optional[str] = ""

class UserActionCreate(BaseModel):
    action_type: str  # click, form_submit, file_upload, etc.
    action_target: str  # button name, form name, etc.
    action_details: Optional[dict] = {}
    page_path: str

class SessionHeartbeat(BaseModel):
    session_id: str
    page_path: str
    time_on_page: int  # seconds

class AnalyticsSummary(BaseModel):
    total_users: int
    active_users_today: int
    active_users_week: int
    total_sessions: int
    avg_session_duration: float
    total_page_views: int
    most_visited_pages: List[dict]
    user_actions_summary: dict
    device_breakdown: dict
    browser_breakdown: dict

# ==================== PROPOSAL VIEWER MODELS ====================

class ProposalViewerRegister(BaseModel):
    email: EmailStr
    name: Optional[str] = ""
    company: Optional[str] = ""
    proposal_slug: str

class ProposalViewerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    viewer_id: str
    email: str
    name: str
    company: str
    proposal_slug: str
    proposal_name: str
    first_viewed_at: datetime
    last_viewed_at: datetime
    view_count: int
    total_time_spent: int  # seconds
    ip_address: Optional[str] = None
    location: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None

class ProposalViewerActivity(BaseModel):
    email: str
    proposal_slug: str
    time_spent: int  # seconds to add
    current_slide: Optional[int] = None

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> dict:
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Then try Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check session in database
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("status") == "disabled":
        raise HTTPException(status_code=403, detail="Account disabled")

    # Which units this person heads is held on the units themselves, so that
    # reassigning a head is one write and nobody can be left as the stale head
    # of a unit somebody else now runs. Resolve it here so every permission
    # check downstream can stay synchronous.
    # Which units this person manages projects in.
    #
    # Two sources on purpose. Most units run with every member a project
    # manager -- they open their own work and staff it -- and that is a grant
    # held per person, in `headed_units`. A unit may additionally name one
    # person on the unit itself, which is how Technology & Build runs with a
    # single manager. Neither replaces the other, so both are read.
    #
    # I previously collapsed this to the unit alone, on the reasoning that one
    # fact should have one home. That was wrong: they are two different facts.
    # Collapsing them stripped the manager grant from every member of every
    # unit but one.
    named = [
        u["slug"]
        async for u in db.units.find({"head_user_id": user["user_id"]}, {"_id": 0, "slug": 1})
    ]
    granted = user.get("headed_units") if isinstance(user.get("headed_units"), list) else []
    user["headed_units"] = sorted(set(named) | set(granted))

    # Whether this person has any real project. The Business Units section
    # opens on this: staff who have not been put on a project yet would
    # otherwise be given rooms that show them nothing.
    #
    # Demo projects are excluded deliberately. They predate unit heads and
    # several were created by ordinary staff, so counting them would hand
    # somebody the pipeline on the strength of sample data rather than the
    # work their unit head actually gave them.
    if permissions.can_view_all_projects(user) or user["headed_units"]:
        user["has_projects"] = True
    else:
        user["has_projects"] = await db.projects.count_documents(
            {**permissions.project_scope_filter(user), "is_demo": {"$ne": True}}
        ) > 0

    return user

async def log_activity(user_id: str, user_name: str, action: str, unit_slug: str = "", entity_type: str = "", entity_id: str = "", details: str = ""):
    log_doc = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "unit_slug": unit_slug,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(log_doc)

async def get_webhook_url(key: str) -> str:
    settings = await db.app_settings.find_one({"setting_type": "webhooks"}, {"_id": 0})
    if settings:
        return settings.get(key, "")
    return ""

# ==================== ANALYTICS TRACKING HELPERS ====================

async def track_page_view(user_id: str, user_name: str, session_id: str, page_path: str, page_title: str, referrer: str, request: Request):
    """Track a page view for analytics"""
    user_agent = request.headers.get("user-agent", "")
    device_info = parse_device_info(user_agent)
    
    page_view_doc = {
        "view_id": f"pv_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "user_name": user_name,
        "session_id": session_id,
        "page_path": page_path,
        "page_title": page_title,
        "referrer": referrer,
        "device_type": device_info.get("device_type", "Unknown"),
        "browser": device_info.get("browser", "Unknown"),
        "os": device_info.get("device_os", "Unknown"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.page_views.insert_one(page_view_doc)

async def track_user_action(user_id: str, user_name: str, session_id: str, action_type: str, action_target: str, action_details: dict, page_path: str):
    """Track a user action for analytics"""
    action_doc = {
        "action_id": f"act_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "user_name": user_name,
        "session_id": session_id,
        "action_type": action_type,
        "action_target": action_target,
        "action_details": action_details,
        "page_path": page_path,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.user_actions.insert_one(action_doc)

async def update_session_activity(session_id: str, page_path: str, time_on_page: int):
    """Update session activity and time tracking"""
    now = datetime.now(timezone.utc)
    
    # Update session last activity
    await db.analytics_sessions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "last_activity": now.isoformat(),
                "last_page": page_path
            },
            "$inc": {
                "total_time_seconds": time_on_page,
                "page_count": 1
            }
        },
        upsert=True
    )

async def start_analytics_session(user_id: str, user_name: str, request: Request) -> str:
    """Start a new analytics session for a user"""
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    user_agent = request.headers.get("user-agent", "")
    device_info = parse_device_info(user_agent)
    
    # Get IP address
    ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if "," in ip_address:
        ip_address = ip_address.split(",")[0].strip()
    
    session_doc = {
        "session_id": session_id,
        "user_id": user_id,
        "user_name": user_name,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "last_activity": datetime.now(timezone.utc).isoformat(),
        "last_page": "/dashboard",
        "total_time_seconds": 0,
        "page_count": 0,
        "device_type": device_info.get("device_type", "Unknown"),
        "browser": device_info.get("browser", "Unknown"),
        "os": device_info.get("device_os", "Unknown"),
        "ip_address": ip_address,
        "is_active": True
    }
    await db.analytics_sessions.insert_one(session_doc)
    return session_id

# ==================== LOGIN TRACKING HELPERS ====================

def parse_device_info(user_agent_string: str) -> dict:
    """Parse user agent string to extract device information"""
    try:
        ua = parse_user_agent(user_agent_string)
        device_type = "Desktop"
        if ua.is_mobile:
            device_type = "Mobile"
        elif ua.is_tablet:
            device_type = "Tablet"
        elif ua.is_bot:
            device_type = "Bot"
        
        return {
            "device_type": device_type,
            "device_os": f"{ua.os.family} {ua.os.version_string}".strip(),
            "browser": f"{ua.browser.family} {ua.browser.version_string}".strip(),
            "device_family": ua.device.family,
            "is_mobile": ua.is_mobile,
            "is_tablet": ua.is_tablet,
            "is_pc": ua.is_pc
        }
    except Exception as e:
        logger.error(f"Failed to parse user agent: {e}")
        return {
            "device_type": "Unknown",
            "device_os": "Unknown",
            "browser": "Unknown",
            "device_family": "Unknown",
            "is_mobile": False,
            "is_tablet": False,
            "is_pc": True
        }

def generate_device_fingerprint(user_agent: str, ip_address: str) -> str:
    """Generate a device fingerprint based on user agent and IP"""
    # Use only user agent for fingerprint so same device can login from different networks
    fingerprint_data = f"{user_agent}"
    return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:32]

async def get_ip_location(ip_address: str) -> dict:
    """Get location information from IP address using free API"""
    try:
        # Skip for localhost/private IPs
        if ip_address in ["127.0.0.1", "localhost", "::1"] or ip_address.startswith("192.168.") or ip_address.startswith("10."):
            return {"country": "Local", "city": "Local", "location": "Local Network"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}?fields=status,country,city,regionName,isp", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return {
                        "country": data.get("country", "Unknown"),
                        "city": data.get("city", "Unknown"),
                        "region": data.get("regionName", ""),
                        "isp": data.get("isp", ""),
                        "location": f"{data.get('city', '')}, {data.get('country', '')}"
                    }
    except Exception as e:
        logger.error(f"Failed to get IP location: {e}")
    
    return {"country": "Unknown", "city": "Unknown", "location": "Unknown"}

def get_client_ip(request: Request) -> str:
    """Extract the real client IP from request headers"""
    # Check for forwarded headers (in case of proxy/load balancer)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "Unknown"

async def record_login_attempt(
    user_id: str,
    user_name: str,
    user_email: str,
    request: Request,
    login_method: str,
    success: bool,
    failure_reason: str = None
) -> dict:
    """Record a login attempt with full device and location tracking"""
    user_agent = request.headers.get("user-agent", "Unknown")
    ip_address = get_client_ip(request)
    device_info = parse_device_info(user_agent)
    location_info = await get_ip_location(ip_address)
    device_fingerprint = generate_device_fingerprint(user_agent, ip_address)
    
    login_record = {
        "record_id": f"login_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "login_time": datetime.now(timezone.utc).isoformat(),
        "ip_address": ip_address,
        "location": location_info.get("location", "Unknown"),
        "country": location_info.get("country", "Unknown"),
        "city": location_info.get("city", "Unknown"),
        "device_type": device_info.get("device_type", "Unknown"),
        "device_os": device_info.get("device_os", "Unknown"),
        "browser": device_info.get("browser", "Unknown"),
        "user_agent": user_agent,
        "device_fingerprint": device_fingerprint,
        "login_method": login_method,
        "success": success,
        "failure_reason": failure_reason
    }
    
    await db.login_records.insert_one(login_record)
    return login_record

async def check_device_lock(user: dict, request: Request) -> tuple:
    """Check if user is allowed to login from this device"""
    if not user.get("device_lock_enabled", False):
        return True, None
    
    allowed_fingerprint = user.get("allowed_device_fingerprint")
    if not allowed_fingerprint:
        return True, None  # No device registered yet
    
    user_agent = request.headers.get("user-agent", "Unknown")
    ip_address = get_client_ip(request)
    current_fingerprint = generate_device_fingerprint(user_agent, ip_address)
    
    if current_fingerprint != allowed_fingerprint:
        device_info = parse_device_info(user_agent)
        return False, f"Login blocked: Device not authorized. Current device: {device_info['device_type']} - {device_info['browser']} on {device_info['device_os']}"
    
    return True, None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user (make them super_admin)
    user_count = await db.users.count_documents({})
    role = "super_admin" if user_count == 0 else "team_member"
    
    # All units for reference
    all_units = ["talent", "thco-hr", "flow", "it-tools", "sales", "marketing", "advisory", "technology", "operations", "academy", "client-delivery"]
    accessible_units = all_units if role == "super_admin" else []
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": role,
        "accessible_units": accessible_units,
        "status": "active",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    await log_activity(user_id, user_data.name, "User registered", details=f"Role: {role}")
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": role,
        "accessible_units": accessible_units,
        "status": "active",
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, request: Request, response: Response):
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    if not user:
        # Record failed login attempt
        await record_login_attempt(
            user_id="unknown",
            user_name="Unknown",
            user_email=credentials.email,
            request=request,
            login_method="email_password",
            success=False,
            failure_reason="Invalid credentials - user not found"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        await record_login_attempt(
            user_id=user["user_id"],
            user_name=user["name"],
            user_email=user["email"],
            request=request,
            login_method="email_password",
            success=False,
            failure_reason="Invalid credentials - wrong password"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("status") == "disabled":
        await record_login_attempt(
            user_id=user["user_id"],
            user_name=user["name"],
            user_email=user["email"],
            request=request,
            login_method="email_password",
            success=False,
            failure_reason="Account disabled"
        )
        raise HTTPException(status_code=403, detail="Account disabled")
    
    # Check device lock
    device_allowed, block_reason = await check_device_lock(user, request)
    if not device_allowed:
        await record_login_attempt(
            user_id=user["user_id"],
            user_name=user["name"],
            user_email=user["email"],
            request=request,
            login_method="email_password",
            success=False,
            failure_reason=block_reason
        )
        raise HTTPException(status_code=403, detail=block_reason)
    
    # Record successful login
    login_record = await record_login_attempt(
        user_id=user["user_id"],
        user_name=user["name"],
        user_email=user["email"],
        request=request,
        login_method="email_password",
        success=True
    )
    
    # Create new session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "device_fingerprint": login_record["device_fingerprint"],
        "ip_address": login_record["ip_address"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    await log_activity(user["user_id"], user["name"], "User logged in", details=f"IP: {login_record['ip_address']}, Device: {login_record['device_type']}")
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "accessible_units": user.get("accessible_units", []),
        "status": user["status"],
        "picture": user.get("picture"),
        "session_token": session_token
    }

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for user session"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent auth service
    async with httpx.AsyncClient() as http_client:
        try:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
        except Exception as e:
            logger.error(f"OAuth session exchange failed: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = auth_data.get("email")
    name = auth_data.get("name", "")
    picture = auth_data.get("picture", "")
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        # Check device lock for existing user
        device_allowed, block_reason = await check_device_lock(user, request)
        if not device_allowed:
            await record_login_attempt(
                user_id=user["user_id"],
                user_name=user["name"],
                user_email=user["email"],
                request=request,
                login_method="google_oauth",
                success=False,
                failure_reason=block_reason
            )
            raise HTTPException(status_code=403, detail=block_reason)
        
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
        user_id = user["user_id"]
        role = user["role"]
        accessible_units = user.get("accessible_units", [])
        status = user["status"]
        
        if status == "disabled":
            await record_login_attempt(
                user_id=user["user_id"],
                user_name=user["name"],
                user_email=user["email"],
                request=request,
                login_method="google_oauth",
                success=False,
                failure_reason="Account disabled"
            )
            raise HTTPException(status_code=403, detail="Account disabled")
    else:
        # Check if first user
        user_count = await db.users.count_documents({})
        role = "super_admin" if user_count == 0 else "team_member"
        all_units = ["talent", "thco-hr", "flow", "it-tools", "sales", "marketing", "advisory", "technology", "operations", "academy", "client-delivery"]
        accessible_units = all_units if role == "super_admin" else []
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "password_hash": "",
            "name": name,
            "role": role,
            "accessible_units": accessible_units,
            "status": "active",
            "picture": picture,
            "device_lock_enabled": False,
            "allowed_device_fingerprint": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        status = "active"
        await log_activity(user_id, name, "User registered via Google OAuth", details=f"Role: {role}")
    
    # Record successful login
    login_record = await record_login_attempt(
        user_id=user_id,
        user_name=name,
        user_email=email,
        request=request,
        login_method="google_oauth",
        success=True
    )
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "device_fingerprint": login_record["device_fingerprint"],
        "ip_address": login_record["ip_address"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    await log_activity(user_id, name, "User logged in via Google OAuth", details=f"IP: {login_record['ip_address']}, Device: {login_record['device_type']}")
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "accessible_units": accessible_units,
        "status": status,
        "picture": picture,
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "accessible_units": user.get("accessible_units", []),
        "status": user["status"],
        "picture": user.get("picture"),
        "is_engineer": user.get("is_engineer", False),
        "is_fulfillment": user.get("is_fulfillment", False),
        "is_hr": user.get("is_hr", False),
        "is_qualifier": user.get("is_qualifier", False),
        "is_delivery_coordinator": user.get("is_delivery_coordinator", False),
        "is_delivery_owner": user.get("is_delivery_owner", False),
        "is_pricing_owner": user.get("is_pricing_owner", False),
        "is_operations_owner": user.get("is_operations_owner", False),
        "is_executive_approver": user.get("is_executive_approver", False),
        "is_legal": user.get("is_legal", False),
        "is_engineering_coordinator": user.get("is_engineering_coordinator", False),
        "is_relationship_owner": user.get("is_relationship_owner", False),
        "is_invoicing_owner": user.get("is_invoicing_owner", False),
        "is_prospect_owner": user.get("is_prospect_owner", False),
        "is_it": user.get("is_it", False),
        # Resolved per request in get_current_user. The sidebar uses these to
        # decide whether to offer THCO Flow and the New Project action.
        "headed_units": user.get("headed_units", []),
        "has_projects": user.get("has_projects", False),
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = f"reset_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "token": reset_token,
        "user_id": user["user_id"],
        "email": data.email,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send email via Resend
    if resend.api_key:
        try:
            reset_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
            params = {
                "from": SENDER_EMAIL,
                "to": [data.email],
                "subject": "THCO Portal - Password Reset",
                "html": f"""
                <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0D0F1A; color: #E8E6F0;">
                    <h1 style="color: #7C64FF;">Password Reset</h1>
                    <p>You requested to reset your password for THCO Portal.</p>
                    <p>Click the link below to set a new password:</p>
                    <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background-color: #7C64FF; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Reset Password</a>
                    <p style="color: #8B8AA0; font-size: 14px;">This link expires in 1 hour.</p>
                    <p style="color: #8B8AA0; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                </div>
                """
            }
            await asyncio.to_thread(resend.Emails.send, params)
        except Exception as e:
            logger.error(f"Failed to send reset email: {e}")
    
    return {"message": "If the email exists, a reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    reset_doc = await db.password_resets.find_one({"token": data.token, "used": False}, {"_id": 0})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expires_at = datetime.fromisoformat(reset_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    
    # Update password
    await db.users.update_one(
        {"user_id": reset_doc["user_id"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

# ==================== USER MANAGEMENT ROUTES ====================

def can_manage_users(user: dict) -> bool:
    """Super admins, mini admins, and HR users can manage the user directory."""
    return user["role"] in ["super_admin", "mini_admin"] or bool(user.get("is_hr"))


@api_router.get("/users", response_model=List[UserResponse])
async def get_users(request: Request):
    current_user = await get_current_user(request)
    if not can_manage_users(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Convert timestamps
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return users

@api_router.post("/users")
async def create_user(user_data: dict, request: Request):
    current_user = await get_current_user(request)
    if not can_manage_users(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    requested_role = user_data.get("role", "team_member")
    if requested_role not in ["super_admin", "mini_admin", "team_member"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Only super admins can create other super admins
    if current_user["role"] != "super_admin" and requested_role == "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create super admins")

    # Check if email exists
    existing = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Use the admin-supplied password, or generate a temporary one
    provided_password = (user_data.get("password") or "").strip()
    if provided_password and len(provided_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    temp_password = provided_password or f"temp_{uuid.uuid4().hex[:8]}"

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = {
        "user_id": user_id,
        "email": user_data["email"],
        "password_hash": hash_password(temp_password),
        "name": user_data["name"],
        "role": requested_role,
        "accessible_units": user_data.get("accessible_units", []),
        "status": "active",
        "picture": None,
        "is_hr": bool(user_data.get("is_hr", False)),
        "is_engineer": bool(user_data.get("is_engineer", False)),
        "is_fulfillment": bool(user_data.get("is_fulfillment", False)),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)

    # An admin may appoint the new person head of a unit as they invite them.
    # A unit has one head, so this replaces whoever held it.
    head_of_unit = (user_data.get("head_of_unit") or "").strip()
    if head_of_unit:
        unit = await db.units.find_one({"slug": head_of_unit}, {"_id": 0, "slug": 1, "name": 1})
        if not unit:
            raise HTTPException(status_code=400, detail=f"No unit named {head_of_unit}")
        await db.units.update_one(
            {"slug": head_of_unit},
            {"$set": {"head_user_id": user_id, "head_name": new_user["name"],
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        # Heading a unit you cannot open is a dead end.
        await db.users.update_one(
            {"user_id": user_id},
            {"$addToSet": {"accessible_units": {"$each": [head_of_unit, "flow"]}}},
        )

    await log_activity(
        current_user["user_id"],
        current_user["name"],
        f"Created staff member {user_data['name']}",
        details=f"Role: {new_user['role']}" + (f"; head of {head_of_unit}" if head_of_unit else "")
    )

    # Email the new user their login details + platform link (best-effort)
    email_sent = False
    try:
        from services import send_email
        # Must match the fallback used by the password-reset link above; they
        # disagreed (5178 vs 3000), so invitation emails pointed at a port
        # nothing listens on while reset emails worked.
        login_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/login"
        html = f"""
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0C0F13;border-radius:12px;color:#E8E6F0">
          <div style="font-size:22px;font-weight:700;color:#C6A15B;margin-bottom:4px">THCO Control Room</div>
          <p style="color:#9AA0AB;margin:0 0 18px">Welcome, <strong style="color:#fff">{user_data['name']}</strong></p>
          <p style="color:#E8E6F0">Your account has been created. Use the details below to sign in and start operating:</p>
          <div style="background:#161B22;border:1px solid #2a2f38;border-radius:10px;padding:16px;margin:16px 0">
            <p style="margin:4px 0;color:#9AA0AB">Email<br><strong style="color:#fff">{user_data['email']}</strong></p>
            <p style="margin:12px 0 4px;color:#9AA0AB">Password<br><strong style="color:#fff">{temp_password}</strong></p>
          </div>
          <a href="{login_link}" style="display:inline-block;background:#1FB58A;color:#0C0F13;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none">Open the platform &amp; sign in</a>
          <p style="color:#6B7280;font-size:12px;margin-top:18px">Or copy this link into your browser: {login_link}<br>We recommend changing your password after your first login (Profile &gt; Change Password).</p>
        </div>
        """
        await send_email(
            to=[user_data["email"]],
            subject="Your THCO Control Room login details",
            html=html,
        )
        email_sent = True
    except Exception as e:
        logger.warning(f"Credentials email to {user_data['email']} not sent: {e}")

    return {
        "user_id": user_id,
        "email": user_data["email"],
        "name": user_data["name"],
        "role": new_user["role"],
        "accessible_units": new_user["accessible_units"],
        "status": "active",
        "temp_password": temp_password,
        "email_sent": email_sent
    }

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: UserUpdate, request: Request):
    current_user = await get_current_user(request)
    if not can_manage_users(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Mini admins / HR can't manage super admins or promote anyone to super admin
    if current_user["role"] != "super_admin":
        if target_user["role"] == "super_admin":
            raise HTTPException(status_code=403, detail="Cannot manage super admin users")
        if updates.role == "super_admin":
            raise HTTPException(status_code=403, detail="Only super admins can grant super admin")
    
    # Super admins can't demote themselves
    if current_user["user_id"] == user_id and updates.role and updates.role != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot change your own role")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}

    # `headed_units` is the per-person manager grant and is stored as given.
    # Naming one person on the unit itself is a separate thing, done through
    # the units API; neither overwrites the other.
    # A corrected address must still be unique, and is stored lowercase to
    # match how sign-in looks it up.
    if "email" in update_dict:
        new_email = str(update_dict["email"]).strip().lower()
        if new_email != (target_user.get("email") or "").lower():
            clash = await db.users.find_one(
                {"email": new_email, "user_id": {"$ne": user_id}}, {"_id": 0, "user_id": 1}
            )
            if clash:
                raise HTTPException(status_code=400, detail="Another account already uses that email")
        update_dict["email"] = new_email

    new_password = update_dict.pop("password", None)
    if new_password:
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        update_dict["password_hash"] = hash_password(new_password)
    if update_dict:
        await db.users.update_one({"user_id": user_id}, {"$set": update_dict})
        update_dict.pop("password_hash", None)
    
    await log_activity(
        current_user["user_id"],
        current_user["name"],
        f"Updated user {target_user['name']}",
        details=str(update_dict)
    )
    
    return {"message": "User updated successfully"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    """Remove a staff member.

    Open to anyone who can invite staff, not super admins alone -- HR does
    the hiring and the leaving, and having to find a super admin to complete
    a departure is how stale accounts survive.
    """
    current_user = await get_current_user(request)
    permissions.require(
        permissions.can_manage_users(current_user),
        "Only an administrator can remove staff",
    )

    if current_user["user_id"] == user_id:
        raise HTTPException(status_code=403, detail="Cannot delete yourself")

    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Mirrors the create rule: minting and removing a super admin are both
    # reserved, so a mini admin cannot delete the account above their own.
    if target_user.get("role") == "super_admin" and not permissions.is_super_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Only a super administrator can remove another super administrator",
        )

    # A unit whose head no longer exists is a unit nobody can open work
    # under, and nothing would say why. Clear the role and name the unit so
    # the administrator knows to appoint a replacement.
    orphaned = [
        u["slug"]
        async for u in db.units.find({"head_user_id": user_id}, {"_id": 0, "slug": 1})
    ]
    if orphaned:
        await db.units.update_many(
            {"head_user_id": user_id},
            {"$set": {"head_user_id": None, "head_name": None,
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )

    # Drop them from any project team, so a departed colleague does not linger
    # on the board as a collaborator.
    await db.projects.update_many(
        {"collaborator_ids": user_id},
        {"$pull": {"collaborator_ids": user_id, "collaborators": {"user_id": user_id}}},
    )

    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})

    await log_activity(
        current_user["user_id"],
        current_user["name"],
        f"Removed staff member {target_user['name']}",
        details=(f"Left {', '.join(orphaned)} without a head" if orphaned else ""),
    )

    return {
        "message": "Staff member removed",
        "units_left_without_a_head": orphaned,
    }

# ==================== LOGIN RECORDS ROUTES ====================

@api_router.get("/login-records")
async def get_login_records(
    request: Request, 
    limit: int = 50, 
    skip: int = 0, 
    user_id: str = None,
    success_only: bool = None
):
    """Get all login records (Super Admin only)"""
    current_user = await get_current_user(request)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view login records")
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    if success_only is not None:
        query["success"] = success_only
    
    records = await db.login_records.find(query, {"_id": 0}).sort("login_time", -1).skip(skip).limit(limit).to_list(limit)
    
    for record in records:
        if isinstance(record.get("login_time"), str):
            record["login_time"] = datetime.fromisoformat(record["login_time"])
    
    return records

@api_router.get("/login-records/count")
async def get_login_records_count(request: Request):
    """Get total login records count"""
    current_user = await get_current_user(request)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view login records")
    
    total = await db.login_records.count_documents({})
    successful = await db.login_records.count_documents({"success": True})
    failed = await db.login_records.count_documents({"success": False})
    
    return {"total": total, "successful": successful, "failed": failed}

@api_router.get("/login-records/user/{user_id}")
async def get_user_login_records(user_id: str, request: Request, limit: int = 20):
    """Get login records for a specific user"""
    current_user = await get_current_user(request)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view login records")
    
    records = await db.login_records.find({"user_id": user_id}, {"_id": 0}).sort("login_time", -1).limit(limit).to_list(limit)
    
    for record in records:
        if isinstance(record.get("login_time"), str):
            record["login_time"] = datetime.fromisoformat(record["login_time"])
    
    return records

@api_router.post("/users/{user_id}/lock-device")
async def lock_user_device(user_id: str, request: Request):
    """Enable device lock for a user and set their current device as allowed"""
    current_user = await get_current_user(request)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can manage device locks")
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get the user's most recent successful login to get their device fingerprint
    last_login = await db.login_records.find_one(
        {"user_id": user_id, "success": True},
        {"_id": 0},
        sort=[("login_time", -1)]
    )
    
    if not last_login:
        raise HTTPException(status_code=400, detail="No successful login found for this user")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "device_lock_enabled": True,
            "allowed_device_fingerprint": last_login["device_fingerprint"]
        }}
    )
    
    await log_activity(
        current_user["user_id"],
        current_user["name"],
        f"Enabled device lock for {target_user['name']}",
        details=f"Locked to device: {last_login['device_type']} - {last_login['browser']}"
    )
    
    return {
        "message": "Device lock enabled",
        "locked_device": {
            "device_type": last_login["device_type"],
            "browser": last_login["browser"],
            "device_os": last_login["device_os"]
        }
    }

@api_router.post("/users/{user_id}/unlock-device")
async def unlock_user_device(user_id: str, request: Request):
    """Disable device lock for a user"""
    current_user = await get_current_user(request)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can manage device locks")
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "device_lock_enabled": False,
            "allowed_device_fingerprint": None
        }}
    )
    
    await log_activity(
        current_user["user_id"],
        current_user["name"],
        f"Disabled device lock for {target_user['name']}"
    )
    
    return {"message": "Device lock disabled"}

@api_router.post("/users/{user_id}/update-device")
async def update_user_device(user_id: str, request: Request):
    """Update the allowed device for a user to their most recent login"""
    current_user = await get_current_user(request)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can manage device locks")
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get the user's most recent login (even if failed due to device lock)
    last_login = await db.login_records.find_one(
        {"user_id": user_id},
        {"_id": 0},
        sort=[("login_time", -1)]
    )
    
    if not last_login:
        raise HTTPException(status_code=400, detail="No login records found for this user")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "allowed_device_fingerprint": last_login["device_fingerprint"]
        }}
    )
    
    await log_activity(
        current_user["user_id"],
        current_user["name"],
        f"Updated allowed device for {target_user['name']}",
        details=f"New device: {last_login['device_type']} - {last_login['browser']}"
    )
    
    return {
        "message": "Allowed device updated",
        "new_device": {
            "device_type": last_login["device_type"],
            "browser": last_login["browser"],
            "device_os": last_login["device_os"]
        }
    }

# ==================== SOURCING REQUESTS ROUTES ====================

@api_router.post("/sourcing-requests")
async def create_sourcing_request(data: SourcingRequestCreate, request: Request):
    user = await get_current_user(request)
    
    if "talent" not in user.get("accessible_units", []) and user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="No access to Talent unit")
    
    request_id = f"src_{uuid.uuid4().hex[:12]}"
    doc = {
        "request_id": request_id,
        "user_id": user["user_id"],
        "job_title": data.job_title,
        "job_description": data.job_description,
        "company_name": data.company_name,
        "company_website": data.company_website,
        "company_location": data.company_location,
        "hiring_locations": data.hiring_locations,
        "salary_budget": data.salary_budget or "",
        "target_companies": data.target_companies or "",
        "companies_to_exclude": data.companies_to_exclude or "",
        "accept_n_minus_one": data.accept_n_minus_one,
        "industry_segments": data.industry_segments or "",
        "additional_notes": data.additional_notes or "",
        "assigned_recruiter": data.assigned_recruiter,
        "requester_email": user["email"],
        "status": "submitted",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sourcing_requests.insert_one(doc)
    
    # Send to webhook
    webhook_url = await get_webhook_url("sourcing_webhook_url")
    if webhook_url:
        webhook_payload = {
            "Requester Email": user["email"],
            "Job Title": data.job_title,
            "Job Description": data.job_description,
            "Company Name": data.company_name,
            "Company Website": data.company_website,
            "Company Location": data.company_location,
            "Hiring Locations": data.hiring_locations,
            "Salary Budget": data.salary_budget or "",
            "Target Companies to Hire From": data.target_companies or "",
            "Companies to Exclude": data.companies_to_exclude or "",
            "Accept N-Minus-One Candidates": data.accept_n_minus_one,
            "Industry Segments to Include or Exclude": data.industry_segments or "",
            "Additional Notes": data.additional_notes or "",
            "Assigned Recruiter": data.assigned_recruiter
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=webhook_payload, timeout=30)
                if response.status_code == 200:
                    await db.sourcing_requests.update_one(
                        {"request_id": request_id},
                        {"$set": {"status": "processing"}}
                    )
        except Exception as e:
            logger.error(f"Webhook call failed: {e}")
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Submitted sourcing request for '{data.job_title}'",
        unit_slug="talent",
        entity_type="sourcing_request",
        entity_id=request_id,
        details=f"Company: {data.company_name}"
    )
    
    return {"request_id": request_id, "status": "submitted", "message": "Sourcing request submitted successfully"}

@api_router.get("/sourcing-requests", response_model=List[SourcingRequestResponse])
async def get_sourcing_requests(request: Request):
    user = await get_current_user(request)
    
    query = {} if user["role"] in ["super_admin", "mini_admin"] else {"user_id": user["user_id"]}
    requests = await db.sourcing_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        if isinstance(req.get("created_at"), str):
            req["created_at"] = datetime.fromisoformat(req["created_at"])
    
    return requests

# ==================== DATABASE SEARCH ROUTES ====================

@api_router.post("/database-searches")
async def create_database_search(data: DatabaseSearchCreate, request: Request):
    user = await get_current_user(request)
    
    if "talent" not in user.get("accessible_units", []) and user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="No access to Talent unit")
    
    search_id = f"dbs_{uuid.uuid4().hex[:12]}"
    doc = {
        "search_id": search_id,
        "user_id": user["user_id"],
        "job_title": data.job_title,
        "job_description": data.job_description,
        "company_context": data.company_context or "",
        "seniority_level": data.seniority_level,
        "max_candidates": data.max_candidates,
        "status": "submitted",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.database_searches.insert_one(doc)
    
    # Send to webhook
    webhook_url = await get_webhook_url("database_search_webhook_url")
    if webhook_url:
        webhook_payload = {
            "Job Title": data.job_title,
            "Job Description": data.job_description,
            "Company / Hiring Context": data.company_context or "",
            "Seniority Level": data.seniority_level,
            "Max Candidates to Evaluate": data.max_candidates
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=webhook_payload, timeout=30)
                if response.status_code == 200:
                    await db.database_searches.update_one(
                        {"search_id": search_id},
                        {"$set": {"status": "processing"}}
                    )
        except Exception as e:
            logger.error(f"Webhook call failed: {e}")
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Submitted database search for '{data.job_title}'",
        unit_slug="talent",
        entity_type="database_search",
        entity_id=search_id,
        details=f"Seniority: {data.seniority_level}"
    )
    
    return {"search_id": search_id, "status": "submitted", "message": "Database search initiated successfully"}

@api_router.get("/database-searches", response_model=List[DatabaseSearchResponse])
async def get_database_searches(request: Request):
    user = await get_current_user(request)
    
    query = {} if user["role"] in ["super_admin", "mini_admin"] else {"user_id": user["user_id"]}
    searches = await db.database_searches.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for search in searches:
        if isinstance(search.get("created_at"), str):
            search["created_at"] = datetime.fromisoformat(search["created_at"])
    
    return searches

# ==================== SETTINGS ROUTES ====================

@api_router.get("/settings/webhooks")
async def get_webhooks(request: Request):
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can access settings")
    
    settings = await db.app_settings.find_one({"setting_type": "webhooks"}, {"_id": 0})
    return settings or {"setting_type": "webhooks", "sourcing_webhook_url": "", "database_search_webhook_url": ""}

@api_router.put("/settings/webhooks")
async def update_webhooks(config: WebhookConfig, request: Request):
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can access settings")
    
    await db.app_settings.update_one(
        {"setting_type": "webhooks"},
        {"$set": {
            "setting_type": "webhooks",
            "sourcing_webhook_url": config.sourcing_webhook_url or "",
            "database_search_webhook_url": config.database_search_webhook_url or ""
        }},
        upsert=True
    )
    
    await log_activity(user["user_id"], user["name"], "Updated webhook settings")
    
    return {"message": "Webhooks updated successfully"}

@api_router.post("/settings/webhooks/test")
async def test_webhook(request: Request, webhook_type: str, url: str):
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can test webhooks")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"test": True, "source": "THCO Portal"}, timeout=10)
            return {"success": response.status_code in [200, 201, 202], "status_code": response.status_code}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ==================== ACTIVITY LOG ROUTES ====================

@api_router.get("/activity-logs")
async def get_activity_logs(request: Request, limit: int = 50, skip: int = 0, user_filter: str = None, unit_filter: str = None):
    user = await get_current_user(request)
    
    query = {}
    if user["role"] == "team_member":
        query["user_id"] = user["user_id"]
    elif user_filter:
        query["user_id"] = user_filter
    
    if unit_filter:
        query["unit_slug"] = unit_filter
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for log in logs:
        if isinstance(log.get("created_at"), str):
            log["created_at"] = datetime.fromisoformat(log["created_at"])
    
    return logs

@api_router.get("/activity-logs/count")
async def get_activity_count(request: Request):
    user = await get_current_user(request)
    query = {} if user["role"] != "team_member" else {"user_id": user["user_id"]}
    count = await db.activity_logs.count_documents(query)
    return {"count": count}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    
    # Count accessible tools
    accessible_units = user.get("accessible_units", [])
    if user["role"] == "super_admin":
        accessible_units = ["talent", "thco-hr", "flow", "it-tools", "sales", "marketing", "advisory", "technology", "operations", "academy", "client-delivery"]
    
    # Currently only talent has active tools (2 tools)
    total_tools = 2 if "talent" in accessible_units else 0
    
    # Pending requests count
    pending_query = {"status": {"$in": ["submitted", "processing"]}}
    if user["role"] == "team_member":
        pending_query["user_id"] = user["user_id"]
    
    pending_sourcing = await db.sourcing_requests.count_documents(pending_query)
    pending_searches = await db.database_searches.count_documents(pending_query)
    
    # Recent activity count
    activity_query = {} if user["role"] != "team_member" else {"user_id": user["user_id"]}
    recent_activity = await db.activity_logs.count_documents(activity_query)
    
    return {
        "total_tools": total_tools,
        "pending_requests": pending_sourcing + pending_searches,
        "recent_activity": recent_activity
    }

# ==================== SEED INITIAL ADMIN ====================

@app.on_event("startup")
async def seed_initial_admin():
    """Seed the initial super admin on an empty database.

    Credentials come from the environment. They were previously hardcoded, so
    anyone with repository access knew the administrator's password on every
    deployment. A random password is generated when none is supplied, and
    logged once at startup so the first sign-in can use it -- the operator is
    expected to change it immediately.
    """
    user_count = await db.users.count_documents({})
    if user_count != 0:
        return

    email = os.environ.get("SEED_ADMIN_EMAIL", "admin@thcohq.com")
    name = os.environ.get("SEED_ADMIN_NAME", "Administrator")
    password = os.environ.get("SEED_ADMIN_PASSWORD")
    generated = False
    if not password:
        password = f"thco-{uuid.uuid4().hex[:16]}"
        generated = True

    all_units = ["talent", "thco-hr", "flow", "it-tools", "sales", "marketing", "advisory", "technology", "operations", "academy", "client-delivery"]
    admin_doc = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "email": email,
        "password_hash": hash_password(password),
        "name": name,
        "role": "super_admin",
        "accessible_units": all_units,
        "status": "active",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)

    if generated:
        logger.warning(
            "Seeded initial super admin %s with a generated password: %s "
            "-- change it after first sign-in.", email, password
        )
    else:
        logger.info("Seeded initial super admin: %s", email)

# ==================== PROPOSAL MANAGEMENT ROUTES ====================

def get_share_url(share_token: str) -> str:
    """Generate a share URL for a proposal.
    Hard-coded to the canonical production domain (thcoteam.com) so that links
    generated from any environment always send recipients to production.
    """
    return f"https://thcoteam.com/proposals/view/{share_token}"


@api_router.get("/clients")
async def get_clients(request: Request):
    """Get all clients with their proposal counts"""
    user = await get_current_user(request)
    # Client records carry commercial terms and named contacts. Previously any
    # authenticated account could list every client.
    permissions.require(
        permissions.can_view_clients(user),
        "Client records require a commercial or delivery unit",
    )

    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    
    # Get proposal counts for each client
    for client in clients:
        count = await db.proposals.count_documents({"client_id": client["client_id"]})
        client["proposal_count"] = count
        if isinstance(client.get("created_at"), str):
            client["created_at"] = datetime.fromisoformat(client["created_at"])
    
    return clients

@api_router.post("/clients")
async def create_client(data: ClientCreate, request: Request):
    """Create a new client folder"""
    user = await get_current_user(request)
    
    # Check if client name already exists
    existing = await db.clients.find_one({"name": {"$regex": f"^{data.name}$", "$options": "i"}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="A client with this name already exists")
    
    client_id = f"client_{uuid.uuid4().hex[:12]}"
    client_doc = {
        "client_id": client_id,
        "name": data.name,
        "description": data.description or "",
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clients.insert_one(client_doc)
    
    # Create client folder on disk
    client_folder = UPLOADS_DIR / client_id
    client_folder.mkdir(parents=True, exist_ok=True)
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Created client folder '{data.name}'",
        entity_type="client",
        entity_id=client_id
    )
    
    return {
        "client_id": client_id,
        "name": data.name,
        "description": data.description or "",
        "proposal_count": 0,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientCreate, request: Request):
    """Update a client's details"""
    user = await get_current_user(request)
    
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    await db.clients.update_one(
        {"client_id": client_id},
        {"$set": {"name": data.name, "description": data.description or ""}}
    )
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Updated client '{data.name}'",
        entity_type="client",
        entity_id=client_id
    )
    
    return {"message": "Client updated successfully"}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    """Delete a client and all their proposals"""
    user = await get_current_user(request)
    
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can delete clients")
    
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Delete all proposals for this client
    await db.proposals.delete_many({"client_id": client_id})
    
    # Delete client folder from disk
    client_folder = UPLOADS_DIR / client_id
    if client_folder.exists():
        shutil.rmtree(client_folder)
    
    # Delete client record
    await db.clients.delete_one({"client_id": client_id})
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Deleted client '{client['name']}' and all proposals",
        entity_type="client",
        entity_id=client_id
    )
    
    return {"message": "Client and all proposals deleted successfully"}

@api_router.get("/clients/{client_id}/proposals")
async def get_client_proposals(client_id: str, request: Request):
    """Get all proposals for a specific client"""
    user = await get_current_user(request)
    
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    proposals = await db.proposals.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for proposal in proposals:
        proposal["share_url"] = get_share_url(proposal["share_token"])
        if isinstance(proposal.get("created_at"), str):
            proposal["created_at"] = datetime.fromisoformat(proposal["created_at"])
    
    return proposals

@api_router.post("/clients/{client_id}/proposals")
async def upload_proposal(
    client_id: str,
    request: Request,
    file: UploadFile = File(...)
):
    """Upload a proposal file to a client's folder"""
    user = await get_current_user(request)
    
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = [".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx"]
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    proposal_id = f"prop_{uuid.uuid4().hex[:12]}"
    share_token = secrets.token_urlsafe(32)
    filename = f"{proposal_id}{file_ext}"
    
    # Create client folder if it doesn't exist
    client_folder = UPLOADS_DIR / client_id
    client_folder.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = client_folder / filename
    content = await file.read()
    file_size = len(content)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Determine file type label
    file_type_map = {
        ".pdf": "PDF",
        ".ppt": "PowerPoint",
        ".pptx": "PowerPoint",
        ".doc": "Word",
        ".docx": "Word",
        ".xls": "Excel",
        ".xlsx": "Excel"
    }
    file_type = file_type_map.get(file_ext, "Document")
    
    # Save to database
    proposal_doc = {
        "proposal_id": proposal_id,
        "client_id": client_id,
        "client_name": client["name"],
        "filename": filename,
        "original_filename": file.filename,
        "file_type": file_type,
        "file_size": file_size,
        "file_path": str(file_path),
        "share_token": share_token,
        "uploaded_by": user["user_id"],
        "uploaded_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.proposals.insert_one(proposal_doc)
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Uploaded proposal '{file.filename}' for {client['name']}",
        entity_type="proposal",
        entity_id=proposal_id
    )
    
    return {
        "proposal_id": proposal_id,
        "client_id": client_id,
        "client_name": client["name"],
        "filename": filename,
        "original_filename": file.filename,
        "file_type": file_type,
        "file_size": file_size,
        "share_token": share_token,
        "share_url": get_share_url(share_token),
        "uploaded_by": user["user_id"],
        "uploaded_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/proposals")
async def get_all_proposals(request: Request, limit: int = 50, skip: int = 0):
    """Get all proposals across all clients"""
    user = await get_current_user(request)
    # Proposals carry commercial terms and client pricing. Previously any
    # authenticated account could list every one of them.
    permissions.require(
        permissions.can_view_clients(user),
        "Proposals require a commercial or delivery role",
    )

    proposals = await db.proposals.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for proposal in proposals:
        proposal["share_url"] = get_share_url(proposal["share_token"])
        if isinstance(proposal.get("created_at"), str):
            proposal["created_at"] = datetime.fromisoformat(proposal["created_at"])
    
    return proposals

@api_router.delete("/proposals/{proposal_id}")
async def delete_proposal(proposal_id: str, request: Request):
    """Delete a proposal"""
    user = await get_current_user(request)
    
    proposal = await db.proposals.find_one({"proposal_id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Delete file from disk
    file_path = Path(proposal.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.proposals.delete_one({"proposal_id": proposal_id})
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Deleted proposal '{proposal['original_filename']}'",
        entity_type="proposal",
        entity_id=proposal_id
    )
    
    return {"message": "Proposal deleted successfully"}

@api_router.post("/proposals/{proposal_id}/regenerate-link")
async def regenerate_share_link(proposal_id: str, request: Request):
    """Regenerate the share link for a proposal"""
    user = await get_current_user(request)
    
    proposal = await db.proposals.find_one({"proposal_id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    new_token = secrets.token_urlsafe(32)
    
    await db.proposals.update_one(
        {"proposal_id": proposal_id},
        {"$set": {"share_token": new_token}}
    )
    
    await log_activity(
        user["user_id"],
        user["name"],
        f"Regenerated share link for '{proposal['original_filename']}'",
        entity_type="proposal",
        entity_id=proposal_id
    )
    
    return {
        "share_token": new_token,
        "share_url": get_share_url(new_token)
    }

# Public endpoint - no auth required
@api_router.get("/proposals/shared/{share_token}")
async def get_shared_proposal(share_token: str, request: Request):
    """Get proposal details by share token (public endpoint)"""
    proposal = await db.proposals.find_one({"share_token": share_token}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found or link has expired")

    # Check if a logged-in internal user is viewing (bypass email gate)
    is_internal = False
    try:
        await get_current_user(request)
        is_internal = True
    except HTTPException:
        is_internal = False

    return {
        "proposal_id": proposal["proposal_id"],
        "client_name": proposal["client_name"],
        "filename": proposal["original_filename"],
        "file_type": proposal["file_type"],
        "file_size": proposal["file_size"],
        "uploaded_at": proposal["created_at"],
        "require_email": bool(proposal.get("require_email")) and not is_internal,
        "is_internal_viewer": is_internal,
    }


# Public endpoint — register a viewer's email for a share-token-protected proposal
class ShareTokenViewerRegister(BaseModel):
    email: str
    name: Optional[str] = None
    company: Optional[str] = None


@api_router.post("/proposals/shared/{share_token}/register")
async def register_share_token_viewer(share_token: str, data: ShareTokenViewerRegister, request: Request):
    """Public — register a viewer email before they can download an email-gated proposal."""
    proposal = await db.proposals.find_one({"share_token": share_token}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found or link has expired")

    email = (data.email or "").strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    # Metadata for tracking
    ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if "," in ip_address:
        ip_address = ip_address.split(",")[0].strip()
    user_agent_str = request.headers.get("User-Agent", "")
    ua = parse_user_agent(user_agent_str)
    device_type = "Mobile" if ua.is_mobile else "Tablet" if ua.is_tablet else "Desktop"
    browser = f"{ua.browser.family} {ua.browser.version_string}"
    now = datetime.now(timezone.utc)

    # Try to enrich location
    location = None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"http://ip-api.com/json/{ip_address}?fields=city,country", timeout=3)
            if resp.status_code == 200:
                loc_data = resp.json()
                if loc_data.get("city") and loc_data.get("country"):
                    location = f"{loc_data['city']}, {loc_data['country']}"
    except Exception:
        pass

    existing = await db.proposal_viewers.find_one(
        {"email": email, "share_token": share_token},
        {"_id": 0}
    )
    if existing:
        await db.proposal_viewers.update_one(
            {"email": email, "share_token": share_token},
            {"$set": {
                "last_viewed_at": now,
                "ip_address": ip_address,
                "device_type": device_type,
                "browser": browser,
                "location": location,
            }, "$inc": {"view_count": 1}}
        )
    else:
        await db.proposal_viewers.insert_one({
            "viewer_id": f"viewer_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": data.name or "",
            "company": data.company or "",
            "share_token": share_token,
            "proposal_id": proposal["proposal_id"],
            "proposal_slug": share_token,  # use share_token as slug for indexing
            "proposal_name": proposal.get("original_filename") or "Proposal",
            "first_viewed_at": now,
            "last_viewed_at": now,
            "view_count": 1,
            "ip_address": ip_address,
            "device_type": device_type,
            "browser": browser,
            "location": location,
        })

    return {"ok": True, "email": email}


@api_router.get("/proposals/shared/{share_token}/stream")
async def stream_shared_proposal(share_token: str, request: Request):
    """Stream a proposal inline (Content-Disposition: inline) — for embedded viewing.
    If require_email is set, an authenticated session OR a registered ?email= is required.
    """
    proposal = await db.proposals.find_one({"share_token": share_token}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found or link has expired")

    if proposal.get("require_email"):
        # Allow logged-in internal users to bypass the email gate
        try:
            await get_current_user(request)
            authenticated = True
        except HTTPException:
            authenticated = False
        if not authenticated:
            email = request.query_params.get("email")
            if not email:
                raise HTTPException(status_code=403, detail="Email registration required")
            registered = await db.proposal_viewers.find_one({
                "email": email.strip().lower(),
                "share_token": share_token,
            }, {"_id": 0, "viewer_id": 1})
            if not registered:
                raise HTTPException(status_code=403, detail="Email not registered for this proposal")

    file_path = Path(proposal.get("file_path", ""))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=str(file_path),
        media_type=proposal.get("mime_type") or "application/pdf",
        headers={"Content-Disposition": f'inline; filename="{proposal["original_filename"]}"'},
    )


# Public endpoint - no auth required
@api_router.get("/proposals/shared/{share_token}/download")
async def download_shared_proposal(share_token: str, email: Optional[str] = None):
    """Download a proposal file by share token (public endpoint).
    If the proposal has require_email=true, a registered email must be passed as ?email=.
    """
    proposal = await db.proposals.find_one({"share_token": share_token}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found or link has expired")

    # Enforce email gate
    if proposal.get("require_email"):
        if not email:
            raise HTTPException(status_code=403, detail="Email registration required to download this proposal")
        email_l = email.strip().lower()
        registered = await db.proposal_viewers.find_one({
            "email": email_l,
            "share_token": share_token,
        }, {"_id": 0, "viewer_id": 1})
        if not registered:
            raise HTTPException(status_code=403, detail="Email not registered for this proposal")
    
    file_path = Path(proposal.get("file_path", ""))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
    
    # Determine content type
    content_types = {
        ".pdf": "application/pdf",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    
    file_ext = file_path.suffix.lower()
    content_type = content_types.get(file_ext, "application/octet-stream")
    
    return FileResponse(
        path=str(file_path),
        filename=proposal["original_filename"],
        media_type=content_type
    )

# ==================== PROPOSAL VIEWER TRACKING ROUTES ====================

# Mapping of proposal slugs to display names
PROPOSAL_NAMES = {
    "procure-ai": "Procure AI - Process Flowcharts",
    "procure-ai-scroll": "Procure AI - Scroll Version",
    "procure-ai-executive": "Executive Kick-Off Pack",
    "procure-ai-executive-v3": "Executive Pack V3",
    "procure-ai-v1": "Procure AI V1",
    "sagicor-progress": "Sagicor Progress Dashboard",
    "ai-banking": "AI for Banking - From Monitoring to Intelligence",
    "pebbles-brand": "Pebbles - Brand Identity & Vision",
    "procure-ai-ey": "Procure AI - PMO/TQA Alignment Session",
    "procure-ai-team": "Procure AI - Meet the Team",
    "gdl-pebbles": "GDL x Pebbles - Strategic Assessment & Partnership Proposal",
    "ingabo": "INGABO - Rise of the Thousand Hills",
    "the-forge": "THE FORGE - Fire and Memory",
    "the-forge-v2": "THE FORGE V2 - Fire and Memory",
    "tide-war": "TIDE WAR - Current Shift",
    "sagicor-stec": "Sagicor STEC - Technology Capability Assessment",
    "realloc": "Realloc AI Capability Program",
    "procureai-team": "Procure AI Delivery Team",
    "afc-treasury": "AFC Cross-Border Treasury System",
    "winston-duke": "Winston Duke Brand Identity",
}

@api_router.post("/proposals/viewers/register")
async def register_proposal_viewer(data: ProposalViewerRegister, request: Request):
    """Register a viewer's email before they can view a proposal (public endpoint)"""
    
    # Get request metadata
    ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if "," in ip_address:
        ip_address = ip_address.split(",")[0].strip()
    
    user_agent_str = request.headers.get("User-Agent", "")
    ua = parse_user_agent(user_agent_str)
    device_type = "Mobile" if ua.is_mobile else "Tablet" if ua.is_tablet else "Desktop"
    browser = f"{ua.browser.family} {ua.browser.version_string}"
    
    # Get location from IP
    location = None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"http://ip-api.com/json/{ip_address}?fields=city,country", timeout=3)
            if resp.status_code == 200:
                loc_data = resp.json()
                if loc_data.get("city") and loc_data.get("country"):
                    location = f"{loc_data['city']}, {loc_data['country']}"
    except:
        pass
    
    proposal_name = PROPOSAL_NAMES.get(data.proposal_slug, data.proposal_slug)
    now = datetime.now(timezone.utc)
    
    # Check if viewer already exists for this proposal
    existing = await db.proposal_viewers.find_one({
        "email": data.email.lower(),
        "proposal_slug": data.proposal_slug
    }, {"_id": 0})
    
    if existing:
        # Update existing record
        await db.proposal_viewers.update_one(
            {"email": data.email.lower(), "proposal_slug": data.proposal_slug},
            {
                "$set": {
                    "last_viewed_at": now,
                    "ip_address": ip_address,
                    "device_type": device_type,
                    "browser": browser,
                    "location": location,
                    "name": data.name or existing.get("name", ""),
                    "company": data.company or existing.get("company", ""),
                },
                "$inc": {"view_count": 1}
            }
        )
        viewer_id = existing["viewer_id"]
    else:
        # Create new viewer record
        viewer_id = f"viewer_{uuid.uuid4().hex[:12]}"
        await db.proposal_viewers.insert_one({
            "viewer_id": viewer_id,
            "email": data.email.lower(),
            "name": data.name or "",
            "company": data.company or "",
            "proposal_slug": data.proposal_slug,
            "proposal_name": proposal_name,
            "first_viewed_at": now,
            "last_viewed_at": now,
            "view_count": 1,
            "total_time_spent": 0,
            "ip_address": ip_address,
            "location": location,
            "device_type": device_type,
            "browser": browser,
        })
    
    return {
        "success": True,
        "viewer_id": viewer_id,
        "message": "Access granted"
    }

@api_router.post("/proposals/viewers/activity")
async def update_viewer_activity(data: ProposalViewerActivity):
    """Update viewer's time spent on proposal (public endpoint)"""
    
    result = await db.proposal_viewers.update_one(
        {"email": data.email.lower(), "proposal_slug": data.proposal_slug},
        {
            "$inc": {"total_time_spent": data.time_spent},
            "$set": {"last_viewed_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"success": result.modified_count > 0}

@api_router.get("/proposals/viewers/check/{proposal_slug}/{email}")
async def check_viewer_access(proposal_slug: str, email: str):
    """Check if a viewer has already registered for a proposal (public endpoint)"""
    
    existing = await db.proposal_viewers.find_one({
        "email": email.lower(),
        "proposal_slug": proposal_slug
    }, {"_id": 0})
    
    if existing:
        return {
            "has_access": True,
            "viewer_id": existing["viewer_id"],
            "name": existing.get("name", ""),
            "company": existing.get("company", "")
        }
    
    return {"has_access": False}

@api_router.get("/proposals/viewers", response_model=List[ProposalViewerResponse])
async def get_all_proposal_viewers(
    proposal_slug: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all proposal viewers (admin only)"""
    if current_user["role"] not in ["super_admin", "mini_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if proposal_slug:
        query["proposal_slug"] = proposal_slug
    
    viewers = await db.proposal_viewers.find(query, {"_id": 0}).sort("last_viewed_at", -1).to_list(500)
    return viewers

@api_router.get("/proposals/viewers/stats")
async def get_proposal_viewer_stats(current_user: dict = Depends(get_current_user)):
    """Get proposal viewer statistics (admin only)"""
    if current_user["role"] not in ["super_admin", "mini_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Total unique viewers
    total_viewers = await db.proposal_viewers.count_documents({})
    
    # Total views
    pipeline = [{"$group": {"_id": None, "total_views": {"$sum": "$view_count"}}}]
    total_views_result = await db.proposal_viewers.aggregate(pipeline).to_list(1)
    total_views = total_views_result[0]["total_views"] if total_views_result else 0
    
    # Views by proposal
    pipeline = [
        {"$group": {
            "_id": "$proposal_slug",
            "proposal_name": {"$first": "$proposal_name"},
            "unique_viewers": {"$sum": 1},
            "total_views": {"$sum": "$view_count"},
            "total_time_spent": {"$sum": "$total_time_spent"}
        }},
        {"$sort": {"total_views": -1}}
    ]
    views_by_proposal = await db.proposal_viewers.aggregate(pipeline).to_list(20)
    
    # Recent viewers (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_viewers = await db.proposal_viewers.count_documents({"last_viewed_at": {"$gte": week_ago}})
    
    # Today's viewers
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_viewers = await db.proposal_viewers.count_documents({"last_viewed_at": {"$gte": today_start}})
    
    return {
        "total_unique_viewers": total_viewers,
        "total_views": total_views,
        "views_by_proposal": views_by_proposal,
        "viewers_this_week": recent_viewers,
        "viewers_today": today_viewers
    }

# ==================== ANALYTICS & USER TRACKING ROUTES ====================

@api_router.post("/analytics/page-view")
async def track_page_view_endpoint(data: PageViewCreate, request: Request):
    """Track a page view"""
    try:
        user = await get_current_user(request)
        session_token = request.cookies.get("session_token")
        
        await track_page_view(
            user["user_id"],
            user["name"],
            session_token or "unknown",
            data.page_path,
            data.page_title,
            data.referrer,
            request
        )
        return {"status": "tracked"}
    except:
        return {"status": "skipped"}

@api_router.post("/analytics/action")
async def track_action_endpoint(data: UserActionCreate, request: Request):
    """Track a user action"""
    try:
        user = await get_current_user(request)
        session_token = request.cookies.get("session_token")
        
        await track_user_action(
            user["user_id"],
            user["name"],
            session_token or "unknown",
            data.action_type,
            data.action_target,
            data.action_details or {},
            data.page_path
        )
        return {"status": "tracked"}
    except:
        return {"status": "skipped"}

@api_router.post("/analytics/heartbeat")
async def session_heartbeat_endpoint(data: SessionHeartbeat, request: Request):
    """Update session activity (called periodically from frontend)"""
    try:
        user = await get_current_user(request)
        await update_session_activity(data.session_id, data.page_path, data.time_on_page)
        return {"status": "updated"}
    except:
        return {"status": "skipped"}

@api_router.post("/analytics/session/start")
async def start_session_endpoint(request: Request):
    """Start a new analytics session"""
    try:
        user = await get_current_user(request)
        session_id = await start_analytics_session(user["user_id"], user["name"], request)
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/analytics/session/end")
async def end_session_endpoint(request: Request):
    """End an analytics session"""
    try:
        session_token = request.cookies.get("session_token")
        if session_token:
            await db.analytics_sessions.update_one(
                {"session_id": session_token},
                {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()}}
            )
        return {"status": "ended"}
    except:
        return {"status": "skipped"}

@api_router.get("/analytics/summary")
async def get_analytics_summary(request: Request, days: int = 30):
    """Get comprehensive analytics summary (Admin only)"""
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Active users today
    active_today = await db.analytics_sessions.distinct(
        "user_id",
        {"started_at": {"$gte": today_start.isoformat()}}
    )
    
    # Active users this week
    active_week = await db.analytics_sessions.distinct(
        "user_id",
        {"started_at": {"$gte": week_start.isoformat()}}
    )
    
    # Total sessions in period
    total_sessions = await db.analytics_sessions.count_documents(
        {"started_at": {"$gte": start_date.isoformat()}}
    )
    
    # Average session duration
    pipeline = [
        {"$match": {"started_at": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": None, "avg_duration": {"$avg": "$total_time_seconds"}}}
    ]
    avg_result = await db.analytics_sessions.aggregate(pipeline).to_list(1)
    avg_session_duration = avg_result[0]["avg_duration"] if avg_result else 0
    
    # Total page views
    total_page_views = await db.page_views.count_documents(
        {"timestamp": {"$gte": start_date.isoformat()}}
    )
    
    # Most visited pages
    page_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$page_path", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    most_visited = await db.page_views.aggregate(page_pipeline).to_list(10)
    
    # User actions summary
    actions_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$action_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    actions_result = await db.user_actions.aggregate(actions_pipeline).to_list(20)
    actions_summary = {item["_id"]: item["count"] for item in actions_result}
    
    # Device breakdown
    device_pipeline = [
        {"$match": {"started_at": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$device_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    device_result = await db.analytics_sessions.aggregate(device_pipeline).to_list(10)
    device_breakdown = {item["_id"]: item["count"] for item in device_result}
    
    # Browser breakdown
    browser_pipeline = [
        {"$match": {"started_at": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$browser", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    browser_result = await db.analytics_sessions.aggregate(browser_pipeline).to_list(10)
    browser_breakdown = {item["_id"]: item["count"] for item in browser_result}
    
    return {
        "total_users": total_users,
        "active_users_today": len(active_today),
        "active_users_week": len(active_week),
        "total_sessions": total_sessions,
        "avg_session_duration": round(avg_session_duration or 0, 1),
        "total_page_views": total_page_views,
        "most_visited_pages": [{"page": item["_id"], "views": item["count"]} for item in most_visited],
        "user_actions_summary": actions_summary,
        "device_breakdown": device_breakdown,
        "browser_breakdown": browser_breakdown,
        "period_days": days
    }

@api_router.get("/analytics/users")
async def get_user_analytics(request: Request, days: int = 30, limit: int = 50):
    """Get detailed user analytics (Admin only)"""
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get all users with their analytics
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    user_analytics = []
    for u in users:
        user_id = u["user_id"]
        
        # Get session stats
        sessions = await db.analytics_sessions.find(
            {"user_id": user_id, "started_at": {"$gte": start_date.isoformat()}}
        ).to_list(1000)
        
        total_sessions = len(sessions)
        total_time = sum(s.get("total_time_seconds", 0) for s in sessions)
        total_pages = sum(s.get("page_count", 0) for s in sessions)
        
        # Get last activity
        last_session = await db.analytics_sessions.find_one(
            {"user_id": user_id},
            sort=[("started_at", -1)]
        )
        
        # Get action count
        action_count = await db.user_actions.count_documents(
            {"user_id": user_id, "timestamp": {"$gte": start_date.isoformat()}}
        )
        
        # Get page view count
        page_view_count = await db.page_views.count_documents(
            {"user_id": user_id, "timestamp": {"$gte": start_date.isoformat()}}
        )
        
        # Most visited pages by this user
        user_pages_pipeline = [
            {"$match": {"user_id": user_id, "timestamp": {"$gte": start_date.isoformat()}}},
            {"$group": {"_id": "$page_path", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_pages = await db.page_views.aggregate(user_pages_pipeline).to_list(5)
        
        user_analytics.append({
            "user_id": user_id,
            "name": u.get("name", "Unknown"),
            "email": u.get("email", ""),
            "role": u.get("role", "team_member"),
            "status": u.get("status", "active"),
            "total_sessions": total_sessions,
            "total_time_minutes": round(total_time / 60, 1),
            "total_pages_viewed": total_pages,
            "total_actions": action_count,
            "avg_session_minutes": round((total_time / total_sessions / 60) if total_sessions > 0 else 0, 1),
            "last_active": last_session.get("last_activity") if last_session else None,
            "last_device": last_session.get("device_type") if last_session else None,
            "last_browser": last_session.get("browser") if last_session else None,
            "top_pages": [{"page": p["_id"], "views": p["count"]} for p in top_pages],
            "created_at": u.get("created_at")
        })
    
    # Sort by total time descending
    user_analytics.sort(key=lambda x: x["total_time_minutes"], reverse=True)
    
    return user_analytics[:limit]

@api_router.get("/analytics/sessions")
async def get_session_history(request: Request, days: int = 7, limit: int = 100):
    """Get session history (Admin only)"""
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    sessions = await db.analytics_sessions.find(
        {"started_at": {"$gte": start_date.isoformat()}},
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    
    return sessions

@api_router.get("/analytics/page-views")
async def get_page_view_analytics(request: Request, days: int = 7):
    """Get page view analytics (Admin only)"""
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Page views over time (by day)
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "date": {"$substr": ["$timestamp", 0, 10]}
        }},
        {"$group": {"_id": "$date", "views": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_views = await db.page_views.aggregate(pipeline).to_list(days)
    
    # Page views by hour
    hourly_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "hour": {"$substr": ["$timestamp", 11, 2]}
        }},
        {"$group": {"_id": "$hour", "views": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    hourly_views = await db.page_views.aggregate(hourly_pipeline).to_list(24)
    
    return {
        "daily_views": [{"date": d["_id"], "views": d["views"]} for d in daily_views],
        "hourly_views": [{"hour": h["_id"], "views": h["views"]} for h in hourly_views]
    }

@api_router.get("/analytics/actions")
async def get_action_analytics(request: Request, days: int = 7, limit: int = 100):
    """Get user action analytics (Admin only)"""
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Recent actions
    recent_actions = await db.user_actions.find(
        {"timestamp": {"$gte": start_date.isoformat()}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Actions by type
    type_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$action_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    actions_by_type = await db.user_actions.aggregate(type_pipeline).to_list(20)
    
    # Actions by target (most clicked buttons, etc.)
    target_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$action_target", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    actions_by_target = await db.user_actions.aggregate(target_pipeline).to_list(20)
    
    return {
        "recent_actions": recent_actions,
        "actions_by_type": [{"type": a["_id"], "count": a["count"]} for a in actions_by_type],
        "actions_by_target": [{"target": a["_id"], "count": a["count"]} for a in actions_by_target]
    }

@api_router.get("/analytics/user/{user_id}")
async def get_single_user_analytics(user_id: str, request: Request, days: int = 30):
    """Get detailed analytics for a single user (Admin only)"""
    current_user = await get_current_user(request)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get user info
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get all sessions
    sessions = await db.analytics_sessions.find(
        {"user_id": user_id, "started_at": {"$gte": start_date.isoformat()}},
        {"_id": 0}
    ).sort("started_at", -1).to_list(100)
    
    # Get all page views
    page_views = await db.page_views.find(
        {"user_id": user_id, "timestamp": {"$gte": start_date.isoformat()}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(500)
    
    # Get all actions
    actions = await db.user_actions.find(
        {"user_id": user_id, "timestamp": {"$gte": start_date.isoformat()}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(500)
    
    # Page visit breakdown
    page_pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$page_path", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    page_breakdown = await db.page_views.aggregate(page_pipeline).to_list(20)
    
    # Action breakdown
    action_pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$action_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    action_breakdown = await db.user_actions.aggregate(action_pipeline).to_list(20)
    
    # Calculate totals
    total_time = sum(s.get("total_time_seconds", 0) for s in sessions)
    
    return {
        "user": user,
        "summary": {
            "total_sessions": len(sessions),
            "total_time_minutes": round(total_time / 60, 1),
            "total_page_views": len(page_views),
            "total_actions": len(actions),
            "avg_session_minutes": round((total_time / len(sessions) / 60) if sessions else 0, 1)
        },
        "sessions": sessions[:20],
        "recent_page_views": page_views[:50],
        "recent_actions": actions[:50],
        "page_breakdown": [{"page": p["_id"], "count": p["count"]} for p in page_breakdown],
        "action_breakdown": [{"action": a["_id"], "count": a["count"]} for a in action_breakdown]
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@api_router.post("/internal/run-scheduled-job", include_in_schema=False)
async def run_scheduled_job(request: Request, job: str):
    """Run a scheduled job on demand, for an external scheduler to call.

    The in-process APScheduler only fires while a container is running, and
    Container Apps scales to zero when idle -- so an overnight sweep could be
    skipped entirely because nothing was awake at 06:00. An external trigger
    both wakes the app and runs the job.

    Authenticated with a shared secret rather than a user session, since the
    caller is a machine. Returns 404 rather than 401 when unconfigured or the
    token is wrong, so the endpoint does not advertise itself.
    """
    expected = os.environ.get("SCHEDULER_TOKEN", "")
    presented = request.headers.get("X-Scheduler-Token", "")
    if not expected or presented != expected:
        raise HTTPException(status_code=404, detail="Not Found")

    jobs = {}
    try:
        from services.relationship_reminders import relationship_reminder_sweep
        jobs["relationship-reminders"] = relationship_reminder_sweep
    except Exception as e:
        logger.warning(f"Scheduled job unavailable: {e}")

    async def _mailbox_import():
        """Pull newly arrived CVs from the configured mailbox.

        Bounded per run: the connector resumes from a stored cursor, so a
        limit only affects how much of a backlog is cleared in one go, never
        whether a message is eventually seen. Kept modest so a scheduled run
        finishes promptly rather than holding a container awake for hours.
        """
        from services.connectors.gmail import GmailConnector
        from services.connectors.imap_mailbox import ImapMailboxConnector
        from services.connectors.runner import run_connector

        api = GmailConnector()
        connector = api if (api.is_configured() and api.check_access().get("ok")) \
            else ImapMailboxConnector()

        if not connector.is_configured():
            logger.info("Mailbox import skipped: no mailbox configured")
            return

        access = connector.check_access()
        if not access.get("ok"):
            logger.warning("Mailbox import skipped: %s", access.get("reason"))
            return

        limit = int(os.environ.get("MAILBOX_IMPORT_LIMIT", "100"))
        await run_connector(db, connector, limit=limit)

    try:
        jobs["mailbox-import"] = _mailbox_import
    except Exception as e:
        logger.warning(f"Mailbox import job unavailable: {e}")

    runner = jobs.get(job)
    if runner is None:
        raise HTTPException(status_code=400, detail=f"Unknown job '{job}'")

    started = datetime.now(timezone.utc)
    try:
        await runner()
    except Exception as e:
        logger.exception(f"Scheduled job '{job}' failed")
        raise HTTPException(status_code=500, detail=f"Job failed: {e}")

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    logger.info(f"Scheduled job '{job}' completed in {elapsed:.1f}s")
    return {"job": job, "status": "completed", "seconds": round(elapsed, 1)}


# Unprefixed liveness probe. Deploy platforms poll /healthz at the root, not
# under /api -- emergent.yml already pointed here while the only route was
# /api/health, so every healthcheck 404'd and the deploy was marked failed.
# Deliberately does not touch the database: this answers "is the process up",
# which must stay true in preview environments that boot without MONGO_URL.
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/version")
async def version():
    """Which commit this container is actually running.

    Deliberately unauthenticated and outside /api, so the deploy can check it
    before anything else exists. A green deploy is not evidence that new code
    is serving -- the health check answers just as happily from the old
    container -- and two commits once sat "deployed" for an afternoon while
    production kept running the previous build. This makes that visible in one
    request instead of being inferred from behaviour.
    """
    return {
        "sha": os.environ.get("BUILD_SHA", "unknown"),
        "built_at": os.environ.get("BUILD_TIME", "unknown"),
    }

@api_router.get("/notifications/badge")
async def get_notification_badge(request: Request):
    """Get notification badge counts for the logged-in user's role."""
    user = await get_current_user(request)
    badges = {}
    if user.get("is_fulfillment") or user.get("role") == "super_admin":
        badges["revision_requested"] = await db.projects.count_documents({"status": "revision_requested"})
    if user.get("is_hr") or user.get("role") == "super_admin":
        badges["awaiting_delegation"] = await db.projects.count_documents({"status": "awaiting_delegation"})
    if user.get("is_engineer"):
        badges["pending_reviews"] = await db.projects.count_documents({
            "assigned_engineer_id": user["user_id"],
            "status": {"$in": ["delegated", "under_review"]}
        })
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active = await db.projects.find(
            {"assigned_engineer_id": user["user_id"], "status": {"$in": ["approved_for_build", "in_build"]}},
            {"_id": 0, "id": 1}
        ).to_list(100)
        missing = 0
        for p in active:
            exists = await db.project_tracker_updates.find_one(
                {"project_id": p["id"], "engineer_id": user["user_id"], "update_date": today_str})
            if not exists:
                missing += 1
        badges["missing_standups"] = missing
    badges["total"] = sum(badges.values())
    return badges

# Include FlowForge router
from routers.flowforge import router as flowforge_router
api_router.include_router(flowforge_router)

# Include Assessments router
from routers.assessments import router as assessments_router, set_db as set_assessments_db
set_assessments_db(db)
api_router.include_router(assessments_router)

# Include Projects router
from routers.projects import router as projects_router, set_db as set_projects_db
set_projects_db(db)
api_router.include_router(projects_router)

# Include THCO Flow router (Project Management System — 12-stage pipeline)
from routers.flow import router as flow_router, set_db as set_flow_db
set_flow_db(db)
api_router.include_router(flow_router)

# Include Business Units router (admin-created units + member invites)
from routers.units import router as units_router, set_db as set_units_db
set_units_db(db)
api_router.include_router(units_router)

# Include Feedback / IT Support router
from routers.feedback import router as feedback_router, set_db as set_feedback_db
set_feedback_db(db)
api_router.include_router(feedback_router)

# Include Task Board router (Trello-like boards + cards)
from routers.taskboard import router as taskboard_router, set_db as set_taskboard_db
set_taskboard_db(db)
api_router.include_router(taskboard_router)

# Include Notifications router (in-app notices; raised server-side only)
from routers.notifications import router as notifications_router, set_db as set_notifications_db
set_notifications_db(db)
api_router.include_router(notifications_router)

# Include Talent router (candidate database, CV parsing, external sourcing)
from routers.talent import router as talent_router, set_db as set_talent_db, ensure_indexes as ensure_talent_indexes
set_talent_db(db)
api_router.include_router(talent_router)

# Email service DB
from services import set_db as set_email_db
set_email_db(db)

# Include the main router
app.include_router(api_router)

# Serve the Create-React-App production build (frontend)
# Mount static assets under /static and provide SPA fallback for non-/api routes.
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
# Require the static directory itself, not just `build/`. StaticFiles raises at
# import time if the directory is absent, so a leftover or half-written build/
# (common in development, where the CRA dev server serves the frontend instead)
# took the whole API down on startup rather than simply skipping SPA serving.
class ImmutableStaticFiles(StaticFiles):
    """Serve /static with a long cache lifetime.

    Everything under /static is content-hashed by the build (main.<hash>.js),
    so a given URL's bytes can never change -- a new build produces a new
    filename. Without a Cache-Control header the browser revalidates, and in
    practice re-downloads, the whole bundle on every visit. `immutable` tells
    it not to bother even on a reload.

    index.html is deliberately not served from here: it is the one file whose
    contents change while its URL stays the same, and caching it would pin
    users to a stale build.
    """

    def file_response(self, *args, **kwargs) -> Response:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


def _index_response() -> FileResponse:
    """The SPA shell, explicitly uncached so a deploy takes effect at once."""
    index_file = FRONTEND_BUILD_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Index not found")
    return FileResponse(
        str(index_file),
        headers={"Cache-Control": "no-cache, must-revalidate"},
    )


if (FRONTEND_BUILD_DIR / "static").is_dir():
    # Serve static assets (js/css/media) from /static
    app.mount(
        "/static",
        ImmutableStaticFiles(directory=str(FRONTEND_BUILD_DIR / "static")),
        name="static",
    )

    @app.get("/", include_in_schema=False)
    async def serve_spa_index():
        return _index_response()

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str, request: Request):
        # Let API routes continue to their handlers
        if full_path.startswith("api/") or request.url.path.startswith("/api/"):
            raise HTTPException(status_code=404)

        # If the requested file exists in build, serve it directly
        candidate = FRONTEND_BUILD_DIR / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))

        # Otherwise serve index.html for SPA routing
        return _index_response()

# Start SLA scheduler
from services.sla_scheduler import set_db as set_sla_db, start_scheduler as start_sla_scheduler
set_sla_db(db)

from services.relationship_reminders import set_db as set_relationship_db
set_relationship_db(db)

@app.on_event("startup")
async def startup_scheduler():
    start_sla_scheduler()
    # Talent/candidate indexes. Guarded because preview environments boot
    # without MONGO_URL, in which case `db` is None.
    if db is not None:
        await ensure_talent_indexes()


# ==================== SEED BUSINESS UNITS ====================
# The eleven units the company is organised into were only ever a hardcoded
# list in the frontend; the units collection held nothing unless a super admin
# had created a custom one. A unit head is recorded on the unit, so the unit
# has to exist as a record before anybody can be appointed to run it.
#
# Seeded on boot and idempotent: an existing unit is left completely alone, so
# a renamed or reconfigured unit is never overwritten and no head is lost.
CANONICAL_UNITS = [
    ("talent", "Talent & Delivery"),
    ("thco-hr", "THCO HR"),
    ("it-tools", "IT & THCO Tools"),
    ("sales", "Sales & Business Dev"),
    ("marketing", "Marketing & Brand"),
    ("advisory", "Advisory & Consulting"),
    ("technology", "Technology & Build"),
    ("operations", "Operations & Finance"),
    ("academy", "Academy & Learning"),
    ("client-delivery", "Client Delivery"),
]


@app.on_event("startup")
async def backfill_candidate_match_keys():
    """Fill in the normalised fields identity matching now searches on.

    Matching moved off case-insensitive regex, which could not use an index,
    onto stored normalised values. Candidates imported before that change
    have no `name_normalised` or `linkedin_slug`, and would quietly stop
    matching on those routes -- so they are derived once, here, from what is
    already on the record.

    Effectively one-shot: it only touches documents missing the field.
    """
    if db is None:
        return
    from services import candidate_identity as identity

    filled = 0
    cursor = db.candidates.find(
        {"name_normalised": {"$exists": False}},
        {"_id": 0, "candidate_id": 1, "name": 1, "linkedin": 1},
    )
    async for c in cursor:
        await db.candidates.update_one(
            {"candidate_id": c["candidate_id"]},
            {"$set": {
                "name_normalised": identity.normalise_name(c.get("name")),
                "linkedin_slug": identity.linkedin_slug(c.get("linkedin")),
            }},
        )
        filled += 1
    if filled:
        logger.info("Backfilled match keys on %d candidate(s)", filled)


@app.on_event("startup")
async def label_pre_unit_head_projects():
    """Mark the projects that predate unit heads as demo data.

    Every project created before this release was opened without a unit,
    because there were no units to open one under, and Victor confirmed they
    were all demo. They are labelled rather than deleted so nothing vanishes
    from anybody's dashboard -- but the label matters beyond cosmetics: demo
    projects do not count towards `has_projects`, so sample data cannot be
    what opens the pipeline for a staff member.

    Matches on the absence of the field rather than on unit_slug, because
    create_project now always writes is_demo. That makes this effectively
    one-shot: after the first boot nothing is left to match, and a project
    an administrator later opens without a unit is never swept up by it.
    """
    if db is None:
        return
    res = await db.projects.update_many(
        {"is_demo": {"$exists": False}}, {"$set": {"is_demo": True}}
    )
    if res.modified_count:
        logger.info("Labelled %d pre-unit-head project(s) as demo", res.modified_count)


@app.on_event("startup")
async def seed_units_on_boot():
    if db is None:
        return
    created = 0
    for slug, name in CANONICAL_UNITS:
        res = await db.units.update_one(
            {"slug": slug},
            {"$setOnInsert": {
                "unit_id": f"unit_{uuid.uuid4().hex[:12]}",
                "slug": slug,
                "name": name,
                "description": "",
                "icon": "layers",
                "accent": "#1FB58A",
                "lead": "",
                "head_user_id": None,
                "head_name": None,
                "config": {"sections": {"overview": True, "tools": True, "team": True,
                                        "flow": True, "feedback": True},
                           "userTasks": []},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system",
            }},
            upsert=True,
        )
        if res.upserted_id is not None:
            created += 1
    if created:
        logger.info("Seeded %d business unit(s)", created)


# ==================== SEED BUNDLED PROPOSALS ====================
from seed_proposals import seed_bundled_proposals

@app.on_event("startup")
async def seed_proposals_on_boot():
    await seed_bundled_proposals(db, ROOT_DIR)

# CORS Middleware
CORS_ORIGINS = [
    "http://localhost:5178",
    "http://127.0.0.1:5178",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://thcoteam.com",
    "https://www.thcoteam.com",
    "https://thcotools.emergent.host",
    "https://executive-decks.preview.emergentagent.com",
]
# Also include any env overrides
env_origins = os.environ.get('CORS_ORIGINS', '')
if env_origins and env_origins != '*':
    for o in env_origins.split(','):
        o = o.strip().strip('"').strip("'")
        if o and o not in CORS_ORIGINS:
            CORS_ORIGINS.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The frontend bundle is several megabytes of JavaScript and was being sent
# uncompressed, which is most of what a first visit spends its time on. There
# is no CDN or reverse proxy in front of this app -- Container Apps passes
# requests straight to uvicorn -- so if compression does not happen here it
# does not happen at all. 500 bytes keeps it off small JSON replies, where the
# CPU cost outweighs the saving.
app.add_middleware(GZipMiddleware, minimum_size=500)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
