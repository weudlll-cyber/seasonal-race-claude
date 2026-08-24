# LATE-LEAD-AXIS-1 — the same 1,435 hits, re-sliced by DIRECTION rather than by timing

**Date:** 2026-08-24 · **Branch:** `diag/late-lead-axis-1` (off `master` at `f3afc5b2`) ·
**RE-COMPUTATION AND ONE DOCUMENT. No race was re-run, no camera code, default or rule changed.**

**The owner's case is real, it is separate, and it is rare.** Re-grouping LATE-LEAD-HUNT-1's hits by
WHERE the racer left the picture rather than WHEN produces a cleaner split than the timing one did:

- A top-5 finisher leaves the frame **ACROSS the track** in **211 of 1,260 races (16.7%)**.
- **The WINNER does, in 15 races (1.2%)** — and in **12 of those he is still outside the picture at
  the line (0.95%)**.
- **EVERY ONE of the 12 races where the winner is off canvas at the line is an ACROSS-TRACK
  departure.** Not one is along-track. The winner's along-track cases — all 103 of them — are the
  opening glide and are over long before the line.

**So the timing split does not survive the regrouping; it cuts across it.** LATE-LEAD-HUNT-1's
"Group B" is not one population. It contains the forward view's known cost AND a second, smaller,
mechanically distinct fault — and the second one is the owner's.

---

## 1. HOW THE AXIS WAS ESTABLISHED — and why the label could not be trusted

**Asked for first, because the previous report read the labels and the labels do not mean what they
say.** LATE-LEAD-HUNT-1 stored `top` / `bottom` / `left` / `right` and its §3 read "off the **left**
— behind". That is not in the label. It is a claim about which way the track runs.

**THE ONE FACT THAT MAKES IT DECIDABLE: the render transform carries no rotation.**
`renderRaceFrame.js:153` is `ctx.translate(cam.offsetX, cam.offsetY)` followed by `ctx.scale(...)`
and nothing else. Screen +x **is** world +x on every frame of every track. A stored side therefore
names a **world-axis direction**, and only the track's heading converts it into ahead, behind or
across.

**THE HEADING IS READ FROM THE TRACK, NOT ASSUMED.** `_runInProgressOf`
(`CameraDirector.js:3661`) is exactly `u = clamp01((p − threshold) / (1 − threshold))` with
`p = leaderT / finishT`, so a hit's stored u-window pins the **leader's own `t`** to a known range.
The leader's heading over that range is sampled from the shape with the director's own `_headingAt`
(`CameraDirector.js:2175`) and each side is classified by whether its world-axis direction lies
closer to the tangent or to the perpendicular. **The leader's heading is the right one** — the
owner's question is where the racer was relative to HIM, and the frame is composed around him.

**THE RESULT, and it is not uniform:**

| track | heading at the line | ACROSS-track pair | ALONG-track pair | tilt off the axis |
| --- | --- | --- | --- | --- |
| city-circuit | −179.9° | top / bottom | **left = AHEAD**, right = behind | 0.1° |
| dirt-oval | −0.8° | top / bottom | left = behind, right = ahead | 0.8° |
| ice-track | −0.2° | top / bottom | left = behind, right = ahead | 0.2° |
| mountainstreet | +7.7° | top / bottom | left = behind, right = ahead | 7.7° |
| river-run | −17.0° | top / bottom | left = behind, right = ahead | 17.0° |
| luger-hill | −19.8° | top / bottom | left = behind, right = ahead | 19.8° |
| seatrack | +154° | top / bottom | left = ahead, right = behind | 26.0° |
| searound | +33.4° | top / bottom | left = behind, right = ahead | 33.4° |
| **space-sprint** | **+89.3°** | **left / right** | **top = BEHIND, bottom = ahead** | 0.7° |
| garden-path | −177.1° | — | — | unmeasured, no race finished |

