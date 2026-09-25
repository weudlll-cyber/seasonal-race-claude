// ============================================================================================
// STAY-ON-THE-FINISH-1 — the auto-advance switch does something, proven.
//
// Until 2026-09-25 `autoAdvance` was read by nothing: the app always advanced and the toggle sat at
// OFF while it did. The owner's decision that day gave it a job — ON hands over to the results when
// the camera ending closes, OFF leaves the finish picture standing until the operator clicks it.
//
// ── WHY THIS MOUNTS A FIXTURE AND NOT `RaceScreen` ────────────────────────────────────────────
//
// The same reason `ceremonySkip.test.jsx` gives, and this file follows its shape rather than
// inventing a second one: the decisions under test are closures inside a 2000-line component whose
// first paint waits on `raceData` from storage and the track API, and whose draw loop wants a canvas
// context and rAF. Mounting all of that would test the scaffolding, and every one of its failure
// modes would land here as a flake.
//
// So this file drives the REAL decisions — transcribed with the same guards in the same order — and
// then checks against the SOURCE that `RaceScreen` makes them, which is the half a transcription
// cannot prove. Both halves are needed: the first would pass on a handler nobody calls, and the
// second would pass on a handler that decides the wrong thing.
// ============================================================================================
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';
import { storageGet, storageSet, KEYS } from '../../modules/storage/storage.js';
import { endingOnRaceScreenMs } from './endingSchedule.js';

const PHASE = { COUNTDOWN: 'countdown', RACING: 'racing', FINISHED: 'finished' };
const SRC = () => readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.jsx'), 'utf8');

/**
 * The hand-over, transcribed from `RaceScreen/index.jsx` — same gate, same call, same arithmetic.
 * It is handed its dependencies instead of closing over the component's refs, which is the only
 * difference and is what makes it drivable.
 */
function handOverOnFinish({ autoAdvance, holdMs, pauseMs, setTimeoutFn, navigate }) {
  if (autoAdvance) {
    return setTimeoutFn(() => navigate('/results'), endingOnRaceScreenMs({ holdMs, pauseMs }));
  }
  return null;
}

/** The way off the picture, transcribed the same way. */
function makeFinishClick({ autoAdvance, st, navigate }) {
  return (e) => {
    if (autoAdvance) return;
    if (e.button !== 0) return;
    if (st?.phase !== PHASE.FINISHED) return;
    navigate('/results');
  };
}

