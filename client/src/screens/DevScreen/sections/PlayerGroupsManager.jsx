// ============================================================
// File:        PlayerGroupsManager.jsx
// Path:        client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx
// Project:     RaceArena
// Description: Save, load, edit, and delete named player groups; supports
//              quick-import via comma-separated name paste.
//              Data source: server (/api/player-groups) — D2 migration.
//              ACTIVE_GROUP transient key stays local (unchanged).
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS, storageSet } from '../../../modules/storage/storage.js';
import { DEFAULT_RACE_DEFAULTS } from '../../../modules/storage/defaults.js';
import { assignRacers } from '../../../modules/utils/RandomHelper.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import {
  fetchPlayerGroups,
  createPlayerGroup,
  updatePlayerGroup,
  deletePlayerGroup,
} from '../../../services/playerGroupApi.js';
import { migrateLocalPlayerGroupsToServer } from '../../../modules/storage/playerGroupMigration.js';
import s from '../DevScreen.module.css';

const BLANK_FORM = { name: '', playersText: '' };

function PlayerGroupsManager() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [raceDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);
  const maxPlayers = raceDefaults.maxPlayersOpen ?? 100;
  const [form, setForm] = useState(BLANK_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // refresh — lightweight re-fetch used after CRUD operations
  const refresh = useCallback(async () => {
    try {
      setGroups(await fetchPlayerGroups());
    } catch (e) {
      setLoadError(e.message ?? 'Failed to load player groups');
    }
  }, []);

  // Initial load — also triggers one-time migration (idempotent after first run)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const initial = await fetchPlayerGroups();
        if (cancelled) return;
        const serverIds = new Set(initial.map((g) => g.id));
        await migrateLocalPlayerGroupsToServer(serverIds);
        if (cancelled) return;
        // Re-fetch to include any groups uploaded by migration
        setGroups(await fetchPlayerGroups());
      } catch (e) {
        if (!cancelled) setLoadError(e.message ?? 'Failed to load player groups');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function parseNames(text) {
    return text
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, maxPlayers);
  }

  async function handleSave() {
    const names = parseNames(form.playersText);
    if (!form.name.trim() || names.length === 0) return;
    setActionError(null);
    try {
      if (editId) {
        await updatePlayerGroup(editId, { name: form.name.trim(), players: names });
      } else {
        await createPlayerGroup({ name: form.name.trim(), players: names });
      }
      setForm(BLANK_FORM);
      setEditId(null);
      setShowForm(false);
      await refresh();
    } catch (e) {
      setActionError(e.message ?? 'Failed to save player group');
    }
  }

  function handleEdit(group) {
    setActionError(null);
    setForm({ name: group.name, playersText: group.players.join(', ') });
    setEditId(group.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this player group?')) return;
    setActionError(null);
    try {
      await deletePlayerGroup(id);
      await refresh();
    } catch (e) {
      // Server 403 on default group becomes a visible error message
      setActionError(e.message ?? 'Failed to delete player group');
    }
  }

  function handleLoad(group) {
    // ACTIVE_GROUP stays local — unchanged from pre-D2 (transient hand-off channel)
    storageSet(KEYS.ACTIVE_GROUP, assignRacers(group.players));
    navigate('/setup');
  }

  function handleCancel() {
    setActionError(null);
    setForm(BLANK_FORM);
    setEditId(null);
    setShowForm(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Group list */}
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.35rem' }}>
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
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Groups of players that you race with regularly. When you set up a new race, you can pick a
          group instead of selecting players one by one. Useful for recurring events like
          &lsquo;Friday Crew&rsquo; or &lsquo;Family Race&rsquo;.
        </p>

        {isLoading && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Loading groups…</p>
        )}

        {loadError && !isLoading && (
          <p
            role="alert"
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-danger, #c00)',
              marginBottom: '0.5rem',
            }}
          >
            Could not load groups: {loadError}
          </p>
        )}

        {actionError && (
          <p
            role="alert"
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-danger, #c00)',
              marginBottom: '0.5rem',
            }}
          >
            {actionError}
          </p>
        )}

        {!isLoading && !loadError && groups.length === 0 ? (
          <p className={s.emptyState}>No groups yet. Create one to save a roster.</p>
        ) : (
          <div className={s.rowList}>
            {groups.map((group) => (
              <div key={group.id} className={s.row}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{group.name}</span>
                <span className={s.badge}>{group.players.length} players</span>
                {group.isDefault && (
                  <span className={s.badge} style={{ opacity: 0.6 }}>
                    Default
                  </span>
                )}
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
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Group Name
                <InfoTooltip text="What this group is called. Choose a short, recognizable name that you'll see in race setup." />
              </label>
              <input
                className={s.input}
                placeholder="e.g. Friday Team"
                value={form.name}
                maxLength={40}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Player Names{' '}
                <InfoTooltip text="The players in this group. Add anyone who frequently races together so you can pick them all with one click." />
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
