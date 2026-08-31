// ============================================================
// File:        staticClient.js
// Path:        server/src/staticClient.js
// Project:     RaceArena — SERVE-SPA-1
// Description: The server serves the built client. One thing to start, one port.
//
//              WHY THIS EXISTS: until now the server answered `/api/*` and nothing else — `GET /`
//              was a 404 — while `docs/DEPLOYMENT.md` described a same-origin deployment in which
//              "the Node.js server serves both the built SPA and the /api/* endpoints". That
//              deployment was never built. This is it.
//
// ── THE TWO MOUNTS AND WHY THEY SIT WHERE THEY DO ────────────────────────────────────────────────
//
// Both are mounted BEFORE `requireAuth`, and that is not an oversight:
//
//   · A LOGIN PAGE MUST BE REACHABLE BY SOMEONE WHO IS NOT LOGGED IN. `requireAuth` is global and
//     deny-by-default. Static assets mounted after it would 401, so the browser could never load the
//     app that draws the sign-in form, and the install would be unusable from a cold start.
//   · A DEEP LINK MUST WORK WHEN LOGGED OUT TOO. `/setup` typed into the address bar has to return
//     the app shell so the client's own router can send the visitor to its login screen. Behind
//     `requireAuth` it would return 401 and the person would see nothing at all.
//
// Serving the SPA shell publicly grants nothing: it is the same bundle every visitor downloads
// anyway, and every byte of DATA behind it still passes `requireAuth`. What is public is the door,
// not what is through it.
//
// ── THE FALLBACK MUST NOT SWALLOW THE API, WHICH IS THE CLASSIC FAILURE HERE ─────────────────────
//
// A catch-all that answers every unmatched GET with `index.html` turns an unknown API path into a
// 200 and a page of HTML. A caller asking for `/api/tracsk` would get the app instead of an error,
// and every client-side fetch of a mistyped or removed endpoint would silently receive markup where
// it expected JSON — the failure mode being that nothing looks broken.
//
// So the fallback REFUSES anything under the API prefix, by explicit test, before it does anything
// else. Such a request continues down the stack exactly as it did before this file existed: through
// `requireAuth` (401 when unauthenticated) and on to the API's own JSON 404. `mountApiNotFound`
// below is the other half — it makes that last case answer as the API rather than as Express's
// default HTML page.
//
// ── WHEN THERE IS NO BUILD ───────────────────────────────────────────────────────────────────────
//
// A developer running the API alone must not be blocked by a missing client build, so an absent
// `index.html` is not an error: nothing is mounted, one plain line is logged saying so and where it
// looked, and the API serves exactly as it always has. The dev loop (Vite on 5173, preview on 4173)
// is untouched by this file — it adds a path, it takes none away.
// ============================================================

import express from 'express';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Everything under this prefix belongs to the API and is never answered with the app's HTML. */
export const API_PREFIX = '/api/';

/**
 * Where the built client lives. `RA_CLIENT_DIST` redirects it without touching any consumer —
 * the same contract `RA_DATA_DIR` has in dataPaths.js, and the reason the image can put the build
 * somewhere other than the repository layout.
 *
 * The default is resolved MODULE-RELATIVE, never from `process.cwd()`, so the answer does not
 * depend on which directory the server was started from.
 */
export function resolveClientDist(env = process.env) {
  if (env.RA_CLIENT_DIST) return resolve(env.RA_CLIENT_DIST);
  return resolve(__dirname, '../../client/dist');
}

export const CLIENT_DIST = resolveClientDist();

/** True when there is a build to serve. Checked once at mount time, never per request. */
export function clientBuildExists(dist = CLIENT_DIST) {
  return existsSync(join(dist, 'index.html'));
}

/**
 * Mount the static assets. Call BEFORE the auth guards — see the header.
 * @returns {boolean} whether anything was mounted
 */
export function mountClientAssets(app, dist = CLIENT_DIST, log = console.log) {
  if (!clientBuildExists(dist)) {
    // Plain, and it names the path, because "why is / a 404" is the question this line answers.
    log(
      `[client] no built client at ${dist} — serving the API only. ` +
        'Run `npm run build` in client/ (or set RA_CLIENT_DIST) to serve the app from this server.',
    );
    return false;
  }
  // `index: false`: the fallback below owns index.html, so there is ONE place that decides when the
  // app shell is served rather than two that can disagree.
  app.use(express.static(dist, { index: false }));
  log(`[client] serving the built client from ${dist}`);
  return true;
}

/**
 * Mount the SPA fallback. Call BEFORE the auth guards, AFTER the static mount.
 * @returns {boolean} whether anything was mounted
 */
export function mountSpaFallback(app, dist = CLIENT_DIST) {
  if (!clientBuildExists(dist)) return false;
  const indexFile = join(dist, 'index.html');
  app.use((req, res, next) => {
    // THE API IS NEVER ANSWERED WITH THE APP. This is the whole guard, and it is first.
    if (req.path === '/api' || req.path.startsWith(API_PREFIX)) return next();
    // Only navigations. A failed POST or a missing asset must not come back as a page of HTML.
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    // A request that wants JSON is asking a machine question; answering it with a page is the same
    // mistake as the API case, one level out.
    if (!req.accepts('html')) return next();
    // A MISSING ASSET MUST 404, NOT COME BACK AS THE APP. `express.static` above already served
    // every file that exists, so anything reaching here whose last segment carries an extension is
    // an asset that is NOT there — a stale `/assets/index-OLD.js` after a redeploy, most often.
    // Returning the shell for it gives the browser HTML where it expected JavaScript, and what the
    // person sees is a MIME-type console error instead of a plain 404. Found by probing this very
    // case rather than by reading the code.
    //
    // THE COST, stated because it is a real trade: a deep link whose LAST segment contains a dot
    // (`/track/my.track`) is treated as an asset and 404s instead of loading the app. No route in
    // this client has that shape; if one ever does, this is the line that decides it.
    if (/\.[^/]+$/.test(req.path)) return next();
    res.sendFile(indexFile);
  });
  return true;
}

/**
 * Mount the API's own 404. Call AFTER every API router, so a real route always wins.
 *
 * Without it an unknown path under `/api/` reaches Express's default handler and comes back as an
 * HTML error page — which is not the app's HTML, but is still not an API answer. This makes the
 * shape of a wrong path the same as the shape of every other API error.
 */
export function mountApiNotFound(app) {
  app.use(API_PREFIX.replace(/\/$/, ''), (req, res) => {
    res.status(404).json({ error: `no such API route: ${req.method} ${req.originalUrl}` });
  });
}
