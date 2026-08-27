# THCO Executive Portal — Product Requirements Document (PRD)

**Version:** 3.0  
**Last Updated:** February 2026  
**Document Owner:** THCO Technology & Build  
**Status:** Production  

---

## 1. EXECUTIVE SUMMARY

The THCO Executive Portal is an enterprise-grade, full-stack internal platform serving as the operational hub for THCO Holdings. It consolidates three core capabilities into a single web application:

1. **Cinematic Presentation Engine** — A library of 20+ high-fidelity, animated, single-page-application-style presentations used for client pitches, internal alignment, brand identity reveals, and executive reporting.
2. **FlowForge AI Automation Engine** — An AI-powered workflow builder that enables business units to define, build, and deploy internal automation tools through natural-language conversations.
3. **Candidate Personality Assessment Portal** — A timed, structured assessment system for evaluating prospective hires, complete with admin dashboards and data export capabilities.

The platform is designed for internal use by THCO leadership, business unit heads, and delivery teams, with selected presentations exposed publicly via email-gated access for client-facing scenarios.

---

## 2. PRODUCT VISION & GOALS

**Vision:** Provide THCO with a single platform where every business unit can access its tools, present to clients with cinematic quality, automate repetitive workflows with AI, and evaluate talent — all under one roof.

**Primary Goals:**
- Deliver world-class, animated client presentations that differentiate THCO in competitive pitches
- Enable non-technical business users to build and deploy internal automation tools via conversational AI
- Streamline candidate evaluation through structured, timed assessments with exportable data
- Provide centralized analytics, user management, and activity tracking for leadership

---

## 3. USER PERSONAS

| Persona | Role | Primary Use |
|---------|------|-------------|
| **Executive / Partner** | Joshua (Super Admin) | Dashboard overview, user management, proposal analytics, approval queue |
| **Business Unit Lead** | Heads of Sales, Marketing, Talent, etc. | Unit-specific pages, FlowForge tool creation, proposal library |
| **Client (External)** | Prospective or existing client | Views public presentations via email gate (no login required) |
| **Candidate (External)** | Job applicant | Takes the 39-question personality assessment (no login required) |
| **HR / Admin** | Internal recruiter | Reviews assessment results, exports data via admin dashboard |

---

## 4. SYSTEM ARCHITECTURE

### 4.1 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React (CRA), Tailwind CSS, Shadcn/UI, Framer Motion |
| **Backend** | Python FastAPI |
| **Database** | MongoDB (via Motor async driver) |
| **Authentication** | JWT Bearer Tokens via localStorage (migrated from cookies) |
| **AI Services** | Anthropic Claude (via Emergent LLM Key), OpenAI Whisper (via Emergent LLM Key) |
| **External Integrations** | Supabase (PostgreSQL, legacy), n8n (THCO Automation Engine) |
| **Hosting** | Emergent Platform (Kubernetes) |
| **Fonts** | Cormorant Garamond (presentations), Inter (UI) |

### 4.2 Project Structure

```
/app/
├── backend/
│   ├── server.py                    # Monolithic API (2,576 lines)
│   │   ├── Auth (register, login, logout, forgot/reset password)
│   │   ├── User Management (CRUD, device locking)
│   │   ├── Sourcing & Database Search
│   │   ├── Clients & Proposals (CRUD, sharing, viewer tracking)
│   │   ├── Analytics (page views, sessions, actions)
│   │   ├── Settings & Webhooks
│   │   ├── Activity Logs
│   │   └── Dashboard Stats
│   ├── routers/
│   │   ├── assessments.py           # Candidate assessment APIs (264 lines)
│   │   └── flowforge.py             # FlowForge AI conversation APIs
│   ├── requirements.txt
│   └── .env                         # MONGO_URL, DB_NAME, JWT_SECRET, etc.
├── frontend/
│   ├── src/
│   │   ├── App.js                   # Router (400 lines, 50+ routes)
│   │   ├── lib/
│   │   │   └── api.js               # Axios instance with Bearer token interceptor
│   │   ├── components/
│   │   │   ├── ui/                  # Shadcn components
│   │   │   └── public/
│   │   │       └── EmailGate.jsx    # Email gate for public presentations
│   │   └── pages/                   # 75+ page components
│   ├── public/
│   │   └── winston-duke/            # Static assets for brand presentation
│   │       ├── photos/              # Professional photographs
│   │       ├── inspiration/         # Symbol imagery and comparisons
│   │       └── icons/               # Logo zone annotations
│   └── .env                         # REACT_APP_BACKEND_URL
└── memory/
    └── PRD.md
```

