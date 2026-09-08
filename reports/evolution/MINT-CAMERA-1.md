# MINT-CAMERA-1 — the camera record starts describing the product's own picture

**2026-09-08.** Branch `night/2026-09-07`, from master `fe4e111c`. **The owner ordered this mint.**
One role moves. **No camera, engine or drawing code was changed by it.**

A new report rather than an appendix: [HARNESS-OUTCOME-1](../night/HARNESS-OUTCOME-1.md) and the
OUTCOME-WINDOW-2 reading that preceded this are already written, and reports are append-only.

---

## THE MINT

| role | recorded before | now | |
| --- | --- | --- | --- |
| **camera** | `152cf295c4c9ff54` | **`75aef5cd474c54e5`** | ★ **MINTED** |
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | unmoved, self-checked |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | unmoved, self-checked |
| render | `74946ddbeca517a9` | `74946ddbeca517a9` | unmoved, self-checked |

### Re-measured before the record was touched

The brief required the value to be re-measured on this tree rather than carried from the previous
piece, and it was — **before** `docs/fingerprints.json` was edited:

```
node scripts/camera-fingerprint.mjs
  ->  CAMERA 75aef5cd474c54e5 (seed=5601 camSeed=1439767152, 10 tracks, 40 racers, default config)
      THE ENDING IS IN THIS HASH — 10 of 10 tracks contributed FINISHED frames.
      [ra-elapsed-ms 47329] (47.3s)
```

It reproduced the decided value exactly. **The other three roles were run in the same pass**, each
confirming against the record with its own `--check`:

```
check: WORLD  matches the record for role "world"      (8a1977187e9c99b4).
check: WORLD  matches the record for role "world-off"  (aa09ed97a3a32689).
check: RENDER matches the record for role "render"     (74946ddbeca517a9).
```

That is what an instrument-only correction must look like, and it was **run rather than argued** —
the branch does touch `RaceScreen/index.jsx` and adds `modules/raceParams.js`, so only a measurement
can say the race and the drawing are untouched.

---

## WHAT THE MINT NOTE RECORDS

The full note is in `docs/fingerprints.json`, which is its one home. Its content, in summary:

### 1 · ★ The product was never wrong and is not changed

`client/src/modules/camera/CameraDirector.js` is **untouched by this branch** — established by diff
against the merge-base `fe4e111c`, not remembered. The only files the branch changes under
`client/src/modules/camera/` are **twelve test files**, each gaining a three-line environment header
from SUITE-ENV-SPLIT-1. The director's decision code is byte-identical to master's.

Stated precisely rather than loosely: the branch **does** change two non-test product files —
`modules/raceParams.js` (new: the ONE-HOME-RACE-PARAMS-1 extraction of the sprite-geometry
derivation) and `RaceScreen/index.jsx` (which now calls it instead of carrying its own copy of the
same arithmetic). That refactor is behaviour-neutral, and the three unmoved fingerprints above are
the measurement that says so.

### 2 · Why the recorded value was describing a picture the game does not draw

