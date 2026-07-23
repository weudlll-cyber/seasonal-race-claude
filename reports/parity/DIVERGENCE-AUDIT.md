# Sim ↔ Browser Divergence Audit — why the same seed does not yet produce the same race

**Report-only, source-reading.** No code changed, both fingerprints untouched. HEAD on
`master` at `dce03e8` (clean tree). Compute used: **zero probe runs** — see the probe log at
the end for why source reading was sufficient and a sim-only probe could not have confirmed a
browser↔sim equality claim.

**Scope note.** [`docs/FORCE-PARITY.md`](../../docs/FORCE-PARITY.md) already audits the 22
per-frame *forces* in the shared t-update and concludes "no active force divergence at shipped
config." That audit is about the factors *inside* `advanceRacerT`. This audit is about the layer
the owner is asking about — **seed → plan grid → RNG stream → finished race** — which
`FORCE-PARITY.md` explicitly does not cover, and where the real divergences live. Where I cite
`FORCE-PARITY.md` line numbers I have re-verified against the current tree; several of its
`index.jsx` references have drifted since 2026-07-10 and I cite the *current* lines below.

---

## 0. TL;DR — the divergence ledger

| # | Divergence | Same seed → same race? | Root |
|---|---|---|---|
| **D-GRID** | Plan target-ranks and physical start-rows are keyed to the **same** shuffle in the browser but **two different** shuffles in the sim | **No** — different racers get steered to podium | §2a |
| **D-STREAM** | Browser swaps the **global** `Math.random`; per-frame **camera + trail** draws pollute the same stream the physics re-rolls draw from | **No** — and browser replay isn't even frame-rate-independent in-race | §2c |
| **D-SEED** | Browser seed ∈ [1,9999]; sim per-race seed = `(G−1)·N + i + 1`, unbounded | Expressible one way, not always the other | §2b |
| **D-CONFIG** | Browser reads 7 config blocks from `localStorage`; a fresh sim reads shipped defaults unless `--config` is passed | **No** if any DevScreen override or edited track is unexported | §2e |
| **D-TIME** | Both fixed-dt 16 ms; wall-clock enters browser state only via the accumulator step-count and slow-mo — but slow-mo leaks into *outcome* through D-STREAM | Clean on its own; contaminated by D-STREAM | §2d |
| O1 | Sim `computeFinishT` hardcodes `runoutZone=0.05`; browser reads `behaviorConfig.runoutZone` | Identical at default only | §2e |

The two big ones for the owner's goal are **D-GRID** (structural plan-grid mismatch) and
**D-STREAM** (global-RNG pollution). Both are dissolved by the owner's preferred fix: **one shared
driving layer that derives the plan grid and the physics RNG from an explicit seed context, called
identically by both tools** — instead of the current "monkey-patch the global `Math.random` and
hope the draw sites line up."

> **STATUS — D-STREAM CLOSED (parity step 1, 2026-07-23, commit on `master`).** The global
> `Math.random` swap is gone on both sides; the physics RNG is now the shared `makeRaceRng(seed)`
> stream threaded explicitly through every physics draw site, while camera/trail draws stay on the
> native generator. Sim fingerprints are **byte-identical** (ON `e93ffa70dad562a1`, OFF
> `72c3360fb75225ef`); the browser seeded race is now frame-rate/camera/slow-mo independent, proven
> by `client/src/screens/RaceScreen/seedDeterminism.test.js` (whole-race, multi-pacing). Expected
> side effect: **browser races at a given seed now differ from before the change** (the in-race
> re-rolls are no longer render-polluted) — previously remembered seeds are stale. **D-GRID remains
> open** (parity step 2), so full cross-tool finishing-order equality is not yet delivered. See §2c.

---

## 1. The two pipelines, side by side

Both tools import the **same** motion core — this is real and worth stating up front:

