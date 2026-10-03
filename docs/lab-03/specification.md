# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal

Replace the Lab 2 Development Requester selector with real authentication
and role-based authorization, so that Requesters, IT Staff, and
Administrators each work through their own secure identity. Requesters
keep every Lab 2 capability (now backed by their authenticated account)
and gain Public Comments plus a "Problem Appears Resolved" action. IT
Staff gain an operational Ticket Queue and an extended Ticket Detail
screen (ownership, IT Priority, status workflow, Public Comments,
Internal Notes). Administrators gain a minimalist User Management screen.
Every protected operation is enforced on the backend, never by hiding a
frontend control.

## 2. Stakeholder Request Interpretation

The temporary "pick a Requester" screen from Lab 2 was only ever a testing
shortcut. The system now needs real accounts: a user signs in with an
email and password, is forced to set a real password on first login if
they were given a temporary one, and then only sees the navigation and
actions their role permits. Requesters keep creating and viewing their own
tickets exactly as before, just under their real login instead of a
dropdown. IT Staff need a shared queue to find and work tickets — claim
them, set priority, move them through status, and talk to the Requester
via comments while keeping private notes IT-only. Administrators need a
simple screen to onboard and manage these accounts, nothing more elaborate
than that for now.

## 3. Scope

### Included
- Authentication: login, logout, current-user retrieval
- Mandatory first-login password change for accounts issued an initial
  password
- Role-based navigation and server-side authorization for Requester, IT
  Staff, Administrator
- Migration of the Lab 2 `RequesterUser` concept into a real `User` model
  with hashed credentials and roles
- Continued Requester ownership protection for all Lab 2 Ticket and
  Attachment functions, now keyed off the authenticated identity
- Public Comments (Requester + IT Staff + Administrator visible) and
  Internal Notes (IT Staff + Administrator only)
- Requester "Problem Appears Resolved" action (does not close the Ticket)
- IT Staff Ticket Queue: search, filter, sort, pagination
- IT Staff Ticket Detail: claim/reassign ownership, set IT Priority,
  permitted status transitions
- Administrator User Management: list, search, optional role filter,
  create, edit, activate/deactivate, set a new initial password
- Migration/regression evidence that the completed Lab 2 increment still
  works end-to-end under real authentication

### Excluded
- Email invitations, password-reset email, MFA, social login, SSO
- Self-registration / Requester-created accounts
- Actions Taken by IT Staff (deferred to Lab 4)
- Formal SLA calculation, escalation rules, notification services
- Dashboards and KPI analytics beyond simple queue counts
- Multi-tenant organizations, departments, customer administration
- Production-grade deployment or cloud infrastructure changes
- Multiple roles per user
- User deletion, bulk operations, import/export, account-history screens
- Department, organization, profile-photo, or other extended user-profile
  management
- Email delivery of initial passwords or reset links
- Account unlocking, administrator-approval workflows, advanced identity
  management
- Mandatory pagination, multi-column sorting, or multiple simultaneous
  filters on the User Management list

## 4. Functional Requirements

- FR-01: The system shall authenticate a user by email and password and
  establish an authenticated session.
- FR-02: The system shall reject authentication for inactive accounts
  with a safe, generic message.
- FR-03: The system shall force a user flagged as requiring a password
  change into a Change Password screen before any other authenticated
  screen is reachable.
- FR-04: The system shall expose the current authenticated user's id,
  name, email, and role to the frontend.
- FR-05: The system shall allow the current user to log out, invalidating
  their authenticated session.
- FR-06: The system shall derive Requester ownership for all Ticket and
  Attachment operations from the authenticated identity, never from a
  client-supplied id.
- FR-07: The system shall allow a Requester to post a Public Comment on
  an owned Ticket.
- FR-08: The system shall allow a Requester to mark a Ticket as
  "problem appears resolved" without changing its formal Current Status
  to Resolved or Closed.
- FR-09: The system shall provide IT Staff a paginated, searchable,
  filterable, sortable Ticket Queue covering all Tickets (not
  ownership-scoped).
- FR-10: The system shall allow IT Staff to open any Ticket's detail from
  the Queue.
- FR-11: The system shall allow IT Staff to claim an unassigned Ticket or
  reassign an already-owned Ticket to another active IT Staff/Admin user.
- FR-12: The system shall allow IT Staff to set IT Priority independently
  of Requested Priority.
- FR-13: The system shall allow IT Staff to change Current Status to any
  permitted next status per the transition matrix (Section 5.3 of the
  UI/API specs).
