// ============================================================
// File:        CameraDiagnosticsHUD.jsx
// Path:        client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx
// Project:     RaceArena
// Created:     2026-05-06
// Description: Live camera diagnostics overlay (Tier-2 toggle in Dev Panel).
//              Shows zoom, sprite size, camera state, per-state TC, lerp lag,
//              and a brief SNAP indicator when the camera snaps on state entry.
//              Extended with frame-timing and leader-motion blocks for
//              render-smoothness diagnosis (Hypotheses A/B/C).
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { OPEN_TRACK_BASE_ZOOM } from '../../modules/camera/CameraDirector.js';

const CANVAS_W = 1280;
const POLL_MS = 100; // update 10× per second

/**
 * @param {object}  cameraRef  React ref pointing to the live CameraDirector instance.
 * @param {object}  diagRef    React ref pointing to the live diagnostics state object.
 * @param {boolean} visible    Whether the HUD should render
 */
export default function CameraDiagnosticsHUD({ cameraRef, diagRef, visible }) {
  const [snapshot, setSnapshot] = useState({
    zoom: 1,
    refPx: 0,
    worldW: 1280,
    isOpen: false,
    hudState: 'OVERVIEW',
    currentTc: 0,
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
    // frame timing
    dt: 16,
    dtAvg: 16,
    dtMin: 16,
    dtMax: 16,
    dtJitter: 0,
    slowFrameCount: 0,
    windowAge: 0,
    // leader motion
    screenDelta: 0,
    screenDeltaAvg: 0,
    screenDeltaMax: 0,
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => {
      const dir = cameraRef?.current;
      if (!dir) return;
      const dg = diagRef?.current ?? {};
      setSnapshot({
        zoom: dir.zoom,
        refPx: dir._referenceSpriteSize ?? 0,
        worldW: dir._worldW ?? 1280,
        isOpen: dir._isOpenTrack ?? false,
        hudState: dir.hudState ?? 'OVERVIEW',
        currentTc: dir.currentTc ?? 0,
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
        dt: dg.dt ?? 16,
        dtAvg: dg.dtAvg ?? 16,
        dtMin: dg.dtMin ?? 16,
        dtMax: dg.dtMax ?? 16,
        dtJitter: dg.dtJitter ?? 0,
        slowFrameCount: dg.slowFrameCount ?? 0,
        windowAge: dg.windowAge ?? 0,
        screenDelta: dg.screenDelta ?? 0,
        screenDeltaAvg: dg.screenDeltaAvg ?? 0,
        screenDeltaMax: dg.screenDeltaMax ?? 0,
      });
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [visible, cameraRef, diagRef]);

  if (!visible) return null;

  const {
    zoom,
    refPx,
    worldW,
    isOpen,
    hudState,
    currentTc,
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
    dt,
    dtAvg,
    dtMin,
    dtMax,
    dtJitter,
    slowFrameCount,
    windowAge,
    screenDelta,
    screenDeltaAvg,
    screenDeltaMax,
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

  const sectionStyle = {
    color: '#88bbdd',
    fontWeight: 700,
    marginTop: 4,
    marginBottom: 1,
    letterSpacing: '0.04em',
  };

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
        minWidth: 260,
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
      <div style={{ color: lagColor }}>
        lag: ({lagX.toFixed(0)}, {lagY.toFixed(0)}) px
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

      <div style={sectionStyle}>=== Frame Timing ===</div>
      <div>
        dt: {dt.toFixed(1)}ms &nbsp;(avg {dtAvg.toFixed(1)} &nbsp;min {dtMin.toFixed(1)} &nbsp;max{' '}
        {dtMax.toFixed(1)} &nbsp;jitter {dtJitter.toFixed(1)})
      </div>
      <div>
        frames &gt; 20ms (5s): {slowFrameCount} &nbsp;&nbsp; window age: {windowAge.toFixed(1)}s
      </div>

      <div style={sectionStyle}>=== Leader Motion ===</div>
      <div>
        Δscreen: {screenDelta.toFixed(1)}px &nbsp;(avg {screenDeltaAvg.toFixed(1)} &nbsp;max{' '}
        {screenDeltaMax.toFixed(1)})
      </div>

      <div style={sectionStyle}>=== Camera State &amp; Lag ===</div>
      <div>
        cam state: <span style={{ color: '#ffd700' }}>{hudState}</span> &nbsp;&nbsp; zoom:{' '}
        {zoom.toFixed(2)}
      </div>
      <div>cam lag (screen px): {lagMag.toFixed(1)}</div>
    </div>
  );
}
