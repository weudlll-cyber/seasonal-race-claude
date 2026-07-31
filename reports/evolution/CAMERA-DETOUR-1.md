# CAMERA-DETOUR-1 — locate where the camera's wrong-direction move begins (diagnosis, fix nothing)

The owner reports that at EVERY view change the camera first travels the WRONG way before finding the new
focus — symmetric in both zoom directions. The algebra rules out the glide interpolation itself (linear +
monotonic), leaving four candidates: (A) a wrong glide START POINT, (B) a second mover (`_camT` / follow path)
running in parallel, (C) the mid-glide containment clamp actually steering, (D) a one-frame zoom offset in
`_setTargets`. This block builds a read-only, config-gated frame-log instrument that MEASURES which one it is, on
the owner's LIVE trace (seed 5601). **Nothing was fixed, tuned, or shipped — this is a diagnosis.** No fingerprint
mint, no tag.

## BUILD-VS-SPEC CONFORMITY (step by step)

### STEP 1 — the frame log (read-only, config-gated, OFF by default) — BUILT
New config key `cameraDetourLog` (default **false**) in `DEFAULT_CAMERA_CONFIG`, threaded through
`cameraTimingComputation` → `this._detourEnabled`. A recorder `_recordDetourFrame` (in `CameraDirector.js`)
captures, for the **3 frames before** each transition and the **first ~30 after**, per frame:
- `rel` (index relative to the transition) and `from → to` state;
- `anchorSX/anchorSY` — the NEW state's centre world point (`getPanTarget(this.state, …)`, which covers BATTLE
  where `_focusAnchorRacer` is null) projected with the **SAME offset/zoom the renderer committed this frame**
  (`world·effZoom + offset`), never a recomputation from other inputs;
- `oX/oY/z` as rendered;
- `gsoX/gsoY/gsz` (`_glideStart*`) vs `preoX/preoY/prez` (the last RENDERED offset/zoom before the transition) —
  candidate **A** decidable by comparing two numbers;
- `camT` and `camTRead` (`tSpaceLerpActive` — did the follow path read `_camT` this frame) — candidate **B**;
- `containMod` + measured `containDX/containDY` (the delta `_containAnchorInFrame` actually applied, captured
  before/after the clamp — **not** the assumed "no-op") — candidate **C**;
- `stZoom` (the zoom `_setTargets` used) vs `rz` (the zoom the renderer drew with) — candidate **D**.

It writes **only** to `_detour*` fields + `console.info('[RA CAMERA DETOUR] …')`; it mutates no camera value.
Completed windows are emitted to the console (copy-pasteable) and retained in `exportDetourLog()`. **Deviation:**
the pre-transition frames carry `anchorS*` = null (the new-state anchor is undefined before the transition
fires); the flip-sign readout uses frames 0…30 where it is defined. Declared.

### STEP 2 — prove the instrument is live — DONE
Two `node:test`/vitest liveness tests (in `CameraDirector.test.js`): with the flag **ON**, driving a real
OVERVIEW→LEADER_ZOOM transition produces a captured window (pre + ~30 post frames, `anchorSX` present) AND a
`[RA CAMERA DETOUR]` console line; with the flag **OFF** (default), the same drive produces **no export and no
console line**. Both pass. This is the Lesson-187 proof-of-live for the instrument itself. **Deviation:** none.

### STEP 3 — the decisive readout — **RUN (owner's live trace delivered).** Verdict recorded in [CAMERA-DETOUR-2.md](CAMERA-DETOUR-2.md).
The owner ran this instrument on seed 5601 and delivered four transition windows. Result: **candidates C
(containment clamp steering) and D (frame-0 target framing in the wrong zoom scale) CONFIRMED; A EXCLUDED
(`gso*` == `preo*` exactly); B NOT evidenced**, and one window (LEADER_ZOOM→OVERVIEW) remains unexplained — its
444 px excursion has `containMod:false` and `camTRead:false`, so the "second mover" branch fires but its logged
mover denies involvement. The full numbers, the follow-up instrument extension, and the proposed fixes are in
[CAMERA-DETOUR-2.md](CAMERA-DETOUR-2.md) — read the two as ONE diagnosis.

### STEP 4 — the second, independent finding — CONFIRMED (real bug) but effectively UNREACHABLE live. See below.

## STEP 3 readout — PENDING the owner's live trace (seed 5601)

Not yet available. When the owner pastes the `[RA CAMERA DETOUR]` window(s), the readout is mechanical:
- **flip of `anchorSX`/`anchorSY` direction at rel 0–2** → the START POINT is wrong (candidate **A**; check `gso*`
  vs `preo*` on those frames — if they differ, the glide began where the camera was never seen; also inspect
  `stZoom` vs `rz` for **D**);