- FR-14: The system shall allow IT Staff to post Public Comments and
  Internal Notes on any Ticket.
- FR-15: The system shall reject any attempt by a Requester to read or
  write Internal Notes, without disclosing note content or count.
- FR-16: The system shall allow an Administrator to list users with
  search by name/email and an optional role filter.
- FR-17: The system shall allow an Administrator to create a user with
  name, email, one role, activation state, and an initial password that
  the user must change at next login.
- FR-18: The system shall allow an Administrator to edit a user's name,
  email, role, and activation state.
- FR-19: The system shall allow an Administrator to set a new initial
  password for an existing user, flagging it for mandatory change.
- FR-20: The system shall prevent an Administrator from deactivating
  their own account.
- FR-21: The system shall prevent the last active Administrator account
  from being deactivated or having its role changed away from
  Administrator.

## 5. Business Rules

**Authentication and sessions**
- BR-01: Only an active user with valid credentials may authenticate.
- BR-02: A user marked as requiring a password change cannot enter the
  normal application until a new valid password is saved.
- BR-03: The authenticated user identity, not a `requesterId` (or any
  other id) supplied by the client, determines ownership of Requester
  operations.
- BR-04: Public Comments are visible to the Requester, IT Staff, and
  Administrator. Internal Notes are visible only to IT Staff and
  Administrator.
- BR-05: A Requester may indicate that the problem appears resolved, but
  cannot formally set the Ticket to Resolved or Closed.
- BR-06: Login attempts with a correct email but wrong password, and
  attempts with an unknown email, return the same generic
  "Invalid email or password" message — the system never discloses which
  part was wrong.
- BR-07: Login attempts against an inactive account return the same
  generic invalid-credentials message as a wrong password (BR-06); no
  separate "this account is disabled" message is shown, to avoid
  confirming account existence to an unauthenticated caller.
- BR-08: Passwords are never stored or logged in plaintext; only a salted
  hash is persisted.
- BR-09: A new password (whether set at first login or by an
  Administrator reset) must be at least 8 characters and include upper
  and lower case letters, a number, and a special character.
- BR-10: Logout invalidates the current session/token server-side; a
  previously issued session cannot be reused after logout.

**Requester regression**
- BR-11: Every Lab 2 Ticket and Attachment business rule (BR-01 through
  BR-40 in `docs/lab-02/specification.md`) continues to apply unchanged,
  with "the selected Development Requester" replaced by "the
  authenticated Requester."
- BR-12: The Development Requester selector, its UI route, and its
  `sessionStorage` state are fully removed; no code path can bypass real
  authentication to reach a Requester screen.

**Ticket ownership and IT Staff assignment**
- BR-13: A Ticket may have zero or one primary Ticket Owner, who must be
  an active IT Staff or Administrator user.
- BR-14: Any active IT Staff or Administrator may claim an unassigned
  Ticket, making themselves the Ticket Owner.
- BR-15: Any active IT Staff or Administrator may reassign an
  already-owned Ticket to a different active IT Staff or Administrator
  user.
- BR-16: A Requester cannot set, change, or clear Ticket Owner.

**IT Priority and status**
- BR-17: IT Priority initially copies Requested Priority at Ticket
  creation and is thereafter independent; only IT Staff or Administrator
  may change it.
- BR-18: Required Ticket statuses are: New, Open, In Progress, Waiting
  for Requester, Resolved, Closed, Reopened, Cancelled.
- BR-19: Only IT Staff or Administrator may change Current Status; a
  Requester's "problem appears resolved" action (FR-08) does not go
  through this transition path.
- BR-20: Permitted transitions (see `api-spec.md` for the full matrix):
  New → Open; Open → In Progress; In Progress → Waiting for Requester;
  In Progress → Resolved; Waiting for Requester → In Progress; Resolved →
  Closed; Resolved → Reopened; Closed → Reopened; any of Open, In
  Progress, Waiting for Requester → Cancelled. All other transitions are
  rejected.
- BR-21: A Ticket cannot move to Closed unless it has passed through
  Resolved first (i.e. no direct Open/In Progress → Closed transition).

**Public Comments and Internal Notes**
- BR-22: Public Comments and Internal Notes are append-only in Lab 3; no
  edit or delete operation exists.
- BR-23: Each Comment/Note records its author (from the authenticated
  identity) and a backend-generated timestamp; the author cannot be
  supplied by the client.
