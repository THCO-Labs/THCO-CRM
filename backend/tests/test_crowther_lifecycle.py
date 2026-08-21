"""Walk a project from intake to closure against the running API.

Not a unit test. It exercises the real endpoints the way a person uses them,
because the rules being checked here -- who may move a project, what a gate
refuses, what a forced gate records -- only exist end to end. A test that
mocked the database would pass while the pipeline was unusable.

Run the backend first, then:

    ./venv/Scripts/python.exe tests/test_crowther_lifecycle.py

It seeds its own project and leaves it behind under a recognisable name, so it
can be run repeatedly without resetting anything.
"""

import sys
import uuid
from pathlib import Path

import requests

BASE = "http://localhost:8000"
PASSWORD = "localdev-2026"

PASSED, FAILED = [], []


def check(label, got, want):
    if got == want:
        PASSED.append(label)
        print(f"  PASS  {label}")
    else:
        FAILED.append(label)
        print(f"  FAIL  {label}\n          got  {got!r}\n          want {want!r}")


def login(email):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": PASSWORD})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['session_token']}"}


def move(headers, pid, target, note="", payload=None, force=False):
    return requests.post(
        f"{BASE}/api/flow/projects/{pid}/transition",
        headers=headers,
        json={"target_stage": target, "note": note, "payload": payload or {}, "force": force},
    )


def gate(headers, pid):
    return requests.get(f"{BASE}/api/flow/projects/{pid}/gate", headers=headers).json()


