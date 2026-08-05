# THCO CRM — Project State and Handover

**Last updated:** 5 August 2026

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

---

## 2. How to run it locally

```bash
# Backend  (venv already exists at backend/venv)
cd backend
./venv/Scripts/python.exe -m uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
yarn start        # http://localhost:3000
```

Local MongoDB runs in Docker on `localhost:27017`, database `thco_crm`.

Configuration lives in `backend/.env` (gitignored). It holds `MONGO_URL`,
`DB_NAME`, `JWT_SECRET`, `RESEND_API_KEY`, `SENDER_EMAIL`, `FRONTEND_URL`,
`SCHEDULER_TOKEN`, the sourcing API keys and the Google service account JSON.

**Local and production use separate databases.** Data created in one does not
appear in the other.

---

## 3. Accounts

| Who | Email | Role | Notes |
|---|---|---|---|
| Joshua (CEO) | `joshua@thcohq.com` | `super_admin` | Full access |
| Victoria (HR) | `hr@thcohqs.com` | `mini_admin` + `is_hr` | Manages staff, cannot create super admins |
| Victor | `victor@thcohqs.com` | `team_member` | Ordinary staff, `technology` unit only |

Note the two domains are both real and distinct: `thcohq.com` is Google
Workspace, `thcohqs.com` is Zoho. Not a typo.

Passwords were set at creation and should be changed by the holders.

---

## 4. Authorisation model — read before touching any endpoint

`backend/services/permissions.py` is the single source of truth. Rules are
enforced **server-side**. The frontend also hides what a user cannot use, but
that is presentation only.

This matters because it was previously wrong: the sidebar hid the admin
section from staff while the API served anything to anyone logged in. A staff
account could read all 1,305 CVs by typing the URL.

Roles: `super_admin`, `mini_admin`, `team_member`. Flags layered on top:
`is_hr`, `is_executive_approver`, `is_delivery_coordinator`,
`is_delivery_owner`, `is_engineer`.

| Resource | Who |
|---|---|
| Candidate database | Admins and the Talent unit (`require_talent_access` in `routers/talent.py`) |
| Client records | Admins, delivery roles, sales/advisory/client-delivery units |
| User management | Admins (`can_manage_users`) |
| Login records | Super admin only |
| Projects | Filtered by `project_scope_filter` — staff see only projects they are attached to |

`project_scope_filter` matches across several fields (`assigned_to`,
`team_members`, `owner_id`, `created_by`, …) because project membership is
recorded inconsistently across the codebase — sometimes a user id, sometimes a
name, sometimes an email. Do not assume one field.

---

## 5. Current state of the main features

### Working

- **Project pipeline (THCO Flow)** — 10-stage board, projects, prospects,
  tickets, messages, audit log.
- **Task board** — Trello-style, 15 API routes under `/api/tasks`, 17 frontend
  components in `components/tasks/`. Built by a colleague; do not break it.
- **Internal CV database** — 1,305 candidates. Upload, parse (PDF/DOCX/DOC,
  OCR fallback), search.
- **External sourcing** — SerpAPI and Serper, Nigeria-only filtering, 492
  candidates stored. Both keys live and verified.
- **Auth** — login, invitations by email, password reset. All working.
- **Client contacts** — full model including birthday, work anniversary,
  spouse birthday, children, preferences, relationship strength.
- **Calendar** — `/flow/calendar`. Birthdays entered on a contact appear
  automatically.
- **Relationship reminders** — 7 days, 3 days and on the day, by email to HR,
  the executive, and the delivery owner of that client's active project.

### Deliberately not done

- **Gmail CV ingestion.** Blocked, see section 7.
- **Client profile fields on the `clients` collection.** Relationship data
  lives on `contacts`, not `clients`. `clients` is thin (company + contact) and
  that is fine — do not duplicate.
- **RBAC beyond what section 4 describes.** No Project Manager role yet.
- **Analytics dashboard, semantic search, embeddings, document versioning.**
  These appear in a requirements document circulated internally. They are a
  roadmap, not committed work.

---

## 6. Deployment

Every push to `main` deploys to production automatically.

- Build and deploy: `.github/workflows/azure-deploy.yml`
- Manual fallback: `bash scripts/redeploy.sh`
- Typical deploy: **90–250 seconds** (BuildKit layers cached in the registry)

Secrets on the Container App: `mongo-url`, `jwt-secret`, `serper-key`,
`serpapi-key`, `groq-key`, `resend-key`, `scheduler-token`.

GitHub repository secrets: `AZURE_CREDENTIALS`, `ACR_NAME`,
`AZURE_RESOURCE_GROUP`, `AZURE_CONTAINERAPP_NAME`, `APP_BASE_URL`,
`SCHEDULER_TOKEN`.

Azure resources all sit in resource group `rg-thco-crm`. Registry is
`thcocrmacr13661`. Running cost is roughly **$5/month** — the database is on
the free tier and Container Apps scales to zero.

