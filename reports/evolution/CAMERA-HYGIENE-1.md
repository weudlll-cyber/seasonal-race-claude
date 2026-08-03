# CAMERA-HYGIENE-1 — the deep clean, before the merge

Branch `camera-refactor`. Return tag `pre/camera-hygiene` (`48069246`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step. **PARTIAL — parked mid-block, see §8.**

**The acceptance test, and it is the good kind.** Hygiene must not move the picture, and unlike a
tuning change that is *provable*. `scripts/camera-fingerprint.mjs` (new) hashes every decision the
director makes — state, lerp phase, anchor, zoom, both offsets, `camT`, both targets — on every frame
of a seeded race across all ten tracks. Baseline **`deddc4b483a0689b`**, and **every commit in this
block holds it bit-identical**.

---

## 1. BUILD-VS-SPEC CONFORMITY

| § | asked | status |
|---|---|---|
| — | replay diff bit-identical | **DONE** — `deddc4b483a0689b` on both commits |
| A | dead code, unused vars, duplicated constants | **DONE** (§3) |
| A | `CameraDirector.js` file size / extractions | **PARKED** (§8) — could not be made safe within this block |
| B | test audit, protected-vs-convention list | **PARTIAL** (§6) — the list is here; the cleanup is not |
| C | docs, LESSONS proposals | **PROPOSED, not applied** (§7) |
| D | HUD audit: works / true / needed | **DONE for "works"** (§4); "true" and "needed" **PARKED** |
| D | hardcoded values that deserve a control | **DONE** (§5) |
| E | the accumulated list | **DONE** (§9) |
| F | mint tripwire stage 2 | **DONE** — commit `aff558a3` |

**Deviations declared:** three, all in §8, all parked rather than half-shipped.

---

## 2. WHAT SHIPPED

| commit | |
|---|---|
| `46ffce26` | one roster, one reference canvas, no dead method |
| `aff558a3` | the engine-input module list + the test that keeps it honest |

## 3. SOURCES — what a full scan actually found

I scanned every camera module for exports nobody imports, methods nobody calls, getters nobody reads,
and config keys no source file consults. **It came back almost empty**, which is itself the finding:
the per-block hygiene on this branch held, and this pass is confirming that rather than repairing it.

Three real items:

**`QUICK_TEST_NAMES`, duplicated byte-for-byte** in `SetupScreen.jsx` and
`scripts/parity/goldenRunner.mjs` (70 names each, verified element by element). Normally a shrug —
not here. **A racer's name is physics:** `stablePairBit` hashes `r.name` into the avoidance symmetry
tie-break, and renaming a roster once changed the finishing order in 24 of 24 races and the winner in
14 of 24. So the copies were a silent-divergence bug waiting for someone to append one name: the
browser and the **golden parity runner** would then produce different races from the same seed, and
the golden test — whose whole job is catching that — would have been the thing lying. One home now,
`client/src/modules/racerNames.js`, order marked load-bearing.

**Four independent reference-canvas constants** (`CameraDirector.js`, `zoomUnit.js`,
`battleDiagRendering.js`, `trackRendering.js`) that must agree with `projection.js` and nothing making
them. They now import `REFERENCE_CANVAS_W/H`.

**`_clampCentreToBounds`** — an OVERVIEW-FRAMING-1 helper with no caller anywhere.

| file | before | after |
|---|---:|---:|
| `camera/CameraDirector.js` | 2889 | 2890 |
| `camera/zoomUnit.js` | 163 | 165 |
| `SetupScreen/SetupScreen.jsx` | 1197 | **1127** |
| `scripts/parity/goldenRunner.mjs` | 671 | **602** |
| `modules/racerNames.js` | — | 97 (new) |
| `scripts/camera-fingerprint.mjs` | — | 203 (new) |
| `modules/raceConfigWorld.js` | 210 | 241 |
| `modules/engineInputs.test.js` | — | 74 (new) |

---

## 4. THE HUD AUDIT — does each control still DO anything?

**Method, and a flaw I had to fix mid-way.** Perturb one key, re-hash the director's entire decision
stream, compare. My first pass perturbed numbers by `v * 0.5 + 1` and reported **16** live controls.
That was wrong: several keys are **validated to a band and reject an out-of-range value, falling back
to the default** — so `glideDurationMs` 500 → 251 (band [300,900]) read as *dead* when it is alive.
Re-run with an in-range perturbation (−30%) and longer races: **24 top-level keys and 8 profile
fields are provably live.** The correction added 8 controls. Anyone repeating this must perturb
inside the band.

**Scope, stated so nobody over-reads it:** two tracks (one closed, one open), one seed, ≤4200 frames.
And the fingerprint covers the **director only** — the render path is out of scope by construction.

### Provably alive (32)

`battleCooldownMs`, `battleIsolationThresholdT`, `battleMaxGroupRankSpan`, `battleMaxGroupSize`,
`battleMinDurationMs`, `cameraTransitionGrammar`, `countdownDurationMs`, `countdownStartCorridors`,
`endgameThreshold`, `entryConvergenceZoom`, `finishOverviewLookbackPx`,
`finishOverviewZoomOutDurationMs`, `focalSmoothTc`, `glideDurationMs`, `leadChangeDebounceMs`,
`leadChangeMinGap`, `leaderForwardFrac`, `minRacersVisible`, `outcomePhaseThreshold`,
`overviewCooldownMs`, `photoFinishEnabled`, `photoFinishLeadProgress`, `referenceCorridorPx`,
`targetInnerFramePct` — plus profile fields `entryTC`, `leadInDuration`, `leadOutDuration`,
`leadOutEnabled`, `maxStateDuration`, `minStateHold`, `trackingTC`, `visibleCorridors`.

### Did not move the director — in three very different classes

**(a) Render-only or diagnostic — correctly invisible, NOT dead.** `maxTargetScreenPx`,
`minDrawnFrameFrac`, `nameTagFrameFrac`, `nameTagAllUntilMs`, `battleFocusDarkening`,
`stateOverlayEnabled/DurationMs`, `showCameraStateHud`, `showRpStartRow`, and every `show*Diag` /
`enable*Log` / `cameraDetourLog` flag. Also the slow-motion trio (`battleSlowmoFactor`,
`battleSlowmoFadeDuration`, `battleSlowmoMinDuration`) and `photoFinishSlowmoFactor` — they scale
physics *time* in the render loop, not the director.

**(b) Legacy, and I would remove them.** `spritePctOfCanvas` and `cameraTransitionSeconds` sit under a
comment in `defaults.js` that already says *"Legacy fields kept for v3→v4 migration reads.
CameraDirector no longer reads these."* The migrations were deleted two blocks ago. **Recommend
removal** — they are in `cameraConfig`, which the world hash covers but the fingerprint proves the
engine ignores.

**(c) Suspicious, and this is the finding that matters.** Twenty-odd gate and weight keys did not move
the director. **The four state-selection weights are the headline: `battleWeight`, `comebackWeight`,
`leadChangeWeight`, `overviewWeight` — all four inert under this probe.** Also `battleMaxDurationMs`,
`battleMinTopN`, `battlePulkThresholdT`, the seven `comeback*` gates, `leadChangeCooldownMs`,
`leadChangeMinDuration`, `overviewStartDelay`, `overviewTargetCount`, `postStartHoldMs`,
`finishPauseMs`, `finishDramaDurationMs`, `entryConvergencePx`, `transitionTConvergence`,
`photoFinishCloseThresholdT`, and profile `innerFramePct`, `leadAheadEnabled`, `maxEntryDurationMs`.

**I am NOT calling these dead, and the distinction is the point.** A gate that never fires in two
races cannot show up — COMEBACK barely occurred, and a photo finish needs a close one. `maxStateDuration`
and `minStateHoldMs` exist at top level *and* per state, and the per-state ones are provably live, so
the top-level pair is most likely shadowed rather than dead. What this table gives is a **prioritised
suspect list**, and the weights are first on it: four controls that are supposed to decide which shot
you get, none of which could be shown to change anything.

---

## 5. HARDCODED VALUES THAT DESERVE A CONTROL

| value | where | why |
|---|---|---|
| `START_PHASE_DURATION = 3000` | `CameraDirector.js` | how long the camera holds the field at the gun. Directly shapes the opening, and CAMERA-TAGS-1 showed it is *five seconds short* of when the field actually spreads |
| `EDGE_MARGIN_FRAC`, `YIELD_OVERLAP_FRAC` | `nameTagLayout.js` | the label-stability pair. Measured, not tuned — but they trade steadiness against readable count, which is a taste question |
| `COMPANY_FRAME_PCT = 0.9` | `framingRule.js` | the companion margin. Flagged when it shipped; still a constant |
| `BOX_H_FACTOR`, `BOX_OFFSET_FACTOR` | `nameTagLayout.js` | where a label sits relative to its racer |
| `TOP_N = 3` | `CameraDirector.js` | how many racers the director considers "the front" |
| `MAX_CAM_ZOOM = 24.0` | `projection.js` | a ceiling that has now moved **twice** for content reasons |

---

## 6. WHAT IS PROTECTED BY TESTS, AND WHAT ONLY BY CONVENTION

**Protected — a change breaks a test:** the zoom unit's invariance (same setting, same world, any
corridor width); the six-state framing table; corridor/pair/company guarantees on every heading; the
company guarantee's promise *inside* the region; the lateral guarantee's arithmetic and its
one-dimensionality; the min-draw floor and its zoom-independence; name-tag layout, occlusion and the
start-formation exception; the config loader's defaults-under/stored-over/unknown-ignored rule; the
engine-input list; and now **every camera decision at once**, via the fingerprint.

