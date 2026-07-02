// ============================================================
// File:        PerfLogHUD.jsx
// Path:        client/src/screens/RaceScreen/PerfLogHUD.jsx
// Description: Per-frame timing overlay — active only when enablePerfLog is ON.
//              Shows live P50/P90/P99/max stats + top-10 spike list so the
//              owner can identify which phase (physics/camera/render/other)
//              causes visible stutter. Exported as JSON for sharing.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { getPerfStats, getPhysicsPaceStats, exportPerfLog, SPIKE_MIN_MS } from './perfLog.js';

const POLL_MS = 200;
const SPARKLINE_W = 180;
const SPARKLINE_H = 36;
const SPIKE_DISPLAY = 10;
const SMOOTH_TARGET_MS = 16.7;

const COL = {
  physics: '#f9a825',
  prep: '#29b6f6',
  camera: '#ce93d8',
  render: '#66bb6a',
  other: '#ef5350',
  spike: '#ff7043',
  muted: '#666',
  header: '#4cf',
};

function fmt(ms) {
  if (ms == null) return '–';
  return ms.toFixed(1);
}

// Physics-pace colouring: green near 1000 ms/s (framerate-independent), amber/red when physics
// drifts behind (<) or races ahead (>) real time. (BATTLE slowmo also pulls this below 1000.)
function paceColor(msPerSec) {
  const d = Math.abs(msPerSec - 1000);
  if (d <= 30) return '#4caf50';
  if (d <= 100) return '#f9a825';
  return '#ef5350';
}
function paceLabel(msPerSec) {
  if (msPerSec >= 970 && msPerSec <= 1030) return 'OK';
  return msPerSec < 970 ? 'BEHIND' : 'AHEAD';
}
function trendArrow(dMs) {
  if (dMs > 1) return '↑ rising';
  if (dMs < -1) return '↓ draining';
  return '→ steady';
}

/**
 * @param {{ perfLogRef: React.MutableRefObject, visible: boolean }} props
 *   perfLogRef — ref pointing at the live perfLog object from createPerfLog().
 */
