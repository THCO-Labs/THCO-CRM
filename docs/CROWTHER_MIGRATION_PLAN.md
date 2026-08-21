# Crowther OS: Migration Plan, Data Model and Delivery Workflow

**Written:** 20 August 2026
**Revision:** 3. Supersedes the two earlier drafts.
**Sources:** `Crowther_Delivery_OS_Updated_Master_Specification_V2.docx` (SPEC §n), the meeting transcript of 19 August 2026 (TRANSCRIPT @time), the two architecture diagram sheets, the `crowther-brainog` reference build, decisions taken on 20 August 2026 (DECISION), and verification against this codebase.

Everything here is traceable to one of those.
Where something is still undecided it appears in section 14 as a question, never as an assumption.

---

## 1. What changed in this revision

| Area | Previous draft | Now |
|---|---|---|
| Architect briefing | A separate `architect_briefs` collection, a package handed over at stage 6 | **Deleted.** No parallel bundle, no siloed folder. The architect reads the same project record everyone else reads, from the beginning. Section 7. |
| Solution Architect | An unsourced new role | **Drawn from the engineering team.** A senior engineer wearing the architect hat on a given project. (DECISION) |
| Talent sourcing | RecruitFlow API integration, blocked on questions | **No external integration.** Everything in-house on the CRM's own talent database. (DECISION) |
| "Candidates" | Candidate database | **Talents.** Renamed throughout. (DECISION) |
| Project workspace | 15 tabs per SPEC §38 | **One page, four tabs, everything else behind an icon.** Section 3.3. (DECISION) |
| QA workspace | Its own workspace with test plans and defect records | **Merged into the existing kanban board**, which already carries a `QA Review` column. Section 10. |
| Product name | "THCO Flow" retained | **Crowther OS.** (DECISION) |
| Sidebar | Leave the 11 units alone | **Changes now.** (DECISION) |
| Emergent scaffolding | Not addressed | **Removed.** It includes a live account-creation path through a third-party service. Section 12. |

---

## 2. Decisions now locked

These close the sixteen questions raised in revision 2.

| # | Question | Decision |
|---|---|---|
| 1 | Architect selection when the Senior Partner is away | **Wait for the Senior Partner.** Stage 6 blocks. |
| 2 | Who records client validation | **TSD alone.** |
| 3 | Who decides contract staff are needed | **Architect raises the need, TSD confirms it, TalentSD receives the brief and sources against it.** |
| 4 | When | **After client validation only.** Never at stage 7. Stated reason: do not source people and then withdraw because the project did not proceed. |
| 5 | RecruitFlow integration shape | **Scrapped.** No API, no redirect. |
| 6 | Source of truth for talent | **In-house, on platform.** |
| 7 | Stage mapping of the 15 live projects | **Proceed with the proposed mapping**, correct by hand where wrong. |
| 8 | Sidebar | **Changes now.** |
| 9 | Prospects | **Prospects are the pre-project phase.** When it becomes real, the TSD or Senior Partner creates the project and the lifecycle starts. |
| 10 | Proposals and deck library | **Remove if not essential to delivery.** Section 12.3. |
| 11 | Forcing a gate | **TSD only.** The Senior Partner gets an email and an in-app alert every time it happens. |
| 12 | Who sets health | **TSD only.** |
| 13 | Scope change decision, and what "work" means | Answered in full in section 9, including multiple demo rounds before scope freeze. |
| 14 | Product name | **Crowther OS.** |
| 15 | Project owner label on screen | **TSD.** |
| 16 | Seventeen stages on one board | **Reduce.** Group into phases, collapse detail behind icons and drawers. Sections 3.3 and 3.4. |

---

## 3. How the platform works and looks

### 3.1 Two surfaces, one project

There are exactly two working surfaces and they do different jobs.

**The pipeline** carries the project through its 17 lifecycle stages.
It is stage movement, gates, ownership, client state and artefacts.
Its visual language follows the `crowther-brainog` reference build: a stage rail, a next-step panel, a gate checklist, compact status pills.

**The kanban board** carries the technical build.
It already exists (`backend/routers/taskboard.py`, 1372 lines) with boards as columns, cards as tasks, labels, assignees, attachments, covers, due dates and share links.
It is not rebuilt and not duplicated.

The join between them is stage 13.
Before stage 13 the board is empty and irrelevant.
From stage 13 onward the pipeline reports build progress by reading the board, rather than asking anyone to update a second thing.
This is what was asked for: "as we are updating it from there, it should be directly connecting to the kanban board and updating it" (TRANSCRIPT @00:50:43).

### 3.2 Who drives what

Two people could plausibly own the board, so this needs a clean answer.

| Surface | Owner | Why |
|---|---|---|
| Stage movement across the 17 stages | **TSD** | SPEC §26: the TSD answers "are we delivering correctly?" and owns the client, the milestones and the project state. |
| Kanban board structure: columns, creating cards, assigning them | **Solution Architect** | SPEC §19 makes the Architect owner of stage 13; SPEC §26 gives them "are we building it correctly?" Board shape is a technical decision. |
| Moving your own card | **Any pod member**, contract engineers included | The board is where staff report progress. This is already how `can_use_board` behaves. |
| Everything | Administrators | Unchanged |

Concretely, `permissions.can_manage_boards` changes from "project manager, or anyone holding `is_delivery_coordinator`" to "administrator, the project's TSD, or the project's Solution Architect".
The `is_delivery_coordinator` flag is retired.
The docstring at the top of `taskboard.py` currently states that a Project Coordinator owns the board; it becomes wrong on this change and must be rewritten rather than left to mislead.

### 3.3 The project page

The instruction was minimal text, one page where possible, icons for the rest.
SPEC §38 lists fifteen tabs. Fifteen tabs is a filing cabinet, not a workspace.

**Four tabs. Everything else is an icon that opens a drawer over the page.**

