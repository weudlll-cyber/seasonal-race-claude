# ENGINE-REACH-DATA-1 — the arbiter answers its own question correctly; verify asks it a different one

**Date:** 2026-08-26 · **Branch:** `diag/engine-reach-data-1` (off `master`) · **Piece 6 of
NIGHT-2026-08-25** · **Verdict:** DIAGNOSE AND DESIGN ONLY. Nothing repaired, no hull widened, no
guard changed.

---

## 1. HOW THE ARBITER DECIDES REACH

`scripts/engine-reach.mjs` computes the **transitive import closure** of a set of entry points, by
statically walking `from '...'` specifiers:

- `ENTRY = client/src/modules/raceCore.js` (`:41`)
- plus whatever the guards declare — `fingerprint-default.mjs --declare` contributes
  `reach: [raceCore.js, sim-fairness.mjs]` (`:57-73`)
- the walk is rooted at `MODULES_DIR = client/src/modules` (`:40`)

**Today's hull is 36 files.** A changed path reaches the engine if and only if it is one of them.

**The header states exactly what this answers, and it is precise:** *"`raceCore.js`'s import closure
answers **what does the engine read**."* **That answer is correct and complete.** There is not one
dynamic `import()` in the closure — asserted by `engine-reach.test.mjs`, not claimed — so the static
walk sees every edge it is meant to see.

---

## 2. WHY A TRACK CHANGE FALLS OUTSIDE IT

**Because a JSON file has no imports.** `server/seeds/tracks/garden-path.json` is not reachable from
`raceCore.js` by any `from '...'` specifier, and it never could be. It does not fail the test — **it
is not the kind of thing the test can be applied to.**

The engine receives it by a different route entirely: the server loads track records from disk, the
client fetches them, `SetupScreen` builds a race payload from them, and `RaceScreen` hands that
payload to `createRaceFromIdentity`. **Every step of that path is outside `client/src/modules`, so the
walk is not merely blind to it — it never enters the neighbourhood.** The arbiter's root cannot see
`client/src/screens/`, where the payload is built, and cannot see `server/` at all.

---

## 3. WHAT ELSE FALLS OUTSIDE THE SAME WAY — checked, and it is worse than tracks

I asked the arbiter directly about three paths:

```
$ node scripts/engine-reach.mjs --check server/seeds/tracks/garden-path.json
  1 outside the hull (cannot reach the engine at all)        exit 1

$ node scripts/engine-reach.mjs --check client/src/modules/racerNames.js
  1 outside the hull (cannot reach the engine at all)        exit 1

$ node scripts/engine-reach.mjs --check client/src/modules/racer-types/beetle.js
  1 outside the hull (cannot reach the engine at all)        exit 1
```

**Three identical verdicts. Two of them are wrong.**

| path | in the hull? | can it change a race? | evidence |
| --- | --- | --- | --- |
| `server/seeds/tracks/*.json` — **icon, description** | no | **no** | presentation only; PIECE 5's verdict was right |
| `server/seeds/tracks/*.json` — **`defaultRacerTypeId`, `defaultLaps`** | no | **YES** | they decide the racer and the lap count; the same file, the same verdict |
| **`client/src/modules/racerNames.js`** | **no** | **YES** | `stablePairBit` (`raceBehavior.js:219`) hashes `r.name`; RUNIN-NAMES-1 measured renaming changing the **winner in 14 of 24 races** |
| **`client/src/modules/racer-types/*.js`** | **no** | **YES** | `getSpeedMultiplier()` feeds `deriveRaceDuration` in the payload builder (3 uses in `SetupScreen.jsx`) — it moves the race's length |
| `server/seeds/player-groups/` | no | **YES** | player names are racer names, so §3's name argument applies unchanged |

**`racerNames.js` is the sharpest case.** It sits *inside* `client/src/modules` — the very directory
the walk is rooted at — and is still outside the hull, because nothing in the engine imports it. The
names arrive in the race payload, assembled by a screen. **A file the arbiter could physically see,
and correctly reports as unreachable, whose contents demonstrably change who wins.**

---

## 4. A WRONG ANSWER, OR A WRONG QUESTION?

**A wrong QUESTION, asked of a correct answer.**

