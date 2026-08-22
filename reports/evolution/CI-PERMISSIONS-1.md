# CI-PERMISSIONS-1 — the token scope is declared where the jobs are

**Date:** 2026-08-22 · **Branch:** `ci/least-privilege-permissions` off master `c89d09ce`
**Piece 3 of NIGHT-2026-08-22.** The only item the VPS list calls a MUST.

---

## §1 — WHAT WAS MISSING, AND WHAT IT WAS ACTUALLY COSTING

`.github/workflows/ci.yml` had no `permissions:` block at any level. Its sibling
`audit-schedule.yml` has had one since it was written — `contents: read` plus `issues: write`,
because it opens and closes an issue.

**The measured state of the repository, taken before writing anything:**

```
$ gh api repos/:owner/:repo/actions/permissions/workflow
{"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}
```

**So the workflow was NOT running with a write token, and nothing was exposed.** The first draft of
the comment in the file said the inherited default is write access to contents, issues, pull
requests and packages — that is the GitHub default for older repositories and **it is not true
here**. It was corrected before commit, because a security note that overstates what it fixes is
worse than none.

**Two things are still genuinely gained, and they are what the block is justified on:**

1. **`read` as a default means read on EVERY scope** — actions, checks, contents, deployments,
   issues, metadata, packages, pages, pull-requests, security-events, statuses. An explicit block
   makes every scope it does not name `none`. The reduction is real: **read-everything becomes
   read-contents**, for every step in all three jobs — including `npm ci`, which executes
   third-party install scripts.
2. **The default is a repository SETTING, not a fact about this file.** Anyone with admin can flip
   it to write in the UI and no diff would ever show it. Declared in the workflow, the scope travels
   with the file, survives a settings change, and is reviewable next to the jobs it governs.

## §2 — ESTABLISHED BY READING THE JOBS, as ordered

Three jobs — `client`, `server`, `docs`. What each does with the token:

| what runs | needs |
| --- | --- |
| `actions/checkout@v4` (all three jobs, `fetch-depth: 0`) | clones over HTTPS and persists the token as a git credential → **`contents: read`** |
| `scripts/check-tags.mjs` (docs job) | `git ls-remote --tags origin` — goes back to the remote through that same persisted credential → **`contents: read`** |
| `actions/setup-node@v4`, `npm ci`, `npm audit`, `npm run lint`, `npm run format:check`, `npm run test:coverage`, `npm test`, `node --test`, and all thirteen guard scripts | network and filesystem only. **No GitHub API call at all.** |

**The absence claim, re-established over the whole tree rather than inherited:** searching
`.github/` and `scripts/` for `GITHUB_TOKEN`, `github_token`, `gh api`, `gh issue` and `gh pr`
returns hits **only in `audit-schedule.yml`** (lines 156–182), which creates, comments on and closes
an issue — and declares `issues: write` for precisely that. **Nothing in `ci.yml` writes anything to
GitHub:** no comment, no release, no package publish, no check-run update, no OIDC token request,
no artifact upload.

**The search could have matched** — it does match, six times, in the file next door. That is what
makes the empty result for `ci.yml` evidence rather than an untested pattern.

## §3 — WHAT WAS WRITTEN

```yaml
permissions:
  contents: read
```

At **workflow level**, between `on:` and `jobs:` — the same position as in `audit-schedule.yml`.
Verified to parse at the right level rather than assumed:

```
$ python -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(d.get('permissions'), list(d['jobs'].keys()))"
{'contents': 'read'} ['client', 'server', 'docs']
```

**NO JOB-LEVEL BLOCK WAS ADDED, because no job needs more than the floor.** The brief's instruction
— scope any extra at job level rather than raising the floor — did not have to be exercised, and the
reason it did not is written into the file so the next person who needs a write scope knows where it
goes.

## §4 — CI ON THE BRANCH, BEFORE THE MERGE

**R8 exception 1 applies in full: this change touches CI, so the local verify is marking its own
homework and CI must be green FIRST.**

**A push of the branch alone would NOT have answered it.** `ci.yml` triggers on `push` to
`[main, master]` and on `pull_request` to `[main, master]` — a feature branch push produces no run.
So PR **#151** was opened for the purpose, and it is what the exception actually requires.

**Run `32602458551` — all three jobs green, on the branch, before the merge:**

```
success   Client checks
success   Server tests
success   Living-doc guards + script tests
```

