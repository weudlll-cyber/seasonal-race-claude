// ============================================================
// arrival-shape.spec.js — ARRIVAL-SHAPE-E-1
//
// WHAT THIS OWNS: proof that the owner's arrival shape (variant E) can be selected and actually runs
// IN THE BROWSER, and a description of what a person watching would see — his rank when his ceiling
// starts, the pace he carries when he reaches his drawn place, whether he pulls away afterwards, and
// whether he holds his block.
//
// ★ WHY IT IS A BROWSER TEST. The shape and the servo response were selected by keys while they
// were being measured; they are now simply what the race does, so this opens no door — it checks
// that the shipped behaviour is what a person actually sees in real Chromium, which no node
// harness can answer.
//
// ★ WHAT IT ASSERTS is only what ONE race can carry: the variant is live, he is released and climbs,
// and — ★ CORRECTED 2026-09-19 — he IS steered inside his block, which is the shipped design since
// `17193be6` deleted band steering after arrival on 2026-09-13. This header said the opposite for six
// days, in step with the assertion at the foot of the file; see the block there for the whole
// account. The four numbers the decision rests on are printed, not asserted — they are
// distributions, and a single race is one sample of each.
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
import { ARRIVAL_CEILING_RANKS } from '../src/modules/racePlanner.js';

const TRACK = /Dirt Oval/;
const SEED = '41003';
// The shipped ceiling span, imported rather than restated, so this test cannot describe a race the
// engine is not running.
const CEIL_RANKS = ARRIVAL_CEILING_RANKS;
// On-screen terms, so the log says what a PERSON would see rather than a multiplier nobody can read.
// The camera runs at roughly 5.7x during an approach (visibleWorldPx median 225 across a 1280
// canvas), and normal pace is 150 world px/s -- so (m-1)*150*1280/225 canvas px/s of closing speed.
const screenPxPerSec = (m) => (m - 1) * 150 * (1280 / 225);

// ★ THE TITLE IS AN ASSERTION TOO, AND THIS ONE WAS FALSE. It said the shape "leaves him unsteered
// in his block" — a test NAME is what gets quoted in reports and commit messages by people who never
// open the file, so a name that states the opposite of the body is how a contradiction survives. It
// now says what the body checks.
test('the owner s arrival shape is selectable in the browser, and steers him back toward his drawn place inside his block', async ({
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
  const taperDist = CEIL_RANKS;
  // The frame he first comes within the ceiling's span — where his own ceiling begins to tighten.
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
      `${arrival?.m != null ? ` — ON SCREEN ${screenPxPerSec(arrival.m).toFixed(0)} px/s of closing speed (untapered 1.100 is 85)` : ''}` +
      `${arrival ? ` (at progress ${arrival.p.toFixed(3)})` : ''}\n` +
      `  after arriving: best rank ${best}, worst rank ${worst}` +
      `${worst != null ? `, so he ${worst > 5 ? 'FELL OUT of' : 'HELD'} his block` : ''}\n` +
      `  while inside his block: ${mults.length} frames, braked in ${mults.length ? Math.round((100 * braked) / mults.length) : 0}%, ` +
      `pushed in ${mults.length ? Math.round((100 * pushed) / mults.length) : 0}%`
  );

  // ★ THE VARIANT IS LIVE: he is released and climbs, which is the shape running at all.
  expect(best, 'the held racer must climb after being released').toBeLessThan(atRelease);

  // ── ★★ AND HE IS STEERED INSIDE HIS BLOCK, LIKE ANY OTHER RACER ────────────────────────────
  //
  // ★ THIS ASSERTION WAS THE WRONG WAY ROUND FROM THE DAY IT WAS WRITTEN, AND IT IS THE SPEC THAT
  // WAS WRONG, NOT THE ENGINE. It read `.toBeLessThan(0.5)` under the heading "AND HE IS LEFT ALONE
  // INSIDE HIS BLOCK" — the behaviour of BAND steering, `strictness = 0`, which commands exactly 1.0
  // anywhere inside the block. Band steering after arrival was deleted by `17193be6`
  // ARRIVAL-STEERED-AGAIN-1 at 17:07 on 2026-09-13, FIFTEEN HOURS after this file was written. That
  // commit turned `arrivalShape.test.js` around to assert the opposite and did not touch this spec,
  // and the browser suite is night work, so nothing ran it for six days (ARRIVAL-BRAKE-1).
  //
  // ★★ THE SHIPPED DESIGN IS AT `racePlanner.js:1400-1409`, in the engine's own words: *"AFTER HE
  // ARRIVES HE IS STEERED, like any other racer … `strictness` therefore stays at the hero's 1.0 and
  // the blend below is exact-rank steering."* What band steering cost was clause 2 — unsteered, he
  // opened 3.3x the pre-shape gap at twenty racers. So the multiplier inside his block is NOT 1.0:
  // he is braked whenever he is better than his drawn place and pushed when he is not.
  //
  // ★★★ THE QUANTITY AND THE BAR ARE UNCHANGED — ONLY THE DIRECTION IS. It is the same
  // `(braked + pushed) / mults.length` against the same 0.5, because the threshold was never the
  // problem; the claim it was pointed at was. **Nothing is loosened.** A `< 0.9` bar would have
  // turned a true statement about a real disagreement into a green line, and ARRIVAL-BRAKE-1
  // refused to write one.
  //
  // ★ IT PASSES WITH MARGIN ON BOTH SETTINGS OF THE GAP BRAKE, which is what makes 0.5 the right
  // side of this measurement rather than a number chosen to fit: ARRIVAL-BRAKE-1 measured this
  // fixture at **0.890 with `gapBrakeEnabled` on and 0.812 with it off** — the brake is not what
  // steers him, the servo is, and its command is never 1.0 while his live rank differs from his
  // drawn place. The deleted claim needed the SAME number under 0.5, and it is nowhere near it on
  // either arm, so this is one measurement deciding between the two readings rather than two bars.
  //
  // ★ WHY THIS IS THE RIGHT SHAPE OF CLAIM rather than a new one invented to be green: "the
  // multiplier is not 1.0 on most in-block frames" is precisely "he is not on band steering", which
  // is the one thing `17193be6` changed. The node test `arrivalShape.test.js` asserts the same
  // design at the unit level — arrived and leading, the commanded multiplier is below 1.0 — and this
  // is that statement in a real browser, over a real race, which no node harness can answer.
  expect(
    mults.length,
    'he never reached his block, so the shape was never exercised'
  ).toBeGreaterThan(5);
  expect(
    (braked + pushed) / mults.length,
    'he must be STEERED inside his block — the multiplier is 1.0 only under band steering, which was deleted on 2026-09-13'
  ).toBeGreaterThan(0.5);
});
