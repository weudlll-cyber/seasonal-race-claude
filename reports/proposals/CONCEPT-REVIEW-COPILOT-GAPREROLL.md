# CONCEPT REVIEW (Copilot) — Gap-Aware Re-Roll

Reviewer: Copilot. Independent review; the other reviewer's file was not read.
Basis: read of `client/src/screens/RaceScreen/index.jsx` (re-roll schedule and browser call site),
`scripts/sim-fairness.mjs` (sim parity path), `client/src/modules/racePlanner.js`
(`computePulkBiasedTarget`, controller state, current sim-only leash hook),
`client/src/modules/raceLengths.js`, `client/src/modules/storage/defaults.js`,
`client/src/screens/RaceScreen/reRoll.test.js`, and `docs/CONCEPT-COHESION.md`.
No code changed.

## TL;DR

- **Recommendation: BUILD, modified.** The concept is a good fit for the existing cohesion instrument
  because it attacks the measured escape source directly: `spreadFactor` is the natural speed delta and
  the re-roll path already owns it.
- **The critical limit is cadence, not math.** Under the current defaults the re-roll interval is about
  9.5 seconds, and the measured median runaway-gap formation point (`progress 0.783`) lands almost exactly
  on a nominal late-race roll boundary. That means some leaders will react almost immediately, but many
  will have just rolled and may not get another scheduled draw until very late or not at all.
- **Because of that, the design must stay what the concept says it is:** a deterministic bias of
  whichever scheduled re-rolls happen while the gap condition is true. I do **not** recommend an extra
  triggered early re-roll in this version. That changes the mechanism from "loaded dice" into an event
  actuator and is much more likely to read as a hand on the race.

## Architecture As It Actually Is

- The **periodic re-roll does not live in `raceStep.js`**. The shared per-frame speed application is
  `advanceRacerT()` in `client/src/modules/raceStep.js`, but the *re-roll scheduling and draw* live inline
  in two places: the browser loop in `client/src/screens/RaceScreen/index.jsx` and the fairness sim loop in
  `scripts/sim-fairness.mjs`.
- The **shared cohesion hook already exists** in `client/src/modules/racePlanner.js` as
  `computePulkBiasedTarget(...)`. Both browser and sim do the same thing: generate one `rawSample`, pass it
  into that helper, clamp the returned value into the spread band, then apply the normal
  `spreadFactorPrev/Target` transition.
- The **current defaults are late and sparse**: `reRollIntervalDivisor = 10`,
  `reRollLastPositionPercent = 95`, `reRollTransitionDuration = 3.0` in
  `client/src/modules/storage/defaults.js`. That yields `rollCount = max(2, floor(realizedDuration / 10))`
  and `rollInterval = 0.95 * realizedDuration / rollCount`, which is about **9.5 seconds** for the normal
  30/60/90 second durations. The test contract in `client/src/screens/RaceScreen/reRoll.test.js` confirms
  the schedule formula.
- The **existing smoothing is already naturalness-safe**. A re-roll does not step speed instantly; it
  eases `spreadFactor` to the new target over `reRollTransitionDuration` using `easeInOutCubic`.
- The **shared gap-length plumbing is already available**, but currently only used in the sim-only front
  leash path: `leaderGapLengths(...)` in `scripts/sim/observers/runaway-parade.mjs`, backed by
  `arcT` and `lenScaleFrom` in `client/src/modules/raceLengths.js`.

## Feasibility

### Core fit: good

This idea is much more native to the current architecture than a new controller force. The measured escape
source is the leader's natural `spreadFactor`, and the only existing in-race randomness that moves that
value is the re-roll. So a gap-aware bias is operating on the correct variable with the correct existing
mechanism.

The clean implementation shape is:

1. Leave the schedule where it is today, in the browser and sim re-roll call sites.
2. Keep the single random draw per event exactly as today.
3. Add a **shared deterministic transform** in `racePlanner.js` that takes `rawSample` plus a small gap
   context and returns a biased target, exactly like `computePulkBiasedTarget(...)` does now.
