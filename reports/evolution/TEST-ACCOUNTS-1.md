# TEST-ACCOUNTS-1 — eight files stopped sharing one row

**Branch:** `fix/test-accounts-1`, off master `afebc3f7`. **MERGE APPROVED**, and merged.

## WHAT WAS SHARED, COUNTED RATHER THAN ESTIMATED

The brief said nine files. **Measured, it is eight files sharing one ROW and ten sharing one
STORE** — the difference matters, because they are two different defects and only one of them was
named.

| how the file gets a user                          | files | which                                                                                                   |
| ------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| `adminAgent` / `operatorAgent` → the `testadmin` row | **8** | authz.integration, sessionInvalidation, users.integration, brands, playerGroups, racers, surfaceClasses, tracks |
| `defaultStore` directly, own users per test        | **2** | changePassword, changePasswordContract                                                                    |
| its own store on a random path                     | **5** | authRouter, usersStore, recoverAdmin, setupContract, session                                              |
| no user at all                                     | **6** | csrf, guards, rateLimit, routePolicyDrift, dataPaths, seedRuntime                                         |

**How that was established — by enumeration, and the commands are here so it can be re-run rather
than believed:**

```
grep -c defaultStore|adminAgent|operatorAgent|createUsersStore   over every server/**/*.test.js
grep -rnE "username: *'[^'$]*'"  over every server test file     # fixed-literal user names
```

The second sweep is the one that matters: **every fixed username literal in the server tests was
listed and classified.** All of them outside the eight are inside files that build their own store
on a `randomUUID()` path (`alice`, `Bob`, `soleadmin`, `toctou1` …), so they cannot collide with
anything. **`testadmin` and `testoperator` were the only two literals naming a row in the SHARED
store, and both were in one file** — `server/test/authAgent.js`. There is no third.

## THE LATENT INSTANCE — REPRODUCED, NOT ASSERTED

`sessionInvalidation.test.js` creates three admins and promotes a fourth.
`users.integration.test.js` asserts that deleting and demoting `testadmin` returns **409 because it
is the only admin**. Both statements cannot be true of one store.

**Why it was latent, and this is the finding worth more than the fix:** the store was never actually
shared, and the reason was invisible. `env-setup.js` bound `RA_USERS_DB` to
`racearena-test-users-${process.pid}.json` and **deleted that file before every test file** — and
vitest's default pool gives each test file its own process anyway, so the path was unique twice
over, by accident. **Nothing in `users.integration.test.js` said it needed an empty store.** Its
precondition was a comment (`// testadmin is the only admin in the store`) held up by a line in
another file that no reader of this one would ever see.

Take the accident away and it goes red immediately. On **master**, with the per-file delete removed
and the module registry shared (`--no-isolate`), the two files in the same process:

```
 × admin DELETE last admin → 409          AssertionError: expected 200 to be 409
 × admin demote last admin → 409          AssertionError: expected 200 to be 409
 … 9 tests red in users.integration.test.js
```

**That is the brief's instance, executed.** It is not reachable through any flag the project
actually uses, which is exactly what "latent" means and exactly why it was worth removing.

## THE FIX — TWO HALVES, NEITHER SUFFICIENT ALONE

**1 · No shared row.** `authAgent.js` mints a user per call (`ra-admin-<uuid>`), creates it, logs in
as it, and attaches the record to the agent as `agent.raUser`. Eight call sites are untouched — the
signature is the same — and the one file that needed to name its own account now asks the agent
instead of writing a literal. **`USERNAME_TAKEN` is no longer swallowed**: with unique names it
would mean the generator had failed, and catching it would hide precisely that.

**2 · No shared store.** `env-setup.js` binds `RA_USERS_DB` to a `randomUUID()` path. A setup file
runs once per test FILE, so that is one store per file — **and no delete**, because a delete is what
made the isolation invisible in the first place. "The users this file created" and "every user in
the store" are now the same set by construction.

**Unique names in a shared store would still leave the admin COUNT global; a per-file store would
still leave a fixed name to collide on.** Both, or neither.

