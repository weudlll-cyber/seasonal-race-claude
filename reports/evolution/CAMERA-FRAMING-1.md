# CAMERA-FRAMING-1 — anchor, guarantee and frame position, for all six states

Branch `camera-refactor`. Camera-only: **no simulation file in the diff**, no engine ceremony, no
fingerprint. Return tag `pre/framing` (`74bf88b1`), registered in [TAGS.md](../../docs/TAGS.md) in
the same step. **Net −1358 lines. 3388 tests green.**

*(This report replaces the PARKED version of itself. The park was correct under the wording given at
the time — "more than one clean commit" — and the owner corrected the wording to what he meant:
don't ship anything broken or unverifiable. Length was never the concern. The block was then taken
through.)*

---

## 1. BUILD-VS-SPEC CONFORMITY

| Spec part | Status |
|---|---|
| **A** — six states: anchor, guarantee, position-from-principle, one rule | **DONE** (§2) |
| **B** — the two steering floors become guarantees | **DONE** — both DELETED, their job taken by the one guarantee (§4) |
| **C** — orientation-aware guarantee | **DONE** (§3), 1° sweeps over 360° on three projections |
| **D** — PHOTO_FINISH gets its own zoom entry | **DONE** (§5) |
| **E** — per-axis defect in the floor | **DONE** — fixed by deleting the floor that carried it |
| **VERIFY** — no simulation file | **HELD** (§8) |
| **VERIFY** — guarantee holds in every orientation, with numbers | **DONE** (§3) |
| **VERIFY** — clamp inert mid-glide | **DONE** — `clampActiveCount === 0` as a test (§4) |
| Tests adapted AND extended | **DONE** — 36 new, 59 obsolete deleted (§7) |
| Hygiene, line counts, what was left | **DONE** (§7) |
| One `feat(camera)` commit | **DONE** — `e4a7fd14`, plus this report |

**Deviations declared — two, both instructed mid-block:**

1. **No migration, and the whole migration chain deleted.** The owner said, while the block was in
   flight: *"one more time i dont need a migration i am th eonly one testing."* So schema v20 ships
   with **no v19→v20 migration**; any older stored config is discarded and the defaults are used,
   which is the loader's existing behaviour for an unknown version. That made the fourteen-step
   v5→v19 chain unreachable and therefore dead, so `cameraMigrations.js` (402 lines), the loader's
   per-version ladder (~230 lines) and their test suites (~700 lines) went with it. **His camera
   settings reset once, deliberately and visibly.**
2. **`_recordDetourFrame` was briefly deleted by an over-broad edit and restored** before commit,
   verbatim from the tag. Caught by its own tests, not by review — noted so the diff is read with
   that in mind.

---

## 2. THE SIX STATES, AS BUILT

| state | ANCHOR | GUARANTEE | POSITION | anything worth seeing ahead? |
|---|---|---|---|---|
| LEADER_ZOOM | the leader | corridor | forward | no — the race is behind him |
| **LEAD_CHANGE** | **the racer now leading** | **pair: him + the racer he just passed** | **forward** | no — the story is behind |
| BATTLE_ZOOM | the middle of the battle | pair: both contenders | centred | yes — a contender is ahead by construction |
| COMEBACK_ZOOM | the comebacker | corridor | centred | yes — he is catching the racers ahead |
| OVERVIEW | the leader | corridor | forward | no — the same shot at the widest setting |
| PHOTO_FINISH | the pair contesting the line | pair: both contenders | centred | yes — neither is "the one ahead" |

**One rule, not six special cases.** `_setTargets` is now: resolve WHO (`_framingSubjects`, the only
per-state part) → take `Math.min` of the state setting and the guarantee → apply the forward bias if
the state's answer to the position question is "nothing ahead" → set targets. The six-case switch, in
which each state resolved its own pan target and only LEADER received the bias, is gone.

**`position` is not a stored preference.** A test asserts
`position === (aheadMatters ? centred : forward)` for every state, so the principle and the answer
cannot drift apart, and frame position can never quietly become a slider.

