# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-02 night, after piece 7. **HYGIENE AND TRUTH is running.**
Pieces 1, 4, 5, 6 and 7 are merged and pushed. Master is green after each.

---

## ★ THE TWO NUMBERS YOU ASKED FOR

### 1. Can a machine catch the pattern? **PARTLY — four of the six, on two rules, inside guards you already have.**

The shape — a statement true when written, left standing while the thing it described moved
underneath it — **is not one fault. It is five.** Split by what the two sides actually ARE:

| | the subtype | catchable? |
| --- | --- | --- |
| a hand-copied SET whose home is machine-readable | the fingerprint's track table, the sprite audit's geometry | **YES** |
| a hand-maintained SUBSET that must COVER a computed set | the parity soak's roster | **YES**, with one relation typed once |
| a document sentence stating what a command computes | SHIP-CEREMONY's closure row | **YES — the guard already exists and already fires** |
| a SCOPE word in a procedure | step 12 | **NO as a statement; YES by its whole consequence** |
| a premise in code about what a value IS at runtime | the company headcount | **NO** |

**No new check script.** Two rules inside existing guards. **Rule A** widens
`check-fallback-agreement` so a literal mirroring a declared home must agree with it — with the pairs
**discovered from the registry's own field names**, never listed, because a typed correspondence table
is the same defect one level up. It would have gone red on the sprite audit's table at
**2026-06-03, the commit that introduced it** — that table never agreed with the registry for one day
of its 91. **Rule B** widens `check-tags` to refuse a branch standing at origin whose TREE master
already holds; it would have caught step 12 at the FIRST of the six merges rather than at the end.

**The company headcount is not catchable and the report refuses to pretend otherwise.** Neither side
is a literal, and the repair's own reasoning shows every machine-readable form of that premise
recreates the defect at the caller.

**A correction that strengthens the case: THREE of the six were created by repairing another, not
two.** Half of them are a *correct* repair moving one side of a pair. That is why "review harder at
write time" cannot work — nobody was wrong at write time.

### 2. How much of the backlog closed tonight? **NOT YET — piece 9 has not run.**

It is next after the two write-pieces ahead of it and it is never dropped. This line gets the count.

---

## WHERE EVERY PIECE STANDS

| # | piece | state |
| --- | --- | --- |
| 1 | The manta's tail belongs to her | **DONE — merged** |
| 2 | The twelve checks never exercised | not started |
| 3 | The ten test files that run only by hand | not started |
| 4 | Can the pattern be caught by a check? | **DONE — merged** |
| 5 | Prove or clear the six suspected-dead items | **DONE — merged** |
| 6 | The homeless facts, followed through | **DONE — merged** |
| 7 | Why RaceScreen cannot be tested | **DONE — merged** |
| 8 | Three steps between a stranger and a running install | not started |
| 9 | Give every open backlog entry a verdict | not started — **never dropped** |
| 10 | The documents must describe the tree that exists | not started — **never dropped** |
| 11 | Why a 60-second race exceeds 200 seconds of simulation | not started |
| 12 | Nothing measures motion, only per-frame values | not started |
| 13 | The race-identity hash | not started |
| 14 | The worktree stubs, at the cause | not started |

---

## PIECE 1 — THE MANTA'S TAIL. Your decision is written down, and it turned up a second difference.

**Nothing about any race changed.** No `bodyFill` corrected, no default moved, all four fingerprint
guards routed **`nothing changed`**, `verify` PASS 13 FAIL 0.

Your rule now lives in `docs/RACER_DATA_MODEL.md` § "What a racer's BODY is", where someone
regenerating a sheet will meet it. The Racer Editor now returns it: until today `measureBodyFill`
measured with the shedding box while all forty pinned values had been produced by the plain one, so
re-measuring any of five sheets would silently have written a smaller number into a value that sets
body extents and start-row spacing. **It would have changed who wins races.**

**★ THE FINDING THAT WAS NOT IN THE BRIEF: the two rules differ in TWO ways, not one.** Besides the
shedding, the **alpha threshold** differs by one level — and it decides two of the twenty types.

| threshold | reproduces the registry |
| --- | --- |
| `alpha >= 10` | **20 of 20** |
| `alpha > 10` | 18 of 20 — beetle `0.398 → 0.383`, koi `0.578 → 0.574` |

**It was found by sabotage, not by reading.** The obvious clean repair — deriving the plain box by
extracting the shedding box's own scan — moved those two rows the moment it was wired in. A repair
that changes two numbers is not a repair. The two functions are therefore separate;
`computeSpriteBoundingBox` is **behaviourally untouched** (the diff removes no line of code) and
keeps sprite CENTRING, where shedding is right.

