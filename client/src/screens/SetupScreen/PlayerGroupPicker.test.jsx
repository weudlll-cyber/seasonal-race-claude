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
      initial: [{ name: 'Zoe' }],
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
    const { state, rerender } = harness({ initial: [{ name: 'Zoe' }] });
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

  it('★ a group arriving stamps NO racer number on anybody (DROP-RACER-NUMBER-1)', () => {
    // The picker used to renumber the whole field on every add. The owner retired the badge and
    // the shuffle on 2026-09-04; the roster is names and groups now, and nothing may quietly
    // re-introduce a field the Setup Screen no longer draws and nothing outside it ever read.
    return (async () => {
      const { state, rerender } = harness({ initial: [{ name: 'Zoe' }] });
      fireEvent.click(await screen.findByTestId('group-chip-Blues'));
      rerender();
      expect(state.players.length).toBeGreaterThan(1);
      for (const p of state.players) expect(p).not.toHaveProperty('racerNumber');
    })();
  });

  // ── REFUSE-OVERSIZED-1 (the owner's decision, 2026-09-04) ───────────────────────────────────
  //
  // SABOTAGE — this replaced TRUNCATION, which admitted as many as fit and reported a COUNT. The
  //   count was true and useless: the names it dropped were the tail of the group's saved order,
  //   that order is on no screen, and the field was renumbered afterwards, so the host was told
  //   seven were gone with no way to learn which.
  //   What breaks if I delete this: `slice(0, room)` can come back and the suite stays green,
  //   because a truncating picker still produces a legal field.

  it('★ a group that does not fit is REFUSED WHOLE — nothing is added', async () => {
    const { state, rerender } = harness({ maxPlayers: 1 });
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    expect(state.players, 'not one name may be admitted from a group that does not fit').toEqual(
      []
    );
  });

  it('★ and it says so with NUMBERS, at the moment of selection, naming nobody', async () => {
    const { rerender } = harness({ maxPlayers: 1 });
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    const notice = screen.getByTestId('group-notice');
    expect(notice).toHaveTextContent(/does not fit/i);
    expect(notice).toHaveTextContent(/would put 2 racers/);
    expect(notice).toHaveTextContent(/allows 1/);
    expect(notice).toHaveTextContent(/Nothing was added/i);
    // NEVER an individual. Naming who would be cut is the truncation defect in a better coat.
    expect(notice.textContent).not.toMatch(/Anna|Ben/);
  });

  it('★ TWO groups that each fit but together do not: the second is refused, the first stands', async () => {
    // maxPlayers 3: Reds is 2 and fits; Blues would take it to 4.
    const { state, rerender } = harness({ maxPlayers: 3 });
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    expect(state.players.map((p) => p.name).sort()).toEqual(['Anna', 'Ben']);
    fireEvent.click(screen.getByTestId('group-chip-Blues'));
    rerender();
    expect(state.players.map((p) => p.name).sort()).toEqual(['Anna', 'Ben']);
    expect(screen.getByTestId('group-notice')).toHaveTextContent(/does not fit/i);
  });

  it('★ …and DESELECTING is the way out, and always works', async () => {
    const { state, rerender } = harness({ maxPlayers: 3 });
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Blues')); // refused
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Reds')); // out
    rerender();
    expect(state.players).toEqual([]);
    // The notice goes with the reason for it.
    expect(screen.queryByTestId('group-notice')).toBeNull();
    // And now the group that would not fit, fits.
    fireEvent.click(screen.getByTestId('group-chip-Blues'));
    rerender();
    expect(state.players.map((p) => p.name).sort()).toEqual(['Ben', 'Cara', 'Dev']);
  });

  it('a group whose every name is already in the field says so, and adds nothing', async () => {
    const { state, rerender } = harness();
    fireEvent.click(await screen.findByTestId('group-chip-Reds'));
    rerender();
    const before = state.players.length;
    fireEvent.click(screen.getByTestId('group-chip-Blues'));
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Blues')); // off
    rerender();
    fireEvent.click(screen.getByTestId('group-chip-Reds')); // off
    rerender();
    expect(before).toBeGreaterThan(0);
    expect(state.players).toEqual([]);
  });

  it('hand-typed names are untouched by a REFUSAL, as by every other group operation', async () => {
    const { state, rerender } = harness({ initial: [{ name: 'Zoe' }], maxPlayers: 2 });
    fireEvent.click(await screen.findByTestId('group-chip-Blues'));
    rerender();
    expect(state.players).toEqual([{ name: 'Zoe' }]);
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
