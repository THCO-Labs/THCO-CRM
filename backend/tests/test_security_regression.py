"""Security and regression suite for the dashboard / control-tower work.

Run it against a running local server:

    cd backend
    ./venv/Scripts/python.exe -m pytest tests/test_security_regression.py -v

It builds its own cast of temporary users and sessions directly in Mongo, all
marked `_qa_temp: True`, and deletes them afterwards. Nothing here depends on a
particular person existing in the database, so it survives the data changing.

Why these tests and not others: the features added in August 2026 (the metrics
dashboard, the in-place control tower, and the per-function views) are almost
entirely **reads across other people's projects**, which makes broken access
control the failure that matters. OWASP A01 is therefore the bulk of it, with
A03 (NoSQL injection) and A07 (session handling) next, and a functional
regression pass so a permission fix cannot quietly break the feature.
"""

import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE = os.environ.get("QA_BASE_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE}/api"
MONGO = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "thco_crm")

# Every endpoint this work added or changed, with the method used to reach it.
# Kept as data so the "must refuse an anonymous caller" test cannot fall behind
# the router: adding a route here is one line.
NEW_ENDPOINTS = [
    ("GET", "/control-tower/functions"),
    ("GET", "/control-tower/function/senior_partner"),
    ("GET", "/control-tower/function/tsd"),
    ("GET", "/control-tower/function/legal"),
    ("GET", "/control-tower/function/finance"),
    ("GET", "/control-tower/function/qa"),
    ("GET", "/control-tower/function/engineer"),
    ("GET", "/control-tower/function/talent_sd"),
    ("GET", "/control-tower/portfolio"),
    ("GET", "/control-tower/exceptions"),
    ("GET", "/control-tower/search?q=test"),
    ("GET", "/tasks/cards/mine"),
    ("GET", "/tasks/projects/summary"),
]

FUNCTION_KEYS = [
    "senior_partner", "tsd", "engineer",
    "talent_sd", "legal", "finance", "qa",
]


# ---------------------------------------------------------------------------
# Cast
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO, serverSelectionTimeoutMS=4000)
    client.admin.command("ping")
    yield client[DB_NAME]
    client.close()


def _make_user(db, **fields):
    uid = "user_qa" + uuid.uuid4().hex[:10]
    doc = {
        "user_id": uid,
        "name": fields.pop("name", "QA User"),
        "email": f"{uid}@qa-thco-fixture.com",
        "role": "team_member",
        "status": "active",
        "accessible_units": ["flow"],
        "_qa_temp": True,
    }
    doc.update(fields)
    db.users.insert_one(doc)
    return doc


def _session_for(db, user, hours=2):
    token = "qa-sec-" + uuid.uuid4().hex
    db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user["user_id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=hours),
        "created_at": datetime.now(timezone.utc),
        "_qa_temp": True,
    })
    return token


@pytest.fixture(scope="module")
def cast(db):
    """Personas spanning every access level the new code branches on."""
    people = {
        "admin": _make_user(db, name="QA Admin", role="super_admin",
                            function_role="senior_partner"),
        # Legal and Finance pass `can_view_all_projects` but are NOT admins.
        # They are the reason the function-view gate is `is_admin`.
        "legal": _make_user(db, name="QA Legal", function_role="legal"),
        "finance": _make_user(db, name="QA Finance", function_role="finance"),
        "tsd": _make_user(db, name="QA TSD", function_role="tsd"),
        "engineer": _make_user(db, name="QA Engineer", function_role="engineer",
                               accessible_units=["flow", "technology"]),
        # Holds no delivery function at all.
        "outsider": _make_user(db, name="QA Outsider", function_role=None,
                               accessible_units=[]),
    }
    tokens = {k: _session_for(db, u) for k, u in people.items()}

    # A project owned by nobody in this cast, used to prove that being able to
    # guess an id is not a way in.
    pid = str(uuid.uuid4())
    db.projects.insert_one({
        "id": pid,
        "name": "QA Isolation Project",
        "project_id_display": "QA-ISOLATION",
        "client_name_snapshot": "QA Client",
        "stage": 12,
        "status": "active",
        "health": "RED",
        "health_reason": "QA fixture, must not leak",
        "tsd_id": "user_qa_nobody",
        "created_by": "user_qa_nobody",
        "total_value": 999999,
        "currency": "GBP",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "_qa_temp": True,
    })

    yield {"users": people, "tokens": tokens, "isolated_project": pid}

    db.users.delete_many({"_qa_temp": True})
    db.user_sessions.delete_many({"_qa_temp": True})
    db.projects.delete_many({"_qa_temp": True})


