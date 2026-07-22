# GREENFIELD - Seeded Pace Compiler

Status: independent ideation only. No code changed.

## 1) Core Mechanism

Build the race as a compile-time pace problem, not a live rank-steering problem.

The race engine should do only three things:

1. Assign every racer a pre-race outcome band, independent of start row.
2. Compile a deterministic, seed-authored pace envelope for each racer.
3. Run the field with one shared race-wave signal and one tiny row-neutralization credit so the standing start does not decide the race.

There is no phase stack, no hero choreography, no position servo, no late reroll system, and no leader-specific brake. The race is driven by smooth speed curves, not by live rank targets.

The pace compiler is the whole game logic. Each racer gets a small archetype curve chosen from a limited library such as:

- hard launch then fade
- steady grinder
- late closer
- early fade
- mid-race surge

Those archetypes are smooth, deterministic, and seeded. They overlap in time so the field can compress, split, and reorder naturally. A single race-wide wave creates the big-picture rhythm: early compression, mid-race sorting, late release. The row-neutralization credit exists only to remove standing-start bias once, at the beginning, and then it decays away. After that, racers are simply running their seeded pace curves against each other.

This is deliberately simpler than the current system. The race is not trying to decide who should lead at every instant. It is trying to make each racer move in a plausible way so the final order and the lead changes emerge from motion, not from orchestration.

## 2) Fairness

Formal fairness definition:

- Every racer is assigned a target band before the start.
- A race is fair only if every racer finishes in its assigned band.
- The assignment must be independent of start row.
- If the compiler cannot prove band delivery for a seed, that seed is rejected or recompiled deterministically until it becomes feasible.

This is a stronger definition than a percentage-based band-reach target. It is exact, measurable, and easy to audit: each racer has one assigned band and one finished band, and the race passes only when they match.

Why this is fair by construction:

- Start-row influence is removed from the outcome assignment.
- The only row-aware term is the one-time neutralization credit, which exists to cancel standing-start bias rather than to create a live advantage.
- No runtime system can secretly change who is supposed to win, because no runtime system is rank-targeting anyone.
- Determinism comes from the seed plus the fixed pace library.

If a seed produces an infeasible band plan, that is not a race to ship. It is a compile failure. That is the cleanest way to keep fairness inviolable without building a maze of compensators.

## 3) Emergent Stories

This design still gives the stories the owner wants, but they come from curve crossings instead of live choreography.

Comebacks appear when a late-closer archetype has a stronger second-half envelope than the front runners. Because the curves are smooth and deterministic, the comeback reads as speed and stamina rather than as a scripted move.

Fades appear when a hard-launch or early-surge archetype pays for its opening speed. That creates natural loss of position without needing a leader brake.

Front battles happen because the shared race-wave compresses the front group while the archetypes keep crossing. The lead changes are not forced; they happen when two smooth curves intersect at the same time that the local pack density is still high.

Midfield action is a consequence of the same mechanism. The middle archetypes are not all identical, so the pack does not collapse into one flat blob. Some racers surge, some stall, some drift back, and the middle naturally stays live.

Suspense to the line comes from the late part of the shared wave. The field is already sorted enough to be legible, but not so sorted that the lead is dead. The final window should be short and clean, with no late, complex authored sequence and no camera rescue.

The important difference from the current system is that the stories are produced by one coherent motion model, not by several overlapping control systems trying to manufacture drama at different points in the race.

## 4) Simplicity Ledger

Delete:

- PULK phase
- OUTCOME servo stack
- hero curves
- start-row compensation as a separate system
- areaBonus
- re-roll dice
- leader brake / front leash logic
- late authored battle choreography
- camera as a gameplay fix

Keep:

- deterministic seed
- band assignment
- a single row-neutralization credit
- one shared race-wave envelope
- a small library of pace archetypes

Rough count of independent control mechanisms:

- Today: about 6 to 8 overlapping systems, depending on how you count the phase stack and the add-on levers.
- Greenfield: 2 core systems, plus 1 fairness helper
  - compile-time band assignment
  - seeded pace envelopes with a shared race-wave
  - one-time row-neutralization credit

That is the point of the redesign: fewer systems, clearer ownership, and fewer ways for one lever to accidentally fight another.

## 5) Biggest Risk

