# SHIP-CONFIG — a stored config holds what he CHOSE

**2026-08-09.** Merge commit `fff64bc9`, tag `v-ship-config`, return point `pre/ship-config`
(`01c0932d`). Followed [docs/SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md).

## The fingerprint line — all four re-run on master, none moved

```
WORLD       dc4647be0f55ebdb  ->  dc4647be0f55ebdb   UNCHANGED
WORLD-OFF   854018ee5d3d83e1  ->  854018ee5d3d83e1   UNCHANGED
CAMERA      ad07c08ce5d8ae49  ->  ad07c08ce5d8ae49   UNCHANGED
RENDER      752df7bc61ef0721  ->  752df7bc61ef0721   UNCHANGED
```

**All four were RE-RUN on the merged master, not carried over from the branches**, because
`engine-reach --check` says four of the touched paths can change the race. Nothing moved, which is
the expected answer. Values live in [fingerprints.json](../../docs/fingerprints.json); the record
needed no edit.

**Say plainly what these four do NOT prove here.** The fingerprint harnesses build their config from
`DEFAULT_CONFIG_WORLD` and never call a loader, so a change to how a config is STORED is invisible to
all four of them. They answer "did any value move" — worth asking, and asked — but the acceptance for
this ship is the world-blob comparison and the config badge, both in
[CONFIG-DIFF-2](../night/CONFIG-DIFF-2.md).

## What merged

**17 files, one merge commit, ONE strand.** `feat/config-diff-1` → `feat/config-diff-2`: the second
extracts the rule the first wrote, so they were never separable and master got one commit.

- **CONFIG-DIFF-1** — the camera store. `saveCameraConfig` wrote the WHOLE resolved object, so one
  slider move froze every key and a later default change could never reach him. Now only what differs
  is written, plus a one-time prune of what his browser already holds. **A prune, never a reset** — he
  offered a reset and it would have thrown away weeks of tuning this keeps.
- **CONFIG-DIFF-2** — the other six stores, and `storage/configDiff.js` as the one home for the rule.
  Six had a worse LOAD side too (`{...DEFAULT, ...stored}` spread merges, where a retired key lingers
  forever), which the camera loader already prevented.

`git diff --name-only master...feat/config-diff-2` was run first, per the section this document opens
with: **17 files, all config storage plus the two night reports.** Nothing from an unrelated chain.

## The owner verified it before the ship

His board reads **6000/120** — the incident that started CONFIG-DIFF-1, where a stored 3000/80 could
not be reached by the new default — and his config badge reads **`0 race`**. Both from his own
browser, on the branch.

## The hull

`configDiff.js` is imported by three modules inside the engine-reach hull, so it **imports nothing at
all**: hull 19 → 20 files, one leaf, zero new edges. That constraint shaped the module's design — it
never touches localStorage, and `pruneStored` returns what to write rather than writing it.

## Verification on the merged state

```
$ node scripts/engine-reach.mjs --check <9 changed paths>
ENGINE REACH: 4 of 9 path(s) can change the race:
  storage/configDiff.js, autoSpriteScale.js, raceBehaviorConfig.js, raceDynamicsConfig.js
$ npm run verify        (on the branch)   PASS 11   FAIL 0   SKIP 4
  client-suite 3878 tests / 194 files
$ the four fingerprints (on master)       all UNCHANGED, above
$ check-doc-links / check-index / check-tags              green
```

**No default value changed.** This ship changes how values are stored and nothing else.

## Noticed but left

- **The prune writes during a read.** Every loader is now a getter that can write once, on the first
  load after the upgrade. The alternative was an app-start hook that could be forgotten.
- **The edge case is shared by all seven stores now:** a value deliberately set to today's default is
  indistinguishable from one never touched, so both follow a future change of that default. Written
  into `configDiff.js`'s header and pinned by a test. Telling them apart needs a schema, which these
  modules exist without.
