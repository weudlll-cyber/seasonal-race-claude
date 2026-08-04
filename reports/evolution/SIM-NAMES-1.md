# SIM-NAMES-1 — the names are not labels, so this block stops at the report

Branch `camera-refactor`. **STOPPED at Part B by the spec's own instruction**: a racer's name feeds the
avoidance physics, so renaming the simulation's racers is not a naming change — it is an engine change.
Measured, not argued: **24 of 24 races changed finishing order and 14 of 24 changed the winner.**

No engine ceremony, no fingerprint, and **no simulation-behaviour change in the diff** — because the
change the spec asked for was not made.

---

## 1. BUILD-VS-SPEC CONFORMITY

| Spec part | Status | Note |
|---|---|---|
| **A** — trace both naming paths, report first | **DONE** (§2) | The divergence is **both narrower and wider** than assumed — §2.4 |
| **A** — are browser names owner data or generated? | **DONE** — both, depending on how he starts the race (§2.1) | |
| **A** — is the ORDER stable, is `r0` reliably browser racer #0? | **DONE** — yes, the index↔position mapping is stable (§2.3) | The *mapping* is fine. Only the *labels* differ. |
| **A** — which other tools share the problem | **DONE** (§2.4) | Seven tools surveyed; three already handle it, three do not, one is mine and already correct |
| **B** — make the simulation use the owner's names | **NOT DONE — STOPPED AND REPORTED** (§3) | The spec: *"If a name or its ordering feeds anything but display … STOP and report before changing it."* It does. |
| **B** — does this touch the simulation's behaviour? | **YES, decisively** (§3) | Not via coat/pattern, which the spec flagged — via `raceBehavior.js`'s symmetry tie-break |
| **B** — does the headless simulator have owner data? | **DONE** (§4) | Yes, on disk, unauthenticated — but the fallback question turns out not to be a string choice |
| **C** — hygiene + tests | **DONE** (§6) | One new test file pinning the finding; one display-only addition; nothing removed or renamed, so nothing orphaned |
| **VERIFY** — no simulation-behaviour change in the diff | **HELD** | §6 lists every touched path |
| **VERIFY** — same seed+track, browser vs headless, same racers/names/order | **DONE** (§5.1) | |
| **VERIFY** — one marker replayed, naming the racers he saw | **DONE** (§5.2) | |

**Declared deviation:** the spec expected a `fix(sim-names)` commit that changes names. This commit
changes no names anywhere. What it ships instead is the finding, a test that makes the finding
impossible to trip over again, and a display-only improvement to the replay path so a report can talk
about Mo and Bo rather than #12 and #1 — which was the block's actual purpose.

---

## 2. PART A — where the two paths part company

### 2.1 The browser: names are owner data, and there are two sources

Owner data lives on disk in `server/data/player-groups/*.json`, unauthenticated, three groups today:

| Group | Names |
|---|---|
| `40 Racer Testgroup` | Flash, Atlas, Surge, Maverick, Gale, Blitz, Shadow, **Storm**, **Zephyr**, Mercury, Breeze, Turbo, Blaze, Thunder, … **Bolt**, … **Arrow**, … |
| `Testgruppe von Walter` | James, Olivia, Ethan, Sophia, William, Emma, … |
| `Example Group` | Alice, Bob, Charlie, Diana, Eve |

Those are the Bolt / Arrow / Zephyr / Storm of the spec — they are his content, exactly as assumed.

The path: `server/data/player-groups` → API → SetupScreen `players` → `sessionStorage.activeRace.racers`
→ RaceScreen's augmentation loop (`for (const k in src) if (!(k in r)) r[k] = src[k]`, which sets
`r.name`) → `stepRacePhysics` → `applyRacerBehavior(st.racers, …)`. **The name is on the racer object
before the first physics step.**

But there is a **second** browser source, and it is the one the harnesses copied: `handleQuickTest` fills
the roster from `QUICK_TEST_NAMES` in `SetupScreen.jsx` — Turbo, Blaze, Rocket, Flash, Speedy, Thunder,
… (70 names). So "the names the owner sees" is not one list. A **Quick Test** race is Turbo/Blaze/Rocket;
an **event** race is whatever group he picked.

### 2.2 The headless side: four different rosters

| Path | Names | 
|---|---|
| `headlessRaceSimulator.js:256` | `` `r${i}` `` → `r0, r1, r2` |
| `sim-fairness.mjs:785` | `` racerNames?.[i] ?? `R${i+1}` `` → `R1, R2, R3` unless `--racer-names=` is passed |
| `raceCore.runRaceHeadless` | **no name at all** — `stablePairBit` falls through `name ?? id ?? index` to the index string `"0","1"` |
| `scripts/parity/goldenRunner.mjs:130-136` | `QUICK_TEST_NAMES`, deliberately, in both arms |

