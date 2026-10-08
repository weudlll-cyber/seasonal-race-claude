// ============================================================
// File:        compare-verify.mjs
// Path:        reports/release/SOAK-1/compare-verify.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 step 3c — verify, OLD (the replay on the calling thread) against NEW (the
//              same replay on a worker thread), on stored races of the soak's volume: the answered
//              fields must be identical, and the calling thread's event-loop block is measured.
//
// Usage: node compare-verify.mjs <oldRepoRoot> <newRepoRoot> <dataCopy> [races=24]
// ============================================================

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const [oldRoot, newRoot, data, nArg] = process.argv.slice(2);
const u = (root, p) => pathToFileURL(join(root, p)).href;
const { createRaceStore } = await import(u(newRoot, 'server/src/races/raceStore.js'));
const { replayStoredRace } = await import(u(oldRoot, 'scripts/lib/storedRaceReplay.mjs'));
const { verifyOffMainThread } = await import(u(newRoot, 'server/src/races/verifyOffMainThread.js'));
const store = createRaceStore(join(data, 'races.sqlite'));
const tracksDir = join(data, 'tracks');
const tracks = readdirSync(tracksDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(tracksDir, f), 'utf8')))
  .filter((t) => t && t.id);
const pick = (r) => ({ firstDiff: r.firstDiff, posMatch: r.posMatch, timeMatch: r.timeMatch, n: r.n, track: r.track, racers: r.racers });

const n = Number(nArg ?? 24);
const races = [];
for (const team of ['Seasonal Entertainment', 'Soak Team A', 'Soak Team B']) {
  let offset = 0;
  while (races.filter((r) => r.team === team).length < n / 3) {
    const page = store.listRacesPage(team, { limit: 100, offset });
    if (!page.races.length) break;
    // Every 37th race, so the sample spreads over templates, field sizes and the whole night.
    for (let i = 0; i < page.races.length && races.filter((r) => r.team === team).length < n / 3; i += 37) races.push(page.races[i]);
    offset += 100;
  }
}

const eld = monitorEventLoopDelay({ resolution: 5 });
const rows = [];
for (const race of races) {
  eld.reset();
  eld.enable();
  // The delay monitor's timer must be armed before the work it is to measure begins.
  await new Promise((r) => setTimeout(r, 50));
  const t0 = performance.now();
  const old = pick(replayStoredRace(race, { tracks }));
  const oldMs = performance.now() - t0;
  await new Promise((r) => setTimeout(r, 20));
  eld.disable();
  const oldBlock = eld.max / 1e6;

  eld.reset();
  eld.enable();
  await new Promise((r) => setTimeout(r, 50));
  const t1 = performance.now();
  const outcome = await verifyOffMainThread(race, tracks);
  const newMs = performance.now() - t1;
  eld.disable();
  const newBlock = eld.max / 1e6;
  rows.push({
    key: race.shortKey,
    team: race.team,
    racers: race.fieldSize,
    identical: JSON.stringify(old) === JSON.stringify(outcome.result ?? outcome),
    firstDiff: old.firstDiff,
    oldMs: Math.round(oldMs),
    newMs: Math.round(newMs),
    oldLoopBlockMs: Math.round(oldBlock),
    newLoopBlockMs: Math.round(newBlock),
  });
}
console.log(JSON.stringify(rows, null, 2));
if (!rows.every((r) => r.identical && r.firstDiff === null)) process.exitCode = 1;
