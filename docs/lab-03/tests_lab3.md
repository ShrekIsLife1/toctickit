# Lab 3 Test Plan and Results

## 1. Test Strategy

Extends the Lab 1/Lab 2 pyramid with an explicit **authorization** layer:
every protected endpoint gets a dedicated test proving it rejects
unauthenticated and under-privileged callers, in addition to its
happy-path coverage. **Migration/regression** tests re-run the Lab 2
Requester behavior under real authentication to prove nothing broke.
Tests are written before or alongside implementation (Test DD/TDD).

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File |
|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-08, BR-09 | Password hashing + strength validator | Correct hash/verify round-trip; weak passwords rejected with a specific reason per rule | `server/tests/lab-03/password.unit.test.ts` |
| UNIT-02 | Unit | BR-20 | Status transition matrix helper | Every permitted pair returns true; every other pair returns false | `server/tests/lab-03/status-transitions.unit.test.ts` |
| API-01 | API | AC-01 | `POST /api/auth/login` with valid credentials | 200; session cookie set; safe user object (no password hash) returned | `server/tests/lab-03/auth.api.test.ts` |
| API-02 | API | AC-05 | Login with wrong password / unknown email | Same generic 401 message in both cases | `server/tests/lab-03/auth.api.test.ts` |
| API-03 | API | AC-06 | Login against an inactive account with correct password | Same generic 401 as API-02, no distinct message | `server/tests/lab-03/auth.api.test.ts` |
| API-04 | API | AC-02, AC-18 | `GET /api/auth/me` and Ticket endpoints while `mustChangePassword` is true | Non-auth endpoints (`/change-password`, `/me`, `/logout`) allowed; all other protected endpoints return 403 with a specific "password change required" code | `server/tests/lab-03/auth.api.test.ts` |
| API-05 | API | AC-07 | `POST /api/auth/logout` then reuse the old session | Logout succeeds; a subsequent authenticated request with the old cookie is rejected | `server/tests/lab-03/auth.api.test.ts` |
| API-06 | API | AC-03 | `POST /api/tickets` with a client-supplied requester/user id different from the authenticated one | Backend ignores the supplied id; created Ticket's `requesterId` matches the authenticated user | `server/tests/lab-03/authorization.api.test.ts` |
| API-07 | API | AC-04 | Requester calls an Internal Note endpoint | 403; response body contains no note content or count | `server/tests/lab-03/authorization.api.test.ts` |
| API-08 | API | AC-14 | Requester calls `GET /api/staff/tickets` directly | 403 | `server/tests/lab-03/authorization.api.test.ts` |
| API-09 | API | AC-19 | Non-Administrator calls any `/api/admin/*` endpoint | 403 for IT Staff and for Requester | `server/tests/lab-03/authorization.api.test.ts` |
| API-10 | API | FR-09 | `GET /api/staff/tickets` search/filter/sort/pagination | Correct subset/order/pagination metadata across Tickets from multiple Requesters (not ownership-scoped) | `server/tests/lab-03/staff-queue.api.test.ts` |
| API-11 | API | AC-08 | `POST /api/staff/tickets/:id/claim` on an unassigned Ticket | 200; Ticket Owner becomes the calling IT Staff user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| API-12 | API | AC-09 | Reassign an already-owned Ticket to a different IT Staff user | 200; Ticket Owner updates to the new user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| API-13 | API | AC-10 | `PATCH .../tickets/:id` status Open → Closed (not permitted) | 409/400 rejection; status unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| API-14 | API | AC-11 | `PATCH .../tickets/:id` status Resolved → Closed (permitted) | 200; status updates | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| API-15 | API | FR-12 | `PATCH .../tickets/:id` IT Priority update by IT Staff | 200; `itPriority` updates independently of `requestedPriority` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| API-16 | API | AC-12 | Post a Public Comment as Requester, an Internal Note as IT Staff, then fetch comments as Requester | Public Comment visible to Requester; Internal Note absent from the Requester's response | `server/tests/lab-03/comments-notes.api.test.ts` |
| API-17 | API | BR-24, BR-25 | Post empty/whitespace-only content, and content exceeding 2000 characters | Both rejected with 400 | `server/tests/lab-03/comments-notes.api.test.ts` |
| API-18 | API | AC-13 | `POST /api/tickets/:id/resolve-indication` on an owned Ticket | 200; `problemAppearsResolved` becomes true; `currentStatus` unchanged | `server/tests/lab-03/comments-notes.api.test.ts` |
| API-19 | API | FR-16 | `GET /api/admin/users` search by name/email and role filter | Correct filtered subset returned to an Administrator | `server/tests/lab-03/users-admin.api.test.ts` |
| API-20 | API | AC-15 | `POST /api/admin/users` with a duplicate email | 400/409; no user created | `server/tests/lab-03/users-admin.api.test.ts` |
| API-21 | API | FR-17 | `POST /api/admin/users` with valid data | 201; created user has `mustChangePassword: true` and no plaintext password stored/returned | `server/tests/lab-03/users-admin.api.test.ts` |
| API-22 | API | AC-16 | Administrator attempts to deactivate their own account | 403/400 rejection | `server/tests/lab-03/users-admin.api.test.ts` |
| API-23 | API | AC-17 | Deactivate or demote the last active Administrator | 403/400 rejection | `server/tests/lab-03/users-admin.api.test.ts` |
| API-24 | API | FR-19 | `POST /api/admin/users/:id/reset-password` | 200; target user's `mustChangePassword` becomes true | `server/tests/lab-03/users-admin.api.test.ts` |
| API-25 | API | AC-20 | Re-run of every Lab 2 Ticket/Attachment API test, authenticated as a migrated Requester user instead of via `X-Requester-Id` | All Lab 2 assertions still pass unmodified | `server/tests/lab-03/regression.api.test.ts` |
| UI-01 | UI | AC-01, AC-05 | Login form: valid submit vs. invalid-credentials error | Success navigates away; failure shows the generic safe message, form re-enabled | `client/tests/lab-03/Login.test.tsx` |
| UI-02 | UI | — (busy state) | Submit button state while the login request is in flight | Busy/disabled state shown; no duplicate submission | `client/tests/lab-03/Login.test.tsx` |
| UI-03 | UI | AC-02 | Change Password screen: live rule checklist and match validation | Continue disabled until all rules pass and confirmation matches; enabled once valid | `client/tests/lab-03/ChangePassword.test.tsx` |
| UI-04 | UI | AC-18 | Successful password change | Navigates into the normal authenticated shell afterward | `client/tests/lab-03/ChangePassword.test.tsx` |
| UI-05 | UI | FR-09 | Ticket Queue: search/filter/sort controls trigger a refetch with expected params (mocked API) | Correct query parameters sent per control | `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| UI-06 | UI | — (empty/no-results) | Queue with zero Tickets overall vs. zero filtered results | Two distinct empty/no-results states rendered | `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| UI-07 | UI | AC-08 | Claim action on an unassigned row (mocked API) | Calls the claim endpoint; row updates to show the new owner | `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| UI-08 | UI | AC-10, AC-11 | Status dropdown only offers permitted next statuses for the Ticket's current status (mocked API) | Disallowed target statuses are not selectable/rendered | `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| UI-09 | UI | AC-12 | Public Comments and Internal Notes render in visually distinct panels | Internal Notes panel has a distinct style/label; content does not intermix | `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| UI-10 | UI | FR-11 | Reassign action (mocked API) | Calls the claim/reassign endpoint with the selected user | `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| UI-11 | UI | AC-15 | User Management create form: duplicate-email error from a mocked API rejection | Field-level error shown; form values preserved | `client/tests/lab-03/UserManagement.test.tsx` |
| UI-12 | UI | AC-16 | Deactivate button disabled/blocked on the currently logged-in Administrator's own row | Self-deactivation prevented in the UI as well as the API (defense in depth) | `client/tests/lab-03/UserManagement.test.tsx` |
| UI-13 | UI | FR-16 | Search and role filter on the user list (mocked API) | Correct query parameters sent; list updates | `client/tests/lab-03/UserManagement.test.tsx` |
| VIS-01 | Visual | — | Login, Change Password, Ticket Queue, IT Staff Ticket Detail, User Management screenshots at desktop/tablet/mobile | No clipping, overlap, or horizontal scroll at any breakpoint | `artifacts/lab-03/screenshots/**` (captured by `e2e/lab-03` Playwright scripts) |
| VIS-02 | Visual | — | Role-badge and status-badge color/label consistency across Queue and Ticket Detail | Same visual language as Lab 2 badges, text always included | Checklist item, Section 4 below |
| E2E-01 | E2E | AC-01, AC-02, AC-18, AC-07 | `authentication.spec.ts`: login with an initial password → forced Change Password → normal app → logout → direct access blocked | Each step behaves as specified; final direct navigation after logout redirects to Login | `e2e/lab-03/authentication.spec.ts` |
| E2E-02 | E2E | AC-08, AC-09, AC-10, AC-11, AC-12, AC-13 | `staff-ticket-flow.spec.ts`: Requester creates a Ticket and posts a Comment → IT Staff claims it, sets IT Priority and status through Resolved → Closed, posts a Public Comment and an Internal Note → Requester marks problem resolved and confirms the Internal Note is never visible to them | Full workflow succeeds; Internal Note never appears in the Requester's view at any point | `e2e/lab-03/staff-ticket-flow.spec.ts` |
| E2E-03 | E2E | AC-15, AC-16, AC-17, AC-19 | `user-administration.spec.ts`: Administrator creates a user, hits a duplicate-email error, edits a user, resets a password, attempts self-deactivation (blocked), and a non-Administrator is denied `/admin` access | Every step matches its expected outcome | `e2e/lab-03/user-administration.spec.ts` |

