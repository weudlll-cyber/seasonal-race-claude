# System rescue, round 3 — the actual problem — CC

**Report-only. Author: CC. Branch context; written for master. No code, no sims.** The world restated
(identical racers, mass start from staggered rows, fairness = equal win-chance from every start row) changes
everything. Written without reference to the Copilot file.

## The problem in one sentence, and the shape of every answer

Identical racers + a mass start ⇒ the naive winner is "whoever started in front" (clear track vs.
fight-through-traffic). Making that fair means **the start order must stop mattering by the finish** — the
finish order must become *independent* of the start row. The shipped world did this by secretly assigning
each racer a random target rank and steering to it (fair but dead — Lesson 181). Without that scripted
servo, there is only one honest way to make the start order stop mattering: **MIXING** — the field must
genuinely re-order itself, by honest position-fighting, enough that where you started is forgotten. So the
whole question reduces to: **what honest force mixes an identical-racer pack fast enough to wash out the
start row — while the mixing IS the action?** Fairness and action stop being in tension the moment the same
mechanism produces both. All three proposals below are different mixing engines; they are ranked by how
rigorously and cheaply they make the start row disappear.

The load-bearing sub-problem, which the project has always tripped on: with identical racers a lone leader
has **clear track** and can string out a lead on a lucky streak that an identical-speed pack **cannot** close
faster — i.e. the front-runner (usually a front-row starter) escapes and mixing never completes. The servo
"fixed" this by braking/steering. The honest fix is a force that makes **leading cost more than following**,
so no one escapes and the pack stays together to mix. That force is real and has a name in every mass-start
sport: **the draft**.

---

## Proposal 1 — DRAFTING PELOTON: no one escapes, so the pack mixes (BUILD FIRST)

**What the viewer sees.** All identical racers launch together from the staggered rows. Immediately they
bunch into a pack, because leading into clear air is hard work and sitting in the draft behind someone is
easy — so a racer who noses ahead is soon swallowed, and the field churns like a cycling peloton: racers
surge out of the draft to attack, get caught, drop back to shelter, and constantly trade places. Whoever is
"in front" changes continuously. It comes down to a pack sprint to the line, and by then it is anyone's
race — a back-row starter is as likely to take it as a front-row one.

**Start-row fairness mechanism (the crux, rigorously).** Two claims.
- *No escape.* A lone leader runs at its honest pace against full drag; any chaser within the draft runs at
  its honest pace **plus** the draft benefit. Since the draft benefit is positive and the honest pace
  variation is symmetric and identical across racers, a chaser's expected closing speed exceeds a lone
  leader's — so any gap is closed in expectation. The field is therefore held to a **bounded** pack (the
  ONE calibration: the draft benefit must exceed the rate at which honest variance opens gaps).
- *Symmetric mixing.* Inside a bounded pack, the dynamics — honest iid pace variation, symmetric drafting,
  symmetric no-overlap traffic — are invariant under relabeling the racers; the ONLY thing that breaks that
  symmetry is the start positions, and inside a churning bounded pack the correlation between a racer's
  start position and its current position **decays with a mixing time τ_mix**. If the race lasts longer than
  τ_mix, the finish position is independent of the start row, so **P(win | row) → equal for every row.**

This is a *per-race* fairness (it holds over the honest randomness of a single race, by symmetry once the
start washes out) — not a season average — and it is directly **measurable** as win-chance-by-row. The draft
is what makes it provable: it bounds the pack (claim 1) so mixing completes (claim 2). Remove the draft and
the leader escapes, the start row never washes out, and it is unfair — which is exactly the project's
history (Proposal 3 tests this).

**Why action is inherent.** The pack is dense and churning by construction: overtaking means pulling out of
the draft into clear air (costly) or waiting for a lane, so racers are *legitimately blocked* by those ahead
(the desired blocking) and constantly fight for the sheltered positions. There is no dead-finish failure
mode — a bounded churning pack always sprints.

**Honest motion + 0 overlaps.** Reuse the PROTO-2 traffic core verbatim (forward-gap cap + clearance-checked
lane changes + honest holding; proven 0 overlaps across seeds on both tracks). Add ONE honest force: a draft
speed benefit for a racer within a slipstream zone behind another. Both are continuous, physical, no
teleport.

**Simple and clean.** *Identical racers, mass start, no-overlap traffic, and a draft.* No servo, no target
ranks, no assignment, no phases, no dice. One new rule (the draft), ~2 parameters (benefit, zone). If it
needs more, it is the wrong build.

**What survives.** Rendering, camera, tracks, the PROTO-2 traffic/blocking core, and the shipped
drafting/slipstream force (real physics, reused as the foundation not a bolt-on). **Dies:** the servo, slot
assignment, hero choreography, phases, re-roll — the entire scripted control model.

