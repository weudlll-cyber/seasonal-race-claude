// ============================================================
// garden-path-finishes.spec.js — GARDEN-PATH-NO-FINISH-1 (b)
//
// THE OWNER'S OBSERVATION, CONFIRMED IN A REAL BROWSER: garden-path runs to the finish.
//
// WHY THIS EXISTS. Three headless sweeps recorded garden-path producing NO finishing order —
// 16 of 16, then 0 of 120, then again — and every figure this project holds for that track rests on
// races that never ended. The owner has watched it FINISH on screen. This spec is the browser half
// of that comparison, so the gap is measured rather than argued.
//
// IT RUNS ON THE E2E INSTANCE'S OWN PORTS AND DATA DIRECTORY (4399/5399, a temp dir), which is
// exactly why it is safe to run while the owner's production build is up on 4173 for an eye-test —
// `e2e-env.js` says those ports were chosen apart for this reason.
//
// TWO TESTS, AND THE FIRST IS THE ONE THAT SETTLES IT.
//   1. WHAT THE PRODUCT ITSELF SAYS THE RACE IS. The setup screen prints its own estimate per lap
//      choice. If the product's estimate exceeds the harness's 200 s ceiling, the harness is cutting
//      a race the product considers ordinary — and that is a comparison of the two paths' own
//      numbers, needing no four-minute race to make it.
//   2. THAT IT ACTUALLY CROSSES. Slower, and budgeted generously: a headless browser on a loaded
//      machine advances the race clock more slowly than wall clock, because the rAF accumulator caps
//      catch-up at two physics steps per frame (RaceScreen index.jsx:988). So the wall-clock budget
//      here is not the race's length and must not be read as one.
import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

/** scripts/lib/raceDriver.mjs runRace: `while (... && ts - raceStart < 200000)`. */
const HARNESS_CEILING_S = 200;

test.describe('garden-path against the harness ceiling', () => {
  test("the product's own estimate for this track exceeds the harness ceiling", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/setup');
    await ensureTrackGeometriesCached(page);
    await page.getByRole('tab', { name: 'Track' }).click();
    await page.getByRole('button', { name: /Garden Path/ }).first().click();

    const readEstimate = async (laps) => {
      await page.getByTestId(`lap-choice-${laps}`).click();
      const txt = await page.getByTestId('closed-track-estimated-duration').innerText();
      const m = txt.match(/(\d+(?:\.\d+)?)/);
      return { txt: txt.trim(), seconds: m ? Number(m[1]) : null };
    };

    const rows = [];
    for (const laps of [1, 2, 3, 4]) rows.push({ laps, ...(await readEstimate(laps)) });
    for (const r of rows) console.log(`[garden-path] ${r.laps} lap(s): estimate "${r.txt}"`);

    // THE TRACK'S OWN DEFAULT is what a Quick Test runs, and it is 4 laps here (defaultDuration 120
    // -> legacyLapsFromDefaultDuration). The harness hardcodes 2 for EVERY closed track.
    const atHarnessLaps = rows.find((r) => r.laps === 2);
    expect(atHarnessLaps.seconds, 'the estimate must be readable').not.toBeNull();
    console.log(
      `[garden-path] at the harness's own 2 laps the product estimates ${atHarnessLaps.seconds} s, ` +
        `against a ${HARNESS_CEILING_S} s ceiling`
    );
    expect(
      atHarnessLaps.seconds,
      'if the product estimated UNDER the ceiling, the ceiling could not be the cause'
    ).toBeGreaterThan(HARNESS_CEILING_S);
  });

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
