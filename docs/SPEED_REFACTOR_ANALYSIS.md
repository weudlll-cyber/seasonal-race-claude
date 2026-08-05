# PR-A2 Diagnosis — Speed Pipeline Refactor Analysis

**Branch:** `docs/pr-a2-diagnose`
**Status:** 2026-05-03
**Context:** PR-A1 merged (master `ba7dd7f`). Q-25 fixed (maxScale=10). Architectural gap remains: `openTrackFinishT` does not invert `speedScaleFactor` → Open-Track duration slider has no effect on long tracks.

---

## Section 1 — Current state of the speed pipeline

### 1.1 Files and functions involved

| File                                                             | Function                                                         | Role                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `client/src/modules/speedScale.js:23`                            | `computeSpeedScaleFactor(pathLengthPx, config)`                  | Computes divisor = clamp(pathLengthPx / referencePathLength, minScale, maxScale) |
| `client/src/modules/speedScale.js:29`                            | `loadSpeedScaleConfig()`                                         | Loads `racearena:speedScaleConfig` from localStorage                             |
| `client/src/modules/camera/lapUtils.js:46`                       | `openTrackFinishT(targetSeconds, speedMultiplier, baseSpeedMax)` | Computes finishT for open tracks — **contains the architectural gap**            |
| `client/src/modules/camera/lapUtils.js:56`                       | `openTrackDurationRange(pathLengthPx, ...)`                      | Slider range min/max for SetupScreen — correctly implemented                     |
| `client/src/modules/camera/lapUtils.js:21`                       | `lapsFromDuration(seconds)`                                      | Closed-track: 1–4 laps from duration value                                       |
| `client/src/modules/camera/lapUtils.js:39`                       | `estimatedSecondsPerLap(speedMultiplier, baseSpeedMean)`         | Estimated duration for closed-track display                                      |
| `client/src/modules/baseSpeedConfig.js:18`                       | `loadBaseSpeedConfig()`                                          | Loads `racearena:baseSpeedConfig` — min/max spread range                         |
| `client/src/modules/storage/defaults.js:112`                     | `DEFAULT_SPEED_SCALE_CONFIG`                                     | { enabled, referencePathLength: 2000, minScale: 0.5, maxScale: 10.0 }            |
| `client/src/modules/storage/defaults.js:121`                     | `DEFAULT_BASE_SPEED_CONFIG`                                      | { min: 0.00091, max: 0.00118 } — ±12.9% spread                                   |
| `client/src/screens/RaceScreen/index.jsx:182`                    | Race init speed block                                            | speedScaleFactor, baseSpeedConfig, finishT calculation                           |
| `client/src/screens/RaceScreen/index.jsx:286`                    | Per-racer baseSpeed                                              | `(random[MIN,MAX] * speedMultiplier / speedScaleFactor) * (1 + bonus)`           |
| `client/src/screens/RaceScreen/index.jsx:718`                    | rAF loop t increment                                             | `r.t += (r.baseSpeed * boost * brake + jitter) * (dt / 16)`                      |
| `client/src/screens/SetupScreen/SetupScreen.jsx:206`             | `openTrackSliderRange`                                           | useMemo: calls `openTrackDurationRange`                                          |
| `client/src/screens/DevScreen/sections/SpeedScaleSection.jsx:37` | Formula preview                                                  | UI visualization of the computeSpeedScaleFactor value                            |
| `client/src/screens/DevScreen/sections/BaseSpeedSection.jsx`     | Spread preview                                                   | Min/max tuning of the baseSpeed range                                            |

### 1.2 Constants

