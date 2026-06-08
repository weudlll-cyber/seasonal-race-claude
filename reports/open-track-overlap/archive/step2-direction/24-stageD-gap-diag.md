# Report 24 — Stage D Gap Diagnosis: Why the Passing Gap Didn't Widen

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Commit:** Stage D is in uncommitted working tree; Stage C HEAD = `dca7e47`
**Method:** sim head-to-head (N=20, Space Sprint × dragon), physics from config values,
code tracing with file:line references.

---

## 1. Measured Comparison: Stage C vs Stage D

Both runs: N=20, Space Sprint × dragon, `--race-plan=true`.

| Metric | Stage C (`dca7e47`) | Stage D (working tree) | Δ |
|--------|--------------------|-----------------------|---|
| honest% | 3.6% | 3.6% | **0** |
| resolution | Ø9.5fr | Ø10.5fr | +1fr (noise) |
| latSpd | 0.001042 | 0.001095 | **+5%** |
| stableOvt | 7.529 | 8.012 | **+7%** |
| zigzag | 0.000304 | 0.000316 | flat |

**Key finding:** Stage D IS producing more lateral movement (`latSpd` +5%) and more
stable overtakes (`stableOvt` +7%), but the honest-overlap% is **unchanged at 3.6%**.
The bodies still touch during the pass at exactly the same rate.

---

## 2. Why Stage D Didn't Change the Gap: Three Sub-Questions

### 2a — Does Stage D fire EARLIER for the gap-problem scenario?

The gap problem occurs when a trailer approaches nearly directly behind (|yDiff| ≈ 0).

