// ============================================================
// File:        CameraZoomTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Dev-Screen tuning UI for camera behavior.
//              Etappe 3: per-state cameraStateProfiles accordion,
//              Entry Convergence globals, and State Trigger Settings.
// ============================================================

import { useEffect, useState } from 'react';
import {
  DEFAULT_CAMERA_CONFIG,
  loadCameraConfig,
  saveCameraConfig,
} from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

const CAM_STATES = ['OVERVIEW', 'LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'];

const STATE_LABELS = {
  OVERVIEW: 'Overview',
  LEADER_ZOOM: 'Leader Zoom',
  BATTLE_ZOOM: 'Battle Zoom',
  COMEBACK_ZOOM: 'Comeback Zoom',
};

const PROFILE_FIELDS = [
  {
    key: 'spritePx',
    label: 'Sprite size (px)',
    min: 5,
    max: 200,
    step: 1,
    tip: (v, n) => `Target sprite height in world pixels in ${n}. ${v}px (track corridor ≈150px).`,
  },
  {
    key: 'trackingTC',
    label: 'Tracking TC (s)',
    min: 0.05,
    max: 5,
    step: 0.05,
    tip: (v) => `Lerp time-constant during stable tracking in this state. ${v.toFixed(2)}s.`,
  },
  {
    key: 'entryTC',
    label: 'Entry TC (s)',
    min: 0.05,
    max: 5,
    step: 0.05,
    tip: (v) =>
      `Slower lerp TC used right after state entry until camera converges. ${v.toFixed(2)}s.`,
  },
  {
    key: 'leadInDuration',
    label: 'Lead-in duration (s)',
    min: 0,
    max: 5,
    step: 0.1,
    tip: (v) =>
      `Camera shows the track ahead for this many seconds at state start before following the racer. ${v.toFixed(1)}s.`,
  },
  {
    key: 'leadOutDuration',
    label: 'Lead-out duration (s)',
    min: 0,
    max: 5,
    step: 0.1,
    tip: (v) =>
      `Camera starts decelerating to a stop this many seconds before the state ends. ${v.toFixed(1)}s.`,
  },
  {
    key: 'innerFramePct',
    label: 'Inner frame %',
    min: 0.3,
    max: 1,
    step: 0.05,
    tip: (v) =>
      `Target must land within this fraction of the canvas on each axis. ${(v * 100).toFixed(0)}%.`,
  },
  {
    key: 'maxStateDuration',
    label: 'Max state duration (ms)',
    min: 1000,
    max: 15000,
    step: 500,
    tip: (v) => `Hard cap on time in this state before switching. ${v}ms.`,
  },
  {
    key: 'minStateHold',
    label: 'Min state hold (ms)',
    min: 1000,
    max: 10000,
    step: 500,
    tip: (v) => `Minimum time locked in this state before any switch. ${v}ms.`,
  },
  {
    key: 'maxEntryDurationMs',
    label: 'Max entry duration (ms)',
    min: 500,
    max: 30000,
    step: 500,
    tip: (v) =>
      `Time-based fallback: forces entry→tracking after this many ms, even if T-space gap is above threshold. ${v}ms.`,
  },
];

function StateProfileBlock({ stateName, profile, defaults, onChangeField, onReset }) {
  return (
    <details style={{ marginBottom: '0.4rem' }}>
      <summary
        style={{
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
          padding: '0.25rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          userSelect: 'none',
          listStyle: 'none',
        }}
      >
        <span>{STATE_LABELS[stateName]}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset(stateName);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-muted)',
            fontSize: '0.68rem',
            cursor: 'pointer',
            padding: '0.1rem 0.2rem',
            opacity: 0.7,
            marginLeft: 'auto',
          }}
          data-testid={`reset-state-${stateName}`}
        >
          Reset state
        </button>
      </summary>
      <div className={s.formGrid} style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
        {PROFILE_FIELDS.map(({ key, label, min, max, step, tip }) => {
          const val = profile[key] ?? defaults[key];
          return (
            <div key={key} className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {label}
                <InfoTooltip text={tip(val, STATE_LABELS[stateName])} />
              </label>
              <input
                type="number"
                className={s.input}
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= min && v <= max) onChangeField(stateName, key, v);
                }}
              />
            </div>
          );
        })}
      </div>
    </details>
  );
}

