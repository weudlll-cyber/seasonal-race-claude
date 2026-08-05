# FINISH-MOTION-1 — landing the seam, then making the finish move as one motion

**Stage 1** merged to master `597f3bdc` (`--no-ff`, full history) · **Stage 2** branch
`feat/finish-motion-1` @ `a65c013c`, PR #126, **awaiting the owner's eye** · **Date** 2026-08-05

---

## FOR THE OWNER — what happens now at the moment of the crossing

The moment the finish shot ends — the second racer crosses, or the drama pulse expires — **one
movement begins and everything is part of it.** The camera starts from exactly the framing it was
already in, and over three seconds it pulls back to the wide shot **while** travelling to the point
300 pixels behind the line, arriving at both at the same instant. It starts from a standstill,
speeds up through the middle of the move, and eases to a stop — it never steps.

What it used to do: on the single frame the shot changed, the picture **jumped 2708 pixels**
sideways — more than two screen widths — and only then began zooming out, with the pan finishing
well before the zoom. That is the jump you saw, and it is gone: the same journey, over the same three
seconds, but the fastest single frame is now **72 pixels instead of 2708**, and the fastest moment is
in the middle of the move rather than at its start.

**Nothing else changed.** The camera comes to rest in exactly the same place as before — measured on
every track — so the view of the pursuers arriving is the shot you already like. The winner running
on past the line still cannot drag the camera after him.

**How long it takes is one knob**, the one that already meant it: *Finish overview zoom-out duration*
on the Dev Screen, default 3000 ms. It now times the whole move rather than just the zoom.

---

## 1. CONFORMITY

| Spec | Asked | Delivered | Deviation |
|---|---|---|---|
| §1 stage 1 | Fingerprints unmoved on the final committed state, measured after the format pass; CI green; merge `--no-ff`; delete branch; no archive tag | camera `7a33faf2ec131437`, render `73ba53ba9fea12c7`, world `dc4647be0f55ebdb` — all unmoved. CI run **31026093097** green. Merged `597f3bdc`, branch deleted at origin | none |
| §1 phase tag | "no phase tag unless you argue for one" | **Not created, and I do not argue for one**: `pre/finish-seam` already anchors the return point and the merge commit is findable by message. A tag per merge dilutes a register that is guarded in both directions | none |
| §2 measure first | Frame-by-frame, ≥2 tracks, a number | New harness, **9 tracks** (see §3 on the tenth), plus a decomposition that shows *which term* moved | none |
| §2 hypothesis | Verify, do not adopt | **Partly refuted** — the jump is real and at the predicted moment, but not by the predicted mechanism. §3.2 | **stated, not smoothed over** |
| §2 one motion | Pan + zoom, one duration, together | One smoothstep ease drives both — together by construction, not by tuning | none |
| §2 glide not step | An ease; propose values; a knob if warranted; **no knob per sub-motion** | smoothstep over `finishOverviewZoomOutDurationMs`. **No new knob** — the existing one now times the whole move | none |
| §2 keep the lookback | Do not remove it | Kept, and the resting frame is measured identical on every track | none |
| §3 runout constraint | Keep it, say how | Kept **structurally** — §4.3 | none |
| §3 false comments | Fix in the same commit | Three sites, all one intent in three representations — §5 | none |
| §3 tests | Both positions; assert the PATH | 5 path tests, all verified failing against master | none |
| §4 verification | Camera+render move on purpose, re-mint; world unmoved; suite green; owner's eye | Camera re-minted; **render did NOT move, and that is a gap I report rather than a pass** (§6); world unmoved; 3634 green; eye pending | **render** |
| §5 report | Conformity, jump before/after, fingerprints, ease+duration reasoning, corrected comment | This file | none |

---

## 2. STAGE 1 — the merge