**3 · The precondition is asserted, not assumed.** The two sole-admin tests now read the list and
assert `admins.length === 1` before exercising the guard. **Nothing was weakened** — the 409
assertions are untouched, and this is a new assertion in front of them.

**Nothing was serialised and nothing retries.** The opposite: `server/package.json`'s test script
**drops `--no-file-parallelism`**, because that flag was serialisation standing in for isolation and
the isolation is now real.

## PROOF — FIVE CONSECUTIVE FULL SERVER-SUITE RUNS, UNCHANGED BETWEEN THEM

`npm test` in `server/`, nothing touched between runs:

| run | files          | tests             |
| --- | -------------- | ----------------- |
| 1   | 23 passed (23) | **650 passed (650)** |
| 2   | 23 passed (23) | **650 passed (650)** |
| 3   | 23 passed (23) | **650 passed (650)** |
| 4   | 23 passed (23) | **650 passed (650)** |
| 5   | 23 passed (23) | **650 passed (650)** |

**And three runs in RANDOM FILE ORDER** (`--sequence.shuffle.files`), which is the property this
block is actually about: **23/23 files, 650/650 tests, three times.**

## TWO ORDER DEPENDENCIES THAT REMAIN, BOTH NAMED RATHER THAN FIXED

**A test that only passes in one order is a finding, so here are both of them.**

**1 · `users.integration.test.js` depends on its OWN order, and that is pre-existing.** Under a full
`--sequence.shuffle` (which shuffles tests *within* a file as well as files), it goes red — **and it
goes red on master too, before this block**, so it is not something introduced here. The cause is
structural rather than sloppy: the file is a SEQUENCE — create a user, read it back, update it,
delete it, assert the next DELETE is 404 — and a step of that sequence has no meaning on its own.
**I have not "fixed" it**, because the only fixes available are to weaken it into independent tests
that each re-create the world (slower, and it stops testing the sequence) or to accept a shuffle
mode nothing uses.

**2 · The per-file store depends on `isolate`, and that is new.** `usersStore.js` reads
`RA_USERS_DB` **once, at import**. Under `--no-isolate` the first file to import fixes the path for
the whole worker, and the two sole-admin tests go red. **They now go red on the PRECONDITION,
naming the cause** — `expected 7 to be 1` — where before this block nine tests went red on the
symptom, `expected 200 to be 409`. That is the honest limit: this makes the shared store per-file,
it does not make the store's path lazy, and making it lazy is a production change for a harness mode
the project does not use.

## WHAT BREAKS IF EACH CHANGE IS REVERTED

- **`authAgent.js` back to `testadmin`** — eight files share a row again. Nothing turns red
  immediately; the next assertion anyone writes about that row is a lie waiting for a file order.
- **`env-setup.js` back to the pid path + delete** — the sole-admin tests go back to being true
  because of a line in another file, and the delete hides it again.
- **The `admins.length === 1` assertions** — the two 409 tests go back to failing on the symptom, so
  the next person to break this spends the afternoon in the users router rather than in the fixture.
- **`--no-file-parallelism` back in `package.json`** — the suite is serial again, which costs wall
  clock and, worse, re-hides whatever coupling arrives next.

**No fingerprint can move:** nothing under `client/src` or `scripts/` changed, so no instrument's
closure contains a changed file. `npm run verify`: PASS 5, FAIL 0.

## PROPOSALS

1. **Make `RA_DATA_DIR` per test file too.** It is still `??=` per process, so the five route test
   files that write tracks, brands, racers, surface classes and player groups share one directory
   whenever two of them land in the same worker. It has not bitten yet — those files use unique ids —
   but it is the same shape as the defect this block removed, one level down, and it will be found
   the same way: by something that reads the WHOLE store and asserts on it.
2. **Give `createApp()` an injectable store.** `createAuthRouter` already takes one — `setupContract.test.js`
   passes it — but `createApp()` takes nothing, which is why the two sole-admin tests have to own the
   process's whole store instead of a store of their own. One optional argument would let them state
   their precondition instead of inheriting it, and it would close the `isolate` dependency above
   properly rather than naming it.
