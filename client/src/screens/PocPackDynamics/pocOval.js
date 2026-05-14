// Hardcoded oval geometry for the Pack-Dynamics PoC.
// Inner/outer ovals both centred at (640, 360) in a 1280x720 world.
// Corridor width (outer radius - inner radius) = 150 px on all sides.
//   Horizontal: rx_outer(370) - rx_inner(220) = 150 px
//   Vertical  : ry_outer(260) - ry_inner(110) = 150 px  (rounded corners, ~150 px too)

function ovalPts(cx, cy, rx, ry, n = 20) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

export const POC_OVAL = {
  innerPoints: ovalPts(640, 360, 220, 110, 20),
  outerPoints: ovalPts(640, 360, 370, 260, 20),
  closed: true,
};

// Approximate centerline circumference (used for race-speed calibration display only).
// Ramanujan approximation for ellipse perimeter: π × [3(a+b) - √((3a+b)(a+3b))]
const a = (220 + 370) / 2; // semi-major axis of centerline
const b = (110 + 260) / 2; // semi-minor axis of centerline
export const POC_OVAL_CIRCUMFERENCE_PX =
  Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
