# Source Fault: Why the Overtaking Racer Passes Through the Leader

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Source files:** `client/src/modules/raceBehavior.js`, `client/src/screens/RaceScreen/index.jsx`
**Supporting data:** reports 01–03 in this series; `scripts/diag-comeback-overlap.mjs`
**Method:** Deep source trace + value computation for dragon (wide) and rocket (narrow)
**Status:** Read-only investigation. No code changes. Hypotheses labeled where un-confirmed by live sim.

---

## 1. The Overtaking Code Path — Step by Step

When racer T (trailer, lower t) approaches racer L (leader, higher t), here is the
complete path through `applyRacerBehavior` each frame.

### Gate 0 — Pair eligibility (anisotropic proximity filter)

**File:Line:** `raceBehavior.js:248–253`

```js
let dT = Math.abs(rA.t - rB.t);
if (dT > 0.5) dT = 1 - dT;
const dY = rA.physicalY - rB.physicalY;
const dist = Math.sqrt((dT * config.tWeight) ** 2 + (dY * config.yWeight) ** 2);
if (dist >= config.avoidanceDistance) continue;   // ← skip if outside zone
```

`tWeight=2.0`, `yWeight=1.0`, `avoidanceDistance=0.18`.
Only pairs where `sqrt((dT×2)² + dY²) < 0.18` receive any processing at all.
For a directly-behind approach (dY ≈ 0), this means `dT < 0.09` — about 12 average racer
spacings on Space Sprint (avg spacing ≈ 0.0073 t-units at 60 racers, finishT=0.436).

### Gate 1 — Force magnitude

**File:Line:** `raceBehavior.js:264`

```js
const forceMag = config.lateralForce * (1 - dist / config.avoidanceDistance);
```

Proximity-scaled: full `lateralForce` at dist=0, decays linearly to 0 at `avoidanceDistance`.
Track-width scaling (`lateralScale`) is applied to the main avoidance push (line 373) but
**not** to the free-lane push (lines 349–354). The free-lane push is therefore unscaled and
proportionally stronger than the avoidance push on wide tracks.

### Step 2 — Speed brake (FIRST thing evaluated inside the pair loop)

**File:Line:** `raceBehavior.js:287–293`

```js
const dynamicBrakeT =
  spriteWorldSize > 0 && pathLength > 0
    ? (spriteWorldSize / pathLength) * config.speedBrakeTMultiplier
    : 0.014;
if (Math.abs(dY) < config.speedBrakeYThreshold && dT < dynamicBrakeT) {
  speedBrakeSet.add(trailer.index);     // ← trailer flagged for braking
}
```

Fires on the **trailer only** when both:
- `|dY| < speedBrakeYThreshold` (= 0.18 in physicalY units)
- `dT < (spriteWorldSize / pathLength) × 1.5` (= 0.002883 for dragon on Space Sprint)

The flag `avoidanceActive` is set from this set at `raceBehavior.js:514`:
```js
r.avoidanceActive = speedBrakeSet.has(r.index);
```

**The brake is applied in `index.jsx:908–913`:**
```js
const effectiveBrakeFactor = computeEffectiveBrakeFactor(
  behaviorConfig, isOpenTrack, physicsTs
);
const brake = r.avoidanceActive ? effectiveBrakeFactor : 1.0;
```
Then at `index.jsx:916–924`:
```js
r.t = Math.min(r.t + r.baseSpeed * boost * brake * r.trajectoryMult *
               r.areaBonusMult * r.rubberBandMult, st.finishT + 0.001);
```

`effectiveBrakeFactor = 0.945` (after warmup). **There is no reference to leader speed anywhere
in this path.** The 5.5% reduction is applied blindly regardless of the speed differential
between T and L.

### Step 3 — Free-lane lateral separation (SECOND, only inside sprite overlap)

**File:Line:** `raceBehavior.js:298–362`

```js
const lateralHalfSpan = spriteWorldSize / trackWidth;   // = 38/300 = 0.1267
const tHalfSpan       = spriteWorldSize / pathLength;   // = 38/19772 = 0.001922
const overlaps = dT <= tHalfSpan && Math.abs(dY) <= lateralHalfSpan;
if (overlaps) { ...isSideFree checks... dirA/dirB... yFreeLaneDeltas... }
```

