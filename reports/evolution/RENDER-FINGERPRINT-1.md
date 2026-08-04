# RENDER-FINGERPRINT-1 — the picture becomes a measurement

Branch `camera-refactor`. Return tag `pre/render-fingerprint` (`9ae13a4e`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step.

**The new instrument: `RENDER ae7e9243bd2add8b`** — `node scripts/render-fingerprint.mjs`.

**Standing rules held.** Camera `4b33c4d31bec93ea` and world `dc4647be0f55ebdb`, both bit-identical
at every commit. The mint tripwire fired (this diff leaves `camera/`) and the world hash was checked
against it. Suite 3477 → 3494, green. `eslint` and `prettier` clean.

---

## 1. BUILD-VS-SPEC CONFORMITY

| § | asked | status |
|---|---|---|
| — | record draw CALLS, do not rasterise | **DONE** (§4) |
| — | feasibility answered FIRST | **DONE** (§2) — and the answer changed the block |
| — | hash at fixed frame indices, ten tracks, one value | **DONE** (§4) |
| — | pin the camera seed | **DONE** — `camSeed=1439767152`, same as the camera fingerprint |
| — | say what is in the hash, what is excluded, what it is blind to | **DONE** (§5) |
| — | PROOF 1 stable, twice and from cold | **DONE** (§3.1) |
| — | PROOF 2 sensitive, with the darkening as one sabotage | **DONE** (§3.2) — and one sabotage FAILED, which is the block's most useful result |
| — | propose where it belongs in SHIP-CEREMONY | **DONE** (§7) |
| — | camera + world fingerprints unmoved | **DONE** |
| — | tests adapted AND extended | **DONE** (§6) |
| — | hygiene for whatever this orphans | **DONE** (§6) |

**Deviations declared — two.**

1. **I built the seam rather than proposing it.** The spec allowed either, provided I said so. §2
   explains why: without it the instrument would measure a copy of the draw sequence rather than the
   sequence, and this repository's own history is a list of instruments that were wrong. The cost is
   that ~210 lines of the most visually sensitive code moved, and the one link in the chain that is
   argued rather than measured is that move's faithfulness. It is covered by a reviewable diff, the
   full suite, and the camera fingerprint — and from this commit onward the render fingerprint
   protects it. I would not have done this in an unattended block without the spec's explicit
   permission.
2. **The fingerprint does not cover the sprite blit, particles or surface trails.** Measured, not
   assumed, and one of them was found by a sabotage rather than by reading. §5 states it precisely.
   I did not force these closed tonight; §8 names the fix for each.

---

## 2. THE FEASIBILITY ANSWER — and it was itself a finding

**Split verdict.**

**The drawing MODULES were already drivable.** Every one of them — `drawRacers`,
`drawEditorBackground`, `drawTrackLights`, `drawParticles`, `drawSurfaceTrails`,
`drawBattleDiagMarkers`, the six overlays, `renderMinimap` — takes `ctx` as its first parameter and
touches no React. Twenty-seven distinct canvas operations between them, a bounded set.

**The SEQUENCE was not.** It was ~210 lines inside `RaceScreen`'s `requestAnimationFrame` callback.
I measured its dependencies rather than estimating them: **62 free identifiers, of which 20 are
imports and 42 are live component state** — including 7 React refs (`camDirRef`, `cameraConfigRef`,
`racerTypeRef`, `effectsRef`, `tagIncumbentsRef`, `leaderDiagRef`, `bgCanvasRef`), a mutable closure
variable, a React state setter (`setCountdown`) and direct DOM access
(`bgCanvasRef.current.style.transform`).

**That is the finding the spec anticipated: the render path had no protection because it was not
built to be checkable.** Not because nobody had got round to it.

**Why I built the seam instead of proposing it.** The alternative was a harness that reproduced the
call order and argument plumbing itself. That is an instrument measuring a copy of the thing it
measures, and it fails silently the moment the two drift. This repository's preamble to the spec
lists six occasions where an instrument was wrong — including a harness carrying the same defect it
was measuring. Building one more would have been the predictable seventh.

What moved: the draw sequence, into `renderRaceFrame(ctx, frame)`. What stayed in the component:
the background canvas's CSS transform, the countdown state setter, the perf log — the three things
that genuinely belong to React and the DOM.

**A second finding fell out of it.** The extraction needed `PHASE`, and it turned out to be declared
in three places: `PHASE` in `index.jsx` and `PHASE_RACING = 1` separately in both
`racerRendering.js` and `battleDiagRendering.js`. Three constants that must agree with nothing
making them — the same family this branch has been finding all week. One home now (`racePhase.js`).

---

## 3. THE TWO PROOFS

### 3.1 STABLE

| run | hash |
|---|---|
| 1 | `ae7e9243bd2add8b` |
| 2 | `ae7e9243bd2add8b` |
| 3 | `ae7e9243bd2add8b` |
| **cold start** — fresh `git worktree` at `e98bf2ca`, separate process, different working directory | `ae7e9243bd2add8b` |

The cold start matters more than the repeats: it rules out anything cached in the working tree and
demonstrates the value is a property of the commit rather than of my session.

### 3.2 SENSITIVE — four sabotages, and the fourth is the useful one

| # | sabotage | hash | moved? |
|---|---|---|---|
| — | baseline | `ae7e9243bd2add8b` | — |
| S1 | every racer drawn **one pixel** further right | `4b7fb9144f848323` | **yes** |
| S2 | **battle-focus darkening removed** (`battleFocusDarkening` → 0) | `01e6013a9f574f56` | **yes** |
| S3 | **name tags dropped** (layout capped at 3 labels) | `76ea01150fd3316e` | **yes** |
| S4 | **two layers swapped** — `drawParticles` ↔ `drawSurfaceTrails` | `ae7e9243bd2add8b` | **NO** |
| S4b | two layers swapped — track surface ↔ track lights | `1c896a9380a951a8` | **yes** |

**S2 is the case the block exists for.** The camera fingerprint was green while the battle darkening
needed checking by eye, because darkening is render and the camera fingerprint stops at the
director. It is now a measurement.

**S4 did not move the hash, and that is the block's most valuable single result.** Not a defect in
the hash — a defect in the harness's COVERAGE. `st.dustParticles` and `st.burstParticles` are filled
by the component's loop, and `r.surfaceEmitter` is resolved from the racer type and the track's
surface classes; the harness supplies none of them, so both layers draw nothing and swapping two
no-ops is genuinely no change. I found this only because I sabotaged something I expected to be
covered and it was not.

Investigating it turned up a second, larger gap: **`drawImage` is called ZERO times in the whole
ten-track run.** Node has no `Image`, the sprite cache never fills, and `racerType.drawRacer` takes
its procedural fallback branch. Both are now stated in §5 and in the script's own header, rather
than left to be discovered by whoever trusts the instrument next.

S4b re-establishes the order sensitivity the instrument claims, using two layers that do draw.

---

## 4. WHAT WAS BUILT

| file | lines | what it is FOR |
|---|---:|---|
| `RaceScreen/renderRaceFrame.js` | 297 | The draw sequence, and the only place that decides what is drawn in what order. No React, no refs, no DOM, no clock. |
| `modules/parity/recordingContext.js` | 244 | A stand-in 2D context that records the call stream instead of painting it. |
| `modules/parity/hashing.js` | 55 | A streaming 64-bit digest with no node-only import, so it is identical in node, vitest and a browser. |
| `RaceScreen/renderState.js` | 99 | The fields the render layer adds on top of physics state, the racer render identity, and the BATTLE focus-fade rule — shared with the harness so it cannot invent a frame the browser never produces. |
| `RaceScreen/racePhase.js` | 17 | The one encoding of `st.phase`. |
| `scripts/render-fingerprint.mjs` | 322 | The harness. |
| `modules/parity/recordingContext.test.js` | 187 | 17 tests (§6). |

**The sampled frames, and why.** Fixed indices, never events — "at the third lead change" is not
reproducible, "at frame 600" is. Each race is driven for exactly 3400 frames so every sample point
exists on every track regardless of when that track's race actually ends.

| frame | why |
|---|---|
| 0 | the start formation at the gun — the densest thing on screen, every name tag shown, the frame the owner looks at first |
| 90 | 1.5 s: moving but still packed, tag-all window still open |
| 600 | 10 s: past the post-start hold, so the camera has begun choosing shots |
| 1500 | 25 s: mid-race, field spread, battles plausible |
| 2400 | 40 s |
| 3300 | 55 s: late, and past the finish on the shorter tracks, so the FINISHED overlay is covered |

Six frames × ten tracks = 60 recorded frames, ~482,000 operations.

---

## 5. WHAT IS IN THE HASH, WHAT IS OUT, WHAT IT IS BLIND TO

**In.** Every drawing operation in order with its rounded arguments (1e-4 screen px): fills,
strokes, paths, arcs, ellipses, rects, text, transforms, every `save`/`restore`, every style
assignment, every gradient with its colour stops, and sprite draws by identity. Order is part of it
— two layers swapped is a different frame even when every argument is identical.

**Deliberately excluded.**

- **`measureText` questions.** Measuring is not a mark on the canvas, and the answer already appears
  in the `fillText` that follows. Hashing the questions would make the fingerprint sensitive to how
  often the layout asks rather than to what it draws.
- **The config-fingerprint badge's live values**, pinned to a constant. They encode which config the
  run used, which is the thing the script already holds fixed; letting them vary would make the hash
  report its own inputs back at itself.
- **Nothing time-varying was left in by accident** — there is no frame counter or wall clock drawn.
  The background gradient does animate with `ts`, and that is deliberate: `ts` is a deterministic
  function of the frame index, so it is signal rather than noise.

**Blind to — three things, all measured.**

1. **The rasteriser.** If `fillRect` started painting the wrong pixels, this would not know. By
   construction, and the reason the approach is environment-independent at all.
2. **The artwork.** Sprites are recorded by identity, not content. Redraw a rocket and the hash does
   not move. The owner's eye is the right instrument for that, and this is the one thing his eye is
   unambiguously better at than any hash. Stated as a test, not only as prose.
3. **The sprite blit itself, plus particles and surface trails.** The one that was found rather than
   predicted. `drawImage` count across the entire run: **zero**. What IS covered for a racer is
   everything around the body — position, angle, scale, dim alpha, highlight rings, name tags, and
   the order of all of it, which is what a refactor breaks.

**Text metrics are synthetic.** `measureText` returns a deterministic width, because a browser's
depends on the installed font. So the fingerprint pins the tag-layout ALGORITHM (same widths in,
same labels out) and not the label count a real browser produces. A change to the layout rule is
visible; a change to font metrics is not.

---

## 6. TESTS AND HYGIENE

**Added: 17**, all on the recorder, because that is where a defect would be silent — a hash that
does not move looks exactly like a picture that did not change. They cover what must move the digest
(one pixel, order, style, a dropped call, `globalAlpha` — which is how the darkening is seen,
gradient stops), what must not (`measureText`), and the digest's own properties (chunk-boundary
stability, reorder detection, a single changed character in a 5000-character stream).

