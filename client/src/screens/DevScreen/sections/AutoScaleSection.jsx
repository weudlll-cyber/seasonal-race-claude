// ============================================================
// File:        AutoScaleSection.jsx
// Path:        client/src/screens/DevScreen/sections/AutoScaleSection.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Dev-Screen tuning UI for the auto-sprite-scale feature (D10).
//              Follows the D3.5.5 pattern: live-apply on valid change, reset
//              to defaults, InfoTooltip for non-obvious fields.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadAutoScaleConfig,
  saveAutoScaleConfig,
  DEFAULT_AUTO_SCALE_CONFIG,
  computeAutoScaleFactor,
} from '../../../modules/autoSpriteScale.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function AutoScaleSection() {
  const [config, setConfig] = useState(() => loadAutoScaleConfig());
  const [previewRacers, setPreviewRacers] = useState(6);
  const [previewWidth, setPreviewWidth] = useState(140);

  useEffect(() => {
    saveAutoScaleConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setConfig({ ...DEFAULT_AUTO_SCALE_CONFIG });
  }

  const previewFactor = config.enabled
    ? computeAutoScaleFactor(previewWidth, previewRacers, config)
    : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Auto-Sprite-Scaling</span>
          <InfoTooltip text="When enabled, racer display size is automatically scaled based on track width and racer count. Formula: clamp((trackWidth / racerCount) / referenceValue, minScale, maxScale). Operator overrides from the Racer Types editor always take priority." />
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
              <InfoTooltip text="Disabled by default. When off, racer display size is unchanged (1× factor). Enable to have sizes auto-adapt per race." />
            </label>
          </div>

          <div className={s.formGroup} style={{ opacity: config.enabled ? 1 : 0.45 }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Reference Value
              <InfoTooltip text="The track-width-per-racer ratio that yields a neutral scale of 1.0. Default 23: at 140px track width with 6 racers (ratio ≈ 23.3) the factor is ≈ 1.0." />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={200}
              step={1}
              value={config.referenceValue}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('referenceValue', v);
              }}
            />
          </div>

          <div className={s.formGroup} style={{ opacity: config.enabled ? 1 : 0.45 }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Scale
              <InfoTooltip text="Minimum sprite scale factor (clamp lower bound). Default 0.65 = 65% of normal size." />
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
              Min Visible Pixels
              <InfoTooltip text="Minimum on-canvas sprite diameter in pixels. Auto-scale raises the factor above minScale if needed to keep sprites this large. Uses racer display size and camera reference zoom. Default 32." />
            </label>
            <input
              type="number"
              className={s.input}
              aria-label="Min Visible Pixels"
              min={8}
              max={120}
              step={4}
              value={config.minVisiblePixels}
              disabled={!config.enabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) set('minVisiblePixels', v);
              }}
            />
          </div>

          <div className={s.formGroup} style={{ opacity: config.enabled ? 1 : 0.45 }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Scale
              <InfoTooltip text="Maximum sprite scale factor (clamp upper bound). Default 2.5 = 250% of normal size." />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={5}
              step={0.1}
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
            <label className={s.label}>Track Width (px)</label>
            <input
              type="number"
              className={s.input}
              min={50}
              max={2000}
              step={10}
              value={previewWidth}
              onChange={(e) => setPreviewWidth(Number(e.target.value))}
            />
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>Racer Count</label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={50}
              step={1}
              value={previewRacers}
              onChange={(e) => setPreviewRacers(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
          clamp({previewWidth} / {previewRacers} / {config.referenceValue}, {config.minScale},{' '}
          {config.maxScale}) ={' '}
          <strong
            style={{ color: previewFactor === 1 ? 'var(--color-muted)' : 'var(--color-accent)' }}
          >
            {previewFactor.toFixed(3)}×
          </strong>
        </p>
      </div>
    </div>
  );
}

export default AutoScaleSection;
