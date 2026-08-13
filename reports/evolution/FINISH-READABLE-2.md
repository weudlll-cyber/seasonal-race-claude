# FINISH-READABLE-2 — the finish line is a line, not a hair

**Branch:** `feat/finish-readable`, continuing from `84b7c8f0`. **Not merged. Nothing minted.**
Corrects [FINISH-READABLE-1](FINISH-READABLE-1.md), whose band this restores.

**The owner, on dirt-oval and garden-path:** _"that does not look much better — we now have a very
thin, barely visible line, otherwise nothing has changed. I see nothing."_

---

## 1. What went wrong, and it was the brief rather than the build

He rejected a **GANTRY** over the track — a structure standing OVER the racing surface, which would
hide the racers passing under it. That was turned into **"edges only"**, and FINISH-READABLE-1 then
**deleted the ground band instead of repairing it**, leaving two checkered posts and a gold hairline.

**A flat marking painted ON the racing surface covers nobody.** The racers drive over it, exactly as
in a real race. "Structure at the edges" was about things standing UP, not about paint. So the band
comes back, across the full corridor; the posts stay, because he said they are good.

**What the previous version actually measured**, on the same instrument used below — and it is the
same number at every shot on every track, which is the whole complaint in one row:

| | widest overview | mid-race | tightest endgame |
| --- | --- | --- | --- |
| band depth on screen | **7.7 px** | 7.7 px | 7.7 px |
| total painted area | **486 px²** (0.053% of canvas) | 486 px² | 486 px² |
| quads | 6 | 6 | 6 |

## 2. What it draws now

**A checkered band across the whole corridor**, two rows deep, flat on the track surface, centred on
the finish line and extruded along the FORWARD direction. Columns are sized so each checker is
**square on screen**, and the band ends flush with both corridor edges.

**The posts are kept and now flank the band** rather than replacing it: the same pattern, reaching
further along the track at each edge, so the finish reads as a gate the field passes between.

**The gold accent is kept and widened** from a 1 px hairline to 2.5 screen px, bisecting the band at
the exact line — the band says _this is the finish_, the gold says _and this is the line_.

**One correction rides along.** The screen→world conversion divided by `effZoomX` for across-track
sizes and `effZoomY` for along-track ones, which is only right when the track happens to run along a
screen axis. A closed track's mapping is anisotropic, so the conversion now projects each direction
through **both** scales (`hypot(fx·sx, fy·sy)`). Without this the band was subtly the wrong depth on
every curve.

## 3. Sizing — the numbers, and why they are these numbers

**Band depth 30 screen px** (two rows of 15), **label 20 screen px**, **gold 2.5 screen px**.

**Why 30.** Measured against the corridor's own screen width, 30 px is about **1:22** at the mid-race
shot — the proportion a real finish line has against a real road, which is the thing it has to look
like. 9 px was 1:63.

**One bound that is geometry rather than taste: never deeper than half the road is wide.** At the
widest overview the corridor is only 25–39 screen px across on a closed track, so an unclamped 30 px
band would be deeper than the road is wide and would stop reading as a LINE and start reading as a
blob straddling the track. **This clamp is why the reported depth differs between the three shots
even though the nominal size does not** — and it binds only on the closed tracks, which are the
narrow ones.

| track | corridor | WIDEST overview |  | MID-RACE |  | TIGHTEST endgame |  | label |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | (world) | zoom | **depth** | zoom | **depth** | zoom | **depth** | |
| city-circuit | 197 | 0.22 | **21.4** | 3.79 | 30.0 | 6.91 | 30.0 | 20.0 |
| dirt-oval | 178 | 0.22 | **19.3** | 3.79 | 30.0 | 7.11 | 30.0 | 20.0 |
| garden-path | 198 | 0.22 | **21.5** | 3.79 | 30.0 | 5.17 | 30.0 | 20.0 |
| ice-track | 211 | 0.22 | **22.9** | 3.79 | 30.0 | 7.11 | 30.0 | 20.0 |
| luger-hill | 250 | 0.50 | 30.0 | 3.20 | 30.0 | 6.00 | 30.0 | 20.0 |
| mountainstreet | 300 | 0.35 | 30.0 | 3.20 | 30.0 | 3.42 | 30.0 | 20.0 |
| river-run | 300 | 0.35 | 30.0 | 3.20 | 30.0 | 6.00 | 30.0 | 20.0 |
| searound | 131 | 0.22 | **13.4** | 3.79 | 29.6 | 7.11 | 29.6 | 20.0 |
| seatrack | 300 | 0.35 | 30.0 | 3.20 | 30.0 | 4.28 | 30.0 | 20.0 |
| space-sprint | 300 | 0.35 | 30.0 | 3.20 | 30.0 | 6.00 | 30.0 | 20.0 |

**The three shots are measured, not chosen.** A real seeded race is run per track and the camera's
own effective zoom recorded on every frame; the widest overview is the minimum, the mid-race shot the
median, the tightest endgame shot the maximum inside the endgame window.

