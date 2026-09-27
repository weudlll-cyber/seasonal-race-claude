// ============================================================
// comeback-cast-probe.spec.js — COMEBACK-THROUGH-THE-SAME-DOOR, step 1
//
// ★★ A MEASUREMENT, NOT A GATE. It asserts nothing about the product: it runs a race and PRINTS
// what the browser's own race plan cast. It exists to settle one question that no existing
// instrument could answer, and the question is the confound the night run left behind.
//
// ── THE CONFOUND ──────────────────────────────────────────────────────────────────────────────
// NIGHT-2026-09-26 PIECE 3 chose space-sprint seeds 2, 3 and 5 with
// `scripts/diag/comeback-beats.mjs`, which confirmed each one casts a comebacker — and all three
// then produced NO COMEBACK_ZOOM in the browser. But the harness races 40 SYNTHETIC racers and the
// Quick Test races 20 REAL ones, and in this project A RACER'S NAME IS PHYSICS (`stablePairBit`
// hashes `r.name`). The same seed through those two doors is TWO DIFFERENT RACES. So the diag's
// confirmation is about the harness's race and says nothing about the race the spec drives.
//
// ── WHAT IT READS, AND WHY NOTHING NEW WAS ADDED TO THE PRODUCT ───────────────────────────────
// Two observables that already exist:
//   1. `[data-testid="camera-state-hud"]`'s `data-state` — the same recorder
//      `comeback-precedence.spec.js` installs, copied rather than re-invented.
//   2. `[data-testid="governor-diag-hud"]` — the DIRECTOR DIAG panel, which prints each front
//      racer's authored ROLE. The role comes from `racePlanController.getHeroRoles()`
//      (`racePlanner.js`), handed to the panel at `RaceScreen/index.jsx` and rendered by
//      `GovernorDiagHUD.jsx`. It is switched on by the existing camera-config key
//      `showGovernorDiag` — no new export, no new global, no new debug hook.
//
// ★ ITS ONE LIMIT, STATED SO THE RESULT IS NOT OVER-READ: the panel prints the FRONT SIX racers
//   only. A cast comebacker is therefore visible once he has climbed into that group — which is
//   the whole of what a comebacker is for ("storming from far back to the front"), so his ROLE
//   appearing is decisive. His role NOT appearing means one of two things — not cast, or cast and
//   never arrived — and the report says so rather than choosing.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';

const TRACK = /Space Sprint/;

