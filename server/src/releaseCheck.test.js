// ============================================================
// File:        releaseCheck.test.js
// Path:        server/src/releaseCheck.test.js
// Project:     RaceArena — AUDIT-1 D2 (the admin status box)
// Description: The release check: only `vX.Y[.Z]` tags are releases, the newest wins by version
//              order, GitHub is asked at most once a day (a failure is kept for the day too), and
//              every failure is `unknown`. `fetch` and the clock are injected — no network here.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import {
  createReleaseChecker,
  newestRelease,
  parseRelease,
  buildVersion,
  RELEASE_CHECK_TTL_MS,
} from './releaseCheck.js';

const refs = (...names) => names.map((n) => ({ ref: `refs/tags/${n}` }));
const answer = (status, body) => async () => ({ status, json: async () => body });
const quiet = () => {};

describe('what a release is', () => {
  it('only v<major>.<minor>[.<patch>]; the v-… ship markers and v1-… notes are not', () => {
    expect(parseRelease('v1.2')).toEqual([1, 2, 0]);
    expect(parseRelease('v1.2.3')).toEqual([1, 2, 3]);
    for (const t of [
      'v-ship-the-night',
      'v1-race-action-merged',
      'v1',
      '1.2.3',
      'v1.2.3.4',
      'v1.2-rc1',
    ])
      expect(parseRelease(t), t).toBeNull();
  });

  it('the newest by VERSION order, not by text order, and markers are ignored', () => {
    expect(newestRelease(['v1.9', 'v-ship-zzz', 'v1.10', 'v1.2.7'])).toBe('v1.10');
    expect(newestRelease(['v2.0.1', 'v2.0'])).toBe('v2.0.1');
    expect(newestRelease(['v-perf-complete', 'v1-race-action-merged'])).toBeNull();
  });

  it('this build has a version only when it identified itself by a release tag', () => {
    expect(buildVersion({ commit: 'abc', branch: 'v1.4.0' })).toBe('v1.4.0');
    expect(buildVersion({ commit: 'abc', branch: 'master' })).toBeNull();
    expect(buildVersion({ commit: 'unknown', branch: 'unknown' })).toBeNull();
  });
});

describe('asking GitHub', () => {
  it('picks the newest release from the answer and ignores the v-… markers', async () => {
    const fetchImpl = vi.fn(
      answer(200, refs('v-ship-the-night', 'v0.9.2', 'v1.0', 'v-perf-complete'))
    );
    const check = createReleaseChecker({ fetchImpl, now: () => 0, log: quiet });
    const r = await check();
    expect(r).toEqual({ newest: 'v1.0', checkedAt: new Date(0).toISOString(), state: 'ok' });
    // no credentials: the repository is public, and nothing secret may reach the request
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/repos/weudlll-cyber/seasonal-race-claude/git/matching-refs/tags/v'
    );
    expect(Object.keys(opts.headers).map((h) => h.toLowerCase())).not.toContain('authorization');
    expect(opts.signal).toBeDefined();
  });

  it('is asked AT MOST ONCE A DAY — the clock decides, and a day later it asks again', async () => {
    let t = 1_000_000;
    const fetchImpl = vi.fn(answer(200, refs('v1.0')));
    const check = createReleaseChecker({ fetchImpl, now: () => t, log: quiet });
    await check();
    t += RELEASE_CHECK_TTL_MS - 1;
    await check();
    await check();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t += 1;
    await check();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('two callers at once share one request', async () => {
    const fetchImpl = vi.fn(answer(200, refs('v1.0')));
    const check = createReleaseChecker({ fetchImpl, now: () => 0, log: quiet });
    await Promise.all([check(), check(), check()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('a REJECTED fetch is unknown, and the failure is kept for the day too', async () => {
    let t = 0;
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const log = vi.fn();
    const check = createReleaseChecker({ fetchImpl, now: () => t, log });
    expect(await check()).toEqual({
      newest: null,
      checkedAt: new Date(0).toISOString(),
      state: 'unknown',
    });
    t += 60_000;
    expect((await check()).state).toBe('unknown');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('a non-200 (the anonymous rate limit answers 403) is unknown, whatever its body holds', async () => {
    // The body is a perfectly good tag list on purpose: only the status may decide this.
    for (const status of [403, 404, 500, 304]) {
      const check = createReleaseChecker({
        fetchImpl: answer(status, refs('v9.9')),
        now: () => 0,
        log: quiet,
      });
      expect(await check(), `HTTP ${status}`).toMatchObject({ newest: null, state: 'unknown' });
    }
  });

  it('a 200 that is not a tag list is unknown', async () => {
    const check = createReleaseChecker({
      fetchImpl: answer(200, { message: 'odd' }),
      now: () => 0,
      log: quiet,
    });
    expect(await check()).toMatchObject({ newest: null, state: 'unknown' });
  });
});
