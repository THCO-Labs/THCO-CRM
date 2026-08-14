"""SMS and WhatsApp delivery via Twilio.

Mirrors ``services.send_email``: the provider call is synchronous, so it is
pushed to a thread and capped so a slow or unreachable Twilio can never hold a
request open. Missing credentials are not an error -- the send is skipped and
logged, so wiring the code does not break a deployment that has not yet added
keys. Like email, delivery status is reported back so the caller can decide
whether to mark a message "sent".
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone

import services

logger = logging.getLogger(__name__)

# Placeholder values that mean "no real credential configured yet".
# NOTE: the empty string is handled separately via ``not v`` below -- it must
# NOT live in this set, because ``"anything".startswith("")`` is always True
# and would make every real key look like a placeholder.
_PLACEHOLDERS = {"PLACEHOLDER_REPLACE_BEFORE_PRODUCTION", "YOUR_", "CHANGE_ME"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_placeholder(value: str) -> bool:
    v = (value or "").strip()
    return not v or any(v.upper().startswith(p) for p in _PLACEHOLDERS)


def _e164(raw: str) -> str:
    """Normalize a phone number to E.164 (``+`` plus digits).

    Not a validator -- it only strips separators and forces a leading ``+``.
    An invalid or incomplete number is still handed to Twilio, which rejects it
    and lets the caller record a ``failed`` status rather than raising here.
    """
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    return f"+{digits}" if digits else ""


async def _send_twilio(channel: str, to: str, body: str) -> dict:
    import twilio.rest

    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")

    from_number = ""
    destination = to
    if channel == "whatsapp":
        raw_from = (os.environ.get("TWILIO_WHATSAPP_FROM") or "").strip()
        # Tolerate either "whatsapp:+1415..." or a bare E.164 "+1415...".
        from_number = raw_from if raw_from.lower().startswith("whatsapp:") else f"whatsapp:{_e164(raw_from)}"
        destination = f"whatsapp:{_e164(to)}"
    else:  # sms
        from_number = (os.environ.get("TWILIO_SMS_FROM") or "").strip()
        destination = _e164(to)

    log_entry = {
        "id": str(uuid.uuid4()),
        "channel": channel,
        "to": destination,
        "from": from_number,
        "body": body,
        "status": "pending",
        "error": None,
        "sent_at": _now(),
    }

    if _is_placeholder(account_sid) or _is_placeholder(auth_token):
        log_entry["status"] = "skipped"
        log_entry["error"] = "Twilio not configured (missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)"
        logger.warning(f"{channel.upper()} skipped (no Twilio credentials): -> {destination}")
        if services.db is not None:
            await services.db.message_logs.insert_one(log_entry)
            log_entry.pop("_id", None)
        return log_entry

    if _is_placeholder(from_number):
        log_entry["status"] = "failed"
        env_key = "TWILIO_WHATSAPP_FROM" if channel == "whatsapp" else "TWILIO_SMS_FROM"
        log_entry["error"] = f"Missing sender number ({env_key})"
        logger.error(f"{channel.upper()} failed (no sender): -> {destination}")
        if services.db is not None:
            await services.db.message_logs.insert_one(log_entry)
            log_entry.pop("_id", None)
        return log_entry

    try:
        client = twilio.rest.Client(account_sid, auth_token)

        # Twilio's SDK is synchronous; run it off the event loop and cap it so
        # an unreachable provider reads as a failed send, never a hung request.
        await asyncio.wait_for(
            asyncio.to_thread(
                client.messages.create,
                from_=from_number,
                to=destination,
                body=body,
            ),
            timeout=15,
        )
        log_entry["status"] = "sent"
        logger.info(f"{channel.upper()} sent: -> {destination}")
    except asyncio.TimeoutError:
        log_entry["status"] = "failed"
        log_entry["error"] = "timed out after 15s"
        logger.error(f"{channel.upper()} timed out: -> {destination}")
    except Exception as e:
        log_entry["status"] = "failed"
        log_entry["error"] = str(e)
        logger.error(f"{channel.upper()} failed: -> {destination}: {e}")

    if services.db is not None:
        await services.db.message_logs.insert_one(log_entry)
        log_entry.pop("_id", None)
    return log_entry


async def send_sms(to: str, body: str) -> dict:
    """Send an SMS. Returns ``{status, error, ...}`` (sent | failed | skipped)."""
    return await _send_twilio("sms", to, body)


async def send_whatsapp(to: str, body: str) -> dict:
    """Send a WhatsApp message. Returns ``{status, error, ...}`` (sent | failed | skipped)."""
    return await _send_twilio("whatsapp", to, body)