**LEAD_CHANGE is now defined.** It had no case at all: `panTarget.js` has no `LEAD_CHANGE` branch, so
it fell through to the default centroid of whatever racers were passed, and the forward bias lived
inside `case CAM_STATE.LEADER_ZOOM` so it never received one. **It holds 37.6% of all frames** — more
than LEADER_ZOOM, more than triple OVERVIEW. Over a third of the race was framed by omission.

OVERVIEW keeps three anchor exceptions — start-of-race (hold the field before a leader exists),
finish lookback (hold a fixed point behind the line so the approach stays visible) and the entry-phase
T-space pan (travel along the racing line rather than across the infield). Each replaces the ANCHOR
and then rejoins the common path: same guarantee, same position step.

---

## 3. THE GUARANTEE HOLDS IN EVERY ORIENTATION — with numbers

One computation, `zoomCeilingToFit(worldVector)`: at cam.zoom `z` a world vector maps to
`z·(v.x·axisX, v.y·axisY)`, the frame reaches `frameExtentAlong` in that direction, and the ceiling
falls out. The corridor hands it the perpendicular to the heading; a pair hands it the line between
the contenders. **A guarantee widens; it never steers** (Lesson 192) — everything returns a ceiling
combined with `Math.min`, and nothing in `framingRule.js` moves a centre, picks a subject or reads a
clock.

Swept at **1° over a full 360°** on searound (closed, 131 px), ice-track (closed, 211 px) and
mountainstreet (open, 300 px):

- **corridor** fits at the guaranteed zoom at all 360 headings, on all three;
- **corridor is tight**: 2% tighter and it no longer fits, at every sampled heading;
- **pair** fits at all 360 separation directions, on all three;
- **failure proof — orientation-blind**: assuming the worst orientation everywhere, which is what an
  axis-blind bound must do, over-widens on **more than half the 360 headings, by more than 10% on
  average**. That is shot thrown away for most of a lap;
- **failure proof — single-axis**: judging a mostly-vertical pair separation by its X component
  permits a **2× tighter** shot at which the pair provably does **not** fit.

**This is what lets a battle go tighter than one track width, honestly.** The owner asked for settings
below 1; a nose-to-tail pair is separated by a few body lengths, so "everyone who matters stays in
frame" permits a **2× tighter** shot than the corridor proxy — measured, not asserted.

### Where each guarantee binds, at the shipped defaults

Swept over each track's own centreline, 360 real headings:

| state | tracks where it ever binds | mean share of the lap |
|---|---|---|
| OVERVIEW | 0 / 10 | 0% |
| LEADER_ZOOM | 0 / 10 | 0% |
| LEAD_CHANGE | 0 / 10 | 0% |
| **BATTLE_ZOOM** | **1 / 10** (searound) | **1%** (6% of that lap, ×1.08 widen) |
| COMEBACK_ZOOM | 0 / 10 | 0% |
| PHOTO_FINISH | 0 / 10 | 0% |

**At the shipped defaults the guarantees are pure backstop — they essentially never fire.** That is
the right shape for a guarantee, and it answers the question behind the owner's request: they only
start doing work when he pushes settings **below ~1 track width**, which is exactly where he wants
battles and photo finishes to go. He can take them tighter and be caught; before this block nothing
would have caught him.

---

## 4. THE TWO STEERING MECHANISMS — deleted, not converted

**The min-visible zoom floor** (`minRacersVisible`, `leaderMinZoom`, `leaderMinZoomFraction`,
`zoomOutStepPerFrame`, plus `_countVisibleRacers` and `_zoomFloorForMinVisible`). It read where the
racers happened to be and pulled the zoom out around them — a second zoom authority that fought the
state's own setting and ratcheted frame to frame. Its job, "do not crop what matters", is the
guarantee's now, which widens for **named subjects** rather than for a headcount.

It also carried the **third instance of the bsX/bsY per-axis defect**: one `effZoom` applied to both
axes, over-stating screen Y by **18.5%** on every closed track (dirt-oval 1.1846, searound 1.1852,
ice-track 1.1846; open tracks unaffected — that mapping is uniform). **Spec item E is discharged by
deletion**, which is the only fix that cannot regress.

