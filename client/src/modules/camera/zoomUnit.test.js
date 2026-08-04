// ============================================================
// zoomUnit.test.js — CAMERA-REFERENCE-WIDTH-1, the load-bearing tests
//
// Each has a FAILURE PROOF beside it — a computation showing what the PREVIOUS unit produced for
// the same question — because a test that only ever passes cannot tell you whether it is testing
// anything. The x0.8 open-track ceiling shaped every OVERVIEW for months with no test covering it.
//
//   1. THE PROPERTY THIS BLOCK BUYS: the same setting shows the same amount of WORLD on tracks of
//      different corridor width. Nothing asserted this before, because under the old unit it was
//      false by design.
//   2. Same setting, any world resolution → the same shot. The owner's precondition, unchanged.
//   3. A larger setting is a WIDER shot in every state, and the states are commensurable.
//   4. max(reference, actual): a track wider than the reference keeps its own width.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  camZoomForCorridors,
  corridorsForCamZoom,
  visibleCorridors,
  visibleWorldPx,
  referenceWidthFor,
  resolveZoomForCorridors,
} from './zoomUnit.js';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';

const CW = 1280;
const CH = 720;
const OPEN_BASE = 1.5;
const REF = 300; // the shipped standard corridor

// The shipped tracks, reduced to what the zoom rule reads: corridor width, world size, topology.
const TRACKS = [
  { name: 'searound (closed, narrowest)', tw: 131, worldW: 3072, worldH: 2048, open: false },
  { name: 'dirt-oval (closed)', tw: 178, worldW: 3072, worldH: 2047, open: false },
  { name: 'ice-track (closed, widest closed)', tw: 211, worldW: 3072, worldH: 2047, open: false },
  { name: 'luger-hill (open, smallest world)', tw: 250, worldW: 4096, worldH: 2728, open: true },
  { name: 'mountainstreet (open, largest world)', tw: 300, worldW: 6144, worldH: 4096, open: true },
];

const axesFor = (t) => ({
  axisX: t.open ? OPEN_BASE : CW / t.worldW,
  axisY: t.open ? OPEN_BASE : CH / t.worldH,
});
const refFor = (t) => referenceWidthFor(REF, t.tw);

// The PREVIOUS unit, kept here ONLY to prove these tests can fail: it divided by the track's own
// corridor, so the same setting showed a different amount of world on every track.
const oldUnitWorldPx = (trackWidths, t) => trackWidths * t.tw;

describe('1. THE PROPERTY: same setting, different corridor width, same visible world', () => {
  it('every track shows the identical amount of world at the same setting', () => {
    for (const n of [0.4, 0.75, 1.5, 4]) {
      const seen = TRACKS.map((t) => {
        const { axisY } = axesFor(t);
        return visibleWorldPx(camZoomForCorridors(n, refFor(t), axisY), axisY);
      });
      for (const v of seen) expect(v).toBeCloseTo(n * REF, 6);
      expect(Math.max(...seen) - Math.min(...seen)).toBeLessThan(1e-6);
    }
  });

  it('the narrowest and the widest track agree to the pixel — 131 px vs 300 px corridor', () => {
    const narrow = TRACKS[0];
    const wide = TRACKS[4];
    const a = visibleWorldPx(
      camZoomForCorridors(0.75, refFor(narrow), axesFor(narrow).axisY),
      axesFor(narrow).axisY
    );
    const b = visibleWorldPx(
      camZoomForCorridors(0.75, refFor(wide), axesFor(wide).axisY),
      axesFor(wide).axisY
    );
    expect(a).toBeCloseTo(225, 6);
    expect(b).toBeCloseTo(225, 6);
  });

  // FAILURE PROOF — the same question under the PREVIOUS unit, which is what the owner could see:
  // 2.0 was 262 world px on Searound and 600 on Mountainstreet, a 2.3x spread with no author.
  it('FAILURE PROOF: the track-widths unit spread the same setting across a 2.3x range', () => {
    const old = TRACKS.map((t) => oldUnitWorldPx(2, t));
    expect(Math.max(...old) / Math.min(...old)).toBeCloseTo(300 / 131, 6);
    expect(Math.min(...old)).toBeCloseTo(262, 6); // searound
    expect(Math.max(...old)).toBeCloseTo(600, 6); // mountainstreet
  });
});

