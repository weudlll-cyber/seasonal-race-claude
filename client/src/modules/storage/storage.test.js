import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageSet, storageGet, importAllStorage, KEYS, STORAGE_CHANGE_EVENT } from './storage.js';

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

  it('dispatches STORAGE_CHANGE_EVENT with the correct key after a successful write', () => {
    const events = [];
    window.addEventListener(STORAGE_CHANGE_EVENT, (e) => events.push(e.detail));
    storageSet('racearena:test-key', 42);
    window.removeEventListener(STORAGE_CHANGE_EVENT, (e) => events.push(e.detail));
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ key: 'racearena:test-key' });
  });

  it('does NOT dispatch STORAGE_CHANGE_EVENT when the write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const events = [];
    const handler = (e) => events.push(e.detail);
    window.addEventListener(STORAGE_CHANGE_EVENT, handler);
    storageSet('racearena:test-key', 42);
    window.removeEventListener(STORAGE_CHANGE_EVENT, handler);
    expect(events).toHaveLength(0);
    spy.mockRestore();
    warnSpy.mockRestore();
  });

  afterEach(() => localStorage.removeItem('racearena:test-key'));
});

describe('importAllStorage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('passes keys through to localStorage', () => {
    importAllStorage({ [KEYS.BRANDING]: { logoUrl: 'http://example.com/logo.png' } });
    const stored = storageGet(KEYS.BRANDING);
    expect(stored).toEqual({ logoUrl: 'http://example.com/logo.png' });
  });

  it('skips keys that do not start with racearena:', () => {
    importAllStorage({ 'unrelated-key': 'should be ignored' });
    expect(storageGet('unrelated-key')).toBeNull();
  });
});