- `advanceRacerT` / `computeRowEnvMult` — `client/src/modules/raceStep.js` (imported by the sim at
  [`scripts/sim-fairness.mjs:83`](../../scripts/sim-fairness.mjs#L83)).
- `createRacePlan` / `createTrajectoryController` — `client/src/modules/racePlanner.js` (sim import
  [`sim-fairness.mjs:84`](../../scripts/sim-fairness.mjs#L84); browser import
  [`index.jsx:113-116`](../../client/src/screens/RaceScreen/index.jsx#L113)).
- `computeEvenRowLayout` / `computeSpeedBonus` — `client/src/modules/rowLayout.js`.
- Behavior (draft/brake) — `client/src/modules/raceBehavior.js`.

The two mulberry32 PRNGs are **byte-identical** (same `0x6d2b79f5` constant):
`makePRNG` at [`sim-fairness.mjs:500-509`](../../scripts/sim-fairness.mjs#L500) vs `mulberry32` at
[`racePlanner.js:22-31`](../../client/src/modules/racePlanner.js#L22). So *given the same seed value
and the same draw order*, both produce the same stream. The divergences are all in **which seed,
which draw order, and which stream** each side uses.

### Stage-by-stage

| Stage | Browser | Sim |
|---|---|---|
| **Seed origin** | Typed field [1,9999] or auto-drawn; `resolveQuickTestSeed` → `raceData.racePlanSeed` (`SetupScreen.jsx:499`). "Start Race" → `0` = unseeded (`SetupScreen.jsx:435`). | `--seed=G`; per-race `seed = (G−1)·N_RACES + raceIdx + 1` ([`sim-fairness.mjs:3153`](../../scripts/sim-fairness.mjs#L3153)). |
| **RNG install** | Swaps **global** `Math.random = mulberry32(racePlanSeed)` for the whole race ([`index.jsx:539`](../../client/src/screens/RaceScreen/index.jsx#L539)), restored in cleanup (`index.jsx:1784`). | Swaps **global** `Math.random = makePRNG(seed)` inside `runSingleRace` ([`sim-fairness.mjs:636`](../../scripts/sim-fairness.mjs#L636)), restored in `finally` (`:2727`). |
| **Start-row shuffle** | ONE shuffle: `computeEvenRowLayout(nRacers, rowCount)` drawing from the swapped stream ([`index.jsx:553`](../../client/src/screens/RaceScreen/index.jsx#L553)). | TWO shuffles: **plan grid** = `comboRowLayout` from a *separate* FNV seed, per-combo ([`sim-fairness.mjs:3140-3143`](../../scripts/sim-fairness.mjs#L3140)); **physical grid** = `rowLayout` from the swapped stream, per-race ([`:676`](../../scripts/sim-fairness.mjs#L676)). |
| **Plan build** | `createRacePlan(planRacers, …, racePlanSeed)` — `planRacers` from the physical layout (`index.jsx:712-716`); internal `mulberry32(racePlanSeed)`. | `createRacePlan(planRacers, …, seed)` — `planRacers` from `comboRowLayout` (`sim-fairness.mjs:3159-3205`); internal `mulberry32(seed)`. |
| **Per-racer init draws** | Row shuffle → then per racer `spreadFactor` (`index.jsx:632`) + `rollJitter` (`:635`). | Row shuffle → then per racer `spreadFactor` (`sim-fairness.mjs:721`) + `rollJitter` (`:723`). Same formulas, same order. |
| **Per-frame re-roll draws** | Inside the fixed-step loop, target draw + `jOff` (browser block ~`index.jsx:1137-1184`; twins of the sim draws below). | Target draw ([`sim-fairness.mjs:1200`](../../scripts/sim-fairness.mjs#L1200)) + `jOff` (`:1230`). |
| **Time basis** | Fixed `FIXED_DT=16` (`index.jsx:144`); physics clock `physicsTs` steps 16 ms; wall-clock only gates step-count + slow-mo pacing. | Fixed `DT=16` (`sim-fairness.mjs:783`); `while (finished<n && raceTs<maxTime) raceTs += DT` (`:1173-1174`). |
| **Config** | 7 blocks from `localStorage` via `load*Config` (`index.jsx:430-442`). | Shipped `DEFAULT_*` + CLI flags; optional `--config` world (`loadWorldOrNull`, `sim-fairness.mjs:141-164`). |

---

## 2. Known suspects — confirmed / refuted at the source

### 2a. Plan-grid basis mismatch — **CONFIRMED (structural)**

This is the cleanest "same seed, different race" cause.

- **Browser** builds *one* row shuffle and uses it for both purposes. The physical assignment
  (`assignmentByRacer`, `index.jsx:578`) and the plan's `planRacers` come from the **same**
  `computeEvenRowLayout` result:
  ```
  index.jsx:712-714   planRacers = g.current.racers.map(r => ({
                        index: r.index,
                        startRowIndex: assignmentByRacer.get(r.index)?.rowIndex ?? 0 }))
  ```
  So in the browser, "the racer the plan calls B1 (target rank 1)" is physically in the row the
  plan thinks it is.

- **Sim** builds *two* shuffles from *two different seeds*:
  - Plan grid: `comboRowLayout = computeEvenRowLayout(…, comboLayoutRng)` where
    `comboLayoutRng = makePRNG(comboLayoutSeed(trackId, racerType, GLOBAL_SEED))` — an **FNV-1a
    hash seed** ([`sim-fairness.mjs:515-523`](../../scripts/sim-fairness.mjs#L515),
    [`:3140-3143`](../../scripts/sim-fairness.mjs#L3140)), computed **once per combo, outside the
    `raceIdx` loop**. `planRacers` is built from it (`:3159-3161`).
  - Physical grid: `rowLayout = computeEvenRowLayout(nRacers, rowCount)` drawing from the swapped
    `makePRNG(seed)` stream, **per race** (`:676`); racers are placed from it (`:682`, `:710`).

  These two seeds differ (`FNV(track|type|G)` vs `(G−1)·N+i+1`), so they produce different
  permutations. **Consequence, two layers deep:**
  1. *Browser vs sim:* even at an identical seed value, the sim's plan target-rank map keys to a
     different racer→row permutation than the browser's → the choreo/OUTCOME controller steers
     *different racers* toward the podium → different finishing order.
  2. *Inside the sim:* the plan is keyed to `comboRowLayout` while racers physically start in
     `rowLayout`. The plan believes racer *k* starts in row *X*; racer *k* actually starts in row
     *Y*. The trajectory controller then steers a phantom grid. (This was introduced deliberately
     to make `--seed` reproducible across a batch — comment at `sim-fairness.mjs:3137-3139` — but
     it decoupled the plan grid from the physical grid.)

  Also note **D1**: the sim's plan grid is *per-combo constant* across all `N_RACES`, whereas the
  browser reshuffles rows every single race.

  *(Verified the physical shuffle itself matches across tools: between the swap at `:636` and the
  `rowLayout` draw at `:676` the sim makes no intervening `Math.random` call — `computeRacerLayout`
  is pure, `rowLayout.js:137-170` — so the sim's physical row shuffle is byte-identical to the
  browser's at `index.jsx:553`. Only the **plan keying** diverges.)*

**What one shared driving layer looks like.** A single function
`buildRaceGrid(seed, roster, geometry) → { physicalRows, planRacers }` that draws **one** row
shuffle from an explicit rng and returns both the physical assignment *and* the `planRacers`
derived from that same assignment — exactly the browser's current shape. Both tools call it; the
sim's `comboRowLayout` / `comboLayoutSeed` FNV path is deleted.

**Blast radius.** This is the expensive one. Changing the sim's plan grid to per-race, shuffle-consistent
assignment **moves every absolute fairness/band-reach/Holm/runaway number** the project has
baselined, because start-row → target-rank is the fairness pipeline's input. `fingerprint-default.mjs`
changes; every memory quoting absolute sim percentages (runaway 23%/8.3%, band-reach ≥70%, P1-contest
~5%, physics-tax σ=48%, …) becomes a stale baseline and must be re-measured. This is a re-baseline, not
a bugfix — it should be gated behind an explicit owner decision and a full re-sweep.

### 2b. Seed semantics — browser typed seed vs sim `GLOBAL_SEED` — **PARTIALLY expressible**

- Browser → sim: a browser race on seed `S` is reproduced by
  **`node scripts/sim-fairness.mjs --seed=S --races=1`**, because per-race
  `seed = (S−1)·1 + 0 + 1 = S` ([`sim-fairness.mjs:3153`](../../scripts/sim-fairness.mjs#L3153))
  and the same `S` is what `createRacePlan` receives. **Yes, today.**
- Sim → browser: a sim race `(G, N, i)` has per-race seed `s = (G−1)·N + i + 1`. To reproduce it in
  the browser you would type `s`. But the Quick-Test field clamps to **[1,9999]**
  (`quickTestSeed.js:14-15`, `sanitizeQuickTestSeedInput`), so any sim run with `s > 9999` (routine
  for `G>1` or `N>1`) is **not typable** — the sim seed space is unbounded, the browser's isn't.
- "Start Race" is hard-wired unseeded (`racePlanSeed: 0`, `SetupScreen.jsx:435`); only Quick-Test is
  reproducible. `docs/SIM.md:64` records this and that seeding "Start Race" is an open owner decision.
- `docs/SIM.md:72` already states plainly that browser and sim on the same seed are **not** expected
  to be frame-identical — so the project has documented this gap; the owner now wants it closed.

### 2c. RNG consumption order — **CONFIRMED → CLOSED (parity step 1, 2026-07-23)**

This was the load-bearing correctness finding. It is now **fixed**: `makeRaceRng(seed)` (racePlanner.js)
provides one explicit physics stream threaded through every draw site listed below on both sides, and
the global `Math.random` swap was removed, so the render draws named here can no longer perturb the
race. Sim byte-identity held (fingerprints above); the browser gained frame-rate independence. The
original analysis is retained below as the record of what was wrong.

The browser swap at `index.jsx:539` replaces the **global** `Math.random`. That global is then drawn
from by per-frame **render** code that has no counterpart in the sim:

- Camera director, called every frame (`index.jsx:1573`):
  `Math.random()` for target selection ([`CameraDirector.js:467`](../../client/src/modules/camera/CameraDirector.js#L467))
  and overview jitter ([`:494`](../../client/src/modules/camera/CameraDirector.js#L494)).
- Trail particles, spawned every frame for every un-finished racer
  ([`index.jsx:1477`, `:1482`](../../client/src/screens/RaceScreen/index.jsx#L1477)): the native dust
  trail alone draws 6× `Math.random` per spawn
  ([`genericDustTrail.js:34-41`](../../client/src/modules/racer-types/genericDustTrail.js#L34)); surface
  emitters likewise.

Because the swap is global, these render draws consume from **the same stream** the physics re-rolls
draw from (`spreadFactor` re-rolls, `jOff`, browser block ~`index.jsx:1137-1184`). The number of
camera/trail draws between two physics re-rolls depends on **how many frames were rendered** (frame
rate) and **which camera state was live** (BATTLE/PHOTO_FINISH) in that interval. Therefore:

1. **Browser ≠ sim** even at an identical seed: the sim has no camera and no trails, so it consumes
   the stream *only* at the physics draw sites, while the browser consumes it at physics **plus**
   render sites. The stream *position* at each in-race re-roll differs → different re-roll values →
   different race.
2. **Browser replay is not even frame-rate-independent** for the in-race portion. Only the *pre-race
   init* draws are clean — start rows + `spreadFactor` + first `rollJitter` all fire *before* the
   first render frame, so no render draw has polluted the stream yet. That pre-race window is exactly
   what `seedDeterminism.test.js` covers, which is why the test passes while the whole-race claim does
   not hold. The header comment at `index.jsx:522-531` ("one seeded generator … move-for-move
   identical") over-promises: it is true only for the isolated streams below and the pre-race init.

**What is NOT polluted (good):** the plan stream `mulberry32(racePlanSeed)` inside `createRacePlan`
(`racePlanner.js:125`), the controller-noise stream `mulberry32(plan.seed + 0x9e3779b9)`
(`racePlanner.js:369`), and the hero-curve streams (`heroCurveGenerator.js`) are each their **own**
generator instances, not the global — so they are immune to render pollution and match the sim as
long as call order inside those shared modules matches (it does, by shared code).

**Fix direction:** stop swapping the global. Thread an explicit `rng` through the physics draw sites
(exactly as `computeEvenRowLayout` and `createRacePlan` already accept one), and leave render draws
on the native `Math.random`. Then the physics stream is isolated from frame rate and camera state,
and it matches the sim.

### 2d. Frame / time stepping — **CLEAN on its own; contaminated only through 2c**

- Both are fixed-dt 16 ms and key all simulation timing on the physics clock, not wall-clock:
  browser `physicsTs` steps only by `FIXED_DT` (`index.jsx:144`, `:1021-1022`); sim `raceTs += DT`
  (`sim-fairness.mjs:783`, `:1173-1174`). `advanceRacerT` takes `dt = FIXED_DT/16 = DT/16 = 1.0` on
  both sides (`raceStep.js:116`).
- **Wall-clock → browser simulation state, enumerated:**
  1. *Accumulator step-count.* `rawDt = min(ts − lastTs, 50)` (`index.jsx:913`) →
     `physicsAccum += rawDt · effectiveSlowmoFactor` (`:1012`) → `while (physicsAccum ≥ FIXED_DT &&
     steps < 2)` (`:1020`). The **number of steps per frame** is wall-clock-driven and capped at 2;
     the per-step advance is fixed. Deterministic in `physicsTs`, so no direct state leak — the race
     just paces slower under load.
  2. *Slow-motion.* `effectiveSlowmoFactor` scales the ms fed to the accumulator (`:1000`, `:1012`);
     it is triggered by camera state (BATTLE/PHOTO_FINISH, `:971-975`) and released on a wall-clock
     min-duration (`slowmoStartWallTs = ts` `:983`; `ts − slowmoStartWallTs ≥ smMinDurMs` `:990`).
     This does **not** shift the `physicsTs` step sequence (still 16 ms each), so on its own it is
     pacing, not state (as `index.jsx:1016` claims).
- **The catch:** items (1) and (2) change **how many render frames** occur per physics step, and
  render frames draw from the polluted global stream (§2c). So slow-mo and frame rate *do* reach the
  outcome — **indirectly, through D-STREAM**. Kill the global swap (§2c fix) and this channel closes:
  time stepping becomes fully parity-clean.
- Sim has no accumulator, no slow-mo, no catch-up cap — it runs the fixed loop straight to finish.

### 2e. Config — **CONFIRMED divergence surface; a replay tool must pin more than the world hash**

The browser reads 7 config blocks from `localStorage` on the race path (`index.jsx:430-442`), each
DevScreen-editable, enumerated once in
[`raceConfigWorld.js:20-28`](../../client/src/modules/raceConfigWorld.js#L20) (`WORLD_CONFIG_KEYS`):
`raceDynamicsConfig`, `raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`, `autoScaleConfig`,
`frameTimingConfig`, `cameraConfig`. A fresh sim reads shipped `DEFAULT_*` unless `--config=<world>`
is passed (`loadWorldOrNull`, `sim-fairness.mjs:141-173`, which fail-louds on any unhonoured key).

**Every key whose effective value can differ between a fresh sim and a browser session:**

| Key | Affects outcome how | Pinning need |
|---|---|---|
| `raceDynamicsConfig` | All choreo / re-roll / plan / gap-reroll knobs threaded into `createRacePlan` (`index.jsx:722-772`) | Export → `--config` |
| `raceBehaviorConfig` | Brake/avoidance + **`runoutZone`** (→ `finishT`, see O1) | Export → `--config` |
| `rowLayoutConfig` | `rowGapMultiplier`, `speedBonusFactor` → `deltaT`, `speedBonus` | Export → `--config` |
| `baseSpeedConfig` | `BASE_SPEED_MIN/MAX` band → `spreadFactor` | Export → `--config` |
| `autoScaleConfig` | Sprite scale → **`rowCount`** → number of shuffle draws → **whole RNG stream shifts** | Export → `--config` |
| `frameTimingConfig` | Pacing/interpolation only | None (visual) |
| `cameraConfig` | Camera only — but pollutes stream A in-browser (§2c) | Neutralised by §2c fix |

Note `autoScaleConfig`/`rowLayoutConfig` are not mere multipliers: they change `rowCount`, which
changes how many draws `computeEvenRowLayout` consumes, which **re-aligns the entire downstream
stream**. So config parity is a precondition for RNG parity, not independent of it.

**Not in the world at all — a replay tool must pin these separately** (the world hash covers config
only): the **track geometry** (`getTrack(raceData.geometryId)`, `index.jsx:381`; tracks are
user-editable and can live in `localStorage`), the **racer roster** (`raceData.racers`), **`nRacers`**,
**`durationSec`**, the **seed**, and the **`racePlanEnabled` gate** (browser requires realized
duration ≥ `racePlanMinDurationSec`, `index.jsx:703-706`; the sim gates on `--race-plan`). If the
gate resolves differently, one side runs with a plan and the other without → maximal divergence.

**O1 (from FORCE-PARITY):** the sim's `computeFinishT` hardcodes `runoutZone=0.05` and is called
without threading `behaviorConfig.runoutZone` (`sim-fairness.mjs:584-586`); the browser reads the
config value (`index.jsx:491`). Identical at the shipped default, divergent if the owner overrides
`runoutZone` (open-track finish line moves on one side only).

---

## 3. Equality definition — what "same race" should be asserted on

Recommend a two-part **race hash**, both parts emitted cheaply by both tools and compared with the
existing FNV helper (`canonicalJson` + `hashWorld`, `raceConfigWorld.js:31-56`):

**Part A — race identity (the inputs).** A canonical object, hashed to a short tag:
```
{ seed, nRacers, durationSec, racePlanEnabled,
  worldHash,                         // existing worldStamp() over the 7 config keys
  trackGeometryHash,                 // FNV over the track shape/points (new — track is NOT in the world today)
  rosterHash }                       // FNV over racer types/order (new)
```
Two runs are comparable only when their identity tags match. This is the "config hash Z + track Y +
seed X" the replay entry point takes.

**Part B — race outcome (the result).** A hash over:
- **Finishing order:** the sorted list of `(racerIndex → finalRank, finishTimeMs)` — the primary
  assertion (both sides already produce this: `index.jsx:1262` / `sim-fairness.mjs` finish block).
- **Keyframes:** `t` per racer sampled at fixed **`physicsTs` checkpoints** (e.g. every 5 s, or at
  `raceProgress` deciles) and at each finish crossing — this catches "same winner, different path"
  divergences that a finish-order-only check would miss. Both tools already step `physicsTs`; the sim
  has `diagSnapshots` and the browser has the frame-log HUD to hang the sampler on.

`raceHash = hashWorld({ identity: A, outcome: B })`. **"Same race" ⇔ identity tags equal AND outcome
hashes equal.** This becomes the acceptance test for the fix below: run both tools on one identity,
assert equal outcome hash. It is O(checkpoints × racers) to compute — near-free.

---

## 4. Fix plan — ordered toward one shared driving layer

The order front-loads the two structural fixes (they unblock everything) and defers the expensive
re-baseline decision to an explicit owner gate.

1. **Isolate the physics RNG from render (fixes D-STREAM, §2c).** Introduce a shared
   `makeRaceRng(seed)` returning named streams and thread an explicit `rng` through the physics draw
   sites on **both** sides (`spreadFactor`, `rollJitter`, re-roll target, `jOff`) — the same pattern
   `computeEvenRowLayout`/`createRacePlan` already use. Stop swapping the **global** `Math.random`
   (`index.jsx:539`, `sim-fairness.mjs:636`); leave camera/trail draws on native `Math.random`.
   *Gate:* if the threaded stream keeps the exact same draw order and seed, values are unchanged →
   `fingerprint-default.mjs` stays green and `seedDeterminism.test.js` still passes. This is the one
   step that can be **byte-identical** if done carefully; do it first and prove it with the fingerprint.

2. **Unify the plan grid (fixes D-GRID, §2a).** Build **one** per-race row shuffle from the shared
   driver and feed both the physical placement and `createRacePlan`'s `planRacers` from it — in both
   tools. Delete the sim's `comboRowLayout` / `comboLayoutSeed` FNV path. *Gate:* this **re-baselines
   every absolute sim metric** (start-row → target-rank is the fairness input). Requires: re-run
   `fingerprint-default.mjs` to mint the new default fingerprint, a full fairness/runaway re-sweep,
   and a stale-baseline note on every memory quoting absolute sim numbers. **Owner decision required
   before running** — this is a measurement reset, not a silent fix.

3. **Make the seed round-trip total (D-SEED, §2b).** Add a sim `--replay-seed=S` alias (documented
   equivalent of `--seed=S --races=1`) and lift/relax the browser Quick-Test [1,9999] cap (or add a
   "paste sim seed" affordance) so sim seeds `> 9999` are reproducible in the browser. Put the
   `seed → streams` derivation in the shared driver from step 1 so neither side re-derives it.

4. **Pin the full race identity (D-CONFIG, §2e).** Extend the identity beyond the world hash to
   include `trackGeometryHash + rosterHash + nRacers + durationSec + racePlanEnabled + seed` (§3
   Part A), reusing `hashWorld`. Ship a sim replay entry point
   **`node scripts/sim-fairness.mjs --replay=<identity.json>`** that pins all of them (it already
   accepts `--config`). The **HUD config-fingerprint badge** sits next to the existing seed badge
   (`index.jsx:1743-1747`): show the identity short-hash there, sourced from `worldStamp()` +
   the new track/roster hashes, so an eye-tester can read off "seed X, track Y, config Z" and hand it
   straight to `--replay`.

5. **Close O1 (cheap, byte-identical at default).** Thread `behaviorConfig.runoutZone` into the sim's
   `computeFinishT` call (`sim-fairness.mjs:584-586`).

6. **Wire the acceptance test (§3).** Run the browser core headlessly through the shared driver (no
   DOM — steps 1-2 make this possible) and the sim on the same identity; assert equal outcome hash.
   Add it as a golden test so parity can't silently regress again.

**Sequencing rationale:** steps 1 and 5 can land byte-identical and prove the plumbing; step 2 is the
gated re-baseline; steps 3-4 build the replay UX on top; step 6 locks it. After step 2, the owner's
requirement — *same seed + same config + same track ⇒ byte-identical race in both tools* — holds, and
step 6's hash is the standing proof.

---

## Probe-run log

**0 / 5 probes used.**

Every finding above is settled by reading source: the seed formulas
(`sim-fairness.mjs:3153`, `quickTestSeed.js`), the two PRNG bodies (byte-identical),
the draw sites and their order (`index.jsx:539/553/632/635/1477/1482`,
`sim-fairness.mjs:636/676/721/723/1200/1230/3140-3143/3159`), the render draws that pollute the
global stream (`CameraDirector.js:467/494`, `genericDustTrail.js:34-41`), the fixed-dt stepping, and
the config surfaces (`raceConfigWorld.js:20-28`). None of these required execution to confirm.

A probe here would be a sim-only N=1 run. The central claims are **browser↔sim** equalities, and the
harness has no browser in it — a sim-only run cannot observe the browser's stream pollution or its
plan-grid keying, so it could not have *confirmed or refuted* the two headline divergences. Running
one would have spent compute without adding evidence, so I did not. Compute stayed at zero, as the
budget requires.
