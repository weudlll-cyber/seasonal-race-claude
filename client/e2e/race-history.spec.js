// ============================================================
// File:        client/e2e/race-history.spec.js
// Path:        client/e2e/race-history.spec.js
// Project:     RaceArena — RACE-HISTORY-4
//
// THE TEAM'S RACES, THE BUTTON THAT REPEATS ONE, AND THE KEY THAT HANDS ONE OVER.
//
// ── ★ THE ASSERTION THIS FILE EXISTS FOR ────────────────────────────────────────────────────────
// A setting is CHANGED between the first run and the repeat, and the repeat is still the original
// race. Everything else here could pass while the repeat quietly rebuilt its inputs from whatever
// the Dev Screen says now — the race would still run, still look right, and be a different race.
// That is the defect the store, the identifier and this whole topic exist to prevent, and it is
// invisible without changing something in between.
//
// ── WHY ONE RACE ────────────────────────────────────────────────────────────────────────────────
// A race is minutes of wall clock here (garden-path-finishes.spec.js measures and budgets for it).
// One real race is run, and every other property is asserted against the stored result of it.
//
// ── WHAT THIS SPEC DOES NOT COVER, AND WHERE IT IS COVERED ──────────────────────────────────────
// Another team's key answering NOT FOUND needs a second team, which needs a second account and an
// admin to create it — that is `server/src/routes/races.test.js`, where two sessions are a variable
// rather than a sign-in. Here the same rule is exercised through the interface with a key that
// names no race at all, which is deliberately the SAME answer the server gives for another team's.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

/** This device's race history, as the application stores it. */
const history = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('racearena:raceHistory') ?? '[]'));

/** Open the Dev Screen's Race History section. */
async function openHistory(page) {
  await page.goto('/dev');
  await page.getByRole('button', { name: /Race History/i }).click();
  await expect(page.getByRole('heading', { name: /Race History/i })).toBeVisible();
}

/** Run one real race from the setup screen and wait for its result. */
async function runARace(page) {
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.locator('input[type="number"]').first().fill('2');
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });
  await expect(page.locator('.screen--result')).toBeVisible();
}

test('the team sees its races, and the button repeats one exactly as it ran', async ({ page }) => {
  test.setTimeout(900_000);

  // ── 1. A race runs and reaches the server ────────────────────────────────────────────────────
  await runARace(page);

  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, { timeout: 30_000 })
    .toBe('sent');

  const original = (await history(page))[0];
  expect(original.inputs, 'the race carries its inputs').toBeTruthy();

  // ── 2. It is in the list, with a short key ───────────────────────────────────────────────────
  await openHistory(page);

  const storedRow = page.locator('[data-testid="history-row-stored"]').first();
  await expect(storedRow, 'the stored race is listed').toBeVisible({ timeout: 30_000 });

  const shortKey = (await storedRow.locator('[data-testid="short-key"]').innerText()).trim();
  expect(shortKey, 'a stored race has a key in the unambiguous alphabet').toMatch(
    /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/
  );

  // ── 3. ★ A SETTING IS CHANGED BETWEEN THE RUNS ───────────────────────────────────────────────
  // If the repeat rebuilt its inputs from this machine, THIS is what would leak into it.
  await page.evaluate(() => {
    localStorage.setItem('racearena:cameraConfig', JSON.stringify({ minRacersVisible: 9 }));
    localStorage.setItem(
      'racearena:racerTypeOverrides',
      JSON.stringify({ beetle: { normalSpeed: 999 } })
    );
  });

  // ── 4. The button runs it again ──────────────────────────────────────────────────────────────
  await openHistory(page);
  await page.locator('[data-testid="history-row-stored"]').first()
    .locator('[data-testid="run-again"]').click();

  // One control, no dialog: it lands on the setup screen with the race armed and starts it.
  await expect(page, 'the button starts the race').toHaveURL(/\/race|\/setup/, { timeout: 30_000 });
  await expect(page).toHaveURL(/\/race/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });

  // ── 5. ★ THE REPEAT IS THE ORIGINAL RACE, NOT THIS MACHINE'S ─────────────────────────────────
  const repeat = (await history(page))[0];

  expect(repeat.id, 'the repeat is a new entry, not the old one re-read').not.toBe(original.id);
  expect(repeat.seed, 'same seed').toBe(original.seed);
  expect(repeat.inputs.geometryId).toBe(original.inputs.geometryId);
  expect(repeat.inputs.names).toEqual(original.inputs.names);
  expect(repeat.inputs.raceActionStage).toBe(original.inputs.raceActionStage);

  // ★ The settings changed in step 3 are NOT in the repeat. It ran the recorded world.
  expect(
    repeat.inputs.effectiveRacerTypes,
    'the repeat must carry the RECORDED racer values, not the ones just set on this machine'
  ).toEqual(original.inputs.effectiveRacerTypes);
  expect(
    repeat.inputs.worldConfigs,
    'the repeat must carry the RECORDED config world'
  ).toEqual(original.inputs.worldConfigs);
  expect(JSON.stringify(repeat.inputs.worldConfigs)).not.toContain('999');

  // And the outcome matches, which is the point of all of it.
  expect(repeat.winners, 'the same race produces the same winners').toEqual(original.winners);
});

