// ============================================================
// zoomUnit.test.js — CAMERA-ZOOM-UNIT-1, the three load-bearing tests
//
// These three are the block. Each has a FAILURE PROOF beside it — a computation showing what the
// OLD unit produced for the same question — because a test that only ever passes cannot tell you
// whether it is testing anything. The ×0.8 open-track ceiling shaped every OVERVIEW for months
// with no test covering it; the point of the proofs is that this cannot happen here quietly.
//
//   1. Same setting, different world resolution → same number of track widths. Small and large
//      track, closed and open. This is the owner's precondition, as a test.
//   2. A larger setting is a WIDER shot in every state — one ordering, all five states.
//   3. The full-track-width guarantee holds at every setting, including the extremes.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  camZoomForTrackWidths,
  trackWidthsForCamZoom,
  visibleTrackWidths,
  guaranteeCamZoom,
  resolveZoomForTrackWidths,
} from './zoomUnit.js';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';

const CW = 1280;
const CH = 720;
const OPEN_BASE = 1.5;

// The ten shipped tracks, reduced to what the zoom rule reads: corridor width, world size,
// topology. Numbers taken from server/seeds/tracks — the smallest and largest of each kind.
const TRACKS = [
  { name: 'searound (closed, narrowest)', tw: 131, worldW: 3072, worldH: 2048, open: false },
  { name: 'dirt-oval (closed)', tw: 178, worldW: 3072, worldH: 2047, open: false },
  { name: 'ice-track (closed, widest)', tw: 211, worldW: 3072, worldH: 2047, open: false },
  { name: 'luger-hill (open, smallest world)', tw: 250, worldW: 4096, worldH: 2728, open: true },
  { name: 'mountainstreet (open, largest world)', tw: 300, worldW: 6144, worldH: 4096, open: true },
];

const axesFor = (t) => ({
  axisX: t.open ? OPEN_BASE : CW / t.worldW,
  axisY: t.open ? OPEN_BASE : CH / t.worldH,
});

// The OLD unit, kept here ONLY to prove these tests can fail. Four states used `spriteScale` as an
// absolute screen-px-per-world-px scale, so the visible world width was 1280/spriteScale — a fixed
// number of WORLD pixels, which is a different number of TRACK WIDTHS on every track.
const oldUnitTrackWidths = (spriteScale, t) => CW / spriteScale / t.tw;

describe('1. same setting, any world → the same number of track widths', () => {
  it.each(TRACKS)('$name shows exactly the setting, on the short axis', (t) => {
    const { axisY } = axesFor(t);
    for (const n of [1, 1.5, 2, 4, 8]) {
      const z = camZoomForTrackWidths(n, t.tw, axisY);
      expect(trackWidthsForCamZoom(z, t.tw, axisY)).toBeCloseTo(n, 9);
    }
  });

  it('one setting frames the same shot on ALL five tracks — closed and open together', () => {
    const seen = TRACKS.map((t) => {
      const { axisY } = axesFor(t);
      return trackWidthsForCamZoom(camZoomForTrackWidths(2, t.tw, axisY), t.tw, axisY);
    });
    for (const v of seen) expect(v).toBeCloseTo(2, 9);
    expect(Math.max(...seen) - Math.min(...seen)).toBeLessThan(1e-9);
  });

  it('the world resolution cancels: doubling the world changes nothing', () => {
    const tw = 200;
    const small = trackWidthsForCamZoom(camZoomForTrackWidths(3, tw, CH / 2048), tw, CH / 2048);
    const large = trackWidthsForCamZoom(camZoomForTrackWidths(3, tw, CH / 4096), tw, CH / 4096);
    expect(small).toBeCloseTo(large, 9);
    expect(small).toBeCloseTo(3, 9);
  });

  // FAILURE PROOF — the same question under the OLD unit. One `spriteScale` framed 2.3x more
  // track on one track than another; that spread is exactly what this block removes, and if the
  // new rule ever regained a world-size dependence the test above would break while this stays.
  it('FAILURE PROOF: the old spriteScale unit spread the same setting across a 2.3x range', () => {
    const old = TRACKS.map((t) => oldUnitTrackWidths(1.81, t));
    const spread = Math.max(...old) / Math.min(...old);
    expect(spread).toBeGreaterThan(2); // measured 2.3x across the ten shipped tracks
    expect(Math.min(...old)).toBeCloseTo(CW / 1.81 / 300, 6); // mountainstreet: 2.36 TW
    expect(Math.max(...old)).toBeCloseTo(CW / 1.81 / 131, 6); // searound:       5.40 TW
  });
});