The free-lane push fires a deterministic lateral impulse on each racer in the overlap pair,
choosing direction via `isSideFree` left/right checks plus a stable hash tie-break. This is
the **only** lateral response that fires when two racers are at the same physicalY (dY ≈ 0).

### Step 4 — Main avoidance push (ZERO when same lane)

**File:Line:** `raceBehavior.js:368–369`

```js
const yDiff = trailer.physicalY - leader.physicalY;
if (Math.abs(yDiff) < 1e-6) continue;   // ← EXITS — zero push when same physicalY
```

When the trailer is directly behind the leader (same lane, `|dY| < 1e-6`), the main avoidance
push is unconditionally skipped. No lateral force accumulates in `yAvoidDeltas` for this pair.
The **only** lateral response for a same-lane approach is the free-lane push (Step 3).

### Step 5 — Home force, damping, position update

**File:Line:** `raceBehavior.js:425–513`

Home force springs the racer back toward physicalY=0. Lateral velocity is damped by
`lateralDamping = 0.16` each frame: `velocity = (velocity + delta) × 0.16`. The low damping
constant means lateral displacement accumulates slowly — each frame's impulse retains only 16%
to the next frame, so steady-state lateral velocity ≈ `0.16/0.84 × forceMag ≈ 0.19 × forceMag`.

---

## 2. The Fault — Precise Code-Level Finding

### Primary fault: The brake is a blind fixed %, not a leader-speed cap

**File:Line:** `raceBehavior.js:287–293` (brake engagement) + `index.jsx:908–913` (application)

The brake applies `speedBrakeFactor = 0.945` to the trailer's speed, unconditionally. The code
has no reference to the leader's speed. There is no computation of `leaderEffectiveSpeed`. There
is no check of whether the trailer's braked speed is still above the leader's speed. The brake
flag is binary: braked or not. The reduction is fixed: always 5.5%.

**Expected design:** Brake such that `trailer.effectiveSpeed ≤ leader.effectiveSpeed`, and hold
that constraint until a lateral gap opens. This would require computing the leader's current
effective speed (baseSpeed × spreadFactor × trajectoryMult × rubberBandMult × draftingBoost)
for each trailer–leader pair and deriving a per-pair brakeFactor from that. No such computation
exists in the codebase.

This is a design gap, not a bug in the existing computation. The existing code correctly
implements a "soft deceleration hint" (5.5% reduction = "slow down a bit"). It does not
implement "match the leader's speed and hold."

### Secondary fault: Lateral avoidance is reactive, not proactive, for same-lane approach

**File:Line:** `raceBehavior.js:368–369` (zero push when same lane) + `raceBehavior.js:298–301`
(free-lane zone starts at `dT < 0.001922`, smaller than brake zone `dT < 0.002883`)

For a trailer approaching directly behind the leader (same physicalY, `|yDiff| < 1e-6`):
- Brake fires at `dT < 0.002883`
- Free-lane lateral push fires at `dT < 0.001922`
- In the window `0.001922 < dT < 0.002883`: **brake fires, zero lateral push**

The lateral response comes AFTER the trailer is already within 1 sprite-length of the leader.
The expected design — lateral avoidance attempted FIRST — is not implemented for a direct-behind
approach. Instead, the sequence is: brake first (only longitudinal), lateral second (after
sprite-box overlap). For a fast-approaching trailer, the order matters: if the trailer is
significantly faster, the 5.5% brake cannot prevent it from reaching the free-lane zone before
any lateral separation occurs.

### Tertiary fault (dragon-specific): Honest overlap extends beyond the free-lane zone laterally

**File:Line:** `raceBehavior.js:299` (`lateralHalfSpan = spriteWorldSize/trackWidth`) vs.
`sim-fairness.mjs:497–498` (`honestBodyLat = effectiveDisplaySize × bodyFillX`)

For dragon on Space Sprint:
```
Free-lane fires for:    |dY| <= 38/300       = 0.1267  physicalY
Honest overlap fires at: |dY| < 38×0.836/150  = 0.2118  physicalY
```

The honest overlap zone is **67% wider laterally** than the free-lane zone. A racer displaced
to `|dY| = 0.15` has exited the free-lane zone but is still inside dragon's honest-overlap zone.
Once outside the free-lane zone, the only remaining lateral response is the main avoidance push
— which requires `|yDiff| >= 1e-6` (line 369) and is scaled by the anisotropic distance (weaker
as dY grows, stronger at close dT). The brake's lateral gate (`|dY| < 0.18`, line 291) is also
exceeded at 0.2118, leaving the outer 15% of dragon's body with zero speed-brake engagement.

