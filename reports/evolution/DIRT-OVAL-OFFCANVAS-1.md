# DIRT-OVAL-OFFCANVAS-1 — the contender who leaves the frame was never in contention

**Date:** 2026-09-04 · **Branch:** `diag/dirt-oval-offcanvas-1` off master `0bf48700`
**DIAGNOSIS ONLY.** No repair is designed, proposed or built. No default moved, no config key was
added, no threshold was touched, no gate exclusion changed. **Nothing was minted.**

`reports/evolution/ACCEPTED-FINISH-1.md` §6 records this failure as reported and not diagnosed. This
answers *how*.

---

## HEADLINE

**Racer 36 is off canvas for the last 78 frames before the winner crosses — and on every one of
those frames `withinOneLength(leader, racer 36)` is FALSE.** He is 3.66 body lengths back. He is in
the shot's contender set only because `_abreastContenders` ends with

```js
return out.length >= 2 ? out : ordered.slice(0, 2);
```

**Nobody is contesting the line, so the rule names second place anyway — deliberately, so the photo
finish has a pair to frame rather than one racer. Item 7 then reads that same set and requires every
member on canvas.** The fallback that guarantees the shot a partner is the fallback that guarantees
item 7 a member the shot cannot hold.

---

## STEP 1 — REPRODUCED, EXACTLY

**METHOD:** `node scripts/viewer-invariants.mjs --tracks=dirt-oval --seeds=3 --arm=shipped --dump
--json=…`, shipped defaults, nothing set. Run three further times during step 2 with instrumentation
that changes no behaviour; **item 7 read FAIL 78 on all four runs.**

| | |
| --- | --- |
| item 7 | **FAIL, 78 frames** — the count in ACCEPTED-FINISH-1, reproduced |
| endgame window | **517 frames** (frames 6867–7383, progress 0.95011 → 0.99986) |
| **the share** | **78 / 517 = 15.1% of the endgame window** |
| worst frame | `i7_worst = 1` — **never more than one contender off at a time** |
| every other item | 1, 2, 4, 5, 6, 9, 10, 11 all pass; the leader is in shot on 100% of frames |

The window is 6.8% of the race: 517 of 7,640 frames, with 6,868 before it.

---

## STEP 2 — READ FROM THE FRAMES

**METHOD for all of §2.** The shipped probe reduces item 7 to a per-frame COUNT (`contOff`) and
throws away which racer, where he was, and what the rule decided — and `viewer-invariants.mjs` keeps
only the graded sheet, not the raw window rows. **Both were instrumented temporarily and both are
reverted** (see SOURCE HYGIENE). No file any fingerprint reaches was touched; that was established
before editing, by asking the router — `viewerProbe.js` and `RaceScreen/index.jsx` are reached by
**none** of the three fingerprints, and `CameraDirector.js`, which is reached by camera and render,
was **not touched**.

### a) WHO — one racer, the same one, every frame

**Racer index 36, on all 78 frames.** No other racer is ever off canvas in the window.

### b) WHEN — one contiguous run, ending at the crossing

**Frames 7306–7383, a single unbroken run of 78 frames = 1.30 s at the fixed 1/60 s clock.**
Progress **0.993 → 0.99986**.

**The winner crosses on frame 7384**, the frame after the run ends — so the off-canvas run finishes
at the crossing and does not start until the last 1.3 seconds. The window's own states are
`BATTLE_ZOOM` 132, `LEADER_ZOOM` 57, `PHOTO_FINISH` 328.

### c) WHERE — the LEFT edge, all 78 frames, growing to a quarter of the canvas

Canvas 1280 × 720.

| | |
| --- | --- |
| edge | **LEFT on 78 of 78 frames.** Never top, bottom or right. |
| first off frame (7306) | X = **−9 px** — 0.007 canvas widths |
| median | **0.183 canvas widths** |
| worst frame (7383, the last) | X = **−305 px** = **0.238 canvas widths outside** |

He is BEHIND, not lateral: his `t` is below the leader's on every frame, and he exits by the edge
the shot is travelling away from. The drift is monotone — he is barely out when it starts and a
quarter of a canvas out at the crossing.

**And the arithmetic closes.** Across the run the shot tightens from **1.484 corridors to 1.012
corridors**, reaching `photoFinishZoom` exactly (camZoom 17.056 against `_photoFinishZoom` 17.058) at
the crossing. At ~1.01 corridors the frame shows about 180 world px across; the pair is 140 world px
apart along the track; the leader sits at `leadFrac` 0.54. A partner 140 px behind therefore lands
about 0.24 canvas widths off the left edge — **which is the 0.238 measured.** The shot is not
misaimed; it is too tight to contain a pair this far apart, and the pair is what it was told to
frame.