**Three corrections to LATE-LEAD-HUNT-1's reading follow immediately.** On **space-sprint** the pairs
are the other way round: `left`/`right` is ACROSS and `top`/`bottom` is ALONG. On **city-circuit** and
**garden-path** the track runs the other way, so `left` is AHEAD, not behind. Its pooled "Group B is
off the LEFT — behind" therefore mixes three different meanings of one word.

---

## 2. THE ACROSS-TRACK HIT LIST — watch one of these

**Reproduce as before:** Quick Test, the track and field size named, the seed typed in. `u` is the
run-in's own parameter, 0 where the closing window opens and 1 at the line.

### The WINNER, off frame ACROSS the track — all 15, longest first

| track | racers | **seed** | frames off | clipped | u-window | edge | which across side | tightest ceiling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **river-run** | 20 | **49** | **99** | 43 | 0.000–0.997 | top | one side | state |
| **river-run** | 20 | **23** | **92** | 50 | 0.759–0.993 | top | one side | state |
| river-run | 40 | 30 | 81 | 50 | 0.750–0.997 | bottom | **the other** | guarantee |
| river-run | 20 | 32 | 77 | 52 | 0.794–0.996 | bottom | **the other** | guarantee |
| **mountainstreet** | 20 | **13** | **59** | 61 | 0.828–0.996 | bottom | **the other** | guarantee |
| river-run | 40 | 23 | 37 | 46 | 0.899–0.997 | top | one side | guarantee |
| luger-hill | 40 | 11 | 35 | 89 | 0.901–1.000 | top | one side | state |
| river-run | 20 | 55 | 30 | 70 | 0.915–0.998 | top | one side | guarantee |
| mountainstreet | 20 | 34 | 26 | 72 | 0.927–0.997 | top | one side | guarantee |
| seatrack | 20 | 5 | 26 | 62 | 0.930–0.999 | bottom | **the other** | guarantee |
| luger-hill | 20 | 51 | 5 | 115 | 0.979–1.000 | top | one side | guarantee |
| seatrack | 20 | 11 | 1 | 105 | 0.999–0.999 | top | one side | guarantee |
| dirt-oval | 20 | 195 | 40 | 3 | 0.000–0.000 | top | one side | state |
| river-run | 20 | 8 | 39 | 6 | 0.000–0.000 | top | one side | state |
| city-circuit | 40 | 51 | 38 | 4 | 0.000–0.000 | bottom | **the other** | state |

**The last three are the opening glide** (u 0.000) and are the transient LATE-LEAD-HUNT-1 already
named. **The first twelve are the owner's case**: the winner is outside the picture, across the
track, and still outside it as he crosses.

**Start with river-run 20 seed 49** — §3 works it through.

### The longest across-track departures at any position

| track | racers | seed | pos | frames off | u-window | edge |
| --- | --- | --- | --- | --- | --- | --- |
| river-run | 20 | 14 | P5 | 151 | 0.604–0.998 | bottom |
| river-run | 40 | 35 | P5 | 143 | 0.598–0.998 | bottom |
| river-run | 40 | 4 | P5 | 139 | 0.610–1.000 | bottom |
| river-run | 20 | 37 | P5 | 126 | 0.000–1.000 | bottom |
| river-run | 40 | 28 | P5 | 125 | 0.641–1.000 | bottom |
| ice-track | 20 | 56 | P5 | 124 | 0.691–0.996 | bottom |
| river-run | 20 | 14 | P4 | 121 | 0.674–0.998 | bottom |
| river-run | 20 | 57 | P4 | 121 | 0.000–1.000 | bottom |
| luger-hill | 20 | 19 | P5 | 117 | 0.000–1.000 | bottom |
| luger-hill | 40 | 15 | P4 | 117 | 0.709–1.000 | bottom |
| searound | 40 | 42 | P5 | 117 | 0.678–0.996 | top |
| river-run | 40 | 4 | P2 | 114 | 0.666–1.000 | bottom |

---

## 3. THE WORKED EXAMPLE — `river-run`, 20 racers, seed 49

**Everything below is the stored record for that race plus the track's own geometry. Nothing is
re-run and nothing is reconstructed.**