This is an amplifier on top of the primary fault: for a wide-body racer, even after the trailer
has been displaced by the free-lane push to partially exit the free-lane zone, honest overlap
persists into a region with no free-lane force, weak avoidance force, and no brake.

---

## 3. Value Trace — Does This Fault Produce "Passes Through"?

### Setup values (Space Sprint, 60 racers, LF=0.0228 current probe default)

From diagnostic and code:
```
finishT              = 0.436
effectiveDisplaySize = 38 px
pathLengthPx         = 19772 px
trackWidth           = 300 px
spreadFactor range   ≈ [0.919, 1.082] (BS_MIN/MEAN to BS_MAX/MEAN)
baseSpeed_mean/frame ≈ 0.436 / (62.5 × 60 × 0.922 × 1.1) = 1.14e-4 per frame (dragon)
```

### Case A — Dragon (wide body, bfX=0.836)

**Pair: fast trailer (sf=1.082) vs slow leader (sf=0.919), same lane (dY=0)**

Effective speeds per frame (after warmup, no rubber band):
```
leader speed   = 0.919 × 1.14e-4 = 1.048e-4 t-units/frame
trailer speed  = 1.082 × 1.14e-4 = 1.234e-4 t-units/frame
approach rate  = (1.234 - 1.048)e-4 = 1.86e-5 t-units/frame
```

Braked trailer: `1.082 × 0.945 × 1.14e-4 = 1.166e-4`
Braked approach: `(1.166 - 1.048)e-4 = 1.18e-5` — **still closing in at 63% of original rate**.

Speed ratio braked trailer / leader: `1.166 / 1.048 = 1.113` — trailer is still **11.3% faster**.

The brake cannot stop the approach. It only slows it.

**Zone traversal times (frames) at braked approach rate 1.18e-5:**

```
Brake zone enters (dT < 0.002883) — no lateral force yet (same lane)
  → brake fires, approach continues at 1.18e-5 per frame

Free-lane zone enters (dT < 0.001922) — first lateral push
  Window dT = 0.002883 → 0.001922 = 0.000961 t
  Time in brake-only zone: 0.000961 / 1.18e-5 ≈ 81 frames (1.3 s, zero lateral push)

Honest overlap zone enters (dT < 0.001726):
  Pre-overlap free-lane window = 0.001922 - 0.001726 = 0.000196 t
  Time with free-lane but no overlap: 0.000196 / 1.18e-5 ≈ 17 frames

Racer traverses leader body completely (dT = 0.001726 → 0):
  Time fully inside honest overlap: 0.001726 / 1.18e-5 ≈ 146 frames (2.3 s)
```

**Lateral displacement after 17 pre-overlap frames of free-lane push:**

`forceMag ≈ 0.0228 × (1 - 0.003/0.18) ≈ 0.0224` (at dT≈0.0018, dY≈0)
Steady-state lateral velocity ≈ `0.16/0.84 × 0.0224 = 0.00427` physicalY/frame
Displacement after 17 frames: `~0.036` physicalY (ramp-up phase, not yet at steady state)

To escape dragon honest-overlap zone: needs `0.2118` displacement.
To escape free-lane zone: needs `0.1267` displacement.
After 17 frames: `0.036` — **less than 30% of what's needed to exit free-lane zone**.

**Honest overlap fires.** The trailer enters the honest-overlap zone while still
within `|dY| ≈ 0.036` — well inside dragon's 0.2118 lateral body extent. Lateral separation
continues during the 146-frame overlap period, but it is fighting a 67%-wider target zone and
a decaying forceMag as distance grows.

*[CERTAIN: the arithmetic above is exact given the input values. HYPOTHESIS on time-to-separation:
the estimate of ~146 frames per pass is an upper bound; in practice the approach rate is not
constant (force fields shift the relative positions), and multiple neighbors contribute.
The live diagnostic measured average resolution of 25.3 frames at LF=0.0228, consistent with
the push working faster than the single-pair estimate because forceMag is non-zero even at
the outer edges and multiple pairs compound the push.]*

