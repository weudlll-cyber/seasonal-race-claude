// ============================================================
// File:        RubberBandSection.jsx
// Path:        client/src/screens/DevScreen/sections/RubberBandSection.jsx
// Project:     RaceArena
// Created:     2026-05-31
// Description: Dev-Screen tuning UI for the rubber-band catch-up system.
// ============================================================

import { useEffect, useState } from 'react';
import {
  DEFAULT_RUBBER_BAND_CONFIG,
  loadRubberBandConfig,
  saveRubberBandConfig,
} from '../../../modules/rubberBandConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function RubberBandSection() {
  const [config, setConfig] = useState(() => loadRubberBandConfig());
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    const ok = saveRubberBandConfig(config);
    if (!ok) setStorageError('Settings could not be saved — storage is full.');
    else setStorageError(null);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function resetAll() {
    setConfig({ ...DEFAULT_RUBBER_BAND_CONFIG });
  }

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.88rem',
    marginBottom: '0.5rem',
  };
  const labelStyle = { minWidth: '14rem' };
  const valueStyle = { minWidth: '3rem', textAlign: 'right', fontSize: '0.88rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {storageError && (
        <p style={{ color: 'var(--color-error, #e55)', margin: 0, fontSize: '0.85rem' }}>
          ⚠ {storageError}
        </p>
      )}

      <div
        style={{
          background: 'var(--color-surface-2, rgba(255,255,255,0.04))',
          borderRadius: '6px',
          padding: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Rubber-Band Catch-Up</div>
          <button className={`${s.btn} ${s.btnSecondary}`} onClick={resetAll}>
            Reset all
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
          When the leader pulls more than the gap threshold ahead of 2nd place, every other
          non-finished racer receives a flat speed boost. Deactivates once the leader crosses the
          outcome threshold (~90% progress) so the final result crystallizes naturally.
        </p>

        {/* Enabled toggle */}
        <label style={{ ...rowStyle, cursor: 'pointer' }}>
          <span style={labelStyle}>
            Enabled
            <InfoTooltip text="Master on/off for the rubber-band system. When off, all rubberBandMult values stay at 1.0." />
          </span>
          <input
            type="checkbox"
            checked={config.enabled ?? true}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          <span style={{ fontSize: '0.88rem' }}>{config.enabled ? 'On' : 'Off'}</span>
        </label>

        {/* Flat boost */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Catch-up boost (flat %)
            <InfoTooltip text="Flat speed multiplier applied to every non-leader when the gap threshold is exceeded. 0.10 = all non-leaders run 10% faster while boost is active." />
          </span>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={config.flatBoost ?? 0.1}
            onChange={(e) => set('flatBoost', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>+{((config.flatBoost ?? 0.1) * 100).toFixed(0)}%</span>
        </label>

        {/* Boost ramp ms */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Boost ramp
            <InfoTooltip text="Time in milliseconds for the boost to ease from its current value to a new target. Longer = smoother transitions, shorter = more reactive." />
          </span>
          <input
            type="range"
            min={200}
            max={8000}
            step={100}
            value={config.boostRampMs ?? 2000}
            onChange={(e) => set('boostRampMs', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{((config.boostRampMs ?? 2000) / 1000).toFixed(1)}s</span>
        </label>

        {/* Gap threshold */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Gap threshold
            <InfoTooltip text="Gap between 1st and 2nd place (as a fraction of total track length) that activates the boost. 0.003 = boost fires when leader is 0.3% of the track ahead of 2nd." />
          </span>
          <input
            type="range"
            min={0.001}
            max={0.1}
            step={0.001}
            value={config.gapThreshold ?? 0.003}
            onChange={(e) => set('gapThreshold', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{((config.gapThreshold ?? 0.003) * 100).toFixed(1)}%</span>
        </label>
      </div>
    </div>
  );
}

export default RubberBandSection;
