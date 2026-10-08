// AUDIT-1 A10: the race store under a lock, its journal settings, its integrity after many writes,
// and the query plan of every read it makes. Runs against a THROWAWAY database in the scratch
// folder, never the owner's. Usage: node a10-store.mjs <clone>
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';

const clone = process.argv[2];
const imp = (p) => import(pathToFileURL(join(clone, p)).href);
const { createRaceStore } = await imp('server/src/races/raceStore.js');
const Database = (await imp('server/node_modules/better-sqlite3/lib/index.js')).default;

const dir = mkdtempSync(join(os.tmpdir(), 'ra-a10-'));
const file = join(dir, 'races.sqlite');
const race = (i) => ({
  clientRaceId: `client-${i}`,
  team: 'Audit Team',
  finishedAt: new Date(Date.UTC(2026, 9, 1) + i * 60000).toISOString(),
  identifierVersion: 1,
  buildId: 'abc1234',
  geometryId: 'garden-path',
  racerTypeId: 'beetle',
  racePlanSeed: 1000 + i,
  raceActionStage: 'wild',
  racePlanEnabled: true,
  targetDurationSec: 200,
  names: ['Ada', 'Grace', 'Alan', `P${i}`],
  worldSchemaVersion: 2,
  worldConfigs: {},
  elapsedSec: 180 + (i % 20),
  results: [{ position: 1, name: 'Grace' }],
  winners: ['Grace'],
  racerTypeOverrides: {},
  effectiveRacerTypes: {},
});

const store = createRaceStore(file);
const probe = new Database(file);
console.log(`journal_mode       : ${probe.pragma('journal_mode', { simple: true })}`);
console.log(`busy_timeout (new) : ${probe.pragma('busy_timeout', { simple: true })} ms — better-sqlite3's default for a new connection`);

// 1. A writer holds the database. How long does a race save wait, and how does it fail?
probe.exec('BEGIN EXCLUSIVE');
let t0 = performance.now();
try {
  store.storeRace(race(0));
  console.log(`lock: the save went through while another connection held EXCLUSIVE (${Math.round(performance.now() - t0)} ms)`);
} catch (e) {
  console.log(`lock: the save failed after ${Math.round(performance.now() - t0)} ms with ${e.code ?? e.name}: ${e.message}`);
}
probe.exec('ROLLBACK');
t0 = performance.now();
store.storeRace(race(0));
console.log(`lock released: the same save succeeds (${Math.round(performance.now() - t0)} ms)`);

// 2. Integrity after 500 stored races.
for (let i = 1; i <= 500; i++) store.storeRace(race(i));
console.log(`integrity_check after 501 races: ${probe.pragma('integrity_check', { simple: true })}`);
console.log(`foreign_key_check: ${JSON.stringify(probe.pragma('foreign_key_check'))}`);

// 3. The plan of every read the store makes.
const plans = {
  'race by id': ['SELECT * FROM races WHERE id = ?', ['x']],
  'race by client id + team': ['SELECT * FROM races WHERE client_race_id = ? AND team_normalized = ?', ['x', 'audit team']],
  'race by short key + team': ['SELECT * FROM races WHERE short_key = ? AND team_normalized = ?', ['x', 'audit team']],
  'history page': ['SELECT * FROM races WHERE team_normalized = ? ORDER BY finished_at DESC, id ASC LIMIT ? OFFSET ?', ['audit team', 50, 0]],
  'period evaluation': ['SELECT race_source, results FROM races WHERE team_normalized = ? AND finished_at >= ? AND finished_at < ? ORDER BY finished_at ASC, id ASC', ['audit team', '2026-10-01', '2026-11-01']],
  'roster by id': ['SELECT content FROM rosters WHERE id = ?', ['x']],
};
for (const [name, [sql, args]] of Object.entries(plans)) {
  const plan = probe.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...args).map((r) => r.detail).join(' ; ');
  console.log(`plan · ${name.padEnd(26)}: ${plan}`);
}

probe.close();
store.close();
rmSync(dir, { recursive: true, force: true });
