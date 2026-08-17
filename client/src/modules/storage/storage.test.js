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

// ── QUIET-FAILURES-1 ─────────────────────────────────────────────────────────────────────────────
//
// WHAT BREAKS IF THIS BLOCK IS DELETED: `storageGet` goes back to being unable to tell an ABSENT
// value from an UNREADABLE one, and nothing exercises the difference. Every loader in this app
// resolves through this function, so one malformed byte in `racearena:cameraConfig` replaced the
// owner's entire camera tuning with the shipped defaults — no screen message, no console line, and
// a settings panel that looked untouched.
describe('storageGet — an unreadable value SAYS SO (QUIET-FAILURES-1)', () => {
  let warn;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('corrupt JSON falls back to the default AND names the key', () => {
    localStorage.setItem('racearena:cameraConfig', '{not json');

    expect(storageGet('racearena:cameraConfig', { fallback: true })).toEqual({ fallback: true });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"racearena:cameraConfig" could not be read')
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('is NOT in effect'));
  });

  // The de-duplicator is why this is safe to run on every render. It is module-local and about
  // logging only — it is not app state and nothing reads it.
  it('says it ONCE per key, so a blocked storage cannot flood the console', () => {
    localStorage.setItem('racearena:raceDefaults', '{{{');

    storageGet('racearena:raceDefaults', null);
    storageGet('racearena:raceDefaults', null);
    storageGet('racearena:raceDefaults', null);

    const forThisKey = warn.mock.calls.filter((c) =>
      String(c[0]).includes('racearena:raceDefaults')
    );
    expect(forThisKey).toHaveLength(1);
  });

  it('HAPPY PATH: a readable value returns unchanged and says NOTHING', () => {
    localStorage.setItem('racearena:branding', JSON.stringify([{ id: 'a' }]));

    expect(storageGet('racearena:branding', [])).toEqual([{ id: 'a' }]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('HAPPY PATH: an ABSENT key is not a failure — fallback, and still silent', () => {
    expect(storageGet('racearena:neverWritten', 'dflt')).toBe('dflt');
    expect(warn).not.toHaveBeenCalled();
  });
});

// A headless harness has no storage API at all, and that is the environment rather than a failure.
// This test exists because the first version of the warning above DID fire there — measured, once
// per fingerprint run — telling a sim that a value it never stored was "not in effect".
describe('storageGet — headless (no localStorage) is SILENT (QUIET-FAILURES-1)', () => {
  it('returns the fallback and says nothing when there is no storage API', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const real = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      expect(storageGet('racearena:anything', 'dflt')).toBe('dflt');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      globalThis.localStorage = real;
      warn.mockRestore();
    }
  });
});
