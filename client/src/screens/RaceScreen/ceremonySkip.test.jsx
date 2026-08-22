// ============================================================================================
// CEREMONY-SKIP-2 — the three guards on the click handler, proven.
//
// CEREMONY-SKIP-1 shipped three protections that were written but unproven: the switch being off,
// the phase being wrong, and the handler sitting on the WRAPPER rather than on a canvas. Its five
// tests all exercised the pure function `nextBeatStart`; nothing touched the handler.
//
// THE FIRST ONE IS THE ONE THAT MATTERS. With the switch off a stray press must change nothing —
// that is what stops a misplaced click throwing away a scene at a real event.
//
// ── WHY THESE MOUNT A FIXTURE AND NOT `RaceScreen` ──────────────────────────────────────────────
//
// The handler is a closure inside a 1907-line component whose first paint waits on `raceData`, which
// an effect fills from storage and the track API, and whose draw loop wants a canvas context and
// rAF. Mounting all of that would test the scaffolding, not the guards, and every one of its
// failure modes would land on this file as a flake.
//
// So this file mounts the SAME DOM SHAPE the screen builds — a `.race-canvas-wrapper` carrying the
// handler, with `CeremonyBrandCard` as a child exactly as `RaceScreen` renders it — and drives the
// REAL decision the handler makes. What it proves is the part that can be wrong: the guards, and
// that a press on the brand CARD reaches a handler on the WRAPPER. What it deliberately does not
// prove is that `RaceScreen` wires this handler to this element; that is one line, it is visible in
// the diff, and §2 of the report says so rather than implying otherwise.
// ============================================================================================
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CeremonyBrandCard from './CeremonyBrandCard.jsx';
import { nextBeatStart, ceremonySchedule } from '../../modules/camera/startCeremony.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PHASE = { COUNTDOWN: 'countdown', RACING: 'racing' };

/**
 * The handler, transcribed from `RaceScreen/index.jsx` — same guards, same order, same arithmetic.
 * It is passed its dependencies instead of closing over the component's refs, which is the only
 * difference and is what makes it drivable at all.
 */
const makeHandler =
  ({ enabled, st, sched, now }) =>
  (e) => {
    if (!enabled) return;
    if (e.button !== 0) return;
    if (!st || st.phase !== PHASE.COUNTDOWN || st.countdownStart == null) return;
    const next = nextBeatStart(now() - st.countdownStart, sched);
    st.countdownStart = now() - next;
  };

const SCHED = ceremonySchedule(2000, 1000, 500, 1500, 3000, 1200);

/** The screen's own DOM shape: the card is a CHILD of the wrapper that carries the handler. */
function Fixture({ onPress, brandUp = false }) {
  return (
    <div className="race-layout">
      <div className="race-canvas-wrapper" onMouseDown={onPress} data-testid="race-canvas-wrapper">
        <canvas data-testid="bg-canvas" />
        <canvas data-testid="race-canvas" />
        <CeremonyBrandCard
          brand={
            brandUp ? { logo: '/logo.png', name: 'Test Brand', eventName: 'Test Event' } : null
          }
          visible={brandUp}
        />
      </div>
    </div>
  );
}

