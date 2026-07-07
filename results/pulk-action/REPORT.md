# PULK-action grid — verdict

**Anchor:** `pre/pulk-action` @ `c5e1860`. **Harness HEAD:** `0a0af3a` (feat/race-action). Read-only,
sim-only, OUTCOME controller untouched, default byte-identical, 119/119 tests green. 48 runs =
A1/A2/A3 × B0/B1/B2/B3 × 4 tracks × 30 races, variant-1 re-roll, PULK bonuses = 0, rubber-band/
two-sided-contest fade to 1.0 before corridorStart (0.55), governor tail-lift + surge OFF.

## Verdict: NO cell wins. Do NOT run the 100-race matrix.

The stripped-re-roll hypothesis is **partly validated and partly refuted**:

- **The mechanism finally bites** (unlike every prior attempt): the two-sided contest (A2) turns the
  dead Stage-0 front (distinctP1 ~1.9, one leader 75–87% of PULK) into a genuinely contested one
  — **distinctP1 ~5.0, leader time-share ~41%**, on every track. Over the stripped ±8% re-roll, the
  tool has enough authority. That's the owner's core thesis, confirmed.

- **But it does not clear the bar on three independent counts**, so it is **insufficient as tested**:

| axis1 tool | PULK distinctP1 | PULK lShare | leadΔ | fair cells | nat-ok cells | peak speed |
|---|--:|--:|--:|--:|--:|--:|
| A1 rubber-band | 2.0 | 75% | 1 | 5/16 | 16/16 | +8.1% |
| A2 two-sided contest | 5.0 | 41% | 289 | 4/16 | 0/16 | **+18.3%** |
| A3 both | 5.1 | 41% | 286 | 4/16 | 0/16 | **+18.3%** |

### Why each fails

1. **A1 (rubber-band) does essentially nothing for action.** distinctP1 2.0 / leaderShare 75% is
   the Stage-0 baseline. "Hold the front tight so a small re-roll swing flips the order" does not
   happen — braking the leader toward the median keeps the pack close but the re-roll swing still
   doesn't flip P1. Rubber-band adds nothing on top of A2 either (A3 ≈ A2).

2. **A2/A3 violate naturalness on every run.** Peak PULK speed **+18–19%** (natural ceiling +8.1%),
   ~2–3% of PULK racer-steps over the ceiling. The +0.10 challenger boost is *multiplicative on top
   of* a racer's re-roll draw, so a challenger already near +8% gets pushed to +19%. The eye would
   read boosted challengers as "too fast." (Naturalness is 0/16 nat-ok for both A2 and A3.)

3. **A2/A3's "action" is largely flicker, not clean overtaking.** leadΔ ≈ 250–326 over the PULK
   window = P1 swapping every ~3–4 frames — a *boiling* front, not clean passes. distinctP1 ~5 /
   leaderShare 41% is a real improvement (5 racers share the front vs ~2, no dominator), but the
   300 "lead changes" are oscillation. This needs an eye-test to call "overtaking" vs "flicker."

4. **Finish fairness holds on only 1 of 4 tracks.** A2/A3 are action+fair **only on garden-path**
   (closed) — and that is exactly the closed-track / flicker case the spec said to distrust. On
   mountainstreet, seatrack (open) and searound, the PULK contest scrambles the pre-OUTCOME field
   enough that OUTCOME can't re-sort to fair bands in 30 races: band-reach B1 dips to 67–77%
   (below the 70% gate on several) and the **worst-case assigned winner is stranded** (e.g. seatrack
   a2b2 rank 57→37, a2b0 57→20; searound repeatedly 40→9…15). Restoring bonuses post-0.5 (B1/B3)
   nudges band-reach up but does **not** rescue open-track fairness.

5. **ceilFrac is NOT the blocker** — A2/A3 burn only 0.53–0.75 of the OUTCOME clamp (Stage-0 was
   0.65–0.80), so OUTCOME has headroom. The blocker is band-reach + worst-case recovery, not clamp
   saturation. **searound also fails start-row fairness (p≈0.01–0.09) even here** — a track-geometry
   bias independent of the tools (same as strip-down Stage 0).

6. **Axis 2 barely matters.** PULK action is identical across B0–B3 (bonuses are 0 in PULK by
   design). B1/B3 (areaBonus restored) give a small band-reach bump but don't change the verdict.

## What this means for the concept (honest, not oversold)

The owner's insight — *with bonuses off in PULK, steering fights only ±8%, so the tools finally
bite* — is **correct**: A2 produces a materially more contested front than anything before. But at
the tested strength it buys that action with (a) a naturalness breach (+18%), (b) flicker rather
than clean overtakes, and (c) loss of open-track finish fairness. Rubber-band alone is a dud.

**The next levers, if the owner continues** (not run here — needs a new spec):
- **Gentler / clamped boost** for naturalness: cap the challenger's *total* speed factor at the
  natural ceiling (boost as a target, not a multiplier), or drop challengerBoost 0.10 → ~0.04 and
  re-measure whether the front stays contested without exceeding +8%.
- **Smaller / slower contest** (cast, dwell, anchorOffset) to convert flicker into fewer, cleaner
  lead changes and to disturb the field less, so OUTCOME keeps open-track band-reach.
- Treat **searound separately** — its start-row bias is geometry, not a bonus/tool issue.

Per the decision rule: action AND fairness AND naturalness do not co-occur across the matrix →
**STOP, no 100-race matrix, continue tomorrow with a gentler-boost spec.**
