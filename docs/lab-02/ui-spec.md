# Lab 2 UI Specification — Zen Green Theme

This document is the authoritative visual/behavioral contract for Lab 2 (and
a reusable baseline for later labs). It expands the token table in the Lab 2
handout (Section 7) into concrete component and state rules.

## 1. Color Tokens and Intended Use

| Token | Value | Used for |
|---|---|---|
| `--color-primary` | `#006B3C` | App header background, primary button fill, strong emphasis text |
| `--color-secondary` | `#0B7A46` | Active tab underline, focus ring accent, links, hover state on primary elements |
| `--color-pale-green` | `#EAF6EF` | Selected row/tab background, success banner background, subtle section emphasis |
| `--color-bg` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels, table rows |
| `--color-border` | `#D8E2DC` | Card/table/input borders |
| `--color-text` | `#1E2B24` | Body text (dark charcoal-green, not pure black) |
| `--color-text-muted` | `#5B6B62` | Secondary/help text, placeholders |
| `--color-error` | `#B30000` | Error text, error field border |
| `--color-error-bg` | `#FDF0F0` | Error banner/alert background |
| `--color-warning` | `#B5770A` (amber) | Warning badges/callouts only — never decorative |
| `--color-success` | `#0B7A46` | Success text/icon (paired with a checkmark, not color alone) |
| `--color-readonly-bg` | `#F1F0E8` | Read-only field background (warm ivory) |
| `--color-disabled-bg` | `#E7EBE8` | Disabled control background |

## 2. Typography and Spacing

- Base font: system UI stack (`-apple-system, Segoe UI, Roboto, sans-serif`).
- Base size 16px / 1rem; body line-height 1.5.
- Heading scale: H1 1.75rem (page titles, e.g. "My Tickets"), H2 1.25rem
  (section headers, e.g. "Attachments"), H3 1rem bold (field group labels).
- Spacing scale (4px base unit): `4, 8, 12, 16, 24, 32, 48px`. Field
  vertical rhythm: 16px between fields, 24px between field groups, 32px
  before action rows.
- Form max-width on desktop: 720px, centered, to keep line length readable.

## 3. Field States

| State | Background | Border | Notes |
|---|---|---|---|
| Editable, default | `--color-surface` | `--color-border` 1px | |
| Editable, focused | `--color-surface` | `--color-secondary` 2px | visible focus ring, not border-only |
| Editable, invalid | `--color-error-bg` | `--color-error` 2px | paired with inline message below |
| Read-only | `--color-readonly-bg` | `--color-border` 1px, dashed | cursor `not-allowed`; label suffixed with a small "read-only" tag on first use per screen |
| Disabled | `--color-disabled-bg` | `--color-border` 1px | text muted; never used to convey "read-only data", only "temporarily unavailable" |

## 4. Required-Field Marker and Validation-Message Placement

- Required fields: red asterisk (`--color-error`) immediately after the
  label text, e.g. `Summary *`. The asterisk never appears alone as the
  only validation signal.
- Validation messages render directly below their field, in
  `--color-error`, 0.875rem, with a small warning icon — never only as a
  single banner at the top of the form. A top-of-form summary banner may
  additionally list all errors on submit attempt, but is supplementary,
  not a replacement.
- On successful correction, the field's error state and message clear
  immediately (on blur or on change, whichever is more responsive for that
  field).

## 5. Button Hierarchy and Busy State

| Style | Use | Visual |
|---|---|---|
| Primary | Submit, Continue, Create Ticket | Solid `--color-primary` fill, white text |
| Secondary | Cancel, Back, Clear Filters | White fill, `--color-primary` border and text |
| Tertiary | Change Requester, inline text actions | No border/fill, `--color-secondary` text, underline on hover |
| Destructive | Remove Attachment | White fill, `--color-error` border and text; confirmation required before the action fires |
| Disabled | Any of the above when inactive | `--color-disabled-bg` fill, muted text, `cursor: not-allowed`, no hover effect |
| Busy | Primary button during an in-flight request | Spinner + label change (e.g. "Submitting…"), disabled, same footprint as normal state (no layout shift) |

Icon-only controls (e.g. a small "×" to remove a filter chip) always carry
an `aria-label` and a native `title` tooltip.