```
+--------------------------------------------------------------------------+
|  Acme Bank / Core Banking Rebuild        [ GREEN v ]   THCO-2026-A17C3D   |
|  Stage 8 of 17 . Solution Architecture                                    |
|  TSD Anabel E.     Architect Success O.     Pod 5                         |
|  ==========o=========o=========o---------o---------o                      |
|  Intake  >  Definition  >  Design  >  Validation  >  Delivery  >  Close    |
|  [arch] [demos] [talent] [docs] [risks] [activity]     <- icon rail       |
+--------------------------------------------------------------------------+
|  OVERVIEW  |  PRODUCT  |  BUILD  |  HISTORY                               |
+--------------------------------------------------------------------------+
|  NEXT: Solution Architect uploads the architecture                        |
|    Owner: Success O.        Blocked on: nothing                           |
|    [x] Product Brief exists        [x] Technical requirements captured     |
|    [ ] Architecture uploaded       [ ] Architect confirms                  |
|                                        [ Advance to Mockup / Demo ]        |
+--------------------------------------------------------------------------+
```

**The four tabs**

| Tab | Holds | Read most by |
|---|---|---|
| **Overview** | Next-step panel, gate checklist, advance control, health, client, key dates, compact status strip | Everyone |
| **Product** | Product Brief, requirements, user journeys, scope and out-of-scope. The canonical definition of what is being built | TSD, Architect, Designer, Legal |
| **Build** | The kanban board embedded, pod list, milestones | Architect, engineers |
| **History** | Stage history, activity log, decisions | TSD, Senior Partner, audit |

**The icon rail.** No route change, no separate workspace, no second navigation tree.

| Icon | Drawer contents | Write access |
|---|---|---|
| Architecture | A list of uploaded architecture documents, newest first, each with version, author, date and a one-line note. A single **Upload architecture document** button. | **Solution Architect only.** Everyone else reads. |
| Demos | Demo rounds, each with date, materials link, feedback captured, outcome | TSD |
| Talent | Talent requirements and the people sourced against them | Architect raises, TSD confirms, TalentSD works |
| Documents | Every file and transcript on the project, typed and dated | Anyone on the project |
| Risks | Risk list | TSD, Architect |
| Activity | Recent activity, a peek at the same data as the History tab | Read only |

There is no architecture canvas, no diagram editor and no component graph.
The architect uploads a PDF, an image or a markdown file, exactly as stated: "the person would submit it on the app. He doesn't need to build it on it ... they can upload it as a PDF or as a JPEG" (TRANSCRIPT @00:44:36).

### 3.4 The pipeline board

Seventeen columns is unusable at 15 projects and worse at 50.
The board groups stages into **six phases**, one column each, with the stage shown as a line inside the card.

| Phase | Stages | Colour |
|---|---|---|
| Intake | 1, 2, 3 | neutral |
| Definition | 4, 5 | seafoam, light |
| Design | 6, 7, 8 | seafoam |
| Validation | 9, 10, 11 | gold, because this phase is waiting on the client |
| Delivery | 12, 13, 14 | forest |
| Close | 15, 16, 17 | forest, deep |

A filter switches to a single phase and shows its stages as columns when that detail is wanted.
PROJECT_STATE.md records that amber is reserved for "Under Review" alone, so Validation uses gold.

---

## 4. The stage machine

### 4.1 The 17 stages

`stage` stays an integer on the existing `projects` collection, so only the map changes.

| # | Stage | Owner | Closes when |
|---|---|---|---|
| 0 | Pre-project | Commercial / Initiator | Not a project. This is the existing `prospects` collection. |
| 1 | Client Project Intake | Commercial / Initiator | Project record created from the intake form |
| 2 | TSD Assignment | Senior Partner or Admin | A TSD is named |
| 3 | TSD Receives Project | TSD | TSD accepts ownership |
| 4 | TSD Intake and Discovery | TSD | Context validated, open questions listed |
| 5 | Product Definition and Outcome Brief | TSD | Product Brief exists |
| 6 | Request Solution Architect | TSD requests, **Senior Partner selects** | Architect named. **Blocks until the Senior Partner acts.** |
| 7 | Product Discovery and Scoping | TSD + Architect + Designer | Requirements and journeys refined |
| 8 | Solution Architecture | Solution Architect | Architecture document uploaded |
| 9 | Mockup / Demo | Architect + Designer + engineers | A demo round exists with materials |
| 10 | Client Feedback and Iteration | TSD | Feedback captured against that demo round |
| 11 | Validation and Readiness | TSD | **CLIENT VALIDATED.** Scope freezes here. |
| 12 | Delivery Preparation and Pod Formation | TSD | Pod formed, milestones set, talent requirements raised |
| 13 | Engineering / Build | Solution Architect | Board work complete |
| 14 | QA / Testing | Architect + QA on the same board | QA Review column clear |
| 15 | Client Acceptance / UAT | TSD | Client accepts |
| 16 | Handover | TSD | Handover documented |
| 17 | Project Closure | TSD | Closure checklist complete |

Two gates are load-bearing and enforced in code, not by convention.

- **SPEC §7:** the intake form is the formal entry point. Nothing enters mid-pipeline by side door.
- **SPEC §17:** "A demo is not permission to build." Stage 11 to 12 is the hard gate of the whole system, and it is where scope freezes.

Stages 9 and 10 loop. See section 9.3.

### 4.2 Migrating the 15 live projects

| Current | Label | New | Note |
|---|---|---|---|
| 1 | New Client | 1 | Same meaning |
| 2 | Coordinator Picked | 3 | The delivery owner has been named |
| 3 | Meeting Scheduled | 4 | A client meeting is discovery |
| 4 | Package Building | 5 | The package is the definition artefact |
| 5 | Send Package | 5 | Sending it does not advance delivery state |
| 6, 7, 8 | Proposal / Exec Approval / Proposal Sent | 5, and set `commercial_status` | Commercial sits outside the core flow (SPEC §2) |
| 9 | In Build | 13 | Direct |
| 10 | Completed | 17 | Direct |

The split-track model (`track`, `parent_project_id`, `sibling_project_id`) is retired.
One project, one record, one lifecycle.
Sibling records merge back into the build-track parent, and commercial state becomes a field.

### 4.3 Gates and the next-step panel without AI

SPEC §6 to §23 give every stage explicit Inputs, Core Activities and Outputs.
SPEC §28 gives every transition its minimum gate condition.
Hardcode both as a per-stage playbook and the product answers "what do I do next" with no model call at all.

Gate conditions are checkboxes the stage owner ticks, and the tick is recorded against their name and the time.
When AI arrives in Tier 4, some conditions resolve automatically and the panel does not move or change shape.
That is why it is worth building this way rather than leaving a hole.

---

## 5. Roles across the app, verified

### 5.1 The function map

