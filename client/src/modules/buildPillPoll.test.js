// ============================================================
// File:        buildPillPoll.test.js
// Project:     RaceArena — BUILD-PILL-TRUTH
//
// WHAT IS TESTABLE HERE, AND WHAT IS NOT — stated rather than papered over.
//
// TESTABLE: `makeMtimePoll`, which is why the fix was written as a pure function of an injected
// `stat` rather than inline in `configureServer`. Everything that decides WHETHER a branch switch is
// noticed lives in it.
//
// NOT TESTABLE HERE: that Vite's watcher ignores `.git`, and that a full-reload therefore reaches
// the browser. That needs a running dev server, a real checkout and an HMR socket — it was proved
// that way (see reports/night/BUILD-PILL-TRUTH.md, the before/after transcripts) and there is no
// honest unit test for it. Inventing one that mocks the watcher would only assert that my mock
// behaves like my belief about chokidar, which is the belief that was wrong in the first place.
// ============================================================

import { describe, it, expect } from 'vitest';
import { makeMtimePoll } from '../../vite-plugin-ra-build.js';

const poller = (initial) => {
  const state = { ...initial };
  const stat = (p) => (p in state ? state[p] : null);
  return { tick: makeMtimePoll(Object.keys(initial), stat), state };
};

describe('makeMtimePoll — the signal that a branch switch actually produces', () => {
  it('reports no change while nothing moves', () => {
    const { tick } = poller({ HEAD: 100, index: 200 });
    expect(tick()).toBe(false);
    expect(tick()).toBe(false);
  });

  it('reports a change when HEAD moves — the branch switch', () => {
    const { tick, state } = poller({ HEAD: 100, index: 200 });
    tick();
    state.HEAD = 101;
    expect(tick()).toBe(true);
  });

  it('reports a change when index moves — the commit', () => {
    const { tick, state } = poller({ HEAD: 100, index: 200 });
    tick();
    state.index = 201;
    expect(tick()).toBe(true);
  });

  it('reports the change ONCE, not on every tick after it', () => {
    // The whole point: a mtime changes once, so if the consumer drops that one call nothing calls
    // again. This is why the poll bypasses recheck()'s leading-edge throttle.
    const { tick, state } = poller({ HEAD: 100, index: 200 });
    tick();
    state.HEAD = 101;
    expect(tick()).toBe(true);
    expect(tick()).toBe(false);
    expect(tick()).toBe(false);
  });

  it('treats a missing file as a reading, and its appearance as a change', () => {
    // `.git/index` does not exist in a fresh clone until something is staged. A poll that threw, or
    // that treated missing as unchanged forever, would go blind on exactly that repo.
    const state = { HEAD: 100 };
    const tick = makeMtimePoll(['HEAD', 'index'], (p) => (p in state ? state[p] : null));
    expect(tick()).toBe(false);
    state.index = 5;
    expect(tick()).toBe(true);
    delete state.index;
    expect(tick()).toBe(true); // and its disappearance is a change too
  });

  it('does not fire on construction — the first tick compares against the real initial state', () => {
    // Seeding inside the factory matters: a poll seeded with nulls would report a change on its very
    // first tick and force a pointless reload every time the dev server starts.
    const { tick } = poller({ HEAD: 100, index: 200 });
    expect(tick()).toBe(false);
  });

  it('notices a change in either file when both are polled', () => {
    const { tick, state } = poller({ HEAD: 100, index: 200 });
    tick();
    state.HEAD = 101;
    state.index = 201;
    expect(tick()).toBe(true);
    expect(tick()).toBe(false);
  });
});
