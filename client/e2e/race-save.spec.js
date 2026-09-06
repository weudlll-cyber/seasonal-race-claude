// ============================================================
// File:        client/e2e/race-save.spec.js
// Path:        client/e2e/race-save.spec.js
// Project:     RaceArena — RACE-SAVE-3
//
// THE SERVER IS GONE, A REAL RACE RUNS TO THE END ANYWAY, AND THE RESULT GOES UP WHEN IT RETURNS.
//
// ── WHY THIS IS ONE RACE AND NOT THREE ──────────────────────────────────────────────────────────
// A race here is minutes of wall clock — the browser advances the physics clock more slowly than
// the wall, which `garden-path-finishes.spec.js` already measures and budgets for. So this runs ONE
// real race, with the server unreachable for the whole of it, which is the hardest case and
// contains the easy one: if a race completes, records and later uploads with the server down, the
// path with the server up is the same path minus the waiting.
//
// ── HOW "THE SERVER IS STOPPED" IS DONE ─────────────────────────────────────────────────────────
// Every `/api/**` request is ABORTED at the network layer, which is what the client sees when a
// backend is stopped: no answer, no status. Killing the Playwright-managed API process instead
// would take the whole run's server down for every later spec, and would prove nothing extra — the
// client cannot tell the two apart, and `apiClient.js`'s own split is exactly on "was there a
// status" (see serverStatus.js).
//
// ── WHAT THIS SPEC DOES NOT ASSERT, AND WHY ─────────────────────────────────────────────────────
// It does not read the stored race back from the server, because THIS PIECE DELIBERATELY BUILDS NO
// ROUTE THAT CAN — showing the history from the server is the fourth piece. That the row is stored
// once and under the session's team is proved in `server/src/routes/races.test.js`, where the store
// can actually be inspected. What is proved HERE is the wiring those tests cannot see: a real race,
// a real result screen, a real local write, a real refusal, and a real upload afterwards.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';
import { E2E } from './e2e-env.js';

/** Read this device's race history the way the application stores it. */
async function history(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('racearena:raceHistory') ?? '[]'));
}

test('a race finishes with the server gone, is kept, and goes up when it returns', async ({ page }) => {
  // The race itself dominates this budget; see the note in garden-path-finishes.spec.js. If it ever
  // expires that is a finding, not a budget to raise.
  test.setTimeout(900_000);

  // ── 1. Set up while the server is still answering ────────────────────────────────────────────
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);

  // The smallest field that is still a race: `raceResults` is written when EVERY racer has
  // finished, so the field size is the wall clock.
  const fieldCount = page.locator('input[type="number"]').first();
  await fieldCount.fill('2');

  const before = await history(page);

  // ── 2. ★ THE SERVER IS STOPPED ───────────────────────────────────────────────────────────────
  await page.route('**/api/**', (route) => route.abort('connectionrefused'));

  // ── 3. The race runs to the end regardless. This is the line the piece may not cross: nothing
  // about saving may make finishing a race depend on the server.
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);

  await expect(page, 'the race must reach the result screen with the server down').toHaveURL(
    /\/results/,
    { timeout: 870_000 }
  );

  // ── 4. The result is on screen, and the race is in the local history ─────────────────────────
  await expect(page.locator('.screen--result')).toBeVisible();

  const after = await history(page);
  expect(after.length, 'the finished race must be recorded on this device').toBe(before.length + 1);

  const entry = after[0];
  expect(entry.finishOrder.length, 'the entry carries the finish order').toBeGreaterThan(0);
  expect(entry.winners.length, 'the entry carries the winners').toBeGreaterThan(0);

  // ★ It carries what re-running needs — the world the race RAN with, carried from the race screen.
  expect(entry.inputs, 'the entry must carry the race inputs').toBeTruthy();
  expect(entry.inputs.geometryId).toBeTruthy();
  expect(entry.inputs.names.length).toBeGreaterThan(0);
  expect(entry.inputs.worldConfigs, 'the config world the race ran with').toBeTruthy();
  expect(entry.inputs.effectiveRacerTypes).toBeTruthy();

  // ★ And it is marked PENDING — kept, not lost, and not pretended to be saved.
  expect(entry.sync.state, 'a race the server never saw is pending').toBe('pending');

  // ── 5. ★ THE SERVER RETURNS ──────────────────────────────────────────────────────────────────
  // Nothing polls. The flush happens because the NEXT request the application makes anyway
  // succeeds, which marks the server reachable — here, the track load on the setup screen.
  await page.unroute('**/api/**');
  await page.goto('/setup');

  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, { timeout: 30_000 })
    .toBe('sent');

  const sent = (await history(page))[0];
  expect(sent.sync.serverId, 'the server gave the stored race an id').toBeTruthy();
  expect(sent.id, 'the local id is unchanged — it is what the server dedupes on').toBe(entry.id);

  // ── 6. ★ THE SAME RACE SENT TWICE YIELDS ONE ROW ─────────────────────────────────────────────
  // Sent again through the browser's own session, exactly as a retry would. The second POST must be
  // recognised — 200 and the SAME stored id — not accepted as a new race.
  const resend = await page.evaluate(
    async ({ apiUrl, payload }) => {
      const post = async () => {
        const r = await fetch(`${apiUrl}/api/races`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { status: r.status, body: await r.json() };
      };
      return { first: await post(), second: await post() };
    },
    { apiUrl: E2E.apiUrl, payload: buildResendPayload(sent) }
  );

  expect(resend.first.status, 'a race already stored answers 200, not 201').toBe(200);
  expect(resend.second.status).toBe(200);
  expect(resend.first.body.alreadyStored).toBe(true);
  expect(resend.second.body.id, 'both resends name the SAME stored race').toBe(resend.first.body.id);
  expect(resend.first.body.id, 'and it is the race the client already had').toBe(sent.sync.serverId);
});

/** The body `POST /api/races` takes — the same shape `toServerPayload` builds, and NO team. */
function buildResendPayload(entry) {
  return {
    clientRaceId: entry.id,
    finishedAt: entry.date,
    ...entry.inputs,
    elapsedSec: entry.duration,
    results: entry.finishOrder,
    winners: entry.winners,
  };
}
