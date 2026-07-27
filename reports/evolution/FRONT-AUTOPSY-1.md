# FRONT-AUTOPSY-1 — what exactly kills top-place action

**Branch `exp/chain-choreo` (substrate; sim-only). Author: CC.** Pure OBSERVATION of the real shipped world
(`chainChoreoEnabled` OFF) — no behavior change of any kind. Diagnoses, per dead finale, WHICH of the four
suspects was the binding constraint. Observer: `--front-autopsy` in `sim-fairness.mjs` (read-only). Runner:
`scripts/exp-front-autopsy.mjs`. N=100 × 4 standard tracks, default racers, 60 s, single world.

## Closing line (read first)

<!-- FILLED AFTER THE REFINED RUN -->
**PENDING REFINED RUN.** Preliminary (N=100×4): the front is **never fuel-starved** (DRIVE 0%); the binding
constraint in dead finales is **OVER-STEER — the servo braking a closing front racer to hold its assigned
rank — ~75%** (open 78%, closed 72%), with SPACE (no clear lane) second (~23%, higher on closed).

## Fingerprint assertion (behavior unchanged)

The observer is a pure read. The default fingerprint WITH `--front-autopsy` active must equal the shipped
baseline:

| run | COMBINED |
|---|---|
| shipped baseline | `7c70b1eae7d31e22` |
| **with `--front-autopsy`** | <!-- FILLED --> `7c70b1eae7d31e22` (asserted) |

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

## CAUSE RANKING (binding constraint per dead finale)

<!-- FILLED AFTER THE REFINED RUN -->

## DEAD vs ALIVE (the causal signal — last-10% window)

<!-- FILLED AFTER THE REFINED RUN -->

## LOCK-IN + COINCIDENCE

<!-- FILLED AFTER THE REFINED RUN -->

## THE ENEMY, MEASURED

<!-- FILLED AFTER THE REFINED RUN -->

## Owner-only questions

<!-- FILLED AFTER THE REFINED RUN -->