- BR-24: Empty or whitespace-only content is rejected for both Comments
  and Notes.
- BR-25: Comment/Note content is limited to 2000 characters and is
  rendered as plain text (no HTML execution) to prevent stored XSS.

**Administrator rules**
- BR-26: An Administrator may create a user with exactly one of
  Requester, IT Staff, or Administrator as their role.
- BR-27: An Administrator may update a user's name, email, role, and
  activation state.
- BR-28: Email addresses are unique across all users (case-insensitive
  comparison); creating or editing a user to a duplicate email is
  rejected.
- BR-29: An Administrator may set a new initial password for any user,
  which flags that user's account as requiring a password change at next
  login.
- BR-30: An Administrator cannot deactivate their own account.
- BR-31: The system must always retain at least one active Administrator;
  deactivating or changing the role of the last active Administrator is
  rejected.
- BR-32: Deactivation, not deletion, is the only way to remove a user's
  access; deactivated users cannot authenticate (BR-01) but their
  historical Tickets, Comments, Notes, and ownership remain intact.

**Migration from Lab 2**
- BR-33: Every Lab 2 seeded Development Requester is migrated into the
  `User` table with role `REQUESTER` and a documented local-development
  initial password, preserving their original id so existing Ticket
  `requesterId` foreign keys remain valid without a data rewrite.
- BR-34: Existing Lab 2 Tickets, Attachments, Categories, and Related
  Systems are preserved unchanged by the migration; no Lab 2 data is
  dropped or reset.

## 6. UI Specification Summary

See `docs/lab-03/ui-spec.md` for full detail. Summary:

- **Login**: email + password fields, inline validation, busy state on
  submit, generic safe error banner on failure (BR-06/BR-07), "Forgot
  your password?" link shown but inert (out of scope per Section 4.2 of
  the handout — disabled/no-op is acceptable, just not misleading users
  into thinking it works if clicked).
- **Change Password** (mandatory, first login with an initial password):
  current (temporary) password, new password, confirm new password,
  live password-rule checklist, Continue button disabled until all rules
  pass and the two new-password fields match.
- **Application shell**: replaces the Requester badge with the
  authenticated user's name + role badge; adds a Logout action; nav links
  are role-filtered (Requester sees My Tickets/Create Ticket; IT Staff
  sees Ticket Queue; Administrator sees Admin/User Management — an
  Administrator is not automatically shown Ticket Queue unless the
  approved matrix grants it, per Section 4.3 of the handout).
- **Requester Ticket Detail** (extended from Lab 2): adds a Public
  Comments panel (post + list) and a "Mark Problem as Resolved" action,
  positioned below the existing Attachments panel.
- **IT Staff Ticket Queue**: search bar, filter row (Category, Requested
  Priority, IT Priority, Current Status, Ticket Owner incl. "Unassigned"),
  sortable columns (Ticket No., Created Date, Requested Priority, IT
  Priority, Current Status, Last Updated), desktop table / mobile cards,
  Claim action inline for unassigned rows.
- **IT Staff Ticket Detail**: Ticket header fields as Lab 2 but with IT
  Priority and Ticket Owner now editable dropdowns; Current Status as an
  editable dropdown restricted to permitted next values; tabs/panels for
  Public Comments, Internal Notes (visually distinct background/border
  color so it cannot be mistaken for public), and Attachments (unchanged
  from Lab 2).
- **Administrator User Management**: two-pane layout — user list (Name,
  Email, Role badge, Status badge, Edit action) with search + role
  filter on the left/top, and a create/edit form panel on the right
  (name, email, role select, active toggle, "Set New Initial Password"
  action, Save/Cancel, Deactivate as a destructive secondary action).

## 7. Data Changes

- `User` (replaces/absorbs `RequesterUser`): `id`, `name`, `email`
  (unique, case-insensitive), `passwordHash`, `role` (enum: `REQUESTER`,
  `IT_STAFF`, `ADMINISTRATOR`), `isActive` (default `true`),
  `mustChangePassword` (default `true` for admin-created accounts),
  `createdAt`, `updatedAt`.
- `Ticket`: add `ticketOwnerId` (nullable FK → `User`, must reference an
  `IT_STAFF` or `ADMINISTRATOR` user), change `itPriority` to be
  independently settable (already nullable from Lab 2), extend
  `currentStatus` enum to the full Lab 3 status list (New, Open, In
  Progress, Waiting for Requester, Resolved, Closed, Reopened,
  Cancelled), add `problemAppearsResolved` (boolean, default `false`,
  set by the Requester action).
