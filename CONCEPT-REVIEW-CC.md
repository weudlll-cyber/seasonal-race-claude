# CONCEPT-REVIEW-CC — Error-Threshold Release with Cooldown

**Reviewer:** CC (implementer review) | **Date:** 2026-07-19 | **Concept Owner:** Walter
**Scope:** code feasibility · hot-path cost · FORCE-PARITY gotchas · simpler alternatives · test-harness
**Note on file path:** the concept asked for `/mnt/user-data/outputs/CONCEPT-REVIEW-CC.md`; that is a Linux/sandbox path and does not exist on this Windows host. Written to the repo root instead. I did **not** read any Copilot file before writing.

---

## VERDICT (one line)

The *effect* the concept wants is sound and cheap to build, but the design as written carries **one real fairness bug (the time-cooldown suppresses re-steer)** and **more machinery than it needs**. Recommend: implement it as **hysteretic strictness on the pack only**, drop the time-cooldown in favor of spatial hysteresis, and keep heroes on their existing curve + 0.97 release. That version is lower-risk, reuses the line-600 blend, and inherits parity for free.

---

## THE FOUR FINDINGS THAT MATTER MOST

### F1 — The time-cooldown is a fairness trap (must fix before any sweep)

The concept's re-steer rule is:
> IF racer is released AND (**cooldown elapsed** AND error exceeds re-steer-threshold) → Re-steer

So during the cooldown window the servo stays **off no matter how far the racer drifts**. That is exactly the failure mode near the finish: a released pack racer with a high `spreadFactor` drifts *up* out of its band (or a slow one drifts *down*), and for 0.5–1.5 s **nothing corrects it**. In a 60 s race the OUTCOME phase is ~22 s (60→97%); a 1.5 s uncorrected drift late in that window can leave the racer past its band edge with too little runway to re-converge before the resolve checkpoint → **band-reach < 70%**. This is question 21 (the "cooldown trap") and question 9 (endpoint creep) combined, and it is not hypothetical — it is the direct consequence of gating *re-steer* on the cooldown.

**Fix:** the flicker guard should be **spatial hysteresis**, not a time window. Release at `bandError == 0`; re-steer at `bandError > reSteerThreshold` (e.g. 1 rank past the edge) — **regardless of any timer**. The gap between those two thresholds *is* the anti-flicker mechanism: once released you don't re-engage until clearly out; once re-steering you don't release until fully back in. If a time-guard is still wanted, apply it to **re-release only** (prevent snapping the servo back off the instant you re-enter), and **never let it suppress re-steer**. This removes the bug and deletes a timer's worth of state.

### F2 — Build it as strictness modulation, not a new release state machine (answers Q13, and it's better)