The closing stretch is **364 frames**. river-run is an open track; its heading at the line is
**−17.0°**, so **across the track is up and down the screen** and **along it is left and right**,
with left behind and right ahead.

| finishing position | racer index | frames OFF | frames CLIPPED | frames fully on | u-window | which edge | direction | ceiling | anchor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **P1 — the winner** | 16 | **99** | 43 | 222 | 0.000–0.997 | **top** | **ACROSS** | state | **none, on all 99** |
| P2 | 5 | 33 | 74 | 257 | 0.910–0.997 | **top** | ACROSS | state | none |
| P3 | 11 | 0 | 0 | 364 | — | — | — | — | — |
| **P4** | 14 | **14** | 56 | 294 | 0.962–0.997 | **bottom** | **ACROSS** | state | none |
| P5 | 7 | 0 | 0 | 364 | — | — | — | — | — |

**BOTH ACROSS-TRACK SIDES OCCUR IN THIS ONE RACE, which is what the addendum asked.** The winner
leaves over the **top** edge; the fourth-place finisher leaves over the **bottom** edge. Their
u-windows overlap — 0.962–0.997 sits inside 0.000–0.997 — so the two departures are on opposite sides
of the corridor within the same closing move. **The stored form keeps only each racer's first and
last off-frame, not the frame list, so it cannot prove they were off on the SAME frame** — only that
their windows overlap.

**Why the winner cannot have been "behind the leader" here.** At u ≈ 0.997 the leader is within a
hair of the line and the winner crosses it first — he IS the leader on those frames. A departure
booked to the top edge at that moment is not a racer dropping off the back; it is the subject of the
shot leaving it sideways. And the camera had **no single anchored racer on any of the 99 frames**.

**And the arithmetic says the corridor does not fit.** At the line the shot lands on the active
state's own width (`_scheduleClose`, requirement 2). On river-run that frame holds **235 world px
across the track against a road 300 world px wide** — **0.78 of it** (§7). Two racers on opposite
edges of the road cannot both be in the picture, and in seed 49 exactly that happens.

---

## 4. THE RE-SLICE — every hit, by direction

**1,435 hits over 1,260 races.** "Mixed" = the racer left over an across side on some frames and an
along side on others. "Ambiguous" = the closing stretch turns enough inside that hit's own window
that a side changes meaning within it.

| | **ACROSS-track** | **ALONG-track** | mixed | ambiguous |
| --- | --- | --- | --- | --- |
| hits | **275** | **988** | 107 | 65 |
| **races** | **211 (16.7%)** | **477 (37.9%)** | 71 | 45 |
| positions P1/P2/P3/P4/P5 | **15**/37/54/76/93 | **103**/109/156/258/362 | 8/6/15/24/54 | 0/1/9/18/37 |
| median frames off | 59 | 50 | 85 | 108 |
| median u at first off-frame | 0.825 | 0.835 | 0.000 | 0.000 |
| median u at last off-frame | 0.998 | 0.998 | 0.998 | 0.999 |
| tightest ceiling = `state` (frames) | 81.6% | **99.1%** | 97.2% | 96.9% |
| tightest ceiling = `guarantee` (frames) | **18.2%** | **0.2%** | — | 3.1% |
| no anchored racer at all (frames) | **97.8%** | 88.1% | — | — |
| the racer IS the anchor (frames) | 0.3% | 0.2% | — | — |
| timing group A / B / C | **8 / 267 / 0** | **221 / 767 / 0** | 21 / 86 / 0 | 0 / 65 / 0 |

**Group C is empty in every direction too** — the timing gap LATE-LEAD-HUNT-1 found is not an
artefact of its grouping.

### The single most discriminating row

| | winner off ALONG-track | winner off ACROSS-track |
| --- | --- | --- |
| hits | 103 | 15 |
| **in Group A — the opening glide** | **103 (all of them)** | 3 |
| **in Group B — still off at the line** | **0** | **12** |
| median frames off | 31 | 38 |

