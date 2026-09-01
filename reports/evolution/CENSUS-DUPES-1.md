# CENSUS-DUPES-1 — every fact this repository stores in more than one place

**Read-only census. Nothing was edited, nothing was fixed, no branch was touched.** Run on
`feat/aim-levers-1` at `2c2f5ba9`, 2026-09-02. Part of the NIGHT-CENSUS-1 chain, which counts and
does not repair.

## Headline

| | |
|---|---|
| **Groups** | **16** — a group is one fact-set that exists in more than one place |
| **Copy sites enumerated** | **24**, across **16 distinct files** (a file can carry copies from several groups) |
| **Individual values enumerated** | **503** |
| **…of which comparable to a source** | **483** |
| **AGREE** | **456** |
| **DISAGREE** | **27** |
| **Groups WITH a source of truth in the repository** | **12** |
| **Groups WITH NONE** | **4** |
| **Groups already covered by a working guard** | **5** (A7–A11) |
| **Groups with a guard that exists only in a comment** | **1** (A1) |

The 27 disagreements sit in five files: `scripts/audit-sprite-crops.mjs` (21),
`client/scripts/sweep-bufferPct-driver.mjs` (2), `scripts/fingerprint-default.mjs` (1),
`scripts/parity/goldenRunner.mjs` (1), and `docs/ARCHITECTURE.md` (2).

**The brief said four files copy the racer registry. It is five.** `scripts/audit-sprite-crops.mjs`
carries a sixth table of 20 racer types and is the single largest source of disagreement in the
census. It was missed by every previous pass because it spells the field `displaySize:` inside an
array of objects rather than in a `RACER_CONFIGS` map, and because the earlier searches were capped.

---

## A. Groups that HAVE a single source of truth

### A1 — Racer physical fields (`displaySize`, `bodyFillX`, `bodyFillY`, `speedMultiplier`)

**Source of truth:** `client/src/modules/racer-types/*RacerType.js` — 20 files, one per type.
**Guard: NONE.** See "Broken things left alone", items 1 and 2.

| # | copy site | values | agree | disagree | introduced |
|---|---|---|---|---|---|
| 1 | `scripts/sim-fairness.mjs:960-1101` (`RACER_CONFIGS`, 20 types x 4) | 80 | 80 | 0 | file born `576bfd27` **2026-05-17**; `bodyFill*` added `7ea80484` **2026-06-04** |
| 2 | `scripts/parity/goldenRunner.mjs:130-201` (`RACER_CONFIGS`, 10 types x 4) | 40 | 40 | 0 | file born `d9947c08` **2026-07-24**; five rows corrected `de99f690` **2026-09-01** |
| 3 | `scripts/diag/acceptance-orders.mjs:82-85` (manta constants) | 4 | 4 | 0 | `9e41c2bd` **2026-07-24** |
| 4 | `scripts/diag/micro-divergence.mjs:104-107` (manta constants) | 4 | 4 | 0 | `2c72fe6e` **2026-07-23** |
| 5 | `client/src/modules/headlessRaceSimulator.test.js:45-50, 156-161` (horse, rocket) | 6 | 6 | 0 | `0b843b18` **2026-06-10** |
| 6 | **`scripts/audit-sprite-crops.mjs:23-184`** (20 types x `displaySize`) | 20 | 15 | **5** | `11093fff` **2026-06-03** |
| | **totals** | **154** | **149** | **5** | |

**The five disagreements, all in copy 6** — `file:line` is the `displaySize:` line inside the entry:

| type | entry at | audit-sprite-crops | registry | since |
|---|---|---|---|---|
| horse | `scripts/audit-sprite-crops.mjs:30` | **40** | **47** | 2026-06-03 |
| snake | `:70` | **36** | **44** | 2026-06-03 |
| rocket | `:94` | **40** | **47** | 2026-06-03 |
| motorbike | `:110` | **36** | **42** | 2026-06-03 |
| luge | `:126` | **40** | **80** | 2026-06-03 |

