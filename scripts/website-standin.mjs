// ============================================================
// File:        scripts/website-standin.mjs
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: A LOCAL STAND-IN FOR THE SEASONAL ENTERTAINMENT WEBSITE'S PROXY — for tests and for
//              the owner's look, never for an install. It is not in the image (server/Dockerfile
//              copies three named scripts and nothing else of scripts/) and it listens on 127.0.0.1
//              only.
//
//              What it does, as the real proxy does:
//                · forwards every request under the base path to a website-mode RaceArena instance,
//                  with the FULL path (nothing stripped);
//                · on <base>/auth/website ONLY, sets the identity headers and the proxy secret for
//                  the fake member picked on its own page; on every other request it REMOVES any such
//                  headers a browser sent, so a test can prove the race ignores them;
//                · answers 404 outside the base path, except its own page.
//
//              Its page (http://127.0.0.1:<port>/) offers four fake members — member, host, admin,
//              guest. Picking one remembers the choice in a cookie on the stand-in's origin and goes
//              straight to <base>/auth/website, i.e. signs in as that member.
//
//              The secret is read from the same file the race instance reads
//              (RA_WEBSITE_PROXY_SECRET_FILE); it is never printed.
//
//              PIECE 3b: it is also the website's account-changes FEED for that instance —
//              GET /api/games/race/account-changes?since=<cursor> with X-Games-Sync-Token (the
//              token from --token-file, the file the race reads as RA_WEBSITE_SYNC_TOKEN_FILE), at
//              most 500 events an answer. Its page can lock, unlock, revoke the rights of, or delete
//              each fake member, so the effect can be seen in the race.
//
//              PIECE 5b: with --site it stands in for THE WEBSITE ITSELF instead of its proxy — for
//              the installer test, behind a REAL proxy carrying the race's route file
//              (deploy/website-route.sh). It then answers GET /api/games/race/authorize by its own
//              session cookie se.sid (member, host, admin, guest; none → 401) with the identity
//              headers and WITHOUT the secret, which is the proxy's to add; picking a member sets
//              se.sid; and it forwards nothing to the race — the proxy routes /games/race/.
//
// Usage:
//   node scripts/website-standin.mjs --port=4790 --target=http://127.0.0.1:4791 \
//        --base=/games/race --secret-file=<path> --token-file=<path>
//   node scripts/website-standin.mjs --site --port=3800 --host=0.0.0.0 --token-file=<path>
// ============================================================

import { createServer, request as httpRequest } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (name, fallback) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

/** The fake members. Fixed ids, so a second sign-in is the same member. */
export const FAKE_MEMBERS = {
  member: {
    id: 'standin-member-1',
    name: 'Mia Member',
    roles: 'member',
    canHost: false,
  },
  host: {
    id: 'standin-host-1',
    name: 'Hugo Host',
    roles: 'member',
    canHost: true,
  },
  admin: {
    id: 'standin-admin-1',
    name: 'Ada Admin',
    roles: 'member,admin',
    canHost: true,
  },
  guest: null,
};

/** Every header the proxy owns; a browser's own copy of any of them is dropped. */
const PROXY_HEADERS = [
  'x-ra-proxy-secret',
  'x-acting-guest',
  'x-acting-user-id',
  'x-acting-user',
  'x-acting-user-roles',
  'x-acting-user-email-verified',
  'x-acting-user-can-host',
  'x-acting-user-steps',
];

/** The identity headers for one kind of fake member. */
export function identityHeaders(kind, secret) {
  const m = FAKE_MEMBERS[kind];
  if (!m) return { 'x-ra-proxy-secret': secret, 'x-acting-guest': 'true' };
  return {
    'x-ra-proxy-secret': secret,
    'x-acting-user-id': m.id,
    'x-acting-user': m.name,
    'x-acting-user-roles': m.roles,
    'x-acting-user-email-verified': 'true',
    'x-acting-user-can-host': String(m.canHost),
    'x-acting-user-steps': Buffer.from(JSON.stringify({})).toString('base64url'),
  };
}

function picked(req) {
  const m = /(?:^|;\s*)standin_as=([a-z]+)/.exec(req.headers.cookie ?? '');
  return m && m[1] in FAKE_MEMBERS ? m[1] : 'guest';
}

/** --site: the member the website's own session cookie names, or null for none (→ 401). */
function siteSession(req) {
  const m = /(?:^|;\s*)se\.sid=([a-z]+)/.exec(req.headers.cookie ?? '');
  return m && m[1] in FAKE_MEMBERS ? m[1] : null;
}
const AUTHORIZE_PATH = '/api/games/race/authorize';

/** The feed's events, in order; the cursor is the index after the last one handed out. */
const FEED_PATH = '/api/games/race/account-changes';
const FEED_PAGE = 500;
const EVENT_TYPES = ['locked', 'unlocked', 'rights', 'deleted'];

