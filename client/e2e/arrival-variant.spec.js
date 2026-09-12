// ============================================================
// arrival-variant.spec.js — ARRIVAL-VARIANTS-1
//
// WHAT THIS OWNS: proof that an arrival variant can be selected and actually runs IN THE BROWSER,
// and what a person watching it would see — the held comebacker's rank and the multiplier the servo
// is applying to him, from a real race in real Chromium.
//
// ★ WHY IT MATTERS THAT THIS IS A BROWSER TEST. The variants are selected in node by an env var, and
// the owner watches in a browser, which has neither an env nor a rebuild. The `racearena:arrivalVariant`
// key is the door he will actually use, and a door nobody has opened is a door nobody knows works.
//
// WHAT IT DELIBERATELY DOES NOT ASSERT:
//   · WHICH variant is best. That is 80 races per arm across ten tracks and four field sizes, and it
//     lives in ARRIVAL-VARIANTS-1, measured. A single browser race cannot rank four variants and
//     pretending otherwise would be the false-green shape this chain keeps catching.
//   · A finishing place. A racer's NAME is physics here and Quick Test's roster is not the harness's,
//     so the same seed is a different race through this door.
//   · That he never runs away. The peak gap is a distribution; one race is not one.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

const TRACK = /Dirt Oval/;
const SEED = '41003';

test('an arrival variant is selectable in the browser, and D leaves him unsteered once he arrives', async ({
  page,
}) => {
  test.setTimeout(300_000);

  await page.addInitScript(() => {
    try {
      localStorage.setItem('racearena:holdProbe', '1');
      localStorage.setItem('racearena:arrivalVariant', 'D');
    } catch {
      /* a blocked store fails the assertions below, loudly, rather than here */
    }
  });

  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.evaluate((seed) => sessionStorage.setItem('quickTestSeed', seed), SEED);
  await page.reload();
  await ensureTrackGeometriesCached(page);

  await page.locator('button', { hasText: TRACK }).first().click();
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await page.waitForURL(/\/race/);
  await expect(page.getByTestId('winner-card')).toBeVisible({ timeout: 280_000 });

  const trace = await page.evaluate(() => window.__raHoldTrace ?? []);
  expect(trace.length, 'the hold probe produced no samples — no hero was held').toBeGreaterThan(10);

  const idx = [...new Set(trace.map((s) => s.i))][0];
  const mine = trace.filter((s) => s.i === idx).sort((a, b) => a.p - b.p);
  const releaseAt = mine[0].releaseAt;
  const after = mine.filter((s) => s.p > releaseAt);
  expect(after.length, 'no samples after the release').toBeGreaterThan(5);

  const best = Math.min(...after.map((s) => s.rank));
  const atRelease = mine.filter((s) => s.p <= releaseAt).pop().rank;
  // the frames once he has climbed to within the top five — where the variant decides what happens
  const arrived = after.filter((s) => s.rank <= 5);
  const mults = arrived.map((s) => s.m).filter((m) => m != null);
  const braked = mults.filter((m) => m < 0.999).length;
  console.log(
    `[arrival-variant D] racer ${idx}: at release ${atRelease}, best ${best}, ` +
      `frames in the top five ${arrived.length}, median mult ` +
      `${mults.length ? mults.slice().sort((a, b) => a - b)[Math.floor(mults.length / 2)].toFixed(4) : 'n/a'}, ` +
      `braked in ${mults.length ? Math.round((100 * braked) / mults.length) : 0}% of them`
  );

  // ★ THE VARIANT IS LIVE: he is released and climbs, exactly as the shape requires.
  expect(best, 'the held racer must climb after being released').toBeLessThan(atRelease);

  // ★ AND HE IS NOT BEING HELD BACK ONCE HE IS THERE. Today's behaviour brakes him in about seven
  // frames in ten while he is at the front; D leaves him alone. The bar is deliberately loose — one
  // race is one sample — but it separates "unsteered" from "braked most of the time".
  expect(mults.length, 'he never reached the top five, so the variant was never exercised').toBeGreaterThan(5);
  expect(braked / mults.length, 'variant D must not brake him for most of his time in front').toBeLessThan(0.5);
});
