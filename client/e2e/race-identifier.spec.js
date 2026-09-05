// ============================================================
// File:        client/e2e/race-identifier.spec.js
// Path:        client/e2e/race-identifier.spec.js
// Project:     RaceArena — RACE-IDENTIFIER-1
//
// THE OWNER'S EXACT PATH, IN A REAL BROWSER.
//
// ── WHY THIS IS A BROWSER TEST AND NOT A UNIT TEST ──────────────────────────────────────────────
//
// The encoding already has unit tests and they pass. They were not wrong; they were looking at the
// wrong layer. The owner's report — copy the identifier, change a setting, paste it back, and the
// race runs with the CHANGED setting — is about what happens across a real navigation, a real
// clipboard and a real re-mount of the setup screen, and no unit test in this tree walks that.
//
// So this walks it: forty racers, a track, seed 3, copy, change `raceActionStage` from `quiet` to
// `wild` on the Dev Screen, come back, paste, start.
//
// ── WHAT IT ASSERTS, AND WHY IT IS TWO ARMS ─────────────────────────────────────────────────────
//
// One arm cannot tell "the identifier worked" from "the setting change never took". So the same
// seed is run twice under the SAME changed setting:
//
//   CONTROL — type the seed 3 by hand      -> the race must take the machine's stage, `wild`
//   ARM     — paste the identifier         -> the race must take the identifier's stage, `quiet`
//
// If the two agree, the identifier is doing nothing, whichever value they agree on. That is exactly
// the failure the owner saw, and it is what this spec is built to catch.
//
// The assertion reads `sessionStorage.activeRace` — the payload the race screen consumes — AFTER
// the race screen has actually started, so it is the race that RAN and not merely what a button
// computed.
// ============================================================

import { test, expect } from '@playwright/test';

const FORTY = Array.from({ length: 40 }, (_, i) => ({
  name: `Racer ${i + 1}`,
  color: '#f00',
  icon: '🐴',
}));

/** The roster is seeded rather than clicked in forty times — the same state, far less brittle. */
async function seedRoster(page) {
  await page.addInitScript((roster) => {
    localStorage.setItem('racearena:activeGroup', JSON.stringify(roster));
  }, FORTY);
}

/**
 * ONE track's geometry in the browser cache — not every track's.
 *
 * `appReady.ensureTrackGeometriesCached` waits for ALL of them, and the e2e API seeds ten custom
 * tracks whose geometries lose their fetch race often enough that this spec never reached its own
 * assertion. This spec races exactly one track, so it waits for exactly that one. The shared helper
 * is left alone: other specs act on arbitrary tracks and genuinely need it.
 */
async function waitForTrackGeometry(page, trackName) {
  await expect
    .poll(
      () =>
        page.evaluate((name) => {
          const raw = localStorage.getItem('racearena:cache:serverTracks');
          const list = raw ? JSON.parse(raw) : [];
          const t = list.find((x) => x.name === name);
          if (!t?.geometryId) return 'no track yet';
          return localStorage.getItem(`racearena:trackGeometries:${t.geometryId}`) === null
            ? 'geometry not cached yet'
            : 'ready';
        }, trackName),
      { timeout: 20_000 },
    )
    .toBe('ready');
}
/** Put the machine on a known stage before anything is copied. */
async function setStage(page, stage) {
  await page.goto('/dev');
  await page.getByTestId(`race-action-${stage}`).click();
  await expect(page.getByTestId(`race-action-${stage}`)).toHaveAttribute('aria-pressed', 'true');
}

/** Setup screen: pick the first selectable track, then open Race Settings. */
async function pickTrackAndOpenSettings(page) {
  await page.goto('/setup');
  await page.getByRole('tab').nth(1).click();
  const card = page.locator('button:not([disabled])', { hasText: 'Dirt Oval' }).first();
  await card.click();
  await page.getByRole('tab').nth(2).click();
}

/** Start the race and wait for the race screen to actually be running. */
async function startAndWaitForRace(page) {
  await page.getByTestId('start-race').click();
  await expect(page).toHaveURL(/\/race/);
  await expect(page.locator('canvas.race-canvas')).toBeVisible();
}

