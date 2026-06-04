# OVERVIEW Normalization for Closed Tracks — Implementation Report

**Branch:** `feat/closed-track-overview-normalization`
**Commit:** `c7fa30a`
**Date:** 2026-06-04
**Builds on:** `reports/closed-track-overview/00-investigation.md`

---

## What Changed

### 1. `client/src/modules/camera/CameraDirector.js`

**`_transition()` OVERVIEW snap block** (formerly L1106–1120)

- **Before:** `if (this._isOpenTrack && this._referenceSpriteSize > 0)` — normalization was open-track only; closed tracks fell into the `else` branch and got `snapZoom = _overviewStateZoom × _overviewClosedTrackZoom` (static ×1.3).
- **After:** `if (this._referenceSpriteSize > 0)` — applies to both open and closed tracks.
  - `divisor = isOpenTrack ? OPEN_TRACK_BASE_ZOOM : this._bsX`
  - `raw = overviewTargetScreenPx / (referenceSpriteSize × divisor)` — same formula for both
  - **Open ceiling:** `Math.min(MAX_INVERSE_ZOOM, _overviewStateZoom × 0.8)` — unchanged
  - **Closed ceiling:** `MAX_INVERSE_ZOOM` only — `resolveCamera` handles world-edge clamping
  - **Open floor:** `this.overviewZoom` — unchanged
  - **Closed floor:** `1.0` (cam.zoom=1 means `effZoom=bsX`, showing the full world)
  - `_overviewSnapZoom` is now stored for closed tracks too
- **Fallback** (no `referenceSpriteSize`): `snapZoom = _overviewStateZoom` for both track types (was `_overviewStateZoom × 1.3` for closed)

**`_setTargets()` OVERVIEW case** (formerly L1617–1691, 3 sites)

- **Before:** `const _ovOpenZoom = isOpenTrack ? (_overviewSnapZoom ?? _overviewStateZoom) : _overviewStateZoom`
- **After:** `const _ovSnapZoom = this._overviewSnapZoom ?? this._overviewStateZoom`
- All 3 closed-track `_setClosedTrackTargets` calls changed from:
  `this._overviewStateZoom * this._bsX * this._overviewClosedTrackZoom`
  to:
  `_ovSnapZoom * this._bsX`
- All 3 open-track `_setOpenTrackTargets` calls updated to use `_ovSnapZoom` (same value, renamed)

**`_computeTimingConfig()`** (L425 removed)

- Removed: `this._overviewClosedTrackZoom = t.overviewClosedTrackZoom;`
- `_overviewClosedTrackZoom` is no longer an instance field — no code reads it.

**Net diff:** ~15 lines changed, 0 new abstractions, pure reuse of existing open-track formula.

---

### 2. `client/src/modules/camera/cameraTimingComputation.js`

- Removed `const overviewClosedTrackZoom = config?.overviewClosedTrackZoom ?? 1.3;` from computation
- Removed `overviewClosedTrackZoom` from the return object
- Added a comment explaining the retirement and why the field is kept in `defaults.js`

---

### 3. `client/src/modules/storage/defaults.js`

**Retirement decision: deprecated-in-place (not removed)**

`overviewClosedTrackZoom: 1.3` is kept in the schema with a deprecation comment:
```js
overviewClosedTrackZoom: 1.3, // @deprecated 2026-06-04 — retired; kept in schema v15 for migration compatibility only; not read at runtime
```

**Rationale:** Removing the field from `defaults.js` would require a schema v16 migration, which is unnecessary scope creep. The field persists in stored JSON configs but is silently ignored by the runtime. The `migrateV14toV15` function in `cameraConfig.js` continues to inject it into migrated configs (harmless). The field is clearly marked deprecated with the retirement date.

---

## `overviewClosedTrackZoom` Retirement Summary

| Location | Action | Reason |
|----------|--------|--------|
| `cameraTimingComputation.js:74` | **Removed** — not computed | Not needed; formula replaces it |
| `cameraTimingComputation.js` return | **Removed** | No callers expect it |
| `CameraDirector._computeTimingConfig()` | **Removed** assignment | Field gone from timing return |
| `CameraDirector._setTargets()` (3 sites) | **Replaced** by `_ovSnapZoom × bsX` | Core behavior change |
| `CameraDirector._transition()` | **Replaced** in else branch | Closed-track fallback simplified |
| `defaults.js:347` | **Deprecated-in-place** | Migration compat (schema v15) |
| `cameraConfig.js` (migrateV14toV15) | **Unchanged** | Injecting the deprecated field is harmless |

