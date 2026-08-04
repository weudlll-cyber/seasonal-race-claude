// ============================================================
// File:        buildInfo.test.js
// Project:     RaceArena — BUILD-TRUTH-1
//
// The badge exists because a value that nobody checks quietly stops being true — which is exactly
// what `__RA_COMMIT__` did for twenty-two hours. So these tests do two things the spec asked for:
// assert the value is PRESENT, and assert it CHANGES WITH THE BUILD. A badge nobody tests is the
// next thing that quietly stops being true.
// ============================================================

import { describe, it, expect } from 'vitest';
import { formatBuildLabel, isBuildUncertain, UNKNOWN_BUILD } from './buildInfo.js';
import RA_BUILD from 'virtual:ra-build';

describe('formatBuildLabel', () => {
  it('shows the commit and the branch', () => {
    expect(formatBuildLabel({ commit: '3b857d05', branch: 'master', dirty: false })).toBe(
      'build 3b857d05 · master'
    );
  });

  it('MARKS A DIRTY TREE — the screen is then showing something no commit describes', () => {
    expect(formatBuildLabel({ commit: 'fac83f1a', branch: 'anchor-truth', dirty: true })).toBe(
      'build fac83f1a · anchor-truth +dirty'
    );
  });

  it('CHANGES WITH THE BUILD — a different commit is a different label', () => {
    const a = formatBuildLabel({ commit: 'be649aa9', branch: 'camera-refactor', dirty: false });
    const b = formatBuildLabel({ commit: '3b857d05', branch: 'master', dirty: false });
    expect(a).not.toBe(b);
    // The exact pair from the incident: these two MUST be distinguishable on screen, because the
    // owner judged a picture twice while the badge showed the first and the code was the second.
    expect(a).toContain('be649aa9');
    expect(b).toContain('3b857d05');
  });

  it('changes when only the BRANCH differs — same commit, two branches, two labels', () => {
    expect(formatBuildLabel({ commit: 'fac83f1a', branch: 'anchor-truth' })).not.toBe(
      formatBuildLabel({ commit: 'fac83f1a', branch: 'master' })
    );
  });

  it('changes when only DIRTINESS differs', () => {
    expect(formatBuildLabel({ commit: 'fac83f1a', branch: 'x', dirty: true })).not.toBe(
      formatBuildLabel({ commit: 'fac83f1a', branch: 'x', dirty: false })
    );
  });

  it('never invents a plausible sha when it has nothing', () => {
    for (const bad of [null, undefined, {}, { commit: '' }, UNKNOWN_BUILD]) {
      expect(formatBuildLabel(bad)).toBe('build unknown');
    }
  });
});

describe('isBuildUncertain — when the badge must read as a warning', () => {
  it('a clean known build is certain', () => {
    expect(isBuildUncertain({ commit: 'abc1234', branch: 'master', dirty: false })).toBe(false);
  });

  it('a dirty tree is uncertain — the frame is not reproducible from any commit', () => {
    expect(isBuildUncertain({ commit: 'abc1234', branch: 'master', dirty: true })).toBe(true);
  });

  it('an unreadable identity is uncertain, not silently fine', () => {
    expect(isBuildUncertain(null)).toBe(true);
    expect(isBuildUncertain(UNKNOWN_BUILD)).toBe(true);
  });
});

describe('virtual:ra-build — the value is PRESENT, and it is this repository', () => {
  it('resolves and carries a real identity', () => {
    expect(RA_BUILD).toBeTruthy();
    expect(typeof RA_BUILD.commit).toBe('string');
    expect(typeof RA_BUILD.branch).toBe('string');
    expect(typeof RA_BUILD.dirty).toBe('boolean');
  });

  it('reports a real short sha, not the "unknown" fallback — this IS a git checkout', () => {
    expect(RA_BUILD.commit).toMatch(/^[0-9a-f]{7,12}$/);
  });

  it('formats to something a human can read off the HUD', () => {
    expect(formatBuildLabel(RA_BUILD)).toMatch(/^build [0-9a-f]{7,12} · .+/);
  });
});
