==================================================================
THCO CRM — PLAIN-LANGUAGE PRODUCT GUIDE
What every page does, who uses it, and what its role is
(Companion to the technical PRD. No code, no jargon — just the product.)
==================================================================

READ THIS FIRST — THE 30-SECOND VERSION
--------------------------------------------------
THCO CRM is one internal website that THCO staff log into to run the
business. Think of it as the company's "control room." From one login
you can:

  - See an overview of all business units (the Dashboard)
  - Manage clients and the slide decks / proposals sent to them
  - Run a full client-project pipeline (THCO Flow) from first contact
    to finished build
  - Ask an AI to build internal automation tools for you (FlowForge)
  - Screen job candidates with a timed assessment
  - Administer users, settings, and approvals
  - Show off cinematic branded presentations to clients

It is built as a React website (frontend) talking to a Python API
(backend). You do NOT need to understand the code to improve the
product — you need to understand what each screen is for. That is
what this document gives you.


HOW TO USE THIS GUIDE
--------------------------------------------------
Each page below is described with four things:
  - PATH: the web address (so you can find it / navigate to it)
  - WHAT IT IS: one-line plain description
  - WHO SEES IT: which kind of user
  - WHAT YOU CAN DO + ROLE: the features and why it matters

THE USERS (ROLES)
  - Super Admin (Joshua): sees and can do everything, including
    Settings, User Management, and the Approval Queue.
  - HR user: a normal staff member flagged as HR; can see the
    Candidate Assessments screen in addition to their units.
  - Unit staff: normal logged-in users. They see only the business
    units they are assigned to (except THCO Flow, which everyone sees).
  - Client (outside person): no login. Views a presentation only
    after typing their email (email gate).
  - Candidate (outside person): no login. Takes the assessment.


==============================================================
1. LOGIN & ACCOUNT PAGES
==============================================================

PATH: /login
WHAT IT IS: The sign-in screen.
WHO SEES IT: Anyone not logged in.
WHAT YOU CAN DO:
  - Enter email + password to enter the portal.
  - It also handles "log in with Google" (an OAuth callback swaps a
    temporary session code for a real session behind the scenes).
ROLE: The front door. Without it nothing else is reachable.

PATH: /register
WHAT IT IS: Create a new staff account.
WHO SEES IT: Anyone (typically used by an admin to onboard someone).
ROLE: Adds a person to the system so they can be given unit access.

PATH: /forgot-password  and  /reset-password
WHAT IT IS: Password recovery flow.
WHO SEES IT: Any logged-out user who forgot their password.
ROLE: Self-service account recovery. (Note: the email-sending half
of this is listed as not fully finished in the technical debt list.)

PATH: (hidden) AuthCallback
WHAT IT IS: The behind-the-scenes screen that finishes a Google login.
WHO SEES IT: Nobody directly — it flashes for a second then redirects.
ROLE: Glue between Google and the portal. If it breaks, Google login
fails. Do not hardcode any URL here or it breaks.


==============================================================
2. THE DASHBOARD (HOME)
==============================================================

PATH: /dashboard
WHAT IT IS: The landing page after login — a wall of "unit" cards.
WHO SEES IT: Every logged-in user.
WHAT YOU CAN DO:
  - See all 11 business units as colored cards, each with a short
    description, the unit lead's name, and a tool count.
  - Click a card to jump into that unit's page.
  - Quick links into Talent tools, THCO Flow, Admin, etc.
ROLE: The "mission control" overview. It is the first thing a user
sees and sets the tone for the whole product. This is the most
important screen to get visually right.


==============================================================
3. PROPOSALS & CLIENT LIBRARY
==============================================================

PATH: /proposals
WHAT IT IS: The internal library of clients and the slide decks /
documents sent to them.
WHO SEES IT: Logged-in staff (and Super Admin for full management).
WHAT YOU CAN DO:
  - Create a Client (a company/account you work with).
  - Upload proposals / documents attached to that client.
  - Generate a shareable link for a proposal (token-based, so only
    people with the link can open it).
  - See download counts and viewer tracking for shared decks.
  - Delete clients and proposals.
  - View "viewer analytics": who opened a public deck, from where,
    for how long.
