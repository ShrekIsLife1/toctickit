# TokTickIT - IT Service Desk

## Description
TokTickIT est une application de gestion de tickets IT. Ce projet contient un frontend React et un backend Express avec PostgreSQL et Prisma.

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

## Lab 2 — Requester Ticketing MVP

Lab 2 adds a full Requester-facing ticketing flow behind a temporary
**Development Requester selector** (testing mechanism only, not real
authentication — real login arrives in Lab 3).

### New API endpoints
- `GET /api/requesters` — active Development Requesters
- `GET /api/related-systems` — active Related Systems
- `POST /api/tickets` — create a Ticket for the selected Requester
- `GET /api/tickets` — search/filter/sort/paginate the selected Requester's own Tickets
- `GET /api/tickets/:id` — retrieve one owned Ticket
- `POST /api/tickets/:id/attachments` — upload an Attachment
- `GET /api/tickets/:id/attachments` — list Attachment metadata
- `GET /api/attachments/:id/download` — download an active Attachment
- `DELETE /api/attachments/:id` — soft-remove an Attachment

All Ticket/Attachment endpoints require an `X-Requester-Id` header
identifying the currently selected Development Requester.

### File uploads
Uploaded attachments are stored locally under `server/uploads/` (git-ignored
except for `.gitkeep`). No cloud storage is used in Lab 2.

### Frontend routes
- `/select-requester` — Development Requester Selection screen
- `/my-tickets` — My Tickets (search, filter, sort, pagination)
- `/create-ticket` — Create Ticket
- `/tickets/:id` — Requester Ticket Detail + Attachments
- `/system-check` — Lab 1's health/categories check screen (preserved from Lab 1)

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
Responsive screenshots are written to `artifacts/lab-02/screenshots/`.

## Documentation

- `docs/lab-01/` — Lab 1 tests, AI use, and reviewer notes
- `docs/lab-02/specification.md` — Sprint 2 engineering specification
- `docs/lab-02/tests.md` — Sprint 2 test plan and results
- `docs/lab-02/ui-spec.md` — Zen Green UI specification
- `docs/lab-02/api-spec.md` — REST API contract
- `docs/lab-02/ai-use.md` — AI use and reflection
- `docs/lab-02/reviewer.md` — peer review evidence
