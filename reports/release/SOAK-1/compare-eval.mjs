// ============================================================
// File:        compare-eval.mjs
// Path:        reports/release/SOAK-1/compare-eval.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 step 3a — the period evaluation, OLD (hydrate every race) against NEW
//              (stream two fields), on the same races.sqlite: the answer must be byte-identical;
//              and what one evaluation holds and costs on each path.
//
// Usage: node --expose-gc compare-eval.mjs <oldRepoRoot> <newRepoRoot> <races.sqlite copy>
// ============================================================

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [oldRoot, newRoot, dbFile] = process.argv.slice(2);
const u = (root, p) => pathToFileURL(join(root, p)).href;
const oldStore = (await import(u(oldRoot, 'server/src/races/raceStore.js'))).createRaceStore(dbFile);
const newStore = (await import(u(newRoot, 'server/src/races/raceStore.js'))).createRaceStore(dbFile);
const { evaluatePeriod } = await import(u(newRoot, 'server/src/races/periodEvaluation.js'));

const teams = ['Seasonal Entertainment', 'Soak Team A', 'Soak Team B'];
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const periods = [
  ['360 days', iso(now - 360 * 86400_000), iso(now + 86400_000)],
  ['one hour of the soak', '2026-10-07T01:00:00.000Z', '2026-10-07T02:00:00.000Z'],
  ['empty', '2025-01-01T00:00:00.000Z', '2025-02-01T00:00:00.000Z'],
];

function cost(fn) {
  globalThis.gc();
  const before = process.memoryUsage().heapUsed;
  let peak = before;
  const t = performance.now();
  const out = fn((x) => {
    peak = Math.max(peak, process.memoryUsage().heapUsed);
    return x;
  });
  const ms = performance.now() - t;
  return { out, ms: +ms.toFixed(1), peakAboveMiB: +((peak - before) / 1048576).toFixed(2) };
}

const rows = [];
for (const team of teams) {
  for (const [label, from, to] of periods) {
    const a = cost((probe) => JSON.stringify(evaluatePeriod(probe(oldStore.listRacesInPeriod(team, from, to)))));
    const b = cost((probe) => {
      const it = newStore.raceResultsInPeriod(team, from, to);
      // The probe reads the heap after every 500th race, so a streaming path is measured mid-way.
      let i = 0;
      const tap = (function* () {
        for (const r of it) {
          if (++i % 500 === 0) probe();
          yield r;
        }
      })();
      return JSON.stringify(evaluatePeriod(tap));
    });
    const parsed = JSON.parse(a.out);
    rows.push({
      team,
      period: label,
      counted: parsed.counted,
      excluded: parsed.quickTestsExcluded,
      identical: a.out === b.out,
      bytes: a.out.length,
      old: { ms: a.ms, heldMiB: a.peakAboveMiB },
      new: { ms: b.ms, peakMiB: b.peakAboveMiB },
    });
  }
}
console.log(JSON.stringify(rows, null, 2));
if (!rows.every((r) => r.identical)) process.exitCode = 1;
