# Step 2 Design Plan: Forward-Looking Lateral Avoidance (Fair + Performance-Aware)

Date: 2026-06-06  
Branch: feat/open-track-overlap  
Scope: Analysis/design only, no code changes

## 1. Baseline and Goal

Step 1 (brake-to-match) is already live and fairness-cleared at N=50, and Y-rejection restored frame budget headroom.

Evidence:
- Step-2 concept to implement: avoid-first with two-part side eligibility and sticky commitment is defined in [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L27), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L31), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L33), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L44), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L58), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L74).
- Current fairness/perf checkpoint context: [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L14), [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L31), [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L233), [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L250).

Design objective for Step 2: reduce visible overlap by moving trailers around leaders (not through), while preserving fairness and not reintroducing expensive inner scans.

## 2. Current Decision Points in Code (Where Step 2 Hooks In)

Current avoidance and brake decisions are concentrated in the pair loop inside [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L267).

Core points:
- Existing all-pairs pass (already the main per-step neighborhood traversal): [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L342), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L343).
- Existing Y-reject prefilter is active before sqrt distance (cheap reject first): in the pair loop body around [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L342).
- Current speed-brake and brake-match zone decision: [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L387), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L391), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L439), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L447).
- Existing immediate side-clear probe function (scan-based): [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L166).
- isSideFree is currently called 4x per overlapping pair: [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L467), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L468), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L469), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L470).
- Brake-match hold/hysteresis state already exists per racer and can be extended (stateful pattern already established): [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L99), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L682), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L706), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L715).
- Runtime brake application point in physics update: [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx#L918), [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx#L928), [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx#L933).
- Behavior function integration point in loop: [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx#L975).

Conclusion: Step 2 should be implemented in and around the existing pair traversal in raceBehavior, not as a new per-racer neighborhood pass.

## 3. Report-05 Avoid-First Logic Mapped to Current Engine

From report 05, Step 2 requires:
- Phase 0: two-part side eligibility (adjacent clearance + forward clearance): [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L27), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L31), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L33), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L35).
- Decision policy (both/one/none sides eligible): [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L38), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L39), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L40).
- Phase 1 sticky side commitment/hysteresis: [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L44), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L46).
- Phase 2b brake fallback only when truly blocked: [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L58), [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L64).

What new information Step 2 needs per trailer this frame:
1. Adjacent-left occupancy now (hard block yes/no).
2. Adjacent-right occupancy now (hard block yes/no).
3. Forward-left clearance score (distance or blocker metric in lookahead corridor).
4. Forward-right clearance score.
5. Primary leader reference for the approach context (already available in pair interactions and brake-match leader tracking).
6. Sticky chosen side state with hysteresis/debounce.

## 4. Performance Design: Derive, Do Not Rescan

### 4.1 Principle

Do not add a new per-racer O(N) scan for side checks. Instead, derive side and forward-clearance data while iterating pairs already visited in [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L342).

### 4.2 Per-check Derivation Map

A) Adjacent clearance (left/right)  
Needed by report-05 Part 1.

- Can be derived in pair loop: YES.
- Method: for each pair surviving Y-reject and entering proximity logic, classify relation from each racer perspective into left/right lane-band occupancy at current t window, then write booleans/counters into preallocated maps keyed by racer index.
- Reuse: same geometry primitives already in use for overlap and side checks (dT, dY, lateralHalfSpan, tHalfSpan) at [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L460) onward.
- Avoid: calling isSideFree-style full active scans per racer.

B) Forward clearance (left/right lookahead corridor)  
Needed by report-05 Part 2.

- Can be derived in pair loop: YES.
- Method: maintain per-racer directional nearest blocker ahead (left/right) as min forward dT among racers that fall inside side corridor band. Pair loop sees all unordered pairs once; update both racers with perspective-correct signed dT.
- Data structure: 4 scalar maps/arrays per racer: minAheadLeft, minAheadRight, densityAheadLeft, densityAheadRight (density optional).
- Tie-break rule: higher minAhead distance wins; if both equal, stable pair hash/tie behavior can follow current deterministic pattern (stablePairBit already exists at [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L127)).

C) Sticky commitment/hysteresis  
Needed by report-05 Phase 1 anti-flip-flop.

- Can be derived without new scans: YES.
- Method: add per-racer state fields (chosenSide, sideCommitFrames, sideReleaseFrames). Transition logic runs in the existing apply-deltas per-racer loop (already stateful) around [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L682).
- Input uses derived directional metrics from pair loop maps.