The arbiter answers *"is this path in the engine's import closure?"* — accurately, statically, and with
its own test proving the walk is complete. **`verify` then consumes that answer as if it meant
"can this change alter a race?"** Those two questions coincide only for changes that reach the engine
**as code, through an import**. They come apart for everything that reaches it **as data, through I/O,
or as a payload assembled somewhere else**.

**This is not a new class of defect and the project has met it before.** FP-HULL-1, on 2026-08-14, hit
it exactly: the world fingerprint is produced by `sim-fairness.mjs`, which *drives* the engine without
being imported by it, so it was *"outside the closure by construction — and this script answered
'none of 11 path(s) can reach the race engine' for a change that moved the fingerprint."*

**The repair FP-HULL-1 built is the right shape and is already in the file.** Entry points are taken
from a guard's own `--declare` block rather than restated: *"one home, and a guard that changes what it
drives updates this automatically."*

**But that mechanism widens the hull with more CODE ENTRY POINTS to walk from.** A JSON file has
nothing to walk. **The existing repair cannot express the current gap**, which is why the gap survived
it.

---

## 5. THE SMALLEST HONEST CHANGE

**Keep the closure exactly as it is, and give the declaration a second kind of member.**

`fingerprint-default.mjs --declare` already emits `{ reach: [...] }` — code entry points, walked
transitively. Add a sibling list of **literal paths or globs that are engine INPUTS rather than engine
code**:

```
{
  reach:     ["client/src/modules/raceCore.js", "scripts/sim-fairness.mjs"],
  reachData: ["server/seeds/tracks/**",
              "client/src/modules/racerNames.js",
              "client/src/modules/racer-types/**"]
}
```

`--check` then reports a reaching change if a changed path is **in the walked closure OR matches a
declared data path**. Three properties make this the smallest honest version:

1. **It reuses the one home FP-HULL-1 built.** No second registry, no list restated in `engine-reach.mjs`.
2. **It does not weaken the closure.** The static walk keeps its guarantee and its test; the data list
   is additive and cannot shrink the hull.
3. **It is honest about being a LIST.** A glob is a declaration, not a derivation — so it can go stale,
   exactly as `ENGINE_INPUT_MODULES` could before the closure replaced it. **That must be said in the
   block itself**, because the closure's whole virtue is that it is computed, and this part is not.

**What it deliberately does NOT do: distinguish fields within a file.** `garden-path.json`'s icon
cannot reach the engine and its `defaultLaps` can. A path-level rule flags both. **That is the correct
trade** — over-triggering on a presentation field costs one unnecessary fingerprint run; under-
triggering on `defaultLaps` costs a wrong "cannot reach the engine" on a change that alters every race.
**Field-level classification is a second, larger design and should not be smuggled in here.**

---

## 6. WHAT IT WOULD HAVE COST ON THE SWEEPS ALREADY RUN

The cost of widening the hull is extra fingerprint runs on commits that would previously have been
skipped. Counted over the project's whole history:

| declared data path | commits touching it, all time | in the last 30 days |
| --- | --- | --- |
| `client/src/modules/racer-types/**` | **56** | 2 |
| `server/seeds/tracks/**` | 9 | 2 |
| `client/src/modules/racerNames.js` | 3 | 3 |
| `server/seeds/player-groups/**` | 1 | 0 |
| **total** | **69** | **7** |

**69 commits out of 2,021 — about 3.4%.** In the last thirty days, **seven**.

**That is the whole cost: seven extra fingerprint runs a month**, each a few minutes. Against it: the
two wrong verdicts in §3 are both on paths in this list, and one of them — `racerNames.js` — is a file
whose edit has been *measured* to change the winner in more than half the races tested.

**And some of those 69 would not be extra at all.** A change to `racer-types/**` that alters a speed
multiplier *should* mint; today it is skipped. The 3.4% is an upper bound on the noise and includes
every run that ought to have happened.

---

## 7. PROPOSALS — none ordered, nothing built

### A — MINE: `reachData` on the existing declaration, exactly as §5

**Cost:** ~3.4% more fingerprint runs (7/month measured), plus one honest admission in the declaration
block that this half is a maintained list rather than a computed closure. **What it buys:** the two
wrong verdicts in §3 become right, and the class FP-HULL-1 identified is closed for data as well as
for drivers.

### B — MINE: make the arbiter say which question it answered

Today's output is *"cannot reach the engine at all"* — a claim about the race. What was computed is
*"not in the import closure of raceCore.js"*. **Those are different sentences and only the second is
established.**