---

## Per-Track: Before vs. After

Computed at 40 racers, `displaySizeScale = 0.65`, `displaySize = 47px` (horse), `overviewTargetScreenPx = 28`:
`referenceSpriteSize = 47 × 0.65 = 30.55px`

| Track | worldW | bsX | BEFORE effZoom | BEFORE screen px | AFTER snapZoom (cam) | AFTER effZoom | AFTER screen px |
|-------|--------|-----|----------------|-----------------|---------------------|--------------|----------------|
| Dirt Oval | 1536 | 0.833 | 1.300 | 39.7 px | 1.099 | **0.916** | **28.0 px** |
| Garden Path | 1536 | 0.833 | 1.300 | ≈varies¹ | 1.099 × … | **0.916** | **28.0 px** |
| City Circuit | 1536 | 0.833 | 1.300 | ≈varies¹ | formula | **0.916** | **28.0 px** |
| Ice Track | 1536 | 0.833 | 1.300 | ≈varies¹ | formula | **0.916** | **28.0 px** |
| Searound | 3072 | 0.417 | 1.300 | ≈varies¹ | 1.845 | **0.916²** | **~28 px** |

¹ Old screen size varied because `referenceSpriteSize` (racer-count-dependent) was not in the formula — it was multiplied by `effZoom=1.3` directly.
² Searound: `snapZoom = 28/(30.55 × 0.417) = 28/12.74 = 2.198`. `effZoom = 2.198 × 0.417 = 0.916`. ✓ Consistent.

**All 5 closed tracks now converge to the same `effZoom ≈ 28/referenceSpriteSize ≈ 0.916`** at 40 racers. The formula is exact regardless of world size.

Open track at same racer count: `snapZoom = 28/(30.55×1.5) = 0.610`, floored to `overviewZoom`. For dirt oval (worldW=1280): `overviewZoom = 1.0`, `effZoom = 1.5`, screen = 45.9px. The normalization formula was floor-clamped (raw=0.61 < floor=1.0), so open tracks with standard racer counts show larger sprites. This is the existing behavior — unchanged by this PR. The spec's goal was to normalize across closed tracks, not to equalize open vs. closed.

---

## Pan-Clipping Check

The investigation flagged that lower `effZoom` (~0.916) on 1536-wide closed tracks leaves less room for the 150px radial pan offset.

**Analysis:**

On a 1536-wide closed track with `effZoom = 0.916`:
- Visible world width = `canvasW / effZoom = 1280 / 0.916 ≈ 1397 px`
- Track world width = 1536 px
- Pan room (each direction) = `(1536 − 1397) / 2 ≈ 69.5 px`
- `overviewOffsetPx = 150 px > 69.5 px` → **offset is clipped**

`resolveCamera` will clamp the camera to world bounds when the 150px offset pushes it outside. The effective pan offset will be approximately **69px** (about 46% of the configured value) on 1536-wide tracks when the leader is near the track center.

**On Searound (worldW=3072, same effZoom):**
- Visible world width = `1280 / 0.916 ≈ 1397 px`
- Pan room = `(3072 − 1397) / 2 ≈ 838 px >> 150 px` → **no clipping**

**What it looks like:**
- 1536-wide closed tracks: OVERVIEW camera is centered close to the leader with a reduced radial pull toward the field. The full 150px offset only applies when the leader is near the center of the track (ample pan room in that direction).
- Searound: normal 150px offset, unaffected.

**Options:**
1. **Accept it** (current implementation) — the offset simply clips at world boundaries; this is handled gracefully by `resolveCamera`. Pan behavior is slightly reduced on narrow closed tracks. The racer size normalization (primary goal) is unaffected.
2. **Proportionally scale `overviewOffsetPx` by effZoom** — e.g., `offset × effZoom`. On 1536-wide: `150 × 0.916 ≈ 137px`, still > 69.5px pan room. Would require additional code at 2 call sites.
3. **Cap `overviewOffsetPx` to pan room** — compute `panRoom = (worldW − visibleW) / 2` and clamp. More accurate but more complex.

**Recommendation:** Option 1 (accept it). The clipping is mild (69px vs. 150px) and `resolveCamera` handles the boundary gracefully — the camera will still pan meaningfully, just not the full 150px. Browser check will confirm whether the visual feel is acceptable.

