# RACER-FLAPPING-2 — margin hysteresis kills the flap; the FIRST engine change since COMBO15

**World: NEW (SHIPPED).** This is the first engine change since COMBO15. The margin hysteresis lives in the avoidance code, which runs in BOTH worlds, so both shipped fingerprints move (minted on the committed state; old anchors preserved in docs/SIM.md + REBASELINE): **ON `ded0a126048e4cdb` → `62400c8e88cdbe59`**, **OFF `f8f7d9c2fd3283e9` → `8d0bd4d2d92ded24`**. Follows the RACER-FLAPPING-1 timer-kill: the fix is now **margin hysteresis, not a clock** (Lesson 190).

## The fix
The flap root (STEP 0, RACER-FLAPPING-1) is the §4a soft-steer re-picking the **most-constraining obstacle every physics tick** between two comparable gaps. The fix: the **incumbent obstacle keeps the steer target unless a challenger's constraining force exceeds it by a relative margin ε** (`softSteeringObstacleMargin`). This is **per-agent, geometric, and clock-free** — there is no shared time window to synchronise the field (the failure mode that killed the timer). A genuinely-dominant challenger still takes over immediately, eased by the existing lateral clamp.

## The instrument + the ε sweep
The intended synthetic 2-blocker micro-scenario did **not** reproduce the alternation (the soft-steer handles clean geometries; the flap is an *emergent multi-body* effect), so the sweep was gated on the **deterministic real Arrow case** (seed 5601) **plus the whole-race FIELD GUARD** — dramatic flappers (racers with ≥5 reversals/2 s at ≥0.18 pY amplitude), the timer-kill's lesson as a gate:

| ε | Arrow reversals (17–21 s) | FIELD GUARD dramatic flappers (seeds 5601 / 5602 / 5603) |
|---|---|---|
| 0 (ship) | 18 | 1 / 1 / 0 |
| 0.30 | 3 | 1 / **3** / 0 ← regressed the field on seed 5602 |
| **0.50 (shipped)** | **1** | **0 / 0 / 0** |

The FIELD GUARD earned its keep exactly as designed: ε=0.30 looked fine on Arrow but *increased* dramatic flappers on seed 5602 (the same single-seed trap that hid fix #1's regression). **ε=0.50** kills Arrow's flap (18→1, an 18× drop) **and** holds/improves the field guard on every tested seed — the opposite of the synchronising timer.

## Gates (STEP 2)
- **(a/b) Arrow + responsiveness:** Arrow 18→1 reversals (bar ≤3). Responsiveness proof — body-overlap pair-frames on the paired seed-5601 dump: **NEW 72,303 ≤ ship 80,650**, so the stickier obstacle-choice does *not* make racers ignore closing gaps or collide; avoidance still separates (blocking intact).
- **(c) FIELD GUARD:** 0 dramatic flappers across seeds 5601/5602/5603 (≤ ship 1); worst episode 4/3/2 (≤ ship 6/8/4).
- **(d) FAIRNESS — N=100 quartet paired vs ship (all four GREEN):**

| track | band arrival (ship → new) | runaway | Holm |
|---|---|---|---|
| searound/manta | 89.2 → **89.8%** | 0% | near-pass (= ship) |
| luger-hill/luge | 91.6 → **91.6%** | 0% | near-pass (= ship) |
| seatrack/dolphin | 90.9 → **89.6%** | 0% | ok (improved) |
| space-sprint/rocket | 88.3 → **88.8%** | 0% | ok (improved) |

Band arrival holds within N=100 noise on all four, runaway 0% everywhere, Holm ≤ ship (two tracks improved to clean). **OPEN RESIDUAL:** the 300-race pooled native Holm (fold-in A) was deferred per the owner and is recorded in REBASELINE — it must run on the next overnight occasion and **before any further engine change**.

## Five sentences
1. Racers flip left-right in traffic because the §4a soft-steer re-picks the most-constraining obstacle every tick between two comparable gaps; the fix is a per-agent geometric **margin** — the incumbent keeps the steer unless a challenger dominates by ε — with no clock, so it never synchronises the field the way the killed timer did.
2. The synthetic micro-scenario wouldn't reproduce the emergent alternation, so ε was swept against the deterministic Arrow case and a whole-race field guard, which caught ε=0.30 regressing seed 5602 and selected ε=0.50.
3. At ε=0.50 Arrow's flap drops 18→1 reversals, the field guard shows 0 dramatic flappers on every tested seed (vs ship's 1), and body-overlap is ≤ ship — the fix is responsive and blocking stays intact.
4. The N=100 fairness quartet is green — band arrival holds (89.8/91.6/89.6/88.8%), runaway 0%, Holm ≤ ship — so the new fingerprint `62400c8e88cdbe59` was minted and the world shipped, with the 300-race native Holm logged as an open residual to run next.
5. This encodes Lesson 190: commitment in mutual avoidance must be per-agent and geometric, never timed, and subtle avoidance changes must be gated by a whole-field guard across seeds, not one agent on one seed.

## Proposals (≥2)
1. **Run the deferred 300-race native Holm next overnight (binding before the next engine change).** It settles whether the new world's start-row fairness is clean at the gate's own instrument; the N=100 hero-map Holm here already improved two tracks to `ok`, which is encouraging but not the definitive test.
2. **Owner eye on seed 5601 ~22 s (Arrow decisive/smooth) + a dense pulk + an open track** to confirm the fix visually and that battles/blocking still happen; if any residual visual dither remains, the parked reserve (#2 steer-target rate-limit, presentation-side) is the follow-up.
3. **Expose `softSteeringObstacleMargin` in the Dev avoidance panel** so the flap-vs-responsiveness trade can be tuned by eye without a rebuild (project principle: everything UI-configurable), with the field guard as the standing regression check.