**Four of them cover the sprite path deliberately**, because the ten-track harness reaches it zero
times. Without them, image recording would be dead code that only ships the day somebody runs the
fingerprint in a browser. One of the four asserts the artwork BLINDNESS — same `src`, different
pixels, same digest — so the limitation is pinned rather than only described.

**Hygiene for what the extraction orphaned:** 21 now-unused imports pruned from `index.jsx`, and
`RACER_COLORS` moved to `renderState.js` with the per-racer render seeding it belongs to.

---

## 7. HOW IT ENTERS THE CEREMONY

Added to [SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md) as a third row in a new
**THE THREE FINGERPRINTS** table, framed the same way as the other two: a change detector, not a
prohibition.

**When to run it:** any block whose diff can reach a `ctx.` call — `renderRaceFrame.js`,
`RaceScreen/drawing/`, `nameTagLayout.js`, `Minimap.js`, or a racer type's `drawRacer`.

**Why not every camera block.** The camera fingerprint already covers every decision the director
makes and is the cheaper answer for camera-only work. The render fingerprint answers the question
the camera one structurally cannot.

---

## 8. COST, AND WHETHER IT IS CHEAP ENOUGH TO BE ROUTINE

| instrument | run 1 | run 2 |
|---|---:|---:|
| `render-fingerprint.mjs` | 32.1 s | 28.7 s |
| `camera-fingerprint.mjs` | 85.7 s | 81.1 s |

