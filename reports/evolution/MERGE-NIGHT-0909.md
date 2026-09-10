# MERGE-NIGHT-0909 — the second hull path closed, the skip ships on, and the sheet loses a ghost list

2026-09-10 · branch `night/2026-09-09` · **nothing minted. All four fingerprints measured and UNMOVED
in every part; golden races PASS.**

★ **A PRECONDITION NOTE, because the brief named a different SHA.** It expected the branch at
`e7425f28`; it was at **`3e6d2aea`**. The difference is one commit made in the previous block — the
R10 amendment and the COMEBACK-PRECEDENCE-1 appendix — touching `docs/` and `reports/` only, no
`client/`, `server/` or `shared/`. `master` was at `f0debe20` as stated.

---

## PART 1 — THE SECOND PATH INTO THE HULL

### Re-verified at source before anything was touched

RACER-TYPES-SPLIT-1 named this path and left it. Both ends were opened:

```
client/src/modules/storage/surfaceClassLoader.js:10
  import { fetchSurfaceClasses } from '../../services/surfaceClassApi.js';

client/src/services/surfaceClassApi.js
  import { API_BASE_URL } from './api.js';
  import { apiCall } from './apiClient.js';
```

★ **AND THE FACT THAT MADE THE SPLIT OBVIOUS: the loader's two exports had DISJOINT importers.**

| export | imported by | needs the network? |
|---|---|---|
| `getCachedServerSurfaceClasses` | `screens/RaceScreen/index.jsx:91` | **no** — a localStorage read |
| `fetchServerSurfaceClasses` | `modules/surface-effects/useSurfaceClasses.js:12` | yes |

`useSurfaceClasses.js` is **outside** the hull (only DevScreen and RacerEditor reach it). So the hull
contained the network solely because `RaceScreen` imported the module that happened to carry it — a
module-level import is not conditional, and it comes along whether the importer calls it or not.

### What was built — nothing twice, nothing copied

| file | role |
|---|---|
| `modules/storage/surfaceClassCache.js` **(new)** | the localStorage cache, read **and** write. Imports `storage.js` and nothing else. |
| `modules/storage/surfaceClassLoader.js` | keeps the fetch; imports the cache. **One-way, and it must stay so.** |
| `screens/RaceScreen/index.jsx` | now names the **cache** |
| `modules/surface-effects/useSurfaceClasses.js` | unchanged — already named the **loader** |

★ **`getCachedServerSurfaceClasses` is NOT re-exported from the loader**, the same rule
RACER-TYPES-SPLIT-1 wrote and for the same reason: a re-export reads as a convenience and puts the
network straight back into the closure of anything that uses it.

### ★ THE HULL — 196 → 192, measured by DIFFING, not by counting

The hull was run with the change lifted out and again with it in, and the two lists compared:

**LEFT the hull (5):**
- `client/src/services/api.js`
- `client/src/services/apiClient.js`
- `client/src/services/surfaceClassApi.js`
- `client/src/modules/storage/surfaceClassLoader.js`
- `client/src/utils/withTimeout.js` — ★ **an extra, unasked-for departure**: it was reachable only through the loader.

**ENTERED the hull (1):** `client/src/modules/storage/surfaceClassCache.js`

★ **NO `services/` FILE IS IN THE RACE HULL ANY MORE**, and **no third path appeared** — the stop
condition for chasing a chain was not reached.

### ★ THE SABOTAGE — AND THE MOCK CHECK FIRST

The brief warned that the last split's first sabotage was a false green because the test mocked the
very module it pointed at. **Checked before believing anything:** `surfaceClassLoader.test.js` has
**no `vi.mock` of `surfaceClassApi.js`, `surfaceClassCache.js` or the loader** — it stubs the
**global `fetch`**, so the real `loader → surfaceClassApi → apiClient → fetch` chain runs. Baseline
before sabotage: 18 tests over the two files, all green.

