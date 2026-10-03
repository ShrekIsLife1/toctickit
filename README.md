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

## Testing

### Unit and API tests (backend)
```bash
cd server
npm test
```

### Unit and UI component tests (frontend)
```bash
cd client
npm test
```

### End-to-end and visual/responsive tests
Requires both servers running against a seeded database.
```bash
npx playwright install chromium   # first time only
npx playwright test               # from the repository root
```
Responsive screenshots are written to `artifacts/lab-02/screenshots/` and
`artifacts/lab-03/screenshots/`.

## Documentation

- `docs/lab-01/` — Lab 1 tests, AI use, and reviewer notes
- `docs/lab-02/` — Lab 2 specification, tests, UI spec, API spec, AI use,
  reviewer notes
- `docs/lab-03/specification.md` — Sprint 3 engineering specification
  (authentication, authorization matrix, IT Staff workflow, Administrator
  user management)
- `docs/lab-03/tests.md` — Sprint 3 test plan and results
- `docs/lab-03/ui-spec.md` — Zen Green UI specification extensions (Login,
  Change Password, Ticket Queue, extended Ticket Detail, User Management)
- `docs/lab-03/api-spec.md` — REST API contract, including the full status
  transition matrix
- `docs/lab-03/ai-use.md` — AI use and reflection
- `docs/lab-03/reviewer.md` — peer review evidence