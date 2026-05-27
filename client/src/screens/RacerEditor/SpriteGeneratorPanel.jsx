// ============================================================
// File:        SpriteGeneratorPanel.jsx
// Path:        client/src/screens/RacerEditor/SpriteGeneratorPanel.jsx
// Project:     RaceArena
// Created:     2026-05-27
// Description: Left column of the Racer Editor — PNG upload, background
//              removal, live animation preview with tint swatches,
//              animation controls, and spritesheet strip.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  buildSpritesheet,
  drawSpriteFrame,
  FRAME_SIZE,
} from '../../modules/racer-types/spritesheetBuilder.js';
import {
  hasTransparentBackground,
  sampleColor,
  removeBackground,
  computeSpriteOffset,
} from '../../modules/racer-types/backgroundRemoval.js';
import { detectTintMode } from '../../modules/racer-types/spriteTinter.js';
import { STANDARD_COAT_PALETTE } from '../../modules/racer-types/standardCoats.js';
import { drawCheckerboard } from './canvasUtils.js';
import { AnimationControls } from './AnimationControls.jsx';
import { SpritesheetPreview } from './SpritesheetPreview.jsx';
import s from './RacerEditor.module.css';

const PREVIEW_SIZE = 128;
const TINT_SWATCHES = STANDARD_COAT_PALETTE.filter((c) => c.tint !== null);
const TINT_MODE_OPTIONS = ['auto', 'multiply', 'screen'];