| Constant              | Value    | Source                                     |
| --------------------- | -------- | ------------------------------------------ |
| `REFERENCE_FPS`       | 62.5     | `lapUtils.js:18` (1000ms / 16ms)           |
| `baseSpeedMin`        | 0.00091  | `defaults.js:121`                          |
| `baseSpeedMax`        | 0.00118  | `defaults.js:121`                          |
| `baseSpeedMean`       | 0.001045 | `(min + max) / 2` in `lapUtils.js:16`      |
| `referencePathLength` | 2000 px  | `DEFAULT_SPEED_SCALE_CONFIG`               |
| `minScale`            | 0.5      | `DEFAULT_SPEED_SCALE_CONFIG`               |
| `maxScale`            | 10.0     | `DEFAULT_SPEED_SCALE_CONFIG` (after PR-A1) |
| `runoutZone`          | 0.05     | `DEFAULT_RACE_BEHAVIOR_CONFIG`             |

### 1.3 Pipeline data flow (current state)

```
SetupScreen (user input)
  ├── Closed track: selectedLaps (1–4) → raceData.targetLaps
  └── Open track:  openTrackDuration (slider, 30–144s) → raceData.targetDuration

RaceScreen init (race start)
  ├── speedScaleConfig = loadSpeedScaleConfig()  → { referencePathLength:2000, maxScale:10, ... }
  ├── speedScaleFactor = clamp(pathLengthPx / 2000, 0.5, 10.0)
  ├── baseSpeedConfig  = loadBaseSpeedConfig()   → { min:0.00091, max:0.00118 }
  ├── behaviorConfig   = loadRaceBehaviorConfig() → { runoutZone:0.05, ... }
  │
  ├── finishT (closed):  raceData.targetLaps ?? lapsFromDuration(duration)  [integer: 1,2,3,4]
  ├── finishT (open):    Math.min(
  │     openTrackFinishT(targetDuration, speedMultiplier, baseSpeedMax),   ← BUG HERE
  │     1.0 - runoutZone
  │   )
  │
  └── Per-racer init:
        r.baseSpeed = (random[0.00091, 0.00118] * speedMultiplier / speedScaleFactor)
                      * (1 + speedBonus_for_row)

rAF loop (per frame, dt ≈ 16ms)
  └── r.t += (r.baseSpeed * boost * brake + jitter) * (dt / 16)

Finish detection:
  └── r.t >= st.finishT → r.finished = true
```

### 1.4 Why the slider has no effect (architectural gap)

`openTrackFinishT` (lapUtils.js:46):

```js
return Math.min(
  1,
  baseSpeedMax * speedMultiplier * REFERENCE_FPS * targetSeconds,
);
```

This is the t level the FASTEST racer would reach in `targetSeconds` without the speedScaleFactor division. But the actual racer moves at:

```
r.baseSpeed = baseSpeedMax * speedMultiplier / speedScaleFactor
```

For Space Sprint (ssf ≈ 9.886):

- `openTrackFinishT(30s, 1.0, 0.00118)` = 0.00118 × 62.5 × 30 = **2.21 → clamped to 1.0**
- But r.baseSpeed × REFERENCE_FPS = 0.00118 / 9.886 × 62.5 = **0.00746 per second**
- Reaching finishT=0.95 takes 0.95 / 0.00746 ≈ **127s** — regardless of slider value

Slider value 30s, 60s, 100s, 130s → **identical finishT = 0.95**. Duration choice has zero effect.

The correct formula would be: `openTrackFinishT = baseSpeedMax * speedMultiplier * REFERENCE_FPS * targetSeconds / speedScaleFactor`

For Space Sprint / 30s: `2.21 / 9.886 = 0.224` — plausible. Race would actually be 30s short.

### 1.5 How r.t is incremented per frame

```js
// RaceScreen/index.jsx:717-718
r.t = Math.min(
  r.t + (r.baseSpeed * boost * brake + jitter) * (dt / 16),
  st.finishT + 0.001,
);
```

- `dt` = actual frame time in ms (nominally 16ms at 60fps)
- `(dt / 16)` normalizes to REFERENCE_FPS=62.5
- `jitter` = `Math.sin(ts * r.jitterFreq + r.jitterPhase) * 0.00012` — small wobble per racer
- `boost` = 1.1 when `draftingBoostActive`
- `brake` = 0.95 when `avoidanceActive`

### 1.6 finishT usage

