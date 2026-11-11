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
// Usage:
//   node scripts/website-standin.mjs --port=4790 --target=http://127.0.0.1:4791 \
//        --base=/games/race --secret-file=<path>
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
  member: { id: 'standin-member-1', name: 'Mia Member', roles: 'member', canHost: false },
  host: { id: 'standin-host-1', name: 'Hugo Host', roles: 'member', canHost: true },
  admin: { id: 'standin-admin-1', name: 'Ada Admin', roles: 'member,admin', canHost: true },
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

function page(base, current) {
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
<p><a href="${base}/">Open the race</a></p>`;
}

/**
 * Start the stand-in. Exported so a test can run it in-process.
 * @returns {Promise<import('node:http').Server>}
 */
export function startStandin({ port, target, base, secret, host = '127.0.0.1' }) {
  const targetUrl = new URL(target);
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://standin.invalid');
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(page(base, picked(req)));
    }
    const as = /^\/_standin\/as\/([a-z]+)$/.exec(url.pathname);
    if (as && as[1] in FAKE_MEMBERS) {
      res.writeHead(303, {
        'set-cookie': `standin_as=${as[1]}; Path=/; HttpOnly; SameSite=Lax`,
        location: `${base}/auth/website`,
      });
      return res.end();
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
  if (!secretFile) {
    console.error(
      'website-standin: --secret-file=<path> is required (the race reads the same file).'
    );
    process.exitCode = 1;
  } else {
    const secret = readFileSync(secretFile, 'utf8').trim();
    await startStandin({ port, target, base, secret });
    console.log(`website stand-in on http://127.0.0.1:${port}/ → ${target}${base}`);
  }
}
