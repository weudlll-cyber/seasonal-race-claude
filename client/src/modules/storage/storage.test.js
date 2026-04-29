import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageSet, storageGet } from './storage.js';

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
