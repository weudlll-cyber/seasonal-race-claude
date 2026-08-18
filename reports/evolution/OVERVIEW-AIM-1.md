# OVERVIEW-AIM-1 — what the camera aims at between the gun and the hand-over

**Branch:** `docs/overview-aim-1`, off master `30ee6d4d`. **READING ONLY.** No camera change, no key,
no new instrument. `CameraDirector.js` was read and never edited.

## YOUR READING IS REFUTED

**It is not the track's centre and it is not the middle of the world.** For the first three seconds
after the gun the camera aims at **the middle of the pack** — the field's centroid, every racer
averaged. `worldW/2 = 1536` is a coincidence of the oval's shape: dirt-oval's world is 3072 × 2047,
so its middle is `(1536, 1023)`, and **your target's y is 429 and 422 — about 594 world px away from
it.** Only x is near the middle, because the start straight is where the oval's centreline happens to
cross the world's mid-x. Your two readings are the field, sitting where the field was.

`follow% 0%` does not mean the camera has no subject. It means the phased observer is idle, which is
what puts the camera in the branch below.

## THE CODE PATH, AND THE ANSWER IS TWO ANSWERS

All in `client/src/modules/camera/CameraDirector.js`, inside `_setTargets`:

| window                | what the anchor is                                     | where                                  |
| --------------------- | ------------------------------------------------------- | -------------------------------------- |
| **gun → 3000 ms**     | **the field's CENTROID** — every racer averaged           | `CameraDirector.js:3091-3099` → `panTarget.js:73-79` |
| **3000 ms → 4983 ms** | **the LEADER's own position**, pinned across to the centreline | `CameraDirector.js:2008-2015`, then `:3128-3134` |

The first is the start-phase exception and it says what it is for in place:

> _"Before a leader exists, hold the whole field so nobody is cropped at the gun."_ — `CameraDirector.js:3092-3094`

Its condition is `raceState.raceElapsed < START_PHASE_DURATION`, and `START_PHASE_DURATION` is
3000 ms. When it lapses, nothing replaces it: `panTarget` falls back to `_framingSubjects`, whose
OVERVIEW case returns **`{ x: leader.x, y: leader.y }`** (`CameraDirector.js:2008-2015`), and
`pinAcross` then puts that point on the corridor centreline.

**The third exception, the one that exists to make exactly this kind of change smooth, is inert
here.** The entry-phase T-space pan — _"the camera travels along the racing line to its new subject
rather than cutting across the infield"_ (`CameraDirector.js:3104-3106`) — requires `_camT !== null`
(`:3044-3046`). `_camT` is only ever set inside `_transition`'s `!isRepeat` block (`:1611-1616`), and
the countdown deliberately keeps `stateEnteredAt` current so _"the first RACING update() sees a small
stateAge"_ (`:3735-3736`) — so the hold gate (OVERVIEW's 5000 ms) blocks every transition until
4983 ms. **`_camT` is null for the whole start window, so the smoothing branch never runs.**

**One more thing that is not what everyone assumed:** `leaderForwardFrac` never acts in this window
either. `_applyLeaderForwardBias` is gated on `_observerPhase === 'follow'` (`:3345`), and the
observer is `idle` throughout — the `bias` column is **0.0 on every frame of both runs below**. Where
the leader sits in frame during the start is not the framing rule placing him; it is the camera's
aim being somewhere else.

## THE CONFIRMING RUN — `gun-window-truth`, one closed and one open track

Existing instrument, nothing built. `dist` is the camera centre's distance from the racing line;
`lag` is world px between where the camera is and the target it was given.

**The three moments you asked for — and the step at the gun is ABSENT.**

| moment                        | dirt-oval (closed)                     | river-run (open)                      |
| ----------------------------- | -------------------------------------- | ------------------------------------- |
| formation (last ceremony frame) | centre `(1496, 436)` · dist **0.8**    | centre `(356, 1096)` · dist **36.4**  |
| **gun frame (0 ms)**          | moved **0.1** along, **0.0** across    | moved 1.4 along, 2.7 across           |
| one second later              | 132.7 along, −3.2 across · dist 2.1    | 9.3 along, 45.5 across · dist 9.2     |

