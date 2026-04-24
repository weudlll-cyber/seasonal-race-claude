import { useEffect, useRef, useState } from 'react';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { getBackgroundImage } from '../../modules/track-effects/bgImageCache.js';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import s from './PresetThumbnail.module.css';

const WORLD_W = 1280;
const WORLD_H = 720;
const SAMPLE_COUNT = 64;

function drawThumbnail(canvas, geometry, bgImage, width, height) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scaleX = width / WORLD_W;
  const scaleY = height / WORLD_H;

  ctx.clearRect(0, 0, width, height);
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, width, height);
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

export default function PresetThumbnail({ geometryId, width = 120, height = 68 }) {
  const canvasRef = useRef(null);
  const [bgImage, setBgImage] = useState(null);

  // Resolve background image; hot path uses bgImageCache directly; async path
  // waits for onload and updates state, triggering the draw effect below.
  useEffect(() => {
    const geometry = getTrack(geometryId);
    const bgPath = geometry?.backgroundImage ?? null;
    if (!bgPath) {
      setBgImage(null);
      return;
    }

    const cached = getBackgroundImage(bgPath);
    if (cached) {
      setBgImage(cached);
      return;
    }

    setBgImage(null);
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive) setBgImage(img);
    };
    img.onerror = () => {
      console.warn(`[PresetThumbnail] Failed to load background: ${bgPath}`);
    };
    img.src = bgPath;
    return () => {
      alive = false;
    };
  }, [geometryId]);

  // Draw to canvas whenever geometry or the resolved background image changes.
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

    drawThumbnail(canvas, geometry, bgImage, width, height);
  }, [geometryId, bgImage, width, height]);

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