describe('2. same setting, any world resolution → the same shot', () => {
  it.each(TRACKS)('$name shows exactly the setting, on the short axis', (t) => {
    const { axisY } = axesFor(t);
    for (const n of [0.25, 0.75, 1.5, 4, 13]) {
      const z = camZoomForCorridors(n, refFor(t), axisY);
      expect(corridorsForCamZoom(z, refFor(t), axisY)).toBeCloseTo(n, 9);
    }
  });

  it('the world resolution cancels: doubling the world changes nothing', () => {
    const small = corridorsForCamZoom(camZoomForCorridors(1.5, REF, CH / 2048), REF, CH / 2048);
    const large = corridorsForCamZoom(camZoomForCorridors(1.5, REF, CH / 4096), REF, CH / 4096);
    expect(small).toBeCloseTo(large, 9);
    expect(small).toBeCloseTo(1.5, 9);
  });

  it('world px and corridors are the same reading in two units', () => {
    const { axisY } = axesFor(TRACKS[1]);
    const z = camZoomForCorridors(0.75, REF, axisY);
    expect(visibleWorldPx(z, axisY)).toBeCloseTo(corridorsForCamZoom(z, REF, axisY) * REF, 6);
  });
});

describe('3. a larger setting is a wider shot — in every state', () => {
  const states = [
    ['OVERVIEW', CAM_STATE.OVERVIEW],
    ['LEADER_ZOOM', CAM_STATE.LEADER_ZOOM],
    ['BATTLE_ZOOM', CAM_STATE.BATTLE_ZOOM],
    ['COMEBACK_ZOOM', CAM_STATE.COMEBACK_ZOOM],
    ['LEAD_CHANGE', CAM_STATE.LEAD_CHANGE],
  ];

  it.each(states)('%s: 1.5 corridors is a wider shot than 0.75', (label) => {
    const mk = (n) => {
      const profiles = {};
      for (const [s] of states)
        profiles[s] = { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles[s], visibleCorridors: n };
      return new CameraDirector(
        3072,
        2048,
        false,
        { cameraStateProfiles: profiles },
        28.5,
        null,
        131
      );
    };
    const zoomOf = (cd) =>
      ({
        OVERVIEW: cd._overviewStateZoom,
        LEADER_ZOOM: cd._leaderZoom,
        BATTLE_ZOOM: cd._battleZoom,
        COMEBACK_ZOOM: cd._comebackZoom,
        LEAD_CHANGE: cd._leadChangeZoom,
      })[label];
    expect(zoomOf(mk(1.5))).toBeLessThan(zoomOf(mk(0.75))); // wider setting = smaller cam.zoom
  });

  it('the states are COMMENSURABLE: one number, one ordering, across states', () => {
    const cd = new CameraDirector(3072, 2048, false, DEFAULT_CAMERA_CONFIG, 28.5, null, 131);
    const c = (z) => corridorsForCamZoom(z, REF, CH / 2048);
    expect(c(cd._overviewStateZoom)).toBeCloseTo(1.5, 6);
    expect(c(cd._leaderZoom)).toBeCloseTo(0.75, 6);
    expect(c(cd._leadChangeZoom)).toBeCloseTo(0.75, 6);
    expect(c(cd._battleZoom)).toBeCloseTo(0.55, 6);
    expect(c(cd._comebackZoom)).toBeCloseTo(0.55, 6);
    expect(c(cd._photoFinishZoom)).toBeCloseTo(0.4, 6);
    // the owner's ordering: OVERVIEW widest at 2x LEADER, BATTLE/COMEBACK tighter, PHOTO tightest
    expect(cd._overviewStateZoom).toBeLessThan(cd._leaderZoom);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
    expect(cd._comebackZoom).toBeGreaterThan(cd._leaderZoom);
    expect(cd._photoFinishZoom).toBeGreaterThan(cd._battleZoom);
  });

  it('the LEADER default is the picture the owner judged good: 225 world px', () => {
    for (const t of TRACKS) {
      const { axisY } = axesFor(t);
      const cd = new CameraDirector(
        t.worldW,
        t.worldH,
        t.open,
        DEFAULT_CAMERA_CONFIG,
        28.5,
        null,
        t.tw
      );
      expect(visibleWorldPx(cd._leaderZoom, axisY), t.name).toBeCloseTo(225, 3);
    }
  });

  it('a corrupt or missing setting falls back instead of producing NaN', () => {
    const { axisY } = axesFor(TRACKS[0]);
    const opts = {
      referenceWidthPx: REF,
      axisY,
      clampCamZoom: (z) => z,
      fallbackCorridors: 0.75,
    };
    for (const bad of [undefined, null, NaN, 0, -3, 'wide']) {
      const z = resolveZoomForCorridors(bad, opts);
      expect(Number.isFinite(z)).toBe(true);
      expect(corridorsForCamZoom(z, REF, axisY)).toBeCloseTo(0.75, 6);
    }
  });
});

