// ============================================================
// File:        index.jsx
// Path:        client/src/screens/RaceScreen/index.jsx
// Project:     RaceArena
// Created:     2026-04-20
// Description: Live race canvas with scrolling camera (open tracks),
//              TV camera director (closed tracks), multi-lap support,
//              fullscreen toggle, and fade-to-black navigation.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { validateActiveRace } from './raceSession.js';
import {
  drawEditorBackground,
  drawEditorTrackSurface,
  drawOpenTrackFinishLine,
  getBgCanvasReady,
} from './drawing/trackRendering.js';
import { getBackgroundImage } from '../../modules/track-effects/bgImageCache.js';
import {
  drawTitle,
  drawTitleOpen,
  drawZoneBand,
  drawLapInfo,
  drawFinalLapOverlay,
  drawCountdownOverlay,
  drawFinishedOverlay,
} from './drawing/overlayRendering.js';
import { emitBurst, drawParticles, drawSurfaceTrails } from './drawing/particleRendering.js';
import { drawRacers } from './drawing/racerRendering.js';
import { formatRaceTime } from '../../utils/formatRaceTime.js';
import { lerp, lerpAngle, easeInOutCubic } from '../../utils/mathUtils.js';
import { resolveActiveBrandProfile } from '../../modules/branding/useActiveBrandProfile.js';
import { drawBattleDiagMarkers } from './drawing/battleDiagRendering.js';
import { getRacerType, getCoatsByType } from '../../modules/racer-types/index.js';
import {
  assignCoat,
  assignPattern,
  PATTERN_IDS,
} from '../../modules/racer-types/coatAssignment.js';
import { CameraDirector, OPEN_TRACK_BASE_ZOOM } from '../../modules/camera/CameraDirector.js';
import { effectiveZoom } from '../../modules/camera/openTrackCamera.js';
import { renderMinimap } from '../../modules/camera/Minimap.js';
import {
  lapsFromDuration,
  lapProgress,
  currentLap,
  REFERENCE_FPS,
  computeSpeedScaleFactor,
  computeClosedTrackSsf,
} from '../../modules/camera/lapUtils.js';
import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { computeRaceBaseSpeed } from '../../modules/raceBaseSpeed.js';
import {
  loadRaceBehaviorConfig,
  computeEffectiveBrakeFactor,
} from '../../modules/raceBehaviorConfig.js';
import { initRacerBehavior, applyRacerBehavior } from '../../modules/raceBehavior.js';
import {
  computeRacerLayout,
  computeBodyNarrowRef,
  computeEvenRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
} from '../../modules/rowLayout.js';
import { loadRowLayoutConfig } from '../../modules/rowLayoutConfig.js';
import { loadRaceDynamicsConfig } from '../../modules/raceDynamicsConfig.js';
import { loadRubberBandConfig } from '../../modules/rubberBandConfig.js';
import { loadRaceZoneConfig } from '../../modules/raceZoneConfig.js';
import { resolveZones, zoneMultAt } from '../../modules/raceZones.js';
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
import PerfLogHUD from './PerfLogHUD.jsx';
import { createPerfLog, recordPerfFrame } from './perfLog.js';
import StateOverlay from './StateOverlay.jsx';
import BattleDiagHUD from './BattleDiagHUD.jsx';
import ComebackDiagHUD from './ComebackDiagHUD.jsx';
import LeadChangeDiagHUD from './LeadChangeDiagHUD.jsx';
import {
  selectOverlayText,
  selectOverlayTextNoRepeat,
} from '../../modules/stateOverlayTemplates.js';
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
import { initProbe, recordFrame, recordFrameCamera } from '../../modules/rAFProbe.js';
import BrandLogoOverlay from './BrandLogoOverlay.jsx';
import './RaceScreen.css';

const CANVAS_W = 1280;
const CANVAS_H = 720;

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

const RANK_PALETTE = ['#ffd700', '#c0c0c0', '#cd7f32'];

const PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 };

// Fixed physics timestep in ms. Physics advances in discrete FIXED_DT steps
// regardless of browser frame rate, eliminating the 2:1 speed oscillation seen
// when rAF alternates between 16ms and 33ms frames.
const FIXED_DT = 16;

const tPos = (t) => ((t % 1) + 1) % 1;

