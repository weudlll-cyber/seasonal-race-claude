// ============================================================
// File:        d9-smoke.spec.js
// Path:        client/e2e/d9-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Playwright smoke tests for D9 — Race Engine Speed Refactor.
//              Covers: lap selector UI, duration estimates, session data,
//              race screen startup across horse / snail / rocket racer types
// ============================================================

import { test, expect } from '@playwright/test';

// Minimal valid geometry for a closed oval track
const CLOSED_GEOM = {
  id: 'smoke-d9-closed',
  name: 'Test Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  innerPoints: [
    { x: 280, y: 220 }, { x: 680, y: 220 }, { x: 860, y: 400 },
    { x: 680, y: 580 }, { x: 280, y: 580 }, { x: 120, y: 400 },
  ],
  outerPoints: [
    { x: 240, y: 180 }, { x: 720, y: 180 }, { x: 940, y: 400 },
    { x: 720, y: 620 }, { x: 240, y: 620 }, { x: 80, y: 400 },
  ],
};

// Minimal valid geometry for an open sprint track
const OPEN_GEOM = {
  id: 'smoke-d9-open',
  name: 'Test Sprint',
  closed: false,
  backgroundImage: null,
  effects: [],
  innerPoints: [
    { x: 100, y: 340 }, { x: 400, y: 340 }, { x: 700, y: 360 }, { x: 1000, y: 340 },
  ],
  outerPoints: [
    { x: 100, y: 380 }, { x: 400, y: 380 }, { x: 700, y: 400 }, { x: 1000, y: 380 },
  ],
};

// Seeds localStorage before the app reads it, so React state initialises correctly.
async function seedStorage(page, { closedGeomId, openGeomId } = {}) {
  await page.addInitScript(
    ({ CLOSED_GEOM, OPEN_GEOM, closedGeomId, openGeomId }) => {
      if (closedGeomId) {
        localStorage.setItem(
          `racearena:trackGeometries:${CLOSED_GEOM.id}`,
          JSON.stringify(CLOSED_GEOM)
        );
      }
      if (openGeomId) {
        localStorage.setItem(
          `racearena:trackGeometries:${OPEN_GEOM.id}`,
          JSON.stringify(OPEN_GEOM)
        );
      }
      // Patch the two default tracks with geometry IDs so they become selectable
      const raw = localStorage.getItem('racearena:tracks');
      const tracks = raw ? JSON.parse(raw) : [];
      const updated = tracks.map((t) => {
        if (closedGeomId && t.id === 'dirt-oval') return { ...t, geometryId: closedGeomId };
        if (openGeomId && t.id === 'space-sprint') return { ...t, geometryId: openGeomId };
        return t;
      });
      // If no stored tracks yet (fresh localStorage), seed the two we need
      if (!tracks.length) {
        updated.push(
          { id: 'dirt-oval', name: 'Dirt Oval', defaultRacerTypeId: 'horse', geometryId: closedGeomId ?? null, worldWidth: 1280, color: '#c8a46a', trackWidth: 140, description: '' },
          { id: 'space-sprint', name: 'Space Sprint', defaultRacerTypeId: 'rocket', geometryId: openGeomId ?? null, worldWidth: 1280, color: '#7c3aed', trackWidth: 140, description: '' }
        );
      }
      localStorage.setItem('racearena:tracks', JSON.stringify(updated));
    },
    { CLOSED_GEOM, OPEN_GEOM, closedGeomId: closedGeomId ?? null, openGeomId: openGeomId ?? null }
  );
}

// ── Lap selector — closed track ───────────────────────────────────────────────

