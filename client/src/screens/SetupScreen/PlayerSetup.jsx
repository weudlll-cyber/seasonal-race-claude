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
import styles from './SetupScreen.module.css';

const MAX_PLAYERS = 20;

function PlayerSetup({ players, onChange }) {
  const [inputValue, setInputValue] = useState('');

  function handleAdd() {
    const name = inputValue.trim();
    if (!name || players.length >= MAX_PLAYERS) return;

    // Re-shuffle racer assignments every time the roster changes
    const newNames = [...players.map((p) => p.name), name];
    onChange(assignRacers(newNames));
    setInputValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
  }

  function handleRemove(index) {
    const newNames = players.filter((_, i) => i !== index).map((p) => p.name);
    onChange(newNames.length > 0 ? assignRacers(newNames) : []);
  }

  function handleReassign() {
    onChange(assignRacers(players.map((p) => p.name)));
  }

  const atMax = players.length >= MAX_PLAYERS;

  return (
    <div>
      <div className={styles.playerInputRow}>
        <input
          className={styles.playerInput}
          type="text"
          placeholder={atMax ? 'Maximum 20 players reached' : 'Enter player name…'}
          value={inputValue}
          disabled={atMax}
          maxLength={32}
          onChange={(e) => setInputValue(e.target.value)}
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

      <p className={styles.playerCount}>
        {players.length} / {MAX_PLAYERS} players
      </p>

      {players.length === 0 ? (
        <p className={styles.emptyHint}>No players yet — add at least one to start.</p>
      ) : (
        <>
          {/* Sort display by racer number so the list is easy to scan */}
          <div className={styles.playerList}>
            {[...players]
              .sort((a, b) => a.racerNumber - b.racerNumber)
              .map((player) => (
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
          <button className={styles.reassignBtn} onClick={handleReassign}>
            🔀 Reshuffle racer assignments
          </button>
        </>
      )}
    </div>
  );
}

export default PlayerSetup;
