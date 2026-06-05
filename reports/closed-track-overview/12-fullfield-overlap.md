# Full-Field Open-Track Overlap — Large-N Analysis

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Scope:** Space Sprint × plane × N = 40 / 60 / 80. Master vs branch. Analysis only — no code changes.

---

## 1. Sim results — master vs branch (N = 40, 60, 80)

Command: `node scripts/sim-fairness.mjs --track=space-sprint --racer=plane --racers=N --races=30`  
Master run from `git worktree add` of `cf83690`.

### N = 40

| | master | branch |
|---|---|---|
| liteOverlapRate 30s / 120s | 0.0% / 0.0% | 0.0% / 0.0% |
| overlapResolution (fr) 30s / 120s | 40.6 / 42.0 | 44.5 / 43.8 |
| brakeRate 30s / 120s | 84.4% / 70.5% | 84.7% / 70.8% |
| pulkTime 30s / 120s | 99.8% / 100.0% | 99.6% / 100.0% |
| rows | 2 | 2 |

### N = 60

| | master | branch |
|---|---|---|
| liteOverlapRate 30s / 120s | 0.0% / 0.0% | 0.0% / 0.0% |
| overlapResolution (fr) 30s / 120s | 45.3 / 42.7 | 35.8 / 41.7 |
| brakeRate 30s / 120s | 91.3% / 75.5% | 91.3% / 75.9% |
| pulkTime 30s / 120s | 99.8% / 99.9% | 99.9% / 100.0% |
| rows | 2 | 2 |

### N = 80

| | master | branch |
|---|---|---|
| liteOverlapRate 30s / 120s | 0.0% / 0.0% | 0.0% / 0.0% |
| overlapResolution (fr) 30s / 120s | 43.7 / 38.1 | 42.4 / 43.8 |
| brakeRate 30s / 120s | 93.4% / 81.9% | 93.2% / 81.5% |
| pulkTime 30s / 120s | 99.7% / 100.0% | 99.6% / 100.0% |
| rows | 3 | 3 |

All liteOverlapRate values are 0.0% on both codebases, within normal sampling noise for all other metrics. **The physics is unchanged** (identical code paths as established in report 11).

---

## 2. Per-N geometry: slot, avoidance, visible body, overflow

Space Sprint: trackWidth=449px, pathLength=19772px, effectiveWidth=426.55px, avoidanceDistance=0.18.  
plane: displaySize=42px, bodyFillX=0.836 (along-path / narrow), bodyFillY=0.930 (lateral / wide).

| N | physSlot (px) | rpr | rows | lhS | deadZone | master bLat (px) | master overflow | branch bLat (px) | branch overflow |
|---|---|---|---|---|---|---|---|---|---|
| 9 | 94.8 | 9 | 1 | 0.211 | **YES** | 88.2 | 0.0 px | 70.5 | 0.0 px |
| 20 | 42.7 | 20 | 1 | 0.095 | no | 39.7 | 0.0 px | 31.7 | 0.0 px |
| 40 | 42.7 | 20 | 2 | 0.095 | no | 39.7 | 0.0 px | 31.7 | 0.0 px |
| 60 | 28.4 | 30 | 2 | 0.063 | no | 26.4 | 0.0 px | 31.7 | **+3.3 px** |
| 80 | 31.6 | 27 | 3 | 0.070 | no | 29.4 | 0.0 px | 31.7 | **+0.1 px** |

Notes:
- `physSlot` = `physicalSpriteSize` = result of `computeRacerLayout(EW=426.55, N, 42, cfg).spriteSize` — also equals `2 × EW / rpr`.
- `rpr` = racers per row from `computeRacerLayout` (the PHYSICAL layout).
- `lhS` = `lateralHalfSpan` = `physSlot / trackWidth` — below `avoidanceDistance=0.180` for all N ≥ 20 (no dead zone).
- `master bLat` = `bodyFillY × physSlot` = `0.930 × physSlot` (master renders frames at physSlot, body is always a fraction of frame → never overflows).
- `branch bLat` = `bodyNarrow_branch × (bodyFillY / bodyFillX)` where `bodyNarrow_branch` = `computeBodyNarrowRef(285, N, 42, 0.836, cfg).bodyNarrow`.

---

## 3. Root cause of large-field visual overflow (branch-specific, N ≈ 49–62)

### 3a. The W_REF mismatch

The branch computes the render body size from a **fixed W_REF = 285 px** reference width, independent of the actual track width. Space Sprint has `effectiveWidth = 426.55 px > W_REF`, so the W_REF cap does not activate (it was designed for narrow tracks).

`computeBodyNarrowRef(W_REF=285, N, ...)` runs its own rowCount/rpr staircase based on the 285 px reference track. For N=60 it computes:
```
maxRPRatMin = floor(2×285 / 22.8) = 25
rowCount    = ceil(60 / 25)       = 3
rpr_ref     = ceil(60 / 3)        = 20     ← reference: 20 racers/row
bodyNarrow  = 2×285 / 20          = 28.5 px
```