`scripts/camera-fingerprint.mjs` handed the director `isOutcomePhase: false` as a hard-coded
literal, so **every camera hash ever taken was measured with the race plan's OUTCOME window
permanently shut.** The browser does not do that: it derives the flag at
[`RaceScreen/index.jsx:1271`](../../client/src/screens/RaceScreen/index.jsx#L1271) as
`racePlanController.getPhase(physicsTs, st.raceProgress) === 'OUTCOME'`, stores it on the
diagnostics ref, and reads it back into the director's `raceState` at
[`index.jsx:1492`](../../client/src/screens/RaceScreen/index.jsx#L1492).

### 3 · ★ The browser's derivation was established correct AT SOURCE first

A fix applied to the wrong side would have been enshrined by this mint, so the browser was checked
before the harness was believed. Three checks, all with addresses:

- **Argument order** — the signature is `getPhase(elapsedMs, phaseProgress)`
  ([`racePlanner.js:524`](../../client/src/modules/racePlanner.js#L524)); the browser passes
  `(physicsTs, st.raceProgress)`, ms first and fraction second.
- **Threshold** — the fraction path tests `corrStartFrac`/`corrEndFrac`, derived at
  [`racePlanner.js:433-438`](../../client/src/modules/racePlanner.js#L433-L438) from the **same**
  `plan._phases` the millisecond path uses. There is no second copy of the boundary to drift.
- **Clock** — the guard is `phaseProgress != null`, not a truthiness test, so a progress of exactly
  `0` does not fall through to the legacy path. And the plan's own physics runs on the identical
  call with the identical arguments at
  [`raceCore.js:528`](../../client/src/modules/raceCore.js#L528), whose `update()` computes
  `getPhase(elapsedMs, phaseProgress) !== 'OUTCOME'` at
  [`racePlanner.js:557`](../../client/src/modules/racePlanner.js#L557).

**The camera is reading the very predicate the plan steers by.** It is the harness that was wrong.

### 4 · Where the flag can act, and it is narrow

`isOutcomePhase` has exactly **one** behavioural consumer —
[`CameraDirector.js:1717`](../../client/src/modules/camera/CameraDirector.js#L1717) — where it is
OR'd with `leaderProgress > outcomePhaseThreshold` to admit `COMEBACK_ZOOM` to the candidate pool.
The only other mention (`:914`) is diagnostics. So the flag can change nothing above that internal
threshold; it acts only in the band between the plan's OUTCOME start (`choreoOutcomeStart`, an
owner-owned DevScreen slider) and the threshold — **measured at 8.7 to 13.9 s** depending on track.

### 5 · Which four tracks, and why those four

Ten tracks were run in **both arms**, frame by frame, recording state, anchor, zoom and both offsets.

**Six show ZERO differing frames** — garden-path, luger-hill, mountainstreet, river-run, searound,
seatrack. The blast radius is exactly four, **independently reproduced** rather than inherited from
the moved hash.

| track | new state | differing frames | first divergence |
| --- | --- | --- | --- |
| dirt-oval | `COMEBACK_ZOOM` 0→**480** (8.0 s), `LEAD_CHANGE` 961→481 | 1090 | t=55.2 s, leaderProgress **0.639** — in band |
| ice-track | `COMEBACK_ZOOM` 0→**480** (8.0 s), `LEAD_CHANGE` 1775→1295 | 566 | t=49.6 s, leaderProgress **0.683** — in band |
| space-sprint | `COMEBACK_ZOOM` 0→**481** (8.0 s), `LEADER_ZOOM` 2214→1733 | 511 | t=40.3 s, leaderProgress **0.705** — in band |
| city-circuit | **no new state** — `OVERVIEW` −155, `LEADER_ZOOM` +405, `BATTLE_ZOOM` −250 | 659 | t=59.8 s, leaderProgress **0.770** — *after* the band |

★ **city-circuit is a different finding and is not reported as the same one.** No comeback shot is
taken in *either* arm. A comeback candidate enters the pool and **loses** the weighted pick — and
because `_weightedRandomPick` ([`CameraDirector.js:730`](../../client/src/modules/camera/CameraDirector.js#L730))
draws one value only when the pool holds two or more candidates, admitting a losing candidate both
re-normalises the choice and displaces the random stream. Its visible consequence is a re-rolled
closing stretch at progress 0.879–0.970.

### 6 · It is a picture, not a hash

`renderRaceFrame.js:153-158` applies `ctx.translate(offsetX, offsetY)` **before** `ctx.scale(zoom)`,
so those offsets are **screen** pixels on a 1280×720 canvas.

- **ice-track — 7.4 s**, `COMEBACK_ZOOM` on #32 where the old arm held `LEAD_CHANGE` on #0. Peak offset delta **4023 px**.
- **dirt-oval — 5.4 s**, `COMEBACK_ZOOM` on #8 vs `LEAD_CHANGE` on #32. Peak **4187 px**.
- **space-sprint — 4.5 s then 3.5 s**, `COMEBACK_ZOOM` on #8. Peak **7091 px**.
- **city-circuit — 2.6 / 2.1 / 2.0 s** at progress 0.879–0.970. Peak **4514 px**, Δzoom 3.79.

A 4000 px delta is **three canvas widths**, and the camera holds a *different anchor racer* for
6.8–12.3 s per race.

**Reported honestly against that:** city-circuit's first two divergences are **label-only** —
`LEADER_ZOOM` against `LEAD_CHANGE` on the *same* anchor, offset delta ≤10 px and zoom delta 0.00.
The same picture under a different name. And for calibration, **luger-hill takes `COMEBACK_ZOOM` for
264 frames in BOTH arms**: the shot is not new to the game, the band only makes it reachable earlier.

### 7 · ★ Every camera figure older than this mint

**Every camera figure taken before this mint describes the old, blind picture on city-circuit,
dirt-oval, ice-track and space-sprint, and is NOT comparable across it.** That covers every camera
hash, every per-track camera hash and every camera-instrument statistic on those four tracks,
whatever report it appears in. On the other six tracks the arms are byte-identical, so figures there
carry across unchanged.

Stated as a rule rather than as a list, deliberately: the instrument is old and the figures taken
through it are many.

---

## THE SECOND INSTRUMENT — REPORTED, NOT FIXED

`scripts/render-fingerprint.mjs:584` carries the **same** `isOutcomePhase: false` literal. Per the
brief it was measured both ways and **changed in neither direction** — the measurement was taken with
a patched **copy** outside the repository, so the instrument in the tree is byte-identical to what it
was.

| render instrument | value |
| --- | --- |
| as it stands today (`isOutcomePhase: false`) | `74946ddbeca517a9` — matches the record |
| with the browser's derivation (probe copy) | **`40b2de6fcc5bafd8`** |

**It would move.** Fixing it is a second mint and a second decision, and it is not taken here.

★ **What it costs him to leave it as it is:** the render record keeps describing frames drawn from a
camera that never takes the comeback shot in that band, so on those same four tracks every render
figure stays blind in exactly the way the camera record just stopped being.

---

## THE STRAY COPY THE MINT CREATED, AND THE GUARD THAT CAUGHT IT

`docs/MORNING.md` carried `75aef5cd474c54e5` twice as a **prediction** ("the camera fingerprint DOES
move — to X"). That was legal when written, because the value was not then current. The mint made
both lines stray copies of a **current** fingerprint, and `check-fingerprints` failed on exactly
that:

```
FAIL: docs/MORNING.md contains the CURRENT camera fingerprint.
```

The guard's own remedy was applied — the value removed, the sentences left pointing at
`docs/fingerprints.json` and noting the mint. Re-run:

```
check-fingerprints: 4 roles, 1187 tracked files scanned, 0 stray copies.
```

This is the containment rule working the way it is meant to: a value written down as a forecast
becomes a duplicate the moment the forecast comes true.

---

## VERIFY, SUITES AND THE MERGE

### `npm run verify` — GREEN

```
PASS 22   FAIL 0   SKIP 12      wall clock 467.3s
PASS  camera-fingerprint  121.2s   CAMERA 75aef5cd474c54e5
PASS  client-suite        183.7s  (ran alone)
PASS  server-suite         49.9s  (ran alone)
```

The camera guard was the only thing red before the mint, and the mint is what cleared it.

### ★ THE ONE OTHER FAILURE IS A REAL FINDING — AND MY FIRST DIAGNOSIS OF IT WAS WRONG

**THE MERGE IS NOT TAKEN. The brief says to STOP if anything else is red, and something else is red.**

`check-client-build` failed with:

```
Error: EPERM, Permission denied: ...\client\distssets
    at Object.rmSync ... at emptyDir ... at prepareOutDir
```

**WHAT I FIRST CONCLUDED, AND IT WAS WRONG.** `client/dist` is gitignored build output and
`client\distssets` carries the ReparsePoint attribute, so I read this as the OneDrive
placeholder EPERM this machine is known for, cleared `dist`, got a green run, and wrote that it was
an environment artefact and not a finding. **That is withdrawn.** It survived one green run by luck
of timing, and the next two runs falsified it.

**THE DECISIVE TEST.** With the *same* placeheld `dist` present (attributes `525328`, the
reparse-point placeholder), `check-client-build` run **alone** passes in **2.0 s**. The placeholder
is not what fails it.

**WHAT ACTUALLY FAILS IT — two guards race on `client/dist`.**

- `check-image-starts` builds the server image passing `--build-context client=./client`
  (`check-image-starts.mjs:185`), because `server/Dockerfile:68` does `COPY --from=client dist/`.
  BuildKit therefore holds `client/` open as a build context for the 20–84 s that guard takes.
- `check-client-build` runs the vite build, whose first act is `emptyDir(client/dist)`.
- `verify` runs **up to 14 guards at once**, and nothing serialises these two:
  `check-client-build` declares `dirs: ["client/"]` with `exclusive: false`, while
  **`check-image-starts` does not declare `client/` at all** — its `dirs` are `server/seeds/`,
  `server/src/`, `server/utils/`. The guard that READS `client/dist` never says it does, so the
  scheduler has no reason to keep the guard that WIPES it away from it.

**The two failure modes are complementary, which is what proves it is the shared directory:**

| run | `client/dist` at start | `check-client-build` | `check-image-starts` |
| --- | --- | --- | --- |
| verify #1 | stale, present | **FAIL** (EPERM) | PASS 66.5s |
| verify #2 | fresh, present | PASS 29.9s | PASS 55.9s |
| premerge #1 | present | **FAIL** (EPERM) 21.1s | PASS 83.8s |
| premerge #2 | **absent** (I deleted it) | PASS 33.2s | **FAIL** — `"/dist": not found` |
| premerge #3 | fresh, present | **FAIL** (EPERM) 15.9s | PASS 81.6s |
| guard alone | stale, present | **PASS 2.0s** | not run |

Delete `dist` and the image guard fails for want of it; leave `dist` and the build guard fails
trying to wipe it while BuildKit reads it. Run either one on its own and it passes. On this machine
`verify --premerge` currently cannot go green for that reason, and **no amount of re-running fixes
it, because it is an ordering defect and not a flake** — which is exactly what verify's own label
(`SPAWN FAILURE — a finding, not a flake`) said before I talked myself out of it.

**WHY NOBODY HAD SEEN IT.** Before this mint `verify` was already red on `camera-fingerprint`, so
the run's verdict was `Do not commit` whatever else happened. The mint cleared the camera guard and
this surfaced underneath it — which is precisely the case the brief told me to stop for.

**NOT FIXED HERE.** The fix is in the guards' declarations or verify's scheduling — most likely
`check-image-starts` declaring the `client/` context it actually reads, and one of the two taking
`exclusive`. That is tooling work, it is a separate decision, and this piece changes no tooling.

### The mint itself is unaffected

The finding is in how two guards are scheduled, not in anything this mint recorded.
`camera-fingerprint` **PASSED in all four runs** and reported `75aef5cd474c54e5` every time, and
`render-fingerprint`, `golden-races`, `viewer-invariants`, `fingerprint-containment`, `check-tags`
and both suites passed in the premerge runs.

### Golden races — PASS

Routing SKIPPED `golden-races` in the run above ("nothing changed"), because the mint commit touches
only documents. It was therefore **run explicitly** rather than accepted as skipped:

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6 — 6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (386 ms).
```

<!-- MERGE-RESULTS -->


---

## WHAT THIS REPORT DOES NOT CLAIM

- **It does not claim the owner has judged the new picture.** He decided to mint the record so it
  describes what the product does. Whether the 8.0 s comeback shot on those three tracks is a shot
  he *wants* is a separate question and is untouched here.
- **It does not claim the four tracks are the only races affected.** The measurement is the
  fingerprint's own corpus — seed 5601, 40 racers, ten tracks at track defaults. A different seed
  can open the band on a track that shows zero differing frames here.
- **It does not re-base anything downstream.** The 76 consumers of the shared driver named in
  `MORNING.md`, the ship gate, and the measurements stamped into `CAMERA_DIRECTOR.md` and
  `ENDING-PHASES.md` are **named, not repaired**.
