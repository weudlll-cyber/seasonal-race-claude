// ============================================================
// File:        BaseSpeedSection.jsx
// Path:        client/src/screens/DevScreen/sections/BaseSpeedSection.jsx
// Project:     RaceArena
// Created:     2026-04-27
// Description: Dev-Screen tuning UI for racer base-speed range.
//              Follows the D3.5.5 pattern: live-apply, reset-to-default,
//              InfoTooltip for non-obvious fields, spread% preview.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadBaseSpeedConfig,
  saveBaseSpeedConfig,
  DEFAULT_BASE_SPEED_CONFIG,
  spreadPercent,
} from '../../../modules/baseSpeedConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function BaseSpeedSection() {
  const [config, setConfig] = useState(() => loadBaseSpeedConfig());

  useEffect(() => {
    saveBaseSpeedConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleReset() {
    setConfig({ ...DEFAULT_BASE_SPEED_CONFIG });
  }

  const spread = spreadPercent(config.min, config.max);
  const mean = ((config.min + config.max) / 2).toFixed(5);
  const isValid = config.min > 0 && config.min < config.max;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Racer Base Speed Range</span>
          <InfoTooltip text="Each racer draws a random base speed uniformly from [min, max] at race start. Wider range = more separation between front and back. Too wide causes lap-wrap visual gaps on the minimap: on a 60s race, ±17% spread produces ~1.3 lap separation; ±13% produces ~0.5 laps." />
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
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Min Speed
              <InfoTooltip text="Slowest possible base speed per frame-tick (at 62.5 fps reference). Default 0.00091. Reducing this widens the spread and slows the back of the pack." />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.0001}
              max={0.005}
              step={0.00001}
              value={config.min}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && v < config.max) set('min', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Max Speed
              <InfoTooltip text="Fastest possible base speed per frame-tick. Default 0.00118. Raising this widens the spread and speeds up the front of the pack." />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.0001}
              max={0.005}
              step={0.00001}
              value={config.max}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > config.min) set('max', v);
              }}
            />
          </div>
        </div>
      </div>

      {/* Spread preview */}
      <div className={s.card}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Spread Preview
        </p>
        {isValid ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Mean: <strong style={{ color: 'var(--color-accent)' }}>{mean}</strong>
            {'  ·  '}
            Spread:{' '}
            <strong
              style={{
                color: spread > 20 ? '#f59e0b' : spread > 15 ? '#fb923c' : 'var(--color-accent)',
              }}
            >
              ±{spread.toFixed(1)}%
            </strong>{' '}
            from mean ({(spread * 2).toFixed(0)}% total range)
            {'  ·  '}
            On a 2-lap race: leader finishes ~
            <strong>{(2 * (1 - config.min / config.max)).toFixed(2)} laps</strong> ahead of last
            <InfoTooltip text="gap = 2 × (1 − min/max). When the leader crosses 2 laps, the slowest racer is at 2 × (min/max) laps. Jitter adds per-racer oscillation on top. This is a closed-track estimate — open tracks end differently." />
          </p>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>
            Invalid: min must be &gt; 0 and &lt; max.
          </p>
        )}
      </div>
    </div>
  );
}

export default BaseSpeedSection;
