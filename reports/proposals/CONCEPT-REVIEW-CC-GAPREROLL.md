# CONCEPT REVIEW (CC) — Gap-Aware Re-Roll

Reviewer: Claude Code. Independent review; the other reviewer's file was not read.
Basis: read of the re-roll path in `scripts/sim-fairness.mjs` + `client/src/screens/RaceScreen/index.jsx`,
`computePulkBiasedTarget` and the release logic in `client/src/modules/racePlanner.js`, the re-roll
config in `client/src/modules/storage/defaults.js`, and `docs/CONCEPT-COHESION.md`. Plus the three
committed measurements (baseline / formation `b4a1327` / speed-source `9b51380`). No code changed.

## TL;DR

- **BUILD — modified.** This is the right lever for the *measured* cause and the first proposal that
  fits the owner's constraints. The speed-source diagnostic proved the runaway is **drift-driven**
  (spreadFactor 1.080 vs 1.031), and the re-roll is exactly the instrument that re-draws spreadFactor,
  *upstream of and orthogonal to* the servo. It pulls the escapee **back into the dense pack**, which
  moves the new "within 3.0L of P1" metric the right way — the opposite of the leash, which strung the
  field further out.
- **Key finding: this concept is a narrower restatement of an already-designed instrument.**
  `docs/CONCEPT-COHESION.md` ("gap-cap re-roll bias" / "loaded dice within the honest range") already
  specifies the whole thing — generalizing `computePulkBiasedTarget` from `slice(0,3)`/PULK-only to a
  gap-triggered bias, the ±8.1% honest-band clamp, the dead zone, the **symmetric** draw, kill
  conditions, and the **servo-hierarchy invariant** (servo `[0.85,1.10]` outranks the ±8.1% band, so
  the re-roll can only police *drift* gaps — which is exactly the kind we measured). It even predicted
  the leash's failure: *"the disease is slow drift, so the medicine must be slow."* Build **that**
  design, not a new narrow one.
- **The one real risk is cadence, and it's the concept's own OWNER-CONSTRAINT-1 window that creates it.**
  At default cadence a 60s race throws only ~6 rolls (~9.5s apart); after the 3.0L gap forms (median
  progress **0.783**) only **~1 usable roll** remains. The fix is a **low threshold** so the bias engages
  on the *drift* (~1.5–2.0L, which crosses earlier) inside the window — not on the finished 3.0L gap.

---

## Architecture as it actually is (facts the review rests on)

- **The re-roll draw** (sim `sim-fairness.mjs:1109–1138`, browser `index.jsx:1087–1123`):
  `rawTarget = spreadFactor + (rng−0.5)·2·halfWidth` (halfWidth = spreadRange·`reRollVariationPercent`
  75%), then **`computePulkBiasedTarget`** biases it, then a clamp to the honest band
  `[BASE_SPEED_MIN/MEAN, BASE_SPEED_MAX/MEAN]` (±8.1%), then a **3.0 s `easeInOutCubic`** ramp to the new
  spreadFactor (`reRollTransitionDuration`). No new RNG downstream of the draw.
- **The bias hook is SHARED; the re-roll loop is DUPLICATED.** `computePulkBiasedTarget`
  (`racePlanner.js:831–859`) is exported and called by both engines — but the re-roll *scaffolding*
  (schedule, draw, transition) is copy-pasted between `index.jsx:1087–1123` and
  `sim-fairness.mjs:1109–1138` (the sim even adds a `--rerollVariant` branch the browser lacks). This is
  a parity surface the leash never touched (the leash lived entirely in the shared `update()`).
- **`computePulkBiasedTarget` is gated to PULK AND to 3 racers** (`racePlanner.js:840` phase gate;
  `:846` `pulkRacerIds` = `shuffled.slice(0,3)`). It nudges each of the 3 toward the pulk centroid t.
  The concept's "make it gap-aware" = generalize this exact function (CONCEPT-COHESION proposes deleting
  the PULK gate and the 3-racer restriction).
- **Re-roll schedule (defaults):** `reRollIntervalDivisor 10`, `reRollLastPositionPercent 95`
  (`defaults.js:260–261`). `rollCount = max(2, floor(durationSec/10))`; `rollInterval =
  0.95·durationSec·1000/rollCount`; `lastRollDeadline = 0.95·durationSec·1000` (a **time** cutoff).
  → **60s race: 6 rolls, ~9.5 s apart, last ≈ 57 s (progress ≈ 0.95).** 30s: 3 rolls. 120s: 12.
- **Speed chain / servo hierarchy:** spreadFactor feeds `baseSpeed`, one factor in
  `baseSpeed·…·trajectoryMult·… ` (`raceStep.js:115` `advanceRacerT`). trajectoryMult is servo-clamped
  `[0.85,1.10]` (wider than the ±8.1% re-roll band) — so the re-roll can only correct *drift*, never a
  servo-driven gap. Measured: the runaway IS drift (trajectoryMult was 0.952, i.e. braking; areaBonus,
  row, boost, governor all 1.000). The tool fits the cause.

---

## Answers to the numbered questions

