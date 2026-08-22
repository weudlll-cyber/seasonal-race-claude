# RETIRE-RUNIN-LEGACY-1 — the ceiling-and-hold run-in is retired, completely

**2026-08-22 · branch `exp/retire-runin-legacy` off master `bb1e74df` · A REMOVAL WITH NO BEHAVIOUR
CHANGE. All four fingerprints byte-identical, which is the proof that the removed arm was genuinely
unreachable rather than merely believed to be.**

> **The owner's decision, 2026-08-25.** `runInSchedule` switched between the schedule-driven endgame
> he accepted and the old ceiling-and-hold path. The old arm has no Dev Screen control, so it is
> unreachable in the shipped product, and it is measured worse on every figure in its own
> justification table. **Retire it — fully, not deprecated, not hidden behind a comment.** The old arm
> stays findable in the history and in the archive tag; that is its home now.

---

## 0 · THE IDENTITY PROOF

| Role | Required | Measured on the merge commit |
| --- | --- | --- |
| CAMERA | `0434cd0385eacc7b` | `0434cd0385eacc7b` |
| RENDER | `57b2eb101d806b22` | `57b2eb101d806b22` |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` |

**That table is the whole argument.** A removal is a claim that nothing reached the removed code; four
byte-identical fingerprints over ten tracks are the measurement that settles it. They were re-measured
after every step of the chain below, not once at the end.

**THE 80-RACE SHEET WAS DELIBERATELY NOT RUN, and this is the block where that became a rule.**
The owner's instruction, 2026-08-25: the sheet runs only when a fingerprint MOVES, or before a build
he is going to judge; otherwise the one-race browser gate is the check.

The reasoning is the identity argument itself. **Four byte-identical fingerprints say the delivered
picture is the same to the byte — and the twelve requirements are properties OF that picture, so they
cannot have changed while it did not.** A sheet run here could only confirm what the fingerprints had
already proved, at forty-five minutes to an hour and a half.

It is also the honest reading of what happened twice in two blocks: I started the sheet alongside
other work and destroyed the run both times — once with `npm run verify` (Chromium killed mid-run,
ten races lost, and vitest's workers timed out under the same saturation, which then read as a test
failure) and once with two measurement scripts (64 of 80 races failed). The rule is now written into
[SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md) step 0a: **when the sheet runs, it runs ALONE and
LAST.**

---

---

## 1 · THE SIZE — he asked for it

| | before | after | delta |
| --- | --- | --- | --- |
| `CameraDirector.js` | 5009 | **4831** | −178 |
| `CameraDirector.test.js` | 8398 | **8176** | −222 |
| `defaults.js` | 1342 | **1316** | −26 |
| `cameraTimingComputation.js` | 480 | **478** | −2 |
| **the camera module as a whole** (`client/src/modules/camera/`, all `.js`) | 23904 | **23502** | **−402** |
| the endgame path inside `CameraDirector.js` | 496 | **414** | −82 |

Two files left the tree entirely: `scripts/diag/runin-close-rate.mjs` and
`scripts/diag/runin-pace-table.mjs`.

**How much of this was there only to keep the second arm alive?** Nearly all of it, and the honest
accounting is worth making because "−402 lines" is not the same claim as "−402 lines of complexity".

- **The mechanism itself** — the legacy body, `_runInShouldRelease`, `_runInWindowOpen`, the five
  latch fields and the second branch of `_runInSweepU`: about **140 lines** of `CameraDirector.js`,
  all of it a complete second answer to "how wide is the endgame shot?".
- **The justification block** in `defaults.js`, 26 lines, which existed to explain a CHOICE between
  two designs. With one design there is no choice to explain — but the measurements in it are the
  record of why the endgame is as it is, so they are preserved rather than deleted (§4).
- **The conditional structure the two arms forced on everything else**: a dispatcher, a key threaded
  through the timing whitelist, a `line` ceiling entry that had to stay finite for one arm, and its
  re-clamp. This is the part that does not show up as a line count but is what the owner is actually
  objecting to: **every later repair to the endgame had to be checked against an implementation
  nobody could run.**
- **The tests**: 222 lines, ten tests, each pinned to the retired mechanism.

---

## 2 · WHAT WAS REMOVED, AND THE CHAIN IT PULLED

**The named removals**, all of which the brief listed: the key in `defaults.js`; its read and return
in `cameraTimingComputation.js`, so it can no longer reach the director at all; the dispatcher in
`CameraDirector.js`; and the `--no-schedule` CONTROL arm of `check-runin-frame.mjs`.

**The dispatcher did not become a call — it disappeared.** `_updateRunIn` was a two-line switch with
the old arm inlined beneath it. With one arm the scheduled implementation simply IS `_updateRunIn`.
One name, one path, no indirection introduced by the removal.

**`check-runin-frame` keeps both SABOTAGE arms**, which matters: the control arm proved the guard
could fail by running it against a different implementation, and the sabotage arms prove the same
thing without needing a second implementation to exist. The guard is no weaker for the loss.

### The chain, followed until nothing further fell

Each was verified to have no surviving reader, cut, and then the fingerprints re-measured.

| Removed | Why it was dead |
| --- | --- |
| `_runInHoldCeiling` | written and read only by the old arm |
| `_runInReleaseProgress` | the release latch; the schedule has no release |
| `_runInShouldRelease` | called only by the old arm (55 lines with its doc) |
| `_runInStartProgress` | read only by `_runInShouldRelease` |
| `_runInStartTs` | read only by `_runInShouldRelease` — the schedule still WROTE it, so it became write-only, which is dead in the way that is hardest to see |
| `_runInWindowOpen` | the old arm's gate; the schedule has its own two-condition latch (24 lines with its doc) |
| the `line` re-clamp in `_setTargets` | **provably unreachable**: `ceilings.line` is `_scheduled ? Infinity : _runInCeiling`, and with one arm both branches are Infinity — when the schedule composes, the line's demand lives inside it; when it does not, `_updateRunIn` returns Infinity. 29 lines |
| `runin-close-rate.mjs`, `runin-pace-table.mjs` | both take their phase boundary from the release latch, which is now null forever, so both would report a phase that never begins |

**`line-ceiling-terms.mjs` SURVIVES**, minus ten lines that printed the held width. Its subject is
`_lineCeiling`, which is very much alive.

### Where the chain was stopped deliberately, and why

**The `line` KEY stays in the probe.** It is now always Infinity, so by the same argument it is a dead
lever — but four diagnostics and several tests read `ceilings.line`, and the probe's shape is a
contract this block's identity proof cannot cover: removing a key that is always Infinity is a no-op
in a `Math.min`, so **no fingerprint could tell a correct removal from a broken one.** That is the
same reasoning that kept the old arm alive too long, so it is written down rather than acted on
quietly: it is the next removal, and it needs a different instrument than this one.

---

## 3 · THE TESTS — ten deleted, and which case each was

The brief is right that a deleted test is coverage lost unless it covered something that no longer
exists. Each is named with its case.

**DELETED — covered a mechanism that no longer exists (10 tests):**

| block | tests | what it covered |
| --- | --- | --- |
| `RUNIN-HOLD-1 — hold, then one sweep` | 5 | HOLDS, SWEEPS ONCE, SHORT WINDOW, the crossing landing exactly, a centred state not moving — every one about the hold and its release |
| `the window is the endgame threshold to the first crossing` | 1 | drives `_runInWindowOpen`, the old arm's gate |
| `RUNIN-LINE-1 — and it never cuts the finish line either` | 4 | the `line` ceiling's re-clamp after the corridor cap, which can no longer fire |

**No requirement lost its last guard.** "A centred state does not travel" is still asserted twice, in
RUNIN-GLIDE-1 and RUNIN-BACK-1. The endgame's engagement conditions are covered by
ENDGAME-SCHEDULE-1's "it does not engage before one close-span ahead of the threshold". The finish
line's visibility — what RUNIN-LINE-1 protected — is now guarded where it actually lives: inside the
schedule, by `check-runin-frame` grading his own sentence in the browser, by the acceptance sheet's
item 5, and by ENDGAME-REWRITE-1's `bandFloor` test.

**RE-EXPRESSED, not deleted (2 fixtures + 4 sites):**

- **The corridor-cap block moves BEFORE the endgame threshold.** Its own comment already said it was
  pinned to the off-arm *because* the scheduled endgame stands the composition down — so the honest
  fixture is one the endgame is not composing in, which is where that composition is live in the
  shipped product. The assertions are untouched.
- **RUNIN-BACK-1's mirror assertion.** It asserted the leader sits at the exact mirror on the first
  composed frame. That was true of the HOLD, which stood still at the mirror until it released; the
  schedule is moving from the moment it engages, so a fixture's first composed frame may already be a
  little way along. It now asserts the placement is the mirror carried toward the state's own value
  **by exactly the sweep** — stricter than what it replaces, and still admitting no third number.
- Four fixtures forced the sweep to span the window by setting the old release latch to 0; they now
  put the fixture past the turn, which is the schedule's equivalent. Every assertion beneath them is
  unchanged.

**KEPT with the condition removed:** everything else — 19 dead key references dropped from fixtures.

---

## 4 · WHAT WAS PRESERVED

**The justification table is now in `docs/CAMERA_DIRECTOR.md` §3b**, beside the design it argues for,
as a table rather than a comment above a deleted key: standstill 43% → 17% and the longest static run
2017 ms → 550 ms, the deadline 0 of 9 tracks → 9 of 9, arrival 48% → 6%, widest frame 6.1 → 4.4
corridors, smoothness 78.3 → 13.3, monotonicity 9 of 9, and contender-off-canvas frames 59 → 35.

Two things were added in moving it, because a table copied without them would mislead:

- **The last row is the one that settles the argument.** A wider, moving shot was expected to cost
  racers at the edges; it does the opposite, because the schedule's shot is wider than the old one
  through the part of the endgame where the field is still spread.
- **The smoothness figure carries a warning.** 78.3 → 13.3 is a SMOOTHED second derivative, and a
  smoothed metric of exactly this shape hid a single-frame jump for two blocks running (Lesson 218).
  It is kept as what was measured on the day; it is not the reason to believe the endgame is smooth.
  That reason is the sheet's item 6, which grades the worst SINGLE frame.

**`docs/DEAD-ENDS.md` §Q** records the retirement: what it was, why it went, why it is gone rather
than switched off, the full list of what went with it, and the archive tag.

---

## 5 · A DEFECT OF MY OWN, FOUND AND REPAIRED HERE

**Both MEASURED stamp ids on master were corrupted, by me, in the previous block.**
ENDGAME-REWRITE-1's stamp script took the id as a REGEX SOURCE and then wrote that same escaped
string back into the document, so since that block they have read
`tracking-lag \(median/p95 pp per state\)`.

**Nothing caught it.** The guard finds a stamp by its own pattern and never compares the id to
anything, so a corrupted id is a silently accepted one — Lesson 209's shape, in a place I put it
myself. Both are repaired here, and the replacement script rewrites the whole line and asserts the
result carries no backslash.

Both stamps were also **re-run rather than argued**, and both are identical to the digit:
tracking-lag on all six states with frame counts, and straggler-truth's four pairs.
