# CAMERA-HYGIENE-2 — the unattended night

Branch `camera-refactor`, eight commits `58396c9f`..`a4d82b55`. Return tag `pre/camera-hygiene-2`
(`be649aa9`), registered in [TAGS.md](../../docs/TAGS.md) in the same step.

**Camera fingerprint `4b33c4d31bec93ea` — bit-identical at the end of every one of the eight
commits.** World fingerprint `dc4647be0f55ebdb`, checked at the two commits whose diff left
`camera/` (the mint tripwire), unmoved. Suite 3460 → 3477, green. `eslint` and `prettier` clean.

---

## 1. BUILD-VS-SPEC CONFORMITY

| § | asked | status |
|---|---|---|
| — | fingerprint bit-identical at every commit | **DONE** — verified 8/8 |
| — | mint tripwire when the diff leaves `camera/` | **DONE** — fired twice (§6, §8), world hash unmoved |
| 1 | the extraction; `CameraDirector.js` size | **DONE** — 2935 → 2487 (−15.3%); four extractions, four seams rejected and argued (§4) |
| 2 | dead code, dead variables, unreachable branches, redundant data, duplicated constants | **DONE** (§3) |
| 3 | tests: delete what cannot fail; write what is missing | **DONE** (§5) — 1 test deleted, 3 assertions dropped, 18 de-flaked, 17 added, 3 verified failing by sabotage |
| 4 | docs: repo docs, LESSONS, a header on every camera file | **DONE** (§7) |
| 5 | HUD columns two and three: is the label TRUE, is it NEEDED | **DONE** (§6) |
| + | the addendum: name the seams you REJECTED, and the line-count answer | **DONE** (§4) |

**Deviations declared — three, all deliberate:**

1. **The camera folder got BIGGER, not smaller.** Source in `camera/*.js` is 5209 → 5425 lines
   (+4.1%). `CameraDirector.js` fell by 448; roughly 200 lines of that came back as the
   "what this is FOR / NOT for" headers the brief asked for on every file, and the rest is the
   irreducible cost of a module boundary. The number the owner asked about is `CameraDirector.js`
   and it is in §2. I did not trade documentation for a smaller total.
2. **I did not fix the three code fallbacks that disagree with the shipped defaults** (§8, finding 2).
   Changing them moves behaviour for bare-config callers. That is not hygiene; it is listed.
3. **`targetInnerFramePct` still has no Dev Screen control** (§8, finding 3), against the project's
   everything-is-UI-configurable principle. Adding one is a feature, not a clean-up.

**The night was long enough.** Every stage in the brief was reached. I did not have to park anything.

---

## 2. LINE COUNTS

### The file the brief was about

| | before | after | |
|---|---:|---:|---|
| `camera/CameraDirector.js` | 2935 | **2487** | **−448, −15.3%** |

### Everything that moved

| file | before | after | Δ |
|---|---:|---:|---:|
| `camera/CameraDirector.js` | 2935 | 2487 | **−448** |
| `camera/battleGroup.js` | — | 168 | +168 (new) |
| `camera/detourRecorder.js` | — | 198 | +198 (new) |
| `camera/comebackDetector.js` | — | 159 | +159 (new) |
| `camera/framingConfig.js` | — | 112 | +112 (new) |
| `camera/cameraTimingComputation.js` | 356 | 351 | −5 |
| `camera/CameraDirectorDiag.js` | 433 | 441 | +8 |
| `camera/zoomUnit.js` | 165 | 168 | +3 |
| `camera/resolveCamera.js` | 117 | 121 | +4 |
| `camera/panTarget.js` | 74 | 78 | +4 |
| `camera/Minimap.js` | 130 | 133 | +3 |
| `camera/openTrackCamera.js` | 25 | 30 | +5 |
| `camera/lapUtils.js` | 26 | 31 | +5 |
| `camera/framingRule.js` | 426 | 426 | — |
| `camera/projection.js` | 165 | 165 | — |
| `camera/frameGeometry.js` | 91 | 91 | — |
| `camera/cameraMarker.js` | 266 | 266 | — |
| **camera source total** | **5209** | **5425** | **+216** |
| | | | |
| `storage/defaults.js` | 776 | 768 | −8 |
| `DevScreen/CameraAdvancedSection.jsx` | 1477 | 1464 | −13 |
| `docs/CAMERA_DIRECTOR.md` | 387 | 277 | −110 |
| | | | |
| `camera/CameraDirector.test.js` | 6185 | 6298 | +113 |
| `camera/framingConfig.test.js` | — | 147 | +147 (new) |
| `camera/cameraTimingComputation.test.js` | 229 | 232 | +3 |
| `docs/LESSONS.md` | — | — | +106 |

