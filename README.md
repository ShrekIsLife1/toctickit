# TokTickIT - IT Service Desk

## Description
TokTickIT is an IT ticket management application. This project contains a React frontend and an Express backend with PostgreSQL and Prisma.

## Setup & Installation

### Prerequisites
- Node.js (v20+)
- PostgreSQL

### Installation
1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```
2. Setup environment variables:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
   Set `SESSION_SECRET` in `server/.env` to any local development string.
3. Run Database Migrations & Seed:
   ```bash
   cd server
   npx prisma migrate dev
   npm run prisma:seed
   ```
4. Start Servers:
   - Backend: `npm run dev --prefix server` (http://localhost:3000)
   - Frontend: `npm run dev --prefix client` (http://localhost:5173)

## Lab 1 — Full-Stack Hello World

- `GET /api/health` — backend health check
- `GET /api/categories` — seeded IT request categories
- Frontend "Check System" screen at `/system-check`

## Lab 2 — Requester Ticketing MVP

Lab 2 added a full Requester-facing ticketing flow, originally behind a
temporary Development Requester selector. **That selector was removed in
Lab 3** and replaced by real authentication (see below) — all Lab 2
Requester functionality now runs under the authenticated user's identity.

- Create Ticket, My Tickets (search/filter/sort/pagination), Requester
  Ticket Detail
- Attachment lifecycle: upload, download, soft removal
- Zen Green UI theme

## Lab 3 — Users, Roles, IT Staff Ticketing, and Admin Screens

Lab 3 replaces the Development Requester selector with real authentication
and role-based authorization across three roles: **Requester**, **IT
Staff**, and **Administrator**.

### Local development credentials
All seeded accounts share the same local-development-only password:
```
ChangeMe123!
```
Seeded accounts (see `server/prisma/seed.ts` for the full list):
- Requesters: `jennifer.anderson@example.com`, `michael.brown@example.com`, etc.
- IT Staff: `kevin.patel@example.com`, `lisa.martinez@example.com`, etc.
- Administrator: `admin@example.com`

These credentials are for local development only and must never be reused
for a real deployment.

### New API endpoints
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`,
  `POST /api/auth/change-password` — session-cookie authentication
  (httpOnly, `SameSite=Lax`)
- `POST /api/tickets/:id/comments`, `GET /api/tickets/:id/comments` —
  Public Comments (Requester/IT Staff/Admin) and Internal Notes (IT
  Staff/Admin only)
- `POST /api/tickets/:id/resolve-indication` — Requester "problem appears
  resolved" indicator (does not change formal ticket status)
- `GET /api/staff/tickets`, `GET /api/staff/tickets/:id` — IT Staff Ticket
  Queue (not ownership-scoped)
- `POST /api/staff/tickets/:id/claim` — claim/reassign ticket ownership
- `PATCH /api/staff/tickets/:id` — update IT Priority and Current Status
  (validated against a fixed transition matrix, see
  `docs/lab-03/api-spec.md`)
- `GET/POST/PATCH /api/admin/users`, `POST /api/admin/users/:id/reset-password`
  — Administrator user management

All Lab 2 Ticket/Attachment endpoints are unchanged in shape but now
require an authenticated session instead of the removed `X-Requester-Id`
header.

### Frontend routes
- `/login` — Login screen
- `/change-password` — mandatory first-login password change
- `/my-tickets`, `/create-ticket`, `/tickets/:id` — Requester screens
  (Requester role only)
- `/staff/queue`, `/staff/tickets/:id` — IT Staff Ticket Queue and Detail
  (IT Staff / Administrator only)
- `/admin/users` — Administrator User Management (Administrator only)
- `/forbidden` — shown when an authenticated user's role does not permit
  a route they reached

## Lab 4 — Actions Taken, Dashboards, and Final Regression

Lab 4 completes the full TokTickIT service desk workflow:
- **Actions Taken:** IT Staff and Administrators record work performed on tickets (`ActionTaken` model) with date/time, description, outcome, follow-up flags, and attachment notes.
- **Workflow & Resolution Gate (BR-14):** Formal status transitions enforced by the backend. Moving to `RESOLVED` requires an assigned ticket owner and at least one recorded Action Taken.
- **Requester Advisory:** Requesters can mark `problemAppearsResolved` without directly altering ticket status.
- **Optimistic Concurrency (BR-16, BR-17):** Ticket and Action Taken updates require `expectedVersion` to prevent silent overwrite races (returns 409 `STALE_UPDATE`).
- **Role Dashboards:**
  - Requester Dashboard (`/dashboard`) summarizing personal active, waiting, and resolved tickets with drill-downs.
  - IT Staff Dashboard (`/staff/dashboard`) showing operational queue metrics, urgent tickets, and priority breakdown.
  - Administrator Dashboard extending IT Staff metrics with user account statistics.
