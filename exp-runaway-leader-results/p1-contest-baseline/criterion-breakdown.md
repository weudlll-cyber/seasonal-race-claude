# P1 Contest — which criterion blocks the race

Post-analysis of the committed `races-<arm>-<track>.csv` files in this directory — no sim run, no new data. Thresholds are `FRONT_BATTLE_DEFAULTS`. **fail%** = share of races failing that condition (conditions overlap, so they do not sum to 100). **sole** = races failing EXACTLY that one, i.e. the races a single change would flip. Facts only.

## V0 — 400 races, 21 classified REAL P1 ACTION (5.3%)

| condition | fail% | sole blocker |
|---|---|---|
| distinctLeaders < 3 | 85.0% | 0 |
| leadChangeCount < 3 | 93.5% | 27 |
| maxLeadHoldShare > 0.7 | 72.3% | 3 |
| frontContestFraction < 0.5 | 48.0% | 0 |

## R97-ON — 400 races, 20 classified REAL P1 ACTION (5.0%)

| condition | fail% | sole blocker |
|---|---|---|
| distinctLeaders < 3 | 80.0% | 0 |
| leadChangeCount < 3 | 93.3% | 38 |
| maxLeadHoldShare > 0.7 | 66.3% | 7 |
| frontContestFraction < 0.5 | 34.5% | 0 |

