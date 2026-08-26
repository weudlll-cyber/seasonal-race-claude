# RUNIN-ALL-TRACKS-10-1 — ten races on each of the ten tracks, garden-path included

**Date:** 2026-08-26 · **Branch:** `feat/runin-level-set-1` · **MEASURE ONLY** — nothing built,
nothing changed, no key. One new summariser under `scripts/diag/`.

**Read-only, and the omissions are deliberate:** no fingerprints, no browser gate, no client suite.
No product file changed, so all three would be re-measuring a tree they already agree with. **14
cores**, read before launching. Browser path throughout — Quick Test, camera seed derived from the
race seed.

**Size as instructed: 10 tracks × 10 races = 100. No sweep was widened.**

---

## THE TABLE

| track | races | usable | worst CORNER px (seed) | worst ACROSS px (seed) | noticeable |
| --- | --- | --- | --- | --- | --- |
| **garden-path** | 10 | **10** | **13.05** (s4) | **0.28** (s4) | **0** |
| seatrack | 10 | 10 | 14.70 (s10) | 1.40 (s10) | 0 |
| dirt-oval | 10 | 10 | 16.69 (s8) | 0.21 (s10) | 0 |
| searound | 10 | 10 | 16.91 (s4) | 0.46 (s3) | 0 |
| mountainstreet | 10 | 10 | 18.22 (s10) | 1.48 (s6) | 0 |
| luger-hill | 10 | 10 | 20.90 (s7) | 0.14 (s3) | 0 |
| river-run | 10 | 10 | 21.90 (s7) | 0.05 (s6) | 0 |
| ice-track | 10 | 10 | **35.21** (s10) | 1.47 (s10) | 0 |
| city-circuit | 10 | 10 | **35.34** (s1) | 0.04 (s10) | 0 |
| **space-sprint** | 10 | 10 | **66.69** (s2) | 0.40 (s2) | 0 |

**100 of 100 races produced a closing window. Zero empty rows, zero silent zeros.**

**Across-track: worst 1.48 px** (mountainstreet seed 6) against RUNIN-PIVOT-SCOPE-1's 1.33 px on the
nine-track corpus — comparable, and two orders of magnitude below the 59 px this strand started from.
**Noticeable movements: 0 of 100**, by the same rule (>5× that race's own median AND >1% of the
frame) that read 2 before the repair and 0 after on nine tracks.

## GARDEN-PATH, ON ITS OWN LINE

**It engages, it finishes, and it is the calmest track of the ten.**

- **The harness finishes it.** All ten races yielded 233–476 frames of closing phase (1,800 total).
  The 200 s ceiling that made it unmeasurable is gone; the owner's beetle decision is what did that.
- **The run-in engages there.** The level set is live — its rows show membership changing and the
  ceiling binding — so this is a measurement of the run-in, not of a race that never reached it.
- **Worst corner movement 13.05 px on seed 4 — the lowest of all ten tracks**, and its worst
  across-track jump is 0.28 px.

**The gap is closed: the run-in's calm is now proven on ten tracks, not nine.**

## THE UNIT, AND WHAT IT MEANS TO A VIEWER — with one correction

**The figure is SCREEN px on the fixed 1280×720 canvas store, not world px.** The brief called it
world px; it is not, and the distinction matters because the two differ by the zoom. The measurement
is `|Δ camera centre| × effectiveZoom` (the picture sliding) plus `halfFrame × Δ effectiveZoom` (the
picture expanding about its centre, taken at the corner where it is largest) — both already in screen
units. The **world** movement of the camera on these frames is only a few px.

**What reaches his monitor is that store scaled to his window**, so the absolute number is not
literal — but it is directly comparable across races and tracks, which is what it is for. Expressing
it as a fraction of the frame removes even that caveat:

| | corner px | as % of the frame |
| --- | --- | --- |
| space-sprint s2 (worst here) | 66.69 | **5.21%** |
| city-circuit s1 | 35.34 | 2.76% |
| ice-track s10 | 35.21 | 2.75% |
| garden-path s4 (calmest) | 13.05 | 1.02% |

**His calibration, worth recording beside the numbers:** he judged **580 px** a real jolt and **14 px**
unnoticeable. Everything in the ten-track table is nearer the second than the first, and the largest
is under a twentieth of the frame.

## WHAT WOULD HAVE MADE THIS FAIL — AND THREE TRACKS MEET THE CRITERION

The brief said any track far above the ~14 px the nine-track corpus showed is a failure to be named,
not explained away. **Three are: space-sprint (66.69), city-circuit (35.34), ice-track (35.21) — up
to 4.6× the reference figure. He should watch `space-sprint` seed 2.**

Named, and here is what the trace says about them without arguing them away:

- **They are not the level ceiling.** Every one of space-sprint's four largest frames is
  `state → state` with the level set size **unchanged** across it, charged to `OTHER` — not an admit,
  not a release, not a crossover. The zoom term is 54.32 px of the 66.69, so it is the **endgame
  schedule's own closing rate**, a quantity this strand has not touched.