**Cost: wording.** **What it buys:** the failure mode in §4 becomes unavailable. A reader who sees
*"not in the engine's import closure — note that engine INPUTS (track records, racer definitions, name
lists) reach the engine as data and are not covered by this walk"* cannot conclude what verify
currently concludes. **This is the cheapest item in the report and it is independent of A** — worth
doing even if the hull is never widened, and it is the only one that helps the next person who reads
an `engine-reach` verdict at 2 a.m.

### C — MINE: point the fingerprints at the tree the repository owns

Separate from the hull, and surfaced by PIECE 5. All three fingerprints resolve their track directory
as `server/data/tracks` if it exists, else `server/seeds/tracks`. **On any developer machine the live
gitignored record wins**, so a fingerprint measures a record the repository does not contain and cannot
see the change under test.

**Cost:** it changes what the fingerprints hash on machines whose live record differs from the seed —
so it could move the recorded values, which makes it a mint and needs his word. **What it buys:** the
instruments would measure the artefact the product ships. **Conservative branch, and it is the one I
take: report it, do not change it**, because a fingerprint that moves for a tooling reason is exactly
what PIECE 4's proposal D refuses.

### D — do NOT replace the closure with a folder rule

Named to be refused. The header already priced it: *"The blunt trigger is 'any file under
client/src/modules/ that is not under camera/' — 103 files. The closure is 19."* Widening by folder
would re-import a cost the project has already measured and rejected, **and it would still miss
`server/seeds/tracks` entirely.** The gap is not that the closure is too narrow; it is that a closure
is the wrong instrument for data.

---

## 8. SOURCE HYGIENE, AND WHAT WAS NOT RUN (R15)

**The three `--check` verdicts in §3 were run**, not reasoned about, and their exit codes are recorded.
The hull was enumerated by running `node scripts/engine-reach.mjs` and reading its output. The commit
counts in §6 are `git log --oneline -- <path> | wc -l`, re-runnable verbatim.

**Nothing was changed.** No guard, no hull, no declaration, no fingerprint. This branch adds one report.

**Not run, and why:** no fingerprints (nothing they read was touched, and PIECE 4 established they do
not read the arbiter at all), no browser gate, no client suite, no server suite — docs-only.

**One limit I did not paper over.** §3's table asserts that `racer-types/**` and `racerNames.js` change
races, and cites the mechanism at source plus RUNIN-NAMES-1's measurement for names. **I did not re-run
a race to demonstrate a speed-multiplier edit moving a fingerprint.** The mechanism is legible
(`getSpeedMultiplier` → `deriveRaceDuration` → `realizedDurationSec`, which `raceCore.js:110` re-derives
and every duration-keyed term reads), but a demonstration would be stronger than an argument and is not
here.

---

## 9. CONFORMITY

| the brief asked | delivered |
| --- | --- |
| DIAGNOSE AND DESIGN, DO NOT REPAIR | Yes — nothing changed |
| how does the arbiter decide reach | §1 — a static import closure from `raceCore.js` plus guard-declared entry points; 36 files |
| why does that path fall outside it | §2 — a JSON file has no imports; the root cannot see `client/src/screens` or `server/` at all |
| what else falls outside the same way — check the racer definitions, the name sets, anything else shipping as data | §3 — **checked by running the arbiter**: `racer-types/**` and `racerNames.js` both get "cannot reach the engine" and both change races; plus player-groups and the engine-bearing fields of track records |
| a wrong ANSWER or a wrong QUESTION? | §4 — **a wrong question asked of a correct answer**, and FP-HULL-1 met the same class on 2026-08-14 |
| the smallest honest change | §5 — `reachData` on the declaration FP-HULL-1 already built; explicitly not field-level |
| what it would have cost on the sweeps already run | §6 — **69 commits of 2,021 (3.4%); 7 in the last 30 days**, and some of those ought to have run |
| PROPOSALS with at least two of your own | §7 — three are mine (A, B, C); D is named to be refused |

**One thing the brief did not ask for and this report adds:** §3's finding that `racerNames.js` is
inside `client/src/modules` and still outside the hull. The gap is not a `server/` versus `client/`
boundary, which is how it would naturally be read from the track case alone — **it is a code-versus-
data boundary, and it runs straight through the directory the arbiter is rooted in.**
