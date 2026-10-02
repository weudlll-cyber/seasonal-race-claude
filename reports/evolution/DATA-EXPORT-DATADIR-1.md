# DATA-EXPORT-DATADIR-1 — `npm run data:export` reads `RA_DATA_DIR`

**2026-10-02.** Night chain, piece 5. Branch `fix/data-export-datadir` off master `a96c9762`.

## What was wrong

`scripts/data-export.mjs:45` built its data root as `join(ROOT, "server", "data")` and never looked
at `RA_DATA_DIR`. On an install laid out as [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) says — the
data outside the release directory — it measured the wrong directory. RELEASE-BASICS-1 (2026-10-01)
documented the defect instead of fixing it and put it on the BACKLOG tidy list (row C).

## What changed

- **`scripts/data-export.mjs`** — the data root is now `resolveDataRoot()` from
  `server/src/dataPaths.js`, imported the same way `scripts/backup.mjs` imports it (a dynamic
  `import(pathToFileURL(...))` of the one resolver; no second resolver). The comparison against
  `server/seeds` is unchanged: the seeds ship with the code, not with the data. The header comment
  says the data root may be elsewhere, and the "nothing to export" message prints the resolved path
  instead of the literal `server/data`.
- **`scripts/data-export.test.mjs`** (new) — two `node:test` cases. The script is a top-level CLI,
  so it is RUN, not imported: each test copies the real `data-export.mjs` and the real
  `dataPaths.js` into a scratch copy of the repository's shape under `os.tmpdir()`, with a scratch
  `server/data` and `server/seeds`, and runs it with `--list` (which writes nothing). No real data
  root is touched. The new file is found by `scriptTestFiles()` (`verify.mjs:650`) by its name.
  - *RA_DATA_DIR set*: the file only the `RA_DATA_DIR` directory holds is listed as UNIQUE; the file
    only the scratch `server/data` holds is not mentioned; the shared seed file is still counted as
    identical to `server/seeds`.
  - *RA_DATA_DIR unset*: the file in the scratch `server/data` is listed as UNIQUE.

## Sabotage

| mutation at `data-export.mjs:53` | red | why |
| --- | --- | --- |
| the fix reverted: `const DATA = join(ROOT, "server", "data")` | *RA_DATA_DIR set* (the other passed) | assertion: output did not match `/UNIQUE\s+datadir-only\.json/` |
| a second resolver with no default: `const DATA = process.env.RA_DATA_DIR` | *RA_DATA_DIR unset* (the other passed) | the script exits non-zero (`existsSync(undefined)` throws), so `execFileSync` fails |

Reverting the fix cannot redden the UNSET case, because the old fixed path and the default are the
same directory. That case is guarded by the second mutation, which is a realistic way to get it
wrong. Both mutations were restored and the two tests were green again.

## Documents corrected

- `docs/DEPLOYMENT.md`, "Roll back a bad update" → "Moving to a different machine": the
  parenthetical saying `data:export` is NOT the tool for this layout is removed.
- `docs/SETUP.md` §9: "reads a fixed `server/data`" now says it reads the same data directory the
  server does (`RA_DATA_DIR`, else `server/data`).
- `docs/BACKLOG.md` PART ONE row C: the item is struck through and marked CLOSED 2026-10-02. The row
  stays open for its other items.
- `docs/OPEN.md` item 12: the parenthetical records that the item left the tidy list. The "ten
  smaller items" count is unchanged, because it did not change when this item joined on 2026-10-01
  (`git log -L` on those lines).

## Correction to two release reports (append-only, so recorded here)

[reports/release/RELEASE-BASICS-1.md](../release/RELEASE-BASICS-1.md) (inventory row 21, and "Noticed and
left") and [reports/release/MORNING-RELEASE-1.md](../release/MORNING-RELEASE-1.md) say that
`npm run data:export` ignores `RA_DATA_DIR`. **From this piece on, that is no longer true.** The
reports are append-only (`reports/README.md`) and were not edited. The line numbers they cite
(`:45`, `:106-121`, `:187-208`) have moved by eight lines.

## Counts

PART ONE of `docs/BACKLOG.md` (above `# PART TWO`) has **14** unchecked `- [ ]` rows before and after
this piece (`awk '/^# PART TWO/{exit} /^- \[ \]/{n++} END{print n}'`), which matches OPEN.md's
"fourteen". Row C stays open.

## Noticed and left

- `docs/ENVIRONMENT.md:61` lists `RA_DATA_DIR`'s default but names no consumers, so it needed no
  change.
- `server/data/README.md` describes `data:export` as "read-only against this directory". That is
  still true, so it was not touched.
