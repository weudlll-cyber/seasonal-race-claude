// ============================================================
// File:        client/e2e/seed-field-typing.spec.js
// Project:     RaceArena — SEED-FIELD-TYPING-1
//
// ★ THE FIELD TAKES THREE FORMS AND MUST TAKE THEM TYPED, NOT ONLY PASTED.
//
// A short key exists to be read out to somebody. Pasting one worked; typing one did not, because
// `sanitizeQuickTestSeedInput` ran on EVERY KEYSTROKE and reduced anything it could not yet
// recognise to its digits — and a half-typed key is not yet recognisable. "733D" became "733".
//
// ★ WHY THE EXISTING PROOF MISSED IT, and this is the lesson worth keeping: RACE-HISTORY-4 added the
// key as the sanitiser's third accepted form and proved it in a browser — with `fill()`.
// `fill()` sets the value in one assignment, which is a PASTE. It can never exercise the
// intermediate states typing goes through, so it passed against a field that shredded every one of
// them. Here the typing cases use `pressSequentially`, which is the difference between the two.
//
// The five forms this file holds: a key TYPED, the same key PASTED, a number TYPED, an identifier
// PASTED, and an unknown key TYPED and refused.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

const history = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('racearena:raceHistory') ?? '[]'));

async function runARace(page) {
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.locator('input[type="number"]').first().fill('2');
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await expect(page).toHaveURL(/\/race/);
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });
  await expect(page.locator('.screen--result')).toBeVisible();
}

/**
 * A setup screen that can actually start: one player and one track. Players are React state, so a
 * `/setup` load starts empty however many races ran before — the same two steps `d9-smoke.spec.js`
 * uses, reused rather than reinvented.
 */
async function makeStartable(page) {
  await page.getByRole('tab', { name: 'Players' }).click();
  await page.getByPlaceholder(/Enter player name/i).fill('Alice');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('tab', { name: 'Track' }).click();
  await page.getByRole('button', { name: /Dirt Oval/ }).first().click();
}

/** The seed field, on the Settings tab — there is one field and no mode selector. */
async function seedField(page, { startable = false } = {}) {
  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  if (startable) await makeStartable(page);
  await page.getByRole('tab', { name: 'Settings' }).click();
  const f = page.getByTestId('race-seed-input');
  await expect(f).toBeVisible();
  await f.fill('');
  return f;
}

/** A real stored race's key, taken from the history the way a person reads it off the screen. */
async function aStoredKey(page) {
  await runARace(page);
  await expect
    .poll(async () => (await history(page))[0]?.sync?.state, { timeout: 30_000 })
    .toBe('sent');
  const original = (await history(page))[0];
  await page.goto('/dev');
  await page.getByRole('button', { name: /Race History/i }).click();
  const row = page
    .locator('[data-testid="history-row-stored"]')
    .filter({ has: page.locator('[data-testid="short-key"]') })
    .first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  const key = (await row.locator('[data-testid="short-key"]').innerText()).trim();
  return { key, original };
}

test('★ a short key TYPED character by character runs that race', async ({ page }) => {
  test.setTimeout(900_000);
  const { key, original } = await aStoredKey(page);

  const f = await seedField(page, { startable: true });
  // ★ TYPED, NOT FILLED. Lower case and with the separator a person writes down, because the key is
  // case-insensitive and `normalizeShortKey` drops spaces and dashes.
  const typed = `${key.slice(0, 3).toLowerCase()}-${key.slice(3).toLowerCase()}`;
  await f.pressSequentially(typed, { delay: 30 });

  // The keystrokes survived: this is the assertion the old behaviour failed.
  expect(await f.inputValue(), 'every character typed is still in the field').toBe(typed);

  await page.getByTestId('resolve-short-key').click();
  await expect.poll(async () => f.inputValue(), { timeout: 20_000 }).toMatch(/^RA1-/);

  await page.getByRole('button', { name: /start race/i }).click();
  await expect(page).toHaveURL(/\/race/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });

  const repeat = (await history(page))[0];
  expect(repeat.seed, 'the typed key ran THAT race').toBe(original.seed);
});

test('the same key PASTED still works', async ({ page }) => {
  test.setTimeout(900_000);
  const { key } = await aStoredKey(page);

  const f = await seedField(page);
  await f.fill(key.toLowerCase());
  await page.getByTestId('resolve-short-key').click();
  await expect.poll(async () => f.inputValue(), { timeout: 20_000 }).toMatch(/^RA1-/);
  await expect(page.getByRole('button', { name: /start race/i })).toBeEnabled();
});

test('a number TYPED is still a seed, and an identifier PASTED still works', async ({ page }) => {
  test.setTimeout(900_000);

  // ── a typed number ───────────────────────────────────────────────────────────────────────────
  const f = await seedField(page, { startable: true });
  await f.pressSequentially('4242', { delay: 30 });
  expect(await f.inputValue(), 'digits are untouched').toBe('4242');

  await page.getByRole('button', { name: /start race/i }).click();
  await expect(page).toHaveURL(/\/race/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/results/, { timeout: 600_000 });
  expect((await history(page))[0].seed, 'the typed number is the seed').toBe(4242);

  // ── a pasted identifier ──────────────────────────────────────────────────────────────────────
  //
  // The identifier is obtained the way the product produces one — by resolving a stored race's key,
  // which replaces the key in the field with the identifier it names. Nothing is imported into the
  // page to manufacture one.
  const { key } = await aStoredKey(page);
  const f2 = await seedField(page);
  await f2.fill(key);
  await page.getByTestId('resolve-short-key').click();
  await expect.poll(async () => f2.inputValue(), { timeout: 20_000 }).toMatch(/^RA1-/);
  const identifier = await f2.inputValue();

  const f3 = await seedField(page);
  await f3.fill(identifier);
  expect(await f3.inputValue(), 'a pasted identifier survives whole').toBe(identifier);
  await expect(page.getByRole('button', { name: /start race/i })).toBeEnabled();
});

test('an unknown key TYPED is refused with a message, and starts nothing', async ({ page }) => {
  test.setTimeout(300_000);

  const f = await seedField(page);
  // Same shape, same alphabet, names no race.
  await f.pressSequentially('zzzzzz', { delay: 30 });
  expect(await f.inputValue(), 'the typed key survived to be judged').toBe('zzzzzz');

  await page.getByTestId('resolve-short-key').click();
  await expect(page.getByTestId('short-key-error'), 'an unknown key says so').toBeVisible({
    timeout: 20_000,
  });
  await expect(page, 'and nothing started').toHaveURL(/\/setup/);
});
