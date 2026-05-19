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
import { CameraDirector, OPEN_TRACK_BASE_ZOOM } from '../../modules/camera/CameraDirector.js';
import { effectiveZoom } from '../../modules/camera/openTrackCamera.js';
import { renderMinimap } from '../../modules/camera/Minimap.js';
import {
  lapsFromDuration,
  lapProgress,
  currentLap,
  REFERENCE_FPS,
} from '../../modules/camera/lapUtils.js';
import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { computeRaceBaseSpeed } from '../../modules/raceBaseSpeed.js';
import {
  loadRaceBehaviorConfig,
  computeEffectiveBrakeFactor,
} from '../../modules/raceBehaviorConfig.js';
import {
  initRacerBehavior,
  applyRacerBehavior,
  PRIORITY_MODE,
} from '../../modules/raceBehavior.js';
import { loadPrioritySystemConfig } from '../../modules/prioritySystemConfig.js';
import {
  computeRacerLayout,
  computeEvenRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
} from '../../modules/rowLayout.js';
import { loadRowLayoutConfig } from '../../modules/rowLayoutConfig.js';
import { loadRaceDynamicsConfig } from '../../modules/raceDynamicsConfig.js';
import { loadFrameTimingConfig } from '../../modules/frameTimingConfig.js';
import { useFadeNavigate } from '../../contexts/TransitionContext.jsx';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { getEffect } from '../../modules/track-effects/index.js';
import { extractEffects } from '../TrackEditor/trackEditorSave.js';
import {
  loadAutoScaleConfig,
  computeRenderDisplayScale,
  getEffectiveMinTargetScreenPx,
  getEffectiveMaxTargetScreenPx,
} from '../../modules/autoSpriteScale.js';
import { loadCameraConfig } from '../../modules/cameraConfig.js';
import CameraStateHUD from './CameraStateHUD.jsx';
import CameraDiagnosticsHUD from './CameraDiagnosticsHUD.jsx';
import RacePlanHUD from './RacePlanHUD.jsx';
import CameraFrameLogHUD from './CameraFrameLogHUD.jsx';
import StateOverlay from './StateOverlay.jsx';
import { selectOverlayText } from '../../modules/stateOverlayTemplates.js';
import { visibleTagRacers } from './nameTagVisibility.js';
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
import { createRacePlan, createTrajectoryController } from '../../modules/racePlanner.js';
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

// Fixed physics timestep in ms. Physics advances in discrete FIXED_DT steps
// regardless of browser frame rate, eliminating the 2:1 speed oscillation seen
// when rAF alternates between 16ms and 33ms frames.
const FIXED_DT = 16;

