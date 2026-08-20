"""The mailbox cursor must never move past a CV that was not imported.

It used to. `run_connector` advanced the resume point for every document the
connector produced, before the import was even attempted, so a failure carried
the cursor past a CV that had never been read and nothing went back for it. In
August 2026 the free-tier database was busy with a bulk migration, every
document failed with code 50, and UIDs 4485-4565 were skipped permanently.

These are plain unit tests: no database, no mailbox, no running server.
"""

import asyncio
from types import SimpleNamespace

from services.connectors import runner


class _Collection:
    def __init__(self):
        self.rows = []

    async def find_one(self, *a, **k):
        return None

    async def update_one(self, *a, **k):
        return None

    async def insert_one(self, doc):
        self.rows.append(doc)

    async def find_one_and_update(self, flt, update, upsert=False, return_document=None):
        key = (flt.get("point"), flt.get("filename"))
        for k, rec in self.rows:
            if k == key:
                rec["attempts"] += 1
                return rec
        rec = {"attempts": 1}
        self.rows.append((key, rec))
        return rec


class _DB:
    def __init__(self):
        self.import_cursors = _Collection()
        self.import_runs = _Collection()
        self.import_failures = _Collection()


class _Connector:
    name = "fake"

    def __init__(self, uids):
        self._uids = uids

    def is_configured(self):
        return True

    def cursor_for(self, d):
        return d.uid

    @staticmethod
    def cursor_is_newer(candidate, current):
        if candidate is None:
            return False
        if current is None:
            return True
        return int(candidate) > int(current)

    async def fetch(self, since=None, limit=100):
        for uid in self._uids:
            yield SimpleNamespace(
                uid=str(uid), filename=f"cv{uid}.pdf", content=b"x",
                sender_email="a@b.c", message_id=str(uid), received_at=str(uid),
                import_source=lambda: {"source": "fake"},
            )


def _run(uids, failing, error, since="9"):
    db, conn = _DB(), _Connector(uids)

    async def fake_import(db_, content, filename, source):
        uid = filename[2:-4]
        if uid in failing:
            raise error
        return {"action": "created", "candidate_id": uid}

    runner.import_cv = fake_import
    return asyncio.run(runner.run_connector(db, conn, since=since, time_budget=None))


def _busy():
    e = Exception("The command being executed was terminated due to a command timeout")
    e.code = 50
    return e


def test_busy_database_does_not_carry_the_cursor_past_a_cv():
    result = _run([10, 11, 12, 13, 14], {"12"}, _busy())
    assert result["cursor"] == "11", "cursor must stay behind the CV that failed"


def test_bad_document_does_not_carry_the_cursor_past_it_on_first_attempt():
    result = _run([10, 11, 12, 13, 14], {"12"}, ValueError("corrupt pdf"))
    assert result["cursor"] == "11"


def test_clean_run_reaches_the_end():
    result = _run([10, 11, 12, 13, 14], set(), ValueError("unused"))
    assert result["cursor"] == "14"
    assert result["status"] == "completed"


def test_a_persistently_bad_document_is_set_aside_rather_than_wedging_the_mailbox():
    db, conn = _DB(), _Connector([10, 11, 12])

    async def fail_12(db_, content, filename, source):
        if "12" in filename:
            raise ValueError("corrupt pdf")
        return {"action": "created", "candidate_id": filename}

    runner.import_cv = fail_12
    for _ in range(runner.MAX_ATTEMPTS):
        result = asyncio.run(runner.run_connector(db, conn, since="9", time_budget=None))
    assert result["cursor"] == "12", "must move on once the document has had its attempts"


def test_a_busy_database_stops_the_run_instead_of_grinding_through_everything():
    result = _run(list(range(20, 40)), {str(u) for u in range(20, 40)}, _busy(), since="19")
    assert result["stopped_because"] == "database_busy"
    assert result["failed"] == runner.MAX_CONSECUTIVE_TRANSIENT
    assert result["cursor"] == "19", "nothing succeeded, so the cursor must not move"


def test_transient_and_permanent_failures_are_told_apart():
    assert runner._is_transient(_busy())
    assert runner._is_transient(Exception("ExceededTimeLimit"))
    assert not runner._is_transient(ValueError("could not parse PDF"))


def test_a_split_deck_counts_as_a_split_not_a_failure():
    # A merged recruiter deck broken into the people inside it is a success.
    # It had no bucket in the streaming path, so it landed under "failed" and
    # the first run after the 20 August restart reported a failure that had
    # imported perfectly well.
    db, conn = _DB(), _Connector([10, 11])

    async def split_everything(db_, content, filename, source):
        return {"action": "split", "candidate_id": filename}

    runner.import_cv = split_everything
    result = asyncio.run(runner.run_connector(db, conn, since="9", time_budget=None))
    assert result["split"] == 2
    assert result["failed"] == 0
    assert result["cursor"] == "11", "a split is finished with, so the cursor moves"


def test_an_outcome_nobody_recognises_holds_the_cursor():
    # If import_cv ever returns something this code has no bucket for, we
    # cannot claim the document was imported -- so the cursor must not pass it.
    db, conn = _DB(), _Connector([10, 11, 12])

    async def odd_outcome(db_, content, filename, source):
        if "11" in filename:
            return {"action": "teleported"}
        return {"action": "created", "candidate_id": filename}

    runner.import_cv = odd_outcome
    result = asyncio.run(runner.run_connector(db, conn, since="9", time_budget=None))
    assert result["failed"] == 1
    assert result["cursor"] == "10", "must stop behind the document it cannot vouch for"


def test_a_reported_failure_holds_the_cursor_too():
    db, conn = _DB(), _Connector([10, 11, 12])

    async def fails_on_11(db_, content, filename, source):
        if "11" in filename:
            return {"action": "failed", "reason": "unreadable"}
        return {"action": "created", "candidate_id": filename}

    runner.import_cv = fails_on_11
    result = asyncio.run(runner.run_connector(db, conn, since="9", time_budget=None))
    assert result["cursor"] == "10"
