# HARNESS-NAMES-1 — teach the render harness what a label looks like

**Branch** `feat/harness-names-1` off master `3613ef41` · 2026-08-07 · **ready to merge, your word**

**The fix landed and the block's own proof did not come out as predicted.** The success criterion was
"a label change now moves one track's hash where before it moved ten". Measured both ways: **1 of 10
before the fix and 1 of 10 after.** Attribution was never broken. §4 says what actually was, and what
the second probe found instead — which is more interesting than the thing I was asked to demonstrate.

---

## 1. Conformity, element by element

| the spec asked                                              | done | note                                                     |
| ---------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| Branch off master, FORMAT → MEASURE → COMMIT                       | yes  | Worktree, §8.                                             |
| (a) real names, the MIXED set                                      | yes  | Imported from the one home, not re-typed. §3.             |
| (b) deterministic, same names to the same racers every run          | yes  | By racer index, modulo the roster. Pinned by a test.       |
| (c) the harness only; nothing the game runs may change              | held | The diff is two files under `scripts/` and the record.     |
| RENDER: mint the new value                                         | yes  | `cf716cbdf37b2077` → **`f2e170d17ccf84e9`**. §5.          |
| WORLD and CAMERA must not move; ask the repo                       | yes  | §5 — asked, and neither moved.                            |
| **Prove the instrument now works: one track, not ten**              | **NOT AS SPECIFIED** | §4. The premise does not survive measurement. |
| Report both numbers side by side                                    | yes  | §4, and both probes rather than the one.                  |
| Tests: deterministic · every racer named · MIXED is used            | yes  | §6, five.                                                 |
| Two proposals of my own                                            | yes  | §7.                                                       |
| Planner proposal 1 (other blind spots of the same kind)             | **taken** | §7.1 — and the list was indeed incomplete.           |
| Planner proposal 2 (certify the number work per-track?)             | **taken, answered yes with a caveat** | §7.2.                          |

---

## 2. What was wrong

`render-fingerprint.mjs` never set `r.name`. `labelOf` falls back to `r.name ?? ''`, so every label
box in the instrument was **8 px of padding and nothing else** — a geometry the game cannot produce,
because a racer always has a name.

## 3. What was done

The harness names its racers from `QUICK_TEST_NAMES_MIXED`, **by index, modulo the roster**, so the
same racer takes the same name on every run and on every track.

**Imported from `racerNames.js`, never re-typed.** In this project a racer's name is an engine input;
a second copy of a name list is not a tidiness problem but the silent-divergence bug that file's own
header was written about. A test fails if anyone pastes a roster into the harness.

**MIXED** because a label instrument wants the extremes: 2 to 23 characters with the lengths
interleaved, so adjacent racers differ and both the widest and the narrowest pairings a real field
can contain are exercised. `current` (4–8) would understate every width; `long` is uniformly wide and
would never produce a narrow pair. A test asserts MIXED spans wider than either alternative rather
than trusting the reasoning.

---

## 4. The proof — and why it says something other than what was expected

**Probe 1, the geometry-conditional one.** A marker drawn only where a formation's labels actually
overlap — the same shape of rule that mis-scoped in LABEL-SHRINK-1.

| | tracks whose hash moved |
| --- | --- |
| pre-fix harness | **10 of 10** |
| post-fix harness | **10 of 10** |

That looks like a failure and is not. With MIXED at 40 racers, **every track genuinely overlaps** —
QUICKTEST-NAMES-1 measured exactly that. So 10 of 10 is now the *correct* answer, where before it was
the right number for the wrong reason. The probe cannot tell those two apart, so it proves nothing.

**Probe 2, attribution.** Rename the racers on **one track only** — a real browser scenario, since
each race has its own roster.

| | tracks whose hash moved |
| --- | --- |
| pre-fix harness | **1 of 10** — river-run |
| post-fix harness | **1 of 10** — river-run |

**Attribution was never broken.** The harness has always run each track independently, so a change
confined to one track was always confined to one hash.