**The fault reproduces the symptom for dragon.** The trailer enters honest overlap because
the 5.5% brake cannot match the 11.3%-faster speed differential, and lateral push accumulates
only ~0.036 physicalY in the 17 pre-overlap frames — leaving the racer squarely inside the
0.2118 overlap zone when dT crosses the threshold.

---

### Case B — Rocket (narrow body, bfX=0.278)

Rocket: `speedMultiplier=1.25`, `displaySize=47`, `bfX=0.278`, `bfY=0.801`.
Auto-scale on Space Sprint with 60 racers produces the same `effectiveDisplaySize=38`
(auto-scale is track+N-determined, not racer-type-determined for same N).

Honest-overlap geometry for rocket:
```
honestBodyLong_t  = 38 × 0.801 / 19772 = 0.001538  (in t-units)
honestBodyLat_dY  = 38 × 0.278 / 150   = 0.0704    (in physicalY)
freeLane lateralHalfSpan = 38/300      = 0.1267    (in physicalY)
```

**For rocket, the honest overlap lateral zone (0.0704) is entirely INSIDE the free-lane zone
(0.1267).** There is no 15% outer gap: any honest-overlap pair is also inside the free-lane
zone and receives lateral push. This is structurally different from dragon.

Rocket base speed per frame (1.25× faster type):
```
baseSpeed_mean/frame ≈ finishT_rocket / (62.5 × 60 × expectedMinSF × 1.25)
```
finishT_rocket ≈ (0.001045/9.886) × 1.25 × 62.5 × 60 = min(0.495, 0.95) = 0.495

```
baseSpeed_mean/frame ≈ 0.495 / (62.5 × 60 × 0.922 × 1.25) = 1.14e-4 × (1.25/1.10) ≈ 1.295e-4
Fast trailer (sf=1.082): 1.082 × 1.295e-4 = 1.401e-4
Slow leader  (sf=0.919): 0.919 × 1.295e-4 = 1.190e-4
Approach rate: (1.401 - 1.190)e-4 = 2.11e-5
Braked approach: (1.082 × 0.945 - 0.919) × 1.295e-4 = 0.1035 × 1.295e-4 = 1.34e-5
Braked trailer/leader ratio: (1.082×0.945) / 0.919 = 1.113 — same ratio as dragon
```

Zone traversal for rocket:
```
Free-lane zone enters at dT < 0.001922 (same, sprite-size determined)
Honest overlap enters at dT < 0.001538

Pre-overlap free-lane window = 0.001922 - 0.001538 = 0.000384 t
Frames in pre-overlap zone: 0.000384 / 1.34e-5 ≈ 29 frames
```

Lateral displacement after 29 pre-overlap frames:
`forceMag ≈ 0.0224` (same computation, same track/racer geometry)
Displacement after 29 frames: `~0.082` physicalY (extrapolating ramp from 17-frame estimate)

To escape rocket honest-overlap zone: needs `0.0704` displacement.
After 29 frames: `0.082` — **this exceeds the 0.0704 threshold**.

*[HYPOTHESIS: for rocket, 29 frames of pre-overlap free-lane push may be enough to escape
honest overlap before the threshold is crossed — the lateral zone is narrow enough that the
push can clear it. This would mean rocket does NOT exhibit the same pass-through for a direct
same-lane approach, or exhibits shorter overlap durations. Not yet confirmed by live run.]*

**For rocket, the primary fault is still the fixed-% brake** (11.3% speed excess survives braking
regardless of racer type), but the LATERAL fault does not compound it: the honest-overlap zone
is inside the free-lane zone, so rocket gets lateral push throughout the overlap window and the
geometry may self-correct faster. The visible "pass-through" for rocket is therefore expected to
be shorter (fewer frames) or rarer — but not eliminated, since the brake still cannot prevent the
trailer from entering rocket's (narrower) overlap zone.

