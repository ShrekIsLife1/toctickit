# AI Use and Reflection — Lab 3

I used **Claude** (Anthropic) as my AI coding assistant throughout Lab 3,
working interactively through chat. Lab 3 was the largest sprint so far —
real authentication, three roles, a status-transition matrix, and an
Administrator screen — and most of the useful work came from diagnosing
real bugs that only surfaced once the pieces were wired together end to
end, several of them severe enough to crash the backend process entirely.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text |
|---|---|
| Plan Lab 3 Issues | "on a un lab 3 essaie de le répartir en plusieurs issues comme d'hab et ensuite on les faits une par une dans l'ordre + nom et description (en anglais) pour le kanban" |
| Draft the Engineering Contract | "je te fais confiance tkt" / "on continue" (after reviewing specification.md, tests.md, ui-spec.md, api-spec.md drafts) |
| Diagnose a Data-Loss Migration | "prisma m'a demandé si je voulais bien supprimer requester user j'ai dit oui" — led to discovering the RequesterUser→User rename had been a destructive drop/recreate rather than an in-place rename |
| Push Back on Skipping Tests | "t'es sur qu'on fasse pas les tests? s'ils sont pas nécessaires ok" — a case where I initially agreed to skip a test too easily and was corrected for it |
| Diagnose a Server Crash | Pasted a repeating `SyntaxError: Unexpected token '1', "1" is not valid JSON` crash from body-parser, traced through a request logger to `POST /api/tickets`, and finally to a stale two-argument call to `createTicket(user.id, {...})` left over from the Issue 13 auth migration |
| Fix a Vitest Parallelism Bug | Investigated two flaky 401s in `comments-notes.api.test.ts` that only failed when the full suite ran in parallel, traced to `express-session`'s default `MemoryStore` under concurrent test workers, fixed with `fileParallelism: false` |
| Catch a Silent UX Bug via E2E | An E2E test for "edits a user's basic information" failed because the success panel closed itself before the confirmation message could ever be seen — caught only because the test asserted on visibility, not just the API call |

## My Reflection

The most valuable moments this sprint were not the large scaffolding steps
(the auth model, the status matrix, the admin CRUD) — those went smoothly
because they were spec'd out in detail beforehand. The valuable moments
were the failures that only showed up once real requests flowed through
the whole stack: a Prisma migration that looked like a rename in the
prompt but was actually a destructive drop, a stale function-call
signature that silently serialized a user id instead of a ticket object
and crashed the Express process on every submission, and a session-store
concurrency bug that only appeared when the full test suite ran in
parallel. None of these were things static analysis or a code review
alone would have caught — they needed the actual error output, pasted
back into the conversation, to diagnose.

I also want to flag a moment of my own inconsistency: partway through this
sprint I told Claude to skip writing a test for `PublicComments.tsx` with
"azy" (lazy), and it agreed and moved on. When I asked afterward whether
that was really the right call, it walked back the shortcut, pointed to
the specific line in our own `tests.md` Definition of Done that the
shortcut violated, and we wrote the test. That was useful — but it also
means I should hold the line myself the first time, rather than relying on
a follow-up question to catch it.

The E2E suite (Issue 18) earned its place in the process this sprint in a
way it hadn't as clearly in Lab 2: two real product bugs (the server
crash, and a success message that was never visible to the user) were
only caught because the E2E tests asserted on what a real user would
actually see, not just on whether an API call fired.