"""Birthday and anniversary reminders for client contacts.

Contacts already carry birthdays, work anniversaries and spouse birthdays, and
creating one generates a recurring calendar entry. Nothing acted on those
entries, so the dates were recorded and then silently passed.

This sweeps the contact book once a day and emails the people who should know
before a date arrives, not on the morning of it.

Recipients, per the brief:
    the delivery owner on the client's active project,
    HR,
    and the executive (super admins).

Dates are stored as "DD-MM" with no year, which is deliberate -- a client's
birthday recurs and nobody needs to record their age.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

db = None

# How many days ahead to warn. On-the-day is 0.
LEAD_DAYS = (7, 3, 0)

# Contact fields that represent a recurring date, and how to describe them.
OCCASIONS = (
    ("birthday", "birthday", "{name}'s birthday"),
    ("work_anniversary", "work anniversary", "{name}'s work anniversary"),
    ("spouse_birthday", "spouse's birthday", "{name}'s spouse's birthday"),
)


def set_db(database):
    global db
    db = database


def _parse_day_month(value: str) -> Optional[tuple]:
    """Parse a stored "DD-MM" value into (day, month).

    Tolerates "DD/MM" and a full ISO date, since these are typed by hand.
    Returns None for anything unparseable rather than raising -- one badly
    entered contact should not stop the whole sweep.
    """
    if not value or not isinstance(value, str):
        return None
    raw = value.strip().replace("/", "-")
    if not raw:
        return None

    parts = raw.split("-")
    try:
        if len(parts) == 3 and len(parts[0]) == 4:      # YYYY-MM-DD
            return int(parts[2]), int(parts[1])
        if len(parts) >= 2:                              # DD-MM (ignore any year)
            day, month = int(parts[0]), int(parts[1])
            if 1 <= day <= 31 and 1 <= month <= 12:
                return day, month
    except (ValueError, IndexError):
        pass

    logger.debug(f"Unparseable date on contact: {value!r}")
    return None


def _is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def _occurs_in(day_month: tuple, days_ahead: int, today: datetime) -> bool:
    """Whether this DD-MM falls exactly `days_ahead` days from today.

    Adding a timedelta handles the year boundary naturally, so a date in early
    January is found from late December without special casing.

    A 29 February date is observed on 28 February in non-leap years -- treating
    it literally would skip those contacts in three years out of four.
    """
    target = today + timedelta(days=days_ahead)
    day, month = day_month

    if (day, month) == (29, 2) and not _is_leap(target.year):
        day, month = 28, 2

    return (day, month) == (target.day, target.month)


def _describe(days_ahead: int) -> str:
    if days_ahead == 0:
        return "today"
    if days_ahead == 1:
        return "tomorrow"
    return f"in {days_ahead} days"


async def _recipients_for(contact: Dict[str, Any]) -> List[str]:
    """Who should hear about this contact's date.

    HR and executives always. The delivery owner is included when the contact
    is attached to a client with an active project, so project leads hear
    about their own clients rather than everyone's.
    """
    emails = set()

    cursor = db.users.find(
        {
            "status": "active",
            "$or": [
                {"role": "super_admin"},
                {"is_hr": True},
                {"is_executive_approver": True},
            ],
        },
        {"_id": 0, "email": 1},
    )
    async for u in cursor:
        if u.get("email"):
            emails.add(u["email"])

    client_id = contact.get("client_id")
    if client_id:
        project = await db.projects.find_one(
            {"client_id": client_id, "stage": {"$nin": [10]}},
            {"_id": 0, "delivery_owner_id": 1, "assigned_engineer_id": 1},
        )
        if project:
            for field in ("delivery_owner_id", "assigned_engineer_id"):
                uid = project.get(field)
                if uid:
                    owner = await db.users.find_one({"user_id": uid}, {"_id": 0, "email": 1})
                    if owner and owner.get("email"):
                        emails.add(owner["email"])

    return sorted(emails)


def _build_email(contact: Dict[str, Any], label: str, headline: str, days_ahead: int) -> tuple:
    name = contact.get("full_name") or "A client contact"
    client = contact.get("client_name") or ""
    when = _describe(days_ahead)

    subject = f"[THCO] {headline.format(name=name)} — {when}"

    client_line = (
        f'<p style="margin:0 0 6px;color:#6B7280">Client: <strong>{client}</strong></p>'
        if client else ""
    )
    prompt = (
        "Worth a call or a note today."
        if days_ahead == 0
        else "A good moment to plan how we mark it."
    )

    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#C6A15B;margin:0 0 10px">
        THCO Control Room
      </p>
      <h2 style="margin:0 0 12px;color:#0C0F13;font-size:20px">
        {headline.format(name=name)} is {when}
      </h2>
      {client_line}
      <p style="margin:0 0 4px;color:#6B7280">Occasion: <strong>{label}</strong></p>
      <p style="margin:16px 0 0;color:#0C0F13">{prompt}</p>
    </div>
    """
    return subject, html


async def relationship_reminder_sweep():
    """Daily sweep: notify on contact dates falling 7, 3 and 0 days out.

    A `reminders_sent` marker is written per contact, occasion, lead time and
    year so a restart -- or a second run in the same day -- does not send the
    same reminder twice.
    """
    if db is None:
        return

    today = datetime.now(timezone.utc)
    year = today.year
    sent_count = 0

    try:
        contacts = await db.contacts.find({}, {"_id": 0}).to_list(2000)
    except Exception as e:
        logger.warning(f"Relationship sweep could not read contacts: {e}")
        return

    for contact in contacts:
        for field, label, headline in OCCASIONS:
            parsed = _parse_day_month(contact.get(field))
            if not parsed:
                continue

            for days_ahead in LEAD_DAYS:
                if not _occurs_in(parsed, days_ahead, today):
                    continue

                marker = {
                    "contact_id": contact.get("contact_id"),
                    "occasion": field,
                    "lead_days": days_ahead,
                    "year": year,
                }
                if await db.reminders_sent.find_one(marker):
                    continue

                recipients = await _recipients_for(contact)
                if not recipients:
                    logger.info("No recipients for relationship reminder; skipping")
                    continue

                subject, html = _build_email(contact, label, headline, days_ahead)
                try:
                    from services import send_email

                    await send_email(
                        to=recipients,
                        subject=subject,
                        html=html,
                        template_name="relationship_reminder",
                        context={**marker, "recipients": len(recipients)},
                    )
                    await db.reminders_sent.insert_one({**marker, "sent_at": today.isoformat()})
                    sent_count += 1
                except Exception as e:
                    # Never let one failed send stop the rest of the sweep.
                    logger.warning(f"Relationship reminder failed for {contact.get('full_name')}: {e}")

    if sent_count:
        logger.info(f"Relationship reminders sent: {sent_count}")
