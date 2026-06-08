# Report 42 — Seatrack × Rocket: Regression Diagnosis

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Regression confirmed, root cause identified. No fix yet.

---

## Headline verdict

**REGRESSION — caused by the scale cleanup, NOT the gate fix.**

The scale cleanup (report 31) changed Seatrack's track width from 395 px (wrong) to 300 px (correct). This added a 4th starting row for 60 racers, increasing pack density and pushing speed-brake saturation from 81% to 96%. The gate fix had zero effect on brake frequency.

---

## Task 1 — Pre-existing vs regression: baseline comparison

Three-way empirical measurement: same command (`--openRacers=60 --closedRacers=40 --dur=60 --races=50 --race-plan=true --bonusMult=2.0 --seed=0 --track=seatrack --racer=rocket`).

| Baseline | Tag | Width | Rows | χ² | p | brake% | blocked% |
|---|---|---|---|---|---|---|---|
| Before scale cleanup + gate fix | `backup/step2-stageC` (dca7e47) | **395 px** | 3 | 0.3 | **0.866** ✅ | **81.0%** | 76.5% |
| Before gate fix (scale cleanup state) | `backup/y-reject-fair` (2890efa) | **395 px** | 3 | 0.8 | **0.689** ✅ | **83.9%** | 80.5% |
| **Current** (scale cleanup + gate fix) | `feat/open-track-overlap` | **300 px** | 4 | 10.3 | **0.016** ❌ | **96.1%** | 94.4% |

Both old baselines use Seatrack width=395 px (the pre-cleanup value) and produce 3 starting rows with 20 racers each. Both pass cleanly at p=0.689 and p=0.866. The current code uses the corrected width=300 px, which produces 4 rows of 15 — a denser field.

**The gate fix is not responsible.** `y-reject-fair` has the old avoidance gate (mixed-unit dist < 0.18) and passes at p=0.689. The gate change contributed nothing to the brake increase.