| | base `b363bd94` | final `47aff34f` |
|---|---|---|
| camera | `7a33faf2ec131437` | `7a33faf2ec131437` ✅ |
| render | `73ba53ba9fea12c7` | `73ba53ba9fea12c7` ✅ |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` ✅ |

Measured after the pre-commit hook's format pass. CI at origin: run **31026093097**, success, 3m27s,
obtained via PR #125 (`ci.yml` triggers only on master pushes and PRs targeting master; the merge
itself was `--no-ff` locally). Merged as `597f3bdc`; `feat/finish-seam-1` deleted at origin.

---

## 3. THE MEASURED JUMP

New read-only harness: **`scripts/finish-motion-truth.mjs`**. It drives the real director through the
shared race driver (ONE-DRIVER-1, so the race identity is printed with the numbers) and records, per
frame, the change in `offsetX/offsetY` — which *are* the screen-space translation the renderer
applies, so no camera model is reconstructed. It writes nothing back and cannot move a fingerprint.

### 3.1 Before and after, all measurable tracks

Entry-frame pan, in screen px:

| Track | before | after | peak per-frame during the move (before → after) |
|---|---:|---:|---|
| City Circuit | 3132.2 | **0.0** | |
| Dirt Oval | 2708.1 | **0.0** | **2708 → 72** (at frame +0 → +90) |
| Ice Track | 2691.2 | **0.0** | |
| Luger hill | 2606.2 | **0.0** | |
| Mountainstreet | 1550.7 | **0.0** | **1551 → 162** (at frame +0 → +90) |
| River Run | 1410.8 | **0.0** | |
| Searound | 2209.5 | **0.0** | |
| Seatrack | 1681.6 | **0.0** | |
| Space Sprint | 2723.7 | **0.0** | |

On dirt-oval the entry frame was **144× the median of the six frames before it** (18.7 px) and 12×
the median of the frames after. **Total travel over the move is unchanged** — 8708 → 8619 px on
dirt-oval, 19592 → 19446 on mountainstreet — so this is the same journey in the same time,
redistributed from an instantaneous step into an eased travel. The peak moving from frame +0 to
frame **+90 of a 180-frame move** is the smoothstep landing its maximum exactly at the midpoint.

**The tenth track: Garden Path is not measurable and it is not a camera fault.** Its race never
finishes inside the driver's 200-second ceiling at this identity (`finishedCount` is still 0 at frame
12000), so there is no finish to observe. Noted in §7 — it is a race-length oddity worth someone's
attention, but it is not this block's.

### 3.2 The hypothesis was half right, and the decomposition is what settles it

The brief predicted: `_setTargets` replaces the pan target with the lookback point outright, so the
screen-space target snaps while the T-space anchor glides.

**What the measurement says:**

```
frame  hud              lerp      obs        dPan   dTarget      lag     camT   targetT
 5217  PHOTO_FINISH     tracking  follow     18.5      17.8    111.6   1.9393    1.9389
 5218  FINISH_OVERVIEW  entry     idle     2708.1    2819.7      0.0   1.9400    0.9542
