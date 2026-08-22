# CAMERA-CURVE-1 — how the camera drives the whole track

**2026-08-22 · branch `invest/camera-curve` off master `22b64630` · INVESTIGATION ONLY — no camera
change, no key, no fix.**

**SKIPPED, per R15, and what determined each answer:** the 80-race sheet, the browser gate, the four
fingerprints and the client suite — this block adds one report-only diagnostic under `scripts/diag/`
and touches no file in any of their reach, so no fingerprint can move and none was measured.

---

## THE ANSWER TO QUESTION 1, IN ONE SENTENCE

**No — the camera drives the curves. Through every bend on space-sprint the delivered path follows
the target's to within 1–8 world px, at most 1.0% of the frame width, and the straights are the
control at 0.2%; the corner-cutting the brief describes is REFUTED, and what he is seeing through the
last big bend is a ZOOM, not a pan.**

---

## 1 · THE METHOD, AND WHY THIS MEASURES SOMETHING NOTHING ELSE DID

Every camera number this project has is a distance or a per-frame step. Those cannot see a chord: a
smoother can sit 200 px behind on the path at every instant and still trace a perfectly round arc.

So this measures the **perpendicular distance from the delivered centre to the target's own
trajectory** — the nearest point of the path, not the distance to the target point. A camera that is
late but round scores 0 here, correctly. A camera that cuts the corner scores the width of the chord.

Both paths are reconstructed as world points from the dump: the world point at the canvas centre is
`((CW/2 − ox)/effX, (CH/2 − oy)/effY)`, and the target's is the same arithmetic at the TARGET's
offsets and the TARGET's zoom — mixing them would read a moving zoom as a pan error. **`effY` is
recovered from the projection the product itself builds**, not assumed equal to `effX`, which is
false on every non-square world (city-circuit: 0.8442).

**THE VIRTUAL CLOCK IS THE RIGHT ARM HERE AND THAT IS AN ARGUMENT, NOT A CONVENIENCE.** His machine
delivers 1200 frames at p50 16.7 ms, max 17.5, **zero over 20 ms**. A fixed 1/60 s step is therefore
a *better* model of his machine than the harness's own real clock, which drops 28.6% of frames
(RACE-JUDDER-1). **(c) is excluded for him by his own measurement and is not offered again.**

---

## 2 · THE BEND-BY-BEND TABLE — space-sprint, seed 9, his config and roster, whole race

Segmented by the curvature of the target path; every segment of 30+ frames, in race order.

| # | kind | progress | len px | curvature | maxDev | of frame | peak at | delivered/target turn rate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | bend R | 0.229–0.240 | 131 | 0.00145 | 1 px | 0.3% | 66% | 0.74 / 1.30 |
| 4 | bend R | 0.280–0.290 | 105 | 0.00109 | 1 px | 0.2% | 73% | 0.68 / 1.39 |
| **5** | **bend R** | **0.299–0.311** | **141** | **0.00603** | **8 px** | **1.0%** | **100%** | **3.63 / 7.13** |
| 7 | bend R | 0.391–0.403 | 122 | 0.00195 | 1 px | 0.2% | 84% | 0.90 / 2.03 |
| 8 | bend R | 0.410–0.433 | 269 | 0.00169 | 2 px | 0.4% | 74% | 0.95 / 1.40 |
| 10 | bend R | 0.538–0.557 | 216 | 0.00091 | 1 px | 0.3% | 0% | 0.66 / 1.24 |
| 13 | bend L | 0.651–0.668 | 189 | 0.00079 | 1 px | 0.3% | 63% | 0.51 / 0.76 |
| 14 | bend L | 0.677–0.722 | **544** | 0.00128 | 2 px | 0.6% | 64% | 0.93 / 1.21 |
| 16 | bend L | 0.795–0.803 | 90 | 0.00090 | 1 px | 0.2% | 47% | 0.48 / 0.97 |
| **17** | **bend L** | **0.819–0.837** | **206** | **0.00083** | **1 px** | **0.2%** | **77%** | **0.65 / 0.96** |

**THE STRAIGHTS, AS THE CONTROL:** every one is 0 px, 0.0–0.2% of the frame — except segment 19
(below). **The worst bend is 8 px and the worst straight is 51 px: the ratio is 0.16, i.e. the bends
are BETTER than the straights.** That is the control doing its job, and it is the sentence the brief
asked for: the bend is not the story.