Whole diff: **25 files, +1642 / −1163**.

---

## 3. WHAT WAS REMOVED — all of it provably unread before removal

**Sixteen `_UPPER_CASE` timing fallbacks in `CameraDirector.js`.** Every one was a second copy of a
constant in `cameraTimingComputation.js`, and every one had exactly one occurrence in the whole
repo: its own declaration. The director gets its fallbacks by calling `computeTimingFromConfig(null)`.
This is the shape a silent divergence takes — two numbers that must agree and nothing making them.

**`clampActiveCount` / `clampActiveAxes` and the three fields behind them.** The containment clamp
that incremented them was deleted in CAMERA-FRAMING-1. The getters had been returning a literal `0`
for two blocks, a comment claimed the counter still watched the glide, and a test asserted it stayed
0 — a test that could not fail under any change to any file.

**The detour log's candidate C** (`containMod`, `containDX`, `containDY`). Same orphaned writer.
Every window logged since CAMERA-FRAMING-1 recorded, three columns wide, that the thing which no
longer exists did not happen.

**Twenty per-state timing scalars.** `tcLeader`, `lfBattle`, `lfEntryOverview` and seventeen more
were returned by `computeTimingFromConfig` AND stored on the director beside the maps holding the
same values. Forty data points that had to agree with twenty; the maps are what the director reads
and every scalar was read only by its own assertions.

**Seven write-only fields:** `_finishModeStartTs`, `_lastLeadChangeTs`, `_lateralShiftPx`,
`_leadOutStartTs`, and the director's copies of `comebackMinDuration` / `leadChangeMinDuration`.
Those last two matter beyond their line count: they are consumed inside `computeTimingFromConfig`,
where they fold into `minStateHoldByState`, and the second copy on the director is exactly why
CAMERA-HYGIENE-1's perturbation audit read **two live controls as inert**.

**A duplicate `observerPhase` getter.** The class defined one and the diagnostics mixin defined an
identical one; `Object.defineProperties` overwrote the class's at load, so only one was ever
reachable.

**`_getBattleFocusRacer`** — dead production code whose only caller in the repo was the test that
tested it.

**Two legacy config keys**, `spritePctOfCanvas` and `cameraTransitionSeconds` (§6).

**A UI heading for a deleted mechanism** — "Adaptive Zoom Floor", describing in the present tense a
behaviour CAMERA-FRAMING-1 removed, above an empty container with no controls in it at all.

**Two stale doc claims that would have caused harm**, not just confusion (§7).

---

## 4. THE EXTRACTIONS, AND THE SEAMS I REJECTED

### 4.1 Taken — one sentence each on what it is FOR

| module | lines | what it is FOR |
|---|---:|---|
| `detourRecorder.js` | 198 | The per-transition diagnostic frame log, as an OBSERVER that owns its own buffers — so "it never writes a camera value" becomes structural instead of a promise in a comment. |
| `battleGroup.js` | 168 | Answering "who is fighting whom" from positions and thresholds alone, so the hardest algorithm in the camera path stops being reachable only through a constructed director. |
| `comebackDetector.js` | 159 | Answering "who is coming through the field", which needs somebody to hold the past — the rank history and the arithmetic that reads it now live together. |
| `framingConfig.js` | 112 | Resolving a raw config into framing numbers, so every default and every validation band has one home and can be tested without building a camera on a track. |

