// ============================================================
// File:        PlayerGroupPicker.jsx
// Path:        client/src/screens/SetupScreen/PlayerGroupPicker.jsx
// Project:     RaceArena — PLAYER-GROUPS-1
// Created:     2026-09-03
// Description: Pick SEVERAL saved player groups on the Setup Screen and race them together.
// ============================================================
//
// WHAT THIS CHANGES. Saved player groups existed before this — on the server, managed from the Dev
// Screen — but only ONE could reach a race, through a one-shot hand-off key (`KEYS.ACTIVE_GROUP`)
// written by the Dev Screen's "Load to Setup" button. Running two groups against each other meant
// retyping one of them. Here the groups are chosen where the race is set up, and any number of them
// can be in the field at once.
//
// ★ ADDITIVE, NEVER AUTHORITATIVE. Selecting a group ADDS its players to the roster; clearing it
// removes the ones it put there. Players typed by hand are untouched by every one of those
// operations and are shown under **All** — the group picker is a way to fill the roster, not a
// second roster that competes with it. That is the whole reason the state lives in the roster
// itself (each player carries the group it arrived with) rather than in a selection this component
// owns: there is one list of who is racing, and it is the one the operator can see.
//
// A NAME IS IN THE FIELD ONCE. Two groups can both contain "Anna", and a race cannot. The second
// arrival is refused and SAID SO — a name that vanishes silently is indistinguishable from a broken
// button, which is the rule QUIET-FAILURES-1 wrote into this screen.
//
// THE SERVER MAY BE DOWN, AND THAT MUST NOT BLOCK A RACE. Groups are a convenience; the Players tab
// works without them. A failed fetch prints one line saying so and leaves everything else alone.
// The one thing it must not do is look like "you have no groups".

import { useEffect, useState } from 'react';
import { fetchPlayerGroups } from '../../services/playerGroupApi.js';
import { UNGROUPED_LABEL } from './rosterGroups.js';
import styles from './SetupScreen.module.css';

export { UNGROUPED_LABEL };

/**
 * @param {object}   props
 * @param {{name: string, group?: string}[]} props.players  the live roster
 * @param {(players: {name: string}[]) => void} props.onChange
 * @param {number}   props.maxPlayers   the track's cap, so a group cannot overfill the field
 * @param {Function} [props.fetchGroups=fetchPlayerGroups]  seam for the tests
 */