- **flip later, smooth reversal** → a SECOND MOVER (candidate **B** if `camTRead=true`/`camT` moving through the
  glide; candidate **C** if `containMod=true` with a non-zero `containDX/DY`);
- **no flip in the log although the owner sees the effect** → the instrument is measuring the wrong thing — I will
  say so LOUDLY, not explain it away.

## Raw frame table

The DIAGNOSTIC table for seed 5601 awaits the owner's trace. The column schema (what he will paste, one row per
frame) is:

`rel | from→to | anchorSX anchorSY | oX oY z | gsoX gsoY gsz | preoX preoY prez | camT camTRead | containMod containDX containDY | stZoom rz`

**Harness FORMAT sample** (from the STEP-2 liveness test — *synthetic* `mockRacers`, a real OVERVIEW→LEADER_ZOOM
transition; this proves the instrument's output shape, it is NOT the owner's diagnosis). In this synthetic case
the transition resolved to the follow/lerp path (`gso*` null, not the glide grammar) and `anchorSX` moves
**monotonically** 505.8 → 640.4 with **no flip** — exactly what the algebra predicts for a clean transition:

```
rel  from→to               anchorSX,anchorSY   oX,oY,z                     gso(A)  preo(A)  camT,camTRead(B)  containMod,DX(C)  stZoom,rz(D)
-1   OVERVIEW→LEADER_ZOOM   (pre — anchor n/a)  0,0,1                       —       —        null,—            —                —
 0   OVERVIEW→LEADER_ZOOM   505.840,303.504     -42.792,-25.675,1.097263    null    0,0      null,false        false,0          1.000000,1.097263
 1   OVERVIEW→LEADER_ZOOM   516.116,309.670     -75.307,-45.184,1.182846    null    0,0      null,false        false,0          1.097263,1.182846
 2   OVERVIEW→LEADER_ZOOM   529.680,317.808     -99.396,-59.638,1.258153    null    0,0      null,false        false,0          1.182846,1.258153
 3   OVERVIEW→LEADER_ZOOM   545.594,325.261     -116.615,-72.064,1.324418   null    0,0      null,false        false,0          1.258153,1.324418
 4   OVERVIEW→LEADER_ZOOM   560.431,331.533     -130.932,-83.284,1.382725   null    0,0      null,false        false,0          1.324418,1.382725
 …   (…continues monotonically to rel 30: anchorSX 640.411, anchorSY 360.940)
```

Read-notes for the owner's REAL table: candidate **D** already shows here as a one-frame zoom lag (`stZoom` =
last frame's zoom, `rz` = this frame's) — but the anchor stays monotonic, so D's lag alone did not flip it here;
on the owner's trace, watch whether `anchorSX/SY` reverses while `gso*≠preo*` (A), `camTRead=true` (B), or
`containMod=true` (C).


## STEP 4 verdict — `panTarget.js` `tMid` wrap: a REAL latent bug, but the live path does not reach it

**The arithmetic is genuinely wrap-blind.** `getPanTarget('BATTLE_ZOOM', racers, shape)` computes
`tMid = (r0.t + r1.t) / 2` with no seam handling (`panTarget.js:47`). Racer `.t` is per-lap-normalized `[0,1)`
that WRAPS at the start/finish line (confirmed: `EditorShape.getPosition` mods closed-track t as `((t%1)+1)%1`,
and `raceCore.js:52` is an explicit "closed-track t-wrap helper"). Closed races are multi-lap (operator picks
`laps`). So two racers straddling the line (0.98 & 0.02) give `tMid = 0.50` — a point on the **opposite** side of
the track. The bug is real.

**But the guarded path is effectively unreachable in a live race.** In `_setTargets`, the BATTLE target is the
**euclidean centroid of the live battle group** (`_findGroupRacers`, `CameraDirector.js:2408-2414`).
`getPanTarget(BATTLE, focusRacers, shape)` — the `tMid` path — is only the `battleFallback`, used **when the live
group is empty** (`liveGroup.length === 0`; the code comment says "direct state assignment in tests"), and even
then only when `_camT === null` (otherwise `shape.getPosition(_camT)` is used). A live BATTLE fires *because* a
real cluster exists, so `liveGroup` is non-empty → the centroid path runs and `getPanTarget` is never called.
PHOTO_FINISH's `pfFallback` (`:2445`) is gated the same way behind `_camT`. So the wrap bug is a latent
empty-group/test-only fallback; even if reached it is a transient BATTLE mis-frame near the seam, **not** an
every-transition, both-zoom-directions symptom. **Verdict: confirmed real, worth a wrap-aware fix eventually,
NOT the owner's symptom, and not fixed here.**

