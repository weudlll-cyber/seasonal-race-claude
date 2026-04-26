// ============================================================
// File:        RacerManager.jsx
// Path:        client/src/screens/DevScreen/sections/RacerManager.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Updated:     2026-04-26 — B7: code registry as source of truth; only
//              isActive overrides are persisted in localStorage.
// Description: Display and enable/disable the 12 code-defined racer types.
//              Types are defined in code — add/edit/delete is not available.
// ============================================================

import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
import {
  RACER_TYPE_IDS,
  RACER_TYPES,
  RACER_TYPE_LABELS,
} from '../../../modules/racer-types/index.js';
import s from '../DevScreen.module.css';

function RacerManager() {
  const [overrides, setOverrides] = useStorage(KEYS.RACER_TYPE_OVERRIDES, {});

  const types = RACER_TYPE_IDS.map((id) => ({
    id,
    label: RACER_TYPE_LABELS[id] ?? id,
    speedMultiplier: RACER_TYPES[id].getSpeedMultiplier(),
    isActive: overrides[id] !== false,
  }));

  const activeCount = types.filter((t) => t.isActive).length;

  function toggleActive(id) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (next[id] === false) {
        delete next[id];
      } else {
        next[id] = false;
      }
      return next;
    });
  }

  return (
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
            </span>
            <span className={s.spacer} />
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
  );
}

export default RacerManager;
