# THCO CRM — Project State and Handover

**Last updated:** 24 August 2026

This document exists so that work can be picked up by someone (or something)
with no prior context. It records what the system is, what has been done, what
is deliberately not done, and where the traps are.

Read this first. Then read `DEPLOYMENT.md` for hosting and
`docs/POSTGRES_MIGRATION.md` if the database question comes up.

**Crowther Delivery OS is live in production, not a proposal.** As of
21 August 2026 (commit `c29295b`, confirmed live via `/version`), the 17-stage
delivery lifecycle described below is built and deployed. This section was
"Proposed work, not started" a day earlier; it no longer is. There is
substantially more still to do than this codebase reflects — see the "not yet
done" list below and §11.

**The 19 August meeting transcript is the real source of intent — read it
before the diagrams.** Joshua Ayo Omomia (CEO) walks the team through what he
actually wants on that call, and it is considerably smaller than the polished
architecture images suggest. In his own words:

- **Not a separate system.** *"We're folding the delivery system into the CRM
  ... the CRM is the single source of truth."*
- One intake form (name, client, template-or-custom, outcome, brief, transcript,
  documents) triggers an AI-scored assignment to a **TSD** member.
- A **Solution Architect / Project Tech Lead** is requested only *after* the
  client agrees to proceed — not before.
- A demo-before-build gate: no build starts until the client has seen and
  accepted a demo.
- Scope changes are a plain, editable requirements section kept current by
  whoever owns the client relationship. No formal change-control process.
- Documents only, for now — MD, Word, PDF. Explicitly **not** the knowledge
  graph, an AI copilot, or a "Foundation" brain yet: *"I don't want us to waste
  time building that yet."*
- Roles stay simple: **Engineer**. Foundry/Frontier/Firewall/Fabric are real
  org divisions but deliberately **not** modelled as separate CRM entities —
  *"we're looking at it not the divisions now but the functions."*
- Talent do not need CRM accounts unless they are an assigned engineer updating
  their own task status.
- The final org structure and entity mapping is still pending, to be shared
  company-wide at the September 2026 retreat. Expect further entity renames.

**The live Emergent build is a mockup Joshua made himself, not a system to
port.** `https://crowther-hub.preview.emergentagent.com/` is login-gated
(Google OAuth); not signed into, per policy. Its public bundle shows a handful
of stage tokens (Intake, Discovery, Architecture, Demo, Pod, Build, QA) — a
rough prototype, and Joshua calls it exactly that on the call: *"the delivery
system is all conceptual."*

**The elaborate infrastructure diagrams (Kubernetes, multi-AZ, WAF,
Prometheus/ELK, Postgres/Redis/OpenSearch) describe a platform nobody discussed
or approved**, and do not match how this CRM actually runs — one Azure
Container App, one Cosmos MongoDB vCore. Building toward them would be an
unrequested rewrite. Treat the *process* diagrams (the 17 numbered steps,
owners, phases) as the real spec; treat the infrastructure diagrams as
AI-generated decoration — Joshua's own words for the source document: *"AI
generated,"* *"I intentionally didn't go into much detail."*

**What has actually shipped (verified in code, 21 August 2026):**

