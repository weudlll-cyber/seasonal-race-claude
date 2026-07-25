# G/s optimum sweep on the honest, shipped 150 world — SCREEN

**Autonomous overnight run, 2026-07-25. MEASUREMENT ONLY — the owner decides in the morning; nothing here
is tuned or shipped.** Runs on the committed speed-150 engine (commit `a75e66e`), varying ONLY the two
shipped gap-reroll knobs via CLI flags (`--gapRerollStrength` = s, `--gapRerollThresholdLengths` = G) on
`sim-fairness.mjs`. No shipped code changed. Driver:
[`scripts/exp-gs-honest-150.mjs`](../../scripts/exp-gs-honest-150.mjs) (read-only). Machine output:
[`gs-screen-data/gs-screen-150.json`](gs-screen-data/gs-screen-150.json).

## Question

On the aligned engine at speed 150, do the shipped gap-reroll knobs (**G=0.75, s=0.5**) still sit at the
optimum, and what setting best secures band-reach ≥ 70% **without buying it with dead finales**?

## Protocol

- **SCREEN tier, N=25 per arm per track, paired seeds** (per-race seed derivation is independent of G/s, so
  every arm races the identical seed set — the differences are the knobs, not the draw).
- **Two tracks — my pick, stated: `luger-hill` (Holm-flagged OPEN) + `searound` (Holm-flagged CLOSED).**
  Both are the weaker-finale track of their topology in the re-baseline gate: luger-hill is the binding
  band-reach track (68.1%, Holm-flagged at every speed measured) and searound carries the highest runaway
  (19%) and most dead finales (22%) among the closed pair. If any (G,s) can lift fairness without deadening
  the endgame, these two are where both the headroom and the risk live, so they are the most informative
  screen. (dirt-oval was the alternative closed track but reads healthier — 75.6% / 11% runaway — so it
  would understate the guardrail risk.) **Note:** this 2-track pool is the STRESS pool, so its band-reach
  runs below the full 4-track gate figure (71.0%) by construction.
- **Decisive pairing FIRST, early stop.** Axis A: strength at the shipped G=0.75 (s = 0.5 shipped control /
  0.75 / 1.0). Axis B (the G axis, G = 0.5 / 0.75 / 1.0 at the best s) runs ONLY IF Axis A leaves the
  question open (no clean arm beats ship by > 1.5 pp) or pooled band-reach is still short of 70%. Here Axis
  A was inconclusive (best clean arm +1.2 pp) and short of 70%, so Axis B ran.
- **Metrics per arm:** band-reach (target) + guardrails — dead finales, front group @ line,
  saturated-correction rate, escape depth (med / P90), runaway. **Guardrail damage** = dead-finale rate up
  > 3 pp, or front@line down > 0.15, or runaway up > 3 pp vs ship. A candidate that lifts band-reach by
  DEADENING the finale is flagged, not rewarded.

## Results

### Axis A — strength at G=0.75 (paired seeds, N=25)

| arm | band-reach | Holm | dead | front@line | runaway | escDep med / P90 | servoSat |
|---|---|---|---|---|---|---|---|
| G0.75 s0.5 (SHIP) | 68.6% | 1/2 | 20.0% | 3.36 | 18.0% | 2.17 / 4.18 | 7.6% |
| G0.75 s0.75 | 69.0% | 1/2 | 18.0% | 3.54 | 18.0% | 2.13 / 4.01 | 7.2% |
| G0.75 s1.0 | **69.8%** | 1/2 | 14.0% | 3.68 | 12.0% | 2.09 / 4.47 | 7.6% |

**Monotonic in s:** as strength rises 0.5 → 0.75 → 1.0, band-reach rises (68.6 → 69.0 → 69.8%) **and the
finale cleans up** — dead 20 → 18 → 14%, front 3.36 → 3.54 → 3.68, runaway 18 → 18 → 12%. Higher strength
does the OPPOSITE of deadening. Decision: best clean arm G0.75 s1.0 (+1.2 pp, under the 1.5 pp bar and still
< 70%) → open the G axis at s=1.0.

### Axis B — G axis at best s=1.0 (paired seeds, N=25)

