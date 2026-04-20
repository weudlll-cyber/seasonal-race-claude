// ============================================================
// File:        SetupScreen.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Pre-race setup screen — players, track selection, settings;
//              reads tracks and defaults from localStorage so Dev Panel
//              changes are reflected immediately
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PlayerSetup from './PlayerSetup.jsx';
import TrackSelector from './TrackSelector.jsx';
import RaceSettings from './RaceSettings.jsx';
import { useStorage } from '../../modules/storage/useStorage.js';
import { KEYS, storageGet, storageSet } from '../../modules/storage/storage.js';
import {
  DEFAULT_TRACKS,
  DEFAULT_RACE_DEFAULTS,
  DEFAULT_RACERS,
} from '../../modules/storage/defaults.js';
import styles from './SetupScreen.module.css';

const TABS = ['Players', 'Track', 'Settings'];

function SetupScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Read tracks and defaults from storage so Dev Panel changes propagate
  const [tracks] = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);
  const [raceDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);

  // Lazily consume any group loaded from the Dev Panel (one-shot read + clear)
  const [players, setPlayers] = useState(() => {
    const active = storageGet(KEYS.ACTIVE_GROUP);
    if (active && active.length > 0) {
      storageSet(KEYS.ACTIVE_GROUP, null); // consume so it doesn't re-apply on remount
      return active;
    }
    return [];
  });

  const [selectedTrackId, setSelectedTrackId] = useState(null);

  // Initialise race settings from stored defaults; user may override during the session
  const [raceSettings, setRaceSettings] = useState({
    duration: raceDefaults.duration,
    winners: raceDefaults.winners,
    eventName: '',
  });

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const canStart = players.length > 0 && selectedTrackId !== null;

  function handleStartRace() {
    // Save race data to session storage for RaceScreen to pick up
    const race = {
      racers: players,
      trackId: selectedTrackId,
      trackName: selectedTrack?.name,
      duration: raceSettings.duration,
      eventName: raceSettings.eventName,
      winners: raceSettings.winners,
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem('activeRace', JSON.stringify(race));
    navigate('/race');
  }

  function handleQuickTest() {
    // Create 6 test players with different racer types
    const testPlayers = [
      {
        name: 'Player 1',
        racerId: DEFAULT_RACERS[0].id,
        color: DEFAULT_RACERS[0].color,
        icon: DEFAULT_RACERS[0].icon,
      },
      {
        name: 'Player 2',
        racerId: DEFAULT_RACERS[1].id,
        color: DEFAULT_RACERS[1].color,
        icon: DEFAULT_RACERS[1].icon,
      },
      {
        name: 'Player 3',
        racerId: DEFAULT_RACERS[2].id,
        color: DEFAULT_RACERS[2].color,
        icon: DEFAULT_RACERS[2].icon,
      },
      {
        name: 'Player 4',
        racerId: DEFAULT_RACERS[3].id,
        color: DEFAULT_RACERS[3].color,
        icon: DEFAULT_RACERS[3].icon,
      },
      {
        name: 'Player 5',
        racerId: DEFAULT_RACERS[4].id,
        color: DEFAULT_RACERS[4].color,
        icon: DEFAULT_RACERS[4].icon,
      },
      {
        name: 'Player 6',
        racerId: DEFAULT_RACERS[0].id,
        color: DEFAULT_RACERS[0].color,
        icon: DEFAULT_RACERS[0].icon,
      },
    ];

    // Use first available track
    const firstTrack = tracks[0];
    const firstTrackId = firstTrack?.id;

    if (!firstTrackId) {
      console.error('[QuickTest] No tracks available');
      return;
    }

    // Save race data with test players
    const race = {
      racers: testPlayers,
      trackId: firstTrackId,
      trackName: firstTrack.name,
      duration: raceDefaults.duration,
      eventName: 'Quick Test',
      winners: raceDefaults.winners,
      timestamp: new Date().toISOString(),
    };

    console.log('[QuickTest] Saving race data:', race);
    sessionStorage.setItem('activeRace', JSON.stringify(race));
    console.log('[QuickTest] Saved to sessionStorage, navigating to /race');
    console.log('[QuickTest] Verify saved:', sessionStorage.getItem('activeRace'));

    navigate('/race');
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.logo}>
          Race<span>Arena</span>
        </div>
        {raceSettings.eventName && (
          <span style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>
            {raceSettings.eventName}
          </span>
        )}
        {/* Gear icon — always visible, opens the Dev Panel */}
        <Link
          to="/dev"
          title="Open Dev Panel"
          style={{
            fontSize: '1.2rem',
            color: 'var(--color-muted)',
            textDecoration: 'none',
            marginLeft: 'auto',
            padding: '0.25rem 0.5rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
        >
          ⚙️
        </Link>
      </header>

      <main className={styles.body}>
        {/* Tab navigation */}
        <nav className={styles.tabs} role="tablist">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === i}
              className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
              {tab === 'Players' && players.length > 0 && (
                <span
                  style={{
                    marginLeft: '0.4rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-accent)',
                  }}
                >
                  {players.length}
                </span>
              )}
              {tab === 'Track' && selectedTrack && (
                <span
                  style={{
                    marginLeft: '0.4rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-accent)',
                  }}
                >
                  {selectedTrack.icon}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Active tab panel */}
        <section className={styles.panel}>
          {activeTab === 0 && (
            <>
              <h2 className={styles.panelTitle}>Players</h2>
              <PlayerSetup players={players} onChange={setPlayers} />
            </>
          )}
          {activeTab === 1 && (
            <>
              <h2 className={styles.panelTitle}>Select Track</h2>
              <TrackSelector
                tracks={tracks}
                selectedTrackId={selectedTrackId}
                onChange={setSelectedTrackId}
              />
            </>
          )}
          {activeTab === 2 && (
            <>
              <h2 className={styles.panelTitle}>Race Settings</h2>
              <RaceSettings settings={raceSettings} onChange={setRaceSettings} />
            </>
          )}
        </section>

        {/* Start bar — always visible at the bottom */}
        <div className={styles.startBar}>
          <div className={styles.startSummary}>
            <strong>{players.length}</strong> player{players.length !== 1 ? 's' : ''} ·{' '}
            {selectedTrack ? (
              <strong>
                {selectedTrack.icon} {selectedTrack.name}
              </strong>
            ) : (
              'No track selected'
            )}{' '}
            · <strong>{raceSettings.duration}s</strong> · Top{' '}
            <strong>{raceSettings.winners}</strong>
          </div>
          <div className={styles.startButtons}>
            <button
              className={styles.quickTestBtn}
              onClick={handleQuickTest}
              title="Auto-fill 6 test players and start race"
            >
              ⚡ Quick Test
            </button>
            <button
              className={styles.startBtn}
              disabled={!canStart}
              onClick={handleStartRace}
              title={
                !canStart
                  ? 'Add at least one player and select a track to start'
                  : 'Start the race!'
              }
            >
              Start Race →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SetupScreen;
