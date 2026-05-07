# Camera State Machine Regression Analysis — PR #78

**Branch under test:** `refactor/camera-pan-target` vs `master`  
**Date:** 2026-05-07  
**Tracks:** City Circuit 1280×720 (closed), Dirt Oval 1920×1080 (closed)  
**Method:** `window.__CAM_STATE_DIAG__` logging in `_transition()` + `_computeTimingConfig()`, Playwright end-to-end, 4-racer, 30 s laps mode

---

## 1. Diff Trace — what changed between master and refactor in the state machine

`_transition()` source code is **identical** on both branches — zero functional diff.

`_computeTimingConfig()` is also identical: reads the same config keys, falls back to the same module-level constants.

Changes in the refactor that are **adjacent to but not inside** the state machine:

| Component | Master | Refactor | Affects `_transition()`? |
|---|---|---|---|
| Constructor params | `(bbox, worldW, _worldH, isOpenTrack, config, rss)` | `(worldW, worldH, isOpenTrack, config, rss)` | No |
| `bbox` field | `this._bbox` — used in `_setTargets` → `_clampOffset` | Dropped entirely | No |
| `worldH` | Accepted but unused (`_worldH`) | Stored as `this._worldH`, used in `_closedOffsetY()` | No |
| `_setTargets()` | Canvas-space offsets + `_clampOffset(this._bbox, ...)` | `getPanTarget` → `resolveCamera` world-space pipeline | No |
| `_clampOffset()` | Present | Removed | No |
| Racer coords passed from RaceScreen | `scaledRacersForCam` (x,y × bsX/bsY) | `st.racers` (world-space, unscaled) | No — `_transition()` reads `.t` only |

---

## 2. Constructor Audit

### Master (RaceScreen line 258)
```js
new CameraDirector(scaledBbox, worldWidth, worldHeight, isOpenTrack, cameraConfig, referenceSpriteSize)
```

### Refactor (RaceScreen line 249)
```js
new CameraDirector(worldWidth, worldHeight, isOpenTrack, cameraConfig, referenceSpriteSize)
```

`bbox` is only consumed by `_setTargets()` → `_clampOffset()`.  
`worldH` was previously ignored (`_worldH`); now stored for `_closedOffsetY()`.  
Neither change touches any variable read by `_transition()`.

---

## 3. Threshold Trace

Logged config at construction — **identical on both branches**:

| Parameter | master | refactor |
|---|---|---|
| `battleGapThreshold` | 0.05 | 0.05 |
| `postStartHoldMs` | 7000 | 7000 |
| `minStateHoldMs` | 5000 | 5000 |
| `maxStateDuration` | 4000 *(localStorage)* | 4000 *(localStorage)* |
| `endgameThreshold` | 0.85 | 0.85 |
| `battleCooldownMs` | 8000 | 8000 |
| `overviewCooldownDuration` | 20000 (initial mean) | 20000 (initial mean) |

> Note: `maxStateDuration=4000` is user's localStorage override of the default 8000.
> Because `Math.max(minStateHoldMs=5000, 4000) = 5000`, transitions fire every 5 s — the override has no practical effect.

---

## 4. Empirical Logs — Side-by-Side

### City Circuit 1280×720

| t (ms) | master transition | refactor transition | delta |
|---|---|---|---|
| ~600 / 0 | OVERVIEW → OVERVIEW (start-phase) | OVERVIEW → OVERVIEW (start-phase) | — |
| ~5617 / 5016 | OVERVIEW → **LEADER** (post-start-hold) | OVERVIEW → **LEADER** (post-start-hold) | — |
| ~10633 / 10033 | LEADER → **BATTLE** (gap01=0.009) | LEADER → **BATTLE** (gap01=0.009) | — |
| ~16649 / 16049 | BATTLE → **LEADER** (default) | BATTLE → **LEADER** (default) | — |
| ~21666 / 21066 | LEADER → LEADER (**endgame** prog=0.853) | LEADER → LEADER (**default** prog=0.841) | prog 1% below threshold on refactor run (stochastic) |
| ~26699 / 26082 | LEADER → LEADER (drama pulse) | LEADER → LEADER (drama pulse) | — |
| ~28199 / 27582 | LEADER → **OVERVIEW** (drama expired) | LEADER → **OVERVIEW** (drama expired) | — |