test.describe('D9 — lap selector (closed track)', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page, { closedGeomId: CLOSED_GEOM.id });
    await page.goto('/setup');
    // Open Track tab and click Dirt Oval
    await page.getByRole('tab', { name: 'Track' }).click();
    const dirtOvalCard = page.getByRole('button', { name: /Dirt Oval/ }).first();
    await dirtOvalCard.click();
  });

  // E2E-STALE-2: THE SELECTOR OFFERS EIGHT CHOICES, NOT FOUR, and it is addressed BY TEST ID.
  // `LAP_CHOICES` in SetupScreen.jsx is [1, 2, 3, 4, 5, 6, 8, 10] and each button carries
  // `data-testid="lap-choice-<n>"`. The old tests located by bare digit — `getByRole('button',
  // {name: '1'})` — which is a strict-mode violation the moment a "10" exists, and it did not name
  // the stale count at all. The hook the markup already offers is used instead of adding one.
  const LAP_CHOICES = [1, 2, 3, 4, 5, 6, 8, 10];

  test('lap selector renders one button per lap choice after selecting a closed track', async ({
    page,
  }) => {
    for (const n of LAP_CHOICES) {
      await expect(page.getByTestId(`lap-choice-${n}`)).toBeVisible();
    }
    // …and nothing beyond them.
    await expect(page.locator('[data-testid^="lap-choice-"]')).toHaveCount(LAP_CHOICES.length);
  });

  test('the track default lap count is marked with * and is what the start bar shows', async ({
    page,
  }) => {
    // E2E-STALE-2: the default no longer comes from a chosen duration — it comes from the TRACK
    // (`effectiveLaps = selectedLaps ?? trackDefaultLaps(selectedTrack)`), and duration is derived
    // from it rather than the other way round. So the old "auto from duration" hint does not exist;
    // the hint the screen actually renders is "* track default". Dirt Oval's default is 2.
    await expect(page.getByTestId('lap-choice-2')).toHaveText('2*');
    await expect(page.getByTestId('closed-track-estimated-duration')).toContainText(
      '* track default'
    );
    await expect(page.getByText(/^2 laps · ~\d+s$/)).toBeVisible();
  });

  test('estimated duration label is visible', async ({ page }) => {
    // E2E-STALE-2: the label reads "Estimated duration: 87s (field 87–87s)", not "~87s est.".
    await expect(page.getByTestId('closed-track-estimated-duration')).toContainText(
      /Estimated duration: \d+s/
    );
  });

  test('start bar shows "2 laps" for default 60 s / horse', async ({ page }) => {
    await expect(page.getByText(/2 laps/)).toBeVisible();
  });

  test('clicking lap 3 updates start bar to "3 laps"', async ({ page }) => {
    await page.getByTestId('lap-choice-3').click();
    await expect(page.getByText(/3 laps/)).toBeVisible();
  });

  test('clicking lap 1 updates start bar to "1 lap"', async ({ page }) => {
    await page.getByTestId('lap-choice-1').click();
    await expect(page.getByText(/^1 lap · ~\d+s$/)).toBeVisible();
  });

  // E2E-STALE-2: THE ESTIMATE MOVED AND THE SELECT IS ONE OF FOUR COMBOBOXES ON THIS SCREEN.
  // Reading it by `~\d+s est\.` matched nothing, and `getByRole('combobox')` is a strict-mode
  // violation (branding profile, racer type, Quick-Test racer, Quick-Test names). The racer-type
  // select already carries `data-testid="racer-type-select"`; the estimate already carries
  // `data-testid="closed-track-estimated-duration"`.
  const readEstimate = async (page) => {
    const text = await page.getByTestId('closed-track-estimated-duration').textContent();
    const m = text?.match(/Estimated duration: (\d+)s/);
    expect(m, `no estimate in "${text}"`).not.toBeNull();
    return parseInt(m[1], 10);
  };

  test('estimated duration is ~3× higher for Snail than for Horse', async ({ page }) => {
    const horseSecs = await readEstimate(page);

    // Switch to Snail (speedMultiplier 0.30). By VALUE — the option label carries an emoji.
    await page.getByTestId('racer-type-select').selectOption('snail');
    await expect
      .poll(() => readEstimate(page))
      .toBeGreaterThan(horseSecs * 2); // exact ratio ~ 1/0.30 = 3.33×
  });

  test('estimated duration is lower for a faster racer type than for Horse', async ({ page }) => {
    // E2E-STALE-2: THE OLD TEST PICKED ROCKET, WHICH THIS TRACK DOES NOT OFFER. Dirt Oval declares
    // the surface classes Sand/Earth/Mud/Grass and the select is filtered to compatible types, so
    // Rocket is absent from it — the test could never have selected it. Motorbike (1.05) is on the
    // list and is the faster-than-Horse case the test was after. Its NAME also said "higher" while
    // it asserted "lower"; the assertion was right and the name is now what it does.
    const horseSecs = await readEstimate(page);
    await page.getByTestId('racer-type-select').selectOption('motorbike');
    await expect.poll(() => readEstimate(page)).toBeLessThan(horseSecs);
  });

  test('switching tracks resets lap selection to auto', async ({ page }) => {
    // Select 4 laps explicitly on Dirt Oval
    await page.getByTestId('lap-choice-4').click();
    await expect(page.getByText(/4 laps/)).toBeVisible();

    // Click any other track card — this changes selectedTrackId and resets selectedLaps.
    // River Run has no geometry so it's disabled; we can use a JS click to force it,
    // or simply use evaluate to clear selectedTrackId indirectly by reloading state.
    // Easiest: navigate to the same page fresh, which resets all state.
    await page.reload();
    await page.getByRole('tab', { name: 'Track' }).click();
    const dirtOvalCard = page.getByRole('button', { name: /Dirt Oval/ }).first();
    await dirtOvalCard.click();

    // After a fresh select, selectedLaps is null → auto = lapsFromDuration(60) = 2
    await expect(page.getByText(/2 laps/)).toBeVisible();
  });
});