**(a) the loader reads the wrong half of the cache seam** — `getCachedServerSurfaceClasses()` where
`setCachedServerSurfaceClasses(classes)` belongs:

```
× HAPPY PATH: a successful fetch returns the classes, caches them, and says NOTHING
  AssertionError: expected [] to deeply equal [ { id: 'lava', name: 'Lava', …(2) } ]
      Tests  1 failed | 3 passed (4)
```

**(b) the engine-side importer reads the NETWORK half** — `RaceScreen` pointed back at the loader:

```
RACE HULL — 197 files can change the race        (192 without the sabotage)
  client/src/services/api.js
  client/src/services/apiClient.js
  client/src/services/surfaceClassApi.js
```

★ **Red on the tests and red on the hull instrument, from the two directions the split has.** Both
reverted; a whole-tree grep for the sabotage markers returns nothing.

---

## PART 2 — THE START-SEQUENCE SKIP SHIPS ON

`storage/defaults.js` — `ceremonySkipOnClick: false` → **`true`**, the owner's decision of 2026-09-10.
The comment above it now records that it ships on, and that a click nobody makes changes nothing.

`DevScreen/sections/CameraAdvancedSection.jsx` — the tooltip no longer opens *"A TEST AID, off by
default."* It describes what the control does and how to turn it off; the "test aid" framing and the
"off by default" clause are gone, and **nothing else about the control changed** — same key, same
`data-testid`, same checkbox, same label.

### ★ THE STOP CONDITION — NOT TRIPPED

Measured over parts 1 and 2 together, on the tree that carries both:

| role | record | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **UNMOVED** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **UNMOVED** |
| ★ camera | `75aef5cd474c54e5` | `75aef5cd474c54e5` | ★ **UNMOVED** |
| ★ render | `40b2de6fcc5bafd8` | `40b2de6fcc5bafd8` | ★ **UNMOVED** |

**Golden races: PASS** — 2 races, every finishing position and time as recorded.

★ **So the default does not alter the picture on its own.** A click nobody makes changes nothing, and
that is measured rather than argued. ★ **The camera value's silence is still the HOLE
COMEBACK-PRECEDENCE-1 named** — `raceDriver` delivers no `cameraPlan` — but that hole is about the
cast comebacker and has no bearing on a ceremony key, which the instrument does drive.

---

## PART 3 — THE MORNING SHEET

### What was REMOVED from NEEDS HIS WORD

- ★ **The withdrawn claim.** *"Your top-5 rule versus the plan's casting — they are structurally
  opposed (1.1% overlap)."* [COMEBACKER-ROLE-TRUTH-1](../night/COMEBACKER-ROLE-TRUTH-1.md)
  established that **both** assignment sites cast a final rank ≤ 5, so there is no opposition; the
  mechanism attached to the 1.1% was asserted, not established. It is not a decision waiting on him.
- **The hull item** — *"`services/api.js` and `apiClient.js` are still in the hull by a second
  path"*. **Part 1 of this piece resolved it.** Leaving it would have asked him about something that
  no longer exists.

### What was KEPT

★ **The 1.1% measurement itself is untouched**, where it is reported (lines 51–61), **with its
correction beside it**: the drawn-place figures stand as measurements, and the explanation attached
to them does not. Only the conclusion drawn from it went.

### What was REWRITTEN

The precedence item said *"Which precedence, if any — hard, mild, or none."* **He answered that on
2026-09-10 and it shipped.** It now asks for the one thing actually outstanding — his eye on the
built behaviour — and links the report.

### The duplicate marker, and the section below it — ★ CUT, not refreshed

The duplicated `<!-- END CHAIN STATUS -->` is gone.

★ **The 2026-09-05 section was CUT.** It was not merely out of date. It carried **its own `RUNNING`,
its own `OPEN`, and a SECOND `NEEDS HIS WORD` list** — a whole second sheet under the current one —
and its central claims were **false as written**:

| the section said | git says |
|---|---|
| "five pieces on `night/2026-09-05`, **none merged**" | the branch does not exist at origin; all five reports are **on master** |
| "`feat/playable-four-1` **is at origin, unmerged**" | it does not exist at origin either |
| "The dev server is on `night/2026-09-05`" | that branch is gone |

**Checked with `git ls-remote` and `git cat-file`, not read off the page.** All six reports it
summarised — COMEBACK-WEIGHT-1, IDENTIFIER-LENGTH-1, GATE-COST-TRUTH-1, SERVER-LINT-1,
PLAYER-WORDS-1, COMEBACK-BEATS-1 — are on master.

★ **A stale second decision list under a current sheet is exactly how a ghost list rebuilds**, so it
was cut rather than refreshed — and refreshing it would have been new work at the end of a merge.
**Nothing is lost:** a comment in its place records what was removed and why, `reports/night/INDEX.md`
indexes every one of those reports, and each report is the canonical home of whatever it left open.

**`docs/MORNING.md`: 341 → 108 lines.**

---

## PART 4 — CHECKS AND THE MERGE

### `npm run verify`, plain

★ **The first run was RED on four guards, and all four were CONSEQUENCES of parts 1 and 2 rather
than faults in them.** Named because a report that shows only the final green is not evidence:

| guard | why | fix |
|---|---|---|
| `engine-reach-doc` | the hull count moved 196 → 192 | `gen-engine-reach-doc.mjs` |
| `ceremony-counts` | same closure, second generated block | `gen-ceremony-costs.mjs` |
| `script-suite` | its test asserts those blocks are current | the two regenerations |
| ★ `check-fallback-agreement` **RULE F** | `docs/FORCE-MAP.md` cites `defaults.js` → `leadChangeDebounceMs` at **L399-L400**, and part 2's comment added two lines to `defaults.js` | citation → **L401-L402** |

★ **RULE F earned its keep here.** It is the guard that exists because "a line number cannot be wrong
out loud", and a two-line comment is precisely the change that silently invalidates one.

A second red then appeared and was **not** a fault either: `engine-reach.test.mjs`'s
IN-THE-HULL-BUT-UNCHANGED case reads the **working tree** against `--base=HEAD`, and `defaults.js`
was modified-but-uncommitted. It passed once committed. `check-standings-invariant` failed once under
parallel load and **passes standalone**; it passed on every later run.

★ **And one worth writing down: `gen-ceremony-costs.mjs` counts TRACKED files**, so it had to be
re-run *after* the commit that added `surfaceClassCache.js` — the first regeneration ran while the
file was still untracked and moved 118 → 119 only on the second.

| check | result |
|---|---|
| `npm run verify`, plain | ★ **PASS 26 · FAIL 0** |
| client suite | green (inside verify, retries disabled) |
| server suite | ★ **35 files, 836 tests, all pass** |
| golden races | **PASS** |
| ★ camera guard | **GREEN, as the brief predicted** — and it is the HOLE COMEBACK-PRECEDENCE-1 named, not a clearance |

### The catch-up with master

```
git rev-list --count night/2026-09-09..origin/master   →   0
```

★ **Master had NOTHING the branch did not already have**, so the catch-up is a no-op: no merge
commit, no hunks, none to resolve, and nothing that could fail to keep both sides. **The trees do not
differ after the catch-up**, so the "re-measure all four" branch of the brief does not apply — though
all four were measured on this tree anyway, above.

### `verify -- --premerge`, from all three `dist` states

The gate has real ordering logic around who **produces** `client/dist` (`check-client-build`) and who
**consumes** it (`check-image-starts`), so the state it starts from is a genuine variable.

| run | starting `client/dist` | result |
|---|---|---|
| 1 | **FRESH** — bundle stamped at HEAD | ★ **PASS 29 · FAIL 0** (538 s) |
| 2 | **ABSENT** — `rm -rf client/dist` | ★ **PASS 29 · FAIL 0** (609 s) |
| 3 | **STALE** — bundle stamped at the previous commit | *(recorded below)* |

<!-- MERGE-RESULT -->