- `backend/services/delivery_stages.py` — the 17-stage model. Phases
  (Intake→Definition→Design→Validation→Delivery→Close), a per-stage owner,
  `VALIDATION_STAGE = 11` and `BUILD_STAGE = 13` as named gates (*"a demo is
  not permission to build"*), a `LEGACY_STAGE_MAP` reconciling projects created
  under the old 10-stage model, and `STAGE_GATES` recording what must be true
  before a project may leave each stage.
- `backend/routers/delivery.py` — the API surface for it.
- `frontend/src/pages/flow/stages.js` — the browser-side mirror. Its own
  comment says `GET /api/flow/meta` is the source of truth and this file must
  stay in step with the Python module.
- `permissions.py` grew by close to 300 lines alongside this build and has
  **not** been reviewed as part of writing this section. Given how many past
  incidents traced to this exact file (§4, §8), read the diff before trusting
  it.
- Real files were committed under `backend/uploads/delivery/<uuid>/`, named
  `arch_*` and `demo_*`. Almost certainly test fixtures from building the
  "submit a solution-architecture diagram" upload feature the Technology Team
  asked for on the call — not client material — but worth confirming and
  removing from git as housekeeping regardless.

**Deliberately not done, per the transcript itself:** the knowledge graph /
"Foundation" brain, an AI copilot, a client-facing portal (client changes still
reach the system through the TSD by phone, WhatsApp or email — no portal), and
any of the Kubernetes/Postgres/multi-AZ infrastructure in the fancy diagrams.

**Superseded:** `docs/DELIVERY_OS_MIGRATION_PLAN.md`'s conclusion — that the
Emergent reference build's simplified 10-stage shape should be the authoritative
target — did not hold. The code that actually shipped uses the full 17 stages,
matching the diagrams' process side and the transcript, not the reference
build's rough prototype. `docs/CROWTHER_MIGRATION_PLAN.md` and
`docs/CROWTHER_SPRINT1_FIXES.md` (pulled 21 August alongside the code) are what
the shipped work actually follows; `docs/DELIVERY_OS_SPRINT_PLAN.md`,
`docs/delivery-os-comparison.html` and `docs/delivery-os-flow.html` are the
prior planning pass and are historical rather than current.

---

## 0. Tier 2 (delivery mechanics) — 24 August 2026

Tier 1 (the spine) was already live. This session built out most of Tier 2,
per `docs/CROWTHER_MIGRATION_PLAN.md` §13, all local-only and unpushed:

**Built:**
- **Talent and contract staffing** (§8) — new `backend/routers/talent_staffing.py`.
  Full requirement → assignment state machine (`shortlisted` through `deployed`
  or a terminal-but-recoverable `declined`/`withdrawn`/`not_signed`), gated to
  stage 12+, TSD confirms, TalentSD/People&Ops/architect notified at the right
  checkpoints, account + pod creation on deploy, one account reused across a
  person's several assignments.
- **Contract expiry** (§14 Q1) — `backend/services/contract_expiry.py`, run as
  the `contract-expiry-sweep` scheduled job (added to `scheduled-jobs.yml`).
  Flags People & Operations 7 days ahead, disables the account and closes pod
  membership on the day if not renewed.
- **Pod over-allocation** — `GET /delivery/talent/over-allocated` sums
  `allocation_pct` across a person's deployed pod memberships; flags anyone
  over 100%.
- **Scope changes** (§9.4) — `backend/routers/delivery.py`, new
  `scope_changes` collection. TSD approves/rejects/defers; approved mints a
  `committed` requirement; Senior Partner notified (not asked) only when
  timeline or cost impact crosses a threshold (>2 days or >5%, Victor's call).
  Free-text impact fields per spec, plus two optional numeric fields so the
  threshold has something to actually check.
- **Decisions and risks** — simple logs on `delivery.py`, no workflow of
  their own, matching how lightweight the spec calls for.
- **Closure checklist** — the template and per-project checklist already
  existed (`CLOSURE_CHECKLIST` in `delivery_stages.py`) but had no endpoint to
  check an item off. Added `PATCH /flow/projects/{id}/closure-checklist/{index}`.
- **Notification routing by function_role** (§37) — generic
  `notify_function_role_holders` / `notify_user_ids` helpers in
  `services/notifications.py`, used by everything above: only the actually
  affected function role, every notification carries a reason, a link, and
  reads as something to act on.
- All of the above wired into `ProjectWorkspace.jsx` as new drawers (Talent,
  Scope changes, Decisions & risks, Closure checklist) and into the one
  `workspace()` read so the project page stays a single round trip.
- **Transcript upload.** "Conversations so far" only accepted pasted text.
  Added `POST /delivery/projects/{id}/transcripts/upload` — accepts a
  file (.txt/.md/.pdf/.docx/.doc), extracts readable text server-side
  (`services/cv_parser.extract_text`, already built for CV parsing) so an
  uploaded transcript reads the same as a pasted one, and keeps the original
  file too. Wired into both `NewProjectForm.jsx` (deferred until the project
  exists, same pattern as brief documents) and `ProjectWorkspace.jsx`'s
  Documents drawer, which previously had no way to add a transcript at all
  once a project existed.
- **Business units**: HR and mini_admin now have the same unit-management
  access as super_admin (was wrongly super_admin-only in both the API and the
  frontend route guard); units can be **hidden** from the sidebar without
  deleting them (`hidden` field, toggle in Business Units Admin); units can be
  **reordered** by drag-and-drop, persisted via a new `order` field.
- Fixed a real bug: `seed_units_on_boot` re-upserted all ten canonical units
  on every server restart, silently undoing a deleted unit. Now runs at most
  once, gated on the units collection being empty.
- Fixed the task board's shared thumbnail pool having no delete — only
  claim/release — so a stray upload was stuck forever, visible on every
  unrelated project's picture picker. Added `DELETE /tasks/thumbnails/{id}`.

**Stage/gate audit, 24 August 2026 — one serious bug found and fixed:**
- **`board_build_clear` and `board_qa_clear` (stage 13 and 14 auto-gates) read
  `db.boards` / `db.cards`.** Nothing in the app has ever written to those
  collections — the real ones, used everywhere else including by the task
  board itself, are `db.task_boards` / `db.task_cards`. Both gates were
  therefore **permanently unsatisfiable from data**: every project reaching
  stage 13 or 14 required a forced gate (with a reason, alerting the Senior
  Partner) even when the board was genuinely clear. Fixed in
  `routers/flow.py`'s `_resolve_gate`. The same typo, same fix, in
  `taskboard.py`'s project-list stats endpoint (`done_counts` silently always
  read zero).
- **The board was never actually auto-created at stage 13.** §10.3 says "the
  board is created when the project enters stage 13, seeded with the default
  columns plus Design QA" — nobody had wired that up; board creation was a
  fully manual, one-column-at-a-time action with no automatic trigger. Added
  `taskboard.seed_default_boards()`, called from `transition_stage` on
  reaching stage 13, idempotent (skips if the project already has a board).
- **"Design QA" was never an actual column option.** Named in the stage 13
  playbook copy and in §10.2's plan, but missing from
  `DEFAULT_BOARD_TITLES` — added, positioned between "Ready For Merge" and
  "Done" per spec.
- Fixed a label drift in the frontend `stages.js` mirror: stage 12 was
  missing "and Pod Formation" from its label. Everything else in that file
  (phases, stage keys/labels/phases/owners, function labels) checked and
  matches the backend exactly.
- All three verified against the real API: forced a project through 12→13,
  confirmed all 9 boards (including Design QA) were seeded in order,
  confirmed the stage 13 gate read `satisfied: true` with an empty board and
  flipped to `false`/blocking the moment a card was added to a non-QA/Done
  column. Cleaned up afterward.
- Everything else in the gate/stage system checked out: every `auto` key in
  `STAGE_GATES` resolves against a real, correctly-named collection and
  field; a gate with `auto: None` is deliberately advisory ("your judgement"
  in `NextStepPanel.jsx`) rather than broken -- it was never meant to block,
  per the module's own docstring.

**Not done / known gaps:**
- **No local user has `function_role` set at all.** Every notification
  above was verified by temporarily assigning a role to a test account, then
  reverting it — the routing logic works, but nothing routes anywhere in
  today's local data until real staff get their function role assigned.
  This is a data gap, not a code gap.
- **Talent staffing UI is functional, not polished** — one "next action"
  button per assignment state, no free-text interview notes UI (the field
  exists server-side), no retry-after-three-attempts prompt (§8.6) surfaced
  yet.
- **Legacy projects predate the closure checklist.** Only projects created
  after this build carry one; older ones show "no closure checklist on this
  project" rather than an empty template. Not backfilled.
- **Q3 (transcripts to Legal) and Q4 (41 presentation pages)** — still open,
  per §14. Not touched this session.

**Two gaps found while writing a full stage-1-to-17 test runbook, fixed the
same session:**
- **Stage 2 "gap" was a research miss, corrected same session.** The
  original audit only read `NextStepPanel.jsx` and, by analogy with the
  stage-6 architect step, assumed no equivalent existed for naming a TSD —
  it does: `StructuredStageModal.jsx` (the dialog behind the main **Advance**
  button, used from both the project page and the pipeline board) already
  collects the TSD as part of the **1→2** move itself (`needsTsd = targetStage
  === 2`), disables its submit until one is chosen, and the project lands on
  stage 2 already carrying `tsd_id`. A redundant `TsdStep` was briefly added
  to `NextStepPanel.jsx` before this was found; removed once confirmed live
  that the real mechanism works end to end. Lesson: check the actual
  "Advance" button in the browser before concluding a control doesn't exist.
- **Milestones had no create UI**, and the read-only list that did exist had
  a real bug: it read `m.title`, a field the API has never written
  (`MilestoneCreate` writes `milestone_name`) — so no milestone ever showed
  a name. Added a `MilestonesSection` to the Build tab (name, deliverable,
  target date, payment %, plus "Mark delivered"), fixed the field name.
  Verified live: create → correct name displays → deliver → struck through
  with a delivered date, `has_milestones` satisfiable in the DB.
- **Stage 6 (`select_architect`) never advanced the stage.** The endpoint
  only sets `architect_id`/`architect_name`/`architecture_status` — it never
  touches `stage`. `NextStepPanel.jsx`'s own comment says stage 6 must not be
  "a room people sit in," but that's exactly what it was: a project could sit
  on a satisfied `has_architect` gate indefinitely until someone separately
  clicked Advance. Fixed by calling `flowAPI.transitionStage(project.id,
  ARCHITECT_STAGE + 1)` immediately after `selectArchitect` succeeds, in
  `ArchitectStep.select` (`NextStepPanel.jsx`). Verified live: reset
  `architect_id` to null on the test project, reselected via the real
  "Choose the Solution Architect" UI, confirmed auto-advance from 6→7 in the
  same action.

**Full stage-1-to-17 live walkthrough completed this session** (real UI
clicks throughout, gate state checked against the API after every action —
not just code review), on a dedicated test project ("Full Runbook
Walkthrough" / Northwind Traders). Besides the two fixes above, this
verified:
- **Scope freeze timing**: `scope_frozen` stays `false` while sitting at
  stage 11 and only flips to `true` the moment the project moves past it
  (`target > VALIDATION_STAGE` in `flow.py`) — freezing happens on leaving
  validation, not on arriving at it. Confirmed a requirement edit is refused
  with 409 ("Scope is frozen... raise a scope change") immediately after.
- **Stage 12 gates** (`has_pod`, `has_milestones`): formed a pod and added a
  milestone through the real Build-tab UI: both gates flipped from blocking
  to satisfied.
- **Board auto-seed at stage 13**: confirms all 9 default columns are
  created (`UI/UX Tasks`, `Dependencies`, `Backlog`, `Frontend Todo`,
  `Backend Todo`, `QA Review`, `Ready For Merge`, `Design QA`, `Done`) —
  including `Design QA`, which the stage 13 playbook copy names but a
  comment in `taskboard.py` notes was never actually offered as a column
  until this build.
- **`board_build_clear` / `board_qa_clear` regression-tested both ways**:
  added a card to the QA Review board via the API the UI itself uses,
  confirmed the stage-14 gate flips to `blocking` (`can_advance: false`);
  deleted the card, confirmed it clears again. This is the same
  collection-name bug documented in `flow.py`'s own comment ("this used to
  read `boards`/`cards`, which nothing in the app ever writes to") — now
  demonstrably working in both directions, not just returning `true` by
  default.
- **Stage 17 closure checklist**: all 10 items toggled through the real
  `PATCH /flow/projects/{id}/closure-checklist/{index}` endpoint, confirmed
  `closure_complete` flips to `true` once all 10 are done, and that stage 17
  correctly has no `next_stage` (it's the terminal stage — `can_advance`
  stays `false` there even once the checklist gate is satisfied, since
  there's nowhere further to go).
- Stages 15 (Client Acceptance and UAT) and 16 (Handover) are judgement-only
  gates (`auto: null` on every condition) — confirmed they never block and
  advance cleanly.

**Real bug caught live while doing the above, fixed same session**: every
drawer on the project page (Closure checklist, Pod, Milestones, Talent,
Client feedback, Scope changes...) closed itself the instant you checked a
box or saved anything inside it. Root cause was in `FlowProjectDetail.jsx`,
not in any individual drawer: its `load()` unconditionally called
`setLoading(true)`, and `ProjectWorkspace` (which owns which drawer is open
and which tab is active, as local state) is only mounted while
`!loading` — so every action that bubbled up to `onChanged={load}` (which is
nearly all of them) unmounted and remounted the entire workspace, wiping
that local state. Fixed by giving `load()` a `{ silent: true }` option that
skips the top-level spinner, and passing it from every background-refresh
call site (`HealthControl`, `LifecycleLine`, `ProjectWorkspace`, `BuildPanel`,
and the manager/team/edit/transition handlers) — only the initial
navigation-triggered load still shows the full-page spinner. Verified live:
unchecked and rechecked a closure-checklist item with the drawer open
throughout, confirmed via `git grep` that no other page in the app has the
same `onChanged={load}`-into-unconditional-`setLoading(true)` shape.

**Second real bug, same family, caught right after**: the "what happens
next" popup that appears on hovering a stage marker on the lifecycle line
(`LifecycleLine.jsx`) closed itself before the pointer could reach it. Each
marker is a 6px-tall sliver; the panel opens 8px below it (plus the phase
label text in between) with no hoverable element bridging the gap, so
`onMouseLeave` fired the instant the pointer left the marker and unmounted
the panel before the pointer physically arrived over it — there was no route
from "hovering the marker" to "reading or clicking the panel" at all. Fixed
by replacing the old `hovered`/`inPanel` boolean pair with a single
`activeStage` plus a cancellable close-delay (`setTimeout`, 400ms): entering
either the marker or the panel cancels any pending close, leaving either one
schedules it. Verified live by hovering a marker, then moving the pointer
into the panel body — it stays open and stable as long as the pointer is on
either element.

The runbook itself lives as a published artifact (interactive checklist,
localStorage-persisted) — ask for the link if it's not at hand.

---

## 0b. Tier 3 (control and visibility) — 26 August 2026

Built in one session, per `docs/CROWTHER_MIGRATION_PLAN.md` §13. All
local-only and unpushed, like Tier 2.

The whole tier is a **reader** of what Tiers 1 and 2 already record. The only
thing it writes is a blocker, which had nowhere to live before. That is
deliberate: a second source of truth that can disagree with the project page
is worse than no control tower at all.

**New backend router — `backend/routers/control_tower.py`** (prefix
`/api/control-tower`, wired in `server.py`), nine endpoints:

- **`GET /portfolio`** — every project the caller may see as one row, with
  computed signals: days since last stage movement, stalled, open blockers,
  critical blockers, pending scope changes, overdue milestones, forced-gate
  count, open risks, requirement count, awaiting-architect, closure progress.
  Plus headline counts and a per-phase breakdown. Counts are computed
  server-side so the number and the list behind it cannot disagree. Closed
  (stage 17) projects are excluded unless `include_closed=true`.
  **Performance**: uses one grouped aggregation per metric
  (`_count_by_project`) rather than a query per project per metric — the
  difference between one page load and ~250 round trips at 36 projects.
- **`GET /exceptions`** — the Senior Partner view (§13): only what needs
  somebody, each row carrying `kind`, a ranked `severity`, a human title and
  detail, and a link. Covers red health, forced gates, material scope changes,
  stage 6 waiting on an architect, overdue milestones, open blockers, stalled
  projects and open high-impact risks.
- **`GET /search`** — across requirements, decisions, risks, scope changes,
  blockers, client feedback and **document text** (the extracted content of
  uploaded briefs and transcripts), not just project names. Regex is escaped,
  so a user typing `.*` gets a literal search rather than a wildcard. Long
  document hits return a ±90-character snippet window rather than the whole
  extracted PDF.
- **Blockers** — `GET/POST /projects/{id}/blockers`,
  `POST /blockers/{id}/resolve`, `GET /blockers` (portfolio-wide). Kinds:
  internal / client / third_party / dependency. Severities: low → critical.
  Supports `blocking_project_id` for the **cross-project** case the board
  cannot express at all (a card belongs to exactly one board). A critical
  blocker notifies the TSD. Resolved, never deleted — "what held this up" is
  what the closure report needs.
- **Traceability** — `GET /projects/{id}/traceability` and
  `PATCH /cards/{id}/requirement`. Answers two questions nothing else in the
  product can: a requirement with no card is scope nobody started, and a card
  with no requirement is work nobody asked for. `requirement_id` /
  `requirement_ref` added to `CardCreate`/`CardUpdate` in `taskboard.py` so a
  link survives a card edit. The link endpoint refuses a requirement belonging
  to a different project, which is what keeps the coverage figure meaningful.
- **`GET /projects/{id}/report`** — the project report assembled from records:
  header, full stage timeline with per-stage durations and forced flags,
  requirements by status, demo/validation outcome, scope changes, board and
  milestone summary, decisions, risks, blockers, forced gates, closure
  checklist. At stage 17 this **is** the closure report the gate asks for
  (`is_closure_report: true`) — same assembly, read at the end. Deliberately
  JSON rather than a server-generated PDF: the page renders it and the page
  prints, rather than maintaining a second formatting system.

**New frontend:**
- `frontend/src/pages/flow/ControlTower.jsx` — three views (Needs attention /
  Portfolio / Search) at `/flow/control-tower`, with a nav entry in
  `FlowShell.jsx` beside Pipeline. Opens on **exceptions**, because a control
  tower that opens on a list of everything is a list of everything. Headline
  numbers are clickable filters over the same rows.
- `ProjectWorkspace.jsx` — a **Blockers** drawer, a **Report** drawer, and a
  new **Traceability** tab (it earns a tab rather than a drawer: it is a table
  you read across, and it answers "are we building what we agreed", asked at
  every stage from 13 on).
- `controlTowerAPI` in `lib/api.js`.

**Design decision worth knowing about — the forced-gate window.** Nothing ever
resolves a forced gate, so surfacing all of them forever would mean the
exception list grew monotonically and eventually became unreadable — the exact
failure the view exists to prevent. Forced gates therefore appear as
exceptions only for **active projects** and only within
`FORCED_GATE_ALERT_DAYS = 30`. Past that they remain in the project's stage
history and in its report, which is where a months-old governance fact
belongs. Red health, by contrast, is shown even on a closed project: red
health that survived closure is itself the thing worth looking at.

**Verified live, against real data (36 projects), not just code review:**
- Portfolio returned all 36 with correct phase grouping and signals.
- Exceptions went 0 → 2 as a critical blocker and RED health were created,
  correctly ranked (health 100 > critical blocker 95), then back to 1 when the
  blocker was resolved.
- Traceability on the runbook project: 3 requirements → 67% coverage, 1
  delivered (its card in Done), 1 uncovered, 1 unlinked card. Cross-project
  link refused with 400; nonexistent requirement 404.
- Search for "invoice" found the requirement, the client feedback, the brief
  **and the extracted transcript text** across two projects; `.*` returned 0,
  proving the regex escape.
- Closure report on the stage-17 project assembled the full 17-move timeline,
  10/10 checklist, demo round 2 validated, board columns and governance
  counts.
- Every write path exercised through the real UI, not only the API: raised a
  blocker from the drawer (drawer stayed open — the Tier 2 fix holds), and it
  appeared in the Control Tower exception list immediately.

**Test data left in place on purpose** so the Control Tower has something to
show: an open `third_party` blocker and RED health on "Full Runbook
Walkthrough" (`b2b82e32-…`), plus three board cards, two of them traced to
R-01/R-02. Safe to delete.

**Not done in Tier 3:** the dependency *engine* beyond blockers (§13 asks for
blockers "beyond board columns" — cross-project blockers are in, but there is
no critical-path or automatic-dependency inference, which reads as Tier 4
territory); no PDF export of the report; and traceability has no bulk-link
action, one card at a time.

---

## 0c. Tier 4 (intelligence) — 26 August 2026

Built the same session as Tier 3. Local-only and unpushed.

**The prerequisite the plan names (§11.2) is done.** `emergentintegrations`
was a local stub whose constructors raise, not in `requirements.txt`, keyed on
`EMERGENT_LLM_KEY` (the scaffolding vendor's). Replaced by
`backend/services/llm.py`, a `litellm` adapter — exactly the plan's own
prescription. The old stub and its importers in `flowforge_ai.py` etc. are
untouched and still broken; nothing in Tiers 1–4 imports them any more, and
FlowForge remains out of scope per §11.3.

**Two decisions Victor made before the build:**
- **Provider: Groq**, using the `GROQ_API_KEY` already in `.env` — chosen over
  Anthropic to avoid new spend.
- **Behaviour: auto-fill drafts, human confirms.** AI pre-fills a form; a
  person still saves it.

**⚠ The Groq key in `.env` is dead.** It returns `403 / error code: 1010` on
both `/models` and `/chat/completions`. It is present but revoked or expired.
Everything is wired and waiting; replace `GROQ_API_KEY` (or set `LLM_MODEL` to
another provider and add its key) and the four model-backed features light up
with no code change.

**The architecture that made a dead key survivable — and the point worth
keeping:** *half of Tier 4 needs no model at all.* Choosing a TSD, choosing an
architect, and reading project health are **ranking problems over records the
system already keeps**, not language problems. Those four features run on
data: no key, no cost, and reasoning you can check row by row. The model, when
present, does only the parts that genuinely need language.

| Feature | Basis | Works today? |
|---|---|---|
| TSD recommendation (stage 2) | data | **yes** |
| Architect recommendation (stage 6) | data | **yes** |
| Health recommendation | data | **yes** |
| Next-step generation | data (+model narrative) | **yes** |
| Scope-change impact analysis | model | needs a key |
| Risk suggestions | model | needs a key |
| Transcript → requirements | model | needs a key |
| Report narrative | model | needs a key |

**The recommendation contract** (SPEC §27.1 is not in this repo, so it is
defined in `delivery_intelligence.recommendation()`): every suggestion carries
`kind`, `value` (machine-usable), `display` (human-readable), `rationale`,
`confidence`, `options`, `fields` (the form pre-fill), and — the important
one — **`basis`: `data` | `model` | `data+model`**. A reader who cannot tell a
checkable record from a model's guess cannot sensibly decide whether to trust
it. The UI renders that distinction in colour and words on every suggestion.

`requires_confirmation` is hard-coded true, not a parameter, and **no route in
`routers/intelligence.py` writes to a project**. Applying a suggestion means
the browser passes its `fields` to whichever ordinary endpoint already owns
that write, so the same permission check runs whether a human typed the value
or accepted it. That makes "AI recommends, humans decide" (§44) a property of
the routing rather than a convention.

**Ranking signals** (`_rank`): qualification (holds the role > has done it
before > merely available), then whether they have worked with **this client**
before, then current live load in **that same role**, then a penalty for
projects already red. Confidence is derived from the *gap* between first and
second place — a photo finish reports `low`, which is more useful than picking
one and sounding certain.

Notably it does **not** dead-end when nobody holds a function role — which is
today's actual state, per the Tier 2 gap list. It follows the convention
`flow.py`'s `users_by_function` already sets (holders, then everyone active)
and adds a better signal: who has *actually done the job* on a past project.
Verified live — it correctly picks Anabel for TSD (has run this client before)
and Dean for architect (`can_architect`, worked this client), and says openly
that nobody has been granted the role.

**Health suggestion never writes health.** §13 keeps the TSD override, and it
is kept: the suggestion fills the form, the existing endpoint still requires
the TSD and still demands a written reason. Its value is catching the project
that is quietly amber while its header says green.

**Key verification, and why `available` was not enough.** `availability()` can
only see that a key is *present*. Reporting "available: true" for a revoked
key would make every feature fail silently later — the worst outcome. So
`llm.verify()` makes one tiny cached live call and the status endpoint reports
`verified`. This is how the dead Groq key was caught, and why the panels now
say *"GROQ_API_KEY is set, but the provider rejected it"* with the exact fix,
rather than "not available".

**New files:** `backend/services/llm.py`,
`backend/services/delivery_intelligence.py`,
`backend/routers/intelligence.py` (9 routes),
`frontend/src/components/flow/Suggestion.jsx` (the one strip every suggestion
renders through), `intelligenceAPI` in `lib/api.js`.

**Wired into existing panels only**, per §13's "replaces text inside a panel
that already exists": `StructuredStageModal` (TSD), `NextStepPanel` (architect
+ next step), `HealthControl` (health), `ProjectWorkspace` report drawer
(narrative), risks drawer (risk suggestions), scope-changes drawer (impact).
No new screens.

**Also added, because the impact draft had nowhere to go:**
`PATCH /delivery/scope-changes/{id}` — records the impact assessment
separately from the decision (the architect assesses, the TSD decides, often
at different times). Pending changes only; it refuses to touch one already
approved or rejected, so an assessment can never quietly rewrite a decision
already taken.

**Verified live:** all 9 routes 200; data-only features return real rankings
against 36 real projects; model-gated features degrade to a named, actionable
message; the health suggestion filled the form in the browser (AMBER + the
specific blocker as the reason) and **saved nothing** until Save was pressed.

### Notifications, sound, and the stage-permission split — 26 August 2026

Four changes, all local.

**1. The bell was not broken; the two people who matter were never told.**
44 notifications existed and the API returned them correctly. What was missing
is that **being made TSD or Architect produced no notification at all** —
`select_architect` and `set_project_manager` each wrote the project record and
returned. Pod members were notified; the two people actually accountable for
the project were not. Added `notifications.notify_project_role()` and called it
from all three assignment paths: the TSD picker (`PUT
/projects/{id}/manager`), the architect selection (`POST
/select-architect`), and the **stage 1→2 transition**, which stamps `tsd_id`
via its payload and was the least obvious of the three. New kind
`project_role_assigned`, deliberately distinct from `added_to_project` — a pod
member is given work, these two are given the project. In-app plus email; the
body says what is now *theirs to do*, not just their title. Never fires when
somebody assigns themselves, never fires on re-submitting the same person, and
never raises — a delivery failure must not roll back an assignment already
made. Verified live: assigning a TSD and naming an architect both produced
correctly-worded notifications.

**2. Notification sound, audible from another window.**
`frontend/src/lib/notificationAlert.js`. Two channels, because neither is
enough alone: **sound** reaches somebody working in a different browser
entirely, and a **desktop notification** reaches somebody whose machine is
muted and says *what* happened. The tone is synthesised with the Web Audio API
rather than shipped as an mp3 — no asset to load, nothing to 404 or cache-bust,
works offline. Two soft notes (G5→B5, ~0.3s, enveloped so they do not click).
Quiet on purpose: this fires while people are doing other work, and an alarm
gets the tab muted permanently. Muting is one click in the bell header and
persists in `localStorage`; switching it back on plays the tone immediately,
which both proves it works and supplies the user gesture browsers require
before audio is allowed at all. Desktop permission is requested from that same
click rather than on page load, where browsers ignore it and people reflexively
choose Block. The poll went 30s → 20s, because it is now how somebody in
another window finds out at all. Arrival is detected by comparing against the
previous count, seeded `null` so logging in with old unread items does not
chime. Verified live: badge updated, list rendered, toggle persisted, and two
oscillators confirmed generated on unmute.

**3. Stage permissions split three ways** (`can_move_stage`, now stage-aware).

| | TSD | Architect | Senior Partner |
|---|---|---|---|
| Advance stages 1–17 | **yes, all** | only 8, 9, 13, 14 | — |
| Move backwards | yes | no | — |
| Force an unmet gate | yes | **no** | — |
| Name the Architect | **no** | no | **yes, alone** |

The TSD moves it through **every** stage, including the ones the Senior
Partner nominally owns — delivery must not stall because somebody senior is in
a meeting. The Architect moves it **out of the stages they own**, forward only:
they are functional rather than supervisory, so when the work of their stage is
done they say so themselves instead of asking the TSD to click for them.
Backward moves are corrections to project state and stay with the TSD. Forcing
a gate stays with the TSD too, deliberately *not* extended alongside
`can_move_stage`: advancing a satisfied gate is doing the job, overruling an
unsatisfied one is a different act that alerts the Senior Partner. And neither
of them reaches the Senior Partner's one reserved act — naming the architect.

The architect-owned set is **derived from the stage table**
(`architect_owned_stages()`), not written as a literal, so renumbering a stage
cannot leave it quietly wrong. `can_move_stage` takes an optional
`target_stage` so one function answers both questions the app asks: "may this
person move it at all" (the UI flag) and "may they make *this* move" (the
transition). Verified across the full matrix.

**4. "Project manager" retired from user-facing copy.** Five error messages in
`flow.py` and `taskboard.py` now say TSD (and, for the board, "its architect"
— which `can_manage_boards` already allowed but never said). The
`project_manager_id` / `project_manager_name` **fields** are deliberately left
alone: they are legacy columns still read for rows the migration has not
rewritten, and renaming them without migrating the data would break those
reads. Two stage-advance tooltips updated to describe the new split.

**Not done:** no WebSocket/SSE push — this is still polling, so worst-case
latency is 20 seconds; real-time would need a persistent connection the backend
does not currently hold. No per-kind notification preferences. Engineers added
to a pod already notify via the existing `notify_added_to_project`, which was
not changed.

---

### Email suppression, SP routing, ownership rules — 26 August 2026

**1. ⚠ Test emails were reaching real colleagues.** The accounts in this
database belong to real people; local testing was mailing them repeatedly about
projects that are not real. `services/__init__.py` now honours **`EMAIL_MODE`**:
`live` (default, so production is unchanged), `off` (recorded in `email_logs`
with status `suppressed`, delivered to nobody), or `redirect` (everything to
`EMAIL_REDIRECT_TO`, with the intended recipients in the subject and a banner).
**`EMAIL_MODE=off` is now set in `backend/.env`.**

Worth knowing: the first attempt read `EMAIL_MODE` at module import and it
silently stayed `live`, because `server.py` imports `services` on line 23 and
calls `load_dotenv()` on line 30. It is now read per call. Verified: a
subsequent alert logged `suppressed / mode=off` with the intended recipient
still recorded.

**2. Every Senior Partner alert in the system was reaching nobody.** No account
holds `function_role: senior_partner` — the same data gap noted in Tier 2 — so
`_users_with_function(SENIOR_PARTNER)` returned `[]` and forced-gate alerts,
red-health alerts and scope-change threshold alerts were all silent no-ops that
reported success. Added `notifications.function_role_recipients()`, which falls
back to **super admins** when the Senior Partner role is unheld. Sound rather
than a guess — Victor's own statement is that the Senior Partner holds the
super admin account — and it yields the moment a real person is granted the
role. Used by `notify_function_role_holders` and by `flow._alert_senior_partner`.

**3. TSD acknowledgement — the TSD tells the Senior Partner where they are.**
New `POST /flow/projects/{id}/acknowledge` with three states: `received`,
`acknowledged`, `accepted`. Ordered on purpose — seeing it, having read it, and
taking it on are three different commitments. Each notifies the Senior Partner
in-app *and* by email. Recorded on the project as `tsd_acknowledgement`.

**This made a fake gate real.** Stage 3's *"TSD accepts ownership of the
project"* was `auto: None` — a judgement tick with nothing behind it. It is now
`auto: "tsd_accepted"`, satisfied only by an outright `accepted`. Verified: the
stage 3 gate blocks before acceptance and clears after. **Two projects were at
stage 3 when this shipped and now need the click before they can move.**
UI is `components/flow/TsdAcknowledgement.jsx`, shown under the project header
while `stage <= 4` — it is an intake question, not a permanent panel.

**4. Ownership rules re-cut**, per Victor's brief:

| | Senior Partner | Admins (super/mini/HR) | TSD | Architect |
|---|---|---|---|---|
| Advance any stage | **yes** | **yes** | **yes** | only 8, 9, 13, 14 |
| Force an unmet gate | yes | yes | yes | no |
| Name the Architect | **yes, alone** | yes | no | no |
| Create a project | **yes** | yes | **only if granted** | no |

Project creation was previously open to any commercial account, any TSD and any
unit head, which is how the pipeline fills with work nobody agreed to take on.
It is now the Senior Partner's and administrators', with a per-person grant —
`can_start_projects` on the user account, the same shape as `can_architect`,
offered in User Management when the function role is TSD. That is the "in case
he is busy" case: handed to named people one at a time, and taken back the same
way. `can_grant_project_creation` keeps the granting itself with the Senior
Partner and admins.

The Senior Partner is now named explicitly in `can_move_stage` and
`can_force_gate` rather than relying on `is_admin`. They hold the super admin
login today, so the old rule covered them by accident; granting the function
role to somebody without that login would have quietly broken it.

**5. Two UI bugs from the screenshot.**
- **The TSD dropdown on the new-project form was always empty.** It filtered
  the raw staff list by `function_role === "tsd"`, and no account has a
  function role. Now uses `users-by-function`, the convention the rest of the
  app already follows: holders first, then everybody active, each labelled.
  Verified — 17 options where there was one.
- **The picture that "stays permanently".** Not a bug in the form: the
  thumbnail library is shared, and any picture not yet claimed by a task shows
  on every project's picker including new ones. The delete existed but was
  invisible until hover and 20px across, so it read as permanent. The button is
  now always visible, larger, and red on hover, and the caption says plainly
  that the library is shared and how to remove something from it.

**Not done:** the underlying data gap remains — **no account has a
`function_role`**, which is why the TSD dropdown labels everyone "(not a TSD)"
and why the Senior Partner fallback is load-bearing. Assigning real function
roles in User Management would resolve several of these at once and is a data
task, not a code one.

---

### Delivery-flow fixes, batch 2 — 26 August 2026

**The root cause behind three separate complaints.** `function_role`,
`can_architect` and `can_start_projects` existed **only on the create-user
form**. There was no way to set any of them on an existing account. That is why
no account has a function role, why the TSD picker labelled everyone "(not a
TSD)", why the architect suggestion could only ever name Dean (the one account
carrying `can_architect`), and why administrators could not grant project
creation. All three are now editable on any user, under a **Delivery role**
section in the edit dialog, with the two grants appearing conditionally on the
role. Changing one clears the session cache, so a grant takes effect without
the person signing out.

