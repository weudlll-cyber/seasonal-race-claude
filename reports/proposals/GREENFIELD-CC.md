# GREENFIELD (CC) — "Schedule, don't steer"

Independent ground-up proposal. Written without reading any other proposal. No simulations were run
for this document; every number quoted is from measurements already committed in this repository.

---

## 0. The diagnosis this design is built on

Today's system **steers rank with speed, in real time, against a field that is also being steered.**
That single choice is the source of the complexity the owner is feeling.

Rank is a *global, discrete* quantity: a racer's rank depends on where everyone else is. To change it
you must change relative distance, which takes time and speed authority you do not have much of. So a
rank controller is a many-body feedback loop, and it needs clamps to stay natural, phases to stay
tractable, bands to stay fair, strictness to let heroes through, release points to hand the finish
back, checkpoints so the bands resolve, and a curve generator to give it something to follow. Every
one of those exists to patch a consequence of the first choice.

Three of the measured lessons are really the same lesson wearing different hats:

- *the servo saturates after ~2 ranks of error* — the loop has almost no authority;
- *late choreography has no runway* — the loop is asked to act when no time remains;
- *braking the leader reshuffles into bigger escapes* — closing a loop on one racer perturbs all of them.

**So: stop closing the loop.** Compute the whole race before the start, from the seed, as a set of
per-racer position-over-time trajectories. Play them back open-loop. There is no controller, no
error, no clamp, no saturation — because there is nothing to correct.

The objection is obvious and I take it seriously in §5: *does that look scripted?* My claim is that
today's system is already fully authored (Fisher-Yates assignment, hero curves, band checkpoints) —
it just authors *badly*, by fighting physics at runtime instead of respecting it at design time. This
design authors the same thing, earlier, where the constraints can actually be satisfied.

---

## 1. Core mechanism

Three layers. Only the first is a control system; the other two are a lookup and a decoration.

### 1.1 The schedule (the only real mechanism)

Before the start, from the seed alone, generate for every racer a **rank trajectory** `ρᵢ(p)` — a
smooth real-valued curve over race progress `p ∈ [0,1]`, from its actual grid position to its assigned
finishing tier.

The schedule is built by thinking in **crossings**, not positions. Any finish order is reachable from
any grid order by a sequence of adjacent transpositions — one transposition is one overtake — and the
number required is exactly the inversion count between grid and assignment. That count is the race's
action budget, and it is *handed to us for free* by the fact that the assignment is independent of the
grid. The generator's job is only to decide **when** each crossing happens.

It schedules them under one constraint, checked at design time with the whole race as runway:

> converting `ρᵢ(p)` to a position needs a speed, and that speed must stay inside the natural band at
> every instant, for every racer.

Position comes from the rank trajectory through a **field-shape function** `G(r, p)` — the gap from
the leader to rank `r` at progress `p` — so

```
sᵢ(p) = s_leader(p) − G(ρᵢ(p), p)
```

`G` is common-mode: it describes how stretched the field is, not who is where. Differentiating gives
each racer's speed, and the design-time check is `|vᵢ/v̄ − 1| ≤ band` everywhere. If a crossing is too
steep, it is moved earlier or spread wider — an operation available at design time and structurally
unavailable to today's runtime servo.

### 1.2 Common-mode track modulation (free naturalness)

Multiply *every* racer's speed by a shared function of **track position** `v_track(u)` derived from
curvature: slow into corners, quick down straights. Identical for all racers at the same point, so its
fairness cost is exactly zero, and it is not a control system — it is a lookup on geometry the repo
already has.

What it buys is large. A field running a shared speed profile **concertinas continuously**: gaps open
on the straights and close under braking, entirely for free. That is most of what makes real racing
look alive, and today's engine has essentially none of it — speed is close to flat, so the field
drifts apart monotonically and only differential speed can ever bring it back.

It also places overtakes where the eye expects them: a scheduled crossing timed to a corner exit reads
as a racer getting a better run, because the geometry supports the story.

