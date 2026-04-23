import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';
import { findPointAtPosition, findSegmentNearPoint } from './trackEditorHelpers.js';
import s from './TrackEditor.module.css';

const CW = 1280;
const CH = 720;
const BG_SRC = '/assets/tracks/backgrounds/dirt-oval.jpg';
const HIT_RADIUS = 10;
const INSERT_TOLERANCE = 8;
const CURVE_SAMPLES = 200;

export default function TrackEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const wrapperRef = useRef(null);

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

  const dragIndexRef = useRef(-1);

  const setActiveList = useCallback(
    (updater) => {
      if (mode === 'center') return setCenterPoints(updater);
      if (activeBoundary === 'inner') return setInnerPoints(updater);
      return setOuterPoints(updater);
    },
    [mode, activeBoundary]
  );

  useEffect(() => {
    const img = new Image();
    img.src = BG_SRC;
    img.onload = () => {
      bgRef.current = img;
      setBgReady(true);
    };
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

    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    const inactiveLists = [centerPoints, innerPoints, outerPoints].filter((l) => l !== activeList);
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

    // Inactive curves and points at 30% opacity
    ctx.globalAlpha = 0.3;
    for (const list of inactiveLists) {
      tryDrawCurve(list, '#4fc3f7', 1.5, false);
      for (const pt of list) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4fc3f7';
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Center Mode: derived inner/outer boundary preview (dashed, 40% opacity)
    if (mode === 'center' && centerPoints.length >= minPts) {
      try {
        const centerCurve = catmullRomSpline(centerPoints, {
          closed,
          tension: 0.5,
          samples: CURVE_SAMPLES,
        });
        ctx.globalAlpha = 0.4;
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

    // Active curve (full opacity, solid)
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
      return;
    }

    setActiveList((prev) => [...prev, { x: coords.x, y: coords.y }]);
    setSelectedPointIndex(activeList.length);
  }

  function handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== -1) {
      e.preventDefault();
      setActiveList((prev) => prev.filter((_, i) => i !== selectedPointIndex));
      setSelectedPointIndex(-1);
    }
  }

  function handleReverse() {
    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    setActiveList([...activeList].reverse());
    setSelectedPointIndex(-1);
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
        <button className={s.backBtn} onClick={() => navigate('/dev')}>
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
              }}
            >
              Center
            </button>
            <button
              className={`${s.modeBtn} ${mode === 'boundary' ? s.modeBtnActive : ''}`}
              onClick={() => {
                setMode('boundary');
                setSelectedPointIndex(-1);
              }}
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
              onClick={() => setClosed(true)}
            >
              Closed Loop
            </button>
            <button
              className={`${s.modeBtn} ${!closed ? s.modeBtnActive : ''}`}
              onClick={() => setClosed(false)}
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
                onChange={(e) => setCenterWidth(Number(e.target.value))}
                className={s.slider}
              />
            </label>
          </div>
        )}
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
