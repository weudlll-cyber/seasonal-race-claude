// ============================================================
// File:        SpeedScaleSection.jsx
// Path:        client/src/screens/DevScreen/sections/SpeedScaleSection.jsx
// Project:     RaceArena
// Created:     2026-04-27
// Description: Dev-Screen tuning UI for track-speed scaling (B-17).
//              Follows the AutoScaleSection pattern: live-apply, reset,
//              InfoTooltip for non-obvious fields, formula preview.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadSpeedScaleConfig,
  saveSpeedScaleConfig,
  computeSpeedScaleFactor,
} from '../../../modules/speedScale.js';
import { DEFAULT_SPEED_SCALE_CONFIG } from '../../../modules/storage/defaults.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function SpeedScaleSection() {
  const [config, setConfig] = useState(() => loadSpeedScaleConfig());
  const [previewLength, setPreviewLength] = useState(2000);

  useEffect(() => {
    saveSpeedScaleConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setConfig({ ...DEFAULT_SPEED_SCALE_CONFIG });
  }

  const previewFactor = computeSpeedScaleFactor(previewLength, config);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Track Speed Scaling</span>
          <InfoTooltip text="When enabled, racer t-space speed is divided by (pathLengthPx / referencePathLength) so that visually the pace feels similar on large and small tracks. A 4000px path on a 2000px reference gives a 2× divisor — racers take twice as many seconds to complete a lap." />
          <span className={s.spacer} />
          <button
            className={`${s.btn} ${s.btnGhost}`}
            onClick={handleReset}
            style={{ fontSize: '0.75rem' }}
          >
            Reset Defaults
          </button>
        </div>

        <div className={s.formGrid}>
          <div className={s.formGroupFull}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Enabled
              <InfoTooltip text="When off, all tracks run at the same t-speed regardless of size (original behaviour). Enable to make large tracks feel slower and more immersive." />
            </label>
          </div>

          <div className={s.formGroup} style={{ opacity: config.enabled ? 1 : 0.45 }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Reference Path Length (px)
              <InfoTooltip text="The track path length (in world pixels) that yields a speed-scale factor of 1.0. Tracks shorter than this run faster; longer tracks run slower. Default 2000px matches a typical 1280×720 oval." />
            </label>
            <input
              type="number"
              className={s.input}
              min={100}
              max={20000}
              step={100}
              value={config.referencePathLength}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('referencePathLength', v);
              }}
            />
          </div>

          <div className={s.formGroup} style={{ opacity: config.enabled ? 1 : 0.45 }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Scale
              <InfoTooltip text="Minimum divisor (lower bound). A value of 0.5 means very short tracks can run at most 2× faster than reference. Default 0.5." />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.1}
              max={1}
              step={0.05}
              value={config.minScale}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < config.maxScale) set('minScale', v);
              }}
            />
          </div>

          <div className={s.formGroup} style={{ opacity: config.enabled ? 1 : 0.45 }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Scale
              <InfoTooltip text="Maximum divisor (upper bound). A value of 4.0 means very large tracks run at most 4× slower than reference. Default 4.0." />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={10}
              step={0.5}
              value={config.maxScale}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > config.minScale) set('maxScale', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className={s.card} style={{ opacity: config.enabled ? 1 : 0.45 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Formula Preview
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label className={s.label}>Track Path Length (px)</label>
            <input
              type="number"
              className={s.input}
              min={100}
              max={50000}
              step={100}
              value={previewLength}
              onChange={(e) => setPreviewLength(Math.max(100, Number(e.target.value)))}
            />
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
          clamp({previewLength} / {config.referencePathLength}, {config.minScale}, {config.maxScale}
          ) ={' '}
          <strong
            style={{ color: previewFactor === 1 ? 'var(--color-muted)' : 'var(--color-accent)' }}
          >
            {previewFactor.toFixed(3)}×
          </strong>{' '}
          divisor → racers move{' '}
          <strong>
            {previewFactor === 1
              ? 'at reference pace'
              : `${(1 / previewFactor).toFixed(2)}× base speed`}
          </strong>
        </p>
      </div>
    </div>
  );
}

export default SpeedScaleSection;
