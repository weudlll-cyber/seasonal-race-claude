# E2E-LOGIN-1 — the gate the whole suite died at

**Branch `feat/e2e-login`, off master `15294617`.** WIRE-SUITES-1 established the defect:
`ProtectedRoute` landed 2026-06-14, no spec authenticated, and **85 of 102 tests died at `/login`**
while specs kept being written against a suite nothing ran.

**Result: 17 → 63 passing. 85 → 40 failing. 10.7 min → 7.7 min. Not one test assertion was edited.**

---

## Step 0 — the audit document has a home

`reports/evolution/CHECK-AUDIT-1.md` sat untracked, which is why `check-index` was red and why the
WIRE-SUITES-1 commit needed `--no-verify`. Committed in **`b96ddaef`, as written** — not a heading,
not a number, not a verdict. It is another author's record and `reports/` is append-only.

`err.txt`, `out.txt` and the modified `.vscode/settings.json` stayed out, as decided when a
`git add -A` first swept them in. `check-index` is green and **this block's own commits went through
the hook with no bypass**.

## The fixture

**Playwright's own mechanism: a `setup` project that writes `storageState`, and a `chromium` project
that `dependencies: ['setup']` and consumes it.** Every spec under `testDir` runs in that project, so
**a new spec file is authenticated because of where it lives**, not because its author remembered
anything.

**The alternative I rejected: an exported `login(page)` helper.** It works and it is simpler — and a
spec author can forget to call it. The failure mode of forgetting is a 30 s timeout at `/login`,
which is *exactly* the defect this fixture removes and would be indistinguishable from it.
Configuration cannot be forgotten; a habit can.

### How the account was obtained — no secret, none asked for, none committed

The run **creates its own account the way a first-time user does**, against a server it starts for
itself:

1. `playwright.config.js` starts **an isolated API** with `RA_DATA_DIR` pointed at a fresh temp
   directory — the server's own documented redirect for all runtime storage. A fresh directory has
   no `setup-complete.json`, so first-run setup is open; the server seeds it from `server/seeds/` on
   boot, so it has tracks and brands.
2. Everything secret is **generated per run** — bootstrap token, session secret, username, password —
   and lives only in the process environment.
3. `auth.setup.js` posts them to `/api/auth/setup`, the real first-run endpoint gated by that token,
   then **logs in through the real login form** and saves the browser state.

**Nothing is committed.** The state file goes to `client/e2e/.auth/`, which is gitignored, and it is
asserted to be an authenticated state before it is saved — otherwise every spec would later fail with
a redirect that looks like a new bug.

`RA_E2E_USERNAME` / `RA_E2E_PASSWORD` override the generated pair for pointing at an existing
instance. **Nothing must be supplied**, because the run can always make its own.

**The owner's server was never touched, and that mattered more than it looks.** The old config ran
`npm run dev -- --port 5173` with `reuseExistingServer: true`, so a run on this machine silently
tested **whatever was already listening — his dev server, his data, his login**. That is also why the
suite could never authenticate: there was no account it was entitled to create. The run now uses
**4399 and 5399**, and touches nothing on 4000, 5173 or 4173.

**Nothing in `ProtectedRoute` was weakened, no test-only bypass was added, no auth check was
stubbed.** The gate is used, not removed.

## Before and after

| | before | after |
| --- | ---: | ---: |
| passed | 17 | **63** |
| failed | 85 | **40** |
| wall clock | 10.7 min | **7.7 min** |

The setup project itself passes in **3.0 s**. The before-figures are WIRE-SUITES-1's, measured with
the same 30 s per-test cap.

**45 of the 85 failures were the login gate and nothing else.**

## The 40 that remain — one line each, and NOT repaired

Grouped by cause, because they arrive in clusters rather than individually.

| # | cluster | verdict |
| --: | --- | --- |
| 12 | `locator('canvas')` **strict-mode violation: resolved to 2 elements** — a background canvas and `.race-canvas` (`b1617` ×2, `camera-polish` 175/199/438/479/619/629, `d9` 321/332/342/352) | **STALE TEST.** The race screen legitimately draws two canvases; the bare `canvas` selector was written when there was one. The product is fine; the selector is old. |
| 9 | **Dev Screen Base Speed** — `V8`/`V9`/`V10`/`V12` assert `0.00091` / `0.00118` | **STALE TEST, measured.** The shipped defaults are **`0.00096` / `0.00113`** (`DEFAULT_BASE_SPEED_CONFIG`); the speed model was deliberately rebaselined (normalSpeed 225 → 150). Several also time out waiting for the `Base Speed` section button, which suggests the Dev Screen was reorganised too. |
| 8 | **`d9` lap selector** (94/101/109/123/128/146/197/202) — waiting for `getByRole('button', { name: '1' })`, and 123 fails strict-mode on that same name | **STALE TEST.** The selector matches by bare digit and the UI now has more than one such button. Loose locator, changed screen. |
| 3 | **`fix-list-tracks-world-dimensions`** — waiting for a `select` containing **'Large Test Track'** | **TEST DEPENDS ON DATA IT DOES NOT CREATE.** That track exists in nobody's seeds; it was in someone's local data. Environmental, not a product defect — and only visible now that the suite runs against a clean instance. |
| 2 | **`d9` session data** (210/230) — `session.targetDuration` is `undefined` | **STALE TEST, probably.** The app writes **`targetDurationSec`**; the spec asserts `targetDuration`. A renamed field. Worth an eye because the surrounding assertions do pass. |
| 2 | **`d355` Edit-Modal** (36/72) — count assertions; the info-icon one waits on a `role="tooltip"` span that is `hidden` | **STALE TEST.** Tooltips are hidden until hover; the spec expects them visible. |
| 2 | **`vre-2` validation recovery** (82/100) — timeouts | **UNCLASSIFIED.** Times out before reaching an assertion; needs a look at the screenshot the run saved. |
| 1 | **`vre-2` 181 — Reset-to-Default does not remove the Modified badge** (`not.toBeVisible()` failed) | **POSSIBLE REAL DEFECT.** This is the one I would look at first. The test reaches the UI, performs the action, and the badge stays. Either the reset is not clearing the override or the badge is not re-reading it. |
| 1 | **`vre-2` 217 — `locator.fill: Malformed value`** on a preview slider | **STALE TEST.** The input's type or accepted format changed; `fill` is being given a value the control now rejects. |

