# System rescue, round 2 — blank-page concepts — CC

**Report-only. Author: CC. Master `05c461e`. No code changed, no sims run.** Round 1 was too anchored; the
owner is right. This starts from a blank page and designs the watchable race first, states the build cost
second. Written without reference to the Copilot file.

## The one idea behind all three concepts

The current engine is dead late because **fairness is imposed by steering an outcome that was decided at
plan time** — so the finish only executes a settled result (L181/L182). A real sport never does this. It
gets *fair AND thrilling* the opposite way: **make the race genuinely undecided, and make fairness a
property of the STARTING CONDITIONS, not of a mid-race correction.** Handicap horse racing, team pursuit,
marble racing, the cycling *flamme rouge* — all set up an equal contest and then let honest motion run
untouched to a bunch finish. Late action is not added; it is the *inevitable consequence* of a field
designed to arrive together. Every concept below is a different way to make the field arrive together by
construction, with zero steering after the gun.

A shared vocabulary point: **"fair" here means every racer has an equal expected finish in THIS race
(equal opportunity), which is a per-race, provable-by-symmetry fairness — strictly stronger than a ≥70%
band-reach floor and not the season-average family the owner ruled out.** Different racers keep different
looks and (concepts 1–2) different true abilities; fairness comes from compensating those abilities at the
start, not from assigning who finishes where.

---

## Concept 1 — HANDICAP PURSUIT: "everyone is designed to arrive together" (BUILD FIRST)

**What the viewer sees.** The grid is *staggered by ability*: the fastest racers start furthest back, the
slowest start furthest forward, by a visible, understandable margin (like a real handicap start or a
pursuit). The gun fires and **nothing steers anyone again.** Each racer simply runs its own honest speed.
Because the stagger was calibrated so every racer's *expected* arrival is identical, the field compresses as
it runs: the fast back-markers carve up through the pack, the slow front-runners defend, and by the final
stretch they are inevitably together — a genuine multi-way photo finish decided by who has the best run on
the day. No leader is ever braked; no chaser is ever lifted; the drama is pure honest closing speed.

**Why late action is INHERENT.** The handicap equalizes *expected* arrival, so convergence at the line is
the mathematical default, not a tuned effect. Honest per-race speed variation (each racer's true pace
fluctuates within an honest band as it runs — intrinsic motion, not a scheduled re-roll) is what turns the
designed dead-heat into a real contest: the field arrives together *and* the winner is genuinely open. You
cannot build a non-close finish out of this concept without breaking the handicap.

**Per-race fairness mechanism.** Handicap offset = f(ability), the single tuning, chosen so expected
arrival time is equal for all racers → equal win probability this race, provable by symmetry. Nothing after
the start touches fairness, so no race can be un-fair. This is a *stronger* and *simpler* promise than
band-reach: not "≥70% land in their band" but "≈100% equal opportunity, every race."

**Honest motion + zero overlap.** Motion is one honest speed per racer, continuous, no teleports, no hand of
god — the most physically honest model the project has had. The back-markers carving through the field is
exactly the maneuver the shipped **lateral avoidance / overlap gate** already handles (the one part of the
core worth keeping): passing is a lane-change under the existing no-co-location physics, so pass-through is
structurally impossible.

**Simple and clean.** The entire ruleset: *start offset = handicap(ability); then run honest speed to the
line.* No phases, no servo, no slots, no dice, no OUTCOME machine. Two or three parameters total (the
handicap slope, the honest-variance band). If it needs more, it is the wrong build.

**What of today's code remains useful.** Rendering + camera, track geometry, the lateral/avoidance/overlap
physics, and the duration/length-scale infra. **Dies:** `racePlanner` in full (servo, slot assignment, hero
choreography, phase structure), the gap-reroll, the OUTCOME/PULK phase machine.

**Cost class.** Full rebuild of the race *core* (the control model), reusing rendering, tracks, overlap
physics, and infra. Honestly large — but the result is *smaller* than today's code, not bigger.

**Cheapest decisive sim-first prototype + kill criterion.** A standalone sim (experiment branch, sim-only):
place racers at handicap offsets, run honest speed with bounded per-racer variance, no steering; measure (a)
win-distribution uniformity across seeds (fairness), (b) finish spread of the top-3 (bunch-finish), (c)
lead-changes in the final stretch. **Kill if** the win distribution is not ~uniform (handicap can't
equalize honestly), OR the finish does not bunch on BOTH tracks from one handicap rule, OR making it fair
requires per-track offsets (fails one-rule-all-tracks).

**Prior art (stolen wholesale).** Handicap horse racing and sailing/golf handicaps (the whole point is a
designed dead-heat that the day's form decides); cycling/athletics *handicap* and *pursuit* starts. Their
late race works precisely because the start guarantees the finish is close — which is the property we want.

---

## Concept 2 — SPEND-DOWN SPRINT: equal fuel, honest fade, a *flamme rouge* finish

**What the viewer sees.** Every racer carries the **same energy budget** (fair by equality) but runs at its
own true ability. Going fast burns fuel; running in another racer's slipstream saves it (real, visible
physics). The naturally-fast racers burn hot early and **fade**; the field is pulled together by drafting;
and in the final stretch the racers who banked energy **surge** past the fading leaders — the classic
last-kilometre sprint. Positions churn to the line because everyone hits empty at once.

