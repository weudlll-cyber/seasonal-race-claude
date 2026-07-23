# FINALE-CONTEST post-analysis — does G=0.75 fix the finale, or only the 0.62 number?

**Read-only re-analysis of races that were already run. No simulations, no sim-file changes, no behaviour changes.** 1200 stored races (3 arms × 4 tracks × 100 paired seeds) re-read from the P2 raw stores.

## Window caveat — read this before quoting any number

The P2 arms were run at `--contestWindowStart=0.62`, so **both** their front-battle trackers sit at 0.62 and **no `[0.80, 1.0]` lead-change tracker exists in the stored data**. Recovering it would require re-running, which this analysis does not do. Instead the finale lead-change signal is **`[0.90, 1.0]`** (the stored `lateContest`). That is a *stricter* finale than `[0.80, 1.0]`: a race dead from 0.80 is necessarily dead in `[0.90, 1.0]`, so the dead-finale numbers below are **conservative evidence** for the owner's observation, not an artefact of the substitution.

The duo-escape and front-group-at-line measures need only the finish snapshot and are computed **exactly as specified**.

## Derived thresholds (from the pooled data distribution, not invented)

Pooled over all 1200 stored races (all three arms, all four tracks), the finish-snapshot gaps distribute as:

| gap | p10 | Q1 (25) | median | Q3 (75) | p90 |
|---|---|---|---|---|---|
| P1→P2 | 0.2832 | **0.6738** | 1.2455 | 2.2247 | 3.8015 |
| P2→P3 | 0.1608 | 0.3782 | 0.9067 | **1.6252** | 2.8007 |

- **tight front pair := gap(P1→P2) ≤ 0.6738 L** (the pooled Q1 — the pair is closer than in 3 races out of 4)
- **P3 far behind := gap(P2→P3) ≥ 1.6252 L** (the pooled Q3 — P3 is further back than in 3 races out of 4)
- **duoEscape := both hold at the finish line.** Under a null of independence this would fire on ~6.3% of races (0.25 × 0.25), which is the reference point for the rates below.
- frontGroupAtLine uses the task's stated 3.0 L radius (also the project's shared gap threshold), counting the leader.

## The three arms side by side

| arm | config | finale leadChg [0.90,1] | deadFinaleRate | duoEscapeRate | deadDuoFinale | frontGroup@line (mean) | =1 | =2 | ≥3 | med gap P1→P2 | med gap P2→P3 | within3@0.90 | p1Contest@0.62 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A8-G075 | gap-reroll G=0.75, carousel OFF | 1.65 | 15.8% | 3.5% | 0.8% | 4.67 | 10.8% | 18.5% | 70.8% | 1.1079 | 0.8052 | 3.67 | 54.0% |
| A0-GR-G150 | gap-reroll G=1.5 (shipped), carousel OFF | 1.52 | 20.8% | 5.8% | 0.8% | 3.98 | 15.0% | 23.5% | 61.5% | 1.2012 | 0.8682 | 3.17 | 37.3% |
| A5-carousel | gap-reroll G=1.5 + carousel ON (roleBias 1.0) | 1.59 | 18.0% | 3.8% | 1.0% | 3.00 | 20.0% | 30.0% | 50.0% | 1.4794 | 1.0954 | 2.17 | 30.5% |

### Paired deltas vs A0-GR (G=1.5), matched on (track, seed)

| metric | A8 − A0-GR | A5-carousel − A0-GR |
|---|---|---|
| finaleLeadChanges | +0.128 | +0.068 |
| deadFinale | -0.050 | -0.028 |
| duoEscape | -0.022 | -0.020 |
| deadDuoFinale | +0.000 | +0.003 |
| frontGroupAtLine | +0.688 | -0.980 |
| within3At090 | +0.495 | -1.010 |
| p1Contest62 | +0.168 | -0.068 |

### A1 / V0 baseline — TRUE [0.80, first finish] window (context only)

From the committed p1-contest baseline (400 races, same 4 tracks + seed set). It carries the real 0.80-window primitives but **no finish-line gaps**, so it cannot contribute duoEscape or frontGroupAtLine, and its lead-change count is **not** comparable to the arms' [0.90,1.0] figure.

- leadChanges over [0.80, finish]: mean **0.78**; **52.3% of races have ZERO** lead changes in that window
- distinctLeaders over [0.80, finish]: mean 1.67; classified p1Contest 5.3%

The useful cross-read: even in the **wider** 0.80 window, the untuned baseline leaves a large majority of finales with no lead change at all. The finale has always been the dead part of the race.

## Where does the eye-tested race sit?

**Seed 975 is NOT in the stored data** — the P2 sweep ran seeds 1..100 on searound, so that specific race cannot be located without re-running it (forbidden here). What the stored A8 × searound distribution says instead (n=100):

