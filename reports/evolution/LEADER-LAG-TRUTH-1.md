# LEADER-LAG-TRUTH-1 — is the mid-race clipping the tracking lag's tail, and what would a fix cost?

**Measure only. Nothing was built, no default moved, no product file changed on this branch.**
Corpus: ten tracks × ten races (seeds 1–10), 20 racers, `LEADER_ZOOM` frames only, mid-race
(u ≥ 0.10, before the endgame threshold, run-in and finish mode excluded). **140,740 frames**, of
which 5,886 clip. Instruments: `scripts/diag/leader-lag-truth.mjs`, `leader-lag-sum.mjs`,
`leader-lag-tc.mjs`.

---

## THE VERDICT FIRST, IN PLAIN LANGUAGE

**The clipped frames are the tail of the gap — and the gap is not tracking lag.**

Both halves of that matter, and the second half is the one that changes what happens next.

The clipped frames really do sit at the top of the distribution: below 100 px of gap, **0.0%** of
66,215 frames clip; above 500 px, **92.5%** do. So the shape the brief asked about is real and the
question was well posed.

But the thing at the top of that distribution is not the camera running behind. It is the camera
**aiming somewhere else on purpose**. In `LEADER_ZOOM` the pan is anchored to the **corridor
centreline** at the leader's track parameter, not to the leader; and the guarantee that state runs is
CORRIDOR, which fits *the corridor*, never *the man*. The leader's sideways displacement from that
centreline is therefore never framed by anything. It is a **world** distance, and zoom multiplies it
onto the screen.

The evidence is direct. On clipped frames the framing rule's own target sits **315 px** from where
the aim wants the leader, while the smoother trailing that target contributes **61 px** (p95 72 —
almost constant). And on the four tracks that clip most, **79–98.5% of clipped frames are lost
ACROSS the track, not along it.**

**Question (e) as posed has no answer, because its premise is false.** There is no camera speed that
clears this tail. I swept both smoothers to the floor:

- `trackingTC` 0.25 → 0.05 (a 5× faster pan; the closed form predicts 14% of the lag survives):
  measured **89%** survives, and space-sprint's clip rate falls only 15.42% → 8.08%.
- `focalSmoothTc` 0.05 → **0** (the world-space focal smoother fully OFF): **97%** survives,
  space-sprint 15.42% → 13.36%.

Together the two smoothers are ~16% of the gap on clipped frames. The other ~84% is the anchor
choice, and no speed setting touches it. **If the honest answer had been "a small residue with no
cheap cause" I would have said so; it is not. There is a single, identifiable, source-level cause,
and the lever is the anchor, not the clock.**

---

## (a) THE GAP — aim to arrival, screen px, `LEADER_ZOOM` mid-race

| track | frames | median | p95 | p99 | worst | clip rate |
|---|---|---|---|---|---|---|
| city-circuit | 13,254 | 85.8 | 253.3 | 381.3 | 1358.9 | 1.4% |
| dirt-oval | 16,210 | 83.8 | 216.8 | 328.7 | 965.8 | 1.1% |
| garden-path | 11,186 | 82.4 | 204.3 | 290.2 | 714.1 | 0.7% |
| ice-track | 11,504 | 92.2 | 247.2 | 334.0 | 1343.4 | 1.1% |
| luger-hill | 12,376 | 125.4 | 322.2 | 405.6 | 463.0 | 0.6% |
| mountainstreet | 18,402 | 139.2 | 361.4 | 454.2 | 533.3 | 4.4% |
| **river-run** | 16,335 | 117.4 | 367.8 | 405.2 | 437.5 | **4.6%** |
| searound | 10,659 | 80.4 | 187.2 | 348.7 | 773.0 | 1.1% |
| seatrack | 13,311 | 137.2 | 384.8 | 449.8 | 846.8 | 6.5% |
| **space-sprint** | 17,503 | 142.9 | 344.0 | 407.6 | 635.5 | **15.4%** |

Pooled: median 105.1, p95 332.4, p99 417.3, worst 1358.9 px.

**space-sprint** carries the largest median gap *and* by far the worst clip rate — 15.4%, more than
double the next track. **river-run** is the counter-example that proves the gap alone does not decide
it: its median gap (117.4) is *lower* than mountainstreet's, seatrack's and luger-hill's, yet it
clips more than two of them. Section (d) says why.

## (b) ARE THE CLIPPED FRAMES THE TAIL? — yes. Clip rate inside each gap bin

Reported as a rate per bin rather than as "the smallest gap that ever clipped": a minimum is one
frame, and one frame is not a threshold.

