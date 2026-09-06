# RACE-STORE-2 — the database the races will live in

**Date:** 2026-09-06
**Branch:** `feat/team-races-1` (continued — no new branch). **NOT merged; the topic merges once, at
the end.**
**Fingerprints:** none minted. `engine-reach --check` selects nothing (line quoted below).
**Owner's decisions this rests on, 2026-09-05/06:** races are stored on the server · a race is
visible to everyone in the same team · SQLite, because it is already installed and running · tracks,
racers and brands stay as files.

**THE SHELF ONLY.** Nothing writes to this store and nothing reads it. There is no route, no client
change, and no race path calls any of it — that is the next piece.

---

## The precondition, and what was re-verified

`git ls-remote --heads origin` showed exactly `master` (`bcf41a9b`), `night/2026-09-05` (`80f7118e`)
and `feat/team-races-1` (`68ca53f0`). Work continued on `feat/team-races-1`.

Re-verified at source, all three as the brief stated:

- `server/src/auth/session.js:79` opens a `better-sqlite3` database, and it is the **only** use of
  the driver in `server/src` — confirmed by grep, which finds the import at `session.js:10` and
  nothing else outside tests.
- `tracks.js`, `racers.js`, `brands.js`, `playerGroups.js` (and `surfaceClasses.js`) all read and
  write JSON with `readFileSync`/`writeFileSync`.
- There is no race or result route of any kind: `server/src/routes/` holds tracks, racers, brands,
  player groups, surface classes, seed notices and `_defaultPromote` — nothing else.

---

## Where the database file lives, and why not the session database

**`DATA_ROOT/races.sqlite` — its own file, its own handle, `RA_RACES_DB` to redirect it.** Sharing
`sessions.sqlite` was the obvious economy and is refused. The full argument is at source in
`raceStore.js`; the four reasons in short, the first decisive on its own:

1. **Sessions are disposable and races are the record.** Clearing sessions is a legitimate
   operational act. If the two share a file, that act deletes the race history — at exactly the
   moment somebody is already troubleshooting.
2. **The session file's schema is not ours.** `better-sqlite3-session-store` creates its table,
   chooses its columns, and runs a sweep timer that DELETEs from it every fifteen minutes. Our
   tables would live in a file a third-party library believes it owns.
3. **The lifetimes already disagree.** `session.js` uses `:memory:` under test, so races sharing
   that handle would vanish between test files while production wrote to disk — the store would be
   exercised in a mode it never ships in.
4. **Backup and retention diverge.** A session row expires in thirty days; a race is kept forever.

`RA_RACES_DB` mirrors `RA_USERS_DB` deliberately, so the isolation the suites already rely on works
here without a second mechanism.

---

## The schema

Three tables. Column-per-fact for anything a person reads or a query filters on; a canonical JSON
string only where the value is an opaque bag.

```
rosters      id (sha256) · content
racer_types  id (sha256) · content
races        id (sha256) · team · team_normalized · finished_at
             identifier_version · build_id
             geometry_id · racer_type_id · race_plan_seed · race_action_stage
             race_plan_enabled · target_laps · target_duration_sec
             world_schema_version · world_configs
             roster_id -> rosters(id) · racer_types_id -> racer_types(id)
             elapsed_sec · results · winners

INDEX races_by_team (team_normalized, finished_at DESC)
```

`racerTypeId` sits on the **race**, not in `racer_types`: it is a per-race choice of which type to
run, one short string, and folding it into the shared row would split that row every time the choice
changed while the tuning did not.

There is deliberately **no `size` column** on `rosters`. The field size is the roster's length, and a
stored count would be a second copy of a derived fact — the shape that drifts. (It was written, then
removed on review for exactly that reason.)

---

## Reference by content, and how collisions are ruled out

The id of a roster, a racer-type set and a race is the **SHA-256 of its canonical JSON**. Identical
content therefore lands once and a repeat is recognised as already stored, with no bookkeeping.

The property that matters more is the one it gives for free: **a content address cannot be
reassigned.** A counter id says "row 7", and row 7's meaning depends on what row 7 currently holds.
A content id is a statement about a value, not about a slot.

`canonicalJson` is **imported, never copied** — `client/src/modules/raceConfigWorld.js` states that
rule in its own header ("never copy this logic — import it"), and the cross-package import is the
established pattern, matching `scripts/sim-fairness.mjs:111`. That module's own `hashWorld` is
**not** used: it is FNV-1a folded to 32 bits, which is a fine cache key and is not a content address
— at 32 bits a collision is expected within a few tens of thousands of values, and here that would
mean one race silently resolving to another race's roster. The serialisation is shared; the digest
deliberately is not.

