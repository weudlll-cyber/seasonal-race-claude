import { describe, it, expect } from 'vitest';
import { validateActiveRace } from './raceSession.js';

const VALID = {
  racers: [{ name: 'Turbo' }, { name: 'Blaze' }],
  geometryId: 'preset-oval',
  worldHeight: 720,
  worldWidth: 1280,
  duration: 60,
};

describe('validateActiveRace', () => {
  it('returns the input object when valid', () => {
    const data = { ...VALID };
    expect(validateActiveRace(data)).toBe(data);
  });

  it('throws when data is null', () => {
    expect(() => validateActiveRace(null)).toThrow('expected an object');
  });

  it('throws when data is a string', () => {
    expect(() => validateActiveRace('{"racers":[]}')).toThrow('expected an object');
  });

  it('throws when racers is missing', () => {
    expect(() => validateActiveRace({ geometryId: 'x' })).toThrow('no racers');
  });

  it('throws when racers is not an array', () => {
    expect(() => validateActiveRace({ ...VALID, racers: {} })).toThrow('no racers');
  });

  it('throws when racers is an empty array', () => {
    expect(() => validateActiveRace({ ...VALID, racers: [] })).toThrow('no racers');
  });

  it('throws when geometryId is missing', () => {
    const { geometryId: _g, ...rest } = VALID;
    expect(() => validateActiveRace(rest)).toThrow('missing track geometry');
  });

  it('throws when geometryId is empty string', () => {
    expect(() => validateActiveRace({ ...VALID, geometryId: '' })).toThrow(
      'missing track geometry'
    );
  });

  it('throws when geometryId is a number', () => {
    expect(() => validateActiveRace({ ...VALID, geometryId: 42 })).toThrow(
      'missing track geometry'
    );
  });

  it('allows extra fields on the data object', () => {
    expect(() => validateActiveRace({ ...VALID, someUnknownField: true })).not.toThrow();
  });
});
