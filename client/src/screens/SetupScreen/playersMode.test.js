// ============================================================
// File:        playersMode.test.js
// Path:        client/src/screens/SetupScreen/playersMode.test.js
// Project:     RaceArena — REGISTRATION-1 (follow-up 1)
// Description: The Players tab's last chosen mode is remembered for the session, only the two real
//              modes are read back, and unavailable storage (a private window) neither throws nor
//              remembers anything.
// ============================================================

import { describe, it, expect, afterEach, vi } from 'vitest';
import { readPlayersMode, writePlayersMode } from './playersMode.js';

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('playersMode', () => {
  it('remembers the chosen mode for the session', () => {
    expect(readPlayersMode()).toBeNull();
    writePlayersMode('registration');
    expect(readPlayersMode()).toBe('registration');
    writePlayersMode('names');
    expect(readPlayersMode()).toBe('names');
  });

  it('reads back only a real mode', () => {
    window.sessionStorage.setItem('racearena:playersMode', 'something-else');
    expect(readPlayersMode()).toBeNull();
  });

  it('unavailable storage neither throws nor remembers', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writePlayersMode('registration')).not.toThrow();
    expect(readPlayersMode()).toBeNull();
  });
});
