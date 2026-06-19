// ============================================================
// File:        RaceZonesSection.jsx
// Path:        client/src/screens/DevScreen/sections/RaceZonesSection.jsx
// Project:     RaceArena
// Created:     2026-06-19
// Description: Dev-Screen tuning UI for the race-zone brake system.
// ============================================================

import { useEffect, useState } from 'react';
import {
  DEFAULT_RACE_ZONE_CONFIG,
  loadRaceZoneConfig,
  saveRaceZoneConfig,
} from '../../../modules/raceZoneConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function RaceZonesSection() {
  const [config, setConfig] = useState(() => loadRaceZoneConfig());
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    const ok = saveRaceZoneConfig(config);
    if (!ok) setStorageError('Settings could not be saved — storage is full.');
    else setStorageError(null);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function resetAll() {
    setConfig({ ...DEFAULT_RACE_ZONE_CONFIG });
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
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Race Zones — Brake Zone</div>
          <button className={`${s.btn} ${s.btnSecondary}`} onClick={resetAll}>
            Reset all
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
          A fixed band on the track that slows every non-finished racer passing through it by the
          same factor, regardless of type or rank. Bunches the field (accordion effect). Default OFF
          — no behavior change until enabled.
        </p>

        {/* Enabled toggle */}
        <label style={{ ...rowStyle, cursor: 'pointer' }}>
          <span style={labelStyle}>
            Enabled
            <InfoTooltip text="Master on/off for the brake zone. When off, all racers run at normal speed through the zone position." />
          </span>
          <input
            type="checkbox"
            checked={config.enabled ?? false}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          <span style={{ fontSize: '0.88rem' }}>{config.enabled ? 'On' : 'Off'}</span>
        </label>

        {/* Position */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Zone position
            <InfoTooltip text="Centre of the brake zone as a fraction of the lap (0 = start/finish, 0.5 = halfway). The band is drawn and applied symmetrically around this point." />
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={config.position ?? 0.5}
            onChange={(e) => set('position', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{((config.position ?? 0.5) * 100).toFixed(0)}%</span>
        </label>

        {/* Width */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Zone width
            <InfoTooltip text="Width of the brake zone as a fraction of the lap. 0.05 = 5% of the track length. Range: 1%–20%." />
          </span>
          <input
            type="range"
            min={0.01}
            max={0.2}
            step={0.01}
            value={config.width ?? 0.05}
            onChange={(e) => set('width', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{((config.width ?? 0.05) * 100).toFixed(0)}%</span>
        </label>

        {/* Brake strength */}
        <label style={rowStyle}>
          <span style={labelStyle}>
            Brake strength
            <InfoTooltip text="Speed multiplier applied while inside the zone. 0.85 = racers run at 85% speed (15% slower). Range: 80%–100% (100% = no braking)." />
          </span>
          <input
            type="range"
            min={0.8}
            max={1.0}
            step={0.01}
            value={config.brakeStrength ?? 0.85}
            onChange={(e) => set('brakeStrength', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{((config.brakeStrength ?? 0.85) * 100).toFixed(0)}%</span>
        </label>
      </div>
    </div>
  );
}

export default RaceZonesSection;
