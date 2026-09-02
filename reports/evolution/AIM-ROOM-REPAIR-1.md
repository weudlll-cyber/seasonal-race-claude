# AIM-ROOM-REPAIR-1 — the guarantees are told about the floor, and the full price is now visible

> **REPAIRED, MEASURED, SABOTAGE-PROVEN — NOT MERGED, NOT MINTED.** Branch `ship/aim-room-floor-1`.
> `docs/fingerprints.json` is untouched. `feat/aim-levers-1` is untouched at origin. 4173 is serving
> the branch for his eye.

**He has still not seen B's real cost.** The build he judged on 2026-09-01 and 2026-09-02 contained
the defect, so every figure he weighed came from an arm that was quietly breaking the company
guarantee. This piece repairs the wiring and prices the lever honestly, in three columns.

---

## 1. THE REPAIR — fixed at the source, not at seven call sites

**The shape chosen: one accessor, and the raw function made unreachable from the director.**

`CameraDirector` now has exactly one way to obtain an aim point:

```js
_anchorScreen(frameW, frameH, t) {
  return anchorScreenPointRaw(frameW, frameH,
    this._forwardFracNow(), this._headingScreen(t), this._leaderAimRoomFloorPx);
}
```

All seven call sites — 2240, 2583, 2925, 3156, 3307, 4051, 4098 — now call it. **And
`anchorScreenPoint` is no longer imported under its own name**: it is aliased to
`anchorScreenPointRaw` and used by that one method. There is no bare `anchorScreenPoint` in the file
to call with four arguments. An eighth call site written next month must either use the accessor —
which *cannot* omit the floor, because it does not take it — or re-add the import, which is a
visible, reviewable act rather than a silent omission.

**WHY NOT MAKE THE PARAMETER REQUIRED, which would have been louder.** `anchorScreenPoint` has about
twenty callers outside this file: six assertions in `framingRule.test.js`, two in `levelSet.test.js`,
and a dozen harnesses (`corridor-truth`, `leader-lag-truth`, `line-ceiling-terms`,
`sprite-premise`, `runin-anatomy`, `anchor-room-gap`, and others) that reconstruct the aim in order to
measure it. Making the fifth argument required would break all of them at once to fix a defect that
lives entirely in one class. Those callers *reconstruct*; they cannot ship a wrong picture. **The cost
of the shape chosen is that the default still exists for them.** The benefit is that the director —
the only thing that can ship a wrong picture — cannot reach it.

**WHY NOT A RESOLVED VALUE ON THE CONFIG.** The floor cannot be resolved into the fraction ahead of
time: `forwardFracForRoomFloor(frac, span, floor)` needs `span`, the frame's chord along the heading,
which is a per-frame quantity. A config-time value would have to be a fraction, and a fraction is
exactly the thing the floor exists to stop being constant.

### THE ZERO CASE, tested rather than argued

With the floor at 0, **all four fingerprints equal master's record byte for byte** on the repaired
tree — world, world-off, camera and render. The repair changes nothing when the floor is off. Pinned
in unit form too: `aimRoomWiring.test.js` asserts on four headings that `_anchorScreen` at floor 0 is
identical to the old four-argument call, to twelve decimal places.

### THE CONTRACT IS NOW PINNED

`client/src/modules/camera/aimRoomWiring.test.js` — 14 tests. The one that matters asserts, on four
headings at floor 0 **and** at floor 360, that the leader projected through the biased pan lands
exactly on the point `_anchorScreen` gave the guarantees. **Two independent code paths, one screen
point.** A unit test on `anchorScreenPoint` alone could never have caught this defect: that function
was always correct. What was wrong was who called it and how.

### SABOTAGE-PROVEN

The accessor was changed to pass `0` instead of the floor — the defect restored — and:

- **6 tests went red**, including both original judges (`framingRule.test.js`: expected ≥3 got 2,
  expected ≥4 got 2) and three contract cases.
- **The company shortfall climbed back to exactly the pre-repair figures**: space-sprint **12.38%**,
  seatrack **5.73%** — identical to the digit, which is also what validates carrying the defective
  column forward from the previous piece.

The sabotage was fully reverted; no scaffolding remains in the file.

**The two red tests went green because the promise is kept again, not because anything was relaxed.**
`git diff` on `framingRule.test.js` is empty. It was never touched.

---

## 2. THE FULL PRICE — three columns, ten tracks, N=30

