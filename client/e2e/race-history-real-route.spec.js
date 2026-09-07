// ============================================================
// File:        client/e2e/race-history-real-route.spec.js
// Project:     RaceArena — HISTORY-FILTER-SAYS-SO-1
//
// TWO THINGS, AND THE FIRST ONE IS EXPECTED TO PASS ON ARRIVAL.
//
// 1. A STORED RACE OF THE SIGNED-IN USER'S TEAM APPEARS IN THE LIST — through the REAL route, not a
//    mocked page. The owner reported a stored race of his own team missing from his list, so this
//    asserts the thing he could not see. It passes, and that is the finding it records: the fetch
//    and the list are sound. `race-history-never-vanishes.spec.js` covers the case where the server
//    page does NOT carry the race; this one covers the case where it does.
//
// 2. ★ A FILTER MAY HIDE A RACE; IT MAY NOT HIDE THAT IT IS HIDING ONE. The track and date filters
//    apply to BOTH halves of the list, so one left set makes a race that exists in both places
//    appear in neither — and before this piece nothing on screen said so. A date filter on a past
//    month shows that month's races and nothing since, which reads exactly like new races never
//    being recorded. This is the red-before/green-after half.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

const HISTORY_KEY = 'racearena:raceHistory';

const history = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), HISTORY_KEY);

async function openHistory(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Race History/i }).click();
  await expect(page.getByRole('heading', { name: /Race History/i })).toBeVisible();
}

async function runARace(page) {
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.locator('input[type="number"]').first().fill('2');
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });
  await expect(page.locator('.screen--result')).toBeVisible();
}

test('a stored race of this team is in the list — through the real route', async ({ page }) => {
  test.setTimeout(900_000);

  await runARace(page);
  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, { timeout: 30_000 })
    .toBe('sent');
  const entry = (await history(page))[0];

  await openHistory(page);

  // The row is the SERVER's copy, so it carries a short key — that is what makes it the stored one
  // rather than the local fallback.
  await expect(page.getByTestId('short-key').first()).toBeVisible({ timeout: 20_000 });
  const text = (await page.locator('table tbody tr').allInnerTexts()).join(' | ');
  expect(text, 'the stored race is on screen').toContain(entry.winners[0]);
});

test('★ a filter that hides a race says so, and the empty state does not lie', async ({ page }) => {
  test.setTimeout(900_000);

  await runARace(page);
  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, { timeout: 30_000 })
    .toBe('sent');

  await openHistory(page);
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 });

  // A date filter on a month with no races — the shape of "a filter left set from earlier".
  await page.locator('input[type="date"], input[placeholder*="date" i]').first().fill('2020-01-01');

  // ★ The race is now hidden. The screen must say that, and must not claim nothing was recorded.
  await expect(
    page.getByTestId('history-hidden-count'),
    'the list says how many races the filters are holding back',
  ).toBeVisible({ timeout: 10_000 });

  const empty = page.getByTestId('history-empty');
  if (await empty.count()) {
    await expect(empty, 'an empty list caused by a filter must not read as "nothing recorded"').toContainText(
      /match these filters/i,
    );
  }
});