The CRM has two independent axes today and they must stay independent.
`role` (`super_admin` / `mini_admin` / `team_member`) is an **access level**.
The Crowther roles are **jobs**. They become `function_role`.
One person can be a `mini_admin` and a `TalentSD`.

| `function_role` | Key activities | Owns stages | Board rights | Replaces |
|---|---|---|---|---|
| `senior_partner` | Selects the Solution Architect. Informed and consulted, never Responsible or Accountable. Receives forced-gate and red-health alerts. | 6 (selection only) | read | `is_executive_approver` |
| `commercial` | Runs prospects, fills the intake form, hands over | 0, 1 | read | `is_relationship_owner`, `is_prospect_owner` |
| `tsd` | Owns the client and the project. Moves every stage. Sets health. Confirms talent needs. Records client validation. Decides scope changes. | 3, 4, 5, 10, 11, 12, 15, 16, 17 | manage | `is_delivery_owner`; the "project manager" concept |
| `solution_architect` | Technical owner. Uploads architecture. Runs the kanban board. Raises talent needs. **Drawn from the engineering team.** | 8, 13, 14 | manage | new |
| `engineer` | Builds. Moves their own cards. Contract staff use this same role. | none | use | `is_engineer` |
| `product_designer` | Journeys, mockups, design QA on the board | 7, 9 (shared) | use | new |
| `qa` | Test and defect cards in the QA Review column | 14 (shared) | use | new |
| `talent_sd` | Receives confirmed talent requirements, sources from the talent database, runs offers and contracting | none | read | Talent unit membership |
| `people_ops` | Creates contract-staff accounts, onboarding | none | read | `is_hr`, `is_operations_owner` |
| `legal` | Writes contracts. **Sees brief, requirements, scope. Not the technical detail.** Section 5.3. | none | none | new |
| `finance` | Commercial administration, outside the pipeline | none | none | new |

`is_delivery_coordinator` is retired outright. Its job was picking who runs the project, which is now stage 2.

### 5.2 Solution Architect comes from engineering

An engineer is a person; Solution Architect is a hat worn on one project.
So a user carries `function_role: engineer` **and** a flag `can_architect: true`, and the project carries `architect_id`.
This avoids the trap of a person who is an architect on one project and an ordinary pod engineer on another needing two accounts.

The candidate list at stage 6 is therefore: every active user with `can_architect: true`.
The Senior Partner picks from it. Nobody else can.

### 5.3 What Legal and Finance see

Stated plainly: "They don't need to see everything about the technical details. All they need to see is the project brief, the requirements, all of that, so that they can use it in writing contracts and stuff." (DECISION)

| Visible to `legal` and `finance` | Hidden |
|---|---|
| Client, project name, dates, stage, health | Kanban board and all cards |
| Product Brief and outcome | Architecture documents |
| Requirements and acceptance criteria | QA and defects |
| User journeys | Pod internals and talent rates |
| Scope and out-of-scope | Raw transcripts |
| Milestones | Internal decisions and risks |
| Commercial fields: value, currency, contract status | |

This is a new predicate, `permissions.can_view_commercial_slice(user, project)`, and a read-only project view that returns only those fields.
It is not the full project object with a hidden CSS class. PROJECT_STATE.md §4 records what happened the last time presentation was mistaken for access control.

---

## 6. The projects data model, in full

This is the complete target shape of a project record, its properties and its relationships.

### 6.1 The `projects` document

**Identity**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid string | Primary key. Unchanged. |
| `project_id_display` | string | `THCO-2026-A17C3D`. Unchanged. Rename prefix to `CROW-` is optional and cosmetic. |
| `name` | string | |
| `client_id` | uuid, nullable | to `clients` |
| `client_name_snapshot` | string | Denormalised so the project reads correctly if the client is renamed |
| `website` | string | |
| `created_from_prospect_id` | uuid, nullable | **New.** Links back to the stage 0 prospect. |

`unit_slug` is **removed**, not kept.
Units opened and owned work under the old model, which is what the field recorded.
A project now arrives from a client conversation, is owned by a named TSD, and is built by a pod drawn from across the capability teams, so there is no unit for it to belong to.
Three things were reading it and each has a better answer: who may open a project is a function (`can_open_project`), who can be added to a pod is every active member of staff (`GET /flow/staff`), and the owner shown on a board card is the TSD.

**Lifecycle**

| Field | Type | Notes |
|---|---|---|
| `stage` | int 1..17 | Was 1..10 |
| `stage_key` | string | Derived, e.g. `solution_architecture` |
| `phase` | string | Derived: intake / definition / design / validation / delivery / close |
| `status` | enum | `active` / `on_hold` / `lost` / `completed` |
| `health` | enum | `GREEN` / `AMBER` / `RED`. **TSD only.** |
| `health_reason` | string | Required when not GREEN |
| `health_set_by`, `health_set_at` | string, iso | |
| `scope_frozen` | bool | **New.** Set true at stage 11. The switch that turns requirement edits into scope changes. |
| `scope_frozen_at` | iso | |
| `stage_history[]` | embedded | `{from_stage, to_stage, at, by, by_name, why, gate_conditions[], forced}` |

`track`, `parent_project_id`, `sibling_project_id` are **deleted** after the sibling merge.

**People**

| Field | Type | Notes |
|---|---|---|
| `tsd_id`, `tsd_name` | uuid, string | Replaces `delivery_owner_id`. The project owner. |
| `architect_id`, `architect_name` | uuid, string | Set at stage 6 by the Senior Partner |
| `architect_requested_at` | iso | When the TSD asked. Drives the Senior Partner's queue. |
| `designer_id`, `designer_name` | uuid, string, nullable | |
| `pod_member_ids[]` | uuid[] | Derived from `pod_members`, denormalised for the permission filter |
| `created_by`, `created_by_name` | uuid, string | |

`pricing_owner_id`, `assigned_engineer_id`, `delivery_coordinator_id`, `executive_approver_id` are **deleted** after migration onto the fields above.

**Definition**

| Field | Type | Notes |
|---|---|---|
| `template` | string, nullable | Chosen at intake |
| `desired_outcome` | text | SPEC §7. What the client asked for: a proposal, a further meeting, a build. |
| `original_brief` | text | The brief as received |
| `description` | text | Short summary, existing field |
| `source` | string | Who brought it in |

**Workstream status.** Value sets from SPEC Appendix A.