export default function PerfLogHUD({ perfLogRef, visible }) {
  const canvasRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [pace, setPace] = useState(null);
  const [spikes, setSpikes] = useState([]);
  const [frameCount, setFrameCount] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');

  // Poll the ring buffer and update stats every POLL_MS.
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      const log = perfLogRef.current;
      if (!log) return;

      setFrameCount(log.frameIdx);
      const s = getPerfStats(log);
      setStats(s);
      setPace(getPhysicsPaceStats(log));

      // Spike list: sort and take top SPIKE_DISPLAY
      const sorted = [...log.spikes].sort((a, b) => b.total - a.total);
      setSpikes(sorted.slice(0, SPIKE_DISPLAY));

      // Sparkline: last SPARKLINE_W/4 frames
      const canvas = canvasRef.current;
      if (!canvas || !s) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, SPARKLINE_W, SPARKLINE_H);

      const n = log.ringCount;
      const nFrames = Math.min(n, Math.floor(SPARKLINE_W / 3));
      const start =
        log.ringCount < 600
          ? Math.max(0, log.ringCount - nFrames)
          : (log.ringHead + 600 - nFrames) % 600;

      const barW = SPARKLINE_W / nFrames;
      // Scale: show up to 3× target frame time
      const scale = SPARKLINE_H / (SMOOTH_TARGET_MS * 3);
      // Reference line at target frame time
      const refY = SPARKLINE_H - SMOOTH_TARGET_MS * scale;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, refY);
      ctx.lineTo(SPARKLINE_W, refY);
      ctx.stroke();

      for (let k = 0; k < nFrames; k++) {
        const f = log.ring[(start + k) % 600];
        const x = k * barW;
        let yOffset = SPARKLINE_H;

        const drawSegment = (ms, color) => {
          const h = Math.min(SPARKLINE_H, ms * scale);
          if (h < 0.5) return;
          ctx.fillStyle = color;
          ctx.fillRect(x, yOffset - h, barW - 0.5, h);
          yOffset -= h;
        };

        drawSegment(f.render, COL.render);
        drawSegment(f.camera, COL.camera);
        drawSegment(f.prep, COL.prep);
        drawSegment(f.physics, COL.physics);
        drawSegment(Math.max(0, f.other), COL.other);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [visible, perfLogRef]);

  const triggerDownload = useCallback(() => {
    const log = perfLogRef.current;
    if (!log) return;
    const json = exportPerfLog(log);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `perf-log-${ts}-f${log.frameIdx}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [perfLogRef]);

  const triggerClipboard = useCallback(async () => {
    const log = perfLogRef.current;
    if (!log) return;
    try {
      await navigator.clipboard.writeText(exportPerfLog(log));
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  }, [perfLogRef]);

  if (!visible) return null;

  const s = stats;

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.82)',
        border: `1px solid ${COL.header}`,
        borderRadius: '6px',
        padding: '6px 8px',
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ccc',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        zIndex: 50,
        userSelect: 'none',
        pointerEvents: 'auto',
        minWidth: '192px',
      }}
    >
      {/* Title */}
      <div style={{ color: COL.header, fontWeight: 700, letterSpacing: '0.05em' }}>
        PERF LOG{frameCount > 0 ? ` · ${frameCount} frames` : ' · waiting…'}
      </div>

      {/* Physics pace — framerate-dependence diagnosis (the key section) */}
      {pace && (
        <div
          style={{
            fontSize: '9px',
            lineHeight: '1.5',
            borderTop: '1px solid #333',
            paddingTop: '4px',
          }}
        >
          <div style={{ color: COL.header, fontWeight: 700 }}>PHYSICS PACE</div>
          <div
            style={{ color: paceColor(pace.physMsPerRealSec), fontWeight: 700, fontSize: '11px' }}
            title="Physics-time advanced per real second. ~1000 = framerate-independent. Falls below under load (physics behind), rises above when load drops (catching up). BATTLE slowmo also lowers it."
          >
            {pace.physMsPerRealSec.toFixed(0)} ms/real-s · {paceLabel(pace.physMsPerRealSec)}
          </div>
          <div>
            steps/frame: mean {pace.meanSteps.toFixed(2)} · max {pace.maxSteps}
          </div>
          <div style={{ color: pace.capHits > 0 ? COL.spike : '#bbb' }}>
            cap-hits: {pace.capHits} ({(pace.capHitRate * 100).toFixed(1)}%)
          </div>
          <div>
            backlog: {pace.currentAccumMs.toFixed(1)}ms · {trendArrow(pace.accumTrendMs)}
          </div>
          <div style={{ color: COL.muted }}>active racers: {pace.nRacers}</div>
        </div>
      )}

      {/* Sparkline legend */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '9px' }}>
        {[
          ['phys', COL.physics],
          ['prep', COL.prep],
          ['cam', COL.camera],
          ['draw', COL.render],
          ['other', COL.other],
        ].map(([label, color]) => (
          <span key={label}>
            <span style={{ color }}>█</span> {label}
          </span>
        ))}
      </div>

      {/* Sparkline */}
      <canvas
        ref={canvasRef}
        width={SPARKLINE_W}
        height={SPARKLINE_H}
        style={{ border: '1px solid #333', background: '#111', display: 'block' }}
      />

      {/* Stats table */}
      {s ? (
        <div style={{ fontSize: '9px', lineHeight: '1.5' }}>
          <div style={{ color: COL.muted, marginBottom: '1px' }}>
            {'       P50    P90    P99    MAX'}
          </div>
          {[
            ['total', s.total, '#eee'],
            ['phys', s.physics, COL.physics],
            ['prep', s.prep, COL.prep],
            ['cam', s.camera, COL.camera],
            ['draw', s.render, COL.render],
          ].map(([label, row, color]) => (
            <div key={label} style={{ color }}>
              {label.padEnd(6)} {fmt(row.p50).padStart(5)} {fmt(row.p90).padStart(5)}{' '}
              {fmt(row.p99).padStart(5)} {fmt(row.max).padStart(5)}
            </div>
          ))}
          <div style={{ color: COL.muted, marginTop: '2px', fontSize: '8px' }}>
            spike threshold: ≥{SPIKE_MIN_MS}ms
          </div>
        </div>
      ) : (
        <div style={{ color: COL.muted, fontSize: '9px' }}>collecting…</div>
      )}

      {/* Spike list */}
      {spikes.length > 0 && (
        <div style={{ fontSize: '9px' }}>
          <div style={{ color: COL.spike, fontWeight: 700, marginBottom: '2px' }}>
            SPIKES (worst {spikes.length})
          </div>
          <div style={{ color: COL.muted, marginBottom: '1px' }}>
            {'fi      tot  phys  cam  draw other'}
          </div>
          {spikes.map((f) => (
            <div key={f.fi} style={{ color: f.total > 50 ? COL.spike : '#bbb' }}>
              {String(f.fi).padStart(6)} {fmt(f.total).padStart(5)} {fmt(f.physics).padStart(5)}{' '}
              {fmt(f.camera).padStart(4)} {fmt(f.render).padStart(5)} {fmt(f.other).padStart(5)}
            </div>
          ))}
        </div>
      )}

      {/* Sum-check hint */}
      {s && (
        <div style={{ fontSize: '8px', color: COL.muted }}>
          P90 sum: {fmt(s.physics.p90 + s.prep.p90 + s.camera.p90 + s.render.p90)}ms measured /{' '}
          {fmt(s.total.p90)}ms total
        </div>
      )}

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
        <button
          onClick={triggerDownload}
          style={{
            background: '#1a3a4a',
            border: `1px solid ${COL.header}`,
            borderRadius: '3px',
            color: COL.header,
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
            border: `1px solid ${COL.header}`,
            borderRadius: '3px',
            color: copyStatus === 'copied' ? '#4f4' : copyStatus === 'error' ? '#f55' : COL.header,
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px 6px',
            flex: 1,
          }}
        >
          {copyStatus === 'copied' ? '✓ Copied' : copyStatus === 'error' ? '✗ Error' : '⎘ Copy'}
        </button>
      </div>
    </div>
  );
}
