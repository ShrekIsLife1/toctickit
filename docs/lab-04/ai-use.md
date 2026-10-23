# AI Use and Reflection — Lab 4

I used **Claude 3.5 Sonnet** (via the Google Antigravity AI pair programming assistant) throughout Lab 4 (Sprint 4). Lab 4 completed the full TokTickIT service desk: parent-child Actions Taken tracking, resolution gate enforcement, optimistic concurrency protection, multi-role operational dashboards, and full application hardening.

---

## Selected Key Prompts

| Prompt Name | Actual Prompt / Intent | Engineering Focus & Outcome |
|---|---|---|
| **1. Plan Sprint 4 Issues** | *"on a un lab 4 essaie de le répartir en plusieurs issues comme d'hab et ensuite on les faits une par une dans l'ordre + nom et description (en anglais) pour le kanban"* | Decomposed Sprint 4 into 8 structured issues (Issues 20 to 27) covering Spec DD, Test DD, DB/API, Workflow, UI, Dashboards, Hardening, and Visual/E2E/Release. |
| **2. Enforce Resolution Gate (BR-14)** | *"Comment s'assurer que la clôture/résolution d'un ticket exige obligatoirement un ticket owner et au moins une action prise, même si quelqu'un appelle l'API directement ?"* | Designed backend validation in `resolutionGate.ts` returning 409 `RESOLUTION_GATE_NOT_MET` with detailed missing criteria, preventing API bypass. |
| **3. Optimistic Concurrency** | *"Ajoute la gestion des conflits avec expectedVersion pour que deux techniciens n'écrasent pas silencieusement leurs modifications sur un ticket ou une action."* | Implemented `version` increments on Tickets and Actions Taken; rejected stale writes with 409 `STALE_UPDATE` and provided frontend conflict recovery banners. |
| **4. Advisory Requester Indication** | *"Le requester peut dire que le problème est résolu mais ne doit pas changer le statut officiel du ticket."* | Created `POST /api/tickets/:id/resolve-indication` setting `problemAppearsResolved: true` without altering `currentStatus` or satisfying the resolution gate. |
| **5. Actions Taken UI & Concurrency** | *"Crée le composant ActionsTakenSection avec affichage responsive (tableau desktop, cartes mobile), validation du follow-up note et gestion du 409."* | Built `ActionsTakenSection.tsx` with responsive layout, field validation (required note when followUpRequired is true), and conflict recovery. |
| **6. Dashboards Aggregation** | *"Conçois les dashboards pour Requester et IT Staff de sorte que chaque carte corresponde à une requête SQL/Prisma exacte avec drill-down vers la liste filtrée."* | Implemented `/api/dashboard/requester` and `/api/dashboard/staff` returning authoritative metric counts and drill-down links (`/my-tickets?status=...`, `/staff/queue?owner=unassigned`). |
| **7. Hardening & Accessibility** | *"Vérifie l'accessibilité selon WCAG AA pour la navigation au clavier et les outlines de focus visible."* | Enhanced `client/src/styles/theme.css` with 2px high-contrast focus rings (`:focus-visible`), aria labels on cards, and non-color cues for statuses. |
| **8. Double-Check & Final Verification** | *"on reprends la 27 MAIS on double check tout ce qui est a faire/ a été fait absolument"* | Conducted a complete audit of all requirements, test coverage (127 server, 67 client tests, 3 Playwright E2E suites), documentation, and migration safety. |

---

## My Reflection

### 1. AI as Specification Agent
Using AI during the specification phase (Spec DD in `docs/lab-04/specification.md`, `api-spec.md`, `ui-spec.md`) paid massive dividends during implementation. By explicitly establishing business rules before writing any implementation code (notably **BR-14** for the resolution gate, **BR-15** for the non-binding requester advisory indicator, and **BR-16/BR-17** for integer versioning), we avoided architectural ambiguities. When the AI prompted clarifying questions about edge cases—such as whether a ticket can have actions taken after being closed (yes, for post-closure documentation) versus cancelled (strictly forbidden)—answering them upfront ensured that neither the backend nor frontend required backtracking.

### 2. AI as Coding Agent
During the coding phase, the AI proved highly effective at generating type-safe Prisma queries, robust Express route handlers, and accessible React components. However, human oversight was critical in several areas:
- **Concurrency & Stale Updates:** The AI initially handled updates with simple `UPDATE` queries. Ensuring strict optimistic concurrency required enforcing `expectedVersion` in both the database transaction and frontend state management to prevent silent data overwrites.
- **Defensive Regression Guardrails:** Because Sprint 4 touches core ticket lifecycles and navigation, earlier tests from Labs 1, 2, and 3 were at risk of breaking (e.g. post-login redirects pointing to dashboards instead of queues). Keeping the entire test suite active at each step caught these subtle shifts early.
- **Accessibility & UX Polish:** Automated code generation often neglects visible focus rings or keyboard navigation. Directly requesting WCAG AA compliance and testing focus indicators across responsive viewports ensured a truly polished product under the Zen Green design system.
