// ============================================================
// File:        fullscreenDrawer.test.jsx
// Path:        client/src/screens/RaceScreen/fullscreenDrawer.test.jsx
// Project:     RaceArena — FULLSCREEN-USEFUL-1 (2026-10-17)
//
// THE RACE SCREEN'S OWN FULLSCREEN, AND THE STANDINGS DRAWER IN IT.
//
// In the app's fullscreen `index.jsx` puts `.race-layout--fullscreen` on the layout (the picture
// becomes the largest 16:9 box that fits, RaceScreen.css) and renders an invisible hot strip on the
// right edge; the standings column waits off-screen and comes out (`.race-layout--hud-open`) when
// the pointer reaches the strip. Held here:
//   * the class follows `fullscreenchange`, and outside fullscreen there is no new class, no style
//     and no strip — the layout outside fullscreen is what it was;
//   * the drawer opens on the strip, stays open while the pointer is over the column, closes a
//     delay after the pointer leaves (fake timers), and touch opens by a tap on the strip and closes
//     by a tap outside;
//   * leaving fullscreen closes the drawer and drops its timer, so it is never left half-open.
// NOT held: the picture's geometry — jsdom lays nothing out. That is measured in a real browser.
// Scaffolding is client/src/test/raceScreenMount.js.
// ============================================================

import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceScreen from './index.jsx';
import { boundedFrameClock, seedRace, stubCanvas2d } from '../../test/raceScreenMount.js';

// The close delay index.jsx uses (FS_HUD_CLOSE_DELAY_MS). Repeated, not imported, because the
// component does not export it; if it changes, the "closes after the delay" case says so.
const CLOSE_DELAY_MS = 800;

/** Put the document in or out of fullscreen the only way jsdom allows, and tell the screen. */
function setFullscreen(on) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => (on ? document.documentElement : null),
  });
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
  });
}

const layout = () => screen.getByTestId('race-layout');
const hud = () => screen.getByTestId('race-hud');
const strip = () => screen.queryByTestId('race-fs-hud-strip');
const isOpen = () => layout().classList.contains('race-layout--hud-open');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  sessionStorage.clear();
  localStorage.clear();
  stubCanvas2d();
  boundedFrameClock(0); // the loop is scheduled and never entered: this file is about the DOM
  seedRace();
  render(
    <MemoryRouter initialEntries={['/race']}>
      <RaceScreen />
    </MemoryRouter>
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
});

describe('FULLSCREEN-USEFUL-1 — outside fullscreen nothing changes', () => {
  it('the layout carries no fullscreen class, no inline style, and there is no hot strip', () => {
    expect(layout().className).toBe('race-layout');
    expect(layout().getAttribute('style')).toBeNull();
    expect(strip()).toBeNull();
    // A pointer leaving the column outside fullscreen schedules nothing. Counted relative to what
    // the mounted screen already has pending, which is not this file's business.
    const before = vi.getTimerCount();
    fireEvent.pointerLeave(hud(), { pointerType: 'mouse' });
    expect(vi.getTimerCount()).toBe(before);
  });
});

describe('FULLSCREEN-USEFUL-1 — the class follows fullscreenchange', () => {
  it('entering adds the fullscreen class and the strip; leaving takes both away', () => {
    setFullscreen(true);
    expect(layout()).toHaveClass('race-layout--fullscreen');
    expect(layout().style.getPropertyValue('--fs-hud-slide')).toBe('200ms');
    expect(strip()).not.toBeNull();
    expect(isOpen()).toBe(false); // the column starts hidden
    setFullscreen(false);
    expect(layout().className).toBe('race-layout');
    expect(strip()).toBeNull();
  });
});

describe('FULLSCREEN-USEFUL-1 — the drawer, with a mouse', () => {
  beforeEach(() => setFullscreen(true));

  it('opens when the pointer enters the strip and closes a delay after it leaves the column', () => {
    fireEvent.pointerEnter(strip(), { pointerType: 'mouse' });
    expect(isOpen()).toBe(true);
    fireEvent.pointerEnter(hud(), { pointerType: 'mouse' });
    fireEvent.pointerLeave(hud(), { pointerType: 'mouse' });
    expect(isOpen()).toBe(true); // not at once
    act(() => vi.advanceTimersByTime(CLOSE_DELAY_MS - 1));
    expect(isOpen()).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(isOpen()).toBe(false);
  });

  it('stays open while the pointer is back over the column before the delay runs out', () => {
    fireEvent.pointerEnter(strip(), { pointerType: 'mouse' });
    fireEvent.pointerLeave(hud(), { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(CLOSE_DELAY_MS / 2));
    fireEvent.pointerEnter(hud(), { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(CLOSE_DELAY_MS * 5));
    expect(isOpen()).toBe(true);
  });
});

describe('FULLSCREEN-USEFUL-1 — the drawer, by touch', () => {
  beforeEach(() => setFullscreen(true));

  it('a tap on the strip opens it, a tap inside keeps it, a tap outside closes it', () => {
    fireEvent.pointerDown(strip(), { pointerType: 'touch' });
    expect(isOpen()).toBe(true);
    // A touch's own pointerleave (fired after the finger lifts) must not start the close timer.
    fireEvent.pointerDown(hud(), { pointerType: 'touch' });
    fireEvent.pointerLeave(hud(), { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(CLOSE_DELAY_MS * 5));
    expect(isOpen()).toBe(true);
    act(() => {
      fireEvent.pointerDown(screen.getByTestId('race-canvas-wrapper'), { pointerType: 'touch' });
    });
    expect(isOpen()).toBe(false);
  });
});

describe('FULLSCREEN-USEFUL-1 — leaving fullscreen resets the drawer', () => {
  it('an open drawer with a pending close is closed and its timer dropped', () => {
    setFullscreen(true);
    fireEvent.pointerEnter(strip(), { pointerType: 'mouse' });
    const before = vi.getTimerCount();
    fireEvent.pointerLeave(hud(), { pointerType: 'mouse' });
    expect(vi.getTimerCount()).toBe(before + 1); // the pending close
    setFullscreen(false);
    expect(vi.getTimerCount()).toBe(before);
    // Back into fullscreen: the column starts hidden again, not where it was left.
    setFullscreen(true);
    expect(isOpen()).toBe(false);
  });

  it('an open drawer is closed by leaving fullscreen, not carried into the next one', () => {
    setFullscreen(true);
    fireEvent.pointerDown(strip(), { pointerType: 'touch' });
    expect(isOpen()).toBe(true);
    setFullscreen(false);
    expect(layout().className).toBe('race-layout');
    setFullscreen(true);
    expect(isOpen()).toBe(false);
  });
});
