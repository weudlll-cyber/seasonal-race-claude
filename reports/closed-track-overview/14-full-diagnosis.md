# Full Diagnosis: Axis Mapping, Lateral Overlap, and Sim Validity

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Scope:** Q1–Q8 fresh from code, no reuse of prior partial explanations. No code changed.

---

## Q1 — Axis mapping (render and physics)

### Render path

`drawRacer` ([SpriteRacerType.js:239–263](client/src/modules/racer-types/SpriteRacerType.js#L239)) applies two rotations before drawing:

```javascript
ctx.rotate(angle);                          // heading: aligns the sprite with direction of travel
// ...
ctx.rotate(cfg.baseRotationOffset);         // = Math.PI / 2 (line 79)
ctx.drawImage(drawable, ..., -dw/2, -dh/2, dw, dh);  // line 235
```

`ctx.rotate(Math.PI / 2)` in the HTML5 Canvas 2D API rotates **clockwise** (positive = CW per MDN). After a CW 90° rotation from the travel-direction frame:

| Sprite dimension | Mapped to world direction | axis name |
|---|---|---|
| `frameWidth` (horizontal in spritesheet, extent = `dw`) | **perpendicular to travel** = side-to-side | **LATERAL** |
| `frameHeight` (vertical in spritesheet, extent = `dh`) | **along travel** = front-to-back | **LONGITUDINAL** |

This is confirmed by `sim-fairness.mjs:478–482` which independently makes the same assignment:

```javascript
const bodyDiameterX = displaySize * bodyFillX;   // used for overlapThreshold_y → LATERAL
const bodyDiameterY = displaySize * bodyFillY;   // used for overlapThreshold_t → LONGITUDINAL
const overlapThreshold_t  = 0.10 * bodyDiameterY / pathLengthPx;   // t = path dimension
const overlapThreshold_y  = 0.10 * bodyDiameterX / geometricTrackWidth; // Y = lateral
```

The sim treats `bodyFillX` as the **lateral** fill and `bodyFillY` as the **longitudinal** fill. Both the render path and the sim are consistent.

### Is the mapping stable across track orientations?

Yes. The sprite always rotates by `angle + Math.PI/2` ([SpriteRacerType.js:234,243](client/src/modules/racer-types/SpriteRacerType.js#L234)). `angle` is the racer's heading, which tracks the path direction at every point. The extra `Math.PI/2` offset is fixed for all tracks. `frameWidth` is always lateral and `frameHeight` is always longitudinal, regardless of how the track curves.

### Verdict: user's hypothesis is correct

`bodyFillX` = **LATERAL** (side-to-side / wingspan), `bodyFillY` = **LONGITUDINAL** (direction of travel / fuselage length). Confirmed by both independent code paths above.

---

## Q2 — Does physics use separate axes or a single combined distance?

Physics uses a **single value** — `spriteWorldSizePx` ([raceBehavior.js:274–301](client/src/modules/raceBehavior.js#L274)):

```javascript
const spriteWorldSize = Math.max(sizeA, sizeB);   // raceBehavior.js:274
// ...
const dynamicBrakeT  = (spriteWorldSize / pathLength) * config.speedBrakeTMultiplier;   // 288
const lateralHalfSpan = spriteWorldSize / trackWidth;   // 299
const tHalfSpan       = spriteWorldSize / pathLength;   // 300
const overlaps = dT <= tHalfSpan && Math.abs(dY) <= lateralHalfSpan;   // 301
```

`spriteWorldSizePx = physSlot = computeRacerLayout(effectiveWidth, N, displaySize).spriteSize` — the **frame size** from the auto-scaler. No per-axis `bodyFillX` or `bodyFillY` enters the physics at any point. The collision footprint is a **square** `physSlot × physSlot` in world-px.

---

## Q3 — Which axis did the sizing rebuild normalize, and is it the lateral one?

The rebuild normalizes on `bodyFillNarrow = min(bodyFillX, bodyFillY)` ([SpriteRacerType.js:211](client/src/modules/racer-types/SpriteRacerType.js#L211)).

For **all 20 current racer types**, `bodyFillX ≤ bodyFillY` (verified by enumeration — duck is the only equal case at 0.875/0.875). Therefore `bodyFillNarrow = bodyFillX` = the **LATERAL** fill for every racer.

The sizing rebuild normalized the **lateral axis**. The user's worry that "the lateral extent may be uncontrolled" is **unfounded** — the lateral axis IS the narrow one and IS the axis being controlled by the normalization.

What is **not** controlled is the longitudinal extent: `bodyFillY / bodyFillX × bodyNarrow_ref`. This is the LONG axis and is larger than `bodyNarrow_ref` for every racer except duck. The rendered longitudinal body can exceed the physics slot (see Q4).

---

## Q4 — Lateral overflow: plane vs rocket, N = 40 / 50 / 60

For each case the rendered body has two components:
- **Lateral body** = `bodyNarrow_ref` on branch; `physSlot` on master
- **Longitudinal body** = `(bodyFillY/bodyFillX) × bodyNarrow_ref` on branch; `(bodyFillY/bodyFillX) × physSlot` on master
- **physSlot** is the physics avoidance slot in both lateral and longitudinal directions

### Space Sprint × plane (bfX=0.836, bfY=0.930, ratio=1.112)

| N | physSlot | rpr | bodyNarrow_ref | lat_br | long_br | lat_mst | long_mst | lat_ov_br | long_ov_br | lat_ov_mst | long_ov_mst |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 40 | 42.7 px | 20 | 28.5 px | 28.5 | **31.7** | 42.7 | **47.5** | 0.0 px | 0.0 px | 0.0 px | **4.8 px** |
| 50 | 34.1 px | 25 | 33.5 px | 33.5 | **37.3** | 34.1 | **38.0** | 0.0 px | **3.2 px** | 0.0 px | **3.8 px** |
| 60 | 28.4 px | 30 | 28.5 px | 28.5 | **31.7** | 28.4 | **31.6** | 0.1 px | **3.3 px** | 0.0 px | **3.2 px** |

### Space Sprint × rocket (bfX=0.278, bfY=0.801, ratio=2.881)

| N | physSlot | rpr | bodyNarrow_ref | lat_br | long_br | lat_mst | long_mst | lat_ov_br | long_ov_br | lat_ov_mst | long_ov_mst |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 40 | 42.7 px | 20 | 14.3 px | 14.3 | **41.1** | 42.7 | **122.9** | 0.0 px | 0.0 px | 0.0 px | **80.2 px** |
| 50 | 34.1 px | 25 | 11.4 px | 11.4 | **32.8** | 34.1 | **98.3** | 0.0 px | 0.0 px | 0.0 px | **64.2 px** |
| 60 | 42.7 px | 20 | 9.5 px | 9.5 | **27.4** | 42.7 | **122.9** | 0.0 px | 0.0 px | 0.0 px | **80.2 px** |

*(rocket at N=60 has rpr=20 / rows=3 because displaySize=47 yields a different staircase than plane's displaySize=42.)*

### Key findings

**Lateral overflow is near-zero everywhere.** Across all tested (N, racer) combinations, the lateral body is within 0.1 px of the physics slot on the branch and exactly equal on master. The axis correctly controlled by `bodyFillNarrow` is the lateral one.

**Longitudinal overflow exists on BOTH branches, for plane.** At N=50/60, both branch (~3.2–3.3 px) and master (~3.2–3.8 px) show identical-magnitude longitudinal overflow. No regression.

**Branch is better at N=40.** Master has 4.8 px longitudinal overflow at N=40 (plane); branch has 0 px because `bodyNarrow_ref` is normalized to W_REF=285 and is smaller than physSlot=42.7 px.

**For rocket, branch is dramatically better.** Master renders a 122.9 px longitudinal body in a 42.7 px physics slot — **80.2 px overflow**. Branch renders 27.4–41.1 px (fits). The body-narrow normalization almost completely eliminates rocket stacking.

### Correction to reports 12 and 13

Reports 12 and 13 computed `bodyNarrow × (bodyFillY / bodyFillX)` and labelled it `bLat` (lateral wide body). This is **incorrect**: that expression is the **longitudinal** body. The actual lateral body = `bodyNarrow_ref`. Reports 12/13 identified the right numbers but assigned them to the wrong axis. The overflow they found (3.3 px) is **longitudinal**, not lateral, and it exists on master too (3.2 px). The "cap" proposed in report 13 would constrain the longitudinal body, not the lateral one — which is already under control.

---

## Q5 — Scope: are the physics and the original sweep valid?

### What the physics actually uses

The physics ([raceBehavior.js:274–301](client/src/modules/raceBehavior.js#L274)) uses **only `spriteWorldSizePx = physSlot`** — the frame size from `computeRacerLayout`, a single scalar. No `bodyFillX` or `bodyFillY` values enter the collision or avoidance logic. The physics models a square `physSlot × physSlot` footprint.

This was true before the rebuild and has not changed (confirmed by `git diff master HEAD -- client/src/modules/raceBehavior.js` = empty). The square-footprint model has always existed.

The structural consequence (longitudinal rendered body > physics slot) is a **pre-existing design characteristic**, not a regression. Both branches have ~3.2–3.3 px longitudinal overflow at N=50–60 for plane. The branch reduced longitudinal overflow for rocket from ~80 px to ~0 px.

### Was the sweep run with correct geometry?

The fairness sweep (`sim-fairness.mjs`) uses `spriteWorldSizePx = effectiveDisplaySize` ([sim-fairness.mjs:334](scripts/sim-fairness.mjs#L334)) — the same physSlot the browser physics uses — and calls the same `computeRacerLayout` function. The sim and browser physics are using **identical geometry** for collision/avoidance decisions.

The `bodyFillX` / `bodyFillY` values appear only in the **overlap metric thresholds** ([sim-fairness.mjs:479–482](scripts/sim-fairness.mjs#L479)):

```javascript
const bodyDiameterX = displaySize * bodyFillX;   // unscaled, metric only
const bodyDiameterY = displaySize * bodyFillY;   // unscaled, metric only
const overlapThreshold_t  = 0.10 * bodyDiameterY / pathLengthPx;
const overlapThreshold_y  = 0.10 * bodyDiameterX / geometricTrackWidth;
```

These thresholds are used for the `liteOverlapRate` metric — they do not affect the race simulation or the win-rate statistics. The fairness measurement (row-0 win rate, χ² test) is driven by position outcomes, not the overlap metric.

### Verdict on scope

**The physics and the sweep use the same geometry. The sweep is valid. No re-run is needed.**

- The fairness metric (win rate by start row) is not affected by rendered body extent.
- The visual stacking (longitudinal body > physics slot) is a render/physics mismatch that predates the rebuild and does not bias outcomes.
- The branch worsened nothing and improved rocket stacking significantly.
- A render-side fix (cap longitudinal body to physSlot) is sufficient — no physics or sweep changes required.

---

## Q6 — Pulk vs overflow separation

For Space Sprint × plane in a 30s race, with the rubber-band active:

| N | pulkTime | long_ov_branch | On-screen long_ov | Cause of visible stacking |
|---|---|---|---|---|
| 40 | 99.6% | 0.0 px | 0 px | **100% pulk** — legitimate pack density, no body overflow |
| 60 | 99.9% | 3.3 px | ≈3.2 px | **~97% pulk, ~3% overflow** — pulk is dominant |

In a 30s Space Sprint race, `finishT = 0.228` — racers travel only 22.8% of the 19 772 px path. The entire field races within a ~4500 px stretch. The rubber-band catch-up keeps trailing racers near the leader's speed. At 99.6%+ pulk, all N racers are in the same visual region continuously. Even with perfectly non-overlapping physics positions, the camera shows a dense mass of sprites occupying a small fraction of a long track.

The longitudinal overflow (3.3 px per adjacent pair in T) adds a small real visual stacking effect, but it is minor relative to the pack density effect. The "far more than 3px" visual impression the user describes is primarily the pack: 20–30 planes per row, each 31.7 px wide body in a camera field of view a few hundred screen-pixels wide, with ~28px lateral gaps between them, looks like a dense overlapping crowd at any zoom level.

---

## Q7 — Dead zone (carry-over from report 11)

The dead zone (where `lateralHalfSpan > avoidanceDistance`) exists at **low N on wide tracks**, specifically when `physSlot / trackWidth > avoidanceDistance = 0.18`. For Space Sprint × plane:

- N=9: `physSlot = 94.8 px`, `lateralHalfSpan = 0.211 > 0.180` → dead zone present
- N=20+: `physSlot ≤ 42.7 px`, `lateralHalfSpan ≤ 0.095 < 0.180` → no dead zone

This is independent of the axis mapping, body-fill values, or render size. It lives entirely in the physics ([raceBehavior.js:253](client/src/modules/raceBehavior.js#L253)): the `if (dist >= config.avoidanceDistance) continue` guard gates the free-lane separation code, so at N=9 the free-lane separation cannot fire in the dead zone even though racers are physically overlapping.

**Interaction with Q1–Q5:** none. The dead zone is a threshold comparison between `physSlot` (frame size, unchanged by rebuild) and `avoidanceDistance` (config constant, unchanged). Fixing the dead zone requires either:
- Moving the free-lane separation before the `continue` guard, or
- Making `avoidanceDistance` track-width-aware

Either fix is isolated to `raceBehavior.js` and does not interact with render sizing, axis normalization, or the fairness sweep.

---

## Q8 — Metric blind spots

### What `liteOverlapRate` actually measures

`liteOverlapRate` fires when `|dT| < 0.10 × bodyFillY × displaySize / pathLength` **AND** `|dY| < 0.10 × bodyFillX × displaySize / trackWidth` simultaneously ([sim-fairness.mjs:481–482,903–906](scripts/sim-fairness.mjs#L481)). For plane on Space Sprint: lateral threshold ≈ 3.5 px center gap, longitudinal threshold ≈ 0.4 px center gap.

Physics keeps centers at least `physSlot = 28.4 px` apart (at N=60). The sim always shows 0% because physics never allows centers within 3.5 px of each other. The sim is measuring "hard center-to-center collision" not "rendered body overlap."

The metric is also not emitted for closed tracks.

### What an overlap/avoidance check must measure to catch the problems found here

| Problem | What to check | Expression |
|---|---|---|
| **Longitudinal render overflow** | rendered long body > physics slot | `(bfY/bfX) × bodyNarrow_ref > physSlot` |
| **Lateral render overflow** | rendered lat body > physics slot | `bodyNarrow_ref > physSlot` (currently ≈0) |
| **Dead zone** | lateralHalfSpan > avoidanceDistance | `physSlot / trackWidth > avoidanceDistance` |
| **W_REF rpr mismatch** | render rpr ≠ physics rpr → wrong body reference | `rpr_ref(W_REF) ≠ rpr_phys(EW)` |
| **Closed-track overlap** | no coverage at all currently | add liteOverlapRate to closed-track sim path |

For the longitudinal overflow specifically: a direct assertion in a rowLayout test would be `(bfY/bfX) × computeBodyNarrowRef(W_REF, N, ds, bfX, cfg).bodyNarrow ≤ computeRacerLayout(EW, N, ds, cfg).spriteSize`. This fires for master at plane N=40 (47.5 > 42.7) and for rocket at any N > ~10 (122.9 >> 42.7).

---

## Plain-language bottom line

**What causes the on-screen plane stacking:**

Primarily rubber-band **pulk** (99.6–100% of the race, all planes travel in a tight cluster because the path is long but the 30s race only covers 22.8%). The cluster is visually dense regardless of body overflow. Secondarily, a mild **longitudinal body overflow** of 3.3 px (branch) / 3.2 px (master) per adjacent pair — racers' rendered fuselages slightly overlap the trailing racer's nose when at minimum physics separation. This overflow is essentially identical on both codebases; the rebuild did not introduce it and in fact reduced it (from 4.8 px to 0 px at N=40, and from 80+ px to ~0 px for rocket at all N).

**Are the sims valid?** Yes. The physics and the fairness sweep use the same geometry (`physSlot` = frame size, square footprint). The `liteOverlapRate` metric has a blind spot (measures center proximity rather than body extent), but this does not affect fairness outcomes. **No re-run of the 8-parameter sweep is needed.**

**Full list of fixes needed, ranked:**

| Fix | Type | Safe to ship without sim re-run? |
|---|---|---|
| 1. Cap longitudinal render body: `long ≤ physSlot` — constrains the actual overflow axis | Render-only | Yes |
| 2. Fix W_REF rpr mismatch correction (report 12/13 cap was on wrong axis; redo pointing at longitudinal body) | Render-only | Yes |
| 3. Dead-zone fix: move free-lane separation before the avoidance-distance guard in `raceBehavior.js` | Physics | Need partial sweep re-run to confirm separation behavior at low N is acceptable |
| 4. Add longitudinal-overflow metric to sim and closed-track overlap coverage | Sim metrics | No ship impact — additive |

Fixes 1–2 are render-only and do not affect any physics outcome or fairness metric. Fix 3 touches `raceBehavior.js` and would change low-N avoidance behavior — a targeted sweep at the affected regime (Space Sprint × plane × N=9, wide tracks, low N) is sufficient to validate it; the full 8-parameter sweep does not need to be repeated. Fix 4 is metrics infrastructure only.
