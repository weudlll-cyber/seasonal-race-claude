// ============================================================
// File:        mount.test.jsx
// Path:        client/src/screens/RaceScreen/mount.test.jsx
// Project:     RaceArena — RACESCREEN-MOUNT-1
//
// THE FIRST TEST THAT MOUNTS `RaceScreen`.
//
// ── WHY THIS EXISTS, AND WHAT IT SUPERSEDES ─────────────────────────────────────────────────────
//
// `docs/BACKLOG.md` has carried "RaceScreen is not testable" since 2026-08-22, and the owner's
// decision D2 of 2026-08-23 was to KEEP THE FINDING AND DO NO WORK — "what is closed is the question
// of whether to act on it". The night chain of 2026-09-04 re-opened exactly that question and
// ordered this test, with its own reason: the action dial is about to be built on this screen, and
// 1,959 lines with nothing that renders them is the wrong ground to build on.
//
// So this supersedes D2 by a later instruction, not by ignoring it. D2 is not wrong and nothing here
// argues with it; the cost/benefit simply changed when the next feature landed on this file.
//
// ── WHAT IT IS AND IS NOT ───────────────────────────────────────────────────────────────────────
//
// It is the SMALLEST test that gets the real component past its own placeholder and asserts that the
// race chrome is on the page. It is a SMOKE TEST: it proves the screen renders, not that it renders
// anything correctly. Nothing about the picture, the camera or the physics is asserted here, and it
// must not grow into that — `render-fingerprint.mjs` and `viewer-invariants.mjs` drive the real
// bundle in a real browser and are strictly better instruments for every one of those questions.
// What THIS catches is the class they cannot: the screen failing to render at all.
//
// ── NO PRODUCTION CODE WAS CHANGED TO MAKE THIS POSSIBLE ────────────────────────────────────────
//
// RACESCREEN-SEAM-1 (2026-09-02) priced a seam at one line — a default parameter for
// `canvas.getContext` — and concluded the file did not need it. It still does not: jsdom's
// `HTMLCanvasElement.prototype.getContext` is stubbed HERE, in the test, which is where scaffolding
// belongs. The five things the screen needs are all supplied from outside it:
//
//   1. `sessionStorage['activeRace']`  — else the load effect throws and the error card renders.
//   2. the track geometry in `localStorage` — else `getTrack` returns null and the error card
//      renders. IT IS THE REAL SHIPPED RECORD, read from `server/seeds/tracks/`, not a hand-made
//      shape: a geometry invented here would drift from the ones the product runs.
//   3. a 2D context — jsdom returns null and the effect would throw on the first property set.
//   4. `requestAnimationFrame` — driven for a bounded number of frames, so the draw loop is
//      actually entered rather than merely scheduled.
//   5. a Router. `index.jsx` imports no router package, so grepping the file for `react-router`
//      says it needs none — and that is wrong. It calls `useFadeNavigate()` at :121, and that hook
//      (`contexts/TransitionContext.jsx:47`) falls back to `useNavigate()`, which throws outside a
//      Router. Found by running the mount, not by reading for it; recorded here because the same
//      search will mislead the next person the same way.
// ============================================================

import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import RaceScreen from './index.jsx';

/** The screen under the one context it actually requires. Nothing else is provided. */
const mount = () =>
  render(
    <MemoryRouter initialEntries={['/race']}>
      <RaceScreen />
    </MemoryRouter>
  );

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');

/** The shipped record for a closed track, used as the geometry exactly as the harnesses use it. */
const GEOMETRY = JSON.parse(
  readFileSync(join(REPO, 'server', 'seeds', 'tracks', 'dirt-oval.json'), 'utf8')
);

/**
 * A 2D context that answers every call. jsdom implements no canvas, so without this the very first
 * line of the animation effect (`ctx.imageSmoothingQuality = 'low'`) throws on null.
 *
 * It records nothing and asserts nothing on purpose — the moment a test here starts checking draw
 * calls it has become a worse copy of `render-fingerprint.mjs`.
 */
function stubCanvas2d() {
  const ctx = new Proxy(
    { canvas: null },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return () => ({ width: 10 });
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
function activeRace(overrides = {}) {
  return {
    racers: Array.from({ length: 6 }, (_, i) => ({ name: `Racer ${i + 1}` })),
    trackId: GEOMETRY.id,
    trackName: GEOMETRY.name,
    geometryId: GEOMETRY.id,
    racerTypeId: GEOMETRY.defaultRacerTypeId,
    worldWidth: GEOMETRY.worldWidth ?? 1280,
    worldHeight: GEOMETRY.worldHeight ?? 720,
    duration: 60,
    winners: 3,
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

let restoreCanvas;
let rafHandles;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  restoreCanvas = stubCanvas2d();

  // A BOUNDED frame clock. Unbounded, the draw loop would spin for the whole test; zero frames and
  // the loop is scheduled but never entered, which would make this a weaker test than it looks.
  rafHandles = 0;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    if (rafHandles >= 3) return 0;
    rafHandles += 1;
    const id = setTimeout(() => cb(performance.now()), 0);
    return Number(id);
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));

  localStorage.setItem(`racearena:trackGeometries:${GEOMETRY.id}`, JSON.stringify(GEOMETRY));
  sessionStorage.setItem('activeRace', JSON.stringify(activeRace()));
});

afterEach(() => {
  cleanup();
  restoreCanvas?.mockRestore();
  vi.restoreAllMocks();
});

describe('RaceScreen — it mounts', () => {
  // What breaks if deleted: the screen could stop rendering entirely and every existing test would
  // still pass, because not one of them renders it — App.test.jsx replaces it with `() => null`.
  // What goes unnoticed: a crash on mount, an effect that throws, a missing import, a hook order
  // change. All of them ship. That is the whole finding this answers.
  it('renders the race chrome, not the loading placeholder', async () => {
    mount();

    // The wrapper exists ONLY on the path past `if (!raceData) return <Loading…>`, so finding it is
    // the assertion that the component got through both of its gating effects.
    const wrapper = await screen.findByTestId('race-canvas-wrapper');
    expect(wrapper).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();

    // And the canvas the race is actually drawn on is under it, at the size the store is fixed to.
    const canvas = wrapper.querySelector('canvas.race-canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  // What breaks if deleted: the animation effect could stop running and the test above would still
  // pass — the chrome renders whether or not a frame is ever drawn.
  // What goes unnoticed: the screen rendering a permanently blank canvas, which is the shape of the
  // defect this file's stubs are most likely to hide.
  it('enters the draw loop rather than only scheduling it', async () => {
    mount();
    await screen.findByTestId('race-canvas-wrapper');
    await waitFor(() => expect(rafHandles).toBeGreaterThan(0));
  });

  // What breaks if deleted: the two tests above could both pass against a screen that renders its
  // ERROR card, since neither looks for one — and the error card is what a missing geometry gives.
  // What goes unnoticed: this file quietly testing the failure path and calling it a mount.
  it('is not showing an error card', async () => {
    mount();
    await screen.findByTestId('race-canvas-wrapper');
    expect(screen.queryByText(/Track geometry not found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Race data is invalid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No race data/i)).not.toBeInTheDocument();
  });
});