describe('4. max(reference, actual) — a track wider than the reference keeps its own width', () => {
  it('every shipped track uses the reference; today none is wider than 300', () => {
    for (const t of TRACKS) expect(referenceWidthFor(REF, t.tw)).toBe(REF);
  });

  it('a 400 px track authored tomorrow is framed by its OWN width, not by the reference', () => {
    expect(referenceWidthFor(REF, 400)).toBe(400);
    const { axisY } = axesFor({ open: false, worldH: 2048 });
    // 1.0 therefore still shows one whole corridor there rather than three quarters of one.
    const z = camZoomForCorridors(1, referenceWidthFor(REF, 400), axisY);
    expect(visibleWorldPx(z, axisY)).toBeCloseTo(400, 6);
  });

  // FAILURE PROOF — without the max(), the setting would ask to crop the corridor of any track
  // wider than the reference, and every tight shot there would be decided by the guarantee instead.
  it('FAILURE PROOF: a plain reference would show 0.75 of a 400 px corridor at 1.0', () => {
    const { axisY } = axesFor({ open: false, worldH: 2048 });
    const naive = camZoomForCorridors(1, REF, axisY);
    expect(visibleWorldPx(naive, axisY) / 400).toBeCloseTo(0.75, 6);
  });

  it('a missing or corrupt reference still yields a usable width', () => {
    expect(referenceWidthFor(undefined, 131)).toBe(131);
    expect(referenceWidthFor(NaN, 131)).toBe(131);
    expect(referenceWidthFor(300, 0)).toBe(300);
    expect(Number.isNaN(referenceWidthFor(0, 0))).toBe(true);
  });

  it('the reference rescales every track at once, and by the same factor', () => {
    const at = (ref) =>
      TRACKS.map((t) => {
        const { axisY } = axesFor(t);
        return visibleWorldPx(
          camZoomForCorridors(0.75, referenceWidthFor(ref, t.tw), axisY),
          axisY
        );
      });
    const a = at(300);
    const b = at(400);
    for (let i = 0; i < a.length; i++) expect(b[i] / a[i]).toBeCloseTo(400 / 300, 6);
  });
});

// The unit's own full-track-width clamp was REMOVED with the unit that justified it. If the
// corridor guarantee had gone with it, a tight setting on a wide track would quietly crop the
// corridor and no other test would notice. These are the guards for that.
describe('5. the guarantee still reads the REAL corridor, not the reference', () => {
  const mkAt = (tw, corridors) =>
    new CameraDirector(
      3072,
      2047,
      false,
      {
        ...DEFAULT_CAMERA_CONFIG,
        minRacersVisible: 0, // isolate the GEOMETRIC guarantee from the dramaturgical one
        cameraStateProfiles: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
          LEADER_ZOOM: {
            ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
            visibleCorridors: corridors,
          },
        },
      },
      28.5,
      shapeFor(tw),
      tw
    );
  // A closed oval, so the heading rotates and the guarantee is exercised on every orientation.
  function shapeFor(tw) {
    return {
      isOpen: false,
      getActualTrackWidth: () => tw,
      getTotalLength: () => 4000,
      getPosition: (t) => {
        const a = 2 * Math.PI * (((t % 1) + 1) % 1);
        return { x: 1536 + Math.cos(a) * 900, y: 1024 + Math.sin(a) * 600, angle: a };
      },
    };
  }
  const settle = (cd) => {
    const racers = [];
    for (let i = 0; i < 8; i++) {
      const p = cd._shape.getPosition(0.5 - 0.02 * i);
      racers.push({ index: i, name: `R${i}`, t: 0.5 - 0.02 * i, x: p.x, y: p.y, finished: false });
    }
    for (let i = 0; i < 200; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(
        racers,
        20000 + i * 16,
        {
          raceElapsed: 20000,
          finishedCount: 0,
          winner: null,
          finishT: 2,
        },
        CW,
        CH
      );
    }
    return cd;
  };

  it('a setting too tight for a WIDE corridor is widened; the same setting on a narrow one is not', () => {
    const tight = 0.5; // 150 world px — below a 300 px corridor, above a 131 px one
    const wide = settle(mkAt(300, tight));
    const narrow = settle(mkAt(131, tight));
    expect(wide.visibleWorldPx).toBeGreaterThan(1.8 * 150); // widened, and by a lot
    expect(narrow.visibleWorldPx).toBeCloseTo(150, 0); // the setting is honoured untouched
  });

  it('the guarantee scales with the REAL corridor, so a wider track demands more world', () => {
    const at = (tw) => settle(mkAt(tw, 0.25)).visibleWorldPx;
    const a = at(131);
    const b = at(211);
    const c = at(300);
    // 0.25 corridors is 75 world px — too tight for every corridor here, so each is widened…
    for (const [tw, v] of [
      [131, a],
      [211, b],
      [300, c],
    ])
      expect(v, `tw=${tw}`).toBeGreaterThan(75);
    // …and by MORE the wider the real corridor is, which is the content of the guarantee.
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    // Deliberately not asserting `visibleWorldPx >= trackWidth`: that reads the SHORT screen axis,
    // while the corridor is kept in frame across ITS OWN direction. Where the corridor lies along
    // the frame's long axis it fits with less vertical extent than its own width, correctly.
    // framingRule.test.js sweeps that property on every heading.
  });

  it('a generous setting is left alone on every corridor width', () => {
    for (const tw of [131, 178, 211, 250, 300]) {
      expect(settle(mkAt(tw, 4)).visibleWorldPx, `tw=${tw}`).toBeCloseTo(1200, 0);
    }
  });
});

