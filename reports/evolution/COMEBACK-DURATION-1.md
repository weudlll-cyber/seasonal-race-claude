# COMEBACK-DURATION-1 — how long a comeback really lasts

**2026-10-02, branch `ship/owner-cosmetic-defaults` at `76c67267`. Measurement only: no product file was
changed, nothing was minted or merged.**

**The owner's specification, 2026-10-02:**
- fully random seeds, 30 races per track per field size;
- closed tracks with 20 and 40 racers; open tracks with 20, 40 and 80 racers;
- no hold-setting arms;
- a comebacker counts as a real comebacker once he has taken 3rd place.

## The short version

How long after the comeback shot starts until the comebacker first holds 3rd place or better (only
shown comebackers who reached it):

| field | median | p90 | never reached 3rd |
| --- | --- | --- | --- |
| closed, 20 racers | 8.5 s | 20.6 s | 3 of 97 |
| closed, 40 racers | 13.5 s | 25.2 s | 16 of 111 |
| open, 20 racers | 6.9 s | 14.0 s | 7 of 97 |
| open, 40 racers | 10.4 s | 17.8 s | 7 of 97 |
| open, 80 racers | 12.3 s | 17.3 s | 15 of 60 |

**Reading it:**
- Against the 8 s minimum and 15 s maximum of COMEBACK-HOLD-1: in every field size the median
  comebacker needs more than 8 s from the shot's start to reach 3rd, except open tracks with 20
  racers.
- On closed tracks with 40 racers, the p90 (25.2 s) is well past 15 s.
- More racers take longer: 8.5 → 13.5 s on closed tracks; 6.9 → 10.4 → 12.3 s on open tracks.
- The share that never reaches 3rd rises from 3 of 97 to 16 of 111 on closed tracks. On open tracks
  it is 7 of 97 at both 20 and 40 racers, and highest at 80 racers (15 of 60).

## The tracks, open or closed — read from the track data itself

The field is `closed` in each track file (`server/seeds/tracks/`). The shared race driver reads the
same field (`scripts/lib/raceDriver.mjs`, `shape.isOpen`).

| track | `closed` (file:line) | class | laps |
| --- | --- | --- | --- |
| city-circuit | `city-circuit.json:23` true | closed | 2 |
| dirt-oval | `dirt-oval.json:26` true | closed | 2 |
| garden-path | `garden-path.json:27` true | closed | 2 |
| ice-track | `ice-track.json:18` true | closed | 2 |
| searound | `searound.json:16` true | closed | 2 |
| luger-hill | `luger-hill.json:17` false | open | 1 |
| mountainstreet | `mountainstreet.json:16` false | open | 1 |
| river-run | `river-run.json:23` false | open | 1 |
| seatrack | `seatrack.json:16` false | open | 1 |
| space-sprint | `space-sprint.json:23` false | open | 1 |

## How it was measured

**Instrument:** `scripts/diag/comeback-hold-measure.mjs`, extended read-only.
- `--names=` chooses the Quick Test name set.
- `--duration-out=` writes one row per cast comebacker per race.
- `steerToThirdAfterOutsideS`, the variant below.
- It runs on the shared driver `scripts/lib/raceDriver.mjs`; nothing is duplicated.

**The races are Quick Tests.**
- Each race is a Quick-Test seed on a shipped track, with the track's default racer type.
- The field is the Quick Test's default names in order (`resolveNameSet`):
  - the `current` set for 20 and 40 racers;
  - the `long` set for 80, because `current` has 70 names and a Quick Test cannot field 80 from it.
- A racer's name is a race input, so these are the races the Quick Test runs, apart from the
  frame-timing variation of the camera.

**Seeds.**
- Drawn with `crypto.randomInt(1, 10000)` (the Quick-Test range 1–9999), independently for each of
  the 25 track × field-size jobs.
- 30 each: **750 races in total**.
- Every seed is in [COMEBACK-DURATION-1-seeds.csv](COMEBACK-DURATION-1-seeds.csv) (track, open,
  racers, name set, Quick-Test seed). To replay one: Quick Test, that track, that field size, that
  name set, that seed.

**The camera** ran with the shipped settings only, to find WHEN a comeback shot locked on the racer.
The shot's end is not measured.

**The cast.** The comebackers are read from the race plan's own `getCameraPlan()`
(`client/src/modules/racePlanner.js:1935`, heroes with role `comebacker`). The instrument reads them
at `scripts/diag/comeback-hold-measure.mjs:192`.

**Definitions.**
- **Steering start** — the frame the plan casts him: `isHeroChoreographed` is set at
  `racePlanner.js:1193`, and from then he follows his authored curve.
- **Steering end (the hand-off)**:
  - a held comebacker hands off at his curve's `releaseAt` (`getHeldRelease()`; `heldFree`,
    `racePlanner.js:1287`);
  - otherwise, if his drawn place is in the top band, at `choreoReleaseProgress` (0.97, shipped;
    `released`, `racePlanner.js:1279-1282`);
  - otherwise he would be steered to the finish.

  **All 488 comebackers in this run were held**, so every steering end is his `releaseAt`. None was
  steered to the finish.
- **Ranks** — by distance raced, 1 = leading, among all racers. **"3rd place or better"** = rank ≤ 3.
- **Shot start** — the first frame the camera is in COMEBACK_ZOOM locked on him.
- **Percentiles** — nearest-rank; the median of an even count is the mean of the middle two. Every
  statistic is over the comebackers that reached the event, and its N is printed beside it; the ones
  that never reached it are counted separately.

**★ The literal "steering start → 3rd place" reads 0 for many comebackers**, and that is not a
comeback. In the 20-racer fields most comebackers are already 3rd or better at the moment the plan
casts them (67 of 106 on closed tracks), and are then held back before they climb. So each table also
carries a labelled **variant: steering start → 3rd place, counted only after he has first been behind
3rd.**