**So what WAS broken?** Exactly what LABEL-SHRINK-1 §6 said and no more: a rule *conditional on label
geometry* fires on the wrong set of tracks here, because the geometry is wrong. That is fixed — the
boxes are now real widths. The spec generalised that finding into "the instrument cannot say where",
and measurement does not support the generalisation. I would rather report that than let a block
claim a fix it did not make.

**And the second probe found something nobody anticipated.** With MIXED, a geometry-conditional rule
now fires on *all ten tracks*, correctly — because a long-name race really does overlap everywhere.
**The instrument is now representative of a long-name race, and saturates for exactly the class of
rule it was fixed to measure.** With `current` the same rule scoped to three tracks. Neither roster
is neutral: one understates, the other saturates. That is a real trade and it is the owner's to
revisit — §7.

---

## 5. Fingerprints

| role | before | after |
| --- | --- | --- |
| render | `cf716cbdf37b2077` | **`f2e170d17ccf84e9` — MINTED** |
| world | `dc4647be0f55ebdb` | unchanged |
| camera | `00cafa2432add0f7` | unchanged |

`engine-reach --check` on the actual diff: *none of 1 path can reach the race engine.* An
**instrument** change, not a behaviour change — no ship ceremony, no eye test, nothing visible.

The record's `mintedBy` says so in full, so a future reader cannot mistake this re-mint for a
behaviour change. `check-fingerprints`: 4 roles, 845 files, 0 stray copies. `npm run verify`:
**PASS 3, FAIL 0.**

---

## 6. Tests

**Added — `scripts/render-fingerprint.test.mjs`, five.** Both R7 questions each. Every racer is
named; assignment is by index with no random source; the roster is imported rather than restated;
MIXED provably spans wider than either alternative; and the roster is long enough for the field.

**A note on how they are written:** the first cut used vitest and `script-suite` rejected it — that
suite runs `node --test`. The guard caught a test that could not run, which is the guard working.

**Deleted: none.**

---

## 7. Proposals of my own

**7.1 — Planner proposal 1, taken, and the list was incomplete in a second way too.** The known
blind spots were the sprite blit, particles and trails, and the rasteriser. Two more:

- **The one just fixed** — racer NAMES were never set. Not on the list, which is why the list should
  be treated as "what we have found so far" rather than as complete.
- **`verify` does not run the render fingerprint when the render HARNESS changes.** Its selector
  matches client files that can reach a `ctx.` call; `scripts/render-fingerprint.mjs` is neither.
  This very block changed the instrument and verify skipped the guard — I ran it by hand. **The
  instrument can be edited without its own guard firing**, which is the same family of gap as the one
  this block fixed.

The general lesson worth writing down: the harness is a SECOND IMPLEMENTATION of the frame's inputs.
Every input the component sets and the harness does not is a blind spot, and the way to find the rest
is to diff what `RaceScreen` puts on a racer against what the harness does.

**7.2 — Planner proposal 2, taken: yes, certify the number work per-track — but the combined hash
must stay the gate.** Per-track hashes are the right diagnostic: they say *where*, and the number
work will touch labels on every track at once, so a combined-only move tells you nothing about
whether a track you did not intend to touch has changed. The caveat is that per-track hashes are not
currently a gate anywhere — nothing checks them, and adding ten gates is ten things to re-bless on
every honest change. So: keep the combined hash as the gate, and report the per-track table in the
block that moves it, as evidence rather than as a check.

---

## 8. What I did NOT do, and why

- **Did not claim the proof the spec asked for.** §4 — measurement does not support its premise, and
  a block that reports a fix it did not make is worse than one that reports what it found.
- **Did not change the roster choice.** MIXED was specified and it is defensible; the saturation
  finding is reported so the owner can revisit it with the numbers in front of him.
- **Did not fix the `verify` selector gap** (§7.1). It is a change to the verify path itself, which
  by R8's own rule means CI must be green first — a different block with a different shape.
- **Did not merge.** The owner's word, as always. Nothing here needs his eye; it needs his go-ahead.
- **Did not touch 5173.** It is on master and was never restarted.