- `Comment`: `id`, `ticketId` (FK → Ticket), `authorId` (FK → User),
  `content`, `visibility` (enum: `PUBLIC`, `INTERNAL` — a single table
  distinguishing Public Comments from Internal Notes rather than two
  separate tables, to share validation/rendering logic), `createdAt`.
- `requesterId` on `Ticket` now references `User` (role `REQUESTER`)
  instead of the removed `RequesterUser`.

**Indexes**: index on `Ticket.ticketOwnerId` (queue filtering), index on
`Ticket.currentStatus` (already present from Lab 2, reused for queue),
index on `Comment.ticketId`, unique index on `User.email`
(case-insensitive via a citext column or a lowercased shadow column,
whichever the chosen Postgres/Prisma setup supports).

**Migration strategy**: rename the Lab 2 `RequesterUser` table/model to
`User` in place (preserving ids), add the new columns
(`passwordHash`, `role`, `mustChangePassword`) with safe defaults, then
backfill `role = 'REQUESTER'` and a documented seeded password hash for
every pre-existing row, so Lab 2 Ticket foreign keys never need to change.

## 8. API Contract

See `docs/lab-03/api-spec.md` for full request/response shapes and the
complete status-transition matrix. Endpoints:

| Method | Path | Purpose | Min. role |
|---|---|---|---|
| POST | `/api/auth/login` | Authenticate, establish session | Public |
| POST | `/api/auth/logout` | Invalidate session | Any authenticated |
| GET | `/api/auth/me` | Current user id/name/email/role | Any authenticated |
| POST | `/api/auth/change-password` | Set a new password (mandatory or voluntary) | Any authenticated |
| POST/GET/etc. | Lab 2 Ticket/Attachment endpoints | Unchanged paths, now authenticated | Requester (own), IT Staff/Admin (all) |
| POST | `/api/tickets/:id/comments` | Post a Public Comment or Internal Note | Requester (PUBLIC only, own ticket), IT Staff/Admin (both) |
| GET | `/api/tickets/:id/comments` | List comments; `INTERNAL` filtered out for Requesters | Requester (own), IT Staff/Admin |
| POST | `/api/tickets/:id/resolve-indication` | Requester marks problem as resolved | Requester (own) |
| GET | `/api/staff/tickets` | IT Staff Ticket Queue (search/filter/sort/pagination) | IT Staff/Admin |
| GET | `/api/staff/tickets/:id` | Retrieve one Ticket for staff operations | IT Staff/Admin |
| POST | `/api/staff/tickets/:id/claim` | Claim/assign/reassign ownership | IT Staff/Admin |
| PATCH | `/api/staff/tickets/:id` | Update IT Priority and/or Current Status | IT Staff/Admin |
| GET | `/api/admin/users` | List users (search, role filter) | Administrator |
| POST | `/api/admin/users` | Create a user | Administrator |
| PATCH | `/api/admin/users/:id` | Update name/email/role/active | Administrator |
| POST | `/api/admin/users/:id/reset-password` | Set new initial password | Administrator |

Session identity is carried via an httpOnly cookie (see `api-spec.md` for
the full authentication/session decision record) rather than a header,
since Lab 3 introduces real credentials that must not be readable by
client-side JavaScript.

## 9. Acceptance Criteria

- AC-01: Given an active user with valid credentials, when the user logs
  in, then the backend establishes authenticated access and returns the
  permitted user identity and role.
- AC-02: Given a user who must change the initial password, when login
  succeeds, then normal application screens remain unavailable until a
  valid new password is saved.
- AC-03: Given an authenticated Requester, when the client supplies
  another `requesterId`/user id, then the backend still applies the
  authenticated identity and does not return another Requester's data.
- AC-04: Given a Requester account, when an Internal Note endpoint is
  requested, then the operation is rejected without exposing note
  content or count.
- AC-05: Given invalid credentials (wrong password or unknown email),
  when login is attempted, then the same generic error message is shown
  in both cases.
- AC-06: Given an inactive account with otherwise correct credentials,
  when login is attempted, then the same generic invalid-credentials
  error is shown (no distinct "inactive" message).
- AC-07: Given a logged-in user, when they log out, then a subsequent
  request using the old session is rejected as unauthenticated.
- AC-08: Given an unassigned Ticket, when IT Staff clicks Claim, then
  that Ticket's owner becomes the claiming IT Staff user.
