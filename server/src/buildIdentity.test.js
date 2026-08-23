// ============================================================================================
// buildIdentity.test.js — the server can say which build is live, and never guesses (BUILD-FROM-OUTSIDE-1)
//
// THE RULE UNDER TEST is the one the client's Vite plugin was CORRECTED into having: an instrument
// that cannot determine something must say so, with a reason — never report a plausible-looking
// value it did not establish. That plugin's first version treated an unreadable `git status` as
// `dirty: false`, i.e. it reported a clean tree it had not been able to look at.
// ============================================================================================
import { describe, it, expect } from 'vitest';
import { buildIdentity, UNKNOWN_BUILD } from './buildIdentity.js';

describe('buildIdentity', () => {
  // IF DELETED: the endpoint could start inventing a sha. WHAT WOULD GO UNNOTICED: the single worst
  // outcome for this feature — an operator reading a confident, wrong build identity off a live
  // server and drawing conclusions from it. An honest 'unknown' is strictly better than a guess.
  it('reports unknown AND a reason when nothing supplied an identity', () => {
    const b = buildIdentity({});
    expect(b.commit).toBe(UNKNOWN_BUILD.commit);
    expect(b.branch).toBe(UNKNOWN_BUILD.branch);
    expect(b.reason, 'an unknown identity with no reason is the amber badge again').toBeTruthy();
    expect(b.reason).toMatch(/RA_BUILD_COMMIT/);
  });

  it('reports what the environment supplied', () => {
    const b = buildIdentity({ RA_BUILD_COMMIT: 'abc1234', RA_BUILD_BRANCH: 'master' });
    expect(b).toEqual({ commit: 'abc1234', branch: 'master' });
    expect(b.reason, 'a complete identity needs no reason').toBeUndefined();
  });

  // IF DELETED: a half-identity reads as though the missing half were unknowABLE rather than merely
  // unset. WHAT WOULD GO UNNOTICED: the deploy that sets one variable and forgets the other.
  it('a PARTIAL identity says which half is missing', () => {
    const noBranch = buildIdentity({ RA_BUILD_COMMIT: 'abc1234' });
    expect(noBranch.commit).toBe('abc1234');
    expect(noBranch.branch).toBe('unknown');
    expect(noBranch.reason).toMatch(/RA_BUILD_BRANCH/);

    const noCommit = buildIdentity({ RA_BUILD_BRANCH: 'master' });
    expect(noCommit.commit).toBe('unknown');
    expect(noCommit.reason).toMatch(/RA_BUILD_COMMIT/);
  });

  // THE CORRECTION THE CLIENT PLUGIN PAID FOR, guarded here so it is not repeated.
  // IF DELETED: `dirty` could default to false. WHAT WOULD GO UNNOTICED: a server reporting a clean
  // tree it never examined — "not established" and "clean" are different statements.
  it('omits `dirty` entirely when it was not determined — it never defaults to false', () => {
    const b = buildIdentity({ RA_BUILD_COMMIT: 'abc1234', RA_BUILD_BRANCH: 'master' });
    expect('dirty' in b, '`dirty` absent means NOT ESTABLISHED, which is not `false`').toBe(false);
  });

  it('reports `dirty` in both directions when it WAS determined', () => {
    const base = { RA_BUILD_COMMIT: 'abc1234', RA_BUILD_BRANCH: 'master' };
    expect(buildIdentity({ ...base, RA_BUILD_DIRTY: 'true' }).dirty).toBe(true);
    expect(buildIdentity({ ...base, RA_BUILD_DIRTY: 'false' }).dirty).toBe(false);
    // anything else is not a determination
    expect('dirty' in buildIdentity({ ...base, RA_BUILD_DIRTY: 'maybe' })).toBe(false);
  });

  it('trims, so a trailing newline from a shell does not become part of the sha', () => {
    const b = buildIdentity({ RA_BUILD_COMMIT: 'abc1234\n', RA_BUILD_BRANCH: ' master ' });
    expect(b.commit).toBe('abc1234');
    expect(b.branch).toBe('master');
  });

  it('treats a blank variable as unset rather than as an empty identity', () => {
    const b = buildIdentity({ RA_BUILD_COMMIT: '   ', RA_BUILD_BRANCH: '' });
    expect(b.commit).toBe('unknown');
    expect(b.reason).toBeTruthy();
  });
});
