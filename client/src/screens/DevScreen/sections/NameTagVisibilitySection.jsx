// ============================================================
// File:        NameTagVisibilitySection.jsx
// Path:        client/src/screens/DevScreen/sections/NameTagVisibilitySection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Dev-Screen tuning UI for name-tag visibility (§6.3).
//              Controls how many name tags appear during the race.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadCameraConfig,
  saveCameraConfig,
  DEFAULT_CAMERA_CONFIG,
} from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function NameTagVisibilitySection() {
  const [config, setConfig] = useState(() => loadCameraConfig());

  useEffect(() => {
    saveCameraConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setConfig((prev) => ({
      ...prev,
      tagVisibleMaxCount: DEFAULT_CAMERA_CONFIG.tagVisibleMaxCount,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Name Tag Visibility</span>
          <span className={s.spacer} />
          <button
            onClick={handleReset}
            data-testid="reset-nametag-visibility"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              padding: '0.1rem 0.2rem',
              opacity: 0.7,
            }}
          >
            Reset Name Tag Visibility
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Controls how many name tags appear during the race. All tags are always shown during the
          countdown (so you can find your racer) and after the race ends. During the race, only the
          leading group is shown to keep the screen readable.
        </p>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max tags during race
              <InfoTooltip
                text={`Maximum number of name tags shown during the race. With fewer racers than this number, all are shown. Higher = more tags visible (risk of overlap). Lower = cleaner view, only the front-runners. Value: ${config.tagVisibleMaxCount} tags.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={3}
              max={20}
              step={1}
              value={config.tagVisibleMaxCount}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 3 && v <= 20) set('tagVisibleMaxCount', v);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NameTagVisibilitySection;