The recorder is the seam CAMERA-HYGIENE-1 named and parked. It shed ten fields and eight
`if (this._detourEnabled)` guards from the director in favour of one nullable reference, so "is the
log on?" and "does the recorder exist?" became the same question.

### 4.2 Rejected — the four the addendum named, and why

**STATE SELECTION — rejected, and this is the one I most nearly took.** It is a coherent
responsibility with a clear boundary and it is big: `_pickNextState` alone is 203 lines, and with the
eligibility helpers and the finish lifecycle it is roughly 300. What entangles it is not the
selecting; it is the **finish lifecycle latches**. `_pickNextState` mutates `_inPhotoFinish`,
`_inFinishMode`, `_inFinishDrama`, `_finishMomentExpiry` and `_photoFinishEnterPending`, and all five
are read by code that is not selection at all: `update()`'s bypass flags, `_setTargets`'s finish
lookback anchor, `_transition`'s finish-glide exemption, and `hudState`. Extracting selection alone
would put five mutable latches across a module boundary, which is the aliasing trap this same night
spent its first commit cleaning up.

The honest prerequisite is to make the finish sequence its own object first — it genuinely is one:
"the end of the race is a scripted sequence" — and only then lift selection out around it. I did not
do that, on guard 3: it is correct, it is clearly and unusually well commented (the comments record
*why* the photo-finish gate was hoisted and *why* there is no wall-clock cap, both hard-won), and it
is tested. Restructuring it would be taste, at real risk, on an unattended night. **Named as the
next block's obvious first move.**

What I did take from selection is everything it was ASKING rather than deciding: the battle
detector, the comeback detector. That is roughly 300 lines and it left the priority chain reading as
a priority chain.

**THE TRANSITION MACHINERY — rejected on the merits, and I would reject it again.** Entry/tracking
phases, the lerp, the glide. It does not own separable state; it owns THE state — `zoom`, `offsetX`,
`offsetY`, `_camT`, `targetZoom`, `targetOffset*`. Extracting it means either passing the director
in (line-moving with extra syntax, guard 2) or moving the camera's own position out of the camera,
which would gut the class. Worse, its correctness lives in an ORDERING: the zoom lerp must run before
`_setTargets`, and `_setTargets` must be the only writer of `targetOffsetX/Y`. Both look arbitrary
and are not, and both are only obvious when you can see them in one screen. A file boundary would
hide the one thing a reader must see together.

**CONFIG RESOLUTION — taken in part, rejected in part.** The framing half became `framingConfig.js`
and it was worth it: the validation bands are now testable in isolation, and two of them turned out
to have no test at all (§5). The other half, `_computeTimingConfig`, I left as a flat destructure of
`computeTimingFromConfig`. It is 85 lines of `this._x = t.x` and it is dull, but the alternative —
storing the timing object and reading `this._t.battleWeight` everywhere — touches about 120 read
sites and every test that inspects a director's timing, to make a dull thing shorter. That is churn
by the brief's own definition. What I did instead was delete the twenty entries that were redundant
(§3) and group the nine that belong together into `_battleGates` and `_comebackGates`, because those
are applied together and a gate drifting from its siblings would be silently unenforced.

**THE MARKER AND LIVE-TRUTH EMISSION — nothing left to move, and I can show it.** `cameraMarker.js`
already owns what a marker IS, and `RaceScreen` already owns the assembly; I traced the call site.
What remains in the director is eleven one-line getters (`hudState`, `lerpPhase`, `observerPhase`,
`camT`, `anchorRacerLabel`, `transitionGrammar`, `visibleCorridors`, …), each a read of a field the
director owns. Moving them would require passing the director to the thing they were moved to. The
one genuinely marker-shaped thing in the director, `setRandomSeed`/`randomSeed`, is the director's
own RNG and belongs to it. **Verdict: this seam is already clean.** The only thing I changed nearby
was making `detectBattleGroup` public, because the render path was reaching into `_detectPulkGroup`.

### 4.3 The number, and whether it meets the brief

