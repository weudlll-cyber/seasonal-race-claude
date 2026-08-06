# CameraDirector — Target Computation Architecture

> **SUPERSEDED — this is a dated diagnostic record, not a description of the current camera.**
> Kept because the diagnosis is worth reading; headed like this because it had no date and read as a
> live reference, and two of its findings have since been ANSWERED in ways that invert them:
>
> - **"Who owns `targetOffsetX/Y`?"** — resolved. `_setTargets` owns them outright and
>   `_computePhasedPanTarget` no longer writes them at all; it only advances `_camT`. The
>   double-write described in §1 and §2 step [E] does not exist any more.
> - **"a centerline approximation during tracking — it ignores the racer's lane offset"** — this is
>   now DELIBERATE and only on the across-track axis (CAMERA-LATERAL-1). Carrying the subject's lane
>   was measured throwing the picture 62–84 world px sideways at every lead change. Along the track
>   the camera follows the subject exactly as before. Do not "fix" it; see the warning block on
>   `_centrelineAt` in `CameraDirector.js`.
>
> Current architecture: **[CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md)**.

## 1. Intended Responsibilities

### `_setTargets`

The **primary, unconditional target writer**. Called every frame regardless of lerp phase or observer phase. Its job is to produce a valid `targetOffsetX/Y` and `targetZoom` so the lerp always has somewhere to go. During entry it drives the initial pan to the subject. During tracking it keeps `targetOffsetX/Y` alive for the lerp.

For states with `_camT !== null` (all phasedEnabled states in tracking), `_setTargets` computes:

```
panTarget = shape.getPosition(_camT, 0)   // centerline at _camT
```

This is correct for entry (the T-space lerp pin) but is a **centerline approximation** during tracking — it ignores the racer's lane offset.

### `_computePhasedPanTarget`

The **phased observer controller**. Its job is to:

1. Advance `_camT` during the follow phase (`this._camT = focusT`)
2. Manage phase transitions (lead-in → follow → lead-out)
3. In follow phase: write `targetOffsetX/Y` to the world position of the focus subject

The intent is that step 3 should _override_ `_setTargets`'s centerline write.

### Who owns `targetOffsetX/Y`?

`_setTargets` **de facto owns it** because of execution order. `_computePhasedPanTarget`'s writes survive only until the next frame's `_setTargets` call overwrites them before the lerp reads them. The intended ownership split (setTargets = entry/baseline, phasedPanTarget = tracking/follow override) does not match the actual implementation.

---

## 2. Exact Execution Order Per Frame

```
update(racers, ts, raceState, canvasW, canvasH, dt):

  [A] _setTargets(racers, ...)                    // writes targetOffsetX/Y, targetZoom
      └─ if _camT !== null: panTarget = shape.getPosition(_camT, 0)   ← centerline
      └─ else:              panTarget = racer world position / centroid

  [B] LEAD_CHANGE snap (if pending):
      └─ offsetX = targetOffsetX  (snap, not lerp)
      └─ offsetY = targetOffsetY

  [C] zoom lerp:
      this.zoom += (targetZoom - this.zoom) * lf

  [D] T-space or pixel lerp for offsets:
      if tSpaceLerpActive:
        offsetX = targetOffsetX   (hard pin — entry phase, _camT active)
        offsetY = targetOffsetY
      else:
        offsetX += (targetOffsetX - offsetX) * lf   ← READS [A]'s targetOffsetX
        offsetY += (targetOffsetY - offsetY) * lf

  [E] _computePhasedPanTarget(focusRacers, ...)    // writes targetOffsetX/Y again
      └─ if follow phase: this._camT = focusT
                          targetOffsetX/Y = f(lockedRacer.x, lockedRacer.y)
      └─ if lead-in/lead-out/not tracking: returns early (targetOffsetX/Y unchanged)

  (end of frame N)

  ┌─ frame N+1 begins ─────────────────────────────────┐
  │  [A] _setTargets reads _camT (updated by [E])       │
  │      panTarget = shape.getPosition(_camT, 0)        │ ← overwrites [E]'s targetOffsetX/Y
  │  [D] offsetX/Y lerps toward [A]'s target            │
  └────────────────────────────────────────────────────┘
```

**What survives into the lerp:**

- `targetZoom` from `_setTargets` [A] — survives, `_computePhasedPanTarget` does not write zoom.
- `targetOffsetX/Y` from `_computePhasedPanTarget` [E] — **does NOT survive**. Overwritten by `_setTargets` at the start of frame N+1 before `offsetX/Y` lerps toward it.
- `_camT` updated by `_computePhasedPanTarget` [E] **does** persist into frame N+1 and is read by `_setTargets` [A]. This is the only mechanism by which `_computePhasedPanTarget` actually influences camera position.

---

## 3. Effective Driver Per Camera State

