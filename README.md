# THCO CRM

Internal CRM & Talent Intelligence Platform for The Haguet Consulting Organization.

## Overview

THCO CRM is a full-stack application that manages projects, proposals, talent sourcing, candidate databases, and business unit operations. It integrates AI-powered candidate discovery with a growing internal CV database.

## Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Tailwind CSS, shadcn/ui, Framer Motion |
| **Backend** | FastAPI (Python), Uvicorn |
| **Database** | MongoDB (Motor async driver) |
| **Authentication** | JWT + bcrypt |
| **External APIs** | SerpAPI, Serper (Google Search), Groq (Llama), Google Gemini, Google Drive API |

## Modules

### Project Management (THCO Flow)
- 10-stage Kanban pipeline (New Client → Completed)
- Automatic project splitting (Proposal + Build tracks)
- Role-based assignment (Delivery Coordinator, Engineer, Executive Approver)
- Email notifications on stage transitions
- SLA scheduler with deadline reminders

### Talent & Human Capital

| Module | Purpose |
|--------|---------|
| **External Sourcing** | Live candidate discovery via Google Search (SerpAPI/Serper). Nigerian-filtered LinkedIn search. Saves to Talent Network. |
| **Talent Network** | External candidate database. Search by skills, occupation, location. Enrich, refresh, import to internal DB. |
| **Find Candidates** | Unified search across internal CV database + external Talent Network. AI-powered JD analysis and candidate scoring. |
| **Internal CV Database** | Uploaded CVs, Google Drive imports. Full-text search, skill extraction, status tracking. |
| **CV Upload** | Drag-and-drop CV upload with auto-parsing (PDF, DOCX, DOC). Google Drive folder import with OCR fallback. |
| **Candidate Assessments** | 39-question psychological assessment wizard with timer, auto-save, and export. |

### Business Units
Dedicated pages for: Talent & HR, Sales & BD, Marketing, Advisory & Consulting, Technology & Build, Operations & Finance, Academy & Learning, Client Delivery, IT Tools.

### Proposals
Client proposal management with share tokens, file uploads, and bundled seed proposals.

### FlowForge
AI-powered workflow automation builder with conversation-based design and n8n deployment.

## Getting Started

### Prerequisites
- Node.js 18+ (Yarn 1.22)
- Python 3.10+
- MongoDB (local or Docker)
- Google Drive API (for CV import)
- Serper API key (2,500 free searches/month)

### Installation

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend
yarn install
yarn start

# MongoDB (Docker)
docker run -d --name thco-mongo -p 27017:27017 mongo:7
```

### Environment Variables (`backend/.env`)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=thco_crm
JWT_SECRET=thco-super-secret-key-2024
RESEND_API_KEY=
SENDER_EMAIL=onboarding@resend.dev
SERPAPI_KEY=
SERPER_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
GOOGLE_DRIVE_CV_FOLDER_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

### Default Login
- **Email:** joshua@thcohq.com
- **Password:** THCOAdmin2024!

## Key Features

### Candidate Database
- CV parsing: PDF (pdfplumber, pypdf, Tesseract OCR), DOCX (python-docx), DOC (olefile + raw text)
- 200+ skill detection with normalization
- Name, email, phone, LinkedIn, experience years extraction
- MongoDB `$text` index for sub-second search across 500K+ CVs
- Google Drive integration with service account authentication

### External Candidate Sourcing
- Provider chain: SerpAPI → Serper → DuckDuckGo
- Nigerian-only filtering (Lagos, Abuja, Port Harcourt, etc.)
- Boolean search pack generation (LinkedIn, Google X-Ray, GitHub)
- Automatic deduplication (LinkedIn URL, email, phone, name+company)
- Occupation extraction from LinkedIn titles

### Talent Intelligence Network
- Permanent external candidate storage (separate from internal DB)
- Candidate enrichment: skills, seniority, industries, strengths, recommended roles
- Profile refresh queue (30-day stale detection)
- Search analytics with credit tracking
- Hover preview and click detail modal

### Collections
| Collection | Purpose |
|-----------|---------|
| `candidates` | Internal CV database |
| `external_candidates` | Talent Network (external) |
| `candidate_sources` | LinkedIn, GitHub, portfolio URLs |
| `candidate_search_history` | Search cache (24hr TTL) + analytics |
| `candidate_refresh_queue` | Stale profile refresh queue |
| `candidate_activity` | Activity timeline per candidate |

## Project Structure

```
├── backend/
│   ├── server.py              # Main FastAPI server
│   ├── routers/
│   │   ├── talent.py          # Talent/Candidate API
│   │   ├── flow.py            # THCO Flow pipeline
│   │   ├── flowforge.py       # FlowForge automation
│   │   ├── assessments.py     # Candidate assessments
│   │   ├── projects.py        # Project delivery
│   │   ├── units.py           # Business units
│   │   └── feedback.py        # IT support
│   ├── services/
│   │   ├── cv_parser.py       # CV/resume parsing
│   │   ├── talent_search.py   # External sourcing engine
│   │   ├── talent_enrichment.py # Candidate intelligence
│   │   ├── talent_dedup.py    # Deduplication
│   │   ├── talent_cache.py    # Search cache & refresh
│   │   └── google_drive.py    # Google Drive integration
│   ├── import_fast.py         # Parallel CV import script
│   └── tests/                 # Backend test suite
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── TalentUnit.jsx
│       │   ├── CandidateDatabase.jsx
│       │   ├── CVUpload.jsx
│       │   ├── FindCandidates.jsx
│       │   ├── ExternalSourcing.jsx
│       │   └── TalentNetwork.jsx
│       ├── lib/
│       │   └── api.js          # Frontend API layer
│       └── components/
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

## License

Proprietary — THCO Internal Use Only
