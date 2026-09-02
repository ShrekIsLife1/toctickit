# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests follow the pyramid used in Lab 1, extended for Lab 2's scope:
**unit** (pure logic, e.g. Ticket Number generation, query-param parsing),
**API/integration** (Supertest against Express + a real test database),
**UI component** (Vitest + Testing Library, mocking the API layer),
**responsive/visual** (Playwright screenshots at three breakpoints + a
manual checklist), and **E2E** (Playwright, full stack, real backend and
database). Every Acceptance Criterion in `specification.md` maps to at
least one automated test below. Tests are written before or alongside
implementation (Test DD/TDD) — failing first, then made to pass by the
smallest correct implementation.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File |
|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator produces a unique, correctly formatted value | Matches `TKT-\d{4}-\d{6}`, no collision across repeated calls | `server/tests/lab-02/ticket-number.unit.test.ts` |
| UNIT-02 | Unit | BR-17 | Pagination param parser falls back to defaults on invalid input | Non-numeric/out-of-range `page`/`pageSize` resolve to defaults (1 / 10) | `server/tests/lab-02/pagination.unit.test.ts` |
| UNIT-03 | Unit | BR-33 | Stored filename sanitizer/randomizer | Output filename has no path separators, is unique, extension preserved | `server/tests/lab-02/filename-sanitizer.unit.test.ts` |
| API-01 | API | AC-01 | `POST /api/tickets` with valid data | 201; response includes generated `ticketNumber`; row exists in DB | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-02 | API | AC-04, BR-18 | `POST /api/tickets` missing/short Summary | 400; field-level error identifies `summary`; no row created | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-03 | API | BR-19, BR-20, BR-21 | `POST /api/tickets` invalid Description length / unknown Category / invalid Priority | 400 for each case; no row created | `server/tests/lab-02/create-ticket.api.test.ts` |
| API-04 | API | AC-08 | `GET /api/tickets` scoped to selected Requester | Only the selected Requester's Tickets are returned | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-05 | API | AC-09, BR-14–BR-17 | `GET /api/tickets` search/filter/sort/pagination combinations | Correct subset, order, and pagination metadata for each param combo | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-06 | API | AC-10 | `GET /api/tickets` with filters matching zero rows | 200; empty `data` array; `total: 0` in metadata | `server/tests/lab-02/my-tickets.api.test.ts` |
| API-07 | API | AC-03, BR-13 | `GET /api/tickets/:id` for a Ticket owned by another Requester | Safe not-found-style response; no Ticket fields leaked | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-08 | API | BR-38 | `GET /api/tickets/:id` for a non-existent id | Same safe not-found-style response as API-07 | `server/tests/lab-02/ticket-detail.api.test.ts` |
| API-09 | API | AC-11 | `GET /api/attachments/:id/download` for an active, owned Attachment | 200; correct file bytes/content-type returned | `server/tests/lab-02/attachments.api.test.ts` |
| API-10 | API | AC-13, BR-31 | `GET /api/attachments/:id/download` for a removed Attachment | Safe rejection (403/404-style); no file bytes returned | `server/tests/lab-02/attachments.api.test.ts` |
| API-11 | API | AC-14, BR-29 | `POST /api/tickets/:id/attachments` when 5 active Attachments already exist | Rejected with clear error; active count stays 5 | `server/tests/lab-02/attachments.api.test.ts` |
| API-12 | API | BR-27, BR-28 | Upload with disallowed MIME type / oversized file | Both rejected with distinct, clear error messages | `server/tests/lab-02/attachments.api.test.ts` |
| API-13 | API | AC-12, BR-30, BR-32 | `DELETE /api/attachments/:id` with a valid reason on an owned, active Attachment | 200; `isRemoved: true`, `removalReason` stored; file not deleted from disk | `server/tests/lab-02/attachments.api.test.ts` |
| API-14 | API | BR-32 | `DELETE /api/attachments/:id` without a removal reason | 400; Attachment remains active | `server/tests/lab-02/attachments.api.test.ts` |
| API-15 | API | AC-03 (attachments variant), BR-13 | Download/remove an Attachment belonging to another Requester's Ticket | Safe not-found-style rejection for both operations | `server/tests/lab-02/attachments.api.test.ts` |
| API-16 | API | AC-15, BR-07 | `GET /api/requesters` with one inactive seeded Requester | Inactive Requester excluded from response | `server/tests/lab-02/requesters.api.test.ts` |
| API-17 | API | AC-16, BR-10 | `GET /api/requesters` when zero active Requesters exist | 200; empty array (drives UI empty state) | `server/tests/lab-02/requesters.api.test.ts` |
| UI-01 | UI | AC-04 | Create Ticket form blocks submit on empty Summary | Inline error shown; `checkSystem`/create API not called | `client/src/features/tickets/tests/lab-02/CreateTicket.test.tsx` |
| UI-02 | UI | AC-07, BR-25 | Create Ticket submit when API call rejects | Safe error message shown; all field values still present in the form | `client/src/features/tickets/tests/lab-02/CreateTicket.test.tsx` |
| UI-03 | UI | AC-18, BR-22 | Submit button state while request is in flight | Button disabled/shows busy state; a second click does not fire a second request | `client/src/features/tickets/tests/lab-02/CreateTicket.test.tsx` |
| UI-04 | UI | AC-06, BR-27 | Selecting an invalid attachment file type in Create Ticket | Clear inline error; file not added to the pending upload list | `client/src/features/tickets/tests/lab-02/CreateTicket.test.tsx` |
| UI-05 | UI | AC-01 | Successful Create Ticket submission | Confirmation view shows the returned Ticket Number | `client/src/features/tickets/tests/lab-02/CreateTicket.test.tsx` |
| UI-06 | UI | AC-02 | Opening My Tickets/Create Ticket with no Requester selected | Redirects to / renders the Development Requester Selection screen | `client/src/features/requester/tests/lab-02/RequesterGuard.test.tsx` |
| UI-07 | UI | AC-16, BR-10 | Requester Selection screen with zero active Requesters (mocked API) | Empty state rendered; Continue disabled | `client/src/features/requester/tests/lab-02/RequesterSelection.test.tsx` |
| UI-08 | UI | BR-06 (selector API failure) | Requester Selection screen when the API call rejects | Safe error state rendered, distinct from the empty state | `client/src/features/requester/tests/lab-02/RequesterSelection.test.tsx` |
| UI-09 | UI | AC-17 | Change Requester action | My Tickets list refetches and updates after switching Requester | `client/src/features/requester/tests/lab-02/ChangeRequester.test.tsx` |
| UI-10 | UI | AC-09 | My Tickets search/filter/sort controls | Changing a control triggers a refetch with the expected query params | `client/src/features/tickets/tests/lab-02/MyTickets.test.tsx` |
| UI-11 | UI | AC-10 | My Tickets with zero Tickets overall vs. zero filtered results | Two visually distinct empty states rendered for each mocked case | `client/src/features/tickets/tests/lab-02/MyTickets.test.tsx` |
| UI-12 | UI | AC-12 | Ticket Detail attachment list after a soft removal (mocked API) | Removed Attachment shown greyed out with reason; download action disabled | `client/src/features/tickets/tests/lab-02/RequesterTicketDetail.test.tsx` |
| UI-13 | UI | — (component contract) | Attachment upload/remove section renders active vs removed states correctly | Correct badge/label and enabled/disabled actions per state | `client/src/features/tickets/tests/lab-02/AttachmentSection.test.tsx` |
| VIS-01 | Visual | AC-05, AC-19 | Create Ticket screenshot at desktop/tablet/mobile | No clipping, overlap, or horizontal scroll at any breakpoint | `artifacts/lab-02/screenshots/create-ticket/*` (captured by `e2e/lab-02` Playwright script) |
| VIS-02 | Visual | AC-19 | My Tickets screenshot at desktop/tablet/mobile | Desktop table / mobile card layout both usable, no overflow | `artifacts/lab-02/screenshots/my-tickets/*` |
| VIS-03 | Visual | — (UI spec conformance) | Ticket Detail screenshot at desktop/tablet/mobile | Header fields and Attachments panel clearly separated at all sizes | `artifacts/lab-02/screenshots/ticket-detail/*` |
| VIS-04 | Visual | AC-20 | Manual keyboard-navigation pass on Requester Selection and Create Ticket | Every control reachable via Tab, visible focus indicator throughout | Checklist item, Section 4 below |
| E2E-01 | E2E | AC-01, AC-05 | Full flow: select Requester → fill Create Ticket → attach one valid file → submit, at desktop and mobile | Confirmation shows the official Ticket Number in both viewports | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| E2E-02 | E2E | AC-08, AC-17 | Full flow: create a Ticket as Requester A, switch to Requester B, verify My Tickets | Requester A's Ticket is absent from Requester B's list | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| E2E-03 | E2E | AC-11, AC-12 | Full flow: open a created Ticket's detail, download its attachment, soft-remove it, reload | Download succeeds before removal; after removal the item shows as removed and download is blocked | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| E2E-04 | E2E | AC-03 | Attempt to open another Requester's Ticket Detail via direct URL | Safe "not found" experience shown, no data leaked | `e2e/lab-02/requester-ticket-flow.spec.ts` |