**Determinism.** The whole run was made twice with the same seeds. **All 750 rows were identical**
on every shared field (the second run only added the variant's fields).

**Runtime.**
- 1,022 s for the 750 races, at most 10 processes at once on a 14-core machine.
- 1,010 s for the identical rerun.

## The tables

### Closed tracks, 20 racers

| | count |
| --- | --- |
| races | 150 |
| races with a cast comebacker | 106 (106 comebackers; 106 held) |
| races with a comeback shot | 97 (97 comebackers shown) |

| seconds | N | median | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- |
| steering duration | 106 | 41.1 | 44.3 | 48.9 | 49.7 |
| shot start → 3rd place (reached) | 94 | 8.5 | 12.7 | 20.6 | 32.4 |
| steering start → 3rd place (reached) | 105 | 0.0 | 16.8 | 48.5 | 62.8 |
| steering start → 3rd place, counted only after first being behind 3rd (variant) | 104 | 16.0 | 43.7 | 51.2 | 64.4 |

Never reached 3rd: **3 of 97** shown comebackers after the shot start; **1 of 106** comebackers after the steering start. Steered to the finish (no hand-off point): 0 of 106. Already 3rd or better at the steering start (so the literal measure reads 0): 67 of 106. Never reached 3rd after first being behind it (variant): 2 of 106.

### Closed tracks, 40 racers

| | count |
| --- | --- |
| races | 150 |
| races with a cast comebacker | 112 (112 comebackers; 112 held) |
| races with a comeback shot | 111 (111 comebackers shown) |

| seconds | N | median | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- |
| steering duration | 112 | 41.1 | 43.3 | 48.3 | 49.7 |
| shot start → 3rd place (reached) | 95 | 13.5 | 19.5 | 25.2 | 36.8 |
| steering start → 3rd place (reached) | 105 | 44.5 | 54.2 | 65.0 | 76.5 |
| steering start → 3rd place, counted only after first being behind 3rd (variant) | 102 | 49.1 | 57.8 | 65.0 | 76.5 |

Never reached 3rd: **16 of 111** shown comebackers after the shot start; **7 of 112** comebackers after the steering start. Steered to the finish (no hand-off point): 0 of 112. Already 3rd or better at the steering start (so the literal measure reads 0): 36 of 112. Never reached 3rd after first being behind it (variant): 10 of 112.

### Open tracks, 20 racers

| | count |
| --- | --- |
| races | 150 |
| races with a cast comebacker | 106 (106 comebackers; 106 held) |
| races with a comeback shot | 97 (97 comebackers shown) |

| seconds | N | median | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- |
| steering duration | 106 | 33.3 | 33.6 | 33.8 | 34.5 |
| shot start → 3rd place (reached) | 90 | 6.9 | 10.2 | 14.0 | 25.9 |
| steering start → 3rd place (reached) | 104 | 0.0 | 11.9 | 37.5 | 48.1 |
| steering start → 3rd place, counted only after first being behind 3rd (variant) | 104 | 13.2 | 35.2 | 40.1 | 53.5 |

Never reached 3rd: **7 of 97** shown comebackers after the shot start; **2 of 106** comebackers after the steering start. Steered to the finish (no hand-off point): 0 of 106. Already 3rd or better at the steering start (so the literal measure reads 0): 61 of 106. Never reached 3rd after first being behind it (variant): 2 of 106.

### Open tracks, 40 racers

| | count |
| --- | --- |
| races | 150 |
| races with a cast comebacker | 103 (103 comebackers; 103 held) |
| races with a comeback shot | 97 (97 comebackers shown) |

| seconds | N | median | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- |
| steering duration | 103 | 32.6 | 33.0 | 33.2 | 33.8 |
| shot start → 3rd place (reached) | 90 | 10.4 | 14.2 | 17.8 | 21.8 |
| steering start → 3rd place (reached) | 98 | 35.4 | 40.3 | 44.3 | 49.4 |
| steering start → 3rd place, counted only after first being behind 3rd (variant) | 98 | 37.2 | 42.0 | 46.6 | 50.9 |

Never reached 3rd: **7 of 97** shown comebackers after the shot start; **5 of 103** comebackers after the steering start. Steered to the finish (no hand-off point): 0 of 103. Already 3rd or better at the steering start (so the literal measure reads 0): 26 of 103. Never reached 3rd after first being behind it (variant): 5 of 103.

### Open tracks, 80 racers

| | count |
| --- | --- |
| races | 150 |
| races with a cast comebacker | 61 (61 comebackers; 61 held) |
| races with a comeback shot | 60 (60 comebackers shown) |

| seconds | N | median | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- |
| steering duration | 61 | 32.6 | 32.8 | 33.0 | 33.3 |
| shot start → 3rd place (reached) | 45 | 12.3 | 14.8 | 17.3 | 20.3 |
| steering start → 3rd place (reached) | 45 | 41.0 | 43.5 | 46.0 | 51.8 |
| steering start → 3rd place, counted only after first being behind 3rd (variant) | 45 | 41.0 | 43.5 | 46.0 | 51.8 |

Never reached 3rd: **15 of 60** shown comebackers after the shot start; **16 of 61** comebackers after the steering start. Steered to the finish (no hand-off point): 0 of 61. Already 3rd or better at the steering start (so the literal measure reads 0): 0 of 61. Never reached 3rd after first being behind it (variant): 16 of 61.

## Noticed and left

- In 80-racer races only 61 of 150 cast a comebacker, against 103–112 of 150 in the other field sizes.
  Not investigated.
- The 80-racer races use the `long` name set, because the default set cannot field 80. A Quick Test
  replay must choose that set (the CSV says so on every row).
