# COMEBACK-RUNAWAY-1 — does the comeback racer run away? Measured, nothing changed

**2026-10-03, branch `measure/comeback-runaway`, on master `49027427`. Measurement only; no
product change.**

**The owner's observation, 2026-10-02** (BACKLOG row *THE OWNER'S OBSERVATION OF 2026-10-02*): in his
Quick Test on River Run, seed 3, the comeback racer went on far into the lead after the comeback
shot cut away.

## What was measured

**The races.** The 750 of [COMEBACK-DURATION-1-seeds.csv](COMEBACK-DURATION-1-seeds.csv): Quick-Test
seeds with the Quick Test's default names. The closed tracks have 20 and 40 racers; the open tracks
20, 40 and 80 (the `long` name set for 80).

**The instrument.** `scripts/diag/comeback-hold-measure.mjs --runaway-out=<file>`, new in this piece
and read-only. It writes one row per **cast comebacker**, and one per **drawn winner** (the racer
whose drawn place, `getTargetRank`, is 1).

- **Finishing place** — the order of `finishTimeMs`.
- **Margin at the finish, in seconds** — to the next racer in finish order. When he won, this is his
  lead over the runner-up. When he did not, it is his gap to the racer home just before him.
- **Margin at the finish, in canvas widths** — the same pair at the frame he crossed, projected by
  the **shipped camera director** (`dir._proj.toScreen` at that frame's zoom and offsets, the
  projection the drawing uses). The figure is the straight-line distance on screen divided by the
  1280-pixel canvas width: how far apart the two look in the picture the viewer is shown.
- **Largest lead after first holding 3rd** — on every frame he led the race after first being 3rd
  or better, his distance to the 2nd racer, in canvas widths (projected as above) and as a
  percentage of the race distance.

The camera here is the headless director the driver runs (the camera fingerprint's, driven once per
physics frame). The browser can place a shot a frame or two differently.

**A note on canvas widths.** The camera zooms in on the front of the race, so a lead that is a small
fraction of the race can still fill a third of the picture. Both columns are given for that reason.

## Results — cast comebackers

| field | N | won | place median (p90) | finished at or above his drawn place | lead at the finish when he won, s: median / p90 / max | same, canvas widths | gap to the racer ahead when he did not win, s: median / p90 / max | led at some point after first holding 3rd | largest such lead, canvas widths: median / p90 / max | same, % of the race: median / p90 / max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| closed, 20 | 106 | 18 | 4 (6) | 67 of 106 | 0.11 / 0.67 / 0.69 | 0.17 / 0.55 / 0.64 | 0.10 / 0.34 / 1.76 | 71 of 106 | 0.15 / 0.29 / 0.64 | 0.056 / 0.591 / 1.316 |
| closed, 40 | 112 | 17 | 3 (8) | 78 of 112 | 0.19 / 0.38 / 0.40 | 0.22 / 0.36 / 0.37 | 0.11 / 0.30 / 0.99 | 41 of 112 | 0.15 / 0.31 / 0.38 | 0.152 / 0.551 / 1.017 |
| open, 20 | 106 | 16 | 3 (6) | 73 of 106 | 0.14 / 0.38 / 0.59 | 0.17 / 0.33 / 0.43 | 0.09 / 0.37 / 1.25 | 78 of 106 | 0.22 / 0.38 / 0.48 | 0.042 / 0.446 / 1.563 |
| open, 40 | 103 | 26 | 3 (6) | 73 of 103 | 0.13 / 0.29 / 0.53 | 0.16 / 0.27 / 0.33 | 0.10 / 0.32 / 0.86 | 56 of 103 | 0.16 / 0.26 / 0.34 | 0.097 / 0.408 / 0.869 |
| open, 80 | 61 | 18 | 3 (7) | 43 of 61 | 0.18 / 0.34 / 0.43 | 0.20 / 0.28 / 0.29 | 0.10 / 0.27 / 0.54 | 24 of 61 | 0.17 / 0.24 / 0.29 | 0.302 / 0.785 / 0.975 |

## The same numbers for the drawn winners of the same races

