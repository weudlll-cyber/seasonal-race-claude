# ANCHOR-MISS-1 — the aim is right, the smoothing is honest, and one of the four terms is neither

> **READ-ONLY. PROPOSE ONLY. Nothing was built, and nothing tracked by git was modified.**

**The guarantees reason from a position they SHOULD have — the aim itself is exactly right, proven to
0.0000 px on 39,712 frames — and the largest part of the 74 px miss is the honest cost of smoothing
toward it.** But the miss is not two components, it is **four**, and one of them is a position the
guarantee should not have: **the lateral guarantee's own shift, decided later in the same function,
never fed back.** On master that term is the *entire* remaining company shortfall, while the
smoothing term is not merely innocent — **removing it makes the shortfall worse.**

So the answer to the brief is **not one verdict but a split**, and the split is the finding. Two of
the four terms are "should have", one is a small honest artefact of the zoom lag, and one is
**wrong**. Only the last is a defect, and it is worth **0.0–1.8% of LEADER_ZOOM frames** per track.

---

## 1. THE MECHANISM — where the aim comes from, and where the frame goes

`_anchorScreen(frameW, frameH, t)` (`CameraDirector.js:3238`) is the one place this director obtains
an aim. It returns a **screen** point: the frame centre displaced along the subject's screen heading
by `(effFrac − 0.5) × span`, where `span` is the frame's chord in that direction and `effFrac` is
`leaderForwardFrac` reduced by the room floor. It is a pure function of frame size, heading and two
config keys — **it contains no world coordinate and no zoom**, which is exactly what lets the company
guarantee ask "where will the anchor be?" before the width is known. All seven aim sites in the
director route through it, and `anchorScreenPoint` is not importable under its own name in that file
— AIM-ROOM-REPAIR-1's shape.

Five guarantees measure their room from that point: `companyGuarantee`, `corridorGuarantee`,
`pointGuarantee`, `pairGuarantee`, `contenderGuarantee`. The order inside `_setTargets` is:

1. `subjects.point` is replaced by the racing-line centreline point (`pinAcross`, CAMERA-LATERAL-1).
2. `panTarget` is passed through `_smoothFocal` — **`subjects.point` is not**.
3. the ceilings are computed, each from `_anchorScreen` and from `subjects.point`; `Math.min`
   composes them.
4. `_applyLeaderForwardBias` moves the pan target backward along the heading by the mirror of the
   aim's displacement.
5. `_applyLateralGuarantee` shifts the pan target across the heading.
6. `_resolvePanTarget` centres that target and clamps the camera to the world bounds.
7. the pan smoother eases `offsetX/Y` toward `targetOffsetX/Y`.

**Steps 5, 6 and 7 all happen after step 3. Step 2 happens before it and is still not modelled by
it.**

---

## 2. THE 45 / 59 / 74 DECOMPOSITION, AND WHY IT DOES NOT ADD UP

The three published numbers (AIM-ROOM-LOST-1, on `ship/aim-room-floor-1`, space-sprint, the 1,480
LEADER_ZOOM frames where the promise was broken *and* `state` was the argmin):

| symbol | definition | recorded p50 |
|---|---|---|
| total | \|anchor at the delivered offset − `_anchorScreen`\| | **74.22 px** |
| composition | \|anchor at `targetOffset` − `_anchorScreen`\| | **44.55 px** |
| lerp | \|anchor at the delivered offset − anchor at `targetOffset`\| | **59.22 px** |

They are magnitudes of a chain of **2-D screen vectors**. `total = composition + lerp` holds as
vectors, never as magnitudes: **44.55 + 59.22 = 103.77, which is 40% more than 74.22.**

**The dominant reason is geometric and checkable to two decimals — the two vectors are nearly
perpendicular:**

> √(44.55² + 59.22²) = **74.11 px**, against the recorded **74.22**. A 0.11 px, 0.15% agreement.

That is not a coincidence. Decomposing each vector into its **along-heading** and **across-heading**
parts, measured directly on master (LEADER_ZOOM, tracking, seeds 1..6, n=20):