def get(path, token=None, timeout=30):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.get(f"{API}{path}", headers=headers, timeout=timeout)


# ===========================================================================
# A01 — Broken access control
# ===========================================================================
class TestAnonymousAccess:
    @pytest.mark.parametrize("method,path", NEW_ENDPOINTS)
    def test_endpoint_refuses_anonymous_caller(self, method, path):
        r = requests.request(method, f"{API}{path}", timeout=30)
        assert r.status_code == 401, (
            f"{method} {path} answered {r.status_code} without credentials"
        )

    @pytest.mark.parametrize("token", ["", "garbage", "session_" + "0" * 32,
                                       "qa-sec-does-not-exist"])
    def test_forged_token_refused(self, token):
        assert get("/control-tower/functions", token).status_code == 401


class TestFunctionViewGate:
    """The switcher is administrators only. This is the rule most likely to
    rot, because the obvious gate (`can_view_all_projects`) is the wrong one:
    it also admits Legal and Finance."""

    def test_admin_may_switch_to_every_view(self, cast):
        meta = get("/control-tower/functions", cast["tokens"]["admin"]).json()
        assert meta["can_switch"] is True
        assert {o["key"] for o in meta["available"]} == set(FUNCTION_KEYS)
        for key in FUNCTION_KEYS:
            r = get(f"/control-tower/function/{key}", cast["tokens"]["admin"])
            assert r.status_code == 200, f"admin refused {key}: {r.text[:200]}"

    @pytest.mark.parametrize("persona,own", [
        ("legal", "legal"), ("finance", "finance"),
        ("tsd", "tsd"), ("engineer", "engineer"),
    ])
    def test_non_admin_gets_only_their_own_function(self, cast, persona, own):
        token = cast["tokens"][persona]
        meta = get("/control-tower/functions", token).json()
        assert meta["can_switch"] is False, f"{persona} was offered the switcher"
        assert [o["key"] for o in meta["available"]] == [own]
        assert meta["mine"] == own

        assert get(f"/control-tower/function/{own}", token).status_code == 200
        for other in [k for k in FUNCTION_KEYS if k != own]:
            r = get(f"/control-tower/function/{other}", token)
            assert r.status_code == 403, (
                f"{persona} reached the {other} view ({r.status_code})"
            )

    def test_person_with_no_function_gets_nothing(self, cast):
        token = cast["tokens"]["outsider"]
        meta = get("/control-tower/functions", token).json()
        assert meta["mine"] is None
        assert meta["available"] == []
        assert meta["can_switch"] is False
        for key in FUNCTION_KEYS:
            assert get(f"/control-tower/function/{key}", token).status_code == 403

    def test_unknown_function_is_not_found_not_forbidden_leak(self, cast):
        r = get("/control-tower/function/ceo", cast["tokens"]["admin"])
        assert r.status_code == 404

    @pytest.mark.parametrize("probe", [
        "%2e%2e%2fportfolio", "senior_partner%00",
        "SENIOR_PARTNER", "senior_partner%20",
    ])
    def test_function_key_cannot_be_smuggled(self, cast, probe):
        r = get(f"/control-tower/function/{probe}", cast["tokens"]["outsider"])
        assert r.status_code in (403, 404, 422), (
            f"probe {probe!r} answered {r.status_code}"
        )