| field | N | won | place median (p90) | finished at or above his drawn place | lead at the finish when he won, s: median / p90 / max | same, canvas widths | gap to the racer ahead when he did not win, s: median / p90 / max | led at some point after first holding 3rd | largest such lead, canvas widths: median / p90 / max | same, % of the race: median / p90 / max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| closed, 20 | 150 | 47 | 2 (6) | 47 of 150 | 0.18 / 0.42 / 0.93 | 0.21 / 0.39 / 0.86 | 0.10 / 0.37 / 0.77 | 140 of 150 | 0.20 / 0.34 / 0.86 | 0.367 / 0.934 / 1.272 |
| closed, 40 | 150 | 39 | 3 (6) | 39 of 150 | 0.22 / 0.37 / 0.69 | 0.24 / 0.36 / 0.49 | 0.11 / 0.40 / 1.09 | 137 of 150 | 0.21 / 0.38 / 0.55 | 0.380 / 1.082 / 2.576 |
| open, 20 | 150 | 56 | 2 (5) | 56 of 150 | 0.18 / 0.45 / 0.91 | 0.15 / 0.42 / 0.62 | 0.12 / 0.34 / 0.62 | 144 of 150 | 0.26 / 0.44 / 0.62 | 0.213 / 0.957 / 1.389 |
| open, 40 | 150 | 46 | 2 (6) | 46 of 150 | 0.21 / 0.45 / 0.86 | 0.19 / 0.40 / 0.75 | 0.10 / 0.29 / 0.64 | 144 of 150 | 0.19 / 0.34 / 0.74 | 0.266 / 1.023 / 1.981 |
| open, 80 | 150 | 33 | 3 (8) | 33 of 150 | 0.16 / 0.32 / 0.72 | 0.16 / 0.28 / 0.58 | 0.08 / 0.27 / 0.51 | 129 of 150 | 0.17 / 0.30 / 0.58 | 0.294 / 0.958 / 1.474 |

## Comebackers drawn 2nd–5th who won

Every cast comebacker in these races is drawn 2nd to 5th: 124 drawn 2nd, 99 3rd, 135 4th and 130 5th.

| field | comebackers drawn 2–5 | of them won | share |
| --- | --- | --- | --- |
| closed, 20 | 106 | 18 | 17.0% |
| closed, 40 | 112 | 17 | 15.2% |
| open, 20 | 106 | 16 | 15.1% |
| open, 40 | 103 | 26 | 25.2% |
| open, 80 | 61 | 18 | 29.5% |

## Reading it

- **The comeback racer does not, as a rule, run further ahead than the drawn winner.** Where he
  leads after reaching 3rd, his largest lead is p90 0.24–0.38 canvas widths (max 0.64). The drawn
  winners' is p90 0.30–0.44 (max 0.86). His lead at the finish when he wins is p90 0.29–0.67 s,
  against 0.32–0.45 s for the drawn winners. The single largest finishing lead of a comebacker,
  0.69 s (closed, 20), is below the drawn winners' maximum of 0.93 s.
- **He wins more often than his drawn place says**: 15–30% of comebackers, all drawn 2nd to 5th,
  win. The share is highest on open tracks with more racers. **The drawn winner wins only 22–37% of
  the same races.** A drawn place is a target the race steers towards, not a result, for winners and
  comebackers alike.
- **The owner's race, re-run on current master** (River Run, Quick-Test seed 3, default names):
  - **With 20 racers:** the comebacker, drawn 3rd, led at one point by 0.36 canvas widths, then
    finished 3rd, 0.05 s behind 2nd.
  - **With 40 racers:** he never led, and finished 3rd.
  - His observation was on the production preview at `b1556bd5`, with the comeback shot rules of that
    day. Today's shot ends when he reaches 3rd (COMEBACK-HOLD-2), so the camera leaves him at a
    different moment than it did then.

## The code that decides how fast he runs after reaching his drawn place

`client/src/modules/racePlanner.js`:

- **`:1276-1279`, `released`** — a cast hero whose DRAWN place is in the top band (`<= BAND_EDGES[0]`,
  i.e. 5th or better: `racePlanner.js:56`) past `choreoReleaseProgress` (`defaults.js`) is no longer
  steered. His target becomes his current rank (`:1345-1346`), so his speed is his natural speed:
  the finish among the front group is a free run-out. **Every comebacker here is drawn 2nd–5th, so
  all of them reach this release.** This is the line that lets a comebacker win.
- **`:1282-1287`, `heldFree`** — a HELD comebacker is released at the end of his curve and steered
  towards his drawn place like any other racer.
- **`:1356-1358`, `arrived`** — the moment he first holds his drawn place.
- **`:1425-1432`** — after he arrives he is steered again at full strictness, not left unsteered
  (ARRIVAL-STEERED-AGAIN-1).
- **`:1438-1445`** — his own arrival ceiling (`arrivalCeiling`) caps his speed until he arrives.

So from the release progress on, the front five, comebacker included, run unsteered.

## Not done

No product change, as the brief says.