| track | 0–100 | 100–150 | 150–200 | 200–250 | 250–300 | 300–350 | 350–400 | 400–500 | 500+ |
|---|---|---|---|---|---|---|---|---|---|
| city-circuit | 0.0% | 0.0% | 1.9% | 1.8% | 4.5% | 4.3% | 21.3% | 98.0% | 100.0% |
| dirt-oval | 0.0% | 0.0% | 0.6% | 2.1% | 5.3% | 3.1% | 97.4% | 100.0% | 100.0% |
| garden-path | 0.0% | 0.0% | 0.0% | 3.6% | 0.9% | 54.5% | 50.0% | 100.0% | 100.0% |
| ice-track | 0.0% | 0.0% | 0.9% | 3.8% | 4.7% | 21.6% | 8.8% | 95.0% | 100.0% |
| luger-hill | 0.0% | 0.0% | 0.5% | 0.1% | 1.1% | 4.2% | 5.3% | 14.4% | — |
| mountainstreet | 0.0% | 0.0% | 0.8% | 11.8% | 16.2% | 16.7% | 37.0% | 11.2% | 24.2% |
| river-run | 0.0% | 0.0% | 0.3% | 1.5% | 7.2% | 25.3% | 43.8% | 26.8% | — |
| searound | 0.0% | 0.0% | 0.5% | 0.0% | 11.1% | 40.6% | 66.7% | 100.0% | 100.0% |
| seatrack | 0.0% | 0.3% | 9.0% | 22.5% | 6.6% | 10.4% | 22.5% | 15.1% | 100.0% |
| space-sprint | 0.1% | 9.9% | 15.8% | 24.8% | 30.9% | 45.8% | 37.8% | 37.8% | 100.0% |
| **POOLED** | **0.0%** | 1.2% | 3.6% | 10.6% | 13.2% | 23.1% | 33.1% | 28.2% | **92.5%** |
| _frames in bin_ | 66,215 | 29,465 | 19,225 | 9,551 | 5,929 | 5,193 | 3,184 | 1,646 | 332 |

The rate climbs monotonically from 0.0% to 92.5%. **The onset is ~150 px**: below it the pooled rate
is at or under 1.2% across 95,680 frames; from 200 px up it is in double figures. Clipped frames'
median gap runs **2.0×–5.5×** the unclipped median on every one of the ten tracks.

So the tail story holds — but it is a statement about the *gap*, and the next two sections are about
what the gap is made of.

## (c) WHAT DRIVES IT, AT SOURCE

### The gap splits in two, and the smaller half is the smoother

For each frame I computed where the leader would sit if the camera were exactly **on its target**.
That splits the gap cleanly into the framing rule's own doing (aim → target) and the smoother
trailing (target → arrival):

| case | aim → target (med / p95) | smoother (med / p95) | share that is the smoother |
|---|---|---|---|
| space-sprint:6 | 315.4 / 2017.5 | 61.1 / 2100.7 | **16.2%** |
| river-run:9 | 370.4 / 421.0 | 41.3 / 47.8 | **10.0%** |
| seatrack:3 | 340.6 / 5484.8 | 58.6 / 5809.9 | **14.7%** |
| city-circuit:4 | 1130.5 / 1283.9 | 768.4 / 931.5 | 40.5% |

On the tracks that clip often, **84–90% of the gap is in the target itself**. The camera is sitting
where it intends to sit.

### Both smoothers, swept to the floor, and both refuted

`CameraDirector.js:1323` is a first-order exponential smoother, `offset += (target − offset) × lf`,
with `lf` derived from `trackingTC` through `tcToLerpFactor`. Its steady-state lag under a target
moving at constant screen speed is exactly `v·(1−lf)/lf`, so the closed form predicts the ratio for
any setting — which makes it falsifiable rather than merely plausible. It was falsified:

| `trackingTC` | predicted lag | space-sprint | seatrack | river-run | mountainstreet | measured median lag |
|---|---|---|---|---|---|---|
| **0.25 (shipped)** | 100% | 15.42% | 6.47% | 4.56% | 4.42% | 100% |
| 0.18 | 70% | 11.57% | 5.54% | 4.58% | 4.52% | 95–97% |
| 0.12 | 44% | 9.26% | 5.00% | 4.65% | 4.66% | 92–95% |
| 0.08 | 27% | 8.58% | 4.72% | 4.70% | 4.77% | 90–95% |
| 0.05 | 14% | 8.08% | 4.51% | 4.74% | 4.89% | **89–94%** |

A 5× faster pan removes **11%** of the gap where the closed form says it should remove 86%. Note also
that river-run and mountainstreet get **worse** as the camera speeds up.

There is a *second* smoother — `_smoothFocal` (`CameraDirector.js:4328`), in **world** space, applied
to the anchor before the pan ever sees it, active in `LEADER_ZOOM`, and governed by a different,
top-level key (`focalSmoothTc`). It was the better suspect, because a world-space lag becomes a
screen distance that zoom multiplies. Turned fully **off**:

| `focalSmoothTc` | predicted lag | space-sprint | seatrack | river-run | mountainstreet |
|---|---|---|---|---|---|
| **shipped** | 100% | 15.42% | 6.47% | 4.56% | 4.42% |
| 0.02 | 20% | 13.60% | 6.00% | 4.62% | 4.44% |
| **0 (OFF)** | **0%** | **13.36%** | **5.87%** | 4.60% | 4.45% |

With the focal smoother entirely disabled the anchor's offset from the leader is **unchanged** —
median 42.5, p95 108.5 world px, identical to four significant figures. It is not the cause.

### The cause: the camera is anchored to the centreline, and nothing guarantees the leader across it

Three facts in the source, which together are the whole mechanism:

1. **`framingRule.js:93`** — `LEADER_ZOOM` declares `anchor: 'leader'` but `guarantee:
   GUARANTEE.CORRIDOR`.
2. **`CameraDirector.js:4471`** — CAMERA-LATERAL-1: when `pinAcross` holds, the pan target is
   *replaced* by `_centrelineAt(headingT)`, the corridor centreline at the leader's track parameter.
   The anchor named 'leader' is, across the track, not the leader.
3. **`CameraDirector.js:2259–2266`** — `_applyLateralGuarantee` builds its list of offsets from the
   corridor edges (± half the track width), and adds *individual subjects* only when
   `framingFor(this.state).guarantee === GUARANTEE.PAIR`. `LEADER_ZOOM`'s guarantee is CORRIDOR and
   its `pair` is `[null, null]` (`_framingSubjects`, the default branch). **So in `LEADER_ZOOM` no
   term in the framing rule has the leader's sideways position as an input at all.**

What is guaranteed is a fraction of the corridor — `visibleCorridors` for `LEADER_ZOOM` is well under
one. A leader in the outer part of the corridor is outside the guarantee by construction, and his
sprite half-width reaches further still. This is also why LEADER-CORRIDORS-DEFAULT-1 found that
**no** setting of `visibleCorridors` reached zero: widening the corridor fraction changes what share
of the corridor is promised, but the leader's own displacement and his body were never in the
promise.

### And the frames confirm it: he is lost SIDEWAYS

| track | median along | median across | frames where across > along |
|---|---|---|---|
| river-run | 47.0 | **368.5** | **98.5%** (734 / 745) |
| mountainstreet | 56.5 | **289.3** | **88.7%** (722 / 814) |
| space-sprint | 71.2 | **225.6** | **85.8%** (2316 / 2699) |
| seatrack | 68.4 | **198.8** | **79.4%** (684 / 861) |
| luger-hill | 286.3 | 102.3 | 43.7% (31 / 71) |
| ice-track | 292.6 | 81.6 | 18.9% (25 / 132) |
| city-circuit | 442.3 | 94.0 | 9.8% (18 / 183) |
| dirt-oval | 415.8 | 62.0 | **0.0%** (0 / 184) |
| garden-path | 433.6 | 57.8 | **0.0%** (0 / 75) |
| searound | 431.9 | 87.7 | **0.0%** (0 / 122) |

**There are two populations, and they are not the same defect.**

- **Lost SIDEWAYS — space-sprint, seatrack, river-run, mountainstreet.** Across dominates 79–98.5%.
  These are exactly the four tracks with the high clip rates (4.4–15.4%). This is the centreline
  anchor. **This is the case the owner reports as happening far too often.**
- **Lost AHEAD — dirt-oval, garden-path, searound, city-circuit, ice-track.** Across never dominates;
  the gaps are the largest single values in the corpus (up to 1359 px) and they carry most of the
  smoother's contribution (city-circuit: 768 px of trailing). These are **transients** — big camera
  moves — and they are rare: 0.7–1.4%.

Sideways clipping is frequent and structural. Forward clipping is rare and transient. A repair aimed
at one does nothing for the other.

## (d) IS IT LAG OR IS IT SPRITE SIZE? — neither alone, and the answer is precise

**Of 5,886 clipped frames, 0 would clip with a perfect camera. 0.00%, on every one of the ten
tracks.** Measured per frame by sliding the leader onto the aim point and retesting the same four
corners of his oriented body box. The sprite never clips by itself.

But sprite size is not innocent: it sets **how much gap the frame can absorb before the body crosses
an edge**.

| track | half-length (median) | room the aim leaves ahead | **tolerance** | clip rate |
|---|---|---|---|---|
| **space-sprint** | **131.4** | **261.8** | **130.4** | **15.4%** |
| seatrack | 100.6 | 337.6 | 237.0 | 6.5% |
| mountainstreet | 82.4 | 448.6 | 366.2 | 4.4% |
| **river-run** | **45.6** | **446.6** | **401.0** | **4.6%** |
| luger-hill | 77.8 | 447.1 | 369.3 | 0.6% |
| city-circuit | 70.9 | 435.2 | 364.3 | 1.4% |

