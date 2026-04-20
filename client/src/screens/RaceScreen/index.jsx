// ============================================================
// File:        index.jsx
// Path:        client/src/screens/RaceScreen/index.jsx
// Project:     RaceArena
// Created:     2026-04-20
// Description: Main race canvas screen — orchestrates shape, environment
//              and racer-type modules to render the animated race.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getShape } from '../../modules/track-shapes/index.js';
import { getEnvironment } from '../../modules/environments/index.js';
import { getRacerType, RACER_TYPE_EMOJIS } from '../../modules/racer-types/index.js';
import './RaceScreen.css';

const CW = 1280;
const CH = 720;

const LANE_COLORS = [
  '#ff6b35',
  '#4fc3f7',
  '#a5d6a7',
  '#ffcc02',
  '#ce93d8',
  '#f48fb1',
  '#80cbc4',
  '#ffab40',
  '#90caf9',
  '#ef9a9a',
];

const CD_COLORS = ['#00ff55', '#33ff88', '#ffcc00', '#ff3333'];
const RANK_PALETTE = ['#ffd700', '#c0c0c0', '#cd7f32'];

const PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 };

// Proper modulo for t values that may be negative or > 1
const tPos = (t) => ((t % 1) + 1) % 1;

export default function RaceScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const g = useRef(null); // mutable game state
  const envRef = useRef(null); // environment instance
  const shapeRef = useRef(null); // shape instance
  const racerTypeRef = useRef(null); // racer-type instance (shared for all racers)

  const [raceData, setRaceData] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(PHASE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [scoreboard, setScoreboard] = useState([]);

  // ── Load race session data ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('activeRace');
      if (!raw) throw new Error('No race data. Please start a race from Setup.');
      setRaceData(JSON.parse(raw));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // ── Main animation loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (!raceData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const nRacers = raceData.racers.length;

    // Resolve shape, environment and racer-type from race data
    const shapeId = raceData.shapeId || raceData.curveStyle || 'oval';
    const envId = raceData.environmentId || 'dirt';
    const typeId = raceData.racerTypeId || 'horse';

    shapeRef.current = getShape(shapeId, CW, CH);
    envRef.current = getEnvironment(envId, CW, CH);
    racerTypeRef.current = getRacerType(typeId);

    // Determine the emoji to use for all racers on this track
    const trackEmoji = RACER_TYPE_EMOJIS[typeId] ?? null;

    // Build initial racer state
    g.current = {
      phase: PHASE.COUNTDOWN,
      countdownStart: null,
      raceStart: null,
      lastTs: null,
      finishedCount: 0,
      winnersNeeded: Math.min(raceData.winners ?? 3, nRacers),
      dustParticles: [],
      burstParticles: [],
      racers: raceData.racers.map((r, i) => ({
        ...r,
        index: i,
        laneIndex: i,
        t: 0,
        icon: trackEmoji ?? r.icon,
        baseSpeed: 0.00085 + Math.random() * 0.00035,
        color: LANE_COLORS[i % LANE_COLORS.length],
        finished: false,
        finishRank: null,
        trail: [],
      })),
    };

    setScoreboard(g.current.racers.map((r) => ({ ...r, rank: 0 })));

    // ── Burst emitter ───────────────────────────────────────────────────────
    function emitBurst(x, y) {
      const colors = ['#ffd700', '#ff6b35', '#ff3388', '#00ffcc', '#fff', '#ff0', '#0ff'];
      for (let i = 0; i < 45; i++) {
        const a = (i / 45) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 2 + Math.random() * 7;
        g.current.burstParticles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          alpha: 1,
          r: 2 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    // ── Draw: all particles (trail dust + burst) ────────────────────────────
    function drawParticles() {
      for (const p of g.current.dustParticles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color ?? '#d4b880';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of g.current.burstParticles) {
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    // ── Draw: name tag above a racer position ──────────────────────────────
    function drawNameTag(px, py, name, isLeader) {
      const nameY = py - 22;
      ctx.font = 'bold 11px sans-serif';
      const nameW = ctx.measureText(name).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(px - nameW / 2, nameY - 13, nameW, 13);
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'center';
      ctx.fillStyle = isLeader ? '#ffd700' : '#eee';
      ctx.fillText(name, px, nameY);
      if (isLeader && g.current.phase === PHASE.RACING) {
        ctx.font = '14px serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText('👑', px, nameY - 13);
      }
    }

    // ── Draw: all racers ───────────────────────────────────────────────────
    function drawRacers() {
      const st = g.current;
      const shape = shapeRef.current;
      const rt = racerTypeRef.current;
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));

      for (const r of st.racers) {
        const pos = shape.getPosition(tPos(r.t), r.laneIndex, nRacers);

        // Speed trail dots
        for (let i = 0; i < r.trail.length; i++) {
          const frac = (i + 1) / r.trail.length;
          ctx.globalAlpha = frac * 0.4;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(r.trail[i].x, r.trail[i].y, frac * 5 + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Racer visual (emoji + type-specific animation)
        rt.drawRacer(ctx, pos.x, pos.y, pos.angle, r, r === leader, st.lastTs ?? 0);

        // Name tag
        drawNameTag(pos.x, pos.y, r.name, r === leader);

        // Record trail point
        r.trail.push({ x: pos.x, y: pos.y });
        if (r.trail.length > 10) r.trail.shift();
      }
    }

    // ── Draw: race title inside canvas ────────────────────────────────────
    function drawTitle() {
      const cp = shapeRef.current.getCenterPoint();
      const topY = Math.min(...shapeRef.current.getEdgePoints(nRacers, 30).outer.map((p) => p.y));
      const titleY = 58 + (topY - 58) / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffd700';
      ctx.fillText(
        `🏆  ${raceData.eventName || 'Race'}  ·  ${raceData.trackName || ''}`,
        CW / 2,
        titleY
      );
      ctx.shadowBlur = 0;
    }

    // ── Draw: countdown overlay ───────────────────────────────────────────
    function drawCountdownOverlay(elapsed) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, CW, CH);

      const n = Math.max(0, 3 - Math.floor(elapsed / 1000));
      const color = CD_COLORS[n] ?? '#fff';
      const text = n > 0 ? String(n) : 'GO!';
      const fSize = n > 0 ? 220 : 160;
      const shrink = 1 - ((elapsed % 1000) / 1000) * 0.12;

      ctx.save();
      ctx.translate(CW / 2, CH / 2);
      ctx.scale(shrink, shrink);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fSize}px sans-serif`;
      ctx.shadowBlur = 70;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
      setCountdown(n);
    }

    // ── Draw: finished overlay ────────────────────────────────────────────
    function drawFinishedOverlay() {
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 80px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 45;
      ctx.shadowColor = '#ffd700';
      ctx.fillText('RACE FINISHED!', CW / 2, CH / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.font = '26px sans-serif';
      ctx.fillStyle = '#bbb';
      ctx.fillText('Loading results…', CW / 2, CH / 2 + 58);
    }

    // ── Main rAF loop ─────────────────────────────────────────────────────
    function loop(ts) {
      const st = g.current;
      const env = envRef.current;
      const shape = shapeRef.current;
      const dt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      st.lastTs = ts;

      ctx.clearRect(0, 0, CW, CH);

      // Draw environment layers
      env.drawBackground(ctx, ts);
      env.drawTrackSurface(ctx, shape, nRacers, ts);

      drawTitle();

      // ── COUNTDOWN ──
      if (st.phase === PHASE.COUNTDOWN) {
        if (!st.countdownStart) st.countdownStart = ts;
        const elapsed = ts - st.countdownStart;
        drawParticles();
        drawRacers();
        drawCountdownOverlay(elapsed);
        if (elapsed >= 4000) {
          st.phase = PHASE.RACING;
          st.raceStart = ts;
          setPhase(PHASE.RACING);
        }

        // ── RACING ──
      } else if (st.phase === PHASE.RACING) {
        for (const r of st.racers) {
          if (r.finished) continue;
          r.t += (r.baseSpeed + (Math.random() - 0.5) * 0.00035) * (dt / 16);
          if (r.t >= 1.0) {
            r.finished = true;
            r.finishRank = ++st.finishedCount;
            const finishPos = shape.getPosition(0, r.laneIndex, nRacers);
            emitBurst(finishPos.x, finishPos.y);
          }
        }

        // Emit trail particles from racer-type module
        const rt = racerTypeRef.current;
        for (const r of st.racers) {
          if (r.finished) continue;
          const pos = shape.getPosition(tPos(r.t), r.laneIndex, nRacers);
          const newParts = rt.getTrailParticles(pos.x, pos.y, r.baseSpeed, pos.angle, ts);
          st.dustParticles.push(...newParts);
        }

        // Age particles
        st.dustParticles = st.dustParticles
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - 0.022,
            r: p.r * 0.97,
          }))
          .filter((p) => p.alpha > 0);
        st.burstParticles = st.burstParticles
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.18,
            alpha: p.alpha - 0.014,
            r: p.r * 0.97,
          }))
          .filter((p) => p.alpha > 0);

        drawParticles();
        drawRacers();

        // Throttled scoreboard update (~10 fps)
        if (Math.round(ts / 100) !== Math.round((ts - dt) / 100)) {
          setScoreboard(
            [...st.racers].sort((a, b) => b.t - a.t).map((r, i) => ({ ...r, rank: i + 1 }))
          );
        }

        // Race end check
        if (st.finishedCount >= st.winnersNeeded) {
          st.phase = PHASE.FINISHED;
          setPhase(PHASE.FINISHED);

          const byRank = st.racers
            .filter((r) => r.finished)
            .sort((a, b) => a.finishRank - b.finishRank);
          const rest = st.racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);

          sessionStorage.setItem(
            'raceResults',
            JSON.stringify({
              finishOrder: [...byRank, ...rest].map((r) => ({
                name: r.name,
                icon: r.icon,
                color: r.color,
                index: r.index,
                lap: 1,
                progress: Math.min(r.t * 100, 100),
              })),
              elapsedTime: Math.round((ts - st.raceStart) / 1000),
              race: raceData,
            })
          );
          setTimeout(() => navigate('/results'), 3000);
        }

        // ── FINISHED ──
      } else {
        st.burstParticles = st.burstParticles
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.18,
            alpha: p.alpha - 0.014,
          }))
          .filter((p) => p.alpha > 0);
        drawParticles();
        drawRacers();
        drawFinishedOverlay();
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [raceData, navigate]);

  // ── Error / loading states ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="screen screen--race race-error-screen">
        <div className="race-error-box">
          <div className="race-error-title">Error</div>
          <div className="race-error-msg">{error}</div>
          <button
            className="race-back-btn"
            onClick={() => {
              sessionStorage.removeItem('activeRace');
              navigate('/setup');
            }}
          >
            ← Back to Setup
          </button>
        </div>
      </div>
    );
  }

  if (!raceData) {
    return (
      <div className="screen screen--race race-loading-screen">
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="screen screen--race">
      <div className="race-layout">
        <div className="race-canvas-wrapper">
          <canvas ref={canvasRef} width={CW} height={CH} className="race-canvas" />
        </div>

        <aside className="race-hud">
          <div className="scoreboard">
            <div className="scoreboard-header">Live Standings</div>
            {scoreboard.map((r, i) => (
              <div
                key={r.index}
                className={`scoreboard-row${r.finished ? ' scoreboard-row--finished' : ''}`}
              >
                <span
                  className="sb-rank"
                  style={{
                    color: RANK_PALETTE[i] ?? '#888',
                    borderColor: RANK_PALETTE[i] ?? '#444',
                  }}
                >
                  {i === 0 ? '👑' : `#${i + 1}`}
                </span>
                <span className="sb-icon">{r.icon}</span>
                <div className="sb-info">
                  <span className="sb-name" style={{ color: RANK_PALETTE[i] ?? '#ddd' }}>
                    {r.name}
                  </span>
                  <div className="sb-bar-bg">
                    <div
                      className="sb-bar-fill"
                      style={{
                        width: `${Math.min(r.t ?? 0, 1) * 100}%`,
                        background: RANK_PALETTE[i] ?? r.color ?? '#4488ff',
                      }}
                    />
                  </div>
                </div>
                {r.finished && <span className="sb-check">✓</span>}
              </div>
            ))}
          </div>

          {phase === PHASE.COUNTDOWN && (
            <div className="race-phase-badge race-phase-badge--countdown">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          )}
          {phase === PHASE.FINISHED && (
            <div className="race-phase-badge race-phase-badge--finished">Finished ✓</div>
          )}

          <button
            className="race-back-btn"
            onClick={() => {
              sessionStorage.removeItem('activeRace');
              navigate('/setup');
            }}
          >
            ← Setup
          </button>
        </aside>
      </div>
    </div>
  );
}
