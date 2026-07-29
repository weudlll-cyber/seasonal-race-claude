# LEADER-MINVIS-1 — the LEADER "zoom out until ≥8 racers visible" rule exists but doesn't act

**Base: `origin/master`. Author: CC.** The LEADER view stays zoomed tight on the leader, showing far fewer
than the intended ≥8 racers. Presentation-only; fingerprint `ded0a126048e4cdb` must (and does) stay identical.

## VERDICT (read first): ROOT-CAUSE FIXED. The slow reset-on-transition ratchet is replaced by a direct floor.
The min-visible rule was a **slow per-frame ratchet** (`0.005`/frame ≈ 2.7 s to traverse the zoom range) that
first let the camera zoom all the way IN to the tight leader profile — dropping to ~1 visible on a strung
field — and only *then* crawled back out, **restarting on every state transition**. It never settled within a
live LEADER episode. The fix computes the min-visible zoom **directly each frame** and clamps the target to it,
so the rule holds instantly and survives transitions. Fingerprint identical; 3327 tests green.

## STEP 0 — ROOT CAUSE (three sentences)
1. The owner's persisted camera config is **not** the cause — `minRacersVisible: 8` (feature ON) with all
   ratchet params at their defaults (`leaderMinZoom 0.4`, `zoomOutStepPerFrame 0.005`, `leaderMinZoomFraction
   0.6`); his three cosmetic off-default keys are per-state sprite scales — **`OVERVIEW.spriteScale 2`**,
   **`LEADER_ZOOM.spriteScale 3`** (vs default 1.81), **`COMEBACK_ZOOM.spriteScale 2.45`** (plus
   `LEAD_CHANGE 3`, `highlightHeroes true`) — and `LEADER_ZOOM 3` zooms the leader in *tighter*, making the
   symptom acute.
2. The rule is a **reactive slow ratchet**: it evaluates visibility at the lagging live zoom, and only once
   `this.zoom` has lerped all the way to the tight leader zoom (where, on a strung field, ~1 racer is on
   screen) does it begin lowering a floor by `zoomOutStepPerFrame` (0.005/frame) — a ~2–4 s crawl (reproduced:
   the zoom went 1.81 → vis 1 at frame 60, and only reached 1.365 by frame 240).
3. That floor is **reset to `null` on every state transition** (`CameraDirector.js:1300`), so each time the
   camera re-enters LEADER (from OVERVIEW / BATTLE / LEAD_CHANGE) the ratchet starts over from the tight zoom —
   in a live race the camera therefore sits at the tight leader zoom showing too few, and "the rule computes
   but never wins" (suspect b/c confirmed; a/d cleared).

## STEP 1 — THE FIX (direct min-visible floor)
New `CameraDirector._zoomFloorForMinVisible(racers, fx, fy, visTarget, divisor, canvasW, canvasH)`: for a
focus-centered pan, a racer at world offset `(dx,dy)` is on canvas iff `zoom·divisor·|dx| < canvasW/2` and
`… |dy| < canvasH/2`, so its per-racer max cam.zoom is `min(halfW/(|dx|·divisor), halfH/(|dy|·divisor))`; the
`visTarget`-th largest of those is the zoom below which ≥ visTarget racers are visible (Infinity when fewer
active than target — the small-field guard). In `_setTargets`, for LEADER_ZOOM / LEAD_CHANGE:
`targetZoom = min(targetZoom, max(effectiveFloor, min(targetZoom, minVisZoom)))`. It is **direct and
self-consistent** (no dependence on the lagging live zoom/offset), so it holds on the first frame and does not
care about transitions; the normal zoom lerp still smooths the visual. `minRacersVisible = 0` disables the
feature (byte-compatible OFF); the hard floor (`leaderMinZoomFraction × leaderZoom`, and ≥1.0 on closed tracks
to avoid the world-in-corner bug) still bounds how far out it may go. Reproduced before → after (strung field,
40 racers): before, visible collapsed to **1** for seconds; after, the camera opens at the min-visible zoom and
**≥8 are visible from frame ~0**. **No migration needed** — the config was never the cause.

