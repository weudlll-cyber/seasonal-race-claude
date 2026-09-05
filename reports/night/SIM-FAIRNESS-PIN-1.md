# SIM-FAIRNESS-PIN-1 — characterisation tests for `sim-fairness.mjs`

**Block:** PIECE F of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.

**TESTS ONLY. Not one line of `scripts/sim-fairness.mjs` was edited** — nothing refactored, split,
shortened or reorganised. The backlog's verdict to leave the file alone stands. **The world
fingerprint was re-run on the changed tree and is UNMOVED.** No mint.

---

## 1. The file's shape, re-established at source with its method

Not taken from `BACKLOG.md` or from any handoff. **Method:** parse the file with `acorn` (ESM,
`ecmaVersion: latest`, `allowAwaitOutsideFunction`), walk every `FunctionDeclaration`,
`FunctionExpression` and `ArrowFunctionExpression`, and take a function's length as **end line minus
start line plus one** — so a brace inside a string or a comment cannot be miscounted, which is the
failure mode of every brace-matching count.

| | |
| --- | --- |
| physical lines | **6,195** by `wc -l`. *(The AST reports 6,196 — `split("\n")` counts the trailing newline as a line. Same file, two conventions; `wc -l` is the one the backlog uses.)* |
| function nodes | **340** |
| the longest | **`runSingleRace` — 2,766 lines, 1029–3794.** This matches the backlog exactly. |
| second longest | `runFairnessSelfCheck` — 303 lines |
| third | an anonymous arrow at 1175–1250 — 76 lines |

**The drop from 2,766 to 303 to 76 is the shape of this file:** one function is 45% of it, and
everything else is ordinary.

### ★ Two facts the backlog does not carry, and both decide what is testable

- **`runSingleRace` is EXPORTED.** The file exports eight names — `makePRNG`, `RACER_CONFIGS`,
  `DURATION_VARIANTS`, `runSingleRace`, `computeFairnessStats`, `computeZoneSuccessRate`,
  `bandIntegrityOK`, `computeExtendedFairnessStats` — so the longest function can be driven
  directly, with no change to the file.
- **The whole sweep sits behind `if (isMain)` at 4125–6195**, so importing the module is safe: it
  evaluates the CLI parsing and stops. Without that, a test file could not import it at all.

Together these are why this piece could be done as tests. Had either been false, the honest answer
would have been "cannot be pinned without changing the file", and the piece's rule would have left
it unpinned.

---

## 2. What was built — 12 tests, green

`scripts/sim-fairness.characterisation.test.mjs`. **These pin what the file does TODAY.** They do not
say any of it is right, and no value in them is a specification: if a change is meant to move one, it
is updated deliberately in the same commit, and that deliberateness is the whole point.

**The module's shape** — the export surface; that the `isMain` guard is still there (the property
every other test depends on); and that `runSingleRace` is still the longest function and still
exported, so a future split is a decision somebody makes rather than something a reader discovers.

**The analysis helpers** — `makePRNG` is a deterministic stream and the seed selects it;
`computeFairnessStats` reduces a race to its winner's start row identically twice;
`computeZoneSuccessRate` scores against the target map **and skips racers not in it**;
`bandIntegrityOK`'s four-comparison PASS/FAIL rule, including the tolerance and the per-track half
that fails the whole gate on one bad track.

**`runSingleRace`, driven end to end** on real shipped track records, at seed 4242, 12 racers, 30 s —
deterministic on a **closed** track and on an **open** one (different branches: one lap, a run-out
zone, a different finish rule); every rank used exactly once; the six per-racer fields present; the
seed genuinely reaching the race (two seeds, two different races); the aggregate metrics present and
**moving with the race** rather than being present and stale.

**And the GOLDEN:** the finishing orders of the closed and the open race, hashed together into one
digest. **One digest on purpose** — a change that moves only open tracks must not be able to pass by
averaging with a closed one.

---

## 3. ★ Both return shapes were established by RUNNING the code, and both first drafts were wrong

Worth recording, because it is the same lesson twice in one file:

- **`runSingleRace` returns an ARRAY**, one row per racer —
  `{racerIndex, startRowIndex, indexInRow, finalT, finalRank, finishTime}` — with the race's
  aggregate metrics attached to that array as named properties (`naturalness`, `physicalDurationS`,
  `outcomeReached`, the `lite*` counters). The first draft assumed a `{finishOrder, perRacer}`
  object, because `perRacer` is visible in the source at 3760 — **but that block is inside the
  `--action-metrics` branch and is not attached on the default path.** Reading the file produced a
  shape the file does not return.
- **`computeZoneSuccessRate` takes `{result, targetRankMap}`**, and its `overall` is a
  `{hits, total, rate}` block, not a number.

Both are now documented at the tests that use them, so the next reader does not repeat it.

---

## 4. The sabotage

### CAUGHT — a physics constant inside the 2,766-line function

`const rollJitter = (raceRng() - 0.5) * 2 * rollInterval * 0.2;` → `* 0.25`. One token, inside
`runSingleRace`'s per-racer init: every racer's re-roll jitter widens by a quarter.

**RED, on the GOLDEN**, which named both tracks, both finishing orders and the new digest. This is
exactly the class the world fingerprint exists for — with the difference that this says *which* race
changed and *in which regime*, in the ordinary suite, without anyone running an instrument.

### NOT CAUGHT — and it is the correct outcome, not a hole

The winner tie-break in `computeFairnessStats`: `r.finalRank < best.finalRank` → `<=`, which hands a
tie to the last racer instead of the first. The tests stayed green.

**A failed sabotage is not a finding until the mutation is shown to be semantic, and this one is
not.** `finalRank` is a strict ordering, so two racers cannot share one and the changed branch is
unreachable. **Measured rather than argued:** 15 races over three tracks and five seeds contain
**zero** duplicate `finalRank`, and one of the new tests asserts rank-uniqueness directly, so the
premise is itself pinned. A mutation inert on every reachable input is not a gap in the tests.

*(It also mis-targeted on the first attempt: `computeFairnessStats` is **exported from**
`sim-fairness.mjs` but **defined in** `scripts/sim/observers/fairness-stats.mjs`. The sabotage runner
refused to proceed when its target appeared zero times rather than silently matching nothing — which
is the same silent-zero discipline as piece E, one level down.)*

Both mutations were restored byte-identical; the control was green before and after.

---

## 5. What could NOT be pinned — named, not left as a gap

- **The `isMain` block, 4125–6195 — a third of the file.** The CLI, the combo loop, the report
  writing and every observer roll-up. It runs only as a subprocess, so pinning it means spawning the
  sweep and hashing what it writes: **minutes per assertion**, against a suite budget this project
  has already had to defend twice (GATE-CLIENT-CROWDING-2, GATE-SERIAL-BCRYPT-1). **This is the
  largest unpinned region and the honest limit of this piece.**
- **`runFairnessSelfCheck`** (303 lines, the second longest) — reachable only through `--selfcheck`,
  i.e. from inside that same block.
- **The nine observer flags.** `runSingleRace` takes nine read-only switches; only the default path
  (all off) is pinned. The observers carry their own goldens in `scripts/sim/observers/`.
- **`computeExtendedFairnessStats`** — 499 permutations off `Math.random` by default, so it is not
  deterministic unless handed a seeded `prng`. Pinning it means choosing that stream, which is a
  decision about the statistic rather than a characterisation of it.

---

## 6. Source hygiene

| file | before | after | what changed |
| --- | --- | --- | --- |
| `scripts/sim-fairness.characterisation.test.mjs` | — | 341 | new |
| `scripts/sim-fairness.mjs` | 6,195 | **6,195** | **untouched** |

Nothing was removed and nothing moved out. No scratch file entered the repository; the acorn
measurement and the sabotage runner live in `C:/tmp`.

**Noticed and deliberately left:** the `isMain` block (§5); that `computeFairnessStats` and its
siblings are re-exported from a module they are not defined in (§4), which is correct one-home
practice and is only worth knowing when aiming a mutation.

`node scripts/engine-reach.mjs --check scripts/sim-fairness.characterisation.test.mjs`, verbatim:

```
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/sim-fairness.characterisation.test.mjs
```

**The world fingerprint was re-run on the changed tree and matches its recorded value in
`docs/fingerprints.json`.** No mint.
