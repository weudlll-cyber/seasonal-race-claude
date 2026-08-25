// ============================================================
// quicktest-vs-harness.spec.js — RUNIN-LEVEL-SET-BUILD-1 §15
//
// WHAT THE BROWSER ACTUALLY RUNS for a Quick Test, dumped field by field, so it can be put beside
// what `scripts/lib/raceDriver.mjs` feeds the same race. The owner ran river-run 20 seed 13 and saw
// nothing; the harness measured a width step on that race. Before any conclusion about the step,
// the two paths have to be shown to be the same race — and this spec is the browser half.
//
// It asserts nothing about the step. It only reports, because the question is whether the two
// inputs agree, and an assertion here would be a conclusion smuggled into the evidence.
import { test } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

test('dump what Quick Test actually runs for river-run seed 13', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);

  // The seed field is what routes a seed into a Quick Test — a different path from Start Race.
  await page.evaluate(() => sessionStorage.setItem('quickTestSeed', '13'));
  await page.reload();
  await ensureTrackGeometriesCached(page);

  await page.locator('button', { hasText: /River Run/ }).first().click();
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await page.waitForURL(/\/race/);

  const dump = await page.evaluate(() => {
    const r = JSON.parse(sessionStorage.getItem('activeRace') || '{}');
    return {
      trackId: r.trackId,
      geometryId: r.geometryId,
      racerTypeId: r.racerTypeId,
      raceMode: r.raceMode,
      targetLaps: r.targetLaps ?? null,
      targetDurationSec: r.targetDurationSec ?? null,
      realizedDurationSec: r.realizedDurationSec,
      paceScale: r.paceScale,
      racePlanEnabled: r.racePlanEnabled,
      racePlanSeed: r.racePlanSeed,
      raceActionStage: r.raceActionStage,
      fieldSize: (r.racers || []).length,
      firstEightNames: (r.racers || []).slice(0, 8).map((x) => x.name),
      eventName: r.eventName,
      winners: r.winners,
    };
  });
  console.log('[quicktest] ' + JSON.stringify(dump));
});
