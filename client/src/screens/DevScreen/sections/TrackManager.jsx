// ============================================================
// File:        TrackManager.jsx
// Path:        client/src/screens/DevScreen/sections/TrackManager.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Full track configuration — add, edit, delete, set default
// ============================================================

import { useState } from 'react';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS, newId } from '../../../modules/storage/storage.js';
import { DEFAULT_TRACKS, DEFAULT_RACERS } from '../../../modules/storage/defaults.js';
import { RACER_TYPE_IDS, RACER_TYPE_LABELS } from '../../../modules/racer-types/index.js';
import { listTracks } from '../../../modules/track-editor/trackStorage.js';
import s from '../DevScreen.module.css';

const DURATIONS = [30, 60, 90, 120];

const TRACK_WIDTHS = [100, 140, 200, 280, 360];

const BLANK = {
  name: '',
  icon: '',
  description: '',
  racerId: '',
  racerTypeId: 'horse',
  geometryId: null,
  color: '#e63946',
  defaultDuration: 60,
  defaultWinners: 3,
  trackWidth: 140,
};

function TrackManager() {
  const [tracks, setTracks] = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);
  const [racers] = useStorage(KEYS.RACERS, DEFAULT_RACERS);
  const [geometries] = useState(() => listTracks());
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function handleSave() {
    if (!form.name.trim() || !form.icon.trim()) return;
    const track = {
      ...form,
      name: form.name.trim(),
      icon: form.icon.trim(),
      isDefault: false,
    };

    if (editId) {
      setTracks((prev) => prev.map((t) => (t.id === editId ? { ...t, ...track } : t)));
    } else {
      setTracks((prev) => [...prev, { id: newId(), ...track }]);
    }
    setForm(BLANK);
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(track) {
    setForm({
      name: track.name,
      icon: track.icon,
      description: track.description,
      racerId: track.racerId,
      racerTypeId: track.racerTypeId || track.racerId || 'horse',
      geometryId: track.geometryId ?? null,
      color: track.color,
      defaultDuration: track.defaultDuration,
      defaultWinners: track.defaultWinners,
      trackWidth: track.trackWidth ?? 140,
    });
    setEditId(track.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this track? This cannot be undone.')) return;
    setTracks((prev) => prev.filter((t) => t.id !== id));
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
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
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

        {tracks.length === 0 ? (
          <p className={s.emptyState}>No tracks defined.</p>
        ) : (
          <div className={s.rowList}>
            {tracks.map((track) => {
              const racer = racers.find((r) => r.id === track.racerId);
              return (
                <div
                  key={track.id}
                  className={s.row}
                  style={{ borderLeft: `3px solid ${track.color}` }}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{track.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{track.name}</span>
                  {racer && (
                    <span className={s.badge}>
                      {racer.icon} {racer.name}
                    </span>
                  )}
                  <span className={s.badge}>{track.defaultDuration}s</span>
                  <span className={s.spacer} />
                  {track.isDefault ? (
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
                  )}
                  <button className={s.btnIconOnly} onClick={() => handleEdit(track)} title="Edit">
                    ✏️
                  </button>
                  <button
                    className={`${s.btnIconOnly} ${s.danger}`}
                    onClick={() => handleDelete(track.id)}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className={s.card}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {editId ? 'Edit Track' : 'New Track'}
          </p>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.label}>Name</label>
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
              <label className={s.label}>Associated Racer</label>
              <select
                className={s.select}
                value={form.racerId}
                onChange={(e) => f('racerId', e.target.value)}
              >
                <option value="">— none —</option>
                {racers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.icon} {r.name}
                  </option>
                ))}
              </select>
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
              <label className={s.label}>Track Geometry</label>
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
                {geometries.map((geom) => (
                  <option key={geom.id} value={geom.id}>
                    {geom.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Racer Type</label>
              <select
                className={s.select}
                value={form.racerTypeId}
                onChange={(e) => f('racerTypeId', e.target.value)}
              >
                {RACER_TYPE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {RACER_TYPE_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Track Width (px)</label>
              <div className={s.optionPills}>
                {TRACK_WIDTHS.map((w) => (
                  <button
                    key={w}
                    className={`${s.optionPill} ${form.trackWidth === w ? s.optionPillActive : ''}`}
                    onClick={() => f('trackWidth', w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={s.btnRow} style={{ marginTop: '0.75rem' }}>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={handleSave}
              disabled={!form.name.trim() || !form.icon.trim()}
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