**Unmet gate conditions are now links.** `components/flow/gateFixes.js` maps
each `auto` key to where it is satisfied, and both places conditions render —
the Advance dialog and the Next Step panel — turn a red row into "Form the pod
→", "Attach demo materials →", "Clear the QA Review column →". The targets are
plain URLs (`?tab=build`, `?drawer=demos`), read by `ProjectWorkspace` on mount
and then stripped from the address bar, so they double as links you can send
somebody. Conditions nobody but the Senior Partner can clear say so instead of
linking.

**Backward moves stopped showing a forward gate.** The Advance dialog fetched
the gate for the stage being *left* and showed it whichever direction the move
went, so 10→9 looked identical to 10→11 — the reported "same criteria". A
backward move now shows what it actually does, hides the conditions (the server
already skips them), and requires the reason the server already demanded. The
9↔10 demo loop is exempt, as it is server-side.

**The architect could not mark a demo held.** Stage 9 is architect-owned and
`demo_held` is one of its two gate conditions, so the person who owns the
stage, opens the round and uploads the materials had to ask the TSD to click
the one button that clears their own gate. Fixed. Audited every other
`is_project_tsd` check while there: the rest are correct by design — the demo
*outcome*, client feedback and scope-change decisions stay with the TSD because
the TSD is the single channel for client information.

