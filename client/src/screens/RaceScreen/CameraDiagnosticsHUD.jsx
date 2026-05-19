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
export default function CameraDiagnosticsHUD({
  cameraRef,
  diagRef,
  leaderDiagRef,
  visible,
  showRpDiag,
}) {
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
    rpEnabled: false,
    rpPhase: '—',
    rpTs: 0,
    rpReRollActive: false,
    rpSfMin: 1,
    rpSfMax: 1,
    rpSfMean: 1,
    rpTmMin: 1,
    rpTmMax: 1,
    rpBbMin: 1,
    rpBbMax: 1,
    rpBonusMult: 1,
    rpRows: 0,
    rpRacersPerRow: 0,
    rpNRacers: 0,
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
    if (!visible && !showRpDiag) return;
    intervalRef.current = setInterval(() => {
      const dir = cameraRef?.current;
      if (!dir) return;
      const diag = diagRef?.current ?? {};
      setSnapshot({
        zoom: dir.zoom ?? 1,
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
        rpEnabled: diag.rpEnabled ?? false,
        rpPhase: diag.rpPhase ?? '—',
        rpTs: diag.rpTs ?? 0,
        rpReRollActive: diag.rpReRollActive ?? false,
        rpSfMin: diag.rpSfMin ?? 1,
        rpSfMax: diag.rpSfMax ?? 1,
        rpSfMean: diag.rpSfMean ?? 1,
        rpTmMin: diag.rpTmMin ?? 1,
        rpTmMax: diag.rpTmMax ?? 1,
        rpBbMin: diag.rpBbMin ?? 1,
        rpBbMax: diag.rpBbMax ?? 1,
        rpBonusMult: diag.rpBonusMult ?? 1,
        rpRows: diag.rpRows ?? 0,
        rpRacersPerRow: diag.rpRacersPerRow ?? 0,
        rpNRacers: diag.rpNRacers ?? 0,
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
  }, [visible, showRpDiag, cameraRef, diagRef, leaderDiagRef]);

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

  if (!visible && !showRpDiag) return null;

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
    rpEnabled,
    rpPhase,
    rpTs,
    rpReRollActive,
    rpSfMin,
    rpSfMax,
    rpSfMean,
    rpTmMin,
    rpTmMax,
    rpBbMin,
    rpBbMax,
    rpBonusMult,
    rpRows,
    rpRacersPerRow,
    rpNRacers,
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
      {visible && (
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
            <span style={{ color: '#b0e0ff' }}>{(currentTc ?? 0).toFixed(1)}s</span>
          </div>
          <div>
            phase:{' '}
            <span style={{ color: lerpPhase === 'entry' ? '#ff6b35' : '#4cff91' }}>
              {lerpPhase}
            </span>
          </div>
          <div style={{ color: lagColor }}>
            lag: ({(lagX ?? 0).toFixed(0)}, {(lagY ?? 0).toFixed(0)}) px
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
            {camT != null ? (camT ?? 0).toFixed(3) : 'null'} | focusT:{' '}
            {(lastFocusT ?? 0).toFixed(3)}
          </div>
          <div>
            follow%:{' '}
            <span
              style={{
                color: followPct > 0.9 ? '#4cff91' : followPct > 0.3 ? '#ffd700' : '#b0e0ff',
              }}
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
                <span
                  style={{ color: (entryDeltaZoom ?? 0) > entryThreshZoom ? '#ff6b35' : '#4cff91' }}
                >
                  ΔZ={(entryDeltaZoom ?? 0).toFixed(3)}/{entryThreshZoom}
                </span>{' '}
                <span style={{ color: (entryDeltaX ?? 0) > entryThreshPx ? '#ff6b35' : '#4cff91' }}>
                  ΔX={(entryDeltaX ?? 0).toFixed(0)}
                </span>{' '}
                <span style={{ color: (entryDeltaY ?? 0) > entryThreshPx ? '#ff6b35' : '#4cff91' }}>
                  ΔY={(entryDeltaY ?? 0).toFixed(0)}/{entryThreshPx}px
                </span>
              </div>
              <div>entry-elapsed: {(entryElapsedMs ?? 0).toFixed(0)}ms</div>
            </>
          )}
          <div>
            Δv: r0-r1:{' '}
            <span style={{ color: Math.abs(dv01 ?? 0) < 0.05 ? '#4cff91' : '#ffd700' }}>
              {(dv01 ?? 0).toFixed(1)}
            </span>
            {' (max '}
            <span
              style={{
                color:
                  (dv01Max ?? 0) < 0.5 ? '#4cff91' : (dv01Max ?? 0) < 1.5 ? '#ffd700' : '#ff6b35',
              }}
            >
              {(dv01Max ?? 0).toFixed(1)}
            </span>
            {') | r1-r2: '}
            <span style={{ color: Math.abs(dv12 ?? 0) < 0.05 ? '#4cff91' : '#ffd700' }}>
              {(dv12 ?? 0).toFixed(1)}
            </span>
            {' (max '}
            <span
              style={{
                color:
                  (dv12Max ?? 0) < 0.5 ? '#4cff91' : (dv12Max ?? 0) < 1.5 ? '#ffd700' : '#ff6b35',
              }}
            >
              {(dv12Max ?? 0).toFixed(1)}
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
            pan: {((panProgress ?? 1) * 100).toFixed(0)}% | zoom:{' '}
            {((zoomProgress ?? 1) * 100).toFixed(0)}%{' '}
            <span style={{ color: targetVisible ? '#4cff91' : '#ff6b35' }}>
              {targetVisible ? '✓' : '✗'} target
            </span>
          </div>
          <div>
            worldW: {worldW}px | {isOpen ? 'open' : 'closed'}
          </div>
          <div>refPx: {(refPx ?? 0).toFixed(1)}px</div>
          <div>zoom: {(zoom ?? 1).toFixed(4)}</div>
          <div style={{ color: '#ffd700' }}>finalPx: {(finalPx ?? 0).toFixed(1)}px</div>
        </div>
      )}
      {showRpDiag && rpEnabled && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.72)',
            color: '#b0e0ff',
            fontFamily: 'monospace',
            fontSize: '0.72rem',
            lineHeight: 1.5,
            padding: '5px 8px',
            borderRadius: 4,
            border: '1px solid rgba(80,200,255,0.4)',
            pointerEvents: 'none',
            zIndex: 30,
            minWidth: 220,
          }}
          data-testid="race-plan-diag-hud"
        >
          <div style={{ color: '#4fc3f7', fontWeight: 700, marginBottom: 2 }}>RP DIAG</div>
          <div>
            phase:{' '}
            <span
              style={{
                color:
                  rpPhase === 'OUTCOME' ? '#4cff91' : rpPhase === 'FINAL' ? '#ffd700' : '#b0e0ff',
                fontWeight: 700,
              }}
            >
              {rpPhase}
            </span>
            {'  t='}
            {(rpTs / 1000).toFixed(1)}s
          </div>
          <div>
            reRolls:{' '}
            <span style={{ color: rpReRollActive ? '#4cff91' : '#ff6b35', fontWeight: 700 }}>
              {rpReRollActive ? 'ACTIVE' : 'FROZEN'}
            </span>
          </div>
          <div style={{ color: '#aaa' }}>
            rows:{rpRows} rpr:{rpRacersPerRow} n:{rpNRacers}
          </div>
          <div style={{ color: '#aaa' }}>
            mult:{' '}
            <span style={{ color: rpBonusMult !== 1.0 ? '#4cff91' : '#ffd700' }}>
              {rpBonusMult.toFixed(1)}
            </span>
          </div>
          <div>
            sf:{' '}
            <span style={{ color: rpSfMax - rpSfMin > 0.05 ? '#4cff91' : '#ffd700' }}>
              {rpSfMin.toFixed(3)}–{rpSfMax.toFixed(3)}
            </span>
            {'  μ='}
            {rpSfMean.toFixed(3)}
          </div>
          {rpPhase === 'OUTCOME' && (
            <div>
              tm:{' '}
              <span style={{ color: rpTmMax - rpTmMin > 0.05 ? '#4cff91' : '#ffd700' }}>
                {rpTmMin.toFixed(3)}–{rpTmMax.toFixed(3)}
              </span>
            </div>
          )}
          {rpPhase !== 'OUTCOME' && rpPhase !== 'FINAL' && rpPhase !== '—' && (
            <div>
              bb:{' '}
              <span style={{ color: rpBbMax - rpBbMin > 0.005 ? '#4cff91' : '#ffd700' }}>
                {rpBbMin.toFixed(3)}–{rpBbMax.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      )}
      {visible && battleSnapshots.length > 0 && (
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
              {String(s.f ?? 0).padStart(2)} | {s.phase === 'entry' ? 'en' : 'tr'}/
              {OBS_ABBR[s.obs] ?? (s.obs ?? '??').slice(0, 2)} |{' '}
              {s.camT != null ? (s.camT ?? 0).toFixed(3) : 'null'} | {(s.focusT ?? 0).toFixed(3)} |{' '}
              {((s.dT ?? 0) >= 0 ? '+' : '') + (s.dT ?? 0).toFixed(3)} |{' '}
              {String((s.dX ?? 0).toFixed(0)).padStart(4)}{' '}
              {String((s.dY ?? 0).toFixed(0)).padStart(4)} | {(s.dZ ?? 0).toFixed(3)} |{' '}
              {s.conv ? '✓' : '✗'}
            </div>
          ))}
        </div>
      )}
      {visible && leaderSnapshots.length > 0 && (
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
            {' F | rx      | drawX   | scrX    | tagX    | camX   '}
          </div>
          {leaderSnapshots.map((s) => (
            <div key={s.f} style={{ color: '#b0e0ff', whiteSpace: 'pre' }}>
              {String(s.f ?? 0).padStart(2)} | {(s.rx ?? 0).toFixed(1).padStart(7)} |{' '}
              {(s.drawX ?? 0).toFixed(1).padStart(7)} | {(s.scrX ?? 0).toFixed(1).padStart(7)} |{' '}
              {(s.tagX ?? 0).toFixed(1).padStart(7)} | {(s.camX ?? 0).toFixed(1).padStart(7)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