**1 — Bias shape: symmetric, proportional-to-excess, honest-band-clamped, with a dead zone. Not a hard
cap.** Match CONCEPT-COHESION's "loaded dice": below the cap the draw is untouched (dead zone → bit-exact
no-op when OFF); above it, shift the draw toward the slower end proportional to the gap excess, clamped
to the ±8.1% band. Symmetry is the parade-safety mechanism — a racer that overshoots into a *hole* draws
*faster*, so the bias self-limits; you cannot compress the field by pulling everyone down. A hard ceiling
cap at the chaser median reads as a wall and removes that self-limiting symmetry — avoid it. Proportional
strength also means it eases to zero as the gap closes (like the leash's proportional brake, but on the
*input distribution*, not the applied speed).

**2 — Cadence: this is the central risk. Latency ≈ one rollInterval (~9.5 s at default), which is large
against the ~13 s left after progress 0.783. A triggered early roll is NOT acceptable.** The math: after
the 3.0L gap forms (~0.783 ≈ 47 s in a 60 s race) only the ~47.5 s and ~57 s rolls remain, and the 57 s
roll + 3 s transition finishes at the line — so **~1 usable roll** if the trigger is 3.0L. That is too
weak. **Firing an out-of-schedule roll the moment the gap crosses would break the cohesion concept** —
it stops being "the same periodic dice" and becomes a reactive intervention that reads as an artificial
hand on the racer (exactly the failure mode the owner vetoed with the leash, and that CONCEPT-COHESION
rejects). **Resolution: keep rolls on-schedule, but engage on the DRIFT, not the formed gap** — a low
threshold (~1.5–2.0L). The formation data shows 1.5L is crossed materially earlier (29% of runaways
cross it in [0.60,0.75)), so at ~1.5–2.0L the 0.63 and 0.79 rolls both bias the leader down *before* the
3.0L runaway locks in. That converts the mechanism from "catch a formed runaway" (infeasible at this
cadence) to "damp the drift" (feasible) — which is precisely CONCEPT-COHESION's thesis. Accept that at
sparse cadences (e.g. 30 s → 3 rolls) the effect is weak; the concept already accepts graceful
degradation, and the design must never compensate by triggering rolls.

**3 — Scope: define "escaped" by the leader→P2 GAP, and let symmetry handle groups — don't special-case a
duo.** Bias whichever racer(s) are ahead of the cap. If two break away together, the *leader* is ahead of
the cap (biased down) and P2 is within its dead zone relative to P1 but may itself be ahead of P3 by more
than the cap (also biased down). Because the rule is per-racer "am I more than G ahead of the car
behind?", a detached duo is naturally pulled back without any "manufactured duel" logic — and symmetry
prevents it from becoming a 2-car parade (if the duo over-slows into the pack, the dead zone re-opens).
This is cleaner than a rank-1-only rule and matches CONCEPT-COHESION's whole-pack framing. Rank-1-only
would leave a breakaway *pair* untouched (each within the other's dead zone) — a gap the whole-pack rule
closes.

**4 — Code home & parity: put the bias in the SHARED controller method; thread `lenScale`/`isOpen` (not a
precomputed gap) so the method computes the gap itself.** Generalize `computePulkBiasedTarget`
(`racePlanner.js:831`) — or add a sibling `computeGapBiasedTarget` — and have it call the shared
`leaderGapLengths` (already the ONE source, reused from Phase 1a). The gap input therefore reuses Phase
1a's shared length path **bit-identically**. Caveat the leash did not have: the re-roll *loop* is
duplicated (`index.jsx` + `sim-fairness.mjs`), so **both** call sites must pass the same
`lenScale`/`isOpen` — two edits, a parity surface. Keep the length math inside the shared method so only
the argument plumbing is duplicated, and gate byte-identity with the fingerprint (flag OFF → the method
early-returns rawSample, as `computePulkBiasedTarget` already does outside PULK).

**5 — Interactions: none harmful; the factors are orthogonal.** The re-roll acts on **spreadFactor**;
hero release acts on **trajectoryMult/strictness** — different factors in the same product, so they
compose without fighting. A band-arrival B2-attacker runs free in *B2* (mid-pack, `racePlanner.js:689–712`)
— rarely the rank-1 escapee, and if it ever is, biasing its spreadFactor down is exactly what we want.
The front-contest B1 release at 0.97 (`:641–651`) happens *after* the last roll fires (~0.95), so no roll
interacts with it. The servo already brakes the leader (trajectoryMult 0.952); the re-roll bias stacks
*cooperatively* (both pull down, different factors). The servo-hierarchy invariant only bites if the
servo were *boosting* the escapee — it isn't — so the re-roll has clear authority over this drift gap.

**6 — Window & fairness: respect OWNER-CONSTRAINT-1, but note it fights the very doc this builds on; a
rank floor is likely UNNECESSARY here.** Deriving the window as `[choreoOutcomeStart, last-scheduled-roll]`
(both config-relative, zero hardcoded constants) is the right hygiene and directly addresses OUTCOME
root-cause #1. **But flag the tension:** CONCEPT-COHESION applies the bias *whole-race* (it deletes the
phase gate entirely), and the drift begins before 0.60; restricting to `[choreoOutcomeStart, lastRoll]`
throws away the early rolls that make the cadence work. Within the constraint, the mitigation is again a
*low threshold* so the window's first rolls (≈0.60–0.70) engage immediately. On fairness: the draw is
always clamped to the honest ±8.1% band, so no racer is pushed to an unnatural speed — band-reach should
hold (the servo still steers everyone to their target rank; the re-roll only removes the leader's *length*
edge, a within-B1 reorder). A rank floor (leash-style, disengage at rank ≥3) is probably **unnecessary**
because the *symmetric* bias + dead zone self-limits — once the ex-leader falls into the pack its gap
collapses (dead zone → normal dice) and if it over-falls it draws faster. Verify band-reach/Holm in the
sweep rather than pre-adding a floor.

