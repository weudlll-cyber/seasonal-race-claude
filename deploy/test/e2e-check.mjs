// ============================================================
// File:        e2e-check.mjs
// Path:        deploy/test/e2e-check.mjs
// Project:     RaceArena — VPS-INSTALL-1 (2026-10-07)
// Description: The host-side checks of deploy/test/e2e-local.sh: what a VISITOR sees, over https on
//              127.0.0.1:443 with the test name as SNI and Host, trusting only Caddy's own test root.
//
// Usage: node e2e-check.mjs <domain> <caRootFile> <command> [args]   (passwords on standard input)
//   cookie <user>             sign in; print the cookie's name and attributes; exit 1 unless Secure
//   store-race <user>         sign in, store one race, print its short key
//   read-race <user> <key>    sign in, read the race back; exit 1 unless it is the one stored
//   signin <user>             sign in; exit 1 unless it works
//   setup-refused             POST /api/auth/setup again; exit 0 when it is refused (the token is gone)
//   test-aids-off <user>      sign in; exit 1 unless the test-aids switch reads OFF (a fresh install)
//   open-registration <user>  sign in, open a player registration, register one player ANONYMOUSLY
//                             through the public join route; print its code (REGISTRATION-1)
//   read-registration <code>  anonymously: the public join route still holds that one player, and
//                             /join/<code> is served the app's page — through Caddy (REGISTRATION-1)
// ============================================================

import https from 'node:https';
import { readFileSync } from 'node:fs';

const [domain, caFile, cmd, ...args] = process.argv.slice(2);
const ca = readFileSync(caFile, 'utf8');
const origin = `https://${domain}`;

function req(method, path, { body, cookie, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const h = { Host: domain, Origin: origin, ...headers };
    if (payload) h['Content-Type'] = 'application/json';
    if (cookie) h.Cookie = cookie;
    const r = https.request({ host: '127.0.0.1', port: 443, servername: domain, ca, method, path, headers: h }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
    r.on('error', reject);
    r.setTimeout(20_000, () => r.destroy(new Error('timed out')));
    if (payload) r.write(payload);
    r.end();
  });
}

const stdin = () =>
  new Promise((resolve) => {
    let s = '';
    process.stdin.on('data', (c) => (s += c));
    process.stdin.on('end', () => resolve(s.replace(/\r?\n$/, '')));
  });

async function signIn(user) {
  const r = await req('POST', '/api/auth/login', { body: { username: user, password: await stdin() } });
  if (r.status !== 200) throw new Error(`sign-in: ${r.status} ${r.data}`);
  const set = [r.headers['set-cookie'] ?? []].flat().find((c) => /ra\.sid=/.test(c));
  return { set, cookie: set.split(';')[0] };
}

// One race with the fields the store requires (server/src/races/raceStore.js `storeRace`).
const RACE = {
  clientRaceId: `e2e-${Date.now()}`,
  finishedAt: new Date().toISOString(),
  identifierVersion: 1,
  buildId: 'e2e',
  geometryId: 'dirt-oval',
  racerTypeId: 'beetle',
  racePlanSeed: 7,
  raceActionStage: 'quiet',
  racePlanEnabled: true,
  targetLaps: 3,
  names: ['Ada', 'Bob', 'Cy'],
  worldConfigs: {},
  results: [
    { name: 'Bob', finishTimeMs: 61000 },
    { name: 'Ada', finishTimeMs: 61500 },
    { name: 'Cy', finishTimeMs: 62000 },
  ],
  winners: ['Bob', 'Ada', 'Cy'],
  raceSource: 'race',
};

const commands = {
  async cookie(user) {
    const { set } = await signIn(user);
    const attrs = set.split(';').slice(1).map((s) => s.trim().split('=')[0]);
    console.log(`cookie ${set.split('=')[0]}; attributes: ${attrs.join(', ')}`);
    if (!attrs.some((a) => /^secure$/i.test(a))) throw new Error('the session cookie is not Secure');
  },
  async signin(user) {
    await signIn(user);
    console.log(`sign-in as ${user}: ok`);
  },
  async 'store-race'(user) {
    const { cookie } = await signIn(user);
    const r = await req('POST', '/api/races', { body: RACE, cookie });
    if (r.status !== 201) throw new Error(`store: ${r.status} ${r.data}`);
    console.log(JSON.parse(r.data).shortKey);
  },
  async 'read-race'(user, key) {
    const { cookie } = await signIn(user);
    const r = await req('GET', `/api/races/${key}`, { cookie });
    if (r.status !== 200) throw new Error(`read ${key}: ${r.status} ${r.data}`);
    const race = JSON.parse(r.data);
    if (race.results[0].name !== 'Bob' || race.names.length !== 3) throw new Error(`read ${key}: not the race stored`);
    console.log(`race ${key}: read back, winner ${race.results[0].name}, ${race.names.length} racers`);
  },
  async 'test-aids-off'(user) {
    // A fresh installation ships with the test-aids switch OFF (TEST-AIDS-1; docs/DEPLOYMENT.md).
    const { cookie } = await signIn(user);
    const r = await req('GET', '/api/settings/test-aids', { cookie });
    if (r.status !== 200) throw new Error(`test-aids: ${r.status} ${r.data}`);
    if (JSON.parse(r.data).enabled !== false) throw new Error(`test-aids is ON on a fresh install: ${r.data}`);
    console.log('test-aids switch on the fresh install: OFF');
  },
  // REGISTRATION-1 (2026-10-22): a registration is data in `registrations.sqlite`, which the backup
  // must carry, and its two public paths — the page /join/<code> and the route /api/join/<code> —
  // must reach the app through the proxy like everything else.
  async 'open-registration'(user) {
    const { cookie } = await signIn(user);
    const closesAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const r = await req('POST', '/api/registrations', {
      body: { trackId: 'dirt-oval', capacity: 3, eventName: 'VPS e2e', closesAt },
      cookie,
    });
    if (r.status !== 201) throw new Error(`open registration: ${r.status} ${r.data}`);
    const { code } = JSON.parse(r.data);
    const joined = await req('POST', `/api/join/${code}`, { body: { name: 'Vic' } });
    if (joined.status !== 201) throw new Error(`join: ${joined.status} ${joined.data}`);
    console.log(code);
  },
  async 'read-registration'(code) {
    const info = await req('GET', `/api/join/${code}`);
    if (info.status !== 200) throw new Error(`public info ${code}: ${info.status} ${info.data}`);
    const body = JSON.parse(info.data);
    if (body.capacity !== 3 || body.placesLeft !== 2) throw new Error(`registration ${code}: not the one opened (${info.data})`);
    const page = await req('GET', `/join/${code}`);
    if (page.status !== 200 || !/text\/html/.test(page.headers['content-type'] ?? ''))
      throw new Error(`/join/${code}: ${page.status} ${page.headers['content-type']}`);
    console.log(`registration ${code}: 1 player, 2 of 3 places left; /join page served (${page.status})`);
  },
  async 'setup-refused'() {
    const r = await req('POST', '/api/auth/setup', { body: { username: 'x', password: 'xxxxxxxxxxxx' }, headers: { 'x-bootstrap-token': 'anything' } });
    if (r.status === 201) throw new Error('setup was ACCEPTED again');
    console.log(`setup again: refused with ${r.status}`);
  },
};

const run = commands[cmd];
if (!run) {
  console.error(`unknown command ${cmd}`);
  process.exitCode = 2;
} else {
  run(...args).catch((e) => {
    console.error(String(e?.message ?? e));
    process.exitCode = 1;
  });
}
