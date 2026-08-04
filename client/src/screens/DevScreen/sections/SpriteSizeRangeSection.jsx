// ============================================================
// File:        SpriteSizeRangeSection.jsx
// Path:        client/src/screens/DevScreen/sections/SpriteSizeRangeSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Dev-Screen tuning UI for the sprite size ceiling (§6.2).
//              Controls the maximum sprite size in pixels, preventing sprites
//              from becoming too large during dramatic close-ups.
//              The matching FLOOR is `minDrawnFrameFrac` under Camera Behavior
//              (CAMERA-MIN-DRAW-1) — expressed as a share of the frame, not px.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadCameraConfig,
  saveCameraConfig,
  DEFAULT_CAMERA_CONFIG,
} from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function SpriteSizeRangeSection() {
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
      maxTargetScreenPx: DEFAULT_CAMERA_CONFIG.maxTargetScreenPx,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sprite Size Cap</span>
          <span className={s.spacer} />
          <button
            onClick={handleReset}
            data-testid="reset-sprite-size-cap"
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
            Reset Sprite Size Cap
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Maximum sprite size in pixels. Prevents sprites from becoming too large during dramatic
          close-ups (helps if sprite animations look choppy at very large sizes).
        </p>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Maximum sprite size (px)
              <InfoTooltip
                text={`Largest size racers can appear. Higher = camera can zoom in close for drama. Lower = sprites never get huge (helps if animations look choppy when very large). Value: ${config.maxTargetScreenPx}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={32}
              max={256}
              step={4}
              value={config.maxTargetScreenPx}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 32 && v <= 256) set('maxTargetScreenPx', v);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpriteSizeRangeSection;
