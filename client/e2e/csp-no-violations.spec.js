// ============================================================
// File:        csp-no-violations.spec.js
// Path:        client/e2e/csp-no-violations.spec.js
// Project:     RaceArena — AUDIT-1 D1 (2026-10-09)
// Description: With the Content-Security-Policy ON, nothing the app does is blocked by it: every
//              main screen loads and a race runs with ZERO violations.
//
// A policy that blocks something the app needs fails SILENTLY in the product — a sprite that never
// draws, a request that never leaves — so this spec collects every `securitypolicyviolation` event
// the page raises, from the first byte (an init script), and fails on any.
//
// ★ IT CANNOT PASS VACUOUSLY. On the production arm the page comes from our server, which sends the
// policy; the spec asserts the header is there, so "no violations" cannot mean "no policy". On the
// development arm Vite serves the page without a policy, and the header assertion is skipped there
// (the app and the API are on different ports, which is how the spec tells the two arms apart).
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

const PRODUCTION_ARM = E2E.apiUrl === E2E.appUrl;

test('no Content-Security-Policy violation on any main screen or during a race', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__cspViolations.push(
        `${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'} at ${e.sourceFile}:${e.lineNumber}`
      );
    });
  });

  const shell = await page.goto('/setup');
  if (PRODUCTION_ARM) {
    expect(
      shell.headers()['content-security-policy'],
      'the production arm must send the policy'
    ).toMatch(/default-src 'self'/);
  }

  const seen = [];
  const collect = async (where) => {
    const v = await page.evaluate(() => window.__cspViolations.splice(0));
    seen.push(...v.map((x) => `${where}: ${x}`));
  };

  for (const path of ['/setup', '/dev', '/track-editor', '/racer-editor']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await collect(path);
  }

  // A race: sprites become blob: images, the canvas draws, the standings fetch — all of it under the policy.
  await page.goto('/setup');
  await page.waitForLoadState('networkidle');
  const quick = page.getByRole('button', { name: /Quick Test/ });
  await expect(quick).toBeEnabled({ timeout: 30_000 });
  await quick.click();
  await expect(page).toHaveURL(/\/race/);
  await page.waitForTimeout(8_000);
  await collect('/race');

  expect(seen, `the policy blocked something the app does:\n${seen.join('\n')}`).toEqual([]);
});
