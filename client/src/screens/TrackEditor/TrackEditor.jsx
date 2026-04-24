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
  extractEffectConfig,
} from './trackEditorSave.js';
import { useHistory } from './useHistory.js';
import EffectConfig from '../../components/EffectConfig/EffectConfig.jsx';
import s from './TrackEditor.module.css';

const CW = 1280;
const CH = 720;
const HIT_RADIUS = 10;
const INSERT_TOLERANCE = 8;
const CURVE_SAMPLES = 200;
const SLIDER_DEBOUNCE_MS = 400;
const NAME_DEBOUNCE_MS = 600;

const DEFAULT_BG = '/assets/tracks/backgrounds/dirt-oval.jpg';

const BG_IMAGES = [
  { value: '/assets/tracks/backgrounds/city-circuit.png', label: 'City Circuit' },
  { value: '/assets/tracks/backgrounds/dirt-oval.jpg', label: 'Dirt Oval' },
  { value: '/assets/tracks/backgrounds/garden-path.png', label: 'Garden Path' },
  { value: '/assets/tracks/backgrounds/river-run.png', label: 'River Run' },
  { value: '/assets/tracks/backgrounds/space-sprint.jpg', label: 'Space Sprint' },
];

export default function TrackEditor() {
  const navigate = useNavigate();

  // ── canvas / UI refs ──────────────────────────────────────────────────────
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const wrapperRef = useRef(null);
  const saveTimerRef = useRef(null);

  // ── drag tracking refs ────────────────────────────────────────────────────
  const dragIndexRef = useRef(-1);
  const hasDraggedRef = useRef(false);
  const preDragSnapshotRef = useRef(null);

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
  const [backgroundImage, setBackgroundImage] = useState(DEFAULT_BG);
  const [effectId, setEffectId] = useState(null);
  const [effectConfig, setEffectConfig] = useState({});

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
      effectId,
      effectConfig,
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
    setEffectId(snapshot.effectId);
    setEffectConfig(snapshot.effectConfig);
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
      effectId,
      effectConfig,
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
    effectId,
    effectConfig,
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
      effectId,
      effectConfig,
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
    effectId,
    effectConfig,
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
    };
  }, []);

  // Canvas render effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    if (bgRef.current) {
      ctx.drawImage(bgRef.current, 0, 0, CW, CH);
    } else {
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, CW, CH);
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
      // Derived inner/outer boundary preview — drawn under center line (dashed, 90% opacity)
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
      // Boundary Mode: only inner and outer — Center list hidden entirely
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
  ]);

  // ── canvas coordinate helpers ─────────────────────────────────────────────

  function getCanvasCoords(e) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
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
    }
  }

  function handlePointerMove(e) {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (isDragging && dragIndexRef.current !== -1) {
      hasDraggedRef.current = true;
      setActiveList((prev) => {
        const next = [...prev];
        next[dragIndexRef.current] = { x: coords.x, y: coords.y };
        return next;
      });
      return;
    }

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
    }
  }

  function handleCanvasClick(e) {
    if (dragIndexRef.current !== -1) return;
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

  function handleEffectChange(nextEffectId, nextConfig) {
    if (nextEffectId !== effectId) {
      // Coarse event (effect switch) — single history step
      pushHistory(getSnapshot());
      setEffectId(nextEffectId);
      setEffectConfig(nextConfig);
      markDirty();
    } else {
      // Fine event (config field change) — debounced, same pattern as centerWidth slider
      if (!effectHistoryTimerRef.current) {
        preEffectSnapshotRef.current = getSnapshot();
      } else {
        clearTimeout(effectHistoryTimerRef.current);
      }
      setEffectConfig(nextConfig);
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

  // ── save / load / delete ──────────────────────────────────────────────────

  function handleSave() {
    setSaveAttempted(true);
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
        effectId,
        effectConfig,
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
    setClosed(track.closed);
    setLoadedTrackId(track.id);
    const { effectId: loadedEffectId, effectConfig: loadedEffectConfig } =
      extractEffectConfig(track);
    setEffectId(loadedEffectId);
    setEffectConfig(loadedEffectConfig);
    setBoundarySwitchConfirmed(false);
    setSelectedPointIndex(-1);
    dragIndexRef.current = -1;
    setIsDragging(false);
    setIsDirty(false);
    setSaveAttempted(false);
    setSaveError(null);
    resetHistory();

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
    setBackgroundImage(DEFAULT_BG);
    setEffectId(null);
    setEffectConfig({});
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
          <span className={s.sliderLabel}>Effect:</span>
          <EffectConfig effectId={effectId} config={effectConfig} onChange={handleEffectChange} />
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
          <select
            className={s.bgSelect}
            value={backgroundImage}
            onChange={(e) => {
              pushHistory(getSnapshot());
              setBackgroundImage(e.target.value);
              markDirty();
            }}
          >
            {BG_IMAGES.map((bg) => (
              <option key={bg.value} value={bg.value}>
                {bg.label}
              </option>
            ))}
          </select>
          <button className={s.saveBtn} disabled={saveLabel !== 'Save'} onClick={handleSave}>
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
            aria-label="Track editor canvas — click to place points"
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
