# TokTickIT — Lab 4 Specification (Sprint 4)

**Course:** CPE 334 — Lab 4: Actions Taken, Dashboards, and Final Regression
**Author:** Baptiste Carré (69540460014) · **Peer reviewer:** Clément Delrieu (69540460016)
**Extends:** `docs/lab-01`, `docs/lab-02`, `docs/lab-03` (all earlier behavior is preserved unless stated here).

---

## 1. Sprint Goal

Complete the core TokTickIT service-desk workflow: IT Staff and Administrators record the real work done on a Ticket as **Actions Taken**, the Ticket lifecycle is fully enforced by the backend (including a resolution gate and stale-update protection), Requesters and IT Staff get concise **role dashboards** linked to the detailed screens, and the whole application is hardened and visually consistent under Zen Green.

## 2. Stakeholder Request (interpretation)

The service desk can already receive Tickets and let staff talk to Requesters. It now needs a reliable record of the work itself. Each Ticket gets a list of dated, attributed action entries. The Ticket Owner remains the coordinator, but any IT Staff member can record an action. A Requester can say "this looks resolved", but only IT Staff can actually resolve the Ticket. Dashboards give a quick starting point and always lead to the existing detailed screens. Finally, nothing from Labs 1–3 may break, and leftovers (debug logs, obsolete UI, spec/code mismatches) must be cleaned up.

## 3. Scope

### 3.1 Included
- Actions Taken: create, list, view, edit (no delete) on a Ticket.
- Final Ticket status-transition matrix with roles, resolution gate, optimistic concurrency.
- Requester dashboard, IT Staff dashboard, Administrator dashboard (staff dashboard + user counts).
- Prisma migration (additive, data-preserving), idempotent seed, REST API increments.
- Dashboard navigation, Zen Green extensions, responsive/accessibility polish.
- Final regression of Labs 1–3, cleanup, README refresh.

### 3.2 Explicitly excluded
SLA clocks, escalation, on-call; email/SMS/LINE/push notifications; inventory, spare parts, purchasing, service costing; time-sheets, billing, payroll; multi-level approvals, e-signatures; BI tools, custom reports, exports; multi-tenancy, production cloud operations; any feature not listed in this document. Also excluded: deleting Actions Taken, real file upload on an Action (Attachment Notes are plain text only), rate limiting and password recovery (known limitations from Lab 3, unchanged).

## 4. Functional Requirements

### Actions Taken
- **FR-01** IT Staff and Administrators can create an Action Taken on any Ticket they can access.
- **FR-02** An Action Taken contains: Action Date/Time, Action Description, Result, Performed by (auto), Follow-Up Required?, Follow-up Note, Attachment Notes.
- **FR-03** IT Staff and Administrators can edit an existing Action Taken; every edit records who edited and when.
- **FR-04** The Ticket Detail (staff) shows Actions Taken as a list in stable chronological order with a create mode and a view/edit mode.
- **FR-05** Requesters see all Actions Taken of their own Tickets, read-only, on their Ticket Detail.
- **FR-06** Follow-up Note is mandatory when Follow-Up Required? is true.

### Workflow
- **FR-07** Ticket status changes follow the final matrix (§5.3); the UI offers only permitted transitions, the backend enforces them.
- **FR-08** A Requester can indicate that the problem appears resolved (advisory only; never changes `currentStatus`).
- **FR-09** Moving a Ticket to Resolved requires the resolution gate (BR-14).
- **FR-10** Concurrent/stale updates to a Ticket or an Action Taken are detected and rejected with a conflict, never silently overwritten.
- **FR-11** After a successful status change the Ticket summary refreshes immediately.

### Dashboards
- **FR-12** A Requester dashboard summarizes only the Requester's own Tickets.
- **FR-13** An IT Staff dashboard summarizes the operational queue and the current user's workload.
- **FR-14** An Administrator sees the IT Staff dashboard plus concise user-account counts.
- **FR-15** Every card/count/list item has a defined drill-down destination, empty behavior, and a loading/error state.

### Hardening
- **FR-16** All Lab 1–3 features remain available to the same roles (regression).
- **FR-17** Repeated clicks and network retries do not create duplicate Actions Taken or duplicate transitions.
- **FR-18** Forms keep entered data after recoverable failures (validation error, conflict, network error).
- **FR-19** No console errors, debug logging, broken links, placeholder text or unfinished controls remain.
- **FR-20** README (setup, migrate, seed, test, demo) is current.

## 5. Business Rules

