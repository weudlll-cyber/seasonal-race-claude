# SYSTEM RESCUE ROUND 2 — Copilot (blank-page ideation, final)

Report-only. Independent. No code changes, no sim runs.

This round answers the inverted question: if we were designing the best watchable browser horse race from zero under the owner constraints, what should the race be.

Ranked by conviction.

## 1. Convergent Handicap Pursuit Race

### Concept in plain terms
Viewer experience: all racers are released with staggered start delays, not a single mass start. The delays are computed so that, before the race begins, every racer has the same expected finish time under one public formula. The race then runs as pure continuous motion with passing, drafting, and line choice. What the viewer sees is a progressive catch-up story that naturally compresses into a multi-racer fight near the finish.

Prior art: handicap horse racing and pursuit cycling formats.

### Why late-race action is inherent
Late convergence is the core rule, not an add-on. If starts are equalized to the same expected finish time, the field is mathematically designed to close into contention as distance remaining approaches zero.

### Per-race fairness mechanism
Fairness is guaranteed per race by a pre-race equalization equation. Each racer has a publicly visible ability index. Start delay is set so projected finish times are equal at the green signal. This is race-local fairness, not season averaging. No hidden live correction after the start.

### Continuous motion and zero pass-through
All movement is standard physics integration. Racers never teleport. Start release is a gate opening event at the start line, with minimum spacing enforced. Existing collision and lane occupancy rules prevent overlap and pass-through.

### Why simple and clean
Core rules are minimal:
1. One equalization formula for start delays.
2. One mass physical race after release.
No late exceptions, no corrective overlays, no per-track tuning tables.

### What remains useful from today
Rendering, track geometry, spline/path tooling, race observers, replay, and browser UI infrastructure.

### Cost class
New foundation for race logic, but with major reuse of rendering and track systems.

### Cheapest decisive sim-first prototype and kill criterion
Prototype: implement start-delay equalization plus plain continuous racing on one open and one closed track.
Kill criterion: reject if top-5 spread at 90 percent distance is not tighter than current baseline while per-race fairness metrics degrade below current floor.

---

## 2. Elimination Sprint Race (Last-Out at Fixed Calls)

### Concept in plain terms
Viewer experience: all racers start together. At fixed progress calls, the last racer at the call is eliminated from winning contention and peels into a safe outer lane to finish out of contention. Calls continue until a small final group remains, then that group sprints to the line.

Prior art: track cycling elimination race and speed-skating elimination formats.

### Why late-race action is inherent
The race cannot settle early because survival pressure repeats. Every call creates urgency, and the final group is forced into direct contest in the last stretch by construction.

### Per-race fairness mechanism
Fairness is per race because all racers face identical rules, identical call timings, identical physics, and identical elimination criteria. No subjective adjudication and no hidden boosts. Calls are deterministic by progress fractions, same for every track.

### Continuous motion and zero pass-through
Racers are never removed by teleport. Eliminated racers transition to a predefined safe lane while keeping continuous motion. Collision rules remain active for contenders and non-contenders.

### Why simple and clean
Core rules are minimal:
1. Shared start.
2. Fixed elimination calls by progress fraction.
3. Last at call is out of contention.
No target steering, no rescue logic, no multi-layer control stack.

### What remains useful from today
Rendering, track representation, continuous integrator, collision handling, ranking observers, and replay systems.

### Cost class
Subsystem replacement of race format and race-state machine.

### Cheapest decisive sim-first prototype and kill criterion
Prototype: add elimination calls and out-of-contention lane behavior, then run paired screens on one open and one closed track.
Kill criterion: reject if winner is already obvious before the final call too often, or if elimination transitions increase overlap/incident rates.

---

## 3. Mandatory Joker Path Duel Race

### Concept in plain terms
Viewer experience: each racer must take one longer joker path exactly once during the final third of the race. Choosing when to spend the joker creates crossing strategies. Some racers defend while carrying joker debt, others attack after spending it early. Classification remains unstable until the line because unresolved joker obligations still hang over contenders.

Prior art: rallycross joker lap and Formula E style strategic activation timing.

### Why late-race action is inherent
Late uncertainty is structural: if joker use is mandatory in the final third, racers cannot lock the order early without strategic risk. Crossovers and merges create natural overtakes near the finish.

### Per-race fairness mechanism
Every racer has exactly the same joker obligation and the same allowed activation window. Joker path cost is defined by one global rule based on relative path length, not per-track hand tuning. Fairness is enforced inside each race by identical obligations.

### Continuous motion and zero pass-through
Joker path is a real track branch with continuous entry and merge splines. No teleports, no instant position swaps. Merge right-of-way is deterministic and collision-safe.

### Why simple and clean
Core rules are minimal:
1. One mandatory joker per racer.
2. One activation window.
3. One merge rule.
No special-case comeback mechanics and no hidden corrective layers.

### What remains useful from today
Track and spline infrastructure, renderer, collision system, timing/ranking observers, and UI shell.

### Cost class
Subsystem replacement with moderate geometry work.

### Cheapest decisive sim-first prototype and kill criterion
Prototype: implement one procedural joker branch and mandatory-use logic on two representative tracks.
Kill criterion: reject if merge conflicts create frequent incidents, or if final-third order volatility does not increase versus baseline.

---

## 4. Open-Hand Card Pace Race

### Concept in plain terms
Viewer experience: each racer has a visible mini hand of pace cards, for example hold, push, and surge. Cards are played by simple policy across race segments, with stronger cards restricted to late windows. Everyone can see who still holds surge potential, so tension builds naturally into the finish.

Prior art: board and card racing games where late reveal and resource timing drive excitement.

### Why late-race action is inherent
Late action is built into resource timing: if high-impact cards are conserved for the end, the final stretch is where decisive moves happen by design.

### Per-race fairness mechanism
Fairness is per race via identical card decks and identical draw rules for every racer. No racer gets privileged card entropy. Race fairness is symmetric at the deck level before motion begins.

### Continuous motion and zero pass-through
Cards only modulate continuous acceleration limits and line aggressiveness within physical bounds. Motion remains continuous and collision-safe.

### Why simple and clean
Core rules are minimal:
1. Same deck for all.
2. Simple play policy.
3. Card effects mapped to bounded physical parameters.
No layered rescue controls.

### What remains useful from today
Renderer, tracks, physics integrator, collision checks, race timeline UI, and telemetry.

### Cost class
New foundation for control policy, with high conceptual shift.

### Cheapest decisive sim-first prototype and kill criterion
Prototype: tiny three-card deck with deterministic policy and visible state in sim logs.
Kill criterion: reject if outcome quality depends on many card-specific exceptions or if fairness drifts from symmetric deck assumptions.

---

## Closing line
Build Proposal 1 first, because it gives per-race fairness by explicit construction and makes late-race contention inherent through convergent starts, with far fewer moving parts than the other high-novelty options.