"""SLA Scheduler - APScheduler background jobs for project delivery workflow."""
import logging
import asyncio
import os
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

db = None
scheduler = AsyncIOScheduler()

def set_db(database):
    global db
    db = database


def _minutes_elapsed(iso_str: str) -> float:
    ts = datetime.fromisoformat(iso_str)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - ts).total_seconds() / 60


def _has_reminder(reminders: list, window: int, rtype: str) -> bool:
    return any(r.get("window") == window and r.get("type") == rtype for r in reminders)


async def _send_template_email(template_func, ctx, to, cc=None):
    from services import send_email
    subject, html = template_func(ctx)
    await send_email(to=to, subject=subject, html=html, cc=cc,
                     template_name=template_func.__name__, context=ctx)


async def sla_reminder_sweep():
    """Check all active reviews and send SLA reminders as needed."""
    if db is None:
        return
    from services.email_templates import (
        window1_60min, window1_30min, window1_breach,
        window2_60min, window2_30min, window2_breach,
    )

    escalation_email = os.environ.get("ESCALATION_EMAIL", "joshua@thcohq.com")

    cursor = db.engineer_reviews.find({"is_active": True, "decision_at": None}, {"_id": 0})
    reviews = await cursor.to_list(length=500)

    hr_emails = None

    for review in reviews:
        reminders = review.get("reminders_sent", [])
        project = await db.projects.find_one({"id": review["project_id"]}, {"_id": 0})
        if not project:
            continue

        ctx = {
            "project_id": review["project_id"],
            "project_name": project["name"],
            "engineer_name": project.get("assigned_engineer_name", "Engineer"),
            "engineer_email": review["engineer_email"],
            "delegated_at": review.get("delegation_email_sent_at", ""),
            "opened_at": review.get("first_opened_at", ""),
        }
        engineer_to = [review["engineer_email"]]

        # Window 1: not opened yet
        if not review.get("first_opened_at"):
            elapsed = _minutes_elapsed(review["delegation_email_sent_at"])

            if elapsed >= 120 and not review.get("window_1_breached"):
                if hr_emails is None:
                    hr_users = await db.users.find({"is_hr": True}, {"_id": 0, "email": 1}).to_list(100)
                    hr_emails = [u["email"] for u in hr_users]
                cc_list = list(set(hr_emails + [escalation_email]))
                await _send_template_email(window1_breach, ctx, engineer_to, cc=cc_list)
                await db.engineer_reviews.update_one(
                    {"id": review["id"]},
                    {"$set": {"window_1_breached": True},
                     "$push": {"reminders_sent": {"window": 1, "type": "breach", "sent_at": datetime.now(timezone.utc).isoformat()}}}
                )
            elif elapsed >= 90 and not _has_reminder(reminders, 1, "30min"):
                await _send_template_email(window1_30min, ctx, engineer_to)
                await db.engineer_reviews.update_one(
                    {"id": review["id"]},
                    {"$push": {"reminders_sent": {"window": 1, "type": "30min", "sent_at": datetime.now(timezone.utc).isoformat()}}}
                )
            elif elapsed >= 60 and not _has_reminder(reminders, 1, "60min"):
                await _send_template_email(window1_60min, ctx, engineer_to)
                await db.engineer_reviews.update_one(
                    {"id": review["id"]},
                    {"$push": {"reminders_sent": {"window": 1, "type": "60min", "sent_at": datetime.now(timezone.utc).isoformat()}}}
                )

        # Window 2: opened but not decided
        elif review.get("first_opened_at") and not review.get("decision_at"):
            elapsed = _minutes_elapsed(review["first_opened_at"])

            if elapsed >= 120 and not review.get("window_2_breached"):
                if hr_emails is None:
                    hr_users = await db.users.find({"is_hr": True}, {"_id": 0, "email": 1}).to_list(100)
                    hr_emails = [u["email"] for u in hr_users]
                cc_list = list(set(hr_emails + [escalation_email]))
                await _send_template_email(window2_breach, ctx, engineer_to, cc=cc_list)
                await db.engineer_reviews.update_one(
                    {"id": review["id"]},
                    {"$set": {"window_2_breached": True},
                     "$push": {"reminders_sent": {"window": 2, "type": "breach", "sent_at": datetime.now(timezone.utc).isoformat()}}}
                )
            elif elapsed >= 90 and not _has_reminder(reminders, 2, "30min"):
                await _send_template_email(window2_30min, ctx, engineer_to)
                await db.engineer_reviews.update_one(
                    {"id": review["id"]},
                    {"$push": {"reminders_sent": {"window": 2, "type": "30min", "sent_at": datetime.now(timezone.utc).isoformat()}}}
                )
            elif elapsed >= 60 and not _has_reminder(reminders, 2, "60min"):
                await _send_template_email(window2_60min, ctx, engineer_to)
                await db.engineer_reviews.update_one(
                    {"id": review["id"]},
                    {"$push": {"reminders_sent": {"window": 2, "type": "60min", "sent_at": datetime.now(timezone.utc).isoformat()}}}
                )


