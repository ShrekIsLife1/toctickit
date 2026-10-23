# TokTickIT — Lab 4 UI Specification (Sprint 4)

Extends `docs/lab-03/ui-spec_lab03.md` and `docs/lab-02/ui-spec.md`. Lab 4 preserves the **Zen Green** design language, token system, component hierarchy, accessibility conventions, and responsive behaviors across all views.

---

## 1. Design System & Theme Consistency (Zen Green)

### 1.1 Color Tokens & Semantics
All colors remain strictly mapped to CSS custom properties defined in `index.css`:
- **Primary / Brand Accent**: `--color-primary` (`#2D5A27` - Forest Green)
- **Secondary / Dark Neutral**: `--color-secondary` (`#1A3317`)
- **Pale Green / Highlight**: `--color-pale-green` (`#D8E8D4`)
- **Background Main**: `--color-bg` (`#F7FAF6`)
- **Card / Surface**: `--color-surface` (`#FFFFFF`)
- **Border / Divider**: `--color-border` (`#D0DDD0`)
- **Text Primary**: `--color-text` (`#1C2A1A`)
- **Text Muted / Subtitle**: `--color-text-muted` (`#5A6E58`)
- **Status Cues**:
  - `NEW` / `OPEN`: Blue tint (`#EAF1FB`, text `#1D4E89`)
  - `IN_PROGRESS`: Amber tint (`#FEF3D6`, text `#8F5D00`)
  - `WAITING_FOR_REQUESTER`: Purple tint (`#F3E8FF`, text `#6B21A8`)
  - `RESOLVED` / `CLOSED`: Pale Green (`#D8E8D4`, text `#2D5A27`)
  - `REOPENED`: Coral/Orange tint (`#FDE8E8`, text `#9B1C1C`)
  - `CANCELLED`: Neutral gray (`#E5E7EB`, text `#4B5563`)
- **Error / Danger**: `--color-error` (`#C53030`), background `--color-error-bg` (`#FFF5F5`)
- **Private vs Shared Distinction**:
  - Public Comments and Actions Taken: Standard card surface (`#FFFFFF`) with border `--color-border`.
  - Internal Notes: Distinct panel background (`--color-readonly-bg` `#F1F0E8`) with warning left-accent border (`#B5770A`).

### 1.2 Accessibility & Responsive Rules (BR-22, §8.6)
- **Non-color Status Cues**: Every badge and indicator displays an explicit text label in addition to color.
- **Visible Keyboard Focus**: All interactive elements (links, buttons, inputs, tabs, metric cards) exhibit a distinct high-contrast outline (`2px solid --color-primary`, offset 2px).
- **Responsive Layouts**:
  - Desktop (≥ 1024px): Multi-column grids (4 cards/row), tables with sortable columns.
  - Tablet (768px – 1023px): 2 columns, scroll-protected tables or dense cards.
  - Mobile (< 768px): Single-column stacked cards, full-width touch targets (minimum 44x44px).
- **Horizontal Overflow Prevention**: No horizontal viewport scrollbar allowed on any viewport width down to 320px. Overflow in data tables is contained within horizontally scrolling container wrappers with visible boundary shadows.

---

## 2. Navigation & Application Shell

### 2.1 Role-Based Navigation Headers
The navigation bar dynamically adapts to the session user's role:
- **Requester**:
  - `TokTickIT` logo (links to `/dashboard`)
  - Links: **Dashboard** (`/dashboard`) · **My Tickets** (`/my-tickets`) · **Create Ticket** (`/tickets/new`)
  - Right: User avatar, user name, role badge (`Requester`), **Logout** button.
- **IT Staff**:
  - `TokTickIT` logo (links to `/staff/dashboard`)
  - Links: **Dashboard** (`/staff/dashboard`) · **Ticket Queue** (`/staff/queue`)
  - Right: User avatar, user name, role badge (`IT Staff`), **Logout** button.
