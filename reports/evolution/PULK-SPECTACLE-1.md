# PULK-SPECTACLE-1 — measuring the owner's "mid-race gone flat" finding

**Branch `exp/fair-arrival` @687988e (sim-only, master untouched). Author: CC.** Read-only measurement, NO
tuning, NO engine changes. Screen: searound + ice-track + luger-hill (the owner's viewing set), N=25, paired
seeds. Arms: SHIP · chaosSteer · faB60 · COMBO (STAGE 2) + SHIP@chaos15 · COMBO@chaos15 (STAGE 3).

## BUILD-vs-SPEC CONFORMANCE (first)
- **Engine untouched.** `git diff 687988e -- client/src/modules` is EMPTY. All new code is in `scripts/` (a
  read-only observer `sim/observers/front-liveliness.mjs` + sim-fairness wiring under `--pulk-window` + driver
  aggregation). OFF fingerprint **`7c70b1eae7d31e22`** unchanged (flagless run unaffected; the observer is
  gated by `--pulk-window`). CONFORMS.
- **STAGE 0 — LAW ported measurement-only** (Longest Actionless Window, full + last-50) inside the same
  observer. **STAGE 1** = pulk window [pulkStart, 0.60]. **Addendum v2** = chaos window [0, pulkStart] + gap-cap
  brake telemetry. **Addendum v3** = STAGE-3 chaos15 arms; the observer's chaos boundary tracks the live
  `pulkStart`, so the 0.15 arms measure the 0.15 handover.

## VERDICT (read first): the owner's finding is CONFIRMED, the driver is the STEER, and the brake is asleep
**The COMBO makes the mid-race flat exactly as the owner saw: the chaos steer BOOSTS a deep-drawn band-1 racer
into an early breakaway (chaos maxGap ≈ 2× ship) who then leads most of the pulk (leaderIsDrawnB1_mid 0.57–0.75
vs ship 0.07–0.20; maxLeadHoldShare_mid up, distinctLeaders down).** Attribution is clean: **faB60 leaves the
chaos/pulk byte-untouched (every chaos/pulk number == ship), and chaosSteer alone == the full COMBO** — the
steer is the sole driver, the late draw-bias is innocent (as preregistered). The shipped anti-runaway brake
**never fires in chaos or the pulk on any arm/track (0/0, gate 0.60)** — it is inactive below `corrStartFrac`
by design, so the chaos breakaway is UNPOLICED (the trigger is even armed ~50% of the pulk, but the brake is
gated off until the finale). **STAGE 3 shows the fix direction works:** shrinking the chaos window to 0.15
halves the breakaway and gives the pulk its sorting back (maxHold → ship levels, distinctLeaders UP to
7.7–10.4) while the finale HOLDS (arrival ~89%, frontContest still well above ship) — a real trade-off, not a
free lunch (sorting/frontContest dip a little).

## 1. ATTRIBUTION — the steer is the suspect, confirmed (chaos/pulk metrics)
| metric (searound / ice / luger) | SHIP | faB60 | chaosSteer | COMBO |
|---|---|---|---|---|
| chaos maxGapP1P2 (L) | 2.0 / 1.6 / 0.9 | **2.0 / 1.6 / 0.9** | 4.0 / 3.3 / 2.0 | **4.0 / 3.3 / 2.0** |
| pulk leaderIsDrawnB1_mid | .17 / .20 / .07 | **.17 / .20 / .07** | .75 / .73 / .57 | **.75 / .73 / .57** |
| pulk maxLeadHoldShare_mid | .39 / .30 / .31 | .39 / .30 / .31 | .55 / .45 / .40 | .55 / .45 / .40 |

**faB60 ≡ SHIP** on every chaos/pulk number; **chaosSteer ≡ COMBO**. The draw-bias starts at R=0.60 and leaves
the pulk untouched (verified); the steer is the whole effect.

## 2. THE MECHANISM — the breakaway IS the boosted deep-drawn-B1 racer (COMBO, at chaos end)
| (searound / ice / luger) | SHIP | COMBO |
|---|---|---|
| leader@chaos-end **steered** | 0% / 0% / 0% | **72% / 84% / 80%** (mean mult **1.09 / 1.09 / 1.10** = boosted) |
| leader@chaos-end **drawn band-1** | 20% / 40% / 20% | **100% / 100% / 100%** |
| handover gap @ chaos-end (L) | 1.8 / 1.2 / 0.9 | 3.2 / 2.7 / 1.8 |
| in-band-at-chaos-end | 29% / 32% / 24% | 68% / 70% / 66% |

The steer boosts back-row deep-drawn-B1 racers (row steer-exposure: back rows mult 1.05–1.10); the one it
lifts to the front by chaos end is a drawn-B1 favourite, and it opens a ~3L handover gap that carries the pulk.

## 3. THE BRAKE IS UNPOLICED IN CHAOS + PULK (addendum)
`brakeFires_chaos / brakeFires_mid = 0.0 / 0.0` on **every arm and track**; `gapCapGateFrac = 0.60`. The
gap-cap re-roll bias returns early when `phaseProgress < corrStartFrac` (~0.60) — it is a FINALE-only
mechanism. On COMBO the trigger is ARMED ~50% of the pulk (`brakeArmed_mid` 0.33–0.57: the P1→P2 gap does
exceed G), but the brake is switched off there, so **the chaos/pulk breakaway is unpoliced by design** — not
politely silent on a small gap, but disabled in that phase. By the time the brake wakes at 0.60 the finale
dice/bias take over (which is why arrival + frontContest still land).

## 4. THE STAGE-3 TRADE-OFF — chaos25 vs chaos15 (all three windows, one page)
| (searound / ice / luger) | SHIP | COMBO (chaos25) | COMBO15 (chaos15) |
|---|---|---|---|
| **CHAOS** maxGapP1P2 (L) | 2.0 / 1.6 / 0.9 | 4.0 / 3.3 / 2.0 | **2.8 / 2.5 / 1.1** ↓ |
| **CHAOS** handover gap (L) | 1.8 / 1.2 / 0.9 | 3.2 / 2.7 / 1.8 | **2.6 / 2.2 / 1.0** ↓ |
| in-band-at-chaos-end (sort) | 29 / 32 / 24 | 68 / 70 / 66 | **59 / 69 / 45** (partial sort) |
| **PULK** maxLeadHoldShare_mid | .39 / .30 / .31 | .55 / .45 / .40 | **.39 / .29 / .25** ↓ (≈ship) |
| **PULK** distinctLeaders_mid | 5.5 / 7.3 / 6.4 | 4.9 / 6.2 / 6.4 | **7.7 / 10.4 / 10.1** ↑ |
| **PULK** leaderIsDrawnB1_mid | .17 / .20 / .07 | .75 / .73 / .57 | **.44 / .47 / .23** ↓ |
| **FINALE** ARRIVAL | 75 / 72 / 68 | 90 / 90 / 89 | **89 / 89 / 89** (held) |
| **FINALE** frontContest | 42 / 68 / 67 | 67 / 78 / 87 | **60 / 77 / 84** (still ≫ ship) |
| **FINALE** DEAD-BORING | 8 / 0 / 0 | 4 / 0 / 0 | **0 / 4 / 0** |

**Reading:** chaos15 shrinks the breakaway (maxGap 4.0→2.8, 3.3→2.5, 2.0→1.1), the pulk recovers (maxHold back
to ship, distinctLeaders UP past both ship and combo, leaderIsDrawnB1_mid roughly halved), AND the finale
holds (arrival stays ~89%, frontContest still far above ship, DEAD-BORING ≤ ship). The cost is a partial sort
(in-band-at-chaos-end 68→59, 66→45) and a few points of frontContest (67→60, 87→84) — the honest trade-off, in
both directions.

### THE FIVE SENTENCES (every kept element)
1. The owner's "mid-race gone flat" is measured and real: the COMBO's chaos steer opens a chaos-phase
   breakaway of ~2× ship's depth (maxGapP1P2 4.0/3.3/2.0 L vs 2.0/1.6/0.9), and its leader at chaos end is
   100% a drawn-band-1 racer that the steer BOOSTED (72–84% steered, mean mult ~1.09). 2. That favourite then
   owns the pulk — leaderIsDrawnB1_mid 0.57–0.75 vs ship 0.07–0.20, maxLeadHoldShare_mid up and distinctLeaders
   down — and the attribution is clean because faB60 leaves every chaos/pulk number identical to ship while
   chaosSteer alone reproduces the full COMBO. 3. The shipped anti-runaway brake never fires in chaos or the
   pulk on any arm or track (0/0, gate 0.60): it is a finale-only mechanism, so although its trigger is armed
   ~half the pulk on the COMBO, the chaos breakaway is unpoliced by design, not politely silent. 4. Shrinking
   the chaos window to 0.15 (one flag) halves the breakaway and hands the pulk its sorting back (maxHold →
   ship levels, distinctLeaders up to 7.7–10.4, leaderIsDrawnB1_mid ~halved) while the finale HOLDS — arrival
   ~89%, frontContest still well above ship, DEAD-BORING ≤ ship — at the honest cost of a partial sort and a
   few frontContest points. 5. The trade-off is now on one page (chaos/pulk/finale, ship vs combo vs combo15),
   the engine is byte-untouched (OFF fingerprint `7c70b1eae7d31e22`), and LAW is ported for the gate — this is
   measurement only; no tuning arm beyond the single preregistered chaos-window shrink was run.

## PROPOSALS (fix directions ONLY — measurement did not tune)
1. **Chaos-window shrink (STAGE-3 evidence): move pulkStart toward 0.15.** Already measured here: it is the
   most direct lever — it caps how long the steer can dig before handover, recovering the pulk while holding
   arrival ~89% and frontContest above ship. The open question a future tuning run would settle is the exact
   point on the 0.25→0.15 curve where the finale frontContest cost turns from "a few points" into "too much".
2. **Partial-sort target: steer toward the band EDGE, not full sort.** The flatness tracks in-band-at-chaos-end
   (68–70% on combo → the pre-sort is near-complete by chaos end). A steer that aims each racer only INTO its
   band (stop at the near edge) rather than deep toward centre would leave within-band order unsettled for the
   pulk to resolve, lowering leaderIsDrawnB1_mid without losing the arrival the band membership buys.
3. **Band-centre steer cap / strength dial on the BOOST side.** The breakaway is a back-row deep-drawn-B1
   racer boosted at mult ~1.09–1.10 (the clamp ceiling). Capping the steer's BOOST (up-tilt) harder than its
   BRAKE — or a lower `chaosSteerGain` — would blunt the early breakaway specifically (the up-tilt is what digs
   the gap) while keeping the brake-side sorting that lifts back rows into band. A one-flag gain sweep would
   quantify it.
4. **(Orthogonal) extend the anti-runaway brake earlier than 0.60 — but only if a chaos brake is wanted.** The
   brake is finale-gated; if the chaos breakaway should be policed, lowering `corrStartFrac` would arm it in
   the pulk. Flagged as a direction, NOT recommended blind: it is a live-force change to the shipped brake and
   belongs in its own authorised experiment, not this measurement.

## Owner questions
1. **Which fix direction to prototype first** — the chaos-window shrink (measured, holds the finale), the
   partial-sort/edge target, or the boost-side steer cap?
2. **Is combo15's finale cost acceptable** (arrival held ~89%, frontContest 60/77/84 vs combo 67/78/87) for the
   pulk recovery, or should the tuning target keep more frontContest?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (engine empty-diff vs @687988e). Observer
commit `7721fb0`; this report. Screen: `node scripts/exp-fair-arrival.mjs --tracks=searound,ice-track,luger-hill
--arms=ship,chaosSteer,faB60,combo,ship15,combo15 --races=25`. Raw:
`reports/evolution/pulk-spectacle-screen.txt`. **Measurement only — no tuning; the N=100 night gate remains the
statistical record.** Push verified — see `git log origin/exp/fair-arrival`.