**Also this batch:**
- **Architect acknowledgement.** The same three buttons the TSD has
  (received / acknowledged / accepted), recorded separately in
  `architect_acknowledgement`, notifying the Senior Partner. Being named and
  then hearing nothing was the same gap for both roles.
- **Architect can be named at project creation** — Senior Partner and
  administrators only, same rule as stage 6, and they are notified identically.
- **Card comments** (`task_comments`) — did not exist at all. Anybody on the
  project may comment; you may edit only your own; deleting is yours or a board
  manager's. Pod members could already attach files and move cards.
- **Client feedback attachments** — a marked-up screenshot or a spreadsheet of
  corrections now lives beside the feedback it arrived with rather than in the
  general document pile.
- **Milestone deliverables** — the actual file, on the milestone it satisfies.
- **Demo rounds: full CRUD and real timestamps.** `held_at` accepts an explicit
  date and time (plus duration and attendees) rather than always meaning "now",
  which was wrong for the ordinary case of recording a demo the next morning.
  Delete exists for the round opened by mistake and **refuses** a round that was
  held or has an outcome — that is history. Remaining rounds renumber so
  "round 3" keeps meaning the third demo the client saw.
- **Milestones become board cards.** Creating one adds a card to Backlog with
  its deliverable as the description and its target date as the due date,
  linked by `milestone_id` and idempotent. `seed_default_boards` also tops up
  from existing milestones when the board is created at stage 13, so a project
  that planned its milestones at stage 12 does not open an empty board.
- **"Transcript" is now "Document flow"** in the intake form — it accepts any
  record of what the client sent or said, not only call transcripts.
- **Board rights needed no change** — `can_manage_boards` already admitted the
  TSD and the architect; only its docstring still said "unit head".

**Front ends for those four, wired and verified in the browser:**
- `components/flow/AttachmentStrip.jsx` — one inline row of files, shared by
  client feedback and milestones. Deliberately not a modal: it sits inside a
  list of feedback items or milestones and anything heavier would compete with
  the thing it belongs to.
- **Client feedback** — "Attach what they sent" on each item. Verified by
  uploading through the real UI: the file saved against the right feedback row
  and the drawer stayed open.
- **Milestones** — "Attach the deliverable" on each row, with removal.
- **Demo rounds** — a `datetime-local` field for when a round was actually
  held (blank still means now), and "Delete this round". Both appear only on a
  round that is un-held and undecided; a held round offers neither, matching
  what the server enforces.
- **Card comments** — `components/tasks/CardComments.jsx`, added to
  `TaskDetail`. Enter posts, Shift+Enter is a newline. Verified by posting one
  through the UI.

One bug found while wiring: `AttachmentStrip` first called `FileLink` with
`url` plus children, but `FileLink` takes `fileUrl` and `name` as props — it
fetches the bytes with the session attached rather than rendering an anchor.
The filename rendered blank until that was corrected.

**Pod members can now answer for themselves.**
`POST /flow/projects/{id}/pod-response` with `acknowledged` / `accepted` /
`declined`. Being added to a pod was treated as agreeing, which it is not:
people are on leave, already at capacity, or the wrong discipline, and the
project found out when the work did not happen. **Declining requires a reason**
— "no" on its own leaves the TSD exactly where they started — and it
deliberately does *not* remove the person from the pod: that is the TSD's
decision to make with the reason in front of them, and silently unstaffing a
project from a button would be worse. The TSD is notified, and the architect
too on a decline, since they raised what the pod needed. One row per person,
replaced on re-answer, so the list reads as the current position rather than a
history. The TSD and architect are excluded — they are asked about *owning* the
project in their own panel, and asking again as pod members would be two
questions about the same thing. UI is
`components/flow/PodResponse.jsx`; everybody on the project sees the roster,
because "who has actually confirmed" is a question the whole pod has.

**Contacts are added inside the project now.** The drawer's only action was a
link to `/flow/contacts` — leaving the project to record who you just spoke to,
when the client was already known and there was nothing to go and look up. It
is an inline form: name, role, email, phone, birthday, relationship strength.
Contacts still match on the **client**, deliberately, so somebody met on one
engagement is the same person on the next; a new `project_id` field records
which engagement produced them.

Found while wiring it: the drawer rendered `c.name` and `c.role`, but a contact
stores `full_name` and `title` — **every contact row had been displaying a
blank name**. Fixed, and verified by adding one through the new form.

---

### Deleted units, and who may architect — 26 August 2026

**Deleted and hidden units kept reappearing, and the earlier "fix" was the
wrong half.** `seed_units_on_boot` was corrected earlier so a deleted unit does
not come back — and it does not. They were reappearing because **three screens
rendered a hardcoded list and never read the database at all**:
`UserManagement.jsx` (`ALL_UNITS`), `UnitSelectionModal.jsx` (`UNITS`), and the
filter dropdowns in `ApprovalQueue.jsx` and `WorkflowInventory.jsx`. An
administrator could delete "Academy & Learning" and it stayed assignable
forever — granting access to a unit that no longer exists, a permission nobody
can ever act on.

All four now read `unitsAPI.list()` and exclude `hidden`. The built-in arrays
survive only as a fallback for the moment before the fetch returns
(`FALLBACK_UNITS`), and as curated styling — icon, gradient, accent — keyed by
slug. That is what `Dashboard.jsx` and `DashboardLayout.jsx` were already doing
correctly, and why the sidebar was right all along. Verified in the browser: the
access picker offers the 6 live units, no Academy, none of the 3 hidden ones.

**`can_architect` was the wrong shape.** It was a flag somebody had to tick per
person, which in practice meant one engineer carried it and every architect
recommendation named him regardless of the project — the reported "why always
Dean". Being a Solution Architect is not a grant somebody remembers to give; it
is what an engineer on the development team is eligible for. So
`permissions.can_architect` is now **the flag OR an engineer in Technology &
Build**, with `ARCHITECT_CANDIDATE_QUERY` as the same rule in Mongo form, so the
predicate and the four queries that list candidates cannot drift apart. The
explicit flag still grants, for anyone outside that unit who should be eligible.

Also: the staff table's `pm-badge` still read "PM · Technology & Build". It
reads TSD now — 0 visible "PM" left on that page.

**Note:** *Technology & Build is currently hidden*, along with Sales & Business
Dev and Client Delivery. Hidden units are now correctly excluded from the
pickers, so nobody new can be added to Technology & Build until it is unhidden.
Existing members keep their access and the architect rule still works for them.
If hiding it was not deliberate, unhide it in Business Units Admin.

**Function roles assigned** — `backend/function_roles_before.json` holds the
before-state. The 6 unit heads → `tsd`; Ayo → `senior_partner` (he holds the
super_admin login, same person); Dean → `engineer`; Victoria → `people_ops`;
Victor Tim → `engineer`. Left unset: AINA ADOPTION (a gmail account orphaned
from the deleted Academy unit) and the 5 TEST_QA accounts — unset is a real
state, and guessing would grant permissions nobody asked for.

---

**Not done in Tier 4:** the transcript-extraction and scope-impact prompts
have never been run against a live model (no working key), so their output
quality is unproven — the plumbing is verified, the prompting is not. No
caching of suggestions (each request re-asks). No feedback loop recording
whether a human accepted or rejected a suggestion, which is what would make
the ranking improve over time.

