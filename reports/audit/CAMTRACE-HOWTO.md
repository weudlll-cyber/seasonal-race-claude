# CAMTRACE-HOWTO — Capture the "unrund" leader-zoom transition

**Goal:** Get a frame-by-frame camera-value log across the OVERVIEW→LEADER_ZOOM transition
so we can see the exact discontinuity causing the unrund feeling.

---

## Setup (one-time)

1. Make sure the PROD preview server is running on port 4173  
   (or start it: in `client/` run `npx vite preview --port 4173`)
2. Make sure the Docker backend is up: `docker compose up` or check it's already running

---

## Capture steps

### 1. Open Chrome and navigate

```
http://localhost:4173/?camtrace=1
```

The `?camtrace=1` flag is remembered for the session — you only need it on the first URL.

### 2. Configure the race

- Setup screen → **Space Sprint** track
- Racer: **Dragon**
- N: **8** (or however many you normally use)
- Click **Quick Test**

### 3. Start the race

Click **Start Race**. The race will begin with countdown.

### 4. Verify the trace is active

Open DevTools console (`F12 → Console`). You should see:

```
[camTrace] active — press Z to mark, __camTrace() to read
```

If you don't see it: reload with `?camtrace=1` in the URL, or run:
```js
sessionStorage.setItem('_ra_camtrace', '1')
```
then reload the race.

### 5. Watch for the trigger scenario

Wait for the camera to enter **OVERVIEW** (wide view of the full field — shows all racers).
Then watch for it to return to **LEADER_ZOOM** (following the leader on a straight section
after a curve).

**The moment the camera motion feels "unrund" (jerky, stuttery, or rough):**

**Press `Z`** (once is enough — it drops a timestamp mark into the trace buffer).

You can press `Z` multiple times if it happens more than once. Each press marks that moment.

### 6. Read the trace

After the unrund moment (don't need to stop the race — just wait 2–3 seconds so the ring
buffer has frames after the event too), run in the console:

```js
copy(window.__camTraceJSON())
```

This copies the entire trace as JSON to your clipboard.

**If `copy()` is not available**, use:
```js
console.log(window.__camTraceJSON())
```
and copy from the console output.

### 7. Send the trace

Paste the JSON into a message here. Also tell me:
- Approximately what the screen looked like when you pressed Z  
  (e.g. "camera was just snapping to the leader after the OVERVIEW zoom-out")
- Whether the unrund felt like: a sudden **jump** in camera position, a **wobble** (back and
  forth), a **snap** (instant position change), or a **stutter** (smooth then frozen then smooth)

---

## Tips

- **You don't need to catch it perfectly.** The ring buffer holds 600 frames (~10 seconds). As
  long as you press Z within a few seconds of the unrund feeling, the relevant frames will be
  in the buffer.

- **Multiple marks are fine.** Press Z whenever it feels bad — more marks = more data.

- **To reset the buffer** (e.g. if you want to try again):
  ```js
  window.__camTraceClear()
  ```

- **To see the marks only** (without the full trace):
  ```js
  window.__camTraceMarks()
  ```

- **To quickly check what state the camera is in** right now:
  ```js
  window.__camTrace().slice(-5).map(f => f.state + ' phase=' + f.phase)
  ```

---

## What the trace contains (per frame)

| Field | Meaning |
|---|---|
| `f` | Frame counter (sequential) |
| `ts` | rAF timestamp in ms |
| `state` | Camera state: `OVERVIEW`, `LEADER_ZOOM`, `BATTLE_ZOOM`, etc. |
| `phase` | Lerp phase: `entry` (still converging after state change) or `tracking` (stable) |
| `ox`, `oy` | Current `cam.offsetX/Y` — the canvas-space pan offset |
| `z` | Current `cam.zoom` |
| `ez` | Effective zoom (`cam.zoom × BASE_ZOOM` for open tracks) |
| `tx`, `ty` | Lerp target for offset — where the camera is heading |
| `tz` | Lerp target for zoom |
| `ex`, `ey` | Error = target − current offset (how far from target) |
| `ez2` | Error = targetZoom − zoom |
| `dox`, `doy` | Per-frame delta of offset (current − previous frame) |
| `dz` | Per-frame delta of zoom |
| `clamp` | 1 if world-edge clamping was active this frame |
| `zadapt` | 1 if resolveCamera reduced zoom to keep target in frame |

**Smoothness signal:** Look at `dox` / `doy` / `dz` — in smooth motion these change gradually
and consistently. A spike (sudden large value) or sign flip (positive → negative → positive)
indicates the discontinuity.
