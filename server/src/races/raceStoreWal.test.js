// ============================================================
// File:        raceStoreWal.test.js
// Path:        server/src/races/raceStoreWal.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A10-02)
// Description: `RA_RACES_WAL` — off by default (the rollback journal, nothing written to change it),
//              on = WAL, in which a save goes through while another connection holds a READ
//              transaction (what a running backup holds). AUDIT-1 measured the same save blocking
//              the server 6.9 s and failing under the rollback journal.
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createRaceStore, resolveRacesWal } from './raceStore.js';

const paths = [];
const open = [];
function tempDb() {
  const p = join(os.tmpdir(), `racearena-test-wal-${randomUUID()}.sqlite`);
  paths.push(p);
  return p;
}
afterEach(() => {
  for (const c of open.splice(0)) if (c.open !== false) c.close();
  for (const p of paths.splice(0))
    for (const s of ['', '-wal', '-shm', '-journal']) if (existsSync(p + s)) unlinkSync(p + s);
});

function race(i) {
  return {
    clientRaceId: randomUUID(),
    team: 'WAL Team',
    finishedAt: new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString(),
    identifierVersion: 1,
    buildId: 'abc1234',
    geometryId: 'garden-path',
    racerTypeId: 'beetle',
    racePlanSeed: 1000 + i,
    raceActionStage: 'wild',
    racePlanEnabled: true,
    targetDurationSec: 200,
    names: ['Ada', 'Grace', `P${i}`],
    worldSchemaVersion: 2,
    worldConfigs: {},
    elapsedSec: 180,
    results: [{ position: 1, name: 'Grace' }],
    winners: ['Grace'],
    racerTypeOverrides: {},
    effectiveRacerTypes: {},
  };
}

/** A second connection holding a read transaction open — a backup in progress. */
function heldReader(path) {
  const reader = new Database(path);
  open.push(reader);
  reader.pragma('busy_timeout = 0');
  reader.exec('BEGIN');
  reader.prepare('SELECT count(*) FROM races').get(); // the read lock is taken here
  return reader;
}

describe('resolveRacesWal — reading the setting', () => {
  it.each([[undefined], [''], ['0'], ['false'], [' FALSE ']])('%j → off', (v) => {
    expect(resolveRacesWal({ RA_RACES_WAL: v })).toBe(false);
  });
  it.each([['1'], ['true'], [' TRUE ']])('%j → on', (v) => {
    expect(resolveRacesWal({ RA_RACES_WAL: v })).toBe(true);
  });
  it.each([['yes'], ['wal'], ['2']])('refuses %j, naming the variable', (v) => {
    expect(() => resolveRacesWal({ RA_RACES_WAL: v })).toThrow(/RA_RACES_WAL/);
  });
});

describe('the race store with RA_RACES_WAL', () => {
  it('OFF (the default): the rollback journal, exactly as before', () => {
    const store = createRaceStore(tempDb(), { wal: false });
    open.push(store);
    expect(store._db.pragma('journal_mode', { simple: true })).toBe('delete');
  });

  it('ON: WAL, and a save goes through while a backup-like reader holds the database', () => {
    const path = tempDb();
    const store = createRaceStore(path, { wal: true });
    open.push(store);
    expect(store._db.pragma('journal_mode', { simple: true })).toBe('wal');
    store.storeRace(race(0));

    const reader = heldReader(path);
    const t0 = performance.now();
    expect(store.storeRace(race(1)).stored.race).toBe(true);
    expect(performance.now() - t0).toBeLessThan(1000); // not the 5 s busy timeout
    reader.exec('COMMIT');
    expect(store.counts().races).toBe(2);
  });

  it('OFF: the same held reader makes the save fail — the case WAL exists for', () => {
    const path = tempDb();
    const store = createRaceStore(path, { wal: false });
    open.push(store);
    store._db.pragma('busy_timeout = 0'); // fail at once instead of after 5 s; the outcome is the point
    store.storeRace(race(0));
    const reader = heldReader(path);
    expect(() => store.storeRace(race(1))).toThrow(/locked/);
    reader.exec('COMMIT');
  });

  it('turning it OFF again switches a WAL file back to the rollback journal, keeping every race', () => {
    const path = tempDb();
    const walStore = createRaceStore(path, { wal: true });
    walStore.storeRace(race(0));
    walStore.storeRace(race(1));
    walStore.close();

    const store = createRaceStore(path, { wal: false });
    open.push(store);
    expect(store._db.pragma('journal_mode', { simple: true })).toBe('delete');
    expect(store.counts().races).toBe(2);
  });
});