**When it diverged: it never agreed.** `git log --diff-filter=A -- scripts/audit-sprite-crops.mjs`
gives `11093fff` (2026-06-03, *"merge feat/sprite-crop — tight-crop 12 spritesheets, restore display
sizes"*). `git show 11093fff:scripts/audit-sprite-crops.mjs` has `horse … displaySize: 40`;
`git show 11093fff:client/src/modules/racer-types/HorseRacerType.js` has `displaySize: 47` — in the
same commit. The table records the **input** to the crop; the registry records its **output**. Nothing
has refreshed it in the 91 days since.

**On copies 1–5 the agreement is real but recent and unwatched.** Copy 2 disagreed on five of ten
entries — snail, motorbike, duck, luge, boarder — from `d9947c08` (2026-07-24) until `de99f690`
(2026-09-01), i.e. **39 days**, diagnosed by SPRITE-TABLE-DRIFT-1 (`a88127bb`, 2026-09-01) and
corrected the same day. Nothing prevents it recurring.

---

### A2 — Spritesheet frame geometry (`frameWidth`, `frameHeight`, `frameCount`)

**Source of truth:** the PNG files themselves, `client/public/assets/racers/*.png`. This is the only
group in the census whose truth is a binary asset rather than a source line.
**Guard: NONE.** Verified by hand, reading the IHDR header of each sheet.

| # | copy site | values | agree | disagree |
|---|---|---|---|---|
| 1 | `client/src/modules/racer-types/*RacerType.js` (20 files x 3) | 60 | **60** | 0 |
| 2 | `scripts/audit-sprite-crops.mjs:23-184` (20 entries x 3) | 60 | 44 | **16** |
| | **totals** | **120** | **104** | **16** |

Registry consistency test used: `frameHeight === pngHeight` and `frameWidth x frameCount === pngWidth`.
**20 of 20 pass.** The eight failing rows in copy 2:

| type | entry at | audit says (fw/fh) | PNG is | registry says |
|---|---|---|---|---|
| horse | `:27-28` | 128 / 128 | 1200x150 | 150 / 150 |
| giraffe | `:59-60` | 128 / 128 | 1032x129 | 129 / 129 |
| snake | `:67-68` | 128 / 128 | 1240x155 | 155 / 155 |
| rocket | `:91-92` | 128 / 128 | 1208x151 | 151 / 151 |
| motorbike | `:107-108` | 128 / 128 | 1200x150 | 150 / 150 |
| luge | `:123-124` | 64 / 64 | 2048x128 | 128 / 128 |
| koi | `:147-148` | 565 / 565 | 4096x256 | 256 / 256 |
| snowmobile | `:179-180` | 192 / 192 | 2368x148 | 148 / 148 |

**Consequence, stated because it is not obvious:** this tool slices each sheet into columns of
`frameWidth`. Run today it would cut a 150-px-tall horse sheet into 128-px squares and report a fill
ratio for a window that is not a frame. **It is a measuring instrument that would give a wrong
answer, and its numbers are what `bodyFillX/Y` were originally derived from.** Introduced and
diverged: `11093fff`, **2026-06-03**, same commit, same reason as A1 copy 6.

---

### A3 — Racer `surfaceClasses`

**Source of truth:** the registry. **Guard: NONE.**

| # | copy site | values | agree | disagree | introduced |
|---|---|---|---|---|---|
| 1 | `scripts/sim-fairness.mjs:960-1101` (20 arrays) | 20 | 20 | 0 | `576bfd27` **2026-05-17** |
| 2 | `scripts/exp-roster-matrix.mjs:44-65` (`SURFACES`, 20 arrays) | 20 | 20 | 0 | `40424510` **2026-07-30** |

Both compared element-by-element and in order: **40/40 identical.** Copy 2's own header comment,
`scripts/exp-roster-matrix.mjs:43`, names `racer-types/*.js` as the source — an accurate provenance
note with nothing enforcing it.

`scripts/parity/goldenRunner.mjs` also has a field called `surfaceClasses` and it is **deliberately a
different fact** (one track-tag per type), documented at `goldenRunner.mjs:126-128`, never read. It is
counted in group **B3**, not here.

---

### A4 — Track to `defaultRacerTypeId`

**Source of truth:** `server/seeds/tracks/*.json`. `server/data/**` is a gitignored runtime dir and is
not a source. **Guard: partial** — `scripts/track-defaults.test.mjs` asserts the *seed files'* own
contents; nothing compares any of the six other copies to them.

| # | copy site | pairs | agree | disagree | introduced |
|---|---|---|---|---|---|
| 1 | `scripts/fingerprint-default.mjs:150-161` | 10 | 9 | **1** | `2a650ef6` **2026-07-13** |
| 2 | `scripts/parity/goldenRunner.mjs:90-101` (`TRACKS`) | 10 | 9 | **1** | `d9947c08` **2026-07-24** |
| 3 | `client/scripts/sweep-bufferPct-driver.mjs:26-37` (`ALL_TRACKS`) | 10 | 8 | **2** | `ec06b92e` **2026-07-07** |
| 4 | `scripts/exp-fairness-recheck.mjs:40-45` | 4 | 4 | 0 | `e61ef615` **2026-07-31** |
| 5 | `scripts/exp-flapping-gate.mjs:29-34` | 4 | 4 | 0 | `d0870326` **2026-07-31** |
| 6 | `docs/ARCHITECTURE.md:436-445` (table, "default type" column) | 10 | 9 | **1** | `09727abd` **2026-08-06** |
| 7 | `scripts/track-defaults.test.mjs:53, 110-125` — **this one is the guard** | 10 | 10 | 0 | `d73ec6a9` **2026-08-25** |
| | **totals** | **58** | **53** | **5** | |

**The five disagreements, and exactly when each diverged:**

| line | says | seed says | diverged at |
|---|---|---|---|
| `scripts/fingerprint-default.mjs:153` | `["garden-path", "snail"]` | `beetle` | `d73ec6a9` **2026-08-25** |
| `scripts/parity/goldenRunner.mjs:93` | `["garden-path", "snail"]` | `beetle` | `d73ec6a9` **2026-08-25** |
| `client/scripts/sweep-bufferPct-driver.mjs:30` | `{ id: 'garden-path', racer: 'snail' }` | `beetle` | `d73ec6a9` **2026-08-25** |
| `docs/ARCHITECTURE.md:438` | `garden-path … snail` | `beetle` | `d73ec6a9` **2026-08-25** |
| `client/scripts/sweep-bufferPct-driver.mjs:31` | `{ id: 'city-circuit', racer: 'buggy' }` | `motorbike` | **born wrong** — see below |

**The garden-path four have one divergence event and one date.** `d73ec6a9` (2026-08-25,
GARDEN-PATH-DEFAULTS-1) moved `server/seeds/tracks/garden-path.json` and moved nothing else. All four
copies pre-date it and none followed. **8 days stale as of this census.** It is already partly known —
`docs/BACKLOG.md:90` records that garden-path showed a snail for three weeks after the repo said
beetle, and `reports/evolution/INDEX.md:720` names `fingerprint-default.mjs` specifically — but the
two other code copies and the ARCHITECTURE.md row are not on that list.

**The city-circuit one is older and has never been noticed.** `git log -p -- server/seeds/tracks/city-circuit.json`
shows `1b3260e5` (**2026-06-30**) changed `"defaultRacerTypeId"` from `buggy` to `motorbike`.
`client/scripts/sweep-bufferPct-driver.mjs` was created a week later, `ec06b92e` (**2026-07-07**),
carrying `buggy` — so this copy was **born disagreeing, 64 days ago**, under a header comment at
`sweep-bufferPct-driver.mjs:25` that claims the values come from the seed files. **The claim of
provenance is the thing that made it look checked.** This is the same shape as the goldenRunner
comment that cost two blocks.

---

### A5 — Track default lap count / open-track seconds

**Source of truth:** `server/seeds/tracks/*.json`, read through `trackDefaultLaps()`.
**Guard: partial** — `scripts/track-defaults.test.mjs:58-70, 110-118` asserts the seeds; the doc copy
is unguarded, because `check-config-claims.mjs` scans only keys owned by `defaults.js` and per-track
values are not among them.

| # | copy site | values | agree | disagree |
|---|---|---|---|---|
| 1 | `docs/ARCHITECTURE.md:436-445`, "new default" column | 10 | 9 | **1** |

`docs/ARCHITECTURE.md:438` states a duration and a lap count for garden-path that the seed no longer
carries. Introduced `09727abd` (**2026-08-06**), diverged `d73ec6a9` (**2026-08-25**), same event as A4.

---

### A6 — `QUICK_TEST_NAMES` (the racer roster)

**Source of truth:** `client/src/modules/racerNames.js:39-110` (70 entries).
**Guard: NONE.** This matters more than it looks: `client/src/modules/raceBehavior.js:219-229`
(`stablePairBit`) hashes the racer's name, so **a racer's name is a physics input** — a copy that
drifted would silently change which racer wins in a harness.

| # | copy site | values | agree | disagree | introduced |
|---|---|---|---|---|---|
| 1 | `scripts/diag/acceptance-orders.mjs:32-73` (`NAMES`, 40) | 40 | 40 | 0 | `9e41c2bd` **2026-07-24** |
| 2 | `scripts/diag/micro-divergence.mjs:52-93` (`NAMES`, 40) | 40 | 40 | 0 | `2c72fe6e` **2026-07-23** |

Both compared index-by-index against the first 40 of `QUICK_TEST_NAMES`: **identical.** Note the
asymmetry — `scripts/parity/goldenRunner.mjs:85` imports the real module; these two do not, and
`acceptance-orders.mjs:3` claims the names are the browser's in racer-index order without importing
them. `shared/nameLimits.mjs:14` cites this exact duplication as the project's worked example of a
silent-divergence bug waiting for one side to be edited.

---

### A7 — The reference canvas height — **the model case**

**Source of truth:** `client/src/modules/camera/projection.js:38`.
**Copy:** `client/src/modules/autoSpriteScale.js:63`. **1 value, agrees.**
**GUARDED:** `client/src/modules/autoSpriteScale.test.js:342-352` imports both and asserts equality.

`autoSpriteScale.js:46-62` states in full why the duplication cannot be removed (importing from
`camera/` would pull the projection module into the engine-reach closure and breach the one-way rule
of `docs/CAMERA_DIRECTOR.md` section 1) and why a guard is the answer instead. **This is what every
group above should look like and does not.**

---

### A8 — Config values quoted in documents — **guarded, 0 copies by construction**

SOT `client/src/modules/storage/defaults.js`; guard `scripts/check-config-claims.mjs`
(`dirs: ["docs/","reports/"]`). It fails on **any** stated value, not just a wrong one, so the count
of live copies is zero by design. Declared blind: a value stated far from its key; a value in a shape
the narrow rule misses; keys whose names are ordinary English words (skipped by name, nothing checks
them); config objects other than the camera one.

### A9 — Fingerprint values — **guarded, 0 copies by construction**

SOT `docs/fingerprints.json`; guard `scripts/check-fingerprints.mjs`, `GUARD.everything: true`.
Declared blind: whether the record is itself right; superseded values quoted as history.

### A10 — Fairness criteria in documents — **one of five guarded**

SOT `docs/FAIRNESS.md`. `scripts/check-doc-facts.mjs` reads the band-reach threshold from FAIRNESS.md
itself and enforces it across `docs/`. Its own declaration names what is **not** covered:
Holm-unfairness, the parade cap, the runaway cap and the duration sanity rule are all restated in
several documents and are NOT covered. Four criteria, several documents each, unguarded and declared
so. This census did not enumerate them; that would be its own count.

### A11 — Config fallbacks mirroring `defaults.js`

SOT `defaults.js`; guard `scripts/check-fallback-agreement.mjs`, scoped `dirs: ["client/src/"]`.
Catches a fallback literal disagreeing with the default it mirrors. **Not covered:** object and
array-literal fallbacks (declared), and **everything under `scripts/`** — which is where
`scripts/sim-fairness.mjs:1145-1146` sits with `bodyFillX`/`bodyFillY` parameter defaults that no
racer type carries. See "Broken things left alone" item 6 for the stale part of this guard's own
declaration.

### A12 — The track count

SOT `server/seeds/tracks/` (count the files). Restated in roughly ten documents.
**Deliberately unguarded**, and this is a *sound* decision rather than a hole:
`scripts/check-doc-facts.mjs:17-40` records two rounds of evidence that the check is **UNBUILDABLE** —
"all four tracks" and "all 10 tracks" are the same construction and only prior knowledge of the total
separates them, so the guard is silent when useless and noisy exactly when it matters. Recorded here
so a later reader does not "fix" it.

---

## B. Groups with NO source of truth — the worse problem

### B1 — `bodyFillX` / `bodyFillY` have a home but no derivation

The values live in one place (the registry) and are described everywhere — `sim-fairness.mjs:958`,
`docs/BACKLOG.md:3604` — as measured from the spritesheet. **Nothing in the repository can produce
them.** The only measuring tool is `scripts/audit-sprite-crops.mjs`, and per group A2 it is
configured with wrong frame geometry for 8 of 20 types, so re-running it would not reproduce a single
one of the values it is credited with. If a spritesheet is replaced tomorrow there is **no runnable
procedure in this repository that yields the correct `bodyFillX`.** The fact's home is a written-down
number whose origin no longer exists in executable form. **Undatable** as to when the derivation
broke — the tool never worked after `11093fff`, and there is no record of it being run since.

### B2 — `AUDIT_RENDERED_BODY_H` — 20 numbers whose stated source cannot produce them

`client/src/modules/racer-types/racer-types.integration.test.js:203-222`, introduced `7ea80484`
(**2026-06-04**). Twenty pinned values whose comment credits `scripts/audit-sprite-crops.mjs`,
measured post-crop. All 20 equal `displaySize x bodyFillY` from the registry (checked by hand for
horse, duck and luge), so the test is in truth a restatement of the registry, and it is *guarded by
being an assertion* — it turns red if the registry moves. **But its declared provenance is false**:
the script named would today produce different numbers for 8 of the 20. A reader asked to update this
table has no correct place to look.

### B3 — `surfaceClasses` in `goldenRunner.mjs` — a fact with no home and no reader

`scripts/parity/goldenRunner.mjs:130-201`, 10 values. Six of the ten differ from the registry field of
the same name; the file documents at `:126-128` that this is deliberate and that the field is never
read. Grep confirms: no consumer. **No other file in the tree holds this mapping**, so there is
nothing to compare it to and nothing to keep it right. Introduced `d9947c08` (**2026-07-24**).
`reports/evolution/REGISTRY-IMPORT-FEASIBILITY-1.md` proposes deleting it (P2); it is still here.

### B4 — The "old default duration" column

`docs/ARCHITECTURE.md:436-445`, column 4 — ten pre-migration values. These were replaced by
`defaultLaps` / `defaultDurationSec` and **exist nowhere else in the tree**. The column is a
historical record with no home; its correctness is **unverifiable and therefore undatable** — there is
nothing to compare it against. Introduced `09727abd` (**2026-08-06**).

---

## How completeness was established

**Scope.** Whole repository, `node_modules/`, `client/dist/` and `.git/` excluded. All searches run
**uncapped** (no `| head`, no result cap).

**Archived directories — the convention chosen and why.** `reports/`, `results/`, `outputs/`,
`logs/` and `exp-runaway-leader-results/` are **excluded as copies-that-could-drift**. A dated
measurement is a record of the world it was taken in, and the project already declares this: the
`GUARD` block of `scripts/check-measured-stamps.mjs` states that the lab journal is outside the
scanned set and is allowed to go stale by rule. **The nuance, stated because the project's own
convention is not uniform:** `scripts/check-config-claims.mjs` *does* scan `reports/` for config
values. So the project treats `reports/` as stale-allowed for measurements and stale-forbidden for
config values. This census followed the measurement convention. `docs/archive/` is excluded on the
same basis. `client/tmp/loadmode-full.json` matched 8 times and is **untracked** vitest output — not
a copy.

**The racer-field set — a real completeness argument.** The field names were not picked; they were
enumerated from the registry itself: for each of the 20 `*RacerType.js` files, every top-level key
inside the `new SpriteRacerType({…})` literal. That gives exactly 24 names —
`accentColor, basePeriodMs, baseRotationOffset, bodyFillX, bodyFillY, coats, defaultCoatId,
displaySize, emoji, fallbackColor, frameCount, frameHeight, frameWidth, id, leaderEllipseRx,
leaderEllipseRy, leaderRingColor, maskUrl, primaryColor, speedMultiplier, spriteUrl, surfaceClasses,
tintMode, trailFactory`. Each was then grepped in **all four spellings** — `name:`, `name =`,
`"name":`, `'name':`. The `name =` spelling is what surfaced `scripts/diag/acceptance-orders.mjs:83-85`
and `scripts/diag/micro-divergence.mjs:105-107`; the per-file hit count is what surfaced
`scripts/audit-sprite-crops.mjs`.

The actual commands, as run:

```bash
# every literal-valued site, all four spellings, uncapped, ranked by file
grep -rnoE "(displaySize|bodyFillX|bodyFillY|speedMultiplier)\s*(:|=)\s*[-0-9]" \
  --include="*.js" --include="*.jsx" --include="*.mjs" --include="*.json" \
  --include="*.md" --include="*.yml" . \
  | grep -v -E "node_modules|client/dist" | cut -d: -f1 | sort | uniq -c | sort -rn

grep -rnoE "[\"'](displaySize|bodyFillX|bodyFillY|speedMultiplier)[\"']\s*:\s*[-0-9]" \
  --include="*.js" --include="*.jsx" --include="*.mjs" --include="*.json" --include="*.md" . \
  | grep -v -E "node_modules|client/dist" | cut -d: -f1 | sort | uniq -c | sort -rn

# per-field sweep over all 24 registry field names, both spellings, sites outside the registry
for k in displaySize bodyFillX bodyFillY speedMultiplier basePeriodMs frameWidth frameHeight \
         frameCount baseRotationOffset leaderEllipseRx leaderEllipseRy leaderRingColor \
         tintMode defaultCoatId; do
  grep -rnE "(^|[^A-Za-z_])$k\s*(:|=)\s*[-0-9'\"[]" --include="*.js" --include="*.jsx" \
    --include="*.mjs" --include="*.json" --include="*.md" . \
    | grep -v -E "node_modules|client/dist|/racer-types/|^\./reports/|^\./docs/archive/"
done
```

**Every comparison in this report was computed, not eyeballed.** Five throwaway Node scripts (in the
session scratchpad, not the repo) parsed the registry, each copy table, and the PNG headers, and
diffed them field by field. Counts they produced: sim-fairness 20/20 entries x 5 fields identical;
goldenRunner 10/10 x 4 identical and 6/10 `surfaceClasses` different; exp-roster-matrix 20/20 arrays
identical; audit-sprite-crops 8/20 rows differing; both `NAMES` arrays identical to the first 40 of
`QUICK_TEST_NAMES`; registry frame geometry 20/20 consistent with the PNG IHDR.

**The track-pairing set.** Established by grepping `space-sprint` (the one track id that appears in
every full list) across all live code and docs, then reading each hit — 10 candidate list-sites,
6 of which carry a racer pairing, plus the guard.

**Dating.** File birth via `git log --diff-filter=A --format="%h %ad %s" --date=short -- <file>`;
line-level via `git log -S'<literal>' -- <path>`; the two same-day commits in item 6 ordered by
`git log --date=iso` and `git merge-base --is-ancestor`.

**Guard coverage.** Not assumed from file names — each guard was asked
`node scripts/check-<name>.mjs --declare`, which prints its own `covers` and `blind` lists.

---

## Broken things found and deliberately NOT fixed

This chain counts; it does not repair. Everything below is left exactly as found.

1. **`client/src/modules/sim-fairness.test.js:337-343` is a tautology.** The test is named for
   `RACER_CONFIGS` bodyFill values matching the RacerType config bodyFill values, and its body
   compares a value to itself. The file's import block (`:11-21`) does not import the registry at all,
   so it **cannot** perform the comparison its name claims. Introduced `7ea80484`, **2026-06-04**. It
   has been green and meaningless for 90 days, and it is the only thing in the tree that looks like a
   guard for group A1.

2. **`scripts/parity/goldenRunner.mjs:112` and `:117` describe a guard that does not exist.**
   Line 112 is the heading "WHY THE GUARD EXISTS."; line 117 says GOLDEN-TABLE-REGISTRY-1 corrected
   the five and **built the guard**. `git show --stat de99f690` touched four files — `docs/BACKLOG.md`,
   two reports, and `goldenRunner.mjs` — and no test or `check-*` script. `docs/BACKLOG.md:835-843`
   confirms it: the drift guard was **HELD**, and the answer is to delete the copies instead.
   **The guard was proposed, then held, and the comment claiming it shipped was written anyway.**
   This is the same failure the paragraph it sits in was written to record — a comment asserting a
   relationship that nothing enforces.

3. **`scripts/audit-sprite-crops.mjs` would produce wrong measurements today** — 8 of 20 frame
   geometries and 5 of 20 display sizes are pre-crop values (groups A1 copy 6 and A2).

4. **Four live sites still pair `garden-path` with `snail`** (A4): `fingerprint-default.mjs:153`,
   `goldenRunner.mjs:93`, `sweep-bufferPct-driver.mjs:30`, `docs/ARCHITECTURE.md:438`. The last also
   states a lap count the seed no longer carries.

5. **`client/scripts/sweep-bufferPct-driver.mjs:31` pairs `city-circuit` with `buggy`**; the seed has
   said `motorbike` since 2026-06-30, a week before this file was written. Not on any existing list.

6. **`scripts/check-fallback-agreement.mjs:58` and `:188` declare a blind spot that closed 40 minutes
   after it was written.** The text names two live cases in `heroCurveGenerator.js`. Both are gone:
   `heroCurveGenerator.js:93` and `:229` now both reference the shared default object, no literals.
   Dated precisely: DECLARED-HOLES-1 `8f8e84d2` wrote the text at **2026-08-17 12:06:19 +0200**;
   ONE-HOME-1 group C `c0ddc253` removed the literals at **2026-08-17 12:46:56 +0200** and did not
   update the declaration. **A guard's own blind-spot list is a duplicated fact too, and this one has
   drifted.**

7. **`docs/BACKLOG.md:853` is stale in the present tense** — it says `goldenRunner.mjs` has 10 types
   of which 5 differ. They were corrected on 2026-09-01 by `de99f690`. The paragraph is framed as
   "the case for a guard, if the copies stay", but a reader scanning for open defects will read it as
   current.

8. **`reports/evolution/REGISTRY-IMPORT-FEASIBILITY-1.md` P3 names a symbol that does not exist** — it
   cites `TRACK_TYPES` at `goldenRunner.mjs:90` as having no readers. An uncapped grep for
   `TRACK_TYPES` over the whole repo returns **zero hits**; `goldenRunner.mjs:90` is
   `export const TRACKS = [`. The real never-read constant at that location is the `surfaceClasses`
   field (group B3), which the same report correctly names in P2.

9. **`client/src/modules/racer-types/racer-types.integration.test.js:202`** credits its 20 pinned
   numbers to a script that can no longer produce them (group B2).

10. **`client/scripts/sweep-bufferPct-driver.mjs:25` and `scripts/exp-roster-matrix.mjs:43`** both
    carry provenance comments naming the source file. Neither imports it. One of the two has been
    wrong since the day it was written.

---

## Limits — what a grep-based census cannot see

**It cannot find a fact that is not spelled the same in both places.** Every group above was found
because two files use the same identifier. A value copied under a different name — `bodyWidth` in
one file and `bodyFillX` in another — or a value inlined with no name at all (a product written out
as a single number) is invisible to every search in this report. That is the largest hole and it is
structural, not an oversight.

**It cannot see a computed key or an assembled string.** `cfg[fieldName]`, a `RACER_CONFIGS[id]` built
from a loop, or a table generated at runtime carries the same drift risk and matches no pattern here.

**It cannot judge whether two things that look like the same fact are the same fact.** Group B3 is
the worked example: `surfaceClasses` in `goldenRunner.mjs` and `surfaceClasses` in the registry share
a name and mean different things, and only reading the comment tells you. The reverse error — two
fields with different names that *are* the same fact — would have been missed silently.

**"Agrees" here means "agrees at commit `2c2f5ba9` on this branch."** It says nothing about tomorrow,
and for group A1 that distinction is the whole finding: 149 of 154 values agree today and **nothing
in the repository would notice if one stopped.**

**Three groups were verified against something outside the source tree** — A2 against PNG binary
headers, read with `readUInt32BE(16)`/`(20)`. If a sheet were a non-PNG or an interlaced variant that
reader would be wrong; all 20 parsed and all 20 agreed with the registry, which is consistency
evidence, not proof.

**No test suite was run** (a sibling piece owned suite runs), so every "this test is a tautology" or
"this pin is green" claim is from reading the source and computing the arithmetic by hand, not from
watching it pass. The arithmetic in B2 was checked for three of the twenty types.

**Groups A10 and A11 are declared, not enumerated.** Four fairness criteria are restated across
several documents and this census did not count the restatements; the guard's own declaration says
they are uncovered, and taking that at its word is exactly the kind of inherited absence claim this
arc has been punished for twice. **It should be counted, and this census did not count it.**
