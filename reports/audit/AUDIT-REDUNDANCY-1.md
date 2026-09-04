# AUDIT-REDUNDANCY-1 — the 27 disagreements are 0, duplicated logic is 0.37%, and one stale copy nobody had checked

**Measured 2026-09-04 on master `c515f4a5`.** Piece 3 of THE FULL AUDIT. Read-only except where a
finding is named; **nothing was refactored** — that is behaviour and it is his.

> **VERDICT ON THIS AXIS: CLEAN, with one finding to hand him.**
>
> **DUPLICATED FACTS:** the census's **27 disagreements are 0**, across 406 mirrored fallbacks, 455
> files searched for registry literals, 20 sheets and 69 citations. **Every group that had a guard
> still has one and every one of them reads zero.**
>
> **DUPLICATED LOGIC — an axis nobody had measured:** **279 normalised lines, 0.37% of the corpus, in
> 6 groups, ALL OF THEM IN `scripts/`.** **Zero in `client/src`. Zero in `server/src`.** The product
> code has no copy-pasted logic at 25 lines or more.
>
> ★ **THE ONE FINDING: `server/src/routes/tracks.js` carries a literal copy of all ten tracks —
> 85 values, 24 of them stale, 28%** — including `garden-path → snail` when the seed says `beetle`,
> **the exact staleness repaired in the fingerprint instrument two days ago.** It is **INERT today**,
> proved below, and it is **REPORTED AND NOT TOUCHED** because it is on the race path. §3.

---

## 1. THE FACT GROUPS, RE-VERIFIED

`CENSUS-DUPES-1` (2026-09-02) catalogued **16 groups** — 12 with a source of truth, 4 without — over
**503 values, 483 comparable, 456 agreeing, 27 disagreeing.** Today:

| group | state today | guarded by |
| --- | --- | --- |
| **A1** racer physical fields | **0 literals in 455 files** | Rule A |
| **A2** spritesheet frame geometry | **20 sheets, 0 disagree** | Rule D |
| **A3** racer `surfaceClasses` | **UNGUARDED** — arrays, and Rule A is scalars-only by its own words | — |
| **A4** track → `defaultRacerTypeId` | ★ **1 live literal copy, 24/85 stale** — §3 | — |
| **A5** track laps / open seconds | read from the seed files | — |
| **A6** `QUICK_TEST_NAMES` | **1 definition, 9 importers, 0 copies** | by construction |
| **A7** reference canvas height (720) | one deliberate duplicate, **asserted equal by a test** | `autoSpriteScale.test.js` |
| **A8** config values in documents | **170 keys, 0 current claims** | `check-config-claims` |
| **A9** fingerprint values | 0 copies by construction | `fingerprint-containment` |
| **A10** fairness criteria in documents | 0 restated | `check-doc-facts` |
| **A11** config fallbacks mirroring defaults | **406 mirrors, 400 by reference, 0 disagree** | Rule F / fallback-agreement |
| **A12** the track count | **discovered, never stated** — no literal `10` acts as a track count anywhere in the product | by construction |

**The five files that held all 27 disagreements still exist** — `audit-sprite-crops.mjs` (21),
`sweep-bufferPct-driver.mjs` (2), `fingerprint-default.mjs` (1), `goldenRunner.mjs` (1),
`ARCHITECTURE.md` (2) — **and none of them disagrees any more.** They were repaired rather than
deleted, which is the better outcome: the copies that had a reason to exist kept it and learned to
read the home.

### The four groups with no source of truth (B1–B4)

| | today |
| --- | --- |
| **B1** `bodyFillX`/`bodyFillY` have a home but no derivation | unchanged — a home exists, the *derivation* does not. Not a duplication defect |
| **B2** `AUDIT_RENDERED_BODY_H` | now lives **only in a test** and in reports. Its 20 numbers are no longer duplicated into an instrument |
| **B3** `surfaceClasses` in `goldenRunner.mjs` | **gone from the code** — survives only in report prose |
| **B4** the "old default duration" column | **gone from the code** — survives only in report prose |

