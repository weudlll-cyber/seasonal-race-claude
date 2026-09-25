# BROWSER-GATE-PREMERGE-1 — does the pre-merge gate fire for the three candidate specs?

**2026-09-25. Established at the tree. Nothing was wired, and nothing is proposed.**

**THE DECISION, recorded as fact and date:** on 2026-09-25 the owner decided the widened browser set
should run BEFORE a merge rather than after it, with three candidate specs — `d9-smoke.spec.js`,
`race-identifier.spec.js`, `teams-session.spec.js` — to be wired into the pre-merge gate **only if
they would actually fire there**. This report answers only that conditional.

## The answer, first

**They would not fire, and not because of the arming list. THE PRE-MERGE GATE RUNS NO PLAYWRIGHT
SPECS AT ALL.** There is no pre-merge spec set for the three to be added to.

## 1 · Which set does the pre-merge browser gate run today?

**None.** What `--premerge` calls "the browser ship gate" is one guard:

| | |
|---|---|
| `scripts/verify.mjs:257` | `export const GATE_GUARD = "viewer-invariants";` |
| `scripts/verify.mjs:428` | `return { cmd: ["node", g.source, "--gate"], exclusive: true };` |

So the command it spawns is `node scripts/viewer-invariants.mjs --gate`. That is a Chromium guard
that builds the client, boots an isolated API and preview server and drives two races — which is why
`verify.mjs:30` calls it a browser gate. **It is not a spec runner.** `verify.mjs` contains no
reference to Playwright, to `e2e/`, or to any `.spec.js`.

The curated Playwright set lives at **`client/package.json:54`**, `test:e2e:prod:fast`, 7 specs. Its
**only** consumer is **`.github/workflows/browser-gate.yml:177`**,
`npm run test:e2e:prod:fast --prefix client`.

## 2 · Which paths arm it?

The pre-merge gate arms on the paths `viewer-invariants` declares, read from the guard itself
(`node scripts/viewer-invariants.mjs --declare`) rather than transcribed:

```
dirs:  client/src/modules/camera/
       client/src/screens/RaceScreen/
files: client/src/modules/storage/defaults.js
       client/src/modules/viewerProbe.js
```

Both conditions are necessary (`verify.mjs:269`, `premergeDecision`): `--premerge` given **and** the
diff reached a declared path.

The Playwright set has **no arming list at all**, because it is not selected by diff. Its trigger is
the workflow's:

```yaml
on:
  push:
    branches: [master]
  schedule:
    - cron: '41 5 * * *'
  workflow_dispatch:
```

No `pull_request`, no feature branches.

## 3 · Would the three be armed?

| spec | what it exercises (routes it drives) | armed by the list in §2? |
|---|---|---|
| `d9-smoke.spec.js` | lap selector, duration estimates, session data, race startup across racer types — `/setup`, `/race` | **Only incidentally.** `client/src/screens/RaceScreen/` is declared, so a RaceScreen change arms the gate — but what it arms is `viewer-invariants`, not this spec. A change to the setup screen or racer types arms nothing. |
| `race-identifier.spec.js` | the identifier path — `/setup`, `/dev` | **No.** Neither route's source is in the list. |
| `teams-session.spec.js` | admin assigns a team, team rides the session — `/dev`, `/login` | **No.** Auth and the dev screen are not in the list. |

★ Judged from the arming list, not from what each spec is "about". But the column is close to
irrelevant: even a spec that arms the gate does not get RUN by it, because the gate runs one guard
and no specs.

## 4 · The decision rule, and which case fired

**Case (B).** Nothing was wired anywhere.

Widening `client/package.json:54` would widen the **post-merge** workflow only — the opposite of what
the decision asks for. Making the three run before a merge means adding a Playwright step to
`verify`, which is a second gate mechanism with its own build, its own isolated stack and its own
minutes, not a wiring job. Per the brief's own instruction, that is a design question and this block
stops at naming it.

**Where the three belong instead:** the post-merge browser gate, which already runs a curated set of
exactly this kind. They were **not** added there — that is the owner's next decision.

## 5 · What was NOT touched

`playwright.prod.config.js`, the workflow's triggers, `client/package.json`'s list, and the retry
settings — all unchanged. No proof-of-firing run was made, because case (A) never arose.

★ **The three known-failing specs** — `arrival-shape`, `comeback-precedence`, `garden-path-finishes`
— were not pulled into anything, because nothing was widened. They now have their own backlog row.
