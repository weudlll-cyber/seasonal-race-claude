# Runaway-Winner & Parade-Finish — Baseline Measurement

Read-only sweep on current master (b2AttackHeroes ON, shipped defaults, no overrides).
**N=100 deterministic seeded races per track** (seed=1, dur=60s), all 4 tracks, each pinned to its seeded default racer.

## Metric thresholds (parameters, spec defaults)

| param | value | role |
|---|---|---|
| windowStart | 0.9 | progress at which the runaway lead is measured; opens the [.,1.0] challenge window |
| leadLen | 3 lengths | RUNAWAY (a): rank-1 must lead rank-2 by >= this at windowStart |
| challengeLen | 1 length | RUNAWAY (c): leader→P2 gap must never drop below this in [windowStart, 1.0] |
| sideBySideLen | 0.5 length | PARADE (a): max consecutive gap inside the leading group |
| farLen | 3 lengths | PARADE (b): min gap from the group's last member to the next racer |
| speedWindow | 0.05 | final race fraction over which the group's internal speed spread is reported |

## Rates per track + overall

| track | type | N | runawayWinnerRate | paradeFinishRate | gap@0.90 mean / p50 / p90 / max | ≥leadLen@0.90 | parade grp mean (2/3/4/5+) | grp speed-spread mean / max |
|---|---|---|---|---|---|---|---|---|
| luger-hill | open | 100 | 18.0% (18) | 1.0% (1) | 1.6499 / 1.207 / 3.9112 / 5.9952 | 18 | 2 (1/0/0/0) | 0.0255 / 0.0255 |
| mountainstreet | open | 100 | 18.0% (18) | 3.0% (3) | 1.9391 / 1.4437 / 4.2523 / 9.8387 | 20 | 2.3333 (2/1/0/0) | 0.0262 / 0.0537 |
| searound | closed | 100 | 30.0% (30) | 1.0% (1) | 2.6307 / 1.3467 / 6.9279 / 10.5846 | 31 | 2 (1/0/0/0) | 0.0405 / 0.0405 |
| dirt-oval | closed | 100 | 28.0% (28) | 3.0% (3) | 2.6117 / 1.4994 / 6.2603 / 14.3109 | 30 | 2.3333 (2/1/0/0) | 0.0598 / 0.1009 |
| OVERALL | all | 400 | 23.5% (94) | 2.0% (8) | 2.2079 / 1.3691 / 5.1211 / 14.3109 | 99 | 2.25 (6/2/0/0) | 0.0405 / 0.1009 |

## Reading the numbers

- **runawayWinnerRate** — share of races where the leader is already >= leadLen clear at progress 0.9, goes on to win, and is never challenged (leader→P2 stays >= challengeLen) through the finish.
- **paradeFinishRate** — share of races that end with a side-by-side leading group (>= 2, internal gaps <= sideBySideLen) detached >= farLen from the rest of the field.
- **gap@0.90** distribution — the raw leader→P2 lead at windowStart across ALL races (context for how often the runaway clause (a) is even in reach). `≥leadLen@0.90` counts races meeting clause (a) alone.
- **grp speed-spread** — the parade groups' internal max relative speed delta over the final 5% of the race; near 0 confirms the "same speed" (paced) signature.

Data: `runaway-parade-summary.csv` (this table), `runaway-parade-races.csv` (per-race, all tracks), `races-<track>.csv` (per-track, for the determinism re-run check).
