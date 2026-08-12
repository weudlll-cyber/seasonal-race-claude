// ============================================================
// File:        WinnerCard.test.jsx
// Path:        client/src/screens/RaceScreen/WinnerCard.test.jsx
// Project:     RaceArena — WINNER-CARD-1
// Created:     2026-08-11
// Description: What the closing card CLAIMS: it names the actual winner, it says it once, it goes
//              away, and at 0 it does not exist.
//
//              WHAT THESE TESTS ARE FOR, and it is worth being blunt about the division. The render
//              fingerprint records canvas draw calls and this card is DOM, so it cannot confirm one
//              pixel of this — a hash that does not move proves the PICTURE underneath is unchanged
//              and nothing else. These tests therefore cover the claims that are checkable without a
//              browser: identity, count, lifetime, and the off switch. Whether it looks good, and
//              whether it covers something it should not, is the owner's eye and only his.
//
//              The CLAMP — the promise that the card cannot make the ending longer — is tested as
//              ARITHMETIC, against the exported `winnerCardWindowMs` the race screen calls. That is
//              the honest seam: mounting the whole race loop to observe a `Math.min` would test the
//              loop, and the promise is what needs guarding.
// ============================================================

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { readFileSync, existsSync } from 'node:fs';

import WinnerCard, { WINNER_CARD_FADE_MS, winnerCardWindowMs } from './WinnerCard.jsx';
import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';
import { MINIMAP_W, MINIMAP_H, MINIMAP_MARGIN } from '../../modules/camera/Minimap.js';

/** The canvas is a FIXED store; the minimap's constants are in its pixels and so is this. */
const CANVAS_W = 1280;
const CANVAS_H = 720;

/**
 * The card's own stylesheet, read as text.
 *
 * Resolved from the working directory rather than from `import.meta.url`: under Vite the module URL
 * is not a file: URL and `readFileSync` refuses it. The two candidates cover running the suite from
 * `client/` and from the repo root.
 */
function readCss() {
  const rel = 'src/screens/RaceScreen/WinnerCard.css';
  const path = [rel, `client/${rel}`].find((p) => existsSync(p));
  if (!path) throw new Error('WinnerCard.css not found from the working directory');
  return readFileSync(path, 'utf8');
}

const WINNER = { name: 'Bramble', raceNumber: 7, color: '#33cc66' };

const card = () => screen.queryByTestId('winner-card');

afterEach(() => vi.useRealTimers());

