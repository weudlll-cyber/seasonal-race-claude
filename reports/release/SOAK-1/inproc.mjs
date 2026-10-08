// ============================================================
// File:        inproc.mjs
// Path:        reports/release/SOAK-1/inproc.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 step 2 — the production server run IN THIS PROCESS (the app imported, no
//              product code changed) against a COPY of the soak's data, so that the V8 heap can be
//              read without a debugger port or a privileged container.
//
// Usage (node --expose-gc, from anywhere):
//   node --expose-gc inproc.mjs serve <repoRoot> <dataCopy> <port> <rawDir> <minutes>
//       serves the app; every 60 s appends process.memoryUsage() and the event-loop delay to
//       <rawDir>/inproc-samples.jsonl; writes heap snapshots at 0, 30 and 60 minutes
//   node --expose-gc inproc.mjs probe <repoRoot> <dataCopy> <rawDir>
//       measures what ONE call of each stored-race read materialises at once (the heap it holds
//       after a full GC while the result is still referenced) and how long it takes; prints JSON
//
// The environment is set BEFORE the app is imported, because the data folder is resolved at import
// (server/src/dataPaths.js). The settings are the soak's (compose.soak.yml).
// ============================================================

import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { randomBytes } from 'node:crypto';
import v8 from 'node:v8';

const [mode, rootArg, dataArg, ...rest] = process.argv.slice(2);
const root = resolve(rootArg);
const u = (p) => pathToFileURL(join(root, p)).href;
if (typeof globalThis.gc !== 'function') throw new Error('run with node --expose-gc');

process.env.RA_DATA_DIR = resolve(dataArg);
process.env.NODE_ENV = 'production';
process.env.RA_SESSION_SECRET ??= randomBytes(32).toString('hex');
process.env.RA_COOKIE_SECURE = 'auto';
process.env.RA_CSRF_STRICT = 'auto';
process.env.RA_CLIENT_DIST ??= join(root, 'client', 'dist');

const MiB = (b) => +(b / 1048576).toFixed(2);
const mem = () => Object.fromEntries(Object.entries(process.memoryUsage()).map(([k, v]) => [k, MiB(v)]));

if (mode === 'serve') {
  const [portArg, rawDir, minutesArg] = rest;
  const port = Number(portArg);
  const minutes = Number(minutesArg ?? 60);
  process.env.RA_PUBLIC_ORIGIN = `http://127.0.0.1:${port}`;
  const { createApp } = await import(u('server/src/app.js'));
  const app = createApp();
  const eld = monitorEventLoopDelay({ resolution: 10 });
  eld.enable();
  const out = join(rawDir, 'inproc-samples.jsonl');
  const snap = (label) => {
    globalThis.gc();
    const file = v8.writeHeapSnapshot(join(rawDir, `heap-${label}.heapsnapshot`));
    appendFileSync(out, JSON.stringify({ t: new Date().toISOString(), snapshot: file, mem: mem() }) + '\n');
  };
  await new Promise((r) => app.listen(port, '127.0.0.1', r));
  console.log(`serving on 127.0.0.1:${port} from ${process.env.RA_DATA_DIR}`);
  snap('00min');
  const t0 = Date.now();
  let i = 0;
  const timer = setInterval(() => {
    i += 1;
    appendFileSync(out, JSON.stringify({
      t: new Date().toISOString(),
      minute: i,
      mem: mem(),
      loopDelayMs: { p50: +(eld.percentile(50) / 1e6).toFixed(1), p99: +(eld.percentile(99) / 1e6).toFixed(1), max: +(eld.max / 1e6).toFixed(1) },
    }) + '\n');
    eld.reset();
    if (i === 30) snap('30min');
    if (i >= minutes) {
      snap(`${String(minutes).padStart(2, '0')}min`);
      clearInterval(timer);
      process.exit(0);
    }
  }, 60_000);
  void t0;
} else if (mode === 'probe') {
  const [rawDir] = rest;
  const { createRaceStore } = await import(u('server/src/races/raceStore.js'));
  const { evaluatePeriod } = await import(u('server/src/races/periodEvaluation.js'));
  const { replayStoredRace } = await import(u('scripts/lib/storedRaceReplay.mjs'));
  const store = createRaceStore(join(process.env.RA_DATA_DIR, 'races.sqlite'));
  const tracksDir = join(process.env.RA_DATA_DIR, 'tracks');
  const tracks = readdirSync(tracksDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(tracksDir, f), 'utf8'))).filter((t) => t && t.id);
  const teams = store.counts();
  const from = new Date(Date.now() - 360 * 86400_000).toISOString();
  const to = new Date(Date.now() + 86400_000).toISOString();
  const team = process.argv.at(-1).startsWith('--team=') ? process.argv.at(-1).slice(7) : 'Seasonal Entertainment';

  // Holds the result while measuring: the heap a call keeps alive at once, after a full GC.
  function cost(label, fn) {
    globalThis.gc();
    const before = process.memoryUsage().heapUsed;
    const t = performance.now();
    let result = fn();
    const ms = performance.now() - t;
    globalThis.gc();
    const held = process.memoryUsage().heapUsed - before;
    const size = Array.isArray(result) ? result.length : result?.races?.length ?? result?.rows?.length ?? null;
    result = null;
    globalThis.gc();
    return { label, ms: +ms.toFixed(1), heldMiB: MiB(held), items: size };
  }
  const page = store.listRacesPage(team, { limit: 20 });
  const key = page.races[0]?.shortKey;
  const out = {
    data: process.env.RA_DATA_DIR,
    counts: teams,
    team,
    results: [
      cost('period evaluation: listRacesInPeriod (full period, hydrated)', () => store.listRacesInPeriod(team, from, to)),
      cost('period evaluation: listRacesInPeriod + evaluatePeriod', () => evaluatePeriod(store.listRacesInPeriod(team, from, to))),
      cost('race history: listRacesPage (20)', () => store.listRacesPage(team, { limit: 20 })),
      cost('single race: getRaceByShortKey', () => store.getRaceByShortKey(key, team)),
      cost('verify: replayStoredRace (one race)', () => replayStoredRace(store.getRaceByShortKey(key, team), { tracks })),
    ],
    after: mem(),
  };
  appendFileSync(join(rawDir, 'probe.jsonl'), JSON.stringify(out) + '\n');
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
} else {
  throw new Error('mode is serve or probe');
}