| track | total along / across | composition along / across | lerp along / across |
|---|---|---|---|
| space-sprint | 65.79 / 6.36 | 8.10 / 5.59 | **57.61 / 0.89** |
| seatrack | 62.90 / 70.88 | 7.87 / **71.14** | **54.99 / 2.05** |
| river-run | 45.04 / 51.07 | 5.52 / **51.24** | **39.43 / 0.45** |
| city-circuit | 68.77 / 10.96 | 9.52 / 5.12 | **56.03 / 2.13** |

**The lerp is almost purely ALONG the heading** — the camera trailing a subject moving forward. **The
composition term is almost purely ACROSS it** — because the thing that produces it is a lateral
shift. Perpendicular vectors add in quadrature.

**The second reason is statistical and smaller: these are three medians of three different
distributions**, and the median of |a+b| is not recoverable from the medians of |a| and |b| even when
a and b are collinear. Per frame, |total| ÷ quadrature runs p50 1.05–1.13 across tracks. **Quadrature
explains essentially all of the published shortfall; the residual is the median-of-medians
artefact.**

### The original population could not be reproduced, and that is itself a result

Those three numbers were taken on `ship/aim-room-floor-1`, **before COMPANY-HEADCOUNT-1's repair and
before the room floor shipped**. On master the same filter yields **89 frames out of 37,188
candidates, against 1,480 then** — the population has been all but eliminated by the repairs since.
What does reproduce is the general figure: the median anchor miss across ten tracks on all
LEADER_ZOOM tracking frames is **59.6–96.2 px**, median-of-medians ≈ 71 px. **The 74 px is a real
property of the mechanism, not an artefact of that population.**

---

## 3. IT IS FOUR TERMS, NOT TWO

An exact, signed, four-way decomposition. **The residual is 0.00 px at p50, p90 and max on every
frame of every run below** — the identity closes, which is the check that makes the table worth
reading:

```
delivered anchor − _anchorScreen  =  AIM + SMOOTHER + LATERAL + CLAMP + LERP
```

LEADER_ZOOM, tracking phase, seeds 1..6, n=20, track-default racers, **54,274 frames**, medians in
screen px:

| track | frames | total | composition | └ smoother | └ lateral | └ clamp | lerp |
|---|---|---|---|---|---|---|---|
| garden-path | 3,410 | 59.58 | 9.39 | 6.73 | 0.00 | 0.00 | 48.52 |
| searound | 3,056 | 64.49 | 8.48 | 7.96 | 0.00 | 0.00 | 56.21 |
| river-run | 7,768 | 68.13 | 51.57 | 5.51 | **51.22** | 0.00 | 39.60 |
| dirt-oval | 4,843 | 68.99 | 11.97 | 7.71 | 4.42 | 0.00 | 55.25 |
| space-sprint | 7,258 | 70.52 | 10.71 | 8.10 | 5.57 | 0.00 | 57.96 |
| mountainstreet | 7,351 | 72.22 | 47.11 | 6.57 | **46.57** | 0.00 | 47.12 |
| city-circuit | 4,039 | 72.34 | 11.52 | 7.88 | 5.12 | 0.00 | 56.34 |
| luger-hill | 6,072 | 84.38 | 62.23 | 7.23 | **61.85** | 0.00 | 52.10 |
| ice-track | 3,871 | 88.64 | 50.25 | 8.46 | **48.60** | 0.00 | 60.06 |
| seatrack | 6,606 | 96.15 | 71.65 | 7.87 | **71.14** | 0.00 | 55.30 |

### (a) THE AIM — right, and it is a proof rather than a measurement

`anchorScreenPoint`'s displacement and `_applyLeaderForwardBias`'s world shift are the same
arithmetic run in two directions. Comparing where the bias actually put the anchor — evaluated at the
zoom the bias was sized at — against `_anchorScreen`:

| track | LEADER_ZOOM frames | p50 | p90 | p99 | **max** |
|---|---|---|---|---|---|
| space-sprint | 10,886 | 0.0000 | 0.0000 | 0.0000 | **0.0000** |
| seatrack | 8,920 | 0.0000 | 0.0000 | 0.0000 | **0.0000** |
| mountainstreet | 11,092 | 0.0000 | 0.0000 | 0.0000 | **0.0000** |
| city-circuit | 8,814 | 0.0000 | 0.0000 | 0.0000 | **0.0000** |