class TestProjectIsolation:
    """A project nobody in the cast owns must not appear in anybody's view.

    Legal and Finance are the deliberate exception: `can_view_all_projects`
    admits them so they can *locate* a project, because a contract officer who
    cannot find the engagement they are papering has an unusable role. What
    they must not get is the delivery internals -- and that is enforced by
    `sees_commercial_slice_only` handing them a different object, not by
    hiding fields. Both halves are asserted below.
    """

    def _body(self, path, token):
        r = get(path, token)
        return r.text if r.status_code == 200 else ""

    @pytest.mark.parametrize("persona", ["tsd", "engineer", "outsider"])
    def test_foreign_project_never_leaks(self, cast, persona):
        token = cast["tokens"][persona]
        pid = cast["isolated_project"]
        for path in ["/control-tower/portfolio", "/control-tower/exceptions",
                     "/tasks/projects/summary", "/tasks/cards/mine",
                     "/control-tower/search?q=Isolation"]:
            body = self._body(path, token)
            assert pid not in body, f"{persona} saw the foreign project via {path}"
            assert "must not leak" not in body, (
                f"{persona} saw its health reason via {path}"
            )

    @pytest.mark.parametrize("persona", ["tsd", "engineer"])
    def test_own_function_view_excludes_foreign_project(self, cast, persona):
        token = cast["tokens"][persona]
        own = get("/control-tower/functions", token).json()["mine"]
        body = get(f"/control-tower/function/{own}", token).text
        assert cast["isolated_project"] not in body

    @pytest.mark.parametrize("persona", ["legal", "finance"])
    def test_commercial_roles_get_the_slice_not_the_record(self, cast, persona):
        data = get("/control-tower/portfolio", cast["tokens"][persona]).json()
        assert data["commercial_slice"] is True, (
            f"{persona} was handed the full delivery record"
        )
        for card in data["projects"]:
            for internal in ("open_risks", "requirements", "awaiting_architect"):
                assert internal not in card, (
                    f"{persona} received delivery internals ({internal})"
                )

    @pytest.mark.parametrize("persona", ["legal", "finance"])
    def test_commercial_roles_cannot_read_delivery_text(self, cast, persona):
        """Search is the widest read in the system. Client feedback, documents
        and blockers are delivery material and must stay out of it."""
        data = get("/control-tower/search?q=the", cast["tokens"][persona]).json()
        kinds = {r["type"] for r in data["results"]}
        assert not (kinds & {"feedback", "document", "blocker"}), (
            f"{persona} searched delivery material: {kinds}"
        )

    def test_admin_does_see_it(self, cast):
        """The isolation tests would pass trivially if the fixture were simply
        invisible to everyone, so prove it is reachable by somebody."""
        body = get("/control-tower/portfolio", cast["tokens"]["admin"]).text
        assert cast["isolated_project"] in body


class TestTaskBoardIsolation:
    def test_my_cards_only_returns_my_cards(self, cast, db):
        token = cast["tokens"]["tsd"]
        uid = cast["users"]["tsd"]["user_id"]
        data = get("/tasks/cards/mine", token).json()
        for card in data["cards"]:
            row = db.task_cards.find_one({"card_id": card["card_id"]}, {"_id": 0})
            assert row is not None
            assert any(a.get("user_id") == uid for a in row.get("assignees") or []), (
                f"card {card['card_id']} is not assigned to the caller"
            )

    def test_my_cards_counts_are_non_negative_and_consistent(self, cast):
        data = get("/tasks/cards/mine", cast["tokens"]["admin"]).json()
        for key in ("open", "overdue", "due_this_week", "done"):
            assert data[key] >= 0
        assert data["overdue"] + data["due_this_week"] <= data["open"]
        assert len(data["cards"]) <= data["open"]

    def test_my_cards_limit_is_bounded(self, cast):
        token = cast["tokens"]["admin"]
        assert get("/tasks/cards/mine?limit=0", token).json()["cards"] == []
        # A negative limit must not raise or invert the slice.
        r = get("/tasks/cards/mine?limit=-5", token)
        assert r.status_code == 200
        assert r.json()["cards"] == []


