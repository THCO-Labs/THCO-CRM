"""Read CVs from a mailbox over IMAP.

An alternative to the Gmail API connector for cases where domain-wide
delegation is not available -- it needs only the mailbox's own credentials,
so a mailbox owner can enable it without a Workspace administrator.

Implements the same `Connector` contract, so parsing, identity matching,
versioning and audit are unchanged; only the way documents are located
differs.

Configuration:
    GMAIL_CV_MAILBOX      address to sign in as
    GMAIL_IMAP_PASSWORD   app password (not the account password)
    IMAP_HOST             defaults to imap.gmail.com
    IMAP_FOLDER           defaults to INBOX
"""

import email
import imaplib
import logging
import os
import re
import ssl
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime
from typing import Any, AsyncIterator, List, Optional, Tuple

from services.connectors.base import CandidateDocument, Connector

logger = logging.getLogger(__name__)

CV_EXTENSIONS = (".pdf", ".doc", ".docx", ".rtf", ".odt", ".txt")
SKIP_MIME_PREFIXES = ("image/", "video/", "audio/")
MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

# Fetched in batches so a large mailbox is not pulled into memory at once --
# the THCO inbox alone holds tens of thousands of messages with attachments.
BATCH_SIZE = 25


def _decode(value: Optional[str]) -> str:
    """Decode a MIME-encoded header into readable text."""
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def _sender_address(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", raw)
    return match.group(0) if match else None


def _looks_like_cv(filename: str, content_type: str, size: int) -> bool:
    if not filename:
        return False
    if any(content_type.startswith(p) for p in SKIP_MIME_PREFIXES):
        return False
    if size and size > MAX_ATTACHMENT_BYTES:
        return False
    return filename.lower().endswith(CV_EXTENSIONS)


class ImapMailboxConnector(Connector):
    """Fetch CV attachments from a mailbox over IMAP."""

    # Reported as "gmail" so provenance reads naturally to a recruiter; the
    # transport is an implementation detail recorded in metadata.
    name = "gmail"

    def __init__(self, mailbox: Optional[str] = None, password: Optional[str] = None,
                 host: Optional[str] = None, folder: Optional[str] = None):
        self.mailbox = mailbox or os.environ.get("GMAIL_CV_MAILBOX", "")
        self.password = password or os.environ.get("GMAIL_IMAP_PASSWORD", "")
        self.host = host or os.environ.get("IMAP_HOST", "imap.gmail.com")
        self.folder = folder or os.environ.get("IMAP_FOLDER", "INBOX")

    def is_configured(self) -> bool:
        return bool(self.mailbox and self.password)

    def cursor_for(self, document: CandidateDocument) -> Optional[str]:
        """Resume on message UID rather than date.

        UIDs increase monotonically within a mailbox and are unique, whereas
        Date headers are set by the sender -- they are neither reliable nor
        ordered, so a timestamp cursor would skip or repeat messages.
        """
        uid = document.metadata.get("uid")
        return str(uid) if uid is not None else None

    def _connect(self) -> imaplib.IMAP4_SSL:
        client = imaplib.IMAP4_SSL(self.host, 993, ssl_context=ssl.create_default_context())
        client.login(self.mailbox, self.password)
        # Read-only: this must never mark mail as read or alter the mailbox.
        client.select(self.folder, readonly=True)
        return client

    def check_access(self, since: Optional[str] = None) -> dict:
        """Confirm the mailbox is reachable, reported separately from importing.

        Reports the size of the inbox and, separately, how much of it the
        importer actually has to work through. Those are very different
        numbers -- the importer only looks at mail carrying a document -- and
        showing only the inbox total made the backlog look like tens of
        thousands of messages when most of them are ordinary correspondence
        the import will never open.
        """
        if not self.is_configured():
            return {"ok": False, "reason": "GMAIL_CV_MAILBOX or GMAIL_IMAP_PASSWORD is not set"}
        try:
            client = self._connect()
            typ, data = client.uid("search", None, "ALL")
            total = len(data[0].split()) if data and data[0] else 0

            matching = self._search_uids(client, None)
            since_uid = int(since) if since and str(since).isdigit() else None
            remaining = [u for u in matching if since_uid is None or u > since_uid]

            client.logout()
            return {"ok": True, "mailbox": self.mailbox, "folder": self.folder,
                    "messages_total": total,
                    # Mail carrying a PDF/DOC attachment -- the only mail the
                    # importer opens.
                    "with_documents": len(matching),
                    "remaining": len(remaining)}
        except imaplib.IMAP4.error as e:
            text = str(e)
            if "AUTHENTICATIONFAILED" in text.upper() or "Invalid credentials" in text:
                return {"ok": False, "reason": (
                    "The mailbox rejected these credentials. An app password is required "
                    "-- an ordinary account password will not work -- and IMAP must be "
                    "enabled on the account."
                )}
            return {"ok": False, "reason": text[:300]}
        except Exception as e:
            return {"ok": False, "reason": f"{type(e).__name__}: {str(e)[:250]}"}

    def _search_uids(self, client: imaplib.IMAP4_SSL, since_uid: Optional[int]) -> List[int]:
        """UIDs of messages carrying a document attachment.

        UIDs are used rather than sequence numbers because sequence numbers
        shift as a mailbox changes, which would make a stored cursor
        meaningless between runs.
        """
        criteria: Tuple[Any, ...]
        if self.host.endswith("gmail.com"):
            # Gmail's own search is far more selective than IMAP's, so the
            # server does the filtering instead of us downloading everything.
            query = "has:attachment (filename:pdf OR filename:doc OR filename:docx)"
            criteria = ("X-GM-RAW", f'"{query}"')
        else:
            criteria = ("ALL",)

        typ, data = client.uid("search", None, *criteria)
        if typ != "OK" or not data or not data[0]:
            return []

        uids = [int(x) for x in data[0].split()]
        if since_uid:
            uids = [u for u in uids if u > since_uid]
        return sorted(uids)

    async def fetch(
        self, since: Optional[str] = None, limit: int = 100
    ) -> AsyncIterator[CandidateDocument]:
        import asyncio

        if not self.is_configured():
            logger.warning("IMAP connector is not configured; nothing fetched")
            return

        # The cursor is the highest UID already seen, stored as a string.
        since_uid = None
        if since and str(since).isdigit():
            since_uid = int(since)

        client = await asyncio.to_thread(self._connect)
        try:
            uids = await asyncio.to_thread(self._search_uids, client, since_uid)
            logger.info(
                "IMAP %s: %d candidate message(s) after UID %s",
                self.mailbox, len(uids), since_uid,
            )

            yielded = 0
            for start in range(0, len(uids), BATCH_SIZE):
                if yielded >= limit:
                    break
                batch = uids[start:start + BATCH_SIZE]

                for uid in batch:
                    if yielded >= limit:
                        break

                    typ, data = await asyncio.to_thread(
                        lambda u=uid: client.uid("fetch", str(u), "(BODY.PEEK[])")
                    )
                    if typ != "OK" or not data or not data[0]:
                        continue

                    message = email.message_from_bytes(data[0][1])
                    sender = _sender_address(message.get("From"))
                    subject = _decode(message.get("Subject"))

                    received = None
                    if message.get("Date"):
                        try:
                            received = parsedate_to_datetime(message["Date"]).astimezone(
                                timezone.utc
                            ).isoformat()
                        except Exception:
                            pass

                    for part in message.walk():
                        if part.get_content_maintype() == "multipart":
                            continue
                        filename = _decode(part.get_filename())
                        if not filename:
                            continue

                        payload = part.get_payload(decode=True)
                        if not payload:
                            continue
                        if not _looks_like_cv(filename, part.get_content_type(), len(payload)):
                            continue

                        yield CandidateDocument(
                            content=payload,
                            filename=filename,
                            source=self.name,
                            reference=f"imap:{uid}",
                            sender_email=sender,
                            message_id=(message.get("Message-ID") or f"uid:{uid}").strip("<>"),
                            received_at=received,
                            subject=subject,
                            metadata={
                                "mailbox": self.mailbox,
                                "folder": self.folder,
                                "transport": "imap",
                                "uid": uid,
                            },
                        )
                        yielded += 1
                        if yielded >= limit:
                            break
        finally:
            try:
                await asyncio.to_thread(client.logout)
            except Exception:
                pass
