// ============================================================
// File:        CameraMarkerHUD.test.jsx
// Path:        client/src/screens/RaceScreen/CameraMarkerHUD.test.jsx
// Project:     RaceArena
// Description: CAMERA-REPRO-1 Part D — tests for the owner-side marker.
//
//              The point of the marker is that pressing one key during a race, without thinking
//              about tooling, yields one usable line. So these tests cover the ways that fails in
//              practice: the key not landing, the key landing when it should not, the clipboard
//              being unavailable, and the line arriving with a newline in it.
// ============================================================

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRef } from 'react';
import CameraMarkerHUD from './CameraMarkerHUD.jsx';
import { MARKER_PREFIX, parseMarkerLine } from '../../modules/camera/cameraMarker.js';

const MARKER = {
  v: 1,
  at: '2026-08-02T10:00:00.000Z',
  build: 'abc1234',
  race: {
    geo: 'custom-x',
    track: 'Searound',
    n: 2,
    type: 'manta',
    seed: 5601,
    plan: true,
    names: ['A', 'B'],
  },
  cam: { seed: 4242 },
  moment: { pts: 16000, cms: 20000, prog: 0.3, fi: 10, log: { frame: false, detour: false } },
  shot: { st: 'LEADER_ZOOM', lp: 'tracking', op: 'follow', z: 2, ox: -100, oy: -50, ez: 1.2 },
  world: { leader: 'A', lt: 0.5, tsum: 0.9 },
  cfg: { fp: 'ded0a126', diff: {}, types: {} },
};

let written;
let infoSpy;

function press(key = 'm', init = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });
}

beforeEach(() => {
  written = [];
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: {
      writeText: vi.fn((t) => {
        written.push(t);
        return Promise.resolve();
      }),
    },
  });
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  infoSpy.mockRestore();
  vi.useRealTimers();
});

describe('CameraMarkerHUD', () => {
  it('renders nothing until a marker is taken — it must not sit in front of the race', () => {
    const ref = createRef();
    ref.current = () => MARKER;
    const { container } = render(<CameraMarkerHUD buildRef={ref} />);
    expect(container.firstChild).toBeNull();
  });

  it('M puts exactly one parseable line on the clipboard', async () => {
    const ref = createRef();
    ref.current = () => MARKER;
    render(<CameraMarkerHUD buildRef={ref} />);
    press('m');
    expect(written).toHaveLength(1);
    expect(written[0].startsWith(MARKER_PREFIX)).toBe(true);
    expect(written[0].split('\n')).toHaveLength(1);
    expect(parseMarkerLine(written[0])).toEqual(MARKER);
  });

  it('uppercase M works too — caps lock is not a reason to lose the moment', () => {
    const ref = createRef();
    ref.current = () => MARKER;
    render(<CameraMarkerHUD buildRef={ref} />);
    press('M');
    expect(written).toHaveLength(1);
  });

  it('also prints the line to the console, so a blocked clipboard still leaves something to copy', () => {
    const ref = createRef();
    ref.current = () => MARKER;
    render(<CameraMarkerHUD buildRef={ref} />);
    press('m');
    const logged = infoSpy.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes(MARKER_PREFIX));
    expect(logged).toBeTruthy();
    expect(parseMarkerLine(logged)).toEqual(MARKER);
  });

  it('confirms the press with a chip, and the chip goes away on its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const ref = createRef();
    ref.current = () => MARKER;
    render(<CameraMarkerHUD buildRef={ref} />);
    press('m');
    await act(async () => {}); // let the clipboard promise settle
    expect(screen.getByText(/MARK copied/)).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/MARK copied/)).toBeNull();
  });

  it('warns instead of lying when the race is unseeded', async () => {
    const ref = createRef();
    ref.current = () => ({ ...MARKER, race: { ...MARKER.race, seed: 0 } });
    render(<CameraMarkerHUD buildRef={ref} />);
    press('m');
    await act(async () => {});
    expect(screen.getByText(/UNSEEDED/)).toBeTruthy();
  });

  it('says so when no race is running rather than emitting a hollow marker', async () => {
    const ref = createRef();
    ref.current = () => null;
    render(<CameraMarkerHUD buildRef={ref} />);
    press('m');
    await act(async () => {});
    expect(written).toHaveLength(0);
    expect(screen.getByText(/no race running/)).toBeTruthy();
  });

  it('ignores M while the owner is typing in a field', () => {
    const ref = createRef();
    ref.current = () => MARKER;
    render(
      <>
        <input data-testid="field" />
        <CameraMarkerHUD buildRef={ref} />
      </>
    );
    const field = screen.getByTestId('field');
    act(() => {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    });
    expect(written).toHaveLength(0);
  });

  it('ignores modified presses (Ctrl/Cmd/Alt+M) and key repeat', () => {
    const ref = createRef();
    ref.current = () => MARKER;
    render(<CameraMarkerHUD buildRef={ref} />);
    press('m', { ctrlKey: true });
    press('m', { metaKey: true });
    press('m', { altKey: true });
    press('m', { repeat: true });
    expect(written).toHaveLength(0);
  });

  it('ignores every other key', () => {
    const ref = createRef();
    ref.current = () => MARKER;
    render(<CameraMarkerHUD buildRef={ref} />);
    for (const k of ['n', 'r', 'Escape', ' ', 'Enter']) press(k);
    expect(written).toHaveLength(0);
  });

  it('reports a blocked clipboard instead of failing silently', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
    });
    const ref = createRef();
    ref.current = () => MARKER;
    render(<CameraMarkerHUD buildRef={ref} />);
    press('m');
    await act(async () => {});
    expect(screen.getByText(/clipboard blocked/)).toBeTruthy();
  });

  it('stops listening once unmounted — a dead race screen must not answer M', () => {
    const ref = createRef();
    ref.current = () => MARKER;
    const { unmount } = render(<CameraMarkerHUD buildRef={ref} />);
    unmount();
    press('m');
    expect(written).toHaveLength(0);
  });
});
