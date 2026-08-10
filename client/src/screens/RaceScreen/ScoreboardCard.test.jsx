// ============================================================
// File:        ScoreboardCard.test.jsx
// Path:        client/src/screens/RaceScreen/ScoreboardCard.test.jsx
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// WHAT THIS GUARDS: that a card really is inert during a race, and that it still says what the row
// it replaced said.
//
// The claim this whole block rests on is that a rank change touches NO TEXT AND NO STYLE in React.
// That is only true if the card takes no rank — so the first test here is the one that would catch
// somebody putting it back: a card re-rendered with the same props must not run its body, and no
// prop exists that a changed place could alter.
//
// Its predecessor asserted the OPPOSITE and was right at the time: while the row displayed `#5`, a
// rank had to be a prop compared by value, or `memo` would skip a row whose place had changed and
// the standings would freeze. That test is gone WITH the thing it protected. The freeze it feared
// has not gone away — it moved to `scoreboardPositions.test.js`, which is where the place now lives.
//
// R7 — what breaks if this file is deleted: the card quietly grows a per-tick prop again (a rank, a
// gap, a lap) and the block's whole claim becomes false while every other test stays green.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreboardCard } from './ScoreboardCard.jsx';

/** The per-racer constants, as RaceScreen builds them once per race. */
const identity = (over = {}) => ({
  index: 3,
  icon: '🏇',
  name: 'Thunderbolt',
  raceNumber: 7,
  ...over,
});

const noop = () => {};

describe('ScoreboardCard — inert while the race runs', () => {
  it('SKIPS the re-render when nothing it displays changed — which during a race is always', () => {
    // BEHAVIOURAL, not structural: without this the file would pass just as happily against a
    // component that is not memoised at all. The probe is a getter on the identity — if `memo`
    // skips, the component body never runs, so the getter is never read. Shallow prop comparison
    // touches the REFERENCE only, so the getter cannot fire during the comparison itself.
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
      <ScoreboardCard identity={id} finished={false} finishTimeMs={null} attach={noop} />
    );
    expect(reads).toBe(1); // rendered once

    rerender(<ScoreboardCard identity={id} finished={false} finishTimeMs={null} attach={noop} />);
    expect(reads).toBe(1); // identical props: the body did NOT run again

    // The one thing that still changes a card, so the memo must not be skipping unconditionally.
    rerender(<ScoreboardCard identity={id} finished={true} finishTimeMs={61234} attach={noop} />);
    expect(reads).toBe(2);
  });

  it('re-renders when a racer finishes — the finish tint and the time appear', () => {
    const id = identity();
    const { rerender } = render(
      <ScoreboardCard identity={id} finished={false} finishTimeMs={null} attach={noop} />
    );
    expect(document.querySelector('.sb-finish-time')).toBeNull();
    expect(document.querySelector('.scoreboard-card--finished')).toBeNull();

    rerender(<ScoreboardCard identity={id} finished={true} finishTimeMs={61234} attach={noop} />);
    expect(document.querySelector('.sb-finish-time')).toBeTruthy();
    expect(document.querySelector('.scoreboard-card--finished')).toBeTruthy();
  });

  it('carries NO place text of its own — the badge is the other layer entirely', () => {
    // The property the slot layer exists for, asserted where it can regress: if a place ever came
    // back into this element, a rank change would repaint it again and the block would be undone.
    const { container } = render(
      <ScoreboardCard identity={identity()} finished={false} finishTimeMs={null} attach={noop} />
    );
    expect(container.querySelector('.sb-rank')).toBeNull();
    expect(container.textContent).not.toMatch(/#\d/);
    expect(container.textContent).not.toContain('👑');
    // ...and the column the badge is drawn in is still RESERVED, or the icon would sit under it.
    expect(container.querySelector('.sb-badge-spacer')).toBeTruthy();
  });

  it('hands its element to the positioner under its racer index', () => {
    const attach = vi.fn();
    const { unmount } = render(
      <ScoreboardCard identity={identity()} finished={false} finishTimeMs={null} attach={attach} />
    );
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach.mock.calls[0][0]).toBe(3);
    expect(attach.mock.calls[0][1]).toBeInstanceOf(HTMLElement);
    // ...and gives it back, or the positioner would keep writing to a detached node forever.
    unmount();
    expect(attach).toHaveBeenLastCalledWith(3, null);
  });
});

describe('ScoreboardCard — the markup is the one it replaced', () => {
  it('puts the race NUMBER before the name (RACE-NUMBERS-1), and omits it when there is none', () => {
    const { container, rerender } = render(
      <ScoreboardCard identity={identity()} finished={false} finishTimeMs={null} attach={noop} />
    );
    const name = container.querySelector('.sb-name');
    expect(name.firstChild.className).toBe('sb-number');
    expect(name.textContent.endsWith('Thunderbolt')).toBe(true);

    rerender(
      <ScoreboardCard
        identity={identity({ raceNumber: null })}
        finished={false}
        finishTimeMs={null}
        attach={noop}
      />
    );
    expect(container.querySelector('.sb-number')).toBeNull();
    expect(container.querySelector('.sb-name').textContent).toBe('Thunderbolt');
  });

  it('shows a finish time only when the racer is finished AND has one', () => {
    const { container, rerender } = render(
      <ScoreboardCard identity={identity()} finished={true} finishTimeMs={null} attach={noop} />
    );
    expect(container.querySelector('.sb-finish-time')).toBeNull();
    rerender(
      <ScoreboardCard identity={identity()} finished={true} finishTimeMs={1000} attach={noop} />
    );
    expect(container.querySelector('.sb-finish-time')).toBeTruthy();
  });

  it('shows the icon and the name it was given', () => {
    render(
      <ScoreboardCard
        identity={identity({ icon: '🐬', name: 'Seabiscuit' })}
        finished={false}
        finishTimeMs={null}
        attach={noop}
      />
    );
    expect(screen.getByText('🐬')).toBeTruthy();
    expect(screen.getByText(/Seabiscuit/)).toBeTruthy();
  });
});