### d) THE CAMERA — pointed at him the whole time

| | |
| --- | --- |
| camera state | **`PHOTO_FINISH` on 78 of 78 frames** |
| camera subjects | **`16/36` on 78 of 78 frames** |
| the director's own pair | **`16/36` on 78 of 78 frames** |

★ **The camera was anchored on the pair that includes him for every frame he was off it.** This is
not a case of the shot following someone else. The subject is right and the width is what loses him.

### e) WAS HE RELEASED? — YES, and so was everyone except the leader

`_updateContentionWatch` maintains `_contentionOut`, and the probe already records it.

| | |
| --- | --- |
| released | **39 of 40 racers, all on frame 6897** (progress 0.9527), in one step |
| **racer 36 released on** | **frame 6897** — 409 frames before he leaves the canvas |
| never released | **index 16 only** — the leader |
| watch checks | 35, watch on |

So by the contention watch's own verdict there was **exactly one racer still in it** from p = 0.9527
onward, and racer 36 was not him.

### f) WAS HE EVER STILL IN IT? — no, and the two rules disagree by construction

`_abreastContenders` grades geometrically; the contention watch grades by projection. **They
disagree here, and the disagreement is the failure.**

Measured on the array the rule is actually handed (`st.racers`, the same values the probe sees — the
two agree to the digit, so no jittered-`t` divergence is involved):

| | |
| --- | --- |
| gap to leader | **140.5 px, essentially constant** (140.5 → 139.8 across the run) |
| one body length (`contactLengthBetween`) | **38.32 px** |
| **so the gap is** | **3.66 body lengths** |
| `withinOneLength(leader, 36)` | **false on 78 of 78 frames** |
| `_abreastContenders(ordered).length` | **2 on 78 of 78 frames** |
| `hasGeometry` | **TRUE** — tw 178, pathLen 6541.5, bodyLen 38.32, bodyWid 16.91 |

★ **The geometry guard is NOT what admits him.** `hasGeometry` is true, so the early
`return ordered.slice(0, 2)` at the head of the function never fires. He is admitted by the **tail**:

```js
// Fewer than two survivors means nobody is contesting the line with the leader — and a field
// with no geometry at all (a harness racer carries no physicalY) lands here too. Fall back to
// the pair, which is master's behaviour, rather than framing one racer or the whole grid.
return out.length >= 2 ? out : ordered.slice(0, 2);
```

The geometric loop admits the leader and rejects everyone else, leaving `out.length === 1`, so the
function returns the top two. The comment says exactly what it is doing and why.

**Corroborating shape:** across all 517 window frames the contender set is size **2, never 1 and
never 3**, and takes only two values — `[16,38]` for frames 6867–6996, then `[16,36]` from frame 6997
(p = 0.96115) to the end. A geometric set would vary with the race. A fallback pair cannot.

**His finishing place is UNANSWERABLE from this instrument, and the reason is structural:** the probe
stops at the first crossing — invariant 3's window closes there by definition — so nothing in the run
records the order after the winner finishes. What is recorded is that **he was running second at the
crossing**, having taken second from racer 38 at p = 0.96115.

---

## STEP 3 — CAN THE OWNER WATCH THIS EXACT RACE?

### The settings, as a list he can type

| field | value |
| --- | --- |
| Track | **Dirt Oval** |
| Racer type | **Horse** — the track default (`defaultRacerTypeId`) |
| Racers | **40** |
| Name set | **`current`** — the default set, first 40 names in order |
| Laps | **2** — the track default |
| Winners | **3** |
| Race plan | **ON** |
| **Quick-Test seed** | **3** |

### ★ THE NAMED TOOL CANNOT PROVE THIS, AND NOTHING WAS BUILT TO REPLACE IT

