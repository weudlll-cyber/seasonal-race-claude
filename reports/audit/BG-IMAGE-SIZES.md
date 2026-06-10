# BG-IMAGE-SIZES — Background image dimensions vs stored worldWidth

**Date:** 2026-06-09  
**Branch:** master (backup/perfcheck start point)  
**Status:** Read-only — zero source/data changed.

---

## 1. Image dimension inventory

### 1a. Server authoritative images (`server/data/backgrounds/`)

| File | Real W | Real H | Format note |
|---|---|---|---|
| city-circuit.png | 1 536 | 1 024 | PNG |
| dirt-oval.png | 1 536 | 1 024 | PNG |
| garden-path.png | 1 536 | 1 024 | PNG |
| ice-track.png | 1 536 | 1 024 | PNG |
| luger-hill.png | **4 096** | **2 728** | ⚠ File named `.png` but is a JPEG |
| mountainstreet.jpg | 6 144 | 4 096 | JPEG |
| river-run.jpg | 6 144 | 4 096 | JPEG |
| searound.jpg | 3 072 | 2 048 | JPEG |
| seatrack.jpg | 6 144 | 4 096 | JPEG |
| space-sprint.jpg | **6 000** | **4 000** | JPEG |

### 1b. Client static fallbacks (`client/public/assets/tracks/backgrounds/`)

These are loaded when the server is offline and no cached data-URL is available.

| File | Real W | Real H | Notes |
|---|---|---|---|
| Mountainstreet.jpg | 6 144 | 4 096 | Matches server |
| city-circuit.png | 1 536 | 1 024 | Matches server |
| dirt-oval.jpg | **1 168** | **784** | ✗ Older/smaller than server (1 536×1 024) |
| garden-path.png | 1 536 | 1 024 | Matches server |
| river-run.png | **1 536** | **1 024** | ✗ Much smaller than server (6 144×4 096) |
| space-sprint.jpg | **1 168** | **784** | ✗ Much smaller than server (6 000×4 000) |

The client fallbacks for `dirt-oval`, `river-run`, and `space-sprint` are **outdated legacy images** and are not used when the server is running.

---

## 2. Comparison table: stored worldWidth vs real image size

Data sources: server track JSONs (`server/data/tracks/*.json`), live API (`racearena:cache:serverTracks` in localStorage after server connection), and stale local defaults (`racearena:tracks`).

| Track | Local localStorage worldW | Server JSON / API worldW | Real image W | Real image H | Server JSON match? | Local stale? |
|---|---|---|---|---|---|---|
| dirt-oval | **1 280** | **1 536** | 1 536 | 1 024 | ✓ | ✗ stale |
| river-run | **1 280** | **6 144** | 6 144 | 4 096 | ✓ | ✗ stale |
| space-sprint | **1 280** | **6 000** | 6 000 | 4 000 | ✓ | ✗ stale |
| garden-path | **1 280** | **1 536** | 1 536 | 1 024 | ✓ | ✗ stale |
| city-circuit | **1 280** | **1 536** | 1 536 | 1 024 | ✓ | ✗ stale |
| mountainstreet | 6 144 | 6 144 | 6 144 | 4 096 | ✓ | — |
| ice-track | 1 536 | 1 536 | 1 536 | 1 024 | ✓ | — |
| seatrack | 6 144 | 6 144 | 6 144 | 4 096 | ✓ | — |
| searound | 3 072 | 3 072 | 3 072 | 2 048 | ✓ | — |
| luger-hill | (no local entry) | 4 096 | 4 096 | 2 728 | ✓ | — |

**Server JSON worldWidth matches the real image dimensions on every track — no inconsistency on the server side.**

**The 1 280 values in `racearena:tracks` localStorage are stale defaults** from the code's `DEFAULT_TRACKS` list (which hardcodes `worldWidth: 1280` for tracks that predate the server). They are **not used at runtime** when the server is running.

---

## 3. How worldWidth is determined at runtime

### 3a. Source priority chain

```
SetupScreen.jsx (lines 124–149):
  1. Start with DEFAULT_TRACKS code values (worldWidth=1280 for most)
  2. Overlay racearena:tracks localStorage (also stale 1280 for most)
  3. for (const st of serverTracks) { byId.set(st.id, st); }  ← OVERRIDES everything
```

When the server is online, **step 3 completely replaces** any local entry. `serverTracks = useServerTracks()` fetches from `racearena:cache:serverTracks` which is populated by `fetchServerTracks()` → `GET /api/tracks`. The server returns `worldWidth` from its JSON file, e.g. `6000` for Space Sprint.

