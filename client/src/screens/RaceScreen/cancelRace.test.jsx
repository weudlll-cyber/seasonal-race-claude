// ============================================================
// File:        cancelRace.test.jsx
// Path:        client/src/screens/RaceScreen/cancelRace.test.jsx
// Project:     RaceArena — CANCEL-RACE-1
//
// THE CONTROL THAT ENDS A RUNNING RACE, AND THE THING IT USED TO LEAVE BEHIND.
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────────
//
// A control that ends the race and returns to Setup was ALREADY in the tree — the race HUD's button,
// which removed `activeRace` and navigated. What it did not do was leave the browser's FULLSCREEN
// mode, and it is the only control that could: `toggleFullscreen` lives on this screen, so an
// operator who went fullscreen and then left landed on Setup with a fullscreen browser and no way
// back out of it. That is the defect these tests hold.
//
// ── WHAT IS ASSERTED, AND WHAT IS DELIBERATELY NOT ──────────────────────────────────────────────
//
// Asserted: the control exists while the race runs, says what it does, removes the race payload,
// navigates back to Setup, and exits fullscreen when the document is in it — and does NOT call
// `exitFullscreen` when it is not, because that call rejects.
//
// NOT asserted: anything about the picture, the camera, the physics or the finish. The unmount
// cleanup that releases the rAF loop, the timers, the observer and the effects is React's to run and
// `index.jsx:1740-1752` already owns it; a test here that re-checked it would be asserting the
// framework. The scaffolding (canvas, geometry, bounded rAF) is `mount.test.jsx`'s, repeated here
// because the two files must be able to fail independently.
// ============================================================

import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import RaceScreen from './index.jsx';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');

/** The shipped record for a closed track — the same one the harnesses race, not an invented shape. */
const GEOMETRY = JSON.parse(
  readFileSync(join(REPO, 'server', 'seeds', 'tracks', 'dirt-oval.json'), 'utf8')
);

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/race']}>
      <RaceScreen />
    </MemoryRouter>
  );

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
const activeRace = () => ({
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
});

let restoreCanvas;
let exitFullscreen;

/** Put the document into fullscreen the only way jsdom allows: define the property it reads. */
function setFullscreen(on) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => (on ? document.documentElement : null),
  });
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  restoreCanvas = stubCanvas2d();

  let frames = 0;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    if (frames >= 3) return 0;
    frames += 1;
    const id = setTimeout(() => cb(performance.now()), 0);
    return Number(id);
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));

  // jsdom implements neither call. Both are defined here so the component's optional calls have
  // something to hit and the test can see whether it hit them.
  exitFullscreen = vi.fn(() => Promise.resolve());
  document.exitFullscreen = exitFullscreen;
  setFullscreen(false);

  localStorage.setItem(`racearena:trackGeometries:${GEOMETRY.id}`, JSON.stringify(GEOMETRY));
  sessionStorage.setItem('activeRace', JSON.stringify(activeRace()));
});

afterEach(() => {
  cleanup();
  restoreCanvas?.mockRestore();
  vi.restoreAllMocks();
  setFullscreen(false);
});

describe('RaceScreen — Cancel Race', () => {
  // What breaks if deleted: the control could lose its name, or stop being rendered while the race
  // runs, and nothing would notice — the e2e selects it by test id.
  it('offers one control, named for what it does while the race is running', async () => {
    mount();
    await screen.findByTestId('race-canvas-wrapper');
    const btn = screen.getByTestId('cancel-race');
    expect(btn).toHaveTextContent('Cancel Race');
    // ONE control, not two: the extras the brief refused must not appear beside it.
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // What breaks if deleted: cancelling could leave `activeRace` in place, and the next visit to the
  // race screen would silently start the race that was just cancelled.
  it('removes the race payload so the cancelled race cannot restart', async () => {
    mount();
    await screen.findByTestId('race-canvas-wrapper');
    expect(sessionStorage.getItem('activeRace')).not.toBeNull();

    fireEvent.click(screen.getByTestId('cancel-race'));
    await waitFor(() => expect(sessionStorage.getItem('activeRace')).toBeNull());
  });

  // ★ THE DEFECT THIS PIECE EXISTS FOR. What breaks if deleted: the unwind loses its fullscreen exit
  // and the operator is stranded in a fullscreen browser on a screen with no fullscreen control.
  it('leaves fullscreen behind, because the control that undoes it is on this screen', async () => {
    mount();
    await screen.findByTestId('race-canvas-wrapper');
    setFullscreen(true);

    fireEvent.click(screen.getByTestId('cancel-race'));
    await waitFor(() => expect(exitFullscreen).toHaveBeenCalledTimes(1));
  });

  // What breaks if deleted: a guard could be dropped and `exitFullscreen` called unconditionally,
  // which REJECTS when the document is not in fullscreen — an unhandled rejection on every cancel.
  it('does not ask to exit fullscreen when it is not in fullscreen', async () => {
    mount();
    await screen.findByTestId('race-canvas-wrapper');
    expect(document.fullscreenElement).toBeNull();

    fireEvent.click(screen.getByTestId('cancel-race'));
    await waitFor(() => expect(sessionStorage.getItem('activeRace')).toBeNull());
    expect(exitFullscreen).not.toHaveBeenCalled();
  });
});
