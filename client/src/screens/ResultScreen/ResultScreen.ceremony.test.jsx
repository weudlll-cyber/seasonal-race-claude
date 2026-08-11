// ============================================================
// File:        ResultScreen.ceremony.test.jsx
// Path:        client/src/screens/ResultScreen/ResultScreen.ceremony.test.jsx
// Project:     RaceArena — PODIUM-BUILD-1
// Created:     2026-08-11
// Description: The build-up on the result screen: its ORDER, its two off switches, its skip — and
//              the one test that keeps the whole thing cosmetic.
//
//              THE GUARD THAT MATTERS IS THE FIRST ONE. "The final DOM is unchanged" is asserted
//              against the screen with the beat set to 0, which by construction never puts a class
//              or a style on anything — so it IS the screen as it was before this feature. If a
//              build-up ever leaves so much as an empty class attribute behind, that comparison
//              fails, and no golden file has to be maintained for it to keep working.
//
//              Real storage, not a mock: this file's subject is the config path (loadCameraConfig →
//              defaults underneath, stored on top), and mocking it away would test the mock.
// ============================================================

import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The only mock: navigation. Rendering the screen outside a Router is otherwise fine.
vi.mock('../../contexts/TransitionContext.jsx', () => {
  const nav = vi.fn();
  return { useFadeNavigate: () => nav };
});

import ResultScreen from './index.jsx';
import { KEYS } from '../../modules/storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';

const BEAT = DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs;

const RESULTS = JSON.stringify({
  finishOrder: [
    { name: 'Alice', icon: '🐎', index: 0, progress: 100, finishTimeMs: 29_340 },
    { name: 'Bob', icon: '🐎', index: 1, progress: 95, finishTimeMs: 31_200 },
    { name: 'Carol', icon: '🐎', index: 2, progress: 90, finishTimeMs: 33_500 },
    { name: 'Dave', icon: '🐎', index: 3, progress: 85, finishTimeMs: 35_800 },
  ],
  elapsedTime: 62,
  race: { trackId: 't1', trackName: 'Dirt Oval', winners: 3, sponsorText: 'Sponsored by Acme' },
});

/** Set the one config key. `undefined` leaves storage empty so the default applies. */
function setBeat(ms) {
  if (ms === undefined) localStorage.removeItem(KEYS.CAMERA_CONFIG);
  else localStorage.setItem(KEYS.CAMERA_CONFIG, JSON.stringify({ podiumRevealBeatMs: ms }));
}

