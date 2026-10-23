# TokTickIT — Lab 4 Test Plan & Traceability (Sprint 4)

Extends `docs/lab-03/tests_lab3.md` and `docs/lab-02/tests.md`. This test plan establishes the quality verification matrix across unit, API/integration, UI component, end-to-end (Playwright), visual accessibility, and regression suites.

---

## 1. Test Strategy

Sprint 4 tests are developed following **Test-Driven Development (TDD)** and **Specification-Driven Development (Spec DD)**. Testing covers:
1. **Unit Tests**: Pure business logic isolation (status transitions, resolution gate checks, version checking, validation formulas).
2. **API & Integration Tests**: Backend route protection, role-based authorization, optimistic concurrency, database queries, and idempotency.
3. **UI Component Tests**: Form validations, responsive states, conditional rendering, error recovery, and interactive feedback.
4. **End-to-End (Playwright) Tests**: Full browser lifecycle tests spanning authentication, staff actions, requester views, and multi-role workflows.
5. **Regression & Migration Tests**: Verifying that all Lab 1–3 capabilities continue to pass without deprecation or schema corruption.

---

## 2. Planned Tests Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | BR-20, BR-21 | Status transition matrix logic | Permitted pairs return true; disallowed pairs and terminal exits return false | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **UNIT-02** | Unit | BR-14, AC-08 | Resolution gate validator function | Rejects if `ticketOwnerId` is null or `actionsCount === 0`; accepts when both satisfied | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **UNIT-03** | Unit | BR-04, BR-06 | Action Taken input validator (dates, character limits, follow-up rules) | Validates future limit (<=5m), requires followUpNote if followUpRequired is true | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **UNIT-04** | Unit | BR-25, BR-26 | Dashboard rolling date calculations & active status filters | Rolling 7-day cutoff accurately applied in `Asia/Bangkok` timezone | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-01** | API | AC-01, FR-01 | Create valid Action Taken via `POST /api/tickets/:id/actions-taken` | 201 Created; action saved with session user as `performedById`; ticket `updatedAt` refreshed | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-02** | API | AC-03, BR-02 | Non-owner IT Staff creates an Action Taken | 201 Created; action records actor; ticket owner is unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-03** | API | AC-04, BR-06 | Create Action Taken with `followUpRequired: true` and missing note | 400 `VALIDATION_ERROR`; no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04** | API | AC-05, BR-10 | Requester attempts `POST` or `PATCH` on Actions Taken | 403 `FORBIDDEN`; no modifications stored | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-05** | API | AC-06, BR-11 | Requester reads Actions Taken for owned ticket vs unowned ticket | 200 with chronological list for owned ticket; 404 for another user's ticket | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-06** | API | AC-07, BR-17 | `PATCH /api/tickets/:id/actions-taken/:actionId` with stale `expectedVersion` | 409 `STALE_UPDATE` with `currentVersion`; no update applied | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-07** | API | AC-12, BR-09 | Create or edit Action Taken on `CANCELLED` ticket | 409 `CANCELLED_TICKET_IMMUTABLE`; write rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-08** | API | AC-19, FR-17 | Submit identical create Action with same `Idempotency-Key` | Single database row created; repeat returns original created record | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-09** | API | AC-08, BR-14 | `PATCH /api/staff/tickets/:id` to `RESOLVED` with missing owner or 0 actions | 409 `RESOLUTION_GATE_NOT_MET` with detailed missing items | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-10** | API | AC-09, BR-14 | `PATCH /api/staff/tickets/:id` to `RESOLVED` with assigned owner and ≥1 action | 200 OK; status updated to `RESOLVED`, `statusChangedAt` recorded, version incremented | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-11** | API | AC-10, BR-21 | Direct API call with invalid transition (e.g. `NEW` → `CLOSED` or from `CANCELLED`) | 409 `INVALID_STATUS_TRANSITION`; ticket unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-12** | API | AC-11, BR-15 | `POST /api/tickets/:id/resolve-indication` by Requester | 200 OK; `problemAppearsResolved = true`; status unchanged; repeat call returns 409 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-13** | API | BR-18 | Reopen ticket (`RESOLVED` → `REOPENED` or `CLOSED` → `REOPENED`) | 200 OK; resets `problemAppearsResolved` to `false` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-14** | API | AC-07, BR-16 | `PATCH /api/staff/tickets/:id` with outdated `expectedVersion` | 409 `STALE_UPDATE`; ticket unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-15** | API | AC-02, BR-27 | `GET /api/dashboard/requester` under authenticated Requester | 200 OK; returns only tickets and metrics owned by calling requester | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-16** | API | AC-15, BR-29 | `GET /api/dashboard/requester` for user with 0 tickets | 200 OK; counts are 0, list is empty `[]`, never null or error | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-17** | API | AC-13, BR-24 | `GET /api/dashboard/staff` operational metrics calculation | 200 OK; counts for unassigned, ownedByMe, byStatus, and byItPriority match DB queries | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-18** | API | AC-14 | `GET /api/dashboard/staff` as Admin vs IT Staff | Admin response includes `userCounts`; IT Staff response omits `userCounts` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-19** | API | AC-17 | Regression & migration data integrity | Existing Lab 1–3 Users, Tickets, Attachments, Comments intact after migration | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-20** | API | AC-18 | Seed script idempotency | Running seed twice produces 0 duplicate records and maintains valid metrics | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-21** | API | AC-21 | Full Lab 1–3 backend test suite regression | All previous test files in `server/tests/lab-01`, `lab-02`, `lab-03` pass | `server/tests/lab-03/*.test.ts` | Planned |
| **UI-01** | UI | AC-01, AC-03 | Actions Taken list rendering and chronological order on Staff Ticket Detail | Renders date, staff member, description, result; stable sort order | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-02** | UI | AC-04, FR-06 | Actions Taken form validation: follow-up note conditionally required | Disables or warns when follow-up is checked with blank note; preserves inputs on error | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-03** | UI | AC-07 | Actions Taken edit mode with stale conflict | Shows conflict warning and "Reload" action on 409 response | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04** | UI | AC-06, FR-05 | Requester Ticket Detail Actions Taken view | Renders actions read-only; no add/edit buttons rendered | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-05** | UI | AC-08, AC-09 | Staff Ticket Detail status dropdown & resolution gate feedback | Only permitted transitions shown; missing gate items displayed in alert banner | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-06** | UI | AC-11, D-05 | Requester "Mark Problem as Resolved" button | Visible in permitted statuses; click sets indicator and renders confirmation badge | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-07** | UI | AC-02, AC-16 | Requester Dashboard cards, recent list, and drill-down navigation | Cards display accurate counts; clicking card navigates to `/my-tickets?status=...` | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-08** | UI | AC-13, AC-16 | IT Staff Dashboard operational cards, urgent tickets list, and drill-downs | Cards display metrics; urgent tickets list displays high priority items with links | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-09** | UI | AC-14 | Admin User Counts widget on Staff Dashboard | Rendered for Administrator; omitted for IT Staff | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-10** | UI | AC-15 | Dashboard empty states and error recovery | Renders clean empty states and Retry buttons on fetch failures | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-11** | UI | AC-20 | Role-based navigation shell & active page indication | Header shows role links; active link highlighted with bold pale-green styling | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-03, AC-05, AC-06, AC-19 | Full Actions Taken lifecycle (`actions-taken-flow.spec.ts`) | Staff adds actions, different staff adds action, Requester views read-only, double-click prevented | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-02** | E2E | AC-08, AC-09, AC-10, AC-11, AC-07 | Ticket resolution & workflow lifecycle (`ticket-resolution.spec.ts`) | Resolution gate blocks unassigned/actionless ticket; Requester marks advisory; Staff resolves after work; stale update conflict caught | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **E2E-03** | E2E | AC-02, AC-13, AC-14, AC-15, AC-16 | Multi-role dashboard experience (`dashboards.spec.ts`) | Requester and Staff dashboards display authoritative counts; drill-down clicks open filtered queues; Admin sees user widget | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **VIS-01** | Visual | AC-22 | Desktop, Tablet, Mobile visual responsiveness | No clipping, overlapping, or horizontal viewport scroll on all Lab 4 views | `artifacts/lab-04/screenshots/**` | Planned |
| **VIS-02** | Visual | AC-22, AC-23 | Accessibility & Zen Green theme compliance | Visible 2px keyboard focus, non-color status labels, clean console with 0 errors | Visual verification checklist | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