- **deadFinaleRate = 10.0%** (zero lead changes in [0.90,1]);
- **duoEscapeRate = 2.0%**; 25.0% of races end with exactly TWO racers within 3 L of the leader;
- **deadDuoFinaleRate = 0.0%** — the exact signature the owner described (two-racer breakaway AND no lead change to the line);
- median gap P1→P2 = 1.2106 L, median gap P2→P3 = 0.883 L.

**Verdict on the eye-test: an OUTLIER — an unlucky draw, not what A8 usually produces here.** The described signature occurs in 0.0% of stored A8 × searound races. One eye-tested race cannot distinguish a 0.0% tail from a systematic fault; that is exactly what this distribution is for.

Two caveats on the identification, both of which cut the same way: (a) the sweep's per-race plan seed is derived as `(globalSeed−1)·N + raceIdx + 1`, so a **browser** seed number does not index into the sim store — the two seed spaces are not known to be interchangeable; (b) the stored range is 1..100. So this race cannot be located in the data *even in principle* here. **If the owner wants that exact race adjudicated rather than characterised, the one clean way is a targeted single-seed re-run** — deliberately not done under this spec's "no new simulations" rule.

## The honest headline

A8 (G=0.75) raises the **0.62-window** headline by **16.8 pp** (37.3% → 54.0%). In the **finale** it moves:

- finale lead changes [0.90,1]: 1.52 → 1.65 (**+0.13**)
- deadFinaleRate: 20.8% → 15.8% (**-5.0 pp**)
- duoEscapeRate: 5.8% → 3.5% (**-2.3 pp**)
- racers within 3 L of the leader at the line: 3.98 → 4.67
- deadDuoFinale (the eye-tested signature): 0.8% → 0.8%

**The hypothesis is REFUTED. G=0.75 improves the FINALE too, not just the 0.62-window number.**

Every finale measure moves the right way and they move *together*: more late lead changes, fewer dead finales, **fewer** duo escapes, and a materially bigger front group at the line (+0.69 racers within 3 L). If G=0.75 were merely buying a 62–80% window number while killing the finale, deadFinaleRate and duoEscapeRate would have risen — they fell. The mechanism does **not** favour duo escapes; the shipped G=1.5 produces *more* of them than G=0.75 does.

The one thing the eye-test correctly identified is that **duo finishes exist at all**: A8 still ends 18.5% of races with exactly two racers within 3 L, and 15.8% of finales have no lead change in [0.90,1]. That is a real remaining weakness — it is simply not one that G=0.75 *created*, and it is smaller than the shipped default's.

## Best finales per arm (≥ 2 late lead changes AND ≥ 3 racers within 3 L at the line)

**A8-G075** — 154 of 400 races qualify (38.5%).
  - `searound` seed **24** — 7 late lead changes, 12 within 3 L at the line (P1→P2 0.4762 L)
  - `mountainstreet` seed **56** — 6 late lead changes, 6 within 3 L at the line (P1→P2 0.727 L)
  - `dirt-oval` seed **9** — 5 late lead changes, 22 within 3 L at the line (P1→P2 0.1693 L)
  - `luger-hill` seed **74** — 5 late lead changes, 13 within 3 L at the line (P1→P2 0.1683 L)
  - `mountainstreet` seed **79** — 5 late lead changes, 9 within 3 L at the line (P1→P2 0.5694 L)

**A0-GR-G150** — 122 of 400 races qualify (30.5%).
  - `luger-hill` seed **59** — 5 late lead changes, 22 within 3 L at the line (P1→P2 0.0986 L)
  - `dirt-oval` seed **87** — 5 late lead changes, 13 within 3 L at the line (P1→P2 0.0984 L)
  - `mountainstreet` seed **70** — 5 late lead changes, 7 within 3 L at the line (P1→P2 0.985 L)
  - `luger-hill` seed **47** — 5 late lead changes, 4 within 3 L at the line (P1→P2 1.2121 L)
  - `luger-hill` seed **70** — 4 late lead changes, 30 within 3 L at the line (P1→P2 0.2818 L)

**A5-carousel** — 113 of 400 races qualify (28.2%).
  - `dirt-oval` seed **9** — 5 late lead changes, 20 within 3 L at the line (P1→P2 0.8118 L)
  - `dirt-oval` seed **99** — 5 late lead changes, 5 within 3 L at the line (P1→P2 0.2857 L)
  - `mountainstreet` seed **98** — 4 late lead changes, 12 within 3 L at the line (P1→P2 1.0081 L)
  - `dirt-oval` seed **45** — 4 late lead changes, 10 within 3 L at the line (P1→P2 0.0525 L)
  - `dirt-oval` seed **90** — 4 late lead changes, 7 within 3 L at the line (P1→P2 0.388 L)

Data: `finale-per-seed.csv` (every stored race), `finale-arms.csv` (pooled), `finale-arm-track.csv` (per arm × track).
