// ============================================================
// File:        pauseRaceHarness.jsx
// Path:        client/src/test/pauseRaceHarness.jsx
// Project:     RaceArena — PAUSE-RESUME-1
//
// THE REAL RACE SCREEN, DRIVEN ONE FRAME AT A TIME — for the pause-and-resume tests. Test-only;
// nothing under `src/modules` or `src/screens` imports it. Shared by
// `screens/RaceScreen/pauseResume.test.jsx` and the two `pauseDeterminism*.test.jsx` files, which
// are split only so the suite can run them side by side.
//
// ── WHY IT MOUNTS `RaceScreen` AND DOES NOT USE THE HEADLESS SIMULATOR ──────────────────────────
//
// The headless path (`runRaceHeadless`, the golden harness) steps the physics in a plain loop and
// has no wall clock at all, so a "pause" there would be a loop that stops and starts again — it
// would pass whatever the race screen did. What a pause can break lives in the BROWSER loop: the
// frame-time handling, the accumulator, and every stamp read off the frame time. So the screen is
// mounted for real and its `requestAnimationFrame` loop is handed timestamps by hand — an injected
// clock, one frame at a time — while the real button and the real Space key are pressed between
// frames.
//
// `Math.random` is replaced by a seeded generator per run, so the effects' own randomness cannot
// make two runs differ for a reason that has nothing to do with the pause.
// ============================================================

import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import RaceScreen from '../screens/RaceScreen/index.jsx';
import { buildQuickTestRace } from '../screens/SetupScreen/quickTestRace.js';
import { DEFAULT_RACE_DEFAULTS } from '../modules/storage/defaults.js';
import { normalSpeedFrom } from '../modules/durationModel.js';
import { loadBaseSpeedConfig } from '../modules/baseSpeedConfig.js';
import { loadRaceBehaviorConfig } from '../modules/raceBehaviorConfig.js';
import { loadRaceDynamicsConfig } from '../modules/raceDynamicsConfig.js';
import { buildHistoryEntry } from '../modules/raceHistory.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRACKS = join(HERE, '..', '..', '..', 'server', 'seeds', 'tracks');
const loadTrack = (id) => JSON.parse(readFileSync(join(TRACKS, `${id}.json`), 'utf8'));

/** The browser's frame interval in these runs — two physics steps per frame. */
export const FRAME_MS = 32;
/** How many frames each pause lasts. */
export const PAUSED_FRAMES = 25;
/** A hard stop, so a race that never finishes fails instead of hanging. */
export const MAX_FRAMES = 12000;
/** Frames drawn after the last crossing, so the start of the ending is compared too. */
const AFTER_FINISH = 20;

// ── the canvas: a context that answers every call and hashes the frame's calls ─────────────────
let frameHash = 0;
let frameCalls = 0;
// FNV-1a over 32-bit words. Numbers are hashed by their exact bits (no string is built), so the
// hash sees every last digit of every coordinate the frame was drawn with.
const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);
function mixWord(h, w) {
  return Math.imul(h ^ w, 0x01000193) >>> 0;
}
function mixString(h, str) {
  for (let i = 0; i < str.length; i++) h = mixWord(h, str.charCodeAt(i));
  return h;
}
/** Count a race-canvas call; hash its name and arguments too while recording. */
function note(prop, args) {
  frameCalls += 1;
  if (!recording) return;
  let h = mixString(frameHash || 0x811c9dc5, prop);
  for (const v of args) {
    if (typeof v === 'number') {
      f64[0] = v;
      h = mixWord(mixWord(h, u32[0]), u32[1]);
    } else if (typeof v === 'string') h = mixString(h, v);
    else h = mixString(h, typeof v);
  }
  frameHash = h;
}

/** Whether the race canvas's calls are hashed; off for the runs that compare results only. */
let recording = false;

/** What a 2D context answers, beyond `undefined`. */
function answer(prop, args) {
  if (prop === 'measureText') return { width: 10 };
  if (prop === 'getTransform') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  if (prop === 'getImageData') return new globalThis.ImageData(args[2] || 1, args[3] || 1);
  if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
    return { addColorStop() {} };
  return undefined;
}

/**
 * A context that answers every call. Only the RACE canvas's context is hashed: the off-screen
 * canvases (sprite tints, glow images) are caches filled once per process, so the first run of a
 * process draws into them and the second does not — a difference that is not the pause's.
 */
