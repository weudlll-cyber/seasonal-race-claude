// ============================================================
// File:        TrackEditor.jsx
// Path:        client/src/screens/TrackEditor/TrackEditor.jsx
// Project:     RaceArena
// Created:     2026-04-25
// Description: Full-screen track editor — Catmull-Rom spline drawing, undo/redo,
//              effects config, and server save/load. Beside the whole-track view, a race-view
//              panel shows the track and its effects at the race camera's racing zoom
//              (PARTICLES-VISIBILITY-10, raceView.js), with the track lines, three racers at race
//              size and the panel's area framed in the main view (PARTICLES-VISIBILITY-11).
// ============================================================

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { findPointAtPosition, findSegmentNearPoint } from './trackEditorHelpers.js';
import { drawStaticScene } from './trackEditorDraw.js';
import { extractEffects, extractTrackLights } from './trackEditorSave.js';
import { DEFAULT_TRACK_LIGHTS } from '../../modules/trackLights.js';
import { useHistory } from './useHistory.js';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  clearLegacyDraft,
  draftPointCount,
} from './trackEditorDraft.js';
import { useViewport } from './useViewport.js';
import { useTrackIO } from './useTrackIO.js';
import { API_BASE_URL } from '../../services/api.js';
import { getEffect } from '../../modules/track-effects/index.js';
import { loadCameraConfig } from '../../modules/cameraConfig.js';
import { loadAutoScaleConfig } from '../../modules/autoSpriteScale.js';
import { loadRaceBehaviorConfig } from '../../modules/raceBehaviorConfig.js';
import { storageGet, KEYS } from '../../modules/storage/storage.js';
import { getRacerType } from '../../racer-types/index.js';
import {
  RACE_VIEW_W,
  RACE_VIEW_H,
  RACE_VIEW_FIELD_SIZE,
  raceViewScale,
  raceViewStart,
  raceViewCourse,
  raceViewRacerPlacements,
  raceViewRacerScale,
  raceViewRowSlotPx,
  drawRaceViewFrame,
  drawRaceView,
} from './raceView.js';
import { useServerTracksControl } from '../../modules/storage/useServerTracks.js';
import TrackEditorToolbar from './TrackEditorToolbar.jsx';
import TrackEditorSaveBar from './TrackEditorSaveBar.jsx';
import s from './TrackEditor.module.css';

const CW = 1280;
const CH = 720;
const HIT_RADIUS = 10;
const INSERT_TOLERANCE = 8;
const CURVE_SAMPLES = 200;
const SLIDER_DEBOUNCE_MS = 400;
const NAME_DEBOUNCE_MS = 600;

const MAX_BG_W = 8000;
const MAX_BG_H = 4096;
const MAX_BG_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — checked before FileReader to avoid OOM

