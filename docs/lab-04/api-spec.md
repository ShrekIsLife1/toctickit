# TokTickIT — Lab 4 REST API Specification (Sprint 4)

Extends `docs/lab-03/api_spec_lab03.md` and `docs/lab-02/api-spec.md`. All previously approved endpoints for authentication, tickets, categories, attachments, comments, and user management remain active and supported.

---

## 0. General Conventions & Error Format

### 0.1 Authentication & Authorization
- Sessions continue to use an httpOnly cookie (`session`) carrying the authenticated user.
- Unauthenticated requests return `401 UNAUTHENTICATED`.
- Requests from accounts flagged with `mustChangePassword: true` return `403 PASSWORD_CHANGE_REQUIRED` on all routes except `/api/auth/change-password`, `/api/auth/me`, and `/api/auth/logout`.
- Requests lacking required role permissions return `403 FORBIDDEN`.
- Requests attempting to access resources belonging to another user when ownership is required (e.g., Requester accessing another requester's ticket or actions) return `404 NOT_FOUND` to prevent identifier enumeration.

### 0.2 Standard Error Response Shape
All error responses adhere to the standard shape:
```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable safe error message",
    "details": ["Optional list or map of detailed error items"]
  }
}
```

### 0.3 Concurrency & Stale Update Handling
- **Ticket Concurrency**: The `Ticket` model includes an integer field `version` (starts at 1, incremented on every workflow or status modification). Mutations (`PATCH /api/staff/tickets/:id`) MUST supply `expectedVersion`.
- **Action Taken Concurrency**: The `ActionTaken` model includes an integer field `version` (starts at 1, incremented on every edit). Mutations (`PATCH /api/tickets/:id/actions-taken/:actionId`) MUST supply `expectedVersion`.
- If the database `version !== expectedVersion`, the request is rejected with HTTP `409 STALE_UPDATE`, returning `{ "error": { "code": "STALE_UPDATE", "message": "This record has been modified by another user. Please reload the latest changes.", "details": { "currentVersion": <latestVersion> } } }`. No mutation is applied.

### 0.4 Idempotency on Create Actions
- To prevent accidental duplicate entries from rapid double-clicks or client retries, `POST /api/tickets/:id/actions-taken` supports an optional `Idempotency-Key` HTTP header.
- If a request with the same `Idempotency-Key` and authenticated user is repeated within 60 seconds, the server returns the existing created record with HTTP 200 or 201 without creating a duplicate record.

---

## 1. Actions Taken Endpoints

### 1.1 `GET /api/tickets/:id/actions-taken`
Retrieves all Actions Taken recorded on a specific ticket.

- **Allowed Roles**: 
  - `REQUESTER`: Only if the requester owns the ticket (`ticket.requesterId === sessionUser.id`). Otherwise returns `404 NOT_FOUND`.
  - `IT_STAFF`, `ADMINISTRATOR`: Permitted on any accessible ticket.
- **Query Parameters**: None.
- **Sorting Rule (BR-12)**: Stable chronological order: `actionDateTime ASC`, then `createdAt ASC`, then `id ASC`.

**Response 200 OK**
```json
[
  {
    "id": 1,
    "ticketId": 101,
    "actionDateTime": "2026-10-23T14:30:00.000Z",
    "description": "Inspected workstation power supply and reseated RAM modules.",
    "result": "Workstation powered on cleanly, diagnostics passed with 0 errors.",
    "performedById": 2,
    "performedBy": {
      "id": 2,
      "name": "Michael Brown",
      "email": "michael.brown@example.com",
      "role": "IT_STAFF"
    },
    "followUpRequired": true,
    "followUpNote": "Monitor workstation stability for 24 hours.",
    "attachmentNotes": "See memtest_report.log in shared diagnostic network folder.",
    "version": 1,
    "createdAt": "2026-10-23T14:35:10.000Z",
    "updatedAt": "2026-10-23T14:35:10.000Z",
    "updatedById": null,
    "updatedBy": null
  }
]
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Missing or invalid session cookie |
| 404 | `NOT_FOUND` | Ticket does not exist, or requester does not own the ticket |

---

### 1.2 `POST /api/tickets/:id/actions-taken`
Creates a new Action Taken line on a ticket.

- **Allowed Roles**: `IT_STAFF`, `ADMINISTRATOR`.
- **Forbidden Roles**: `REQUESTER` returns `403 FORBIDDEN` (BR-10).
- **Business Constraints**:
  - `Performed by` is automatically set by the server from the authenticated session (BR-03). Any client-supplied actor is ignored.
  - Ticket cannot be in `CANCELLED` status (BR-09). Creating an action on a cancelled ticket returns `409 CANCELLED_TICKET_IMMUTABLE`.
  - Side effect (BR-13): Updates the parent `Ticket.updatedAt` timestamp to current time. Does not alter ticket version unless ticket workflow fields change.

**Request Body**
```json
{
  "actionDateTime": "2026-10-23T14:30:00.000Z",
  "description": "Replaced damaged HDMI cable and configured dual monitors.",
  "result": "Dual displays operating at 4K 60Hz resolution as requested.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "cable_replacement_receipt.pdf"
}
```

**Validation Rules**
- `actionDateTime`: Optional ISO 8601 string. Defaults to current server time if omitted. Must not be greater than 5 minutes into the future (BR-04).
- `description`: Required string, 1 to 2000 characters after trim (BR-05).
- `result`: Required string, 1 to 1000 characters after trim (BR-05).
- `followUpRequired`: Optional boolean, defaults to `false`.
- `followUpNote`: Required string (1 to 1000 characters) if `followUpRequired === true`. Optional (up to 1000 characters) if `followUpRequired === false` (BR-06).
- `attachmentNotes`: Optional plain text, up to 500 characters (BR-07). Note: This is an informational text note, NOT a binary file upload.

**Response 201 Created**
```json
{
  "id": 2,
  "ticketId": 101,
  "actionDateTime": "2026-10-23T14:30:00.000Z",
  "description": "Replaced damaged HDMI cable and configured dual monitors.",
  "result": "Dual displays operating at 4K 60Hz resolution as requested.",
  "performedById": 2,
  "performedBy": {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@example.com",
    "role": "IT_STAFF"
  },
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "cable_replacement_receipt.pdf",
  "version": 1,
  "createdAt": "2026-10-23T14:32:00.000Z",
  "updatedAt": "2026-10-23T14:32:00.000Z",
  "updatedById": null,
  "updatedBy": null
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Validation failed (missing description/result, missing followUpNote when required, actionDateTime > 5m in future) |
| 401 | `UNAUTHENTICATED` | Missing/invalid session cookie |
| 403 | `FORBIDDEN` | Caller has role `REQUESTER` |
| 404 | `NOT_FOUND` | Ticket does not exist |
| 409 | `CANCELLED_TICKET_IMMUTABLE` | Ticket is in CANCELLED status |

---

### 1.3 `PATCH /api/tickets/:id/actions-taken/:actionId`
Edits an existing Action Taken line. Actions are never deleted (BR-08).

- **Allowed Roles**: `IT_STAFF`, `ADMINISTRATOR`.
- **Forbidden Roles**: `REQUESTER` returns `403 FORBIDDEN`.
- **Concurrency**: Must supply `expectedVersion` matching current `ActionTaken.version`.
- **Audit Logging**: Sets `updatedById = sessionUser.id`, `updatedAt = new Date()`, and increments `version`. `performedById`, `ticketId`, and `createdAt` never change.
- **Side effect**: Updates parent `Ticket.updatedAt`.

**Request Body**
```json
{
  "expectedVersion": 1,
  "actionDateTime": "2026-10-23T14:35:00.000Z",
  "description": "Replaced damaged HDMI cable, configured dual monitors, and verified audio output.",
  "result": "Dual displays operating cleanly and sound output verified.",
  "followUpRequired": true,
  "followUpNote": "Check back if audio dropouts recur after driver update.",
  "attachmentNotes": "receipt.pdf"
}
```

**Response 200 OK**
```json
{
  "id": 2,
  "ticketId": 101,
  "actionDateTime": "2026-10-23T14:35:00.000Z",
  "description": "Replaced damaged HDMI cable, configured dual monitors, and verified audio output.",
  "result": "Dual displays operating cleanly and sound output verified.",
  "performedById": 2,
  "performedBy": {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@example.com",
    "role": "IT_STAFF"
  },
  "followUpRequired": true,
  "followUpNote": "Check back if audio dropouts recur after driver update.",
  "attachmentNotes": "receipt.pdf",
  "version": 2,
  "createdAt": "2026-10-23T14:32:00.000Z",
  "updatedAt": "2026-10-23T15:00:00.000Z",
  "updatedById": 2,
  "updatedBy": {
    "id": 2,
    "name": "Michael Brown"
  }
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `expectedVersion` or invalid field values |
| 401 | `UNAUTHENTICATED` | Missing session |
| 403 | `FORBIDDEN` | Requester role |
| 404 | `NOT_FOUND` | Ticket or Action Taken does not exist, or action does not belong to ticket |
| 409 | `STALE_UPDATE` | `expectedVersion` does not match database version |
| 409 | `CANCELLED_TICKET_IMMUTABLE` | Ticket is in CANCELLED status |

---

## 2. Ticket Workflow & Resolution Gate Endpoints

### 2.1 `PATCH /api/staff/tickets/:id` (Extended)
Updates ticket triage, ownership, and enforces the final status-transition matrix (§5.3) and resolution gate (BR-14).

- **Allowed Roles**: `IT_STAFF`, `ADMINISTRATOR`.
- **Request Body**:
```json
{
  "expectedVersion": 1,
  "currentStatus": "RESOLVED",
  "itPriority": "MEDIUM",
  "ticketOwnerId": 2
}
```

**Permitted Transitions Matrix (BR-20, BR-21)**:
- `NEW` → `OPEN`
- `OPEN` → `IN_PROGRESS`, `CANCELLED`
- `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
- `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `CANCELLED`
- `RESOLVED` → `CLOSED`, `REOPENED`
- `CLOSED` → `REOPENED`
- `REOPENED` → `IN_PROGRESS`
- Any transition not in this matrix returns `409 INVALID_STATUS_TRANSITION`.
- `CANCELLED` is terminal: no transitions allowed out of `CANCELLED`.

**Resolution Gate Enforcement (BR-14)**:
When transitioning to `RESOLVED` (e.g. from `IN_PROGRESS`):
1. Ticket must have an assigned owner (`ticket.ticketOwnerId !== null`).
2. Ticket must have at least one Action Taken recorded (`count(actionsTaken) >= 1`).
- If either condition is not met, the transition is rejected with HTTP `409 RESOLUTION_GATE_NOT_MET`, returning:
```json
{
  "error": {
    "code": "RESOLUTION_GATE_NOT_MET",
    "message": "Ticket cannot be resolved until all resolution gate requirements are satisfied.",
    "details": [
      "Ticket must have an assigned owner",
      "Ticket must have at least one Action Taken recorded"
    ]
  }
}
```

**Status Change Side Effects**:
- Updates `statusChangedAt = new Date()`.
- Increments `ticket.version`.
- If transitioning to `REOPENED`: resets `problemAppearsResolved = false` (BR-18).
- Updates `ticket.updatedAt = new Date()`.

**Response 200 OK**
Returns the full updated ticket including `version` and `statusChangedAt`.

**Errors**
| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `expectedVersion` or malformed body |
| 401 | `UNAUTHENTICATED` | Missing session |
| 403 | `FORBIDDEN` | Requester calling staff endpoint |
| 404 | `NOT_FOUND` | Ticket does not exist |
| 409 | `STALE_UPDATE` | Ticket `expectedVersion` mismatch |
| 409 | `INVALID_STATUS_TRANSITION` | Disallowed status jump |
| 409 | `RESOLUTION_GATE_NOT_MET` | Target is `RESOLVED` but owner is missing or 0 actions taken |

---

### 2.2 `POST /api/tickets/:id/resolve-indication` (Clarified Advisory)
Allows a requester to indicate that they believe their issue has been resolved.

- **Allowed Roles**: `REQUESTER` on owned ticket (`ticket.requesterId === sessionUser.id`).
- **Permitted Statuses (D-05)**: Available only while ticket is in `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, or `REOPENED`.
- **Behavior (BR-15)**: Sets `problemAppearsResolved = true`. It is **advisory only**; it NEVER updates `currentStatus` to `RESOLVED`, and it DOES NOT satisfy the resolution gate.
- If `problemAppearsResolved` is already `true`, returns `409 ALREADY_RESOLVED_INDICATED`.

**Response 200 OK**
```json
{
  "success": true,
  "problemAppearsResolved": true
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Missing session |
| 404 | `NOT_FOUND` | Ticket not found or not owned by requester |
| 409 | `ALREADY_RESOLVED_INDICATED` | Indicator has already been set |
| 409 | `INVALID_STATUS_FOR_INDICATION` | Ticket is in `NEW`, `RESOLVED`, `CLOSED`, or `CANCELLED` |

---

## 3. Role Dashboard Endpoints

### 3.1 `GET /api/dashboard/requester`
Summarizes metrics and recent activity for the authenticated Requester.

- **Allowed Roles**: `REQUESTER` only. (`IT_STAFF` or `ADMINISTRATOR` receive `403 FORBIDDEN`).
- **Scope (BR-27)**: Scoped strictly to the authenticated user (`sessionUser.id`). No client-supplied user ID is accepted.
- **Time Zone**: `Asia/Bangkok`.
- **Calculations**:
  - `openTickets`: Count of owned tickets with active status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
  - `waitingForRequester`: Count of owned tickets in `WAITING_FOR_REQUESTER`.
  - `recentlyResolved`: Count of owned tickets in `RESOLVED` whose `statusChangedAt` is within the last 7 rolling days (7 * 24 hours).
  - `recentlyUpdated`: Up to 5 most recently updated owned tickets (all statuses), ordered by `updatedAt DESC`.

**Response 200 OK**
```json
{
  "openTickets": 4,
  "waitingForRequester": 1,
  "recentlyResolved": 2,
  "recentlyUpdated": [
    {
      "id": 15,
      "ticketNumber": "TKT-2026-00015",
      "summary": "VPN disconnects randomly",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "HIGH",
      "updatedAt": "2026-10-23T14:15:00.000Z"
    },
    {
      "id": 12,
      "ticketNumber": "TKT-2026-00012",
      "summary": "Need new monitor stand",
      "currentStatus": "RESOLVED",
      "requestedPriority": "LOW",
      "updatedAt": "2026-10-22T09:00:00.000Z"
    }
  ]
}
```

**Empty Behavior (BR-29)**: Returns zeros and empty array, never `null` or 404:
```json
{
  "openTickets": 0,
  "waitingForRequester": 0,
  "recentlyResolved": 0,
  "recentlyUpdated": []
}
```

---

### 3.2 `GET /api/dashboard/staff`
Summarizes operational metrics for IT Staff and Administrators.

- **Allowed Roles**: `IT_STAFF`, `ADMINISTRATOR`. (`REQUESTER` receives `403 FORBIDDEN`).
- **Calculations**:
  - `unassigned`: Count of active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`) where `ticketOwnerId IS NULL`.
  - `ownedByMe`: Count of active tickets where `ticketOwnerId === sessionUser.id`.
  - `byStatus`: Count of active tickets grouped by status: `{ "NEW": 14, "OPEN": 23, "IN_PROGRESS": 18, "WAITING_FOR_REQUESTER": 7, "REOPENED": 3 }`.
  - `byItPriority`: Count of active tickets grouped by IT priority: `{ "LOW": 10, "MEDIUM": 35, "HIGH": 17 }`.
  - `urgent`: Array of up to 5 active tickets having `itPriority === "HIGH"`, ordered by `updatedAt ASC` (oldest neglected first).
  - `recentlyUpdated`: Array of up to 5 tickets (any status), ordered by `updatedAt DESC`.
  - `userCounts` (**ADMINISTRATOR ONLY** - omitted for IT Staff):
    `{ "active": 25, "inactive": 3, "byRole": { "REQUESTER": 20, "IT_STAFF": 6, "ADMINISTRATOR": 2 } }`.

**Response 200 OK (IT Staff)**
```json
{
  "unassigned": 12,
  "ownedByMe": 16,
  "byStatus": {
    "NEW": 14,
    "OPEN": 23,
    "IN_PROGRESS": 18,
    "WAITING_FOR_REQUESTER": 7,
    "REOPENED": 2
  },
  "byItPriority": {
    "LOW": 10,
    "MEDIUM": 35,
    "HIGH": 19
  },
  "urgent": [
    {
      "id": 8,
      "ticketNumber": "TKT-2026-00008",
      "summary": "Core switch fan failure",
      "currentStatus": "IN_PROGRESS",
      "itPriority": "HIGH",
      "ticketOwnerId": 2,
      "updatedAt": "2026-10-20T08:00:00.000Z"
    }
  ],
  "recentlyUpdated": [
    {
      "id": 34,
      "ticketNumber": "TKT-2026-00034",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "itPriority": "MEDIUM",
      "ticketOwnerId": 3,
      "updatedAt": "2026-10-23T14:45:00.000Z"
    }
  ]
}
```

**Response 200 OK (Administrator)**
Identical to IT Staff response, with the additional `userCounts` object:
```json
{
  "unassigned": 12,
  "ownedByMe": 4,
  "byStatus": { ... },
  "byItPriority": { ... },
  "urgent": [ ... ],
  "recentlyUpdated": [ ... ],
  "userCounts": {
    "active": 25,
    "inactive": 3,
    "byRole": {
      "REQUESTER": 20,
      "IT_STAFF": 6,
      "ADMINISTRATOR": 2
    }
  }
}
```

---

## 4. Preserved Endpoints & Ticket Model Enhancements

All endpoints from Lab 1, 2, and 3 are preserved. Any endpoint returning Ticket objects (e.g., `GET /api/tickets`, `GET /api/tickets/:id`, `GET /api/staff/tickets`, `GET /api/staff/tickets/:id`) now includes the new Lab 4 fields:
- `version`: Integer (starts at 1).
- `statusChangedAt`: ISO 8601 string (defaults to ticket creation time or last status change).
- `problemAppearsResolved`: Boolean (defaults to false).