| Field | Values |
|---|---|
| `product_status` | not_started / drafting / defined / changed |
| `architecture_status` | not_started / in_progress / uploaded / superseded |
| `demo_status` | preparing / scheduled / completed / feedback_required / iteration_required / client_validated / client_declined |
| `client_status` | not_engaged / in_discovery / awaiting_feedback / validated / accepted |
| `talent_status` | none / requested / sourcing / partially_filled / filled |
| `qa_status` | not_started / in_progress / blocked / failed / passed / retest_required / ready |
| `commercial_status` | none / proposal / awaiting_approval / sent / contracted |

**Lifecycle timestamps**

Written by the stage machine, never typed. Each one records when the project actually reached something, so "how long did discovery take" is answerable without reading the history.

| Field | Set when |
|---|---|
| `created_at` | The intake form is submitted |
| `start_date` | The project enters Engineering and Build, stage 13 |
| `validated_at` | The client validates, stage 11. The same moment scope freezes |
| `completed_at` | The project reaches Closure, stage 17 |
| `end_date` | The agreed delivery date, where one is set. This is the only one a person types |
| `lost_at`, `lost_reason` | The project is marked lost. These belong with `status`, not with dates |

**Commercial reference**

`total_value`, `currency`, `commercial_status`.

These are carried, not managed. Commercial and finance administration sits outside the core delivery flow (SPEC section 2), so the pipeline holds the headline value and the state of the paperwork for reference, and the contract itself is Legal's work elsewhere. A project does not stop moving because a number here is missing.

**Closure**

`closure_checklist[]` as `{label, done, done_by, done_at}`.

**Kept as-is**

`is_demo`, `collaborator_ids`, `thumbnail_id`, `notes`.

### 6.2 Related collections

Each row below carries `project_id`.

| Collection | Key fields | Relationships |
|---|---|---|
| `requirements` | `req_ref` (R-01), `description`, `category`, `priority`, `status` (proposed / committed / open_question / rejected / superseded), `acceptance_criteria`, `source_type` (intake / transcript / demo_feedback / scope_change), `source_id`, `superseded_by` | The spine. Referenced by scope changes, journeys, cards. |
| `user_journeys` | `title`, `persona`, `steps` | may reference `requirement_ids[]` |
| `product_briefs` | `version`, `problem`, `outcomes`, `success_metrics`, `in_scope`, `out_of_scope`, `assumptions`, `author_id`, `status` | Versioned. Never overwritten. |
| `architecture_documents` | `version`, `title`, `file_url`, `file_type`, `note`, `uploaded_by`, `uploaded_at` | Upload only. **No components, no edges, no graph.** |
| `demos` | `round` (int), `scheduled_for`, `materials_url`, `outcome` (pending / iterate / validated / declined), `held_at`, `notes` | Multiple rounds per project. Section 9.3. |
| `feedback_items` | `demo_id`, `raw_text`, `classification` (within_scope / scope_change / question / rejected), `captured_by` | Belongs to a demo round |
| `scope_changes` | `description`, `origin_type`, `origin_id`, `impact_timeline`, `impact_effort`, `impact_cost`, `impact_architecture`, `decision` (pending / approved / rejected / deferred), `decided_by`, `decided_at`, `creates_requirement_id` | Section 9 |
| `decisions` | `dec_ref` (D-01), `title`, `description`, `reason`, `alternatives`, `selected_option`, `decision_maker_id`, `affected_requirement_ids[]` | SPEC §33.1 |
| `risks` | `title`, `category`, `probability`, `impact`, `severity`, `mitigation`, `contingency`, `owner_id`, `status` | SPEC §36.1 |
| `documents` | `title`, `doc_type` (brief / transcript / architecture / demo / handover / other), `file_url` or `content`, `source_label`, `source_date`, `author_id`, `version` | Transcripts live here with a source label and date, per TRANSCRIPT @00:17:26 |
| `milestones` | `title`, `due_date`, `status`, `stage` | Existing collection, extended |
| `talent_requirements` | See section 8.4 | |
| `talent_assignments` | See section 8.4 | The person-to-project link |
| `pod_members` | `user_id`, `pod_role`, `allocation_pct`, `is_lead`, `source` (internal / contract), `assignment_id`, `joined_at`, `left_at` | Derived from deployed assignments plus internal staff |
| `boards`, `cards` | Existing task board | Section 10 |
| `audit_log` | Existing, extended with `prev_state`, `new_state`, `reason`, `source` | SPEC §33.2 |

### 6.3 Relationships

```
clients 1---* projects
prospects 1---0..1 projects            (created_from_prospect_id)

users *---* projects
  as tsd_id            (1 per project)
  as architect_id      (1 per project, user must have can_architect)
  as designer_id       (0..1)
  via pod_members      (many)

projects 1---* requirements
projects 1---* user_journeys           journeys *---* requirements
projects 1---* product_briefs          (versioned)
projects 1---* architecture_documents  (versioned, upload only)
projects 1---* demos                   demos 1---* feedback_items
feedback_items 0..1---1 scope_changes
scope_changes 0..1---1 requirements    (approved change mints a requirement)
projects 1---* decisions               decisions *---* requirements
projects 1---* risks
projects 1---* documents
projects 1---* milestones
projects 1---* talent_requirements
talent_requirements 1---* talent_assignments
talent_assignments *---1 talents       (the renamed candidate database)
talent_assignments 0..1---1 users      (account created at contracting)
talent_assignments 0..1---1 pod_members
projects 1---* boards 1---* cards
cards 0..1---1 requirements            (optional traceability, Tier 3)
projects 1---* audit_log
```

The single rule that holds it together: **a project is the only aggregate root.**
Nothing in the list above exists without a `project_id`, except `talents` and `users`, which are people and outlive any project.

---

## 7. The requirements flow, and why there is no architect brief

### 7.1 What is removed

The `architect_briefs` collection is deleted from the plan.
So is any notion of a briefing package, a handover bundle or an architect-only folder.

The reason is that a separate package is a copy, and a copy goes stale the moment the original moves.
SPEC §29.1 is explicit that Product Brief and Architecture must never be allowed to drift apart, and the surest way to make them drift is to hand the architect a snapshot.

### 7.2 What replaces it

**The architect gets read access to the entire project from the moment they are named, and it is the same data everyone else sees.**

