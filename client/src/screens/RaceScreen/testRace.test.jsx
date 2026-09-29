// ============================================================
// File:        testRace.test.jsx
// Path:        client/src/screens/RaceScreen/testRace.test.jsx
// Project:     RaceArena — PARTICLES-VISIBILITY-12
// Description: A test race from the Track Editor, as the race screen sees it: it draws the effects
//              its payload carries — the editor's UNSAVED ones — instead of the stored track's, and a
//              cancelled test race goes back to the Track Editor, not to Setup. An ordinary race is
//              the control on both.
// ============================================================
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The effect registry, passed through, so the test can see which effects the race creates.
vi.mock('../../modules/track-effects/index.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, getEffect: vi.fn(real.getEffect) };
});

import RaceScreen from './index.jsx';
import { getEffect } from '../../modules/track-effects/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');

/** Dirt Oval as shipped: its stored effect is rain. */
const GEOMETRY = JSON.parse(
  readFileSync(join(REPO, 'server', 'seeds', 'tracks', 'dirt-oval.json'), 'utf8')
);

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/race']}>
      <Routes>
        <Route path="/race" element={<RaceScreen />} />
        <Route path="/track-editor" element={<div>track editor</div>} />
        <Route path="/setup" element={<div>setup</div>} />
      </Routes>
    </MemoryRouter>
  );

function stubCanvas2d() {
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
    .mockImplementation((kind) => (kind === '2d' ? ctx : null));
}

const BUBBLES = [
  { id: 'bubbles', config: { count: 24000, size: 2, color: '#aaddff', opacity: 0.5 } },
];

/** The payload RaceScreen reads, as Setup writes it — plus `testRace` when it is a test race. */
const race = (extra = {}) => ({
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
  raceSource: 'quick-test',
  timestamp: '2026-09-29T00:00:00.000Z',
  ...extra,
});

let restoreCanvas;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  getEffect.mockClear();
  restoreCanvas = stubCanvas2d();
  let frames = 0;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    if (frames >= 3) return 0;
    frames += 1;
    return Number(setTimeout(() => cb(performance.now()), 0));
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
  localStorage.setItem(`racearena:trackGeometries:${GEOMETRY.id}`, JSON.stringify(GEOMETRY));
});

afterEach(() => {
  cleanup();
  restoreCanvas?.mockRestore();
  vi.restoreAllMocks();
});

const createdEffectIds = () => getEffect.mock.calls.map(([id]) => id);

describe('RaceScreen — a test race from the Track Editor (PARTICLES-VISIBILITY-12)', () => {
  it('draws the effects the test race carries, not the stored track’s', async () => {
    expect(GEOMETRY.effects.map((e) => e.id)).toEqual(['rain']);
    sessionStorage.setItem('activeRace', JSON.stringify(race({ testRace: { effects: BUBBLES } })));
    mount();
    await waitFor(() => expect(createdEffectIds()).toContain('bubbles'));
    expect(createdEffectIds()).not.toContain('rain');
  });

  it('an ordinary race draws the stored track’s effects (the control)', async () => {
    sessionStorage.setItem('activeRace', JSON.stringify(race()));
    mount();
    await waitFor(() => expect(createdEffectIds()).toContain('rain'));
    expect(createdEffectIds()).not.toContain('bubbles');
  });

  it('a cancelled test race goes back to the Track Editor', async () => {
    sessionStorage.setItem('activeRace', JSON.stringify(race({ testRace: { effects: BUBBLES } })));
    mount();
    fireEvent.click(await screen.findByTestId('cancel-race'));
    await waitFor(() => expect(screen.getByText('track editor')).toBeInTheDocument());
    expect(sessionStorage.getItem('raceResults')).toBeNull();
  });

  it('a cancelled ordinary race still goes back to Setup (the control)', async () => {
    sessionStorage.setItem('activeRace', JSON.stringify(race()));
    mount();
    fireEvent.click(await screen.findByTestId('cancel-race'));
    await waitFor(() => expect(screen.getByText('setup')).toBeInTheDocument());
  });
});
