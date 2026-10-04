// ============================================================
// File:        run.mjs
// Path:        reports/evolution/LARGE-FIELD-PERF-2/run.mjs
// Project:     RaceArena — LARGE-FIELD-PERF-2 (2026-10-04)
// Description: Runs real browser races on a production build and records, for every frame, how long
//              it took, the camera state, and — through Chrome's own CPU profiler — which code ran.
//              Measurement only: nothing in the product is changed or switched on except the
//              project's existing frame probe.
//
// WHAT IT READS, AND FROM WHERE
//   · Frame times: an rAF callback of the harness's own records the frame's rAF timestamp once per
//     frame, numbered from the moment Quick Test is clicked. Every rAF callback in a page runs once per
//     frame, so this is the frame clock the race's own loop sees.
//   · Camera state per frame: the project's existing probe, `client/src/modules/rAFProbe.js`
//     (switched on by its sessionStorage flag `_ra_perfprobe`, as `?perfprobe=1` does). It keeps the
//     last 600 frames, so the harness reads it every POLL_MS while the race screen is open and gives
//     each new entry the harness's frame number. Each stitched entry's own time is compared with the
//     harness's time for that frame number; a disagreement is counted and reported (`mismatch`), so a
//     stitching error cannot pass silently. The last poll before the result screen is not used —
//     at most POLL_MS of the very end of the hold is not in the data.
//   · Which code ran: the Chrome DevTools Protocol CPU profiler, sampling every 1 ms. Samples are
//     mapped to source files and lines by `analyse.mjs`, through the build's source maps. To put the
//     profiler's clock on the page's clock, the harness runs a named 20 ms busy loop
//     (`__raCalibrationMarker`) at a recorded `performance.now()` right after the profiler starts.
//
// HTTP goes only to 127.0.0.1:<port>, a server the measurer started.
//
// Usage:
//   PERF_PASS=<password> node reports/evolution/LARGE-FIELD-PERF-2/run.mjs <port> <plan.json> <out-dir>
//   (run from the repository root; Playwright is resolved from client/)
//   plan: [{ "track": "Luger hill", "n": 80, "seed": 12345 }, ...]
//   writes <out-dir>/<i>-<track>-<n>-<seed>.frames.json and .cpuprofile per race
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const [, , portArg, planFile, outDir] = process.argv;
if (!portArg || !planFile || !outDir) {
  console.error('usage: node run.mjs <port> <plan.json> <out-dir>');
  process.exit(2);
}
const require = createRequire(join(process.cwd(), 'client', 'package.json'));
const { chromium } = require('playwright');

