import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTracks, getTrack, saveTrack, deleteTrack } from './trackStorage.js';

const makeTrack = (overrides = {}) => ({
  name: 'Test Track',
  backgroundImage: '/assets/tracks/backgrounds/city-circuit.png',
  closed: true,
  innerPoints: [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 150, y: 200 },
  ],
  outerPoints: [
    { x: 80, y: 80 },
    { x: 220, y: 80 },
    { x: 150, y: 230 },
  ],
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

// ── saveTrack / getTrack roundtrip ────────────────────────────────────────────

describe('saveTrack + getTrack', () => {
  it('roundtrip: saved data is retrievable via getTrack', () => {
    const saved = saveTrack(makeTrack({ name: 'My Track' }));
    const retrieved = getTrack(saved.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved.name).toBe('My Track');
    expect(retrieved.closed).toBe(true);
    expect(retrieved.innerPoints).toHaveLength(3);
    expect(retrieved.outerPoints).toHaveLength(3);
  });

  it('generates a custom-<uuid> id when no id is provided', () => {
    const saved = saveTrack(makeTrack());
    expect(saved.id).toMatch(
      /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(getTrack(saved.id)).not.toBeNull();
  });

  it('100 consecutive saves without an id all produce distinct ids', () => {
    const ids = Array.from({ length: 100 }, () => saveTrack(makeTrack()).id);
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });

  it('uses the provided id when one is given', () => {
    const saved = saveTrack(makeTrack({ id: 'custom-abc' }));
    expect(saved.id).toBe('custom-abc');
    expect(getTrack('custom-abc')).not.toBeNull();
  });

  it('insert sets createdAt and updatedAt to the same ISO timestamp', () => {
    const before = new Date().toISOString();
    const saved = saveTrack(makeTrack());
    const after = new Date().toISOString();
    expect(saved.createdAt >= before).toBe(true);
    expect(saved.createdAt <= after).toBe(true);
    expect(saved.updatedAt).toBe(saved.createdAt);
  });

  it('update preserves createdAt and refreshes updatedAt', async () => {
    const original = saveTrack(makeTrack());
    // Wait a tick so Date.now() advances at least 1 ms
    await new Promise((r) => setTimeout(r, 2));
    const updated = saveTrack({ ...original, name: 'Renamed' });
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt > original.updatedAt).toBe(true);
    expect(getTrack(original.id).name).toBe('Renamed');
  });
});

// ── listTracks ────────────────────────────────────────────────────────────────

describe('listTracks', () => {
  it('returns empty array when no tracks saved', () => {
    expect(listTracks()).toEqual([]);
  });

  it('returns metadata fields only — not full geometry', () => {
    const saved = saveTrack(makeTrack({ name: 'Metro' }));
    const list = listTracks();
    expect(list).toHaveLength(1);
    const meta = list[0];
    expect(meta.id).toBe(saved.id);
    expect(meta.name).toBe('Metro');
    expect(meta.backgroundImage).toBeDefined();
    expect(meta.createdAt).toBeDefined();
    expect(meta.updatedAt).toBeDefined();
    // Full geometry must not be present in the metadata
    expect(meta.innerPoints).toBeUndefined();
    expect(meta.outerPoints).toBeUndefined();
  });

  it('sorts by updatedAt descending (most recently updated first)', async () => {
    const a = saveTrack(makeTrack({ name: 'First' }));
    await new Promise((r) => setTimeout(r, 2));
    saveTrack(makeTrack({ name: 'Second' }));
    await new Promise((r) => setTimeout(r, 2));
    // Touch 'First' again so it has the newest updatedAt
    saveTrack({ ...getTrack(a.id), name: 'First (updated)' });

    const list = listTracks();
    expect(list[0].name).toBe('First (updated)');
    expect(list[1].name).toBe('Second');
  });

  it('reflects multiple saved tracks', () => {
    saveTrack(makeTrack({ name: 'A' }));
    saveTrack(makeTrack({ name: 'B' }));
    saveTrack(makeTrack({ name: 'C' }));
    expect(listTracks()).toHaveLength(3);
  });
});

// ── getTrack ──────────────────────────────────────────────────────────────────

describe('getTrack', () => {
  it('returns null for an unknown id', () => {
    expect(getTrack('does-not-exist')).toBeNull();
  });
});

// ── deleteTrack ───────────────────────────────────────────────────────────────

describe('deleteTrack', () => {
  it('returns true when track existed and removes it', () => {
    const saved = saveTrack(makeTrack());
    expect(deleteTrack(saved.id)).toBe(true);
    expect(getTrack(saved.id)).toBeNull();
  });

  it('returns false for a non-existent id', () => {
    expect(deleteTrack('no-such-track')).toBe(false);
  });

  it('removes the track from the listTracks index', () => {
    const a = saveTrack(makeTrack({ name: 'A' }));
    const b = saveTrack(makeTrack({ name: 'B' }));
    deleteTrack(a.id);
    const list = listTracks();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });
});

// ── validation ────────────────────────────────────────────────────────────────

describe('saveTrack validation', () => {
  it('throws on missing name', () => {
    expect(() => saveTrack(makeTrack({ name: '' }))).toThrow(/name/i);
  });

  it('throws on non-string name', () => {
    expect(() => saveTrack(makeTrack({ name: 42 }))).toThrow(/name/i);
  });

  it('throws on missing backgroundImage', () => {
    expect(() => saveTrack(makeTrack({ backgroundImage: '' }))).toThrow(/backgroundImage/i);
  });

  it('throws when closed is not a boolean', () => {
    expect(() => saveTrack(makeTrack({ closed: 'yes' }))).toThrow(/closed/i);
  });

  it('throws on empty innerPoints array', () => {
    expect(() => saveTrack(makeTrack({ innerPoints: [] }))).toThrow(/innerPoints/i);
  });

  it('throws on non-array outerPoints', () => {
    expect(() => saveTrack(makeTrack({ outerPoints: null }))).toThrow(/outerPoints/i);
  });

  it('throws when a point in innerPoints is missing y', () => {
    expect(() =>
      saveTrack(makeTrack({ innerPoints: [{ x: 10 }, { x: 20, y: 0 }, { x: 30, y: 0 }] }))
    ).toThrow(/innerPoints/i);
  });
});

// ── localStorage unavailability ───────────────────────────────────────────────

describe('localStorage unavailability', () => {
  it('throws a clear error when localStorage.getItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Blocked a frame with origin');
    });
    try {
      expect(() => listTracks()).toThrow(/localStorage is unavailable/i);
    } finally {
      spy.mockRestore();
    }
  });

  it('throws a clear error when localStorage.setItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    try {
      expect(() => saveTrack(makeTrack())).toThrow(/localStorage is unavailable/i);
    } finally {
      spy.mockRestore();
    }
  });
});