At stage 6, when the Senior Partner selects the architect, exactly two things happen:

1. `architect_id` is set on the project.
2. The architect is notified by email and in-app.

There is no third step, because there is nothing to assemble.
What the architect opens is the project page described in section 3.3, containing:

- the original brief and the desired outcome, as captured at intake
- every transcript, with its source label and date
- every uploaded document
- the Product Brief, current version and all prior versions
- every requirement, including those still marked `open_question`
- every user journey
- decisions and risks recorded so far
- the stage history, so they can see how the project arrived here
- once talent requirements exist, those too, because team shape is project context (section 8.7)

This is a read of the live record.
When the TSD adds a transcript at stage 10, the architect sees it without anyone re-issuing anything.

### 7.3 Consequences

- **Stage 6 becomes cheap.** It is a selection and a notification, not a document-production step. That helps, because stage 6 blocks on the Senior Partner (DECISION 1) and should therefore be as short as possible once they act.
- **`architecture_documents` is an output, not an input.** The architect reads the project and uploads their architecture back to it.
- **Requirements are the shared spine.** Architect, designer, TSD and Legal all read the same `requirements` list. Legal sees a narrower slice (section 5.3), but it is a slice of the same rows, not a different table.

---

## 8. Talent and contract staffing

### 8.1 Where it lives

Inside the main flow, on the project, in the Talent drawer.
Not a separate module, not a separate silo, and with no external system involved.

### 8.2 The trigger point

**Stage 12 only, after client validation.** (DECISION 4)

The reasoning given was direct: sourcing before validation risks approaching people and then withdrawing because the project did not proceed.
So the architect may notice the gap at stage 7 or 8, but the requirement cannot be raised until stage 11 has passed.
If they try, the UI says why and offers to record it as a note on the project instead.

### 8.3 The workflow, step by step

**Step 1. The architect raises the need.**
In the Talent drawer, the architect creates a talent requirement: role title, skills, seniority, quantity, engagement type (contract or internal), duration, expected start, and a short justification.
Status becomes `draft`. Nothing is visible to TalentSD yet.

**Step 2. The TSD confirms it.**
The TSD sees pending requirements on the project and on their dashboard.
Confirming sets status to `confirmed` and stamps `confirmed_by` and `confirmed_at`.
The TSD may edit quantity or engagement type before confirming, and may reject with a reason, which returns it to `draft` with the reason attached.
This is the checkpoint described as "The architect says, I need some more engineers. TSD confirms it." (DECISION 3)

**Step 3. TalentSD receives the brief.**
Confirmation notifies every user with `function_role: talent_sd`, by email and in-app.
The notification carries the role, the skills, the project, the start date and a link.
TalentSD opens the requirement and sees the project context they are entitled to: the brief, the requirements and the journeys. They do not need the architecture.
Status becomes `sourcing`.

**Step 4. Sourcing from the in-house talent database.**
TalentSD searches `talents` (the renamed candidate database, 33,547 records) from inside the requirement.
Search is the existing talent search; nothing new is built.
Selecting a person creates a **talent assignment** in status `shortlisted`, linked to both the requirement and the project.
This is the record of "this person was sourced for this project", and it is the answer to the multi-project question in 8.5.

**Step 5. Interview and selection.**
Assignment moves `shortlisted` to `interview` to `selected`.
Free-text notes at each step. No scoring, no ranking, no AI.

**Step 6. Offer.**
`selected` to `offered`, stamping `offered_at` and `offer_deadline`.

**Step 7. Response.**
Accepted moves to `accepted`. Declined moves to `declined` with a required reason. See 8.6.

**Step 8. Contracting.**
`accepted` to `contracting`, then to `contracted` when signed, stamping `contract_signed_at`, `contract_start` and `contract_end`.
People and Operations is notified at `contracting` to prepare onboarding.

**Step 9. Account and pod.**
At `contracted`, People and Operations creates a standard user account:
`function_role: engineer`, `employment_type: contract`, `contract_end` set.
There is no contractor entity and no contractor role, exactly as directed: "There's going to just be the engineers part under the functions ... just their project and they update it" (TRANSCRIPT @00:37:47).

The assignment moves to `deployed`, which creates the `pod_members` row.
That row is what puts the project on their dashboard and the board in their reach.

**Step 10. Requirement fills.**
A requirement with `quantity: 2` closes when two assignments reach `deployed`.
Until then it stays `sourcing` and shows "1 of 2 filled".

### 8.4 Data model

**`talent_requirements`**

| Field | Notes |
|---|---|
| `requirement_id`, `project_id` | |
| `role_title`, `skills[]`, `seniority` | |
| `quantity`, `filled_count` | |
| `engagement_type` | `contract` / `internal` |
| `duration_months`, `expected_start` | |
| `justification` | Why this project needs it |
| `status` | `draft` / `confirmed` / `sourcing` / `partially_filled` / `filled` / `cancelled` |
| `raised_by_id` | The architect |
| `confirmed_by_id`, `confirmed_at` | The TSD |
| `attempt_count` | Incremented on each failed offer. Section 8.6. |

**`talent_assignments`** is the person-to-project link and the heart of this section.

| Field | Notes |
|---|---|
| `assignment_id`, `requirement_id`, `project_id` | |
| `talent_id` | to `talents` |
| `user_id` | null until an account is created at contracting |
| `status` | see the state machine below |
| `sourced_by_id`, `sourced_at` | Who found them, when |
| `offered_at`, `offer_deadline`, `responded_at` | |
| `decline_reason` | Required on `declined` |
| `contract_signed_at`, `contract_start`, `contract_end` | |
| `allocation_pct` | Their share of a working week on **this** project |
| `pod_role` | e.g. Backend Engineer |
| `ended_at`, `end_reason` | |

**State machine**

```
shortlisted -> interview -> selected -> offered -> accepted -> contracting -> contracted -> deployed -> ended
                                           |          |             |
                                           v          v             v
                                       declined   withdrawn     not_signed
                                           |          |             |
                                           +----------+-------------+
                                                      |
                                              requirement returns to
                                              sourcing, attempt_count++
```

Terminal-but-recoverable states are `declined`, `withdrawn` and `not_signed`.
They never delete the assignment. The record of having approached someone is kept.

### 8.5 One person, several projects

A talent has **many assignments**, one per requirement they were sourced against.
Pod membership is derived, not declared: a person is in a pod because they hold a `deployed` assignment on that project.

