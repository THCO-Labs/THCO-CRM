"""Contract engineer expiry (CROWTHER_MIGRATION_PLAN.md §14 Q1, resolved).

Flag People & Operations seven days ahead of a contract's `contract_end`,
then disable the account on the day itself unless the contract has been
renewed (`contract_end` moved forward, or `employment_type` changed off
`contract`). Automatic disable alone risked locking someone out mid-sprint
on a renewal that was agreed but not yet recorded; a flag with no deadline
risked nobody ever acting on it. This is the middle of the two.

Runs once a day via the same external-scheduler pattern as the mailbox
import and relationship reminders (`/internal/run-scheduled-job`) --
idempotent either way, since it re-checks `contract_flagged_at` and
`status` rather than assuming it hasn't already run today.
"""
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict

from services import notifications, permissions

logger = logging.getLogger(__name__)

FLAG_DAYS_AHEAD = 7


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _parse(d: str):
    try:
        return datetime.strptime(d, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


async def contract_expiry_sweep(db) -> Dict[str, Any]:
    flagged = 0
    disabled = 0
    errors = []

    cursor = db.users.find(
        {"employment_type": "contract", "status": "active", "contract_end": {"$nin": [None, ""]}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "contract_end": 1, "contract_flagged_at": 1},
    )
    async for person in cursor:
        try:
            end = _parse(person["contract_end"])
            if not end:
                continue
            days_left = (end - _today()).days

            if 0 < days_left <= FLAG_DAYS_AHEAD and not person.get("contract_flagged_at"):
                await notifications.notify_function_role_holders(
                    db,
                    function_roles=[permissions.PEOPLE_OPS],
                    kind=notifications.CONTRACT_EXPIRING,
                    title=f"{person.get('name') or 'A contractor'}'s contract ends in {days_left} day"
                          f"{'s' if days_left != 1 else ''}",
                    reason=f"Contract ends {person['contract_end']}. Renew it or plan the handover.",
                    link="/admin/users",
                    entity_type="user", entity_id=person["user_id"],
                )
                await db.users.update_one(
                    {"user_id": person["user_id"]},
                    {"$set": {"contract_flagged_at": datetime.now(timezone.utc).isoformat()}},
                )
                flagged += 1

            elif days_left <= 0:
                await db.users.update_one(
                    {"user_id": person["user_id"]},
                    {"$set": {"status": "disabled", "disabled_reason": "contract_ended",
                              "disabled_at": datetime.now(timezone.utc).isoformat()}},
                )
                # Every active pod membership and open assignment this person
                # held closes with them -- an expired contract ends all of it,
                # not just the project that happened to be checked first.
                await db.projects.update_many(
                    {"pod_member_ids": person["user_id"]},
                    {"$pull": {"pod_member_ids": person["user_id"],
                               "pod": {"user_id": person["user_id"]}}},
                )
                await db.talent_assignments.update_many(
                    {"user_id": person["user_id"], "status": "deployed"},
                    {"$set": {"status": "ended", "end_reason": "contract_ended",
                              "ended_at": datetime.now(timezone.utc).isoformat()}},
                )
                await notifications.notify_function_role_holders(
                    db,
                    function_roles=[permissions.PEOPLE_OPS],
                    kind=notifications.CONTRACT_ENDED,
                    title=f"{person.get('name') or 'A contractor'}'s contract has ended",
                    reason="Account disabled and pod memberships closed automatically.",
                    link="/admin/users",
                    entity_type="user", entity_id=person["user_id"],
                )
                disabled += 1
        except Exception as e:
            logger.exception("Contract expiry check failed for %s", person.get("user_id"))
            errors.append(f"{person.get('user_id')}: {e}")

    return {"flagged": flagged, "disabled": disabled, "errors": errors}
