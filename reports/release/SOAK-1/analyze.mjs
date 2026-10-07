// ============================================================
// File:        analyze.mjs
// Path:        reports/release/SOAK-1/analyze.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 part B — turns the sampler's and the load's per-minute records into slopes,
//              per hour and per 10,000 requests, after a 30-minute warm-up, and extrapolates them
//              to 90 days at a STATED real-world rate.
//
// Usage: node analyze.mjs <rawDir> [warmupMinutes=30]
//   <rawDir>/samples.jsonl, load-minutes.jsonl, load-totals.json
//
// Every slope is an ordinary least-squares line. "Per 10,000 requests" regresses the measure on
// the cumulative number of requests SENT up to that minute, so idle minutes add time but no
// requests — the two slopes differ exactly where growth follows the clock rather than the load.
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const raw = process.argv[2];
const warmupMin = Number(process.argv[3] ?? 30);
const jl = (f) => readFileSync(join(raw, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const samples = jl('samples.jsonl').filter((s) => !s.error);
const minutes = jl('load-minutes.jsonl');
const totals = JSON.parse(readFileSync(join(raw, 'load-totals.json'), 'utf8'));

const t0 = Date.parse(samples[0].t);
const hoursOf = (iso) => (Date.parse(iso) - t0) / 3600_000;

// Cumulative requests (and race saves, and sign-ins) by time, from the load's minute records.
const cum = [];
let n = 0;
let saves = 0;
for (const m of minutes) {
  for (const g of Object.values(m.groups)) n += g.n;
  saves += m.groups.save?.status?.['201'] ?? 0;
  cum.push({ t: Date.parse(m.t), n, saves });
}
function cumAt(iso, key = 'n') {
  const t = Date.parse(iso);
  let v = 0;
  for (const c of cum) {
    if (c.t <= t) v = c[key];
    else break;
  }
  return v;
}

function ols(xs, ys) {
  const k = xs.length;
  if (k < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / k;
  const my = ys.reduce((a, b) => a + b, 0) / k;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < k; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxx ? sxy / sxx : 0;
  const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
  return { slope, intercept: my - slope * mx, r2, mean: my, n: k };
}

const mib = (s) => {
  const m = /^([\d.]+)\s*(KiB|MiB|GiB|B)/.exec(s ?? '');
  if (!m) return null;
  return Number(m[1]) * { B: 1 / 1048576, KiB: 1 / 1024, MiB: 1, GiB: 1024 }[m[2]];
};

const measures = {
  'container memory (docker stats), MiB': (s) => mib(s.docker?.mem?.split('/')[0]),
  'node RSS (VmRSS), MiB': (s) => (s.proc?.VmRSS ?? NaN) / 1024,
  'CPU, % of one core': (s) => Number(String(s.docker?.cpu ?? '').replace('%', '')),
  'open file descriptors': (s) => s.proc?.fd,
  'threads (node)': (s) => s.proc?.Threads,
  'processes in the container': (s) => s.proc?.processes,
  'data volume total, MiB': (s) => s.files.total / 1048576,
  'races.sqlite*, MiB': (s) => (s.files.byKind['races.sqlite*'] ?? 0) / 1048576,
  'sessions.sqlite*, KiB': (s) => (s.files.byKind['sessions.sqlite*'] ?? 0) / 1024,
  'all other data files, KiB': (s) =>
    (s.files.total - (s.files.byKind['races.sqlite*'] ?? 0) - (s.files.byKind['sessions.sqlite*'] ?? 0)) / 1024,
  'container log content, KiB': (s) => (s.log?.bytes ?? NaN) / 1024,
};

const post = samples.filter((s) => hoursOf(s.t) >= warmupMin / 60);
const durationH = hoursOf(samples.at(-1).t);
const out = { window: { from: samples[0].t, to: samples.at(-1).t, hours: +durationH.toFixed(2), samples: samples.length, postWarmupSamples: post.length }, measures: {} };
for (const [name, f] of Object.entries(measures)) {
  const pts = post.map((s) => ({ h: hoursOf(s.t), r: cumAt(s.t) / 10_000, v: f(s) })).filter((p) => Number.isFinite(p.v));
  const byH = ols(pts.map((p) => p.h), pts.map((p) => p.v));
  const byR = ols(pts.map((p) => p.r), pts.map((p) => p.v));
  const vs = pts.map((p) => p.v);
  out.measures[name] = {
    n: pts.length,
    first: vs[0],
    last: vs.at(-1),
    min: Math.min(...vs),
    max: Math.max(...vs),
    perHour: byH && +byH.slope.toPrecision(3),
    per10kRequests: byR && +byR.slope.toPrecision(3),
    r2: byH && +byH.r2.toFixed(3),
  };
}

// The RSS a process returns to after each 10-minute idle phase is the cleanest leak signal: the
// load is gone, so what remains is what the process kept. One value per hour, the idle phase's last.
const idleEnds = [];
for (let h = 0; h < Math.ceil(durationH); h++) {
  const inIdle = samples.filter((s) => {
    const m = (Date.parse(s.t) - t0) / 60_000 - h * 60;
    return m >= 50 && m < 60;
  });
  if (inIdle.length) {
    const s = inIdle.at(-1);
    idleEnds.push({ hour: h + 1, t: s.t, rssMiB: +(s.proc.VmRSS / 1024).toFixed(1), dockerMiB: +mib(s.docker?.mem?.split('/')[0]).toFixed(1), requestsSoFar: cumAt(s.t) });
  }
}
out.rssAtEndOfEachIdlePhase = idleEnds;
const ie = idleEnds.filter((x) => x.hour >= 2);
const ieFit = ols(ie.map((x) => x.hour), ie.map((x) => x.rssMiB));
out.rssAtIdleEndSlopeMiBPerHour = ieFit && +ieFit.slope.toPrecision(3);

// Latency per route group, active minutes after the warm-up: medians of the per-minute p50/p95/p99,
// the worst minute, and the slope of the per-minute p99 per hour.
const active = minutes.filter((m) => !m.idle && hoursOf(m.t) >= warmupMin / 60);
const groups = [...new Set(active.flatMap((m) => Object.keys(m.groups)))];
const med = (a) => {
  const s = a.filter((x) => x != null).sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
out.latency = {};
for (const g of groups) {
  const ms = active.filter((m) => m.groups[g]);
  const p99 = ms.map((m) => m.groups[g].p99);
  const fit = ols(ms.map((m) => hoursOf(m.t)), p99);
  const worst = ms.reduce((w, m) => (m.groups[g].max > (w?.groups[g].max ?? -1) ? m : w), null);
  out.latency[g] = {
    minutes: ms.length,
    requests: ms.reduce((a, m) => a + m.groups[g].n, 0),
    medianP50: med(ms.map((m) => m.groups[g].p50)),
    medianP95: med(ms.map((m) => m.groups[g].p95)),
    medianP99: med(p99),
    worstMinuteP99: Math.max(...p99),
    worstMinuteP99NoVerify: Math.max(...ms.map((m) => m.groups[g].p99NoVerify ?? -1)),
    maxSingle: worst?.groups[g].max,
    maxSingleAt: worst?.t,
    minutesWithP99Over1s: p99.filter((x) => x > 1000).length,
    minutesWithP99NoVerifyOver1s: ms.filter((m) => (m.groups[g].p99NoVerify ?? 0) > 1000).length,
    p99SlopeMsPerHour: fit && +fit.slope.toPrecision(3),
  };
}
// Evaluation cost against the number of races it has to read (every race is in its period).
const ev = active.filter((m) => m.groups.evaluation);
const evFit = ols(ev.map((m) => cumAt(m.t, 'saves') / 1000), ev.map((m) => m.groups.evaluation.p50));
out.evaluationP50MsPer1000Races = evFit && +evFit.slope.toPrecision(3);
out.evaluationFit = evFit && { intercept: +evFit.intercept.toFixed(1), r2: +evFit.r2.toFixed(3) };

// Bytes per stored race and per sign-in, from the first post-warm-up sample to the last.
const a = post[0];
const b = post.at(-1);
const savesAB = cumAt(b.t, 'saves') - cumAt(a.t, 'saves');
out.perEvent = {
  racesSavedInWindow: savesAB,
  raceStoreBytesPerRace: savesAB ? Math.round(((b.files.byKind['races.sqlite*'] ?? 0) - (a.files.byKind['races.sqlite*'] ?? 0)) / savesAB) : null,
  logBytesPerTenThousandRequests: Math.round((b.log.bytes - a.log.bytes) / ((cumAt(b.t) - cumAt(a.t)) / 10_000)),
};

const statuses = {};
for (const m of minutes) for (const g of Object.values(m.groups)) for (const [k, v] of Object.entries(g.status)) statuses[k] = (statuses[k] ?? 0) + v;
out.statusTotals = statuses;
out.loadTotals = totals;
out.state = {
  restartsMax: Math.max(...samples.map((s) => s.state?.restarts ?? 0)),
  startedAtValues: [...new Set(samples.map((s) => s.state?.startedAt))],
  statuses: [...new Set(samples.map((s) => s.state?.status))],
  health: Object.fromEntries([...new Set(samples.map((s) => s.state?.health))].map((h) => [h, samples.filter((s) => s.state?.health === h).length])),
  oomKilled: samples.some((s) => s.state?.oomKilled),
  processNamesSeen: [...new Set(samples.flatMap((s) => (s.proc?.comms ?? []).map((c) => c.split(':')[1])))],
};
console.log(JSON.stringify(out, null, 2));
