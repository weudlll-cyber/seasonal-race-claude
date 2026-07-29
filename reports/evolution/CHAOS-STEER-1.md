# CHAOS-STEER-1 — the owner's Part 1, built PROPERLY and measured ALONE

**Branch `exp/fair-arrival` @a96fa7a (ship world; sim-only, master untouched). Author: CC.** Flag-gated
`chaosSteer` (default OFF → flagless fingerprint **`7c70b1eae7d31e22`**, == the shipped game, byte-identical,
asserted on the committed state). This isolates the owner's Part 1 — a continuous chaos-phase pull toward the
drawn band — measured alone against Ship with the standard method (in-band-at-chaos-end scorecard + the full
dual scoreboard). faB60 (the FAIR-ARRIVAL-1 draw-bias cache) is carried as context only; no combined arm.

## 1. BUILD-vs-SPEC CONFORMANCE (mandatory, FIRST)

- **Continuous gentle pull, not a draw bias.** `chaosSteer` steers a racer OUT of its DRAWN band toward that
  band every physics tick during the chaos phase, via a `trajectoryMult` target — the servo actuator, not the
  re-roll draw. Racers IN their drawn band get target 1.0 (untouched). CONFORMS.
- **Sanftheits-Regel (unit-checked, per-tick smooth).** The pull is applied through `_setTarget`, which the
  shipped ease slews toward — the mult never snaps. Measured: **maxTickΔ ≤ 0.0103** over the whole screen (the
  eased `trajectoryMult` changes ≤ ~1%/tick). CONFORMS — smoothness PROVEN, not asserted.
- **Two-sided clamp respected.** The target is `clamp(1.0 + gain·clamp(csErr,−5,5), 0.85, 1.10)` — both the
  brake floor and the boost ceiling are the shipped envelope. Measured meanMult **0.979–0.980** (a net-gentle
  brake, well inside the clamp). CONFORMS.
- **Ends exactly at chaos end.** The pull TARGET is authored only while `phaseProgress < pulkStart`; from the
  chaos boundary on, no new steer is written and the finale runs ship's path. (Honest nuance: the slew-eased
  `trajectoryMult` for a racer still out of band at the boundary decays over ~one ease-length into early PULK —
  the Sanftheits-Regel forbids an instant snap-to-1.0; there is no NEW force after chaos.) CONFORMS in intent.
- **THE GRIP FIX (why "built properly" was needed).** The pre-existing ARM A (`chaosAnchor`) was **dead code**:
  the pre-outcome pin early-return (`racePlanner.js` ~L601) `return`s during the whole chaos phase, BEFORE the
  per-racer steer block below it could ever run — so ARM A never gripped (which is why FAIR-ARRIVAL-1's only
  win was ARM B, the draw bias, which lives in the re-roll, not the servo). `chaosSteer` computes
  `chaosSteerNow` and skips that early-return during chaos so the steer block is reached. OFF → identical
  early-return → byte-identical.

## 2. SMOKE (before the screen) — N=8 on ice: the steering MOVES the formation → PASS

| | in-band-at-chaos-end | steeredTicks | meanMult | maxTickΔ |
|---|---|---|---|---|
| ship | 31% | 0 | n/a | 0.0000 |
| **chaosSteer** | **64%** | 18036 | 0.981 | 0.0088 |

In-band-at-chaos-end **rises 31% → 64%** — the steer grips hard and moves the chaos-end formation. The grip
gate is met, so the screen ran (had it been unmoved, the protocol was to STOP and report the grip problem — the
grip problem was in the OLD dead code, and this build fixes exactly that).

## 3. SCREEN — searound + ice, N=25, paired vs Ship

| arm · track | ARRIVAL (Δship) | **in-band@chaos-end (Δship)** | frontContest (Δship) | DEAD-BORING (Δship) | rowMin · Holm |
|---|---|---|---|---|---|
| ship · searound | 75% | 29% | 42% | 8% | 66% · UNF |
| ship · ice | 72% | 32% | 68% | 0% | 65% · ok |
| **chaosSteer · searound** | **78% (+3)** | **68% (+39)** | **67% (+25)** | **4% (−4)** | 71% · UNF |
| **chaosSteer · ice** | **79% (+7)** | **70% (+38)** | **77% (+9)** | **0% (+0)** | 77% · UNF |
| faB60 · searound *(context)* | 89% (+14) | 29% (+0) | 42% (−0) | 8% (+0) | 86% · UNF |
| faB60 · ice *(context)* | 89% (+17) | 32% (+0) | 67% (−1) | 8% (+8) | 86% · UNF |

Steer telemetry (chaosSteer): **share steered 91–93%**, ~18k steered-ticks/race, **meanMult 0.979–0.980**,
**maxTickΔ 0.0071–0.0103**.

