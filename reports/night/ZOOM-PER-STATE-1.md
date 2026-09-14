# ZOOM-PER-STATE-1 — he is right about the zoom, and the claim I gave him is false

**Read-only.** No source file was changed, nothing minted, nothing merged. Measured on
`feat/gap-leader-brake` at `27e177b8`. Date: 2026-09-14.

---

## STEP 5 FIRST, BECAUSE I GAVE IT TO HIM AS FACT

**The claim is FALSE.** I told him the camera "zoomed in by almost exactly the amount the gap shrank"
and cancelled the improvement. The arithmetic I quoted is right; **the conclusion drawn from it is
wrong**, and it is wrong because I divided each arm's gap by *that arm's own transient frame zoom*
instead of by the zoom the state actually delivers.

| | OFF | ON | ratio |
|---|---|---|---|
| gap, world px | 196.6 | 169.0 | **0.8596 (−14.0%)** |
| px per width **as I read it**, frame 4119 | 323.6 | 273.0 | 0.8436 |
| canvas widths **as I reported them** | 0.6075 | 0.6190 | **1.0189 (+1.9%, "cancelled")** |
| px per width the LEADER state **actually delivers when settled** | **225.0** | **225.0** | 1.0000 |
| canvas widths **at that settled value** | **0.8738** | **0.7511** | **0.8596 (−14.0%)** |

**At the shot the state actually delivers, the canvas-width figure shows the full 14% improvement —
exactly the world-px figure.** Nothing was cancelled. The cancellation was an artefact of my divisor.

★ **And the two frames were not even mid-race outliers I should have noticed as such**: they were
the **same frame index (4119)** in the **same camera state (LEADER_ZOOM)** on both arms — but
**neither was settled**. On the OFF arm `zoom 6.325` was still chasing `target 6.076`; on the ON arm
`7.499` chasing `7.381`. I compared two in-flight values and reported the difference as a camera
response to the race.

---

## STEP 1 — WHAT THE CODE PROMISES

