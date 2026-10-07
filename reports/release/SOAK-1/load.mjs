// ============================================================
// File:        load.mjs
// Path:        reports/release/SOAK-1/load.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 harness — continuous mixed load against ONE production server the harness
//              started itself, far above real use, with a 10-minute idle phase every hour.
//
// Usage:
//   node load.mjs setup  <base> <rawDir>          create the first admin and two organizers
//   node load.mjs run    <base> <rawDir> <hours>  run the load; per-minute records to <rawDir>
//
// <base> must be http://127.0.0.1:<port> or http://[::1]:<port> — a port this harness started.
// Credentials are generated here, written to <rawDir>/accounts.json (outside the repository), and
// die with the throwaway volume.
//
// THE MIX, per second while active (each lane is its own loop; a slow server slows its lane, so
// the totals at the end are what was SENT, not what was planned):
//   static files 10 · content lists 5 · race history 2 · single race 2 · test-aids read 1 ·
//   evaluation 0.5 · points-rule read 0.5 · race save 0.5 (three teams in turn) ·
//   login+me+logout 0.25 · failed login 0.33 (half from a fixed address, which the limiter must
//   stop; half from a never-seen address, which grows the limiter's table) ·
//   abandoned login (no logout) 1/min · points-rule save 1/min · verify 1/5 min ·
//   test-aids switch 1/10 min.
// IDLE: minutes 50–59 of every hour, counted from the start, nothing is sent.
// ============================================================

import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomInt } from 'node:crypto';

const [mode, base, rawDir, hoursArg] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|\[::1\]):\d+$/.test(base ?? '')) {
  throw new Error('base must be http://127.0.0.1:<port> or http://[::1]:<port>');
}
const ORIGIN = base;
const ACCOUNTS = join(rawDir, 'accounts.json');

// ── HTTP with a cookie per session ────────────────────────────────────────────────────────────
function cookieFrom(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const m = /^((?:__Host-)?ra\.sid)=([^;]*)/.exec(c);
    if (m && m[2]) return `${m[1]}=${m[2]}`;
  }
  return null;
}

async function http(method, path, { cookie, body, ip, raw = false } = {}) {
  const headers = { 'X-Forwarded-For': ip ?? '10.1.0.1', 'X-Forwarded-Proto': 'https' };
  if (cookie) headers.Cookie = cookie;
  if (method !== 'GET') headers.Origin = ORIGIN;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (path === '/' || !path.startsWith('/api') && !/\.[a-z0-9]+$/i.test(path)) headers.Accept = 'text/html';
  const t0 = performance.now();
  let status = 0;
  let res = null;
  let text = '';
  try {
    res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    status = res.status;
    text = raw ? '' : await res.text();
    if (raw) await res.arrayBuffer();
  } catch (e) {
    status = e?.name === 'TimeoutError' ? 'timeout' : 'neterr';
  }
  const ms = performance.now() - t0;
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status, ms, json, text, res };
}

async function login(username, password, ip) {
  const r = await http('POST', '/api/auth/login', { body: { username, password }, ip });
  return { ...r, cookie: r.status === 200 ? cookieFrom(r.res) : null };
}

