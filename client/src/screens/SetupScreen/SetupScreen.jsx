// ============================================================
// File:        SetupScreen.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Pre-race setup screen — players, track selection, settings;
//              reads tracks and defaults from localStorage so Dev Panel
//              changes are reflected immediately
// ============================================================

import { useState, useEffect, useMemo } from 'react';
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
import {
  getRacerType,
  RACER_TYPE_IDS,
  RACER_TYPE_LABELS,
} from '../../modules/racer-types/index.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import {
  estimatedSecondsPerLap,
  openTrackFinishT,
  lapsFromDuration,
} from '../../modules/camera/lapUtils.js';
import styles from './SetupScreen.module.css';

const TABS = ['Players', 'Track', 'Settings'];

function SetupScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Read tracks and defaults from storage so Dev Panel changes propagate
  const [storedTracks] = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);
  const [racerTypeOverrides] = useStorage(KEYS.RACER_TYPE_OVERRIDES, {});

  // Ensure all DEFAULT_TRACKS entries exist with current fields (handles stale localStorage).
  const tracks = (() => {
    const base = Array.isArray(storedTracks) ? storedTracks : DEFAULT_TRACKS;
    const byId = new Map(base.map((t) => [t.id, t]));
    for (const d of DEFAULT_TRACKS) {
      if (!byId.has(d.id)) {
        byId.set(d.id, d);
      } else {
        const existing = byId.get(d.id);
        byId.set(d.id, {
          ...d,
          ...existing,
          // Prefer stored new field, fall back through legacy field names for old localStorage data
          defaultRacerTypeId:
            existing.defaultRacerTypeId ??
            existing.racerTypeId ??
            existing.racerId ??
            d.defaultRacerTypeId,
          worldWidth: existing.worldWidth ?? d.worldWidth,
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
  const [racerTypeOverride, setRacerTypeOverride] = useState(null);
  const [selectedLaps, setSelectedLaps] = useState(null); // null = auto (from duration)

  useEffect(() => {
    setRacerTypeOverride(null);
    setSelectedLaps(null);
  }, [selectedTrackId]);

  // Clear override if the chosen type gets disabled while it's selected.
  useEffect(() => {
    if (racerTypeOverride && racerTypeOverrides[racerTypeOverride] === false) {
      setRacerTypeOverride(null);
    }
  }, [racerTypeOverrides, racerTypeOverride]);

  // Initialise race settings from stored defaults; user may override during the session
  const [raceSettings, setRaceSettings] = useState({
    duration: raceDefaults.duration,
    winners: raceDefaults.winners,
    eventName: '',
  });

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const canStart = players.length > 0 && selectedTrackId !== null && !!selectedTrack?.geometryId;

  // Detect open/closed from the geometry's closed flag directly (isOpen = !closed)
  const trackIsOpen = useMemo(() => {
    if (!selectedTrack?.geometryId) return false;
    const geom = getTrack(selectedTrack.geometryId);
    return geom ? !geom.closed : false;
  }, [selectedTrack]);

  // Track selected for Quick Test (defaults to first track)
  const [quickTrackId, setQuickTrackId] = useState(null);
  const quickTrack = tracks.find((t) => t.id === (quickTrackId ?? tracks[0]?.id)) ?? tracks[0];

  function handleStartRace() {
    const effectiveTypeId = racerTypeOverride ?? selectedTrack?.defaultRacerTypeId ?? 'horse';
    const effectiveLaps = selectedLaps ?? lapsFromDuration(raceSettings.duration);
    const race = {
      racers: players,
      trackId: selectedTrackId,
      trackName: selectedTrack?.name,
      geometryId: selectedTrack?.geometryId ?? null,
      racerTypeId: effectiveTypeId,
      worldWidth: selectedTrack?.worldWidth ?? 1280,
      duration: raceSettings.duration,
      eventName: raceSettings.eventName,
      winners: raceSettings.winners,
      raceMode: trackIsOpen ? 'time' : 'laps',
      targetLaps: trackIsOpen ? undefined : effectiveLaps,
      targetDuration: trackIsOpen ? raceSettings.duration : undefined,
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem('activeRace', JSON.stringify(race));
    navigate('/race');
  }

  function handleQuickTest() {
    const track = quickTrack;
    if (!track || !track.geometryId) return;

    const quickIsOpen = (() => {
      const geom = getTrack(track.geometryId);
      return geom ? !geom.closed : false;
    })();
    const defaultTypeId = track.defaultRacerTypeId || 'horse';
    const effectiveTypeId = racerTypeOverride ?? defaultTypeId;
    const trackIcon = getRacerType(effectiveTypeId).getEmoji();
    const testPlayers = Array.from({ length: 6 }, (_, i) => ({
      name: `Player ${i + 1}`,
      color: DEFAULT_RACERS[i % DEFAULT_RACERS.length].color,
      icon: trackIcon,
    }));

    const quickLaps = lapsFromDuration(raceDefaults.duration);
    const race = {
      racers: testPlayers,
      trackId: track.id,
      trackName: track.name,
      geometryId: track.geometryId ?? null,
      racerTypeId: effectiveTypeId,
      worldWidth: track.worldWidth ?? 1280,
      duration: raceDefaults.duration,
      eventName: 'Quick Test',
      winners: raceDefaults.winners,
      raceMode: quickIsOpen ? 'time' : 'laps',
      targetLaps: quickIsOpen ? undefined : quickLaps,
      targetDuration: quickIsOpen ? raceDefaults.duration : undefined,
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
                  {getRacerType(
                    racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                  ).getEmoji()}
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
              {selectedTrack && (
                <div
                  style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-muted)',
                        display: 'block',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Racer type for this race
                    </label>
                    <select
                      value={racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRacerTypeOverride(
                          val === (selectedTrack.defaultRacerTypeId ?? 'horse') ? null : val
                        );
                      }}
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '4px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {RACER_TYPE_IDS.filter((id) => racerTypeOverrides[id] !== false).map((id) => (
                        <option key={id} value={id}>
                          {RACER_TYPE_LABELS[id]}
                          {id === (selectedTrack.defaultRacerTypeId ?? 'horse') ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {trackIsOpen ? (
                    <div>
                      <label
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-muted)',
                          display: 'block',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Race duration (set in Settings tab)
                      </label>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                        {raceSettings.duration}s — open track, finish line placed at{' '}
                        {Math.round(
                          openTrackFinishT(
                            raceSettings.duration,
                            getRacerType(
                              racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                            ).getSpeedMultiplier()
                          ) * 100
                        )}
                        % of track
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-muted)',
                          display: 'block',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Laps
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {[1, 2, 3, 4].map((n) => {
                          const auto = lapsFromDuration(raceSettings.duration);
                          const isSelected = (selectedLaps ?? auto) === n;
                          const secs = Math.round(
                            estimatedSecondsPerLap(
                              getRacerType(
                                racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                              ).getSpeedMultiplier()
                            ) * n
                          );
                          return (
                            <button
                              key={n}
                              onClick={() =>
                                setSelectedLaps(n === auto && selectedLaps === null ? null : n)
                              }
                              title={`~${secs}s estimated`}
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.85rem',
                                border: `1px solid ${isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)'}`,
                                borderRadius: '4px',
                                background: isSelected
                                  ? 'rgba(var(--color-accent-rgb, 68,136,255),0.18)'
                                  : 'transparent',
                                color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              {n}
                              {n === auto ? '*' : ''}
                            </button>
                          );
                        })}
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-muted)',
                            marginLeft: '0.25rem',
                          }}
                        >
                          * auto from duration · ~
                          {Math.round(
                            estimatedSecondsPerLap(
                              getRacerType(
                                racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                              ).getSpeedMultiplier()
                            ) * (selectedLaps ?? lapsFromDuration(raceSettings.duration))
                          )}
                          s est.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                {getRacerType(
                  racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                ).getEmoji()}{' '}
                {selectedTrack.name}
              </strong>
            ) : (
              'No track selected'
            )}{' '}
            {selectedTrack && !trackIsOpen ? (
              <>
                {' '}
                ·{' '}
                <strong>
                  {selectedLaps ?? lapsFromDuration(raceSettings.duration)} lap
                  {(selectedLaps ?? lapsFromDuration(raceSettings.duration)) !== 1 ? 's' : ''}
                </strong>
              </>
            ) : (
              <>
                {' '}
                · <strong>{raceSettings.duration}s</strong>
              </>
            )}{' '}
            · Top <strong>{raceSettings.winners}</strong>
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
                    {getRacerType(t.defaultRacerTypeId ?? 'horse').getEmoji()} {t.name}
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
