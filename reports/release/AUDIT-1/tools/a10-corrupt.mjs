// AUDIT-1 A10: what the server does with a damaged data folder. Each scenario starts the server on a
// THROWAWAY data directory (never the owner's) on a port the owner does not use (4711+), damages one
// file, and records: does it start, what /api/health says, and what the affected route answers.
// Usage: node a10-corrupt.mjs <clone>
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const clone = process.argv[2];
const TOKEN = 'audit-bootstrap-token';
let port = 4711;

async function boot(dataDir) {
  const p = port++;
  const child = spawn(process.execPath, [join(clone, 'server/src/index.js')], {
    env: { ...process.env, PORT: String(p), RA_DATA_DIR: dataDir, RA_BOOTSTRAP_TOKEN: TOKEN, RA_SESSION_SECRET: 'audit-secret-0123456789abcdef0123456789', RA_CLIENT_ORIGIN: '', NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const exited = new Promise((r) => child.once('exit', (code) => r(code)));
  const base = `http://127.0.0.1:${p}`;
  const started = Date.now();
  let up = false;
  while (Date.now() - started < 20000) {
    const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r('wait'), 300))]);
    if (code !== 'wait') return { up: false, exitCode: code, log, base, stop: async () => {} };
    try {
      if ((await fetch(`${base}/api/health`)).ok) { up = true; break; }
    } catch { /* not yet */ }
  }
  const stop = async () => { child.kill(); await exited; };
  return { up, log, base, stop };
}

async function adminCookie(base) {
  const h = { 'Content-Type': 'application/json', 'x-bootstrap-token': TOKEN };
  const body = JSON.stringify({ username: 'auditadmin', password: 'audit-password-1', team: 'Audit' });
  const r = await fetch(`${base}/api/auth/setup`, { method: 'POST', headers: h, body });
  const cookie = r.headers.get('set-cookie')?.split(';')[0];
  if (cookie) return cookie;
  const l = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'auditadmin', password: 'audit-password-1' }) });
  return l.headers.get('set-cookie')?.split(';')[0];
}

const status = async (base, path, cookie, init = {}) => {
  const r = await fetch(`${base}${path}`, { ...init, headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}), Accept: 'application/json' } });
  return `${r.status} ${(r.headers.get('content-type') ?? '').split(';')[0]} ${(await r.text()).slice(0, 80).replace(/\s+/g, ' ')}`;
};

async function scenario(name, prepare, probe) {
  const dir = mkdtempSync(join(os.tmpdir(), 'ra-a10-data-'));
  try {
    // A first boot creates the folder layout and seeds; the damage is done after it, as in life.
    const first = await boot(dir);
    const cookie = first.up ? await adminCookie(first.base) : null;
    await first.stop();
    prepare(dir);
    const s = await boot(dir);
    console.log(`\n## ${name}`);
    console.log(`starts: ${s.up ? 'yes' : `NO (exit ${s.exitCode})`}`);
    if (s.up) {
      console.log(`health: ${await status(s.base, '/api/health')}`);
      for (const line of await probe(s.base, cookie)) console.log(line);
    }
    const tail = s.log.split('\n').filter((l) => /error|warn|corrupt|fail|cannot|refus/i.test(l)).slice(0, 4);
    for (const l of tail) console.log(`log: ${l.slice(0, 160)}`);
    await s.stop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await scenario('users.json is not JSON', (d) => writeFileSync(join(d, 'users.json'), '{"broken'), async (b, c) => [
  `setup-needed: ${await status(b, '/api/auth/setup-needed')}`,
  `login: ${await status(b, '/api/auth/login', null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"username":"auditadmin","password":"audit-password-1"}' })}`,
  `signed-in GET /api/tracks: ${await status(b, '/api/tracks', c)}`,
]);

await scenario('races.sqlite is not a database', (d) => writeFileSync(join(d, 'races.sqlite'), 'this is not sqlite'.repeat(100)), async (b, c) => [
  `signed-in GET /api/races: ${await status(b, '/api/races', c)}`,
  `signed-in GET /api/tracks: ${await status(b, '/api/tracks', c)}`,
]);

await scenario('sessions.sqlite is not a database', (d) => writeFileSync(join(d, 'sessions.sqlite'), 'garbage'.repeat(200)), async (b) => [
  `login: ${await status(b, '/api/auth/login', null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"username":"auditadmin","password":"audit-password-1"}' })}`,
]);

await scenario('one track file is not JSON', (d) => {
  const t = readdirSync(join(d, 'tracks')).find((f) => f.endsWith('.json'));
  writeFileSync(join(d, 'tracks', t), '{"id":');
}, async (b, c) => [`signed-in GET /api/tracks: ${await status(b, '/api/tracks', c)}`]);
