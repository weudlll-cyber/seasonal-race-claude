// ============================================================
// File:        TrackManager.jsx
// Path:        client/src/screens/DevScreen/sections/TrackManager.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Full track configuration — add, edit, delete, set default
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { useServerTracksControl } from '../../../modules/storage/useServerTracks.js';
import { KEYS, newId } from '../../../modules/storage/storage.js';
import { DEFAULT_TRACKS } from '../../../modules/storage/defaults.js';
import { removeCachedTrackData } from '../../../modules/storage/trackLoader.js';
import { deleteTrackFromServer, updateTrackOnServer } from '../../../services/trackApi.js';
import {
  listAllRacerTypes,
  getRacerTypeLabel,
  getRacerType,
} from '../../../modules/racer-types/index.js';
import { listTracks, getTrack } from '../../../modules/track-editor/trackStorage.js';
import { loadRowLayoutConfig } from '../../../modules/rowLayoutConfig.js';
import { loadRaceBehaviorConfig } from '../../../modules/raceBehaviorConfig.js';
import { computeRacersPerRow, computeMaxRacersDefault } from '../../../modules/rowLayout.js';
import { EditorShape } from '../../../modules/track-editor/EditorShape.js';
import { useSurfaceClasses } from '../../../modules/surface-effects/useSurfaceClasses.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

const DURATIONS = [30, 60, 90, 120];

const BLANK = {
  name: '',
  icon: '🏁',
  description: '',
  defaultRacerTypeId: 'horse',
  geometryId: null,
  color: '#e63946',
  defaultDuration: 60,
  defaultWinners: 3,
  worldWidth: 1280,
  worldHeight: 720,
  maxRacers: null,
  maxRacersIsOverride: false,
  surfaceClasses: [],
};

// Compute the auto max-racers suggestion for a given geometry + track metadata.
// Uses actual geometric track width so large worlds get correct capacity.
function autoMaxRacers(geom, track, rowCfg) {
  if (!geom?.pathLengthPx) return null;
  const racerType = getRacerType(track.defaultRacerTypeId ?? 'horse');
  const displaySize = racerType?.config?.displaySize ?? 40;
  const rowGapPx = displaySize * (rowCfg.rowGapMultiplier ?? 1.5);
  const shape = new EditorShape(geom);
  const behaviorCfg = loadRaceBehaviorConfig();
  const effectiveWidth = (geom.width ?? shape.getActualTrackWidth()) * behaviorCfg.startSpreadRange;
  const racersPerRow = computeRacersPerRow(effectiveWidth, displaySize);
  return computeMaxRacersDefault(
    geom.pathLengthPx,
    racersPerRow,
    rowGapPx,
    rowCfg.maxCapacityFactor
  );
}

