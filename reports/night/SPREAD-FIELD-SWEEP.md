# SPREAD-FIELD-SWEEP — the guarantee binds in the PACK, not on a spread field

**Branch:** `feat/spread-field-sweep`, off master `be4202c8`. **MEASUREMENT ONLY.**
**No value changed.** The only source edit is the comment in `defaults.js` that owed this measurement.

---

## THE ANSWER

**The premise this sweep was commissioned on is wrong, and that is the finding.**

`minRacersVisible` was raised 3 → 5 on the owner's eye, and the comment recorded his reason: *"the
3-beats-5 numbers were taken on a PACK field, and on a SPREAD field the guarantee binds and widens a
lot at 5 — the case the sweep never covered."*

Measured across the five tracks where the setting acts at all, three field sizes and three seeds:

| arm | frames it changed | in the PACK third | in the middle third | in the SPREAD third |
|---|---|---|---|---|
| `minRacersVisible = 3` | 1.09 % | **2.89 %** | 0.19 % | 0.19 % |
| `minRacersVisible = 5` | 3.56 % | **7.95 %** | 0.98 % | 1.75 % |

**It binds four and a half times more often in the pack than on a spread field.** The old PACK
measurement was looking at the right case all along; the reason given for re-measuring was itself
mistaken.

**Why that makes sense, and MIN-RACERS-5 already wrote the explanation without connecting it:** *"the
guarantee only speaks where nothing else is speaking."* On a strung-out field the field ceiling is
already holding the shot wide, so there is nothing left for the company guarantee to ask for. In the
pack, the state wants a tight shot on the leader and the guarantee is the only thing pulling back.

**None of this contradicts the shipped 5.** 5 acts about three times as often as 3 on the tracks
where anything acts, and more as the field grows. **It is not a reason to move the value**, and I have
not.

---

## THE ONE TRACK THAT DOES BEHAVE AS HE DESCRIBED

**Ice-track is the exception and it should not be flattened into the average.**

| track | arm 5: pack | arm 5: mid | arm 5: **spread** |
|---|---|---|---|
| city-circuit | 14.89 % | 0.53 % | **0.00 %** |
| dirt-oval | 9.05 % | 0.00 % | **0.05 %** |
| space-sprint | 9.26 % | 1.09 % | **2.68 %** |
| garden-path | 0.77 % | 2.55 % | **0.00 %** |
| **ice-track** | 5.79 % | 0.73 % | **6.03 %** |

On ice-track the guarantee binds *slightly more* when the field is strung out than when it is packed
— the only one of the five that does. If the owner's eye-test was on ice-track, his description was
exactly right about what he was looking at, and the mistake was generalising it to every track.

---

## WHAT WAS MEASURED, AND HOW SPREAD IS DEFINED

`scripts/company-spread-sweep.mjs` (new, read-only). For each arm it runs a real 60-second race and
reads `CameraDirector._framingProbe`, which the camera writes every frame and reads never — the same
instrument `company-bind-truth.mjs` uses, for the same reason (MIN-RACERS-5's first attempt
recomputed the ceiling after the frame and got 0 % everywhere).

**CHANGED %** is the share of frames whose zoom differs from the same race with the guarantee OFF
(`minRacersVisible = 1` short-circuits the ceiling to Infinity), so the two arms differ in exactly
one thing.

**SPREAD** is the field's t-spread — `max t − min t` over racers still running, in laps — recorded per
frame. Frames are then RANKED by it and cut into thirds: the bottom third is the pack, the top third
is the strung-out field. **Ranked rather than cut at an absolute value**, because "spread" means
something different on a 4 773 px lap than on a 19 772 px one, and a fixed threshold would compare
two tracks on different questions.

Typical median t-spread, pack tercile → spread tercile: city-circuit 0.060 → 0.112 laps,
space-sprint 0.016 → 0.040.

**Grid:** 5 tracks × {20, 40, 70} racers × 3 seeds × arms {1, 3, 5} = 90 measured rows, 135 races.
Raw data in [reports/perf/spread-field-sweep/binding.json](../perf/spread-field-sweep/binding.json).

---

## FIELD SIZE — the setting's reach grows with the field

| racers | arm 3 changed | arm 5 changed | arm 5 in the pack |
|---|---|---|---|
| 20 | 0.09 % | 1.89 % | 3.64 % |
| 40 | 0.68 % | 3.49 % | 8.74 % |
| 70 | 2.50 % | 5.31 % | 11.47 % |

