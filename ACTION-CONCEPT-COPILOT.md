# ACTION INTO A FAIR GAME v2 — Copilot report

Report-only. Independent. No code changes. No sim runs.

## 1. Critique and hardening of the split-and-script system

The split is still the right foundation:
- Fair substrate: about 70% sorted toward drawn bands.
- Action substrate: a bounded scripted minority that creates watchable conflict.

What needed correction in v2:
- Action must span gun to line, not only finale.
- Brief momentary-leader brake beats are explicitly in scope, including during sorting.

Hardening points:
1. Failure mode: action scripts cluster in the same race interval, leaving long quiet stretches.
   Fix: enforce story relay occupancy from gun to line and optimize for longest-actionless-window reduction, not only overtake counts.
2. Failure mode: slider becomes non-monotonic because script interactions collide (especially in closed-lane scarcity).
   Fix: slider controls a constrained budget vector, not raw script count. Higher slider increases action quotas monotonically while preserving hard safety/fairness caps.
3. Failure mode: scripted leader-brake beats drift into the dead continuous-leash pattern.
   Fix: strict beat grammar constraints (time-bounded, duty-cycle-capped, seeded, non-persistent target ownership) so it cannot become continuous suppression.
4. Failure mode: recognizable repeated story shapes.
   Fix: seed-driven script grammar plus anti-repetition constraints and diversity gate metrics.

Recommendation: formalize a two-layer control contract with an explicit script executor:
- Layer A: deterministic fair sorting toward fixed draw.
- Layer B: short-range, row-blind scripted beats under envelope/traffic constraints, active across the whole race.

## 2. New mechanisms (beyond owner and planner set)

### N1. Corkscrew Swap Ladders

Concept:
- In each active band, pick a short 3-4 racer ladder.
- Execute phased side-intention crossings (A over B, B over C, optional C over D) across a compact progress window.
- No extra top speed. Movement comes from legal lane contest and timing.

Why it adds action:
- P4 gives isolated duel pairs; this creates micro-cascades and local turbulence across multiple ranks.
- It produces continuous mid-race life outside only-B1 focus.

Fairness:
- Endpoints are band-local and short-range.
- Ladder membership is seeded, row-blind.
- Unfinished swaps are absorbed by next checkpoint re-plan toward fixed draw.

Leak paths and guards:
- Leak: repeated overuse of same racers.
  Guard: per-racer exposure cap and cooldown.
- Leak: closed-track choke.
  Guard: dynamic width downshift 4->3->2 via one global scarcity rule.

Cost class:
- Overlay extension on chain + traffic core.

### N2. Blindside Channel Reveal

Concept:
- Open a temporary preferred channel on one side for one pursuer group while defender group is mildly centered.
- Window closes and groups must re-merge under live traffic, creating natural pass completion battles.

Why it adds action:
- Jam-and-burst focuses on compression-release from braking.
- Channel reveal adds geometric opportunity creation and forced resolution conflict.

Fairness:
- Channel side and group assignment are seeded and row-blind.
- All displacement remains short-range and envelope-bounded.
- Final convergence remains fixed-draw anchored.

Leak paths and guards:
- Leak: side bias across seeds.
  Guard: left/right parity audit.
- Leak: unresolved channel occupancy increases dead finales.
  Guard: hard closure with mandatory eased neutral return by checkpoint.

Cost class:
- Subsystem extension (script executor plus channel-state observer).

### N3. Feint-and-Counter Pairing

Concept:
- Same-band pair receives a two-step story:
  - Feint racer gets short early edge to draw defense.
  - Counter racer gets delayed opening into released lane.
- Delivers setup-and-payoff overtakes without deep arcs.

Why it adds action:
- Adds narrative causality not captured by pure swap counts.
- Low peak envelope load per successful pass.

Fairness:
- Pairs remain same-band or adjacent with bounded displacement.
- Pair selection is row-blind and exposure-balanced.
- Fixed draw remains terminal contract.

Leak paths and guards:
- Leak: feint fires but counter never materializes in dense traffic.
  Guard: watchdog timeout forces neutral decay and marks script as failed.

Cost class:
- Overlay extension, low-medium.

### N4. Pulse Brake Baton (new leader-brake beat family)

Concept:
- Short scripted pulses apply mild malus to the momentary leader of a local contest group.
- Pulse lasts only a tiny progress span, then baton passes off; no racer can be pulsed continuously.
- Designed to trigger 2-3 genuine overtakes, then release.

Why it adds action that others do not:
- Provides cheap, whole-race action beats from sorting phase onward.
- Explicitly exploits the owner's wanted braking-side legality under two-sided envelope.

Fairness and Leash distinction (required):
- Not the retired Leash:
  - Leash was continuous feedback braking of leader to prevent escapes.
  - Pulse Baton is discrete, seeded, bounded-duration story beats with hard duty-cycle ceiling.
  - No persistent target ownership and no continuous gap-control loop.
- Row-neutrality: trigger timing and baton selection are seed-based and row-blind.
- Fairness guard: total malus budget per racer is capped and balanced by cohort quotas.

Leak paths and guards:
- Leak: script degenerates into pseudo-continuous suppression.
  Guard: max pulse length, minimum cool-off, max pulses per racer, and race-level malus duty-cycle cap.
- Leak: closed-track deadening.
  Guard: automatic pulse thinning when lane scarcity index exceeds threshold (global rule).

Cost class:
- Overlay extension on existing actuator path.

## 3. Script pool design (whole race, seeded, row-blind)

