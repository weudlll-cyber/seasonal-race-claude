// ============================================================
// File:        CameraDiagnosticsHUD.jsx
// Path:        client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx
// Project:     RaceArena
// Created:     2026-05-06
// Description: Live camera diagnostics overlay (Tier-2 toggle in Dev Panel).
//              Shows zoom, sprite size, camera state, per-state TC, lerp lag,
//              and a brief SNAP indicator when the camera snaps on state entry.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { OPEN_TRACK_BASE_ZOOM } from '../../modules/camera/CameraDirector.js';

const CANVAS_W = 1280;
const POLL_MS = 100; // update 10× per second

/**
 * @param {object}  cameraRef  React ref pointing to the live CameraDirector instance.
 * @param {boolean} visible    Whether the HUD should render
 */
export default function CameraDiagnosticsHUD({ cameraRef, diagRef, leaderDiagRef, visible }) {
  const [snapshot, setSnapshot] = useState({
    zoom: 1,
    refPx: 0,
    worldW: 1280,
    isOpen: false,
    hudState: 'OVERVIEW',
    currentTc: 0,
    lerpPhase: 'entry',
    lagX: 0,
    lagY: 0,
    transitioning: false,
    panProgress: 1,
    zoomProgress: 1,
    targetVisible: true,
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    targetZoom: 1,
    bsY: 1,
    observerPhase: 'idle',
    camT: 0,
    lastFocusT: 0,
    followPct: 0,
    dv01: 0,
    dv12: 0,
    dv01Max: 0,
    dv12Max: 0,
    constSpeed: false,
    transitionCount60f: 0,
    entryElapsedMs: 0,
    entryDeltaZoom: 0,
    entryDeltaX: 0,
    entryDeltaY: 0,
    entryThreshZoom: 0.05,
    entryThreshPx: 10,
    battleSnapshots: [],
    battleFrozen: false,
    leaderSnapshots: [],
    leaderFrozen: false,
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => {
      const dir = cameraRef?.current;
      if (!dir) return;
      const diag = diagRef?.current ?? {};
      setSnapshot({
        zoom: dir.zoom,
        refPx: dir._referenceSpriteSize ?? 0,
        worldW: dir._worldW ?? 1280,
        isOpen: dir._isOpenTrack ?? false,
        hudState: dir.hudState ?? 'OVERVIEW',
        currentTc: dir.currentTc ?? 0,
        lerpPhase: dir.lerpPhase ?? 'tracking',
        lagX: (dir.targetOffsetX ?? 0) - (dir.offsetX ?? 0),
        lagY: (dir.targetOffsetY ?? 0) - (dir.offsetY ?? 0),
        transitioning: dir.transitioning ?? false,
        panProgress: dir.panProgress ?? 1,
        zoomProgress: dir.zoomProgress ?? 1,
        targetVisible: dir.targetInFrame ?? true,
        offsetX: dir.offsetX ?? 0,
        offsetY: dir.offsetY ?? 0,
        targetOffsetX: dir.targetOffsetX ?? 0,
        targetOffsetY: dir.targetOffsetY ?? 0,
        targetZoom: dir.targetZoom ?? dir.zoom,
        bsY: dir._bsY ?? 1,
        observerPhase: dir.observerPhase ?? 'idle',
        camT: dir.camT ?? 0,
        lastFocusT: dir.lastFocusT ?? 0,
        followPct: dir.followPct ?? 0,
        dv01: diag.dv01 ?? 0,
        dv12: diag.dv12 ?? 0,
        dv01Max: diag.dv01Max ?? 0,
        dv12Max: diag.dv12Max ?? 0,
        constSpeed: diag.constSpeed ?? false,
        transitionCount60f: dir.transitionCount60f ?? 0,
        entryElapsedMs: dir.entryElapsedMs ?? 0,
        entryDeltaZoom: dir.lastEntryDeltaZoom ?? 0,
        entryDeltaX: dir.lastEntryDeltaX ?? 0,
        entryDeltaY: dir.lastEntryDeltaY ?? 0,
        entryThreshZoom: dir._entryConvergenceZoom ?? 0.05,
        entryThreshPx: dir._entryConvergencePx ?? 10,
        battleSnapshots: dir.battleDiagSnapshots ? [...dir.battleDiagSnapshots] : [],
        battleFrozen: dir.battleDiagFrozen ?? false,
        leaderSnapshots: leaderDiagRef?.current ? [...leaderDiagRef.current.snapshots] : [],
        leaderFrozen: leaderDiagRef?.current?.frozen ?? false,
      });
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [visible, cameraRef, diagRef, leaderDiagRef]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        cameraRef?.current?.resetBattleDiag?.();
        if (leaderDiagRef?.current) {
          leaderDiagRef.current.snapshots = [];
          leaderDiagRef.current.frozen = false;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, cameraRef, leaderDiagRef]);

  if (!visible) return null;

  const {
    zoom,
    refPx,
    worldW,
    isOpen,
    hudState,
    currentTc,
    lerpPhase,
    lagX,
    lagY,
    transitioning,
    panProgress,
    zoomProgress,
    targetVisible,
    offsetX,
    offsetY,
    targetOffsetX,
    targetOffsetY,
    targetZoom,
    bsY,
    observerPhase,
    camT,
    lastFocusT,
    followPct,
    dv01,
    dv12,
    dv01Max,
    dv12Max,
    constSpeed,
    transitionCount60f,
    entryElapsedMs,
    entryDeltaZoom,
    entryDeltaX,
    entryDeltaY,
    entryThreshZoom,
    entryThreshPx,
    battleSnapshots,
    battleFrozen,
    leaderSnapshots,
    leaderFrozen,
  } = snapshot;
  const bsX = CANVAS_W / (worldW || CANVAS_W);
  const finalPx = isOpen ? refPx * zoom * OPEN_TRACK_BASE_ZOOM : refPx * zoom * bsX;
  const lagMag = Math.sqrt(lagX * lagX + lagY * lagY);
  const lagColor = lagMag < 5 ? '#4cff91' : lagMag < 50 ? '#ffd700' : '#ff6b35';

  const CANVAS_H = 720;
  const effZoom = zoom * bsX;
  const effZoomY = zoom * bsY;
  const targEffZoom = targetZoom * bsX;
  const targEffZoomY = targetZoom * bsY;
  const camWorldX = effZoom > 0 ? Math.round((CANVAS_W / 2 - offsetX) / effZoom) : 0;
  const camWorldY = effZoomY > 0 ? Math.round((CANVAS_H / 2 - offsetY) / effZoomY) : 0;
  const tgtWorldX = targEffZoom > 0 ? Math.round((CANVAS_W / 2 - targetOffsetX) / targEffZoom) : 0;
  const tgtWorldY =
    targEffZoomY > 0 ? Math.round((CANVAS_H / 2 - targetOffsetY) / targEffZoomY) : 0;

  const OBS_ABBR = { idle: 'id', 'lead-in': 'li', follow: 'fo', 'lead-out': 'lo' };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(0,0,0,0.72)',
          color: '#b0e0ff',
          fontFamily: 'monospace',
          fontSize: '0.72rem',
          lineHeight: 1.5,
          padding: '5px 8px',
          borderRadius: 4,
          border: '1px solid rgba(100,180,255,0.3)',
          pointerEvents: 'none',
          zIndex: 30,
          minWidth: 200,
        }}
        data-testid="camera-diagnostics-hud"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#60aaff',
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          🔍 CAM DIAG
          {transitioning && (
            <span style={{ color: '#ffd700', fontSize: '0.65rem', fontWeight: 700 }}>
              ↔ TRANSITIONING
            </span>
          )}
        </div>
        <div>
          state: <span style={{ color: '#ffd700' }}>{hudState}</span> | TC:{' '}
          <span style={{ color: '#b0e0ff' }}>{currentTc.toFixed(1)}s</span>
        </div>
        <div>
          phase:{' '}
          <span style={{ color: lerpPhase === 'entry' ? '#ff6b35' : '#4cff91' }}>{lerpPhase}</span>
        </div>
        <div style={{ color: lagColor }}>
          lag: ({lagX.toFixed(0)}, {lagY.toFixed(0)}) px
        </div>
        <div
          style={{
            color:
              observerPhase === 'follow'
                ? '#4cff91'
                : observerPhase === 'lead-in'
                  ? '#ffd700'
                  : 'rgba(176,224,255,0.4)',
          }}
        >
          obs: <span style={{ fontWeight: 700 }}>{observerPhase}</span> | camT:{' '}
          {camT != null ? camT.toFixed(3) : 'null'} | focusT: {lastFocusT.toFixed(3)}
        </div>
        <div>
          follow%:{' '}
          <span
            style={{ color: followPct > 0.9 ? '#4cff91' : followPct > 0.3 ? '#ffd700' : '#b0e0ff' }}
          >
            {Math.round(followPct * 100)}%
          </span>{' '}
          (last 60f)
        </div>
        <div
          style={{
            color:
              transitionCount60f > 5 ? '#ff6b35' : transitionCount60f > 1 ? '#ffd700' : '#b0e0ff',
          }}
        >
          transitions/60f: {transitionCount60f}
        </div>
        {lerpPhase === 'entry' && (
          <>
            <div>
              entry-conv:{' '}
              <span style={{ color: entryDeltaZoom > entryThreshZoom ? '#ff6b35' : '#4cff91' }}>
                ΔZ={entryDeltaZoom.toFixed(3)}/{entryThreshZoom}
              </span>{' '}
              <span style={{ color: entryDeltaX > entryThreshPx ? '#ff6b35' : '#4cff91' }}>
                ΔX={entryDeltaX.toFixed(0)}
              </span>{' '}
              <span style={{ color: entryDeltaY > entryThreshPx ? '#ff6b35' : '#4cff91' }}>
                ΔY={entryDeltaY.toFixed(0)}/{entryThreshPx}px
              </span>
            </div>
            <div>entry-elapsed: {entryElapsedMs.toFixed(0)}ms</div>
          </>
        )}
        <div>
          Δv: r0-r1:{' '}
          <span style={{ color: Math.abs(dv01) < 0.05 ? '#4cff91' : '#ffd700' }}>
            {dv01.toFixed(1)}
          </span>
          {' (max '}
          <span
            style={{ color: dv01Max < 0.5 ? '#4cff91' : dv01Max < 1.5 ? '#ffd700' : '#ff6b35' }}
          >
            {dv01Max.toFixed(1)}
          </span>
          {') | r1-r2: '}
          <span style={{ color: Math.abs(dv12) < 0.05 ? '#4cff91' : '#ffd700' }}>
            {dv12.toFixed(1)}
          </span>
          {' (max '}
          <span
            style={{ color: dv12Max < 0.5 ? '#4cff91' : dv12Max < 1.5 ? '#ffd700' : '#ff6b35' }}
          >
            {dv12Max.toFixed(1)}
          </span>
          {') px/f'}
        </div>
        {constSpeed && <div style={{ color: '#ff6bff', fontWeight: 700 }}>[CONST SPEED]</div>}
        <div style={{ color: '#9be' }}>
          cam: ({camWorldX}, {camWorldY})
        </div>
        <div style={{ color: '#9be' }}>
          tgt: ({tgtWorldX}, {tgtWorldY})
        </div>
        <div style={{ color: '#fad' }}>
          Δ: ({tgtWorldX - camWorldX}, {tgtWorldY - camWorldY})
        </div>
        <div>
          pan: {(panProgress * 100).toFixed(0)}% | zoom: {(zoomProgress * 100).toFixed(0)}%{' '}
          <span style={{ color: targetVisible ? '#4cff91' : '#ff6b35' }}>
            {targetVisible ? '✓' : '✗'} target
          </span>
        </div>
        <div>
          worldW: {worldW}px | {isOpen ? 'open' : 'closed'}
        </div>
        <div>refPx: {refPx.toFixed(1)}px</div>
        <div>zoom: {zoom.toFixed(4)}</div>
        <div style={{ color: '#ffd700' }}>finalPx: {finalPx.toFixed(1)}px</div>
      </div>
      {battleSnapshots.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 220,
            background: 'rgba(0,0,0,0.82)',
            color: '#b0e0ff',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            lineHeight: 1.6,
            padding: '5px 8px',
            borderRadius: 4,
            border: `1px solid ${battleFrozen ? 'rgba(255,107,53,0.6)' : 'rgba(100,180,255,0.3)'}`,
            pointerEvents: 'none',
            zIndex: 30,
            minWidth: 320,
          }}
          data-testid="battle-diag-hud"
        >
          <div style={{ color: '#ff6b35', fontWeight: 700, marginBottom: 2 }}>
            ⚔ BATTLE-DIAG {battleFrozen ? '[FROZEN — R to reset]' : '[collecting…]'}
          </div>
          <div style={{ color: '#666', fontSize: '0.62rem', marginBottom: 3 }}>
            F | ph/ob | camT | focT | dT | dX dY | dZ |ok
          </div>
          {battleSnapshots.map((s) => (
            <div key={s.f} style={{ color: s.conv ? '#4cff91' : '#ffd700', whiteSpace: 'pre' }}>
              {String(s.f).padStart(2)} | {s.phase === 'entry' ? 'en' : 'tr'}/
              {OBS_ABBR[s.obs] ?? s.obs.slice(0, 2)} | {s.camT != null ? s.camT.toFixed(3) : 'null'}{' '}
              | {s.focusT.toFixed(3)} | {(s.dT >= 0 ? '+' : '') + s.dT.toFixed(3)} |{' '}
              {String(s.dX.toFixed(0)).padStart(4)} {String(s.dY.toFixed(0)).padStart(4)} |{' '}
              {s.dZ.toFixed(3)} | {s.conv ? '✓' : '✗'}
            </div>
          ))}
        </div>
      )}
      {leaderSnapshots.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 550,
            background: 'rgba(0,0,0,0.82)',
            color: '#b0e0ff',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            lineHeight: 1.6,
            padding: '5px 8px',
            borderRadius: 4,
            border: `1px solid ${leaderFrozen ? 'rgba(255,107,53,0.6)' : 'rgba(100,180,255,0.3)'}`,
            pointerEvents: 'none',
            zIndex: 30,
            minWidth: 430,
          }}
          data-testid="leader-diag-hud"
        >
          <div style={{ color: '#4488ff', fontWeight: 700, marginBottom: 2 }}>
            LEADER-DIAG {leaderFrozen ? '[FROZEN — R to reset]' : '[collecting…]'}
          </div>
          <div style={{ color: '#666', fontSize: '0.62rem', marginBottom: 3 }}>
            {' F | rx      | dispX   | drawX   | scrX    | tagX    | camX   '}
          </div>
          {leaderSnapshots.map((s) => (
            <div key={s.f} style={{ color: '#b0e0ff', whiteSpace: 'pre' }}>
              {String(s.f).padStart(2)} | {s.rx.toFixed(1).padStart(7)} |{' '}
              {s.dispX.toFixed(1).padStart(7)} | {s.drawX.toFixed(1).padStart(7)} |{' '}
              {s.scrX.toFixed(1).padStart(7)} | {s.tagX.toFixed(1).padStart(7)} |{' '}
              {s.camX.toFixed(1).padStart(7)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
