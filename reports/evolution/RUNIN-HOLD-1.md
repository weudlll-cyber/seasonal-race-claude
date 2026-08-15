# RUNIN-HOLD-1 — hold, then close in one sweep

**Branch `feat/runin-hold`, off master `cba73da8`. NOT merged and NOT minted — this is visible and
the owner judges it first.**

The run-in began closing on the frame the endgame window opened, so the first seconds were a crawl:
about **3.6 s of lead-in at roughly 95 px/s of picture flow**, below the rate at which anything reads
as movement. The owner's rule is the opposite shape — open far enough that the line sits well in
frame, **hold that**, then close **once**.

---

## What was built

**The opening is untouched.** The run-in still engages where it always did and opens as far as the
line requires. Holding is free with respect to the promise it exists for: **the held shot is the
widest the run-in ever asks for**, so the line stays in frame trivially.

**The bound is held at its opening value** — the ceiling captured on the engagement frame — and
released only at the moment from which one steady close arrives at the crossing.

**The anchor travels on the same sweep.** Holding the shot while the leader walked back across the
frame would be two moves at once, which is the shape `_beginRunInGlide` already records emptying the
frame. `_runInSweepU()` drives both.

## The derived release moment, with the arithmetic once

The sweep is the existing **`runInOpenMs` (1250)** — the owner's stated 1–1.5 s. No key was added;
**the hold is simply whatever is left of the window before the release**, which is why it is derived
rather than configured.

```
rate       =  (progress now − progress at engagement) / (now − engaged at)
remaining  =  (1 − progress now) / rate
RELEASE WHEN  remaining ≤ runInOpenMs
```

Both halves are things the run-in already knows: **the distance still to run** — `1 − progress`, in
the very measure `_runInProgressOf` is written in — and **the span the shot must close**.

**The sweep is parameterised by PROGRESS, not by wall clock**, and that is what makes the landing
exact rather than approximate: `u = 1` when `progress = 1` **by construction**, so the bound reaches
the live geometric value precisely at the crossing and the state's own shot is what remains. A
wall-clock sweep would land early or late by whatever the pace estimate was wrong by — and landing
**late** would leave this term still binding at the crossing, which is the one thing the design may
not do. It also cannot stand still or reverse, because `_runInProgress` is already clamped monotone.

## Measured, ten tracks

| track | window (s) | hold (s) | sweep (s) | hold % |
| --- | ---: | ---: | ---: | ---: |
| city-circuit | 7.38 | 6.20 | 1.18 | 84% |
| dirt-oval | 8.40 | 7.17 | 1.23 | 85% |
| garden-path | 6.37 | 6.37 | — | 100% |
| ice-track | 7.07 | 5.83 | 1.23 | 83% |
| luger-hill | 5.97 | 4.77 | 1.20 | 80% |
| mountainstreet | 6.68 | 5.38 | 1.30 | 81% |
| river-run | 5.95 | 4.82 | 1.13 | 81% |
| searound | 5.60 | 4.32 | 1.28 | 77% |
| seatrack | 6.28 | 5.02 | 1.27 | 80% |
| space-sprint | 5.80 | 4.67 | 1.13 | 80% |

**Hold 77–85% of the window; sweep 1.13–1.30 s against the 1250 ms key.**

**The short-window compression fired 0 of 10 times.** The rule is built and tested, but on the
shipped tracks the window is always long enough for a full sweep.

**garden-path holds its whole window and never sweeps** — its race does not reach the line inside the
harness's 200 s ceiling, which is a known limitation of the harness (`docs/fingerprints.json` records
the same thing about the camera fingerprint), not a product state.

## Two wrong turns, recorded so they are not repeated

**Both release estimators I rejected were fine. The measurement was wrong.**

