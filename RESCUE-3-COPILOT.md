# SYSTEM RESCUE ROUND 3 — Copilot (actual problem reframed)

Report-only. Independent. No code changes. No sim runs.

Assumption reset used in every proposal below:
- Racers are identical.
- One simultaneous mass start from staggered start rows.
- Fairness target is row-conditional: win probability must be equal across start rows.
- No scripted target-rank steering.
- Blocking and traffic fights are desired.

Ranked by conviction.

## 1) Fair-Lottery Restart Ring (single mandatory neutralization + random release order)

### Concept in plain terms (viewer flow)
The race starts as a normal mass-start traffic fight. At a fixed early progress mark (same global fraction on all tracks), everyone enters a mandatory neutralization ring: speed-limited, continuous rolling, no stopping, no teleport. Inside the ring, each racer is assigned a random release token. Exiting the ring, racers are released in token order with fixed safe spacing, then the race runs flat-out to the line under normal traffic/blocking physics.

Viewer sees: explosive mass start, early jostling into the ring, visible token draw, then a high-pressure second phase where everyone fights from the randomized release order.

Prior art: motorsport restart procedures plus lottery drafts in race-board games.

### START-ROW FAIRNESS mechanism (crux)
This gives an exact symmetry argument, not a tuning claim.
- Let S be original start row.
- Let R be release token order from the ring.
- R is sampled uniformly and independently of S.
- Winner is determined from post-ring race dynamics that depend on R and on identical-racer traffic interactions, not on original S.
Therefore, conditioning on S, win probability is identical because S is d-separated by the independent randomization event. The early pre-ring segment can influence entry timing but not token assignment; once release order is random and independent, original row memory is intentionally erased.

This is fair randomization, not scripted target ranks: nobody is steered to a preassigned finish place.

### Why action is inherent (blocking included)
Action is structural in both phases:
- Phase A: mass-start traffic contest to reach the ring.
- Phase B: dense restart pack where overtakes and blocking immediately matter again.
The concept creates two natural fight peaks and guarantees a contested final stretch because everyone is re-compacted before the decisive run.

### Continuous honest motion + 0 overlaps
All motion is continuous. Ring is just another drivable segment with speed cap and spacing checks. Release spacing is enforced by the same safe-gap logic as normal traffic. Use the proven PROTO-2 core (forward-gap cap, clearance-checked lane change, hold when blocked).

### Why simple and clean
Rules fit in a few lines:
1. One mandatory ring at fixed progress.
2. One random release token per racer.
3. One safe-spacing release.
No layered corrective logic, no per-track knobs, no hidden winner scripting.

### What survives from today
Rendering, tracks/splines, timing/ranking observers, replay, and especially the PROTO-2 overlap-free traffic core.

### Cost class + cheapest sim-first prototype + kill criterion
Cost class: subsystem replacement (race format/state machine), not full rendering rebuild.

Prototype (sim-only, experiment branch):
- Add one mandatory ring event and token-based release.
- Reuse PROTO-2 traffic for both phases.
- Run large-N seeded sims across all start rows.

Kill criterion:
- Fairness primary: row-conditioned win rates fail equality test (for example chi-square plus max row delta threshold).
- Safety: any overlap violations > 0.
- Action: if final-third overtake rate is not higher than current baseline.

---

## 2) Progressive Elimination Mass Start (last-at-call out of contention)

### Concept in plain terms (viewer flow)
All racers launch together. At fixed progress calls (for example every fixed fraction), the current last-place contender is eliminated from win contention and diverted to a safe continuation lane while still racing physically. Calls continue until a small finalist pack remains; finalists then sprint to the finish.

Viewer sees: constant survival pressure, repeated dramatic cuts, and an unavoidable late fight among finalists.

Prior art: track cycling elimination race, speed-skating elimination formats.

### START-ROW FAIRNESS mechanism (crux)
Fairness comes from symmetry of rules under identical racers:
- Same call schedule for everyone.
- Same elimination criterion (last at call) for everyone.
- No row-dependent boosts, no row-dependent penalties.
Because contenders are repeatedly filtered by in-race position rather than preserved by initial row, start-row advantage is washed out through multiple selection events. In probabilistic terms, initial row affects early hazard but does not retain privileged protection; repeated independent contest calls push outcome toward row-exchangeable winner odds.

This is not target scripting: no racer is assigned a finishing destiny.

### Why action is inherent (blocking included)
Action is the mechanism itself. Every call creates immediate blocking/overtake battles around the cut line. The final segment is always contested because only a small live finalist group can still win.

### Continuous honest motion + 0 overlaps
No teleports. Eliminated racers peel via a continuous branch and keep moving. Contenders remain under the same collision/clearance rules. PROTO-2 traffic logic directly applies.

### Why simple and clean
Minimal rules:
1. Mass start.
2. Fixed call schedule by progress fractions.
3. Last contender at each call is out of win contention.
No per-track tuning and no late corrective overlays.

