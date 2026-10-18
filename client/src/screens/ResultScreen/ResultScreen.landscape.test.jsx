// ============================================================
// File:        ResultScreen.landscape.test.jsx
// Path:        client/src/screens/ResultScreen/ResultScreen.landscape.test.jsx
// Project:     RaceArena — RESULT-LANDSCAPE-1 (built 2026-10-18)
//
// WHAT THIS HOLDS: the results card is held to the window (`results-container--short`) only when it
// is taller than the room the screen gives it, and the answer follows the window when it changes
// size. A card that fits must never get the class: the class makes the card a scroll box, and a
// scroll box clips the title's glow and the Back button's shadow, which reach past the card's edge.
// jsdom lays nothing out, so the heights the measurement reads are stubbed here; the real geometry
// is held in a browser by client/e2e/result-landscape.spec.js.
// ============================================================

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../contexts/TransitionContext.jsx', () => {
  const nav = vi.fn();
  return { useFadeNavigate: () => nav };
});

vi.mock('../../modules/storage/storage', () => ({
  storageGet: vi.fn(() => []),
  storageSet: vi.fn(),
  KEYS: {
    RACE_HISTORY: 'racearena:raceHistory',
    BRANDING: 'racearena:branding',
    ACTIVE_SESSION: 'racearena:activeSession',
  },
  newId: vi.fn(() => 'test-id-001'),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import ResultScreen from './index.jsx';

const RESULTS = JSON.stringify({
  finishOrder: [
    { name: 'Alice', icon: '🐎', index: 0, finishTimeMs: 29_340 },
    { name: 'Bob', icon: '🐎', index: 1, finishTimeMs: 31_200 },
  ],
  elapsedTime: 62,
  race: { trackName: 'Dirt Oval' },
});

/** The stubbed layout: the screen's inner height, and the card's natural height (556 = 554 + border). */
const layout = { screen: 1080 };
const CARD = { scrollHeight: 554, clientHeight: 554, offsetHeight: 556 };

const isScreen = (el) => el.classList.contains('screen--result');
const isCard = (el) => el.classList.contains('results-container');

function stubHeight(prop) {
  // jsdom defines these on Element.prototype or HTMLElement.prototype; the stub shadows either on
  // HTMLElement.prototype and is removed again afterwards.
  const own = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
  const inherited = own ?? Object.getOwnPropertyDescriptor(Element.prototype, prop);
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get() {
      if (isScreen(this)) return prop === 'clientHeight' ? layout.screen : 0;
      if (isCard(this)) return CARD[prop];
      return inherited?.get ? inherited.get.call(this) : 0;
    },
  });
  return () =>
    own
      ? Object.defineProperty(HTMLElement.prototype, prop, own)
      : delete HTMLElement.prototype[prop];
}

/** A ResizeObserver whose callbacks the test fires by hand. */
let observers;
class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb;
    observers.push(this);
  }
  observe() {}
  disconnect() {}
}

let restores;
beforeEach(() => {
  observers = [];
  layout.screen = 1080;
  restores = ['clientHeight', 'scrollHeight', 'offsetHeight'].map(stubHeight);
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  sessionStorage.setItem('raceResults', RESULTS);
});
afterEach(() => {
  restores.forEach((restore) => restore());
  vi.unstubAllGlobals();
  sessionStorage.removeItem('raceResults');
});

const card = (container) => container.querySelector('.results-container');

describe('RESULT-LANDSCAPE-1 — the card is held to the window only when it is too tall', () => {
  it('a card that fits keeps its class list as it was', () => {
    const { container } = render(<ResultScreen />);
    expect(card(container).className).toBe('results-container');
  });

  it('a card taller than the window is held short and scrolls inside', () => {
    layout.screen = 350;
    const { container } = render(<ResultScreen />);
    expect(card(container).classList.contains('results-container--short')).toBe(true);
  });

  // The room is the screen's inner height less its own padding — ResultScreen.css, which the test
  // environment applies (vitest `css: true`), gives `.screen--result` 20 px top and bottom.
  it('a card exactly as tall as the room still fits; one pixel less room and it is held', () => {
    layout.screen = 556 + 40;
    const first = render(<ResultScreen />);
    expect(card(first.container).className).toBe('results-container');
    first.unmount();

    layout.screen = 556 + 39;
    const { container } = render(<ResultScreen />);
    expect(card(container).classList.contains('results-container--short')).toBe(true);
  });

  it('follows the window: turned sideways it is held short, turned back it is not', () => {
    const { container } = render(<ResultScreen />);
    expect(card(container).className).toBe('results-container');
    const resize = () => act(() => observers.forEach((o) => o.cb([])));

    layout.screen = 350;
    resize();
    expect(card(container).classList.contains('results-container--short')).toBe(true);

    layout.screen = 1080;
    resize();
    expect(card(container).className).toBe('results-container');
  });
});