def main():
    sp = login("partner@thcohq.com")
    tsd = login("tsd@thcohq.com")
    com = login("commercial@thcohq.com")
    eng = login("eng2@thcohq.com")

    tsd_id = requests.get(f"{BASE}/api/auth/me", headers=tsd).json()["user_id"]
    arch_id = requests.get(f"{BASE}/api/flow/architect-candidates", headers=tsd).json()[0]["user_id"]

    print("\n=== INTAKE ===")
    created = requests.post(f"{BASE}/api/flow/projects", headers=com, json={
        "name": f"Lifecycle test {uuid.uuid4().hex[:6]}",
        "client_name": "Test Client",
        "unit_slug": "technology",
        "desired_outcome": "Prove the lifecycle works end to end.",
        "original_brief": "A brief, so the intake gate has source material.",
        "transcripts": [{"source_label": "Kickoff call", "source_date": "2026-08-18",
                         "content": "They want it to work."}],
    })
    check("commercial opens a project", created.status_code, 200)
    pid = created.json()["id"]
    check("opens at stage 1", created.json()["stage"], 1)
    check("phase is intake", created.json()["phase"], "intake")

    check("engineer cannot open a project",
          requests.post(f"{BASE}/api/flow/projects", headers=eng, json={
              "name": "nope", "client_name": "nope", "unit_slug": "technology"}).status_code, 403)
    check("engineer cannot see the pipeline",
          requests.get(f"{BASE}/api/flow/projects", headers=eng).status_code, 403)

    conds = {c["auto"]: c["satisfied"] for c in gate(com, pid)["conditions"]}
    check("intake source material recorded", conds.get("has_source"), True)
    check("intake outcome recorded", conds.get("has_outcome"), True)

    print("\n=== TSD ASSIGNMENT ===")
    check("1 -> 2", move(sp, pid, 2).status_code, 200)
    check("2 -> 3 refused with no TSD", move(sp, pid, 3).status_code, 400)
    check("2 -> 3 naming the TSD", move(sp, pid, 3, payload={"tsd_id": tsd_id}).status_code, 200)
    project = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd).json()
    check("the project has a TSD", project["tsd_name"], "Anabel Emekene")

    print("\n=== THE RULES ===")
    check("cannot skip a stage", move(tsd, pid, 6).status_code, 400)
    check("backwards needs a reason", move(tsd, pid, 2).status_code, 400)
    check("backwards with a reason", move(tsd, pid, 2, note="Wrong TSD chosen").status_code, 200)
    check("forward again", move(tsd, pid, 3, payload={"tsd_id": tsd_id}).status_code, 200)

    print("\n=== DISCOVERY GATE ===")
    check("3 -> 4", move(tsd, pid, 4).status_code, 200)
    # Discovery needs three requirements, and there are none.
    blocked = move(tsd, pid, 5)
    check("4 -> 5 blocked by requirements", blocked.status_code, 400)
    # The label states the number it checks. "Initial requirements captured"
    # turned red at two requirements without saying three were wanted, which
    # is a condition nobody could evaluate from its own wording.
    check("and it says which", "At least three requirements captured" in
          str(blocked.json()["detail"]["blocking"]), True)
    check("forcing needs a reason", move(tsd, pid, 5, force=True).status_code, 400)
    check("forcing with a reason", move(tsd, pid, 5, note="Requirements are in the brief",
                                        force=True).status_code, 200)

    project = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd).json()
    forced = [h for h in project["stage_history"] if h.get("forced")]
    check("the force is on the record", len(forced), 1)
    check("with the unmet condition named",
          any(c["satisfied"] is False for c in forced[0]["gate_conditions"]), True)
    check("and the reason given", forced[0]["why"], "Requirements are in the brief")

    print("\n=== ARCHITECT SELECTION ===")
    # Stage 5 wants a Product Brief and there is not one, so this walk forces
    # past it. That the gate refuses first is the point of the assertion.
    check("5 -> 6 blocked without a Product Brief", move(tsd, pid, 6).status_code, 400)
    check("5 -> 6 forced", move(tsd, pid, 6, note="Brief is in the transcript",
                                force=True).status_code, 200)
    check("TSD cannot select the architect",
          requests.post(f"{BASE}/api/flow/projects/{pid}/select-architect",
                        headers=tsd, json={"user_id": arch_id}).status_code, 403)
    check("6 -> 7 blocked without an architect", move(tsd, pid, 7).status_code, 400)
    check("the Senior Partner selects",
          requests.post(f"{BASE}/api/flow/projects/{pid}/select-architect",
                        headers=sp, json={"user_id": arch_id}).status_code, 200)
    check("6 -> 7 now allowed", move(tsd, pid, 7).status_code, 200)
    check("the architect is named",
          requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd).json()["architect_name"],
          "Success Okoro")

    print("\n=== SCOPE FREEZE ===")
    project = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd).json()
    check("scope is not frozen before validation", project["scope_frozen"], False)
    for target in (8, 9, 10, 11):
        move(tsd, pid, target, note="Walking the lifecycle", force=True)
    check("reached validation", requests.get(f"{BASE}/api/flow/projects/{pid}",
                                             headers=tsd).json()["stage"], 11)
    move(tsd, pid, 12, note="Client validated", force=True)
    project = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd).json()
    check("scope freezes past validation", project["scope_frozen"], True)
    check("and the client is recorded as validated", project["client_status"], "validated")

    print("\n=== HEALTH ===")
    check("engineer cannot set health",
          requests.post(f"{BASE}/api/flow/projects/{pid}/health", headers=eng,
                        json={"health": "RED", "reason": "x"}).status_code, 403)
    check("amber needs a reason",
          requests.post(f"{BASE}/api/flow/projects/{pid}/health", headers=tsd,
                        json={"health": "AMBER"}).status_code, 400)
    check("red with a reason",
          requests.post(f"{BASE}/api/flow/projects/{pid}/health", headers=tsd,
                        json={"health": "RED", "reason": "Client has gone quiet"}).status_code, 200)

    print("\n=== TO CLOSURE ===")
    for target in range(13, 18):
        move(tsd, pid, target, note="Walking the lifecycle", force=True)
    project = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=tsd).json()
    check("reaches closure", project["stage"], 17)
    check("phase is close", project["phase"], "close")
    check("completion is dated", bool(project["completed_at"]), True)
    check("cannot go past the end", move(tsd, pid, 18).status_code, 422)

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
