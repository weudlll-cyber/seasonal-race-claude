// ============================================================
// File:        RacerManager.jsx
// Path:        client/src/screens/DevScreen/sections/RacerManager.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Updated:     2026-05-27 — Phase 2: listAllRacerTypes() as source of truth;
//              user-created types appear alongside built-ins; delete + edit
//              buttons for user-created types; "Edit in Racer Editor" link.
// Description: Display, enable/disable, and tune all racer types — built-in
//              and user-created. User-created types add delete and editor links.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import {
  RACER_TYPES,
  listAllRacerTypes,
  removeRacerType,
  getRacerTypeLabel,
  TUNABLE_FIELDS,
  normalizeOverrideMap,
} from '../../../modules/racer-types/index.js';
import { RacerEditModal } from './RacerEditModal.jsx';
import s from '../DevScreen.module.css';

function RacerManager() {
  const navigate = useNavigate();
  const [overrides, setOverrides] = useStorage(KEYS.RACER_TYPE_OVERRIDES, {});
  const [editTypeId, setEditTypeId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const normalized = normalizeOverrideMap(overrides);

  // listAllRacerTypes() returns built-ins + user-created; re-evaluated on every render
  const types = listAllRacerTypes().map(({ id, speedMultiplier }) => {
    const typeOvr = normalized[id] ?? {};
    const hasTuningOverrides = TUNABLE_FIELDS.some((f) => f in typeOvr);
    return {
      id,
      label: getRacerTypeLabel(id),
      speedMultiplier,
      isActive: typeOvr.isActive !== false,
      hasTuningOverrides,
      isBuiltIn: id in RACER_TYPES,
    };
  });

  const activeCount = types.filter((t) => t.isActive).length;

  function toggleActive(id) {
    setOverrides((prev) => {
      const all = normalizeOverrideMap(prev);
      const typeOvr = { ...(all[id] ?? {}) };
      if (typeOvr.isActive !== false) {
        typeOvr.isActive = false;
      } else {
        delete typeOvr.isActive;
      }
      const next = { ...all };
      if (Object.keys(typeOvr).length === 0) delete next[id];
      else next[id] = typeOvr;
      return next;
    });
  }

  async function handleDelete(id, label) {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      await removeRacerType(id);
      // Removes orphaned overrides and triggers re-render so listAllRacerTypes() re-runs.
      setOverrides((prev) => {
        const all = { ...normalizeOverrideMap(prev) };
        delete all[id];
        return all;
      });
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Racer Types{' '}
            <span className={s.badge}>
              {activeCount}/{types.length}
            </span>
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
          The different categories of racers available in your races (horses, rockets, boats, etc.).
          Each type has its own look, sprite image, and default characters. You can mix and match
          types or stick with one per race.
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
          <span>Per type you can configure:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Name
            <InfoTooltip text="What this category of racers is called. Choose a name that describes the racer style — for example 'Horse', 'Rocket', or 'Boat'." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Sprite
            <InfoTooltip text="The image file used for racers of this type. The image should show the racer facing right — the app handles rotation automatically when racers turn corners." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Characters
            <InfoTooltip text="Pre-made racer characters of this type with names and color variations. These appear as ready-to-use options when you set up a race." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Min Size
            <InfoTooltip text="The smallest size at which the racer image still looks good. The app uses this to keep racers readable on big tracks where they would otherwise be tiny." />
          </span>
        </div>

        {deleteError && (
          <p style={{ color: '#e63946', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            Delete failed: {deleteError}
          </p>
        )}

        <div className={s.rowList}>
          {types.map((type) => (
            <div key={type.id} className={s.row} style={{ opacity: type.isActive ? 1 : 0.45 }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{type.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                ×{type.speedMultiplier.toFixed(2)}
                {type.hasTuningOverrides && (
                  <span
                    title="This type has custom tuning overrides"
                    style={{ marginLeft: '0.3rem', color: 'var(--color-primary)' }}
                  >
                    ✱
                  </span>
                )}
              </span>
              <span className={s.spacer} />
              {!type.isBuiltIn && (
                <button
                  onClick={() => navigate(`/racer-editor?id=${type.id}`)}
                  title={`Edit ${type.label} in Racer Editor`}
                  style={{
                    background: 'none',
                    border: '1px solid #3a3a4a',
                    color: 'var(--color-muted)',
                    fontSize: '0.72rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    marginRight: '0.25rem',
                  }}
                >
                  Edit in Racer Editor
                </button>
              )}
              <button
                onClick={() => setEditTypeId(type.id)}
                title={`Edit ${type.label} tuning`}
                style={{
                  background: 'none',
                  border: '1px solid #3a3a4a',
                  color: 'var(--color-muted)',
                  fontSize: '0.72rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  marginRight: '0.25rem',
                }}
              >
                Edit
              </button>
              {!type.isBuiltIn && (
                <button
                  onClick={() => handleDelete(type.id, type.label)}
                  disabled={deletingId === type.id}
                  title={`Delete ${type.label}`}
                  style={{
                    background: 'none',
                    border: '1px solid #3a3a4a',
                    color: '#e63946',
                    fontSize: '0.72rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: 'var(--radius)',
                    cursor: deletingId === type.id ? 'not-allowed' : 'pointer',
                    marginRight: '0.25rem',
                    opacity: deletingId === type.id ? 0.5 : 1,
                  }}
                >
                  {deletingId === type.id ? 'Deleting…' : 'Delete'}
                </button>
              )}
              <label className={s.toggle} title={type.isActive ? 'Disable' : 'Enable'}>
                <input
                  type="checkbox"
                  checked={type.isActive}
                  onChange={() => toggleActive(type.id)}
                />
                <span className={s.toggleSlider} />
              </label>
            </div>
          ))}
        </div>
      </div>

      {editTypeId && (
        <RacerEditModal
          typeId={editTypeId}
          overrides={overrides}
          setOverrides={setOverrides}
          onClose={() => setEditTypeId(null)}
        />
      )}
    </>
  );
}

export default RacerManager;