- **They do not stand out from their own race.** All three fail the >5× median half of the
  perceptibility rule, which is why the noticeable count is 0. On a fast track the whole closing
  phase moves quickly, so the largest frame is not a discontinuity against its neighbours.
- **That is an observation, not a dismissal.** Whether 5.21% of the frame in one frame reads as a
  jolt on his monitor is his eye's question, not the instrument's, and the instrument has been wrong
  about exactly this before — the 59 px figure that disagreed with his eye for days.

**So the confirmation is a PASS for what this branch repaired and an OPEN QUESTION on three fast
tracks**, and those two statements should not be blended into one.

## WHAT TEN RACES COULD NOT SUPPORT

Stated rather than glossed, because the size was fixed deliberately:

- **No distributional claim.** Ten races per track gives a worst-of-ten, not a tail. A movement that
  happens on one race in fifty would very likely not appear here at all, and this report cannot say
  it does not exist.
- **One roster, one field size.** All 100 races are 20 racers on each track's own default racer type.
  Nothing here speaks about 40-racer fields, and a racer's name is physics, so a different roster is
  a different race.
- **Seeds 1–10, not a sample.** They are the first ten integers, not drawn at random, so "worst of
  ten seeds" is a fixed set and not an estimate of anything.
- **No frame-rate sweep.** Everything is 60 Hz. RUNIN-PIVOT-SCOPE-1 established the zoom term is
  rate-invariant and the pan term is not; that was not re-checked here.
- **The three fast tracks would need more races to characterise**, and that is exactly the widening
  he ruled out for a confirmation. It belongs to its own block if he wants it.

## SOURCE HYGIENE

No product file touched. `git diff` over `client/` and `server/` is empty.

**Added:** `scripts/diag/runin-track-sweep.mjs`, measure-only, ~120 lines. It computes nothing new —
the corner figure is `runin-camera-motion.mjs`'s and the across figure is `runin-aim-sum.mjs`'s — and
exists for one reason worth stating: **it reports a race that yielded no closing window by name and
marks such a track NO DATA rather than averaging the races that worked.** That silent zero has cost
this project three sweeps, and a confirmation run on a track that had never been measured is exactly
where it would have struck again.

**Noticed and left:** the stale conflict marker in `reports/evolution/INDEX.md`
(`||||||| 5204b10b`) — fifth report to record it, still out of scope.

## CONFORMITY

| asked | delivered |
| --- | --- |
| ten tracks × ten races, no more | 100 races, no widening |
| browser path, camera seed from race seed | `cameraSeedForRace(raceSeed)` on all 100 |
| read the core count first | 14, read before launching |
| corner px, same unit and method as RUNIN-EASED-ADMIT-1 | same metric, same code path; comparable with its 9.73 / 10.05 / 14.41 |
| worst race per track, with seed | in the table |
| across-track against 1.33 px | worst 1.48 px, mountainstreet seed 6 |
| how many races a viewer would notice | 0 of 100 |
| garden-path on its own line | its own section; engages, finishes, calmest of the ten |
| say LOUDLY if it still yields nothing | it yields on all ten; the guard that would have said so is in the summariser |
| state the unit plainly | done — **and corrected**: it is screen px on the fixed 1280×720 store, not world px |
| name any track far above ~14 px, do not explain it away | three named with seeds, attributed, and left open |
| read-only, state the reason | stated at the top |
| report + INDEX same commit, push branch, merge report only | done |

## PROPOSALS

### A — MINE: measure the endgame schedule's own closing rate on the fast tracks
The three outliers are all the schedule, not the level ceiling, and the schedule's rate has never been
measured in corner px. space-sprint seed 2 is the case; 66.69 px in one frame is the number to
explain or accept.

### B — MINE: give the corner metric a per-track expectation instead of one global number
"~14 px" came from a corpus of eight late-step races on five tracks. As a threshold for ten tracks it
flags three that may be perfectly normal for their pace. A per-track median-relative bound would say
"unusual for THIS track", which is what a viewer actually perceives.

### C — MINE: run the eye test on garden-path as well as river-run
It is the one track whose run-in he has never seen and the calmest in the table. If it looks right,
that is the strongest single confirmation available; if it looks wrong, the instrument is missing
something and that is worth knowing before the branch closes.

### D — Fold `runin-track-sweep.mjs` into the run-in's acceptance
Three instruments now exist for one question. One entry point that runs the ten-track confirmation
and prints this table would make "is the run-in still calm" a command rather than a block.

## WHAT OUTLIVES THIS REPORT

The last gap in this strand's evidence is closed: ten tracks, not nine, and garden-path — the track
that could not be measured at all — is the calmest of them. Zero races out of a hundred carry a
movement the strand's own rule calls noticeable. And three fast tracks are named with their seeds as
an open question rather than folded into the average, because the last time an instrument disagreed
with his eye, his eye was right.