**The number that decides it: the company shortfall.** A frame is a shortfall when fewer racers are
in shot than `minRacersVisible` promises **and** at least that many were still running.

| track | today (floor 0) | B as he judged it | **B repaired** | recovered |
|---|---|---|---|---|
| city-circuit | 0.00% | 3.99% | **0.00%** | all of it |
| dirt-oval | 0.03% | 0.96% | **0.03%** | all of it |
| river-run | 0.82% | 1.30% | **0.74%** | all, and better than today |
| garden-path | 0.00% | 0.10% | **0.06%** | most |
| ice-track | 0.04% | 0.13% | **0.08%** | most |
| searound | 0.16% | 1.23% | **0.60%** | most |
| luger-hill | 0.30% | 0.72% | **0.58%** | a third |
| mountainstreet | 0.59% | 1.80% | **1.19%** | half |
| seatrack | 2.46% | 5.73% | **2.98%** | most |
| space-sprint | 4.40% | 12.38% | **6.06%** | most |

**The repair recovers most of the shortfall on every track, and all of it on three.** The residual —
space-sprint +1.66 pp, mountainstreet +0.60 pp, seatrack +0.52 pp over today — is the lever's genuine
cost, not the wiring's: moving the leader toward centre shows less road behind him, and the pack
behind him is what the guarantee counts.

**Worst-case racer count in shot**, which is what he would actually notice:

| track | today | as judged | **repaired** |
|---|---|---|---|
| city-circuit | 5 | 2 | **5** |
| dirt-oval | 4 | 2 | **4** |
| ice-track | 4 | 3 | **4** |
| searound | 4 | 2 | **4** |
| seatrack | 4 | 2 | **4** |
| mountainstreet | 3 | 2 | **3** |
| river-run | 3 | 2 | **3** |
| luger-hill | 3 | 3 | **3** |
| garden-path | 7 | 4 | **4** |
| space-sprint | 1 | 1 | **1** |

**The repair restores the worst case to today's value on eight of ten tracks.** garden-path keeps a
7 → 4 loss, and space-sprint was already 1 before this ship — a pre-existing hole this lever neither
creates nor fixes.

### Stage 2 — 300 races, where it matters

| track | N | today | as judged | **repaired** |
|---|---|---|---|---|
| space-sprint | 300 | 3.49% | **8.72%** | **4.90%** |
| seatrack | 300 | 2.51% | — | **2.96%** |

The N=300 figures are milder than N=30 on both arms and the ordering is identical, so the shape holds
at both N. The defective arm at N=300 was measured by re-applying the sabotage and reverting it.

---

## 3. WHAT HE GAINS — the fault, ten tracks

Clip episodes are runs of adjacent clipped frames; **corner overflow IS the clip metric**, tested on
the four drawn corners.

| track | clip episodes: today → as judged → **repaired** | clip% today → repaired | centreline% today → repaired |
|---|---|---|---|
| space-sprint | 109 → 79 → **80** | 3.64 → **2.63** | 70.01 → **91.75** |
| seatrack | 63 → 56 → **56** | 2.20 → **2.03** | 79.71 → **81.86** |
| mountainstreet | 52 → 48 → **48** | 0.95 → **0.85** | 85.67 → **86.42** |
| river-run | 22 → 20 → **20** | 0.38 → **0.32** | 90.45 → 90.39 |
| dirt-oval | 41 → 39 → **42** | 1.36 → 1.36 | 99.95 → **100.00** |
| city-circuit | 35 → 34 → **36** | 1.44 → **1.40** | 99.46 → **99.70** |
| ice-track | 32 → 33 → **33** | 1.34 → **1.24** | 99.26 → **99.56** |
| searound | 26 → 25 → **26** | 1.25 → 1.28 | 99.34 → 99.22 |
| garden-path | 16 → 16 → **18** | 0.72 → 0.77 | 99.74 → **99.95** |
| luger-hill | 10 → 10 → **10** | 0.42 → **0.41** | 93.00 → **93.39** |

**The repair costs a little of the gain, and that is the honest trade.** Because the guarantees now
know the leader sits further back, they see more room ahead and permit a slightly tighter shot — so
clip episodes rise by 1–2 against the defective arm on four tracks (garden-path +2, dirt-oval +3,
city-circuit +2, space-sprint +1). Against **today**, seven tracks improve or hold and three are
marginally worse (dirt-oval +1, city-circuit +1, garden-path +2).

