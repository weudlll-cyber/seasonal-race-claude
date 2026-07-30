# CAMERA-FOCUS-3 — kill the hard transition jumps (pick ONE grammar)

Base `origin/master @ffc6c36` · presentation-only · fingerprint **`ded0a126048e4cdb` IDENTICAL** (re-minted on the committed state). Follows the FOCUS-2 bisect verdict: no revert; the transition cuts are the remaining, oldest camera defect. All measurements are the `searound` seed-5601 replay (20 racers, LEADER zoom 3 — the owner's tested setting), with `Math.random` seeded so the state machine is deterministic (the camera uses scheduling jitter — see note).

## The defect (FOCUS-2, re-confirmed)
Transitions were an inconsistent **hybrid**: LEAD_CHANGE and →OVERVIEW hard-snapped pan+zoom, while OVERVIEW→LEADER / BATTLE **glided** — the zoom ramped 2.4→7.2 over ~97 frames (~1.6 s) while the pan travelled, so the leader rode in a corner during the ~1.6 s acquisition (the phase the owner photographed).

## STEP 1 — grammar chosen: (A) TRUE CUT
**On every anchored/active state entry, pan AND zoom snap together to the new subject's correct framing on frame 1 — zero acquisition.** Why (A) over (B) FULL GLIDE:
1. The big transitions ALREADY snap (LEAD_CHANGE, →OVERVIEW) and land framed — (A) makes the grammar *consistent* with the smallest change (generalize the existing LEAD_CHANGE hard-cut to LEADER/BATTLE/COMEBACK).
2. It removes the ~1.6 s acquisition *entirely* — frame 1 is correct — which is precisely the corner-riding the owner reported.
3. Racing broadcast convention is hard cuts between correctly-framed shots; a crane-glide between every state (B) would slow the fast LEAD_CHANGE/OVERVIEW cuts and read as sluggish.
4. It is the most testable (frame-1-centred is a crisp invariant).

Implementation: `cameraTransitionGrammar` config (`'cut'` shipped in `DEFAULT_CAMERA_CONFIG`; constructor fallback `'legacy'` so bare-config callers and the 365 existing entry-glide tests are unchanged). On entry the cut sets `_lerpPhase='tracking'`, `_cutSnapPending` (pan+zoom snap after `_setTargets`), and `_observerPhase='follow'` so the follow tracker frames the live subject from frame 1 (without this the observer stayed `idle` and anchored states panned the track centreline forever). The finish-mode OVERVIEW zoom-out is exempt (a mandatory dramatic glide — STEP 2).

## STEP 2 — anti-flapping
Already present: per-state `minStateHold` (LEADER 5 s, etc.), mandatory-state exemptions intact. The replay shows transitions every **3–8 s** — no sub-second flapping cluster to fix; the FOCUS-2 "3 cuts" were spread over ~20 s. No new machinery; the existing hold is respected by the cut.

## STEP 3 — v5 centering + the owner's forward-framing
The owner's design (confirmed this session): **the leader sits FORWARD in frame with the pack behind him — that is where the action is; "in front of him there's no action" — but not too near the edge.** New `leaderForwardFrac` (0.5 = centre; shipped **0.66** = leader at ~2/3 along the motion axis, safe margin to the leading edge). The pan target is shifted backward along the leader's track tangent so the leader lands forward; UI-configurable.

Replay (seeded, deterministic), grammar cut:

| leaderForwardFrac | avg leader screen-X | cuts framed frame-1 | **X clamp** | Y clamp |
|---|---|---|---|---|
| off (centre) | 0.512 | 6/6 | **2 / 5270** | 2364 |
| 0.66 (shipped) | 0.550 | 6/6 | **3 / 5270** | 2342 |
| 0.72 | 0.565 | 6/6 | 3 | 2336 |
| 0.78 | 0.579 | 6/6 | 3 | 2327 |
| *legacy (contrast)* | 0.510 | **5/6** | — | — (40.3% total) |

**The motion-axis (X) containment clamp is now idle (2–3 frames of 5270) — the follow tracker frames the leader itself; the clamp is the emergency rail on X, as STEP 3 requires.** The forward bias works monotonically. Every cut lands correctly framed (6/6 vs legacy 5/6), and the acquisition glide is gone.

### Honest residual — the Y axis
The **Y clamp still fires ~44 % (2342/5270)** on this track. Cause (per-axis diagnostic): `searound` is a *tall* loop (worldH 2048) and at LEADER zoom 3 the viewport is only ~285 world-px tall, so near the loop's top/bottom the camera cannot Y-centre the leader without showing black — `resolveCamera` clamps to the world edge and the containment rail then holds the leader in inner-70. This is a **world-edge-vs-centring tension, independent of the grammar** (it was equally present in legacy). "Clamp ~0 in steady state" is therefore met on the motion axis but **not** on the vertical axis of a tall loop at a tight zoom. Named fix below.

## STEP 4 — tests
5 tests in `CameraDirector.test.js` (`CAMERA-FOCUS-3`): grammar flag wiring (cut only when asked; DEFAULT ships cut); `leaderForwardFrac` validation (accept (0.5, 0.8]); `_applyLeaderForwardBias` shifts the target backward along the tangent by `(frac−0.5)·frameW/effZoom` (and is inert when disabled); clamp diagnostics start at 0; and the STEP-3 forward-framing invariant — the leader sits forward of centre in a steady LEADER hold with the X clamp idle. Full suites green: **944** camera + config + RaceScreen + DevScreen tests, 365 legacy camera tests unchanged.

## Five sentences
1. The transition hybrid is dead: grammar (A) TRUE CUT snaps pan+zoom together on every anchored entry, so the ~1.6 s corner-riding acquisition is gone and all 6 cuts land correctly framed on frame 1 (vs 5/6 legacy).
2. Fixing the observer-phase promotion made the follow tracker frame the leader itself, dropping the motion-axis containment clamp to ~2 frames of 5270 — the rail is now emergency-only on X, as STEP 3 asks.
3. The leader is framed forward (owner's design — pack behind is the action), tunable via `leaderForwardFrac` (shipped 0.66), with a safe margin to the leading edge.
4. The honest residual is the Y axis: on the tall searound loop at LEADER zoom 3 the viewport can't vertically centre the leader near the loop's top/bottom without showing black, so the clamp stays Y-load-bearing (~44 %) — a world-edge tension independent of the grammar.
5. Fingerprint is byte-identical (`ded0a126048e4cdb`); the whole change is presentation-only, UI-configurable, and reversible via `cameraTransitionGrammar: 'legacy'`.

## Proposals (≥2)
1. **CAMERA-FOCUS-4 — the Y-axis fix (name the mechanism).** Couple the LEADER zoom to world-Y-edge proximity: when centring the leader would clamp to the world's top/bottom, relax the zoom (widen the viewport) until the leader fits inside inner-70 without black — the vertical analogue of the min-visible floor. That would take the Y clamp toward idle on tall loops and finish STEP 3's "clamp ~0" on both axes.
2. **Fallback grammar (B) FULL GLIDE — the one-line switch if the eye dislikes cuts.** If the owner finds the hard cuts too abrupt on seed 5601, implement (B): pan+zoom ease together over a bounded 400–700 ms from the old framing to the new subject's framing (anchor centred by glide end). It reuses the same `_setTargets` targets; only the entry application changes from snap to a bounded ease. The grammar flag already partitions the code path.
3. **Expose `leaderForwardFrac` + `cameraTransitionGrammar` in the Dev camera panel.** Both are shipped config fields; surfacing them lets the owner dial the forward framing and A/B the grammar live without a rebuild (project principle: everything UI-configurable).

## Owner's eye
Per the spec, the owner's eye on seed 5601 decides whether grammar (A) feels right; grammar (B) FULL GLIDE is the named one-line fallback. Dev server restarted for the eye-test.

> Note: the camera uses `Math.random` for OVERVIEW scheduling jitter (CameraDirector.js:523) and weighted state picks (:496), so the live camera is intentionally non-deterministic; all replay numbers here seed the RNG to isolate the code effect.
