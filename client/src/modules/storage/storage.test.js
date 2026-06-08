import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageSet, storageGet, importAllStorage, KEYS } from './storage.js';

describe('storageSet', () => {
  beforeEach(() => localStorage.clear());

  it('returns true when the write succeeds', () => {
    expect(storageSet('racearena:test-key', { x: 1 })).toBe(true);
  });

  it('persists the value so storageGet can read it back', () => {
    storageSet('racearena:test-key', { val: 42 });
    expect(storageGet('racearena:test-key')).toEqual({ val: 42 });
  });

  it('returns false when localStorage throws (quota exceeded)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('QuotaExceededError');
      Object.defineProperty(err, 'name', { value: 'QuotaExceededError' });
      throw err;
    });
    expect(storageSet('racearena:any', 'value')).toBe(false);
    spy.mockRestore();
  });

  it('logs a console.warn when write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storageSet('racearena:any', 'value');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[RaceArena]'), expect.any(Error));
    spy.mockRestore();
    warnSpy.mockRestore();
  });

  afterEach(() => localStorage.removeItem('racearena:test-key'));
});

// ── Security: H1 — importAllStorage validates track entries ──────────────────

describe('importAllStorage — H1: crafted backup validation', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('rejects a track with effect count: 1e12 (the audit exploit payload)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const craftedTrack = {
      id: 'bad-track',
      name: 'Malicious Track',
      effects: [{ id: 'dust', config: { count: 1e12 } }],
    };
    importAllStorage({ [KEYS.TRACKS]: [craftedTrack] });
    const stored = storageGet(KEYS.TRACKS);
    expect(Array.isArray(stored)).toBe(true);
    expect(stored).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[RaceArena]'), expect.anything());
    warnSpy.mockRestore();
  });

  it('rejects a track with an over-length name (H4)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const craftedTrack = { id: 'long-name', name: 'A'.repeat(101), effects: [] };
    importAllStorage({ [KEYS.TRACKS]: [craftedTrack] });
    const stored = storageGet(KEYS.TRACKS);
    expect(stored).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('imports a valid track entry normally', () => {
    const validTrack = { id: 'good-track', name: 'Good Track', effects: [] };
    importAllStorage({ [KEYS.TRACKS]: [validTrack] });
    const stored = storageGet(KEYS.TRACKS);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('good-track');
  });

  it('filters invalid tracks while keeping valid ones in the same import', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bad = { id: 'bad', name: 'Bad', effects: [{ id: 'dust', config: { count: 1e12 } }] };
    const good = { id: 'good', name: 'Good', effects: [{ id: 'rain', config: { count: 200 } }] };
    importAllStorage({ [KEYS.TRACKS]: [bad, good] });
    const stored = storageGet(KEYS.TRACKS);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('good');
    warnSpy.mockRestore();
  });

  it('accepts a track with valid effect count: 1000 (boundary)', () => {
    const validTrack = {
      id: 'boundary-track',
      name: 'Boundary Track',
      effects: [{ id: 'dust', config: { count: 1000 } }],
    };
    importAllStorage({ [KEYS.TRACKS]: [validTrack] });
    const stored = storageGet(KEYS.TRACKS);
    expect(stored).toHaveLength(1);
  });

  it('rejects racearena:tracks that is not an array', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    importAllStorage({ [KEYS.TRACKS]: { not: 'an array' } });
    const stored = storageGet(KEYS.TRACKS);
    expect(stored).toBeNull();
    warnSpy.mockRestore();
  });

  it('passes non-tracks keys through without modification', () => {
    importAllStorage({ [KEYS.BRANDING]: { logoUrl: 'http://example.com/logo.png' } });
    const stored = storageGet(KEYS.BRANDING);
    expect(stored).toEqual({ logoUrl: 'http://example.com/logo.png' });
  });
});
