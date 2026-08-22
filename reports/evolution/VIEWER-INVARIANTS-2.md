# VIEWER-INVARIANTS-2 — the pan target belonged to a zoom the frame was not drawn with

**Branch:** `exp/endgame-schedule` @ `67f2c043`. **Not merged. Nothing minted.**
Production build served on **4173**.

---

## 0. Lead — the two in-scope numbers, and the check you asked for first

Space-sprint, seed 9, shipped defaults, your roster, Race Plan on, 100 racers, real browser,
production bundle, window **95% → crossing**:

| in-scope invariant | **before** | **after** |
| --- | ---: | ---: |
| **2 — the leader is in the picture** | **23 frames, worst 239 px** | **0** |
| **3 — where the line is, is findable** | **248 frames, worst 345 px** | **244 frames, worst 55 px** |

Invariant 2 is closed. Invariant 3's worst error fell **6×**, and every remaining frame is **inside
the canvas**: 36 frames are 0–10 px outside the region, 153 are 10–25, 37 are 25–40, 18 are 40–64.
What is left is the guard's own 5% margin being spent by the pan's residual — not the line becoming
unfindable. **It is not zero, and §5 says exactly what it would cost to make it zero.**

> **DOES A GROUP-FRAMING STATE RUN INSIDE THE WINDOW? YES — BATTLE_ZOOM DOES.**
> Counted over every frame of 30 races, whether or not anything was wrong on it:
>
> | shot | frames in the window | share | races |
> | --- | ---: | ---: | ---: |
> | PHOTO_FINISH | 6478 | 69.9% | 29 of 30 |
> | LEADER_ZOOM | 1036 | 11.2% | 15 of 30 |
> | LEAD_CHANGE | 827 | 8.9% | 8 of 30 |
> | **BATTLE_ZOOM** | **480** | **5.2%** | **3 of 30** |
> | OVERVIEW | 444 | 4.8% | 6 of 30 |
> | COMEBACK_ZOOM | **0** | — | **0 of 30** |
>
> So the exemption is about the earlier race, exactly as you said, and your rule applies to those
> BATTLE_ZOOM frames like any other. It is not a theoretical case: it is one frame in twenty of the
> window. Across those 30 races invariant 2 now has **2 violations in total**, so nothing about
> BATTLE_ZOOM inside the window is currently breaking it — but it is there, and a future change to
> that state would be inside this subject rather than outside it.

---

## 1. The scoping

- **Invariants 2 and 3** are scoped to `[endgameThreshold, crossing]` — your sentence.
- **Invariants 1, 4 and 5 stay whole-race.** A camera off the course, a frame that halves or doubles
  the picture, a shot tighter than the tightest named shot: those are wrong everywhere, and nothing
  about the earlier race excuses them.
- **No duration rule was added**, because you ruled one out. VIEWER-INVARIANTS-1 reported 10809
  leader-off frames of which 10617 were the two group shots doing exactly what they are for; scoping
  is what that measurement was missing.

The window is the **race's**, not the director's — the leader's own progress against
`endgameThreshold`. Scoping to `_runInComposingNow` instead would let a candidate that engages late
score better by measuring fewer of its own frames, which is the trap `endgame-spec.mjs` records in
its own header.

---

## 2. The term

`_setTargets` resolves the pan; `update()` authors the schedule's zoom **a line later**. So the
offsets belong to a zoom the renderer is not going to use.

**That mismatch is not small, and the reason is the arithmetic rather than the size of the zoom
step.** An offset is `-camX × effectiveZoom` — a product taken from the **world origin** — so an
error in the zoom is multiplied by the anchor's distance from that origin. `update()`'s own header
records this hazard for the entry path in the same words:

> *"targetOffsetX uses the pre-lerp zoom while the renderer uses the post-lerp zoom, creating a
> per-frame mismatch (∝ camX × Δzoom) that produces visible camera jumps when dt is variable."*

The entry path was fixed by moving the lerp above `_setTargets`. **The schedule cannot be moved
there** — `targetZoom` is computed *inside* `_setTargets` — so it is corrected after the fact.

