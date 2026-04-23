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
import { buildTrackFromEditorState, validateEditorState } from './trackEditorSave.js';
import s from './TrackEditor.module.css';

const CW = 1280;
const CH = 720;
const HIT_RADIUS = 10;
const INSERT_TOLERANCE = 8;
const CURVE_SAMPLES = 200;

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
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const wrapperRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [centerPoints, setCenterPoints] = useState([]);
  const [innerPoints, setInnerPoints] = useState([]);
  const [outerPoints, setOuterPoints] = useState([]);
  const [bgReady, setBgReady] = useState(false);
  const [mode, setMode] = useState('center');
  const [activeBoundary, setActiveBoundary] = useState('inner');
  const [selectedPointIndex, setSelectedPointIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [centerWidth, setCenterWidth] = useState(120);
  const [closed, setClosed] = useState(false);

  const [trackName, setTrackName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(DEFAULT_BG);
  const [loadedTrackId, setLoadedTrackId] = useState(null);
  const [savedTracks, setSavedTracks] = useState([]);
  const [saveLabel, setSaveLabel] = useState('Save');
  const [boundarySwitchConfirmed, setBoundarySwitchConfirmed] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const dragIndexRef = useRef(-1);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const setActiveList = useCallback(
    (updater) => {
      if (mode === 'center') return setCenterPoints(updater);
      if (activeBoundary === 'inner') return setInnerPoints(updater);
      return setOuterPoints(updater);
    },
    [mode, activeBoundary]
  );

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
      // Center curve (solid, full opacity)
      tryDrawCurve(centerPoints, '#4fc3f7', 2, false);
      // Center points
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
      // Selected ring
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
      // Inactive boundary at 30% opacity, 2px stroke
      ctx.globalAlpha = 0.3;
      tryDrawCurve(inactiveList, '#4fc3f7', 2, false);
      for (const pt of inactiveList) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4fc3f7';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Active boundary (solid, full opacity)
      tryDrawCurve(activeList, '#4fc3f7', 2, false);
      // Active points
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
      // Selected ring
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

  function handlePointerDown(e) {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    const idx = findPointAtPosition(activeList, coords.x, coords.y, HIT_RADIUS);
    if (idx !== -1) {
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
      markDirty();
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
      setActiveList((prev) => {
        const next = [...prev];
        next.splice(insertAtIndex, 0, { x: coords.x, y: coords.y });
        return next;
      });
      setSelectedPointIndex(insertAtIndex);
      markDirty();
      return;
    }

    setActiveList((prev) => [...prev, { x: coords.x, y: coords.y }]);
    setSelectedPointIndex(activeList.length);
    markDirty();
  }

  function handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== -1) {
      e.preventDefault();
      setActiveList((prev) => prev.filter((_, i) => i !== selectedPointIndex));
      setSelectedPointIndex(-1);
      markDirty();
    }
  }

  function handleReverse() {
    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    setActiveList([...activeList].reverse());
    setSelectedPointIndex(-1);
    markDirty();
  }

  function handleSwitchToBoundary() {
    if (mode === 'center' && centerPoints.length >= 2 && !boundarySwitchConfirmed) {
      const ok = window.confirm(
        'Switching to Boundary Mode will use the derived inner and outer lines as your new starting point and disconnect them from the centerline. You can continue editing the boundaries freely, but the centerline will no longer drive them. Continue?'
      );
      if (!ok) return;
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
    }
    setMode('boundary');
    setSelectedPointIndex(-1);
    markDirty();
  }

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
      });
      if (loadedTrackId) track.id = loadedTrackId;
      const saved = saveTrack(track);
      setLoadedTrackId(saved.id);
      setSavedTracks(listTracks());
      setIsDirty(false);
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
    setBoundarySwitchConfirmed(false);
    setSelectedPointIndex(-1);
    dragIndexRef.current = -1;
    setIsDragging(false);
    setIsDirty(false);
    setSaveAttempted(false);
    setSaveError(null);

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
    setLoadedTrackId(null);
    setBoundarySwitchConfirmed(false);
    setSelectedPointIndex(-1);
    setSavedTracks(listTracks());
    setIsDirty(false);
    setSaveAttempted(false);
    setSaveError(null);
  }

  const counterLabel =
    mode === 'center'
      ? `Center: ${centerPoints.length}`
      : activeBoundary === 'inner'
        ? `Inner: ${innerPoints.length}`
        : `Outer: ${outerPoints.length}`;

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
                  setActiveBoundary('inner');
                  setSelectedPointIndex(-1);
                }}
              >
                Inner
              </button>
              <button
                className={`${s.modeBtn} ${activeBoundary === 'outer' ? s.modeBtnActive : ''}`}
                onClick={() => {
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
                setClosed(true);
                markDirty();
              }}
            >
              Closed Loop
            </button>
            <button
              className={`${s.modeBtn} ${!closed ? s.modeBtnActive : ''}`}
              onClick={() => {
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
                onChange={(e) => {
                  setCenterWidth(Number(e.target.value));
                  markDirty();
                }}
                className={s.slider}
              />
            </label>
          </div>
        )}
      </div>

      <div className={s.saveBar}>
        <div className={s.saveBarRow}>
          <input
            type="text"
            className={`${s.nameInput}${saveAttempted && !trackName.trim() ? ` ${s.nameInputError}` : ''}`}
            placeholder="Track name…"
            value={trackName}
            onChange={(e) => {
              setTrackName(e.target.value);
              markDirty();
            }}
          />
          <select
            className={s.bgSelect}
            value={backgroundImage}
            onChange={(e) => {
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
