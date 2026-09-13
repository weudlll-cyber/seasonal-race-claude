# MERGE-HALTED-2026-09-14 — the branch is NOT merged: one failure is a real defect

**NOT MERGED. NOTHING IMPRINTED. NO TAG. THE BRANCH IS NOT DELETED.** The branch is pushed and stands
at origin. This report is the reason.

★★ **THE STOP, IN ONE LINE: `check-runin-frame` is GREEN ON MASTER AND RED ON THE BRANCH**, with the
finish line leaving the canvas entirely in two cases. That is a class **(b)** failure — a real defect,
not an input that legitimately moved — and the decision rule says stop, push, report, do not merge and
do not imprint.

---

## 1 · REAL STATE

| | |
|---|---|
| `master` | **`b6d77637`** (local and origin agree) |
| `night/2026-09-12b` | **`8166c757`** (local and origin agree — **already pushed**) |
| ahead / behind | ★ **41 commits ahead, 0 behind** |
| contained in master? | ★ **NO.** `git branch --contains` returns nothing; merge-base **is** master, so it would fast-forward — which is why `--no-ff` was the plan |
| diff | **60 files, +7 990 / −214** |

### ★ PRODUCT CODE — what the owner could see in the browser

| file | added |
|---|---|
| `client/src/modules/racePlanner.js` | +246 — the trajectory servo, the arrival ceiling, the steering |
| `client/src/modules/heroCurveGenerator.js` | +241 — hero casting and curves |
| `client/src/modules/raceCore.js` | +36 — the engine step |
| `client/src/screens/RaceScreen/index.jsx` | +41 — the race screen (★ **no draw call among them**) |
| `client/src/screens/RaceScreen/RaceScreen.css` | +6 |

**Tests under `client/src`** (not product behaviour): `arrivalShape.test.js` (+210, new),
`stagedComeback.test.js` (+210), `raceOverrun.test.js` (+61, new), `heroCurveGenerator.test.js` (+24),
`raceIdentifierReproduction.test.js` (+2, a line citation).

**Everything else is tooling, tests or record:** 14 files under `scripts/`, two new `client/e2e/` specs,
`server/scripts/dev-start.js` + `server/package.json`, one `.claude/skills/` document, and the
`reports/` + `docs/` set.

---

## 2 · FINGERPRINTS — WHAT THE TOOLS SELECT

`node scripts/engine-reach.mjs --check <the 60 changed paths>`:

> **ENGINE REACH: 10 of 60 path(s) can change the race** — `heroCurveGenerator.js`, `raceCore.js`,
> `racePlanner.js`, `RaceScreen/index.jsx`, `raceOverrun.test.js`, `check-ending-frame.mjs`,
> `exp-anchor-truth-ab.mjs`, `finish-band-truth.mjs`, `lib/raceDriver.mjs`, `sim-fairness.mjs`.
> Two hull files are reported **INERT — comments only**: `diag/start-formation.mjs` and
> `lib/cameraPlanDelivery.mjs`.

★ **WHICH FINGERPRINTS THAT SELECTS — AND THE PROSE TABLE AND THE GUARDS DISAGREE, SO THE GUARDS WIN.**

| fingerprint | selected | why |
|---|---|---|
| **world** | ★ **YES** | `GUARD.reach` = `["client/src/modules/raceCore.js", "scripts/sim-fairness.mjs"]` — **both changed** |
| **world-off** | ★ **YES** | the same instrument's second arm (`--gapRerollEnabled=false`) |
| **camera** | ★ **YES** | `camera-fingerprint.mjs` `GUARD.reach` lists **`client/src/modules/raceCore.js`** — changed |
| **render** | ★ **YES** | `render-fingerprint.mjs` `GUARD.reach` lists **`client/src/modules/raceCore.js`** — changed |

★ **`docs/SHIP-CEREMONY.md:178-180` would have selected WORLD ONLY**: its camera trigger is "any block
touching `client/src/modules/camera/`" (**0 files changed there**) and its render trigger is the
drawing path — `renderRaceFrame.js`, `RaceScreen/drawing/`, `nameTagLayout.js`, `Minimap.js`
(**0 changed**; the 42 added lines in `RaceScreen/index.jsx` contain no `ctx.`, draw or canvas call).
★ **The guards' own declared `reach` is what `verify` routes on, so that is the selection of record** —
and it agrees with the branch's measurements, which found all four moved. **Noted rather than
reconciled: the prose table is narrower than the guards. Nobody was misled here, but the next reader
could be.**

★★ **NOTHING WAS IMPRINTED.** All four would have been, and only these four — but §3 ends in a (b).

---

## 3 · THE CHECK RUN, EVERY FAILURE CLASSIFIED

`npm run verify` on `8166c757`: ★ **PASS 25 · FAIL 5 · SKIP 4.**

