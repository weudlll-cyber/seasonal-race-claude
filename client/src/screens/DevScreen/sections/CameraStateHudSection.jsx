// ============================================================
// File:        CameraStateHudSection.jsx
// Path:        client/src/screens/DevScreen/sections/CameraStateHudSection.jsx
// Project:     RaceArena
// Created:     2026-05-05
// Description: Tier-2 dev-panel toggle for the camera-state HUD overlay.
// ============================================================

import { useState, useEffect } from 'react';
import { loadCameraConfig, saveCameraConfig } from '../../../modules/cameraConfig.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import s from '../DevScreen.module.css';

function CameraStateHudSection() {
  const [config, setConfig] = useState(() => loadCameraConfig());

  useEffect(() => {
    saveCameraConfig(config);
  }, [config]);

  function toggleHud(e) {
    setConfig((prev) => ({ ...prev, showCameraStateHud: e.target.checked }));
  }

  function toggleDiagnostics(e) {
    setConfig((prev) => ({ ...prev, showCameraDiagnostics: e.target.checked }));
  }

  function toggleRpDiag(e) {
    setConfig((prev) => ({ ...prev, showRpDiag: e.target.checked }));
  }

  function toggleFrameLog(e) {
    setConfig((prev) => ({ ...prev, enableFrameLog: e.target.checked }));
  }

  function toggleStateOverlay(e) {
    setConfig((prev) => ({ ...prev, stateOverlayEnabled: e.target.checked }));
  }

  function handleOverlayDuration(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 500 || v > 10000) return;
    setConfig((prev) => ({ ...prev, stateOverlayDurationMs: v }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── State overlay text ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Shows a short narrative text at the bottom of the screen during the first seconds of
          OVERVIEW, BATTLE, and COMEBACK camera states — e.g. &ldquo;Aktuell führt Max&rdquo;. Text
          is randomly chosen from a pool and avoids repeating the same template twice in a row for
          the same state.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
            marginBottom: '0.75rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="state-overlay-toggle"
            checked={config.stateOverlayEnabled ?? true}
            onChange={toggleStateOverlay}
          />
          <span style={{ fontWeight: 600 }}>Einblende-Texte aktivieren</span>
          <InfoTooltip text="Blendet kurze kontextuelle Texte (z.B. 'Aktuell führt Max') beim Eintritt in OVERVIEW, BATTLE und COMEBACK ein. Nach der konfigurierten Dauer wird der Text weich ausgeblendet. Bei vorzeitigem State-Wechsel verschwindet der Text sofort." />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
          }}
        >
          <span style={{ minWidth: '10rem' }}>Einblende-Dauer (ms)</span>
          <input
            type="number"
            data-testid="state-overlay-duration"
            min={500}
            max={10000}
            step={100}
            value={config.stateOverlayDurationMs ?? 3500}
            onChange={handleOverlayDuration}
            style={{ width: '5rem' }}
          />
          <InfoTooltip text="Dauer in Millisekunden, wie lange der Einblende-Text sichtbar bleibt (500–10000 ms). Default: 3500 ms." />
        </label>
      </div>

      {/* ── Camera state HUD indicator ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Shows the current camera state (OVERVIEW, FOLLOWING LEADER, BATTLE, etc.) as a small
          overlay in the top-left corner of the race screen. Useful for operators and stream viewers
          who want to follow the TV-camera logic.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="cam-hud-toggle"
            checked={config.showCameraStateHud ?? true}
            onChange={toggleHud}
          />
          <span style={{ fontWeight: 600 }}>Show camera state HUD</span>
          <InfoTooltip text="Display the camera-state indicator on the race screen. Enabled by default — visible to operators and stream viewers. The indicator fades between states and is colour-coded per state." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Diagnostic overlay (bottom-left) showing live camera zoom values and final sprite pixel
          size. Also logs every camera state transition with reason to the browser console. Default
          off — enable only when diagnosing camera behavior.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="cam-diagnostics-toggle"
            checked={config.showCameraDiagnostics ?? false}
            onChange={toggleDiagnostics}
          />
          <span style={{ fontWeight: 600 }}>Show camera diagnostics</span>
          <InfoTooltip text="Temporary diagnostic tool: shows worldW, refPx, live cam.zoom, and computed finalPx in a bottom-left overlay. Logs every camera state transition with reason, gap01, and leaderProgress to the browser console. Remove after diagnosis." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Race-Plan diagnostic overlay (top-right corner of the race canvas). Shows live phase,
          elapsed time, re-roll status (ACTIVE / FROZEN), spreadFactor min/max/mean, and
          trajectoryMult range during the OUTCOME phase. Only appears when Race Plan is active.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="rp-diag-toggle"
            checked={config.showRpDiag ?? false}
            onChange={toggleRpDiag}
          />
          <span style={{ fontWeight: 600 }}>Show Race Plan diagnostics</span>
          <InfoTooltip text="Zeigt ein kleines Panel oben rechts im Renn-Canvas: Phase (PRE_PULK/PULK/TRANSITION/OUTCOME/FINAL), Laufzeit, Re-Roll-Status, spreadFactor-Spanne und im OUTCOME auch trajectoryMult-Spanne. Nur sichtbar wenn Race Plan aktiv ist." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Records every frame&apos;s pan/zoom/T values into a 600-frame ring buffer (≈10 s @ 60
          fps). Use the <strong>Export Log</strong> button that appears on the race screen to
          download a JSON file for jitter post-analysis. Default off — has minor per-frame
          allocation overhead.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
          }}
        >
          <input
            type="checkbox"
            data-testid="cam-frame-log-toggle"
            checked={config.enableFrameLog ?? false}
            onChange={toggleFrameLog}
          />
          <span style={{ fontWeight: 600 }}>Enable frame log</span>
          <InfoTooltip text="Activates the per-frame camera ring buffer. When enabled, an Export Log button appears on the race screen — click it after observing jitter to download the log for CC analysis. Drop the downloaded file in client/tmp/camera-logs/ and share the path with CC." />
        </label>
      </div>
    </div>
  );
}

export default CameraStateHudSection;