# ===========================================================================
# A03 — Injection
# ===========================================================================
class TestNoSqlInjection:
    @pytest.mark.parametrize("payload", [
        '{"$ne": null}', '{"$gt": ""}', '{"$regex": ".*"}',
        "'; return true; //", '{"$where": "1==1"}',
    ])
    def test_operator_payloads_do_not_widen_a_query(self, cast, payload):
        """Query params are typed as `str` by FastAPI, so a Mongo operator
        object cannot arrive through one. This proves it rather than assuming
        it: the response must be an ordinary empty result, never a 500 and
        never the whole collection."""
        r = get(f"/control-tower/search?q={requests.utils.quote(payload)}",
                cast["tokens"]["admin"])
        assert r.status_code == 200, r.text[:300]
        assert r.json()["total"] == 0, "an operator payload matched documents"

    @pytest.mark.parametrize("term", ["(a+)+$", "a" * 2000, ".*.*.*.*.*.*.*"])
    def test_search_is_not_a_regex_engine(self, cast, term):
        """`re.escape` means a crafted pattern is searched literally, so this
        cannot become a CPU denial of service."""
        r = get(f"/control-tower/search?q={requests.utils.quote(term)}",
                cast["tokens"]["admin"], timeout=15)
        assert r.status_code == 200
        assert r.json()["total"] == 0

    def test_limit_params_reject_nonsense(self, cast):
        for value in ["abc", "9e99", "--1"]:
            r = get(f"/tasks/cards/mine?limit={value}", cast["tokens"]["admin"])
            assert r.status_code in (200, 422), f"limit={value} gave {r.status_code}"


# ===========================================================================
# A07 — Identification and authentication failures
# ===========================================================================
class TestSessions:
    def test_expired_session_is_refused(self, db, cast):
        user = cast["users"]["tsd"]
        token = "qa-sec-" + uuid.uuid4().hex
        db.user_sessions.insert_one({
            "session_token": token,
            "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) - timedelta(minutes=1),
            "created_at": datetime.now(timezone.utc) - timedelta(days=2),
            "_qa_temp": True,
        })
        assert get("/control-tower/functions", token).status_code == 401

    def test_disabling_an_account_ends_its_sessions_at_once(self, db, cast):
        """Identity is cached for `AUTH_CACHE_SECONDS` (45 by default), so the
        question that matters is not whether the cache exists but whether
        disabling somebody is felt immediately. `update_user` drops the whole
        cache when a field that decides access changes, and this proves it
        end to end -- through the API, which is the only path an administrator
        actually has. A row edited straight in the database is *not* picked up
        until the cache expires, which is expected and is why nobody should be
        deactivating people with a Mongo shell."""
        victim = _make_user(db, name="QA Victim", function_role="tsd")
        token = _session_for(db, victim)
        assert get("/control-tower/functions", token).status_code == 200

        r = requests.put(
            f"{API}/users/{victim['user_id']}",
            json={"status": "disabled"},
            headers={"Authorization": f"Bearer {cast['tokens']['admin']}"},
            timeout=30,
        )
        assert r.status_code == 200, f"could not disable the account: {r.text[:200]}"

        after = get("/control-tower/functions", token)
        assert after.status_code in (401, 403), (
            f"a disabled account still had access ({after.status_code})"
        )

    def test_deleting_an_account_destroys_its_sessions(self, db, cast):
        victim = _make_user(db, name="QA Deleted", function_role="tsd")
        token = _session_for(db, victim)
        assert get("/control-tower/functions", token).status_code == 200

        r = requests.delete(
            f"{API}/users/{victim['user_id']}",
            headers={"Authorization": f"Bearer {cast['tokens']['admin']}"},
            timeout=30,
        )
        assert r.status_code == 200, f"could not delete the account: {r.text[:200]}"

        assert db.user_sessions.count_documents(
            {"user_id": victim["user_id"]}
        ) == 0, "the deleted account kept its sessions"
        after = get("/control-tower/functions", token)
        assert after.status_code in (401, 403), (
            f"a deleted account still had access ({after.status_code})"
        )