**Conclusion: `raceData.worldWidth` is the server's value whenever the server has been contacted.** The stale `1280` in `racearena:tracks` is only a fallback for fully offline scenarios (no server AND no server track cache).

### 3b. Background image URL

In `trackLoader.js` (line 57), the background URL is set to:
```
`${API_BASE_URL}/api/tracks/${serverId}/background`
```
which serves `server/data/backgrounds/<id>.<ext>`. The client static fallbacks in `client/public/` are **only used** by very old localStorage cache entries or if the background fetch fails.

### 3c. Render path — is the background scaled to worldWidth or native size?

From `trackRendering.js`:
```js
// One-time pre-darkening, cached in _darkenedBgCache keyed by `${path}_${ww}x${wh}`
const oc = new OffscreenCanvas(ww, wh);          // ww = worldWidth (e.g. 6000)
octx.drawImage(bgImg, 0, 0, ww, wh);             // scales image into worldWidth×worldHeight px

// Per-frame draw:
ctx.drawImage(darkened, 0, 0);                   // draws at world coords (0,0), full size = ww×wh
```

The background is drawn in **world space** at position `(0,0)` with size `worldWidth × worldHeight`. The camera `ctx.scale(effZoom, effZoom)` transform then maps world pixels to screen pixels.

**The OffscreenCanvas texture is `worldWidth × worldHeight` pixels** — for Space Sprint that is 6 000 × 4 000 = **24 million pixels**. This texture is created once and reused.

---

## 4. Consistency verdict

| Question | Answer |
|---|---|
| Do server JSON worldWidths match image files? | **Yes — perfectly consistent.** |
| Do `racearena:tracks` localStorage worldWidths match? | **No — 5 tracks show stale 1 280×720.** |
| Does the game use the wrong worldWidth? | **No — server values override when server is running.** |
| Is there a data bug? | **Stale localStorage defaults, not a runtime bug.** Code issue: `DEFAULT_TRACKS` hardcodes 1280 for tracks that the server now manages with different dimensions. |
| Is worldWidth consistent with the background image size? | **Yes for the server path.** For client static fallbacks: `space-sprint.jpg` is 1168×784 (vs worldWidth=6000), `river-run.png` is 1536×1024 (vs worldWidth=6144) — these would render incorrectly if loaded offline. |

---

## 5. Implication for OVERVIEW GPU cost

The background is drawn as a `worldWidth × worldHeight` OffscreenCanvas texture every race. For tracks where the server provides the correct dimensions:

| Track | worldWidth | worldHeight | OffscreenCanvas area | Relative texture size |
|---|---|---|---|---|
| dirt-oval, city-circuit, etc. | 1 536 | 1 024 | 1.57 MP | 1× |
| ice-track | 1 536 | 1 024 | 1.57 MP | 1× |
| searound | 3 072 | 2 048 | 6.29 MP | 4× |
| luger-hill | 4 096 | 2 728 | 11.2 MP | 7.1× |
| mountainstreet, river-run, seatrack | 6 144 | 4 096 | 25.2 MP | 16× |
| **space-sprint** | **6 000** | **4 000** | **24 MP** | **15.3×** |

The GPU must sample from this full texture each frame. Combined with the OVERVIEW zoom-out (which makes a larger fraction of the texture visible), wide-world tracks carry a GPU cost that is:
- **15–16× heavier texture** than small-world tracks even at the same zoom
- **Up to 4.1× more visible area** at N=8 vs N=40+ racers (from OVERVIEW-ZOOM.md analysis)
- Combined worst case (Space Sprint, N=8): ~62× more GPU work than a small-world track at leader zoom

**The stale `worldWidth=1280` in localStorage was the source of the discrepancy in the OVERVIEW-ZOOM.md analysis.** With the true value (6000), Space Sprint DOES show racer-count-dependent OVERVIEW zoom — identical to the Mountainstreet model in that report.

---

## 6. Minor finding — file format mismatch

`server/data/backgrounds/luger-hill.png` is named `.png` but contains JPEG data (magic bytes `FFD8FF`). The browser will decode it correctly regardless, but:
- The server's `Content-Type` header may be set to `image/png` based on the filename
- The `_darkenedBgCache` key includes the path, so it won't collide with a real PNG
- No runtime rendering error, but the mislabeling is a maintenance confusion risk
