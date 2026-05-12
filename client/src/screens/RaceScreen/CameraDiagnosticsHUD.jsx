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
export default function CameraDiagnosticsHUD({ cameraRef, visible }) {
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
    lookaheadDx: 0,
    lookaheadDy: 0,
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => {
      const dir = cameraRef?.current;
      if (!dir) return;
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
        lookaheadDx: dir.lookaheadVec?.dx ?? 0,
        lookaheadDy: dir.lookaheadVec?.dy ?? 0,
      });
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [visible, cameraRef]);

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
    lookaheadDx,
    lookaheadDy,
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

  return (
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
            Math.abs(lookaheadDx) + Math.abs(lookaheadDy) > 0.5
              ? '#ffd700'
              : 'rgba(176,224,255,0.4)',
        }}
      >
        lookahead: ({lookaheadDx.toFixed(0)}, {lookaheadDy.toFixed(0)}) px
      </div>
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
  );
}
