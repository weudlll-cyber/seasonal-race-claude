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
//
// And the footer is VISIBLE WITHOUT SCROLLING (decided 2026-10-18): on the sign-in screen and each
// setup tab, at four window sizes, the bar is inside the viewport as the page opens; scrolled to the
// end, no content and no button lies under the bar. And there is NO SCROLLBAR WHEN THE CONTENT FITS
// (decided the same day, after a page whose content fitted scrolled by a few pixels): the page is
// never taller than the window unless its content, plus the bar's height, is.
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';
import { ensureTrackGeometriesCached } from './appReady.js';

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
    // Polled, not read once: the page shows "Loading…" until its own fetch answers, and the heading
    // above is drawn before that — React 19 paints it sooner than 18 did, so a single read caught
    // "Loading…" 2 runs in 3 (A7-03 piece 5, 2026-10-19).
    await expect.poll(() => text.innerText()).toBe(NOTICE);
    await expect(text.locator('b')).toHaveCount(0);

    // A deep link, typed into the address bar while signed out, serves the page too.
    await anon.goto('/legal-notice');
    await expect(anon.getByTestId('legal-text')).toContainText('E2E Operator <b>not bold</b>');
  } finally {
    await visitor.close();
    expect(await putLegalPages(page, { legalNotice: '', privacyPolicy: '' })).toBe(200);
  }
});

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1900, height: 990 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
];

/**
 * The page's height against what it needs: `contentBottom` is the bottom of the lowest content BOX —
 * every element except the page's own containers (any ancestor of the footer spacer), the stretching
 * main area (`flex-grow` > 0, which fills the window whatever it holds), fixed elements and the bar
 * and spacer themselves. In practice: the bottom card. `lowestButton` is the lowest visible button.
 * All in page coordinates (scroll-independent).
 */
function pageFit(page) {
  return page.evaluate(() => {
    const spacer = document.querySelector('[data-testid="legal-footer-spacer"]');
    const bar = document.querySelector('[data-testid="legal-footer"]');
    const isFixed = (el) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        if (getComputedStyle(e).position === 'fixed') return true;
      }
      return false;
    };
    let contentBottom = 0;
    let lowestButton = { bottom: 0, what: 'none' };
    for (const el of document.body.querySelectorAll('*')) {
      if (el === spacer || el.contains(spacer) || el.closest('[data-testid="legal-footer"]')) {
        continue;
      }
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (Number(style.flexGrow) > 0 || isFixed(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const bottom = r.bottom + window.scrollY;
      contentBottom = Math.max(contentBottom, bottom);
      if (el.matches('button') && bottom > lowestButton.bottom) {
        lowestButton = { bottom, what: el.textContent.trim().slice(0, 30) };
      }
    }
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      barHeight: bar.getBoundingClientRect().height,
      contentBottom,
      lowestButton,
    };
  });
}

/** The bar's and the spacer's boxes and the window, read in the page — no scrolling done here. */
function footerGeometry(page) {
  return page.evaluate(() => {
    const box = (el) => el && el.getBoundingClientRect().toJSON();
    const bar = document.querySelector('[data-testid="legal-footer"]');
    return {
      bar: box(bar),
      // > 0 when the links do not fit on the bar's one line and it would scroll sideways.
      barOverflow: bar.scrollWidth - bar.clientWidth,
      spacer: box(document.querySelector('[data-testid="legal-footer-spacer"]')),
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollY: window.scrollY,
    };
  });
}

/**
 * Opens `path` (and each of `tabs`, by name), then checks the bar is on screen untouched, the page is
 * no taller than its content needs, and the bar covers nothing scrolled to the end.
 */
async function expectFooterAlwaysVisible(page, path, ready, tabs = [null]) {
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto(path);
    await expect(ready(page)).toBeVisible();
    for (const tab of tabs) {
      if (tab) await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
      await expectFooterFits(
        page,
        `${path}${tab ? ` ${tab}` : ''} at ${size.width}x${size.height}`
      );
    }
  }
}

/** The checks for one screen state, at the current window size. */
async function expectFooterFits(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));

  const opened = await footerGeometry(page);
  expect(opened.scrollY, `${label}: opened at the top`).toBe(0);
  expect(opened.bar.top, `${label}: bar top inside the window`).toBeGreaterThanOrEqual(0);
  expect(opened.bar.bottom, `${label}: bar bottom inside the window`).toBeLessThanOrEqual(
    opened.vh + 0.5
  );
  expect(opened.bar.height, `${label}: bar has a height`).toBeGreaterThan(0);
  // No sideways overflow of the page from the bar.
  expect(opened.bar.right, `${label}: bar within the width`).toBeLessThanOrEqual(opened.vw + 0.5);
  expect(opened.barOverflow, `${label}: all links fit on the bar's line`).toBeLessThanOrEqual(0);

  // NO SCROLLBAR WHEN THE CONTENT FITS: the page may be taller than the window only by what the
  // content plus the bar's height needs — so content that fits above the bar gives no scrollbar.
  const fit = await pageFit(page);
  const needed = Math.max(fit.innerHeight, Math.ceil(fit.contentBottom + fit.barHeight));
  expect(
    fit.scrollHeight,
    `${label}: page ${fit.scrollHeight} px, window ${fit.innerHeight} px, content needs ${needed} px`
  ).toBeLessThanOrEqual(needed + 1);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const end = await footerGeometry(page);
  expect(end.bar.bottom, `${label}: bar still at the bottom when scrolled`).toBeCloseTo(end.vh, 0);
  expect(end.spacer.height, `${label}: spacer as tall as the bar`).toBeCloseTo(end.bar.height, 0);
  // Scrolled to the end, no piece of the screen's content lies under the bar.
  const lowest = await lowestContent(page);
  expect(
    lowest.bottom,
    `${label}: lowest content (${lowest.what}) clear of the bar`
  ).toBeLessThanOrEqual(end.bar.top + 0.5);
  // …and the last button (the bottom card's Start Race on the setup screen) fully above it.
  const scrolled = await pageFit(page);
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(
    scrolled.lowestButton.bottom - scrollY,
    `${label}: last button "${scrolled.lowestButton.what}" fully above the bar`
  ).toBeLessThanOrEqual(end.bar.top + 0.5);
}

