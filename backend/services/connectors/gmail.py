"""Read CVs from a Google Workspace mailbox.

Reads attachments from a shared inbox -- `projects@thcohq.com` -- so that CVs
sent by email reach the candidate database without anyone downloading and
re-uploading them.

Access uses the existing service account with domain-wide delegation,
impersonating the mailbox. The scope is deliberately read-only: this can list
and download messages and nothing else. It cannot send, reply, archive or
delete, which is the right level of trust for an automated process pointed at
company mail.

Enabling it requires a Workspace super administrator to authorise the service
account's client ID for `gmail.readonly` under
Admin console > Security > API controls > Domain-wide delegation. Until that
is done every call fails with `unauthorized_client`, which `is_configured`
reports rather than letting imports fail one by one.
"""

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional

from services.connectors.base import CandidateDocument, Connector

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# Attachment types worth parsing. Anything else in a mailbox -- signatures,
# logos, calendar invites -- is skipped without being downloaded.
CV_EXTENSIONS = (".pdf", ".doc", ".docx", ".rtf", ".odt", ".txt")

# Images and calendar parts are attached to almost every email; excluding them
# by type avoids fetching megabytes of signature logos on every run.
SKIP_MIME_PREFIXES = ("image/", "video/", "audio/")

MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024


def _looks_like_cv(filename: str, mime_type: str, size: int) -> bool:
    if not filename:
        return False
    if any(mime_type.startswith(p) for p in SKIP_MIME_PREFIXES):
        return False
    if size > MAX_ATTACHMENT_BYTES:
        logger.info("Skipping oversized attachment %s (%d bytes)", filename, size)
        return False
    return filename.lower().endswith(CV_EXTENSIONS)


def _header(payload: Dict[str, Any], name: str) -> Optional[str]:
    for h in payload.get("headers", []) or []:
        if h.get("name", "").lower() == name.lower():
            return h.get("value")
    return None


def _sender_address(raw: Optional[str]) -> Optional[str]:
    """Pull the bare address out of a From header such as 'Ada <ada@x.com>'."""
    if not raw:
        return None
    match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", raw)
    return match.group(0) if match else None


def _walk_parts(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Flatten a MIME tree. Attachments can nest several levels down."""
    found = []
    stack = [payload]
    while stack:
        part = stack.pop()
        if not isinstance(part, dict):
            continue
        found.append(part)
        stack.extend(part.get("parts") or [])
    return found


class GmailConnector(Connector):
    """Fetch CV attachments from a delegated Google Workspace mailbox."""

    name = "gmail"

    def __init__(self, mailbox: Optional[str] = None, query: Optional[str] = None):
        self.mailbox = mailbox or os.environ.get("GMAIL_CV_MAILBOX", "")
        # Restricting to messages with attachments keeps the listing small;
        # the caller can narrow further, e.g. 'label:cvs'.
        self.query = query or os.environ.get("GMAIL_CV_QUERY", "has:attachment")
        self._service = None

    # -- configuration ----------------------------------------------------

    def is_configured(self) -> bool:
        if not self.mailbox:
            return False
        return bool(os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
                    or os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE"))

    def _credentials(self):
        from google.oauth2.service_account import Credentials

        raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
        if raw:
            creds = Credentials.from_service_account_info(json.loads(raw), scopes=SCOPES)
        else:
            path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE", "")
            if not path:
                raise RuntimeError("No Google service account configured")
            creds = Credentials.from_service_account_file(path, scopes=SCOPES)

        # A service account has no mailbox of its own; it acts as the user.
        return creds.with_subject(self.mailbox)

    def _client(self):
        if self._service is None:
            from googleapiclient.discovery import build

            self._service = build(
                "gmail", "v1", credentials=self._credentials(), cache_discovery=False
            )
        return self._service

    def check_access(self) -> Dict[str, Any]:
        """Confirm the mailbox can actually be read.

        Separated from `fetch` so the failure that matters most -- delegation
        not yet authorised -- is reported once, clearly, instead of surfacing
        as an opaque error midway through an import.
        """
        if not self.is_configured():
            return {"ok": False, "reason": "GMAIL_CV_MAILBOX or service account not configured"}

        try:
            profile = self._client().users().getProfile(userId="me").execute()
            return {
                "ok": True,
                "mailbox": profile.get("emailAddress"),
                "messages_total": profile.get("messagesTotal"),
            }
        except Exception as e:
            text = str(e)
            if "unauthorized_client" in text or "access_denied" in text:
                return {
                    "ok": False,
                    "reason": (
                        "Domain-wide delegation is not authorised for this service "
                        "account. A Workspace super administrator must approve its "
                        "client ID for the gmail.readonly scope."
                    ),
                }
            return {"ok": False, "reason": text[:300]}

    # -- fetching ---------------------------------------------------------

    def _build_query(self, since: Optional[str]) -> str:
        query = self.query
        if since:
            try:
                dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
                # Gmail's after: takes a date, so a day is subtracted to avoid
                # dropping messages that arrived later on the cursor's date.
                query = f"{query} after:{dt.strftime('%Y/%m/%d')}"
            except ValueError:
                logger.warning("Ignoring unparseable `since` value: %r", since)
        return query

    async def fetch(
        self, since: Optional[str] = None, limit: int = 100
    ) -> AsyncIterator[CandidateDocument]:
        import asyncio

        if not self.is_configured():
            logger.warning("Gmail connector is not configured; nothing fetched")
            return

        service = self._client()
        query = self._build_query(since)
        logger.info("Gmail fetch from %s with query %r", self.mailbox, query)

        fetched = 0
        page_token = None

        while fetched < limit:
            listing = await asyncio.to_thread(
                lambda: service.users().messages().list(
                    userId="me", q=query,
                    maxResults=min(100, limit - fetched),
                    pageToken=page_token,
                ).execute()
            )

            messages = listing.get("messages", []) or []
            if not messages:
                break

            for stub in messages:
                if fetched >= limit:
                    break

                message = await asyncio.to_thread(
                    lambda mid=stub["id"]: service.users().messages().get(
                        userId="me", id=mid, format="full"
                    ).execute()
                )

                payload = message.get("payload", {}) or {}
                sender = _sender_address(_header(payload, "From"))
                subject = _header(payload, "Subject")
                received = None
                if message.get("internalDate"):
                    received = datetime.fromtimestamp(
                        int(message["internalDate"]) / 1000, tz=timezone.utc
                    ).isoformat()

                for part in _walk_parts(payload):
                    body = part.get("body") or {}
                    attachment_id = body.get("attachmentId")
                    filename = part.get("filename") or ""
                    if not attachment_id:
                        continue
                    if not _looks_like_cv(filename, part.get("mimeType", ""), body.get("size", 0)):
                        continue

                    attachment = await asyncio.to_thread(
                        lambda aid=attachment_id, mid=message["id"]:
                            service.users().messages().attachments().get(
                                userId="me", messageId=mid, id=aid
                            ).execute()
                    )
                    data = attachment.get("data")
                    if not data:
                        continue

                    yield CandidateDocument(
                        content=base64.urlsafe_b64decode(data),
                        filename=filename,
                        source=self.name,
                        reference=f"gmail:{message['id']}",
                        sender_email=sender,
                        message_id=message["id"],
                        received_at=received,
                        subject=subject,
                        metadata={"mailbox": self.mailbox, "thread_id": message.get("threadId")},
                    )
                    fetched += 1

            page_token = listing.get("nextPageToken")
            if not page_token:
                break
