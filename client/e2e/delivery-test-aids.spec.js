// ============================================================
// File:        delivery-test-aids.spec.js
// Path:        client/e2e/delivery-test-aids.spec.js
// Project:     RaceArena — TEST-AIDS-1
//
// THE DELIVERY CHECK reports/release/DEV-DISPLAYS-1.md said did not exist: on a FRESH browser profile
// against a FRESH data folder — an installation exactly as it ships — the test-aids switch is OFF and
// none of the gated items is there; an admin turns it ON in the Dev Screen and they are.
//
// ── WHY IT RUNS IN ITS OWN PROJECT, BEFORE EVERY OTHER SPEC ────────────────────────────────────
// The other specs use Quick Test and the probes, which are test aids. They run after
// `testAids.setup.js` turns the switch ON. This one must see the installation BEFORE anyone touched
// the switch, so it runs right after the account is created (`auth.setup.js`) and before that.
//
// ── WHAT IT LOOKS AT ─────────────────────────────────────────────────────────────────────────────
// The DOM for the DOM items — Quick Test (9), the seed tools (11, admin-only either way), the
// distribution page (27), a diagnostic HUD stored ON in this browser (13), the M-key marker (7) — and,
// for the three badges drawn ON the canvas (1–3), every string the page draws with `fillText`,
// recorded by an init script. The hero rings and the re-roll marker are shapes, not text; they are
// held by the unit tests (screens/RaceScreen/testAidsRace.test.jsx).
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

// A FRESH profile: no cookies, no storage — not the shared signed-in state the other specs use.
test.use({ storageState: { cookies: [], origins: [] } });

async function prepare(page) {
  await page.addInitScript(() => {
    window.__raTexts = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      if (window.__raTexts.length < 20000) window.__raTexts.push(String(text));
      return fillText.call(this, text, ...rest);
    };
    // A diagnostic display stored ON in this browser — the switch must win over it.
    localStorage.setItem('racearena:cameraConfig', JSON.stringify({ showCameraDiagnostics: true }));
  });
}

async function signIn(page) {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(E2E.username);
  await page.getByLabel(/password/i).fill(E2E.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
}

/** A normal race — two players, Dirt Oval, three laps — through the real Start Race button. */
async function startRace(page) {
  await page.goto('/setup');
  await page.getByRole('tab', { name: 'Players' }).click();
  for (const name of ['Ada', 'Bob']) {
    await page.getByPlaceholder(/Enter player name/i).fill(name);
    await page.getByRole('button', { name: 'Add' }).click();
  }
  await page.getByRole('tab', { name: 'Track' }).click();
  await page
    .getByRole('button', { name: /Dirt Oval/ })
    .first()
    .click();
  await page.getByRole('button', { name: '3' }).click();
  await page.getByRole('button', { name: /Start Race/i }).click();
  await expect(page).toHaveURL(/\/race/);
  // Past the countdown: a click on the picture skips a ceremony beat (item 6, always on). The lap
  // counter is drawn only after the countdown and is not a test aid, so it marks "racing".
  const canvas = page.locator('canvas.race-canvas');
  for (let i = 0; i < 60; i++) {
    const racing = await page.evaluate(() => window.__raTexts.some((t) => /^LAP \d/.test(t)));
    if (racing) break;
    await canvas.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }
  await expect
    .poll(() => page.evaluate(() => window.__raTexts.some((t) => /^LAP \d/.test(t))))
    .toBe(true);
  await page.waitForTimeout(1500); // a few more frames with every row of the HUD in play
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('activeRace') || '{}'));
}

const drawn = (page, re) =>
  page.evaluate((src) => window.__raTexts.some((t) => new RegExp(src).test(t)), re.source);

test('a fresh installation shows no test aid; an admin turns them on and they are there', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await prepare(page);
  await signIn(page);

  // ── OFF — the installation as it ships ─────────────────────────────────────────────────────
  await page.goto('/setup');
  await expect(page.getByRole('tab', { name: 'Players' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Quick Test/ }), 'item 9').toHaveCount(0);
  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(page.getByTestId('race-seed-input'), 'item 11 stays for an admin').toBeVisible();

  await page.goto('/diagnose-verteilung');
  await expect(page, 'item 27').toHaveURL(/\/setup/);

  const offRace = await startRace(page);
  expect(await drawn(page, /^build /), 'item 1').toBe(false);
  expect(await drawn(page, /^cfg /), 'item 2').toBe(false);
  expect(await drawn(page, /^Race Plan/), 'item 3').toBe(false);
  await expect(page.getByTestId('camera-diagnostics-hud'), 'item 13').toHaveCount(0);
  await page.keyboard.press('m');
  await page.waitForTimeout(300);
  await expect(page.getByText(/^MARK/), 'item 7').toHaveCount(0);
  expect(offRace.racers?.length).toBeGreaterThan(0);

  // ── ON — an admin turns the switch on in the Dev Screen ────────────────────────────────────
  await page.goto('/dev');
  await page.getByRole('button', { name: /Diagnostics and verification/ }).click();
  const box = page.getByTestId('test-aids-switch');
  await expect(box).not.toBeChecked();
  // The box follows the SERVER's answer, so it turns checked when the change is stored, not on click.
  await box.click();
  await expect(box).toBeChecked();

  await page.goto('/setup');
  await expect(page.getByRole('button', { name: /Quick Test/ }), 'item 9').toBeVisible();

  await page.goto('/diagnose-verteilung');
  await page.waitForTimeout(500);
  await expect(page, 'item 27').toHaveURL(/\/diagnose-verteilung/);

  await page.evaluate(() => (window.__raTexts.length = 0));
  const onRace = await startRace(page);
  expect(await drawn(page, /^build /), 'item 1').toBe(true);
  expect(await drawn(page, /^cfg /), 'item 2').toBe(true);
  if (onRace.racePlanEnabled) expect(await drawn(page, /^Race Plan/), 'item 3').toBe(true);
  await expect(page.getByTestId('camera-diagnostics-hud'), 'item 13').toHaveCount(1);
  await page.keyboard.press('m');
  await expect(page.getByText(/^MARK/).first(), 'item 7').toBeVisible();
});