function PlayerGroupPicker({ players, onChange, maxPlayers, fetchGroups = fetchPlayerGroups }) {
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let live = true;
    fetchGroups()
      .then((list) => {
        if (!live) return;
        setGroups(Array.isArray(list) ? list : []);
        setLoadError('');
      })
      .catch((e) => {
        if (!live) return;
        // The REASON, not just the absence. "No groups" and "could not ask" look identical on a
        // screen and mean opposite things.
        setLoadError(e?.message || 'the server did not answer');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [fetchGroups]);

  const selected = new Set(players.map((p) => p.group).filter(Boolean));

  function addGroup(group) {
    const already = new Set(players.map((p) => p.name));
    const incoming = group.players.filter((n) => !already.has(n));
    const duplicates = group.players.length - incoming.length;

    // ── REFUSE, DO NOT TRUNCATE (REFUSE-OVERSIZED-1, the owner's decision of 2026-09-04) ────────
    //
    // This used to admit `incoming.slice(0, room)` and report how many did not fit. The count was
    // true and useless: the names it dropped were the TAIL of the group's saved order, that order
    // is on no screen, and the field was renumbered afterwards — so the host was told seven were
    // gone and had no way to find out WHICH. He would rather be told it does not fit and choose
    // himself, and choosing is something only he can do.
    //
    // IT IS ALL OR NOTHING, AND IT SAYS SO AT THE MOMENT OF SELECTION rather than at launch. A
    // refusal a host meets while picking is a fact they can act on; the same refusal met at the
    // start line is a wall.
    //
    // THE MESSAGE NAMES NUMBERS, NEVER PEOPLE. How many the selection would hold, how many the
    // track allows. Naming individuals would be the truncation defect wearing a better coat — it
    // would still be the screen deciding who is out.
    const wouldHold = players.length + incoming.length;
    if (incoming.length > 0 && wouldHold > maxPlayers) {
      setNotice(
        `“${group.name}” does not fit. It would put ${wouldHold} racers in the field and this ` +
          `track allows ${maxPlayers}. Nothing was added — remove ${wouldHold - maxPlayers} from ` +
          `the field, or clear a group, and try again.`
      );
      return;
    }

    if (incoming.length === 0) {
      setNotice(
        duplicates > 0
          ? `Every name in “${group.name}” is already in the field. Nothing was added.`
          : `“${group.name}” is empty.`
      );
      return;
    }

    setNotice(
      duplicates > 0
        ? `${duplicates} name${duplicates === 1 ? '' : 's'} in “${group.name}” ${
            duplicates === 1 ? 'was' : 'were'
          } already in the field and ${duplicates === 1 ? 'was' : 'were'} not added twice.`
        : ''
    );
    onChange([...players, ...incoming.map((name) => ({ name, group: group.name }))]);
  }

  function removeGroup(group) {
    // DESELECTING ALWAYS WORKS, and never refuses. It is the way out of every refusal above, so a
    // guard on it — however reasonable-looking — would strand a host inside a field they cannot
    // shrink. Clearing the notice is part of that: the reason it was shown has just been acted on.
    setNotice('');
    onChange(players.filter((p) => p.group !== group.name));
  }

  return (
    <div className={styles.groupPicker} data-testid="player-group-picker">
      <div className={styles.groupPickerHead}>
        <h3 className={styles.groupPickerTitle}>Player groups</h3>
        <span className={styles.groupPickerHint}>
          Pick any number — they race together. Names you type below run under “{UNGROUPED_LABEL}”.
        </span>
      </div>

      {loading && <p className={styles.emptyHint}>Loading groups…</p>}

      {/* A failure says what failed. It is NOT rendered as an empty list. */}
      {!loading && loadError && (
        <p role="alert" data-testid="group-load-error" className={styles.emptyHint}>
          Saved groups could not be loaded ({loadError}). You can still add players by hand below —
          nothing else on this screen depends on them.
        </p>
      )}

      {!loading && !loadError && groups.length === 0 && (
        <p data-testid="group-empty" className={styles.emptyHint}>
          No saved groups yet. Create them on the Dev Screen under “Player groups”.
        </p>
      )}

      {!loading && !loadError && groups.length > 0 && (
        <div className={styles.groupChips}>
          {groups.map((g) => {
            const on = selected.has(g.name);
            const count = players.filter((p) => p.group === g.name).length;
            return (
              <button
                key={g.id ?? g.name}
                type="button"
                data-testid={`group-chip-${g.name}`}
                aria-pressed={on}
                className={on ? styles.groupChipOn : styles.groupChip}
                onClick={() => (on ? removeGroup(g) : addGroup(g))}
                title={
                  on
                    ? `Remove the ${count} player(s) “${g.name}” put in the field`
                    : `Add the ${g.players.length} player(s) in “${g.name}”`
                }
              >
                {on ? '✓ ' : '+ '}
                {g.name}
                <span className={styles.groupChipCount}>{on ? count : g.players.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* CHIP-CONTRAST-1 item 3: a WARNING, not an error. Nothing is broken — a field at the cap
          starts and races normally — so it wears the ⚠️ and --color-accent this screen's start-bar
          `capacity-warning` already uses, not the red of a refusal. Dressing a normal outcome as a
          failure is how an operator learns to skip real ones. The words say so too. */}
      {notice && (
        <p role="status" data-testid="group-notice" className={styles.groupNotice}>
          <span aria-hidden="true">⚠️</span>
          <span>{notice}</span>
        </p>
      )}
    </div>
  );
}

export default PlayerGroupPicker;
