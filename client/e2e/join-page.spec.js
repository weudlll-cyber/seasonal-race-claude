// ============================================================
// File:        join-page.spec.js
// Path:        client/e2e/join-page.spec.js
// Project:     RaceArena — REGISTRATION-1
// Description: The public join page in a PHONE-SIZED window (390 × 844), signed out: a player opens
//              the link, sees the event, the track, places and time left, joins, and is told "You're
//              in! You are number N of M." — again after a reload, from the same device. A second
//              phone with the same name in another case is refused; a full race, a closed
//              registration and an unknown code each say so. The page fits the phone's width and
//              raises no Content-Security-Policy violation.
//
// The registrations are opened through the real API by the run's admin (this project's
// storageState) and deleted again at the end, so no other spec sees them.
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

const PHONE = { width: 390, height: 844 };

/** Call the director's API as the signed-in admin of `page`; returns { status, body }. */
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

async function openRegistration(page, over = {}) {
  const closesAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const res = await directorCall(page, 'POST', '', {
    trackId: 'dirt-oval',
    capacity: 3,
    eventName: 'E2E Friday cup',
    closesAt,
    ...over,
  });
  expect(res.status).toBe(201);
  return res.body;
}

/** A fresh phone: its own context, no cookies — a visitor who never signed in. */
async function newPhone(browser) {
  const context = await browser.newContext({
    viewport: PHONE,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__cspViolations.push(`${e.effectiveDirective} ${e.blockedURI}`)
    );
  });
  return { context, page };
}

const created = [];
test.afterEach(async ({ page }) => {
  for (const id of created.splice(0)) await directorCall(page, 'DELETE', `/${id}`);
});

test('a phone joins, is told its number, and is remembered after a reload', async ({
  page,
  browser,
}) => {
  await page.goto('/setup');
  const r = await openRegistration(page);
  created.push(r.id);

  const { context, page: phone } = await newPhone(browser);
  try {
    await phone.goto(`/join/${r.code}`);
    await expect(phone.getByRole('heading', { name: 'E2E Friday cup' })).toBeVisible();
    await expect(phone.getByText('Dirt Oval')).toBeVisible();
    await expect(phone.getByTestId('join-places-left')).toHaveText('3 of 3');
    await expect(phone.getByTestId('join-time-left')).toHaveText(/^\d+ min \d\d s$/);
    await expect(phone.getByTestId('legal-footer')).toBeVisible();

    await phone.getByLabel('Your name').fill('Ada');
    await phone.getByRole('button', { name: 'Join' }).click();
    await expect(phone.getByTestId('join-success')).toContainText(
      "You're in! You are number 1 of 3."
    );

    // The same device, after a reload: the same sentence, no field.
    await phone.reload();
    await expect(phone.getByTestId('join-success')).toContainText(
      "You're in! You are number 1 of 3."
    );
    await expect(phone.getByLabel('Your name')).toHaveCount(0);

    // The page fits the phone: no sideways scrolling, and no CSP violation.
    const width = await phone.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(PHONE.width);
    expect(await phone.evaluate(() => window.__cspViolations)).toEqual([]);
  } finally {
    await context.close();
  }
});

test('the same name from another phone is refused; a full race says so', async ({
  page,
  browser,
}) => {
  await page.goto('/setup');
  const r = await openRegistration(page, { capacity: 2 });
  created.push(r.id);

  const phones = [await newPhone(browser), await newPhone(browser), await newPhone(browser)];
  try {
    const [a, b, c] = phones.map((p) => p.page);
    await a.goto(`/join/${r.code}`);
    await a.getByLabel('Your name').fill('Bob');
    await a.getByRole('button', { name: 'Join' }).click();
    await expect(a.getByTestId('join-success')).toBeVisible();

    await b.goto(`/join/${r.code}`);
    await b.getByLabel('Your name').fill('  BOB ');
    await b.getByRole('button', { name: 'Join' }).click();
    await expect(b.getByTestId('join-refusal')).toContainText('"Bob" is already registered');
    await b.getByLabel('Your name').fill('Cy');
    await b.getByRole('button', { name: 'Join' }).click();
    await expect(b.getByTestId('join-success')).toContainText('number 2 of 2');

    await c.goto(`/join/${r.code}`);
    await expect(c.getByText('This race is full.')).toBeVisible();
    await expect(c.getByTestId('join-places-left')).toHaveText('0 of 2');
  } finally {
    for (const p of phones) await p.context.close();
  }
});

test('a closed registration and an unknown code each say so', async ({ page, browser }) => {
  await page.goto('/setup');
  const r = await openRegistration(page);
  created.push(r.id);
  expect((await directorCall(page, 'POST', `/${r.id}/close`)).status).toBe(200);

  const { context, page: phone } = await newPhone(browser);
  try {
    await phone.goto(`/join/${r.code}`);
    await expect(phone.getByText('Registration is closed.')).toBeVisible();
    await expect(phone.getByTestId('join-time-left')).toHaveText('Closed');
    await expect(phone.getByLabel('Your name')).toHaveCount(0);

    await phone.goto(`/join/${'x'.repeat(22)}`);
    await expect(phone.getByText('This registration link is not valid.')).toBeVisible();
  } finally {
    await context.close();
  }
});