test('the short key typed into the seed field runs the same race, and an unknown one is refused', async ({
  page,
}) => {
  test.setTimeout(900_000);

  await runARace(page);
  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, { timeout: 30_000 })
    .toBe('sent');
  const original = (await history(page))[0];

  await openHistory(page);
  const storedRow = page.locator('[data-testid="history-row-stored"]').first();
  await expect(storedRow).toBeVisible({ timeout: 30_000 });
  const shortKey = (await storedRow.locator('[data-testid="short-key"]').innerText()).trim();

  // ── ★ AN UNKNOWN KEY IS REFUSED AND STARTS NOTHING ───────────────────────────────────────────
  // Same shape, same alphabet, names no race. The server answers this exactly as it answers another
  // team's key, so this exercises that rule through the interface.
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  // The seed field lives on the Settings tab (SetupScreen `TABS`), which is where a person types a
  // key too — there is no second input anywhere.
  await page.getByRole('tab', { name: 'Settings' }).click();
  const seedField = page.getByTestId('race-seed-input');
  await seedField.fill('ZZZZZZ');
  await page.getByTestId('resolve-short-key').click();

  await expect(page.getByTestId('short-key-error'), 'an unknown key says so').toBeVisible({
    timeout: 20_000,
  });
  await expect(page, 'and nothing started').toHaveURL(/\/setup/);

  // ── The real key, typed in lower case with a separator, as a person would write it down ──────
  const typed = `${shortKey.slice(0, 3).toLowerCase()}-${shortKey.slice(3).toLowerCase()}`;
  await seedField.fill(typed);
  await page.getByTestId('resolve-short-key').click();

  // The field now holds the race, not the name: the key was replaced by the identifier it names.
  await expect
    .poll(async () => seedField.inputValue(), { timeout: 20_000 })
    .toMatch(/^RA1-/);

  await page.getByRole('button', { name: /start race/i }).click();
  await expect(page).toHaveURL(/\/race/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });

  const fromKey = (await history(page))[0];
  expect(fromKey.seed, 'the key ran the race it names').toBe(original.seed);
  expect(fromKey.inputs.names).toEqual(original.inputs.names);
  expect(fromKey.winners).toEqual(original.winners);
});

test('a race that has not reached the server is listed, says so, has no key, and still repeats', async ({
  page,
}) => {
  test.setTimeout(900_000);

  // The whole race runs with the server unreachable, so it can never have been stored.
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.locator('input[type="number"]').first().fill('2');

  // ★ ONLY THE RACES ENDPOINT IS STOPPED, not the whole API. Aborting every `/api/**` call also
  // stops the auth probe, and `/dev` then bounces to the sign-in screen — which is correct product
  // behaviour and makes the history unreachable, so the test could never see the row it is about.
  // Stopping just the races calls is the state being tested: the app is signed in and working, and
  // this one race could not go up.
  await page.route('**/api/races**', (route) => route.abort('connectionrefused'));
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });

  const entry = (await history(page))[0];
  expect(entry.sync.state).toBe('pending');

  // ── The list shows it, as what it is ─────────────────────────────────────────────────────────
  // The races endpoint stays stopped: the pending race must still be listed from THIS DEVICE while
  // the team's page cannot be fetched, which is exactly the state a race director is in when the
  // server is having a bad afternoon.
  await openHistory(page);

  const pendingRow = page.locator('[data-testid="history-row-pending"]').first();
  await expect(pendingRow, 'an unsent race is not hidden — it is the owner\'s race').toBeVisible();

  // ★ It says what it is, and has NO key. A blank cell would let it read as stored.
  await expect(pendingRow.locator('[data-testid="row-state"]')).toHaveText(/not sent yet/i);
  await expect(pendingRow.locator('[data-testid="short-key"]')).toHaveCount(0);

  // ── ★ AND ITS BUTTON STILL WORKS. Repeating is a local act; it never needed the server. ──────
  await pendingRow.locator('[data-testid="run-again"]').click();
  await expect(page).toHaveURL(/\/race/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });

  const repeat = (await history(page))[0];
  expect(repeat.seed).toBe(entry.seed);
  expect(repeat.inputs.names).toEqual(entry.inputs.names);
});
