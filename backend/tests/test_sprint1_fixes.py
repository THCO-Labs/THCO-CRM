"""The Sprint 1 fixes, pinned so they stay fixed.

Each check here corresponds to something that was reported broken. The point
is less that these behaviours work and more that they cannot quietly stop
working again, because several of them failed silently the first time: a link
that landed on the dashboard, a gate that could never be satisfied, a progress
bar that read 100% for a project with no work in it.

Run the backend first, then:

    ./venv/Scripts/python.exe tests/test_sprint1_fixes.py
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


def advance_to(headers, pid, target, note="Walking the lifecycle"):
    """Step a project up to `target`, one stage at a time.

    The pipeline refuses a jump, so a test that posts target_stage=4 from
    stage 1 does not fail loudly -- it gets a 400, stays put, and every gate
    assertion after it quietly reads the wrong stage.
    """
    current = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=headers,
                           timeout=10).json()["stage"]
    while current < target:
        current += 1
        r = requests.post(f"{BASE}/api/flow/projects/{pid}/transition", headers=headers,
                          json={"target_stage": current, "note": note, "force": True},
                          timeout=10)
        if r.status_code != 200:
            raise SystemExit(f"could not reach stage {target}: stuck at {current - 1}, "
                             f"{r.status_code} {r.text[:200]}")
    return current


def main():
    partner = login("partner@thcohq.com")
    tsd = login("tsd@thcohq.com")
    architect = login("architect@thcohq.com")

    tag = uuid.uuid4().hex[:6]

    print("\n=== B5: a TSD named at intake settles stage 2 ===")
    staff = requests.get(f"{BASE}/api/flow/staff", headers=partner, timeout=10).json()
    tsd_person = next(s for s in staff["staff"] if s["email"] == "tsd@thcohq.com")

    created = requests.post(f"{BASE}/api/flow/projects", headers=partner, json={
        "name": f"Sprint1 assigned {tag}",
        "client_name": "Test Client",
        "desired_outcome": "Prove the TSD can be named up front",
        "original_brief": "They want a thing.",
        "tsd_id": tsd_person["user_id"],
    }, timeout=15)
    check("project created with a TSD", created.status_code, 200)
    body = created.json()
    check("it opens at TSD Receives Project, not TSD Assignment", body["stage"], 3)
    check("and the TSD is named", body["tsd_name"], tsd_person["name"])
    assigned_pid = body["id"]

    unassigned = requests.post(f"{BASE}/api/flow/projects", headers=partner, json={
        "name": f"Sprint1 unassigned {tag}",
        "client_name": "Test Client",
        "desired_outcome": "Prove it still waits when nobody is named",
    }, timeout=15).json()
    check("without one it waits at intake", unassigned["stage"], 1)
    pid = unassigned["id"]

    print("\n=== A3: the TSD selector writes the field the header reads ===")
    res = requests.put(f"{BASE}/api/flow/projects/{pid}/manager", headers=partner,
                       json={"user_id": tsd_person["user_id"]}, timeout=10)
    check("the TSD can be set", res.status_code, 200)
    check("the response names the new TSD", res.json()["tsd_name"], tsd_person["name"])
    reread = requests.get(f"{BASE}/api/flow/projects/{pid}", headers=partner, timeout=10).json()
    # This is the actual bug: the selector wrote project_manager_name while the
    # header read tsd_name, so the two could never agree.
    check("and the project itself agrees", reread["tsd_name"], tsd_person["name"])

    print("\n=== A7: the gate says the number it checks ===")
    advance_to(tsd, pid, 4, note="Into discovery")
    for i in range(2):
        requests.post(f"{BASE}/api/delivery/projects/{pid}/requirements", headers=tsd,
                      json={"description": f"Requirement {i}"}, timeout=10)
    gate = requests.get(f"{BASE}/api/flow/projects/{pid}/gate", headers=tsd, timeout=10).json()
    check("two requirements still block the gate",
          "At least three requirements captured" in gate["blocking"], True)
    requests.post(f"{BASE}/api/delivery/projects/{pid}/requirements", headers=tsd,
                  json={"description": "Requirement 3"}, timeout=10)
    gate = requests.get(f"{BASE}/api/flow/projects/{pid}/gate", headers=tsd, timeout=10).json()
    check("three satisfies it", "At least three requirements captured" in gate["blocking"], False)

    print("\n=== C3: requirements can be committed ===")
    reqs = requests.get(f"{BASE}/api/delivery/projects/{pid}/requirements",
                        headers=tsd, timeout=10).json()
    check("they start proposed", reqs[0]["status"], "proposed")
    committed = requests.patch(
        f"{BASE}/api/delivery/projects/{pid}/requirements/{reqs[0]['requirement_id']}",
        headers=tsd, json={"status": "committed"}, timeout=10)
    check("and can be committed", committed.status_code, 200)
    check("which sticks", committed.json()["status"], "committed")

    print("\n=== C3: the Product Brief can be written ===")
    brief = requests.post(f"{BASE}/api/delivery/projects/{pid}/product-briefs", headers=tsd, json={
        "problem": "They cannot find their own policies.",
        "outcomes": "Anyone can find a policy in under a minute.",
        "success_metrics": "Median time to answer under 60 seconds.",
    }, timeout=10)
    check("a brief can be written", brief.status_code, 200)
    check("it is version 1", brief.json()["version"], 1)
    second = requests.post(f"{BASE}/api/delivery/projects/{pid}/product-briefs", headers=tsd,
                           json={"problem": "Restated."}, timeout=10)
    check("and the next is version 2", second.json()["version"], 2)
    briefs = requests.get(f"{BASE}/api/delivery/projects/{pid}/product-briefs",
                          headers=tsd, timeout=10).json()
    check("both versions are kept", len(briefs), 2)

    print("\n=== C2: user journeys can be edited ===")
    journey = requests.post(f"{BASE}/api/delivery/projects/{pid}/journeys", headers=tsd,
                            json={"title": "Find a policy", "persona": "Operations"},
                            timeout=10).json()
    edited = requests.patch(
        f"{BASE}/api/delivery/projects/{pid}/journeys/{journey['journey_id']}",
        headers=tsd, json={"title": "Find a policy quickly"}, timeout=10)
    check("a journey can be edited", edited.status_code, 200)
    check("and the edit sticks", edited.json()["title"], "Find a policy quickly")

    print("\n=== C4: the architect flow works end to end ===")
    advance_to(tsd, pid, 6)

    asked = requests.post(f"{BASE}/api/flow/projects/{pid}/request-architect",
                          headers=tsd, timeout=10)
    check("the TSD can request an architect", asked.status_code, 200)
    check("and gets the candidates back", len(asked.json()["candidates"]) > 0, True)

    cands = requests.get(f"{BASE}/api/flow/architect-candidates", headers=tsd, timeout=10).json()
    arch_id = next(c["user_id"] for c in cands if c["email"] == "architect@thcohq.com")
    check("the TSD cannot select one",
          requests.post(f"{BASE}/api/flow/projects/{pid}/select-architect", headers=tsd,
                        json={"user_id": arch_id}, timeout=10).status_code, 403)
    check("the Senior Partner can",
          requests.post(f"{BASE}/api/flow/projects/{pid}/select-architect", headers=partner,
                        json={"user_id": arch_id}, timeout=10).status_code, 200)

    print("\n=== C1: demo materials satisfy the stage 9 gate ===")
    advance_to(tsd, pid, 9)

    demo = requests.post(f"{BASE}/api/delivery/projects/{pid}/demos", headers=tsd,
                         json={}, timeout=10).json()
    gate = requests.get(f"{BASE}/api/flow/projects/{pid}/gate", headers=tsd, timeout=10).json()
    check("a round with nothing attached does not satisfy the gate",
          "Demo round created with materials" in gate["blocking"], True)

    # This was the hole: the gate asked for materials and there was nowhere to
    # put any, so marking the demo held changed nothing visible.
    files = {"file": ("wireframes.png", b"\x89PNG\r\n\x1a\n" + b"0" * 40, "image/png")}
    attached = requests.post(
        f"{BASE}/api/delivery/projects/{pid}/demos/{demo['demo_id']}/materials",
        headers=tsd, files=files, timeout=15)
    check("materials can be attached to a round", attached.status_code, 200)
    check("and they are stored as a demo document", attached.json()["doc_type"], "demo")

    gate = requests.get(f"{BASE}/api/flow/projects/{pid}/gate", headers=tsd, timeout=10).json()
    check("which satisfies the materials condition",
          "Demo round created with materials" in gate["blocking"], False)

    print("\n=== A1: an uploaded file is actually reachable ===")
    file_url = attached.json()["file_url"]
    check("the url is an API path", file_url.startswith("/api/delivery/files/"), True)
    fetched = requests.get(f"{BASE}{file_url}", headers=tsd, timeout=10)
    check("and it serves the bytes with a session attached", fetched.status_code, 200)
    check("while refusing without one",
          requests.get(f"{BASE}{file_url}", timeout=10).status_code, 401)

    print("\n=== B7: the way back to another demo round ===")
    requests.post(f"{BASE}/api/delivery/projects/{pid}/demos/{demo['demo_id']}/held",
                  headers=tsd, timeout=10)
    advance_to(tsd, pid, 10)
    back = requests.post(f"{BASE}/api/flow/projects/{pid}/transition", headers=tsd,
                         json={"target_stage": 9}, timeout=10)
    # Iterating on a demo is the design rather than a correction, so this is
    # the one backward move that needs no written reason.
    check("stage 10 can return to stage 9 with no reason given", back.status_code, 200)
    check("and it lands there", back.json()["stage"], 9)

    print("\n=== A4: progress counts work, not stages ===")
    summary = requests.get(f"{BASE}/api/tasks/projects/summary", headers=tsd, timeout=15).json()
    rows = summary if isinstance(summary, list) else summary.get("projects", [])
    row = next((r for r in rows if r.get("id") == assigned_pid), None)
    if row is None:
        check("the assigned project appears on the task summary", False, True)
    else:
        # A project with no cards has no progress to report. It used to read
        # 100% for anything past stage 10, beside "0 boards, 0 tasks".
        check("a project with no cards reports no progress", row.get("progress"), None)
        check("and the owner shown is the TSD", row.get("coordinator_name"), tsd_person["name"])

    print("\n=== The pod replaces the project team ===")
    # Two names for one set of people is how they drift apart. The pod won.
    pod_res = requests.put(f"{BASE}/api/flow/projects/{assigned_pid}/pod", headers=partner,
                           json={"pod_member_ids": [tsd_person["user_id"]]}, timeout=10)
    check("the pod can be set", pod_res.status_code, 200)

    proj = requests.get(f"{BASE}/api/flow/projects/{assigned_pid}",
                        headers=partner, timeout=10).json()
    check("the project carries pod_member_ids",
          tsd_person["user_id"] in (proj.get("pod_member_ids") or []), True)
    check("with the names alongside",
          any(m.get("user_id") == tsd_person["user_id"] for m in (proj.get("pod") or [])), True)
    # The old field is gone, not shadowed. Keeping both is what let them drift.
    check("and no collaborator_ids remain", "collaborator_ids" in proj, False)

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