describe('the racer count is gone from the zoom', () => {
  it('the same setting resolves identically for 6, 20, 40 and 60 racers', () => {
    const mk = (n) =>
      new CameraDirector(3072, 2048, false, DEFAULT_CAMERA_CONFIG, 2 * (285 / n), null, 131);
    const z = [6, 20, 40, 60].map((n) => mk(n)._overviewStateZoom);
    for (const v of z) expect(v).toBeCloseTo(z[0], 12);
  });

  it('and so is the track width — the setting no longer reads the corridor at all', () => {
    const z = [131, 178, 211, 250, 300].map(
      (tw) =>
        new CameraDirector(3072, 2048, false, DEFAULT_CAMERA_CONFIG, 28.5, null, tw)._leaderZoom
    );
    for (const v of z) expect(v).toBeCloseTo(z[0], 12);
  });

  it('the visible-corridors reading on each axis still follows the projection aspect', () => {
    const { axisX, axisY } = axesFor(TRACKS[0]);
    const v = visibleCorridors(camZoomForCorridors(0.75, REF, axisY), REF, axisX, axisY);
    expect(v.across).toBeCloseTo(0.75, 9);
    expect(v.along / v.across).toBeCloseTo(1.5, 2); // closed-track anisotropy, reported not set
  });
});

// ── CAMERA-MIN-DRAW-1: the readability floor is DRAWING ONLY ──────────────────────────────────
// The old minimum-sprite-size floor was a second, silent zoom authority — it fought the owner's own
// zoom setting, which is why CAMERA-PICTURE-FIXES-1 removed it. The floor is back, but it bounds one
// multiplication in the render loop and nothing else. This is the guard for that: the camera must
// produce byte-identical zooms whatever the floor is set to, including absurd values.
describe('the min-draw floor cannot reach the zoom', () => {
  const withFloor = (frac) => ({ ...DEFAULT_CAMERA_CONFIG, minDrawnFrameFrac: frac });
  const zoomsOf = (cfg) => {
    const cd = new CameraDirector(3072, 2047, false, cfg, 28.5, null, 178);
    return {
      overview: cd._overviewStateZoom,
      leader: cd._leaderZoom,
      leadChange: cd._leadChangeZoom,
      battle: cd._battleZoom,
      comeback: cd._comebackZoom,
      photo: cd._photoFinishZoom,
      countdown: cd._countdownStartZoom,
    };
  };

  it('every state zoom is identical with the floor off, at the default, and at an absurd value', () => {
    const off = zoomsOf(withFloor(0));
    for (const frac of [0.045, 0.2, 0.9]) {
      const on = zoomsOf(withFloor(frac));
      for (const key of Object.keys(off)) {
        expect(on[key], `${key} at ${frac}`).toBe(off[key]); // exact, not close
      }
    }
  });

  it('and the shipped default frames exactly the same world as a config without the key at all', () => {
    const { minDrawnFrameFrac: _omit, ...noKey } = DEFAULT_CAMERA_CONFIG;
    const a = zoomsOf(noKey);
    const b = zoomsOf(DEFAULT_CAMERA_CONFIG);
    for (const key of Object.keys(a)) expect(b[key]).toBe(a[key]);
  });
});