### 1.3 Bounded zero-drift jitter (life, not outcome)

Add per-racer noise `εᵢ(p)` to position: seeded, smooth, **bounded and zero-mean by construction** —
formally the derivative of a bounded zero-mean function, so it perturbs speed without ever
accumulating into position.

This is the deliberate inversion of today's dice. The measured lesson is that *an honest ~5% draw edge
moves a racer through the field decisively* — which is exactly why runaways exist. The problem is not
that the dice are random; it is that they **integrate**. A persistent draw is a permanent speed
advantage and its effect grows without bound.

So: **keep the dice, remove the drift.** `ε` gives visible, unpredictable, alive motion and authors
nothing.

> This is also why this proposal is *not* "liberation again". Liberation failed (−6% action) because
> releasing racers left them with *persistent* draws that integrate into monotone separation — free
> drift settles into smooth order, exactly as measured. Zero-drift jitter cannot do that: bounded `ε`
> means bounded position error, forever, with no feedback needed to hold it.

---

## 2. Fairness — formal definition and why it holds

**Assignment.** Before the start, each racer is assigned an outcome **tier** independent of grid row
(as today).

**Definition of "deliver" — Tier Exactness.**

> A race *delivers* iff **every** racer finishes inside its assigned tier.
> The system's fairness metric is `tierExactness = (races where all racers finish in tier) / (races)`,
> and the design target is **1.000 — a per-race invariant, not a rate.**

This is strictly stronger than today's `band-reach ≥ 70%`, and it is cheaper to verify: it is a
boolean per race, it needs no pooling across ~300 races, and a single violation is a bug rather than a
statistical wobble. It is also honest about what it does *not* constrain (see below).

**Why the mechanism guarantees it.** Three independent reasons, in order of strength:

1. `ρᵢ(1)` is set to a rank inside racer `i`'s assigned tier when the schedule is generated. The
   finishing order is an *input*, not an outcome.
2. `G` is common-mode and `v_track` is common-mode, so neither can reorder anyone.
3. `ε` is bounded, and the generator asserts at design time that every **tier boundary** carries a
   final gap wider than `2·max|ε|`. So jitter can never move a racer across a tier edge.

**Start-row fairness is structural, not compensated.** The generator starts each trajectory from the
racer's *actual* grid position and ends it in its assigned tier. A racer on row 8 is handed a longer
climb — which is a *story*, not a handicap — and the assignment that produced it never saw the grid.
There is no compensation mechanism because there is nothing to compensate: row position affects the
shape of a racer's race, and by construction not its outcome. The measurable check is the one the repo
already runs: outcome distribution conditioned on start row, which is now exactly flat by construction
rather than flat-within-noise.

**What is deliberately left free.** Order *within* a tier is not authored — condition 3 only protects
tier boundaries. Inside a tier, racers are scheduled into close proximity and `ε` decides. So a
photo-finish for the win between two tier-1 racers is **genuinely undetermined until the line**, seed
notwithstanding. That is the suspense, and it is real rather than staged: the assignment fixes *which
tier*, the dice fix *which of them*.

A second measurable follows: `intraTierEntropy` — the Shannon entropy of intra-tier finishing
permutations across seeds. `tierExactness = 1.0` with `intraTierEntropy = 0` would mean the race is
fully scripted; the pair together is the honest statement of what is authored and what is not.

---

## 3. Emergent stories

These are consequences of the mechanism, not features bolted onto it.

**Comebacks and fades come from the assignment being grid-independent.** Whenever a racer's assigned
tier differs from its grid neighbourhood — which is most racers, most races — its trajectory is a
climb or a slide. A row-8 racer assigned tier 1 *is* a comeback; a front-row racer assigned tier 3 *is*
a fade. Today the system spends effort suppressing exactly this and then re-injects it with cast
"heroes"; here it is the default state of the field and requires no casting, no roles, no feasibility
filter. **Depth** is the one dial: route a trajectory deeper before it climbs, bounded by the speed
check.

