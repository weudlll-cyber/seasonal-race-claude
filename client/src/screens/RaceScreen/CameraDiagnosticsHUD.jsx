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
    lagX: 0,
    lagY: 0,
    showSnap: false,
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => {
      const dir = cameraRef?.current;
      if (!dir) return;
      const now = Date.now();
      setSnapshot({
        zoom: dir.zoom,
        refPx: dir._referenceSpriteSize ?? 0,
        worldW: dir._worldW ?? 1280,
        isOpen: dir._isOpenTrack ?? false,
        hudState: dir.hudState ?? 'OVERVIEW',
        currentTc: dir.currentTc ?? 0,
        lagX: (dir.targetOffsetX ?? 0) - (dir.offsetX ?? 0),
        lagY: (dir.targetOffsetY ?? 0) - (dir.offsetY ?? 0),
        showSnap: now - (dir._snapFiredAtWall ?? 0) < 500,
      });
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [visible, cameraRef]);

  if (!visible) return null;

  const { zoom, refPx, worldW, isOpen, hudState, currentTc, lagX, lagY, showSnap } = snapshot;
  const bsX = CANVAS_W / (worldW || CANVAS_W);
  const finalPx = isOpen ? refPx * zoom * OPEN_TRACK_BASE_ZOOM : refPx * zoom * bsX;
  const lagMag = Math.sqrt(lagX * lagX + lagY * lagY);
  const lagColor = lagMag < 5 ? '#4cff91' : lagMag < 50 ? '#ffd700' : '#ff6b35';

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
        {showSnap && (
          <span style={{ color: '#ffd700', fontSize: '0.65rem', fontWeight: 700 }}>⚡ SNAP</span>
        )}
      </div>
      <div>
        state: <span style={{ color: '#ffd700' }}>{hudState}</span> | TC:{' '}
        <span style={{ color: '#b0e0ff' }}>{currentTc.toFixed(1)}s</span>
      </div>
      <div style={{ color: lagColor }}>
        lag: ({lagX.toFixed(0)}, {lagY.toFixed(0)}) px
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