## STEP 2 — LOCK THE CLASS
Per-state camera regression tests now cover all three states: **OVERVIEW** sprite-scale coupling
(OVERVIEW-ZOOM-1, already landed), **LEADER** min-visible rule (new, below), and **BATTLE untouched** (new: the
min-visible floor must NOT fire in BATTLE_ZOOM — BATTLE shows the duel, not the whole field; asserts
`targetZoom == battleZoom` and the floor is untouched). Folded in OVERVIEW-ZOOM-1 proposal 1: the OVERVIEW
sprite-scale control tooltip now explains it MULTIPLIES the normalized overview size (the two-knob relationship).

## STEP 3 — TESTS (new; `CameraDirector.test.js`, 346 camera tests green)
Unit `_zoomFloorForMinVisible`: visTarget-th largest per-racer max zoom (x- and y-limited), small-field guard
(Infinity), all-at-focus (Infinity), skips finished. Integration (drive to convergence): field 40 strung →
≥8 visible · bunched field → no zoom-out below the leader zoom · `minRacersVisible=0` → OFF (stays tight,
wider than ON) · small field (6) → guard, all 6 shown · LEAD_CHANGE same as LEADER · **profile write does not
defeat the floor** (targetZoom clamped < leaderZoom every frame) · OVERVIEW & BATTLE untouched · closed floor
never < 1.0.

## VERIFY
- **Fingerprint `ded0a126048e4cdb` IDENTICAL** (camera is presentation-only, off the sim/physics path).
  **Full suite 161 files / 3327 tests green.** **eslint + build clean.**
- **Owner check (dev server restarted):** start a race; when the camera goes to LEADER it opens with roughly
  ≥8 racers in frame (never a lone leader), and holds it across BATTLE/OVERVIEW excursions.

## THE FIVE SENTENCES
1. The LEADER min-visible rule was a slow per-frame ratchet that first zoomed all the way in to the tight
   leader profile (≈1 racer visible on a strung field) and only crawled back out over seconds, resetting on
   every state transition — so in a live race it never settled and the view stayed too tight.
2. The owner's config was not the cause (`minRacersVisible: 8`, feature ON); his three cosmetic off-defaults are
   per-state sprite scales, and `LEADER_ZOOM.spriteScale = 3` zoomed the leader in tighter, making the symptom
   acute.
3. The fix computes the min-visible zoom directly each frame from focus-centered geometry and clamps the target
   to it, so the rule holds from the first frame and is immune to episode length and transitions.
4. BATTLE framing is explicitly left untouched, the small-field guard and closed-track black-screen floor are
   preserved, and `minRacersVisible = 0` still disables the feature byte-compatibly.
5. Behavior-neutral for the shipped game — fingerprint identical, 3327 tests green (new per-state regression
   tests for OVERVIEW/LEADER/BATTLE), eslint + build clean — awaiting the owner's LEADER eye-test.

## PROPOSALS (≥2)
1. **Expose the resolved LEADER cam.zoom + visible count in the camera-state HUD.** The owner already runs
   `showCameraStateHud: true`; adding "LEADER zoom X.XX · N/active visible (min 8)" would make this rule (and
   the min-visible floor) verifiable at a glance during a race, the same way the fingerprint badge verifies the
   physics.
2. **Reconsider the per-state `zoomOutStepPerFrame`/`leaderMinZoomFraction` knobs now that the ratchet is
   gone.** `zoomOutStepPerFrame` is unused by the direct floor; either repurpose it as a max zoom-change rate
   (to cap how fast the floor may widen the view on a sudden string-out) or retire it from the DevScreen to
   avoid a dead control. `leaderMinZoomFraction` remains meaningful as the hard floor.
3. **A "min-visible" indicator when the field is so strung the hard floor binds.** When `minVisZoom` falls
   below `effectiveFloor` (the camera can't show 8 without breaking the world-edge floor), the view shows fewer
   than 8 by necessity; a subtle HUD note ("field too strung — showing max") would explain the rare case rather
   than looking like the rule failed again.

---
**Presentation-layer only** (`CameraDirector.js` + tests, `CameraAdvancedSection.jsx` tooltip). Shipped
fingerprint `ded0a126048e4cdb` unchanged.