**Midfield action is not a special case.** Every racer has a trajectory and crossings are scheduled
across the whole field, so the inversion budget is spent everywhere rather than concentrated on a
handful of cast heroes. Today the pack is pinned by servo strictness and the midfield is close to
static; here there is no pinning to remove.

**Front battles come from scheduling proximity, not lead changes.** This is the part I would most
defend. The measured baseline already shows the field *is* at the front — ≥3 racers within 3 lengths
for half the window in most races — and that `leadChangeCount < 3` in 93% of races is the binding
failure. The lead does not change because the servo pins rank, not because nobody is close enough.

So do not author lead changes. **Author the proximity and let `ε` do the swapping.** Schedule three or
four tier-1 racers into a sub-length window from ~60% onward; bounded jitter then trades the lead back
and forth unpredictably and continuously, with no mechanism aimed at rank 1 at all. Lead changes
become free and *genuinely* unscripted, while the schedule quietly guarantees that whoever emerges is
inside the assigned tier. This replaces the entire lead-carousel concept with a scheduling constraint.

**Suspense to the line** is the same mechanism plus the deliberate freedom of §2: nothing needs to be
resolved before the finish because intra-tier order was never authored.

---

## 4. Simplicity ledger

**Deleted outright**

| system | why it disappears |
|---|---|
| PULK / OUTCOME phase structure | phases exist to make a runtime loop tractable; there is no loop |
| `trajectoryMult` P-servo (gain, clamps, strictness, slew) | no feedback |
| Hero curve generator: casting, roles, feasibility, positive-budget, separation, hole guard | the schedule *is* the curve set, and feasibility is one global check |
| Per-band resolve checkpoints + release progress | tier delivery is structural, not a deadline |
| `areaBonus` | a fairness nudge with no job left |
| Start-row compensation | subsumed into trajectory generation |
| Gap-reroll, role-biased dice, lead carousel, pulk bias, director/governor | all are outcome-shaping patches on the loop |

**Kept**

- Track geometry and the lateral / avoidance layer — demoted to **presentation only**: it may move a
  racer sideways, never longitudinally.
- The seeded RNG and the tier definitions (`BAND_EDGES`).
- **The entire observer suite, unchanged.** Every observer reads `racers[].t` per frame; playback
  produces `racers[].t` per frame. `p1ContestRate`, runaway/parade, band-reach, gap metrics all keep
  working, which makes the new design directly comparable to every committed baseline. That is a
  deliberate design constraint, not a happy accident.

**Count of independent control mechanisms**

| | before | after |
|---|---|---|
| outcome-shaping systems | ~9 (servo, hero curves, band resolve, release, areaBonus, row compensation, gap-reroll, carousel, role-bias) | **1** (schedule generator) |
| supporting/common-mode | phase machinery, pulk bias, director | **1** (`v_track` lookup) |
| stochastic | re-roll dice (outcome-bearing) | **1** (`ε`, outcome-neutral) |

**~12 → 3, and only one of the three can affect who wins.**

---

## 5. Biggest risk, and the cheapest experiment that exposes it

**The risk: overtakes that cost nothing look fake.**

Not "gliding" — `v_track` and `ε` handle surface liveliness. The real exposure is *interaction*. In
this design a comebacker's trajectory passes through the field without resistance: no dirty air, no
being held up, no fighting for a line. Racing looks natural largely because passing is *hard*, and a
racer that slices through twenty cars at a constant relative rate will read as on rails no matter how
smooth the curve. Today's traffic wall is measured as a *problem* for comebacks, but it is also
carrying naturalness that this design would silently remove.

(Cheap mitigation if it bites, kept in reserve so the risk is not fatal: give the generator a
*scheduled* passing cost — a small, pre-planned slowdown when a trajectory crosses a dense region.
Still open-loop, still checkable at design time, no feedback reintroduced.)