**Zero to four decimal places on 39,712 frames, glide frames included.** The aim and the pan agree by
construction, which is what `framingRule.js`'s contract claims and what AIM-ROOM-REPAIR-1's wiring
made true. **Whatever else is wrong here, the target is not.**

### (b) THE PAN LERP — 40–60 px, along-track, and it is the honest cost

The camera is aiming at the right point and has not arrived. Nothing in a per-frame guarantee can
plan around it without predicting the future. `framingRule.js` already reasons this way about the
*zoom* lag and argues it is safe-directional; it says nothing about the *pan* lag, which is this
term. **§4 shows the pan lag is not merely tolerable but currently net-beneficial.**

### (c) THE SCALE LAG — a fourth term nobody has named

The bias is a **world** displacement sized at the target zoom; the frame is drawn at the live zoom.
`_resolvePanTarget` re-resolves the *centring* at the live zoom (RUNIN-ORDER-FIX-1) but the bias's
world offset is not re-sized:

| track | tracking p90 / max | glide p50 / p90 / max |
|---|---|---|
| space-sprint | 0.12 / 12.39 | 5.27 / 69.91 / 94.58 |
| seatrack | 0.004 / 11.57 | 14.95 / 77.25 / 103.99 |
| mountainstreet | 1.26 / 40.73 | 16.57 / 76.64 / 125.22 |

**Negligible while tracking; tens of pixels through a glide**, which is ~6–8% of LEADER_ZOOM frames.
Recorded, not diagnosed further.

### (d) THE WORLD-BOUNDS CLAMP — the cause previously offered, and it is almost never there

`anchorScreenPoint`'s docblock says it deliberately does not model the clamp, and COMPANY-HEADCOUNT-1
§5 offered "a clamp or a shift" as the composition's cause. **Measured: the pan resolve clamps on
0.00% of tracking frames on nine of ten tracks, and on 6.36% on dirt-oval alone.** The composition
term is the **shift**, not the clamp.

### (e) THE FOCAL SMOOTHER — 5.5–8.5 px, on ~100% of frames, and it is in nobody's story

`subjects.point` is set to the raw centreline point at `CameraDirector.js:4585`; `panTarget` is
passed through `_smoothFocal` at `:4595` and **`subjects.point` is not**. The guarantees therefore
measure every racer's world offset from a point the frame is not built on. Small — 5.51–8.46 px at
p50 — but present on essentially every frame, along-track, and **unlike the lateral shift there is no
circularity: the smoothed point exists in the same scope, ten lines above the ceilings.**

---

## 4. WHAT IT COSTS — and the counterfactual has INVERTED since AIM-ROOM-LOST-1

Same frame, same delivered zoom, frame translated so the anchor lands where the guarantees assumed.
Promise = `minRacersVisible` racer centres on canvas, live field only:

| track | frames | broken, delivered | broken, anchor at the aim | broken, composition removed only | broken, **lerp removed only** |
|---|---|---|---|---|---|
| mountainstreet | 7,351 | **1.796%** (132) | **0.000%** | **0.000%** | **1.945%** (143) |
| seatrack | 6,606 | **0.303%** (20) | **0.000%** | **0.000%** | **1.014%** (67) |
| space-sprint | 7,258 | 0.000% | 0.000% | 0.000% | 0.028% (2) |
| luger-hill | 6,072 | 0.000% | 0.000% | 0.000% | 0.000% |
| ice-track | 3,871 | 0.000% | 0.000% | 0.000% | 0.000% |

Three readings, and the third is the one that matters:

1. **Every remaining broken-promise frame on master is caused by the anchor miss.** Place the anchor
   where the guarantees assumed and the promise is kept on 100% of frames on all five tracks.
   AIM-ROOM-LOST-1's version of this counterfactual kept the promise on only 11.55%, and it correctly
   concluded the miss was *not* the mechanism **then**. The off-by-one it found instead has since
   been repaired, and **the anchor miss is now what is left.**
2. **The composition term is the whole of it.** Removing it alone — keeping the lerp exactly as it is
   — keeps the promise on 100% of frames.