const activeRace = (page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('activeRace') ?? 'null'));

test.describe('RACE-IDENTIFIER-1 — a pasted identifier runs ITS race, not this machine\'s', () => {
  test('copy, change the stage, paste — the identifier wins', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedRoster(page);

    // ── 1. The machine is on the shipped stage, and the identifier is taken there.
    await setStage(page, 'quiet');
    await page.goto('/setup');
    await waitForTrackGeometry(page, 'Dirt Oval');
    await pickTrackAndOpenSettings(page);

    await page.getByTestId('race-seed-input').fill('3');
    await expect(page.getByTestId('race-identifier-row')).toBeVisible();
    await page.getByTestId('copy-race-identifier').click();

    const identifier = await page.evaluate(() => navigator.clipboard.readText());
    expect(identifier.startsWith('RA1-')).toBe(true);

    // ── 2. CHANGE THE SETTING. This is the whole point: the machine no longer agrees with the
    //      identifier, so the two paths below must now produce two different races.
    await setStage(page, 'wild');

    // ── 3. CONTROL — the seed typed by hand takes the MACHINE's stage.
    await seedRoster(page);
    await pickTrackAndOpenSettings(page);
    await page.getByTestId('race-seed-input').fill('3');
    await startAndWaitForRace(page);

    const typed = await activeRace(page);
    expect(typed.racePlanSeed).toBe(3);
    expect(typed.raceActionStage).toBe('wild');
    expect(typed.worldConfigOverride ?? null).toBeNull();

    // ── 4. ARM — the SAME seed, pasted as an identifier, must take the IDENTIFIER's stage.
    await page.goto('/setup');
    await pickTrackAndOpenSettings(page);
    await page.getByTestId('race-seed-input').fill(identifier);
    await startAndWaitForRace(page);

    const pasted = await activeRace(page);

    // ★ THE FINDING THE OWNER REPORTED IS EXACTLY THIS LINE FAILING.
    expect(pasted.raceActionStage).toBe('quiet');
    expect(pasted.racePlanSeed).toBe(3);
    expect(pasted.worldConfigOverride).toBeTruthy();

    // And the identifier supplied the field too, so it is not merely echoing the screen.
    expect(pasted.racers).toHaveLength(40);

    // ── 5. The two arms must DISAGREE. If they match, the identifier changed nothing and the test
    //      above could have been satisfied by a machine that simply never switched to wild.
    expect(pasted.raceActionStage).not.toBe(typed.raceActionStage);
  });

  // ★ THE ARM THAT FINDS THE OWNER'S DEFECT.
  //
  // The stage test above passes on the build he tested, so `raceActionStage` is not where his race
  // diverged. A RACER TYPE is. The identifier records `effectiveRacerTypes` — speedMultiplier,
  // displaySize, bodyFillX/Y, surfaceClasses — and the race path reads the HOST's live racer type
  // instead (`RaceScreen/index.jsx:460`, `:464`), so a machine whose racer was retuned runs the
  // pasted identifier at ITS OWN speed. `speedMultiplier` is a first-order physics input, so that is
  // a different race under the same name, silently.
  test('a retuned RACER TYPE does not leak into a pasted identifier race', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedRoster(page);
    // The engine-input probe is off in normal play; this spec is the reason it exists.
    await page.addInitScript(() => localStorage.setItem('racearena:raceInputsProbe', '1'));
    await setStage(page, 'quiet');
    await page.goto('/setup');
    await waitForTrackGeometry(page, 'Dirt Oval');
    await pickTrackAndOpenSettings(page);

    await page.getByTestId('race-seed-input').fill('3');
    await expect(page.getByTestId('race-identifier-row')).toBeVisible();
    await page.getByTestId('copy-race-identifier').click();
    const identifier = await page.evaluate(() => navigator.clipboard.readText());

    // RETUNE THE HORSE. Written to the app's own override key — the single place the Dev Screen and
    // the Racer Editor both write, and which `racer-types/index.js:293-300` applies at boot — then
    // reloaded, which is exactly what changing it in the interface does.
    await page.evaluate(() => {
      localStorage.setItem(
        'racearena:racerTypeOverrides',
        JSON.stringify({ horse: { speedMultiplier: 2.5 } }),
      );
    });

    await pickTrackAndOpenSettings(page);
    await page.getByTestId('race-seed-input').fill(identifier);
    await startAndWaitForRace(page);

    // What the race was ACTUALLY built with, read from the engine's own input rather than inferred.
    const used = await page.evaluate(() => window.__raRaceInputs ?? null);
    expect(used, 'the race screen did not report what it built the race with').toBeTruthy();

    // ★ THE ASSERTION THE OWNER'S REPORT IS ABOUT: the identifier recorded the shipped horse, so the
    // race must run the shipped horse — not this machine's retuned one.
    expect(used.speedMultiplier).toBeCloseTo(1.0, 5);
    expect(used.speedMultiplier).not.toBeCloseTo(2.5, 5);
  });

  // ★ RUN-IT-AGAIN-1. `run it again` refilled the field with the SEED of the race that ran, and this
  // piece has just established that a seed does not reproduce a race. Change one setting between the
  // race and the click and it runs a DIFFERENT race under the old race's number — the exact defect
  // the identifier exists to remove, two lines below the identifier.
  test('run it again repeats the race that RAN, not the current settings', async ({ page }) => {
    await seedRoster(page);
    await page.addInitScript(() => localStorage.setItem('racearena:raceInputsProbe', '1'));

    // ── A race really runs, at the shipped stage.
    await setStage(page, 'quiet');
    await page.goto('/setup');
    await waitForTrackGeometry(page, 'Dirt Oval');
    await pickTrackAndOpenSettings(page);
    await page.getByTestId('race-seed-input').fill('3');
    await startAndWaitForRace(page);

    const first = await activeRace(page);
    expect(first.raceActionStage).toBe('quiet');

    // ── The machine is retuned AFTER that race. This is the whole point.
    await setStage(page, 'wild');

    // ── Back on Setup, the offer to repeat it is there and is taken.
    await pickTrackAndOpenSettings(page);
    const again = page.getByTestId('run-it-again');
    await expect(again).toBeVisible();
    await again.click();
    await startAndWaitForRace(page);

    const repeated = await activeRace(page);

    // ★ THE ASSERTION. Repeating a race must repeat THAT race.
    expect(repeated.racePlanSeed).toBe(first.racePlanSeed);
    expect(repeated.raceActionStage).toBe('quiet');
    expect(repeated.worldConfigOverride).toBeTruthy();

    // And it is not merely that the setting change failed to take: a plain typed seed still picks up
    // the machine's new stage, so the two paths provably differ.
    await pickTrackAndOpenSettings(page);
    await page.getByTestId('race-seed-input').fill('3');
    await startAndWaitForRace(page);
    expect((await activeRace(page)).raceActionStage).toBe('wild');
  });

  test('a corrupted identifier is REFUSED, never silently run as a seed', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedRoster(page);
    await setStage(page, 'quiet');
    await page.goto('/setup');
    await waitForTrackGeometry(page, 'Dirt Oval');
    await pickTrackAndOpenSettings(page);

    await page.getByTestId('race-seed-input').fill('3');
    await page.getByTestId('copy-race-identifier').click();
    const identifier = await page.evaluate(() => navigator.clipboard.readText());

    // Corrupt the payload, keeping the prefix — the shape a truncated paste really takes.
    const corrupted = identifier.slice(0, identifier.length - 40);
    await page.getByTestId('race-seed-input').fill(corrupted);

    // ★ IT MUST SAY SO AND STAY PUT. Silently becoming a different race is the worst outcome.
    //
    // RACE-IDENTIFIER-3 made the refusal EARLIER than it was: because a usable identifier is now
    // what enables Start, an unusable one DISABLES it, so the race cannot be begun at all rather
    // than being begun and then refused. The assertion follows that — the button is dead and the
    // row says why.
    await expect(page.getByTestId('start-race')).toBeDisabled();
    await expect(page.getByTestId('race-identifier-note')).toContainText(/cannot be used/i);
    await expect(page).not.toHaveURL(/\/race/);
    expect(await activeRace(page)).toBeNull();
  });
});
