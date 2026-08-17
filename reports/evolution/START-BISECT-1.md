# START-BISECT-1 — when did the start start looking like this?

**Branch:** `docs/start-bisect-1`, off master `d4bd2324`. **INVESTIGATION ONLY.** No fix, no revert,
no special case, no camera change. **The repository's code is byte-identical to master; this block
adds one report and one index line.**

## THE ANSWER, IN ONE LINE

**`c3f294d1` — 2026-08-08 01:20 — `fix(camera): the hold is what the state ASKS for, not where the
camera happened to stand` (CEREMONY-HOLD-TARGET-1).** Its direct parent frames the leader at **863 px**;
it frames him at **1517 px**, off a 1280 px canvas, and that number has not moved since.

**Deliberate camera change, judged on other tracks.** It fixed a real defect on the serpentines it
was measured on, and its effect on closed tracks at 3 s was never looked at.

**And yes — the frames he saw would have looked different.** The change is nine days old. Every
runnable commit before it puts the leader on screen.

---

## THE PREDICATE — FIXED BEFORE THE SEARCH, NOT AFTER

`scripts/diag/start-frame-capture.mjs` unchanged: **dirt-oval, seed 9, Quick Test, 20 racers**, the
RUNIN-START-1 sample points. The deciding number is **the leader's screen x at 3000 ms** against a
**1280 px** canvas:

> **FAIL — the defect is present:** leader x at 3000 ms **> 1280** (off the right edge).
> **PASS — the defect is absent:** leader x at 3000 ms **within 0…1280**.

**`searound` is the second witness** and its number is reported at every commit. The threshold is the
canvas edge — a fact about the frame, not a value chosen once results were in. The canvas is 1280 px
wide because the render store is a fixed 1280×720.

---

## THE INSTRUMENT, AND THE TWO ADAPTATIONS IT NEEDED

Every commit was run **as a whole tree** in a detached worktree (`git reset --hard` + `git clean -fdx`
between candidates). The harness and its driver are **instruments**: `scripts/lib/raceDriver.mjs`
stands in for `RaceScreen`, and nothing from a modern tree was ever put in front of an old
**director** — that is the swap the brief forbids and it did not happen.

Two adaptations were unavoidable, and both are **proven, not assumed**:

| what moved                                                                                                                                   | adaptation                 | how it was proven honest                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveNameSet` arrived 2026-08-07 (QUICKTEST-NAMES-1); older trees export only `QUICK_TEST_NAMES`                                          | the instrument falls back  | **`resolveNameSet(DEFAULT_NAME_SET)` is byte-identical to `QUICK_TEST_NAMES`** — 70 names, JSON-equal, checked on master. **A racer's name is physics here**, so an unfaithful roster would have silently changed the race |
| `cd.ceremonySchedule` arrived 2026-08-07; before it `RaceScreen` used `countdownDurationMs ?? 4000` and a **six-argument** `updateCountdown` | the driver branches on era | both branches copied from **the `RaceScreen` of their own era** (`index.jsx` line ~1170 at `0c875e08`), so each commit is driven the way the game drove it then                                                            |

**The control that makes the adaptations trustworthy: master's numbers did not move.** Before the
adaptations `d4bd2324` measured `dirt=1517 searound=1360`; after them, the same. An instrument that
changed the answer on the one commit where no adaptation fires would have been disqualified.

**These adaptations live in the scratchpad and were NOT committed.** The repository is untouched.

---

## THE COARSE BRACKET

| commit     | date       | dirt-oval | searound | verdict                           |
| ---------- | ---------- | --------- | -------- | --------------------------------- |
| `d4bd2324` | 2026-08-17 | **1517**  | **1360** | FAIL                              |
| `e356e4d5` | 2026-08-10 | **1517**  | **1360** | FAIL                              |
| `83c9e648` | 2026-08-09 | **1517**  | **1360** | FAIL                              |
| `2df4e199` | 2026-08-08 | **1522**  | **1360** | FAIL                              |
| `a460dc31` | 2026-08-07 | 863       | 1085     | PASS                              |
| `291587f7` | 2026-08-06 | 815       | 943      | PASS                              |
| `0c875e08` | 2026-08-03 | 982       | 1135     | PASS                              |
| `46ffce26` | 2026-08-03 | 982       | 1135     | PASS — **oldest runnable commit** |

Both witnesses agree at every point, and the failing value is **identical from 2026-08-08 to
master** — nine days and roughly 300 commits during which nothing about this moved.

`2df4e199` reads 1522 rather than 1517 because that tree's ceremony steps the sample to 3017 ms; the
verdict is unaffected. **That row also caused the one measurement error in this block:** the first
extractor demanded a row labelled exactly `3000` and turned a perfectly good measurement into a false
SKIP. It was found by reading the tree's own output instead of trusting the summary line, and the
extractor now takes the sample nearest 3000 ms.

---

## THE BISECT, AND THE SKIPS

**Aug 7 (PASS) → Aug 8 (FAIL)** left 33 commits. The first probe went to the two oldest, on the
judgement that a start-camera commit is where a start-camera change lives:

```
ca178cc5  2026-08-08  dirt=863   searound=1085  PASS   <- LAST GOOD
c3f294d1  2026-08-08  dirt=1517  searound=1360  FAIL   <- FIRST BAD
```

**`ca178cc5` is the direct parent of `c3f294d1`** (`git rev-parse c3f294d1^` confirms it; `rev-list
--count` between them is 1). **The bracket is adjacent, so no skip can hide inside it** — which is
what makes the skips below unable to affect the answer.

### The skips, with causes — none of them inside the bracket

| commit                 | date       | why it could not run                                                                                                                  |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `fa022533`, `0c3d44a6` | 2026-08-02 | `client/src/modules/racerNames.js` does not exist; the roster lived inside `SetupScreen.jsx`, a **JSX React screen** Node cannot load |
| `a12b6ab7`             | 2026-07-26 | the racer-type registry pulls in `services/api.js`, which reads **`import.meta.env`** — a Vite-only global, `undefined` in bare Node  |
| `bde0bc00`             | 2026-07-24 | same                                                                                                                                  |

**The search did not bottom out and this is not a "was always like this" answer.** It found a
transition between two adjacent commits. The pre-2026-08-03 skips are a **runnability limit of those
trees**, named here so nobody mistakes them for evidence, and **making them run would have required
editing product source**, which this block does not do. The April refactor `6f4f4791` was therefore
never reached — and did not need to be.

---

## THE COMMIT, AND WHAT IT MOVED

**`c3f294d1` · 2026-08-08 01:20:20 +0200 · CEREMONY-HOLD-TARGET-1**
_"fix(camera): the hold is what the state ASKS for, not where the camera happened to stand"_
Two files: `CameraDirector.js` (+65 lines) and its test (+235).

**The term is the ZOOM — specifically the ceremony hand-over, now read as a TARGET every frame.** Its
own message says so: `_stateCamZoom()` returns the hand-over while it is live, and `_setTargets` calls
that **every frame, on the path a race actually takes**. Before, the arrived value was written to
`this.zoom` once and OVERVIEW's own setting immediately pulled the target away.

Read straight off the two frame captures, dirt-oval seed 9:

| at ms    | zoom BEFORE (`ca178cc5`) | zoom AFTER (`c3f294d1`) | leader x before          | leader x after   |
| -------- | ------------------------ | ----------------------- | ------------------------ | ---------------- |
| 500      | 6.3185                   | 7.1480                  | **−22** (0/20 on screen) | 395 (20/20)      |
| 1000     | 5.3703                   | 7.2024                  | 80 (9/20)                | 781              |
| 2000     | 4.7258                   | 7.2933                  | 588                      | 1122             |
| **3000** | **4.5870**               | **7.9388**              | **863** (20/20)          | **1517** (19/20) |
| 8017     | 6.7720                   | 6.7720                  | 738                      | 738              |

**Not the pan target, not its smoothing, not the field guarantee** — the pan is doing the same job on
both sides. The zoom at 3 s is **73 % tighter**, and a tighter frame magnifies the leader's distance
from the pan centre until he leaves the picture. By 8 s both sides are identical again: **the effect
is confined to the start window**, exactly where he saw it.

**And the change did what it was for.** Before it, the field was _off the left edge_ at 500 ms —
`0/20` on screen — and walked in. After it, 20/20 from the first sample. It genuinely improved the
opening; it moved the problem three seconds later.

---

## DELIBERATE, OR A SIDE EFFECT?

**A deliberate camera change, whose closed-track consequence was never measured.** Both halves matter.

**Deliberate:** it targets a real, reproduced defect — the camera gliding off the ceremony framing
from the first racing frame — and its message carries before/after numbers.

**Judged on other tracks:** every number in it comes from **river-run** (n=40, seed 5601) and
**mountainstreet** — _"the other serpentine"_. **Both are open serpentines. Neither witness in this
report is a serpentine**, and dirt-oval and searound are the closed tracks where the leader now
leaves the frame.

**The clearest evidence is a claim in its own message.** It reports _"racers outside the picture 0
throughout"_. On river-run that was true. On dirt-oval at 3000 ms it is **19/20 — one racer, the
leader, outside the picture**. The claim was not careless; it was **measured on the tracks that were
measured**, and the tracks that would have contradicted it were not among them.

So: not a change nobody looked at, and not one judged on the wrong thing either. **It was judged
carefully on a sample that did not include the case it broke.**

---

## WOULD THE FRAMES HE SAW HAVE LOOKED DIFFERENT? — YES, AND VISIBLY

**This is visible on day one, not a slow drift that only became visible later.**

It is not a change that waited for the field to grow, the handover to move, or the start rows to
change. The very first race run on `c3f294d1` framed the start differently from the last race run on
`ca178cc5`, on the same track and the same seed: **the leader at 863 px with all twenty on screen
becomes the leader at 1517 px, outside the canvas, with nineteen.** Nothing else had to happen.

**His certainty is correct and it is precise.** The change landed at 01:20 on 2026-08-08 — nine days
before he reported it. Every runnable commit before it passes; every commit after it fails with the
same number. **Months of watching a start that looked right, then this.** The observation was the
better instrument, and it pointed at a window nobody had looked in.

---

## FINGERPRINTS AND THE CLOSING STATE

**Nothing changed, so nothing could move.** No source file, no config, no test was touched — the diff
is this report and its index line. The four fingerprints are not re-measured here because there is no
change that could have moved them; `check-fingerprints` reports 0 stray copies and the record is
untouched.

```
engine-reach --check reports/evolution/START-BISECT-1.md reports/evolution/INDEX.md
  ENGINE REACH: none of 2 path(s) can reach the race engine.