**`CameraDirector.js` is 2487 lines, from 2935.** Is that enough? Here is the honest arithmetic of
what is left, so the answer can be judged rather than asserted:

| what remains | lines |
|---|---:|
| `update()` — the frame | 385 |
| `_transition()` — committing a state change | 277 |
| `_pickNextState()` — the priority chain | 203 |
| the constructor — 60-odd fields of camera state | 192 |
| `_computePhasedPanTarget()` — lead-in / follow / lead-out | 135 |
| `_setTargets()` — the framing rule applied | 99 |
| `_computeTimingConfig()` — the flat destructure | 85 |
| `_framingSubjects()` — WHO, per state | 73 |
| everything else (about 25 small methods, the header, imports) | ~1038 |

Every one of those is either the state machine or the camera's own motion, which is what a
`CameraDirector` IS. **My honest answer: one more seam is available — the finish lifecycle, and
selection behind it — and it is worth perhaps 250 more lines, but it is behaviour-adjacent enough
that it wants a supervised block rather than an unattended one.** Below that, further splitting would
fragment without clarifying, and the file would get harder to read, not easier. I would call 2487 a
defensible landing and the finish-lifecycle extraction the named next step, rather than claim the
file is finished.

---

## 5. TESTS

### 5.1 Deleted, and what it used to guarantee

**`clamp diagnostics: clampActiveCount / clampActiveAxes start at 0`** — guaranteed that the
containment clamp's activation counters read zero on a fresh director. Nothing had incremented those
counters since the clamp was deleted, so the getters returned a literal `0` and the test could not
fail under any change to any file. This is Lesson 187 applied to the suite.

**Three assertions dropped from tests that keep their real ones** — `clampActiveAxes.x < 10` and
`clampActiveAxes.y < 15` inside two forward-framing tests, and the `_getBattleFocusRacer` half of
the spread-copy test. All three asserted against the same dead counter or the same dead method; the
surrounding assertions (leader forward of centre, `_findByIndex` survives a spread copy) are real and
stayed.

### 5.2 Replaced

**`the containment clamp is INERT — clampActiveCount stays 0 through a glide`** → **`the glide LANDS
on the framing it aimed at — nothing corrects it on the way`**. The old test asserted a counter
nothing incremented. The new one asserts the property the clamp's removal was FOR: after the glide
completes, `offsetX/offsetY/zoom` equal their targets to 6 decimal places. The clamp was measured
active on 23 of 23 glide frames steering the pan by up to −390 px; if any steering returns to that
branch, this goes red.

### 5.3 De-flaked — eighteen of them, and this is the most consequential thing in §5

Since CAMERA-WEIGHTS-1 (the commit immediately before this block) a weight is a **propensity**.
Eighteen tests assert "the gate opened, therefore the state was entered", which stopped being a
statement about the gate and became a coin flip.

**Measured, not guessed.** I put a temporary probe in `_random()` and ran the camera suite with the
generator forced to a constant. At 0.999 — decline every weight below 1 — eighteen gate tests fail
and name themselves; at 0.0 they all pass, and what remains red is the five tests genuinely about
randomness. COMEBACK at weight 0.6 fails 0.4⁴ = 2.6% of runs on its own even with vitest's three
retries; the union across all eighteen is roughly **one full-suite run in ten**. It failed twice
during this night's runs. The probe was removed before the commit.

They now take a frozen `ALWAYS_TAKE` config — every weight 1 — which is exactly what a gate test
means to assert. One stale comment went with it: the LEAD_CHANGE endgame test claimed its path was
"deterministic … bypasses the random candidate pool", which CAMERA-WEIGHTS-1 had made untrue on
purpose.

### 5.4 Added — 17 tests, and what each now guarantees

**`ON and OFF draw the SAME picture — the instrument does not move what it measures.`** Compares the
committed `[state, zoom, offsetX, offsetY, camT]` of every frame of a 40-frame drive through a
transition, detour log on versus off. This is the claim `camera-fingerprint.mjs` relies on to ignore
the flag at all, and nothing asserted it before. Every frame, not just the last — a recorder that
perturbed one frame and settled back would pass an endpoint check.