const BASE = `http://127.0.0.1:${portArg}`;
const USER = process.env.PERF_USER ?? 'perf';
const PASS = process.env.PERF_PASS ?? '';
const POLL_MS = 500;
const PROBE_RING = 600; // `RING` in client/src/modules/rAFProbe.js
const plan = JSON.parse(readFileSync(planFile, 'utf8'));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: [
    '--start-maximized',
    // A covered window must not be throttled: the measurement is of the race, not of Windows.
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  ],
});
const context = await browser.newContext({ viewport: null });
await context.addInitScript(() => {
  try {
    sessionStorage.setItem('_ra_perfprobe', '1');
  } catch {}
  window.__harnessTs = [];
  // The rAF timestamp, not performance.now(): it is the frame's own start, identical for every
  // callback in that frame — including the race loop's and the probe's — so the gaps agree exactly.
  const tick = (frameStart) => {
    window.__harnessTs.push(frameStart);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await page.goto(`${BASE}/login`);
await page.getByLabel(/username/i).fill(USER);
await page.getByLabel(/password/i).fill(PASS);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });

async function geometriesCached() {
  await page.waitForFunction(
    () => {
      try {
        const idx = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') ?? '{}');
        return Object.keys(idx).length >= 10;
      } catch {
        return false;
      }
    },
    null,
    { timeout: 60000 }
  );
}

for (const [i, race] of plan.entries()) {
  const started = Date.now();
  await page.goto(`${BASE}/setup`);
  await geometriesCached();
  await page.evaluate((seed) => sessionStorage.setItem('quickTestSeed', String(seed)), race.seed);
  await page.reload();
  await geometriesCached();
  await page.locator(`button[title="${race.track}"]`).first().click();
  // The Quick Test N field: the number input with min 1 and the track's cap as max.
  let set = false;
  for (const inp of await page.locator('input[type="number"]').all()) {
    if ((await inp.getAttribute('min')) === '1' && Number(await inp.getAttribute('max')) >= 40) {
      await inp.fill(String(race.n));
      set = true;
      break;
    }
  }
  if (!set) throw new Error('Quick Test N field not found');

  // `"profile": false` in the plan runs the same race with no profiler: the arm that says how much
  // the profiler itself costs.
  const profiling = race.profile !== false;
  if (profiling) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    await cdp.send('Profiler.start');
  }
  // Calibration: a named busy loop at a known page time, findable in the profile. The frame list is
  // emptied in the same call, so frame number m is __harnessTs[m - 1] from here on.
  const calibAt = await page.evaluate(() => {
    window.__harnessTs = [];
    const t0 = performance.now();
    function __raCalibrationMarker() {
      const end = performance.now() + 20;
      while (performance.now() < end) {
        // spin: this function's samples are what the analysis looks for
      }
    }
    __raCalibrationMarker();
    return t0;
  });

  await page.getByRole('button', { name: new RegExp(`Quick Test \\(${race.n}\\)`) }).click();
  await page.waitForURL(/\/race/, { timeout: 20000 });

  // stitched[j] = [frameNumber, state, probeGap]
  const stitched = [];
  let prevCount = null;
  let lost = 0;
  for (;;) {
    await page.waitForTimeout(POLL_MS);
    const snap = await page.evaluate(() => ({
      c: window.__harnessTs.length,
      raw: typeof window.__perfProbeRaw === 'function' ? window.__perfProbeRaw() : null,
      path: location.pathname,
    }));
    if (!snap.path.startsWith('/race')) break;
    if (!snap.raw || snap.raw.length === 0) continue;
    const L = snap.raw.length;
    const k = prevCount === null ? L : snap.c - prevCount;
    if (prevCount !== null && k > L) lost += k - L;
    const take = Math.min(k, L);
    for (let j = L - take; j < L; j++) {
      stitched.push([snap.c - (L - 1 - j), snap.raw[j].state, snap.raw[j].gap]);
    }
    if (prevCount === null && L === PROBE_RING) lost = -1; // first read already full: start unknown
    prevCount = snap.c;
    if (Date.now() - started > 6 * 60 * 1000) throw new Error('race did not end within 6 minutes');
  }
  let profile = null;
  if (profiling) {
    ({ profile } = await cdp.send('Profiler.stop'));
    await cdp.send('Profiler.disable');
  }

  const meta = await page.evaluate(() => {
    const a = JSON.parse(sessionStorage.getItem('activeRace') || '{}');
    return {
      trackId: a.trackId,
      fieldSize: (a.racers || []).length,
      seed: a.racePlanSeed,
      raceMode: a.raceMode,
      racerTypeId: a.racerTypeId,
      ts: window.__harnessTs,
    };
  });
  if (meta.fieldSize !== race.n) throw new Error(`field ${meta.fieldSize}, planned ${race.n}`);

  // Frame m started at ts[m - 2] and ended at ts[m - 1] (frame numbers count from 1).
  const ts = meta.ts;
  let mismatch = 0;
  const frames = [];
  for (const [m, state, probeGap] of stitched) {
    if (m < 2 || m > ts.length) continue;
    const gap = ts[m - 1] - ts[m - 2];
    if (Math.abs(gap - probeGap) > 0.6) mismatch++;
    frames.push([Math.round(gap * 100) / 100, state, Math.round(ts[m - 2] * 100) / 100]);
  }

  const base = `${String(i).padStart(2, '0')}-${race.track.replace(/\s+/g, '_')}-${race.n}-${race.seed}${profiling ? '' : '-noprof'}`;
  writeFileSync(
    join(outDir, `${base}.frames.json`),
    JSON.stringify({ ...race, meta: { ...meta, ts: undefined }, calibAt, lost, mismatch, frames })
  );
  if (profile) writeFileSync(join(outDir, `${base}.cpuprofile`), JSON.stringify(profile));
  const sorted = frames.map((f) => f[0]).sort((a, b) => a - b);
  console.log(
    `${i + 1}/${plan.length} ${race.track} n=${race.n} seed=${race.seed} frames=${frames.length} ` +
      `lost=${lost} mismatch=${mismatch} p50=${sorted[Math.floor(sorted.length / 2)]?.toFixed(1)} ` +
      `>33=${sorted.filter((g) => g > 33).length} ${Math.round((Date.now() - started) / 1000)}s`
  );
}
await browser.close();
