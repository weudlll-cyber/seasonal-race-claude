# RUNIN-STATE-1 — the run-in becomes a state

**Branch:** `feat/runin-state`, off master `e1f53781`. **Not merged** — the owner judges it on
luger-hill seed 9.
**Quarry:** `feat/finish-framed` (`6e94a086`), honestly red, **not merged and not built on**.

---

## 1. The trace, before a line was changed

The question put to this block: _why is the picture tight and pointed at track the racers are not on
yet, when the centre is only 1.21 track widths from the spine?_ Frame by frame across the
PHOTO_FINISH entry on luger-hill seed 9, under the quarry's ceiling form.

**The premise was half wrong, and the half that was wrong is the whole diagnosis.** The camera is not
pointed at track the racers _have not reached_. It is pointed at track they have **already left** —
it is BEHIND them, not ahead. At the first empty frame the pair midpoint the shot is built on
projects to screen (1281, 756) on a 1280x720 frame: just past the bottom-right corner, in the
direction of travel.

**The pan TARGET was correct on every one of those frames.** `targetOffset` framed the subject at the
centre throughout. What failed is the delivered offset, which trailed its own target by **535 px
rising to 1115 px** while the ceiling released the zoom from 2.46 to 4.00 over forty frames. Add the
lag back and the subject lands at (746, 430) — near the middle, where the target put it.

| frame | zoom | targetZoom | lag (px)      | subject on screen | racers in frame | centre off spine |
| ----- | ---- | ---------- | ------------- | ----------------- | --------------- | ---------------- |
| 3853  | 2.44 | 2.57       | (−524, −322)  | (1254, 743)       | 1               | 0.61 TW          |
| 3854  | 2.47 | 2.61       | (−535, −326)  | (1281, 756)       | **0**           | 0.62 TW          |
| 3874  | 2.97 | 3.16       | (−732, −448)  | (1515, 902)       | **0**           | 0.71 TW          |
| 3893  | 3.71 | 4.00       | (−1115, −683) | —                 | **0**           | 0.86 TW          |

**Why the centre metric stayed healthy while the frame was empty:** the excursion is ALONG the track,
not across it. The camera sat on the racing line the whole time, roughly 173 world px behind the
pair. A centre-to-spine distance cannot see that, which is exactly why `check-runin-frame` has a
second half with no threshold in it.

**The cause, in one sentence.** A ceiling that RELEASES delivers its zoom change inside the
`tracking` phase, where pan and zoom are two independent lerps — and the correction that re-couples
them, update()'s zoom-about-the-anchor step (CAMERA-SIDEJUMP-1), is skipped when
`_focusAnchorRacer` returns null, which it does for PHOTO_FINISH because a group shot has no single
anchor. The anchor column of the trace reads `(NaN, NaN)` for every empty frame.

**Confirmed before anything was rebuilt.** Pointing that one correction at the framing anchor instead
of the racer anchor, with the ceiling itself untouched:

```
before:  luger-hill  empty frames 51 FAIL      after:  luger-hill  empty frames 0 OK
```

**Why Searound never showed it.** The lag scales with `|world position| x axis scale`. Luger Hill is
open (axis 1.5, world centre x ≈ 2770 → 4155 px of offset per unit zoom); Searound is closed (axis
0.42, centre ≈ 1600 → 667). A 6x difference in the same mechanism.

**And why master is fine with a LARGER zoom change.** With the feature off, PHOTO_FINISH's entry
glides 2.13 → 4.00 — an 87% change, bigger than the ceiling's — with lag `(0, 0)` and zero empty
frames. The glide moves pan and zoom on ONE ease, so the anchor is framed consistently by
construction. **The defect was never the size of the zoom change. It was deferring it past the
glide.**

**The Stage-1 verdict, given before Stage 2:** the state approach does NOT hit the same wall, for a
structural reason rather than a hopeful one. A run-in state is a LEADER-family shot, so it has an
anchor and the correction is live for its whole duration; and its handover to PHOTO_FINISH is an
ordinary transition, i.e. a glide.

## 2. The state

`RUN_IN`, with all three columns of its own — and the third one is deliberately not a new number.

| column        | value                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| **ANCHOR**    | the leader. Load-bearing: this is what keeps the correction above alive.                |
| **GUARANTEE** | `LINE` — the finish, a fixed world point. The first guaranteed subject that is not a racer. |
| **ZOOM**      | **LEADER's own setting**, shared by SOURCE not copied.                                  |
| POSITION      | CENTRED — the table's own question, answered differently: there IS something ahead.     |

**The zoom is a division and nothing else.** `pointGuarantee(leader, line)` = `room / distance`,
measured from where the anchor sits in frame. Far from the line it is low, so the shot is wide; it
rises as the leader closes; near the line it passes above the state's own width and `Math.min` hands
the shot back with nothing to switch off. That release is why the handover works: **at the line,
RUN_IN and LEADER_ZOOM are the identical picture**, so the step into PHOTO_FINISH is the one this
camera has always made there.

**The ceiling approach is not layered under it — it does not exist here.** `RUN_IN` is chosen in the
endgame branch of `_pickNextState`, which is where the director has always locked to the leader; the
finish sequence sits above that branch, so the handover at the line needed no code at all.

**Two bounds were built on the LINE ceiling and both were removed.** The quarry bounded at the
field's extent (weak: at the endgame the field spans most of the track). This block then bounded at
OVERVIEW's width, which bound hard and cost the design its point — on Luger Hill it pinned the
ceiling for the first 60% of the shot, so the picture never tightened. Dropping it moved the line's
in-frame share from 21.1% to 44.9% (Luger Hill) and 18.1% to 44.2% (Searound). Bounding at the
projection's own minimum gave numbers **identical to no bound at all**, which proves `resolveCamera`'s
`minEffZoom` clamp is the real bound and a second one here would be a second authority.