## 3. Acceptance-Criterion Traceability

| AC | Description (short) | Covered by |
|---|---|---|
| AC-01 | Valid submit → Ticket saved + number shown | API-01, UI-05, E2E-01 |
| AC-02 | No Requester selected → redirected to selector | UI-06 |
| AC-03 | Cross-Requester Ticket access blocked | API-07, API-15, E2E-04 |
| AC-04 | Empty Summary blocks submit | API-02, UI-01 |
| AC-05 | Full responsive submission flow | VIS-01, E2E-01 |
| AC-06 | Invalid attachment type rejected in UI | UI-04 |
| AC-07 | Backend failure preserves form values | UI-02 |
| AC-08 | My Tickets scoped to owner | API-04, E2E-02 |
| AC-09 | Search/filter/sort/pagination live-updates | API-05, UI-10 |
| AC-10 | Distinct empty vs no-results states | API-06, UI-11 |
| AC-11 | Active attachment download works | API-09, E2E-03 |
| AC-12 | Soft-removed attachment shown + blocked | API-13, UI-12, E2E-03 |
| AC-13 | Removed attachment download rejected | API-10 |
| AC-14 | 6th active attachment rejected | API-11 |
| AC-15 | Inactive Requester excluded from selector | API-16 |
| AC-16 | Empty active-Requester list handled | API-17, UI-07 |
| AC-17 | Change Requester reloads scoped data | UI-09, E2E-02 |
| AC-18 | No duplicate submission while in flight | UI-03 |
| AC-19 | No horizontal scroll / broken layout on mobile | VIS-01, VIS-02 |
| AC-20 | Full keyboard accessibility on selector | VIS-04 |

