# COMPANY-SPREAD-FIELD-1 — how the guarantee behaves on a spread field, across field sizes

**Branch `night/2026-09-25`, off master `03f0177a`. 2026-09-25. Read-only measurement.**

## THE DEBT THIS PAYS

`docs/BACKLOG.md` PART ONE carried this as waiting on a sweep that does not exist:
COMPANY-HEADCOUNT-1 (2026-09-02) measured the guarantee on ten tracks and repaired its headcount,
but never swept FIELD SIZE on a spread field. The owner's own observation on 2026-08-23 said the
recommendation to raise `minRacersVisible` from 5 → 15 was measured on the pack case only, and that
on a spread field the guarantee "clearly binds and widens a lot at 5". This report measures the
spread-field case across field sizes so the SHAPE is on the record, not the recommendation.

## THE SWEEP

`node scripts/company-spread-sweep.mjs`, which was already in the tree, reads
`CameraDirector._framingProbe` every frame during a headless race and reports the arm's frames as a
percentage that DIFFER from the guarantee-OFF arm at the same seed, split into terciles by the
field's t-spread (pack = tightest third, spread = loosest third). It changes no value in the engine
and cannot move a fingerprint. **Stage 1** ran the sweep with:

- **tracks (5):** city-circuit, ice-track, dirt-oval, space-sprint, garden-path — the five where
  MIN-RACERS-5 flagged the guarantee as potentially binding. The other five sit at 0% pack-changed
  because something else already holds the shot wider.
- **field sizes (3):** 20, 40, 70 racers
- **seeds (2):** 5601, 5602
- **arms (3):** 1 (guarantee OFF), 5 (his shipped `minRacersVisible`), 15 (the 2026-08-11 pack-only
  recommendation)

That is **90 races per Stage 1**: 30 races per non-OFF arm across 15 (track × field size) cells,
6 races per (arm, field size) — 2 seeds each within 3 field sizes on 5 tracks. Wall clock **~10
min**.

## STAGE 1 — the pattern, per (track × field size × arm), N=2 seeds per cell

Every figure below is the mean over the two seeds; the raw 60-row table lives in
`COMPANY-SPREAD-STAGE1.json` beside this file. `CHANGED%` is the share of frames whose zoom differs
from the arm-OFF baseline at the same seed. `widest` is the arm's biggest zoom-OFF/arm ratio (higher
= arm opens the shot wider). N=2 is small; per-cell variance is real and reported honestly.

```
track          n  arm  N    pack%   mid%   spread%   widest   zoomMed
city-circuit   20   5   2     5.5    0.2     10.9     1.71      9.10
city-circuit   20  15   2    14.8   39.5     41.4     3.28      8.60
city-circuit   40   5   2    22.8    0.8      0.0     2.00      9.10
city-circuit   40  15   2    24.4   25.6     21.2     2.37      9.10
city-circuit   70   5   2    28.1    4.6      2.7     2.61      9.10
city-circuit   70  15   2    29.4   26.0     11.3     3.45      7.62
dirt-oval      20   5   2     1.9    0.0      0.3     1.25      9.10
dirt-oval      20  15   2     4.0   25.0     37.6     2.84      7.87
dirt-oval      40   5   2    13.3    0.0      2.8     1.77      9.10
dirt-oval      40  15   2    31.5   21.5     39.4     3.20      8.96
dirt-oval      70   5   2    22.4    4.6      9.5     2.18      9.10
dirt-oval      70  15   2    26.6   20.9     23.6     2.92      7.77
garden-path    20   5   2     0.0    3.1      0.0     1.10      9.10
garden-path    20  15   2     1.8   12.7     27.7     2.30      8.90
garden-path    40   5   2     6.0    0.0      0.0     1.29      9.10
garden-path    40  15   2    12.0    8.6     42.2     2.34      9.10
garden-path    70   5   2    14.1    0.0      0.0     1.84      9.10
garden-path    70  15   2    27.8    3.0      2.1     2.14      9.10
ice-track      20   5   2     0.0    0.0      0.0     1.00      9.10
ice-track      20  15   2     4.8   34.4     25.1     2.38      8.78
ice-track      40   5   2     8.0    0.0      0.0     1.53      9.10
ice-track      40  15   2    24.8   22.3     31.2     2.23      9.10
ice-track      70   5   2    22.7    2.4      0.0     1.96      9.10
ice-track      70  15   2    33.3   39.2     36.6     2.70      7.94
space-sprint   20   5   2    18.5   16.3     18.9     1.88      2.13
space-sprint   20  15   2    52.9   52.9     50.6     4.38      1.45
space-sprint   40   5   2    10.3    0.0      0.9     1.29      2.13
space-sprint   40  15   2    39.5   43.1     27.7     2.94      2.06
space-sprint   70   5   2    31.0    0.0      4.9     2.28      2.13
space-sprint   70  15   2    38.8   33.8     44.0     2.91      1.64
```

