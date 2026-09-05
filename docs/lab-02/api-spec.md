# Lab 2 API Specification

All endpoints are prefixed `/api`. The selected Development Requester's id
is sent via the `X-Requester-Id` request header (see `specification.md`
Section 11 / BR-39) and re-validated server-side on every request that
touches Ticket or Attachment data — it is never trusted from the request
body alone.

Standard error shape (used by every documented error case below):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable, safe message" } }
```

---

## 1. `GET /api/categories`

Retrieve active Categories for the Create Ticket / My Tickets filter
dropdowns.

**Response 200**
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

---

## 2. `GET /api/related-systems`

Retrieve active Related Systems.

**Response 200**
```json
[
  { "id": 1, "name": "Email" },
  { "id": 2, "name": "Campus Wi-Fi" },
  { "id": 3, "name": "VPN" }
]
```

---

## 3. `GET /api/requesters`

Retrieve active Development Requesters for the selector (BR-07).

**Response 200**
```json
[
  { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
  { "id": 2, "name": "Michael Brown", "email": "michael.brown@example.com" }
]
```
Inactive Requesters are excluded entirely — never returned with a flag, to
avoid the client having to remember to filter (BR-07, AC-15).

---

## 4. `POST /api/tickets`

Create a Ticket owned by the Requester identified in `X-Requester-Id`.

**Request headers**: `X-Requester-Id: 1`

**Request body**
```json
{
  "categoryId": 2,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains much faster than usual even when idle.",
  "requestedPriority": "MEDIUM"
}
```
(Attachments are uploaded separately after Ticket creation succeeds, via
endpoint 8 — decouples partial-failure handling per BR-26.)

**Response 201**
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000123",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains much faster than usual even when idle.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "currentStatus": "NEW",
  "ticketOwnerId": null,
  "resolutionSummary": null,
  "createdAt": "2026-08-20T09:14:00.000Z",
  "updatedAt": "2026-08-20T09:14:00.000Z"
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid `summary`, `description`, `requestedPriority` (BR-18, BR-19, BR-21); field-level detail included: `{"error":{"code":"VALIDATION_ERROR","message":"...","fields":{"summary":"Summary must be 5–120 characters"}}}` |
| 400 | `UNKNOWN_REFERENCE` | `categoryId` or `relatedSystemId` does not reference an existing active row (BR-20) |
| 400 | `MISSING_REQUESTER` | `X-Requester-Id` header absent or not a valid active Requester id |
| 500 | `INTERNAL_ERROR` | Unexpected failure; safe generic message, no stack trace |

---

## 5. `GET /api/tickets`

Paginated, searchable, filterable, sortable list of the selected
Requester's own Tickets.

**Request headers**: `X-Requester-Id: 1`

**Query parameters**
| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Matches Ticket Number (partial) or Summary (partial, case-insensitive) |
| `categoryId` | number | — | Exact match |
| `requestedPriority` | `LOW`\|`MEDIUM`\|`HIGH` | — | Exact match |
| `currentStatus` | string | — | Exact match |
| `sortBy` | `createdAt`\|`updatedAt` | `createdAt` | BR-16 |
| `sortDir` | `asc`\|`desc` | `desc` | |
| `page` | number | `1` | Falls back to `1` if invalid (BR-17) |
| `pageSize` | number | `10` | Max `50`; falls back to `10` if invalid or out of range (BR-17) |

**Response 200**
```json
{
  "data": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000123",
      "summary": "Laptop battery drains quickly",
      "categoryId": 2,
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-20T09:14:00.000Z",
      "updatedAt": "2026-08-20T09:14:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```
Empty result (zero matches) still returns `200` with `"data": []` and
accurate `pagination.total: 0` — this is what the UI uses to distinguish
"no tickets" vs "no results" (BR-35), by comparing against a separate
unfiltered count if needed, or by the client remembering whether any
filter/search is currently active.

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `MISSING_REQUESTER` | `X-Requester-Id` absent/invalid |

---

## 6. `GET /api/tickets/:id`

Retrieve one Ticket's detail — only if owned by the selected Requester.

**Request headers**: `X-Requester-Id: 1`

**Response 200**: same shape as the `POST /api/tickets` response (full
Ticket object).

**Errors**
| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Ticket does not exist, OR exists but belongs to a different Requester (BR-13 — identical response in both cases, no distinction disclosed) |
| 400 | `MISSING_REQUESTER` | `X-Requester-Id` absent/invalid |

---

## 7. `GET /api/tickets/:id/attachments`

List Attachment metadata (both active and removed) for an owned Ticket.

**Request headers**: `X-Requester-Id: 1`

**Response 200**
```json
[
  {
    "id": 7,
    "ticketId": 42,
    "originalFilename": "battery-report.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 214532,
    "isRemoved": false,
    "removedAt": null,
    "removalReason": null,
    "uploadedAt": "2026-08-20T09:15:00.000Z"
  },
  {
    "id": 8,
    "ticketId": 42,
    "originalFilename": "screenshot.png",
    "mimeType": "image/png",
    "sizeBytes": 88210,
    "isRemoved": true,
    "removedAt": "2026-08-20T10:02:00.000Z",
    "removalReason": "Wrong screenshot, replaced by the PDF report",
    "uploadedAt": "2026-08-20T09:16:00.000Z"
  }
]
```

**Errors**: same `404 NOT_FOUND` semantics as endpoint 6 (ownership check
happens on the parent Ticket first).

---

## 8. `POST /api/tickets/:id/attachments`

Upload one Attachment to an owned Ticket. `multipart/form-data`, field name
`file`.

**Request headers**: `X-Requester-Id: 1`

**Response 201**
```json
{
  "id": 9,
  "ticketId": 42,
  "originalFilename": "invoice.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 1345120,
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null,
  "uploadedAt": "2026-08-20T11:00:00.000Z"
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `UNSUPPORTED_TYPE` | MIME type not in JPG/JPEG/PNG/WEBP/PDF (BR-27) |
| 413 | `FILE_TOO_LARGE` | File exceeds 5 MB (BR-28) |
| 409 | `ATTACHMENT_LIMIT_REACHED` | Ticket already has 5 active Attachments (BR-29) |
| 404 | `NOT_FOUND` | Ticket not owned by / not visible to the Requester |

---

## 9. `GET /api/attachments/:id/download`

Download one active Attachment's file bytes, only if it belongs to a Ticket
owned by the selected Requester.

**Request headers**: `X-Requester-Id: 1`

**Response 200**: binary file stream, `Content-Type` matching the stored
`mimeType`, `Content-Disposition: attachment; filename="<originalFilename>"`.

**Errors**
| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Attachment does not exist, is removed (BR-31), or belongs to a Ticket not owned by the Requester — identical response for all three to avoid disclosing which case applies |

---

## 10. `DELETE /api/attachments/:id`

Soft-remove an active Attachment belonging to an owned Ticket.

**Request headers**: `X-Requester-Id: 1`

**Request body**
```json
{ "reason": "Duplicate of another attachment already on this ticket" }
```

**Response 200**
```json
{
  "id": 8,
  "isRemoved": true,
  "removedAt": "2026-08-20T10:02:00.000Z",
  "removalReason": "Duplicate of another attachment already on this ticket"
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `reason` missing or outside 3–200 characters (BR-32) |
| 404 | `NOT_FOUND` | Attachment does not exist, already removed, or not owned by the Requester (same collapsed response as endpoint 9) |

---

## 11. Expected HTTP Statuses — Summary

| Status | Meaning in this API |
|---|---|
| 200 | Successful retrieval or soft-removal |
| 201 | Ticket or Attachment created |
| 400 | Invalid input, missing/invalid `X-Requester-Id`, missing removal reason |
| 404 | Resource not found OR not owned by the selected Requester (BR-13 — always collapsed, never a separate 403 that would confirm existence) |
| 409 | Attachment limit reached (a state conflict, not a validation error) |
| 413 | Uploaded file exceeds the size limit |
| 500 | Unexpected server error; body never includes stack traces or internal details |

Ownership failures deliberately reuse `404` rather than `403` throughout
this API, so that a Requester probing another Requester's Ticket/Attachment
ids cannot distinguish "doesn't exist" from "exists but isn't yours" — this
directly satisfies BR-13's "no data disclosed" requirement.
