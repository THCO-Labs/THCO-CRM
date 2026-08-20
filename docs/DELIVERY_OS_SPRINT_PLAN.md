# Delivery OS — Sprint Plan

**Status:** proposal, not started
**Prepared:** 20 August 2026
**Scope:** adopting the seventeen-step delivery process on the existing THCO CRM stack.

Read `delivery-os-comparison.html` for why, and `delivery-os-flow.html` for what the
process actually is. This document is the how — the work broken into two-week
sprints for one engineer.

**Checked against the full specification.** A 34-page master specification
(`Crowther_Delivery_OS_Updated_Master_Specification_V2.pdf`) was supplied after the
first draft of this plan and has been read in full, along with the 19 August 2026
meeting transcript it draws on. It confirms the seventeen steps and the ownership
model closely. It also describes an intelligence and control layer — ten named AI
agents, a Knowledge Graph, a Decision Log, a Risk/Dependency engine, a Control
Tower — that the source diagrams only gestured at. §8 below maps this plan against
the specification's own MVP build sequence so the gap is explicit rather than
implied. **"Crowther" is confirmed as THCO's own working name for this system, not
a separate entity.**

---

## 1. What this plan covers, and what it deliberately does not

The source diagrams describe two separable things: **a delivery process** and **an
enterprise platform**. This plan delivers the process on the infrastructure that
already exists. The platform items are listed in §5 as a deferred track with the
reasons they are deferred.

Bundling them is how this stalls. The process is weeks of work; the platform is
quarters, and most of it is not yet justified by 30 users and 15 projects.

**Total: 10 sprints, 20 weeks, one engineer, no parallel feature work.**

That is longer than the 4–6 weeks I first put against "build the missing delivery
artefacts." Broken down properly it is ten new objects, each needing a model,
permissions, an endpoint, a form, notifications and tests. Three days each was
optimistic.

---

## 2. Blocked until two questions are answered

None of this should start before these are settled. They are not engineering
questions and they change the shape of the work. A third question that stood here
— whether "Crowther Delivery OS" was THCO's own system or a different
organisation's — is resolved: **Crowther is THCO.** Confirmed directly (20 August
2026): this is THCO updating and bringing the new changes to itself, not a rebrand
or a second entity. Everything downstream that assumed otherwise is written for
the same organisation.

| # | Question | Why it blocks |
|---|---|---|
| 1 | **Does the talent database stay inside this system?** | The diagrams show "HR / Talent Systems" as an *external* integration. Today it is 33,547 candidates and ~21 GB inside this application. If it moves out, that is a project of its own and it dwarfs this one. |
| 2 | **Which of the twelve roles are actually staffed?** | Solution Architect, Product Designer, QA Lead, Security Engineer. The current seven-flag role model already failed for exactly this reason — the stage-2 and stage-5 role gates were removed from `flow.py` because nobody held the flags. Building gates for roles nobody holds repeats that. |
| 3 | **Does step 11 carry a contract, or is commercial work outside this flow entirely?** | The three diagrams label step 11 "Validation & *Commercial* Readiness," owned by TSD + Legal + Finance, with a commercial proposal and contract prep as activities. The specification's own text states the opposite as a deliberate change: "Commercial/finance administration is outside the core technical Delivery OS flow," and gives step 11's owner as TSD + Client only. Sprint 9 below cannot be scoped correctly until this is settled. |

A role that is not staffed should be **modelled but not gated**: record who did the
work, do not block the stage on a flag nobody carries.

---

## 3. The sprints

Each sprint assumes both servers running locally and is reviewed on
`localhost:3000` before anything is pushed. Nothing here deploys itself — every
push to `main` goes to production, so merges are a separate decision.

### Sprint 1 — Safety net

**Goal:** be able to change `flow.py` without guessing what broke.

`backend/tests/` already holds 17 test files, including `test_flow.py` and
`test_flow_v2_restructure.py`. Nothing runs them — `.github/workflows/` contains
only `azure-deploy.yml` and `scheduled-jobs.yml`. The next nine sprints rewrite the
core of an 89 KB router; going in without this is the expensive choice.