- **Administrator**:
  - `TokTickIT` logo (links to `/staff/dashboard`)
  - Links: **Dashboard** (`/staff/dashboard`) · **Ticket Queue** (`/staff/queue`) · **User Management** (`/admin/users`)
  - Right: User avatar, user name, role badge (`Administrator`), **Logout** button.

### 2.2 Active Navigation Indicator
The current active route is indicated visually using:
- Font weight: 600 (semi-bold)
- Color: `--color-primary`
- Bottom border accent: 3px solid `--color-primary` (or pale green accent) below the nav link.

### 2.3 Default Post-Login Landing Page
- Requester → `/dashboard`
- IT Staff → `/staff/dashboard`
- Administrator → `/staff/dashboard`

---

## 3. Requester Dashboard (`/dashboard`)

### 3.1 Structure & Layout
1. **Header Banner**:
   - Greeting: "Welcome back, [First Name]!" with subtitle "Here's what's happening with your requests."
   - Refresh button (icon + text "Refresh", spins while fetching).
2. **Metric Summary Cards (4 Cards Grid)**:
   - **My Open Tickets**: Total active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
     - Drill-down: Click card or "View all" link → `/my-tickets?status=active`.
   - **Waiting for You**: Tickets where IT Staff needs input (`WAITING_FOR_REQUESTER`).
     - Drill-down: Click card or "View all" link → `/my-tickets?status=WAITING_FOR_REQUESTER`.
   - **Recently Resolved**: Tickets resolved in the past 7 rolling days.
     - Drill-down: Click card or "View all" link → `/my-tickets?status=RESOLVED`.
   - **Closed Tickets**: Lifetime closed tickets count.
     - Drill-down: Click card or "View all" link → `/my-tickets?status=CLOSED`.
   - *Card Behavior*: Hover lift animation, accessible keyboard focus (Enter/Space navigates), aria-label announcing "[Metric Name]: [Value] tickets. Press to view list."
3. **Main Content (Two Columns on Desktop, Stacked on Mobile)**:
   - **Left / Primary (65%)**: **My Recent Tickets**
     - Table / List showing up to 5 recently updated tickets.
     - Columns (Desktop): Ticket #, Summary, Status, Last Updated.
     - Mobile: Stacked ticket cards.
     - Row Click / Title Click: Directly opens ticket detail (`/tickets/:id`).
     - Header action: "View all" text link → `/my-tickets`.
     - *Empty State*: "No tickets found. Submit a request to get started." with a "Create Ticket" button.
   - **Right / Secondary (35%)**: **Quick Actions**
     - Big action card with:
       - "+ Create Ticket" button (primary fill)
       - "View My Tickets" button (outline)
4. **States**:
   - Loading: Skeleton placeholders on metric cards and table rows.
   - Error: Safe alert banner at the top ("Unable to load dashboard data. [Retry]" button).

---

## 4. IT Staff & Administrator Dashboard (`/staff/dashboard`)

### 4.1 Structure & Layout
1. **Header Banner**:
   - Greeting: "Welcome back, [First Name]!" with subtitle "Here's what's happening with your queue today."
   - Action controls: "Refresh" button (with timestamp "Last updated: HH:mm").
2. **Operational Queue Metric Cards (Row of Cards)**:
   - **Unassigned Tickets**: Active tickets without an owner. Drill-down → `/staff/queue?owner=unassigned`.
   - **My Assigned Tickets**: Active tickets owned by logged-in staff member. Drill-down → `/staff/queue?owner=me`.
   - **New**: Tickets in status `NEW`. Drill-down → `/staff/queue?status=NEW`.
   - **Open**: Tickets in status `OPEN`. Drill-down → `/staff/queue?status=OPEN`.
   - **In Progress**: Tickets in status `IN_PROGRESS`. Drill-down → `/staff/queue?status=IN_PROGRESS`.
   - **Waiting for Requester**: Tickets in status `WAITING_FOR_REQUESTER`. Drill-down → `/staff/queue?status=WAITING_FOR_REQUESTER`.
