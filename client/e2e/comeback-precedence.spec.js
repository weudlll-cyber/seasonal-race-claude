// ============================================================
// comeback-precedence.spec.js — COMEBACK-PRECEDENCE-1
//
// ★ WHY THIS EXISTS AT ALL. The precedence changes WHAT HE SEES, and this project has twice shipped
// a defect that hid in the gap between the logic and the picture: CAMERA-SEED-AND-LINE-1 (every
// harness pinned a camera seed the browser never uses) and RENDER-FINGERPRINT-1 (the draw path could
// not be driven headlessly at all). A unit test and a headless sweep are both on the far side of
// that gap. This spec is on the near side: it reads the camera state out of the DOM of a race
// running in a real Chromium, drawn by the real renderer.
//
// ── ★ WHAT MAKES A COMEBACK CUT *THE PRECEDENCE* AND NOT AN ORDINARY ONE ───────────────────────
//
// The hold gate is `max(minStateHold, maxStateDuration)` and for LEADER_ZOOM and BATTLE_ZOOM that is
// 8000 ms (storage/defaults.js). Without an interrupt the director cannot change state before the
// gate elapses — `transitionDecision.js` returns HELD and `_transition` is never called. So a
// COMEBACK_ZOOM entered out of one of those two states after LESS than the gate is a transition that
// could not have happened on the ordinary path. Of the interrupt slots, only the precedence can
// produce COMEBACK_ZOOM. ★ That inequality is the signature, and it is visible from outside.
//
// THE HUD LAGS BY A FIXED 150 ms (CameraStateHUD.jsx fades out, swaps, fades in). A constant lag
// shifts every change by the same amount and so leaves the INTERVALS between them intact, which is
// what is measured here. The threshold below is held well inside the gate anyway.
//
// WHAT IS NOT ASSERTED, deliberately: "once per comebacker". The DOM cannot tell a forced shot from
// an ordinary one, so counting them here would be a guess wearing an assertion. That limit is pinned
// where it is visible — comebackPrecedence.test.js.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

// The gate for LEADER_ZOOM and BATTLE_ZOOM. Held below the real 8000 ms so the fade's jitter can
// never turn an ordinary hold-elapsed cut into a false claim of an interrupt.
const INSIDE_THE_HOLD_MS = 7500;

// Chosen from the headless sweep as a race whose plan casts a comebacker who climbs. If the race
// simply produces no comeback at all the spec says so and fails, rather than passing vacuously.
const TRACK = /Garden Path/;
const SEED = '41000';

test('the precedence cuts to the comebacker in the browser, and never out of a LEAD_CHANGE', async ({
  page,
}) => {
  test.setTimeout(300_000);

  // The per-frame recorder, installed BEFORE the app so it is running when the race starts. It reads
  // the DOM the renderer produced; it re-derives nothing, which is CAMERA-REPRO-1's own rule.
  await page.addInitScript(() => {
    window.__raCamTrace = [];
    const tick = () => {
      const el = document.querySelector('[data-testid="camera-state-hud"]');
      const s = el?.getAttribute('data-state') ?? null;
      if (s) {
        const trace = window.__raCamTrace;
        const last = trace[trace.length - 1];
        if (!last || last.state !== s) trace.push({ state: s, t: Math.round(performance.now()) });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);

  // Quick Test is the only replayable door (CAMERA-REPRO-1): Start Race sends racePlanSeed 0.
  await page.evaluate((seed) => sessionStorage.setItem('quickTestSeed', seed), SEED);
  await page.reload();
  await ensureTrackGeometriesCached(page);

  await page.locator('button', { hasText: TRACK }).first().click();
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await page.waitForURL(/\/race/);

  // The race is over when the winner card appears. The trace keeps running until then.
  await expect(page.getByTestId('winner-card')).toBeVisible({ timeout: 280_000 });

  const trace = await page.evaluate(() => window.__raCamTrace ?? []);
  console.log('[comeback-precedence] trace: ' + JSON.stringify(trace));

  expect(trace.length, 'the camera-state HUD produced no trace at all').toBeGreaterThan(2);

  // Every entry into COMEBACK_ZOOM, with how long the state before it had been on screen.
  const entries = [];
  for (let i = 1; i < trace.length; i++) {
    if (trace[i].state !== 'COMEBACK_ZOOM' || trace[i - 1].state === 'COMEBACK_ZOOM') continue;
    entries.push({
      from: trace[i - 1].state,
      heldMs: trace[i].t - trace[i - 1].t,
      at: trace[i].t,
    });
  }
  console.log('[comeback-precedence] comeback entries: ' + JSON.stringify(entries));

  expect(entries.length, 'the race never cut to a comeback at all').toBeGreaterThan(0);

  // ★ LIMIT 2, IN THE PICTURE. A comeback shot may never replace a lead change on screen.
  expect(
    entries.filter((e) => e.from === 'LEAD_CHANGE'),
    'a comeback shot cut into a LEAD_CHANGE that was already on screen',
  ).toEqual([]);

  // ★ THE PRECEDENCE ITSELF. At least one comeback cut has to have happened inside the hold, or the
  // browser is running the old behaviour whatever the unit tests say.
  const forced = entries.filter(
    (e) => (e.from === 'LEADER_ZOOM' || e.from === 'BATTLE_ZOOM') && e.heldMs < INSIDE_THE_HOLD_MS,
  );
  expect(
    forced.length,
    `no comeback cut happened inside the ${INSIDE_THE_HOLD_MS} ms hold — entries: ${JSON.stringify(entries)}`,
  ).toBeGreaterThan(0);
});