**Collisions are ruled out in two parts, and the second is the one that matters:**

1. SHA-256, on non-adversarial input (the owner's own Dev Screen values).
2. **The store does not rely on that alone.** Every insert whose id already exists re-reads the
   stored content and compares it byte for byte with what is being written. Equal → the row is
   reused. **Unequal → `HASH_COLLISION` is thrown.** So the guarantee is not "a collision is
   improbable" but "a collision is detected and refused rather than corrupting a race".

---

## ★ A stored row is never overwritten and never updated in place

The owner's requirement of 2026-09-06. He changes racer values on the Dev Screen regularly; a race
that ran last week must not change its outcome because a setting moved afterwards.

**Enforced three times over**, because a rule that lives only in today's code is a rule until
somebody adds a second writer:

| | mechanism | holds when |
|---|---|---|
| (a) | **Content addressing** — changed values hash to a different id, so they are a different row by construction and there is no slot to write over | always, by design |
| (b) | **No UPDATE statement exists in the module** — every write is an INSERT | while this file is the only writer |
| (c) | **SQLite triggers refuse UPDATE on all three tables** | a future route, a CLI, a writer who forgets (a) and (b) |

**DELETE is deliberately not blocked**, and that is a decision rather than an omission: the
requirement is about overwriting, and whether the owner may one day forget a race is his to decide,
not mine to prejudge with a trigger he would have to find and remove. The orphan case — deleting a
roster an old race still points at — is already refused by `PRAGMA foreign_keys = ON`, and there is
a test for it.

### The proof the brief asked for, specifically

`store a race, CHANGE the racer values, store a second race: the first still resolves to the ORIGINAL
values, byte for byte`:

1. Last week's race stored on `normalSpeed: 150`.
2. The Dev Screen changes the beetle to `175`; today's race stored — same `racerTypeId`, same
   roster, same track.
3. The changed values got a **new reference and a new row** (`racerTypes` count: 2).
4. **Re-reading the first race yields the original `racerTypeOverrides` and `effectiveRacerTypes`**,
   and the assertion is on the **canonical string**, not a deep-equal — the stored bytes are the
   bytes that were hashed.
5. Today's race resolves to the new values. Both are true at once.

**No update-in-place is permitted anywhere in the design**, so there was nothing of that class to
name and fix.

---

## ★ The one thing this cannot protect against

**If the engine code changes, an old race can run differently from identical stored values.**

Nothing in this store can see that and nothing in it tries. It stores inputs faithfully; identical
inputs pushed through different code are a different race. The stored `build_id` records *which
build ran*, so a mismatch is at least detectable, but detecting it is not repairing it — the outcome
would still differ.

That is precisely what the fingerprints exist to detect, and it is where the boundary of this piece
is. **No proposal is made here.** What re-running an old race should mean once the history exists —
refuse on a build mismatch, run it anyway with a warning, or store outcomes and compare — is the
owner's decision, and it is not prejudged by anything in this store.

---

## Field-by-field: what the identifier encodes, and where it lands

Read from `client/src/modules/raceIdentifier.js` and confirmed by **decoding a real identifier** —
the payload keys and the decoded fields were enumerated from the running module, not from the
comments.

| identifier field | payload key | where it lands |
|---|---|---|
| `RACE_IDENTIFIER_VERSION` | `v` | `races.identifier_version` |
| `buildId` | `b` | `races.build_id` |
| `geometryId` | `g` | `races.geometry_id` |
| `racerTypeId` | `t` | `races.racer_type_id` |
| `names` (roster, in order) | `n` | `rosters.content` — **shared, content-addressed** |
| `fieldSize` | — | **not stored: derived.** `raceIdentifier.js:24-26` says the same — implied exactly by the roster length and never encoded twice. `hydrate` derives it. |
| `racePlanSeed` | `s` | `races.race_plan_seed` |
| `raceActionStage` | `a` | `races.race_action_stage` |
| `racePlanEnabled` | `p` | `races.race_plan_enabled` |
| `targetLaps` | `l` | `races.target_laps` |
| `targetDurationSec` | `d` | `races.target_duration_sec` |
| `world.schemaVersion` | `w.sv` | `races.world_schema_version` |
| `world.configs` | `w.c` | `races.world_configs` — **stored RESOLVED, see below** |
| `world.racerTypeOverrides` | `w.o` | `racer_types.content` — **shared, content-addressed** |
| `world.effectiveRacerTypes` | `w.e` | `racer_types.content` — **shared, content-addressed** |
| `worldWidth` / `worldHeight` | not encoded | **not stored.** `raceIdentifier.js:34-38`: they reach the CameraDirector and `renderRaceFrame`, no engine file. They decide what a race looks like, not who wins. |
| `trackSurfaceClasses` | not encoded | **not stored.** Same note: it reaches only `r.surfaceEmitter`, which no engine file reads. |

**Every field is accounted for, and the accounting is a TEST rather than this table.**
`raceStore.test.js` decodes a real identifier and fails if any decoded field is neither stored nor
listed as deliberately absent, naming the field and the fix in the message. Verified non-inert:
removing `geometryId` from the accounted set produces
`raceIdentifier.js yields geometryId, which the store neither stores nor declares absent`. A second
test asserts the decoder still yields neither `worldWidth`, `worldHeight` nor `trackSurfaceClasses`,
so the two documented omissions rest on the module's behaviour rather than on its comment.

### The one field stored in a different SHAPE, and why

`world.configs` is stored **resolved**, where the identifier sends a **diff** against shipped
defaults. Same information — diff + defaults *is* the resolved config, which is exactly what
`applyDiff` reconstructs — so nothing the identifier encodes is lost.

The identifier compresses because **length was its binding constraint**: it has to fit in a string a
person can hand to someone else, and IDENTIFIER-LENGTH-1 measured 4,008 characters with typability
as the whole problem. A database has no such constraint, so inheriting that compression would
inherit its cost with none of its benefit — and the cost is real: **a diff means nothing without the
defaults it was taken against**, so once `defaults.js` moves, every stored race's config would be
readable only by going back through git for the old defaults. Resolved, the row says what the config
was, forever, on its own. `build_id` is kept regardless, because which build ran is a fact about the
race and not merely a key for decoding it.

---

## Proof

| requirement | result |
|---|---|
| the same content stored twice yields one row and the same reference | ✓ roster and racer-types, both directions (different content → different row) |
| a race is found by its team and not by another team's | ✓ including normalised matching and newest-first ordering |
| the no-overwrite proof | ✓ above, asserted on the canonical string |
| every identifier field stored or listed absent | ✓ enforced by a test, proven non-inert |

**`raceStore.test.js` — 26 tests, all passing.** Also covered: race-level idempotence (storing the
identical race twice yields one row), roster **order** as content (a name is physics — `stablePairBit`
hashes it — so a reordering is a different roster), transactional rollback (a refused race leaves no
orphan roster behind), persistence across close/reopen, and the database's own refusal of an UPDATE.

### Sabotage, twice — and what caught each

**(a) Break the content-reference so two identical rosters store twice.** `contentId` was made
non-deterministic (a random value folded into the hash), so identical content produced a different
id every time.

> **Caught by 4 tests**, headed by `the same roster stored twice yields ONE row and the SAME
> reference`, plus the racer-types twin, race idempotence, and the test asserting the reference *is*
> the SHA-256 of the canonical content.

**(b) Make a changed racer set overwrite its predecessor's row.** The racer-values row was addressed
by *which* types are tuned rather than *how*, so changed values landed on the same id — and the
newer content was written over the old row.

> **Caught by the DATABASE, not by an assertion:**
> `SqliteError: racer_types rows are immutable — changed content is a NEW row, never an edit
> (RACE-STORE-2)`.
> The trigger — layer (c), the one that exists for writers who forget layers (a) and (b) — aborted
> the write, and the no-overwrite test reported it. This is the outcome the three-layer design was
> built for, demonstrated rather than asserted.

Both sabotages were reverted; zero markers remain and the suite is green.

---

## ★ What the test suites write, and where

The brief asked me to establish this either way, because 28 test accounts once reached the owner's
live store.

**The server suites are already isolated, and have been since 2026-06-17.**
`server/test/env-setup.js` runs as a `setupFiles` entry for both vitest projects and sets
`RA_DATA_DIR` to a fresh `mkdtempSync` temp directory, plus `RA_USERS_DB` to a unique per-file path
(tightened from per-process to per-file by **TEST-ACCOUNTS-1**, `20868394`, 2026-08-18). So the
default `DATA_ROOT/races.sqlite` would already have been a temp path under test.

**★ This corrects a claim in [TEAMS-1.md](TEAMS-1.md).** That report said the suites "write into the
real dev data directory" and proposed "an isolated `RA_USERS_DB` for the server suite" as the fix.
**That was wrong — the isolation already existed.** The 28 debris accounts are dated 2026-08-22,
which is *after* TEST-ACCOUNTS-1 landed, so they cannot be attributed to the current suite
configuration either; **their origin is not established** and I am not going to guess at one. What is
established is what the configuration does today, and it isolates.

**These tests do not rely on that.** Every `createRaceStore` call in `raceStore.test.js` is handed an
**explicit** path in the OS temp directory and deletes it (with its `-wal`/`-shm` companions)
afterwards. Verified empirically after the full run and both sabotages: `server/data/` contains
`sessions.sqlite` and **no `races.sqlite`**.

**Nothing was created by hand during this piece** — no account, no record, no file in the owner's
data directory — so there was nothing to delete again.

---

## Checks

| check | result |
|---|---|
| `raceStore.test.js` | **26 passed** |
| server suite | **780 passed / 780** (33 files) |
| `npm run verify` (plain, not `--premerge`) | **PASS 9, FAIL 0, SKIP 20** — exit 0, 50.5 s |
| `engine-reach --check` | selects nothing |

```
ENGINE REACH: none of 3 path(s) carry a change that can reach the race engine.
  3 outside the hull (cannot reach the engine at all): server/src/races/raceStore.js, server/src/races/contentAddress.js, server/src/races/raceStore.test.js
```

Nothing selected, so **nothing was minted**.

`verify` ran twice: once on the code alone, and again after the report and its INDEX line landed,
since a new report selects `check-index`, `check-doc-links` and `check-config-claims`. Both passed;
the figure above is the second. The 20 skips are the camera/render/world/client guards, each
reporting `nothing changed` — no client file was touched by this piece.

Master has no server lint or format scripts — they exist only on `night/2026-09-05` and are not this
branch's concern, as the brief states and as TEAMS-1.md already recorded.

> **Small correction to [TEAMS-1.md](TEAMS-1.md)'s check table:** it records the server suite as
> "725 passed / 725 (31 files)". That figure was taken from a run made *before* `teams.test.js` was
> added; the branch tip actually carried **32** server test files and 754 tests, which the `verify`
> run in that same report exercised and passed. The suite is now 33 files and 780 tests with this
> piece's 26. No result changes — the number quoted was simply an intermediate one.

---

## Source hygiene

**New files only. No existing file was modified by this piece.**

| file | lines |
|---|---|
| `server/src/races/contentAddress.js` | 75 |
| `server/src/races/raceStore.js` | 404 |
| `server/src/races/raceStore.test.js` | 436 |

No scratch file entered the repository; the sabotage backups and the codemod helper live in the
session scratchpad.

### Noticed and deliberately left

- **A backtick inside the SQL template literal broke the parse** while I was editing the schema
  comment — `` `raceIdentifier.js` `` inside a `` ` ``-delimited string. Fixed at the time (the SQL
  comments now use no backticks) and recorded because the failure mode is invisible in review: it
  reads as an ordinary comment and takes out the whole module.
- **`server/data/users.json.bak-20260801-234105`** sits beside the live store. Not mine, not touched.
- **The 28 debris accounts are gone** — the owner's store now holds three users (`Weudl`,
  `testoperator`, `testadmin`), all carrying `Seasonal Entertainment`, so TEAMS-1's backfill
  persisted correctly through his cleanup.
- **`_db` is exported from the store** for tests only, flagged `@internal`. It is what lets the
  suite prove the *database* refuses an UPDATE rather than trusting that the module contains no
  UPDATE statement. A route must never reach for it.
- **No `RA_RACES_DB` documentation in `docs/ENVIRONMENT.md`.** That file lists the environment
  variables and gained none here; the variable is introduced by this piece but the store has no
  consumer yet. It belongs in that document when the route lands, and is named here so it is not
  discovered as an omission.

---

## Open for the owner

1. **What re-running an old race should mean when the engine has changed** — the limitation above.
   Nothing is proposed.
2. **Whether a race may ever be deleted.** DELETE is currently allowed by the triggers and
   constrained only by foreign keys; blocking it would prejudge a decision that is his.
