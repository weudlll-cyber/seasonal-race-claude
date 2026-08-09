# CONFIG-DIFF-2 — the remaining six stores, and one home for the rule

**Branch:** `feat/config-diff-2`. **Not merged, not minted.**
**No default value was changed.** This block changes how values are STORED and nothing else.

## ⚠ The branch point, stated first because it is a deviation

`feat/config-diff-2` is branched off **`feat/config-diff-1` (`da094414`)**, not off master. SHIP-CONFIG-DIFF
has not landed — master is still `01c0932d` — and this block's first instruction is to EXTRACT the rule
that only exists on `config-diff-1`. Branching off master would have meant re-writing that code in order
to move it. The two branches therefore ship together or not at all.

## One home first

`client/src/modules/storage/configDiff.js` — new, 128 lines, and it is the whole rule in three functions:

| | |
|---|---|
| `resolveFromDefaults(stored, defaults)` | walk the DEFAULT keys. A retired stored key is ignored; a new default key is present from the first launch after it ships. |
| `diffFromDefaults(config, defaults)` | keep only what DIFFERS. A value equal to its default is not stored, so it keeps following the default. |
| `pruneStored(stored, defaults)` | the one-time normalisation of what a browser already holds. PURE — it returns what to write and writes nothing. |

All seven stores now consume it. The camera is a *consumer* of the rule rather than the place it lives;
`cameraConfig.js` shrank by 95 lines (+18 −113) and its public surface is unchanged via re-exports.

**Nested blocks are handled generically, by recursing into plain objects at any depth** — not by a list of
key names. Two exist today, `cameraStateProfiles` (state → fields) and `b2AttackProgress` (`{start, end}`),
and they are structurally different, which is exactly why the rule is "recurse" and not "special-case the
profiles". Arrays are compared as values, never merged: no default is an array today, and merging by index
would silently resurrect a removed entry.

## The import direction — the block was right to ask

Three of the seven callers are **inside the engine-reach hull**: `autoSpriteScale.js`,
`raceBehaviorConfig.js`, `raceDynamicsConfig.js`. Whatever they import becomes part of the set that can
change the race.

**So `configDiff.js` imports nothing at all.** No storage, no defaults, no siblings. It grows the hull by
exactly one leaf and adds **not one edge** — hull 19 → 20 files.

That purity has a design consequence, and it is deliberate: the module never touches localStorage.
`pruneStored` returns what *should* be written and the caller — which already owns its storage key — does
the writing. The same property makes every function here testable with no storage layer at all.

```
$ node scripts/engine-reach.mjs --check <all 9 touched paths>
ENGINE REACH: 4 of 9 path(s) can change the race:
  client/src/modules/storage/configDiff.js
  client/src/modules/autoSpriteScale.js
  client/src/modules/raceBehaviorConfig.js
  client/src/modules/raceDynamicsConfig.js
```

## Retired keys — checked before dropping, as instructed

Nothing reads a key that is absent from its own defaults, so dropping retired stored keys is safe.
Verified by scanning every non-test source file for `<configVar>.<key>` reads against each store's default
key set. Two things that look like findings and are not:

- **`isOpen`** is not a stored config key at all — it is injected per race at the call site
  (`applyRacerBehavior(racers, { ...behaviorConfig, isOpen: false })`).
- **`js`** was a filename matching the property pattern.

**One hand-written migration was deleted as subsumed:** `raceBehaviorConfig`'s `speedBrakeTThreshold`
rename shim. The resolver ignores it structurally now — pinned by a test so nobody re-adds the shim.
The `startSpreadRange === 0.7` migration is a **value** migration, not a key one, and it stays.

## The acceptance — and the fingerprint is NOT it

**1. The world blob is byte-identical.** A realistic whole-object stored config — the shape the old writers
actually produced — is resolved through the loaders BEFORE and AFTER, and `hashWorld(buildWorldConfig())`
is compared. BEFORE is reconstructed in the test as the spread merge the six loaders used to be, and the
camera's BEFORE is spelled out longhand rather than borrowed from the module under test, because an
expectation must not be built from the code it is judging. Store-by-store equality is asserted first so a
failure names the store rather than only "the hash moved", and three live deviations are asserted present
so an all-defaults world cannot pass the hash check vacuously.

**2. The HUD config badge still reads `0 race`.** Asserted on an all-defaults whole-object stored config,
with a companion test proving the 0 is not vacuous — a real race deviation still counts.

**The world fingerprint: `dc4647be0f55ebdb` — unchanged, as expected.** Reporting it because the block
asked, and saying plainly that **it is the weaker instrument here**: the fingerprint harnesses build their
config from `DEFAULT_CONFIG_WORLD` directly and never call a loader, so they cannot see a storage change
at all. A green fingerprint proves nothing about this block. The two acceptance tests above can.

## Verification

