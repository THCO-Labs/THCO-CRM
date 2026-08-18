# THCO CRM — Project State and Handover

**Last updated:** 17 August 2026

This document exists so that work can be picked up by someone (or something)
with no prior context. It records what the system is, what has been done, what
is deliberately not done, and where the traps are.

Read this first. Then read `DEPLOYMENT.md` for hosting and
`docs/POSTGRES_MIGRATION.md` if the database question comes up.

---

## 1. What this is

An internal CRM and talent platform for THCO (The Haguet Consulting
Organization). It covers project delivery, proposals, clients, a task board, an
internal CV database, and external candidate sourcing.

| Layer | Technology |
|---|---|
| Frontend | React 19, CRA via craco, Tailwind, shadcn/ui |
| Backend | FastAPI (Python 3.12 in the container), Motor async MongoDB driver |
| Database | MongoDB — Azure Cosmos DB for MongoDB (vCore, **Free tier**) |
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

- **Project pipeline (THCO Flow)** — 10-stage board, projects, prospects,
  tickets, messages, audit log, calendar. Managers and admins only.
- **Task board** — Trello-style under `/api/tasks`. Cards carry labels,
  assignees, priority, due dates, **attachments** and a **cover picture**. The
  board refreshes every 25s while on screen, pauses when the tab is hidden, and
  never refreshes mid-drag.
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

### The production migration (in flight)

`backend/migrate_new_gmail_cvs.py` appends local CVs to production. Strictly an
add; nothing in production is updated or deleted.

Status at the time of writing: `candidates` and `resume_versions` are done.
**`resume_files` — the CV documents themselves — is still running**, at roughly
34 files/minute against Cosmos on the free tier.

The runner used for it lives outside the repo and works a **checkpointed**
100-candidate chunk at a time, so a crash or a sleeping laptop costs only the
chunk in flight. A chunk that fails three times is recorded in
`skipped_chunks` and stepped over rather than stalling the rest; those are
re-runnable afterwards by resetting `next_index`.

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

**`mailbox-import` is paused on the schedule** (18 August 2026). Flip
`MAILBOX_IMPORT_PAUSED` to `'false'` at the top of the workflow once the
`resume_files` migration has finished. Running it by hand still works —
"Run workflow" with `job=mailbox-import` ignores the pause.

**Every scheduled job must finish inside 240 seconds.** Container Apps ends any
HTTP request at that point, and the caller then sees a 504 while the job carries
on running server-side. `run_connector` therefore takes a `time_budget`
(`MAILBOX_IMPORT_SECONDS`, default 180) and stops cleanly when it expires; the
cursor makes the remainder simply the next run's work, so `status: "partial"` is
a success, not a failure. The workflow no longer retries on 504 — a retry there
started a *second concurrent import over the identical window*, which is what
produced two runs a day, every day, from 10 August.

---

## 10. Data (production, 17 August 2026)

| Collection | Rows | Note |
|---|---|---|
| `candidates` | 33,547 | Internal CV database |
| `resume_versions` | 75,856 | Every CV ever received, never overwritten |
| `resume_files` | 21,425 | **Migration in flight** — target ~70,000 |
| `users` | 30 | |
| `projects` | 15 | |
| `contacts` | 4 | Still thin — data entry, not a development task |
| `events` | 2 | Contact occasions; staff birthdays are computed, not stored |

Candidate records exceed CV files because the file migration is incomplete:
until it finishes, many candidates in production have a profile but no
openable document.

---

## 11. Known issues worth fixing

- **~288 candidate records hold raw PDF source instead of CV text**, and ~757
  carry email addresses invented from that binary (`z@j.k`). These are scanned
  or image-only CVs where both PDF readers failed. The fix is to treat that as
  a failed extraction and reject with a reason rather than store a junk record.
  Not yet done.
- **Bundles rejected before the splitter existed** are recorded and re-runnable
  but have not been re-run.
- **Skipped migration chunks** need a final pass once the main run finishes.
- **~81 mailbox messages were skipped and need re-reading**: UIDs 4485-4565,
  passed over by the runs of 14 and 17 August when every document failed with
  code 50 and the cursor advanced anyway. The cursor bug is fixed, but these
  are already behind the resume point. To recover, set the gmail cursor back
  once the migration is done and the import can actually succeed:
  `db.import_cursors.updateOne({connector:"gmail"}, {$set:{cursor:"4484"}})`.
  Re-reading is safe — an identical document is recognised by its hash.
- **`import_failures` is new and nothing reads it yet.** Documents set aside
  after three attempts land there with their error; there is no screen for them.
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