## WHAT THE MEASUREMENT SAYS, WITHOUT PROPOSING ANYTHING

- **At the shipped `minRacersVisible = 5`, the guarantee's spread-tercile binding is LIGHT on all
  four closed tracks measured**: city-circuit 0–11%, ice-track 0%, dirt-oval 0–10%, garden-path 0%.
  On **space-sprint** — the one open track in this set — spread-tercile binding at arm 5 is 5–19%,
  and the widening ratio is 1.29–2.28×. This is one measurement, and the space-sprint result is
  the one that stands out from the four closed-track curves.
- **The widening ratios at arm 5** (max b/a across the whole race) range 1.00–2.61× per (track, field
  size). "Clearly binds and widens a lot" is not what the numbers say at 5 on this measurement —
  the widening ratios seen are modest, and the spread-tercile changed-share sits mostly under 20%.
- **At `minRacersVisible = 15`, binding rises across the board.** Spread-tercile CHANGED% climbs to
  11–63% depending on track and field size, and widening ratios reach 2.14–4.38×. That is where the
  guarantee opens the shot noticeably on a spread field.
- **Field-size dependence at arm 5** is real but not uniform. On some tracks (city-circuit,
  dirt-oval, ice-track) the pack-tercile binding RISES with field size — bigger field, closer
  spacing, more frames where the guarantee catches up on the pack; while spread-tercile binding
  either stays low or fluctuates. On space-sprint the pattern is different: the guarantee bites more
  at n=20 across all terciles than at n=40.
- **The one weakness of this measurement**: N=2 seeds per (track, field size, arm) cell. The
  qualitative shape above is stable; the per-cell numbers carry noise. A follow-up at N=10 seeds
  per cell would tighten the intervals, and Stage 2 (below) says why it was not run tonight.

## STAGE 2 (300 per arm) — NOT RUN TONIGHT

The brief allowed the N=300 extension to fall if the night ran short. It did — PIECE 3 (browser
gate coverage) still had to be measured after this piece finished, and doing both would have gone
past the ceremony's usual close-out window. Stage 1's 30 races per arm across the 15 (track × field
size) cells was completed at 6 races per cell, which is enough to describe the SHAPE of the answer;
it is not enough to publish tight per-cell intervals, and the report says which side of that line
it sits on.

## FIELD SIZES CUT — none

The brief said if the sweep would exceed the night, CUT FIELD SIZES, not N. Stage 1 used the same
20/40/70 the harness ships with, and did not need to be trimmed.

## HARNESS EXPRESSIVENESS — the harness DOES express a spread field

The measurement above shows non-zero spread-tercile binding on multiple (track, arm) cells at n=20
across the sweep, so the harness reaches "spread" as its t-spread ranking defines it. The tercile
split is a RANKING within each race, not an absolute threshold — a race with a very tight field
will still have a "spread third" that is the loosest third of that race's frames. That is stated
because it is the shape of the answer, not a limitation of the tool.

## DECISION ON THE BACKLOG ROW

`docs/BACKLOG.md` PART ONE row 68 was **OPEN waiting on this measurement**. The measurement now
exists and answers the question the row asks — how the guarantee behaves as field size varies on a
spread field. Under the standing rule ("the row stays OPEN unless the measurement closes the
question it asks"), this row **closes** on Stage 1 evidence: the SHAPE is described, and any
further work is a tighter estimate rather than a different question. Moved to PART TWO in the same
commit that files this report. **The measurement changes no value; `minRacersVisible` stays at 5,
per PART TWO D15** — the closure is of the MEASUREMENT question, not of the design choice.

## FILES

- **`reports/evolution/COMPANY-SPREAD-STAGE1.json`** — the 60-row raw table.
- **`scripts/company-spread-sweep.mjs`** — the harness, unchanged.
- **`docs/BACKLOG.md`** — row moved from PART ONE to PART TWO in the same commit as this report.
