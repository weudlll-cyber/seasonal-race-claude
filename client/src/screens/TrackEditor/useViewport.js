import { useState, useRef, useEffect, useCallback } from 'react';

const CW = 1280;
const CH = 720;

/**
 * Manages TrackEditor viewport state: zoom, pan, world size, and related refs.
 * @param {React.RefObject} canvasRef  Ref to the editor canvas element.
 */
export function useViewport(canvasRef) {
  const [viewZoom, setViewZoom] = useState(1.0);
  const [viewPanX, setViewPanX] = useState(0);
  const [viewPanY, setViewPanY] = useState(0);
  const [editorWorldW, setEditorWorldW] = useState(1280);
  const [editorWorldH, setEditorWorldH] = useState(720);

  const viewTransformRef = useRef({ zoom: 1.0, panX: 0, panY: 0, worldW: 1280, worldH: 720 });

  // Pan interaction refs — used by pointer handlers in the parent component.
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ screenX: 0, screenY: 0, panX: 0, panY: 0 });
  const didPanRef = useRef(false);

  // Keep viewTransformRef in sync with state.
  useEffect(() => {
    viewTransformRef.current = {
      zoom: viewZoom,
      panX: viewPanX,
      panY: viewPanY,
      worldW: editorWorldW,
      worldH: editorWorldH,
    };
  }, [viewZoom, viewPanX, viewPanY, editorWorldW, editorWorldH]);

  // Wheel zoom-to-cursor — passive:false so we can preventDefault.
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (CW / rect.width);
      const canvasY = (e.clientY - rect.top) * (CH / rect.height);

      const { zoom, panX, panY, worldW, worldH } = viewTransformRef.current;
      const bsX = CW / worldW;
      const bsY = CH / worldH;

      const worldX = canvasX / (zoom * bsX) + panX;
      const worldY = canvasY / (zoom * bsY) + panY;

      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(0.1, Math.min(10, zoom * factor));
      const newPanX = worldX - canvasX / (newZoom * bsX);
      const newPanY = worldY - canvasY / (newZoom * bsY);

      viewTransformRef.current.zoom = newZoom;
      viewTransformRef.current.panX = newPanX;
      viewTransformRef.current.panY = newPanY;

      setViewZoom(newZoom);
      setViewPanX(newPanX);
      setViewPanY(newPanY);
    },
    [canvasRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, handleWheel]);

  function handleFitToScreen() {
    viewTransformRef.current.zoom = 1.0;
    viewTransformRef.current.panX = 0;
    viewTransformRef.current.panY = 0;
    setViewZoom(1.0);
    setViewPanX(0);
    setViewPanY(0);
  }

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

  /**
   * Updates the world size in both state and ref (used after background image upload).
   */
  function setWorldSize(w, h) {
    setEditorWorldW(w);
    setEditorWorldH(h);
    viewTransformRef.current.worldW = w;
    viewTransformRef.current.worldH = h;
  }

  /**
   * Resets zoom and pan to 1/0/0 and updates world size (used after loading a track).
   */
  function resetViewport(worldW, worldH) {
    setEditorWorldW(worldW);
    setEditorWorldH(worldH);
    viewTransformRef.current = { zoom: 1.0, panX: 0, panY: 0, worldW, worldH };
    setViewZoom(1.0);
    setViewPanX(0);
    setViewPanY(0);
  }

  return {
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
  };
}
