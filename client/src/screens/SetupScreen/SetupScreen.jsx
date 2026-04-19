// ============================================================
// File:        SetupScreen.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Pre-race setup screen — players, track selection, settings;
//              reads tracks and defaults from localStorage so Dev Panel
//              changes are reflected immediately
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PlayerSetup  from './PlayerSetup.jsx';
import TrackSelector from './TrackSelector.jsx';
import RaceSettings from './RaceSettings.jsx';
import { useStorage }         from '../../modules/storage/useStorage.js';
import { KEYS, storageGet, storageSet } from '../../modules/storage/storage.js';
import { DEFAULT_TRACKS, DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';
import styles from './SetupScreen.module.css';

const TABS = ['Players', 'Track', 'Settings'];

function SetupScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [players, setPlayers]     = useState([]);

  // Read tracks and race defaults from storage so Dev Panel changes propagate
  const [tracks]       = useStorage(KEYS.TRACKS,        DEFAULT_TRACKS);
  const [raceDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);

  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [raceSettings, setRaceSettings] = useState({
    duration:  raceDefaults.duration,
    winners:   raceDefaults.winners,
    eventName: '',
  });

  // If the Dev Panel sent a group via activeGroup key, load it on mount
  useEffect(() => {
    const active = storageGet(KEYS.ACTIVE_GROUP);
    if (active && active.length > 0) {
      setPlayers(active);
      storageSet(KEYS.ACTIVE_GROUP, null); // consume once
      setActiveTab(0); // jump to Players tab to show the loaded group
    }
  }, []);

  // When defaults change in Dev Panel, apply to local settings if user hasn't overridden
  useEffect(() => {
    setRaceSettings((prev) => ({
      ...prev,
      duration: raceDefaults.duration,
      winners:  raceDefaults.winners,
    }));
  }, [raceDefaults.duration, raceDefaults.winners]);

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const canStart = players.length > 0 && selectedTrackId !== null;

  function handleStartRace() {
    // Placeholder: dispatches to server via Socket.IO in Phase 2
    console.log('Starting race', { players, selectedTrackId, raceSettings });
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
                <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                  {players.length}
                </span>
              )}
              {tab === 'Track' && selectedTrack && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--color-accent)' }}>
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
              <strong>{selectedTrack.icon} {selectedTrack.name}</strong>
            ) : (
              'No track selected'
            )}{' '}
            · <strong>{raceSettings.duration}s</strong> · Top{' '}
            <strong>{raceSettings.winners}</strong>
          </div>
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
      </main>
    </div>
  );
}

export default SetupScreen;