This gives three things for free:

- **Sourcing history per person.** Every project they were considered for, and what happened.
- **Over-allocation is visible.** Sum `allocation_pct` across a person's `deployed` assignments. Above 100 is a warning on the pod list.
- **Leaving one project does not remove them from another.** Ending an assignment removes one `pod_members` row and nothing else. Their account survives, because their account is theirs, not the project's.

A person sourced for two projects at once is normal and needs no special case.
The same `talent_id` appears in two assignments, and if they already have a `user_id` from the first contract, the second assignment reuses it rather than creating a second account.

### 8.6 What happens when it does not work out

| Situation | State | What the system does |
|---|---|---|
| Declines the offer | `declined`, reason required | Requirement returns to `sourcing`, `filled_count` unchanged, `attempt_count` incremented. TalentSD notified. TSD and architect notified only if no other assignment on that requirement is active, because that is when it becomes a delivery problem. |
| Accepts, then does not sign by the deadline | `not_signed` | Same return path. `offer_deadline` is what makes this detectable instead of silent. A daily sweep flags assignments past deadline. |
| Withdraws during contracting | `withdrawn` | Same return path. People and Operations notified to stop onboarding. |
| Signs but never starts | `ended`, reason `no_show` | Pod row removed if it was created. Requirement reopens. |
| Leaves mid-project | `ended`, reason recorded | Pod row closed with `left_at`. The original requirement is **not** reopened. A new requirement is raised instead, so the history stays honest about the fact that this was a replacement, not the original hire. |
| Contract expires | `ended`, reason `contract_ended` | Pod row closed. Account handling in Q1, section 14. |

**Retries.** No hard limit.
After three failed attempts on one requirement the drawer shows a prompt asking whether the role, rate or seniority should change, and the TSD is notified.
This is a nudge, not a block, because blocking sourcing helps nobody.

**Approvals.** Only one: the TSD confirming the requirement at step 2.
Individual selections do not need approval. The TSD sees them on the project and can intervene.

### 8.7 Talent as project context

The architect and TSD see the talent picture as part of the project, not in a separate report:
requirements raised, how many are filled, who is on the pod, allocation, and any requirement stuck in `sourcing` past its expected start.

A requirement whose `expected_start` has passed while `filled_count` is short of `quantity` is a delivery risk and shows on the Overview strip.
That is the honest version of a resourcing dashboard and costs one query.

---

## 9. Scope, demos and what "work" means

### 9.1 What "work" is

The question was direct: is committed work a kanban card, or something else?

**A requirement is the unit of scope. A card is the unit of execution.**

- A **requirement** is a thing the client is owed. It lives in `requirements` and carries acceptance criteria.
- A **card** is how somebody does part of that. It lives on the kanban board.
- One requirement usually becomes several cards. A card without a requirement behind it is internal work, which is fine and normal.

So "committed work" in SPEC §29.2 means a requirement with status `committed`.
Cards are downstream of that and are never the thing scope is measured in.

### 9.2 Scope freeze

Requirements change constantly during discovery, definition and scoping, and that is not scope creep, it is the job.
Calling every change at stage 4 a scope change would bury everyone in paperwork.

**So `scope_frozen` flips true at stage 11, Client Validation.**

| Before the freeze | After the freeze |
|---|---|
| Anyone with write access edits requirements freely | A new or changed requirement creates a `scope_changes` row |
| No approval | The TSD decides: approve, reject or defer |
| No impact assessment | Impact recorded across timeline, effort, cost and architecture |

This is exactly what SPEC §17 means by "a demo is not permission to build", and it is the reason the freeze sits on the same gate.

### 9.3 Multiple demo rounds

This was raised directly, and it is right: after a demo, part of the originally understood scope will have to change.
The pipeline is built for that.

**Stages 9, 10 and 11 form a loop, and `demos` is a collection, not a field.**

```
   stage 9  Mockup / Demo         -> demo round N created, materials attached
   stage 10 Feedback & Iteration  -> feedback_items captured against round N
                                      outcome = iterate  --> back to stage 9, round N+1
                                      outcome = validated --> forward to stage 11
                                      outcome = declined  --> project status = lost
   stage 11 Validation            -> scope_frozen = true
```

Going from 10 back to 9 is a normal, expected move.
It does not require a reason, unlike other backward transitions, because iterating on a demo is the designed behaviour rather than a correction.
Each loop increments the round number, so "we demoed three times before they signed off" is a fact the system holds rather than folklore.

Feedback captured at stage 10 is classified by hand into `within_scope`, `scope_change`, `question` or `rejected`.
Before the freeze, a `scope_change` classification simply edits the requirement set.
After the freeze it creates a `scope_changes` row.

### 9.4 The scope change record

| Field | Notes |
|---|---|
| `description` | What is being asked for |
| `origin_type`, `origin_id` | Which demo round, feedback item or transcript it came from |
| `impact_timeline`, `impact_effort`, `impact_cost`, `impact_architecture` | Free text in Tier 1. Generated in Tier 4. |
| `decision` | `pending` / `approved` / `rejected` / `deferred` |
| `decided_by_id`, `decided_at`, `decision_reason` | |
| `creates_requirement_id` | Set when approved |

**Who decides: the TSD.**
This follows decisions 2, 11 and 12, which all put the project's judgement calls with the TSD.
The architect is notified on every scope change because `impact_architecture` is their assessment to give.

**The Senior Partner is notified, not asked**, consistent with their stated position of Informed and Consulted rather than Responsible or Accountable (TRANSCRIPT @00:21:04).
Notification fires when an approved change moves the timeline or the price.
The threshold above which that happens is question Q2 in section 14.

**Approved** mints a requirement with status `committed` and `source_type: scope_change`.
**Rejected** is kept and visible on the project, never deleted. SPEC §52 rule 14: scope changes are never silently absorbed.

---

## 10. Workspaces: what already exists, and the merged structure

The instruction was to check the kanban board first and not to create parallel workspaces where the board already covers the process.
That check was done, and the board covers more than expected.

### 10.1 What the board already has

`backend/routers/taskboard.py` ships these default column titles:

```
UI/UX Tasks · Dependencies · Backlog · Frontend Todo · Backend Todo
QA Review · Ready For Merge · Done
```

