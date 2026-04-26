// ============================================================
// File:        RacerManager.jsx
// Path:        client/src/screens/DevScreen/sections/RacerManager.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Updated:     2026-04-26 — B7: code registry as source of truth; only
//              isActive overrides are persisted in localStorage.
//              D3.5.5: Edit-Modal for per-type tuning (6 fields).
//              Override map schema migrated to object format.
// Description: Display, enable/disable, and tune the 12 code-defined racer
//              types. Types are defined in code — add/delete not available.
// ============================================================

import { useState } from 'react';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
import {
  RACER_TYPE_IDS,
  RACER_TYPES,
  RACER_TYPE_LABELS,
  TUNABLE_FIELDS,
  normalizeOverrideMap,
} from '../../../modules/racer-types/index.js';
import { RacerEditModal } from './RacerEditModal.jsx';
import s from '../DevScreen.module.css';

function RacerManager() {
  const [overrides, setOverrides] = useStorage(KEYS.RACER_TYPE_OVERRIDES, {});
  const [editTypeId, setEditTypeId] = useState(null);

  const normalized = normalizeOverrideMap(overrides);

  const types = RACER_TYPE_IDS.map((id) => {
    const typeOvr = normalized[id] ?? {};
    const hasTuningOverrides = TUNABLE_FIELDS.some((f) => f in typeOvr);
    return {
      id,
      label: RACER_TYPE_LABELS[id] ?? id,
      speedMultiplier: RACER_TYPES[id].getSpeedMultiplier(),
      isActive: typeOvr.isActive !== false,
      hasTuningOverrides,
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

  return (
    <>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Racer Types{' '}
            <span className={s.badge}>
              {activeCount}/{types.length}
            </span>
          </span>
        </div>

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