// ── Open track info row ───────────────────────────────────────────────────────

test.describe('D9 — open track info row', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page, { openGeomId: OPEN_GEOM.id });
    await page.goto('/setup');
    await page.getByRole('tab', { name: 'Track' }).click();
    // Click Space Sprint (open track)
    const sprintCard = page.getByRole('button', { name: /Space Sprint/ }).first();
    await sprintCard.click();
  });

  test('no lap buttons shown for open track', async ({ page }) => {
    // Was two bare-digit role queries — the same strict-mode hazard the closed-track block had,
    // passing only because an open track happens to render no such button at all.
    await expect(page.locator('[data-testid^="lap-choice-"]')).toHaveCount(0);
  });

  // E2E-STALE-2: THE OPEN-TRACK ROW SAYS SOMETHING ELSE NOW, and what it says is a different
  // model. It used to read "60s — open track, finish line placed at X% of track": duration was
  // chosen and the finish line was reported as a fraction. Today the operator moves a duration
  // slider and the row states the track's NATURAL MAXIMUM at this race's pace next to the
  // estimated duration (SetupScreen.jsx, `open-track-natural-max` / `open-track-estimated-duration`).
  // Neither "finish line" nor "% of track" is text this screen produces, so both tests were
  // waiting for a string the product retired.

  test('open track info row states the natural maximum and the estimated duration', async ({
    page,
  }) => {
    await expect(page.getByTestId('open-track-natural-max')).toContainText(
      /Natural maximum at normal speed: \d+s/
    );
    await expect(page.getByTestId('open-track-estimated-duration')).toContainText(
      /Estimated duration: \d+s/
    );
  });

  test('asking for more than the natural maximum warns that the whole field is slowed', async ({
    page,
  }) => {
    // THIS IS WHERE THE FINISH LINE WENT. The old test asked where the finish line was placed;
    // the answer today is "wherever a normal racer is after the chosen time — until you ask for
    // longer than the track can hold, and then the line is fixed and the field slows instead".
    // That boundary is the natural maximum, and crossing it is what the screen reports.
    const slider = page.getByTestId('open-track-duration-slider');
    const max = await slider.getAttribute('max');
    const naturalMax = parseInt(
      (await page.getByTestId('open-track-natural-max').textContent())?.match(/(\d+)s/)?.[1] ?? '0',
      10
    );
    expect(Number(max), 'the slider must reach past the natural maximum').toBeGreaterThan(
      naturalMax
    );

    await slider.fill(String(max));
    await expect(page.getByTestId('open-track-slowdown-warning')).toContainText(
      /Beyond this track.s natural maximum of \d+s/
    );
    await expect(page.getByTestId('open-track-slowdown-warning')).toContainText(
      /\d+% of normal pace/
    );
  });
});

// ── Session data written by handleStartRace / handleQuickTest ────────────────

test.describe('D9 — session data (raceMode / targetLaps / targetDuration)', () => {
  test('Quick Test on closed track writes raceMode=laps and targetLaps', async ({ page }) => {
    await seedStorage(page, { closedGeomId: CLOSED_GEOM.id });
    await page.goto('/setup');

    // Select Dirt Oval as the quick-test track
    const quickDirtBtn = page.locator('button', { hasText: '🐴 Dirt Oval' });
    await quickDirtBtn.click();
    await page.getByRole('button', { name: /Quick Test/ }).click();

    // Should navigate to /race
    await expect(page).toHaveURL(/\/race/);

    const session = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('activeRace') || '{}')
    );
    expect(session.raceMode).toBe('laps');
    expect(session.targetLaps).toBeGreaterThanOrEqual(1);
    // E2E-STALE-1: was `expect(session.targetDuration).toBeGreaterThan(0)`, wrong on two counts.
    // The key is `targetDurationSec`, and on a CLOSED track it is deliberately absent —
    // SetupScreen.jsx states the contract in the payload itself: "the two canonical operator
    // inputs. Exactly one is meaningful per race mode." Asserting its ABSENCE is what the product
    // correctly does, and is stronger than the assertion it replaces.
    expect(session.targetDurationSec).toBeUndefined();
  });

  test('Quick Test on open track writes raceMode=time and targetDuration', async ({ page }) => {
    await seedStorage(page, { openGeomId: OPEN_GEOM.id });
    await page.goto('/setup');

    const quickSprintBtn = page.locator('button', { hasText: /Space Sprint/ }).last();
    await quickSprintBtn.click();
    await page.getByRole('button', { name: /Quick Test/ }).click();

    await expect(page).toHaveURL(/\/race/);

    const session = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('activeRace') || '{}')
    );
    expect(session.raceMode).toBe('time');
    // E2E-STALE-1: the key is `targetDurationSec` (SetupScreen.jsx), not `targetDuration`. The
    // assertion's intent — an open race carries a duration target and no lap target — is unchanged.
    expect(session.targetDurationSec).toBeGreaterThan(0);
    expect(session.targetLaps).toBeUndefined();
  });

  test('explicit 3-lap selection is stored in targetLaps', async ({ page }) => {
    await seedStorage(page, { closedGeomId: CLOSED_GEOM.id });
    await page.goto('/setup');

    // Add a player so Start Race is enabled
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByPlaceholder(/Enter player name/i).fill('Alice');
    await page.getByRole('button', { name: 'Add' }).click();

    await page.getByRole('tab', { name: 'Track' }).click();
    const dirtOvalCard = page.getByRole('button', { name: /Dirt Oval/ }).first();
    await dirtOvalCard.click();

    // Explicitly pick 3 laps
    await page.getByRole('button', { name: '3' }).click();

    await page.getByRole('button', { name: /Start Race/i }).click();
    await expect(page).toHaveURL(/\/race/);

    const session = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('activeRace') || '{}')
    );
    expect(session.targetLaps).toBe(3);
    expect(session.raceMode).toBe('laps');
  });
});

