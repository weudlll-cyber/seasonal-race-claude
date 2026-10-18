// ============================================================
// File:        race-fullscreen.spec.js
// Path:        client/e2e/race-fullscreen.spec.js
// Project:     RaceArena — FULLSCREEN-USEFUL-1 (built 2026-10-17)
// Description: The race screen's own fullscreen, entered through its own button in a real browser:
//              the picture becomes the largest 16:9 box that fits, centred, and larger than outside
//              fullscreen; the standings column waits off the right edge and is on screen after the
//              pointer reaches that edge. The open/close timing and the touch path are held by the
//              component test (client/src/screens/RaceScreen/fullscreenDrawer.test.jsx); this spec
//              holds what jsdom cannot — the geometry.
// ============================================================

import { test, expect } from '@playwright/test';

// The same minimal closed oval d9-smoke.spec.js races: a geometry the page needs no server for.
const GEOM = {
  id: 'fullscreen-useful-oval',
  name: 'Fullscreen Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  innerPoints: [
    { x: 280, y: 220 },
    { x: 680, y: 220 },
    { x: 860, y: 400 },
    { x: 680, y: 580 },
    { x: 280, y: 580 },
    { x: 120, y: 400 },
  ],
  outerPoints: [
    { x: 240, y: 180 },
    { x: 720, y: 180 },
    { x: 940, y: 400 },
    { x: 720, y: 620 },
    { x: 240, y: 620 },
    { x: 80, y: 400 },
  ],
};

async function seedRace(page) {
  await page.addInitScript((geom) => {
    localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
    sessionStorage.setItem(
      'activeRace',
      JSON.stringify({
        racers: ['Alpha', 'Beta', 'Gamma'].map((name) => ({ name })),
        trackId: 'dirt-oval',
        trackName: 'Dirt Oval',
        geometryId: geom.id,
        racerTypeId: 'horse',
        worldWidth: 1280,
        duration: 60,
        raceMode: 'laps',
        targetLaps: 2,
        timestamp: new Date().toISOString(),
      })
    );
  }, GEOM);
}

test('in the app fullscreen the picture fills the screen and the standings slide in from the right edge', async ({
  page,
}) => {
  const VW = 1920;
  const VH = 1080;
  await page.setViewportSize({ width: VW, height: VH });
  await seedRace(page);
  await page.goto('/race');
  const wrapper = page.getByTestId('race-canvas-wrapper');
  const hud = page.getByTestId('race-hud');
  await expect(wrapper).toBeVisible();
  const outside = await wrapper.boundingBox();

  await page.locator('.race-fullscreen-btn').click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement), {
      message: 'the fullscreen button put the race screen into fullscreen',
    })
    .toBe(true);
  await expect(page.getByTestId('race-layout')).toHaveClass(/race-layout--fullscreen/);

  // The picture: larger than outside, 16:9, centred both ways (to a pixel of rounding).
  await expect.poll(async () => (await wrapper.boundingBox()).width).toBeGreaterThan(outside.width);
  const inside = await wrapper.boundingBox();
  expect(Math.abs(inside.x + inside.width / 2 - VW / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(inside.y + inside.height / 2 - VH / 2)).toBeLessThanOrEqual(1);
  expect(inside.y).toBeGreaterThanOrEqual(5.5); // inside the 6 px fullscreen padding
  expect(inside.y + inside.height).toBeLessThanOrEqual(VH - 5.5);

  // The column: off the right edge until the pointer reaches it, then on screen.
  await expect.poll(async () => (await hud.boundingBox()).x).toBeGreaterThanOrEqual(VW);
  await page.mouse.move(VW - 2, VH / 2);
  await expect(page.getByTestId('race-layout')).toHaveClass(/race-layout--hud-open/);
  // Polled to the END of the slide: the column's right edge lands on the screen's right edge.
  await expect
    .poll(async () => {
      const b = await hud.boundingBox();
      return Math.abs(b.x + b.width - VW);
    })
    .toBeLessThanOrEqual(0.5);
  // …and it came out OVER the picture: the picture did not move.
  expect(await wrapper.boundingBox()).toEqual(inside);
});