**Cost + prototype + kill.** New foundation reusing the proto-2 core. Cheapest sim-first prototype
(experiment branch): identical-racer mass start from real staggered rows + proto-2 traffic + a draft;
~200 seeds/track on luger-hill + searound; the fairness observer is **win-chance by START ROW** (bucket
racers by their start row, count wins). **KILL if** win-chance is not ~uniform across rows (a residual
front-row edge survives), OR the pack fragments (an escape group forms so back rows can't win), OR making it
fair needs a per-track draft strength.

**Prior art.** The cycling peloton, mass-start speed skating, the marathon pack, NASCAR / F-Zero draft
packs — every mass-start sport where the field stays together *because leading is costly*, and the winner
comes from the pack, not from the front of the grid.

**Recommendation (1):** the one mechanism that makes start-row fairness and honest action the SAME
phenomenon, with a provable-and-measurable fairness argument.

---

## Proposal 2 — SECTOR SPRINTS: many fair finishes, aggregated (robust fairness + action everywhere)

**What the viewer sees.** Same identical-racer mass start and drafting pack as Proposal 1, but the winner is
not "first across the finish" — it is the best CUMULATIVE result across a handful of **sprint lines** spread
through the race (and the finish). Every sprint line is a mini-finish the pack fights for, so the drama is
distributed across the whole race, not saved (and lost) at one line.

**Start-row fairness mechanism.** Aggregation. The FIRST sprint may still slightly favor front rows (less
time to mix); but each later sprint is contested after more pack churn, so its result is progressively
decorrelated from the start row. Averaging K sprints dilutes the residual start-row bias by ~1/K **and**
kills it further as the later sprints mix — the aggregate score is start-row-independent well before a single
finish would be. It is a strictly *more robust* version of Proposal 1's fairness (it does not depend on the
mixing being complete by the one finish line — it only needs the field to mix *between* sprints).

**Why action is inherent.** There are now many finishes: every sprint line is a full-pack battle, so the
race is contested end-to-end and cannot go dead at the last line (there is always another line, or the last
one is just one of many). Blocking and jostling are the same as Proposal 1.

**Honest motion + 0 overlaps / simple / survives.** Identical to Proposal 1 (proto-2 core + draft) plus a
scoring layer: K evenly-spaced sprint lines (one global spacing rule) and cumulative-rank scoring. The extra
rule is the scoring; still no servo/assignment/dice.

**Cost + prototype + kill.** Proposal 1's prototype plus sprint-line scoring. Fairness observer:
**win-chance by START ROW on the aggregate score.** **KILL if** the aggregate win-chance is not ~uniform
across rows, OR the field does not mix between sprints (so early front-bias dominates the aggregate), OR the
scoring needs per-track sprint placement.

**Prior art.** Sprint stages / intermediate sprints in cycling, biathlon and decathlon (aggregate of many
events), sector scoring — formats that make "the whole thing" the contest and average out any single
start advantage.

**Recommendation (2):** build if Proposal 1's single-line mixing leaves a residual front-row edge — the
aggregate is the cheapest way to make the fairness robust while spreading the action across the race.

---

## Proposal 3 — VARIANCE-ONLY (the null test: is the draft actually necessary?)

**What the viewer sees / concept.** The minimal version: identical racers, mass start, honest bounded pace
variation, the no-overlap traffic core — and **no draft.** Positions diffuse by raw honest variance and
whatever mixing the traffic provides; the hope is the field shuffles enough by the line that the start row
washes out.

**Start-row fairness mechanism.** Diffusion mixing alone. This is the hypothesis the project implicitly
relied on for years (the re-roll as "the thing that spreads the field") — and my strong prior, from the
whole rescue history, is that it **fails**: without the draft a lucky leader on clear track strings out a
gap an identical-speed pack cannot close, the field fragments, the start row does NOT wash out, and the
front rows win more. It is worth building precisely because its **failure proves the draft is the missing
ingredient** — it isolates the one variable between "dead/unfair" and Proposal 1.

**Everything else / cost.** Same proto-2 core, minus the draft — the cheapest of all. Fairness observer:
win-chance by START ROW. **KILL** (expected) if win-chance skews to the front rows or the field fragments;
**PASS** (and a huge simplification) in the unlikely event raw variance mixes fairly on its own, at which
point the draft is unnecessary.

**Prior art.** Marble races / one-make spec racing on their own (identical equipment, pure chaos) — thrilling
when the course keeps the field together, unfair-feeling when a marble breaks away and is never caught,
which is the same escape problem.

**Recommendation (3):** run it first *as a control* — it is the near-free experiment that tells you whether
Proposal 1's draft is doing the fairness work or the honest variance already does. Either result is decisive.

---

## Closing line

**Build Proposal 1 (Drafting Peloton) first — it is the only concept whose start-row fairness is provable
(the draft bounds the pack so mixing completes, making the finish order independent of the start row) and
whose action, including desired blocking, is the very same pack churn; run Proposal 3 (variance-only) as the
near-free control that confirms the draft is what makes it fair, and reach for Proposal 2 (sector sprints)
only if a single finish line leaves a residual front-row edge to average out.**