export function SpriteGeneratorPanel({
  animConfig,
  onAnimConfigChange,
  onSpriteDataUrl,
  initialSpriteDataUrl,
  tintMode,
  onTintModeChange,
}) {
  const [sourceImgEl, setSourceImgEl] = useState(null);
  const [originalImgEl, setOriginalImgEl] = useState(null);
  const [spriteDataUrl, setSpriteDataUrl] = useState(initialSpriteDataUrl ?? null);
  const [sourceObjectUrl, setSourceObjectUrl] = useState(null);
  const [isTransparent, setIsTransparent] = useState(false);
  const [sampledColor, setSampledColor] = useState(null);
  const [tolerance, setTolerance] = useState(30);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [selectedTintIdx, setSelectedTintIdx] = useState(0);
  const [detectedMode, setDetectedMode] = useState('multiply');
  const [spriteOffset, setSpriteOffset] = useState({ offsetX: 0, offsetY: 0 });
  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedTintIdxRef = useRef(selectedTintIdx);
  const resolvedModeRef = useRef('multiply');
  const spriteOffsetRef = useRef({ offsetX: 0, offsetY: 0 });

  // Keep refs in sync so RAF loop reads latest values without restarting
  useEffect(() => {
    selectedTintIdxRef.current = selectedTintIdx;
  }, [selectedTintIdx]);

  useEffect(() => {
    spriteOffsetRef.current = spriteOffset;
  }, [spriteOffset]);

  useEffect(() => {
    resolvedModeRef.current = tintMode === 'auto' ? detectedMode : (tintMode ?? 'multiply');
  }, [tintMode, detectedMode]);

  // In edit mode: show initial spritesheet until the user uploads a new source PNG
  const displayUrl = sourceObjectUrl ?? (initialSpriteDataUrl ? initialSpriteDataUrl : null);

  // Load source image from object URL when the user uploads a file
  useEffect(() => {
    if (!sourceObjectUrl) return;
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = img.naturalWidth;
      offscreen.height = img.naturalHeight;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      const transparent = hasTransparentBackground(imgData);
      const offset = transparent
        ? computeSpriteOffset(imgData, FRAME_SIZE, FRAME_SIZE)
        : { offsetX: 0, offsetY: 0 };
      setIsTransparent(transparent);
      if (!transparent) setSampledColor(sampleColor(imgData, 0, 0));
      setDetectedMode(detectTintMode(imgData));
      setSourceImgEl(img);
      setOriginalImgEl(img);
      setBgRemoved(false);
      setSpriteOffset(offset);
    };
    img.onerror = () => setSourceImgEl(null);
    img.src = sourceObjectUrl;
  }, [sourceObjectUrl]);

  // Rebuild spritesheet whenever source image or animation config changes
  useEffect(() => {
    if (!sourceImgEl) return;
    let cancelled = false;
    const id = setTimeout(() => {
      if (cancelled) return;
      const dataUrl = buildSpritesheet(
        sourceImgEl,
        animConfig.frameCount,
        animConfig,
        spriteOffset
      );
      setSpriteDataUrl(dataUrl);
      onSpriteDataUrl(dataUrl);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [sourceImgEl, animConfig, onSpriteDataUrl, spriteOffset]);

  // Live preview: checkerboard bg + animated frames + per-frame tint
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !sourceImgEl) return;

    let frameIdx = 0;
    let lastTime = 0;
    let rafId;
    const frameDuration = animConfig.basePeriodMs / animConfig.frameCount;

    // Reuse a single offscreen canvas for tint compositing
    const off = document.createElement('canvas');
    off.width = PREVIEW_SIZE;
    off.height = PREVIEW_SIZE;
    const offCtx = off.getContext('2d');

    function renderPreviewFrame(fi) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      drawCheckerboard(ctx, PREVIEW_SIZE, PREVIEW_SIZE);

      offCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      drawSpriteFrame(
        offCtx,
        sourceImgEl,
        fi,
        animConfig.frameCount,
        animConfig,
        0,
        PREVIEW_SIZE,
        spriteOffsetRef.current
      );

      const tintHex = TINT_SWATCHES[selectedTintIdxRef.current]?.tint;
      if (tintHex) {
        const tr = parseInt(tintHex.slice(1, 3), 16);
        const tg = parseInt(tintHex.slice(3, 5), 16);
        const tb = parseInt(tintHex.slice(5, 7), 16);
        const id = offCtx.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
        const d = id.data;
        const useScreen = resolvedModeRef.current === 'screen';
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 0) {
            if (useScreen) {
              d[i] = 255 - (((255 - d[i]) * (255 - tr)) >> 8);
              d[i + 1] = 255 - (((255 - d[i + 1]) * (255 - tg)) >> 8);
              d[i + 2] = 255 - (((255 - d[i + 2]) * (255 - tb)) >> 8);
            } else {
              d[i] = (d[i] * tr) >> 8;
              d[i + 1] = (d[i + 1] * tg) >> 8;
              d[i + 2] = (d[i + 2] * tb) >> 8;
            }
          }
        }
        offCtx.putImageData(id, 0, 0);
      }
      ctx.drawImage(off, 0, 0);
    }

    function animate(timestamp) {
      if (timestamp - lastTime >= frameDuration) {
        frameIdx = (frameIdx + 1) % animConfig.frameCount;
        lastTime = timestamp;
        renderPreviewFrame(frameIdx);
      }
      rafId = requestAnimationFrame(animate);
    }

    renderPreviewFrame(0);
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [sourceImgEl, animConfig]);

  function handleRemoveBg() {
    if (!sourceImgEl || !sampledColor) return;
    const canvas = document.createElement('canvas');
    canvas.width = sourceImgEl.naturalWidth;
    canvas.height = sourceImgEl.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImgEl, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = removeBackground(imgData, sampledColor, tolerance);
    const newOffset = computeSpriteOffset(result, FRAME_SIZE, FRAME_SIZE);
    ctx.putImageData(result, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    const newImg = new Image();
    newImg.onload = () => {
      setSourceImgEl(newImg);
      setBgRemoved(true);
      setSpriteOffset(newOffset);
    };
    newImg.src = dataUrl;
  }

  function handleResetBg() {
    if (!originalImgEl) return;
    setSourceImgEl(originalImgEl);
    setBgRemoved(false);
    setSpriteOffset({ offsetX: 0, offsetY: 0 });
  }

  // Click the preview canvas to resample the background color at that pixel
  function handlePreviewClick(e) {
    if (!sourceImgEl || isTransparent) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = PREVIEW_SIZE / rect.width;
    const scaleY = PREVIEW_SIZE / rect.height;
    const x = Math.max(0, Math.min(PREVIEW_SIZE - 1, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(PREVIEW_SIZE - 1, Math.floor((e.clientY - rect.top) * scaleY)));
    const offscreen = document.createElement('canvas');
    offscreen.width = PREVIEW_SIZE;
    offscreen.height = PREVIEW_SIZE;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(sourceImgEl, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    setSampledColor(sampleColor(ctx.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE), x, y));
  }

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
      const url = URL.createObjectURL(file);
      setSourceObjectUrl(url);
    },
    [sourceObjectUrl]
  );

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }

  useEffect(() => {
    return () => {
      if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
    };
  }, [sourceObjectUrl]);

  const swatchColor = sampledColor
    ? `rgb(${sampledColor.r},${sampledColor.g},${sampledColor.b})`
    : '#000';

  const resolvedTintMode = tintMode === 'auto' ? detectedMode : (tintMode ?? 'multiply');

  return (
    <div className={s.panel}>
      <h2 className={s.panelTitle}>Sprite Generator</h2>

      {/* Upload area */}
      <div
        className={`${s.uploadArea} ${displayUrl ? s.uploadAreaHasImage : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label="Upload sprite PNG"
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Sprite preview"
              className={s.uploadedImg}
              style={{ width: 64, height: 64, objectFit: 'contain', objectPosition: '0 0' }}
            />
            <span className={s.uploadHint}>Click or drop to replace</span>
          </>
        ) : (
          <>
            <span className={s.uploadIcon}>🖼️</span>
            <span className={s.uploadPlaceholder}>Drop a PNG here or click to upload</span>
            <span className={s.uploadHint}>
              128 × 128 px recommended · sprite should face right
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/*"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Transparent background notice */}
      {sourceImgEl && isTransparent && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', margin: 0 }}>
          ✓ Transparent background detected
        </p>
      )}

      {/* Background removal panel */}
      {sourceImgEl && !isTransparent && (
        <div>
          <div className={s.sectionLabel}>Background Removal</div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Sampled color</span>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 18,
                borderRadius: 4,
                background: swatchColor,
                border: '1px solid #444',
                flexShrink: 0,
              }}
              title="Click the preview canvas to resample at a different point"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
              Click preview to resample
            </span>
          </div>
          <div className={s.sliderRow}>
            <label htmlFor="bg-tolerance" className={s.label}>
              Tolerance
            </label>
            <input
              id="bg-tolerance"
              type="range"
              min={0}
              max={80}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className={s.slider}
            />
            <span className={s.sliderValue}>{tolerance}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              onClick={handleRemoveBg}
              className={`${s.btn} ${s.btnPrimary}`}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
            >
              Remove Background & Center
            </button>
            {bgRemoved && (
              <button
                onClick={handleResetBg}
                className={`${s.btn} ${s.btnGhost}`}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live preview */}
      <div className={s.previewRow}>
        <canvas
          ref={previewCanvasRef}
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
          className={s.previewCanvas}
          aria-label="Live animation preview"
          onClick={handlePreviewClick}
          style={{ cursor: sourceImgEl && !isTransparent ? 'crosshair' : undefined }}
        />
        <div className={s.previewInfo}>
          {sourceImgEl ? (
            <div>
              <span className={s.previewInfoLabel}>Live preview</span>
              <br />
              Animation at {animConfig.basePeriodMs} ms cycle
              <br />
              {animConfig.frameCount} frames ·{' '}
              {Math.round(animConfig.basePeriodMs / animConfig.frameCount)} ms/frame
            </div>
          ) : (
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem' }}>
              Upload a PNG to see the live preview
            </span>
          )}
        </div>
      </div>

      {/* Tint preview swatches — preview-only, does not affect saved spritesheet */}
      {sourceImgEl && (
        <div>
          <div className={s.sectionLabel}>Preview Tint</div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {TINT_SWATCHES.map((coat, i) => (
              <button
                key={coat.id}
                title={coat.name}
                aria-label={coat.name}
                aria-pressed={selectedTintIdx === i}
                onClick={() => setSelectedTintIdx(i)}
                className={`${s.tintSwatch} ${selectedTintIdx === i ? s.tintSwatchActive : ''}`}
                style={{ background: coat.tint }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tint mode toggle — controls blend mode for preview and for the saved racer */}
      <div>
        <div className={s.sectionLabel}>
          Tint Mode
          {tintMode === 'auto' && sourceImgEl && (
            <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '0.4rem' }}>
              (auto → {resolvedTintMode})
            </span>
          )}
        </div>
        <div className={s.animPills}>
          {TINT_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              className={`${s.animPill} ${tintMode === mode ? s.animPillActive : ''}`}
              onClick={() => onTintModeChange?.(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Animation controls */}
      <AnimationControls animConfig={animConfig} onChange={onAnimConfigChange} />

      {/* Spritesheet strip */}
      <SpritesheetPreview spriteDataUrl={spriteDataUrl} frameCount={animConfig.frameCount} />
    </div>
  );
}
