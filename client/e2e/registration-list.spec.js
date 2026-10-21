// ============================================================
// File:        registration-list.spec.js
// Path:        client/e2e/registration-list.spec.js
// Project:     RaceArena — REGISTRATION-1 (follow-up 1, the owner's requests of 2026-10-21)
// Description: Coming back after a reload, in the built app. With TWO open registrations a reload of
//              the Setup screen opens the Players tab on "Player registration" with the numbered list
//              at the top, both open cards highlighted, and each one opens its registration; with ONE
//              open registration a reload shows it directly. The list also at a phone's width
//              (390 x 844): the cards stack, equally wide, inside the window. Registrations are opened through the real API
//              by the run's admin and deleted again at the end.
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

/** Call the director's API as the signed-in admin of `page`. */
async function directorCall(page, method, path, body) {
  return page.evaluate(
    async ({ api, method, path, body }) => {
      const r = await fetch(`${api}/api/registrations${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: r.status, body: r.status === 204 ? null : await r.json() };
    },
    { api: E2E.apiUrl, method, path, body }
  );
}

async function openRegistration(page, eventName) {
  const res = await directorCall(page, 'POST', '', {
    trackId: 'dirt-oval',
    capacity: 3,
    eventName,
    closesAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  expect(res.status).toBe(201);
  return res.body;
}

/** Every registration of the team deleted, so each test starts from none open. */
async function deleteAll(page) {
  const list = (await directorCall(page, 'GET', '')).body.registrations;
  for (const r of list) await directorCall(page, 'DELETE', `/${r.id}`);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/setup');
  await deleteAll(page);
});
test.afterEach(async ({ page }) => deleteAll(page));

test('two open registrations: after a reload the numbered list is on top, both highlighted, each opens', async ({
  page,
}) => {
  const a = await openRegistration(page, 'E2E list A');
  const b = await openRegistration(page, 'E2E list B');
  await page.reload();

  await expect(page.getByRole('button', { name: 'Player registration' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  const list = page.getByTestId('registration-list');
  await expect(list).toBeVisible();
  const cards = list.getByTestId('registration-card');
  await expect(cards).toHaveCount(2);
  // Newest first: B is number 1, A number 2; both open and highlighted.
  await expect(cards.nth(0)).toContainText('1E2E list B');
  await expect(cards.nth(1)).toContainText('2E2E list A');
  for (const i of [0, 1]) {
    await expect(cards.nth(i)).toHaveAttribute('data-state', 'open');
    await expect(cards.nth(i)).toHaveClass(/cardOpen/);
  }
  // On top: above the form.
  const listBox = await list.boundingBox();
  const formBox = await page.getByRole('form', { name: 'Open registration' }).boundingBox();
  expect(listBox.y).toBeLessThan(formBox.y);

  for (const [n, r] of [
    [1, b],
    [2, a],
  ]) {
    await page.getByRole('button', { name: `Open registration ${n}: ${r.eventName}` }).click();
    await expect(page.getByTestId('registration-link')).toHaveText(new RegExp(`${r.code}$`));
    await page.getByRole('button', { name: '← Back to all registrations' }).click();
  }
});

test('one open registration: after a reload it is shown directly', async ({ page }) => {
  const only = await openRegistration(page, 'E2E list only');
  await page.reload();
  await expect(page.getByTestId('registration-view')).toBeVisible();
  await expect(page.getByTestId('registration-link')).toHaveText(new RegExp(`${only.code}$`));
});

test('at a phone’s width the cards stack full width', async ({ page }) => {
  await openRegistration(page, 'E2E phone A');
  await openRegistration(page, 'E2E phone B');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const cards = page.getByTestId('registration-card');
  await expect(cards).toHaveCount(2);
  const [one, two] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
  expect(two.y).toBeGreaterThan(one.y + one.height - 1);
  expect(Math.abs(one.width - two.width)).toBeLessThan(1);
  // The list itself fits the phone: every card and its "Open" button end inside the window. (The
  // Setup screen's start-buttons row, with test aids on, is wider than 390 px on master already —
  // recorded on the REGISTRATION-1 morning sheet, not this list's to fix.)
  for (const box of [one, two]) expect(box.x + box.width).toBeLessThanOrEqual(390);
  const button = await cards
    .nth(0)
    .getByRole('button', { name: /^Open registration/ })
    .boundingBox();
  expect(button.x + button.width).toBeLessThanOrEqual(390);
});
