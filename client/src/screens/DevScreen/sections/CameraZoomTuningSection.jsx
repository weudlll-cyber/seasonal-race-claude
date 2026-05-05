// ============================================================
// File:        CameraZoomTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Dev-Screen tuning UI for camera behavior (§6.2).
//              Controls target sprite size per camera state — the camera zoom is
//              computed inversely so sprites reach the target size on any track.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadCameraConfig,
  saveCameraConfig,
  DEFAULT_CAMERA_CONFIG,
} from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function CameraZoomTuningSection() {
  const [config, setConfig] = useState(() => loadCameraConfig());

  useEffect(() => {
    saveCameraConfig(config);
  }, [config]);

  function set(key, val) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function setPct(key, val) {
    setConfig((prev) => ({
      ...prev,
      spritePctOfCanvas: { ...prev.spritePctOfCanvas, [key]: val },
    }));
  }

  function handleReset() {
    setConfig((prev) => ({
      ...prev,
      spritePctOfCanvas: { ...DEFAULT_CAMERA_CONFIG.spritePctOfCanvas },
      battleGapThreshold: DEFAULT_CAMERA_CONFIG.battleGapThreshold,
      maxStateDuration: DEFAULT_CAMERA_CONFIG.maxStateDuration,
      endgameThreshold: DEFAULT_CAMERA_CONFIG.endgameThreshold,
    }));
  }

  const pct = config.spritePctOfCanvas ?? DEFAULT_CAMERA_CONFIG.spritePctOfCanvas;

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
          Controls how the camera zooms to keep sprites at a target size during each race phase.
          Higher percentage means sprites appear larger (closer camera). The zoom is calculated
          inversely so the same percentage produces the same sprite size on any track.
        </p>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Overview sprite size (% of canvas)
              <InfoTooltip
                text={`Target sprite size during the overview shot that shows the whole field. Also used as the minimum floor so sprites never shrink below this size. Value: ${(pct.overview * 100).toFixed(1)}%.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.02}
              max={0.1}
              step={0.005}
              value={pct.overview}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.02 && v <= 0.1) setPct('overview', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Leader sprite size (% of canvas)
              <InfoTooltip
                text={`Target sprite size when the camera follows the leading group. Higher = more zoomed in on the leader. Value: ${(pct.leader * 100).toFixed(1)}%.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.06}
              max={0.16}
              step={0.005}
              value={pct.leader}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.06 && v <= 0.16) setPct('leader', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Battle sprite size (% of canvas)
              <InfoTooltip
                text={`Target sprite size during close duels at the front. Higher = more dramatic close-up on the battle. Value: ${(pct.battle * 100).toFixed(1)}%.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.08}
              max={0.2}
              step={0.005}
              value={pct.battle}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.08 && v <= 0.2) setPct('battle', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Comeback sprite size (% of canvas)
              <InfoTooltip
                text={`Target sprite size when showing a last-place comeback story. Lower than leader keeps the comeback shot subtler. Value: ${(pct.comeback * 100).toFixed(1)}%.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.04}
              max={0.12}
              step={0.005}
              value={pct.comeback}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.04 && v <= 0.12) setPct('comeback', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Battle trigger threshold
              <InfoTooltip
                text={`How close the top 2 racers must be (as fraction of track progress) to trigger the battle-zoom camera. Lower = only fires on very tight duels. Higher = fires more often. Value: ${config.battleGapThreshold}.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0.02}
              max={0.2}
              step={0.01}
              value={config.battleGapThreshold}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.02 && v <= 0.2) set('battleGapThreshold', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Camera state duration (ms)
              <InfoTooltip
                text={`How long the camera holds a zoom state before considering a switch. Lower = more reactive camera that cuts faster. Higher = steadier camera. Value: ${config.maxStateDuration} ms.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={2000}
              max={12000}
              step={500}
              value={config.maxStateDuration}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 2000 && v <= 12000) set('maxStateDuration', v);
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
                text={`When the leader passes this fraction of the track, the camera locks onto them for the final stretch. Lower = endgame tension starts earlier. Higher = camera waits until very close to the finish. Value: ${config.endgameThreshold}.`}
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
        </div>
      </div>
    </div>
  );
}

export default CameraZoomTuningSection;
