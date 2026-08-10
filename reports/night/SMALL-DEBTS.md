# SMALL-DEBTS — three long-standing items, none of them visible

**Branch:** `feat/small-debts`, off master `be4202c8`. **Not merged, not minted.**
**Nothing here changes behaviour.** No default, no engine file — `engine-reach --check`: *none of 3
path(s) can reach the race engine.*

---

## 1. `CameraDirector._ceremonyBeat` — REMOVED, and it took two imports with it

Written on construction and again on **every countdown frame**; read by nothing, in the source or in
any test. Eleven blocks walked past it.

Removing it was three lines and then two more, which is the part worth reporting:

```
this._ceremonyBeat = null;                                 // constructor
this._ceremonyBeat = ceremonyAt(elapsed, schedule).beat;   // every countdown frame
```

The second line was the **only** caller of `ceremonyAt` in this file, and `CEREMONY_BEAT` was already
imported and already unused (eslint had been warning about it on master). So a dead field was keeping
a live function call and two imports alive: the countdown was calling `ceremonyAt` sixty times a
second to compute a value nobody would ever read.

`startCeremony.js` still exports both, and both are still used there and in `startCeremony.test.js` —
nothing was deleted from the module that owns them.

**Result: `eslint src/modules/camera/CameraDirector.js` is now clean.** It was not before.

## 2. `MIN_ROWS = 6` — RENAMED to `PREFERRED_ROWS`, and documented

**It is not a floor for small fields. It is the shape of every ordinary board.**

```js
rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.ceil(n / MAX_COLS)));
rows = Math.max(1, Math.min(rows, n || 1));
```

| racers | rows × cols |
|---|---|
| 4 | 4 × 1 |
| 10 | **6 × 2** |
| 20 | **6 × 4** |
| 30 | **6 × 5** |
| 31 | 7 × 5 |
| 70 | 14 × 5 |
| 100 | 20 × 5 |

**The row count is 6 for every field from 6 to 30 racers** — a 10-racer board is six rows by two
columns, not two by five. Above 30 the constant is inactive and rows grow while columns stay at 5.
Below 6 the clamp on the next line takes over.

**I renamed rather than only commenting, and the block asked me to say which and why.** "MIN" reads
as a rarely-hit floor, so a reader who trusts the name gets the layout backwards for the entire
ordinary range — and this is one of two constants that decide the whole block's proportions. A
comment under a misleading name is read second. The comment is there too, with the table's
consequence in one sentence.

One constant, one use site, no export. Nothing else referenced `MIN_ROWS`.

## 3. `docs/VERIFY-RULES.md` — the routing section was WRONG in two ways

It said:

> **There are seven guards, and the route table in `scripts/verify.mjs` is the one home for which
> paths select which.**

**Both halves are false after VERIFY-ROUTING-2 and VERIFY-BASE-1.**

- **There is no route table.** VERIFY-ROUTING-2 deleted `ROUTES` from `verify.mjs`. Each guard now
  answers `--declare` with what it covers, what it is blind to and which paths select it, and
  `scripts/lib/routing.mjs` asks every guard instead of consulting a list. **The one home is the
  guard itself** — pointing at a deleted table is worse than pointing nowhere.
- **There are not seven guards. There are fifteen** — 2 suite guards declared in `routing.mjs` plus
  13 scripts discovered by `guardScripts()` scanning `scripts/`.

**I did NOT write "fifteen".** The set is *discovered* by a directory scan, so any number in a
document is a number that goes stale the next time a guard is added — which is exactly how "seven"
got there. The section now says the set is discovered and points at `--dry` for the current one.

**One "seven" was left alone, deliberately.** R0a narrates the SHIP-THE-LINE incident and quotes the
run's actual output (`PASS 0 FAIL 0 SKIP 7`). That is a transcript of a past day and correct as
history; it now says "all seven guards THERE WERE THAT DAY" so nobody reads it as current.

---

## VERIFICATION

```
engine-reach --check (3 paths)      none can reach the race engine
camera-fingerprint                  ad07c08ce5d8ae49   UNCHANGED
render-fingerprint                  752df7bc61ef0721   UNCHANGED
vitest camera/ + RaceScreen/drawing/   786 passed, 20 files
eslint                              clean (CameraDirector.js was NOT clean before)
```

The world fingerprint was not run and is not owed: `engine-reach` clears all three paths, and neither
`CameraDirector.js` nor `startBoardRendering.js` is in the hull.

## SOURCE HYGIENE

| file | +/− | what |
|---|---|---|
| `client/src/modules/camera/CameraDirector.js` | +0 −4 | the field's two writes, plus the `ceremonyAt` and `CEREMONY_BEAT` imports they were keeping alive |
| `client/src/screens/RaceScreen/drawing/startBoardRendering.js` | +8 −1 | rename + the seven-line explanation |
| `docs/VERIFY-RULES.md` | +14 −6 | the routing section corrected; one historical "seven" qualified |

**Four lines of code removed, nothing added.**

### Noticed but left

- **Nothing here turned out to be more than it looked**, which the block asked me to report if it
  happened. The nearest thing was item 1's tail: the dead field was load-bearing for two imports, so
  removing it was slightly *more* valuable than advertised, not less.
- **`startBoardRendering.test.js` has an unused `x`** (eslint warning, present on master). Not mine
  and not touched.
- **The `--dry` output is now the only current list of guards.** That is the right home, but it means
  a reader without a terminal cannot see the set. A generated block in the document — like the one
  `gen-ceremony-costs.mjs` writes into SHIP-CEREMONY.md — would fix that, and is not this block's job.
