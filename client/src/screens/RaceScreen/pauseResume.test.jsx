// ============================================================
// File:        pauseResume.test.jsx
// Path:        client/src/screens/RaceScreen/pauseResume.test.jsx
// Project:     RaceArena — PAUSE-RESUME-1
//
// PAUSE AND RESUME, DRIVEN THROUGH THE REAL RACE SCREEN (client/src/test/pauseRaceHarness.jsx says
// how, and why not through the headless simulator).
//
// Here: the PICTURE — every call made on the race canvas, frame by frame, hashed; the paused frames
// must draw nothing at all, and once those are taken out the paused run must have drawn exactly the
// frames the unpaused run drew (the countdown number, the drawn race timer, the camera, the
// effects) — and the controls: the button, Space, the overlay, the boundary at the finish.
// The result determinism over twelve races is pauseDeterminismClosed / pauseDeterminismOpen.
// ============================================================

import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RaceScreen from './index.jsx';
import {
  FRAME_MS,
  MAX_FRAMES,
  installPauseHarness,
  inCountdown,
  overlay,
  pauseButton,
  pausePoints,
  pressSpace,
  pumpFrame,
  raceFor,
  results,
  runRace,
} from '../../test/pauseRaceHarness.jsx';

installPauseHarness();

describe('PAUSE-RESUME-1 — a paused race draws the same picture', () => {
  // The PICTURE, frame by frame, on one closed and one open track. Costlier than the result check
  // (every canvas call is hashed), so two cases rather than twelve.
  it.each([
    ['dirt-oval', 101],
    ['river-run', 9909],
  ])(
    '%s seed %i: every frame drawn after a resume is the frame the unpaused race drew',
    (trackId, seed) => {
      const race = raceFor(trackId, seed);
      // A warm-up run first: some drawing modules fill a cache from Math.random the first time they
      // draw (the background's stars, for one), which shifts the stream for the run that fills it.
      // After one run nothing does, and the two compared runs start from the same place.
      runRace(race);
      const plain = runRace(race, [], { record: true });
      const paused = runRace(race, pausePoints(plain), { record: true });
      expect(paused.paused.every((f) => f.calls === 0)).toBe(true);
      expect(paused.frames.length).toBe(plain.frames.length);
      // The first frame that differs, by index, so a failure says WHERE rather than "arrays differ".
      const firstDiff = paused.frames.findIndex(
        (f, i) => f.hash !== plain.frames[i].hash || f.calls !== plain.frames[i].calls
      );
      expect(firstDiff, `frame ${firstDiff} differs`).toBe(-1);
    },
    120000
  );
});

// ── THE CONTROLS ────────────────────────────────────────────────────────────────────────────────
describe('PAUSE-RESUME-1 — the control, the key and the overlay', () => {
  function mountRace() {
    sessionStorage.setItem('activeRace', JSON.stringify(raceFor('dirt-oval', 101)));
    render(
      <MemoryRouter initialEntries={['/race']}>
        <RaceScreen />
      </MemoryRouter>
    );
    for (let i = 0; i < 5; i++) pumpFrame();
  }

  it('the button pauses and resumes, and the overlay shows only while paused', () => {
    mountRace();
    expect(pauseButton()).toHaveTextContent('Pause');
    expect(overlay()).toBeNull();
    act(() => fireEvent.click(pauseButton()));
    expect(overlay()).toHaveTextContent('PAUSED');
    expect(pauseButton()).toHaveTextContent('Resume');
    expect(pauseButton()).toHaveAttribute('aria-pressed', 'true');
    act(() => fireEvent.click(pauseButton()));
    expect(overlay()).toBeNull();
    expect(pauseButton()).toHaveTextContent('Pause');
  });

  it('Space pauses and resumes, without scrolling and without a second toggle from a held key', () => {
    mountRace();
    expect(pressSpace()).toBe(true);
    expect(overlay()).not.toBeNull();
    // A held key repeats keydown; it must not toggle again.
    const repeat = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      repeat: true,
      cancelable: true,
    });
    act(() => window.dispatchEvent(repeat));
    expect(repeat.defaultPrevented).toBe(true);
    expect(overlay()).not.toBeNull();
    expect(pressSpace()).toBe(true);
    expect(overlay()).toBeNull();
  });

  it('Space on the focused Pause button toggles ONCE — the button does not fire as well', () => {
    mountRace();
    const btn = pauseButton();
    btn.focus();
    const down = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      cancelable: true,
    });
    const up = new KeyboardEvent('keyup', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      btn.dispatchEvent(down);
      btn.dispatchEvent(up);
    });
    // The browser's own activation of a focused button is the keyup's default action; it is
    // cancelled, so the one toggle is the key handler's.
    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
    expect(overlay()).not.toBeNull();
  });

  it('Space typed into a text field is left alone', () => {
    mountRace();
    const input = document.createElement('input');
    document.body.appendChild(input);
    const down = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      cancelable: true,
    });
    act(() => input.dispatchEvent(down));
    expect(down.defaultPrevented).toBe(false);
    expect(overlay()).toBeNull();
    input.remove();
  });

  it('the race clock does not advance while paused: nothing is drawn, the countdown stands', () => {
    mountRace();
    const before = document.querySelector('.race-phase-badge--countdown')?.textContent;
    act(() => fireEvent.click(pauseButton()));
    // Ten seconds of frames.
    for (let i = 0; i < 10000 / FRAME_MS; i++) expect(pumpFrame().calls).toBe(0);
    expect(inCountdown()).toBe(true);
    expect(document.querySelector('.race-phase-badge--countdown')?.textContent).toBe(before);
    act(() => fireEvent.click(pauseButton()));
    expect(pumpFrame().calls).toBeGreaterThan(0);
    expect(inCountdown()).toBe(true);
  });

  it('no pause once the last racer is home — the button is gone and Space does nothing', () => {
    const race = raceFor('dirt-oval', 101);
    sessionStorage.setItem('activeRace', JSON.stringify(race));
    render(
      <MemoryRouter initialEntries={['/race']}>
        <RaceScreen />
      </MemoryRouter>
    );
    let i = 0;
    while (results() === null && i++ < MAX_FRAMES) pumpFrame();
    expect(results(), 'the race never finished').not.toBeNull();
    pumpFrame();
    expect(pauseButton()).toBeNull();
    const down = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true });
    act(() => window.dispatchEvent(down));
    expect(down.defaultPrevented).toBe(false);
    expect(overlay()).toBeNull();
    // and the ending keeps drawing
    expect(pumpFrame().calls).toBeGreaterThan(0);
  }, 60000);
});