*[HYPOTHESIS: the actual rocket honestOverlapRate in the sim is lower than dragon's for this
structural reason. Check via sim comparison: `--racer=rocket` vs `--racer=dragon` at LF=0.0228.
Dragon's rate should be meaningfully higher.]*

---

## 4. Fault Classification — Design Gap vs Code Bug

Both faults are **design gaps** (the logic works as coded, but the code does not implement the
intended "avoid-first, brake-to-match-speed" semantics):

| # | Fault | File:Line | Certain/Hypothesis |
|---|-------|:---------:|:------------------:|
| 1 | Brake is fixed %, not a leader-speed cap | `raceBehavior.js:291–293` `index.jsx:913` | **CERTAIN** |
| 2 | No lateral push when dY ≈ 0 (same lane) — free-lane fires only inside sprite box | `raceBehavior.js:368–369` + `301` | **CERTAIN** |
| 3 | Brake fires before lateral avoidance starts (wrong order for same-lane approach) | `raceBehavior.js:291` vs `301` | **CERTAIN** |
| 4 | Dragon's honest-overlap zone is 67% wider laterally than free-lane zone | `raceBehavior.js:299` | **CERTAIN** |
| 5 | Outer 15% of dragon body: honest overlap fires, NO brake, NO free-lane | gate geometry | **CERTAIN** |
| 6 | Rocket may self-correct faster (narrower overlap zone inside free-lane zone) | geometry | **HYPOTHESIS** |

**Root fault for "passes through":** Fault 1 + Fault 2 in combination.
Fault 1 alone means the trailer is still closing in even when braked.
Fault 2 means lateral avoidance doesn't start until the racer is already inside the sprite box.
Faults 3–5 are compounding effects that make it worse for wide-body racers specifically.

**Where the fix would have to live:**

- Fault 1 fix: inside the brake application at `index.jsx:908–913`, replace
  `effectiveBrakeFactor` with a per-racer computed value that is at most
  `leaderEffectiveSpeed / trailer.baseSpeed` for the closest leader. This requires
  knowing the leader's effective speed at the time the brake flag is set — information
  currently not computed or stored.

- Fault 2 + 3 fix: add a pre-free-lane lateral impulse for the direction AWAY from the closest
  same-lane leader when `dT < dynamicBrakeT && |dY| < threshold` — active in the brake zone
  even before the sprite-box overlap zone. Currently no such code exists.

These are non-trivial changes. They would need the same full-sweep sim validation used in
previous phases.

---

## 5. What a Live/Sim Check Would Need to Confirm

These hypotheses should be verified before any fix is designed or trusted:

1. **Fault 6 (rocket vs dragon overlap rate):** Run `--racer=rocket --racer=dragon` comparison
   at same setup and verify that rocket's honestOverlapRate is meaningfully lower — expected
   based on geometry, not yet confirmed by simulation.

2. **Brake-speed cap fix effectiveness:** Implement a prototype of Fault 1 fix (per-pair leader-
   speed cap) and verify in sim that honest overlap drops more than the lateralForce scan already
   achieved, without the 86%-brakeRate mass-slowdown side effect.

3. **Same-lane vs off-lane overlap share:** Instrument the diagnostic to count what fraction of
   honest overlap events start from `|dY| < 0.05` (near-same-lane) vs `|dY| > 0.05`. If most
   overlap comes from off-lane approach (already at some dY), then Fault 2 matters less and
   the free-lane push is already working for most events.

---

## 6. Plain Summary

**The overtaking racer passes through the leader for two compounding reasons:**

1. **The speed brake is a 5.5% flat reduction, not a speed match.** The code at
   `raceBehavior.js:291–293` and `index.jsx:913` has no reference to the leader's speed. A trailer
   that is 11–17% faster (plausible with the ±8% spread range) is still 5–11% faster after
   braking. It will close in — just slightly more slowly. No amount of fixed-% braking can hold
   a significantly-faster racer behind a slower one.

2. **When the trailer is directly behind the leader (same lane), there is zero lateral push
   until the trailer enters the sprite-box overlap zone** (`raceBehavior.js:368–369`). The push
   that should steer the racer AROUND the obstacle fires only AFTER the racer is already inside
   the obstacle. The 17–29 pre-overlap free-lane frames provide only ~0.036–0.082 physicalY of
   displacement — not enough for dragon's 0.2118-wide honest overlap zone.

**For dragon specifically,** these faults are compounded by the body being 67% wider than the
free-lane zone laterally, extending honest overlap into a region where neither the brake gate
nor the free-lane push is active.

**Lateralforce is still the right near-term lever** (proven by the grid probe in report 02) —
higher LF makes the free-lane and avoidance forces stronger, compressing the overlap duration.
The root design gap (fixed-% brake, reactive lateral avoidance) is the correct longer-term target.