**The winner is never lost off the back edge at the line. He is only ever lost sideways.**

### The owner's case on its own — the 12 winner-across-at-the-line races

568 off-frames across 12 races. **No anchored racer on 100% of them.** And the tightest ceiling is
**`guarantee` on 62.1%** of them, against 0.2% for along-track hits. That signature belongs to
nothing else in this corpus.

---

## 5. BOTH SIDES — the addendum, answered from the record

**BOTH SIDES ARE CAPTURED. The stored direction can express all four**, and it did:
`late-lead-hunt.mjs:109` books one side per off-frame from four live branches, and every one of them
appears in the data. **No figure below is a lower bound for want of the other side** — with one
named exception at the end.

**Every off-frame, by what its side MEANT on that hit's own window** (86,997 frames):

| meaning | frames | share |
| --- | --- | --- |
| **ALONG — behind the leader** | **50,727** | **58.3%** |
| **ACROSS — one side** | **12,618** | **14.5%** |
| **ACROSS — the other side** | **8,821** | **10.1%** |
| ALONG — ahead of the leader | 7,805 | 9.0% |
| ambiguous (ice-track, seatrack) | 7,022 | 8.1% |
| across, a third case (seatrack only) | 4 | 0.0% |

**ACROSS-track totals 21,443 frames (24.6%); along-track totals 58,532 (67.3%).** Neither across side
is a rarity relative to the other — the split is roughly **59 / 41**, and the more common of the two
is the one the earlier summary happened to name.

**Per track, and it is not symmetric anywhere:**

| track | across, side A | across, side B | along, behind | along, ahead |
| --- | --- | --- | --- | --- |
| river-run | bottom 4,186 | top 1,281 | 2,089 | 791 |
| searound | top 5,963 | **bottom 0** | 2,617 | 1,372 |
| seatrack | top 4,015 | bottom 62 | 479 | 1,049 |
| luger-hill | bottom 2,544 | top 126 | 3,523 | 1,116 |
| mountainstreet | bottom 1,202 | top 780 | 2,491 | 514 |
| ice-track | bottom 599 | top 12 | 5,637 | 614 |
| dirt-oval | top 371 | bottom 25 | 15,678 | 737 |
| city-circuit | bottom 203 | top 70 | 8,897 | 168 |
| **space-sprint** | **none at all** | **none at all** | 9,316 | 1,444 |

**The along-track pair is likewise two-sided.** Behind dominates at 58.3%, but **ahead is 7,805
frames and is not a rounding error** — it is almost the whole of the opening glide (§6).

### The one place a figure IS a lower bound, and what it would take to fix

**`space-sprint`'s zero across-track frames is a LOWER BOUND, and it is the only one.** The hunt
booked one side per frame under the fixed priority `top → bottom → left → right`
(`late-lead-hunt.mjs:109`), so a racer outside a **corner** of the canvas is credited to top or
bottom whatever else was also true. On the eight tracks where top/bottom is the ACROSS pair that
priority favours across. **On space-sprint, where top/bottom is the ALONG pair, it favours along** —
so a racer off both edges at once was booked along-track there, and space-sprint's across count can
only be understated, never overstated.

**What it would take:** record the outward overhang on each axis per frame rather than one winning
side — four numbers instead of one string, in the same loop. **That does not need new races to be
DEFINED, but it does need them to be COLLECTED**, because the stored record kept only the winner.
**This report does not infer the missing side from the one it has.**

---

## 6. ONE MECHANISM OR TWO — and does the timing split survive?

**THE ACROSS-TRACK CASES ARE A SEPARATE FAULT.** Four independent readings say so, and they are not
restatements of each other:

1. **The timing.** 267 of 275 across-track hits are Group B; 221 of 250 Group A hits are along-track.
2. **The winner.** All 103 along-track winner hits are Group A and none reaches the line. All 12
   winner hits that do reach the line are across-track.
3. **The ceiling.** `guarantee` is the tightest ceiling on 18.2% of across-track frames and on 0.2%
   of along-track ones — a factor of ninety. On the winner's own across-track frames it is 62.1%.