| Track type | finishT       | Meaning                    | Finish condition                                                            |
| ---------- | ------------- | -------------------------- | --------------------------------------------------------------------------- |
| Closed     | integer (1–4) | Number of laps             | `r.t >= finishT` (t accumulates across laps: t=1.0 = 1 lap, t=2.0 = 2 laps) |
| Open       | float (0..1)  | Position threshold on path | `r.t >= finishT` (t=0..1 = start to end)                                    |

`maxLaps` = finishT for closed, 1 for open. Used for `currentLap()` and `lapProgress()`.

### 1.7 runoutZone and MAX_STATE_DURATION

- **runoutZone** (0.05 default): Open-track safety buffer. finishT = min(openTrackFinishT_result, 0.95). Racers that cross finishT coast out ("runout": `r.runoutDecay *= 0.97` per frame).
- **MAX_STATE_DURATION** (8000ms): Camera director timeout, **not** speed pipeline. Irrelevant for PR-A2.

---

## Section 2 — Affected files and functions

### 2.1 Code files

| File                                                                    | Change type                                                                                                                            | Estimated LOC impact       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `client/src/modules/speedScale.js` (36 LOC)                             | `computeSpeedScaleFactor` becomes internal or disappears as public API; `loadSpeedScaleConfig`/`saveSpeedScaleConfig` possibly removed | −20 to −36 LOC             |
| `client/src/modules/storage/defaults.js` (157 LOC)                      | `DEFAULT_SPEED_SCALE_CONFIG` removed or as internal constant in `raceBaseSpeed.js`; `DEFAULT_BASE_SPEED_CONFIG` stays as spread config | −10 to −15 LOC             |
| `client/src/modules/storage/storage.js`                                 | `SPEED_SCALE_CONFIG` key removed (if SpeedScaleSection is dropped)                                                                     | −1 LOC                     |
| `client/src/screens/RaceScreen/index.jsx` (1032 LOC)                    | Lines 182–295: replace `speedScaleConfig`/`speedScaleFactor` with `computeRaceBaseSpeed` call; simplify `finishT` calculation          | −30 to +20 LOC (net −10)   |
| `client/src/modules/camera/lapUtils.js` (69 LOC)                        | `openTrackFinishT` obsolete or fixed; `openTrackDurationRange` stays; `import computeSpeedScaleFactor` removed                         | −15 to −20 LOC             |
| `client/src/screens/SetupScreen/SetupScreen.jsx` (~600 LOC)             | `openTrackSliderRange` useMemo: `openTrackDurationRange` call simplified; `handleStartRace` minimal                                    | −5 to +5 LOC (net neutral) |
| `client/src/screens/DevScreen/sections/SpeedScaleSection.jsx` (184 LOC) | Complete overhaul or removal — SpeedScale as UI concept disappears                                                                     | −184 LOC (or rewrite)      |
| `client/src/screens/DevScreen/sections/BaseSpeedSection.jsx`            | Adjust tooltips/labels: "Spread around race_baseSpeed" instead of "raw baseSpeed range"                                                | −5 to +5 LOC               |
| `client/src/modules/baseSpeedConfig.js` (41 LOC)                        | Remains as "spread config" for ±% variation around race_baseSpeed                                                                      | ~0 LOC                     |
| **NEW:** `client/src/modules/raceBaseSpeed.js`                          | `computeRaceBaseSpeed({finishT, targetDurationSeconds})` + tests                                                                       | +30 to +50 LOC             |

**Further files with indirect dependencies:**

| File                                             | Change type                                                        | Estimated LOC impact |
| ------------------------------------------------ | ------------------------------------------------------------------ | -------------------- |
| `client/src/modules/storage/defaults.js`         | `DEFAULT_RACE_DEFAULTS.duration` stays; no migration needed        | 0 LOC                |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | `loadSpeedScaleConfig` import removed                              | −1 LOC               |
| `client/src/screens/RaceScreen/index.jsx:50`     | `import { loadSpeedScaleConfig, computeSpeedScaleFactor }` removed | −1 LOC               |
| `client/src/screens/DevScreen/DevScreen.jsx`     | Navigation item for SpeedScale section possibly removed            | −3 LOC               |

