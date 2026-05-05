// ============================================================
// File:        CameraZoomTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Dev-Screen tuning UI for camera zoom multipliers (§6.2).
//              Controls how dramatic zoom states feel between race phases.
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

  function handleReset() {
    setConfig((prev) => ({
      ...prev,
      leaderZoomMultiplier: DEFAULT_CAMERA_CONFIG.leaderZoomMultiplier,
      battleZoomMultiplier: DEFAULT_CAMERA_CONFIG.battleZoomMultiplier,
      comebackZoomMultiplier: DEFAULT_CAMERA_CONFIG.comebackZoomMultiplier,
      openTrackBaseZoom: DEFAULT_CAMERA_CONFIG.openTrackBaseZoom,
      battleGapThreshold: DEFAULT_CAMERA_CONFIG.battleGapThreshold,
      maxStateDuration: DEFAULT_CAMERA_CONFIG.maxStateDuration,
      endgameThreshold: DEFAULT_CAMERA_CONFIG.endgameThreshold,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Camera Zoom Tuning</span>
          <span className={s.spacer} />
          <button
            onClick={handleReset}
            data-testid="reset-camera-zoom-tuning"
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
            Reset Camera Zoom Tuning
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Controls how dramatic camera zoom feels between race phases. Higher values make the
          difference between &ldquo;see everyone&rdquo; and &ldquo;follow the leader&rdquo; more
          striking. Sprite size range above limits how far these can actually push the camera.
        </p>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Leader zoom strength
              <InfoTooltip
                text={`How much the camera zooms in when following the leading group. Higher = closer, more focused on the front. Lower = wider view. Value: ${config.leaderZoomMultiplier}×.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1.0}
              max={3.0}
              step={0.1}
              value={config.leaderZoomMultiplier}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1.0 && v <= 3.0) set('leaderZoomMultiplier', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Battle zoom strength
              <InfoTooltip
                text={`How much the camera zooms in during close duels at the front. Higher = more dramatic, fills the screen with the battle. Lower = less dramatic. Value: ${config.battleZoomMultiplier}×.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1.0}
              max={4.0}
              step={0.1}
              value={config.battleZoomMultiplier}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1.0 && v <= 4.0) set('battleZoomMultiplier', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Comeback zoom strength
              <InfoTooltip
                text={`How much the camera zooms when showing a last-place comeback story. Higher = more focused on the comeback racer. Lower = subtler. Value: ${config.comebackZoomMultiplier}×.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1.0}
              max={3.0}
              step={0.1}
              value={config.comebackZoomMultiplier}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1.0 && v <= 3.0) set('comebackZoomMultiplier', v);
              }}
            />
          </div>

          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Open track base zoom
              <InfoTooltip
                text={`Base zoom level for open tracks (River Run, Space Sprint). All other zoom multipliers scale from this value. Higher = closer baseline view. Value: ${config.openTrackBaseZoom}×.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1.0}
              max={3.0}
              step={0.1}
              value={config.openTrackBaseZoom}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1.0 && v <= 3.0) set('openTrackBaseZoom', v);
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
