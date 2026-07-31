# RACER-FLAPPING-1 — racers flip left-right: diagnosed sim-side; the first fix is an EARNED KILL

**World: SHIPPED unchanged.** No engine change ships from this line — the STEP-1b fix was reverted after failing its own gate, and the OFF-path fingerprint **`ded0a126048e4cdb` is IDENTICAL** (asserted post-revert). Only read-only diagnostic tooling remains.

## STEP 0 — located and quantified (solid)
The flip is **sim-side lateral state (`physicalY`)**, not render: the sprite heading is the smooth track tangent, and the render only interpolates. Reproduced the owner's exact case (Quick Test roster, `Arrow` = index 12): Arrow **leads alone** (pY ≈ 0) until ~16 s, gets **caught** into traffic (rank 1→3), and at ~18 s flaps **17 lateral reversals in 2 s (~8.5/s)**, pY swinging [0.24, 0.60]. Cause (code + trace): the §4a soft-steer picks the **most-constraining obstacle every physics tick with no cross-tick commit**, so a racer squeezed between two comparable obstacles flip-flops its steer target — exactly "lane-choice oscillation between two comparable gaps." New read-only observers built for this: `sim-fairness --dump-frames` now records `physicalY` + `--racer-names` for faithful roster repro; `exp-flapping-gate.mjs` is the paired gate driver.

## STEP 1b — decision hysteresis (fixed window): EARNED KILL
The fix committed each racer to its chosen side for ~0.4 s (24 frames) unless the side closed hard, motion still eased by the shipped clamp. It **fixed the targeted case** — Arrow's flap went **17 → 0** (he picked a side and slid smoothly). But the **field-wide dramatic-flap metric got WORSE**, not ≥5× better:

| dramatic flap episodes (≥5 reversals/2 s at ≥0.18 pY amplitude) | SHIP (pre-fix) | fix (candidate) |
|---|---|---|
| racers with such an episode | **1** (Arrow) | **6** |
| worst episode | 6 | **10** |

**Why it backfired:** a *fixed* commit window makes many racers hold a side simultaneously, then all re-decide together — the mutual avoidance becomes momentarily unresponsive, racers over-approach, and the corrections when the windows expire are *larger and synchronized*, so one racer's fast flap becomes several racers' dramatic flaps. (The field comparison is also confounded — the fix changes the race — but the direction is unambiguous and the owner concurred: this is the wrong solution.) Per the gate ("flap ≥5× down") this **fails**, so it is reverted and **nothing is minted or shipped**. The shipped fairness world is untouched.

## Five sentences
1. The flip is sim-side `physicalY`: reproduced with the real roster, Arrow leads then gets caught into traffic at ~18 s and flaps 17 reversals in 2 s because §4a re-picks the most-constraining obstacle every tick with no commit.
2. Render and heading are ruled out (heading is the smooth track tangent; render only interpolates), so the fix must be sim-side — an engine change that would shift the fingerprint.
3. The first fix (a fixed 0.4 s side-commit) cleanly fixed Arrow (17 → 0) but made the field worse (dramatic flappers 1 → 6), because a synchronized fixed window de-responsivises mutual avoidance and turns one fast flap into several.
4. It fails the ≥5× flap-reduction gate, so it was reverted; the OFF-path fingerprint `ded0a126048e4cdb` is identical and the shipped world is unchanged — an earned kill, nothing shipped.
5. The next attempt must attack the *root alternation* (obstacle-choice churn) with a margin, not a timer, and be judged by a race-invariant metric so the fix/no-fix comparison isn't confounded by the fix changing the race.

## Proposals (≥2) — the different solution
1. **Obstacle-choice MARGIN hysteresis (not a time window).** The root is the *most-constraining obstacle alternating tick-to-tick*. Keep steering relative to the SAME obstacle until another is **decisively** (not marginally) more constraining — a margin on `forceMag` before the §4a winner may change — so the target stops flip-flopping without holding a stale decision or synchronising the field. This targets the churn directly and avoids the fixed-window's collective-amplification failure.
2. **Rate-limit the steer TARGET, not the decision (feel-side).** Low-pass / per-tick-bound the `_ssTarget` itself so that even if the underlying decision flips, the *visible* lateral target eases and never produces rapid flapping. Closest to "eased via the shipped clamp," lowest fairness risk, and it degrades gracefully (worst case: a slightly laggier dodge, never a dither).
3. **A race-invariant flap metric for the next gate.** Build a controlled single-racer-squeezed-between-two-obstacles micro-scenario (identical for SHIP and candidate) so flap reduction is measured without the whole-race divergence confound — the field-wide N=100 dumps proved too noisy to gate a subtle avoidance change.