**Yes — about 30 seconds, roughly a third of the camera fingerprint's cost.** My honest view: this
is comfortably inside the range where an instrument gets used rather than skipped, and it is cheaper
than the thing it is most often run alongside. The spec's own test — "fast enough to run in every
camera block, which is the difference between an instrument and a ceremony nobody performs" — is
met.

Two levers exist if it ever needs to be cheaper: fewer sampled frames, or a shorter run. Neither is
needed now, and both would cost coverage, so I did not use them.

---

## 9. WHAT THE RENDER PATH IS STILL NOT COVERED BY

CAMERA-HYGIENE-2 §5.7 listed one line for the whole render path: *"Sprite drawing, trails, name-tag
drawing. The fingerprint excludes it deliberately and nothing else covers it."*

**What moved from convention to protected:** sprite PLACEMENT (position, angle, scale), name-tag
drawing and its layout under a fixed metric, the battle-focus darkening, highlight rings, the dev
markers, the track surface, the track lights, the background gradient, the finish line, the titles,
the lap info, the phase overlays, the HUD pills, the minimap — and the ORDER of every one of them.

**What remains, and it is now three specific items rather than one vague one:**

1. **The sprite blit.** `drawImage` never runs in node. *Fix:* stub `Image`, `fetch` and
   `URL.createObjectURL` in the harness so the sprite cache fills — each stub is a place the harness
   can diverge from the browser, which is why it deserves its own block rather than a hurried
   addition to this one.
2. **Particles and surface trails.** Their buffers are filled by the component's loop. *Fix:* move
   the emit rules into `renderState.js` alongside the focus fade, the same way this block moved that
   one.
3. **The rasteriser and the artwork.** Structural, and correctly out of scope. The owner's eye.

---

## 10. THE OWNER'S EYE

**None needed — this block draws nothing new**, and the two existing fingerprints say the race and
the camera are byte-identical.

The honest caveat is that the *third* fingerprint is new, so it has no "before" to be compared
against; `ae7e9243bd2add8b` is a baseline, not a confirmation. What stands behind the extraction not
having changed the picture is: the camera fingerprint (unmoved), the full suite (3494 green), the
reviewable diff, and — from the next block onward — this instrument itself.

If you do glance at a race, the two things this instrument cannot see are the sprites themselves and
the particle/trail layers. Everything else about the picture is now measured.
