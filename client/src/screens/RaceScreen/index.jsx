// ============================================================
// File:        index.jsx
// Path:        client/src/screens/RaceScreen/index.jsx
// Project:     RaceArena
// Created:     2026-04-20
// Description: Live race canvas with scrolling camera (open tracks),
//              TV camera director (closed tracks), multi-lap support,
//              fullscreen toggle, and fade-to-black navigation.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { getShape } from '../../modules/track-shapes/index.js';
import { getTrackWidth } from '../../modules/track-shapes/SvgPathShape.js';
import { TRACK_PATHS } from '../../modules/track-shapes/track-path-configs.js';
import { getEnvironment } from '../../modules/environments/index.js';
import { getRacerType, RACER_TYPE_EMOJIS } from '../../modules/racer-types/index.js';
import { CameraDirector } from '../../modules/camera/CameraDirector.js';
import { renderMinimap } from '../../modules/camera/Minimap.js';
import { lapsFromDuration, lapProgress, currentLap } from '../../modules/camera/lapUtils.js';
import { useFadeNavigate } from '../../contexts/TransitionContext.jsx';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { getEffect } from '../../modules/track-effects/index.js';
import { extractEffectConfig } from '../TrackEditor/trackEditorSave.js';
import './RaceScreen.css';

const CW = 1280;
const CH = 720;
// Virtual canvas width for open-track scrolling camera (2.5× wider than viewport)
const VIRTUAL_W = CW * 2.5;

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
  const fadeNavigate = useFadeNavigate();
  const canvasRef = useRef(null);
  const screenRef = useRef(null);
  const rafRef = useRef(null);
  const g = useRef(null);
  const envRef = useRef(null);
  const shapeRef = useRef(null);
  const racerTypeRef = useRef(null);
  const camDirRef = useRef(null);
  const effectRef = useRef(null);

  const [raceData, setRaceData] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(PHASE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [scoreboard, setScoreboard] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [maxLapsState, setMaxLapsState] = useState(1);

  // ── Fullscreen listener ──────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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

    const typeId = raceData.racerTypeId || 'horse';
    const trackWidth = raceData.trackWidth ?? getTrackWidth(nRacers);

    let isOpenTrack = false;
    if (raceData.geometryId) {
      const geometry = getTrack(raceData.geometryId);
      if (!geometry) {
        setError('Track geometry not found. Open the Track Editor and save the track again.');
        return;
      }
      shapeRef.current = new EditorShape(geometry);
      // TODO: add RaceScreen integration test for isOpenTrack propagation (requires canvas + rAF mocking)
      isOpenTrack = shapeRef.current.isOpen;
      envRef.current = getEnvironment('dirt', CW, CH, geometry.backgroundImage ?? null);
      const { effectId, effectConfig } = extractEffectConfig(geometry);
      if (effectId) {
        const manifest = getEffect(effectId);
        if (manifest) effectRef.current = manifest.create(canvas, effectConfig);
      }
    } else {
      const shapeId = raceData.shapeId || raceData.curveStyle || 'oval';
      const envId = raceData.environmentId || 'dirt';
      const probeShape = getShape(shapeId, CW, CH, trackWidth);
      isOpenTrack = probeShape.isOpen === true;
      const virtualW = isOpenTrack ? VIRTUAL_W : CW;
      shapeRef.current = getShape(shapeId, virtualW, CH, trackWidth);
      const bgImagePath = TRACK_PATHS[shapeId]?.backgroundImage ?? null;
      envRef.current = getEnvironment(envId, CW, CH, bgImagePath);
    }
    racerTypeRef.current = getRacerType(typeId);

    const trackEmoji = RACER_TYPE_EMOJIS[typeId] ?? null;

    // Duration-based lap count (closed tracks only)
    const duration = raceData.duration ?? 60;
    const maxLaps = isOpenTrack ? 1 : lapsFromDuration(duration);

    camDirRef.current = new CameraDirector(shapeRef.current.getBoundingBox());
    setMaxLapsState(maxLaps);

    // Camera bounds for open tracks — clamp so track is never off-screen
    let camXMin = 0;
    let camXMax = VIRTUAL_W - CW;
    if (isOpenTrack) {
      const startX = shapeRef.current.getPosition(0, 0).x;
      const endX = shapeRef.current.getPosition(1, 0).x;
      const pad = CW * 0.08; // 8% of viewport as margin
      camXMin = Math.max(0, startX - pad);
      camXMax = Math.min(VIRTUAL_W - CW, Math.max(camXMin + 1, endX - CW + pad));
    }

    // ── Racer spread: evenly-distributed slots + jitter + Fisher-Yates shuffle ─
    function buildOffsets(n) {
      if (n === 1) return [0];
      const RANGE_MIN = -0.45,
        RANGE_MAX = 0.45;
      const slots = Array.from(
        { length: n },
        (_, i) => RANGE_MIN + (i / (n - 1)) * (RANGE_MAX - RANGE_MIN)
      );
      const slotWidth = (RANGE_MAX - RANGE_MIN) / (n - 1);
      const jitter = slotWidth * 0.45;
      const jittered = slots.map((s) =>
        Math.max(RANGE_MIN, Math.min(RANGE_MAX, s + (Math.random() - 0.5) * jitter * 2))
      );
      for (let i = jittered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [jittered[i], jittered[j]] = [jittered[j], jittered[i]];
      }
      return jittered;
    }

    const racerOffsets = buildOffsets(nRacers);

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
      maxLaps,
      camX: camXMin, // start at track start, not virtual canvas edge
      camXMin,
      camXMax,
      finalLapStartTs: null,
      racers: raceData.racers.map((r, i) => ({
        ...r,
        index: i,
        t: 0,
        lap: 1,
        trackOffset: racerOffsets[i],
        icon: trackEmoji ?? r.icon,
        baseSpeed: 0.00085 + Math.random() * 0.00035,
        jitterFreq: 0.0006 + Math.random() * 0.0014, // independent sine period per racer
        jitterPhase: Math.random() * Math.PI * 2,
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

    // ── Canvas positions ────────────────────────────────────────────────────
    function computePositions() {
      const st = g.current;
      const shape = shapeRef.current;
      for (const r of st.racers) {
        const t = isOpenTrack ? Math.min(r.t, 1) : tPos(r.t);
        const pos = shape.getPosition(t, r.trackOffset);
        r.x = pos.x;
        r.y = pos.y;
        r.angle = pos.angle;
      }
    }

    // ── Collision avoidance ─────────────────────────────────────────────────
    function applyCollisionAvoidance() {
      const active = g.current.racers.filter((r) => !r.finished);
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const r1 = active[i],
            r2 = active[j];
          const dx = r2.x - r1.x,
            dy = r2.y - r1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 25 && dist > 0) {
            const nudge = (25 - dist) / 2;
            const perpX = -Math.sin(r1.angle);
            const perpY = Math.cos(r1.angle);
            r1.x += perpX * nudge * 0.5;
            r1.y += perpY * nudge * 0.5;
            r2.x -= perpX * nudge * 0.5;
            r2.y -= perpY * nudge * 0.5;
          }
        }
      }
    }

    // ── Burst particles ─────────────────────────────────────────────────────
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

    // ── Draw helpers ────────────────────────────────────────────────────────
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

    function drawRacers() {
      const st = g.current;
      const rt = racerTypeRef.current;
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
      for (const r of st.racers) {
        for (let i = 0; i < r.trail.length; i++) {
          const frac = (i + 1) / r.trail.length;
          ctx.globalAlpha = frac * 0.4;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(r.trail[i].x, r.trail[i].y, frac * 5 + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        rt.drawRacer(ctx, r.x, r.y, r.angle, r, r === leader, st.lastTs ?? 0);
        drawNameTag(r.x, r.y, r.name, r === leader);
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 10) r.trail.shift();
      }
    }

    // Title for closed tracks — positioned above the track using getEdgePoints
    function drawTitle() {
      const topY = Math.min(...shapeRef.current.getEdgePoints(30).outer.map((p) => p.y));
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

    // Title for open tracks — fixed at top of screen (no getEdgePoints needed)
    function drawTitleOpen() {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.fillText(
        `🏆  ${raceData.eventName || 'Race'}  ·  ${raceData.trackName || ''}`,
        CW / 2,
        38
      );
      ctx.shadowBlur = 0;
    }

    function drawLapInfo(st) {
      if (st.maxLaps <= 1) return;
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
      const lapNum = currentLap(leader.t, st.maxLaps);
      const text = `LAP ${lapNum} / ${st.maxLaps}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#0088ff';
      ctx.fillText(text, CW - 14, 66);
      ctx.shadowBlur = 0;
    }

    function drawFinalLapOverlay(ts) {
      const st = g.current;
      if (!st.finalLapStartTs) return;
      const age = ts - st.finalLapStartTs;
      if (age > 3000) return;
      const alpha = age < 500 ? age / 500 : age > 2500 ? 1 - (age - 2500) / 500 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 52px sans-serif';
      ctx.fillStyle = '#ff4400';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ff6600';
      ctx.fillText('FINAL LAP!', CW / 2, CH / 2 - 80);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

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

    // ── rAF loop ─────────────────────────────────────────────────────────────
    function loop(ts) {
      const st = g.current;
      const env = envRef.current;
      const shape = shapeRef.current;
      const dt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      st.lastTs = ts;
      if (effectRef.current) effectRef.current.update(dt);

      ctx.clearRect(0, 0, CW, CH);

      // ── Phase advancement ──
      if (st.phase === PHASE.COUNTDOWN) {
        if (!st.countdownStart) st.countdownStart = ts;
        computePositions();
        if (ts - st.countdownStart >= 4000) {
          st.phase = PHASE.RACING;
          st.raceStart = ts;
          setPhase(PHASE.RACING);
        }
      } else if (st.phase === PHASE.RACING) {
        for (const r of st.racers) {
          if (!r.finished) {
            // Per-racer sine jitter — each racer has its own frequency and phase,
            // so speeds fluctuate independently instead of all spiking together.
            const jitter = Math.sin(ts * r.jitterFreq + r.jitterPhase) * 0.00012;
            r.t += (r.baseSpeed + jitter) * (dt / 16);
          }
        }
        computePositions();
        applyCollisionAvoidance();

        for (const r of st.racers) {
          if (r.finished) continue;
          if (r.t >= st.maxLaps) {
            r.finished = true;
            r.finishRank = ++st.finishedCount;
            emitBurst(r.x, r.y);
          }
          r.lap = isOpenTrack ? 1 : currentLap(r.t, st.maxLaps);
        }

        const rt = racerTypeRef.current;
        for (const r of st.racers) {
          if (!r.finished) {
            st.dustParticles.push(...rt.getTrailParticles(r.x, r.y, r.baseSpeed, r.angle, ts));
          }
        }
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

        if (Math.round(ts / 100) !== Math.round((ts - dt) / 100)) {
          setScoreboard(
            [...st.racers].sort((a, b) => b.t - a.t).map((r, i) => ({ ...r, rank: i + 1 }))
          );
        }

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
                lap: r.lap ?? 1,
                progress: Math.min(lapProgress(r.t, st.maxLaps) * 100, 100),
              })),
              elapsedTime: Math.round((ts - st.raceStart) / 1000),
              race: raceData,
            })
          );
          setTimeout(() => fadeNavigate('/results'), 2500);
        }

        // Final lap detection (announce when leader enters last lap)
        if (!isOpenTrack && st.maxLaps > 1 && !st.finalLapStartTs) {
          const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
          if (Math.floor(leader.t) >= st.maxLaps - 1) st.finalLapStartTs = ts;
        }
      } else {
        // FINISHED — keep burst particles alive
        computePositions();
        st.burstParticles = st.burstParticles
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.18,
            alpha: p.alpha - 0.014,
          }))
          .filter((p) => p.alpha > 0);
      }

      // ── Camera update ──
      if (isOpenTrack) {
        const sorted = [...st.racers].sort((a, b) => b.t - a.t);
        const top3 = sorted.slice(0, Math.min(3, sorted.length));
        const avgX = top3.reduce((s, r) => s + r.x, 0) / top3.length;
        const targetCamX = Math.max(
          st.camXMin ?? 0,
          Math.min(st.camXMax ?? VIRTUAL_W - CW, avgX - CW / 2)
        );
        st.camX = isFinite(st.camX) ? st.camX + (targetCamX - st.camX) * 0.05 : targetCamX;
      }
      const cam =
        st.phase === PHASE.RACING
          ? camDirRef.current.update(st.racers, ts, CW, CH)
          : { zoom: 1, offsetX: 0, offsetY: 0 };

      // ── Draw world ──
      // Background, effects, track, and racers are all in world space (1280×720).
      // A single save/transform/restore wraps every world-space layer so they all
      // move together when the camera pans or zooms. HUD draws after ctx.restore()
      // so it stays in fixed screen space.
      if (isOpenTrack) {
        ctx.save();
        // Combined pan + zoom centred at screen midpoint.
        // At zoom=1 this degrades to pure pan: translate(-camX, 0).
        const cx = CW / 2;
        const cy = CH / 2;
        ctx.translate(cx - cam.zoom * (cx + (st.camX || 0)), cy * (1 - cam.zoom));
        ctx.scale(cam.zoom, cam.zoom);
        env.drawBackground(ctx, ts);
        if (effectRef.current) effectRef.current.render(ctx);
        env.drawTrackSurface(ctx, shape, st.trackWidth, ts);
        drawParticles();
        drawRacers();
        ctx.restore();
        drawTitleOpen();
      } else {
        ctx.save();
        ctx.translate(cam.offsetX, cam.offsetY);
        ctx.scale(cam.zoom, cam.zoom);
        env.drawBackground(ctx, ts);
        if (effectRef.current) effectRef.current.render(ctx);
        env.drawTrackSurface(ctx, shape, st.trackWidth, ts);
        drawParticles();
        drawRacers();
        ctx.restore();
        drawTitle();
        drawLapInfo(st);
        drawFinalLapOverlay(ts);
      }

      // ── Phase overlays ──
      if (st.phase === PHASE.COUNTDOWN) {
        drawCountdownOverlay(ts - st.countdownStart);
      } else if (st.phase === PHASE.FINISHED) {
        drawFinishedOverlay();
      }

      // ── PiP minimap (RACING and FINISHED only) ──
      if (st.phase !== PHASE.COUNTDOWN) {
        const leaderIdx = st.racers.reduce((best, r, i) => (r.t > st.racers[best].t ? i : best), 0);
        renderMinimap(ctx, shape, st.racers, leaderIdx, CW, CH);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      effectRef.current = null;
    };
  }, [raceData, fadeNavigate]);

  // ── Fullscreen toggle ───────────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      screenRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

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
              fadeNavigate('/setup');
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
    <div ref={screenRef} className="screen screen--race">
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
                        width: `${Math.min(lapProgress(r.t ?? 0, maxLapsState), 1) * 100}%`,
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
            className="race-fullscreen-btn"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
          >
            {isFullscreen ? '⊡' : '⛶'}
          </button>

          <button
            className="race-back-btn"
            onClick={() => {
              sessionStorage.removeItem('activeRace');
              fadeNavigate('/setup');
            }}
          >
            ← Setup
          </button>
        </aside>
      </div>
    </div>
  );
}
