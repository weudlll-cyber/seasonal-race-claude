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
import { useServerTracks } from '../../modules/storage/useServerTracks.js';
import { KEYS, storageGet, storageSet } from '../../modules/storage/storage.js';
import { DEFAULT_TRACKS, DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';
import {
  getRacerType,
  RACER_TYPE_IDS,
  RACER_TYPE_LABELS,
  listAllRacerTypes,
} from '../../modules/racer-types/index.js';
import { filterRacerTypesForTrack } from '../../modules/surface-effects/registry.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import {
  estimatedSecondsPerLap,
  lapsFromDuration,
  openTrackDurationRange,
} from '../../modules/camera/lapUtils.js';
import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { computeRacersPerRow } from '../../modules/rowLayout.js';
import { loadRaceBehaviorConfig } from '../../modules/raceBehaviorConfig.js';
import styles from './SetupScreen.module.css';

const TABS = ['Players', 'Track', 'Settings'];

const QUICK_TEST_NAMES = [
  'Turbo',
  'Blaze',
  'Rocket',
  'Flash',
  'Speedy',
  'Thunder',
  'Nitro',
  'Drift',
  'Bolt',
  'Zephyr',
  'Storm',
  'Comet',
  'Arrow',
  'Blitz',
  'Apex',
  'Ridge',
  'Flare',
  'Surge',
  'Dash',
  'Nova',
];
const QUICK_TEST_TARGET = 20;

function SetupScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Read tracks and defaults from storage so Dev Panel changes propagate
  const [storedTracks] = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);
  const [racerTypeOverrides] = useStorage(KEYS.RACER_TYPE_OVERRIDES, {});
  const serverTracks = useServerTracks();

  // Ensure all DEFAULT_TRACKS entries exist with current fields (handles stale localStorage).
  // Server tracks are merged last so they override any local copy of the same ID.
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
          worldHeight: existing.worldHeight ?? d.worldHeight,
        });
      }
    }
    for (const st of serverTracks) {
      byId.set(st.id, st);
    }
    return Array.from(byId.values());
  })();
  const [raceDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);

  // Consume any group loaded from the Dev Panel (one-shot read + clear).
  // useEffect instead of lazy initializer: StrictMode double-invokes initializers,
  // clearing storage on the first call so the second finds nothing.
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    const active = storageGet(KEYS.ACTIVE_GROUP);
    if (active && active.length > 0) {
      storageSet(KEYS.ACTIVE_GROUP, null);
      setPlayers(active);
    }
  }, []);

  const [behaviorConfig] = useState(() => loadRaceBehaviorConfig());

  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [racerTypeOverride, setRacerTypeOverride] = useState(null);
  const [selectedLaps, setSelectedLaps] = useState(null); // null = auto (from duration)
  const [openTrackDuration, setOpenTrackDuration] = useState(null); // null = set from track default
  const [closedTrackDuration, setClosedTrackDuration] = useState(null); // null = auto from laps

  useEffect(() => {
    setRacerTypeOverride(null);
    setSelectedLaps(null);
    setOpenTrackDuration(null);
    setClosedTrackDuration(null);
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

  // Filter racer types to those compatible with the selected track's surface classes.
  // Types with empty surfaceClasses are always included (Heimat-Trail fallback).
  const filteredRacerTypeIds = useMemo(() => {
    const activeIds = RACER_TYPE_IDS.filter((id) => racerTypeOverrides[id] !== false);
    if (!selectedTrack?.surfaceClasses?.length) return activeIds;
    const allTypes = listAllRacerTypes().filter((t) => t.isActive);
    const filtered = filterRacerTypesForTrack(allTypes, selectedTrack.surfaceClasses, (id) =>
      getRacerType(id).getSurfaceClasses()
    );
    return filtered.map((t) => t.id);
  }, [selectedTrack, racerTypeOverrides]);

  // Clear override if it's no longer compatible with the selected track's surface classes.
  useEffect(() => {
    if (racerTypeOverride && filteredRacerTypeIds.length > 0) {
      if (!filteredRacerTypeIds.includes(racerTypeOverride)) {
        setRacerTypeOverride(null);
      }
    }
  }, [filteredRacerTypeIds, racerTypeOverride]);

  // Track's surface classes as readable labels for the hint.
  const trackSurfaceLabel = useMemo(() => {
    if (!selectedTrack?.surfaceClasses?.length) return null;
    return selectedTrack.surfaceClasses
      .map((id) => id.charAt(0).toUpperCase() + id.slice(1))
      .join(', ');
  }, [selectedTrack]);

  // D7c: row-start hints — racersPerRow from actual geometry so large worlds are correct.
  // Uses effectiveWidth = geometricWidth × startSpreadRange (matches RaceScreen formula).
  const geometricRacersPerRow = useMemo(() => {
    if (!selectedTrack?.geometryId) return 8;
    const geom = getTrack(selectedTrack.geometryId);
    if (!geom) return 8;
    const shape = new EditorShape(geom);
    const racerType = getRacerType(selectedTrack.defaultRacerTypeId ?? 'horse');
    const displaySize = racerType?.config?.displaySize ?? 40;
    const effectiveWidth = shape.getActualTrackWidth() * behaviorConfig.startSpreadRange;
    return computeRacersPerRow(effectiveWidth, displaySize);
  }, [selectedTrack, behaviorConfig]);

  const rowLayoutHints = useMemo(() => {
    const racersPerRow = geometricRacersPerRow;
    const totalRows = players.length > 0 ? Math.ceil(players.length / racersPerRow) : 1;
    const showRowHint = players.length > racersPerRow;
    const maxRacers = selectedTrack?.maxRacers ?? null;
    const showCapacityWarn = maxRacers !== null && players.length > maxRacers;
    return { racersPerRow, totalRows, showRowHint, maxRacers, showCapacityWarn };
  }, [players.length, selectedTrack, geometricRacersPerRow]);

  // Detect open/closed from the geometry's closed flag directly (isOpen = !closed)
  const trackIsOpen = useMemo(() => {
    if (!selectedTrack?.geometryId) return false;
    const geom = getTrack(selectedTrack.geometryId);
    return geom ? !geom.closed : false;
  }, [selectedTrack]);

  // Duration slider range for open tracks — derived from track physics (pathLengthPx)
  const openTrackSliderRange = useMemo(() => {
    if (!trackIsOpen || !selectedTrack?.geometryId) return null;
    const geom = getTrack(selectedTrack.geometryId);
    if (!geom) return null;
    const pathLengthPx = geom.pathLengthPx ?? 0;
    if (!pathLengthPx) return null;
    const baseSpeedConfig = loadBaseSpeedConfig();
    const racerType = getRacerType(
      racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
    );
    const speedMultiplier = racerType?.getSpeedMultiplier() ?? 1.0;
    const range = openTrackDurationRange(
      pathLengthPx,
      baseSpeedConfig,
      speedMultiplier,
      behaviorConfig.runoutZone
    );
    return range;
  }, [trackIsOpen, selectedTrack, racerTypeOverride, behaviorConfig.runoutZone]);

  // Effective open-track duration: user-selected value clamped to [min, max], or 65% of max as default
  const effectiveOpenTrackDuration = useMemo(() => {
    if (!openTrackSliderRange) return raceSettings.duration;
    const { min, max } = openTrackSliderRange;
    if (openTrackDuration === null) return Math.max(min, Math.min(max, Math.round(max * 0.65)));
    return Math.max(min, Math.min(max, openTrackDuration));
  }, [openTrackDuration, openTrackSliderRange, raceSettings.duration]);

  // Closed-track duration slider: range based on laps × natural pace, default = natural duration.
  // Model D: lap-picker change resets duration to auto; duration-slider change overrides it.
  const closedTrackSliderRange = useMemo(() => {
    if (!selectedTrack || trackIsOpen) return null;
    const effectiveLaps = selectedLaps ?? lapsFromDuration(raceSettings.duration);
    const racerType = getRacerType(
      racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
    );
    const speedMultiplier = racerType?.getSpeedMultiplier() ?? 1.0;
    const naturalDuration = Math.round(estimatedSecondsPerLap(speedMultiplier) * effectiveLaps);
    return {
      min: Math.max(15, Math.round(naturalDuration * 0.3)),
      max: Math.round(naturalDuration * 5),
      natural: naturalDuration,
    };
  }, [selectedLaps, selectedTrack, racerTypeOverride, raceSettings.duration, trackIsOpen]);

  // Effective closed-track duration: user override clamped to range, or natural duration.
  const effectiveClosedDuration = useMemo(() => {
    if (!closedTrackSliderRange) return raceSettings.duration;
    const { min, max, natural } = closedTrackSliderRange;
    if (closedTrackDuration === null) return natural;
    return Math.max(min, Math.min(max, closedTrackDuration));
  }, [closedTrackDuration, closedTrackSliderRange, raceSettings.duration]);

  // Track selected for Quick Test (defaults to first track)
  const [quickTrackId, setQuickTrackId] = useState(null);
  const quickTrack = tracks.find((t) => t.id === (quickTrackId ?? tracks[0]?.id)) ?? tracks[0];

  function handleStartRace() {
    const preferredId = racerTypeOverride ?? selectedTrack?.defaultRacerTypeId ?? 'horse';
    const effectiveTypeId = filteredRacerTypeIds.includes(preferredId)
      ? preferredId
      : (filteredRacerTypeIds[0] ?? preferredId);
    const effectiveLaps = selectedLaps ?? lapsFromDuration(raceSettings.duration);
    const race = {
      racers: players,
      trackId: selectedTrackId,
      trackName: selectedTrack?.name,
      geometryId: selectedTrack?.geometryId ?? null,
      racerTypeId: effectiveTypeId,
      worldWidth: selectedTrack?.worldWidth ?? 1280,
      worldHeight: selectedTrack?.worldHeight ?? 720,
      duration: raceSettings.duration,
      eventName: raceSettings.eventName,
      winners: raceSettings.winners,
      raceMode: trackIsOpen ? 'time' : 'laps',
      targetLaps: trackIsOpen ? undefined : effectiveLaps,
      targetDuration: trackIsOpen ? effectiveOpenTrackDuration : effectiveClosedDuration,
      trackSurfaceClasses: selectedTrack?.surfaceClasses ?? [],
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

    const needed = Math.max(0, QUICK_TEST_TARGET - players.length);
    const existingNames = new Set(players.map((p) => p.name));
    const fillNames = QUICK_TEST_NAMES.filter((n) => !existingNames.has(n)).slice(0, needed);
    const testPlayers = [...players, ...fillNames.map((name) => ({ name }))];

    const quickLaps = lapsFromDuration(raceDefaults.duration);
    const quickRacerType = getRacerType(effectiveTypeId);
    const quickSpeedMultiplier = quickRacerType?.getSpeedMultiplier() ?? 1.0;
    const quickClosedDuration = Math.round(
      estimatedSecondsPerLap(quickSpeedMultiplier) * quickLaps
    );
    const race = {
      racers: testPlayers,
      trackId: track.id,
      trackName: track.name,
      geometryId: track.geometryId ?? null,
      racerTypeId: effectiveTypeId,
      worldWidth: track.worldWidth ?? 1280,
      worldHeight: track.worldHeight ?? 720,
      duration: raceDefaults.duration,
      eventName: 'Quick Test',
      winners: raceDefaults.winners,
      raceMode: quickIsOpen ? 'time' : 'laps',
      targetLaps: quickIsOpen ? undefined : quickLaps,
      targetDuration: quickIsOpen ? raceDefaults.duration : quickClosedDuration,
      trackSurfaceClasses: track.surfaceClasses ?? [],
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
              <PlayerSetup
                players={players}
                onChange={setPlayers}
                maxPlayers={raceDefaults.maxPlayers ?? 20}
              />
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
                      value={
                        filteredRacerTypeIds.includes(
                          racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                        )
                          ? (racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse')
                          : (filteredRacerTypeIds[0] ?? 'horse')
                      }
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
                      {filteredRacerTypeIds.map((id) => (
                        <option key={id} value={id}>
                          {RACER_TYPE_LABELS[id]}
                          {id === (selectedTrack.defaultRacerTypeId ?? 'horse') ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                    {trackSurfaceLabel && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--color-muted)',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                        data-testid="track-surface-hint"
                      >
                        Surface: {trackSurfaceLabel}
                      </span>
                    )}
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
                        Race Duration
                      </label>
                      {openTrackSliderRange ? (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--color-muted)',
                                minWidth: '3.5rem',
                              }}
                            >
                              Total race duration
                            </span>
                            <input
                              data-testid="open-track-duration-slider"
                              type="range"
                              min={openTrackSliderRange.min}
                              max={openTrackSliderRange.max}
                              value={effectiveOpenTrackDuration}
                              onChange={(e) => setOpenTrackDuration(Number(e.target.value))}
                              style={{
                                flex: 1,
                                cursor: 'pointer',
                                accentColor: 'var(--color-accent)',
                              }}
                              title="Choose total race duration. Range derived from track physics. Race ends when leader crosses finish point."
                            />
                            <span
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--color-text)',
                                minWidth: '2.5rem',
                                textAlign: 'right',
                              }}
                            >
                              {effectiveOpenTrackDuration}s
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.72rem',
                              color: 'var(--color-muted)',
                            }}
                          >
                            <span>Min: {openTrackSliderRange.min}s</span>
                            <span data-testid="open-track-estimated-duration">
                              Estimated duration: {effectiveOpenTrackDuration}s
                            </span>
                            <span>Max: {openTrackSliderRange.max}s</span>
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                          Draw a track geometry to unlock duration settings.
                        </span>
                      )}
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
                        Laps &amp; Duration
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
                              onClick={() => {
                                setSelectedLaps(n === auto && selectedLaps === null ? null : n);
                                setClosedTrackDuration(null); // Model D: lap change resets duration to auto
                              }}
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
                      </div>
                      {closedTrackSliderRange && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '0.5rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--color-muted)',
                              minWidth: '3.5rem',
                            }}
                          >
                            Race duration
                          </span>
                          <input
                            data-testid="closed-track-duration-slider"
                            type="range"
                            min={closedTrackSliderRange.min}
                            max={closedTrackSliderRange.max}
                            value={effectiveClosedDuration}
                            onChange={(e) => setClosedTrackDuration(Number(e.target.value))}
                            style={{
                              flex: 1,
                              cursor: 'pointer',
                              accentColor: 'var(--color-accent)',
                            }}
                            title="Adjust race duration. Lap count stays fixed; race speed adapts."
                          />
                          <span
                            style={{
                              fontSize: '0.85rem',
                              color: 'var(--color-text)',
                              minWidth: '2.5rem',
                              textAlign: 'right',
                            }}
                          >
                            {effectiveClosedDuration}s
                          </span>
                        </div>
                      )}
                      <span
                        data-testid="closed-track-estimated-duration"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        * auto · Estimated duration: {effectiveClosedDuration}s
                      </span>
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
          {rowLayoutHints.showRowHint && (
            <div
              data-testid="row-start-hint"
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-muted)',
                padding: '0.2rem 0',
              }}
            >
              ℹ️ {players.length} players will start in {rowLayoutHints.totalRows} rows
            </div>
          )}
          {rowLayoutHints.showCapacityWarn && (
            <div
              data-testid="capacity-warning"
              style={{
                fontSize: '0.78rem',
                color: '#f4a261',
                padding: '0.2rem 0',
              }}
            >
              ⚠️ This track recommends a maximum of {rowLayoutHints.maxRacers} racers — you have{' '}
              {players.length}. The race will still start but may feel cramped.
            </div>
          )}
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
                ·{' '}
                <strong>{trackIsOpen ? effectiveOpenTrackDuration : raceSettings.duration}s</strong>
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
                    ? 'Auto-fill to 20 test players and start race'
                    : 'Draw a track in the Track Editor first'
                }
              >
                ⚡ Quick Test (20)
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