**The containment clamp.** Its comment claimed "no-op mid-glide"; it was measured **active on 23 of 23
glide frames with corrections to −390 px**. It had become a rail steering the pan away from the glide
it was interpolating. Deleted. **That comment is now a test**: `clampActiveCount` stays `0` through a
40-frame glide. Keeping the anchor in frame is the zoom guarantee's job; the residual trail is the
tracking lag, measured in §6 rather than papered over.

**OVERVIEW-FRAMING-1's group fit** goes with them — "leader + N racers, derive the zoom to fit them"
is a guarantee phrased as a headcount, and how many racers you see is an *outcome* of how far in the
camera is, not an input to it.

---

## 5. PHOTO_FINISH HAS ITS OWN SHOT

It borrowed BATTLE's values in `cameraTimingComputation` and was absent from the zoom sliders, so the
most dramatic shot in the race was **never closer than an ordinary battle**. It now has its own
profile (default **1 track width**, tighter than BATTLE's 1.5 — safe because its guarantee is the two
contenders, not the corridor) and its own Dev Screen row alongside the other five.

A config that predates the key still frames exactly as BATTLE did — asserted by a test, so the change
cannot be silent.

---

## 6. WHAT THE TRACKING LAG COSTS — measured, unfixed, as instructed

`lag = v·(1−lf)/lf`, `lf = 1 − 0.1^(1/(TC·60))`:

| state | TC | lag factor | dirt-oval | searound | mountainstreet |
|---|---:|---:|---|---|---|
| **OVERVIEW** | **1.50** | **38.6** | **133 px = 18.5pp** | **181 px = 25.2pp** | 67 px = 9.3pp |
| LEADER_ZOOM | 0.25 | 6.0 | 42 px = 5.8pp | 57 px = 7.9pp | 21 px = 2.9pp |
| LEAD_CHANGE | 0.25 | 6.0 | 42 px = 5.8pp | 57 px = 7.9pp | 21 px = 2.9pp |
| BATTLE / COMEBACK / PHOTO_FINISH | 0.25 | 6.0 | 56 px = 7.7pp | 75 px = 10.5pp | 28 px = 3.9pp |

The model reproduces the owner's measured 65 px / 9pp at `trackWidths` 1 on Dirt Oval (it predicts
11.6pp at full leader speed; his frame was mid-settling).

**OVERVIEW's lag is in a different class** — a lag factor of 38.6 against 6.0 everywhere else, **a
quarter of the frame on searound**. In the widest shot that is probably invisible, but it means the
OVERVIEW anchor is nowhere near where the rule says it is. **Not tuned** — that is his conversation,
and it should be its first item.

**Point-versus-nose framing**, also not acted on: with the span formula corrected in
CAMERA-PICTURE-FIXES-1, the fraction places the anchor **point** at exactly the fraction the setting
names, on every heading. At 2 track widths a drawn body is ~5.5% of the frame, so point and nose
differ by under 3pp and the question is nearly invisible; at 1 track width and below it becomes
visible. **Leave it a point until he has looked at the corrected framing at his own settings** — the
knob should not exist before the question does.

---

## 7. HYGIENE

**Removed — key, control, label, tooltip and code together:** `minRacersVisible`, `leaderMinZoom`,
`leaderMinZoomFraction`, `zoomOutStepPerFrame`, `overviewFrameRacers`, `overviewMinSpriteFrac` (six
config keys, six Dev Screen sliders); `_containAnchorInFrame`, `_countVisibleRacers`,
`_zoomFloorForMinVisible`, `_setOverviewGroupTargets` (four methods); the whole migration chain.

**Extracted:** `camera/framingRule.js` (236 lines) — the table, the guarantee and the position
principle, pure. `_headingAt` — one definition of "which way is ahead", shared by the forward bias and
the corridor guarantee, which previously computed the tangent twice.

### Line counts

| file | before | after |
|---|---:|---:|
| `camera/CameraDirector.js` | 2875 | **2693** |
| `camera/CameraDirector.test.js` | 6329 | **6094** |
| `camera/cameraTimingComputation.js` | 360 | **356** |
| `cameraConfig.js` | 372 | **96** |
| `cameraConfig.test.js` | 1016 | **321** |
| `cameraMigrations.js` | 402 | **0 (deleted)** |
| `storage/defaults.js` | 712 | 716 |
| `DevScreen/sections/CameraAdvancedSection.jsx` | 1479 | **1416** |
| `camera/framingRule.js` | — | 236 (new) |
| `camera/framingRule.test.js` | — | 262 (new) |

