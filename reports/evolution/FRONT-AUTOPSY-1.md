# FRONT-AUTOPSY-1 — what exactly kills top-place action

**Branch `exp/chain-choreo` (substrate; sim-only). Author: CC.** Pure OBSERVATION of the real shipped world
(`chainChoreoEnabled` OFF) — no behavior change of any kind. Diagnoses, per dead finale, WHICH of the four
suspects was the binding constraint. Observer: `--front-autopsy` in `sim-fairness.mjs` (read-only). Runner:
`scripts/exp-front-autopsy.mjs`. N=100 × 4 standard tracks, default racers, 60 s, single world.

## Closing line (read first)

**The enemy is the servo's intra-band rank-hold (OVER-STEER), and it is PERVASIVE.** The front is never
fuel-starved (DRIVE 0%). In dead finales the binding constraint is **OVER-STEER — the servo braking a
closing front racer to hold its assigned rank — in 75%** (open **83%**, closed **68%**); SPACE (no clear
lane) is second and **matters far more on closed tracks (28%) than open (13%)**. Crucially, **dead and alive
finales are near-identical on every instrument** (servo-opposition 55% vs 58%, blocked 39% vs 43%, fuel 0.149
vs 0.161 in the last 10%): the servo suppresses front passes in ~55% of closing situations in EVERY race —
the 12% dead rate is the tail of that pervasive suppression, not a separate broken mode. **A new force should
free intra-band rank at the front (the band rule never required holding rank), and on closed tracks respect
lane scarcity (stagger duels).**

## Fingerprint assertion (behavior unchanged)

The observer is a pure read. The default fingerprint WITH `--front-autopsy` active must equal the shipped
baseline:

| run | COMBINED |
|---|---|
| shipped baseline | `7c70b1eae7d31e22` |
| **with `--front-autopsy`** | **`7c70b1eae7d31e22`** — identical ✓ (asserted twice: initial + refined observer) |

## Instrument definitions (exact, reviewable)

Measured over the FINAL THIRD (`raceProgress ≥ 2/3`) for the live front group (top-5 by track position;
top-3 tracked separately), and — for the discriminating comparison — again over the LAST-10% window
(`raceProgress ≥ 0.9`, where the standing dead-finale definition lives). Realized speed proxy:
`speed(r) = baseSpeed × trajectoryMult × areaBonusMult` (areaBonusMult ≈ 1 late under choreo).

- **(a) DRIVE** — is the honest width used / is there fuel to pass?
  - `meanTrajSpread` = mean over ticks of `max−min trajectoryMult` across the top-5.
  - `fracTrajAtClamp` = fraction of front-slot-ticks with `trajectoryMult` pinned at the clamp (≥1.099 or ≤0.851).
  - `meanFuelSpread` = mean of `(max−min speed)/mean speed` across the top-5 — the realized passing fuel.
    A front with `fuelSpread < 0.02` is **converged** (no speed difference left to pass with).
- **(b) SPACE** — a faster racer denied a lane. A **CLOSING pair** = adjacent top-5 racers (behind i, ahead
  i−1) with `gap < 3.0` lengths AND `speed(behind) > speed(ahead)·1.005`. `blockedFrac` = of closing ticks,
  the fraction where the behind racer has `r.avoidanceActive === true` — **the traffic core's OWN signal**
  ("braking behind a leader, no free lane", `raceBehavior.js`; not re-derived).
- **(c) TIMING** — when does the front lock, and what coincides?
  - `lockP1` = last `raceProgress` (tracked from 0.5) at which the **P1 leader index** changed — the WINNER
    lock (the one that matters; `null` ⇒ P1 never changed after 0.5 ⇒ locked ≤ 0.5).
  - `lockSet3` = last progress the top-3 **membership set** changed (order-independent).
  - `convProgress` = earliest final-third progress after which `fuelSpread` stays `< 0.02` to the end.
  - coincidence markers: last scheduled roll (`reRollLastPositionPercent` = 0.95) and choreo release (0.97).
- **(d) OVER-STEER** — the servo pulls a closing front racer back. `servoOppFrac` = of closing ticks, the
  fraction where the behind racer has `trajectoryMult < 0.99` (the servo is braking it). A top-5 racer is
  already inside its front band, so the band rule is satisfied — a brake here is the servo holding intra-band
  RANK against the emerging swap.

## Binding-constraint precedence (per dead finale, documented)

Classified on the LAST-10% window (fall back to final-third if that window had no closing ticks):
1. `fuelSpread < 0.02` → **DRIVE** (no fuel; nothing to pass with).
2. else no closing pair at the front → **TIMING** (fuel exists, but no faster racer was adjacent-closing).
3. else `blockedFrac ≥ servoOppFrac` and `≥ 1/3` → **SPACE** (traffic denied the lane).
4. else `servoOppFrac > blockedFrac` and `≥ 1/3` → **OVER-STEER** (servo braked the closer).
5. else → **multiple/other**.
Rationale: DRIVE is the root (no fuel ⇒ nothing to block or steer); given fuel, a closing pass is prevented
by either no lane (SPACE) or the servo (OVER-STEER) — the more frequent denier is named binding.