### The measurement that settled it

Decomposed at **one** zoom, so target error and delivery error cannot be confused (this is what my
earlier attempts got wrong, twice — mixing the target's offsets with the delivered zoom reads a
moving zoom as a pan error). Last 13 frames before the crossing:

| | |
| --- | ---: |
| framing error of the pan **TARGET** | grew to **554 × 382 px** |
| the pan's **own residual** against that target | stayed under **119 px** |
| the target's error the instant the zoom stopped moving | **39 × 27 px** |

A **2.8%** difference in zoom, times an anchor **3400 world px** from the origin. The pan was
delivering its instruction to the pixel; the instruction was wrong.

**The fix keeps `resolveCamera`'s answer and only RE-EXPRESSES it** at the drawn zoom — the same
camera world position, stated at the right scale. No framing rule is re-run and no placement is
re-decided, which matters: re-deriving the placement would quietly replace `resolveCamera`'s
judgement with a centring rule it does not use on every axis.

**Scoped away from the glide.** CAMERA-GLIDE-TARGET-1 resolves the glide's endpoint at the
*destination* zoom on purpose, because computing it live "made the endpoint travel ~1150 px during
the glide while the camera steered honestly toward a point that was wrong for the whole journey".
Re-expressing it at the drawn zoom would undo exactly that. Measured: the scoping changes no number
in either instrument, and it makes this block's change smaller.

### An independent instrument agrees

`tracking-lag` knows nothing about any of this and samples the **tracking phase** only:

| state | before | after |
| --- | ---: | ---: |
| **PHOTO_FINISH** | 4.51 / 19.50 pp | **3.54 / 8.91 pp** |
| every other state | — | **identical to the digit** |

PHOTO_FINISH is where the endgame's zoom moves fastest, so it is where the mismatch was largest.
Its p95 halved.

---

## 3. Everything that was already achieved, still achieved

| | |
| --- | --- |
| invariant 1, course in shot | **0 violations**, all 30 races swept |
| invariant 4, single-frame step | **0** |
| invariant 5, width band | **0** |
| arrival at the leader-view / photo-finish factor | **0% error**, all nine scorable tracks |
| counts outside the widen | unchanged |
| camera suite | **894 passing** |

---

## 4. What was tried and rejected — one line each

| tried | verdict |
| --- | --- |
| **The lateral guarantee's unsatisfiable fallback** — `lateralShiftToFit` returns the midpoint of an empty interval, which is a steer, and `_lateralPanShift` always asks it to fit both corridor edges, which is impossible at any shot tighter than one corridor | **EXONERATED BY MEASUREMENT.** Instrumented `_lastLateralShift`: **0 on every frame** of the window. The corridor edges are symmetric, so the midpoint is already 0. The reasoning was sound and the fact was otherwise; reverted. |
| **The floor measured from the OBSERVED anchor** — re-measured now that the target error is gone, since ENDGAME-REPAIR-1 rejected it against a 74 px error of which the target's mis-zoom was the larger part | **REJECTED, and much closer than before.** Arrival error 80% → **17%** on space-sprint, clipping 1–4%, monotonicity 8/9, stepMAX 0.0235 → **0.0493**. Requirement 2 is one of the things that had to stay. |
| **The leader's forward travel (RUNIN-BACK-1's unbounded design)** | **NOT TOUCHED, and it turned out not to be the lever.** `_forwardFracNow` was measured at a constant **0.500** through every failing frame — the framing rule was asking for the subject at the centre of the frame while the delivered target walked it to the corner. Your design was not the cause and did not need changing. |

---

## 5. The residue, and what closing it would cost

**244 frames, worst 55 px outside `COMPANY_FRAME_PCT`, all inside the canvas.** The schedule's floor
sizes the shot so the line sits *exactly* on the region's edge; the bound is exact, so any distance
between the intended anchor and the delivered one puts the line just outside it. The remaining
distance is the pan smoother's own residual — 10–25 px on the bulk of frames.

