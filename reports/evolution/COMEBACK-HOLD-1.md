# COMEBACK-HOLD-1 — the comeback shot: at least 8 s, then only while the racer is still gaining, at most 15 s

**2026-10-02, branch `ship/owner-cosmetic-defaults` (not merged, not minted).** Built on the
measurement [COMEBACK-HOLD-MEASURE-1](COMEBACK-HOLD-MEASURE-1.md).

**The owner's decision, 2026-10-02:** the comeback shot holds at least 8 s; after that it stays while
the comeback racer is still gaining places; hard maximum 15 s.

## What was built

| | where |
| --- | --- |
| **minimum** — unchanged, `comebackMinDuration` 8 s | `defaults.js` |
| **maximum 15 s** — the EXISTING COMEBACK_ZOOM profile key `maxStateDuration`, 8000 → 15000 | `defaults.js`, COMEBACK_ZOOM profile |
| **the one new condition** — after the minimum, the shot ends when the racer has gained NO place within the last W ms; W is the new key `comebackGainStopMs` (no Dev Screen control, by decision); 0 switches it off | flag computed in `CameraDirector.update` beside the hold gate; decided in `transitionDecision.js` as the new reason `comeback-gain-stopped` |
| **"still gaining"** — a pure read of the comeback detector's EXISTING rank history (`recordRanks`), net places over the window. No second tracker | `comebackDetector.js`, new method `gainedWithin` |
| **W** reaches the director through the one door every timing key uses | `cameraTimingComputation.js` |
| **the repeat path cannot extend the shot** — a running COMEBACK_ZOOM is no longer offered by `_pickNextState` | `CameraDirector.js`, the comeback candidate guard |

★ **What the repeat guard is actually for, found while testing it.** `_transition` stamps the comeback
exit time BEFORE it picks the next state, so with any comeback cooldown above 0 (the shipped
`comebackCooldownMs` is 10000) the cooldown alone already refuses an immediate re-pick. The guard is
what holds when the Dev Screen sets the cooldown to 0; the test that proves it sets exactly that.

**Reused, not rebuilt:** the detector's rank history and `earliestAtOrAfter`; `decideTransition` and
its reason vocabulary; `computeTimingFromConfig`; the per-state `maxStateDuration` key;
`scripts/diag/comeback-hold-measure.mjs` (extended with `--gain-stop-ms=` on a copy of the config and
a per-shot "gained again within 3 s" flag).

## Choosing W — measured, N=30 races per arm

The same 30 races as COMEBACK-HOLD-MEASURE-1: 10 shipped tracks × Quick-Test seeds 1–3, 20 racers,
this branch's config with only W changed. **Rule (from the brief): the W with the fewest shots that
end and then see the racer gain again within 3 s; a tie goes to the smaller W.**

| W | shots | length median / p90 / max | ended by gain-stop / 15 s cap / finish sequence | ended, then gained again within 3 s |
| --- | --- | --- | --- | --- |
| **2000 ms** | 10 | 8.00 / 9.58 / 10.08 s | 10 / 0 / 0 | **1** |
| 3000 ms | 10 | 8.24 / 10.48 / 10.58 s | 10 / 0 / 0 | 3 |
| 4000 ms | 10 | 8.78 / 10.57 / 11.58 s | 10 / 0 / 0 | 2 |

**W = 2000 ms**, shipped as `comebackGainStopMs`. **No shot reached the 15 s maximum in any arm**:
the racers do go on gaining (COMEBACK-HOLD-MEASURE-1: 6 of 10, up to 13.9 s after an 8 s cut), but
in steps further apart than W, so the gain test ends the shot first. With W = 2000, 3 of the 10 shots
ran past 8 s (8.55, 9.58 and 10.08 s).

## The Quick-Test seed to look at

**River Run, Quick-Test seed 3**: confirmed in a real browser (production build of this branch, the
camera-state HUD traced exactly as `client/e2e/comeback-precedence.spec.js` does). The comeback shot
**starts 57.6 s after the race screen opens and holds 8.6 s**, ending 23.8 s before the winner card
(headless: 10.08 s). Searound seed 1, the other headless candidate (9.58 s), produced no comeback shot
in the browser run — the same frame-timing variation the spec's header documents.

## Tests

`client/src/modules/camera/comebackHold.test.js`, new, 12 tests. Every bound is READ from `defaults.js`:
the detector's net-gain read (4); the decision's new reason (2); and the director end to end — never
below the minimum, ends on gain-stop at the minimum, stays while gaining, never above the maximum even
when offered again, W = 0 switches it off (6).

| sabotage | went red |
| --- | --- |
| the repeat guard removed | "NEVER ABOVE the maximum…" and "ENDS ON GAIN-STOP…" |
| the minimum ignored in the gain-stop flag | "NEVER BELOW the minimum…" |
| `gainedWithin` always true | the two "false when…" detector tests |
| the maximum back to 8000 | 4 tests, including the bounds test and "STAYS while he is still gaining" |

The first attempt at the guard sabotage broke the file's syntax and reported "no tests" — not counted;
redone so that only the guard's condition was removed. **No existing test pinned the old 8 s
maximum**: the camera suite (1014) passed unchanged. Full client suite: **4962 passed, 0 failed**
(a first run under load from parallel work reported 4 timeouts in unrelated files; the re-run passed
all, so they are recorded as load, not proven).

## Fingerprints — not minted

`node scripts/engine-reach.mjs --check` with the changed paths: defaults.js and the camera files can
reach the race, so all roles were verified (`node scripts/check-fingerprints.mjs --mint`, which writes
nothing). **World: unchanged.** **Camera and render: identical to this branch's previous values**
(`f79cdf8c03418c5f`, `87eb0a87809a3f59`) — i.e. still moved against the record by
SHIP-OWNER-COSMETIC-1 and not further by this piece: the fingerprint's races contain no comeback shot
whose length these rules change, the same as the 8 s change before it.

## Files, lines before → after

| file | before | after |
| --- | --- | --- |
| `client/src/modules/storage/defaults.js` | 1627 | 1637 |
| `client/src/modules/camera/CameraDirector.js` | 5507 | 5526 |
| `client/src/modules/camera/comebackDetector.js` | 264 | 285 |
| `client/src/modules/camera/transitionDecision.js` | 133 | 143 |
| `client/src/modules/camera/cameraTimingComputation.js` | 485 | 489 |
| `client/src/modules/camera/comebackHold.test.js` | new | 159 |
| `scripts/diag/comeback-hold-measure.mjs` | 188 | 201 |

## Noticed and left

- The camera fingerprint cannot see either comeback change (8 s minimum, this rule). A fingerprint
  that never contains a comeback shot cannot protect its length; a recorded race with one would.
- `comebackMinDuration` reaches the director only when the config CARRIES the key
  (`cameraTimingComputation.js`, the `!= null` test); a director built with no config uses the
  profile's own `minStateHold` (5000). The browser always carries it.
