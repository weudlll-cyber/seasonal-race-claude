// ============================================================
// File:        legal-pages.spec.js
// Path:        client/e2e/legal-pages.spec.js
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: SIGNED OUT, the start screen's footer offers "Source code", and the operator's legal
//              notice — set through the real API by the run's admin — is linked from the footer and
//              shown at /legal-notice as plain text with its line breaks, markup shown as typed.
//
// The texts are set as the admin `auth.setup.js` created (this project's storageState), then read in
// a FRESH browser context with no cookies — a visitor who never signed in. They are cleared again at
// the end, so no other spec sees a footer it did not expect.
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

const NOTICE = 'LEGAL NOTICE\n\nOperator\nE2E Operator <b>not bold</b>\nSomewhere 1';

/** PUT the legal pages as the signed-in admin of this page's context; returns the HTTP status. */
async function putLegalPages(page, texts) {
  return page.evaluate(
    async ({ api, body }) => {
      const r = await fetch(`${api}/api/settings/legal-pages`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return r.status;
    },
    { api: E2E.apiUrl, body: texts }
  );
}

test('signed out: the footer offers the source code and the operator’s legal notice', async ({
  page,
  browser,
}) => {
  await page.goto('/setup');
  expect(await putLegalPages(page, { legalNotice: NOTICE, privacyPolicy: '' })).toBe(200);

  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const anon = await visitor.newPage();
  try {
    await anon.goto('/login');
    await expect(anon.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    const footer = anon.getByTestId('legal-footer');
    const source = footer.getByRole('link', { name: 'Source code' });
    await expect(source).toBeVisible();
    expect(await source.getAttribute('href')).toMatch(
      /^https:\/\/github\.com\/weudlll-cyber\/seasonal-race-claude(\/tree\/[0-9a-f]+)?$/
    );
    // The privacy policy was left empty, so it has no link.
    await expect(footer.getByRole('link', { name: 'Privacy policy' })).toHaveCount(0);

    await footer.getByRole('link', { name: 'Legal notice' }).click();
    await expect(anon).toHaveURL(/\/legal-notice$/);
    await expect(anon.getByRole('heading', { name: 'Legal notice' })).toBeVisible();
    const text = anon.getByTestId('legal-text');
    // innerText follows the rendering, so line breaks survive only if the page preserves them.
    expect(await text.innerText()).toBe(NOTICE);
    await expect(text.locator('b')).toHaveCount(0);

    // A deep link, typed into the address bar while signed out, serves the page too.
    await anon.goto('/legal-notice');
    await expect(anon.getByTestId('legal-text')).toContainText('E2E Operator <b>not bold</b>');
  } finally {
    await visitor.close();
    expect(await putLegalPages(page, { legalNotice: '', privacyPolicy: '' })).toBe(200);
  }
});
