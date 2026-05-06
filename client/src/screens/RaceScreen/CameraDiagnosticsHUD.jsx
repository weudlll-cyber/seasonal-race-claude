// ============================================================
// File:        CameraDiagnosticsHUD.jsx
// Path:        client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx
// Project:     RaceArena
// Created:     2026-05-06
// Description: Temporary diagnostic overlay showing live camera zoom values.
//              Positioned below the CameraStateHUD. Toggle via Dev Panel
//              "Show camera diagnostics". Remove once diagnosis is complete.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { OPEN_TRACK_BASE_ZOOM } from '../../modules/camera/CameraDirector.js';

const CANVAS_W = 1280;
const POLL_MS = 100; // update 10× per second — smooth enough for diagnostics

/**
 * @param {object}  cameraRef  React ref pointing to the live CameraDirector instance.
 *                             Reads _worldW, _isOpenTrack, _referenceSpriteSize, zoom.
 * @param {boolean} visible    Whether the HUD should render
 */
export default function CameraDiagnosticsHUD({ cameraRef, visible }) {
  const [snapshot, setSnapshot] = useState({ zoom: 1, refPx: 0, worldW: 1280, isOpen: false });
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
      });
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [visible, cameraRef]);

  if (!visible) return null;

  const { zoom, refPx, worldW, isOpen } = snapshot;
  const bsX = CANVAS_W / (worldW || CANVAS_W);
  const finalPx = isOpen ? refPx * zoom * OPEN_TRACK_BASE_ZOOM : refPx * zoom * bsX;

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
        minWidth: 180,
      }}
      data-testid="camera-diagnostics-hud"
    >
      <div style={{ color: '#60aaff', fontWeight: 700, marginBottom: 2 }}>🔍 CAM DIAG</div>
      <div>
        worldW: {worldW}px | {isOpen ? 'open' : 'closed'}
      </div>
      <div>refPx: {refPx.toFixed(1)}px</div>
      <div>zoom: {zoom.toFixed(4)}</div>
      <div style={{ color: '#ffd700' }}>finalPx: {finalPx.toFixed(1)}px</div>
    </div>
  );
}
