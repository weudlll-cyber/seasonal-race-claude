// ============================================================
// File:        NameTagVisibilitySection.jsx
// Path:        client/src/screens/DevScreen/sections/NameTagVisibilitySection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Dev-Screen tuning UI for name-tag visibility (§6.3).
//              Controls how many name tags appear during the race.
// ============================================================

import { useState, useEffect } from 'react';
import {
  loadCameraConfig,
  saveCameraConfig,
  DEFAULT_CAMERA_CONFIG,
} from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function NameTagVisibilitySection() {
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
      nameTagFrameFrac: DEFAULT_CAMERA_CONFIG.nameTagFrameFrac,
      nameTagMarginPx: DEFAULT_CAMERA_CONFIG.nameTagMarginPx,
      nameTagAllUntilMs: DEFAULT_CAMERA_CONFIG.nameTagAllUntilMs,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Name Tag Visibility</span>
          <span className={s.spacer} />
          <button
            onClick={handleReset}
            data-testid="reset-nametag-visibility"
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
            Reset Name Tag Visibility
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Every racer on screen is offered a name tag; a tag is dropped only when it would land on
          one that is already there, so what you see is always readable and the COUNT follows the
          picture rather than a setting. All names are shown during the countdown and for the first
          seconds of the race — long enough to find your racer — and after the race ends.
        </p>

        <div className={s.formGrid}>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Name size (% of frame)
              <InfoTooltip
                text={`How big a name tag is drawn, as a share of the frame height — the same size on screen at every zoom and on every track. ${((config.nameTagFrameFrac ?? 0.022) * 100).toFixed(1)}% = ${Math.round((config.nameTagFrameFrac ?? 0.022) * 720)} px on a 720-tall frame. Bigger names are easier to read but collide sooner, so fewer of them fit.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={1.0}
              max={5.0}
              step={0.1}
              value={Math.round((config.nameTagFrameFrac ?? 0.022) * 1000) / 10}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1.0 && v <= 5.0) set('nameTagFrameFrac', v / 100);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Gap above racer (px)
              <InfoTooltip
                text={`The breathing space between the top of a racer and the bottom of its tag. The rest of the distance is not a setting: a tag sits half the racer's DRAWN height above its centre, so the gap follows the RACER — a bigger racer gets a bigger gap, on every track and at every zoom, with no per-track number. This margin is only the space above that edge, and it exists because the drawn height measures the racer's narrow body while a neck or a fin reaches past it. Value: ${config.nameTagMarginPx ?? 6} px.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              data-testid="nametag-margin-px"
              min={0}
              max={40}
              step={1}
              value={config.nameTagMarginPx ?? 6}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 40) set('nameTagMarginPx', v);
              }}
            />
          </div>
          <div className={s.formGroup}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Show all names for (s)
              <InfoTooltip
                text={`How long after the gun EVERY name stays visible, so a spectator can find their racer once. Default 8 s: measured, not chosen — while the field is still a block, decluttering would drop 10-22% of the names, worst about 4 s in; by 8 s it drops essentially none, so the handover is invisible. Note the camera's own start hold ends at 3 s, which is too early. Value: ${((config.nameTagAllUntilMs ?? 8000) / 1000).toFixed(1)} s.`}
              />
            </label>
            <input
              type="number"
              className={s.input}
              min={0}
              max={30}
              step={0.5}
              value={(config.nameTagAllUntilMs ?? 8000) / 1000}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 30) set('nameTagAllUntilMs', Math.round(v * 1000));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NameTagVisibilitySection;
