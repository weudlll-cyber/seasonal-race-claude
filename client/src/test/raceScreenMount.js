// ============================================================
// File:        raceScreenMount.js
// Path:        client/src/test/raceScreenMount.js
// Project:     RaceArena — RACESCREEN-MOUNT-1, extracted by TEST-AIDS-1
//
// WHAT `RaceScreen` NEEDS TO MOUNT IN jsdom, in one place. Test-only; nothing under `src/modules` or
// `src/screens` imports it. Moved verbatim out of `screens/RaceScreen/mount.test.jsx` when a second
// file (`testAidsRace.test.jsx`) needed the same scaffolding; the reasons are that file's header,
// kept there. In short:
//   1. `sessionStorage['activeRace']`  — else the load effect throws and the error card renders.
//   2. the track geometry in `localStorage` — the REAL shipped record from `server/seeds/tracks/`.
//   3. a 2D context — jsdom returns null and the effect would throw on the first property set.
//   4. `requestAnimationFrame` — driven for a bounded number of frames, so the draw loop is entered.
// ============================================================

import { vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');

/** The shipped record for a closed track, used as the geometry exactly as the harnesses use it. */
export const GEOMETRY = JSON.parse(
  readFileSync(join(REPO, 'server', 'seeds', 'tracks', 'dirt-oval.json'), 'utf8')
);

/**
 * A 2D context that answers every call. jsdom implements no canvas, so without this the very first
 * line of the animation effect (`ctx.imageSmoothingQuality = 'low'`) throws on null.
 *
 * It records nothing and asserts nothing on purpose — the moment a test starts checking draw calls it
 * has become a worse copy of `render-fingerprint.mjs`.
 */
export function stubCanvas2d() {
  // PARTICLES-VISIBILITY-4: track effects cull against the canvas under the current transform, so the
  // stub answers both the way a real 2D context does — the race canvas's fixed 1280x720 store and an
  // identity matrix — instead of null and undefined.
  const ctx = new Proxy(
    { canvas: { width: 1280, height: 720 } },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return () => ({ width: 10 });
        if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        if (prop === 'getImageData')
          return (x, y, w, h) => new globalThis.ImageData(w || 1, h || 1);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
          return () => ({ addColorStop() {} });
        if (prop === 'createPattern') return () => null;
        if (typeof prop === 'string') return () => undefined;
        return undefined;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function get2d(kind) {
      return kind === '2d' ? ctx : null;
    });
}

/** The payload SetupScreen writes, reduced to the fields RaceScreen reads on the way in. */
export function activeRace(overrides = {}) {
  return {
    racers: Array.from({ length: 6 }, (_, i) => ({ name: `Racer ${i + 1}` })),
    trackId: GEOMETRY.id,
    trackName: GEOMETRY.name,
    geometryId: GEOMETRY.id,
    racerTypeId: GEOMETRY.defaultRacerTypeId,
    worldWidth: GEOMETRY.worldWidth ?? 1280,
    worldHeight: GEOMETRY.worldHeight ?? 720,
    duration: 60,
    raceMode: 'laps',
    targetLaps: 2,
    realizedDurationSec: 60,
    paceScale: 1,
    trackSurfaceClasses: GEOMETRY.surfaceClasses ?? [],
    racePlanEnabled: true,
    racePlanSeed: 5601,
    raceActionStage: 'quiet',
    timestamp: '2026-09-04T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * A BOUNDED frame clock. Unbounded, the draw loop would spin for the whole test; zero frames and the
 * loop is scheduled but never entered. Returns a reader for how many frames were handed out.
 * @param {number} frames
 */
export function boundedFrameClock(frames = 3) {
  let handed = 0;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    if (handed >= frames) return 0;
    handed += 1;
    const id = setTimeout(() => cb(performance.now()), 0);
    return Number(id);
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
  return () => handed;
}

/** Puts the shipped geometry and a race payload where RaceScreen looks for them. */
export function seedRace(overrides = {}) {
  localStorage.setItem(`racearena:trackGeometries:${GEOMETRY.id}`, JSON.stringify(GEOMETRY));
  sessionStorage.setItem('activeRace', JSON.stringify(activeRace(overrides)));
}
