// ============================================================
// File:        PlayerGroupsManager.jsx
// Path:        client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Save, load, edit, and delete named player groups; supports
//              quick-import via comma-separated name paste
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS, newId, storageSet } from '../../../modules/storage/storage.js';
import { DEFAULT_PLAYER_GROUPS, DEFAULT_RACE_DEFAULTS } from '../../../modules/storage/defaults.js';
import { assignRacers } from '../../../modules/utils/RandomHelper.js';
import s from '../DevScreen.module.css';

const BLANK_FORM = { name: '', playersText: '' };

function PlayerGroupsManager() {
  const [groups, setGroups] = useStorage(KEYS.PLAYER_GROUPS, DEFAULT_PLAYER_GROUPS);
  const [raceDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);
  const maxPlayers = raceDefaults.maxPlayers ?? 20;
  const [form, setForm] = useState(BLANK_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  function parseNames(text) {
    return text
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, maxPlayers);
  }

  function handleSave() {
    const names = parseNames(form.playersText);
    if (!form.name.trim() || names.length === 0) return;

    if (editId) {
      setGroups((prev) =>
        prev.map((g) => (g.id === editId ? { ...g, name: form.name.trim(), players: names } : g))
      );
    } else {
      setGroups((prev) => [...prev, { id: newId(), name: form.name.trim(), players: names }]);
    }
    setForm(BLANK_FORM);
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(group) {
    setForm({ name: group.name, playersText: group.players.join(', ') });
    setEditId(group.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this player group?')) return;
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function handleLoad(group) {
    // Write assigned racers to the activeGroup key; SetupScreen reads it on mount
    storageSet(KEYS.ACTIVE_GROUP, assignRacers(group.players));
    navigate('/setup');
  }

  function handleCancel() {
    setForm(BLANK_FORM);
    setEditId(null);
    setShowForm(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Group list */}
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Saved Groups <span className={s.badge}>{groups.length}</span>
          </span>
          <span className={s.spacer} />
          {!showForm && (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowForm(true)}>
              + New Group
            </button>
          )}
        </div>

        {groups.length === 0 ? (
          <p className={s.emptyState}>No groups yet. Create one to save a roster.</p>
        ) : (
          <div className={s.rowList}>
            {groups.map((group) => (
              <div key={group.id} className={s.row}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{group.name}</span>
                <span className={s.badge}>{group.players.length} players</span>
                <span className={s.spacer} />
                <button
                  className={`${s.btn} ${s.btnSecondary}`}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                  onClick={() => handleLoad(group)}
                  title="Load this group into the Setup Screen"
                >
                  ▶ Load to Setup
                </button>
                <button
                  className={`${s.btnIconOnly}`}
                  onClick={() => handleEdit(group)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className={`${s.btnIconOnly} ${s.danger}`}
                  onClick={() => handleDelete(group.id)}
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className={s.card}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {editId ? 'Edit Group' : 'New Group'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className={s.formGroup}>
              <label className={s.label}>Group Name</label>
              <input
                className={s.input}
                placeholder="e.g. Friday Team"
                value={form.name}
                maxLength={40}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>
                Player Names{' '}
                <span
                  style={{ textTransform: 'none', fontWeight: 400, color: 'var(--color-muted)' }}
                >
                  — comma-separated, max {maxPlayers}
                </span>
              </label>
              <textarea
                className={s.textarea}
                placeholder="Alice, Bob, Carol, Dave…"
                value={form.playersText}
                onChange={(e) => setForm((f) => ({ ...f, playersText: e.target.value }))}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {parseNames(form.playersText).length} / {maxPlayers} names detected
              </span>
            </div>
            <div className={s.btnRow}>
              <button
                className={`${s.btn} ${s.btnPrimary}`}
                onClick={handleSave}
                disabled={!form.name.trim() || parseNames(form.playersText).length === 0}
              >
                {editId ? 'Save Changes' : 'Create Group'}
              </button>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerGroupsManager;
