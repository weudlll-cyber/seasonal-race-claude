// ============================================================
// File:        testAidsRace.test.jsx
// Path:        client/src/screens/RaceScreen/testAidsRace.test.jsx
// Project:     RaceArena — TEST-AIDS-1
// Description: THE RACE SCREEN'S TEST AIDS, gated on the one switch. The real screen is mounted
//              (the RACESCREEN-MOUNT-1 scaffolding, `test/raceScreenMount.js`) with EVERY aid stored
//              ON in the browser, then read with the switch OFF and ON:
//                · what reaches the renderer — the build and settings badges (1, 2), the race-plan
//                  pill (3), the hero rings and the diagnostic keys (4, 13–24), the re-roll marker (25);
//                · the M-key camera marker (7) and the race-inputs console probe.
//              It reads the renderer's INPUTS, not its drawing — what the drawing does with them is
//              the render fingerprint's question.
// ============================================================

import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubCanvas2d, boundedFrameClock, seedRace } from '../../test/raceScreenMount.js';
import { KEYS, storageSet } from '../../modules/storage/storage.js';
import { TEST_AID_CAMERA_KEYS, _setTestAidsForTests } from '../../modules/testAids.js';

const frames = vi.hoisted(() => []);
vi.mock('./renderRaceFrame.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    renderRaceFrame: (ctx, f) => {
      frames.push(f);
      return actual.renderRaceFrame(ctx, f);
    },
  };
});

const { default: RaceScreen } = await import('./index.jsx');

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/race']}>
      <RaceScreen />
    </MemoryRouter>
  );

/** Mount with the switch as given and wait for the first frame the renderer is handed. */
async function firstFrame(aids) {
  _setTestAidsForTests(aids);
  mount();
  await screen.findByTestId('race-canvas-wrapper');
  await waitFor(() => expect(frames.length).toBeGreaterThan(0));
  return frames[0];
}

let restoreCanvas;
beforeEach(() => {
  frames.length = 0;
  sessionStorage.clear();
  localStorage.clear();
  restoreCanvas = stubCanvas2d();
  boundedFrameClock(3);
  seedRace();
  // Every aid stored ON in this browser — the switch must win over all of it.
  storageSet(KEYS.CAMERA_CONFIG, Object.fromEntries(TEST_AID_CAMERA_KEYS.map((k) => [k, true])));
  storageSet(KEYS.RACE_DYNAMICS_CONFIG, { gapRerollDevMarker: true });
  localStorage.setItem('racearena:raceInputsProbe', '1');
  delete window.__raRaceInputs;
});

afterEach(() => {
  cleanup();
  restoreCanvas?.mockRestore();
  vi.restoreAllMocks();
  _setTestAidsForTests('unknown');
});

describe('items 1–3: the build badge, the settings badge, the race-plan pill', () => {
  it('OFF: none of them reaches the renderer', async () => {
    const f = await firstFrame(false);
    expect(f.buildBadge).toBeNull();
    expect(f.cfgBadge).toBeNull();
    expect(f.racePlanActive).toBe(false);
  });

  it('ON: all three, as before the switch', async () => {
    const f = await firstFrame(true);
    expect(f.buildBadge).toEqual(expect.objectContaining({ commit: expect.any(String) }));
    expect(f.cfgBadge).toEqual(expect.objectContaining({ hashShort: expect.any(String) }));
    expect(f.racePlanActive).toBe(true);
  });
});

describe('items 4 and 13–24: the hero rings and every diagnostic display', () => {
  it('OFF: each key reads false, though the browser stored it ON', async () => {
    const f = await firstFrame(false);
    for (const k of TEST_AID_CAMERA_KEYS) expect([k, f.cameraConfig[k]]).toEqual([k, false]);
  });

  it('ON: each key is what the browser stored', async () => {
    const f = await firstFrame(true);
    for (const k of TEST_AID_CAMERA_KEYS) expect([k, f.cameraConfig[k]]).toEqual([k, true]);
  });
});

describe('item 25: the gap re-roll marker', () => {
  it('OFF: not drawn, though stored ON', async () => {
    expect((await firstFrame(false)).gapRerollDevMarker).toBe(false);
  });
  it('ON: drawn as stored', async () => {
    expect((await firstFrame(true)).gapRerollDevMarker).toBe(true);
  });
});

describe('item 7: the M-key camera marker', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    });
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('OFF: pressing M marks nothing', async () => {
    await firstFrame(false);
    fireEvent.keyDown(window, { key: 'm' });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/MARK/)).not.toBeInTheDocument();
  });

  it('ON: pressing M answers (here "no race running" — the countdown is still on)', async () => {
    await firstFrame(true);
    fireEvent.keyDown(window, { key: 'm' });
    expect(await screen.findByText(/MARK/)).toBeInTheDocument();
  });
});

describe('the race-inputs console probe', () => {
  it('OFF: ignored, though switched on in storage', async () => {
    await firstFrame(false);
    expect(window.__raRaceInputs).toBeUndefined();
  });
  it('ON: reports the race inputs', async () => {
    await firstFrame(true);
    expect(window.__raRaceInputs).toEqual(expect.objectContaining({ racePlanSeed: 5601 }));
  });
});