**Nine of ten clusters read as stale tests describing a product that moved on without them — which is
what two months behind a locked gate produces.** One is a candidate defect.

## Where it runs — night work, in writing

**The owner decided on 2026-08-16: this suite runs during night work, never on every push.** At 7.7
minutes it is still roughly four times the whole per-push CI run, and its flake budget is unknown
because until today it had never completed successfully.

- **The invoker:** `npm run test:e2e` from the repo root. One command; it brings its own servers.
- **One home for it:** `docs/NIGHT-RUN.md`, which now carries the command, what it starts, and the
  reason it is not in CI.
- **`docs/VERIFY-RULES.md` R12a** states that the suite is deliberately outside the ordinary path and
  **points at NIGHT-RUN.md rather than repeating it**.
- **It stays out of CI and out of `npm run verify`'s routing**, and `verify.test.mjs` still asserts
  that — with its comment rewritten so the next reader sees a decision rather than an oversight, and
  extended to cover the fixture files.

## Fingerprints

```
$ node scripts/engine-reach.mjs --check client/playwright.config.js client/e2e/auth.setup.js \
      client/e2e/e2e-env.js client/.gitignore scripts/verify.test.mjs docs/NIGHT-RUN.md \
      docs/VERIFY-RULES.md package.json reports/evolution/CHECK-AUDIT-1.md reports/evolution/INDEX.md
ENGINE REACH: none of 10 path(s) can reach the race engine.        (exit 1)
```

**None of the four can move.** Test fixtures, a report, an index line and documentation are outside
every instrument's closure, and nothing was measured beyond that.

## Hygiene

| file | before | after |
| ---- | -----: | ----: |
| `client/playwright.config.js` | 29 | 87 |
| `client/e2e/auth.setup.js` | — | 88 (new) |
| `client/e2e/e2e-env.js` | — | 58 (new) |
| `client/.gitignore` | — | 4 (new) |
| `scripts/verify.test.mjs` | 750 | 760 |
| `docs/NIGHT-RUN.md` | 94 | 121 |
| `docs/VERIFY-RULES.md` | 460 | 477 |
| `package.json` | 17 | 18 |
| `reports/evolution/CHECK-AUDIT-1.md` | — | 231 (committed as written) |

**Removed:** the config's `reuseExistingServer: true` against port 5173 — the line that made every
run test whatever happened to be up. That is the orphan this change creates and it is gone rather
than left as a fallback.

**Extracted:** `client/e2e/e2e-env.js`, so the config (which starts the servers) and the setup spec
(which logs in) derive ports, URLs and credentials **identically** instead of passing them between
two processes.

**Noticed and deliberately left alone:**

1. **All 40 remaining failures.** The brief forbids repair and it is right to: nine of ten clusters
   are stale assertions, and rewriting them unattended would be inventing what the product should do.
2. **`client/e2e/` still holds three non-spec directories** (`camera-look-comparison`,
   `camera-pan-diagnostic-output`, `render-smoothness-output`) — diagnostic output inside `testDir`.
3. **The suite runs 7 workers despite `fullyParallel: false`** — that flag only serialises *within* a
   file. Files still run concurrently against one shared server instance, which is a plausible source
   of the flake budget nobody has measured.
4. **`.github/workflows/deploy.yml`** — CHECK-AUDIT-1's third finding, still open.
5. **The temp data directory is not cleaned up** after a run. Each run makes a new one under the
   system temp directory; they are small, and deleting them is a job for a cleanup step nobody has
   asked for yet.

---

## PROPOSALS

1. **Triage the 40 in one pass, then delete what is dead.** The clusters make this much smaller than
   it looks: fixing the `canvas` selector alone should recover 12, and the Base Speed numbers another
   9. But some of these specs test screens that have changed shape entirely, and **a stale test that
   is repaired into passing is worse than a deleted one** — it asserts what somebody guessed the
   screen should do. The honest pass is: fix the selectors, re-measure, and delete whatever still
   fails for a reason nobody can defend.

2. **Look at `vre-2:181` first — Reset-to-Default leaving the Modified badge.** It is the only
   failure that reaches the UI, performs a real action and gets a wrong answer. If it is real it is a
   user-visible bug in override handling, and it has been invisible for two months.

3. **Give the suite its own seed fixture rather than depending on what a data directory happens to
   hold.** `fix-list-tracks-world-dimensions` waits for a track that exists in nobody's seeds. A spec
   that needs a large-world track should create one through the API in a `beforeAll` — the fixture
   now proves that pattern works, because the account it creates is made the same way.

4. **Measure the flake budget before anyone argues about the trigger.** Run the suite five times
   unchanged and count tests whose result is not stable. Everything said about this suite's
   reliability so far — including in this report — is inference from a single run. Five runs is an
   hour of night time and would replace the guess with a number.
