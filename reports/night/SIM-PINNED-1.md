# SIM-PINNED-1 — the small leftovers

**Day chain 2026-09-08, piece 7 of 7** · branch `night/2026-09-07` · **unmerged.**

Each item was re-established as still open before anything was done to it. **One was not open, and
one was open for a different reason than the brief gave.**

---

## (a) THE OTHER SEED FIELD — ★ OPEN, AND THE ANSWER IS *LEAVE IT*

`SetupScreen.jsx:1760` still sanitises on every keystroke:
`onChange={(e) => setQuickTestSeed(sanitizeQuickTestSeedInput(e.target.value))}`. Still true.

**But the brief's premise — "no short-key path reads it" — is false.**
`sanitizeQuickTestSeedInput` (`quickTestSeed.js:46-58`) is SHARED with the fixed field and already
passes identifiers and short keys through whole. So the field does take all three forms.

### And typing one into it is destroyed, exactly as SEED-FIELD-TYPING-1 described

Measured, character by character:

| typed | field becomes |
|---|---|
| `A` | `""` |
| `AB` | `""` |
| `ABC` | `""` |
| `ABC2` | `"2"` |
| `ABC23` | `"23"` |
| `ABC234` | `"ABC234"` |

Only the **complete** key survives, so it can be pasted but never typed — the value is replaced on
every keystroke and can never build up.

### ★ SO WHY LEAVE IT? Because the fix would make this field WORSE

The brief's decision rule is one question: *can a person reach it with something that is not a
number?* They can type one — but **nothing downstream can use it.** The Quick-Test path has no
short-key and no identifier resolution:

```
resolveQuickTestSeed("4242")     -> { seed: 4242, drawn: false }
resolveQuickTestSeed("")         -> { seed: 8107, drawn: true }
resolveQuickTestSeed("ABC234")   -> { seed: null,  drawn: false }
resolveQuickTestSeed("RA1-…")    -> THROWS
```

Removing the per-keystroke sanitiser would let a person type `ABC234`, watch it stay in the field,
press Quick Test — and get `racePlanSeed: null`. **A silently wrong race is worse than a field that
refuses letters.** The sanitiser is what keeps this box honest about being numeric, and the same
sanitiser is right in the other field because that one has a resolver behind it.

**Left, and said so.** The fix belongs with a Quick-Test short-key resolver, not before one.

**Noticed and left, adjacent:** a short key **pasted** whole into this field survives the sanitiser
and produces `seed: null`, which `RaceScreen` reads as `?? 0` — the unseeded legacy path that
`QUICK_TEST_SEED_MIN` exists to keep unreachable. Reachable today; a behaviour question, so named
rather than changed.

---

## (b) THE UNCONSUMED EXPORTS — ★ 72, NOT 42, AND NOTHING WAS DELETED

Re-counted rather than trusted: every `export function|class|const` under `scripts/` and `server/`,
each name then searched across **every tracked `.mjs/.js/.jsx/.json/.md/.yml`** — code, tests,
documents and string bodies alike.

| | brief | measured |
|---|---|---|
| `scripts/` | 37 | **55** |
| `server/` | 5 | **17** |
| total | 42 | **72** |

### ★ NOTHING WAS DELETED, and the reasons are specific

1. **The scanner over-matches, so "TEST-ONLY" cannot be trusted as a verdict.** It reports
   `scripts/diag/endgame-spec.mjs makeConfig` as reached by
   `client/src/modules/avoidanceWarmupRamp.test.js` — which defines its *own* local `makeConfig`. A
   word-boundary search cannot tell a same-named local from a real consumer. Only "NO REFERENCE
   ANYWHERE" is safe from that error, because over-matching would have moved a name *out* of it.
2. **The brief's own warning applies and I could not discharge it.** *"Two client candidates were
   reached through a string a test generates at runtime."* My search reads raw text, so a name spelled
   whole in a string is found — but one assembled from fragments is not. Proving a name dead needs
   each candidate opened individually, and 72 of them is not a leftover.
3. **★ Several sit in `scripts/sim/observers/`, which the WORLD fingerprint reaches.**
   `comeback-reality.mjs`, `gap-metrics.mjs`, `hero-adherence.mjs`, `physics-tax.mjs`,
   `runaway-parade.mjs`, `cohesion.mjs` all appear. Deleting an export there risks the fingerprint,
   and the piece that would make that safe is **(d) below, which had no test until today**.