`scripts/diag/outcome-parity.mjs` is **hard-wired to river-run, N = 20, `duck`, shape
`open-in-range`** — its only arguments are a repo root and a seed. It also compares two *headless*
arms (the `raceDriver` harness against `goldenRunner`'s browser-faithful arm); it does not read
`activeRace` and knows nothing about Quick Test. **It cannot be pointed at dirt-oval / 40 / seed 3,
and it is not the comparison this step needs.** Per the decision rules, no substitute was built.

**What was done instead is a field-by-field source comparison of the two `activeRace` objects** — the
gate's, at `scripts/viewer-invariants.mjs:304`, against Quick Test's, at
`client/src/screens/SetupScreen/SetupScreen.jsx:622` — resolved against what
`RaceScreen/index.jsx` actually reads. That is weaker than a run-and-compare and is reported as such.

### What matches, and what diverges

**Matches, including one that looks like a divergence and is not:** the gate sets `targetDuration: 60`
where Quick Test on a closed track sets `targetDurationSec: undefined`. `RaceScreen/index.jsx:563`
reads `raceData.targetDurationSec ?? raceData.targetDuration ?? 60`, so **both arrive at 60**, by
different routes. `realizedDurationSec` and `paceScale` are never read off `raceData`. `winners` is
read **nowhere** in `RaceScreen` (0 hits). `eventName` and `timestamp` do not reach the race.

**TWO fields the gate does not set that Quick Test does:**

1. **`trackSurfaceClasses` — VISUAL ONLY, and the race is unaffected.** The gate omits it (so
   `?? []`); Quick Test sends dirt-oval's `["sand","earth","mud","grass"]`. Its **only** consumer is
   `resolveTrailEmitter` → `r.surfaceEmitter` (`index.jsx:740`), and that is read in exactly two
   places, both drawing: `particleRendering.js:68-69` and the spawn/update at `index.jsx:1322-1327`.
   **Established by an uncapped search over every tracked file for four spellings**
   (`surfaceEmitter`, `surfaceParticles`, `resolveTrailEmitter`, `trailEmitter`): 10 files, of which
   5 are documents/reports, one is `trailResolver.js` and its test, and the remaining three are the
   two rendering sites above. **Nothing touches `r.t`, speed or physics.** So his screen will show
   dust trails the gate never drew, on the same race.
2. ★ **`raceActionStage` — THIS ONE IS PHYSICS, and it depends on a setting I cannot read.** The gate
   omits it, so `normalizeRaceActionStage(undefined)` returns `FALLBACK_RACE_ACTION_STAGE`, which is
   `DEFAULT_RACE_DEFAULTS.raceActionStage` = **`'quiet'`**. Quick Test sends his **stored**
   `raceDefaults.raceActionStage`. The stage sets `pulkChallengerBoost` and `pulkLeaderBrake`, so a
   different stage is a different race. **They match if and only if his action dial is still on
   `quiet`** — and his stored settings cannot be read from here, so this is stated as a condition
   rather than confirmed.

### The camera will match; the exact frames will not

The gate injects **no camera seed** — searched, zero hits — and `RaceScreen/index.jsx:610` derives it
as `cameraSeedForRace(racePlanSeed)`. **So seed 3 gives his browser the same camera seed the gate
used.** But the gate runs a fixed 1/60 s **virtual** clock and his browser runs real time, and this
project has established that the camera diverges on any frame-timing change. **He will see the same
race and the same shot; he should not expect the same 78 frames.**

---

## WHAT THIS PIECE DOES NOT COVER

- **One seed, one track, one arm.** Nothing here says how often this shape occurs. `i7` is a gated
  item across the whole sweep; this is the anatomy of one failure.
- **His finishing place** — unanswerable, above, with the reason.
- **Whether the fallback is right.** It is a deliberate choice with its reason in the code, and
  weighing it is a design question this piece is forbidden to open.
- **A4 was not re-run and is not proposed** — ENDGAME-COMPLETE-1 measured it strictly worse.
- `scripts/contender-truth.mjs` asks a related question on the **headless** path and already records
  that `_photoFinishContenders` is `ordered.slice(0, 2)`, "exactly two, always". It does not grade
  the browser's item-7 set per frame, which is why the probe had to be instrumented.

---

## SOURCE HYGIENE

**Three files were instrumented temporarily and all three are reverted to the byte.** Verified by
`git status` reporting a clean tree and by line counts.

| file | before | instrumented | after | reached by a fingerprint? |
| --- | ---: | ---: | ---: | --- |
| `client/src/modules/viewerProbe.js` | 672 | 691 → 692 | **672** | no — none of the three |
| `scripts/viewer-invariants.mjs` | 1010 | 1012 | **1010** | no |
| `client/src/screens/RaceScreen/index.jsx` | 1917 | 1939 | **1917** | no |
| `client/src/modules/camera/CameraDirector.js` | 5349 | — | **5349** | **camera + render — NOT TOUCHED** |

**What was added and removed:** the off racer's index, screen position, `t`, the leader's `t`,
`pathLengthPx` and `drawnBodyLengthPx` in the probe's item-7 loop; the raw window rows in the
script's JSON; and at the call site the three fields `_abreastContenders` tests, the `withinOneLength`
predicate and the returned set size. **Nothing was left behind.** No scratch file was written into
the repository — all four run logs and JSON dumps went to `C:/tmp/dirtoval/`, outside the tree.

**Noticed and deliberately left:** `--json` writes the graded sheet but not `p.sheet.win`, the raw
window rows the grades are computed from, although they already cross to the node side inside
`viewer-invariants.mjs`. Diagnosing item 7 therefore requires instrumenting the browser probe.
**Recorded as an observation only** — this piece builds nothing.
