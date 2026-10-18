// ============================================================
// File:        result-landscape.spec.js
// Path:        client/e2e/result-landscape.spec.js
// Project:     RaceArena — RESULT-LANDSCAPE-1 (built 2026-10-18)
// Description: The result screen on a phone held sideways (844 x 390), a window shorter than the
//              results card: the card's title is inside the window, the card ends inside the window,
//              and the card scrolls far enough to bring the Back button into the window. Before the
//              fix the card was centred and taller than the window, and its title sat above the top
//              edge. The decision to hold the card short is measured by the screen
//              (`cardIsTooTall` in client/src/screens/ResultScreen/index.jsx); the component test
//              ResultScreen.landscape.test.jsx holds that a card that fits never gets the class.
// ============================================================

import { test, expect } from '@playwright/test';

// A twenty-racer result: the field size the result card's own rankings panel is measured for. The
// result screen reads nothing else to render — the payload is what RaceScreen writes at the end.
const RESULTS = JSON.stringify({
  finishOrder: Array.from({ length: 20 }, (_, i) => ({
    index: i,
    name: `Racer ${i + 1}`,
    icon: '🐎',
    finishTimeMs: 60_000 + i * 1_234,
  })),
  elapsedTime: 84,
  race: { trackName: 'Landscape Oval', racePlanSeed: 123456, raceActionStage: 'quiet' },
});

test('result screen on a phone held sideways (844 x 390): the title is inside the window', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript((payload) => sessionStorage.setItem('raceResults', payload), RESULTS);
  await page.goto('/results');
  const title = page.locator('.results-title');
  await expect(title).toBeVisible();
  // Any key ends the podium build-up at once, so the whole card is laid out as it finally is.
  await page.keyboard.press('Shift');

  const box = await page.evaluate(() => {
    const card = document.querySelector('.results-container');
    const r = (el) => el.getBoundingClientRect();
    return {
      titleTop: r(document.querySelector('.results-title')).top,
      cardTop: r(card).top,
      cardBottom: r(card).bottom,
      windowHeight: window.innerHeight,
    };
  });
  expect(box.titleTop, "the title's top is inside the window").toBeGreaterThanOrEqual(0);
  expect(box.cardTop, "the card's top is inside the window").toBeGreaterThanOrEqual(0);
  expect(box.cardBottom, "the card's bottom is inside the window").toBeLessThanOrEqual(
    box.windowHeight
  );

  // What does not fit scrolls inside the card: scrolled to its end, the Back button is on screen.
  await page.locator('.results-container').evaluate((card) => {
    card.scrollTop = card.scrollHeight;
  });
  const back = page.getByRole('button', { name: /Back to Setup/ });
  await expect(back).toBeInViewport({ ratio: 1 });
});