## What I could not measure, and why

- **The owner's live flip-frame (STEP 3).** It requires his browser session on seed 5601 with `cameraDetourLog`
  on — the truth line measures the session, and I will not substitute my own replay (Lesson 191). Pending.
- **Candidate ranking.** Without the live trace I can build the instrument that decides A/B/C/D but cannot yet
  declare the winner. The instrument is designed so a single window decides it.

## Handoff — what the owner runs (seed 5601)

1. Dev Screen → set `cameraDetourLog` on (or `localStorage`/config: `cameraStateProfiles`… the flag lives in the
   camera config, default off). 2. Run a race on **seed 5601** (dense traffic ⇒ many view changes). 3. Open the
   browser console and copy every `[RA CAMERA DETOUR] <from>-><to> [...]` line (each is one transition window as
   JSON). 4. Paste them back here. STEP 3 is then a mechanical read.

## VERIFICATION (from the committed state — SHIP-CEREMONY step 12)

```
# Fingerprint (shipped-default) — identical with the flag OFF and ON
$ node scripts/fingerprint-default.mjs            # cameraDetourLog OFF (committed default)
COMBINED dc4647be0f55ebdb (seed=1 races=3 track-defaults, 10 tracks, default config)
$ (cameraDetourLog flipped true) node scripts/fingerprint-default.mjs   # flag ON
COMBINED dc4647be0f55ebdb (seed=1 races=3 track-defaults, 10 tracks, default config)
# → OFF == ON == baseline dc4647be0f55ebdb (the flag moves no physics)

# STEP 2 liveness demonstration (vitest / node:test)
$ npx vitest run CameraDirector.test.js -t "CAMERA-DETOUR-1"
  ✓ ON: emits a [RA CAMERA DETOUR] window (pre + post frames) on a real transition
  ✓ OFF (default): produces NO frame-log lines and no export — proves it is truly gated
  Tests  2 passed

# Guards
$ node scripts/check-doc-links.mjs
check-doc-links: 310 relative links across 52 living-doc files; 0 dangling.
$ node scripts/check-index.mjs
check-index: 70 reports checked, 0 unindexed.
$ node scripts/check-tags.mjs
check-tags: 45 origin tags checked, 0 unregistered.

# Script test suite, as CI runs it
$ node --test $(find scripts -name '*.test.mjs')
  tests 121 | pass 121 | fail 0

# Full client suite — the camera instrument breaks nothing
$ npx vitest run
  Test Files  162 passed (162)
  Tests  3369 passed (3369)

$ git status --porcelain
  (clean — no output)
```

The instrument is **fingerprint-neutral by construction**: the shipped-default fingerprint hashes pure race
physics (`sim-fairness.mjs`: "No PNG output, no camera, no rendering — pure physics"); the sim imports only
`REFERENCE_FPS` from the camera dir and never reads `cameraDetourLog` nor instantiates `CameraDirector` (grep:
0 hits in the sim path). So the flag is unreachable from the fingerprint — OFF ≡ ON. The mints below confirm both
equal the baseline `dc4647be0f55ebdb`, proving the source edits perturbed no physics.

## PROPOSALS (≥2)

1. **If it is a second mover, make "two movers at once" STRUCTURALLY impossible, not tuned.** The real question
   is not which of the glide (screen-space) or the `_camT` follow (track-space) wins — it is that BOTH can write
   the image in the same frame. Make `_lerpPhase` the single authority over screen position: during `'glide'`,
   the `_camT`/follow path must be a pure INPUT (it may advance `_camT` for handoff) but must not write
   `offsetX/offsetY` — enforced by routing every offset write through one function that asserts
   `_lerpPhase === 'glide'` ⇒ only the glide may write. One owner of screen position per phase; a second writer
   becomes an assertion failure in a test, not a visible lurch (Lesson 192's "clamp-active ≈ 0 is a test" applied
   to movers).
2. **If it is candidate A, capture the glide start from the ACTUAL last rendered frame, and assert it.** If
   `gso*` ≠ `preo*` on the trace, the glide starts from a framing the eye never saw. The structural fix is to
   snapshot `_glideStart*` from the previously-RENDERED `offsetX/offsetY/zoom` (not from a value that any commit
   block may have already snapped), and add a test that `_glideStartOffset* === lastRenderedOffset*` at every
   transition — the two-numbers comparison this instrument was built to make becomes a standing guard.
3. **Promote this instrument to the ceremony's camera-change verification.** Any camera/UI change already owes a
   Lesson-191 live-truth line; a `[RA CAMERA DETOUR]` window on a known seed, showing the anchor's screen path
   is monotonic through a transition, would be a cheap, specific acceptance artifact for exactly this class of
   regression — better than "looks right."