**Nothing happens at the gun.** The camera is 0.1 world px from where the ceremony left it.

**The step is at three seconds, and it is on both track types:**

```
dirt-oval        lag   fieldX          river-run        lag   fieldX
  2750 ms       14.4    0.540            2750 ms       12.4    0.519
  3000 ms     **78.2**  0.511            3000 ms     **43.6**  0.511
  3250 ms       23.3  **0.349**          3250 ms       17.6    0.469
  3500 ms       16.5    0.320            3500 ms       13.9    0.459
```

`lag` spikes **5.4×** on dirt-oval and **3.5×** on river-run in the frame the anchor changes, and the
field then walks out of the middle of the picture — `fieldX` 0.540 → 0.257 by the hand-over. **That
is the forward rush.** It is not smoothing, not zoom, and not the hand-over: it is the subject
changing.

And the aim is on the road the whole time, which is the other half of the refutation: **0.8 world px
off the racing line against an 89 px corridor half-width** on dirt-oval. River-run reads larger
(33.7 at the gun) because the world-edge clamp is spending 184.8 px there; as the clamp relaxes to
0.0, `dist` falls to 2.7.

## THE FOUR ANSWERS, IN WORDS

**1 · What the camera aims at.** For the first three seconds after the gun it aims at the middle of
the pack; then, at exactly three seconds, it switches to aiming at the leader alone, and the pack
slides backwards out of the picture.

**2 · Design or oversight?** **Both halves are the design and both say so in the code.** The field
centroid is there so nobody is cropped at the gun; the leader is OVERVIEW's declared anchor in the
framing table. **The SWITCH between them is the oversight** — nothing eases it, nothing announces it,
and the one mechanism this project built to make an anchor change smooth is switched off at the only
anchor change the start has. That is evidence, not preference: the smoothing branch requires `_camT`,
and `_camT` cannot exist before the first committed transition, which the hold gate puts at 4983 ms —
**1983 ms after the anchor has already changed.**

**3 · What you are really being asked to decide.** Not "track or field" — the camera never shows the
track's middle. It is **when the pack stops being the subject**:

- **The picture you have.** The pack is the subject for three seconds, then the leader is. Two
  changes in the start: the subject at 3.0 s and the framing hold at 4.98 s, neither aware of the
  other.
- **The other picture.** The pack stays the subject until the leader has reached his place in frame —
  the same condition `feat/start-handover-mark-1` already computes. One change instead of two, at a
  moment chosen by where the leader is rather than by a clock.

I am not recommending either.

**4 · What a decision would touch, and what it would not.** It touches one thing: which anchor
OVERVIEW uses during the start phase, in `_setTargets`. **It does not touch the ceremony** (a
different method, `updateCountdown`, which has finished before the gun), **nor the formation shot**
(the ceremony's arrival framing and `_ceremonyHoldZoom` are a ZOOM, and this is a question about the
aim), **nor the hand-over switch, nor any other camera state.**

**One thing it WOULD touch, said plainly rather than discovered later:** the August fix's acceptance
numbers are measured inside this window — river-run's ALONG travel in the first second and the field
centre at 1 s. The fix itself is a zoom mechanism (the ceremony hold being a live target rather than
a leftover value) and is untouched by an anchor question, but **those two numbers would move and
would have to be re-measured**, because they describe the very frames an anchor change would alter.

## FINGERPRINTS

**Nothing changed, so nothing can move.** The diff is this report and its index line; no file under
`client/src` or `scripts/` is touched, so no instrument's closure contains a changed file. **Nothing
minted.** The build on 4173 was not touched.

## PROPOSALS

**None.** The brief allows them only if my reading turned out to be right, and it did not.