```

- **`camT` barely moved** (1.9393 → 1.9400). The T-space anchor did *not* jump — it behaved exactly
  as its comment claimed.
- **`dTarget` = 2819.7 px.** The pan TARGET moved. The offset-vs-target lag closing (112 → 0)
  accounts for only ~4% of the jump, so this is not a lagging offset snapping onto a stationary
  target either.
- Reading the director's own probe: the resolved camera world position `camX` moved **396.7 px** in
  that frame while the anchor point it frames moved **6.5 px**.

So the jump is at the predicted **moment** and in the predicted **quantity** (the pan target inside
`_setTargets`), but the named line is not the culprit — `followsCamT` overrides that lookback
assignment on the entry frame, so the target was never the lookback point at all.

**The actual cause is one function away.** FINISH_OVERVIEW was the single state *exempted* from the
transition grammar (`finishGlide`), on the reasoning that it "already had" its own slow zoom-out.
That exemption left it on the entry path — where `offsetX` is **pinned** to `targetOffsetX` every
frame, deliberately, so the camera follows the track rather than cutting across the infield. A pinned
offset cannot absorb a moving target; it reproduces it exactly. So when the framing switched from the
outgoing shot's (pair anchor, its guarantee, its lateral shift) to OVERVIEW's, the whole difference
appeared on screen in one frame.

I am flagging this as a partial refutation rather than a confirmation because the difference matters:
the brief's repair would have been to interpolate the lookback assignment, which would have fixed
nothing.

---

## 4. THE REPAIR

### 4.1 The shape

**The finish move glides like every other transition, with its own duration.** The grammar's glide
branch interpolates zoom *and* both offsets from the captured pre-transition framing to the
destination framing using **one** ease factor. "At the same time" therefore holds *by construction*
rather than by tuning two mechanisms to agree — which is the property the brief asked for and the
reason this is the right shape rather than a convenient one.

It is deliberately **outside `transitionGrammar`**: a `cut` finish is not a thing anyone wants, and
the finish is an authored moment rather than an ordinary state change.

### 4.2 Ease and duration, and what I compared

**Ease: smoothstep `s²(3−2s)`.** The requirement follows from the complaint rather than from taste —
the owner's objection is the abrupt *start*, so the ease must have **zero velocity at s=0**. That
rules out linear (constant velocity: a jolt at both ends) and ease-out (maximum velocity at the
start: the complaint in softer form). Smoothstep is zero at both ends, and it is already the shipped
ease for every other transition glide, so the finish is not a special *shape* — it is the same
grammar at a longer duration. Measured confirmation that it behaves as claimed: the peak per-frame
motion lands at frame **+90 of 180**, the exact midpoint.

**Duration: `finishOverviewZoomOutDurationMs`, unchanged at 3000 ms.** I deliberately did not retune
it. This block changes the *shape* of the move; changing its *length* in the same commit would put
two variables in front of the owner's eye at once, and the total settling time measured before and
after is already comparable (dirt-oval pan 318 → 310 frames, zoom 306 → 306). If he wants it slower,
the slider is already on the Dev Screen and now stretches both halves together — asserted by a test.

**No new knob**, per the brief. The one that existed already meant "how long the finish zoom-out
takes"; it now means "how long the finish move takes", which is the same sentence with the scope
corrected.

### 4.3 How the runout constraint is preserved — and it is now stronger

The camera must not be dragged past the line by the winner's runout. Previously this was achieved by
following the leader's T and then **suppressing him** with a `fT = null` special case in `update()`,
one function away from the framing it protected.

Now the finish move **releases `_camT` entirely**. With no T-space anchor, `_setTargets` takes its
lookback branch and the destination is a **fixed world point**. The winner cannot pull the camera
because the winner is not the anchor at all. That is structural rather than a special case, and it is
asserted directly: a test moves the winner 0.3 laps past the line after the move lands and requires
the target framing not to move.

### 4.4 What I measured and rejected

My first attempt set `_observerPhase = 'follow'`, copying the ordinary glide. That switched on
OVERVIEW's FORWARD framing, and the harness showed the **resting frame moving 108 px off the lookback
point** — about a quarter of the widest shot, i.e. a visibly different view of the pursuers arriving.
The owner's complaint is how the camera *gets* there; where it comes to rest must not change. The
phase now stays `'idle'`, and the resting position is measured identical on every track:

| | City | Dirt | Ice | Luger | Mtn | River | Searound | Seatrack | Space |
|---|---|---|---|---|---|---|---|---|---|
| centre → lookback, before | 0 | 0 | 0 | 4 | 8 | 26 | 0 | 0 | 0 |
| centre → lookback, after | 0 | 0 | 0 | 4 | 8 | 26 | 0 | 0 | 0 |

---

## 5. THE CORRECTED COMMENT — and it was three, not one

The brief flagged one false comment. There were three sites, and together they are the same defect as
the week's others: **one intent in three representations, one of them repaired and the others left
asserting the old story.**

1. **The false claim.** In `update()`, on the branch that lerped `_camT` toward the lookback point:

   > *"Still lerp `_camT` toward it so the pan glides from the winner's position to the lookback
   > point **in parallel with the zoom-out**."*

   The T-anchor did glide. The pan on screen was not derived from it on the frame that mattered, so
   the picture stepped 2708 px and only then zoomed. **Removed**, with a note stating what it claimed,
   why it was false, and that the parallel motion it described is now real and is the glide.

2. **`_transitionTargetT = lookbackT`** in `_transition` — the lookback point expressed a *second*
   time, as a T-space target, beside its expression as a pan anchor in `_setTargets`. Now inert
   (`_camT` is released) and **removed**.

3. **`_lfEntryByState[OVERVIEW] = tcToLerpFactor(finishOverviewZoomOutDurationMs / 3450)`** — the
   duration expressed a *third* time, as an exponential time-constant on a **shared** map. It was
   also a permanent mutation that nothing ever restored, so every later OVERVIEW entry in that race
   inherited the finish's slow entry TC. **Removed.**

All three were verified dead before removal: the harness produced byte-identical numbers on all nine
tracks with them present and with them gone.

---

## 6. FINGERPRINTS AND VERIFICATION

| | before | after | |
|---|---|---|---|
| camera | `7a33faf2ec131437` | **`ab731df15724ab5d`** | moved ON PURPOSE, re-minted in `CameraDirector.js` and `CAMERA_DIRECTOR.md` |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unmoved — no engine touched |
| render | `73ba53ba9fea12c7` | `73ba53ba9fea12c7` | **unmoved, and this is a GAP, not a pass** |

**Why the render fingerprint is blind here, stated rather than left to be discovered.** The harness
drives `RUN_FRAMES = 3400` and samples at frames `[0, 90, 600, 1500, 2400, 3300]`. The finish occurs
at frames **3466–5218** on the tracks measured. So the render fingerprint never reaches the finish
phase on any track — the most authored moment in the game is entirely outside its coverage. It did
not "confirm no render change"; it could not have seen one. Backlogged.

Re-measured after the pre-commit hook's format pass. Suite **3634 / 3634** (179 files).

**Tests — the path, not the endpoint.** Three tests that asserted the old *mechanism*
(`_lerpPhase === 'entry'`, `_camT` lerping) are **inverted into five that assert the motion**, because
their intent is still the intent and it belongs where the owner sees it:

- the move is one glide on the finish duration, with no T-anchor
- **it does not jump**: frame 1 is still at the outgoing framing — *paired with* "and it has moved by
  the end", because a camera that never moved would pass the first half perfectly
- **the path**: at 25/50/75% the pan is strictly between start and end, strictly increasing, and pan
  and zoom progress within 0.1 of each other
- the duration stretches **both** halves (2000 ms vs 6000 ms, both fractions differ)
- the runout cannot pull the camera after the move lands

**All five verified failing against master** (`5 failed | 10 passed` with the old source and the new
tests) — the sabotage check this repo requires.

---

## 7. NOTICED, NOT FIXED

- **The render fingerprint cannot see the finish phase** (§6). The cheapest fix is a second sample
  set that runs past the finish, or one sample expressed as "the frame after FINISH_OVERVIEW begins"
  — which the harness's own header argues against (fixed indices, never events), so this needs a
  decision rather than a patch.
- **Garden Path does not finish** within the driver's 200 s ceiling at n=40 / 60 s requested. Nine of
  ten tracks measurable. Unrelated to the camera; worth someone asking why a 60-second race exceeds
  200 seconds of simulation.
- **`_camT` is left non-null on the pre-finish states** and simply unused after the finish move
  releases it; harmless, since FINISH_OVERVIEW is absolute and no further transition occurs.
- **`framesUntilPanCalm`-style thresholds are misleading on an exponential approach.** My first
  version of the metric reported "settles in 1 frame" for a motion that had barely begun. Replaced
  with a journey-completion measure before any conclusion was drawn from it — recorded because the
  first number was wrong and briefly believable.

---

## 8. PROPOSALS

### P1 (brief's) — is this a fourth lesson, or a fourth sighting?

**A sighting, and I would not add a lesson for it.** L201 (the Half-Repair Law) already names this
exactly: one value, several readers, one fixed — and the fixed one vouches for the rest. Here the
value is "the finish move", the readers were the T-space target, the pan anchor and the lerp-map TC,
and the repaired one (the `_camT` glide, fixed by an earlier block that left a note saying so) is
precisely what made the comment persuasive while the picture disagreed.

What this sighting *does* add is a sharper detection rule, and I would rather append it to L201 than
mint L205: **the tell is a comment that asserts a behaviour the fingerprint cannot see.** "Pans in
parallel with the zoom-out" was unfalsifiable by any instrument this project had — the camera
fingerprint hashes per-frame values but nothing compared *rates of change*, and the render harness
never reaches the finish. A claim about MOTION needs an instrument that measures motion, and until
this block there wasn't one. That is why it survived a refactor that touched the file repeatedly.

A lesson per sighting would dilute the canon; a lesson that gains a detection rule per sighting gets
stronger. I have not edited LESSONS.md in this block — that is the owner's call, and I would make it
a one-paragraph addendum to L201 rather than a new entry.

### P2 (brief's) — the shape that makes the NEXT finish change cheap

Named, **not built**, exactly as instructed — it must not ride along inside a change his eye is
judging.

Today the finish move is assembled from effects scattered across `_transition` and `_setTargets`: a
lerp phase, a duration, an observer phase, a released `_camT`, and an anchor branch three hundred
lines away. It works and it is now consistent, but *changing* it still means knowing all five.

The shape that would make the next change cheap is a **named motion object** — one description of the
finish move that says: where it starts (the framing at the crossing), where it ends (the anchor: the
lookback point), how long it takes, and what ease. Something like:

```
FINISH_MOVE = { from: 'current framing', to: anchorAt(lookbackT),
                durationMs: finishOverviewZoomOutDurationMs, ease: smoothstep }
