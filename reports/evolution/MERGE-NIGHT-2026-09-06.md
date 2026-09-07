# MERGE-NIGHT-2026-09-06 — the night branch closes

**Date:** 2026-09-07
**Catch-up:** `018b47dd` on `night/2026-09-06`, from `c25c47be` + master `1f6def2f`.
**Merge:** `dc15f5e2` on **master**. Branch **deleted at origin**.

---

# STEP 1 — the catch-up

Master had moved a long way: the whole team-races topic (merge `2cc60029`, 23 piece commits), the
golden races, RECOMPUTE-COST-1 and the console decisions. **83 files** changed on master since the
merge base `554f348e`; **20** on the night branch.

★ **FIVE files were touched by both sides.** Three auto-merged, two conflicted.

| file | night | master | after | how |
|---|---|---|---|---|
| `client/src/screens/SetupScreen/SetupScreen.jsx` | 1690 | 1824 | **1828** | **conflict — 3 hunks, resolved by hand** |
| `docs/MORNING.md` | 388 | 342 | **388** | **conflict — resolved by hand** |
| `client/src/modules/raceIdentifier.js` | 280 | 253 | **280** | auto-merged, verified by hand |
| `client/src/modules/exportRaceConfig.js` | 175 | 143 | **171** | auto-merged, verified by hand |
| `docs/FORCE-MAP.md` | 509 | 509 | **509** | auto-merged |

## The three SetupScreen hunks — every one additive on both sides

1. **The imports.** The night added `defaultEffectiveRacerTypes` to the `exportRaceConfig.js` import;
   master added three whole imports (`shared/raceShortKey.mjs`, `repeatRace.js`, `racesApi.js`) on
   the same lines. **All four kept.**
2. **`pastedIdentifier`'s decode options.** The night added
   `defaultEffectiveRacerTypes: defaultEffectiveRacerTypes(),`; master changed `buildId` to
   `repeatBuildId ?? raceIdentifierBuildId()` and added a three-line comment saying why.
   **Both kept, comment included.**
3. **`startRaceFromIdentifier`'s decode options.** Same shape — the night's base line, and master's
   `buildId: buildIdForDecode ?? raceIdentifierBuildId()`. **Both kept.**

Nothing was rewritten to fit. Each side's line is present verbatim.

## `docs/MORNING.md` — the night's version taken whole, and why that loses nothing

This is the one hunk where "keep both sides" is not literally possible, so here is the reasoning
rather than a choice.

The sheet **owns "where things stand, right now"** and is rewritten in full each time. **Both
branches rewrote it for the SAME six-piece chain**, from different points: master's copy is the
snapshot *after piece 3* (it arrived via the team branch, `840b0ec2`), the night's is *after piece 5,
with the chain finished* (`93ba557b`).

★ **The night's version is the strict successor and contains master's content.** Checked, not assumed:

- It records **all six pieces as DONE**, including pieces 1-3 — the ones master's copy describes.
- **Every piece identifier named in master's copy also appears in the night's** (compared as sets;
  the difference is empty).
- The only lines unique to master's copy are ones **the night's own work made false**: pieces 4/5/6
  listed under *"OPEN — the three pieces not yet started"*, and *"`night/2026-09-06` does not exist
  yet"*.

So the night's copy was taken whole. **No fact of master's was dropped; only statements that had
stopped being true.** Nothing was added — in particular the sheet does not claim this merge, because
writing that would be authoring content neither side wrote.

---

# ★ STEP 1b — THE NAMED COLLISION, INVESTIGATED. NOT A DEFECT.

The brief named the risk exactly: IDENTIFIER-DIFF-1 changed how the identifier is written, and the
team topic built the store, the short key and the repeat on top of the identifier.

**What the two sides actually did to `raceIdentifier.js` does not overlap textually.** Master moved
one import (`canonicalJson` to `shared/`, SHARED-CANONICAL-1); the night added the
`defaultEffectiveRacerTypes` parameter and the `ed` key. Different regions — hence the clean
auto-merge, with both present at `:53`, `:166`, `:198` and `:275`.

★ **The real collision is not textual, and git would never have shown it.** Master adds an identifier
call site the night has never seen:

```
client/src/modules/repeatRace.js:60   encodeRaceIdentifier({ … })   ← no defaultEffectiveRacerTypes
```

The night updated the four call sites it knew about (all in `SetupScreen.jsx`). `repeatRace.js` is
the fifth, and it was written before IDENTIFIER-DIFF-1 existed. So on the merged tree:

- **a repeat ENCODES** the racer types with the base `{}` → `ed` is the full set;
- **the setup screen DECODES** it against the real base → `applyDiff(realBase, fullSet)`.

**Encode and decode use different bases. That is the disagreement, and the question is whether it
loses anything.**

## Measured on the merged tree, not argued

`diffFromDefaults` / `applyDiff` were run directly against the real registry
(`CONFIG_SNAPSHOT` for the base, `getRacerType(id).config` for the live values), reproducing exactly
what the two call sites do:

| path | result |
|---|---|
| **asymmetric** — `repeatRace` encodes with `{}`, `SetupScreen` decodes with the real base | ★ **LOSSLESS** |
| symmetric — `SetupScreen` both ends | LOSSLESS |

★ **So the two agree: a repeat decodes to the race it recorded.** The only consequence is that
**IDENTIFIER-DIFF-1's shortening does not reach the repeat path** — a repeat's identifier still
carries the full racer-type set where one built by the setup screen carries the diff. That is a
missed benefit, not a wrong race, and **nothing was changed to close it** (no new work on this
branch).

★ **A correction I owe on my own method.** The first run of this measurement reported the asymmetric
round-trip as LOSSY on all 20 racer types. That was **`JSON.stringify` key ordering**, not content —
`applyDiff` clones the base first, so the restored keys come back in a different order. Re-run
through `canonicalJson`, which is what the identifier actually uses, it is lossless. **The finding
was wrong and was caught before it was reported as one.**

**The server is untouched by any of this.** It stores `effectiveRacerTypes` **resolved**
(`raceStore.js:300`, `:424`) and never sees the identifier string or its `ed` key — so the short key,
the store and the repeat's server half cannot disagree with the new encoding.

## The golden races

Run on the caught-up branch, verbatim:

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6 — 6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (367 ms).
```

★ **PASS. The night did not change a race.**

**The comeback key ships OFF**, confirmed in the merged tree: `defaults.js` → `comebackUseBeats:
false`, with its own comment — *"FALSE IS TODAY'S BEHAVIOUR, EXACTLY. This is contested and the owner
has not seen it, so nothing moves until he turns it on."*

---

# ★ STEP 2 — THE BROWSER PROOFS

**The set that was run, and why it is the smallest that answers the question:**

| spec | what it proves here |
|---|---|
| `race-identifier.spec.js` (4 tests) | the identifier **round-trip** in the browser, including *"copy, change the stage, paste — the identifier wins"* |
| `race-history.spec.js` (3 tests) | the repeat from the **row button** and from the **short key** — the path through `repeatRace.js`, i.e. the asymmetric encode above |
| `seed-field-typing.spec.js` (4 tests) | the key **typed**, the key **pasted**, and the **long identifier pasted** — the third door |

Together they are the identifier round-trip plus all three repeat doors. Everything else in the
browser suite is untouched by the identifier and would have cost race time for nothing.

## ★ THE FIRST RUN FAILED 3 OF 12 — AND IT WAS THE HARNESS, NOT THE MERGE

Reported in full because a failure that gets waved away is how a suite stops guarding anything.

```
3 failed
  race-history.spec.js:51    the team sees its races, and the button repeats one exactly as it ran
  race-identifier.spec.js:101 copy, change the stage, paste — the identifier wins
  seed-field-typing.spec.js:115 a number TYPED is still a seed, and an identifier PASTED still works
9 passed (12.9m)
```

**The mechanism, established at source rather than guessed:** `playwright.config.js:31` sets
`fullyParallel: false`, which serialises tests *inside* a file and still runs *files* in parallel —
and the config sets **no `workers` value**, so Playwright defaulted to **7 workers** on this 14-core
machine. Three race-storing spec files therefore ran at once against **one shared API, one shared dev
server and one shared team**. Each failure carries that signature:

| failure | error | what it is |
|---|---|---|
| `race-history:51` | `same seed` — expected 2372, got **6533**; the results screen showed *"Seed 6533"* | the test repeated **another spec's race** |
| `race-identifier:101` | `page.goto: Test timeout of 30000ms exceeded` navigating to `/setup` | the shared dev server under three-worker load |
| `seed-field-typing:115` | `Cannot read properties of undefined (reading 'seed')` | the same shared-history interference |

★ **PROD-SAVE-1 named this hazard on master, before this merge, and predicted this exact
recurrence:** *"file-level parallelism against one shared API is a standing hazard, not a one-off.
Any two spec files that store races can collide the same way. Nothing here changes the config; **a
future piece that adds a third race-storing spec meets it again**."*

★ **AND THE HALF-CLOSED FIX IS LOCATED, which is worth more than the flake itself.** PROD-SAVE-1
repaired the row **selection** — `race-history.spec.js:95-98` finds the row by its own short key, not
by being first. But **step 2 of the same test still takes that key from `.first()`**:

```js
// race-history.spec.js:65
const storedRow = page.locator('[data-testid="history-row-stored"]').first();
const shortKey  = (await storedRow.locator('[data-testid="short-key"]').innerText()).trim();
```

`history-row-stored` rows come from the **server**, which holds every spec's races for the shared
team. So under parallel workers the test adopts another spec's key and then, quite correctly, repeats
the wrong race. **The half that was fixed holds; the half that feeds it does not.** ★ This is a
defect in a test on master and **it was not touched here** — no new work on this branch.

## THE RE-RUN, SERIALLY — ALL GREEN

`npx playwright test race-identifier.spec.js race-history.spec.js seed-field-typing.spec.js --workers=1`

```
  Slow test file: race-history.spec.js (11.6m)
  Slow test file: seed-field-typing.spec.js (9.4m)
  12 passed (21.7m)