Line 600 of `racePlanner.js` already is the release knob:
```js
const error = strictness * rankError + (1 - strictness) * bandError;
```
When a pack racer is inside its band, `bandError == 0` by construction. So:
- `strictness = 1` inside band → `error = rankError` → **fully steered to exact rank** (today's static feel).
- `strictness = 0` inside band → `error = bandError = 0` → **fully released** (the freedom the concept wants).
- outside band → `strictness = 1` → `error = rankError` → **full re-steer**.

That means the entire concept collapses to a **hysteretic function `strictness(bandError, wasReleased)`** applied at the existing blend — no separate "release/re-steer" boolean machine, no second error path, no new target-writing code. It reuses `_setTarget` and the slew unchanged. Strongly recommend this framing: it is smaller, it can't desync from the blend, and it's trivially flag-gated to byte-identical-off (`strictnessInsideBand` default = current strictness).

### F3 — Heroes must be excluded (answers Q10 + Q15, and it's the same wall we already hit)

The concept says heroes release on `rankError ≈ 0`. Two problems:
1. **It flattens the authored choreography.** A hero mid-curve that momentarily sits at its curve-target would get `error = 0` and coast off its curve — the curve *is* the drama, so releasing the hero deletes the thing we're paying for. This is the exact hero/servo conflict that stopped the previous spec.
2. **Double-release on B1 heroes (Q10).** B1 heroes already release at `phaseProgress ≥ 0.97` (racePlanner.js:569-579). A second error-threshold release firing at, say, 0.85 creates two interacting release conditions on the same racer — extra state, extra edge cases, zero benefit.

Also note `sampleHeroCurve` returns a **fractional** target rank, so hero `rankError` is fractional and *would* need an epsilon compare — whereas pack `bandError` is integer-exact and needs none. Excluding heroes makes the float question (Q3) disappear entirely.

**Recommendation:** pack-only release/loosening; heroes stay 100% on curve + the existing 0.97 B1-release. This resolves Q10, Q15, and the hero-scope conflict in one move.

### F4 — Cooldowns shorter than the slew are meaningless (bounds the sweep, Q16)

The slew (`trajectoryTransitionDuration`) is **1.0 s** by default. A target change is smoothed over that full second, and `_setTarget` re-anchors `prev` to the *current* actual `trajectoryMult` on every retrigger (racePlanner.js:383), so there is no discontinuity to guard against on sub-second timescales. Testing 0.1 s / 0.25 s cooldowns is wasted compute — they're below the smoothing time constant and change nothing observable. If a time-guard survives F1 at all, sweep **1.0 / 1.5 / 2.0 s**. (If F1 is adopted and the guard is spatial, sweep the **re-steer threshold in ranks** instead: 0.5 / 1.0 / 1.5.)

---

## CODE FEASIBILITY — where this lives and what it costs

**Where:** entirely inside the servo loop of `createTrajectoryController.update()`, `racePlanner.js` ~lines 554-621. The band bounds `[areaLo, areaHi]` are already computed at line 591; the inside-band predicate already exists at line 610 (`currentRank >= areaLo && currentRank <= areaHi`). The change is: compute per-racer released-state, then either (recommended F2) pick `strictness` accordingly before line 600, or (concept-literal) override `error = 0` after line 600. **Before vs after the blend (Q1):** with the strictness framing the question dissolves — you set `strictness` *before* the blend and the blend does the rest. With the override framing, zero *after* the blend (override the result). Either works; the strictness framing is cleaner.

**State (Q2):** must be **per-racer**, not per-group — racers enter/exit their bands at different frames, so one shared timer is simply wrong. Store it in **closure-scoped `Map`s keyed by `r.index`** inside `createTrajectoryController` (the controller is constructed once per race, so the Maps reset per race automatically — no manual teardown). Key by `r.index`, never by object identity — see the known `renderInterpolation` object-identity bug; `r.index` survives the spread-copies. If F1 is adopted, the only state needed is `wasReleased` (one boolean Map); the timer Map goes away.

**Hot-path cost:** negligible. The loop already runs ~40 racers × ~3,750 frames/race. The addition is an O(1) Map get/set + 2-3 comparisons per racer per frame, no allocation. Not a concern.

**Q6 (jerk on re-steer):** handled by the existing slew. On re-steer, `_setTarget` sets `prev = current trajectoryMult`, `transStart = now`, and the easeInOutCubic runs from there over 1.0 s (sim-fairness.mjs:1076-1082). No hard step. **Q8 (slew reset / overshoot):** no reset needed and no overshoot — `prev` is re-anchored to the *actual* current value on every target change (racePlanner.js:383), so the ease always starts where the racer really is. **Q7 (fade window / phaseWeight):** there is **no `phaseWeight` on the servo error** — the "Line 88-97 fade" is `areaBonusMult` (the transEnd easeInOutCubic) and, more recently, `rowEnvMult`; both are *multiplicative on the t-update*, downstream and independent of the servo error. Release does not interact with them; nothing to bypass. (Heads-up: the line numbers in the concept doc don't map to `racePlanner.js` — line 88-97 there is the areaBonus base-delta table, and line 569 is the B1-release, which is correct.)

**Q3/Q4 (thresholds & units):** `rankError` and `bandError` are both in **rank units**; for the pack `bandError` is an exact integer, so `== 0` is safe with no epsilon. A uniform rank threshold is dimensionally fine, but note it means different things relative to **band width** (B1 spans 5 ranks, B2 spans 10): 1 rank past the edge is 20% of B1 but 10% of B2. Either accept absolute ranks (simpler) or express the re-steer threshold as a fraction of band width (more uniform). Minor.

**Q12 (simultaneous releases):** the servo is fully per-racer — each racer owns its own `trajectoryMult` target/prev/transStart. There is no shared servo resource; N racers releasing at once is N independent computations. No collision. **Q20 (thrashing):** bounded by (a) per-racer independence, (b) the 1 s slew, and (c) — critically — the spatial hysteresis from F1. With a non-zero release↔re-steer gap there is no chatter. Different `spreadFactor`s and reroll phases give natural stagger. Low risk *provided* the re-steer threshold > 0.

---

## PARITY (FORCE-PARITY) — can this ship without breaking it?

Yes, and more cleanly than the previous flag-gate attempt, **because the state lives inside the shared controller** (`racePlanner.js`), which both the browser (`index.jsx`) and the sim (`sim-fairness.mjs`) call. Put the logic in `update()` and both engines inherit it identically — that's the parity win the project's own Sim-Browser Parity Rule expects.

Two gotchas:
1. **The clock (Q5).** If any time-guard survives, it must read the **same racing-phase ms** both engines already pass to `update()` (`raceTs`). Do not introduce a second clock. (This is another reason to prefer F1's *spatial* hysteresis — no clock, no clock-divergence risk at all.)
2. **Flag default = off must be byte-identical.** With the strictness framing, `strictnessInsideBand` defaulting to the current effective strictness (1.0 open / 0.5 choreo-pack) yields the exact same `error` → provable via `node scripts/fingerprint-default.mjs` (expect the unchanged combined hash with the flag absent). The threading has to go through `createRacePlan`'s config read (`racePlanner.js` ~line 264 area) **and** the sim's hand-wired config literal (`sim-fairness.mjs` ~line 2699) — there is no generic passthrough, so both edits are required to even run it in the sim.

**On "sim-only first" (Q5):** you can and should validate in the sim behind the flag, but because the mechanism is in the shared module, "sim-only" is just "flag-off in the browser." I'd wire it flag-gated with a DevScreen toggle from the start (matches the everything-UI-configurable principle) so the eye-test runs the identical code the sim measured.

---

## SIMPLER ALTERNATIVES (Q13, Q14, Q15)

- **Q13 (dynamic strictness):** yes — this *is* the recommended implementation (F2). Not just "achieves the same freedom" — it's the same math with less state.
- **Q15 (pack-only hybrid):** yes — recommended (F3). The concept's "heroes release on rankError ≈ 0" is, in my read, the wrong call; heroes should stay on curve.
- **Q14 (B2-hero attack curves = Experiment B):** from an implementer-risk standpoint, **Experiment B is the lower-risk way to buy OUTCOME action**, because it works *inside* the existing `heroCurveGenerator` pipeline and never touches the pack's fairness-critical servo path. Trade-off: release gives **emergent, field-wide** reordering (organic but harder to bound); B2 attack curves give **authored, specific** duels (controllable, fairness-safe by construction since curves are cast within-band and end in-band). If the goal is "OUTCOME looks alive," I'd rank: **(1) B2 attack curves** (safest, authored), **(2) pack-only strictness release with spatial hysteresis** (this concept, de-risked), **(3) the full state-machine-with-time-cooldown** (do not build as written). They're also **composable** — B2 curves for the marquee duel + gentle pack loosening for background motion.

---

## MEASUREMENT / TEST-HARNESS

**What the sim needs (all flag-gated, byte-identical off):**
- Two config keys threaded `sim-fairness.mjs` → `createRacePlan`: the release-enable + threshold(s).
- **A new OUTCOME rank-change metric — this does not exist today.** The only rank-swap counter (`amSwaps`) is gated to the PULK window. Add an OUTCOME-gated per-frame swap counter (copy the `amSwaps` pattern into an `if (getPhase(...) === 'OUTCOME')` block), plus per-race **`releaseCount` / `reSteerCount`** counters surfaced from the controller. Thread them out of `runSingleRace` → per-combo aggregate → summary.
- **Q17 (freedom metric):** rank-change frequency in ranks 1-5 per OUTCOME + total swaps/OUTCOME/race are the right primary signals. `corridorViolationSum` does **not** capture this (it measures Σ|rankError|, i.e. distance from exact rank — a *steering* quantity, not a *reordering* one). Add position-variance-over-OUTCOME as a secondary diagnostic.
- **Q18 (fairness timing):** measure band-reach at the **endpoint (final rank)** — that's the definition of fairness and what `rawData.finalRank` already gives. Continuous in-band measurement *would* inflate the signal with transient strays. But add a **diagnostic-only** "fraction of OUTCOME frames spent out-of-band" per band — that's the early-warning gauge for the F1 trap, without turning noise into a gate.

**Gates for the sweep (unchanged from house rules):** B1 band-reach ≥ 70% (primary), 0 Holm-unfair start rows (secondary), fingerprint unchanged with flag off. Per house preference, run a **~8-race smoke** across the 4 tracks first to validate the wiring and the new counters before the full 100×4 sweep.

---

## ANSWER INDEX (for traceability)

Q1 → strictness framing dissolves it (set before blend). Q2 → per-racer, closure `Map` by `r.index`. Q3 → pack `bandError` integer-exact, no epsilon; heroes fractional (moot if excluded). Q4 → rank units, uniform ok but band-width-relative. Q5 → shared-module = parity-safe; flag+DevScreen from start. Q6 → slew smooths, no jerk. Q7 → no `phaseWeight` on error; fades are multiplicative & independent. Q8 → prev re-anchors to current, no reset/overshoot. Q9 → **at risk under the time-cooldown (F1)**; safe under spatial hysteresis. Q10 → exclude heroes; avoid double-release. Q11 → yes, released racers drift to edges (that's the action) — bounded by re-steer. Q12 → per-racer, independent. Q13 → yes, and it's the recommended build. Q14 → Experiment B is lower-risk; composable. Q15 → yes, pack-only. Q16 → drop sub-slew cooldowns; 1.0/1.5/2.0 s (or threshold-in-ranks). Q17 → new OUTCOME swap + release/re-steer counters; `corridorViolationSum` insufficient. Q18 → endpoint for the gate, continuous only as diagnostic. Q19 → release at `bandError==0`, re-steer ~1 rank out; calibrate via smoke. Q20 → bounded by hysteresis + slew + per-racer independence. Q21 → **the core bug**; fixed by making re-steer cooldown-independent (F1).

---

## BOTTOM LINE

Green-light the *effect*, not the *mechanism as drawn*. Build the **pack-only, strictness-based, spatially-hysteretic** version; heroes stay on their curves. Drop the time-cooldown (or restrict it to re-release). This keeps the change inside the shared controller (parity for free), reuses the line-600 blend and the existing slew, and removes the endpoint-fairness trap before it ever reaches a sweep. If action still falls short, layer Experiment B (B2 attack curves) on top rather than loosening the pack further.
