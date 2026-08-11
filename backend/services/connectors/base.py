"""The contract every CV source implements."""

from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, Optional


@dataclass
class CandidateDocument:
    """One CV located by a connector, with enough provenance to trace it back.

    `content` is the raw file. Everything else describes where it came from,
    and is stored on the resume version so a recruiter can answer "where did
    this CV come from?" months later.
    """

    content: bytes
    filename: str
    source: str
    reference: Optional[str] = None          # message id, file id, path
    sender_email: Optional[str] = None       # who supplied it
    message_id: Optional[str] = None         # provider message id
    received_at: Optional[str] = None        # ISO timestamp
    subject: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def import_source(self) -> Dict[str, Any]:
        """The provenance dict `candidate_import.import_cv` expects."""
        return {
            "source": self.source,
            "reference": self.reference,
            "sender_email": self.sender_email,
            "message_id": self.message_id,
            "received_at": self.received_at,
            "subject": self.subject,
            **self.metadata,
        }


class Connector:
    """Base class for a CV source.

    Subclasses locate documents; they never write to the database. Keeping
    that boundary means a connector can be tested with no database at all, and
    that import behaviour cannot drift between sources.
    """

    name: str = "unknown"

    def is_configured(self) -> bool:
        """Whether this connector has what it needs to run."""
        raise NotImplementedError

    async def fetch(
        self, since: Optional[str] = None, limit: int = 100
    ) -> AsyncIterator[CandidateDocument]:
        """Yield documents, oldest first.

        `since` is an ISO timestamp or provider-specific cursor, so a run can
        resume where the last one finished rather than re-reading a mailbox
        from the beginning.
        """
        raise NotImplementedError
        yield  # pragma: no cover - makes this an async generator

    async def list_refs(self, since: Optional[str] = None) -> list:
        """Every message this connector would open, as opaque references.

        Cheap by design: it locates work without downloading it, so the queue
        can be filled in one pass and then drained a message at a time.
        """
        raise NotImplementedError

    async def fetch_ref(self, ref: str) -> list:
        """The documents carried by one message, by its reference.

        The queue hands out one message at a time, so a connector must be able
        to open a specific message rather than only stream a range of them.
        """
        raise NotImplementedError

    def cursor_for(self, document: CandidateDocument) -> Optional[str]:
        """The resume point this document represents.

        Defaults to the received timestamp, which suits sources searched by
        date. Sources with a stable monotonic identifier should override --
        IMAP returns the message UID, because timestamps are neither unique
        nor reliably ordered across a mailbox.
        """
        return document.received_at

    @staticmethod
    def cursor_is_newer(candidate: Optional[str], current: Optional[str]) -> bool:
        """Whether `candidate` advances past `current`.

        Numeric cursors are compared as numbers; a plain string comparison
        would rank UID 9 above UID 10.
        """
        if candidate is None:
            return False
        if current is None:
            return True
        if str(candidate).isdigit() and str(current).isdigit():
            return int(candidate) > int(current)
        return str(candidate) > str(current)
