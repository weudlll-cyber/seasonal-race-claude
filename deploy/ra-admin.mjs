// ============================================================
// File:        ra-admin.mjs
// Path:        deploy/ra-admin.mjs
// Project:     RaceArena — VPS-INSTALL-1 (2026-10-07)
// Description: The HTTP steps of an install, run by `deploy/racearena` in a one-off container of
//              the app image on the compose network — so the host needs neither Node nor curl, and
//              a local test runs exactly the code a server runs.
//
// Usage (inside the container; `racearena` mounts deploy/ at /deploy):
//   node /deploy/ra-admin.mjs setup  --user <name>     first admin, via POST /api/auth/setup
//   node /deploy/ra-admin.mjs signin --user <name>     sign in through Caddy over https, check the
//                                                      cookie is Secure, read /api/auth/me, sign out
//   node /deploy/ra-admin.mjs health [--https]         GET /api/health, on the app or through Caddy
//
// ★ THE PASSWORD IS READ FROM STANDARD INPUT, never from an argument or a variable: those are visible
//   in the process list and can land in shell history. `racearena` pipes it in from memory.
// The bootstrap token and the public address come from the container's environment — the app's own
// settings file, which compose hands to every container of the `app` service.
// ============================================================

import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';

const [cmd, ...args] = process.argv.slice(2);
const arg = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const origin = process.env.RA_PUBLIC_ORIGIN;
if (!origin) throw new Error('RA_PUBLIC_ORIGIN is not set in the settings file');
const domain = new URL(origin).hostname;

function readStdin() {
  return new Promise((resolve) => {
    let s = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (s += c));
    process.stdin.on('end', () => resolve(s.replace(/\r?\n$/, '')));
  });
}

/**
 * One request. `viaCaddy` sends it over https to the `caddy` service with the public name as the
 * server name (SNI) and Host, so the certificate is checked exactly as a browser would check it;
 * otherwise it goes straight to the app on the compose network.
 */
function request(method, path, { body, cookie, headers = {}, viaCaddy = false } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const h = { Host: domain, Origin: origin, 'X-Forwarded-Proto': 'https', ...headers };
    if (payload) h['Content-Type'] = 'application/json';
    if (cookie) h.Cookie = cookie;
    // RA_EXTRA_CA: Caddy's own root when it signs for itself (`tls internal`, a local test). With a
    // public certificate it is empty and only the system's roots are trusted.
    const ca = process.env.RA_EXTRA_CA ? [...tls.rootCertificates, process.env.RA_EXTRA_CA] : undefined;
    const opts = viaCaddy
      ? { host: 'caddy', port: 443, servername: domain, ca, method, path, headers: h }
      : { host: 'app', port: 4000, method, path, headers: h };
    const req = (viaCaddy ? https : http).request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('timed out')));
    if (payload) req.write(payload);
    req.end();
  });
}

async function setup() {
  const username = arg('user');
  const password = await readStdin();
  const token = process.env.RA_BOOTSTRAP_TOKEN;
  if (!username || !password) throw new Error('setup needs --user and a password on standard input');
  if (!token) throw new Error('RA_BOOTSTRAP_TOKEN is not set — the first admin cannot be created');
  const r = await request('POST', '/api/auth/setup', {
    body: { username, password },
    headers: { 'x-bootstrap-token': token },
  });
  // 409 = an admin exists already: a re-run after a later step failed. Nothing to do.
  if (r.status === 409) return console.log('first admin: already created earlier');
  if (r.status !== 201) throw new Error(`first admin NOT created: ${r.status} ${r.data}`);
  console.log(`first admin: created (${JSON.parse(r.data).username})`);
}

async function signin() {
  const username = arg('user');
  const password = await readStdin();
  const login = await request('POST', '/api/auth/login', { body: { username, password }, viaCaddy: true });
  if (login.status !== 200) throw new Error(`sign-in through https://${domain} failed: ${login.status} ${login.data}`);
  const set = [login.headers['set-cookie'] ?? []].flat().find((c) => /ra\.sid=/.test(c));
  if (!set) throw new Error('sign-in answered 200 but set no session cookie');
  if (!/;\s*Secure/i.test(set)) throw new Error(`the session cookie is not Secure: ${set.split(';')[0].split('=')[0]}`);
  const cookie = set.split(';')[0];
  const me = await request('GET', '/api/auth/me', { cookie, viaCaddy: true });
  if (me.status !== 200) throw new Error(`/api/auth/me after sign-in answered ${me.status}`);
  await request('POST', '/api/auth/logout', { cookie, viaCaddy: true });
  console.log(`sign-in through https://${domain}: works (cookie ${cookie.split('=')[0]}, Secure; signed in as ${JSON.parse(me.data).username})`);
}

async function health() {
  const viaCaddy = args.includes('--https');
  const r = await request('GET', '/api/health', { viaCaddy });
  if (r.status !== 200) throw new Error(`health ${viaCaddy ? `through https://${domain}` : 'on the app'}: ${r.status}`);
  console.log(`health ${viaCaddy ? `through https://${domain}` : 'on the app'}: ok`);
}

const run = { setup, signin, health }[cmd];
if (!run) {
  console.error('usage: ra-admin.mjs setup|signin --user <name>  (password on stdin) · ra-admin.mjs health [--https]');
  process.exitCode = 2;
} else {
  run().catch((e) => {
    console.error(String(e?.message ?? e));
    process.exitCode = 1;
  });
}