**`framingConfig.test.js`, 14 tests.** Two of the bands had no coverage whatsoever:
`referenceCorridorPx`, which is the unit every other camera setting is measured in — a zero reaching
the director unrejected makes `referenceWidthFor` return 0 and every zoom on every track
meaningless — and `cameraTransitionGrammar`, which had tests for both real values and none for an
unknown one, so nothing pinned the deliberate choice that a typo degrades to `'legacy'`. The file
also states the property as one idea: the bands **REJECT, they do not CLAMP** — 299 ms becomes 500,
not 300. That is the behaviour that fooled CAMERA-HYGIENE-1's control audit into reporting a live
control as dead.

**The `detectBattleGroup` contract, 3 tests.** `RaceScreen` asks the camera who is in a battle
through `camDirRef.current?.detectBattleGroup?.(…) ?? null`. That second `?.` means a rename does not
throw: the expression is `null` forever, the battle-focus darkening quietly stops, every director
test still passes because the director is fine, and the camera fingerprint cannot see it because
darkening is render, not direction. Both ends are now pinned.

### 5.5 Verified failing — because a test that has never been seen to fail is a guess

| test | sabotage | result |
|---|---|---|
| the detour recorder does not move the picture | add `dir.offsetX += 0.001` inside the recorder | RED |
| RaceScreen asks by the public name | rename the call site | RED |
| the director answers to that name | rename the method | RED |

The first draft of the call-site guard used `toContain('detectBattleGroup')` and **passed** while the
call site said `detectBattleGroupRenamed?.(`. It is a `toMatch` on the call shape now, and the test
carries a note saying why. I would not have found that without running the sabotage.

### 5.6 The mechanical can't-fail sweep

I scanned every camera test for three shapes: no `expect()` at all, only existence/type assertions,
and assertions whose two sides are the same expression. **It came back empty** beyond the two items
already removed. The `toBeNull` hits it flagged are all genuine negative assertions ("returns null
when no group qualifies"), which can fail.

### 5.7 PROTECTED BY TESTS vs PROTECTED BY CONVENTION

This is the list the brief called the honest measure of whether the state is clean enough to build on.

**Protected — a change breaks a test:** the zoom unit's invariance (same setting, same world, any
corridor width); the six-state framing table; corridor / pair / company guarantees on every heading;
the company guarantee's promise inside its region; the lateral guarantee's arithmetic and its
one-dimensionality; the min-draw floor and its zoom-independence; name-tag layout, occlusion and the
start-formation exception; the config loader's defaults-under / stored-over / unknown-ignored rule;
the engine-input module list; **every framing validation band and its reject-not-clamp behaviour**
(new); **the detour recorder's non-interference** (new); **the render path's `detectBattleGroup`
contract** (new); **the glide landing on its own target** (new); and every camera decision at once,
via the fingerprint.

**Convention only — nothing fails if it breaks:**

- **The tracking lag.** Measured repeatedly (5.8–7.9 pp in LEADER, 25.2 pp in OVERVIEW), never
  asserted. Change a `trackingTC` default and no test notices. *Unchanged from HYGIENE-1, and I
  deliberately did not pin it — see §9.*
- **The state machine's transition reasons.** Which state fires when is covered only where a
  specific block wrote a case.
- **Slow motion.** Physics-time scaling in the render loop has no camera-side test.
- **The HUD overlay and every diagnostic flag.** Read-only by design, unasserted by consequence.
- **The world-bounds clamp.** Named as the cause of two measured residuals; nothing pins its
  behaviour.
- **Anything render-path.** Sprite drawing, trails, name-tag *drawing* as opposed to layout. The
  fingerprint excludes it deliberately and nothing else covers it. This is the largest hole and it
  is structural, not an oversight.

**Three items moved from convention to protected this block.** The list is shorter than it was, and
the two that moved were the two the night's own work depended on.

---

## 6. THE HUD — columns two and three, finished