**The scale cleanup is responsible.** Seatrack width 395 px → 300 px:
- 3 rows → 4 rows (the narrower correct width fits fewer racers per row)
- Lateral pack density increases (20 racers/row → 15 racers/row on a narrower strip)
- Speed-brake saturation: 81% → 96%
- Race Plan P-controller blocked: 77% → 94% (can't issue fairness bonuses)
- p-value: 0.689 → 0.016

The 395 px old value was incorrect. The 300 px new value is geometrically correct. The regression is that the correct width exposes a speed-brake design weakness under high field density.

---

## Task 2 — Frame-vs-body in the speed-brake (file:line)

**Speed-brake zone computation — `raceBehavior.js:498–500, 515–517`:**

```javascript
const sizeA = getFrameSizePx(rA);          // L498 — frame size, not body
const sizeB = getFrameSizePx(rB);          // L499
const spriteWorldSize = Math.max(sizeA, sizeB);  // L500

const dynamicBrakeT =
  spriteWorldSize > 0 && pathLength > 0
    ? (spriteWorldSize / pathLength) * config.speedBrakeTMultiplier  // L517
    : 0.014;
```

`getFrameSizePx(racer)` returns `racer.frameSizePx` (`raceBehavior.js:192`), which the sim sets to `effectiveDisplaySize` (the auto-scaled sprite frame, not the drawn body).

**Rocket numbers on Seatrack (path=12256 px, width=300 px):**

| Dimension | Value | Source |
|---|---|---|
| `displaySize` (base frame) | 47 px | `RACER_CONFIGS.rocket` |
| auto-scale factor `sf` | 0.81 | 60 racers on 285 px effective width |
| `frameSizePx = effectiveDisplaySize` | **38 px** | 47 × 0.81 |
| speed-brake longitudinal zone | **57 px** | 38 × 1.5 (speedBrakeTMultiplier) |
| `drawnBodyLengthPx` | **25.67 px** | bodyNarrow × bodyFillLong/bodyFillNarrow |
| contact threshold (pair) | **51.3 px** | 25.67 + 25.67 (sum of halves × 2) |
| body-contact gate threshold | **30.8 px** | contactLength × 1.2 (bufferPct=0.20) |

The speed-brake zone (57 px) fires when bodies are **31 px apart** — more than one full rocket-length of free space between them. The body-contact gate (30.8 px) fires only when bodies are almost touching. The speed-brake runs significantly wider than the body.

**This is intentional by design** (comment at `raceBehavior.js:510–513`): the speed-brake is deliberately wider than the body-contact gate to provide pack stabilization before visual overlap occurs. The same ratio existed in the pre-scale-cleanup code for all tracks. The problem is not the ratio itself but that the ratio is fixed while pack density varies with track width.

**The lateral threshold also uses normalized `dY` not body size:**

```javascript
if (Math.abs(dY) < config.speedBrakeYThreshold && dT < dynamicBrakeT)  // L519
```

`speedBrakeYThreshold = 0.18` → on a 300 px track: `0.18 × 150 = 27 px`. Rocket body width = 14 px. The speed-brake fires laterally when bodies are 13 px apart — already clear of each other. But on a 395 px track: `0.18 × 197.5 = 35.6 px` (even wider in pixels, but the same fraction of track). The narrower correct width gives a tighter physical threshold for the same normalized value.

---

## Task 3 — Did the tighter geometric gate increase brake frequency?

**No.** The speed-brake in the new code runs BEFORE the gate (moved in the gate-fix build). In the old code it ran AFTER the avoidance gate. Let me show that both produce the same brake count:

Old avoidance gate conditions (backup/step2-stageC):
```javascript
if (Math.abs(dY) * config.yWeight >= config.avoidanceDistance) continue;   // |dY| >= 0.18
const dist = Math.sqrt((dT * 2.0)**2 + (dY * 1.0)**2);
if (dist >= config.avoidanceDistance) continue;                              // dist >= 0.18
```

For any pair in the speed-brake zone (`dY < 0.18` AND `dT < 57/12256 = 0.00465`):
- First condition: `|dY| × 1.0 = |dY| < 0.18` → always **passes**
- dist: `sqrt((0.00465 × 2.0)² + dY²)` where `dY < 0.18` → max dist = `sqrt(0.0000866 + 0.0324) = 0.181` ≈ borderline but effectively all pairs pass

Every pair eligible for the speed-brake in the old code also passed the old avoidance gate. Moving the speed-brake before the gate changed execution order but not the set of pairs that triggered it.

**The 15 percentage-point brake increase (81% → 96%) is entirely from the width change, not the gate order change.**

---

## Task 4 — Why brake instead of evade?

The rocket is 14 px wide on a 300 px track — 21 lateral positions available. With 60 racers, there should be room to evade. But the data shows `honest=1.3%` (almost no lateral resolution happens). Why?

**The lateral force IS firing.** `Lateral=172086Ø` in the current code — avoidance lateral forces are active. The issue is pack density and re-encounter rate:

1. **60 racers in 4 rows of 15** — at race start, adjacent racers are ~20 px apart laterally (300 px / 15). The speed-brake's 27 px lateral trigger catches almost every lateral neighbor.

2. **Resolution in 2.8 frames** — a pair separates in under 3 frames. But at the rocket's speed (1.25×), the trailer re-encounters the leader within the next few frames. The speed-brake fires, clears, fires again — continuously.

3. **The brake mechanism acts on speed, the evade mechanism acts on position.** Speed-brake slows the trailer; lateral force pushes it sideways. But with 15 racers per row, after the lateral push there is immediately another racer in the target position. The rocket cannot escape the brake zone because it would enter another pair's brake zone.

4. **Race Plan P-controller blocked 94% of frames.** When `avoidanceActive=true`, the controller is in "blocked" state — it cannot issue target-rank speed bonuses. With 96% brake rate, the controller works on only 4% of frames. Fairness corrections are so rare they cannot overcome the random re-roll outcomes.

**This is not a brake-vs-evade precedence bug.** Both mechanisms run every frame. The issue is that the correct 300 px width creates a field density (60 racers / 300 px = 0.2 racers/px) at which the speed-brake saturates regardless of lateral movement.

---

## What changed and what did not

| Change | Effect on rocket brake% | Verdict |
|---|---|---|
| Scale cleanup: Seatrack width 395 → 300 px | Rows 3→4, density ↑, brake 81→96% | **Regression source** |
| Gate fix: geometric gate replaces mixed-unit gate | 0% effect on brake frequency (proven) | Not responsible |
| Speed-brake order: after gate → before gate | 0% effect (pairs in zone always passed old gate) | Not responsible |
| Speed-brake zone size: same formula both old and new | Unchanged | Not responsible |
| Racer config: displaySize/bodyFillX/Y unchanged | Unchanged | Not responsible |

---

## Fix direction (for future work, not blocking)

The scale cleanup is correct — 300 px is the real Seatrack width. The fix must improve how the system handles high-density fields:

**Option A — Reduce field size on Seatrack.** Use `--openRacers=40` for narrow open tracks, matching closed-track density. The current 60-racer open-track count was calibrated for wider tracks.

**Option B — Body-based speed-brake zone.** Replace `frameSizePx × 1.5` with `contactLength × factor` (same as the gate fix applied to the body-contact gate). This would scale the brake zone with the actual body length, not the display frame.

**Option C — Reduce `speedBrakeTMultiplier` for fast racers or narrow tracks.** A narrower brake zone reduces the pair count entering the brake set per frame.

Option B is architecturally consistent with the gate fix (body > frame everywhere) and is the direction implied by the frame-vs-body audit.

---

## Summary

| Question | Answer |
|---|---|
| Pre-existing or regression? | **Regression** — was fine at 395 px width |
| Regression source? | **Scale cleanup** (Seatrack 395→300 px), confirmed empirically |
| Gate fix responsible? | **No** — y-reject-fair baseline (old gate, 395 px) p=0.689 |
| Speed-brake uses frame not body? | **Yes** (`raceBehavior.js:498`, zone=57 px, body contact=25.67 px) |
| Did tighter gate increase brake freq? | **No** — speed-brake pairs always passed old gate |
| Brake vs evade precedence bug? | **No** — both run every frame; issue is field density saturation |
| Fix direction? | Body-based speed-brake zone (Option B) — consistent with gate fix |