**Two of the four homeless groups have left the tree entirely.** Neither was removed by this audit;
both went during the three weeks of consequence work.

---

## 2. ★ WHAT RULE A COVERS, AND WHAT THE OTHER ELEVEN WOULD NEED

`RULE-A-REACH-1` established that Rule A covers **one of the twelve groups in full and one by half**.
That is unchanged. Its **domain** is 423 facts (20 racer types × 22 discovered fields, all scalar);
its **live population is 12** `frameCount` literals in one file, all agreeing — the copies it was
built for were removed before it was built.

**What each remaining group would need to be machine-checkable:**

| group | what a rule would need |
| --- | --- |
| **A3** `surfaceClasses` | Rule A to compare **arrays structurally**, not just scalars. Its own declaration says this is out of reach; it is one predicate, and the reason it has not been done is that the class has never disagreed |
| **A4** track table | a rule that resolves a **literal object array against the seed JSON by id** — this audit wrote one as a throwaway (§3) and it found 24 disagreements in a minute |
| **A5** laps / seconds | subsumed by A4's rule |
| **A7** canvas height | **already covered by a test**, which is the right shape for a two-site duplicate |
| **A8 / A9 / A10 / A11** | **already guarded**, all reading zero |
| **A12** track count | **not needed** — nothing states it |
| **A1 / A2** | **already guarded** by Rule A and Rule D |
| **B1** | not a duplication rule at all; it wants a derivation that does not exist |
| **B2 / B3 / B4** | **moot** — the copies are gone |

**So of the twelve: eight are guarded and read zero, one is covered by a test, one needs nothing, and
TWO ARE UNGUARDED — A3 and A4.** A3 has never disagreed. **A4 disagrees 24 times.**

---

## 3. ★ THE FINDING — A LITERAL COPY OF ALL TEN TRACKS, 28% STALE

`server/src/routes/tracks.js:61` exports `DEFAULT_TRACK_SEEDS`: ten objects carrying `name`, `icon`,
`description`, `color`, `defaultRacerTypeId`, `defaultLaps`, `defaultWinners`, `difficulty`,
`surfaceClasses` and `trackLights`. The source of truth is `server/seeds/tracks/*.json`.

**85 comparable values. 24 disagree.** The ones that matter:

| | code says | the seed says |
| --- | --- | --- |
| `garden-path.defaultRacerTypeId` | **`snail`** | **`beetle`** |
| `garden-path.defaultLaps` | **4** | **2** |
| `garden-path.surfaceClasses` | `["grass","earth"]` | `["grass","earth","mud","sand"]` |
| `city-circuit.defaultRacerTypeId` | **`buggy`** | **`motorbike`** |
| `ice-track.defaultRacerTypeId` | **`horse`** | **`snowmobile`** |
| `ice-track.surfaceClasses` | `["ice","snow"]` | `["snow","ice","air"]` |
| `seatrack` / `searound` | icon, colour, description | all differ |
| six tracks | `difficulty` | **absent from the seed** |

★ **`garden-path → snail` is the exact pairing `FINGERPRINT-TRACK-DEFAULTS-1` repaired on
2026-09-02**, when the world fingerprint was found racing a snail on a track the product runs with a
beetle. **The same staleness had a second home, and that repair did not reach it.** `city-circuit →
buggy` is older still — the seed has said `motorbike` since 2026-06-30.

### IT IS INERT TODAY, AND THAT WAS PROVED, NOT ASSUMED

`DEFAULT_TRACK_SEEDS` has exactly three readers: two lookup maps in the same file, and
`tracks.test.js`. The maps feed two startup migrations:

```js
function migrateTrackSurfaceClasses() {   // patches a stored track that LACKS surfaceClasses
  if (Array.isArray(track.surfaceClasses)) continue;
```

**All ten seed files carry both `surfaceClasses` and `trackLights`** (measured), and
`migrateDefaultTracks()` delivers the seed FILES into the data directory **before** `loadAllTracks()`
builds the map. So every default track already has both fields and **both migrations `continue` for
all ten.** For a user-created custom track the id is not in the map at all and the `??` fallback
takes over.

