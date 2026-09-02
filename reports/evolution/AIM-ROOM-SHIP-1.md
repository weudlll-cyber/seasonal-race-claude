# AIM-ROOM-SHIP-1 — A is out and returns master exactly; B is built and measured, and it is NOT merged

> **STOPPED BEFORE THE MERGE, DELIBERATELY, AND THE REASON IS A DEFECT I CAN PROVE.** Everything the
> ship asked for is done and green except the merge itself, the mint, the tag, the branch clearance
> and the server handover — all of which are held behind one finding that the brief itself said to
> report **before** merging, not after. Branch `ship/aim-room-floor-1`, pushed, unmerged, unminted.

---

## 0. THE FINDING THAT STOPPED IT

**The room floor measurably weakens the company guarantee on all ten tracks, and roughly half of that
is a WIRING OMISSION rather than the lever's cost.**

`anchorScreenPoint(frameW, frameH, forwardFrac, headingScreen, roomFloorPx = 0)` takes the floor as
its fifth parameter. **All seven call sites in `CameraDirector.js` omit it** — lines 2240, 2583,
2925, 3156, 3307, 4051 and 4098 — so every framing guarantee (company, corridor, point, pair) plans
the shot around a leader position **the pan will not deliver**, because `_applyLeaderForwardBias`
(line 4184) *does* apply the floor. The aim and the guarantees disagree, which is the one thing
`framingRule.js`'s own contract forbids.

**This is a documented failure class in this very file.** `CameraDirector.js:4045` records the last
time it happened, in its own words: *"(0.66 assumed against a true 0.399 dead ahead), which is why it
delivered one companion fewer than it promised."* That is the same defect, reintroduced by a new
term that the guarantees were never told about.

AIM-LEVERS-1 stated the contract was kept — *"One helper, used by both `anchorScreenPoint` and
`_applyLeaderForwardBias`"*. The helper is reachable from both; it is only **fed** in one. The claim
was true of the plumbing and false in effect, and nothing measured it because the key was OFF.

### Measured, on the real path, ten tracks, 30 races, at the shipped `minRacersVisible`

A frame is a SHORTFALL when fewer racers are in shot than the guarantee promises **and** at least
that many were still running — a race with four left cannot show five.

| track | shortfall, floor 0 | shortfall, floor 360 | worst count 0 → 360 |
|---|---|---|---|
| city-circuit | 0.00% | **3.99%** | 5 → 2 |
| dirt-oval | 0.03% | 0.96% | 4 → 2 |
| garden-path | 0.00% | 0.10% | 7 → 4 |
| ice-track | 0.04% | 0.13% | 4 → 3 |
| luger-hill | 0.30% | 0.72% | 3 → 3 |
| mountainstreet | 0.59% | 1.80% | 3 → 2 |
| river-run | 0.82% | 1.30% | 3 → 2 |
| searound | 0.16% | 1.23% | 4 → 2 |
| seatrack | 2.46% | **5.73%** | 4 → 2 |
| space-sprint | 4.40% | **12.38%** | 1 → 1 |

**Context that matters and cuts both ways: the guarantee already under-delivers today.** At floor 0
it is 4.40% on space-sprint and 2.46% on seatrack. This ship does not create the class; it roughly
doubles to triples it, and takes the worst case to **2 racers in shot** on five tracks.

### The diagnosis is PROVEN, not argued

The floor was temporarily passed to the company guarantee's `anchorScreenPoint` — one call site, one
argument — and the measurement re-run. **The experiment was then fully reverted**; no such change is
in this branch.

| track | floor 0 | floor 360, as built | floor 360, guarantee told about the floor |
|---|---|---|---|
| space-sprint | 4.40% | 12.38% | **6.81%** |
| seatrack | 2.46% | 5.73% | **3.29%** (worst back from 2 to **4**) |

**About half the regression is the omission and about half is the lever's genuine cost.** The floor
moves the leader toward the centre of the frame, which by construction shows less road BEHIND him —
and the pack behind him is exactly what the guarantee counts. That half is real and unavoidable. The
other half is a bug.

### Two unit tests are RED and are being left red

`framingRule.test.js` — *"catches a tight LEADER setting when the shot would go empty"* (expected ≥3,
got 2) and *"delivers the promised count INSIDE the region it promises, not merely on canvas"*
(expected ≥4, got 2). They are the unit-level signal of the same defect. **They have not been
adjusted to pass**, because a test edited to accept a broken promise is how the promise stops being
one — the same rule the brief set for `aspectCap.test.js`.