## 6. Attachment Selection and Error Presentation

- File picker area shows: allowed types (JPG, JPEG, PNG, WEBP, PDF), max
  size (5 MB), and remaining slot count (e.g. "3 of 5 attachments used").
- Each selected/uploaded file renders as a row: filename, size, type icon,
  status (Uploading / Active / Removed), and an action (remove, or — for
  removed rows — no action, just metadata).
- Rejected files (wrong type, oversized, or slot limit reached) show an
  inline error directly under the picker, naming the specific reason per
  file; they are never silently dropped.
- Removed rows are visually de-emphasized (muted text, strikethrough
  filename) and show the removal reason as secondary text.

## 7. Initial, Loading, Validation, Submitting, Success, and Failure States

Applies to Create Ticket as the canonical example; the same state model
applies to My Tickets (load) and Ticket Detail (load):

1. **Initial**: empty/default form, no messages, Submit enabled.
2. **Loading** (reference data — Categories/Related Systems/Requester):
   skeleton or spinner in place of the dropdowns; Submit disabled until
   reference data resolves.
3. **Validation** (client-side, on submit attempt): offending fields marked
   per Section 4; focus moves to the first invalid field; entered values
   untouched.
4. **Submitting**: Submit button shows busy state (Section 5); all fields
   become read-only (not disabled-looking, just non-interactive) to prevent
   mid-flight edits; no navigation away is possible.
