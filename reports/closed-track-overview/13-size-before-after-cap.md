# Render Size: Current vs. Proposed Cap

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Purpose:** Show exactly how large racers render now, how much the cap would shrink them, and what the user would actually see on screen. No code changed.

---

## The key invariant (read this first)

The OVERVIEW camera is calibrated so the **body-narrow axis** always appears as exactly `overviewTargetScreenPx = 28 px` on screen. Because the lateral on-screen size equals `bodyNarrow × zoom = bodyNarrow × (28 / bodyNarrow)`, the **bodyNarrow terms cancel**:

```
on-screen lateral  =  bodyFillWide / bodyFillNarrow  ×  28 px   (constant for a given racer type)
```

This invariant holds whether the cap is applied or not, because the cap adjusts `bodyNarrow` and the camera re-normalises to the new `bodyNarrow`. The on-screen lateral body width **cannot change** from the cap. What changes is the on-screen slot size — the camera zooms in slightly more, so the same-sized sprites sit in slightly wider slots.

---

## Tables

All world-px values are in the game's world-pixel coordinate space.  
`physSlot` = `computeRacerLayout(effectiveWidth, N, ...).spriteSize` = the physical per-racer lateral slot.  
`bLat_cur` = current rendered lateral body (world-px).  
`bLat_cap` = after applying `bLat ≤ physSlot`.  
`onscr_bLat` = on-screen lateral body at OVERVIEW zoom (px). **Identical before and after cap — see invariant above.**  
`onscr_slot_cur` = on-screen slot width at current (uncapped) zoom.  
`onscr_overlap` = on-screen lateral body − on-screen slot (positive = visible stacking per pair).

### Space Sprint × plane  (effectiveWidth = 427 px, W_REF = 285 px)
body: bfX = 0.836, bfY = 0.930, ratio = 1.112 → on-screen lateral invariant = 1.112 × 28 = **31.1 px**

| N | physSlot | rpr | rows | bLat_cur (world) | overflow (world) | bLat_cap (world) | shrink | onscr_bLat | onscr_slot_cur | onscr_overlap |
|---|---|---|---|---|---|---|---|---|---|---|
| 9 | 94.8 px | 9 | 1 | 70.5 px | 0.0 px | 70.5 px | — | **31.1 px** | 41.9 px | 0.0 px |
| 20 | 42.7 px | 20 | 1 | 31.7 px | 0.0 px | 31.7 px | — | **31.1 px** | 41.9 px | 0.0 px |
| 40 | 42.7 px | 20 | 2 | 31.7 px | 0.0 px | 31.7 px | — | **31.1 px** | 41.9 px | 0.0 px |
| 50 | 34.1 px | 25 | 2 | 37.3 px | **3.2 px** | 34.1 px | 3.2 px (9%) | **31.1 px** | 28.5 px | **2.7 px** |
| 60 | 28.4 px | 30 | 2 | 31.7 px | **3.3 px** | 28.4 px | 3.3 px (10%) | **31.1 px** | 27.9 px | **3.2 px** |
| 80 | 31.6 px | 27 | 3 | 31.7 px | 0.1 px | 31.6 px | 0.1 px (0%) | **31.1 px** | 31.0 px | 0.1 px |

### Garden Path × snail  (effectiveWidth = 99 px, W_REF = 99 px)
body: bfX = 0.727, bfY = 0.938, ratio = 1.290 → on-screen lateral invariant = 1.290 × 28 = **36.1 px**

| N | physSlot | rpr | rows | bLat_cur (world) | overflow (world) | bLat_cap (world) | shrink | onscr_bLat | onscr_slot_cur | onscr_overlap |
|---|---|---|---|---|---|---|---|---|---|---|
| 20 | 28.2 px | 7 | 3 | 25.5 px | 0.0 px | 25.5 px | — | **36.1 px** | 40.0 px | 0.0 px |
| 40 | 24.7 px | 8 | 5 | 25.5 px | 0.8 px | 24.7 px | 0.8 px (3%) | **36.1 px** | 35.0 px | **1.1 px** |

---

## Where the cap bites (and where it does nothing)

| Case | Cap effect |
|---|---|
| Space Sprint × plane × N = 9, 20, 40, 80 | **Nothing.** Body already fits slot. Sizes unchanged. |
| Space Sprint × plane × N ≈ 49–62 | **Bites.** Shrinks world-px lateral body by ~3–4 px (8–10%). |
| Space Sprint × plane × N = 50 | World-px shrink 3.2 px (9%). On-screen: unchanged. |
| Space Sprint × plane × N = 60 | World-px shrink 3.3 px (10%). On-screen: unchanged. |
| Garden Path × snail × N = 20 | **Nothing.** |
| Garden Path × snail × N = 40 | World-px shrink 0.8 px (3%). On-screen: unchanged. |

The cap fires only in the N ≈ 49–62 band on wide tracks (where `rpr_phys > rpr_ref`, see report 12).

---

## What the user actually sees before vs. after the cap

At N = 60 on Space Sprint × plane in OVERVIEW:

**Before cap (current branch):**
- Each plane body: 31.1 px on screen.
- Each lateral slot: 27.9 px on screen.
- Adjacent pair overlap: **3.2 px** — bodies visually cross.
- 30 racers/row → the full row appears as a **continuous overlapping stripe**.

**After cap:**
- Each plane body: **31.1 px on screen** (identical).
- Each lateral slot: 31.2 px on screen (camera zoomed in slightly more).
- Adjacent pair gap: 0.1 px — bodies just clear each other.
- Row of 30 racers looks like **30 distinct sprites with hairline gaps** rather than a merged stripe.

The sprites do not get smaller. The camera zooms in proportionally so the reference body remains 28 px on screen. The only visible difference is slightly more breathing room between sprites in the stacking band.

---

## Plain verdict

**The cap only shrinks racers in the N ≈ 49–62 band on wide tracks (Space Sprint and similarly wide geometries), by ~9–10% in world-px. Everywhere else — all N ≤ 48, N ≥ 63, and all narrow tracks — sizes are completely unchanged.**

Because the OVERVIEW camera normalises to `bodyNarrow`, the on-screen lateral sprite size is invariant under the cap (it equals `bodyFillWide / bodyFillNarrow × 28 px` for every racer type, regardless of N or whether the cap fired). The cap does not make sprites look smaller; it adjusts the camera reference so sprites sit in correctly-sized slots instead of overflowing them.
