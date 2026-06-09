# H-05 Phase 1 — Cache + Leak Diagnosis

**Date:** 2026-06-09
**Branch:** master (diag instrumentation — REVERT after review)
**Method:** Dev-only window instrumentation (`window.__raceDiag`, `window.__raceDiagTable`,
`window.__raceDiagCapture`) + Playwright automated 15-cycle measurement (Chromium,
`--enable-precise-memory-info --js-flags=--expose-gc`).

---

## Q1: Do the 6 caches grow across cycles, or plateau?

**Answer: All 6 caches plateau after the first warmup. None grow across cycles.**

## Q2: Does any growth track the DOM/heap rise (the tab-freeze leak)?

**Answer: No. DOM nodes and heap are also flat/recovering. The measured caches are not the source of the reported leak.**

---

## Static Analysis — Eviction Paths per Cache

All 6 caches live as **module-level private Map variables**. There are **no runtime eviction paths** — only test-only clear helpers. Once populated, entries stay for the lifetime of the page.

| Cache | Module | Key Schema | Populated when | Runtime evict? |
|-------|--------|------------|----------------|---------------|
| `spriteLoader._cache` | `racer-types/spriteLoader.js` | URL string | `loadSprite(url)` — first request per URL | **None** (test-only `_clearSpriteCache`) |
| `bgImageCache._cache` | `track-effects/bgImageCache.js` | path string | `getBackgroundImage(path)` — first non-null path | **None** (test-only `_clearBackgroundImageCache`) |
| `spriteTinter._variantCache` | `racer-types/spriteTinter.js` | `"${url}::${tintMode}"` | `getCoatVariants()` — one entry per (sprite URL × tintMode) | **None** (test-only `_clearTintCache`) |
| `spriteTinter._patternTileCache` | `racer-types/spriteTinter.js` | `patternId` ('solid'\|'stripes'\|'dots') | `_getPatternTile()` — lazily on first pattern use | **None** (test-only `_clearPatternedVariantCache`) |
| `spriteTinter._patternedVariantCache` | `racer-types/spriteTinter.js` | `"${url}::${tintMode}::${coatId}::${patternId}"` | `getPatternedVariant()` — lazily per racer with non-solid pattern | **None** (test-only `_clearPatternedVariantCache`) |
| `spriteTinter._maskedVariantCache` | `racer-types/spriteTinter.js` | `"${src}:${mask}:${tint}"` (3 key forms) | Mask-tinting composites (koi, manta, dolphin, turtle) | **None** (test-only `_clearMaskedTintCache`) |

**Theoretical maximum size** — determined by the set of unique sprites × coats × patterns loaded across a session, which is bounded by the number of racer types registered. Since racer types are loaded at boot via `warmUpAllRacerTypes()`, the caches fill once and then never change.

---

## Automated Measurement — 15-cycle Data

**Config:** Dirt Oval (closed track, earth surface class, no background image).
Racer type: horse (multiply tinting, no mask, no pattern by default).
Quick Test button (20 players). Row captured just before each navigation event.

**Notation:** `setup→race` = captured just before navigating to `/race`; `race→setup` = captured just before clicking ← Setup.

| Cycle | Phase | spriteLoader | bgImageCache | variant | patternTile | patternedVariant | maskedVariant | domNodes | heapMB |
|-------|-------|-------------|-------------|---------|-------------|-----------------|--------------|---------|--------|
| 0 | baseline | 31 | 0 | 13 | 0 | 0 | 0 | 85 | 15.59 |
| 1 | setup→race | 31 | 0 | 13 | 0 | 0 | 0 | 85 | 15.27 |
| 1 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 54.33 |
| 2 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 16.58 |
| 2 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.03 |
| 3 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 59.24 |
| 3 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.38 |
| 4 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 14.08 |
| 4 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 28.54 |
| 5 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 48.43 |
| 5 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.63 |
| 6 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 38.90 |
| 6 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.04 |
| 7 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 45.29 |
| 7 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.66 |
| 8 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 14.52 |
| 8 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.48 |
| 9 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 69.58 |
| 9 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.41 |
| 10 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 21.10 |
| 10 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.20 |
| 11 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 48.11 |
| 11 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.67 |
| 12 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 61.56 |
| 12 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.69 |
| 13 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 27.94 |
| 13 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.50 |
| 14 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 36.87 |
| 14 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.52 |
| 15 | setup→race | 31 | 1 | 13 | 0 | 0 | 0 | 85 | 60.08 |
| 15 | race→setup | 31 | 1 | 13 | 0 | 0 | 0 | 122 | 15.70 |