| State             | `_camT` in tracking?         | `_setTargets` panTarget                    | Phased observer effect                                                              | Effective driver                                                      |
| ----------------- | ---------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **OVERVIEW**      | No (released at convergence) | `racer.x/y` centroid or leader             | No phased observer (phasedEnabled=false)                                            | `_setTargets` with racer world pos — **correct**                      |
| **LEADER_ZOOM**   | Yes                          | `shape.getPosition(_camT, 0)` (centerline) | `_camT = leader.t` → `_setTargets` follows centerline at leader T                   | `_setTargets` centerline at leader T — **offset by lane**             |
| **LEAD_CHANGE**   | Yes                          | `shape.getPosition(_camT, 0)` (centerline) | `_camT = newLeader.t` → same                                                        | `_setTargets` centerline — **offset by lane**                         |
| **BATTLE_ZOOM**   | Yes                          | `shape.getPosition(_camT, 0)` (centerline) | `_camT = group centroid T` → centerline at centroid T; `focusOffset` write is inert | `_setTargets` centerline at centroid T — **offset by avg lane**       |
| **COMEBACK_ZOOM** | Yes                          | `shape.getPosition(_camT, 0)` (centerline) | `_camT = lockedRacer.t`; `focusPosOverride` write is inert                          | `_setTargets` centerline at locked racer T — **offset by racer lane** |

**Summary**: All phasedEnabled states effectively use `shape.getPosition(_camT, 0)` — the track centerline at the racer's T fraction — because `_computePhasedPanTarget` only updates `_camT`, not `targetOffsetX/Y` in a way that survives. OVERVIEW is the only state that correctly centers on world position.

The intended behavior (phasedPanTarget overrides to world position) is not achieved for any state.

---

## 4. Other Variables with Double-Write Problems

### `targetZoom`

`_setTargets` writes `targetZoom` unconditionally every frame. `_computePhasedPanTarget` does **not** write `targetZoom`. No double-write conflict. The zoom lerp at step [C] always reads `_setTargets`'s value. **No bug here.**

### `offsetX/Y` (the lerped values themselves)

`_setTargets` does not write `offsetX/Y` directly (only `targetOffsetX/Y`). `_computePhasedPanTarget` also does not write `offsetX/Y` directly — there are no hard-pin writes in follow phase. The `LEAD_CHANGE` snap at step [B] does write `offsetX/Y` directly (intentional snap, not a bug). **No unintended conflict.**

### `_camT`

Both `_setTargets` (reads it) and `_computePhasedPanTarget` (writes it in follow phase) use `_camT`, but in the correct direction: `_computePhasedPanTarget` writes `_camT = focusT`, then `_setTargets` reads it on the next frame. This is the **working** half of the phased observer. The problem is that only `_camT` persists, not the `targetOffsetX/Y` computed from the racer's actual world position.

---

## 5. Minimal Clean Architecture

### Principle

One layer should own `targetOffsetX/Y` at any given time with clear priority rules. The current split (both layers write it, one always wins due to order) is the root cause of all silently-inert fixes.

### Recommended architecture: `_setTargets` owns everything; `_computePhasedPanTarget` updates state only

**`_setTargets`** becomes the single writer of `targetOffsetX/Y`:

| Condition                                          | panTarget source                                                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `_camT === null`                                   | racer world pos / centroid (unchanged)                                                                                  |
| `_camT !== null` AND `_observerPhase !== 'follow'` | `shape.getPosition(_camT, 0)` (unchanged — lead-in/lead-out anchor)                                                     |
| `_camT !== null` AND `_observerPhase === 'follow'` | **racer's actual world position** (`lockedRacer.x/y`, group centroid `x/y`, or `shape.getPosition(_camT, physicalY/2)`) |

This requires `_setTargets` to look up the locked/focus racer directly, which it can already do (it already calls `_findByIndex` for COMEBACK_ZOOM and `_findGroupRacers` for BATTLE_ZOOM).

**`_computePhasedPanTarget`** becomes a **state controller only** — advances `_camT`, manages phase transitions, writes no `targetOffsetX/Y`:

```
_computePhasedPanTarget():
  - compute focusT for the current state
  - manage lead-in → follow → lead-out transitions
  - in follow phase: this._camT = focusT   ← only write
  - return   (no targetOffsetX/Y writes at all)
```

### Why this is clean

- Single writer for `targetOffsetX/Y`: no silent overwrite, no execution-order dependency.
- `_computePhasedPanTarget`'s existing `_camT` mechanism already works; extending it to also drive targetOffsetX/Y from the right position is a small, isolated change in `_setTargets`.
- The follow-phase world-position lookup in `_setTargets` is symmetric with how OVERVIEW already works (`focusRacers[0].x/y` directly).
- `_computePhasedPanTarget`'s `focusOffset`, `focusPosOverride`, and the entire bottom half (lines 1888–1927) can be deleted — the computation moves to `_setTargets` where it executes in the right order.

### State-by-state what changes in `_setTargets`

| State         | Current follow-phase panTarget | Correct follow-phase panTarget                               |
| ------------- | ------------------------------ | ------------------------------------------------------------ |
| LEADER_ZOOM   | `shape.getPosition(_camT, 0)`  | `focusRacers[0].x/y` (same as OVERVIEW)                      |
| LEAD_CHANGE   | `shape.getPosition(_camT, 0)`  | `focusRacers[0].x/y`                                         |
| BATTLE_ZOOM   | `shape.getPosition(_camT, 0)`  | group centroid `x/y` (already computed as `battleFallback`)  |
| COMEBACK_ZOOM | `shape.getPosition(_camT, 0)`  | `lockedCBRacer.x/y` (already computed as `comebackFallback`) |

In all four cases the correct world position is **already computed** in `_setTargets` as the `…Fallback` variable — it is just discarded when `_camT !== null`. The fix is to use it when `_observerPhase === 'follow'` instead of falling through to `shape.getPosition(_camT, 0)`.
