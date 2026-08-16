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
