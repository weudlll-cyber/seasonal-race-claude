# OUTCOME-TENSION — CC: a simple concept for tension to the last minute, band-fair

Concept search, read-only. Author: CC. I did not read the Copilot file or the other OUTCOME-FORCES inventory.
Verified at source (`racePlanner.js`, `storage/defaults.js`). Marked **not checked** where I did not verify.
No runs, no code, no fix design beyond "what changes in behaviour."

## The answer to "ask this first": the code already has the mechanism, switched half-off

The servo does not only steer to the exact rank. Its error is a **blend**:

> `error = strictness · rankError + (1 − strictness) · bandError`, where `bandError` is the signed distance
> OUTSIDE the racer's target **band** and is **0 whenever the racer is already inside its band**.

At `strictness = 1.0` the servo steers to the exact rank (rankError). At `strictness = 0` it steers to the
**BAND** — a racer anywhere inside its band produces `error = 0`, so `rawTarget ≈ 1.0`, so **no correction**.
Verified: `bandError` and `getAreaBounds(targetRank)` are computed every OUTCOME frame already; the bands are
`BAND_EDGES = [5, 15, 25, 40]` (B1 = 1–5, B2 = 6–15, B3 = 16–25, B4 = 26–40) — exactly the Owner's fairness
unit.

**Why it is not being used:** the pack's strictness is pinned at `choreoPackBandStrictness = 0.5` (heroes
stay at 1.0). At 0.5 the servo spends HALF its authority pulling pack racers toward their exact rank **even
when they are already inside a fair band** — steering that fairness does not require and that freezes the
within-band order. The lever to stop it already exists and is a single value.

**And there is a shipped precedent for "stop steering when safely in band."** `choreoReleaseProgress = 0.97`
already sets B1 heroes' `targetRank := currentRank` near the end, zeroing their error, "so the finish among
them is a genuine run-out … they are already bunched in their B1 cluster, so reordering within it stays in
band" (its own comment). The code already accepts that **in-band reshuffling near the finish is fair and
should not be steered.** The concept below is that same principle, applied to the whole pack across OUTCOME
instead of to B1 heroes in the last 3%.

## 1. The concept (behaviour)

**Loosen the pack's band-strictness toward 0 in OUTCOME: steer the pack to its BAND, not its exact rank.**

- A pack racer inside its assigned band drives at its natural speed (spread + drafting + braking) and is
  **free to gain or lose positions within the band** — that is the returned race action.
- A pack racer that drifts to a band EDGE and is pushed out is still corrected by `bandError` — band-reach is
  actively maintained.
- **Heroes are untouched** (strictness stays 1.0): their authored comebacks still land exactly, so the
  choreographed overtakes the project depends on still happen.

That is the whole change: one existing value, `choreoPackBandStrictness`, from 0.5 toward ~0 (the exact
setting is a re-gate question, not a claim). No new term, no new subsystem, no second force. It is the
Owner's key ("it is fair when he reaches his BAND") turned into the servo's actual objective.

**Honest scope limit, stated up front:** this addresses the "**no overtaking for ~50% of the track**" half of
the complaint — it unfreezes the pack. It does **NOT** address "**the winner just drives away**." A leader at
rank 1 is inside B1 (`bandError = 0`) whether it leads by one length or a hundred; the servo is rank/band-based
and, as established, **rank-space cannot see a gap**. Closing the leader gap needs a DISTANCE mechanism, which
is a separate and riskier step (see §5). I am not folding it into the simple concept, because doing so is
exactly the "two forces pulling opposite ways" trap.

## 2. Why it is fair — argued against the band

- The fairness gate is **band-reach ≥70% AND 0 Holm-unfair**. At strictness 0 the servo's finite authority
  (±10% boost / −15% brake) is spent ENTIRELY on band violations instead of split with within-band rank
  correction — so band correction is applied HARDER, not softer. **Band-reach should hold or improve**, by
  construction: the objective the servo optimises becomes band membership itself.