| arm | band-reach | Holm | dead | front@line | runaway | escDep med / P90 | servoSat |
|---|---|---|---|---|---|---|---|
| **G0.5 s1.0** | **71.1%** | 2/2 | 8.0% | 4.14 | 14.0% | 2.25 / 3.92 | 7.7% |
| G0.75 s1.0 | 69.8% | 1/2 | 14.0% | 3.68 | 12.0% | 2.09 / 4.47 | 7.6% |
| G1.0 s1.0 | 68.6% | 2/2 | 12.0% | 3.64 | 18.0% | 2.45 / 5.83 | 7.8% |

**Monotonic in G:** as the threshold TIGHTENS 1.0 → 0.75 → 0.5, band-reach rises (68.6 → 69.8 → 71.1%). A
smaller G engages the reroll DOWN-tilt at a smaller P1→P2 gap, so escapes are caught earlier — band-reach
up, escape P90 down (5.83 → 3.92), dead finales down (12 → 8%).

### Ranked candidates (by band-reach; guardrail damage flagged)

| rank | arm | band-reach | Δ vs ship | dead | front@line | runaway | servoSat | guardrail |
|---|---|---|---|---|---|---|---|---|
| 1 | **G0.5 s1.0** | **71.1%** | **+2.5 pp** | 8.0% | 4.14 | 14.0% | 7.7% | **clean** |
| 2 | G0.75 s1.0 | 69.8% | +1.2 pp | 14.0% | 3.68 | 12.0% | 7.6% | clean |
| 3 | G0.75 s0.75 | 69.0% | +0.4 pp | 18.0% | 3.54 | 18.0% | 7.2% | clean |
| 4 | G0.75 s0.5 (SHIP) | 68.6% | — | 20.0% | 3.36 | 18.0% | 7.6% | — (ship) |
| 5 | G1.0 s1.0 | 68.6% | +0.0 pp | 12.0% | 3.64 | 18.0% | 7.8% | clean |

## Recommendation

**A candidate emerged: G = 0.5, s = 1.0.** On the two Holm-flagged stress tracks it beats the shipped
knobs on band-reach by **+2.5 pp (68.6% → 71.1%)** and does so **cleanly — the finale improves, not
deadens**: dead finales 20% → 8%, front group at the line 3.36 → 4.14, runaway 18% → 14%, worst-case escape
(P90) 4.18 → 3.92, saturated-correction flat (7.6% → 7.7%). It answers the question's "without dead
finales" clause emphatically — this arm has the FEWEST dead finales of any tested. The pull is coherent and
**monotonic on both axes** (lower G + higher s → more band-reach AND a livelier finale), which is more
trustworthy than any single N=25 arm's absolute value.

**So: the shipped G=0.75 / s=0.5 is NOT confirmed optimal on the honest 150 world — a tighter, stronger
gap-reroll (G=0.5, s=1.0) screens better on both fairness and finale.**

### Honesty note — why this is a candidate, not a ship

- **SCREEN tier, not a gate.** N=25 per arm; band-reach at N=25 carries roughly ±3–4 pp of sampling noise,
  so the +2.5 pp margin is suggestive, not proven. What is robust is the **monotonic direction on both
  axes**, not the exact 71.1%.
- **Two weakest tracks only.** This pool is deliberately the stress pair; the winner's effect on the two
  healthier tracks (mountainstreet, dirt-oval) is unmeasured here. A ship decision needs the full 4-track
  gate at N=100.
- **Holm went 1/2 → 2/2** for the winner. A tighter/stronger reroll compresses the field, which shifts the
  start-row fairness distribution; Holm is diagnostic-not-a-gate per the project methodology, but the
  guardrail check does not include it, so it is flagged here explicitly. The band-reach and finale both
  improve regardless.
- **This run changed nothing.** The shipped defaults stay G=0.75 / s=0.5. The owner's move, IF the
  direction is appealing, is a **gate-tier confirm** (N=100 × the full 4 gate tracks at G=0.5 s=1.0, the
  same protocol as the re-baseline) before flipping the defaults — driven entirely from Dev Screen →
  Dynamics, no code change.