3. **Operational Lists & Breakdown Section**:
   - **Urgent Tickets (Top Priority)**:
     - Up to 5 active tickets with IT Priority = `HIGH`, ordered oldest updated first.
     - Displays Ticket #, Summary, Owner (or Claim button), Updated relative time.
     - Action link opens `/staff/tickets/:id`.
   - **Recently Updated**:
     - Up to 5 most recently updated tickets across the system.
     - Displays Ticket #, Summary, Status badge, Updated time.
     - Action link opens `/staff/tickets/:id`.
   - **Queue Breakdown Widgets**:
     - By IT Priority: Visual distribution bars for Low, Medium, High.
     - By Status: Mini counts list.
4. **Administrator-Only Widget (BR-14 / AC-14)**:
   - Rendered ONLY for users with role `ADMINISTRATOR`.
   - Title: "System User Accounts".
   - Shows total active users, inactive users, and counts per role (Requester, IT Staff, Admin).
   - "Manage Users" button linking to `/admin/users`.
   - Completely omitted from the DOM when logged in as regular IT Staff.

---

## 5. Actions Taken on Ticket Detail

### 5.1 IT Staff Ticket Detail (`/staff/tickets/:id`)
Ticket Detail gains a dedicated **Actions Taken** section (or tab):
- **Section Header**: "Actions Taken" with item count badge (e.g. `Actions Taken (3)`).
- **Primary Action**: "+ Add Action" button (primary outline).

#### 5.1.1 Actions List View
- **Desktop**: Clean responsive data table.
  - Columns:
    - **Date/Time**: Formatted in `Asia/Bangkok` (e.g. `23 Oct 2026, 14:30`).
    - **Performed By**: User name with role tag.
    - **Description**: Text snippet with full expand toggle if > 150 chars.
    - **Result**: Text snippet.
    - **Follow-up**: Badge ("Yes" / "No") + follow-up note preview.
    - **Attachments**: Plain text notes or "—".
    - **Actions**: "Edit" button (pencil icon).
- **Mobile (< 768px)**: Stacked cards.
  - Card header: Action date + Performed by name.
  - Body: Description & Result labeled clearly.
  - Follow-up callout box (pale warning background) if `followUpRequired === true`.
  - Attachment notes footer.
  - Top-right "Edit" button.
- **Empty State**: Friendly Zen Green card: "No actions have been recorded yet for this ticket. Click 'Add Action' to document work completed."

#### 5.1.2 Create Action Mode (Form / Dialog)
- Activated via "+ Add Action" button.
- Fields:
  1. **Action Date/Time** (`datetime-local` input):
     - Default value: Current date & time.
     - Validation: Cannot exceed current time + 5 minutes.
  2. **Performed by** (read-only):
     - Labeled "Performed by: [Current Staff User Name] (auto)".
     - Immutable; informs the user that attribution is automatic.
  3. **Action Description** (`textarea`, required):
     - Placeholder: "Describe the actions performed, inspection done, or diagnostics run..."
     - Character limit: 2000 chars with live remaining counter.
  4. **Result** (`textarea`, required):
     - Placeholder: "Describe the outcome or findings..."
     - Character limit: 1000 chars with live counter.
  5. **Follow-Up Required?** (`checkbox` / toggle switch):
     - Label: "Requires follow-up action"
  6. **Follow-up Note** (`textarea`, conditionally required):
     - Rendered prominently when "Requires follow-up action" is checked.
     - Label includes red required indicator `*` when checked.
     - Placeholder: "Detail next steps, who needs to follow up, or timeline..."
  7. **Attachment Notes** (`input[type=text]`, optional):
     - Helper text: "Enter file names or shared drive paths (e.g., diag_report.log). Informational note only, not a file upload."
- **Actions**:
  - "Save Action" (Primary button, disabled while submitting with spinner).
  - "Cancel" (Secondary button, resets and closes form).
- **Duplicate Protection**: Button is locked on first click until server response; form prevents double submission.