ROLE: This is the sales/delivery record-keeping system. It connects
the people (clients) to the presentations (decks) and tells you
whether clients actually looked at what you sent.

PATH: /proposals/view/:shareToken
WHAT IT IS: The public, no-login view of a single shared proposal.
WHO SEES IT: An external client who was given a secret link.
ROLE: Lets a client open a deck you sent them without a THCO account.


==============================================================
4. THE 11 BUSINESS UNITS (AND THEIR PAGES)
==============================================================
Each unit has its own page (a "landing" for that department). They
follow the same pattern: an overview, the unit's key metrics, quick
actions, and an entry point into FlowForge ("Build a Tool"). A few
units also have dedicated sub-tools (covered in later sections).

The 11 units (sidebar order):
  1. Talent & Human Capital      -> /talent
  2. THCO HR                     -> /thco-hr
  3. THCO Flow                   -> /flow        (the pipeline system)
  4. IT & THCO Tools             -> /it-tools
  5. Sales & Business Dev        -> /sales
  6. Marketing & Brand           -> /marketing
  7. Advisory & Consulting       -> /advisory
  8. Technology & Build          -> /technology
  9. Operations & Finance        -> /operations
 10. Academy & Learning          -> /academy
 11. Client Delivery             -> /client-delivery

PATH: /talent  (Talent & Human Capital)
WHAT IT IS: The recruiting department's home.
WHO SEES IT: Talent staff (and anyone assigned).
WHAT YOU CAN DO (tabs):
  - TOOLS tab: launch the unit's working tools —
      * AI Candidate Sourcing (live): AI finds 50–100+ scored
        candidates from LinkedIn / the web.
      * Database Search (live): search THCO's own internal candidate
        database with AI resume analysis.
      * Email & Outreach Templates (coming soon)
      * Interview Scheduling (coming soon)
      * Candidate Pipeline / Kanban (coming soon)
  - AGENTS tab: shows the AI recruiting agents (e.g. #4 Sourcing
    Agent is live; #10 Screening, #11 Outreach, #17 Reporting are
    "coming soon").
  - BUILD HISTORY / DEPLOYED TOOLS tabs: FlowForge-built tools for
    this unit.
ROLE: The recruiting engine room. This unit is the most developed.

PATH: /thco-hr  (THCO HR)
WHAT IT IS: Internal HR department page.
WHO SEES IT: HR staff.
WHAT YOU CAN DO: Internal HR overview, people operations, performance
and incentives. Includes a Delegation Board (see below).
ROLE: Manages THCO's own people, not clients.

PATH: /it-tools  (IT & THCO Tools)
WHAT IT IS: The IT / infrastructure department page.
WHO SEES IT: IT staff.
WHAT YOU CAN DO: Outbound tooling, email warming, AI agent management
overview.
ROLE: Keeps the company's tech plumbing running.

PATH: /sales  (Sales & Business Development)
PATH: /marketing  (Marketing & Brand)
PATH: /advisory  (Advisory & Consulting)
PATH: /technology  (Technology & Build)
PATH: /operations  (Operations & Finance)
PATH: /academy  (Academy & Learning)
PATH: /client-delivery  (Client Delivery)
WHAT THEY ARE: Each is a department landing page following the same
template as Talent — overview, metrics, quick actions, FlowForge
entry point. Most are lighter on bespoke tools today; they mainly
serve as a home base and a launch point for building new AI tools.
ROLE: Gives every department a consistent, branded home inside the
portal so the whole company operates from one place.


==============================================================
5. TALENT SUB-TOOLS (the working recruiting apps)
==============================================================

PATH: /talent/sourcing  (AI Candidate Sourcing)
WHAT IT IS: A full tool that uses AI to build a candidate longlist.
WHO SEES IT: Talent staff.
WHAT YOU CAN DO: Describe a role; the tool returns 50–100+ scored
candidates scraped from LinkedIn and professional networks.
ROLE: The top of the recruiting funnel — find people fast.