- The finish order does become **more random WITHIN a band** — a racer drawn for B1 may finish 1st or 5th by
  luck and drafting. The Owner explicitly declared this fair ("drawn first may finish 5th and it is still
  fair"). Across bands the assignment is unchanged. So the concept moves randomness from where fairness does
  not care (within-band rank) while preserving what it does care about (which band).
- **Not checked:** the current band-reach number and how much margin it has above 70%. I do not have that
  measured; the re-gate provides it. My claim is directional (band-reach preserved/improved), and it must be
  verified, not assumed.

## 3. Why it is natural — it inherits an existing bound and fires LESS

OUTCOME has no envelope of its own — but this concept does not need one. The servo's output is already
hard-clamped to `[minMult 0.85, maxMult 1.1]` (the ±10/−15% authority). At strictness 0 most racers produce
`error = 0 → rawTarget ≈ 1.0`, so the servo fires **less often and in a narrower range than today** — it is
strictly more natural, not less. The explicit bound is the existing `[0.85, 1.1]` clamp; no new number is
introduced. (This is the same reason `computePulkBiasedTarget` is naturalness-safe — it clamps to the natural
spread band — but here we do not even add a force; we remove steering, so the only speeds left are the ones
the chain already produces.)

## 4. What it costs

- **Values changed:** one — `choreoPackBandStrictness` (in `racePlanner` config). **One source.** It appears
  to be a pinned default (grep found it only in defaults, not DevScreen — **DevScreen wiring not fully
  checked**); exposing it as the single "Action" slider (0 = free/tense, 1 = strict/exact) fits the standing
  "~5 knobs + ONE Action slider" goal with zero new subsystems.
- **Fingerprint:** moves (a `racePlanner` behaviour change). **Full fairness re-gate required** — band-reach
  ≥70%, 0 Holm-unfair, on all tracks, sim path (which shares the same controller).
- **Gates:** the fairness re-gate is the only hard gate; there is no `raceBehavior.js` change, so the
  lateral-behaviour NO-GO tests are untouched.

## 5. Second-order effects

- **Lottery risk:** within-band order becomes luck-driven, but the field spread is **unchanged** (±8%
  `spreadFactor` is the same; the concept removes steering, it does not compress the field). So it is not a
  bunching-into-a-photo-finish lottery — it is the existing spread expressing itself in position changes that
  the servo currently damps. Band membership stays deterministic.
- **Back of field:** not starved — B3/B4 racers are still corrected to their bands and gain MORE within-band
  freedom, so the back gets more action, not less.
- **Fighting the servo:** none — this IS the servo, reconfigured. No opposing force is introduced (the trap
  that cost weeks before is avoided precisely because nothing new pulls against it).
- **The leader gap:** untouched (§1). If the Owner also wants the runaway leader reined in, the only
  naturalness-safe, shipped tool is `computePulkBiasedTarget` — a genuine distance bias (`pulkCenterT −
  thisRacer.t`) that clamps to the natural spread band, so it can never produce an unnatural speed. It is
  gated to PULK and to 3 `pulkRacerIds` today; its hook (the re-roll draw) still runs in OUTCOME to 95%, so
  extending it there is mechanically possible. **But** it biases speed on DISTANCE inside the fairness-critical
  OUTCOME, so it changes what OUTCOME guarantees and must be re-gated hard — it is a separate, higher-risk
  step, not part of the simple concept. I flag it; I do not recommend folding it in.

## 6. The measurement that proves or kills it (before any build)

Two metrics, and the split matters because **rank-space cannot see a dead race**:

- **Fairness (rank/band-space, hard gate):** band-reach ≥70% and 0 Holm-unfair, at strictness 0 vs 0.5. If it
  falls below 70% anywhere, the concept is dead on arrival.
- **Tension (the concept's purpose):** count **within-band position changes per race during OUTCOME** — an
  overtake IS a rank swap, so rank-space is the correct space for THIS metric (unlike a dead-race gap). If
  within-band overtakes do not rise materially at strictness 0, the concept does nothing and is dead.
- **Cross-check the leader gap (gap-space, in racer lengths):** the shipped gap-metrics (frontmost-gap,
  final-third over-fraction, in lengths — the project already has these because rank-space cannot see a dead
  race). This will show whether Concept A alone leaves the leader still driving away (it likely will, §1),
  which decides whether the harder §5 distance step is also wanted. **Not checked:** I did not run these; the
  existing gap-metric observer would produce them.

## 7. Honest verdict

**A simple, band-fair, naturalness-safe concept for the frozen-pack half of the complaint exists, and it is
one existing value.** It uses the Owner's exact fairness unit (the band), reuses a mechanism already computed
every frame (`bandError`), has a shipped precedent (`choreoReleaseProgress`), introduces no new force, inherits
the existing speed clamp, and should preserve or improve band-reach. That is as close to "simple to implement"
as this codebase offers.

It is **not a complete answer to the Owner's words**: it will not stop the winner driving away, because that
is a gap, and the servo cannot see gaps. If the Owner accepts "race action returns to the pack, the leader may
still pull clear," Concept A is the recommendation and it is small. If he insists the LEADER must be reined in,
that requires the distance step (§5), which is neither simple nor fairness-free and should be decided
separately after Concept A is measured. **DON'T-FIX remains legitimate** — OUTCOME currently delivers the
band-reach the whole project rests on, and Concept A's only real risk is that band-reach margin, which the
re-gate must confirm before anything ships.

## Hygiene (separate)

- `choreoPackBandStrictness` at 0.5 means the pack is *already* half-released from exact-rank steering, but
  the value is a pinned default with (apparent) no DevScreen surface — a tuning lever hidden from the owner.
- The `bandError` machinery is fully built and runs every frame, yet at the shipped strictness it only ever
  contributes half-weight and never dominates — a capability shipped but throttled.
- The `choreoReleaseProgress` release and the `bandStrictness` blend encode the SAME idea ("in-band is fair,
  stop steering") in two different places with two different mechanisms (target=currentRank vs strictness
  blend). Not a bug, but two expressions of one principle — worth unifying conceptually before adding a third.
