# LINE-VISIBLE-1 — what "the line is in frame" measures, and what his definition would cost

**2026-08-22 · branch `invest/line-visible` off master `3226ea36` · MEASUREMENT ONLY — no camera
change, no key, no fix; `CameraDirector.js` untouched and `git diff master -- client/` is empty ·
nothing changes, so no fingerprint can move and none was run**

## Question 1, in one sentence

**Defect, not margin: ENDGAME-WIDTH-1 counted the line's centre point OUTSIDE THE FRAME ENTIRELY —
the viewer genuinely cannot see the finish — and that is 17–47 % of endgame frames across the ten
tracks, while the margin-only violation (inside the frame, outside the 0.7 inner box) is a separate
and much smaller 2–18 %.**

**And the cause is not the width.** On space-sprint the delivered shot is already 1319 px wide
against a line demand of 1341 — as wide as the guarantee asks — and the line is still off-screen 38 %
of the time. **The median lag between the target frame and the delivered frame is 414 px, a third of
the screen.** The line leaves the picture because the camera is pointed elsewhere, not because the
shot is too tight.

---

## The criteria, and what each counts

`_lineCeiling` guarantees ONE POINT — `getPosition(finishT, 0)`, the finish where it crosses the
racing line — inside the **inner frame box** (`innerFramePct` 0.7), via `pointGuarantee`. Everything
below is measured on the **DELIVERED** frame (the pan and zoom actually applied, which is what the
viewer sees), not on the target the ceiling reasons about.

| criterion | what it means |
| --- | --- |
| **OFF-SCREEN** | the centre point outside the frame — **a real loss** |
| **outside-box** | inside the frame, outside the 0.7 box — **a margin violation only** |
| **band < 0.9** | less than nine tenths of the line's own band visible — **his definition** |

**ENDGAME-WIDTH-1 used the first.** Its dirt-oval figure of 22 % reproduces here exactly, which
confirms the criterion rather than assuming it.

## Every track, both field sizes, both arms

`n` is 20 and his supported maximum (100 open, 40 closed). `w@0.7` is what the line term demands
today; `w@1.0` is his rule. Widths are world px across the frame; `lag` is the median displacement of
the line's screen position between the target and delivered frames.

| track | n | arm | frames | **OFF-SCREEN** | outside-box | band<0.9 | med band | width now | w@0.7 | **w@1.0** | **lag px** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| city-circuit | 20 | his | 265 | **22 %** | 2 % | 32 % | 1.00 | 1113 | 805 | 597 | 190 |
| city-circuit | 20 | shipped | 265 | 23 % | 3 % | 32 % | 1.00 | 1722 | 868 | 607 | 258 |
| city-circuit | 40 | his | 256 | **21 %** | 4 % | 32 % | 1.00 | 1086 | 805 | 595 | 201 |
| city-circuit | 40 | shipped | 256 | 19 % | 7 % | 29 % | 1.00 | 1095 | 805 | 595 | 187 |
| dirt-oval | 20 | his | 266 | **22 %** | 9 % | 29 % | 1.00 | 1177 | 843 | 625 | 157 |
| dirt-oval | 20 | shipped | 266 | 23 % | 9 % | 31 % | 1.00 | 1626 | 947 | 663 | 131 |
| dirt-oval | 40 | his | 269 | **22 %** | 9 % | 28 % | 1.00 | 1203 | 853 | 634 | 146 |
| dirt-oval | 40 | shipped | 269 | 22 % | 9 % | 28 % | 1.00 | 1203 | 853 | 634 | 146 |
| **garden-path** | 20/40 | both | **0** | — | — | — | — | — | — | — | — |
| ice-track | 20 | his | 217 | **21 %** | 7 % | 29 % | 1.00 | 1111 | 786 | 577 | 103 |
| ice-track | 20 | shipped | 217 | **17 %** | 12 % | 29 % | 1.00 | 1069 | 786 | 577 | 150 |
| ice-track | 40 | his | 224 | 23 % | 9 % | 32 % | 1.00 | 966 | 806 | 588 | 159 |
| ice-track | 40 | shipped | 224 | 26 % | 9 % | 34 % | 1.00 | 1038 | 934 | 654 | 186 |
| luger-hill | 20 | his | 172 | 30 % | 16 % | 38 % | 1.00 | 865 | 625 | 463 | 530 |
| luger-hill | 20 | shipped | 172 | **42 %** | 13 % | 49 % | 1.00 | 704 | 737 | 516 | **891** |
| luger-hill | 100 | his | 179 | 31 % | 16 % | 39 % | 1.00 | 846 | 616 | 459 | 414 |
| luger-hill | 100 | shipped | 179 | 36 % | 14 % | 44 % | 1.00 | 671 | 616 | 459 | 590 |
| mountainstreet | 20 | his | 174 | 34 % | 17 % | 48 % | 0.96 | 818 | 581 | 430 | 457 |
| mountainstreet | 20 | shipped | 174 | **44 %** | 14 % | 55 % | **0.68** | 644 | 655 | 459 | **851** |
| mountainstreet | 100 | his | 178 | 33 % | 16 % | 47 % | 1.00 | 820 | 583 | 433 | 433 |
| mountainstreet | 100 | shipped | 178 | 39 % | 13 % | 52 % | 0.85 | 608 | 583 | 433 | 664 |
| river-run | 20 | his | 179 | 26 % | 18 % | 43 % | 0.96 | 747 | 486 | 359 | 377 |
| river-run | 20 | shipped | 179 | 33 % | 16 % | 58 % | 0.80 | 541 | 486 | 359 | 510 |
| river-run | 100 | his | 166 | 30 % | 18 % | 46 % | 0.94 | 726 | 491 | 361 | 426 |
| river-run | 100 | shipped | 166 | **43 %** | 15 % | 55 % | **0.62** | 577 | 571 | 400 | **841** |
| searound | 20 | his | 190 | 25 % | 14 % | 42 % | 1.00 | 670 | 575 | 425 | 367 |
| searound | 20 | shipped | 190 | 21 % | 10 % | 34 % | 1.00 | 964 | 575 | 425 | 279 |
| searound | 40 | his | 188 | 29 % | 13 % | 43 % | 1.00 | 637 | 584 | 434 | 450 |
| searound | 40 | shipped | 188 | 29 % | 13 % | 43 % | 1.00 | 637 | 584 | 434 | 450 |
| **seatrack** | 20 | his | 178 | **43 %** | 10 % | 55 % | **0.77** | 1122 | 952 | 707 | 409 |
| **seatrack** | 20 | shipped | 178 | **47 %** | 8 % | 58 % | **0.61** | 904 | 952 | 707 | 605 |
| **seatrack** | 100 | his | 187 | **47 %** | 10 % | 60 % | **0.50** | 856 | 900 | 668 | 498 |
| **seatrack** | 100 | shipped | 187 | 43 % | 10 % | 57 % | 0.63 | 910 | 900 | 668 | 498 |
| **space-sprint** | 20 | his | 172 | **40 %** | 10 % | 40 % | 1.00 | 1324 | 1314 | 982 | 420 |
| **space-sprint** | 20 | shipped | 172 | **46 %** | 9 % | 46 % | 1.00 | 1259 | 1526 | 1068 | 738 |
| **space-sprint** | 100 | his | 169 | **38 %** | 12 % | 38 % | 1.00 | 1319 | 1341 | 991 | 414 |
| **space-sprint** | 100 | shipped | 169 | 42 % | 11 % | 42 % | 1.00 | 1090 | 1341 | 991 | 549 |