**Cheapest experiment — the inversion-budget audit. Pure arithmetic, no sim run at all.**

Before writing any generator, take the **existing** committed seeds and their existing Fisher-Yates
assignments, plus the measured field geometry already in the repo (`front-spans.csv`, the
`speed-source` decomposition, `lenScale ≈ 212.7`, field speed ≈ 3.11 lengths/s):

1. For each seed, compute the inversion count between grid order and assigned finish order.
2. Convert each racer's required rank movement into required *distance* using the measured field
   density, and divide by race duration to get the mean speed differential it demands.
3. Report the distribution of `required differential / natural band` across racers and seeds.

**Kill condition:** if a material share of racers needs more than the natural band to reach their
assigned tier *even when given the whole race*, then the outcome assignment is not physically
deliverable by any smooth open-loop schedule, and this design dies on arithmetic before a line of code
is written. It would also mean today's system is only "delivering" ≥70% band-reach because it is
allowed to miss — which would itself be worth knowing.

This costs an afternoon with a spreadsheet's worth of computation and answers the one question that
gates everything. The *scripted-look* risk cannot be settled by any metric and needs the owner's eye —
so the second step is a single-race playback rendered in the existing browser, watched once. Metrics
cannot adjudicate naturalness and should not be asked to.

---

## 6. Effort to a sim-only prototype

Assumes the audit in §5 passes.

| piece | scope | est. |
|---|---|---|
| Schedule generator (crossing scheduler + `G` + speed-band check) | new pure module, heavily testable | 2–3 d |
| Playback step (replaces the physics/controller update; `s(p)` → `racers[].t`) | small; the observers need no change | 0.5 d |
| `v_track` from curvature | geometry already available | 0.5 d |
| Sim harness arm + comparison against committed baselines | reuses `exp-runaway-leader.mjs` patterns | 0.5 d |
| Unit tests (tier exactness invariant, band compliance, determinism) | the invariants are sharp and easy to pin | 1 d |

**≈ 4–5 days to a sim-only prototype measurable against every existing baseline**, plus the §5 audit
(~0.5 d) beforehand as the go/no-go.

The prototype is additive and flag-gated: nothing above requires deleting the current system to
measure the new one, so the comparison can be run before any commitment is made. The deletions in §4
are only cashed in once the numbers justify them.

---

## 7. What I would *not* claim

- This does not make the game more *unpredictable* to a viewer who knows the assignment exists. It
  moves the honesty from "the outcome is emergent" to "the tier is authored, the placing inside it is
  not" — which today's system already does, less explicitly and less well.
- The `≈12 → 3` count is a fair characterisation of independent *control* systems, not of total code.
  A good schedule generator is a real piece of engineering; the win is that it is **one** piece with
  one contract, checkable offline, instead of nine that interact at runtime.
- Everything here is reasoning from committed measurements. None of it has been simulated.

---

## 8. Addendum — reconciliation with live, inviolable physics

The owner's constraint: the physics layer (no overlap, avoid-before-brake, and the rest of the
engine's physical laws) stays **live at runtime** and may be improved but never removed or demoted.

This lands squarely on §1. My design as written assumed the lateral layer could be demoted to
presentation — "it may move a racer sideways, never longitudinally". **That assumption is dead**, and
with it the claim of a strictly open-loop race. Physics braking is a longitudinal force, so composed
motion and live physics will disagree, and the disagreement accumulates.

I am not going to defend the original formulation. Below is the design as it has to be, what it costs,
and — honestly — the one place where the constraint makes the design *better*.

The relevant measurement is already in the repo and it is not a rounding error: on dense closed tracks
the choreography step measured **~69% avoidance-braking on the hero**. Physics interference is the
normal condition, not an exception. Any design that treats it as a small perturbation is wrong.

### 8.1 Reconciliation — receding-horizon re-planning, not per-frame correction

