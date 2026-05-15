// ============================================================
// File:        CameraFrameLogHUD.jsx
// Path:        client/src/screens/RaceScreen/CameraFrameLogHUD.jsx
// Project:     RaceArena
// Description: Frame-log overlay — active only when enableFrameLog is ON.
//              Shows a 30-frame delta-X sparkline so the user can spot
//              jitter live, plus Download and Clipboard export buttons.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';

const POLL_MS = 150; // sparkline refresh rate (not needed for accurate logging)
const SPARKLINE_FRAMES = 30;
const SPARKLINE_W = 120;
const SPARKLINE_H = 40;
const JUMP_THRESHOLD_PX = 8; // deltas above this are drawn red in the sparkline

/**
 * @param {object}  cameraRef  React ref pointing to the live CameraDirector instance.
 * @param {boolean} visible    Render when true (set to enableFrameLog).
 */
export default function CameraFrameLogHUD({ cameraRef, visible }) {
  const canvasRef = useRef(null);
  const [frameCount, setFrameCount] = useState(0);
  const [copyStatus, setCopyStatus] = useState(''); // '' | 'copied' | 'error'

  // Sparkline: poll ring buffer and redraw
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      const cd = cameraRef.current;
      if (!cd) return;
      setFrameCount(cd.diagFrameCount);
      const deltas = cd.getRecentDeltas(SPARKLINE_FRAMES);
      const canvas = canvasRef.current;
      if (!canvas || deltas.length === 0) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, SPARKLINE_W, SPARKLINE_H);

      // Find scale — max abs delta in window, min 1px to avoid div/0
      const maxAbs = Math.max(1, ...deltas.map((d) => Math.abs(d.dox)));
      const barW = SPARKLINE_W / SPARKLINE_FRAMES;

      deltas.forEach((d, i) => {
        const h = Math.min(SPARKLINE_H, (Math.abs(d.dox) / maxAbs) * SPARKLINE_H);
        const isJump = Math.abs(d.dox) > JUMP_THRESHOLD_PX && !d.tf;
        ctx.fillStyle = isJump ? '#f55' : d.tf ? '#88f' : '#4cf';
        ctx.fillRect(i * barW, SPARKLINE_H - h, barW - 1, h);
      });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [visible, cameraRef]);

  const triggerDownload = useCallback(() => {
    const cd = cameraRef.current;
    if (!cd) return;
    const json = cd.exportDiagLog();
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `camera-log-${ts}-f${cd.diagFrameCount}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [cameraRef]);

  const triggerClipboard = useCallback(async () => {
    const cd = cameraRef.current;
    if (!cd) return;
    try {
      await navigator.clipboard.writeText(cd.exportDiagLog());
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  }, [cameraRef]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        background: 'rgba(0,0,0,0.75)',
        border: '1px solid #4cf',
        borderRadius: '6px',
        padding: '6px 8px',
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ccc',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 50,
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ color: '#4cf', fontWeight: 700, letterSpacing: '0.05em' }}>
        FRAME LOG {frameCount > 0 ? `· ${frameCount} frames` : '· waiting…'}
      </div>

      {/* Sparkline: last 30 deltaOffsetX values */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ color: '#888', fontSize: '9px' }}>
          ΔoffsetX last {SPARKLINE_FRAMES}f <span style={{ color: '#f55' }}>red=jump</span>{' '}
          <span style={{ color: '#88f' }}>blue=transition</span>
        </div>
        <canvas
          ref={canvasRef}
          width={SPARKLINE_W}
          height={SPARKLINE_H}
          style={{ border: '1px solid #333', background: '#111', display: 'block' }}
        />
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
        <button
          onClick={triggerDownload}
          style={{
            background: '#1a3a4a',
            border: '1px solid #4cf',
            borderRadius: '3px',
            color: '#4cf',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px 6px',
            flex: 1,
          }}
        >
          ↓ Download
        </button>
        <button
          onClick={triggerClipboard}
          style={{
            background: '#1a3a4a',
            border: '1px solid #4cf',
            borderRadius: '3px',
            color: copyStatus === 'copied' ? '#4f4' : copyStatus === 'error' ? '#f55' : '#4cf',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px 6px',
            flex: 1,
          }}
        >
          {copyStatus === 'copied' ? '✓ Copied' : copyStatus === 'error' ? '✗ Error' : '⎘ Copy'}
        </button>
      </div>
      <div style={{ color: '#666', fontSize: '9px', textAlign: 'center' }}>
        Drop downloaded file in client/tmp/camera-logs/
      </div>
    </div>
  );
}
