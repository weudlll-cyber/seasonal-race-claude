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
  drawLapInfo,
  drawFinalLapOverlay,
  drawCountdownOverlay,
  drawFinishedOverlay,
} from './drawing/overlayRendering.js';
import { emitBurst, drawParticles, drawSurfaceTrails } from './drawing/particleRendering.js';
import { computeTagLayout, tagFontScreenPx } from './nameTagLayout.js';
import { drawRacers } from './drawing/racerRendering.js';
import { formatRaceTime } from '../../utils/formatRaceTime.js';
import { lerp, lerpAngle } from '../../utils/mathUtils.js';
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
import { lapProgress } from '../../modules/camera/lapUtils.js';
import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { normalSpeedFrom, MIN_LAPS } from '../../modules/durationModel.js';
import { createRaceFromIdentity, stepRacePhysics } from '../../modules/raceCore.js';
import { loadRaceBehaviorConfig } from '../../modules/raceBehaviorConfig.js';
import { computeRacerLayout, computeBodyNarrowRef } from '../../modules/rowLayout.js';
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
  getEffectiveMaxTargetScreenPx,
} from '../../modules/autoSpriteScale.js';
import { loadCameraConfig, cameraConfigProvenance } from '../../modules/cameraConfig.js';
import { configFingerprintBadge, buildWorldConfig } from '../../modules/exportRaceConfig.js';
import { buildCameraMarker, configDiffWithValues } from '../../modules/camera/cameraMarker.js';
import { DEFAULT_CONFIG_WORLD } from '../../modules/storage/defaults.js';
import CameraStateHUD from './CameraStateHUD.jsx';
import CameraDiagnosticsHUD from './CameraDiagnosticsHUD.jsx';
import RacePlanHUD from './RacePlanHUD.jsx';
import CameraFrameLogHUD from './CameraFrameLogHUD.jsx';
import CameraMarkerHUD from './CameraMarkerHUD.jsx';
import PerfLogHUD from './PerfLogHUD.jsx';
import { createPerfLog, recordPerfFrame } from './perfLog.js';
import StateOverlay from './StateOverlay.jsx';
import BattleDiagHUD from './BattleDiagHUD.jsx';
import ComebackDiagHUD from './ComebackDiagHUD.jsx';
import GovernorDiagHUD from './GovernorDiagHUD.jsx';
import LeadChangeDiagHUD from './LeadChangeDiagHUD.jsx';
import {
  selectOverlayText,
  selectOverlayTextNoRepeat,
  selectWinnerText,
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

export default function RaceScreen() {
  const fadeNavigate = useFadeNavigate();
  const fadeNavRef = useRef(fadeNavigate);
  // eslint-disable-next-line react-hooks/refs
  fadeNavRef.current = fadeNavigate; // inline render-body sync — no extra effect, no queue shift
  const canvasRef = useRef(null);
  // CAMERA-TAGS-1: the set of racer indices that carried a name tag last frame.
  const tagIncumbentsRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const screenRef = useRef(null);
  const rafRef = useRef(null);
  const finishNavTimerRef = useRef(null);

  const g = useRef(null);
  // Live governor cfg + resolved phase-binding snapshot for GovernorDiagHUD (read-only).
  const governorDiagRef = useRef(null);
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
  // CAMERA-REPRO-1: the marker's window into the running race. `markerBuildRef.current` is installed
  // by the race-init effect and returns the marker for the CURRENT frame; the HUD calls it on M.
  // A ref (not props) so pressing M costs the race loop nothing and re-renders nothing.
  const markerBuildRef = useRef(null);

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
  const [camAnchor, setCamAnchor] = useState(null); // CAMERA-FOCUS-1: dev-HUD pan-anchor racer label
  const prevCamAnchorRef = useRef(null);
  const truthEntryLoggedRef = useRef(false); // CAMERA-FOCUS-4: one-shot observer-phase log per race
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
  const showGovernorDiag = cameraConfig.showGovernorDiag ?? false;
  const showLeadChangeDiag = cameraConfig.showLeadChangeDiag ?? false;

  // ── State-overlay narrative text ─────────────────────────────────────────
  const [overlayText, setOverlayText] = useState(null);
  const overlayTimerRef = useRef(null);
  // 15a-predictive: persistent winner-text channel. Separate from overlayText — NOT touched by the
  // [camState, phase] state-overlay effect and NOT auto-cleared by stateOverlayDurationMs, so it
  // survives the PHOTO_FINISH→FINISH_OVERVIEW change and holds until race end / new race.
  const [winnerOverlayText, setWinnerOverlayText] = useState(null);
  const winnerTextFiredRef = useRef(false); // once-latch: winner text fires exactly once per race
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

  // 15a-predictive: the persistent winner text survives FINISH_OVERVIEW (still RACING) and is
  // cleared only when the race phase ends (leaderboard / navigation) — never by the effect above.
  useEffect(() => {
    if (phase !== PHASE.RACING) {
      setWinnerOverlayText(null);
      winnerTextFiredRef.current = false;
    }
  }, [phase]);

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
    // 'low' (was 'high'): the 40 racer sprites are rotated + downscaled 128px→~40px blits/frame;
    // 'high' forces expensive per-pixel resampling on every one. 'low' uses a cheaper sampler —
    // imperceptible on small fast-moving sprites. Smoothing stays ENABLED (default). See perf HUD.
    ctx.imageSmoothingQuality = 'low';
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

    const behaviorConfig = loadRaceBehaviorConfig();
    behaviorConfig.isOpen = isOpenTrack;
    const rowConfig = loadRowLayoutConfig();
    const dynamicsConfig = loadRaceDynamicsConfig();
    const frameTimingConfig = loadFrameTimingConfig();

    // Config-fingerprint badge (fix-plan step 4): short world hash + how many config keys are off the
    // shipped defaults. Race-constant, computed once here; drawn under the seed badge in the loop below.
    // CAMERA-REPRO-1 reuses the SAME world snapshot for the marker's config diff — one gather, so the
    // badge and the marker can never disagree about what this race was configured with.
    const cfgWorld = buildWorldConfig();
    const cfgBadge = configFingerprintBadge(cfgWorld);
    const cfgDiff = configDiffWithValues(cfgWorld.configs, DEFAULT_CONFIG_WORLD);

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
    // is the camera's body-size reference for OVERVIEW-FRAMING-1's sprite floor.
    const drawnBodyWidthRefPx = displaySize * displaySizeScale;

    // ── The REAL race init, extracted to modules/raceCore.js (createRaceFromIdentity) ───────────
    // The canonical duration model, the seeded physics stream (raceRng), the row layout, the re-roll
    // schedule, every racer's physics fields, the Race Plan controller and the phase-split / director
    // config are all built there now — so the browser and the headless golden harness run the SAME
    // code. RaceScreen stays the renderer: it augments each physics racer with render-only fields
    // below and drives stepRacePhysics() from its rAF accumulator. Byte-identical to the former inline
    // init — the physics draw order (row shuffle → per-racer spreadFactor + roll jitter → re-rolls)
    // and every scalar are unchanged; the code merely moved.
    const normalSpeedPxPerSec = normalSpeedFrom(baseSpeedConfig);
    const racePlanSeed = raceData.racePlanSeed ?? 0;
    const pathLengthPx = geometry.pathLengthPx ?? 0;
    const race = createRaceFromIdentity({
      shape: shapeRef.current,
      isOpenTrack,
      pathLengthPx,
      trackWidthPx,
      speedMultiplier,
      baseSpeedConfig,
      behaviorConfig,
      rowConfig,
      dynamicsConfig,
      normalSpeedPxPerSec,
      laps: raceData.targetLaps ?? MIN_LAPS,
      requestedSeconds: raceData.targetDurationSec ?? raceData.targetDuration ?? 60,
      nRacers,
      racePlanSeed,
      racePlanEnabledFlag: !!raceData.racePlanEnabled,
      physicalSpriteSize,
      drawnBodyWidthRefPx,
      bodyFillNarrow,
      bodyFillLong,
      constSpeedActive,
    });
    const raceState = race.state;
    const raceCfg = race.config;
    const raceMeta = race.meta;
    const computePositions = race.computePositions;
    // finishT / maxLaps / realizedDurationSec / race_baseSpeed live on raceState / raceCfg and are read
    // through st.* below; no local aliases needed. The render/diag reads keep the rest.
    const rowLayout = raceMeta.rowLayout;
    const assignmentByRacer = raceMeta.assignmentByRacer;
    const lastRollDeadline = raceMeta.lastRollDeadline;
    const racePlanEnabled = raceMeta.racePlanEnabled;
    const racePlanController = raceMeta.racePlanController;
    const rpPlanInfo = raceMeta.rpPlanInfo;
    const govFractions = raceMeta.govFractions;
    const govSeed = raceMeta.govSeed;
    const govMeanBodyLen = raceMeta.govMeanBodyLen;
    const pulkLeadRotationOn = raceMeta.pulkLeadRotationOn;

    camDirRef.current = new CameraDirector(
      worldWidth,
      worldHeight,
      isOpenTrack,
      cameraConfig,
      drawnBodyWidthRefPx,
      shapeRef.current,
      // CAMERA-ZOOM-UNIT-1: the corridor width every zoom setting is expressed in — the SAME
      // number the physics uses (geometry.width, spline estimate only for tracks without one).
      trackWidthPx
    );
    // CAMERA-REPRO-1: the camera makes its OWN random draws (which state to cut to, when the next
    // OVERVIEW is due). Unseeded, the same race shows a different camera every time — which is why
    // "it looked wrong at 40 s" could never be handed to anyone. Draw ONE seed per race from
    // Math.random, exactly as random as before, and give it to the director: the race stays as
    // unpredictable as it always was, and the drawn seed travels in the marker so a marked moment
    // can be stood in again. This mirrors the Quick-Test seed rule (drawn, not fixed, then shown).
    const cameraRandomSeed = (Math.random() * 0x7fffffff) >>> 0 || 1;
    camDirRef.current.setRandomSeed(cameraRandomSeed);
    // CAMERA-FOCUS-4 LIVE TRUTH — print, at every race start, exactly which build + camera path this
    // browser is running: short commit · RESOLVED transition grammar · leader forward-frac · stored schema
    // per-key source (stored vs default) for the two FOCUS-3 keys. Reload once and paste this to
    // settle any stale-bundle / stale-config ghost hunt in a single glance. This line stays forever.
    {
      const commit = typeof __RA_COMMIT__ !== 'undefined' ? __RA_COMMIT__ : 'dev';
      const prov = cameraConfigProvenance();
      // eslint-disable-next-line no-console
      console.info(
        `[RA CAMERA LIVE TRUTH] commit=${commit} ` +
          `resolvedGrammar=${camDirRef.current.transitionGrammar} ` +
          `leaderForwardFrac=${camDirRef.current.leaderForwardFrac ?? 'null'} ` +
          `hadStoredConfig=${prov.hadStored} ` +
          `source{cameraTransitionGrammar}=${prov.sources.cameraTransitionGrammar} ` +
          `source{leaderForwardFrac}=${prov.sources.leaderForwardFrac} ` +
          `cameraSeed=${cameraRandomSeed} ` +
          `(observerPhase logged on first anchored entry · press M to mark a moment)`
      );
      truthEntryLoggedRef.current = false;
    }

    // CAMERA-REPRO-1: the ONE frame snapshot the marker reads. Written at the end of every rAF frame
    // with the values the RENDERER committed — never recomputed later from other inputs, because a
    // marker that re-derives its own numbers would describe a frame that was never drawn.
    // One pre-allocated object, four number writes per frame.
    const markerFrame = { ts: 0, effZoomX: 1, effZoomY: 1, camZoom: 1, offsetX: 0, offsetY: 0 };
    markerBuildRef.current = () => {
      const st = g.current;
      const cd = camDirRef.current;
      if (!st || !cd || st.phase !== PHASE.RACING) return null;
      return buildCameraMarker({
        raceData,
        raceState: st,
        cameraSeed: cameraRandomSeed,
        physicsTs: st.physicsTs,
        camMs: st.raceStart != null ? markerFrame.ts - st.raceStart : 0,
        frameLogIdx: cd.diagEnabled ? cd.diagFrameCount : null,
        logs: {
          frame: !!cameraConfigRef.current.enableFrameLog,
          detour: !!cameraConfigRef.current.cameraDetourLog,
        },
        shot: {
          state: cd.hudState,
          lerpPhase: cd.lerpPhase,
          observerPhase: cd.observerPhase,
          zoom: markerFrame.camZoom,
          offsetX: markerFrame.offsetX,
          offsetY: markerFrame.offsetY,
          targetZoom: cd.targetZoom,
          targetOffsetX: cd.targetOffsetX,
          targetOffsetY: cd.targetOffsetY,
          camT: cd.camT,
          effZoomX: markerFrame.effZoomX,
          effZoomY: markerFrame.effZoomY,
          anchor: cd.anchorRacerLabel,
        },
        cfg: {
          fingerprint: cfgBadge.hashShort,
          diff: cfgDiff,
          racerTypeOverrides: cfgWorld.racerTypeOverrides,
        },
        build: typeof __RA_COMMIT__ !== 'undefined' ? __RA_COMMIT__ : 'dev',
        at: new Date().toISOString(),
      });
    };
    // Ensure surface-class registry has the latest cached server data (before trail emitters resolve).
    // Code defaults are always present; this picks up any user-defined overrides.
    loadServerClasses(getCachedServerSurfaceClasses());
    const trackSurfaceClasses = raceData.trackSurfaceClasses ?? [];

    overlayUsedBattleIndicesRef.current.clear();
    overlayUsedComebackIndicesRef.current.clear();
    overlayUsedLeadChangeIndicesRef.current.clear();
    // 15a-predictive: reset the persistent winner-text channel for the new race.
    winnerTextFiredRef.current = false;
    setWinnerOverlayText(null);

    // ── Augment the extracted physics racers with render-only fields (icon/colour/coat/pattern/
    // trail/emitter). Done IN PLACE so the render array and the physics array stepRacePhysics mutates
    // are the SAME objects. `for (k in src) if (!(k in r))` copies the roster's display fields without
    // ever overwriting a physics field — reproducing the former `{ ...r, ...physics }` spread exactly.
    // None of these draw from raceRng (coat/pattern hash the name), so the physics stream is untouched.
    for (let i = 0; i < raceState.racers.length; i++) {
      const r = raceState.racers[i];
      const src = raceData.racers[i];
      for (const k in src) if (!(k in r)) r[k] = src[k];
      r.icon = trackEmoji ?? src.icon;
      r.color = RACER_COLORS[i % RACER_COLORS.length];
      r.coatId = getCoatsByType(typeId) ? assignCoat(src.name, getCoatsByType(typeId)) : undefined;
      r.patternId = assignPattern(src.name, PATTERN_IDS);
      r.trail = [];
      // VRE-4: one emitter instance per racer (stateful generators must not be shared)
      r.surfaceEmitter = resolveTrailEmitter(racerType, trackSurfaceClasses);
      r.surfaceParticles = [];
    }

    // g.current IS the extracted physics state (racers, finishT, maxLaps, finishedCount, raceProgress,
    // physicsTs) with the render/phase fields added on top — one object, so stepRacePhysics and the
    // renderer share it.
    g.current = Object.assign(raceState, {
      phase: PHASE.COUNTDOWN,
      countdownStart: null,
      raceStart: null,
      lastTs: null,
      physicsAccum: 0,
      smoothDt: 16,
      slowmoFadeProgress: 0,
      slowmoActive: false,
      slowmoStartWallTs: 0,
      slowmoIsPhotoFinish: false, // 15a-predictive: PHOTO_FINISH slowmo (releases without min-duration)
      slowmoTs: null,
      focusFadeProgress: 0,
      dustParticles: [],
      burstParticles: [],
      finalLapStartTs: null,
    });

    // ── Config flags for canvas-loop use ────────────────────────────────────
    const showRpMinimapBadgesCfg = cameraConfigRef.current.showRpMinimapBadges ?? false;
    const showRpStartRowCfg = cameraConfigRef.current.showRpStartRow ?? false;

    // Camera/diag-only Race-Plan bindings (the controller + plan info come from the extracted core).
    let cameraPlanDelivered = false; // B4a: deliver the authored cameraPlan once, mid-race (heroes cast then)
    const speedRings = new Map();
    // Inject B1-racer set into CameraDirector for COMEBACK detection (controller + plan info come
    // from the extracted core; the createRacePlan / director / phase-split setup all live there now).
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

    // computePositions() is the extracted core's closure (race.computePositions above) — RaceScreen's
    // open-track perp-projection, verbatim. Bound to g.current (=raceState) so it and stepRacePhysics
    // write the same racer array.

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
      // Perf-log pace counters for this frame (read-only mirrors of the physics
      // accumulator; 0 on non-RACING frames). Fed into recordPerfFrame when enablePerfLog is on.
      let hudPhysSteps = 0;
      let hudPhysAdvancedMs = 0;
      let hudPhysAccumMs = 0;
      let hudCapHit = 0;
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
        // Re-Roll config constants (lastRollDeadline/spreadRange/halfWidth) moved into the extracted
        // core (raceCfg); lastRollDeadline is still bound above from raceMeta for the diag readout.
        // D4: snapshot t before all physics steps so constSpeed can equalize deltas. The constSpeed
        // `_diagPrevT` snapshot stays here (per-rAF, matching legacy cadence); stepRacePhysics reads it.
        for (const r of st.racers) r._diagLogPrevT = r.t;
        if (constSpeedActive) {
          for (const r of st.racers) r._diagPrevT = r.t;
        }
        // ── BATTLE slowmo ────────────────────────────────────────────────────
        // Slows down physics (and sprite animation) during BATTLE_ZOOM.
        // Camera path (smoothDt) is intentionally unaffected.
        {
          const hud = camDirRef.current?.hudState;
          const isBattleZoom = hud === 'BATTLE_ZOOM';
          // 15a: the photo-finish shot reuses the same slow-motion path as BATTLE (uniform,
          // global time-dilation — headless sim is sim-time based, fairness unaffected).
          const isPhotoFinish = hud === 'PHOTO_FINISH';
          const isSlowmoState = isBattleZoom || isPhotoFinish;
          const smFactor = isPhotoFinish
            ? (cameraConfigRef.current.photoFinishSlowmoFactor ?? 0.5)
            : (cameraConfigRef.current.battleSlowmoFactor ?? 0.5);
          const smMinDurMs = (cameraConfigRef.current.battleSlowmoMinDuration ?? 2.0) * 1000;
          const smFadeDurMs = (cameraConfigRef.current.battleSlowmoFadeDuration ?? 0.3) * 1000;
          if (isSlowmoState && !st.slowmoActive) {
            st.slowmoActive = true;
            st.slowmoStartWallTs = ts;
            st.slowmoIsPhotoFinish = isPhotoFinish;
          }
          if (!isSlowmoState && st.slowmoActive) {
            // 15a-predictive: a PHOTO_FINISH slowmo releases IMMEDIATELY when the shot ends
            // (state left PHOTO_FINISH on the 2nd crossing) so normal speed returns for the
            // zoom-out. BATTLE slowmo keeps its min-duration guard unchanged.
            const releaseOk = st.slowmoIsPhotoFinish || ts - st.slowmoStartWallTs >= smMinDurMs;
            if (releaseOk) {
              st.slowmoActive = false;
              st.slowmoIsPhotoFinish = false;
            }
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
        // Perf-log pace: physicsTs before the loop, so step count = (Δ physicsTs)/FIXED_DT (read-only).
        const _physicsTsBeforeLoop = st.physicsTs;
        let _catchupSteps = 0;
        while (st.physicsAccum >= FIXED_DT && _catchupSteps++ < 2) {
          // ── THE per-step advance — extracted to raceCore.stepRacePhysics (RaceScreen order) ──
          // Advances st.physicsTs by FIXED_DT and mutates every racer (leader progress →
          // controller.update → trajectoryMult transition → PulkLeadRotation → per-racer re-roll +
          // advance → computePositions → applyRacerBehavior → finish detection + lap). Byte-identical
          // to the code that lived inline here; the render/camera/diag reads below consume its output.
          stepRacePhysics(st, raceCfg);
          const physicsTs = st.physicsTs;

          // Burst particles for racers that crossed the line THIS step (render-only; the finish
          // detection itself now lives in stepRacePhysics, so we key on finishTimeMs === physicsTs).
          for (const r of st.racers) {
            if (r.finished && r.finishTimeMs === physicsTs) emitBurst(st.burstParticles, r.x, r.y);
          }

          // B4a: deliver the authored cameraPlan to the CameraDirector once it exists (heroes are cast
          // mid-race inside controller.update, so it is null at race start). Camera-only.
          if (racePlanController && !cameraPlanDelivered) {
            const cp = racePlanController.getCameraPlan?.();
            if (cp) {
              camDirRef.current?.setCameraPlan(cp);
              cameraPlanDelivered = true;
            }
          }

          // Resolved phase — feeds the always-on GovernorDiagHUD phase readout. Pure getPhase; no physics.
          const govPhase = racePlanController
            ? racePlanController.getPhase(physicsTs, st.raceProgress)
            : null;

          // ── GovernorDiagHUD snapshot — ONE write site, EVERY frame a plan runs. Read-only; touches
          // nothing but the diag ref. heroRoles = the retained index→role map (null until heroes cast).
          if (racePlanController && govFractions) {
            const diagCfg = pulkLeadRotationOn
              ? { directorEnabled: true, pulkOnly: true } // lead-rotation: PULK-scoped, active in PULK
              : { directorEnabled: false };
            governorDiagRef.current = {
              cfg: diagCfg,
              phase: govPhase,
              progress: st.raceProgress,
              pulkStartFrac: govFractions.pulkStartFrac,
              pulkEndFrac: govFractions.pulkEndFrac,
              corrStartFrac: govFractions.corrStartFrac,
              seed: govSeed,
              finishT: st.finishT,
              pathLengthPx,
              meanBodyLen: govMeanBodyLen,
              isOpen: isOpenTrack,
              heroRoles: racePlanController.getHeroRoles?.() ?? null,
            };
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
        // Perf-log pace read-out (read-only; does not touch the accumulator/cap).
        // Steps actually run = Δ physicsTs / FIXED_DT. capHit = the cap was reached AND backlog
        // ≥ FIXED_DT still remains (physics wanted another step but the < 2 cap starved it).
        if (enablePerfLog) {
          hudPhysSteps = (st.physicsTs - _physicsTsBeforeLoop) / FIXED_DT;
          hudPhysAdvancedMs = hudPhysSteps * FIXED_DT;
          hudPhysAccumMs = st.physicsAccum;
          hudCapHit = st.physicsAccum >= FIXED_DT ? 1 : 0;
        }
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
              // Surface-class trail: each racer drives its own emitter. spawn appends new
              // particles IN PLACE into r.surfaceParticles and update advances/compacts it
              // in place (swap-remove) — no per-frame array/object churn, array identity kept.
              r.surfaceEmitter.spawn(r.surfaceParticles, spawnX, spawnY, r.baseSpeed, r.angle, ts);
              r.surfaceEmitter.update(r.surfaceParticles, dtFrames);
            } else {
              // native trail fallback: trailFactory-based particles pooled globally
              st.dustParticles.push(
                ...rt.getTrailParticles(spawnX, spawnY, r.baseSpeed, r.angle, ts)
              );
            }
          }
        }
        // Advance native trail dustParticles — in-place mutation + swap-remove (no allocation).
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
      const prevHudState = prevHudStateRef.current; // capture before the sync overwrites it
      if (newHudState !== prevHudStateRef.current) {
        prevHudStateRef.current = newHudState;
        setCamState(newHudState);
      }
      // CAMERA-FOCUS-1: sync the dev-HUD pan-anchor label (re-renders only when the anchor racer changes).
      const newAnchor = camDirRef.current.anchorRacerLabel;
      if (newAnchor !== prevCamAnchorRef.current) {
        prevCamAnchorRef.current = newAnchor;
        setCamAnchor(newAnchor);
      }
      // CAMERA-FOCUS-4 LIVE TRUTH: on the FIRST anchored-state entry, log the resolved observer phase once.
      // grammar 'cut' promotes it to 'follow' on entry; 'legacy' leaves it 'idle' until the entry glide
      // converges — so this single value tells the owner which pan path his browser actually ran.
      if (
        !truthEntryLoggedRef.current &&
        (newHudState === 'LEADER_ZOOM' ||
          newHudState === 'BATTLE_ZOOM' ||
          newHudState === 'COMEBACK_ZOOM' ||
          newHudState === 'LEAD_CHANGE')
      ) {
        truthEntryLoggedRef.current = true;
        // eslint-disable-next-line no-console
        console.info(
          `[RA CAMERA LIVE TRUTH] first anchored entry: state=${newHudState} ` +
            `observerPhase=${camDirRef.current.observerPhase} grammar=${camDirRef.current.transitionGrammar} ` +
            `(expect observerPhase='follow' when grammar='cut')`
        );
      }
      // 15a-predictive winner text: fire ONCE the winner has crossed during the photo-finish shot.
      // Scoped to the photo-finish only: fire while hudState IS 'PHOTO_FINISH', OR on the frame the
      // shot resolves AWAY from it (prevHudState was 'PHOTO_FINISH') so a 0→2 same-frame end can't
      // lose the text. finishedCount>=1 covers 0→1 and 0→2; the ref latch guarantees a single fire.
      // Deterministic per race via racePlanSeed. Set on the persistent channel (no auto-clear).
      if (
        (newHudState === 'PHOTO_FINISH' || prevHudState === 'PHOTO_FINISH') &&
        !winnerTextFiredRef.current &&
        st.finishedCount >= 1
      ) {
        winnerTextFiredRef.current = true;
        const w = raceState.winner;
        const name = w?.name ?? w?.id ?? null;
        if (name) {
          const res = selectWinnerText('PHOTO_FINISH_WINNER', { name }, racePlanSeed);
          if (res) setWinnerOverlayText(res.text);
        }
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
      // zoom — closer = bigger — with a readability floor so a racer is never drawn
      // too small to recognise (CAMERA-MIN-DRAW-1).
      //
      // frameEffZoom is the raw canvas scale (cam.zoom×bsX closed, BASE×cam.zoom open).
      // It's used by labels/trail (via 1/frameEffZoom) to stay constant screen-size.
      const frameEffZoom = isOpenTrack
        ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM)
        : cam.zoom * bsX;
      // CAMERA-REPRO-1: hand the marker the values this frame is about to draw with. BOTH axis
      // scales — the ctx.scale() below is (zoom×bsX, zoom×bsY) on a closed track, and those differ
      // whenever the world is not 16:9.
      markerFrame.ts = ts;
      markerFrame.effZoomX = frameEffZoom;
      markerFrame.effZoomY = isOpenTrack ? frameEffZoom : cam.zoom * bsY;
      markerFrame.camZoom = cam.zoom;
      markerFrame.offsetX = cam.offsetX;
      markerFrame.offsetY = cam.offsetY;
      // CAMERA-MIN-DRAW-1: the readability FLOOR is back, as a fraction of the frame — never draw a
      // racer too small to recognise. It is a bound on THIS multiplication and nothing else; the
      // camera above has already chosen its zoom without ever reading the value.
      const frameDisplayScale = computeRenderDisplayScale(
        displaySize,
        displaySizeScale,
        frameEffZoom,
        getEffectiveMaxTargetScreenPx(
          racerTypeRef.current?.config?.maxTargetScreenPx,
          cameraConfigRef.current.maxTargetScreenPx
        ),
        cameraConfigRef.current.minDrawnFrameFrac,
        canvas.height
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
      drawParticles(ctx, st.dustParticles, st.burstParticles);
      drawSurfaceTrails(ctx, st.racers);
      const focusFactor = st.focusFadeProgress ?? 0;
      const livePulkGroup =
        focusFactor > 0 ? (camDirRef.current?._detectPulkGroup?.(st.racers) ?? null) : null;
      // ── CAMERA-TAGS-1: WHICH names are drawn, decided in SCREEN space before anything is drawn ──
      // Eligibility is "on canvas"; label-vs-label occlusion decides the rest, so the count is an
      // output. The START-FORMATION exception shows every name through the countdown and for
      // `nameTagAllUntilMs` after the gun — the owner's requirement, so a spectator can find their
      // racer once. `tagIncumbentsRef` carries last frame's set: a label already on screen is
      // offered its pixels first, which is what keeps the layout from churning (Lesson 190).
      const tagFontPx = tagFontScreenPx(cameraConfigRef.current.nameTagFrameFrac, canvas.height);
      const raceElapsedMs = st.raceStart != null ? ts - st.raceStart : 0;
      const showAllTags =
        st.phase !== PHASE.RACING ||
        raceElapsedMs < (cameraConfigRef.current.nameTagAllUntilMs ?? 0);
      ctx.save();
      ctx.font = `bold ${tagFontPx}px sans-serif`;
      const measureTagText = (txt) => ctx.measureText(txt).width;
      const tagLayout = computeTagLayout({
        racers: st.racers,
        effX: frameEffZoom,
        effY: markerFrame.effZoomY,
        offsetX: cam.offsetX,
        offsetY: cam.offsetY,
        canvasW: canvas.width,
        canvasH: canvas.height,
        fontPx: tagFontPx,
        measureText: measureTagText,
        showAll: showAllTags,
        incumbents: tagIncumbentsRef.current,
        labelOf: (r) =>
          showRpStartRowCfg
            ? r.name + ' (R' + (assignmentByRacer.get(r.index)?.rowIndex ?? 0) + ')'
            : r.name,
      });
      ctx.restore();
      tagIncumbentsRef.current = tagLayout.shown;

      drawRacers(
        ctx,
        st,
        racerTypeRef.current,
        tagLayout,
        cameraConfigRef.current.battleFocusDarkening,
        camDirRef.current?.hudState ?? null,
        camDirRef.current?.comebackLockedRacerIndex ?? null,
        focusFactor,
        livePulkGroup,
        showRpStartRowCfg,
        assignmentByRacer,
        frameDisplayScale,
        frameEffZoom,
        markerFrame.effZoomY,
        tagFontPx,
        renderAlpha,
        frameTimingConfig.renderInterpolation,
        cameraConfigRef.current.highlightHeroes ?? false,
        dynamicsConfig.gapRerollDevMarker ?? false
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

      // ── Top-right HUD info pills (race-plan/seed + config-fingerprint) ──────────────
      // Each row is a pill that HUGS its text: the label sits INSIDE the block, left-aligned and
      // vertically centered, with the block right-anchored so the two rows line up. The explicit
      // textAlign/textBaseline are REQUIRED — earlier render helpers (racer name tags, overlays)
      // leave the shared context at textAlign='center'/'right', which previously pushed these labels
      // out to the LEFT of their bars. One helper draws both rows so they can never drift apart.
      const HUD_PILL_RIGHT = CANVAS_W - 8;
      const drawHudPill = (label, y, h, bg, fg, fontPx) => {
        ctx.save();
        ctx.font = `${fontPx}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const pad = 8;
        const w = Math.ceil(ctx.measureText(label).width) + pad * 2;
        const x = HUD_PILL_RIGHT - w;
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = fg;
        ctx.fillText(label, x + pad, y + h / 2 + 0.5);
        ctx.restore();
      };

      // Row 1 — Race Plan status (dev/sightcheck aid). Truthful label: with a seed > 0 the number is
      // the seed of the plan AND the dynamics (the race replays exactly); at 0 nothing is seeded.
      if (racePlanController && st.phase !== PHASE.COUNTDOWN) {
        const label =
          racePlanSeed > 0 ? `Race Plan: ON  seed:${racePlanSeed}` : 'Race Plan: ON  unseeded';
        drawHudPill(label, 8, 22, 'rgba(0,0,0,0.65)', '#4fc3f7', 11);
      }

      // Row 2 — config-fingerprint badge (fix-plan step 4). RED means "NOT apples-to-apples with a
      // default-config sim run" — that is RACE-relevant drift only. Cosmetic (camera / frame-timing)
      // drift is reported quietly and never turns the badge red. `hashShort` is the race-relevant world
      // hash, comparable 1:1 to a sim invocation's identity.
      if (st.phase !== PHASE.COUNTDOWN) {
        const off = cfgBadge.raceCount > 0;
        const label =
          cfgBadge.raceCount === 0 && cfgBadge.cosmeticCount === 0
            ? `cfg ${cfgBadge.hashShort} · defaults`
            : `cfg ${cfgBadge.hashShort} · ${cfgBadge.raceCount} race / ${cfgBadge.cosmeticCount} cosmetic`;
        drawHudPill(
          label,
          34,
          20,
          off ? 'rgba(120,20,20,0.82)' : 'rgba(0,0,0,0.5)',
          off ? '#ff8a80' : '#9e9e9e',
          10
        );
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
          st.racers.length,
          hudPhysSteps,
          hudPhysAdvancedMs,
          hudPhysAccumMs,
          hudCapHit
        );
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      // No global RNG to restore — the race stream is the local `raceRng` above (parity step 1),
      // so `Math.random` was never swapped and the rest of the app stays non-deterministic.
      cancelled = true;
      markerBuildRef.current = null; // CAMERA-REPRO-1: no markers from a torn-down race
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
          <CameraStateHUD
            camState={camState}
            anchorLabel={camAnchor}
            visible={showCameraStateHud}
          />
          {/* Winner text (persistent) takes precedence over the transient state overlay — one banner. */}
          <StateOverlay text={winnerOverlayText ?? overlayText} />
          <CameraDiagnosticsHUD
            cameraRef={camDirRef}
            diagRef={diagDataRef}
            leaderDiagRef={leaderDiagRef}
            visible={showCameraDiagnostics}
            showRpDiag={showRpDiag}
          />
          <CameraFrameLogHUD cameraRef={camDirRef} visible={enableFrameLog} />
          <CameraMarkerHUD buildRef={markerBuildRef} />
          <PerfLogHUD perfLogRef={perfLogRef} visible={enablePerfLog} />
          <BattleDiagHUD cameraRef={camDirRef} racersRef={g} visible={showBattleDiag} />
          <ComebackDiagHUD cameraRef={camDirRef} racersRef={g} visible={showComebackDiag} />
          <GovernorDiagHUD
            racersRef={g}
            governorDiagRef={governorDiagRef}
            visible={showGovernorDiag}
          />
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
