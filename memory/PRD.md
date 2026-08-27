> **SECURITY NOTE.** The shared password that used to be written here
> was live in production and committed to this repository. It has been
> redacted; ask an administrator, or use your own account. Never write a
> working credential into a tracked file.

# FlowForge / THCO Executive Portal - PRD

## Original Problem Statement
Build "FlowForge," an internal AI-powered workflow automation tool within an executive portal. The portal also serves as a library for complex, animated, single-page-application-style presentations for various business purposes, a candidate assessment system, and a project delivery workflow.

## Core Features

### 1. FlowForge Automation Tool
- AI-powered workflow automation
- Business unit pages with "My Tools" tab
- Problem brief form with progressive enhancements

### 2. Proposals & Presentations Library
- 24+ cinematic animated presentations
- Public-facing versions with email gate
- PDF download capability (unstable)

### 3. Candidate Assessment Portal
- 3-page flow: Info, 39 Questions (100-min timer, answer locking), Final Details
- Admin Dashboard with JSON/CSV export

### 4. Authentication
- Bearer Token auth via localStorage (migrated from cookies due to CORS)
- Super Admin: joshua@thcohq.com / `<redacted>`
- Second admin: adoption@thcohqs.com / `<redacted>`

### 5. Winston Duke Brand Identity Presentation
- 30-slide cinematic brand reveal
- 9-point revision verified (Feb 2026)
- Section order: Crown → Hawk → Wave → Bridge → Interlock

### 5.5 Project Delivery Workflow (NEW - Feb 2026)

End-to-end internal workflow: project intake → HR delegation → engineer review → daily standup tracking.

**Workflow Status Flow:**
awaiting_delegation → delegated → under_review → revision_requested → approved_for_build → in_build → completed

**Three Business Unit Touchpoints:**
- **Talent & Human Capital** (`/talent/projects`) — Fulfillment uploads Brief + Roadmap
- **THCO HR** (`/thco-hr/delegation`) — HR delegates projects to engineers
- **Technology & Build** (`/technology/my-projects`) — Engineers review, approve, build, track

**Key Components Built:**
- 12 backend API endpoints (`/api/projects/*`)
- SLA scheduler (APScheduler: 120-min open + review windows with email reminders)
- 13 branded HTML email templates (Resend integration, placeholder key)
- User role flags: is_engineer, is_fulfillment, is_hr
- Engineer workload calculation (available/at_capacity/busy)
- Document upload/download with file validation (PDF/DOCX brief & roadmap, any-format multi-file client docs, 100MB per file)
- Daily standup form with progress tracking
- User Management page (`/admin/users`) for role toggles
- Notification badge system

**Database Collections Added:**
- projects, engineer_reviews, project_tracker_updates, email_logs

**Testing:** 100% pass rate (19 backend + all frontend Playwright tests)

## Architecture
- Frontend: React (CRA) + Framer Motion + Tailwind + Shadcn
- Backend: FastAPI + MongoDB
- Auth: Bearer Token via localStorage, Axios interceptors
- Email: Resend SDK (placeholder key)
- Scheduler: APScheduler (in-process)

## What's Been Implemented
- All 24+ presentations created and integrated
- Candidate Assessment system (full CRUD + admin)
- Auth refactor (cookies -> Bearer token)
- Winston Duke 9-point revision (VERIFIED)
- **Project Delivery Workflow (COMPLETE, TESTED Feb 2026)**
  - Backend: routers/projects.py, services/email_service.py, services/email_templates.py, services/sla_scheduler.py
  - Frontend: ProjectFulfillment, NewProjectForm, DelegationBoard, MyProjects, ProjectReview, ProjectTracker, UserManagement
  - Routes added in App.js, tabs added to TalentUnit, THCOHRPage, TechnologyAndBuild
- **NewProjectForm refinements (Feb 2026):** Free-text Client combobox, optional Company Website, multi-file "Documents from Client" upload (any format), 100MB per-file cap. Verified end-to-end.
- **My Tools tab rolled out (Feb 2026):** Now on all 10 business unit pages — TalentUnit (existing), plus THCOHRPage, TechnologyAndBuild, ClientDelivery, SalesAndBD, MarketingAndBrand, AdvisoryAndConsulting, OperationsAndFinance, AcademyAndLearning, ITAndTools. Each page renders DeployedTools component with Use Tool modal showing execution results.

## Known Issues
- P2: PDF download unstable
- P3: Babel plugin patch in node_modules (fragile)
- P3: form_url column migration pending
- Email service: RESEND_API_KEY is placeholder (needs real key from Joshua)

## Post-Deployment: Joshua's Setup Steps
1. Sign up for Resend at resend.com
2. Verify thcohq.com domain (SPF, DKIM, DMARC)
3. Replace RESEND_API_KEY in /app/backend/.env
4. Restart backend: sudo supervisorctl restart backend
5. At /admin/users, flag users: is_engineer, is_fulfillment, is_hr
6. Test end-to-end flow with sample project

## THCO Flow — Project Management System (NEW — May 2026, restructured v2)

End-to-end **10-stage** project pipeline with **track split at Stage 5**, replacing the "Project Management" sidebar entry. Coexists with the older Project Delivery Workflow; legacy projects auto-backfill into the new stage system on Kanban load.

**10 Stages (split tracks):**
- **Main track (1–5):** 1 New Client → 2 Coordinator Picked → 3 Meeting Scheduled → 4 Package Building → 5 Send Package
- **Proposal track (6–8, auto-spawned at Stage 5 split):** 6 Proposal → 7 Executive Approval → 8 Proposal Sent to Client
- **Build track (9–10, auto-spawned at Stage 5 split):** 9 In Build (Engineering) → 10 Completed