## VERDICT (read first): Part 1 WORKS — and it is action-POSITIVE, not action-neutral

**The direct Part-1 scorecard is a decisive win: in-band-at-chaos-end rises +38/+39pp (29→68, 32→70) — the grip
the dead ARM A never had, smooth and clamped.** Two findings beyond the brief, both honest and both reported:
**(1) the early sort carries through only PARTIALLY** — line arrival rises just +3/+7pp (to 78%/79%, below the
90% owner gate), because ship's post-chaos re-roll re-scatters a chaos-sorted field; chaos-only sorting is not a
full-arrival solution alone (that is what the draw-bias faB60 does: +14/+17pp to 89%, but with a FLAT chaos-end
formation — it sorts LATE, not early). **(2) the preregistered "action ≈ ship" expectation is REJECTED, in the
GOOD direction** — chaosSteer RAISES frontContest **+25pp on searound (42→67) and +9pp on ice (68→77)** while
holding/improving DEAD-BORING (searound 8→4, ice 0→0), because a band-sorted chaos-end hands ship's own re-roll
a tighter, more contestable front to work on: the FORMATION the steer leaves persists into the finale even
though the FORCE ends. The watchdog: the per-row floor rises (rowMin 66→71, 65→77) but Holm flags a start-row
skew on ice (ok→UNF) — the steer perturbs the start-row distribution and that needs a fairness look before any
ship.

### THE FIVE SENTENCES (every kept element)
1. `chaosSteer` applies a continuous, clamped, per-tick-smooth pull during the chaos phase only, easing each
   out-of-band racer toward its drawn band and leaving in-band racers untouched, with the pull target ending at
   chaos end. 2. It is built PROPERLY — reachable — by skipping the pre-outcome pin early-return during chaos,
   the return that made the old ARM A dead code and is the reason it never gripped. 3. The direct Part-1
   scorecard confirms the grip: in-band-at-chaos-end rises 29→68% (searound) and 32→70% (ice), at meanMult
   0.98 (a gentle brake inside the two-sided clamp) and maxTickΔ ≤ 0.010 (smoothness proven, not asserted). 4.
   The early sort carries through only partially to the line (+3/+7pp arrival, short of the 90% gate), so chaos
   steering alone is not the arrival solution — the draw-bias faB60 raises the line far more (+14/+17pp) by
   sorting late instead. 5. The preregistered action-neutral expectation is rejected in the good direction:
   sorting the field into bands by chaos end makes ship's own re-roll produce MORE front contest (+25/+9pp) at
   equal-or-lower DEAD-BORING, and the OFF world is byte-identical (`7c70b1eae7d31e22`).

## PROPOSALS (≥2)
1. **Screen the combined chaosSteer + draw-bias (A+B) — the two are complementary and this run measured them
   apart on purpose.** chaosSteer gives the ACTION and the early sort (+25/+9pp frontContest, +38/+39pp
   chaos-end) but only +3/+7pp at the line; the draw-bias faB60 gives the LINE arrival (+14/+17pp to 89%) but
   flat action. Their strengths are disjoint, so A+B is the natural candidate to clear the 90% arrival gate
   WHILE keeping (or raising) front contest — one paired N=25 screen, both levers on, vs Ship and vs each alone.
2. **Resolve the Holm start-row skew before any ship.** chaosSteer lifts the per-row FLOOR (rowMin +5/+12pp) but
   turns ice Holm-unfair (ok→UNF) — the pull is not start-row-neutral. Diagnose which start rows it over- or
   under-serves (the steer's caErr is symmetric in rank but the drawn-band map is not symmetric across start
   rows) and clamp the per-row exposure so the floor gain does not come with a distributional skew.
3. **Keep the in-band-at-chaos-end scorecard as the standard Part-1 metric.** It is the number that cleanly
   separates an early-sorter (chaosSteer +38/+39pp) from a late-sorter (faB60 +0pp) — two mechanisms with
   near-identical line arrival deltas would otherwise read the same. It should be the preregistered scorecard
   for any future chaos-phase lever.

## Owner questions
1. **Authorise the A+B combined screen** (proposal 1 — chaosSteer for action + early sort, draw-bias for the
   line, to clear 90% with front contest intact) — yes/no?
2. **chaosSteer is action-positive on its own; is that a keeper** as a shippable front-contest lever (default
   OFF, byte-identical) independent of the arrival gate, once the Holm skew (proposal 2) is resolved?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (== shipped, byte-identical; `chaosSteer`
defaults OFF). Build commit `a25e09c`; this report. Screen: `node scripts/exp-fair-arrival.mjs --races=25`. Raw:
`reports/evolution/chaos-steer-screen.txt`. **Screen-only (stopped per protocol).** Push verified — see
`git log origin/exp/fair-arrival`.