- **Hardening & Accessibility:** WCAG AA visible focus indicators (`:focus-visible`), aria landmarks, responsive layouts across desktop, tablet, and mobile, and full regression test suite.

### New API Endpoints (Lab 4)
- `GET /api/tickets/:id/actions-taken` — list Actions Taken (ordered chronologically)
- `POST /api/tickets/:id/actions-taken` — record a new Action Taken (IT Staff/Admin only, supports `Idempotency-Key` and `expectedVersion`)
- `PATCH /api/tickets/:id/actions-taken/:actionId` — edit an Action Taken (`expectedVersion` required)
- `POST /api/tickets/:id/resolve-indication` — Requester advisory resolution mark
- `GET /api/dashboard/requester` — Requester dashboard metrics and recent tickets
- `GET /api/dashboard/staff` — IT Staff dashboard queue metrics (includes `userCounts` for Admins)

### Frontend routes (Lab 4 additions)
- `/dashboard` — Requester role dashboard
- `/staff/dashboard` — IT Staff / Administrator role dashboard
- Ticket Detail screens now embed `ActionsTakenSection` (read-only for Requesters, full create/edit with conflict recovery for IT Staff)

### Database Migration & Rollback Strategy
The Lab 4 migration is strictly additive and preserves 100% of existing data:
- Adds `ActionTaken` model with foreign keys to `Ticket` and `User`.
- Adds `version` integer (default 1) and `statusChangedAt` timestamp to `Ticket`.
- Adds compound indexes for dashboard query performance (`[currentStatus, ticketOwnerId]`, `[requesterId, currentStatus]`).
- Seed script (`server/prisma/seed.ts`) is idempotent and safely re-runnable:
  ```bash
  npm run prisma:seed --prefix server
  ```
- **Disaster Recovery / Rollback:**
  In case of an operational rollback, previous Lab 3 queries remain fully functional because the migration only added nullable or defaulted fields. To restore from backup:
  ```bash
  psql "$DATABASE_URL" < backup.sql
  npx prisma generate --schema=server/prisma/schema.prisma
  ```

## Testing

### Unit and API tests (backend)
Runs all 19 test suites (127 tests) across Labs 1 to 4:
```bash
cd server
npm test
```

### Unit and UI component tests (frontend)
Runs all 13 component test suites (67 tests) across Labs 1 to 4:
```bash
cd client
npm test
```

### End-to-end and visual/responsive tests
Requires both servers running against a seeded database:
```bash
# Terminal 1: backend server
npm run dev --prefix server

# Terminal 2: frontend dev server
npm run dev --prefix client

# Terminal 3: run Playwright E2E and visual tests
npx playwright test
```
Responsive screenshots are written to `artifacts/lab-02/screenshots/`, `artifacts/lab-03/screenshots/`, and `artifacts/lab-04/screenshots/`.

## Documentation

- `docs/lab-01/` — Lab 1 tests, AI use, and reviewer notes
- `docs/lab-02/` — Lab 2 specification, tests, UI spec, API spec, AI use, reviewer notes
- `docs/lab-03/` — Lab 3 specification, tests, UI spec, API spec, AI use, reviewer notes
- `docs/lab-04/specification.md` — Sprint 4 engineering specification (Actions Taken, resolution gate, concurrency, role dashboards)
- `docs/lab-04/tests.md` — Sprint 4 test plan, traceability matrix, and execution record
- `docs/lab-04/ui-spec.md` — Zen Green UI specification extensions (Actions Taken section, Requester & Staff dashboards)
- `docs/lab-04/api-spec.md` — REST API contract (Actions Taken, dashboards, resolution gate, status matrix)
- `docs/lab-04/ai-use.md` — Sprint 4 AI use log, key prompts, and engineering reflection
- `docs/lab-04/reviewer.md` — Sprint 4 peer review record (Issues 20 to 27)