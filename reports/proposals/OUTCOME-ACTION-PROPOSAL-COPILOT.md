# OUTCOME Action Proposal (Copilot) — Sustained Multi-Racer P1 Battle

Reviewer: Copilot. Independent proposal. The other proposal file was not read.
Scope: ideation and architecture review only. No code changes.

## 0) Verified Ground Truth (source-backed)

- The current OUTCOME controller converges racers toward assigned ranks in `client/src/modules/racePlanner.js` (`update`), with B1 heroes released at `choreoReleaseProgress` (default `0.97` in `client/src/modules/storage/defaults.js`).
- B2 attackers are already shipped (`b2AttackHeroes=3`, `b2AttackBandArrival=true`) as the biggest OUTCOME action win so far (commented in `client/src/modules/storage/defaults.js`).
- Universal release/liberation has existing dedicated switches (`universalBandArrival`, `packReleaseEnabled`) and was already measured as the wrong direction.
- Gap-cap re-roll is now implemented as a scheduled-roll transform (`computeGapBiasedTarget`) in `client/src/modules/racePlanner.js`, called from both browser and sim re-roll loops, with default OFF in `client/src/modules/storage/defaults.js`.
- Measured speed-source diagnosis confirms the late escape is primarily natural spread draw (`spreadFactor`) and not post-bonus factors (`exp-runaway-leader-results/speed-source/SUMMARY.md`).
- Earlier release was explicitly tested and refuted as an action lever with fairness drift cost (`exp-runaway-leader-results/release-sweep/SUMMARY.md`).

Conclusion from facts: the remaining deficit is not "any late pass"; it is lack of sustained, multi-racer P1 contest density in the final window.

---

## 1) Candidate Mechanisms

### Candidate A (Rank 1): B1 Baton Choreography in OUTCOME (authored multi-holder front script)

#### Core idea
Keep orchestration, but stop converging B1 to one stable front order before the run-out. Generate an explicit B1 "baton" sequence during OUTCOME where 3-4 B1 contenders are authored to take turns touching rank 1 before release, then still release naturally at the configured release point.

This is not liberation and not a speed-force add-on. It is authored role choreography inside existing band constraints.

#### Why it fits constraints
- Orchestration-first: yes (authored sequence, not free drift).
- No new acceleration beyond natural band requirement: satisfied by staying within existing servo envelope and role curves; no extra multiplicative factor beyond current chain.
- No manufactured 2-racer duel: designed specifically for 3+ contenders.
- Band model: all changes remain within B1 endpoint/band legality.

#### Feasibility in current architecture
- Primary generation hook: `client/src/modules/heroCurveGenerator.js` (`generateHeroCurves`, `soloWaypoints`, role assembly around B1 cluster logic).
- Runtime tracking already exists: `client/src/modules/racePlanner.js` samples hero curves per frame and already handles release behavior.
- Same-band legality utility already exists: `sameBandSwap` in `client/src/modules/heroCurveGenerator.js`.

Implementation shape:
- Add a new optional cast pattern for B1 contenders: a deterministic sequence of rank-1 touches in OUTCOME.
- Keep endpoint ranks in B1 and preserve overall band assignment invariants.
- Use existing release config and no hardcoded timing literals: derive from live `choreoOutcomeStart` and `choreoReleaseProgress`.

#### Fairness argument under band model
- Endpoint band assignment remains sacred.
- Within-band reordering is explicitly permitted.
- No cross-band objective is introduced.

#### Risks and kill conditions
- Risk: over-scripting can look fake if baton cadence is too regular.
- Risk: too many front beats may increase post-release band exits indirectly.
- Kill condition: if B1/B2 band-reach or Holm regresses, or if front action rises only by two-racer alternation.

#### Expected effect size
Moderate to high on sustained P1 action, because it directly targets the front-order convergence mechanism that currently stabilizes too early.

---

### Candidate B (Rank 2): Front-Group Gap-Reroll Extension (scheduled dice, front contest density mode)

#### Core idea
Extend the existing gap-cap re-roll transform from "anti-escape" to "front contest density" for a small front group. While keeping scheduled rolls only, bias draws so top-front gaps do not collapse to one holder but also do not detach, keeping 3+ racers plausibly in P1 reach.

#### Why it fits constraints
- Reuses the shipped cohesion instrument (`computeGapBiasedTarget`) and scheduled cadence rule.
- No new force multiplier; operates only on scheduled spread draws within honest spread band.
- No extra re-rolls.

#### Feasibility in current architecture
- Shared transform home already exists: `client/src/modules/racePlanner.js` (`computeGapBiasedTarget`).
- Browser + sim integration points already call that transform in re-roll loops:
  - `client/src/screens/RaceScreen/index.jsx`
  - `scripts/sim-fairness.mjs`