D) Fallback when no side eligible  
Needed by report-05 Phase 2b.

- Already present behavior class: YES.
- Existing brake-match path and hold state can be reused: [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L706), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L715).

### 4.3 What Would Be Expensive (and should be avoided)

Expensive pattern to avoid:
- Per racer, run independent left/right forward scans across all active racers each frame (O(N^2) additional work beyond existing pair pass).
- Per overlap, repeatedly call scan-based checks similar to isSideFree for larger lookahead windows.

Why expensive:
- Existing pair loop already costs O(N^2) comparisons; adding N per racer turns practical cost toward O(N^3)-like behavior in dense regions.
- isSideFree itself loops active racers [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L170); doing this repeatedly in new contexts multiplies inner-loop pressure.

Cheapest behavior-equivalent strategy:
- Single pair traversal computes all directional occupancy/clearance accumulators once.
- Side decision then becomes O(1) per racer in apply phase.

### 4.4 Cost Estimate (added Step-2 logic only)

Assumptions:
- Existing pair count per step: N(N-1)/2.
- Y-reject skip fraction observed 57-80% depending on track density: [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L233).
- Step-2 derived metrics add constant-time bookkeeping on surviving pairs.

Estimated surviving pairs and additional scalar ops per step:

| Racers | Raw pairs | Survivors @ 20-43% | Extra ops per survivor (est.) | Added ops/step (range) |
|---|---:|---:|---:|---:|
| 40 | 780 | 156-335 | 16-24 | ~2.5k-8.0k |
| 70 | 2415 | 483-1038 | 16-24 | ~7.7k-24.9k |
| 100 | 4950 | 990-2128 | 16-24 | ~15.8k-51.1k |

Interpretation:
- This is moderate incremental arithmetic over an already-required pair walk.
- It is materially cheaper than adding a second neighborhood scan pass (which would add another ~N^2 checks plus branching).

Risk to current P90 budget:
- Low to moderate if implemented as piggyback metrics inside existing pair loop.
- High if implemented with new per-racer scans or repeated scan-based forward checks.

Given current budget gains (P90 21.86ms -> 16.69ms and over-budget 71% -> 8%) from [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L250), piggyback design should preserve headroom; rescan design can consume it quickly.

## 5. Fairness Risk Map for Step 2

Step-2 will change trajectories and pass ordering; fairness checks are mandatory.

### 5.1 Main Risk Vectors

1. Side-choice bias (left/right asymmetry)
- If one side is systematically preferred, some rows/types may benefit disproportionately.
- Mitigation: strict symmetry and deterministic tie-break that is pair-neutral (stable hash already used today in pair context).

