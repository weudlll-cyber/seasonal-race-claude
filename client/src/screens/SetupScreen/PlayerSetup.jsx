// ============================================================
// File:        PlayerSetup.jsx
// Path:        client/src/screens/SetupScreen/PlayerSetup.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Game Master enters player names; each player is shown their
//              randomly assigned racer number
// ============================================================

import { useState } from 'react';
import { assignRacers } from '../../modules/utils/RandomHelper.js';
// NAME-LIMIT-1: the limit's one home, shared with the server so both sides of the boundary agree.
import {
  PLAYER_NAME_MAX_LENGTH,
  isNameLengthValid,
  nameTooLongMessage,
} from '../../../../shared/nameLimits.mjs';
import { sectionsOf } from './rosterGroups.js';
import styles from './SetupScreen.module.css';

function PlayerSetup({ players, onChange, maxPlayers = 20 }) {
  const [inputValue, setInputValue] = useState('');
  const [nameError, setNameError] = useState('');

  function handleAdd() {
    const name = inputValue.trim();
    if (!name || players.length >= maxPlayers) return;
    // NAME-LIMIT-1: checked HERE, not left to the input's `maxLength`. The attribute stops typing;
    // it does not stop a paste or a programmatic value, and it does not exist on the server. The
    // name is REJECTED with a reason and never trimmed — a trimmed name is a label the person it
    // belongs to does not recognise, and the operator is never told it happened.
    if (!isNameLengthValid(name)) {
      setNameError(nameTooLongMessage([name]));
      return;
    }
    setNameError('');

    // Re-shuffle racer assignments every time the roster changes. PLAYER-GROUPS-1: the EXISTING
    // players are passed through as objects, not rebuilt from their names — rebuilding erased the
    // group each one arrived with, and did so on every single add.
    onChange(assignRacers([...players, { name }]));
    setInputValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
  }

  function handleRemove(index) {
    const kept = players.filter((_, i) => i !== index);
    onChange(kept.length > 0 ? assignRacers(kept) : []);
  }

  function handleReassign() {
    onChange(assignRacers(players));
  }

  const atMax = players.length >= maxPlayers;
  const sections = sectionsOf(players);

  return (
    <div>
      <div className={styles.playerInputRow}>
        <input
          className={styles.playerInput}
          type="text"
          placeholder={atMax ? `Maximum ${maxPlayers} players reached` : 'Enter player name…'}
          value={inputValue}
          disabled={atMax}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (nameError) setNameError('');
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={!inputValue.trim() || atMax}
        >
          Add
        </button>
      </div>

      {/* NAME-LIMIT-1: the VISIBLE reason. A rejection the operator cannot see is indistinguishable
          from a broken Add button. */}
      {nameError && (
        <p role="alert" data-testid="player-name-error" className={styles.emptyHint}>
          {nameError}
        </p>
      )}

      <p className={styles.playerCount}>
        {players.length} / {maxPlayers} players
      </p>

      {players.length === 0 ? (
        <p className={styles.emptyHint}>No players yet — add at least one to start.</p>
      ) : (
        <>
          {/* PLAYER-GROUPS-1: the roster is shown UNDER ITS GROUPS, with hand-added players under
              `UNGROUPED_LABEL`. The operator has to be able to see which group a name arrived with,
              or removing one group's players becomes guesswork. Sorting inside each section is by
              racer number, exactly as before — only the sectioning is new, and a field with no
              groups renders as one section headed "All", which is the previous list with a title. */}
          {sections.map(({ label, members }) => (
            <div key={label} className={styles.playerGroupSection}>
              {sections.length > 1 && (
                <p className={styles.playerGroupHeading} data-testid={`roster-section-${label}`}>
                  {label} <span className={styles.playerGroupCount}>{members.length}</span>
                </p>
              )}
              <div className={styles.playerList}>
                {members.map((player) => (
                  <div key={player.name} className={styles.playerRow}>
                    <span className={styles.racerBadge}>#{player.racerNumber}</span>
                    <span className={styles.playerName}>{player.name}</span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemove(players.findIndex((p) => p.name === player.name))}
                      title="Remove player"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className={styles.reassignBtn} onClick={handleReassign}>
            🔀 Reshuffle racer assignments
          </button>
        </>
      )}
    </div>
  );
}

export default PlayerSetup;
