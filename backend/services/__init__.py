import os
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

db = None

def set_db(database):
    global db
    db = database


async def send_email(to: list, subject: str, html: str, cc: list = None, template_name: str = "", context: dict = None):
    """Send email via Resend SDK. Gracefully no-ops if API key is missing/invalid."""
    import resend

    api_key = os.environ.get("RESEND_API_KEY", "")
    from_email = os.environ.get("RESEND_FROM_EMAIL", os.environ.get("SENDER_EMAIL", "tools@thcohq.com"))
    from_name = os.environ.get("RESEND_FROM_NAME", "THCO Tools")

    log_entry = {
        "id": str(uuid.uuid4()),
        "to": to,
        "cc": cc or [],
        "subject": subject,
        "template_name": template_name,
        "context": context or {},
        "status": "pending",
        "error": None,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }

    if not api_key or api_key == "PLACEHOLDER_REPLACE_BEFORE_PRODUCTION":
        log_entry["status"] = "skipped"
        log_entry["error"] = "API key not configured"
        logger.warning(f"Email skipped (no API key): {subject} -> {to}")
        if db is not None:
            await db.email_logs.insert_one(log_entry)
            log_entry.pop("_id", None)
        return log_entry

    try:
        resend.api_key = api_key
        params = {
            "from": f"{from_name} <{from_email}>",
            "to": to,
            "subject": subject,
            "html": html,
        }
        if cc:
            params["cc"] = cc

        resend.Emails.send(params)
        log_entry["status"] = "sent"
        logger.info(f"Email sent: {subject} -> {to}")
    except Exception as e:
        log_entry["status"] = "failed"
        log_entry["error"] = str(e)
        logger.error(f"Email failed: {subject} -> {to}: {e}")

    if db is not None:
        await db.email_logs.insert_one(log_entry)
        log_entry.pop("_id", None)
    return log_entry