function page(base, current, events) {
  const links = Object.keys(FAKE_MEMBERS)
    .map((k) => {
      const m = FAKE_MEMBERS[k];
      const label = m ? `${m.name} — ${k}` : 'A guest — not signed in';
      return `<li><a href="/_standin/as/${k}">${label}</a>${k === current ? ' (picked)' : ''}</li>`;
    })
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>Website stand-in</title>
<h1>Seasonal Entertainment — local stand-in</h1>
<p>Pick who you are. The race then signs you in as that member.</p>
<ul>${links}</ul>
<p><a href="${base}/">Open the race</a></p>
<h2>Account changes (the feed)</h2>
<ul>${Object.keys(FAKE_MEMBERS)
    .filter((k) => FAKE_MEMBERS[k])
    .map(
      (k) =>
        `<li>${FAKE_MEMBERS[k].name}: ` +
        EVENT_TYPES.map((t) => `<a href="/_standin/event/${t}/${k}">${t}</a>`).join(' · ') +
        '</li>'
    )
    .join('\n')}</ul>
<p>${events.length} event(s) so far.</p>`;
}

/**
 * Start the stand-in. Exported so a test can run it in-process.
 * @returns {Promise<import('node:http').Server>}
 */
export function startStandin({
  port,
  target,
  base,
  secret,
  token = null,
  host = '127.0.0.1',
  site = false,
}) {
  const targetUrl = site ? null : new URL(target);
  const events = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://standin.invalid');
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(page(base, picked(req), events));
    }
    // The feed, as the website serves it to the race (piece 3b).
    if (url.pathname === FEED_PATH && token) {
      if (req.headers['x-games-sync-token'] !== token) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        return res.end('Forbidden');
      }
      const since = Math.max(0, Number.parseInt(url.searchParams.get('since') ?? '0', 10) || 0);
      const slice = events.slice(since, since + FEED_PAGE);
      const next = since + slice.length;
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(
        JSON.stringify({
          events: slice,
          nextCursor: String(next),
          hasMore: next < events.length,
        })
      );
    }
    const ev = /^\/_standin\/event\/([a-z]+)\/([a-z]+)$/.exec(url.pathname);
    if (ev && EVENT_TYPES.includes(ev[1]) && FAKE_MEMBERS[ev[2]]) {
      events.push({ type: ev[1], userId: FAKE_MEMBERS[ev[2]].id });
      res.writeHead(303, { location: '/' });
      return res.end();
    }
    const as = /^\/_standin\/as\/([a-z]+)$/.exec(url.pathname);
    if (as && as[1] in FAKE_MEMBERS) {
      // --site: the WEBSITE's session cookie, the one the route file must strip from the race.
      const cookie = site ? `se.sid=${as[1]}` : `standin_as=${as[1]}`;
      res.writeHead(303, {
        'set-cookie': `${cookie}; Path=/; HttpOnly; SameSite=Lax`,
        location: `${base}/auth/website`,
      });
      return res.end();
    }
    // --site: who is asking, for the proxy's authorize subrequest — the identity, never the secret.
    if (site && url.pathname === AUTHORIZE_PATH) {
      const who = siteSession(req);
      if (!who) {
        res.writeHead(401, { 'content-type': 'text/plain' });
        return res.end('not signed in');
      }
      const { 'x-ra-proxy-secret': _secret, ...identity } = identityHeaders(who, '');
      res.writeHead(200, { 'content-type': 'text/plain', ...identity });
      return res.end('ok');
    }
    // --site: the race is the proxy's to reach; the website answers its own pages only.
    if (site) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('Not found (the website stand-in)');
    }
    if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('Not found');
    }

    const headers = { ...req.headers, host: targetUrl.host };
    for (const h of PROXY_HEADERS) delete headers[h];
    if (url.pathname === `${base}/auth/website`)
      Object.assign(headers, identityHeaders(picked(req), secret));

    const upstream = httpRequest(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        method: req.method,
        path: req.url,
        headers,
      },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      }
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('The race instance is not answering.');
    });
    req.pipe(upstream);
  });
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

// Run as a command (not when imported by a test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(arg('port', 4790));
  const target = arg('target', 'http://127.0.0.1:4791');
  const base = arg('base', '/games/race');
  const secretFile = arg('secret-file', process.env.RA_WEBSITE_PROXY_SECRET_FILE);
  const tokenFile = arg('token-file', process.env.RA_WEBSITE_SYNC_TOKEN_FILE);
  const site = process.argv.includes('--site');
  const host = arg('host', '127.0.0.1');
  if (site) {
    // The website itself: no secret (the proxy holds it), no race to forward to.
    const token = tokenFile ? readFileSync(tokenFile, 'utf8').trim() : null;
    await startStandin({ port, base, secret: null, token, host, site: true });
    console.log(`website stand-in (the website itself) on ${host}:${port}`);
  } else if (!secretFile) {
    console.error(
      'website-standin: --secret-file=<path> is required (the race reads the same file).'
    );
    process.exitCode = 1;
  } else {
    const secret = readFileSync(secretFile, 'utf8').trim();
    const token = tokenFile ? readFileSync(tokenFile, 'utf8').trim() : null;
    await startStandin({ port, target, base, secret, token });
    console.log(`website stand-in on http://127.0.0.1:${port}/ → ${target}${base}`);
  }
}