4. **The anchor.** Across-track: no anchored racer on 97.8% of frames. Along-track in Group A: the
   camera is anchored on somebody else on 80.7%.

**DOES THE TIMING SPLIT SURVIVE? Partly — and the part that fails is the important one.**

- **Group A survives and gets sharper.** It is the opening glide and it is **along-track AHEAD**:
  6,884 of its 7,586 frames (90.7%) are a racer thrown off the front, 84 behind, 614 across. Its own
  summary — front of the field, camera anchored elsewhere, about half a second — is confirmed.
  **What changes is the name of the edge: not "off the right", but "off the AHEAD end", which is the
  right side on some tracks and the left on others.**
- **Group B does NOT survive as one thing.** 767 of its hits are along-behind — the forward view's
  measured cost, as reported. But **267 are across-track**, they carry a different ceiling and a
  different anchor profile, and they are where every one of the owner's winner cases lives. **Group B
  is two populations that happen to share a clock.**

**So the honest count is THREE, not two:** the opening glide (along, ahead, transient), the forward
view's cost (along, behind, structural and accepted), and **the across-track loss at the line
(sideways, at the crossing, and nobody's stated design)**.

---

## 7. WHAT BOUNDS THE PICTURE ACROSS THE TRACK — established at source

**He asked exactly this on 2026-08-23 for the photo finish. The answer for the run-in is worse than
for the photo finish, and it has two independent halves.**

**HALF ONE — in the single-anchor states the corridor is not a bound at all.** `_guaranteeCeiling`
(`CameraDirector.js:2441`) dispatches on the framing table's `guarantee` column, and at `:2488` it
reads `if (kind !== GUARANTEE.PAIR) return Infinity;`. LEADER_ZOOM, OVERVIEW and COMEBACK_ZOOM are
CORRIDOR rows in that table, and all three take that line. **This is deliberate and owner-approved** —
CAMERA-COMPANY-ONLY-3, 2026-08-05, *"the road is not who matters, the racers are"*. The corridor
computation is reached only as the PAIR branch's fallback when a pair state has fewer than two
contenders, **which fired on 0 of 11,813 pair frames**. It is defensive code.

**HALF TWO — during the scheduled endgame every guarantee stands down anyway.**
`const _scheduled = this._scheduleComposing() && Number.isFinite(_runInCeiling)`
(`CameraDirector.js:4247`), and then at `:4280` the width is `_scheduled ? _ceilings.state : Math.min(...)`.
The geometric guarantees are still COMPUTED — `_framingProbe.wouldHave` carries what each asked for —
and then not applied. **Every off-frame in this corpus is a run-in frame by construction**, so this
is the regime all 86,997 of them ran in.

**SO: NO. THE FULL TRACK WIDTH IS NEVER GUARANTEED TO BE IN FRAME DURING THE RUN-IN.** Nothing bounds
the picture across the track except the schedule's own width, and that width is the active state's
`visibleCorridors` setting measured on the **short screen axis against a fixed reference corridor** —
not against the track's own width (`zoomUnit.js`, by design).

**WHAT THAT DELIVERS, per track.** The shot at the line is the state's own — `_scheduleClose` lands on
`_stateCamZoom()` — so it is computable without a race. The measure below is the **full chord through
the frame's centre**, generous on purpose: the anchor is forward-placed and guarantees measure inside
a smaller box, so the room a racer actually has is less than this.

| track | road width (world px) | leader shot, across (world px) | **× the road** | photo finish, across | × the road | across-track hits |
| --- | --- | --- | --- | --- | --- | --- |
| **mountainstreet** | 300 | 227 | **0.76** | 121 | 0.40 | 32 |
| **river-run** | 300 | 235 | **0.78** | 125 | 0.42 | **75** |
| **seatrack** | 300 | 250 | **0.83** | 134 | 0.45 | **68** |
| **luger-hill** | 250 | 239 | **0.96** | 128 | 0.51 | 41 |
| ice-track | 211 | 225 | 1.07 | 120 | 0.57 | 7 |
| city-circuit | 197 | 225 | 1.14 | 120 | 0.61 | 3 |
| dirt-oval | 178 | 225 | 1.26 | 120 | 0.67 | 2 |
| space-sprint | 300 | 400 | 1.33 | 213 | 0.71 | **0** |
| searound | 131 | 270 | 2.06 | 144 | 1.10 | 47 |

**THE FOUR TRACKS WHOSE LEADER SHOT IS NARROWER THAN THEIR ROAD CARRY 216 OF THE 275 ACROSS-TRACK
HITS (78.5%). The four whose shot is wider carry 12 (4.4%).** Searound is the exception, and §8 says
why it is probably not one.

**And note what space-sprint's 1.33 is made of.** Its road runs down the screen, so the across
direction is the frame's LONG axis. The same setting buys 400 world px there and 227 on
mountainstreet. **At the across-track end the same number means different things on different
tracks** — the class of problem `zoomUnit.js` was built to remove at the along-track end,
reappearing on the other axis.

---

## 8. WHAT THE DATA COULD NOT SUPPORT

- **"ACROSS-TRACK" IS NOT THE SAME CLAIM AS "ALONGSIDE THE LEADER", and for P2–P5 the stored data
  cannot close the gap.** A racer far behind on a tilted track is displaced both backwards and
  sideways, and the one-side-per-frame booking hides which. **The gap is closed only for the WINNER
  cases**, and by an argument rather than by a measurement: at u ≈ 1 the winner is at the line, so he
  is the leader and cannot be behind himself. **The 12-race figure is solid; the 211-race figure is an
  upper bound on "alongside".** What would settle it is the racer's along-track offset from the leader
  at each off-frame — a quantity the hunt never stored.
- **SEAROUND'S 47 ACROSS-TRACK HITS ARE PROBABLY MIS-BOOKED, and the evidence is the one-sidedness.**
  Its heading at the line is +33.4°, so "behind" points left AND up; under the `top`-first priority a
  racer off the back corner is booked `top`. **All 5,963 of searound's across frames are `top` and not
  one is `bottom`** — a genuine across-track fault shows both sides, as river-run's 4,186/1,281 does.
  Excluding searound drops the across-track total from 275 hits to **228** and the races from 211 to
  **177**; **all 15 winner cases survive**, because none of them is on searound.
- **THE THREE TRACKS WHERE THE READING IS CLEANEST ARE EXACTLY THE THREE WHERE THE FAULT IS ABSENT,
  and this corpus cannot separate the two.** dirt-oval, city-circuit and ice-track are within 1° of
  the screen axis, so their sides mean one thing unambiguously — and they are also three of the four
  whose shot is wider than their road. **"Across-track departures are rare" and "the reading is only
  clean where there is nothing to read" are not distinguishable here.** Only a track that is both
  axis-aligned and narrower than its shot would separate them, and no such track is shipped.
- **`binding` DOES NOT NAME THE AUTHOR OF THE WIDTH ON A SCHEDULED FRAME, and this is a code reading
  rather than something measured here.** `_binding` is the argmin over `_ceilings`
  (`CameraDirector.js:4405`), while on a scheduled frame the delivered width is `_ceilings.state`
  (`:4280`) whatever the argmin says. Two consequences. **`state` on a run-in frame means the
  SCHEDULE, not `_stateCamZoom()`** — `_ceilings.state` is reassigned to `_runInCeiling` at `:4249` —
  so LATE-LEAD-HUNT-1's gloss of its own 95.3% figure is wrong even though the figure is right. And
  **`guarantee` on a run-in frame means the guarantee asked for a WIDER shot and was overruled.** That
  reading is what makes §4's 62.1% interesting, and **it has not been verified against a live frame in
  this block** — the probe carries `scheduled` and `wouldHave`, and the hunt stored neither.
- **`garden-path` remains entirely unmeasured** — 0 of 120 races produced a finishing order, a fourth
  consecutive sweep. Every figure here rests on nine tracks, and its heading appears above from
  geometry alone.
- **Everything inherited from LATE-LEAD-HUNT-1 carries its limits forward**: headless, a fixed camera
  seed, consecutive-integer seeds rather than a random sample, unequal track weighting, and a body
  bound that is a circle on the larger drawn dimension.
- **The u→t mapping is exact in form but its parameter is smoothed.** `_runInProgress` is fed a
  least-squares fit over the trail and is clamped monotone, so a hit's implied leader-`t` range is
  accurate to the fit, not to the frame. It changes no direction call in §1, where the closest track
  to a boundary sits 33° away from one.

---

## 9. SOURCE HYGIENE, AND VERIFICATION

**READ-ONLY.** No production file was touched. The diff is this report, its INDEX line, one BACKLOG
requirement, and three diagnostics under `scripts/diag/`.

**NO RACES WERE RE-RUN, as instructed.** All 1,435 hits are read from the JSON LATE-LEAD-HUNT-1 left
in `c:/tmp/late-lead-hunt`. The only fresh computation is **static track geometry** — the shape and
`finishT`, read by constructing a race without ever stepping it. **The re-slice reproduces the hunt's
own figures exactly**, which is the check that it is reading the same corpus: 1,435 hits, 250 in
Group A and 1,185 in Group B, Group C empty, P1 ×114 in Group A, `state` tightest on 95.3% of all
off-frames and `guarantee` on 3.6%, and the camera anchored on somebody else on 82% of Group A's
frames.

**ONE FIGURE IN THE BRIEF DID NOT REPRODUCE.** Group A's median length is **32 frames**, not 29
(mean 30.3, n = 250, hit-weighted). The 82% anchor figure reproduces exactly when frame-weighted, as
the hunt reported it. The BACKLOG entry uses the recomputed value.

**NO FINGERPRINTS, NO BROWSER GATE, NO CLIENT SUITE — a reason, not an omission.** Nothing changed
that any of them can see: the four instruments hash the race, the director's decisions and the draw
call sequence from the shipped defaults, and this block alters none of those. It adds no config key
and moves no default.

| guard | result |
| --- | --- |
| `check-doc-links` · `check-index` · `check-config-claims` · `check-language-closed` · `script-suite` | PASS |

---

## 10. BUILD VS SPEC — conformity

| the spec asked | status |
| --- | --- |
| re-group every hit by DIRECTION | **done** — §4, all 1,435 |
| state at the top how the axis was established; do not assume it from the label | **done** — §1, and the label was wrong on three tracks |
| per direction: races, positions, duration, progress, width term, anchor | **done** — §4 table |
| how often is a racer alongside the leader out of frame, and how often is he the winner | **done** — 211 races / 16.7%; the winner in 15 (1.2%), 12 of them at the line (0.95%); the "alongside" caveat is §8's first entry |
| river-run seed 49 gets its own worked example | **done** — §3 |
| same mechanism as the along-track cases, or a separate fault? | **done** — §6, separate, on four readings |
| does the earlier timing split survive? | **done** — §6: Group A survives, Group B does not |
| establish at source what bounds the picture across the track, and whether the full width is guaranteed | **done** — §7, and the answer is NO, on two independent grounds |
| **ADDENDUM** — across-track counts BOTH sides | **done** — §5, both captured, split 59/41 |
| **ADDENDUM** — say whether the stored direction records the downward case at all | **done** — §5, it does; all four branches are live in the data |
| **ADDENDUM** — if only one side was captured, treat as a lower bound and say what would fix it | **done** — §5, applies to space-sprint alone; the fix is named |
| **ADDENDUM** — the same for the along pair, behind and ahead | **done** — §5, ahead is 7,805 frames and is the glide |
| **ADDENDUM** — seed 49: which side did the winner leave on, and did anyone leave on the other? | **done** — §3: the winner over the **top**, P4 over the **bottom** |
| record the owner's phase rule as a REQUIREMENT with its date; propose nothing | **done** — `docs/BACKLOG.md`, dated 2026-08-24 |
| record what the measurement says about cost and benefit, and what is NOT known | **done** — in the same entry |
| no fingerprints, browser gate or client suite, with the reason | **done** — §9 |
| across-track hit list FIRST | **done** — §2 |
| what the data could not support · source hygiene · conformity · proposals | **done** — §8, §9, §10, §11 |
| push the branch; merge the report and the requirement | **done** |

**Two corrections to the brief, flagged rather than absorbed.** Group A's median is 32 frames, not 29
(§9). And the earlier report's "off the left / behind" is not a description of this corpus — on
space-sprint `left` is across-track and on city-circuit it is ahead (§1).

---

## 11. PROPOSALS — candidates, each costed against the forward view

**His requirement that the leader sits behind the middle so one can see ahead is NOT under revision.
Every cost below is stated against it.**

**1. The across-track fault should be worked separately from BOTH along-track groups, and it is the
only one of the three that is not already explained.** The glide is understood and the back-edge loss
is the forward view's measured price, which he has never objected to. The sideways loss is neither.
**Cost against the forward view: none — the forward view is a placement ALONG the track and says
nothing about the across axis.** This is the one direction in the report that is free of the
trade-off LATE-LEAD-HUNT-1's §8 described.

**2. The across-track width should be expressed in the track's OWN road width, not in the shared
reference.** (Mine.) §7's table is the argument: the same setting delivers 0.76 roads on
mountainstreet and 2.06 on searound, a 2.7× spread with no author behind it — the identical complaint
`zoomUnit.js` was built to answer on the along axis, unaddressed on the across one because the unit
is measured on the short SCREEN axis rather than perpendicular to the road. **Cost:** it would widen
the shot on the four tracks currently narrower than their road, which is a visible change and
therefore his eye first.

**3. Nobody has asked him whether the road should bound the run-in.** §7 shows it does not, on two
separate grounds, one of which is a decision he made — CAMERA-COMPANY-ONLY-3, *"the road is not who
matters, the racers are"*, taken on 2026-08-05 **for the mid-race single-anchor shots**. It has never
been put to him for the closing shot, where the finish is a fixed place on the road and the field
arrives at it side by side. **Cost of asking: one question.** Cost of assuming the 2026-08-05 answer
carries over: this report's 12 races.

**4. The probe should say WHICH TERM PRODUCED THE WIDTH on a scheduled frame, because today it does
not.** (Mine.) §8 gives the code path: `binding` is an argmin that is bypassed whenever the schedule
composes, and that is 100% of the frames any endgame diagnosis reads. It has already cost this strand
one wrong gloss — LATE-LEAD-HUNT-1's reading of its own 95.3%. The probe already carries `scheduled`
and `wouldHave`; the fix is to record them, not to compute anything new. **Cost:** none to the
picture; it is diagnostic-only, and `_framingProbe` is read by nothing in the camera.

**5. The departure record should keep four overhangs, not one winning side.** (Mine.) §5's single
lower bound and §8's searound doubt are the same defect: `top → bottom → left → right` throws away
everything after the first true branch, and it does so in the direction that flatters across on eight
tracks and along on the ninth. Four numbers in the same loop remove both. **Cost:** a wider stored
record; no change to any picture.

**6. The count worth having per race is "how many top-5 finishers were visible at the line, and how
many were cut ACROSS the road".** (Mine — the second half is new; LATE-LEAD-HUNT-1 proposed the
first.) Direction is what separates a shot he accepts from one he does not, and this report needed a
1,260-race sweep and a geometry pass to recover it. The director knows the finishing order, its own
transform and the heading at the line. **Cost:** none to the picture; one more instrument to keep
honest.

**7. The four tracks with the tightest across-track room are the eye-test set, and river-run is the
one to start on.** (Mine.) It carries 75 of the 275 across-track hits and 6 of the 15 winner cases —
more than any other track — and §2 lists seeds that leave on each edge. **Cost: none; it is a viewing
order, not a change.**
