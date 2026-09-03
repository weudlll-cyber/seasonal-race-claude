// ============================================================
// garden-path-finishes.spec.js — GARDEN-PATH-NO-FINISH-1 (b)
//
// THE OWNER'S OBSERVATION, CONFIRMED IN A REAL BROWSER: garden-path runs to the finish.
//
// ★ WHAT CHANGED, 2026-09-03 (DROP-GP-SPEC-1). This file carried TWO tests and the first is DELETED,
// not repaired. It asserted that the product's own estimate for this track at the harness's two laps
// EXCEEDS the harness's 200 s ceiling — the comparison that made "garden-path does not finish" a
// measurement rather than an argument. **That premise died on 2026-08-25**, when `d73ec6a9` gave the
// track the beetle and two laps: the race now takes about **82 s** at those two laps (4,916 frames at
// 60 Hz, measured by `camera-fingerprint.mjs` on 2026-09-03), so an assertion that the estimate is
// over 200 s is false by more than a factor of two. It is the one deterministic failure
// `docs/NIGHT-RUN.md` records in the browser suite, and it was failing because it was RIGHT to fail.
//
// ★ WHY THE SECOND TEST STAYS, when the piece that removed the first was asked to remove the file.
// It is the ONLY assertion anywhere that garden-path finishes IN A BROWSER. The e2e suite names the
// track in no other file; `scripts/viewer-invariants.mjs` EXCLUDES it from the browser sweep on the
// very claim this test refutes; and the camera and render fingerprints are headless drivers. On
// 2026-09-03 GARDEN-PATH-CLOSE-1 flagged that exclusion DOUBTFUL and filed it open — deleting the
// only browser evidence on the same night would have left the tree less true, which is the one thing
// a hygiene pass may not do.
//
// WHAT THE DELETED TEST'S MECHANISM STILL HAS: `SetupScreen.test.jsx` covers the estimate itself in
// three unit tests — that it renders, that there is no duration slider beside it, and that more laps
// raise it proportionally. Only the garden-path-against-the-ceiling COMPARISON was unique here, and
// that comparison is the part that died.
//
// IT RUNS ON THE E2E INSTANCE'S OWN PORTS AND DATA DIRECTORY (4399/5399, a temp dir), which is
// exactly why it is safe to run while the owner's production build is up on 4173 for an eye-test —
// `e2e-env.js` says those ports were chosen apart for this reason.
//
// THE BUDGET IS NOT THE RACE'S LENGTH. A headless browser on a loaded machine advances the race clock
// more slowly than wall clock, because the rAF accumulator caps catch-up at two physics steps per
// frame (`RaceScreen/index.jsx` → `physicsAccum`). The wall-clock budget below must not be
// read as a statement about how long the race is.
import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

test.describe('garden-path finishes in a browser', () => {
  test('and it actually crosses the line', async ({ page }) => {
    test.slow();
    test.setTimeout(1_800_000);

    await page.goto('/setup?viewerprobe=1');
    await ensureTrackGeometriesCached(page);
    await page.locator('button', { hasText: /Garden Path/ }).first().click();
    await page.getByRole('button', { name: /Quick Test/ }).click();
    await expect(page).toHaveURL(/\/race/);

    await expect
      .poll(() => page.evaluate(() => typeof window.__viewerProbe === 'function'), {
        timeout: 30_000,
      })
      .toBe(true);

    const fieldSize = await page.locator('.scoreboard-card').count();
    expect(fieldSize, 'the scoreboard must be rendering a field').toBeGreaterThan(1);

    const started = Date.now();
    // The probe's own latch, set from `finishedCount > 0` (viewerProbe.js:614) — the SAME field
    // `runRace`'s loop condition reads, which is what makes the two sides comparable at all.
    await expect
      .poll(() => page.evaluate(() => window.__viewerProbe?.()?.crossed === true), {
        timeout: 1_500_000,
        intervals: [5_000],
      })
      .toBe(true);
    const firstCrossingMs = Date.now() - started;

    const finishers = await page.locator('.sb-finish-time').count();
    console.log(
      `[garden-path] field=${fieldSize} FIRST CROSSING after ${(firstCrossingMs / 1000).toFixed(1)} s ` +
        `of wall clock; ${finishers} finish time(s) on the scoreboard at that moment`
    );
    expect(finishers, 'a crossing must put a finish time on the board').toBeGreaterThan(0);
  });
});
