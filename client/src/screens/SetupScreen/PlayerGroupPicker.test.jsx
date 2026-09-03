// ============================================================
// PlayerGroupPicker.test.jsx — PLAYER-GROUPS-1
//
// SABOTAGE — the feature's whole value is that TWO groups can race each other, and the two ways it
//   can quietly fail are (a) the second group's names never arrive, and (b) they arrive twice.
//   Both are invisible on screen until the gun goes.
//   What breaks if I delete this: the picker could add a group and drop the previous one, or admit
//   a duplicate name that the roster's `key={player.name}` would then collapse.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlayerGroupPicker, { UNGROUPED_LABEL } from './PlayerGroupPicker.jsx';

const GROUPS = [
  { id: 'g1', name: 'Reds', players: ['Anna', 'Ben'] },
  { id: 'g2', name: 'Blues', players: ['Cara', 'Ben', 'Dev'] },
];

/** Renders with a live roster the test can read back, exactly as SetupScreen holds it. */
function harness({ initial = [], groups = GROUPS, maxPlayers = 40, fetchGroups } = {}) {
  const state = { players: initial };
  const onChange = vi.fn((next) => {
    state.players = next;
  });
  const fg = fetchGroups ?? vi.fn().mockResolvedValue(groups);
  const view = render(
    <PlayerGroupPicker
      players={state.players}
      onChange={onChange}
      maxPlayers={maxPlayers}
      fetchGroups={fg}
    />
  );
  const rerender = () =>
    view.rerender(
      <PlayerGroupPicker
        players={state.players}
        onChange={onChange}
        maxPlayers={maxPlayers}
        fetchGroups={fg}
      />
    );
  return { state, onChange, rerender, fg };
}

describe('PlayerGroupPicker', () => {
  it('adds a group to the roster, tagging each player with the group it came from', async () => {
    const { state, rerender } = harness();
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    expect(state.players.map((p) => p.name)).toEqual(['Anna', 'Ben']);
    expect(state.players.every((p) => p.group === 'Reds')).toBe(true);
  });

  it('★ a SECOND group joins the first — it does not replace it', async () => {
    // This is the feature. Before it, one group reached a race and running two meant retyping one.
    const { state, rerender } = harness();
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Blues'));
    rerender();
    expect(state.players.map((p) => p.name).sort()).toEqual(['Anna', 'Ben', 'Cara', 'Dev']);
    expect(state.players.filter((p) => p.group === 'Reds')).toHaveLength(2);
    expect(state.players.filter((p) => p.group === 'Blues')).toHaveLength(2);
  });

  it('★ a name in two groups is admitted ONCE, and the operator is told', async () => {
    // "Ben" is in both. A race cannot run him twice, and the roster keys on the name.
    const { state, rerender } = harness();
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Blues'));
    rerender();
    expect(state.players.filter((p) => p.name === 'Ben')).toHaveLength(1);
    expect(screen.getByTestId('group-notice')).toHaveTextContent(/already in the field/i);
  });

  it('clearing a group removes exactly its own players and leaves the rest', async () => {
    const { state, rerender } = harness({
      initial: [{ name: 'Zoe', racerNumber: 1 }],
    });
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Reds'));
    rerender();
    expect(state.players.map((p) => p.name)).toEqual(['Zoe']);
  });

  it('★ a hand-added player is untouched by every group operation', async () => {
    // The picker fills the field; it does not own it. A hand-typed name that a group click can
    // delete would make the two doors into the roster fight each other.
    const { state, rerender } = harness({ initial: [{ name: 'Zoe', racerNumber: 1 }] });
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Blues'));
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Reds'));
    rerender();
    const zoe = state.players.find((p) => p.name === 'Zoe');
    expect(zoe).toBeDefined();
    expect(zoe.group).toBeUndefined();
  });

  it('every player carries a racer number after a group arrives, and no number repeats', async () => {
    const { state, rerender } = harness({ initial: [{ name: 'Zoe', racerNumber: 1 }] });
    fireEvent.click(await screen.findByTestId('group-chip-Blues'));
    rerender();
    const numbers = state.players.map((p) => p.racerNumber);
    expect(numbers.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('the field CAP is honoured, and the overflow is reported rather than dropped in silence', async () => {
    const { state, rerender } = harness({ maxPlayers: 1 });
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    expect(state.players).toHaveLength(1);
    expect(screen.getByTestId('group-notice')).toHaveTextContent(/did not fit/i);
    expect(screen.getByTestId('group-notice')).toHaveTextContent(/capped at 1/);
  });

  it('★ a failed fetch says WHY, and does not render as "no groups"', async () => {
    // The two look identical on a screen and mean opposite things. QUIET-FAILURES-1's rule.
    const fetchGroups = vi.fn().mockRejectedValue(new Error('connection refused'));
    harness({ fetchGroups });
    await waitFor(() => expect(screen.getByTestId('group-load-error')).toBeInTheDocument());
    expect(screen.getByTestId('group-load-error')).toHaveTextContent(/connection refused/);
    expect(screen.queryByTestId('group-empty')).toBeNull();
  });

  it('an EMPTY list says there are none, and points at where they are made', async () => {
    harness({ groups: [] });
    await waitFor(() => expect(screen.getByTestId('group-empty')).toBeInTheDocument());
    expect(screen.getByTestId('group-empty')).toHaveTextContent(/Dev Screen/);
    expect(screen.queryByTestId('group-load-error')).toBeNull();
  });

  it('names the label that ungrouped players run under, so the screen and the roster agree', async () => {
    harness();
    expect(UNGROUPED_LABEL).toBe('All');
    expect(await screen.findByText(new RegExp(UNGROUPED_LABEL))).toBeInTheDocument();
  });
});