**Convention only — nothing fails if it breaks:**
- **The tracking lag.** Measured repeatedly, never asserted. Change a `trackingTC` default and no test notices.
- **The state machine's transition reasons.** Which state fires when is covered only where a specific block wrote a case.
- **Slow-motion.** Physics-time scaling in the render loop has no camera-side test.
- **The HUD overlay and every diagnostic flag.** Read-only by design, unasserted by consequence.
- **The world-bounds clamp.** Named as the cause of two measured residuals; no test pins its behaviour.
- **Anything render-path.** Sprite draw, trails, name-tag *drawing* (as opposed to layout) — the fingerprint deliberately excludes it and nothing else covers it.

---

## 7. LESSONS PROPOSED (not applied)

1. **The chord-versus-blend class.** A geometry formula that agrees with reality on the axes and
   diverges between them passes every axis-aligned test. `|cos|·W + |sin|·H` over-stated the frame by
   up to 41%. **Sibling of the bsX/bsY family — same shape, different quantity.**
2. **A control nobody has seen do anything is indistinguishable from a dead one.** Lesson 187 applied
   to controls, and now with a method attached: perturb, re-hash, compare — *inside the validation
   band*, or a live control reports as dead.
3. **The mint tripwire's motivating case.** A value computed in a render file and consumed by the
   engine passes both "no simulation file in the diff" and "no fingerprint ritual for camera work".
   Folder tests cannot bound engine inputs.
