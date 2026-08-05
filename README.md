# THCO CRM

Internal CRM and talent platform for The Haguet Consulting Organization.

The system covers project delivery, client relationships, task management and
recruitment in one place, so that work is not spread across spreadsheets,
message threads and separate tools.

---

## What it does

**Project delivery (THCO Flow)** — a ten-stage pipeline from first client
contact through to completed build, with stage ownership, approval gates and a
full audit trail of who changed what.

**Task board** — Trello-style boards with drag-and-drop cards, labels,
assignees, due dates and sharing.

**Client relationships** — client records and contacts, including birthdays and
anniversaries. Dates entered on a contact appear on the shared calendar
automatically, and the team is emailed seven days, three days and on the day
itself.

**Talent** — an internal CV database with automatic parsing (PDF, DOCX, DOC,
with OCR for scanned documents), plus external candidate sourcing through
Google Search with Nigeria-focused filtering and automatic de-duplication.

**Proposals** — client-facing proposals with shareable links that do not
require the recipient to sign in.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Motor (async MongoDB) |
| Database | MongoDB — Azure Cosmos DB for MongoDB (vCore) in production |
| Hosting | Azure Container Apps |
| Email | Resend |
| External APIs | SerpAPI, Serper, Groq, Google Gemini, Google Drive |

The backend serves both the API under `/api` and the compiled React bundle, so
the application deploys as a single container rather than two services.

---

## Running locally

**Requirements:** Python 3.10+, Node.js 18+ with Yarn 1.22, MongoDB.

```bash
# Database
docker run -d --name thco-mongo -p 27017:27017 mongo:7

# Backend
cd backend
python -m venv venv
venv/Scripts/activate          # source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
yarn install
yarn start
```

The application is then available at `http://localhost:3000`.

### Configuration

Create `backend/.env`. It is gitignored and must never be committed.

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=thco_crm
JWT_SECRET=                 # a long random string
FRONTEND_URL=http://localhost:3000

# Email (account invitations, password resets, reminders)
RESEND_API_KEY=
SENDER_EMAIL=noreply@thcohq.com

# Candidate sourcing
SERPER_KEY=
SERPAPI_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=

# CV import from Google Drive
GOOGLE_DRIVE_CV_FOLDER_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=

# Scheduled jobs, called by an external trigger
SCHEDULER_TOKEN=
```

The application starts without the optional keys; the corresponding features
are inactive rather than broken.

### First run

On an empty database the application creates one super administrator. Set
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` beforehand, or a random password
is generated and written to the startup log. Change it after the first
sign-in.

---

## Access control

Authorisation is enforced in the API, not in the interface.
`services/permissions.py` holds the rules; the frontend hides what a user
cannot use, but that is presentation only.

| Role | Scope |
|---|---|
| `super_admin` | Everything, including creating other super administrators |
| `mini_admin` | Administrative access; HR sits here. Cannot create super administrators |
| `team_member` | Only the projects they are assigned to |

Additional flags — `is_hr`, `is_executive_approver`, `is_delivery_coordinator`,
`is_delivery_owner`, `is_engineer` — grant specific responsibilities on top of
a role.

The candidate database is restricted to administrators and the Talent unit, as
it holds personal data on real people.

---

## Deployment

Pushing to `main` builds and deploys automatically. See
[DEPLOYMENT.md](DEPLOYMENT.md) for provisioning, required application settings
and the database tier decision.

Scheduled work — currently the birthday and anniversary reminders — is driven
by an external trigger rather than an in-process timer, because the container
scales to zero when idle. See `.github/workflows/scheduled-jobs.yml`.

---

## Repository layout

```
backend/
  server.py               Application entry point, auth, clients, proposals
  routers/                talent, flow, flowforge, projects, units,
                          assessments, taskboard, feedback
  services/
    permissions.py        Authorisation rules
    cv_parser.py          CV text extraction and field parsing
    talent_search.py      External candidate sourcing
    talent_normalize.py   Geography, URL canonicalisation, schema
    talent_dedup.py       Candidate de-duplication
    relationship_reminders.py   Birthday and anniversary notices
    sla_scheduler.py      In-process background jobs
  migrate_to_azure.py     Verified database migration tool

frontend/src/
  pages/                  Screens, including flow/ and talent modules
  components/             Shared UI, tasks/ board, flowforge/
  context/                Auth, theme, analytics providers
  lib/api.js              API client
```

---

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — hosting, configuration, migration
- [PROJECT_STATE.md](PROJECT_STATE.md) — current state, open work, known issues
- [docs/POSTGRES_MIGRATION.md](docs/POSTGRES_MIGRATION.md) — assessment of moving to PostgreSQL

---

Proprietary. THCO internal use only.