**At 20 racers, 3 is very nearly inert** (0.09 % of frames) while 5 already does something. At 70 both
act and 5 acts twice as often. This is the one dimension where the answer is unambiguous and
monotone, and it argues for 5 at the 40-racer field the owner runs.

---

## THE ZOOM RANGE

**The percentiles do not move at all.** p5 / median / p95 are identical between the arms on every row
— e.g. city-circuit `4.5489 / 9.0978 / 12.4061` at 1, 3 and 5 alike.

That is not a null result, it is a measurement artefact MIN-RACERS-5 already named: zoom lands on the
discrete levels the state profiles set, so a setting that changes one frame in twelve leaves the
percentiles untouched. **The honest range statistic is the widest single-frame widening**, and it is
large where it fires:

| track | widest widening vs OFF, arm 3 | arm 5 |
|---|---|---|
| dirt-oval | 2.368× | **2.503×** |
| city-circuit | 1.988× | 2.086× |
| ice-track | 1.868× | 2.071× |
| space-sprint | 1.344× | 1.743× |
| garden-path | 1.510× | 1.624× |

**The guarantee is rare and violent, not common and gentle.** On dirt-oval a single frame is pulled
two and a half times wider than the state asked for. That is the shape the owner would notice by eye
and that a percentile cannot show.

---

## THE OTHER FIVE TRACKS — confirmed once, as instructed

luger-hill, mountainstreet, river-run, searound, seatrack: **0.00 % CHANGED at both 3 and 5**, widest
ratio 1.000, zoom percentiles identical. Confirmed at 40 racers, one seed, and not swept further.
Raw data in [confirm-five.json](../perf/spread-field-sweep/confirm-five.json).

---

## THREE HONEST LIMITS

- **Three seeds is thin, and the variance is large.** At 40 racers, arm 5: ice-track reads
  6.21 % / 0 % / 7.71 % across the three seeds, garden-path 1.46 % / 0 % / 0 %. **A single seed can
  say the setting does nothing on a track where it usually does something.** The per-track ordering
  above is stable; the individual numbers are not, and nobody should quote one of them alone.
- **CHANGED % is not a quality score.** It says how often the setting moved the picture, never
  whether the picture got better. The emptiness-versus-restlessness scoring MIN-RACERS-5 named is
  still not built, and this sweep does not replace it — it answers the narrower question the comment
  actually owed.
- **The eye-test conditions are unknown.** Which track, which field size and which seed the owner was
  looking at when he chose 5 is not recorded, and ice-track behaves differently from the other four.
  **That is worth recording for next time: an eye-test verdict without its conditions cannot be
  reproduced or contradicted.**

---

## TWO BUGS IN MY OWN HARNESS, both caught before they reached the numbers

- **The `widest` ratio was inverted.** A *smaller* `guaranteed` is a *wider* shot, so the ratio is
  `off / arm`. My first version had `arm / off` and reported 1.000 where `company-bind-truth.mjs`
  reported 1.099 on the same race. Two harnesses disagreeing on one race is what caught it; both
  comparisons are now copied from the existing one verbatim rather than re-derived.
- **`loadTracks({only})` matches ONE exact id, not a comma list.** The first full run therefore
  matched no tracks, printed a header with no rows, wrote an empty JSON file and **exited 0**. That
  is precisely the shape R0a/VERIFY-BASE-1 exists to forbid, so the script now REFUSES when a
  requested track is missing, names the missing ones, lists what is available and exits 2.

---

## SOURCE HYGIENE

| file | before → after | what |
|---|---|---|
| `scripts/company-spread-sweep.mjs` | — → 188 | new, read-only |
| `reports/perf/spread-field-sweep/*.json` | — → 2 files | raw data, 90 + 10 rows |
| `client/src/modules/storage/defaults.js` | +9 −1 | **comment only** — the "still owed" line replaced by the finding and a pointer here |
| `reports/night/SPREAD-FIELD-SWEEP.md` | — → new | this |

**No value changed.** The `defaults.js` edit is a comment; `engine-reach --check` result in the reply.

### Noticed but left

- **`company-bind-truth.mjs` and this script share the two comparison functions by copy.** That is the
  copied-default problem one level up (LESSONS L207 is about exactly this shape) and it already cost
  one inverted ratio. Extracting them into `scripts/lib/` is the right fix and is not this block's job.
- **The mid tercile is sometimes higher than both neighbours** — garden-path arm 5 reads 0.77 / 2.55 /
  0.00. Terciles of a skewed distribution are a blunt instrument; a continuous fit of binding rate
  against t-spread would say more, and would need more seeds to be worth fitting.