**Of the two findings put to me for checking, one is refuted and one confirmed exactly.**

- **"The pins were taken as a MAX across frames" — REFUTED, twice.** They are the **UNION**. The two
  coincide on 12 of 20 — manta among them, which is why the max reading looked right there — and on
  the other 8 the union is strictly wider and is what matches. Nor was it unwritten:
  `measureBodyFill`'s comment has always said union. What was unwritten was *which box rule*.
- **"The shedding rule varies 0.578–0.680 over manta's sixteen frames" — CONFIRMED, exactly.** The
  plain box holds 0.766–0.805 over the same frames, and `bodyFillX` is 0.633 on every frame under
  both rules — so the disagreement sits precisely on the axis the tail occupies. It sheds the tail
  when the tail sweeps thin. **A measure that tracks the wingbeat is measuring the pose, not the
  body.** That is now written where the rule is written, as the argument for your decision.
- **My own generalisation of that is REFUTED, and is recorded because it is tempting.** Withholding
  one frame at a time, the shedding rule is more fragile on **1 of 20** types (manta), equal on 17,
  *less* fragile on 2; mean ratio 1.04×. It is a manta argument, not a general one.

**All twenty agree with the owning rule** — the repaired audit reports zero rows as `OWNING RULE
DIFFERS`. **Sabotage-proven:** pointing the editor back at the shedding rule fails
`canvasUtils.bodyRule.test.js` with `expected 0.62 to be close to 0.8`.

---

## PIECE 5 — WHAT IS ACTUALLY DEAD: almost nothing, and the census named the wrong reader.

**5 ALIVE, 1 split (6 of its 8 dead), 0 still unproven. Nothing was removed.**

- The **11 zero-reference `scripts/diag/` runners** are **ALIVE** — re-running two summarisers
  reproduces `AIM-LEVERS-1` and `RUNIN-LEVEL-SET-1` **digit for digit**. They authored claims already
  acted on. A zero-reference grep says only that nothing *imports* them.
- The **19 "VOID" instruments** are **ALIVE** on the census's own discriminator, which had already
  been satisfied six days *before* the census ran.
- **6 of the 8 sprite generators are DEAD** — four of their sources were deleted one day after the
  generators were written, and two more would overwrite tracked artwork in place.
- **`reports/perf`: the reader is `phys-bench-fit.mjs`, it reads FIVE files, not one, and it is
  MANUAL-ONLY** — in no suite, no workflow, no hook. It reads **numbers from named files**, never
  prose. So summarising the prose costs nothing. **Keeping those five files and deleting the other
  310 breaks no automated check at all.** One hazard: losing `matrix.json` throws, but losing the
  profiles is **silent** — it drops the whole Q4 table at exit 0.

---

## PIECE 6 — THE HOMELESS FACTS: do one, drop the other, and the reason is not the filed defect.

- **B2 `AUDIT_RENDERED_BODY_H` needs NO new home, and that is the answer.** It is the *product* of two
  values that each already have one home; under R14 a derived value is owed a derivation, not a home.
  Two edits close it.
- **B3 `surfaceClasses` in `goldenRunner.mjs`: the honest home is NONE.** It agrees with no source and
  two of its values name surface classes that exist nowhere. **A fact that agrees with no source is
  not homeless, it is invented** — the proposal is deletion, and it is dropped as not worth doing
  because the field is already annotated as unread.
- **The recommendation is B2, for a defect found while costing it, not the one filed.** That test is
  **titled ±5% while asserting ±0.05 absolute — 33× tighter than its own title** — and buggy passes
  it by 2.8e-15. A live tripwire on a race input that the next rounding change will fire.

---

## PIECE 7 — RaceScreen: the seam is ONE LINE, and the file does not need it.

**Both "known blockers" are refuted at the code.** `sessionStorage` is not one (jsdom implements it).
The geometry is not a fetch (it is a synchronous `localStorage` read; the network is on SetupScreen).
**The one real blocker is that jsdom returns `null` for the 2D context** and the next line
dereferences it.

**The minimum seam is one default parameter and one call site**, and the stand-in already exists.
**And it should not be added.** Four tests point at the file and none executes it — two mock it away,
two grep its source *as text*. Everything a mount would exercise already has a better driver, and
the browser suite already drives `/race` **with a real rasteriser**. Only two things would be new,
and both belong somewhere else. **That everything worth asserting was already moved out is the
finding, not the absence of one.**

---

## NEEDS YOUR WORD

Nothing from tonight yet — no fork so far has needed a judgement that a decision rule could not
settle. This section fills as the chain runs.

**Standing, from before tonight:** everything in `docs/BACKLOG.md`'s open decisions. Piece 9 is about
to sort exactly those into one section you can answer in a sitting.
