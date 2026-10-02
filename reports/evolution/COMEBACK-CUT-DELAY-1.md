# COMEBACK-CUT-DELAY-1 — the camera waits before it cuts to the comeback racer

**2026-10-02, branch `ship/owner-cosmetic-defaults` (on `e161fdba`). Not minted, not merged.**
Builds on [COMEBACK-HOLD-2](COMEBACK-HOLD-2.md). The races are the 750 of
[COMEBACK-DURATION-1](COMEBACK-DURATION-1.md).

**The owner's decision, 2026-10-02.** When the camera would cut to the comeback racer, it waits 1–2 s
first, so that he is already visibly on the catch-up when the comeback shot starts.

**Implemented: 1500 ms**, in the new key `comebackCutDelayMs` in
`client/src/modules/storage/defaults.js:400`, with no Dev Screen control. 2000 ms was built and
measured first. It lost more than 10% of comeback shots in every field size, so the decision rule
moved the default to 1500. **1500 ms still loses more than 10% in three field sizes**: closed 20,
open 20 and open 40 (tables below). The rule names no step after 1500, so 1500 stands, and the
choice goes back to the owner.

## How it works

| | where |
| --- | --- |
| **Trigger, precedence route** (the cast comebacker's first shot, which interrupts a running hold). The offer no longer cuts on its frame; it starts the wait. The precedence becomes pending only once the delay has passed and the offer still names the same racer on that frame. | `client/src/modules/camera/CameraDirector.js:1042` |
| **Trigger, weighted route** (taken when a hold ends). An accepted comeback offer starts the wait and returns "no change". | `CameraDirector.js:1949` |
| **Matured on the weighted route.** The waited cut is taken for him without a second draw. | `CameraDirector.js:1905` |
| **During the wait the camera keeps its shot.** The candidate pool returns `null` (`_transition`'s existing "no change", `CameraDirector.js:1995`). So nothing in the pool can take the slot and drop the comeback: a lead change, an overview or another comebacker. A lead change confirmed during the wait still interrupts the hold, but the pick returns "no change" and the lead change stays pending until after the comeback cut. | `CameraDirector.js:1839` |
| **The final scene during the wait: no shot.** The waiting cut is dropped on the frame the final scene becomes due (the endgame, the photo-finish gate, or the first racer home, as in COMEBACK-HOLD-2). The finish sequence, the start window and the endgame also return above the pool, so the final scene is never held back by the wait. | `CameraDirector.js:1096` |
| **No longer offered when the wait ends: no shot.** A wait that matures without its racer is dropped, never left waiting. | `CameraDirector.js:1056` (precedence), `:1926` (weighted) |
| **Per race.** A waiting cut is cleared with the roster. | `CameraDirector.js:806` |

**Unchanged after the cut:** the shot runs until he reaches 3rd, at least 8 s, at most 20 s, never into the final scene, and is never re-picked.

## Measured — 750 races per arm

Instrument: `scripts/diag/comeback-hold-measure.mjs`, armed with `--set=comebackCutDelayMs=<ms>`. It
records each wait and how it ended:
- **cut** — the shot started on him;
- **final scene** — dropped while the final scene was due;
- **not offered** — dropped any other way;
- **race end**.

Per shot it records:
- places gained during the wait;
- his speed at the cut: his track distance over the last 1 s, divided by the median of the unfinished field's.

The world is identical in all three arms: the finishes of all 750 races match the 0 arm, race for race.

| field | delay (ms) | races | comeback shots | lost vs 0 | waits dropped: final scene / not offered / race end | length median / p90 / max (s) | ended by 3rd / 20 s / final scene / other | final-scene overlap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| closed, 20 | 0 | 150 | 98 | - | - | 10.52 / 20.00 / 20.00 | 74 / 15 / 9 / 0 | **0** |
| closed, 20 | 1500 | 150 | 58 | 40 (40.8%) | 0 / 79 / 0 | 9.66 / 20.00 / 20.00 | 44 / 6 / 8 / 0 | **0** |
| closed, 20 | 2000 | 150 | 50 | 48 (49.0%) | 0 / 84 / 0 | 9.02 / 19.33 / 20.00 | 37 / 4 / 9 / 0 | **0** |
| closed, 40 | 0 | 150 | 111 | - | - | 14.70 / 20.00 / 20.00 | 65 / 26 / 20 / 0 | **0** |
| closed, 40 | 1500 | 150 | 102 | 9 (8.1%) | 0 / 41 / 0 | 11.78 / 20.00 / 20.00 | 61 / 14 / 27 / 0 | **0** |
| closed, 40 | 2000 | 150 | 97 | 14 (12.6%) | 0 / 45 / 0 | 11.48 / 19.90 / 20.00 | 59 / 9 / 29 / 0 | **0** |
| open, 20 | 0 | 150 | 97 | - | - | 8.18 / 17.40 / 20.00 | 81 / 2 / 14 / 0 | **0** |
| open, 20 | 1500 | 150 | 60 | 37 (38.1%) | 0 / 70 / 0 | 8.19 / 14.73 / 20.00 | 47 / 1 / 12 / 0 | **0** |
| open, 20 | 2000 | 150 | 53 | 44 (45.4%) | 0 / 82 / 0 | 8.02 / 14.23 / 18.62 | 41 / 0 / 12 / 0 | **0** |
| open, 40 | 0 | 150 | 97 | - | - | 11.00 / 18.38 / 20.00 | 79 / 2 / 16 / 0 | **0** |
| open, 40 | 1500 | 150 | 87 | 10 (10.3%) | 0 / 29 / 0 | 9.10 / 15.40 / 18.22 | 68 / 0 / 19 / 0 | **0** |
| open, 40 | 2000 | 150 | 80 | 17 (17.5%) | 0 / 43 / 0 | 8.41 / 15.62 / 17.72 | 61 / 0 / 19 / 0 | **0** |
| open, 80 | 0 | 150 | 60 | - | - | 13.07 / 18.08 / 20.00 | 40 / 2 / 18 / 0 | **0** |
| open, 80 | 1500 | 150 | 57 | 3 (5.0%) | 0 / 12 / 0 | 11.08 / 16.57 / 18.90 | 39 / 0 / 18 / 0 | **0** |
| open, 80 | 2000 | 150 | 53 | 7 (11.7%) | 0 / 15 / 0 | 10.72 / 16.07 / 18.40 | 35 / 0 / 18 / 0 | **0** |

"Lost vs 0" is the net loss in comeback shots over the same 750 races. A racer whose first wait is
dropped can still get a later one that is cut, so there are more dropped waits than lost shots.

| field | delay (ms) | shots | speed vs field median at the cut: median (p10–p90) | share faster than the median | gained ≥ 1 place during the wait | places gained, median |
| --- | --- | --- | --- | --- | --- | --- |
| closed, 20 | 0 | 98 | 1.06 (0.97–1.16) | 79% | n/a (no wait) | - |
| closed, 20 | 1500 | 58 | 1.00 (0.90–1.16) | 52% | 34 of 58 | 1.0 |
| closed, 20 | 2000 | 50 | 1.00 (0.93–1.12) | 48% | 29 of 50 | 1.0 |
| closed, 40 | 0 | 111 | 1.04 (0.97–1.15) | 69% | n/a (no wait) | - |
| closed, 40 | 1500 | 102 | 1.04 (0.92–1.19) | 65% | 68 of 102 | 1.0 |
| closed, 40 | 2000 | 97 | 1.03 (0.91–1.21) | 64% | 75 of 97 | 1.0 |
| open, 20 | 0 | 97 | 1.05 (0.95–1.15) | 76% | n/a (no wait) | - |
| open, 20 | 1500 | 60 | 1.02 (0.91–1.13) | 58% | 36 of 60 | 1.0 |
| open, 20 | 2000 | 53 | 1.01 (0.92–1.12) | 55% | 34 of 53 | 1.0 |
| open, 40 | 0 | 97 | 1.05 (0.97–1.15) | 81% | n/a (no wait) | - |
| open, 40 | 1500 | 87 | 1.02 (0.92–1.16) | 60% | 60 of 87 | 1.0 |
| open, 40 | 2000 | 80 | 1.02 (0.89–1.18) | 58% | 60 of 80 | 1.5 |
| open, 80 | 0 | 60 | 1.05 (0.97–1.15) | 78% | n/a (no wait) | - |
| open, 80 | 1500 | 57 | 1.05 (0.97–1.19) | 77% | 47 of 57 | 4.0 |
| open, 80 | 2000 | 53 | 1.03 (0.94–1.17) | 70% | 46 of 53 | 4.0 |

**Reading it:**
- **No shot was lost to the final scene**: 0 of 595 waits at 1500 ms, and 0 of 602 at 2000 ms. **Final-scene overlap is 0** in every arm.
- **Every lost shot was lost because he was no longer being offered when the wait ended.** The waiting cut requires the detector to still offer him on that frame. The gate that stops passing is its "gained enough places within the window" gate. Read on two closed-20 races (city-circuit, seeds 891 and 7207), the racer held 7th through the whole wait: the climb that triggered the offer had already stopped. The losses grow as the field shrinks, because a 20-racer field has fewer places to take in the window.
- **Speed at the cut.** The racer is not faster at the cut with the wait than without it. The median ratio is 1.00–1.05 with the wait, against 1.04–1.06 with an immediate cut, and the share faster than the median falls in four field sizes. **Places gained during the wait:** with the wait, about 60% of 20-racer shots and about 80% of 80-racer shots had already gained at least one place when the cut came.
- **The cost of the rule as written:** at 1500 ms, 99 of 463 comeback shots are lost over the 750 races, most of them on 20-racer fields.

## The Quick-Test seed

**Ice Track, 40 racers, Quick-Test seed 4896** (headless; a browser run can place it a frame or two differently):

| delay | wait opens | shot starts | rank at wait / at cut / at end | shot length | ended by |
| --- | --- | --- | --- | --- | --- |
| 0 | - | 47.4 s | - / 19th / 3rd | 14.7 s | reaching 3rd |
| **1500** | 47.4 s | **48.9 s** | 19th / **17th** / 3rd | 13.2 s | reaching 3rd |
| 2000 | 47.4 s | 49.4 s | 19th / 17th / 3rd | 12.7 s | reaching 3rd |

At 1500 ms he gains two places during the wait.

## Tests

`client/src/modules/camera/comebackCutDelay.test.js`, 9 tests, with the delay read from `defaults.js`:
- no cut before the delay, and a cut after it, on both routes;
- no shot when he is no longer climbing when the wait ends;
- no shot when the endgame, or the first racer home, comes during the wait;
- a lead change confirmed during the wait does not take the slot;
- with the delay at 0, the cut comes at once (the control).

| sabotage | went red |
| --- | --- |
| weighted route cuts at once (the wait not started) | "NO CUT BEFORE THE DELAY, CUT AFTER IT" (weighted), "the FIRST RACER HOME…" |
| a matured cut is never taken | "CUT AFTER THE DELAY", "a LEAD CHANGE…" |
| the final-scene drop removed | "the ENDGAME arriving…", "the FIRST RACER HOME…" |
| the pool not held during the wait | "NO CUT BEFORE THE DELAY, CUT AFTER IT" (weighted), "a LEAD CHANGE…" |
| a matured wait without its racer not dropped | "NO SHOT IF HE IS NO LONGER CLIMBING…" |
| precedence matures at once | **stayed green alone** — the pool also holds it (`:1839`); together with the pool sabotage, 6 of 9 went red |

**Existing tests:** two test configs that expect the cut on the frame the comeback becomes due now set `comebackCutDelayMs: 0`, each with a comment. These are `ALWAYS_TAKE` in `CameraDirector.test.js` and in `comebackPrecedence.test.js`; they test the gate, not the wait. COMEBACK-HOLD-2's guarantees (`comebackHold.test.js`) hold unchanged.

Camera suite **1035** (was 1026); client suite **4971** (was 4962).

## Fingerprints — not minted

`node scripts/engine-reach.mjs --check`: `CameraDirector.js`, `cameraTimingComputation.js` and `defaults.js` can reach the race. `check-fingerprints.mjs --mint` (which writes nothing), at 1500 ms:
- **World and world-off: unchanged.**
- **Camera and render: identical to this branch's previous values.** Camera `f79cdf8c03418c5f` → `f79cdf8c03418c5f`; render `87eb0a87809a3f59` → `87eb0a87809a3f59`. The record is still `be48503a324429cb` / `90344c0f0361cbf1`. The pinned races contain no comeback shot.

The two MEASURED stamps (tracking-lag, straggler-truth) were re-measured and are identical to the digit.

## Files, lines before → after

| file | before | after |
| --- | --- | --- |
| `client/src/modules/camera/CameraDirector.js` | 5545 | 5609 |
| `client/src/modules/storage/defaults.js` | 1636 | 1642 |
| `client/src/modules/camera/cameraTimingComputation.js` | 488 | 491 |
| `client/src/modules/camera/comebackCutDelay.test.js` | new | 172 |
| `client/src/modules/camera/CameraDirector.test.js` | 8233 | 8236 |
| `client/src/modules/camera/comebackPrecedence.test.js` | 305 | 308 |
| `scripts/diag/comeback-hold-measure.mjs` | 404 | 454 |
| `docs/FORCE-MAP.md` | two citation line numbers (shifted by the new key) | |
| `docs/CAMERA_DIRECTOR.md`, `docs/ENDING-PHASES.md` | stamp + one dated note each | |

## Noticed and left

- **The loss comes from what "still the comeback racer" means.** The cut now requires the detector to still offer him when the wait ends. Requiring only that he is still the cast comebacker, still eligible and the final scene not due would keep most of the lost shots, but it would also cut to racers whose climb stopped during the wait. That is the owner's choice.
- **During the wait, `_transition` runs each frame and returns "no change".** For an OVERVIEW or LEAD_CHANGE on screen, it stamps that state's exit time on every frame of the wait (`CameraDirector.js`, the cooldown stamps just above `:1995`). That state's cooldown therefore counts from its real exit, at the end of the wait.
- **The speed measure uses a 1 s window.** A shorter window would be noisier; a longer one would reach back before the wait.
- **The camera fingerprint still cannot see a comeback rule.** A pinned race with a comeback shot would let it.
- **`refactor/camera-director-split`** predates COMEBACK-HOLD-2 and this piece, and must take both before it merges.