### 2.3 The ORDER is fine — the mapping is reliable

`racer.index = i` on both sides, and `i` is the position in the roster array. Nothing shuffles the racer
array: `computeEvenRowLayout` shuffles *row assignments*, not identities. So `r0` **is** reliably browser
racer #0. The mapping is not the problem; only the labels are — which is the good case, because it means
a translation table is enough and no re-identification is needed.

### 2.4 Which tools share the problem — narrower AND wider than assumed

| Tool | Names | Matches a browser race? |
|---|---|---|
| `goldenRunner.mjs` (parity/golden equality) | `QUICK_TEST_NAMES`, both arms | **Yes — for Quick Test rosters only.** Already handled, with the reason in a source comment: *"the avoidance symmetry tiebreak keys on r.name"* |
| `sim-fairness.mjs` | `R{i+1}` by default; owner names only via `--racer-names=` | **No, by default.** The flag exists (added by RACER-FLAPPING-1, labelled D-NAME) but is opt-in |
| `headlessRaceSimulator.js` | `r{i}` | **No** — but see below |
| `raceCore.runRaceHeadless` (direct callers) | none → `"0","1"` | **No** |
| `camera-replay.mjs` (CAMERA-REPRO-1) | the owner's names, carried in the marker | **Yes** |
| the marker line | the owner's names | **Yes** |
| the frame log (`rc[].n`) | the owner's names | **Yes** |
| Playwright runs | whatever the seeded session used | n/a — they drive the real browser |

**Narrower than the spec assumes** in two ways. First, `headlessRaceSimulator.js` — the file the spec
names — is documented in its own header as a *"⚠️ SIMPLIFIED STATISTICAL MODEL — NOT THE GAME"*, used by
one Dev screen (`DiagnoseVerteilung`); its numbers already do not describe the real race, so its `r{i}`
is the least consequential naming in the tree. Second, the project has already been here: `goldenRunner`
threads the browser's names on purpose, and `sim-fairness` has had a `--racer-names` flag since
RACER-FLAPPING-1 for exactly this reason.

**Wider than the spec assumes** in three ways, and these are the ones that matter:

1. **The names are physics** (§3). This was never a naming block.
2. **Even the "correct" harness only matches Quick Test.** `goldenRunner` and `--racer-names=$RACER_NAMES`
   both use `QUICK_TEST_NAMES`. When the owner races his *40 Racer Testgroup*, no harness in the
   repository reproduces that race — the parity harness included.
3. **`QUICK_TEST_NAMES` exists twice**, byte-identical, 70 names each: `SetupScreen.jsx:62` and
   `goldenRunner.mjs:131`. Two copies of a list that decides race outcomes, with nothing keeping them in
   step. Left alone here (§6) — but it is the sharpest single item for the hygiene phase.

---

## 3. DO NAMES FEED ANYTHING BEYOND DISPLAY? — yes, and this is the finding

The spec flagged `assignCoat(src.name, …)` / `assignPattern(src.name, …)` as the risk. **Those are not
the problem:** `coatId`/`patternId` are read only by `SpriteRacerType.js`, `spriteTinter.js` and
`RaceScreen`'s draw call — no physics module reads either — and `assignPattern` is a stub that returns
`'solid'` regardless of its arguments.

The real path is one the spec did not name. `client/src/modules/raceBehavior.js:201`:

```js
function stablePairBit(a, b) {
  const aId = String(a.name ?? a.id ?? a.index ?? '0');
  const bId = String(b.name ?? b.id ?? b.index ?? '0');
  const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
  … FNV hash … return (hash >>> 0) & 1;
}
```

That one bit breaks the symmetry when two racers are neck-and-neck in the same lane and geometry cannot
say who goes which way. It is consumed at **four live sites in the traffic core**: the look-before-brake
free-lane side (`:320`), the soft-steering dodge direction at a near-centreline tie (`:674`, via
`pairTieDir`), a further tie bit (`:710`), and the hard-separation push direction at `dY ≈ 0` (`:1049`).

**Measured, unit level.** Two racers, identical in every respect, dead centreline tie, twelve frames of
the real `applyRacerBehavior`:

| names | racer 0 `physicalY` | racer 1 `physicalY` |
|---|---|---|
| **Bolt / Arrow** | **+0.0227** | **−0.0227** |
| r0 / r1 | **−0.0227** | **+0.0227** |
| R1 / R2 | −0.0227 | +0.0227 |
| Storm / Zephyr | −0.0227 | +0.0227 |
| Turbo / Blaze | +0.0227 | −0.0227 |
| James / Olivia | +0.0227 | −0.0227 |
| *(no name → index)* | −0.0227 | +0.0227 |

