# Lab 3 UI Specification — Zen Green Theme (extended)

This document extends `docs/lab-02/ui-spec.md`. All Lab 2 tokens, field
states, button hierarchy, and responsive rules remain unchanged and in
force; only what is new or different for Lab 3 is documented here.

## 1. New/Reused Tokens

No new color tokens are introduced. Two additional semantic uses of
existing tokens:

| Use | Token |
|---|---|
| Internal Note panel background | `--color-readonly-bg` (`#F1F0E8`) with a `--color-warning` (`#B5770A`) left border accent, to read as "private/internal" without introducing a new color |
| Role badge — Administrator | `--color-primary` background, white text (the one place a badge uses the primary color, to visually mark it as the highest-privilege role) |
| Role badge — IT Staff | `--color-pale-green` background, `--color-secondary` text |
| Role badge — Requester | neutral `#EAF1FB` background, `#1D4E89` text (reused from the Lab 2 status badge palette) |

## 2. Login Screen

- Centered card, max-width 420px, consistent with the Lab 2 Development
  Requester Selection card it replaces.
- Fields: Email (type `email`), Password (type `password` with a
  show/hide toggle icon — the toggle is an icon-only control and
  requires an `aria-label`, per the Lab 2 accessibility rule).
- Below the fields: a single error banner (`--color-error-bg` /
  `--color-error`) shown only after a failed attempt, with the exact
  generic text "Invalid email or password." — never a field-specific
  message, per BR-06/BR-07.
- Sign In button: `--color-primary` fill, busy state ("Signing in…" +
  spinner, disabled) while the request is in flight, matching the Lab 2
  Submit-button busy pattern.
- "Forgot your password?" link is rendered but does not navigate
  anywhere active (out of scope per the handout); it is visually muted
  (`--color-text-muted`) rather than styled as a live link, so it does
  not imply working functionality.

## 3. Change Password Screen (mandatory first-login)

- Shown in place of any other authenticated screen whenever the current
  user's `mustChangePassword` is true; there is no way to navigate past
  it (no visible nav, no back button).
- Fields: Current (temporary) password, New password, Confirm new
  password — each with the same show/hide toggle as Login.
- A live checklist below the New Password field, one line per rule
  (≥8 characters, upper+lower case, a number, a special character), each
  line prefixed with a checkmark icon that turns from muted to
  `--color-success` as the rule is satisfied while typing. The checklist
  itself is the validation feedback — no separate error banner is shown
  for password strength; a mismatch between New and Confirm shows a
  single inline message under the Confirm field.
- Continue button: disabled until every rule passes and the two new
  password fields match; busy state while submitting.
- On success, the user is taken directly into their role's default
  landing screen (Requester → My Tickets, IT Staff → Ticket Queue,
  Administrator → User Management) — no separate confirmation screen.

## 4. Application Shell (updated from Lab 2)

- The Requester badge + "Change Requester" action from Lab 2 is fully
  replaced by: authenticated user's name, a role badge (Section 1), and
  a "Logout" tertiary action.
- Navigation links are filtered by role — a user never sees a link to a
  destination their role cannot reach, consistent with the handout's
  instruction that a hidden control is not a security control (the
  backend independently enforces every route/endpoint regardless of
  what the nav shows):
  - Requester: My Tickets, Create Ticket
  - IT Staff: Ticket Queue
  - Administrator: User Management (does not automatically see Ticket
    Queue unless the approved authorization matrix grants it — Lab 3
    keeps Administrator and IT Staff duties separate per Section 4.3 of
    the handout)
- Active-link styling (bold + pale-green underline) is unchanged from
  Lab 2.

## 5. IT Staff Ticket Queue

