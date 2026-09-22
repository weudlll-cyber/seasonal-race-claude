# BAND-SLACK-1 — (a) only. The proposal is ALREADY REFUTED, so (b) and (c) were not measured

**Read-only, branch `read/band-slack-1` off master `74378e6b`. 2026-09-22. Nothing built, nothing
measured, nothing merged.** The block's own decision rule: *"(a) finds the proposal already refuted
→ report it with the evidence and STOP; do not measure (b) or (c)."* This is that case.

---

## ★★ THE ANSWER

**The owner's proposal is a SUBSET of a mechanism this project already built, measured and deleted:
"universal band-arrival" (Lesson 178, removed 2026-07-23 with Lesson 180). His proposal is its hero
half — the same operation, on the cast racers only, with the pack left alone.**

It has been refuted **three independent times**, once of them **nine days ago in the very lines his
proposal names**. The measured result each time is the opposite of the hope: releasing a racer
inside his band settles the field, and for a cast racer specifically it triples the gap he opens.

**★ HIS READING OF THE CODE IS CORRECT, AND THAT PART IS NOT IN DISPUTE.** The band error *is*
computed every frame for every racer (`racePlanner.js:1365-1371`), it *is* zero whenever the racer
is inside his band, and it *is* discarded for exactly the cast racers — `strictness = isHero ? 1.0`
(`:1374`), then `error = strictness * rankError + (1 - strictness) * bandError` (`:1434`), which at
strictness 1.0 weights the band error with zero. The slack he describes is really there. **What is
already refuted is TAKING it.**

---

## 1 · THE EQUIVALENCE, BECAUSE THE WHOLE ANSWER TURNS ON IT

"Steer him INTO his band rather than onto an exact place" is not merely *similar to* the deleted
mechanism — at `:1434` it is **arithmetically the same operation**:

```
error = strictness · rankError + (1 − strictness) · bandError
strictness = 0  ⇒  error = bandError
bandError = 0 whenever the racer is inside his band            (:1365-1371)
⇒ error = 0 ⇒ rawTarget = 1.0 + noise ⇒ he is not steered at all while in band
```

So "steered into his band, not onto an exact place" **is** `strictness = 0`, and `strictness = 0`
**is** "free inside the band". They are one lever with two names. The code says so in its own words
at `:1428`: *"`strictness = 0`, which commands 1.0 anywhere inside his block."*

This matters because every prior attempt is recorded under the *liberation* name. Reading the
proposal as a new idea about steering, rather than as the old idea about freeing, is the only reason
it looks untried.

---

## 2 · THE PRIOR ATTEMPTS — who was freed, on what condition, what broke

★ **A correction to the brief first, because it changes what counts as precedent.** Lesson 178
(`docs/LESSONS.md:2979`) records **three mechanisms but only two band-release failures.** Its first
bullet, B2-Heroes "Attack & Fall", is the *authoring* counter-example that **shipped ON at +21%
top-5 action** — it is the success the lesson contrasts against, not a failed release. The two
genuine releases are bullets 2 and 3. A third and fourth refutation live elsewhere and are the
strongest of the four.

| # | mechanism | which racers it freed | on what condition | what broke |
|---|---|---|---|---|
| 1 | **Pack strictness release** (Lesson 178 b2) | the **non-hero pack** — explicitly *not* the cast | strictness-0 while inside its own band | **Fairness.** B2 band-reach leaked to **67–69%** on luger-hill and searound, **Holm 3/4**, via an endgame edge-leak — **92% of leaks after progress 0.90**, freed racers at the band edge shuffling out with no runway left to correct. Shelved, then deleted 2026-07-23. |
| 2 | **Universal band-arrival** (Lesson 178 b3) | **B1-heroes AND the pack** — i.e. the cast included | free inside the assigned band, immediate re-steer on leaving it | **Action.** Fairness *held* (the immediate re-steer did its job) but the field **settled: −6% action.** Less churn, not more. Shelved, then deleted 2026-07-23. |
| 3 | **Assignment-follows-field** (Lesson 181, Evolution Act 1) | every pack racer | target rank reassigned to the live order each tick, so `rankError → 0` by construction | **Both at once.** Band-reach **71.1% → 66.8%** *and* a deadened finale (dead finales and runaways up, lead changes down). Same degeneration by a different route: kill the rank half and only the half-strength, edge-only band term is left. |
| 4 | ★★ **The arrived cast racer's unsteered block** (`ARRIVAL-STEERED-AGAIN-1`, 2026-09-13) | **one cast racer — the held comebacker after arrival** | `if (arrived) strictness = 0` — free anywhere inside his block | **The gap.** Unsteered he opened **3.3× the pre-shape gap at 20 racers** (0.357 against 0.107 canvas widths) and 1.9× at 40. Restoring the steering brought it to 1.7× and 1.1×. The override was **removed**: 22 insertions, 81 deletions. |