The single most likely failure is that the design becomes too clean and loses battle density. If the pace envelopes are too smooth, the field will sort itself into a stable order and the race will feel elegant but dull.

The cheapest sim-only experiment to expose that risk before any build is to use the existing seeds and the current observer suite on the closest available no-authoring configuration, then compare against the shipped baseline.

Use the existing metrics that already measure the right failure modes:

- `leadChangeCount`
- `distinctLeaders`
- `maxLeadHoldShare`
- `frontContestFraction`
- `runawayWinnerRate`
- `paradeFinishRate`
- `bandExitAfterRelease`

The test is simple:

1. Run the existing seed set with the smallest available authored surface.
2. Check whether lead changes and distinct leaders stay high enough while runaway and parade stay controlled.
3. If the no-authoring variant already collapses into order, the greenfield needs a stronger shared-wave term.
4. If it preserves action, the design is viable and the live stack is probably doing too much work today.

This is the cheapest way to find out whether the race is fundamentally capable of being interesting without rank choreography.

## 6) Rough Effort To A Sim-Only Prototype

Rough effort: 2 to 4 days for a first sim-only prototype if it reuses the current sim harness and observer suite.

What that prototype needs:


That is enough to answer the main question: can a simpler, motion-first race system produce fair delivery and genuine battle without the current maze of interlocking controls?

## Final Position

This should be built as a race compiler, not as another choreography layer.

If the greenfield works, the game gets simpler in the right way: one fairness pass, one motion model, one seed. If it fails, the failure will be obvious early, because the observer suite will show whether the field can still produce lead changes, comebacks, and suspense without live rank steering.

## 8) Physics Constraint Addendum

The owner's addendum changes one thing and only one thing: the schedule is not allowed to assume the
physics layer is absent. Live avoidance, overlap prevention, and brake-on-failure remain active at
runtime. So the open-loop design must be treated as a **motion intent compiler**, not a final-state
imposer.

### 8.1 Reconciliation

The design reconciles with live physics by reserving slack at compile time.

- Each scheduled trajectory is authored with a spatial and temporal buffer, not a razor edge.
- Every crossing is only accepted if the planned gap at the handover point is wider than the worst
  recorded physics correction envelope for the same seed class and track class.
- If avoidance nudges a racer sideways or a collision brake shortens a move, the schedule does not
  fight the physics. It survives by having enough margin that the local correction does not change the
  tier outcome.

In other words: the compiler does not promise exact micro-paths. It promises a tier result that remains
stable after the live physics layer edits the path locally.

### 8.2 Fairness Margin

The fairness guarantee survives only if the schedule includes an explicit **physics deviation margin**.

Formal restatement:

- A race delivers if, after live physics has been applied, every racer still finishes in its assigned
  tier.
- For each racer, the schedule must leave enough distance-to-boundary that the maximum plausible
  physics-induced deviation cannot push the racer across a tier edge.
- The measurable margin is the minimum over all racers of
  `distance_to_assigned_tier_edge - worst_case_physics_deviation`.

The guarantee survives when that margin is strictly positive for every racer. If the margin goes to
zero on any realistic seed class, the design no longer has a provable fairness story and should be
rejected or recompiled with a shallower schedule.

This is still stronger than a percentage gate because it is seed-local and boundary-local, not a pooled
statistic. The difference from the earlier version is that the boundary slack is now measured against
physics, not just against the authored schedule.

### 8.3 Risk Impact

This constraint weakens the biggest risk I named, but it does not remove it.

- It weakens the risk of fake-looking overtakes, because live avoidance and braking add exactly the
  kind of local irregularity that open-loop motion otherwise lacks.
- It also raises the risk that the schedule becomes too conservative and loses battle density, because
  every extra safety buffer reduces the space available for crossings.

The cheapest pre-build experiment changes slightly as a result:

- Keep the same arithmetic inversion-budget audit, but add a physics slack column computed from the
  existing committed measurements of live avoidance and braking behavior.
- Use the existing seeds to check whether the required crossing budget still fits inside the
  post-physics margin.
- If the margin is negative or too thin for most seeds, the design fails before any prototype.

That is still an offline experiment, but now it answers the right question: not merely "can the
schedule be authored?" but "can the schedule survive the physics layer it must coexist with?"
