// ============================================================
// File:        devscreen-narrow.spec.js
// Path:        client/e2e/devscreen-narrow.spec.js
// Project:     RaceArena — DEVSCREEN-MOBILE-1 (decided 2026-10-13)
// Description: The Dev Screen works on a phone (390 px) and a tablet held upright (768 px): in every
//              chapter, in the admin's All view and in the Operator view, the page never scrolls
//              sideways and every control the chapter guard's design table places in that chapter
//              can be reached — brought into view, it lies inside the screen and is clipped by
//              nothing around it. The Player groups cards, which the owner saw cut off at the right
//              on 2026-10-12, are checked by name: each card's right edge is on the screen.
//
// THE CONTROL LIST IS THE CHAPTER GUARD'S, NOT A COPY. It is read from the design table
// (reports/evolution/DEVSCREEN-CHAPTERS-1/design.json), the same file devScreenChapters.guard.test.jsx
// holds the screen to, and a control is found by the same `data-control-id` the guard reads.
//
// WHAT "REACHABLE" MEANS HERE. The control is scrolled into view the way a browser would for a
// finger or a Tab key; then (1) it lies between the left and right edge of the screen, (2) no
// ancestor that clips (overflow other than visible) cuts it off, and (3) the only box allowed to
// scroll sideways is one around a table — any other box with hidden sideways overflow is a
// failure, because that is exactly how the cut-off cards looked: the chapter column scrolled
// sideways, with its scrollbar a whole chapter further down.
//
// WHICH CONTROLS ARE CHECKED: every one the chapter shows — as it opens, then with the forms a
// person opens opened (the edit form of the first group, track and brand, an open track, a closed
// <details>, the race director's reset form and its "New team…" choice, a new surface class through
// every generator) and the racer tuning dialog. A design row the e2e installation cannot show (no
// race has been run, so no "Verify race"; no custom racer type, so no Delete) is named in
// ABSENT_HERE with its reason; any OTHER row the walk does not reach fails the test, so a control
// is never counted as checked when it was skipped. Each run logs its coverage per chapter.
// ============================================================

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DESIGN = JSON.parse(
  readFileSync(
    join(HERE, '..', '..', 'reports', 'evolution', 'DEVSCREEN-CHAPTERS-1', 'design.json'),
    'utf8'
  )
);
/** The control id a design row is rendered under — the chapter guard's own rule. */
const idOf = (row) => `${row.section.replace(/^sections\//, '').replace(/\.jsx$/, '')}:${row.id}`;
const SIDEBAR = 'Sidebar (all chapters)';

/** The design rows a view shows: the Operator view leaves out the advanced tier (the run's user is
 *  an admin, so the admin-only controls inside operator parts stay). */
const rowsFor = (chapter, view) =>
  DESIGN.filter((r) => r.chapter === chapter && (view === 'all' || r.tier !== 'advanced'));

const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
];

/**
 * In the page: every element of each listed control id is brought into view and checked. Returns
 * the ids seen and one line per failure.
 */