function makeCtx(record) {
  const target = { canvas: { width: 1280, height: 720 } };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'canvas') return t.canvas;
      if (typeof prop !== 'string') return undefined;
      if (prop in t && typeof t[prop] !== 'function') return t[prop];
      return (...args) => {
        if (record) note(prop, args);
        return answer(prop, args);
      };
    },
    set(t, prop, value) {
      t[prop] = value;
      if (record) note(String(prop), [value]);
      return true;
    },
  });
}

function stubRecordingCanvas() {
  const raceCtx = makeCtx(true);
  const otherCtx = makeCtx(false);
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function get2d(kind) {
      if (kind !== '2d') return null;
      return this.classList?.contains('race-canvas') ? raceCtx : otherCtx;
    });
}

// ── the injected clock: rAF callbacks are queued and run only when the test hands out a frame ────
let queue = [];
let rawTs = 0;
function stubFrameClock() {
  queue = [];
  rawTs = 1000;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    queue.push(cb);
    return queue.length;
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
}
/** Hand out one frame; returns that frame's canvas-call hash and call count. */
export function pumpFrame() {
  rawTs += FRAME_MS;
  frameHash = 0;
  frameCalls = 0;
  const cbs = queue.splice(0);
  act(() => {
    for (const cb of cbs) cb(rawTs);
  });
  return { hash: frameHash, calls: frameCalls };
}

/** mulberry32 — so `Math.random` gives the same stream to both runs of a case. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The race a Quick Test starts on this track — the shipped builder, not a hand-written payload. */
export function raceFor(trackId, seed, nRacers = 6) {
  const geom = { ...loadTrack(trackId) };
  geom.geometryId = geom.id; // the geometry is stored under the track's own id below
  // Short races, so twelve of them run twice in a suite: one lap, or thirty seconds on an open track
  // — still long enough for the race plan to run (its minimum is the shipped 30 s).
  if (geom.closed) geom.defaultLaps = 1;
  else geom.defaultDurationSec = 30;
  localStorage.setItem(`racearena:trackGeometries:${geom.id}`, JSON.stringify(geom));
  return buildQuickTestRace({
    track: geom,
    geom,
    racers: Array.from({ length: nRacers }, (_, i) => ({ name: `Racer ${i + 1}` })),
    racerTypeId: geom.defaultRacerTypeId,
    raceDefaults: DEFAULT_RACE_DEFAULTS,
    normalSpeedPxPerSec: normalSpeedFrom(loadBaseSpeedConfig()),
    runoutZone: loadRaceBehaviorConfig().runoutZone,
    racePlanMinDur: loadRaceDynamicsConfig().racePlanMinDurationSec,
    racePlanSeed: seed,
  });
}

export const inCountdown = () => !!document.querySelector('.race-phase-badge--countdown');
export const results = () => sessionStorage.getItem('raceResults');
export const pauseButton = () => screen.queryByTestId('pause-race');
export const overlay = () => screen.queryByTestId('race-paused-overlay');
/** Press Space the way a keyboard does; returns whether the screen swallowed it. */
export function pressSpace() {
  const down = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true });
  const up = new KeyboardEvent('keyup', { key: ' ', code: 'Space', cancelable: true });
  act(() => {
    window.dispatchEvent(down);
    window.dispatchEvent(up);
  });
  return down.defaultPrevented && up.defaultPrevented;
}

/**
 * Run one race on the real screen.
 * @param {object} race       the activeRace payload
 * @param {number[]} pauseAt  frame indices AFTER which a pause is taken (empty: never paused)
 * @param {{record?: boolean}} [opts]  hash the race canvas frame by frame
 * @returns {{ frames: {hash:number,calls:number}[], paused: {hash:number,calls:number}[],
 *             results: string, racingStart: number, finishFrame: number }}
 */
