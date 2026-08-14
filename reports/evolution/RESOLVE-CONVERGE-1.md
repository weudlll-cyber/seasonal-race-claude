# RESOLVE-CONVERGE-1 — the widening loop stops when it stops helping

**Branch:** `fix/resolve-converge`, off `master` at `e1f53781`. **Not merged.**
Diagnosed by RUNIN-PACE-1 §2, which measured the defect and deliberately did not repair it.

---

## 1. The repair

`resolveCamera` pursues its second guarantee — the pan target lands inside `innerFramePct` — by
stepping the effective zoom down 10% at a time. Nothing ever asked whether the steps were getting
anywhere. Where the world-bounds clamp holds the target at the world edge they cannot: on a clamped
axis the target's screen position is `distance-from-that-edge × effZoom`, so widening shrinks a
product and slides the target FURTHER out. The loop then ran to the projection floor, gave away
everything down to the whole world, and delivered a target that was outside the inner frame when it
started and further outside when it stopped.

**The form chosen: a progress test.** `_attempt` now returns `frameMiss` — how far outside the inner
band the target lands, in screen px, on the worse axis — and the loop takes a step only when it
strictly reduces that number. The first step that buys nothing ends the loop. No new number: a
comparison, not a threshold.

**Why not the other form.** An up-front unreachability test was the alternative, and it is not the
one-liner it looks like. There are two clamped regimes and they answer the question in opposite
directions:

| regime                                       | what the clamp does                             | does widening help?                       |
| -------------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| the world is WIDER than the frame on that axis | pins the frame to the near world edge           | **never** — the target slides further out |
| the world FITS the frame on that axis          | the frame cannot move; the whole world is shown | **yes** for a violation on the far side   |

I found the second regime by predicting one of the existing tests would flip and watching it pass
instead. An up-front test written from the first regime alone would have been wrong, and would go
wrong again the day the clamp changes. The progress test asserts none of that geometry; it measures
it, and it keeps working if a later pan rule makes widening useful somewhere new.

**What it gives up, stated rather than hidden.** A greedy stop misses a miss that gets worse before
it gets better. That needs widening PAST the point where the world fits the frame on the violated
axis, and on X that point IS the floor — `minCamZoom` is defined as exactly "the world width fits" in
both shipped projections — so on X it cannot arise. Measured, nothing is given up anywhere: **the
loop converged on ZERO frames, on either arm, before or after.** It has never once done its job.

**What it means for the picture.** Where the goal is unreachable the frame stays as tight as the shot
asked for and the subject sits nearer the frame edge than `innerFramePct` wanted — which is exactly
where the clamp was always going to leave it; what stops is paying world width for that same
position.

## 2. What else it touches — measured, because this is the risk

`resolveCamera` is the last step of every state on every frame, so the survey is the whole race on
all ten tracks, three seeds each, **172226 frames per arm**. `scripts/resolve-converge-truth.mjs`
calls the SHIPPED function with the arguments `_setTrackTargets` used, reconstructed from the
`_framingProbe` the director already writes, and checks every frame's reconstruction against the
`targetZoom` the director actually set — **0 unverified frames in every run below**.

| arm                    | frames | loop fires | converges | delivered on those frames | verdict                     |
| ---------------------- | ------ | ---------- | --------- | ------------------------- | --------------------------- |
| `runInShot` OFF before | 172226 | **0**      | 0         | —                         | the loop never runs         |
| `runInShot` OFF after  | 172226 | **0**      | 0         | —                         | **byte-for-byte unchanged** |
| `runInShot` ON before  | 172226 | **276**    | **0**     | 100% of the world, always | 276 futile frames           |
| `runInShot` ON after   | 172226 | **0**      | 0         | —                         | the futile frames are gone  |

**It fires only near the world edge at wide shots, and here is the count.** All 276 were clamped to
the world bounds (100%), all delivered 100% of the world (min = median = max), against a median ASK
of 75%. All 276 are on **ice-track** — nine tracks never produce one. By state: LEADER_ZOOM 167,
BATTLE_ZOOM 81, OVERVIEW 28.

| track (ON, before) | seed | frames | futile | share    | requested (median) |
| ------------------ | ---- | ------ | ------ | -------- | ------------------ |
| ice-track          | 9    | 5487   | 90     | 1.6%     | 71.1%              |
| ice-track          | 2814 | 5583   | 105    | 1.9%     | 71.1%              |
| ice-track          | 5601 | 5684   | 81     | 1.4%     | 86.7%              |
| _the other nine_   | all  | 155472 | **0**  | **0.0%** | —                  |

