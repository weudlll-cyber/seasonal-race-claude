# WINNER-CROSSING-1 — the crossing is PHOTO_FINISH's, and last night's switch already frames it

**Branch:** `exp/endgame-schedule`. **Not merged. Nothing minted. No camera code changed.**
Measured in the real browser on the production build, with the browser's own camera seed.

---

## 0. Lead — which state owns the crossing, and where the winner sits

> **THE BADGE IS NOT THE CROSSING.** Confirmed from the frames, not the badge:
> **PHOTO_FINISH owns the crossing on all 18 runs** — nine tracks × both configs. OVERVIEW never
> owns it. What his screenshot shows is the **AFTERMATH**, which begins **1.6–2.5 s after** the
> winner crosses. That is deliberate and named; §3.
>
> **WHERE THE WINNER SITS AT THE CROSSING, as a fraction of the frame:**
>
> | | today (`contentionWatch` off) | with the switch on |
> | --- | ---: | ---: |
> | **space-sprint** — the race he reported | **(0.48, 0.90)** — outside the subject's own region | **(0.51, 0.61)** |
> | ice-track | (0.75, 0.44) | (0.55, 0.45) |
> | searound | (0.64, 0.69), band 87.6% | (0.53, 0.58), band **99.5%** |
> | the other six tracks | already inside the region | unchanged or better |
>
> **Invariant 6 — the new check — goes 90 violations → 0.** All 90 are space-sprint, both configs.
>
> **NO CAMERA CODE WAS CHANGED. The fix already exists**: it is `contentionWatch`, built last night,
> and it is off by default. Flipping that default is a one-line change and it is your call.

---

## 1. What the frames say, per track

Crossing frame, seed 9, both configs. `garden-path`'s race never finishes at seed 9.

| track | state at the crossing | winner x,y — off → on | band % — off → on | invariant 6 |
| --- | --- | ---: | ---: | ---: |
| city-circuit | PHOTO_FINISH | (0.39, 0.45) → (0.45, 0.45) | 60.2 → 60.2 | 0 → 0 |
| dirt-oval | PHOTO_FINISH | (0.60, 0.81) → (0.61, 0.82) | 67.7 → 67.2 | 0 → 0 |
| ice-track | PHOTO_FINISH | (0.75, 0.44) → (0.55, 0.45) | 56.7 → 56.2 | 0 → 0 |
| luger-hill | PHOTO_FINISH | (0.69, 0.46) → (0.69, 0.46) | 50.8 → 50.8 | 0 → 0 |
| mountainstreet | PHOTO_FINISH | (0.56, 0.52) → (0.56, 0.52) | 40.3 → 40.3 | 0 → 0 |
| river-run | PHOTO_FINISH | (0.62, 0.47) → (0.54, 0.51) | 41.3 → 41.8 | 0 → 0 |
| searound | PHOTO_FINISH | (0.64, 0.69) → (0.53, 0.58) | 87.6 → **99.5** | 0 → 0 |
| seatrack | PHOTO_FINISH | (0.46, 0.68) → (0.46, 0.68) | 44.3 → 44.3 | 0 → 0 |
| **space-sprint** | PHOTO_FINISH | **(0.48, 0.90) → (0.51, 0.61)** | 72.1 → 70.7 | **45 → 0** |

Identical on his config and the shipped defaults on every row. **The winner is on canvas at the
crossing on all 18 runs** — so "half cut off" is not the crossing frame; it is the aftermath.

**Only space-sprint fails**, and it fails because the winner sits at **0.90 down the frame** — outside
the subject's own inner-0.7 region, which `framingRule.js` says "exists so the SUBJECT does not cling
to the edge". That is his sentence, already written down, and the winner is clinging to it.

**Why space-sprint and not the others:** PHOTO_FINISH frames the pinned pair, and its anchor is the
pair's midpoint. Where the second member is far back, the midpoint sits behind the winner and the
winner is pushed forward to the frame's edge. That is the same racer, the same pinning and the same
mechanism ENDGAME-WHO-AND-HOWMUCH measured: fifth place, 89 world px, about a second down.

---

## 2. Why our checks passed — and the check that now fails

**"Arrival: 0% error on every track" grades the ZOOM FACTOR.** It compares the delivered width to the
leader-view or photo-finish factor and says nothing whatever about what is in the picture. It was
green on his frame and would have stayed green if the winner had been off the canvas entirely.

**That is the third metric in this thread to be green against his eye** — after the 5-frame smoothed
smoothness figure that averaged away a 0.2206 ln jump, and the percentage that counted a black screen
as a twelfth of a share.

### Invariant 6 — the winner's crossing is framed on the winner

Two conditions, both from numbers that already exist:

| | condition | where the number comes from |
| --- | --- | --- |
| **not at the edge** | the winner is inside the SUBJECT's inner-frame region, `innerFramePct` = **0.7** | `framingRule.js`: the region "exists so the SUBJECT does not cling to the edge". **Not** `COMPANY_FRAME_PCT` (0.9) — that is the region a *companion* may sit near the edge of, and the winner at his own crossing is not company. |
| **the line with him** | some part of the finish band is on the canvas | the same test invariant 3 uses; no threshold |

