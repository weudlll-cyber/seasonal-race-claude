# ENDGAME-THRESHOLD-095 — the endgame opens at 95%, and the interesting part is what it broke

**Branch `feat/endgame-threshold-095`. THE OWNER'S DECISION, 2026-08-18**: the shipped default becomes
0.95. He had been running that value himself and judged it on a production build on 2026-08-17, and
he **explicitly waived a before/after sweep** — so no ten-track measurement stands behind this number
and none is claimed here. This report is about the one number, the one thing that could surprise him,
and the four places the change fell out that a "one-line default" would not have predicted.

---

## 1. The change

One key in `client/src/modules/storage/defaults.js`: `endgameThreshold` 0.9 → 0.95. The Dev control,
its range and its 1% step are exactly as they were.

**What it moves.** That key is read in two places, and both are the run-in's: the state machine's
endgame gate (`leaderProgress > _endgameThreshold` → LEADER_ZOOM) and `_runInWindowOpen`, which is
where the finish-line bound starts composing. So the endgame declares later and the run-in's window
is **half as long** — the leader is 95% of the way to the line before the shot begins to open.

## 2. THE ONE THING THAT COULD SURPRISE HIM, confirmed rather than assumed

He has a stored `0.95` in his own browser. The store keeps only what **differs** from the defaults,
so a stored value that becomes the default is dropped. That was run against the real
`pruneStored`, not reasoned about:

```
TODAY  (default 0.9)   pruned {"endgameThreshold":0.95}   dropped []                  changed false
AFTER  (default 0.95)  pruned {}                          dropped ["endgameThreshold"] changed true
```

**His setting disappears from `localStorage` and he follows the default at the same number.** Nothing
he sees changes on the next load.

**And the useful half of that, which is worth more than the number.** A stored key **shadows the
default forever** — per key, because `saveCameraConfig` writes the whole object. While his 0.95 sat
in storage, any future change to `endgameThreshold` would have reached every user except him. Dropping
it puts him back on the default, so the next change to this key will actually reach the person who
decides it.

## 3. WHAT IT BROKE — four things, none of them the default

**(a) A guard fired, correctly.** `check-fallback-agreement` records exceptions as an exact
`(default, fallback)` PAIR, and `cameraTimingComputation.js` falls back to `0.85` for this key under a
granted "UNFIREABLE" exception written against a default of 0.9. A moved default is a different pair,
so the guard refused it. **The recorded default was updated and the fallback was left alone** — the
ship was told to change the value in `defaults.js` and nowhere else, and the exception's own reason
still holds (the director is always constructed with a loader-resolved config, so the fallback is
never reached). **It is now two ships stale** and that is stated in the exception rather than left for
the next reader to rediscover. See PROPOSALS.

**(b) Two director tests went red**, and both for the same reason: their fixtures name **x positions
chosen against a 0.9 window**. On a 4000 px straight, `racersAt(3800)` was comfortably inside the
window and is now outside it; `drive(0.83)` in RUNIN-BACK-1 started outside it entirely, so the
fixture measured a leader the run-in was not composing and read the ordinary placement 0.66 where the
mirror was asserted.

**(c) One test went GREEN for the wrong reason, which is worse.** *"the progress measure is 0 at the
threshold"* asserted `_runInProgressOf(racersAt(3600)) ≈ 0`. At 0.9 that point WAS the threshold. At
0.95 it is a whole window early — and the assertion still passes, because `_runInProgressOf` clamps at
zero. **It had stopped testing its own sentence and nothing would have said so.** This is the same
class as the report's own §"something can look like a check and be none".

**The repair is the same in all three**: the fixtures are **derived from the shipped threshold** now
rather than positioned against it —

```js
const EDGE = 4000 * DEFAULT_CAMERA_CONFIG.endgameThreshold;  // exactly at the threshold
const IN_EARLY = EDGE + (4000 - EDGE) * 0.2;                 // just inside the window
const IN_LATE  = EDGE + (4000 - EDGE) * 0.6;                 // well inside it
```

and one assertion was **added** while doing it, because deriving the edge made it expressible:
`_runInWindowOpen(racersAt(EDGE))` is `false` — at the threshold is not inside it. The `_lineCeiling`
tests in the same block deliberately keep their literals: those are about DISTANCE to the line, which
the threshold has nothing to do with.