2. Hysteresis window too sticky
- Overlong commitment can delay obvious better openings and alter who advances first.
- Mitigation: debounce only against jitter; do not lock for excessive frames. Re-evaluate on true adjacent closure, consistent with report-05 guidance [reports/open-track-overlap/05-avoid-first-brake-to-match-design.md](reports/open-track-overlap/05-avoid-first-brake-to-match-design.md#L46).

3. Hysteresis window too loose
- Frequent flips can produce zigzag and unstable overtakes, affecting outcome variance.
- Mitigation: minimum commit duration + closure-based release criteria.

4. Wide-body handling changes contact envelope
- Honest-width side blocking may reduce unrealistic passes through wide bodies, but can alter pass rates for specific type/track combos (notably dragon-heavy open tracks).

5. Interaction with existing brake-match hold
- If side eligibility is too conservative, racers spend longer in brake hold and can compress queues.
- Mitigation: fallback remains same but entry criteria tuned from derived directional signals, not hard overblocking.

### 5.2 Mandatory Post-build Sweep Checks

After each behavior-changing increment, run N=50 fairness sweep over all 66 combos (same operational gate used recently):
- Primary gate: p >= 0.05 per combo.
- Track-specific watchlist: historically sensitive open combos and dragon rows.
- Additional diagnostics: row-level distribution deltas on combos near threshold.

Reference fairness baseline context: [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L14), [reports/perf/12-y-rejection-sweep.md](reports/perf/12-y-rejection-sweep.md#L31).

## 6. Wide-Body Flag 1 Feasibility (Honest Width at Runtime)

Question: does runtime racer object already expose the body width factor needed for honest-width side checks?

Findings:
- Racer types do define bodyFillX/bodyFillY (example dragon): [client/src/modules/racer-types/DragonRacerType.js](client/src/modules/racer-types/DragonRacerType.js#L43).
- RaceScreen reads bodyFillX/bodyFillY from racerType.config at setup time, but only stores bodyFillNarrow-derived scaling and sprite size on racer instances: [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx#L419), [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx#L603).
- raceBehavior relies on racer-visible width proxies (visibleWidthPx or spriteWorldSizePx) and has no bodyFillX field usage: [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L134), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L137).
- Report 06 already flagged this uncertainty before implementation: [reports/open-track-overlap/06-step1-operationalization.md](reports/open-track-overlap/06-step1-operationalization.md#L355).

Conclusion:
- Honest body fill ratio is available in racer type config, but not currently attached as a dedicated runtime field on each racer object consumed by raceBehavior.

Minimal safe way to enable Flag 1:
1. At racer construction in RaceScreen, attach immutable per-racer width factor fields from racerType.config (for current single-type race this is constant across racers, but still safest to bind explicitly per racer).
2. Keep existing sprite size fields unchanged.
3. In raceBehavior, compute honest lateral half-span from existing sprite width proxy multiplied by stored fill factor.

Why this is minimal and safe:
- No algorithmic scan changes.
- Purely data plumbing + local geometry substitution.
- Keeps derive-don’t-rescan architecture intact.

## 7. Staged Build Plan (Small Safe Increments)

Each stage is independently measurable. Do not batch behavior and perf-risk changes.

### Stage A: Instrumented Derivation Skeleton (no behavior change)

Build:
- Add derived directional accumulators in pair loop only.
- Compute adjacent/forward metrics but do not consume for decisions yet.

Checks:
- Frame log compare vs checkpoint.
- Sanity diagnostics (metric ranges, non-NaN, deterministic tie behavior).

Gate:
- If frame-time regression exceeds small tolerance, optimize before enabling behavior.

### Stage B: Use derived adjacent-clearance for existing overlap-side logic (behavior-near-equivalent)

Build:
- Replace repeated scan-based side checks for overlap path where possible with derived flags.
- Keep overtaking policy unchanged (no avoid-first yet).

Checks:
- Frame log.
- Quick fairness smoke (short run), then targeted N=50 spot checks on prior-sensitive combos.

Gate:
- No fairness red flags, no visible behavior drift outside tolerance.

### Stage C: Enable avoid-first side selection (Part 1 + Part 2) without sticky commitment

Build:
- Activate decision policy from report 05 (both/one/none) using derived adjacent + forward metrics.
- Fallback remains brake-match.

Checks:
- Feel/playtest for around-not-through behavior.
- Full frame log comparison.
- Mandatory N=50 full 66-combo fairness sweep.

Gate:
- Fairness pass and no meaningful P90 regression beyond agreed budget.

### Stage D: Add sticky commitment/hysteresis

Build:
- Introduce chosen-side state and closure-based re-evaluation/debounce.

Checks:
- Zigzag/oscillation visual check.
- Frame log.
- Mandatory N=50 fairness sweep.

Gate:
- No new fairness failures; visible motion smoother than Stage C.

### Stage E: Flag 1 honest-width integration

Build:
- Add runtime body fill field plumbing and honest-width lateral span usage.

Checks:
- Dragon-heavy overlap reduction scenarios.
- Frame log.
- Mandatory N=50 fairness sweep (all 66) due envelope change.

Gate:
- Overlap reduction achieved without fairness regressions.

### Stage F: Cleanup and production hardening

Build:
- Remove temporary diagnostics not needed in production.
- Freeze constants and document tuning knobs.

Checks:
- Final frame log on representative hardware.
- Final N=50 fairness confirmation.

## 8. Concrete Design Rules to Protect Perf and Fairness

1. Single neighborhood traversal rule
- Step-2 neighborhood facts must come from the existing pair walk in [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L342), not from additional per-racer scans.

2. O(1) decision application rule
- Side choice per racer must read precomputed metrics and state in O(1).

3. Symmetry rule
- Left/right scoring and tie logic must be mathematically symmetric.

4. Bounded hysteresis rule
- Commitment must prevent flip-flop but re-open when adjacent closure is real (not transient forward-score noise).

5. Sweep-after-change rule
- Every behavior-affecting stage requires fairness sweep before advancing.

## 9. Recommended Review Checklist Before Coding

1. Does any new function iterate all active racers per racer per frame?
2. Are forward-clearance numbers fully derived from pair-loop accumulators?
3. Are left/right decisions symmetric except deterministic tie-break?
4. Is sticky commitment bounded and closure-driven?
5. Is Flag-1 data plumbing explicit on runtime racer objects?
6. Is each stage independently measurable with frame log and fairness sweep?

## 10. Final Assessment

Step 2 is feasible without sacrificing the current performance recovery if implemented as a piggyback design inside the current pair loop. The highest risk is not the avoid-first policy itself; it is accidental reintroduction of scan-heavy neighborhood checks. Fairness risk is manageable with symmetric side policy, bounded hysteresis, and strict N=50 sweep gating after each behavior increment.

## 11. Addendum - Y-Rejection vs Forward-Clearance Completeness

### 11.1 Does Y-rejection hide pairs needed by forward-clearance?

Yes. If forward-clearance accumulators are populated only from pairs that survive the current Y-rejection, the data can be incomplete.

Current Y-rejection gate (before sqrt):
- [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L351)
- Keep condition in lateral axis is:
	- `|dY| < avoidanceDistance / yWeight`
- Current defaults:
	- `avoidanceDistance = 0.18`, `yWeight = 1.0` at [client/src/modules/storage/defaults.js](client/src/modules/storage/defaults.js#L510) and [client/src/modules/storage/defaults.js](client/src/modules/storage/defaults.js#L449)
	- So Y-rejection keep width is `|dY| < 0.18`.

Forward/side corridor geometry used by side-clear logic:
- `lateralHalfSpan = spriteWorldSize / trackWidth` at [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L458)
- `targetY = racerY + dir * lateralHalfSpan` and blocker test `|otherY - targetY| < lateralHalfSpan` at [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L167) and [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L174)

That means one-side relevant pairs are within:
- `|dY| <= 2 * lateralHalfSpan` (from own lane to the outer edge of target side band)

No-hole condition is therefore:
- `2 * lateralHalfSpan <= avoidanceDistance / yWeight`
- Equivalently: `spriteWorldSize / trackWidth <= 0.09`

This threshold is very small. With dragon display size 50 ([client/src/modules/racer-types/DragonRacerType.js](client/src/modules/racer-types/DragonRacerType.js#L42)) and reference track width 98 ([client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L22)), `lateralHalfSpan ~ 0.51`, so corridor reach `2L ~ 1.02`, far wider than `0.18`. Therefore the hole is real.

### 11.2 Cheapest no-rescan fix

Use a two-gate approach in the same existing pair loop:

1. Compute cheap pair geometry once (`dY`, `dT`, `lateralHalfSpan`, `tHalfSpan`) inside the existing `i<j` loop.
2. Before the avoidance Y-rejection `continue`, run a cheap "clearance gate" branch:
	 - Populate adjacent/forward accumulators when `|dY| <= clearanceYGate`, where `clearanceYGate` is derived from side corridor width (at least `2 * lateralHalfSpan`, and with Flag 1 based on honest width).
	 - Apply a forward `dT` window check there as another O(1) compare.
3. Keep current avoidance Y-rejection unchanged for avoidance/brake physics branch.

Why this is cheapest:
- Still one pass over pairs (`O(N^2)`), no per-racer rescan.
- Adds only constant-time checks/updates per candidate pair.
- Preserves the major Y-rejection win because expensive work (sqrt + full avoidance/brake logic) remains guarded by the original gate.

### 11.3 Adjacent-clearance hole check

Adjacent-clearance has the same geometric exposure if it is also derived only from Y-rejection survivors.

Reason:
- Adjacent occupancy uses the same target side band (`targetY +/- lateralHalfSpan`) in [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L167) and [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L174).
- So relevant lateral range is also up to `2 * lateralHalfSpan`, which can exceed `0.18`.

Important nuance:
- If adjacent-clearance is still computed by direct active-scan calls (`isSideFree`) as currently used at [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L467), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L468), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L469), [client/src/modules/raceBehavior.js](client/src/modules/raceBehavior.js#L470), then this specific hole does not apply to adjacent.
- But for the intended piggyback-accumulator design (all four pieces derived in-loop), adjacent must use the same pre-Y accumulator branch to stay complete.

### 11.4 Completeness decision

Status before this addendum:
- Piggyback design was not complete for forward-clearance (and not complete for adjacent either if adjacent is accumulator-derived), because Y-rejection could remove needed side-corridor pairs.

Status with this addendum's fix:
- Piggyback design is complete and correct for all four pieces (adjacent left/right, forward left/right), without reintroducing scan-based complexity.