**Net −1358 lines**, with 36 new tests included. `cameraConfig.js` fell from 372 to 96.

### Tests

**59 obsolete deleted** — the min-visible floor ×2, `_zoomFloorForMinVisible`, `_countVisibleRacers`,
OVERVIEW-FRAMING-1's group framing, and eleven migration suites: all testing code that no longer
exists. **36 added**: 26 in `framingRule.test.js` (the table, the orientation sweeps, four failure
proofs) and 10 through the director — every state resolves a finite anchor/zoom/offset; LEAD_CHANGE
anchors on the new leader (proven by perturbation: move the anchor and the camera moves, move a
non-anchor racer and it does not); LEAD_CHANGE keeps the overtaken racer in frame at a 0.3-track-width
setting; BATTLE keeps both contenders at 0.2; the guarantee leaves a generous setting alone; forward
states sit off centre and centred states do not; **`clampActiveCount === 0` through a glide**; the
deleted mechanisms are gone rather than merely unused; PHOTO_FINISH has its own zoom and a key-less
config still frames as BATTLE.

### Noticed and deliberately left

1. **`autoScaleConfig.minTargetScreenPx`** — pre-existing orphan in a race-relevant config block;
   removing it moves the world hash and needs the engine ceremony. Explicitly out of this block.
2. **`photoFinishCloseThresholdT` is lap-normalised** — one of the eleven lap-blind sites, a different
   class, its own block. Not touched even though this block worked next to it.
3. **`leaderForwardFrac` vs `leadAheadEnabled`** — still two mechanisms with confusingly adjacent
   names. The forward bias is now driven by the framing table rather than a per-state `case`, so the
   entanglement is smaller, but the names have not changed. Renaming touches stored config, and with
   migrations gone that is now a free change — a good candidate for the hygiene phase.
4. **`_smoothFocal` applies to LEADER and COMEBACK only.** Under one rule it arguably belongs to every
   single-racer anchor, which now includes LEAD_CHANGE. Left as-is because changing it moves the
   picture in the state that already changes most, and the owner should see one change at a time.

---

## 8. VERIFICATION

- **No simulation file in the diff.** Paths treated as simulation: `scripts/sim-*.mjs`,
  `scripts/sim/**`, `scripts/parity/**`, and in the client `raceCore.js`, `raceBehavior.js`,
  `raceStep.js`, `raceGovernor.js`, `racePlanner.js`, `rowLayout.js`, `durationModel.js`,
  `headlessRaceSimulator.js` and the race-config loaders. The staged diff was grepped against all of
  them before commit: none present. The ten touched files are camera, camera config, defaults, the
  Dev Screen and their tests.
- **The guarantee holds in every orientation, per state, with numbers** — §3.
- **The clamp is inert mid-glide** — `clampActiveCount === 0`, as a test.

---

## 9. THE OWNER'S EYE — his own design, in his words

**LEAD_CHANGE will change the most.** It is over a third of your race and has never been designed:
until this commit the camera sat on the average position of the top three and never pushed the leader
forward. Watch it first.

1. **Is the leader forward with the field behind him?** (LEADER, and now LEAD_CHANGE too.)
2. **Is the overtaken racer still visible at a lead change?** That is its guarantee — if he is ever
   cropped, the guarantee failed and I want the marker.
3. **Are both fighters framed in a battle?**
4. **Is the photo finish close enough to see who won?** It has its own setting now (1 track width,
   tighter than a battle); before this it was never closer than an ordinary battle.
5. **Does the comebacker sit centred, with road ahead and behind?**

**Your camera settings have reset to the defaults** — that is the no-migration decision you made
mid-block, working as intended. Everything is on the track-widths scale, and PHOTO_FINISH now has its
own row in the Dev Screen next to the other five.

Two things you will *not* see fixed, both measured and deliberately left: the camera still trails its
own target (worst in OVERVIEW — a quarter of the frame on Searound), and the frame fraction still
places a *point* rather than a nose. Both are your call, separately.

Press **M** and send the **whole** line.
