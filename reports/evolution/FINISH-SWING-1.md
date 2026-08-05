# FINISH-SWING-1 — the late swing is the company guarantee, and it is older than the branch

**Reproduced from his marker** on `a505ecf6` · **Diagnosed, not repaired** · All three branches merged
to master `9f988c70`.

---

## The reproduction

His identity — City Circuit, n=39, motorbike, seed 5601, cam seed 882842572, his stored config —
reproduces frame-for-frame. His marker read `z 3.218059 / ox -1912.477`; the repro hits
**`z 3.2160 / ox -1959.9` at frame 5040**, the same point in the same movement.

He was right that the camera was still moving, and right that it is a real movement rather than a
settling wobble.

## The cause, with its location

**`_setTargets()` in `client/src/modules/camera/CameraDirector.js`** — the line that combines the
ceilings:

```
guaranteed = Math.min(stateZoom, _guaranteeCeiling(...), _companyCeiling(subjects, racers, frameSize))
```

The finish move lands at **frame 4904**: zoom 4.5489, offset −2835.9, `dPan 0.0`. Fully at rest, and
it stays at rest for **96 frames (1.6 s)**.

Then, from frame ~5000, `guaranteed` starts falling away from `stateZoom` — 4.5489 → 4.2881 → 3.9830
→ … → 2.9752 — while `stateZoom` never moves. The camera follows it with the OVERVIEW tracking lerp,
and `dPan` climbs back to **~30 px/frame**. That is his swing.

**What is doing it: the COMPANY guarantee** (`minRacersVisible`, default 3). FINISH_OVERVIEW holds a
fixed point behind the line; as the tail of the field straggles in (`finishedCount` 32 → 38 across
exactly those frames) the three nearest racers to that fixed point get further away, so the guarantee
widens the shot to keep three in frame, and keeps widening as they spread.

**Proved by the switch, not by the story:** with `minRacersVisible: 0` the late widening disappears
completely — 4.5489 and −2835.9 held to the last frame, `dPan 0.0`. With 3, it swings.

## It is OLDER than the branch

The same probe on **`b363bd94`** — before FINISH-SEAM-1, FINISH-MOTION-1 and FINISH-WINDOW-1 — shows
the identical widening: `guaranteed` 4.5489 → 2.9784, `dPan` ~30, starting at the same `finishedCount`.

So this is not new code. He is noticing it now because the rest of the ending finally became smooth
enough for it to stand out — the jump that used to dominate the moment is gone, and what was always
underneath is now the loudest thing left.

**Consequence: nothing was repaired here**, and the merge was therefore unblocked rather than held.
Fixing it inside a branch he had already passed by eye would have moved fingerprints under his verdict.

## Two things about his config

**1. This ending took the PHOTO-FINISH path, not the ordinary one.** Despite the much stricter
`photoFinishCloseThresholdT` 0.025 / `photoFinishLeadProgress` 0.966, the marked race still ran
PHOTO_FINISH → pause → FINISH_OVERVIEW. So the swing sits after new code — but §above shows the swing
itself predates it, so the new code is not implicated.

**2. Both keys are live, and they are different moments — neither is ignored.**

| key | his value | what it governs | Dev Screen |
|---|---|---|---|
| `finishDramaDurationMs` | **900** | the camera HOLD before the zoom-out begins | "Finish pause (ms)" |
| `finishPauseMs` | **4000** | the delay after the LAST finisher before the leaderboard appears | "Pause after last finisher…" |

Nothing was renamed onto a stale key, so there is no orphan value. **What he should set:** the beat
before the camera pulls back is `finishDramaDurationMs` — the control now labelled **"Finish pause
(ms)"**, currently 900 ms. His 4000 controls a later, different thing and is working as intended.

**A naming collision I introduced, and should own:** FINISH-WINDOW-1 relabelled
`finishDramaDurationMs` from "Drama pulse duration" to "Finish pause (ms)", which now reads
confusingly close to the neighbouring "Pause after last finisher". Both tooltips state which moment
they govern, but the labels no longer distinguish themselves at a glance. Worth renaming one of them.

## The merges

`feat/finish-window-1` (CI `31038147958`) → `feat/verify-cost-1` → `feat/verify-fast-1`, `--no-ff`,
in that order. Master **`9f988c70`**. All three branches deleted at origin. Doc guards green, script
suite **150/150**. World `dc4647be0f55ebdb` unmoved — nothing touched the engine.

## Recommendation for the swing, not taken here

Two honest options, and the choice is his because it is a taste question about the shot:

- **Freeze the guarantee once the finish move lands.** FINISH_OVERVIEW is an authored final shot; the
  company guarantee exists to stop a *live* shot going empty, and after the winner is home there is
  no shot left to protect. This keeps the frame exactly where his slider put it.
- **Leave it.** The widening is doing something real — it keeps the arriving stragglers in frame,
  which is the thing he said he likes about the lookback point.

I would build the first, gated so he can compare, and let his eye decide. It moves the camera
fingerprint, so it needs a block of its own.

## Noticed

`git worktree prune` cannot delete its metadata stubs on this machine — ten already existed and I
added an eleventh (`ra-wt`). The recorded reparse-point condition; harmless, and already in the
backlog.
