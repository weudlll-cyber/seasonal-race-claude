// ============================================================
// held-comebacker.spec.js — DIRECTION-AUTHORITY-1
//
// WHAT THIS OWNS: proof that the HOLD-AND-RELEASE comebacker exists in a REAL browser race — cast,
// actually held back through the field, and actually let go at the release — drawn by the real
// renderer on the real engine.
//
// ★ WHY A BROWSER TEST AT ALL. The shape changes what the owner SEES, and this project has twice
// shipped a defect that hid in the gap between the logic and the picture: CAMERA-SEED-AND-LINE-1
// (every harness pinned a camera seed the browser never uses) and RENDER-FINGERPRINT-1 (the draw
// path could not be driven headlessly). A unit test and a headless sweep are both on the far side
// of that gap; this spec is on the near side.
//
// ★ HOW IT SEES THE RACE. Through `racearena:holdProbe`, which is INERT unless switched on — the
// same shape as the race-inputs probe beside it in RaceScreen/index.jsx, and it exists for the same
// reason: without an observable this spec could only RE-DERIVE the rank it is meant to be checking,
// which is not a check. The probe reports the PLAN's own idea of who is held (`getHeldRelease`) and
// the live rank off the same sorted field the scoreboard uses.
//
// ★ WHAT IT DELIBERATELY DOES NOT ASSERT — and this is the honest limit of a browser test here:
//
//   · A PARTICULAR FINISHING PLACE, or that this racer reaches the top 5. A racer's NAME is physics
//     in this project (`stablePairBit` hashes it), and Quick Test's auto-filled players are not the
//     harness's roster, so the SAME seed is a DIFFERENT race here than in the sweep. Pinning a place
//     measured headlessly would be pinning a number this door cannot reproduce. How often he reaches
//     the top 5, and how many places he gains, are race outcomes over ten tracks and four field
//     sizes; they are measured in the DIRECTION-AUTHORITY-1 report.
//   · HOW DEEP he is held. At Quick Test's 20 racers the staging rank is single digits and the whole
//     field is shallow; depth is a field-size question and belongs to the sweep.
//
// What IS asserted is what this door can actually settle: that the shape is LIVE here — a held hero
// exists, he is held BACKWARDS from where he started the hold, and the release happens where it is
// supposed to and actually releases him.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

const TRACK = /Dirt Oval/;
const SEED = '41003';

test('the comebacker is held back and then released, in a real browser race', async ({ page }) => {
  test.setTimeout(300_000);

  await page.addInitScript(() => {
    try {
      localStorage.setItem('racearena:holdProbe', '1');
    } catch {
      /* a blocked store fails the assertions below, loudly, rather than here */
    }
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

  await expect(page.getByTestId('winner-card')).toBeVisible({ timeout: 280_000 });

  const trace = await page.evaluate(() => window.__raHoldTrace ?? []);
  expect(
    trace.length,
    'the hold probe produced no samples at all — either it did not switch on, or no hero was held'
  ).toBeGreaterThan(10);

  // One held racer per race by construction; take whoever the PLAN named.
  const held = [...new Set(trace.map((s) => s.i))];
  expect(held.length, `expected one held hero, the plan named ${held.length}`).toBe(1);
  const idx = held[0];
  const mine = trace.filter((s) => s.i === idx).sort((a, b) => a.p - b.p);

  const releaseAt = mine[0].releaseAt;
  expect(releaseAt, 'the plan carried no release progress for the held hero').toBeGreaterThan(0);

  const duringHold = mine.filter((s) => s.p <= releaseAt);
  const afterRelease = mine.filter((s) => s.p > releaseAt);
  expect(duringHold.length, 'no samples before the release').toBeGreaterThan(5);
  expect(afterRelease.length, 'no samples after the release').toBeGreaterThan(5);

  const startRank = duringHold[0].rank;
  const deepestHeld = Math.max(...duringHold.map((s) => s.rank));
  const atRelease = duringHold[duringHold.length - 1].rank;
  const bestAfter = Math.min(...afterRelease.map((s) => s.rank));
  console.log(
    `[held-comebacker] racer ${idx}: hold starts at rank ${startRank}, deepest ${deepestHeld}, ` +
      `at release ${atRelease}, best after release ${bestAfter} (release ${releaseAt})`
  );

  // ★ HE IS ACTUALLY HELD BACKWARDS. A bigger rank number is further back, so the hold has to take
  // him DEEPER than where it found him — that is the whole shape, and it is what a hold that never
  // engaged would fail.
  expect(
    deepestHeld,
    `the held hero never went backwards: start ${startRank}, deepest ${deepestHeld}`
  ).toBeGreaterThan(startRank);

  // ★ AND HE IS ACTUALLY LET GO. After the release his curve is over and he is steered to his drawn
  // place, so his rank must MOVE FORWARD from where the hold left him. A release that never fired
  // would leave him pinned at the staging rank for the rest of the race.
  expect(
    bestAfter,
    `the held hero was never released: at release ${atRelease}, best afterwards ${bestAfter}`
  ).toBeLessThan(atRelease);
});
