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
  const [storedTracks] = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);

  // Ensure all DEFAULT_TRACKS entries exist with current fields (handles stale localStorage).
  // Defaults provide a base shape so any new DEFAULT_TRACKS fields appear
  // for older stored tracks. Stored values override defaults — user edits
  // in Dev-Panel always win. (Earlier code had this reversed; default
  // racerTypeId was clobbering stored 'duck' choices. Fixed in W1.)
  const tracks = (() => {
    const base = Array.isArray(storedTracks) ? storedTracks : DEFAULT_TRACKS;
    const byId = new Map(base.map((t) => [t.id, t]));
    for (const d of DEFAULT_TRACKS) {
      if (!byId.has(d.id)) {
        byId.set(d.id, d);
      } else {
        const existing = byId.get(d.id);
        byId.set(d.id, {
          ...d, // defaults provide a base (covers any new fields added later)
          ...existing, // stored values override defaults
        });
      }
    }
    return Array.from(byId.values());
  })();
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
  const canStart = players.length > 0 && selectedTrackId !== null && !!selectedTrack?.geometryId;

  // Track selected for Quick Test (defaults to first track)
  const [quickTrackId, setQuickTrackId] = useState(null);
  const quickTrack = tracks.find((t) => t.id === (quickTrackId ?? tracks[0]?.id)) ?? tracks[0];

  function handleStartRace() {
    const race = {
      racers: players,
      trackId: selectedTrackId,
      trackName: selectedTrack?.name,
      geometryId: selectedTrack?.geometryId ?? null,
      racerTypeId: selectedTrack?.racerTypeId || selectedTrack?.racerId || 'horse',
      duration: raceSettings.duration,
      eventName: raceSettings.eventName,
      winners: raceSettings.winners,
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem('activeRace', JSON.stringify(race));
    navigate('/race');
  }

  function handleQuickTest() {
    const track = quickTrack;
    if (!track || !track.geometryId) return;

    // 6 test players — icon matches the track's racer type
    const trackIcon = track.racerTypeId
      ? ({ horse: '🐴', duck: '🦆', rocket: '🚀', snail: '🐌', car: '🚗' }[track.racerTypeId] ??
        DEFAULT_RACERS[0].icon)
      : DEFAULT_RACERS[0].icon;
    const testPlayers = Array.from({ length: 6 }, (_, i) => ({
      name: `Player ${i + 1}`,
      racerId: track.racerTypeId ?? DEFAULT_RACERS[i % DEFAULT_RACERS.length].id,
      color: DEFAULT_RACERS[i % DEFAULT_RACERS.length].color,
      icon: trackIcon,
    }));

    const race = {
      racers: testPlayers,
      trackId: track.id,
      trackName: track.name,
      geometryId: track.geometryId ?? null,
      racerTypeId: track.racerTypeId || 'horse',
      duration: raceDefaults.duration,
      eventName: 'Quick Test',
      winners: raceDefaults.winners,
      timestamp: new Date().toISOString(),
    };

    sessionStorage.setItem('activeRace', JSON.stringify(race));
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'flex-start',
              }}
            >
              {/* Track switcher for Quick Test */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setQuickTrackId(t.id)}
                    title={t.name}
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      border: `1px solid ${(quickTrack?.id ?? tracks[0]?.id) === t.id ? t.color : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: '4px',
                      background:
                        (quickTrack?.id ?? tracks[0]?.id) === t.id ? `${t.color}33` : 'transparent',
                      color: (quickTrack?.id ?? tracks[0]?.id) === t.id ? t.color : '#aaa',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
              <button
                className={styles.quickTestBtn}
                onClick={handleQuickTest}
                disabled={!quickTrack?.geometryId}
                title={
                  quickTrack?.geometryId
                    ? 'Auto-fill 6 test players and start race'
                    : 'Draw a track in the Track Editor first'
                }
              >
                ⚡ Quick Test
              </button>
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
        </div>
      </main>
    </div>
  );
}

export default SetupScreen;
