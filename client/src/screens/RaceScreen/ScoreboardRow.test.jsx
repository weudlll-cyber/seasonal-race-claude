// ============================================================
// File:        ScoreboardRow.test.jsx
// Path:        client/src/screens/RaceScreen/ScoreboardRow.test.jsx
// Project:     RaceArena — SCOREBOARD-STABLE-ROWS
//
// WHAT THIS GUARDS: the one failure this whole shape can produce, and it is silent.
//
// The row is memoised so that a racer whose position did not move is skipped instead of rebuilt.
// The trap is that if the RANK were carried on the shared per-racer identity object — the natural
// thing to write — a rank change would mutate that object in place, `memo` would compare the same
// reference, skip the row, and the standings would freeze while every other part of the screen kept
// moving. Nothing throws. A screenshot looks right. Only a race shows it.
//
// So both directions are asserted: a re-render with the same values must be SKIPPED (or the
// memoisation is doing nothing and the block bought nothing), and a re-render with a changed rank
// must NOT be skipped (or the standings silently freeze).
//
// R7 — what breaks if this file is deleted: someone tidies `rank` onto the identity object, every
// test still passes, and the live standings stop updating in a way nobody notices until a race.
// ============================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreboardRow } from './ScoreboardRow.jsx';

/** The per-racer constants, as RaceScreen builds them once per race. */
const identity = (over = {}) => ({
  index: 3,
  icon: '🏇',
  name: 'Thunderbolt',
  raceNumber: 7,
  ...over,
});

describe('ScoreboardRow — memo skips what did not move, never what did', () => {
  it('RE-RENDERS when the rank changes, with the identity reference unchanged', () => {
    // THE TRAP, stated as a test. Same identity object, different rank: the row must update.
    const id = identity();
    const { rerender } = render(
      <ScoreboardRow identity={id} rank={5} finished={false} finishTimeMs={null} />
    );
    expect(screen.getByText('#5')).toBeTruthy();

    rerender(<ScoreboardRow identity={id} rank={4} finished={false} finishTimeMs={null} />);
    expect(screen.queryByText('#5')).toBeNull();
    expect(screen.getByText('#4')).toBeTruthy();
  });

  it('SKIPS the re-render when nothing it displays changed — the point of the memo', () => {
    // The other direction, and it has to be BEHAVIOURAL: without it the test above would pass just
    // as happily against a component that is not memoised at all, and the block would have bought
    // nothing. The probe is a getter on the identity — if `memo` skips, the component body never
    // runs, so the getter is never read. Shallow prop comparison touches the REFERENCE only, so the
    // getter cannot fire during the comparison itself.
    let reads = 0;
    const id = {
      index: 3,
      name: 'Thunderbolt',
      raceNumber: 7,
      get icon() {
        reads++;
        return '🏇';
      },
    };
    const { rerender } = render(
      <ScoreboardRow identity={id} rank={2} finished={false} finishTimeMs={null} />
    );
    expect(reads).toBe(1); // rendered once

    rerender(<ScoreboardRow identity={id} rank={2} finished={false} finishTimeMs={null} />);
    expect(reads).toBe(1); // identical props: the body did NOT run again

    rerender(<ScoreboardRow identity={id} rank={1} finished={false} finishTimeMs={null} />);
    expect(reads).toBe(2); // a changed rank: it DID
  });

  it('re-renders when a racer finishes — the other two changing values', () => {
    const id = identity();
    const { rerender } = render(
      <ScoreboardRow identity={id} rank={1} finished={false} finishTimeMs={null} />
    );
    expect(document.querySelector('.sb-finish-time')).toBeNull();
    expect(document.querySelector('.scoreboard-row--finished')).toBeNull();

    rerender(<ScoreboardRow identity={id} rank={1} finished={true} finishTimeMs={61234} />);
    expect(document.querySelector('.sb-finish-time')).toBeTruthy();
    expect(document.querySelector('.scoreboard-row--finished')).toBeTruthy();
  });
});

describe('ScoreboardRow — the markup is the one it replaced', () => {
  it('crowns first place and numbers the rest, with the palette on the first three', () => {
    const { container, rerender } = render(
      <ScoreboardRow identity={identity()} rank={1} finished={false} finishTimeMs={null} />
    );
    expect(screen.getByText('👑')).toBeTruthy();
    expect(container.querySelector('.sb-rank').style.color).toBe('rgb(255, 215, 0)'); // gold

    rerender(<ScoreboardRow identity={identity()} rank={4} finished={false} finishTimeMs={null} />);
    expect(screen.getByText('#4')).toBeTruthy();
    // Fourth place falls off the palette and takes the fallback, exactly as the old `?? '#888'` did.
    expect(container.querySelector('.sb-rank').style.color).toBe('rgb(136, 136, 136)');
  });

  it('puts the race NUMBER before the name (RACE-NUMBERS-1), and omits it when there is none', () => {
    const { container, rerender } = render(
      <ScoreboardRow identity={identity()} rank={2} finished={false} finishTimeMs={null} />
    );
    const name = container.querySelector('.sb-name');
    expect(name.firstChild.className).toBe('sb-number');
    expect(name.textContent.endsWith('Thunderbolt')).toBe(true);

    rerender(
      <ScoreboardRow
        identity={identity({ raceNumber: null })}
        rank={2}
        finished={false}
        finishTimeMs={null}
      />
    );
    expect(container.querySelector('.sb-number')).toBeNull();
    expect(container.querySelector('.sb-name').textContent).toBe('Thunderbolt');
  });

  it('shows a finish time only when the racer is finished AND has one', () => {
    const { container, rerender } = render(
      <ScoreboardRow identity={identity()} rank={1} finished={true} finishTimeMs={null} />
    );
    expect(container.querySelector('.sb-finish-time')).toBeNull();
    rerender(<ScoreboardRow identity={identity()} rank={1} finished={true} finishTimeMs={1000} />);
    expect(container.querySelector('.sb-finish-time')).toBeTruthy();
  });
});