const tPos = (t) => ((t % 1) + 1) % 1;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
  const diagDataRef = useRef({
    dv01: 0,
    dv12: 0,
    dv01Max: 0,
    dv12Max: 0,
    _dv01Buf: new Array(60).fill(0),
    _dv12Buf: new Array(60).fill(0),
    _dvBufIdx: 0,
    constSpeed: false,
    // Race-Plan diagnostics (written per physics step when racePlanEnabled)
    rpEnabled: false,
    rpPhase: '—',
    rpTs: 0,
    rpReRollActive: false,
    rpSfMin: 1,
    rpSfMax: 1,
    rpSfMean: 1,
    rpTmMin: 1,
    rpTmMax: 1,
    rpRows: 0,
    rpRacersPerRow: 0,
    rpNRacers: 0,
    rpB1Racers: [],
    rpTop10: [],
  });
  const leaderDiagRef = useRef({ snapshots: [], frozen: false });
  // Priority-system debug overlay (toggled by hotkey M)
  const showModeOverlayRef = useRef(false);
  const priorityConfigRef = useRef(null);

  const [raceData, setRaceData] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(PHASE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [scoreboard, setScoreboard] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [finishTState, setFinishTState] = useState(1);
  const [camState, setCamState] = useState(null);
  const prevHudStateRef = useRef(null);
  // Camera config as React state so updateConfig() is called whenever it changes.
  const [cameraConfig] = useState(() => loadCameraConfig());
  const cameraConfigRef = useRef(cameraConfig);
  const showCameraStateHud = cameraConfig.showCameraStateHud ?? true;
  const showCameraDiagnostics = cameraConfig.showCameraDiagnostics ?? false;
  const showRpDiag = cameraConfig.showRpDiag ?? false;
  const showRpWinnerList = cameraConfig.showRpWinnerList ?? false;
  const showTop10SpeedMonitor = cameraConfig.showTop10SpeedMonitor ?? false;
  const enableFrameLog = cameraConfig.enableFrameLog ?? false;

  // ── State-overlay narrative text ─────────────────────────────────────────
  const [overlayText, setOverlayText] = useState(null);
  const overlayTimerRef = useRef(null);
  const overlayLastIndexRef = useRef({});

  // Keep ref in sync and notify the director whenever config changes.
  useEffect(() => {
    cameraConfigRef.current = cameraConfig;
    if (camDirRef.current) {
      camDirRef.current.updateConfig(cameraConfig);
    }
  }, [cameraConfig]);

  // ── State-overlay: select and display text on cam-state entry ───────────
  // Depends on both camState and phase so the effect re-fires on the
  // COUNTDOWN→RACING transition even when camState is already 'OVERVIEW'
  // (CameraDirector starts in OVERVIEW before the race begins).
  useEffect(() => {
    clearTimeout(overlayTimerRef.current);
    setOverlayText(null);

    // Never show text outside of the active race
    if (phase !== PHASE.RACING) return;

    const cfg = cameraConfigRef.current;
    if (!(cfg.stateOverlayEnabled ?? true)) return;
    if (!['OVERVIEW', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'].includes(camState)) return;

    const vars = {};
    if (camState === 'OVERVIEW') {
      const racers = g.current?.racers ?? [];
      if (racers.length > 0) {
        const leader = racers.reduce((a, b) => (b.t > a.t ? b : a));
        if (leader?.name) vars.leader = leader.name;
      }
    }
    // BATTLE_ZOOM vars ({position}, {count}) and COMEBACK_ZOOM vars ({racer}) are
    // provided by future specs — until then, no template can be satisfied and
    // the component simply stays hidden.

    const result = selectOverlayText(camState, vars, overlayLastIndexRef.current);
    if (!result) return;

    overlayLastIndexRef.current = { ...overlayLastIndexRef.current, [camState]: result.index };
    setOverlayText(result.text);

    const duration = cfg.stateOverlayDurationMs ?? 3500;
    overlayTimerRef.current = setTimeout(() => setOverlayText(null), duration);

    return () => clearTimeout(overlayTimerRef.current);
  }, [camState, phase]);

  // ── Fullscreen listener ──────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── Hotkey M: toggle priority-mode debug overlay ─────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.code === 'KeyM' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        showModeOverlayRef.current = !showModeOverlayRef.current;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    ctx.imageSmoothingQuality = 'high';
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

    const constSpeedActive = new URLSearchParams(window.location.search).get('constSpeed') === '1';
    diagDataRef.current.constSpeed = constSpeedActive;

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
    const dynamicsConfig = loadRaceDynamicsConfig();
    const frameTimingConfig = loadFrameTimingConfig();
    priorityConfigRef.current = loadPrioritySystemConfig();

    // Auto-sprite-scale: compute displaySizeScale unless D3.5.5 override exists
    const autoScaleConfig = loadAutoScaleConfig();
    // Use the component-level cameraConfig (via ref for closure access).
    const cameraConfig = cameraConfigRef.current;
    const displaySize = racerType.config.displaySize;
    const effectiveWidth = geometricTrackWidthPx * behaviorConfig.startSpreadRange;
    let displaySizeScale = 1;
    if (autoScaleConfig.enabled) {
      const rawOverrides = storageGet(KEYS.RACER_TYPE_OVERRIDES, {});
      const typeOverride = rawOverrides[typeId];
      const hasDisplaySizeOverride =
        typeOverride && typeof typeOverride === 'object' && 'displaySize' in typeOverride;
      if (!hasDisplaySizeOverride) {
        // Bottom-up: min rows at minScale sprite, then even distribution, then back-compute size
        const racerLayout = computeRacerLayout(
          effectiveWidth,
          nRacers,
          displaySize,
          autoScaleConfig
        );
        displaySizeScale = racerLayout.spriteSize / displaySize;
      }
    }
    const referenceSpriteSize = displaySize * displaySizeScale;

    const duration = raceData.duration ?? 60;
    // Open tracks: finish line is fixed at (1 - runoutZone); race speed comes from targetDuration.
    // Closed tracks: finish line is the target lap count.
    const finishT = isOpenTrack
      ? 1.0 - behaviorConfig.runoutZone
      : (raceData.targetLaps ?? lapsFromDuration(duration));
    const targetDuration = raceData.targetDuration ?? finishT / (BASE_SPEED_MEAN * REFERENCE_FPS);
    // N-calibrated expected-minimum spread: E[min_n] = spreadMin + (spreadMax - spreadMin) / (n+1).
    // Ensures the expected last finisher arrives at targetDuration regardless of player count.
    const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
    const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
    const expectedMinSpreadFactor =
      spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
    const race_baseSpeed = computeRaceBaseSpeed(
      finishT,
      targetDuration * expectedMinSpreadFactor * speedMultiplier
    );
    const maxLaps = isOpenTrack ? 1 : finishT;

    camDirRef.current = new CameraDirector(
      worldWidth,
      worldHeight,
      isOpenTrack,
      cameraConfig,
      referenceSpriteSize,
      shapeRef.current
    );
    setFinishTState(finishT);

    // Row-start layout: even distribution across minimum-needed rows (bottom-up sizing)
    const pathLengthPx = geometry.pathLengthPx ?? 0;
    const spriteSize = displaySize * displaySizeScale;
    const rowGapPx = spriteSize * rowConfig.rowGapMultiplier;
    const deltaT_per_row = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;

    // rowCount: min rows at current sprite size; racers distributed evenly across them
    const rowCount = Math.max(
      1,
      Math.ceil(nRacers / Math.max(1, Math.floor((2 * effectiveWidth) / Math.max(1, spriteSize))))
    );
    const rowLayout = computeEvenRowLayout(nRacers, rowCount);

    // Re-Roll schedule: distribute rolls evenly over [0, lastPositionPercent]% of targetDuration.
    const rollCount = Math.max(
      2,
      Math.floor(targetDuration / dynamicsConfig.reRollIntervalDivisor)
    );
    const rollInterval =
      ((dynamicsConfig.reRollLastPositionPercent / 100) * targetDuration * 1000) / rollCount;

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
      physicsAccum: 0,
      physicsTs: 0,
      smoothDt: 16,
      finishedCount: 0,
      dustParticles: [],
      burstParticles: [],
      maxLaps,
      finishT,
      finalLapStartTs: null,
      racers: raceData.racers.map((r, i) => {
        const assignment = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
        const rowSize = rowSizeByRow.get(assignment.rowIndex) ?? 1;
        const speedBonus = computeSpeedBonus(
          assignment.rowIndex,
          rowGapPx,
          pathLengthPx,
          rowConfig.speedBonusFactor,
          finishT,
          isOpenTrack,
          rowLayout.totalRows
        );
        // Closed tracks: negative t wraps correctly via modulo in _idx.
        // Open tracks: offset each row forward from t=0 so all rows start within the path.
        // Front row (rowIndex 0) starts at totalRows×deltaT; last row starts at 1×deltaT.
        const tStart = isOpenTrack
          ? (rowLayout.totalRows - assignment.rowIndex) * deltaT_per_row
          : -(assignment.rowIndex * deltaT_per_row);
        // spreadFactor: random luck draw — the only part affected by re-rolls.
        // speedBonusMult: positional back-row compensation — constant over the whole race.
        const spreadFactor =
          (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
        const speedBonusMult = 1 + speedBonus;
        // nextRollTime stored as offset from raceStart; converted to absolute ts at COUNTDOWN→RACING.
        const rollJitter = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
        const racer = {
          ...r,
          index: i,
          t: tStart,
          lap: 1,
          icon: trackEmoji ?? r.icon,
          spreadFactor,
          speedBonusMult,
          baseSpeed: race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult,
          spreadFactorPrev: spreadFactor,
          spreadFactorTarget: spreadFactor,
          transitionStartTime: 0,
          transitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
          nextRollTime: rollInterval + rollJitter,
          color: RACER_COLORS[i % RACER_COLORS.length],
          coatId: COATS_BY_TYPE[typeId] ? assignCoat(r.name, COATS_BY_TYPE[typeId]) : undefined,
          finished: false,
          finishRank: null,
          runoutDecay: 1,
          trail: [],
          x: 0,
          y: 0,
          angle: 0,
          spriteWorldSizePx: spriteSize,
          geometricTrackWidthPx,
          pathLengthPx,
          // VRE-4: one emitter instance per racer (stateful generators must not be shared)
          surfaceEmitter: resolveTrailEmitter(racerType, trackSurfaceClasses),
          surfaceParticles: [],
          trajectoryMult: 1.0,
          trajectoryMultTarget: 1.0,
          trajectoryMultPrev: 1.0,
          trajectoryMultTransStart: 0,
          bereichsBonusMult: 1.0,
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

    // ── Config flags for canvas-loop use ────────────────────────────────────
    const showRpMinimapBadgesCfg = cameraConfigRef.current.showRpMinimapBadges ?? false;
    const showRpStartRowCfg = cameraConfigRef.current.showRpStartRow ?? false;

    // ── Race Plan controller ─────────────────────────────────────────────────
    const racePlanEnabled = isOpenTrack && !!raceData.racePlanEnabled && targetDuration >= 60;
    const racePlanSeed = raceData.racePlanSeed ?? 0;
    let racePlanController = null;
    let rpPlanInfo = null;
    const speedRings = new Map();
    if (racePlanEnabled) {
      const planRacers = g.current.racers.map((r) => ({
        index: r.index,
        startRowIndex: assignmentByRacer.get(r.index)?.rowIndex ?? 0,
      }));
      const plan = createRacePlan(planRacers, finishT, targetDuration * 1000, {}, racePlanSeed);
      racePlanController = createTrajectoryController(plan);
      rpPlanInfo = {
        sollRanks: plan._racerSollRank,
        b1Indices: new Set(
          [...plan._racerSollRank.entries()].filter(([, rank]) => rank <= 5).map(([idx]) => idx)
        ),
      };
      console.log(
        `[RacePlan] active — seed=${racePlanSeed} winner=#${plan.winnerRacerId} pulk=[${plan.pulkRacerIds}]`
      );
    }
    // Initialise Race-Plan diag fields (geometry snapshot at race start)
    diagDataRef.current.rpEnabled = racePlanEnabled;
    diagDataRef.current.rpRows = rowLayout.totalRows;
    diagDataRef.current.rpRacersPerRow = rowLayout.racersPerRow;
    diagDataRef.current.rpNRacers = nRacers;

    setScoreboard(g.current.racers.map((r) => ({ ...r, rank: 0 })));

    // ── Linear interpolation helpers (used for render interpolation) ────────
    const lerp = (a, b, t) => a + (b - a) * t;
    // Shortest-arc angle lerp — prevents wrap bug at track seam (t=0/t=1 on closed tracks)
    // where plain lerp(-π, π, 0.5) = 0 (wrong); this returns ±π (correct shorter arc).
    const lerpAngle = (a, b, t) => {
      let diff = b - a;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return a + diff * t;
    };

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

    function drawRacers(effectiveScale, ezoom, renderAlpha, interpolationEnabled) {
      const st = g.current;
      const rt = racerTypeRef.current;
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
      const inv = 1 / ezoom;
      const tagSet = new Set(
        visibleTagRacers(
          st.racers,
          st.phase === PHASE.RACING,
          cameraConfigRef.current.tagVisibleMaxCount
        )
      );
      const doInterp = interpolationEnabled && st.phase === PHASE.RACING;
      for (const r of st.racers) {
        const renderX = doInterp ? lerp(r._prevX ?? r.x, r.x, renderAlpha) : r.x;
        const renderY = doInterp ? lerp(r._prevY ?? r.y, r.y, renderAlpha) : r.y;
        const renderAngle = doInterp
          ? lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha)
          : r.angle;
        for (let i = 0; i < r.trail.length; i++) {
          const frac = (i + 1) / r.trail.length;
          ctx.globalAlpha = frac * 0.4;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(r.trail[i].x, r.trail[i].y, (frac * 5 + 1) * inv, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        rt.drawRacer(
          ctx,
          renderX,
          renderY,
          renderAngle,
          r,
          r === leader,
          st.lastTs ?? 0,
          effectiveScale
        );
        if (tagSet.has(r)) {
          const tagName = showRpStartRowCfg
            ? r.name + ' (R' + (assignmentByRacer.get(r.index)?.rowIndex ?? 0) + ')'
            : r.name;
          drawNameTag(renderX, renderY, tagName, r === leader, ezoom);
        }
        r.trail.push({ x: renderX, y: renderY });
        if (r.trail.length > 10) r.trail.shift();
      }
    }

    // Battle-diag: coloured world-space markers on the leader + 20-frame snapshot table.
    // Markers are drawn AFTER drawRacers so they appear on top of all sprites.
    function drawBattleDiagMarkers(cam, ezoom, renderAlpha, interpolationEnabled) {
      if (camDirRef.current?.hudState !== 'BATTLE_ZOOM') return;
      const st = g.current;
      if (!st?.racers?.length) return;
      const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
      const doInterp = interpolationEnabled && st.phase === PHASE.RACING;
      const leaderRX = doInterp ? lerp(leader._prevX ?? leader.x, leader.x, renderAlpha) : leader.x;
      const leaderRY = doInterp ? lerp(leader._prevY ?? leader.y, leader.y, renderAlpha) : leader.y;
      const mr = 5 / ezoom;
      const lw = 2 / ezoom;
      const dot = (wx, wy, color) => {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(wx, wy, mr, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(wx, wy, lw, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      };

      dot(leaderRX, leaderRY, '#ff4444'); // ROT  — render pos
      const tagOffY = Math.max(12, Math.round(22 / ezoom));
      dot(leaderRX, leaderRY - tagOffY, '#ffd700'); // GELB — nameTag anchor

      const ezoomY = isOpenTrack ? ezoom : cam.zoom * bsY;
      // Camera centre in world space: derived from cam.offsetX/Y for both track types.
      // Relationship: offsetX = -topLeftX * effZoom → topLeftX = -offsetX/effZoom
      //               camCentreX = topLeftX + canvasW/2/effZoom = (canvasW/2 - offsetX)/effZoom
      const camWorldX = (CANVAS_W / 2 - cam.offsetX) / ezoom;
      const camWorldY = (CANVAS_H / 2 - cam.offsetY) / ezoomY;
      dot(camWorldX, camWorldY, '#cc44ff'); // LILA — camera centre (= screen centre under current transform)

      const ld = leaderDiagRef.current;
      if (!ld.frozen) {
        // Screen X: world_x * effZoom + offsetX (unified formula for both track types)
        const scrX = leaderRX * ezoom + cam.offsetX;
        ld.snapshots.push({
          f: ld.snapshots.length + 1,
          rx: leader.x,
          drawX: leaderRX,
          scrX,
          tagX: scrX,
          camX: camWorldX,
        });
        if (ld.snapshots.length >= 20) ld.frozen = true;
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
      const n = Math.max(0, 3 - Math.floor(elapsed / 1000));
      const color = CD_COLORS[n] ?? '#fff';
      const text = n > 0 ? String(n) : 'GO!';
      const fSize = n > 0 ? 56 : 44;
      const shrink = 1 - ((elapsed % 1000) / 1000) * 0.1;
      // Semi-transparent background pill behind the number for legibility.
      const padX = 14,
        padY = 8;
      const anchorX = CW - 18;
      const anchorY = 18;
      ctx.save();
      ctx.translate(anchorX, anchorY + fSize / 2);
      ctx.scale(shrink, shrink);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fSize}px sans-serif`;
      // Measure text for background pill
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-(tw + padX * 2), -(fSize / 2 + padY), tw + padX * 2, fSize + padY * 2, 8);
      ctx.fill();
      ctx.shadowBlur = 18;
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
      const rawDt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      // Render-interpolation alpha: set in RACING branch after accumulator.
      // 0 for non-RACING phases → lerp falls back to current value.
      let renderAlpha = 0;
      st.lastTs = ts;

      // EMA smoothing for cosmetic updates (camera lerp, track effects).
      // Physics uses FIXED_DT instead — smoothDt never enters the physics accumulator.
      st.smoothDt =
        frameTimingConfig.dtSmoothingAlpha * st.smoothDt +
        (1 - frameTimingConfig.dtSmoothingAlpha) * rawDt;
      const smoothDt = st.smoothDt;
      for (const inst of effectsRef.current) inst.update(smoothDt);

      ctx.clearRect(0, 0, CW, CH);

      // ── Phase advancement ──
      if (st.phase === PHASE.COUNTDOWN) {
        if (!st.countdownStart) st.countdownStart = ts;
        computePositions();
        if (ts - st.countdownStart >= (cameraConfigRef.current.countdownDurationMs ?? 4000)) {
          st.phase = PHASE.RACING;
          st.raceStart = ts;
          // physicsTs starts at 0 when racing begins; nextRollTime is already a
          // relative offset from physicsTs=0 so no addition is needed here.
          st.physicsTs = 0;
          st.physicsAccum = 0;
          setPhase(PHASE.RACING);
        }
      } else if (st.phase === PHASE.RACING) {
        // Re-Roll config constants (read once per rAF, shared across all physics steps).
        // lastRollDeadline is relative to physicsTs which starts at 0 at RACING entry.
        const lastRollDeadline =
          targetDuration * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);
        const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
        const halfWidth = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);
        // D4: snapshot t before all physics steps so constSpeed can equalize deltas
        for (const r of st.racers) r._diagLogPrevT = r.t;
        if (constSpeedActive) {
          for (const r of st.racers) r._diagPrevT = r.t;
        }
        // ── Fixed-timestep physics accumulator ───────────────────────────────
        // Each rAF contributes rawDt ms. Physics steps in FIXED_DT=16ms increments:
        // long frames (50ms) yield 3 steps, short frames (12ms) yield 0.
        // Remainder carries over so no physics time is lost between frames.
        st.physicsAccum += rawDt;
        while (st.physicsAccum >= FIXED_DT) {
          st.physicsTs += FIXED_DT;
          const physicsTs = st.physicsTs;

          // B1: snapshot per-step so _prev is always exactly 1 step behind curr.
          // Must be inside the loop — per-rAF snapshot causes freeze+snap on 2-step frames:
          // _prev would be 2 steps behind while alpha≈0, then the next frame jumps ~2S.
          for (const r of st.racers) {
            r._prevT = r.t;
            r._prevX = r.x;
            r._prevY = r.y;
            r._prevAngle = r.angle;
          }

          // Controller-Pass: rank racers by current t, write trajectoryMultTarget on each.
          if (racePlanController) racePlanController.update(st.racers, physicsTs);

          // ── trajectoryMult easeInOutCubic transition (mirrors spreadFactor pattern) ──
          if (racePlanController) {
            const TT_DUR_MS = dynamicsConfig.trajectoryTransitionDuration * 1000;
            for (const r of st.racers) {
              const elapsed = physicsTs - r.trajectoryMultTransStart;
              r.trajectoryMult =
                elapsed < TT_DUR_MS
                  ? r.trajectoryMultPrev +
                    (r.trajectoryMultTarget - r.trajectoryMultPrev) *
                      easeInOutCubic(elapsed / TT_DUR_MS)
                  : r.trajectoryMultTarget;
            }
          }

          for (const r of st.racers) {
            // ── Per-racer spreadFactor re-roll + smooth transition ────────────
            if (!r.finished) {
              if (physicsTs >= r.nextRollTime && physicsTs < lastRollDeadline) {
                const rawSample = r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth;
                const biasedSample = racePlanController
                  ? racePlanController.computePulkBiasedTarget(
                      r.index,
                      rawSample,
                      BASE_SPEED_MIN / BASE_SPEED_MEAN,
                      BASE_SPEED_MAX / BASE_SPEED_MEAN,
                      st.racers,
                      physicsTs
                    )
                  : rawSample;
                const newTarget = Math.max(
                  BASE_SPEED_MIN / BASE_SPEED_MEAN,
                  Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, biasedSample)
                );
                r.spreadFactorPrev = r.spreadFactor;
                r.spreadFactorTarget = newTarget;
                r.transitionStartTime = physicsTs;
                const jOff = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
                r.nextRollTime = physicsTs + rollInterval + jOff;
              }
              const elapsed = physicsTs - r.transitionStartTime;
              if (elapsed < r.transitionDuration) {
                const tProg = elapsed / r.transitionDuration;
                r.spreadFactor =
                  r.spreadFactorPrev +
                  (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(tProg);
                r.baseSpeed = race_baseSpeed * speedMultiplier * r.spreadFactor * r.speedBonusMult;
              }
            }
            // Apply D7b boost/brake flags from the previous step.
            // On open tracks, speedBrakeFactor is eased in over avoidanceWarmupMs (ramp).
            const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
            const effectiveBrakeFactor = computeEffectiveBrakeFactor(
              behaviorConfig,
              isOpenTrack,
              physicsTs
            );
            const brake = r.avoidanceActive ? effectiveBrakeFactor : 1.0;
            if (!r.finished) {
              // FIXED_DT/16 = 1.0 — dt factor eliminated by fixed timestep
              r.t = Math.min(
                r.t + r.baseSpeed * boost * brake * r.trajectoryMult * r.bereichsBonusMult,
                st.finishT + 0.001
              );
            } else {
              // Run-out: finished racers keep moving but decay to a stop
              r.runoutDecay *= 0.97;
              r.t += r.baseSpeed * r.runoutDecay;
            }
            // Dimensionless velocity factor (≈1.0 at race_baseSpeed, 0 when finished).
            // Drives lookahead scaling in CameraDirector: vt=1.0 → full lookaheadDistance,
            // vt=2.0 → double lead, vt=0 → no lead. Guard: race_baseSpeed>0 prevents ÷0.
            r.vt =
              race_baseSpeed > 0 && !r.finished
                ? (r.baseSpeed * boost * brake * r.trajectoryMult * r.bereichsBonusMult) /
                  race_baseSpeed
                : 0;
          }
          // D4: equalize all non-finished racers to the mean delta-t
          if (constSpeedActive) {
            const active = st.racers.filter((r) => !r.finished);
            if (active.length > 0) {
              const meanDt =
                active.reduce((s, r) => s + (r.t - (r._diagPrevT ?? r.t)), 0) / active.length;
              for (const r of active) {
                r.t = (r._diagPrevT ?? r.t) + meanDt;
                r.vt = race_baseSpeed > 0 ? meanDt / race_baseSpeed : 0;
              }
            }
          }
          computePositions();
          applyRacerBehavior(
            st.racers,
            behaviorConfig,
            priorityConfigRef.current
              ? {
                  lookaheadFrames: priorityConfigRef.current.lookaheadFrames,
                  cooldownMs: priorityConfigRef.current.cooldownMs,
                  currentTs: physicsTs,
                  blockedTimeoutFrames: priorityConfigRef.current.blockedTimeoutFrames,
                  blockedEscapeForce: priorityConfigRef.current.blockedEscapeForce,
                }
              : undefined
          );

          for (const r of st.racers) {
            if (r.finished) continue;
            if (r.t >= st.finishT) {
              r.finished = true;
              r.finishRank = ++st.finishedCount;
              emitBurst(r.x, r.y);
            }
            r.lap = isOpenTrack ? 1 : currentLap(r.t, st.maxLaps);
          }

          // Scoreboard: update when physicsTs crosses a 100ms bucket boundary
          if (Math.round(physicsTs / 100) !== Math.round((physicsTs - FIXED_DT) / 100)) {
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

          // Final lap detection — ts (browser time) used so visual overlay timing is correct
          if (!isOpenTrack && st.maxLaps > 1 && !st.finalLapStartTs) {
            const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
            if (Math.floor(leader.t) >= st.maxLaps - 1) st.finalLapStartTs = ts;
          }

          // Race-Plan per-step diagnostics → diagDataRef (polled by CameraDiagnosticsHUD)
          if (racePlanController) {
            const activeR = st.racers.filter((r) => !r.finished);
            if (activeR.length > 0) {
              let sfMin = Infinity,
                sfMax = -Infinity,
                sfSum = 0;
              let tmMin = Infinity,
                tmMax = -Infinity;
              for (const r of activeR) {
                const sf = r.spreadFactor ?? 1;
                const tm = r.trajectoryMult ?? 1;
                if (sf < sfMin) sfMin = sf;
                if (sf > sfMax) sfMax = sf;
                sfSum += sf;
                if (tm < tmMin) tmMin = tm;
                if (tm > tmMax) tmMax = tm;
                // Speed ring buffer (5 s @ 16 ms/step = 313 slots)
                let ring = speedRings.get(r.index);
                if (!ring) {
                  ring = { buf: new Float32Array(313).fill(1.0), idx: 0 };
                  speedRings.set(r.index, ring);
                }
                ring.buf[ring.idx % 313] = tm;
                ring.idx++;
              }
              const d = diagDataRef.current;
              d.rpPhase = racePlanController.getPhase(physicsTs);
              d.rpTs = physicsTs;
              d.rpReRollActive = physicsTs < lastRollDeadline;
              d.rpSfMin = sfMin;
              d.rpSfMax = sfMax;
              d.rpSfMean = sfSum / activeR.length;
              d.rpTmMin = tmMin;
              d.rpTmMax = tmMax;
              let bbMin = Infinity,
                bbMax = -Infinity;
              for (const r of activeR) {
                const bb = r.bereichsBonusMult ?? 1;
                if (bb < bbMin) bbMin = bb;
                if (bb > bbMax) bbMax = bb;
              }
              d.rpBbMin = bbMin;
              d.rpBbMax = bbMax;

              // B1 winner list (sollRank 1–5)
              if (rpPlanInfo) {
                const ranked = [...activeR].sort((a, b) => b.t - a.t);
                const rankByIdx = new Map(ranked.map((r, i) => [r.index, i + 1]));
                const b1Racers = [];
                for (const [racerIdx, sollRank] of rpPlanInfo.sollRanks) {
                  if (!rpPlanInfo.b1Indices.has(racerIdx)) continue;
                  const racer = st.racers.find((r) => r.index === racerIdx && !r.finished);
                  if (!racer) continue;
                  b1Racers.push({
                    index: racerIdx,
                    name: racer.name,
                    sollRank,
                    currentRank: rankByIdx.get(racerIdx) ?? 0,
                    delta: (rankByIdx.get(racerIdx) ?? 0) - sollRank,
                    startRow: assignmentByRacer.get(racerIdx)?.rowIndex ?? 0,
                  });
                }
                b1Racers.sort((a, b) => a.sollRank - b.sollRank);
                d.rpB1Racers = b1Racers;
              }

              // Top-10 speed monitor
              const top10 = [...activeR].sort((a, b) => b.t - a.t).slice(0, 10);
              d.rpTop10 = top10.map((r, i) => {
                const ring = speedRings.get(r.index);
                let tmMin5s = r.trajectoryMult ?? 1;
                let tmMax5s = r.trajectoryMult ?? 1;
                if (ring && ring.idx > 0) {
                  const filled = Math.min(ring.idx, 313);
                  let mn = Infinity,
                    mx = -Infinity;
                  for (let j = 0; j < filled; j++) {
                    if (ring.buf[j] < mn) mn = ring.buf[j];
                    if (ring.buf[j] > mx) mx = ring.buf[j];
                  }
                  tmMin5s = mn;
                  tmMax5s = mx;
                }
                return {
                  rank: i + 1,
                  name: r.name,
                  tm: r.trajectoryMult ?? 1.0,
                  tmMin5s,
                  tmMax5s,
                  isOscillating: tmMax5s - tmMin5s > 0.18,
                };
              });
            }
          }

          st.physicsAccum -= FIXED_DT;
        }
        // ── End physics accumulator ──────────────────────────────────────────

        // Fraction of next physics step already elapsed in wall time.
        // physicsAccum is always in [0, FIXED_DT) after the loop.
        renderAlpha = Math.min(1, st.physicsAccum / FIXED_DT);

        // D1: per-racer pixel speed and smoothed Δv between top-3 (once per rAF, uses rawDt)
        {
          const ordered = [...st.racers].sort((a, b) => b.t - a.t);
          for (const r of st.racers) {
            const dx = r.x - (r._diagPrevX ?? r.x);
            const dy = r.y - (r._diagPrevY ?? r.y);
            r._diagSpeed = Math.sqrt(dx * dx + dy * dy);
            r._diagDx = dx;
            r._diagDy = dy;
            r._diagPrevX = r.x;
            r._diagPrevY = r.y;
          }
          const r0 = ordered[0];
          const r1 = ordered[1];
          const r2 = ordered[2];
          const raw01 = r0 && r1 ? r0._diagSpeed - r1._diagSpeed : 0;
          const raw12 = r1 && r2 ? r1._diagSpeed - r2._diagSpeed : 0;
          const α = 0.1;
          diagDataRef.current.dv01 = diagDataRef.current.dv01 * (1 - α) + raw01 * α;
          diagDataRef.current.dv12 = diagDataRef.current.dv12 * (1 - α) + raw12 * α;
          // M3: ring-buffer max over last 60 frames (absolute value, captures jitter peaks)
          const d = diagDataRef.current;
          const bi = d._dvBufIdx % 60;
          d._dv01Buf[bi] = Math.abs(raw01);
          d._dv12Buf[bi] = Math.abs(raw12);
          d._dvBufIdx++;
          d.dv01Max = Math.max(...d._dv01Buf);
          d.dv12Max = Math.max(...d._dv12Buf);
        }

        const rt = racerTypeRef.current;
        // rawDt in ms; generators expect dt in frames (1 = one frame at 60fps)
        const dtFrames = rawDt / 16;
        for (const r of st.racers) {
          if (!r.finished) {
            const spawnX = r.x;
            const spawnY = r.y;
            if (r.surfaceEmitter) {
              // Surface-class trail: each racer drives its own emitter
              r.surfaceParticles.push(
                ...r.surfaceEmitter.spawn(spawnX, spawnY, r.baseSpeed, r.angle, ts)
              );
              r.surfaceParticles = r.surfaceEmitter.update(r.surfaceParticles, dtFrames);
            } else {
              // Heimat-Trail fallback: trailFactory-based particles pooled globally
              st.dustParticles.push(
                ...rt.getTrailParticles(spawnX, spawnY, r.baseSpeed, r.angle, ts)
              );
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
      // Pattern A: camera receives interpolated racer positions (renderRacers) so it
      // tracks the same world position as the sprites. Without this, the camera jumps
      // with physics steps while sprites stay 1 step behind → sprite-camera desync.
      // COUNTDOWN uses st.racers directly (no physics steps, no interpolation needed).
      const renderRacers =
        frameTimingConfig.renderInterpolation && st.phase === PHASE.RACING
          ? st.racers.map((r) => ({
              ...r,
              t: lerp(r._prevT ?? r.t, r.t, renderAlpha),
              x: lerp(r._prevX ?? r.x, r.x, renderAlpha),
              y: lerp(r._prevY ?? r.y, r.y, renderAlpha),
              angle: lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha),
            }))
          : st.racers;
      const raceState = {
        raceElapsed: st.raceStart != null ? ts - st.raceStart : 0,
        finishedCount: st.finishedCount,
        winner: st.racers.find((r) => r.finishRank === 1) ?? null,
        finishT: st.finishT,
      };
      const cam =
        st.phase === PHASE.RACING
          ? camDirRef.current.update(renderRacers, ts, raceState, CANVAS_W, CANVAS_H, smoothDt)
          : st.phase === PHASE.COUNTDOWN && st.countdownStart != null
            ? camDirRef.current.updateCountdown(
                st.racers,
                ts,
                ts - st.countdownStart,
                cameraConfigRef.current.countdownDurationMs ?? 4000,
                CANVAS_W,
                CANVAS_H
              )
            : { zoom: 1, offsetX: 0, offsetY: 0 };

      // Sync camera HUD state — only triggers React re-render on actual state change
      const newHudState = camDirRef.current.hudState;
      if (newHudState !== prevHudStateRef.current) {
        prevHudStateRef.current = newHudState;
        setCamState(newHudState);
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
      const frameEffZoom = isOpenTrack
        ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM)
        : cam.zoom * bsX;
      const frameDisplayScale = computeRenderDisplayScale(
        displaySize,
        displaySizeScale,
        frameEffZoom,
        getEffectiveMinTargetScreenPx(
          racerTypeRef.current?.config?.minTargetScreenPx,
          cameraConfigRef.current.cameraStateProfiles?.OVERVIEW?.spritePx ?? 36
        ),
        getEffectiveMaxTargetScreenPx(
          racerTypeRef.current?.config?.maxTargetScreenPx,
          cameraConfigRef.current.maxTargetScreenPx
        )
      );

      // Pan and zoom are now computed by CameraDirector for both open and closed tracks.
      // cam.offsetX/offsetY are the canvas-space offsets; the scale differs by track topology.
      ctx.save();
      ctx.translate(cam.offsetX, cam.offsetY);
      if (isOpenTrack) {
        const effZoom = effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM);
        ctx.scale(effZoom, effZoom);
      } else {
        ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
      }
      drawEditorBackground(ctx, ts, bgImagePath, worldWidth, worldHeight);
      for (const inst of effectsRef.current) {
        ctx.save();
        inst.render(ctx);
        ctx.restore();
      }
      drawEditorTrackSurface(ctx, shape);
      drawTrackLights(ctx, cachedLightPts, trackLightsConfig, ts, !isOpenTrack);
      if (isOpenTrack && st.finishT < 1) drawOpenTrackFinishLine(shape, st.finishT);
      drawParticles();
      drawSurfaceTrails();
      drawRacers(
        frameDisplayScale,
        frameEffZoom,
        renderAlpha,
        frameTimingConfig.renderInterpolation
      );
      drawBattleDiagMarkers(cam, frameEffZoom, renderAlpha, frameTimingConfig.renderInterpolation);
      ctx.restore();
      if (isOpenTrack) {
        drawTitleOpen();
      } else {
        drawTitle();
        drawLapInfo(st);
        drawFinalLapOverlay(ts);
      }

      // ── Priority-mode debug overlay (hotkey M) ──
      if (showModeOverlayRef.current && st.phase === PHASE.RACING) {
        const modeColors = {
          [PRIORITY_MODE.OVERLAP]: '#ef4444',
          [PRIORITY_MODE.COOLDOWN]: '#f97316',
          [PRIORITY_MODE.BLOCKED]: '#eab308',
        };
        // Aggregate: count and frame-count stats per mode
        const modeCounts = { NORMAL: 0, OVERLAP: 0, COOLDOWN: 0, BLOCKED: 0 };
        const modeFrameSums = { NORMAL: 0, OVERLAP: 0, COOLDOWN: 0, BLOCKED: 0 };
        const modeFrameMax = { NORMAL: 0, OVERLAP: 0, COOLDOWN: 0, BLOCKED: 0 };
        for (const r of st.racers) {
          const m = r.currentMode ?? PRIORITY_MODE.NORMAL;
          const fc = r.currentModeFrameCount ?? 0;
          modeCounts[m] = (modeCounts[m] ?? 0) + 1;
          modeFrameSums[m] = (modeFrameSums[m] ?? 0) + fc;
          if (fc > (modeFrameMax[m] ?? 0)) modeFrameMax[m] = fc;
        }

        ctx.save();
        for (const r of st.racers) {
          if (r.finished) continue;
          const mode = r.currentMode ?? PRIORITY_MODE.NORMAL;
          if (mode === PRIORITY_MODE.NORMAL) continue;
          const color = modeColors[mode];
          if (!color) continue;

          // Convert world position to screen space: world_x * effZoom + offsetX (both track types)
          const effZx = frameEffZoom; // cam.zoom×BASE_ZOOM (open) or cam.zoom×bsX (closed)
          const effZy = isOpenTrack ? effZx : cam.zoom * bsY;
          const rox = frameTimingConfig.renderInterpolation
            ? lerp(r._prevX ?? r.x, r.x, renderAlpha)
            : r.x;
          const roy = frameTimingConfig.renderInterpolation
            ? lerp(r._prevY ?? r.y, r.y, renderAlpha)
            : r.y;
          const sx = rox * effZx + cam.offsetX;
          const sy = roy * effZy + cam.offsetY;

          const spriteScreenR = (r.spriteWorldSizePx ?? 20) * effZx * 0.5;
          const ringR = Math.max(spriteScreenR, 8);
          ctx.beginPath();
          ctx.arc(sx, sy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Frame count + blocker name above the ring
          const fc = r.currentModeFrameCount ?? 0;
          ctx.font = '9px monospace';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          if (mode === PRIORITY_MODE.BLOCKED && r.blockerInfo) {
            ctx.fillText(`${fc} ←${r.blockerInfo.name}`, sx, sy - ringR - 2);
          } else {
            ctx.fillText(fc, sx, sy - ringR - 2);
          }
          ctx.textAlign = 'left';
        }

        // Info box — top right corner (wider to fit stats)
        const boxX = CW - 210;
        const boxY = 12;
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(boxX - 6, boxY - 4, 202, 136);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#e6edf3';
        ctx.fillText('Priority Modes  n  avg  max', boxX, boxY + 11);

        function modeAvg(m) {
          return modeCounts[m] > 0 ? Math.round(modeFrameSums[m] / modeCounts[m]) : 0;
        }
        const rows = [
          { label: 'NORMAL  ', color: '#888', key: PRIORITY_MODE.NORMAL },
          { label: 'OVERLAP ', color: '#ef4444', key: PRIORITY_MODE.OVERLAP },
          { label: 'COOLDOWN', color: '#f97316', key: PRIORITY_MODE.COOLDOWN },
          { label: 'BLOCKED ', color: '#eab308', key: PRIORITY_MODE.BLOCKED },
        ];
        rows.forEach(({ label, color, key }, i) => {
          const n = modeCounts[key] ?? 0;
          const avg = modeAvg(key);
          const mx = modeFrameMax[key] ?? 0;
          ctx.fillStyle = color;
          ctx.fillText(
            `${label} ${String(n).padStart(2)}  ${String(avg).padStart(4)}  ${String(mx).padStart(4)}`,
            boxX,
            boxY + 28 + i * 26
          );
        });

        // Blocker detail list — up to 5 currently BLOCKED racers
        const blockedWithInfo = st.racers.filter(
          (r) => r.currentMode === PRIORITY_MODE.BLOCKED && r.blockerInfo
        );
        if (blockedWithInfo.length > 0) {
          const listY = boxY + 148;
          const listH = Math.min(blockedWithInfo.length, 5) * 16 + 20;
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          ctx.fillRect(boxX - 6, listY - 4, 202, listH);
          ctx.font = '10px monospace';
          ctx.fillStyle = '#eab308';
          ctx.fillText('BLOCKED by (dT=px, dY=px):', boxX, listY + 10);
          blockedWithInfo.slice(0, 5).forEach((r, i) => {
            const b = r.blockerInfo;
            const sign = b.dT >= 0 ? '+' : '';
            ctx.fillStyle = '#c9d1d9';
            ctx.fillText(
              `${(r.name ?? `#${r.index}`).slice(0, 8).padEnd(8)} ← ${b.name.slice(0, 8).padEnd(8)} dT=${sign}${b.dT} dY=${b.dY >= 0 ? '+' : ''}${b.dY}`,
              boxX,
              listY + 24 + i * 16
            );
          });
        }
        ctx.restore();
      }

      // ── Phase overlays ──
      if (st.phase === PHASE.COUNTDOWN) {
        drawCountdownOverlay(ts - st.countdownStart);
      } else if (st.phase === PHASE.FINISHED) {
        drawFinishedOverlay();
      }

      // ── Race Plan status badge (top-right, dev/sightcheck aid) ──────────────
      if (racePlanController && st.phase !== PHASE.COUNTDOWN) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(CW - 172, 8, 164, 22);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText(`Race Plan: ON  seed:${racePlanSeed}`, CW - 168, 24);
        ctx.restore();
      }

      // ── PiP minimap (RACING and FINISHED only) ──
      if (st.phase !== PHASE.COUNTDOWN) {
        const leaderIdx = st.racers.reduce((best, r, i) => (r.t > st.racers[best].t ? i : best), 0);
        const minimapHighlights =
          showRpMinimapBadgesCfg && rpPlanInfo ? rpPlanInfo.b1Indices : null;
        renderMinimap(ctx, shape, st.racers, leaderIdx, CW, CH, minimapHighlights);
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
          <CameraStateHUD camState={camState} visible={showCameraStateHud} />
          <StateOverlay text={overlayText} />
          <CameraDiagnosticsHUD
            cameraRef={camDirRef}
            diagRef={diagDataRef}
            leaderDiagRef={leaderDiagRef}
            visible={showCameraDiagnostics}
            showRpDiag={showRpDiag}
          />
          <CameraFrameLogHUD cameraRef={camDirRef} visible={enableFrameLog} />
          <RacePlanHUD
            diagRef={diagDataRef}
            showWinnerList={showRpWinnerList}
            showSpeedMonitor={showTop10SpeedMonitor}
          />
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