### 2.2 Estimated total files: 10–11 code files + 1 new module

### 2.3 Test files

| Test file                                                    | Change type                                                                                  | Category                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| `client/src/modules/speedScale.test.js` (145 LOC)            | All `computeSpeedScaleFactor` tests: formulas change; Q-25 tests obsolete                    | Structurally rewrite or largely delete |
| `client/src/modules/camera/lapUtils.test.js` (207 LOC)       | `openTrackFinishT` tests: new behavior; `openTrackDurationRange` tests: adjust slightly      | Adjust test expectations               |
| `client/src/modules/baseSpeedConfig.test.js` (125 LOC)       | Stays: spread config unchanged                                                               | Unchanged green                        |
| `client/src/screens/SetupScreen/SetupScreen.test.jsx`        | Open-track slider tests: calculation changes slightly                                        | Adjust test expectations               |
| **NEW:** `client/src/modules/raceBaseSpeed.test.js`          | Unit tests for `computeRaceBaseSpeed`                                                        | Write new                              |
| `client/e2e/b1617-smoke.spec.js` (144 LOC)                   | SpeedScale section tests: removed or renamed if section is removed                           | Obsolete or rename                     |
| `client/e2e/camera-polish-smoke.spec.js` (69 LOC)            | BaseSpeed section tests: spread labels possibly adjusted                                     | Green or minimal adjustment            |
| `client/e2e/camera-polish-ux-verification.spec.js` (614 LOC) | V8-V12: BaseSpeed tests stay; V11 targetDuration test must work with new logic               | Partially adjust                       |
| `client/e2e/d9-smoke.spec.js` (379 LOC)                      | Estimated duration assertions (lap display) stay; open-track targetDuration handling changes | Adjust test expectations               |

**Total test files:** 9 (4 unit + 5 E2E; 1 new)

---

## Section 3 — Test impact analysis

### 3.1 Tests that check speed pipeline output

- **`speedScale.test.js`** — tests `computeSpeedScaleFactor` directly with concrete formulas. The function changes structurally → tests need to be rethought.
- **`lapUtils.test.js`** — `openTrackFinishT` tests check the buggy formula. After fix/replacement assertions must change (test intent stays: "finishT matches chosen duration").
- **`camera-polish-ux-verification.spec.js:V11`** — tests open-track race with `targetDuration: 30`. If finishT is now correctly 0.224 instead of 0.95, race runs through in 30s — no error, but `waitForTimeout` timings may be wrong.

### 3.2 Tests that check relative speedMultiplier ratios

- **`d9-smoke.spec.js:128`** — "Estimated duration is ~3× higher for Snail than for Horse": stays valid, since speedMultiplier ratios are preserved.
- **`d355-smoke.spec.js`** — speedMultiplier override tests: independent of base speed architecture → green.

### 3.3 Tests that check concrete race duration values

- **`speedScale.test.js:137`** — "Space Sprint race duration ~144s" → obsolete if speedScaleFactor is removed.
- **`lapUtils.test.js:145`** — "Space Sprint max ~144s at maxScale=10" → stays in `openTrackDurationRange` (slider range calculation, which continues to use ssf).
- **`d9-smoke.spec.js:200-205`** — Open-track targetDuration session data: value itself does not change, only what it causes.

### 3.4 Categorization of all tests

**Stay green (unchanged):**

- `baseSpeedConfig.test.js` (125 LOC) — spread config stays
- `d355-smoke.spec.js` — speedMultiplier override UI
- `d3-5-5-ux-verification.spec.js` — per-type tuning UI
- `camera-polish-smoke.spec.js` — BaseSpeed section UI smoke
- `d9-smoke.spec.js: closed-track part` — lap picker, session data for closed track
- `lapUtils.test.js: lapsFromDuration, lapProgress, currentLap, estimatedSecondsPerLap` — unchanged
- `lapUtils.test.js: openTrackDurationRange` — slider range calculation stays correct