3. **★ The lerp is not costing the promise; it is currently paying for part of it.** Removing the
   lerp alone makes things **worse** on both tracks that break (1.945% against 1.796%; 1.014% against
   0.303%). The camera trailing a point it is easing toward happens to sit where more of the field
   is.

Asked at the guarantee rather than at the picture — handing the product's own `companyGuarantee` the
anchor's delivered position instead of `_anchorScreen`:

| track | frames where the composed width would move | ratio when it moves (honest ÷ shipped), p50 / min |
|---|---|---|
| space-sprint | 13.63% | 1.11 / 1.00 |
| garden-path | 14.19% | 1.10 / 1.00 |
| city-circuit | 13.00% | 1.13 / 1.00 |
| seatrack | 9.90% | 1.09 / 0.90 |
| mountainstreet | 5.22% | **0.97 / 0.79** |
| river-run | 0.00% | — |

**Mostly the mis-aimed guarantee is over-cautious** — it asks for a wider shot than the delivered
anchor needs, which is the safe direction for "do not show emptiness" to fail in. **On mountainstreet,
the track that breaks most, it points the other way.**

---

## 5. MECHANISM AND JUDGEMENT, KEPT APART

**MECHANISM (what the code does — all of it measured above):** the aim is a pure screen fraction; the
forward bias inverts it exactly; four separate authorities then move the anchor off it — the focal
smoother before the ceilings, the lateral guarantee after them, the world-bounds clamp on one track,
and the pan smoother last; the four combine as vectors, two along-track and two across, which is why
their magnitudes do not add.

**JUDGEMENT, term by term. This is judgement, not measurement:**

- **The aim: SHOULD HAVE.** Not a defect. It is the position the pipeline is built to deliver and it
  delivers it exactly.
- **The pan lerp: SHOULD HAVE.** The honest cost of smoothing toward a correct target. §4 removes the
  last reason to suspect it.
- **The scale lag: minor, and deliberately called neither.** A real inconsistency — a world
  displacement sized at one zoom, drawn at another — but sub-pixel while tracking. In glide it is
  tens of pixels and it is **not** established that it changes any shot. Recorded.
- **★ The lateral shift: WRONG, and it is the one defect here.** `companyGuarantee` sizes a shot
  around an anchor that `_applyLateralGuarantee` then moves by a median of up to 71 px and a p90 of
  up to 145 px — **in the same function, thirty lines later, from a value the director already
  keeps.** It is the same family as every defect this arc has repaired: a true statement left
  standing while its premise moved beneath it. It is the entire remaining company shortfall.
- **The focal smoother: WRONG, and cheaper.** The anchor world point the guarantees measure from is
  not the world point the pan is built on. Worth 5.5–8.5 px universally, and **it involves no
  circularity at all** — the smoothed point is computed before the ceilings and simply is not handed
  to them.

**THE MITIGATION, stated because it belongs to the judgement and not to the finding:** the lateral
shift is **not available** before the ceilings. `_applyLateralGuarantee` needs the composed zoom; the
composed zoom needs the company ceiling; the company ceiling needs the anchor's screen position,
which the shift moves. **That is a genuine circular dependency, not an oversight** — which is why
this reads as "wrong" rather than "careless", and why any repair has to break the circle rather than
reorder two lines.

---

## 6. PROPOSALS — only for the terms that resolve to WRONG, and nothing is built

**P1 — the smoother, the cheap half.** Set the guarantees' anchor world point to the same point the
pan is built on, **or state in the code why it must not be**. One value, no circularity, and today
the two differ silently on every frame. **Whether it should be the smoothed or the raw point is a
picture decision, not a measurement** — the raw point is the true centreline, the smoothed point is
what the frame is actually built around, and this report proposes neither. **What is not defensible
is that the file asserts they are the same thing.**

**P2 — the lateral shift, one iteration, scoped.** Break the circle by evaluating it twice: compose
the ceilings, run the lateral rule, then re-run only `companyGuarantee` with the anchor's post-shift
screen position and take the tighter of the two widths. Cost: one extra call per frame in one state.
It would move the shot on 5–14% of LEADER_ZOOM frames and, per §4, **mostly toward a tighter shot,
not a wider one**. **It needs his eye before it needs code**, and the honest framing is: this buys
back the last 1.8% of frames where the promise of company is broken, and pays with a shot that
changes width on roughly one frame in ten.