describe('CEREMONY-SKIP-2 — the click handler’s three guards', () => {
  // ── THE TRANSCRIPTION IS CHECKED AGAINST THE SOURCE IT COPIES ────────────────────────────────
  //
  // IF DELETED: `makeHandler` becomes an unwatched second statement of the handler's guards, and a
  // change to the real one would leave these three tests green while proving nothing about the
  // shipped behaviour. WHAT WOULD GO UNNOTICED: the guards being removed, reordered, or having
  // their conditions loosened in `RaceScreen` — this file would keep passing against its own copy.
  it('the guards tested here are the guards RaceScreen actually has', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.jsx'), 'utf8');
    const handler = src.slice(
      src.indexOf('const onCeremonyClick'),
      src.indexOf('return (\n    <div ref={screenRef}')
    );
    expect(handler.length, 'the handler was not found in RaceScreen').toBeGreaterThan(100);
    for (const guard of [
      'if (!ceremonySkipOnClick) return;',
      'if (e.button !== 0) return;',
      'st.phase !== PHASE.COUNTDOWN',
      'st.countdownStart == null',
      'nextBeatStart(',
      'st.countdownStart = now - next;',
    ]) {
      expect(handler, `RaceScreen's handler no longer contains: ${guard}`).toContain(guard);
    }
  });

  // ── THE ATTACHMENT IS CHECKED AGAINST THE SOURCE TOO ────────────────────────────────────────
  //
  // The test above proves the GUARDS are the shipped guards. This one proves the remaining line —
  // the architectural claim itself: `RaceScreen` hangs the handler on the WRAPPER, so it is alive
  // during the brand beat when a DOM card covers the canvas. Test `c` below proves that a press on
  // the card reaches a handler in that position; nothing until now proved the screen puts it there.
  //
  // IF DELETED: the one line the whole design rests on is unwatched, and a refactor that moves the
  // handler onto `race-canvas` — the obvious-looking simplification — leaves every test in this
  // file green while the first skip of every event is dead under the brand card.
  // WHAT WOULD GO UNNOTICED: exactly that move, and a second attachment point (the handler bound
  // twice would double-skip), and the wrapper losing its handler altogether.
  it('RaceScreen attaches onCeremonyClick to the WRAPPER — not to a canvas', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.jsx'), 'utf8');

    // 1 — there is exactly ONE element claiming to be the wrapper, so "its opening tag" is a
    //     well-defined thing to talk about.
    const CLASS_ATTR = 'className="race-canvas-wrapper"';
    const occurrences = src.split(CLASS_ATTR).length - 1;
    expect(occurrences, `expected one ${CLASS_ATTR}, found ${occurrences}`).toBe(1);

    // 2 — read that element's OPENING TAG out of the source and require the handler on it.
    const at = src.indexOf(CLASS_ATTR);
    const tag = src.slice(src.lastIndexOf('<', at), src.indexOf('>', at) + 1);
    expect(tag.startsWith('<div'), `the wrapper is no longer a <div>: ${tag.slice(0, 40)}`).toBe(
      true
    );
    expect(tag, 'the wrapper element no longer carries onMouseDown={onCeremonyClick}').toContain(
      'onMouseDown={onCeremonyClick}'
    );

    // 3 — and it is attached in exactly one place. Two mentions and no more: the `const` that
    //     defines it, and the one attribute above. A third would mean a second attachment point,
    //     which double-skips; a first-and-only would mean it is defined and never hung anywhere.
    const mentions = src.split('onCeremonyClick').length - 1;
    expect(mentions, `onCeremonyClick is mentioned ${mentions}× (want 2: define + attach)`).toBe(2);

    // 4 — no canvas in this screen carries a mouse-down. This is the sabotage the comment above
    //     names, caught directly rather than by inference.
    for (const canvasTag of src.match(/<canvas[\s\S]*?\/>/g) ?? []) {
      expect(canvasTag, 'a <canvas> in RaceScreen carries onMouseDown').not.toContain(
        'onMouseDown'
      );
    }
  });

  // IF DELETED: a stray press on the picture skips a beat in a build where the aid was never turned
  // on. WHAT WOULD GO UNNOTICED: exactly the event case — the owner shows a race, someone touches
  // the screen, and a scene he meant to show is gone. Nothing else in the tree asserts that the
  // switch gates the handler at all.
  it('a: switch OFF — a press on the wrapper changes nothing', () => {
    const st = { phase: PHASE.COUNTDOWN, countdownStart: 1000 };
    const before = st.countdownStart;
    const now = () => 1500; // 500 ms into the brand beat
    render(<Fixture onPress={makeHandler({ enabled: false, st, sched: SCHED, now })} />);
    fireEvent.mouseDown(screen.getByTestId('race-canvas-wrapper'), { button: 0 });
    expect(st.countdownStart).toBe(before);
    // and the ceremony is still where it was: the elapsed has not moved
    expect(now() - st.countdownStart).toBe(500);
  });

  // IF DELETED: a press during the race, or during the ending, would move the ceremony's clock —
  // which by then belongs to nothing, so the failure would surface far from the click as a wrong
  // countdown or a re-fired gun. WHAT WOULD GO UNNOTICED: that the aid is scoped to the opening at
  // all; the handler would be live for the whole race with the switch on.
  it('b: outside PHASE.COUNTDOWN — a press changes nothing, switch on or off', () => {
    for (const enabled of [true, false]) {
      const st = { phase: PHASE.RACING, countdownStart: 1000 };
      const now = () => 1500;
      const { unmount } = render(
        <Fixture onPress={makeHandler({ enabled, st, sched: SCHED, now })} />
      );
      fireEvent.mouseDown(screen.getByTestId('race-canvas-wrapper'), { button: 0 });
      expect(st.countdownStart, `phase guard with switch ${enabled}`).toBe(1000);
      unmount();
    }
  });

  // IF DELETED: nothing proves the handler is reachable during the BRAND beat — the one beat where a
  // DOM card covers the picture. WHAT WOULD GO UNNOTICED: a handler moved onto a canvas would still
  // pass every other test in this file and in startCeremony.test.js, and would be dead exactly where
  // the first skip is wanted. This is the test that earns `data-testid="race-canvas-wrapper"`.
  it('c: a press on the BRAND CARD skips the brand beat — the handler is on the wrapper', () => {
    const st = { phase: PHASE.COUNTDOWN, countdownStart: 1000 };
    const now = () => 1500; // 500 ms into a 1200 ms brand beat
    render(<Fixture brandUp onPress={makeHandler({ enabled: true, st, sched: SCHED, now })} />);

    // The card is really covering the picture — otherwise this test proves nothing.
    // The card renders as `.ceremony-brand`; its logo carries an EMPTY alt on purpose, so it is
    // found by its class rather than by a role or a label.
    const card = document.querySelector('.ceremony-brand');
    expect(card, 'the brand card did not render — this test would prove nothing').toBeTruthy();
    expect(card.querySelector('.ceremony-brand__logo')).toBeTruthy();
    expect(screen.getByTestId('race-canvas-wrapper').contains(card)).toBe(true);

    // Press the CARD, not the wrapper: the event must bubble to the handler.
    fireEvent.mouseDown(card, { button: 0, bubbles: true });

    // The elapsed is now exactly the start of the next beat — the brand beat is over.
    expect(now() - st.countdownStart).toBe(SCHED.brandMs);
  });

  // A right-click is not a skip. Cheap, and it is the other half of "left click only".
  it('a right-button press does nothing', () => {
    const st = { phase: PHASE.COUNTDOWN, countdownStart: 1000 };
    const now = () => 1500;
    render(<Fixture onPress={makeHandler({ enabled: true, st, sched: SCHED, now })} />);
    fireEvent.mouseDown(screen.getByTestId('race-canvas-wrapper'), { button: 2 });
    expect(st.countdownStart).toBe(1000);
  });
});