- Add a CI workflow running `pytest` against `backend/tests/` on every push and PR
- Fix or quarantine whatever currently fails, with a note per quarantine
- Move the by-hand verification scripts described in `PROJECT_STATE.md` §12 into the
  repo (they cover 144 rules across permissions, attachments, stage transitions and
  unit heads — the highest-value tests already written)
- Pin current stage behaviour: a test per existing transition, including the stage-5
  split, so the Sprint 3 rewrite has a baseline to diff against

**Done when:** CI is green on `main` and a deliberate break in `STAGES` turns it red.
**Review:** the Actions tab, not the browser.
**Risk:** low. Nothing user-facing changes.

---

### Sprint 2 — Files out of the database

**Goal:** stop storing binaries in the operational database.

`task_attachments` writes raw bytes into the Mongo document (`"content": content`
in `routers/taskboard.py`). `resume_files` does the same at scale — 65,278 files,
~21 GB. The write volume that represents is what took the cluster down on 19 August.

- Add a blob-storage service (Azure Blob, same subscription) behind one interface
- Write new attachments and resume files to blob; keep reading from either during
  migration
- Backfill existing rows in throttled chunks, overnight, checkpointed — the same
  discipline `migrate_new_gmail_cvs.py` learned the hard way
- Leave profile photos as data URLs. They are small and the `<img src>` constraint
  in `PROJECT_STATE.md` §8 is real

**Done when:** new uploads land in blob, old ones still open, and the collection
size drops as the backfill runs.
**Review:** upload an attachment to a task card, open it, delete it. Open an old CV.
**Risk:** medium — this touches a working feature. Dual-read is the mitigation.

> **This is the sprint you can move.** Nothing else depends on it. If leadership
> wants visible process progress first, swap it with Sprint 3 and run it later.
> It is placed second because the reliability debt is live and the cost of the
> outage it prevents is measured in days, not hours.

---

### Sprint 3 — The seventeen-step model

**Goal:** the pipeline is seventeen steps, and the fifteen live projects survive it.

- Rewrite `STAGES` in `backend/routers/flow.py` and `frontend/src/pages/flow/stages.js`
  (these two must stay in sync — the file says so and it is still true)
- Extend `LEGACY_STAGE_MAP` to land every current stage somewhere sensible
- **Retire the stage-5 split.** Today a project forks into two sibling records
  (`parent_project_id` / `sibling_project_id`, `track` of `proposal` or `build`). The
  new flow is one record. Write the merge migration, run it against a copy of
  production first, and keep the sibling ids on the merged record for traceability
- Rework the transition validators: the gates move, and the `payload` whitelist in
  `transition_stage` needs the new fields
- Update `_send_stage_email` for seventeen steps and their new owners

**Done when:** all 15 live projects render on the new board with no orphans, and
Sprint 1's baseline tests pass in their rewritten form.
**Review:** `/flow` — the board, and each project's detail page. Move a project
forward and back.
**Risk:** **high — this is the riskiest sprint in the plan.** It is a data migration
against live work. Take a database snapshot first and rehearse the merge.

---

### Sprint 4 — The board, and seventeen columns

**Goal:** seventeen steps that a human can actually read.

Ten columns already fill a screen. Seventeen will not fit, and a horizontal scroll
through seventeen equal columns is not a pipeline view — it is a spreadsheet.

- Group the board by the five phases, with steps inside them
- Collapse completed phases; keep the active phase open
- Show the contract gate on the board itself — pre-contract and funded delivery
  should not look identical
- Update `FlowProjectDetail.jsx` and `StructuredStageModal.jsx` for the new gates
- Respect the visual language in `PROJECT_STATE.md` §8: icon badges are a pale wash
  with a 20% border, dialogs must name their own `bg-white`, inputs need
  `bg-white text-gray-900`

**Done when:** a manager can see where every project is without scrolling sideways.
**Review:** `/flow` on a narrow window as well as a wide one.
**Risk:** low technically, high on opinion. Show a mockup before building it.

---

### Sprint 5 — Roles and ownership

**Goal:** the TSD owns the project from step 03 to step 17, and the system knows it.