4. **Mine, and I would rank it first: a unit that is not in the frame's own terms will drift.** Four
   separate defects on this branch were the same mistake — an absolute pixel value living in a space
   that later changed. The sprite floor (32 px), the label size (`max(8, …)`), the zoom unit (track
   widths), the reference canvas (four copies). **If a number is compared against something on
   screen, express it as a fraction of the screen.**
5. **Also mine: when a measurement contradicts a prediction, the prediction was load-bearing.** Twice
   this week — the label count went *up* when I said down; the reference-width spread was the
   *creature*, not the staircase. Both were stated confidently in a consultation and both were wrong
   in a way that would have shaped the next block.

---

## 8. WHAT IS PARKED, AND WHY — precisely

1. **`CameraDirector.js` extraction (2890 lines).** The clean seam is the detour recorder (~110 lines,
   already has a home in `CameraDirectorDiag.js`). I did not do it: an extraction that must stay
   bit-identical needs its own verification pass, and starting one at this point in the block risked
   landing it unverified. **It is the first thing to pick up.**
2. **HUD "is its text true" and "is it needed".** The *works* column is done and is the hard part. The
   text review is ~60 tooltips and needs the owner's judgement on removals anyway.
3. **The test cleanup itself** (§6 lists what exists; stale fixtures and can't-fail tests are not yet
   removed).
4. **Docs sweep and the LESSONS entries** — proposed in §7, not written into `LESSONS.md`.

None of the parked work is broken or half-applied. Both shipped commits are bit-identical and the
suite is green at 3454.

---

## 9. THE ACCUMULATED LIST — carried forward, not rediscovered

| item | status |
|---|---|
| `autoScaleConfig.minTargetScreenPx` | **LEAVE** — orphan for the render path, but in a race-relevant config block: removing it moves the world hash and needs the engine ceremony |
| `spritePctOfCanvas`, `cameraTransitionSeconds` | **REMOVE** (§4b) — legacy, provably unread |
| `MAX_CAM_ZOOM = 24.0` | a ceiling that has moved twice for content reasons; belongs in §5 |
| `LIGHT_SPACING_PX` | fixed spacing that should scale with world size — **still open**, never handed over |
| four `CANVAS_W` definitions | **DONE** this block |
| the world-bounds clamp | cause of the 0.601-vs-0.66 framing residual and part of the lateral residual; **still unexamined** |
| the tracking lag | measured at 5.8–7.9pp in LEADER, 25.2pp in OVERVIEW; **still unfixed, still the owner's call** |
| the row-count defect | three tracks draw three different animals at exactly 14.3 px; **parked as an engine change** |
| corridor guarantee vs. anchor position | it sizes assuming a centred anchor while the forward bias moves it — named in CAMERA-LATERAL-1 as the next step |

---

## 10. THE OWNER'S EYE

**One check, and it should be boring: does anything look different?** It must not.

`deddc4b483a0689b` before and after says it cannot have — every camera decision on every frame of ten
seeded races is byte-identical. If you *do* see a difference, that is a finding and this block failed
its own test, and I would want to know immediately.

The one thing the fingerprint does **not** cover is the render path — sprite drawing and name-tag
drawing. Nothing in these two commits touches either, but that is an argument, not a measurement, and
you should know which of the two you are being given.