---

## 1. What this is

An internal CRM and talent platform for THCO (The Haguet Consulting
Organization). It covers project delivery, proposals, clients, a task board, an
internal CV database, and external candidate sourcing.

| Layer | Technology |
|---|---|
| Frontend | React 19, CRA via craco, Tailwind, shadcn/ui |
| Backend | FastAPI (Python 3.12 in the container), Motor async MongoDB driver |
| Database | MongoDB — Azure Cosmos DB for MongoDB (vCore, **M10**, cluster `thco-crm-mongo-r1`) |
| Hosting | Azure Container Apps, West Europe |
| Email | Resend, sending from `noreply@thcohq.com` |
| Repo | `github.com/THCO-Labs/THCO-CRM` (org-owned) |

**Live URL:** `https://thco-crm.bravefield-81de7529.westeurope.azurecontainerapps.io`

The backend serves both the API (under `/api`) and the compiled React bundle.
It is a single container, not two services.

**Which commit is live:** `GET /version` returns the build SHA. Use it. A green
deploy workflow has twice reported success while production carried on serving
the previous build.

---

## 2. How to run it locally

```bash
# Backend  (venv already exists at backend/venv)
cd backend
./venv/Scripts/python.exe -m uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npx craco start        # http://localhost:3000
```

Local MongoDB runs in a Docker container named `thco-mongo` (`mongo:7`) on
`localhost:27017`, database `thco_crm`. If the machine has restarted it will be
stopped: `docker start thco-mongo`.

Configuration lives in `backend/.env` (gitignored). It holds `MONGO_URL`,
`DB_NAME`, `JWT_SECRET`, `RESEND_API_KEY`, `SENDER_EMAIL`, `FRONTEND_URL`,
`SCHEDULER_TOKEN`, `GMAIL_CV_MAILBOX`, `GMAIL_IMAP_PASSWORD`, the sourcing API
keys and the Google service account JSON.

**Local and production use separate databases.** Data created in one does not
appear in the other. Local holds a subset of production's staff grants, which
is normal and not a sign of anything missing.

---

## 3. Accounts

Production has 30 active users. The ones that matter structurally:

| Who | Role | Notes |
|---|---|---|
| Ayo (CEO) | `super_admin` | Sees every project |
| Victoria | `mini_admin` + `is_hr` | Manages staff, cannot create super admins |
| Anabel Emekene | `team_member`, **PM of Technology & Build** | Named on the *unit*, not on her user record — see §4 |
| 11 others | `team_member` with `headed_units` | Project managers of their own units |

The two domains are both real and distinct: `thcohq.com` is Google Workspace,
`thcohqs.com` is Zoho. Not a typo.

Everyone can change their own password and details — see §6.

---

## 4. Authorisation model — read before touching any endpoint

`backend/services/permissions.py` is the single source of truth. Rules are
enforced **server-side**. The frontend also hides what a user cannot use, but
that is presentation only.

This matters because it has been wrong more than once. The sidebar once hid the
admin section while the API served anything to anyone logged in. More recently,
three "New Project" buttons in Flow were rendered for people the API refused,
which reads as a broken feature rather than a rule.

### The three kinds of person

| | What they get |
|---|---|
| **Administrator** (`super_admin`, `mini_admin`, `is_hr`) | Everything. Sees every project. |
| **Project manager** — anyone with a non-empty `headed_units` | THCO Flow, and creates projects under units they head. Sees **only projects they created or co-manage** — not a colleague's project in the same unit. |
| **Collaborator** — on a project, heads nothing | The **task board only**. No THCO Flow at all. |

### Project manager grants come from two places

Both are real and both must be read. Collapsing them once stripped every
manager's rights across the firm.

1. `users.headed_units` — a per-person grant, many people per unit.
2. `units.head_user_id` — one named manager for a unit. **This is how Anabel
   holds Technology & Build**; her `headed_units` array is empty.

`get_current_user` in `server.py` merges the two onto the user dict. Anything
querying `users.headed_units` alone will under-report who is a manager — a
count taken that way missed Anabel entirely.

### The resolved identity is cached for 45 seconds

`get_current_user` costs four database round trips — session, user, the units
they head, and a count deciding whether they have any real project. Every
authenticated request paid all four, and page polling multiplied it. On
19 August that load was part of what took the cluster down.

The result is now cached against the session token (`AUTH_CACHE_SECONDS`,
default 45). **None of the permission logic changed** — it is computed exactly
as before and the answer reused.

The cost is that a rights change can take up to 45 seconds to be felt, so the
cases that matter clear it immediately: signing out and deleting an account drop
that session, changing a password drops every session of that person, and any
write that can move management around calls `clear_user_cache()` — the whole
cache, rather than guessing who was affected. `backend/tests/test_auth_cache.py`
pins all of it, including that the cached record is handed out as a **copy**;
callers decorate that dict, and a shared reference would leak one person's
rights into another's request.

### THCO Flow is managers and administrators

`has_unit_access(user, "flow")` returns `is_unit_head(user)`. Being on a
project does not open it: the pipeline carries stages, value and who else is in
the running, which is not a collaborator's business. Their work is the task
board their manager sets up.

Enforced at `_get_user` in `routers/flow.py`, which every route in that router
passes through. Hiding the menu entry alone was cosmetic — the router had no
permission check at all, so every route was reachable by anyone who knew the
address.

### Everything else

| Resource | Who |
|---|---|
| Candidate database | Admins and the Talent unit (`require_talent_access`) |
| User directory | Admins (`can_manage_users`) |
| Your own account | Yourself — name, photo, birthday, password (§6) |
| Projects | `project_scope_filter` — creator, named manager, co-managers, collaborators |
| Task boards | `_assert_project_access` — anyone on the project |
| Tickets, questions | Creator, the project's manager, or an admin |

`project_scope_filter` matches across several fields (`assigned_to`,
`team_members`, `owner_id`, `created_by`, …) because project membership is
recorded inconsistently across the codebase — sometimes a user id, sometimes a
name, sometimes an email. Do not assume one field.

---

## 5. Current state of the main features

### Working

- **Project pipeline (THCO Flow / Crowther Delivery OS)** — the **17-stage**
  lifecycle (`backend/services/delivery_stages.py`), projects, prospects,
  tickets, messages, audit log, calendar. Managers and admins only. See the
  top-of-document section for what this actually is and is not yet.
- **Task board** — Trello-style under `/api/tasks`. Cards carry labels,
  assignees, priority, due dates, **attachments** and a **cover picture**. The
  board refreshes every 60s while on screen, pauses when the tab is hidden, and
  never refreshes mid-drag. The project list refreshes every 90s and the
  analytics heartbeat every 5 minutes — all three were far more eager until
  19 August, when the database load they created became a problem.
- **Internal CV database** — ~33,500 candidates in production. Upload, parse
  (PDF/DOCX/DOC), search, de-duplication, resume versioning.
- **Gmail CV ingestion** — built and run. See §7; it is no longer blocked.
- **External sourcing** — SerpAPI and Serper, Nigeria-only filtering.
- **Auth** — login, invitations, password reset, and self-service accounts.
- **Client contacts** — birthday, work anniversary, spouse birthday, children,
  preferences, relationship strength.
- **Calendar** — `/flow/calendar`. Contact birthdays *and* staff birthdays.

### Deliberately not done

- **Splitting merged decks that carry no divider pages.** The splitter handles
  the agency template; other layouts import as one person. See §7.
- **Recovering the people inside bundles rejected before the splitter existed.**
  Their message ids are recorded and re-runnable.
- **A calendar collaborators can see.** They can set a birthday but cannot see
  the calendar, because it lives in Flow. Deliberate, and worth revisiting.
- **Analytics dashboard, semantic search, embeddings.** Roadmap, not committed.

---

## 6. Self-service accounts

Everyone may change their own **name, photo, birthday and password** at
`/profile`, reached from the avatar menu.

- `PUT /api/auth/me` — name, picture, birthday. The model **cannot express**
  role, unit access, headed units, status or the delivery flags, so a request
  naming them is not refused so much as unable to say it. Verified: a team
  member sending `role: super_admin` gets 200 and keeps their role.
- `POST /api/auth/change-password` — requires the current password, and **ends
  every other session** on success.

**The photo is a data URL on the user record, not a file behind an endpoint.**
Avatars render as plain `<img src>` in a dozen places and this client carries
its session as a Bearer header, which an image tag does not send — a URL would
arrive unauthenticated and every avatar in the app would break. The page crops
to a centre square and downscales to 256px before uploading; the server caps
the stored size as a backstop.

**Birthdays** are set by the person, not an administrator — which is why the
calendar had none. Only the day and month are ever published. A gold mark sits
on the person's own avatar until they set one.

---

## 7. Gmail CV ingestion — built, and how it works

No longer blocked. It runs over **IMAP** with an app password
(`GMAIL_CV_MAILBOX`, `GMAIL_IMAP_PASSWORD`), not the Gmail API, so no
domain-wide delegation is needed.

### The queue

`backend/services/import_queue.py`. One row per message in `import_tasks`. A
worker **leases** a row with a deadline rather than taking it; if it dies the
lease expires and the row returns on its own. Claiming is one atomic
find-and-update, so two workers cannot both win.

This replaced a single cursor and a long loop, which lost a whole batch to any
restart, stalled whenever the machine slept, and could not say which document
had failed.

- `POST /api/talent/import/queue/fill` — one IMAP search, no downloads
- `POST /api/talent/import/queue/run?limit=&workers=` — drains it
- `GET  /api/talent/import/queue/status` — depth, failures, percent
- `POST /api/talent/import/queue/retry-failed`

Parsing runs in a worker thread. It used to run on the event loop, which
blocked every other request for seconds at a time and is a large part of why
the site crawled during imports. Identity resolution stays serialised behind a
lock: two workers would otherwise each find no match for the same person and
create them twice.

### The deck splitter

`backend/services/cv_splitter.py`. Agencies send several CVs merged into one
PDF behind a title slide. Imported whole, a deck became one candidate named
after its cover page and everyone inside was lost — worse than a rejection,
because it looked like it worked.

Decks from the agency template introduce each candidate on a page carrying a
number and a name. Where that exists it is exact.

**Trying the split is what decides whether a file is a bundle.** A text rule
cannot: agencies name ordinary one-person CVs `..._merged.pdf` and stamp deck
wording on every page. A three-address rule condemned 959 documents to catch
about a dozen real bundles.

### The production migration (finished, incomplete)

`backend/migrate_new_gmail_cvs.py` appends local CVs to production. Strictly an
add; nothing in production is updated or deleted.

It ran 18-19 August and **took the database down with it**. See §8. Production
holds 65,278 of 70,852 files; the missing 5,574 are listed in
`ops/cv-migration-outstanding.json`.

The runner lives outside the repo and works a **checkpointed** 100-candidate
chunk at a time, so a crash or a sleeping laptop costs only the chunk in
flight. A chunk that fails three times is recorded in `skipped_chunks` and
stepped over rather than stalling the rest.

**Two things to know before running it again.**

It deletes its own checkpoint on finishing, so the record of what it skipped
disappears at the moment you most want it. Copy `skipped_chunks` out before the
run ends, or read it back from the log.

And it must not run flat out during working hours. Sixty chunks were abandoned
in the last five hours of the run because the database could no longer take the
writes, and the failures accelerated as it went: the first 6,800 candidates
migrated clean, then a chunk was lost every ~2,600, and by the end one every
100. Throttle it and run it overnight.

---

## 8. Traps and gotchas

Things that have already cost time. Do not rediscover them.

### Permissions and data

- **A project manager's grant comes from two places** (§4). Read both. A
  migration that "consolidated" them stripped every manager in the firm.
