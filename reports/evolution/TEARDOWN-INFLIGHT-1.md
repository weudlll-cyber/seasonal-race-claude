# TEARDOWN-INFLIGHT-1 — the suite can no longer die at teardown

**Branch:** `fix/teardown-inflight`, off master `cc8b6930`. **No product file changed** — four test
files and one new test-only helper. Nothing in the diff is inside any instrument's closure.

---

## THE CAUSE WAS NOT "NOISY TESTS"

The four screen tests were making **real network requests to `http://localhost:4000`**, and the
suite's own output proves it rather than suggests it:

```
[tracks] the track list could not be fetched — HTTP 401; showing 0 track(s) from the last successful load
```

**`HTTP 401` is an answer.** A live development server on the owner's machine replied to a unit
test. Nothing was stubbed; these tests were talking to whatever happened to be listening on that
port. Two consequences, and the second is the one that turned CI red:

1. **The tests were environment-dependent.** With a server up they got `HTTP 401` in milliseconds;
   with nothing listening they waited out `withTimeout`'s 3000 ms and got `timeout`. Same
   assertions, different code path, decided by what else was running on the machine. Both variants
   appear in the same night's logs.

2. **The work outlived the test.** `withTimeout` races the fetch against a `setTimeout` **it never
   clears**, so a request begun in one test resolves — and QUIET-FAILURES-1 made it LOG — after that
   test ended, sometimes after the whole file ended. Vitest forwards every worker console line to
   the main process over an RPC, and one still in flight at teardown is
   `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`.

**So the console line was the symptom; the request was the defect.** Silencing output was always
going to leave the race in place, which is exactly what the earlier spy attempt did.

---

## THE FIX — THE HOOK, NOT `fetch`

`useServerTracks` / `useServerTracksControl` run `fetchServerTracks()` in an effect. The four files
now replace that module with `src/test/mockServerTracks.js`, which keeps the hooks' shape and drops
the effect: state is seeded from `getCachedServerTracks()` exactly as the real hook seeds it, and
there is **no request, no timer and nothing in flight**.

**Faithful, not merely quiet.** On these tests the fetch never succeeded, so the cache WAS the final
value the component saw. The mock keeps the same `useState(() => getCachedServerTracks())` shape, so
a test that seeds the cache before rendering sees what it saw before and a re-render does not
re-read.

### Stubbing `fetch` was considered and REJECTED, and the reason is specific

