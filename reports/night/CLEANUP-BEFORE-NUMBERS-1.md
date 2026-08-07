# CLEANUP-BEFORE-NUMBERS-1 — salvage what lasts, then drop the rest

**Branch** `feat/cleanup-before-numbers-1` off master `3cfaf1f3` · 2026-08-07

The owner has chosen the race-number design. Four branches were built to solve "names ON racers",
which that design removes. This lands what outlives them and deletes the rest — in that order,
because the reports are the most valuable thing in those branches.

---

## 1. Conformity, element by element

| the spec asked                                                    | done | note                                                       |
| --------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| Branch off master, FORMAT → MEASURE → COMMIT                            | yes  | Worktree, §7.                                               |
| **Stage 1** — all four reports on master WITH index entries, FIRST      | yes  | §2. Committed before any deletion, as its own commit.       |
| Stage 1 — marked as recorded negative results, mechanism not shipped     | yes  | Banner on each; the index entries carry it too.             |
| Stage 1 — do not rewrite them                                          | held | Only a banner added above the existing text.                |
| Stage 2a — countdown one home, dead key and its control removed         | yes  | §3a.                                                        |
| Stage 2b — the label-box unification                                   | yes  | §3b, and the unchanged render fingerprint proves it.        |
| Stage 2c — do NOT bring the "GO!" mismatch; report it as open           | held | §3c. Not brought. Reported in three places.                 |
| Stage 2d — say whether the overlap trigger is still worth keeping        | yes  | §3d — **dropped**, with the reason.                        |
| **Stage 3** — delete the four, each only after its report is on master   | yes  | §5, each confirmed individually.                            |
| Stage 3 — leave `feat/min-racers-visible-5` untouched                   | held | Not touched. It is still parked for the camera sitting.     |
| Fingerprints — ask the repo, run what it says is owed                   | yes  | §4. It said the world was owed; it was run.                 |
| Nothing should move                                                     | held | Neither moved.                                              |
| Tests — what the salvage needs, no more                                 | yes  | §6, three.                                                  |
| Two proposals of my own                                                 | yes  | §8.                                                         |
| Planner proposal 1 (leave an entangled piece behind)                    | **not needed** | §3 — nothing was entangled; both pieces came out clean. |
| Planner proposal 2 (one plain sentence about master afterwards)         | **taken** | §9.                                                    |

---

## 2. Stage 1 — the history landed first

All four reports are on master with index entries, committed **before** any branch was touched, so
no deletion could ever outrun its record.

Each gained a banner stating plainly that its mechanism is **not shipped**, because a report
describing a mechanism in the present tense reads like current behaviour to anyone who arrives later.
The text below the banner is untouched — a report says what was true when it was written.

**What each one is worth now that none of its code survives:**

| report | the durable finding |
| --- | --- |
| LABEL-STAGGER-1 | A stagger **creates** as many overlaps as it removes: start rows are not monotonic in screen y, so shifting a whole row walks the collision into the next. Four variants, none reaching zero. A fact about the geometry, not about one mechanism. |
| LABEL-SHRINK-1 | A rule can pass every number it was given and still be wrong. Plus: the render-fingerprint harness draws **nameless** racers and cannot see this class of change; and stability between adjacent field sizes cannot hold while the start grid is a staircase. |
| START-SEQUENCE-1 | How bad overlap really is with realistic names, and the countdown's three-way disagreement in which only one number governed anything. |
| ROLL-CALL-PAIRING-1 | **The most transferable of the four:** a label centred on its racer only *points* at it while it is about one racer wide. That is why the race-number design exists, and it will apply again to any label wide enough. |

---

## 3. Stage 2 — what was salvaged, what was dropped, and why

**(a) The countdown — SALVAGED.** `countdownDuration: 3` is gone, and so is the Dev Panel control
that wrote it. It was read by nothing: a live control that silently did nothing, which is worse than
no control — it invites someone to fix the countdown by moving it, and then to distrust the whole
panel when nothing happens. `countdownDurationMs` is now the only countdown number, and its comment
records the disagreement instead of repeating the false claim that the two matched.

**(b) The label box — SALVAGED.** Height, offset and padding had two homes: `nameTagLayout.js` named
them to lay a label out, `racerRendering.js` re-typed them as literals to draw one. Two copies of one
rectangle. Nothing had drifted, which is precisely the argument for fixing it while that is still
true. The renderer now imports them.

**(c) The "GO!" second — NOT SALVAGED, STILL OPEN.** `drawCountdownOverlay` counts from a hard-coded
3 while the phase lasts 4000 ms, so "GO!" stands for an extra second before anything moves. Visible,
so it was left for work the owner's eye is on. Recorded in the defaults comment, the START-SEQUENCE-1
banner and its index entry, so it cannot go quiet.

**(d) The overlap trigger — DROPPED, and it goes with its branch.** It was exact — 0 false positives
and 0 misses across ten tracks at every field size — and **it has no job left**. With 2–3 character
race numbers the condition it detects is effectively unreachable, and it existed only to gate the
stagger, the shrink and the roll call, all three of which are gone. Keeping an exact answer to a
question nobody asks is how a module accumulates weight; the founding pillar says the opposite. Its
reasoning is preserved in LABEL-STAGGER-1.

