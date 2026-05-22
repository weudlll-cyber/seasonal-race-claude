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
          B1-Gewinnerliste: zeigt die 5 geplanten Top-Finisher (sollRank 1–5) mit ihrem aktuellen
          Rang und der Abweichung (Delta). Nur sichtbar wenn Race Plan aktiv ist.
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
          <InfoTooltip text="Zeigt ein Panel oben links mit den 5 Race-Plan-Favoriten (sollRank 1–5): Name, Sollrang, aktueller Rang, Delta. Grün = ≤1 Platz Abweichung, Gelb = ≤5, Rot = >5. Nur wenn Race Plan aktiv." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Minimap-Badges: markiert die 5 Race-Plan-Favoriten (sollRank 1–5) auf der Minimap mit
          einem goldenen Ring.
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
          <InfoTooltip text="Zeichnet einen goldenen Ring um die 5 Race-Plan-Favoriten (sollRank 1–5) in der Minimap. Erleichtert das visuelle Tracking der geplanten Top-Finisher während des Rennens." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Startreihen-Label: ergänzt den Namen-Tag jedes Rennfahrers um seine Startreihe (z.B.
          &ldquo;Max (R2)&rdquo;). Hilfreich um Start-Row-Effekte visuell zu prüfen.
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
          <InfoTooltip text="Hängt die Startreihe an den Namen-Tag an (z.B. 'Max (R2)'). Sichtbar bei allen Name-Tags die ohnehin eingeblendet werden. Zum Prüfen ob Reihen-Bonus und Startreihen-Effekte korrekt wirken." />
        </label>
      </div>

      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Top-10-Geschwindigkeitsmonitor: zeigt für die Top-10 Fahrer den aktuellen
          trajectoryMult-Wert sowie Min/Max der letzten 5 Sekunden. Warnsymbol bei Oszillation (Δ
          &gt; 0.18).
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
          <InfoTooltip text="Panel oben links (unterhalb Winner-List): Top-10 Fahrer mit Name, aktuellem trajectoryMult, Min/Max der letzten 5s und Delta. Rot bei Oszillation (Δ>0.18), Gelb bei Δ>0.10, Grün sonst. Nur wenn Race Plan aktiv." />
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
          BATTLE-Diagnose: zeigt live an wann ein BATTLE-Event erkannt wird, welche Racer beteiligt
          sind, und auf welchen Racer die Kamera aktuell gelockt ist. Default off.
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
          <InfoTooltip text="Zeigt ein Panel unten links im Renn-Canvas: BATTLE Status (ACTIVE/idle), beteiligte Racer, und auf welchen Racer die Kamera gelockt ist. Auch zeigt ob der Pulk aktuell noch besteht (Pulk now ✓/✗). Nur für Diagnose — default off." />
        </label>
      </div>

      {/* ── COMEBACK Kamera ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          COMEBACK-Kamera: Erkennt B1-Racer (sollRank 1–5) die in der OUTCOME-Phase aktiv Plätze
          gutmachen. Benötigt Race Plan (nur Open-Track ≥ 60 s). BATTLE hat Vorrang.
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
          <InfoTooltip text="Zeigt ein Panel im Renn-Canvas: OUTCOME-Phase, B1-Racer mit aktuellem Rang und Rang-Gewinn im Zeitfenster, aktiv gesperrter Comeback-Racer. Default off." />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. Platzgewinn</span>
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
            <InfoTooltip text="Mindest-Platzgewinn innerhalb des Zeitfensters um COMEBACK auszulösen. Default 3." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Zeitfenster (s)</span>
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
            <InfoTooltip text="Zeitfenster in Sekunden für die Rang-Messung. Platzgewinn = Rang vor N Sekunden minus aktueller Rang. Default 5 s." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. Beobachtungsdauer (s)</span>
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
            <InfoTooltip text="Mindestdauer in Sekunden, die die Kamera nach COMEBACK-Eintritt auf dem Racer bleibt. Default 3 s." />
          </label>
        </div>
      </div>

      {/* ── LEAD_CHANGE Kamera ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          LEAD_CHANGE-Kamera: erkennt stabile Führungswechsel (Doppel-Hysterese: Abstand + Debounce)
          und wechselt kurz vom LEADER_ZOOM in die LEAD_CHANGE-Ansicht. BATTLE hat Vorrang.
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
          <InfoTooltip text="Zeigt ein Panel im Renn-Canvas: aktueller und vorheriger Anführer, Pending-Status, minGap und Debounce-Einstellungen. Default off." />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. Abstand (T-Space)</span>
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
            <InfoTooltip text="Mindest-T-Space-Abstand zwischen P1 und P2 für einen stabilen Führungslesewert. Zu klein = Flackern, zu groß = Wechsel wird spät erkannt. Default 0.002." />
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
            <InfoTooltip text="Dauer in ms, die der neue Anführer die Führung halten muss bevor der Wechsel als bestätigt gilt. Verhindert Flackern bei knappen Duellen. Default 800 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Min. Beobachtungsdauer (s)</span>
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
            <InfoTooltip text="Mindestdauer in Sekunden, die die Kamera nach LEAD_CHANGE-Eintritt auf dem neuen Anführer bleibt. Default 1.5 s." />
          </label>
        </div>
      </div>

      {/* ── Regie: Zufalls-Regisseur ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Regie: Kandidaten-Pool mit gewichtetem Zufalls-Regisseur. Alle aktiven Events (BATTLE,
          LEAD_CHANGE, COMEBACK, OVERVIEW) werden mit ihren Gewichten in einen Pool gelegt; der
          Regisseur wählt probabilistisch aus. Pflicht-States (Start, Endgame, Finish) bleiben
          unverändert.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>BATTLE-Gewicht</span>
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
            <InfoTooltip text="Selektionsgewicht für BATTLE_ZOOM im Kandidaten-Pool. Höher = wird öfter gewählt wenn gleichzeitig andere Events aktiv sind. Default 0.80." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>LEAD_CHANGE-Gewicht</span>
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
            <InfoTooltip text="Selektionsgewicht für LEAD_CHANGE im Kandidaten-Pool. Default 0.70." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>COMEBACK-Gewicht</span>
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
            <InfoTooltip text="Selektionsgewicht für COMEBACK_ZOOM im Kandidaten-Pool. Default 0.60." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW-Gewicht</span>
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
            <InfoTooltip text="Selektionsgewicht für OVERVIEW im Kandidaten-Pool. Default 0.30." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>COMEBACK-Cooldown (ms)</span>
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
            <InfoTooltip text="Mindest-Pause in ms nach dem Verlassen von COMEBACK_ZOOM bevor COMEBACK wieder im Pool erscheint. Default 10 000 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>LEAD_CHANGE-Cooldown (ms)</span>
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
            <InfoTooltip text="Mindest-Pause in ms nach dem Verlassen von LEAD_CHANGE bevor LEAD_CHANGE wieder im Pool erscheint. Default 5 000 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW-Cooldown (ms)</span>
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
            <InfoTooltip text="Mindest-Pause in ms nach dem Verlassen von OVERVIEW bevor OVERVIEW wieder im Pool erscheint. Default 15 000 ms." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW-Ziel-Anzahl</span>
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
            <InfoTooltip text="Ziel-Anzahl von OVERVIEW-Schnitten pro Rennen. Der Scheduler verteilt das Intervall gleichmäßig über die geschätzte Renndauer. Default 2." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>OVERVIEW-Startverzögerung (s)</span>
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
            <InfoTooltip text="Sekunden nach Rennstart, bevor OVERVIEW das erste Mal im Pool erscheinen darf. Default 15 s." />
          </label>
        </div>
      </div>

      {/* ── BATTLE Slowmotion ── */}
      <div className={s.card}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          BATTLE-Slowmotion: verlangsamt die Physik (Racer-Bewegung, Re-Rolls, Trajectory) während
          BATTLE_ZOOM aktiv ist. Die Kamera bleibt auf normaler Geschwindigkeit. Sprite-Animationen
          (Flügelschlag) verlangsamen ebenfalls.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Slowmo-Faktor</span>
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
            <InfoTooltip text="Physik-Geschwindigkeit während BATTLE_ZOOM. 1.0 = normal, 0.5 = halb so schnell, 0.2 = sehr langsam. Default 0.5." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Mindest-Dauer (s)</span>
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
            <InfoTooltip text="Mindestdauer in Sekunden, die der Slowmo-Effekt nach Ende von BATTLE_ZOOM noch anhält bevor er ausblendet. Default 2.0s." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Fade-Dauer (s)</span>
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
            <InfoTooltip text="Dauer des Ein- und Ausblendens des Slowmo-Effekts in Sekunden. 0 = sofortiger Wechsel. Default 0.3s." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Fokus-Abdunkelung</span>
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
            <InfoTooltip text="Abdunkelung (brightness) der Nicht-BATTLE-Racer während BATTLE_ZOOM. 0 = kein Effekt, 1 = komplett schwarz. Blendet synchron mit Slowmo ein/aus. Default 0.4." />
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
            <InfoTooltip text="Mindestabstand (px) zwischen jedem Gruppen-Racer und jedem Nicht-Gruppen-Racer. 0 = deaktiviert (Standard). Empfehlung: 1.5 × Pulk-Threshold (z.B. 300px)." />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}
          >
            <span style={{ minWidth: '14rem' }}>Max. Gruppengröße</span>
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
            <InfoTooltip text="Maximale Anzahl Racer in der BATTLE-Gruppe (3–6). Die Gruppe kann kleiner sein wenn nicht genug Racer die Kriterien erfüllen. Default 6." />
          </label>
        </div>
      </div>
    </div>
  );
}

export default CameraStateHudSection;