**Adjust test expectations (same intent, new numbers):**

- `lapUtils.test.js: openTrackFinishT` — formula changes; tests must reflect new calculation
- `SetupScreen.test.jsx: open-track-duration-slider` — slider range possibly slightly different values
- `camera-polish-ux-verification.spec.js: V11` — targetDuration=30s race now actually runs fast
- `d9-smoke.spec.js: open-track-session-data` — targetDuration is now correctly applied (no bug)

**Structurally rewrite:**

- `speedScale.test.js` — `computeSpeedScaleFactor` as public API disappears; Q-25 tests obsolete; possibly replaced by `raceBaseSpeed.test.js` tests

**Obsolete (can be deleted):**

- `b1617-smoke.spec.js: B-17 SpeedScale-Section` — if SpeedScaleSection UI is removed
- `speedScale.test.js: maxScale=10 Q-25 tests` — architectural intent changes

**To be written new:**

- `raceBaseSpeed.test.js` — `computeRaceBaseSpeed(finishT, targetDuration)` for open- and closed-track cases

---

## Section 4 — Pattern breaks and architecture decisions

### 4.1 speedScaleFactor disappears as a standalone concept

**Currently:** `speedScaleFactor` is a user-visible tunable in `SpeedScaleSection`. It is a px-proportional correction factor.

**After PR-A2:** The formula `pathLengthPx / referencePathLength` can flow in as an **internal implementation detail** in `computeRaceBaseSpeed` — or it disappears entirely, since race_baseSpeed is computed directly from race duration without path-length normalization.

**Pattern break:** `SpeedScaleSection.jsx` as a UI section becomes superfluous. The concept "speed scale factor" disappears from user vocabulary. `DEFAULT_SPEED_SCALE_CONFIG` key in localStorage becomes an orphan.

### 4.2 DEFAULT_SPEED_SCALE_CONFIG obsolescence

- `DEFAULT_SPEED_SCALE_CONFIG` (enabled, referencePathLength, minScale, maxScale) → only internally relevant if at all
- `racearena:speedScaleConfig` in localStorage → can be ignored (no breaking change, simply no longer read)
- **No migration needed** — existing tracks have no `speedScaleFactor` field

### 4.3 Setup screen for closed tracks with optional desired duration

Currently: closed track = lap count picker (1–4). No duration slider.

CAMERA_DIRECTOR.md §7.4 mentions "Closed tracks: game master chooses lap count + optional desired duration". This is a substantial UI extension:

- New optional duration slider below the lap picker
- Race_baseSpeed computed so that N laps fit in ≈ desired duration
- `estimatedSecondsPerLap` display becomes redundant if duration slider is present

**Open question (Section 8, Q1):** Is this part of PR-A2 or a separate PR?

### 4.4 finishT remains retroactively immutable during a running race

`race_baseSpeed` is computed at race init and frozen into `r.baseSpeed` per racer. If the game master changes `baseSpeedConfig` live in the Dev Panel, it has **no effect on the running race**. Same semantics as today. ✓

### 4.5 maxScale tunable disappears

`maxScale` in the Dev Panel (Speed Scale Section) is a symptom fix for Q-25. After PR-A2 Q-25 is structurally solved — `maxScale` loses its meaning. The tunable disappears together with `SpeedScaleSection`.

---

## Section 5 — Component design

### 5.1 computeRaceBaseSpeed

**Signature:**

```js
// client/src/modules/raceBaseSpeed.js

/**
 * Computes the per-frame t-progress rate such that a racer with
 * speedMultiplier=1.0 and no spread reaches finishT in exactly targetDurationSeconds.
 *
 * Individual racer baseSpeed = computeRaceBaseSpeed(...) * speedMultiplier * spreadFactor
 * where spreadFactor = random from baseSpeedConfig range normalized around 1.0.
 *
 * @param {number} finishT  - Target position (laps for closed, 0..1 for open)
 * @param {number} targetDurationSeconds  - Desired race duration for median racer
 * @returns {number}  race_baseSpeed — t-progress per frame at REFERENCE_FPS
 */
export function computeRaceBaseSpeed(finishT, targetDurationSeconds) {
  if (!targetDurationSeconds || targetDurationSeconds <= 0) return 0;
  return finishT / (REFERENCE_FPS * targetDurationSeconds);
}
```

