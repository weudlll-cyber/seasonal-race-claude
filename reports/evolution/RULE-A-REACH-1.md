# RULE-A-REACH-1 — Rule A covers ONE of the twelve duplicated-fact groups and half of a second, and its live population today is twelve numbers in one file

> **READ-ONLY. Nothing edited.** Every number below was taken by calling the rule's own exported
> functions against the real tree, not read off a report.

---

## 0. THE ANSWER IN FOUR LINES

- **Rule A's DOMAIN is 423 facts** — 20 racer types × the 22 field names it discovers, all scalar.
- **Its LIVE POPULATION is 12** — twelve `frameCount` literals, in one file, all agreeing. The
  copies it was built for were removed **before it was built**.
- **Of the twelve duplicated-fact groups this repository has catalogued, Rule A covers ONE in full
  and ONE by half.** The half it does not cover on that second group is the group's own *source of
  truth*.
- **The uncovered set is BOUNDED within the racer registry and OPEN-ENDED outside it**, and §4 says
  why those are two different answers to what sounds like one question.

---

## 1. WHAT RULE A ACTUALLY DOES, READ FROM THE CODE

It discovers both sides. Nothing in it is a list:

- **The homes:** every `*RacerType.js` under `client/src/modules/racer-types/` → **20 racer types**
  and **22 field names**, all of whose values are scalars: `accentColor, basePeriodMs,
  baseRotationOffset, bodyFillX, bodyFillY, defaultCoatId, displaySize, emoji, fallbackColor,
  frameCount, frameHeight, frameWidth, id, leaderEllipseRx, leaderEllipseRy, leaderRingColor,
  maskUrl, primaryColor, silhouetteScale, speedMultiplier, spriteUrl, tintMode`.
- **The copies:** every `.js/.jsx/.mjs/.cjs` under `client/src/`, `scripts/` and `client/scripts/`,
  excluding tests and the registry itself. For each racer id it finds objects that **name** that
  racer — as a string value (`id: 'horse'`) or as the key it hangs from (`horse: { … }`) — and
  inside the enclosing object literal compares any `field: <scalar literal>` whose field is one of
  the 22.

**So the question Rule A answers is exactly one question:** *does a literal copy of a per-racer
registry scalar, in a JS file in three directories, in an object that names its racer, still agree
with the registry?*

---

## 2. ★ THE LIVE POPULATION IS TWELVE, AND THAT IS THE FIRST THING TO SAY ABOUT IT

Measured by calling `findRegistryCopies` over the same file set the guard walks:

```
total literals discovered: 12
by file:  { "scripts/crop-sprite-sheets.mjs": 12 }
by field: { "frameCount": 12 }
disagreeing: 0
```

**One file. One field. Zero disagreements.**

**Why so few — and this is the important half.** CENSUS-DUPES-1 counted **154** copied values in
group A1 and **60** in group A2, across six copy sites. Every one of them is gone:
`scripts/sim-fairness.mjs`'s `RACER_CONFIGS` and `scripts/parity/goldenRunner.mjs`'s now call
`racerFacts(id)` — they **read** the registry — and `audit-sprite-crops.mjs`'s table was repaired by
SPRITE-AUDIT-DERIVATION-1. **REGISTRY-LITERALS-1 removed the population before Rule A existed.**

**That is not a criticism of the rule; it is the honest description of what it is.** Rule A is a
guard against RECURRENCE over a population that is currently almost empty. It has objected exactly
twice in its life — to `crop-sprite-sheets.mjs`'s pre-crop table, which turned out to be a different
fact under the same name, and to sabotage written to test it.

---

## 3. THE TWELVE GROUPS, AND WHICH ONES RULE A REACHES

CENSUS-DUPES-1 catalogued twelve duplicated-fact groups with a source of truth (A1–A12) and four
without (B1–B4). Against Rule A:

| group | the fact | Rule A? | why |
| --- | --- | --- | --- |
| **A1** | racer physical fields — `displaySize`, `bodyFillX/Y`, `speedMultiplier` | **COVERED** | its exact shape: per-racer registry scalars, named copies |
| **A2** | spritesheet frame geometry | **HALF** | it checks a literal against the REGISTRY. **A2's source of truth is the PNG**, and nothing checks the registry against the artwork — see below |
| A3 | racer `surfaceClasses` | no | **arrays**. Declared blind. Two live copies, 40/40 agreeing, nothing watching |
| A4 | track → `defaultRacerTypeId` | no | home is `server/seeds/tracks/*.json`, keyed by TRACK. Rule A reads only the racer registry and only three client/script directories |
| A5 | track default laps / open-track seconds | no | same |
| A6 | `QUICK_TEST_NAMES` | no | not a registry field |
| A7 | the reference canvas height | no | not a registry field |
| A8 | config values quoted in documents | no | `check-config-claims` owns it |
| A9 | fingerprint values | no | `fingerprint-containment` owns it |
| A10 | fairness criteria in documents | no | `check-doc-facts` owns it |
| A11 | config fallbacks mirroring `defaults.js` | no | the **`??` half of the same guard**, not Rule A |
| A12 | the track count | no | recorded as **unbuildable** |
| B1–B4 | facts with no home at all | no | nothing to compare against |

**★ A2's uncovered half is the sharpest gap and it was demonstrated tonight.** Its source of truth is
`client/public/assets/racers/*.png`, and PRE-CROP-FIELDS-1 established that **no guard declares
`client/public/`, no test reads a spritesheet's bytes, and the render fingerprint cannot blit a
sprite in node.** So the registry's `frameWidth × frameCount === pngWidth` agreement — verified by
hand twice, in CENSUS-DUPES-1 and again tonight — **has never been checked by anything.** Rule A
guards the copies of that fact and not the fact.

---

## 4. IS THE UNCOVERED SET SMALL AND BOUNDED, OR OPEN-ENDED? — BOTH, AND THE DIFFERENCE MATTERS

**Inside the racer registry: BOUNDED AND COUNTABLE.** 20 types × 22 fields = **423 facts**, every one
a scalar, every one discoverable by the same code that discovers them today. Rule A covers all 423
wherever they appear as a named literal in three directories. What it misses there is a short,
enumerable list of SHAPES, not of facts:

1. **A copy that renames its fields** — and there is now a deliberate example, `preCropFrameWidth`,
   put there by PRE-CROP-FIELDS-1 to create the distinction R18 requires. **The rename is both the
   fix and the blind spot**, and the guard's `blind` array says so.
2. **A table keyed by array position**, naming no racer.
3. **A copy in a non-JS file** — a JSON fixture, a seed, a snapshot.
4. **A copy outside `client/src/`, `scripts/`, `client/scripts/`** — nothing under `server/`,
   `shared/` or `client/e2e/` is scanned.
5. **A computed copy** — `displaySize * 2` is not a literal.
6. **A copy whose type differs**, skipped on purpose so a display fallback is not read as a mirror.

**Outside the racer registry: OPEN-ENDED, and not by an oversight.** The uncovered set is "every
duplicated fact whose home is not the racer registry", and **nothing enumerates the homes.** The
twelve groups were found BY HAND by CENSUS-DUPES-1, which declared its own limits in as many words.
To bound this set you would first have to enumerate every machine-readable home in the repository —
and that is the same judgement PATTERN-CATCHABILITY-1 concluded a machine cannot make.

**So the honest footnote to "four of six subtypes are catchable":** the four are catchable *as
subtypes*. Rule A is one rule against one home. **Treating the class as closed because two rules were
built would be reading a rule's existence as coverage** — and the numbers here say what the coverage
is: one group of twelve, plus half of a second, over a live population of twelve numbers.

---

## Limits

**This measures REACH, not correctness.** Rule A works: it went red at its founding instance
(21 disagreements on the 2026-06-03 tree), it gates now, and it is proved to fail by sabotage in both
directions. Nothing here questions that.

**The group catalogue is CENSUS-DUPES-1's and is a hand census.** Its own limits section says a
grep-based census cannot see everything. **If a thirteenth group exists, Rule A almost certainly does
not cover it either** — but I did not go looking for one, and this report should not be read as
saying there are twelve.

**"423 facts" counts what the registry HOLDS, not what is worth copying.** `emoji` and `spriteUrl`
are in that number and nobody would duplicate them. The figure bounds the domain; it does not measure
exposure.