// ★★ OPT-IN, AND THAT IS DELIBERATE. Each race here costs about 2.3 minutes and this file asserts
// nothing about the product, so leaving it in the default run would add minutes to every production
// arm for a measurement nobody is reading that day. It runs only when asked:
//
//     RA_PROBE_SEEDS=1,4,8 npx playwright test comeback-cast-probe --project=chromium
//
// The alternative — deleting it once the answer was in hand — was rejected: `comeback-precedence`'s
// header now instructs the next person to move its pin WITH THIS PROBE, and an instruction pointing
// at a file that was thrown away is worse than no instruction.
// ★ The tests are REGISTERED either way and skip at run time, rather than the loop producing an
//   empty file. A spec file that defines no tests makes `playwright test <this file>` exit non-zero
//   with "no tests found", which reads exactly like a broken file to whoever tries it next.
const ASKED = (process.env.RA_PROBE_SEEDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SEEDS = ASKED.length ? ASKED : ['1'];

for (const SEED of SEEDS) {
  test(`cast probe — space-sprint seed ${SEED}`, async ({ page }) => {
    test.skip(ASKED.length === 0, 'measurement only — set RA_PROBE_SEEDS to run it');
    test.setTimeout(300_000);

    await page.addInitScript(() => {
      // 1 · the camera-state recorder, identical to comeback-precedence.spec.js's.
      window.__raCamTrace = [];
      // 2 · every distinct role string the DIRECTOR DIAG panel has shown, with when and for whom.
      window.__raRoleTrace = [];
      // 3 · COMEBACK-GATES-1: how many times the director was LOOKED AT, and what the COMEBACK DIAG
      //     said while it was refusing. The director is updated once per rendered frame
      //     (`RaceScreen/index.jsx`), so counting rAF ticks during the race counts its looks.
      window.__raFrames = 0;
      window.__raGateTrace = {};
      const seen = new Set();
      const tick = () => {
        window.__raFrames += 1;
        const el = document.querySelector('[data-testid="camera-state-hud"]');
        const s = el?.getAttribute('data-state') ?? null;
        if (s) {
          const trace = window.__raCamTrace;
          const last = trace[trace.length - 1];
          if (!last || last.state !== s) trace.push({ state: s, t: Math.round(performance.now()) });
        }
        const g = document.querySelector('[data-testid="governor-diag-hud"]');
        if (g) {
          // The panel prints "P3 Name  1.2len  draw 0.98  x1.00  hero/role". Roles are a small
          // closed vocabulary from the generator, so they are matched by name rather than parsed.
          for (const role of ['comebacker', 'sovereign-lead', 'faller', 'attacker-b2']) {
            if (g.textContent.includes(role) && !seen.has(role)) {
              seen.add(role);
              window.__raRoleTrace.push({ role, t: Math.round(performance.now()) });
            }
          }
        }
        // The COMEBACK DIAG already names WHICH gate refused — `gain✗`, `gap✗`, `rank✗` per B1
        // racer, and the phase gate open/closed. Nothing is added to the product to read it; the
        // distinct lines are tallied so a whole race collapses to a handful of rows.
        const c = document.querySelector('[data-testid="comeback-diag-hud"]');
        if (c) {
          for (const line of c.innerText.split('\n')) {
            const t = line.trim();
            if (!t) continue;
            window.__raGateTrace[t] = (window.__raGateTrace[t] ?? 0) + 1;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await page.goto('/setup');
    await ensureTrackGeometriesCached(page);

    // Switch the DIRECTOR DIAG panel on through its own config key, the way the Dev Screen does.
    // This is a COSMETIC key (`cameraConfig`); it changes no race.
    await page.evaluate(() => {
      const raw = localStorage.getItem('racearena:cameraConfig');
      const cfg = raw ? JSON.parse(raw) : {};
      cfg.showGovernorDiag = true;
      // COMEBACK-GATES-1: the panel that already reports which comeback gate refused.
      cfg.showComebackDiag = true;
      localStorage.setItem('racearena:cameraConfig', JSON.stringify(cfg));
    });

    await page.evaluate((seed) => sessionStorage.setItem('quickTestSeed', seed), SEED);
    await page.reload();
    await ensureTrackGeometriesCached(page);

    await page.locator('button', { hasText: TRACK }).first().click();
    await page.getByRole('button', { name: /Quick Test/ }).click();
    await page.waitForURL(/\/race/);

    // The panel has to be on, or every "no role" reading below is meaningless.
    await expect(page.getByTestId('governor-diag-hud')).toBeVisible({ timeout: 30_000 });

    await expect(page.getByTestId('winner-card')).toBeVisible({ timeout: 280_000 });

    const roles = await page.evaluate(() => window.__raRoleTrace ?? []);
    const cam = await page.evaluate(() => window.__raCamTrace ?? []);
    const states = [...new Set(cam.map((e) => e.state))];
    const frames = await page.evaluate(() => window.__raFrames ?? 0);
    // The seed the race ACTUALLY ran with, off the payload the setup screen wrote — not the value
    // this file asked for. A fixture that silently drew its own seed would show up right here.
    const usedSeed = await page.evaluate(() => {
      try {
        return JSON.parse(sessionStorage.getItem('activeRace') ?? '{}').racePlanSeed ?? null;
      } catch {
        return null;
      }
    });
    const gates = await page.evaluate(() => window.__raGateTrace ?? {});
    const refusals = Object.entries(gates)
      .filter(([k]) => k.includes('✗'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    console.log(`[cast-probe] seed=${SEED} ROLES SEEN: ${JSON.stringify(roles)}`);
    console.log(`[cast-probe] seed=${SEED} CAMERA STATES: ${JSON.stringify(states)}`);
    console.log(
      `[cast-probe] seed=${SEED} RESULT usedSeed=${usedSeed}` +
        ` cast=${roles.some((r) => r.role === 'comebacker')}` +
        ` shot=${states.includes('COMEBACK_ZOOM')}` +
        ` frames=${frames}`
    );
    console.log(`[cast-probe] seed=${SEED} TOP REFUSALS: ${JSON.stringify(refusals)}`);

    // The only assertion: the instrument worked. Nothing about the product is claimed here.
    expect(cam.length, 'the camera-state HUD produced no trace at all').toBeGreaterThan(2);
  });
}
