// ============================================================
// File:        client/src/utils/worldMode.js
// Project:     RaceArena — EYE-SETUP-2 (dev-only OPEN viewing switch)
//
// PURPOSE. A simple, visible dev switch to watch the candidate: `?world=combo` runs the COMBO
// (chaosSteer + faB60 draw-bias, exactly as screened); `?world=ship` forces the shipped world for a
// side-by-side. No coin-flip, no mapping, no localStorage session state.
//
// ROOT-CAUSE FIX (why EYE-SETUP-1's blind A/B never showed a candidate): the ?eye letter was read ONLY
// inside RaceScreen, but the app navigates by PATH (the login guard's redirect and SetupScreen's
// navigate('/race')) which strips the query BEFORE RaceScreen mounts — so the flags never reached the
// live dynamicsConfig and the owner watched plain ship. Fix: capture ?world ONCE at module load (in
// memory, no storage) while the URL still carries it, and prefer a live URL ?world if present. The
// captured value survives client-side navigation because it lives in the module's JS scope.
//
// Default (no ?world) → activeWorld() returns null → nothing injected → byte-identical shipped game.
// ============================================================

// The COMBO = the five flags screened in FAIR-ARRIVAL-COMBINE-1 / -CONFIRM-1. No coupling code.
export const WORLD_COMBO_FLAGS = Object.freeze({
  chaosSteer: true,
  chaosSteerGain: 0.06,
  bandBias: true,
  bandBiasR: 0.6,
  bandBiasGain: 0.1,
});

function readParam() {
  if (typeof window === 'undefined' || !window.location) return null;
  const w = new URLSearchParams(window.location.search).get('world');
  return w === 'combo' || w === 'ship' ? w : null;
}

// Captured ONCE at bundle load — while the initial URL still carries ?world, before any route redirect
// (login guard / navigate('/race')) drops the query. In-memory only; a full page reload re-captures.
const CAPTURED = readParam();

/**
 * The active dev viewing world: a live URL `?world` wins, else the value captured at page load, else
 * null (the shipped game). 'combo' | 'ship' | null.
 * @returns {'combo'|'ship'|null}
 */
export function activeWorld() {
  return readParam() ?? CAPTURED;
}