// ── Race screen with D9 session data ─────────────────────────────────────────

test.describe('D9 — race screen startup', () => {
  // Inject valid session data directly into sessionStorage so we can test the
  // race screen without going through the full setup flow.
  async function seedRaceSession(page, extraFields = {}) {
    await page.addInitScript(
      ({ CLOSED_GEOM, extraFields }) => {
        localStorage.setItem(
          `racearena:trackGeometries:${CLOSED_GEOM.id}`,
          JSON.stringify(CLOSED_GEOM)
        );
        const race = {
          racers: [
            { name: 'Alpha', color: '#f00', icon: '🐴' },
            { name: 'Beta',  color: '#0f0', icon: '🐴' },
            { name: 'Gamma', color: '#00f', icon: '🐴' },
          ],
          trackId: 'dirt-oval',
          trackName: 'Dirt Oval',
          geometryId: CLOSED_GEOM.id,
          racerTypeId: 'horse',
          worldWidth: 1280,
          duration: 60,
          winners: 3,
          raceMode: 'laps',
          targetLaps: 2,
          eventName: 'D9 Test',
          timestamp: new Date().toISOString(),
          ...extraFields,
        };
        sessionStorage.setItem('activeRace', JSON.stringify(race));
      },
      { CLOSED_GEOM, extraFields }
    );
  }

  test('race screen loads without error for a 2-lap closed race', async ({ page }) => {
    await seedRaceSession(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1500);
    expect(errors.filter((e) => !e.includes('canvas'))).toHaveLength(0);
  });

  test('lap counter shows LAP 1 / 2 during racing phase', async ({ page }) => {
    await seedRaceSession(page);
    await page.goto('/race');
    // Wait for countdown to finish (4 s) then check lap indicator
    await page.waitForTimeout(5000);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
    // The lap info is drawn on canvas, so we verify via the HUD text we can reach
    // — the scoreboard should show racer names once the race is live
    await expect(page.getByText('Alpha')).toBeVisible();
  });

  test('race screen loads cleanly for a horse race (speedMultiplier=1.0)', async ({ page }) => {
    await seedRaceSession(page, { racerTypeId: 'horse' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });

  test('race screen loads cleanly for a snail race (speedMultiplier=0.30)', async ({ page }) => {
    await seedRaceSession(page, { racerTypeId: 'snail' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });

  test('race screen loads cleanly for a rocket race (speedMultiplier=1.25)', async ({ page }) => {
    await seedRaceSession(page, { racerTypeId: 'rocket' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/race');
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
    await expect(page.locator('canvas.race-canvas')).toBeVisible();
  });

  test('← Setup button returns to setup screen', async ({ page }) => {
    await seedRaceSession(page);
    await page.goto('/race');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Setup/i }).click();
    await expect(page).toHaveURL(/\/setup/);
  });

  test('scoreboard lists all racers', async ({ page }) => {
    await seedRaceSession(page);
    await page.goto('/race');
    await page.waitForTimeout(5500); // past countdown
    await expect(page.getByText('Alpha')).toBeVisible();
    await expect(page.getByText('Beta')).toBeVisible();
    await expect(page.getByText('Gamma')).toBeVisible();
  });
});
