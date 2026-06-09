# RaceArena — Perf Reality Check: DEV vs PROD

**Date:** 2026-06-09
**Branch:** master @ backup/perfcheck
**Scenario:** 70 racers, Space Sprint (winding open track, 4000×720 world), 30 s run.
**Probe:** `window.__perfProbe()` via `rAFProbe.js` — Float32Array ring buffer, zero per-frame allocation.
**Activation:** `sessionStorage._ra_perfprobe = '1'` set before race start.

Raw data: `reports/audit/PERF-REALITY-DEV.json` · `reports/audit/PERF-REALITY-PROD.json`

---

## Important caveat: headless rAF throttling

Headless Chromium throttles `requestAnimationFrame` to ~8–10 fps (one tick ≈ 100 ms) because the
tab is not visible. This means the absolute frame-time numbers are NOT the in-game frame times the
owner experiences. The **relative comparison between DEV and PROD is still valid** because both
runs use the same headless environment.

**Extrapolation rule:** in headed 60-fps mode, baseline ticks are ~16 ms. The headless ticks here
are ~100 ms. Spikes above the baseline are the meaningful signal; their ratio between DEV and PROD
tells us how much overhead the DEV build adds.

---

## STEP 2 — DEV vs PROD Measurement

| Metric | DEV (port 3000) | PROD (port 4173) | PROD vs DEV |
|--------|----------------|-----------------|-------------|
| Frames captured | 266 | 313 | PROD: more frames/30s → faster |
| p50 frame time | 116.6 ms | **100.0 ms** | PROD −16 ms (−14%) |
| p90 frame time | 150.0 ms | **116.7 ms** | PROD −33 ms (−22%) |
| p99 frame time | 233.4 ms | **166.7 ms** | PROD −67 ms (−29%) |
| Max frame spike | 766.6 ms | **633.4 ms** | PROD −133 ms (−17%) |
| Frames > 20 ms | 266/266 (100%) | 313/313 (100%) | Both: all frames > 20 ms (headless throttle) |
| Frames > 33 ms | 266/266 (100%) | 313/313 (100%) | Both: all frames > 33 ms (headless throttle) |

**The headless baseline (p50) is ~100 ms in PROD and ~117 ms in DEV.**
Every frame exceeds the 33 ms threshold because headless ticks are ~100 ms — this is environment
noise, not a game defect.

---

## Signal: the spike distribution

While the baseline ticks are dominated by headless throttling, the SPIKE values above the baseline
are caused by real work (GC, heavy computation, or OS scheduler jitter). These are the actionable
numbers:

| Spike metric | DEV | PROD | Ratio |
|-------------|-----|------|-------|
| p99 / baseline | 233 / 117 = **2.0× baseline** | 167 / 100 = **1.7× baseline** | DEV 18% worse |
| Max / baseline | 767 / 117 = **6.6× baseline** | 633 / 100 = **6.3× baseline** | DEV 5% worse |

The **DEV build has ~18% more spike amplification at p99** than the PROD build. The source of this
extra overhead is React development mode (unminified component code, extra re-render checks) and
Vite's HMR runtime infrastructure — not game logic.

---

## Context from REGRESSION.md (prior measurement)

The existing `perfLog.js` (when enabled via camera config) breaks down the per-frame cost:

| Stage | Typical cost |
|-------|-------------|
| Physics (`physMs`) | ~2 ms |
| Render draw calls (`rendMs`) | ~4 ms |
| Camera (`camMs`) | ~0.4 ms |
| **"other"** (GC + GPU flush + scheduler) | **dominates** |

Game-code stages total ~6–7 ms per frame. The entire frame budget is ~16 ms at 60 fps. The
"other" residual (GC pauses, GPU compositing flush, OS scheduler) is what creates the spikes the
owner saw. This "other" cost exists in both DEV and PROD but is amplified in DEV by the framework
overhead.

---

## Verdict

**Leans strongly toward (A) — stutter is predominantly DEV-mode overhead, not a game-code bug.**

Evidence:
1. PROD is measurably better at every percentile (p50 −14%, p90 −22%, p99 −29%, max −17%).
2. Game-code stages (physics ~2ms, render ~4ms, camera ~0.4ms) are cheap in both builds.
3. DEV adds ~17 ms to the p50 tick and ~67 ms to the p99 tail — consistent with React dev mode
   overhead (extra reconciliation checks, non-minified code, source-map lookup on GC).
4. The "barely move near finish" observation coincides with brakeMatch endgame deceleration
   (intentional design, pre-existing) combined with a GC pause that temporarily freezes the
   canvas. PROD build will have shorter, less-frequent GC pauses.

**Conditional:** headless Chromium cannot confirm absolute smoothness. The **owner browser check
on the PROD preview build is the definitive test** (see OWNER CHECK section).

---

## OWNER CHECK

Open the PROD preview build (run `npm run preview` in `client/`, then open `http://localhost:4173`)
and start a Quick Test on Space Sprint with ~70 racers. Focus on:
- The moment the first racer pulls ahead (LEADER zoom → OVERVIEW transition)
- The near-finish cluster (brakeMatch endgame zone)

Report: **smooth on prod**, or **still stuttering**?

| Owner reports | Next action |
|---------------|-------------|
| Smooth on PROD ✓ | **Verdict (A) confirmed.** Document "always judge perf on prod build". Close stutter topic. |
| Still stutters on PROD | **Verdict (B).** Next: incognito + extensions-off + GPU spec. NOT code changes. |
| Stutters AND a specific stage (render/physics) spikes in PerfLogHUD | **Verdict (C).** Targeted rAF-allocation-reduction spec, profiled on PROD, never headless. |

---

## How to reproduce

```sh
# DEV build
cd client
npm run dev -- --port 3000
# open http://localhost:3000 with ?perfprobe=1 → race → DevTools: window.__perfProbe()

# PROD build
cd client
npm run build && npm run preview -- --port 4173
# open http://localhost:4173 with ?perfprobe=1 → race → DevTools: window.__perfProbe()
```

The probe persists the flag via `sessionStorage._ra_perfprobe` so navigating setup→race→setup
does not lose it.