**The docs job is the one that proves the scope is sufficient rather than merely accepted.** It runs
`scripts/check-tags.mjs`, whose `git ls-remote --tags origin` is the only step in the workflow that
goes back to GitHub after the checkout. Under `contents: read` it passed, so the tag list was
readable — which is the single thing that could have gone wrong and would have shown up as a docs-job
failure rather than as anything obviously about permissions.

**What a failure here would have meant, decided before the run so the result could not be rationalised
afterwards:** a job failing for want of a permission is information, and the response is to widen
*exactly that one* at *that job* and record which job needed what. A job failing for any other reason
is a different finding and does not license widening anything.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| **CI on the branch** | **REQUIRED AND RUN — R8 exception 1.** PR #151, run `32602458551`: Client checks, Server tests and Living-doc guards all `success`. §4. |
| `npm run verify` | **RAN.** It is not the authority here (R8 exception 1) but it proves the change breaks no guard. |
| world / camera / render fingerprints | **NOT RUN, answer already determined.** The only file changed is `.github/workflows/ci.yml` and a report. No source, no default, no drawn frame. |
| client suite, browser gate, 80-race sheet | **NOT RUN** — R15a and R15c. Nothing the suite or the eye can see changed. |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| add a least-privilege `permissions:` block at workflow level | done — `contents: read` |
| establish it by READING the jobs, not copying a template | done — §2, with the token-usage search re-established tree-wide and shown able to match |
| if one job needs more, scope the extra at job level | **not exercised — no job needs more.** Why, and where a future one would go, is written into the file |
| CI green on the branch via its PR BEFORE the merge (R8 exception) | done — PR #151, run `32602458551`, three jobs green. A branch push alone produces no run here; the PR is what makes the exception answerable (§4) |
| if a job fails for want of a permission, widen exactly that one and record which needed what | **did not occur.** The decision rule was fixed before the run rather than after it (§4) |

## SOURCE HYGIENE

| | |
| --- | --- |
| `.github/workflows/ci.yml` | +30 lines — two of them the block, twenty-eight the reasoning |
| removed | nothing |
| extracted | nothing |
| shipped source changed | **none** |

**Why twenty-eight lines of comment for a two-line block.** Every other decision in this file carries
its reasoning inline — the hand crank, the docs-only skip, the unskippable docs job, the acorn
install. A bare `permissions:` block would be the one thing in the file a reader has to take on
faith, and the specific thing worth writing down is the part that is easy to get wrong: **this
repository's default was already `read`**, so anyone auditing later would otherwise be unable to
tell whether the block closed a real hole or was cargo-culted.

**NOTICED BUT LEFT:**

- **`deploy.yml.disabled` has no `permissions:` block either.** It is disabled by its extension and
  no run can be produced from it. Left alone deliberately: editing a disabled workflow to satisfy a
  rule about running ones is work that cannot be verified — CI will never exercise it. **It should
  get one before it is ever re-enabled**, and that belongs to whoever re-enables it.
- **`can_approve_pull_request_reviews` is `false`** on this repository, which is the safe setting.
  Recorded because it is the other half of the token-scope question and would otherwise have to be
  looked up again.
- **The docs job's `npm ci --omit=optional --ignore-scripts`** is the one install in the workflow
  that does *not* run install scripts. The other two (`client`, `server`) do. Not changed — the
  permissions block is the mitigation this piece was asked for, and narrowing an install is a
  different decision with its own blast radius.

## PROPOSALS — for the owner, nothing done

1. **Set `permissions: {}` and grant per job instead.** `contents: read` at workflow level is read
   for all three jobs; the `client` and `server` jobs arguably need only the checkout, which is the
   same scope, so today this would change nothing observable. **Value:** it makes the floor
   literally nothing, so a future job starts with no access and has to ask. **Cost:** three blocks
   instead of one to say the same thing today, and a new job silently fails at checkout until
   someone works out why. Recommended only if a job is ever added that should not read the repo.
2. **A guard that fails when a workflow file has no `permissions:` block.** This piece found the gap
   by hand off a list; the same gap can reappear the day a fourth workflow is added.
   **As a rule inside an existing guard (R13), not a new script.** **Cost, and it is the reason this
   is a proposal rather than a build:** it must decide what to do about `deploy.yml.disabled` and
   about job-level blocks that legitimately override a workflow-level one, and a guard that gets
   either wrong pressures someone into writing a permission they do not need — which is the opposite
   of what it is for (R11).
