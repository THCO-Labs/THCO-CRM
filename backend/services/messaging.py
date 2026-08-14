"""SMS and WhatsApp delivery via Twilio.

Mirrors ``services.send_email``: the provider call is synchronous, so it is
pushed to a thread and capped so a slow or unreachable Twilio can never hold a
request open. Missing credentials are not an error -- the send is skipped and
logged, so wiring the code does not break a deployment that has not yet added
keys. Like email, delivery status is reported back so the caller can decide
whether to mark a message "sent".
"""
import asyncio
import json
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


def _e164(raw: str, default_country_code: str = "") -> str:
    """Normalize a phone number to E.164 (``+`` plus digits).

    Local-format Nigerian numbers (``0903...``, ``0803...``) are common in this
    CRM and are not E.164: the leading ``0`` is a national trunk prefix, not an
    international dialling prefix. Without correction they become the bogus
    ``+0903...`` that Twilio rejects. When no country code is present we drop the
    trunk ``0`` and prepend ``default_country_code`` (Nigeria ``234`` unless the
    caller specifies otherwise).

    Still not a validator -- an invalid or incomplete number is handed to Twilio,
    which rejects it and lets the caller record a ``failed`` status.
    """
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    if not digits:
        return ""
    # Already international: explicit "+" or a country-code-length prefix that is
    # not a bare trunk "0" (e.g. "234...", "1...", "44...").
    if (raw or "").strip().startswith("+") or (digits[0] != "0" and len(digits) > 10):
        return f"+{digits}"
    # Local format with a trunk zero: "0903..." -> country + "903...".
    if digits.startswith("0") and len(digits) > 10 and default_country_code:
        return f"+{default_country_code}{digits[1:]}"
    return f"+{digits}"


async def _send_twilio(
    channel: str,
    to: str,
    body: str = "",
    content_sid: str = "",
    content_variables: dict | None = None,
) -> dict:
    import twilio.rest

    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")

    from_number = ""
    destination = to
    if channel == "whatsapp":
        raw_from = (os.environ.get("TWILIO_WHATSAPP_FROM") or "").strip()
        # Tolerate either "whatsapp:+1415..." or a bare E.164 "+1415...".
        from_number = raw_from if raw_from.lower().startswith("whatsapp:") else f"whatsapp:{_e164(raw_from)}"
        destination = f"whatsapp:{_e164(to, os.environ.get('TWILIO_DEFAULT_COUNTRY_CODE', '234'))}"
    else:  # sms
        from_number = (os.environ.get("TWILIO_SMS_FROM") or "").strip()
        destination = _e164(to, os.environ.get("TWILIO_DEFAULT_COUNTRY_CODE", "234"))

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

        # WhatsApp template messages are sent with a Content SID instead of a
        # free-form body; Twilio rejects a message that carries both. For SMS
        # (and free-form WhatsApp) the plain body path is unchanged.
        create_kwargs: dict = {"from_": from_number, "to": destination}
        if channel == "whatsapp" and content_sid:
            create_kwargs["content_sid"] = content_sid
            if content_variables:
                create_kwargs["content_variables"] = json.dumps(content_variables)
        else:
            create_kwargs["body"] = body

        # Twilio's SDK is synchronous; run it off the event loop and cap it so
        # an unreachable provider reads as a failed send, never a hung request.
        await asyncio.wait_for(
            asyncio.to_thread(client.messages.create, **create_kwargs),
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


async def send_whatsapp(
    to: str,
    body: str = "",
    content_sid: str = "",
    content_variables: dict | None = None,
) -> dict:
    """Send a WhatsApp message.

    Free-form messages pass ``body``; template messages pass ``content_sid``
    (and optionally ``content_variables``) and omit ``body``. Returns
    ``{status, error, ...}`` (sent | failed | skipped).
    """
    return await _send_twilio("whatsapp", to, body, content_sid, content_variables)
