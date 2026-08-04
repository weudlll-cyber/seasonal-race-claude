// ============================================================
// File:        CameraMarkerHUD.jsx
// Path:        client/src/screens/RaceScreen/CameraMarkerHUD.jsx
// Project:     RaceArena
// Description: CAMERA-REPRO-1 (Part A) — the MARKER, owner side.
//
//              Press M while watching a race: the current moment is turned into ONE copyable line
//              and put on the clipboard. Nothing about the race changes — no pause, no physics
//              touched, no camera call. A small chip fades in for ~2.5 s so the owner knows the
//              press landed, and the line is also printed to the console so a blocked clipboard
//              (insecure origin, denied permission) still leaves him something to copy.
//
//              Deliberately keyboard-only and always live: a control on screen would be one more
//              thing in the way of the eye-test this exists to serve, and a config toggle would be
//              one more thing to have switched off on the day it is needed.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  formatMarkerLine,
  formatMarkerSummary,
  isReplayable,
} from '../../modules/camera/cameraMarker.js';

const CHIP_MS = 2500;
const MARKER_KEY = 'm';

/**
 * @param {object} p
 * @param {{current: (() => object|null)}} p.buildRef
 *   Ref holding a function that returns the marker for the CURRENT frame (null when the race is
 *   not running yet). A ref, not a prop callback, so the race loop never re-renders this component.
 */
export default function CameraMarkerHUD({ buildRef }) {
  const [chip, setChip] = useState(null); // { text, tone } | null
  const timerRef = useRef(null);

  const show = useCallback((text, tone) => {
    clearTimeout(timerRef.current);
    setChip({ text, tone });
    timerRef.current = setTimeout(() => setChip(null), CHIP_MS);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key?.toLowerCase() !== MARKER_KEY) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      const marker = buildRef.current?.();
      if (!marker) {
        show('MARK · no race running', 'warn');
        return;
      }
      const line = formatMarkerLine(marker);
      // Console first: it is the fallback when the clipboard is unavailable, and it is what stays
      // readable in a screen recording of the eye-test.
      // eslint-disable-next-line no-console
      console.info(`[RA CAMERA MARK] ${formatMarkerSummary(marker)}\n${line}`);

      const replayable = isReplayable(marker);
      navigator.clipboard
        ?.writeText(line)
        .then(() =>
          show(
            replayable ? 'MARK copied ✓' : 'MARK copied — race UNSEEDED, not replayable',
            replayable ? 'ok' : 'warn'
          )
        )
        .catch(() => show('MARK · clipboard blocked — line is in the console', 'warn'));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [buildRef, show]);

  if (!chip) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.78)',
        border: `1px solid ${chip.tone === 'ok' ? '#4f4' : '#fc4'}`,
        borderRadius: '4px',
        padding: '3px 8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: chip.tone === 'ok' ? '#4f4' : '#fc4',
        zIndex: 60,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {chip.text}
    </div>
  );
}
