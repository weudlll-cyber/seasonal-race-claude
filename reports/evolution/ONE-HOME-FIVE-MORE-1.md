# ONE-HOME-FIVE-MORE-1 — the HIS arm had seven homes, not two

**Branch:** `refactor/his-arm-five` off master. **NIGHT-2026-08-23, piece 8.**

The brief named three quantities written twice: the endgame threshold, the eleven keys of the HIS
arm, and one condition spelled out twice. **Established at source first, as it asks — and two of the
three were already closed, while the second was closed against a count that was wrong.**

---

## 1. What was already done, and what was not

| # | the quantity | tonight's finding |
| --- | --- | --- |
| 1 | **the endgame threshold** | **ALREADY ONE HOME.** `endgame-spec.mjs:105` reads `DEFAULT_CAMERA_CONFIG.endgameThreshold`; `camera-curve.mjs:65` reads `__CFG.endgameThreshold`. **Both bare `0.95` literals are gone.** |
| 3 | **the in-frame condition** | **ONE HOME EXISTS** — `scripts/lib/frameBox.mjs` (`inFrame`, `countInFrame`). 8 sites converted; **19 copies in 12 files deliberately left**, with a stated reason. |
| 2 | **the eleven keys of the HIS arm** | **THE HOME EXISTS AND THE COUNT WAS WRONG.** |

**ONE-HOME-THREE-TRUTHS-1 (2026-08-23, piece 7 of the previous night) did items 1 and 3 and created
`scripts/lib/hisArm.mjs` for item 2.** It recorded the HIS duplication as *"exactly two, byte-for-byte
— `viewer-invariants.mjs` and `diag/endgame-spec.mjs`, each with its own private copy of `setPath`
too"*, converted those two, and moved on.

**IT WAS SEVEN.** Five more instruments each carried their own `const HIS = [...]` **and** their own
private `setPath`:

```
scripts/endgame-width-truth.mjs:68
scripts/floor-reach-truth.mjs:68
scripts/label-names-truth.mjs:104
scripts/line-visible-truth.mjs:65
scripts/pan-lag-account.mjs:57
```

**The previous piece did not under-deliver on what it saw — it stated a COUNT as exact after finding
two.** That is the same shape as the errors this family keeps turning up: an absence or a total
asserted from the first search that matched, rather than re-established. It is also exactly what
tonight's brief guards against, and the guard worked.

---

## 2. Nothing had drifted yet — which is why this was safe to do

**All seven copies were verified identical BEFORE anything was deleted.** That check is the whole
basis for calling the change safe, so it is stated with its numbers:

| | hash across all seven |
| --- | --- |
| the `HIS` array (11 key/value pairs, comments stripped) | **`1bc93ac237ab`** |
| the `setPath` body (whitespace-normalised) | **`4fe5495156b2`** |

**Seven for seven, both.** The brief's own words — *"all copies currently AGREE, which is the
dangerous variant"* — were true of seven files rather than two. **Nothing had diverged, so nothing
had to be reconciled**; had any copy differed, the correct action would have been to report the
divergence and touch nothing, because unifying drifted copies silently changes a measurement.

---

## 3. The proof: five instruments, byte-identical output

**This piece changes no behaviour, so the proof is that nothing moved.** The engine fingerprints are
not the right instrument here — `engine-reach` says so mechanically:

```
$ node scripts/engine-reach.mjs --check <the five paths>
ENGINE REACH: none of 5 path(s) carry a change that can reach the race engine.
  5 outside the hull (cannot reach the engine at all)
```

**So the fingerprints cannot speak about this change, and a green fingerprint would have proved
nothing.** What CAN speak is the instruments' own output — and these five instruments exist to
produce numbers that are already in the record.

**Each was run on master's version and on the converted version, same arguments, and the outputs
compared byte-for-byte:**

| instrument | output | verdict |
| --- | ---: | --- |
| `pan-lag-account.mjs --tracks=dirt-oval --json` | 170,971 B | **IDENTICAL** |
| `line-visible-truth.mjs --tracks=dirt-oval --json` | 585,169 B | **IDENTICAL** |
| `floor-reach-truth.mjs --tracks=dirt-oval --json` | 32,304 B | **IDENTICAL** |
| `endgame-width-truth.mjs --tracks=dirt-oval --json` | 373,751 B | **IDENTICAL** |
| `label-names-truth.mjs` (its full default run) | 1,352 B | **IDENTICAL** |