### 5.1 Actions Taken
- **BR-01** An Action Taken belongs to exactly one Ticket and cannot be moved to another.
- **BR-02** The Ticket Owner coordinates the Ticket, but an Action Taken may be performed by any IT Staff member or Administrator; it does not require being the owner, and an unassigned Ticket can have Actions.
- **BR-03** `Performed by` is set by the server from the session; the client can never send or change it.
- **BR-04** `Action Date/Time` defaults to the current time, may be set by staff, must not be more than 5 minutes in the future, and is stored in UTC.
- **BR-05** `Action Description` is required, 1–2000 characters, plain text. `Result` is required, 1–1000 characters, plain text.
- **BR-06** `Follow-Up Required?` is a boolean (default false). When true, `Follow-up Note` is required (1–1000 characters). When false, the note is optional and kept as entered.
- **BR-07** `Attachment Notes` is optional, ≤ 500 characters, plain text, describing which file/image to look for. It is not a file upload.
- **BR-08** Actions Taken are never deleted. Editing is allowed; creation time, creator and Ticket never change; `updatedAt` and `updatedBy` are recorded.
- **BR-09** Actions Taken cannot be created or edited on a Ticket in `Cancelled` status (terminal). They can on all other statuses, including Closed (post-closure documentation).
- **BR-10** Requesters can never create or edit Actions Taken (403); a Requester accessing someone else's Ticket gets 404.
- **BR-11** Actions Taken are visible to the Ticket's Requester in full (all fields). Internal Notes remain private to staff and are unaffected.
- **BR-12** Order is stable: `actionDateTime` ascending, then `createdAt`, then `id`.
- **BR-13** Creating or editing an Action Taken updates the Ticket's `updatedAt`. Internal Notes never update it (so Requesters cannot infer private activity).

### 5.2 Resolution and concurrency
- **BR-14** *Resolution gate:* a Ticket can move to **Resolved** only if (a) it has a Ticket Owner, and (b) it has at least one Action Taken. Otherwise 409 `RESOLUTION_GATE_NOT_MET` with the missing conditions listed.
- **BR-15** A Requester's "problem appears resolved" indication is advisory: it sets `problemAppearsResolved = true`, never changes status, never satisfies the resolution gate, and can be done once (409 `ALREADY_RESOLVED_INDICATED`). It is available while the Ticket is Open, In Progress, Waiting for Requester or Reopened (decision D-05). A Requester cannot change status.
- **BR-16** Every Ticket has an integer `version`, incremented on every successful workflow change (status, priority, owner). Updates must send `expectedVersion`; a mismatch returns 409 `STALE_UPDATE` with the current version and no change is applied.
- **BR-17** Every Action Taken has an integer `version`; an edit must send `expectedVersion`, mismatch → 409 `STALE_UPDATE`.
- **BR-18** Reopening a Ticket resets `problemAppearsResolved` to false.
- **BR-19** Status changes record `statusChangedAt` (used by dashboards).
- **BR-20** Deactivated users cannot authenticate (Lab 3 rule) and therefore cannot perform or edit Actions Taken; their historical `Performed by` remains displayed.

### 5.3 Final status-transition matrix

| From → To | Allowed roles | Notes |
|---|---|---|
| New → Open | IT Staff, Administrator | |
| Open → In Progress | IT Staff, Administrator | |
| In Progress → Waiting for Requester | IT Staff, Administrator | |
| In Progress → Resolved | IT Staff, Administrator | resolution gate (BR-14) |
| Waiting for Requester → In Progress | IT Staff, Administrator | |
| Resolved → Closed | IT Staff, Administrator | |
| Resolved → Reopened | IT Staff, Administrator | |
| Closed → Reopened | IT Staff, Administrator | |
| Reopened → In Progress | IT Staff, Administrator | |
| Open / In Progress / Waiting for Requester → Cancelled | IT Staff, Administrator | terminal |

- **BR-21** Any pair not in the table is rejected with 409 `INVALID_STATUS_TRANSITION`. No transition into Closed except from Resolved. Cancelled has no outgoing transition.
- **BR-22** Requesters have no status-changing permission (403).
- **BR-23** The backend enforces the matrix even if the client bypasses the screen.

### 5.4 Dashboards
- **BR-24** Metrics are computed by the backend from the database at request time; the client never counts.
- **BR-25** *Active* statuses = New, Open, In Progress, Waiting for Requester, Reopened. *Terminal-ish* = Resolved, Closed, Cancelled.
- **BR-26** Time zone for date boundaries: `Asia/Bangkok`. "Recent" = the last 7 days (rolling) measured against `updatedAt` / `statusChangedAt`. Recent lists contain at most 5 items.
- **BR-27** Requester dashboard returns only Tickets whose requester is the session user; no id is accepted from the client.
- **BR-28** Dashboard responses contain counts and short summaries (id, ticket number, summary, status, priority, timestamps), never full Ticket collections, comments or notes.
- **BR-29** An empty metric returns `0` (or an empty list), never `null` or an error.