## CAUSE RANKING (binding constraint per dead finale) — N=100×4

| track | topo | dead rate | DRIVE | SPACE | OVER-STEER | TIMING | other |
|---|---|---|---|---|---|---|---|
| luger-hill | open | 8% | 0 | 13% | **88%** | 0 | 0 |
| mountainstreet | open | 15% | 0 | 13% | **80%** | 0 | 7% |
| searound | closed | 11% | 0 | 18% | **82%** | 0 | 0 |
| dirt-oval | closed | 14% | 0 | 36% | **57%** | 0 | 7% |
| **OPEN pooled** | | 12% | 0 | 13% | **83%** | 0 | 4% |
| **CLOSED pooled** | | 13% | 0 | **28%** | **68%** | 0 | 4% |
| **ALL pooled** | | 12% | 0 | 21% | **75%** | 0 | 4% |

**DRIVE = 0 and TIMING = 0 everywhere.** The front always has passing fuel (fuelSpread ≈ 0.15–0.18, never
converged), and no dead finale is a pure early-timing lock without a space/steer cause. The killer is the
servo braking closing front racers (OVER-STEER); on the closed tracks, lane scarcity (SPACE) is a real
secondary (28% vs 13% open), and on dirt-oval it nearly ties (36% SPACE / 57% OVER-STEER).

## DEAD vs ALIVE (the causal signal — last-10% window)

| group | n | fuelSpread | trajAtClamp | blockedFrac | servoOppFrac | P1 lock | set-3 lock |
|---|---|---|---|---|---|---|---|
| DEAD | 48 | 0.149 | 33% | 39% | 55% | (saturated) | (saturated) |
| ALIVE | 352 | 0.161 | 32% | 43% | 58% | (saturated) | (saturated) |

**The instruments barely differ between dead and alive** (dead has marginally less fuel and slightly less
closing/servo action — i.e. a slightly more settled front — but nothing categorical). The honest reading:
front-pass suppression (servo brake in ~55–58% of closing situations, traffic block in ~40%) is a **baseline
property of every finale**, not something that switches on in the dead 12%. A force that reduces it will lift
lead-changes across the whole distribution, not merely convert the dead tail. (`fracTrajAtClamp` ≈ 32%: the
honest ±width IS being used a third of the time at the front — the envelope is not the limiter; the servo's
*direction* is.)

## LOCK-IN + COINCIDENCE — inconclusive (documented limitation)

Both lock metrics **saturated at 1.0** for dead and alive alike. Cause: the observer tracks P1 (and the top-3
set) among *unfinished* racers, so when the leader crosses the line the "leader" role shifts to the next
racer, registering a spurious change at ≈1.0. All 48 dead races show a P1 change in [0.5,1] by this metric,
which contradicts the standing dead definition (no lead change in [0.90,1.0]) — confirming the artifact. The
coincidence table (|P1lock−marker|: convergence 0.00 degenerate, lastRoll 0.05, choreoRelease 0.03) is
therefore **not trustworthy** and no marker claim is made. A finish-aware lock metric (freeze the P1 identity
at each racer's own crossing) is the fix for a follow-up; it does not change the cause ranking or the
dead-vs-alive conclusion above, which do not depend on it.

## THE ENEMY, MEASURED (the direct input to the design round)

- **Both topologies:** the primary enemy is **OVER-STEER — the servo holding intra-band RANK at the front**
  (open 83%, closed 68%). The band rule only requires the BAND; a top-5 racer is already in its front band,
  so the servo's rank-brake on a closing top-5 racer is *gratuitous* under the fairness gate. **A new force
  must free intra-band rank at the front** (let the front race freely once in-band) — this is the lever the
  owner pre-authorised, and the autopsy names it as the dominant cause.
- **Closed tracks additionally:** **SPACE (lane scarcity) is a real secondary (28%)**. Freeing rank there
  will create more closing attempts than the few lanes can service → the drama duels must be **staggered /
  sequenced** on closed tracks so closing passes don't pile into the same lane at once.
- **Not the enemy:** DRIVE (fuel) — the front always has speed spread; and the envelope width is used ~1/3
  of the time. So a new force should NOT add more speed width; it should redirect the servo's *intent*
  (stop holding rank in-band) and manufacture front crossings (drama formations), within the existing clamp.

## Owner-only questions

1. The lock-in metric is confounded by racers finishing (saturated at 1.0). Want the finish-aware fix run as
   a small addendum, or is the cause ranking + dead-vs-alive signal (which don't depend on it) enough?
2. The autopsy says the suppression is *pervasive* (dead ≈ alive), so the design target is "lift front
   lead-changes across all races," not "convert the 12% dead." DRAMA-1 (this run's Phase 2+) builds to that
   target — confirm that framing.

---
**Branch `exp/chain-choreo`.** Observer `--front-autopsy` (read-only); runner `scripts/exp-front-autopsy.mjs`;
data `reports/evolution/front-autopsy-data/autopsy.json`. Fingerprint with observer = `7c70b1eae7d31e22`.