The first used the whole-race average pace (`_scheduleNextOverview`'s idiom); the second a per-frame
instantaneous rate. Both appeared to release **5–7× too early**, producing 5.7–9.3 s sweeps — most of
the crawl still there under a new name. I diagnosed "the field decelerates into the finish", then
"progress is convex", and both diagnoses were invented to explain an artefact.

**The artefact:** my measurement took the crossing to be the first frame with `progress >= 1`.
Progress asymptotes to **0.999 and never reaches 1**, so the script never saw a crossing and silently
fell back to the end of the race — counting the entire post-crossing ending as sweep. The crossing is
the **last frame the run-in composes**. With that fixed, the very first estimator released at progress
0.829 against an ideal of 0.821.

**The lesson: a 5× disagreement between an arithmetic derivation and a measurement is a reason to
doubt the measurement first.** I changed the implementation twice before checking the instrument.

## One real bug, caught by the existing tests

Interpolating on `_lineCeiling`'s `Infinity` gives `Infinity + (Infinity − Infinity) × u` = **NaN**,
which reached `cam.zoom` and took **21 existing tests** down with it — including the plain
*"update() returns {zoom, offsetX, offsetY} with finite values"*. Non-finite means "no ceiling from
me" and is now returned unchanged. Without that suite this would have shipped as a black screen.

## What must still be true, and is

| requirement | evidence |
| --- | --- |
| line in frame, threshold → crossing, unbroken | held shot is the widest the run-in asks for; `check-runin-frame` **PASS** |
| crossing = the state's own shot, no seam | `u = 1` at progress 1 by construction; pinned by a test |
| photo finish keeps framing + slow motion; CENTRED does not move | mirroring 0.5 gives 0.5; pinned by a test |
| `check-runin-frame` green | **0 empty frames** on luger-hill and searound; camera still pointed at the race |
| no state decision moved | tracking-lag frame counts **identical to the digit** |

## Fingerprints — measured, none minted

```
$ node scripts/engine-reach.mjs --check client/src/modules/camera/CameraDirector.js \
      client/src/modules/camera/CameraDirector.test.js
ENGINE REACH: none of 2 path(s) can reach the race engine.        (exit 1)
```

| role | recorded | measured on `f760fa38` | |
| --- | --- | --- | --- |
| CAMERA | `ff2bc42af377b5cf` | **`bca27102de40518b`** | moved — that is the point |
| RENDER | `0e04fa4a5e9c3b85` | **`3a5268aac86f665d`** | moved — the sampler does see the closing window |
| WORLD | `dc4647be0f55ebdb` | not run | cannot move — outside the engine's closure |
| WORLD-OFF | `854018ee5d3d83e1` | not run | same |

**Nothing is minted and `docs/fingerprints.json` is untouched.**

## The tracking lag was RE-MEASURED, not re-stamped

`CameraDirector.js` **is** in `tracking-lag.mjs`'s closure — unlike the two Minimap blocks that
legitimately re-stamped without re-running — so the seven-minute measurement was taken.

**Every frame count is identical to the digit** (9406 / 605 / 17788 / 7789 / 4303 / 1865), which is
the proof no state decision moved anywhere. The movement is entirely in the **tails of the endgame
states**:

| state | median | p95 |
| --- | --- | --- |
| PHOTO_FINISH | 5.33 → 5.44 | **26.85 → 33.94** |
| LEAD_CHANGE | 4.55 → 4.57 | **22.17 → 31.33** |
| BATTLE_ZOOM | 5.70 → 5.72 | 10.55 → 10.99 |
| LEADER_ZOOM | 4.05 → 4.05 | 9.32 → 9.49 |
| OVERVIEW | 2.65 → 2.65 | 16.00 → 16.00 |
| COMEBACK_ZOOM | 2.44 → 1.15 | 15.57 → 15.57 |

**Medians are flat; the tails rose.** That is the arithmetic of the change rather than a regression:
the same total travel now happens in about a fifth of the time, so during the sweep the camera trails
its subject further, and at no other time does it trail differently. **If the tails read as sloppy on
screen, the lever is the sweep's length (`runInOpenMs`), not the hold.** COMEBACK_ZOOM's median fell
on 605 frames — the smallest sample on the page and one that has swung before; not read as an
improvement.

## Hygiene

| file | before | after |
| --- | ---: | ---: |
| `CameraDirector.js` | 3600 | 3725 |
| `CameraDirector.test.js` | 7395 | 7525 |
| `docs/CAMERA_DIRECTOR.md` | 935 | 968 |

**Removed: nothing, and I checked rather than assumed.** The continuous tightening was not a value or
a helper — it was the *absence* of a hold, so there is no orphan to sweep. `_runInProgress` is still
the run-in's one progress measure (15 references) and is now the input to the sweep rather than the
driver of the anchor directly.

**Extracted:** `_runInSweepU()`, so the anchor's travel and the zoom's close read the same parameter,
and `_runInShouldRelease()`, which carries the derivation in one place.

**Noticed and deliberately left alone:**

1. **The rate inside the sweep is still the existing gradual-rise rule.** The brief says so
   explicitly; this block adds a hold before the sweep and does not redesign the rate within it.
2. **`_runInProgress` never reaches exactly 1** (0.997–0.999 at the last composing frame). Harmless
   for the sweep — `u` is clamped and the ceiling is non-binding by then — but it is what made my
   measurement wrong, and any future script that waits for `>= 1` will hang the same way.
3. **The five new tests drive `_updateRunIn` directly** rather than through `update()`. That is how
   the existing RUNIN-GLIDE-1 tests are written and it keeps them fast, but it means none of them
   exercises the lerp that actually moves the camera.

---

## PROPOSALS

1. **Give the sweep an eye-test at two lengths before settling `runInOpenMs`.** The hold is now
   80% of the window and the whole move is compressed into 1.2 s — which is exactly where the p95
   tails came from. The owner said 1–1.5 s; the difference between 1.25 s and 1.5 s is one config
   value and it is the only remaining taste question in this shape. Worth showing him both rather
   than asking him to imagine the second.

2. **Make `check-runin-frame` assert the HOLD, not only the emptiness.** It proves the camera points
   at the race and that no frame is empty — both of which passed before this change and after it. It
   cannot see that the shot stopped crawling. A third question — *does the bound change during the
   hold?* — is a handful of lines in a guard that already drives the two tracks, and it would pin the
   property this block exists for instead of leaving it to a measurement script in a scratchpad.

3. **Teach the harness that garden-path never finishes.** It is now the third block to record the
   200 s ceiling as an aside. Either raise the ceiling for that track or have the harness say
   "did not reach the line" in its own output, so the next person does not have to rediscover why one
   row of every table looks different.

4. **Record the progress asymptote where a script author will meet it.** `_runInProgress` never
   reaches 1, and waiting for it silently yields the end of the race instead of the crossing. One
   line in `_runInProgressOf`'s doc block — *the crossing is the last frame the run-in composes, not
   `progress >= 1`* — would have saved this block two wrong diagnoses.
