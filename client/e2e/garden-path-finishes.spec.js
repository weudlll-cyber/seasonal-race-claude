// ============================================================
// garden-path-finishes.spec.js
//
// WHAT THIS FILE IS FOR, and it is one claim: **garden-path runs to the finish in a real browser.**
//
// It is the ONLY assertion anywhere that says so. No other e2e spec names the track; the camera and
// render fingerprints are headless drivers; and `scripts/viewer-invariants.mjs --gate` does not RUN
// garden-path — its `GATE_TRACKS` names space-sprint and city-circuit, and the note recorded beside
// it said the track never finishes. If this test goes, that claim has no evidence at all.
// *(Corrected 2026-09-05, GATE-WIRED-AND-CAUSED-1: this line said the sweep "EXCLUDES" the track.
// It does not — there is no exclusion list, no exception and no skip in that file; `GATE_TRACKS`
// NAMES the two tracks the gate runs and eight of the ten are simply not named. The nightly sweep
// runs all ten. The reason this spec exists is unaffected.)*
//
// TRIMMED to exactly that claim on 2026-09-04 (GP-SPEC-TRIM-1), at the owner's decision revising his
// earlier "delete the file": keep only what is needed. The history — a second test that asserted the
// race exceeds a 200 s ceiling, dead since the track took the beetle and two laps on 2026-08-25 —
// lives in `reports/evolution/DROP-GP-SPEC-1.md` and is not retold here.
//
// THE WALL-CLOCK BUDGET IS NOT THE RACE'S LENGTH, and must never be read as one. The race is about
// 82 s of race time (4,916 frames at 60 Hz). A headless browser on a loaded machine advances that
// clock more slowly than the wall, because the rAF accumulator caps catch-up at two physics steps
// per frame (`RaceScreen/index.jsx` → `physicsAccum`). The budget below is ~7x the race's own length,
// which is generous and finite; **if it ever expires, that is a finding and not a budget to raise.**
import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

test('garden-path crosses the line in a browser', async ({ page }) => {
  test.setTimeout(720_000);

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

  // A field must be on the board before waiting ten minutes for one of them to finish — without
  // this, an empty race is indistinguishable from a slow one and the failure is an opaque timeout.
  const fieldSize = await page.locator('.scoreboard-card').count();
  expect(fieldSize, 'the scoreboard must be rendering a field').toBeGreaterThan(1);

  const started = Date.now();
  // The probe's own latch (`viewerProbe.js` → `_crossed`), set from `finishedCount > 0` — the SAME
  // field the headless driver's loop condition reads, which is what makes the two sides comparable.
  await expect
    .poll(() => page.evaluate(() => window.__viewerProbe?.()?.crossed === true), {
      timeout: 600_000,
      intervals: [5_000],
    })
    .toBe(true);

  const finishers = await page.locator('.sb-finish-time').count();
  console.log(
    `[garden-path] field=${fieldSize} FIRST CROSSING after ` +
      `${((Date.now() - started) / 1000).toFixed(1)} s of wall clock; ` +
      `${finishers} finish time(s) on the scoreboard at that moment`
  );
  expect(finishers, 'a crossing must put a finish time on the board').toBeGreaterThan(0);
});