// ── setup ────────────────────────────────────────────────────────────────────────────────────
async function setup() {
  const token = process.env.SOAK_BOOTSTRAP_TOKEN;
  if (!token) throw new Error('SOAK_BOOTSTRAP_TOKEN is required for setup');
  const pw = () => randomBytes(18).toString('base64url');
  const accounts = {
    admin: { username: 'soak-admin', password: pw() },
    orgA: { username: 'soak-org-a', password: pw(), team: 'Soak Team A' },
    orgB: { username: 'soak-org-b', password: pw(), team: 'Soak Team B' },
  };
  const headers = {
    'Content-Type': 'application/json',
    Origin: ORIGIN,
    'x-bootstrap-token': token,
    'X-Forwarded-Proto': 'https',
  };
  const s = await fetch(`${base}/api/auth/setup`, {
    method: 'POST',
    headers,
    body: JSON.stringify(accounts.admin),
  });
  console.log('setup', s.status);
  if (s.status !== 201) throw new Error(`setup failed: ${s.status} ${await s.text()}`);
  const adminCookie = cookieFrom(s);
  for (const k of ['orgA', 'orgB']) {
    const a = accounts[k];
    const r = await http('POST', '/api/users', {
      cookie: adminCookie,
      body: { username: a.username, password: a.password, role: 'operator', team: a.team, allowNewTeam: true },
    });
    console.log('create', a.username, r.status, r.json?.team);
    if (r.status !== 201) throw new Error(`create ${a.username} failed: ${r.status} ${r.text}`);
  }
  const me = await http('GET', '/api/auth/me', { cookie: adminCookie });
  accounts.admin.team = me.json?.team;
  writeFileSync(ACCOUNTS, JSON.stringify(accounts, null, 2));
  console.log('admin team', accounts.admin.team, '— accounts written to', ACCOUNTS);
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────
async function run(hours) {
  const accounts = JSON.parse(readFileSync(ACCOUNTS, 'utf8'));
  const templates = JSON.parse(readFileSync(join(rawDir, 'race-templates.json'), 'utf8'));
  const startedAt = Date.now();
  const endAt = startedAt + hours * 3600_000;
  const minutesFile = join(rawDir, 'load-minutes.jsonl');
  const eventsFile = join(rawDir, 'load-events.log');
  const totalsFile = join(rawDir, 'load-totals.json');
  const event = (msg) => appendFileSync(eventsFile, `${new Date().toISOString()} ${msg}\n`);
  event(`run start, ${hours} h planned`);

  const idleNow = () => Math.floor((Date.now() - startedAt) / 60_000) % 60 >= 50;
  let verifyInFlight = 0;

  // Per-minute aggregation: group → { lat: [], status: {} }. Each sample also notes whether a
  // verify was in flight when it was SENT, so the stall a verify causes can be separated out.
  let minute = new Map();
  const totals = { byKind: {}, byStatus: {}, unexpected: 0, startedAt: new Date(startedAt).toISOString() };
  function record(group, kind, r, expected) {
    const g = minute.get(group) ?? { lat: [], latNoVerify: [], status: {} };
    minute.set(group, g);
    g.lat.push(r.ms);
    if (!r.duringVerify) g.latNoVerify.push(r.ms);
    g.status[r.status] = (g.status[r.status] ?? 0) + 1;
    totals.byKind[kind] = (totals.byKind[kind] ?? 0) + 1;
    totals.byStatus[r.status] = (totals.byStatus[r.status] ?? 0) + 1;
    if (!expected.includes(r.status)) {
      totals.unexpected += 1;
      event(`UNEXPECTED ${kind} ${r.status} ${Math.round(r.ms)}ms ${String(r.text ?? '').slice(0, 200)}`);
    }
  }
  const pct = (arr, p) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] * 10) / 10;
  };
  function flushMinute() {
    const out = { t: new Date().toISOString(), idle: idleNow(), groups: {} };
    for (const [group, g] of minute) {
      out.groups[group] = {
        n: g.lat.length,
        p50: pct(g.lat, 50),
        p95: pct(g.lat, 95),
        p99: pct(g.lat, 99),
        max: pct(g.lat, 100),
        nNoVerify: g.latNoVerify.length,
        p99NoVerify: pct(g.latNoVerify, 99),
        status: g.status,
      };
    }
    appendFileSync(minutesFile, JSON.stringify(out) + '\n');
    writeFileSync(totalsFile, JSON.stringify({ ...totals, at: out.t }, null, 2));
    minute = new Map();
  }
  const flusher = setInterval(flushMinute, 60_000);

  async function timed(method, path, opts) {
    const duringVerify = verifyInFlight > 0;
    const r = await http(method, path, opts);
    r.duringVerify = duringVerify || verifyInFlight > 0;
    return r;
  }

  // ── long-lived reader sessions, one per account; re-login on 401 and count it ────────────
  const sessions = {};
  const readerIp = { admin: '10.1.0.10', orgA: '10.1.0.11', orgB: '10.1.0.12' };
  async function ensure(who) {
    if (sessions[who]) return sessions[who];
    const a = accounts[who];
    const r = await login(a.username, a.password, readerIp[who]);
    record('auth', 'login (reader session)', r, [200]);
    sessions[who] = r.cookie;
    return r.cookie;
  }
  async function authed(group, kind, who, method, path, body, expected = [200]) {
    const cookie = await ensure(who);
    const r = await timed(method, path, { cookie, body, ip: readerIp[who], raw: group === 'static' });
    if (r.status === 401) {
      event(`reader session for ${who} answered 401 on ${path}; logging in again`);
      sessions[who] = null;
    }
    record(group, kind, r, expected);
    return r;
  }

  const keys = { admin: [], orgA: [], orgB: [] };
  const teamOrder = ['orgA', 'orgB', 'admin'];
  let saveCount = 0;
  const who3 = () => teamOrder[randomInt(3)];
  const pick = (arr) => arr[randomInt(arr.length)];

  // Static files: the shell and the built assets, discovered from the shell itself.
  const shell = await http('GET', '/', {});
  const assets = [...new Set([...shell.text.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];
  const staticPaths = ['/', '/setup', ...assets];
  event(`static paths: ${staticPaths.join(' ')}`);

  const contentPaths = ['/api/tracks', '/api/brands', '/api/player-groups', '/api/racers'];
  // 360 days back to tomorrow: inside the route's 366-day limit with room to spare, and wide enough
  // that every race the soak stores is in the period (the most expensive evaluation there is).
  const yearAgo = () => new Date(Date.now() - 360 * 86400_000).toISOString();
  const tomorrow = () => new Date(Date.now() + 86400_000).toISOString();
  let testAidsOn = false;
  let failIpSeq = 0;

  const lanes = [
    ['static', 100, async () => {
      const p = pick(staticPaths);
      const r = await timed('GET', p, { raw: true, ip: `10.2.${randomInt(255)}.${randomInt(255)}` });
      record('static', 'static file', r, [200]);
    }],
    ['content', 200, () => authed('content', 'content list', who3(), 'GET', pick(contentPaths))],
    ['history', 500, () => authed('history', 'race history', who3(), 'GET', `/api/races?limit=20&offset=${randomInt(3) * 20}`)],
    ['single', 500, async () => {
      const who = who3();
      if (!keys[who].length) return;
      await authed('single', 'single race', who, 'GET', `/api/races/${pick(keys[who])}`);
    }],
    ['testAidsRead', 1000, () => authed('settings', 'test-aids read', who3(), 'GET', '/api/settings/test-aids')],
    ['evaluation', 2000, () =>
      authed('evaluation', 'period evaluation', who3(), 'GET',
        `/api/races/evaluation?from=${encodeURIComponent(yearAgo())}&to=${encodeURIComponent(tomorrow())}`)],
    ['pointsRead', 2000, () => authed('settings', 'points-rule read', who3(), 'GET', '/api/races/evaluation/points-rule')],
    ['save', 2000, async () => {
      const who = teamOrder[saveCount++ % 3];
      const t = templates[saveCount % templates.length];
      const body = {
        ...t,
        clientRaceId: `soak-${who}-${saveCount}-${randomBytes(4).toString('hex')}`,
        finishedAt: new Date().toISOString(),
      };
      const r = await authed('save', 'race save', who, 'POST', '/api/races', body, [201]);
      if (r.status === 201 && r.json?.shortKey) {
        keys[who].push(r.json.shortKey);
        if (keys[who].length > 2000) keys[who].splice(0, keys[who].length - 2000);
      }
    }],
    ['loginCycle', 4000, async () => {
      const who = pick(['orgA', 'orgB']);
      const ip = `10.3.${randomInt(255)}.${randomInt(255)}`;
      const r = await login(accounts[who].username, accounts[who].password, ip);
      record('auth', 'login', r, [200]);
      if (!r.cookie) return;
      const me = await timed('GET', '/api/auth/me', { cookie: r.cookie, ip });
      record('auth', 'me', me, [200]);
      const out = await timed('POST', '/api/auth/logout', { cookie: r.cookie, ip });
      record('auth', 'logout', out, [200]);
      const after = await timed('GET', '/api/auth/me', { cookie: r.cookie, ip });
      record('auth', 'me after logout', after, [401]);
    }],
    ['failedLogin', 3000, async () => {
      const fixed = failIpSeq++ % 2 === 0;
      const ip = fixed ? '10.9.9.9' : `10.200.${(failIpSeq >> 8) & 255}.${failIpSeq & 255}`;
      const r = await http('POST', '/api/auth/login', {
        body: { username: pick([accounts.orgA.username, 'nobody-here']), password: 'wrong-password' },
        ip,
      });
      // The fixed address must reach 429 after ten failures in the window; a fresh one never does.
      record('auth', fixed ? 'failed login (fixed address)' : 'failed login (fresh address)', r, fixed ? [401, 429] : [401]);
    }],
    ['abandoned', 60_000, async () => {
      const who = pick(['orgA', 'orgB', 'admin']);
      const r = await login(accounts[who].username, accounts[who].password, `10.4.${randomInt(255)}.${randomInt(255)}`);
      record('auth', 'abandoned login (never logged out)', r, [200]);
    }],
    ['pointsWrite', 60_000, () =>
      authed('settings', 'points-rule save (admin)', 'admin', 'PUT', '/api/races/evaluation/points-rule', {
        pointsEnabled: true,
        pointsPerPlace: [10, 6, 4, 3, 2, randomInt(2)],
      })],
    ['verify', 300_000, async () => {
      if (!keys.admin.length) return;
      verifyInFlight += 1;
      try {
        const r = await authed('verify', 'verify race (admin)', 'admin', 'POST', `/api/races/${pick(keys.admin)}/verify`, {});
        if (r.status === 200 && r.json?.identical !== true) {
          totals.unexpected += 1;
          event(`VERIFY NOT IDENTICAL ${JSON.stringify(r.json).slice(0, 300)}`);
        } else if (r.status === 200) {
          event(`verify ${r.json.shortKey} identical, server ${r.json.ms} ms, wall ${Math.round(r.ms)} ms, ${r.json.racers} racers on ${r.json.track}`);
        }
      } finally {
        verifyInFlight -= 1;
      }
    }],
    ['testAidsWrite', 600_000, async () => {
      testAidsOn = !testAidsOn;
      await authed('settings', 'test-aids switch (admin)', 'admin', 'PUT', '/api/settings/test-aids', { enabled: testAidsOn });
    }],
  ];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function laneLoop([name, every, fn]) {
    // Stagger the lanes so the slow ones do not all fire in the same instant.
    await sleep(randomInt(Math.min(every, 5000)));
    while (Date.now() < endAt) {
      if (idleNow()) {
        await sleep(1000);
        continue;
      }
      const t0 = Date.now();
      try {
        await fn();
      } catch (e) {
        totals.unexpected += 1;
        event(`LANE ${name} threw: ${e?.stack ?? e}`);
      }
      const left = every - (Date.now() - t0);
      if (left > 0) await sleep(left);
    }
  }
  await Promise.all(lanes.map(laneLoop));
  clearInterval(flusher);
  flushMinute();
  event(`run end; ${Object.values(totals.byKind).reduce((a, b) => a + b, 0)} requests`);
}

if (mode === 'setup') await setup();
else if (mode === 'run') await run(Number(hoursArg ?? 8));
else throw new Error('mode is setup or run');
