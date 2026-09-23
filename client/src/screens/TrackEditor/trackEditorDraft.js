// ============================================================
// File:        trackEditorDraft.js
// Path:        client/src/screens/TrackEditor/trackEditorDraft.js
// Project:     RaceArena — POLISH-2026-09-24B piece 3(a)
// Description: Keep a draft of the geometry being drawn, so a browser crash, a closed tab or a
//              stray navigation does not lose the work.
//
// ── ★ WHY THIS ONE IS FIRST ────────────────────────────────────────────────────────────────────
// It is the only item on the polish list where a USER LOSES WORK. Drawing a track is minutes of
// mouse work with no intermediate save: until the moment Save succeeds, every point lives in React
// state and nowhere else. A refresh loses all of it.
//
// ── WHAT IS SAVED, AND WHAT DELIBERATELY IS NOT ────────────────────────────────────────────────
// ONLY the geometry a person drew by hand and the two scalars that shape it: the three point
// arrays, the closed flag, the centre width, and the name they typed. Effects, track lights and
// the background are NOT drafted — they are picked from lists and re-picked in seconds, and every
// one of them widens what a restore could get wrong.
//
// ★ A DRAFT IS NOT A SAVE, AND THE DISTINCTION IS LOAD-BEARING. This writes to `localStorage`, which
// is per-browser and per-machine. It protects against a crash on THIS machine; it is not a backup,
// it does not reach the server, and it is cleared the moment a real save succeeds.
//
// ── WHY IT DOES NOT RESTORE BY ITSELF ──────────────────────────────────────────────────────────
// Silently replacing what someone is looking at with something from a previous session is its own
// way to lose work — if they started something new, the draft would overwrite it. The editor ASKS.
// This module only stores, reads and clears; the decision belongs to the screen.
//
// ── STORAGE FAILS, AND THAT MUST NOT TAKE THE EDITOR WITH IT ───────────────────────────────────
// `localStorage` throws on a private window, a blocked origin and a full quota, and the quota is
// reachable here: a long hand-drawn track is a few thousand points. Every access is wrapped, and a
// failure to save a DRAFT must never break the editor the draft exists to protect — so it returns
// false and says nothing to the user.
// ============================================================

export const DRAFT_KEY = 'racearena:trackEditorDraft';

/** Bump only if the stored shape changes incompatibly; an unknown version is ignored, not migrated. */
export const DRAFT_VERSION = 1;

/**
 * How stale a draft may be before it is not offered. A draft from three weeks ago is far more
 * likely to be forgotten scratch than interrupted work, and offering it is noise.
 */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isPointArray = (v) =>
  Array.isArray(v) && v.every((p) => p && typeof p.x === 'number' && typeof p.y === 'number');

/**
 * Write a draft. Returns true when it was stored.
 * ★ Nothing is written for an EMPTY drawing — a draft of nothing would offer to restore nothing,
 * and it would overwrite a real draft the moment the editor mounted.
 */
export function saveDraft(state, storage = globalThis.localStorage) {
  if (!state) return false;
  const { centerPoints, innerPoints, outerPoints } = state;
  const total =
    (centerPoints?.length ?? 0) + (innerPoints?.length ?? 0) + (outerPoints?.length ?? 0);
  if (total === 0) return false;
  try {
    storage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: Date.now(),
        trackName: typeof state.trackName === 'string' ? state.trackName : '',
        centerWidth: typeof state.centerWidth === 'number' ? state.centerWidth : null,
        closed: !!state.closed,
        centerPoints: centerPoints ?? [],
        innerPoints: innerPoints ?? [],
        outerPoints: outerPoints ?? [],
      })
    );
    return true;
  } catch {
    // Quota, a private window, a blocked origin. A draft that cannot be written is not a reason to
    // break the editing session it exists to protect.
    return false;
  }
}

/**
 * Read a usable draft, or null. ★ Anything unparseable, of the wrong version, too old, or not
 * shaped like geometry returns null rather than throwing — a corrupt draft must not be able to
 * stop the editor from opening.
 */
export function loadDraft(storage = globalThis.localStorage, now = Date.now()) {
  let raw = null;
  try {
    raw = storage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let d = null;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!d || d.version !== DRAFT_VERSION) return null;
  if (typeof d.savedAt !== 'number' || now - d.savedAt > DRAFT_MAX_AGE_MS) return null;
  if (!isPointArray(d.centerPoints) || !isPointArray(d.innerPoints) || !isPointArray(d.outerPoints))
    return null;
  const total = d.centerPoints.length + d.innerPoints.length + d.outerPoints.length;
  if (total === 0) return null;
  return d;
}

/** Clear the draft. Called when a save succeeds, and when the person declines a restore. */
export function clearDraft(storage = globalThis.localStorage) {
  try {
    storage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

/** How many points a draft holds — for the prompt, so the person can tell which work it is. */
export function draftPointCount(d) {
  if (!d) return 0;
  return (
    (d.centerPoints?.length ?? 0) + (d.innerPoints?.length ?? 0) + (d.outerPoints?.length ?? 0)
  );
}
