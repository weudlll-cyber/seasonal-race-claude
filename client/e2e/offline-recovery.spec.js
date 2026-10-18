// ============================================================
// File:        client/e2e/offline-recovery.spec.js
// Path:        client/e2e/offline-recovery.spec.js
// Project:     RaceArena — OFFLINE-1 F1, F2, F3 (the owner's decision of 2026-10-18)
//
// THE SERVER DROPS AT THE VENUE AND COMES BACK — ON ONE PAGE, WITH NO RELOAD.
//
// reports/release/OFFLINE-1.md measured three things a viewer or operator noticed. This spec holds
// the fix of each, in the order a venue would meet them, in two real races on ONE page:
//
//   RACE 1, started with the server gone (every /api/** aborted, as race-save.spec.js does):
//     F3  the standings column says "Server not reachable — results are kept and sent later"
//         (the failed track background asks the recovery probe to check once);
//     F1  the race has no track background — the "before";
//     F3  the server comes back mid-race and the note goes away, with nothing clicked.
//   RACE 2, started from the result screen's own Back to Setup — no page load:
//     F1  the track background IS drawn (it used to stay missing until a reload);
//     then the server drops mid-race, so the result goes up PENDING under the red banner, and
//     F2  the server comes back while the result screen is simply left open: the banner clears and
//         the race is stored on the server exactly once — no navigation, no reload.
//
// "No reload" is checked, not assumed: a marker set on `window` at the start must still be there.
// The background is read from the race screen's background canvas, which is transparent until the
// image has been drawn into it.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';
import { E2E } from './e2e-env.js';

const OFFLINE = '**/api/**';
const NOTE = 'Server not reachable — results are kept and sent later';

/** Share of sampled pixels of the race's background canvas that are drawn (alpha > 0). */
function backgroundCoverage(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="race-canvas-wrapper"] canvas');
    if (!canvas || !canvas.width || !canvas.height) return 0;
    const ctx = canvas.getContext('2d');
    const w = Math.min(200, canvas.width);
    const h = Math.min(200, canvas.height);
    const x = Math.floor((canvas.width - w) / 2);
    const y = Math.floor((canvas.height - h) / 2);
    const data = ctx.getImageData(x, y, w, h).data;
    let drawn = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) drawn++;
    return drawn / (w * h);
  });
}

async function history(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('racearena:raceHistory') ?? '[]'));
}

/** How many races the server holds under this client id, asked as this page's signed-in user. */
function storedCount(page, clientRaceId) {
  return page.evaluate(
    async ({ api, id }) => {
      const r = await fetch(`${api}/api/races?limit=100`, { credentials: 'include' });
      const body = await r.json();
      return body.races.filter((x) => x.clientRaceId === id).length;
    },
    { api: E2E.apiUrl, id: clientRaceId }
  );
}

test('the server drops and comes back: note, background and pending race recover on one page', async ({
  page,
}) => {
  // Two real races; each is minutes of wall clock (see race-save.spec.js).
  test.setTimeout(900_000);

  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.evaluate(() => {
    window.__offlineRecoveryNoReload = true;
  });
  const fieldCount = page.locator('input[type="number"]').first();
  await fieldCount.fill('2');

  // ── RACE 1: started with the server gone ───────────────────────────────────────────────────
  await page.route(OFFLINE, (route) => route.abort('internetdisconnected'));
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);

  const note = page.getByTestId('race-server-note');
  await expect(note, 'F3: the standings column says the server is gone').toHaveText(NOTE, {
    timeout: 20_000,
  });
  await expect(page.getByTestId('race-hud').getByTestId('race-server-note')).toBeVisible();
  expect(await backgroundCoverage(page), 'F1 before: no background while offline').toBe(0);

  // The server comes back mid-race. Nothing is clicked; the probe finds it within ~10 s.
  await page.unroute(OFFLINE);
  await expect(note, 'F3: the note goes once the server answers').toHaveCount(0, {
    timeout: 25_000,
  });

  await expect(page).toHaveURL(/\/results/, { timeout: 420_000 });

  // ── RACE 2: from the result screen, no page load ───────────────────────────────────────────
  await page.getByRole('button', { name: /Back to Setup/ }).click();
  await expect(page).toHaveURL(/\/setup/);
  await fieldCount.fill('2');
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);
  await expect
    .poll(() => backgroundCoverage(page), {
      message: 'F1: the next race after recovery has its background, without a reload',
      timeout: 30_000,
    })
    .toBeGreaterThan(0.5);
  expect(await page.evaluate(() => window.__offlineRecoveryNoReload)).toBe(true);

  // The server drops mid-race, so this race's result can only go up later.
  await page.route(OFFLINE, (route) => route.abort('internetdisconnected'));
  const before = await history(page);
  await expect(page).toHaveURL(/\/results/, { timeout: 420_000 });
  await expect
    .poll(async () => (await history(page)).length, { timeout: 15_000 })
    .toBe(before.length + 1);
  const entry = (await history(page))[0];
  expect(entry.sync.state, 'the race ended with the server gone: pending').toBe('pending');
  await expect(page.getByTestId('server-status-banner')).toBeVisible({ timeout: 15_000 });

  // ── F2: the server returns; the result screen is simply left open ──────────────────────────
  await page.unroute(OFFLINE);
  await expect(page.getByTestId('server-status-banner'), 'F2: the banner clears').toHaveCount(0, {
    timeout: 25_000,
  });
  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, {
      message: 'F2: the pending race goes up without a navigation',
      timeout: 15_000,
    })
    .toBe('sent');
  await expect(page).toHaveURL(/\/results/);
  expect(await page.evaluate(() => window.__offlineRecoveryNoReload)).toBe(true);
  expect(await storedCount(page, entry.id), 'stored exactly once').toBe(1);
});