- AC-09: Given a Ticket owned by IT Staff A, when IT Staff B reassigns it
  to themselves, then the Ticket Owner updates to IT Staff B.
- AC-10: Given a Ticket in status Open, when IT Staff attempts to set it
  directly to Closed, then the transition is rejected.
- AC-11: Given a Ticket in status Resolved, when IT Staff sets it to
  Closed, then the transition succeeds.
- AC-12: Given a Requester posts a Public Comment, when IT Staff views
  the Ticket, then the comment is visible; when IT Staff posts an
  Internal Note, then it is not visible to the Requester.
- AC-13: Given an owned Ticket, when the Requester uses "Mark Problem as
  Resolved," then `problemAppearsResolved` becomes true but Current
  Status is unchanged.
- AC-14: Given the IT Staff Ticket Queue, when a Requester (non-staff)
  requests it directly via the API, then the request is rejected.
- AC-15: Given an Administrator creates a user with a duplicate email,
  when the form is submitted, then a clear validation error is shown and
  no user is created.
- AC-16: Given the only active Administrator account, when that
  Administrator attempts to deactivate their own account, then the
  action is rejected.
- AC-17: Given the only active Administrator account, when a different
  Administrator (in a multi-admin scenario) attempts to deactivate or
  demote it, then the action is rejected if it is the last active one.
- AC-18: Given a user with a newly reset initial password, when they next
  log in, then they are forced into the Change Password screen before
  reaching any other screen.
- AC-19: Given a non-Administrator, when they request any
  `/api/admin/*` endpoint directly, then the request is rejected.
- AC-20: Given all Lab 2 Requester functional tests, when re-run against
  Lab 3 under real authentication, then they pass without modification
  to their assertions (only to how the test authenticates).

## 10. Definition of Done

**Product completion**
- [ ] All FR-01 through FR-21 implemented and demonstrable.
- [ ] All Business Rules (BR-01–BR-34) enforced server-side.
- [ ] Every Acceptance Criterion (AC-01–AC-20) has at least one passing,
      traceable automated test.
- [ ] No required test is skipped, disabled, or commented out on `main`.
- [ ] Every protected endpoint rejects unauthenticated and
      under-privileged access, verified by an explicit test per
      endpoint (not just happy-path coverage).
- [ ] All Lab 2 Requester functionality passes its full regression suite
      under real authentication (AC-20).
- [ ] IT Staff Queue, IT Staff Ticket Detail, and Administrator User
      Management conform to `ui-spec.md` and the Zen Green token table.
- [ ] Responsive behavior verified at desktop/tablet/mobile per Lab 2's
      established breakpoints.
- [ ] Passwords are hashed, never logged, and never returned in any API
      response.
- [ ] README updated with local seeded credentials and migration notes.

**Course delivery**
- [ ] GitHub Issues 12–19 created, each moved through the full Kanban
      flow to Done.
- [ ] Every Issue implemented on its own feature branch, merged into
      `lab3-staging` via a peer-reviewed PR.
- [ ] One release PR `lab3-staging → main`, reviewed and merged.
- [ ] `docs/lab-03/reviewer.md` and `docs/lab-03/ai-use.md` completed.
- [ ] Directory structure matches Section 12 of the handout.

## 11. Assumptions and Decisions

- Session identity is carried via an httpOnly, signed cookie rather than
  a bearer token in `localStorage`, to keep credentials inaccessible to
  client-side JavaScript (reduces XSS impact) — not fixed by the handout,
  chosen as the more defensible default for this course stack.
- Public Comments and Internal Notes are modeled as one `Comment` table
  with a `visibility` enum rather than two separate tables, to avoid
  duplicating validation/rendering code; this is an implementation
  choice, not a change to the visible behavior required by BR-04.
- The status transition matrix (BR-20) is defined explicitly in this
  document since the handout only lists the required statuses, not their
  allowed transitions — this was the most consequential undocumented
  decision in the whole contract, since it directly gates a large share
  of AC-10/AC-11-style tests.
- Login/inactive-account error messages are deliberately identical
  (BR-06/BR-07) to avoid account-enumeration and account-status leaks,
  going slightly beyond the handout's minimum ("clear response for
  inactive accounts without exposing unnecessary account information")
  by collapsing it into the same message as any other invalid-credential
  case.
- The Lab 2 → Lab 3 migration renames `RequesterUser` to `User` in place
  rather than creating a parallel table and re-pointing foreign keys, to
  minimize migration risk to existing Ticket data (BR-33/BR-34).