function TrackManager() {
  const navigate = useNavigate();
  const [localTracks, setTracks] = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);
  const serverTracksCtl = useServerTracksControl();
  const { classes: allSurfaceClasses } = useSurfaceClasses();
  const serverTracks = serverTracksCtl.tracks;
  const serverTrackIds = new Set(serverTracks.map((t) => t.id));
  // Combined list for display: local tracks + server tracks (server deduplicates local copies)
  const tracks = [...localTracks.filter((t) => !serverTrackIds.has(t.id)), ...serverTracks];
  const [geometries] = useState(() =>
    listTracks().map((g) => ({ ...g, effects: getTrack(g.id)?.effects ?? [] }))
  );
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [saveError, setSaveError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  async function handleSave() {
    if (!form.name.trim() || !form.icon.trim()) return;
    const { maxRacersIsOverride: _drop, ...formData } = form;
    const track = {
      ...formData,
      name: form.name.trim(),
      icon: form.icon.trim(),
      isDefault: false,
    };

    if (editId && serverTrackIds.has(editId)) {
      setSaveError(null);
      try {
        await updateTrackOnServer(editId, track);
        await serverTracksCtl.refresh();
      } catch (err) {
        setSaveError(err.message ?? 'Server-Fehler beim Speichern');
        return;
      }
    } else if (editId) {
      setTracks((prev) => prev.map((t) => (t.id === editId ? { ...t, ...track } : t)));
    } else {
      setTracks((prev) => [...prev, { id: newId(), ...track }]);
    }
    setForm(BLANK);
    setEditId(null);
    setShowForm(false);
    setSaveError(null);
  }

  function handleEdit(track) {
    const rowCfg = loadRowLayoutConfig();
    const geomId = track.geometryId ?? null;
    // Always look up full geometry from local cache — server list API strips innerPoints/outerPoints
    // (toSummary), so the server track object cannot be used directly for EditorShape.
    const geom = geomId ? geometries.find((g) => g.id === geomId) : null;
    const autoMax = autoMaxRacers(geom, track, rowCfg);
    const storedMax = track.maxRacers ?? null;
    setForm({
      name: track.name,
      icon: track.icon,
      description: track.description,
      defaultRacerTypeId: track.defaultRacerTypeId ?? track.racerTypeId ?? track.racerId ?? 'horse',
      geometryId: geomId,
      color: track.color,
      defaultDuration: track.defaultDuration,
      defaultWinners: track.defaultWinners,
      worldWidth: track.worldWidth ?? 1280,
      worldHeight: track.worldHeight ?? 720,
      maxRacers: storedMax ?? autoMax,
      maxRacersIsOverride: storedMax !== null && storedMax !== autoMax,
      surfaceClasses: Array.isArray(track.surfaceClasses) ? [...track.surfaceClasses] : [],
    });
    setEditId(track.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this track? This cannot be undone.')) return;
    setDeleteError(null);
    if (serverTrackIds.has(id)) {
      try {
        await deleteTrackFromServer(id);
        removeCachedTrackData(null, id);
        await serverTracksCtl.refresh();
      } catch (err) {
        setDeleteError(err.message ?? 'Failed to delete track');
      }
    } else {
      setTracks((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function handleOpenTrackEditor() {
    const isServer = serverTrackIds.has(editId);
    if (isServer) {
      navigate(`/track-editor?load=${editId}`);
    } else if (form.geometryId) {
      navigate(`/track-editor?load=${form.geometryId}`);
    } else {
      navigate('/track-editor');
    }
  }

  // Only one track can be the default; toggling clears all others
  function handleSetDefault(id) {
    setTracks((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })));
  }

  function handleCancel() {
    setForm(BLANK);
    setEditId(null);
    setShowForm(false);
  }

  function f(key, val) {
    if (key === 'geometryId' && val) {
      const geom = geometries.find((g) => g.id === val);
      if (geom) {
        const rowCfg = loadRowLayoutConfig();
        const autoMax = autoMaxRacers(geom, form, rowCfg);
        setForm((prev) => ({
          ...prev,
          geometryId: val,
          worldWidth: geom.worldWidth ?? prev.worldWidth,
          worldHeight: geom.worldHeight ?? prev.worldHeight,
          maxRacers: prev.maxRacersIsOverride ? prev.maxRacers : autoMax,
        }));
        return;
      }
    }
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Tracks <span className={s.badge}>{tracks.length}</span>
          </span>
          <span className={s.spacer} />
          {!showForm && (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowForm(true)}>
              + Add Track
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
          All your racing tracks. Each track has its shape (the path racers follow), some visual
          settings, and information about whether it&rsquo;s a closed loop or an open straight. You
          can edit the track&rsquo;s shape using the Track Geometry Editor.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '0.75rem',
            fontSize: '0.78rem',
            color: 'var(--color-muted)',
          }}
        >
          <span>Configured in the Track Geometry Editor:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Closed/Open
            <InfoTooltip text="Whether the track is a closed loop where racers do laps, or an open path from start to finish. Closed tracks support multi-lap races; open tracks run end-to-end once." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Laps
            <InfoTooltip text="How many laps racers complete on a closed track. Only used when the track is set to closed. Operators can override this per race during setup." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Background
            <InfoTooltip text="Optional picture displayed behind the track. To use custom background images, the local server has to be running. Without it, the track shows on a plain background." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Start
            <InfoTooltip text="Where on the track the race begins. Defined as a position along the path — you usually don't need to change this, the editor handles it." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Finish
            <InfoTooltip text="Where on the track the race ends. For closed loops this is usually the same as the start; for open tracks it's at the end of the path." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Width
            <InfoTooltip text="How wide the track is. Wider tracks let racers spread out more and overtake; narrower tracks force tighter packs." />
          </span>
        </div>

        {tracks.length === 0 ? (
          <p className={s.emptyState}>No tracks defined.</p>
        ) : (
          <div className={s.rowList}>
            {tracks.map((track) => {
              const isServerTrack = serverTrackIds.has(track.id);
              return (
                <div
                  key={track.id}
                  className={s.row}
                  style={{ borderLeft: `3px solid ${track.color}` }}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{track.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{track.name}</span>
                  <span className={s.badge}>{track.defaultDuration}s</span>
                  <span className={s.spacer} />
                  {!isServerTrack &&
                    (track.isDefault ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#f4a261',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          border: '1px solid #f4a261',
                          borderRadius: '4px',
                        }}
                      >
                        Default
                      </span>
                    ) : (
                      <button
                        className={`${s.btn} ${s.btnGhost}`}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => handleSetDefault(track.id)}
                      >
                        Set Default
                      </button>
                    ))}
                  {isServerTrack ? (
                    <>
                      <button
                        className={s.btnIconOnly}
                        onClick={() => handleEdit(track)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className={`${s.btnIconOnly} ${s.danger}`}
                        onClick={() => handleDelete(track.id)}
                        title="Delete from server"
                      >
                        🗑
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={s.btnIconOnly}
                        onClick={() => handleEdit(track)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className={`${s.btnIconOnly} ${s.danger}`}
                        onClick={() => handleDelete(track.id)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {deleteError && (
          <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
            {deleteError}
          </p>
        )}
      </div>

      {showForm && (
        <div className={s.card}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {editId ? 'Edit Track' : 'New Track'}
          </p>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Name
                <InfoTooltip text="What this track is called. Shown in race setup and in the race history." />
              </label>
              <input
                className={s.input}
                placeholder="e.g. Jungle Dash"
                maxLength={40}
                value={form.name}
                onChange={(e) => f('name', e.target.value)}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Emoji Icon</label>
              <input
                className={s.input}
                placeholder="🌴"
                maxLength={4}
                value={form.icon}
                onChange={(e) => f('icon', e.target.value)}
              />
            </div>
            <div className={s.formGroupFull}>
              <label className={s.label}>Description</label>
              <input
                className={s.input}
                placeholder="Short description shown on the track card"
                maxLength={100}
                value={form.description}
                onChange={(e) => f('description', e.target.value)}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Color</label>
              <div className={s.colorRow}>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => f('color', e.target.value)}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                />
                <input
                  className={s.input}
                  value={form.color}
                  maxLength={7}
                  onChange={(e) => f('color', e.target.value)}
                />
              </div>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Default Duration</label>
              <div className={s.optionPills}>
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    className={`${s.optionPill} ${form.defaultDuration === d ? s.optionPillActive : ''}`}
                    onClick={() => f('defaultDuration', d)}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Default Winners</label>
              <div className={s.stepper}>
                <button
                  className={s.stepperBtn}
                  disabled={form.defaultWinners <= 1}
                  onClick={() => f('defaultWinners', form.defaultWinners - 1)}
                >
                  −
                </button>
                <span className={s.stepperValue}>{form.defaultWinners}</span>
                <button
                  className={s.stepperBtn}
                  disabled={form.defaultWinners >= 5}
                  onClick={() => f('defaultWinners', form.defaultWinners + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Track Geometry
                <InfoTooltip text="The geometry of the track itself — the line racers follow. Edit this in the Track Geometry Editor by dragging control points." />
              </label>
              {editId && serverTrackIds.has(editId) ? (
                // Server track: status display + editor button (no dropdown)
                (() => {
                  const srv = serverTracks.find((t) => t.id === editId);
                  const hasGeo = srv?.geometryId != null;
                  const ptCount = (srv?.pointCount?.inner ?? 0) + (srv?.pointCount?.outer ?? 0);
                  return (
                    <>
                      <span
                        style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
                        data-testid="geometry-status"
                      >
                        {hasGeo ? `Geometry: drawn (${ptCount} pts)` : 'Geometry: not yet drawn'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        Background image and effects are managed in the Track Editor.
                      </span>
                      <button
                        className={`${s.btn} ${s.btnGhost}`}
                        onClick={handleOpenTrackEditor}
                        style={{ marginTop: '0.5rem' }}
                        data-testid="track-geometry-btn"
                        title="Open this track in the Track Geometry Editor"
                      >
                        {hasGeo ? '📐 Edit Geometry' : '✏️ Draw Geometry'}
                      </button>
                    </>
                  );
                })()
              ) : (
                // Local track (legacy): original dropdown
                <>
                  <select
                    className={s.select}
                    value={form.geometryId ?? ''}
                    onChange={(e) => f('geometryId', e.target.value || null)}
                    disabled={geometries.length === 0}
                  >
                    <option value="">
                      {geometries.length === 0
                        ? 'No tracks drawn yet — use Track Editor to create one'
                        : '— none —'}
                    </option>
                    {geometries
                      .filter((geom) => geom.id != null)
                      .map((geom) => (
                        <option key={geom.id} value={geom.id}>
                          {geom.name}
                        </option>
                      ))}
                  </select>
                  {!form.geometryId && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-muted)',
                        marginTop: '0.25rem',
                        display: 'block',
                      }}
                    >
                      No geometry yet. Go to{' '}
                      <a href="/track-editor" style={{ color: 'var(--color-accent)' }}>
                        Track Editor
                      </a>{' '}
                      to draw a track, then return here to link it.
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    Background image and effects are managed in the Track Editor.
                  </span>
                  {editId && (
                    <button
                      className={`${s.btn} ${s.btnGhost}`}
                      onClick={handleOpenTrackEditor}
                      style={{ marginTop: '0.5rem' }}
                      data-testid="track-geometry-btn"
                      title="Open this track in the Track Geometry Editor"
                    >
                      {form.geometryId ? '📐 Edit Geometry' : '✏️ Draw Geometry'}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Default Racer Type</label>
              <select
                className={s.select}
                value={form.defaultRacerTypeId}
                onChange={(e) => f('defaultRacerTypeId', e.target.value)}
              >
                {listAllRacerTypes().map(({ id }) => (
                  <option key={id} value={id}>
                    {getRacerTypeLabel(id)}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.formGroupFull}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Surface Classes
                <InfoTooltip text="The kind of surface the track has — affects dust, particles, and other visual effects. See the Surface Classes section to define new ones." />
              </label>
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}
                data-testid="track-surface-class-pills"
              >
                {allSurfaceClasses.map((cls) => {
                  const active = form.surfaceClasses.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        const next = active
                          ? form.surfaceClasses.filter((c) => c !== cls.id)
                          : [...form.surfaceClasses, cls.id];
                        f('surfaceClasses', next);
                      }}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '99px',
                        cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--color-primary, #4488ff)' : 'rgba(255,255,255,0.15)'}`,
                        background: active ? 'rgba(68,136,255,0.18)' : 'transparent',
                        color: active ? 'var(--color-primary, #4488ff)' : 'var(--color-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cls.label}
                    </button>
                  );
                })}
              </div>
              {form.surfaceClasses.length === 0 && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#ef4444',
                    marginTop: '0.25rem',
                    display: 'block',
                  }}
                >
                  At least one surface class is required
                </span>
              )}
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>World Dimensions</label>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                {(editId && serverTrackIds.has(editId)) || form.geometryId
                  ? `${form.worldWidth}×${form.worldHeight} px`
                  : '— (Choose Geometry)'}
              </span>
            </div>

            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Max Racers
                {form.maxRacersIsOverride && (
                  <span
                    className={s.badge}
                    style={{ background: 'rgba(244,162,97,0.2)', color: '#f4a261' }}
                  >
                    modified
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input
                  type="number"
                  className={s.input}
                  aria-label="Max Racers"
                  min={1}
                  max={500}
                  step={1}
                  placeholder={
                    (editId && serverTrackIds.has(editId)) || form.geometryId
                      ? 'auto'
                      : 'set geometry first'
                  }
                  value={form.maxRacers ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) {
                      setForm((prev) => ({ ...prev, maxRacers: v, maxRacersIsOverride: true }));
                    } else if (e.target.value === '') {
                      setForm((prev) => ({ ...prev, maxRacers: null, maxRacersIsOverride: false }));
                    }
                  }}
                />
                {form.maxRacersIsOverride && form.geometryId && (
                  <button
                    className={`${s.btn} ${s.btnGhost}`}
                    style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      const geom = geometries.find((g) => g.id === form.geometryId);
                      if (!geom?.pathLengthPx) return;
                      const rowCfg = loadRowLayoutConfig();
                      const autoMax = autoMaxRacers(geom, form, rowCfg);
                      setForm((prev) => ({
                        ...prev,
                        maxRacers: autoMax,
                        maxRacersIsOverride: false,
                      }));
                    }}
                  >
                    Reset to auto
                  </button>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-muted)',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                {form.maxRacers
                  ? `Setup shows a warning above ${form.maxRacers} players${form.maxRacersIsOverride ? ' (manual override)' : ' (auto)'}`
                  : 'No limit set — auto-computed when geometry is selected.'}
              </span>
            </div>
          </div>
          {saveError && (
            <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
              {saveError}
            </p>
          )}
          <div className={s.btnRow} style={{ marginTop: '0.75rem' }}>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={handleSave}
              disabled={!form.name.trim() || !form.icon.trim() || form.surfaceClasses.length === 0}
              title={
                form.surfaceClasses.length === 0
                  ? 'At least one surface class is required'
                  : undefined
              }
            >
              {editId ? 'Save Changes' : 'Add Track'}
            </button>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackManager;