**1.16 MB of instrument output, not one differing byte.** That is a stronger statement than the
textual hash equality in §2, because it exercises the substituted code rather than comparing it.

---

## 4. Source hygiene

- **Five files changed.** Each lost a `const HIS = [...]` block and a `function setPath(…)` and gained
  `import { HIS, setPath } from "./lib/hisArm.mjs";`.
- **Lines:** −**~90** across the five (the arrays and the five function bodies), +**25** (the import
  and a four-line note in each file).
- **Each file carries a note saying what was removed, that the copy was verified identical first, and
  that the earlier count was wrong** — so the next reader meets the history where the code is, not
  only in a report.
- **Nothing was rewritten.** The substitution is a pure removal plus an import; no call site changed,
  no argument order changed, and `applyHisArm` was deliberately NOT adopted even though it exists in
  the home — **the five call `setPath` in their own loops and converting those loops would be a second
  change hiding inside a transcription.**
- **Noticed but left alone: the 19 remaining copies of the in-frame condition**, in 12 files. **They
  were left by ONE-HOME-THREE-TRUTHS-1 for a stated reason** — different variable names, different
  canvas constants, test files with their own `FRAME` object — and that reasoning still holds. **It is
  that report's own PROPOSAL and it is a piece of its own.** Not touched tonight.
- **Absence claims re-established:** `git grep -c "function setPath" -- scripts` now returns exactly
  one file, the home; `git grep -n "^const HIS = \[" -- scripts` returns nothing. Both were run after
  the change, and both patterns demonstrably matched before it.

---

## 5. Build-vs-spec conformity

1. **Two of the three quantities the brief named were already closed**, and the piece says so with
   source evidence rather than re-doing them. **The value tonight is entirely in item 2's count.**
2. **The brief said the fingerprints are the proof this piece stands on. They are not, and that is
   established mechanically rather than argued** — `engine-reach --check` reports all five paths
   outside the engine hull, so no fingerprint the change reaches exists. **Substituting a real proof
   (byte-identical instrument output) for an inapplicable one is a deviation and is stated as one.**
   Had I run the world fingerprint and reported it green, that would have been a true statement that
   proved nothing about this change.
3. **The five call sites were converted; `applyHisArm` was not adopted.** The brief says "make the
   other site read it" — the sites now read the arm from one home. **Going further would have been a
   refactor rather than a de-duplication**, and the night forbids redesign.
4. **R15 — what ran.** `node --check` on all five; `engine-reach --check`; the five before/after
   equivalence runs; and `npm run verify`, whose routing selects `script-suite` from a `scripts/` diff.
   **No client suite and no browser gate:** neither reads any changed file, and neither can have
   changed its answer.

---

## 6. Proposals

**P1 — A GUARD FOR THE HIS ARM, BECAUSE THIS IS THE SECOND TIME IT HAS BEEN COUNTED WRONG.** The arm is
eleven key/value pairs that four separate instruments must apply identically for their numbers to be
comparable. **A test asserting that no file under `scripts/` outside `lib/hisArm.mjs` defines
`const HIS = [` is one line and cannot produce a false positive** — a private copy of the arm is never
correct now that a home exists. `scripts/lib/oneHome.test.mjs` already exists and is the natural place.
**It would have caught all five of tonight's files the day the home was created.**

**P2 — "EXACTLY TWO" IS THE CLASS OF CLAIM THIS PROJECT KEEPS GETTING WRONG, AND IT HAS A CHEAP FIX.**
Tonight alone: the HIS arm was "exactly two" and was seven; PIECE 6 found a dead-code list whose
"named nowhere" test never looked at `.js`; PIECE 2 found an id used twice for fifteen months. **All
three are the same error — a total asserted from the search that was run, without asking what the
search could not see.** The fix is not a rule but a habit already half-present in this repo: **state
the COMMAND beside the count.** "Exactly two (`git grep -n 'const HIS' -- scripts`)" would have been
falsified by its own evidence line, because that command returns seven.

**P3 — THE 19 REMAINING IN-FRAME COPIES ARE NOW THE LARGEST KNOWN DUPLICATION IN THE TREE, AND THE
RISK THAT DEFERRED THEM IS REAL.** They were left because converting predicates across a dozen
instruments whose numbers are in the record risks a silent transcription error. **Tonight demonstrates
the method that removes that risk: run each instrument before and after and compare the bytes.** Five
instruments took under two minutes to prove. **The deferred piece is affordable now in a way it was
not when it was deferred**, and it should be done with the same before/after evidence rather than on
the strength of a careful read.
