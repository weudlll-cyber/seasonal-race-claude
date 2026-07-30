# CAMERA-FOCUS-1 — the LEADER-family camera drifts AWAY from the current leader

Base `origin/master @195851c` · presentation-only · shipped world COMBO15.
Tracking the current leader — including re-targeting on a P1 swap — is correct and stays; the defect is the **away-drift** during a hold.

## STEP 0 — prove which contributor

Suspects: (1) two-racer midpoint averaging in the phased pan target; (2) focal-EMA / pixel-lerp lag; (3) any other in-hold contributor.

**Read-only falsification of (1).** `getPanTarget('LEADER_ZOOM', racers)` returns `{ x: racers[0].x, y: racers[0].y }` — the leader, never a P1–P2 midpoint (only `BATTLE_ZOOM` returns a midpoint/arc-midpoint). In `_computePhasedPanTarget`, LEADER / LEAD_CHANGE take `focusT = focusRacers[0].t` (the leader's T), so `_camT` tracks the leader alone. The trace confirms `rawPan == leaderX` on **every** frame — the anchor is never pulled toward P2. Suspect (1) is **falsified for LEADER-family**.

**Empirical isolation of (2).** Trace: open track, LEADER profile (spriteScale 3 → tight zoom, innerFramePct 0.7), leader sprints while P2 falls back to a 3 L gap. The drift correlates with **leader speed × zoom tightness**, not with the P1–P2 gap:

| run | leader speed | zoom | P1–P2 gap opens? | frames leader OUTSIDE inner-70 | signature |
|---|---|---|---|---|---|
| fast + tight | 9 px/frame | tight (min-vis OFF) | yes → 3 L | **69 / 100** | LAG |
| fast + relaxed | 9 px/frame | relaxed (min-vis ON, ≥8 visible) | yes → 3 L | 0 / 100 | LAG masked by looser zoom |
| slow + tight | 4 px/frame | tight (min-vis OFF) | yes → 3 L | 0 / 100 | no lag at low speed |
| **after fix** (any of the above) | — | — | yes | **0 / 100** | contained |

The gap opens identically in the fast and slow runs, yet drift appears only when the leader is **fast AND the zoom is tight** — the pixel-lerp offset trails the fast subject and the tight `effZoom` amplifies the trailing pixels past the inner boundary. LEADER-MINVIS-1's zoom floor *masks* the bug (relaxing the zoom shrinks the amplification), which is why it is invisible whenever ≥8 racers force a wide shot and only bites on a lone breakaway at the tight zoom. **Conclusion: the away-drift is pure pan lag (contributor 2), not midpoint averaging.**

## STEP 1 — anchor rule
`_focusAnchorRacer(racers)` ([CameraDirector.js:1502](../../client/src/modules/camera/CameraDirector.js#L1502)) names the single racer the pan is anchored on, re-evaluated every frame: LEADER_ZOOM / LEAD_CHANGE → the current leader (max `t`); COMEBACK_ZOOM → the locked comeback racer; BATTLE / OVERVIEW → `null` (group shots have no single anchor). Because it is recomputed per frame, a P1 swap moves the anchor to the new leader automatically and the pan then lerps to it smoothly — the correct re-targeting is preserved. A second racer can still influence zoom; it can never pull the pan anchor.

## STEP 2 — lag containment
`_containAnchorInFrame(racers, canvasW, canvasH)` ([:1527](../../client/src/modules/camera/CameraDirector.js#L1527)) runs **after** the per-frame pan lerp in the follow path ([:923](../../client/src/modules/camera/CameraDirector.js#L923)). It is the hard guarantee — a mirror of the min-visible zoom floor, but for pan: it shifts `offsetX/Y` just enough to hold the anchor inside `[margin, canvas − margin]` (margin = `(1 − innerFramePct)/2 × canvas`) whenever the trailing lag would push it past that boundary, and leaves a centered anchor untouched. The smooth lerp keeps the *feel*; the clamp removes the *failure*.

## STEP 3 — the invariant
Five per-state tests in [CameraDirector.test.js](../../client/src/modules/camera/CameraDirector.test.js) (`CAMERA-FOCUS-1` describe): anchor = current leader for LEADER/LEAD_CHANGE (BATTLE → null); P2 falls back 3 L → anchor unchanged (no midpoint pull); leader sprints at the tight zoom → inside inner-70 **every frame** after entry (worst overshoot ≤ 1 px); P1 swap mid-hold → anchor re-targets to the new leader and it is in frame; COMEBACK hold → anchor is the locked comeback racer, not the leader. All pass.

## STEP 4 — dev HUD
`CameraStateHUD` gains a `▸ <anchor>` line (dev-only, gated by `showCameraStateHud`), fed by `CameraDirector.anchorRacerLabel` through RaceScreen state — the operator sees the state **and** which racer the pan is currently anchored on.

## VERIFY
- Fingerprint (shipped default, no flags): `ded0a126048e4cdb` — **IDENTICAL** to the shipped COMBO15 world. Presentation-only; sim path untouched.
- Suites: camera + RaceScreen 511 pass (incl. the 5 new invariant tests). ESLint clean on all four edited files. `npm run build` clean.

## Five sentences
1. The LEADER-family camera does anchor its pan on the current leader — the trace proves `rawPan == leaderX` every frame, so the midpoint-averaging suspect is falsified.
2. The away-drift is pure pan lag: the smooth pixel-lerp trails a fast leader and the tight LEADER zoom amplifies the trailing pixels past the inner frame (69/100 frames outside inner-70 at fast+tight, 0 at slow or relaxed zoom).
3. LEADER-MINVIS-1's zoom floor was masking the bug — it only bites on a lone breakaway where nothing forces a wide shot.
4. The fix keeps the trailing lerp for feel and adds a hard containment clamp — the pan mirror of the min-visible zoom floor — that holds the anchor inside inner-70 every frame (0/100 outside after fix).
5. Fingerprint is byte-identical (`ded0a126048e4cdb`), so the whole change is presentation-only and reversible.

## Proposals (≥2)
1. **Adaptive inner region by anchor speed.** The containment margin is currently a fixed `innerFramePct`. A faster anchor could earn a larger lead-space *ahead* of it (asymmetric inner region biased toward the motion direction) so the eye sees where the leader is going, not just where he is — still clamped, but framed for anticipation.
2. **Extend containment to BATTLE/COMEBACK group shots.** Today the clamp is anchor-only (null for BATTLE). A group-bounds containment (keep the whole focus cluster's bounding box inside the inner region, shrinking zoom if it can't) would give BATTLE the same "never lets the subject leave frame" guarantee, composing with LEADER-MINVIS-1's visible-count floor.
3. **Promote the invariant to a runtime dev assertion.** Behind `showCameraStateHud`, flag any frame where the anchor exits inner-70 (should now be impossible) — a live tripwire so a future pan-pipeline change can't silently reintroduce the drift.