**Do not touch `rg-thco-recruit-flow`.** That is a different project
(`recruit-flow`, PostgreSQL-based) belonging to the same company. It was
explicitly ruled off-limits.

---

## 7. Blocked work

**Gmail CV ingestion.** The goal is to pull CVs from `projects@thcohq.com`
into the internal candidate database automatically.

Blocked on Google Workspace domain-wide delegation, which only a super admin
can enable:

- Console: `admin.google.com` → Security → API controls → Manage Domain Wide Delegation
- Client ID: `112382012606172427911`
- Scope: `https://www.googleapis.com/auth/gmail.readonly`

Verified not yet enabled — the service account returns `unauthorized_client`.

Nothing has been built for this yet. When it is unblocked, the shape agreed
was: a connector interface (so Outlook/Drive/portal can follow), candidate
identity resolution before insert, and resume versioning so nothing is
overwritten. The parser currently extracts name, email, phone, LinkedIn,
skills and years — but **not** education, employment history or
certifications, which identity matching would want.

---

## 8. Traps and gotchas

Things that have already cost time. Do not rediscover them.

- **`az acr build` exits non-zero on Windows even when the build succeeded** —
  its log streamer fails to encode a character craco prints. Check
  `az acr task list-runs`, not the exit code.
- **Cosmos DB rejects a text index that includes `raw_text`** (50KB CV bodies).
  `ensure_indexes` tries the full index, then a reduced one without it. Each
  index is created independently; one shared try/except previously meant a
  single failure skipped every index after it.
- **Cosmos connection strings are `mongodb+srv://`** and need SRV DNS lookups.
  Some local networks time out on those; resolve the SRV record manually and
  use a direct `mongodb://host:10260` string if so.
- **`FRONTEND_URL` must be set** or invitation emails link to the wrong port.
  The reset link and the invite link previously disagreed (3000 vs 5178).
- **Resend sends from `noreply@thcohq.com`.** The domain is already verified.
  Do not revert to `onboarding@resend.dev` — that is a sandbox sender which can
  only reach the Resend account owner.
- **The frontend build context is ~268MB** of images and video in
  `frontend/public`. It is copied as a separate Docker layer from `src` so a
  code change does not invalidate it.
- **Binary assets are real files in git, not Git LFS pointers.** An earlier
  repo used LFS; that was deliberately dropped because CI clones without
  `lfs: true` would ship broken images.
- **Container Apps scales to zero.** Anything time-based must be driven
  externally — see section 9. The first request after idle takes ~20 seconds.

---

## 9. Scheduled work

Relationship reminders are **not** run by the in-process scheduler, because
the container may be asleep at the scheduled hour.

`.github/workflows/scheduled-jobs.yml` runs a GitHub Actions cron at 06:00 UTC
daily and calls:

```
POST /api/internal/run-scheduled-job?job=relationship-reminders
Header: X-Scheduler-Token: <SCHEDULER_TOKEN>
```

That both wakes the container and runs the sweep. The endpoint returns 404
(not 401) on a bad or missing token and is excluded from the OpenAPI schema.

Sends are deduplicated per contact, occasion, lead time and year in the
`reminders_sent` collection, so a late or repeated run cannot resend.

The APScheduler jobs that remain in-process (`sla_sweep`, `standup_sweep`,
`flow_eod`) have the same cold-start weakness and should probably move the
same way.

---

## 10. Data

| Collection | Rows | Note |
|---|---|---|
| `candidates` | 1,305 | Internal CV database |
| `external_candidates` | 492 | Sourced via SerpAPI/Serper |
| `contacts` | 1 | **Nearly empty — this is the real gap** |
| `events` | 1 | Generated from contact birthdays |
| `users` | 4 | |
| `clients` | 1 | |

The calendar looks empty because almost no contacts have been entered. That is
data entry for HR, not a development task. Do not rebuild the feature.

A verified migration script exists at `backend/migrate_to_azure.py`. It never
deletes from the source, upserts on natural keys so re-runs do not duplicate,
and checksums every collection afterwards.

---

## 11. Known issues worth fixing

- Reminders notify HR and the CEO for **every** contact. Fine at one contact,
  noisy at fifty. A weekly digest for the executive would be better.
- `cookies.txt` is committed to the repo and contains an expired session token.
  It should be removed from tracking.
- The README publishes the default admin password.
- `GOOGLE_SERVICE_ACCOUNT_JSON` spans multiple lines in `.env`, which
  python-dotenv warns about on every load. It currently parses, but it is
  fragile.
- No automated test suite is being run. There are test files under
  `backend/tests` and `tests/` of unknown currency.

---

## 12. Working agreement

The person directing this work prefers:

- Findings verified against the real system, not assumed. Measure, then report.
- Being told plainly when something is already built, blocked, or a bad idea.
- Corrections stated directly when an earlier claim turns out wrong.
- Nothing pushed to production without approval — pushing deploys immediately.
- Secrets never printed into the conversation; read them from `.env` instead.