# ===========================================================================
# Functional regression — the features themselves still work
# ===========================================================================
class TestFunctionViewContract:
    @pytest.mark.parametrize("key", FUNCTION_KEYS)
    def test_shape_is_renderable(self, cast, key):
        """The browser renders whatever comes back, so a malformed section is
        a blank panel in production rather than an error anybody notices."""
        data = get(f"/control-tower/function/{key}", cast["tokens"]["admin"]).json()
        assert data["function"] == key
        assert data["label"]
        assert isinstance(data["sections"], list) and data["sections"]
        seen = set()
        for section in data["sections"]:
            for field in ("key", "title", "empty", "columns", "rows"):
                assert field in section, f"{key}.{section.get('key')} lacks {field}"
            assert section["key"] not in seen, "duplicate section key"
            seen.add(section["key"])
            assert section["columns"], f"{key}.{section['key']} has no columns"
            keys = {c["key"] for c in section["columns"]}
            for column in section["columns"]:
                assert column.get("label"), "a column has no header"
            for row in section["rows"]:
                # Every row is clickable, and every column can find its value.
                assert row.get("project_id"), "a row cannot be opened"
                missing = keys - set(row)
                assert not missing, (
                    f"{key}.{section['key']} row missing {missing}"
                )
        assert data["total_rows"] == sum(len(s["rows"]) for s in data["sections"])

    def test_totals_match_the_rows(self, cast):
        for key in FUNCTION_KEYS:
            data = get(f"/control-tower/function/{key}", cast["tokens"]["admin"]).json()
            assert data["total_rows"] == sum(len(s["rows"]) for s in data["sections"])

    def test_closed_projects_are_excluded(self, cast, db):
        """A function view is a list of things to do; a finished project is
        not one of them."""
        closed = {p["id"] for p in db.projects.find({"stage": {"$gte": 17}}, {"id": 1})}
        if not closed:
            pytest.skip("no closed projects in this database")
        for key in FUNCTION_KEYS:
            body = get(f"/control-tower/function/{key}", cast["tokens"]["admin"]).text
            assert not (closed & {c for c in closed if c in body}), (
                f"{key} listed a closed project"
            )


class TestDashboardData:
    def test_portfolio_summary_is_internally_consistent(self, cast):
        data = get("/control-tower/portfolio", cast["tokens"]["admin"]).json()
        s = data["summary"]
        assert s["red"] + s["amber"] + s["green"] == s["total"], (
            "health counts do not add up to the total"
        )
        assert len(data["projects"]) == s["total"]
        assert sum(p["count"] for p in data["by_phase"]) == s["total"], (
            "the phase lanes do not add up to the portfolio"
        )
        for bound in ("stalled", "blocked"):
            assert 0 <= s[bound] <= s["total"]

    def test_exceptions_are_ranked_and_navigable(self, cast):
        data = get("/control-tower/exceptions", cast["tokens"]["admin"]).json()
        severities = [row["severity"] for row in data["exceptions"]]
        assert severities == sorted(severities, reverse=True), "not worst-first"
        for row in data["exceptions"]:
            assert row["link"].startswith("/flow/projects/")
            assert row["title"] and row["kind"]
        assert data["total"] == len(data["exceptions"])
        assert data["projects_affected"] == len(
            {r["project_id"] for r in data["exceptions"]}
        )

    def test_dashboard_calls_survive_a_person_with_nothing(self, cast):
        """The dashboard settles each call independently, but an outright 500
        would still be a bug the user sees as a missing panel."""
        token = cast["tokens"]["outsider"]
        for path in ["/control-tower/portfolio", "/control-tower/exceptions",
                     "/tasks/cards/mine", "/tasks/projects/summary"]:
            r = get(path, token)
            assert r.status_code == 200, f"{path} gave {r.status_code}"