### 4.3 Authentication Flow

**CRITICAL:** The application uses **Bearer Token authentication via localStorage** — NOT cookies.

1. User submits email/password to `POST /api/auth/login`
2. Backend validates credentials, returns `{ session_token, user }` in response body
3. Frontend saves `session_token` to `localStorage`
4. `api.js` Axios interceptor attaches `Authorization: Bearer <token>` to every request
5. `withCredentials` is set to `false` globally (required to avoid CORS conflicts with Emergent proxy)

**Credentials:**
- Super Admin: `joshua@thcohq.com` / `<redacted - see your password manager>`

---

## 5. FEATURE SPECIFICATIONS

### 5.1 Cinematic Presentation Engine

**Purpose:** Create and deliver ultra-high-fidelity, animated slide presentations that serve as client pitches, brand identity reveals, internal alignment decks, and executive dashboards.

**Architecture Pattern:** Each presentation is a standalone React component using Framer Motion for animations, with keyboard/touch navigation, slide counters, and section-based organization.

**Access Model:**
- **Authenticated (Internal):** Accessible at `/proposals/preview/<slug>` behind login
- **Public (Client-Facing):** Accessible at `/proposals/<slug>` behind an email gate (`EmailGate.jsx`)
- **Viewer Tracking:** Every public viewer's email, device, location, and engagement is logged to MongoDB

#### 5.1.1 Complete Presentation Registry

| # | Slug | Name | Slides | Type |
|---|------|------|--------|------|
| 1 | `procure-ai` | Procure AI - Process Flowcharts | Multi | Client Pitch |
| 2 | `procure-ai-scroll` | Procure AI - Scroll Version | Scroll | Client Pitch |
| 3 | `procure-ai-executive` | Executive Kick-Off Pack | Multi | Internal |
| 4 | `procure-ai-executive-v3` | Executive Pack V3 | Multi | Internal |
| 5 | `procure-ai-v1` | Procure AI V1 | Multi | Client Pitch |
| 6 | `procure-ai-twg` | Procure AI TWG Session | Multi | Workshop |
| 7 | `twg-slideshow` | TWG Slideshow | Multi | Workshop |
| 8 | `town-hall-2026` | THCO Town Hall 2026 | Multi | Internal Event |
| 9 | `gcio-pack` | GCIO Pack | Multi | Executive |
| 10 | `sagicor-progress` | Sagicor Progress Dashboard | 8 sections | Executive Dashboard |
| 11 | `ai-banking` | AI for Banking (THCO) | 32 slides | Client Pitch |
| 12 | `pebbles-brand` | Pebbles Brand Identity | 8 slides | Brand |
| 13 | `procure-ai-ey` | PMO/TQA Alignment Session | 15 slides | Alignment |
| 14 | `procure-ai-team` | Meet the Team | Multi | Team Profile |
| 15 | `gdl-pebbles` | GDL x Pebbles Partnership | Multi | Strategic |
| 16 | `ingabo` | INGABO - Rise of the Thousand Hills | Multi | Cinematic |
| 17 | `the-forge` | THE FORGE - Fire and Memory | Multi | Cinematic |
| 18 | `the-forge-v2` | THE FORGE V2 | Multi | Cinematic |
| 19 | `tide-war` | TIDE WAR - Current Shift | Multi | Cinematic |
| 20 | `sagicor-stec` | Sagicor STEC Assessment | Multi | Assessment |
| 21 | `realloc` | Realloc AI Capability Program | Multi | Client Pitch |
| 22 | `procureai-team` | Procure AI Delivery Team | Multi | Team Profile |
| 23 | `afc-treasury` | AFC Cross-Border Treasury | Multi | Client Pitch |
| 24 | `winston-duke` | **Winston Duke Brand Identity** | **30 slides** | **Cinematic Brand Reveal** |

#### 5.1.2 Winston Duke Brand Identity Presentation (Detailed Spec)