Same physical situation, opposite dodge, decided by the string.

**Measured, race level.** Same track, same seed, same config, same everything but the roster names —
owner names versus `r{i}`:

- first divergence in `t` at **physicsTs = 14 912 ms** (searound, seed 5601) — the tie-break does not
  fire early, which is why short runs look identical;
- by the flag, **max per-racer |Δt| = 0.049** — about 2.4 % of a two-lap race;
- across **3 tracks × 8 seeds = 24 races**: finishing order differed in **24/24**, and the **winner
  differed in 14/24**.

```
searound       5601:W  1234:W  777:o  42:W  9999:o  31337:W  2026:o  8080:W
dirt-oval      5601:o  1234:W  777:W  42:o  9999:W  31337:o  2026:W  8080:W
space-sprint   5601:W  1234:W  777:o  42:o  9999:W  31337:W  2026:o  8080:o
                                     ('o' order differs, 'W' the WINNER differs)
```

So "give the simulation the owner's names" would **re-roll every number every headless harness has ever
produced** — every fairness gate, every band-reach figure, every Holm verdict. That is a fingerprint-moving
engine change with the full ship ceremony behind it, not a labelling fix, and the spec's own stop rule
applies. **Hence: reported, not done.**

### A consequence worth stating separately

This also means the shipped browser race and the shipped fairness numbers are **not the same race** unless
the harness was given the same roster. `sim-fairness.mjs` defaults to `R{i+1}`; the owner's events run his
groups. The gates are internally consistent and comparable to each other — every published figure used the
same `R{i+1}` baseline — but they describe a field that is named differently from the one he watches, and
a differently-named field is, measurably, a different race.

### The two ways out (owner's decision, not mine)

1. **Make the name cosmetic.** Hash a stable identity (`r.index`, or a roster-position id) instead of
   `r.name` in `stablePairBit`. Then names are free, every harness can carry his roster, and the browser
   and the sim agree by construction. Cost: it moves the fingerprint once, needs the ship ceremony, and
   invalidates the current baselines — a one-time, deliberate re-baseline.
2. **Make the roster part of the race identity.** Leave the physics alone and require every harness to
   declare its roster explicitly (as `goldenRunner` already does), with the roster travelling in the
   fingerprint. Costs nothing today, but the sim can only reproduce a browser race when it is handed the
   exact names — and "same seed, same track" stops being a complete description of a race.

My recommendation is **(1)**, because (2) leaves a trap: `runRaceHeadless` silently falling back to index
strings is the same class of defect as the unseeded bisect ladder — an instrument that quietly measures
something other than what it claims. But it is a re-baseline, so it is his call.

---

## 4. DOES THE HEADLESS SIMULATOR HAVE OWNER DATA? — yes, but the fallback question changes shape

`server/data/player-groups/*.json` is plain JSON on disk, no auth, reachable from any script — the same
way `camera-replay.mjs` already reads `server/data/tracks`. So a harness *can* have his names.

But the spec's follow-up — *"if it can run without `server/data`, say what the fallback should be, and make
the fallback obviously a fallback, not a silent `r0`"* — has a different answer than expected. Since the
names are load-bearing, **no fallback string is cosmetic**: `«unnamed-0»` changes the race exactly as much
as `r0` does, it just looks honest while doing it. A fallback that a reader cannot mistake for a real name
is still a fallback that silently selects a different race.

So the honest form of that requirement is not a string but a **declaration**: any harness that cannot read
the roster should print which roster it used and that this determines the result — and, under option (1)
above, the question disappears entirely, which is the better reason to prefer it.

---

## 5. THE TWO VERIFICATION EXAMPLES

### 5.1 Same seed and track, browser and headless — same racers, same names, same order

Searound, seed 5601, 20 manta, defaults. **Browser** order at `physicsTs = 11 952 ms`, taken from the
marker's own witness vector (i.e. what was on his screen); **headless** order from
`node scripts/camera-replay.mjs`:

| pos | browser (marker) | `t` | headless (replay) | screen x,y |
|---:|---|---|---|---|
| 1 | **Mo** (idx 12) | 0.40442 | **Mo** | 389, 327 |
| 2 | **Bo** (idx 1) | 0.38466 | **Bo** | 573, 336 |
| 3 | **Dee** (idx 3) | 0.37815 | **Dee** | 636, 354 |
| 4 | **Ola** (idx 14) | 0.37712 | **Ola** | 651, 395 |
| 5 | **Ivy** (idx 8) | 0.37262 | **Ivy** | 681, 296 |
| 6 | **Ada** (idx 0) | 0.36809 | **Ada** | 739, 391 |
| 7 | **Eli** (idx 4) | 0.36246 | **Eli** | 779, 313 |
| 8 | **Nia** (idx 13) | 0.35831 | **Nia** | 835, 386 |
| 9 | **Fay** (idx 5) | 0.35793 | **Fay** | 806, 242 |
| 10 | **Kit** (idx 10) | 0.35729 | **Kit** | 837, 353 |

