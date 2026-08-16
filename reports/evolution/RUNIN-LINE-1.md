# The run-in — the whole thread, and how it ended

> **READ THIS FIRST.** This file grew across sixteen blocks between 2026-08-16 and 2026-08-17. It is
> append-only by rule, so the sections below are in the order they were written and several of them
> describe things that were reverted the same day. This summary is what survived.

**SHIPPED on 2026-08-17 as `v-ship-runin-hold`, merge `48f954a4`.** The owner judged it on a
production build on 2026-08-17 and accepted it. Three changes: the corridor cap stops overriding the
finish line's own ceiling (RUNIN-LINE-1); the opening shot is held and then closed in one sweep, on a
release derived from the leader's own observed pace rather than a chosen fraction (RUNIN-HOLD-1); and
the leader sits where the owner put him, a little before the centre of frame easing to a little after
it, with RUNIN-AHEAD-1's contradicting forward bound removed (RUNIN-BACK-1). CAMERA moved
`ff2bc42af377b5cf` → `6ae77f12daf23f78` and RENDER `0e04fa4a5e9c3b85` → `a870f5f9e79cb444`, both
minted on the merge. WORLD and WORLD-OFF could not move and were not re-run: no merged file lies
inside `fingerprint-default.mjs`'s declared closure. Defaults were not touched.

## SIX ATTEMPTS AT ONE SENTENCE, AND WHY IT CANNOT BE HAD

The owner asked for a close that is **even** — "zoom in softly, at the speed necessary for that
particular track, but at a UNIFORM speed — one that ought to be calculable". Six shapes were built
for that sentence. Five were reverted, each on a measurement, and each hit a **different** wall:

| block | the shape | what stopped it |
| --- | --- | --- |
| RUNIN-PIN-1 | pin the line and the leader on screen, absorb the gap with zoom | the target-versus-delivered lerp: the camera cannot be commanded to a screen position |
| RUNIN-ANCHOR-1/-2 | make the line the camera's anchor, then give it its own placement value | it works, and it costs the accepted build; no placement value has a solution on ice-track and seatrack |
| RUNIN-RATE-1 | release the hold when a calm, constant rate can still make it | **there is no constant rate in this camera to borrow** — every sibling is a duration or a time constant |
| RUNIN-EVEN-1 | walk the zoom evenly toward `_lineCeiling`, speed = distance ÷ time left | the destination **runs away**: the ceiling rises hyperbolically, the walk catches it and inherits its acceleration. Spread 2.08× → 13.6× |
| RUNIN-EVEN-2 | same walk, toward the active state's own zoom — a stationary destination | fixed the spread (13.6× → 2.27×) and the walk was still **invisible**: `_lineCeiling` bound on a median 91% of closing frames |
| RUNIN-SCHEDULE-1 | schedule the line's PLACE in frame so the resulting zoom is even | the schedule needs the line **outside the frame** on 9 of 9 tracks, up to 2.46× the room ahead |

**The finding, and it is §64 in full.** Keeping the line in frame requires `zoom ≤ room / needed`.
The world distance `needed` falls to zero at the crossing, so that bound rises **hyperbolically**,
while `room` shrinks as the leader travels forward across the frame. **`_lineCeiling` is therefore
not one option among several — it is the boundary of the admissible set, and it is the fastest close
that keeps the promise.** An even close is a chord between two fixed ends; the boundary is convex;
they cross. So while the two ends of the close are fixed, an even close and "the finish line stays in
frame" are incompatible, and no seventh shape changes that. **The only remaining lever is the ends
themselves — open less wide, or cross at a wider shot — and both are the owner's taste rather than
anything derivable.**

**If anyone attempts this again, run `node scripts/diag/runin-line-schedule.mjs` first**: it prices a
proposed close in the line's own units and says whether it is admissible at all, in one run, before a
line of the director is touched.

---

# RUNIN-LINE-1 — the line left the frame, and the term that put it out was not the hold

**Branch `feat/runin-hold`, continued on `86f4ce97`. NOT merged and NOT minted.** The owner judged
the production build on 2026-08-17 and rejected it in three parts. Part 2 — *it closes so far that
the finish line is no longer visible* — is the defect this block repairs. Parts 1 and 3 are pace and
are untouched here; they are measured at the end so he can settle them from figures.

---

## 1. The instrument, and what it deliberately does not reconstruct

`check-runin-frame` was green through the run-in's entire development because **its two questions ask
whether RACERS are on screen.** Nothing in this repository asked whether the LINE was. A guard that
cannot fail on the defect its feature is named after is not guarding that feature.

**Question 3 is now inside that guard, not beside it.** R13: it needs the same anchor (the run-in
window), the same driver, the same projection and the same failure family as the two questions
already there. Its blind list is extended in the guard's own declaration.

**Every number it reports is asked of the product, not derived from a copy of it:**

| what | where it comes from |
| --- | --- |
| the line's world point | `cd._finishLineWorldPoint(st.finishT)` — the **same call** `_lineCeiling` makes to decide the bound |
| world → screen | `cd._proj.toScreen(pt, cd.zoom, cd.offsetX, cd.offsetY)` — projection.js calls it "THE only sanctioned world->screen call", given the zoom and offsets the director **delivered** |
| which term decided the width | `cd._framingProbe.binding` / `.ceilings` — the read-only probe the director already writes |

**The only judgement it adds is the comparison to the canvas rectangle**, which is not a rule the
product owns — it is what "on screen" means. Six blocks here have been costed by a harness that
graded a copy of the rule it was grading, the last of them by 2.4×.

**What it measures is the POINT, not the painted band.** `_lineCeiling` guarantees the finish line's
spine point, so that is what is graded; the checkerboard straddles it and clips earlier. A margin
near zero already means the band is half out. Grading the band would mean reconstructing how it is
drawn, which is the thing above.

**One thing it separates that the first draft did not.** On the first frame of the window the camera
is still in whatever tight shot it was running — up to `cam.zoom` 12.4 on searound — and has only
just been told to open. It is *necessarily* outside until the shot travels; no camera is already
where it is going. Those **approach** frames (46–68, about one second) are counted and printed and
do not fail. The defect is the line going out **again after it has once been in**.

---

## 2. Where the line left, on the branch as it stood

Ten tracks, seed 9, 20 racers, threshold → crossing. Margin in px from the nearest frame edge.

| track | worst | at progress | binding | frames out | series across the window (deciles) |
| --- | ---: | ---: | --- | ---: | --- |
| city-circuit | **−357** | 0.981 | corridor-cap | 117 | 183 183 183 183 183 183 −357 −286 128 |
| dirt-oval | **−608** | 0.979 | corridor-cap | 144 | 149 158 158 158 158 −608 −559 −168 130 |
| ice-track | **−244** | 0.982 | guarantee-after-cap | 72 | 102 102 102 102 −117 −244 −43 164 |
| searound | **−501** | 0.983 | guarantee-after-cap | 89 | 290 290 290 290 −230 −501 −209 82 |
| seatrack | **−415** | 0.983 | guarantee-after-cap | 86 | 182 225 272 299 −143 −415 −129 −181 |
| space-sprint | **−511** | 0.984 | guarantee-after-cap | 120 | 197 242 287 267 −199 −511 −328 −127 |
| luger-hill | −46 | 0.996 | state | 8 | 252 284 318 294 126 63 171 −46 |
| mountainstreet | −130 | 0.995 | state | 15 | 337 340 341 340 259 217 13 −130 |
| river-run | −40 | 0.995 | guarantee | 7 | 249 318 341 339 310 242 178 −40 |
| garden-path | — | — | — | — | **not measured** — the race does not reach the line inside the driver's 200 s ceiling |

**It leaves in PHOTO_FINISH, from progress ~0.976, by up to 608 px, for 72–144 frames — one to two
and a half seconds with the line off the screen.** That is what he saw.

---

## 3. The binding term — named, counted, and proven by control

**Counted, not eyeballed.** Over the 658 lost frames, the distribution of the term that produced the
delivered zoom:

| term | frames | share |
| --- | ---: | ---: |
| `corridor-cap` | 292 | 44% |
| `guarantee-after-cap` | 301 | 46% |
| `line` / `state` / `guarantee` | 65 | 10% |

**593 of 658 — 90% — are the corridor cap's composition.** `_setTargets` computes

```js
guaranteed = Math.min(state, guarantee, company, field, line)   // the run-in's bound is IN here
…then the corridor cap RAISES `guaranteed`, and re-applies ONLY `_ceilings.guarantee`
```

The brief's own reasoning was right and that is why it could not be the answer: the run-in
interpolates from the held ceiling to the live line ceiling, **both of which frame the line**, so it
cannot close tighter than the line allows *on its own*. It was overridden **after** it had decided.

**PROVEN BY CONTROL RATHER THAN BY READING.** With `--no-cap` (`contenderZoom: false`), four of the
six tracks hold the line for the whole window and the rest improve by hundreds of pixels:

| track | cap on | cap off |
| --- | ---: | ---: |
| city-circuit | −357 | **+30 (held)** |
| dirt-oval | −608 | **+3 (held)** |
| ice-track | −244 | **+10 (held)** |
| searound | −501 | **+11 (held)** |
| seatrack | −415 | −210 |
| space-sprint | −511 | −228 |

### It predates the hold

The same instrument, run against **master's** director — the tree with no hold in it at all:

| track | master | this branch |
| --- | ---: | ---: |
| dirt-oval | −613 | −608 |
| space-sprint | −498 | −511 |
| searound | −487 | −501 |
| seatrack | −372 | −415 |
| city-circuit | −388 | −357 |
| ice-track | −268 | −244 |
| mountainstreet | −85 | −130 |
| luger-hill | −35 | −46 |
| river-run | −2 | −40 |

**Same nine tracks, same progress, same terms.** The hold moved these numbers by tens of pixels in
both directions and is not the cause. It was already true before RUNIN-HOLD-1 and nobody could see it.

---

## 4. The repair — the omitted half of a clamp that already existed

```js
if (Number.isFinite(_ceilings.guarantee)) guaranteed = Math.min(guaranteed, _ceilings.guarantee);
if (Number.isFinite(_ceilings.line))      guaranteed = Math.min(guaranteed, _ceilings.line);   // ← new
```

**This is not a floor, a margin or a safety net over the cap.** The contender guarantee is re-applied
after the cap for a reason stated three lines above it in the source: *"if a contender needs more
room than a track width, honouring the cap would cut him."* `_lineCeiling`'s own header calls the
finish line **"a guaranteed SUBJECT of the run-in"**. Same standing, same sentence, same clamp — one
of the two guaranteed subjects had been left out of a re-clamp that existed for the other.

| | before | after |
| --- | ---: | ---: |
| tracks failing question 3 | **6** | **0** |
| overridden frames (line out, shot tighter than the run-in asked) | **593** | **0** |

The repaired arm reproduces the `--no-cap` control **exactly**, which is the check that it removes
the override and nothing else.

### The consequence is bigger than the diff, and it is the thing to know

**The corridor cap no longer moves the shot at all before the crossing: 5019 of 7441 photo-finish
frames → 0.** In every one of those frames `_ceilings.line` was the **argmin** — so the cap was not
adding tightening on top of the tightest constraint, **it was overriding it**. Before the crossing
the two are structurally exclusive; there is no middle setting.

**And the cap's own promise barely notices** (ten tracks × three seeds, `contender-truth`):

| | before | after |
| --- | ---: | ---: |
| contenders NOT WHOLE | 8.8% | **8.7%** |
| cut | 6.3% | 6.1% |
| fully outside | 2.9% | 3.4% |
| empty frames | 28 | **39** |
| crossing shot vs the ordinary one | min 33 / med 97 / mean 84 | **identical** |

A cap that moved the zoom on two thirds of photo-finish frames was buying a tenth of a point of the
metric it exists for. **Whether to keep it at all is the owner's call and nothing was removed.**

---

## 5. The residual, named — and it is not this defect

Five tracks still lose the line late:

| track | frames | worst | when | binding |
| --- | ---: | ---: | ---: | --- |
| space-sprint | 25 | −228 | 0.998 | line / state |
| seatrack | 31 | −210 | 0.997 | line / guarantee |
| mountainstreet | 16 | −131 | 0.995 | line / state |
| luger-hill | 9 | −51 | 0.996 | state / line |
| river-run | 8 | −45 | 0.995 | line / guarantee |

**`state` or `line` binding means the shot is at or WIDER than the run-in asked for.** The zoom is
not the problem — the camera has not arrived. The pan eases toward its target, so on a fast sweep
the leader sits further forward in the delivered frame than the guarantee assumed and the line falls
off the front edge. `_lineCeiling`'s own header already records this effect in its choice of
`innerFramePct` over the company margin.

**So the guard fails on cause, not on size.** A lost frame fails only when the delivered zoom is
**tighter than `_ceilings.line`** — a categorical statement about the composition. A pixel threshold
here is exactly the cap that looks like a guardrail and ends up steering. The trailed frames are
printed with their numbers every run.

**Its lever is the sweep's length, which is the owner's pending pace decision** — see §7, where a
longer sweep shrinks it on every affected track.

---

## 6. Tests, and finding a fixture that was not vacuous

Four tests, in the corridor-cap block where the rule they constrain lives, **fixtures carrying real
geometry** (a 6000 px shape, real points on it) so `_lineCeiling` does its own lookup and
`pointGuarantee` its own projection.

**The work was the fixture.** The block's existing pair sits 66 world px from the line, which makes
the line ceiling *looser* than the cap — so the obvious assertion **passes on an unrepaired
director**. The one used is a narrow 140 px road with the pair ~180 px back: **cap 2.727, line
1.632, contender guarantee 2.154**, so without the repair the delivered zoom is 2.154 — a third
tighter than the line allows.

