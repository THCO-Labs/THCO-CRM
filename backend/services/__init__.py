import asyncio
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

        # The Resend SDK is synchronous. Calling it directly from async code
        # blocks the event loop, which stops the server answering anybody for
        # as long as the send takes -- and a slow or unreachable Resend then
        # reads to every user as the whole app hanging. Push it to a thread
        # and cap how long it may take: a notification email is never worth
        # holding a request open for.
        await asyncio.wait_for(asyncio.to_thread(resend.Emails.send, params), timeout=15)
        log_entry["status"] = "sent"
        logger.info(f"Email sent: {subject} -> {to}")
    except asyncio.TimeoutError:
        log_entry["status"] = "failed"
        log_entry["error"] = "timed out after 15s"
        logger.error(f"Email timed out: {subject} -> {to}")
    except Exception as e:
        log_entry["status"] = "failed"
        log_entry["error"] = str(e)
        logger.error(f"Email failed: {subject} -> {to}: {e}")

    if db is not None:
        await db.email_logs.insert_one(log_entry)
        log_entry.pop("_id", None)
    return log_entry
