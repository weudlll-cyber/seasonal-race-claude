# AIM-ROOM-COMBINED-1 — the floor and the repaired guarantee together, measured before they were merged

> **THE GATE PASSED.** Nobody had seen these two together: both act on the same guarantee — the repair
> makes it ask for one more racer, the floor moves the aim it asks from — and every published figure
> for either came from a tree where it was alone. Measured on ten tracks at N=30 and four at N=300
> against **repaired master**, not against the old defective baseline.

**Accepted by the owner on production builds of `feat/aim-levers-1` on 2026-09-01 and 2026-09-02.**
He has decided against re-measuring candidate B on the corrected baseline and wants both in master.

---

## 1. THE GATE — none of the stopping conditions is met

**THE PROMISE DOES NOT FALL BACK.** At N=300 it holds or improves on three of four tracks, and the
one that slips does so by 0.01 pp:

| track, N=300 | repaired master | **combined** | |
|---|---|---|---|
| space-sprint | 99.44% | **99.46%** | better |
| seatrack | 98.84% | **98.90%** | better |
| river-run | 99.88% | **99.89%** | better |
| mountainstreet | 99.70% | **99.69%** | **−0.01 pp — 33 frames of 477,638** |

At N=30 it holds or improves on **9 of 10**; mountainstreet is the same track and the same direction
(99.54% → 99.50%, 18 frames of 46,205). **Reported as a finding, not treated as a stop:** it is
0.01 pp at the larger N, it is one track, and it is an order of magnitude smaller than what the
repair itself buys on the tracks that were worst.

**B'S GAIN IS STILL THERE, and on the track it was built for it is large.** Clipped episodes, N=300:

| track | repaired master | **combined** | |
|---|---|---|---|
| space-sprint | 1052 | **771** | **−281** |
| seatrack | 473 | **451** | −22 |
| mountainstreet | 434 | **419** | −15 |
| river-run | 222 | 224 | +2 |

And the centreline share on space-sprint goes **71.20% → 88.90%**, which is the floor's signature and
the thing he judged.

**FRAME COUNTS ARE IDENTICAL BETWEEN ARMS ON ALL TEN TRACKS AT BOTH N.** Still picture, not race.

---

## 2. THE RESTLESSNESS, ATTRIBUTED RATHER THAN GUESSED

The combined tree adds whole-screen single-frame pans: **seatrack 115 → 161**, **river-run 0 → 7**,
**mountainstreet 0 → 1** (N=300, pans > 1000 px between adjacent frames). That looks like an
interaction, and it is not one. seatrack was never measured for B alone at this N, so it was measured
rather than assumed — a third arm, the floor on the **unrepaired** tree:

| seatrack, N=300 | pans > 1000 px | max step | promise kept |
|---|---|---|---|
| repaired master (no floor) | 115 | 3863.2 px | 98.84% |
| **B alone** (floor, unrepaired) | **161** | 3649.8 px | 97.06% |
| **COMBINED** (floor + repair) | **161** | **3649.8 px** | **98.90%** |

**The big-pan count and the maximum are IDENTICAL between B-alone and combined.** The 46 extra pans
are entirely the floor's own cost; the repair neither adds to them nor removes them. The same arm
shows what the repair *does* do: B alone costs the promise (98.84% → 97.06%), and the repair not only
recovers that but ends above master (98.90%).

**river-run's carried-forward fault: the repair reduced it, 9 → 7.** AIM-ROOM-REPAIR-1 recorded nine
whole-screen pans in 479,587 adjacent steps where master had none, when the lateral guarantee engages
without an ease. On the combined tree it is **seven**, against **zero** on repaired master. **Still
present, slightly smaller, and still not fixed here** — it remains its own piece.

**Elsewhere the largest single-frame movement mostly IMPROVES**: space-sprint 737.5 → 675.4, seatrack
3863.2 → 3649.8, and at N=30 eight of ten tracks have a lower maximum. `step p99` rises modestly
almost everywhere (5–13 px), which is the honest cost of a shot that changes width more often.