### WHY THIS NEEDS HIS WORD RATHER THAN A DECISION HERE

The two available moves are not interchangeable, and one of them invalidates his eye test:

1. **Ship as accepted.** The picture he judged on 2026-09-01 and 2026-09-02 was produced by a build
   with this exact wiring, so what he approved is this behaviour, weakened guarantee included. The
   defect then goes on the backlog.
2. **Feed the floor to the guarantees first.** This is the correct repair and recovers about half the
   regression — but it **changes the picture**, so the thing he accepted is no longer the thing that
   would ship, and the eye test would have to be taken again.

Proceeding either way without asking would be wrong: (1) knowingly ships a defect I measured, and (2)
silently substitutes a different picture for the one he approved.

---

## 1. LEVER A IS OUT, AND THE SPRITE PATH IS PROVABLY MASTER'S

Removed entirely: the key, the mechanism, the Dev-Screen control, the harness wiring and the test.

| file | how |
|---|---|
| `client/src/modules/racer-types/SpriteRacerType.js` | reverted to master, **byte-identical** |
| `client/src/modules/headlessRaceSimulator.js` | reverted to master, **byte-identical** |
| `client/src/screens/RaceScreen/index.jsx` | reverted to master, **byte-identical** |
| `scripts/lib/raceDriver.mjs` | reverted to master, **byte-identical** |
| `client/src/modules/racer-types/aspectCap.test.js` | **deleted** |
| `client/src/modules/storage/defaults.js` | `leaderBodyAspectMax` key and comment removed |
| `client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx` | candidate A slider removed |
| `scripts/diag/aim-levers.mjs` | `--aspect=` flag and the `a`/`ab` arms removed |

**`aspectCap.test.js` went with the mechanism rather than being adjusted.** Every one of its 8
assertions imports `guardedBodyFillNarrow`, `setBodyLongAxisMaxRatio`, `getBodyLongAxisMaxRatio` or
`resetBodyLongAxisMaxRatio`; all four exports are gone. The thing it tested no longer exists. The
sleeping long-axis guard it also touched (`BODY_LONG_AXIS_MAX_RATIO`) is back to being exactly what
master has, and master's own coverage of it is unchanged.

**THE PROOF, run rather than reasoned.** With the room floor temporarily set to **0** on this branch —
so that the only difference from master is A's removal — **all four fingerprints equal master's
record byte for byte**: world, world-off, camera and render. A left nothing behind. The values are
not restated here; `docs/fingerprints.json` is their one home.

**The `--aspect=` flag was removed, not defaulted off.** A flag whose exports no longer exist would
have silently done nothing, and "the lever has no effect" is exactly what a dead flag reports.

---

## 2. THE STORED CONFIG — he is not left carrying a dead setting

Checked by running `pruneStored` against the new defaults, not by reading the code. Three results,
from a throwaway probe placed in `client/src/modules/storage/` and **deleted before commit**:

- **A stored `leaderBodyAspectMax` is DROPPED.** `pruneStoredCameraConfig()` runs on every
  `loadCameraConfig()`, and `pruneStored` keeps only keys present in the defaults. His testing value
  disappears on the first load after this ships, and the resolved config has no such key.
- **A stored `leaderAimRoomFloorPx: 360` from his testing is also dropped** — it now equals the
  default, so he simply follows the default and sees the same picture.
- **A stored `0` would SURVIVE and beat the default.** Stated because it is the one way he could end
  up on the old picture without meaning to. He cannot currently be in that state: `saveCameraConfig`
  stores only what DIFFERS from the defaults, and while the default *was* 0 a value of 0 was never
  storable.

---

## 3. TEN TRACKS, 30 RACES — the floor is self-limiting, demonstrated

**Frame counts are identical between arms on all ten tracks**, which is the property that makes this
a comparison of two framings of the same races: the floor moves the PICTURE and not the race.

**Does it engage?** Yes, on every track — and it never lets the room fall below the floor. The share
of mid-race `LEADER_ZOOM` frames where the pre-ship room was under 360:

| track | engages on | room p10, 0 → 360 | room p50, 0 → 360 | minimum room |
|---|---|---|---|---|
| space-sprint | **71.8%** | 245.9 → 360.0 | 258.9 → **360.0** | 244.8 → 360.0 |
| seatrack | 48.8% | 248.4 → 360.0 | 368.6 → 368.6 | 244.8 → 360.0 |
| garden-path | 42.1% | 248.5 → 360.0 | 435.4 → 435.4 | 244.8 → 360.0 |
| city-circuit | 37.2% | 248.8 → 360.0 | 435.2 → 435.2 | 244.8 → 360.0 |
| dirt-oval | 30.4% | 252.1 → 360.0 | 435.2 → 435.2 | 244.8 → 360.0 |
| searound | 22.0% | 272.3 → 360.0 | 444.0 → 444.0 | 244.8 → 360.0 |
| ice-track | 20.8% | 280.7 → 360.0 | 436.8 → 436.8 | 244.8 → 360.0 |
| river-run | 17.5% | 274.8 → 360.0 | 446.7 → 446.7 | 244.8 → 360.0 |
| mountainstreet | 14.0% | 288.6 → 360.0 | 448.3 → 448.3 | 244.8 → 360.0 |
| luger-hill | 13.4% | 305.6 → 360.0 | 447.1 → 447.1 | 244.8 → 360.0 |

**That table IS the "by construction" claim demonstrated.** The median is untouched on **9 of 10**
tracks — only space-sprint's moves — while the p10 tail is lifted to exactly 360 everywhere. It binds
in the tail and is inert in the middle, which is what a floor is supposed to do.

**The fault and the steadiness, per track** (clip episodes are runs of adjacent clipped frames;
corner overflow IS the clip metric, tested on the four drawn corners):

| track | clip% 0 → 360 | clip episodes | Δeps | centreline% | step p99 | step max |
|---|---|---|---|---|---|---|
| space-sprint | 3.64 → 2.62 | 109 → 79 | **−30** | 70.01 → **92.20** | 175.7 → 175.1 | 512.6 → 506.5 |
| seatrack | 2.20 → 2.03 | 63 → 56 | −7 | 79.71 → 82.10 | 209.7 → 209.6 | 1280.0 → 1277.1 |
| mountainstreet | 0.95 → 0.85 | 52 → 48 | −4 | 85.67 → 86.55 | 189.6 → 189.6 | 848.9 → 845.9 |
| dirt-oval | 1.36 → 1.26 | 41 → 39 | −2 | 99.95 → 100.00 | 175.2 → 175.1 | 797.6 → 795.9 |
| river-run | 0.38 → 0.31 | 22 → 20 | −2 | 90.45 → 90.61 | 163.4 → 162.2 | 764.0 → 760.6 |
| city-circuit | 1.44 → 1.33 | 35 → 34 | −1 | 99.46 → 99.81 | 166.6 → 166.9 | 776.4 → 773.8 |
| searound | 1.25 → 1.22 | 26 → 25 | −1 | 99.34 → 99.37 | 163.6 → 163.6 | 721.7 → 721.3 |
| garden-path | 0.72 → 0.68 | 16 → 16 | 0 | 99.74 → 99.95 | 144.3 → 144.4 | 685.9 → 685.1 |
| luger-hill | 0.42 → 0.41 | 10 → 10 | 0 | 93.00 → 93.39 | 143.7 → 143.7 | 778.8 → 775.0 |
| ice-track | 1.34 → 1.22 | 32 → **33** | **+1** | 99.26 → 99.57 | 148.4 → 148.6 | 218.2 → 218.2 |

**No track costs steadiness.** `step p99` and `step max` are flat or improved on all ten; the largest
single-frame picture movement never grows. **No track engages unexpectedly** — engagement tracks
chord length exactly, highest where the chord is shortest.

### Stage 2 — the one arm that needed it

ice-track was the only adverse reading (+1 episode at N=30). At **N=300, 358,429 frames** it goes the
right way: **302 → 294 episodes (−8)**, clip 1.20% → 1.09%, centreline 99.08% → 99.25%, step p99
159.3 → 158.9, step max 2022.1 → 2020.8. The +1 was noise, and no other track needed 300.

---

## 4. THE INSTRUMENT TRAP THIS SHIP WALKED INTO AND CAUGHT

**The first ten-track sweep returned bit-identical clip counts on all ten tracks** — which reads
exactly like "the lever does nothing" and was in fact "the instrument measured one arm twice".

`aim-levers.mjs` built its config as `FLOOR > 0 ? {...override} : DEFAULT_CAMERA_CONFIG`. That was
correct while the shipped default was 0, because "off" and "the default" were the same object. **This
ship moved the default to 360, and the `off` arm silently became a second copy of the shipped arm.**

