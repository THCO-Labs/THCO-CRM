from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/assessments", tags=["assessments"])

# Will be set from server.py
db = None

def set_db(database):
    global db
    db = database

# --- Pydantic Models ---

class AssessmentStart(BaseModel):
    name: str
    email: EmailStr

class AnswerUpdate(BaseModel):
    answers: dict

class FinalDetails(BaseModel):
    onsite_hybrid: str
    work_preference: Optional[str] = ""
    salary_expectation: str
    location_city: str
    location_state: Optional[str] = ""
    location_country: str
    time_remaining_seconds: int
    total_time_taken_seconds: int

# --- Public Endpoints (no auth) ---

@router.post("/start")
async def start_assessment(data: AssessmentStart):
    """Create or resume an assessment. If email exists, return existing record."""
    existing = await db.assessments.find_one({"email": data.email.lower()}, {"_id": 0})
    if existing:
        return existing

    now = datetime.now(timezone.utc).isoformat()
    assessment = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email.lower(),
        "answers": {f"q{i}": "" for i in range(1, 40)},
        "onsite_hybrid": "",
        "work_preference": "",
        "salary_expectation": "",
        "location_city": "",
        "location_state": "",
        "location_country": "",
        "timer_started_at": "",
        "time_remaining_seconds": 6000,
        "total_time_taken_seconds": 0,
        "status": "in_progress",
        "started_at": now,
        "completed_at": None,
        "last_saved_at": now,
    }
    await db.assessments.insert_one(assessment)
    # Return without _id
    assessment.pop("_id", None)
    return assessment


@router.get("/lookup")
async def lookup_assessment(email: str):
    """Lookup an existing assessment by email for resume."""
    doc = await db.assessments.find_one({"email": email.lower()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No assessment found for this email")
    return doc


@router.get("/by-id/{assessment_id}")
async def get_assessment(assessment_id: str):
    """Get assessment by ID."""
    doc = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return doc


@router.put("/{assessment_id}/answers")
async def save_answers(assessment_id: str, data: AnswerUpdate):
    """Auto-save answers (called on every change with debounce)."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.assessments.update_one(
        {"id": assessment_id},
        {"$set": {
            **{f"answers.{k}": v for k, v in data.answers.items()},
            "last_saved_at": now,
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {"status": "saved", "last_saved_at": now}


@router.put("/{assessment_id}/timer")
async def save_timer(assessment_id: str, request: Request):
    """Save timer state for resume functionality."""
    body = await request.json()
    update = {}
    if "timer_started_at" in body:
        update["timer_started_at"] = body["timer_started_at"]
    if "time_remaining_seconds" in body:
        update["time_remaining_seconds"] = body["time_remaining_seconds"]
    if update:
        update["last_saved_at"] = datetime.now(timezone.utc).isoformat()
        await db.assessments.update_one({"id": assessment_id}, {"$set": update})
    return {"status": "saved"}


@router.put("/{assessment_id}/final")
async def save_final_details(assessment_id: str, data: FinalDetails):
    """Save Page 3 details and mark assessment as completed."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.assessments.update_one(
        {"id": assessment_id},
        {"$set": {
            "onsite_hybrid": data.onsite_hybrid,
            "work_preference": data.work_preference or "",
            "salary_expectation": data.salary_expectation,
            "location_city": data.location_city,
            "location_state": data.location_state or "",
            "location_country": data.location_country,
            "time_remaining_seconds": data.time_remaining_seconds,
            "total_time_taken_seconds": data.total_time_taken_seconds,
            "status": "completed",
            "completed_at": now,
            "last_saved_at": now,
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {"status": "completed", "completed_at": now}


# --- Admin Endpoints (protected) ---

async def verify_admin(request: Request):
    """Verify the request is from an authenticated admin or HR."""
    from server import get_current_user
    user = await get_current_user(request)
    if not (user.get("role") == "super_admin" or user.get("is_hr")):
        raise HTTPException(status_code=403, detail="Admin or HR access required")
    return user


@router.get("/admin/list")
async def admin_list_assessments(request: Request, status_filter: str = "all"):
    """List all assessments for admin dashboard."""
    await verify_admin(request)
    query = {}
    if status_filter != "all":
        query["status"] = status_filter

    cursor = db.assessments.find(query, {"_id": 0}).sort("started_at", -1)
    assessments = await cursor.to_list(length=1000)

    # Add completion percentage
    for a in assessments:
        answers = a.get("answers", {})
        answered = sum(1 for v in answers.values() if v and str(v).strip())
        a["completion_pct"] = round((answered / 39) * 100)
        a["questions_answered"] = answered

    return assessments


@router.get("/admin/export/json")
async def admin_export_json(request: Request):
    """Export all completed assessments as JSON."""
    await verify_admin(request)
    cursor = db.assessments.find({"status": "completed"}, {"_id": 0}).sort("completed_at", -1)
    assessments = await cursor.to_list(length=10000)
    import json
    content = json.dumps(assessments, indent=2, default=str)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=assessments_export.json"}
    )


@router.get("/admin/export/csv")
async def admin_export_csv(request: Request):
    """Export all assessments as flattened CSV."""
    await verify_admin(request)
    cursor = db.assessments.find({}, {"_id": 0}).sort("started_at", -1)
    assessments = await cursor.to_list(length=10000)

    output = io.StringIO()
    if not assessments:
        output.write("No data")
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=assessments_export.csv"}
        )

    # Build CSV header
    base_fields = ["id", "name", "email", "status", "onsite_hybrid", "work_preference", "salary_expectation",
                   "location_city", "location_state", "location_country",
                   "time_remaining_seconds", "total_time_taken_seconds",
                   "started_at", "completed_at", "last_saved_at"]
    q_fields = [f"q{i}" for i in range(1, 40)]
    fieldnames = base_fields + q_fields

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for a in assessments:
        row = {f: a.get(f, "") for f in base_fields}
        answers = a.get("answers", {})
        for q in q_fields:
            row[q] = answers.get(q, "")
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assessments_export.csv"}
    )


@router.get("/admin/{assessment_id}")
async def admin_get_assessment(assessment_id: str, request: Request):
    """Get single assessment detail for admin."""
    await verify_admin(request)
    doc = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    answers = doc.get("answers", {})
    answered = sum(1 for v in answers.values() if v and str(v).strip())
    doc["completion_pct"] = round((answered / 39) * 100)
    doc["questions_answered"] = answered
    return doc


@router.get("/admin/{assessment_id}/export")
async def admin_export_single(assessment_id: str, request: Request):
    """Export a single candidate's assessment as JSON."""
    await verify_admin(request)
    doc = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    import json
    content = json.dumps(doc, indent=2, default=str)
    safe_name = doc.get("name", "candidate").replace(" ", "_").lower()
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_assessment.json"}
    )
