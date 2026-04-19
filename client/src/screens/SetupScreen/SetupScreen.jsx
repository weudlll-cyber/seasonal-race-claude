// ============================================================
// File:        SetupScreen.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Pre-race setup screen — players, track selection, and settings;
//              the Game Master configures everything here before launching
// ============================================================

import React, { useState } from 'react';
import PlayerSetup from './PlayerSetup.jsx';
import TrackSelector, { TRACKS } from './TrackSelector.jsx';
import RaceSettings from './RaceSettings.jsx';
import styles from './SetupScreen.module.css';

const TABS = ['Players', 'Track', 'Settings'];

const DEFAULT_SETTINGS = {
  duration: 60,
  winners: 3,
  eventName: '',
};

function SetupScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [players, setPlayers] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [raceSettings, setRaceSettings] = useState(DEFAULT_SETTINGS);

  const selectedTrack = TRACKS.find((t) => t.id === selectedTrackId);
  const canStart = players.length > 0 && selectedTrackId !== null;

  function handleStartRace() {
    // Placeholder: will dispatch to server via Socket.IO in Phase 2
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
              {/* Badges indicating current state */}
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

        {/* Start bar — always visible at bottom */}
        <div className={styles.startBar}>
          <div className={styles.startSummary}>
            <strong>{players.length}</strong> player{players.length !== 1 ? 's' : ''} ·{' '}
            {selectedTrack ? (
              <>
                <strong>{selectedTrack.icon} {selectedTrack.name}</strong>
              </>
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
