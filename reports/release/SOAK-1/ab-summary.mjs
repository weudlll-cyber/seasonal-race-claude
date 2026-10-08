// ============================================================
// File:        ab-summary.mjs
// Path:        reports/release/SOAK-1/ab-summary.mjs
// Project:     RaceArena
// Created:     2026-10-08
// Description: One A/B arm (ab-arm.sh) in the numbers the verify fix's merge conditions name.
//
// Usage: node ab-summary.mjs <armRawDir>
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const raw = process.argv[2];
const jl = (f) => readFileSync(join(raw, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const minutes = jl('load-minutes.jsonl');
const samples = jl('samples.jsonl').filter((s) => !s.error);
const totals = JSON.parse(readFileSync(join(raw, 'load-totals.json'), 'utf8'));
const events = readFileSync(join(raw, 'load-events.log'), 'utf8').split('\n');

// Verify windows from the load's own log line: "<end> verify <key> identical, server N ms, wall M ms".
const windows = events
  .filter((l) => / verify .* identical/.test(l))
  .map((l) => {
    const end = Date.parse(l.slice(0, 24));
    return [end - Number(/wall (\d+) ms/.exec(l)[1]), end];
  });
const walls = windows.map(([a, b]) => b - a).sort((x, y) => x - y);
const errors = events.filter((l) => l.includes('UNEXPECTED') && /neterr|timeout/.test(l)).map((l) => Date.parse(l.slice(0, 24)));
const insideVerify = errors.filter((t) => windows.some(([a, b]) => t >= a && t <= b + 2000)).length;

const ORDINARY = ['static', 'content', 'single', 'history', 'save', 'settings', 'evaluation'];
const active = minutes.filter((m) => !m.idle);
const slowMinutes = active.filter((m) => ORDINARY.some((g) => (m.groups[g]?.p99 ?? 0) > 1000)).length;
const maxDuringVerify = Math.max(0, ...active.flatMap((m) => ORDINARY.map((g) => m.groups[g]?.maxDuringVerify ?? 0)));

let gaps = 0;
for (let i = 1; i < samples.length; i++) if (Date.parse(samples[i].t) - Date.parse(samples[i - 1].t) > 90_000) gaps++;
const final = existsSync(join(raw, 'final-state.txt')) ? readFileSync(join(raw, 'final-state.txt'), 'utf8').trim() : null;

console.log(JSON.stringify({
  window: { from: samples[0]?.t, to: samples.at(-1)?.t, samples: samples.length, gapsOver90s: gaps },
  requests: Object.values(totals.byKind).reduce((a, b) => a + b, 0),
  byStatus: totals.byStatus,
  fivexx: Object.entries(totals.byStatus).filter(([k]) => /^5/.test(k)).reduce((a, [, v]) => a + v, 0),
  restartsStatusOom: final,
  connectionErrors: { all: errors.length, insideAVerify: insideVerify },
  minutesWithP99Over1s: slowMinutes,
  activeMinutes: active.length,
  verifies: { identical: windows.length, notIdentical: events.filter((l) => l.includes('NOT IDENTICAL')).length, wallMsMedian: walls[walls.length >> 1], wallMsMax: walls.at(-1) },
  longestWaitOfARequestDuringAVerifyMs: maxDuringVerify,
}, null, 2));
