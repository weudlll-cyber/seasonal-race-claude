# RACER-MOTION-1 — lateral jerk is dominantly the hard-separation SAFETY, not the steer; nothing shipped yet

**World: SHIPPED unchanged.** No behaviour change ships from this turn — the second-order smoothing built here is config-gated and **default-disabled**, so the fingerprint is **`62400c8e88cdbe59` (IDENTICAL, verified)**. This is a STEP-0 diagnosis + STEP-1b groundwork; the real fix needs an owner call (below) because it touches a non-penetration safety and, being sim-side, brings the deferred 300-race native Holm due.

## STEP 0 — the jerk instrument (per-tick lateral velocity + acceleration)
Render is **exonerated first**: the drawn lateral is already interpolated between sim ticks exactly like the track component (`renderBuf.y = lerp(r._prevY, r.y, renderAlpha)`), so STEP-1a does not apply — the jerk is sim-side. The JERK metric (|ΔphysicalY|/tick = velocity, |Δvelocity|/tick = acceleration), seed 5601 searound + space-sprint, current world:

| | velocity p95 / max | **accel** p95 / p99 / max |
|---|---|---|
| searound, hard-sep **ON** (shipped) | 0.0042 / 0.0426 | **0.0008 / 0.0057 / 0.0560** |
| searound, hard-sep **OFF** | 0.0031 / 0.0280 (= clamp) | **0.0001 / 0.0018 / 0.0560** |

**The dominant source is (b) direct offset writes — the hard-separation non-penetration pass** (`rA.physicalY = newYA` directly, bypassing the velocity clamp *and* any integrator smoothing). Turning it off drops accel **p95 8× (0.0008→0.0001)** and **p99 3.2× (0.0057→0.0018)**, and pulls velocity max down to the clamp (0.028) instead of *exceeding* it (0.043) — the safety pushes racers apart faster than the shipped step clamp allows. The integrator steer-saturation (a) is only the **rare tail** (max accel 0.0560, unchanged by hard-sep). Space-sprint shows the same shape. So the visible "jump" is mostly the anti-overlap safety correcting instantly, not the steer.

## STEP 1b — groundwork built (disabled) + why it is not enough alone
A config-gated per-tick **acceleration cap** (`maxLateralAccelPerStep`, default `0` = disabled) was added to the integrator — it bounds the CHANGE in the lateral step so a dodge eases in/out. Swept on seed 5601, it clips the integrator tail (max accel 0.056→~0.026 ≈ **2.2×**, p99 2.7×) while preserving dodges (velocity intact), but it does **not** touch the dominant hard-separation jerk (a separate code path). The spec's "**p95 accel ≥3× down**" bar is inapplicable to this distribution: p95 accel is already ~0.0008 (near-zero) — the jerk lives in the **tail and the hard-separation pass**, not at p95. So the integrator cap is the *secondary* half of a complete fix.

## The real fix (needs an owner call) and the sequencing consequence
The dominant jerk is the hard-separation push. Easing it — rate-limiting the per-tick separation displacement so overlapping racers **glide apart** instead of stepping — is the primary fix, and it **shapes the existing safety output** (no new force). But hard-separation is a **non-penetration guarantee**: easing it trades jerk against a small, brief overlap tolerance, so it is a deliberate feel-vs-safety decision, not a free win. And it is **sim-side**, which — per the binding REBASELINE sequencing rule — means the **deferred 300-race native Holm on `62400c8e` must run FIRST** (it comes due), then the quartet N=100 paired, then mint + REBASELINE + SIM.md + `pre/motion` tag. That is an overnight ceremony for a subtle improvement, so it should not start without the owner weighing the safety trade and the cost.

## Five sentences
1. The render already interpolates the lateral component like the track, so the jerk is sim-side, not a render gap.
2. The dominant source is the hard-separation non-penetration pass writing `physicalY` directly — turning it off drops lateral acceleration p95 8× and p99 3.2× and pulls velocity back under the shipped clamp — while the integrator steer-saturation is only a rare tail.
3. A config-gated per-tick acceleration cap was built (default-disabled, fingerprint identical) that eases the integrator tail ~2.2× but cannot reach the dominant hard-separation jerk.
4. The spec's p95-accel gate is inapplicable here — p95 accel is already near-zero — so the jerk is a tail/safety phenomenon, and the honest gate is max/p99 accel plus the hard-separation contribution.
5. The primary fix (easing the hard-separation push to a glide) trades jerk against the non-penetration guarantee and is sim-side, so it brings the deferred 300-race Holm due and needs an owner decision before the overnight ceremony.

## Proposals (≥2)
1. **Ease the hard-separation push (the dominant fix), gated on a non-penetration guard.** Rate-limit the per-tick separation displacement (spread a large push over 2–3 ticks) so racers glide apart; gate it on `honestOverlap ≤ baseline` (the current overlap bound) so the anti-penetration promise holds. This is the real Sanftheit win; it is sim-side, so run the deferred 300-race native Holm first, then the quartet N=100, then mint (`pre/motion` tag).
2. **Ship the integrator acceleration cap as the cheap complement (or keep it as a knob).** It clips the rare steer-saturation tail ~2.2× and is already built; alone it is secondary, but paired with (1) it completes an a+b fix. If shipped it shifts the fingerprint and triggers the same overnight gate, so bundle it with (1).
3. **Fix the gate metric to the distribution.** Replace the "p95 accel ≥3×" bar with "max/p99 accel ≥3× down AND the hard-separation-off accel delta closed" — the instrument proved p95 is near-zero and the wrong target, exactly the kind of metric mismatch that hid RACER-FLAPPING-1's field regression.
