// ============================================================
// File:        route-fakes.mjs
// Path:        deploy/test/route-fakes.mjs
// Project:     RaceArena — WEBSITE-EMBED-1 piece 5a (2026-11-11)
// Description: The two stand-ins the route test (deploy/test/route-test.sh) puts behind a REAL proxy,
//              in one file, chosen by the first argument:
//
//   node route-fakes.mjs site   a fake website on :3800. GET /api/games/race/authorize answers by the
//                               website cookie's value (__Host-se.sid or se.sid): member, host and
//                               guest → 200 with the identity headers; anything else → 401. It
//                               records the headers of the last authorize request (GET /__last).
//   node route-fakes.mjs race   a fake race on :4000 that records every request it receives — path
//                               and headers — and answers it with that record. GET /__log (on its
//                               own published port, never through the proxy) returns them all.
//
// Test-only. It holds no secret; the proxy secret it is shown is the test's own, generated per run.
// ============================================================

import http from 'node:http';

const role = process.argv[2];

function cookieValue(cookie, name) {
  for (const part of String(cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

const IDENTITIES = {
  member: { 'X-Acting-User-Id': 'w-mia', 'X-Acting-User': 'Mia Member', 'X-Acting-User-Roles': 'member', 'X-Acting-User-Can-Host': 'false', 'X-Acting-User-Email-Verified': 'true', 'X-Acting-User-Steps': '2' },
  host: { 'X-Acting-User-Id': 'w-hugo', 'X-Acting-User': 'Hugo Host', 'X-Acting-User-Roles': 'member', 'X-Acting-User-Can-Host': 'true', 'X-Acting-User-Email-Verified': 'true', 'X-Acting-User-Steps': '2' },
  guest: { 'X-Acting-Guest': 'true' },
};

if (role === 'site') {
  let last = null;
  http
    .createServer((req, res) => {
      if (req.url === '/__last') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(last));
      }
      if (req.url.startsWith('/api/games/race/authorize')) {
        last = { url: req.url, headers: req.headers };
        const who = cookieValue(req.headers.cookie, '__Host-se.sid') ?? cookieValue(req.headers.cookie, 'se.sid');
        const identity = IDENTITIES[who];
        if (!identity) {
          res.statusCode = 401;
          return res.end('not signed in');
        }
        for (const [k, v] of Object.entries(identity)) res.setHeader(k, v);
        return res.end('ok');
      }
      res.end('website');
    })
    .listen(3800);
} else if (role === 'race') {
  const log = [];
  http
    .createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/__log') return res.end(JSON.stringify(log));
      const entry = { path: req.url, headers: req.headers };
      log.push(entry);
      res.end(JSON.stringify(entry));
    })
    .listen(4000);
} else {
  console.error('usage: node route-fakes.mjs site|race');
  process.exitCode = 2;
}
