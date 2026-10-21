// ============================================================
// File:        playersMode.js
// Path:        client/src/screens/SetupScreen/playersMode.js
// Project:     RaceArena — REGISTRATION-1 (follow-up 1, the owner's request of 2026-10-21)
// Description: The Players tab's last chosen way to fill the race — 'names' or 'registration' —
//              remembered for this browser tab's session, so a reload comes back to it. In
//              sessionStorage, every access wrapped: a private window or blocked storage throws, and
//              then the choice is simply not remembered (the tab falls back to its default rule in
//              SetupScreen.jsx).
// ============================================================

const KEY = 'racearena:playersMode';
const MODES = ['names', 'registration'];

/** The remembered mode, or null when none was chosen in this session (or storage is unavailable). */
export function readPlayersMode() {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return MODES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/** Remember `mode` for this session; silently does nothing when storage is unavailable. */
export function writePlayersMode(mode) {
  try {
    window.sessionStorage.setItem(KEY, mode);
  } catch {
    /* not remembered — the default rule applies after a reload */
  }
}
