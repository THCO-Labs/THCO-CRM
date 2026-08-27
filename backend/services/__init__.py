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


# ---------------------------------------------------------------------------
# Where email actually goes
# ---------------------------------------------------------------------------
# The accounts in this system belong to real people with real inboxes. Testing
# against real data therefore mails real colleagues, repeatedly, about projects
# that are not real -- which is exactly what happened, and it is the sort of
# thing that gets a tool switched off by the people it is for.
#
#   EMAIL_MODE=live      normal delivery. The default, so an existing
#                        deployment that sets nothing keeps working.
#   EMAIL_MODE=off       nothing is delivered. Every message is still written
#                        to `email_logs` with status "suppressed", so what
#                        *would* have been sent is fully inspectable.
#   EMAIL_MODE=redirect  everything goes to EMAIL_REDIRECT_TO instead, with the
#                        intended recipients named in the subject and banner.
#                        For checking that a template actually renders.
#
# `off` is the right setting for any environment pointed at a copy of real
# people's data. It is set in the local `.env` rather than defaulted here, so
# production is unaffected by this change.
#
# Read per call rather than captured at import. `server.py` imports this
# package on line 23 and calls `load_dotenv()` on line 30, so a module-level
# read happens before the file has been loaded and always sees the default --
# which silently meant "live" no matter what `.env` said.
def _email_mode() -> str:
    return (os.environ.get("EMAIL_MODE") or "live").strip().lower()


def _redirect_banner(original_to: list, original_cc: list) -> str:
    """Make a redirected message obviously not the real thing."""
    recipients = ", ".join(original_to or []) or "(nobody)"
    cc_line = f" &nbsp;·&nbsp; cc: {', '.join(original_cc)}" if original_cc else ""
    return (
        '<div style="font-family:Inter,Arial,sans-serif;background:#C6A15B;color:#241C0E;'
        'padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:13px">'
        f'<strong>Test redirect.</strong> This would have gone to: {recipients}{cc_line}'
        "</div>"
    )


async def send_email(to: list, subject: str, html: str, cc: list = None, template_name: str = "", context: dict = None):
    """Send email via Resend SDK. Gracefully no-ops if API key is missing/invalid."""
    import resend

    mode = _email_mode()
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
        "mode": mode,
    }

    # Checked before the API key, so turning delivery off works whether or not
    # a key happens to be configured.
    if mode == "off":
        log_entry["status"] = "suppressed"
        log_entry["error"] = "EMAIL_MODE=off — recorded, not delivered"
        logger.info("Email suppressed (EMAIL_MODE=off): %s -> %s", subject, to)
        if db is not None:
            await db.email_logs.insert_one(log_entry)
            log_entry.pop("_id", None)
        return log_entry

    if mode == "redirect":
        redirect_to = os.environ.get("EMAIL_REDIRECT_TO", "").strip()
        if not redirect_to:
            log_entry["status"] = "suppressed"
            log_entry["error"] = "EMAIL_MODE=redirect but EMAIL_REDIRECT_TO is not set"
            logger.warning("Email redirect requested with no EMAIL_REDIRECT_TO; suppressed: %s", subject)
            if db is not None:
                await db.email_logs.insert_one(log_entry)
                log_entry.pop("_id", None)
            return log_entry
        html = _redirect_banner(to, cc or []) + html
        subject = f"[test → {', '.join(to or [])}] {subject}"
        log_entry["redirected_from"] = to
        log_entry["to"] = [redirect_to]
        to = [redirect_to]
        cc = None

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
