# Lab 3 API Specification

Extends `docs/lab-02/api-spec.md`. All Lab 2 Ticket/Attachment endpoints
keep their paths and shapes; the only change is that ownership/identity
now comes from the authenticated session (Section 1) instead of the
`X-Requester-Id` header, which is removed.

## 0. Authentication and Session Decisions

- Sessions are carried via an **httpOnly, `SameSite=Lax`, signed cookie**
  (e.g. `session`), set by the server on successful login. It is never
  readable by client-side JavaScript.
- Session lifetime: a reasonable local-development default (e.g. 8
  hours, sliding on activity) — not specified further by the handout,
  documented here as an implementation choice rather than a business
  rule.
- Passwords are hashed with a standard slow hash (e.g. bcrypt/argon2);
  the hash is never included in any API response, log line, or seed
  script output committed in plaintext.
- CSRF: since the API is same-origin between the Vite dev server proxy
  and the Express backend in this course setup, and the cookie is
  `SameSite=Lax`, a dedicated CSRF token is not required for Lab 3's
  local-development scope; state-changing requests still require
  `Content-Type: application/json` to reduce simple cross-site form
  submission risk.
- Standard error shape (unchanged from Lab 2):
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Human-readable, safe message" } }
  ```

---

## 1. `POST /api/auth/login`

**Request body**
```json
{ "email": "jennifer.anderson@example.com", "password": "correct-horse-battery" }
```

**Response 200** (also sets the `session` cookie)
```json
{
  "id": 1,
  "name": "Jennifer Anderson",
  "email": "jennifer.anderson@example.com",
  "role": "REQUESTER",
  "mustChangePassword": false
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Unknown email, wrong password, or inactive account — identical response for all three (BR-06/BR-07) |
| 400 | `VALIDATION_ERROR` | Missing/malformed email or password |

---

## 2. `POST /api/auth/logout`

Invalidates the current session (server-side session/token revocation,
not just clearing the cookie client-side).

**Response 200**
```json
{ "success": true }
```

---

## 3. `GET /api/auth/me`

**Response 200**: same shape as the login response body.

**Errors**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session |

---

## 4. `POST /api/auth/change-password`

Available to any authenticated user (both the mandatory first-login flow
and a voluntary future change), and is one of the few endpoints reachable
while `mustChangePassword` is true.

**Request body**
```json
{ "currentPassword": "temp-Passw0rd!", "newPassword": "New-Passw0rd!2" }
```

**Response 200**
```json
{ "success": true }
```

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `INVALID_CURRENT_PASSWORD` | `currentPassword` does not match |
| 400 | `WEAK_PASSWORD` | `newPassword` fails BR-09's rules; response includes which rule(s) failed |

---

## 5. Lab 2 Ticket/Attachment Endpoints (authenticated)

All paths and response shapes are unchanged from
`docs/lab-02/api-spec.md`. The only change: remove the `X-Requester-Id`
header requirement everywhere it appeared; the authenticated session's
user id is used instead. Every `404 NOT_FOUND` ownership-collapsing
behavior (BR-13 from Lab 2) is preserved unchanged.

**Errors** (added on top of the Lab 2 set)
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Session is valid but `mustChangePassword` is true |
| 403 | `FORBIDDEN` | Authenticated but not a Requester (an IT Staff/Admin hitting a Requester-only path directly) |

---

## 6. `POST /api/tickets/:id/comments`

Creates a Public Comment or Internal Note.

**Request body**
```json
{ "content": "We are investigating the issue on your device.", "visibility": "PUBLIC" }
```

**Response 201**
```json
{
  "id": 5,
  "ticketId": 42,
  "authorId": 3,
  "authorName": "Michael Brown",
  "authorRole": "IT_STAFF",
  "content": "We are investigating the issue on your device.",
  "visibility": "PUBLIC",
  "createdAt": "2026-09-01T10:30:00.000Z"
}
```

**Authorization**: a Requester may only post `visibility: "PUBLIC"` on an
owned Ticket; `visibility: "INTERNAL"` from a Requester is rejected.
IT Staff/Administrator may post either visibility on any Ticket.

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Empty/whitespace content, or content over 2000 characters (BR-24/BR-25) |
| 403 | `FORBIDDEN` | Requester attempting `INTERNAL` visibility |
| 404 | `NOT_FOUND` | Ticket not owned by / not visible to a Requester caller |

---

## 7. `GET /api/tickets/:id/comments`

**Response 200**: array of the shape above. For a Requester caller,
entries with `visibility: "INTERNAL"` are filtered out server-side
before the response is built — never included and then hidden by the
client (AC-04).

---

## 8. `POST /api/tickets/:id/resolve-indication`

Requester-only. Marks `problemAppearsResolved = true` without touching
`currentStatus`.

**Response 200**
```json
{ "id": 42, "problemAppearsResolved": true }
```

**Errors**
| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Ticket not owned by the Requester |
| 409 | `ALREADY_RESOLVED_INDICATED` | Already true (idempotency guard) |

---

## 9. `GET /api/staff/tickets` (IT Staff Ticket Queue)

IT Staff/Administrator only. Not ownership-scoped — returns Tickets
across all Requesters.

**Query parameters**
| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Ticket Number (partial) or Summary (partial, case-insensitive) |
| `categoryId` | number | — | Exact match |
| `requestedPriority` | `LOW`\|`MEDIUM`\|`HIGH` | — | Exact match |
| `itPriority` | `LOW`\|`MEDIUM`\|`HIGH` | — | Exact match |
| `currentStatus` | string | — | Exact match |
| `ticketOwnerId` | number \| `"unassigned"` | — | Exact match, or filters to `ticketOwnerId IS NULL` |
| `sortBy` | `createdAt`\|`updatedAt` | `createdAt` | |
| `sortDir` | `asc`\|`desc` | `desc` | |
| `page` | number | `1` | |
| `pageSize` | number | `10` | Max `50` |

**Response 200**: same `{ data, pagination }` envelope as Lab 2's
`GET /api/tickets`, with each row additionally including `itPriority`,
`ticketOwnerId`, and `ticketOwnerName` (nullable).

**Errors**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is a Requester |

---

## 10. `GET /api/staff/tickets/:id`

Retrieve one Ticket for staff operations (no ownership scoping — any
active IT Staff/Administrator may retrieve any Ticket).

**Response 200**: full Ticket object (same shape as Lab 2's
`GET /api/tickets/:id`, plus `ticketOwnerId`/`ticketOwnerName` and
`problemAppearsResolved`).

**Errors**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is a Requester |
| 404 | `NOT_FOUND` | Ticket does not exist |

---

## 11. `POST /api/staff/tickets/:id/claim`

Claim an unassigned Ticket, or reassign an already-owned one.

**Request body**
```json
{ "ticketOwnerId": 3 }
```
(`ticketOwnerId` must reference an active `IT_STAFF` or `ADMINISTRATOR`
user; the caller may assign to themselves or to a colleague.)

**Response 200**: updated Ticket object.

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `ticketOwnerId` does not reference an active IT Staff/Administrator user |
| 403 | `FORBIDDEN` | Caller is a Requester |
| 404 | `NOT_FOUND` | Ticket does not exist |

---

## 12. `PATCH /api/staff/tickets/:id`

Update IT Priority and/or Current Status (either or both fields may be
supplied in one request).

**Request body**
```json
{ "itPriority": "HIGH", "currentStatus": "IN_PROGRESS" }
```

**Response 200**: updated Ticket object.

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid `itPriority` enum value |
| 409 | `INVALID_STATUS_TRANSITION` | `currentStatus` target is not a permitted next status from the Ticket's current status (Section 13 matrix) |
| 403 | `FORBIDDEN` | Caller is a Requester |
| 404 | `NOT_FOUND` | Ticket does not exist |

## 13. Status Transition Matrix

| From \ To | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| **New** | ✅ | | | | | | |
| **Open** | | ✅ | | | | | ✅ |
| **In Progress** | | | ✅ | ✅ | | | ✅ |
| **Waiting for Requester** | | ✅ | | | | | ✅ |
| **Resolved** | | | | | ✅ | ✅ | |
| **Closed** | | | | | | ✅ | |
| **Reopened** | | ✅ | | | | | |
| **Cancelled** | | | | | | | |

A blank cell is a rejected transition (`409 INVALID_STATUS_TRANSITION`).
`Cancelled` is terminal in Lab 3 (no Reopen-from-Cancelled path, since
a cancelled Ticket was determined not to need work at all, unlike a
Closed one). This matrix directly implements BR-20/BR-21.

---

## 14. `GET /api/admin/users`

Administrator only.

**Query parameters**: `search` (name/email, partial, case-insensitive),
`role` (`REQUESTER`\|`IT_STAFF`\|`ADMINISTRATOR`, optional). No
pagination parameters (handout explicitly excludes mandatory pagination
for this list).

**Response 200**
```json
[
  { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com", "role": "REQUESTER", "isActive": true },
  { "id": 3, "name": "Michael Brown", "email": "michael.brown@example.com", "role": "IT_STAFF", "isActive": true }
]
```

**Errors**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not an Administrator |

---

## 15. `POST /api/admin/users`

**Request body**
```json
{ "name": "Alex Thompson", "email": "alex.thompson@example.com", "role": "IT_STAFF", "isActive": true }
```
(The initial password is generated server-side, never supplied by the
Administrator, per the UI decision in `ui-spec.md` Section 8; the
created user's `mustChangePassword` is always `true`.)

**Response 201**
```json
{ "id": 12, "name": "Alex Thompson", "email": "alex.thompson@example.com", "role": "IT_STAFF", "isActive": true, "mustChangePassword": true }
```

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid `name`, `email`, or `role` |
| 409 | `DUPLICATE_EMAIL` | Email already in use (case-insensitive) |
| 403 | `FORBIDDEN` | Caller is not an Administrator |

---

## 16. `PATCH /api/admin/users/:id`

**Request body** (any subset)
```json
{ "name": "Alex T. Thompson", "email": "alex.t@example.com", "role": "REQUESTER", "isActive": false }
```

**Response 200**: updated user object (same shape as creation response,
minus `mustChangePassword` unless it changed).

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid field values |
| 409 | `DUPLICATE_EMAIL` | New email already in use by another user |
| 409 | `SELF_DEACTIVATION_FORBIDDEN` | Caller targets their own `id` with `isActive: false` |
| 409 | `LAST_ADMINISTRATOR_PROTECTED` | Target is the last active Administrator and the request would deactivate them or change their role away from `ADMINISTRATOR` |
| 403 | `FORBIDDEN` | Caller is not an Administrator |
| 404 | `NOT_FOUND` | User does not exist |

---

## 17. `POST /api/admin/users/:id/reset-password`

**Response 200**
```json
{ "id": 12, "mustChangePassword": true }
```
(The generated password itself is never returned in this course's local
scope, since Lab 3 excludes email delivery — displaying it once to the
Administrator on-screen so they can relay it out-of-band is an
acceptable local-lab approach; the exact display mechanism is documented
by the student as an assumption if implemented this way.)

**Errors**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not an Administrator |
| 404 | `NOT_FOUND` | User does not exist |

---

## 18. Expected HTTP Statuses — Summary (additions over Lab 2)

| Status | Meaning in this API |
|---|---|
| 401 | Unauthenticated (no/invalid session) |
| 403 | Authenticated but forbidden by role, ownership, or mandatory password change |
| 409 | Conflict: duplicate email, invalid status transition, self-deactivation, last-Administrator protection, already-indicated resolution |

As in Lab 2, ownership failures on Requester-scoped resources continue to
return `404` rather than `403` to avoid confirming existence (BR-13,
carried over unchanged). Role-based access failures (a Requester hitting
a Staff/Admin-only endpoint) return `403`, since there is nothing to hide
about the existence of `/api/staff/*` or `/api/admin/*` themselves — only
individual resource ownership is protected via the `404` pattern.