- Introduce the TSD as the owning role, absorbing today's `delivery_owner_id`
- Add Solution Architect, Product Designer and QA Lead — **modelled, not gated**,
  per §2
- Retire the dead boolean flags. `is_delivery_coordinator` is held by nobody and
  `is_engineer` by one person; both gates have already been removed from the code
  and the flags now only mislead
- Build the step-06 architect request: the ask, optional Senior Partner approval,
  assignment, and the brief delivered to the architect
- Update `services/permissions.py` and remember that manager grants come from
  **two** places (`users.headed_units` and `units.head_user_id`) — collapsing them
  once stripped every manager in the firm
- Call `clear_user_cache()` on anything that moves ownership

**Done when:** a project shows one accountable name at every step, and an architect
request goes out and comes back.
**Review:** `/flow/roles-admin`, then run a project from 01 to 06.
**Risk:** medium. Permissions is where this codebase has been wrong most often.

---

### Sprint 6 — Definition artefacts

**Goal:** capture the brief properly, and turn it into a defined outcome.

- **Step 01 — intake form.** Add project template, desired outcome, call
  transcripts, supporting documents, client context. Reuse the attachment
  infrastructure from `taskboard.py`, now backed by blob storage
- **Step 05 — outcome brief.** Problem statement, defined outcomes, success metrics,
  scope boundaries, assumptions, risks and constraints
- Both are forms plus documents on a project. No new storage, no new services

**Done when:** a project created from the new intake form carries everything a TSD
needs without a single email.
**Review:** create a project at `/flow/new-project`, then write its outcome brief.
**Risk:** low.

---

### Sprint 7 — Design artefacts

**Goal:** the phase that does not exist today.

- **Step 07 — scoping document.** User needs, process flows, feature list, effort
  estimate, roadmap
- **Step 08 — architecture record.** Tech stack, integrations, data architecture,
  security and compliance review, high-level estimate
- Both attach to the project and both are owned by the Solution Architect

**Done when:** a project can carry a real scope and a real architecture, and the
estimate on it is a number the system holds rather than a line in a document.
**Review:** run a project through 06 → 07 → 08 with an architect account.
**Risk:** low. This is the highest-value sprint in the plan and the least technically
difficult — which is a good sign, not a suspicious one.

---

### Sprint 8 — Demo, the loop, and the exit

**Goal:** iterate with the client, and be able to stop.

- **Step 09 — demo artefact.** Wireframes, prototype link, walkthrough notes, and
  which version the client saw
- **Step 10 — feedback and change log.** Every round of client feedback, what
  changed as a result, the scope impact. The 10 → 09 loop is a real transition, not
  a stage revert, and each pass should be a numbered round
- **The pre-validation kill switch.** The flow as drawn has no exit before step 11's
  `CLIENT VALIDATED` gate. Extend today's `mark_lost` into a proper stop at any
  pre-validation step, with a reason, so the pattern is visible later
- Start recording pre-validation effort against the project. Steps 01–10 are spent
  before the client has validated anything, and someone will eventually ask what
  that costs — whether or not a contract also sits at step 11 (blocker 3, §2)

**Done when:** a project can go round the demo loop three times with a legible
history, or be stopped at step 07 with a reason.
**Review:** `/flow/projects/{id}` — the history should read as a story.
**Risk:** medium. The loop is the one place the state machine stops being linear.

---

### Sprint 9 — Client validation and the POD

**Goal:** the client formally validates, scope freezes, and a named team forms.

- **Step 11 — the core version.** The client confirms final direction, scope and
  acceptance criteria; the project is marked `CLIENT VALIDATED`. **Scope freezes**
  here regardless of how blocker 3 resolves — after this point a change is a change
  request, not a silent edit
- **Step 11 — the commercial extension, if blocker 3 resolves that way.** Commercial
  proposal, legal review, contract preparation. Reuse what exists: today's stages 6,
  7 and 8 (Proposal, Executive Approval, Proposal Sent) already cover most of this,
  so it is a consolidation, not a build — *but only build it if the answer to
  blocker 3 is "yes, step 11 carries the contract." If the specification's reading
  wins, this half of the sprint does not happen here at all and Legal/Finance stay
  outside the Delivery OS flow, as the spec states*