Boards are columns, cards are tasks, and cards already carry labels, assignees, priority, due dates, attachments and cover images.

### 10.2 The merge

| SPEC workspace | Verdict | How |
|---|---|---|
| **§38.5 Build Workspace** | **Already exists.** | It is the board. Do not rebuild. |
| **§20 QA / Testing** | **Merge into the board.** | `QA Review` is already a column. A defect is a card with a `defect` label sitting in it. A test is a card with a `test` label. Stage 14 is "the QA Review column is clear", which is a count, not a new subsystem. |
| **§24 Design QA** | **Merge into the board.** | `UI/UX Tasks` exists. Add one column, `Design QA`, between `Ready For Merge` and `Done`. The loop SPEC §24 demands (implement, ready, review, pass or issue) is a card moving between two columns. |
| **§36.2 Dependency engine** | **Partly merge.** | `Dependencies` is already a column. Cross-project and non-task blockers are not cards and stay a Tier 3 concern. |
| **§38.3 Architecture Workspace** | **Reduce to a drawer.** | A list of uploaded documents and one upload button. Section 3.3. |
| **§38.4 Product Workspace** | **Keep as a tab.** | This one earns a tab. It is the canonical definition and four different roles read it. |
| **§38.2 Demo Workspace** | **Reduce to a drawer.** | Demo rounds, feedback, outcome. |

**Net effect: no new boards, one new column, and three SPEC workspaces collapse into drawers.**

### 10.3 One board per project

The board is created when the project enters stage 13, seeded with the default columns plus `Design QA`.
It is not created earlier, because an empty board on a project at stage 4 is noise.

The Solution Architect owns its shape (section 3.2).
Stage 14 does not move the work to a different board; it changes what the pipeline is watching, which is the count of cards left in `QA Review`.

---

## 11. FlowForge: what is actually built

This was asked directly, so here is the verified state rather than an impression.

### 11.1 What exists

| Layer | Detail |
|---|---|
| Router | `backend/routers/flowforge.py`, 1748 lines, **30 endpoints** |
| Datastore | **Supabase (PostgreSQL)**, not the CRM's MongoDB. `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. |
| Execution | **n8n**, via `N8N_BASE_URL` and `N8N_API_KEY`; `services/n8n_deployment.py` is 889 lines |
| Services | `flowforge_ai.py` (556), `prompt_engineering.py` (1066), `intelligent_workflow_designer.py` (395), `guided_input.py` (325) |
| Frontend | `FlowForgeChat.jsx`, `WorkflowInventory.jsx`, `ApprovalQueue.jsx` |
| Features | Conversations, approvals queue with stats, per-unit admins, integrations (available / analyze / check / sync), workflow design and generation, deployed tools (activate / execute / form-fields), workflow inventory (sync / search), speech-to-text |

By surface area it is the most built-out subsystem in the repo after the task board.

### 11.2 What does not work

**The AI half is broken in production, and has been.**

`flowforge_ai.py`, `prompt_engineering.py` and `intelligent_workflow_designer.py` all import:

```python
from emergentintegrations.llm.chat import LlmChat, UserMessage
```

`emergentintegrations` is **not in `backend/requirements.txt`**.
What loads instead is `backend/emergentintegrations/__init__.py`, a local stub whose constructors raise `_MissingPackageError`.

The imports are lazy, inside functions at `flowforge.py:1061` and `flowforge.py:1596`, so the router loads cleanly and the app starts.
The failure only appears when someone calls `/api/flowforge/generate`, `/api/flowforge/design-workflow` or `/api/flowforge/transcribe`.
It also depends on `EMERGENT_LLM_KEY`, a key belonging to the scaffolding vendor.

`litellm==1.80.0` and `openai==1.99.9` are already installed, so the fix is a small adapter, not a rewrite.

### 11.3 What this means for Crowther OS

**It does not replace RecruitFlow.** FlowForge is an n8n workflow builder. It has no candidate data, no sourcing and no recruiting. Dropping the RecruitFlow integration is still the right call, because talent is going in-house on the CRM's own database, but FlowForge is not the thing that makes that possible.

**It is the natural home for Tier 4 AI**, once the LLM layer is repaired. The prompt scaffolding in `prompt_engineering.py` and the approvals queue are directly reusable for "AI recommends, humans decide" (SPEC §44).

**It should stay out of Tier 1.** It is on a different database with different credentials, and the delivery pipeline does not depend on it.

**Three things to fix when it is picked up**, in order: replace the `emergentintegrations` import with a `litellm` adapter; move off `EMERGENT_LLM_KEY`; decide whether Supabase stays a second datastore or folds into the main one.

---

## 12. Codebase cleanup

The instruction was a clean, professional basis to work on. Here is what is in the way.

### 12.1 Emergent scaffolding

| Item | What it is | Action |
|---|---|---|
| `.emergent/emergent.yml` | Build config for Emergent preview environments: `env_image_name`, `job_id`, build and start commands | **Delete.** Deployment is Azure Container Apps via `.github/workflows/azure-deploy.yml`. |
| `.emergent/summary.txt` | Empty file | **Delete** |
| `backend/emergentintegrations/` | A stub package that raises on use. Section 11.2. | **Delete** once the four importing services move to `litellm` |
| `server.py:916` OAuth exchange | See 12.2 | **Delete.** Security issue. |
| `server.py:3572-3573` CORS | `thcotools.emergent.host`, `executive-decks.preview.emergentagent.com` | **Delete** |
| `services/email_templates.py:10` | Falls back to `executive-decks.preview.emergentagent.com` as `FRONTEND_URL` | **Change** the fallback to the real host. Emails currently link to the vendor preview if the env var is missing. |
| `backend_test.py`, 4 test files | Default `BASE_URL` points at the vendor preview | **Change** to localhost |
| `frontend/plugins/visual-edits/` | 120 KB Emergent visual-editing plugin. Auto-commits as `support@emergent.sh`; whitelists `*.emergent.sh` and `*.emergentagent.com` origins | **Delete**, and remove the two requires at `craco.config.js:20-21` |
| `start_preview.sh` | Named for Emergent previews, but genuinely used: it handles the `PORT` binding Azure needs | **Keep, rename** to `start.sh` |
| `frontend/src/App.js:138-165` | Auth callback reading `#session_id=` and calling the Emergent exchange | **Delete** with 12.2 |

### 12.2 A real security finding, not just cruft

