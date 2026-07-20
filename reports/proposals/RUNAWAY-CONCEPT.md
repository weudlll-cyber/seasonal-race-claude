# CONCEPT — Runaway-Winner Mitigation: Front Distance Leash + Late Challenger

## PROBLEM (measured, commit f40a7a6 baseline)
23.5% of races end as a runaway: a racer leading by >= 3 lengths at progress 0.90 wins
unchallenged in ~94/99 cases. Closed tracks are worst (searound 30%, dirt-oval 28%) vs
open (18%). Lesson 179: the gap forms BEFORE 0.90 — nothing after that point rescues the
race. Guard metric: paradeFinishRate (baseline 2%) — a tight group pacing to the line far
ahead of the field is the failure mode on the OTHER side of "too controlled".

## DESIGN PRINCIPLE (Lesson 178, binding)
Action lives in orchestration, not liberation. Both mechanisms below AUTHOR behavior;
neither frees constraints. Both are flag-gated, default OFF, byte-identical to the shipped
fingerprint baseline (72c3360fb75225ef, count=3) when OFF.

## MECHANISM A — Front-Cluster Distance Leash
The servo already steers B1 heroes into a tight front cluster (ranks 2,3,4, strictness
1.0) until the front-contest release at _choreoReleaseProgress 0.97 — but only in RANK
space. A rank-1 racer can satisfy every rank target while pulling many LENGTHS ahead.
The leash adds a GAP-space term: whenever the leader→P2 gap exceeds frontLeashMaxLengths,
a mild bounded correction engages (within the existing ~+10% trajectoryMult authority)
until the gap is back inside the leash. Proposed flags: frontLeashEnabled,
frontLeashMaxLengths, frontLeashGain.
Fairness by construction: the leader is B1 and stays B1 — within-band reordering is
explicitly permitted; gates verified anyway.
OPEN QUESTIONS for review (answer independently):
  A1. Apply to whoever holds rank 1 (hero or not), or to choreographed heroes only?
      Note the runaway leader may be a non-hero pack racer with target rank 1.
  A2. Leader-only correction (brake down) vs symmetric (brake leader + lift chasers)?
  A3. Active window: choreo start (0.60) → release (0.97)? Earlier? Later cutoff to
      protect the run-out?
  A4. Stability: what prevents oscillation at the leash boundary (cf. the pack-release
      re-steer hysteresis and the 1s trajectoryMult slew)?
  A5. Which existing code paths should carry this? Name concrete candidates.

## MECHANISM B — Late Challenger
Authored repair when a gap forms anyway: if the leader→P2 gap exceeds a trigger threshold
inside a trigger window (e.g. progress 0.75–0.85), cast ONE feasible B1-assigned racer
onto an authored climb-to-contact curve (target: within ~1 length of the leader by ~0.95),
after which the normal front-contest release decides the winner naturally. Feasibility
must be enforced like attackerTiming/racerFeasibility — an infeasible challenger is
skipped, never cast unfair. Proposed flags: lateChallengerEnabled,
lateChallengerTriggerLengths, lateChallengerWindow.
OPEN QUESTIONS for review:
  B1. The hero generator currently runs ONCE at the choreo boundary. A conditional
      mid-race cast is new architecture. Is a second, late generator pass sound — or is
      an UNCONDITIONAL variant (always cast one B1 "closer" whose curve pins it within
      leash distance of rank 1 through the endgame) the better fit?
  B2. If reactive: how does the curve anchor to live state (rank-velocity) this late?
  B3. Interaction with Mechanism A when both are ON: complementary or conflicting?
  B4. Risks to B1/B2 band-reach or Holm from the challenger's climb?

## SUCCESS CRITERIA (for the later sweep, stated now)
- runawayWinnerRate: 23.5% → target < 10%, no track above 15%.
- Top-5 OUTCOME action: no loss vs baseline (the shipped +21% must survive).
- paradeFinishRate: must NOT rise above baseline 2% (leash compression risk).
- B1/B2 band-reach >= 70% all tracks; Holm <= 2/4; casting yield >= 0.95.
- Flags OFF → fingerprint byte-identical to 72c3360fb75225ef.
- Measurement via the runaway-parade observer + exp-runaway-leader orchestrator
  (docs/SWEEP-HARNESS.md); same seeds as the f40a7a6 baseline for direct comparison.

## REVIEW DELIVERABLE
For each mechanism: feasibility in the current servo/generator architecture (name files
and integration points), risks and edge cases (finish compression, early finishers,
oscillation), your answers to the numbered open questions, anything this concept misses,
and a clear recommendation: build as proposed / build modified (how) / reject (why).

---

## DECISION (2026-07-20, owner — after both independent reviews)

Both independent reviews (CC + Copilot, in this directory) were read and merged. Decision:

### Mechanism A — Front-Cluster Distance Leash: **BUILD, modified.**
The load-bearing, metric-aligned mechanism (it acts in gap-space, where `runawayWinnerRate` is
defined). Build as:
- **Leash on the current RANK-1 racer (hero or not)** — the physically-frontmost racer by `t`, since
  the leader may be a non-hero with target rank 1 and even a hero leader is released to natural at 0.97.
- **Leader-only, PROPORTIONAL gap-brake** (brake ∝ gain·(gap − max), eased to zero as the gap closes) —
  not symmetric; lifting chasers manufactures the parade-finish failure mode.
- **Hysteresis** (engage at `frontLeashMaxLengths`, disengage a margin below) + **reuse the existing 1 s
  `trajectoryMult` slew** for anti-oscillation.
- **Window [0.6, ~0.92]** — from OUTCOME start (do NOT wait for 0.90; Lesson 179), with a cutoff before
  the run-out so the finish stays genuine.
- **B1 floor** — never brake the leader out of B1.
- **Shared length scale via `raceLengths.js`** (`arcT` + `lenScaleFrom`) threaded **parity-safe** into
  `update()` and BOTH callers (`index.jsx`, `sim-fairness.mjs`) — this plumbing is the real cost, and the
  same code path the runaway-parade observer already uses (steer-on == measure-on by construction).
- Flag-gated (`frontLeash*`), default OFF → byte-identical to `72c3360fb75225ef`.

### Mechanism B — Late Challenger: **reactive form REJECTED; unconditional form DEFERRED.**
The reactive late cast fights the once-per-race, boundary-anchored generator AND hits a near-empty
feasibility budget that late (`remaining ≈ 0.2`), so it mostly skips exactly when needed. Rank-space curves
also cannot express "within ~1 length" — only A's gap-space term can. **Re-entry condition:** revisit an
*unconditional* B1-closer variant ONLY if measurement after A ships shows the front present in RANK but
still not contesting in LENGTH at the line — and measure that residual first.

### Concept corrections adopted
- **"casting yield ≥ 0.95" dropped as a criterion for A** — A casts nothing, and no `castingYield` metric
  exists in the code (feasibility is boolean skip). It re-applies only if a casting mechanism (B) is ever built.
- **Brake authority is −15% (minMult 0.85), not "+10%"** — the leash's relevant (braking) side has more
  headroom than the concept assumed; plan the gain accordingly.