export default function RaceScreen() {
  const fadeNavigate = useFadeNavigate();
  const fadeNavRef = useRef(fadeNavigate);
  // eslint-disable-next-line react-hooks/refs
  fadeNavRef.current = fadeNavigate; // inline render-body sync — no extra effect, no queue shift
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const screenRef = useRef(null);
  const rafRef = useRef(null);
  const finishNavTimerRef = useRef(null);

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

  const [raceData, setRaceData] = useState(null);
  const [error, setError] = useState(null);

  const activeBrand = useMemo(
    () =>
      resolveActiveBrandProfile(
        storageGet(KEYS.BRANDING, []),
        storageGet(KEYS.ACTIVE_SESSION, null)
      ),
    []
  );
  const [phase, setPhase] = useState(PHASE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [scoreboard, setScoreboard] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [camState, setCamState] = useState(null);
  const prevHudStateRef = useRef(null);
  const perfLogRef = useRef(null);
  // Camera config as React state so updateConfig() is called whenever it changes.
  const [cameraConfig] = useState(() => loadCameraConfig());
  const cameraConfigRef = useRef(cameraConfig);
  const showCameraStateHud = cameraConfig.showCameraStateHud ?? true;
  const showCameraDiagnostics = cameraConfig.showCameraDiagnostics ?? false;
  const showRpDiag = cameraConfig.showRpDiag ?? false;
  const showRpWinnerList = cameraConfig.showRpWinnerList ?? false;
  const showTop10SpeedMonitor = cameraConfig.showTop10SpeedMonitor ?? false;
  const enableFrameLog = cameraConfig.enableFrameLog ?? false;
  const enablePerfLog = cameraConfig.enablePerfLog ?? false;
  const showBattleDiag = cameraConfig.showBattleDiag ?? false;
  const showComebackDiag = cameraConfig.showComebackDiag ?? false;
  const showLeadChangeDiag = cameraConfig.showLeadChangeDiag ?? false;

  // ── State-overlay narrative text ─────────────────────────────────────────
  const [overlayText, setOverlayText] = useState(null);
  const overlayTimerRef = useRef(null);
  // Per-race no-repeat tracking: Set<number> of used template indices per state key.
  // Reset at race start via phase transition. OVERVIEW/COMEBACK use last-index anti-repeat;
  // BATTLE_ZOOM uses the full Set to prevent any repeat within one race.
  const overlayLastIndexRef = useRef({});
  const overlayUsedBattleIndicesRef = useRef(new Set());
  const overlayUsedComebackIndicesRef = useRef(new Set());
  const overlayUsedLeadChangeIndicesRef = useRef(new Set());

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
    if (!['OVERVIEW', 'BATTLE_ZOOM', 'COMEBACK_ZOOM', 'LEAD_CHANGE'].includes(camState)) return;

    const vars = {};
    const racers = g.current?.racers ?? [];
    if (camState === 'OVERVIEW') {
      if (racers.length > 0) {
        const leader = racers.reduce((a, b) => (b.t > a.t ? b : a));
        if (leader?.name) vars.leader = leader.name;
      }
    } else if (camState === 'BATTLE_ZOOM') {
      // Derive {position} (rank of frontmost battle racer) and {count} (group size).
      const dir = camDirRef.current;
      if (dir && racers.length > 0) {
        const battleData = dir.getBattleDiagData(racers);
        const sorted = [...racers].sort((a, b) => b.t - a.t);
        if (battleData.lockedRacer) {
          const pos = sorted.indexOf(battleData.lockedRacer) + 1;
          if (pos > 0) vars.position = pos;
        } else {
          vars.position = 1;
        }
        vars.count = Math.max(battleData.groupRacers.length, 3);
      }
    } else if (camState === 'COMEBACK_ZOOM') {
      // Derive {name} from the locked comeback racer.
      const dir = camDirRef.current;
      if (dir) {
        const cbData = dir.getComebackDiagData(racers, performance.now());
        if (cbData.lockedRacer?.name) vars.name = cbData.lockedRacer.name;
      }
    } else if (camState === 'LEAD_CHANGE') {
      // Derive {newLeader} and {previousLeader} from lead-change data.
      const dir = camDirRef.current;
      if (dir) {
        const lcData = dir.getLeadChangeDiagData();
        if (lcData.newLeader) vars.newLeader = lcData.newLeader;
        if (lcData.previousLeader) vars.previousLeader = lcData.previousLeader;
      }
    }

    let result;
    if (camState === 'BATTLE_ZOOM') {
      result = selectOverlayTextNoRepeat(camState, vars, overlayUsedBattleIndicesRef.current);
      if (result) overlayUsedBattleIndicesRef.current.add(result.index);
    } else if (camState === 'COMEBACK_ZOOM') {
      result = selectOverlayTextNoRepeat(camState, vars, overlayUsedComebackIndicesRef.current);
      if (result) overlayUsedComebackIndicesRef.current.add(result.index);
    } else if (camState === 'LEAD_CHANGE') {
      result = selectOverlayTextNoRepeat(camState, vars, overlayUsedLeadChangeIndicesRef.current);
      if (result) overlayUsedLeadChangeIndicesRef.current.add(result.index);
    } else {
      result = selectOverlayText(camState, vars, overlayLastIndexRef.current);
      if (result) {
        overlayLastIndexRef.current = { ...overlayLastIndexRef.current, [camState]: result.index };
      }
    }
    if (!result) return;

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
    let cancelled = false;
    let bgCanvasReady = false;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
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
    // Read stored width first; fall back to spline estimate only for tracks without one.
    // getActualTrackWidth() measures the median spline cross-section and overestimates for
    // open tracks whose physical centerWidth is narrower than the spline envelope.
    const trackWidthPx = geometry.width ?? shapeRef.current.getActualTrackWidth();
    const isOpenTrack = shapeRef.current.isOpen;
    const worldWidth = raceData.worldWidth ?? 1280;
    const bsX = CANVAS_W / worldWidth;
    const bsY = CANVAS_H / worldHeight;
    const bgImagePath = geometry.backgroundImage ?? null;

    // Size and clear the bg canvas for this track (setting width/height always clears it).
    if (bgCanvasRef.current) {
      bgCanvasRef.current.width = worldWidth;
      bgCanvasRef.current.height = worldHeight;
    }

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
    behaviorConfig.isOpen = isOpenTrack;
    const rowConfig = loadRowLayoutConfig();
    const dynamicsConfig = loadRaceDynamicsConfig();
    const rubberBandConfig = loadRubberBandConfig();
    const raceZoneConfig = loadRaceZoneConfig();
    const zones = resolveZones(raceZoneConfig, isOpenTrack);
    const frameTimingConfig = loadFrameTimingConfig();

    // Auto-sprite-scale: compute displaySizeScale unless D3.5.5 override exists
    const autoScaleConfig = loadAutoScaleConfig();
    // Use the component-level cameraConfig (via ref for closure access).
    const cameraConfig = cameraConfigRef.current;
    const displaySize = racerType.config.displaySize;
    const _bfNarrowRaw = Math.min(racerType.config.bodyFillX, racerType.config.bodyFillY);
    const _bfLongRaw = Math.max(racerType.config.bodyFillX, racerType.config.bodyFillY);
    const bodyFillNarrow = Number.isFinite(_bfNarrowRaw) && _bfNarrowRaw > 0 ? _bfNarrowRaw : 1.0;
    const bodyFillLong = Number.isFinite(_bfLongRaw) && _bfLongRaw > 0 ? _bfLongRaw : 1.0;
    const effectiveWidth = trackWidthPx * behaviorConfig.startSpreadRange;
    // physicalSpriteSize: frame-based scale from real track width — drives rowGapPx / rowCount (physics).
    let physicalSpriteSize = displaySize;
    // displaySizeScale: body-narrow-based scale from W_REF.
    // Used for camera normalization (drawnBodyWidthRefPx) and render (frameDisplayScale).
    let displaySizeScale = 1;
    if (autoScaleConfig.enabled) {
      const rawOverrides = storageGet(KEYS.RACER_TYPE_OVERRIDES, {});
      const typeOverride = rawOverrides[typeId];
      const hasDisplaySizeOverride =
        typeOverride && typeof typeOverride === 'object' && 'displaySize' in typeOverride;
      if (!hasDisplaySizeOverride) {
        // Physical layout: real width, frame-based (unchanged — drives rowGapPx/rowCount)
        const racerLayout = computeRacerLayout(
          effectiveWidth,
          nRacers,
          displaySize,
          autoScaleConfig
        );
        physicalSpriteSize = racerLayout.spriteSize;
        // Render/camera reference: body-narrow-based, capped at real track width.
        // W_REF=285 matches wide open tracks; capping at effectiveWidth prevents visible
        // bodies from exceeding physical avoidance slots on narrow closed tracks.
        const W_REF = Math.min(285, effectiveWidth);
        const bodyRef = computeBodyNarrowRef(
          W_REF,
          nRacers,
          displaySize,
          bodyFillNarrow,
          autoScaleConfig
        );
        displaySizeScale = bodyRef.bodyNarrow / displaySize;
      }
    }
    // drawnBodyWidthRefPx = body-narrow world-px: camera zoom set so visible narrow-axis body
    // equals overviewTargetScreenPx at OVERVIEW.
    const drawnBodyWidthRefPx = displaySize * displaySizeScale;

    const duration = raceData.duration ?? 60;
    const targetDuration = raceData.targetDuration ?? 60;
    // Open tracks: finish line set to the distance a mean racer covers in targetDuration at natural speed.
    // ssf scales t-space speed for track length so physical traversal time is comparable across tracks.
    // Closed tracks: finish line is the target lap count; closedSsf normalizes race_baseSpeed by
    // path length so all closed tracks produce comparable on-screen speeds (analogous to open ssf).
    const ssf = isOpenTrack ? computeSpeedScaleFactor(geometry.pathLengthPx ?? 0) : 1;
    const closedSsf = isOpenTrack ? 1 : computeClosedTrackSsf(geometry.pathLengthPx ?? 0);
    const finishT = isOpenTrack
      ? Math.min(
          (BASE_SPEED_MEAN * speedMultiplier * REFERENCE_FPS * targetDuration) / ssf,
          1 - behaviorConfig.runoutZone
        )
      : (raceData.targetLaps ?? lapsFromDuration(duration));
    // N-calibrated expected-minimum spread: E[min_n] = spreadMin + (spreadMax - spreadMin) / (n+1).
    // Ensures the expected last finisher arrives at targetDuration × closedSsf for closed tracks.
    const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
    const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
    const expectedMinSpreadFactor =
      spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
    const race_baseSpeed = computeRaceBaseSpeed(
      finishT,
      targetDuration * expectedMinSpreadFactor * speedMultiplier * closedSsf
    );
    const maxLaps = isOpenTrack ? 1 : finishT;

    camDirRef.current = new CameraDirector(
      worldWidth,
      worldHeight,
      isOpenTrack,
      cameraConfig,
      drawnBodyWidthRefPx,
      shapeRef.current
    );
    // Row-start layout: even distribution across minimum-needed rows (bottom-up sizing)
    const pathLengthPx = geometry.pathLengthPx ?? 0;
    const rowGapPx = physicalSpriteSize * rowConfig.rowGapMultiplier;
    const deltaT_per_row = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;

    // rowCount: min rows at current sprite size; racers distributed evenly across them
    const rowCount = Math.max(
      1,
      Math.ceil(
        nRacers / Math.max(1, Math.floor((2 * effectiveWidth) / Math.max(1, physicalSpriteSize)))
      )
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

    overlayUsedBattleIndicesRef.current.clear();
    overlayUsedComebackIndicesRef.current.clear();
    overlayUsedLeadChangeIndicesRef.current.clear();

    g.current = {
      phase: PHASE.COUNTDOWN,
      countdownStart: null,
      raceStart: null,
      lastTs: null,
      physicsAccum: 0,
      physicsTs: 0,
      smoothDt: 16,
      slowmoFadeProgress: 0,
      slowmoActive: false,
      slowmoStartWallTs: 0,
      slowmoTs: null,
      focusFadeProgress: 0,
      finishedCount: 0,
      dustParticles: [],
      burstParticles: [],
      maxLaps,
      finishT,
      finalLapStartTs: null,
      // Leader track-progress fraction [0,1]; drives WHEN phases switch (route-based, not time).
      // Monotonic — never regresses when the leader finishes. Distinct from physicsTs (the race
      // stopwatch in ms, which drives finish times + real-time eased transitions).
      raceProgress: 0,
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
          coatId: getCoatsByType(typeId) ? assignCoat(r.name, getCoatsByType(typeId)) : undefined,
          patternId: assignPattern(r.name, PATTERN_IDS),
          finished: false,
          finishRank: null,
          runoutDecay: 1,
          trail: [],
          x: 0,
          y: 0,
          angle: 0,
          frameSizePx: physicalSpriteSize,
          drawnBodyWidthPx: drawnBodyWidthRefPx,
          // Drawn body length from render primitives — independent of drawnBodyWidthPx variable.
          // Isotropic renderer: scale = drawnBodyWidthRefPx / (displaySize × bodyFillNarrow).
          // All sprite frames are square (verified: all 20 types use equal frameWidth/frameHeight),
          // so the general ×(frameWidth/frameHeight) factor equals 1 and is omitted.
          drawnBodyLengthPx:
            bodyFillNarrow > 0
              ? (drawnBodyWidthRefPx * bodyFillLong) / bodyFillNarrow
              : drawnBodyWidthRefPx,
          trackWidthPx,
          pathLengthPx,
          // VRE-4: one emitter instance per racer (stateful generators must not be shared)
          surfaceEmitter: resolveTrailEmitter(racerType, trackSurfaceClasses),
          surfaceParticles: [],
          trajectoryMult: 1.0,
          trajectoryMultTarget: 1.0,
          trajectoryMultPrev: 1.0,
          trajectoryMultTransStart: 0,
          areaBonusMult: 1.0,
          rubberBandMult: 1.0,
          rubberBandMultPrev: 1.0,
          rubberBandMultTarget: 1.0,
          rubberBandTransStart: 0,
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
    const racePlanEnabled = !!raceData.racePlanEnabled && targetDuration >= 60;
    const racePlanSeed = raceData.racePlanSeed ?? 0;
    let racePlanController = null;
    let rpPlanInfo = null;
    const speedRings = new Map();
    if (racePlanEnabled) {
      const planRacers = g.current.racers.map((r) => ({
        index: r.index,
        startRowIndex: assignmentByRacer.get(r.index)?.rowIndex ?? 0,
      }));
      const plan = createRacePlan(
        planRacers,
        finishT,
        targetDuration * 1000,
        // Last-resort ?? fallbacks: must mirror DEFAULT_RACE_DYNAMICS_CONFIG (defaults.js) exactly,
        // so a future shared-default change cannot silently re-introduce drift here.
        {
          bonusStrengthMultiplier: dynamicsConfig.racePlanBonusStrengthMultiplier ?? 2.0,
          bonusTransitionEnd: dynamicsConfig.racePlanBonusTransitionEnd ?? 0.75,
          bonusFadeDuration: dynamicsConfig.racePlanBonusFadeDuration ?? 1500,
          corridorStart: dynamicsConfig.racePlanCorridorStart ?? 0.55,
          corridorEnd: dynamicsConfig.racePlanCorridorEnd ?? 1.0,
        },
        racePlanSeed
      );
      racePlanController = createTrajectoryController(plan);
      rpPlanInfo = {
        targetRanks: plan._racerTargetRank,
        b1Indices: new Set(
          [...plan._racerTargetRank.entries()].filter(([, rank]) => rank <= 5).map(([idx]) => idx)
        ),
      };
    }
    // Inject B1-racer set into CameraDirector for COMEBACK detection
    if (racePlanEnabled && rpPlanInfo?.b1Indices) {
      camDirRef.current.updateRacePlan(rpPlanInfo.b1Indices);
    }

    // Initialise Race-Plan diag fields (geometry snapshot at race start)
    diagDataRef.current.rpEnabled = racePlanEnabled;
    diagDataRef.current.rpRows = rowLayout.totalRows;
    diagDataRef.current.rpRacersPerRow = rowLayout.racersPerRow;
    diagDataRef.current.rpNRacers = nRacers;
    diagDataRef.current.rpBonusMult = dynamicsConfig.racePlanBonusStrengthMultiplier ?? 2.0;

    setScoreboard(g.current.racers.map((r) => ({ ...r, rank: 0 })));

    // ── Canvas positions ────────────────────────────────────────────────────
    // openTrackHW = half the track width used by physics (same source as avoidance/overlap).
    // drawOpenTrackFinishLine derives its own perp/fwd vectors from finishT angle locally.
    const openTrackHW = isOpenTrack ? trackWidthPx / 2 : 0;

    // physicalY ∈ [-1, +1] maps to EditorShape offset ∈ [-0.5, +0.5] via /2.
    function computePositions() {
      const st = g.current;
      const shape = shapeRef.current;
      for (const r of st.racers) {
        const t = isOpenTrack ? Math.min(r.t, 1) : tPos(r.t);
        if (isOpenTrack) {
          // Fix 3: Eliminate forward-shift wackeln caused by the inner↔outer spline
          // cross-section not being perfectly perpendicular to the track tangent.
          // Strategy: use the original getPosition call for the boundary point (preserves
          // correct track-width scale and stays within bounds), then project the
          // center→boundary vector onto the LOCAL perpendicular at this t, discarding
          // any forward component. r.angle is the local tangent so each racer points
          // correctly along the track at their own position.
          const center = shape.getPosition(t, 0);
          const lateral = shape.getPosition(t, r.physicalY / 2);
          const perpCos = Math.cos(center.angle + Math.PI / 2);
          const perpSin = Math.sin(center.angle + Math.PI / 2);
          const lateralDist = (lateral.x - center.x) * perpCos + (lateral.y - center.y) * perpSin;
          r.x = center.x + perpCos * lateralDist;
          r.y = center.y + perpSin * lateralDist;
          r.angle = center.angle;
        } else {
          const pos = shape.getPosition(t, r.physicalY / 2);
          r.x = pos.x;
          r.y = pos.y;
          r.angle = pos.angle;
        }
      }
    }

    // Pre-allocated render-interpolation buffer — reused every frame, no per-frame allocation.
    const renderBuf = [];

    // Perf-log: reset ring buffer on each race start (enablePerfLog captured from cameraConfig).
    if (enablePerfLog) perfLogRef.current = createPerfLog();

    // Perf probe: activated by ?perfprobe=1 URL flag (persisted via sessionStorage).
    initProbe();

    // ── rAF loop ─────────────────────────────────────────────────────────────
    function loop(ts) {
      if (cancelled) return;
      recordFrame(ts);
      const st = g.current;
      const shape = shapeRef.current;
      const rawDt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      // Perf-log bracket 1: start of frame (also serves as default for tPhys when no physics ran).
      const t0 = enablePerfLog ? performance.now() : 0;
      // tPhys starts at t0 so physMs = 0 on non-RACING frames (no physics while-loop ran).
      let tPhys = t0;
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

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

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
        // ── BATTLE slowmo ────────────────────────────────────────────────────
        // Slows down physics (and sprite animation) during BATTLE_ZOOM.
        // Camera path (smoothDt) is intentionally unaffected.
        {
          const isBattleZoom = camDirRef.current?.hudState === 'BATTLE_ZOOM';
          const smFactor = cameraConfigRef.current.battleSlowmoFactor ?? 0.5;
          const smMinDurMs = (cameraConfigRef.current.battleSlowmoMinDuration ?? 2.0) * 1000;
          const smFadeDurMs = (cameraConfigRef.current.battleSlowmoFadeDuration ?? 0.3) * 1000;
          if (isBattleZoom && !st.slowmoActive) {
            st.slowmoActive = true;
            st.slowmoStartWallTs = ts;
          }
          if (!isBattleZoom && st.slowmoActive && ts - st.slowmoStartWallTs >= smMinDurMs) {
            st.slowmoActive = false;
          }
          const fadeStep = smFadeDurMs > 0 ? rawDt / smFadeDurMs : Infinity;
          st.slowmoFadeProgress = st.slowmoActive
            ? Math.min(1, st.slowmoFadeProgress + fadeStep)
            : Math.max(0, st.slowmoFadeProgress - fadeStep);
          const effectiveSlowmoFactor = 1.0 - (1.0 - smFactor) * st.slowmoFadeProgress;
          // ── BATTLE focus fade (same duration as slowmo fade) ─────────────────
          const focusFadeStep = smFadeDurMs > 0 ? rawDt / smFadeDurMs : Infinity;
          st.focusFadeProgress = isBattleZoom
            ? Math.min(1, st.focusFadeProgress + focusFadeStep)
            : Math.max(0, st.focusFadeProgress - focusFadeStep);
          if (st.slowmoTs === null) st.slowmoTs = ts;
          st.slowmoTs += rawDt * effectiveSlowmoFactor;
          // ── Fixed-timestep physics accumulator ─────────────────────────────
          // Each rAF contributes rawDt ms. Physics steps in FIXED_DT=16ms increments:
          // long frames (50ms) would yield 3 steps but are capped at 2 (see catch-up cap below); short frames (12ms) yield 0.
          // Remainder carries over so no physics time is lost between frames.
          st.physicsAccum += rawDt * effectiveSlowmoFactor;
        }
        // Cap catch-up at 2 steps per rAF — prevents the stall→many-steps→longer-stall
        // death spiral that causes STATUS_ACCESS_VIOLATION at ~14s under load.
        // Fairness is unaffected: sim tests physics in sim time, not wall-clock time.
        let _catchupSteps = 0;
        while (st.physicsAccum >= FIXED_DT && _catchupSteps++ < 2) {
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

          // Monotonic leader track-progress [0,1] — drives WHEN phases switch (route-based).
          // Never regresses when the leader finishes. Separate from the rubber-band leader scan
          // below (which is non-monotonic by design).
          let _leaderT = -Infinity;
          for (const r of st.racers) {
            if (!r.finished && r.t > _leaderT) _leaderT = r.t;
          }
          const _rawProgress = _leaderT > -Infinity ? _leaderT / st.finishT : 0;
          if (_leaderT > -Infinity) {
            st.raceProgress = Math.min(1, Math.max(st.raceProgress, _rawProgress));
          }
          // (no unfinished racer: leave raceProgress unchanged)

          // Controller-Pass: rank racers by current t, write trajectoryMultTarget on each.
          if (racePlanController) racePlanController.update(st.racers, physicsTs, st.raceProgress);

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

          // ── Rubber-band: flat catch-up boost for all non-leaders ─────────────
          if (rubberBandConfig.enabled) {
            const leaderT = st.racers.reduce(
              (best, r2) => (!r2.finished && r2.t > best ? r2.t : best),
              -Infinity
            );
            const leaderProgress = leaderT > -Infinity ? leaderT / st.finishT : 0;
            const endgameThreshold = cameraConfigRef.current.endgameThreshold ?? 0.9;
            if (leaderT > 0 && leaderProgress < endgameThreshold) {
              const secondT = st.racers.reduce(
                (best, r2) => (!r2.finished && r2.t < leaderT && r2.t > best ? r2.t : best),
                -Infinity
              );
              const leaderGap = secondT > -Infinity ? (leaderT - secondT) / st.finishT : 0;
              const boostActive = leaderGap > rubberBandConfig.gapThreshold;
              for (const r of st.racers) {
                if (r.finished) {
                  r.rubberBandMult = 1.0;
                  continue;
                }
                const isLeader = r.t === leaderT;
                const newTarget = !isLeader && boostActive ? 1.0 + rubberBandConfig.flatBoost : 1.0;
                if (Math.abs(newTarget - r.rubberBandMultTarget) > 0.001) {
                  r.rubberBandMultPrev = r.rubberBandMult;
                  r.rubberBandMultTarget = newTarget;
                  r.rubberBandTransStart = physicsTs;
                }
                const elapsed = physicsTs - r.rubberBandTransStart;
                r.rubberBandMult =
                  elapsed < rubberBandConfig.boostRampMs
                    ? r.rubberBandMultPrev +
                      (r.rubberBandMultTarget - r.rubberBandMultPrev) *
                        easeInOutCubic(elapsed / rubberBandConfig.boostRampMs)
                    : r.rubberBandMultTarget;
              }
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
                      physicsTs,
                      st.raceProgress
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
            // Flag 2 (report 06): brakeMatchFactor is written by raceBehavior.js one frame
            // prior and read here — same one-frame-lag cross-file pattern as avoidanceActive.
            // Flag 3 (report 06): min() preserves the warmup ramp: during the first 3s the
            // ramp factor may already be weaker than the cap, so the cap must not override it.
            // speedBrakeFactor (0.945) remains a fixed floor via effectiveBrakeFactor.
            const brake = r.avoidanceActive
              ? Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)
              : 1.0;
            // Zone mult: position-only, type-neutral. 1.0 when zones is empty or racer is outside.
            // cf (course fraction) = 0 at start, 1 at finish; open maps r.t onto [0,1] via finishT.
            // Note: zones are not applied in constSpeed (D4) diagnostic mode — D4 overwrites t/vt.
            const zt = isOpenTrack ? r.t / st.finishT : tPos(r.t);
            const zoneMult = zoneMultAt(zt, zones);
            if (!r.finished) {
              // FIXED_DT/16 = 1.0 — dt factor eliminated by fixed timestep
              r.t = Math.min(
                r.t +
                  r.baseSpeed *
                    boost *
                    brake *
                    r.trajectoryMult *
                    r.areaBonusMult *
                    r.rubberBandMult *
                    zoneMult,
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
                ? (r.baseSpeed *
                    boost *
                    brake *
                    r.trajectoryMult *
                    r.areaBonusMult *
                    r.rubberBandMult *
                    zoneMult) /
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
          applyRacerBehavior(st.racers, behaviorConfig, { currentTs: physicsTs });
          for (const r of st.racers) {
            if (r.finished) continue;
            if (r.t >= st.finishT) {
              r.finished = true;
              r.finishRank = ++st.finishedCount;
              r.finishTimeMs = physicsTs;
              emitBurst(st.burstParticles, r.x, r.y);
            }
            r.lap = isOpenTrack ? 1 : currentLap(r.t, st.maxLaps);
          }

          // Scoreboard: update when physicsTs crosses a 250ms bucket boundary.
          // Two-group sort mirrors the Results screen: finishers by finishRank
          // (ascending), then still-racing by r.t (descending). Pure b.t-a.t
          // fails once racers finish because the runout-decay surge lets later
          // finishers temporarily overtake earlier ones in raw r.t.
          if (Math.round(physicsTs / 250) !== Math.round((physicsTs - FIXED_DT) / 250)) {
            setScoreboard(
              [...st.racers]
                .sort((a, b) => {
                  if (a.finished !== b.finished) return a.finished ? -1 : 1;
                  if (a.finished) return a.finishRank - b.finishRank;
                  return b.t - a.t;
                })
                .map((r, i) => ({ ...r, rank: i + 1 }))
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
                  finishTimeMs: r.finishTimeMs ?? null,
                })),
                elapsedTime: Math.round((ts - st.raceStart) / 1000),
                race: raceData,
              })
            );
            finishNavTimerRef.current = setTimeout(
              () => fadeNavRef.current('/results'),
              camDirRef.current?.finishPauseMs ?? 2500
            );
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
              d.rpPhase = racePlanController.getPhase(physicsTs, st.raceProgress);
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
                const bb = r.areaBonusMult ?? 1;
                if (bb < bbMin) bbMin = bb;
                if (bb > bbMax) bbMax = bb;
              }
              d.rpBbMin = bbMin;
              d.rpBbMax = bbMax;

              // B1 winner list (targetRank 1–5)
              if (rpPlanInfo) {
                const ranked = [...activeR].sort((a, b) => b.t - a.t);
                const rankByIdx = new Map(ranked.map((r, i) => [r.index, i + 1]));
                const b1Racers = [];
                for (const [racerIdx, targetRank] of rpPlanInfo.targetRanks) {
                  if (!rpPlanInfo.b1Indices.has(racerIdx)) continue;
                  const racer = st.racers.find((r) => r.index === racerIdx && !r.finished);
                  if (!racer) continue;
                  b1Racers.push({
                    index: racerIdx,
                    name: racer.name,
                    targetRank,
                    currentRank: rankByIdx.get(racerIdx) ?? 0,
                    delta: (rankByIdx.get(racerIdx) ?? 0) - targetRank,
                    startRow: assignmentByRacer.get(racerIdx)?.rowIndex ?? 0,
                  });
                }
                b1Racers.sort((a, b) => a.targetRank - b.targetRank);
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
        // Perf-log bracket 2: after physics while-loop (includes EMA + clearRect overhead).
        if (enablePerfLog) tPhys = performance.now();

        // Fraction of next physics step already elapsed in wall time.
        // physicsAccum is always in [0, FIXED_DT) after the loop.
        renderAlpha = Math.min(1, st.physicsAccum / FIXED_DT);

        // D1: per-racer pixel speed and smoothed Δv between top-3 — diagnostics HUD only.
        // Gated: the sort + spread runs only when the diagnostics overlay is visible.
        if (showCameraDiagnostics) {
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
        // Advance Heimat-Trail dustParticles — in-place mutation + swap-remove (no allocation).
        {
          let i = 0;
          while (i < st.dustParticles.length) {
            const p = st.dustParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.022;
            p.r *= 0.97;
            if (p.alpha <= 0) {
              st.dustParticles[i] = st.dustParticles[st.dustParticles.length - 1];
              st.dustParticles.length--;
            } else i++;
          }
        }
        // Advance burst particles — in-place mutation + swap-remove (no allocation).
        {
          let i = 0;
          while (i < st.burstParticles.length) {
            const p = st.burstParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.18;
            p.alpha -= 0.014;
            p.r *= 0.97;
            if (p.alpha <= 0) {
              st.burstParticles[i] = st.burstParticles[st.burstParticles.length - 1];
              st.burstParticles.length--;
            } else i++;
          }
        }
      } else {
        // FINISHED — keep burst particles alive, in-place mutation + swap-remove.
        computePositions();
        {
          let i = 0;
          while (i < st.burstParticles.length) {
            const p = st.burstParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.18;
            p.alpha -= 0.014;
            if (p.alpha <= 0) {
              st.burstParticles[i] = st.burstParticles[st.burstParticles.length - 1];
              st.burstParticles.length--;
            } else i++;
          }
        }
      }

      // Perf-log bracket 3: after all branches (particles + render-interp on RACING path).
      const tPreCam = enablePerfLog ? performance.now() : 0;
      // ── Camera update ──
      // Pattern A: camera receives interpolated racer positions (renderRacers) so it
      // tracks the same world position as the sprites. Without this, the camera jumps
      // with physics steps while sprites stay 1 step behind → sprite-camera desync.
      // COUNTDOWN uses st.racers directly (no physics steps, no interpolation needed).
      // renderBuf is pre-allocated once per race mount — Object.assign reuses existing
      // objects rather than spreading new ones each frame (eliminates N fat allocations/frame).
      let renderRacers;
      if (frameTimingConfig.renderInterpolation && st.phase === PHASE.RACING) {
        const n = st.racers.length;
        while (renderBuf.length < n) renderBuf.push({});
        renderBuf.length = n;
        for (let _i = 0; _i < n; _i++) {
          const r = st.racers[_i];
          Object.assign(renderBuf[_i], r);
          renderBuf[_i].t = lerp(r._prevT ?? r.t, r.t, renderAlpha);
          renderBuf[_i].x = lerp(r._prevX ?? r.x, r.x, renderAlpha);
          renderBuf[_i].y = lerp(r._prevY ?? r.y, r.y, renderAlpha);
          renderBuf[_i].angle = lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha);
        }
        renderRacers = renderBuf;
      } else {
        renderRacers = st.racers;
      }
      const raceState = {
        raceElapsed: st.raceStart != null ? ts - st.raceStart : 0,
        finishedCount: st.finishedCount,
        winner: st.racers.find((r) => r.finishRank === 1) ?? null,
        finishT: st.finishT,
        isOutcomePhase: diagDataRef.current.rpPhase === 'OUTCOME',
        physicsRacers: st.racers,
      };
      const cam =
        st.phase === PHASE.RACING
          ? camDirRef.current.update(renderRacers, ts, raceState, CANVAS_W, CANVAS_H, rawDt)
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
      // Perf probe: record camera state + zoom alongside the inter-rAF gap captured by recordFrame.
      recordFrameCamera(camDirRef.current.state, cam.zoom);
      // Perf-log bracket 4: after camera director update.
      const tCam = enablePerfLog ? performance.now() : 0;

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
      // Honest single floor: overviewTargetScreenPx is the minimum visible narrow-body
      // size in screen-px for ALL camera states (body-narrow units, not frame units).
      // Applies uniformly — no open/closed branch, no OVERVIEW.spriteScale coupling.
      const minFloorPx = cameraConfigRef.current.overviewTargetScreenPx ?? 28;
      const frameDisplayScale = computeRenderDisplayScale(
        displaySize,
        displaySizeScale,
        frameEffZoom,
        getEffectiveMinTargetScreenPx(racerTypeRef.current?.config?.minTargetScreenPx, minFloorPx),
        getEffectiveMaxTargetScreenPx(
          racerTypeRef.current?.config?.maxTargetScreenPx,
          cameraConfigRef.current.maxTargetScreenPx
        )
      );

      // ── Bg canvas: lazy-draw once on first available frame; CSS transform each frame ──
      if (!bgCanvasReady && bgCanvasRef.current && bgImagePath) {
        const bgImg = getBackgroundImage(bgImagePath);
        if (bgImg) {
          const darkened = getBgCanvasReady(bgImg, bgImagePath, worldWidth, worldHeight);
          if (darkened) {
            bgCanvasRef.current.getContext('2d').drawImage(darkened, 0, 0);
            bgCanvasReady = true;
          }
        }
      }
      if (bgCanvasRef.current && bgImagePath && bgCanvasReady) {
        const bgScaleX = isOpenTrack ? frameEffZoom * (worldWidth / CANVAS_W) : cam.zoom;
        const bgScaleY = isOpenTrack ? frameEffZoom * (worldHeight / CANVAS_H) : cam.zoom;
        bgCanvasRef.current.style.transform = `translate3d(${cam.offsetX * (100 / CANVAS_W)}%, ${cam.offsetY * (100 / CANVAS_H)}%, 0) scale3d(${bgScaleX}, ${bgScaleY}, 1)`;
      }

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
      drawEditorBackground(ctx, ts, bgImagePath, worldWidth, worldHeight, bgCanvasReady);
      for (const inst of effectsRef.current) {
        ctx.save();
        inst.render(ctx);
        ctx.restore();
      }
      if (!isOpenTrack) drawEditorTrackSurface(ctx, shape);
      drawTrackLights(ctx, cachedLightPts, trackLightsConfig, ts, !isOpenTrack, frameEffZoom);
      if (isOpenTrack && st.finishT < 1)
        drawOpenTrackFinishLine(ctx, shape, st.finishT, openTrackHW);
      if (zones.length > 0) drawZoneBand(ctx, shape, zones, isOpenTrack, st.finishT);
      drawParticles(ctx, st.dustParticles, st.burstParticles);
      drawSurfaceTrails(ctx, st.racers);
      const focusFactor = st.focusFadeProgress ?? 0;
      const livePulkGroup =
        focusFactor > 0 ? (camDirRef.current?._detectPulkGroup?.(st.racers) ?? null) : null;
      drawRacers(
        ctx,
        st,
        racerTypeRef.current,
        cameraConfigRef.current.tagVisibleMaxCount,
        cameraConfigRef.current.battleFocusDarkening,
        camDirRef.current?.hudState ?? null,
        camDirRef.current?.comebackLockedRacerIndex ?? null,
        focusFactor,
        livePulkGroup,
        showRpStartRowCfg,
        assignmentByRacer,
        frameDisplayScale,
        frameEffZoom,
        renderAlpha,
        frameTimingConfig.renderInterpolation
      );
      drawBattleDiagMarkers(
        ctx,
        st,
        camDirRef.current?.hudState ?? null,
        cam,
        frameEffZoom,
        renderAlpha,
        frameTimingConfig.renderInterpolation,
        isOpenTrack,
        bsY,
        leaderDiagRef.current
      );
      ctx.restore();
      if (isOpenTrack) {
        drawTitleOpen(ctx, raceData);
      } else {
        drawTitle(ctx, shape, raceData);
        drawLapInfo(ctx, st.racers, st.maxLaps);
        drawFinalLapOverlay(ctx, ts, st.finalLapStartTs);
      }

      // ── Phase overlays ──
      if (st.phase === PHASE.COUNTDOWN) {
        setCountdown(drawCountdownOverlay(ctx, ts - st.countdownStart));
      } else if (st.phase === PHASE.FINISHED) {
        drawFinishedOverlay(ctx);
      }

      // ── Race Plan status badge (top-right, dev/sightcheck aid) ──────────────
      if (racePlanController && st.phase !== PHASE.COUNTDOWN) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(CANVAS_W - 172, 8, 164, 22);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText(`Race Plan: ON  seed:${racePlanSeed}`, CANVAS_W - 168, 24);
        ctx.restore();
      }

      // ── PiP minimap (RACING and FINISHED only) ──
      if (st.phase !== PHASE.COUNTDOWN) {
        const leaderIdx = st.racers.reduce((best, r, i) => (r.t > st.racers[best].t ? i : best), 0);
        const minimapHighlights =
          showRpMinimapBadgesCfg && rpPlanInfo ? rpPlanInfo.b1Indices : null;
        renderMinimap(ctx, shape, st.racers, leaderIdx, CANVAS_W, CANVAS_H, minimapHighlights);
      }

      // Perf-log bracket 5: after all drawing — record the completed frame.
      if (enablePerfLog && perfLogRef.current) {
        recordPerfFrame(
          perfLogRef.current,
          ts,
          rawDt,
          t0,
          tPhys,
          tPreCam,
          tCam,
          performance.now(),
          st.racers.length
        );
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(finishNavTimerRef.current);
      for (const inst of effectsRef.current) inst.destroy?.();
      effectsRef.current = [];
    };
    // enablePerfLog / showCameraDiagnostics come from cameraConfig, which is frozen
    // at mount (useState init, no setter). Adding them to deps would restart the whole
    // race loop (cancel rAF, destroy effects, re-init) if a setter is ever introduced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceData]);

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
          {activeBrand?.logo && (
            <img
              src={activeBrand.logo}
              alt=""
              className="race-brand-logo-sm"
              style={{ opacity: activeBrand.logoOpacity ?? 0.9 }}
            />
          )}
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
        {activeBrand?.logo && (
          <img
            src={activeBrand.logo}
            alt=""
            className="race-brand-logo-sm"
            style={{ opacity: activeBrand.logoOpacity ?? 0.9 }}
          />
        )}
        {activeBrand?.eventName && (
          <div className="race-loading-event">{activeBrand.eventName}</div>
        )}
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div ref={screenRef} className="screen screen--race">
      <div className="race-layout">
        <div className="race-canvas-wrapper">
          <canvas
            ref={bgCanvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          />
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="race-canvas"
            style={{ position: 'relative' }}
          />
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
          <PerfLogHUD perfLogRef={perfLogRef} visible={enablePerfLog} />
          <BattleDiagHUD cameraRef={camDirRef} racersRef={g} visible={showBattleDiag} />
          <ComebackDiagHUD cameraRef={camDirRef} racersRef={g} visible={showComebackDiag} />
          <LeadChangeDiagHUD cameraRef={camDirRef} visible={showLeadChangeDiag} />
          <RacePlanHUD
            diagRef={diagDataRef}
            showWinnerList={showRpWinnerList}
            showSpeedMonitor={showTop10SpeedMonitor}
          />
          <BrandLogoOverlay />
        </div>

        <aside className="race-hud">
          <button
            className="race-back-btn"
            onClick={() => {
              sessionStorage.removeItem('activeRace');
              fadeNavigate('/setup');
            }}
          >
            ← Setup
          </button>

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
                <span className="sb-name" style={{ color: RANK_PALETTE[i] ?? '#ddd' }}>
                  {r.name}
                </span>
                {r.finished && r.finishTimeMs != null && (
                  <span className="sb-finish-time">{formatRaceTime(r.finishTimeMs)}</span>
                )}
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
        </aside>
      </div>
    </div>
  );
}