/**
 * The lowest bottom edge of the screen's CONTENT in the window: text-bearing leaves and controls,
 * not the containers whose background runs to the window's edge, nor the bar and its spacer.
 */
function lowestContent(page) {
  return page.evaluate(() => {
    const skip = (el) =>
      el.closest('[data-testid="legal-footer"], [data-testid="legal-footer-spacer"]');
    const controls = 'a, button, input, select, textarea, img, canvas, label';
    let lowest = { bottom: -Infinity, what: 'nothing' };
    for (const el of document.body.querySelectorAll('*')) {
      if (skip(el)) continue;
      const isLeaf = el.children.length === 0 && el.textContent.trim() !== '';
      if (!isLeaf && !el.matches(controls)) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom > lowest.bottom) {
        lowest = {
          bottom: r.bottom,
          what: `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}"`,
        };
      }
    }
    return lowest;
  });
}

test('the footer is visible without scrolling and covers nothing — sign-in and setup', async ({
  page,
  browser,
}) => {
  // Both texts filled in, so the bar carries all three links — its widest form.
  await page.goto('/setup');
  expect(await putLegalPages(page, { legalNotice: NOTICE, privacyPolicy: 'P' })).toBe(200);
  const allThree = (p) =>
    p.getByTestId('legal-footer').getByRole('link', { name: 'Privacy policy' });

  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const anon = await visitor.newPage();
  try {
    // Setup, as the run's signed-in admin.
    await expectFooterAlwaysVisible(page, '/setup', allThree, ['Players', 'Track', 'Settings']);
    // Sign-in, as a visitor who never signed in.
    await expectFooterAlwaysVisible(anon, '/login', allThree);
  } finally {
    await visitor.close();
    expect(await putLegalPages(page, { legalNotice: '', privacyPolicy: '' })).toBe(200);
  }
});

// COMPACT SETUP SCREEN (decided 2026-10-18): on a desktop window of 900 px or more, each setup tab
// fits WITHOUT SCROLLING, its bottom card ("Start Race") fully above the footer bar — measured in
// the fullest state the tabs reach: the player list at its height cap (eight players), a track
// selected (its racer, surface and laps rows shown), and this run's test aids on (Quick Test in the
// bottom card). The phone layout is not affected and is checked by the test above.
const COMPACT_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1900, height: 990 },
  { width: 1900, height: 900 },
  { width: 1440, height: 900 },
];

test('the setup screen fits a 900 px desktop window on every tab, bottom card above the bar', async ({
  page,
}) => {
  await page.setViewportSize(COMPACT_SIZES[0]);
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  for (const name of ['Anna', 'Ben', 'Cleo', 'Dan', 'Eva', 'Finn', 'Gina', 'Hugo']) {
    await page.getByPlaceholder(/player name/i).fill(name);
    await page.getByRole('button', { name: /^Add$/ }).click();
  }
  await page.getByRole('tab', { name: /^Track/ }).click();
  await page.locator('main section button[title="City Circuit"]').click();
  await expect(page.getByTestId('racer-type-select')).toBeVisible();

  for (const size of COMPACT_SIZES) {
    await page.setViewportSize(size);
    for (const tab of ['Players', 'Track', 'Settings']) {
      await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      const label = `${tab} at ${size.width}x${size.height}`;
      // Polled, not read once: a resize and a tab switch settle over a few frames, and a single read
      // straight after them caught a layout still in flux (920 px for one frame at 1440x900).
      const measure = () =>
        page.evaluate(() => {
          const card = document.querySelector('main').lastElementChild.getBoundingClientRect();
          const bar = document
            .querySelector('[data-testid="legal-footer"]')
            .getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollHeight - window.innerHeight,
            cardBelowBar: card.bottom - bar.top,
          };
        });
      await expect
        .poll(async () => (await measure()).overflow, {
          message: `${label}: no scrollbar (px the page is taller than the window)`,
          timeout: 3_000,
        })
        .toBeLessThanOrEqual(0);
      await expect
        .poll(async () => (await measure()).cardBelowBar, {
          message: `${label}: bottom card fully above the bar (px it reaches below the bar's top)`,
          timeout: 3_000,
        })
        .toBeLessThanOrEqual(0.5);
    }
  }
});