#### 5.1.3 Edit Action Mode
- Triggered by clicking "Edit" on an action row/card.
- Pre-fills all existing values and binds the current `version`.
- Disables modification of `Performed by` and original `createdAt`.
- Upon submission:
  - If server responds with HTTP `409 STALE_UPDATE`:
    - Shows an inline alert banner: "This action was updated by another team member. Please reload to see the latest version."
    - Provides a "Reload Action" button that refreshes without discarding uncommitted fields where possible.

---

### 5.2 Requester Ticket Detail (`/tickets/:id`)
- Requesters can inspect all Actions Taken under their ticket (BR-05, BR-11).
- **Presentation**: Read-only historical timeline / card list.
- **Content**: Action Date, Performed by (Staff name), Description, Result, Follow-up notes (if any), Attachment notes.
- **Restrictions**:
  - No "+ Add Action" or "Edit" buttons are rendered.
  - Any direct POST/PATCH attempt is stopped by the backend with 403.
  - Internal Notes remain completely hidden.

---

## 6. Ticket Status Transitions & Resolution Gate UI

### 6.1 Permitted Transitions Controls (Staff Ticket Detail)
- The Status dropdown / select control displays **ONLY** valid next statuses based on the current status according to the matrix (§5.3):
  - If status is `IN_PROGRESS`: dropdown only contains `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled`.
  - If status is `CANCELLED`: dropdown is disabled with tooltip "Cancelled tickets are terminal."
- Direct attempt to jump to invalid statuses is prevented in the UI and rejected by the backend.

### 6.2 Resolution Gate Feedback (In Progress → Resolved)
- When staff selects `Resolved` from `In Progress`:
  - If Ticket has no owner assigned OR has 0 actions taken:
    - An informative alert banner is displayed immediately adjacent to the status control:
      > **Cannot resolve ticket yet:**
      > - Ticket must have an assigned owner.
      > - Ticket must have at least one Action Taken recorded.
    - If submitted directly, the backend returns `409 RESOLUTION_GATE_NOT_MET` and the client displays the returned missing requirements clearly in red error styling without losing page state.
  - If requirements are fulfilled (Owner is assigned and ≥ 1 Action Taken exists):
    - Status changes cleanly to `Resolved`.
    - Ticket summary header refreshes immediately with the new status badge and updated timestamp.

### 6.3 Requester Advisory Indication ("Mark Problem as Resolved")
- Rendered on the Requester Ticket Detail screen while status is `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, or `REOPENED` (D-05).
- Card / Button:
  - Text: "Does your problem appear resolved?"
  - Button: "Mark Problem as Resolved" (Secondary green button).
- On click:
  - Displays confirmation dialog explaining: "This notifies IT Staff that you consider the issue resolved. An IT Staff member will review the work and formally resolve the ticket."
  - Once confirmed, button is replaced with an informational badge: "✓ You indicated this issue appears resolved."
  - Status is **not** changed directly.

---

## 7. Responsive & Accessibility Checklist

| Area | Verification Checklist |
|---|---|
| **Keyboard Navigation** | Tab index follows logical DOM flow across dashboards, modals, and tables. All interactive cards and buttons receive visible 2px outline focus indicator. |
| **Labels & Screen Readers** | Every icon button has an `aria-label` (e.g. `aria-label="Refresh dashboard metrics"`, `aria-label="Edit action taken"`). Metric cards have descriptive aria labels. |
| **Color Contrast** | All text, badges, and button labels meet WCAG AA contrast (≥ 4.5:1 for normal text, ≥ 3:1 for large text). Statuses never use color alone (all have text labels). |
| **Mobile Breakpoints (<768px)** | Navigation collapses or wraps cleanly without horizontal overflow. Actions Taken display as cards instead of wide table. Metric cards stack into 1 or 2 columns. |
| **Tablet Breakpoints (768-1023px)** | Dashboard cards adapt into 2 columns. Tables use horizontal scrolling wrappers with subtle indicators. |
| **Forms & Error Handling** | Inputs preserve entered content on validation or conflict failures. Inline error messages are linked with `aria-describedby`. |