```

The payoff is specific, not aesthetic: **the owner's next three likely requests each become one field
edit.** "Hold on the winner for a beat before pulling back" is a delay field. "End somewhere else" is
the anchor. "Make it slower at the end" is the ease. Today each of those is a hunt through five sites.

The cost is honest too: it is a second motion vocabulary living beside the grammar, and if only one
motion ever uses it, it is a framework for one customer. I would build it **when the second authored
move appears** — not before, and not inside a block under eye test.

### P3 (mine) — the instrument gap is the real finding, and it generalises past the camera

This defect survived repeated refactoring of `CameraDirector.js` because **no instrument measured
motion.** The camera fingerprint hashes per-frame state, which is why it happily recorded a 2708 px
step as just another frame; the render fingerprint stops before the finish. A per-frame *derivative*
is a different measurement from a per-frame *value*, and this project had the second and not the
first.

`finish-motion-truth.mjs` is now that instrument for one phase. The cheap generalisation is a
**motion-continuity check across the whole race**: flag any frame whose pan displacement exceeds N×
the local median, outside of deliberate cuts. Deliberate cuts are enumerable (the `cut` grammar,
LEAD_CHANGE's snap), so everything else is a candidate defect. I would expect it to find more than
one — the same pinned-offset-plus-moving-target pattern exists at every entry into a T-space-lerped
state; the finish was merely the one with the largest framing discontinuity and the only one the
owner watches closely.

That is a measurement block, not a fix block, and it should be chartered as one.

### P4 (mine) — measure the resting frame in every camera block, not just this one

The 108 px regression in §4.4 was caught only because I happened to add an end-position metric while
chasing something else. Nothing in the suite or the fingerprints would have flagged it: the camera
fingerprint *would* have moved, but it moves on purpose in any behaviour block, so the movement would
have been read as intended.

**A fingerprint that is expected to move stops being a guard for everything else that moved with it.**
The cheap countermeasure is to state, in any block that re-mints, one or two *specific* invariants
that must NOT move, and measure them — here: "the resting frame stays on the lookback point on every
track". That converts a re-mint from "everything is allowed to change" into "these named things are
not", at the cost of a few lines per block.

---

## 9. HANDOVER — the owner's eye test

**Read the build pill first.** It must say **`build a65c013c · feat/finish-motion-1`**. If it says
anything else, or `build unknown`, stop and restart the dev server — a verdict on an unidentifiable
build is what this project has already paid for twice. The dev server has been restarted for you and
was serving that exact identity a moment ago.

Three lines:

1. **Track: Dirt Oval or Mountainstreet** — the two with the largest measured jump (2708 px and
   1551 px), so they are where the change is most visible.
2. **Settings: keep `photoFinishCloseThresholdT` 0.15 and `photoFinishLeadProgress` 0.85** — nearly
   every race then ends in the photo finish, so you do not have to wait for one.
3. **Watch the single moment the tight shot ends.** The picture should start moving from a standstill
   and pull back *while* it travels, arriving at the wide shot and the lookback point together —
   never a sideways snap followed by a zoom. Then check the part you already liked: the pursuers
   arriving should be framed exactly as before.

If the move now feels too slow or too fast, that is one slider — *Finish overview zoom-out duration*
— and it stretches both halves together.
