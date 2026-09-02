# AI Use and Reflection — Lab 1

I used **Claude** (Anthropic) as my AI coding assistant throughout Lab 1, working
interactively through chat rather than a fully autonomous IDE agent. I used it to
generate the implementation code for each Issue, debug Git/PostgreSQL/Prisma
environment issues, and write the required Supertest and Vitest tests.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text |
|---|---|
| Understand Lab 1 Scope | "Donne moi les parties de code a écrire pour l'issue 1 du pdf" |
| Fix Failing Health Test | Pasted the failing `npm test` output for `health.test.ts` (500/501 status mismatch) and asked for help |
| Implement Category Model & Seed | "après issue 2/3 je clique sur le bouton check system sur le site et il reste en loading" (led to full Issue 4 diagnosis) |
| Fix Prisma Shadow DB Permission | Pasted error `P3014 — Prisma Migrate could not create the shadow database` |
| Fix Prisma Client Not Generated | Pasted error `@prisma/client did not initialize yet` after `npm test` failure |
| Resolve Git Merge Conflicts | "j'ai corrigé un conflict" (after `.gitignore` and `package-lock.json` merge conflicts between feature branches and `lab1-staging`) |
| Write Categories Supertest | "bah nn je dois pas modifier les tests?" — clarified which stub tests were meant to be written by the student vs. provided as worked examples |
| Write App.tsx Vitest Tests | Asked for the two `it.todo` tests in `App.test.tsx` to be implemented using `vi.spyOn` to mock `checkSystem()` |

## My Reflection

Most of my prompts weren't upfront "write me the whole feature" requests — they were
mostly **error messages pasted directly from my terminal**, and Claude diagnosed the
root cause each time rather than just patching the symptom. For example, my
`.gitignore` had a typo (`node_module/` instead of `node_modules/`), which had let
`node_modules` and a template `.env` get committed into `lab1-staging` on GitHub.
Fixing this cleanly required detracking files, resolving merge conflicts across three
feature branches, and re-syncing each branch with `lab1-staging` before their PRs
could be reviewed — Claude walked me through each step and had me verify with
`git status` before every commit, which caught several mistakes early (e.g. almost
committing conflict markers, almost merging `feature/3-category-seed` directly with
uncommitted files present).

One moment I appreciated: when I asked "je dois pas modifier les tests?", Claude
didn't just say "yes go ahead" — it pointed me to the actual comment inside the stub
file (`// Issue 4 — write this test yourself`) to confirm this was intentional student
work, distinguishing it from the worked example (`health.test.ts`) that I should not
alter. That distinction mattered for staying within the spirit of the assignment.

The main limitation I noticed: Claude cannot edit files directly on my machine — every
code block had to be manually copy-pasted into my own editor. This worked fine for
this lab's scale, but I had to be careful to actually save each file before re-running
tests (I hit this a couple of times, e.g. re-running `npm test` and still seeing the
old 501 stub response because I forgot to save `app.ts`).