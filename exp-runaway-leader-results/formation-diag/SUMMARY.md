# Runaway Formation Diagnostic — WHEN does the leader gap form?

Read-only, unmodified baseline (leash absent, shipped defaults). All 4 tracks, **N=100 per track**, seed=1 (same seeds as the f40a7a6 baseline). Consistency gate PASSED (runaway/parade rates = baseline). Facts only — the mechanism decision is the owner's.
Thresholds: 1.5L / 3.0L crossings; sustained-window end 0.90; boundary samples at 0.30 and 0.60. Same shared lap-aware length as the runaway observer.

Runaway races: **94/400** (23.5%). Non-runaway: 306.

## Headline
Of the 94 runaway races, the 3.0L lead was first crossed **BEFORE 0.60 in 6 (6.4%)**, in [0.60, 0.75) in 27 (28.7%), and at 0.75 or later in 61 (64.9%).

## firstCross30 histogram — RUNAWAY races (counts)
| scope | [0,0.30) | [0.30,0.60) | [0.60,0.75) | [0.75,0.90) | never |
|---|---|---|---|---|---|
| OVERALL | 6 | 0 | 27 | 61 | 0 |
| luger-hill | 0 | 0 | 2 | 16 | 0 |
| mountainstreet | 0 | 0 | 3 | 15 | 0 |
| searound | 2 | 0 | 12 | 16 | 0 |
| dirt-oval | 4 | 0 | 10 | 14 | 0 |

## firstCross15 histogram — RUNAWAY races (counts)
| scope | [0,0.30) | [0.30,0.60) | [0.60,0.75) | [0.75,0.90) | never |
|---|---|---|---|---|---|
| OVERALL | 49 | 0 | 29 | 16 | 0 |
| luger-hill | 1 | 0 | 9 | 8 | 0 |
| mountainstreet | 4 | 0 | 8 | 6 | 0 |
| searound | 25 | 0 | 5 | 0 | 0 |
| dirt-oval | 19 | 0 | 7 | 2 | 0 |

## firstCross30 among runaway races — quartiles (progress)
p25 = 0.718, **median = 0.783**, p75 = 0.824 (n=94).

## gapAt060 (leader→P2 at the PULK→OUTCOME handoff) — the most decision-relevant number
| set | p25 | median | p75 | n |
|---|---|---|---|---|
| RUNAWAY | 0.28 | **0.52** | 0.85 | 94 |
| non-runaway | 0.26 | 0.44 | 0.79 | 306 |

(Lengths. How big the leader→P2 gap already is at progress 0.60 — the earliest the leash could act.)

## leaderStable among runaway races
In 88/94 (93.6%) of runaway races, the racer leading when 3.0L was first crossed is the one that finishes rank 1 (the eventual winner already leads at gap formation).

Data: `formation-races.csv` (all), `formation-<track>.csv` (per track, for the determinism re-run check).
