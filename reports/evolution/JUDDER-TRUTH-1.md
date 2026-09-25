# JUDDER-TRUTH-1 — what the gate grades, what it should grade, and where the picture actually steps

**2026-09-25. Measurement only.** No guard, threshold, camera source or default was changed. The
quantities are taken from [MOTION-CONTINUITY-1](MOTION-CONTINUITY-1.md) §1.3 and are not re-derived.

**How it was collected.** `node scripts/viewer-invariants.mjs … --dump` for every race below, then
`scripts/diag/motion-continuity-census.mjs` over the dumps. That reader is new and read-only;
`judder-census.mjs` computes the *unified* worst-on-canvas point and prints only the **max** of the
gate's quantity, and `runin-camera-motion.mjs` reads a different file shape and scopes to the closing
phase, so neither answers this over a whole race.

★ **PAN is measured on the X axis alone.** The dump publishes `ez` (`effZoomX`) and no `effZoomY`
(`viewerProbe.js:532`), and the centre on Y needs `zoom · axisY`. A limit of the record, not a choice.

---

## 1 · Is the shipped check capable of firing at all?

The gate grades `hypot(ΔoffsetX, ΔoffsetY)` against **1280 px**, one whole canvas width
(`viewerProbe.js:415-419`, `viewer-invariants.mjs:113`). Measured on today's tree, ten tracks, seed 9,
shipped arm, harness races:

| track | N (frame steps) | median | p99 | **max** | **max ÷ 1280** |
|---|---|---|---|---|---|
| space-sprint | 5 868 | 7.3 | 249.1 | **845.4** | **66.0%** |
| dirt-oval | 7 580 | 8.0 | 200.3 | 731.3 | 57.1% |
| searound | 5 726 | 8.6 | 139.7 | 709.9 | 55.5% |
| ice-track | 6 467 | 8.5 | 150.9 | 535.2 | 41.8% |
| seatrack | 5 786 | 7.1 | 247.1 | 485.8 | 38.0% |
| mountainstreet | 5 583 | 8.0 | 192.4 | 483.4 | 37.8% |
| city-circuit | 6 779 | 9.0 | 169.2 | 282.1 | 22.0% |
| luger-hill | 5 557 | 8.1 | 174.0 | 281.9 | 22.0% |
| garden-path | 6 249 | 7.1 | 133.2 | 232.8 | 18.2% |
| river-run | 5 834 | 6.1 | 155.3 | 203.0 | 15.9% |

**Nothing reaches the bar, on any track.** The worst single frame of the worst track is **two thirds**
of it; the median frame is **0.6%** of it. Across 61 429 frame steps the bar is never approached.

★ **And the one reading that pointed the other way does NOT reproduce.** MOTION-CONTINUITY-1 §1.2
recorded per-track maxima up to **2 332.4 px** on a *headless* arm — which would exceed the bar. On
today's tree, in the browser, the largest of ten is 845.4 px. The two arms disagree, and
`project_browser_vs_headless` says the browser wins.

---

## 2 · The right quantity

PAN in frame widths (X axis) and `|Δ ln effZoomX|`, same races, same N as above.

| track | PAN median | PAN p99 | PAN max | ZOOM median | ZOOM p99 | **ZOOM max** |
|---|---|---|---|---|---|---|
| ice-track | 0.00469 | 0.01669 | 0.05156 | 0.00000 | 0.02877 | **0.12593** |
| city-circuit | 0.00391 | 0.01482 | 0.04717 | 0.00000 | 0.03027 | **0.12369** |
| garden-path | 0.00313 | 0.01153 | 0.02107 | 0.00000 | 0.02993 | **0.12154** |
| searound | 0.00468 | 0.01893 | 0.05235 | 0.00000 | 0.02748 | **0.12149** |
| dirt-oval | 0.00391 | 0.01631 | 0.04297 | 0.00000 | 0.03241 | **0.11984** |
| luger-hill | 0.00391 | 0.01564 | 0.03594 | 0.00000 | 0.03313 | 0.06584 |
| mountainstreet | 0.00452 | 0.01595 | 0.03912 | 0.00000 | 0.02793 | 0.05355 |
| space-sprint | 0.00156 | 0.01439 | 0.04922 | 0.00000 | 0.03241 | 0.05299 |
| seatrack | 0.00313 | 0.01497 | 0.02187 | 0.00000 | 0.02876 | 0.04843 |
| river-run | 0.00389 | 0.01393 | 0.04219 | 0.00000 | 0.01991 | 0.03537 |

