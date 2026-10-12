// ============================================================
// File:        viewerProbe.invariant3.test.js
// Path:        client/src/modules/viewerProbe.invariant3.test.js
// Project:     RaceArena — AUDIT-1 A2-50
// Description: Invariant 3 ("the finish line is findable") samples the finish band with the
//              NORMALISED lateral `getPosition` takes, -0.5 to +0.5 across the corridor. It used to
//              pass world pixels (`(k / 40 - 0.5) * trackWidthPx`), which walked a segment hundreds
//              of times too long, so a band far off screen still passed when some stretched sample
//              happened to land in the frame. This pins the normalised reading.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const CW = 1280;
const CH = 720;
const TRACK_WIDTH_PX = 200;

/**
 * A straight course whose finish band sits at world y = 2000 ± 20 — far below a 720 px canvas
 * drawn at zoom 1 from the origin. Read with the normalised lateral it is off screen; read with
 * the lateral multiplied by the corridor width it would reach from y = 0 to y = 4000 and cross
 * the frame.
 */
const shape = {
  isOpen: true,
  getPosition: (t, lateral) => ({ x: CW / 2, y: 2000 + lateral * 40 }),
};

/** One in-window frame: the leader at 96 % of an open race, nobody home yet. */
const frame = {
  ts: 1000,
  effZoomX: 1,
  effZoomY: 1,
  offsetX: 0,
  offsetY: 0,
  canvasW: CW,
  canvasH: CH,
  shape,
  trackWidthPx: TRACK_WIDTH_PX,
  racers: [{ index: 0, t: 0.96, x: CW / 2, y: CH / 2 }],
  finishT: 1,
  finishedCount: 0,
  endgameFrom: 0.95,
  tightestNamed: 100,
  worldWidth: 5000,
  state: 'LEADER_ZOOM',
  binding: 'test',
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem('_ra_viewerprobe', '1');
});

describe('AUDIT-1 A2-50 — invariant 3 reads the finish band with the normalised lateral', () => {
  it('a finish band that is off screen is reported, however wide the corridor is in world px', async () => {
    vi.resetModules();
    const aids = await import('./testAids.js');
    const viewer = await import('./viewerProbe.js');
    aids._setTestAidsForTests(true);
    viewer.beginViewerProbe({ seed: 1 });
    viewer.recordViewerFrame(frame);
    const probe = window.__viewerProbe();
    expect(probe.byInvariant['3-line']).toBe(1);
  });
});