#### Requester dashboard metrics

| Metric key | Label | Calculation | Drill-down |
|---|---|---|---|
| `openTickets` | My Open Tickets | own Tickets with active status | `/my-tickets?status=active` |
| `waitingForRequester` | Waiting for You | own Tickets in Waiting for Requester | `/my-tickets?status=WAITING_FOR_REQUESTER` |
| `recentlyResolved` | Recently Resolved | own Tickets in Resolved with `statusChangedAt` in the last 7 days | `/my-tickets?status=RESOLVED` |
| `recentlyUpdated` (list) | Recently Updated | 5 most recently `updatedAt` own Tickets | `/tickets/:id` per row, "View all" → `/my-tickets` |

#### IT Staff dashboard metrics

| Metric key | Label | Calculation | Drill-down |
|---|---|---|---|
| `unassigned` | Unassigned | active Tickets with no owner | `/staff/queue?ticketOwnerId=unassigned` |
| `ownedByMe` | My Tickets | active Tickets owned by the session user | `/staff/queue?ticketOwnerId=me` |
| `byStatus` | By Status | count per active status | `/staff/queue?status=<s>` |
| `byItPriority` | By IT Priority | count per IT priority among active Tickets | `/staff/queue?itPriority=<p>` |
| `urgent` (list) | Urgent | up to 5 active Tickets with High IT priority, oldest `updatedAt` first | `/staff/tickets/:id` |
| `recentlyUpdated` (list) | Recently Updated | 5 most recently `updatedAt` Tickets (all statuses) | `/staff/tickets/:id` |
| `userCounts` (Administrator only) | Users | active users, inactive users, active per role | `/admin/users` |

## 6. UI Specification Summary

Full detail in `docs/lab-04/ui-spec.md`.
- **Navigation:** Requester = Dashboard · My Tickets · Create Ticket; IT Staff = Dashboard · My Queue; Administrator = Dashboard · Users (· Queue via dashboard link). Default landing page after login becomes the role's Dashboard. Active page is bold + pale-green underline.
- **Dashboards:** metric cards (label, value, "View" link, keyboard focusable), recent/urgent lists, Refresh button, skeleton/"Loading…" state, empty states, 403 forbidden page, safe-failure banner with Retry.
- **Actions Taken (staff Ticket Detail):** new tab/section with list (cards on mobile, table on desktop), "Add action" create mode, row opens view/edit mode; Follow-up Note shown/required only when the toggle is on; stale-conflict banner offering "Reload".
- **Requester Ticket Detail:** read-only Actions Taken list.
- **Workflow:** status control shows only permitted transitions; resolution gate failure shown as an inline explanation; submit buttons disabled while busy.
- **Cross-cutting:** Zen Green tokens only, desktop/tablet/mobile (< 768 px) layouts, no horizontal page scroll, visible focus, `aria-label` on icon-only controls, status never conveyed by color alone, private (Internal Notes) vs shared (Public Comments, Actions Taken) content visually distinct.

## 7. Data Changes

### 7.1 Model `ActionTaken` (new)
`id`, `ticketId` (FK → Ticket, required, `onDelete: Restrict`), `actionDateTime` (timestamptz), `description` (text), `result` (text), `performedById` (FK → User), `followUpRequired` (bool, default false), `followUpNote` (text, nullable), `attachmentNotes` (text, nullable), `version` (int, default 1), `createdAt`, `updatedAt`, `updatedById` (FK → User, nullable).
Indexes: `(ticketId, actionDateTime, createdAt, id)` for ordered listing; `(performedById)`.

### 7.2 Changes to `Ticket`
`+ version Int @default(1)`, `+ statusChangedAt DateTime`. Indexes added for dashboard queries: `(currentStatus)`, `(ticketOwnerId, currentStatus)`, `(requesterId, currentStatus)`, `(updatedAt)`.

### 7.3 Migration, backfill, recovery
- **Additive only**: no table or column is dropped or renamed (lesson from Lab 3, where the `RequesterUser` rename recreated the table). All existing Users, Tickets, Attachments, Public Comments and Internal Notes remain valid.
- Backfill: `version = 1`; `statusChangedAt = updatedAt` for existing Tickets. Legacy Tickets have zero Actions Taken (valid; shown with an empty state, counted normally in dashboards; Resolved legacy Tickets are not re-checked by the gate).
- Recovery: take `pg_dump` before `prisma migrate deploy`; rollback = restore the dump (documented and rehearsed on the dev database); a down-script dropping the new table/columns is documented in the README.