**Two findings, and they point in opposite directions.**

★ **The PAN channel shows nothing anomalous anywhere.** Its maxima sit between 0.021 and 0.052 frame
widths — a twentieth of the frame at worst. The frames with the largest ratio against their own local
median are ratios against a nearly stationary camera: the top three across all ten tracks are **64.9×,
64.2× and 36.5×** on pans of **0.00078, 0.00072 and 0.00045 frame widths** — about one screen pixel.
A local rule with no floor finds stillness, not jolts.

★ **The ZOOM channel has one recurring event, and it is the same event on five of ten tracks.** The
five largest single-frame zoom steps in the whole sweep cluster at **0.1198–0.1259 ln**, and every one
is in **LEADER_ZOOM between 24.2 s and 26.3 s**: ice-track f1465 24.7 s, city-circuit f1493 25.1 s,
garden-path f1474 24.8 s, searound f1418 24.2 s, dirt-oval f1561 26.3 s. MOTION-CONTINUITY-1 §2.1
identifies maxima of this size and phase as the **field guarantee retiring**. 0.12 ln is a factor of
1.13 — about **80 px of frame-edge movement in a single frame**.

---

## 3 · The worst moments, reproducible in Quick Test

★★ **The harness races above are NOT Quick Test races and their frame numbers are not his.**
`viewer-invariants.mjs:441-458` builds a synthetic race — its own roster, **40 racers** on a closed
track, `duration: 60`, `targetLaps: 2`. A Quick Test at the same seed is a **different race**: field
**20**, the track's own racer type, stage `quiet`. So this table was measured separately, by driving
the owner's own path — set the Quick Test seed, pick the track, press Quick Test — with the probe on.

**To reproduce: type the seed into the Quick Test seed field, pick the track, press Quick Test, and
watch the clock.** Stage `quiet` throughout; all three races are field 20, 2 laps.

| # | track | Quick Test seed | at | what the camera does | vs its own local level |
|---|---|---|---|---|---|
| 1 | **city-circuit** | **9** | **63.4 s** | the wide overview shot scales tighter by 11% in one frame — the whole picture changes size in a single step, moving the frame edge ~72 px | 3.2× |
| 2 | **ice-track** | **9** | **45.0 s** | the battle shot tightens ~11% in one frame while the view is also sliding, edge ~70 px | 3.0× |
| 3 | **dirt-oval** | **9** | **29.1 s** | the battle shot tightens ~10% in one frame, on the frame carrying the largest offset movement of that whole race, edge ~66 px | 3.2× |
| 4 | **dirt-oval** | **9** | **27.7 s** | the leader shot had been nearly steady and then steps ~10% in one frame — **the most out-of-character step found anywhere**, edge ~62 px | **12.9×** |
| 5 | **city-circuit** | **9** | **29.1 s** | the battle shot steps ~10% in one frame, edge ~64 px | 3.5× |

★ Rows 1–3 and 5 are ordinary in their surroundings (3×) and large in absolute terms. **Row 4 is the
opposite** — slightly smaller, but nearly thirteen times its own local level, which is the shape a
local rule is built to catch.

★ **Only three tracks appear** because only three Quick Test races were driven. The five harness
tracks that share the ~0.12 LEADER_ZOOM event are not listed here: their frame numbers come from races
he cannot reproduce, and the Quick Test races at the same seeds put their worst moments elsewhere.
