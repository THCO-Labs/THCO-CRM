"""Exercise the delivery artefacts against the running API.

The pipeline moves a project; this is what the stages produce and what the
gates read. The rules worth pinning here are the ones that are easy to break
by accident:

  - the architect is handed no briefing package, and reads the project itself
  - only the named architect uploads architecture, not every architect-capable
    engineer
  - scope freezes at client validation, and the requirements API refuses after
  - Legal gets a narrower object, not the whole project with fields hidden

Run the backend first, then:

    ./venv/Scripts/python.exe tests/test_delivery_artefacts.py
"""

import sys
import uuid

import requests

BASE = "http://localhost:8000"
PASSWORD = "localdev-2026"

PASSED, FAILED = [], []


def check(label, got, want):
    if got == want:
        PASSED.append(label)
        print(f"  PASS  {label}")
    else:
        FAILED.append(f"{label}: got {got!r}, wanted {want!r}")
        print(f"  FAIL  {label}: got {got!r}, wanted {want!r}")


def login(email):
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": email, "password": PASSWORD}, timeout=10)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['session_token']}"}


def main():
    partner = login("partner@thcohq.com")
    tsd = login("tsd@thcohq.com")
    architect = login("architect@thcohq.com")
    other_eng = login("eng1@thcohq.com")   # architect-capable, but not on this project
    legal = login("legal@thcohq.com")

    tag = uuid.uuid4().hex[:6]
    print("\n=== SETUP ===")
    created = requests.post(f"{BASE}/api/flow/projects", headers=partner, json={
        "name": f"Artefact walk {tag}",
        "client_name": "Test Client",
        "unit_slug": "technology",
        "desired_outcome": "A working thing",
        "original_brief": "The client wants a working thing.",
        "transcripts": [
            {"source_label": "Discovery call", "source_date": None,
             "content": "They said they need it by March."},
        ],
    }, timeout=15)
    check("project created", created.status_code, 200)
    pid = created.json()["id"]

    # The brief and the transcript become documents at intake, so that anyone
    # joining later reads the source rather than a summary of it.
    docs = requests.get(f"{BASE}/api/delivery/projects/{pid}/documents",
                        headers=partner, timeout=10).json()
    check("intake stored the brief and the transcript", len(docs), 2)
    check("transcript keeps its source label",
          any(d["doc_type"] == "transcript" and d["source_label"] == "Discovery call"
              for d in docs), True)

    print("\n=== REQUIREMENTS ===")
    for i in range(3):
        r = requests.post(f"{BASE}/api/delivery/projects/{pid}/requirements",
                          headers=partner, json={"description": f"Requirement {i}"}, timeout=10)
        if i == 0:
            check("a requirement can be added", r.status_code, 200)
            check("it is given a reference", r.json()["req_ref"], "R-01")
    reqs = requests.get(f"{BASE}/api/delivery/projects/{pid}/requirements",
                        headers=partner, timeout=10).json()
    check("three requirements exist", len(reqs), 3)

    print("\n=== THE ARCHITECT READS THE PROJECT, NOT A PACKAGE ===")
    # Name a TSD and an architect the way the pipeline does.
    requests.post(f"{BASE}/api/flow/projects/{pid}/transition", headers=partner,
                  json={"target_stage": 2, "note": "Assigning"}, timeout=10)
    users = requests.get(f"{BASE}/api/flow/users-by-function/tsd", headers=partner, timeout=10)
    tsd_id = users.json()[0]["user_id"] if users.status_code == 200 and users.json() else None
    requests.post(f"{BASE}/api/flow/projects/{pid}/transition", headers=partner,
                  json={"target_stage": 3, "note": "To the TSD",
                        "payload": {"tsd_id": tsd_id}}, timeout=10)

    cands = requests.get(f"{BASE}/api/flow/architect-candidates", headers=tsd, timeout=10).json()
    arch_id = next(c["user_id"] for c in cands if c["email"] == "architect@thcohq.com")
    sel = requests.post(f"{BASE}/api/flow/projects/{pid}/select-architect",
                        headers=partner, json={"user_id": arch_id}, timeout=10)
    check("the Senior Partner names the architect", sel.status_code, 200)

    ws = requests.get(f"{BASE}/api/delivery/projects/{pid}/workspace",
                      headers=architect, timeout=10)
    check("the architect can open the project", ws.status_code, 200)
    body = ws.json()
    check("and sees the requirements", len(body["requirements"]), 3)
    check("and the transcripts", any(d["doc_type"] == "transcript" for d in body["documents"]), True)
    check("and the original brief", any(d["doc_type"] == "brief" for d in body["documents"]), True)
    check("and the stage history", len(body["project"]["stage_history"]) >= 3, True)
    check("architecture upload is offered to them", body["can"]["upload_architecture"], True)

    print("\n=== ARCHITECTURE IS UPLOADED, BY THE NAMED ARCHITECT ONLY ===")
    files = {"file": ("architecture.md", b"# Architecture\n\nComponents.", "text/markdown")}
    up = requests.post(f"{BASE}/api/delivery/projects/{pid}/architecture",
                       headers=architect, files=files, data={"title": "v1"}, timeout=15)
    check("the named architect can upload", up.status_code, 200)
    check("it is versioned", up.json()["version"], 1)

    files = {"file": ("sneaky.md", b"# Not mine", "text/markdown")}
    other = requests.post(f"{BASE}/api/delivery/projects/{pid}/architecture",
                          headers=other_eng, files=files, timeout=15)
    check("another architect-capable engineer cannot", other.status_code, 403)

    files = {"file": ("notes.exe", b"MZ", "application/octet-stream")}
    bad = requests.post(f"{BASE}/api/delivery/projects/{pid}/architecture",
                        headers=architect, files=files, timeout=15)
    check("an executable is refused", bad.status_code, 400)

    print("\n=== DEMOS ARE A COLLECTION ===")
    d1 = requests.post(f"{BASE}/api/delivery/projects/{pid}/demos",
                       headers=tsd, json={}, timeout=10)
    check("a demo round opens", d1.status_code, 200)
    check("rounds are numbered", d1.json()["round"], 1)
    d2 = requests.post(f"{BASE}/api/delivery/projects/{pid}/demos",
                       headers=tsd, json={}, timeout=10)
    check("a second round is normal", d2.json()["round"], 2)

    requests.post(f"{BASE}/api/delivery/projects/{pid}/demos/{d1.json()['demo_id']}/outcome",
                  headers=tsd, json={"outcome": "iterate"}, timeout=10)
    val = requests.post(f"{BASE}/api/delivery/projects/{pid}/demos/{d2.json()['demo_id']}/outcome",
                        headers=tsd, json={"outcome": "validated"}, timeout=10)
    check("the client validates a round", val.status_code, 200)

    print("\n=== SCOPE FREEZE ===")
    project = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd, timeout=10).json()
    stage = project["stage"]
    for target in range(stage + 1, 13):
        requests.post(f"{BASE}/api/flow/projects/{pid}/transition", headers=tsd,
                      json={"target_stage": target, "note": "Walking", "force": True}, timeout=10)

    project = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd, timeout=10).json()
    check("scope is frozen past validation", project["scope_frozen"], True)

    late = requests.post(f"{BASE}/api/delivery/projects/{pid}/requirements",
                         headers=tsd, json={"description": "One more thing"}, timeout=10)
    check("a new requirement is refused once frozen", late.status_code, 409)

    reqs = requests.get(f"{BASE}/api/delivery/projects/{pid}/requirements",
                        headers=tsd, timeout=10).json()
    edit = requests.patch(
        f"{BASE}/api/delivery/projects/{pid}/requirements/{reqs[0]['requirement_id']}",
        headers=tsd, json={"description": "Rewritten"}, timeout=10)
    check("rewording a frozen requirement is refused", edit.status_code, 409)

    status_only = requests.patch(
        f"{BASE}/api/delivery/projects/{pid}/requirements/{reqs[0]['requirement_id']}",
        headers=tsd, json={"status": "committed"}, timeout=10)
    check("but closing one out is still allowed", status_only.status_code, 200)

    print("\n=== THE COMMERCIAL SLICE ===")
    lws = requests.get(f"{BASE}/api/delivery/projects/{pid}/workspace", headers=legal, timeout=10)
    check("Legal can open the project", lws.status_code, 200)
    lbody = lws.json()
    check("and is told it is a slice", lbody["commercial_slice"], True)
    check("with the requirements", len(lbody["requirements"]), 3)
    check("and the transcripts, which say what was promised",
          any(d["doc_type"] == "transcript" for d in lbody["documents"]), True)
    check("but no architecture", "architecture" in lbody, False)
    check("and no activity log", "activity" in lbody, False)

    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    if FAILED:
        for f in FAILED:
            print(f"  failed: {f}")
        return 1
    return 0


if __name__ == "__main__":
    try:
        requests.get(f"{BASE}/healthz", timeout=3)
    except Exception:
        print(f"The backend is not answering on {BASE}. Start it first.")
        sys.exit(2)
    sys.exit(main())
