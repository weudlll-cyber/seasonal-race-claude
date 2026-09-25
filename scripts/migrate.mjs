#!/usr/bin/env node
// ============================================================
// File:        scripts/migrate.mjs
// Path:        scripts/migrate.mjs
// Project:     RaceArena — MIGRATION-LEDGER-1
//
// A record, in the data root, of which migrations an instance has already applied — and a runner
// that applies only the pending ones and REFUSES to run any migration twice.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
// Today there is exactly one migration script (`scripts/migrate-teams.mjs`) and NOTHING records
// which migrations an instance has already applied. That is survivable ONLY because the one
// existing migration is idempotent. A future one that isn't would be run twice and nothing would
// stop it. This runner fills the gap: a small append-only ledger at `<dataRoot>/migrations.json`,
// a registry keyed by stable ids, and a rule that decides pending-vs-applied.
//
// ── ★ THE RULE FOR ALREADY-APPLIED vs PENDING (state this in the header, per the brief) ─────────
//   1) An entry in `<dataRoot>/migrations.json` with a matching `id` means APPLIED — done.
//   2) The ledger did not exist before this runner did, so a working instance may have run a
//      migration already without leaving a ledger entry. Each migration therefore carries an
//      `alreadyAppliedByObservableState({ dataRoot })` probe that reads the DATA to answer the
//      question "does this instance already look like the migration finished?". If it says yes,
//      the ledger is BACKFILLED (with the timestamp marked `backfilled: true` so it is clear
//      later that the entry did not come from a run this tool did) and the migration is NOT run.
//      For the teams backfill the probe is: every user in `users.json` carries a well-formed
//      `team` field — that is exactly what the migration would produce.
//   3) Otherwise the migration is PENDING and will be run.
//
// ── THE REFUSAL RULE ────────────────────────────────────────────────────────────────────────────
// Even if a caller passes `--force`, this runner does not accept it. A ledger that could be told
// to lie is a ledger that has nothing to say. If a migration truly needs to be re-run, the
// operator deletes the id from `<dataRoot>/migrations.json` by hand — that is a deliberate,
// visible act.
//
// ── DEPENDENCY INJECTION FOR THE TEST ───────────────────────────────────────────────────────────
// `runMigrations` accepts `{ writeLedgerFn, readLedgerFn, migrations }` so the sabotage-test can
// swap them for stubs and the double-run test can prove that the LEDGER WRITE is the mechanism
// that stops the second run.
//
// ── USAGE ───────────────────────────────────────────────────────────────────────────────────────
//   node scripts/migrate.mjs                 Apply every pending migration.
//   node scripts/migrate.mjs --dry-run       Report what would be applied; write nothing.
//   node scripts/migrate.mjs --status        List all migrations and their state; write nothing.
// ============================================================

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/** The name of the ledger file inside the data root. Stated once, referred to nowhere else. */
export const LEDGER_FILENAME = 'migrations.json';

/**
 * Where the races database lives, for a given data root.
 *
 * ★ ONE HOME, used by BOTH halves of the `race-source-1` migration — the probe that decides whether
 * it needs to run and the run itself. Two spellings of "where is the database" is how a probe comes
 * to answer about one file while the work touches another. It mirrors `raceStore.js`'s own
 * `DEFAULT_RACES_PATH` (`RA_RACES_DB`, else `<dataRoot>/races.sqlite`) rather than importing it,
 * because importing that module would drag `better-sqlite3` into the registry — which is exactly
 * what the note on `buildDefaultMigrations` forbids.
 */
function racesDbPath(dataRoot) {
  return process.env.RA_RACES_DB ?? join(dataRoot, 'races.sqlite');
}

/**
 * Read the ledger. Missing file → { applied: [] }. Malformed → THROW; a torn ledger is not
 * silently treated as "nothing applied", which would re-run everything.
 */