---

## 3. THE PRICE — how much wider, against a correct baseline

Per-frame, matched by `(seed, frame)`. This is the first time the floor has been priced against a
tree whose guarantee was not under-asking.

| track, N=300 | frames wider | p50 | p90 | max |
|---|---|---|---|---|
| space-sprint | **26.20%** | 1.169× | 1.342× | 1.355× |
| seatrack | 15.65% | 1.099× | 1.309× | 1.356× |
| mountainstreet | 2.62% | 1.050× | 1.314× | 1.355× |
| river-run | 1.53% | 1.042× | 1.278× | 1.355× |

The widening is **bounded at about 1.355×** on every track — that is the floor doing exactly what it
is: a bound, not a proportional loosening.

---

## 4. THE TWO MEASURED STAMPS, RE-MEASURED ON THE COMBINED TREE

`straggler-truth` — **identical to the digit** for a third time (6.18/4.57, 7.53/5.75, 4.45/2.30,
5.95/4.38; same racers in shot, same settled-frame counts). The ending is untouched.

`tracking-lag` — all six frame counts identical (8626, 159, 13282, 8473, 4130, 2089):

| state | repaired master | **combined** |
|---|---|---|
| **LEADER_ZOOM** | 5.01 / 9.71 | **4.63 / 9.67** |
| **LEAD_CHANGE** | 4.64 / 7.45 | 4.52 / **8.78** |
| **OVERVIEW** | 2.75 / 16.00 | **2.87 / 18.54** |
| BATTLE_ZOOM | 5.81 / 10.05 | 5.85 / 10.05 |
| COMEBACK_ZOOM / PHOTO_FINISH | unchanged | unchanged |

`LEADER_ZOOM` improves on both percentiles — the state the floor aims at. **`LEAD_CHANGE` p95 and
`OVERVIEW` p95 are worse, and these are the same two regressions AIM-ROOM-REPAIR-1 recorded for the
floor alone** — an entry cost, not a tracking one: a race enters those states from wherever
`LEADER_ZOOM` left the camera, and the floor leaves it somewhere different. Carried forward
unchanged by the combination.

---

## 5. WHAT SHIPS

- `leaderAimRoomFloorPx` default **0 → 360** — the aim room floor, candidate B.
- The **source-level wiring repair**: `CameraDirector._anchorScreen` is the one way the director
  obtains an aim, and `anchorScreenPoint` is imported under an alias so no call site can silently
  drop the floor again.
- **Candidate A removed entirely** — key, mechanism, Dev-Screen control, harness wiring and test.
  Its removal was proven by four byte-identical fingerprints at floor 0, and that proof stands.

**MERGED, NOT REBASED.** R11: merge commits are the only method here — squash and rebase are both
disabled — and this branch *contains* a merge (`f01ff8ea`, which brought both candidates in before A
was removed), which a rebase would flatten and rewrite. The branch was caught up with master first
(THE SHIP ORDER step 1), so the branch tip's tree is the tree master receives and the fingerprints
below were measured on it.

---

## Limits

**The mountainstreet slip is one track and 0.01 pp at N=300**, measured twice in the same direction.
It was not chased to a mechanism; a third N would be the way to settle whether it is real or noise,
and that was not run.

**B alone was re-measured at N=300 on seatrack only.** That is the arm that decided the restlessness
question, and it settled it there. The same three-arm attribution was not run on river-run or
mountainstreet, so their new pans are attributed to the floor by analogy with seatrack and by the
9 → 7 comparison, not by a matched third arm on those tracks.

**The owner's acceptance is of the picture, not of these numbers.** He judged B on trees that carried
the under-asking guarantee, and he has declined to re-judge it on the corrected one. What this report
establishes is that the two changes do not fight each other — not that the combined picture is the one
he approved, which it cannot be, because the guarantee under it is different.