**Inputs/outputs:**

- `finishT`: for open track = `1.0 - runoutZone = 0.95`; for closed track = `targetLaps` (1, 2, 3, 4)
- `targetDurationSeconds`: race duration chosen by game master
- Return: scalar value (t-progress per frame at 16ms)

**Example calculation:**

- Open track, 30s: `0.95 / (62.5 × 30) = 0.000507 per frame`
- Closed track, 2 laps, 60s: `2 / (62.5 × 60) = 0.000533 per frame`
- Horse (speedMultiplier=1.0): `r.baseSpeed = 0.000507 × 1.0 × spreadFactor`
- Rocket (speedMultiplier=1.25): `r.baseSpeed = 0.000507 × 1.25 × spreadFactor` → 25% faster, finishes race in 24s

**spreadFactor** replaces `random[MIN, MAX] / BASE_SPEED_MEAN`:

```js
// In RaceScreen init — instead of old: random[MIN,MAX] / speedScaleFactor
const spreadFactor =
  (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) /
  BASE_SPEED_MEAN;
// BASE_SPEED_MEAN and BASE_SPEED_MIN/MAX remain in DEFAULT_BASE_SPEED_CONFIG
```

**Location:** `client/src/modules/raceBaseSpeed.js` (new module, analogous to `speedScale.js` / `baseSpeedConfig.js`)

**How called from RaceScreen:**

```js
// RaceScreen/index.jsx — Race init, replaces previous speedScale logic
import { computeRaceBaseSpeed } from "../../modules/raceBaseSpeed.js";
import { REFERENCE_FPS } from "../camera/lapUtils.js"; // or re-export in raceBaseSpeed.js

const finishT = isOpenTrack
  ? 1.0 - behaviorConfig.runoutZone
  : (raceData.targetLaps ?? lapsFromDuration(duration));

const race_baseSpeed = computeRaceBaseSpeed(finishT, targetDuration);

// Per-racer: r.baseSpeed = race_baseSpeed * speedMultiplier * spreadFactor * (1 + speedBonus)
```

**Testability:**

```js
// raceBaseSpeed.test.js
it("computeRaceBaseSpeed returns correct finishT in targetDuration", () => {
  const rbsp = computeRaceBaseSpeed(0.95, 30); // 30s, open track
  expect(rbsp * 62.5 * 30 * 1.0).toBeCloseTo(0.95, 5); // median racer reaches finishT
});
it("closed track 2 laps in 60s", () => {
  const rbsp = computeRaceBaseSpeed(2, 60);
  expect(rbsp * 62.5 * 60 * 1.0).toBeCloseTo(2, 5);
});
```

### 5.2 openTrackFinishT revision

The current `openTrackFinishT` function becomes obsolete — its purpose was to position the finish line. Under the new model the finish line is always at `1.0 - runoutZone` (open track). The function can be removed or reduced to a trivial implementation.

`openTrackDurationRange` (lapUtils.js:56) stays for the setup screen slider unchanged — it uses `computeSpeedScaleFactor` internally only for the slider range calculation. This can stay with its own internal `ssf` call or be refactored (not mandatory for PR-A2).

---

## Section 6 — Migration and backward compatibility

### 6.1 Existing track data

Tracks have **no** speed-pipeline-relevant fields. Race behavior config and surface classes are independent. No migration needed.

### 6.2 localStorage keys

| Key                            | Currently                        | After PR-A2                                                      |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------- |
| `racearena:speedScaleConfig`   | Read in RaceScreen + SetupScreen | **No longer read** — becomes an orphan; no active cleanup needed |
| `racearena:baseSpeedConfig`    | Read as MIN/MAX for spread       | **Stays** — interpreted as spread factor                         |
| `racearena:raceBehaviorConfig` | `runoutZone` used for finishT    | **Unchanged**                                                    |