export function readLedger(dataRoot) {
  const path = join(dataRoot, LEDGER_FILENAME);
  if (!existsSync(path)) return { applied: [] };
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.applied)) {
    throw new Error(
      `migrations.json at ${path} is malformed — expected { applied: [...] }, got ${JSON.stringify(parsed).slice(0, 120)}`
    );
  }
  return parsed;
}

/**
 * Write the ledger atomically (write to `.tmp`, rename). The rename is atomic on the same
 * filesystem, so a crash mid-write leaves either the old file or the new one — never a torn one.
 */
export function writeLedger(dataRoot, ledger) {
  mkdirSync(dataRoot, { recursive: true });
  const path = join(dataRoot, LEDGER_FILENAME);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  renameSync(tmp, path);
}

/**
 * The registry. Each entry is a migration.
 *
 * The teams backfill entry re-uses `migrateTeams` from `server/src/auth/migrateTeams.js` rather
 * than re-implementing it here — one home for the work, this runner is only the schedule.
 *
 * ★★ BUILDING THE REGISTRY MUST NOT NEED THE SERVER TREE INSTALLED. Only RUNNING a migration may.
 * `migrateTeams.js` imports `usersStore.js`, which imports `bcrypt`, so importing it here — which
 * is what this function did until 2026-09-24 — made the mere act of listing the migrations depend
 * on `server/node_modules`. That reddened CI: the "Living-doc guards + script tests" job installs
 * the ROOT tree only, on the standing assumption (stated in its own comment in
 * `.github/workflows/ci.yml`) that the script suite has no external dependencies. The heavy import
 * now lives inside `run()`, where the work actually happens; the registry itself is free.
 *
 * `teams.js` stays imported here on purpose: it imports NOTHING, so the observable-state probe
 * below keeps working with no server dependency installed — which is the whole point, since the
 * probe is what decides whether the migration needs to run at all.
 */
export async function buildDefaultMigrations() {
  const { isWellFormedTeam } = await import(
    pathToFileURL(join(ROOT, 'server/src/auth/teams.js')).href
  );

  return [
    {
      id: 'teams-1',
      description: 'Every user without a team joins the founding team (TEAMS-1).',
      /**
       * The observable-state probe. Looks at `users.json` directly; asks "would the migration
       * find any work to do here?". If there is no `users.json`, the instance has no users, and
       * a migration over no users is a no-op — mark it applied.
       */
      alreadyAppliedByObservableState({ dataRoot }) {
        const usersPath = join(dataRoot, 'users.json');
        if (!existsSync(usersPath)) return true;
        let users;
        try {
          users = JSON.parse(readFileSync(usersPath, 'utf8'));
        } catch {
          return false;
        }
        if (!Array.isArray(users)) return false;
        return users.every((u) => isWellFormedTeam(u.team));
      },
      async run({ dryRun }) {
        // ★ Imported HERE, not in the registry builder: this is the first point at which the
        // server tree is genuinely needed. See the note on `buildDefaultMigrations` above.
        const { migrateTeams } = await import(
          pathToFileURL(join(ROOT, 'server/src/auth/migrateTeams.js')).href
        );
        return migrateTeams({ dryRun });
      },
    },
    {
      id: 'race-source-1',
      description:
        'The races table gains a race_source column (RACE-SOURCE-1). Existing rows keep NULL, ' +
        'which reads as a TEST race.',
      /**
       * The observable-state probe, for an instance that ran before the ledger existed.
       *
       * ★ IT ANSWERS FROM THE FILE'S EXISTENCE ALONE, and that is a deliberate limit. Reading the
       * SCHEMA would need `better-sqlite3`, and the rule stated on `buildDefaultMigrations` above is
       * that BUILDING the registry — and therefore probing it — must not need the server tree
       * installed, because CI's script-suite job installs the root tree only. So: no races database
       * means no races have ever been stored here and nothing to alter, which is APPLIED. A database
       * that does exist falls through to `run()`, which imports the driver and is itself a no-op
       * when the column is already there. The cost of the limit is one no-op run; the cost of
       * getting it wrong the other way would be a red CI job on every push.
       */
      alreadyAppliedByObservableState({ dataRoot }) {
        return !existsSync(racesDbPath(dataRoot));
      },
      async run({ dryRun, dataRoot }) {
        // ★ Imported HERE and not above, for the reason in the registry note: this is the first
        // point at which `better-sqlite3` is genuinely needed.
        const { migrateRaceSource } = await import(
          pathToFileURL(join(ROOT, 'server/src/races/migrateRaceSource.js')).href
        );
        return migrateRaceSource({ dbPath: racesDbPath(dataRoot), dryRun });
      },
    },
  ];
}

