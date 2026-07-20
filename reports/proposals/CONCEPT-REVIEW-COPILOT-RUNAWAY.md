# Independent Review: Runaway-Winner Mitigation

**Reviewer:** Copilot
**Scope:** Review only; no code changes
**Verdict:** Build modified

## Short Version

Mechanism A is feasible in the current controller architecture and should be the first-line fix, but it should act on the current rank-1 leader regardless of hero status and should use a narrow deadband plus the existing trajectory smoothing to avoid boundary chatter. Mechanism B is much more invasive. The current generator model is one-shot and authored; a truly reactive mid-race second pass is possible only by bending the existing controller into a second decision layer. I would not ship that as the first implementation. If a late challenger is added, it should be a deterministic reserve challenger authored up front, then conditionally activated, not a loosely reactive mid-race re-cast.

## Feasibility By Mechanism

### Mechanism A: Front-Cluster Distance Leash

This fits the current control stack well. The relevant control path is the race plan and trajectory controller in [client/src/modules/racePlanner.js](client/src/modules/racePlanner.js), which already computes `currentRank`, `rankError`, `bandError`, and `trajectoryMult` inside a single per-frame update. It is consumed from [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx) and mirrored read-only in [scripts/sim-fairness.mjs](scripts/sim-fairness.mjs), so the same leash logic can stay shared between browser and measurement.

The key point is that the existing servo already owns authorial control over rank pressure. A gap leash can be expressed as one more bounded term in the same update loop without new runtime plumbing. That makes it feasible.

The main architectural choice is scope. If the leash only applies to choreographed heroes, it misses the stated failure mode, because the runaway leader may be a non-hero pack racer with target rank 1. The leash should therefore apply to whoever currently holds rank 1.

### Mechanism B: Late Challenger

This is not a natural fit for the current one-shot hero generator. In [client/src/modules/racePlanner.js](client/src/modules/racePlanner.js), hero curves are generated once inside the controller when choreography begins, based on actual field state and the one-frame-earlier snapshot. That model works because the generator is closure-scoped and deterministic for the rest of the race.

A true second generator pass would be feasible only if it is treated as another deterministic authored event inside the same controller state machine. The simpler and safer fit is to author the challenger curve up front and hold it dormant until the trigger condition is met. That keeps the plan deterministic, avoids a second live generator mode, and keeps the browser and sim paths aligned.

## Risks And Edge Cases

The main risk for Mechanism A is front compression. If the leash is too strong or too symmetric, it can pull the front too tightly together and push `paradeFinishRate` above the 2% baseline. It can also create oscillation if the correction toggles hard at the threshold. The current controller already uses a one-second `trajectoryMult` transition and pack-release hysteresis; the leash should reuse that pattern with a deadband rather than introducing a hard on/off edge.

The main risk for Mechanism B is that it can solve runaway by injecting a new authored contest, but it can also damage the observable race if the challenger is anchored too late. Late anchoring is where band-reach, finish compression, and run-out quality can all regress at once. A challenger that has to catch up from too far back will either look impossible or need enough boost to distort the finish.

There is also a measurement risk. Since the sweep must preserve top-5 OUTCOME action and the existing +21% improvement, the new mechanisms should not be evaluated only on runaway rate. They need paired checks for parade compression and band-reach, or the fix can simply move the failure from runaway to parade.

## Answers To The Open Questions

### Mechanism A

1. Apply the leash to whoever holds rank 1, not hero-only. The failure mode is leader-gap-based, not hero-status-based.
2. Prefer leader-only correction as the default. Symmetric brake-plus-lift is more likely to manufacture parade compression and is harder to keep bounded.
3. Start when choreography starts and keep it active through the release window, but not past the release. The leash exists to hold the authored front cluster together before run-out, not to control the finish after release.
4. Use a deadband and the existing trajectory smoothing. A single threshold will chatter; a small enter/exit gap plus the existing 1-second `trajectoryMult` easing is the right anti-oscillation guard.
5. The concrete control points are [client/src/modules/racePlanner.js](client/src/modules/racePlanner.js) for the controller math, [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx) for wiring flags into `createRacePlan`, and [scripts/sim-fairness.mjs](scripts/sim-fairness.mjs) for read-only measurement parity.

### Mechanism B

1. A second late generator pass is only sound if it is deterministic and closed over the same race state. Otherwise, use an unconditional reserve challenger authored at race start and activated conditionally later. That is the better fit.
2. If reactive, anchor to live rank and live progress, not absolute time alone. Otherwise the curve will drift away from the actual field state too quickly.
3. Mechanisms A and B are not clean complements if both are strong. A can reduce the need for B; B should be a fallback, not another always-on pressure source.
4. The challenger can hurt B1/B2 band-reach and Holm if it forces extra late corrections or disturbs the existing band structure. It needs hard feasibility gates and a narrow activation window.

## What The Concept Misses

- It does not define the exact deadband or the maximum allowed leash correction before the fix starts to look like a parade-maker.
- It does not say whether the leash should observe gap in lengths, progress-weighted lengths, or a hybrid that relaxes near the finish line.
- It does not specify whether the late challenger is allowed to target only the current leader or must also consider the current P2 state when the trigger fires.
- It does not name the fallback behavior when the chosen challenger is infeasible. That fallback matters because the measurable success criteria require a high casting yield.

## Recommendation

Build Mechanism A, but modify it so the leash applies to the current rank-1 leader regardless of hero status, uses a small hysteresis band, and is bounded by the existing trajectory authority. Do not start with a reactive second generator pass for Mechanism B. If you need a late-challenger mechanism, make it a deterministic reserve challenger authored up front and conditionally activated later. That keeps the system aligned with the current one-shot plan architecture and reduces the risk of oscillation, finish compression, and measurement drift.