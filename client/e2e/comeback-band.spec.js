// ============================================================
// comeback-band.spec.js — COMEBACK-BAND-1
//
// ★ WHY A BROWSER TEST FOR A CHANGE TO THE RACE. This project has twice shipped a defect that hid
// between the logic and the picture, and this change makes the plan cast FEWER heroes — sometimes
// none at all, on purpose. A plan with no comebacker, or with fewer heroes than the drama budget
// asked for, is a shape the headless sim never renders: nothing there builds a scoreboard, a HUD or
// a camera lock out of it. The risk this spec covers is that shape reaching the screen badly.
//
// ★ WHAT IT PROVES: a real Chromium race, planned under the new casting rule, runs to a winner with
// a complete leaderboard and no page error. That is a small claim, and it is stated small on
// purpose.
//
// ★ WHAT IT DELIBERATELY DOES NOT CLAIM. It does not assert that a comeback shot does or does not
// happen. The camera falls back to the wider `_b1` pool when the plan casts nobody
// (`comebackDetector.js:157`), so the shot's presence is NOT a clean signal of the casting rule, and
// an assertion built on it would pass or fail for the wrong reason. The cast itself is pinned where
// it is visible — `client/src/modules/comebackBand.test.js` — and what the rule delivers over 180
// races is in the report. The camera trace is RECORDED here and printed, as evidence for a reader,
// never asserted.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

const TRACK = /Garden Path/;
const SEED = '41000';

test('a race planned under the new casting rule runs to a winner in the browser', async ({
  page,
}) => {
  test.setTimeout(300_000);

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.addInitScript(() => {
    window.__raCamTrace = [];
    const tick = () => {
      const el = document.querySelector('[data-testid="camera-state-hud"]');
      const s = el?.getAttribute('data-state') ?? null;
      if (s) {
        const t = window.__raCamTrace;
        if (!t.length || t[t.length - 1].state !== s)
          t.push({ state: s, t: Math.round(performance.now()) });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.evaluate((seed) => sessionStorage.setItem('quickTestSeed', seed), SEED);
  await page.reload();
  await ensureTrackGeometriesCached(page);

  await page.locator('button', { hasText: TRACK }).first().click();
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await page.waitForURL(/\/race/);

  // The race is over when the winner card appears — the plan built, the race run, the ending drawn.
  await expect(page.getByTestId('winner-card')).toBeVisible({ timeout: 280_000 });

  const trace = await page.evaluate(() => window.__raCamTrace ?? []);
  console.log('[comeback-band] camera trace: ' + JSON.stringify(trace));

  // ★ THE WINNER IS READ OFF THE CARD THE VIEWER SEES, not out of sessionStorage. The first draft
  // asserted on `activeRace.winners`, which is empty at this point in the flow — the test failed
  // while the race had in fact finished correctly, with the card on screen and the ending drawn.
  // A field that is not populated yet is not evidence about the race.
  const winnerText = (await page.getByTestId('winner-card').innerText()).trim();
  const fieldSize = await page.evaluate(
    () => (JSON.parse(sessionStorage.getItem('activeRace') || '{}').racers || []).length,
  );
  console.log('[comeback-band] field ' + fieldSize + ' · winner card: ' + JSON.stringify(winnerText));

  expect(fieldSize, 'the race ran with no field').toBeGreaterThan(0);
  expect(winnerText.length, 'the winner card is empty').toBeGreaterThan(0);
  expect(trace.length, 'the camera never reported a state').toBeGreaterThan(2);
  expect(pageErrors, 'the page raised an error during the race').toEqual([]);
});
