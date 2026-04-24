import { useEffect, useRef } from 'react';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { getBackgroundImage } from '../../modules/track-effects/bgImageCache.js';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import s from './PresetThumbnail.module.css';

const WORLD_W = 1280;
const WORLD_H = 720;
const SAMPLE_COUNT = 64;

function drawThumbnail(canvas, geometry, width, height) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scaleX = width / WORLD_W;
  const scaleY = height / WORLD_H;

  function render(bgImg) {
    ctx.clearRect(0, 0, width, height);

    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#0a0414';
      ctx.fillRect(0, 0, width, height);
    }

    const shape = new EditorShape(geometry, { samples: SAMPLE_COUNT });
    const { outer, inner } = shape.getEdgePoints(SAMPLE_COUNT);
    const n = Math.min(outer.length, inner.length);

    ctx.strokeStyle = '#00eeff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#00eeff';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const mx = ((outer[i].x + inner[i].x) / 2) * scaleX;
      const my = ((outer[i].y + inner[i].y) / 2) * scaleY;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    if (geometry.closed) ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const bgPath = geometry.backgroundImage ?? null;
  if (bgPath) {
    // Prime the shared cache, but also load directly for the callback
    getBackgroundImage(bgPath);
    const img = new Image();
    img.onload = () => render(img);
    img.onerror = () => render(null);
    img.src = bgPath;
    render(null); // draw without image first (instant feedback)
  } else {
    render(null);
  }
}

export default function PresetThumbnail({ geometryId, width = 120, height = 68 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!geometryId) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#111118';
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }

    const geometry = getTrack(geometryId);
    if (!geometry) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#111118';
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }

    drawThumbnail(canvas, geometry, width, height);
  }, [geometryId, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={s.canvas}
      aria-label="Track thumbnail"
    />
  );
}