`computeRacerLayout(EW=426.55, N=60, ...)` computes:
```
maxRPRatMin = floor(2×426.55 / 27.3) = 31
rowCount    = ceil(60 / 31)           = 2
rpr_phys    = ceil(60 / 2)            = 30     ← physics: 30 racers/row
physSlot    = 2×426.55 / 30           = 28.4 px
```

**The physics packs 30 per row; the render reference sizes bodies for 20 per row.** `bodyNarrow = 28.5 px` was designed for 20-per-row spacing (slot = 28.5 px). The actual slot at 30-per-row is 28.4 px. But the rendered lateral body = `bodyNarrow × bodyFillY/bodyFillX = 28.5 × 1.112 = 31.7 px` — exceeding the 28.4 px slot by **3.3 px per pair**.

### 3b. Why master never overflows

On master the render frame equals the physics frame (both from `computeRacerLayout`):
```
rendered lateral body = bodyFillY × physSlot = 0.930 × physSlot < physSlot
```
Since `bodyFillY ≤ 1.0` always, the rendered body fits the slot on master by construction.

### 3c. The overflow band

The branch overflow is non-monotonic because both layout staircases step discretely. Scanning N = 40–90:

| N range | branch overflow | note |
|---|---|---|
| 40–48 | 0 px | slot (42.7 px) >> lateral body (31.7 px) |
| **49–62** | **2.3–4.5 px** | worst band; peak at N=51 (4.5 px), N=57 (4.0 px) |
| 63–75 | ≤ 0 px | slot recovers due to rpr staircase |
| 76–84 | 0–0.6 px | minor secondary band |
| 85–88 | ≤ 0.4 px | boundary |

The user's "~40–80 racer" field falls squarely in the worst band (N ≈ 49–62). A race with 50–60 planes on Space Sprint will render each adjacent pair in the same physics row with ~3–4 px of body overlap on the branch. With 28–30 racers per row that creates a continuous overlapping stripe.

---

## 4. Why sim shows 0% despite real visual overlap

The `liteOverlapRate` threshold:
```
overlapThreshold_y = 0.10 × bodyDiameterX / trackWidth
                   = 0.10 × (42 × 0.836) / 449  =  0.0078  →  3.5 px lateral
```

This counts a pair as "overlapping" only when centers are within **3.5 px** of each other. But:

- Physics (`lateralHalfSpan`) keeps centers at least `physSlot = 28.4 px` apart.
- The visual overlap (3.3 px) occurs because rendered **bodies** are 31.7 px wide in a 28.4 px slot — centers are not close, bodies just extend beyond their slots.

The sim measures center proximity; it has no concept of rendered body extent. This is the blind spot: **the metric cannot detect overflow of rendered bodies beyond physics slots**. Both master and branch show 0% because the physics is identical, but the branch's rendered bodies are wider than the slots, creating on-screen overlap that the sim cannot see.

---

## 5. Mechanisms by N — what the user sees

| N regime | mechanism | master | branch |
|---|---|---|---|
| N = 40 | 99.6% pulk — 40 racers in dense pack on a 4500 px stretch of a 19 772 px track. No body overflow. Visually crowded by design (short open-track race, rubber-band keeps pack together). | same | same (pre-existing) |
| N ≈ 49–62 | Rendered lateral body (31.7 px) > physics slot (28–34 px). Adjacent racers in the same row have bodies visually intersecting by 2–4 px per pair. A full row of 28–30 racers appears as a continuous overlapping stripe. | **no overflow** | **regression — branch-specific** |
| N = 80 | At rpr=27, slot=31.6 px vs branch body=31.7 px — 0.1 px boundary. Practically no visible overlap; same mechanism as N=60 but rpr staircase puts it at the cusp. | no overflow | ~0 (boundary) |

---

## 6. Verdict

| Question | Answer |
|---|---|
| Is branch liteOverlapRate > master at N=40/60/80? | No — both 0.0% (physics unchanged) |
| Is the large-field overlap pre-existing? | **Partially.** N=40: pulk density is pre-existing. N≈49–62: visual overflow is branch-introduced. |
| Is it a regression? | **Yes at N≈49–62.** The branch renders lateral body 31.7 px into a 28.4 px physics slot. Master renders 26.4 px into the same slot — no overflow. |
| Mechanism at large N? | **Render overflow**, not dead zone (dead zone is gone by N=20). `computeBodyNarrowRef(W_REF=285)` uses 20-per-row reference for a track the physics packs at 30-per-row, producing a body sized for wider slots. |
| Does the sim metric catch this? | **No.** Sim threshold (3.5 px center gap) is 8× smaller than the physics slot (28.4 px). The overflow is in body extent, not center proximity — a metric blind spot. |
| W_REF cap fix (report 10) — does it address this? | No. The cap (`W_REF = min(285, effectiveWidth)`) was designed for narrow tracks (where EW < W_REF). For Space Sprint (EW=426 > 285), the cap never activates; the root cause is that W_REF < EW causes the reference to undercount rpr relative to physics. |
| Fix direction (not in this branch — analysis only) | Cap `bodyNarrow` so that `bodyNarrow × (bodyFillY / bodyFillX) ≤ physSlot`. Equivalently, use `min(bodyNarrow_ref, physSlot × bodyFillNarrow)`. No code change in this branch. |