describe('2. a larger setting is a wider shot — in every state', () => {
  const states = [
    ['OVERVIEW', CAM_STATE.OVERVIEW],
    ['LEADER_ZOOM', CAM_STATE.LEADER_ZOOM],
    ['BATTLE_ZOOM', CAM_STATE.BATTLE_ZOOM],
    ['COMEBACK_ZOOM', CAM_STATE.COMEBACK_ZOOM],
    ['LEAD_CHANGE', CAM_STATE.LEAD_CHANGE],
  ];

  it.each(states)('%s: 4 track widths is a wider shot than 2', (label) => {
    const mk = (n) => {
      const profiles = {};
      for (const [s] of states)
        profiles[s] = { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles[s], trackWidths: n };
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
    expect(zoomOf(mk(4))).toBeLessThan(zoomOf(mk(2))); // wider setting = smaller cam.zoom
  });

  it('the five states are COMMENSURABLE: one number, one ordering, across states', () => {
    // The property that did not hold before — OVERVIEW's number and LEADER's number were not
    // comparable at all, because they were computed by different formulas in different units.
    const cd = new CameraDirector(3072, 2048, false, DEFAULT_CAMERA_CONFIG, 28.5, null, 131);
    const widths = (z) => trackWidthsForCamZoom(z, 131, CH / 2048);
    expect(widths(cd._overviewStateZoom)).toBeCloseTo(4, 6);
    expect(widths(cd._leaderZoom)).toBeCloseTo(2, 6);
    expect(widths(cd._leadChangeZoom)).toBeCloseTo(2, 6);
    expect(widths(cd._battleZoom)).toBeCloseTo(1.5, 6);
    expect(widths(cd._comebackZoom)).toBeCloseTo(1.5, 6);
    // and the owner's ordering: OVERVIEW widest at ~2x LEADER, BATTLE/COMEBACK tighter than LEADER
    expect(cd._overviewStateZoom).toBeLessThan(cd._leaderZoom);
    expect(cd._battleZoom).toBeGreaterThan(cd._leaderZoom);
    expect(cd._comebackZoom).toBeGreaterThan(cd._leaderZoom);
  });

  // FAILURE PROOF — under the old unit the five numbers were not on one scale. OVERVIEW's 1.0 and
  // LEADER's 1.81 could not be compared: OVERVIEW's multiplied a target SPRITE SIZE, LEADER's WAS
  // a screen scale. A higher OVERVIEW number meant a TIGHTER shot; a higher LEADER number too —
  // but a factor of two in one was not a factor of two in the other.
  it('FAILURE PROOF: the old OVERVIEW and LEADER numbers were not on one scale', () => {
    const t = TRACKS[0];
    const oldLeader = oldUnitTrackWidths(1.81, t); // 5.40 TW
    // OVERVIEW's old rule: effX = overviewTargetScreenPx x ovScale / bodyNarrow(racerCount)
    const oldOverviewAt = (bodyNarrow) => CW / ((28 * 1.0) / bodyNarrow) / t.tw;
    expect(oldOverviewAt(24.89)).not.toBeCloseTo(oldLeader, 1);
    // and the same OVERVIEW setting moved with the RACER COUNT — the non-monotonicity that goes
    // with the count division (measured: 30 racers 1.65 TW, 40 racers 2.48, 60 racers 1.65).
    expect(oldOverviewAt(24.89)).not.toBeCloseTo(oldOverviewAt(12.44), 1);
  });
});

describe('3. the full track width is always visible', () => {
  it.each(TRACKS)('$name: the guarantee holds at every setting, including the extremes', (t) => {
    const { axisX, axisY } = axesFor(t);
    const clamp = (z) => z; // isolate the guarantee from the projection's own range
    for (const n of [0.01, 0.25, 0.5, 0.99, 1, 1.5, 2, 4, 50, 1000]) {
      const z = resolveZoomForTrackWidths(n, {
        trackWidthPx: t.tw,
        axisX,
        axisY,
        clampCamZoom: clamp,
      });
      const v = visibleTrackWidths(z, t.tw, axisX, axisY);
      expect(Math.min(v.across, v.along)).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });

  it('the guarantee WIDENS a too-tight setting and leaves a legal one alone', () => {
    const t = TRACKS[0];
    const { axisX, axisY } = axesFor(t);
    const clamp = (z) => z;
    const tooTight = resolveZoomForTrackWidths(0.25, {
      trackWidthPx: t.tw,
      axisX,
      axisY,
      clampCamZoom: clamp,
    });
    expect(trackWidthsForCamZoom(tooTight, t.tw, axisY)).toBeCloseTo(1, 9); // widened to exactly 1
    const legal = resolveZoomForTrackWidths(2, {
      trackWidthPx: t.tw,
      axisX,
      axisY,
      clampCamZoom: clamp,
    });
    expect(trackWidthsForCamZoom(legal, t.tw, axisY)).toBeCloseTo(2, 9); // untouched
  });

  it('the guarantee never STEERS — it is a ceiling on zoom and nothing else (Lesson 192)', () => {
    // Same inputs, same output, no dependence on racers, positions, state or time.
    const t = TRACKS[2];
    const { axisX, axisY } = axesFor(t);
    const a = guaranteeCamZoom(t.tw, axisX, axisY);
    const b = guaranteeCamZoom(t.tw, axisX, axisY);
    expect(a).toBe(b);
    expect(Number.isFinite(a)).toBe(true);
  });

  it('a corrupt or missing setting falls back instead of producing NaN', () => {
    const { axisX, axisY } = axesFor(TRACKS[0]);
    const opts = {
      trackWidthPx: 131,
      axisX,
      axisY,
      clampCamZoom: (z) => z,
      fallbackTrackWidths: 2,
    };
    for (const bad of [undefined, null, NaN, 0, -3, 'wide']) {
      const z = resolveZoomForTrackWidths(bad, opts);
      expect(Number.isFinite(z)).toBe(true);
      expect(trackWidthsForCamZoom(z, 131, axisY)).toBeCloseTo(2, 6);
    }
  });

  // FAILURE PROOF — the guarantee has to be able to fail. Without it, the tightest shipped
  // setting on the narrowest track would cut the corridor off.
  it('FAILURE PROOF: without the guarantee, a tight setting hides part of the track', () => {
    const t = TRACKS[0];
    const { axisX, axisY } = axesFor(t);
    const unguarded = camZoomForTrackWidths(0.25, t.tw, axisY); // the raw unit, no Math.min
    const v = visibleTrackWidths(unguarded, t.tw, axisX, axisY);
    expect(Math.min(v.across, v.along)).toBeLessThan(1); // 0.25 of a corridor on screen
  });
});

describe('the racer count is gone from the zoom', () => {
  it('the same setting resolves identically for 6, 20, 40 and 60 racers', () => {
    const mk = (n) =>
      new CameraDirector(3072, 2048, false, DEFAULT_CAMERA_CONFIG, 2 * (285 / n), null, 131);
    const z = [6, 20, 40, 60].map((n) => mk(n)._overviewStateZoom);
    for (const v of z) expect(v).toBeCloseTo(z[0], 12);
  });
});