**So the 24 stale values reach nothing today.** What they are is a **loaded gun**: the two migrations
exist precisely to repair a track that lacks the field, and if one ever does — a hand-edited record,
a partial restore, a future seed that omits it — the server writes the stale value to disk and
`surfaceClasses` decides which racer types may run that track.

**REPORTED AND NOT TOUCHED**, under constraint 1: `defaultRacerTypeId` and `surfaceClasses` are on
the race path, and re-pointing this constant at the seeds changes server startup. **It is his.**

---

## 4. ★ CODE-LEVEL DUPLICATION — THE AXIS NOBODY HAD MEASURED

**Method:** every tracked `.js/.jsx/.mjs` normalised — comments stripped, string literals blanked,
whitespace collapsed — then every window of N consecutive lines hashed, matched, and greedily
extended. **502 files, 74,569 normalised lines**, tests excluded.

| at ≥25 lines | |
| --- | ---: |
| clone groups | 34 |
| duplicated normalised lines | 7,844 (10.52%) |
| **…of which DATA TABLES** (literal lists) | **7,565 — 96%** |
| **…of which DUPLICATED LOGIC** | **279 lines, 6 groups — 0.37%** |

**The 10.52% headline is not a defect and would be a lie to quote alone.** It is dominated by
`recordingContext.js`'s canvas-API name arrays and by coat palettes — lists of strings, where a
sliding window over identical-shaped lines matches itself. Separating them is the whole measurement.

### The six duplicated-logic groups — every one in `scripts/`

| lines × copies | where |
| --- | --- |
| **60 × 2** | `exp-gs-confirm-gate.mjs` / `exp-rebaseline-150.mjs` |
| **41 × 2** | `diag/runin-contender-guarantee-run.mjs` / `diag/runin-level-set-run.mjs` |
| **40 × 2** | `diag/late-lead-hunt-run.mjs` / `diag/level-set-built-run.mjs` |
| **35 × 2** | `exp-gate-retune.mjs` / `exp-speed-candidates.mjs` |
| **28 × 2** | `exp-gs-confirm-gate.mjs` / `exp-gs-honest-150.mjs` |
| **25 × 4** | the four `diag/*-run.mjs` shard runners |

**The four `diag/*-run.mjs` shard runners are 105 lines each and share 63 normalised lines — 60% of
each file.** They are the same program: parse `--phase`/`--out`, build a cell list, spawn a pool
sized to `cpus()`, collect exit codes. That is the largest genuine duplication in the repository.

**At ≥12 lines** the logic figure rises to **1,369 lines in 50 groups (1.84%)**, and the product-code
entries that appear are the **20 `*RacerType.js` constructors** — a deliberate registry family whose
*values* Rule A already guards — and coat tables. **Still no duplicated logic in `client/src` or
`server/src` that is not a declared pattern.**

**Nothing was refactored.** The diag runners are throwaway instruments; extracting a shared pool
helper is a judgement about whether they are worth maintaining, and that is his.

---

## 5. WHAT THIS PIECE DOES NOT COVER

- **The clone detector is a TEXT method.** It finds copy-paste. It **cannot** find two functions that
  do one job by different means — the other half of the brief's question — and nothing here measures
  that. The reading in §4 is all that was done for it, and it is not a count.
- **Tests were excluded** from the clone corpus. 312 test files and 81,032 lines are unmeasured for
  duplication; test duplication is also a different judgement, since a test that repeats a setup is
  often clearer than one that hides it.
- **The 16 groups come from `CENSUS-DUPES-1`, which found them BY HAND** and declared its own limits.
  **Nothing enumerates the homes**, so a seventeenth group nobody has thought of would not appear
  here. §3 is a case in point: A4 was a known group, but the *literal in `tracks.js`* was not among
  its listed copy sites.
- **A3 was not exercised.** It is unguarded and has never disagreed; that is a fact about its history,
  not a proof about today.
