// ============================================================
// File:        keepalive.mjs
// Path:        reports/release/SOAK-1/keepalive.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 step 2b — reproduces (or fails to reproduce) the soak's client-side network
//              errors, and tests the explanation "a reused keep-alive connection is closed by the
//              server's keep-alive timer, which fires late because a verify blocked the event loop".
//
// Usage: node keepalive.mjs <base> <accounts.json> <rawDir> [rounds=10]
//
// Three arms, run one after the other against the same server:
//   A  keep-alive  + verify   — 8 clients on a keep-alive agent, each a request every 300–1500 ms,
//                              while an admin verify runs every 20 s
//   B  no reuse    + verify   — the same, but every request on a NEW connection (agent: false)
//   C  keep-alive, NO verify  — arm A's traffic for the same time with no verify at all
// The prediction, if the explanation is right: errors in A, all inside or just after a verify;
// none in B; none in C. Every error is logged with its code and its offset from the verify.
// ============================================================

import http from 'node:http';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [base, accountsFile, rawDir, roundsArg] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|\[::1\]):\d+$/.test(base ?? '')) throw new Error('base must be loopback');
const rounds = Number(roundsArg ?? 10);
const url = new URL(base);
const accounts = JSON.parse(readFileSync(accountsFile, 'utf8'));
const out = join(rawDir, 'keepalive.jsonl');
const log = (o) => appendFileSync(out, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');

function req({ method = 'GET', path, agent, cookie, body }) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const headers = { 'X-Forwarded-For': '10.7.0.1', 'X-Forwarded-Proto': 'https' };
    if (cookie) headers.Cookie = cookie;
    if (method !== 'GET') headers.Origin = base;
    const payload = body === undefined ? undefined : JSON.stringify(body);
    if (payload) headers['Content-Type'] = 'application/json';
    const r = http.request({ host: url.hostname, port: url.port, method, path, agent, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, ms: performance.now() - t0, data, headers: res.headers, reused: r.reusedSocket }));
    });
    r.on('error', (e) => resolve({ status: 'error', code: e.code ?? e.message, ms: performance.now() - t0, reused: r.reusedSocket }));
    r.setTimeout(60_000, () => r.destroy(new Error('timeout')));
    if (payload) r.write(payload);
    r.end();
  });
}

const login = await req({ method: 'POST', path: '/api/auth/login', agent: false, body: { username: accounts.admin.username, password: accounts.admin.password } });
const cookie = (login.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]).find((c) => /ra\.sid=/.test(c));
if (!cookie) throw new Error(`admin login failed: ${login.status}`);
const page = JSON.parse((await req({ path: '/api/races?limit=20', agent: false, cookie })).data);
const keys = page.races.map((r) => r.shortKey);
if (!keys.length) throw new Error('no admin-team races to verify');

async function arm(name, { agent, verify }) {
  let running = true;
  let verifyWindow = null; // [start, end] of the current or last verify, ms since epoch
  const stats = { name, requests: 0, errors: 0, errorsReused: 0, errorsDuringVerify: 0, statuses: {}, verifies: [], maxHealthMsDuringVerify: 0 };
  const clients = Array.from({ length: 8 }, async () => {
    while (running) {
      const r = await req({ path: '/api/health', agent });
      const now = Date.now();
      stats.requests += 1;
      const inVerify = verifyWindow && now >= verifyWindow[0] && (verifyWindow[1] === null || now <= verifyWindow[1] + 1000);
      if (inVerify && r.status === 200) stats.maxHealthMsDuringVerify = Math.max(stats.maxHealthMsDuringVerify, Math.round(r.ms));
      stats.statuses[r.status] = (stats.statuses[r.status] ?? 0) + 1;
      if (r.status === 'error') {
        stats.errors += 1;
        if (r.reused) stats.errorsReused += 1;
        if (inVerify) stats.errorsDuringVerify += 1;
        log({ arm: name, error: r.code, reused: r.reused, ms: Math.round(r.ms), msAfterVerifyStart: verifyWindow ? now - verifyWindow[0] : null });
      }
      await new Promise((res) => setTimeout(res, 300 + Math.random() * 1200));
    }
  });
  for (let i = 0; i < rounds; i++) {
    await new Promise((res) => setTimeout(res, 10_000));
    if (verify) {
      verifyWindow = [Date.now(), null];
      const v = await req({ method: 'POST', path: `/api/races/${keys[i % keys.length]}/verify`, agent: false, cookie, body: {} });
      verifyWindow[1] = Date.now();
      const j = v.status === 200 ? JSON.parse(v.data) : null;
      stats.verifies.push({ status: v.status, wallMs: Math.round(v.ms), serverMs: j?.ms, identical: j?.identical, racers: j?.racers });
    }
    await new Promise((res) => setTimeout(res, 10_000));
  }
  running = false;
  await Promise.all(clients);
  log({ arm: name, summary: stats });
  return stats;
}

const keepAlive = new http.Agent({ keepAlive: true, maxSockets: 8 });
const results = [];
results.push(await arm('A keep-alive + verify', { agent: keepAlive, verify: true }));
results.push(await arm('B no reuse + verify', { agent: false, verify: true }));
results.push(await arm('C keep-alive, no verify', { agent: keepAlive, verify: false }));
keepAlive.destroy();
console.log(JSON.stringify(results.map(({ verifies, ...s }) => ({ ...s, verifyWallMs: verifies.map((v) => v.wallMs), allIdentical: verifies.every((v) => v.identical) })), null, 2));