PATH: /talent/database-search  (Database Search)
WHAT IT IS: Search THCO's stored candidate database.
WHO SEES IT: Talent staff.
WHAT YOU CAN DO: AI-powered resume analysis to match internal
candidates to a role.
ROLE: Reuse candidates already in the system before sourcing new ones.

PATH: /talent/projects  (Project Fulfillment)
PATH: /talent/projects/new  (New Project Form)
WHAT THEY ARE: A talent-delivery workflow for managing a recruiting
engagement from intake to fulfilled placement.
ROLE: Tracks a recruiting "project" end to end inside Talent.


==============================================================
6. THCO HR SUB-PAGE
==============================================================

PATH: /thco-hr/delegation  (Delegation Board)
WHAT IT IS: A board for assigning and tracking who is doing what.
WHO SEES IT: HR staff.
WHAT YOU CAN DO: Delegate tasks across the team and see status.
ROLE: Lightweight internal task delegation for the HR team.


==============================================================
7. TECHNOLOGY & BUILD SUB-PAGES
==============================================================

PATH: /technology/my-projects  (My Projects)
WHAT IT IS: A list of engineering/build projects owned by the viewer.
WHO SEES IT: Technology staff.
WHAT YOU CAN DO: See your projects, open one for review or tracking.

PATH: /technology/my-projects/:id/review  (Project Review)
WHAT IT IS: The review screen for a single build project.
WHAT YOU CAN DO: Open a review, make an approval/change decision.

PATH: /technology/my-projects/:id/tracker  (Project Tracker)
WHAT IT IS: A progress tracker for a single build project.
WHAT YOU CAN DO: Log build updates / track time and status.
ROLE: Lets engineers show progress and get sign-off on deliverables.


==============================================================
8. THCO FLOW — THE PROJECT PIPELINE SYSTEM
==============================================================
This is the largest single feature. It manages a client project
through a fixed 12-stage pipeline, from first contact to a completed
build. It is org-wide (everyone can see it).

THE 12 STAGES (in order):
   1. New Client
   2. Coordinator Picked
   3. Meeting Scheduled
   4. Package Building
   5. Send Package
   6. Proposal
   7. Executive Approval
   8. Proposal Sent to Client
   9. In Build (Engineering)
  10. Completed
(Stages 6–8 are the "proposal" track; 9–10 are the "build" track.)

PAGES:

PATH: /flow  (Flow Dashboard)
WHAT IT IS: The pipeline command center.
WHAT YOU CAN DO:
  - Stat cards: my active projects, awaiting exec approval, pending
    proposals, in build, events next 7 days, overdue invoices, my
    tickets, total prospects. Each card links to the relevant view.
  - A guided banner explaining how to add client contacts/birthdays
    so they show on the Calendar.
ROLE: At-a-glance health of all client work.

PATH: /flow/board  (Flow Board / Kanban)
WHAT IT IS: A drag-and-drop board of projects grouped by pipeline
stage.
ROLE: The visual "where is everything?" view for delivery.

PATH: /flow/projects  (Flow Projects list)
WHAT IT IS: A filterable table of all projects.
ROLE: The searchable master list (filter by stage, owner, status).

PATH: /flow/projects/new  (New Project)
WHAT IT IS: The form to create a new client project.
WHAT YOU CAN DO: Enter client, package, owner, kickoff details;
assign a coordinator; transition through stages.
ROLE: The entry point that puts a new client into the pipeline.

PATH: /flow/projects/:id  (Project Detail)
WHAT IT IS: One project's full record.
WHAT YOU CAN DO:
  - Move it between the 12 stages (transition).
  - Add the client's people (contacts) with birthdays / anniversaries
    so they appear on the Calendar.
  - Start the build, post build updates, complete the project.
  - Delegate tasks, re-upload files, mark as lost/closed.
  - View build comments and milestones.
