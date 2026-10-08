// ============================================================
// File:        heap-summary.mjs
// Path:        reports/release/SOAK-1/heap-summary.mjs
// Project:     RaceArena
// Created:     2026-10-08
// Description: Summarises one heap-run.mjs run: the heap retained after a full GC (every minute and
//              at the snapshots), its growth over minutes 30–60, RSS and the live heap under load,
//              the event-loop delay, and the load's requests and status codes.
//
// Usage: node heap-summary.mjs <rawDir>
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const raw = process.argv[2];
const rows = readFileSync(join(raw, 'inproc-samples.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const minutes = rows.filter((r) => r.minute);
const snaps = rows.filter((r) => r.snapshot);
const at = (m) => minutes.find((r) => r.minute === m);
const max = (f) => Math.max(...minutes.map(f));
const totals = JSON.parse(readFileSync(join(raw, 'load-totals.json'), 'utf8'));
const events = readFileSync(join(raw, 'load-events.log'), 'utf8').split('\n');
const lm = readFileSync(join(raw, 'load-minutes.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const evalP50 = lm.filter((m) => m.groups.evaluation && !m.idle).map((m) => m.groups.evaluation.p50).sort((a, b) => a - b);

console.log(JSON.stringify({
  retainedAfterGcMiB: {
    min1: at(1)?.heapUsedAfterGcMiB,
    min30: at(30)?.heapUsedAfterGcMiB,
    min60: at(60)?.heapUsedAfterGcMiB,
    growth30to60: +(at(60).heapUsedAfterGcMiB - at(30).heapUsedAfterGcMiB).toFixed(2),
    max: max((r) => r.heapUsedAfterGcMiB),
  },
  snapshotsHeapUsedMiB: snaps.map((s) => ({ file: s.snapshot.split(/[\\/]/).pop(), heapUsed: s.mem.heapUsed })),
  underLoad: {
    rssMaxMiB: max((r) => r.mem.rss),
    heapUsedMaxMiB: max((r) => r.mem.heapUsed),
    loopDelayMaxMs: max((r) => r.loopDelayMs.max),
    loopDelayP99MaxMs: max((r) => r.loopDelayMs.p99),
  },
  load: {
    requests: Object.values(totals.byKind).reduce((a, b) => a + b, 0),
    byStatus: totals.byStatus,
    unexpected: totals.unexpected,
    fivexx: Object.entries(totals.byStatus).filter(([k]) => /^5/.test(k)).reduce((a, [, v]) => a + v, 0),
    verifiesIdentical: events.filter((l) => l.includes(' identical')).length,
    verifiesNotIdentical: events.filter((l) => l.includes('NOT IDENTICAL')).length,
    evaluationMedianOfMinuteP50Ms: evalP50[evalP50.length >> 1],
  },
}, null, 2));