**space-sprint at N=300: 1,065 → 795 episodes, −270, clip 3.46% → 2.57%, centreline 69.47% → 88.46%.**
That is the headline gain and it survives the repair nearly intact (the defective arm gave −283).

**Frame counts are identical between arms on all ten tracks, at both N.** The floor still moves the
picture and not the race after the repair — the property that makes this an eye question rather than
a fairness one.

---

## 4. THE ONE THING THE REPAIR MAKES WORSE, AND IT IS A NEW EVENT

**river-run gains nine whole-screen camera jumps that do not exist today.**

| river-run, adjacent-frame pans | today | **repaired** |
|---|---|---|
| N=30: steps > 1000 px | 0 | **1** (max 4141 px) |
| **N=300: steps > 1000 px** | **0** | **9** (max 5320 px) |
| N=300: p99 step | 166.6 | 167.9 |
| N=300: clip episodes | 198 | 198 |

Across 479,587 adjacent-frame pans that is 0.0019% of frames — roughly one race in thirty — but each
is the picture moving most of a screen width in a single frame, and **there are none in the baseline.**
p99 is untouched, so it is purely a tail event.

**Where it comes from, read off the frames:** at the jump the lateral guarantee newly engages
(`totalShift` 0.0 → −2.0) and the pan target steps rather than eases. The repaired anchor is what
brings that guarantee to the edge of binding on this track; the un-repaired arm never got there
(its max was 761 px).

**Checked on all ten tracks, and river-run is the only one.** seatrack actually improves — it had 4
such frames today and has 2 repaired. Every other track has zero in both arms, and eight of ten have
a *lower* maximum step after the repair.

**Not fixed here, and deliberately.** It is a real defect of the same family as the one just
repaired — a guarantee changing state without an ease — but chasing it now would change the picture
again before he has seen this one. It is written down, with the exact race and frame
(`c:/tmp/rep300`, river-run seed set, race 25 frame 1470 at N=30).

---

## 5. THE OTHER MEASUREMENTS

**Tracking lag**, re-measured on the repaired tree, all six frame counts identical:

| state | today → as judged → **repaired** (median) | (p95) |
|---|---|---|
| **LEADER_ZOOM** | 5.07 → 4.73 → **4.75** | 9.71 → 8.95 → **9.48** |
| LEAD_CHANGE | 4.64 → 4.49 → **4.52** | 7.45 → 8.77 → **8.78** |
| OVERVIEW | 2.75 → 2.87 → **2.87** | 16.00 → 18.54 → **18.54** |
| BATTLE_ZOOM | 5.81 → 5.81 → 5.85 | 10.05 unchanged |
| COMEBACK_ZOOM / PHOTO_FINISH | unchanged | unchanged |

`LEADER_ZOOM` still improves on both percentiles. `OVERVIEW` p95 and `LEAD_CHANGE` p95 remain worse
than today and the repair does not recover them — they are an entry cost, not a tracking one: a race
enters those states from wherever `LEADER_ZOOM` left the camera.

**`straggler-truth`: identical to the digit** on the repaired tree — the ending is untouched.

**Fingerprints.** World and world-off **UNMOVED**, which is the required result. Camera and render
both moved, and their repaired values differ from the arm he judged — the repair is a real picture
change, not a no-op. **Values deliberately not written here; nothing minted.**

**Instrument control, run before any comparison was trusted.** The two arms were confirmed to differ
on this build rather than glanced at: 5,884 of 8,330 rows differ in `aimAhead`, and the arms' own
`floor` fields read 0 and 360. This is the check the previous piece needed and did not have — its
first sweep measured one arm twice.

---

## 6. WHAT HE SHOULD WATCH FOR

**The leader's framing:** on space-sprint and seatrack the leader now sits noticeably nearer the
centre of the frame on the steep parts of the lap, with visibly more road ahead of his nose — the
camera holds the centreline 70% → 92% of the time on space-sprint — and on the shallow tracks
(river-run, luger-hill, mountainstreet) it should look exactly as it does today.

**How many racers are behind him:** he should expect to see **about one racer fewer** in shot on
average — the mean in frame falls from 17.2 to 15.4 on city-circuit, 18.8 to 16.9 on garden-path and
9.1 to 8.4 on space-sprint — and that is the thing he was not watching last time and the thing this
repair is about, because the guarantee's floor of five is now kept again where the arm he judged
was dropping to two.