export function runRace(race, pauseAt = [], { record = false } = {}) {
  recording = record;
  // Every run starts its frame clock at the same raw time — the background's stars and the track
  // lights are drawn from the absolute frame time, so two runs compared frame by frame must agree on it.
  rawTs = 1000;
  sessionStorage.removeItem('raceResults');
  sessionStorage.setItem('activeRace', JSON.stringify(race));
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(race.racePlanSeed));
  render(
    <MemoryRouter initialEntries={['/race']}>
      <RaceScreen />
    </MemoryRouter>
  );
  const frames = [];
  const pausedFrames = [];
  let racingStart = -1;
  let finishFrame = -1;
  let toggles = 0;
  for (let i = 0; i < MAX_FRAMES; i++) {
    frames.push(pumpFrame());
    if (racingStart < 0 && !inCountdown()) racingStart = i;
    if (finishFrame < 0 && results() !== null) finishFrame = i;
    if (finishFrame >= 0 && i >= finishFrame + AFTER_FINISH) break;
    if (pauseAt.includes(i)) {
      // Alternate the two ways in, so both are exercised in every paused run.
      const viaKey = toggles++ % 2 === 1;
      if (viaKey) expect(pressSpace()).toBe(true);
      else act(() => fireEvent.click(pauseButton()));
      expect(overlay()).not.toBeNull();
      expect(pauseButton()).toHaveTextContent('Resume');
      for (let k = 0; k < PAUSED_FRAMES; k++) pausedFrames.push(pumpFrame());
      if (viaKey) expect(pressSpace()).toBe(true);
      else act(() => fireEvent.click(pauseButton()));
      expect(overlay()).toBeNull();
      expect(pauseButton()).toHaveTextContent('Pause');
    }
  }
  const out = { frames, paused: pausedFrames, results: results(), racingStart, finishFrame };
  cleanup();
  vi.mocked(Math.random).mockRestore();
  return out;
}

/** Registers the per-test scaffolding: clean storage, the recording canvas, the frame clock. */
export function installPauseHarness() {
  let restoreCanvas;
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    recording = false;
    restoreCanvas = stubRecordingCanvas();
    stubFrameClock();
  });
  afterEach(() => {
    cleanup();
    restoreCanvas?.mockRestore();
    vi.restoreAllMocks();
  });
}

/** Where the four pauses go, from the unpaused run's own phase boundaries. */
export function pausePoints({ racingStart: rs, finishFrame: ff }) {
  return [
    Math.floor(rs / 2), // in the countdown
    rs + Math.floor((ff - rs) * 0.1), // early
    rs + Math.floor((ff - rs) * 0.5), // mid-race
    ff - 3, // near the finish
  ];
}

/** The history entry the result screen would store — minus its own id and date, which are new per entry. */
export const storedEntry = (resultsJson) => ({
  ...buildHistoryEntry(JSON.parse(resultsJson)),
  id: null,
  date: null,
});

/**
 * THE DETERMINISM CHECK, one case: the same race run never paused and paused four times (in the
 * countdown, early, mid-race and near the finish — alternately through the button and through
 * Space) must give the same result payload and the same stored history entry.
 */
export function checkPausedRaceIsSameRace(trackId, seed) {
  const race = raceFor(trackId, seed);
  const plain = runRace(race);
  expect(plain.finishFrame, 'the unpaused race never finished').toBeGreaterThan(0);
  expect(plain.racingStart).toBeGreaterThan(0);

  const pauseAt = pausePoints(plain);
  const paused = runRace(race, pauseAt);

  // While paused the race canvas was not touched: the picture stood.
  expect(paused.paused).toHaveLength(pauseAt.length * PAUSED_FRAMES);
  expect(paused.paused.every((f) => f.calls === 0)).toBe(true);
  // The result payload is identical — finish order, every finish time, the elapsed time (which
  // would carry the paused seconds if the clock had kept running), the race and its world.
  expect(paused.results).not.toBeNull();
  const a = JSON.parse(plain.results);
  const b = JSON.parse(paused.results);
  expect(b.finishOrder.map((r) => r.index)).toEqual(a.finishOrder.map((r) => r.index));
  expect(b.finishOrder.map((r) => r.finishTimeMs)).toEqual(
    a.finishOrder.map((r) => r.finishTimeMs)
  );
  expect(b.elapsedTime).toBe(a.elapsedTime);
  expect(b).toEqual(a);
  // …and so is what the result screen would store: the inputs "Verify race" replays from.
  expect(storedEntry(paused.results)).toEqual(storedEntry(plain.results));
  // The race reached each phase on the same frame of race-screen time.
  expect(paused.racingStart).toBe(plain.racingStart);
  expect(paused.finishFrame).toBe(plain.finishFrame);
}
