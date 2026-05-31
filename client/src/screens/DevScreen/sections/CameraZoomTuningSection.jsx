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
    key: 'spriteScale',
    label: 'Sprite scale (×)',
    min: 0.5,
    max: 5.0,
    step: 0.05,
    tip: (v, n) =>
      `Sprite zoom factor for ${n}. ${v.toFixed(2)}× — relative to natural density-scaled size. 1.0 = natural size, 2.0 = twice as large. Racer-count-independent.`,
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
  {
    key: 'overviewOffsetPx',
    label: 'Overview radial offset (px)',
    min: 0,
    max: 400,
    step: 10,
    onlyFor: 'OVERVIEW',
    tip: (v) =>
      `Camera shifts toward field so leader appears at outer viewport edge. 0 = centered (like LEADER). ${v}px.`,
  },
  {
    key: 'leadAheadEnabled',
    label: 'Lead-Ahead aktiv',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
    tip: (v) =>
      `Wenn aktiv: Kamera zeigt Track vor dem Racer (führt ins Bild rein). Bei OFF sitzt der Racer zentriert. Aktuell: ${v ? 'ON' : 'OFF'}.`,
  },
  {
    key: 'leadOutEnabled',
    label: 'Lead-Out aktiv',
    type: 'boolean',
    onlyFor: ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'],
    tip: (v) =>
      `Wenn aktiv: Kamera verlangsamt sich exponentiell in den letzten leadOutDuration Sekunden vor State-Ende (Racer läuft weiter). Bei OFF folgt die Kamera dem Racer bis zum Wechsel. Aktuell: ${v ? 'ON' : 'OFF'}.`,
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
        {PROFILE_FIELDS.filter(
          ({ onlyFor }) =>
            !onlyFor ||
            (Array.isArray(onlyFor) ? onlyFor.includes(stateName) : onlyFor === stateName)
        ).map(({ key, label, min, max, step, tip, type }) => {
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
              {type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => onChangeField(stateName, key, e.target.checked)}
                />
              ) : (
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
              )}
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
      {/* Countdown Phase */}
      <div className={s.card}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Countdown Phase
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Camera zooms from start-zoom (whole track visible) to OVERVIEW zoom during the pre-race
          countdown. End-zoom is coupled to OVERVIEW&apos;s sprite size and cannot be set
          separately.
        </p>
        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Start zoom — sprite size (px)
              <InfoTooltip
                text={`Sprite height at the beginning of the countdown (same world-pixel unit as per-state sprite sizes). Very small values (≤ sprite size at overview) are clamped to the minimum zoom — whole track visible. Current: ${config.countdownStartZoomSpritePx ?? 1}px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1}
              max={200}
              step={1}
              value={config.countdownStartZoomSpritePx ?? 1}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 200) set('countdownStartZoomSpritePx', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Countdown duration (ms)
              <InfoTooltip
                text={`Duration of the pre-race countdown in milliseconds. Also controls when RACING begins. Default 4000ms = "3 2 1 GO!" at 1s per number. Current: ${config.countdownDurationMs ?? 4000}ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1000}
              max={8000}
              step={500}
              value={config.countdownDurationMs ?? 4000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1000 && v <= 8000) set('countdownDurationMs', v);
              }}
            />
          </div>
        </div>
      </div>

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

        {/* Adaptive Zoom Floor */}
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '0.4rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '0.5rem',
          }}
        >
          Adaptive Zoom Floor
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          During LEADER_ZOOM and LEAD_CHANGE, if fewer than Min racers visible are on screen, the
          camera pulls back by Zoom-out speed each frame until enough racers appear or the Leader
          min zoom floor is reached. 0 = disabled.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>
              Min racers visible
              <InfoTooltip
                text={`Minimum number of non-finished racers that must be visible during LEADER_ZOOM and LEAD_CHANGE. Camera zooms out by Zoom-out speed per frame until this count is met. 0 = disabled. Current: ${config.minRacersVisible ?? 8}.`}
              />
            </span>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={config.minRacersVisible ?? 8}
              onChange={(e) => set('minRacersVisible', Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '1.8rem', textAlign: 'right', fontSize: '0.88rem' }}>
              {config.minRacersVisible ?? 8}
            </span>
          </label>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>
              Leader min zoom (floor)
              <InfoTooltip text="Hard zoom-out floor for LEADER_ZOOM and LEAD_CHANGE. Camera will not zoom out past this value even if fewer than Min racers visible are on screen." />
            </span>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={config.leaderMinZoom ?? 0.4}
              onChange={(e) => set('leaderMinZoom', Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '3rem', textAlign: 'right', fontSize: '0.88rem' }}>
              {(config.leaderMinZoom ?? 0.4).toFixed(2)}
            </span>
          </label>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>
              Zoom-out speed (per frame)
              <InfoTooltip text="Zoom reduction per frame when too few racers are visible. 0.005 = gentle pull-back at ~0.5% per frame (60 fps). Higher = faster response." />
            </span>
            <input
              type="range"
              min={0.001}
              max={0.02}
              step={0.001}
              value={config.zoomOutStepPerFrame ?? 0.005}
              onChange={(e) => set('zoomOutStepPerFrame', Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '3rem', textAlign: 'right', fontSize: '0.88rem' }}>
              {((config.zoomOutStepPerFrame ?? 0.005) * 100).toFixed(1)}%
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default CameraZoomTuningSection;
