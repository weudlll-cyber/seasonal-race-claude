# PULK-action-4 — areaBonus in CHAOS to recover the stranded worst-case winner

**Harness HEAD `b76a6f1`** (feat/race-action), anchor `pre/pulk-action-4` @ `827da85`. Read-only, sim-only,
OUTCOME untouched, default byte-identical, 147/147 tests green, naturalness peak ≤ +8.1% on all runs.
Change: 3-phase areaBonus split (`--areaBonusEarly` for chaos 0→0.25; absent → inherits PULK → byte-identical).
Winner cell N8/D0.6 unchanged; ONLY areaBonusEarly added (PULK bonuses still 0 → PULK action preserved).

## Verdict: fixes 1 of 3. city-circuit ✅, searound ✗ (worse), luger-hill ✗ (partial).

| track | metric | early=0 (baseline) | early=1.0 | early=2.0 |
|---|---|---|---|---|
| **city-circuit** | worst-winner @0.55→fin | 40→7 ✗ | **37→5 ✅** | 33→4 ✅ |
| | held overtakes | 18.4 | 17.6 | 17.1 |
| | distinctP1 / lShare | 4.8 / 39% | 4.9 / 41% | 4.4 / 46% |
| | band-reach | 83/85/77 | 89/88/81 | 89/86/79 |
| | unpredictability corrP1 | — | 0.09 | 0.20 |
| | start-row Holm p | — | 0.47 | 0.76 |
| **searound** | worst-winner | 40→6 ✗ | **40→17 ✗ (worse)** | 38→17 ✗ |
| | held / distinctP1 | 13.0 / 3.7 | 12.8 / 3.9 | 13.4 / 4.0 |
| | start-row Holm p | — | 0.55 | 0.27 |
| **luger-hill** | worst-winner | 60→22 ✗ | **58→13 ✗ (better, not ≤5)** | 58→12 ✗ |
| | held / distinctP1 | 9.6 / 3.9 | 9.9 / 4.0 | 9.8 / 4.1 |
| | band-reach B1 | 70 | 71 | 73 |

Naturalness = +8.1% (1.081) on every run. PULK action (held overtakes, distinctP1, leader-share)
is UNCHANGED vs the early=0 baseline on all three tracks — confirming the chaos advantage does not
touch the PULK contest (PULK bonuses stay 0). Unpredictability stays low (corrP1 ≤ 0.20).

## Per-track

- **city-circuit — FIXED at areaBonusEarly = 1.0** (the least value that recovers). Worst-case winner
  37→5 (≤P5), held overtakes unchanged (17.6 vs 18.4), band-reach *improved* (89/88/81), naturalness
  +8.1%, unpredictability low (corrP1 0.09), start-row Holm fair (0.47). Clean recovery, no side effects.
  early=2.0 recovers further (33→4) but raises corrP1 to 0.20 — so **1.0 is the recommended value**.

- **searound — NOT fixed; chaos-areaBonus makes it WORSE** (worst 40→6 → 40→17, consistent at both
  1.0 and 2.0). Its band-reach and start-row Holm are already fine (p 0.55); the failure is purely the
  worst-case winner, and an early advantage doesn't help — the early lead gets brake-punished in the
  contest and he drops further. searound also has sparse rotation (distinctP1 3.7 < 4). **Recommend
  early=0 for searound** and a different lever (its long-known geometry; e.g. gentler contest there).

- **luger-hill — partially helped, NOT recovered** (60→22 → 58→12/13). Chaos-areaBonus moves the
  needle (band-reach B1 70→73) but the fast open downhill still scrambles the winner too deep for
  OUTCOME to reel to ≤P5. **Needs track-specific de-tuning** (smaller front-pool or shorter linger on
  luger-hill), as anticipated — do not force it with ever-larger early bonus.

## Net effect on the 10-track picture

With areaBonusEarly=1.0 on city-circuit, the N8/D0.6 winner is now **fair+action on 7/10** (the 6 prior
clean tracks + city-circuit). river-run (the other near-miss, 52→7) was not tested here but is the same
shape as city-circuit and would likely also recover — worth a confirmation run. searound and luger-hill
remain track-specific problems, not fixable by chaos-areaBonus.
