# PREPARED CLEANUP SPEC — retire the `directorV4*` migration shim

**Status: NOT EXECUTED.** Owner approves scope + runs (or approves CC to run) in a later session.
**Owner decision on record:** delete the `directorV4*` aliases (cleared-localStorage discipline, single-player).

---

## Scope decision the owner must confirm before execution

`RENAMED_KEY_MIGRATION` (`client/src/modules/raceDynamicsConfig.js:22`) holds **two** alias families:
- **Stage-5a `directorV4* → choreo*`** (9 entries, lines 24–32) ← the approved target.
- **Stage-5b-i `governorDirector*/governor* → pulk*`** (7 entries, lines 34–40) ← sibling shim.

- **Option A (DEFAULT — matches the literal decision):** remove only the `directorV4*` entries + their
  migration test block. Keeps `migrateRenamedKeys` and the `governor*→pulk*` entries. This is what drives
  the `DEPRECATED_KEY_ALIAS` count 2→0.
- **Option B (consistent extension):** the same "localStorage cleared, single-player" logic retires the
  `governor*→pulk*` shim too → remove the entire `RENAMED_KEY_MIGRATION` + `migrateRenamedKeys` + both
  migration test blocks. **Owner: opt in if you want the full shim gone.**

The steps below are written for **Option A**; the Option-B deltas are noted inline.

---

## Edits

### 1. `client/src/modules/raceDynamicsConfig.js`
- **Delete lines 24–32** (the 9 `directorV4*: 'choreo*'` entries) from `RENAMED_KEY_MIGRATION`.
  Keep the `governor*→pulk*` entries (34–40) and the `migrateRenamedKeys` function.
- Update the Stage-5a comment (line 20) that references the `directorV4*` rename.
- **Option B instead:** delete the whole `export const RENAMED_KEY_MIGRATION = {…}` (22–41), the
  `migrateRenamedKeys` function (45–54), and its call site (line 59 `const stored = migrateRenamedKeys(rawStored);`
  → replace with `const stored = rawStored;`).

### 2. `client/src/modules/raceDynamicsConfig.test.js`
- **Delete the describe block `loadRaceDynamicsConfig — directorV4* → choreo* carry-over migration`**
  (comment header + block, lines ~224–253 — 4 tests: "carries a customized old key VALUE…", "a stored
  config with NO old keys is unaffected", "an explicit new key wins…", "a migrated value is still
  validated…").
  - NOTE: the audit flagged **3** of these 4 as directorV4-touching; the 4th ("NO old keys unaffected")
    is the migration no-op test and retires with the family.
- Check line ~59: the `has expected default values` test references neither old key by value beyond the
  live `choreoSuppressChaosBonusB1: false` default assertion (KEEP — owner decided keep the spoiler).
- **Option B also:** delete the `governorDirector*/governor* → pulk* re-home carry-over` describe block
  (lines ~255–293).

### 3. Nothing else
- `directorV4*` appears in **no other source or test file** (verified: only `raceDynamicsConfig.js` +
  `raceDynamicsConfig.test.js`). No import graph fallout.

---

## Verification (run in order; all must pass)

1. `cd client && npx vitest run src/modules/raceDynamicsConfig.test.js` → green.
2. `cd client && npm test` → full unit suite green (no unexpected fallout).
3. `node scripts/audit-variant-b.mjs` → **`DEPRECATED_KEY_ALIAS` goes 2 → 0** (Option A). Confirm no new
   `IMPORT_REMOVED`/other issues introduced.
4. `node scripts/fingerprint-default.mjs cleanup-after` → **must print `fa4e3796e1e5f1a5`** (unchanged;
   the shim never affected default behaviour, only stored-config migration).
5. `node scripts/audit-race-dynamics.mjs` → `raceDynamicsConfig.test.js` flips NEEDS_OWNER_INPUT → LIVE
   (directorV4 tests gone); race-dynamics owner-queue drops from 4 tests to 1 (only the kept spoiler test).

## Commit (single, only after verification)
```
cleanup: retire directorV4* migration shim (single-player, localStorage cleared)

RENAMED_KEY_MIGRATION directorV4*→choreo* aliases + their migration tests removed.
Default behaviour byte-identical (fingerprint fa4e3796e1e5f1a5 unchanged).
DEPRECATED_KEY_ALIAS 2→0.
```

## Risk
Minimal. The shim only rewrites a **persisted config** loaded from localStorage; with storage cleared there
is nothing to migrate. Default-race behaviour is provably unchanged (fingerprint gate). The only loss is
backward-compat for a localStorage blob that still carries pre-Stage-5a `directorV4*` keys — which the owner
has confirmed does not exist.
