import { describe, it, expect } from 'vitest';
import { resolveActiveBrandProfile } from './useActiveBrandProfile.js';

const PROFILE_A = { id: 'bp_a', name: 'Brand A', primaryColor: '#ff0000' };
const PROFILE_B = { id: 'bp_b', name: 'Brand B', primaryColor: '#0000ff' };
const PROFILES = [PROFILE_A, PROFILE_B];

describe('resolveActiveBrandProfile', () => {
  it('returns null when activeSession is null', () => {
    expect(resolveActiveBrandProfile(PROFILES, null)).toBeNull();
  });

  it('returns null when activeSession has no activeBrandingProfileId', () => {
    expect(resolveActiveBrandProfile(PROFILES, {})).toBeNull();
  });

  it('returns the matching profile when id exists', () => {
    const session = { activeBrandingProfileId: 'bp_a' };
    expect(resolveActiveBrandProfile(PROFILES, session)).toBe(PROFILE_A);
  });

  it('returns null when the id has no matching profile', () => {
    const session = { activeBrandingProfileId: 'bp_unknown' };
    expect(resolveActiveBrandProfile(PROFILES, session)).toBeNull();
  });

  it('returns null when profiles array is empty', () => {
    const session = { activeBrandingProfileId: 'bp_a' };
    expect(resolveActiveBrandProfile([], session)).toBeNull();
  });
});