**Why late action is INHERENT.** Equal fuel + honest depletion means every racer converges toward a common
low-energy speed exactly as the race ends — the convergence and the late surge are the *thermodynamics* of
the concept, not an added layer. The final stretch is where the fuel runs out, so it is where the race is
always decided.

**Per-race fairness mechanism.** Equal energy budget for all = a handicap in *energy space*: the fast racer's
advantage is spent down to parity by the end, so expected finishes equalize this race → equal opportunity,
provable per race. One tuning (budget vs ability).

**Honest motion + zero overlap.** Speed is an honest function of remaining energy and drafting; drafting is
proximity physics (already shipped as slipstream); passing uses the existing overlap gate. No steering, no
teleport. (Depletion and draft-uptake are *automatic honest physics per racer* — a fixed depletion curve,
not an AI making tactical choices, which would smuggle back authoring.)

**Simple and clean.** Ruleset: *equal fuel; speed = ability while fuel lasts, fading as it empties; draft
saves fuel.* Three ideas, a couple of parameters. No phases/servo/slots/dice.

**What remains useful.** Rendering, tracks, the overlap physics, and the shipped **drafting/slipstream**
force (reused as real physics, not amplified into a hand of god). **Dies:** the same core as Concept 1.

**Cost class.** New foundation (race core rebuild), a notch more physics than Concept 1 (the energy model).

**Cheapest prototype + kill.** Sim: equal fuel, honest depletion, draft-saving, no steering; measure win
uniformity, late convergence, and final-stretch lead-changes. **Kill if** a single ability still dominates
(fuel doesn't equalize), OR convergence needs per-track fuel, OR the depletion has to be micromanaged to
look natural (fails simple/clean).

**Prior art.** *Flamme Rouge* / *Le Mans* (the cycling board games built entirely on energy decks and
slipstream), and real road cycling's energy-management-plus-draft finish. Their finishes are thrilling
*because* everyone is empty at the line.

---

## Concept 3 — SPEC FIELD: identical racers, honest chaos, emergent photo finish

**What the viewer sees.** Every racer is *physically identical* — same speed, same handling — distinguished
only by look and colour, like marbles in a marble run or spec cars in a one-make series. There is no
handicap and no steering at all. The race is decided entirely by honest micro-physics: jostling for the
racing line, lane contention through the bends, tiny path-length differences, contact and recovery. Leads
change constantly because no one has a real edge, and the finish is an emergent photo finish built from
accumulated millimetre differences.

**Why late action is INHERENT.** With no ability gap, no racer can ever pull clear — a break is immediately
erased by the next corner's contention. The field *cannot* settle; contest is the permanent state, and the
finish is as close as physics noise allows. There is no dead-race failure mode to design around.

**Per-race fairness mechanism.** Identical racers ⇒ exactly equal opportunity every race, provable by
construction (permutation symmetry) — the strongest and simplest fairness statement possible. The only thing
to verify is that the geometry/physics has no *systematic* bias (e.g. a permanent inside-lane advantage),
which the prototype measures.

**Honest motion + zero overlap.** This is the most physically realistic concept of the three: it is nothing
but the honest collision/lateral/overlap physics running on equal racers. Pass-through is impossible by the
same gate as today.

**Simple and clean.** The cleanest ruleset imaginable: *identical racers, honest physics, no assignment, no
steering.* Essentially zero tuning. It is the concept most likely to survive the "simple and clean"
requirement untouched.

**What remains useful.** Rendering, tracks, and the overlap/lateral/collision physics — *and nothing else.*
**Dies:** the entire control model plus the racer-ability/type system (identities become cosmetic).

**Cost class.** Foundation swap, but the *smallest code* of the three (delete more than you add) — the risk
is conceptual, not engineering.

**Cheapest prototype + kill.** Sim: equal racers, honest jostle physics, no steering; measure win-uniformity
across seeds, lead-change density, and finish spread. **Kill if** a systematic positional bias breaks
per-race fairness, OR the winner is pure coin-flip with no watchable build-up (chaos without a story), OR
the owner rejects losing distinct racer abilities.

**Prior art.** Jelle's Marble Runs (millions of viewers, pure honest physics, identical marbles), pinewood
derby / one-make spec racing (fairness by identical equipment), and demolition-derby-style jostle formats.
Their appeal is that *equal equipment makes every result honestly earned.*

---

## Closing line

**Build Concept 1 (Handicap Pursuit) first — it is the only one that keeps the game's distinct-ability
identities AND delivers a provably fair, inevitably-bunched, steering-free finish from a two-line rule, so
it satisfies all five owner requirements at once; Concept 3 (Spec Field) is the cleaner and cheaper fallback
if the owner will trade ability differences for the simplest possible honest race.**