## 3. Acceptance-Criterion Traceability

| AC | Description (short) | Covered by |
|---|---|---|
| AC-01 | Valid login establishes session | API-01, UI-01, E2E-01 |
| AC-02 | Forced password change blocks other screens | API-04, UI-03, E2E-01 |
| AC-03 | Backend ignores client-supplied identity | API-06 |
| AC-04 | Requester blocked from Internal Notes | API-07 |
| AC-05 | Same error for wrong password / unknown email | API-02, UI-01 |
| AC-06 | Same error for inactive account | API-03 |
| AC-07 | Logout invalidates session | API-05, E2E-01 |
| AC-08 | Claim sets Ticket Owner | API-11, UI-07, E2E-02 |
| AC-09 | Reassign updates Ticket Owner | API-12, UI-10 |
| AC-10 | Invalid status transition rejected | API-13, UI-08, E2E-02 |
| AC-11 | Valid status transition accepted | API-14, UI-08, E2E-02 |
| AC-12 | Public/Internal visibility separation | API-16, UI-09, E2E-02 |
| AC-13 | Requester resolve-indication action | API-18, E2E-02 |
| AC-14 | Requester blocked from Staff Queue | API-08 |
| AC-15 | Duplicate email rejected | API-20, UI-11, E2E-03 |
| AC-16 | No self-deactivation | API-22, UI-12, E2E-03 |
| AC-17 | Last active Administrator protected | API-23, E2E-03 |
| AC-18 | Forced change on reset password | API-04 (shared), UI-04 |
| AC-19 | Non-Administrator blocked from `/admin` | API-09, E2E-03 |
| AC-20 | Full Lab 2 regression under real auth | API-25 |