- Header row: search input (placeholder "Search by ticket number or
  summary…"), a "Filters" control that expands Category / Requested
  Priority / IT Priority / Current Status / Ticket Owner (including an
  explicit "Unassigned" option) — collapsed behind one button on mobile
  to save space, consistent with the handout's warning against an
  "unreadable mega-grid."
- Desktop table columns (chosen to match what an IT Staff member needs
  to triage without opening the ticket): Ticket No., Created Date,
  Summary, Requested Priority, IT Priority, Current Status, Ticket
  Owner, Last Updated.
- Ticket Owner column shows the owner's name, or a muted "Unassigned"
  label with an inline "Claim" button when there is no owner — claiming
  is a one-click action directly from the Queue, no need to open Ticket
  Detail first.
- Mobile card: mirrors the Lab 2 My Tickets card pattern (Ticket No. +
  status badge top row, Summary second row, Requested/IT Priority badges
  + Ticket Owner or Claim button in the footer row).
- Sorting: same column-header click pattern as Lab 2 My Tickets, default
  sort Created Date descending.
- Not ownership-scoped: unlike Lab 2 My Tickets, the Queue shows every
  Ticket regardless of who created or owns it — no empty/no-results
  distinction based on "my own tickets," only the standard
  zero-results-for-current-filters state.

## 6. IT Staff Ticket Detail

Extends the Lab 2 Ticket Detail layout (same header field grouping,
same read-only field styling for fields IT Staff cannot edit):

- **Ticket Owner**: now an editable dropdown of active IT Staff/
  Administrator users, plus "Unassigned"; changing it calls the
  claim/reassign endpoint immediately (with a brief saving indicator),
  not deferred to a separate Save action, so the Queue and other staff
  members see the change right away.
- **IT Priority**: editable dropdown (Low/Medium/High), independent of
  the read-only Requested Priority field next to it — the two fields sit
  side by side so the contrast between "what the Requester asked for"
  and "what IT Staff decided" is visually obvious.
- **Current Status**: editable dropdown, but only options that are valid
  next transitions from the current status (per the matrix in
  `api-spec.md`) are shown — an invalid transition is not just
  rejected server-side, it is never offered as a choice.
- **Communication tabs**, below the header (reusing the Lab 2 tabbed
  panel pattern already used for Attachments): "Public Comments",
  "Internal Notes", "Attachments" (unchanged from Lab 2). The Internal
  Notes tab body uses the readonly-background + warning-accent-border
  treatment from Section 1 so it is never visually confusable with
  Public Comments even at a glance, and its tab label carries a small
  lock icon as a non-color indicator of its restricted nature.
- Each Comment/Note entry: author name, role badge, timestamp, content —
  same visual pattern as the Lab 1 handout's illustrative ticket-detail
  comment list, reused here for both panels.

## 7. Requester Ticket Detail (extended)

- Adds a "Public Comments" panel identical in structure to the IT
  Staff-visible one (Section 6), positioned below Attachments.
- Adds a "Mark Problem as Resolved" secondary button, visible only when
  the Ticket is not already in a terminal state (Resolved/Closed/
  Cancelled) and `problemAppearsResolved` is not already true. Once
  clicked, it becomes a disabled/checked state
  ("✓ You marked this as resolved") rather than disappearing, so the
  Requester has confirmation their action was recorded.
- No Internal Notes tab is rendered at all for a Requester (not merely
  hidden/disabled) — consistent with never exposing that such content
  exists (AC-04).

## 8. Administrator User Management

Two-pane layout on desktop (list left/top ~60%, create/edit form panel
right ~40%, matching the illustrative screen in the handout); stacks
vertically on mobile with the form appearing as a full-width panel below
the list once "Create User" or a row's "Edit" is activated.

- **List**: Name, Email, Role badge, Status badge (Active/Inactive,
  reusing the Lab 2 success/muted badge convention), Edit action per
  row. Search box + role-filter dropdown above the list. No pagination,
  no multi-column sort, no multiple simultaneous filters — intentionally
  minimal per the handout's explicit exclusions.
- **Create/Edit form**: Full Name, Email, Role (select), Active
  (toggle switch, reused visual pattern from the handout's illustrative
  screen), and a separate "Set New Initial Password" action that opens a
  small inline confirmation rather than a text field (the Administrator
  never types or sees the new password itself in this flow — the system
  generates one and flags `mustChangePassword`).
- **Deactivate** is a destructive secondary button (Section 5 of the
  Lab 2 ui-spec's button hierarchy — red outline, confirmation
  required) at the bottom of the edit form; it is disabled (not hidden)
  with a tooltip explaining why when editing the current Administrator's
  own account or the last active Administrator, per BR-30/BR-31 — a
  visible-but-disabled control communicates the rule instead of making
  the option silently vanish.
- **Validation**: duplicate-email and required-field errors follow the
  same inline-under-field pattern as Lab 2 Create Ticket.

## 9. Screen Modes and Feedback

Every screen above follows the same state model already defined in
`docs/lab-02/ui-spec.md` Section 7 (initial / loading / validation /
submitting / success / failure), extended with two Lab 3-specific
states used where relevant:

- **Forbidden**: shown when an authenticated user's role does not permit
  a screen/action they somehow reached (e.g. a stale link) — same visual
  treatment as the Requester Ticket Detail "not found" state from Lab 2
  (a calm message + a button back to the user's own default screen),
  never a raw error page.
- **Conflict**: used for rejected status transitions and duplicate-email
  submissions — an inline message near the control that triggered it,
  not a full-page error.

## 10. Responsive and Accessibility

Unchanged from `docs/lab-02/ui-spec.md` Sections 8–9 (same breakpoints,
same focus-indicator and label requirements). Additional Lab 3-specific
accessibility notes:

- The password show/hide toggle, the Claim button, and the Edit/
  Deactivate icon-adjacent buttons all require `aria-label`s (icon-only
  or icon-plus-ambiguous-text controls).
- The Current Status dropdown announces the currently selected status
  via its native `<select>` semantics; no custom widget replaces it, to
  keep keyboard and screen-reader support free.

## 11. Screenshot Paths

```
artifacts/lab-03/screenshots/authentication/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/staff-queue/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/staff-ticket-detail/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/user-management/{desktop,tablet,mobile}.png
```
