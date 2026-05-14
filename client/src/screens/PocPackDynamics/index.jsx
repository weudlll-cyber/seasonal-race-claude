// ============================================================
// PocPackDynamics/index.jsx
// Hidden route: /poc-pack-dynamics
//
// Visueller Proof-of-Concept für Pack-Dynamics-Architektur.
// Kein Race-Setup, keine Lobby.  Startet sofort beim Aufrufen.
//
// Render-Reihenfolge (spec §RENDER-VORGABE):
//   1. Background + Streckenfläche
//   2. Body-Pass (alle Racer, aufsteigend nach tPos(t))
//   3. Kopf-Pass (alle Racer, gleiche Sortierung) → Köpfe nie verdeckt
//   4. Debug-Overlay (optional)
//   5. HUD (Buttons, Info-Text)
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import { HORSE_COATS } from '../../modules/racer-types/HorseRacerType.js';
import { getCoatVariants, tintSprite } from '../../modules/racer-types/spriteTinter.js';
import { getCachedSprite, loadSprite } from '../../modules/racer-types/spriteLoader.js';
import { POC_OVAL } from './pocOval.js';
import { PackDynamicsEngine, tPos } from './PackDynamicsEngine.js';

// ─── Canvas size ──────────────────────────────────────────────────────────────
const CW = 1280;
const CH = 720;

// ─── Sprite constants (HorseRacerType) ───────────────────────────────────────
const SPRITE_URL = '/assets/racers/horse-trot.png';
const FRAME_W = 128;
const FRAME_H = 128;
const FRAME_COUNT = 8;
const BASE_PERIOD_MS = 700;
const DISPLAY_SIZE = 40; // px at scale 1
// Decision: top 38 % of the horse sprite frame contains head + neck.
// Empirically: the horse sprite has head at top, legs at bottom, with a
// clear anatomical break around 35–42 % of frame height.
const HEAD_FRAC = 0.38;
const BASE_ROT = Math.PI / 2; // sprite faces "up" → rotate to face track direction

// ─── Group debug colours ──────────────────────────────────────────────────────
const GROUP_COLORS = { lead: '#ff4444', peloton: '#4499ff', chase: '#44cc66' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

function frameIndex(ts, speed) {
  const safeSpeed = Math.max(speed ?? 0.1, 0.1);
  const period = Math.min(1500, Math.max(200, BASE_PERIOD_MS / safeSpeed));
  return Math.floor(((ts % period) / period) * FRAME_COUNT) % FRAME_COUNT;
}

// ─── Track-surface drawing (uses EditorShape edge points) ─────────────────────
function drawTrackSurface(ctx, shape) {
  const n = 160;
  const { outer, inner } = shape.getEdgePoints(n);

  // Outer field (dark earth).
  ctx.fillStyle = '#4a5a2a';
  ctx.fillRect(0, 0, CW, CH);

  // Track surface (dirt/packed earth).
  ctx.beginPath();
  ctx.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i <= n; i++) ctx.lineTo(outer[i].x, outer[i].y);
  ctx.closePath();
  ctx.fillStyle = '#b88040';
  ctx.fill();

  // Inner field (grass).
  ctx.beginPath();
  ctx.moveTo(inner[0].x, inner[0].y);
  for (let i = 1; i <= n; i++) ctx.lineTo(inner[i].x, inner[i].y);
  ctx.closePath();
  ctx.fillStyle = '#3a6a1a';
  ctx.fill();

  // Track edge lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  for (const pts of [outer, inner]) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i <= n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  // Start/finish line at t ≈ 0 (leftmost point of oval).
  const startPos = shape.getPosition(0, 0);
  const inner0 = shape.getPosition(0, -0.5);
  const outer0 = shape.getPosition(0, 0.5);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(inner0.x, inner0.y);
  ctx.lineTo(outer0.x, outer0.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Suppress unused-var lint: startPos used only for clarity.
  void startPos;
}

// ─── Sprite draw helpers ──────────────────────────────────────────────────────

function getDrawable(coatId) {
  const variants = getCoatVariants.cached(SPRITE_URL);
  if (variants) {
    return variants.get(coatId) ?? variants.get('cream');
  }
  // Fallback: base sprite uncoloured.
  return getCachedSprite(SPRITE_URL) ?? null;
}

// Draw only the body portion of the sprite (skipping head).
function drawBody(ctx, r, ts, displaySizeScale) {
  const drawable = getDrawable(r.coatId);
  const scale = (DISPLAY_SIZE * displaySizeScale) / FRAME_H;
  const dw = FRAME_W * scale;
  const dh = FRAME_H * scale;
  const headPx = FRAME_H * HEAD_FRAC; // source pixels for head
  const headDh = dh * HEAD_FRAC; // dest height for head
  const bodyPx = FRAME_H - headPx; // source pixels for body
  const bodyDh = dh - headDh; // dest height for body
  const sx = frameIndex(ts, r.speed) * FRAME_W;

  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);
  ctx.rotate(BASE_ROT);

  if (!drawable) {
    // Fallback circle (body only, no head).
    ctx.fillStyle = r.color ?? '#ccaa66';
    ctx.beginPath();
    ctx.ellipse(0, dh * 0.1, dw * 0.35, dh * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Draw body: source rows [headPx .. FRAME_H], dest starting at head bottom.
    ctx.drawImage(drawable, sx, headPx, FRAME_W, bodyPx, -dw / 2, -dh / 2 + headDh, dw, bodyDh);
  }
  ctx.restore();
}

// Draw only the head portion of the sprite.
function drawHead(ctx, r, ts, displaySizeScale) {
  const drawable = getDrawable(r.coatId);
  const scale = (DISPLAY_SIZE * displaySizeScale) / FRAME_H;
  const dw = FRAME_W * scale;
  const dh = FRAME_H * scale;
  const headPx = FRAME_H * HEAD_FRAC;
  const headDh = dh * HEAD_FRAC;
  const sx = frameIndex(ts, r.speed) * FRAME_W;

  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);
  ctx.rotate(BASE_ROT);

  if (!drawable) {
    // Fallback: coloured circle for head.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -dh / 2 + headDh * 0.4, dw * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Draw head: source rows [0 .. headPx], same anchor as body.
    ctx.drawImage(drawable, sx, 0, FRAME_W, headPx, -dw / 2, -dh / 2, dw, headDh);
  }
  ctx.restore();
}