`POST /api/auth/session` in `backend/server.py:905` is unauthenticated.
It takes an `X-Session-ID` header, calls `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data`, and trusts whatever email comes back.

If that email is unknown it **creates a new active THCO user account** (`server.py:970-993`), with no invitation and no approval.

The path is no longer reachable from the UI. `Login.jsx` removed the Google button, and there is no `AuthCallback` page.
But the endpoint is live, and it delegates account creation to a third-party demo service that THCO does not control.

**Recommendation: delete the endpoint, `App.js:138-165`, and `authAPI.exchangeSession` in `frontend/src/lib/api.js:51`.**
Nothing else calls it. Google sign-in, when it is wanted, is the proper OAuth client already described in the comment at `Login.jsx:53-60`.

This needs your confirmation before removal, because it is an auth path, and PROJECT_STATE.md §13 records that nothing goes to production without approval.

### 12.3 Presentation pages

`frontend/src/pages/` holds **41 client presentation components**: ProcureAI in nine variants, AFC Treasury, GDL Pebbles, Ingabo, TideWar, Winston Duke, The Forge, THCO Town Hall, Cene Team Audit, each with a public twin.

None of them touch project delivery.
Decision 10 says remove what is not essential to the delivery flow.

PROJECT_STATE.md §8 records that the ProcureAI decks and the Pebbles presentation are "deliberately excluded" from the design system because they are client-facing with their own identity, so they were being maintained on purpose at some point.

**Proposed: move them to `frontend/src/presentations/` with their own route group, out of the delivery surface, rather than deleting them outright.** Deleting client-facing material is not reversible in the way a move is. Confirmation needed, and it is Q4 in section 14.

### 12.4 Other cleanup worth doing at the same time

- `cookies.txt` is committed and holds an expired session token. Delete it.
- The README publishes a default admin password. Remove it.
- 20-odd one-off scripts sit loose in `backend/` (`fix_sync.py`, `revert_heads.py`, `assign_unit_heads.py`, `seed_*.py`, `migrate_*.py`). Move them to `backend/scripts/` so the package root is code that runs in production.
- `backend/server.py` is 3601 lines. Not a Tier 1 job, but the delivery endpoints should go in a new router rather than adding to it.

---

## 13. Priority tiers

### Tier 1: the spine, manual, end to end

A project travels from client conversation to closure without leaving the CRM, with every stage owned, gated and recorded. No AI anywhere.

1. Stage machine: 1..17, phases, gates from SPEC §28, playbooks from SPEC §6-23. Backward moves need a reason; 10 to 9 does not. TSD-only forcing with a Senior Partner alert.
2. Migration script: stage remap, sibling merge, flag to `function_role`, `is_delivery_coordinator` retirement.
3. Intake form: client, name, template, desired outcome, brief, pasted transcripts with source labels, document uploads.
4. Stage 2 TSD assignment and stage 6 architect selection, the latter blocking on the Senior Partner.
5. The project page: four tabs, six icon drawers, next-step panel, gate checklist, health control.
6. Requirements, Product Brief, architecture upload, documents and transcripts.
7. Demo rounds with the 9-10 loop, feedback capture, client validation gate, scope freeze.
8. `function_role` on users, `can_architect`, admin assignment screen.
9. Rename to Crowther OS, project manager to TSD, candidates to talents in the UI.
10. Emergent removal (12.1) and the auth endpoint decision (12.2).

Deliberately out: talent, pod, decisions, risks, scope-change records, QA columns, closure records. Each has a drawer that says what it is for and accepts a document meanwhile.

### Tier 2: delivery mechanics

- Talent and contract staffing in full, per section 8.
- Pod members, allocation, over-allocation warning.
- Board wiring at stage 13, the `Design QA` column, stage 14 reading the `QA Review` count.
- `can_manage_boards` moving to TSD plus Architect; the `taskboard.py` docstring rewrite.
- Scope change records with manual impact assessment.
- Decisions, risks, milestones, closure checklist, handover.
- Legal and Finance commercial slice (5.3).
- Notification routing by `function_role`, with SPEC §37 rules: only affected owners, include the reason, link to the entity, offer an action.
- Sidebar restructure.

### Tier 3: control and visibility

- Portfolio Control Tower with per-role exposure (TRANSCRIPT @00:33:51).
- Senior Partner exception view: red health, forced gates, scope changes moving time or money, stage 6 waiting on them.
- Dependency and blocker engine beyond board columns.
- Project and closure reports assembled from records.
- Requirement to card traceability.
- Search across project information.

### Tier 4: intelligence

Each item replaces text inside a panel that already exists.
Repair the FlowForge LLM layer first (11.2), then: next-step generation, transcript extraction, TSD scoring at stage 2, architect recommendation at stage 6, scope-change impact analysis, risk and QA suggestions, health recommendation with the TSD override intact, report narrative.
SPEC §27.1 recommendation contract and SPEC §44 human-in-the-loop apply throughout.

### Tier 5: long tail

Foundation and knowledge graph, multi-channel ingestion, client portal, contract and invoice automation, Frontier / Foundry / Firewall / Fabric as entities if the September restructure calls for it, PostgreSQL and OpenSearch.

---

## 14. Open questions

Four, and only four.

**Q1. Contract expiry and accounts.**
When a contract engineer's `contract_end` passes, should the system disable their account automatically, or flag it for People and Operations to action?
Automatic is safer and matches the fact that these are short renewable contracts.
Manual avoids locking somebody out mid-sprint on a renewal that is agreed but not yet recorded.
I would default to flag-and-notify seven days ahead, then disable on the day, but this is a real decision about people's access.

**Q2. The Senior Partner notification threshold on scope changes.**
Section 9.4 notifies them when an approved scope change moves the timeline or the price.
What is the threshold? Any change at all, or above a number of days or an amount?
Every change will be noise; no threshold means no visibility.

**Q3. Transcripts and Legal.**
Section 5.3 keeps raw transcripts away from Legal and Finance, because transcripts contain unfiltered client conversation.
Contract drafting sometimes needs exactly what was promised in a call.
Should Legal see transcripts, or only the brief and the requirements derived from them?

**Q4. The 41 presentation pages.**
Section 12.3 proposes moving them out of the delivery surface rather than deleting them.
Confirm move rather than delete, and confirm that the ProcureAI and Pebbles decks are no longer live for clients.