| test | what breaks if deleted |
| --- | --- |
| the delivered zoom is never tighter than the run-in line ceiling | the defect returns silently; nothing else compares those two numbers |
| the cap is really trying to tighten past the line in this fixture | the test above can pass **vacuously**, and would keep passing after a change that removed the cap entirely |
| the term the probe names is the number it delivered | the probe can name a term that is not the delivered zoom — the ZOOM-PACE-5 defect, now with two re-clamps to get wrong |
| the line ceiling is the tightest term here | the run-in could stop composing in PHOTO_FINISH and the first two would pass with `line` at Infinity, which nothing can exceed |

**Three of the four fail on branch HEAD** with the exact numbers above; the fourth is the
non-vacuity check and passes in both arms by design.

---

## 7. The pace table — three values, measured on the repaired build

`runInOpenMs` moves both of his other two complaints **at once and in opposite directions**: larger
releases EARLIER (shorter hold) and closes SLOWER (longer sweep). Nothing was changed; the key keeps
its shipped value and `defaults.js` is untouched.

| track | 1250 hold / sweep / trail | 1750 hold / sweep / trail | 2250 hold / sweep / trail |
| --- | --- | --- | --- |
| city-circuit | 13.73s / 1.45s / 0 | 13.12s / 2.07s / 0 | 12.52s / 2.67s / 0 |
| dirt-oval | 9.60s / 2.07s / 0 | 8.67s / 3.00s / 0 | 7.58s / 4.08s / 0 |
| ice-track | 7.08s / 2.08s / 0 | 6.02s / 3.15s / 0 | 5.13s / 4.03s / 0 |
| luger-hill | 4.98s / 2.30s / 9 (−51) | 3.95s / 3.33s / 8 (−40) | 3.45s / 3.83s / 8 (−35) |
| mountainstreet | 5.27s / 2.18s / 16 (−131) | 4.20s / 3.25s / 16 (−105) | 3.75s / 3.70s / 16 (−98) |
| river-run | 6.50s / 1.90s / 8 (−45) | 5.57s / 2.83s / 6 (−20) | 4.95s / 3.45s / 4 (−10) |
| searound | 5.92s / 2.18s / 0 | 4.73s / 3.37s / 0 | 4.18s / 3.92s / 0 |
| seatrack | 5.50s / 2.07s / 31 (−210) | 4.37s / 3.20s / 34 (−184) | 3.85s / 3.72s / 34 (−173) |
| space-sprint | 5.12s / 2.17s / 25 (−228) | 4.03s / 3.25s / 27 (−212) | 3.52s / 3.77s / 28 (−205) |
| garden-path | — | — | — |

**Two things this says that adjectives could not.**

1. **A longer sweep also buys back the line.** Every affected track's worst margin improves —
   river-run −45 → −10, luger-hill −51 → −35, mountainstreet −131 → −98. His pace preference and the
   last of the line's visibility are the same decision.
2. **On city-circuit and dirt-oval the hold is not the key's fault.** 13.7 s and 9.6 s at 1250, and
   2250 only takes them to 12.5 s and 7.6 s — the hold there is dominated by how long the window is,
   not by where the release lands. If "the hold lasts too long" is mostly about those two tracks,
   `runInOpenMs` is the wrong lever and the endgame threshold is the right one.

**These durations are wall-clock under slow motion**, which is what he watches. RUNIN-HOLD-1's table
was measured without it and its numbers are not comparable to these.

---

## 8. What must still be true

| requirement | evidence |
| --- | --- |
| line in frame, threshold → crossing | **0 overridden frames on every track**; 4 tracks that failed now hold it with margin to spare; the residual is trailing, printed, and named |
| crossing = the state's own shot, no seam | untouched — `u = 1` at progress 1 by construction; the pinning test still passes |
| the close never stands still, restarts or reverses | untouched — `_runInProgress` is still clamped monotone; the repair adds no time-dependent term |
| photo finish keeps its framing and slow motion | `hudState` untouched; contender-truth's crossing shot **identical** (min 33 / median 97 / mean 84) |
| `check-runin-frame` green | **PASS** — luger-hill 0.24 TW / 0 empty, searound 1.10 TW / 0 empty |
| no state decision moved | tracking lag re-measured in full: **every frame count identical to the digit** |

---

## 9. Fingerprints — measured, none minted

```
$ node scripts/engine-reach.mjs --check \
    client/src/modules/camera/CameraDirector.js \
    client/src/modules/camera/CameraDirector.test.js \
    scripts/check-runin-frame.mjs \
    scripts/diag/binding-census.mjs \
    scripts/diag/runin-pace-table.mjs
ENGINE REACH: none of 5 path(s) can reach the race engine.        (exit 1)
```

| role | recorded in `fingerprints.json` | on this branch before | measured on `9635926f` | |
| --- | --- | --- | --- | --- |
| CAMERA | `ff2bc42af377b5cf` | `bca27102de40518b` | **`6ae77f12daf23f78`** | moved — that is the repair |
| RENDER | `0e04fa4a5e9c3b85` | `3a5268aac86f665d` | **`a870f5f9e79cb444`** | moved — the sampler sees the finish |
| WORLD | `dc4647be0f55ebdb` | — | not run | cannot move — outside the closure |
| WORLD-OFF | `854018ee5d3d83e1` | — | not run | same |

**Nothing is minted and `docs/fingerprints.json` is untouched.** Both hashes were produced twice —
once by hand and once by `npm run verify`'s own fingerprint jobs — and agree.

`npm run verify`: **PASS 17, FAIL 0, SKIP 7** (306 s), `check-runin-frame` among the 17.

---

## 10. Hygiene

| file | before | after |
| --- | ---: | ---: |
| `scripts/check-runin-frame.mjs` | 262 | 504 |
| `client/src/modules/camera/CameraDirector.js` | 3725 | 3760 |
| `client/src/modules/camera/CameraDirector.test.js` | 7525 | 7624 |
| `docs/CAMERA_DIRECTOR.md` | 968 | 989 |
| `scripts/diag/binding-census.mjs` | — | 19 (new) |
| `scripts/diag/runin-pace-table.mjs` | — | 139 (new) |

**Orphaned by this repair: nothing, and it was checked rather than assumed.** The corridor cap's
code, config key, tests and documentation all remain — the cap is now inert *before the crossing*
because the line outranks it there, not because anything was deleted. `contenderZoom`,
`corridorCapArriveMs`, `_corridorWidthCap` and `_corridorCapWeight` are all still live and still
tested.

**Noticed and deliberately left alone:**

1. **`line-after-cap` does not fire.** It exists so a line-clamped frame cannot be misnamed
   `guarantee-after-cap`; a census over 57,366 frames says it never occurs today, and that is
   recorded rather than assumed. Kept for three lines because the alternative is the exact
   misattribution ZOOM-PACE-5 cost three reports.
2. **`garden-path` still never reaches the line** inside the driver's 200 s ceiling. The guard now
   says "not measured" in its own output instead of quietly passing, which is the third block to
   meet this and the first where the harness says so itself.
3. **The approach is one second of line-out on every track** and is excluded by construction. Whether
   a camera that takes a second to bring the line in is acceptable is a taste question nobody has
   asked him.
4. **The `state` term can be tighter than the line ceiling** and legitimately wins the `Math.min`.
   That is by design — "never tighter than the underlying state" — but it means the promise and the
   state's own shot can disagree in the last few frames. It is part of the residual in §5.

---

---

# RUNIN-START-1 — the start, bisected: it predates both, and nothing was changed

**Appended 2026-08-17.** The owner reported that shortly after the start of a dirt-oval Quick Test
(seed 9, OVERVIEW, LAP 1/2) the whole field sits against the RIGHT edge of the canvas with the
leader off screen. The start was never in scope for any run-in work, so the first question was not
*why* but **when**.

## 11. The three frames

`CameraDirector.js` is the ONLY behavioural file that differs across the three commits — checked
first, `git diff --stat … -- client/src` shows it and its test file and nothing else — so swapping
that one file is a faithful bisect. Same track, same seed, same 20-racer Quick Test field, same
elapsed times, `scripts/diag/start-frame-capture.mjs` unchanged between runs.

**dirt-oval, seed 9 — and the three commits are byte-identical on every sampled frame:**

| at ms | hud | zoom | offsetX | field x | leader x | on screen | binding | `ceilings.line` |
| ---: | --- | ---: | ---: | --- | ---: | ---: | --- | --- |
| 500 | OVERVIEW | 7.1480 | −4390 | 208..395 | 395 | 20/20 | field | **Infinity** |
| 1000 | OVERVIEW | 7.2024 | −4285 | 547..781 | 781 | 20/20 | field | **Infinity** |
| 1500 | OVERVIEW | 7.2328 | −4355 | 699..979 | 979 | 20/20 | field | **Infinity** |
| 2000 | OVERVIEW | 7.2933 | −4514 | 815..1122 | 1122 | 20/20 | field | **Infinity** |
| 3000 | OVERVIEW | 7.9388 | −5161 | **1089..1517** | **1517** | **19/20** | state | **Infinity** |
| 5000 | LEADER_ZOOM | 8.4368 | −7132 | 516..1120 | 1120 | 20/20 | state | **Infinity** |
| 8000 | LEADER_ZOOM | 6.7935 | −7090 | 237..740 | 740 | 20/20 | field | **Infinity** |

**`cba73da8` (master) = `86f4ce97` (RUNIN-HOLD-1) = `d769cbd1` (RUNIN-LINE-1), to the digit, in every
column.** A second witness, searound, is identical across all three as well.

**The symptom reproduces exactly as described**: at 3000 ms the leader is at screen x 1517 on a
1280-wide canvas — **237 px off the right edge** — and one racer is out of frame.

### The verdict

**IT PREDATES BOTH.** Neither RUNIN-LINE-1 nor RUNIN-HOLD-1 caused it; the owner had simply never
looked at the start before. **Per the brief, NOTHING was changed on this branch** — no revert, no
fix, no special case. It is an old defect and it gets its own block.

## 12. The term, with numbers

**`_ceilings.line` is `Infinity` on every early frame of every track measured.** The run-in is not
composing, `_runInActive` is false, and the bound this branch's work touches is doing nothing at the
start. That is the hypothesis the brief named as the suspect, and it is ruled out by measurement.

**What DOES place the shot**, read off `_framingProbe` on the dirt-oval frames:

| | 1000 ms | 2000 ms | 2500 ms | 3000 ms |
| --- | ---: | ---: | ---: | ---: |
| `ceilings.state` (the ceremony's held zoom) | 8.460 | 8.460 | 8.460 | 8.460 |
| `ceilings.field` (the ceremony's field guarantee) | **7.121** | **7.567** | **7.958** | 12.894 |
| `ceilings.company` | 27.696 | 22.558 | 21.904 | 19.296 |
| `ceilings.guarantee` | ∞ | ∞ | ∞ | ∞ |
| delivered `guaranteed` | 7.121 | 7.567 | 7.958 | **8.460** |
| binding | field | field | field | **state** |
| anchor, screen x (aimed → afterBias → afterLateral) | 644 → 644 → 644 | 907 → 907 → 907 | 1048 → 1048 → 1048 | **1515 → 1515 → 1515** |

**The width is the ceremony's field guarantee widening with the grid, and then the ceremony's held
zoom.** Neither is steered by anything the run-in owns.

**The anchor is the finding.** It is the pan TARGET, projected with the camera the director actually
delivered — and it walks from 644 (frame centre, correct) to **1515**, which is itself off the
right-hand edge. Neither the forward bias nor the lateral guarantee moves it at any sample. **So the
shot is not mis-aimed: the camera is roughly 875 px behind where it is already trying to be.** The
field accelerates off the grid faster than the delivered pan follows, and the picture recovers by
itself from ~3500 ms as the camera catches up.

**It is systematic on closed tracks and absent on the open one measured:**

| track | worst sampled | on screen |
| --- | --- | ---: |
| dirt-oval | leader 237 px off the right edge at 3000 ms | 19/20 |
| searound | leader 80 px off the right edge at 3000 ms | 19/20 |
| city-circuit | field pinned left, 249..670 at 3000 ms | 18/20 |
| luger-hill (open) | leader 1018, in frame throughout | 20/20 |

## 13. The test, and the one it is not

**One test, `RUNIN-START-1 — the run-in bounds nothing before the endgame window`,** with a fixture
carrying real geometry, driving `update()` rather than `_updateRunIn` — which also closes the gap
RUNIN-HOLD-1's own report recorded, that all five of its tests call the private method and never
exercise the real path.

**If deleted:** the one hypothesis this bisect ruled out could return unnoticed. Should
`_runInWindowOpen` ever admit an early frame, the run-in would bound the START — and the symptom
would be precisely the reported one, because the run-in's job is to open toward a finish line most
of a lap away. **Proven live by sabotage:** with the fixture's `endgameThreshold` dropped to 0.01
the test fails with `expected 0.0853 to be Infinity` at frame 0 — a demand for a shot twenty times
wider than the ceremony's, which is what that failure would look like on screen.

**THE TEST AIMED AT THE ACTUAL CAUSE IS NOT HERE, AND DELIBERATELY.** The cause is unrepaired and
predates all three commits, so such a test would be RED on master and on this branch — a red test in
a green suite is either deleted by the next person or trains everyone to ignore the colour. It
belongs in the block that repairs the start, as its failing-first evidence.

## 14. What must be true at the end

The brief's closing requirement — *the start looks exactly as it did on master* — is met in the
strongest available sense: **the start frames ARE master's frames, digit for digit**, because
nothing was changed. The requirement's other half, *the leader in shot*, is **not** true on this
branch and is not true on master either; that is the old defect, and the three-way table is the
evidence that this branch neither caused it nor can repair it without opening its own block.

| role | branch before this block | measured on the final commit | |
| --- | --- | --- | --- |
| CAMERA | `6ae77f12daf23f78` | **`6ae77f12daf23f78`** | **unmoved** |
| RENDER | `a870f5f9e79cb444` | **`a870f5f9e79cb444`** | **unmoved** |
| WORLD | `dc4647be0f55ebdb` | not run | cannot move |
| WORLD-OFF | `854018ee5d3d83e1` | not run | same |

**Both hashes unchanged is the arithmetic proof that this block altered no behaviour** — a test
file, a diagnostic script and a report cannot reach the camera. `engine-reach --check` over the
three changed paths: *"none of 3 path(s) can reach the race engine."* **Nothing minted.**

---

---

# RUNIN-AHEAD-1 — the frame stops at the finish line

**Appended 2026-08-17.** The owner accepted the run-in's shape at `endgameThreshold` 0.95 and
rejected what the frame shows: *while the shot closes it reaches well past the line onto empty track
beyond it, and then comes back. There is nothing to see beyond the line — that room should go to the
racers behind the leader instead.*

## 15. Measured before anything was changed

`scripts/diag/runin-forward-reach.mjs` stands on the finish line's screen position, looks along the
leader's heading, and asks the product's own `roomFromPointAlong` how far it is to the frame's edge.
Positive = screen pixels of already-finished track the frame is still carrying. It reconstructs
nothing: the line comes from `_finishLineWorldPoint`, the projection from `_proj.toScreen` with the
DELIVERED zoom and offsets, the heading from `_headingScreen`.

**The complaint is real and large — 220 to 755 px of a 1280-wide canvas**, at the sampled quarter,
half and three-quarter points of the composing window.

## 16. The rule, and the three things that make it safe

**The bound is on the ANCHOR, not on the zoom.** Every other run-in term is a zoom ceiling; using
one here would take the room away from everybody rather than give it to the field, which is the
opposite of the instruction. So:

```
frac ≥ 1 − (1 − innerFramePct)/2 − d / extent
```

`d` is how far the line is ahead **along the heading**; `extent` is how far the frame reaches along
that heading in world px. Push the leader that far forward and every pixel the look ahead would have
spent past the line is behind him instead.

**No new key and no new fraction.** `d` is `_finishLineWorldPoint`, the same point `_lineCeiling`
and question 3 read. `innerFramePct` is the region this director already calls "in frame" for a
guaranteed subject — and `_lineCeiling` already sizes the zoom against that same boundary. **This is
the one judgement call in the block and it is recorded as one:** using the outer frame edge would
put the line exactly ON the border, where the tracking lag alone takes it out and question 3 goes
red. Stopping at the boundary the director already owns is not a margin added beyond the line.

**Three properties make it safe, and each is a line of the composition:**

| | why |
| --- | --- |
| `Math.max` | the cap only ever pushes the leader FORWARD, which is the same as giving the room behind him to the field. It cannot pull him back, so it cannot fight or reverse the sweep. |
| `× (1 − u)` | **the mechanism the brief asked me to name: `_runInSweepU()`**, the run-in's own ease. Applied raw the bound would still bind AT the crossing — `d → 0` there, so it would demand ~0.975 and pin the leader against the front edge exactly where the state's shot is due. Faded on the sweep it is full strength through the hold, where the overshoot is, and **gone by construction at `u = 1`**. |
| FORWARD states only | a CENTRED state places its subject in the middle by its own rule; there is no forward look to reclaim and the room past the line is the symmetric other half of the room behind. Clamping there would move a framing this design promises not to touch — and *"a CENTRED state still does not move"* is pinned by a RUNIN-HOLD-1 test, **which is how I found this: it went red on the first attempt.** |

Computed in `_updateRunIn`, before `_lineCeiling` and before every guarantee, because they all
measure their room from the anchor this answer places. A clamp applied later at the pan — where the
final zoom is known — would leave every guarantee sizing the shot for an anchor that is not where
the pan puts it, the exact gap CAMERA-ANCHOR-TRUTH-1 exists to close. The zoom it needs is
`this.zoom`, the one on screen: the zoom for *this* frame is decided from ceilings that read this
answer, so the circle is broken with the value the viewer is actually looking at, one frame old and
moving by a lerp, which cannot introduce a step.

## 17. Before and after, per track

Sampled at the phase opening and three points through the close. **`beyond`** = screen px past the
line; **`in`** = racers on the canvas; the state running is what decides whether the cap applies.

| track | open | 25% before → after | 50% before → after | 75% before → after |
| --- | --- | --- | --- | --- |
| luger-hill | 0 px, 5 in | 407 → **206**, 16 → **20** | 633 → **201**, 16 → **20** | 443 → 443, 17 (PHOTO_FINISH) |
| river-run | 0 px, 11 in | 463 → **213**, 20 | 680 → **201**, 20 | 577 → 577, 20 (PHOTO_FINISH) |
| mountainstreet | 0 px, 13 in | 396 → **166**, 20 | 584 → **188**, 19 → **20** | 436 → 436, 20 (PHOTO_FINISH) |
| space-sprint | 0 px, 4 in | 220 → **106**, 16 → **20** | 333 → **107**, 16 → **20** | 257 → 257, 19 (PHOTO_FINISH) |
| seatrack | 0 px, 6 in | 273 → **0**, 20 | 326 → **96**, 18 → **20** | 299 → 299, 20 (PHOTO_FINISH) |
| ice-track | 0 px, 17 in | 105 → **43**, 20 | 157 → 157, 20 | 521 → 521, 20 (PHOTO_FINISH) |
| searound | 0 px, 6 in | 554 → 554, 20 | 755 → **641**, 20 | 634 → 634, 20 (PHOTO_FINISH) |
| dirt-oval | 0 px, 5 in | 640 → 640, 20 | 630 → **627**, 20 | 628 → 628, 20 (PHOTO_FINISH) |
| city-circuit | 0 px, 7 in | 290 → 290, 20 | 656 → 656, 20 | 639 → 639, 20 (PHOTO_FINISH) |

**IT DID WHAT IT WAS ASKED, AND MORE RACERS ARE IN SHOT — but only where there were racers missing
to gain.** Six of the nine tracks already showed 20 of 20 at these points, so there was no headroom.
On the four that were short, every one of them is now full: **luger-hill 16 → 20, space-sprint
16 → 20, seatrack 18 → 20, mountainstreet 19 → 20.** The overshoot falls by half to two thirds on
six tracks (luger-hill 633 → 201, river-run 680 → 201, mountainstreet 584 → 188).

**Three things it does NOT do, stated plainly rather than left for him to notice:**

1. **The 75% column is unchanged everywhere, and that is by design.** By then every track is in
   PHOTO_FINISH, which is CENTRED — the cap does not apply, and the photo finish keeps its own
   framing exactly as the brief requires.
2. **city-circuit and dirt-oval barely move.** The cap is live on those frames but does not bind:
   the line is far enough ahead **along the heading** that the frame is not spending its forward
   look past it, even though the line's screen position has canvas beyond it. On a curving closed
   oval those two are not the same question, and the bound answers the first one — the one the
   instruction is about.
3. **The line takes longer to first enter frame on two tracks** — ice-track 1.0 s → 2.0 s, seatrack
   1.1 s → 2.5 s. That is the direct cost of holding the leader further forward: the frame's leading
   edge starts further back, so the line arrives later during the opening approach. It is inside the
   window `check-runin-frame` already excludes as "the camera is still travelling", and question 3
   stays green, but it is a real trade and it is the one to watch on his eye-test.

## 18. What must still be true

| requirement | evidence |
| --- | --- |
| line in frame, opening → crossing | `check-runin-frame` **PASS** — 0 overridden frames on all ten tracks |
| crossing = the state's own shot, no seam | the fade reaches 0 at `u = 1` by construction; pinned by a test comparing against a director with `runInShot` OFF — same anchor, same zoom |
| photo finish keeps its framing and slow motion | CENTRED states are excluded; PHOTO_FINISH tracking lag **identical to the digit** (4.81 / 37.36) |
| contender framing untouched | `contenderZoom` path unmodified; the corridor-cap tests all pass |
| the close never stands still, restarts or reverses | `Math.max` is one-way and the test walks 40 frames asserting no step > 0.12 and no backward move |
| questions 1 and 2 green | luger-hill 0.24 TW / 0 empty; searound 1.40 TW / 0 empty (limit 2) |

**Tracking lag re-measured in full, and exactly the two states that should have moved did:**
LEADER_ZOOM median 4.05 → 4.00, p95 9.49 → **9.03**; LEAD_CHANGE median 4.57 → 4.54, p95
31.33 → **29.00** — both FORWARD states, both **improved**, because a leader held further forward is
closer to where the pan is already heading. PHOTO_FINISH, BATTLE_ZOOM, COMEBACK_ZOOM and OVERVIEW
identical to the digit; **every frame count identical**, so no state decision moved.

## 19. The Dev-screen step

`Endgame Focus Threshold` stepped in 5%, which cannot express 0.93 or 0.96 at all — coarser than the
decision it exists for, and he has just settled the shape at 0.95. **Now 1%.** Range and clamping
untouched: the handler still refuses anything outside 0.5–1.0.

## 20. Fingerprints and hygiene

```
$ node scripts/engine-reach.mjs --check \
    client/src/modules/camera/CameraDirector.js \
    client/src/modules/camera/CameraDirector.test.js \
    client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx \
    scripts/diag/runin-forward-reach.mjs
ENGINE REACH: none of 4 path(s) can reach the race engine.        (exit 1)
```

| role | before this block | measured on the final commit | |
| --- | --- | --- | --- |
| CAMERA | `6ae77f12daf23f78` | **`c2f3e97277041fed`** | moved — the anchor moved |
| RENDER | `a870f5f9e79cb444` | **`28893c9595196026`** | moved — with it |
| WORLD | `dc4647be0f55ebdb` | not run | cannot move |
| WORLD-OFF | `854018ee5d3d83e1` | not run | same |

**Nothing minted.**

| file | before | after |
| --- | ---: | ---: |
| `client/src/modules/camera/CameraDirector.js` | 3760 | 3869 |
| `client/src/modules/camera/CameraDirector.test.js` | 7696 | 7821 |
| `scripts/diag/runin-forward-reach.mjs` | — | 127 (new) |

**Orphaned by this change: nothing, and it was checked.** No value, helper or branch became
unreachable — the cap is an additional term in a fraction that was already computed every frame. The
5% step it replaces was a literal with no other reader.

**Noticed and deliberately left alone:**

1. **`d` is a straight-line projection along the heading, not an arc distance.** On a closed oval
   whose line is most of a lap away those differ, which is exactly why city-circuit and dirt-oval
   see no change. Making it an arc distance would need the shape's arc-length, which is a bigger
   change than the instruction asked for.
2. **The approach got longer on two tracks** (§17.3). Untouched because shortening it means moving
   the anchor back, which is the thing this block was asked to stop doing.

---

---

# RUNIN-PIN-1 — BUILT, MEASURED, AND REVERTED. The pin cannot be done from where the run-in stands.

**Appended 2026-08-17. Nothing shipped: `CameraDirector.js` is untouched at `f405b988`.** The
instrument stays, because it is what will settle the next attempt.

The owner's rule: open until the leader and the line are both visible, let the leader settle onto
his forward placement, then STOP TRAVELLING — the line holds its screen position, the leader holds
his, and the closing world gap is absorbed by zoom alone.

## 21. The baseline, measured first

`scripts/diag/runin-pin-drift.mjs` measures the two drifts the rule is about, from the leader
settling (the director's own signal: the opening glide coming to rest) to the crossing. Drift is the
**spread** of each screen position, not its endpoints — a position that wanders out and back is not
holding still, and an endpoint difference would score that as zero.

| track | frames | line drift | leader drift | in shot | zoom monotone |
| --- | ---: | ---: | ---: | ---: | --- |
| city-circuit | 777 | 253 px | 646 px | 18.8 | yes |
| dirt-oval | 596 | 595 | 806 | 18.2 | yes |
| ice-track | 446 | 847 | 871 | 18.2 | **NO** |
| luger-hill | 303 | 593 | 644 | 15.5 | yes |
| mountainstreet | 343 | 718 | 664 | 17.4 | yes |
| river-run | 340 | 668 | 593 | 17.7 | **NO** |
| searound | 352 | 590 | 674 | 16.7 | yes |
| seatrack | 350 | 586 | 518 | 16.2 | yes |
| space-sprint | 333 | 737 | 829 | 16.4 | yes |

**The complaint is real: 253–847 px of line travel after the leader has settled.** Note also that
the zoom is already non-monotone on two tracks today, before anything was changed.

## 22. What was built

The geometry first, because it bounds what can be promised: **the camera has three degrees of
freedom** (one zoom, two offsets) and **pinning two screen points is four constraints**. Both can
hold exactly only while the screen direction between them is constant — true on a straight, false
through a curve.

The implementation followed the brief's "no new numbers" exactly, and it collapsed further than
expected:

- **The run-in stopped touching the anchor at all.** If the leader is pinned at *the placement the
  current framing already gives him*, then the mirror, the hold, the progress-swept release and
  RUNIN-AHEAD-1's forward cap are all ways of moving something that no longer moves.
  `_forwardFracNow` lost its run-in branch entirely; four fields and three helpers went with it.
- **The zoom became a law rather than an interpolation.** Screen separation is *linear* in cam.zoom,
  so holding it fixed is one division: `zoom = pinnedSeparation / hypot(dx·axisX, dy·axisY)`. The
  numerator is read off the running director on the frame the leader settles. No fraction, no
  margin, no duration was needed.
- **The crossing stayed seamless by the existing mechanism**: as the gap closes the law demands ever
  more zoom, stops being the smallest term in `Math.min`, and the state's own shot is what remains.

## 23. It did not work, and the measurement says so plainly

| track | line drift before → after | leader drift | in shot | zoom monotone |
| --- | --- | --- | --- | --- |
| city-circuit | 253 → **713** | 646 → 725 | 18.8 → **15.4** | yes → **NO** |
| dirt-oval | 595 → 723 | 806 → 716 | 18.2 → **14.9** | yes |
| ice-track | 847 → 788 | 871 → 842 | 18.2 → 17.2 | NO |
| luger-hill | 593 → **453** | 644 → 519 | 15.5 → **12.6** | yes → **NO** |
| mountainstreet | 718 → 639 | 664 → 776 | 17.4 → 16.5 | yes → **NO** |
| river-run | 668 → 592 | 593 → **336** | 17.7 → 14.9 | NO |
| searound | 590 → 609 | 674 → 491 | 16.7 → **12.8** | yes → **NO** |
| seatrack | 586 → 456 | 518 → 361 | 16.2 → 14.2 | yes → **NO** |
| space-sprint | 737 → 511 | 829 → 653 | 16.4 → **12.7** | yes |

**The line still drifts 453–788 px. It is worse on three tracks and better on none that matters.
The zoom went from non-monotone on two tracks to non-monotone on seven. And FEWER racers are in
shot on every single track** — the opposite of what the last two blocks bought.

## 24. Why — and my first explanation was wrong

My hypothesis was that the pin law, being only one ceiling among five in `Math.min`, was being
overruled. **The instrument refutes that.** The binding term over the pinned stretch:

| track | binding while pinned |
| --- | --- |
| seatrack | `line` **100%** |
| ice-track | `line` 97% · state 3% |
| space-sprint | `line` 95% · state 5% |
| city-circuit | `line` 94% · state 6% |
| mountainstreet | `line` 93% · state 7% |
| dirt-oval, luger-hill | `line` 92% · state 8% |
| searound | `line` 88% · state 13% |
| river-run | `line` 83% · guarantee 17% |

**The law was in charge on 83–100% of frames and the line moved anyway.** So the reason is not
composition. It is this:

> **The pin is a statement about the DELIVERED frame, and every mechanism the run-in owns speaks to
> the TARGET.**

`_updateRunIn` returns a target zoom; `_setTrackTargets` resolves a target offset; the camera then
*lerps* toward both. The law computes the zoom that would hold the separation **at this frame's**
world gap — but the camera only arrives there several frames later, by which time the gap has closed
further. It is permanently chasing a value that has already moved. That also explains the
monotonicity collapse: as the gap goes to zero the law's target rises hyperbolically, and a
first-order lag chasing a hyperbola overshoots and corrects.

**This is a structural finding, not a tuning failure.** Delivering the contract needs the run-in to
write the delivered camera during the pinned stretch — to become the authority over the shot rather
than one ceiling among five. That collides directly with two things the brief holds fixed: *the
run-in owns the framing, not the state slot*, and *at the crossing the picture is the state's own
shot, bit for bit*. It is a redesign of how the endgame camera composes, not an increment.

## 25. What was reverted, and what was kept

**Reverted:** every line of `CameraDirector.js`. The branch is back at `f405b988` — the shape the
owner accepted, with RUNIN-AHEAD-1's forward bound intact and doing its measured work.

**The forward bound is NOT subsumed**, and that question is now answered with numbers rather than by
argument: it removes 200–480 px of overshoot and puts four short tracks back to 20-of-20 in shot
(§17), and the pin that would have replaced it does not hold. It stays.

**`runInOpenMs` still has work.** It paces the opening glide (`_beginRunInGlide`) and the hold and
sweep that the pin would have removed. Since nothing was removed, nothing about it changed.

**Kept:** `scripts/diag/runin-pin-drift.mjs`, and it is the useful output of this block. It measures
the exact property the contract is about, on the delivered camera, and it is what should be run
first by whoever attempts the pin again — before writing any of it.

---

---

# RUNIN-ANCHOR-1 — BUILT, MEASURED, REVERTED. It works, and it costs the previous block.

**Appended 2026-08-17. Nothing shipped: `CameraDirector.js` is untouched at `ac1754c2`.** This
block is a NEGATIVE result with a positive finding inside it, and the finding is worth more than the
code was.

The owner's rule: *"The camera no longer travels along the track, the zoom only keeps closing. That
the racer moves forward towards the finish line while it does is exactly what we want."* The
premise was right and RUNIN-PIN-1's diagnosis held: change the SUBJECT, not the law. A stationary
target cannot be chased.

## 26. What was built

The anchor stops being the leader and becomes `_finishLineWorldPoint`, eased over `runInOpenMs` from
the engagement frame on the same smoothstep `_beginRunInGlide` runs the opening on — one move, one
ease, no new number. The line takes the state's own forward placement, so it sits ahead of centre
with the track behind it filling the rest. `_forwardFracNow` lost its run-in branch entirely: the
mirror, the hold, the swept release and RUNIN-AHEAD-1's forward cap all existed to travel a subject
through the frame, and the anchor no longer travels.

## 27. The first attempt emptied the frame, and the reason is the finding

| track | in shot, today | in shot, first attempt |
| --- | ---: | ---: |
| seatrack | 16.2 | **0.1** |
| city-circuit | 18.8 | **0.9** |
| luger-hill | 15.5 | **1.4** |
| river-run | 17.7 | 1.7 |

**Anchoring on the line silently switched off the only bound that keeps the leader and the line in
one frame.** `_lineCeiling` sizes the shot so the LINE fits beside the anchor — and when the line
*is* the anchor that distance is zero, so the term goes quiet. The binding column showed it
immediately: `state` 47–87%, i.e. the shot had closed to the state's own zoom while the field was
still most of a lap behind the line.

**The repair is not a correction term — it is the bound keeping its meaning.** *"These two are in
one frame"* does not care which of the two the camera is anchored on, so the far point becomes the
LEADER once the anchor has become the line. One line, and the frame refilled.

## 28. With that, it works — and it is better than today on most of what matters

| track | line drift | leader drift | in shot | zoom monotone |
| --- | --- | --- | --- | --- |
| city-circuit | 253 → **343** | 646 → **494** | 18.8 → 18.6 | yes |
| dirt-oval | 595 → **367** | 806 → **530** | 18.2 → 18.0 | yes |
| ice-track | 847 → **512** | 871 → **650** | 18.2 → 17.9 | **NO → yes** |
| luger-hill | 593 → **418** | 644 → **416** | 15.5 → 15.3 | yes |
| mountainstreet | 718 → **535** | 664 → **433** | 17.4 → 17.1 | yes |
| river-run | 668 → **495** | 593 → 684 | 17.7 → 17.0 | NO |
| searound | 590 → **297** | 674 → **414** | 16.7 → 16.2 | yes |
| seatrack | 586 → **745** | 518 → 766 | 16.2 → 16.1 | yes |
| space-sprint | 737 → **660** | 829 → **753** | 16.4 → 15.9 | yes |

**Line drift improves on seven of nine** (searound 590 → 297, ice-track 847 → 512), leader drift on
seven, racers in shot are unchanged to within half a racer, and the zoom becomes monotone on one
more track. The camera genuinely travels less.

**But it does not deliver the contract.** The line still moves 297–745 px. It is the anchor and it
still drifts, because the anchor is placed at a fraction *along the heading* — and on a closed track
the heading rotates through the endgame, so a fixed fraction is a moving screen point. The lateral
guarantee and `resolveCamera`'s world-bounds clamp move it further. **The residual is heading
rotation, not chasing** — a different obstacle from RUNIN-PIN-1's, and the next one to attack.

## 29. Why it was reverted anyway: it costs RUNIN-AHEAD-1

**The frame carries MORE finished track than the build he accepted**, because the line at the
state's forward placement leaves the whole remaining fraction of the frame beyond it:

| track | accepted build | with the anchor swap |
| --- | ---: | ---: |
| ice-track | 157 px | **916** |
| seatrack | 96 | **288** |
| mountainstreet | 188 | **415** |
| searound | 641 | 733 |
| space-sprint | 107 | **58** (better) |

RUNIN-AHEAD-1's forward cap is **dead** with the swap in — it never fires — exactly as the brief
predicted. But what replaces it is worse at the job it was doing. Trading a measured, accepted gain
for a partial delivery of a different one is not mine to decide, and the honest state to leave the
branch in is the one he accepted.

**Also unfinished, and this is the plain reason rather than the polite one:** nine director tests
pin the deleted mechanisms and would all have needed rewriting, and the block still owed a
tracking-lag re-measure, both fingerprints, `npm run verify` and five new tests. I ran out of budget
to do that to the standard the earlier blocks were held to. **A branch back at a known state beats a
branch with a half-finished redesign and nine red tests.**

## 30. What is kept

Nothing in `client/`. CAMERA `c2f3e97277041fed` and RENDER `28893c9595196026` are unmoved. The two
instruments already on the branch did all the work here and needed no changes — which is the first
time in this sequence that a block's measurement cost nothing to run.

**`runInOpenMs` still has work** (the opening glide, the hold, the release), because nothing was
removed.

---

---

# RUNIN-ANCHOR-2 — the placement works. The acceptance test still fails, on ice-track, at every value.

**Appended 2026-08-17. Nothing shipped: the branch is at `fd3a8de5` and CAMERA / RENDER are
unmoved.** This block was asked to finish the anchor swap by giving the line its own placement
value. **The placement was built and it does exactly what it was supposed to do — and it is not
enough.** The reason is measured, not argued, and it is a different obstacle again.

## 31. What was built, and it is the smallest version of the ask

- Both RUNIN-ANCHOR-1 edits re-applied unchanged: the anchor becomes `_finishLineWorldPoint`, and
  `_lineCeiling` keeps its meaning by taking the LEADER as its far point once the line is the anchor.
- **`runInLinePlacement`**, a config key of its own, plumbed through `computeTimingFromConfig` with
  the same clamp shape every other placement there has (0.5–0.98). Two subjects placed for two
  different reasons need two values — `leaderForwardFrac` puts a RACER where the road ahead of him
  is visible; the line needs the opposite, because there is nothing to see beyond it.
- The placement travels with the anchor on the anchor's own ease, so the contents change hands once.

**It plumbs correctly and it is monotone in the right direction** — mountainstreet's finished track
in frame, at the 25% and 50% points of the window:

| placement | 0.70 | 0.80 | 0.86 | 0.92 |
| --- | ---: | ---: | ---: | ---: |
| mountainstreet | 357 px | 213 | **132** | 50 |

**At 0.86 mountainstreet beats the accepted build's 188 px.** The mechanism is sound.

## 32. Why it still fails — two walls, both measured

**ICE-TRACK DOES NOT RESPOND TO THE PLACEMENT AT ALL.**

| placement | 0.70 | 0.80 | 0.86 | 0.92 |
| --- | ---: | ---: | ---: | ---: |
| ice-track | 916 px | 916 | 916 | 916 |

Against **157 px** in the build he accepted. The number does not move by one pixel across the whole
range, which means the placement is not what decides it there. The reading that fits: on ice-track
the run-in opens to a **world-sized frame** — the line is most of a lap away at the threshold — and
`resolveCamera`'s world-bounds clamp then centres the frame on the WORLD, overriding any placement.
`check-runin-frame`'s own header records that geometry from RUNIN-OWNS-1: *a world-sized frame
cannot be positioned freely, because the clamp centres it on the world.*

**AND PUSHING THE PLACEMENT FURTHER EMPTIES THE FRAME.** At 0.92, seatrack reads **0 racers in
shot** at the 25% point: the line is so far forward that the field falls off the back edge. That is
the same failure the first RUNIN-ANCHOR-1 attempt had, arriving from the other direction.

**So the window between "enough forward to beat the accepted build" and "so far forward the frame
empties" does not contain a value that works on all ten tracks.** At the best candidate (0.86) the
finished track carried is BETTER than the accepted build on 2 tracks, roughly equal on 1, and WORSE
on 6 — including ice-track by a factor of six.

## 33. The verdict, and why the branch is back at `fd3a8de5`

The block's own acceptance criterion — *pick the placement at which the finished track carried is no
worse than the build he accepted* — **has no solution.** There is no value of `runInLinePlacement`
that satisfies it, because on ice-track the placement is not the term that decides, and on seatrack
the range that would help empties the frame.

Shipping the anchor swap anyway would trade a measured, accepted gain (RUNIN-AHEAD-1: ice-track
157 px, mountainstreet 188 px) for a partial delivery of a different one — the same trade this
report already refused once, in §29. It is refused again for the same reason, and this time with the
sweep that proves no value fixes it.

**What that leaves is a sharper problem than the one this block started with**, and it is now
named: the obstacle is no longer the placement or the anchor, it is `resolveCamera`'s world-bounds
clamp on tracks where the run-in opens to a world-sized frame. That is the thing to attack next, and
it is not a camera-framing question at all — it is a question about how wide the run-in is allowed
to open in the first place.

## 34. What this cost and what it did not

**Reverted:** `CameraDirector.js`, `cameraTimingComputation.js`, `defaults.js`, and the sweep flag
on `runin-forward-reach.mjs`. CAMERA `c2f3e97277041fed` and RENDER `28893c9595196026` are unmoved,
which is the arithmetic proof the revert is complete. The client suite is green at 859 camera tests.

**Not done, and named rather than glossed:** the nine director tests were not rewritten, the
tracking lag was not re-measured and no Dev control was added — all three were work for a change
that is not shipping. `runInOpenMs` keeps all its current work, because nothing was removed.

**The honest summary of three attempts at this rule:** RUNIN-PIN-1 failed on target-versus-delivered
lag; RUNIN-ANCHOR-1 failed on cost to the accepted build; RUNIN-ANCHOR-2 shows the cost cannot be
bought off with the one number it was allowed to introduce. Each attempt named a different wall, and
the walls have been getting more specific. **The next one should start from §32's finding rather
than from the rule.**

---

---

# WHY-SO-WIDE-1 — the width was never the world-bounds clamp. It is the run-in's own line ceiling.

**Appended 2026-08-17. MEASUREMENT ONLY — nothing in `client/` was touched, so no fingerprint can
move.** The owner's screenshot contradicted RUNIN-ANCHOR-2's recorded explanation, and he was right.

`scripts/diag/width-authority.mjs` reports every term as **the width it asks for**, frame by frame,
with the winner marked — reading `_framingProbe.ceilings`, `.corridorCap`, `.binding` and
`_resolveProbe` rather than reconstructing anything. A ceiling on zoom is a floor on width, so the
widest demand wins the `Math.min`.

## 35. Who wins, over the whole stretch

| track | frames | binding term | `resolveCamera` adapted the zoom |
| --- | ---: | --- | --- |
| ice-track | 551 | **`line` 96%**, state 4% | **22 of 551** |
| city-circuit | 912 | **`line` 97%**, state 3% | **0 of 912** |
| seatrack | 455 | **`line` 95%**, guarantee 5% | **0 of 455** |
| mountainstreet | 448 | **`line` 92%**, state 8% | **0 of 448** |

## 36. The owner's frame, in plain numbers

ice-track, first settled frame with the line in shot, 78 250 ms, LEADER_ZOOM:

| | |
| --- | ---: |
| leader → line, along the track | **874 world px** |
| leader → LAST racer, along the track | **642 world px** |
| the frame is | **2668 world px** wide — **87%** of a 3072 px world |
| state asks for | 338 px |
| company asks for | 156 px |
| guarantee / field / corridor cap | ask for nothing |
| **line asks for** | **2668 px** |
| `resolveCamera` | requested 2668 → resolved 2668, **adapted false** |

**87%, not 100%.** A substantial part of the course is outside the frame, exactly as his screenshot
shows — which is what falsified the recorded explanation in the first place.

## 37. The three answers

**1. Is the world-bounds clamp binding at that moment? NO.** It did not adapt the zoom on that frame
or on any frame of seatrack, mountainstreet or city-circuit, and on only 22 of 551 ice-track frames.
(The `clamped` flag that is true on many frames is the PAN being held inside the world, not the
width.) **RUNIN-ANCHOR-2's explanation was wrong, and every proposal derived from it — including
"attack the world-sized frame" and the `endgameThreshold` sweep — was aimed at a term that is not
deciding anything.** The real term is the **line ceiling**, `_lineCeiling`, the run-in's own bound.

**2. Does the run-in influence the picture while that term binds? It IS the picture.** The width is
not something happening to the run-in — it is the run-in's own demand, on 92–97% of frames. And the
arithmetic is elementary: the line sits 874 px ahead, the anchor placement leaves only about a third
of the frame ahead of the leader, and 874 ÷ ~0.33 ≈ 2600. **The shot is wide because the run-in is
asked to hold a line ~900 px ahead while placing its subject two thirds of the way forward.**

**3. Is it the same on the other broken tracks? Yes — checked, not assumed.** `line` binds 95% on
seatrack and 92% on mountainstreet, with the world-bounds clamp adapting the zoom on **zero** frames
of either. seatrack's frame is 46% of its world and mountainstreet's is 28% — neither is anywhere
near world-sized.

**And the one sentence, unsoftened: the last three blocks were aimed at the wrong term.** PIN-1,
ANCHOR-1 and ANCHOR-2 all tried to change where the camera points and how it travels, while the
thing setting the width — on every track they broke on — was the run-in's own line ceiling, and none
of them changed what it asks for.

## 38. The number that makes it concrete

On all four tracks the leader is **further from the line than from the last racer**, or close to it:

| track | leader → line | leader → last | frame width |
| --- | ---: | ---: | ---: |
| ice-track | 874 px | 642 px | 2668 px |
| city-circuit | 1137 | 832 | 3072 (world-capped) |
| seatrack | 598 | 780 | 2837 |
| mountainstreet | 687 | 612 | 1705 |

**The whole field spans 600–830 px and the shot is 1700–3100 px wide.** The extra width is not
buying a single racer — it is reaching for the line.

---

---

# RUNIN-BACK-1 — the leader is back where the owner put him, and it narrowed nothing

**Appended 2026-08-17. SHIPPED on the branch.** RUNIN-AHEAD-1's forward bound is removed and the
owner's specified travel is restored. **It is worse on most measurable dimensions than the build he
accepted, and it narrowed the shot on exactly zero tracks** — the opposite of what the previous
block's finding implied. Both of those are stated up front because the count is what he decides on.

## 39. The change, and which code now carries the placement

**One deletion.** `_runInForwardCapOf` and the composition that read it are gone; nothing replaced
them. The travel is carried by **`_forwardFracNow`'s two surviving lines** — RUNIN-GLIDE-1's mirror,
untouched since it was written:

```js
const back = 1 - tableFrac;                     // a little BEFORE centre: 0.34
return back + (tableFrac - back) * this._runInSweepU();   // easing to 0.66, a little AFTER
```

No new key, no fraction, no margin, no duration. `frameExtentAlong` and `roomFromPointAlong` are
still imported because the forward bias and the lateral guarantee use them; nothing else was orphaned.

## 40. Ten tracks, against the accepted build `cc2af320`

**THE WIDTH DID NOT MOVE ON ANY TRACK.** At the owner's frame — first settled frame with the line in
shot — the delivered width is identical, to the pixel, on all nine finishing tracks:

| | city-circuit | dirt-oval | ice-track | luger-hill | mountainstreet | river-run | searound | seatrack | space-sprint |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| accepted | 3072 | 2984 | 2668 | 1851 | 1705 | 2196 | 2854 | 2837 | 3905 |
| now | 3072 | 2984 | 2668 | 1851 | 1705 | 2196 | 2854 | 2837 | 3905 |

**The reason, and it corrects WHY-SO-WIDE-1's implication:** at that frame the sweep has not
released, so `u = 0` and the leader is already at the mirror — **0.34, behind centre, with two
thirds of the frame ahead of him** — in BOTH arms. The cap was not binding there. WHY-SO-WIDE-1 read
the 2668 px as the consequence of "only about a third of the frame ahead of him"; that was the
state's placement (0.66), not the placement in force during the run-in. **The 2668 px is what
`_lineCeiling` asks for with the leader ALREADY two thirds back, and removing the cap does not
touch it.**

### The four dimensions, per track

| track | finished track in frame | racers in shot | line drift | zoom monotone | verdict |
| --- | --- | --- | --- | --- | --- |
| city-circuit | 290/656 → 290/656 | 18.8 → 18.8 | 253 → 253 | yes | **equal** |
| dirt-oval | 640/627 → 640/630 | 18.2 → 18.2 | 595 → 628 | yes | **worse** |
| ice-track | 43/157 → **105**/157 | 18.2 → 18.2 | 847 → **756** | yes | **mixed** |
| luger-hill | 206/201 → **407/633** | 15.5 → **13.7** | 593 → **718** | yes | **worse** |
| mountainstreet | 166/188 → **396/584** | 17.4 → **17.1** | 718 → **796** | yes | **worse** |
| river-run | 213/201 → **463/680** | 17.7 → 17.7 | 668 → **799** | NO → NO | **worse** |
| searound | 554/641 → 554/**755** | 16.7 → 16.7 | 590 → **657** | yes | **worse** |
| seatrack | 0/96 → **273/326** | 16.2 → **15.4** | 586 → 589 | yes | **worse** |
| space-sprint | 106/107 → **220/333** | 16.4 → **14.4** | 737 → **795** | yes | **worse** |

**THE COUNT: 1 equal, 1 mixed, 7 worse, 0 better.** Zoom monotonicity improves by one track
(ice-track recovers; river-run stays non-monotone, as it was before RUNIN-AHEAD-1 too).

**The finished track in frame is worse on seven of nine, by 100–430 px**, and that is exactly what
the removed bound was buying. The brief anticipated this and asked whether the leader sitting behind
centre would put the line near the front edge by itself. **It does not** — that is the finding it
asked for. The line's position in frame is set by `_lineCeiling`'s zoom demand, not by where the
leader sits, so moving the leader back does not pull the line forward.

**Racers in shot falls on four tracks**, worst on space-sprint (16.4 → 14.4) and luger-hill
(15.5 → 13.7).

## 41. What must still be true, and is

| requirement | evidence |
| --- | --- |
| line in frame, opening → crossing | `check-runin-frame` **PASS**, all three questions, 0 overridden frames on ten tracks |
| the zoom only closes | monotone on 8 of 9; river-run was already non-monotone before RUNIN-AHEAD-1 |
| the crossing shot is unchanged | the sweep lands `u = 1` at the line by construction, and the test comparing against a `runInShot: false` director passes |
| after the crossing nothing changes | same test — same anchor, same zoom |
| a CENTRED state does not move | mirroring 0.5 gives 0.5; pinned by its own test |
| questions 1 and 2 | luger-hill 0.24 TW / 0 empty, searound 1.10 TW / 0 empty |

## 42. Tests — each of the four accounted for

| RUNIN-AHEAD-1 test | what happened |
| --- | --- |
| *the anchor is pushed forward so the frame stops at the line* | **replaced** by the owner's requirement: the leader starts before centre and ends after it |
| *the cap is really trying to tighten past the line* | **deleted, and the report says why** — it was a non-vacuity check for a bound that no longer exists. Rewriting it would have produced something that only looks like a test. |
| *the anchor moves smoothly and only ever forward while the cap is live* | **moved** to the restored travel: same walk, same thresholds, now over `_runInSweepU` |
| *a CENTRED state is untouched by the cap* | **moved** to "a CENTRED state does not travel at all" |

**The new test, and what breaks if it is deleted:** nothing in the suite would state the travel the
owner specified — and RUNIN-AHEAD-1 removed it *without a single test going red*, which is how it
reached a production build he then rejected. It asserts the opening is before centre, the arrival is
after it, and that **the two ends are the state's own placement and its mirror — no third number**,
so a future change that introduces one is refused. It needs **two drives**, because one fixture
cannot sit at both ends: the release moment is derived from the observed pace, so a fixture that
never approaches the line never sweeps. The first version of this test discovered that about itself.

## 43. Fingerprints, and the cleanest proof this block has

```
$ node scripts/engine-reach.mjs --check \
    client/src/modules/camera/CameraDirector.js \
    client/src/modules/camera/CameraDirector.test.js \
    scripts/diag/width-authority.mjs
ENGINE REACH: none of 3 path(s) can reach the race engine.        (exit 1)
```

| role | accepted build | measured on the final commit | |
| --- | --- | --- | --- |
| CAMERA | `c2f3e97277041fed` | **`6ae77f12daf23f78`** | moved |
| RENDER | `28893c9595196026` | **`a870f5f9e79cb444`** | moved |
| WORLD / WORLD-OFF | unchanged | not run | cannot move |

**Both are the values from BEFORE RUNIN-AHEAD-1, bit for bit.** A removal that returns two 64-bit
hashes to their earlier values is a removal that left nothing behind — stronger than any diff
review. The tracking lag says the same: LEADER_ZOOM 4.00 → 4.05 / 9.03 → 9.49 and LEAD_CHANGE
4.54 → 4.57 / 29.00 → 31.33, back to the RUNIN-HOLD-1 table digit for digit, with every frame count
identical. **Nothing minted.**

## 44. Hygiene

| file | before | after |
| --- | ---: | ---: |
| `CameraDirector.js` | 3869 | **3774** (−95) |
| `CameraDirector.test.js` | 7821 | 7844 |

**Orphaned: nothing.** `frameExtentAlong` and `roomFromPointAlong` remain in use by the forward bias
and the lateral guarantee; no config key, helper or branch became unreachable. `runInOpenMs` keeps
all of its work — it paces the opening glide and derives the release.

---

---

# RUNIN-CEILING-1 — the surplus is the HOLD, it is the owner's own instruction, and nothing was changed

**Appended 2026-08-17. NOTHING SHIPPED — no line of `client/` was touched, so no fingerprint can
move.** Step 2's third rule applies: the surplus is intentional and something depends on it, so it
stays. This is the complete answer that rule describes.

## 45. Term by term, at the owner's frame

`scripts/diag/line-ceiling-terms.mjs` calls the product's own `anchorScreenPoint` and
`roomFromPointAlong` with the live director's inputs and prints the intermediates `pointGuarantee`
computes and never exposes. ice-track, seed 9, 77 550 ms, LEADER_ZOOM:

| | |
| --- | --- |
| anchor (world) | (400.0, 883.0) |
| line (world) | (873.0, 252.0) |
| world gap | dx 473.0, dy −631.0 — **788.6 px straight**, 874 along the arc |
| projection | axisX 0.41667, axisY 0.35173 · world 3072 × 2047 |
| frame | 1280 × 720 · `innerFramePct` **0.7** |
| forward frac | **0.3400** — the mirror, two thirds of the frame ahead |
| anchor on screen | (738.4, 475.2) |
| `sx = dx·axisX` | 197.07 |
| `sy = dy·axisY` | −221.96 |
| `needed = hypot` | **296.82** |
| room to the X sides | 526.48 |
| room to the Y sides | **491.06** ← the min, so the vertical sides decide |
| `ceiling = room/needed` | **1.65438** cam.zoom → **1857 world px wide** |
| **`_runInHoldCeiling`** | **1.15134** → **2668 world px wide** |
| sweep `u` | **0.0000** — still holding |
| delivered zoom | **1.15134** — equal to the held ceiling, to five decimals |

## 46. WHERE THE FACTOR COMES FROM, in one sentence

**The run-in is not asking for 2668 px — it is asking for what the line needed at ENGAGEMENT, held
constant by RUNIN-HOLD-1 while the leader closes, and the live demand at the owner's frame is 1857.**

The dump makes it visible without any arithmetic: over 700 ms the `line` column sits at **2668,
2668, 2668…** while the delivered width climbs 675 → 1273 toward it. A constant demand from a term
whose input is a shrinking distance is a held value, and `_runInHoldCeiling` is exactly that.

### The three candidates the brief named, checked rather than assumed

| candidate | verdict |
| --- | --- |
| a margin or padding term | **No.** `innerFramePct` 0.7 costs 1.29×, not 2×, and it is the same margin every guaranteed subject gets. |
| the **second axis** inflating the near one | **No.** The Y sides decide on ice-track — but by **1.07×** (491 vs 526). On luger-hill, searound and mountainstreet the **X** sides decide, so the axis is not even consistent. |
| the line treated as an extent, or the fraction applied twice | **No.** `sx`/`sy` are a single point difference and `forwardFrac` appears once, in `anchorScreenPoint`. |
| a projection/heading mismatch | **No.** `needed` and `room` are both measured along the same screen direction — `roomFromPointAlong` takes that direction as its argument. |

### And on four tracks, one open, one closed, and the narrowest frame

| track | live demand | **held** | surplus | which axis decided |
| --- | ---: | ---: | ---: | --- |
| ice-track (closed) | 1857 px | **2668** | **1.44×** | vertical, by 1.07 |
| luger-hill (open) | 1432 | **1851** | **1.29×** | horizontal |
| searound (closed) | 2277 | **2854** | **1.25×** | horizontal |
| mountainstreet (narrowest) | 1365 | **1705** | **1.25×** | horizontal |

**On every one of them the delivered zoom equals `_runInHoldCeiling` to five decimals, and `u` is 0.**
The surplus is 1.25–1.44× at that frame — not 2 — and it **grows through the hold**, because it is
zero at engagement by construction and widens as the line approaches.

## 47. Why it is not removed

**RUNIN-HOLD-1 built this at the owner's explicit instruction**, recorded in its own report: *"open
far enough that the line sits well in frame, HOLD that, then close once."* The held ceiling IS that
instruction expressed as a number. Removing it would restore the crawl he rejected on 2026-08-16 —
the run-in closing from the frame the window opens, measured then at 3.6 s of lead-in at ~95 px/s of
picture flow, "below the rate at which anything reads as movement".

So Step 2's third rule decides it: **intentional, depended upon, do not remove.** The whole
mechanism it feeds is the hold-then-sweep shape he asked for, and `runInOpenMs` is the key that
paces it.

**Also worth correcting: the factor of two was an over-estimate.** RUNIN-BACK-1 compared the held
width against a straight-line estimate of what the gap needed; the live ceiling is 1857 px, so the
surplus at that frame is 1.44×. The premise was directionally right and numerically loose.

## 48. What was changed: nothing

No `client/` file was touched. `git status --short client/` returns zero lines, so **CAMERA
`6ae77f12daf23f78` and RENDER `a870f5f9e79cb444` cannot move**, the tracking-lag stamp cannot go
stale, and there is nothing to mint. `engine-reach --check` over the two added paths:
*"none of 2 path(s) can reach the race engine."*

**The served build stays at `9123b312`'s behaviour** — the owner's placement, restored — which is
what rule 2 of the handover order prescribes when Step 2 ends in "do not remove".

## 49. Noticed and deliberately left alone

1. **The hold's surplus grows with the approach.** It is 1.0× at engagement and 1.25–1.44× by the
   settled frame. Nobody has ever put a number on that before, and it is the honest way to describe
   what the hold costs: not "twice as wide as needed" but "as wide as it needed to be a second ago".
2. **`innerFramePct` is 0.7 for the line**, i.e. a 15% margin on each side. It is the subject's own
   safe region and `_lineCeiling` takes it deliberately (RUNIN-MINIMAL-1 records choosing it over the
   company margin). It costs 1.29× on its own and is a legitimate lever if the owner ever wants one.
3. **The deciding axis is not stable across tracks** — vertical on ice-track, horizontal on the other
   three. Any future rule that assumes one of them will be wrong on some track.

---

---

# RUNIN-RATE-1 — built, measured, REVERTED: this camera has no rate to borrow

**Appended 2026-08-17. Nothing shipped — `CameraDirector.js` is untouched at `0a55107e`, so CAMERA
`6ae77f12daf23f78` and RENDER `a870f5f9e79cb444` cannot move.** The rule was implemented exactly as
specified, measured, and it did not deliver. **The brief's own escape clause is the answer: nothing
in this camera can honestly supply a constant zoom RATE.**

## 50. What was built, and which sibling supplied the rate

The release rule changed from *"remaining time ≤ `runInOpenMs`"* to *"remaining time ≤ the time the
close needs at a calm rate"*, with

```
needed = |ln(live / held)| / rate            // log units, because scale is perceived logarithmically
rate   = |ln(zoomAfterOpening / zoomAtEngagement)| / runInOpenMs
```

**The sibling is the run-in's OWN OPENING** — the one zoom movement in this camera whose pace the
owner has explicitly accepted (*"open the shot until the leader and the finish line are both visible
— unchanged, that part is accepted"*), measured on this race, on this track, moments earlier. It
imports nothing from a different kind of move and invents no number. The compressed case needed no
branch: `remaining ≤ needed` is already true on the first frame that can decide, so a short window
closes immediately by construction.

## 51. It did not work, and the reason is worth more than the code

**The test the brief set: is the delivered closing rate now similar across tracks?**

| track | rate BEFORE (tip) | rate AFTER | hold before → after | close before → after |
| --- | ---: | ---: | --- | --- |
| mountainstreet | 0.952 | 1.057 | 5.27 → 5.48 s | 2.18 → 1.97 s |
| luger-hill | 0.938 | 1.146 | 4.98 → 5.40 | 2.30 → 1.88 |
| ice-track | 1.291 | 1.161 | 7.08 → 6.85 | 2.08 → 2.32 |
| river-run | 1.190 | 1.330 | 6.50 → 6.70 | 1.90 → 1.70 |
| city-circuit | 1.953 | 1.360 | 13.73 → 13.10 | 1.45 → 2.08 |
| dirt-oval | 1.358 | 1.490 | 9.60 → 9.78 | 2.07 → 1.88 |
| seatrack | 1.233 | 1.575 | 5.50 → 5.95 | 2.07 → 1.62 |
| searound | 1.265 | 1.593 | 5.92 → 6.37 | 2.18 → 1.73 |
| space-sprint | 1.324 | 2.040 | 5.12 → 5.88 | 2.17 → 1.40 |

**RATE SPREAD: 2.08× before, 1.93× after.** That is not consistency; it is the same spread with the
extremes swapped. **The change failed its own acceptance test**, and by the brief's rule that is
what this section has to say.

### Why — and it is a trap worth recording

**THE OPENING IS ITSELF DURATION-GOVERNED.** `_beginRunInGlide` sets
`_glideDurationActiveMs = runInOpenMs`, so the opening covers *whatever span this track needs* in a
fixed 1250 ms. Its rate is therefore `span / 1250` — which varies across tracks by **exactly the
same factor the spans do**, the >2× RUNIN-CEILING-1 measured.

So deriving the close's rate from the opening's rate **reproduces the very variation it was meant to
remove**. I replaced "the same duration on every track" with "the same duration as this track's own
opening", which is the same fixed-duration shape wearing the coat the brief warned about — and I did
not see it until the measurement said so.

### And there is no other sibling

Every pace this camera owns is a DURATION or a TIME CONSTANT: `runInOpenMs`,
`finishOverviewZoomOutDurationMs`, `corridorCapArriveMs`, `battleSlowmoFadeDuration`, and the lerp's
`trackingTC` / `entryTC`. **All of them mean "cover whatever gap exists in this long"** — which is
the fixed-duration shape restated, not a rate. A time constant looks like a rate but is not one: it
covers a fixed FRACTION of a remaining gap per unit time, so a bigger gap still moves faster.

**There is no constant zoom rate anywhere in this camera to borrow.** Per the brief — *"If nothing in
the camera can honestly supply it, STOP and report that rather than inventing a number"* — that is
the finding, and the code was reverted rather than shipped with a rate I would have had to make up.

## 52. What `runInOpenMs` still does — unchanged

It paces the opening glide and, through `_runInShouldRelease`, sets the release. **Both jobs are
intact because nothing was kept.** The proposal below is about what should happen to it, not this
block's doing.

## 53. State

`CameraDirector.js` untouched; camera suite 859 green; CAMERA and RENDER unmoved, so nothing to
mint and the tracking-lag stamp cannot go stale. `engine-reach --check` over the added script and
the report: *"none of 2 path(s) can reach the race engine."* **The served build keeps the owner's
placement, restored — `0a55107e`'s behaviour.**

Kept: `scripts/diag/runin-close-rate.mjs`. It is the instrument that failed this change honestly and
it is what any future attempt should be judged by first.

---

---

# RUNIN-EVEN-1 — the speed IS calculable. The destination is not.

**Appended 2026-08-17. Nothing shipped — `CameraDirector.js` untouched at `def84d01`, so CAMERA
`6ae77f12daf23f78` and RENDER `a870f5f9e79cb444` cannot move.** The design in the brief was right
about the thing that defeated the last two attempts, and it fails on a different one, which this
report names exactly.

## 54. What was built — no hold, no release, no number

The whole hold-and-release machinery went: `_runInHoldCeiling`, `_runInReleaseProgress`,
`_runInSweepU`, `_runInShouldRelease`. In their place, once the opening glide is done:

```
speed = |ln(live / current)| / remainingMs        // computed once: distance ÷ time left
current *= exp(sign · min(|span|, speed · dt))    // walked every frame, in log space
```

**Log space because uniform must mean uniform to the eye** — a scale change is perceived as a ratio.
**No new key**: the acceleration limit for the photo-finish case is a first-order approach with
`runInOpenMs` as its time constant, the key that already paces the opening, so "raised slowly"
borrows the pace the shot opens at. The anchor's travel went back to raw `_runInProgress`, since the
sweep it used to ride existed only to skip the hold; **the owner's placement and its mirror are the
two ends, untouched.**

## 55. It is not uniform, and the profile says so

The instantaneous rate through the close, sampled at 20% / 50% / 80% (log-units per second):

| track | **delivered** | **the run-in's own target** | first perceptible |
| --- | --- | --- | ---: |
| city-circuit | 0.06 / 0.22 / 0.55 | 0.00 / 0.11 / 0.34 | **6.70 s** |
| ice-track | 0.02 / 0.74 / 0.49 | 0.02 / 0.10 / 0.53 | 1.92 s |
| luger-hill | 0.30 / 2.32 / 0.64 | 0.15 / 0.57 / 0.70 | 1.22 s |
| searound | 0.02 / 3.28 / 0.75 | 0.03 / 0.48 / 0.79 | 1.65 s |
| mountainstreet | 0.01 / 2.27 / 0.66 | — | 2.07 s |
| space-sprint | 0.01 / 2.18 / 0.63 | — | 1.93 s |

**A flat profile reads 0.30 / 0.30 / 0.30. None of these do**, and the cross-track rate spread went
from 2.08× to **13.6×** — worse than what it replaced. By the brief's own rule that is the answer,
reported instead of the averages that would have hidden it.

**And the flat foot is not gone**: city-circuit still takes 6.70 s to become perceptible, against the
~3.6 s the old shape took.

## 56. Where it breaks, and it is neither of the previous two walls

**The target is not flat either** — 0.00 / 0.11 / 0.34 on city-circuit. So this is *not* the
target-versus-delivered lag that defeated RUNIN-PIN-1. The run-in's own demand is already
accelerating before the camera ever sees it.

**The cause: the close is walking toward a MOVING destination.** `live` is `_lineCeiling`, and it
rises hyperbolically as the leader nears the line. The walk catches it early — `step` is
`min(|span|, speed·dt)`, so once the gap is smaller than one step the ceiling simply **becomes**
`live` and from then on inherits *its* profile, which is anything but uniform.

**So "one even speed" and "arrive exactly at what the line requires" are in conflict**, and no
choice of speed resolves it: a speed low enough never to catch `live` would not arrive, and any
speed that arrives then follows. The brief's design fixes the speed; the thing it moves toward is
what is not fixed.

**The speed itself was never the problem.** Computing it as distance ÷ time-remaining works exactly
as the brief said it would — it needs no constant, no key and no borrowed sibling, which is what
RUNIN-RATE-1 could not find. That half of the design is sound and should be kept for whoever tries
next.

## 57. State, and what `runInOpenMs` still does

`CameraDirector.js` untouched; camera suite 859 green; CAMERA and RENDER unmoved, nothing to mint,
the tracking-lag stamp cannot go stale. `engine-reach --check` over the changed diagnostic and the
report: *"none of 2 path(s) can reach the race engine."* The served build keeps `def84d01`'s
behaviour — the owner's placement, restored.

**`runInOpenMs` keeps both its jobs** — it paces the opening glide and sets the release — because
nothing was kept. Had the change shipped it would have kept only the first.

---

## PROPOSALS

1. **Retire `contenderZoom`, or scope it to after the crossing.** It moves the zoom on **0** frames
   before the crossing now, and its own metric barely moved when it stopped (8.8% → 8.7%). What
   remains is a config key, two helpers, a weight curve, an arrive-duration and a paragraph of
   documentation for a term that no longer decides anything in the window it was built for. Either
   it should act where it still can — after the first finisher, where `_ceilings.line` is Infinity —
   or it should go. **Measuring it before deciding costs one run of `contender-truth --seeds=…`**;
   deciding without measuring is how it got here.

2. **Give the endgame threshold the same treatment `runInOpenMs` just got.** §7 shows the hold on
   city-circuit is 13.7 s and that the sweep key barely touches it, because the window length is
   what dominates. `endgameThreshold` is a single existing key, and a table of hold-vs-threshold on
   the two long tracks would tell him whether his "the hold lasts too long" is one decision or two.

3. **Make question 3 report the PAINTED band, not only the spine point.** It grades the point the
   director guarantees, so a margin of +3 px on dirt-oval passes while the checkerboard is already
   half off the screen. The band's extent is drawn from geometry the renderer owns; exposing that
   extent once — the way `_framingProbe` exposes the framing inputs — would let the guard grade what
   the owner actually looks at without reconstructing how it is drawn.

4. **Teach the tracking-lag stamp to accept "measured on the tree that became this commit".** Two
   blocks in a row have now needed a one-line follow-up commit whose entire content is correcting a
   SHA that could not exist when the stamp was written. The guard is right to demand the
   measurement; it should not force a second commit to record it honestly.

5. **The start needs its own block, and the measurement for it already exists.** The anchor walks to
   screen x 1515 while the shot stays where the ceremony left it, so the question is not "which
   ceiling is wrong" — every ceiling is behaving — but **how fast the delivered pan is allowed to
   follow its own target off the grid**. `scripts/diag/start-frame-capture.mjs` is the instrument;
   it needs no changes, only pointing at the pan's time constant. Two things worth measuring before
   touching anything: whether the ceremony's held zoom should retire on the GUN or on a geometric
   condition the way the field guarantee does, and whether the effect is really absent on open
   tracks or merely smaller because luger-hill's world is short.

23. **WALK TO A PREDICTED DESTINATION, NOT TO THE LIVE ONE — this is the next thing to build.**
    RUNIN-EVEN-1 found that the speed is calculable exactly as he said, and that the close still is
    not uniform because it walks toward `_lineCeiling`, which accelerates. **Give it a fixed
    destination instead: the ACTIVE STATE'S OWN ZOOM**, which is what the shot becomes at the
    crossing anyway and is known every frame. Then the close is a straight log-line from the opened
    shot to a stationary end point, at one computed speed, and it is uniform by construction. The
    line stays protected because `_lineCeiling` remains in `_setTargets`'s `Math.min` — it just
    stops being the thing the walk chases. **That is a small change to `_updateRunIn` alone and both
    profile instruments already exist to judge it.**

24. **Judge it on the profile, never on the average.** Every attempt in this sequence looked
    acceptable on averages and failed on the shape: RUNIN-EVEN-1's delivered rate averages a
    perfectly reasonable 0.077 ln/s on city-circuit while running 0.06 then 0.55. `runin-close-rate`
    now prints the 20/50/80 profile for both the target and the delivered zoom, and **a flat profile
    reads three equal numbers** — that is the acceptance test for anything in this area from now on.

21. **THE RATE IS ONE NUMBER AND IT IS HIS, exactly as the placement was.** *(Superseded by
    RUNIN-EVEN-1: the speed does NOT need to be a number he sets — computing it as distance over
    time-remaining works. The obstacle moved to the destination, see proposal 23.)* RUNIN-RATE-1 proved by
    measurement that no existing pace in this camera is a rate — they are all durations or time
    constants. So a rate-governed close needs a rate, and the honest way to get one is the way the
    leader's placement was got: he sets it once. **The measurement even suggests the range**: the
    delivered close today runs at 0.94-1.95 log-units per second, so "about 1.2" is the middle of
    what he has already been watching and accepting. Replacing `runInOpenMs` with a
    `runInCloseRate` — same Dev control slot, 0.1 steps — turns the hold's length into a consequence
    exactly as he asked, and it is ONE value rather than the ten this block would otherwise need.

22. **If he does not want to set a rate, tell him plainly that the hold cannot be consequence-shaped.**
    Everything in this camera says "cover the gap in this long". A hold whose length falls out of a
    calm rate needs the rate to exist first; without one the length IS the setting, however it is
    dressed. That is not a limitation of the run-in — it is what the camera's whole vocabulary is
    made of, and it is better said once than rediscovered a fourth time.

19. **The one lever left that nobody has priced: shorten the HOLD, do not weaken the ceiling.**
    *(Partly answered by RUNIN-RATE-1: shortening the hold is exactly what a rate-governed release
    does, and it was built. The obstacle is not the hold, it is that there is no rate to derive.)*
    RUNIN-CEILING-1 shows the surplus is the held ceiling ageing — 1.0x at engagement, 1.25-1.44x by
    the settled frame — so the size of the surplus is exactly *how long the hold lasts*. That is
    `runInOpenMs` (larger releases EARLIER, section 7's table), and the pace table already measured the
    hold at 3.4-13.7 s. **Nobody has ever measured finished-track-in-frame against `runInOpenMs`**,
    and it is one run of `runin-forward-reach.mjs` per value on an existing key with an existing
    control. If a shorter hold buys back the width without the crawl returning, that is the whole
    problem solved with a number he already owns.

20. **Re-derive the held ceiling once, part-way through the hold, instead of holding one value.**
    The hold exists so the shot does not crawl; it does NOT require the value to be frozen at the
    single widest moment. Re-capturing it once — say when the leader has closed half the distance —
    would keep the shot still for two long stretches instead of one, and cost 1.12x instead of 1.44x.
    It is a change to `_updateRunIn` alone and both instruments to price it exist. Listed second
    because it is a new mechanism, and proposal 19 tries an existing key first.

17. **The line's place in frame is set by the ZOOM, not by the leader — so that is where to look.**
    RUNIN-BACK-1 tested the hope in proposal 15 and it failed: moving the leader back to 0.34 did
    not pull the line toward the front edge, because `_lineCeiling` asks for whatever zoom puts the
    line at the inner-frame boundary *given* the anchor, and it gets it. **The finished track in
    frame is therefore a property of the line ceiling's own margin, not of the placement.** The next
    experiment is one line: ask `_lineCeiling` for the line at a point OTHER than the inner-frame
    edge and measure `runin-forward-reach.mjs`. That is a real number to choose and it belongs to
    the owner, which is why it is a proposal rather than a change.

18. **Show him the two builds side by side rather than asking him to remember.** RUNIN-BACK-1 is
    worse on 7 of 9 tracks on the numbers and satisfies a requirement he stated as non-negotiable.
    That is a genuine conflict between what he specified and what he liked, and it is not resolvable
    from measurements. Two production builds on two ports, same track and seed, is an hour of work
    and it settles the question the last six blocks have been circling.

15. **The cheapest lever is the anchor placement inside `_lineCeiling`, and it needs no new key.**
    *(TESTED AND FAILED by RUNIN-BACK-1 — see proposal 17. The placement was restored and the width
    did not move on any track. Left here rather than deleted because the report is append-only.)*
    §37's arithmetic is `width ≈ distance-to-line ÷ room-ahead-of-the-anchor`. Today the room ahead
    is about a third of the frame, because the run-in places its subject at `leaderForwardFrac`
    (0.66) — a value chosen so a RACER has road visible ahead of him. During the run-in the thing
    ahead is the LINE, and it is the only thing that matters, so the subject wants to be BEHIND
    centre, not ahead of it. That is what RUNIN-GLIDE-1's mirror did and what RUNIN-ANCHOR-1 removed.
    **Restoring a behind-centre placement for the run-in's own subject roughly halves the width the
    line ceiling demands, with no new number and no anchor change** — and `runin-forward-reach.mjs`
    and `check-runin-frame` already exist to price it. This is the first thing to try.

16. **Then ask whether the line needs to be in frame that early at all.** §38 shows the shot is
    1700–3100 px wide to hold a line 600–1100 px ahead, while the entire field spans 600–830 px. The
    run-in's promise — the line in frame from the endgame threshold — is what buys that width, and
    it is a promise the owner has never been shown the price of in these terms. **A run-in that
    brought the line in later, but kept the field tight throughout, is a different and possibly
    better shape**, and the choice is his rather than a tuning question.

13. **Attack the world-sized frame, not the placement.** *(WITHDRAWN by WHY-SO-WIDE-1 — the
    world-bounds clamp adapts the zoom on 0 frames of three of the four tracks and 22 of 551 on the
    fourth. This proposal was written from the explanation §37 falsified; it is left here rather
    than deleted because the report is append-only, but it should not be acted on.)* §32 found the wall: on ice-track the
    finished track in frame does not move by a pixel across the whole placement range, because the
    run-in has opened to a world-sized frame and `resolveCamera`'s world-bounds clamp centres it on
    the world. **Every attempt at this rule has now been defeated on the tracks where the line is
    most of a lap away at the endgame threshold.** The question to ask is not where the line sits in
    frame but why the shot has to contain a whole lap to begin with — and `endgameThreshold` is
    exactly the key that decides how far away the line is when the run-in engages. He is already
    running 0.95 and has a 1% control for it. **A sweep of finished-track-in-frame against
    `endgameThreshold` is one run of an instrument that already exists, and it may dissolve this
    whole problem without any camera change at all.**

14. **Ask whether ice-track and city-circuit should run the run-in at all.** *(Still standing after
    WHY-SO-WIDE-1, and for a better reason than it was written with: not because those frames are
    world-sized — they are 87% and 100% — but because the line ceiling there demands 2668 and 3394
    px to hold a line ~900-1100 px ahead.)* RUNIN-OWNS-1 already
    established that a closed track whose finish is most of a lap away turns "the line in frame"
    into "the world in frame". Three blocks have now broken on exactly those tracks. If the honest
    answer is that the run-in has nothing useful to do when the line is that far away, the engagement
    test could say so — and that is a smaller, more truthful change than anything attempted here.

11. **Re-run RUNIN-ANCHOR-1 as its own block with the forward reach as an acceptance test.** It is
    two edits — the anchor swap and `_lineCeiling` keeping its meaning (§27) — and it measurably
    beats today on line drift, leader drift and zoom monotonicity. The one thing that stopped it is
    that it un-does RUNIN-AHEAD-1's gain. Those are not in conflict in principle: the line's
    placement is what decides how much frame sits beyond it, and the state's forward fraction is
    simply the wrong fraction for an anchor that IS the line. **Ask him where he wants the line to
    sit in frame** — that is one number he owns, it is the only thing missing, and this block was
    forbidden from inventing it.

12. **Anchor at a fixed SCREEN point rather than a fraction along the heading.** §28 found the
    residual drift is heading rotation: a fraction along the heading is a moving screen position on
    a track that curves. If the line's placement were expressed in screen terms directly, the
    residual would go with it — and that is a smaller change than it sounds, because
    `anchorScreenPoint` already converts between the two.

9. **If the pin is wanted, give the run-in a DELIVERED-camera authority for the pinned stretch —
   and price it first.** §24 says the obstacle is the lag between target and delivery, not the
   composition. The smallest honest shape is: while pinned, the run-in writes `zoom`/`offset`
   directly instead of `targetZoom`/`targetOffset`, and hands back to the state on the frame before
   the crossing. That is a second authority over the camera, which this design has deliberately
   never had — so it should be *measured* before it is built: run `runin-pin-drift.mjs` with the
   lerp disabled for those frames and see whether the drift actually goes to zero. If it does not,
   the over-determination in §22 is the real wall and the contract needs relaxing to one pinned
   point, not two.

10. **Ask him which of the two points he actually wants pinned.** The geometry says both cannot hold
    through a curve — three degrees of freedom, four constraints. His wording already hints at the
    answer ("the line stays where it is… the leader stays *roughly* where he is"), and pinning the
    LINE alone is a well-posed problem with a unique solution. One sentence from him turns an
    over-determined system into a solvable one.

7. **Give `d` the arc distance and see whether the two closed ovals join in.** city-circuit and
   dirt-oval are the only tracks the forward bound does not help, and the reason is measured: the
   line is far ahead *along the heading* while being near on screen, because the track curves
   between the two. The shape can answer "how far to the line along the track" — `_runInProgressOf`
   already works in that measure — so the experiment is to build `d` from arc length instead of a
   projection and re-run `runin-forward-reach.mjs`. One run says whether it is worth having.

8. **Report the approach as a first-class number in question 3.** §17.3 found the line entering
   frame a second later on two tracks, and it was visible only because the guard happens to print
   the approach length beside its verdict. "How long after the phase opens is the finish line first
   visible?" is a promise in its own right, and it is one line to assert rather than to notice.

6. **Make `check-runin-frame` ask its never-empty question about the LEADER, not about any racer.**
   Question 2 passed every one of these frames — one racer on screen is enough for it — while the
   leader was 237 px off the edge. "The picture is never empty" and "the person the shot is about is
   in it" are different promises, and the second is the one the owner checks with his eyes. The
   projection is already computed per racer on every frame, so the cost is a comparison.

---

---

# RUNIN-EVEN-2 — the destination stopped running away. The line ceiling still owns the picture.

**Appended 2026-08-17. Nothing shipped — `CameraDirector.js` is byte-identical to `b5c5a51d`, so
CAMERA `6ae77f12daf23f78` and RENDER `a870f5f9e79cb444` cannot move.** The brief's diagnosis of
RUNIN-EVEN-1 was correct and its fix does what it says. It still does not come out flat, for a
reason neither attempt could have predicted from the other, and which is stated with a number
below. **Reverted, and per the brief there is no sixth shape.**

## 58. What was built — one line changed, everything else as specified

The RUNIN-EVEN-1 walk, unchanged in its arithmetic, with the destination swapped:

```
dest  = this._stateCamZoom()                      // the shot the crossing becomes anyway — stationary
speed = |ln(dest / current)| / remainingMs         // computed once: distance ÷ time still to run
current *= exp(sign · min(|span|, speed · dt))     // walked every frame, in log space
```

`_runInHoldCeiling`, `_runInReleaseProgress`, `_runInSweepU` and `_runInShouldRelease` went with the
hold; the anchor's travel went back to raw `_runInProgress`, whose two ends are the owner's
placement and its mirror, untouched. **`_lineCeiling` stayed in the `Math.min`** exactly as required.
The photo-finish case keeps the rise-only acceleration limit with `runInOpenMs` as its time constant
— no new key.

**Every distance is along the course.** The time still to run comes from `_runInProgress`, which
`_runInProgressOf` measures along the track and not across the ground; nothing in the walk takes a
straight-line distance to anything.

## 59. It is flatter. It is not flat.

Instantaneous rate through the close at 20% / 50% / 80%, log-units per second, ten tracks, seed 9:

| track | **delivered** | **the run-in's own target** | close s | first perceptible |
| --- | --- | --- | ---: | ---: |
| city-circuit | 0.08 / 0.16 / 0.40 | 0.11 / 0.14 / 0.61 | 13.93 | 2.65 s |
| dirt-oval | 0.08 / 0.23 / 0.40 | 0.06 / 0.13 / 0.51 | 10.42 | 0.20 s |
| ice-track | 0.10 / 0.26 / 0.56 | 0.25 / 0.10 / 0.63 | 7.92 | 0.27 s |
| luger-hill | 0.07 / 1.21 / 0.65 | 0.14 / 0.28 / 0.59 | 6.03 | 0.28 s |
| mountainstreet | 0.13 / 0.98 / 0.57 | 0.12 / 0.34 / 0.56 | 6.20 | 0.35 s |
| river-run | 0.13 / 0.31 / 0.69 | 0.21 / 0.31 / 0.68 | 7.15 | 0.32 s |
| searound | 0.26 / 0.85 / 0.56 | 0.48 / 0.17 / 0.55 | 6.85 | 0.20 s |
| seatrack | 0.12 / 0.51 / 0.83 | 0.10 / 0.29 / 0.95 | 6.32 | 0.42 s |
| space-sprint | 0.14 / 0.96 / 0.69 | 0.13 / 0.49 / 0.90 | 6.03 | 0.30 s |
| garden-path | — | — | — | — |

**A flat profile reads three equal numbers. None of these rows do**, and every one of them ends
faster than it starts — 0.08 → 0.40, 0.14 → 0.69. By the brief's own rule that is a fail and is
reported as one.

**What did improve, honestly stated.** Cross-track rate spread **13.6× → 2.27×**, so the destination
swap fixed precisely what the brief said it would; it is now comparable to the shipped 2.08×. The
flat foot shortened a great deal: city-circuit's first perceptible movement went **6.70 s → 2.65 s**
and eight of the nine measured tracks are under 0.5 s. **And the delivered zoom is no longer
monotone on any track** — the "mono" column reads NO ten times out of ten, against yes on the
shipped build. That alone disqualifies it.

## 60. WHY, with the number the brief asked for

**How often `_lineCeiling` binds during the close**, counted frame by frame — the walk's value
discarded in favour of the line's:

| track | close frames | line-clamped | share |
| --- | ---: | ---: | ---: |
| space-sprint | 333 | 317 | **95.2%** |
| ice-track | 446 | 415 | **93.0%** |
| city-circuit | 777 | 718 | **92.4%** |
| dirt-oval | 596 | 546 | **91.6%** |
| seatrack | 350 | 319 | **91.1%** |
| searound | 352 | 275 | 78.1% |
| luger-hill | 303 | 211 | 69.6% |
| mountainstreet | 343 | 174 | 50.7% |
| river-run | 340 | 29 | 8.5% |

**On seven of nine tracks the even walk decides the picture on fewer than one frame in four.** The
`Math.min` the brief required — correctly, because the line must stay in frame — is the whole
explanation: the walk heads for the state's own zoom, which is *tighter* than the line permits for
most of the close, so the smaller of the two is the line ceiling and **the shot inherits the line
ceiling's shape, which is the hyperbolic shape RUNIN-EVEN-1 was reverted for.** The walk was never
running the close; it was waiting behind a bound that was running it.

**So the wall is a third one, and it is not a bug in either attempt.** RUNIN-EVEN-1 failed because
its destination ran away. RUNIN-EVEN-2's destination is stationary and the walk toward it is genuinely
even — and it is invisible, because a promise-keeping bound sits between it and the picture. **The
line ceiling is not a safety net around the close; during the close it IS the close.** Any shape that
leaves `_lineCeiling` in the `Math.min` — and it must stay, that is the promise the whole line of work
exists for — will read as `_lineCeiling` for as long as `_lineCeiling` is the wider of the two.
The even walk and the framing promise are not two terms that can be composed with a `min`; they are
one term, and only one of them can be even.

That is where this line stops. **No sixth shape.**

## 61. State

`CameraDirector.js` reverted, byte-identical to `b5c5a51d`. Kept: the one-line tolerance in
`scripts/diag/runin-close-rate.mjs` so the instrument reads the close's start from either shape's own
state — the release latch when there is one, the end of the opening glide when there is not; it
reconstructs nothing either way. CAMERA and RENDER unmoved, nothing to mint, the tracking-lag stamp
cannot go stale. `runInOpenMs` keeps both its jobs, because nothing was kept.

## PROPOSALS

1. **Ask the line ceiling to be even, instead of asking something else to be even underneath it.**
   §60 says the close IS `_lineCeiling` on 50–95% of frames, so the only place a uniform close can
   live is inside `_lineCeiling` itself — its *placement* term, not a bound wrapped around it. The
   line's screen position is already a value with a Dev control (`runInLinePlacement`, RUNIN-ANCHOR-2);
   scheduling THAT evenly through the close, rather than the zoom it implies, would make the even
   quantity the one the ceiling is computed from. **It is measurable before it is built**: one run of
   `runin-close-rate` against a placement schedule swept in the existing diagnostic would say whether
   the implied zoom comes out flatter, at the cost of no production change.

2. **Show the owner the 2.27× and the shortened foot before the next attempt.** The destination swap
   did fix the cross-track spread and cut city-circuit's dead opening from 6.70 s to 2.65 s; it was
   rejected on flatness and on monotonicity, both of which are *my* acceptance rules read from his
   brief. He has not seen either number. **If what actually bothers him is the long dead opening
   rather than the unevenness**, then §59's middle column is a result and not a failure, and the next
   block is a much smaller one than a sixth shape.

---

---

# RUNIN-SCHEDULE-1 — the ceiling IS the fastest even close there is, and it is not even. **THREAD CLOSED.**

**Appended 2026-08-17. Nothing shipped — `CameraDirector.js` is byte-identical to `d30821fb`, so
CAMERA `6ae77f12daf23f78` and RENDER `a870f5f9e79cb444` cannot move.** This was the last attempt by
the owner's decision, and it ends the line with a geometric statement rather than another shape. It
is reverted. **Nothing else was attempted.**

## 62. The algebra that makes this measurable in one number

`_lineCeiling` is `room / needed` — the screen room ahead of the anchor over the world distance to
the line. It is the TIGHTEST zoom that still fits the line, and it fits it by putting the line
exactly ON the edge of the subject's region. Put the line at a **share `s`** of that room instead and
the zoom is `s x room / needed`. Therefore

> **share = scheduled zoom / `_lineCeiling`**

**The share and the zoom are the same number said two ways.** That is what this block turns on:
`s <= 1` is a placement the run-in is entitled to make and the promise holds; `s > 1` is the schedule
asking for the line OUTSIDE the region it exists to keep it inside. No new key and no new control
were needed, and none was added.

Both ends were already known, as the brief said: the start is the shot the opening arrived at, where
the line sits at the edge (`s = 1`); the end is the state's own zoom at the crossing, where the leader
IS at the line so the line's placement and the leader's are the same thing. All distances along the
course, via `_runInProgressOf`. The photo-finish case kept the rise-only acceleration limit with
`runInOpenMs` as its time constant.

## 63. THE DECIDING MEASUREMENT — the share the even schedule demands

Ten tracks, seed 9, read from the director's own `_runInLineShare`:

| track | close frames | share @20 | @50 | @80 | **MAX** | frames over 1 | accel fired |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| space-sprint | 333 | 1.54 | 2.45 | 2.21 | **2.46** | 95.2% | 69 |
| ice-track | 446 | 1.18 | 1.94 | 1.64 | **1.97** | 93.0% | 120 |
| city-circuit | 777 | 1.39 | 2.00 | 1.25 | **2.02** | 92.4% | 406 |
| dirt-oval | 596 | 1.38 | 1.91 | 1.78 | **1.92** | 91.6% | 342 |
| seatrack | 350 | 1.46 | 1.87 | 1.35 | **1.90** | 91.1% | 80 |
| searound | 352 | 1.26 | 0.94 | 1.14 | **1.41** | 78.1% | 131 |
| luger-hill | 303 | 1.22 | 0.92 | 1.09 | **1.24** | 69.6% | 181 |
| mountainstreet | 343 | 1.24 | 1.40 | 0.90 | **1.42** | 50.7% | 172 |
| river-run | 340 | 0.76 | 0.54 | 0.67 | **1.05** | 8.5% | 242 |
| garden-path | — | — | — | — | — | — | — |

**Nine of nine measured tracks need the line outside the frame**, by as much as **2.46x the entire
room ahead of the anchor** — not marginally out, but roughly two frame-widths out. The share is also
non-monotone on every track. The brief's fail condition is ANY track; this is all of them.

## 64. THE REASON, and it is geometry, not a defect in any of the six shapes

Keeping the line in frame requires `zoom <= room / needed`. As the leader closes, `needed` falls to
zero, so that bound rises **hyperbolically**; and `room` SHRINKS at the same time, because the leader
travels forward across the frame to his own placement. **`_lineCeiling` is therefore the fastest
schedule that keeps the line in frame — it is not one option among several, it is the boundary of
the admissible set.** An even close is exponential in time. A convex boundary and a straight chord
between two points on the same side of it cross, and §63 measures where and by how much.

> **The promise and the evenness are not two terms that a `Math.min` composes, and they are not one
> term that can be made even either. The admissible set has exactly one fastest member and its shape
> is fixed by the track geometry.** Any even schedule from the opened shot to the state's own zoom is
> faster than that member somewhere in the middle of every close but river-run's.

**This is the same picture as RUNIN-EVEN-2, exactly.** When the share exceeds 1 the build places the
line at the edge, which is `_lineCeiling`, which is what the previous `Math.min` returned. The rate
table is byte-identical — delivered 0.08/0.16/0.40 on city-circuit, spread 2.27x, non-monotone on all
ten. What this attempt adds is not a different picture but **the price named in the line's own
units**, which is the thing the previous five reports could not say.

## 65. The other measurements, taken and reported

- **Delivered rate at 20/50/80%**: unchanged from §59 — not three near-equal numbers on any track.
  **FAIL.**
- **Zoom monotonicity**: NO on all ten tracks. **FAIL.**
- **Line outside frame**: nine of nine. **FAIL.**
- **`check-runin-frame`, all three questions: PASS**, and this is the one place the attempt was
  *better* than the tip. Question 3 went from four tracks HELD / six TRAIL to six HELD / three
  TRAIL: mountainstreet and river-run stopped trailing entirely, and the worst trailing margins
  improved (space-sprint −228 → −190 px, seatrack −210 → −133 px, luger-hill −51 → −26 px). Total
  trailed frames 89 → 87. **`_lineCeiling` still binds** — that is the whole finding — so the promise
  was never at risk; the improvement comes from the shot being tighter earlier, not from the schedule.
- **Racers in shot / camera pointed at the race**: questions 1 and 2 pass unchanged, worst centre
  0.15 TW (luger-hill) / 0.94 TW (searound), zero empty frames.
- **Better / equal / worse against the tip `d30821fb`**: better on 3 tracks (guard question 3 only),
  equal on 6, worse on 0 for the promise — and **worse on all 10 for the thing the block was for**,
  since the delivered close is identical and the line placement it needs is inadmissible.
- **Against the accepted build `cc2af320`**: the delivered picture is the tip's, so the comparison is
  the tip's, already recorded in §40.

## 66. State, hygiene, and the close of this thread

`CameraDirector.js` reverted, byte-identical to `d30821fb` — verified with `git diff --stat`, not
assumed. `_runInHoldCeiling`, `_runInReleaseProgress`, `_runInSweepU` and `_runInShouldRelease` are
all back and none of them was ever superseded in a shipped commit, so there is nothing to clean up
in production source.

Kept: `scripts/diag/runin-line-schedule.mjs`, the instrument that produced §63. **It is the only
artefact of this block worth keeping**, because it converts "the close is not even" into a number in
the line's own units, and any future attempt can be judged by it in one run before a line of the
director is touched.

CAMERA `6ae77f12daf23f78` and RENDER `a870f5f9e79cb444` measured fresh and unmoved; nothing to mint;
the tracking-lag stamp cannot go stale because its closure did not change. `runInOpenMs` keeps both
its jobs. **This report is closed.**

## PROPOSALS

1. **The only remaining lever is the ENDS, and it is his to pull.** §64 says the shape of the close
   is fixed once the two ends are fixed, so the only way to flatten it without breaking the promise
   is to move an end: **open less wide** (a higher starting zoom shortens the span and flattens the
   chord) or **cross at a wider shot** (a lower destination does the same from the other side). Both
   are visible, both are his taste rather than a derivation, and **both are already measurable with
   `runin-close-rate` before anything is built**. This is the question to put to him, not a seventh
   shape.
2. **Ship the tip and stop measuring evenness.** The accepted build's close is uneven by 2.08x across
   tracks and always has been; six attempts established that no schedule available to the camera
   improves on it while keeping the line in frame. The remaining complaint that has never been shown
   to be unfixable is the **long dead opening on the two long tracks** — city-circuit 6.70 s of
   nothing at the start of its 13.93 s close — and §7's proposal to sweep `endgameThreshold` against
   hold length is one existing key and one table away from answering it.