- **Test scripts that appoint a unit head must restore it however they exit.**
  One crashed part-way, left `technology.head_user_id` pointing at a fixture
  user, and cleanup then deleted that user — silently removing the real
  manager's rights. Register the restore with `atexit`, not at the end of a
  function.
- **Scripts must clean up after themselves even when they fail.** Orphaned
  `Project Beta` rows from crashed runs later made a passing test look broken.

### Frontend

- **`:root` in `index.css` defines a *dark* `--background`.** So `bg-background`
  — what shadcn's `DialogContent` uses — is dark in light mode too. Every
  dialog must name its own `bg-white border-[#EAE7E0] text-gray-900`. Every
  other dialog in the app already does.
- **Inputs must carry `bg-white text-gray-900`.** The dark-mode override keys
  on `input.bg-white`; without the class the field keeps a white background
  while its text follows the theme to near-white. Unreadable.
- **Only some hex colours have dark-mode overrides.** `#F7F6F3` and `#EAE7E0`
  do; `#FAFAF9` does not.
- **A Radix popover portals, so an ancestor's `overflow` cannot clip it — but
  the viewport still can.** The board-templates dropdown ran off the bottom of
  the window whenever its trigger sat low on the page, and the last templates
  and "Add Custom Board" could not be reached at all. Radix publishes the room
  it actually measured as `--radix-popover-content-available-height`; bound the
  content with `max-h-[var(…)]`, make it `flex flex-col overflow-hidden`, and
  give the scrolling region `flex-1 min-h-0` so it can shrink below its
  preferred height. A fixed `max-h-*` on the inner list alone does not help —
  the popover is still taller than the space it has.
- **dnd-kit writes `transform` inline on a dragging card**, so a Tailwind hover
  transform on that same element is overwritten. Put the visual card in a layer
  inside the sortable node.
- **An `<img src>` cannot reach an authenticated endpoint.** This client sends
  its session as a Bearer header. CVs, task attachments and thumbnails are all
  fetched as blobs for this reason; profile photos are data URLs.
- **`craco.config.js` eslint `configure` replaces the defaults.** It once
  disabled `no-undef` entirely, so a component could be moved out of a file,
  leave its imports behind, build clean, and throw on open.
- **Clearing `node_modules/.cache` while the dev server is running** leaves it
  compiling from a broken state and reporting errors at lines that no longer
  exist. Restart it.
- **The same icon badge is written at least five ways** — `bg-gradient-to-br
  ${x.gradient}`, a literal gradient, a flat `bg-gray-200` (the "Coming Soon"
  cards), a template literal `` className={`… ${statusConfig.color}`} ``, and a
  class inside a **quoted ternary branch** (`? 'bg-gradient-to-br …' : …`).
  Each of those defeated a different sweep. Two rules that cost real rework:
  - **Tokenise on `[\s`'"]+`, not whitespace.** A class inside a ternary arrives
    as `'bg-gradient-to-br` with the quote attached, so `startsWith("bg-")`
    misses it and the audit reports clean.
  - **A gradient paints via `background-image`, not `background-color`.** A DOM
    check that reads only `backgroundColor` sees `transparent` and passes every
    gradient badge in the app.
- **"Round" is not the rule — pale is.** An audit that only flagged
  `border-radius < width / 2` passed eight solid `bg-[#1B4332]` circles with
  white icons on the Flow dashboard. The rule is a **pale wash (8%) with a 20%
  border and the icon drawn in the accent**; treat a saturated or gradient fill
  as a violation regardless of its corner radius.
- **Judge arbitrary hex fills by lightness, not by shape.** `bg-[#FBF8F1]` is
  paper and fine; `bg-[#1B4332]` is not. Flagging every `bg-[#…]` produced 36
  false positives across the unit pages.
- **`pushState` + `popstate` does not re-render routes here.** The URL changes,
  the sidebar stays, and route content never mounts — so a per-route DOM sweep
  silently audits a blank page and reports zero. Use real navigations.
- **"The projects list under Technology & Build" is two different pages.** The
  Overview tab renders a demo Engineering Board table inside
  `pages/TechnologyAndBuild.jsx`; the real, API-backed list is
  `pages/MyProjects.jsx` at `/technology/my-projects`, behind the My Projects
  tab. Changing one leaves the other untouched.

### Visual language

- **Icons** sit in a pale circle — an 8% wash of the accent, a 20% border, the
  icon drawn in the accent itself, never white on a filled disc.
  `components/ui/icon-badge.jsx` is the component. `accentFromClass()` reads the
  accent out of whatever the page already declared — `bg-amber-500`,
  `bg-[#1B4332]`, or a `from-… to-…` gradient — so a page keeps its own colours
  and only the treatment changes. Converting a badge is therefore
  `<IconBadge icon={X} accent={accentFromClass(color)} size={40} />`, with no
  change to the page's data.
- **Chat avatars are deliberately exempt** (`pages/FlowForgeChat.jsx`). They
  follow the avatar convention — a solid disc, like the initials avatar in the
  sidebar — not the icon-badge one.
- **Brand colours** are seafoam `#1FB58A`, forest `#1B4332`, gold `#C6A15B` /
  `#A9834E`, and the paper tones `#EAE7E0` / `#F7F6F3`. Project lists use
  seafoam for progress and identity (pod chips), deepening to forest as a
  project advances. Amber is kept for "Under Review" only: it is the one status
  that asks someone to act, and the brand palette has no warning colour.
- **Cards carry no internal rules or top strips** — border and spacing separate
  them, not lines.
- The ProcureAI decks and the Pebbles presentation are **deliberately excluded**
  from all of the above; they are client-facing and keep their own identity.

### Infrastructure

**`$or` across indexed fields is the slowest way to ask Cosmos a question.**

The mailbox import was taking ~20 seconds a document, and the identity lookup
was nearly all of it — 1.8-3.1s typically, 50s and 110s on two documents in a
run of ten. It returns a single record and still took that long, so it was never
about how much data came back.

Every field in that lookup is indexed, which is why `$or` looked right. Measured
against production over five candidates:

| | |
|---|---|
| `$or` over 3-4 indexed clauses | 23-73s, median **36.1s** |
| the same clauses, one at a time | 0.5-7.9s, median **1.5s** |

`find_match` now runs one indexed query per clause and unions the results. Same
records considered, same 50-record cap, verified identical on four real
candidates. Documents went from **19.8s to 3.06s**, and a bounded run from 10
documents to 59.

Two guesses preceded that and both were wrong: connection reuse (the streaming
path already reuses one connection — connect 1.3s once, fetch 0.5-1.0s a
message) and a missing projection (one dramatic sample that a repeat measurement
across six candidates flatly contradicted). **Measure, repeat the measurement,
and only then change something.** `services/connectors/runner.py` and
`candidate_identity.py` now log timings when they are slow enough to matter,
which is what settled it.

**The outage of 19 August — read this before running anything heavy.**

The CV migration ran for eighteen hours against the free tier and the cluster
never recovered from it. By morning `ping` still answered while every command
that had to reach the data shard — `listDatabases`, `dbStats`, `currentOp`,
every query — returned `InternalError`. CPU sat at 90% with IOPS in single
digits: burning cycles internally with no work coming in. That is the signature
of a wedged cluster rather than a busy one, and none of the usual levers touch
it. Azure exposes no restart or failover for `mongoClusters`, and scaling the
tier restarted the compute without clearing it.

What actually fixed it was a point-in-time restore onto a new cluster. Lessons
worth keeping:

- **A restored cluster comes up with no firewall rules.** Connections then hang
  rather than fail, which looks exactly like the fault you are escaping.
  Recreate them: `AllowAzureServices` (`0.0.0.0`-`0.0.0.0`, which is what lets
  the app in) and any operator IP.
- **Restore needs the administrator password in the request**, and the restored
  cluster keeps its own hostname. Read the new host from
  `listConnectionStrings`; the app connects by the internal `fc-…` host, not
  the friendly name.
- **`mongodb+srv://` may not resolve on a home network.** Use the direct
  `mongodb://host:10260` form, which is what production already uses.
- **A broken database blocks deployments.** Two startup handlers talk to Mongo
  before the app serves — `seed_initial_admin` counts users, `startup_scheduler`
  builds talent indexes. Both raise, FastAPI treats a failed startup event as
  fatal, the container exits 3, and Container Apps refuses to shift traffic. The
  symptom is a deploy that "never came up" while production serves the old
  build. The app should not refuse to boot because a seeding check failed; that
  is still worth fixing.
- **Changing a container app secret does not restart running replicas.** It
  creates a new revision, but a replica already running keeps the old value.
  After rotating anything, check `revision list` for what is actually active and
  restart if the old replica is still serving. This caught us twice in one
  morning, the second time forty minutes after writing it down.
- **After any credential change, exercise a write, not a page load.** The
  identity cache (§4) serves reads without touching the database, so with a
  wrong password the site looks perfectly healthy — 158 requests returning 200 —
  while every write fails with `AuthenticationFailed: Invalid key`. It was found
  by a person trying to log out, not by monitoring. Log out, or save something,
  and check the response.

**Cost and sizing.** The database runs on **one burstable vCore**. Burstable
means credits accrue while idle and are spent under load; drain them and you are
throttled hard, which is what eighteen hours of bulk writing did. Fine for ~30
people doing ordinary work — at rest the cluster sees about 7 operations a
second — and not fine for a bulk import during the day, which peaked at 566.


- **Do not verify a frontend deploy by grepping `main.js`.** The app is code
  split into ~139 chunks, so page code and anything it imports lands in a
  `*.chunk.js`, not the entry bundle. Searching `main.js` for a string you just
  added returns nothing on a perfectly good deploy — and looks exactly like a
  failed one. Verify instead by diffing `/asset-manifest.json` against
  `frontend/build/asset-manifest.json`: matching content hashes mean identical
  files. Expect `main.js` itself to differ even on a correct deploy — it embeds
  the `.map` filenames, and source maps hash differently when built on CI
  rather than locally.
- **`/version`'s `built_at` can lag the `sha`.** It came back stamped a day
  earlier on a deploy whose sha was correct and whose chunks matched. Trust the
  `sha`.
- **Only a 401 or 403 may end a session.** `ProtectedRoute` in `App.js` used to
  send people to the login screen on *any* failed `/auth/me` call. Every
  authenticated request costs three database reads (`user_sessions`, `users`,
  then `units` for the manager grants), so when the database is loaded that
  call returns 500 — on 18 August roughly one in four did — and people were
  thrown out mid-task holding a perfectly valid session. A 500, a timeout or a
  dropped connection says nothing about whether someone is signed in. It now
  retries three times with backoff and then says the server is unreachable.
- **A bulk migration makes the whole product slow, because it is one free-tier
  cluster.** Measured on 18 August 2026 while `resume_files` was running: a bare
  `ping` took 3.4s, `projects.find().limit(20)` took 15.9s, and a count on
  `users` failed outright. The app itself was fine — `/healthz` answered in
  0.8s and static assets in 1.2s — so "production is slow" during a backfill is
  the database, not a cold start. Check by timing queries directly before
  looking anywhere else.
- **Cosmos free tier ends a command that runs too long** (code 50). A read of
  every id in a collection stopped finishing once `candidates` passed ~33k.
  `id_set` in the migration script now pages by `_id`.
- **Cosmos rejects a text index that includes `raw_text`.** Each index is
  created independently; one shared try/except once meant a single failure
  skipped every index after it.
- **Gmail throttles IMAP logins.** The queue opens a connection per message,
  which is deliberate — Gmail hangs up on long-lived sessions — but at scale it
  produces occasional `AUTHENTICATIONFAILED`. It is a rate limit, not a
  credentials problem, and the code reports it misleadingly as "an app password
  is required".
- **`az acr build` exits non-zero on Windows even when the build succeeded.**
  Check `az acr task list-runs`, not the exit code.