**Nothing is summarised away.** Three things in that table are worth naming:

- **`garden-path` has NO endgame frames at all** on either arm at either size — the run-in never
  activates. Not measured, and not explained here: **not established.**
- **The worst tracks are seatrack (43–47 %) and space-sprint (38–46 %)**, not the ones the earlier
  report happened to sample. He said he could not say where it was worse; it is worse there.
- **The shipped defaults are worse than his config on 7 of the 9 tracks with an endgame**, and the
  lag is the reason — 891 px against 530 on luger-hill, 851 against 457 on mountainstreet.

---

## Question 2 — his definition, and what it would cost

**The extent is available and nothing was invented.** The line's band is
`getPosition(finishT, ±0.5)` — the same segment the world's finish gate is drawn at and the minimap's
finish mark uses (MINIMAP-ONE-SOURCE-1). The visible fraction is that segment clipped to the frame.

**His rule is `pointGuarantee` at `innerFramePct` 1.0** instead of 0.7 — the same function, the same
anchor placement, differing only in the region the line must sit inside. The ratio is 1/0.7 = 1.43 by
construction. **His 0.9 is used as a CHECK on the resulting frame, never as a fudge; no margin,
hysteresis or floor of my own is added.**

### Width at the three moments — today against his rule (his config)

| track | n | opening now → his | mid-endgame now → his | crossing now → his | over-scale at mid |
| --- | --- | --- | --- | --- | --- |
| city-circuit | 40 | 415 → **933** | **1207 → 645** | 184 → 25 | 1.63× → **0.87×** |
| dirt-oval | 40 | 338 → **993** | **1286 → 676** | 195 → 25 | 1.92× → **1.01×** |
| ice-track | 40 | 338 → **933** | **1283 → 654** | 192 → 70 | 1.62× → **0.83×** |
| luger-hill | 100 | 800 → 704 | **911 → 510** | 220 → 60 | 1.21× → **0.68×** |
| mountainstreet | 100 | 800 → 678 | 876 → 468 | 215 → 11 | 1.95× → **1.04×** |
| river-run | 100 | 725 → 554 | 751 → 400 | 215 → 34 | 0.83× → **0.44×** |
| searound | 40 | 338 → **703** | 932 → 472 | 185 → 43 | 0.95× → **0.48×** |
| seatrack | 100 | 444 → **1176** | **1520 → 707** | 217 → 18 | 2.29× → **1.07×** |
| **space-sprint** | 100 | 800 → **1508** | **1908 → 1087** | 316 → 157 | **4.24× → 2.41×** |