4. Reuse `leaderGapLengths(...)` and the shared racer-length conversion so browser and sim read the same
   gap in the same unit.

That is feasible without changing the force chain or adding a new multiplier.

### Main limit: cadence latency

The schedule is the real risk.

At the shipped defaults, the roll interval is about 9.5 seconds. The measured median runaway-gap formation
progress is `0.783`. On a 60 second realized race that is about 47.0 seconds. The nominal late-race roll
times are about `9.5, 19.0, 28.5, 38.0, 47.5, 57.0`. So the median formation point lands almost exactly on
the penultimate nominal roll.

That creates a split outcome:

- If the leader has **not** taken that roll yet, latency is small and the biased draw can begin easing in
  almost immediately.
- If the leader **already** took that roll a little early because of the per-racer `±20%` jitter, the next
  scheduled opportunity is close to a full interval later and may land very near the finish or miss the
  `lastRollDeadline` entirely.

So the concept is architecturally sound, but its effect will be timing-sensitive by design. That is not a
correctness bug, but it does mean this mechanism is weaker and less reliable than a per-frame control term.

## Answers To The Open Questions

### 1. Bias shape

Use a **downward-shifted distribution with strength proportional to excess gap**, not a hard ceiling cap.

Why:

- A hard cap will pin many leaders to the same top-of-band value and is more likely to read as scripted.
- A proportional shift preserves the existing random texture inside the honest spread band.
- It is less parade-prone because it reduces the runaway leader's natural edge without forcing the front to
  converge to one narrow pace.

The safest shape is: keep the existing `rawSample`, then deterministically blend it downward toward the
band midpoint or another conservative anchor as `gap - threshold` grows. Do not draw an additional random
value.

### 2. Cadence and latency

The current schedule in source is:

- `rollCount = max(2, floor(realizedDurationSec / reRollIntervalDivisor))`
- `rollInterval = (reRollLastPositionPercent / 100 * realizedDurationSec * 1000) / rollCount`
- each racer gets per-roll jitter of `±20%` of `rollInterval`
- a roll fires only when `now >= nextRollTime && now < lastRollDeadline`

Under the shipped defaults that is about one roll every 9.5 seconds, with the last eligible scheduled roll
at about 95% race progress.

For a median formation point at `0.783`, latency is **sometimes acceptable and sometimes not**. The concept
therefore stays logically correct at any cadence, but its strength degrades sharply as cadence gets sparser.

An **extra triggered early re-roll is not recommended** for this version. It breaks the concept's core
claim that this is just a bias on the existing cohesion dice, it changes the event count per racer, and it
creates a stronger visible intervention risk. If the owner wants a stronger rescue, that is a different
mechanism and should be named as such.

### 3. Scope

Not rank-1 only. Use the **detached front group**, defined as the front prefix whose internal consecutive
gaps are still contest-sized but whose trailing gap to the rest of the field exceeds the threshold.

Reason: if two racers escape together, rank-1-only bias can turn a runaway into the owner-forbidden
manufactured duel. Biasing the detached prefix instead pulls the breakaway group back toward the pack and
supports the stated requirement that multiple racers fight.

The clean definition is a front-group version of the existing observer logic:

- internal front-group gaps must stay below a small contest bound
- the gap from the group's tail to the next racer behind is the escape gap that triggers the mechanism

### 4. Code home and parity

The periodic re-roll lives inline in:

- `client/src/screens/RaceScreen/index.jsx`
- `scripts/sim-fairness.mjs`

It does **not** live in the shared `raceStep.js` path.

The right shared home for the new logic is `client/src/modules/racePlanner.js`, beside
`computePulkBiasedTarget(...)`, either as a sibling helper or a generalized re-roll bias helper.

Yes, the gap input can reuse the existing shared length plumbing bit-identically:

- `leaderGapLengths(...)` from `scripts/sim/observers/runaway-parade.mjs`
- `arcT` and `lenScaleFrom` from `client/src/modules/raceLengths.js`

I would not route this through `update()` because this mechanism is evaluated at re-roll time, not in the
per-frame controller pass. Compute the gap at the re-roll caller with the shared helper, then pass the
result into the shared bias function.

