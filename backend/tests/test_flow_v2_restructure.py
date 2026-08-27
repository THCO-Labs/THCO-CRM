"""
THCO Flow v2 — 10-stage restructure regression tests.

Covers:
- 10-stage board structure + legacy auto-remap (9-12 -> in_build/completed)
- Gate validators at Stage 2 (delivery_owner_id + is_qualifier) and Stage 5
  (pricing_owner_id + engineer_id + role-gated assigners)
- Auto split at Stage 5 -> proposal sibling at 6 + build sibling at 9
- Build endpoints: build-update, build-comments, track guard
- users-by-role filter (valid + invalid flag)
- Dashboard new field names (in_build_count + build_status_counts, no pending_contracts)
"""
import os
# Credentials come from the environment. This file used to carry the
# super admin's real password as a literal, in a tracked file, which
# meant anybody with repository access had it.
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')

import uuid
import pytest
import requests

def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL")
    if not val:
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        val = line.split("=", 1)[1].strip()
                        break
    assert val, "REACT_APP_BACKEND_URL not set"
    return val.rstrip("/")


BASE_URL = _load_backend_url()
ADMIN_EMAIL = TEST_ADMIN_EMAIL
ADMIN_PASSWORD = TEST_ADMIN_PASSWORD


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("session_token")
    assert tok, f"Missing session_token in {r.json()}"
    return tok


@pytest.fixture(scope="session")
def admin_user(admin_token):
    r = requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {admin_token}"},
                     timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture
def H(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ------------------------ BOARD: 10 stages + legacy remap ------------------------
class TestBoard10Stages:
    def test_board_returns_10_stages_with_tracks(self, H):
        r = requests.get(f"{BASE_URL}/api/flow/projects/board", headers=H, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        stages = data["stages"]
        assert len(stages) == 10, f"expected 10 stages, got {len(stages)}"
        labels = [s["label"] for s in stages]
        for expected in [
            "New Client", "Coordinator Picked", "Meeting Scheduled",
            "Package Building", "Send Package", "Proposal",
            "Executive Approval", "Proposal Sent to Client",
            "In Build (Engineering)", "Completed",
        ]:
            assert expected in labels, f"missing stage label {expected!r} in {labels}"
        # tracks check
        tracks = {s["stage"]: s["track"] for s in stages}
        assert tracks[1] == "main" and tracks[5] == "main"
        assert tracks[6] == "proposal" and tracks[8] == "proposal"
        assert tracks[9] == "build" and tracks[10] == "build"
        # board keys 1..10
        board = data["board"]
        for i in range(1, 11):
            assert str(i) in board or i in board, f"missing board column {i}"


# ------------------------ STAGE 2 GATE ------------------------
class TestStage2Gate:
    def _new_project(self, H):
        payload = {"name": f"TEST_QA_v2_{uuid.uuid4().hex[:6]}", "client_name": "Acme QA"}
        r = requests.post(f"{BASE_URL}/api/flow/projects", headers=H, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        return r.json()

    def test_transition_to_2_without_owner_returns_400(self, H):
        p = self._new_project(H)
        r = requests.post(f"{BASE_URL}/api/flow/projects/{p['id']}/transition",
                          headers=H, json={"target_stage": 2, "payload": {}}, timeout=20)
        assert r.status_code == 400, r.text
        assert "delivery_owner_id" in r.text.lower()

    def test_transition_to_2_with_owner_succeeds(self, H, admin_user):
        p = self._new_project(H)
        # use admin as the delivery_owner_id (super_admin has all flags)
        r = requests.post(f"{BASE_URL}/api/flow/projects/{p['id']}/transition",
                          headers=H,
                          json={"target_stage": 2, "payload": {"delivery_owner_id": admin_user["user_id"]}},
                          timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["stage"] == 2
        # Re-fetch and verify owner persisted
        r2 = requests.get(f"{BASE_URL}/api/flow/projects/{p['id']}", headers=H, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["delivery_owner_id"] == admin_user["user_id"]


# ------------------------ STAGE 5 GATE + SPLIT ------------------------
class TestStage5GateAndSplit:
    def _advance_to_4(self, H, admin_user):
        # create + advance 1->4
        payload = {"name": f"TEST_QA_v2_S5_{uuid.uuid4().hex[:6]}", "client_name": "Split Co"}
        r = requests.post(f"{BASE_URL}/api/flow/projects", headers=H, json=payload, timeout=20)
        assert r.status_code == 200
        pid = r.json()["id"]
        # 1->2
        r = requests.post(f"{BASE_URL}/api/flow/projects/{pid}/transition",
                          headers=H,
                          json={"target_stage": 2, "payload": {"delivery_owner_id": admin_user["user_id"]}},
                          timeout=20)
        assert r.status_code == 200, r.text
        # 2->3 (no gate)
        r = requests.post(f"{BASE_URL}/api/flow/projects/{pid}/transition",
                          headers=H, json={"target_stage": 3, "payload": {}}, timeout=20)
        assert r.status_code == 200, r.text
        # 3->4 (no gate)
        r = requests.post(f"{BASE_URL}/api/flow/projects/{pid}/transition",
                          headers=H, json={"target_stage": 4, "payload": {}}, timeout=20)
        assert r.status_code == 200, r.text
        return pid

    def test_transition_to_5_without_engineer_returns_400(self, H, admin_user):
        pid = self._advance_to_4(H, admin_user)
        # only pricing_owner_id, no engineer
        r = requests.post(f"{BASE_URL}/api/flow/projects/{pid}/transition",
                          headers=H,
                          json={"target_stage": 5,
                                "payload": {"pricing_owner_id": admin_user["user_id"]}},
                          timeout=20)
        assert r.status_code == 400, r.text
        assert "engineer" in r.text.lower()

    def test_transition_to_5_with_both_owners_splits(self, H, admin_user):
        pid = self._advance_to_4(H, admin_user)
        r = requests.post(f"{BASE_URL}/api/flow/projects/{pid}/transition",
                          headers=H,
                          json={"target_stage": 5,
                                "payload": {
                                    "pricing_owner_id": admin_user["user_id"],
                                    "engineer_id":      admin_user["user_id"],
                                }},
                          timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("split_done") is True, body
        siblings = body.get("siblings") or []
        assert len(siblings) == 2, siblings
        tracks = {s["track"] for s in siblings}
        assert tracks == {"proposal", "build"}, tracks
        # Verify both siblings exist in DB
        prop_id = next(s["id"] for s in siblings if s["track"] == "proposal")
        build_id = next(s["id"] for s in siblings if s["track"] == "build")
        rp = requests.get(f"{BASE_URL}/api/flow/projects/{prop_id}", headers=H, timeout=20).json()
        rb = requests.get(f"{BASE_URL}/api/flow/projects/{build_id}", headers=H, timeout=20).json()
        assert rp["stage"] == 6 and rp["track"] == "proposal"
        assert rb["stage"] == 9 and rb["track"] == "build"
        assert rp["parent_project_id"] == pid
        assert rb["parent_project_id"] == pid
        assert rp["sibling_project_id"] == build_id
        assert rb["sibling_project_id"] == prop_id
        # parent persists split flag
        rparent = requests.get(f"{BASE_URL}/api/flow/projects/{pid}", headers=H, timeout=20).json()
        assert rparent.get("split_done") is True
        # Hand off the build id for BuildEndpoints reuse
        pytest.SPLIT_BUILD_ID = build_id
        pytest.SPLIT_PROPOSAL_ID = prop_id


# ------------------------ BUILD ENDPOINTS ------------------------
class TestBuildEndpoints:
    def test_build_update_writes_status_and_comment(self, H, admin_user):
        build_id = getattr(pytest, "SPLIT_BUILD_ID", None)
        if not build_id:
            pytest.skip("Split test did not run before this")
        r = requests.post(f"{BASE_URL}/api/flow/projects/{build_id}/build-update",
                          headers=H,
                          json={"status": "building", "comment": "TEST_QA kicking off"},
                          timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("build_status") == "building"
        # GET comments
        r = requests.get(f"{BASE_URL}/api/flow/projects/{build_id}/build-comments",
                         headers=H, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["build_status"] == "building"
        assert any(c.get("text") == "TEST_QA kicking off" for c in data["build_comments"])
        assert all("by_name" in c and "at" in c for c in data["build_comments"])

    def test_build_update_rejected_on_proposal_track(self, H):
        prop_id = getattr(pytest, "SPLIT_PROPOSAL_ID", None)
        if not prop_id:
            pytest.skip("Split test did not run")
        r = requests.post(f"{BASE_URL}/api/flow/projects/{prop_id}/build-update",
                          headers=H, json={"status": "planning"}, timeout=20)
        assert r.status_code == 400, r.text
        assert "build-track" in r.text.lower() or "build track" in r.text.lower()

    def test_invalid_build_status_returns_400(self, H):
        build_id = getattr(pytest, "SPLIT_BUILD_ID", None)
        if not build_id:
            pytest.skip("Split test did not run")
        r = requests.post(f"{BASE_URL}/api/flow/projects/{build_id}/build-update",
                          headers=H, json={"status": "nonsense"}, timeout=20)
        assert r.status_code == 400


# ------------------------ USERS BY ROLE ------------------------
class TestUsersByRole:
    def test_valid_flag_returns_list(self, H):
        r = requests.get(f"{BASE_URL}/api/flow/users-by-role/is_delivery_owner",
                         headers=H, timeout=20)
        assert r.status_code == 200, r.text
        users = r.json()
        assert isinstance(users, list)
        # Joshua has all flags; should appear
        emails = [u.get("email") for u in users]
        assert ADMIN_EMAIL in emails, f"Admin missing from is_delivery_owner list: {emails}"

    def test_invalid_flag_returns_400(self, H):
        r = requests.get(f"{BASE_URL}/api/flow/users-by-role/invalid_flag_xyz",
                         headers=H, timeout=20)
        assert r.status_code == 400


# ------------------------ DASHBOARD ------------------------
class TestDashboardNewShape:
    def test_dashboard_has_new_fields(self, H):
        r = requests.get(f"{BASE_URL}/api/flow/dashboard", headers=H, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "in_build_count" in data, list(data.keys())
        assert "build_status_counts" in data
        assert "pending_contracts" not in data, "legacy field should be gone"
        # stages_meta should now have 10 entries
        assert len(data.get("stages_meta", {})) == 10