**Column 3, IS IT NEEDED.** Removed `spritePctOfCanvas` and `cameraTransitionSeconds` from
`defaults.js`. They sat under a comment reading *"Legacy fields kept for v3→v4 migration reads.
CameraDirector no longer reads these"*; the migrations were deleted two blocks ago. Neither ever had
a Dev Screen control, so the removal is presentation-free. **Measured rather than assumed: removing
them moves neither fingerprint** — HYGIENE-1's caution that the world hash covers `cameraConfig`
turned out to be over-cautious.

After that, **all 75 shipped `cameraConfig` keys have a live source reader.** Nothing is dead data.

Three keys have a reader but no Dev Screen control:

| key | verdict |
|---|---|
| `maxStateDuration`, `minStateHoldMs` | **LEAVE.** Legacy flat fields, shadowed by the per-state profile values whenever `cameraStateProfiles` exists — which it does in the shipped config. Removing them changes which fallback a no-profiles config gets for `maxStateDuration` (4000 → 8000), which is a behaviour change, not hygiene. |
| `targetInnerFramePct` | **LEAVE, and flag it.** Provably live, no control. Against the everything-is-UI-configurable principle. Adding one is a feature. |

**Column 2, IS THE LABEL TRUE.** I compared every tooltip's stated default against
`DEFAULT_CAMERA_CONFIG` programmatically. Thirty-seven controls; **three were lying**, and all three
in the same way — they quoted the CODE FALLBACK in `cameraTimingComputation.js` rather than the
shipped default:

| control | tooltip said | actually ships |
|---|---|---|
| `outcomePhaseThreshold` | 75% | **65%** |
| `comebackMinStartGap` | 40% | **25%** |
| `comebackMaxCurrentRankPct` | 10% | **20%** |

The tooltips now state the shipped values. I did **not** change the fallbacks — that would move
behaviour for bare-config callers — and the fact that the two sets differ at all is a finding (§8).

Also removed: the **"Adaptive Zoom Floor"** heading, which described in the present tense a mechanism
CAMERA-FRAMING-1 deleted ("the camera pulls back each frame until enough appear") above an empty
container with no controls at all. And `SpriteSizeRangeSection`'s header, which still pointed at
`spritePctOfCanvas.overview` for a floor that is now `minDrawnFrameFrac`.

The remaining ~34 tooltips and the profile fields I read and found true. I have not re-derived the
measured claims inside them (e.g. "measured to halve the frames where the leader is alone") — those
are HYGIENE-1-era evidence and I took them at their word.

---

## 7. DOCUMENTATION

### 7.1 Repo docs

**`docs/CAMERA_DIRECTOR.md` — rewritten.** It was dated 2026-05-28 and described a camera that has
not existed for two months: five states (there are six), `FALLBACK_REFERENCE_SPRITE_SIZE`,
`spriteScale`, `battlePulkThresholdPx` and euclidean-px battle conditions, `overviewClosedTrackZoom`,
`overviewOffsetPx`, `MAX_INVERSE_ZOOM 5.0` (it is `MAX_CAM_ZOOM 24.0`),
`_setClosedTrackTargets`/`_setOpenTrackTargets` (deleted in CAMERA-PROJECTION-1). Its "Known Issues"
listed three things that are all fixed, and I checked each against the source rather than assuming:
`openTrackPanTarget` as dead code awaiting cleanup (it is gone), the OVERVIEW scheduler as having no
vitest coverage (23 references), `exportDiagLog` as having no UI entry point (`CameraFrameLogHUD`
calls it twice).

**It carries no config table now, deliberately.** The table it had is exactly why it rotted — a list
of keys and defaults duplicated in Markdown is the same "two things that must agree and nothing
making them" shape this block spent the night deleting from the source. Config has ONE home: the key
in `defaults.js` and its tooltip, which sit beside the value and move with it. What is left is what
code cannot say — which file owns what, the ordering constraints that look arbitrary and are not,
and the mechanisms that were removed and must not come back.