Stage C trigger ([raceBehavior.js:596](../../client/src/modules/raceBehavior.js#L596),
pre-edit): fires when `|yDiff| < sameLaneHH = 0.093`.  
Stage D trigger ([raceBehavior.js:598](../../client/src/modules/raceBehavior.js#L598)):
fires when `|yDiff| < 2 × sameLaneHH = 0.186`.

For a direct-behind approach (`|yDiff| = 0`): `0 < 0.093` is TRUE — **Stage C already fires**.
Stage D's wider boundary adds nothing for `|yDiff| = 0`.

**Root cause A: Stage D's extra range [0.093, 0.186) only fires for pairs that are
ALREADY laterally separated by more than one honest half-span. These pairs are not
causing honest overlaps. For the overlap scenario (|yDiff| ≈ 0–0.06), Stage C and Stage D
fire at exactly the same time.**

### 2b — Is the force magnitude the binding constraint?

Config values (dragon × Space Sprint):

| Parameter | Value | Source |
|-----------|-------|--------|
| `lateralForce` | 0.0114 | [defaults.js:503](../../client/src/modules/storage/defaults.js#L503) |
| `lateralDamping` | 0.16 | [defaults.js:505](../../client/src/modules/storage/defaults.js#L505) |
| `brakeMatchActivationYThreshold` | 0.06 | [defaults.js:525](../../client/src/modules/storage/defaults.js#L525) |
| `trackWidthPx` (Space Sprint) | 449 px | `honestBodyWidthPx / sameLaneHH = 41.8/0.093` |
| `lateralScale` | 0.218 | `REFERENCE_TRACK_WIDTH / trackWidth = 98/449` |
| `sameLaneHH` (dragon) | 0.093 | `41.8 / 449` |
| honest clearance needed | `|yDiff| ≥ 0.093` | one body half-span |

**Brake-match phase** (when |dY| < 0.06 AND dT < 0.00127,
[raceBehavior.js:461–466](../../client/src/modules/raceBehavior.js#L461)):

The trailer is locked at leader speed. dT ≈ constant (nearly zero). Force during this phase:

At `|yDiff| = 0.03, dT = 0.001`:
```
dist = sqrt((0.001×2)² + 0.03²) = 0.030
forceMag = 0.0114 × (1 − 0.030/0.18) = 0.0114 × 0.833 = 0.00950
```

Terminal lateral velocity (discrete damping system, `v_ss = force × d / (1−d)`):
```
v_ss = 0.00950 × 0.16 / 0.84 = 0.00181/step = 0.81 px/step
```

**Brake-match releases when `|dY| ≥ 0.06` ([defaults.js:525](../../client/src/modules/storage/defaults.js#L525)).**
Time to move from `|yDiff| = 0` to `|yDiff| = 0.06` with average force ~0.009:
```
avg v_ss ≈ 0.009 × 0.16/0.84 = 0.00171/step
frames   = 0.06 / 0.00171 = 35 frames
```

The trailer exits the brake-match Y-zone at `|yDiff| ≈ 0.06` — **BEFORE reaching the
honest half-span (0.093)**. At release, the trailer is still inside the leader's body.

**Post-release passing window** (trailer accelerates, dT grows slowly):

At `|yDiff| = 0.06, dT = 0.005` (brief alongside window):
```
dist = sqrt((0.005×2)² + 0.06²) = 0.061
forceMag = 0.0114 × (1 − 0.061/0.18) = 0.0075
v_ss = 0.0075 × 0.16/0.84 = 0.00143/step
```

In a 15-frame alongside window: additional lateral displacement = `0.00143 × 15 = 0.021`.  
→ `|yDiff|` at pass completion = `0.06 + 0.021 = 0.081`.

**At `|yDiff| = 0.081 < 0.093 (honest half-span)`: bodies still overlap during the pass.**

Gap remaining at the moment of passing: `0.093 − 0.081 = 0.012` normalized = **5.4 px**.
This is the visible overlap the user sees.

**Root cause B: the force magnitude is the binding constraint. With `lateralForce = 0.0114`
and `lateralDamping = 0.16`, the trailer exits the brake-match Y-zone at `|yDiff| ≈ 0.06`
(35 frames) before reaching the `0.093` clearance threshold. During the brief passing
window (~15 frames), the accumulated lateral displacement falls ~5 px short of clearance.**

Stage D doesn't change this because it doesn't touch `lateralForce`, `lateralDamping`,
or `brakeMatchActivationYThreshold` — the three parameters that govern this phase.

### 2c — Is there a downstream cancellation?

The Stage B/C committed force ([raceBehavior.js:800–803](../../client/src/modules/raceBehavior.js#L800)):
```js
if (r.approachCommitDir !== 0) {
  const fMag = _approachForceMag.get(r.index) ?? 0;
  if (fMag > 0) delta += r.approachCommitDir * fMag;
}
```

The committed force is added to `delta` AFTER anti-stacking normalization
([raceBehavior.js:699–713](../../client/src/modules/raceBehavior.js#L699)), so it is
NOT divided by `sqrt(neighborCount)`. It adds directly on top of the (normalized) regular
avoidance push.

`stuckModeSuppress` ([raceBehavior.js:717–737](../../client/src/modules/raceBehavior.js#L717))
could zero the delta when bilaterally balanced — but during a single-pair approach
(trailer behind one leader) the pressure is unilateral, so stuckMode doesn't fire.

**Root cause C: no downstream cancellation in the single-pair overtake scenario.
The committed force and natural avoidance push are additive and both in `naturalDir`.
The limiting factor is not cancellation but the force magnitude × available time.**

---

## 3. What Stage D Actually Achieves (vs What the User Needs)

Stage D fires for pairs with `|yDiff| ∈ [0.093, 0.186)`. These pairs are OUTSIDE the
honest overlap zone (which requires `|yDiff| < 0.093`). Stage D pushes them further apart
before they converge — preventing NEW overlaps that would otherwise develop as the pair
closes. This is reflected in `stableOvt` +7% and `latSpd` +5%.

But the user-observed problem is the GAP during the actual pass — pairs that were ALREADY
at `|yDiff| < 0.060` when brake-match engaged. These were already in Stage C's trigger zone.
Stage D adds nothing for them.

| Scenario | Stage C | Stage D | Δ |
|----------|---------|---------|---|
| |yDiff| ≈ 0 approach (the pass-through case) | fires at 0 | fires at 0 | **no change** |
| |yDiff| ∈ [0.093, 0.186) approach (borderline) | does NOT fire | fires | gap prevented |
| honest% | 3.6% | 3.6% | **0** |
| stableOvt | 7.5 | 8.0 | **+7%** |

**Stage D solves a DIFFERENT problem (marginal approaching pairs) while the user-visible
overlap (direct-behind + brake-match scenario) is unchanged.**

---

## 4. The Real Lever for Wider Passing Gap

The gap-problem constraint is: brake-match Y-threshold (0.06) < honest half-span (0.093).
The trailer exits brake-match BEFORE bodies are laterally clear. Three targeted levers:

### Lever A — Raise `brakeMatchActivationYThreshold` to `sameLaneHH`

Change `bmYThreshold = 0.06` → `bmYThreshold = sameLaneHH = 0.093` for open tracks.
Brake-match now holds until the trailer has cleared one full honest body half-span,
ensuring `|yDiff| ≥ 0.093` before the pass occurs.

**Effect**: pass happens only after bodies are laterally clear (single half-span).
**Risk**: wider brake zone increases chain-hold probability → needs sim sweep to confirm
no fairness regression. The 2-zone architecture ([defaults.js:518–525](../../client/src/modules/storage/defaults.js#L518))
was precisely set to avoid chain-lock; widening it requires a fairness re-check.

### Lever B — Dedicated lateral-gap force (proportional to remaining clearance)

In the apply-deltas Stage B/C block, replace or augment the bounded-forceMag force with
a gap-clearing force:
```
gapForce = lateralForce × max(0, 2×sameLaneHH − |yDiff|) / (2×sameLaneHH)
```

This force is proportional to the REMAINING distance to full clearance:
- `|yDiff| = 0`: `gapForce = lateralForce = 0.0114` (full strength)
- `|yDiff| = sameLaneHH (0.093)`: `gapForce = 0.5 × lateralForce = 0.0057`
- `|yDiff| = 2×sameLaneHH (0.186)`: `gapForce = 0` (already clear)

At `|yDiff| = 0, gapForce = 0.0114`:  
`v_ss = 0.0114 × 0.16/0.84 = 0.00217/step = 0.97 px/step`  
Time to reach `|yDiff| = 0.093`: `0.093/0.00217 = 43 frames`

With brake-match holding for up to 90 frames (anti-trap), the trailer would reach
`|yDiff| ≈ 0.093` in ~43 frames — well within the anti-trap window.

This force acts independently of the avoidance dist gate (it's applied whenever
`_sameLaneApproach` fires), so it continues pushing even when the pair is very close
(small dT, large forceMag from avoidance). It directly targets the gap width, not just
direction — **this is the principled fix**.

**Risk**: stronger lateral force during close approach changes overtake dynamics.
Needs fairness sweep (particularly for dense-field scenarios where multiple pairs
have the gap force simultaneously — anti-stacking normalization does NOT apply to
Stage B/C force, so the total force could stack).

### Lever C — Force multiplier on Stage B/C committed force

Simplest change: in the force injection, replace `fMag` with `fMag * honestWidthBoost`
where `honestWidthBoost = 2×sameLaneHH / spriteHalfSpan = 0.186 / 0.111 = 1.68` for dragon.

Slim racers get near-unity boost; wide racers get proportionally more. This is the racer-
size-proportional version of Lever B and reuses existing infrastructure.

**Risk**: same as Lever B (stronger force, needs sweep).

---

## 5. Stage D Verdict: Cost Without Benefit for the Gap Problem

Stage D changed one threshold: `|yDiff| < sameLaneHH` → `|yDiff| < 2×sameLaneHH`.

| | Stage D |
|---|---|
| Gap problem fixed? | **No** — doesn't touch force, threshold, or time |
| stableOvt benefit? | Yes (+7%) — prevents marginal overlaps in [0.093, 0.186) range |
| latSpd increase? | Yes (+5%) — more lateral movement overall |
| honest% change? | **None** |
| fairness risk? | Low (wider trigger = O(1) more work in apply-deltas) |
| cost? | Minimal (~5% more pairs in `_sameLaneApproach`, O(N) apply-deltas) |

Stage D is not all cost — the `stableOvt` improvement is real. But it doesn't address
the user-visible gap problem. The gap problem requires one of the force-based levers above.

---

## 6. Recommendation

**Revert Stage D** (restore `|yDiff| < sameLaneHH` trigger) for now. Reason: it blends
a side-effect improvement (stableOvt) into the same commit as a measure intended to fix
the gap. This makes it harder to evaluate the real fix's impact. Clean separation is:

- Stage C (dca7e47): direction logic, resolution time — **confirmed working**
- New Stage D or E: the gap force (one of Levers A/B/C above)

**Recommended next step**: implement Lever B (dedicated gap-clearing force proportional
to remaining clearance). It directly targets the mechanism (force magnitude during
brake-match hold), requires no new scans (uses existing `_sameLaneApproach`), and has
a clear off-switch when `|yDiff| ≥ 2×sameLaneHH`. Fairness sweep required before
confirming.

If Lever A (wider bmYThreshold) is preferred (simpler — just change one constant),
it can be combined with Stage C's existing direction logic without touching force
magnitude. It also needs a fairness sweep since it changes the brake-to-match zone.

**OPEN question for the user**: the `stableOvt` improvement from Stage D (+7%) — is
this a real user-visible quality improvement worth keeping regardless of the gap fix?
If yes, Stage D can be kept as a separate small benefit (the trigger stays at 2×sameLaneHH)
while the real gap fix is added on top via Lever B/C. If not, revert and apply Lever B cleanly.
