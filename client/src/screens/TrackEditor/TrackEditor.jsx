import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';
import {
  listTracks,
  getTrack,
  saveTrack,
  deleteTrack,
} from '../../modules/track-editor/trackStorage.js';
import { findPointAtPosition, findSegmentNearPoint } from './trackEditorHelpers.js';
import {
  buildTrackFromEditorState,
  validateEditorState,
  extractEffects,
} from './trackEditorSave.js';
import { useHistory } from './useHistory.js';
import { getEffect } from '../../modules/track-effects/index.js';
import EffectConfig from '../../components/EffectConfig/EffectConfig.jsx';
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

// drawStaticScene does NOT clear the canvas — callers apply the viewport
// transform first, then call this, then restore. clearRect must happen
// before the transform is applied so it uses raw canvas coordinates.
function drawStaticScene(ctx, state) {
  const {
    bgImage = null,
    mode = 'center',
    centerPoints = [],
    innerPoints = [],
    outerPoints = [],
    activeBoundary = 'inner',
    selectedPointIndex = -1,
    centerWidth = 120,
    closed = false,
    worldW = CW,
    worldH = CH,
  } = state ?? {};

  ctx.globalAlpha = 1;
  ctx.setLineDash([]);

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, worldW, worldH);
  } else {
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, worldW, worldH);
  }

  const minPts = closed ? 3 : 2;

  const tryDrawCurve = (pts, strokeStyle, lineWidth, dashed) => {
    if (pts.length < minPts) return;
    try {
      const curve = catmullRomSpline(pts, { closed, tension: 0.5, samples: CURVE_SAMPLES });
      ctx.beginPath();
      if (dashed) ctx.setLineDash([6, 4]);
      ctx.moveTo(curve[0].x, curve[0].y);
      for (let i = 1; i < curve.length; i++) ctx.lineTo(curve[i].x, curve[i].y);
      if (closed) ctx.closePath();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      if (dashed) ctx.setLineDash([]);
    } catch {
      // not enough points — skip
    }
  };

  if (mode === 'center') {
    if (centerPoints.length >= minPts) {
      try {
        const centerCurve = catmullRomSpline(centerPoints, {
          closed,
          tension: 0.5,
          samples: CURVE_SAMPLES,
        });
        ctx.globalAlpha = 0.9;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 1;
        for (const amount of [centerWidth / 2, -(centerWidth / 2)]) {
          const bc = offsetCurve(centerCurve, amount);
          ctx.beginPath();
          ctx.moveTo(bc[0].x, bc[0].y);
          for (let i = 1; i < bc.length; i++) ctx.lineTo(bc[i].x, bc[i].y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } catch {
        // skip
      }
    }
    tryDrawCurve(centerPoints, '#4fc3f7', 2, false);
    for (let i = 0; i < centerPoints.length; i++) {
      const pt = centerPoints[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (selectedPointIndex >= 0 && selectedPointIndex < centerPoints.length) {
      const pt = centerPoints[selectedPointIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else {
    const activeList = activeBoundary === 'inner' ? innerPoints : outerPoints;
    const inactiveList = activeBoundary === 'inner' ? outerPoints : innerPoints;
    ctx.globalAlpha = 0.3;
    tryDrawCurve(inactiveList, '#4fc3f7', 2, false);
    for (const pt of inactiveList) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    tryDrawCurve(activeList, '#4fc3f7', 2, false);
    for (let i = 0; i < activeList.length; i++) {
      const pt = activeList[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (selectedPointIndex >= 0 && selectedPointIndex < activeList.length) {
      const pt = activeList[selectedPointIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

export default function TrackEditor() {
  const navigate = useNavigate();

  // ── canvas / UI refs ──────────────────────────────────────────────────────
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const fileInputRef = useRef(null);
  const wrapperRef = useRef(null);
  const saveTimerRef = useRef(null);

  // ── drag tracking refs ────────────────────────────────────────────────────
  const dragIndexRef = useRef(-1);
  const hasDraggedRef = useRef(false);
  const preDragSnapshotRef = useRef(null);

  // ── pan tracking refs ─────────────────────────────────────────────────────
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ screenX: 0, screenY: 0, panX: 0, panY: 0 });
  const didPanRef = useRef(false);

  // ── viewport transform ref (always-current, used in wheel + rAF) ─────────
  const viewTransformRef = useRef({ zoom: 1.0, panX: 0, panY: 0, worldW: 1280, worldH: 720 });

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

  // ── viewport state ────────────────────────────────────────────────────────
  const [viewZoom, setViewZoom] = useState(1.0);
  const [viewPanX, setViewPanX] = useState(0);
  const [viewPanY, setViewPanY] = useState(0);
  const [editorWorldW, setEditorWorldW] = useState(1280);
  const [editorWorldH, setEditorWorldH] = useState(720);

  // ── non-versioned state ───────────────────────────────────────────────────
  const [bgReady, setBgReady] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedTrackId, setLoadedTrackId] = useState(null);
  const [savedTracks, setSavedTracks] = useState([]);
  const [saveLabel, setSaveLabel] = useState('Save');
  const [boundarySwitchConfirmed, setBoundarySwitchConfirmed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── keep viewTransformRef in sync with state ──────────────────────────────
  useEffect(() => {
    viewTransformRef.current = {
      zoom: viewZoom,
      panX: viewPanX,
      panY: viewPanY,
      worldW: editorWorldW,
      worldH: editorWorldH,
    };
  }, [viewZoom, viewPanX, viewPanY, editorWorldW, editorWorldH]);

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

  // Load background image whenever backgroundImage state changes
  useEffect(() => {
    setBgReady(false);
    bgRef.current = null;
    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      bgRef.current = img;
      setBgReady(true);
    };
    img.onerror = () => {
      bgRef.current = null;
      setBgReady(true);
    };
  }, [backgroundImage]);

  // Populate Load dropdown on mount
  useEffect(() => {
    setSavedTracks(listTracks());
  }, []);

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

  // Wheel zoom-to-cursor — uses { passive: false } so we can preventDefault
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (CW / rect.width);
    const canvasY = (e.clientY - rect.top) * (CH / rect.height);

    const { zoom, panX, panY, worldW, worldH } = viewTransformRef.current;
    const bsX = CW / worldW;
    const bsY = CH / worldH;

    // World coordinate currently under the cursor
    const worldX = canvasX / (zoom * bsX) + panX;
    const worldY = canvasY / (zoom * bsY) + panY;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.1, Math.min(10, zoom * factor));

    // Reposition pan so the world point under cursor stays fixed
    const newPanX = worldX - canvasX / (newZoom * bsX);
    const newPanY = worldY - canvasY / (newZoom * bsY);

    // Update ref immediately (rAF loop reads this)
    viewTransformRef.current.zoom = newZoom;
    viewTransformRef.current.panX = newPanX;
    viewTransformRef.current.panY = newPanY;

    setViewZoom(newZoom);
    setViewPanX(newPanX);
    setViewPanY(newPanY);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

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

  // ── canvas coordinate helpers ─────────────────────────────────────────────

  function getCanvasCoords(e) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (CW / rect.width);
    const canvasY = (e.clientY - rect.top) * (CH / rect.height);
    const { zoom, panX, panY, worldW, worldH } = viewTransformRef.current;
    const bsX = CW / worldW;
    const bsY = CH / worldH;
    return {
      x: Math.round(canvasX / (zoom * bsX) + panX),
      y: Math.round(canvasY / (zoom * bsY) + panY),
    };
  }

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

  // ── viewport helpers ──────────────────────────────────────────────────────

  function handleFitToScreen() {
    viewTransformRef.current.zoom = 1.0;
    viewTransformRef.current.panX = 0;
    viewTransformRef.current.panY = 0;
    setViewZoom(1.0);
    setViewPanX(0);
    setViewPanY(0);
  }

  function handleWorldSizeChange(w, h) {
    setEditorWorldW(w);
    setEditorWorldH(h);
    viewTransformRef.current.worldW = w;
    viewTransformRef.current.worldH = h;
    viewTransformRef.current.zoom = 1.0;
    viewTransformRef.current.panX = 0;
    viewTransformRef.current.panY = 0;
    setViewZoom(1.0);
    setViewPanX(0);
    setViewPanY(0);
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

  // ── background image upload ───────────────────────────────────────────────

  function handleBgUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w > MAX_BG_W || h > MAX_BG_H) {
          setBgUploadError(`Bild zu groß. Maximum: ${MAX_BG_W}×${MAX_BG_H} Pixel.`);
          return;
        }
        setBgUploadError(null);
        const hasPoints =
          centerPoints.length > 0 || innerPoints.length > 0 || outerPoints.length > 0;
        const dimChanged = w !== editorWorldW || h !== editorWorldH;
        if (dimChanged && hasPoints) {
          if (
            !window.confirm(
              `Das neue Bild hat andere Abmessungen (${w}×${h} statt ${editorWorldW}×${editorWorldH}). Der Pfad wird zurückgesetzt und muss neu gezeichnet werden. Fortfahren?`
            )
          )
            return;
          pushHistory(getSnapshot());
          setCenterPoints([]);
          setInnerPoints([]);
          setOuterPoints([]);
        } else {
          pushHistory(getSnapshot());
        }
        setBackgroundImage(dataUrl);
        setEditorWorldW(w);
        setEditorWorldH(h);
        viewTransformRef.current.worldW = w;
        viewTransformRef.current.worldH = h;
        markDirty();
      };
      img.onerror = () => setBgUploadError('Bild konnte nicht geladen werden.');
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // ── save / load / delete ──────────────────────────────────────────────────

  function handleSave() {
    setSaveAttempted(true);
    if (!backgroundImage) {
      setSaveError('Hintergrundbild ist erforderlich. Bitte zuerst ein Bild hochladen.');
      return;
    }
    const error = validateEditorState({
      mode,
      centerPoints,
      innerPoints,
      outerPoints,
      closed,
      name: trackName.trim(),
    });
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaveError(null);
    try {
      const track = buildTrackFromEditorState({
        mode,
        centerPoints,
        centerWidth,
        innerPoints,
        outerPoints,
        closed,
        name: trackName.trim(),
        backgroundImage,
        effects,
        worldWidth: editorWorldW,
        worldHeight: editorWorldH,
      });
      if (loadedTrackId) track.id = loadedTrackId;
      const saved = saveTrack(track);
      setLoadedTrackId(saved.id);
      setSavedTracks(listTracks());
      setIsDirty(false);
      resetHistory();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveLabel('Saved ✓');
      saveTimerRef.current = setTimeout(() => setSaveLabel('Save'), 2000);
    } catch (err) {
      setSaveError(err.message);
      console.warn('Save failed:', err.message);
    }
  }

  function handleLoad(e) {
    const id = e.target.value;
    if (!id) return;
    const track = getTrack(id);
    if (!track) return;

    setTrackName(track.name);
    setBackgroundImage(track.backgroundImage);
    setBgUploadError(null);
    setClosed(track.closed === true);
    setLoadedTrackId(track.id);
    setEffects(extractEffects(track));
    setBoundarySwitchConfirmed(false);
    setSelectedPointIndex(-1);
    dragIndexRef.current = -1;
    setIsDragging(false);
    setIsDirty(false);
    setSaveAttempted(false);
    setSaveError(null);
    resetHistory();

    // Restore world dimensions and reset viewport
    const ww = track.worldWidth ?? 1280;
    const wh = track.worldHeight ?? 720;
    setEditorWorldW(ww);
    setEditorWorldH(wh);
    viewTransformRef.current.worldW = ww;
    viewTransformRef.current.worldH = wh;
    viewTransformRef.current.zoom = 1.0;
    viewTransformRef.current.panX = 0;
    viewTransformRef.current.panY = 0;
    setViewZoom(1.0);
    setViewPanX(0);
    setViewPanY(0);

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

  function handleDelete() {
    if (!loadedTrackId) return;
    if (!window.confirm(`Delete track "${trackName}"? This cannot be undone.`)) return;
    deleteTrack(loadedTrackId);
    setCenterPoints([]);
    setInnerPoints([]);
    setOuterPoints([]);
    setTrackName('');
    setBackgroundImage(null);
    setBgUploadError(null);
    setEffects([]);
    setLoadedTrackId(null);
    setBoundarySwitchConfirmed(false);
    setSelectedPointIndex(-1);
    setSavedTracks(listTracks());
    setIsDirty(false);
    setSaveAttempted(false);
    setSaveError(null);
    resetHistory();
  }

  // ── derived labels ────────────────────────────────────────────────────────

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
        <h1 className={s.title}>Track Geometry Editor</h1>
        <div className={s.headerCounter}>{counterLabel}</div>
      </div>

      <div className={s.toolbar}>
        <div className={s.toolbarRow}>
          <div className={s.modeGroup}>
            <button
              className={`${s.modeBtn} ${mode === 'center' ? s.modeBtnActive : ''}`}
              onClick={() => {
                if (mode === 'center') return;
                pushHistory(getSnapshot());
                setMode('center');
                setSelectedPointIndex(-1);
                markDirty();
              }}
            >
              Center
            </button>
            <button
              className={`${s.modeBtn} ${mode === 'boundary' ? s.modeBtnActive : ''}`}
              onClick={handleSwitchToBoundary}
            >
              Boundary
            </button>
          </div>

          {mode === 'boundary' && (
            <div className={s.modeGroup}>
              <button
                className={`${s.modeBtn} ${activeBoundary === 'inner' ? s.modeBtnActive : ''}`}
                onClick={() => {
                  if (activeBoundary === 'inner') return;
                  pushHistory(getSnapshot());
                  setActiveBoundary('inner');
                  setSelectedPointIndex(-1);
                }}
              >
                Inner
              </button>
              <button
                className={`${s.modeBtn} ${activeBoundary === 'outer' ? s.modeBtnActive : ''}`}
                onClick={() => {
                  if (activeBoundary === 'outer') return;
                  pushHistory(getSnapshot());
                  setActiveBoundary('outer');
                  setSelectedPointIndex(-1);
                }}
              >
                Outer
              </button>
            </div>
          )}

          <div className={s.modeGroup}>
            <button
              className={`${s.modeBtn} ${closed ? s.modeBtnActive : ''}`}
              onClick={() => {
                if (closed) return;
                pushHistory(getSnapshot());
                setClosed(true);
                markDirty();
              }}
            >
              Closed Loop
            </button>
            <button
              className={`${s.modeBtn} ${!closed ? s.modeBtnActive : ''}`}
              onClick={() => {
                if (!closed) return;
                pushHistory(getSnapshot());
                setClosed(false);
                markDirty();
              }}
            >
              Open Course
            </button>
          </div>

          <button className={s.reverseBtn} disabled={closed} onClick={handleReverse}>
            Reverse Direction
          </button>

          <button
            className={s.historyBtn}
            disabled={!canUndo}
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            className={s.historyBtn}
            disabled={!canRedo}
            onClick={handleRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷ Redo
          </button>
        </div>

        {mode === 'center' && (
          <div className={s.toolbarRow}>
            <label className={s.sliderLabel}>
              Lane Width: {centerWidth} px
              <input
                type="range"
                min={20}
                max={300}
                step={1}
                value={centerWidth}
                className={s.slider}
                onChange={(e) => {
                  if (!sliderHistoryTimerRef.current) {
                    preSliderSnapshotRef.current = getSnapshot();
                  } else {
                    clearTimeout(sliderHistoryTimerRef.current);
                  }
                  setCenterWidth(Number(e.target.value));
                  markDirty();
                  sliderHistoryTimerRef.current = setTimeout(() => {
                    if (preSliderSnapshotRef.current) {
                      pushHistory(preSliderSnapshotRef.current);
                      preSliderSnapshotRef.current = null;
                    }
                    sliderHistoryTimerRef.current = null;
                  }, SLIDER_DEBOUNCE_MS);
                }}
                onBlur={() => {
                  if (sliderHistoryTimerRef.current) {
                    clearTimeout(sliderHistoryTimerRef.current);
                    sliderHistoryTimerRef.current = null;
                    if (preSliderSnapshotRef.current) {
                      pushHistory(preSliderSnapshotRef.current);
                      preSliderSnapshotRef.current = null;
                    }
                  }
                }}
              />
            </label>
          </div>
        )}
        <div className={s.toolbarRow}>
          <span className={s.sliderLabel}>Effects:</span>
          <EffectConfig effects={effects} onChange={handleEffectsChange} max={3} />
        </div>

        {/* Viewport controls */}
        <div className={s.toolbarRow}>
          <span className={s.sliderLabel}>
            Track-Größe: {editorWorldW}×{editorWorldH} px
          </span>
          <button
            className={s.historyBtn}
            onClick={handleFitToScreen}
            title="Reset zoom and pan to fit the full world"
          >
            ⊡ Fit
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginLeft: '0.25rem' }}>
            {Math.round(viewZoom * 100)}%
          </span>
        </div>
      </div>

      <div className={s.saveBar}>
        <div className={s.saveBarRow}>
          <input
            type="text"
            className={`${s.nameInput}${saveAttempted && !trackName.trim() ? ` ${s.nameInputError}` : ''}`}
            placeholder="Track name…"
            value={trackName}
            onChange={(e) => {
              if (!nameHistoryTimerRef.current) {
                preNameSnapshotRef.current = getSnapshot();
              } else {
                clearTimeout(nameHistoryTimerRef.current);
              }
              setTrackName(e.target.value);
              markDirty();
              nameHistoryTimerRef.current = setTimeout(() => {
                if (preNameSnapshotRef.current) {
                  pushHistory(preNameSnapshotRef.current);
                  preNameSnapshotRef.current = null;
                }
                nameHistoryTimerRef.current = null;
              }, NAME_DEBOUNCE_MS);
            }}
            onBlur={() => {
              if (nameHistoryTimerRef.current) {
                clearTimeout(nameHistoryTimerRef.current);
                nameHistoryTimerRef.current = null;
                if (preNameSnapshotRef.current) {
                  pushHistory(preNameSnapshotRef.current);
                  preNameSnapshotRef.current = null;
                }
              }
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBgUpload}
          />
          <button
            type="button"
            className={`${s.bgUploadBtn}${!backgroundImage ? ` ${s.bgUploadBtnRequired}` : ''}`}
            onClick={() => fileInputRef.current?.click()}
            title={
              backgroundImage
                ? 'Hintergrundbild ändern'
                : 'Hintergrundbild hochladen (erforderlich)'
            }
          >
            {backgroundImage
              ? `🖼 ${backgroundImage.startsWith('data:') ? 'Bild hochgeladen' : backgroundImage.split('/').pop()}`
              : '📷 Kein Bild · erforderlich'}
          </button>
          <button
            className={s.saveBtn}
            disabled={!backgroundImage || saveLabel !== 'Save'}
            onClick={handleSave}
          >
            {saveLabel}
          </button>
          <select className={s.loadSelect} value="" onChange={handleLoad}>
            <option value="" disabled>
              Load track…
            </option>
            {savedTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className={s.deleteBtn} disabled={!loadedTrackId} onClick={handleDelete}>
            Delete
          </button>
        </div>
        {bgUploadError && <p className={s.saveError}>{bgUploadError}</p>}
        {saveError && <p className={s.saveError}>{saveError}</p>}
      </div>

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
