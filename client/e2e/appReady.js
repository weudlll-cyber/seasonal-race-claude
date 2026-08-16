// ============================================================
// File:        client/e2e/appReady.js
// Path:        client/e2e/appReady.js
// Project:     RaceArena — E2E-FLAKE-1
//
// ONE HOME for "this page has the server-backed data the spec is about to act on".
//
// ── THE MECHANISM, ESTABLISHED BEFORE ANYTHING WAS REPAIRED ────────────────────────────────────
//
// Four tests failed exactly 1 of 5 runs on 2026-08-16, all four touching localStorage or session
// state, which read like one spec inheriting what another left behind. IT IS NOT THAT, and the
// suite's own artefact settles it: the browser state every test starts from, `e2e/.auth/state.json`,
// carries exactly TWO things — the session cookie and `racearena:lastUser`. No track cache, no
// geometries, no surface classes, no config. Each test gets its own context, so nothing a spec
// writes can reach another one, and the single thing they do share holds none of the keys involved.
//
// WHAT IT IS INSTEAD: EVERY server-backed loader in this app renders a default first and swallows
// a failed fetch, and each test starts with a cold cache.
//
//   trackLoader.js         `cacheTrackGeometry`: 3000 ms timeout, `catch { return null }`, and the
//                          caller uses `Promise.allSettled` — so a dropped geometry is invisible
//                          and the track list renders without it.
//   surfaceClassLoader.js  `fetchServerSurfaceClasses`: 3000 ms timeout, and on failure it falls
//                          back to the localStorage cache — EMPTY in a fresh context — so the
//                          screen keeps the code defaults and no override exists.
//   useServerTracks /      both seed their state from the cache (or the code defaults) and update
//   useSurfaceClasses      only if the fetch succeeds. There is no retry to wait for.
//
// The consumers then read those defaults as facts. `handleQuickTest` is the sharpest case:
//
//   `const geom = getTrack(track.geometryId); return geom ? !geom.closed : false`
//
// — a missing geometry IS a closed track. So an open track quick-tested with its geometry dropped
// runs as a laps race, and the spec asserting `raceMode === 'time'` reads `'laps'`. Ten geometry
// fetches per page load, seven workers doing it at once against ONE API server, three seconds each.
// That is why it looked like load, and why it looked like ordering.
//
// AND NOTE THE TIMING, because it rules out "the spec clicked too early": the track buttons render
// from state that is set only after the loader has settled, so by the time anything is clickable
// the fetches are over. The missing data is data that FAILED, not data still in flight — which is
// why the helpers below give the app another page load rather than simply waiting longer.
//
// ── WHY THIS AND NOT `workers: 1` ──────────────────────────────────────────────────────────────
// Serialising the suite would make the race easier to win; it would not stop a spec from DEPENDING
// on winning it. The dependency is the defect — a suite that passes because it is slow enough has a
// hidden rule exactly the way a suite that passes in one order does. These make the precondition
// explicit and checkable, and cost nothing when it is already satisfied.
//
// NEITHER HELPER WEAKENS AN ASSERTION. The check is unchanged and must still hold; what is added is
// a second chance for the app to fetch what it silently dropped, and a last attempt that fails
// loudly, naming the mechanism.
// ============================================================

import { expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

/** Which geometry cache keys the app needs — asked of the API rather than assumed. */
async function geometryKeys(page) {
  const res = await page.request.get(`${E2E.apiUrl}/api/tracks`);
  expect(res.ok(), `GET /api/tracks → ${res.status()}`).toBeTruthy();
  const keys = (await res.json())
    .map((t) => t.geometryId)
    .filter(Boolean)
    .map((id) => `racearena:trackGeometries:${id}`);
  expect(keys.length, 'the server served no track with a geometry').toBeGreaterThan(0);
  return keys;
}

const missingIn = (page, keys) =>
  page.evaluate((ks) => ks.filter((k) => localStorage.getItem(k) === null), keys);

/**
 * Every track geometry is in the browser's cache before the spec acts on a track.
 *
 * Call AFTER navigating to a page on the app origin — localStorage is per origin, so there is
 * nothing to read before the first `goto`.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function ensureTrackGeometriesCached(page, { attempts = 4 } = {}) {
  const keys = await geometryKeys(page);

  for (let i = 0; i < attempts - 1; i++) {
    try {
      await expect.poll(() => missingIn(page, keys), { timeout: 6_000 }).toEqual([]);
      return;
    } catch {
      await page.reload();
    }
  }

  expect(
    await missingIn(page, keys),
    `after ${attempts} page loads the app still had not cached every track geometry — a ` +
      '`cacheTrackGeometry` fetch keeps losing its 3 s race and being swallowed'
  ).toEqual([]);
}

/**
 * Run a navigate-and-check block again if it fails, because the most likely reason it failed is a
 * server fetch this app drops without saying so. The block must NAVIGATE — re-running it is what
 * gives the loader a fresh attempt; the last attempt is not caught, so a real defect still fails
 * with its own message.
 *
 * @param {() => Promise<unknown>} block
 */
export async function withServerDataRetry(block, { attempts = 3 } = {}) {
  for (let i = 0; i < attempts - 1; i++) {
    try {
      return await block();
    } catch {
      // fall through to the next attempt
    }
  }
  return await block();
}