### What survives from today
Rendering, track system, observers, replay, plus PROTO-2 traffic and overlap guards.

### Cost class + cheapest sim-first prototype + kill criterion
Cost class: subsystem replacement (format + contender state tracking).

Prototype (sim-only):
- Implement call schedule and contender/eliminated states.
- Add elimination lane behavior.
- Measure row-conditioned winner rates.

Kill criterion:
- Fairness primary: unequal row win probabilities beyond preset tolerance.
- Safety: any overlap > 0.
- Action: if call-window overtake density does not materially exceed baseline.

---

## 3) Mandatory Joker Merge Race (one compulsory detour in final half)

### Concept in plain terms (viewer flow)
Mass start race with one mandatory joker detour per racer in the final half. Joker path is longer/slower but unavoidable once per racer. Timing choice is strategic: spend early to attack later, or delay and risk losing position. By the finish, unresolved joker obligations and merge timing keep order unstable.

Viewer sees: visible strategic divergence and convergences, frequent merge duels, and uncertainty until late.

Prior art: rallycross joker lap.

### START-ROW FAIRNESS mechanism (crux)
Per-race fairness is from symmetric obligation:
- Every racer must pay exactly one joker cost under the same window and same merge rules.
- Since all racers are identical, nobody has privileged capability.
- Front starters cannot convert early lead directly into guaranteed win because they still owe the same mandatory cost and timing risk.
The mechanism transforms early track-position advantage into a debt that must be repaid, reducing row-conditioned winner skew without scripting finish order.

### Why action is inherent (blocking included)
Action comes from merge conflicts and timing games by design. Blocking is legitimate and valuable at joker exits and merge points. Late race remains contested because pending joker debt keeps positions reversible.

### Continuous honest motion + 0 overlaps
Joker uses real branch geometry with continuous entry/exit splines. Merge right-of-way is deterministic. Collision and clearance logic are unchanged; no pass-through allowed.

### Why simple and clean
Three rules:
1. One mandatory joker per racer.
2. One global activation window.
3. One deterministic merge protocol.
No per-track parameters beyond geometric branch generation rule.

### What survives from today
Track/spline infrastructure, rendering, observers, replay, and PROTO-2 traffic/clearance core.

### Cost class + cheapest sim-first prototype + kill criterion
Cost class: subsystem replacement with geometry work.

Prototype (sim-only):
- Add one procedural joker branch and mandatory-use tracking.
- Add merge arbitration and safety checks.
- Evaluate row-conditioned win equality.

Kill criterion:
- Fairness primary: row win-rate equality fails.
- Safety: any overlap incidents at merges.
- Action: if final-third lead changes and contested merges do not rise.

---

## 4) Open Draw Pace Chips (public, symmetric, non-targeted randomness)

### Concept in plain terms (viewer flow)
Mass start. Each racer receives the same small set of public pace chips (for example 2 push, 1 surge, 1 defend) that can be spent once each under simple eligibility rules. Chips modify acceleration envelope briefly within physical limits. Everyone can see remaining chips, so late attacks are legible and anticipated.

Prior art: card-driven race board games, tactical boost systems in arcade racers.

### START-ROW FAIRNESS mechanism (crux)
Fairness is symmetric per race because each racer gets the exact same chip set and same spend rules. Since chip order is self-chosen in race context and racers are identical, win probability is driven by interaction dynamics rather than starting row alone. This is random/tactical equalization without assigning finish ranks.

### Why action is inherent (blocking included)
Late race action is built in: conserved surge chips create endgame attacks; defend chips create blocking battles. Resource timing guarantees positional fights in the final stretch.

### Continuous honest motion + 0 overlaps
Chips only scale local acceleration bounds; movement remains continuous and collision-constrained. No teleports or pass-through.

### Why simple and clean
Simple rules:
1. Same chip set for all racers.
2. One spend rulebook.
3. Bounded physical effect per chip.
No hidden adaptive correction stack.

### What survives from today
Most infra survives: renderer, tracks, physics integrator, observers, replay, and PROTO-2 traffic constraints.

### Cost class + cheapest sim-first prototype + kill criterion
Cost class: new foundation for control policy, moderate implementation risk.

Prototype (sim-only):
- Implement a tiny symmetric chip set with deterministic bot policy.
- Simulate large N and read row-conditioned wins.

Kill criterion:
- Fairness primary: row-conditioned winner probabilities are not statistically equal.
- Safety: any overlap > 0.
- Complexity: if concept requires many chip-specific exceptions, reject as unclean.

---

## Closing line
Build Proposal 1 first, because it gives the cleanest and strongest row-fairness argument (explicit row-memory erasure by one independent random release event) while preserving honest mass-start traffic fighting and reusing the proven overlap-free PROTO-2 core.