### 7.4 Seed (idempotent)
Seed uses `upsert` on stable keys (user e-mail, reserved Ticket numbers) and creates Actions only for seeded Tickets that have none, so repeated runs produce no duplicates. Data covers all 8 statuses, all priorities, owned and unassigned Tickets, Tickets with 0, 1 and several Actions (by different staff members), and enough data for both non-zero and zero dashboard metrics (one Requester with no Tickets). Existing accounts and the shared dev password are unchanged.

### 7.5 Database decisions (justified)
- **DD-1** Separate `ActionTaken` table (one-to-many) instead of a JSON column on Ticket: allows constraints, indexing, per-row audit fields and independent concurrency control.
- **DD-2** Integer `version` for optimistic concurrency instead of comparing `updatedAt`: immune to timestamp precision and clock issues and trivially testable.
- **DD-3** `onDelete: Restrict` and no delete endpoint: Actions form an audit trail.
- **DD-4** Dashboards are computed with aggregate queries (`groupBy`/`count`) on indexed columns, not stored counters, so counts can never drift from authoritative data.

## 8. API Contract (summary)

Exact shapes, validation and error bodies are in `docs/lab-04/api-spec.md`. Error body format is unchanged: `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/tickets/:id/actions-taken` | Requester (own, else 404), Staff, Admin | ordered list |
| POST | `/api/tickets/:id/actions-taken` | Staff, Admin | create (201) |
| PATCH | `/api/tickets/:id/actions-taken/:actionId` | Staff, Admin | edit with `expectedVersion` |
| PATCH | `/api/staff/tickets/:id` (extended) | Staff, Admin | status/priority with `expectedVersion`; matrix and gate enforced |
| GET | `/api/dashboard/requester` | Requester | requester metrics |
| GET | `/api/dashboard/staff` | Staff, Admin | staff metrics (+ `userCounts` for Admin) |

Status codes: 200/201 success; 400 validation (`VALIDATION_ERROR`); 401 unauthenticated; 403 role failure or `PASSWORD_CHANGE_REQUIRED`; 404 not found or not owned; 409 `STALE_UPDATE`, `INVALID_STATUS_TRANSITION`, `RESOLUTION_GATE_NOT_MET`, `ALREADY_RESOLVED_INDICATED`; 500 generic safe error (no stack trace). Duplicate-submit protection: client-side busy lock plus optional `Idempotency-Key` header on `POST .../actions-taken` (same key + same user returns the original result, no second row). All Lab 2/3 endpoints are unchanged except that Ticket responses now include `version` and `statusChangedAt`.

## 9. Acceptance Criteria

Each AC maps to at least one test in `docs/lab-04/tests.md`.

- **AC-01** Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated user as Performed by.
- **AC-02** Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned.
- **AC-03** Given an IT Staff member who is not the Ticket Owner, when they create an Action, then it succeeds and the Ticket Owner is unchanged.
- **AC-04** Given Follow-Up Required? is true and no note, when the Action is submitted, then the API returns 400 and the UI shows the error next to the field with entered data preserved.
- **AC-05** Given a Requester, when they POST or PATCH an Action Taken, then the API returns 403 and nothing is stored.
- **AC-06** Given a Requester viewing their own Ticket, then all its Actions Taken are listed read-only in stable order; for another Requester's Ticket the API returns 404.
- **AC-07** Given two users editing the same Action or Ticket, when the second saves with a stale `expectedVersion`, then 409 `STALE_UPDATE` is returned, nothing is overwritten, and the UI offers Reload.
- **AC-08** Given a Ticket without owner or without any Action, when staff try In Progress → Resolved, then 409 `RESOLUTION_GATE_NOT_MET` is returned, even when called directly.
- **AC-09** Given a Ticket with an owner and ≥ 1 Action, when staff resolve it, then status becomes Resolved, `statusChangedAt` is set and the summary refreshes.
- **AC-10** Given any transition outside the matrix (including →Closed from In Progress, anything out of Cancelled), then 409 `INVALID_STATUS_TRANSITION`.
- **AC-11** Given the Requester indicates "problem appears resolved", then the flag is set, status is unchanged, and the Resolved gate is still required.
- **AC-12** Given a Cancelled Ticket, when staff try to create or edit an Action, then the request is rejected.
- **AC-13** Given Staff dashboard data, then `unassigned`, `ownedByMe`, `byStatus`, `byItPriority`, `urgent`, `recentlyUpdated` equal the results of independent database queries.
- **AC-14** Given an Administrator, then the staff dashboard additionally contains `userCounts`; Staff and Requesters never receive it.
- **AC-15** Given no matching records, then metrics return `0` and lists `[]`, and the UI shows empty states.
- **AC-16** Given a dashboard card, when activated by mouse or keyboard, then it opens the documented drill-down with the matching filter applied.
- **AC-17** Given the migration is applied to a Lab 3 database, then all existing Users, Tickets, Attachments, Comments and Notes are still present and valid.
- **AC-18** Given the seed is run twice, then no duplicates are created and all dashboard states (zero and non-zero) are demonstrable.
- **AC-19** Given a double click or retry on "Save action", then exactly one Action is created.
- **AC-20** Given each role, then the navigation shows only that role's items, unauthorized routes show `/forbidden`, and the active page is indicated.
- **AC-21** Given the full Lab 1–3 regression suites, then all pass without skipped tests.
- **AC-22** Given desktop, tablet and mobile viewports, then every Lab 4 screen has no horizontal page scroll, clipped or overlapping controls, and visible keyboard focus.
- **AC-23** Given the application running end to end, then there are no console errors, debug logs, placeholder texts or broken links.