The naive repairs are both bad. Per-frame correction of position error is a servo, which is the thing
this proposal exists to delete. Ignoring the error and hoping tier margins absorb it fails outright
against a 69% braking rate.

The right answer reuses the one mechanism the design already has:

> **Re-invoke the schedule generator at a handful of checkpoints, from the ACTUAL field state.**

- At `K` checkpoints (say `p = 0.1 … 0.8`, the last one early enough to matter — see §8.2), take every
  racer's real position as it now is, after everything physics has done to it, and regenerate the
  remaining trajectories to the same assigned tiers, under the same design-time speed-band check.
- Between checkpoints: open-loop playback + jitter + live physics. No per-frame loop, no rank
  arbitration, no clamps, no strictness.

This is not a new system — it is the §1.1 generator called eight times instead of once. The simplicity
ledger is unchanged at three mechanisms; what changes is my claim of *zero* feedback. Feedback exists,
at ~8 discrete instants with a global horizon each time.

Two properties make that a fundamentally cheaper loop than today's servo, and this is the crux of why
the design survives the constraint:

1. **It is decoupled.** The error signal is a racer's own longitudinal position against its own
   reference. It is not a rank, so it does not depend on where anyone else is. Today's servo is
   many-body by construction — rank *is* a function of the whole field — which is why perturbing one
   racer reshuffles the rest (the measured leader-braking failure). Re-planning perturbs nobody.
2. **It always has runway.** Every re-plan spreads its correction across all remaining progress. The
   measured lesson that *late choreography does not fit* is a statement about corrections that start
   late; here corrections start at the next checkpoint and are re-derived with the whole remainder as
   budget. A racer held up at `p=0.3` is not "behind schedule" — at `p=0.4` it simply has a new,
   feasible schedule.

Determinism is preserved: physics is deterministic given the seed, so the checkpoint states are
deterministic, so the re-plans are deterministic.

**The schedule must also pay a physics reserve.** The generator may spend at most `(1−σ)` of the
natural speed band, holding `σ` back as the authority that absorbs braking and pays back the distance
it costs. `σ` is not a guess — §8.3 measures it. A schedule that spends the whole band has nothing
left to recover with and will be shredded by the first busy corner.

Finally, physics gets **right of way, always**. Where a composed pace and avoid-before-brake conflict,
physics wins and the schedule yields; the deviation is simply an input to the next re-plan. There is
no arbitration logic and no priority table — which is the only reason this stays one mechanism instead
of two fighting.

### 8.2 Fairness margin — what survives, and what it now rests on

The §2 guarantee weakens in kind, and I want to be exact about how.

- **Before:** tier exactness held *by construction at t=0*, because the finish order was an input.
- **Now:** tier exactness holds *by construction at the last re-plan*, provided the remaining budget
  is sufficient — and provided post-last-re-plan physics deviation stays inside the reserve.

So the guarantee becomes conditional, and the condition is measurable. Define, per racer, at every
re-plan:

```
μ = (speed-band budget available over the remaining runway)
  − (differential still required to reach the assigned tier)
```

**The invariant to hold is `μ > 0` for every racer at every re-plan.** It is checkable *inside* the
generator, at the moment of planning, before any of it is played back — so a race that is about to
become unfair is detectable while there is still time to act, which is strictly better than today's
situation, where band-reach is only known after the finish.

The fairness definition of §2 therefore becomes a pair:

| metric | target | nature |
|---|---|---|
| `tierExactness` | **1.000**, per race | outcome invariant |
| `minMargin` = min over racers and checkpoints of `μ` | **> 0**, per race | *predictive* — fails before the finish does |
| `intraTierEntropy` | > 0 | confirms intra-tier order is still genuinely free |

`minMargin` is the more useful of the two. `tierExactness` tells you a race was fair; `minMargin` tells
you how close it came to not being, and its distribution across seeds is the real safety report.