**searound reads 29.6 rather than 30.0** — it is the narrowest corridor (131 px) and its column count
rounds so one quad falls outside the modal-area group the depth is derived from. A 1.3% measurement
artefact, not a different band.

## 4. Painted area — the answer to "I see nothing"

| track | WIDEST: band + posts = total | of canvas | vs before | MID | TIGHTEST |
| --- | --- | --- | --- | --- | --- |
| city-circuit | 772 + 489 = **1261** | 0.137% | **2.6×** | 21051 | 37862 |
| dirt-oval | 630 + 399 = **1030** | 0.112% | **2.1×** | 19225 | 35212 |
| garden-path | 780 + 494 = **1274** | 0.138% | **2.6×** | 21166 | 28496 |
| ice-track | 886 + 561 = **1447** | 0.157% | **3.0×** | 22394 | 41739 |
| luger-hill | 3730 + 2215 = **5945** | 0.645% | **12.2×** | 26375 | 49453 |
| mountainstreet | 3105 + 1967 = **5072** | 0.550% | **10.4×** | 31650 | 33853 |
| river-run | 3105 + 1967 = **5072** | 0.550% | **10.4×** | 31650 | 59344 |
| searound | 341 + 216 = **558** | 0.060% | **1.5×** | 15243 | 27115 |
| seatrack | 3105 + 1967 = **5072** | 0.550% | **10.4×** | 31650 | 42372 |
| space-sprint | 3171 + 2008 = **5179** | 0.562% | **10.4×** | 31650 | 59344 |

At the **mid-race** shot — the one most of a race is watched at — the marking paints **31 to 65 times**
what it did, because the old one was the same 486 px² at every zoom while this one fills the corridor.

## 5. All ten tracks have real area, open and closed

**Yes.** FINISH-READABLE-1's Stage A found the five CLOSED tracks enclosing 0.000–0.001 world px²
because the depth was extruded along the line's own direction. That repair holds and the band now
paints on **10 of 10** at every shot — the table above has no zero in it. Quad counts run 16–24 at the
widest overview and 104 at the tightest, the column cap doing its job.

## 6. It is UNDER the racers — measured, at the tightest endgame zoom

`scripts/finish-band-truth.mjs` renders one real frame through `renderRaceFrame` at each shot and
compares the band's **last** draw index against the **first** draw issued by `drawRacers`. On all ten
tracks at the tightest endgame zoom, the band precedes every racer draw.

**Two earlier versions of that check were wrong, and both said the band covered the racers.** The
first identified racers by arc radius and flagged the TRACK LIGHTS; the second identified them by
world position and flagged a track light sitting within a body-width of a racer near the edge, on all
five open tracks. The check now marks the boundary **exactly**: `drawRacers` reaches every racer
through one call, `racerType.drawRacer`, and the racer type is a frame PARAMETER rather than an
import, so it can be wrapped. No heuristic is left in it.

## 7. Fingerprints — measured fresh, NOT minted

| role | branch base | this branch |
| --- | --- | --- |
| world | `dc4647be0f55ebdb` | **not run** — `engine-reach --check` clears both changed paths, and routing skipped it |
| camera | `64432e18a7e62188` | `64432e18a7e62188` — **unmoved, and RUN rather than argued** |
| render | `096f2726c45ed853` | `db98466db3b2bba4` |

CAMERA was measured even though routing skipped it: 45 s to turn an argument into a measurement is
the trade the record already asks for elsewhere.

`npm run verify`: **PASS 12 FAIL 0 SKIP 8**. Client suite 205 files, **4018 tests, all pass**.

**One thing worth recording about the verify run.** The first attempt reported `client-suite` FAILED
with a wall clock of 30,048 s. Nothing was wrong with the code — the suite was starved by the
measurement runs happening beside it, and every one of its 4018 tests passes on a quiet machine. That
is precisely the contention documented in [NIGHT-2026-08-13](../night/NIGHT-2026-08-13.md) §Piece 5,
and it has now cost a false red.

## 8. Source hygiene

- **Added**: `scripts/finish-band-truth.mjs`, the instrument. FINISH-READABLE-1 measured with an
  ad-hoc script that was never committed, which is why its numbers cannot be re-run today; this one
  is in the repository.
- **Fixed**: the anisotropic screen→world conversion (§2).
- **Rewritten**: the docblock over `drawEditorTrackSurface`, which described the edges-only design.
- **Unchanged**: one `drawFinishGate` for both topologies, and the screen-constant sizing — both were
  FINISH-READABLE-1's and both were right.
- **Noticed and left**: `drawEditorTrackSurface` is still named for a surface it does not draw.
  Renaming it churns the render fingerprint's file list for no behavioural gain.

## 9. For his eye

**On dirt-oval and garden-path — the two he just used — the finish should now be a checkered band
lying across the whole road with a gold line through it and a post at each edge, big enough to find
at the widest overview and still the same size on screen when the camera closes in; racers drive over
it and are never hidden by it.**
