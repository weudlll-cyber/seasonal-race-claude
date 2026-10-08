// ============================================================
// File:        index.jsx
// Path:        client/src/screens/RaceScreen/index.jsx
// Project:     RaceArena
// Created:     2026-04-20
// Description: Live race canvas with scrolling camera (open tracks),
//              TV camera director (closed tracks), multi-lap support,
//              fullscreen toggle, and fade-to-black navigation.
//
// ★ WHAT THIS FILE OWNS SINCE P4-RACESCREEN-SPLIT-1 (2026-10-02). The React component — its state,
//   refs and effects, the race-init effect that wires one race together, the rAF loop (phase
//   advancement, the fixed-timestep physics accumulator and its catch-up cap, the camera update,
//   the draw call), the finish hand-over and the DOM. It is still the ENGINE DRIVER: it imports
//   `raceCore.js` and calls `createRaceFromIdentity` / `stepRacePhysics` itself. What it no longer
//   carries inline, each moved verbatim into a module beside it:
//     raceWorldSetup.js        which world the race is built from (configs, stage, badge, params)
//     trackScene.js            track lights and track-effect instances
//     raceCamera.js            the CameraDirector, built and seeded
//     racerDisplayFields.js    the racers' render-only fields
//     battleSlowmo.js          the BATTLE / PHOTO_FINISH slow-motion clock
//     raceLoopDiagnostics.js   the loop's dev-HUD readouts and the hold probe
//     raceResults.js           the finish order and the result-screen payload
//     burstParticles.js        the finish-line burst particle step
//     renderInterpolation.js   the interpolated racer snapshot between physics steps
//     stateOverlaySelection.js which narrative line the state overlay shows
//     viewerFrameProbe.js      the per-frame viewer-probe payload
//   reports/evolution/P4-RACESCREEN-SPLIT-1.md has the map and what stayed here, and why.
//
// ★ STAY-ON-THE-FINISH-1 (the owner's decision, 2026-09-25): THE HAND-OVER TO THE RESULTS IS NOW A
//   CHOICE. `autoAdvance` on — today's behaviour, the screen hands over when the camera ending
//   closes. Off — the finish picture stands until the operator left-clicks it. The ENDING ITSELF is
//   untouched by this: `endingOnRaceScreenMs` keeps its two inputs and its arithmetic, because
//   `scripts/camera-fingerprint.mjs` reads the same function and the two may not diverge.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateActiveRace } from './raceSession.js';
import { PHASE } from './racePhase.js';
import { renderRaceFrame } from './renderRaceFrame.js';
import { createLabelFormHold } from './labelFormHold.js';
import { frameCameraInputs } from './frameCameraInputs.js';
import { attachRenderState, attachRacerRenderState } from './renderState.js';
import { advanceSlowmo } from './battleSlowmo.js';
import { getBgCanvasReady } from './drawing/trackRendering.js';
import { getBackgroundImage } from '../../modules/track-effects/bgImageCache.js';
import { emitBurst } from './drawing/particleRendering.js';
import { advanceRacerDust } from './racerDust.js';
import { advanceBurstParticles } from './burstParticles.js';
import Scoreboard from './Scoreboard.jsx';
import { createScoreboardPositions } from './scoreboardPositions.js';
import { interpolateRacers } from './renderInterpolation.js';
import { resolveActiveBrandProfile } from '../../modules/branding/useActiveBrandProfile.js';
import { getRacerType } from '../../racer-types/index.js';
import { attachRacerDisplayFields } from './racerDisplayFields.js';
import { createRaceCamera } from './raceCamera.js';
import { createRaceFromIdentity, stepRacePhysics } from '../../modules/raceCore.js';
// P4-RACESCREEN-SPLIT-1: the world a race is built from — racer-type fields, the config world, the
// action stage, the badge and the engine parameters — is resolved there (RACE-IDENTIFIER-1/-2,
// RACE-ACTION-CONTROL-1, RACE-PARAMS-2). RACE-PARAMS-2: `normalSpeedFrom` is not imported on this
// path at all — `buildRaceCoreParams` derives it from the same one home.
import { resolveRaceWorld } from './raceWorldSetup.js';
import { useFadeNavigate } from '../../contexts/TransitionContext.jsx';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { cacheTrackLights, createTrackEffects } from './trackScene.js';
import { TEST_RACE_RETURN_ROUTE } from '../TrackEditor/testRaceRoute.js';
import { loadCameraConfig, cameraConfigProvenance } from '../../modules/cameraConfig.js';
import {
  testAidsOn,
  testAidUrlFlag,
  withTestAids,
  TEST_AID_CAMERA_KEYS,
} from '../../modules/testAids.js';
import { buildCameraMarker } from '../../modules/camera/cameraMarker.js';
// BUILD-TRUTH-1: the ONLY import of the virtual module. It is re-read and the page force-reloaded
// whenever the identity changes, so this value cannot be older than the code around it. It stays
// out of `modules/` on purpose: scripts/render-fingerprint.mjs drives the renderer directly in node,
// where a bare `virtual:` specifier cannot resolve.
import RA_BUILD from 'virtual:ra-build';
// STAY-ON-THE-FINISH-1: the operator's own defaults, for the one key this screen acts on.
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';
import CameraStateHUD from './CameraStateHUD.jsx';
import CameraDiagnosticsHUD from './CameraDiagnosticsHUD.jsx';
import RacePlanHUD from './RacePlanHUD.jsx';
import CameraFrameLogHUD from './CameraFrameLogHUD.jsx';
import CameraMarkerHUD from './CameraMarkerHUD.jsx';
import PerfLogHUD from './PerfLogHUD.jsx';
import {
  createPerfLog,
  recordPerfFrame,
  buildPerfContext,
  startLongTaskObserver,
  stopLongTaskObserver,
} from './perfLog.js';
import { identifyNameSet } from '../../modules/racerNames.js';
import StateOverlay from './StateOverlay.jsx';
import BattleDiagHUD from './BattleDiagHUD.jsx';
import ComebackDiagHUD from './ComebackDiagHUD.jsx';
import GovernorDiagHUD from './GovernorDiagHUD.jsx';
import LeadChangeDiagHUD from './LeadChangeDiagHUD.jsx';
import { selectWinnerText } from '../../modules/stateOverlayTemplates.js';
import { overlayVarsFor, pickOverlayText } from './stateOverlaySelection.js';
import { storageGet, KEYS } from '../../modules/storage/storage.js';
import { getCachedServerSurfaceClasses } from '../../modules/storage/surfaceClassCache.js';
import { loadServerClasses } from '../../modules/surface-effects/registry.js';
import { initProbe, recordFrame, recordFrameCamera } from '../../modules/rAFProbe.js';
import { recordViewerFrame } from '../../modules/viewerProbe.js';
// P4-RACESCREEN-SPLIT-1: the per-frame payload for the probe above is built in its own module.
import { viewerFramePayload } from './viewerFrameProbe.js';
import BrandLogoOverlay from './BrandLogoOverlay.jsx';
import CeremonyBrandCard from './CeremonyBrandCard.jsx';
import { nextBeatStart } from '../../modules/camera/startCeremony.js';
import WinnerCard, { WINNER_CARD_FADE_MS, winnerCardWindowMs } from './WinnerCard.jsx';
import { endingOnRaceScreenMs } from './endingSchedule.js';
import { splitFinishOrder, buildRaceResults } from './raceResults.js';
import {
  governorDiagSnapshot,
  recordHoldProbe,
  recordRacePlanStepDiag,
  recordTopThreeSpeedDiag,
} from './raceLoopDiagnostics.js';
import './RaceScreen.css';
import {
  DEFAULT_CAMERA_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
} from '../../modules/storage/defaults.js';