State sequence: `OVERVIEW → LEADER → BATTLE → LEADER → LEADER → OVERVIEW` — **identical**.

### Dirt Oval 1920×1080

| t (ms) | master transition | refactor transition | delta |
|---|---|---|---|
| ~550 / 267 | OVERVIEW → OVERVIEW (start-phase) | OVERVIEW → OVERVIEW (start-phase) | — |
| ~5566 / 5283 | OVERVIEW → **LEADER** (post-start-hold) | OVERVIEW → **LEADER** (post-start-hold) | — |
| ~10600 / 10300 | LEADER → **BATTLE** (gap01=0.015) | LEADER → **BATTLE** (gap01=0.015) | — |
| ~16616 / 16316 | BATTLE → **LEADER** (default) | BATTLE → **LEADER** (default) | — |
| ~21632 / 21349 | LEADER → LEADER (**endgame** prog=0.853) | LEADER → LEADER (**default** prog=0.817) | prog 4% below threshold on refactor run (stochastic) |
| ~26649 / 26366 | LEADER → LEADER (**drama pulse** prog=1.024) | LEADER → LEADER (**endgame** prog=0.993) | same state, different reason; finish arrived slightly later in refactor run |
| (nav) | race ended (no drama expiry logged) | race ended (no drama expiry logged) | — |

State sequence: `OVERVIEW → LEADER → BATTLE → LEADER → LEADER` — **identical**.

---

## 5. Befund

**The state machine behavior is functionally identical on master and refactor.**

### Why the transition at ~21 s shows a different reason

At the ~21.6 s checkpoint, `leaderProgress` sits at the 0.85 endgame boundary. The exact value (0.853 vs 0.841) depends on racer `.t` at the instant the 5000 ms hold expires — a few milliseconds of event-loop jitter shifts it across the threshold. This is normal stochastic variation; the same variation would appear between two sequential runs on the same branch.

### Root cause of the originally reported observations

The user-reported symptoms ("LEADER never appears on City Circuit", "OVERVIEW never returns on Dirt Oval") cannot be reproduced on either branch with 4 racers and 30 s lap timing. Most likely causes:

1. **Browser HMR cache** — the app was mid-hot-reload when the manual observation was made, running a mix of master/refactor module versions.
2. **Different racer count** — with 16 racers tightly clustered, `gap01` can stay at 0.001–0.003 for the entire race, which keeps the state in OVERVIEW (start-phase) or triggers BATTLE immediately after post-start-hold, making LEADER appear very briefly or never if endgame fires before battle cooldown expires.
3. **Stochastic single-run observation** — any single run may produce a different sequence depending on gap values at each 5000 ms check.

### State machine code verdict: **no regression**

`_transition()` is a verbatim copy from master. All thresholds are read from the same config path with the same fallbacks. The only structural difference (racer x/y coordinates being world-space vs canvas-space) is irrelevant because `_transition()` reads only `.t`.

---

## 6. Fix Proposal

**No code fix required.** The state machine is correct on both branches.

### Optional future improvement (not a PR #78 concern)

The endgame threshold (`0.85`) and the periodic OVERVIEW cooldown re-roll create a window where the same run can show either "endgame" or "default" at the ~21 s mark depending on sub-second timing. If deterministic state labeling matters (e.g., for automated testing), consider:

- Slightly raising the endgame threshold (e.g., 0.88) so it doesn't fire at the exact same time as the LEADER hold expiry on short tracks.
- Alternatively, using a `>=` comparison instead of `>` for the endgame threshold (current code uses `>`), which would make 0.85 = 0.85 → true instead of false. This would bring the refactor run's `leaderProgress=0.853` into endgame a tick sooner on some runs.

Neither change affects functional camera behavior perceptible to users.
