# ACTION Consultation - Copilot (independent, read-only)

## Independence and scope

This is an independent Copilot consultation.
I did not read `results/ACTION-CONSULTATION-CC.md`.
No code changes, no commits, no new measurements were run.

## Short verdict

The most promising path is to move OUTCOME control from exact-rank persistence toward band-membership persistence, using existing controller primitives.

Recommended direction:
- Keep strong correction for racers outside their assigned band.
- Reduce or neutralize correction for racers already inside band.
- Re-engage correction immediately when a racer leaves band.

This addresses the Owner complaint directly: it frees within-band movement (action) while preserving the hard fairness contract at the band boundary.

## What is verified at source

Checked behavior:
- The controller computes both rank error and band error, then blends them via strictness.
- OUTCOME correction currently runs continuously; there is no shipped per-racer "inside band, stay released" loop for the pack.
- Hero release exists as shipped precedent (`choreoReleaseProgress`) and uses target-to-current neutralization.
- Re-roll still runs late race (`reRollLastPositionPercent`), but distance bias function is phase-gated to PULK and to `pulkRacerIds` only.
- Current defaults include `choreoOutcomeStart: 0.6`, `choreoPackBandStrictness: 0.5`, `choreoReleaseProgress: 0.97`, `pulkBiasGain: 2.0`.

Not checked in this consultation:
- No new simulation or browser measurements for these ideas.
- No direct numeric attribution of the B3 drop to one factor (controller-time vs traffic vs variance) from fresh data.

## Q1) Rank vs band servo

Yes. A band-centric servo is feasible with existing mechanics.

Why:
- The controller already computes band bounds and band error.
- The blend already exists: strictness controls exact-rank pressure versus band-edge pressure.

Practical interpretation:
- Exact-rank steering is currently over-enforced for fairness needs.
- Switching the pack to a band-membership objective in late OUTCOME is mechanically aligned with existing logic and requires no new subsystem.

Main risk:
- If exact-rank pressure is reduced too early, racers can drift near boundaries and require late hard corrections.

## Q2) Within-band reordering without violating band reach

Yes, this is possible.

Mechanism:
- Inside band: lower control pressure or neutralize to natural speed.
- Outside band: keep correction active.

Effect:
- Same-band racers can reorder naturally (visible action).
- Boundary safety remains active through re-engagement when out of band.

Guardrail needed:
- Add hysteresis around band edges to avoid rapid on/off control chatter near thresholds.

## Q3) Release logic: event-based vs time-based

Event-based release is structurally better for this problem.

Why event-based is better:
- Time release at 0.97 assumes racers are already bunched; Owner observation says this often is not true.
- Event release uses actual race state (inside band now) rather than race clock only.
- Re-engagement on band exit directly protects fairness.

Best pattern:
- Hybrid: event-based release plus a late-race floor gate.
- Meaning: allow release only in late OUTCOME, but trigger by entering band and revoke on leaving band.

## Q4) Re-enable distance bias in OUTCOME?

Possible, but high risk if done directly with current PULK bias behavior.

Potential upside:
- Distance-aware mechanism can close dead visual gaps better than rank-only servo.

Main risks:
- Force conflict: distance pull may fight rank/band servo.
- Bunching risk: stronger gap-closing can collapse finish spacing into lottery behavior.
- Scope drift: current function is intentionally PULK-only and 3-racer scoped; broad OUTCOME reuse is no longer "simple" unless tightly constrained.

Recommendation:
- Do not use OUTCOME re-roll bias as first move.
- First move should be band-aware servo/release, which is simpler and lower interaction risk.

## Q5) B3 drop below 70% as `choreoOutcomeStart` rises

Most plausible explanation is combined time-budget and authority structure, amplified by mid-pack traffic.

Likely contributors:
- Less OUTCOME duration means less time for corrective steering to bring displaced racers back.
- B3 has weaker structural advantage than B1/B2 and sits in dense mid-pack traffic where interactions are strongest.
- Random spread and blocking noise can dominate when correction window shrinks.

What this is likely not:
- Not a single simple rank-sort bug; behavior is consistent with reduced correction horizon under bounded authority.

Confidence level:
- Moderate hypothesis, not proven in this consultation.

## Q6) Trade-offs to accept for within-band action

Reasonable trade to accept:
- Less exact-rank determinism inside a band.

Reasonable trade to reject:
- Any drop below fairness gate (band reach below 70% or Holm-unfair regressions).

Expected exchange:
- More visible late action and reordering inside bands.
- Slightly higher finish-order variance inside band.
- Potentially tighter finish clustering if control is too weak or too gap-closing-heavy.

## Recommended design direction (consultation, not build spec)

Priority order:
1. Band-bound event release for pack racers in late OUTCOME.
2. Immediate re-engage when out of band, with edge hysteresis.
3. Keep PULK distance-bias out of OUTCOME initially.

Why this order:
- Maximum reuse of shipped controller logic.
- Minimal added mechanism surface.
- Lowest force-conflict risk.
- Directly aligned with fairness contract (band, not exact rank).

## Risk flags

High risk:
- Enabling distance-biased re-roll in OUTCOME without narrowing scope and interaction rules.

Medium risk:
- Over-aggressive early release causing boundary ping-pong and late hard corrections.

Low risk:
- Late, conditional, band-bound release with re-engage guard.

## What would prove or kill this direction later

When measurement is allowed, use two must-pass gates:
- Fairness gate: band reach and Holm-unfair unchanged at required thresholds.
- Action gate: gap-space late-race metrics (not rank-only metrics), especially leader-to-chaser and top-band intra-gap evolution.

If action improves but fairness fails, reject.
If fairness holds but action does not improve, reject.

## Final consultation answer

Yes, OUTCOME action can likely be increased without breaking fairness by shifting control from exact-rank persistence to band-membership persistence, using event-based in-band release with re-engage.

Distance-biased OUTCOME re-roll is a secondary, higher-risk option and should not be the first intervention.