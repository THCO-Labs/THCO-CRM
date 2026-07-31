"""Regression: NewProjectForm multi-file upload + DeployedTools list endpoint."""
import os
import io
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://executive-decks.preview.emergentagent.com").rstrip("/")
EMAIL = "joshua@thcohq.com"
PASSWORD = "THCOAdmin2024!"

UNITS = ["thco-hr", "technology", "client-delivery", "sales", "marketing",
         "advisory", "operations", "academy", "it-tools"]


def _login():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return r.json()["session_token"]


def _pdf_bytes(label: str) -> bytes:
    # minimal valid-ish PDF header so the server sees content
    return (b"%PDF-1.4\n%" + label.encode() + b"\n" + b"x" * 1024 + b"\n%%EOF")


# ---- New Project create with website + free-text client + multi client docs
def test_create_project_with_website_and_multi_docs():
    token = _login()
    headers = {"Authorization": f"Bearer {token}"}
    files = [
        ("brief", ("brief.pdf", _pdf_bytes("brief"), "application/pdf")),
        ("roadmap", ("roadmap.pdf", _pdf_bytes("roadmap"), "application/pdf")),
        ("client_documents", ("doc1.pdf", _pdf_bytes("d1"), "application/pdf")),
        ("client_documents", ("doc2.pdf", _pdf_bytes("d2"), "application/pdf")),
        ("client_documents", ("doc3.pdf", _pdf_bytes("d3"), "application/pdf")),
    ]
    data = {
        "name": "TEST_QA_FreeTextClient_Project",
        "client_id": "custom",
        "client_name": "Acme Free Text Corp QA",
        "website": "https://acme-test.com",
        "description": "Regression test project for free-text client and multi-doc upload.",
    }
    r = requests.post(f"{BASE_URL}/api/projects", headers=headers, data=data, files=files, timeout=60)
    assert r.status_code == 200, f"create project failed {r.status_code}: {r.text}"
    body = r.json()
    assert body["client_name_snapshot"] == "Acme Free Text Corp QA"
    assert body["website"] == "https://acme-test.com"
    assert body["client_id"] is None  # 'custom' should be normalized to None
    assert isinstance(body.get("client_documents"), list)
    assert len(body["client_documents"]) == 3
    for d in body["client_documents"]:
        assert "url" in d and "name" in d
    project_id = body["id"]

    # GET /api/projects to verify persistence
    r2 = requests.get(f"{BASE_URL}/api/projects", headers=headers, timeout=30)
    assert r2.status_code == 200
    found = next((p for p in r2.json() if p["id"] == project_id), None)
    assert found is not None, "created project not in list"
    assert found["client_name_snapshot"] == "Acme Free Text Corp QA"
    assert found["website"] == "https://acme-test.com"
    assert len(found.get("client_documents", [])) == 3

    # GET /api/projects/{id} to confirm details
    r3 = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers, timeout=30)
    assert r3.status_code == 200
    detail = r3.json()
    assert detail["website"] == "https://acme-test.com"
    assert len(detail["client_documents"]) == 3


# ---- DeployedTools list endpoint per unit
def test_flowforge_tools_per_unit():
    token = _login()
    headers = {"Authorization": f"Bearer {token}"}
    failed = []
    for unit in UNITS:
        r = requests.get(f"{BASE_URL}/api/flowforge/tools", params={"unit": unit}, headers=headers, timeout=30)
        if r.status_code != 200:
            failed.append((unit, r.status_code, r.text[:200]))
            continue
        data = r.json()
        assert isinstance(data, list), f"{unit}: expected list, got {type(data)}"
    assert not failed, f"flowforge endpoint failures: {failed}"
