import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RaceScreen.css';

// ── Canvas size ─────────────────────────────────────────────────────────────
const CW = 1280;
const CH = 720;

// Track center (shifted down so title text fits above)
const TX = CW / 2; // 640
const TY = 415; // vertical center of oval

// Lane accent colours (one per racer slot)
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

// Countdown text colours: index = seconds remaining (3→red, 2→yellow, 1→green, 0→GO)
const CD_COLORS = ['#00ff55', '#33ff88', '#ffcc00', '#ff3333'];

const PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 };

export default function RaceScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const g = useRef(null);

  const [raceData, setRaceData] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(PHASE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [scoreboard, setScoreboard] = useState([]);

  // ── Load race data ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('activeRace');
      if (!raw) throw new Error('No race data. Please start a race from Setup.');
      setRaceData(JSON.parse(raw));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // ── Animation loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!raceData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const nRacers = raceData.racers.length;

    // Track geometry — calculated once, closed over by all draw functions.
    // TW uses a uniform ±TW/2 offset in BOTH rx and ry directions so the
    // visible band height at the top of the oval equals TW (not TW*0.39).
    const TRX = 455; // centerline x-radius (slightly smaller than before)
    const TRY = 175; // centerline y-radius
    const TW = Math.min(Math.max(180, nRacers * 32), 260); // at least 30px/lane
    const LANE_W = TW / Math.max(nRacers, 1); // pixels per lane

    // Proper modulo for negative starting offsets (racers begin with t < 0)
    const tPos = (t) => ((t % 1) + 1) % 1;

    // Each racer travels on their own concentric ellipse (laneRx × laneRy).
    // Inner lanes = smaller ellipse, outer lanes = larger ellipse — exactly
    // how real oval tracks work. No perpendicular offset needed.
    function tp(t, laneRx, laneRy) {
      const a = 2 * Math.PI * t - Math.PI / 2;
      return {
        x: TX + laneRx * Math.cos(a),
        y: TY + laneRy * Math.sin(a),
      };
    }

    // Force correct emoji per track type (racer-type-per-track will be
    // handled properly later; for now override at the race screen level).
    const TRACK_ICON = {
      'dirt-oval': '🐴',
      'river-run': '🦆',
      'space-sprint': '🚀',
      'garden-path': '🐌',
      'city-circuit': '🚗',
    };
    const trackIcon = TRACK_ICON[raceData.trackId] ?? null;

    // Build initial game state
    g.current = {
      phase: PHASE.COUNTDOWN,
      countdownStart: null,
      raceStart: null,
      lastTs: null,
      finishedCount: 0,
      winnersNeeded: Math.min(raceData.winners ?? 3, nRacers),
      dustParticles: [],
      burstParticles: [],
      racers: raceData.racers.map((r, i) => {
        // delta ranges from -(TW/2 - half_lane) to +(TW/2 - half_lane),
        // keeping every racer's ellipse strictly inside the track band.
        const delta = -TW / 2 + (i + 0.5) * LANE_W;
        return {
          ...r,
          index: i,
          // Stagger behind the start line: racer 0 is at t=0, others are
          // slightly behind (negative t = before the finish line).
          t: -i * 0.02,
          laneRx: TRX + delta,
          // Uniform ±delta in ry (same magnitude as rx) so the visible band
          // height at the top of the oval equals LANE_W, not LANE_W*(TRY/TRX).
          laneRy: TRY + delta,
          icon: trackIcon ?? r.icon,
          baseSpeed: 0.00085 + Math.random() * 0.00035,
          color: LANE_COLORS[i % LANE_COLORS.length],
          finished: false,
          finishRank: null,
          trail: [],
        };
      }),
    };

    setScoreboard(g.current.racers.map((r) => ({ ...r, rank: 0 })));

    // ── Helpers ─────────────────────────────────────────────────────────────

    function emitBurst(x, y) {
      const colors = ['#ffd700', '#ff6b35', '#ff3388', '#00ffcc', '#fff', '#ff0', '#0ff'];
      for (let i = 0; i < 45; i++) {
        const angle = (i / 45) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 2 + Math.random() * 7;
        g.current.burstParticles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          alpha: 1,
          r: 2 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    // ── Draw: background + grandstand ────────────────────────────────────────
    function drawBg(ts) {
      // Animated dark gradient
      const pulse = 0.5 + 0.5 * Math.sin(ts * 0.0007);
      const grad = ctx.createLinearGradient(0, 0, CW, CH);
      grad.addColorStop(0, '#030310');
      grad.addColorStop(0.5, `hsl(250,${25 + pulse * 12}%,${7 + pulse * 4}%)`);
      grad.addColorStop(1, '#030310');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);

      // Subtle star field
      const STARS = [
        [80, 35],
        [180, 18],
        [310, 48],
        [470, 12],
        [620, 42],
        [770, 22],
        [920, 55],
        [1060, 15],
        [1190, 38],
        [1240, 60],
        [40, 62],
        [390, 68],
        [730, 70],
        [1100, 50],
      ];
      for (const [sx, sy] of STARS) {
        ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(ts * 0.001 + sx * 0.05));
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Grandstand strip — plain dark bar, no floating dots outside the track
      ctx.fillStyle = 'rgba(18,10,4,0.88)';
      ctx.fillRect(0, 0, CW, 58);
      ctx.strokeStyle = 'rgba(255,160,50,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.lineTo(CW, 58);
      ctx.stroke();

      // Race title inside canvas (below grandstand, above track)
      const topOfTrack = TY - TRY - TW / 2;
      const titleY = 58 + (topOfTrack - 58) / 2;
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

    // ── Draw: oval track ─────────────────────────────────────────────────────
    function drawTrack(ts) {
      const pulse = 0.5 + 0.5 * Math.sin(ts * 0.0022);
      const glowAmt = 14 + 12 * pulse;

      // Uniform ±TW/2 in both directions. outerRy - innerRy = TW, so the
      // visible band at the top of the oval is exactly TW pixels tall —
      // matching what the lane ellipses actually use.
      const outerRx = TRX + TW / 2;
      const outerRy = TRY + TW / 2;
      const innerRx = TRX - TW / 2;
      const innerRy = TRY - TW / 2;

      // Sand fill
      ctx.beginPath();
      ctx.ellipse(TX, TY, outerRx, outerRy, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#c8a46a';
      ctx.fill();

      // Inner area (dark space)
      ctx.beginPath();
      ctx.ellipse(TX, TY, innerRx, innerRy, 0, 0, 2 * Math.PI);
      const innerGrad = ctx.createRadialGradient(TX, TY, 0, TX, TY, innerRx);
      innerGrad.addColorStop(0, '#04091a');
      innerGrad.addColorStop(0.6, '#060d28');
      innerGrad.addColorStop(1, '#0a1535');
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Subtle inner-area rings
      for (let r = 40; r < innerRy - 8; r += 35) {
        ctx.strokeStyle = 'rgba(80,120,200,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(TX, TY, (r * TRX) / TRY, r, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Lane dividers — one concentric ellipse at each lane boundary
      for (let i = 1; i < nRacers; i++) {
        const delta = -TW / 2 + i * LANE_W; // boundary between lane i-1 and i
        const rxi = TRX + delta;
        const ryi = TRY + delta; // uniform, matches laneRy formula
        if (rxi > 0 && ryi > 0) {
          ctx.beginPath();
          ctx.ellipse(TX, TY, rxi, ryi, 0, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255,255,255,0.07)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Outer neon border
      ctx.shadowBlur = glowAmt * 2;
      ctx.shadowColor = '#00eeff';
      ctx.strokeStyle = `rgba(0,${180 + Math.round(70 * pulse)},255,0.92)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(TX, TY, outerRx, outerRy, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Inner neon border
      ctx.shadowBlur = glowAmt;
      ctx.shadowColor = '#00eeff';
      ctx.strokeStyle = `rgba(0,${160 + Math.round(70 * pulse)},230,0.75)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(TX, TY, innerRx, innerRy, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Finish line — t=0 is the top of the oval (tangent is horizontal there).
      // The line spans from inner to outer edge of the track band, vertically.
      const finishX = TX;
      const finishTop = TY - outerRy;
      const finishHeight = outerRy - innerRy;
      const checkers = 8;
      const segH = finishHeight / checkers;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      for (let i = 0; i < checkers; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#1a1a1a';
        ctx.fillRect(finishX - 7, finishTop + i * segH, 14, segH);
      }
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('FINISH', finishX, finishTop - 5);
    }

    // ── Draw: particles (dust + burst) ───────────────────────────────────────
    function drawParticles() {
      for (const p of g.current.dustParticles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#d4b880';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fill();
      }
      for (const p of g.current.burstParticles) {
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    // ── Draw: racers with trails, name tags, crown ───────────────────────────
    function drawRacers() {
      const st = g.current;
      // Find current leader (highest t)
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));

      for (const r of st.racers) {
        const pos = tp(tPos(r.t), r.laneRx, r.laneRy);

        // Speed trail — oldest point first (most transparent/small)
        for (let i = 0; i < r.trail.length; i++) {
          const frac = (i + 1) / r.trail.length;
          ctx.globalAlpha = frac * 0.4;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(r.trail[i].x, r.trail[i].y, frac * 5 + 1, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Emoji racer
        ctx.font = '26px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.icon, pos.x, pos.y);

        // Name tag background + text (above emoji)
        const nameY = pos.y - 20;
        ctx.font = 'bold 11px sans-serif';
        const nameW = ctx.measureText(r.name).width + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(pos.x - nameW / 2, nameY - 13, nameW, 13);
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = r === leader ? '#ffd700' : '#eee';
        ctx.fillText(r.name, pos.x, nameY);

        // Crown above leader's name tag
        if (r === leader && st.phase === PHASE.RACING) {
          ctx.font = '14px serif';
          ctx.textBaseline = 'bottom';
          ctx.fillText('👑', pos.x, nameY - 13);
        }

        // Record trail position
        r.trail.push({ x: pos.x, y: pos.y });
        if (r.trail.length > 10) r.trail.shift();
      }
    }

    // ── Draw: countdown overlay ──────────────────────────────────────────────
    function drawCountdownOverlay(elapsed) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, CW, CH);

      const n = Math.max(0, 3 - Math.floor(elapsed / 1000));
      const color = CD_COLORS[n] ?? '#fff';
      const text = n > 0 ? String(n) : 'GO!';
      const fontSize = n > 0 ? 220 : 160;
      // Scale shrinks slightly through each second for a punchy feel
      const shrink = 1 - ((elapsed % 1000) / 1000) * 0.12;

      ctx.save();
      ctx.translate(CW / 2, CH / 2);
      ctx.scale(shrink, shrink);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.shadowBlur = 70;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      setCountdown(n);
    }

    // ── Draw: finished overlay ───────────────────────────────────────────────
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

    // ── rAF main loop ────────────────────────────────────────────────────────
    function loop(ts) {
      const st = g.current;
      const dt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      st.lastTs = ts;

      ctx.clearRect(0, 0, CW, CH);
      drawBg(ts);
      drawTrack(ts);

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
        // Advance racers
        for (const r of st.racers) {
          if (r.finished) continue;
          r.t += (r.baseSpeed + (Math.random() - 0.5) * 0.00035) * (dt / 16);
          if (r.t >= 1.0) {
            r.finished = true;
            r.finishRank = ++st.finishedCount;
            // Burst at the racer's finish-line position on their lane ellipse
            const finishPos = tp(0, r.laneRx, r.laneRy);
            emitBurst(finishPos.x, finishPos.y);
          }
        }

        // Dust behind leader
        const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
        const lp = tp(tPos(leader.t), leader.laneRx, leader.laneRy);
        if (Math.random() < 0.4) {
          st.dustParticles.push({
            x: lp.x + (Math.random() - 0.5) * 10,
            y: lp.y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            alpha: 0.5,
            r: 3 + Math.random() * 3,
          });
        }

        // Age particles
        st.dustParticles = st.dustParticles
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - 0.024,
            r: p.r * 0.96,
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

        // Scoreboard ~10 fps
        if (Math.round(ts / 100) !== Math.round((ts - dt) / 100)) {
          setScoreboard(
            [...st.racers].sort((a, b) => b.t - a.t).map((r, i) => ({ ...r, rank: i + 1 }))
          );
        }

        // Check race end
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

  // ── Error / loading ─────────────────────────────────────────────────────────
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

  // Rank colours for scoreboard (gold / silver / bronze / rest)
  const RANK_PALETTE = ['#ffd700', '#c0c0c0', '#cd7f32'];

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="screen screen--race">
      <div className="race-layout">
        {/* Canvas fills the 1fr column */}
        <div className="race-canvas-wrapper">
          <canvas ref={canvasRef} width={CW} height={CH} className="race-canvas" />
        </div>

        {/* HUD sidebar */}
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