/**
 * The runner. Returns a report describing every registered migration and what happened to it.
 */
export async function runMigrations({
  dataRoot,
  dryRun = false,
  migrations,
  readLedgerFn = readLedger,
  writeLedgerFn = writeLedger,
  now = () => new Date().toISOString(),
} = {}) {
  if (!dataRoot) throw new Error('runMigrations: dataRoot is required');
  const registry = migrations ?? (await buildDefaultMigrations());
  const ledger = readLedgerFn(dataRoot);
  const appliedIds = new Set(ledger.applied.map((e) => e.id));

  const report = { dataRoot, dryRun, entries: [] };
  let mutated = false;

  for (const m of registry) {
    if (appliedIds.has(m.id)) {
      report.entries.push({ id: m.id, state: 'already-applied' });
      continue;
    }
    if (m.alreadyAppliedByObservableState?.({ dataRoot })) {
      report.entries.push({ id: m.id, state: 'backfilled-from-state' });
      if (!dryRun) {
        ledger.applied.push({ id: m.id, appliedAt: now(), backfilled: true });
        mutated = true;
      }
      continue;
    }
    // ★ `dataRoot` travels to `run()` as well as to the probe (RACE-SOURCE-1, 2026-09-25). The
    // runner already knows it and already hands it to `alreadyAppliedByObservableState`; a
    // migration that had to resolve it again would be a second way of finding the same directory,
    // and the two would disagree the first time an env override moved one of them. `teams-1`
    // ignores the argument and resolves its own path, which is left alone — changing a migration
    // that has already run everywhere buys nothing.
    const runResult = await m.run({ dryRun, dataRoot });
    report.entries.push({ id: m.id, state: dryRun ? 'would-run' : 'applied', runResult });
    if (!dryRun) {
      ledger.applied.push({ id: m.id, appliedAt: now() });
      mutated = true;
    }
  }

  if (mutated && !dryRun) writeLedgerFn(dataRoot, ledger);
  return report;
}

// ── CLI entry ────────────────────────────────────────────────────────────────────────────────────
const isCli =
  import.meta.url ===
  pathToFileURL(process.argv[1] ?? '').href.replace(/\/$/, '');

if (isCli) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const statusOnly = args.includes('--status');

  const { resolveDataRoot } = await import(
    pathToFileURL(join(ROOT, 'server/src/dataPaths.js')).href
  );
  const dataRoot = resolveDataRoot();

  try {
    const report = await runMigrations({ dataRoot, dryRun: dryRun || statusOnly });
    console.log(`[migrate] data root: ${report.dataRoot}`);
    for (const e of report.entries) {
      const tail = e.runResult
        ? ` (${e.runResult.changed} changed, ${e.runResult.skipped} skipped of ${e.runResult.total})`
        : '';
      console.log(`[migrate]   ${e.id}: ${e.state}${tail}`);
    }
    if (dryRun) console.log('[migrate] DRY RUN — the ledger was not written.');
    if (statusOnly) console.log('[migrate] STATUS ONLY — the ledger was not written.');
    process.exit(0);
  } catch (err) {
    console.error(`[migrate] FAILED: ${err.code ?? ''} ${err.message}`);
    process.exit(1);
  }
}