Every AC has at least one covering test.

## 4. Responsive and Visual Checklist

- [ ] No clipped labels on any field at any breakpoint (Login, Change
      Password, Ticket Queue, IT Staff Ticket Detail, User Management)
- [ ] No overlapping validation messages
- [ ] No unintended horizontal page scrolling at <768px
- [ ] Editable vs read-only fields remain visually distinguishable on the
      extended IT Staff Ticket Detail screen
- [ ] Role badges (Requester / IT Staff / Administrator) and status
      badges use consistent colors and always include text
- [ ] Internal Notes panel is visually distinct (not just a label) from
      Public Comments
- [ ] Desktop Ticket Queue renders as a table; mobile renders as cards,
      consistent with the Lab 2 My Tickets pattern
- [ ] User Management list/form remains usable (no overlap, readable
      tap targets) at mobile width
- [ ] Focus indicator is visible on every interactive control when
      navigating by keyboard, including the password-rule checklist and
      role/status dropdowns
- [ ] All screens visually match `ui-spec.md` and the approved
      illustrative screens

## 5. Test Commands

```bash
# Backend unit + API tests
cd server
npm test

# Frontend unit + UI component tests
cd client
npm test

# End-to-end tests (requires both servers running against a seeded,
# migrated database)
npx playwright test e2e/lab-03

# Visual/responsive screenshot capture
npx playwright test e2e/lab-03 --update-snapshots
```

## 6. Final Results

_To be filled in once Issues 18/19 are complete, with real `npm test` /
`playwright test` output captured on the `main` branch — same evidence
format as Lab 1 and Lab 2._

| Suite | Status | Notes |
|---|---|---|
| Backend (`server/tests/lab-03`) | ⏳ Pending | |
| Frontend (`client/.../lab-03 tests`) | ⏳ Pending | |
| E2E (`e2e/lab-03`) | ⏳ Pending | |
| Lab 2 regression (`server/tests/lab-03/regression.api.test.ts`) | ⏳ Pending | |

## 7. Known Limitations or Deferred Tests

- Session/cookie expiration timing is not exhaustively tested (only
  logout-triggered invalidation, per AC-07); long-lived-session edge
  cases are out of scope for Lab 3.
- Brute-force/rate-limiting protection on `POST /api/auth/login` is not
  required or tested in Lab 3 (no such control is specified in the
  handout); this is a known gap acceptable at this stage of the course.
- Concurrent claim/reassign race conditions (two IT Staff claiming the
  same Ticket simultaneously) are not explicitly tested; the backend
  should still behave safely (last write wins) but this is not asserted
  by a dedicated concurrency test.
