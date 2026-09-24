// ============================================================
// File:        migrate.test.mjs
// Path:        scripts/migrate.test.mjs
// Project:     RaceArena — MIGRATION-LEDGER-1
// Description: The three things worth testing: a pending migration RUNS and is recorded, an
//              APPLIED one is refused a second run, and — the sabotage — deleting the ledger
//              WRITE causes the double-run test to FAIL. If the sabotage does not fail the test,
//              the test was decoration.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { runMigrations, readLedger, writeLedger, LEDGER_FILENAME } = await import(
  pathToFileURL(join(HERE, 'migrate.mjs')).href
);

const scratch = () => mkdtempSync(join(tmpdir(), 'ra-migrate-test-'));

/**
 * A fake migration whose `run` counts how many times it fires. The ledger is what stops the
 * second run, so the counter is the test's ONLY question.
 */
function makeCounterMigration() {
  const state = { runs: 0, stateSaysApplied: false };
  return {
    state,
    migration: {
      id: 'counter-1',
      description: 'Counts how many times it runs',
      alreadyAppliedByObservableState: () => state.stateSaysApplied,
      run: async ({ dryRun }) => {
        if (!dryRun) state.runs += 1;
        return { changed: 1, skipped: 0, total: 1, dryRun };
      },
    },
  };
}

test('runs a pending migration and records it in the ledger', async () => {
  const root = scratch();
  try {
    const { state, migration } = makeCounterMigration();
    const report = await runMigrations({ dataRoot: root, migrations: [migration] });

    assert.equal(state.runs, 1);
    assert.equal(report.entries[0].state, 'applied');

    const ledger = readLedger(root);
    assert.equal(ledger.applied.length, 1);
    assert.equal(ledger.applied[0].id, 'counter-1');
    assert.ok(ledger.applied[0].appliedAt, 'appliedAt missing');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('REFUSES to run twice: a second call is a no-op that reads "already-applied"', async () => {
  const root = scratch();
  try {
    const { state, migration } = makeCounterMigration();
    await runMigrations({ dataRoot: root, migrations: [migration] });
    assert.equal(state.runs, 1);

    const secondReport = await runMigrations({ dataRoot: root, migrations: [migration] });
    assert.equal(state.runs, 1, 'a second run leaked through the ledger');
    assert.equal(secondReport.entries[0].state, 'already-applied');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('SABOTAGE — removing the ledger WRITE makes the double-run test FAIL. If it does not, the test is decoration.', async () => {
  const root = scratch();
  try {
    const { state, migration } = makeCounterMigration();
    // Sabotage: writeLedgerFn is a no-op. The first run applies, but the second finds an empty
    // ledger and applies again.
    const noopWrite = () => {};
    await runMigrations({ dataRoot: root, migrations: [migration], writeLedgerFn: noopWrite });
    assert.equal(state.runs, 1);

    await runMigrations({ dataRoot: root, migrations: [migration], writeLedgerFn: noopWrite });

    // If the sabotage did NOT change the outcome, the test on the healthy code above was not
    // testing the ledger. Assert that with a noop writer, the migration ran a second time.
    assert.equal(state.runs, 2, 'sabotage failed to change behaviour — the double-run guard is decoration');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('observable-state fallback: an already-migrated instance with no ledger is backfilled, not re-run', async () => {
  const root = scratch();
  try {
    const { state, migration } = makeCounterMigration();
    state.stateSaysApplied = true;

    const report = await runMigrations({ dataRoot: root, migrations: [migration] });
    assert.equal(state.runs, 0, 'observable-state=true should not re-run');
    assert.equal(report.entries[0].state, 'backfilled-from-state');

    const ledger = readLedger(root);
    assert.equal(ledger.applied.length, 1);
    assert.equal(ledger.applied[0].backfilled, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('dry-run runs nothing and writes no ledger', async () => {
  const root = scratch();
  try {
    const { state, migration } = makeCounterMigration();
    const report = await runMigrations({ dataRoot: root, migrations: [migration], dryRun: true });

    assert.equal(state.runs, 0);
    assert.equal(report.entries[0].state, 'would-run');
    assert.equal(existsSync(join(root, LEDGER_FILENAME)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a malformed ledger is a HARD ERROR — silence would re-run everything', async () => {
  const root = scratch();
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, LEDGER_FILENAME), '{"applied": "not an array"}');
    const { migration } = makeCounterMigration();
    await assert.rejects(
      () => runMigrations({ dataRoot: root, migrations: [migration] }),
      /malformed/i
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writeLedger uses atomic rename — the JSON is well-formed on disk', async () => {
  const root = scratch();
  try {
    writeLedger(root, { applied: [{ id: 'x', appliedAt: '2026-09-24T00:00:00.000Z' }] });
    const raw = readFileSync(join(root, LEDGER_FILENAME), 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.applied[0].id, 'x');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the teams-1 migration in the default registry has the observable-state probe', async () => {
  const { buildDefaultMigrations } = await import(pathToFileURL(join(HERE, 'migrate.mjs')).href);
  const migrations = await buildDefaultMigrations();
  const teams = migrations.find((m) => m.id === 'teams-1');
  assert.ok(teams, 'teams-1 not registered');
  assert.ok(typeof teams.alreadyAppliedByObservableState === 'function');
  assert.ok(typeof teams.run === 'function');

  // A data root with a users.json where every user has a team should say APPLIED.
  const root = scratch();
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'users.json'),
      JSON.stringify([{ id: 'u1', username: 'a', team: 'Founding' }])
    );
    assert.equal(teams.alreadyAppliedByObservableState({ dataRoot: root }), true);

    // A user missing team → PENDING.
    writeFileSync(
      join(root, 'users.json'),
      JSON.stringify([
        { id: 'u1', username: 'a', team: 'Founding' },
        { id: 'u2', username: 'b' },
      ])
    );
    assert.equal(teams.alreadyAppliedByObservableState({ dataRoot: root }), false);

    // No users.json (fresh install with no users) → APPLIED (a no-op is done).
    rmSync(join(root, 'users.json'));
    assert.equal(teams.alreadyAppliedByObservableState({ dataRoot: root }), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
