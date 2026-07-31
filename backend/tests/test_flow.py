"""Backend tests for THCO Flow (12-stage project management)."""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env file
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

ADMIN_EMAIL = "joshua@thcohq.com"
ADMIN_PASSWORD = "THCOAdmin2024!"


@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("session_token") or data.get("token")
    assert token, f"no session_token in response: {data}"
    return token


@pytest.fixture(scope="session")
def client(auth_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    })
    return s


@pytest.fixture(scope="session")
def me(client):
    r = client.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200
    return r.json()


# ----- PROJECTS -------------------------------------------------------------
class TestFlowProjects:
    def test_create_project_at_stage_1(self, client):
        r = client.post(f"{BASE_URL}/api/flow/projects", json={
            "name": "TEST_QA_FlowProject",
            "client_name": "TEST_QA Client Inc",
            "project_type": "new_client",
            "description": "QA test project for THCO Flow",
            "source": "automated_test",
        }, timeout=15)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["stage"] == 1
        assert p["status"] == "prospect"
        assert p["stage_label"] == "Prospect"
        assert re.match(r"^THCO-\d{4}-[A-F0-9]{6}$", p["project_id_display"]), p["project_id_display"]
        assert p["client_name_snapshot"] == "TEST_QA Client Inc"
        assert isinstance(p["stage_history"], list) and len(p["stage_history"]) == 1
        pytest.project_id = p["id"]
        pytest.project_id_display = p["project_id_display"]

    def test_board_returns_12_stages_and_keyed_board(self, client):
        r = client.get(f"{BASE_URL}/api/flow/projects/board", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "stages" in data and "board" in data
        assert len(data["stages"]) == 12
        # board keys may come back as strings via JSON
        keys = sorted([int(k) for k in data["board"].keys()])
        assert keys == list(range(1, 13))
        # Our created project should be in stage 1
        stage1 = data["board"].get("1") or data["board"].get(1)
        ids = [p["id"] for p in stage1]
        assert pytest.project_id in ids

    def test_transition_stage_advances(self, client):
        pid = pytest.project_id
        # Walk through 2 -> 12, asserting key milestones
        for target in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]:
            r = client.post(f"{BASE_URL}/api/flow/projects/{pid}/transition",
                            json={"target_stage": target, "note": f"to {target}"}, timeout=15)
            assert r.status_code == 200, f"stage {target}: {r.text}"
            p = r.json()
            assert p["stage"] == target
            if target == 10:
                assert p.get("signed_at"), "signed_at not set at stage 10"
            if target == 11:
                assert p.get("start_date"), "start_date not set at stage 11"
            if target == 12:
                assert p.get("completed_at"), "completed_at not set at stage 12"

    def test_get_project_has_history(self, client):
        r = client.get(f"{BASE_URL}/api/flow/projects/{pytest.project_id}", timeout=15)
        assert r.status_code == 200
        p = r.json()
        # Should have 12 history entries (1 create + 11 transitions)
        assert len(p["stage_history"]) >= 12

    def test_assign_owner(self, client, me):
        r = client.post(f"{BASE_URL}/api/flow/projects/{pytest.project_id}/assign-owner",
                        json={"delivery_owner_id": me["user_id"]}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "owner_name" in body

    def test_lose_project(self, client):
        # Create another project then mark lost
        r = client.post(f"{BASE_URL}/api/flow/projects", json={
            "name": "TEST_QA_Lost", "client_name": "TEST_QA Lost Co"
        }, timeout=15)
        assert r.status_code == 200
        pid = r.json()["id"]
        r = client.post(f"{BASE_URL}/api/flow/projects/{pid}/lose?reason=ghosted", timeout=15)
        assert r.status_code == 200


# ----- CONTACTS + EVENTS ----------------------------------------------------
class TestFlowContacts:
    def test_create_contact_with_birthday_creates_event(self, client):
        r = client.post(f"{BASE_URL}/api/flow/contacts", json={
            "full_name": "TEST_QA Birthday Person",
            "birthday": "15-06",
            "email": "test_qa_birthday@example.com",
        }, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json()
        assert "contact_id" in c
        pytest.contact_id = c["contact_id"]

        r2 = client.get(f"{BASE_URL}/api/flow/events?days=400", timeout=15)
        assert r2.status_code == 200
        events = r2.json()
        match = [e for e in events if e.get("contact_id") == c["contact_id"]]
        assert len(match) == 1
        ev = match[0]
        assert "days_until" in ev
        assert "next_occurrence" in ev


# ----- PROSPECTS ------------------------------------------------------------
class TestFlowProspects:
    def test_create_and_hand_off(self, client):
        r = client.post(f"{BASE_URL}/api/flow/prospects", json={
            "company_name": "TEST_QA Prospect Co",
            "contact_name": "Jane Lead",
        }, timeout=15)
        assert r.status_code == 200
        prospect = r.json()
        assert prospect["status"] == "researched"
        pid = prospect["prospect_id"]

        r2 = client.post(f"{BASE_URL}/api/flow/prospects/{pid}/status",
                         json={"status": "handed_off"}, timeout=15)
        assert r2.status_code == 200
        body = r2.json()
        assert body.get("project_id"), "handed_off should create a project"


# ----- TICKETS --------------------------------------------------------------
class TestFlowTickets:
    def test_ticket_workflow(self, client):
        r = client.post(f"{BASE_URL}/api/flow/tickets", json={
            "project_id": pytest.project_id,
            "title": "TEST_QA Ticket",
            "estimated_effort": "M",
        }, timeout=15)
        assert r.status_code == 200
        t = r.json()
        assert t["status"] == "queued"
        tid = t["ticket_id"]
        for s in ["in_progress", "in_review", "shipped"]:
            r2 = client.post(f"{BASE_URL}/api/flow/tickets/{tid}/status",
                             json={"status": s}, timeout=15)
            assert r2.status_code == 200
        # verify shipped_at populated
        list_r = client.get(f"{BASE_URL}/api/flow/tickets?project_id={pytest.project_id}", timeout=15)
        assert list_r.status_code == 200
        ticket = [x for x in list_r.json() if x["ticket_id"] == tid][0]
        assert ticket["shipped_at"] is not None


# ----- MESSAGES -------------------------------------------------------------
class TestFlowMessages:
    def test_tier1_message_pending_then_approve_send(self, client):
        r = client.post(f"{BASE_URL}/api/flow/messages", json={
            "contact_id": pytest.contact_id,
            "message_type": "birthday",
            "draft_content": "TEST_QA happy birthday",
            "tier": 1,
            "channel": "email",
        }, timeout=15)
        assert r.status_code == 200
        msg = r.json()
        assert msg["status"] == "pending_approval"
        mid = msg["message_id"]

        r2 = client.post(f"{BASE_URL}/api/flow/messages/{mid}/action",
                         json={"action": "approve"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("status") == "approved"

        r3 = client.post(f"{BASE_URL}/api/flow/messages/{mid}/action",
                         json={"action": "send"}, timeout=15)
        assert r3.status_code == 200
        assert r3.json().get("status") == "sent"

    def test_tier2_message_auto_approved(self, client):
        r = client.post(f"{BASE_URL}/api/flow/messages", json={
            "contact_id": pytest.contact_id,
            "message_type": "checkin",
            "draft_content": "TEST_QA check in",
            "tier": 2,
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "approved"

    def test_invalid_action_400(self, client):
        # Create message then send invalid action
        r = client.post(f"{BASE_URL}/api/flow/messages", json={
            "contact_id": pytest.contact_id,
            "draft_content": "x",
            "tier": 2,
        }, timeout=15)
        mid = r.json()["message_id"]
        r2 = client.post(f"{BASE_URL}/api/flow/messages/{mid}/action",
                         json={"action": "totally_bogus"}, timeout=15)
        assert r2.status_code == 400


# ----- ROLES ----------------------------------------------------------------
class TestFlowRoles:
    def test_roles_returns_9_flags(self, client):
        r = client.get(f"{BASE_URL}/api/flow/roles", timeout=15)
        assert r.status_code == 200
        roles = r.json()
        flags = [r["flag"] for r in roles]
        expected = [
            "is_qualifier", "is_delivery_owner", "is_pricing_owner",
            "is_executive_approver", "is_legal", "is_engineering_coordinator",
            "is_relationship_owner", "is_invoicing_owner", "is_prospect_owner",
        ]
        for f in expected:
            assert f in flags, f"missing role flag {f}"
        assert len(roles) == 9

    def test_assign_invalid_flag_400(self, client, me):
        r = client.post(f"{BASE_URL}/api/flow/roles/assign", json={
            "user_id": me["user_id"], "flag": "is_bogus", "value": True,
        }, timeout=15)
        assert r.status_code == 400

    def test_assign_valid_flag_then_revoke(self, client, me):
        r = client.post(f"{BASE_URL}/api/flow/roles/assign", json={
            "user_id": me["user_id"], "flag": "is_qualifier", "value": True,
        }, timeout=15)
        assert r.status_code == 200
        r2 = client.get(f"{BASE_URL}/api/flow/roles", timeout=15)
        qualifier_row = [x for x in r2.json() if x["flag"] == "is_qualifier"][0]
        assert any(u["user_id"] == me["user_id"] for u in qualifier_row["users"])

        r3 = client.post(f"{BASE_URL}/api/flow/roles/assign", json={
            "user_id": me["user_id"], "flag": "is_qualifier", "value": False,
        }, timeout=15)
        assert r3.status_code == 200


# ----- DASHBOARD ------------------------------------------------------------
class TestFlowDashboard:
    def test_dashboard_returns_expected_keys(self, client):
        r = client.get(f"{BASE_URL}/api/flow/dashboard", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for key in [
            "my_active_projects", "pipeline_counts", "approval_queue",
            "pending_proposals", "pending_contracts", "upcoming_events_7d",
            "events", "overdue_invoices", "prospect_counts", "my_tickets",
            "stages_meta",
        ]:
            assert key in d, f"missing dashboard key {key}"
        # 12 stages meta
        assert len(d["stages_meta"]) == 12


# ----- AUDIT LOG ------------------------------------------------------------
class TestFlowAudit:
    def test_audit_log_filter_by_project(self, client):
        r = client.get(f"{BASE_URL}/api/flow/audit-log?entity_type=project", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        assert all(it["entity_type"] == "project" for it in items)