// ─── Debug-Overlay drawing ─────────────────────────────────────────────────────
function drawDebugOverlay(ctx, sortedRacers, groups, heroCount, raceTimeSec, seed) {
  // Coloured group rings.
  for (const r of sortedRacers) {
    const groupColor = GROUP_COLORS[r.groupId] ?? '#888888';
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9, r.angle, 0, Math.PI * 2);
    ctx.strokeStyle = groupColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.restore();
  }

  // Hero markers: additional yellow ring.
  for (const r of sortedRacers) {
    if (!r.isHero) continue;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 13, r.angle, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffdd00';
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Info text box.
  const lines = [
    `Hero-Racer: ${heroCount}`,
    `Gruppen: ${groups.length}`,
    `Zeit: ${raceTimeSec.toFixed(1)} s`,
    `Seed: ${seed}`,
  ];
  const boxW = 170;
  const boxH = lines.length * 18 + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(10, 10, boxW, boxH);
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#eee';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 18, 16 + i * 18);
  }
}

// ─── Slow-motion info strip ───────────────────────────────────────────────────
function drawSlowMoIndicator(ctx) {
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(CW / 2 - 70, 8, 140, 26);
  ctx.fillStyle = '#ffcc00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SLOW MOTION  ×0.25', CW / 2, 21);
  ctx.restore();
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PocPackDynamicsScreen() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const engineRef = useRef(null);
  const shapeRef = useRef(null);
  const lastTsRef = useRef(null);
  // React state only for HUD re-render (buttons).
  // seed is initialized via lazy function so it doesn't read a ref during render.
  const [paused, setPaused] = useState(false);
  const [slowMo, setSlowMo] = useState(false);
  const [debugOverlay, setDebugOverlay] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [seed, setSeed] = useState(randomSeed);

  const stateRef = useRef({
    paused: false,
    slowMo: false,
    debugOverlay: false,
    zoom: 1,
    seed: 0, // synced from React state via useEffect below
    sortedRacers: [],
  });

  // Keep stateRef in sync with React state.
  useEffect(() => {
    stateRef.current.paused = paused;
  }, [paused]);
  useEffect(() => {
    stateRef.current.slowMo = slowMo;
  }, [slowMo]);
  useEffect(() => {
    stateRef.current.debugOverlay = debugOverlay;
  }, [debugOverlay]);
  useEffect(() => {
    stateRef.current.zoom = zoom;
  }, [zoom]);
  useEffect(() => {
    stateRef.current.seed = seed;
  }, [seed]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'd' || e.key === 'D') setDebugOverlay((v) => !v);
      if (e.key === '+' || e.key === '=') setZoom((v) => Math.min(3, +(v + 0.25).toFixed(2)));
      if (e.key === '-') setZoom((v) => Math.max(0.5, +(v - 0.25).toFixed(2)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Engine initialisation ────────────────────────────────────────────────────
  const startEngine = useCallback((newSeed) => {
    if (!engineRef.current) {
      engineRef.current = new PackDynamicsEngine(newSeed, 40);
    } else {
      engineRef.current.restart(newSeed);
    }
    if (!shapeRef.current) {
      shapeRef.current = new EditorShape(POC_OVAL, { samples: 400 });
    }
    lastTsRef.current = null;
  }, []);

  // ── Restart ──────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    const newSeed = randomSeed();
    setSeed(newSeed);
    startEngine(newSeed);
    setPaused(false);
  }, [startEngine]);

  // ── rAF loop ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    startEngine(stateRef.current.seed);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    const shape = shapeRef.current;

    // Pre-warm coat variant cache so horses render on frame 1.
    loadSprite(SPRITE_URL).then(() => {
      const img = getCachedSprite(SPRITE_URL);
      if (img) {
        for (const coat of HORSE_COATS) {
          if (coat.tint) tintSprite(img, coat.tint);
        }
      }
    });

    function loop(ts) {
      rafRef.current = requestAnimationFrame(loop);
      const st = stateRef.current;

      if (st.paused) return;

      if (lastTsRef.current === null) lastTsRef.current = ts;
      let dt = Math.min(ts - lastTsRef.current, 50);
      lastTsRef.current = ts;

      if (st.slowMo) dt *= 0.25;

      const engine = engineRef.current;
      const sorted = engine.update(dt, ts);
      st.sortedRacers = sorted;

      // Compute world-space positions for all racers.
      for (const r of sorted) {
        const tp = tPos(r.t);
        const pos = shape.getPosition(tp, r.physicalY / 2);
        r.x = pos.x;
        r.y = pos.y;
        r.angle = pos.angle;
      }

      // ── Render ────────────────────────────────────────────────────────────
      const z = st.zoom;
      const offsetX = CW / 2 - (CW / 2) * z;
      const offsetY = CH / 2 - (CH / 2) * z;

      ctx.clearRect(0, 0, CW, CH);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(z, z);

      // 1. Track surface.
      drawTrackSurface(ctx, shape);

      // 2. Body pass (spec: Körper-Pass).
      for (const r of sorted) drawBody(ctx, r, ts, 1);

      // 3. Head pass (spec: Kopf-Pass — Köpfe nie verdeckt).
      for (const r of sorted) drawHead(ctx, r, ts, 1);

      // 4. Debug overlay.
      if (st.debugOverlay) {
        drawDebugOverlay(
          ctx,
          sorted,
          engine.groups,
          engine.heroCount,
          engine.raceTimeMs / 1000,
          st.seed
        );
      }

      ctx.restore();

      // 5. Screen-space HUD (zoom-independent).
      if (st.slowMo) drawSlowMoIndicator(ctx);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once; controls are handled via stateRef

  // ── Zoom helpers ─────────────────────────────────────────────────────────────
  const zoomIn = () => setZoom((v) => Math.min(3, +(v + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((v) => Math.max(0.5, +(v - 0.25).toFixed(2)));

  // ── Layout ────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <canvas ref={canvasRef} width={CW} height={CH} style={styles.canvas} />

      {/* Control bar */}
      <div style={styles.controls}>
        {!paused ? (
          <button style={styles.btn} onClick={() => setPaused(true)}>
            ⏸ Pause
          </button>
        ) : (
          <button style={{ ...styles.btn, ...styles.btnActive }} onClick={() => setPaused(false)}>
            ▶ Resume
          </button>
        )}

        <button style={styles.btn} onClick={handleRestart}>
          ↺ Restart
        </button>

        <button
          style={slowMo ? { ...styles.btn, ...styles.btnActive } : styles.btn}
          onClick={() => setSlowMo((v) => !v)}
        >
          🐢 Slow-Mo
        </button>

        <button
          style={debugOverlay ? { ...styles.btn, ...styles.btnActive } : styles.btn}
          onClick={() => setDebugOverlay((v) => !v)}
        >
          🔍 Debug [D]
        </button>

        <span style={styles.sep} />

        <button style={styles.btn} onClick={zoomOut}>
          − Zoom
        </button>
        <span style={styles.zoomLabel}>{Math.round(zoom * 100)} %</span>
        <button style={styles.btn} onClick={zoomIn}>
          + Zoom
        </button>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <span style={{ color: '#ff4444' }}>■</span> Führungs-Gruppe &nbsp;
        <span style={{ color: '#4499ff' }}>■</span> Hauptfeld &nbsp;
        <span style={{ color: '#44cc66' }}>■</span> Verfolger &nbsp;
        <span style={{ color: '#ffdd00' }}>◯</span> Hero-Racer &nbsp;|&nbsp; Hotkeys: <kbd>D</kbd>{' '}
        Debug &nbsp;<kbd>+</kbd>/<kbd>−</kbd> Zoom
      </div>
    </div>
  );
}

// ─── Inline styles ────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#111',
    minHeight: '100vh',
    padding: '12px 0 8px',
    gap: 8,
    fontFamily: 'sans-serif',
  },
  canvas: {
    display: 'block',
    background: '#111',
    borderRadius: 6,
    boxShadow: '0 0 24px rgba(0,0,0,0.8)',
    maxWidth: '100%',
    height: 'auto',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: '6px 12px',
  },
  btn: {
    background: 'rgba(255,255,255,0.12)',
    color: '#eee',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 5,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 13,
  },
  btnActive: {
    background: 'rgba(255,200,50,0.25)',
    borderColor: '#ffcc00',
    color: '#ffcc00',
  },
  sep: {
    width: 1,
    height: 24,
    background: 'rgba(255,255,255,0.2)',
    margin: '0 4px',
  },
  zoomLabel: {
    color: '#aaa',
    fontSize: 13,
    minWidth: 44,
    textAlign: 'center',
  },
  legend: {
    fontSize: 12,
    color: '#aaa',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    padding: '4px 16px',
  },
};