```

★ **12 of 12 — the identifier round-trip and all three repeat doors pass on the merged tree.** The
shortened identifier and the stored-race repeat agree in the browser, which is what step 2 asked.

**One thing that did NOT go away and is not a pass:** the geometry-cache flake fired **4 times** in
the serial run too (`5 of 10`, `10 of 10`, twice each) — `ensureTrackGeometriesCached` recovered every
time. That is the standing E2E-FLAKE-1 mechanism, unrelated to this merge, and it is worth knowing
that serialising the workers does **not** remove it.

---

# STEP 3 — verify on the caught-up branch

`npm run verify -- --premerge` on the caught-up branch `018b47dd` — **not** on the branch as it
stood before step 1. (The `--` matters: verify refuses the flag without it, which MERGE-TEAM-RACES
found and this run confirmed.)

**PASS 26 · FAIL 0 · SKIP 7 · wall clock 788.9 s** (sequential would have been 1746.0 s, 2.2x).

```
  PASS  client-suite        242.0s  (ran alone)
  PASS  viewer-invariants   298.8s  (ran alone)
  PASS  check-runin-frame   247.9s
  PASS  render-fingerprint  165.1s
  PASS  camera-fingerprint  162.3s
  PASS  script-suite        149.1s
  PASS  client-lint         148.2s
  PASS  world-fingerprint   128.6s
  PASS  client-format-check 109.7s
  PASS  check-writable      49.1s
  PASS  fingerprint-containment 19.1s
  PASS  check-tags          6.1s
  PASS  check-measured-stamps 5.9s
  PASS  check-ending-frame  4.1s
  PASS  golden-races        2.1s
  PASS  check-index 1.2s · check-config-claims 1.2s · check-fallback-agreement 1.1s
  PASS  check-language-closed 1.0s · engine-reach-doc 0.8s · check-fingerprint-payload 0.6s
  PASS  check-doc-links 0.5s · check-hooks-installed 0.5s · ceremony-counts 0.4s
  PASS  check-doc-facts 0.3s · check-config-keys 0.3s

  PASS 26   FAIL 0   SKIP 7
```

★ **The browser ship gate ran and is green** — `viewer-invariants` (298.8 s), `check-runin-frame`
(247.9 s) and `check-ending-frame` are the camera-side gate, and the night's changes are camera
changes.

**The 7 skips**, derived by subtracting the 26 PASS lines from the 33 declared guards:
`server-suite`, `server-lint`, `server-format-check`, `check-container-paths`,
`check-image-starts`, `check-seed-versions`, `check-standings-invariant` — the server set skipped
because **the night touched no server file**.

★ **So the server suite was run separately, because the brief asks for it and verify would not:**

```
$ npm test --prefix server --silent
 Test Files  34 passed (34)
      Tests  806 passed (806)
   Duration  42.37s (transform 4.95s, setup 1.00s, import 18.69s, tests 107.70s, environment 6ms)
```

**Client suite 242.0 s inside verify · server suite 806 tests, all passed. Nothing was red.**

---

# STEP 4 — the fingerprints

★ **The trees are identical, so by the brief's own rule the night's measurements stand and no re-run
was required. Said explicitly:**

```
$ git diff night/2026-09-06 dc15f5e2 --stat
(empty)