- **Resend sends from `noreply@thcohq.com`.** Do not revert to
  `onboarding@resend.dev` — a sandbox sender that only reaches the account owner.
- **Do not touch `rg-thco-recruit-flow`.** Different project, same company,
  explicitly off-limits.

---

## 9. Deployment and scheduled work

Every push to `main` deploys to production automatically via
`.github/workflows/azure-deploy.yml`. Typical deploy: 90–250 seconds.

Azure resources sit in `rg-thco-crm`; registry `thcocrmacr13661`.

### Keeping it awake

Container Apps scales to zero, and the first request after idle pays a cold
start. That is what "the site takes forever to load" reports have been.

Two scale rules are set on the Container App:

- `working-hours` — a KEDA **cron** rule holding one replica 07:00–19:00
  Mon–Fri, `Africa/Lagos`
- `http-requests` — 10 concurrent requests

**Both are required.** Defining any custom scale rule replaces Container Apps'
built-in HTTP scaling, so without the second the app would never wake outside
the cron window. `minReplicas` stays 0, so nothing is pinned overnight.

A GitHub Actions ping was the obvious alternative and does not work here: the
scale cooldown is 300s and GitHub's scheduler routinely lags longer, a
limitation `scheduled-jobs.yml` already documents.

Deploys pass only `--image`, so scale settings survive a push.

### Scheduled jobs

`.github/workflows/scheduled-jobs.yml` runs at 06:00 UTC daily and calls
`POST /api/internal/run-scheduled-job` with `X-Scheduler-Token`. That both wakes
the container and runs the sweep. Sends are deduplicated per contact, occasion,
lead time and year, so a late or repeated run cannot resend.

**`mailbox-import` runs on the schedule again** (resumed 20 August 2026, after
the migration finished and the cluster moved off the free tier). Set
`MAILBOX_IMPORT_PAUSED` to `'true'` at the top of the workflow before any bulk
load against the database. Running it by hand always works — "Run workflow"
with `job=mailbox-import` ignores the pause.

**It also runs every 20 minutes between 18:00 and 05:59 UTC** — 19:00 to 06:59
in Lagos, so never during the working day. On 20 August there were **19,612
messages carrying attachments** behind the cursor; a bounded run clears about 59
documents, so once a day would have taken most of a year and this cadence takes
about a week. A `concurrency` group prevents two runs sharing the cursor.

None of this depends on anyone's machine being on: GitHub calls the app and the
app does the work. That is the difference between this and the CV migration,
which ran locally and died every night the laptop was switched off.

**Every scheduled job must finish inside 240 seconds.** Container Apps ends any
HTTP request at that point, and the caller then sees a 504 while the job carries
on running server-side. `run_connector` therefore takes a `time_budget`
(`MAILBOX_IMPORT_SECONDS`, default 180) and stops cleanly when it expires; the
cursor makes the remainder simply the next run's work, so `status: "partial"` is
a success, not a failure. The workflow no longer retries on 504 — a retry there
started a *second concurrent import over the identical window*, which is what
produced two runs a day, every day, from 10 August.

---

## 10. Data (production, 20 August 2026)

| Collection | Rows | Note |
|---|---|---|
| `candidates` | 33,547 | Internal CV database |
| `resume_versions` | 75,856 | Every CV ever received, never overwritten |
| `resume_files` | 76,786 | Every local file, plus ~5,900 from mailbox imports local never had |
| `users` | 30 | |
| `projects` | 15 | |
| `contacts` | 4 | Still thin — data entry, not a development task |
| `notifications` | 25 | |
| `events` | 2 | Contact occasions; staff birthdays are computed, not stored |

**Why 33,547 people hold 75,856 CVs.** A CV is never overwritten. The same
person applies again months later, or arrives through a second agency, and each
document is kept as a new version — 2.29 per candidate on average. Fewer than
half have only one: 14,913 people have a single CV, 7,391 have two, 4,226 have
three, and 1,467 have seven or more. The 5,000-odd versions with no file
predate storing the original document; they hold extracted text only.

Those files are ~21 GB. Individually small, but 65,000 of them add up, and that
is what made the migration heavy — not the space, the number of write
operations.

---

## 11. Known issues worth fixing

- **~288 candidate records hold raw PDF source instead of CV text**, and ~757
  carry email addresses invented from that binary (`z@j.k`). These are scanned
  or image-only CVs where both PDF readers failed. The fix is to treat that as
  a failed extraction and reject with a reason rather than store a junk record.
  Not yet done.
- **Bundles rejected before the splitter existed** are recorded and re-runnable
  but have not been re-run.
- **The CV migration is complete** (20 August 2026). Production holds 76,786 CV
  files: every file local had, plus ~5,900 it received from daily mailbox
  imports that local never had. The two databases legitimately diverge, so
  comparing their totals is meaningless — compare sets of `version_id`. Doing
  exactly that is what made a working migration look like it had created 854
  duplicates on 19 August; it had created none, and it was stopped for nothing.
  A 25-file gap between the counter and `estimated_document_count()` was also a
  phantom: a throttled pass over the 1,552 candidates around both insert
  timeouts found nothing missing. `ops/cv-migration-outstanding.json` is history
  rather than a to-do list.
- **The ~81 skipped mailbox messages are queued for re-reading.** The gmail
  cursor was rewound from 4565 to 4484 on 20 August, so the next import
  re-reads UIDs 4485-4565. Re-reading is safe — an identical document is
  recognised by its hash.
- **The production database password is in git history.** It was hardcoded in
  `sync_from_prod.py`, `fix_sync.py` and `set_prod_privileges.py`. Those files
  now read `PROD_MONGO_URL` from `backend/.env`, and the live password was
  rotated on 19 August, so the exposed one is dead — it belonged to a cluster
  that has been deleted. History is still readable, so treat any other
  credential in it as compromised.
- **The app will not start if the database is unreachable**, because two
  startup handlers query it. That turns a database problem into a deployment
  problem. See §8.
- **An import outcome with no bucket is treated as a failure.** `import_cv`
  returns `split` for a merged deck broken into the people inside it, which the
  streaming path had no counter for, so a success was filed under `failed`. More
  importantly the same line let an *unrecognised* outcome take the success path
  and carry the cursor with it. An unknown outcome, and a reported `failed`, now
  both hold the cursor. `backend/tests/test_import_cursor.py` covers it.
- **`import_failures` is new and nothing reads it yet.** Documents set aside
  after three attempts land there with their error; there is no screen for them.
- **The Crowther Delivery OS build has not been reviewed for permissions
  correctness.** `permissions.py` grew by ~289 lines in the same commit that
  shipped the 17-stage model (`c29295b`, 21 August). It is already live. Given
  the file's history (§4, §8) — two prior incidents stripped every manager's
  rights in the firm — this is worth a deliberate read before more is built on
  top of it, not an assumption that it is fine because it deployed cleanly.
- **The org structure and entity names behind Crowther Delivery OS are not
  finalised.** Per the 19 August meeting transcript, the "final" structure is
  to be shared company-wide at the September 2026 retreat. Expect entity
  renames in the CRM once that lands — "coordinator" and similar terms are
  already known to be provisional.
- **Test-fixture files may be committed to git.** `backend/uploads/delivery/
  <uuid>/arch_*` and `demo_*` (markdown, PNG, PDF) came in with `c29295b`.
  Almost certainly upload-feature test fixtures rather than real client
  material, given the naming, but not confirmed — worth checking and removing
  from git regardless of what they turn out to be.
- **Collaborators cannot raise tickets**, since tickets live in Flow. A
  consequence of the Flow rule, not a decision taken on its own merits.
- `cookies.txt` is committed and contains an expired session token.
- The README publishes a default admin password.
- No automated test suite runs in CI. The verification scripts described in §12
  are run by hand.

---

## 12. Verification

There is no CI test suite. What exists is a set of scripts that exercise the
real API against the local database and print a pass/fail line per rule. They
live outside the repo (in the working scratchpad) and cover:

| Area | Checks |
|---|---|
| Flow closed to collaborators, task board intact | 19 |
| Self-service accounts, and privilege escalation refused | 19 |
| Attachments | 18 |
| Thumbnails, including a 5-way race for one image | 16 |
| Ticket delete and edit | 16 |
| Stage transitions | 15 |
| Team membership and removal | 14 |
| Unit heads | 14 |
| Project-manager visibility | 13 |

They are worth keeping and worth moving into the repo. **Verify against the
page, not only the API**: a staff-birthday payload that was correct in
isolation crashed the calendar, because its only consumer read different field
names, and an API-level check called that verified.

---

## 13. Working agreement

The person directing this work prefers:

- Findings verified against the real system, not assumed. Measure, then report.
- **Local first.** Changes are reviewed on `localhost:3000` with both servers
  running before anything is pushed. Say what to click.
- Being told plainly when something is already built, blocked, or a bad idea.
- Corrections stated directly when an earlier claim turns out wrong.
- Nothing pushed to production without approval — pushing deploys immediately.
- Secrets never printed into the conversation; read them from `.env` instead.
- **This document updated whenever anything here changes.**

---

### Front-end/back-end permission drift — 26 August 2026

Two bugs, one cause: **permission rules exist twice, once per side, and the
front-end copies were not updated when the server rules changed.** Both were
found by Victor, not by me, which is the part worth recording.

**A TSD was offered "New Project" and the API would have refused it.**
`can_create_projects` was tightened server-side to Senior Partner, admins, and
holders of the `can_start_projects` grant. `UserContext.canCreateProjects` still
listed every TSD, commercial account and unit head — the old rule. The button
rendered for people who could not use it.

**A project's TSD got a read-only board.** Two faults stacked:
`permissionsForProject` checked only `project_manager_id`/`_ids`, the legacy
fields, and never `tsd_id` or `architect_id`; and `GET /tasks/projects/summary`
**did not send `tsd_id` at all**, so the front end could not have checked it
even if it wanted to. Pod members were also missed — only `collaborator_ids`
was read, not `pod_member_ids` — which silently undercut the pod-member rights
added earlier the same day.

Fixed: the summary endpoint now sends `tsd_id`, `architect_id` and
`collaborator_ids` alongside the legacy keys; `permissionsForProject` mirrors
`can_manage_boards` and `can_use_board`; `canCreateProjects` mirrors the server
exactly; and `canEnterPipeline` picked up the same drift on `can_architect`
(flag-only, where the server now also admits an engineer in Technology &
Build), so a new `canArchitect` helper mirrors that rule too.

Also: the board empty state still said "A Project Coordinator can add them" —
a role retired before this session began.

**The lesson, for whoever picks this up:** every rule in
`services/permissions.py` has a twin in `context/UserContext.jsx` or
`components/tasks/permissions.js`. Changing one without the other does not fail
loudly — it produces a button that 403s, or a control that never appears. When
touching a permission, grep both files. And a front-end check can only be as
good as the fields the API sends: widening a rule often means widening the
payload too.

### Adding a task now asks the same questions as editing one — 26 August 2026

"+ Add Task" expanded into an inline textarea that captured a **title and
nothing else**. Description, priority, assignees, labels and due date existed
only behind "Edit Task", so every new task had to be created bare and then
reopened to say who it was for, when it was due, or what it actually involved —
two steps for one thought, and in practice the second step was skipped, which
is why so many cards carry no owner and no date.

`TaskCardEditor` now serves both acts. A card with no `card_id` is a new one:
the eyebrow reads "New Task", the button reads "Add Task" and stays disabled
until there is a title, and `onSave(null, data)` tells the column to create
rather than update. `AddTask` is now just the trigger — the column owns the
dialog. `POST /tasks/boards/{id}/cards` already accepted the whole shape, so
no backend change was needed.

The editor also became `flex flex-col max-h-[90vh]` with a scrolling body; five
fields is tall enough to run off a laptop screen, and it is now opened far more
often than before.