describe('WINNER-CARD-1 — the card names the winner', () => {
  it('shows the winner’s race number and name', () => {
    render(<WinnerCard winner={WINNER} accentColor={null} visible />);
    expect(screen.getByText('Bramble')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('carries the racer’s OWN colour on the number, not on the frame', () => {
    const { container } = render(<WinnerCard winner={WINNER} accentColor="#e63946" visible />);
    // The two colours have two different jobs and must not be confused for one another: the racer's
    // colour identifies HIM, the brand's accent identifies the EVENT.
    expect(container.querySelector('.winner-card__number').style.background).toBe(
      'rgb(51, 204, 102)'
    );
    expect(card().style.getPropertyValue('--winner-accent')).toBe('#e63946');
  });

  it('names the winner it is given, not the first racer of some other order', () => {
    // The regression this guards: a card wired to `racers[0]` or to the roster instead of to the
    // finished order looks right in every race where the winner happens to start first.
    render(<WinnerCard winner={{ name: 'Fallow', raceNumber: 22, color: null }} visible />);
    expect(screen.getByText('Fallow')).toBeTruthy();
    expect(screen.queryByText('Bramble')).toBeNull();
  });

  it('renders exactly one card', () => {
    const { container } = render(<WinnerCard winner={WINNER} accentColor={null} visible />);
    expect(container.querySelectorAll('.winner-card')).toHaveLength(1);
  });

  it('names no colour when no brand is chosen — the stylesheet keeps the podium gold', () => {
    render(<WinnerCard winner={WINNER} accentColor={null} visible />);
    expect(card().getAttribute('style')).toBeNull();
  });
});

describe('WINNER-CARD-1 — the ways out', () => {
  it('renders NOTHING when there is no winner — which is what the key at 0 produces', () => {
    const { container } = render(<WinnerCard winner={null} accentColor="#e63946" visible />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for a winner with no name rather than an empty card', () => {
    const { container } = render(<WinnerCard winner={{ raceNumber: 3 }} visible />);
    expect(container.innerHTML).toBe('');
  });

  it('omits the number when the race has none, and still names the winner', () => {
    render(<WinnerCard winner={{ name: 'Aurora', raceNumber: null, color: '#f00' }} visible />);
    expect(screen.getByText('Aurora')).toBeTruthy();
    expect(document.querySelector('.winner-card__number')).toBeNull();
  });

  it('goes away when its window closes', () => {
    const { rerender } = render(<WinnerCard winner={WINNER} visible />);
    expect(card().className).toContain('winner-card--in');
    rerender(<WinnerCard winner={WINNER} visible={false} />);
    // It STAYS MOUNTED so the fade has something to fade — the visibility rule in the stylesheet is
    // what takes it out of the compositor once the transition ends.
    expect(card()).toBeTruthy();
    expect(card().className).not.toContain('winner-card--in');
  });

  it('never answers a hit test or the accessibility tree', () => {
    // It sits over a live picture. A card that swallowed a click would swallow the one the owner
    // uses to skip the podium build-up on the very next screen.
    render(<WinnerCard winner={WINNER} visible />);
    expect(card().getAttribute('aria-hidden')).toBe('true');
  });
});

describe('WINNER-CARD-1 — the fade constant is one value, not two', () => {
  it('exports the same duration the stylesheet transitions on', async () => {
    // L207 in miniature. The race screen starts the fade-out `WINNER_CARD_FADE_MS` before the end of
    // the window so it has finished before the navigation; if the CSS and this number disagree the
    // card is either cut off or still up when the screen goes black, and nothing would say so.
    const css = readCss();
    const seconds = WINNER_CARD_FADE_MS / 1000;
    expect(css).toContain(`opacity ${seconds}s ease`);
  });
});

describe('WINNER-CARD-1 — the card cannot make the ending longer', () => {
  const PAUSE = DEFAULT_CAMERA_CONFIG.finishPauseMs;

  it('the shipped default fits inside the shipped pause, with the fade-out complete before it ends', () => {
    const w = winnerCardWindowMs(DEFAULT_CAMERA_CONFIG.winnerCardMs, PAUSE);
    expect(w).toBe(DEFAULT_CAMERA_CONFIG.winnerCardMs);
    expect(w).toBeLessThanOrEqual(PAUSE);
    // The screen starts the fade one fade-length before the window closes, so the card is fully gone
    // this many ms before the navigation. It must not be negative.
    expect(PAUSE - w).toBeGreaterThanOrEqual(0);
    expect(w - WINNER_CARD_FADE_MS).toBeGreaterThan(0); // …and something is actually held, not just fades
  });

  it('is capped by the pause, never the other way round', () => {
    // THE PROMISE: no value of the card's own key extends the ending.
    for (const ask of [1, 2500, 10_000, 999_999]) {
      expect(winnerCardWindowMs(ask, PAUSE)).toBeLessThanOrEqual(PAUSE);
    }
    expect(winnerCardWindowMs(10_000, 800)).toBe(800);
  });

  it('a pause of 0 removes the card whatever the key says', () => {
    expect(winnerCardWindowMs(5000, 0)).toBe(0);
  });

  it('the key at 0 removes the card whatever the pause says', () => {
    expect(winnerCardWindowMs(0, 5000)).toBe(0);
  });

  it('reads a broken stored value as OFF rather than as a default', () => {
    for (const bad of [undefined, null, NaN, Infinity, -1, 'soon']) {
      expect(winnerCardWindowMs(bad, PAUSE)).toBe(0);
      expect(winnerCardWindowMs(2000, bad)).toBe(0);
    }
  });
});

describe('WINNER-CARD-1 — the card keeps off the minimap at every canvas scale', () => {
  // THE REGRESSION THIS EXISTS FOR, and it shipped: the card was anchored in PIXELS while the minimap
  // is drawn in CANVAS pixels. The two rulers only agree at one canvas scale, and at that scale the
  // card was on top of the minimap anyway. jsdom does no layout, so this is arithmetic on the
  // declared anchors against the minimap's own constants — which is exactly the comparison nobody
  // made the first time.
  const css = readCss();
  const decl = (prop) => {
    const m = css.match(new RegExp(`^\\s*${prop}:\\s*([0-9.]+)(%|px)`, 'm'));
    return m ? { value: parseFloat(m[1]), unit: m[2] } : null;
  };

  it('anchors in PERCENTAGES, so it rides the same ruler as the canvas it sits on', () => {
    for (const prop of ['left', 'bottom', 'max-width']) {
      expect(decl(prop), `${prop} must be declared`).toBeTruthy();
      expect(decl(prop).unit, `${prop} must scale with the canvas`).toBe('%');
    }
  });

  it('its bottom edge stays above the minimap’s top edge', () => {
    // The minimap's top, as a fraction of the frame height, from its own constants.
    const minimapTopFrac = (CANVAS_H - MINIMAP_H - MINIMAP_MARGIN) / CANVAS_H;
    // The card's bottom edge, as a fraction from the top.
    const cardBottomFrac = 1 - decl('bottom').value / 100;
    expect(cardBottomFrac).toBeLessThan(minimapTopFrac);
  });

  it('never crosses the centre line, where the camera is holding the winner', () => {
    const rightEdgeFrac = (decl('left').value + decl('max-width').value) / 100;
    expect(rightEdgeFrac).toBeLessThan(0.5);
  });

  it('starts left of the minimap’s right edge, so the two read as one stack', () => {
    const minimapRightFrac = (MINIMAP_MARGIN + MINIMAP_W) / CANVAS_W;
    expect(decl('left').value / 100).toBeLessThan(minimapRightFrac);
  });
});

describe('WINNER-CARD-1 — it appears once per race', () => {
  it('does not re-enter on a re-render while its window is open', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<WinnerCard winner={WINNER} visible />);
    const first = container.querySelector('.winner-card');
    rerender(<WinnerCard winner={WINNER} visible />);
    act(() => vi.advanceTimersByTime(WINNER_CARD_FADE_MS * 3));
    // The SAME node, still one of it: the card owns no clock and no entry animation of its own, so a
    // re-render cannot restage it. That is why the race screen's single timer is the only schedule.
    expect(container.querySelectorAll('.winner-card')).toHaveLength(1);
    expect(container.querySelector('.winner-card')).toBe(first);
  });
});
