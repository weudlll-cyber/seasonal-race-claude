# GUARDS-FIRE-1 — 8 of 9 rules added since the census CAN FIRE, proven one at a time; the ninth could not be sabotaged safely and has field evidence instead

> **The census found 12 of 40 older guards never exercised and exactly 1 inert.** This applies that
> test to the new ones **before they become old ones**.
>
> **Every sabotage was run against the real tree and reverted. `git status --porcelain` is empty.**
>
> ★ **TWO OF MY OWN SABOTAGES WERE WRONG, and both would have reported a working rule as inert.**
> §3 — which is the finding that matters more than the tally.

---

## 1. THE TALLY

| rule | added | verdict | what the sabotage was |
| --- | --- | --- | --- |
| **Rule A** — a literal mirroring the racer registry | 09-02 | **CAN FIRE** | a table with `{ id: 'beetle', displaySize: 999 }` → *"displaySize = 999 for 'beetle', registry says 38"* |
| **Rule B** — a branch at origin whose tree master holds | 09-02 | **CAN FIRE** | six tests in its own suite, including the false positive that shipped and the Lesson-187 empty-list case |
| **Rule C** — a control's bounds must contain its shipped value | 09-03 | **CAN FIRE** | `max: 0.6 → 0.4` under a shipped 0.6 |
| **Rule D** — registry geometry vs the PNG's IHDR | 09-03 | **CAN FIRE** | `frameWidth 128 → 129` → *"beetle: registry says 129x128 x8 = a 1032x128 sheet, but beetle.png is 1024x128"* |
| **Rule E** — a stated range must equal the control's bounds | 09-03 | **CAN FIRE** | the label says `(0.25–0.70)`, the bounds are `[0.25, 0.6]` |
| **Rule F (bare)** — a symbol its file does not contain | 09-03 | **CAN FIRE** | `governorPhaseWeight → governorPhaseWeightZZ` |
| **Rule F (paired)** — the symbol must be AT the linked lines | 09-04 | **CAN FIRE** | **the href alone** moved `#L46-L55 → #L200-L210`, text untouched → *1 disagree* |
| **the artwork digest** (racers + backgrounds) | 09-03 / 09-04 | **CAN FIRE** | a byte appended to `space-sprint.jpg`; a record entry renamed |
| **the camera gate** — every track must contribute FINISHED frames | 09-03 | **COULD NOT BE SABOTAGED SAFELY** | §2 |

**8 CAN FIRE. 0 CANNOT FIRE AS WRITTEN. 1 not safely sabotageable.**

---

## 2. THE ONE THAT COULD NOT BE SABOTAGED, AND WHAT STANDS INSTEAD

`camera-fingerprint`'s tightened gate fails when **any** of the ten tracks contributes no finished
frames. To induce that, a track's race must stop finishing — which means **changing the engine, the
harness's 200 s ceiling, or a track's own lap count.** Every one of those is a change to what the
instrument measures, so the sabotage would prove something about a different tree.

**What stands instead is field evidence, not an argument.** CAMERA-GATE-1 measured the tightened
condition against **twelve daily tips before shipping it**: it would have gone **red on 5 of the 12,
and 0 of those 5 were without cause.** A rule that would have fired five times in twelve days is
demonstrably capable of firing.

**It is classified honestly rather than counted as proven.** The distinction is the census's own.

---

## 3. ★ TWO OF MY SABOTAGES WERE WRONG, AND THAT IS THE REAL FINDING

The first pass ran seven sabotages in a batch and reported **two DID NOT FIRE** — Rule A and Rule F
(paired). **Both rules were fine. Both sabotages were broken:**

- **Rule A**: the sabotage added a *comment line* to a registry file. Rule A looks for a **literal
  copying a registry field and disagreeing**. Nothing was copied, so nothing could disagree — the
  rule correctly said nothing, and my harness called that inert.
- **Rule F (paired)**: the sabotage edited the **first** `raceStep.js#L46-L55` in the file by string
  replacement, and the first occurrence was not the paired link I meant. The rule never saw the
  fault I thought I had planted.

**A guard is only as good as the sabotage that tests it, and a sabotage is a piece of code with its
own bugs.** Had this batch been trusted, two working rules would have been reported inert — and the
likely next step is *"fix"* a rule that was never broken.

**This is the same shape as A6's wiring test**, which passed a sabotage that had reverted the
feature: **the check that verifies a check needs verifying too**, and the only way in is to read the
output rather than the exit code. Both were caught by reading what the guard actually printed.

---

## 4. THE TREE IS BYTE-IDENTICAL

Every sabotage restored its file from an in-memory copy taken immediately before, and the two
hand-run ones from a backup. After all of them:

```
git status --porcelain   →   (empty)
```

One sabotage created a file (`client/src/modules/_sabotageRuleA.js`); it was deleted and the guard
re-run to confirm the count returned to `0 registry literal(s) in 452 file(s)`.

---

## Limits

**"CAN FIRE" means "fired once, on a fault I chose".** It is not a claim about coverage. Rule D fires
on a geometry mismatch and is blind to a repaint; Rule F sees only citations that opted in; the
digest cannot tell a wanted change from an unwanted one. **Each rule's own blind list says what it
does not see, and this report does not restate those.**

**Rule B was accepted on its test suite rather than a live sabotage.** Sabotaging it means pushing a
throwaway branch to origin — an outward action on a shared remote — and its six tests include the
exact false positive that shipped and the empty-list Lesson-187 case, which is stronger evidence than
one induced failure would be.

**Nine rules, not nine guards.** They live in four scripts. A guard can be perfectly capable of firing
and still never run if routing excludes it — that is a different question, and `verify`'s own
`--declare`/`dirs` mechanism is what answers it.