- Shared distance unit already available:
  - `client/src/modules/raceLengths.js`
  - `scripts/sim/observers/runaway-parade.mjs` (`leaderGapLengths`).

Implementation shape:
- Add optional front-group mode (flagged) with deterministic per-roll bias based on local front topology.
- Keep dead zone and honest-band clamp.
- Derive all windows from live config (no hardcoded progress constants).

#### Fairness argument under band model
- Changes only spread re-draws, not assigned bands.
- No direct cross-band steering target added.

#### Risks and kill conditions
- Main risk: cadence ceiling. Scheduled roll frequency may be too sparse for strong sustained front effects at some durations.
- Main perceptual risk: "held" leader duty-cycle if bias engages too often.
- Kill condition: duty-cycle climbs while sustained multi-racer P1 metric does not materially improve.

#### Expected effect size
Low to moderate on sustained multi-holder P1 battle; strong at runaway suppression, weaker as a pure front-show tool.

---

### Candidate C (Rank 3): B1 Micro-Reentry Orchestration (guarded re-steer pulses, not full freedom)

#### Core idea
Add a B1-only micro-orchestration mode after initial B1 arrival: contenders are briefly released inside B1, then re-steered by deterministic re-entry pulses keyed to band-edge and spacing state. This is not universal band-arrival; it is a bounded authored pulse loop for B1 only.

#### Why it fits constraints
- Orchestration, not liberation: yes (explicit pulse schedule/rules with re-steer guards).
- No camera dependence.
- No extra re-rolls.

#### Feasibility in current architecture
- Strictness and release control already live in `client/src/modules/racePlanner.js` (hero/non-hero strictness handling).
- Existing hysteresis patterns can be reused conceptually (pack release state machine already present).

#### Fairness argument under band model
- B1-only and band-guarded.
- Re-steer remains active if racers drift toward band exits.

#### Risks and kill conditions
- Highest risk of repeating the historical liberation failure if pulses are too weakly guarded.
- Complex tuning surface.
- Kill condition: any monotone rise in bandExitAfterRelease without clear sustained multi-racer P1 gain.

#### Expected effect size
Potentially moderate, but risk-adjusted lower confidence than Candidate A.

---

## 2) Proposed Success Metric for "Real Sustained P1 Race Action"

Create a new read-only observer, for example `scripts/sim/observers/outcome-front-battle.mjs`, fed per-frame from the same sim pass that already feeds runaway-parade and release-contest observers.

### Proposed metric definition (precise)

Window:
- Start = live `choreoOutcomeStart` (from config/plan), derived at runtime.
- End = race finish (or optionally `choreoReleaseProgress` for a companion pre-release view).

Per frame:
- Rank live racers by `t` descending.
- Compute length gaps to P1 in racer-length units using shared conversion (`arcT` + `lenScaleFrom`).
- Define contenders as racers with gap-to-P1 <= `frontContestLen` (observer parameter; default candidate 1.5L).

Per race outputs:
- `p1MultiShare`: fraction of window frames where contender count >= 3.
- `p1LongestMultiSec`: longest continuous duration (seconds) with contender count >= 3.
- `p1DistinctHolders`: number of distinct racers holding P1 in window.
- `p1CleanLeadChanges`: count of lead changes where outgoing leader did not just finish (same "real pass" rule as release-contest tracker).

Recommended gate bundle (alongside existing gates):
- `p1MultiShare` median >= 0.35.
- `p1LongestMultiSec` median >= 3.0s.
- `p1DistinctHolders` median >= 3.
- Keep existing: runaway/parade/action/fairness/fingerprint gates unchanged.

Why this metric is better than p1Swap alone:
- `p1SwapAfter090` can be satisfied by one late overtake.
- Owner explicitly requests sustained multi-racer battle, so frame-share and streak length are required.

---

## 3) Ranking and Build Order

1. **Build first: Candidate A (B1 Baton Choreography).**
   It directly targets the known front-order convergence behavior in OUTCOME, matches orchestration law, and is least dependent on roll cadence.

2. **Build second: Candidate B (Front-Group Gap-Reroll Extension).**
   Low implementation risk due existing transform path, but likely capped effect size for sustained P1 battle.

3. **Build third (only if needed): Candidate C (B1 Micro-Reentry Orchestration).**
   Plausible but highest risk of recreating liberation-style drift if not tightly bounded.

---

## 4) Practical Recommendation

Start with Candidate A plus the new sustained-front observer. Run a small smoke sweep first to verify metrics wiring and determinism, then full paired seeds against the current confirmed gap-reroll setting. If A improves sustained-front metrics without fairness drift, keep B as optional polish; if A underdelivers, layer B before considering C.