- **Step 12 — POD.** The delivery team as an object: members, roles, resourcing,
  kickoff date, delivery plan. Not just a list of collaborators on a project

**Done when:** a validated project refuses a scope edit and offers a change request
instead, and a POD exists as a thing you can open.
**Review:** take a project through 11 into 12, then try to edit its scope.
**Risk:** medium. Scope freeze is a new kind of rule for this codebase, and this
sprint cannot be scoped precisely until blocker 3 is answered.

---

### Sprint 10 — QA, acceptance, handover, closure

**Goal:** the project ends properly, and the ending feeds the next one.

- **Step 14 — QA.** Test plan, execution results, defect tracking. Today this is a
  `build_status` value reading `ready_for_qa`; it becomes an owned step
- **Step 15 — acceptance.** Acceptance criteria (agreed back at step 11), who signed,
  when, against which build
- **Step 16 — handover.** Knowledge transfer, handover documentation, training,
  operational readiness
- **Step 17 — closure.** Closure report, lessons learned, archive, repository
  cleanup. `projects_archived` already exists and is reusable

**Done when:** a project can be closed and the closure report answers "did we do
what we said we would."
**Review:** run one project end to end, 01 to 17.
**Risk:** low.

**Note:** step 13 (Engineering / Build) has no sprint because the task board already
covers it. That is the one part of the delivery flow THCO already does well.

---

## 4. Sequence at a glance

| Sprint | Weeks | Theme | Risk |
|---|---|---|---|
| 0 | — | Answer the three questions in §2 | blocking |
| 1 | 1–2 | Safety net — tests in CI | low |
| 2 | 3–4 | Files out of the database | medium |
| 3 | 5–6 | The seventeen-step model + live migration | **high** |
| 4 | 7–8 | The board, five phases | low |
| 5 | 9–10 | Roles, TSD ownership, architect request | medium |
| 6 | 11–12 | Intake form, outcome brief | low |
| 7 | 13–14 | Scoping, architecture | low |
| 8 | 15–16 | Demo, feedback loop, kill switch | medium |
| 9 | 17–18 | Client validation, scope freeze, POD | medium |
| 10 | 19–20 | QA, acceptance, handover, closure | low |

**First visible business value:** end of Sprint 4 — a working seventeen-step board.
**Process complete:** end of Sprint 10.

---

## 5. Deferred, with reasons

Not "no". Later, and each for a stated reason.

| Item | Deferred because |
|---|---|
| **Data access layer** (repository pattern over the 463 Mongo call sites) | Worth doing on its own merits and it turns the eventual PostgreSQL move from a full rewrite into one layer — see `POSTGRES_MIGRATION.md` §7. But it is 3–4 weeks that produce nothing a user can see, and it should not sit between the firm and a working process. Slot it after Sprint 10. |
| **PostgreSQL migration** | Already costed at 6–9 weeks for one engineer, doubling if feature work continues. It is a project, not a sprint. |
| **Client portal** | The right next thing after the process lands — it unlocks steps 10 and 15 and it is the first thing clients ever see. It is also the first externally-exposed surface this system has ever had, which brings authentication, rate limiting and a security review with it. |
| **AI TSD assignment (step 02)** | Cannot work yet. Ranking on "expertise, domain, capacity, experience and history" needs data that does not exist — no skill, capacity or delivery-history records on any user, and 15 projects total. The seventeen steps are what generate that data. Revisit after a year of real use. |
| **What-Next engine, knowledge graph, copilot** | Same reason. They read the structured history the process has not yet produced. |
| **OpenSearch, Redis, data warehouse** | Mongo's `$text` index and the 45-second in-process identity cache are adequate at this size. Revisit when they demonstrably are not. |
| **Multi-AZ Kubernetes, WAF, IDS, Prometheus/ELK** | Enterprise infrastructure for 30 users and 15 projects, against a system that currently scales to zero overnight to save money. These are destinations, not next steps. |
| **SSO / MFA** | Worth doing, and cheap relative to the rest. Reasonable to pull forward if the security posture is questioned — it is not sequenced here because nothing else depends on it. |