**`docs/camera-target-architecture.md` — headed as SUPERSEDED.** This was the dangerous one. It had
no date and read as a live architecture reference, and two of its findings have since been
**inverted**: the `targetOffsetX/Y` double-write it diagnoses no longer exists, and the "centerline
approximation … it ignores the racer's lane offset" it flags as a defect is now the deliberate
one-axis lateral pin. A reader following it would have "fixed" precisely the thing `_centrelineAt`
carries a warning block telling them not to touch.

**`docs/CAMERA_TUNING_DIAGNOSIS.md`** — one line noting its zoom unit is history.

Doc links: 316 relative links across 52 living docs, 0 dangling.

### 7.2 LESSONS — five entries, 194–198

- **194, the UNIT law.** *A number compared against the frame must be expressed as a fraction of the
  frame.* The one I was asked to lead with: four separate defects on this branch were the same
  mistake — the sprite floor at `32 px`, the label size at `max(8, …)`, the zoom unit in this
  track's own width, the reference canvas in four independent copies.
- **195, the CHORD law.** A formula that agrees with reality on the axes and diverges between them
  passes every axis-aligned test. `|cos|·W + |sin|·H` over-stated the frame by up to 41%; at 74° it
  read 1091.4 px where the frame reaches 759.9.
- **196, the DEAD-INSTRUMENT law.** A reading nobody has seen move is indistinguishable from no
  reading. Three shapes of it were found in this pass alone.
- **197, the PROPENSITY law.** Making a dial real turns every downstream assertion into a coin flip.
  With the two-run generator sweep as the enforcement method.
- **198, the SILENT-SEAM law.** An optional call across a module boundary fails quietly forever, and
  a substring match is not a guard against a rename.

### 7.3 Source headers

Every camera file now says what it is FOR and what it is NOT for. `CameraDirector.js`'s was stale —
it listed four states and omitted two — and now names the eight questions the director delegates and
to which file. Also fixed: **`zoomUnit.js` had its `import` statement sitting INSIDE the header
comment block**, where a CAMERA-HYGIENE-1 edit left it. Legal JavaScript, unreadable header.

I left `projection.js`, `framingRule.js`, `frameGeometry.js` and `cameraMarker.js` alone. Their
headers are already excellent and rewriting them would be guard 3.

---

## 8. NOT HYGIENE — findings, listed and NOT fixed

1. **The suite was ~10% flaky and the previous commit did it.** CAMERA-WEIGHTS-1 was correct and
   measured, but it made eighteen existing assertions probabilistic and nothing caught it. I fixed
   the tests (§5.3) because that IS test hygiene, but the process finding is separate and is now
   Lesson 197: a change that introduces randomness into a decision path needs a suite-wide sweep in
   the same commit.
2. **Three code fallbacks disagree with the shipped defaults** — `outcomePhaseThreshold` 0.75 vs
   0.65, `comebackMinStartGap` 0.4 vs 0.25, `comebackMaxCurrentRankPct` 0.1 vs 0.2. Only a
   bare-config caller sees the fallbacks, so this is latent rather than active, but it is the same
   two-numbers-one-truth shape and it already produced three wrong tooltips. **Owner's call:** align
   the fallbacks to the shipped values (behaviour change for bare-config callers, several tests
   depend on the current ones), or delete the fallbacks and require a config.
3. **`targetInnerFramePct` is live but unreachable from the UI.** Against a stated project principle.
4. **The render path is the largest untested surface in the camera**, structurally: the fingerprint
   excludes it by construction and nothing replaces it. Sprite drawing, trails and name-tag drawing
   are protected by the owner's eye alone. A render-side fingerprint is the obvious answer and is a
   block of its own.
5. **`START_PHASE_DURATION = 3000` is still a constant, not a control**, and CAMERA-TAGS-1 measured
   it about five seconds short of when the field actually spreads. Carried forward from HYGIENE-1 §5.
6. **The tracking lag, the world-bounds clamp, and the corridor guarantee vs. anchor position** are
   all carried forward unexamined from HYGIENE-1 §9. None is hygiene; each is a measurement block.