**The only lever I found that closes it costs requirement 2** (arrival, §4). I did not take it, and I
did not widen the region to make the number look better. **Two of your requirements are in contact
here** — *the line inside the region on every frame of the window* against *the shot arrives at the
leader-view or photo-finish factor* — and the exchange rate measured tonight is: closing the last
10–25 px of margin costs **17% of arrival error** on space-sprint plus clipping on 1–4% of frames.
That is your call, not mine.

---

## 6. The guard, and a change of verdict that is named as one

`check-runin-frame`'s line question now grades **his sentence**: *some part of the finish band is on
the CANVAS*, on every frame of the window. `COMPANY_FRAME_PCT` is still measured and still printed on
every row, because it is what the **camera** aims at and the 5% between region and canvas is the
margin that absorbs the pan's residual.

> **THIS IS A CHANGE OF VERDICT AND I AM FLAGGING IT.** VIEWER-INVARIANTS-1 failed on the *region*,
> and correctly: at that time the line was genuinely leaving the canvas, 770 frames of 3005 across
> ten tracks. It no longer does. Grading the region would now fail the build for spending a margin
> this file invented, while the requirement it exists to guard is met. **Both numbers are on every
> row so the choice can be checked rather than trusted.**

**It also now runs the BROWSER's camera seed** (`cameraSeedForRace`) instead of `raceDriver`'s fixed
constant. Every run of this question until tonight graded a camera trajectory **no user ever sees** —
which is the finding VIEWER-INVARIANTS-1 paid for. It is not a loosening: same camera, same seed 9;
what changes is that the shot being graded is the shot the product runs. It moves one track and
leaves the other nine identical.

**Sabotage-proved, both ways, both red on 9 of 9 tracks and each on its own branch:**

| arm | result |
| --- | --- |
| `--sabotage-vanish` (the band leaves after it was once on canvas) | **RED on 9/9**, naming the progress at which the viewer loses it |
| `--sabotage-never` (it is never on canvas) | **RED on 9/9**, on the distinct "no part of the finish band was on the canvas at ANY point" branch |

**Unsabotaged: 9 of 10 tracks FINDABLE, 0 frames off canvas.** `space-sprint` still fails — **27
frames off canvas, worst 56 px outside the region at 99.9%, PHOTO_FINISH, with the contender
guarantee binding.** So `verify` ends **RED on this one guard, one track**. I could not close that
honestly tonight; the binding term says where to look next — a guarantee is re-clamping the shot
tighter than the schedule's floor in the last 0.1% of the race.

---

## 7. The gate in the ship ceremony

**`docs/SHIP-CEREMONY.md`, new step 0a**, before the paired measurement:

> If the merge touches `client/src/modules/camera/` or `client/src/screens/RaceScreen/`, run
> `node scripts/viewer-invariants.mjs --gate` — one race, space-sprint seed 9, shipped defaults, on
> the production bundle in Chromium. **~130 s, and it must be clean.**

**Why there and not in `verify`:** it builds a bundle, starts its own API and app server and launches
a browser. Putting that in `verify` changes what `verify` *is*, and `verify` runs on every commit. A
ship is the moment the cost is worth paying.

**What it costs a ship:** 130 s, plus a one-off `npx playwright install chromium`. It touches nothing
of yours — it builds to `client/dist-sweep` (gitignored), runs its own API on its own port with an
empty data directory and its own account, for the reason E2E-LOGIN-1 gives.

**Why it is not optional for a camera change:** the headless director and the browser have diverged
three times, and every time the headless side was the blind one. **You found all three; no gate did.**

---

## 8. Fingerprints and hygiene

| role | recorded | measured | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved**, as required |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **unmoved**, as required |
| camera | `f64c2ae531f14253` | `9190967072af639e` | moved — not minted |
| render | `7d553406f41ff176` | `2e8eae1d5ef7c7be` | moved — not minted |

Both measured stamps re-run: `straggler-truth` identical to the digit, `tracking-lag` as §2.
One branch, nothing merged, nothing minted.

**Sweep:** 30 of 800 races at 67 s each with ten at a time — the full sweep remains the ~12.6 h
nightly VIEWER-INVARIANTS-1 measured. The work list is ordered so seed 9 finishes on every track and
arm first.