---

## 6. Standing risks across the whole plan

- **`flow.py` is 89 KB and every route in it passes through `_get_user`.** Sprints 3,
  5, 8 and 9 all edit it. Sequence them; do not run them in parallel branches.
- **A long-lived branch diverges painfully.** Merge each sprint into `main` on its
  own. Do not accumulate ten sprints of change and integrate at the end.
- **Every push to `main` deploys.** There is no staging environment. Each sprint's
  merge is a production release and needs the same care.
- **The database is one burstable vCore.** Sprint 2's backfill and Sprint 3's
  migration are both bulk writes. Run them overnight, throttled, checkpointed.
- **Test scripts that appoint a unit head must restore it however they exit.** Use
  `atexit`, not the end of a function. This has already silently removed a real
  manager's rights once.
- **Verify against the page, not only the API.** A payload that was correct in
  isolation crashed the calendar because its only consumer read different field
  names, and an API-level check called that verified.

---

## 7. What this plan does not answer

- Whether the firm has the roles to staff the process (§2, question 2).
- Whether step 11 carries a contract at all (§2, question 3) — unresolved between
  the diagrams and the specification, and Sprint 9 is written to accommodate either
  answer rather than assuming one.
- What pre-validation investment THCO is willing to make per deal — architect and
  designer time spent before a client has validated anything — which is the
  commercial question underneath the whole flow regardless of how question 3
  resolves.
- Whether the ten business units survive a model organised by role and project
  rather than by unit. The diagrams have no unit concept at all, and this plan does
  not remove them — it leaves them alone and assumes the question comes later.

---

## 8. Where this plan sits in the specification's own build sequence

The master specification lays out its own five-tier MVP sequence in its §46, and
states the build rule behind it directly: *"Do not attempt to build every feature
simultaneously. Establish the operating architecture, build the control system,
test it, then expand."* This ten-sprint plan should be read as an execution of
that rule against THCO's actual codebase, not as a competing plan.

| Specification's MVP tier | What it covers | Where it sits in this plan |
|---|---|---|
| **MVP 1 — Project Control System** | Auth, roles, clients, projects, TSD assignment, stages, gates, dashboard, tasks, milestones, documents, activity log, What Next? | Sprints 1–5. "What Next?" as a real recommendation engine is not built here — see below |
| **MVP 2 — Product + Architecture** | Discovery, Product Brief, requirements, journeys, Architect request/selection, Architect Brief, architecture, diagrams, versions, decisions | Sprints 6–7 cover the artefacts (outcome brief, scoping document, architecture record). Versioned architecture diagrams and a structured decision log are not built here |
| **MVP 3 — Demo Loop** | First model tracking, Firewall/design review, demo workspace, feedback, **AI change analysis**, validation gate | Sprint 8 covers the demo artefact, feedback log and the loop mechanics. The AI change-analysis step — automatically classifying feedback and running impact analysis against product, architecture and scope — is not built here and has no obvious owner yet |
| **MVP 4 — Delivery Orchestration** | TalentSD, People & Operations, Legal, pod formation, engineering, QA, scope changes | Sprint 9 covers POD formation and scope freeze. TalentSD and People & Operations as active system participants, rather than named roles on paper, are not built here |
| **MVP 5 — Intelligence** | Recommendations, risk, scope, dependency, resource intelligence, portfolio control tower, learning loop | Entirely out of scope. This is the ten-agent AI layer, the Knowledge Graph, the Risk/Dependency engine and the Control Tower described in `delivery-os-flow.html` §07. Nothing in the current ten sprints builds toward it beyond leaving the data model open enough not to block it later |

**The honest summary:** this plan delivers MVP 1 and MVP 2, most of MVP 3, and the
structural half of MVP 4. It does not touch MVP 5, and MVP 5 is roughly half of
what the full specification describes by page count. Anyone asked "how far along
is the Delivery OS after these ten sprints" should be told that number, not "the
process is done" — the process is done; the operating system the specification
describes is not.
