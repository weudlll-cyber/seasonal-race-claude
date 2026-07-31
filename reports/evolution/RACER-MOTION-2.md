# RACER-MOTION-2 — the solo swerve now GLIDES: a per-tick lateral acceleration cap (ε=0.0005), hard-sep untouched

**World: SHIPPED.** This turn ships the integrator acceleration cap that RACER-MOTION-1 built disabled:
`maxLateralAccelPerStep` 0 → **0.0005**. It bounds the per-tick CHANGE in a racer's lateral step, so a dodge
eases in and out instead of snapping to full swerve on the first tick. This is the SECOND engine change since
COMBO15 (after RACER-FLAPPING-2's margin hysteresis). The hard-separation non-penetration SAFETY — the
dominant jerk source RACER-MOTION-1 identified — is left **UNTOUCHED by owner decision**; this change smooths
only the steer/integrator half, which is the owner's visible solo-swerve case.

## STEP 1 — the cap, swept and picked (ε = 0.0005)

**(a) Solo overtake swerve — the owner's perceptual case.** On the isolated overtake fixture every cap in
{0.0002, 0.0003, 0.0005} completes the dodge (cleared YES, max swerve ≈0.253–0.256 unchanged); the onset
acceleration equals the cap (baseline 0.0012), so ε=0.0005 replaces a first-tick snap with a visible ease-in
at ~2.4× lower onset while the dodge still finishes on time.

**(b) Seed 5601 dense traffic (searound, real Quick-Test roster) — the safety/flap gate.** Sweep of
`maxLateralAccelPerStep`, measured per-tick accel + Arrow flap + whole-race FIELD GUARD + body-overlap:

| ε | accel p99 / max | Arrow flap | field dramatic | overlap-PF (baseline 72303) |
|---|---|---|---|---|
| 0 (pre-motion ship) | 0.0057 / 0.0560 | 1 | 0 | 72303 |
| 0.0002 | 0.0030 / 0.0280 | 1 | 0 | 71400 |
| **0.0005 (shipped)** | **0.0021 / 0.0261** | 2 | 0 | **56083** |
| 0.001 | 0.0030 / 0.0257 | 2 | 0 | 75439 ✗ |

**ε=0.0005 is the strongest cap that keeps every gate:** best jerk reduction (accel p99 0.0057→0.0021 = **2.7×**,
max 0.056→0.026 = **2.1×**), overlap **56083 ≪ baseline 72303** (avoidance is NOT late — the decisive safety
gate), Arrow flap 2 ≤ 3, FIELD GUARD 0 ≤ ship. ε=0.001 is rejected: its overlap 75439 exceeds baseline (too
loose a cap lets dodges arrive late). ε=0.0002/0.0003 also pass but with thinner overlap margin and worse
p99/max — 0.0005 sits at the safety-margin sweet spot.

## STEP 2 — hard-separation UNTOUCHED

The non-penetration pass (`raceBehavior.js` hard-separation block, `rA.physicalY = newYA` direct writes) has
**zero diffs** versus e99b034d — the entire behavior diff for this ship is the one-line default flip in
`storage/defaults.js` (`maxLateralAccelPerStep: 0 → 0.0005`); the integrator cap code itself already shipped
disabled at MOTION-1. The dominant hard-separation jerk (accel p95 8× / p99 3.2× per MOTION-1's instrument) is
deliberately NOT addressed here — that remains an open owner call (safety-vs-feel trade), see Proposal 1.

## STEP 3 — ceremony (gates GREEN)

**Quartet N=100 paired vs the FLAPPING-2 ship `62400c8e88cdbe59`** (band arrival holds, runaway 0, rowMin holds):

| track | band (vs ship) | rowMin | Holm (N=100 hero-map) | runaway |
|---|---|---|---|---|
| searound | 89.3% (89.8) | 87% | UNFAIR p=.020 (= ship) | 0% |
| luger-hill | 91.3% (91.6) | 90% | UNFAIR p=.020 (= ship) | 0% |
| seatrack | 91.5% (89.6) ↑ | 91% | ok | 0% |
| space-sprint | 89.0% (88.8) | 89% | ok | 0% |

Band holds within noise on all four (all ≥ the 88.3% floor; seatrack +1.9pp); **runaway 0%** everywhere; rowMin
healthy 87–91%; the N=100 Holm flags the **same two tracks** as the ship (searound + luger) — **no new UNFAIR**,
so Holm ≤ ship.

**New shipped-default fingerprints** (minted on the committed state; the cap runs in BOTH worlds, so both moved):
**ON `dc4647be0f55ebdb`** (replaces the pre-motion anchor `62400c8e88cdbe59`); **OFF `854018ee5d3d83e1`** (replaces
`8d0bd4d2d92ded24`). Reproduce the pre-motion world byte-for-byte with
`--behavior='{"maxLateralAccelPerStep":0}'`. Pre-ship state tagged `pre/motion` (`e99b034d`). REBASELINE +
docs/SIM.md chain + golden/replay tests updated to the new outcomes.

**⚠ OPEN RESIDUAL — the 300-race pooled native Holm is DEFERRED (owner decision).** It now runs on the
**COMBINED world (flapping + motion)** at the next overnight occasion and **MUST run before any further engine
change** — it covers both engine changes at once (rationale: this N=100 quartet already shows the motion cap is
fairness-neutral; risk accepted).

## Five sentences

1. The solo overtake swerve now glides: a per-tick lateral acceleration cap (`maxLateralAccelPerStep` 0 → 0.0005)
   eases the dodge in and out instead of snapping to full swerve on the first tick.
2. 0.0005 is the strongest cap that keeps every gate — dense-traffic accel p99 drops 2.7× and max 2.1×, solo
   dodges still complete, body-overlap falls to 56083 (well under the 72303 baseline, so avoidance is not late),
   and the flap metrics are unchanged (Arrow 2 ≤ 3, FIELD GUARD 0).
3. The hard-separation non-penetration safety — the dominant jerk source — is left untouched by owner decision,
   so the entire behavior diff is the one-line default flip and the safety-vs-feel trade stays an open call.
4. The N=100 quartet is green (band arrival holds within noise, runaway 0% on all four, rowMin 87–91%, and the
   Holm flags the same two tracks as the ship with no new UNFAIR), so both fingerprints were re-minted and the
   REBASELINE / SIM.md / golden / replay records updated.
5. The definitive 300-race native Holm is deferred by owner decision to the next overnight run where it covers
   the combined flapping + motion world at once, and it must run before any further engine change.

## Proposals (≥ 2)

1. **The hard-separation glide is the remaining Sanftheit win — schedule the safety-vs-feel owner call.** The
   dominant jerk is still the anti-overlap push writing `physicalY` directly (MOTION-1: accel p95 8× / p99 3.2×).
   Rate-limiting that displacement so overlapping racers glide apart would finish the job, but it trades jerk
   against a small brief overlap tolerance — a deliberate feel-vs-safety decision the owner should weigh, and it
   is sim-side so it would ride the same combined-world Holm gate.
2. **Run the deferred 300-race combined-world Holm at the next overnight opportunity before touching the engine
   again.** Two fairness-affecting engine changes (flapping hysteresis + motion cap) now sit on the shipped world
   verified only by N=100 hero-map Holm; the definitive `computeFairnessStats` 300-race gate is the standing debt
   and blocks the next engine change by rule.
3. **Consider exposing `maxLateralAccelPerStep` on the Dev Screen (Dynamics → motion) as a smoothing slider.** The
   cap is a clean single knob with a monotone perceptual effect (lower = smoother onset) bounded by the overlap
   gate; surfacing it lets the owner eye-tune glide vs responsiveness without a code edit (the UI-configurable
   principle).