**So: the census is the deliverable, and the deletions are not.** Every candidate is a candidate,
none is a verdict.

---

## (c) `DELETE /api/racers/:id/sprite` — ★ STILL HAS NO CALLER FROM ANY SCREEN

Confirmed, and reported rather than removed as instructed. Established in **five search forms**:

| form | searched | result |
|---|---|---|
| 1 | the literal path `racers/…/sprite` | route definition + its GET/POST siblings only |
| 2 | the client API surface | `racerApi.js:80 deleteRacerSprite` |
| 3 | `method: 'DELETE'` anywhere in `client/src` | only `racerApi.js:81` itself |
| 4 | the function name, whole tree | **only its own test** (`racerApi.test.js`, 5 call sites) |
| 5 | namespace and dynamic forms (`racerApi.`, `* as`, `import(…)`, bracket access) | `racer-types/index.js` imports from that module but **not this name** |

The route is reachable from the API and from no screen. **A route is an interface and its removal is
the owner's**, so nothing was touched.

---

## (d) `sim-fairness.mjs` HAS TESTS NOW

6,195 lines, no test of any kind, and a declared reach entry of the world fingerprint.

**`scripts/sim-fairness.characterisation.test.mjs` — 9 tests, all passing.** They pin what the file
does today, not what it should do.

`runSingleRace` is **both** the main entry path **and** the longest function (2,777 lines, from
`:1029`), so one target satisfies both halves of what was asked. It is pinned by outcome — the
finishing **order**, the finishing **times**, the OUTCOME flag and the physical duration for one
fixed identity (dirt-oval, seed 4242, N=12).

**`sim-fairness.mjs` was not refactored, split or shortened. Not one line of it was touched** —
`git diff` over it is empty.

### ★ THE SABOTAGE TOOK TWO GOES, AND THE FIRST ONE CORRECTED THE TESTS

**First attempt — offset `makePRNG`'s seed by 1.** Only the `makePRNG` test went red; **every race
assertion stayed green.**

That is a finding, not a miss: **`runSingleRace` does not ride on `makePRNG`.** It draws from
`makeRaceRng(seed).physics` (`:1058`), a different stream. My own header had claimed `makePRNG` was
"the stream everything else is downstream of" — **it is not, and the header now says so and says how
that was established.** A reader who believed the original note would have mis-read a red here.

**Second attempt — `race_baseSpeed × 1.001`, a 0.1% change to how fast the field runs:**

```
✖ ★ THE CHARACTERISATION: runSingleRace's finishing ORDER is pinned
✖ ★ THE CHARACTERISATION: runSingleRace's finishing TIMES are pinned
✖ ★ THE CHARACTERISATION: the race reaches OUTCOME and its duration is pinned
   tests 9   pass 6   fail 3
```

**All three characterisation tests red on a one-part-in-a-thousand change.** They are not inert.

*(An intermediate attempt — `requestedSeconds × 1.001` — moved nothing, which is also true and worth
knowing: dirt-oval is a CLOSED, lap-based track, so requested seconds is not its lever.)*

---

## CHECKS

| | |
|---|---|
| `sim-fairness.characterisation.test.mjs` | **PASS** — 9 tests |
| sabotage | **RED** — 3 of 3 characterisation tests, on a 0.1% speed change |
| **world fingerprint** | **UNMOVED** `8a1977187e9c99b4` |
| golden races | **PASS** — 2 races, every position and time as recorded |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check scripts/sim-fairness.characterisation.test.mjs

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/sim-fairness.characterisation.test.mjs
```

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `scripts/sim-fairness.characterisation.test.mjs` | — | 148 | **new** — the characterisation tests |

**Nothing else was touched.** `sim-fairness.mjs`, `SetupScreen.jsx`, `quickTestSeed.js`,
`racerApi.js` and `server/src/routes/racers.js` are all unchanged — (a) and (c) were investigations
whose answers were "leave it", and (b) deleted nothing.

**Nothing was removed, and nothing in the touched area was dead.**

**Reused, not rebuilt:** `sim-fairness.mjs`'s own exported surface (`makePRNG`, `runSingleRace`);
`EditorShape`; the shipped `dirt-oval` seed record as the fixture, rather than a hand-written track.

**No scratch files entered the repository.** The census scanner and the pre-sabotage copy lived in the
session scratchpad. `git stash` was not used.