ROLE: The single source of truth for one client engagement.

PATH: /flow/contacts  (Contacts)
WHAT IT IS: The directory of client people (not companies).
WHAT YOU CAN DO: Add/edit contacts with birthdays, work anniversaries,
spouse, etc.
ROLE: Relationship memory — feeds the Calendar with personal dates.

PATH: /flow/calendar  (Calendar)
WHAT IT IS: A calendar of events + the birthdays/anniversaries saved
on contacts.
ROLE: Never miss a client's birthday or a key meeting.

PATH: /flow/prospects  (Prospects)
WHAT IT IS: Potential clients not yet in the pipeline.
WHAT YOU CAN DO: Track prospect status.
ROLE: The top of the sales funnel before they become a "New Client."

PATH: /flow/tickets  (Tickets)
WHAT IT IS: A task/issue tracker.
WHAT YOU CAN DO: Create and manage tickets assigned to you.
ROLE: Day-to-day work items inside delivery.

PATH: /flow/messages  (Messages)
WHAT IT IS: A message/communication log.
ROLE: Keeps client comms tied to the project context.

PATH: /flow/admin/roles  (Flow Roles Admin)
WHAT IT IS: Admin screen to assign Flow roles to users.
WHO SEES IT: Super Admin.
ROLE: Controls who can do what inside THCO Flow.


==============================================================
9. FLOWFORGE — THE AI TOOL BUILDER
==============================================================
FlowForge lets a non-technical person describe a workflow in plain
English and have AI build an internal automation tool for their unit.

PATH: /:unit/build/new  (FlowForge Chat — new build)
PATH: /:unit/build/:conversationId  (resume an existing build)
  (":unit" is a placeholder for any unit slug, e.g. /talent/build/new)
WHAT IT IS: A chat where you talk to an AI to build a tool.
WHO SEES IT: Any logged-in user (inside their unit).
WHAT YOU CAN DO:
  - Type a description of the problem/workflow you want automated.
  - Optionally speak instead of type (voice recorder / Whisper).
  - The AI produces: a problem brief, a proposed solution, a workflow
    design preview, and suggested integrations (Supabase, Gmail,
    Google Calendar, Slack, Anthropic, Whisper).
  - Fill in a "Problem Brief" form to guide the build.
  - See the tool move through statuses: Building -> Ready ->
    Pending Approval -> Deployed -> Active (or Blocked / Error).
ROLE: The "empower everyone to build tools" feature. This is the
strategic differentiator of the product.

PATH: /admin/approvals  (Approval Queue)
WHAT IT IS: Where a Super Admin reviews tools FlowForge generated.
WHO SEES IT: Super Admin (badge in sidebar shows pending count).
WHAT YOU CAN DO: Approve, reject, or request changes on a built tool.
ROLE: Quality gate — nothing deploys to staff until an admin signs off.

Supporting pieces (used inside the above):
  - Deployed Tools: list of tools that passed approval and are live.
  - Problem Brief Form: structured intake so the AI understands the
    request.
  - Workflow Design Preview: a visual of the steps the tool will run.
  - Tool Execution Form / Use Tool modal: where a finished tool is
    actually run by a user. (Note: the technical PRD flags the tool
    execution UI as still partial — a key improvement target.)


==============================================================
10. CANDIDATE ASSESSMENT (HIRING)
==============================================================

PATH: /assessment  (Candidate Assessment — public)
WHAT IT IS: A timed, 39-question personality/behavioral test.
WHO SEES IT: Job candidates (no login needed).
WHAT YOU CAN DO (as a candidate):
  - Page 1: enter name + email; the system starts/resumes your test.
  - Page 2: answer 39 questions one at a time with a 100-minute
    countdown. Answers auto-save. Once answered, a question locks.
  - Page 3: final details — onsite/hybrid preference, work style,
    salary expectation, location.
ROLE: THCO's structured hiring screen. Replaces a resume-only filter
with a values/behavior read on each applicant.