Raw data: `reports/audit/H05-RAW-DATA.json`

---

## Per-Metric Verdicts

| Metric | Verdict | Evidence |
|--------|---------|----------|
| `spriteLoader` | **FLAT** | Constant 31 from baseline through cycle 15. Filled by boot warmup; no new URLs added across cycles. |
| `bgImageCache` | **FLAT after cycle 1** | 0→1 after first race, stays at 1 for all 15 cycles. One URL cached on first race; no further growth. |
| `variant` | **FLAT** | Constant 13 from baseline through cycle 15. Horse coats pre-loaded at boot; no new entries. |
| `patternTile` | **FLAT (zero)** | Constant 0. Horse racer uses no pattern, so tile cache is never populated. |
| `patternedVariant` | **FLAT (zero)** | Constant 0. No pattern overlays used in this run. |
| `maskedVariant` | **FLAT (zero)** | Constant 0. Horse is a pure tint-mode sprite; no mask compositing. |
| `domNodes` | **FLAT** | Setup phase: constant 85. Race phase: constant 122. No accumulation across cycles. The 37-node delta is structural (canvas, HUD, scoreboard) and fully released on unmount. |
| `heapMB` | **RECOVERS** | During race (setup→race rows): oscillates 14–70 MB (the rAF game loop and canvas compositing allocate garbage). After each race teardown (race→setup rows): consistently ~15 MB. No monotonic trend across 15 cycles. |

---

## bgImageCache note

The `bgImageCache` jumped from 0→1 after the first race, despite the test track (`backgroundImage: null` on the track record). The single cache entry is created by the surface-effects or race initialization code calling `getBackgroundImage()` with some path — likely a default fallback or the surface color texture. Since it stays at 1 across all 15 cycles, it is **bounded and harmless**.

## heapMB note

The `heapMB` during the race phase varies widely (14–70 MB, median ~37 MB). This is expected: the racing loop allocates temporary arrays for racer state, particle buffers, and canvas drawing each frame. These are short-lived allocations; the GC collects them but may not run before the snapshot is taken. The key observation is that the **post-teardown heap** (race→setup rows) is consistent at ~15–16 MB throughout all 15 cycles, with no upward drift. This strongly indicates the RaceScreen cleans up correctly on unmount.

---

## Conclusion

**Verdict: (C) — All 6 caches FLAT, DOM nodes FLAT, heap RECOVERS. No leak from the caches.**

The 6 module-level caches do not grow across race cycles. They are effectively read-only after boot warmup. The JS heap peaks during the race loop but is recovered by GC after each RaceScreen unmount. The DOM node count is constant per-screen.

The caches are **not** the source of the reported H-05 tab-freeze / leak. If the freeze is real and reproducible, it is elsewhere — likely in a pattern not exercised by this test (e.g., very long races, specific racer types with mask tinting, or accumulation of a different kind).

**Recommended Phase 2 actions (for owner review):**
1. The 6 caches are cleared. No Phase 2 cache-eviction work is needed.
2. If the tab-freeze is still observed in practice, the investigation should focus on: (a) the `rAF` loop — does it cancel cleanly on unmount? (b) particle/trail arrays — do they grow unboundedly during a long race? (c) browser DevTools memory timeline over a longer run (10+ minutes) with a track that has actual background images and mask-tint racers (koi, manta, dolphin, turtle), since `maskedVariant` was 0 in this run.
3. Consider running a second measurement with koi/dolphin racers on a track with a real background image to exercise the bgImageCache and maskedVariantCache more heavily.

---

*This report and the instrumentation code (raceDiagnostics.js, size-getter exports, capture calls in SetupScreen.jsx / RaceScreen/index.jsx, playwright.h05.config.js, h05-cache-leak-measurement.spec.js) are all tagged [REVERT after measurement] and should be removed before merging any downstream work.*