### 5. Interactions

No structural conflict with hero release semantics, but there is stacking risk.

- A released B2 attacker or a B1 front-contest hero can still receive a biased `spreadFactor` draw because
  re-roll affects `baseSpeed`, not `trajectoryMult`.
- That is conceptually okay: release means "stop steering the rank target," not "freeze natural speed."
- The real interaction is additive slowing. The servo already mildly brakes late leaders; a strong hard-cap
  re-roll bias would stack on top of that and over-flatten the finish.

This is another reason to prefer a soft proportional bias and to disengage once the front is contested.

### 6. Window derivation and fairness

Start exactly at **live `choreoOutcomeStart`**. Do not add a second offset unless measurement shows a real
problem. The gap forms late enough already; delaying the first eligible biased roll would only weaken the
mechanism.

The end needs more care. The concept's `[choreoOutcomeStart, last scheduled roll]` derivation is valid, but
the **effect** of a roll fired near that last scheduled point persists through the 3 second transition. So
if the owner wants a cleaner natural run-out, the practical end should be derived from the same schedule as
"the last roll whose transition can substantially settle before the finish," not simply the last nominal
roll slot.

Fairness risk exists. Because a biased spread draw persists until the next re-roll, repeated down-bias on a
B1 leader can push it deeper than intended. I recommend the same kind of guard used in the leash concept:
disengage once the biased racer falls to about live rank 3, or once the detached front group is no longer
detached.

### 7. Naturalness

The existing re-roll smoothing is the naturalness guarantee:

- `spreadFactorTarget` changes only at the re-roll event
- `spreadFactor` eases to that target over `reRollTransitionDuration`
- the easing curve is `easeInOutCubic`

So there is no direct visible speed step if the bias only changes the target and reuses the normal path.

What can still look artificial is **duty cycle**: if the same leader keeps drawing visibly suppressed values
for most of the run-in, the mechanism will read as invisible brake-by-repetition even though each individual
draw is smooth.

## Risks And Edge Cases

### Parade compression

This concept is safer than chaser-lift because it never boosts the pack, but it can still create parade risk
if the bias is too strong or the detached front group is defined too generously. That is why the bias
should stay soft and why the trigger should key on a true detached-group gap, not on every ordinary front
spacing fluctuation.

### Cadence blind spot

The median formation point sitting on a nominal late roll is the biggest practical weakness. Some seeds will
respond quickly; others will miss the useful window. This will show up as high variance in effect size.

### Finish leakage

A biased roll fired late still eases through the last seconds of the race. Without a derived end guard, the
concept can quietly reshape the run-out more than the plain `[OutcomeStart, last roll]` wording suggests.

### RNG and determinism

Determinism is straightforward only if the bias is a pure transform of the existing `rawSample`. A second
random call or a triggered extra draw would complicate parity immediately.

## What The Concept Misses

1. It talks about the current rank-1 racer, but the owner's anti-duel rule really points to a **detached
   front-group** definition, not a single-racer definition.
2. It does not call out that the re-roll **schedule is duplicated**, while the best shared home is only the
   bias transform, not the entire event.
3. It does not distinguish between **window eligibility** and **visible effect window**. With 3 second
   easing, a late biased roll is still active after the last draw fires.
4. It does not name **duty cycle** as a first-class product risk. Smooth individual draws are not enough if
   the same leader is biased repeatedly.

## Recommendation

**Build modified.** Keep the mechanism as a deterministic bias on already-scheduled re-rolls, not as an
extra event trigger. Implement it as a shared bias helper in `racePlanner.js`, reuse the existing shared
racer-length gap conversion, and scope it to a detached front group rather than only rank 1. Use a soft,
proportional downward shift, start at live `choreoOutcomeStart`, and add a derived late-window guard so the
transition does not quietly own the finish. Also add a rank/group disengage floor to protect B1 band-reach.

This is a plausible naturalness-first mitigation, but it is cadence-limited by construction. I would build
it as an experiment worth measuring, not as a guaranteed sole path to the `<10%` runaway target.