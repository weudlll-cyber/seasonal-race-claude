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
          &ldquo;Cap the lead&rdquo;: front-runners that pull more than the brake threshold ahead of
          the field <strong>median</strong> are braked proportionally (further ahead = braked
          harder, capped), so the field stays catchable without pulling the legitimate winner into
          the pack. Every racer far enough ahead is braked — not just the leader — so braking two
          breakaways does not shift the runaway to the new 2nd. Off above the endgame threshold so
          the controller places the final result cleanly.{' '}
          <strong>Default OFF until the fairness sweep licenses it.</strong>
        </p>

        {/* Enabled toggle */}
        <label style={{ ...rowStyle, cursor: 'pointer' }}>
          <span style={labelStyle}>
            Enabled
            <InfoTooltip text="Master on/off for the rubber-band cap-the-lead system. When off, all rubberBandMult values stay at 1.0. Default OFF pending the fairness sweep." />
          </span>
          <input
            type="checkbox"
            checked={config.enabled ?? false}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          <span style={{ fontSize: '0.88rem' }}>{config.enabled ? 'On' : 'Off'}</span>
        </label>

        {/* Brake threshold */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Brake threshold (gap to median)
            <InfoTooltip text="A racer's gap ahead of the field median (as a fraction of finishT) at which the brake engages. Set above typical lead-group spread so a contested lead is NOT braked — only a lone runaway. 0.03 = brake starts when a racer is 3% of the race ahead of the median." />
          </span>
          <input
            type="range"
            min={0.005}
            max={0.1}
            step={0.005}
            value={config.brakeThreshold ?? 0.03}
            onChange={(e) => set('brakeThreshold', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{((config.brakeThreshold ?? 0.03) * 100).toFixed(1)}%</span>
        </label>

        {/* Gap scale */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Gap scale (ramp width)
            <InfoTooltip text="Gap range over which the brake ramps from 0 to full. Full brake is reached at a gap of (brakeThreshold + gapScale). Larger = softer onset." />
          </span>
          <input
            type="range"
            min={0.005}
            max={0.1}
            step={0.005}
            value={config.gapScale ?? 0.025}
            onChange={(e) => set('gapScale', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{((config.gapScale ?? 0.025) * 100).toFixed(1)}%</span>
        </label>

        {/* Max brake */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Max brake
            <InfoTooltip text="Maximum slowdown applied to the most-broken-away racer (floor 1 - maxBrake). Slider capped at 0.10 (−10%) — this stays within the controller's recovery authority. 0.15 is the post-sweep ceiling and is intentionally NOT exposed here yet." />
          </span>
          <input
            type="range"
            min={0}
            max={0.1}
            step={0.01}
            value={config.maxBrake ?? 0.1}
            onChange={(e) => set('maxBrake', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>−{((config.maxBrake ?? 0.1) * 100).toFixed(0)}%</span>
        </label>

        {/* Brake ramp ms */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Brake ramp
            <InfoTooltip text="Time in milliseconds for rubberBandMult to ease toward a new target (temporal smoother, prevents the brake snapping on/off). Longer = smoother, shorter = more reactive." />
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

        {/* Endgame threshold (hard-off) */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Endgame hard-off
            <InfoTooltip text="Leader-progress fraction above which the rubber-band turns fully off, giving the P-controller a clean final window. 0.9 = off in the last 10% of the race." />
          </span>
          <input
            type="range"
            min={0.5}
            max={1.0}
            step={0.01}
            value={config.rubberBandEndgameThreshold ?? 0.9}
            onChange={(e) => set('rubberBandEndgameThreshold', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>
            {((config.rubberBandEndgameThreshold ?? 0.9) * 100).toFixed(0)}%
          </span>
        </label>
      </div>
    </div>
  );
}

export default RubberBandSection;