**Type:** Cinematic Brand Reveal Deck  
**Slides:** 30  
**Font:** Cormorant Garamond (serif), Inter (sans-serif)  
**Color Palette:** Gold (#C9A84C), Deep Green (#1B4332), Black, White  

**Structure:**
| Slide | Content |
|-------|---------|
| 1 | Title: "BRAND IDENTITY OF WINSTON DUKE" |
| 2 | Hero photo with introductory narrative |
| 3 | Five Symbols Overview (numbered list with descriptions) |
| 4-7 | **THE CROWN** — Authority (Quote, Story, Logo Connection, 4-Frame Visual Proof) |
| 8-12 | **THE HAWK** — Stillness (Quote, Story Part 1, Story Part 2, Logo Connection, 6-Frame Visual Proof) |
| 13-16 | **THE WAVE** — Journey (Quote, Story, Logo Connection, 4-Frame Visual Proof) |
| 17-20 | **THE BRIDGE** — Purpose (Quote, Story, Logo Connection, 4-Frame Visual Proof) |
| 21-24 | **THE INTERLOCK** — Duality (Quote, Story, Logo Connection, 4-Frame Visual Proof) |
| 25 | Countdown / Anticipation: "And now... Your Mark" |
| 26 | Logo Reveal (clean logo, full screen, black background) |
| 27 | Five Symbols, Five Zones, One Mark (annotated logos + combined overlay) |
| 28 | Closing narrative text |
| 29 | Final clean logo |
| 30 | Closing Winston Duke quote |

**Presentation Rules (9-Point Revision Applied):**
1. Title: "Brand Identity of Winston Duke"
2. Zero em dashes throughout entire deck
3. All narrative uses "you/your" (direct address to Winston Duke)
4. Section title appears on EVERY page within that section
5. Subtitle/description always paired with section title
6. No references to "W", "D", or "WD" before the logo reveal (Slide 25)
7. Visual proof sequence: Real photo → B&W → Masked in shape → Silhouette alone
8. Reveal order: Countdown → Logo → Annotated zones → Closing text → Logo again → Quote
9. All changes applied across every slide

**Visual Proof Frame Counts:**
- Crown: 4 frames (photo, B&W, masked overlay, silhouette)
- Hawk: 6 frames (full bird, head, B&W comparison, head alone, positioned, silhouette)
- Wave: 4 frames (photo, B&W, masked, silhouette)
- Bridge: 4 frames (photo, B&W comparison, masked, silhouette)
- Interlock: 4 frames (photo, B&W comparison, masked, silhouette)

**Section Order:** Crown → Hawk → Wave → Bridge → Interlock

#### 5.1.3 Email Gate System

- Public presentations require email registration before viewing
- `POST /api/proposals/viewers/register` captures: email, name, proposal_slug, IP, device, browser, location
- Viewer activity (time spent, pages viewed) tracked via `POST /api/proposals/viewers/activity`
- Viewer analytics dashboard available to admins at `/proposals` (internal)

#### 5.1.4 Viewer Analytics API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/proposals/viewers/register` | POST | Register viewer email for a proposal |
| `/api/proposals/viewers/activity` | POST | Update viewer engagement metrics |
| `/api/proposals/viewers/check/{slug}/{email}` | GET | Check if viewer has access |
| `/api/proposals/viewers` | GET | List all viewers (admin, filterable) |
| `/api/proposals/viewers/stats` | GET | Aggregate viewer statistics |

---

### 5.2 FlowForge AI Automation Engine

**Purpose:** Enable business unit teams to create, test, and deploy internal automation tools through an AI-powered conversational interface.

**How It Works:**
1. User navigates to their business unit page (e.g., `/sales`, `/talent`)
2. Clicks "Build New Tool" → enters FlowForge Chat (`/:unit/build/new`)
3. Describes the problem/workflow in natural language
4. AI (Anthropic Claude) generates a problem brief, proposes a solution, and builds the tool
5. Built tools appear in the "My Tools" tab of each business unit
6. Admin approval queue at `/admin/approvals`

**Key Components:**
- `FlowForgeChat.jsx` — Conversational AI interface for tool building
- `flowforge.py` (backend router) — Manages conversations, tool generation, n8n integration
- n8n — Executes the generated workflows

**Status:** Core conversation flow functional. Tool execution UI and "My Tools" rollout to all 11 units pending.

---

### 5.3 Candidate Personality Assessment Portal

**Purpose:** A structured, timed assessment for evaluating job candidates, accessible without authentication.

**Assessment Flow (3 Pages):**

| Page | Content |
|------|---------|
| **Page 1 — Info** | Name + Email entry. Creates or resumes assessment via `POST /api/assessments/start` |
| **Page 2 — Questions** | 39 personality/behavioral questions displayed sequentially. 100-minute countdown timer (sticky). Answers auto-save via `PUT /api/assessments/{id}/save`. Once answered, questions are **locked** (cannot be changed). All 39 must be answered before proceeding. |
| **Page 3 — Final Details** | Onsite/hybrid preference, work preference, salary expectation, location (city/state/country). Submits via `POST /api/assessments/{id}/final` |

**Assessment API:**

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/assessments/start` | POST | None | Create or resume assessment |
| `/api/assessments/{id}/save` | PUT | None | Auto-save answers (debounced) |
| `/api/assessments/{id}/final` | POST | None | Submit final details and complete |
| `/api/assessments/admin` | GET | Bearer | List all assessments (admin) |
| `/api/assessments/admin/export` | GET | Bearer | Export as JSON or CSV |

**Database Schema — `assessments` collection:**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string (lowercase)",
  "answers": { "q1": "answer", "q2": "answer", ... "q39": "answer" },
  "onsite_hybrid": "string",
  "work_preference": "string",
  "salary_expectation": "string",
  "location_city": "string",
  "location_state": "string",
  "location_country": "string",
  "timer_started_at": "ISO datetime",
  "time_remaining_seconds": 6000,
  "total_time_taken_seconds": 0,
  "status": "in_progress | completed",
  "started_at": "ISO datetime",
  "completed_at": "ISO datetime | null",
  "last_saved_at": "ISO datetime"
}
```

**Admin Dashboard (`/admin/assessments`):**
- Table view of all submitted assessments
- Filter by status (in_progress, completed)
- Export to JSON or CSV
- View individual assessment details

---

### 5.4 Portal Core Features

#### 5.4.1 Dashboard (`/dashboard`)
- Overview statistics (users, proposals, activity)
- Recent activity feed
- Quick links to business units

#### 5.4.2 User Management
- CRUD operations for users
- Device locking/unlocking
- Role-based access (super_admin, admin, user)
- Login records and audit trail

#### 5.4.3 Business Unit Pages (11 Units)

| Route | Unit |
|-------|------|
| `/sales` | Sales & Business Development |
| `/marketing` | Marketing & Brand |
| `/talent` | Talent Unit |
| `/advisory` | Advisory & Consulting |
| `/technology` | Technology & Build |
| `/operations` | Operations & Finance |
| `/academy` | Academy & Learning |
| `/client-delivery` | Client Delivery |
| `/thco-hr` | THCO HR |
| `/project-management` | Project Management |
| `/it-tools` | IT & Tools |

Each unit page provides:
- Unit overview and key metrics
- Quick actions specific to the unit
- FlowForge "Build New Tool" entry point
- (Pending) "My Tools" tab showing unit-specific automation tools

#### 5.4.4 Talent Tools
- **Sourcing Tool** (`/talent/sourcing`) — Create and manage sourcing requests
- **Database Search** (`/talent/database-search`) — Search candidate databases

#### 5.4.5 Client & Proposal Management
- Client CRUD (`/api/clients`)
- Proposal upload with file storage
- Shareable proposal links with token-based access
- Download tracking

#### 5.4.6 Analytics System
- Page view tracking
- User action tracking
- Session management (start, heartbeat, end)
- Summary dashboard with time-range filters
- Per-user analytics

#### 5.4.7 Settings
- Webhook configuration (n8n integration)
- Webhook testing

---

## 6. API REFERENCE

### 6.1 Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | None | Register new user |
| `/api/auth/login` | POST | None | Login, returns Bearer token |
| `/api/auth/session` | POST | Cookie | Exchange session (legacy) |
| `/api/auth/me` | GET | Bearer | Get current user |
| `/api/auth/logout` | POST | Bearer | Logout |
| `/api/auth/forgot-password` | POST | None | Initiate password reset |
| `/api/auth/reset-password` | POST | None | Complete password reset |

### 6.2 Users

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users` | GET | Bearer | List all users |
| `/api/users` | POST | Bearer | Create user |
| `/api/users/{id}` | PUT | Bearer | Update user |
| `/api/users/{id}` | DELETE | Bearer | Delete user |
| `/api/users/{id}/lock-device` | POST | Bearer | Lock user to device |
| `/api/users/{id}/unlock-device` | POST | Bearer | Unlock device |

### 6.3 Clients & Proposals

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/clients` | GET/POST | Bearer | List/create clients |
| `/api/clients/{id}` | PUT/DELETE | Bearer | Update/delete client |
| `/api/clients/{id}/proposals` | GET/POST | Bearer | Client proposals |
| `/api/proposals` | GET | Bearer | All proposals |
| `/api/proposals/{id}` | DELETE | Bearer | Delete proposal |
| `/api/proposals/{id}/regenerate-link` | POST | Bearer | New share link |
| `/api/proposals/shared/{token}` | GET | None | View shared proposal |
| `/api/proposals/shared/{token}/download` | GET | None | Download proposal |

### 6.4 Analytics

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analytics/page-view` | POST | Bearer | Track page view |
| `/api/analytics/action` | POST | Bearer | Track user action |
| `/api/analytics/heartbeat` | POST | Bearer | Session heartbeat |
| `/api/analytics/session/start` | POST | Bearer | Start session |
| `/api/analytics/session/end` | POST | Bearer | End session |
| `/api/analytics/summary` | GET | Bearer | Analytics summary |
| `/api/analytics/users` | GET | Bearer | User analytics |
| `/api/analytics/sessions` | GET | Bearer | Session history |
| `/api/analytics/page-views` | GET | Bearer | Page view data |
| `/api/analytics/actions` | GET | Bearer | Action analytics |
| `/api/analytics/user/{id}` | GET | Bearer | Single user analytics |

### 6.5 Other

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/dashboard/stats` | GET | Bearer | Dashboard statistics |
| `/api/activity-logs` | GET | Bearer | Activity audit log |
| `/api/login-records` | GET | Bearer | Login audit log |
| `/api/settings/webhooks` | GET/PUT | Bearer | Webhook config |
| `/api/sourcing-requests` | GET/POST | Bearer | Talent sourcing |
| `/api/database-searches` | GET/POST | Bearer | Database search |
| `/api/health` | GET | None | Health check |

---

## 7. DATABASE SCHEMA

**Database:** MongoDB  
**Key Collections:**

| Collection | Purpose |
|------------|---------|
| `users` | User accounts, roles, device info |
| `sessions` | Active user sessions |
| `login_records` | Login audit trail |
| `activity_logs` | All user actions |
| `clients` | Client organizations |
| `proposals` | Uploaded proposal documents |
| `proposal_viewers` | Email-gated viewer tracking |
| `assessments` | Candidate assessment responses |
| `flowforge_conversations` | AI conversation history |
| `flowforge_tools` | Generated automation tools |
| `page_views` | Analytics - page views |
| `user_actions` | Analytics - user actions |
| `analytics_sessions` | Analytics - session data |
| `sourcing_requests` | Talent sourcing requests |
| `database_searches` | Database search queries |
| `webhook_config` | n8n webhook URLs |

---

## 8. KNOWN ISSUES & TECHNICAL DEBT

| # | Issue | Priority | Status | Description |
|---|-------|----------|--------|-------------|
| 1 | PDF Download | P2 | Open | Client-side PDF generation for proposals is unstable. Previous workaround used server-side Playwright. Needs a robust permanent solution. |
| 2 | Babel Plugin Patch | P3 | Open | `@babel/plugin-proposal-decorators` crashes on build. Fixed by patching `node_modules` directly (fragile). Needs `patch-package` or dependency upgrade. |
| 3 | Database Migration | P3 | Open | `form_url` column addition failed in a previous session. Workaround in place. |
| 4 | Monolithic server.py | P3 | Open | 2,576-line backend file. Should be refactored into modular route files (like `assessments.py`). |

---

## 9. ROADMAP

### In Progress
- None (standby for live demo support)

### Upcoming (P1)
- Implement UI to display FlowForge tool execution results
- Roll out "My Tools" tab to all 11 business unit pages

### Next (P2)
- Stable PDF download for all proposals
- FlowForge Phase 5: Polish & White-Label
- FlowForge Phase 6: Rollout & Monitoring
- Progressive enhancements for FlowForge problem brief form

### Backlog (P3)
- Refactor `server.py` into modular routers
- Implement "Forgot Password" email delivery
- Permanent Babel plugin fix
- Database migration cleanup

---

## 10. SECURITY CONSIDERATIONS

- All API endpoints (except public ones) require Bearer token authentication
- JWT tokens with expiration
- Device fingerprinting and locking capability
- IP-based geolocation tracking for viewer analytics
- Password hashing (bcrypt)
- CORS configured for production domain
- No credentials stored in source code (all via environment variables)

---

## 11. DEPLOYMENT

- **Platform:** Emergent (Kubernetes)
- **Frontend:** React dev server on port 3000 (proxied via nginx)
- **Backend:** FastAPI/Uvicorn on port 8001 (proxied via nginx, prefixed with `/api`)
- **Database:** MongoDB (local instance in container)
- **Process Manager:** Supervisor (manages frontend, backend, mongodb, nginx)
- **Hot Reload:** Enabled for both frontend and backend

---

*End of Document*
