# COMEBACK-CUT-DIAG-1 — why the comeback shot ended early in the owner's race

**2026-10-02, branch `ship/owner-cosmetic-defaults` at `b1556bd5`. Measurement only: no product
file was changed, nothing was minted or merged.**

**The owner's observation, 2026-10-02**, on the production preview at `b1556bd5`: Quick Test, River
Run, Quick-Test seed 3. The comeback shot cut away while the comeback racer was around place 5, and
the racer then went on far into the lead.

## The short version

- **What ends the shot: the gain-stop rule of COMEBACK-HOLD-1.** After the 8 s minimum, the shot ends
  when the racer has gained no place in the last 2 s:
  - the flag `comebackGainStopped`, `client/src/modules/camera/CameraDirector.js:1043`;
  - the decision, reason `comeback-gain-stopped`, `transitionDecision.js:121-125`;
  - the read `gainedWithin`, `comebackDetector.js:172`;
  - the window `comebackGainStopMs: 2000`, `client/src/modules/storage/defaults.js:395`.

  No eligibility gate ended it. The detector's gates (`comebackDetector.js:267-270`) decide only
  whether a shot may START; a running shot is never re-checked against them.
- **The field matters, and the owner's is not the default one.**
  - A fresh browser's Quick Test fields **20** racers.
  - The owner's setup fields **40**: his stored Quick Test of the same day (`4CW5PS`, read-only from
    `server/data/races.sqlite`) has 40 racers with the default names in order.
  - His River Run seed-3 race itself is **not** stored, so it could not be replayed exactly.
- **With the 40-racer field the reproduction matches his description.** The shot ran 13.6 s and was
  cut at **4th**, by the gain-stop. The racer gained again **0.37 s** later, was 2nd 1.9 s after the
  cut, and finished tied 2nd, 0.16 s behind the winner.
- **With the default 20-racer field it does not match.** The racer climbs from 9th to **1st during
  the shot**, is cut while leading (a leader cannot gain a place), and finishes 3rd.
- **The 2 s window was chosen on 20-racer fields and does not transfer to 40.** Over 30 races with a
  40-racer field, **11 of 18** shots are cut and the racer gains again within 5 s (20-racer field:
  1 of 10).

## 1 · Does the harness reproduce the browser?

**Instrument:** `scripts/diag/comeback-hold-measure.mjs` (COMEBACK-HOLD-MEASURE-1), extended
read-only for this piece:
- `--track=` — one track, through the driver's own `loadTracks({ only })`;
- `--roster=quicktest` — the Quick Test's default names, through `resolveNameSet(DEFAULT_NAME_SET)`;
- `--racers=` — the field size;
- `--timeline=` — a per-frame trace of every cast comebacker;
- per shot, `regainWithin5s` and `nextGainAfterS`.

**The race.** River Run, seed 3, 20 racers, the Quick Test's default names; the transition reasons
are the camera's own `_lastTransitionReason`. A racer's name is a race input, which is why the names
matter (the roster block in `scripts/lib/raceDriver.mjs`).

**The browser.** The production build of `b1556bd5`, run in a fresh browser on port 4599, twice,
with the camera-state HUD and its anchor label traced per frame:

| | comeback racer | shot length | shot start before the winner card | shot end before the winner card |
| --- | --- | --- | --- | --- |
| harness | Arrow | 8.58 s | 23.81 s | 15.23 s |
| browser run 1 | Arrow | 8.71 s | 22.79 s | 14.08 s |
| browser run 2 | Arrow | 8.79 s | 22.96 s | 14.17 s |

**Difference:**
- Same racer.
- Shot length within 0.21 s.
- Start and end both about 0.9–1.0 s apart against the winner card. That is a constant offset, so it
  comes from my estimate of when the card appears (last crossing + the 1.5 s hold), not from the shot.

The 40-racer field was not run in a browser: a fresh browser fields 20.

## 2 · The timeline — 40-racer field (the owner's field shape)

Comeback racer **Breeze** (index 38), drawn finishing place 2.
- The shot starts at race time 36.25 s, cast through the comeback precedence.
- It ends at **49.83 s** (13.58 s) with reason **`comeback-gain-stopped`**.

