import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getShape } from '../../modules/track-shapes/index.js';
import { getTrackWidth } from '../../modules/track-shapes/SvgPathShape.js';
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

const tPos = (t) => ((t % 1) + 1) % 1;

export default function RaceScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const g = useRef(null);
  const envRef = useRef(null);
  const shapeRef = useRef(null);
  const racerTypeRef = useRef(null);

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

    const shapeId = raceData.shapeId || raceData.curveStyle || 'oval';
    const envId = raceData.environmentId || 'dirt';
    const typeId = raceData.racerTypeId || 'horse';

    console.log('[RaceScreen] shapeId:', shapeId, '| envId:', envId, '| typeId:', typeId);

    shapeRef.current = getShape(shapeId, CW, CH);
    envRef.current = getEnvironment(envId, CW, CH);
    racerTypeRef.current = getRacerType(typeId);
    const isOpenTrack = shapeRef.current.isOpen === true;

    const trackEmoji = RACER_TYPE_EMOJIS[typeId] ?? null;

    // Use track-configured width if set, otherwise compute from player count
    const trackWidth = raceData.trackWidth ?? getTrackWidth(nRacers);

    // Build initial racer state — all start at t=0, random perpendicular offset
    g.current = {
      phase: PHASE.COUNTDOWN,
      countdownStart: null,
      raceStart: null,
      lastTs: null,
      finishedCount: 0,
      winnersNeeded: Math.min(raceData.winners ?? 3, nRacers),
      dustParticles: [],
      burstParticles: [],
      trackWidth,
      racers: raceData.racers.map((r, i) => ({
        ...r,
        index: i,
        t: 0,
        // Stable random offset assigned once — spreads racers across track width
        trackOffset: (Math.random() - 0.5) * 0.7,
        icon: trackEmoji ?? r.icon,
        baseSpeed: 0.00085 + Math.random() * 0.00035,
        color: LANE_COLORS[i % LANE_COLORS.length],
        finished: false,
        finishRank: null,
        trail: [],
        x: 0,
        y: 0,
        angle: 0,
      })),
    };

    setScoreboard(g.current.racers.map((r) => ({ ...r, rank: 0 })));

    // ── Compute canvas positions for all racers ─────────────────────────────
    function computePositions() {
      const st = g.current;
      const shape = shapeRef.current;
      const tw = st.trackWidth;
      for (const r of st.racers) {
        const t = isOpenTrack ? Math.min(r.t, 1) : tPos(r.t);
        const pos = shape.getPosition(t, r.trackOffset, tw);
        r.x = pos.x;
        r.y = pos.y;
        r.angle = pos.angle;
      }
    }

    // ── Collision avoidance — nudge overlapping racers apart (perpendicular) ─
    function applyCollisionAvoidance() {
      const st = g.current;
      const active = st.racers.filter((r) => !r.finished);
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const r1 = active[i],
            r2 = active[j];
          const dx = r2.x - r1.x,
            dy = r2.y - r1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 25 && dist > 0) {
            const nudge = (25 - dist) / 2;
            const angle = r1.angle;
            const perpX = -Math.sin(angle);
            const perpY = Math.cos(angle);
            r1.x += perpX * nudge * 0.5;
            r1.y += perpY * nudge * 0.5;
            r2.x -= perpX * nudge * 0.5;
            r2.y -= perpY * nudge * 0.5;
          }
        }
      }
    }

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

    // ── Draw: all particles ─────────────────────────────────────────────────
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

    // ── Draw: name tag above a racer ────────────────────────────────────────
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

    // ── Draw: all racers using precomputed positions ─────────────────────────
    function drawRacers() {
      const st = g.current;
      const rt = racerTypeRef.current;
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));

      for (const r of st.racers) {
        const px = r.x,
          py = r.y,
          angle = r.angle;

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

        rt.drawRacer(ctx, px, py, angle, r, r === leader, st.lastTs ?? 0);
        drawNameTag(px, py, r.name, r === leader);

        r.trail.push({ x: px, y: py });
        if (r.trail.length > 10) r.trail.shift();
      }
    }

    // ── Draw: race title ─────────────────────────────────────────────────────
    function drawTitle() {
      const tw = g.current.trackWidth;
      const topY = Math.min(...shapeRef.current.getEdgePoints(tw, 30).outer.map((p) => p.y));
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
      env.drawTrackSurface(ctx, shape, st.trackWidth, ts);

      drawTitle();

      // Always compute positions so all phases have valid x/y/angle
      computePositions();

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
        // Advance t values
        for (const r of st.racers) {
          if (r.finished) continue;
          r.t += (r.baseSpeed + (Math.random() - 0.5) * 0.00035) * (dt / 16);
        }

        // Recompute positions after t update
        computePositions();

        // Collision avoidance
        applyCollisionAvoidance();

        // Finish detection
        for (const r of st.racers) {
          if (r.finished) continue;
          if (r.t >= 1.0) {
            r.finished = true;
            r.finishRank = ++st.finishedCount;
            emitBurst(r.x, r.y);
          }
        }

        // Trail particles from racer-type module
        const rt = racerTypeRef.current;
        for (const r of st.racers) {
          if (r.finished) continue;
          const newParts = rt.getTrailParticles(r.x, r.y, r.baseSpeed, r.angle, ts);
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