export default function TrackEditor() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const serverTracksCtl = useServerTracksControl();

  // ── canvas / UI refs ──────────────────────────────────────────────────────
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const fileInputRef = useRef(null);
  const wrapperRef = useRef(null);
  // PARTICLES-VISIBILITY-10: the race-view panel's canvas, what it currently shows, and the one-shot
  // redraw that waits for its background image while no effect loop is running.
  const raceViewCanvasRef = useRef(null);
  const raceViewRef = useRef(null);
  const raceViewRetryRef = useRef(null);
  const saveTimerRef = useRef(null);
  const saveBarRef = useRef(null);

  // ── drag tracking refs ────────────────────────────────────────────────────
  const dragIndexRef = useRef(-1);
  const hasDraggedRef = useRef(false);
  const preDragSnapshotRef = useRef(null);

  // ── viewport (zoom, pan, world size) ─────────────────────────────────────
  const {
    viewZoom,
    viewPanX,
    viewPanY,
    editorWorldW,
    editorWorldH,
    viewTransformRef,
    isPanningRef,
    panStartRef,
    didPanRef,
    setViewPanX,
    setViewPanY,
    handleFitToScreen,
    getCanvasCoords,
    setWorldSize,
    resetViewport,
  } = useViewport(canvasRef);

  // ── effect preview refs ────────────────────────────────────────────────────
  const effectInstanceRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const renderStateRef = useRef({});

  // ── debounce refs for history ─────────────────────────────────────────────
  const sliderHistoryTimerRef = useRef(null);
  const preSliderSnapshotRef = useRef(null);
  const nameHistoryTimerRef = useRef(null);
  const preNameSnapshotRef = useRef(null);
  const effectHistoryTimerRef = useRef(null);
  const preEffectSnapshotRef = useRef(null);
  const lightsHistoryTimerRef = useRef(null);
  const preLightsSnapshotRef = useRef(null);

  // ── history hook ──────────────────────────────────────────────────────────
  const { pushHistory, undo, redo, canUndo, canRedo, resetHistory } = useHistory();

  // ── versioned state (tracked by history) ─────────────────────────────────
  const [centerPoints, setCenterPoints] = useState([]);
  const [innerPoints, setInnerPoints] = useState([]);
  const [outerPoints, setOuterPoints] = useState([]);
  const [mode, setMode] = useState('center');
  const [activeBoundary, setActiveBoundary] = useState('inner');
  const [centerWidth, setCenterWidth] = useState(120);
  const [closed, setClosed] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(null);
  // The camera config the race reads (RaceScreen/index.jsx, `loadCameraConfig`), so the panel's zoom
  // follows the owner's own camera settings. Read once, as the race does at its start.
  const [cameraConfig] = useState(() => loadCameraConfig());
  // PARTICLES-VISIBILITY-11: the two other configs the race sizes a racer from, as it loads them.
  const [autoScaleConfig] = useState(() => loadAutoScaleConfig());
  const [behaviorConfig] = useState(() => loadRaceBehaviorConfig());
  // Where the race view looks: null = the start of the track (raceViewStart), else a clicked point.
  const [raceViewCentre, setRaceViewCentre] = useState(null);
  const [bgUploadError, setBgUploadError] = useState(null);
  const [effects, setEffects] = useState([]);
  const [trackLights, setTrackLights] = useState(DEFAULT_TRACK_LIGHTS);

  // ── server I/O (save / load / delete) ────────────────────────────────────
  const {
    loadedGeometryId,
    setLoadedGeometryId,
    loadedServerId,
    setLoadedServerId,
    localTracks,
    saveLabel,
    isSaving,
    serverError,
    setServerError,
    handleSave: _ioHandleSave,
    handleRemoveBackground: _ioHandleRemoveBg,
    handleDelete: _ioHandleDelete,
  } = useTrackIO({ serverTracksCtl, saveTimerRef });

  // ── non-versioned state ───────────────────────────────────────────────────
  const [bgReady, setBgReady] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [boundarySwitchConfirmed, setBoundarySwitchConfirmed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // ★ POLISH-4d: a non-error notice after a successful save (e.g. saved with no background).
  const [saveHint, setSaveHint] = useState(null);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // backgroundFile — set when user picks a new local image; cleared after upload
  const [backgroundFile, setBackgroundFile] = useState(null);

  // ── combined load dropdown list (local + server, deduplicated) ───────────
  const allSavedTracks = useMemo(() => {
    const serverGeoIds = new Set(serverTracksCtl.tracks.map((t) => t.geometryId));
    return [
      ...localTracks
        .filter((t) => !serverGeoIds.has(t.id))
        .map((t) => ({ id: t.id, name: t.name, serverId: null })),
      ...serverTracksCtl.tracks.map((t) => ({ id: t.geometryId, name: t.name, serverId: t.id })),
    ];
  }, [localTracks, serverTracksCtl.tracks]);

  // ── helpers ───────────────────────────────────────────────────────────────

  function getSnapshot() {
    return {
      centerPoints,
      innerPoints,
      outerPoints,
      centerWidth,
      mode,
      activeBoundary,
      closed,
      name: trackName,
      backgroundImage,
      effects,
      trackLights,
    };
  }

  const applySnapshot = useCallback((snapshot) => {
    setCenterPoints(snapshot.centerPoints);
    setInnerPoints(snapshot.innerPoints);
    setOuterPoints(snapshot.outerPoints);
    setCenterWidth(snapshot.centerWidth);
    setMode(snapshot.mode);
    setActiveBoundary(snapshot.activeBoundary);
    setClosed(snapshot.closed);
    setTrackName(snapshot.name);
    setBackgroundImage(snapshot.backgroundImage);
    setEffects(snapshot.effects ?? []);
    setTrackLights(snapshot.trackLights ?? DEFAULT_TRACK_LIGHTS);
    setSelectedPointIndex(-1);
  }, []);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const setActiveList = useCallback(
    (updater) => {
      if (mode === 'center') return setCenterPoints(updater);
      if (activeBoundary === 'inner') return setInnerPoints(updater);
      return setOuterPoints(updater);
    },
    [mode, activeBoundary]
  );

  const handleUndo = useCallback(() => {
    const snapshot = undo({
      centerPoints,
      innerPoints,
      outerPoints,
      centerWidth,
      mode,
      activeBoundary,
      closed,
      name: trackName,
      backgroundImage,
      effects,
    });
    if (snapshot) {
      applySnapshot(snapshot);
      markDirty();
    }
  }, [
    undo,
    applySnapshot,
    markDirty,
    centerPoints,
    innerPoints,
    outerPoints,
    centerWidth,
    mode,
    activeBoundary,
    closed,
    trackName,
    backgroundImage,
    effects,
  ]);

  const handleRedo = useCallback(() => {
    const snapshot = redo({
      centerPoints,
      innerPoints,
      outerPoints,
      centerWidth,
      mode,
      activeBoundary,
      closed,
      name: trackName,
      backgroundImage,
      effects,
    });
    if (snapshot) {
      applySnapshot(snapshot);
      markDirty();
    }
  }, [
    redo,
    applySnapshot,
    markDirty,
    centerPoints,
    innerPoints,
    outerPoints,
    centerWidth,
    mode,
    activeBoundary,
    closed,
    trackName,
    backgroundImage,
    effects,
  ]);

  // ── effects ───────────────────────────────────────────────────────────────

  // Load background image whenever backgroundImage state changes.
  // Null-guard avoids creating an Image for null/undefined (prevents img.src = "null").
  // cancelled flag ensures stale callbacks from a superseded effect run are ignored.
  useEffect(() => {
    if (!backgroundImage) {
      bgRef.current = null;
      setBgReady(true);
      return;
    }
    setBgReady(false);
    bgRef.current = null;
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (!cancelled) {
        bgRef.current = img;
        setBgReady(true);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        bgRef.current = null;
        setBgReady(true);
      }
    };
    img.src = backgroundImage;
    return () => {
      cancelled = true;
    };
  }, [backgroundImage]);

  // ★ THE CRASH DRAFT (POLISH-2026-09-24B). Drawing a track is minutes of mouse work that lives
  // only in React state until Save succeeds; a refresh used to lose all of it.
  //
  // OFFERED ONCE, ON MOUNT, AND ONLY WHEN THERE IS NOTHING TO OVERWRITE. Silently restoring would
  // be its own way to lose work, so it ASKS — and it does not ask at all when the editor was opened
  // on an existing track (`?load=`) or when anything has already been drawn, because in both cases
  // accepting would destroy what is on screen.
  const draftOfferedRef = useRef(false);
  useEffect(() => {
    if (draftOfferedRef.current) return;
    draftOfferedRef.current = true;
    // ★ Q-22b: a draft written by a pre-per-track build can never be offered again, so clear it
    // rather than leaving it in storage forever.
    clearLegacyDraft();
    // ★★ BOTH MODES NOW. The new-track case is `null` → the `:new` key; an edit is the track's own
    // server id → its own key. Two tracks can no longer overwrite each other's draft.
    //
    // ★ IT STILL DOES NOT OFFER OVER WORK ALREADY ON SCREEN. In load mode the geometry arrives
    // asynchronously, so "nothing drawn yet" is checked at the moment the offer is made, and the
    // load effect below sets `centerPoints` before this can fire for a track that loaded first.
    const loadId = searchParams.get('load');
    if (centerPoints.length || innerPoints.length || outerPoints.length) return;
    const d = loadDraft(undefined, undefined, loadId ?? null);
    if (!d) return;
    const when = new Date(d.savedAt).toLocaleString();
    const name = d.trackName ? ` “${d.trackName}”` : '';
    const ok = window.confirm(
      `An unsaved track${name} from ${when} was found (${draftPointCount(d)} points).\n\n` +
        'Restore it? Cancel discards it.'
    );
    if (!ok) {
      clearDraft(undefined, loadId ?? null);
      return;
    }
    setCenterPoints(d.centerPoints);
    setInnerPoints(d.innerPoints);
    setOuterPoints(d.outerPoints);
    setClosed(!!d.closed);
    if (typeof d.centerWidth === 'number') setCenterWidth(d.centerWidth);
    if (d.trackName) setTrackName(d.trackName);
    setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write the draft whenever the geometry changes. `saveDraft` writes nothing for an empty drawing,
  // so clearing the canvas does not overwrite a real draft with an empty one.
  //
  // ★★ BOTH MODES, SINCE Q-22b (2026-09-24). This was gated to new-track only while the key was a
  // single one — writing drafts in load mode that could never be offered would have stored data
  // nobody sees. With a per-track key the offer reaches them, so the gate is gone.
  const draftId = searchParams.get('load') ?? null;
  useEffect(() => {
    saveDraft(
      { centerPoints, innerPoints, outerPoints, closed, centerWidth, trackName },
      undefined,
      draftId
    );
  }, [draftId, centerPoints, innerPoints, outerPoints, closed, centerWidth, trackName]);

  // Auto-load a track when ?load=<serverId> is in the URL (from TrackManager Edit button).
  // Runs whenever server tracks or the geometry cache list become available.
  // Two-path load:
  //   1. Geometry cache path — used when the track already has a drawn geometry in localStorage.
  //   2. Server-track direct path — used for tracks with geometryId: null (no geometry yet).
  useEffect(() => {
    const preloadId = searchParams.get('load');
    if (!preloadId) return;

    // Path 1: try loading via geometry cache (covers tracks that already have geometry)
    const entry = allSavedTracks.find((t) => t.serverId === preloadId || t.id === preloadId);
    if (entry?.id) {
      const track = getTrack(entry.id);
      if (track) {
        loadTrackData(track, entry.serverId ?? null);
        setSearchParams({}, { replace: true });
        return;
      }
    }

    // Path 2: load directly from server tracks state (for tracks without geometry in cache)
    const serverTrack = serverTracksCtl.tracks.find((t) => t.id === preloadId);
    if (!serverTrack) return;
    const bgUrl = serverTrack.backgroundImageFile
      ? `${API_BASE_URL}/api/tracks/${serverTrack.id}/background`
      : null;
    // Map to the shape loadTrackData expects: id = geometryId (null when no geometry drawn yet)
    loadTrackData(
      { ...serverTrack, id: serverTrack.geometryId, backgroundImage: bgUrl },
      serverTrack.id
    );
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSavedTracks, serverTracksCtl.tracks]);

  // Scroll to top on mount so toolbar and saveBar are visible from the start.
  // React Router does not auto-reset scroll on navigation.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // When a server error appears, scroll the saveBar into view so it is never hidden.
  useEffect(() => {
    if (serverError && saveBarRef.current) {
      saveBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [serverError]);

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Flush debounce timers on unmount to avoid calling setState after unmount
  useEffect(() => {
    return () => {
      if (sliderHistoryTimerRef.current) clearTimeout(sliderHistoryTimerRef.current);
      if (nameHistoryTimerRef.current) clearTimeout(nameHistoryTimerRef.current);
      if (effectHistoryTimerRef.current) clearTimeout(effectHistoryTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── race view (PARTICLES-VISIBILITY-10) ───────────────────────────────────
  // The zoom is the race camera's own ordinary racing zoom for this track (raceView.js names the
  // camera functions it calls). The track width is the one the race passes, `geometry.width`, which
  // is `centerWidth` for a centre-mode track; a boundary-mode track has none here, and the camera's
  // reference corridor then stands alone (referenceWidthFor takes the larger of the two).
  const raceViewZoom = useMemo(
    () =>
      raceViewScale({
        worldW: editorWorldW,
        worldH: editorWorldH,
        isOpenTrack: !closed,
        trackWidthPx: mode === 'center' ? centerWidth : NaN,
        cameraConfig,
      }),
    [editorWorldW, editorWorldH, closed, mode, centerWidth, cameraConfig]
  );
  const raceViewCentreNow =
    raceViewCentre ??
    raceViewStart({
      mode,
      centerPoints,
      innerPoints,
      outerPoints,
      worldW: editorWorldW,
      worldH: editorWorldH,
    });
  // PARTICLES-VISIBILITY-11: the track lines the panel draws are the main view's own scene state.
  const raceViewLines = {
    mode,
    centerPoints,
    innerPoints,
    outerPoints,
    activeBoundary,
    selectedPointIndex,
    centerWidth,
    closed,
  };
  // PARTICLES-VISIBILITY-11: three racers of the track's own type, sized as the race sizes them for a
  // RACE_VIEW_FIELD_SIZE field at this zoom. The type is the one Setup would race here — the track's
  // `defaultRacerTypeId`, else 'horse' (SetupScreen.jsx) — and the width the one the race passes: the
  // centre width, or for a boundary track the corridor where the racers stand.
  const raceViewRacerTypeId =
    serverTracksCtl.tracks.find((t) => t.id === loadedServerId)?.defaultRacerTypeId ?? 'horse';
  const raceViewHasSizeOverride = useMemo(() => {
    const o = storageGet(KEYS.RACER_TYPE_OVERRIDES, {})[raceViewRacerTypeId];
    return !!o && typeof o === 'object' && 'displaySize' in o;
  }, [raceViewRacerTypeId]);
  const raceViewCourseNow = raceViewCourse(raceViewLines, raceViewCentreNow);
  let raceViewRacers = null;
  if (raceViewCourseNow) {
    const racerType = getRacerType(raceViewRacerTypeId);
    raceViewRacers = {
      racerType,
      displayScale: raceViewRacerScale({
        racerType,
        trackWidthPx: mode === 'center' ? centerWidth : raceViewCourseNow.width,
        scaleX: raceViewZoom.scaleX,
        cameraConfig,
        autoScaleConfig,
        behaviorConfig,
        hasDisplaySizeOverride: raceViewHasSizeOverride,
      }),
      placements: raceViewRacerPlacements(
        raceViewCourseNow,
        raceViewRowSlotPx({
          racerType,
          trackWidthPx: mode === 'center' ? centerWidth : raceViewCourseNow.width,
          autoScaleConfig,
          behaviorConfig,
          hasDisplaySizeOverride: raceViewHasSizeOverride,
        })
      ),
    };
  }
  raceViewRef.current = {
    centre: raceViewCentreNow,
    scaleX: raceViewZoom.scaleX,
    scaleY: raceViewZoom.scaleY,
    bgPath: backgroundImage,
    worldW: editorWorldW,
    worldH: editorWorldH,
    lines: raceViewLines,
    racers: raceViewRacers,
  };

  // Canvas render effect — mirrors state into renderStateRef and draws with viewport transform.
  useEffect(() => {
    renderStateRef.current = {
      bgImage: bgRef.current,
      mode,
      centerPoints,
      innerPoints,
      outerPoints,
      activeBoundary,
      selectedPointIndex,
      centerWidth,
      closed,
      worldW: editorWorldW,
      worldH: editorWorldH,
    };
    if (rafRef.current) return; // rAF loop redraws every frame; skip immediate draw
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CW, CH);
    ctx.save();
    const bsX = CW / editorWorldW;
    const bsY = CH / editorWorldH;
    ctx.scale(viewZoom * bsX, viewZoom * bsY);
    ctx.translate(-viewPanX, -viewPanY);
    drawStaticScene(ctx, renderStateRef.current);
    // PARTICLES-VISIBILITY-11: the race view's area, framed; it follows every recentre.
    drawRaceViewFrame(ctx, raceViewRef.current, Math.min(viewZoom * bsX, viewZoom * bsY));
    ctx.restore();
  }, [
    centerPoints,
    innerPoints,
    outerPoints,
    mode,
    activeBoundary,
    selectedPointIndex,
    bgReady,
    centerWidth,
    closed,
    editorWorldW,
    editorWorldH,
    viewZoom,
    viewPanX,
    viewPanY,
    raceViewCentre,
    raceViewZoom,
  ]);

  // Draws the race view when no effect loop is running (the loop below draws it every frame). The
  // race's background cache reports no load event, so while its image is still loading this asks
  // for one more frame, and stops as soon as the image is drawn.
  useEffect(() => {
    const drawOnce = (frame) => {
      raceViewRetryRef.current = null;
      if (rafRef.current) return;
      const ctx = raceViewCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      const drawn = drawRaceView(ctx, { ...raceViewRef.current, frame: frame ?? 0 }, []);
      if (!drawn) raceViewRetryRef.current = requestAnimationFrame(drawOnce);
    };
    drawOnce();
    return () => {
      if (raceViewRetryRef.current) cancelAnimationFrame(raceViewRetryRef.current);
      raceViewRetryRef.current = null;
    };
  }, [
    raceViewCentre,
    raceViewZoom,
    backgroundImage,
    editorWorldW,
    editorWorldH,
    mode,
    centerPoints,
    innerPoints,
    outerPoints,
    effects,
    activeBoundary,
    selectedPointIndex,
    centerWidth,
    closed,
    raceViewRacerTypeId,
  ]);

  // Effect preview — starts/stops the rAF animation loop based on the effects array.
  // Uses JSON.stringify to detect deep changes and avoid re-running on reference churn.
  const effectsJson = JSON.stringify(effects);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    effectInstanceRef.current = null;
    lastTimeRef.current = null;

    const activeEffects = effects.filter((e) => e.id);
    if (activeEffects.length === 0) return;

    // PARTICLES-VISIBILITY-9: the preview places effects over the WORLD, as the race does
    // (RaceScreen/index.jsx, `effectWorld`), and draws them inside the loop's world transform below.
    // Created with the canvas alone, it packed the race's whole-track amount into one screen and
    // drew each item at its world size in screen pixels, so it showed far more than the race.
    const effectWorld = { width: editorWorldW, height: editorWorldH };
    const instances = activeEffects
      .map((e) => {
        const mod = getEffect(e.id);
        return mod ? mod.create(canvas, e.config, effectWorld) : null;
      })
      .filter(Boolean);

    if (instances.length === 0) return;

    effectInstanceRef.current = instances;

    const loop = (timestamp) => {
      const dt = lastTimeRef.current != null ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, CW, CH);
      ctx.save();
      const { zoom, panX, panY, worldW, worldH } = viewTransformRef.current;
      const bsX = CW / worldW;
      const bsY = CH / worldH;
      ctx.scale(zoom * bsX, zoom * bsY);
      ctx.translate(-panX, -panY);
      drawStaticScene(ctx, renderStateRef.current);
      // PARTICLES-VISIBILITY-9: effects draw inside the same world-to-screen transform as the track,
      // so zoom and pan move them with it and each effect culls against this view (cullBounds).
      for (const inst of effectInstanceRef.current) {
        inst.update(dt);
        ctx.save();
        inst.render(ctx);
        ctx.restore();
      }
      // PARTICLES-VISIBILITY-11: the race view's area, framed, on top of the effects.
      drawRaceViewFrame(ctx, raceViewRef.current, Math.min(zoom * bsX, zoom * bsY));
      ctx.restore();

      // PARTICLES-VISIBILITY-10: the race view draws the SAME instances, already advanced above, at the
      // race camera's zoom — one state, two views, no second copy of any effect.
      const raceViewCtx = raceViewCanvasRef.current?.getContext('2d');
      if (raceViewCtx) {
        drawRaceView(
          raceViewCtx,
          { ...raceViewRef.current, frame: timestamp },
          effectInstanceRef.current
        );
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      effectInstanceRef.current = null;
      lastTimeRef.current = null;
    };
    // The world size is a dependency: loading a track of another size re-creates the effects over it.
  }, [effectsJson, editorWorldW, editorWorldH]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── pointer handlers ──────────────────────────────────────────────────────

  function handlePointerDown(e) {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    const idx = findPointAtPosition(activeList, coords.x, coords.y, HIT_RADIUS);
    if (idx !== -1) {
      preDragSnapshotRef.current = getSnapshot();
      hasDraggedRef.current = false;
      dragIndexRef.current = idx;
      setSelectedPointIndex(idx);
      setIsDragging(true);
      canvasRef.current.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else {
      // Background drag — start pan
      isPanningRef.current = true;
      didPanRef.current = false;
      panStartRef.current = {
        screenX: e.clientX,
        screenY: e.clientY,
        panX: viewTransformRef.current.panX,
        panY: viewTransformRef.current.panY,
      };
      canvasRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  }

  function handlePointerMove(e) {
    if (isDragging && dragIndexRef.current !== -1) {
      const coords = getCanvasCoords(e);
      if (!coords) return;
      hasDraggedRef.current = true;
      setActiveList((prev) => {
        const next = [...prev];
        next[dragIndexRef.current] = { x: coords.x, y: coords.y };
        return next;
      });
      return;
    }

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.screenX;
      const dy = e.clientY - panStartRef.current.screenY;
      if (!didPanRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        didPanRef.current = true;
      }
      if (didPanRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const { zoom, worldW, worldH } = viewTransformRef.current;
        const bsX = CW / worldW;
        const bsY = CH / worldH;
        const cssScaleX = CW / rect.width;
        const cssScaleY = CH / rect.height;
        const newPanX = panStartRef.current.panX - (dx * cssScaleX) / (zoom * bsX);
        const newPanY = panStartRef.current.panY - (dy * cssScaleY) / (zoom * bsY);
        viewTransformRef.current.panX = newPanX;
        viewTransformRef.current.panY = newPanY;
        setViewPanX(newPanX);
        setViewPanY(newPanY);
      }
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;
    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    const hit = findPointAtPosition(activeList, coords.x, coords.y, HIT_RADIUS);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hit !== -1 ? 'grab' : 'crosshair';
    }
  }

  function handlePointerUp(e) {
    if (isDragging) {
      canvasRef.current?.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      dragIndexRef.current = -1;
      if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
      if (hasDraggedRef.current && preDragSnapshotRef.current) {
        pushHistory(preDragSnapshotRef.current);
        markDirty();
      }
      hasDraggedRef.current = false;
      preDragSnapshotRef.current = null;
      return;
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      canvasRef.current?.releasePointerCapture(e.pointerId);
    }
  }

  function handleCanvasClick(e) {
    if (dragIndexRef.current !== -1) return;
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;

    const hit = findPointAtPosition(activeList, coords.x, coords.y, HIT_RADIUS);
    if (hit !== -1) {
      setSelectedPointIndex(hit);
      // PARTICLES-VISIBILITY-10: a click on a point of the track also recentres the race view there.
      // It is the one click that edits nothing — it only selects — so recentring adds no new gesture
      // and changes no existing one; a click anywhere else still inserts or appends a point.
      setRaceViewCentre({ x: activeList[hit].x, y: activeList[hit].y });
      return;
    }

    const segment = findSegmentNearPoint(activeList, coords.x, coords.y, INSERT_TOLERANCE, closed);
    if (segment !== null) {
      const { insertAtIndex } = segment;
      pushHistory(getSnapshot());
      setActiveList((prev) => {
        const next = [...prev];
        next.splice(insertAtIndex, 0, { x: coords.x, y: coords.y });
        return next;
      });
      setSelectedPointIndex(insertAtIndex);
      markDirty();
      return;
    }

    pushHistory(getSnapshot());
    setActiveList((prev) => [...prev, { x: coords.x, y: coords.y }]);
    setSelectedPointIndex(activeList.length);
    markDirty();
  }

  function handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== -1) {
      e.preventDefault();
      pushHistory(getSnapshot());
      setActiveList((prev) => prev.filter((_, i) => i !== selectedPointIndex));
      setSelectedPointIndex(-1);
      markDirty();
    }
  }

  function handleReverse() {
    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    pushHistory(getSnapshot());
    setActiveList([...activeList].reverse());
    setSelectedPointIndex(-1);
    markDirty();
  }

  function handleSwitchToBoundary() {
    if (mode === 'boundary') return;
    if (mode === 'center' && centerPoints.length >= 2 && !boundarySwitchConfirmed) {
      const ok = window.confirm(
        'Switching to Boundary Mode will use the derived inner and outer lines as your new starting point and disconnect them from the centerline. You can continue editing the boundaries freely, but the centerline will no longer drive them. Continue?'
      );
      if (!ok) return;
      pushHistory(getSnapshot());
      const minPtsForTransfer = closed ? 3 : 2;
      if (centerPoints.length >= minPtsForTransfer) {
        try {
          const cc = catmullRomSpline(centerPoints, {
            closed,
            tension: 0.5,
            samples: CURVE_SAMPLES,
          });
          setInnerPoints(offsetCurve(cc, centerWidth / 2));
          setOuterPoints(offsetCurve(cc, -(centerWidth / 2)));
        } catch {
          // can't derive — proceed with whatever boundaries already exist
        }
      }
      setCenterPoints([]);
      setBoundarySwitchConfirmed(true);
    } else {
      pushHistory(getSnapshot());
    }
    setMode('boundary');
    setSelectedPointIndex(-1);
    markDirty();
  }

  // ── effect config ─────────────────────────────────────────────────────────

  function handleEffectsChange(nextEffects) {
    const prevIds = effects.map((e) => e.id).join(',');
    const nextIds = nextEffects.map((e) => e.id).join(',');
    if (prevIds !== nextIds || effects.length !== nextEffects.length) {
      // Structural change (add / remove / switch effect id) — single history step
      pushHistory(getSnapshot());
      setEffects(nextEffects);
      markDirty();
    } else {
      // Config-only change — debounced, same pattern as centerWidth slider
      if (!effectHistoryTimerRef.current) {
        preEffectSnapshotRef.current = getSnapshot();
      } else {
        clearTimeout(effectHistoryTimerRef.current);
      }
      setEffects(nextEffects);
      markDirty();
      effectHistoryTimerRef.current = setTimeout(() => {
        if (preEffectSnapshotRef.current) {
          pushHistory(preEffectSnapshotRef.current);
          preEffectSnapshotRef.current = null;
        }
        effectHistoryTimerRef.current = null;
      }, SLIDER_DEBOUNCE_MS);
    }
  }

  // ── track lights config ───────────────────────────────────────────────────

  function handleTrackLightsChange(patch) {
    const next = { ...trackLights, ...patch };
    if (!lightsHistoryTimerRef.current) {
      preLightsSnapshotRef.current = getSnapshot();
    } else {
      clearTimeout(lightsHistoryTimerRef.current);
    }
    setTrackLights(next);
    markDirty();
    lightsHistoryTimerRef.current = setTimeout(() => {
      if (preLightsSnapshotRef.current) {
        pushHistory(preLightsSnapshotRef.current);
        preLightsSnapshotRef.current = null;
      }
      lightsHistoryTimerRef.current = null;
    }, SLIDER_DEBOUNCE_MS);
  }

  // ── background image upload ───────────────────────────────────────────────

  function handleBgUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > MAX_BG_FILE_SIZE_BYTES) {
      setBgUploadError(
        `Image file too large (max 10 MB, got ${(file.size / 1024 / 1024).toFixed(1)} MB).`
      );
      return;
    }
    setBackgroundFile(file); // remember File for server upload
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w > MAX_BG_W || h > MAX_BG_H) {
          setBgUploadError(`Image too large. Maximum: ${MAX_BG_W}×${MAX_BG_H} pixels.`);
          return;
        }
        setBgUploadError(null);
        pushHistory(getSnapshot());
        setBackgroundImage(dataUrl);
        setWorldSize(w, h);
        markDirty();
      };
      img.onerror = () => setBgUploadError('Image could not be loaded.');
      img.src = dataUrl;
    };
    // The IMAGE decode already reports (above); the FILE READ did not. Two different failures —
    // a file that cannot be opened never reaches the decoder at all — and only one of them was
    // visible. Same channel, distinguishable message.
    reader.onerror = () => setBgUploadError('Background file could not be read.');
    reader.readAsDataURL(file);
  }

  // ── save / load / delete ──────────────────────────────────────────────────

  function loadTrackData(track, serverId) {
    setTrackName(track.name);
    setBackgroundImage(track.backgroundImage ?? null);
    setBackgroundFile(null);
    setBgUploadError(null);
    setClosed(track.closed === true);
    setLoadedGeometryId(track.id);
    setLoadedServerId(serverId ?? null);
    setEffects(extractEffects(track));
    // PARTICLES-VISIBILITY-10: a newly loaded track opens its race view on its own start.
    setRaceViewCentre(null);
    setTrackLights(extractTrackLights(track));
    setBoundarySwitchConfirmed(false);
    setSelectedPointIndex(-1);
    dragIndexRef.current = -1;
    setIsDragging(false);
    setIsDirty(false);
    setSaveAttempted(false);
    setSaveError(null);
    setServerError(null);
    resetHistory();

    resetViewport(track.worldWidth ?? 1280, track.worldHeight ?? 720);

    if (track.sourceMode === 'center') {
      setMode('center');
      setCenterPoints(track.centerPoints || []);
      setCenterWidth(track.width ?? 120);
      setInnerPoints(track.innerPoints || []);
      setOuterPoints(track.outerPoints || []);
    } else {
      setMode('boundary');
      setActiveBoundary('inner');
      setInnerPoints(track.innerPoints || []);
      setOuterPoints(track.outerPoints || []);
      setCenterPoints([]);
      setCenterWidth(120);
    }
  }

  async function handleSave() {
    await _ioHandleSave({
      mode,
      centerPoints,
      centerWidth,
      innerPoints,
      outerPoints,
      closed,
      trackName,
      backgroundImage,
      backgroundFile,
      effects,
      trackLights,
      editorWorldW,
      editorWorldH,
      setSaveAttempted,
      setSaveError,
      setSaveHint,
      setIsDirty: (dirty) => {
        setIsDirty(dirty);
        // ★ A SUCCESSFUL SAVE IS THE ONE THING THAT RETIRES A DRAFT. `useTrackIO` clears the dirty
        // flag exactly when the save landed, so that is the signal — rather than a second success
        // path here that could drift from it.
        if (dirty === false) clearDraft(undefined, draftId);
      },
      resetHistory,
      onBgUploaded: (url) => {
        setBackgroundImage(url);
        setBackgroundFile(null);
      },
    });
  }

  function handleLoad(e) {
    const geoId = e.target.value;
    if (!geoId) return;
    const entry = allSavedTracks.find((t) => t.id === geoId);
    const track = getTrack(geoId);
    if (!track) return;
    loadTrackData(track, entry?.serverId ?? null);
  }

  function handleRemoveBackground() {
    _ioHandleRemoveBg(backgroundFile, setBackgroundImage, setBackgroundFile);
  }

  function handleDelete() {
    _ioHandleDelete(trackName, () => {
      setCenterPoints([]);
      setInnerPoints([]);
      setOuterPoints([]);
      setTrackName('');
      setBackgroundImage(null);
      setBackgroundFile(null);
      setBgUploadError(null);
      setEffects([]);
      setBoundarySwitchConfirmed(false);
      setSelectedPointIndex(-1);
      setIsDirty(false);
      setSaveAttempted(false);
      setSaveError(null);
      setServerError(null);
      resetHistory();
    });
  }

  // ── toolbar / save-bar event handlers ────────────────────────────────────

  function handleModeCenterClick() {
    if (mode === 'center') return;
    pushHistory(getSnapshot());
    setMode('center');
    setSelectedPointIndex(-1);
    markDirty();
  }

  function handleBoundaryInnerClick() {
    if (activeBoundary === 'inner') return;
    pushHistory(getSnapshot());
    setActiveBoundary('inner');
    setSelectedPointIndex(-1);
  }

  function handleBoundaryOuterClick() {
    if (activeBoundary === 'outer') return;
    pushHistory(getSnapshot());
    setActiveBoundary('outer');
    setSelectedPointIndex(-1);
  }

  function handleClosedLoopClick() {
    if (closed) return;
    pushHistory(getSnapshot());
    setClosed(true);
    markDirty();
  }

  function handleOpenCourseClick() {
    if (!closed) return;
    pushHistory(getSnapshot());
    setClosed(false);
    markDirty();
  }

  function handleWidthChange(value) {
    if (!sliderHistoryTimerRef.current) {
      preSliderSnapshotRef.current = getSnapshot();
    } else {
      clearTimeout(sliderHistoryTimerRef.current);
    }
    setCenterWidth(value);
    markDirty();
    sliderHistoryTimerRef.current = setTimeout(() => {
      if (preSliderSnapshotRef.current) {
        pushHistory(preSliderSnapshotRef.current);
        preSliderSnapshotRef.current = null;
      }
      sliderHistoryTimerRef.current = null;
    }, SLIDER_DEBOUNCE_MS);
  }

  function handleWidthBlur() {
    if (sliderHistoryTimerRef.current) {
      clearTimeout(sliderHistoryTimerRef.current);
      sliderHistoryTimerRef.current = null;
      if (preSliderSnapshotRef.current) {
        pushHistory(preSliderSnapshotRef.current);
        preSliderSnapshotRef.current = null;
      }
    }
  }

  function handleLightsStyleChange(value) {
    pushHistory(getSnapshot());
    setTrackLights((prev) => ({ ...prev, style: value }));
    markDirty();
  }

  function handleNameChange(value) {
    if (!nameHistoryTimerRef.current) {
      preNameSnapshotRef.current = getSnapshot();
    } else {
      clearTimeout(nameHistoryTimerRef.current);
    }
    setTrackName(value);
    markDirty();
    nameHistoryTimerRef.current = setTimeout(() => {
      if (preNameSnapshotRef.current) {
        pushHistory(preNameSnapshotRef.current);
        preNameSnapshotRef.current = null;
      }
      nameHistoryTimerRef.current = null;
    }, NAME_DEBOUNCE_MS);
  }

  function handleNameBlur() {
    if (nameHistoryTimerRef.current) {
      clearTimeout(nameHistoryTimerRef.current);
      nameHistoryTimerRef.current = null;
      if (preNameSnapshotRef.current) {
        pushHistory(preNameSnapshotRef.current);
        preNameSnapshotRef.current = null;
      }
    }
  }

  function handleRetry() {
    setServerError(null);
    handleSave();
  }

  // ── derived labels ────────────────────────────────────────────────────────

  // Load mode: true when editing an existing server track (navigated here via ?load=<serverId>).
  // The name is read-only in this mode — it is managed in the Track Manager metadata form.
  const isLoadMode = loadedServerId !== null;

  const hasLoaded = !!(loadedGeometryId || loadedServerId);
  const saveDisabled =
    (!isLoadMode && !backgroundImage && !backgroundFile) || saveLabel !== 'Save' || isSaving;

  const counterLabel =
    mode === 'center'
      ? `Center: ${centerPoints.length}`
      : activeBoundary === 'inner'
        ? `Inner: ${innerPoints.length}`
        : `Outer: ${outerPoints.length}`;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className={s.screen}>
      <div className={s.topBar}>
        <button
          className={s.backBtn}
          onClick={() => {
            if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
            navigate('/dev');
          }}
        >
          ← Back to Dev Panel
        </button>
        <h1 className={s.title} data-testid="editor-title">
          {isLoadMode ? `Editing: ${trackName}` : 'New Track'}
        </h1>
        <div className={s.headerCounter}>{counterLabel}</div>
      </div>

      <TrackEditorToolbar
        mode={mode}
        activeBoundary={activeBoundary}
        closed={closed}
        canUndo={canUndo}
        canRedo={canRedo}
        centerWidth={centerWidth}
        editorWorldW={editorWorldW}
        editorWorldH={editorWorldH}
        viewZoom={viewZoom}
        effects={effects}
        trackLights={trackLights}
        onModeCenter={handleModeCenterClick}
        onModeBoundary={handleSwitchToBoundary}
        onBoundaryInner={handleBoundaryInnerClick}
        onBoundaryOuter={handleBoundaryOuterClick}
        onClosedLoop={handleClosedLoopClick}
        onOpenCourse={handleOpenCourseClick}
        onReverse={handleReverse}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onWidthChange={handleWidthChange}
        onWidthBlur={handleWidthBlur}
        onEffectsChange={handleEffectsChange}
        onLightsChange={handleTrackLightsChange}
        onLightsStyleChange={handleLightsStyleChange}
        onFitToScreen={handleFitToScreen}
      />

      <TrackEditorSaveBar
        barRef={saveBarRef}
        isLoadMode={isLoadMode}
        trackName={trackName}
        backgroundImage={backgroundImage}
        backgroundFile={backgroundFile}
        allSavedTracks={allSavedTracks}
        saveDisabled={saveDisabled}
        saveLabel={saveLabel}
        isSaving={isSaving}
        saveAttempted={saveAttempted}
        bgUploadError={bgUploadError}
        saveError={saveError}
        serverError={serverError}
        hasLoaded={hasLoaded}
        fileInputRef={fileInputRef}
        onNameChange={handleNameChange}
        onNameBlur={handleNameBlur}
        onBgUpload={handleBgUpload}
        onRemoveBg={handleRemoveBackground}
        onSave={handleSave}
        saveHint={saveHint}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onRetry={handleRetry}
      />

      <div className={s.main}>
        <div className={s.canvasWrapper} ref={wrapperRef} tabIndex={0} onKeyDown={handleKeyDown}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className={s.canvas}
            role="img"
            aria-label="Track editor canvas — click to place points, scroll to zoom, drag background to pan"
            onClick={handleCanvasClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
        <figure className={s.raceView}>
          <canvas
            ref={raceViewCanvasRef}
            width={RACE_VIEW_W}
            height={RACE_VIEW_H}
            className={s.raceViewCanvas}
            role="img"
            aria-label="Race view — the track and its effects at the race camera's racing zoom"
          />
          <figcaption className={s.raceViewCaption}>
            Race view — the race camera&apos;s racing zoom ({raceViewZoom.scaleY.toFixed(2)}× the
            world), the centre half of a race frame; three racers at the size of a{' '}
            {RACE_VIEW_FIELD_SIZE}-racer race. Click a track point to look there.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
