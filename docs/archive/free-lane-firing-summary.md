# Free-Lane Firing Summary

<!-- HISTORICAL: 2026-05-14 — free-lane firing counts measured on branch claude/free-lane-separation -->

> **Read this as HISTORY.** It records what was measured or true on 2026-05-14. Config values in it are
> that day's values, not today's; today's live in `client/src/modules/storage/defaults.js`.

Date: 2026-05-14T11:29:46.085Z
Branch: claude/free-lane-separation
Frames simulated: 1800
Track: dirt-oval (server/data/tracks/dirt-oval.json)
Racers: 20

Sim setup:

- Base speed defaults: min=0.00096, max=0.00113
- Dynamics default: reRollVariationPercent=58
- Behavior defaults: draftingBoost=1.04, draftingMaxDistance=80
- Track width (median geometric): 98px
- Sprite world size: 26.00px
- pathLengthPx: 3244.93

## Question 1

How many frames had at least one overlap?

- Overlap frames: **1799 / 1800** (99.9%)

## Question 2

Of those: in how many frames did the free-lane logic fire?

- Fired frames: **1799 / 1799** overlap frames (100.0%)
- Conclusion: Triggering is mostly active; H1 is not the main cause.

## Question 3

Branch distribution for fired logic calls

| Branch                | Count | Share |
| --------------------- | ----: | ----: |
| both_left_only        |  4057 | 32.6% |
| a_blocked_b_moves     |  2918 | 23.5% |
| both_right_only       |  2397 | 19.3% |
| both_free_geometry    |  1217 |  9.8% |
| b_blocked_a_moves     |   810 |  6.5% |
| a_geometry_b_single   |   547 |  4.4% |
| a_single_b_geometry   |   455 |  3.7% |
| opposite_single_sides |    30 |  0.2% |

## Question 4

Delta before/after clamp for fired calls

- Average |y-delta| before clamp (fired samples): **0.005439**
- Average |y-delta| net applied after clamp/repulsion (fired samples): **0.005730**
- Ratio applied/pre: **1.054**
- Conclusion: No dominant clamp suppression visible; more likely an interaction problem (H2).

## Question 5

Do overlapping racers separate over multiple frames?

Metric: for persisting, fired-marked pairs, subsequent frames are checked to see if |dY| increases.

- Tracked pair transitions: **12373**
- Separation (|dY| increases): **5278** (42.7%)
- Flat (|dY| unchanged): **282** (2.3%)
- Conclusion: Many pairs do not separate stably despite firing → H2 dominates.

## Hypothesis selection

- Main cause: **H2**
- Reasoning: Free-lane fires frequently, but separation in subsequent frames is too often absent (retreat/neutralization by other forces).

Prioritization (qualitative):

1. H2 (main driver)
2. H1/H3 (secondary depending on scene)
3. H3

## Recommendation next step (no fix in this task)

- If H1: Calibrate trigger criterion in longitudinal/lateral overlap detection against visual sprite-overlap diagnostics.
- If H2: Isolate competing forces in the same frame as A/B diagnostics (free-lane mark only, no effect) and quantify retreat component.
- If H3: Measure net damping by clamp/repulsion in a controlled sim case with fixed pairs (same inputs, variable maxLateral).

## Sim limits

- Sim reproduces race-loop physics (t-update, re-roll, position calculation, applyRacerBehavior), but without canvas/React/camera side-effects.
- Visual perception (sprite silhouette vs. physical Y hitbox) can still differ slightly in the browser.