# ===========================================================================
# A05 — Security misconfiguration
# ===========================================================================
class TestConfiguration:
    def test_api_docs_are_not_public(self):
        """An unauthenticated caller should not be handed a map of every
        endpoint, its parameters and its schemas.

        Status alone proves nothing here: the SPA catch-all answers 200 with
        index.html for any unmatched path, which is correct. What matters is
        whether the *content* is the schema or the Swagger page.
        """
        exposed = []
        for path in ("/docs", "/redoc", "/openapi.json"):
            body = requests.get(f"{BASE}{path}", timeout=15).text
            if any(m in body for m in ('"openapi"', "swagger-ui", "redoc.standalone")):
                exposed.append(path)
        assert not exposed, f"interactive API docs are public: {exposed}"

    def test_cors_does_not_reflect_arbitrary_origins(self):
        r = requests.options(
            f"{API}/control-tower/functions",
            headers={"Origin": "https://evil.example",
                     "Access-Control-Request-Method": "GET"},
            timeout=15,
        )
        allowed = r.headers.get("access-control-allow-origin")
        assert allowed != "https://evil.example", "CORS reflects any origin"
        assert allowed != "*" or r.headers.get("access-control-allow-credentials") != "true"

    def test_errors_do_not_leak_tracebacks(self, cast):
        r = get("/control-tower/function/%ff", cast["tokens"]["admin"])
        assert "Traceback" not in r.text
        assert "site-packages" not in r.text

    @pytest.mark.parametrize("header,expected", [
        ("X-Content-Type-Options", "nosniff"),
        ("X-Frame-Options", "DENY"),
        ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ])
    def test_security_headers_are_sent(self, cast, header, expected):
        r = get("/control-tower/functions", cast["tokens"]["admin"])
        assert r.headers.get(header) == expected, (
            f"{header} is {r.headers.get(header)!r}"
        )

    def test_hsts_is_not_sent_over_plain_http(self, cast):
        """Correct behaviour locally: an HSTS header on an http:// origin would
        make the development server unreachable after one visit."""
        r = get("/control-tower/functions", cast["tokens"]["admin"])
        if r.url.startswith("http://"):
            assert "Strict-Transport-Security" not in r.headers


class TestLoginThrottle:
    """A01/A07: bcrypt makes a guess slow, but slow is not a rate limit."""

    def test_repeated_failures_are_locked_out(self, db):
        victim = _make_user(db, name="QA Throttle", function_role="tsd",
                            password_hash="$2b$12$" + "x" * 53)
        statuses = []
        for _ in range(12):
            r = requests.post(
                f"{API}/auth/login",
                json={"email": victim["email"], "password": "definitely-wrong"},
                timeout=30,
            )
            statuses.append(r.status_code)
            if r.status_code == 429:
                break
        assert 429 in statuses, (
            f"unlimited password guesses were accepted: {statuses}"
        )
        # The lockout must arrive before an attacker gets many tries.
        assert statuses.index(429) <= 10, f"lockout came too late: {statuses}"

    def test_lockout_response_tells_the_caller_when_to_retry(self, db):
        victim = _make_user(db, name="QA Throttle Two", function_role="tsd",
                            password_hash="$2b$12$" + "y" * 53)
        last = None
        for _ in range(12):
            last = requests.post(
                f"{API}/auth/login",
                json={"email": victim["email"], "password": "nope"},
                timeout=30,
            )
            if last.status_code == 429:
                break
        assert last.status_code == 429
        assert last.headers.get("Retry-After", "").isdigit()
        assert "password" not in last.text.lower(), (
            "the lockout message discloses more than it should"
        )