**(d) One document stated the old number.** `docs/BACKLOG.md` carried "`endgameThreshold` in
CameraDirector.js (0.9, line 373/1060)" inside a note about a different, removed mechanism. The value
and the line numbers are both gone; it points at `defaults.js` instead, per CONFIG-TRUTH-1.
`check-config-claims` reported **0 current claims** and `check-measured-stamps` **0 stale** — neither
found this one, because it states the value away from its key in a parenthesis, which
`check-config-claims`'s own header says it does not scan. **Found by reading.**

## 4. Fingerprints — and the closure walk changed the plan

The brief expected WORLD and WORLD-OFF to be clear by closure. **They are not**, and the walk said so
before anything was measured: `defaults.js` is inside **all four** instruments' declared closures,
because every one of them builds a race from the shipped config.

| instrument | closure | `defaults.js` inside? | consequence |
| --- | ---: | :---: | --- |
| `fingerprint-default.mjs` (WORLD, WORLD-OFF) | 36 files | **YES** | must be MEASURED, not argued |
| `camera-fingerprint.mjs` | 36 files | **YES** | measured |
| `render-fingerprint.mjs` | 55 files | **YES** | measured |

`engine-reach` was deliberately not used: on a committed merge it compares the working tree and its
verdict is not evidence. All four were run.

| | before | after | |
| --- | --- | --- | --- |
| CAMERA | `6ae77f12daf23f78` | **`d9f45a4aea0e5778`** | MINTED |
| RENDER | `a870f5f9e79cb444` | **`1274c7e8444238e3`** | MINTED |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unmoved — measured |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` | unmoved — measured |

**The two world hashes being byte-identical is the substantive result of this piece**, and it is the
one the closure walk made necessary rather than optional: a camera key sits in the same file as the
race's own keys, so "it is only the camera" is a claim about the CONTENTS of the diff and not about
the file it is in. Running it is what makes it true.

## 5. Source hygiene, and what breaks if each test is deleted

Nothing was superseded by this change — no code path is retired, no key is replaced, no helper falls
out of use. The whole diff is one value, one guard exception, one document sentence and three test
fixtures.

- **`the window is the endgame threshold to the first crossing, and nothing else`** — IF DELETED:
  nothing states that the window has two ends and that a crossing closes it, so a run-in that kept
  composing after the winner is home would pass. It now also pins that the threshold is exclusive.
- **`the progress measure is 0 at the threshold, 1 at the line, and never runs backwards`** — IF
  DELETED: the measure that drives BOTH the anchor travel and the zoom loses its only statement that
  it is anchored at the window's two ends and is monotone. It has just been shown that this test can
  go quiet without going red, which is why the fixture is now derived.
- **`THE ENGAGEMENT IS A GLIDE, and only once`** — IF DELETED: nothing prevents a glide restarted
  every frame, which is a rail rather than an ease, and nothing holds the opening on its own key
  instead of borrowing the post-crossing zoom-out's.
- **`the leader starts a little BEFORE centre and ends a little AFTER it`** — IF DELETED: nothing in
  the suite states the travel the owner specified. RUNIN-AHEAD-1 removed it without a single test
  going red, which is how it reached a production build he then rejected.

## 6. Verify

`npm run verify` on the branch: **PASS 19, FAIL 0** — including `world-fingerprint`, which routed
itself in off `defaults.js` exactly as the closure walk predicted.

---

## PROPOSALS

1. **Bring the `endgameThreshold` fallback in step and delete the exception.** `cameraTimingComputation.js`
   still falls back to `0.85`, a value that has now been superseded twice, and it survives only
   because a granted exception says it is unreachable. **Unreachable is a property of today's call
   graph, not a guarantee**, and the file that carries the wrong number is the file a reader consults
   to learn the right one. The work is three lines: the fallback, the `no config` test that pins it,
   and the exception's removal. **It is deliberately not in this ship** because the ship was scoped to
   `defaults.js`, but it should not wait for a third supersession.
2. **Sweep the other fixtures that name a position a config key decides.** This change found three in
   one describe block, one of which was passing vacuously. The pattern is mechanical to look for —
   a numeric literal in a test that is only meaningful relative to a `DEFAULT_*_CONFIG` value — and
   the cost of missing one is a test that stays green while it stops testing. **A reading pass over
   the camera suite's fixtures would price it**; no guard is proposed, because the judgement of
   "meaningful relative to" is not one a script can make.
3. **Measure the window he now has, when he next wants a number.** The sweep was waived and this
   report claims nothing about the picture — but the run-in's window is now **half its former
   length**, and `runInOpenMs` (1250 ms) still paces the opening inside it. `runin-close-rate.mjs`
   answers what that did to the close on all ten tracks in one run, whenever he wants it.