### 3.1 Broad script type pool
Owner/planner scripts plus additions:
- Fallbacker
- Comebacker
- Momentary-leader brake beats
- Intra-band rotation
- Story relay
- Jam and burst
- Photo-finish fan
- Band-local duel pairs
- Corkscrew swap ladders
- Blindside channel reveal
- Feint-and-counter pairing
- Pulse brake baton
- Two-wave relay (early and late)
- Late mirror inversion

### 3.2 Per-race draw and compile pipeline
1. Derive script-seed from race-seed and fixed salt.
2. Sample script families by slider-weighted quotas.
3. Apply hard constraints:
   - gun-to-line occupancy floor,
   - max concurrent scripts,
   - per-racer exposure cap,
   - per-band participation minimum,
   - left/right parity tendency,
   - pulse-duty-cycle limit.
4. Compile timeline with envelope and overlap feasibility checks.
5. If compile fails, deterministic bounded re-draw.

Row-blindness rule:
- startRowIndex is forbidden in draw, assignment, and timing logic.

### 3.3 Variety and repetition metrics
1. H_script: entropy of script-type sequences.
2. C_sig: near-duplicate timeline signature collision rate.
3. LAW_full: longest actionless window over full race front-view.
4. LAW_last50: longest actionless window in last 50%.
5. P_periodic: periodicity/autocorrelation of lead-change intervals.

Variety pass:
- H_script above floor,
- C_sig below cap,
- P_periodic below cap,
- LAW_full and LAW_last50 improved vs baselines.

## 4. Fairness argument and leak guards (including leader-brake distinction)

### 4.1 Core fairness carrier
- Fixed final draw remains terminal contract.
- Fair substrate delivers majority to drawn bands.
- Action cohort remains short-range and checkpoint-absorbed.

### 4.2 Universal leak paths and guards
Leak A: row-skewed script assignment.
- Guard: strict row-blind seeded assignment plus per-row exposure audit.

Leak B: unresolved excursions near finish.
- Guard: mandatory checkpoint absorb/re-plan with L181-safe invariant.

Leak C: envelope saturation concentration.
- Guard: per-racer saturation quota and cooldown.

Leak D: closed-lane scarcity inversion.
- Guard: global scarcity-adaptive thinning/downshift, no per-track constants.

### 4.3 Leader-brake beat vs Leash (explicit)
Why allowed:
- Script beat: discrete, bounded, sparse, seed-drawn, story-scoped.
- Leash: continuous anti-escape controller with persistent suppression objective.

Non-regression guard pack:
- Pulse duty-cycle cap per race.
- Max consecutive pulse span.
- Mandatory off-gap between pulses.
- Per-racer pulse cap.
- Auto-fail if pulse occupancy approximates continuous control profile.

## 5. Feasibility and cost

What carries from existing machinery:
- Chain/B15 substrate and checkpoint path.
- Curve primitives (minimum-jerk/anchor/sample).
- Existing servo and two-sided envelope clamp.
- Traffic core with overlap-safe behavior.
- Existing fairness and action observers as base.

What is newly required:
- Script compiler and scheduler.
- Whole-race relay occupancy planner.
- Leader-brake pulse executor and duty-cycle watchdog.
- Story success telemetry and failure recovery.
- LAW_full and LAW_last50 observers.
- Variety metrics pipeline.

Honest cost class:
- Subsystem replacement in race-direction layer, not full race-core rebuild.

## 6. Cheapest decisive sim plan

### 6.1 Screen phase (paired, 4 tracks x N=20)
Comparators:
- Ship control.
- Plain B15 substrate.

Tracks:
- Two open and two closed, fixed set.

First arms:
1. Split baseline, owner scripts only, slider low/mid/high.
2. +N1 Corkscrew ladders.
3. +N2 Channel reveal.
4. +N3 Feint-counter.
5. +N4 Pulse brake baton.
6. Curated combined pool (owner/planner + N1/N2/N3/N4).

### 6.2 Pre-registered screen kill criteria
Hard gates per track:
- Band-reach >= 70%.
- Holm row fairness not worse than baseline category.
- Strict-phase overlaps = 0.
- Envelope violations = 0.

Action must beat both comparators:
- Lead changes >= Ship and >= B15.
- Dead-finale <= Ship and <= B15.
- LAW_full and LAW_last50 p50/p90 lower than Ship and B15.
- Script family success rates above thresholds.

Slider monotonicity:
- Increasing slider must not decrease median action score.
- Fairness and Holm metrics must remain flat within guard band.

Leader-brake non-Leash check:
- Pulse duty-cycle remains below cap in all tracks.
- No racer exceeds per-race pulse cap.

### 6.3 Gate phase (N=100 x 4)
Only screen winners advance.
Gate confirms:
- fairness and safety hard gates,
- slider monotonicity,
- story success stability,
- LAW improvements,
- variety metrics at larger N,
- no open/closed inversion on primary action outcomes.

## 7. Most likely death modes

1. Closed-track lane scarcity blocks script resolution.
- Symptom: higher dead finales and long actionless windows despite many attempted scripts.

2. Split remains fair but fails to beat shipped action stack.
- Symptom: clean fairness, flat-or-worse action versus Ship.

3. Scripted look despite metric wins.
- Symptom: measurable action but recognizable repeated race shapes in owner eye test.

## Closing line
Build first a minimal split-plus-script compiler with owner patterns plus N1 Corkscrew ladders and N4 Pulse Brake Baton, because this is the smallest extension that covers whole-race action (including sort phase), directly tests the owner’s braking-side premise, and still preserves strict fairness and safety gates against both Ship and plain B15.