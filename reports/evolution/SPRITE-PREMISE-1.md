# SPRITE-PREMISE-1 — the 2.9× is CONFIRMED, the zoom is bit-identical, and the number means something narrower than it reads

**Measure only. Nothing built, no default moved, no product file touched.** One new instrument,
`scripts/diag/sprite-premise.mjs`, and this report.

**THE VERDICT, BEFORE THE WORKING.** LEADER-LAG-TRUTH-1's claim **stands**. The 2.9× is real, it is
**not** zoom, it is **not** a racer-count mismatch, and ALONG-RESIDUAL-1's sprite recommendation does
**not** fall. But the brief's suspicion was pointing at something true: the phrase *"space-sprint's
sprite is 2.9× river-run's"* invites a reading — the rocket is a bigger object — that the measurement
does not support. **The rocket is 2.881× LONGER and exactly 1.000× as WIDE.** It is not a big sprite;
it is a long thin one, and the excess lies entirely along the axis the along-track residual is about.

---

## 1. WHICH QUANTITY THE 2.9× COMPARES — drawn SCREEN pixels, read out of the instrument

Not re-derived from a number that lands near 2.9. The column the claim is taken from is
`half-length (median)` in LEADER-LAG-TRUTH-1 (d) — 131.4 on space-sprint, 45.6 on river-run,
131.4 / 45.6 = **2.882**. That column is computed at
[`leader-lag-truth.mjs:137`](../../scripts/diag/leader-lag-truth.mjs#L137):

```js
const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;   // effX = proj.effX(cd.zoom)
```

**So it is DRAWN SCREEN PIXELS AT THE DELIVERED ZOOM** — the third of the brief's three candidates,
and the one that does carry zoom inside it. The brief's reading of *what* was compared is correct.

**At which moment:** the median over every mid-race `LEADER_ZOOM` frame — `u ≥ 0.10`, before the
endgame threshold, run-in and finish mode excluded — across ten tracks × ten races, seeds 1–10, at
**20 racers**. It is not a single-moment reading, and it is not taken in the endgame.

Screen px factorise exactly, which is what makes the claim checkable rather than arguable:

> halfLen = (drawnBodyLengthPx / 2) × effX  ⟹  ratio_screen = ratio_world × ratio_effX

## 2. THE WORLD-BOX ARITHMETIC — the rocket half is right, the duck half is wrong twice over

Read from the racer types **this install runs**,
[`RocketRacerType.js:28`](../../client/src/modules/racer-types/RocketRacerType.js#L28) and
[`DuckRacerType.js:52`](../../client/src/modules/racer-types/DuckRacerType.js#L52):

| | brief assumed | **this install** |
|---|---|---|
| rocket displaySize / bodyFillX / bodyFillY | 47 / 0.278 / 0.801 | **47 / 0.278 / 0.801** ✓ |
| duck displaySize / bodyFillX / bodyFillY | 44 / 0.500 / 0.750 | **36 / 0.875 / 0.875** ✗ |

**There is no drift between a harness table and the runtime to report: no harness table exists.**
Every instrument on this driver reads the racer-type registry directly (`rt.config.bodyFillX` in
`camera-fingerprint.mjs`, `camera-replay.mjs`, `check-ending-frame.mjs`). The measured corpus used the
runtime values above, taken through `resolveIdentity`'s `track-default` sentinel against each track's
own `defaultRacerTypeId` — **rocket for space-sprint, duck for river-run**.

**And the formula is wrong independently of the values.** `displaySize × bodyFill` is not how the
runtime builds the world box.
[`headlessRaceSimulator.js:198`](../../client/src/modules/headlessRaceSimulator.js#L198) does:

```js
drawnBodyLengthPx = effectiveBodyNarrow * (bodyFillLong / bodyFillNarrow);
```

where `effectiveBodyNarrow` comes from `computeBodyNarrowRef` — **the auto-scale, whose stated job is
that "every racer type at the same N and W_ref gets the same visible narrow-axis size on screen"**
([`rowLayout.js:237`](../../client/src/modules/rowLayout.js#L237)). The nominal `displaySize` is
therefore consumed by the normalisation and **divides out**. What survives into the long axis is the
type's **aspect ratio**.

Computed through the real function at W_ref 285, N = 20, `DEFAULT_AUTO_SCALE_CONFIG`:

| | narrowDS | cap at maxScale 2.5 | **bodyNarrow** | aspect (long/narrow) | **drawnBodyLengthPx** |
|---|---|---|---|---|---|
| rocket | 13.066 | 32.665 | **28.500** | **2.8813** | **82.117** |
| duck | 31.500 | 78.750 | **28.500** | **1.0000** | **28.500** |

**Neither is clamped** — both land on the shared target `(2 × 285) / racersPerRow = 28.5`, because
both tracks are 300 world px wide (so both get W_ref 285) and both corpora ran 20 racers. The narrow
axes are made **identical by design**, and 82.117 / 28.500 = **2.8813 = 0.801 / 0.278**, the rocket's
own aspect ratio, on the nose.

**So the brief's conclusion "nothing about the rocket is intrinsically large" is half right and the
half that is wrong is the half that matters.** In width the rocket is not large — it is exactly the
duck's size, 28.5 world px, and no arithmetic on `displaySize` will show that because the auto-scale
has already erased `displaySize`. In length it is 2.881× the duck, and that is intrinsic to the
sprite's shape, not to any camera setting.

## 3. RACER COUNT, SHOT, AND ZOOM — measured on the same frames

**(a) The racer count does NOT differ. Checked first, as the brief asked.** Both corpora are
**20 racers**, seeds 1–10, the same camera seeds derived from the race seeds. LEADER-LAG-TRUTH-1's own
header states 20 racers for all ten tracks, and this probe re-ran both tracks at n = 20 and reproduced
131.4 / 45.6 exactly. **The 2.9× compares two races run at the same field size.** Hypothesis (a) is
refuted, and it was the right one to check first.

**(b) The shot in force at mid-race is the same shot.** Over every frame at u ∈ [0.45, 0.55], not just
the `LEADER_ZOOM` ones:

| track | LEADER_ZOOM | OVERVIEW | BATTLE_ZOOM |
|---|---|---|---|
| space-sprint (3,643 frames) | **80.6%** | 13.9% | 5.5% |
| river-run (3,548 frames) | **83.1%** | 8.2% | 8.7% |

Both are `LEADER_ZOOM`-dominant to within three points. Hypothesis (b) is refuted.

**(c) THE ZOOM IS BIT-IDENTICAL.** This is the decisive row, and it is exactly what the brief
predicted from the four geometric facts:

| quantity | space-sprint | river-run | ratio |
|---|---|---|---|
| **halfLen (SCREEN px)** | **131.4** | **45.6** | **2.881×** |
| drawnBodyLengthPx (WORLD px) | 82.117 | 28.500 | **2.881×** |
| drawnBodyWidthPx (WORLD px) | 28.500 | 28.500 | **1.000×** |
| **effX at delivered zoom** | **3.20000** | **3.20000** | **1.000×** |
| **cd.zoom** | **2.13333** | **2.13333** | **1.000×** |

**MULTIPLYING THE PARTS BACK OUT: world 2.8813 × effX 1.0000 = 2.8813, against the measured screen
ratio 2.8813. Residue 0.0000% of a ratio point.** Identical in the u ∈ [0.45, 0.55] window, because
`drawnBodyLengthPx` is fixed per race and `effX` does not move. **There is no unaccounted input.** The
whole of the 2.9× is world extent along the heading; the zoom contributes exactly nothing.

The zoom's inputs are identical too, which is why: `leaderZoom` 2.1333, `referenceCorridorPx` 300,
`referenceWidthPx` 300, `trackWidthPx` 300, projection `axisX`/`axisY` 1.5 — **every one the same on
both tracks.** The global settings meet identical geometry and produce identical zoom, precisely as
the brief reasoned they should.

## 4. GIVEN GLOBAL SETTINGS AND NEAR-IDENTICAL GEOMETRY, WHAT ACTUALLY DIFFERS

Two things, and neither is a camera setting. **Described, not proposed against.**

**FIRST — the racer type the track declares, through its aspect ratio.** `space-sprint` declares
`rocket` and `river-run` declares `duck`. The auto-scale equalises their narrow axes to 28.5 world px,
so the only shape information that survives to the screen is the ratio of long to narrow: **2.8813 : 1
for the rocket, 1.0000 : 1 for the duck.** A square racer and a racer nearly three times as long as it
is wide, drawn at the same width, in the same shot, at the same zoom. This is per-track content — the
track's `defaultRacerTypeId` — not a camera decision, and the camera has no knowledge of it.

**SECOND — the track's ORIENTATION in the frame, which is what makes the aim room differ.** The
companion figure in the same LEADER-LAG-TRUTH-1 table, "room the aim leaves ahead", reproduces here
exactly: **261.8 px against 446.6 px, 41.4% less**, and so does the tolerance it feeds
(261.8 − 131.4 = **130.4**; 446.6 − 45.6 = **401.0**). That room is measured from the aim point to the
nearest frame edge **along the heading**, so it is bounded by the frame's 1280 px width when the
heading runs horizontally and by its 720 px height when it does not. Measured:

| | space-sprint | river-run |
|---|---|---|
| \|ux\| — how horizontal the heading runs | **0.354** | **0.951** |

**river-run's leader runs almost straight across the frame; space-sprint's runs diagonally.** Same
frame, same zoom, same settings — a diagonal heading simply has less room to the edge. This is how the
path is drawn in the world, and like the racer type it is per-track content.

So the two tracks are identical in every camera-facing quantity the brief listed — open, 300 px wide,
same field size, same shot, same zoom — and differ in two things the camera does not choose: **what
shape the racer is, and which way the road points.** Path length (19,772 vs 13,061) is not among the
causes; it is not an input to zoom and, as the brief anticipated, 1.5 cannot make 2.9.

## 5. WHAT ALONG-RESIDUAL-1's SPRITE RECOMMENDATION RESTS ON NOW

**It does not fall. It rests on firmer ground than the sentence it was written from, and on a
narrower claim.**

- **What is withdrawn:** any reading of "2.9× sprite" as *the rocket is a bigger object in every
  direction*. In the narrow axis the two are the same to the digit (28.5 = 28.5). Because the widths
  are equal the AREA ratio is also 2.881, but the **diagonal** ratio — the closest thing to "how big
  is it" — is **2.157×**, and the width ratio is **1.000×**. The brief's instinct to compare diagonals
  was the right instinct; it was applied to the wrong numbers and through the wrong formula.
- **What survives, and is stronger for being exact:** the rocket is **2.881× longer along its
  heading**. The along-track residual is, by construction, the leader being lost **ALONG the track** —
  the same axis. **The one dimension in which this sprite is exceptional is the one dimension the
  fault is measured in.** ALONG-RESIDUAL-1's P1 is therefore better targeted than its own wording
  claimed, not worse.
- **And the gate is unchanged.** MARGIN-PER-TRACK-1 established that the bare-box residual `r0` is the
  only column any change has been shown to move; it is 591 on space-sprint against **0** on river-run
  at N = 30. That gap now has a measured cause with no unexplained remainder: a 2.881 : 1 sprite on a
  diagonal road, against a 1 : 1 sprite on a straight one.

**Nothing here is an argument that the camera should be further away.** The zoom is identical on both
tracks and is doing exactly what the global settings ask of it; establishing why the picture is tight
on space-sprint is not establishing that it should not be. The sprite floor and `visibleCorridors` are
untouched and unproposed-against, per the brief.

## WHAT WAS NOT RUN, AND WHAT DETERMINED THE ANSWER (R15e)

**Client suite, browser gate, all four fingerprints, the 80-race sheet: NOT RUN.** The diff is one new
file in `scripts/diag/`, this report, an INDEX correction and a BACKLOG restatement. **No product code
is in it** — no engine, no config, no client source — so no fingerprint is in reach, the browser gate
does not apply, and the client suite cannot answer differently. R15c and R15a.

## PROPOSALS

**P1 — state the sprite claim as LENGTH wherever it is repeated.** "2.9× the sprite" was misread once,
by a careful reader, straight into a hypothesis about zoom. "2.88× the drawn LENGTH, same width"
cannot be misread that way and is the same measurement.

**P2 (mine) — the auto-scale's erasure of `displaySize` deserves to be known before anyone reasons
about sprite size again.** Two of the three arithmetic errors in the brief came from it, and it is
counter-intuitive in a specific way: a racer type's `displaySize` and `bodyFill` numbers **do not**
give its world box at race time. Anyone sizing a sprite change must go through
`computeBodyNarrowRef`, or measure `drawnBodyLengthPx` off a running race as this probe does.

**P3 — heading orientation is an unexamined per-track variable with a measured 41% effect on aim
room.** It is not proposed as a lever here — it is track geometry the owner drew — but it is currently
recorded nowhere, and it is the second half of why space-sprint's tolerance is 130 px against
river-run's 401.