Row 4 is the decisive one. It is **the owner's exact proposal, applied to a cast racer, shipped, and
then deliberately taken out nine days ago** — and the reason it came out is gap-opening, which is the
same failure the entire GROUP-GAP-BRAKE-1 thread was fighting and which closed as a dead end today.

**And the related dead ends point the same way.** `docs/DEAD-ENDS.md:146` (band-corridor / free-band,
ACTION-FREEBAND-1/2): *"any post-dice positional force is an opponent force"*, and the dial is a
**cliff, not a slope** (Lesson 184). `docs/DEAD-ENDS.md:71` lists pack release and universal
band-arrival among the mechanisms deleted 2026-07-23 with fingerprints unchanged — the proof they
had never been on a live path.

---

## 3 · SAME, SUBSET, OR DIFFERENT — the answer with addresses

**A SUBSET of #2, and identical to #4.**

- **Against #2 (universal band-arrival):** that mechanism freed *B1-heroes and the pack*. The
  proposal frees the racers at `strictness = isHero ? 1.0` (`racePlanner.js:1374`) — the
  hero-choreographed cast, `r.isHeroChoreographed = plan._heroCurves.has(r.index)` (`:1193`). The
  cast **is** the hero half of #2's population. The proposal is #2 minus the pack. **A subset of a
  refuted mechanism, and the half that was refuted on ACTION rather than on fairness** — which is
  the half the owner cares about, since his interest is front churn.
- **Against #1 (pack strictness release):** *different population* — #1 freed the pack and
  deliberately not the cast. The proposal does the reverse. So #1's fairness failure is **not**
  automatically the proposal's, and it should not be cited as if it were.
- **Against #4:** *the same thing*, one cast racer at a time, already shipped and already removed
  for a measured cost.

★ **Why the subset does not escape the refutation.** #2's failure was *"the field just settled —
less churn"*, and the churn it measured is **top-5 churn** — the front, which is exactly where the
cast racers run and exactly where the proposal would apply. Narrowing #2 to its front half removes
the population whose release was harmless (the pack held fairness) and keeps the population whose
release settles the part of the race the owner watches. #4 then measures that same narrowing
directly, on one racer, and finds it opens the gap 3.3×.

---

## 4 · WHAT THE EVIDENCE DOES *NOT* COVER

Stated so the refutation is not read wider than it is, and **not** as a proposal — what to do next is
the owner's decision, and this block builds nothing.

- Every measurement above frees a racer to **strictness 0**. Nothing here measures an *intermediate*
  strictness for the cast (the pack's 0.5, say) as distinct from 0 or 1. Lesson 184's cliff finding
  makes a middle value unpromising, but it is not the same measurement.
- #4 measured **one** cast racer (the held comebacker) at **20/40/60/100** racers. It did not sweep
  the other cast roles separately.
- None of the four measured the *frequency* question the brief's (b) asks — what share of frames a
  second-place racer is inside his band while the gap grows. **That number is still unmeasured.**
  It would quantify how much slack exists; it would not reopen whether taking it works, which is
  what #2 and #4 already answered.

---

## 5 · WHAT WAS RUN

Nothing that touches the engine. This is a reading of `docs/LESSONS.md` (178, 180, 181, 184),
`docs/DEAD-ENDS.md` (§B:71, §G:146), `reports/evolution/ARRIVAL-STEERED-AGAIN-1.md`, and
`client/src/modules/racePlanner.js` at `:104, :1193, :1234, :1287-1293, :1365-1374, :1391-1423,
:1423-1434` plus `client/src/modules/storage/defaults.js:1041-1042`.

**No fingerprint can have moved: no file was edited.** Confirmed by `git status` on a clean tree.