**WHERE THE LAST BIG BEND FALLS IN THE RANKING.** Segment 17 (p 0.819–0.837) is the last bend of the
course, and it ranks **sixth of ten by deviation at 1 px = 0.2% of the frame**. The longest bend on
the track, segment 14 at 544 px, deviates 2 px. **Nothing about the last bend is exceptional, and
that comparison is why the whole course was measured.**

**The heading-rate column says the same thing from the other side.** Through every bend the DELIVERED
centre turns *more slowly* than the target (0.65 against 0.96 on the last bend; 3.63 against 7.13 on
the sharpest) — which is what a smoother does, and it is a lag along the path, not a departure from
it. The paths coincide; the camera is simply a little behind on it.

---

## 3 · THE ONE IN-RACE ANOMALY, AND IT IS NOT A BEND

Segment **19, p 0.934–0.944, classified STRAIGHT** by curvature (0.00014): **maxDev 51 px = 4.0% of
the frame, with the delivered centre turning at 18.14 rad/s against the target's 1.99 — nine times
faster.** It is the only in-race segment where the delivered path leaves the target's, and it turns
too *fast*, not too slowly.

**What happens there is the run-in engaging.** From the dump, frame by frame:

| ms | progress | corridors | state / binding / lerp | composing |
| --- | --- | --- | --- | --- |
| 76750 | 0.9286 | — | LEADER_ZOOM / — / **glide begins** | **true** |
| 76833 | 0.9301 | 1.368 | LEADER_ZOOM / company / glide | yes |
| 77300 | 0.9383 | 2.888 | LEADER_ZOOM / **state** / glide | yes |
| 77900 | 0.9491 | 6.594 | LEADER_ZOOM / state / glide | yes |
| 78000 | 0.9508 | — | LEADER_ZOOM / — / tracking | yes |

**The shot opens from 1.37 corridors to 6.59 — a factor of 4.8 — in 1250 ms, and the offset travels
8454 px while it does.** That is the run-in's opening move, authored, on `runInOpenMs`. It is by a
wide margin the largest sustained camera movement anywhere outside the photo finish.

**The 51 px "deviation" here is an artefact of measuring a path while the zoom is changing by a
factor of five**, and it is reported as measured rather than as corner-cutting: with the frame width
changing that fast, "the world point at the canvas centre" is not tracing a trajectory in any useful
sense. **What is established is the zoom's magnitude and duration; the 51 px figure is NOT
independently meaningful and should not be quoted as a path error.**

---

## 4 · THE FAST MOMENT — question 3

Fastest delivered travel outside the endgame, in SCREEN px per frame:

| ms | progress | screen px/frame | world px/frame | Δln zoom | state / binding |
| --- | --- | --- | --- | --- | --- |
| 66050 | 0.7475 | **34.8** | 10 | 0.0138 | LEAD_CHANGE / state |
| 66017 | 0.7469 | 34.4 | 10 | 0.0150 | LEAD_CHANGE / state |
| 45033 | 0.3839 | 30.5 | 13 | **0.0347** | LEADER_ZOOM / state |

distribution: p50 9.5, p90 14.6, p99 20.6, max 34.8 screen px/frame.

**THE CENTRE BARELY MOVES AND THE PICTURE MOVES A LOT: 10 world px against 34.8 screen px.** Every one
of the fastest moments is dominated by the ZOOM term, not the pan. **So the fast travel he reports is
a fast zoom.**

**Three candidates fit his description and they are not equally likely:**

1. **The run-in's opening at p 0.929–0.951** — a 4.8× open in 1250 ms, 1.26 ln/s sustained for 75
   frames. **Most likely**, because it is the only *sustained* fast move in the race, it is what
   "one moment" describes, and it sits just before the last stretch where he was watching.
2. **p 0.3839, LEADER_ZOOM** — the fastest single instant at 2.08 ln/s and 53 px of on-canvas
   movement, but only ~16 frames long. A lurch rather than a travel.
3. **p 0.7475, LEAD_CHANGE** — the largest screen movement per frame, 34.8 px, again zoom-dominated.

**Is it the same cause as the bend question? No.** The bends are clean; the fast moment is the zoom.
They are two different observations and only one of them is a defect candidate.

---

## 5 · IS IT PARTICULAR TO SPACE-SPRINT? — one other track