**No migration, no backward-compat shims needed.** Orphan key `racearena:speedScaleConfig` causes no harm.

### 6.3 Race behavior config connection

`runoutZone` from `raceBehaviorConfig` becomes an **input for finishT** instead of a limit value in `openTrackFinishT`. The connection changes minimally — instead of `Math.min(openTrackFinishT(...), 1 - runoutZone)` it becomes `1.0 - runoutZone` directly.

### 6.4 Race replays

There is no replay system. `activeRace` in sessionStorage contains `targetDuration` — this field is preserved and does not change its meaning. No migration needed.

### 6.5 SurfaceClass modifiers

Surface classes affect trail emitters (VRE system), not `baseSpeed`. No overlap.

---

## Section 7 — Risk assessment

### 7.1 Scope size

- **Affected code files:** 10 (7 changed + 1 deleted/heavily reduced + 1 new + 1 import cleanup)
- **Affected test files:** 9 (4 unit + 5 E2E)
- **Test adjustments:** ~4 files with expectation changes; ~2 files structurally rewritten; ~1 new test file
- **Estimated LOC change:** net −50 to −100 LOC (more deleting than adding thanks to simplification)
- **Core logic change:** `computeRaceBaseSpeed` is a 3-line function; the rest is wiring

### 7.2 Risk level: **MEDIUM**

**Rationale:**

- ✅ Core formula is simple and isolatable (`computeRaceBaseSpeed`)
- ✅ No schema migration needed
- ✅ `speedMultiplier` ratios preserved → all type tests green
- ✅ Closed-track logic (lap picker) remains largely unchanged
- ⚠️ Many test files must adjust expectations → risk of missing an assertion
- ⚠️ Removing `SpeedScaleSection.jsx` requires careful Dev Screen restructuring
- ⚠️ Open-track UX tests: if finishT is now at 0.22 instead of 0.95 for a 30s race, timing behavior in E2E tests changes

No CRITICAL or HIGH: no architecture decisions requiring user input before implementation (except for the one on closed-track duration, Section 8).

### 7.3 Recommendation

**PR-A2 can be implemented directly** — no additional concept sprint needed.

**Prerequisite:** User answers Q1 (Section 8) — whether closed-track optional duration is part of PR-A2. If yes: scope grows by ~1 UI component and ~10 tests.

**Recommended sub-split if scope is too large:**

1. **PR-A2a:** `computeRaceBaseSpeed` + open-track fix (finishT = 1-runoutZone, race_baseSpeed from duration). Remove SpeedScaleSection. Adjust all affected tests.
2. **PR-A2b (optional):** Closed-track optional duration (if Q1 answered yes). New UI block below lap picker.

Alternatively: everything in one PR, since core logic is small (~200 LOC net).

---

## Section 8 — Open questions for user + strategy

### Q1 — Closed track: optional desired duration in PR-A2?

CAMERA_DIRECTOR.md §7.4 mentions "optional desired duration" for closed tracks. Currently there is only the lap picker (1–4 laps).

**Option A:** PR-A2 affects **open tracks only**. Closed-track duration stays as today (lapsFromDuration or explicit lap count; race_baseSpeed based on global baseSpeed default / ssf formula).

**Option B:** PR-A2 adds an optional duration slider to closed tracks. Lap picker stays, but additionally a target duration can be set → race_baseSpeed computed from it.

**Option C:** Closed track remains completely unchanged in PR-A2. Separate ticket for later.

**Scope impact:** Option A = PR-A2 small; Option B = PR-A2 medium (+slider UI for closed track, +~5 unit tests, +~3 E2E tests).

---

### Q2 — SpeedScaleSection: remove completely or keep?

If `computeSpeedScaleFactor` disappears from the race pipeline, `SpeedScaleSection` in the Dev Screen is a UI with no effect.

**Option A:** Remove completely — cleaner Dev Screen surface.

**Option B:** Rename section to "Advanced Speed Tuning" with a `race_baseSpeed` multiplier (a global offset tunable for power users). No direct UX need today.