**7 — Naturalness: the existing 3.0 s `easeInOutCubic` ramp guarantees no one-frame step.** Each biased
draw is reached over `reRollTransitionDuration` (3 s), zero-slope at both ends — it reads as the racer
easing off, not a hand on it. The honest residual risk (CONCEPT-COHESION already flags it): *repeated*
downward draws in succession can read as "held," even though each step is smooth. Mitigate with the dead
zone + proportional strength (the bias vanishes as the gap closes) so the leader isn't dragged every roll
— and keep the leader duty-cycle kill condition from CONCEPT-COHESION as a watch metric.

---

## Risks / edge cases

- **Cadence weakness at default (the headline risk).** ~1 usable roll after 0.783 at a 3.0L trigger.
  Mitigated by a low threshold (engage on drift). Report the per-cadence roll count so a config change
  (`reRollIntervalDivisor`) that starves the mechanism is visible, not silent.
- **Parade compression: LOW** (much lower than the leash). Pulling the escapee back *into* the dense pack
  raises "within 3.0L of P1" without detaching a group; symmetry prevents over-slowing into a front duo.
  Still gate `paradeFinishRate ≤ 2%`.
- **Determinism/parity: the duplicated re-roll loop.** Two call sites must pass identical `lenScale`;
  the fingerprint (flag OFF → byte-identical) is the gate. This is the main net-new maintenance surface.
- **Band-reach:** clamped to the honest band, so low risk — but verify, since the escapee is usually the
  B1 target racer and the whole point is to let it be caught.
- **Over-correction into a *new* runaway** (as the leash suffered): far less likely because the re-roll
  doesn't touch the chasers' speeds or the servo — it only removes the *leader's* natural edge, and
  symmetry re-opens the dead zone once the gap closes. Watch anyway (the leash "reshuffle" surprised us).

## What the concept misses / should add

1. **It is CONCEPT-COHESION's mechanism.** State that explicitly and build the *designed* instrument
   (symmetric, dead zone, honest-band clamp, generalize `computePulkBiasedTarget`, its kill conditions +
   abort rule), not a narrower leader-only/OUTCOME-only variant. The narrowing (rank-1 only, window from
   choreoOutcomeStart) is what creates the cadence weakness and the duo blind spot.
2. **Threshold, not window, is the effectiveness lever.** The cadence math (this review) shows a 3.0L
   trigger leaves ~1 usable roll; a ~1.5–2.0L trigger uses the whole window. Make `gapRerollThresholdLengths`
   the primary knob and start the sweep low.
3. **The new "within 3.0L of P1" gate is the mechanism's best argument** — it is *designed* to move that
   number (pull the escapee into the pack), unlike the leash. Lead with it.
4. **Whole-race vs OUTCOME-window is a genuine owner decision**, because CONCEPT-COHESION (the foundation)
   is whole-race and the drift starts before 0.60. Surface it: honoring OWNER-CONSTRAINT-1 as written is
   defensible for hygiene, but the owner should know it discards the early rolls the cohesion design relies on.

## Recommendation

**BUILD, modified — as the CONCEPT-COHESION "gap-cap re-roll bias," flag-gated OFF (byte-identical).**
Specifically: (a) generalize `computePulkBiasedTarget` into a shared gap-aware bias (symmetric,
proportional, dead zone, honest-band clamp) computing the gap via the shared `leaderGapLengths`;
(b) make `gapRerollThresholdLengths` the primary knob and sweep it LOW (~1.5–2.0L) so on-schedule rolls
damp the *drift* — never trigger an off-schedule roll; (c) window `[choreoOutcomeStart, reRollLastPositionPercent-derived last roll]`, zero hardcoded constants, but flag the whole-race tension for the owner;
(d) no rank floor initially (symmetry self-limits) — verify band-reach/Holm in the sweep; (e) parity via
the shared method + fingerprint gate; (f) carry CONCEPT-COHESION's kill conditions (leader duty-cycle,
"held" read) as watch metrics. This is the first mechanism whose *tool matches the measured cause*
(drift/spreadFactor) and whose side-effect (escapee → back into the pack) directly serves the "multiple
racers in a fight" goal. The leash failed because it fought a drift gap with a servo-space brake; this
fights a drift gap with the drift instrument. Ship it behind flags, sweep threshold-first, let the data
(runawayWinnerRate + within-3.0L + parade + band-reach) decide.