Witness: `20 of 20 racers match to 1e-4`, leader `t` and field `t`-sum exact. Same racers, same names,
same order — **and this works precisely because `camera-replay.mjs` carries the marker's roster into the
race before stepping it.** Strip the names and it would be a different race after ~15 s, which is the
finding in §3 seen from the other side.

### 5.2 One marker replayed, naming the racers the owner would have seen

The replay path now prints the field **by name** (`--field=<n>`, default 8):

```
FIELD AT THE MARK — top 8 by position, as he saw them
    pos  racer        screen x,y      in frame   inner-region
      1  Mo           389,327         yes        inside
      2  Bo           573,336         yes        inside
      3  Dee          636,354         yes        inside
      4  Ola          651,395         yes        inside
      5  Ivy          681,296         yes        inside
      6  Ada          739,391         yes        inside
      7  Eli          779,313         yes        inside
      8  Nia          835,386         yes        inside
```

Cross-checked against the browser canvas captured at the same key press in CAMERA-REPRO-1: Mo ≈ (390,320),
Bo ≈ (575,335), Dee ≈ (637,350), Ivy ≈ (682,292). He can now say "Ola drifted off the left edge" and the
answer comes back about Ola.

---

## 6. HYGIENE AND TESTS

**Removed:** nothing. **Renamed:** nothing. **Therefore orphaned:** nothing — no Dev Screen control, config
key, label or tooltip is affected, because no name, key or control changed.

**Extracted:** nothing new. The one thing this block would have justified extracting — a single canonical
`QUICK_TEST_NAMES` — is deliberately left (below), because it lives half in a parity harness and this
block must demonstrate an empty simulation-behaviour diff.

**Added:**

| File | before | after |
|---|---:|---:|
| `client/src/modules/racerNameIsLoadBearing.test.js` | — | 104 (new) |
| `scripts/camera-replay.mjs` | 657 | 683 |
| `reports/evolution/SIM-NAMES-1.md` | — | this file |
| `reports/evolution/INDEX.md` | 1 line added | |

No other file is touched. In particular: `raceBehavior.js`, `raceCore.js`, `headlessRaceSimulator.js`,
`sim-fairness.mjs`, `goldenRunner.mjs` and every config default are **untouched**.

**Tests — 4 new, on ground that had none.** `racerNameIsLoadBearing.test.js` pins the coupling itself:
that the same pair renamed does not always dodge the same way; that it is a deterministic hash and not
noise; that the two members of a tied pair always commit to *opposite* sides whatever they are called
(the property the mechanism exists for, which must survive any future fix); and that the fallback chain is
`name → id → index`, so an unnamed roster is its own third naming scheme. The file's header says in plain
words what a red test there means, so the next person to rename a racer meets the finding instead of
rediscovering it. Full client suite: **3434 tests, all passing.**

### Noticed and deliberately left

1. **`QUICK_TEST_NAMES` is duplicated byte-for-byte**, 70 names, in `SetupScreen.jsx:62` and
   `goldenRunner.mjs:131`. Two copies of a list that decides race outcomes, with nothing keeping them in
   step. The sharpest item in this list.
2. **`assignPattern(_playerName, _patternList)` ignores both arguments** and always returns `'solid'`;
   `PATTERN_IDS` is passed to it from `RaceScreen` for nothing. A dead parameter pair on the path the spec
   asked about — harmless, but it is what made the coat/pattern lead look live.
3. **`sim-fairness.mjs` defaults to `R{i+1}`** while `--racer-names` exists. The default is the more
   dangerous half: it produces a plausible number for a roster nobody races.
4. **`raceCore.runRaceHeadless` sets no name**, so direct callers silently race the index strings. Under
   option (2) of §3 this needs an explicit roster argument; under option (1) it stops mattering.
5. **`headlessRaceSimulator.js`'s `r{i}`** — left, and it should stay left until the §3 decision is made:
   changing it changes that model's output, and it is a documented non-game model.
6. **The block's own premise is now wrong in the docs.** Nothing in `docs/` records that a racer name is
   an engine input. If option (2) is chosen, that belongs in `LESSONS.md` and `FORCE-PARITY.md`; if option
   (1) is chosen, it belongs in the re-baseline report instead.