## 3. Measured

Two tracks x eight seeds (9, 2814, 101, 202, 303, 404, 505, 606), n=20, Quick-Test roster, slow-motion
on. Window = `endgameThreshold` → the first crossing.

| | luger-hill | searound |
| --- | --- | --- |
| **empty frames** | **0** | **0** |
| centre worst (guard) | 0.09 TW | 0.11 TW |
| line in frame, run-in window | 11.9% → **24.8%** | 9.9% → **25.6%** |
| line in frame, wider window (aftermath included) | 48.0% → **55.6%** | 40.6% → **51.0%** |
| thirds, feature ON | 11.1 / 25.8 / 35.6% | 15.9 / 29.8 / 32.5% |
| thirds, feature OFF | 0.0 / 0.0 / 35.6% | 0.0 / 0.0 / 30.1% |
| cam.zoom at the crossing, \|ON−OFF\| | **0.00e+0** | **0.00e+0** |

**The wider window is the brief's own instrument** — its baselines were 47.3% and 41.4%, and this
harness reads 48.0% and 40.6% with the feature off. The two agree, so the comparison is like for
like.

**The middle-third dip is gone.** The profile now rises monotonically instead of dipping: the line
enters the frame and stays. With the feature off the first two thirds are 0.0% on both tracks.

**The zoom at the crossing is bit-identical, not merely close** (the ceiling form managed a third of
a thousandth). Structural: by the crossing PHOTO_FINISH owns the shot and RUN_IN never touched it.

**The centre threshold is not marginal any more.** 0.09 and 0.11 track widths against a limit of 2 —
the quarry's 2.07 near-miss on Searound came from the ceiling, and there is nothing to widen.

## 4. What this does NOT fix, and it is the honest limit

**The endgame lock does not own the endgame.** The branch RUN_IN enters from is consulted only when
`decideTransition` permits a transition at all, and a state entered just before the threshold holds
its own gate across it. Measured over the sixteen races:

- **40–48% of the window is PHOTO_FINISH**, whose pre-line gate fires at `photoFinishLeadProgress`.
- Most of the remainder belongs to whatever shot was already running (LEAD_CHANGE, BATTLE, COMEBACK,
  or a LEADER_ZOOM entered before the threshold).
- **RUN_IN owned 14.9% of the window on Luger Hill and 18.5% on Searound**, and got **no frames at
  all in 3 of 8 Luger Hill races and 3 of 8 Searound races.**

The correlation is exact and is the cleanest evidence that the change is confined to the state: where
RUN_IN owns 0% the in-frame share is unchanged to the decimal; where it owns 55% the share is 61.4%.

So the pooled numbers are a **weighted average of a large effect over a small share of the window**.
Inside its own frames the run-in does what was asked. This is pre-existing behaviour and predates the
run-in; changing it would end BATTLE and COMEBACK shots early at the threshold, which is a much
larger change than a new state. **Recorded, not fixed — an owner decision.**

## 5. Fingerprints — measured fresh, NOT minted

| role | before | after |
| --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved** |
| camera | `64432e18a7e62188` | `3a1603d37210dc66` — moved |
| render | `096f2726c45ed853` | `bd29a55fd93e2f68` — moved |

**With `runInShot: false` both moved fingerprints return EXACTLY to the stored values** —
`64432e18a7e62188` and `096f2726c45ed853`, across all ten tracks. The off position is not "close to"
the old behaviour, it is the old behaviour.

`engine-reach --check` on the real diff: 1 of 6 paths reaches the engine (`storage/defaults.js`, for
a camera-only key), so the world fingerprint ran and is unchanged. `npm run verify`: **PASS 16, FAIL
0, SKIP 4**, 227 s.

## 6. Source hygiene

11 files, **+562 / −29**. Client suite 4018 → 4025 tests, all green.

- **Taken from the quarry:** `pointGuarantee` — pure geometry, unchanged, and its own measured
  argument for why it is not `pairGuarantee` (41.4% → 40.8%, i.e. nothing) is worth keeping. Also
  `_finishLineWorldPoint`. Both attributed in place.
- **Left in the quarry:** `_finishLineCeiling` and its field bound — the retired mechanism, recorded
  as DEAD-ENDS §M.
- **Removed:** nothing shipped; the ceiling never reached master, so there was nothing to delete.
- **Extracted:** the RUN_IN mirror loop in `cameraTimingComputation.js` — nine per-state maps take
  LEADER's resolved value in one place rather than nine literals, with a test that fails if a tenth
  map is added and not mirrored.
- **Noticed and left:**
  1. `_focusAnchorRacer` returning null for PHOTO_FINISH/BATTLE/OVERVIEW disables the
     zoom-about-anchor correction for those states too. Harmless on master today because their zoom
     is converged during `tracking` — but it is the latent defect this whole block traced, and a
     future mechanism that moves zoom during an unanchored shot will hit it. Fixing it moves both
     fingerprints for no visible gain today, so it is written down instead.
  2. `PHOTO_FINISH` is absent from `ALL_STATES` in `cameraTimingComputation.js`, so it gets no
     phased profile and `_computePhasedPanTarget` returns early for it. Pre-existing; not touched.
  3. `rAFProbe.js`'s `_STATE_IDX` has neither PHOTO_FINISH nor RUN_IN. Pre-existing shape;
     diagnostics only.

## 7. For his eye

**Luger Hill, seed 9. Watch the last few seconds before the photo finish: the shot should already be
open with the finish line in it, and should close on the line by itself — with racers in frame the
whole way.**