```

**MINTED NOTHING.** The worktree used for the search was removed and `git worktree list` shows master
alone.

---

## NOTICED, NOT CHANGED

- **`~46 stale worktree metadata directories** sit under `.git/worktrees` and cannot be deleted
(`Permission denied`— the OneDrive placeholder behaviour).`git worktree prune`reports the error
and moves on, and`git worktree list` is correct, so nothing is broken. **Pre-existing and not
  touched**, but it means every future bisect leaves another one behind.
- **The harness prints `?` for `binding` and `ceilings.line` on older trees** because `_framingProbe`
  did not exist yet. The leader-x measurement never depended on it, so no verdict rests on a `?` —
  but a future search that wants "which term bound the frame" cannot get it from before 2026-08-04.
- **`2df4e199`'s 3017 ms sample** is a reminder that the ceremony's frame stepping is not constant
  across this history. It does not affect a 1280 px threshold, but it would affect any measure that
  compared values at exactly equal timestamps.

---

## PROPOSALS

### Proposal A — the repair is its own block, and this is what it has to decide

**Not attempted here, as instructed.** But the search narrowed it to one question worth writing down
while the evidence is fresh: **the ceremony hand-over is right to be held, and holding it to the
ARRIVED ZOOM is what closed tracks cannot afford.** On a serpentine the ceremony arrives at a framing
close to what OVERVIEW would have chosen; on dirt-oval it arrives 73 % tighter, and holding it means
holding a shot that was never meant to survive the field spreading out.

**So the repair is probably not "release the hold" — that would reinstate the glide the commit
fixed** — but a hold that is bounded by what the frame still has to contain. The evidence for either
choice is a pair of numbers already in this report, and it needs his eye on both tracks before
anything is built.

### Proposal B — the era adapter should live in the repository, not in my scratchpad

This search cost two adaptations to run the harness across three weeks of history, and **both are
thrown away when this session ends**. The next bisect over the same window will rediscover that
`resolveNameSet` arrived on 2026-08-07 and that `updateCountdown` used to take six arguments, and will
have to re-prove the roster equivalence to be honest about it.

**The cheap form is the era branch inside `raceDriver.mjs`, with the equivalence note attached** — a
dozen lines, no behaviour change, `INERT` by the engine-reach rule. It turns "can we measure the
past?" from an afternoon into a command. **Deliberately not proposed as a guard:** nothing here needs
enforcing, it needs keeping.

### Proposal C — a camera change should name the tracks it was judged on

`c3f294d1` is a careful commit. It reproduces a defect, measures it, states before-and-after numbers,
and claims _"racers outside the picture 0 throughout"_ — **and that claim is false on the two tracks
it did not run.** Nothing in the process was skipped; the sample simply did not include a closed
track, and the message does not say so.

**The cheap form is one line in the ship ceremony: a camera commit states which tracks its numbers
come from.** Not "run every track" — that is expensive and often pointless — but **naming the sample
turns a claim that reads as universal into one a later reader can bound.** Had this commit said
"measured on river-run and mountainstreet", this block would have started at the right question
instead of a three-week bisect. It costs a clause.