PATH: /admin/assessments  (Assessment Admin — internal)
WHAT IT IS: The recruiter's view of all submitted assessments.
WHO SEES IT: Super Admin and HR users.
WHAT YOU CAN DO:
  - Table of all candidates with status (in progress / completed).
  - Open an individual assessment to read answers.
  - Export everything to JSON or CSV.
ROLE: Turns the candidate pipeline into a reviewable, exportable
dataset for hiring decisions.


==============================================================
11. ADMIN AREA
==============================================================

PATH: /admin/users  (User Management)
WHAT IT IS: The staff directory and account controls.
WHO SEES IT: Super Admin.
WHAT YOU CAN DO:
  - Create, edit, deactivate users.
  - Lock/unlock a user to a specific device.
  - Set roles (super_admin / admin / user) and which units they see.
  - See login history / audit trail.
ROLE: Security and access control for the whole portal.

PATH: /settings  (Settings)
WHAT IT IS: Global configuration, mainly integrations.
WHO SEES IT: Super Admin.
WHAT YOU CAN DO: Configure webhook URLs (e.g. the n8n automation
engine) and test them.
ROLE: Connects THCO CRM to the outside automation/services.

PATH: /admin/approvals  (see FlowForge section above).


==============================================================
12. THE PRESENTATION ENGINE (CINEMATIC DECKS)
==============================================================
This is a library of ~25 high-production slide decks used for client
pitches, brand reveals, internal alignment, and executive reports.
Each deck is a self-contained, animated presentation (keyboard/touch
navigation, slide counters).

TWO WAYS TO VIEW EACH DECK:
  - INTERNAL PREVIEW (logged in):  /proposals/preview/<slug>
    Used by staff to rehearse / review before sending.
  - PUBLIC EMAIL-GATED (shareable): /proposals/<slug>
    An outside client types their email, then watches. Their view
    is tracked (who, where, how long).

THE DECK CATALOG (name — purpose):
  1.  Procure AI (process flowcharts)        — Client pitch
  2.  Procure AI Executive Pack (V1–V4)     — Internal kick-off packs
  3.  Procure AI Scroll                      — Scroll-style pitch
  4.  Procure AI V1                         — Early client pitch
  5.  Procure AI TWG Session                — Workshop
  6.  TWG Slideshow                         — Workshop
  7.  THCO Town Hall 2026                   — Internal event
  8.  GCIO Pack                             — Executive
  9.  Sagicor Progress Dashboard             — Executive dashboard
 10.  AI for Banking (THCO)                 — Client pitch (32 slides)
 11.  Pebbles Brand Identity                — Brand (8 slides)
 12.  Procure AI EY (PMO/TQA)              — Alignment session
 13.  Procure AI Meet the Team              — Team profile
 14.  GDL x Pebbles Partnership             — Strategic
 15.  INGABO — Rise of the Thousand Hills   — Cinematic story
 16.  THE FORGE — Fire and Memory           — Cinematic story (V1 + V2)
 17.  TIDE WAR — Current Shift              — Cinematic story
 18.  Sagicor STEC Assessment               — Assessment
 19.  Realloc AI Capability Program         — Client pitch
 20.  Procure AI Delivery Team              — Team profile
 21.  AFC Cross-Border Treasury             — Client pitch
 22.  Winston Duke Brand Identity           — Cinematic brand reveal (30 slides)
      (Winston Duke is internal-only; the rest have public versions.)

HIGHLIGHT — Winston Duke Brand Reveal (/proposals/winston-duke):
  A 30-slide cinematic brand deck built around five symbols — the
  Crown (authority), Hawk (stillness), Wave (journey), Bridge
  (purpose), Interlock (duality). It reveals the logo only at slide
  25, after a countdown, then closes with annotated zones and a quote.
  This is the showcase of the presentation engine's quality bar.

ROLE OF THE WHOLE ENGINE: Differentiates THCO in pitches with
"movie-grade" decks, and lets non-designers send a client a tracked,
branded experience instead of a PDF.