**city-circuit, seed 9, his config — CLOSED, so the projection differs (effY/effX 0.8442) and is read
from the harness's own field-size rule rather than assumed.** 25 segments, 14 bends.

**Eleven of the fourteen bends deviate 1–6 px, exactly as on space-sprint.** Three do not:

| # | progress | maxDev | of frame | peak at | state |
| --- | --- | --- | --- | --- | --- |
| 23 | 0.876–0.893 | **127 px** | **17.5%** | 100% through | OVERVIEW |
| 4 | 0.082–0.089 | 37 px | 7.3% | 50% | LEADER_ZOOM |
| 3 | 0.054–0.062 | 27 px | 6.5% | 53% | LEADER_ZOOM |

**So the effect is NOT general — it is absent on space-sprint and present on three of fourteen
city-circuit bends**, two of them in the first tenth of the race and one at 0.88.

**What those three have in common is NOT established.** Two peak at the middle of the bend, which is
the corner-cutting signature; one peaks at the very end, which is not. The measured sign says the
delivered path runs OUTSIDE the target's on all three — the opposite of corner-cutting — **but that
sign convention was not independently validated in this pass and should not be leaned on.** The
honest statement is: **city-circuit has three bends worth a dedicated look, and this pass did not
establish their cause.**

---

## 6 · THE ANSWERS

**1 · Does the delivered path deviate through bends by an amount a viewer would see?**
**On space-sprint, no.** Worst bend 8 px = **1.0% of the frame width**; the last big bend 1 px =
**0.2%**; the straights 0–0.2%. A 1% displacement is not visible. **On city-circuit, three of fourteen
bends reach 6.5–17.5% of the frame**, and 17.5% would be visible — but that is a different track from
the one he reports, and the cause is not established.

**2 · Which term produces it?** **Not the pan smoother.** Through every bend the delivered path lies
on the target's path; the smoother is late along it, not off it. Where the picture moves fastest the
term is the **ZOOM** — 10 world px of centre movement against 34.8 screen px — reached through the
state's own zoom during a glide, and through the run-in's widen at p 0.929–0.951. The frames are in
§3 and §4.

**3 · What is the fast moment, and is it the same cause?** The run-in's opening glide, most likely: a
**4.8× open in 1250 ms**. It is not the same cause as the bend question, because there is no bend
defect on that track to share a cause with.

**4 · Would a shorter time constant fix it?** **No, and it would cost the whole race.** The deviation
through bends is 1–8 px; a shorter constant can only reduce a lag that is already invisible, and it
cannot touch the zoom, which is what actually moves the picture at the moments he describes. What it
*would* do is make every ordinary follow harsher on all ten tracks — the constant governs the whole
race, and `docs/CAMERA_DIRECTOR.md` §3a already records a rate limit being measured out for the
adjacent reason. **Not changed, and not recommended.**

---

## 7 · PROPOSALS

**P1 — measure the ZOOM's rate as a first-class quantity, because it is what moves the picture.**
Every bound in the camera's instrumentation is on width, position or a per-frame step; none is on
`d ln(width)/dt`. The measured range here is p50 ≈ 0.1 ln/s with peaks at **2.08 ln/s**, and the
run-in sustains **1.26 ln/s for 1250 ms**. The term that would move is the glide's own duration for
state changes (`glideDurationMs`) and `runInOpenMs` for the opening. **Cost where nothing is wrong:
none — this is a measurement first, and the values above are the distribution it would be set from.**

**P2 — price the run-in's opening against the shot it opens from.** 1.37 → 6.59 corridors in 1250 ms
is a factor of 4.8; on a track whose finish is nearer it is a factor of 1.5 in the same 1250 ms. The
duration is fixed and the distance is not. The term is **`runInOpenMs`**. **Cost: the widen must
FINISH at the endgame threshold — §3a — so lengthening it moves the start earlier, which eats into
the ordinary race; on tracks where the opening is small it would make a short move needlessly slow.**
Nothing should move until the trade is measured on all ten tracks.

**P3 — the three city-circuit bends deserve their own pass, with the sign convention validated
first.** The term suspected is the transition glide's interaction with a bend (all three sit in a
state that changes at or near the segment boundary), but **this pass did not establish it** and the
deviation's DIRECTION was not independently checked. **Cost: none — it is an investigation.** It
should not be merged into a fix for space-sprint, which has no bend defect to fix.