**Option C:** Leave section as "Legacy Mode" (disabled, hint text "replaced by duration-based system"). Causes no harm but is UI cruft.

---

### Q3 — Spread factor: retain DEFAULT_BASE_SPEED_CONFIG?

Currently: `random[0.00091, 0.00118]` = ±12.9% spread around the mean. This spread determines how far racers of the same type diverge.

Under PR-A2: `spreadFactor = random[MIN, MAX] / BASE_SPEED_MEAN` = ±12.9% as multiplier on `race_baseSpeed`. **Semantics preserved, mechanism changes.**

`BaseSpeedSection` and `baseSpeedConfig.js` remain functional. Tooltips should be updated ("spread around race base speed" instead of "absolute t-speed").

**Question:** Is this clear enough, or should MIN/MAX be newly expressed as `spreadMin`/`spreadMax` in percent? (Architecture decision for UX, not a blocker for PR-A2)

---

### Q4 — Closed-track race_baseSpeed without targetDuration: what as base?

If Q1 is answered with option A or C: closed track has no duration slider. What is the default for `race_baseSpeed` on closed tracks?

**Option A:** Retain old formula: `r.baseSpeed = random[MIN,MAX] * speedMultiplier / speedScaleFactor`. For closed tracks everything works as today.

**Option B:** Synthetically compute a "natural duration" from track length (similar to `openTrackDurationRange.max`) and derive `race_baseSpeed` from it. Would be more consistent but breaks existing closed-track behavior.

**Recommendation:** Option A for PR-A2. Closed-track behavior is good (lapsFromDuration works). Do not introduce regression without reason.

---

### Q5 — openTrackDurationRange: retain speedScaleFactor dependency?

`openTrackDurationRange` (lapUtils.js:56) uses `computeSpeedScaleFactor` internally to calculate the slider max. This function is **correct** — it shows the user what race durations are physically achievable on this track.

If `computeSpeedScaleFactor` disappears as a public API, `openTrackDurationRange` will either:

- Inline the ssf formula internally (3 lines), or
- Use `computeRaceBaseSpeed` in reverse: `maxDuration = finishT / computeRaceBaseSpeed_inverse_...`

Not a blocker, but a decision needed during implementation.

---

## Procedure summary

### Analyzed files

- `CAMERA_DIRECTOR.md` (§7.1 measurement results, §7.4 speed pipeline architecture, §13.1 R7) ✓
- `client/src/modules/speedScale.js` (complete) ✓
- `client/src/modules/storage/defaults.js` (complete) ✓
- `client/src/screens/RaceScreen/index.jsx` (lines 170–330 init, 700–760 rAF loop) ✓
- `client/src/screens/SetupScreen/SetupScreen.jsx` (lines 195–306 speed/duration logic) ✓
- `client/src/modules/camera/lapUtils.js` (complete) ✓
- `client/src/modules/baseSpeedConfig.js` (complete) ✓
- `client/src/screens/DevScreen/sections/SpeedScaleSection.jsx` (complete) ✓
- `client/src/modules/speedScale.test.js`, `lapUtils.test.js`, `baseSpeedConfig.test.js` ✓
- `client/e2e/d9-smoke.spec.js`, `b1617-smoke.spec.js`, `camera-polish-*.spec.js` ✓

### Scope overview

| Dimension                 | Value                  |
| ------------------------- | ---------------------- |
| Code files affected       | 10–11                  |
| Test files affected       | 9                      |
| LOC change net            | −50 to −100 LOC        |
| Risk level                | **MEDIUM**             |
| Open user-input questions | **5** (Q1 is decisive) |

### Recommendation

**Implement PR-A2 directly** — no additional concept sprint needed. Core logic (`computeRaceBaseSpeed`) is a 3-line function. Main work is updating the test assertions and cleanly removing `SpeedScaleSection`.

User must answer **Q1** before PR-A2 begins: closed-track duration in PR-A2 or separate PR? If option A (open track only), PR-A2 is clearly scoped and low risk.