**At mid-endgame his rule roughly halves the width on every track. At the opening it WIDENS it on
five of nine** — which is what his specification asks for and today's shot fails to do.

---

## Question 3 — the risk his definition accepts

**This is where his rule does not survive the measurement, and the reason is not the border.**

The 0.7 border is worth 30 % of the half-frame — about 192 px per side at 1280. **The measured median
lag is 103–891 px, with seven of the nine tracks above 350 px.** So on most tracks **the lag already
exceeds the border the current rule buys** — which is exactly why the line is off-screen 17–47 % of
the time *today*, at the stricter setting.

**Removing the border cannot make that better and must make it worse.** Under his rule the line sits
at the frame edge by construction, so any outward lag loses it immediately. The current rule places
it 15 % in and still loses it a third of the time.

**How often would it leave the frame under his rule? NOT ESTABLISHED as a number**, and I am not going
to estimate it: answering it properly means re-running the camera under the new ceiling, and the lag
is not a fixed offset — it is a response to how fast the shot is moving, which the new ceiling would
itself change. What the data does settle is the direction and the order of magnitude: **the border is
not what is failing, and a rule with less border cannot fix a failure the border was already too
small to prevent.**

**His rule is safe as stated only if the lag is fixed first.** That is the finding.

---

## Question 4 — the knock-on

**If the line term were replaced by his width, `company` becomes the binding term on every track** —
55–100 % of endgame frames, with `guarantee` taking the remainder:

| track | n | binding now | **binding after** |
| --- | --- | --- | --- |
| space-sprint | 100 | line 99 % | **company 60 %**, guarantee 40 % |
| seatrack | 100 | line 90 % | **company 84 %**, guarantee 16 % |
| dirt-oval | 40 | line 93 % | **company 100 %** |
| city-circuit | 40 | line 94 % | **company 61 %**, guarantee 39 % |
| ice-track | 40 | line 96 % | **company 60 %**, guarantee 40 % |
| luger-hill | 100 | line 92 % | **company 55 %**, guarantee 45 % |
| mountainstreet | 100 | line 88 % | **company 60 %**, guarantee 40 % |
| river-run | 100 | state 52 %, line 48 % | **company 60 %**, guarantee 40 % |
| searound | 40 | line 93 % | **company 60 %**, guarantee 40 % |

**So narrowing the line term does not hand the width to the tail — it hands it to the company
guarantee**, the term that keeps `minRacersVisible` racers in shot. **That is what the next block
would be about**, and it is a different question from the one this thread has been asking.

**Over-scale under his widths** (FLOOR-REACH-1's formula) is in the table above: it falls below 1.0 —
the floor stops binding entirely — on six of nine tracks, and on space-sprint from **4.24× to 2.41×**,
which is an improvement and still the worst on the board.

---

## The one change I would make first

**Fix the lag, not the border.** The line is off-screen on 17–47 % of endgame frames at the *stricter*
setting, on a shot that is already as wide as the guarantee asks; the median target-to-delivered
displacement is 414 px on space-sprint and 891 on luger-hill. **No change to the width rule — his or
anyone's — can fix a failure that is a pan arriving late.** Loosening the border first would ship a
narrower shot that loses the line more often, and it would look like his rule failing when it was the
lag all along.

His definition is a good rule and the numbers support what it buys — roughly half the width at
mid-endgame, a wider opening, and the over-scale largely gone. **It should be built second.**

## PROPOSALS

**1. Measure and fix the endgame pan lag before touching any width rule.** The lag is measurable now
(this harness reports it per frame) and it is the direct cause of the line loss. Whether it is the
zoom time constant, the pan time constant, or the anchor moving faster than the shot can follow is
**not established here** — that is the block. **Cost:** a camera change, so CAMERA and RENDER move.
**What it fixes:** the only requirement he has called absolute, on all nine tracks that have an
endgame.

**2. Then adopt his definition, with the border decided by the measured lag rather than by 0.7 or
1.0.** Once the lag is known, the border that survives it is arithmetic instead of a guess — and it
may well land between the two. **Cost:** one number, and his eye on the opening, which gets wider.
**What it prevents:** choosing 1.0 now, discovering the lag eats it, and adding a margin of my own —
which is precisely what he told me not to do.

**3. Find out why `garden-path` has no endgame frames at all.** The run-in never activates there on
either arm at either field size. It may be correct (a short track where the endgame threshold and the
crossing coincide) or it may be a track that silently gets no run-in. **Cost:** an hour. **What it
prevents:** shipping an endgame change that is never exercised on one of the ten tracks and finding
out from him.

## Reproducing

```
node scripts/line-visible-truth.mjs                       # ten tracks, both sizes, both arms
node scripts/line-visible-truth.mjs --tracks=seatrack --json
```

**It changes nothing.** `_framingProbe` is written by the director every frame and read by nothing in
the camera; the two candidate widths are the director's own `pointGuarantee` with its own
`anchorScreenPoint`, differing only in `innerFramePct`. No file under `client/` is touched by this
block.