space-sprint's sprite is **2.9× river-run's** and the aim leaves it **41% less room**, giving it a
tolerance of 130 px against river-run's 401 — a **3.1× difference**. That is why two tracks with
nearly the same gap distribution (median 142.9 vs 117.4) clip at 15.4% and 4.6%.

**So: the gap causes the clipping; the sprite decides how much gap is survivable.** Shrinking the
sprite would raise the tolerance without touching the cause; closing the gap would clear it at any
sprite size. Only the second is a repair.

## (e) WHAT A FIX WOULD COST

**The question as posed — "how much faster would the camera have to be" — cannot be answered,
because speed is not the lever.** Both sweeps are above; 5× faster buys 11%, and on two of the four
worst tracks it makes the clip rate slightly worse. The picture-motion cost of those settings is
recorded and is essentially nil (median per-frame slide 8.6 px and jerk 0.06 px at every setting from
0.25 down to 0.05) — which is itself the tell that nothing was being bought.

What the measurement *can* price is the requirement. Per clipped frame I computed the largest share
of today's gap that may survive and still clear the frame:

| track | median | p25 | p10 | p05 | frames needing a perfect camera |
|---|---|---|---|---|---|
| space-sprint | 0.80 | 0.65 | 0.40 | 0.25 | 0 of 2699 |
| seatrack | 0.80 | 0.70 | 0.40 | 0.25 | 0 of 861 |
| river-run | 0.90 | 0.85 | 0.85 | 0.85 | 0 of 745 |
| mountainstreet | 0.90 | 0.80 | 0.75 | 0.60 | 0 of 814 |
| **POOLED** | **0.85** | — | **0.45** | **0.30** | **0 of 5886** |

**Removing 15% of the gap clears half the clipped frames; removing 55% clears 90%; removing 70%
clears 95%. Nothing requires perfection.** And on the four sideways tracks, aiming the anchor at the
leader instead of the centreline would remove the 84–90% that is the target's own — comfortably past
the 70% that clears 95% of frames.

**What it would cost is the thing CAMERA-LATERAL-1 was built to buy.** The centreline anchor exists
so the picture does not swing sideways with the leader's lateral wander; its note records that the
pinning is done before the focal smoothing and before the guarantees deliberately, so every guarantee
measures from the anchor the camera will actually use. Aiming at the man hands that back: the pan
would carry his every sideways move. The measured size of what would be handed back is the same
number as the repair — a **median 55, p95 108 world px** lateral excursion, which at space-sprint's
zoom is roughly 160–255 screen px of new sideways pan motion.

That is a trade between two things the owner values, not a defect with a free fix, so it is his call
and I have not built it. Three shapes exist between the two extremes — guarantee the leader across
the corridor the way `PAIR` states already guarantee their subjects (the smallest change: add the
anchor's own lateral offset to `_applyLateralGuarantee`'s offsets list when the anchor is a single
racer); bound how far the anchor may leave the centreline; or bring the sprite's half-width into the
guarantee so the promise covers his body rather than his centre. **All three are repairs to the
framing rule. None of them is a camera-speed setting.**

---

## WHAT THIS CORRECTS

- **The working theory this block was given is refuted.** The mid-race clipping is not the tracking
  lag's tail in the sense the brief meant. It is the tail of a gap that is 84–90% framing-rule
  intent.
- **LEADER-WHOLE-SETBACK-BUILD-1's failure is now explained.** The setback never engaged when solved
  from the leader's intended placement, and was ineffective when solved from his delivered position,
  because it moved the anchor **along** the track — and on the tracks that clip, he is lost
  **across** it. The mechanism was aimed at the wrong axis.
- **LEADER-CORRIDORS-DEFAULT-1's "no setting reaches zero" is explained too.** `visibleCorridors`
  promises a share of the corridor; the leader's own displacement and his body were never inputs to
  that promise, so no value of it can close the case.
- This is consistent with LATE-LEAD-AXIS-1's earlier finding that the winner is only ever lost
  sideways. That was recorded for the run-in; it holds mid-race, and now has a named cause.

## LEDGER

- Nothing built. No product file, default, config key or fingerprint touched on this branch.
- Three instruments added under `scripts/diag/`: `leader-lag-truth.mjs` (the probe),
  `leader-lag-sum.mjs` (a–e over the corpus), `leader-lag-tc.mjs` (both smoother sweeps).
- **One wrong answer of mine, caught and corrected before it reached this report.** The first
  summariser drew section (c)'s correlates from clipped frames only, and reported section (b)'s onset
  as the single smallest clipping gap — an outlier, not a threshold. Both were rewritten (correlates
  over all frames, onset as a rate per bin) and the corpus re-run before anything here was written.
  The `_smoothFocal` hypothesis was likewise stated, tested and refuted rather than reasoned about.
