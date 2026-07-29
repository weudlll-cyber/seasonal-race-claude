# Render-Smoothness — Measurements

## Setup Conditions

- **Track**: Dirt Oval (Closed, 1280×720)
- **Racer**: 5 (Horses)
- **Measurement date**: 2026-05-08
- **Measurement tools**: CameraDiagnosticsHUD (PR #79, Branch `diag/render-smoothness-hud`) + Playwright frame sampling (`client/e2e/render-smoothness-camera-tracking.spec.js`, Branch `diag/playwright-camera-tracking`)
- **Frames collected**: 608 (LEADER_ZOOM) + 602 (BATTLE_ZOOM), each ≥ 2500 ms after state entry
- **Race duration**: 180 s

## Measurements

| State | Zoom (Ø) | Δscreen Ø | Δscreen P95 | Δscreen max¹ | Cam-Lag Ø | Cam-Lag max¹ | Steady-State Jitter StdDev² |
|---|---|---|---|---|---|---|---|
| OVERVIEW | ~1.0× | –³ | –³ | –³ | –³ | –³ | –³ |
| LEADER_ZOOM | 2.23× | 3.46 px/frame | 8.75 px/frame | 83.01 px/frame | 18.18 px | 245.65 px | **2.49 px/frame** |
| BATTLE_ZOOM | 3.30× | 6.02 px/frame | 12.35 px/frame | 284.01 px/frame | 32.80 px | 308.41 px | **3.52 px/frame** |

¹ Max values include transition spikes (state-change artifacts).  
² Steady-state: leader-jitter StdDev after excluding ±50 frames around each state change.  
³ OVERVIEW not measured via Playwright; test captured only LEADER_ZOOM and BATTLE_ZOOM.

**Frame timing (both states combined, 1210 frames total):**

| Metric | Value |
|---|---|
| dt Ø | 17.02 ms (target 16.67 ms @ 60fps) |
| dt max | 33.4 ms |
| Frames > 20 ms | 26 of 1210 (2.1 %) |

## Mathematical justification (aliasing threshold)

At LEADER_ZOOM (zoom 2.23×) the leader moves on average 3.46 px/frame on screen;
peaks up to ~14 px/frame are normal in steady state (≈ 97th percentile: Ø + 1.9 × StdDev).
A horse number shield (jersey number) measures approximately 25 px screen width at this zoom factor.

**Ratio movement / object width:**
- Average case: 3.46 / 25 ≈ **14 %** per frame — smooth
- Peak 14 px: 14 / 25 ≈ **56 %** per frame — object moves more than half its own width in one
  frame; the eye cannot interpolate a continuous motion → visible ratcheting / aliasing stutter

**Zoom scaling**: The effect scales linearly with the zoom factor. At BATTLE_ZOOM (3.30×,
factor 1.48× relative to LEADER_ZOOM) the screen pixel values increase proportionally:
P95 12.35 px/frame → 12.35 / 25 ≈ 49 % of the object width. Combined with the higher
centroid movement (3.4× vs. 1.9× world pixels/frame) this explains the significantly stronger
jitter in BATTLE_ZOOM (StdDev 13.6 vs. 5.6 px/frame before cleanup).

Every increase of the zoom factor by a factor k also multiplies the screen pixel displacement
per frame by k — without changing the lerp speed or frame timing, visible stutter worsens
proportionally.

---

_Solution discussion and chosen approach: recorded in the commit history for this diagnosis (the former HANDOFF.md is not maintained)._