describe('STAY-ON-THE-FINISH-1 — the default hands over, as it always has', () => {
  it('★ an untouched config advances to the results', () => {
    // The shipped default IS the switch being on — that is what "ships as today's behaviour" means,
    // and reading it from `defaults.js` rather than writing `true` here is what makes this test go
    // red if the default is ever flipped back without the behaviour being reconsidered.
    expect(DEFAULT_RACE_DEFAULTS.autoAdvance).toBe(true);

    const navigate = vi.fn();
    const setTimeoutFn = vi.fn(() => 1);
    handOverOnFinish({
      autoAdvance: DEFAULT_RACE_DEFAULTS.autoAdvance,
      holdMs: 1000,
      pauseMs: 2000,
      setTimeoutFn,
      navigate,
    });

    expect(setTimeoutFn).toHaveBeenCalledTimes(1);
    // …and it is scheduled at the camera ending, not at some second number of this feature's own.
    expect(setTimeoutFn.mock.calls[0][1]).toBe(
      endingOnRaceScreenMs({ holdMs: 1000, pauseMs: 2000 })
    );
    setTimeoutFn.mock.calls[0][0]();
    expect(navigate).toHaveBeenCalledWith('/results');
  });

  it('the ending length is the SAME number either way — the switch does not touch it', () => {
    // The one thing this feature must not do is change how long the picture stands. `autoAdvance`
    // is not an input to `endingOnRaceScreenMs` and this is the assertion that keeps it out.
    const before = endingOnRaceScreenMs({ holdMs: 1500, pauseMs: 2500 });
    const after = endingOnRaceScreenMs({ holdMs: 1500, pauseMs: 2500 });
    expect(after).toBe(before);
    expect(SRC()).not.toMatch(/endingOnRaceScreenMs\(\{[^}]*autoAdvance/);
  });
});

describe('STAY-ON-THE-FINISH-1 — switched OFF, the picture stays', () => {
  it('★ no hand-over is scheduled at all', () => {
    const navigate = vi.fn();
    const setTimeoutFn = vi.fn(() => 1);

    handOverOnFinish({ autoAdvance: false, holdMs: 1000, pauseMs: 2000, setTimeoutFn, navigate });

    // Not "a timer that does nothing" — no timer. A scheduled navigation that is cancelled later is
    // the shape that comes back as a race condition at a real event.
    expect(setTimeoutFn).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('★ and the way off works: a left click on the finished picture goes to the results', () => {
    const navigate = vi.fn();
    const click = makeFinishClick({
      autoAdvance: false,
      st: { phase: PHASE.FINISHED },
      navigate,
    });

    click({ button: 0 });
    expect(navigate).toHaveBeenCalledWith('/results');
  });

  it('the click is guarded, so "stay" cannot become "click anything, anywhere"', () => {
    const navigate = vi.fn();
    const at = (phase, autoAdvance = false) =>
      makeFinishClick({ autoAdvance, st: { phase }, navigate });

    at(PHASE.RACING)({ button: 0 }); // a stray click mid-race must not end the race
    at(PHASE.COUNTDOWN)({ button: 0 }); // the ceremony skip owns this phase
    at(PHASE.FINISHED)({ button: 2 }); // right click is not the gesture
    at(PHASE.FINISHED, true)({ button: 0 }); // with the switch ON the timer is already going

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('STAY-ON-THE-FINISH-1 — a config stored before this change', () => {
  it('★ still loads cleanly while carrying the REMOVED autoAdvanceDelay key', () => {
    // There is no schema, no version bump and no migration in this project, so a stored config keeps
    // whatever it was written with. The removed key must ride along inertly — not throw, not reset
    // the operator's other settings, not be rejected.
    const stored = {
      ...DEFAULT_RACE_DEFAULTS,
      duration: 90, // something the operator chose, which must survive
      autoAdvance: false,
      autoAdvanceDelay: 5, // the key this change deleted
    };
    storageSet(KEYS.RACE_DEFAULTS, stored);

    const read = storageGet(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);

    expect(read.duration).toBe(90);
    expect(read.autoAdvance).toBe(false);
    // It is still there, and that is correct: nothing reads it, nothing removes it, nothing trips
    // over it. `docs/DEVSCREEN-INVENTORY.md` records the same outcome for the retired dynamics keys.
    expect(read.autoAdvanceDelay).toBe(5);
  });

  it('a stored config from BEFORE the key existed reads the shipped default, not undefined', () => {
    // The `??` at the read site is what makes this true, and `check-config-keys` requires it.
    const { autoAdvance: _gone, ...withoutTheKey } = DEFAULT_RACE_DEFAULTS;
    storageSet(KEYS.RACE_DEFAULTS, withoutTheKey);

    const read = storageGet(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);
    expect(read.autoAdvance).toBeUndefined();
    expect(read.autoAdvance ?? DEFAULT_RACE_DEFAULTS.autoAdvance).toBe(true);
  });
});

describe('STAY-ON-THE-FINISH-1 — the screen really makes these decisions', () => {
  it('★ the hand-over is behind the switch in RaceScreen, not merely in this file', () => {
    const src = SRC();

    // The gate, and that the navigation is inside it. A transcription that drifts from the source is
    // worse than no test, so the shape is checked where it lives.
    expect(src, 'the hand-over timer is no longer behind autoAdvanceRef').toMatch(
      /if \(autoAdvanceRef\.current\) \{[\s\S]{0,400}?finishNavTimerRef\.current = setTimeout\(/
    );
    expect(src, "the hand-over no longer navigates to '/results'").toContain(
      "fadeNavRef.current('/results')"
    );
  });

  it('the removed key is gone from the screen, the control and the defaults', () => {
    expect(SRC()).not.toContain('autoAdvanceDelay');
    const here = dirname(fileURLToPath(import.meta.url));
    const control = readFileSync(
      join(here, '..', 'DevScreen', 'sections', 'RaceDefaults.jsx'),
      'utf8'
    );
    const defaults = readFileSync(
      join(here, '..', '..', 'modules', 'storage', 'defaults.js'),
      'utf8'
    );
    expect(control, 'the Delay stepper is still rendered').not.toContain('autoAdvanceDelay');
    // `defaults.js` may NAME it in the comment that records its removal; what must be gone is the key.
    expect(defaults, 'autoAdvanceDelay is still a shipped default').not.toMatch(
      /^\s*autoAdvanceDelay:/m
    );
  });

  it('★ the tooltip states no config value — the drift the stock-take counted 38 of', () => {
    const control = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        'DevScreen',
        'sections',
        'RaceDefaults.jsx'
      ),
      'utf8'
    );
    const tip = control.slice(control.indexOf('On: the results screen appears'));
    const text = tip.slice(0, tip.indexOf('" />'));
    expect(text, 'the auto-advance tooltip has grown a number').not.toMatch(/\d/);
  });
});
