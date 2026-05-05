// ============================================================
// File:        SpriteSizeRangeSection.jsx
// Path:        client/src/screens/DevScreen/sections/SpriteSizeRangeSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Dev-Screen tuning UI for sprite size corridor (§6.2).
//              Controls min/max sprite screen-pixel bounds that constrain
//              how far the camera can zoom in or out.
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
      minSpritePctOfCanvas: DEFAULT_CAMERA_CONFIG.minSpritePctOfCanvas,
      maxTargetScreenPx: DEFAULT_CAMERA_CONFIG.maxTargetScreenPx,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sprite Size Range</span>
          <span className={s.spacer} />
          <button
            onClick={handleReset}
            data-testid="reset-sprite-size-range"
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
            Reset Sprite Size Range
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Minimum is in percent of canvas height to stay consistent across track sizes. Maximum is
          in absolute pixels to limit sprite enlargement on close-up shots.
        </p>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Minimum sprite size (% of canvas)
              <InfoTooltip
                text={`Smallest size racers can appear, as a percentage of canvas height. This ensures sprites stay visible at a comparable size on tracks of any world size. Higher = sprites are always larger, more readable. Lower = sprites can shrink to fit more world context. Value: ${(config.minSpritePctOfCanvas * 100).toFixed(1)}% (≈${Math.round(config.minSpritePctOfCanvas * 720)} px on current canvas).`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.02}
              max={0.15}
              step={0.005}
              value={config.minSpritePctOfCanvas}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.02 && v <= 0.15) set('minSpritePctOfCanvas', v);
              }}
            />
          </div>

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
