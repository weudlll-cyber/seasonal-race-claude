// ============================================================
// File:        testAids.js
// Path:        client/src/modules/testAids.js
// Project:     RaceArena — TEST-AIDS-1 (the owner's decision of 2026-10-04)
// Description: THE ONE PLACE THE CLIENT READS THE TEST-AIDS SWITCH. Every gate asks this module and
//              nothing else: `testAidsOn()` in plain code, `useTestAids()` in a component.
//
// ── WHAT THE SWITCH COVERS ──────────────────────────────────────────────────────────────────────
// One installation-wide value on the server (`server/src/settings/testAids.js`), set by admins,
// SHIPPED OFF. While OFF, the developer-only displays and aids of reports/release/DEV-DISPLAYS-1.md
// are not shown or not active, whatever a browser has stored: the build, settings and race-plan
// badges (1–3), the hero rings (4), the M-key camera marker (7), Quick Test (9), every diagnostic and
// log HUD and the gap re-roll marker (13–25, forced off here and locked in the Dev Screen),
// `?constSpeed=1` (26), `/diagnose-verteilung` (27) and the console-only probes. While ON, everything
// behaves exactly as it did before the switch existed.
//
// ── OFF IS THE ANSWER TO EVERY DOUBT ────────────────────────────────────────────────────────────
// The value starts OFF and stays OFF until the server says ON: before sign-in, while the request is
// in flight, when it fails, and after sign-out. A race screen opened before the answer arrives races
// with the aids OFF — never the other way round.
//
// ── THE SHAPE ───────────────────────────────────────────────────────────────────────────────────
// One value, a set of listeners, and a subscribe in the shape `useSyncExternalStore` wants — the
// same shape as `serverStatus.js`. `TestAidsSyncOnAuth.jsx` loads it on sign-in, the way
// `BrandingSyncOnAuth.jsx` loads the brand.
// ============================================================

import { useSyncExternalStore } from 'react';
import { fetchTestAids, saveTestAids } from '../services/settingsApi.js';

/**
 * The camera-config keys of the diagnostic displays the switch forces off: the hero rings (item 4),
 * items 13–24 of DEV-DISPLAYS-1, and the detour log that sits with the logs in the Dev Screen.
 */
export const TEST_AID_CAMERA_KEYS = Object.freeze([
  'highlightHeroes',
  'showCameraDiagnostics',
  'showRpDiag',
  'showRpWinnerList',
  'showRpMinimapBadges',
  'showRpStartRow',
  'showTop10SpeedMonitor',
  'enableFrameLog',
  'cameraDetourLog',
  'enablePerfLog',
  'showBattleDiag',
  'showComebackDiag',
  'showLeadChangeDiag',
  'showGovernorDiag',
]);

/** The race-dynamics key the switch forces off: the gap re-roll marker (item 25). */
export const TEST_AID_DYNAMICS_KEYS = Object.freeze(['gapRerollDevMarker']);

/**
 * `unknown` until the server has answered for this sign-in; `on` or `off` after. Every gate treats
 * `unknown` as OFF. Only a page that a test aid IS — `/diagnose-verteilung` — waits for the answer
 * rather than turning an admin away while it is on its way.
 * @type {'unknown' | 'off' | 'on'}
 */
let state = 'unknown';
const listeners = new Set();

function set(next) {
  if (next === state) return;
  state = next;
  for (const fn of listeners) fn();
}

/** Is the test-aids switch ON? OFF until the server has said otherwise. */
export function testAidsOn() {
  return state === 'on';
}

/** @returns {'unknown' | 'off' | 'on'} */
export function testAidsState() {
  return state;
}

/**
 * Subscribe to changes. Returns the unsubscribe function, in the shape `useSyncExternalStore` wants.
 * @param {() => void} fn
 */
export function subscribeTestAids(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The switch, for a component — re-renders when it changes. */
export function useTestAids() {
  return useSyncExternalStore(subscribeTestAids, testAidsOn, testAidsOn);
}

/** The switch with its `unknown`, for the one gate that must wait for the answer. */
export function useTestAidsState() {
  return useSyncExternalStore(subscribeTestAids, testAidsState, testAidsState);
}

/** Ask the server. Anything but a clear `{ enabled: true }` — including no answer — is OFF. */
export async function refreshTestAids() {
  try {
    const value = await fetchTestAids();
    set(value?.enabled === true ? 'on' : 'off');
  } catch {
    set('off');
  }
}

/** Signed out: nothing is known for whoever signs in next. */
export function clearTestAids() {
  set('unknown');
}

/** Admin: store the switch on the server, then follow what it stored. */
export async function storeTestAids(next) {
  const value = await saveTestAids(next);
  set(value?.enabled === true ? 'on' : 'off');
}

/**
 * A config with the given keys forced off while the switch is OFF; the config itself while ON.
 * @template {object} T
 * @param {T} config
 * @param {readonly string[]} keys
 * @returns {T}
 */
export function withTestAids(config, keys) {
  if (state === 'on') return config;
  const gated = { ...config };
  for (const k of keys) gated[k] = false;
  return gated;
}

/**
 * An address-bar test aid (`?<name>=1`), honoured only while the switch is ON — `?constSpeed=1`
 * changes the physics, so a stray link must not change an audience's race.
 * @param {string} name
 * @param {string} [search]  the query string; the page's own by default
 */
export function testAidUrlFlag(name, search = globalThis.location?.search ?? '') {
  return testAidsOn() && new URLSearchParams(search).get(name) === '1';
}

/** Test seam: set the value without a server (true, false, or 'unknown'). Not used by the application. */
export function _setTestAidsForTests(next) {
  set(next === 'unknown' ? 'unknown' : next === true ? 'on' : 'off');
}