**Structured stage gates (required input):**
- **1→2**: must select Delivery Owner; only `is_qualifier` users (Delivery Coordinator) can perform
- **4→5**: must select both Operations Owner (set by Delivery Owner/Coordinator) and Engineer (set ONLY by Coordinator). On submit, system SPLITS the project into two sibling records — proposal (stage 6) + build (stage 9) — linked by `parent_project_id` + `sibling_project_id`. Both tracks email their next-role holders.

**Build track features:** `build_status` (planning/building/blocked/ready_for_qa), `build_comments[]` thread, EOD reminder cron (APScheduler, fires 17:00–22:00 UTC hourly) that emails the assigned engineer if no comment was logged that day.

**Role-based routing** (10 user flags now): `is_qualifier`, `is_delivery_owner`, `is_pricing_owner`, `is_executive_approver`, `is_legal`, `is_engineering_coordinator`, `is_engineer`, `is_relationship_owner`, `is_invoicing_owner`, `is_prospect_owner`. Assignable via admin UI at `/flow/admin/roles`.

**Kanban (`/flow/board`):** 10 columns with track-aware drag-and-drop (cards cannot cross tracks). Stages 2 and 5 require structured input — dragging onto them redirects to project detail instead of silently transitioning.

**Resend integration:** ✅ Working. API key configured, 9+ emails sent successfully. Caveat: sender is `onboarding@resend.dev` (sandbox); verify `thcohq.com` domain in Resend dashboard to deliver to anyone other than account owner.

**Testing:** Iteration 30 — 11/11 backend tests + frontend verified. One CRITICAL bug found (`is_engineer` missing from `FLOW_ROLE_FLAGS`) → fixed; Promise.all → Promise.allSettled hardening applied; backend now enforces selected engineer actually has `is_engineer=true`.

**Phase B (deferred):** LLM proposal generation, e-signature, WhatsApp/Email actual send, Stripe invoicing.

## Upcoming Tasks (Priority Order)
- **THCO Flow Phase B**: LLM proposal generation, WhatsApp+Email send, Stripe invoicing, e-signature
- **Setup (your action)**: Visit `/flow/admin/roles` and assign multiple users per role so the workflow has redundancy
- **Setup (your action)**: Verify `thcohq.com` domain in Resend dashboard, then change `SENDER_EMAIL` in `/app/backend/.env`
- P2: Stable PDF download for proposals
- P2: User-facing PDF download button on Realloc & Procure AI presentations
- P2: FlowForge Phase 5 (Polish/White-Label) and Phase 6 (Rollout/Monitoring)
- P2 (Flow polish): Move stage emails to BackgroundTask; pagination on list endpoints; split `flow.py` into per-domain modules

**New collections:** projects (extended), milestones, contacts, events, prospects, tickets, messages, audit_log, question_library.

**New API:** `/api/flow/*` — 30+ endpoints in `/app/backend/routers/flow.py`.

**New frontend pages** (`/flow/*`):
- `/flow` Dashboard (role-aware KPIs + pipeline chart + upcoming events)
- `/flow/board` Kanban (12 columns)
- `/flow/projects` list + filters
- `/flow/projects/new` create at Stage 1
- `/flow/projects/:id` detail + 12-stage progression + history + milestones + tickets
- `/flow/contacts` directory (strength tiers, birthdays auto-create events)
- `/flow/calendar` upcoming events (7/30/90 days)
- `/flow/prospects` Kanban (researched → handed_off creates a project)
- `/flow/tickets` Kanban (queued → shipped)
- `/flow/messages` draft / approve / send (Phase B: actual WhatsApp/Email)
- `/flow/admin/roles` admin-only role assignment

**Testing:** Iteration 29 — 17/17 backend tests + 12/12 frontend flows PASS. Security: role-assignment endpoint + admin page gated to super_admin/HR.

**Phase B (deferred):** LLM proposal generation (Module 3 finish), contract e-signature (Module 4), WhatsApp/Email actual send, Stripe invoicing, engineering peer-review checklist.

## Upcoming Tasks (Priority Order)
- **THCO Flow Phase B**: LLM proposal generation, contract e-signature, WhatsApp/Email send, Stripe invoicing
- P2: Stable PDF download for proposals
- P2: User-facing PDF download button on Realloc & Procure AI presentations
- P2: FlowForge Phase 5 (Polish/White-Label) and Phase 6 (Rollout/Monitoring)
- P2 (UX nit): Dedupe `clientDocs` by name in NewProjectForm so re-selecting same file doesn't append duplicates
- P2 (copy nit): Either change "100MB" copy to clarify per-file vs. total, or sum sizes server-side
- P2 (Flow polish): Move `_send_stage_email` to BackgroundTask; whitelist transition payload keys; contiguous-stage guard; sequential `project_id_display` counter; pagination on list endpoints; split flow.py into per-domain modules

## Future/Backlog
- P2: FlowForge Phase 5 & 6
- P3: Refactor monolithic server.py
- P3: "Forgot Password" flow
- P3: Permanent Babel plugin fix

## 3rd Party Integrations
- MongoDB (local)
- Supabase (PostgreSQL, legacy)
- n8n (THCO Automation Engine)
- Anthropic Claude (via Emergent LLM Key)
- OpenAI Whisper (via Emergent LLM Key)
- Resend (email, placeholder key)
