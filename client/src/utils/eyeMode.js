// ============================================================
// File:        client/src/utils/eyeMode.js
// Project:     RaceArena — EYE-SETUP-1 (dev-only BLIND A/B viewing)
//
// PURPOSE. Let the owner watch races in the real browser and judge watchability WITHOUT knowing which world
// is which. A dev-only URL switch `?eye=A` / `?eye=B` maps, once per blind session, the two letters to the
// two worlds {ship, combo} by a single random coin-flip. The mapping is stored in the browser's LOCAL STORE
// (localStorage — a page cannot write a filesystem file) and logged to the DEV CONSOLE only; it is NEVER
// rendered in the game UI, so the viewing stays blind. `?eye=reveal` prints the mapping to the console;
// `?eye=reset` clears it to start a fresh blind session.
//
// READ-ONLY toward the engine. Default (no `?eye`) → every export returns null / no-op → the game is the
// byte-identical shipped world. The COMBO is injected ONLY as config flags (the SAME flags screened in
// FAIR-ARRIVAL-COMBINE-1 / -CONFIRM-1), never new engine code.
// ============================================================

const KEY = 'ra_eye_map_v1';

// The COMBO = chaosSteer (strong chaos-phase steer) + faB60 draw-bias, exactly as screened. No coupling.
export const EYE_COMBO_FLAGS = Object.freeze({
  chaosSteer: true,
  chaosSteerGain: 0.06,
  bandBias: true,
  bandBiasR: 0.6,
  bandBiasGain: 0.1,
});

const LETTER_KEY = 'ra_eye_letter'; // sticky active letter (survives navigate('/race') dropping the query)

const hasWindow = () => typeof window !== 'undefined' && !!window.location;
const eyeParam = () =>
  hasWindow() ? new URLSearchParams(window.location.search).get('eye') : null;

// The ACTIVE blind letter. The app navigates by path (navigate('/race')), which DROPS the ?eye query, so the
// letter must be sticky: a URL ?eye=A/B wins AND is persisted to sessionStorage; when the query is absent
// (e.g. on /race after a path navigation) the last sticky letter is used. Meta params (reveal/reset) and no
// param → no active letter (unless a sticky one exists, which reveal/reset leave for the running session).
function activeLetter() {
  if (!hasWindow()) return null;
  const p = eyeParam();
  if (p === 'A' || p === 'B') {
    try {
      window.sessionStorage.setItem(LETTER_KEY, p);
    } catch {
      /* ignore */
    }
    return p;
  }
  if (p === 'reveal') return null; // reveal is a meta view; do not change the active letter
  try {
    const s = window.sessionStorage.getItem(LETTER_KEY);
    return s === 'A' || s === 'B' ? s : null;
  } catch {
    return null;
  }
}

function readMap() {
  if (!hasWindow()) return null;
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

// Establish the {A,B} -> {ship,combo} mapping ONCE per blind session (a single random coin-flip), persisted
// in the local store. Subsequent calls (and "next race" reloads) reuse it, so a session stays consistent.
function ensureMapping() {
  let m = readMap();
  if (!m) {
    const shipIsA = Math.random() < 0.5; // the ONE blind draw
    m = {
      A: shipIsA ? 'ship' : 'combo',
      B: shipIsA ? 'combo' : 'ship',
      at: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(m));
    } catch {
      /* private mode: fall through — mapping stays in-memory for this load only */
    }
    // Local store + dev console ONLY — never the game screen. Deliberately does NOT print which is which.
    // eslint-disable-next-line no-console
    console.info(
      '[eye] blind session started — mapping stored (hidden). Reveal with ?eye=reveal when done.'
    );
  }
  return m;
}

/**
 * The world for the active `?eye` letter, or null when not in a blind A/B session.
 * @returns {'ship'|'combo'|null}
 */
export function eyeActiveWorld() {
  const letter = activeLetter();
  return letter ? ensureMapping()[letter] : null;
}

/** True while a blind A/B session is active (used to force a fresh seed per race). */
export function eyeSessionActive() {
  return activeLetter() != null;
}

// Meta commands, handled once on module load (import side-effect): reveal / reset. Guarded for non-browser.
(function handleEyeMeta() {
  if (!hasWindow()) return;
  const p = eyeParam();
  if (p === 'reveal') {
    // eslint-disable-next-line no-console
    console.info(
      '[eye] mapping:',
      readMap() ?? '(none yet — start a blind session with ?eye=A or ?eye=B)'
    );
  } else if (p === 'reset') {
    try {
      window.localStorage.removeItem(KEY);
      window.sessionStorage.removeItem(LETTER_KEY);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line no-console
    console.info('[eye] mapping reset — the next ?eye=A / ?eye=B starts a fresh blind session.');
  }
})();
