// ============================================================
// arrival-shape.spec.js — ARRIVAL-SHAPE-E-1
//
// WHAT THIS OWNS: proof that the owner's arrival shape (variant E) can be selected and actually runs
// IN THE BROWSER, and a description of what a person watching would see — his rank when the taper
// starts, the pace he carries when he reaches his drawn place, whether he pulls away afterwards, and
// whether he holds his block.
//
// ★ WHY IT IS A BROWSER TEST. The shape and the servo response were selected by keys while they
// were being measured; they are now simply what the race does, so this opens no door — it checks
// that the shipped behaviour is what a person actually sees in real Chromium, which no node
// harness can answer.
//
// ★ WHAT IT ASSERTS is only what ONE race can carry: the variant is live, he is released and climbs,
// and he is not braked for leading once he is inside his block. The four numbers the decision rests
// on are printed, not asserted — they are distributions, and a single race is one sample of each.
//
// WHAT IT DELIBERATELY DOES NOT ASSERT:
//   · WHICH distance is best. That was the sweep's question and it is answered and shipped.
//   · That he arrives at exactly 1.0. Whether any rank distance can deliver that is the measured
//     question; asserting it here would turn an open finding into a false green.
//   · A finishing place. A racer's NAME is physics here and Quick Test's roster is not the
//     harness's, so the same seed is a different race through this door.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';
import { ARRIVAL_TAPER_START_RANKS } from '../src/modules/racePlanner.js';

const TRACK = /Dirt Oval/;
const SEED = '41003';
// The shipped taper distance, imported rather than restated, so this test cannot describe a race
// the engine is not running.
const TAPER_RANKS = ARRIVAL_TAPER_START_RANKS;

test('the owner s arrival shape is selectable in the browser, and leaves him unsteered in his block', async ({
  page,
}) => {
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
  const drawn = mine[0].d;
  expect(drawn, 'the probe did not report a drawn place').toBeGreaterThan(0);

  const atRelease = mine.filter((s) => s.p <= releaseAt).pop()?.rank ?? mine[0].rank;
  const after = mine.filter((s) => s.p > releaseAt);
  expect(after.length, 'no samples after the release').toBeGreaterThan(5);

  // ── What a person would see, in the order they would see it ────────────────────────────────
  const taperDist = TAPER_RANKS;
  // The frame he first comes within the taper distance of his place — where the drive begins to ease.
  const taperStart = after.find((s) => s.rank <= drawn + taperDist && s.rank > drawn);
  // The frame he first reaches his drawn place, and the pace he is carrying when he does.
  const arrival = after.find((s) => s.rank <= drawn);
  const afterArrival = arrival ? after.filter((s) => s.p >= arrival.p) : [];
  const inBlock = afterArrival.filter((s) => s.rank <= 5);
  const mults = inBlock.map((s) => s.m).filter((m) => m != null);
  const braked = mults.filter((m) => m < 0.999).length;
  const pushed = mults.filter((m) => m > 1.001).length;
  const best = afterArrival.length ? Math.min(...afterArrival.map((s) => s.rank)) : null;
  const worst = afterArrival.length ? Math.max(...afterArrival.map((s) => s.rank)) : null;

  console.log(
    `[arrival-shape] racer ${idx}, drawn ${drawn}:\n` +
      `  rank when he is handed back: ${atRelease}\n` +
      `  rank when the taper starts:  ${taperStart ? taperStart.rank : 'never — he was already inside the taper span or arrived past the front release'}\n` +
      `  pace when he reaches his place: ${arrival?.m != null ? arrival.m.toFixed(4) : 'he never reached it'}` +
      `${arrival ? ` (at progress ${arrival.p.toFixed(3)})` : ''}\n` +
      `  after arriving: best rank ${best}, worst rank ${worst}` +
      `${worst != null ? `, so he ${worst > 5 ? 'FELL OUT of' : 'HELD'} his block` : ''}\n` +
      `  while inside his block: ${mults.length} frames, braked in ${mults.length ? Math.round((100 * braked) / mults.length) : 0}%, ` +
      `pushed in ${mults.length ? Math.round((100 * pushed) / mults.length) : 0}%`
  );

  // ★ THE VARIANT IS LIVE: he is released and climbs, which is the shape running at all.
  expect(best, 'the held racer must climb after being released').toBeLessThan(atRelease);

  // ★ AND HE IS LEFT ALONE INSIDE HIS BLOCK. Today's behaviour steers him to his exact drawn rank
  // there — braking him for leading in about seven frames in ten. Band steering commands 1.0 for the
  // whole block, so neither brake nor push should be common. The bar is deliberately loose: one race
  // is one sample, and it is here to separate "unsteered" from "steered most of the time".
  expect(
    mults.length,
    'he never reached his block, so the shape was never exercised'
  ).toBeGreaterThan(5);
  expect((braked + pushed) / mults.length, 'he must be left alone inside his block').toBeLessThan(
    0.5
  );
});
