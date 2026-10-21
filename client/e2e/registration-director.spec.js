// ============================================================
// File:        registration-director.spec.js
// Path:        client/e2e/registration-director.spec.js
// Project:     RaceArena — REGISTRATION-1
// Description: The director's side in the built app: on the Setup screen's Players tab, "Player
//              registration" opens a registration for a track; its link and QR code are shown, and
//              the full-screen QR stage fills the window and closes with Escape. A phone (a fresh,
//              signed-out context at 390 × 844) joins through the shown link; the director's live
//              list shows the name within a poll; a removed name leaves the list; "Close now" closes
//              it; "Use these players" puts exactly the registered names into the Players tab and
//              selects the track, so Start Race is ready. Every registration it opens is deleted
//              again through the panel's own button.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

const PHONE = { width: 390, height: 844 };

async function phoneJoins(browser, link, name) {
  const context = await browser.newContext({
    viewport: PHONE,
    storageState: { cookies: [], origins: [] },
  });
  try {
    const phone = await context.newPage();
    await phone.goto(link);
    await phone.getByLabel('Your name').fill(name);
    await phone.getByRole('button', { name: 'Join' }).click();
    await expect(phone.getByTestId('join-success')).toBeVisible();
  } finally {
    await context.close();
  }
}

test('open, share, watch, remove, close, use the players, delete', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);

  await page.getByRole('button', { name: 'Player registration' }).click();
  await page.getByLabel('Track').selectOption('dirt-oval');
  await expect(page.getByTestId('registration-capacity')).toHaveText(/^\d+ places/);
  await page.getByLabel('5 min', { exact: true }).check();
  await page.getByLabel('Event name (optional)').fill('E2E director cup');
  await page.getByRole('button', { name: 'Open registration' }).click();

  const view = page.getByTestId('registration-view');
  await expect(view).toBeVisible();
  const link = (await page.getByTestId('registration-link').textContent()).trim();
  expect(link).toMatch(/\/join\/[A-Za-z0-9_-]{22}$/);
  await expect(view.getByTestId('qr-code')).toBeVisible();

  // The stage view: the code fills most of the window, and Escape closes it.
  await page.getByRole('button', { name: 'Show QR full screen' }).click();
  const stage = page.getByTestId('qr-stage');
  await expect(stage).toBeVisible();
  const box = await stage.getByTestId('qr-code').boundingBox();
  const viewport = page.viewportSize();
  expect(box.height).toBeGreaterThan(viewport.height * 0.5);
  await page.keyboard.press('Escape');
  await expect(stage).toHaveCount(0);

  // Two phones join through the shown link; the director's list shows them within a poll.
  await phoneJoins(browser, link, 'E2E Ada');
  await phoneJoins(browser, link, 'E2E Bob');
  const names = page.getByTestId('registration-names');
  await expect(names).toContainText('E2E Ada', { timeout: 15_000 });
  await expect(names).toContainText('E2E Bob');
  await expect(page.getByTestId('registration-places')).toContainText('2 taken');

  await page.getByRole('button', { name: 'Remove E2E Bob' }).click();
  await expect(names).not.toContainText('E2E Bob');

  await page.getByRole('button', { name: 'Close now' }).click();
  await expect(page.getByText('Registration is closed.')).toBeVisible();

  await page.getByRole('button', { name: 'Use these players' }).click();
  // Back on the names: exactly the registered name, and the track selected.
  await expect(page.getByText(/^1 \/ \d+ players$/)).toBeVisible();
  await expect(page.locator('[class*="playerName"]')).toHaveText(['E2E Ada']);
  await expect(page.getByRole('button', { name: /Start Race/ })).toBeEnabled();

  // Delete it again through the panel.
  await page.getByRole('button', { name: 'Player registration' }).click();
  await page
    .getByRole('button', { name: /^Open registration \d+: E2E director cup$/ })
    .first()
    .click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete registration' }).click();
  await expect(page.getByTestId('registration-view')).toHaveCount(0);
});