const CANVAS_W = 1280;
const CANVAS_H = 720;

// SCOREBOARD-SLOT-LAYER: RANK_PALETTE lives in scoreboardLayout.js, beside the pitch and the badge
// width — the two layers and the positioner all read it from there.

// PHASE has one home now (racePhase.js) — it used to be declared here AND twice more as
// `PHASE_RACING = 1` in the drawing modules.

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
  // LABEL-OCCLUSION-1: which labels are CURRENTLY in the name form, and the hold state that decides
  // when that may change. Tracked separately from label tenure, because a racer can hold its label
  // while the name under it stops being clear — two different claims on two different boxes.
  const tagWideFormsRef = useRef(null);
  const tagFormHoldRef = useRef(createLabelFormHold());
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
  // HISTORY-MISSING-2's overrun flag and its banner were removed on 2026-09-13 (see
  // modules/raceOverrun.test.js); nothing in this screen holds an overrun state any more.
  const [countdown, setCountdown] = useState(3);
  // SCOREBOARD-SLOT-LAYER: React state now holds only what a card SAYS — its identity and its finish.
  // It no longer holds the RANKING, which changes constantly and would re-render the list four times
  // a second to produce one changed `transform` per card. The ranking is applied through the
  // positioner below, straight onto the DOM. See scoreboardPositions.js for why.
  const [scoreboardCards, setScoreboardCards] = useState([]);
  // SHIP-THE-STANDINGS: the racer type's glyph, for the panel header. Race-constant, so it is set
  // once at race init and never touched again — it is the icon the rows used to repeat a hundred
  // times. Null until a race is built, and the header simply omits it then.
  const [rosterIcon, setRosterIcon] = useState(null);
  // CEREMONY-OPENING-1: the two things the ceremony's beats switch in the DOM. Both change at most
  // twice per race, so they are React state and not a per-frame value — the loop below only calls a
  // setter when the boolean actually flips, exactly as `camState` does.
  //   brandUp — the opening card is on screen
  //   boardUp — the starters board is on screen, and while it is the brand LOGO must not be, because
  //             it sits across the last column of names (the owner's screenshot).
  const [ceremonyBrandUp, setCeremonyBrandUp] = useState(false);
  const [ceremonyBoardUp, setCeremonyBoardUp] = useState(false);
  const prevCeremonyRef = useRef({ brand: false, board: false });
  const scoreboardPositionsRef = useRef(null);
  // Stable for the life of the component, so a card's ref callback never re-runs for a new identity.
  const attachScoreboardCard = useCallback(
    (index, el) => scoreboardPositionsRef.current?.attach(index, el),
    []
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [camState, setCamState] = useState(null);
  const prevHudStateRef = useRef(null);
  const [camAnchor, setCamAnchor] = useState(null); // CAMERA-FOCUS-1: dev-HUD pan-anchor racer label
  const prevCamAnchorRef = useRef(null);
  const truthEntryLoggedRef = useRef(false); // CAMERA-FOCUS-4: one-shot observer-phase log per race
  const perfLogRef = useRef(null);
  // TEST-AIDS-1: the test-aids switch, read ONCE at mount like the camera config below — a race in
  // progress keeps the answer it started with. OFF (the shipped state) hides every developer display
  // and aid of DEV-DISPLAYS-1 on this screen; ON is the screen exactly as it was before the switch.
  const [aids] = useState(() => testAidsOn());
  // Camera config as React state so updateConfig() is called whenever it changes. TEST-AIDS-1: with
  // the switch OFF the diagnostic keys (hero rings, items 13–24) read false, whatever is stored.
  const [cameraConfig] = useState(() => withTestAids(loadCameraConfig(), TEST_AID_CAMERA_KEYS));
  const cameraConfigRef = useRef(cameraConfig);
  // STAY-ON-THE-FINISH-1: the operator's race defaults, read ONCE at mount for the same reason the
  // camera config is — a setting changed mid-race must not alter the race that is already running.
  const [raceDefaults] = useState(() => storageGet(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS));
  const showCameraStateHud =
    cameraConfig.showCameraStateHud ?? DEFAULT_CAMERA_CONFIG.showCameraStateHud;
  const showCameraDiagnostics =
    cameraConfig.showCameraDiagnostics ?? DEFAULT_CAMERA_CONFIG.showCameraDiagnostics;
  const showRpDiag = cameraConfig.showRpDiag ?? DEFAULT_CAMERA_CONFIG.showRpDiag;
  const showRpWinnerList = cameraConfig.showRpWinnerList ?? DEFAULT_CAMERA_CONFIG.showRpWinnerList;
  const showTop10SpeedMonitor =
    cameraConfig.showTop10SpeedMonitor ?? DEFAULT_CAMERA_CONFIG.showTop10SpeedMonitor;
  const enableFrameLog = cameraConfig.enableFrameLog ?? DEFAULT_CAMERA_CONFIG.enableFrameLog;
  const enablePerfLog = cameraConfig.enablePerfLog ?? DEFAULT_CAMERA_CONFIG.enablePerfLog;
  // CEREMONY-SKIP-1: read like its neighbour, and every read needs a default (check-config-keys).
  const ceremonySkipOnClick =
    cameraConfig.ceremonySkipOnClick ?? DEFAULT_CAMERA_CONFIG.ceremonySkipOnClick;
  // ★★ STAY-ON-THE-FINISH-1 — does the screen hand over by itself when the ending closes?
  //
  // Read from the OPERATOR's defaults, not the camera config: this is his choice about the room he
  // is standing in, not a property of the picture. Read like its camera neighbours above — `??` onto
  // the shipped default, because `check-config-keys` requires every read to have one and because a
  // config stored before this key did anything would otherwise read `undefined` here.
  const autoAdvance = raceDefaults.autoAdvance ?? DEFAULT_RACE_DEFAULTS.autoAdvance;
  // The frame loop runs outside React's render scope, so it reads the switch through a ref — the
  // same shape `cameraConfigRef` uses one screen up, and for the same reason.
  const autoAdvanceRef = useRef(autoAdvance);
  // eslint-disable-next-line react-hooks/refs
  autoAdvanceRef.current = autoAdvance;
  const showBattleDiag = cameraConfig.showBattleDiag ?? DEFAULT_CAMERA_CONFIG.showBattleDiag;
  const showComebackDiag = cameraConfig.showComebackDiag ?? DEFAULT_CAMERA_CONFIG.showComebackDiag;
  const showGovernorDiag = cameraConfig.showGovernorDiag ?? DEFAULT_CAMERA_CONFIG.showGovernorDiag;
  const showLeadChangeDiag =
    cameraConfig.showLeadChangeDiag ?? DEFAULT_CAMERA_CONFIG.showLeadChangeDiag;

  // PERF-WHERE-1: WHERE in the race a perf-log export was taken. Called at the moment the owner
  // clicks, never per frame — `g.current` is the live race state, so this reads what is true then
  // rather than what was true when this component last rendered. The roster is DERIVED from the
  // names the field actually has (`identifyNameSet`) rather than plumbed from SetupScreen, because
  // the key dies in that screen's local state and what reaches a race is the names.
  const getPerfContext = useCallback(
    () =>
      buildPerfContext(g.current, {
        namesOn: !!cameraConfigRef.current?.labelNamesWhenRoom,
        roster: identifyNameSet(g.current?.racers ?? []),
      }),
    []
  );

  // ── State-overlay narrative text ─────────────────────────────────────────
  const [overlayText, setOverlayText] = useState(null);
  const overlayTimerRef = useRef(null);
  // 15a-predictive: persistent winner-text channel. Separate from overlayText — NOT touched by the
  // [camState, phase] state-overlay effect and NOT auto-cleared by stateOverlayDurationMs, so it
  // survives the PHOTO_FINISH→FINISH_OVERVIEW change and holds until race end / new race.
  const [winnerOverlayText, setWinnerOverlayText] = useState(null);
  // WINNER-CARD-1: the closing card. `winnerCard` is WHO (null = no card at all, which is what the
  // key at 0 produces); `winnerCardUp` is WHETHER IT IS IN ITS WINDOW. Two states rather than one so
  // the fade OUT has something to fade out of — clearing the identity would unmount mid-transition.
  const [winnerCard, setWinnerCard] = useState(null);
  const [winnerCardUp, setWinnerCardUp] = useState(false);
  const winnerCardTimersRef = useRef([]);
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
    if (!(cfg.stateOverlayEnabled ?? DEFAULT_CAMERA_CONFIG.stateOverlayEnabled)) return;
    if (!['OVERVIEW', 'BATTLE_ZOOM', 'COMEBACK_ZOOM', 'LEAD_CHANGE'].includes(camState)) return;

    // P4-RACESCREEN-SPLIT-1: the derivation and the no-repeat choice live in stateOverlaySelection.js.
    const racers = g.current?.racers ?? [];
    const vars = overlayVarsFor(camState, racers, camDirRef.current);
    const result = pickOverlayText(camState, vars, {
      usedBattle: overlayUsedBattleIndicesRef.current,
      usedComeback: overlayUsedComebackIndicesRef.current,
      usedLeadChange: overlayUsedLeadChangeIndicesRef.current,
      lastIndexRef: overlayLastIndexRef,
    });
    if (!result) return;

    setOverlayText(result.text);

    const duration = cfg.stateOverlayDurationMs ?? DEFAULT_CAMERA_CONFIG.stateOverlayDurationMs;
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

    // TEST-AIDS-1, item 26: `?constSpeed=1` changes the physics, so it is honoured only while ON.
    const constSpeedActive = testAidUrlFlag('constSpeed');
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

    // P4-RACESCREEN-SPLIT-1: the track lights are cached and the track effects created in
    // trackScene.js, once per race. RaceScreen holds the effects and destroys them in its cleanup.
    const { cachedLightPts, trackLightsConfig } = cacheTrackLights(shapeRef.current, geometry);
    effectsRef.current = createTrackEffects(canvas, raceData, geometry, worldWidth, worldHeight);

    const racerType = getRacerType(typeId);
    racerTypeRef.current = racerType;

    const trackEmoji = racerType.getEmoji() ?? null;

    // Use the component-level cameraConfig (via ref for closure access).
    const cameraConfig = cameraConfigRef.current;
    // WINNER-CARD-1: the timer list, captured here rather than read from the ref in the cleanup.
    // The array identity never changes (it is pushed into and truncated, never replaced), so the
    // local and the ref are the same list — this is the shape the exhaustive-deps rule asks for, and
    // it is honest here rather than a silencing, because a cleanup that read the ref LATER could in
    // principle be looking at a different race's list.
    const winnerCardTimers = winnerCardTimersRef.current;
    // ── P4-RACESCREEN-SPLIT-1: WHICH WORLD THIS RACE RUNS IN is resolved in raceWorldSetup.js ────
    // The racer type's physics fields (recorded or live — RACE-IDENTIFIER-2), the config world
    // (recorded or this host's — RACE-IDENTIFIER-1), the action stage from the payload
    // (RACE-ACTION-CONTROL-1), the badge and diff, and the engine's parameters (RACE-PARAMS-2).
    // `displaySizeScale` is NOT a `createRaceFromIdentity` field — it is the drawing scale, and the
    // rest goes to the engine untouched.
    const {
      speedMultiplier,
      raceActionStage,
      dynamicsConfig,
      frameTimingConfig,
      cfgWorld,
      cfgBadge,
      cfgDiff,
      displaySize,
      racePlanSeed,
      pathLengthPx,
      displaySizeScale,
      raceCoreParams,
    } = resolveRaceWorld({
      raceData,
      geometry,
      typeId,
      racerType,
      shape: shapeRef.current,
      isOpenTrack,
      trackWidthPx,
      nRacers,
      constSpeedActive,
    });
    // The camera's body-size reference, read from what the engine was actually built with.
    const { drawnBodyWidthRefPx } = raceCoreParams;

    // ── The REAL race init, extracted to modules/raceCore.js (createRaceFromIdentity) ───────────
    // The canonical duration model, the seeded physics stream (raceRng), the row layout, the re-roll
    // schedule, every racer's physics fields, the Race Plan controller and the phase-split / director
    // config are all built there now — so the browser and the headless golden harness run the SAME
    // code. RaceScreen stays the renderer: it augments each physics racer with render-only fields
    // below and drives stepRacePhysics() from its rAF accumulator.
    const race = createRaceFromIdentity(raceCoreParams);
    // ── RACE-INPUTS-PROBE-1: what the race was ACTUALLY built with, for a browser test ───────────
    //
    // INERT UNLESS SWITCHED ON, the same shape as `?constSpeed=1` (:423) and the viewer probe: no
    // normal race writes this. It exists because the one question the owner's report raised — did a
    // pasted identifier run ITS race or this machine's — had NO observable in the browser at all,
    // and a test that cannot see the engine's inputs can only guess from the payload.
    //
    // It reports the values that actually reached `createRaceFromIdentity` above, so it cannot
    // drift from them: it is read from the same variables, one line later.
    try {
      // TEST-AIDS-1: a console-only probe — ignored while the switch is OFF.
      if (aids && localStorage.getItem('racearena:raceInputsProbe') === '1') {
        window.__raRaceInputs = {
          racerTypeId: typeId,
          speedMultiplier,
          racePlanSeed,
          raceActionStage,
          racePlanPulkStart: dynamicsConfig?.racePlanPulkStart ?? null,
          fromIdentifier: !!raceData.worldConfigOverride,
        };
      }
    } catch {
      /* storage unavailable — the probe is a diagnostic and must never take a race down */
    }
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

    // CEREMONY-OPENING-1: the ONE place that says whether this race opens on a brand card. The
    // director owns the schedule and cannot know what a branding profile is; this is the only thing
    // it is told, once, and every consumer of the schedule inherits the answer.
    const ceremonyBrandProfile = activeBrand?.logo ? activeBrand : null;
    // P4-RACESCREEN-SPLIT-1: the director is built and SEEDED in raceCamera.js — constructor, the
    // seed derived from the race seed (CAMERA-REPRO-1 / CAMERA-SEED-AND-LINE-1), the viewer probe
    // (VIEWER-INVARIANTS-1) and the brand-card answer above, in that order.
    const { director, cameraRandomSeed } = createRaceCamera({
      worldWidth,
      worldHeight,
      isOpenTrack,
      cameraConfig,
      drawnBodyWidthRefPx,
      shape: shapeRef.current,
      trackWidthPx,
      racePlanSeed,
      trackId: raceData.trackId ?? null,
      nRacers: raceState.racers.length,
      ceremonyBrandActive: !!ceremonyBrandProfile,
    });
    camDirRef.current = director;
    setCeremonyBrandUp(false);
    setCeremonyBoardUp(false);
    prevCeremonyRef.current = { brand: false, board: false };
    // CAMERA-FOCUS-4 LIVE TRUTH — print, at every race start, exactly which build + camera path this
    // browser is running: short commit · RESOLVED transition grammar · leader forward-frac · stored schema
    // per-key source (stored vs default) for the two FOCUS-3 keys. Reload once and paste this to
    // settle any stale-bundle / stale-config ghost hunt in a single glance. This line stays forever.
    {
      // ONE SOURCE. This used to read the `__RA_COMMIT__` Vite define — the frozen value
      // BUILD-TRUTH-1 diagnosed — while the HUD pill read the live git identity. One value, two
      // consumers, and only the consumer with a test got fixed: the line then printed 77919708
      // twice, hours apart, across two different pills, and halted a ship on its own falsehood.
      // Both artefacts now come from `RA_BUILD` and CANNOT disagree, which is asserted by a test.
      const commit = RA_BUILD.commit;
      const prov = cameraConfigProvenance();
      // eslint-disable-next-line no-console
      console.info(
        `[RA CAMERA LIVE TRUTH] commit=${commit} branch=${RA_BUILD.branch}` +
          `${RA_BUILD.dirty ? ' DIRTY' : ''} ` +
          `resolvedGrammar=${camDirRef.current.transitionGrammar} ` +
          `leaderForwardFrac=${camDirRef.current.leaderForwardFrac ?? 'null'} ` +
          // ★★ THE CONFIG FINGERPRINT, ADDED 2026-09-25 (WORKBENCH-THREE). Without it this line could
          // say WHICH BUILD was on screen but not WHICH CONFIGURATION produced it — and a verdict
          // given on one is worth nothing without the other, because a stored config beats
          // `defaults.js` per key and nothing on the line said so. Same value the badge draws and
          // the camera marker records; computed once at `cfgBadge` above, not recomputed here.
          `cfg=${cfgBadge.hashShort} ` +
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
        // The THIRD consumer of the same value, and the one that started all of this: the marker's
        // "build" field is what reported be649aa9 while the tree was 22 hours ahead of it.
        build: RA_BUILD.commit,
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
    // WINNER-CARD-1: and the closing card, which must not survive into the next race. Its timers go
    // first — a pending hide from the previous race would otherwise put the new card away early.
    winnerCardTimersRef.current.forEach(clearTimeout);
    winnerCardTimersRef.current.length = 0;
    setWinnerCardUp(false);
    setWinnerCard(null);

    // ── P4-RACESCREEN-SPLIT-1: the render-only fields (roster display fields, icon, coat, pattern,
    // start number, trail emitter) are attached in racerDisplayFields.js — IN PLACE, AFTER the race
    // is built, drawing nothing from its random stream.
    attachRacerDisplayFields(raceState.racers, raceData.racers, {
      racePlanSeed,
      trackEmoji,
      typeId,
      racerType,
      trackSurfaceClasses,
    });
    attachRacerRenderState(raceState.racers);

    // g.current IS the extracted physics state (racers, finishT, maxLaps, finishedCount, raceProgress,
    // physicsTs) with the render/phase fields added on top — one object, so stepRacePhysics and the
    // renderer share it.
    g.current = attachRenderState(raceState);

    // ── Config flags for canvas-loop use ────────────────────────────────────
    const showRpMinimapBadgesCfg =
      cameraConfigRef.current.showRpMinimapBadges ?? DEFAULT_CAMERA_CONFIG.showRpMinimapBadges;
    const showRpStartRowCfg =
      cameraConfigRef.current.showRpStartRow ?? DEFAULT_CAMERA_CONFIG.showRpStartRow;
    // ENDING-PICTURE-1: the two ending keys, read ONCE per race like the flags above. Both default
    // to the fixed behaviour; both restore the old one when turned the other way.
    const endingKeepsFinishShotCfg =
      cameraConfigRef.current.endingKeepsFinishShot ?? DEFAULT_CAMERA_CONFIG.endingKeepsFinishShot;
    const finishedSplashEnabledCfg =
      cameraConfigRef.current.finishedSplashEnabled ?? DEFAULT_CAMERA_CONFIG.finishedSplashEnabled;

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
    diagDataRef.current.rpBonusMult =
      dynamicsConfig.racePlanBonusStrengthMultiplier ??
      DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier;

    // SCOREBOARD-STABLE-ROWS: build each racer's card identity once, here, and hand the list only
    // the values that move.
    // The per-racer constants — icon, name, race number — created ONCE here and never re-created and
    // NEVER MUTATED. Each card entry below carries the SAME OBJECT for the whole race, which is what
    // lets the memoised card compare it by reference and skip. It lives in this effect's closure
    // rather than a ref because the render must not read a ref, and the render is what needs it.
    const rowIdentities = new Map(
      g.current.racers.map((r) => [
        r.index,
        { index: r.index, icon: r.icon, name: r.name, raceNumber: r.raceNumber ?? null },
      ])
    );
    // SHIP-THE-STANDINGS: one glyph for the whole panel. `trackEmoji` is the racer type's own emoji
    // and is what every row carried; the first racer's icon is the fallback for a type without one,
    // which is exactly what the rows displayed.
    setRosterIcon(trackEmoji ?? g.current.racers[0]?.icon ?? null);
    // SCOREBOARD-SLOT-LAYER: one positioner per race. It is created BEFORE the cards are handed to
    // React and seeded with the starting ranking below, so every card is positioned by its own
    // `attach` the moment it mounts rather than sitting at the top of the list until the first tick.
    const positions = createScoreboardPositions();
    scoreboardPositionsRef.current = positions;
    // The reusable ranking map — one allocation per race, refilled each tick.
    const scoreboardRanks = new Map();
    // The seed keeps the pre-race order the old code showed (racer order, one rank each), so the
    // first painted list is identical to what it was.
    for (let i = 0; i < g.current.racers.length; i++) {
      scoreboardRanks.set(g.current.racers[i].index, i + 1);
    }
    positions.applyRanks(scoreboardRanks);
    setScoreboardCards(
      g.current.racers.map((r) => ({
        index: r.index,
        identity: rowIdentities.get(r.index),
        finished: !!r.finished,
        finishTimeMs: r.finishTimeMs ?? null,
      }))
    );
    // The ONLY thing that still makes a card re-render: a racer crossing the line. Tracked so the
    // cadence tick can tell "somebody finished" from "the order changed", and set React state for
    // the first case only.
    let scoreboardFinishedCount = 0;

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
    if (enablePerfLog) {
      perfLogRef.current = createPerfLog();
      // FRAME-GAP-1: the long-task observer lives exactly as long as the log does. Started here and
      // disconnected in the cleanup below, so a race that ends leaves no observer behind.
      startLongTaskObserver(perfLogRef.current);
    }

    // Perf probe: activated by ?perfprobe=1 URL flag (persisted via sessionStorage).
    initProbe();

    // ── rAF loop ─────────────────────────────────────────────────────────────
    function loop(ts) {
      if (cancelled) return;
      recordFrame(ts);
      const st = g.current;
      const shape = shapeRef.current;
      const rawDt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;
      // PERF-WHERE-1: the SAME delta with no cap, for the perf log only. The cap above is
      // load-bearing — `rawDt` feeds the physics accumulator, so an uncapped stall would
      // fast-forward the race — but it makes `total`'s p90/p99/max saturate at exactly 50, which
      // hides how bad the worst frame was. This value never reaches physics. One subtraction, and
      // only when the log is on.
      const rawDtUncapped = enablePerfLog ? (st.lastTs ? ts - st.lastTs : 16) : 0;
      // Perf-log bracket 1: start of frame (also serves as default for tPhys when no physics ran).
      const t0 = enablePerfLog ? performance.now() : 0;
      // FRAME-GAP-1: how late the browser was to us. `ts` is the frame's nominal start as rAF
      // reports it; `t0` is when OUR code actually began. The gap is everything the browser did
      // first, and it is the half of `other` that no change to our draw code can shorten. One
      // subtraction, only when the log is on. Clamped at 0 because the two clocks are the same
      // clock but a browser may hand in a timestamp fractionally ahead of the callback.
      const rafLate = enablePerfLog ? Math.max(0, t0 - ts) : 0;
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

      // EMA smoothing for the track effects only (the camera is fed `rawDt`, see below).
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
        // CEREMONY-OPENING-1: the DOM half of the ceremony, from the SAME schedule the camera and
        // the renderer use. No second clock — the one-home rule this project has already paid for
        // once, when a timer beside the schedule made the countdown invisible.
        {
          const sched = camDirRef.current.ceremonySchedule(st.racers);
          const el = ts - st.countdownStart;
          const brandUp = el < sched.brandMs;
          const boardUp = el >= sched.boardStartMs && el < sched.boardEndMs;
          const prev = prevCeremonyRef.current;
          if (brandUp !== prev.brand) {
            prev.brand = brandUp;
            setCeremonyBrandUp(brandUp);
          }
          if (boardUp !== prev.board) {
            prev.board = boardUp;
            setCeremonyBoardUp(boardUp);
          }
        }
        // START-BOARD-2: the gun fires when the CEREMONY is over, not at a fixed 4000 ms. The
        // ceremony's total is the sum of its beats and one of them scales with the field, so the
        // director is asked rather than a config key read — one home for the length.
        if (ts - st.countdownStart >= camDirRef.current.ceremonySchedule(st.racers).totalMs) {
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
        // The camera path is intentionally unaffected. (CITATIONS-1, 2026-09-03: this line said
        // "Camera path (smoothDt)". The camera is fed `rawDt` — see the `camDir.update(…, rawDt)`
        // call below — and has been since `f16ab4de`, 2026-06-08. `smoothDt` feeds the EFFECTS loop.
        // The claim about slow-motion is unchanged; only the parenthesis was wrong, and it was the
        // second site of a sentence `docs/CAMERA_DIRECTOR.md` carried in the same wrong direction.)
        {
          const hud = camDirRef.current?.hudState;
          // P4-RACESCREEN-SPLIT-1: the slow-motion clock itself lives in battleSlowmo.js.
          const effectiveSlowmoFactor = advanceSlowmo(st, hud, ts, rawDt, cameraConfigRef.current);
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
            governorDiagRef.current = governorDiagSnapshot({
              racePlanController,
              govPhase,
              st,
              govFractions,
              govSeed,
              pathLengthPx,
              govMeanBodyLen,
              isOpenTrack,
              pulkLeadRotationOn,
            });
          }

          // ── HOLD-PROBE (DIRECTION-AUTHORITY-1): what the HELD comebacker is doing, for a browser
          // test. INERT UNLESS SWITCHED ON, exactly like the race-inputs probe above and for the
          // same reason: the hold-and-release shape changes what the owner SEES, and this project
          // has twice shipped a defect that hid between the logic and the picture. Without an
          // observable a browser test could only re-derive the rank it is supposed to be checking.
          //
          // It records the plan's OWN idea of who is held (`getHeldRelease`) and his LIVE rank off
          // the same sorted field the scoreboard uses — never a recomputation of either.
          recordHoldProbe(st, racePlanController);

          // Scoreboard: update when physicsTs crosses a bucket boundary.
          // Two-group sort mirrors the Results screen: finishers by finishRank
          // (ascending), then still-racing by r.t (descending). Pure b.t-a.t
          // fails once racers finish because the runout-decay surge lets later
          // finishers temporarily overtake earlier ones in raw r.t.
          //
          // SCOREBOARD-CADENCE-1: the bucket was a hard-coded 250 and is now a setting. This is the
          // ONLY place it is read — the other update is a one-shot seed at race init — so
          // there is one cadence and no second copy to drift from it. It is measured in PHYSICS time,
          // not wall time, which is deliberate and unchanged: the list then ticks with the race even
          // through BATTLE slow-motion, rather than running ahead of the picture it describes.
          const sbBucket = frameTimingConfig.scoreboardIntervalMs;
          if (Math.round(physicsTs / sbBucket) !== Math.round((physicsTs - FIXED_DT) / sbBucket)) {
            // SCOREBOARD-STABLE-ROWS: the SORT IS UNTOUCHED — same two groups, same tie handling,
            // same resulting order.
            // SCOREBOARD-TRANSFORM-ROWS: it now only assigns RANKS; the ranking travels to the
            // screen as a `translateY` instead of as a move in the document.
            // SCOREBOARD-SLOT-LAYER: and the ranking no longer travels through React at all. The
            // places are a static layer, the cards say nothing that a rank change could alter, so
            // the tick writes one transform per card that moved and touches no React state.
            scoreboardRanks.clear();
            [...st.racers]
              .sort((a, b) => {
                if (a.finished !== b.finished) return a.finished ? -1 : 1;
                if (a.finished) return a.finishRank - b.finishRank;
                return b.t - a.t;
              })
              .forEach((r, i) => scoreboardRanks.set(r.index, i + 1));
            positions.applyRanks(scoreboardRanks);
            // A card's CONTENT changes exactly once per racer — when it finishes and gains a time.
            // That is the one occasion this list re-renders, and it is one card per crossing.
            if (st.finishedCount !== scoreboardFinishedCount) {
              scoreboardFinishedCount = st.finishedCount;
              setScoreboardCards(
                st.racers.map((r) => ({
                  index: r.index,
                  identity: rowIdentities.get(r.index),
                  finished: !!r.finished,
                  finishTimeMs: r.finishTimeMs ?? null,
                }))
              );
            }
          }

          if (st.finishedCount >= nRacers) {
            st.phase = PHASE.FINISHED;
            setPhase(PHASE.FINISHED);
            // P4-RACESCREEN-SPLIT-1: the finish order and the result payload are built in
            // raceResults.js; the write and the test-race gate stay here.
            const { byRank, rest } = splitFinishOrder(st.racers);
            // PARTICLES-VISIBILITY-12: a test race hands NO result on — the result screen is where a
            // race is recorded (ResultScreen `recordFinishedRace`), and a test race records nothing.
            if (!raceData.testRace)
              sessionStorage.setItem(
                'raceResults',
                JSON.stringify(buildRaceResults({ byRank, rest, st, ts, raceData, cfgWorld }))
              );
            const pauseMs = camDirRef.current?.finishPauseMs ?? DEFAULT_CAMERA_CONFIG.finishPauseMs;
            // ENDING-HOLD-1: extra time on the settled finish picture BEFORE the pause starts. The
            // two ADD, so the ending grows by exactly the hold — the card's window stays `min(card,
            // pause)` and does not inherit it, which is why what grows is the CARD-FREE tail.
            //
            // MEASURED FROM THE LAST CROSSING, and that is structural rather than asserted: this
            // whole block is inside `if (st.finishedCount >= nRacers)`, which is reachable only on
            // the frame the last racer finishes (the same frame sets PHASE.FINISHED, and the arm
            // above is `st.phase === PHASE.RACING`, so it cannot run twice). At `0` the arithmetic
            // is `0 + pauseMs` — the ending that existed before this key.
            // CAMERA-ENDING-WINDOW-1: `hold + pause` is now computed by `endingOnRaceScreenMs` so
            // that this timer and `scripts/camera-fingerprint.mjs`'s window read ONE function. The
            // instrument used to stop on the frame this timer starts, which is why it had never
            // rendered a FINISHED frame. Same arithmetic, same result; one home.
            //
            // ★★ STAY-ON-THE-FINISH-1 — THE SWITCH DECIDES WHETHER THIS TIMER HANDS OVER, and that is
            // ALL it decides. The ending's LENGTH is untouched: `endingOnRaceScreenMs` keeps its two
            // inputs and its arithmetic, and `scripts/camera-fingerprint.mjs` reads the same function,
            // so the two cannot diverge. No term was added to it and it reads no new key.
            //
            // With the switch OFF the picture simply stands — the camera goes on composing the
            // settled finish shot exactly as it does for the seconds before the hand-over, because
            // nothing about the ending changed. The operator moves on by clicking the picture
            // (`onFinishClick` below).
            if (autoAdvanceRef.current) {
              finishNavTimerRef.current = setTimeout(
                // PARTICLES-VISIBILITY-12: a test race goes back to the Track Editor, not to results.
                () =>
                  raceData.testRace
                    ? fadeNavRef.current(TEST_RACE_RETURN_ROUTE)
                    : fadeNavRef.current('/results'),
                endingOnRaceScreenMs({
                  holdMs: cameraConfigRef.current?.finishHoldAfterLastMs,
                  pauseMs,
                })
              );
            }

            // WINNER-CARD-1: the card is fired HERE, from the same block that starts the pause, so
            // the two can never disagree about when the ending begins.
            //
            // THE CLAMP IS THE WHOLE CONTRACT: the card gets `min(key, pause)` and therefore cannot
            // extend the ending by any setting. `pause = 0` gives it 0, which is the same as the key
            // at 0 — no card. The fade-out is started early enough to have finished before the
            // navigation, which is why the hide timer is not simply `cardMs`.
            const cardMs = winnerCardWindowMs(
              cameraConfigRef.current?.winnerCardMs ?? DEFAULT_CAMERA_CONFIG.winnerCardMs,
              pauseMs
            );
            if (cardMs > 0) {
              const w = byRank[0];
              if (w?.name) {
                setWinnerCard({
                  name: w.name,
                  raceNumber: w.raceNumber ?? null,
                  color: w.color ?? null,
                });
                setWinnerCardUp(true);
                winnerCardTimers.push(
                  setTimeout(
                    () => setWinnerCardUp(false),
                    Math.max(0, cardMs - WINNER_CARD_FADE_MS)
                  )
                );
              }
            }
          }

          // Final lap detection — ts (browser time) used so visual overlay timing is correct
          if (!isOpenTrack && st.maxLaps > 1 && !st.finalLapStartTs) {
            const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
            if (Math.floor(leader.t) >= st.maxLaps - 1) st.finalLapStartTs = ts;
          }

          // Race-Plan per-step diagnostics → diagDataRef (polled by CameraDiagnosticsHUD)
          if (racePlanController) {
            recordRacePlanStepDiag(diagDataRef.current, st, {
              racePlanController,
              physicsTs,
              lastRollDeadline,
              rpPlanInfo,
              assignmentByRacer,
              speedRings,
            });
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
          recordTopThreeSpeedDiag(diagDataRef.current, st.racers);
        }

        // Racer dust: spawn behind racers still running, advance everyone's (see racerDust.js).
        // rawDt in ms; generators expect dt in frames (1 = one frame at 60fps).
        advanceRacerDust(st.racers, st.dustParticles, racerTypeRef.current, rawDt / 16, ts);
        // Advance burst particles — in-place mutation + swap-remove (no allocation).
        advanceBurstParticles(st.burstParticles, true);
      } else {
        // FINISHED — keep burst particles alive, in-place mutation + swap-remove.
        computePositions();
        // PARTICLES-VISIBILITY-2: the dust keeps fading here too. Nobody is running, so nothing
        // spawns; without this call every racer's last dust stood frozen until the screen closed.
        advanceRacerDust(st.racers, st.dustParticles, racerTypeRef.current, rawDt / 16, ts);
        advanceBurstParticles(st.burstParticles, false); // no shrink here — see burstParticles.js
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
        // P4-RACESCREEN-SPLIT-1: the buffer fill lives in renderInterpolation.js.
        renderRacers = interpolateRacers(renderBuf, st.racers, renderAlpha);
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
      // ENDING-PICTURE-1: THE ENDING KEEPS THE SHOT THE DIRECTOR COMPOSED.
      //
      // This used to hand back `{ zoom: 1, offsetX: 0, offsetY: 0 }` the frame the phase flipped to
      // FINISHED — an identity transform, which is not a shot at all. On a closed track it shrank
      // the whole world into the canvas; on an open track it left an 853x480 window pinned at world
      // (0,0), with the racers nowhere in it. The hold the owner asked for was holding that.
      //
      // WHY THE DIRECTOR KEEPS BEING CONSULTED rather than freezing the last transform, which was
      // the other candidate: the zoom-out can still be IN FLIGHT when the last racer crosses. On
      // Searound seed 2814 it ends 50 ms after the last crossing, and his own zoom-out setting is
      // longer than the shipped one — freezing would stop the pull-back dead mid-move and hold THAT.
      // Consulting the director lets it finish the move and come to rest, which is what "settled"
      // means. It is also safe by construction: physics no longer steps in this phase, so the
      // director sees a static field, and `_inFinishMode` is absolute — `_pickNextState` returns
      // FINISH_MODE_LOCKED, so no new shot can be chosen. It converges and stops.
      const directorDrivesEnding = st.phase === PHASE.FINISHED && endingKeepsFinishShotCfg;
      const cam =
        st.phase === PHASE.RACING || directorDrivesEnding
          ? camDirRef.current.update(renderRacers, ts, raceState, CANVAS_W, CANVAS_H, rawDt)
          : st.phase === PHASE.COUNTDOWN && st.countdownStart != null
            ? camDirRef.current.updateCountdown(
                st.racers,
                ts,
                ts - st.countdownStart,
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

      // ── Draw the frame ─────────────────────────────────────────────────────────────────────
      // RENDER-FINGERPRINT-1: the whole draw sequence lives in renderRaceFrame.js now. It used to
      // be ~210 lines inlined here, closed over forty-two pieces of component state, which is why
      // the render path could not be driven headlessly and therefore had no protection at all.
      // What stays behind is what genuinely belongs to React and the DOM: the background canvas's
      // CSS transform, the countdown state setter, and the perf log.

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

      const frame = renderRaceFrame(ctx, {
        ts,
        st,
        cam,
        shape,
        raceData,
        isOpenTrack,
        bsX,
        bsY,
        worldWidth,
        worldHeight,
        openTrackHW,
        bgImagePath,
        bgCanvasReady,
        effects: effectsRef.current,
        cachedLightPts,
        trackLightsConfig,
        racerType: racerTypeRef.current,
        cameraConfig: cameraConfigRef.current,
        // CEREMONY-OPENING-1: presence adds the BRAND beat to the schedule the renderer builds.
        ceremonyBrand: activeBrand?.logo ? activeBrand : null,
        // FRAME-INPUTS-1: assembled in ONE place, not listed by hand here. The literal that used to
        // sit at this call site named three fields; the renderer read five, so the two it missed —
        // the director's SUBJECT and its STATE — were undefined on every frame of every live race.
        camera: frameCameraInputs(camDirRef.current),
        displaySize,
        displaySizeScale,
        assignmentByRacer,
        showRpStartRow: showRpStartRowCfg,
        showRpMinimapBadges: showRpMinimapBadgesCfg,
        showFinishedSplash: finishedSplashEnabledCfg,
        rpPlanInfo,
        renderAlpha,
        interpolationEnabled: frameTimingConfig.renderInterpolation,
        tagIncumbents: tagIncumbentsRef.current,
        tagWideForms: tagWideFormsRef.current,
        tagFormHold: tagFormHoldRef.current,
        leaderDiag: leaderDiagRef.current,
        // TEST-AIDS-1, items 1–3 and 25: the settings and build badges, the race-plan pill and the
        // gap re-roll marker are drawn only while the switch is ON.
        cfgBadge: aids ? cfgBadge : null,
        buildBadge: aids ? RA_BUILD : null,
        racePlanActive: aids && !!racePlanController,
        racePlanSeed,
        gapRerollDevMarker:
          aids &&
          (dynamicsConfig.gapRerollDevMarker ?? DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollDevMarker),
        // CANVAS-SCALE-1 — a FINDING, not a tidy-up, and the one thing that block left behind.
        // These read `canvas.width/height` until now, and the renderer spends them on LAYOUT: the
        // name-tag font size, the minimum drawn racer size, the label layout's screen box, where the
        // minimap sits and where the HUD's right column sits. They were only ever right because the
        // backing store happens to equal the reference the whole draw path works in — a coincidence,
        // not a rule, and one that holds only while nothing ever resizes the store.
        //
        // NOTHING RESIZES IT TODAY, so this is a no-op and the render fingerprint says so. It stays
        // because the coupling is the kind that fails silently: the day the store changes size, for
        // any reason, layout in backing-store pixels moves the picture's CONTENT — smaller labels, a
        // minimap somewhere else — while looking like a resolution change.
        // `scripts/render-layout-separation.test.mjs` holds both halves: that these two arguments
        // really do drive layout, and that this call site passes the reference.
        canvasW: CANVAS_W,
        canvasH: CANVAS_H,
      });
      tagIncumbentsRef.current = frame.tagShown;
      tagWideFormsRef.current = frame.tagWideForms;
      if (frame.countdownNumber !== null) setCountdown(frame.countdownNumber);

      // CAMERA-REPRO-1: hand the marker the values this frame was DRAWN with. Read back from the
      // renderer rather than recomputed here — a marker that re-derives its own numbers would
      // describe a frame that was never drawn.
      markerFrame.ts = ts;
      markerFrame.effZoomX = frame.effZoomX;
      markerFrame.effZoomY = frame.effZoomY;
      markerFrame.camZoom = cam.zoom;
      markerFrame.offsetX = cam.offsetX;
      markerFrame.offsetY = cam.offsetY;

      // VIEWER-INVARIANTS-1: the five sentences, checked on the transform the frame was DRAWN with.
      // Placed HERE, beside the marker and for the same reason: these are the renderer's own
      // reported values, not a second derivation of them. Inert unless ?viewerprobe=1.
      recordViewerFrame(
        viewerFramePayload({
          ts,
          frame,
          cam,
          shape,
          trackWidthPx,
          st,
          worldWidth,
          cd: camDirRef.current,
          canvasW: CANVAS_W,
          canvasH: CANVAS_H,
        })
      );

      if (bgCanvasRef.current && bgImagePath && bgCanvasReady) {
        const bgScaleX = isOpenTrack ? frame.effZoomX * (worldWidth / CANVAS_W) : cam.zoom;
        const bgScaleY = isOpenTrack ? frame.effZoomX * (worldHeight / CANVAS_H) : cam.zoom;
        bgCanvasRef.current.style.transform = `translate3d(${cam.offsetX * (100 / CANVAS_W)}%, ${cam.offsetY * (100 / CANVAS_H)}%, 0) scale3d(${bgScaleX}, ${bgScaleY}, 1)`;
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
          hudCapHit,
          rawDtUncapped,
          rafLate
        );
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      // No global RNG to restore — the race stream is `raceRng` in raceCore.js (parity step 1),
      // so `Math.random` was never swapped and the rest of the app stays non-deterministic.
      cancelled = true;
      stopLongTaskObserver(perfLogRef.current); // FRAME-GAP-1: never outlive the race
      markerBuildRef.current = null; // CAMERA-REPRO-1: no markers from a torn-down race
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(finishNavTimerRef.current);
      // WINNER-CARD-1: the card's hide timer belongs to the race, exactly like the nav timer above.
      winnerCardTimers.forEach(clearTimeout);
      winnerCardTimers.length = 0;
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

  // ── Cancel the race ──────────────────────────────────────────────────────
  //
  // ONE CONTROL, ONE EFFECT: end the running race and go back to where it was started from, leaving
  // nothing behind. No confirmation, no countdown, no undo, no shortcut — those are the owner's to
  // ask for.
  //
  // WHAT "LEAVES NOTHING BEHIND" MEANS HERE was established by reading the START path rather than
  // guessed, and every item is unwound by somebody:
  //
  //   * `sessionStorage['activeRace']` — written by `SetupScreen.jsx:684` (and `:796` for Quick
  //     Test). Removed here. Left in place it is a race payload with no race, and the next mount of
  //     this screen would start it again.
  //   * the rAF loop, the finish-nav timer, the winner-card timers, the long-task observer, the
  //     camera markers and the effect instances — all released by the animation effect's own
  //     cleanup on unmount (:1760-1773), which navigating away runs. Nothing to do here, and doing
  //     it here as well would be a second owner for state that already has one.
  //   * the `fullscreenchange` listener — removed by its own effect cleanup (:378).
  //   * ★ FULLSCREEN ITSELF — nobody unwound this, and it is the whole reason this function exists.
  //     `toggleFullscreen` above puts the document into fullscreen on `screenRef`; leaving the
  //     screen does not take it out, so the operator landed back on Setup with the browser still
  //     fullscreen and the only control that could undo it left behind on the race screen.
  //
  // NOT unwound, deliberately: `KEYS.LAST_RACE_SEED`, written at start by `SetupScreen.jsx:180`
  // into a store that outlives the tab. It is the RECORD of a seed that really was used — a race did
  // run — and erasing it would destroy the only trace of a drawn seed. And `raceResults`, which this
  // race never wrote: it is written only once every racer has finished (:1108), so a cancelled race
  // leaves no result of its own. Clearing an EARLIER race's result would be touching the result
  // recording, which this piece must not do.
  function cancelRace() {
    // Order matters only in that fullscreen is asked for before the component goes away: after the
    // navigation this handler's element is gone, and `exitFullscreen` rejects if the document is not
    // in fullscreen, so it is both guarded and caught.
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.()?.catch?.(() => {});
      } catch {
        /* a browser that refuses the exit must not also lose the operator the way back to Setup */
      }
    }
    sessionStorage.removeItem('activeRace');
    // PARTICLES-VISIBILITY-12: a cancelled test race goes back to the Track Editor it came from.
    fadeNavigate(raceData?.testRace ? TEST_RACE_RETURN_ROUTE : '/setup');
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
          <button className="race-back-btn" onClick={cancelRace}>
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

  // ── CEREMONY-SKIP-1: end this beat, land on the next ───────────────────────────────────────
  //
  // ON THE WRAPPER, NOT ON A CANVAS. During the brand beat a DOM card covers the canvas, so a
  // handler on the canvas alone would be dead exactly where the first skip is wanted. The card is a
  // child of `.race-canvas-wrapper`, so one handler there catches both by bubbling.
  //
  // IT MOVES THE ONE CLOCK AND NOTHING ELSE. No beat is cancelled and no beat is named here.
  const onCeremonyClick = (e) => {
    if (!ceremonySkipOnClick) return;
    if (e.button !== 0) return; // left click only
    const st = g.current;
    if (!st || st.phase !== PHASE.COUNTDOWN || st.countdownStart == null) return;
    const cam = camDirRef.current;
    if (!cam) return;
    const sched = cam.ceremonySchedule(st.racers);
    const now = performance.now();
    const next = nextBeatStart(now - st.countdownStart, sched);
    // Backwards by the remainder: elapsed becomes exactly `next` on the following frame.
    st.countdownStart = now - next;
  };

  // ★★ STAY-ON-THE-FINISH-1: THE WAY OFF THE PICTURE, and it is an affordance that already existed.
  //
  // WHY A CLICK ON THE PICTURE AND NOT A NEW BUTTON OR A KEY. This screen already answers a left
  // click on the race picture by moving the show along — that is CEREMONY-SKIP-1 at the start, on
  // this very wrapper. An operator who has learnt "click the picture to get on with it" for the
  // opening needs nothing new for the closing, and a second gesture for the same intention would be
  // the thing to explain. It costs no config key, no number and no element.
  //
  // IT IS ONLY LIVE WHEN THE PICTURE WOULD OTHERWISE STAND: with the switch ON the screen hands over
  // by itself and this is not needed; before the last racer is home there is a race to watch and a
  // stray click must not end it. So: FINISHED, and the switch OFF. Outside that it does nothing,
  // which is why "stay" cannot become "stuck".
  const onFinishClick = (e) => {
    if (autoAdvance) return; // the timer above is already taking us there
    if (e.button !== 0) return; // left click only, as the ceremony skip is
    if (g.current?.phase !== PHASE.FINISHED) return;
    raceData?.testRace
      ? fadeNavRef.current(TEST_RACE_RETURN_ROUTE)
      : fadeNavRef.current('/results');
  };

  // ONE HANDLER ON THE WRAPPER, because an element may carry one `onMouseDown`. The two intentions
  // it serves cannot both fire: the ceremony skip is guarded on PHASE.COUNTDOWN and the hand-over on
  // PHASE.FINISHED. It is NAMED rather than written inline so the attachment stays checkable from
  // the source, which is what `ceremonySkip.test.jsx` does and what caught this change.
  const onCanvasMouseDown = (e) => {
    onCeremonyClick(e);
    onFinishClick(e);
  };

  return (
    <div ref={screenRef} className="screen screen--race">
      <div className="race-layout">
        <div
          className="race-canvas-wrapper"
          onMouseDown={onCanvasMouseDown}
          data-testid="race-canvas-wrapper"
        >
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
          {/* TEST-AIDS-1, item 7: the M-key camera marker is not mounted while the switch is OFF. */}
          {aids && <CameraMarkerHUD buildRef={markerBuildRef} />}
          <PerfLogHUD perfLogRef={perfLogRef} visible={enablePerfLog} getContext={getPerfContext} />
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
          {/* CEREMONY-OPENING-1: the opening card, and the logo that must step aside for the board.
              The logo is unmounted rather than hidden while the board stands — it is an `<img>` with
              its own opacity, and leaving it up at zero would still put it in the compositor over
              the names it was covering. It returns the moment the board goes.
              It is also away during the CARD, which the first browser run made obvious: the card
              shows the same logo at ten times the size, and the corner copy beside it read as a
              duplicate rather than as branding. */}
          <CeremonyBrandCard
            brand={activeBrand?.logo ? activeBrand : null}
            raceName={raceData?.eventName ?? null}
            visible={ceremonyBrandUp}
          />
          {!ceremonyBoardUp && !ceremonyBrandUp && <BrandLogoOverlay />}
          {/* WINNER-CARD-1: the closing card, and it is INSIDE this wrapper for the same reason the
              opening card is — the standings `<aside>` is a SIBLING of the wrapper, so a card
              positioned in here cannot cover them at any size. The accent is the brand's primary,
              which is the same choice the result screen's podium accent makes. */}
          <WinnerCard
            winner={winnerCard}
            accentColor={activeBrand?.primaryColor ?? null}
            visible={winnerCardUp}
          />
        </div>

        <aside className="race-hud">
          {/* The SAME control and the same one effect throughout; only its name follows what it is
              doing. While the race is running it cancels one, and saying "← Setup" was the reason
              the fullscreen leak went unnoticed — it read as navigation. Once every racer is home
              there is no longer a race to cancel and it is navigation again. */}
          <button className="race-back-btn" data-testid="cancel-race" onClick={cancelRace}>
            {phase === PHASE.FINISHED ? '← Setup' : 'Cancel Race'}
          </button>

          {/* STANDINGS-RULE: the panel's composition lives in Scoreboard.jsx, so the guard that
              holds the two-layer rule can mount THE REAL arrangement rather than a copy of it.
              docs/STANDINGS-ARCHITECTURE.md is the rule's one home. */}
          <Scoreboard
            cards={scoreboardCards}
            rosterIcon={rosterIcon}
            attach={attachScoreboardCard}
          />

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
