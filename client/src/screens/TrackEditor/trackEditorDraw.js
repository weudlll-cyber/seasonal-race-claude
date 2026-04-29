import { catmullRomSpline, offsetCurve } from '../../modules/track-editor/catmullRom.js';

const CW = 1280;
const CH = 720;
const CURVE_SAMPLES = 200;

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

  // A1 — semi-transparent dark overlay for contrast between background and track lines
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, worldW, worldH);
  ctx.globalAlpha = 1;

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
        ctx.lineWidth = 1.5; // A2: was 1
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
    tryDrawCurve(centerPoints, '#4fc3f7', 3, false); // A2: was 2
    for (let i = 0; i < centerPoints.length; i++) {
      const pt = centerPoints[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2); // A3: was 6
      ctx.fillStyle = '#ffffff'; // A3: was #4fc3f7
      ctx.fill();
      ctx.strokeStyle = '#222222'; // A3: was #ffffff
      ctx.lineWidth = 2; // A3: was 1.5
      ctx.stroke();
    }
    if (selectedPointIndex >= 0 && selectedPointIndex < centerPoints.length) {
      const pt = centerPoints[selectedPointIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2); // A3: was 10
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5; // A3: was 2
      ctx.stroke();
    }
  } else {
    const activeList = activeBoundary === 'inner' ? innerPoints : outerPoints;
    const inactiveList = activeBoundary === 'inner' ? outerPoints : innerPoints;
    ctx.globalAlpha = 0.3;
    tryDrawCurve(inactiveList, '#4fc3f7', 3, false); // A2: was 2
    for (const pt of inactiveList) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2); // A3: was 4
      ctx.fillStyle = '#ffffff'; // A3: was #4fc3f7
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    tryDrawCurve(activeList, '#4fc3f7', 3, false); // A2: was 2
    for (let i = 0; i < activeList.length; i++) {
      const pt = activeList[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2); // A3: was 6
      ctx.fillStyle = '#ffffff'; // A3: was #4fc3f7
      ctx.fill();
      ctx.strokeStyle = '#222222'; // A3: was #ffffff
      ctx.lineWidth = 2; // A3: was 1.5
      ctx.stroke();
    }
    if (selectedPointIndex >= 0 && selectedPointIndex < activeList.length) {
      const pt = activeList[selectedPointIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2); // A3: was 10
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5; // A3: was 2
      ctx.stroke();
    }
  }
}