| # | guard | address | class | why |
|---|---|---|---|---|
| 1 | **world-fingerprint** | record `8a1977187e9c99b4` → measured **`b35cf477c09a1116`** (`docs/fingerprints.json`) | ★ **(a)** | the race legitimately moved — `racePlanner.js` / `heroCurveGenerator.js` / `raceCore.js` are the branch's whole subject. The record predates DIRECTION-AUTHORITY-1 |
| 2 | **camera-fingerprint** | record `92ab7120a80af8ed` → measured **`3df640a42e934312`** | ★ **(a)** | same cause: the director sees a different race. No `modules/camera/` file changed |
| 3 | **render-fingerprint** | record `5e5fdc3fb6656d68` → measured **`6a84085e79535dd6`** | ★ **(a)** | same cause; no drawing-path file changed |
| 4 | **client-suite** (3 tests) | `client/src/modules/parity/replay.test.js:85` — expected `'Breeze'`, got `'Surge'`; `client/src/modules/parity/goldenRealArm.test.js:57` — the `finalRank === 1` winner pin; a third in the same group | ★ **(a)** | RECORDED OUTCOME pins, not invariants. `replay.test.js:83-86` records in its own comment that these names were last re-pinned when RACER-MOTION-2 moved the race. The invariant they guard — **real == sim byte-identical** — is not what failed |
| 5 | ★ **check-runin-frame** | `dirt-oval` **n=40** and `luger-hill` **n=100** | ★★ **(b) — A REAL DEFECT** | see below |

★ **`golden-races` PASSES** — its fixtures are 12 and 6 racers, below `STAGED_COMEBACK.MIN_FIELD` (20),
so no comebacker is cast and the branch's shape never fires there. ★ **They therefore need no
regeneration, and none was done.**

### 3.1 · ★★ WHY №5 IS (b) AND NOT (a) — MEASURED ON MASTER, NOT ASSUMED

`check-runin-frame` was run on a clean worktree at `master` (`b6d77637`) and on the branch tip:

| case | ★ **master `b6d77637`** | ★ **branch `8166c757`** |
|---|---|---|
| `dirt-oval` n=40 | **FINDABLE**, worst **+99 px**, 0 of 490 outside, ★ **0 OFF CANVAS** | **LOST**, worst ★ **−353 px**, 19 of 395 outside, ★ **15 OFF CANVAS** |
| `luger-hill` n=100 | **FINDABLE**, worst **+111 px**, 0 of 290 outside, ★ **0 OFF CANVAS** | **LOST**, worst ★ **−146 px**, 10 of 256 outside, ★ **5 OFF CANVAS** |
| exit code | ★ **0 — GREEN** | **2 case(s) failed** |

★★ **TWO PASSING CASES BECOME FAILING ONES, AND IN BOTH THE FINISH LINE LEAVES THE CANVAS.** The guard
states its own standard: *"A camera pointed away from the race is a defect however good the framing
numbers look — and so is a run-in that closes past its own finish line."*

★ **IT IS NOT A MOVED INPUT.** A fingerprint hash changing is the instrument reporting that the race
moved; this is a **behavioural requirement failing** — the viewer can no longer see where the line is.
★ **The branch's own `docs/MORNING.md` already classified it the same way** — *"a real defect"*, listed
under **"THE ONE THING STILL BLOCKING A CLEAN MERGE"**, with the cause traced to `983d9201`
(DIRECTION-AUTHORITY-1, on this branch) and the fix explicitly declined: *"the fix changes the camera
on every track and every race, and you judge the picture."*

> ★★ **SO THE DECISION RULE FIRES: STOP.** Not merged, not imprinted, not tagged, branch not deleted.
> **A red check that is explained is not the same as a red check that is proven harmless**, and this
> one is explained but not harmless.

---

## 4 · WHAT WAS AND WAS NOT DONE

| step | |
|---|---|
| 1 — state | ★ done, §1 |
| 2 — `engine-reach --check` | ★ done, §2 — selects **world, world-off, camera, render** |
| 3 — `verify` on the branch | ★ done, §3 — **one (b)** |
| 4 — imprint | ★ **NOT DONE**, by the rule |
| 5 — merge | ★ **NOT DONE** |
| 6 — tag / delete branch | ★ **NOT DONE** |
| 7 — CI on the merge SHA | ★ **N/A — nothing was merged** |
| 8 — server on master | ★ **NOT DONE** — master is unchanged, and putting the owner on master would show him the branch's work missing |

★ **The branch is pushed**: `origin/night/2026-09-12b` = **`8166c757`**, identical to local. Nothing is
stranded.

---

## 5 · NOTICED AND DELIBERATELY LEFT ALONE

- ★ **`docs/SHIP-CEREMONY.md`'s fingerprint table is narrower than the guards' declared `reach`**
  (§2). Correcting a shipped ceremony document is not this task's business.
- ★ **`docs/MORNING.md` is stale in two respects**: it reports `verify` as PASS 24 · FAIL 6 (it is
  25/5) and a world fingerprint of `defbce50092d965c` (it is `b35cf477c09a1116`). **Not rewritten** —
  the morning sheet belongs to whoever writes the next one.
- ★ **A stale worktree registration** `.git/worktrees/master-check` could not be deleted (EPERM, a
  known condition on this tree). The worktree directory itself is gone and `git worktree list` shows
  only the main tree, so nothing is held.
- `.playwright-mcp/` accumulated snapshots from this session's read-only browser fetches; it is
  gitignored (`.gitignore:22`) and is not in the diff.

---

## 6 · WHAT IT WOULD TAKE TO MERGE

Stated as fact, not as a recommendation — **the decision is the owner's**:

- ★ **The `check-runin-frame` regression is the only blocker.** The other four failures are (a) and
  would be closed by imprinting the four selected fingerprints.
- ★ **Its fix is a camera change the branch deliberately did not make**, because it moves every shot on
  every track. That is the judgement the morning sheet has been holding for him.
- ★ **The alternative is to accept it**, which is also his call and would need the acceptance recorded
  the way `docs/ACCEPTED-FINISH.md`-class decisions are, before a merge that carries it to master.

**`git stash` was not used. `--no-verify` was not used. Nothing was minted. Nothing was merged.**
