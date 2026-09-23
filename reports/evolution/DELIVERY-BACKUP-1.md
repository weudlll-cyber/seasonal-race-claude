# DELIVERY-BACKUP-1 — a backup that survives a restore, and a written way back

> **In one sentence: this install can now be backed up with one command while it is running, the
> backup has been proven by destroying a data directory and bringing it back with the server reading
> it, and `docs/DEPLOYMENT.md` finally tells someone how to upgrade — including how to go back.**

**Branch `feat/delivery-backup-1`, off master `842371e6`. 2026-09-23.** Two of the four delivery
blockers NIGHT-2026-09-24 named are closed. The other two — no browser test in CI, and no public
address — are untouched by this block.

★ **No real data was involved at any point.** Every test ran against a scratch `RA_DATA_DIR` under
`C:/tmp/ra-backup-test`, behind an assertion re-checked before each destructive step that the target
was a scratch path and was not the real root. The real root was confirmed untouched at 18 entries
throughout, and the scratch tree is deleted.

---

## 1 · THE GROUND TRUTH, CHECKED BEFORE ANYTHING WAS BUILT

All three facts the brief named hold, and a fourth had to be established because the backup's scope
depends on it.

| claim | verdict |
|---|---|
| all runtime state under one root, `RA_DATA_DIR`, resolved by `dataPaths.js` | **TRUE** — `resolveDataRoot()` at `:16-19`, default `server/data`, never `process.cwd()` |
| that root is gitignored, only its README tracked | **TRUE** — `.gitignore` `server/data/**` + `!server/data/README.md`; `git ls-files server/data/` returns the README alone |
| exactly one migration script, run by hand with a `--dry-run` | **TRUE** — `scripts/migrate-teams.mjs`, documented at `SETUP.md` §10 |

★★ **THE FOURTH, FOUND WHILE CHECKING THE FIRST, AND IT CHANGES THE TOOL.** "All runtime state lives
under one root" is true **by default** and can be made false by three environment variables:
`RA_USERS_DB`, `RA_SESSION_DB` and `RA_RACES_DB` each relocate ONE store. They exist for test
isolation — `raceStore.js:30-32` says so in as many words — not for deployment. **A backup of the
root alone would then be missing a store and would not look wrong.** That is the exact failure this
block exists to prevent, so the tool checks all three and **refuses**, naming the variable and the
path. It is not a stop: the ground truth is not contradicted, it is qualified, and the tool handles
the qualification.

---

## 2 · ★★★ THE ROUND TRIP, PERFORMED — the centre of this report

Run against the **final** code, after every fix below. A scratch instance on port 4401 with a scratch
`RA_DATA_DIR`.

**1 · Build a scratch instance and put real data in it, through the server.**

```
setup  -> 201 {"username":"backuptester","role":"admin","team":"Seasonal Entertainment"}
login  -> 200 {"username":"backuptester","role":"admin","team":"Seasonal Entertainment"}
race   -> 201 {"id":"358a48aa…648b1","shortKey":"MKP4HV","alreadyStored":false}
```

**2 · Back it up — with the server still running.**

```
data root : C:\tmp\ra-backup-test\data
sqlite    : sessions.sqlite — 12288 bytes (online backup)
sqlite    : races.sqlite — 188416 bytes (online backup)
items     : 29 (54682082 bytes before archiving)
archive   : …\racearena-backup-20260923T175510Z.tar (54704640 bytes)
```

**3 · ★ Destroy the scratch data root completely.**

```
=== 2. DESTROY the scratch root ===
   before: 14 entries
   after : exists = false
   real root untouched: 18 entries
```

**4 · Restore from the archive.**

```
restored  : 29 item(s) into C:\tmp\ra-backup-test\data
```

**5 · Start the server against the restored root and make the SERVER read the data back.**

```
login -> 200

   account signs in on the restored root : YES
   total races readable                  : 172
   the ORIGINAL race MKP4HV is present   : YES (clientRaceId backup-roundtrip-0001, seed 4242)

ROUND TRIP: PASS
```

★ **Not "the files are there."** The account authenticated against the restored `users.json` and the
restored session database, and the stored race was read out of the restored SQLite file with its
`clientRaceId` and seed intact. **172 rather than 1** because the under-load proof below had by then
written 171 more races into the same instance; the original is present among them, which is the
assertion that matters.

---

## 3 · THE SECOND PROOF, UNDER LOAD — and it found a real bug

Back up while races are actively being written, restore, and ask SQLite whether the result is sound.
**This is the case the file-copy warning is about, and it is the only test that could have found what
it found.**

```
--- BACK UP WHILE THE DATABASE IS BEING WRITTEN ---
   sqlite    : races.sqlite — 188416 bytes (online backup)
   items     : 29 (54682082 bytes before archiving)
   races written during/around the backup: 53
--- restore that archive into a fresh directory ---
   restored  : 29 item(s)
--- SQLite integrity check on the restored databases ---
   races.sqlite: integrity_check=ok foreign_key_check=0 races_rows=171 -> OK
   sessions.sqlite: integrity_check=ok foreign_key_check=0 races_rows=n/a -> OK

UNDER-LOAD BACKUP: PASS — consistent snapshot while writing
```