==============================================================
13. IMPORTANT THINGS TO KNOW (READ BEFORE YOU "IMPROVE")
==============================================================

A. THEME MISMATCH (big one for visual work):
   The file design_guidelines.json calls for a DARK theme — deep navy
   background (#0D0F1A), purple accent (#7C64FF), DM Sans / Space
   Mono fonts, glassmorphism. BUT the actual built screens
   (Dashboard, sidebar, unit pages) are LIGHT — white background,
   gray sidebar, purple accents. Flow uses green (#1B4332); Winston
   Duke uses gold/green. So the product is currently a LIGHT app that
   does not match its own design spec. Deciding "dark vs light" is a
   foundational call before you touch visuals.

B. WHAT'S BUILT VS COMING SOON:
   - LIVE: Dashboard, Proposals, THCO Flow (full), Talent sourcing +
     database search, Candidate Assessment, Admin (users/approvals/
     settings), Presentation engine, FlowForge chat + approvals.
   - COMING SOON (present but not finished): Talent's email
     templates, interview scheduling, candidate pipeline board;
     FlowForge "My Tools" rollout + tool execution UI; forgot-
     password email delivery.

C. KNOWN WEAK SPOTS (from the technical debt list):
   - PDF download for proposals is unstable (needs a real fix).
   - A Babel plugin crashes the build unless node_modules is patched
     by hand (fragile).
   - The backend is one very large file (server.py) that should be
     split into cleaner modules.
   - A previous database migration left a workaround in place.

D. THE "MAKE IT FUNCTION" PRIORITIES (suggested order):
   1. Pick the theme direction (dark per spec, or keep light) and make
      it consistent everywhere.
   2. Fix the FlowForge tool-execution UI so built tools actually run.
   3. Stabilize PDF/proposal download.
   4. Wire up the "coming soon" Talent tools or hide them cleanly.
   5. Fix forgot-password email so recovery works end to end.
   6. Refactor the giant backend file for maintainability.


==============================================================
14. QUICK MAP — PAGE PATH -> ONE-LINE PURPOSE
==============================================================
/login                     Sign in
/register                 Create staff account
/forgot-password          Start password reset
/reset-password           Finish password reset
/dashboard                Home: unit overview cards
/proposals                Client + deck library + viewer analytics
/proposals/view/:token    Public shared proposal view
/talent                   Talent unit home (tools + AI agents)
/talent/sourcing          AI candidate sourcing tool
/talent/database-search   Internal candidate DB search
/talent/projects          Talent delivery projects
/talent/projects/new      New talent project form
/thco-hr                  HR unit home
/thco-hr/delegation       HR delegation board
/it-tools                 IT unit home
/sales /marketing /advisory /technology /operations /academy
/client-delivery          Other unit home pages
/technology/my-projects    Engineering project list
/technology/my-projects/:id/review   Project review
/technology/my-projects/:id/tracker   Project tracker
/flow                     Flow pipeline dashboard
/flow/board               Pipeline Kanban board
/flow/projects            All projects table
/flow/projects/new        New client project
/flow/projects/:id        Single project record
/flow/contacts            Client people directory
/flow/calendar            Events + birthdays calendar
/flow/prospects           Pre-client prospects
/flow/tickets             Task/issue tracker
/flow/messages            Comms log
/flow/admin/roles         Flow role assignment (admin)
/:unit/build/new          FlowForge AI tool builder (new)
/:unit/build/:id          FlowForge (resume build)
/admin/approvals          Approve generated tools
/assessment               Candidate test (public)
/admin/assessments        Assessment review + export
/admin/users              User management (admin)
/settings                 Integrations / webhooks (admin)
/proposals/preview/<slug> Internal deck preview
/proposals/<slug>         Public email-gated deck

==================================================================
END OF GUIDE
This document is meant to be read top-to-bottom once, then used as a
lookup. Every screen above exists in the code under frontend/src/pages
(or frontend/src/components for shared pieces) and is wired into
frontend/src/App.js.
==================================================================
