# ZOOMFLOOR-TRY — Owner try-session protocol

**Build:** master HEAD (post-zoomfloor implementation)  
**Tagged baseline:** `backup/pre-zoomfloor`  
**Server must be running** (Docker) — real 6000×4000 Space Sprint background is required.  
**Build:** `npm run build` in `client/` — already done, PROD bundle at `dist/`.

---

## Pre-session checklist

- [ ] Docker container running: `docker compose up -d` (server on port 4000)
- [ ] PROD preview running: `npm run preview` in `client/` → **http://localhost:4173**
- [ ] Old vite/node processes killed first (only one preview server on 4173)

---

## What was added

A new **"OVERVIEW zoom floor (effZoom)"** slider in the Dev Screen → Camera Advanced → Section 3
(MID — Director Weights & OVERVIEW). It controls `overviewMinEffZoom`:

| Value | Effect | Expected GPU stutter |
|---|---|---|
| **0** (default) | Off — current behavior | ~20 fps in OVERVIEW with 8 racers |
| 0.5 | effZoom never below 0.5 | ~56 ms GPUTask (estimate) |
| **0.6** | effZoom never below 0.6 | ~56 ms GPUTask (below stall threshold) |
| 0.7 | effZoom never below 0.7 | ~40 ms GPUTask |
| 0.9 | Very tight floor | Racers appear larger, less track visible |

At `effZoom=0.6` the camera is limited to showing `1280/0.6 × 720/0.6 ≈ 2133 × 1200` world pixels
of the 6000×4000 background (vs 3257×1833 at today's uncapped N=8 zoom). Racers appear larger on
screen. The GPU load drops from ~6MP sampled/frame to ~2.56MP — ~57% reduction.

---

## Try session steps

### 1. Open the PROD build with perfprobe

```
http://localhost:4173?perfprobe=1
```

The `?perfprobe=1` probe persists for the whole browser tab session.

### 2. Start a Space Sprint race with ~8 racers, Dragon or Rocket

In Setup:
- Track: **Space Sprint**
- Racer type: Dragon (or Rocket)
- Racer count: **8** (to maximize zoom-out)
- Duration: 60 s or longer

Start the race.

### 3. Wait for OVERVIEW to fire (≈15 s into the race)

The camera will cut to OVERVIEW once the `OVERVIEW start delay` (15 s) has passed.
You will see the full-track view with a "CURRENTLY LEADING" overlay.

**Observe** the smoothness at the default floor=0 setting.  
In the DevTools console: `window.__perfProbeZoom()` — note `overview.p90` gap ms.

### 4. Open Dev Screen and adjust the floor

Navigate to **Dev Screen** (gear icon or `/dev` route) → **Camera Advanced** → Section 3.

Find: **OVERVIEW zoom floor (effZoom)** — currently shows `Off`.

Try values in this order, starting a new race each time (or waiting for the next OVERVIEW cut):

| Try | Value | What to look for |
|---|---|---|
| A | `0` (Off) | Baseline — note stutter severity |
| B | `0.50` | Is OVERVIEW smoother? How much track is still visible? |
| C | `0.60` | Model predicts stutter elimination — check visually |
| D | `0.70` | Less track visible — does it feel too zoomed in? |
| E | `0.90` | Tight floor — racers large, minimal track |

After each cut to OVERVIEW: `window.__perfProbeZoom()` in DevTools → check `overview.p90` and
`overviewZoomBuckets` entries. The floor is working if the lowest zoom bucket disappears (i.e. no
frames at `0.26–0.39` effZoom).

### 5. Note the visual trade-off at your chosen value

The zoom floor trades stutter against "how much track is visible" in OVERVIEW:

- `effZoom=0.39` (no floor) → 3257×1833 world px visible (54% of track width)
- `effZoom=0.50` → 2560×1440 world px visible (43% of track width)
- `effZoom=0.60` → 2133×1200 world px visible (36% of track width)
- `effZoom=0.70` → 1829×1029 world px visible (30% of track width)

The OVERVIEW still pans — so even with a tighter floor the camera follows the leader and the field
remains visible; it just can't zoom out as far.

### 6. Decision

Pick the value that feels smooth AND looks good. Options:
- **Keep the slider, set a non-zero default** (e.g. `overviewMinEffZoom: 0.6` in `defaults.js`)
- **Remove the slider after locking the value** (simpler UI, but requires a code change)
- **Leave default=0 and document the knob** (owner sets it per-event as needed)

---

## What was NOT changed

- The snap-zoom FORMULA is unchanged — `overviewTargetScreenPx` still controls target sprite size
- Closed tracks are unaffected (floor is open-track-only)
- The floor clamp is applied AFTER the existing `resolveCamera` zoom-reduction loop, so
  world-edge clamping still works correctly
- FINISH_OVERVIEW (gradual zoom-out at race end) is unaffected — floor only triggers during
  normal mid-race OVERVIEW cuts (non-finishMode)

---

## Rollback

```bash
git checkout backup/pre-zoomfloor -- client/src/modules/storage/defaults.js \
  client/src/modules/camera/CameraDirector.js \
  client/src/modules/camera/cameraTimingComputation.js \
  client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx
npm run build
```