function CameraZoomTuningSection() {
  const [config, setConfig] = useState(() => loadCameraConfig());

  useEffect(() => {
    saveCameraConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setProfileField(stateName, field, val) {
    setConfig((prev) => {
      const prevProfiles = prev.cameraStateProfiles ?? DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      return {
        ...prev,
        cameraStateProfiles: {
          ...prevProfiles,
          [stateName]: { ...prevProfiles[stateName], [field]: val },
        },
      };
    });
  }

  function resetState(stateName) {
    setConfig((prev) => {
      const prevProfiles = prev.cameraStateProfiles ?? DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      return {
        ...prev,
        cameraStateProfiles: {
          ...prevProfiles,
          [stateName]: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles[stateName] },
        },
      };
    });
  }

  function handleReset() {
    const defProfs = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
    setConfig((prev) => ({
      ...prev,
      cameraStateProfiles: Object.fromEntries(
        Object.keys(defProfs).map((k) => [k, { ...defProfs[k] }])
      ),
      entryConvergenceZoom: DEFAULT_CAMERA_CONFIG.entryConvergenceZoom,
      entryConvergencePx: DEFAULT_CAMERA_CONFIG.entryConvergencePx,
      transitionTConvergence: DEFAULT_CAMERA_CONFIG.transitionTConvergence,
      battlePulkThresholdPx: DEFAULT_CAMERA_CONFIG.battlePulkThresholdPx,
      battleMinDurationMs: DEFAULT_CAMERA_CONFIG.battleMinDurationMs,
      endgameThreshold: DEFAULT_CAMERA_CONFIG.endgameThreshold,
      postStartHoldMs: DEFAULT_CAMERA_CONFIG.postStartHoldMs,
      battleCooldownMs: DEFAULT_CAMERA_CONFIG.battleCooldownMs,
      overviewCooldownMin: DEFAULT_CAMERA_CONFIG.overviewCooldownMin,
      overviewCooldownMax: DEFAULT_CAMERA_CONFIG.overviewCooldownMax,
    }));
  }

  const profiles = config.cameraStateProfiles ?? DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Camera Behavior</span>
          <span className={s.spacer} />
          <button
            onClick={handleReset}
            data-testid="reset-camera-behavior"
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
            Reset Camera Behavior
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Per-state camera profiles. Expand a block to tune zoom speed, sprite size, and framing.
          Lead-in duration: camera shows track ahead at state start. Lead-out duration: camera
          decelerates to a stop before state end. Entry TC slows the camera on state entry; Tracking
          TC keeps it glued once converged.
        </p>

        {/* State profile blocks */}
        <div style={{ marginBottom: '1rem' }}>
          {CAM_STATES.map((stateName) => (
            <StateProfileBlock
              key={stateName}
              stateName={stateName}
              profile={profiles[stateName] ?? defProfiles[stateName]}
              defaults={defProfiles[stateName]}
              onChangeField={setProfileField}
              onReset={resetState}
            />
          ))}
        </div>

        {/* Entry Convergence */}
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '0.4rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '0.5rem',
          }}
        >
          Entry Convergence
        </div>
        <div className={s.formGrid} style={{ marginBottom: '1rem' }}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Convergence zoom threshold
              <InfoTooltip
                text={`Camera switches from entry to tracking phase once zoom delta drops below this value. Current: ${config.entryConvergenceZoom ?? 0.05}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.001}
              max={0.5}
              step={0.005}
              value={config.entryConvergenceZoom ?? 0.05}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.001 && v <= 0.5) set('entryConvergenceZoom', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Convergence px threshold
              <InfoTooltip
                text={`Camera switches from entry to tracking phase once offset delta drops below this many pixels on each axis. Current: ${config.entryConvergencePx ?? 10}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={100}
              step={1}
              value={config.entryConvergencePx ?? 10}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 100) set('entryConvergencePx', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              T-space convergence threshold
              <InfoTooltip
                text={`Camera exits entry phase when |camT − targetT| drops below this value (track-param units). Steady-state gap ≈ ese/lf ≈ 0.026; threshold must exceed this to converge while the leader is moving. Current: ${(config.transitionTConvergence ?? 0.03).toFixed(3)}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.005}
              max={0.2}
              step={0.005}
              value={config.transitionTConvergence ?? 0.03}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.005 && v <= 0.2) set('transitionTConvergence', v);
              }}
            />
          </div>
        </div>

        {/* State Trigger Settings */}
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '0.4rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '0.5rem',
          }}
        >
          State Trigger Settings
        </div>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Pulk threshold (px)
              <InfoTooltip
                text={`BATTLE triggers when ≥3 of the top-10 racers are within this world-pixel distance of each other. Lower = only fires on very tight clusters. Value: ${config.battlePulkThresholdPx}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={20}
              max={500}
              step={10}
              value={config.battlePulkThresholdPx ?? 200}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 20 && v <= 500) set('battlePulkThresholdPx', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              BATTLE min hold (ms)
              <InfoTooltip
                text={`Minimum time BATTLE stays active after entry, even if the cluster dissolves sooner. Value: ${config.battleMinDurationMs ?? 3000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={500}
              max={10000}
              step={500}
              value={config.battleMinDurationMs ?? 3000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 500 && v <= 10000) set('battleMinDurationMs', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Endgame focus threshold
              <InfoTooltip
                text={`When the leader passes this fraction of the track, camera locks onto them for the final stretch. Value: ${config.endgameThreshold}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.5}
              max={1.0}
              step={0.05}
              value={config.endgameThreshold}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 1.0) set('endgameThreshold', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Post-Start LEADER Hold
              <InfoTooltip
                text={`After the initial 3s OVERVIEW, hold LEADER state for this duration before BATTLE can trigger. Value: ${(config.postStartHoldMs / 1000).toFixed(1)}s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={15000}
              step={500}
              value={config.postStartHoldMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 15000) set('postStartHoldMs', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              BATTLE Cooldown
              <InfoTooltip
                text={`Minimum time after BATTLE ends before a new BATTLE can trigger. Value: ${(config.battleCooldownMs / 1000).toFixed(1)}s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={20000}
              step={500}
              value={config.battleCooldownMs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 20000) set('battleCooldownMs', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Periodic OVERVIEW — Min Interval
              <InfoTooltip
                text={`Minimum time between automatic OVERVIEW cuts during a race. Value: ${(config.overviewCooldownMin / 1000).toFixed(0)}s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={5000}
              max={60000}
              step={1000}
              value={config.overviewCooldownMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 5000 && v < config.overviewCooldownMax) set('overviewCooldownMin', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Periodic OVERVIEW — Max Interval
              <InfoTooltip
                text={`Maximum time between automatic OVERVIEW cuts. Actual interval is randomly rolled between min and max. Value: ${(config.overviewCooldownMax / 1000).toFixed(0)}s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={5000}
              max={60000}
              step={1000}
              value={config.overviewCooldownMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > config.overviewCooldownMin && v <= 60000) set('overviewCooldownMax', v);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraZoomTuningSection;
