# CHAIN CHOREOGRAPHY — Copilot development report

Report-only. Independent. No code changes. No sim runs.

Scope: harden the owner concept, not replace it.

## 0. One-sentence model
Chain choreography is a multi-segment position-space steering plan where the whole field is guided through authored intermediate formations toward one fixed fair final formation, with checkpoint re-plans that absorb misses without ever setting targets to live order.

## 1. Mechanism design (concrete)

### 1.1 Inputs and invariant outputs
Inputs per race:
- Seed.
- Fixed fair final formation F* (today's Fisher-Yates target-rank draw, row-independent).
- Live field state at planning time: rank order, t, and rank-velocity estimate.
- Race duration model and phase boundaries already resolved by the plan.

Invariant output:
- A segment chain C0..Ck where each segment i has:
  - checkpoint progress p_i,
  - authored target formation T_i,
  - per-racer anchored minimum-jerk waypoint curve from p_{i-1} to p_i.

Hard invariant:
- Final checkpoint target T_k is exactly F* (or same band-preserving endpoint transform if role-pairing is used), never replaced by live order.

### 1.2 Checkpoint schedule (duration-scaled, no hardcoded wall-clock constants)
Use normalized progress, not absolute ms.

Let:
- p0 = resolved choreo anchor (today: pulkStart fraction),
- p_end = resolved OUTCOME end (today: corridor end),
- L = p_end - p0.

Define segment count as a function of duration bucket but from one global rule:
- k = clamp(round(L / delta_p), 3, 7)
- delta_p is one global progress stride (for example around 0.10 to 0.12 progress units), shared for all tracks.

Checkpoint positions:
- p_i = p0 + i * L / k for i=1..k.

This automatically scales for 30 to 300 seconds because progress is leader-normalized and the resolved phase fractions already absorb duration.

### 1.3 Intermediate formation generator (from seed + F* + segment index)
For each checkpoint i < k, generate T_i from F* by a constrained permutation operator P_i:
- T_i = P_i(F*)
- P_i is seeded by (race seed, i), deterministic.
- P_i preserves global fairness bands as a multiset and limits per-segment displacement.

Construction:
1. Start from F* ranks.
2. Partition racers into micro-blocks (for example contiguous rank windows).
3. Apply a small number m_i of deliberate pairwise crossings by swapping block order or intra-block representatives under constraints:
   - no direct live-order copy,
   - bounded rank travel per segment,
   - preserve endpoint feasibility budget to next checkpoints.
4. Convert T_i ranks into anchored curves using existing minimum-jerk machinery.

Action guarantee:
- m_i is explicit and countable: each segment has planned crossing opportunities, not just hoped-for churn.

### 1.4 Segment execution
During segment i:
- Each racer follows its segment curve in position space through existing servo targeting logic.
- Existing traffic/blocking layer stays authoritative (look-before-brake, clearance-checked lane change, hold when blocked).
- If real traffic prevents full attainment at checkpoint p_i, the adaptation rule (section 2) triggers.

## 2. Adaptation rule (precise and L181-safe)

### 2.1 Rule definition
At checkpoint p_i, let:
- X_i be actual live state (rank/t/velocity),
- T_i be intended formation for checkpoint i,
- F* fixed final formation.

Re-plan only future segments i+1..k by solving:
- minimize weighted distance from future targets to F*
- subject to reachability from X_i under speed envelope and traffic constraints
- while preserving planned crossing budget profile as much as feasible.

Formally:
- Build new future targets T'_{i+1}..T'_k from F* and seed namespace (seed, i, replan_count) with feasibility constraints seeded from X_i.
- Keep T'_k = F* exactly.

### 2.2 L181-safety invariant (reviewable)
Forbidden form (re-enters dead end):
- T'_{i+1} = live_order(X_i) or any convex blend alpha*live_order + (1-alpha)*target.

Required form:
- T'_{i+1} = Q(F*, seed, i, constraints(X_i)), where X_i only defines feasible set and budget, never the target identity itself.

Reviewer checklist:
1. Does any target rank equal live rank by construction rule? If yes, reject.
2. Is live order only used to compute feasibility/rate constraints? Must be yes.
3. Is final target always F*? Must be yes.
4. Are any blend terms with live rank present? Must be no.

## 3. Start-row fairness argument (P(win | start row) equality)

### 3.1 Why base fairness carries
Today fairness comes from final row-independent random final formation F* and restoring steering toward it. Chain choreography keeps that same final contract and does not inject row-index terms in intermediate generation.

### 3.2 Neutrality requirements for intermediate targets and re-plans
To avoid row leakage:
- Intermediate generator P_i/Q must never read startRowIndex.
- Any tie-breakers use seed and racer identity, not row.
- Feasibility uses live kinematics only (t/rank velocity/traffic), not row labels.
- Crossing budget is allocated by formation geometry, not by who started in front/back row.

### 3.3 Potential bias leak points and guards
Leak 1: early checkpoints may privilege front starters if displacement budgets are too small.
Guard: enforce minimum cumulative inversion budget by mid-race (for example required proportion of planned cross-row inversion opportunities by p_{ceil(k/2)}).

Leak 2: re-plan could repeatedly relax deep back-row climbs on narrow tracks.
Guard: checkpoint objective includes row-parity regularizer on expected terminal rank access under constraints, still without explicit row targeting in per-racer steering.

Leak 3: traffic deadlocks can create topology-specific row lock.
Guard: kill gate requires row win parity on one open and one closed track, same global rule values.

## 4. Re-roll position
Recommendation: remove re-roll from action generation in chain mode (OFF in experiment branch), keep deterministic tiny jitter only if needed for tie-breaking stability.

Reasoning:
- Owner concept's point is to spend the naturalness envelope on executing choreography, not on dice.
- Lessons 181/182 already show target-follow and finale-dice classes are exhausted for this goal.
- Keeping full re-roll under chain confounds causality in first prototype and masks whether chain itself creates action.

Operationally for prototype:
- Chain mode runs with neutral spread draw (no scheduled-dice contest overlay).
- If visual de-synchronization is too robotic, add bounded micro-noise after fairness pass, but never as late action mechanism.

## 5. Scripted-look risk and diversity guard

### 5.1 Risk
Main perception failure: race looks on rails if checkpoint formations repeat with low entropy.

### 5.2 Variety sources (without violating fairness)
- Seeded permutation family P_i/Q over F*.
- Segment-local crossing budget jitter within fixed bounds.
- Alternate crossing motifs (ladder, braid, stagger) selected by seed.
- Traffic realization variability from honest blocking layer.

### 5.3 Measurable diversity check
Add chain-diversity diagnostics per race:
- Formation entropy H_form: entropy over motif sequence across segments.
- Crossing map distance D_cross: pairwise distance between races' crossing matrices.
- Path-shape variance V_path: variance of hero/non-hero signed arc crossing times.

Reject scripted look if:
- H_form below threshold for large seed sample, or
- D_cross collapses (many seeds produce near-identical crossing maps), or
- Visual metric equivalent of repeated finale ordering pattern exceeds threshold.

## 6. Feasibility on existing machinery and cost class

### 6.1 What carries directly
Direct reuse:
- heroCurveGenerator pattern: seeded deterministic curve generation from anchor state + fixed endpoints.
- heroChoreography primitives: makeHeroCurve, anchorHeroCurve, sampleHeroCurve, minimum-jerk shaping.
- racePlanner servo pipeline: position-space target tracking, slew, phase clock, per-race deterministic state.
- raceBehavior traffic core: overlap-free blocking/overtake mechanics (look-before-brake, lane clearance, hold when blocked).

Needs extension:
- From 2-4 heroes to full-field segment curves.
- Checkpoint scheduler + segment chain data model.
- Re-plan engine at checkpoints with L181-safe invariant checks.
- New observability for per-segment genuine overtakes and diversity metrics.

### 6.2 Honest cost class
Cost class: subsystem replacement inside control layer (not full rebuild).
- Core rendering and traffic physics survive.
- Planner/generator/controller orchestration changes are substantial.

## 7. Cheapest decisive sim-first prototype (exp/chain-choreo)

### 7.1 Prototype scope
Experiment branch: exp/chain-choreo, sim-only.

Minimal build:
1. Enable 3 checkpoints plus fixed final checkpoint.
2. Full-field curve generation with seeded deliberate crossings per segment.
3. One checkpoint re-plan pass (single adaptation event) to validate L181-safe mechanics.
4. Re-roll action OFF for clean attribution.

### 7.2 Pre-registered kill criteria
Primary fairness gate (must pass all):
- P(win | start row) equality on one open and one closed track using same global parameters.
- Statistical test plus practical max-delta threshold on row win probabilities.

Action gates versus shipped baseline:
- Lead changes: non-decrease.
- Genuine overtakes per segment: increase in at least half the segments.
- Dead-finale rate: non-increase.

Safety gate:
- Overlap violations = 0.

Rule-set gate:
- Same parameters on both tracks; any per-track override is auto-fail.

L181 compliance gate:
- Static analyzer/assertion confirms no target assignment reads live rank as target identity or blending term.

## 8. Most likely failure modes

1. Feasibility collapse in dense closed traffic.
- Full-field curve demands may exceed what overlap-safe traffic can execute, causing chronic miss and repeated re-plans that wash out action.

2. Hidden row-bias through feasible-set clipping.
- Even with row-neutral target generator, constraint clipping might systematically spare front starters from hard maneuvers.

3. Scripted feel despite numeric action gains.
- If motif entropy is low, owner may perceive rails even when overtakes count rises.

## Closing line
Build this first as a constrained 3-checkpoint sim prototype with strict L181-safe re-plan invariants and row-conditioned fairness kill gates on open+closed tracks, because it directly generalizes the one measured-working mechanism (authored curve crossings) while preserving the fixed fair final formation contract.