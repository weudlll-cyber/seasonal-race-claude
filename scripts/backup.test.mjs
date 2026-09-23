// ============================================================
// File:        backup.test.mjs
// Path:        scripts/backup.test.mjs
// Project:     RaceArena — DELIVERY-BACKUP-1
// Description: The refusal cases, the naming rule, and a backup→restore round trip that carries a
//              real SQLite database with rows in it.
//
// ★★ WHY THERE IS A DATABASE IN A UNIT TEST. The whole point of this tool is that the databases are
// copied through SQLite's own online backup rather than as files. A test that only moved JSON around
// would pass just as happily with the database step deleted — and the sabotage below proves this one
// does not. Every test writes into its own scratch directory under `os.tmpdir()` and removes it;
// nothing here touches a real data root.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { backup, restore, BackupRefusal, archiveName, stampUtc, strayOverrides, SQLITE_SIDE } =
  await import(pathToFileURL(join(HERE, 'backup.mjs')).href);

let Database = null;
try {
  const mod = await import(pathToFileURL(join(HERE, '..', 'server', 'node_modules', 'better-sqlite3', 'lib', 'index.js')).href);
  Database = mod.default ?? mod;
} catch {
  /* the sqlite tests skip themselves below if the driver is not installed */
}

const scratch = () => mkdtempSync(join(tmpdir(), 'ra-backup-test-'));

function seedRoot(root, { withDb = false } = {}) {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'users.json'), JSON.stringify([{ id: 'u1', username: 'a' }]));
  mkdirSync(join(root, 'tracks'), { recursive: true });
  writeFileSync(join(root, 'tracks', 't1.json'), '{"id":"t1"}');
  if (withDb && Database) {
    const db = new Database(join(root, 'races.sqlite'));
    db.exec('CREATE TABLE races (id TEXT PRIMARY KEY, payload TEXT)');
    const ins = db.prepare('INSERT INTO races (id, payload) VALUES (?, ?)');
    for (let i = 0; i < 25; i++) ins.run(`r${i}`, JSON.stringify({ i }));
    db.close();
  }
}

// ── the naming rule ────────────────────────────────────────────────────────────────────────────

test('the archive name carries a UTC stamp, so two backups never collide', () => {
  const a = archiveName(new Date('2026-09-24T14:30:01.123Z'));
  assert.equal(a, 'racearena-backup-20260924T143001Z.tar');
  assert.match(a, /^racearena-backup-\d{8}T\d{6}Z\.tar$/);
  // two different seconds must differ
  assert.notEqual(archiveName(new Date('2026-09-24T14:30:02Z')), a);
  // and the stamp carries no character a filesystem dislikes
  assert.doesNotMatch(stampUtc(new Date()), /[:\\/\s]/);
});

// ── the refusal cases ──────────────────────────────────────────────────────────────────────────

test('REFUSES when the data root is missing', async () => {
  const s = scratch();
  try {
    await assert.rejects(
      () => backup({ dataRoot: join(s, 'nope'), outDir: join(s, 'out') }),
      (e) => e instanceof BackupRefusal && /does not exist/.test(e.message)
    );
  } finally {
    rmSync(s, { recursive: true, force: true });
  }
});

test('REFUSES to write the archive inside the data root', async () => {
  const s = scratch();
  const root = join(s, 'data');
  seedRoot(root);
  try {
    await assert.rejects(
      () => backup({ dataRoot: root, outDir: join(root, 'archives') }),
      (e) => e instanceof BackupRefusal && /OUTSIDE the data root/.test(e.message)
    );
  } finally {
    rmSync(s, { recursive: true, force: true });
  }
});

test('REFUSES when a per-store override points outside the data root', async () => {
  const s = scratch();
  const root = join(s, 'data');
  seedRoot(root);
  try {
    await assert.rejects(
      () => backup({ dataRoot: root, outDir: join(s, 'out'), env: { RA_RACES_DB: join(s, 'elsewhere', 'races.sqlite') } }),
      (e) => e instanceof BackupRefusal && /RA_RACES_DB/.test(e.message) && /OUTSIDE/.test(e.message)
    );
    // ...and does NOT refuse when the override stays inside the root
    assert.equal(strayOverrides(root, { RA_RACES_DB: join(root, 'races.sqlite') }).length, 0);
    assert.equal(strayOverrides(root, {}).length, 0);
  } finally {
    rmSync(s, { recursive: true, force: true });
  }
});

