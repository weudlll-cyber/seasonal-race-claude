// ============================================================
// File:        PlayerSetup.test.jsx
// Path:        client/src/screens/SetupScreen/PlayerSetup.test.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Unit tests for PlayerSetup — add, remove, and reshuffle players
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import PlayerSetup from './PlayerSetup.jsx';
import { sectionsOf } from './rosterGroups.js';

// Helper: render with controlled props; returns the onChange spy
function setup(players = []) {
  const onChange = vi.fn();
  // MAX-FIELD-1: the cap is REQUIRED now, so this helper states one instead of leaning on a
  // default that no production caller ever reached.
  render(<PlayerSetup players={players} onChange={onChange} maxPlayers={20} />);
  return { onChange };
}

describe('PlayerSetup', () => {
  it('shows empty-state hint when no players are present', () => {
    setup([]);
    expect(screen.getByText(/No players yet/i)).toBeInTheDocument();
  });

  it('shows "0 / 20 players" counter initially', () => {
    setup([]);
    expect(screen.getByText(/0 \/ 20 players/i)).toBeInTheDocument();
  });

  it('Add button is disabled when input is empty', () => {
    setup([]);
    expect(screen.getByText('Add')).toBeDisabled();
  });

  it('calls onChange with the new player when Add is clicked', () => {
    const { onChange } = setup([]);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenCalledOnce();
    const [newPlayers] = onChange.mock.calls[0];
    expect(newPlayers).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Alice' })])
    );
  });

  it('calls onChange with the new player when Enter is pressed', () => {
    const { onChange } = setup([]);
    const input = screen.getByPlaceholderText(/Enter player name/i);
    fireEvent.change(input, { target: { value: 'Bob' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('trims whitespace from player names before adding', () => {
    const { onChange } = setup([]);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: '  Carol  ' },
    });
    fireEvent.click(screen.getByText('Add'));
    const [newPlayers] = onChange.mock.calls[0];
    expect(newPlayers).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Carol' })])
    );
  });

  it('removes a player when the remove button is clicked', () => {
    const players = [{ name: 'Alice' }];
    const { onChange } = setup(players);
    fireEvent.click(screen.getByTitle('Remove player'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  // ── DROP-RACER-NUMBER-1, the owner's decision of 2026-09-04 ─────────────────────────────────
  //
  // SABOTAGE — the badge and the 🔀 button are GONE. They are asserted ABSENT rather than simply
  //   deleted from the suite, because a removal nothing watches is a removal that comes back: the
  //   `#3` was read as the number the racer carries into the race, and it decided nothing.
  //   What breaks if I delete this: either control can be re-added and the suite stays green.

  it('★ renders each player as a NAME — the #3 badge is gone', () => {
    setup([{ name: 'Alice' }, { name: 'Bob' }]);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText(/^#\d+$/)).toBeNull();
  });

  it('★ there is no reshuffle control at all', () => {
    setup([{ name: 'Alice' }, { name: 'Bob' }]);
    expect(screen.queryByText(/Reshuffle/i)).toBeNull();
    expect(screen.queryByText(/🔀/)).toBeNull();
  });

  it('★ the list reads ALPHABETICALLY, whatever order the names arrived in', () => {
    setup([{ name: 'Zoe' }, { name: 'Alice' }, { name: 'Mo' }]);
    const shown = screen.getAllByText(/^(Zoe|Alice|Mo)$/).map((el) => el.textContent);
    expect(shown).toEqual(['Alice', 'Mo', 'Zoe']);
  });

  it('adding a name does NOT stamp a number onto anybody', () => {
    const { onChange } = setup([{ name: 'Alice' }]);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: 'Bob' },
    });
    fireEvent.click(screen.getByText('Add'));
    const [next] = onChange.mock.calls[0];
    for (const p of next) expect(p).not.toHaveProperty('racerNumber');
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// PLAYER-GROUPS-1 — the roster is shown under its groups, ungrouped players under `All`.
//
// SABOTAGE — the sectioning is what lets the operator SEE which group a name arrived with, which
//   is what makes clearing one group an informed act rather than a guess.
//   What breaks if I delete this: the list could go back to one flat run of names, or `All` could
//   float to the top and bury the groups the operator actually chose.
// ══════════════════════════════════════════════════════════════════════════════════════════════

describe('sectionsOf', () => {
  const P = (name, _unused, group) => ({ name, ...(group ? { group } : {}) });

  it('puts each group in its own section and ungrouped players under All', () => {
    const out = sectionsOf([P('Anna', 2, 'Reds'), P('Zoe', 1), P('Cara', 3, 'Blues')]);
    expect(out.map((s) => s.label)).toEqual(['Reds', 'Blues', 'All']);
    expect(out.find((s) => s.label === 'All').members.map((m) => m.name)).toEqual(['Zoe']);
  });

  it('★ All is LAST, because it is the residue rather than a choice', () => {
    const out = sectionsOf([P('Zoe', 1), P('Anna', 2, 'Reds')]);
    expect(out[out.length - 1].label).toBe('All');
  });

  it('keeps the groups in the order they arrived, not alphabetical', () => {
    const out = sectionsOf([P('Cara', 1, 'Zulu'), P('Anna', 2, 'Alpha')]);
    expect(out.map((s) => s.label)).toEqual(['Zulu', 'Alpha']);
  });

  it('★ sorts inside a section ALPHABETICALLY (DROP-RACER-NUMBER-1)', () => {
    // It sorted by the `racerNumber` badge, which was re-rolled on every add and remove — so the
    // list reordered itself under the operator's hands for no reason they could act on.
    const out = sectionsOf([P('B', 3, 'Reds'), P('A', 1, 'Reds'), P('C', 2, 'Reds')]);
    expect(out[0].members.map((m) => m.name)).toEqual(['A', 'B', 'C']);
  });

  it('a field with NO groups is one section called All — the previous list, with a title', () => {
    const out = sectionsOf([P('Zoe', 1), P('Anna', 2)]);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('All');
  });

  it('an empty roster yields no sections at all', () => {
    expect(sectionsOf([])).toEqual([]);
  });
});

describe('PlayerSetup with groups', () => {
  it('★ adding a name by hand does not erase the group of anyone already in the field', () => {
    // The defect this guards is invisible: `assignRacers` rebuilt from names, so every Add silently
    // stripped the group off every existing player.
    let players = [{ name: 'Anna', group: 'Reds' }];
    const onChange = vi.fn((next) => {
      players = next;
    });
    render(<PlayerSetup players={players} onChange={onChange} maxPlayers={20} />);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: 'Zoe' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(players.find((p) => p.name === 'Anna').group).toBe('Reds');
    expect(players.find((p) => p.name === 'Zoe').group).toBeUndefined();
  });

  it('the section headings appear once there is more than one section', () => {
    render(
      <PlayerSetup
        players={[{ name: 'Anna', group: 'Reds' }, { name: 'Zoe' }]}
        onChange={() => {}}
        maxPlayers={20}
      />
    );
    expect(screen.getByTestId('roster-section-Reds')).toBeInTheDocument();
    expect(screen.getByTestId('roster-section-All')).toBeInTheDocument();
  });

  it('and a single-section field is NOT given a heading — the list is unchanged for that case', () => {
    render(<PlayerSetup players={[{ name: 'Zoe' }]} onChange={() => {}} maxPlayers={20} />);
    expect(screen.queryByTestId('roster-section-All')).toBeNull();
  });
});