### The dashboard shows the work, not the units — 26 August 2026

`pages/Dashboard.jsx` was a grid of links to business units: navigation dressed
as content. It answered "where can I go", which the sidebar already answers,
and never answered the question the person signing in actually has. The three
figures above it were worse than useless — "Tools Available" was the literal
constant `2`, and "Recent Activity: 404" was a lifetime count of every row in
`activity_logs`, a number that only ever goes up.

The units grid, the access-restricted modal, `UNITS`, `ICON_MAP` and the local
`hasUnitAccess` copy are gone. Every unit remains in the sidebar, so no
navigation was lost.

What replaces it, decided by **what the caller can see** rather than by job
title — the same rule the rest of Crowther OS uses:

- **Projects in scope** (the Senior Partner has the whole portfolio): active
  projects with the green/amber/red split, exceptions needing attention,
  stalled projects, overdue milestones; a phase-lane strip of the pipeline;
  and the exceptions themselves worst-first, each linking to its project.
- **Nobody's project**: their own task counts (open, overdue, due this week,
  completed) and their next six cards.

Everybody gets **My Work** and Recent Activity.

No metric is computed in the browser. `/control-tower/portfolio` and
`/control-tower/exceptions` already define what "at risk" and "stalled" mean
for the Control Tower, and the dashboard reads the same numbers — the two
screens cannot drift apart. Both are already scope-filtered, so a team member
calling them gets their own projects or none, never a 403.

One new endpoint: **`GET /tasks/cards/mine`**. It is scoped twice on purpose —
assignment first, then `project_scope_filter`, so somebody taken off a project
stops seeing its work even if an old assignment was never cleared. Note that
**a card is "done" because it sits in the Done column**, not because of a flag;
that fact lives only in the title of the board the card is on, which is why
`DONE_BOARD_TITLES` exists.

The five calls settle independently. A dashboard that renders nothing because
one of five requests failed is worse than one missing a panel.

**The control tower opens on the dashboard, not away from it.** Clicking a
metric sent you to `/flow/control-tower` and lost the context the number was
read in — the same objection the control tower already answers internally,
where clicking a headline number filters the list beneath it instead of
opening another screen.

`ControlTower.jsx` now exports **`ControlTowerPanel`**, everything the page had
inside `FlowShell`, and the default export is just
`<FlowShell><ControlTowerPanel /></FlowShell>`. The route and the dashboard
render the same component — there is no second copy to keep in step. The panel
takes `initialView`, `initialFilter`, `onClose` and `fullViewLink`; the last
two are what make it embeddable, and the route passes none of them.

Each dashboard metric aims it at the view that answers that number: Active
Projects → portfolio, Needs Attention → exceptions, Stalled → portfolio
filtered `stalled`, Overdue Milestones → portfolio filtered
`overdue_milestones`. `initialView`/`initialFilter` are mirrored into state
through effects because the host keeps the panel mounted between opens —
without that, the second click would show whatever the first one left behind.

It is `React.lazy`'d. The dashboard is the page everyone lands on, most visits
never open the tower, and it is a large component.

### "View as function" — 27 August 2026

Taken from the Emergent reference build (`/function/:role` on
crowther-hub.preview.emergentagent.com), which gives each delivery function its
own dashboard: My Projects / Awaiting Client for a TSD, Open Talent Requests
for TalentSD, and so on. The gap it fills here is real — a Legal or Finance
account previously landed on the generic personal dashboard, which says nothing
about contracts or value.

**`GET /control-tower/functions`** says which views the caller may open and
which is theirs; **`GET /control-tower/function/{key}`** returns
`{sections: [{key, title, empty, columns, rows}]}`. The browser renders whatever
comes back and knows nothing about any function's content, so **adding a
function view is a server change, not a new screen**. Front end:
`components/flow/FunctionView.jsx`, rendered on the dashboard under the metrics.

**There is no "TSD view" heading, and there should not be one.** Signing in as
a TSD *is* signing in as a TSD — your projects, your client waits and your
stalled work are simply your dashboard, not a labelled mode of it. The only
person who needs telling which function they are looking at is an
administrator who deliberately switched, and for them the control
(`FunctionSwitcher`) sits **in the dashboard header beside New Project**, not
in a heading between sections. It renders nothing for everybody else.

Two deliberate departures from the reference, both worth keeping:

1. **It is gated to administrators.** The reference renders the switcher for
   everybody and `/dashboard/role/{role}` never checks that the caller *is*
   that role — so anyone could read the CEO's at-risk portfolio. Here you
   always get your own function; you get somebody else's only if
   `permissions.is_admin`.

   The gate was first written as `can_view_all_projects` and that was wrong:
   it also admits Legal and Finance, so a Legal officer could have opened the
   Senior Partner's at-risk portfolio. **Being able to *find* every project is
   not the same as being entitled to read the firm through somebody else's
   job.** `_may_switch_function` exists to make that distinction explicit.
   Verified against a temporary Legal account: `can_switch: false`, 200 on its
   own view, **403** on `senior_partner` and on `tsd`.
2. **Every section is backed by data we hold.** The reference has Invoices,
   Offers & Onboarding and Defects tables. We have no invoices collection, no
   offer records and no defect tracker, so those would have been permanently
   empty. Legal is answered from `contract_url` + `signed_at` on the project,
   Finance from `signed_at` + `total_value`, QA from `build_status` and
   `feedback_items`. **People Ops has no view** — nothing in this database
   backs one. Add it when offers exist as records.

The seven views: Senior Partner (at risk, awaiting your architect selection),
TSD (my projects, awaiting client, not moving), Solution Architect (projects I
architect + architecture-document count), TalentSD (`talent_requirements`),
Legal, Finance, QA.

Notes for whoever extends this:

- **"Awaiting client" is derived from `demos`**, not from a status field — we
  have no `client_status`. The latest demo round decides: scheduled and not
  held, held with `outcome: pending`, else the project sitting at a
  client-facing stage (9, 10, 15).
- **The architect view keys off `can_architect`**, not `function_role`, so
  every engineer in Technology & Build gets it. Reading `function_role` alone
  would have left them all without a view — the same trap as before.
- **Somebody who sees every project has no "mine" to narrow to**, so
  `owned_by` falls back to the portfolio and the section is retitled ("My
  projects" → "Projects in delivery"). An ownership filter would otherwise
  hand an administrator an empty screen.


### Production readiness pass — 27 August 2026

A full functional + security review before going to production. The suite is
`backend/tests/test_security_regression.py` (73 tests, 1 skipped); it builds
its own users and sessions, marks them `_qa_temp`, and deletes them after.

```bash
cd backend && ./venv/Scripts/python.exe -m pytest tests/test_security_regression.py -v
```

**One finding blocks the release and it is not code.** The super admin's
password was a literal in **47 tracked files**, committed since the initial
snapshot, and **still valid in production** on `joshua@thcohq.com`. Worse, one
of those files was `frontend/public/THCO_Executive_Portal_PRD.md` — `public/`
is served verbatim by the web server, so the password was downloadable by
anyone who knew the filename, with no session required.

The literal is now gone from the working tree: tests read `TEST_ADMIN_PASSWORD`
from the environment, `reset_passwords.py` refuses to run without
`SEED_TEST_PASSWORD`, the PRD moved to `docs/` with the value redacted, and the
historical `test_reports/*.json` are redacted (all still parse). **None of that
fixes it.** The password is in git history and cannot be removed from clones
that already exist. **It has to be rotated.** Not done here: it is the CEO's
own credential and changing it without him would lock him out.

Fixed in this pass:

- **`/docs`, `/redoc`, `/openapi.json` were public** — a full map of every
  endpoint and schema to anyone. Off unless `API_DOCS=on`. (The 200 you still
  see is the SPA catch-all serving index.html, which is correct; assert on
  content, not status.)
- **No rate limit on login.** bcrypt makes a guess slow; slow is not a limit.
  Now 8 attempts per 5 minutes, counted per account *and* per source address,
  cleared by a success. Per process — fine for one replica, must move to a
  shared store if it is ever scaled out.
- **`verify_password` raised on a malformed hash**, turning a wrong password
  into a 500. Two problems in one: a crash on the busiest endpoint, and an
  answer that differs from the 401 every other account gives — which is user
  enumeration. It now returns False.
- **XSS in `FlowForgeChat`** — `message.content` went into
  `dangerouslySetInnerHTML` unescaped after a markdown pass. Escaped first,
  because escaping after would undo the tags the pass writes.
- **No security response headers.** Added `nosniff`, `X-Frame-Options: DENY`,
  a referrer policy, a permissions policy, and HSTS on HTTPS only.
- **Dependencies: 27 known CVEs across 8 packages → 9 across 2.** PyJWT (10
  CVEs), cryptography, pypdf, h2, python-dotenv, pymongo all raised.

Still open, deliberately, with reasons:

- **starlette 0.37.2 carries 8 CVEs and cannot be raised here** — FastAPI
  0.110.1 pins `starlette<0.38.0` and the fixes start at 0.40. This needs a
  FastAPI upgrade with its own test cycle; it is the largest remaining item.
- **Frontend: 27 advisories (11 high)**, nearly all inside `react-scripts`
  build tooling rather than shipped code. Resolving them means leaving CRA.

**A trap worth remembering: motor's pymongo pin is a lie.** It declares
`pymongo<5`, but pymongo 4.17 breaks it outright — `ImportError: cannot import
name '_QUERY_OPTIONS'` at startup, which would have been a dead container in
production. Pinned to 4.6.3, the lowest version carrying the CVE fix. Raising
it means upgrading motor in the same change.

What the tests actually establish, so nobody has to re-derive it: every new
endpoint 401s anonymously; a non-admin gets only their own function view and
403 on all six others; Legal and Finance are the deliberate exception to
project isolation (`can_view_all_projects` lets them *locate* a project) but
receive the commercial slice and cannot search delivery material; query
parameters are typed `str` so Mongo operator payloads cannot widen a query;
`re.escape` makes crafted patterns literal, so search is not a CPU denial of
service; disabling or deleting an account ends its sessions immediately —
though a row edited straight in Mongo is not felt for up to
`AUTH_CACHE_SECONDS`, so nobody should be deactivating people with a shell.


### Deployed — 27 August 2026

`eea361d` is live: the metrics dashboard, the in-place control tower, the
per-function views, and the security work from the readiness review. Verified
against production rather than assumed:

| Check | Before | After |
|---|---|---|
| `/version` | `0b30dcc` | `eea361d` |
| Security headers | none | nosniff, DENY, referrer, permissions, HSTS |
| `/openapi.json` | served the full schema | not served |
| `/THCO_Executive_Portal_PRD.md` | downloadable, with the password in it | SPA fallback, credential gone |
| New endpoints, anonymous | n/a | 401 |
| Login brute force | unlimited | 429 at attempt 9 |

**The deploy was blocked for six hours by a GitHub Actions billing lock on the
THCO-Labs organisation**, not by anything in the code — the job failed in 2-5
seconds without ever starting a runner. Worth recognising the signature: a
sub-10-second failure with `The job was not started` is an account problem, so
do not go looking in the workflow.

Two things about the rollout worth keeping:

- **Verify the deploy against production, not against the workflow's green
  tick.** The pipeline already waits for the commit sha to be the one serving,
  which is why the earlier "deployed but still serving the old build" failure
  cannot recur, but the security posture is only proven by asking production
  for the headers.
- **Testing the login throttle from your own machine throttles your own
  address for `LOGIN_WINDOW_SECONDS`.** Harmless, and it clears itself, but do
  not do it minutes before somebody needs to sign in.

**Still outstanding, and this is not fixed by the deploy:** the super admin
password is in git history and remains valid in production. Rotate it. The
deploy removed the publicly downloadable copy, which was the worst of the
exposure, but anybody with a clone still has the value.
