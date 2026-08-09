# MIN-RACERS-5 — the owner's verdict becomes the shipped value

**Branch:** `feat/min-racers-5`, off master `1ea3a6bb`. **Not merged, not minted** — this is a visible
change and his eye decides it.

`minRacersVisible` **3 → 5**, plus the two mirrors of that number that were still saying 3.

---

## THE THING TO READ BEFORE THE EYE TEST

**On the two tracks the benches use — searound and river-run — this change does NOTHING.** Zero
frames differ. If he eye-tests on either, he will correctly report that he sees no difference, and
that will be true and will tell him nothing about the setting.

**It bites on five of the ten fingerprint tracks.** `city-circuit` is the one to look at.

## What it does, measured

`--arms=3,5`, n=40, seed 5601, one run each. **CHANGED** is the share of frames whose zoom differs
from the same race at 3; **widest** is the largest single-frame widening.

| track | CAPPED% 3 → 5 | CHANGED% | widest |
|---|---|---|---|
| **city-circuit** | 16.7 → 24.2 | **12.9 %** | **1.369×** |
| **ice-track** | 4.0 → 10.2 | 6.2 % | 1.443× |
| **dirt-oval** | 13.8 → 13.8 | 4.9 % | 1.339× |
| **space-sprint** | 1.0 → 3.8 | 2.9 % | 1.110× |
| **garden-path** | 5.1 → 6.5 | 1.5 % | 1.099× |
| luger-hill | 21.9 → 21.9 | 0.0 % | — |
| mountainstreet | 29.2 → 29.2 | 0.0 % | — |
| river-run | 33.0 → 33.0 | 0.0 % | — |
| searound | 4.4 → 4.4 | 0.0 % | — |
| seatrack | 7.9 → 7.9 | 0.0 % | — |

**The zoom RANGE does not move** — p5/median/p95 are identical between the arms on every track,
because the shot's zoom sits on the discrete levels the state profiles set. The cost is in the tail,
not the distribution: on city-circuit one frame in eight is wider, and at its most extreme the shot
opens **37 %** wider than it would at 3. That is the number to weigh against what he gains.

**The five tracks where nothing changes are the ones already capped by something else** — river-run
and mountainstreet are capped on 33 % and 29 % of frames at *both* settings, so the field ceiling or
the geometric guarantee is already holding the shot wider than company would ask for. The guarantee
only speaks where nothing else is speaking.

`scripts/company-bind-truth.mjs` (new, read-only) produces this table.

### The spread-field sweep is still owed and I did NOT run it

The comment's open question is whether 5 is right on a **spread** field, which is the case the
original 3-beats-5 measurement never covered. What is above is *one seed per track* and says where
the setting acts, not whether the picture is better. **The sweep that would answer it** — several
seeds per track, scored on emptiness (frames with the subject alone) against restlessness (zoom
direction changes per second), on the tracks that spread rather than pack — is named here and left
unrun, as instructed.

## The three things that had to move with it

**1. `framingConfig.js` — `DEFAULT_MIN_RACERS_VISIBLE` 3 → 5. Brought in step.** No reason to differ:
it is the fallback a partial-config caller gets, so a default of 5 answered by a fallback of 3 would
mean the shipped path and the unit-test path frame differently, and only the shipped path is covered
by the fingerprints. **Nothing guards this agreement** — `check-config-keys` checks that a key
*exists* in the defaults, never that a mirrored fallback still *agrees* with it. Comment says so at
the constant.

**2. The Dev Screen slider — now reads the defaults, not a literal.** It said `?? 3` in three places,
so an untouched slider displayed 3 while the game ran 5: the control he uses to judge the number
disagreed with the number. Rather than swap one literal for another I pointed it at
`DEFAULT_CAMERA_CONFIG.minRacersVisible` — the file already imports that object and already uses it
that way for `cameraStateProfiles`, so this is the file's own convention and the drift cannot recur.
The tooltip said "Default 3" and now states 5 with his reasoning.

**3. `CameraDirector` — the finish condition. NOT changed, as instructed, and here is what it now
means.** `finishedCount >= 1 + minRacersVisible` retires the company guarantee at the finish; that
moves from **4 finishers home to 6**. Measured, because the prose could sound alarming:

| track | 4th home | 6th home | extra window |
|---|---|---|---|
| searound | 62.58 s | 62.75 s | **0.17 s (10 frames)** |
| river-run | 58.72 s | 58.83 s | 0.12 s (7 frames) |
| city-circuit | 78.07 s | 78.17 s | 0.10 s (6 frames) |

**Six to ten frames.** The field arrives in a cluster, so the 4th and 6th finishers cross a tenth of
a second apart and the guarantee retires essentially when it always did. This is not where the change
is felt.

The other two reads — the zoom floor and `_companyCeiling` — are the change itself and are where the
table above comes from.

## Fingerprints — NOT minted

```
WORLD    dc4647be0f55ebdb  ->  dc4647be0f55ebdb   UNCHANGED   (framing, not the race)
CAMERA   7ba59a6378d37a2c  ->  ad07c08ce5d8ae49   MOVED
RENDER   9b7acc7419c5ba59  ->  752df7bc61ef0721   MOVED
```

`docs/fingerprints.json` still carries master's values, deliberately. The mint is a ship-time act and
this needs his eye first. `check-fingerprints --mint` will fail on this branch; that is the tripwire
working.

Both moves were expected — the camera decides the shot, and the render harness builds a real
director, so any change to the shot changes the draw-call transform on every frame.

## Verification

```
$ node scripts/engine-reach.mjs --check <the four changed paths>
ENGINE REACH: 1 of 4 path(s) can change the race:
  client/src/modules/storage/defaults.js
```

Expected and **noted, not a stop**: `defaults.js` is in the hull because the engine reads other keys
from the same object. `minRacersVisible` is read only by the camera, and the world fingerprint
confirms it: unchanged.

Camera suite **738 tests, 16 files, all green** (`CameraDirector.test.js` 351, `framingConfig.test.js`
20). ESLint clean; Prettier clean.

`npm run verify` was run **once, at the end, on the branch** — not on master. After what the ship
uncovered, that distinction is load-bearing: on master `verify` diffs `master...HEAD`, finds nothing,
skips all seven guards and still exits 0. On a branch it routes correctly. Result in the reply.

## Source hygiene

| file | +/− | what |
|---|---|---|
| `client/src/modules/storage/defaults.js` | +11 −1 | value 3 → 5, carrying over the comment from `feat/min-racers-visible-5` verbatim plus a line naming the two mirrors |
| `client/src/modules/camera/framingConfig.js` | +14 −2 | fallback 3 → 5, with why it mirrors and what does not guard it |
| `client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx` | +11 −5 | slider reads the defaults; tooltip corrected |
| `docs/CAMERA_DIRECTOR.md` | +1 −1 | §8.1 row: the disagreement is recorded as RESOLVED, not deleted |
| `scripts/company-bind-truth.mjs` | +145 −0 | new, read-only |

**`feat/min-racers-visible-5` was NOT merged**, as instructed — its value and its comment were
re-applied by hand onto master. That branch stays where it is; it is still the only place its own
commit message lives.

### Noticed but left

- **My first version of the measurement was wrong and the wrong number is in the script's header.**
  It called `_companyCeiling` again after the frame and counted when it was the smallest term —
  reporting 0 % on every track while the camera fingerprint plainly moved. The cause: `update()` has
  already advanced `this.state` and `this._proj` by the time a harness can call it, so the recomputed
  ceiling is not the one the frame used. Replaced with a differential against a real OFF run, which
  cannot fail that way. Recorded in the script so the next person does not repeat it.
- **The zoom percentiles are a poor instrument here** and are reported only to show they do not move.
  Zoom lands on the discrete levels the state profiles set, so a change affecting one frame in eight
  leaves p5/median/p95 untouched.
- **`DEFAULT_REFERENCE_CORRIDOR_PX` and `DEFAULT_INNER_FRAME_PCT` in the same file are the same
  shape** — literals mirroring `defaults.js` with nothing checking they still agree. They agree
  today; I checked. A guard that compares every mirrored fallback against its default would close
  this class, and this block did not build one.
