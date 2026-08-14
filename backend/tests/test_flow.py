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
        # Stage 1 was renamed "Prospect" -> "New Client" (see STAGES map and
        # LEGACY_STAGE_MAP in flow.py); the canonical value is new_client.
        assert p["status"] == "new_client"
        assert p["stage_label"] == "New Client"
        assert re.match(r"^THCO-\d{4}-[A-F0-9]{6}$", p["project_id_display"]), p["project_id_display"]
        assert p["client_name_snapshot"] == "TEST_QA Client Inc"
        assert isinstance(p["stage_history"], list) and len(p["stage_history"]) == 1
        pytest.project_id = p["id"]
        pytest.project_id_display = p["project_id_display"]

    def test_board_returns_10_stages_and_keyed_board(self, client):
        r = client.get(f"{BASE_URL}/api/flow/projects/board", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "stages" in data and "board" in data
        # The pipeline was collapsed 12 -> 10 stages (see STAGES in flow.py).
        assert len(data["stages"]) == 10
        # board keys may come back as strings via JSON
        keys = sorted([int(k) for k in data["board"].keys()])
        assert keys == list(range(1, 11))
        # Our created project should be in stage 1
        stage1 = data["board"].get("1") or data["board"].get(1)
        ids = [p["id"] for p in stage1]
        assert pytest.project_id in ids

    def test_transition_stage_advances(self, client, me):
        pid = pytest.project_id
        owner_id = me["user_id"]
        # Walk 2 -> 10, asserting key milestones. Stage 2 names the delivery
        # owner; Stage 5 requires both an operations owner and an engineer
        # before it splits into the proposal/build tracks.
        for target in [2, 3, 4, 5, 6, 7, 8, 9, 10]:
            payload = {}
            if target == 2:
                payload["delivery_owner_id"] = owner_id
            if target == 5:
                payload["operations_owner_id"] = owner_id
                payload["engineer_id"] = owner_id
            r = client.post(f"{BASE_URL}/api/flow/projects/{pid}/transition",
                            json={"target_stage": target, "note": f"to {target}",
                                  "payload": payload}, timeout=15)
            assert r.status_code == 200, f"stage {target}: {r.text}"
            p = r.json()
            assert p["stage"] == target
            if target == 9:
                assert p.get("start_date"), "start_date not set at stage 9"
            if target == 10:
                assert p.get("completed_at"), "completed_at not set at stage 10"

    def test_get_project_has_history(self, client):
        r = client.get(f"{BASE_URL}/api/flow/projects/{pytest.project_id}", timeout=15)
        assert r.status_code == 200
        p = r.json()
        # 10 history entries (1 create + 9 transitions)
        assert len(p["stage_history"]) >= 10

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
            "phone": "+15551234567",
            "whatsapp": "+15551234567",
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

    def test_edit_ticket(self, client):
        r = client.post(f"{BASE_URL}/api/flow/tickets", json={
            "project_id": pytest.project_id,
            "title": "TEST_QA Ticket To Edit",
            "acceptance_criteria": "before edit",
            "estimated_effort": "S",
        }, timeout=15)
        assert r.status_code == 200, r.text
        tid = r.json()["ticket_id"]

        r2 = client.put(f"{BASE_URL}/api/flow/tickets/{tid}", json={
            "title": "TEST_QA Ticket Edited",
            "acceptance_criteria": "after edit",
            "estimated_effort": "L",
        }, timeout=15)
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["title"] == "TEST_QA Ticket Edited"
        assert body["acceptance_criteria"] == "after edit"
        assert body["estimated_effort"] == "L"

        # The edit persists through a fresh list.
        list_r = client.get(f"{BASE_URL}/api/flow/tickets?project_id={pytest.project_id}", timeout=15)
        assert list_r.status_code == 200
        ticket = [x for x in list_r.json() if x["ticket_id"] == tid][0]
        assert ticket["title"] == "TEST_QA Ticket Edited"
        assert ticket["estimated_effort"] == "L"


# ----- COLLABORATORS (add/remove notifications) ------------------------------
class TestFlowCollaborators:
    def test_removing_collaborator_notifies(self, client):
        import uuid as _uuid
        email = f"test_qa_collab_{_uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "CollabPass123!",
            "name": "TEST_QA Collab",
        }, timeout=15)
        assert reg.status_code == 200, reg.text
        collab = reg.json()
        collab_id = collab["user_id"]
        collab_token = collab["session_token"]

        # Add them as both collaborator and co-manager (the "co-owner" role).
        r = client.put(
            f"{BASE_URL}/api/flow/projects/{pytest.project_id}/collaborators",
            json={"collaborator_ids": [collab_id], "manager_ids": [collab_id]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["added"] == 1

        # Remove them entirely.
        r2 = client.put(
            f"{BASE_URL}/api/flow/projects/{pytest.project_id}/collaborators",
            json={"collaborator_ids": [], "manager_ids": []},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()["removed"] == 1

        # The removed person now sees a removal notification in their own feed.
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {collab_token}"})
        nr = s.get(f"{BASE_URL}/api/notifications", timeout=15)
        assert nr.status_code == 200, nr.text
        kinds = [n["kind"] for n in nr.json()["notifications"]]
        assert "removed_from_project" in kinds


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
        # Delivery is now real: the message is only marked "sent" when Resend
        # confirmed it. In an environment without a delivery key it reports
        # "failed" instead of silently claiming success.
        assert r3.json().get("status") in ("sent", "failed")

    def test_whatsapp_and_sms_send_when_unconfigured(self, client):
        # WhatsApp and SMS are wired through Twilio. Without credentials the
        # send is skipped and reported as failed -- never falsely "sent".
        for channel in ("whatsapp", "sms"):
            r = client.post(f"{BASE_URL}/api/flow/messages", json={
                "contact_id": pytest.contact_id,
                "message_type": "checkin",
                "draft_content": f"TEST_QA touch via {channel}",
                "tier": 2,
                "channel": channel,
            }, timeout=15)
            assert r.status_code == 200, r.text
            mid = r.json()["message_id"]
            r2 = client.post(f"{BASE_URL}/api/flow/messages/{mid}/action",
                             json={"action": "send"}, timeout=15)
            assert r2.status_code == 200, r2.text
            body = r2.json()
            assert body.get("status") in ("sent", "failed", "skipped")
            if body.get("status") != "sent":
                assert body.get("send_error"), body

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

    def test_delete_message(self, client):
        r = client.post(f"{BASE_URL}/api/flow/messages", json={
            "contact_id": pytest.contact_id,
            "message_type": "checkin",
            "draft_content": "TEST_QA delete me",
            "tier": 2,
        }, timeout=15)
        assert r.status_code == 200
        mid = r.json()["message_id"]

        # The drafter can delete their own message.
        d = client.delete(f"{BASE_URL}/api/flow/messages/{mid}", timeout=15)
        assert d.status_code == 200, d.text

        # It is gone: a second delete is a 404.
        d2 = client.delete(f"{BASE_URL}/api/flow/messages/{mid}", timeout=15)
        assert d2.status_code == 404


# ----- ROLES ----------------------------------------------------------------
class TestFlowRoles:
    def test_roles_returns_7_flags(self, client):
        r = client.get(f"{BASE_URL}/api/flow/roles", timeout=15)
        assert r.status_code == 200
        roles = r.json()
        flags = [r["flag"] for r in roles]
        # FLOW_ROLE_FLAGS in flow.py was consolidated to 7 flags.
        expected = [
            "is_delivery_coordinator", "is_delivery_owner",
            "is_operations_owner", "is_executive_approver",
            "is_engineer", "is_relationship_owner", "is_prospect_owner",
        ]
        for f in expected:
            assert f in flags, f"missing role flag {f}"
        assert len(roles) == 7

    def test_assign_invalid_flag_400(self, client, me):
        r = client.post(f"{BASE_URL}/api/flow/roles/assign", json={
            "user_id": me["user_id"], "flag": "is_bogus", "value": True,
        }, timeout=15)
        assert r.status_code == 400

    def test_assign_valid_flag_then_revoke(self, client, me):
        r = client.post(f"{BASE_URL}/api/flow/roles/assign", json={
            "user_id": me["user_id"], "flag": "is_engineer", "value": True,
        }, timeout=15)
        assert r.status_code == 200
        r2 = client.get(f"{BASE_URL}/api/flow/roles", timeout=15)
        engineer_row = [x for x in r2.json() if x["flag"] == "is_engineer"][0]
        assert any(u["user_id"] == me["user_id"] for u in engineer_row["users"])

        r3 = client.post(f"{BASE_URL}/api/flow/roles/assign", json={
            "user_id": me["user_id"], "flag": "is_engineer", "value": False,
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
            "pending_proposals", "in_build_count", "build_status_counts",
            "upcoming_events_7d", "events", "overdue_invoices",
            "prospect_counts", "my_tickets", "stages_meta",
        ]:
            assert key in d, f"missing dashboard key {key}"
        # 10 stages meta
        assert len(d["stages_meta"]) == 10


# ----- AUDIT LOG ------------------------------------------------------------
class TestFlowAudit:
    def test_audit_log_filter_by_project(self, client):
        r = client.get(f"{BASE_URL}/api/flow/audit-log?entity_type=project", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        assert all(it["entity_type"] == "project" for it in items)
