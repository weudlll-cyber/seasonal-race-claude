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

  // Polled, not read once: the card slides up 20 px as it arrives (`slideUp`, 0.5 s), and a read
  // during that entrance sees it lower than it ends — on 2026-10-18, 396.8 px against a 390 px
  // window, once the compact layout's 8 px screen padding no longer absorbed the slide.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const card = document.querySelector('.results-container');
          const r = (el) => el.getBoundingClientRect();
          const problems = [];
          if (r(document.querySelector('.results-title')).top < 0) problems.push('title above');
          if (r(card).top < 0) problems.push('card above');
          if (r(card).bottom > window.innerHeight) problems.push('card below');
          return problems;
        }),
      { message: 'the title and the card are inside the window', timeout: 3_000 }
    )
    .toEqual([]);

  // What does not fit scrolls inside the card: scrolled to its end, the Back button is on screen.
  await page.locator('.results-container').evaluate((card) => {
    card.scrollTop = card.scrollHeight;
  });
  const back = page.getByRole('button', { name: /Back to Setup/ });
  await expect(back).toBeInViewport({ ratio: 1 });
});

// SHORT WINDOWS (2026-10-18): on a window of 500 px or less the card is COMPACT — on arrival the
// title, the brand logo where it is shown (wider than 768 px) and the whole podium (medals, names,
// times, places) are inside the window and the logo does not overlap the podium; only the Final
// Rankings list scrolls, inside the card. With the seeded brand active, so the logo is there.
const SHORT_SIZES = [
  { width: 800, height: 350 },
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 740, height: 360 },
];

test('short landscape windows: title, logo and the whole podium inside the window, only the rankings scroll', async ({
  page,
}) => {
  await page.addInitScript((payload) => {
    sessionStorage.setItem('raceResults', payload);
    const session = JSON.parse(localStorage.getItem('racearena:activeSession') ?? '{}');
    localStorage.setItem(
      'racearena:activeSession',
      JSON.stringify({ ...session, activeBrandingProfileId: 'seasonal-entertainment' })
    );
  }, RESULTS);

  for (const size of SHORT_SIZES) {
    await page.setViewportSize(size);
    await page.goto('/results');
    await expect(page.locator('.results-title')).toBeVisible();
    await page.keyboard.press('Shift');
    const label = `${size.width}x${size.height}`;
    if (size.width > 768) await expect(page.locator('.brand-logo-result__img')).toBeVisible();

    // Polled: the card settles over a few frames (the podium's entrance, the logo's sizing).
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const r = (el) => el.getBoundingClientRect();
            const inside = (el) => r(el).top >= 0 && r(el).bottom <= window.innerHeight;
            const logo = document.querySelector('.brand-logo-result__img');
            const logoShown = logo && getComputedStyle(logo.parentElement).display !== 'none';
            const podium = [...document.querySelectorAll('.podium-slot, .podium-slot *')];
            const podiumBox = r(document.querySelector('.podium'));
            const overlaps =
              logoShown &&
              r(logo).right > podiumBox.left &&
              r(logo).left < podiumBox.right &&
              r(logo).bottom > podiumBox.top &&
              r(logo).top < podiumBox.bottom;
            const list = document.querySelector('.rankings-scroll');
            const problems = [];
            if (!inside(document.querySelector('.results-title'))) problems.push('title');
            if (logoShown && !inside(logo)) problems.push('logo');
            if (overlaps) problems.push('logo over podium');
            for (const el of podium) if (!inside(el)) problems.push(`podium ${el.className}`);
            if (!(list.scrollHeight > list.clientHeight)) problems.push('rankings not scrollable');
            if (!inside(document.querySelector('.results-actions'))) problems.push('back button');
            return problems;
          }),
        { message: `${label}: what is outside the window or overlapping`, timeout: 3_000 }
      )
      .toEqual([]);
  }
});