Fixed by having the arm always state its own value: `{ ...DEFAULT_CAMERA_CONFIG, leaderAimRoomFloorPx: FLOOR }`.
Validated afterwards against AIM-LEVERS-1's published figures, which it now reproduces exactly —
space-sprint off 3.64% / b360 2.62%, and off 109 / b360 79 episodes.

**The same lesson is why `frameGeometry.test.js` was changed**, and it is the only test in this block
that was: three of its cases asserted "one setting gives one displacement on every heading" while
inheriting `DEFAULT_CAMERA_CONFIG`, so the shipped floor broke the very property they exist to check.
They now pin `leaderAimRoomFloorPx: 0` explicitly and say why, and **two new cases assert the floor's
own behaviour** — inert on a long chord, binding on a short one — so pinning it off cannot be mistaken
for leaving it untested. That file is green at 33 tests.

**And a probe of my own failed the same way and was caught by a control.** The first cut of
`company-under-floor.mjs` read `cd.x`/`cd.y` as a world camera centre. Those fields do not exist, so
every racer read as out of shot and **both arms returned a 100% shortfall with mean 0.00** — a silent
zero that would have read as a catastrophic finding. It was caught by running a control before
trusting it, and the fixed probe works in screen space as the renderer does.

---

## 5. THE TWO MEASURED STAMPS THE PREVIOUS BLOCK PROMISED TO RE-MEASURE

AIM-LEVERS-1 re-stamped both rather than re-measuring, justified by a byte-identical camera
fingerprint at the OFF defaults, and wrote the condition in: *if the key is ever defaulted ON,
re-measure rather than re-stamp.* **That condition is now met and was honoured.** The camera
fingerprint DID move, so no byte-identical argument was available and none was used.

**`straggler-truth` — RE-MEASURED IN FULL, IDENTICAL TO THE DIGIT.** 6.18/4.57, 7.53/5.75, 4.45/2.30,
5.95/4.38, the same racers in shot and the same settled-frame counts. This is a stronger result than
the identical-figures entries above it in that document, because here the picture demonstrably
changed elsewhere and this window still did not.

**`tracking-lag` — RE-MEASURED IN FULL, AND THREE OF SIX STATES MOVED.** All six frame counts
identical (8626, 159, 13282, 8473, 4130, 2089), which is the load-bearing half.

| state | median pp | p95 pp |
|---|---|---|
| LEADER_ZOOM | 5.07 → **4.73** | 9.71 → **8.95** |
| LEAD_CHANGE | 4.64 → **4.49** | 7.45 → **8.77** |
| OVERVIEW | 2.75 → **2.87** | 16.00 → **18.54** |
| BATTLE_ZOOM / COMEBACK_ZOOM / PHOTO_FINISH | unchanged | unchanged |

**`LEADER_ZOOM` improves on both percentiles** — the state the ship aims at. **Two numbers move the
wrong way and are reported rather than buried**: `LEAD_CHANGE` p95 and `OVERVIEW` p95. Neither state
reads the floor; the mechanism is entry, not tracking — a race enters them from wherever
`LEADER_ZOOM` left the camera, and the floor leaves it somewhere different. It is a transition cost
at the p95 of the two states with the lowest medians in the table.

---

## 6. FINGERPRINTS — measured on the branch, NOT minted

**World and world-off are UNMOVED**, which is the required result: this is a picture change and must
not touch the race. Both equal the record.

**Camera and render both MOVED**, as expected for a shipped camera default. **Their new values are
deliberately not written here** and nothing has been minted — `docs/fingerprints.json` is untouched.
Minting permission was granted for this ship and is **not exercised**, because the brief requires the
values to be confirmed on the MERGED tree and the merge is held.

`engine-reach --check` on the twelve changed paths selects **`client/src/modules/storage/defaults.js`
only — 1 of 12**. Reported rather than overridden: the closure doubled to 76 files yesterday, and the
narrower answer here is correct, because the camera modules are not in `raceCore.js`'s import graph.

---

## 7. STATE OF THE TREE

`npm run verify`: **PASS 18, FAIL 3** before the test work; after it, the two `framingRule` failures
remain and are the finding above. `check-measured-stamps` and `script-suite` fail only because the
two re-measured stamps carry a block name where the guard requires a hex SHA — they can only be
stamped with a commit that exists, which is the commit this branch is waiting to be allowed to make
into master.

**Not done, and each is held behind the same one question:** the merge, the mint, the ship-tag
decision, clearing `feat/aim-levers-1` at origin, and moving 4173 to master. **4173 is still serving
`feat/aim-levers-1`, which is where the previous constraint left it and where it should stay until
this is settled.**