Every AC has at least one covering test. BR-27–BR-33 (attachment rules) are
additionally covered directly by API-10 through API-15 beyond their AC
mapping above.

## 4. Responsive and Visual Checklist

To be completed with a ✅/❌ per item once Issue 10 (Responsive, visual &
E2E QA) is implemented, referencing the screenshots under
`artifacts/lab-02/screenshots/`:

- [ ] No clipped labels on any field at any breakpoint
- [ ] No overlapping validation messages
- [ ] No unintended horizontal page scrolling at <768px
- [ ] Editable vs read-only fields are visually distinguishable
      (Create Ticket and Ticket Detail)
- [ ] Requested Priority / Current Status badges use consistent colors and
      are not color-only (include text)
- [ ] Primary/secondary/destructive/disabled/busy button styles are
      visually distinct
- [ ] Desktop My Tickets renders as a table; mobile renders as cards (or an
      equivalent responsive pattern) without loss of information
- [ ] Filters, pagination, and attachment controls remain usable (tap
      targets, no overlap) at mobile width
- [ ] Focus indicator is visible on every interactive control when
      navigating by keyboard
- [ ] Screens visually match `ui-spec.md` and the approved illustrative
      screens, not just personal impression

## 5. Test Commands

```bash
# Backend unit + API tests
cd server
npm test

# Frontend unit + UI component tests
cd client
npm test

# End-to-end tests (requires both servers running against a seeded DB)
npx playwright test e2e/lab-02/requester-ticket-flow.spec.ts

# Visual/responsive screenshot capture
npx playwright test e2e/lab-02 --update-snapshots
```

## 6. Final Results

_To be filled in once Issue 10/11 are complete, with real `npm test` /
`playwright test` output captured on the `main` branch — same evidence
format as Lab 1's `tests.md`._

| Suite | Status | Notes |
|---|---|---|
| Backend (`server/tests/lab-02`) | ⏳ Pending | |
| Frontend (`client/.../lab-02 tests`) | ⏳ Pending | |
| E2E (`e2e/lab-02`) | ⏳ Pending | |

## 7. Known Limitations or Deferred Tests

- Visual checklist (Section 4) is completed manually alongside automated
  Playwright screenshots; it is not itself a pass/fail automated test.
- Load/performance testing of `GET /api/tickets` pagination at large
  dataset sizes is out of scope for Lab 2.
- Cross-browser E2E coverage is limited to the default Playwright browser
  configured for this course; multi-browser matrix testing is deferred.
