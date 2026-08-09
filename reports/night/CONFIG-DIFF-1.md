# CONFIG-DIFF-1 — store what he chose, not what happened to be true

**Branch:** `feat/config-diff-1`, off master `01c0932d`. Not merged, not minted.
**No default value was changed.** This block changes how values are STORED and nothing else.

## The defect, both halves

`loadCameraConfig` was already right: it walks the keys of `DEFAULT_CAMERA_CONFIG` and takes a stored
value only where the stored object HAS that key, so a **new** key always arrives at its default.

`saveCameraConfig` wrote `{...config}` — the **whole resolved object**. So one slider move froze
every key, including the hundreds he never touched, and a default that changed afterwards could
never reach him again. That is why his start board stayed at 3000/80 after 6000/120 shipped.

## What now happens

1. **Only keys that DIFFER from the default are written.** A key equal to its default is absent from
   storage and keeps following the default.
2. **A one-time prune** of what is already in his browser: every stored key whose value equals the
   current default is dropped. What survives is exactly his real deviations. **Not a reset** — he
   offered one, and a reset would throw away weeks of tuning this keeps.
3. State profiles are diffed **per field**, not stored whole, so one changed corridor does not freeze
   the other five.

**The prune runs from `loadCameraConfig`, not from an app-start hook.** It is idempotent and writes
only when it actually drops something, so it needs no marker key and cannot half-run. A migration
that depends on someone remembering to call it is a migration that will one day not have been
called.

**One ordering bug found and fixed while building it:** `cameraConfigProvenance` read storage
*before* resolving, so on the first run after the upgrade it would have reported `stored` for keys
the prune had just removed — wrong on exactly the run where that instrument matters most.

## ⚠ The edge, and it is in the code

**A value he deliberately set to today's default is indistinguishable from one he never touched.**
Both are absent from storage, so both follow a future change of that default. If he sets
`minRacersVisible` to 5 while the default is 5 and the default later becomes 7, he gets 7.

Telling them apart would mean storing intent, which means a schema — and this file exists precisely
without one. The alternative is storing everything, which is the bug above and is worse: it freezes
hundreds of keys to buy certainty about a handful. Written into the module header **and pinned by a
test**, so nobody "fixes" it later and reintroduces the freeze.

## The other stores — named, not fixed

**Six have the same save-everything shape, and all six are worse than the camera one was**, because
their loaders are `{...DEFAULT, ...stored}` spread merges — so a retired key also lingers forever,
which the camera loader already prevented by iterating the default keys.

| store | module | load | save |
|---|---|---|---|
| `autoScaleConfig` | `autoSpriteScale.js` | `{...DEFAULT, ...stored}` | whole object |
| `baseSpeedConfig` | `baseSpeedConfig.js` | `{...DEFAULT, ...stored}` | whole object |
| `frameTimingConfig` | `frameTimingConfig.js` | `{...DEFAULT, ...stored}` | whole object |
| `raceBehaviorConfig` | `raceBehaviorConfig.js` | `{...DEFAULT, ...stored}` | whole object |
| `raceDynamicsConfig` | `raceDynamicsConfig.js` | `{...DEFAULT, ...stored}` | whole object |
| `rowLayoutConfig` | `rowLayoutConfig.js` | `{...DEFAULT, ...stored}` | whole object |

**Fixed none of them, as instructed.** Two of the six — `raceBehaviorConfig` and
`raceDynamicsConfig` — feed the RACE, so changing what they store is a world-fingerprint question
and belongs in its own block with its own mint. That is the owner's call.

## Tests — consequence form, five sabotages

A test of the writer alone passes while the bug is live, so every test goes
**storage → load → a default changes → load** and asserts what he ends up with. 11 tests.

| required consequence | |
|---|---|
| a config written the old way still yields his chosen values | ✅ |
| a key he never touched follows a CHANGED default | ✅ — plus the negative twin: the same config **without** the prune stays frozen, which is the incident reconstructed |
| a NEW key still arrives at its default | ✅ |
| a value equal to the default is not written | ✅ |
| the prune keeps a genuine deviation, drops a coincidental match | ✅ |

| sabotage | red |
|---|---|
| save the whole object again | 3 |
| skip the prune on load | 1 |
| keep keys equal to the default | 5 |
| prune everything | 6 |
| `valuesEqual` by reference only | 1 |

**One existing test had to change, and its intent did not.** `cameraConfig.test.js`'s "saving does
not stamp anything onto what he stored" used `minRacersVisible: 5` as an arbitrary payload — and 5
**became the default at SHIP-THREE**, so under the diff rule it is correctly not written. The
assertion was encoding the old save-everything shape by accident. Fixture changed to 4, a real
deviation; the intent (no `schemaVersion` stamped) is untouched and still asserted. That is also a
live demonstration of the edge case above.

## Verification

```
$ node scripts/engine-reach.mjs --check client/src/modules/cameraConfig.js …
ENGINE REACH: none of 3 path(s) can reach the race engine.
```

**The block expected reachability, and it does not hold — worth stating rather than glossing.** The
hull contains `storage/defaults.js` and `storage/storage.js`, but **I did not need to touch either**:
the change is entirely inside `cameraConfig.js`, the storage CRUD module, which is not in the hull.
So the world fingerprint is **not** selected by the new routing, and that is correct — the
fingerprint harnesses pass `DEFAULT_CAMERA_CONFIG` directly and never call `loadCameraConfig`, so
they cannot see this change at all.

**I ran it anyway**, because the block named the value and the owner's real question is "did any
value move": **`dc4647be0f55ebdb` — unchanged.**

`npm run verify` once, on the branch: result in the reply. It routes client-suite,
check-config-keys, check-fallback-agreement, check-writable and fingerprint-containment — no
fingerprint script, for the reason above.

## Source hygiene

| file | +/− | what |
|---|---|---|
| `client/src/modules/cameraConfig.js` | +118 −4 | `valuesEqual`, `profilesDiff`, `diffFromDefaults`, `pruneStoredCameraConfig`; `saveCameraConfig` writes the diff; the prune call in `loadCameraConfig`; the provenance ordering fix; the header section including the edge case |
| `client/src/modules/cameraConfigDiff.test.js` | +160 −0 | new |
| `client/src/modules/cameraConfig.test.js` | +5 −2 | one fixture, intent unchanged |

Nothing removed; `saveCameraConfig`'s old body is the only line replaced.

### Noticed but left

- **The prune writes during a read.** `loadCameraConfig` is a getter that can now write once. The
  alternative was an app-start hook that could be forgotten; the trade is stated at the function.
- **`cameraConfigSurvival.test.js` still writes whole configs** as its fixture. That is correct — it
  is deliberately reproducing what his browser holds today — and it passes unchanged, which is
  itself evidence the upgrade preserves his eleven real settings.
