// ============================================================
// File:        aimRoomWiring.test.js
// Path:        client/src/modules/camera/aimRoomWiring.test.js
// Project:     RaceArena — AIM-ROOM-REPAIR-1
//
// WHAT THIS PROTECTS: that the director's GUARANTEES and its PAN agree about where the leader is
// going to sit. `framingRule.js`'s contract is that they cannot disagree, and they did — for the
// whole life of the room floor. `anchorScreenPoint` takes the floor as a fifth parameter defaulting
// to 0, and all seven call sites in `CameraDirector.js` passed four, so every guarantee planned its
// shot around an aim `_applyLeaderForwardBias` then moved. `CameraDirector.js` already records this
// exact class of failure once before, at `_companyCeiling`.
//
// THE ASSERTION THAT MATTERS is the last describe: the aim and the pan are computed by two different
// code paths, and this pins that they land on the same screen point on every heading, at a floor
// that binds and a floor that does not. A unit test on `anchorScreenPoint` alone could not have
// caught the defect — that function was always correct. What was wrong was who called it and how.
//
// AND THE ZERO CASE, which is the ship's own precondition: at floor 0 every one of these paths must
// be bit-identical to the pre-floor picture, or the repair has moved something it was not asked to.
// ============================================================
import { describe, it, expect } from 'vitest';
import { CameraDirector } from './CameraDirector.js';
import { anchorScreenPoint } from './framingRule.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const W = 1280;
const H = 720;
const FRAC = 0.66;

/** A straight track with a known constant heading, so the aim is checkable in closed form. */
const straightShape = (dirX, dirY) => ({
  isOpen: true,
  getPosition: (t) => ({ x: 3000 + dirX * t * 4000, y: 2000 + dirY * t * 4000, angle: 0 }),
  getTotalLength: () => 4000,
  getActualTrackWidth: () => 200,
});

const mk = (dirX, dirY, floor) =>
  new CameraDirector(
    6144,
    4096,
    true,
    { ...DEFAULT_CAMERA_CONFIG, leaderForwardFrac: FRAC, leaderAimRoomFloorPx: floor },
    28.5,
    straightShape(dirX, dirY),
    200
  );

// Headings chosen so both regimes are covered: a horizontal chord is the frame's longest reach and
// leaves the most room ahead (the floor is inert), a vertical one is the shortest (the floor binds).
const HEADINGS = [
  ['horizontal', 1, 0],
  ['vertical', 0, 1],
  ['45 degrees', Math.SQRT1_2, Math.SQRT1_2],
  ['74 degrees', 0.2739, 0.9618],
];

describe('AIM-ROOM-REPAIR-1 — the floor reaches the director aim through one accessor', () => {
  it.each(HEADINGS)('%s: at floor 0 the aim is the un-floored anchor, exactly', (_l, dx, dy) => {
    const cd = mk(dx, dy, 0);
    const mine = cd._anchorScreen(W, H, 0.5);
    // The reference is the raw framing rule called the OLD way — four arguments, no floor.
    const raw = anchorScreenPoint(W, H, cd._forwardFracNow(), cd._headingScreen(0.5));
    expect(mine.x).toBeCloseTo(raw.x, 12);
    expect(mine.y).toBeCloseTo(raw.y, 12);
  });

  it('at a binding floor the aim MOVES, so the accessor is demonstrably carrying it', () => {
    const off = mk(0, 1, 0)._anchorScreen(W, H, 0.5);
    const on = mk(0, 1, 360)._anchorScreen(W, H, 0.5);
    // Vertical heading: the chord is the frame height, so 360 px of room forces the aim back.
    expect(Math.hypot(on.x - off.x, on.y - off.y)).toBeGreaterThan(1);
  });

  it('on a long chord the floor is inert — it binds only where it must', () => {
    const off = mk(1, 0, 0)._anchorScreen(W, H, 0.5);
    const on = mk(1, 0, 360)._anchorScreen(W, H, 0.5);
    expect(on.x).toBeCloseTo(off.x, 12);
    expect(on.y).toBeCloseTo(off.y, 12);
  });
});

describe('AIM-ROOM-REPAIR-1 — THE CONTRACT: the guarantees and the pan agree', () => {
  // Two independent code paths: `_anchorScreen` says where the leader SHOULD sit (what every
  // guarantee plans against) and `_applyLeaderForwardBias` moves the pan centre so he DOES. Project
  // the leader through the biased camera and the two must land on the same screen point.
  // The case list is built as [label, dx, dy, floor]; the title is a function rather than a printf
  // template because `%s`/`%d` fill positionally and were labelling the floor with `dx`.
  it.each([
    ...HEADINGS.map((h) => [...h, 0]),
    ...HEADINGS.map((h) => [...h, 360]),
  ])('$0 at floor $3: the leader lands exactly where the guarantees were told', (_l, dx, dy, floor) => {
    const cd = mk(dx, dy, floor);
    const t = 0.5;
    const pos = { x: 3000 + dx * 2000, y: 2000 + dy * 2000 };
    const effX = cd._proj.effX(cd._leaderZoom);
    const effY = cd._proj.effY(cd._leaderZoom);

    const aim = cd._anchorScreen(W, H, t);
    const panned = cd._applyLeaderForwardBias(pos, t, effX, effY, W, H);

    // The camera centres on `panned`, so the leader appears at centre + (pos - panned) * eff.
    const landedX = W / 2 + (pos.x - panned.x) * effX;
    const landedY = H / 2 + (pos.y - panned.y) * effY;

    expect(landedX).toBeCloseTo(aim.x, 6);
    expect(landedY).toBeCloseTo(aim.y, 6);
  });
});