The residual exposure is the tail after the last checkpoint: between `p_last` and the finish there is
no further re-plan, so tier delivery rests on the reserve absorbing whatever physics does in that
window. Two things bound it, and both are set by measurement rather than assertion:

- `p_last` is chosen so the remaining runway exceeds the measured worst-case single-window physics loss
  by a stated factor;
- tier-boundary gaps at the finish must exceed `2·max|ε| + (measured p95 physics deviation over the
  tail)` — the §2 condition, widened from jitter-only to jitter-plus-physics.

I will not claim a numeric margin here. The honest position is that **σ, `p_last` and the boundary
widening are all outputs of the §8.3 measurement**, and quoting a figure before running it would be
invention. What I will claim is that the margin is *provable once measured*, and that it is checked
per race at plan time rather than inferred from a pooled ≥70% statistic.

### 8.3 Risk impact — the constraint helps more than it hurts

**It substantially reduces my stated biggest risk.** §5 named the danger as *overtakes that cost
nothing look fake* — a comebacker slicing through twenty cars without resistance, on rails. Live
physics removes that risk at the source: passes now genuinely cost something, traffic genuinely
resists, and the weaving and braking that make racing legible are produced by the engine rather than
faked by the schedule. My §5 "cheap mitigation in reserve" — a scheduled passing cost — becomes
unnecessary, because the real thing is present. That is a straightforwardly better design, and the
constraint is the reason.

**It replaces that risk with a sharper one:** *the schedule and physics fight each other.* The failure
mode is a generator that keeps authoring passes traffic will not permit, so each re-plan re-authors
what the last one failed to deliver. Two visible symptoms, both bad:

- **pace oscillation** — a racer alternately pushing and being braked, which reads as unnatural in
  exactly the way the owner already objects to at ±10–15%;
- **margin collapse** — `μ` trending down across checkpoints until some racer cannot reach its tier,
  turning a fairness guarantee into a measured failure rate.

The 69% braking datum says this risk is live, not theoretical. It is also the same wall the current
system hits — the traffic wall — and I should be explicit that **this design does not remove it**. It
changes who fights it: a planner with global horizon and a reserve, instead of a saturating servo with
two ranks of authority. That may be enough. It is not obviously enough, which is precisely why the
experiment below must run before any build.

**The cheapest pre-build experiment changes, and gets cheaper in the sense that matters — it is now
the *first* thing to run, and it needs no new mechanism at all.**

§5 proposed an inversion-budget audit: pure arithmetic over existing seeds and assignments. That is
still necessary but no longer sufficient, because it assumed the full natural band was available. It
must be preceded by:

> **The physics-tax measurement.** Read-only instrumentation on the *current* engine, existing seeds,
> existing observers: for every racer, the cumulative longitudinal distance lost to avoidance braking
> over the race, expressed as a fraction of the natural speed band, reported as a distribution and as a
> per-window (per-10%-of-progress) profile.

This is a pure observer addition of the same kind already in `scripts/sim/observers/` — no behaviour
change, no fingerprint impact, one sweep on the committed seeds. It yields, directly:

- `σ`, the reserve the schedule must not spend;
- the worst-case tail loss that sets `p_last` and the tier-boundary widening;
- the per-window profile, which says whether the tax is uniform or concentrated (concentrated is
  easier to plan around; uniform is more expensive).

Then re-run the §5 inversion-budget audit against `band × (1−σ)` instead of the full band.

**The combined kill condition is now stronger and more interesting.** If the physics tax consumes most
of the natural band, then no schedule-led design can deliver assigned tiers — and, importantly, *the
same arithmetic indicts the current system*: it would mean today's band-reach only reaches ~70%
because the physics tax makes the assignment undeliverable, not because the servo is badly tuned. That
would relocate the project's central problem from "which control mechanism" to "the assignments are
too ambitious for the physics", which is an owner-level decision about the game and worth far more
than another mechanism iteration.

Either way the measurement is cheap, read-only, runs on committed seeds, and is worth having
regardless of which proposal the owner picks.