Each state names a width, as `visibleCorridors`, in
[defaults.js:109-210](../../client/src/modules/storage/defaults.js#L109-L210):

| state | visibleCorridors | × referenceCorridorPx 300 | address |
|---|---|---|---|
| OVERVIEW | 1.5 | 450 px | [defaults.js:111](../../client/src/modules/storage/defaults.js#L111) |
| LEADER_ZOOM | 0.75 | 225 px | [defaults.js:131](../../client/src/modules/storage/defaults.js#L131) |
| LEAD_CHANGE | 0.75 | 225 px | [defaults.js:202](../../client/src/modules/storage/defaults.js#L202) |
| BATTLE_ZOOM | 0.55 | 165 px | [defaults.js:160](../../client/src/modules/storage/defaults.js#L160) |
| COMEBACK_ZOOM | 0.55 | 165 px | [defaults.js:173](../../client/src/modules/storage/defaults.js#L173) |
| PHOTO_FINISH | 0.4 | 120 px | [defaults.js:189](../../client/src/modules/storage/defaults.js#L189) |

**These are constants, but they are delivered as a REQUEST, not as the final width.** In
`_setTrackTargets` the state's value enters as `desiredEffZoom: proj.effX(stateCamZoom)` and the
answer comes back from `resolveCamera`, whose own comment at
[CameraDirector.js:4493-4496](../../client/src/modules/camera/CameraDirector.js#L4493-L4496) says it
"is the LAST authority on width and it only ever LOOSENS — it steps the zoom down 10% at a time until
the pan target lands inside `innerFramePct`, or until the projection floor."

### What can change the delivered zoom within a state

| term | what it does | address |
|---|---|---|
| `resolveCamera` framing guarantee | widens in 10% steps until the pan target fits the inner frame | [CameraDirector.js:4483-4492](../../client/src/modules/camera/CameraDirector.js#L4483-L4492) |
| world-bounds floor `minEffZoom` | a hard floor the widening stops at | [CameraDirector.js:4482](../../client/src/modules/camera/CameraDirector.js#L4482) |
| the glide between states | smoothstep from the old zoom to the new target | [CameraDirector.js:1236-1240](../../client/src/modules/camera/CameraDirector.js#L1236-L1240) |
| LEAD_CHANGE / snap paths | set `zoom` and `targetZoom` together (a cut, not a glide) | [CameraDirector.js:1979-1980, 2027-2028](../../client/src/modules/camera/CameraDirector.js#L1979-L1980) |
| the endgame schedule | drives `zoom` as a position rather than a chased target | [CameraDirector.js:1241+](../../client/src/modules/camera/CameraDirector.js#L1241) |

**Plainly: the delivered zoom is NOT constant per state by construction.** The state names a width and
the framing guarantee may loosen it.

---

## STEP 2 — WHAT THE ENGINE ACTUALLY DELIVERS

ice-track quick-test seed 3, 40 racers, both arms, **N = 4822 frames each**. The camera is seeded
from the race seed ([raceDriver.mjs:450](../../scripts/lib/raceDriver.mjs#L450)) and both arms got the
same `cameraSeed` 2246822504.

A frame counts as **SETTLED** when the glide is not running and the delivered zoom equals the target
it is chasing.

| state | frames | SETTLED: min / med / max | spread | TRANSITION: min / max |
|---|---|---|---|---|
| LEADER_ZOOM | 1572 | 225.0 / **225.0** / 862.7 (N=812) | 283.4% | 165.0 / 865.1 (N=760) |
| LEAD_CHANGE | 1441 | 225.0 / **225.0** / 225.0 (N=709) | **0.0%** | 165.0 / 351.6 (N=732) |
| BATTLE_ZOOM | 542 | 165.0 / **165.0** / 255.2 (N=301) | 54.6% | 165.0 / 347.5 (N=241) |
| OVERVIEW | 539 | 450.0 / **450.0** / 450.0 (N=327) | **0.0%** | 120.0 / 450.0 (N=212) |
| COMEBACK_ZOOM | 480 | 165.0 / **165.0** / 165.0 (N=304) | **0.0%** | 165.1 / 308.2 (N=176) |
| PHOTO_FINISH | 248 | 120.0 / 324.5 / 609.6 (N=113) | 407.9% | 120.0 / 620.1 (N=135) |

(ON arm figures are within a frame or two of these on every row.)

### Transitions versus drift inside a settled state — reported separately, as asked

| | OFF | ON |
|---|---|---|
| frames at an exact state value (120/165/225/450) | 2762 of 4822 (57.3%) | 2745 (56.9%) |
| **SETTLED frames at an exact state value** | **2352 of 2566 (91.7%)** | **2339 of 2557 (91.5%)** |
| frames NOT at a state value, of which **in flight** | 2060, of which **1846 (89.6%)** | 2077, of which **1859 (89.5%)** |
| settled-but-loosened frames | **214 of 4822 (4.4%)** | **218 (4.5%)** |
| frames wider than the widest state value 450 | 225 (4.7%) | 213 (4.4%) |

★ **This is the owner's statement, measured: three of six states are exactly constant when settled
(0.0% spread), and 91.7% of all settled frames sit exactly on a state value. Nine tenths of what
looks like variation is the camera MOVING between shots, not drifting within one.** The genuine
within-state variation — `resolveCamera` loosening on a settled frame — is **4.4% of frames**.

### The frames SCREENSHOT-VS-NUMBERS-1 used

| arm | frame | progress | state | lerp | zoom → target | px/width | settled? |
|---|---|---|---|---|---|---|---|
| OFF | 4119 | 0.926 | LEADER_ZOOM | tracking | 6.325025 → 6.076028 | 323.6 | **no** |
| ON | 4119 | 0.923 | LEADER_ZOOM | tracking | 7.499158 → 7.381258 | 273.0 | **no** |

**Same frame index, same state, and both in flight.** So the 323.6/273.0 difference is neither a
state difference nor within-state drift — it is two transients, and the arms differ because the brake
moved the subject the camera is chasing. After p=0.60 the two arms are in the **same state on 2127 of
2153 frames (98.8%)** and deliver an **identical zoom on 1177 (54.7%)**.

Of the settled LEADER_ZOOM frames, **711 of 812 (87.6%) are exactly 225.0 px per width, on both
arms.**

---

## STEP 3 — WHERE THE 120–1278 RANGE COMES FROM

| cause | contribution |
|---|---|
| **camera STATE** | 120 → 450 px, a **3.75× span**, and it is the whole discrete structure |
| **TRACK** | **none.** `referenceWidthFor(300, trackWidthPx)` returns **300 for all ten shipped tracks**, so every track delivers identically 120 / 165 / 225 / 450 |
| **within-state drift** | **essentially none when settled** — 91.7% exactly on a state value; the settled-but-loosened tail is 4.4% of frames |
| **transitions + loosening** | everything above 450, up to 865 measured here and 1278.4 in the sweep |

Measured on the sweep's own peak frames — the very frames the canvas-width columns were computed on
(**N = 600**, 300 pairs × 2 arms):

- **438 (73.0%) landed exactly on a state value**: 165 px ×265, 225 px ×106, 120 px ×51, 450 px ×16.
- **162 (27.0%) landed mid-transition or loosened**, and those produce everything else up to 1278.4.

★ **DECISION RULE: the dominant cause is the camera STATE, not drift. The owner is right about the
zoom, and our conversion was applied across incomparable moments** — a peak that happened during a
PHOTO_FINISH shot was divided by 120 and one during an OVERVIEW by 450, for the same physical
distance.

---

## STEP 4 — WHAT IT MEANS FOR THIS WEEK'S NUMBERS

### Is the canvas width a sound unit for comparing two runs of the same race?

**As we computed it, no — it describes one frame of one run.** Dividing each run's gap by that run's
own peak-frame zoom compares two different camera moments, and 27% of those moments were transients.

**As a unit it is sound, and the fix is the divisor.** Because 91.7% of settled frames sit exactly on
a state value and all ten tracks share the same values, dividing by **the state's own settled value**
— 225 px for the LEADER shot, which [defaults.js:131](../../client/src/modules/storage/defaults.js#L131)
calls "the reference shot, the owner's own eye" — makes the canvas-width comparison **exactly
proportional to the world-px comparison**, as the table at the top of this report demonstrates.

**World px remains the primary unit.** Canvas widths against a fixed state value are a faithful
restatement of it; canvas widths against the live per-frame zoom are not a unit at all.

### Every canvas-width figure in this week's reports

| report | figure | affected? | how |
|---|---|---|---|
| **GAP-BRAKE-1** (the dev-screen knob) | the allowance shown in canvas widths | **no** | it converts against a **fixed** yardstick (`LEADER_ZOOM.visibleCorridors × referenceCorridorPx` = 225), which is exactly the correct practice this report arrives at |
| **GAP-BRAKE-SWEEP-1** | "px/width at the peak: med (range)" 120–1278, and the canvas-width columns | **yes** | per-peak divisor; the reported *range* is now explained as state + transition, not drift |
| **GAP-BRAKE-WINDOW-1** | canvas-width secondary column, incl. the ice-track/space-sprint sign reversals | **yes** | per-peak divisor. The world-px columns are unaffected and carry that report's conclusions |
| **GAP-BRAKE-ARRIVAL-1** | canvas-width secondary column, incl. the searound 1.311 → 0.845 row | **yes** | per-peak divisor — searound's ON peak was read at 225 and its OFF peak at 165 |
| **QUICKTEST-ICE-3** | 0.608 → 0.619 widths | **yes** | per-peak divisor; at 225 px it is **0.874 → 0.751**, a 14% improvement |
| **SCREENSHOT-VS-NUMBERS-1** | the same pair, and the "camera cancelled it" claim | **yes — and the claim is false**, see the top of this report |
| **BREAKAWAY-FREQUENCY-1 (corrected shares)** | the ≥0.698-canvas-width breakaway share | **yes, and it needs re-reading** | see below |

### The corrected BREAKAWAY-FREQUENCY-1 shares specifically

Those shares count races whose peak lead reached **0.698 canvas widths**, with the width taken from
the live frame. In world px that threshold is not one distance but four:

| shot live at the peak | 0.698 canvas widths = |
|---|---|
| PHOTO_FINISH (120) | **84 world px** |
| BATTLE / COMEBACK (165) | **115 world px** |
| LEADER / LEAD_CHANGE (225) | **157 world px** |
| OVERVIEW (450) | **314 world px** |

**A 3.75× spread in the threshold, decided by which shot the camera happened to be holding.** On the
sweep's 600 peak frames the divisor was 165 on 265, 225 on 106, 120 on 51 and 450 on 16, with 162
in flight. So the share is partly a statistic about the camera's shot selection. **Those figures were
themselves a correction to this column, and they need re-reading in this light** — the correction
fixed the `finishT` factor and left the per-frame divisor in place.

---

## NO REPAIR

Nothing was changed: no camera value, no conversion, no key. What is true is named above with its
address — the state values in
[defaults.js:109-210](../../client/src/modules/storage/defaults.js#L109-L210), the loosening at
[CameraDirector.js:4493-4496](../../client/src/modules/camera/CameraDirector.js#L4493-L4496), and
the glide at [CameraDirector.js:1236-1240](../../client/src/modules/camera/CameraDirector.js#L1236-L1240).

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **PHOTO_FINISH is the one state whose settled median is not its own value** — 324.5 against a
  request of 120, with a 408% spread. It is the tightest request made at the moment the field is most
  spread, so `resolveCamera` loosens it hardest. Reported, not investigated.
- **`loadTracks` exposes no `trackWidthPx`**, so `referenceWidthFor` falls to the 300 default on all
  ten tracks in every harness. If the browser passes a real per-track width the state values would
  differ there and this report's "track contributes nothing" would hold only for the harness. I did
  not chase it; it does not change any conclusion here, because the measured settled values were
  exactly 120/165/225/450.
- The three uncommitted eye-test lines in `defaults.js` are still in the working tree and the three
  services still serve that build. Untouched; this block measured from the scratch checkout.
- The standing items are unchanged: the dead front leash, `raceCore.js:679-683` omitting
  `governorMult` from `vt`, the "SIM-ONLY" and "default OFF" stale comments, `docs/FORCE-MAP.md`'s
  four stale windows, and `sim-fairness.mjs` being unable to exercise the brake.