**THE OFF-ARM PROMISE HOLDS, and that is a measured result rather than the expected one.** The spec
said both arms would move and that a real defect is not bound by a feature's off-arm promise. The
principle is right and the prediction did not come true here: with the run-in absent, no pan target
ever sits far enough toward the world edge at a wide enough shot to fall outside the inner frame, so
there is no futile widening to remove. This branch is behaviour-neutral on master. The ON arm is where
the repair is visible, which is also where the defect was.

## 3. The acceptance number — ice-track, at that window

Delivered width, as a fraction of the world, on `feat/runin-state` + this fix, ice-track seed 9,
frame by frame from the endgame threshold (bigger = wider):

| race prog | requested by the line | delivered BEFORE | delivered AFTER | adapted | in inner frame |
| --------- | --------------------- | ---------------- | --------------- | ------- | -------------- |
| 0.900     | 86.9%                 | **100.0%**       | **86.9%**       | → false | false          |
| 0.902     | 84.0%                 | **100.0%**       | **84.0%**       | → false | false          |
| 0.905     | 78.0%                 | **100.0%**       | **78.0%**       | → false | false          |
| 0.907     | 72.2%                 | **100.0%**       | **72.2%**       | → false | false          |
| 0.910     | 71.3%                 | **100.0%**       | **71.3%**       | → false | false          |
| 0.913     | 70.0%                 | **100.0%**       | **70.0%**       | → false | false          |
| 0.915     | 69.2%                 | **100.0%**       | **69.2%**       | → false | false          |
| 0.916     | 68.7%                 | **100.0%**       | **68.7%**       | → false | false          |

**Delivered is now the line's own ask, on every frame of the window** — 100% falls to 86.9% and then
follows the line down through 68.7%, inside the 68–72% the spec named. `targetInInnerFrame` stays
false, and that is the honest outcome: the goal was never reachable, so the shot keeps its width and
the target stays where the clamp puts it.

## 4. Fingerprints — measured fresh, NOT minted

| role   | stored             | `fix/resolve-converge` (OFF arm)  |
| ------ | ------------------ | --------------------------------- |
| world  | `dc4647be0f55ebdb` | **not measured** — see below      |
| camera | `64432e18a7e62188` | `64432e18a7e62188` — **unmoved**  |
| render | `096f2726c45ed853` | `096f2726c45ed853` — **unmoved**  |

The world fingerprint has no question to answer: `engine-reach.mjs --check` reports **none of 4**
changed paths can reach the race engine (R1).

**The camera hash is strong evidence here**, unusually — it hashes every decision on **every frame**
of a seeded race on all ten tracks (46406 frames at n=40, a different identity from the survey's
n=20), and it is identical. The render hash samples 16 frames of 5600 per track, so its agreement is
weaker; it is consistent, not proof.

**On the ON arm** (`feat/runin-state` + this fix, measured in a worktree, `wt/runin-converge`):

| role   | that branch before | with this fix                     |
| ------ | ------------------ | --------------------------------- |
| camera | `988a9b31aaf9768a` | `c1556053b1824758` — **moved**    |
| render | `c962df5334277f95` | `c962df5334277f95` — **unmoved**  |

Per track, the camera hash moves on **ice-track alone** (`a083c940ba3400c7` → `54dc4193568e9c91`);
the other nine are byte-identical. That is the same answer the frame survey gave, from an independent
instrument at a different field size.

**Nothing is minted.** The owner looks first.

## 5. What holds

- **`check-runin-frame`, both halves, both tracks, empty-frame half over the whole race** — PASS on
  both trees. OFF arm: centre 0.09 (luger-hill) / 0.11 (searound) TW, **0 empty frames**. ON arm:
  0.15 / 0.94 TW, **0 empty frames** — identical to what that branch read before the fix.
- **Tracking lag re-measured, not re-stamped on an argument** — every frame count, median and p95 in
  `docs/CAMERA_DIRECTOR.md` is identical to the digit. The stamp names `a2efd2fa`.
- **`npm run verify` green** on the routed guards.
- **Tests: two instance tests replaced by one property with a five-case table**, plus a guard that
  the table holds both positions so the property cannot pass vacuously. One of the deleted tests
  asserted AS CORRECT a run all the way to `minEffZoom` that left the target outside the frame it had
  been widening for — the defect, written down as an expectation. File 14 → 18 tests.

## 6. What to watch on ice-track seed 9

From about race progress 0.90 the shot no longer snaps out to the whole world and back: it should
close steadily from ~87% to ~69% of the world with the leader riding nearer the frame edge than
before — if that closing looks like a shot rather than a jump, the repair is right.