Every Acceptance Criterion (AC-01 through AC-23) defined in `docs/lab-04/specification.md` maps directly to covering automated tests:

| Acceptance Criterion | Short Description | Covered By Tests |
|---|---|---|
| **AC-01** | Action Taken created by permitted staff with auto Performed by | API-01, UI-01, E2E-01 |
| **AC-02** | Requester dashboard returns only owned metrics and recent tickets | API-15, UI-07, E2E-03 |
| **AC-03** | Non-owner staff member can record action without changing owner | API-02, UI-01, E2E-01 |
| **AC-04** | Missing follow-up note when required returns 400 and preserves input | API-03, UI-02 |
| **AC-05** | Requester cannot create or edit Actions Taken (403) | API-04, E2E-01 |
| **AC-06** | Requester views own ticket actions read-only; 404 for other tickets | API-05, UI-04, E2E-01 |
| **AC-07** | Stale update version conflict returns 409 and prompts Reload | API-06, API-14, UI-03, E2E-02 |
| **AC-08** | Resolution gate blocks resolving ticket without owner or actions | UNIT-02, API-09, UI-05, E2E-02 |
| **AC-09** | Valid ticket resolution succeeds, records statusChangedAt, refreshes UI | API-10, UI-05, E2E-02 |
| **AC-10** | Disallowed status transition rejected with 409 | UNIT-01, API-11, UI-05, E2E-02 |
| **AC-11** | Requester problem resolved indication is advisory only | API-12, UI-06, E2E-02 |
| **AC-12** | Actions Taken cannot be modified on Cancelled tickets | API-07 |
| **AC-13** | Staff dashboard operational metrics match authoritative database queries | UNIT-04, API-17, UI-08, E2E-03 |
| **AC-14** | Admin dashboard includes userCounts; omitted for Staff and Requesters | API-18, UI-09, E2E-03 |
| **AC-15** | Zero records return 0 and [] with clear UI empty states | API-16, UI-10, E2E-03 |
| **AC-16** | Dashboard cards link directly to filtered queue/detail destinations | UI-07, UI-08, E2E-03 |
| **AC-17** | Database migration preserves all Lab 1–3 data | API-19 |
| **AC-18** | Seed script is idempotent and safe to run repeatedly | API-20 |
| **AC-19** | Duplicate submit prevention handles repeated clicks / retries safely | API-08, E2E-01 |
| **AC-20** | Role navigation and forbidden page protection enforced | UI-11, E2E-03 |
| **AC-21** | Full Lab 1–3 regression passes without skipped tests | API-21 |
| **AC-22** | Responsive layouts across desktop, tablet, mobile with visible focus | VIS-01, VIS-02 |
| **AC-23** | Clean console, no debug logs, no placeholder text or broken links | VIS-02 |

---

## 4. Test Execution Instructions

### 4.1 Backend Tests
```bash
# In the server directory:
cd server

# Run all unit and API tests:
npm test

# Run Lab 4 specific API suites:
npx vitest run tests/lab-04/actions-taken.api.test.ts
npx vitest run tests/lab-04/ticket-workflow.api.test.ts
npx vitest run tests/lab-04/requester-dashboard.api.test.ts
npx vitest run tests/lab-04/staff-dashboard.api.test.ts
```

### 4.2 Frontend Component Tests
```bash
# In the client directory:
cd client

# Run all frontend component tests:
npm test

# Run Lab 4 specific component tests:
npx vitest run tests/lab-04/ActionsTaken.test.tsx
npx vitest run tests/lab-04/TicketWorkflow.test.tsx
npx vitest run tests/lab-04/RequesterDashboard.test.tsx
npx vitest run tests/lab-04/StaffDashboard.test.tsx
```

### 4.3 End-to-End Playwright Tests
```bash
# In the root repository directory:
npx playwright test e2e/lab-04/
```
