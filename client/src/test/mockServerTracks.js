// ============================================================
// File:        mockServerTracks.js
// Path:        client/src/test/mockServerTracks.js
// Project:     RaceArena — TEARDOWN-INFLIGHT-1
//
// THE SERVER-TRACKS HOOKS, WITHOUT THE NETWORK. Test-only; nothing under `src/modules` or
// `src/screens` imports it.
//
// ── THE DEFECT IT EXISTS FOR, AND IT IS NOT "NOISY TESTS" ────────────────────────────────────────
// Four screen tests mount components that call `useServerTracks` / `useServerTracksControl`. Those
// hooks run `fetchServerTracks()` in an effect, which performs a REAL `fetch` to
// `http://localhost:4000/api/tracks` — and the proof that it is real rather than merely attempted is
// the message the suite printed: **`HTTP 401`**. A live development server answered it. Nothing was
// stubbed; the tests were talking to whatever happened to be listening on that port.
//
// Two consequences, and the second is the one that turned a CI run red:
//
//   1. THE TESTS WERE ENVIRONMENT-DEPENDENT. With a server up they got 401 in milliseconds; with
//      nothing listening they waited out `withTimeout`'s 3000 ms and got `timeout`. Same assertions,
//      different path, decided by what else was running on the machine.
//
//   2. THE WORK OUTLIVED THE TEST. `withTimeout` races the fetch against a `setTimeout` it never
//      clears, so a request begun in one test resolves — and QUIET-FAILURES-1 made it LOG — long
//      after that test ended, sometimes after the whole file ended. Vitest forwards each worker
//      console line to the main process over an RPC, and one still in flight at teardown is
//      `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`. That killed the
//      CI run on `213136f0` with all 4111 tests passing.
//
// ── WHY THE HOOK AND NOT `fetch` ─────────────────────────────────────────────────────────────────
// Stubbing `fetch` was considered and rejected. To produce NO warning the stub would have to make
// the loader SUCCEED, which means answering the list request and then one geometry request per
// track — and `cacheTrackGeometry` WRITES each answer into localStorage. That would seed geometries
// the tests never asked for, and SetupScreen's newest tests turn on a geometry being ABSENT
// (QUIET-FAILURES-1's refusal). The stub would quietly destroy the state under test.
//
// Replacing the hook removes the effect entirely. What the component sees is what it saw before on
// these tests — the cache, read synchronously — with no request, no timer and nothing in flight.
//
// ── FAITHFULNESS ─────────────────────────────────────────────────────────────────────────────────
// The real hooks seed state from `getCachedServerTracks()` and update only if the fetch succeeds.
// On these tests the fetch never succeeded, so the cache WAS the final value. These keep the same
// `useState(() => getCachedServerTracks())` shape, so a test that seeds the cache before rendering
// sees exactly what it saw before, and a re-render does not re-read.
// ============================================================

import { useState, useCallback } from 'react';
import { getCachedServerTracks } from '../modules/storage/trackLoader.js';

/**
 * THE PROOF, not a precaution.
 *
 * "The warnings stopped" is evidence about output; it is not evidence that nothing is still in
 * flight. This is: it replaces `fetch` with something that THROWS, for the whole file. A test that
 * still reaches the network fails immediately and by name, and a file that completes proves — for
 * every test in it — that **no request was ever started**. No request means no pending promise and
 * no uncleared `withTimeout` timer, so there is nothing that can resolve, reject or log after the
 * test that owned it has ended. The teardown race is not quieter, it is unreachable.
 *
 * Call it at the top level of a screen test that should be talking to no server at all.
 */
export function forbidNetwork() {
  const attempted = [];
  /* eslint-disable no-undef */
  beforeAll(() => {
    vi.stubGlobal('fetch', (...args) => {
      attempted.push(String(args[0]));
      // Thrown as well as recorded: this stops the request AND the `withTimeout` timer that would
      // otherwise be created around it, which is the thing that outlives the test.
      throw new Error(`TEARDOWN-INFLIGHT-1: network call from a screen test — fetch(${args[0]})`);
    });
  });

  // THE ASSERTION IS IN `afterAll`, AND THAT IS DELIBERATE. Throwing alone is not enough to fail
  // the suite: every loader this touches wraps its fetch in a `catch`, so the throw is swallowed and
  // the test goes green having quietly attempted the network. Proved by sabotage — removing the hook
  // mock left the file PASSING with the guard's own message inside a `[tracks]` warning. Recording
  // the attempts and asserting here is what makes a regression loud.
  afterAll(() => {
    vi.unstubAllGlobals();
    if (attempted.length) {
      throw new Error(
        `TEARDOWN-INFLIGHT-1: ${attempted.length} network call(s) from this file, which screen tests must not make:\n` +
          `  ${[...new Set(attempted)].join('\n  ')}\n` +
          `Mock the loader or the hook. A live request outlives the test that starts it, and its ` +
          `console output can land after the worker has begun tearing down.`
      );
    }
  });
  /* eslint-enable no-undef */
}

/**
 * The module shape `vi.mock('.../useServerTracks.js', …)` should return.
 *
 * @returns {{useServerTracks: Function, useServerTracksControl: Function}}
 */
export function serverTracksMock() {
  return {
    useServerTracks() {
      return useState(() => getCachedServerTracks())[0];
    },
    useServerTracksControl() {
      const [tracks, setTracks] = useState(() => getCachedServerTracks());
      // `refresh` re-reads the cache instead of the server: the tests that call it change local
      // storage and expect the list to follow, which is the half that has nothing to do with HTTP.
      const refresh = useCallback(async () => setTracks(getCachedServerTracks()), []);
      return { tracks, refresh };
    },
  };
}