**Scope.** "Not at the edge" is graded on the crossing frame and every frame after it for as long as
the shot that owned the crossing is still running, bounded by `runInOpenMs` — the endgame's own span
unit, no new number. **"The line with him" is graded on the crossing FRAME only**, and that is a
deliberate narrowing: once the winner is *past* the line it is behind him, and a shot that follows
him must lose it. Held over the whole window it failed 14 frames on the arm where the winner is
framed perfectly, every one of them after he was over — a condition that fails a build for doing the
right thing is the condition's defect.

### Sabotage-proved, and it fails on exactly his frame

| arm | invariant 6 |
| --- | ---: |
| **his build — space-sprint seed 9, `contentionWatch` off** | **45 violations**, worst *"the winner is at (0.592, 0.954) of the frame, outside the subject's inner 0.7 region"* |
| the same race with the switch on | **0** |
| `--sabotage-corner` (the winner forced to the corner) | 0 → **77** |
| `--sabotage-noline` (the band forced off canvas) | 0 → **2** |

> **AND THE CHECK CAUGHT ITS OWN BLINDNESS FIRST.** It reads `DEFAULT_INNER_FRAME_PCT` rather than
> carrying a copy, and the first cut imported it from the wrong module. The assertion beside it —
> "invariant 6 could not read the constants it grades against, so it would be measuring nothing" —
> stopped the run rather than letting it pass on `undefined`. That is the lesson of the NaN table in
> VIEWER-INVARIANTS-1, applied in advance rather than after.

---

## 3. OVERVIEW after the crossing is deliberate, and here is its name

`finishPhase.js` states it: **"AFTERMATH — FINISH_OVERVIEW. Absolute: once entered, no further camera
state is chosen."** Its job is named in the director too — it frames "the stationary point
FINISH_OVERVIEW frames **so later finishers cross in shot**". The winner running out of the picture
there is that design working: the shot is on the LINE, not on him.

**When it takes over, measured, his config:**

| track | hands over after | winner off canvas from |
| --- | ---: | ---: |
| mountainstreet | 1.60 s | — |
| seatrack | 1.68 s | 3.67 s |
| city-circuit / dirt-oval | 1.78 s | 4.17 s |
| river-run | 1.97 s | — |
| searound | 2.08 s | — |
| luger-hill | 2.33 s | — |
| ice-track | 2.40 s | — |
| space-sprint | 2.53 s | 4.10 s |

**So the handover is 1.6–2.5 s after the crossing, and the winner leaves the frame 3.7–4.2 s after
it, on three of nine tracks within the 4.3 s captured.** If what you photographed is that moment,
then the thing to move is the **handover**, not the framing — the aftermath is doing what it was
built to do, just sooner than the winner's moment has finished. That is a decision about the ending's
shape and it is yours; nothing here changes it.

---

## 4. What must not regress — it did not

Nine tracks, both configs, seed 9, real browser:

| | switch off | switch on |
| --- | ---: | ---: |
| invariant 1 — course in shot | 0 | **0** |
| invariant 2 — leader in shot across the window | 0 | **0** |
| invariant 3 — line findable | 3036 | **2431** |
| invariant 4 — width step / pan step | 0 / 0 | **0 / 0** |
| invariant 5 — width band | 0 | **0** |
| **invariant 6 — the winner's crossing** | **90** | **0** |

**Largest single-frame zoom step is unchanged at 0.0561 ln** (switch on, worst of nine) — this block
changed no camera code, so it could not move, and the fingerprints below say so.

---

## 5. What was built, and what was not

**BUILT:** the check. `viewerProbe.js` now records the crossing itself — who won, where he sits, how
much of the band is with him, and the frames either side — and `viewer-invariants.mjs` grades it as
invariant 6 with its own sabotage arms.

**NOT BUILT: a new framing mechanism, because the measurement says none is needed.** The requirement
— winner not at the edge, not cut, line with him — is met on all nine tracks and both configs by the
switch built last night. Adding a second mechanism for a defect an existing one already fixes would
be inventing work, and it would put two rules on the same quantity, which this thread has now paid
for three times.

**THE DEFAULT WAS NOT FLIPPED.** `contentionWatch` stays `false`, as CONTENTION-WATCH-1 built it and
as this brief instructs. Flipping it is the fix, it is one line, and per the ship ceremony a change to
shipped behaviour needs your eye first. **To see the difference in the served build, set
`contentionWatch: true` in the camera config; the badge and seed to watch are space-sprint, seed 9.**

**No conflict arose with `contentionWatch`.** The winner's framing does not need the released racers
back — it needs them *gone*, which is why the switch fixes it. That was the one outcome the brief
asked me to report rather than resolve, and it did not happen.

---

## 6. Fingerprints and hygiene

**No camera code changed** — only `viewerProbe.js` (inert without `?viewerprobe=1`) and the driver.
All four measured to confirm rather than asserted:

| role | recorded | measured | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unmoved |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | unmoved |
| camera | `9190967072af639e`¹ | `9190967072af639e` | unmoved |
| render | `2e8eae1d5ef7c7be`¹ | `2e8eae1d5ef7c7be` | unmoved |

¹ the values VIEWER-INVARIANTS-2 measured and did not mint; nothing on this branch has been minted.

**Camera suite 894 passing.** The two measured stamps were not re-run and did not need to be: their
`depends=` is `client/src/modules/camera/`, and this block changed nothing under it.
