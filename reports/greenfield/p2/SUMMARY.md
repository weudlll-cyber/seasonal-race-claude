# GREENFIELD P2 — A8 arm: drop the carousel or tune it?

3 arms, same baseline seeds, **N=100 × 4 tracks**, all at contestWindowStart 0.62 (the A6 window). Paired and self-consistent. A5/A6 historical flag configs were not committed, so they are defined here per the spec and measured fresh alongside A8. **roleBias tilts only carousel participants, so with the carousel OFF the A8 roleBias flag is inert — A8 is effectively gap-reroll tightened to G=0.75.**

| arm | config | p1@62 | p1@80 | runaway | parade | leadChange | distinct |
|---|---|---|---|---|---|---|---|
| A6-control | GR G=1.5, carousel OFF | 37.3% | 37.3% | 7.5% | 2.0% | 2.73 | 3.35 |
| A5-carousel | GR G=1.5 + carousel ON (roleBias 1.0) | 30.5% | 30.5% | 10.3% | 2.0% | 2.55 | 3.17 |
| A8-gr075 | GR G=0.75, carousel OFF | 54.0% | 54.0% | 6.5% | 0.8% | 3.22 | 3.63 |

## Verdict

- A8 vs A5 on p1@62: 54.0% vs 30.5% (A8 matches/beats A5)
- A8 vs A5 leadChange: 3.22 vs 2.55
- A8 vs A6 control on p1@62: 54.0% vs 37.3%
- A5 (carousel) action cost vs A6: leadChange 2.55 vs 2.73, runaway 10.3% vs 7.5%

**DROP the carousel** — A8 matches/beats A5 on p1Contest without the carousel; the carousel is not earning its complexity.

Data: `p2-arms.csv`, `p2-arm-track.csv`.
