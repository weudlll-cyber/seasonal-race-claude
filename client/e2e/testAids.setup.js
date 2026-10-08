// ============================================================
// File:        testAids.setup.js
// Path:        client/e2e/testAids.setup.js
// Project:     RaceArena — TEST-AIDS-1
//
// TURNS THE TEST-AIDS SWITCH ON for the specs that use test aids — Quick Test, the probes, the
// camera marker. A fresh installation ships with it OFF (`server/src/settings/testAids.js`), and the
// e2e server is a fresh installation every run. It runs as its own Playwright project, after the
// account exists and after the delivery check has looked at the untouched installation
// (`delivery-test-aids.spec.js`), and before every other spec.
//
// It uses the real endpoint as the admin `auth.setup.js` created, so a failure here names the
// endpoint rather than surfacing later as a missing Quick Test button.
// ============================================================

import { test as setup, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

setup('turn the test-aids switch on for the specs that use test aids', async ({ page }) => {
  await page.goto('/setup');
  const status = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/settings/test-aids`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    return r.status;
  }, E2E.apiUrl);
  expect(status, 'PUT /api/settings/test-aids as the run admin').toBe(200);
});
