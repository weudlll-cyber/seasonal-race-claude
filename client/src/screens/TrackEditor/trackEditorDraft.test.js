// @vitest-environment node
// ============================================================
// File:        trackEditorDraft.test.js
// Path:        client/src/screens/TrackEditor/trackEditorDraft.test.js
// Project:     RaceArena — POLISH-2026-09-24B piece 3(a)
// Description: The crash draft: what it saves, what it refuses to save, and every way a stored
//              draft can be unusable without taking the editor down with it.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  clearLegacyDraft,
  draftPointCount,
  draftKeyFor,
  LEGACY_DRAFT_KEY,
  DRAFT_VERSION,
  DRAFT_MAX_AGE_MS,
} from './trackEditorDraft.js';

/** The key a draft lands under, so the fixtures do not retype the scheme. */
const DRAFT_KEY = draftKeyFor(null);

/** A localStorage stand-in. `fail` makes every access throw, as a private window does. */
function fakeStore(initial = {}, { fail = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => {
      if (fail) throw new Error('blocked');
      return map.has(k) ? map.get(k) : null;
    },
    setItem: (k, v) => {
      if (fail) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => {
      if (fail) throw new Error('blocked');
      map.delete(k);
    },
    _map: map,
  };
}

const geometry = {
  centerPoints: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
  innerPoints: [{ x: 0, y: 0 }],
  outerPoints: [],
  closed: true,
  centerWidth: 140,
  trackName: 'Night Loop',
};

describe('the crash draft', () => {
  it('round-trips the geometry a person drew', () => {
    const st = fakeStore();
    expect(saveDraft(geometry, st)).toBe(true);
    const d = loadDraft(st);
    expect(d.centerPoints).toEqual(geometry.centerPoints);
    expect(d.innerPoints).toEqual(geometry.innerPoints);
    expect(d.closed).toBe(true);
    expect(d.centerWidth).toBe(140);
    expect(d.trackName).toBe('Night Loop');
    expect(draftPointCount(d)).toBe(3);
  });

  it('★ writes NOTHING for an empty drawing — an empty draft would overwrite a real one', () => {
    const st = fakeStore();
    saveDraft(geometry, st);
    expect(loadDraft(st)).not.toBeNull();
    // the editor mounting, or the canvas being cleared, must not destroy the stored draft
    expect(saveDraft({ centerPoints: [], innerPoints: [], outerPoints: [] }, st)).toBe(false);
    expect(loadDraft(st)).not.toBeNull();
  });

  it('a successful save clears it', () => {
    const st = fakeStore();
    saveDraft(geometry, st);
    clearDraft(st);
    expect(loadDraft(st)).toBeNull();
  });

  it('★ a corrupt draft returns null rather than throwing', () => {
    expect(loadDraft(fakeStore({ [DRAFT_KEY]: 'not json at all' }))).toBeNull();
    expect(loadDraft(fakeStore({ [DRAFT_KEY]: '{"version":1}' }))).toBeNull();
  });

  it('★ a draft from an unknown version is ignored, not migrated', () => {
    const st = fakeStore();
    saveDraft(geometry, st);
    const stored = JSON.parse(st._map.get(DRAFT_KEY));
    stored.version = DRAFT_VERSION + 1;
    st._map.set(DRAFT_KEY, JSON.stringify(stored));
    expect(loadDraft(st)).toBeNull();
  });

  it('★ a draft whose points are not points is refused', () => {
    const st = fakeStore();
    saveDraft(geometry, st);
    const stored = JSON.parse(st._map.get(DRAFT_KEY));
    stored.centerPoints = ['nonsense', 42];
    st._map.set(DRAFT_KEY, JSON.stringify(stored));
    expect(loadDraft(st)).toBeNull();
  });

  it('a draft older than the age limit is not offered', () => {
    const st = fakeStore();
    saveDraft(geometry, st);
    const now = Date.now();
    expect(loadDraft(st, now + DRAFT_MAX_AGE_MS - 1000)).not.toBeNull();
    expect(loadDraft(st, now + DRAFT_MAX_AGE_MS + 1000)).toBeNull();
  });

  it('★★ storage that throws does not take the editor with it', () => {
    const st = fakeStore({}, { fail: true });
    // a draft that cannot be written is not a reason to break the session it protects
    expect(() => saveDraft(geometry, st)).not.toThrow();
    expect(saveDraft(geometry, st)).toBe(false);
    expect(() => loadDraft(st)).not.toThrow();
    expect(loadDraft(st)).toBeNull();
    expect(() => clearDraft(st)).not.toThrow();
    expect(clearDraft(st)).toBe(false);
  });

  it('draftPointCount survives a null draft', () => {
    expect(draftPointCount(null)).toBe(0);
  });
});

// ── ★★ Q-22b: ONE KEY PER TRACK — the half that was missing ───────────────────────────────────
describe('the per-track key (Q-22b)', () => {
  it('a new drawing and an edited track use DIFFERENT keys', () => {
    expect(draftKeyFor(null)).toBe('racearena:trackEditor:draft:new');
    expect(draftKeyFor('abc123')).toBe('racearena:trackEditor:draft:abc123');
    expect(draftKeyFor('')).toBe('racearena:trackEditor:draft:new');
    expect(draftKeyFor('  ')).toBe('racearena:trackEditor:draft:new');
  });

  it('★★ TWO TRACKS CANNOT OVERWRITE EACH OTHER’S DRAFT — the reason this half exists', () => {
    const st = fakeStore();
    const a = { ...geometry, trackName: 'Track A' };
    const b = { ...geometry, trackName: 'Track B', innerPoints: [{ x: 9, y: 9 }] };

    saveDraft(a, st, 'track-a');
    saveDraft(b, st, 'track-b');

    expect(loadDraft(st, Date.now(), 'track-a').trackName).toBe('Track A');
    expect(loadDraft(st, Date.now(), 'track-b').trackName).toBe('Track B');
    // ...and neither is the `new` slot
    expect(loadDraft(st, Date.now(), null)).toBeNull();
  });

  it('clearing one track’s draft leaves the others alone', () => {
    const st = fakeStore();
    saveDraft(geometry, st, 'track-a');
    saveDraft(geometry, st, 'track-b');
    clearDraft(st, 'track-a');
    expect(loadDraft(st, Date.now(), 'track-a')).toBeNull();
    expect(loadDraft(st, Date.now(), 'track-b')).not.toBeNull();
  });

  it('★ a draft from a pre-Q-22b build is CLEARED rather than left to rot', () => {
    const st = fakeStore({ [LEGACY_DRAFT_KEY]: JSON.stringify({ version: DRAFT_VERSION }) });
    expect(st._map.has(LEGACY_DRAFT_KEY)).toBe(true);
    clearLegacyDraft(st);
    expect(st._map.has(LEGACY_DRAFT_KEY)).toBe(false);
  });

  it('clearLegacyDraft does not throw on blocked storage', () => {
    expect(() => clearLegacyDraft(fakeStore({}, { fail: true }))).not.toThrow();
  });
});