```
$ npm run verify                                    PASS 11   FAIL 0   SKIP 4
  world-fingerprint   COMBINED dc4647be0f55ebdb     unchanged
  camera-fingerprint  CAMERA   ad07c08ce5d8ae49     unchanged
  render-fingerprint  RENDER   752df7bc61ef0721     unchanged
  client-suite, check-config-keys, check-config-claims, check-fallback-agreement,
  check-index, check-doc-links, check-writable, fingerprint-containment   all PASS
```

All three fingerprints were routed in — the routing was right to select them, because
`engine-reach` says four of the touched paths CAN change the race. They came back unchanged, which
is the expected answer and not the acceptance.

**Pre-commit hook run, not bypassed: GUARDS PASS 7 FAIL 0.** It also printed the mint reminder for
the four engine-reaching paths, correctly.

## Tests — 52, and six sabotages

| required consequence | |
|---|---|
| an old stored config still yields the same resolved world | ✅ per store + the world-hash comparison |
| an untouched key follows a CHANGED default | ✅ per store — the prune drops it, so the default reaches him |
| a NEW key arrives at its default | ✅ per store, plus unpruned at the rule level |
| a value equal to the default is not written | ✅ |
| a retired stored key disappears | ✅ per store, plus unpruned at the rule level |
| a genuine deviation survives the prune | ✅ |

| sabotage of the shared rule | red |
|---|---|
| save the whole object again | 20 |
| resolve by spread merge | 2 |
| never prune (`changed` always false) | 14 |
| prune everything (a reset, not a prune) | 7 |
| `valuesEqual` by reference only | 2 |
| resolve a nested block whole | 1 |

### Two holes the sabotages found, both now closed

- **"Resolve by spread merge" passed 48/48 on the first suite.** Every loader PRUNES before it resolves, so
  a retired key is already gone from storage by the time the resolver sees it — the resolver's own
  protection was never exercised. The prune and the resolver are independent mechanisms and the second now
  has its own unpruned tests.
- **"Prune everything" shrank the suite from 48 tests to 18 and five of six stores went quiet.** The
  per-store key picker skips a store it cannot perturb, and a broken rule makes every store unperturbable.
  A coverage test now asserts every store contributed a key, so the count cannot silently fall again.

**One test-authoring mistake worth recording:** the first picker chose keys by *name* and nudged
`startSpreadRange` to 1.95 — which `loadRaceBehaviorConfig` correctly rejects, because that key is bounded
at 1. The guard was right and the test was wrong. Keys are now picked by round-trip: try the nudge, keep
the key only if the loader honours it.

## Three existing tests changed, and their intent did not

The same class as CONFIG-DIFF-1's fixture change. Each asserted that `save` writes the WHOLE object, which
is precisely what this block stops.

| test | what changed |
|---|---|
| `autoSpriteScale.test.js` — "writes config to storage" | payload is the diff; `enabled: true` is now absent because it IS the default. Added the all-defaults → `{}` twin. |
| `raceBehaviorConfig.test.js` — "calls storageSet with the config" | fixture was the defaults themselves, so the diff is empty. Added a genuine-deviation twin so the test still proves something. |
| `raceDynamicsConfig.test.js` — "writes config to storage" | payload is `{reRollVariationPercent: 50}`. |

The routing each test exists to check — right key, one call — is asserted unchanged in all three.

**Full client suite: 3878 passed, 194 files.**

## Source hygiene

| file | +/− |
|---|---|
| `client/src/modules/storage/configDiff.js` | **new, 128** |
| `client/src/modules/configDiffStores.test.js` | **new, 253** |
| `client/src/modules/cameraConfig.js` | +18 **−113** |
| `client/src/modules/raceBehaviorConfig.js` | +32 −13 (the −13 is the deleted migration) |
| `client/src/modules/frameTimingConfig.js` | +26 −4 |
| `client/src/modules/raceDynamicsConfig.js` | +26 −5 |
| `client/src/modules/baseSpeedConfig.js` | +23 −4 |
| `client/src/modules/autoSpriteScale.js` | +20 −4 |
| `client/src/modules/rowLayoutConfig.js` | +20 −4 |
| three existing test files | +30 −7 |

Seven copies of a rule became one. The living code reads as if the rule always had one home.

## ⚠ The edge, unchanged and now shared by all seven

**A value he deliberately set to today's default is indistinguishable from one he never touched.** Both are
absent from storage, so both follow a future change of that default. Telling them apart needs stored intent,
which means a schema, which is the thing these modules exist without. The alternative — store everything —
is the bug this block removes. Written into `configDiff.js`'s header and pinned by a test.

## Noticed but left

- **The prune writes during a read.** Every loader is now a getter that can write once, on the first load
  after the upgrade. The alternative was an app-start hook that could be forgotten. Stated at the function.
- **`loadRowLayoutConfig` and `loadBaseSpeedConfig` reject an invalid stored value by returning the WHOLE
  default set**, not by discarding just the bad key. That behaviour predates this block and is unchanged;
  a test now pins it so the diff rule cannot be blamed for it later.