**P3 — do neither, and record the account. Defensible.** The remaining shortfall is 0.0% on eight
tracks of ten and 1.8% at worst, after two repairs that each moved the picture. **A third change to
the framing rule before the owner has judged the second is the pattern this arc has already paid
for.** ANCHOR-ROOM-GAP-1 made exactly this call about a smaller version of the same inconsistency and
it was the right call.

**What is NOT proposed: moving the anchor back to the aim.** §4's counterfactual isolates blame; it
is not a design. The lateral shift exists to keep the corridor, the pair and the leader's own body in
frame, and undoing it would break those promises to keep this one.

---

## Limits

**Camera seed.** Every run used `scripts/lib/raceDriver.mjs`, whose default is the **product's own
`cameraSeedForRace(raceSeed)`** — the browser's derivation, **not** the fixed harness constant
1439767152. **No number here ran the fixed constant, and no number here ran the browser.** The camera
is not deterministic from the race seed, so a browser run would produce different frames; the
**structural** results (the aim identity, the four-term decomposition, which authority owns which
axis) are seed-independent, the **distributions** are not.

**Tree.** Measured while HEAD moved from `bf5546a8` to `d640b238`. The diff between them touches
nothing in `client/src/modules/camera/`, `client/src/modules/storage/defaults.js` or
`scripts/lib/raceDriver.mjs`, so no measurement is affected.

**Numbers taken from existing reports rather than re-measured:** 74.22 / 44.55 / 59.22 and the 11.55%
counterfactual, from AIM-ROOM-LOST-1 on `ship/aim-room-floor-1`; the correction history from
ANCHOR-ROOM-GAP-1; the pre-repair company shortfalls from AIM-ROOM-REPAIR-1. **That tree was not
re-run and no attempt was made to.**

**Scope.** LEADER_ZOOM only, glide frames excluded, tracking phase, mid-race window, twenty racers,
track-default racer type, six race seeds per track. **OVERVIEW, LEAD_CHANGE, BATTLE_ZOOM,
COMEBACK_ZOOM and PHOTO_FINISH were not measured at all**, and ANCHOR-ROOM-GAP-1's evidence says
COMEBACK_ZOOM is the state where anchor-versus-centre questions concentrate. `p.scheduled` frames are
excluded throughout, so the endgame and the run-in are outside this piece; `binding` is not read
anywhere here, so LATE-LEAD-AXIS-1's warning does not bite.

**What the glide exclusion hides.** ~6–8% of LEADER_ZOOM frames run in glide, where `targetOffset` is
resolved at the destination zoom while the frame is drawn at the live one. On those frames the
"clamp" and "lerp" buckets each take large values that cancel — **the total stays exact, the labels
do not.** The glide's own anchor account is not established here.

**What was not established.** Whether P2 would look right (no eye test, no fingerprint run, no
browser). Whether the composition miss costs anything the owner would **see** as opposed to anything
the promise counts — 132 frames on mountainstreet is roughly one frame in fifty-six, and no clipping,
step or centreline metric was run. What the scale-lag term does through a glide. Why the
honest-anchor counterfactual moves the width on 0.00% of river-run frames while moving it on 14% of
garden-path's. And whether any of the four terms behaves the same way in the states not measured.

**Instruments.** Four throwaway probes, written to and run from the session scratchpad and **not
added to the repository**. Each drives the real director through `scripts/lib/raceDriver.mjs` and
reads the live frame's own fields; the §4 counterfactual **imports the product's own
`companyGuarantee` and `COMPANY_FRAME_PCT` rather than reimplementing them**. The decomposition
identity closes to 0.00 px at max on every frame of every run; a run whose residual was non-zero
would have been reported as unusable.

**Checked independently before this landed**, rather than taken from the analysis: the quadrature
arithmetic (√(44.55²+59.22²) = 74.11 against 74.22), `_anchorScreen`'s line, the six reports cited
above all resolving, and the focal-smoother asymmetry at `CameraDirector.js:4585` and `:4595` that P1
rests on.
