// ============================================================
// File:        SpritesheetPreview.jsx
// Path:        client/src/screens/RacerEditor/SpritesheetPreview.jsx
// Project:     RaceArena
// Created:     2026-05-27
// Description: Horizontal strip showing all generated spritesheet frames
//              on a checkerboard background so transparency is visible.
// ============================================================

import { useEffect, useRef } from 'react';
import { drawCheckerboard } from './canvasUtils.js';
import s from './RacerEditor.module.css';

const FRAME_PX = 48;

export function SpritesheetPreview({ spriteDataUrl, frameCount }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spriteDataUrl) return;
    const w = frameCount * FRAME_PX;
    const h = FRAME_PX;
    const ctx = canvas.getContext('2d');
    drawCheckerboard(ctx, w, h);
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, w, h);
    img.src = spriteDataUrl;
  }, [spriteDataUrl, frameCount]);

  if (!spriteDataUrl) {
    return (
      <div className={s.sheetStrip}>
        <p className={s.sheetEmpty}>Upload a sprite to see frames here</p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.sectionLabel}>{frameCount}-frame spritesheet</div>
      <div className={s.sheetStrip}>
        <canvas
          ref={canvasRef}
          width={frameCount * FRAME_PX}
          height={FRAME_PX}
          className={s.sheetImg}
          aria-label="Spritesheet preview"
        />
      </div>
    </div>
  );
}
