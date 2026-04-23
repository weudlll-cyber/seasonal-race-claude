import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { catmullRomSpline } from '../../modules/track-editor/catmullRom.js';
import { findPointAtPosition } from './trackEditorHelpers.js';
import s from './TrackEditor.module.css';

const CW = 1280;
const CH = 720;
const BG_SRC = '/assets/tracks/backgrounds/dirt-oval.jpg';
const HIT_RADIUS = 10;
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
  const [mode, setMode] = useState('center'); // 'center' | 'boundary'
  const [activeBoundary, setActiveBoundary] = useState('inner'); // 'inner' | 'outer'
  const [selectedPointIndex, setSelectedPointIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);

  const dragIndexRef = useRef(-1);

  const getActiveList = useCallback(() => {
    if (mode === 'center') return centerPoints;
    return activeBoundary === 'inner' ? innerPoints : outerPoints;
  }, [mode, activeBoundary, centerPoints, innerPoints, outerPoints]);

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

    if (bgRef.current) {
      ctx.drawImage(bgRef.current, 0, 0, CW, CH);
    } else {
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, CW, CH);
    }

    const activeList =
      mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints;
    const inactiveLists = [centerPoints, innerPoints, outerPoints].filter((l) => l !== activeList);

    // Draw inactive points (dim)
    ctx.globalAlpha = 0.3;
    for (const list of inactiveLists) {
      for (const pt of list) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4fc3f7';
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Draw active curve
    if (activeList.length >= 2) {
      try {
        const curve = catmullRomSpline(activeList, {
          closed: false,
          tension: 0.5,
          samples: CURVE_SAMPLES,
        });
        ctx.beginPath();
        ctx.moveTo(curve[0].x, curve[0].y);
        for (let i = 1; i < curve.length; i++) ctx.lineTo(curve[i].x, curve[i].y);
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.stroke();
      } catch {
        // not enough points for closed curve — skip
      }
    }

    // Draw active points
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

    // Draw selected ring
    if (selectedPointIndex >= 0 && selectedPointIndex < activeList.length) {
      const pt = activeList[selectedPointIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [centerPoints, innerPoints, outerPoints, mode, activeBoundary, selectedPointIndex, bgReady]);

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

    // Hover cursor feedback
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
    // Ignore if we just finished dragging
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
    setActiveList((prev) => [...prev, { x: coords.x, y: coords.y }]);
    setSelectedPointIndex(
      (mode === 'center' ? centerPoints : activeBoundary === 'inner' ? innerPoints : outerPoints)
        .length
    );
  }

  function handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== -1) {
      e.preventDefault();
      setActiveList((prev) => {
        const next = prev.filter((_, i) => i !== selectedPointIndex);
        return next;
      });
      setSelectedPointIndex(-1);
    }
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
