import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RaceScreen.css';

// ── Canvas / track constants ────────────────────────────────────────────────
const CW = 760;
const CH = 460;
const TX = CW / 2;
const TY = CH / 2;
const TRX = 295; // track centerline x-radius
const TRY = 145; // track centerline y-radius
const TW = 68; // track band width

// Returns the {x,y} position on the track centerline at t ∈ [0,1),
// offset laterally by `lane` pixels.
function trackPoint(t, lane = 0) {
  const a = 2 * Math.PI * t - Math.PI / 2;
  const bx = TX + TRX * Math.cos(a);
  const by = TY + TRY * Math.sin(a);
  if (!lane) return { x: bx, y: by };
  const dx = -TRX * Math.sin(a);
  const dy = TRY * Math.cos(a);
  const len = Math.hypot(dx, dy);
  return { x: bx + (-dy / len) * lane, y: by + (dx / len) * lane };
}

const PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 };

export default function RaceScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const g = useRef(null); // mutable game state — never triggers re-renders

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

    g.current = {
      phase: PHASE.COUNTDOWN,
      countdownStart: null,
      raceStart: null,
      lastTs: null,
      finishedCount: 0,
      winnersNeeded: Math.min(raceData.winners ?? 3, nRacers),
      particles: [],
      racers: raceData.racers.map((r, i) => ({
        ...r,
        index: i,
        t: 0,
        lane: (i - (nRacers - 1) / 2) * ((TW * 0.72) / Math.max(nRacers - 1, 1)),
        baseSpeed: 0.00085 + Math.random() * 0.00035,
        finished: false,
        finishRank: null,
      })),
    };

    setScoreboard(g.current.racers.map((r) => ({ ...r, rank: 0 })));

    // ── Drawing helpers ─────────────────────────────────────────────────────
    function drawBg() {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#1c3d1c' : '#1f431f';
        ctx.fillRect(0, (i * CH) / 10, CW, CH / 10);
      }
      // Grandstand strip
      ctx.fillStyle = 'rgba(50,35,20,0.55)';
      ctx.fillRect(0, 0, CW, 48);
      // Crowd dots
      for (let x = 14; x < CW; x += 16) {
        ctx.fillStyle = `hsl(${(x * 11) % 360},65%,52%)`;
        ctx.beginPath();
        ctx.arc(x, 12 + Math.abs(Math.sin(x * 0.5)) * 10, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    function drawTrack() {
      // Sand fill
      ctx.beginPath();
      ctx.ellipse(TX, TY, TRX + TW / 2, TRY + TW / 2, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#c9a870';
      ctx.fill();
      // Inner grass
      ctx.beginPath();
      ctx.ellipse(TX, TY, TRX - TW / 2, TRY - TW / 2, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#2a5a2a';
      ctx.fill();
      // Inner rings for depth
      for (let r = 30; r < TRY - TW / 2 - 5; r += 28) {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(TX, TY, (r * TRX) / TRY, r, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // Track borders
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(TX, TY, TRX + TW / 2, TRY + TW / 2, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(TX, TY, TRX - TW / 2, TRY - TW / 2, 0, 0, 2 * Math.PI);
      ctx.stroke();
      // Finish line — t=0 is at the top of the oval; tangent is horizontal
      // there, so the line is vertical across the track band.
      const finishX = TX;
      const finishY = TY - TRY;
      const checkers = 6;
      const segH = TW / checkers;
      for (let i = 0; i < checkers; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#111';
        ctx.fillRect(finishX - 5, finishY - TW / 2 + i * segH, 10, segH);
      }
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', finishX, finishY - TW / 2 - 5);
    }

    function drawParticles() {
      for (const p of g.current.particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#d4b880';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawRacers() {
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const r of g.current.racers) {
        const { x, y } = trackPoint(r.t % 1, r.lane);
        ctx.fillText(r.icon, x, y);
      }
    }

    function drawCountdownOverlay(n) {
      ctx.fillStyle = 'rgba(0,0,0,0.52)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (n > 0) {
        ctx.font = 'bold 130px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 24;
        ctx.shadowColor = '#fff';
        ctx.fillText(String(n), CW / 2, CH / 2);
        ctx.shadowBlur = 0;
      } else {
        ctx.font = 'bold 90px sans-serif';
        ctx.fillStyle = '#0ffa50';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#0ffa50';
        ctx.fillText('GO!', CW / 2, CH / 2);
        ctx.shadowBlur = 0;
      }
    }

    function drawFinishedOverlay() {
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 60px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#ffd700';
      ctx.fillText('RACE FINISHED!', CW / 2, CH / 2 - 18);
      ctx.shadowBlur = 0;
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#ccc';
      ctx.fillText('Loading results…', CW / 2, CH / 2 + 44);
    }

    // ── Main rAF loop ───────────────────────────────────────────────────────
    function loop(ts) {
      const st = g.current;
      const dt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      st.lastTs = ts;

      ctx.clearRect(0, 0, CW, CH);
      drawBg();
      drawTrack();

      if (st.phase === PHASE.COUNTDOWN) {
        if (!st.countdownStart) st.countdownStart = ts;
        const elapsed = ts - st.countdownStart;
        drawParticles();
        drawRacers();
        const n = Math.max(0, 3 - Math.floor(elapsed / 1000));
        drawCountdownOverlay(n);
        setCountdown(n);
        if (elapsed >= 4000) {
          st.phase = PHASE.RACING;
          st.raceStart = ts;
          setPhase(PHASE.RACING);
        }
      } else if (st.phase === PHASE.RACING) {
        // Advance racers
        for (const r of st.racers) {
          if (r.finished) continue;
          r.t += (r.baseSpeed + (Math.random() - 0.5) * 0.00035) * (dt / 16);
          if (r.t >= 1.0) {
            r.finished = true;
            r.finishRank = ++st.finishedCount;
          }
        }

        // Dust behind leader
        const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
        const lp = trackPoint(leader.t % 1, leader.lane);
        if (Math.random() < 0.38) {
          st.particles.push({
            x: lp.x + (Math.random() - 0.5) * 8,
            y: lp.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 1.8,
            vy: (Math.random() - 0.5) * 1.8,
            alpha: 0.55,
            r: 3 + Math.random() * 3.5,
          });
        }
        st.particles = st.particles
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - 0.024,
            r: p.r * 0.96,
          }))
          .filter((p) => p.alpha > 0);

        drawParticles();
        drawRacers();

        // Scoreboard update ~10 fps
        if (Math.round(ts / 100) !== Math.round((ts - dt) / 100)) {
          setScoreboard(
            [...st.racers].sort((a, b) => b.t - a.t).map((r, i) => ({ ...r, rank: i + 1 }))
          );
        }

        // Race over?
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
      } else {
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

  // ── Error / loading states ──────────────────────────────────────────────────
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

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="screen screen--race">
      <div className="race-layout">
        <div className="race-canvas-wrapper">
          <canvas ref={canvasRef} width={CW} height={CH} className="race-canvas" />
        </div>

        <aside className="race-hud">
          <div className="race-hud-header">
            <div className="race-event-name">{raceData.eventName || 'Race'}</div>
            <div className="race-track-name">{raceData.trackName}</div>
            {phase === PHASE.COUNTDOWN && (
              <div className="race-phase-badge race-phase-badge--countdown">
                {countdown > 0 ? countdown : 'GO!'}
              </div>
            )}
            {phase === PHASE.FINISHED && (
              <div className="race-phase-badge race-phase-badge--finished">Finished</div>
            )}
          </div>

          <div className="scoreboard">
            <div className="scoreboard-header">Live Standings</div>
            {scoreboard.map((r, i) => (
              <div
                key={r.index}
                className={`scoreboard-row${r.finished ? ' scoreboard-row--finished' : ''}`}
              >
                <span className="sb-rank">{i + 1}</span>
                <span className="sb-icon">{r.icon}</span>
                <span className="sb-name">{r.name}</span>
                {r.finished && <span className="sb-check">✓</span>}
              </div>
            ))}
          </div>

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
