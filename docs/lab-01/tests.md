# Lab 1 — Automated Tests

All test files are located under `tests/lab-01/` in both the `server` and `client`
projects.

| Test ID | File | Tool | Description |
|---|---|---|---|
| API-01 | `server/tests/lab-01/health.test.ts` | Supertest | `GET /api/health` returns HTTP 200 with `{ status: "ok", service: "TokTickIT API" }` |
| API-02 | `server/tests/lab-01/categories.test.ts` | Supertest | `GET /api/categories` returns HTTP 200 with the four seeded categories, in id order |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest | The `TokTickIT` heading renders on the page |
| UI-02 | `client/tests/lab-01/App.test.tsx` | Vitest | Clicking "Check System" shows a loading state, then displays "Online" and the seeded category list on success |
| UI-03 | `client/tests/lab-01/App.test.tsx` | Vitest | Clicking "Check System" shows a loading state, then displays an "Offline" message with a useful error when the API call fails |

## How to Run

**Backend tests** (requires PostgreSQL running, migrated, and seeded):
```bash
cd server
npm test
```

**Frontend tests** (UI tests use mocked API calls, no backend required):
```bash
cd client
npm test
```

## Test Evidence

All evidence below was captured on the `main` branch, after `lab1-staging` was
merged into `main`.

### Backend — `npm test` (server)

```
> toktickit-server@1.0.0 test
> vitest run

 RUN  v2.1.9 /home/lapulga/Documents/cours/Thailande/SWE/Lab1_Starter_Scaffold/toktickit/toctickit/server

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  17:09:56
   Duration  752ms (transform 76ms, setup 0ms, collect 351ms, tests 80ms, environment 1ms, prepare 186ms)
```

### Frontend — `npm test` (client)

```
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 /home/lapulga/Documents/cours/Thailande/SWE/Lab1_Starter_Scaffold/toktickit/toctickit/client

 ✓ tests/lab-01/App.test.tsx (3)
   ✓ App (3)
     ✓ renders the TokTickIT heading
     ✓ shows Online and the seeded categories on success
     ✓ shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  17:10:30
   Duration  1.17s (transform 103ms, setup 66ms, collect 144ms, tests 97ms, environment 375ms, prepare 86ms)
```

**Summary:** 5/5 automated tests passing (2 backend, 3 frontend) on `main`.