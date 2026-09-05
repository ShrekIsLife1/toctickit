# AI Use and Reflection — Lab 2

I used **Claude** (Anthropic) as my AI coding assistant throughout Lab 2,
working interactively through chat. I used it to draft the engineering
contract (`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`)
before writing any code, then to implement each Issue incrementally, and to
diagnose and fix a series of real bugs that only surfaced once features
were exercised end-to-end (Prisma concurrency, React Router auth timing,
Playwright responsive layouts).

## Selected Key Prompts

| Prompt Name | Actual Prompt Text |
|---|---|
| Plan Lab 2 Issues | "on fait pareil que pour le 1, le base code est celui a la fin du 1. Objectif le séparer en plusieurs issues + kaban + github tout ca tout ca" |
| Draft the Engineering Contract | "specification md je valide tout et go sur tests" (after reviewing a full first draft of specification.md) |
| Implement Development Requester Context | Followed a step-by-step build of the `RequesterUser` model, seed, `GET /api/requesters`, selector screen, and context, confirming each step with "good"/"bon" before continuing |
| Fix a Page-Reload Navigation Bug | "quand je create ticket ca se stoppe" — led to discovering a plain `<a href>` was doing a full page reload instead of client-side navigation |
| Fix a Prisma Race Condition | Pasted a `PrismaClientKnownRequestError: Unique constraint failed on the fields: (ticketNumber)` triggered by parallel test execution |
| Debug Playwright Responsive Selectors | Pasted repeated Playwright `strict mode violation` errors caused by both the desktop `<table>` and the mobile card view existing in the DOM simultaneously |
| Fix a Redirect Race Condition | Investigated why `page.goto()` to another requester's ticket URL redirected to the selector screen instead of showing a safe not-found state — traced to `RequesterContext` reading `sessionStorage` after `RequireRequester` had already checked it |
| Diagnose a Blank Screenshot | Shared a screenshot showing "Loading ticket…" instead of the expected ticket detail, leading to an explicit wait for the heading before capturing |

## My Reflection

Compared to Lab 1, most of the genuinely useful debugging in Lab 2 came from
issues that only appear once a feature is exercised as a full system rather
than in isolation: a Requester Ticket Number collision under concurrent
requests, a login-like context that raced against its own `sessionStorage`
read on page reload, and Playwright tests failing not because the app was
broken but because both the desktop table and the mobile card markup exist
in the DOM at the same time (jsdom and a real browser disagree on what
counts as "visible"). None of these were things I could have caught by
reading the code alone — they only showed up once I actually ran the
tests and pasted the real error output back into the conversation.

I also noticed a recurring pattern worth naming: several early failures
were not application bugs at all, but stale terminal output from editing
the wrong file, forgetting to save, or letting a copy-paste strip quote
characters. Learning to distinguish "this is a real regression" from "this
is leftover output from before my last edit" was itself a skill this lab
exercised, separate from the actual engineering work.

One limitation worth noting: because Claude cannot run commands on my
machine, every fix had to be manually copied into my editor and verified by
re-running the tests myself. This is slower than an integrated coding
agent, but it forced me to read and understand every diff before applying
it, which matches the course's explicit expectation that I remain
responsible for the implementation rather than delegating understanding to
the agent.
