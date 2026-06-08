# Report 38 — Root Cause: Mixed-Unit Avoidance Gate Rejects Overlapping Pairs

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Diagnosis only. No build yet. Fix scope confirmed; review before building.

---

## Measured pair confirming root cause

```
Pair: Turbo / Nitro   (Space Sprint, 7 dragons, seed:1, PRE_PULK t=12.4s)
screenDist:  29.5 px    gate: ✗   ← VISUALLY TOUCHING, PHYSICS REJECTS
latPx:       25.0 px
longPx:      17.2 px
|dY|:  0.1664   dT:  0.0009
lhs: 0.0000     ths: 0.0000      (not reached — gate fires first)
overlaps: false   flRaw: 0/0
```

Turbo and Nitro are 29.5 px apart on screen — centers within one body width (28.5 px). The physics gate rejects them. Zero separation force is ever written.

---

## The broken gate — file:line

**[raceBehavior.js:465–467](../../client/src/modules/raceBehavior.js#L465)**:

```javascript
// L465 — pre-rejection: if lateral ALONE exceeds avoidanceDistance, skip
if (Math.abs(dY) * config.yWeight >= config.avoidanceDistance) continue;

// L466 — combined mixed-unit distance
const dist = Math.sqrt((dT * config.tWeight) ** 2 + (dY * config.yWeight) ** 2);

// L467 — gate: reject if combined dist ≥ avoidanceDistance
if (dist >= config.avoidanceDistance) continue;
```

**Running config values:** `yWeight = 1.0`, `tWeight = 2.0`, `avoidanceDistance = 0.1650` (tuned from default 0.18).

**Why Turbo/Nitro is rejected at L465 — the math:**

```
|dY| × yWeight = 0.1664 × 1.0 = 0.1664
avoidanceDistance = 0.1650
0.1664 ≥ 0.1650  →  CONTINUE (rejected immediately at L465)
```

The pair never reaches L466. The `dist` calculation and the overlap check are never run.

**The magnitude mismatch — why dY=0.1664 falsely reads as "far":**

In real-world pixels:
- Lateral distance: `0.1664 × (trackWidth/2) = 0.1664 × 150 = 25 px` — less than one body width (28.5 px)
- Longitudinal distance: `0.0009 × pathLength = 0.0009 × 19 772 = 17.8 px` — less than one body length (30.6 px)

These bodies ARE overlapping in real space. The gate says "no" because it treats `dY=0.1664` as a dimensionless normalized number and compares it directly against `avoidanceDistance=0.1650`.

**The unit incompatibility:**

When combined in the dist formula:
```
dT × tWeight  = 0.0009 × 2.0 = 0.0018   (longitudinal, raw t-space, amplified by tWeight)
dY × yWeight  = 0.1664 × 1.0 = 0.1664   (lateral, raw physicalY-space)
```

These two terms differ by 92×. But in actual pixels:
```
longPx = 17.8 px
latPx  = 25.0 px
```

They differ by only 1.4×. The metric weights the lateral component ~92× too heavily relative to real space. `tWeight=2.0` was meant to bring the axes into balance but the factor needed is `pathLength / (trackWidth/2) = 19772 / 150 = 131.8`, not 2.0.

---

## All four sites sharing this metric

All within the same contiguous block (L465–L483). There is **no shared helper** — the metric is inline:

| Line | Formula | Purpose |
|---|---|---|
| **465** | `\|dY\| × yWeight >= avoidanceDistance` | Pre-gate: reject if lateral alone out-of-range |
| **466** | `dist = sqrt((dT×tWeight)² + (dY×yWeight)²)` | Combined distance (mixed units) |
| **467** | `dist >= avoidanceDistance` | Gate: reject pair from all avoidance processing |
| **483** | `forceMag = lateralForce × (1 - dist/avoidanceDistance)` | Force magnitude decay |

These four lines are the only uses of `avoidanceDistance`, `tWeight`, and `yWeight` in the entire file. `isSideFree`, `sameLaneHH`, `pairHH`, `honestHalfSpan` — all use `pxToPhysicalY` or body-size thresholds, and are **not affected**.

---

## Why tWeight=2.0 doesn't fix it

`tWeight` was added to compensate for the unit mismatch but the required factor is ~131 (pathLength ÷ trackWidth/2), not 2. Even with `tWeight=131`, this compensates only for Space Sprint. On Dirt Oval (pathLength≈3300, trackWidth=98): the factor would be `3300 / 49 ≈ 67`. The ratio changes per track. There is no single `tWeight` constant that makes the formula correct across all tracks.

---

## The proposed fix — px-space nearness

Convert both axes to world pixels before combining:

```javascript
const pairTW = Math.max(getTrackWidthAtTpx(rA), getTrackWidthAtTpx(rB));
const pairPL = Math.max(getPathLengthPx(rA), getPathLengthPx(rB));

const latPx  = Math.abs(dY) * (pairTW / 2);
const longPx = dT * pairPL;
const distPx = Math.sqrt(latPx ** 2 + longPx ** 2);

if (distPx >= config.avoidanceDistancePx) continue;
// ...
const forceMag = config.lateralForce * (1 - distPx / config.avoidanceDistancePx);
```

`config.avoidanceDistancePx` replaces `avoidanceDistance + tWeight + yWeight`. It is a threshold in real world pixels.

**Verification — Turbo/Nitro:**
```
latPx  = 25.0 px
longPx = 17.2 px
distPx = sqrt(25² + 17.2²) = sqrt(625 + 296) = sqrt(921) = 30.3 px
```

For `avoidanceDistancePx = 85 px` (3 × body width ≈ 3 × 28.5 px):
- `30.3 < 85` → gate PASSES ✓
- `forceMag = 0.0114 × (1 − 30.3/85) = 0.0114 × 0.644 = 0.0073` → non-zero ✓
- `lateralHalfSpan = pxToPhysicalY(frameSizePx, trackWidth) = 81.4/150 = 0.543`
- `|dY| = 0.1664 < 0.543` → overlap check passes ✓
- `tHalfSpan = bodyLength/pathLength = 30.6/19772 = 0.001547`
- `dT = 0.0009 < 0.001547` → overlap check passes ✓
- `overlaps = true` → **free-lane separation fires** ✓

**What the corrected path produces:**
Both sides of the pair enter the free-lane block, `isSideFree` checks run, `dirA/dirB` assigned via `stablePairBit`, `flRawA` and `flRawB` become non-zero, and the separation force is applied.

---

## Steering and fairness — untouched

The avoidance gate change affects ONLY lines 465–467 and 483. The following are independent and unchanged:
- **Avoidance direction** (`pushDir = yDiff >= 0 ? 1 : -1`, L626) — which direction to push
- **Home force** (toward centerline, L713–758) — target position
- **Stage B committed direction** (L757–835) — long-term side choice
- **Stage D gap force** (L821–848) — clearance push
- **brakeMatch / brakeMatchFactor** — speed control
- **t-position / finishT** — race fairness logic

None of these use `avoidanceDistance`, `tWeight`, or `yWeight`.

The `lateralScale = REFERENCE_TRACK_WIDTH / pairTrackWidth` (L476–480) that modulates force strength remains. Since `avoidanceDistancePx` is now defined in real pixels, `lateralScale` could potentially be retired (the px metric already normalizes by track width), but that's a separate question for after we confirm the gate fix works.

---

## Config migration note

Current config fields become:
- `avoidanceDistance: 0.18` → **`avoidanceDistancePx: 85`** (approx 3× body width at N=40)
- `tWeight: 2.0` → **retired** (no longer needed; ratio baked into px conversion)
- `yWeight: 1.0` → **retired** (same)

The `avoidanceDistancePx` default needs calibration. Candidate: `3 × drawnBodyWidthPx` computed at race init and stored per-racer. Or a fixed px value calibrated against Dirt Oval (where the system was known to work): Dirt Oval body at N=40 ≈ 28.5 px, existing threshold ≈ 0.18 × 49 = 8.8 px lateral — that seems too small. The current system was probably working on Dirt Oval because bodies are smaller (same 28.5 px body, 49 px half-track → body/half-track = 0.58; on Space Sprint: body/half-track = 28.5/150 = 0.19 — bodies are a much smaller fraction of the track width, so the same normalized threshold excludes more of the real separation range).

A reasonable starting point: `avoidanceDistancePx = 3 × frameSizePx` (3 frame widths, ≈ 244 px for dragon N=7 or 122 px for N=40). Or measure empirically after the gate fix confirms separation fires.

---

## Summary

| | Before fix | After fix |
|---|---|---|
| Gate metric | `sqrt((dT×tWeight)² + (dY×yWeight)²)` — mixed units | `sqrt(latPx² + longPx²)` — px-space |
| Threshold | `avoidanceDistance = 0.165` (physicalY-space, track-width-dependent) | `avoidanceDistancePx` in real pixels |
| Turbo/Nitro (29.5px apart, bodies touching) | Gate ✗ (rejected at pre-gate: 0.1664 ≥ 0.1650) | Gate ✓ (30.3 < 85) |
| Force for touching pair | 0 (never computed) | 0.0073 × lateralScale |
| `isSideFree`, `sameLaneHH`, steering | Unchanged | Unchanged |
