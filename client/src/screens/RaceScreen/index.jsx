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
import { validateActiveRace } from './raceSession.js';
import { getBackgroundImage } from '../../modules/track-effects/bgImageCache.js';
import { getRacerType, COATS_BY_TYPE } from '../../modules/racer-types/index.js';
import { assignCoat } from '../../modules/racer-types/coatAssignment.js';
import { CameraDirector } from '../../modules/camera/CameraDirector.js';
import {
  effectiveZoom,
  openTrackPanBounds,
  openTrackPanTarget,
} from '../../modules/camera/openTrackCamera.js';
import { renderMinimap } from '../../modules/camera/Minimap.js';
import {
  lapsFromDuration,
  lapProgress,
  currentLap,
  REFERENCE_FPS,
} from '../../modules/camera/lapUtils.js';
import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { computeRaceBaseSpeed } from '../../modules/raceBaseSpeed.js';
import { loadRaceBehaviorConfig } from '../../modules/raceBehaviorConfig.js';
import { initRacerBehavior, applyRacerBehavior } from '../../modules/raceBehavior.js';
import {
  computeRacersPerRow,
  computeRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
} from '../../modules/rowLayout.js';
import { loadRowLayoutConfig } from '../../modules/rowLayoutConfig.js';
import { useFadeNavigate } from '../../contexts/TransitionContext.jsx';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { getEffect } from '../../modules/track-effects/index.js';
import { extractEffects } from '../TrackEditor/trackEditorSave.js';
import {
  loadAutoScaleConfig,
  computeAutoScaleFactor,
  computeRenderDisplayScale,
  getEffectiveMinTargetScreenPx,
} from '../../modules/autoSpriteScale.js';
import { storageGet, KEYS } from '../../modules/storage/storage.js';
import {
  DEFAULT_TRACK_LIGHTS,
  LIGHT_SPACING_PX,
  sampleBoundaryAtInterval,
  drawTrackLights,
} from '../../modules/trackLights.js';
import { resolveTrailEmitter } from '../../modules/surface-effects/trailResolver.js';
import { getCachedServerSurfaceClasses } from '../../modules/storage/surfaceClassLoader.js';
import { loadServerClasses } from '../../modules/surface-effects/registry.js';
import './RaceScreen.css';

const CANVAS_W = 1280;
const CANVAS_H = 720;
// Keep legacy aliases used throughout this file
const CW = CANVAS_W;
const CH = CANVAS_H;