/** Tell the screen the system does or does not ask for reduced motion. */
function setReducedMotion(on) {
  vi.stubGlobal('matchMedia', (q) => ({
    matches: on && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

const slot = (c, rank) => c.querySelector(`.podium-slot--${rank}`);
const pending = (el) => !!el?.classList.contains('result-pending');

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.setItem('raceResults', RESULTS);
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

/** Render, run the whole sequence out, and hand back the settled markup. */
function renderSettled() {
  const { container } = render(<ResultScreen />);
  act(() => vi.runAllTimers());
  return container;
}

describe('PODIUM-BUILD-1 — the build-up is cosmetic', () => {
  it('settles into exactly the DOM the screen renders with the build-up switched off', () => {
    setBeat(0);
    const off = renderSettled().innerHTML;

    setBeat(undefined); // the shipped beat
    const settled = renderSettled().innerHTML;

    expect(settled).toBe(off);
  });

  it('leaves no ceremony class and no style attribute behind', () => {
    setBeat(undefined);
    const c = renderSettled();
    expect(c.querySelectorAll('.result-pending, .result-arrive')).toHaveLength(0);
    expect(c.querySelector('.results-container').getAttribute('style')).toBeNull();
  });

  it('reserves every element’s space from the first frame, so nothing arrives into a gap', () => {
    setBeat(undefined);
    const { container } = render(<ResultScreen />);
    act(() => vi.advanceTimersByTime(0));
    // All three slots, the ranking panel, the actions and the sponsor are MOUNTED while pending —
    // hidden by CSS, never absent. An absent element would let the layout move as the podium fills.
    expect(container.querySelectorAll('.podium-slot')).toHaveLength(3);
    expect(container.querySelector('.rankings-section')).toBeTruthy();
    expect(container.querySelector('.results-actions')).toBeTruthy();
    expect(container.querySelector('.result-sponsor')).toBeTruthy();
  });
});

describe('PODIUM-BUILD-1 — the order is 3rd, 2nd, 1st, then the ranking', () => {
  it('reveals the podium bottom-up and holds the winner for two beats', () => {
    setBeat(undefined);
    const { container: c } = render(<ResultScreen />);

    // Before the first beat: nothing has arrived.
    expect([pending(slot(c, '3rd')), pending(slot(c, '2nd')), pending(slot(c, '1st'))]).toEqual([
      true,
      true,
      true,
    ]);

    act(() => vi.advanceTimersByTime(0));
    expect([pending(slot(c, '3rd')), pending(slot(c, '2nd')), pending(slot(c, '1st'))]).toEqual([
      false,
      true,
      true,
    ]);

    act(() => vi.advanceTimersByTime(BEAT));
    expect([pending(slot(c, '3rd')), pending(slot(c, '2nd')), pending(slot(c, '1st'))]).toEqual([
      false,
      false,
      true,
    ]);

    act(() => vi.advanceTimersByTime(BEAT));
    expect(pending(slot(c, '1st'))).toBe(false);

    // THE WINNER'S BEAT IS THE LONG ONE: one beat after he lands, the ranking is still waiting.
    act(() => vi.advanceTimersByTime(BEAT));
    expect(pending(c.querySelector('.rankings-section'))).toBe(true);

    act(() => vi.advanceTimersByTime(BEAT));
    expect(pending(c.querySelector('.rankings-section'))).toBe(false);
    expect(pending(c.querySelector('.results-actions'))).toBe(false);
    expect(pending(c.querySelector('.result-sponsor'))).toBe(false);
  });

  it('gives the winner the accent while he lands and takes it away again', () => {
    setBeat(undefined);
    const { container: c } = render(<ResultScreen />);
    act(() => vi.advanceTimersByTime(2 * BEAT));
    expect(slot(c, '1st').classList.contains('result-arrive')).toBe(true);
    act(() => vi.runAllTimers());
    expect(slot(c, '1st').classList.contains('result-arrive')).toBe(false);
  });
});

describe('PODIUM-BUILD-1 — the ways out', () => {
  it('0 shows the finished screen on the first frame and nothing happens later', () => {
    setBeat(0);
    const { container } = render(<ResultScreen />);
    const firstFrame = container.innerHTML;
    expect(container.querySelectorAll('.result-pending, .result-arrive')).toHaveLength(0);
    // "Off" is an absence, not a fast animation: letting every clock in the world run changes
    // nothing. (Counting timers would not say this — the environment schedules its own.)
    act(() => vi.runAllTimers());
    expect(container.innerHTML).toBe(firstFrame);
  });

  it('a key press completes the sequence at once, and it stays completed', () => {
    setBeat(undefined);
    const { container } = render(<ResultScreen />);
    act(() => vi.advanceTimersByTime(0));
    expect(container.querySelectorAll('.result-pending').length).toBeGreaterThan(0);

    act(() => fireEvent.keyDown(window, { key: ' ' }));
    expect(container.querySelectorAll('.result-pending, .result-arrive')).toHaveLength(0);
    const skipped = container.innerHTML;
    // The cancelled beats must not fire afterwards and undo the skip.
    act(() => vi.runAllTimers());
    expect(container.innerHTML).toBe(skipped);
  });

  it('a click completes the sequence at once', () => {
    setBeat(undefined);
    const { container } = render(<ResultScreen />);
    act(() => vi.advanceTimersByTime(0));
    act(() => fireEvent.pointerDown(window));
    expect(container.querySelectorAll('.result-pending, .result-arrive')).toHaveLength(0);
  });

  it('reduced motion shows the final state — the same one 0 shows', () => {
    setBeat(0);
    const off = renderSettled().innerHTML;

    setReducedMotion(true);
    setBeat(undefined); // the shipped beat: the SYSTEM overrules the setting, not the other way round
    const { container } = render(<ResultScreen />);
    expect(container.innerHTML).toBe(off);
    act(() => vi.runAllTimers());
    expect(container.innerHTML).toBe(off);
  });

  it('the beat the owner set is the beat that runs', () => {
    setBeat(200);
    const { container: c } = render(<ResultScreen />);
    act(() => vi.advanceTimersByTime(200));
    expect(pending(slot(c, '2nd'))).toBe(false);
    expect(pending(slot(c, '1st'))).toBe(true);
  });
});

describe('PODIUM-BUILD-1 — the brand carries the moment', () => {
  it('hands the profile colours to the accent while the sequence runs, and nothing after it', () => {
    localStorage.setItem(
      KEYS.BRANDING,
      JSON.stringify([
        {
          id: 'bp1',
          eventName: 'Acme Invitational',
          primaryColor: '#e63946',
          secondaryColor: '#f4a261',
        },
      ])
    );
    localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify({ activeBrandingProfileId: 'bp1' }));
    setBeat(undefined);

    const { container } = render(<ResultScreen />);
    act(() => vi.advanceTimersByTime(0));
    const styled = container.querySelector('.results-container').getAttribute('style');
    expect(styled).toContain('--result-brand-1: #e63946');
    expect(styled).toContain('--result-brand-2: #f4a261');
    expect(screen.getByText('Acme Invitational')).toBeTruthy();

    act(() => vi.runAllTimers());
    expect(container.querySelector('.results-container').getAttribute('style')).toBeNull();
  });

  it('names no colour when no brand is chosen — the stylesheet keeps the podium metals', () => {
    setBeat(undefined);
    const { container } = render(<ResultScreen />);
    act(() => vi.advanceTimersByTime(0));
    const styled = container.querySelector('.results-container').getAttribute('style');
    expect(styled).toContain('--result-beat');
    expect(styled).not.toContain('--result-brand');
  });
});
