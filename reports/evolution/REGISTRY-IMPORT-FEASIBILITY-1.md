# REGISTRY-IMPORT-FEASIBILITY-1 — all four can import the real source, so the literals are removable and the guard is not needed

**Measure only. No literal removed, no guard built, nothing changed but this report.** The question
asked and answered: can the four files carrying hardcoded racer facts import
`client/src/modules/racer-types/` instead?

**THE ANSWER IS YES, FOR ALL FOUR, AND IT IS PROVEN BY RUNNING RATHER THAN BY READING.** The registry
imports cleanly in plain Node (23–35 ms) and in the jsdom environment the client tests use (394 ms),
serving the code-default duck 36 / 0.875 / 0.875 in both. **The guard shrinks to nothing**, exactly as
the owner's instinct said: one copy beats ten copies kept in step.

---

## 1. WHAT THE REGISTRY PULLS IN

`client/src/modules/racer-types/index.js` reaches **40 modules**. Thirty-six are inside
`racer-types/`; **four are not**:

```
client/src/modules/storage/storage.js
client/src/services/racerApi.js
client/src/services/api.js
client/src/services/apiClient.js
```

Five of the forty reference browser-only globals: `index.js` (`localStorage`),
`SpriteRacerType.js` (`document`), `spriteTinter.js` (`document`, `HTMLCanvasElement`),
`storage.js` (`localStorage`, `sessionStorage`, `window`, `navigator`), `apiClient.js` (`window`).

**None of that blocks a Node import, and the code says so on purpose.** `storage.js:64` reads
`if (typeof localStorage === 'undefined') return fallback;` under a comment that names this exact
case: *"NO `localStorage` AT ALL IS NOT A FAILURE — it is node. The sim and all three fingerprint
[instruments]…"*. **Node is a supported environment for this module by design, not by luck.**

**The one visible side effect in Node is noise, not failure.** Sprite warmup logs to stderr:

```
[warmup] buggy FAILED: Image is not defined
[warmup] buggy mask FAILED: Image is not defined
...
```

The import completes and every value is correct. This is already known and already handled —
`scripts/lib/raceDriver.mjs` silences it around its own import with a comment saying why.

## 2. IT ALREADY WORKS — MEASURED IN BOTH ENVIRONMENTS

| environment | result | cold import | duck served | types |
|---|---|---|---|---|
| **plain Node** (harness) | **OK** | **23 / 35 / 23 ms** | 36 / 0.875 / 0.875 | 20 |
| **vitest + jsdom** (client tests) | **OK** | **394 ms** | 36 / 0.875 / 0.875 | 20 |

The jsdom figure is higher because vite transforms all forty modules; in that environment `Image` and
`localStorage` both exist, so the warmup noise does not even appear. **The jsdom result was taken with
a throwaway probe test run inside `client/src/modules/parity/` and deleted in the same block** — it is
not committed, and its numbers are above rather than in the tree.

**And thirteen instruments already do this**, which is the strongest evidence available:
`lib/raceDriver.mjs`, `camera-fingerprint.mjs`, `render-fingerprint.mjs`, `camera-replay.mjs`,
`check-ending-frame.mjs`, `exp-anchor-truth-ab.mjs`, `finish-band-truth.mjs`,
`diag/start-formation.mjs`, `sprite-size-truth.mjs`, `endgame-width-truth.mjs`,
`floor-reach-truth.mjs`, `label-names-truth.mjs`, `line-visible-truth.mjs`. The import path is not
novel; the four files with literals are the exception, not the rule.

## 3. PER FILE — the answer, and it does not differ between Node and the client

| file | runs in | already imports client/src | **can import the registry?** | marginal cost |
|---|---|---|---|---|
| `scripts/sim-fairness.mjs` | Node | **13 modules** | **YES** | ~25 ms once |
| `scripts/parity/goldenRunner.mjs` | Node **and** jsdom | ~10 modules | **YES, both** | ~25 ms (Node); ~394 ms per vitest file |
| `scripts/diag/acceptance-orders.mjs` | Node | 6 modules | **YES** | ~25 ms once |
| `scripts/diag/micro-divergence.mjs` | Node | 6 modules | **YES** | ~25 ms once |

**No file is a new coupling.** All four already import between six and thirteen modules from
`client/src`; the registry is one more from the same tree.

**The only file where the cost is worth a second look is `goldenRunner.mjs`**, because four vitest
files import it. Worst case 4 × 394 ms ≈ **1.6 s added to a suite that measured 46–53 s** — about 3%,
and only if vite does not share the transform across files in the pool. Against races that take
4–15 seconds each, it is not a consideration.

## 4. THE ONE REAL SUBTLETY: `displaySize` IS MUTABLE, `bodyFill` IS NOT