const RACER_COLORS = [
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
  const shapeRef = useRef(null);
  const racerTypeRef = useRef(null);
  const camDirRef = useRef(null);
  const effectsRef = useRef([]);

  const [raceData, setRaceData] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(PHASE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [scoreboard, setScoreboard] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [finishTState, setFinishTState] = useState(1);

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
      setRaceData(validateActiveRace(JSON.parse(raw)));
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
    const worldHeight = raceData.worldHeight ?? 720;

    if (!raceData.geometryId) {
      console.error('[RaceArena] No geometryId in raceData — cannot start race.');
      setError(
        'No track geometry selected. Please choose a track with a saved geometry from Setup.'
      );
      return;
    }

    const geometry = getTrack(raceData.geometryId);
    if (!geometry) {
      setError('Track geometry not found. Open the Track Editor and save the track again.');
      return;
    }

    shapeRef.current = new EditorShape(geometry);
    const geometricTrackWidthPx = shapeRef.current.getActualTrackWidth();
    const isOpenTrack = shapeRef.current.isOpen;
    const worldWidth = raceData.worldWidth ?? 1280;
    const bsX = CANVAS_W / worldWidth;
    const bsY = CANVAS_H / worldHeight;
    const bgImagePath = geometry.backgroundImage ?? null;

    // Cache track-light positions once at race init (not per frame).
    // 800 samples gives ~18 px/sample on a 15 000 px track — accurate enough
    // for sampleBoundaryAtInterval to place lights at the target 30 px spacing.
    const { outer: edgeOuter, inner: edgeInner } = shapeRef.current.getEdgePoints(800);
    const cachedLightPts = {
      outer: sampleBoundaryAtInterval(edgeOuter, LIGHT_SPACING_PX),
      inner: sampleBoundaryAtInterval(edgeInner, LIGHT_SPACING_PX),
    };
    const trackLightsConfig = geometry.trackLights ?? DEFAULT_TRACK_LIGHTS;

    effectsRef.current = extractEffects(geometry)
      .map(({ id, config }) => {
        const manifest = getEffect(id);
        return manifest ? manifest.create(canvas, config) : null;
      })
      .filter(Boolean);

    const racerType = getRacerType(typeId);
    racerTypeRef.current = racerType;

    const trackEmoji = racerType.getEmoji() ?? null;
    const speedMultiplier = racerType.getSpeedMultiplier();

    const baseSpeedConfig = loadBaseSpeedConfig();
    const BASE_SPEED_MIN = baseSpeedConfig.min;
    const BASE_SPEED_MAX = baseSpeedConfig.max;
    const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;

    const behaviorConfig = loadRaceBehaviorConfig();
    const rowConfig = loadRowLayoutConfig();

    // Auto-sprite-scale: compute displaySizeScale unless D3.5.5 override exists
    const autoScaleConfig = loadAutoScaleConfig();
    const displaySize = racerType.config.displaySize;
    let displaySizeScale = 1;
    if (autoScaleConfig.enabled) {
      const rawOverrides = storageGet(KEYS.RACER_TYPE_OVERRIDES, {});
      const typeOverride = rawOverrides[typeId];
      const hasDisplaySizeOverride =
        typeOverride && typeof typeOverride === 'object' && 'displaySize' in typeOverride;
      if (!hasDisplaySizeOverride) {
        displaySizeScale = computeAutoScaleFactor(geometricTrackWidthPx, nRacers, autoScaleConfig);
      }
    }

    const duration = raceData.duration ?? 60;
    // Open tracks: finish line is fixed at (1 - runoutZone); race speed comes from targetDuration.
    // Closed tracks: finish line is the target lap count.
    const finishT = isOpenTrack
      ? 1.0 - behaviorConfig.runoutZone
      : (raceData.targetLaps ?? lapsFromDuration(duration));
    // targetDuration drives race_baseSpeed. Fallback: natural duration at mean speed.
    const targetDuration = raceData.targetDuration ?? finishT / (BASE_SPEED_MEAN * REFERENCE_FPS);
    const race_baseSpeed = computeRaceBaseSpeed(finishT, targetDuration);
    const maxLaps = isOpenTrack ? 1 : finishT;

    const rawBbox = shapeRef.current.getBoundingBox();
    const scaledBbox = {
      minX: rawBbox.minX * bsX,
      minY: rawBbox.minY * bsY,
      maxX: rawBbox.maxX * bsX,
      maxY: rawBbox.maxY * bsY,
    };
    camDirRef.current = new CameraDirector(scaledBbox, worldWidth, worldHeight);
    setFinishTState(finishT);

    // D7c row-start layout: shuffle racers into rows, compute t-offsets and speed bonuses
    const pathLengthPx = geometry.pathLengthPx ?? 0;
    const spriteSize = displaySize * displaySizeScale;
    const rowGapPx = spriteSize * rowConfig.rowGapMultiplier;
    const deltaT_per_row = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;

    const effectiveWidth = geometricTrackWidthPx * behaviorConfig.startSpreadRange;
    const racersPerRowValue = computeRacersPerRow(effectiveWidth, spriteSize);
    const rowLayout = computeRowLayout(nRacers, racersPerRowValue);

    // Ensure surface-class registry has the latest cached server data.
    // Code defaults are always present; this picks up any user-defined overrides.
    loadServerClasses(getCachedServerSurfaceClasses());
    const trackSurfaceClasses = raceData.trackSurfaceClasses ?? [];

    // Index assignments by racerIndex for O(1) lookup in the map below
    const rowSizeByRow = new Map();
    for (const a of rowLayout.assignments) {
      rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
    }
    const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

    g.current = {
      phase: PHASE.COUNTDOWN,
      countdownStart: null,
      raceStart: null,
      lastTs: null,
      finishedCount: 0,
      dustParticles: [],
      burstParticles: [],
      maxLaps,
      finishT,
      camX: 0,
      camY: 0,
      finalLapStartTs: null,
      racers: raceData.racers.map((r, i) => {
        const assignment = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
        const rowSize = rowSizeByRow.get(assignment.rowIndex) ?? 1;
        const speedBonus = computeSpeedBonus(
          assignment.rowIndex,
          rowGapPx,
          pathLengthPx,
          rowConfig.speedBonusFactor
        );
        // Closed tracks: negative t wraps correctly via modulo in _idx.
        // Open tracks: offset each row forward from t=0 so all rows start within the path.
        // Front row (rowIndex 0) starts at totalRows×deltaT; last row starts at 1×deltaT.
        const tStart = isOpenTrack
          ? (rowLayout.totalRows - assignment.rowIndex) * deltaT_per_row
          : -(assignment.rowIndex * deltaT_per_row);
        const racer = {
          ...r,
          index: i,
          t: tStart,
          lap: 1,
          icon: trackEmoji ?? r.icon,
          baseSpeed:
            race_baseSpeed *
            speedMultiplier *
            ((BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) /
              BASE_SPEED_MEAN) *
            (1 + speedBonus),
          jitterFreq: 0.0006 + Math.random() * 0.0014,
          jitterPhase: Math.random() * Math.PI * 2,
          color: RACER_COLORS[i % RACER_COLORS.length],
          coatId: COATS_BY_TYPE[typeId] ? assignCoat(r.name, COATS_BY_TYPE[typeId]) : undefined,
          finished: false,
          finishRank: null,
          runoutDecay: 1,
          trail: [],
          x: 0,
          y: 0,
          angle: 0,
          // VRE-4: one emitter instance per racer (stateful generators must not be shared)
          surfaceEmitter: resolveTrailEmitter(racerType, trackSurfaceClasses),
          surfaceParticles: [],
        };
        initRacerBehavior(racer);
        racer.physicalY = computeRowPhysicalY(
          assignment.indexInRow,
          rowSize,
          behaviorConfig.startSpreadRange
        );
        return racer;
      }),
    };

    setScoreboard(g.current.racers.map((r) => ({ ...r, rank: 0 })));

    // ── Canvas positions ────────────────────────────────────────────────────
    // physicalY ∈ [-1, +1] maps to EditorShape offset ∈ [-0.5, +0.5] via /2.
    function computePositions() {
      const st = g.current;
      const shape = shapeRef.current;
      for (const r of st.racers) {
        const t = isOpenTrack ? Math.min(r.t, 1) : tPos(r.t);
        const pos = shape.getPosition(t, r.physicalY / 2);
        r.x = pos.x;
        r.y = pos.y;
        r.angle = pos.angle;
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

    // ezoom: total canvas effective zoom (cam.zoom×bsX for closed, BASE×cam.zoom for open).
    // Labels and trail are drawn in world coordinates under the ctx transform, so they must
    // be sized as worldPx = targetScreenPx / ezoom to appear constant on screen.
    function drawNameTag(px, py, name, isLeader, ezoom) {
      const inv = 1 / ezoom;
      const fontPx = Math.max(8, Math.round(11 * inv));
      const bgH = Math.max(6, Math.round(13 * inv));
      const offsetY = Math.max(12, Math.round(22 * inv));
      const nameY = py - offsetY;
      ctx.font = `bold ${fontPx}px sans-serif`;
      const nameW = ctx.measureText(name).width + Math.round(8 * inv);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(px - nameW / 2, nameY - bgH, nameW, bgH);
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'center';
      ctx.fillStyle = isLeader ? '#ffd700' : '#eee';
      ctx.fillText(name, px, nameY);
      if (isLeader && g.current.phase === PHASE.RACING) {
        ctx.font = `${Math.max(10, Math.round(14 * inv))}px serif`;
        ctx.textBaseline = 'bottom';
        ctx.fillText('👑', px, nameY - bgH);
      }
    }

    function drawRacers(effectiveScale, ezoom) {
      const st = g.current;
      const rt = racerTypeRef.current;
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
      const inv = 1 / ezoom;
      for (const r of st.racers) {
        for (let i = 0; i < r.trail.length; i++) {
          const frac = (i + 1) / r.trail.length;
          ctx.globalAlpha = frac * 0.4;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(r.trail[i].x, r.trail[i].y, (frac * 5 + 1) * inv, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        rt.drawRacer(ctx, r.x, r.y, r.angle, r, r === leader, st.lastTs ?? 0, effectiveScale);
        drawNameTag(r.x, r.y, r.name, r === leader, ezoom);
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

    // ── Editor track rendering (replaces environment classes) ────────────────
    function drawEditorBackground(ctx, frame, bgPath, ww = CANVAS_W, wh = CANVAS_H) {
      const bgImg = bgPath ? getBackgroundImage(bgPath) : null;
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, ww, wh);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, ww, wh);
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.0006);
        const grad = ctx.createLinearGradient(0, 0, ww, wh);
        grad.addColorStop(0, '#0a0414');
        grad.addColorStop(0.5, `hsl(248,${20 + pulse * 10}%,${8 + pulse * 3}%)`);
        grad.addColorStop(1, '#0a0414');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ww, wh);
      }
      const stars = [
        [80, 35],
        [180, 18],
        [310, 48],
        [470, 12],
        [620, 42],
        [770, 22],
        [920, 55],
        [1060, 15],
        [1190, 38],
        [40, 62],
        [390, 68],
        [730, 70],
        [1100, 50],
      ];
      for (const [sx, sy] of stars) {
        ctx.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(frame * 0.001 + sx * 0.05));
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx * (ww / CANVAS_W), sy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(14,7,2,0.92)';
      ctx.fillRect(0, 0, ww, 58);
      // Crowd members span full world width
      const crowdCount = Math.max(60, Math.ceil((ww / CANVAS_W) * 60));
      for (let i = 0; i < crowdCount; i++) {
        const cx = (i * 137.5) % ww;
        const phase = i * 0.41;
        const size = 6 + (i % 4);
        const bob = Math.sin(frame * 0.003 + phase) * 2;
        ctx.fillStyle = `hsl(${20 + ((size * 7) % 30)},30%,${18 + (size % 4) * 3}%)`;
        ctx.beginPath();
        ctx.ellipse(cx, 50 + bob, size * 0.6, size, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(200,130,40,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.lineTo(ww, 58);
      ctx.stroke();
      const sunX = ww * 0.9,
        sunY = 28,
        sunR = 18;
      const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
      sg.addColorStop(0, 'rgba(255,220,80,0.55)');
      sg.addColorStop(0.4, 'rgba(255,160,30,0.2)');
      sg.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,140,0.9)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawEditorTrackSurface(ctx, shape) {
      // Boundary lines and lane fill removed — replaced by track-light dots.
      // Only the finish line is drawn here.
      const pOuter = shape.getPosition(0, 1.0);
      const pInner = shape.getPosition(0, -1.0);
      const dx = pOuter.x - pInner.x,
        dy = pOuter.y - pInner.y;
      const segments = 8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      for (let i = 0; i < segments; i++) {
        const f0 = i / segments,
          f1 = (i + 1) / segments;
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
        ctx.beginPath();
        ctx.moveTo(pInner.x + dx * f0, pInner.y + dy * f0);
        ctx.lineTo(pInner.x + dx * f1, pInner.y + dy * f1);
        const perp = pInner.angle + Math.PI / 2;
        const hw = 7;
        ctx.lineTo(
          pInner.x + dx * f1 + Math.cos(perp) * hw,
          pInner.y + dy * f1 + Math.sin(perp) * hw
        );
        ctx.lineTo(
          pInner.x + dx * f0 + Math.cos(perp) * hw,
          pInner.y + dy * f0 + Math.sin(perp) * hw
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      const midX = (pOuter.x + pInner.x) / 2,
        midY = (pOuter.y + pInner.y) / 2;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('FINISH', midX, midY - 8);
    }

    // Finish-line marker for open tracks at finishT position
    function drawOpenTrackFinishLine(shape, ft) {
      const pOuter = shape.getPosition(ft, 1.0);
      const pInner = shape.getPosition(ft, -1.0);
      const dx = pOuter.x - pInner.x,
        dy = pOuter.y - pInner.y;
      const segments = 8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      for (let i = 0; i < segments; i++) {
        const f0 = i / segments,
          f1 = (i + 1) / segments;
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
        ctx.beginPath();
        ctx.moveTo(pInner.x + dx * f0, pInner.y + dy * f0);
        ctx.lineTo(pInner.x + dx * f1, pInner.y + dy * f1);
        const perp = pInner.angle + Math.PI / 2;
        const hw = 7;
        ctx.lineTo(
          pInner.x + dx * f1 + Math.cos(perp) * hw,
          pInner.y + dy * f1 + Math.sin(perp) * hw
        );
        ctx.lineTo(
          pInner.x + dx * f0 + Math.cos(perp) * hw,
          pInner.y + dy * f0 + Math.sin(perp) * hw
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      const midX = (pOuter.x + pInner.x) / 2,
        midY = (pOuter.y + pInner.y) / 2;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('FINISH', midX, midY - 8);
    }

    // Render per-racer surface-class particles (world coords, inside camera transform).
    function drawSurfaceTrails() {
      for (const r of g.current.racers) {
        if (r.surfaceEmitter && r.surfaceParticles.length > 0) {
          r.surfaceEmitter.render(ctx, r.surfaceParticles);
        }
      }
    }

    // ── rAF loop ─────────────────────────────────────────────────────────────
    function loop(ts) {
      const st = g.current;
      const shape = shapeRef.current;
      const dt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      st.lastTs = ts;
      for (const inst of effectsRef.current) inst.update(dt);

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
          // Per-racer sine jitter — each racer has its own frequency and phase,
          // so speeds fluctuate independently instead of all spiking together.
          const jitter = Math.sin(ts * r.jitterFreq + r.jitterPhase) * 0.00012;
          // Apply D7b boost/brake flags from the previous frame
          const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
          const brake = r.avoidanceActive ? behaviorConfig.speedBrakeFactor : 1.0;
          if (!r.finished) {
            r.t = Math.min(
              r.t + (r.baseSpeed * boost * brake + jitter) * (dt / 16),
              st.finishT + 0.001
            );
          } else {
            // Run-out: finished racers keep moving but decay to a stop
            r.runoutDecay *= 0.97;
            r.t += (r.baseSpeed * r.runoutDecay + jitter * r.runoutDecay) * (dt / 16);
          }
        }
        computePositions();
        applyRacerBehavior(st.racers, behaviorConfig);

        for (const r of st.racers) {
          if (r.finished) continue;
          if (r.t >= st.finishT) {
            r.finished = true;
            r.finishRank = ++st.finishedCount;
            emitBurst(r.x, r.y);
          }
          r.lap = isOpenTrack ? 1 : currentLap(r.t, st.maxLaps);
        }

        const rt = racerTypeRef.current;
        // dt is in ms; generators expect dt in frames (1 = one frame at 60fps)
        const dtFrames = dt / 16;
        for (const r of st.racers) {
          if (!r.finished) {
            if (r.surfaceEmitter) {
              // Surface-class trail: each racer drives its own emitter
              r.surfaceParticles.push(
                ...r.surfaceEmitter.spawn(r.x, r.y, r.baseSpeed, r.angle, ts)
              );
              r.surfaceParticles = r.surfaceEmitter.update(r.surfaceParticles, dtFrames);
            } else {
              // Heimat-Trail fallback: trailFactory-based particles pooled globally
              st.dustParticles.push(...rt.getTrailParticles(r.x, r.y, r.baseSpeed, r.angle, ts));
            }
          }
        }
        // Advance Heimat-Trail dustParticles (unchanged behavior)
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

        if (st.finishedCount >= nRacers) {
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
                progress: Math.min(lapProgress(r.t, st.finishT) * 100, 100),
              })),
              elapsedTime: Math.round((ts - st.raceStart) / 1000),
              race: raceData,
            })
          );
          setTimeout(() => fadeNavigate('/results'), 2000);
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
      const scaledRacersForCam =
        bsX === 1 && bsY === 1
          ? st.racers
          : st.racers.map((r) => ({ ...r, x: r.x * bsX, y: r.y * bsY }));
      const cam =
        st.phase === PHASE.RACING
          ? camDirRef.current.update(scaledRacersForCam, ts, CANVAS_W, CANVAS_H)
          : { zoom: 1, offsetX: 0, offsetY: 0 };

      if (isOpenTrack) {
        const effZoom = effectiveZoom(cam.zoom);
        const { camXMax, camYMax } = openTrackPanBounds(
          worldWidth,
          worldHeight,
          CANVAS_W,
          CANVAS_H,
          effZoom
        );
        const { targetX, targetY } = openTrackPanTarget(
          st.racers,
          CW,
          CH,
          effZoom,
          camXMax,
          camYMax
        );
        st.camX = isFinite(st.camX) ? st.camX + (targetX - st.camX) * 0.05 : targetX;
        st.camY = isFinite(st.camY) ? st.camY + (targetY - st.camY) * 0.05 : targetY;
      }

      // ── Draw world ──
      // Background, effects, track, and racers are all in world space (1280×720).
      // A single save/transform/restore wraps every world-space layer so they all
      // move together when the camera pans or zooms. HUD draws after ctx.restore()
      // so it stays in fixed screen space.
      //
      // Sprite scaling (D7a proportional): sprites scale naturally with the camera
      // zoom — closer = bigger. computeRenderDisplayScale applies a floor so sprites
      // stay visible on very large tracks where the camera zooms far out.
      //
      // frameEffZoom is the raw canvas scale (cam.zoom×bsX closed, BASE×cam.zoom open).
      // It's used by labels/trail (via 1/frameEffZoom) to stay constant screen-size.
      const frameEffZoom = isOpenTrack ? effectiveZoom(cam.zoom) : cam.zoom * bsX;
      const frameDisplayScale = computeRenderDisplayScale(
        displaySize,
        displaySizeScale,
        frameEffZoom,
        getEffectiveMinTargetScreenPx(
          racerTypeRef.current?.config?.minTargetScreenPx,
          autoScaleConfig.minTargetScreenPx ?? 32
        )
      );

      if (isOpenTrack) {
        ctx.save();
        const effZoom = effectiveZoom(cam.zoom);
        // screen = (world - cam) * effZoom: world origin maps to (-camX*effZoom, -camY*effZoom)
        ctx.translate(-(st.camX || 0) * effZoom, -(st.camY || 0) * effZoom);
        ctx.scale(effZoom, effZoom);
        drawEditorBackground(ctx, ts, bgImagePath, worldWidth, worldHeight);
        for (const inst of effectsRef.current) {
          ctx.save();
          inst.render(ctx);
          ctx.restore();
        }
        drawEditorTrackSurface(ctx, shape);
        drawTrackLights(ctx, cachedLightPts, trackLightsConfig, ts, !isOpenTrack);
        if (st.finishT < 1) drawOpenTrackFinishLine(shape, st.finishT);
        drawParticles();
        drawSurfaceTrails();
        drawRacers(frameDisplayScale, frameEffZoom);
        ctx.restore();
        drawTitleOpen();
      } else {
        ctx.save();
        ctx.translate(cam.offsetX, cam.offsetY);
        ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
        drawEditorBackground(ctx, ts, bgImagePath, worldWidth, worldHeight);
        for (const inst of effectsRef.current) {
          ctx.save();
          inst.render(ctx);
          ctx.restore();
        }
        drawEditorTrackSurface(ctx, shape);
        drawTrackLights(ctx, cachedLightPts, trackLightsConfig, ts, !isOpenTrack);
        drawParticles();
        drawSurfaceTrails();
        drawRacers(frameDisplayScale, frameEffZoom);
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
      effectsRef.current = [];
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
                        width: `${Math.min(Math.max(0, lapProgress(r.t ?? 0, finishTState)), 1) * 100}%`,
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
