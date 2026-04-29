import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';

const CW = 1280;
const CH = 720;
const CURVE_SAMPLES = 200;

const TRACK_COLOR = '#FF00FF';

// drawStaticScene does NOT clear the canvas — callers apply the viewport
// transform first, then call this, then restore. clearRect must happen
// before the transform is applied so it uses raw canvas coordinates.
export function drawStaticScene(ctx, state) {
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

  // A1 — 60% dark overlay between background and track lines
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, worldW, worldH);
  ctx.globalAlpha = 1;

  const minPts = closed ? 3 : 2;

  // Draws a curve with a white outline underneath then the main color on top.
  // outlineWidth must be > lineWidth for the white halo to be visible.
  const tryDrawCurve = (pts, strokeStyle, lineWidth, outlineWidth, dashed) => {
    if (pts.length < minPts) return;
    try {
      const curve = catmullRomSpline(pts, { closed, tension: 0.5, samples: CURVE_SAMPLES });

      const drawPath = () => {
        ctx.beginPath();
        if (dashed) ctx.setLineDash([6, 4]);
        ctx.moveTo(curve[0].x, curve[0].y);
        for (let i = 1; i < curve.length; i++) ctx.lineTo(curve[i].x, curve[i].y);
        if (closed) ctx.closePath();
      };

      // A3 — white outline pass
      drawPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = outlineWidth;
      ctx.stroke();
      if (dashed) ctx.setLineDash([]);

      // A2 — magenta line on top
      drawPath();
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

        // white outline pass for width-boundary dashes
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5; // A3: outline for 3px boundary lines
        for (const amount of [centerWidth / 2, -(centerWidth / 2)]) {
          const bc = offsetCurve(centerCurve, amount);
          ctx.beginPath();
          ctx.moveTo(bc[0].x, bc[0].y);
          for (let i = 1; i < bc.length; i++) ctx.lineTo(bc[i].x, bc[i].y);
          ctx.stroke();
        }

        // magenta pass for width-boundary dashes
        ctx.strokeStyle = TRACK_COLOR;
        ctx.lineWidth = 3; // A4: was 1.5
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
    tryDrawCurve(centerPoints, TRACK_COLOR, 4, 6, false); // A4: was 3; outline 6px
    for (let i = 0; i < centerPoints.length; i++) {
      const pt = centerPoints[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (selectedPointIndex >= 0 && selectedPointIndex < centerPoints.length) {
      const pt = centerPoints[selectedPointIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  } else {
    const activeList = activeBoundary === 'inner' ? innerPoints : outerPoints;
    const inactiveList = activeBoundary === 'inner' ? outerPoints : innerPoints;
    ctx.globalAlpha = 0.3;
    tryDrawCurve(inactiveList, TRACK_COLOR, 4, 6, false); // A4: was 3; outline 6px
    for (const pt of inactiveList) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    tryDrawCurve(activeList, TRACK_COLOR, 4, 6, false); // A4: was 3; outline 6px
    for (let i = 0; i < activeList.length; i++) {
      const pt = activeList[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (selectedPointIndex >= 0 && selectedPointIndex < activeList.length) {
      const pt = activeList[selectedPointIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}