To produce **no** warning, a `fetch` stub would have to make the loader **succeed** — answering the
list request and then one geometry request per track. But `cacheTrackGeometry` **writes every answer
into localStorage**. That would seed geometries the tests never asked for, and SetupScreen's newest
tests turn on a geometry being **absent** (QUIET-FAILURES-1's refusal). The stub would have quietly
destroyed the state under test while looking like a cleanup.

---

## HOW THE RACE IS PROVED GONE, NOT MERELY ABSENT

Four clean runs prove nothing about a race, and the brief said so. This does:

**`forbidNetwork()` replaces `fetch` with a function that RECORDS the call and throws, and asserts in
`afterAll` that nothing was recorded.** A file that completes has therefore proved, for every test in
it, that **no request was ever started**. No request means no pending promise and no uncleared
`withTimeout` timer — so there is nothing that *can* resolve, reject or log after the test that owned
it. The teardown race is not quieter; it is **unreachable**.

### The assertion is in `afterAll`, and that was found by sabotage

Throwing alone is **not enough**, and the first version of this guard proved it. Every loader wraps
its fetch in a `catch`, so the throw was swallowed and the file went green having attempted the
network — the guard's own message simply appeared inside a `[tracks]` warning:

```
[tracks] the track list could not be fetched — TEARDOWN-INFLIGHT-1: this test made a network call … ; showing 0 track(s)
 Test Files  1 passed        ← green, with the guard firing 11 times
```

Recording the attempts and asserting in `afterAll` is what makes it loud. Re-sabotaged with the
hook mock removed:

```
Error: TEARDOWN-INFLIGHT-1: 11 network call(s) from this file, which screen tests must not make:
 Test Files  1 failed (1)
```

**Both directions, on the real suite:** mock present → 11 files / 184 tests pass, zero calls; mock
removed → the file fails by name and counts them.

---

## THE THREE THINGS THE BRIEF ASKED TO BE SHOWN

| | before | after |
| --- | --- | --- |
| **the four tests emit nothing after they end** | ~48–65 lines, count varying run to run | **0** — and no request exists to produce one |
| **suite line count for these tags** | **65** on this branch's first run | **0** |
| **behaviour each test asserts** | 209 files / 4111 tests | **209 files / 4111 tests, unchanged** |

**The varying count is itself part of the finding.** QUIET-FAILURES-1's report said 48; this branch
measured **65** from the same tree on the first run. Nothing changed but timing — which is what a
race looks like when you count it twice.

Not one assertion was edited, deleted or re-blessed. The only edits to the four test files are the
`vi.mock` block, the `forbidNetwork()` call and their comments.

---

## WHAT BREAKS IF THE NEW TEST CODE IS DELETED

- **`forbidNetwork()`** — the proof goes with it. The suite would return to a state where "no
  warnings appeared" is the only evidence, which is evidence about output and not about work in
  flight. A future screen test that starts fetching would be silently environment-dependent again,
  and the teardown race would come back with nothing to name it.
- **the `vi.mock` blocks** — the four files immediately resume calling `localhost:4000`. With
  `forbidNetwork()` still in place they now FAIL rather than going quietly green, which is the point:
  the two halves are a pair, and removing either one is visible.
- **`mockServerTracks.js`** — both of the above, plus the recorded reasoning for why `fetch` was the
  wrong thing to stub. That paragraph is the one most likely to be re-discovered the hard way.

---

## VERIFICATION

**No fingerprint is owed**, and the closure walk says so rather than the file extensions:

```
fingerprint-default.mjs  closure 36 | changed files inside it: NONE
camera-fingerprint.mjs   closure 36 | changed files inside it: NONE
render-fingerprint.mjs   closure 55 | changed files inside it: NONE
```

Nothing in this branch is a product file at all. `npm run verify` result and the CI run are in the
merge commit.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `client/src/test/mockServerTracks.js` | **new**, test-only; the hooks without the network, plus `forbidNetwork()` |
| `SetupScreen.test.jsx` | +2 blocks (mock + guard) |
| `TrackEditor.trackLights.test.jsx` | +2 blocks |
| `TrackEditor.effects.test.jsx` | +2 blocks |
| `TrackEditor.shortcuts.test.jsx` | +2 blocks |

Tests added: 0 new `it()` — the guard is an `afterAll` assertion that belongs to every test in its
file, which is the honest shape for "none of these may touch the network". Tests deleted: 0. Tests
re-blessed: 0.

### Noticed but left

- **`withTimeout` never clears its timer** (`client/src/utils/withTimeout.js`). It is a product file
  and this piece does not touch the product, per the brief. It is harmless in the browser — the race
  is already settled and the stray timer does nothing — but it is the mechanism that let test work
  outlive its test, and it is on the owner's list rather than fixed here.
- **Other screen tests may make the same calls.** Only the four named files were in scope. The guard
  is one line and could be extended to any test that should not be talking to a server; doing that
  across the suite is a sweep, not this piece.
- **The suite still contains 34 other `console.warn`/`console.error` call sites** in product code
  that tests may reach. None of them showed up in the tag count, so none is currently firing from a
  test.

---

## PROPOSALS

### Proposal A — forbid the network in every screen test, not four

`forbidNetwork()` is one import and one call. The four files in this piece were the ones that
*announced* themselves, because QUIET-FAILURES-1 gave their loaders a voice; a screen test whose
loader still fails silently would look perfectly clean today. **The cheapest way to find the rest is
to add the guard to every `screens/**/*.test.jsx` and see which ones go red** — that is a
half-hour's work and it converts an unknown number of environment-dependent tests into a list.

**Why it matters beyond tidiness:** a test that reaches a real server passes or fails depending on
whether the owner happens to have his dev server running, which is the least reproducible condition
a suite can have.

### Proposal B — give `withTimeout` a `clearTimeout`, as a product change he approves

The three-line fix in `client/src/utils/withTimeout.js` — clear the timer in a `finally` — removes
the stray timer for every caller, in tests and in the browser. It is genuinely small, but it is the
product, it sits in `client/src/utils/`, and this piece was told not to touch it.

**What it would buy:** the browser currently holds a 3 s timer per loader call for no reason, and any
future test that does hit the network would stop leaving one behind. **What it risks:** nothing
observable, which is exactly why it should be measured rather than assumed — `mathUtils.js` aside,
`utils/` is inside no instrument closure, so the closure walk would answer it in seconds.
