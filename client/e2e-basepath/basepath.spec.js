// ============================================================
// File:        basepath.spec.js
// Path:        client/e2e-basepath/basepath.spec.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 2
// Created:     2026-11-11
// Description: The built client under /games/race/, driven like a person would (run by
//              playwright.basepath.config.js): sign in, the setup screen loads, the copied join
//              link carries the base path, a race starts — and over the whole visit no request
//              answered 404, and the racers' sprites and the fonts were loaded from below the base
//              path. A wrong relative URL anywhere in the build shows up here as a 404 or as a file
//              asked for at the root, which the server answers 404 since nothing lives there.
// ============================================================

import { test, expect } from '@playwright/test';
import { BASEPATH_ARM as ARM } from './basepath-env.js';

const BASE = ARM.appUrl; // http://localhost:4699/games/race

test('sign in, set up, join link and a race — all under /games/race/, with no 404', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);

  // Every answer the page receives, so the end of the test can say which ones failed.
  const failed = [];
  const loaded = [];
  page.on('response', (res) => {
    const url = res.url();
    // 404 (a URL that points nowhere) and 5xx; a 401 before sign-in is the app asking, not a fault.
    if (res.status() === 404 || res.status() >= 500) failed.push(`${res.status()} ${url}`);
    else loaded.push(url);
  });

  // ── 1. The first admin, through the API under the base path ──────────────────────────────────
  const created = await request.post(`${BASE}/api/auth/setup`, {
    headers: { 'x-bootstrap-token': ARM.bootstrapToken },
    data: { username: ARM.username, password: ARM.password },
  });
  expect(created.ok(), `first-run setup under the base path (${created.status()})`).toBeTruthy();

  // ── 2. Sign in through the page ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/username/i).fill(ARM.username);
  await page.getByLabel(/password/i).fill(ARM.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(`${BASE}/setup`, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Player registration' })).toBeVisible();

  // Quick Test is a test aid; a fresh install ships with the switch off (as e2e/testAids.setup.js).
  const aids = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/settings/test-aids`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    return r.status;
  }, BASE);
  expect(aids).toBe(200);
  await page.reload();

  // ── 3. The join link a director copies carries the base path ────────────────────────────────
  await page.getByRole('button', { name: 'Player registration' }).click();
  await page.getByLabel('Track').selectOption('dirt-oval');
  await page.getByLabel('5 min', { exact: true }).check();
  await page.getByRole('button', { name: 'Open registration' }).click();
  const link = (await page.getByTestId('registration-link').textContent()).trim();
  expect(link).toMatch(/^http:\/\/localhost:4699\/games\/race\/join\/[A-Za-z0-9_-]{22}$/);
  // ...and it opens the join page, still under the base path. A player joins, and after a reload is
  // still recognised: the device cookie is scoped below the base path (routes/join.js), so the
  // browser sends it back.
  const phone = await page.context().browser().newContext();
  const joinPage = await phone.newPage();
  await joinPage.goto(link);
  await joinPage.getByLabel('Your name').fill('Base Path Ada');
  await joinPage.getByRole('button', { name: 'Join' }).click();
  await expect(joinPage.getByTestId('join-success')).toBeVisible();
  await joinPage.reload();
  await expect(joinPage.getByTestId('join-success')).toContainText('Base Path Ada');
  await phone.close();
  await page.getByRole('button', { name: 'Delete registration' }).click();

  // ── 4. A race starts, and its racers are drawn ──────────────────────────────────────────────
  await page.goto(`${BASE}/setup`);
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/race`), { timeout: 20_000 });
  await expect
    .poll(() => loaded.filter((u) => /\/assets\/racers\/.+\.png$/.test(u)).length, {
      timeout: 30_000,
      message: 'the racers’ sprites were loaded',
    })
    .toBeGreaterThan(0);
  await page.waitForTimeout(3_000); // a few seconds of racing, so late loads are seen too

  // ── 5. What the whole visit asked for ───────────────────────────────────────────────────────
  const sprites = loaded.filter((u) => /\.png$/.test(u) && u.includes('/assets/racers/'));
  const fonts = loaded.filter((u) => /\.woff2$/.test(u));
  expect(
    sprites.every((u) => u.startsWith(`${BASE}/`)),
    sprites.join('\n')
  ).toBe(true);
  expect(fonts.length, 'the fonts were loaded').toBeGreaterThan(0);
  expect(
    fonts.every((u) => u.startsWith(`${BASE}/fonts/`)),
    fonts.join('\n')
  ).toBe(true);
  expect(failed, 'no request may answer 404 or 5xx anywhere on the visit').toEqual([]);
});