**Planner proposal 1 was not needed:** neither salvaged piece was entangled with the machinery being
dropped. Both are standalone functions, and both came out clean.

---

## 4. Fingerprints — asked, not assumed

`engine-reach --check` on the actual staged diff:

```
ENGINE REACH: 1 of 5 path(s) can change the race:
  client/src/modules/storage/defaults.js
```

So the world fingerprint was owed — a key was removed from a file the engine can reach — and it was
run rather than reasoned about.

| role | before | after |
| --- | --- | --- |
| world | `dc4647be0f55ebdb` | **unchanged** |
| render | `cf716cbdf37b2077` | **unchanged** |
| camera | — | not owed, not run |

The unchanged **render** hash is the point rather than a formality: it is what proves the label-box
merge is arithmetically identical, instead of my asserting that it must be.

`npm run verify`: **PASS 5, FAIL 0.**

---

## 5. Stage 3 — the deletions, each against its landed report

Every branch was deleted only after confirming its report is on master, checked one at a time rather
than as a batch:

| branch | report on master | archived as | deleted |
| --- | --- | --- | --- |
| `feat/label-stagger-1` | LABEL-STAGGER-1.md ✔ | `archive/label-stagger-1` | local + origin |
| `feat/label-shrink-1` | LABEL-SHRINK-1.md ✔ | `archive/label-shrink-1` | local + origin |
| `feat/start-sequence-1` | START-SEQUENCE-1.md ✔ | `archive/start-sequence-1` | local + origin |
| `feat/roll-call-pairing-1` | ROLL-CALL-PAIRING-1.md ✔ | `archive/roll-call-pairing-1` | local + origin |

**A decision made alone: I tagged each branch `archive/*` before deleting it.** The spec said delete;
it did not say tag. But this project already has that practice and a register for it — `docs/TAGS.md`
carries `archive/greenfield-proto-final`, `archive/chain-choreo-final` and others, each preserving a
branch's history before the branch was removed. Deleting four branches outright would have discarded
the *code* for the roll call, the leader lines and the dimming, and at least the last of those is a
plausible ingredient for the race-number work — pairing a number to a racer is the same problem the
connector was solving. A tag costs nothing and is one command to remove if he disagrees. Each is
registered in TAGS.md in the same commit as the tag, per the ceremony's one-step rule.

**`feat/min-racers-visible-5` was not touched**, as instructed. It remains parked for the camera
defaults sitting.

---

## 6. Tests

**Added — `labelBoxGeometry.test.js`, three.** Both R7 questions each. It pins the exact arithmetic
the renderer used to carry, checks that the box scales with the font while the padding deliberately
does not, and fails if anyone re-types `fontPx * 1.18` instead of importing it.

That is the whole suite the salvage needs. The mechanisms these helpers were extracted for are gone,
so there is nothing further to keep honest; testing more would be testing the shape of a rectangle.

**Deleted: none by hand.** The tests belonging to the dropped mechanisms — the stagger trigger tests,
the shrink tests, the roll-call and pairing tests — died with their branches, which is the correct
place for them to die.

---

## 7. How this was done

Built in a worktree at `C:/ra-wt-clean`. **One unavoidable consequence, stated because it changes
something the owner can see:** `feat/start-sequence-1` was checked out in the main tree, serving
5173, and a branch cannot be deleted while it is checked out. The main tree was therefore moved to
master. **5173 now serves master** — the eye test on that branch is over by construction, since the
branch no longer exists.

---

## 8. Proposals of my own

**8.1 — Point the render-fingerprint harness at a real roster before the number work starts.**
LABEL-SHRINK-1 measured that the harness draws **nameless** racers, so every label box in it is 8 px
of padding and it cannot see label-layout changes correctly. The race-number design will change what
is drawn on and around a racer, and this is the instrument that would have to certify it. Fixing it
moves the render baseline once, deliberately, and buys an instrument that works. `mixed` is the
roster to use — it exercises the widest and narrowest pairings.

**8.2 — Take the "GO!" second with the first race-number block that touches the countdown.** It is
open, it is visible, it is one expression, and it will keep being deferred as long as each block
correctly declines to smuggle in a visible change. Naming it as a line item on the next block that
already owns an eye test is how it actually gets done.

---

## 9. What master is, in one sentence

**Master now carries the four reports as history, the countdown with one home and the label box with
one home, and exactly one open branch — `feat/min-racers-visible-5`, parked for the owner's camera
defaults sitting.**

---

## 10. What I did NOT do, and why

- **Did not keep the overlap trigger.** §3d — exact, and out of a job.
- **Did not bring the "GO!" fix.** §3c — visible, and instructed not to.
- **Did not rewrite any report.** Only a banner above the existing text.
- **Did not touch `feat/min-racers-visible-5`.** Instructed not to, and it is a live parked item.
- **Did not delete the four branches outright.** §5 — archived as tags first, following this
  project's own established practice for exactly this situation.