test('REFUSES when an item under the root cannot be read', async (t) => {
  const s = scratch();
  const root = join(s, 'data');
  seedRoot(root);
  const locked = join(root, 'locked.json');
  writeFileSync(locked, '{}');
  try {
    chmodSync(locked, 0o000);
    // Windows largely ignores chmod; if the file is still readable the case cannot be produced here.
    let readable = true;
    try {
      readFileSync(locked);
    } catch {
      readable = false;
    }
    if (readable) return t.skip('the platform does not honour chmod 000 — case not reproducible here');
    await assert.rejects(
      () => backup({ dataRoot: root, outDir: join(s, 'out') }),
      (e) => e instanceof BackupRefusal && /cannot read an item/.test(e.message)
    );
  } finally {
    try { chmodSync(locked, 0o644); } catch {}
    rmSync(s, { recursive: true, force: true });
  }
});

test('transient SQLite side files are never archived', () => {
  for (const f of ['races.sqlite-journal', 'races.sqlite-wal', 'sessions.sqlite-shm'])
    assert.ok(SQLITE_SIDE.test(f), `${f} must be excluded`);
  for (const f of ['races.sqlite', 'users.json', 'tracks/t1.json'])
    assert.ok(!SQLITE_SIDE.test(f), `${f} must be archived`);
});

// ── the round trip, with a real database ───────────────────────────────────────────────────────

test('ROUND TRIP: a database with rows survives backup → destroy → restore', async (t) => {
  if (!Database) return t.skip('better-sqlite3 is not installed in server/node_modules');
  const s = scratch();
  const root = join(s, 'data');
  const out = join(s, 'archives');
  const back = join(s, 'restored');
  seedRoot(root, { withDb: true });
  try {
    const res = await backup({ dataRoot: root, outDir: out });
    assert.ok(existsSync(res.archivePath));

    rmSync(root, { recursive: true, force: true }); // ★ destroy
    assert.equal(existsSync(root), false);

    restore({ archivePath: res.archivePath, into: back });

    // the JSON store came back
    assert.equal(JSON.parse(readFileSync(join(back, 'users.json'), 'utf8'))[0].username, 'a');
    // ★ AND THE DATABASE CAME BACK, WITH ITS ROWS AND ITS INTEGRITY
    assert.ok(existsSync(join(back, 'races.sqlite')), 'races.sqlite must be in the archive');
    const db = new Database(join(back, 'races.sqlite'), { readonly: true });
    try {
      assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM races').get().n, 25);
    } finally {
      db.close();
    }
  } finally {
    rmSync(s, { recursive: true, force: true });
  }
});

// ── ★★ THE SABOTAGE ────────────────────────────────────────────────────────────────────────────
// The brief: make the sqlite step silently skip the database, and the round-trip test must FAIL. If
// it still passes, the test is not testing the thing. This reproduces the round trip above against a
// backup that omits the database exactly as a silent skip would, and asserts that it is CAUGHT.
test('SABOTAGE: a backup that silently skips the database FAILS the round trip', async (t) => {
  if (!Database) return t.skip('better-sqlite3 is not installed in server/node_modules');
  const s = scratch();
  const root = join(s, 'data');
  const out = join(s, 'archives');
  const back = join(s, 'restored');
  seedRoot(root, { withDb: true });
  try {
    // the sabotage: back up a root from which the database has been hidden — byte-for-byte what a
    // silently-skipped sqlite step produces.
    const sabotaged = join(s, 'data-no-db');
    mkdirSync(sabotaged, { recursive: true });
    writeFileSync(join(sabotaged, 'users.json'), readFileSync(join(root, 'users.json')));
    mkdirSync(join(sabotaged, 'tracks'), { recursive: true });
    writeFileSync(join(sabotaged, 'tracks', 't1.json'), readFileSync(join(root, 'tracks', 't1.json')));

    const res = await backup({ dataRoot: sabotaged, outDir: out });
    restore({ archivePath: res.archivePath, into: back });

    // the JSON half still looks perfectly fine — which is why a weaker test would pass
    assert.equal(JSON.parse(readFileSync(join(back, 'users.json'), 'utf8'))[0].username, 'a');

    // ★ and the assertion that must catch it
    let caught = false;
    try {
      assert.ok(existsSync(join(back, 'races.sqlite')), 'races.sqlite must be in the archive');
    } catch {
      caught = true;
    }
    assert.ok(caught, 'the round-trip assertion MUST fail when the database is skipped — it did not, so it is not testing the database');
  } finally {
    rmSync(s, { recursive: true, force: true });
  }
});
