import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { findPointAtPosition, findSegmentNearPoint } from './trackEditorHelpers.js';
import { drawStaticScene } from './trackEditorDraw.js';
import { extractEffects, extractTrackLights } from './trackEditorSave.js';
import { DEFAULT_TRACK_LIGHTS } from '../../modules/trackLights.js';
import { useHistory } from './useHistory.js';
import { useViewport } from './useViewport.js';
import { useTrackIO } from './useTrackIO.js';
import { API_BASE_URL } from '../../services/api.js';
import { getEffect } from '../../modules/track-effects/index.js';
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

    const instances = activeEffects
      .map((e) => {
        const mod = getEffect(e.id);
        return mod ? mod.create(canvas, e.config) : null;
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
      ctx.restore();

      for (const inst of effectInstanceRef.current) {
        inst.update(dt);
        ctx.save();
        inst.render(ctx);
        ctx.restore();
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
  }, [effectsJson]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setIsDirty,
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
      </div>
    </div>
  );
}