This is the part a naive `getRacerTypeById(id).config` would get wrong, and it is worth having found
before any literal was removed.

`index.js:539` calls `_applyStoredTunableOverrides()` **at module load**. It reads
`storageGet(KEYS.RACER_TYPE_OVERRIDES)` and calls `applyTunableOverride`, which does
`type.config[fieldName] = value` — **it mutates the shared config object in place.** And
`TUNABLE_FIELDS` contains **`displaySize`** and **`speedMultiplier`** — two of the four fields these
tables carry.

So in an environment with a populated `localStorage` (jsdom has one; a browser certainly does), a
developer's Dev-Screen tuning could reach a parity harness through `.config.displaySize`. In Node it
cannot — `storageGet` returns the fallback — but a harness should not depend on which environment it
happens to be in.

**There is an override-immune source and it is already exported.** `CONFIG_SNAPSHOT` is a frozen
capture of every tunable field's code default, taken **before** any boot override is applied:

| field | tunable? | override-immune source |
|---|---|---|
| `bodyFillX`, `bodyFillY` | **no** | `getRacerTypeById(id).config` — never mutated |
| `displaySize`, `speedMultiplier` | **yes** | **`CONFIG_SNAPSHOT[id]`** |

Verified: `CONFIG_SNAPSHOT.duck.displaySize === 36`, `speedMultiplier === 0.85`, and
`TUNABLE_FIELDS.includes('bodyFillX') === false`. **All four fields the tables carry are available in
a form no stored override can move.** That is the recipe a removal piece should use.

## 5. WHAT THE OWNER SHOULD WEIGH BEFORE ORDERING THE REMOVAL

Two honest costs, neither of which I think is decisive, stated so the decision is not made on the
upside alone.

**(a) A racer-type edit would start moving the golden races, silently.** Today `goldenRunner`'s
literals mean editing `DuckRacerType.js` changes nothing in the parity suite — it drifts instead.
Imported, that edit would change which races the goldens run, with no warning at the point of edit.
**This is the one genuine argument for literals, and I think it is the weaker case**: the same is
already true of every other engine input `goldenRunner` imports (`raceCore`, `rowLayout`,
`durationModel`, the behaviour and dynamics configs), drift is the failure this arc has actually paid
for twice, and `engine-reach --check` exists to flag engine-reaching changes.

**(b) The registry is a heavier dependency than a literal** — 40 modules, reaching `services/` and
`storage/`, with a load-time side effect (the override application) and stderr noise in Node. Every
harness that adopts it inherits that. Thirteen already have, at 25 ms, without incident.

## 6. THE ANSWER TO THE QUESTION AS PUT

**All four CAN import the real source. Their literals are removable, and the guard disappears rather
than shrinks.** A guard that keeps two tables and two constant-sites in step with the registry would
be enforcing a duplication that does not need to exist — which is what the owner suspected and it is
correct.

**One qualifier, so the "guard disappears" claim is not larger than the evidence.** A remover would
still be free to leave a literal deliberately — and if any ever is, it would need something watching
it. But nothing found here needs to be left: all four sites carry values the registry can serve, and
after GOLDEN-TABLE-REGISTRY-1 all of them already match it, so removal is a pure de-duplication with
no value change and no re-baseline.

## WHAT WAS NOT RUN, AND WHAT DETERMINED THE ANSWER (R15e)

**Client suite, browser gate, all four fingerprints, the 80-race sheet: NOT RUN.** This block adds one
report and changes no code — the only file written outside `reports/` was a probe test that was
deleted before commit. Nothing executable changed, so no check can answer differently. The jsdom probe
and the Node imports above are the measurements this piece is made of, and they are quoted rather than
summarised.

## PROPOSALS

**P1 (the recommendation) — order the removal, and have it read `CONFIG_SNAPSHOT` for `displaySize`
and `speedMultiplier` and `.config` for `bodyFillX`/`bodyFillY`.** Four files, no value changes, no
golden movement (the values already match after GOLDEN-TABLE-REGISTRY-1), and the class of defect
ends rather than being policed. **It should still be verified the way Piece 1 was**: parity suite
before and after, and the `simArm` hash of a case per affected type shown unchanged — a removal that
silently moved a race would be the same failure in a new coat.

**P2 (mine) — `surfaceClasses` in `goldenRunner` should be deleted rather than imported.** It is never
read, and the registry's field of that name answers a different question, so importing it would create
a fresh disagreement where today there is only dead weight.

**P3 (mine) — the removal is the moment to decide about `TRACK_TYPES` (`goldenRunner.mjs:90`), which
has no readers at all.** Same class: a plausible-looking constant nothing checks and nothing uses.
