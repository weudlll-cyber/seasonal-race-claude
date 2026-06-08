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

  function toggleRpWinnerList(e) {
    setConfig((prev) => ({ ...prev, showRpWinnerList: e.target.checked }));
  }

  function toggleRpMinimapBadges(e) {
    setConfig((prev) => ({ ...prev, showRpMinimapBadges: e.target.checked }));
  }

  function toggleRpStartRow(e) {
    setConfig((prev) => ({ ...prev, showRpStartRow: e.target.checked }));
  }

  function toggleTop10SpeedMonitor(e) {
    setConfig((prev) => ({ ...prev, showTop10SpeedMonitor: e.target.checked }));
  }

  function toggleFrameLog(e) {
    setConfig((prev) => ({ ...prev, enableFrameLog: e.target.checked }));
  }

  function togglePerfLog(e) {
    setConfig((prev) => ({ ...prev, enablePerfLog: e.target.checked }));
  }

  function toggleBattleDiag(e) {
    setConfig((prev) => ({ ...prev, showBattleDiag: e.target.checked }));
  }

  function toggleComebackDiag(e) {
    setConfig((prev) => ({ ...prev, showComebackDiag: e.target.checked }));
  }

  function toggleLeadChangeDiag(e) {
    setConfig((prev) => ({ ...prev, showLeadChangeDiag: e.target.checked }));
  }

  function handleLeadChangeMinGap(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0.001 || v > 0.01) return;
    setConfig((prev) => ({ ...prev, leadChangeMinGap: v }));
  }

  function handleLeadChangeDebounceMs(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 200 || v > 2000) return;
    setConfig((prev) => ({ ...prev, leadChangeDebounceMs: v }));
  }

  function handleLeadChangeMinDuration(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 1 || v > 5) return;
    setConfig((prev) => ({ ...prev, leadChangeMinDuration: v }));
  }

  function handleComebackMinPositionsGained(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 2 || v > 10) return;
    setConfig((prev) => ({ ...prev, comebackMinPositionsGained: v }));
  }

  function handleComebackWindowSec(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 1 || v > 10) return;
    setConfig((prev) => ({ ...prev, comebackWindowSec: v }));
  }

  function handleComebackMinDuration(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 1 || v > 5) return;
    setConfig((prev) => ({ ...prev, comebackMinDuration: v }));
  }

  function handleSlowmoFactor(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0.2 || v > 1.0) return;
    setConfig((prev) => ({ ...prev, battleSlowmoFactor: v }));
  }

  function handleSlowmoMinDuration(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 1.0 || v > 5.0) return;
    setConfig((prev) => ({ ...prev, battleSlowmoMinDuration: v }));
  }

  function handleSlowmoFadeDuration(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0.0 || v > 1.0) return;
    setConfig((prev) => ({ ...prev, battleSlowmoFadeDuration: v }));
  }

  function handleFocusDarkening(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0.0 || v > 1.0) return;
    setConfig((prev) => ({ ...prev, battleFocusDarkening: v }));
  }

  function handleBattleIsolationThresholdPx(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 0 || v > 500) return;
    setConfig((prev) => ({ ...prev, battleIsolationThresholdPx: v }));
  }

  function handleBattleMaxGroupSize(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 3 || v > 6) return;
    setConfig((prev) => ({ ...prev, battleMaxGroupSize: v }));
  }

  function toggleStateOverlay(e) {
    setConfig((prev) => ({ ...prev, stateOverlayEnabled: e.target.checked }));
  }

  function handleOverlayDuration(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 500 || v > 10000) return;
    setConfig((prev) => ({ ...prev, stateOverlayDurationMs: v }));
  }

  function handleBattleWeight(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0 || v > 1) return;
    setConfig((prev) => ({ ...prev, battleWeight: v }));
  }

  function handleLeadChangeWeight(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0 || v > 1) return;
    setConfig((prev) => ({ ...prev, leadChangeWeight: v }));
  }

  function handleComebackWeight(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0 || v > 1) return;
    setConfig((prev) => ({ ...prev, comebackWeight: v }));
  }

  function handleOverviewWeight(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v) || v < 0 || v > 1) return;
    setConfig((prev) => ({ ...prev, overviewWeight: v }));
  }

  function handleComebackCooldownMs(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 1000 || v > 30000) return;
    setConfig((prev) => ({ ...prev, comebackCooldownMs: v }));
  }

  function handleLeadChangeCooldownMs(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 1000 || v > 30000) return;
    setConfig((prev) => ({ ...prev, leadChangeCooldownMs: v }));
  }

  function handleOverviewCooldownMs(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 5000 || v > 60000) return;
    setConfig((prev) => ({ ...prev, overviewCooldownMs: v }));
  }

  function handleOverviewTargetCount(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 1 || v > 5) return;
    setConfig((prev) => ({ ...prev, overviewTargetCount: v }));
  }

  function handleOverviewStartDelay(e) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 5 || v > 30) return;
    setConfig((prev) => ({ ...prev, overviewStartDelay: v }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── State overlay text ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Shows a short narrative text at the bottom of the screen during the first seconds of
          OVERVIEW, BATTLE, and COMEBACK camera states — e.g. &ldquo;Currently leading: Max&rdquo;.
          Text is randomly chosen from a pool and avoids repeating the same template twice in a row
          for the same state.
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
          <span style={{ fontWeight: 600 }}>Enable overlay texts</span>
          <InfoTooltip text="Shows short contextual overlay texts (e.g. 'Currently leading: Max') on entry into OVERVIEW, BATTLE, and COMEBACK. Fades out after the configured duration. Disappears immediately on early state change." />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
          }}
        >
          <span style={{ minWidth: '10rem' }}>Overlay duration (ms)</span>
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
          <InfoTooltip text="Duration in milliseconds the overlay text remains visible (500–10000 ms). Default: 3500 ms." />
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
          <InfoTooltip text="Shows a small panel top-right in the race canvas: phase (PRE_PULK/PULK/TRANSITION/OUTCOME/FINAL), elapsed time, re-roll status, spreadFactor range, and in OUTCOME also trajectoryMult range. Only visible when Race Plan is active." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          B1 winner list: shows the 5 planned top finishers (targetRank 1–5) with their current rank
          and delta. Only visible when Race Plan is active.
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
            data-testid="rp-winner-list-toggle"
            checked={config.showRpWinnerList ?? false}
            onChange={toggleRpWinnerList}
          />
          <span style={{ fontWeight: 600 }}>Show B1 Winner List</span>
          <InfoTooltip text="Shows a panel top-left with the 5 race-plan favourites (targetRank 1–5): name, target rank, current rank, delta. Green = ≤1 position off, Yellow = ≤5, Red = >5. Only when Race Plan is active." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Minimap badges: marks the 5 race-plan favourites (targetRank 1–5) on the minimap with a
          gold ring.
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
            data-testid="rp-minimap-badges-toggle"
            checked={config.showRpMinimapBadges ?? false}
            onChange={toggleRpMinimapBadges}
          />
          <span style={{ fontWeight: 600 }}>Show Minimap Badges</span>
          <InfoTooltip text="Draws a gold ring around the 5 race-plan favourites (targetRank 1–5) in the minimap. Makes it easy to visually track the planned top finishers during the race." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Start-row label: appends the start row to every racer&apos;s name tag (e.g. &ldquo;Max
          (R2)&rdquo;). Useful for visually verifying start-row effects.
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
            data-testid="rp-startrow-toggle"
            checked={config.showRpStartRow ?? false}
            onChange={toggleRpStartRow}
          />
          <span style={{ fontWeight: 600 }}>Show Start-Row in Name Tags</span>
          <InfoTooltip text="Appends the start row to the name tag (e.g. 'Max (R2)'). Visible on all name tags that are already shown. Use to verify that row bonus and start-row effects work correctly." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Top-10 speed monitor: shows the current trajectoryMult value for the top-10 racers, plus
          min/max over the last 5 seconds. Warning indicator on oscillation (&Delta; &gt; 0.18).
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
            data-testid="top10-speed-monitor-toggle"
            checked={config.showTop10SpeedMonitor ?? false}
            onChange={toggleTop10SpeedMonitor}
          />
          <span style={{ fontWeight: 600 }}>Show Top-10 Speed Monitor</span>
          <InfoTooltip text="Panel top-left (below winner list): top-10 racers with name, current trajectoryMult, min/max over last 5 s, and delta. Red on oscillation (Δ>0.18), yellow at Δ>0.10, green otherwise. Only when Race Plan is active." />
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

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Per-frame phase timing: breaks each frame into physics / prep / camera / render / other
          (ms). Shows live P50/P90/P99/max stats and the 50 worst spike frames. Use to find the REAL
          cause of visible stutter before optimising. Default off — takes effect on the next race.
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
            data-testid="perf-log-toggle"
            checked={config.enablePerfLog ?? false}
            onChange={togglePerfLog}
          />
          <span style={{ fontWeight: 600 }}>Enable perf log</span>
          <InfoTooltip text="Adds a timing HUD (top-left) showing physics/camera/render/other ms per frame, P50/P90/P99/max, and the 50 worst spike frames. Export via the Copy or Download buttons. Off by default. Takes effect on the next race — toggle before starting." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          BATTLE diagnostics: shows live when a BATTLE event is detected, which racers are involved,
          and which racer the camera is locked on. Default off.
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
            data-testid="battle-diag-toggle"
            checked={config.showBattleDiag ?? false}
            onChange={toggleBattleDiag}
          />
          <span style={{ fontWeight: 600 }}>Show BATTLE diagnostics</span>
          <InfoTooltip text="Shows a panel bottom-left in the race canvas: BATTLE status (ACTIVE/idle), involved racers, and which racer the camera is locked on. Also shows whether the pulk is still active (Pulk now ✓/✗). For diagnostics only — default off." />
        </label>
      </div>

      {/* ── COMEBACK camera ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          COMEBACK camera: detects B1 racers (targetRank 1–5) actively gaining positions in the
          OUTCOME phase. Requires Race Plan (open track ≥ 60 s only). BATTLE takes priority.
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
            data-testid="comeback-diag-toggle"
            checked={config.showComebackDiag ?? false}
            onChange={toggleComebackDiag}
          />
          <span style={{ fontWeight: 600 }}>Show COMEBACK diagnostics</span>
          <InfoTooltip text="Shows a panel in the race canvas: OUTCOME phase, B1 racers with current rank and rank gain in the time window, actively locked comeback racer. Default off." />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. positions gained</span>
            <input
              type="range"
              data-testid="comeback-min-positions"
              min={2}
              max={10}
              step={1}
              value={config.comebackMinPositionsGained ?? 3}
              onChange={handleComebackMinPositionsGained}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {config.comebackMinPositionsGained ?? 3}
            </span>
            <InfoTooltip text="Minimum positions gained within the time window to trigger COMEBACK. Default 3." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Time window (s)</span>
            <input
              type="range"
              data-testid="comeback-window-sec"
              min={1}
              max={10}
              step={0.5}
              value={config.comebackWindowSec ?? 5}
              onChange={handleComebackWindowSec}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.comebackWindowSec ?? 5).toFixed(1)}s
            </span>
            <InfoTooltip text="Time window in seconds for rank measurement. Positions gained = rank N seconds ago minus current rank. Default 5 s." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. observation duration (s)</span>
            <input
              type="range"
              data-testid="comeback-min-duration"
              min={1}
              max={5}
              step={0.5}
              value={config.comebackMinDuration ?? 3}
              onChange={handleComebackMinDuration}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.comebackMinDuration ?? 3).toFixed(1)}s
            </span>
            <InfoTooltip text="Minimum duration in seconds the camera stays on the racer after COMEBACK entry. Default 3 s." />
          </label>
        </div>
      </div>

      {/* ── LEAD_CHANGE camera ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          LEAD_CHANGE camera: detects stable lead changes (double hysteresis: gap + debounce) and
          briefly switches from LEADER_ZOOM to LEAD_CHANGE view. BATTLE takes priority.
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
            data-testid="lead-change-diag-toggle"
            checked={config.showLeadChangeDiag ?? false}
            onChange={toggleLeadChangeDiag}
          />
          <span style={{ fontWeight: 600 }}>Show LEAD_CHANGE diagnostics</span>
          <InfoTooltip text="Shows a panel in the race canvas: current and previous leader, pending status, minGap and debounce settings. Default off." />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. gap (T-space)</span>
            <input
              type="range"
              data-testid="lead-change-min-gap"
              min={0.001}
              max={0.01}
              step={0.001}
              value={config.leadChangeMinGap ?? 0.002}
              onChange={handleLeadChangeMinGap}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '3.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.leadChangeMinGap ?? 0.002).toFixed(3)}
            </span>
            <InfoTooltip text="Minimum T-space gap between P1 and P2 for a stable lead reading. Too small = flicker, too large = change detected late. Default 0.002." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Debounce (ms)</span>
            <input
              type="range"
              data-testid="lead-change-debounce-ms"
              min={200}
              max={2000}
              step={50}
              value={config.leadChangeDebounceMs ?? 800}
              onChange={handleLeadChangeDebounceMs}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '3.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {config.leadChangeDebounceMs ?? 800}ms
            </span>
            <InfoTooltip text="Duration in ms the new leader must hold the lead before the change is confirmed. Prevents flicker in close duels. Default 800 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. observation duration (s)</span>
            <input
              type="range"
              data-testid="lead-change-min-duration"
              min={1}
              max={5}
              step={0.5}
              value={config.leadChangeMinDuration ?? 1.5}
              onChange={handleLeadChangeMinDuration}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.leadChangeMinDuration ?? 1.5).toFixed(1)}s
            </span>
            <InfoTooltip text="Minimum duration in seconds the camera stays on the new leader after LEAD_CHANGE entry. Default 1.5 s." />
          </label>
        </div>
      </div>

      {/* ── Director: weighted random selection ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Director: candidate pool with weighted random selection. All active events (BATTLE,
          LEAD_CHANGE, COMEBACK, OVERVIEW) enter the pool with their weights; the director selects
          probabilistically. Mandatory states (Start, Endgame, Finish) are unaffected.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>BATTLE weight</span>
            <input
              type="range"
              data-testid="regie-battle-weight"
              min={0}
              max={1}
              step={0.05}
              value={config.battleWeight ?? 0.8}
              onChange={handleBattleWeight}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.battleWeight ?? 0.8).toFixed(2)}
            </span>
            <InfoTooltip text="Selection weight for BATTLE_ZOOM in the candidate pool. Higher = chosen more often when other events are active simultaneously. Default 0.80." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>LEAD_CHANGE weight</span>
            <input
              type="range"
              data-testid="regie-lead-change-weight"
              min={0}
              max={1}
              step={0.05}
              value={config.leadChangeWeight ?? 0.7}
              onChange={handleLeadChangeWeight}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.leadChangeWeight ?? 0.7).toFixed(2)}
            </span>
            <InfoTooltip text="Selection weight for LEAD_CHANGE in the candidate pool. Default 0.70." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>COMEBACK weight</span>
            <input
              type="range"
              data-testid="regie-comeback-weight"
              min={0}
              max={1}
              step={0.05}
              value={config.comebackWeight ?? 0.6}
              onChange={handleComebackWeight}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.comebackWeight ?? 0.6).toFixed(2)}
            </span>
            <InfoTooltip text="Selection weight for COMEBACK_ZOOM in the candidate pool. Default 0.60." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW weight</span>
            <input
              type="range"
              data-testid="regie-overview-weight"
              min={0}
              max={1}
              step={0.05}
              value={config.overviewWeight ?? 0.3}
              onChange={handleOverviewWeight}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.overviewWeight ?? 0.3).toFixed(2)}
            </span>
            <InfoTooltip text="Selection weight for OVERVIEW in the candidate pool. Default 0.30." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>COMEBACK cooldown (ms)</span>
            <input
              type="range"
              data-testid="regie-comeback-cooldown-ms"
              min={1000}
              max={30000}
              step={1000}
              value={config.comebackCooldownMs ?? 10000}
              onChange={handleComebackCooldownMs}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '3.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {((config.comebackCooldownMs ?? 10000) / 1000).toFixed(0)}s
            </span>
            <InfoTooltip text="Minimum pause in ms after leaving COMEBACK_ZOOM before COMEBACK re-enters the pool. Default 10 000 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>LEAD_CHANGE cooldown (ms)</span>
            <input
              type="range"
              data-testid="regie-lead-change-cooldown-ms"
              min={1000}
              max={30000}
              step={1000}
              value={config.leadChangeCooldownMs ?? 5000}
              onChange={handleLeadChangeCooldownMs}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '3.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {((config.leadChangeCooldownMs ?? 5000) / 1000).toFixed(0)}s
            </span>
            <InfoTooltip text="Minimum pause in ms after leaving LEAD_CHANGE before LEAD_CHANGE re-enters the pool. Default 5 000 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW cooldown (ms)</span>
            <input
              type="range"
              data-testid="regie-overview-cooldown-ms"
              min={5000}
              max={60000}
              step={1000}
              value={config.overviewCooldownMs ?? 15000}
              onChange={handleOverviewCooldownMs}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '3.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {((config.overviewCooldownMs ?? 15000) / 1000).toFixed(0)}s
            </span>
            <InfoTooltip text="Minimum pause in ms after leaving OVERVIEW before OVERVIEW re-enters the pool. Default 15 000 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW target count</span>
            <input
              type="range"
              data-testid="regie-overview-target-count"
              min={1}
              max={5}
              step={1}
              value={config.overviewTargetCount ?? 2}
              onChange={handleOverviewTargetCount}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {config.overviewTargetCount ?? 2}
            </span>
            <InfoTooltip text="Target number of OVERVIEW cuts per race. The scheduler distributes the interval evenly over the estimated race duration. Default 2." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW start delay (s)</span>
            <input
              type="range"
              data-testid="regie-overview-start-delay"
              min={5}
              max={30}
              step={1}
              value={config.overviewStartDelay ?? 15}
              onChange={handleOverviewStartDelay}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {config.overviewStartDelay ?? 15}s
            </span>
            <InfoTooltip text="Seconds after race start before OVERVIEW may appear in the pool for the first time. Default 15 s." />
          </label>
        </div>
      </div>

      {/* ── BATTLE slowmotion ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          BATTLE slowmotion: slows physics (racer movement, re-rolls, trajectory) while BATTLE_ZOOM
          is active. The camera stays at normal speed. Sprite animations (wing flap) slow down too.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Slowmo factor</span>
            <input
              type="range"
              data-testid="battle-slowmo-factor"
              min={0.2}
              max={1.0}
              step={0.05}
              value={config.battleSlowmoFactor ?? 0.5}
              onChange={handleSlowmoFactor}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.battleSlowmoFactor ?? 0.5).toFixed(2)}
            </span>
            <InfoTooltip text="Physics speed during BATTLE_ZOOM. 1.0 = normal, 0.5 = half speed, 0.2 = very slow. Default 0.5." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. duration (s)</span>
            <input
              type="range"
              data-testid="battle-slowmo-min-duration"
              min={1.0}
              max={5.0}
              step={0.5}
              value={config.battleSlowmoMinDuration ?? 2.0}
              onChange={handleSlowmoMinDuration}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.battleSlowmoMinDuration ?? 2.0).toFixed(1)}s
            </span>
            <InfoTooltip text="Minimum duration in seconds the slowmo effect persists after BATTLE_ZOOM ends before fading out. Default 2.0s." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Fade duration (s)</span>
            <input
              type="range"
              data-testid="battle-slowmo-fade-duration"
              min={0.0}
              max={1.0}
              step={0.05}
              value={config.battleSlowmoFadeDuration ?? 0.3}
              onChange={handleSlowmoFadeDuration}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.battleSlowmoFadeDuration ?? 0.3).toFixed(2)}s
            </span>
            <InfoTooltip text="Duration of slowmo effect fade-in and fade-out in seconds. 0 = instant switch. Default 0.3s." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Focus darkening</span>
            <input
              type="range"
              data-testid="battle-focus-darkening"
              min={0.0}
              max={1.0}
              step={0.05}
              value={config.battleFocusDarkening ?? 0.4}
              onChange={handleFocusDarkening}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {(config.battleFocusDarkening ?? 0.4).toFixed(2)}
            </span>
            <InfoTooltip text="Dimming (brightness) of non-BATTLE racers during BATTLE_ZOOM. 0 = no effect, 1 = completely black. Fades in/out synchronised with slowmo. Default 0.4." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Isolation (px)</span>
            <input
              type="range"
              data-testid="battle-isolation-threshold-px"
              min={0}
              max={500}
              step={10}
              value={config.battleIsolationThresholdPx ?? 0}
              onChange={handleBattleIsolationThresholdPx}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {config.battleIsolationThresholdPx ?? 0}px
            </span>
            <InfoTooltip text="Minimum gap (px) between each group racer and each non-group racer. 0 = disabled (default). Recommendation: 1.5 × pulk threshold (e.g. 300 px)." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Max. group size</span>
            <input
              type="range"
              data-testid="battle-max-group-size"
              min={3}
              max={6}
              step={1}
              value={config.battleMaxGroupSize ?? 6}
              onChange={handleBattleMaxGroupSize}
              style={{ width: '8rem' }}
            />
            <span style={{ minWidth: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
              {config.battleMaxGroupSize ?? 6}
            </span>
            <InfoTooltip text="Maximum number of racers in the BATTLE group (3–6). The group can be smaller if not enough racers meet the criteria. Default 6." />
          </label>
        </div>
      </div>
    </div>
  );
}

export default CameraStateHudSection;
