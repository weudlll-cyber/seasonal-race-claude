// ============================================================
// File:        migrateRaceSource.test.js
// Path:        server/src/races/migrateRaceSource.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A4-04)
// Description: The race-source migration on a COPY of a realistic database from before
//              RACE-SOURCE-1: built here from fixtures (never an owner's file) — several races of two
//              teams, shared rosters and racer types, the index and the immutability triggers — then
//              the column the migration adds is taken away again. The first run adds it and touches
//              no row; THE SECOND RUN CHANGES NOTHING, down to the bytes of the file.
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import os from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { createRaceStore } from './raceStore.js';
import { migrateRaceSource, hasRaceSourceColumn, RACE_SOURCE_COLUMN } from './migrateRaceSource.js';

const paths = [];
function tempPath(tag) {
  const p = join(os.tmpdir(), `racearena-test-racesource-${tag}-${randomUUID()}.sqlite`);
  paths.push(p);
  return p;
}
afterEach(() => {
  for (const p of paths.splice(0))
    for (const suffix of ['', '-wal', '-shm', '-journal'])
      if (existsSync(p + suffix)) unlinkSync(p + suffix);
});

/** A race as the client sends it, with no `raceSource` — the shape stored before 2026-09-25. */
function legacyRace(i, team) {
  const names = i % 2 ? ['Ada', 'Bob', 'Cy'] : ['Ada', 'Bob', 'Cy', 'Dee'];
  return {
    clientRaceId: randomUUID(),
    team,
    finishedAt: `2026-09-${String(10 + i).padStart(2, '0')}T18:00:00.000Z`,
    identifierVersion: 1,
    buildId: 'abc1234',
    geometryId: i % 3 ? 'garden-path' : 'dirt-oval',
    racerTypeId: 'beetle',
    racePlanSeed: 1000 + i,
    raceActionStage: ['quiet', 'medium', 'wild'][i % 3],
    racePlanEnabled: true,
    ...(i % 3 ? { targetDurationSec: 60 } : { targetLaps: 3 }),
    names,
    worldSchemaVersion: 2,
    worldConfigs: { raceDefaults: { spread: 0.4 + i / 100 } },
    racerTypeOverrides: {},
    effectiveRacerTypes: { beetle: { speed: 1 } },
    elapsedSec: 60 + i,
    results: names.map((name, k) => ({ name, finishTimeMs: 60_000 + 100 * k + i })),
    winners: names.slice(0, 3),
  };
}

/** Every row of every table and the whole schema, in a stable order — "what the database says". */
function snapshot(path) {
  const db = new Database(path, { readonly: true });
  try {
    const schema = db
      .prepare('SELECT type, name, sql FROM sqlite_master ORDER BY type, name')
      .all();
    const rows = Object.fromEntries(
      ['races', 'rosters', 'racer_types'].map((t) => [
        t,
        db.prepare(`SELECT * FROM ${t} ORDER BY id`).all(),
      ])
    );
    return { schema, rows };
  } finally {
    db.close();
  }
}

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** The realistic pre-RACE-SOURCE-1 database: real races through the real store, column removed. */
function legacyDatabase() {
  const path = tempPath('legacy');
  const store = createRaceStore(path);
  for (let i = 0; i < 12; i++) store.storeRace(legacyRace(i, i % 4 ? 'Team A' : 'Team B'));
  store.close();
  const db = new Database(path);
  db.exec(`ALTER TABLE races DROP COLUMN ${RACE_SOURCE_COLUMN}`);
  expect(hasRaceSourceColumn(db)).toBe(false);
  db.close();
  return path;
}

describe('migrateRaceSource — twice on a copy of a realistic database', () => {
  it('the first run adds the column and keeps every row; the second run changes nothing', () => {
    const original = legacyDatabase();
    const copy = tempPath('copy');
    copyFileSync(original, copy);
    const before = snapshot(copy);
    expect(before.rows.races).toHaveLength(12);

    // First run: one change — the column — and no row touched.
    expect(migrateRaceSource({ dbPath: copy })).toEqual({ total: 1, changed: 1, skipped: 0 });
    const afterFirst = snapshot(copy);
    expect(afterFirst.rows.rosters).toEqual(before.rows.rosters);
    expect(afterFirst.rows.racer_types).toEqual(before.rows.racer_types);
    expect(afterFirst.rows.races).toEqual(
      before.rows.races.map((r) => ({ ...r, [RACE_SOURCE_COLUMN]: null }))
    );
    const hashAfterFirst = sha(copy);

    // ★ Second run: reported as skipped, and NOTHING moves — not a row, not the schema, not a byte.
    expect(migrateRaceSource({ dbPath: copy })).toEqual({ total: 1, changed: 0, skipped: 1 });
    expect(snapshot(copy)).toEqual(afterFirst);
    expect(sha(copy)).toBe(hashAfterFirst);

    // The original was never the one migrated.
    expect(snapshot(original)).toEqual(before);
  });

  it('after the migration the store opens it, every legacy race reads as unmarked, and rows stay immutable', () => {
    const copy = tempPath('copy');
    copyFileSync(legacyDatabase(), copy);
    migrateRaceSource({ dbPath: copy });
    const store = createRaceStore(copy);
    try {
      const listed = store.listRacesByTeam('Team A', { limit: 100 });
      expect(listed.length).toBe(9);
      for (const r of listed) expect(store.getRaceById(r.id).raceSource).toBeNull();
      expect(() =>
        store._db.prepare(`UPDATE races SET ${RACE_SOURCE_COLUMN} = 'race'`).run()
      ).toThrow(/immutable/);
    } finally {
      store.close();
    }
  });

  it('a dry run on the legacy copy reports the change and writes nothing', () => {
    const copy = tempPath('copy');
    copyFileSync(legacyDatabase(), copy);
    const hash = sha(copy);
    expect(migrateRaceSource({ dbPath: copy, dryRun: true })).toEqual({
      total: 1,
      changed: 1,
      skipped: 0,
    });
    expect(sha(copy)).toBe(hash);
  });

  it('a missing file is a no-op and creates nothing', () => {
    const missing = tempPath('missing');
    expect(migrateRaceSource({ dbPath: missing })).toEqual({ total: 0, changed: 0, skipped: 0 });
    expect(existsSync(missing)).toBe(false);
  });
});
