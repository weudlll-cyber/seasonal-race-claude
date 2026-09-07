// ============================================================
// File:        client/e2e/race-history-never-vanishes.spec.js
// Project:     RaceArena — HISTORY-NEVER-VANISHES-1
//
// ★ THE INVARIANT: A RACE THIS DEVICE HAS RECORDED IS NEVER ABSENT FROM THE LIST.
//
// The owner ran races during a walkthrough and saw no new entry — not from the server, and not as
// a local one. The race was NOT lost: it was on the server, under his team, and the store returned
// it when asked. What was wrong was the LIST.
//
// `RaceHistory.jsx` shows a race that reached the server from the SERVER copy only, and drops the
// local one so it cannot appear twice. That is right when the server page contains it. It is wrong
// whenever the page does NOT: a failed fetch, an empty page, or the race sitting outside the page
// being viewed. Then the local copy is hidden because it was sent, the server copy is not there to
// replace it, and a race the device is holding is on screen nowhere — with nothing saying so.
//
// This test does not simulate the write failing. The write succeeds; the race is real and stored.
// It fails the ONE thing the local-first rule exists to prevent: a race disappearing silently.
//
// ── HOW THE CONDITION IS PRODUCED, and why this way ─────────────────────────────────────────────
// The server page is emptied at the network edge, with `page.route`, AFTER the race has been sent.
// Nothing on the server is changed and no store is edited: the race really is stored, and this is
// the client being asked what it shows when the page it gets back does not carry it. That is the
// shape of every real cause above, without having to reproduce any one of them.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';
import { E2E } from './e2e-env.js';

const HISTORY_KEY = 'racearena:raceHistory';

const history = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), HISTORY_KEY);

async function openHistory(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Race History/i }).click();
  await expect(page.getByRole('heading', { name: /Race History/i })).toBeVisible();
}

test('a race this device recorded is still listed when the server page does not carry it', async ({
  page,
}) => {
  test.setTimeout(900_000);

  // ── 1. A real race, really sent ───────────────────────────────────────────────────────────────
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.locator('input[type="number"]').first().fill('2');
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });
  await expect(page.locator('.screen--result')).toBeVisible();

  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, { timeout: 30_000 })
    .toBe('sent');

  const entry = (await history(page))[0];
  expect(entry, 'the device has the race').toBeTruthy();
  expect(entry.winners.length, 'and it carries who won').toBeGreaterThan(0);
  const winner = entry.winners[0];

  // ── 2. The server page comes back WITHOUT it ──────────────────────────────────────────────────
  // The race is still stored; this is only what the client is handed for the page it is viewing.
  await page.route(`${E2E.apiUrl}/api/races?**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ races: [], hasMore: false, offset: 0, limit: 20, team: 'e2e' }),
    }),
  );

  // ── 3. ★ IT MUST STILL BE ON SCREEN ───────────────────────────────────────────────────────────
  await openHistory(page);
  await expect
    .poll(async () => (await page.locator('table tbody tr').allInnerTexts()).join(' | '), {
      timeout: 20_000,
    })
    .toContain(winner);
});