branch tip tree:   d2bfba9826eba70c67ebae693b514f3212721342
merge result tree: d2bfba9826eba70c67ebae693b514f3212721342
```

The reason is structural: the catch-up put master **inside** the branch, so the `--no-ff` merge
commit adds a commit and not a byte. A fingerprint is a function of the tree.

★ **AND THREE OF THE FOUR WERE RE-MEASURED ANYWAY, because `--premerge` selected them** — the night
changed `CameraDirector.js`, `cameraTimingComputation.js`, `comebackDetector.js` and `defaults.js`,
which is exactly what the camera and render fingerprints declare by import closure. **All UNMOVED:**

| role | recorded in `docs/fingerprints.json` | measured on the caught-up branch | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `COMBINED 8a1977187e9c99b4` | **unmoved** |
| camera | `152cf295c4c9ff54` | `CAMERA 152cf295c4c9ff54` | **unmoved** |
| render | `74946ddbeca517a9` | `RENDER 74946ddbeca517a9` | **unmoved** |
| world-off | `aa09ed97a3a32689` | not run — the empty-tree-diff rule did not require it | unchanged in the record |

★ **THE CAMERA FINGERPRINT DID NOT MOVE, which is the one that had to be watched.**
OUTCOME-WINDOW-1 reported that it *would* move on 4 of 10 tracks **if the harness measured the way
the browser does** — a statement about the instrument, not about the product. That was reported and
deliberately **not minted**, and this merge does not mint it: the harness still measures the way it
always did, and the value it returns is the recorded one. **Nothing was minted.**

---

# STEPS 5-6 — the merge, and the branch

One merge commit, `--no-ff`, no squashing — all nine of the night's commits plus the catch-up
survive individually: COMEBACK-CONNECT-1 (`918423c8`, `7b3d8b67`), IDENTIFIER-DIFF-1 (`dd6bea53`),
OUTCOME-WINDOW-1 (`28e2f8d1`), COMEBACK-SHAPE-1 (`261855b6`, `c25c47be`) and the three morning-sheet
updates.

```
1f6def2f..dc15f5e2  master -> master
 - [deleted]        night/2026-09-06
```

★ **The delete was the very next command after the push**, in the same shell invocation, because
`scripts/check-tags.mjs` reads `git ls-remote --heads origin` **live** and its `KEPT_BRANCHES` list
is **empty** — a merged branch still standing at origin fails that guard and reddens master.

```
$ git ls-remote --heads origin
dc15f5e229aaefa77fd9b56a8ceb4da23be08cc6	refs/heads/master
```

★ **Only `master` remains.** No night branch, no topic branch.

---

# STEP 7 — CI

★ **CI's conclusion for the merge SHA `dc15f5e2`, from the PUSH run: `success`.**

```
name=CI  event=push  status=completed  conclusion=success  runId=34156841335
https://github.com/weudlll-cyber/seasonal-race-claude/actions/runs/34156841335
```

| job | conclusion |
|---|---|
| Server tests | **success** |
| Client checks | **success** |
| Living-doc guards + script tests | **success** |

★ **The branch delete landed in time.** "Living-doc guards" is the job that runs `check-tags.mjs`,
which reads the remote live; it is green, which is the evidence the push-then-delete ordering held.

**Master is green at the merge, and origin now holds one branch.**

---

# What merged

| piece | what it is |
|---|---|
| **COMEBACK-CONNECT-1** | the race plan's beats reach the camera, **behind `comebackUseBeats`, which ships `false`** |
| **IDENTIFIER-DIFF-1** | the identifier carries only what differs from the shipped racer types (`ed`; `e` still decodes) |
| OUTCOME-WINDOW-1 | measurement — the harness camera is not the browser camera, and it would move the camera fingerprint on 4 of 10 tracks. **Reported, not minted, and still not minted.** |
| COMEBACK-SHAPE-1 | measurement — the plan and the camera side by side |
| COMEBACK-CONNECT-1's arms | measurement — the two camera stamps renewed deliberately |

---

# Source hygiene

**Everything the catch-up touched, lines before → after:** the five files in step 1's table. Two were
resolved by hand (`SetupScreen.jsx` 1690/1824 → 1828; `MORNING.md` 388/342 → 388) and three
auto-merged and were then read to confirm both sides survived. **No other file was edited**, and no
line of either side was rewritten to make the merge fit.

**No scratch file entered the repo.** The round-trip measurement ran as a `node --input-type=module`
one-liner against the tree; the port census, the guard derivations and the CI query were read-only.
**`git stash` was not used on this tree.**

**Services:** the owner's API on **4000** was never stopped or restarted. `4173` (production) and
`5173` (dev) were not started — the project's assignment is unchanged and nothing of this piece
needed either. The e2e harness uses its own `4399`/`5399` and its own data directory, as designed.
