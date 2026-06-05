# Visual Overlap Fix — W_REF Cap

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Backup tag:** `backup/pre-overlap-fix`

---

## Change

**One line in `client/src/screens/RaceScreen/index.jsx`:**

```js
// Before:
const W_REF = 285;

// After:
const W_REF = Math.min(285, effectiveWidth);
```

`effectiveWidth` is the SAME real track width already computed for the physical layout path. No new variable, no new computation.

---

## Physical path: untouched

`displaySizeScale_physical` (frame-based, real width, drives `rowGapPx`/`rowCount`/`spriteWorldSizePx`) is not referenced by the changed line. The `computeRacerLayout(effectiveWidth, ...)` call above it is unchanged. The avoidance system reads `racer.spriteWorldSizePx = physicalSpriteSize` — also unchanged.

**Determinism fingerprint (seed=42, dur=30, 10 races):**

| Track | Type | finishT | rows | Status |
|-------|------|---------|------|--------|
| Dirt Oval | horse | 2.094 | 7 | ✅ identical |
| Dirt Oval | giraffe | 1.885 | 8 | ✅ identical |
| Space Sprint | dragon | 0.218 | 2 | ✅ identical |
| Space Sprint | horse | 2.712 | 7 | ✅ identical |

Byte-identical to pre-fix baseline. The cap touches only the render reference.

---

## Before / after: Garden Path × snail × N=40

| | Before fix (W_REF=285) | After fix (W_REF=95) |
|---|---|---|
| W_REF used | 285 px | **95 px** |
| bodyNarrow (render reference) | 28.50 px | **19.0 px** |
| Physical avoidance slot (`physSlot`) | 23.75 px | 23.75 px (unchanged) |
| Visible body / slot ratio | **1.20× (overflow)** | **0.80× (fits)** |
| Overflow per side | +2.38 px | −2.4 px (no overflow) |

Garden Path snail at a full field (N=40) no longer overflows its physical slot.

---

## Before / after: Space Sprint × rocket × N=40 (wide open track)

| | Before fix | After fix |
|---|---|---|
| effectiveWidth | 285 px | 285 px |
| W_REF | 285 px | **min(285, 285) = 285 px** (unchanged) |
| bodyNarrow | 14.3 px | 14.3 px (unchanged) |
| Physical slot | 40.7 px | 40.7 px (unchanged) |

Wide open tracks are unaffected. W_REF stays 285 whenever effectiveWidth ≥ 285.

---

## Invariant: all 20 racers × all tracks × N ∈ {20, 40, 80}

0 violations across 540 combinations. Verified numerically:

```
bodyNarrow(W_REF=min(285,effW), N, ds, bFN) ≤ physSlot(effW, N, ds)
```

holds for every racer type × every track × N=20, 40, 80.

**Why it holds:** With W_REF ≤ effectiveWidth, the body-narrow packing reference uses a width that is at most as wide as the physical packing. The body-narrow staircase (sized to `ds × bodyFillNarrow`) gives a bodyNarrow ≤ bodyFillNarrow × physSlot ≤ physSlot (since bodyFillNarrow ≤ 1.0). See the guard test for per-combo verification.

---

## Within-track equality: preserved for wide tracks

On Space Sprint / River Run / Mountainstreet / Seatrack (effectiveWidth=285, W_REF=285), all 20 racer types at N=20 return **equal bodyNarrow=28.5 px**. The body-based cross-track equality is fully intact for wide open tracks.

On narrow closed tracks (Garden Path, Dirt Oval, etc.), W_REF = effectiveWidth < 285. Here the staircase breakpoints depend on each racer's `bodyFillNarrow`, so slim and wide racers may receive different bodyNarrow values at the same N. This is the accepted tradeoff of Option C: equality holds within wide tracks, while narrow tracks prioritize no-overflow over cross-type equality.

---

## New overlap guard test (5 tests added)

**`rowLayout.test.js` — describe block `'Overlap guard — visible body ≤ physical avoidance slot'`:**

1. **N=20:** bodyNarrow ≤ physSlot for all 20 racers × 9 tracks (180 combos)
2. **N=40:** same (180 combos)
3. **N=80:** same (180 combos)
4. **Wide-track equality:** All 20 racer types return equal bodyNarrow=28.5 at N=20, W=285
5. **Garden Path snail N=40 regression test:** bodyNarrow ≈ 19.0 < physSlot 23.75 (explicit before/after)

Total covered: 540 (racer × track × N) combinations + 2 targeted assertions.

**Why this test matters:** The determinism fingerprint only covers physics (finishT + rows). This guard covers the render-vs-physical relationship. Together they close the gap: the fingerprint proves physics is unchanged; the guard proves the rendered body fits within the physics slot. If a future change re-introduces W_REF > effectiveWidth, tests 1–3 will fail immediately, catching the regression before any browser test.

---

## vitest result

| Stage | Tests |
|-------|-------|
| Pre-fix (after rebuild) | 2579 / 2579 |
| After fix + guard tests | **2584 / 2584** (+5 new) |

121 test files, all passing.

---

## Browser-check checklist

- [ ] **Garden Path (snail, full field):** Sprites sit in their lanes with visible separation. No sprite stacking or overlap visible at N=20, N=40. Compare to the pre-rebuild look — should feel similar.
- [ ] **City Circuit, Dirt Oval, Ice Track (narrow closed):** Same check — separation visible, no overlap.
- [ ] **Searound (closed, wider corridor):** Check separation. Sprites slightly smaller than on Space Sprint (correct — narrower track).
- [ ] **Space Sprint, River Run (wide open):** Look unchanged from the pre-fix state on this branch. Sprites should appear the same size as before the one-line change.
- [ ] **OVERVIEW on narrow closed tracks:** Racers are somewhat smaller than on wide open tracks. Confirm this feels natural rather than wrong — a narrow track with smaller racers is expected.
- [ ] **LEADER / BATTLE zoom on a narrow closed track:** Note whether the (now smaller) sprites feel appropriate. If they look too small in close-camera phases, that's a follow-up: adjust per-phase multipliers via the Dev Screen "Body size multiplier" sliders. Do NOT change multipliers in this session.
