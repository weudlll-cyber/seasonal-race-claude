// ============================================================
// File:        RacerManager.jsx
// Path:        client/src/screens/DevScreen/sections/RacerManager.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Manage racer types — add, edit, delete, enable/disable per track
// ============================================================

import { useState } from 'react';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS, newId } from '../../../modules/storage/storage.js';
import { DEFAULT_RACERS, DEFAULT_TRACKS } from '../../../modules/storage/defaults.js';
import s from '../DevScreen.module.css';

const BLANK = { name: '', icon: '', color: '#e63946', trackId: '' };

function RacerManager() {
  const [racers, setRacers] = useStorage(KEYS.RACERS, DEFAULT_RACERS);
  const [tracks] = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function handleSave() {
    if (!form.name.trim() || !form.icon.trim()) return;
    const racer = { ...form, name: form.name.trim(), icon: form.icon.trim(), enabled: true };

    if (editId) {
      setRacers((prev) => prev.map((r) => (r.id === editId ? { ...r, ...racer } : r)));
    } else {
      setRacers((prev) => [...prev, { id: newId(), ...racer }]);
    }
    setForm(BLANK);
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(racer) {
    setForm({
      name: racer.name,
      icon: racer.icon,
      color: racer.color,
      trackId: racer.trackId,
    });
    setEditId(racer.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this racer type? This cannot be undone.')) return;
    setRacers((prev) => prev.filter((r) => r.id !== id));
  }

  function toggleEnabled(id) {
    setRacers((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }

  function handleCancel() {
    setForm(BLANK);
    setEditId(null);
    setShowForm(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Racer Types <span className={s.badge}>{racers.length}</span>
          </span>
          <span className={s.spacer} />
          {!showForm && (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowForm(true)}>
              + Add Racer
            </button>
          )}
        </div>

        {racers.length === 0 ? (
          <p className={s.emptyState}>No racers defined.</p>
        ) : (
          <div className={s.rowList}>
            {racers.map((racer) => {
              const track = tracks.find((t) => t.id === racer.trackId);
              return (
                <div key={racer.id} className={s.row} style={{ opacity: racer.enabled ? 1 : 0.45 }}>
                  {/* Color swatch */}
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: racer.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{racer.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{racer.name}</span>
                  {track && <span className={s.badge}>{track.name}</span>}
                  <span className={s.spacer} />
                  {/* Enable/disable toggle */}
                  <label className={s.toggle} title={racer.enabled ? 'Disable' : 'Enable'}>
                    <input
                      type="checkbox"
                      checked={racer.enabled}
                      onChange={() => toggleEnabled(racer.id)}
                    />
                    <span className={s.toggleSlider} />
                  </label>
                  <button className={s.btnIconOnly} onClick={() => handleEdit(racer)} title="Edit">
                    ✏️
                  </button>
                  <button
                    className={`${s.btnIconOnly} ${s.danger}`}
                    onClick={() => handleDelete(racer.id)}
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
            {editId ? 'Edit Racer' : 'New Racer Type'}
          </p>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.label}>Name</label>
              <input
                className={s.input}
                placeholder="e.g. Penguin"
                maxLength={32}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Emoji Icon</label>
              <input
                className={s.input}
                placeholder="🐧"
                maxLength={4}
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Color</label>
              <div className={s.colorRow}>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Associated Track</label>
              <select
                className={s.select}
                value={form.trackId}
                onChange={(e) => setForm((f) => ({ ...f, trackId: e.target.value }))}
              >
                <option value="">— none —</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={s.btnRow} style={{ marginTop: '0.75rem' }}>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={handleSave}
              disabled={!form.name.trim() || !form.icon.trim()}
            >
              {editId ? 'Save Changes' : 'Add Racer'}
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

export default RacerManager;