---

## Test Changes

### Updated tests (3 tests)

| Old description | Old assertion | New description | New assertion |
|-----------------|---------------|-----------------|---------------|
| `OVERVIEW converges to zoom≈1.3` (L140) | `cd.zoom ≈ 1.3` | `OVERVIEW converges to zoom≈1.0` (no referenceSpriteSize) | `cd.zoom ≈ 1.0` |
| `Start-Pulk OVERVIEW: maintains zoom=1.3` (L597) | `cd.targetZoom === 1.3` (×2) | `Start-Pulk OVERVIEW: does not crash` | `cd.targetZoom ≈ 1.0` (×2) |
| `closed track OVERVIEW targetZoom = 1.3` (L713) | `cd.targetZoom === 1.3` | `OVERVIEW targetZoom = _overviewStateZoom ≈ 1.0` | `cd.targetZoom ≈ 1.0, ≠ overviewZoom` |

All three use `new CameraDirector(...)` **without** `referenceSpriteSize` — the no-normalization fallback path. The assertions now reflect the simplified fallback (`_overviewStateZoom`, not `_overviewStateZoom × 1.3`).

### New tests (4 tests, added block)

`describe('CameraDirector — normalized OVERVIEW zoom on closed tracks', ...)`

1. `_overviewSnapZoom is stored for a closed track when referenceSpriteSize > 0` — verifies snap storage and correct formula value for 1536-wide track
2. `effZoom (snapZoom × bsX) is equal across all closed-track world sizes at same referenceSpriteSize` — verifies 1536 and 3072 produce identical effZoom ≈ 28/30.6; this is the core invariant
3. `floor clamps to cam.zoom=1.0 when referenceSpriteSize is very large` — verifies boundary at referenceSpriteSize=150 (floor path)
4. `targetZoom after OVERVIEW snap reflects normalized formula, not the retired 1.3 multiplier` — end-to-end: transition → snap → targetZoom matches formula, ≠ 1.3

---

## Full Suite Results

```
Test Files  121 passed (121)
Tests       2568 passed (2568)   [+4 new tests]
```

---

## Determinism Fingerprint

Camera changes do not affect race physics. Confirmed identical to pre-PR baseline:

| Track | Racer | Dur | p-value | Status |
|-------|-------|-----|---------|--------|
| Dirt Oval | horse | 30s | 0.634 | ✅ identical |
| Dirt Oval | dragon | 30s | 0.224 | ✅ identical |
| Dirt Oval | buggy | 30s | 0.180 | ✅ identical |
| Dirt Oval | snowmobile | 30s | 0.224 | ✅ identical |

---

## Browser-Check Checklist

Load each track in a race with a typical racer count (20–40) and verify:

### All 5 closed tracks

**Dirt Oval (horse, worldW=1536)**
- [ ] Racers in OVERVIEW appear roughly the same visual size as on open tracks (River Run, Space Sprint)
- [ ] Camera enters OVERVIEW cleanly — no jarring zoom jump from previous state
- [ ] The radial pan offset toward the field is visible but may be slightly smaller than on open tracks (expected — see pan-clipping analysis above)

**Garden Path (snail, worldW=1536)**
- [ ] Same size check as Dirt Oval
- [ ] OVERVIEW feels like the correct zoom level for the snail sprite

**City Circuit (buggy, worldW=1536)**
- [ ] Same size check
- [ ] OVERVIEW handles tight turns correctly — camera doesn't drift to infield

**Ice Track (horse, worldW=1536)**
- [ ] Same size check as Dirt Oval (identical world dimensions)

**Searound (manta, worldW=3072)**
- [ ] Racer size in OVERVIEW is similar to the other closed tracks ← **key comparison**
- [ ] The full loop does NOT fit the canvas at this zoom — expected and acceptable per spec decision
- [ ] OVERVIEW pan offset (150px) applies fully; no clipping (838px pan room > 150px)
- [ ] Camera follows the leader without drifting to world edges

### Edge case
- [ ] Very few racers (≤ 5) on any closed track: OVERVIEW should fall back to the full-world view (floor snap at cam.zoom=1.0) — racers will appear larger since referenceSpriteSize is large
- [ ] Finish sequence on closed tracks: OVERVIEW during finish still uses the normalized zoom correctly