★★ **THE BUG IT FOUND, ON THE FIRST ATTEMPT.** The run crashed with
`ENOENT … races.sqlite-journal`. SQLite's rollback journal appears and disappears between the
directory listing and the read; my exclusion pattern covered `-wal` and `-shm` and not `-journal`.
**The quiet round trip could never have produced it** — no journal exists when nothing is writing.

Fixed two ways, and the second matters more than the first:

1. **Side files are never archived.** `-journal`, `-wal` and `-shm` belong to a database already
   copied consistently through `.backup()`. **Restoring a stale journal beside a consistent snapshot
   invites SQLite to roll that snapshot back to a state that never existed** — the archive would have
   been actively harmful, not merely larger.
2. **Any OTHER file that vanishes mid-run is now a refusal, not a skip.** A side file is excluded by
   pattern, so anything else disappearing is real data changing underneath, and silently omitting it
   is precisely the half-archive this tool refuses to produce.

---

## 4 · THE SABOTAGE — run for real, not simulated

The brief: make the sqlite step silently skip the database; the round-trip test must fail.

**`scripts/backup.mjs`'s actual sqlite loop was patched to `continue` on every database**, and the
suite re-run:

```
✖ ROUND TRIP: a database with rows survives backup → destroy → restore (73.9581ms)
✔ SABOTAGE: a backup that silently skips the database FAILS the round trip
```

**The round-trip test went RED.** The patch was then reverted, the file verified to contain no
sabotage, and the suite re-run green (7 pass, 1 skipped). ★ A test that still passes with the
database omitted is not testing the database; this one does not.

---

## 5 · TESTS

`scripts/backup.test.mjs`, 8 tests, in the scripts suite.

| test | state |
|---|---|
| the archive name carries a UTC stamp, so two backups never collide | pass |
| REFUSES when the data root is missing | pass |
| REFUSES to write the archive inside the data root | pass |
| REFUSES when a per-store override points outside the data root | pass |
| REFUSES when an item under the root cannot be read | **skipped on Windows** |
| transient SQLite side files are never archived | pass |
| ROUND TRIP: a database with rows survives backup → destroy → restore | pass |
| SABOTAGE: a backup that silently skips the database fails the round trip | pass |

★ **The skip is honest and is not hidden.** Windows does not honour `chmod 000`, so the unreadable
item cannot be produced there; the test detects that and skips with that reason rather than passing
vacuously. **It will run on CI's Linux runner.** The refusal itself was exercised by hand.

---

## 6 · SOURCE HYGIENE

| | |
|---|---|
| added | `scripts/backup.mjs` (**327 lines**), `scripts/backup.test.mjs` (**213 lines**) — counted, not estimated |
| changed | `docs/DEPLOYMENT.md` (+83), `docs/OPEN.md` (+9) |
| removed | nothing |
| **reused, not rebuilt** | `server/src/dataPaths.js` — `resolveDataRoot()` is imported, never re-derived, so the tool follows the default if it ever moves |
| **written rather than shelled out** | the USTAR writer. `tar` is not present on a default Windows box with the same flags, and a backup tool that depends on an external binary fails on the machine where it is needed most |
| **noticed but left** | the `.github/workflows/deploy.yml.disabled` blockers, the absent `scripts/deploy.sh`, and the `RA_PUBLIC_ORIGIN` placeholder. All three are delivery items in `OPEN.md` and none is a backup question |

★ **One defect of mine, recorded at the line rather than quietly fixed.** `HERE` was first computed
from `new URL(import.meta.url).pathname`, which percent-encodes the spaces in this repository's
path. The CLI guard therefore matched nothing and **the tool exited 0 having done absolutely
nothing** — the worst possible shape for a backup tool. It uses `fileURLToPath` now, and the comment
says why.

---

## 7 · WHAT THIS DOES **NOT** ESTABLISH

- **One machine, one operating system.** Everything here was proven on Windows with Node 24.14.0.
  The archive format is platform-neutral by construction, but **nobody has restored a backup taken on
  one machine onto a different one**, and that is the case a real disaster-recovery would be.
- **The migration ledger does not exist.** Nothing records which migrations an instance has run, so
  step 6 of the upgrade procedure is a decision rather than a command. It is survivable only because
  the single existing script is idempotent. **It was deliberately not built here** — a second
  mechanism, not ordered — and is recorded in `OPEN.md`.
- **No schedule, no rotation, no off-site copy.** This is a command, not a backup *policy*. Nothing
  runs it for you, nothing prunes old archives, and an archive on the same disk as the data does not
  survive the disk.
- **The archive is not encrypted and not compressed.** It contains `users.json` with password
  hashes; treat it as sensitive.
- **The restore was into an empty directory.** Restoring over a populated root works (`--force`) but
  merges rather than replacing — it does not delete files the archive lacks.
- **Two delivery blockers remain untouched**: no browser test runs in CI, and there is no public
  address.