function checkControls(ids) {
  const vw = document.scrollingElement.clientWidth;
  const failures = [];
  const seen = [];
  const where = (el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`;
  const page = document.scrollingElement;
  if (page.scrollWidth > page.clientWidth)
    failures.push(`the page scrolls sideways: ${page.scrollWidth} > ${page.clientWidth}`);
  for (const id of ids) {
    const els = [...document.querySelectorAll(`[data-control-id="${CSS.escape(id)}"]`)];
    if (els.length) seen.push(id);
    for (const el of els) {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // not displayed in this state
      if (r.left < -0.5 || r.right > vw + 0.5)
        failures.push(
          `${id}: outside the screen (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`
        );
      // Every ancestor up to the first fixed box (a dialog): nothing above that box can clip it.
      const fixed = (n) => getComputedStyle(n).position === 'fixed';
      for (let a = el.parentElement; a && a !== document.body && !fixed(el); a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox !== 'visible') {
          const box = a.getBoundingClientRect();
          if (r.left < box.left - 0.5 || r.right > box.right + 0.5)
            failures.push(`${id}: cut off by ${where(a)} (overflow-x ${ox})`);
          // the one box allowed to scroll sideways is the one around a table
          if (!a.querySelector(':scope > table') && a.scrollWidth > a.clientWidth + 0.5)
            failures.push(
              `${id}: ${where(a)} scrolls sideways (${a.scrollWidth} > ${a.clientWidth})`
            );
        }
        if (fixed(a)) break;
      }
    }
  }
  return { seen, failures: [...new Set(failures)] };
}

async function openMenu(page) {
  const toggle = page.locator('nav [aria-controls="dev-screen-menu"]');
  await expect(toggle, 'the narrow layout shows the menu toggle').toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

/** The first button of a control, once its list has arrived from the server. */
const firstButton = (page, id) => page.locator(`main [data-control-id="${id}"] button`).first();

/** Controls whose list comes from the server: the chapter is checked after the list has arrived. */
const LISTED = [
  'PlayerGroupsManager:handleEdit',
  'TrackManager:handleEdit',
  'BrandingProfiles:handleEdit',
  'UserManagementSection:openResetForm',
];

/**
 * Design rows the e2e installation cannot show, each for a stated reason. Anything else the walk
 * does not see fails the test — a control the walk silently skipped is not a control it checked.
 */
const ABSENT_HERE = {
  'RaceHistory:run-again': 'no race has been run in the e2e installation',
  'RaceHistory:verify-race': 'no race has been run in the e2e installation',
  // (the design table's own id for this control, cut where its template literal begins)
  'RacerManager:navigate(`/racer-editor': 'shown only for a custom racer type',
  'RacerManager:handleDelete': 'shown only for a custom racer type',
  'RacerEditModal:handleFieldReset': 'shown only for a racer type with stored overrides',
  'RacerEditModal:handleMinSizeReset': 'shown only for a racer type with stored overrides',
  'RacerEditModal:handleSurfaceClassesReset': 'shown only for a racer type with stored overrides',
  'RacerEditModal:handleEffectReset': 'shown only for a racer type with stored overrides',
  'BrandingProfiles:handleRemoveLogo': 'shown only for a brand with a logo',
  'SurfaceClassManager:handleDelete': 'shown only for a custom surface class',
  'SurfaceClassManager:handleResetToDefault': 'shown only for a modified built-in surface class',
};

for (const size of SIZES) {
  for (const view of ['all', 'operator']) {
    test(`Dev Screen on a ${size.name} (${size.width} px), ${view} view: no sideways scroll, every control reachable`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/dev');
      await page.waitForLoadState('networkidle');

      await openMenu(page);
      await page
        .locator('nav')
        .getByRole('button', { name: view === 'all' ? 'All' : 'Operator', exact: true })
        .click();

      // The sidebar's three controls sit in the open menu, reachable on this screen.
      const sidebarIds = rowsFor(SIDEBAR, view).map(idOf);
      const sidebar = await page.evaluate(checkControls, sidebarIds);
      expect(sidebar.failures, 'the menu').toEqual([]);
      expect(sidebar.seen, 'the menu holds the sidebar controls').toEqual(sidebarIds);

      const titles = [...new Set(DESIGN.map((r) => r.chapter))].filter(
        (c) => c !== SIDEBAR && rowsFor(c, view).length > 0
      );

      const failures = [];
      const coverage = [];
      const unexplained = [];
      for (const chapter of titles) {
        await openMenu(page);
        const item = page.locator('#dev-screen-menu > button', { hasText: chapter });
        if ((await item.count()) === 0) continue; // the view does not list this chapter
        await item.click();
        await expect(page.locator('main')).toHaveAttribute('data-chapter', chapter);
        await expect(
          page.locator('#dev-screen-menu'),
          'choosing a chapter closes the menu'
        ).toBeHidden();

        const ids = rowsFor(chapter, view).map(idOf);
        for (const id of LISTED.filter((x) => ids.includes(x)))
          await expect(firstButton(page, id), `${id}: its list arrived`).toBeVisible({
            timeout: 15_000,
          });
        await page.waitForLoadState('networkidle');

        const seen = new Set();
        const check = async (state) => {
          const r = await page.evaluate(checkControls, ids);
          r.seen.forEach((id) => seen.add(id));
          failures.push(
            ...r.failures.map((f) => `${size.width} px ${view} · ${chapter} · ${state}: ${f}`)
          );
        };

        if (chapter === 'Tracks, racers, brands and groups') {
          // ★ THE OWNER'S CASE (2026-10-12): every Player groups card ends on the screen. Measured
          // FIRST, as the chapter opens: bringing a control into view could scroll a cut-off card
          // sideways into the screen and hide the very failure this looks for.
          const vw = await page.evaluate(() => document.scrollingElement.clientWidth);
          const rights = await page
            .locator('main [data-control-id="PlayerGroupsManager:handleEdit"]')
            .evaluateAll((els) =>
              els.map((el) => {
                const card = el.parentElement;
                return Math.max(
                  card.getBoundingClientRect().right,
                  ...[...card.children].map((c) => c.getBoundingClientRect().right)
                );
              })
            );
          expect(rights.length, 'the e2e installation has seeded player groups').toBeGreaterThan(0);
          rights.forEach((right, i) =>
            expect(
              right,
              `Player groups card ${i + 1}: right edge on the screen`
            ).toBeLessThanOrEqual(vw)
          );
        }

        await check('as opened');

        // Every form a person opens, opened: closed <details>, the first entry of each list in
        // edit, the race director's reset form and its "New team…" choice.
        await page.evaluate(() =>
          document.querySelectorAll('main details').forEach((d) => (d.open = true))
        );
        for (const id of LISTED.filter((x) => ids.includes(x))) await firstButton(page, id).click();
        if (await page.locator('#um-team').count())
          await page.locator('#um-team').selectOption('__new__');
        await check('forms open');

        // An open track (it has Default Duration where a closed one has Default Laps).
        const trackEdits = page.locator('main [data-control-id="TrackManager:handleEdit"] button');
        for (
          let i = 1;
          i < (await trackEdits.count()) && !seen.has('TrackManager:defaultDurationSec');
          i++
        ) {
          await trackEdits.nth(i).click();
          if (await page.locator('[data-control-id="TrackManager:defaultDurationSec"]').count())
            await check(`track ${i + 1} in edit`);
        }

        // A new surface class through every generator, so every generator's fields show.
        if (ids.includes('SurfaceClassManager:handleNewClass')) {
          await firstButton(page, 'SurfaceClassManager:handleNewClass').click();
          for (const value of await page
            .locator('#sc-generator option')
            .evaluateAll((os) => os.map((o) => o.value))) {
            await page.locator('#sc-generator').selectOption(value);
            await check(`new class, generator ${value}`);
          }
        }

        // The racer tuning dialog, then closed again.
        const tune = page.getByTitle(/^Edit Horse .* tuning$/);
        if (await tune.count()) {
          await tune.first().click();
          await check('racer tuning dialog');
          await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
        }

        const notShown = ids.filter((id) => !seen.has(id));
        unexplained.push(
          ...notShown.filter((id) => !ABSENT_HERE[id]).map((id) => `${chapter}: ${id}`)
        );
        coverage.push(
          `${chapter}: ${seen.size}/${ids.length}` +
            (notShown.length ? ` (not shown: ${notShown.join(', ')})` : '')
        );
      }

      console.log(`[devscreen-narrow] ${size.width} px ${view}:\n  ${coverage.join('\n  ')}`);
      expect(failures, `controls not reachable — coverage:\n${coverage.join('\n')}`).toEqual([]);
      expect(unexplained, 'design rows the walk did not reach, with no stated reason').toEqual([]);
    });
  }
}