Columns: race time; rank (of 40); 2 s gain read (`gainedWithin(…, 2000)`); locked (is he the
camera's locked comeback racer); gates — `notUpFront` (`comebackMaxCurrentRankPct`, `:268`),
`startGap` (`comebackMinStartGap`, `:267`), `gained` (`comebackMinPositionsGained`, `:270`).

| race time (s) | rank | camera | 2 s gain | locked | notUpFront | startGap | gained | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 31.25 | 21 | LEADER_ZOOM | no | no | yes | yes | no | 5 s before the shot |
| 31.97 | 20 | LEADER_ZOOM | yes | no | yes | yes | yes | first offered |
| 36.25 | 18 | **COMEBACK_ZOOM** | yes | **yes** | yes | yes | yes | shot starts (precedence) |
| 37.53 | 15 | COMEBACK_ZOOM | yes | yes | yes | yes | yes | |
| 40.77–44.67 | 14 → 9 | COMEBACK_ZOOM | yes | yes | yes | yes | yes | steady climb |
| 45.83 | 8 | COMEBACK_ZOOM | yes | yes | **no** | yes | yes | the "not up front" gate closes; the shot runs on |
| 47.43 | 6 | COMEBACK_ZOOM | yes | yes | no | **no** | yes | |
| **47.85** | **4** | COMEBACK_ZOOM | yes | yes | no | no | yes | **his last gain inside the shot** |
| **49.83** | **4** | LEADER_ZOOM | no | no | no | no | yes | **cut: 1.98 s without a gain → `comeback-gain-stopped`** |
| 50.20 | 3 | LEADER_ZOOM | yes | no | — | — | — | next place, **0.37 s after the cut** |
| 51.68 | 2 | OVERVIEW | yes | no | — | — | — | |
| 58.05–58.22 | 2 (tie) | PHOTO_FINISH | — | — | — | — | — | finishes tied with Raven, 0.16 s behind the winner Flare |

## 3 · After the cut

| | 40-racer field (Breeze) | 20-racer field (Arrow) |
| --- | --- | --- |
| rank at the cut | 4 | **1** |
| next place gained | 0.37 s after the cut | none — he was leading |
| rank 5 s after the cut | 2 | 1 |
| rank 10 s after the cut | 2 (the finish line is 8.2 s after the cut) | 3 |
| finish | 2nd, tied with Raven (58.224 s), 0.16 s behind the winner | 3rd |
| lead over P2 at the finish | none — not the winner | none — not the winner |

Neither reproduction has the racer "far into the lead" at the finish. **That part of the owner's
observation is not reproduced.** His own race is not stored, and his setup may differ in more than
the field size (racer type, player group).

## 4 · Counterfactuals on the SAME race, driven

| field | gain-stop 2 s (shipped) | 3 s | 4 s | off (15 s cap only) |
| --- | --- | --- | --- | --- |
| 40 racers | ends 49.83 s, 13.58 s, **gain-stop**, rank 18 → 4; next gain +0.37 s | 51.27 s, 15.02 s, **cap**, 18 → 3; next gain +0.42 s | same as 3 s | same as 3 s |
| 20 racers | ends 47.95 s, 8.58 s, gain-stop, 9 → 1 | 47.38 s, 8.02 s, gain-stop, 9 → 1 | 47.98 s, 8.62 s, gain-stop | 54.37 s, 15.00 s, cap |

- **No eligibility gate caused the cut**, so the "gate does not end a running shot" arm has nothing
  to change. That is already how the code behaves (§1 of COMEBACK-HOLD-MEASURE-1).
- **Why 3 s ends earlier than 2 s on the 20-racer field.** The rule counts NET places over its
  window. At 47.38 s the 3 s window reaches back to 44.38 s, when Arrow was already 1st, so there is
  no net gain. The 2 s window still saw his retake of the lead at 45.95 s.

## 5 · The same arms over the 30 races of COMEBACK-HOLD-1

10 shipped tracks × Quick-Test seeds 1–3. Every number is over the shots of that arm.

**As specified — the races of COMEBACK-HOLD-1: 20 racers, index names.**

| arm | shots | cut, then regained a place within 5 s | length median / p90 / max | ended by |
| --- | --- | --- | --- | --- |
| 2 s (shipped) | 10 | 1 of 10 | 8.00 / 9.58 / 10.08 s | gain-stop 10 |
| 3 s | 10 | 3 of 10 | 8.24 / 10.48 / 10.58 s | gain-stop 10 |
| 4 s | 10 | 2 of 10 | 8.78 / 10.57 / 11.58 s | gain-stop 10 |
| off | 10 | 6 of 10 | 15.00 / 15.00 / 15.02 s | cap 9, photo-finish gate 1 |

**Added, labelled: the same tracks and seeds with the owner's field shape — 40 racers, the Quick
Test's default names.**

| arm | shots | cut, then regained a place within 5 s | length median / p90 / max | ended by |
| --- | --- | --- | --- | --- |
| 2 s (shipped) | 18 | **11 of 18** | 9.94 / 13.58 / 15.00 s | gain-stop 17, cap 1 |
| 3 s | 18 | 11 of 18 | 10.94 / 15.00 / 15.02 s | gain-stop 15, cap 3 |
| 4 s | 18 | 9 of 18 | 12.56 / 15.00 / 15.02 s | gain-stop 12, cap 6 |
| off | 18 | 7 of 18 | 15.00 / 15.02 / 15.02 s | cap 18 |

★ **The W of COMEBACK-HOLD-1 was chosen on the first table's field and does not hold on the second.**
In a 40-racer field, places are gained in steps further apart, so a 2 s silence is common
mid-climb. Even with gain-stop off, 7 of 18 shots end at the 15 s cap with the racer still gaining
within 5 s. Choosing a W for the owner's field is a decision, not this piece's; the tables are here
for it.

## Noticed and left

- His River Run seed-3 race is not in `races.sqlite`. Only one Quick Test of 2026-10-02 is stored
  (`4CW5PS`, seed 9). Whether every Quick Test is stored was not checked.
- The harness's winner-card time is an estimate (last crossing + `finishHoldAfterLastMs`). A ~0.9 s
  constant offset against the browser says the card appears about that much later than estimated.
- The `--timeline` gates are evaluated exactly as `best()` evaluates them. `best()` itself is called
  each frame as a pure read; it mutates nothing (COMEBACK-BEATS-1).