7. **A suspicion, stated as one.** `_lfEntryByState` is mutated in place at finish-mode OVERVIEW
   entry (`this._lfEntryByState[CAM_STATE.OVERVIEW] = tcToLerpFactor(tc)`). The map comes from
   `computeTimingFromConfig` and is freshly built per call, so today this is safe — but it is a
   director writing into an object a pure function returned, and if that function ever memoises or
   returns a shared literal, the mutation becomes cross-instance. Cheap to make safe; I did not,
   because it would move a line the fingerprint covers for a hazard that is not yet real.
8. **`MAX_CAM_ZOOM = 24.0` has moved twice for content reasons** and is still a constant, not a
   control. Carried forward.

---

## 9. WHAT I DELIBERATELY DID NOT DO

The brief asked for this section to be as substantial as the rest, and it should be — under a mandate
for perfection the tempting wrong moves outnumber the right ones.

**I did not extract the finish lifecycle or state selection.** The single biggest remaining seam
(§4.2). It is correct, unusually well commented, and tested; its comments record *why* the
photo-finish gate was hoisted and *why* it has no wall-clock cap, both of which were paid for. Guard
3 says stop, and an unattended night is the worst time to overrule it.

**I did not flatten `_computeTimingConfig`.** 85 dull lines of `this._x = t.x`. Making it shorter
means touching ~120 read sites and every test that inspects a director's timing, to save 85 lines of
something nobody misreads. That is churn wearing tidiness as a costume.

**I did not write a `battleGroup.test.js`.** Tempting — a new module "should" get a test file. But
every gate it implements is already exercised through the director, in tests that are specific and
good (`battleMaxGroupRankSpan=2: only tight seed triple can form`, and a dozen more). A parallel
suite re-testing the same rules through the new front door would be duplicate fixtures, which the
brief explicitly names as something to remove.

**I did not pin the tracking lag with a characterisation test.** It is the biggest hole in the
protected list and a test would close it — but it would encode a number everyone agrees is a defect,
and the next person to improve the lag would have to delete the test to do it. A test that punishes
the fix is worse than the gap. It stays reported.

**I did not fix the three fallback/default divergences**, or add the missing
`targetInnerFramePct` control, or make `START_PHASE_DURATION` configurable. All three are real, all
three change behaviour or add features, none is hygiene. They are in §8 where the owner can price
them.

**I did not touch four good headers, or `framingRule.js` at all.** It is 426 lines and the largest
file I left completely alone. It is correct, clear and tested, which is the definition of where this
brief turns against itself.

**I did not add a test-only API to production code** to make the comeback tests easier. Five tests
seed the rank history directly; they now reach one level deeper into the detector's private field —
the same reach they already had, rather than a public `seedHistory()` that would exist only for them.

**I did not re-derive the measured claims inside the ~34 surviving tooltips.** They cite HYGIENE-1-era
measurements. Re-running them was not the brief and would have consumed the night.

---

## 10. THE OWNER'S EYE

**One check, and it should be boring: does anything look different?**

It must not. `4b33c4d31bec93ea` before and after says it cannot have — every camera decision on every
frame of ten seeded races is byte-identical across all eight commits. If you *do* see a difference,
that is a finding and this block failed its own test, and I would want to know immediately.

Two things the fingerprint does not cover, stated so you know which of the two you are being given:

- **The render path.** Nothing in these eight commits touches sprite drawing or name-tag drawing —
  but that is an argument, not a measurement.
- **The battle-focus darkening**, specifically. `RaceScreen`'s call moved from `_detectPulkGroup` to
  `detectBattleGroup`, and darkening is render, so the fingerprint is blind to it. It is now covered
  by a contract test at both ends, verified by sabotage — but if you want one thing to glance at,
  make it a battle: the non-battling racers should still dim.

**The Dev Screen is worth thirty seconds too.** Three tooltips now state different numbers (they were
wrong before), and the empty "Adaptive Zoom Floor" heading is gone from Camera Behavior.
