// ============================================================
// File:        route-check.mjs
// Path:        deploy/test/route-check.mjs
// Project:     RaceArena — WEBSITE-EMBED-1 piece 5a (2026-11-11)
// Description: The visitor's side of the route test (deploy/test/route-test.sh): requests through a
//              REAL proxy on 127.0.0.1:<proxyPort>, then what the fake race received (its /__log on
//              127.0.0.1:<racePort>) and what the fake website's authorize call received (/__last on
//              127.0.0.1:<sitePort>). Prints one PASS or FAIL line per proof; exit 1 on any FAIL.
//
// Usage: node route-check.mjs <proxyPort> <racePort> <sitePort> <secretFile>
// The secret is read to COMPARE it, and is never printed.
// ============================================================

import http from 'node:http';
import { readFileSync } from 'node:fs';

const [proxyPort, racePort, sitePort, secretFile] = process.argv.slice(2);
const SECRET = readFileSync(secretFile, 'utf8').trim();
const SIGNIN = '/games/race/auth/website';

function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    r.on('error', reject);
    r.setTimeout(10_000, () => r.destroy(new Error('timed out')));
    r.end();
  });
}
const raceLog = async () => JSON.parse((await get(racePort, '/__log')).data);
const lastAuthorize = async () => JSON.parse((await get(sitePort, '/__last')).data);

let failed = 0;
function proof(name, ok, detail = '') {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

// Through the proxy; returns what the race received for exactly this request (or null).
async function viaProxy(path, headers) {
  const before = (await raceLog()).length;
  const res = await get(proxyPort, path, headers);
  const log = await raceLog();
  return { res, got: log.length > before ? log[log.length - 1] : null, reached: log.length - before };
}

const FORGED = {
  'X-Acting-User-Id': 'evil',
  'X-Acting-User': 'Evil',
  'X-Acting-User-Roles': 'admin',
  'X-Acting-User-Can-Host': 'true',
  'X-Acting-Guest': 'true',
  'x-acting-user-email-verified': 'true',
  'X-Ra-Proxy-Secret': 'forged-by-the-client',
};
const IDENTITY = ['x-acting-user-id', 'x-acting-user', 'x-acting-user-roles', 'x-acting-user-email-verified', 'x-acting-user-can-host', 'x-acting-user-steps', 'x-acting-guest'];
const SITE_COOKIE = (who) => `__Host-se.sid=${who}; ra.sid=race-session; se.sid=${who}; ra_join=device`;

// ── 1. the race never receives the website cookie ────────────────────────────────────────────────
{
  const plain = await viaProxy('/games/race/api/anything', { Cookie: SITE_COOKIE('member') });
  const signin = await viaProxy(SIGNIN, { Cookie: SITE_COOKIE('member') });
  const cookies = [plain.got?.headers.cookie ?? '', signin.got?.headers.cookie ?? ''];
  proof(
    'the race never receives the website cookie (a plain path and the sign-in)',
    plain.got && signin.got && cookies.every((c) => !/(^|;\s*)(__Host-)?se\.sid=/.test(c)) &&
      cookies.every((c) => c.includes('ra.sid=race-session') && c.includes('ra_join=device')),
    `race saw: ${JSON.stringify(cookies)}`
  );
  proof('the full path is forwarded', plain.got?.path === '/games/race/api/anything', `race saw ${plain.got?.path}`);
}

// ── 2. the authorize subrequest does receive it ──────────────────────────────────────────────────
{
  await viaProxy(SIGNIN, { Cookie: SITE_COOKIE('host') });
  const last = await lastAuthorize();
  proof(
    'the authorize subrequest receives the website cookie',
    /__Host-se\.sid=host/.test(last?.headers?.cookie ?? '') && last?.url?.startsWith('/api/games/race/authorize'),
    `authorize saw cookie: ${last?.headers?.cookie}`
  );
}

// ── 3. client-sent identity and secret are cleared on every path, the sign-in included ───────────
{
  const plain = await viaProxy('/games/race/api/x', FORGED);
  const plainClean = plain.got && IDENTITY.every((h) => plain.got.headers[h] === undefined) &&
    plain.got.headers['x-ra-proxy-secret'] === undefined;
  proof('a plain path: client-sent X-Acting-* and secret are cleared', plainClean, JSON.stringify(plain.got?.headers));

  const member = await viaProxy(SIGNIN, { ...FORGED, Cookie: SITE_COOKIE('member') });
  const h = member.got?.headers ?? {};
  proof(
    'the sign-in as a member: the WEBSITE\'s identity, none of the client\'s',
    h['x-acting-user-id'] === 'w-mia' && h['x-acting-user'] === 'Mia Member' && h['x-acting-user-roles'] === 'member' &&
      h['x-acting-user-can-host'] === 'false' && h['x-acting-guest'] === undefined && h['x-ra-proxy-secret'] === SECRET,
    JSON.stringify({ ...h, 'x-ra-proxy-secret': h['x-ra-proxy-secret'] === SECRET ? '<the secret>' : h['x-ra-proxy-secret'] })
  );
  const guest = await viaProxy(SIGNIN, { ...FORGED, Cookie: SITE_COOKIE('guest') });
  const g = guest.got?.headers ?? {};
  proof(
    'the sign-in as a guest: X-Acting-Guest only, the client\'s user id gone',
    g['x-acting-guest'] === 'true' && g['x-acting-user-id'] === undefined && g['x-acting-user'] === undefined &&
      g['x-acting-user-roles'] === undefined && g['x-ra-proxy-secret'] === SECRET,
    JSON.stringify(Object.keys(g))
  );
  const host = await viaProxy(SIGNIN, { Cookie: SITE_COOKIE('host') });
  proof('the sign-in as a host: can-host from the website', host.got?.headers['x-acting-user-can-host'] === 'true');
  const nobody = await viaProxy(SIGNIN, { ...FORGED, Cookie: 'ra.sid=race-session' });
  proof('no website session: the website\'s 401, and the race is not asked', nobody.res.status === 401 && nobody.reached === 0, `status ${nobody.res.status}, reached ${nobody.reached}`);
}

// ── 4. the secret is present only on the sign-in route ───────────────────────────────────────────
{
  const paths = ['/games/race/', '/games/race/api/health', '/games/race/auth/website/x', '/games/race/auth/websitex'];
  const seen = [];
  for (const p of paths) {
    const r = await viaProxy(p, { Cookie: SITE_COOKIE('member') });
    seen.push(r.got?.headers['x-ra-proxy-secret'] === undefined);
  }
  const signin = await viaProxy(SIGNIN, { Cookie: SITE_COOKIE('member') });
  proof('the secret only on the sign-in route', seen.every(Boolean) && signin.got?.headers['x-ra-proxy-secret'] === SECRET, `absent elsewhere: ${seen}`);
}

// ── 5. nothing outside /games/race/ reaches the race ─────────────────────────────────────────────
{
  const outside = ['/', '/games/race', '/games/racer/x', '/games/', '/api/games/race/authorize', '/gamesrace/', '/x/games/race/'];
  let reached = 0;
  const answers = [];
  for (const p of outside) {
    const r = await viaProxy(p, { Cookie: SITE_COOKIE('member') });
    reached += r.reached;
    answers.push(`${p}→${r.res.status}`);
  }
  proof('nothing outside /games/race/ reaches the race', reached === 0, answers.join(' '));
}

process.exitCode = failed ? 1 : 0;