## 10. Definition of Done (Product)

- [ ] `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md` committed **before** implementation PRs (evidence screenshot).
- [ ] Every AC maps to ≥ 1 test; `tests.md` file paths match real files; no test skipped or disabled.
- [ ] Migration is additive, verified on a Lab 3 database; recovery steps documented and rehearsed.
- [ ] Seed idempotent (run twice, verified).
- [ ] Every write enforced by the backend; role/ownership matrix tested (401/403/404/409).
- [ ] Transition matrix and resolution gate tested at API level and UI level.
- [ ] Stale-update and duplicate-submit protection tested.
- [ ] Dashboard numbers verified against independent DB queries.
- [ ] Server, client and Playwright (desktop/tablet/mobile) suites all green on `main`; Lab 1–3 regression included.
- [ ] Zen Green consistency, accessibility and responsive checklist completed with real screenshots (`artifacts/lab-04/screenshots/`).
- [ ] No console errors, debug `console.log`, obsolete Lab 2/3 UI, placeholder text or unfinished controls.
- [ ] README current (setup, migrate, seed, test, demo accounts).
- [ ] All Issues in Done on the Kanban; PRs reviewed; `reviewer.md` and `ai-use.md` complete (English only).
- [ ] `lab4-staging` merged into `main` via release PR; submission PDF "Answer Part 1–9" produced.

## 11. Assumptions and Decisions

- **D-01** Handout §10/§12 and the grading rubric mention "assign", "complete", "cancel", "inactive-assignee" for Actions Taken, but the stakeholder request lists no assignee or action status. This spec follows the stakeholder field list (Performed by is automatic). Part 6 evidence is therefore: list, create, edit, validation, role restrictions, stale update, safe failures, responsive. *To confirm with the instructor/TA; if an assignee is required it would be an additive column `assigneeId` with an active-user check.*
- **D-02** "Action Date/Time" (request) and "Action create date/time" (UI section) are reconciled as an editable `actionDateTime` (default now) plus a system `createdAt`.
- **D-03** Actions Taken are editable but never deleted; edits are audited by `updatedAt`/`updatedById`/`version`.
- **D-04** Resolution gate = Ticket Owner exists + at least one Action Taken (the minimum that makes "IT Staff must review the work" checkable by the backend).
- **D-05** "Mark Problem as Resolved" (Requester) is available in Open, In Progress, Waiting for Requester and Reopened. This resolves the Lab 3 mismatch (ui-spec said "non-terminal", code showed it only at Resolved) and realigns code and docs; E2E-02 from Lab 3 is updated accordingly.
- **D-06** Only IT Staff/Administrators change status; Requesters have no reopen/cancel in this sprint (no new unapproved features).
- **D-07** Dashboard windows are 7 days rolling in `Asia/Bangkok`; lists capped at 5.
- **D-08** Internal Notes do not update `Ticket.updatedAt`.
- **D-09** Lab 3 cleanup items are in scope: remove `console.log("DEBUG …")` and the server request logger (keep `uncaughtException`/`unhandledRejection` handlers), synchronize `tests.md` file names, fix the Lab 3 `reviewer.md` heading.