async def daily_standup_sweep():
    """Send standup reminders at 5PM WAT and escalate missed standups."""
    if db is None:
        return
    from services.email_templates import standup_reminder, standup_missed_2days
    import pytz

    escalation_email = os.environ.get("ESCALATION_EMAIL", "joshua@thcohq.com")

    try:
        wat = pytz.timezone("Africa/Lagos")
    except Exception:
        return

    now_wat = datetime.now(wat)
    if now_wat.weekday() >= 5:  # Skip weekends
        return
    if not (17 <= now_wat.hour < 18):  # Only 5PM-6PM WAT
        return

    today_str = now_wat.strftime("%Y-%m-%d")

    # Find projects needing standups
    active_statuses = ["approved_for_build", "in_build"]
    cursor = db.projects.find({"status": {"$in": active_statuses}}, {"_id": 0})
    projects = await cursor.to_list(length=500)

    for project in projects:
        engineer_id = project.get("assigned_engineer_id")
        if not engineer_id:
            continue

        engineer = await db.users.find_one({"user_id": engineer_id}, {"_id": 0, "email": 1, "name": 1})
        if not engineer:
            continue

        # Check if standup exists today
        today_update = await db.project_tracker_updates.find_one(
            {"project_id": project["id"], "engineer_id": engineer_id, "update_date": today_str},
            {"_id": 0}
        )

        ctx = {
            "project_id": project["id"],
            "project_name": project["name"],
            "engineer_name": engineer["name"],
        }

        if not today_update:
            await _send_template_email(standup_reminder, ctx, [engineer["email"]])

        # Check for 2-day miss (last 2 working days)
        check_dates = []
        d = now_wat - timedelta(days=1)
        while len(check_dates) < 2:
            if d.weekday() < 5:
                check_dates.append(d.strftime("%Y-%m-%d"))
            d -= timedelta(days=1)

        missed_count = 0
        for date_str in check_dates:
            exists = await db.project_tracker_updates.find_one(
                {"project_id": project["id"], "engineer_id": engineer_id, "update_date": date_str},
                {"_id": 0, "id": 1}
            )
            if not exists:
                missed_count += 1

        if missed_count >= 2:
            # Check if we already sent this escalation today
            existing_esc = await db.email_logs.find_one({
                "template_name": "standup_missed_2days",
                "context.project_id": project["id"],
                "sent_at": {"$gte": today_str}
            })
            if not existing_esc:
                last_update = await db.project_tracker_updates.find_one(
                    {"project_id": project["id"], "engineer_id": engineer_id},
                    {"_id": 0, "update_date": 1},
                    sort=[("update_date", -1)]
                )
                ctx["last_update_date"] = last_update["update_date"] if last_update else "None"
                creator_email = None
                creator = await db.users.find_one({"user_id": project.get("created_by")}, {"_id": 0, "email": 1})
                if creator:
                    creator_email = creator["email"]
                cc = [creator_email] if creator_email else []
                await _send_template_email(standup_missed_2days, ctx, [escalation_email], cc=cc)


async def flow_build_eod_reminder():
    """End-of-day reminder for engineers on THCO Flow build-track projects.
    Sends a Resend email to engineers who have no build_comments logged today
    on projects where they are the assigned_engineer_id and stage == 9.
    Sends only once per (engineer, project, day).
    """
    if db is None:
        return
    from services import send_email
    from services.email_templates import _base
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    cursor = db.projects.find({
        "track": "build",
        "stage": 9,
        "assigned_engineer_id": {"$ne": None},
    }, {"_id": 0})
    projects = await cursor.to_list(500)

    for project in projects:
        engineer_id = project.get("assigned_engineer_id")
        if not engineer_id:
            continue
        engineer = await db.users.find_one({"user_id": engineer_id}, {"_id": 0, "email": 1, "name": 1})
        if not engineer:
            continue

        # Has the engineer commented today on this project?
        comments = project.get("build_comments", [])
        commented_today = any(
            (c.get("by") == engineer_id and (c.get("at", "")[:10] == today_str))
            for c in comments
        )
        if commented_today:
            continue

        # Have we already sent the reminder today?
        already = await db.email_logs.find_one({
            "template_name": "flow_build_eod_reminder",
            "context.project_id": project["id"],
            "context.engineer_id": engineer_id,
            "sent_at": {"$gte": today_str},
        })
        if already:
            continue

        subject = f"[THCO Flow] EOD update needed: {project.get('name')}"
        body = f"""
          <h2 style="margin:0 0 16px;color:#1B4332;font-size:20px;">End-of-day build update needed</h2>
          <p>Hi {engineer.get('name','')},</p>
          <p>You haven't logged an update today on
          <strong>{project.get('name')}</strong> ({project.get('client_name_snapshot')}).</p>
          <p>Please drop a quick status (Planning / Building / Blocked / Ready for QA)
          and a one-line comment so the Delivery Owner knows where you are.</p>
        """
        html = _base(subject, body, cta_url=f"/flow/projects/{project['id']}", cta_text="Post update")
        await send_email(
            to=[engineer["email"]],
            subject=subject,
            html=html,
            template_name="flow_build_eod_reminder",
            context={"project_id": project["id"], "engineer_id": engineer_id},
        )


def start_scheduler():
    """Start the APScheduler with SLA, standup, Flow EOD, and relationship jobs."""
    scheduler.add_job(sla_reminder_sweep, "interval", minutes=5, id="sla_sweep", replace_existing=True)
    scheduler.add_job(daily_standup_sweep, "interval", hours=1, id="standup_sweep", replace_existing=True)
    # Flow EOD reminder: run every hour after 17:00 UTC (covers global teams)
    scheduler.add_job(flow_build_eod_reminder, "cron", hour="17-22", minute=0, id="flow_eod", replace_existing=True)

    # Client birthdays and anniversaries are NOT scheduled here. Container Apps
    # scales to zero when idle, so a 06:00 in-process job would simply not run
    # on a quiet night and the notice would be missed. It is driven instead by
    # an external scheduler calling /api/internal/run-scheduled-job, which also
    # wakes the container. See .github/workflows/scheduled-jobs.yml.

    scheduler.start()
    logger.info(
        "SLA Scheduler started: sla_sweep (5min), standup_sweep (1hr), "
        "flow_eod (cron 17-22h). Relationship reminders run via external trigger."
    )