5. **Success**: form replaced by a confirmation panel showing the Ticket
   Number, a success icon + green text (not color alone), and a primary
   action ("View Ticket" → Ticket Detail) plus a secondary action ("Create
   Another").
6. **Failure** (backend/network): a top error banner
   (`--color-error-bg`/`--color-error`) with a safe, non-technical message;
   form re-enabled with all values intact; Submit re-enabled for retry.

## 8. Desktop, Tablet, and Mobile Layout Rules

| Viewport | Range | Rule |
|---|---|---|
| Desktop | ≥992px | Multi-column layout as designed per screen; content centered, max-width per screen (720px form, 1140px table view) |
| Tablet | 768–991px | Two-column layout where practical (e.g. paired fields like Category/Related System); Summary/Description keep full available width |
| Mobile | <768px | Single column, fields stack vertically; buttons full-width or clearly touch-sized (min 44px height); no horizontal page scroll |
| All | — | No clipped labels, overlapping messages, hidden buttons, or truncated attachment names without a visible full-name affordance (e.g. `title` attribute) |

## 9. Accessibility Labels, Keyboard Focus, and Non-Color Indicators

- Every form control has an associated `<label>` (via `for`/`id`, not
  placeholder-only).
- Tab order follows visual/reading order on every screen.
- Focus indicator: 2px `--color-secondary` outline, never removed via
  `outline: none` without a replacement.
- Status/priority badges always pair color with text (e.g. "High" label
  inside the badge, not a bare colored dot).
- Icon-only buttons: `aria-label` required (Section 5).
- Error messages are associated with their field via `aria-describedby`.

## 10. Visual Inspection Checklist and Screenshot Paths

See `docs/lab-02/tests.md` Section 4 for the full checklist. Screenshot
capture paths:

```
artifacts/lab-02/screenshots/create-ticket/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/my-tickets/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/ticket-detail/{desktop,tablet,mobile}.png
```

## 11. Application Shell and Active Navigation

- Header (fixed, `--color-primary` background, white text/icons): TokTickIT
  logo/name (left), "My Tickets" / "Create Ticket" nav links (center-left),
  selected-Requester display + "Change Requester" tertiary action + Profile
  menu (right).
- Active nav item: white text becomes bold with a 2px `--color-pale-green`
  underline (not color-only — the bold weight is the non-color signal).
- Mobile (<768px): nav collapses into a hamburger menu; the selected-
  Requester display remains visible in the collapsed header bar.

## 12. Ticket-List Columns and Mobile Representation

**Desktop table columns**: Ticket No., Created Date, Summary, Category,
Requested Priority, Current Status, Last Updated. (Chosen because these are
the fields a Requester needs to recognize and triage their own ticket
without opening it — Ticket Owner/IT Priority are excluded from this
Requester-facing view since they are IT-internal concerns introduced in a
later lab.)

**Mobile card** (one per Ticket, replacing the table below 768px): Ticket
No. + Current Status badge (top row), Summary (bold, truncated to 2 lines),
Category + Requested Priority badge (secondary row), Last Updated
(footer, muted text). Entire card is tappable to open Ticket Detail.

## 13. Search, Filters, Sort, Clear-Filters, and Pagination Controls

- Search: single text input, placeholder "Search by ticket number or
  summary…", debounced (300ms) before triggering a refetch.
- Filters: three dropdowns (Category, Requested Priority, Current Status),
  each defaulting to "All"; combinable.
- Sort: clickable column headers (desktop) with an up/down chevron
  indicating active sort + direction; on mobile, a separate "Sort by"
  dropdown above the card list (since headers aren't visible).
- Clear Filters: secondary button, visible only when at least one
  non-default filter/search/sort is active; resets to defaults in one tap.
- Pagination: Previous/Next + numbered pages (desktop), Previous/Next only
  with a "Page X of Y" label (mobile); page-size is fixed at 10 in Lab 2
  UI (no page-size selector exposed to the Requester).

## 14. Priority and Status Badge Rules

| Badge type | Value | Background | Text |
|---|---|---|---|
| Requested/IT Priority | LOW | `--color-pale-green` | `--color-secondary` |
| Requested/IT Priority | MEDIUM | `#FFF4E0` | `--color-warning` |
| Requested/IT Priority | HIGH | `--color-error-bg` | `--color-error` |
| Current Status | NEW | `#EAF1FB` | `#1D4E89` |
| Current Status | (future statuses) | defined when introduced in Lab 3+ | — |

All badges: pill shape, 4px vertical / 10px horizontal padding, 0.75rem
bold text, text always included (never a color-only dot).

## 15. Empty-List versus No-Results Presentation

- **Empty (zero Tickets ever created)**: centered illustration/icon +
  "You haven't created any tickets yet." + primary "Create Ticket" button.
- **No results (filters/search active, zero matches)**: centered icon +
  "No tickets match your filters." + secondary "Clear Filters" button.
  Visually distinct copy and CTA from the empty state so a Requester never
  confuses "I have nothing" with "my filter is too narrow."

## 16. Requester Ticket Detail Read-Only Layout

- Header card: Ticket No., Created Date, Category, Related System (row 1);
  Requested Priority, IT Priority (shown as "Not yet triaged" if null),
  Current Status, Ticket Owner (shown as "Unassigned" if null) (row 2);
  Summary (full width); Description (full width, preserves line breaks);
  Resolution Summary (full width, shown as "No resolution summary
  available yet." when null) — all rendered in the read-only field style
  (Section 3), never as plain unstyled text, so the read-only convention
  stays consistent with Create Ticket.
- Attachments panel: separate card below the header, clearly titled
  "Attachments", with its own add-file action — visually separated from
  the read-only header so it reads as "the one place you can still act."

## 17. Active, Uploading, Invalid, Removed, and Unavailable Attachment States

| State | Presentation |
|---|---|
| Active | Normal row, filename + size + type icon, Download + Remove actions enabled |
| Uploading | Row with a progress indicator, no actions until it resolves |
| Invalid (rejected before upload) | Not added to the list; inline error shown at the picker (Section 6) |
| Removed | Muted/struck-through row, removal reason as secondary text, Download action replaced with a disabled "Removed" label |
| Unavailable (download attempt fails, e.g. network) | Inline toast/error near the row; row itself unchanged so the Requester can retry |

## 18. Desktop Table and Mobile Card or Responsive-Table Behavior

Confirmed consistent with Sections 12 and 8: desktop uses a real `<table>`
for My Tickets (sortable headers, one row per Ticket); mobile replaces it
with a card list rather than a horizontally-scrollable table, per BR/AC-19
(no horizontal scrolling permitted). Ticket Detail's Attachments panel uses
a simple stacked row list at all breakpoints (no table needed given its
small, non-tabular field set).

## 19. Screenshot Paths for Create Ticket, My Tickets, and Ticket Detail

See Section 10 above — paths are shared between this document and
`tests.md` Section 4 to avoid divergence between the visual spec and the
visual test plan.
