// ============================================================
// File:        startupReadiness.js
// Path:        server/src/startupReadiness.js
// Project:     RaceArena — PUBLISH-STEPS-1
//
// WHAT THIS IS FOR: telling the operator, at startup, that this install cannot do something they are
// about to try — while the terminal they started it in is still in front of them.
//
// THE FAILURE IT ENDS. `docker compose up` succeeds. The server starts and says so. Then the browser
// is refused by CORS, and if the operator gets past that, creating the first admin returns 403.
// Three separate failures, all from ONE missing file — `docker-compose.override.yml`, which is
// gitignored, so a stranger's clone has only the `.example`. Nothing said a word at startup, because
// nothing was wrong with the server: it was correctly configured to do less.
//
// ── IT WARNS, IT DOES NOT REFUSE, AND THAT IS THE WHOLE DESIGN ──────────────────────────────────
//
// The obvious move is to fail loudly when `RA_CLIENT_ORIGIN` is unset. **That would be wrong**, and
// this is the reasoning rather than a preference:
//
//   SERVE-SPA-1 made the server serve the built client itself. A SAME-ORIGIN INSTALL IS THE NORMAL
//   ONE NOW — the app and the API answer on the same port — and it needs no CORS at all. Refusing to
//   start without `RA_CLIENT_ORIGIN` would break the deployment this project has been moving TOWARDS
//   in order to fix the one it is moving away from.
//
// So the CORS line is not printed when this server is serving a client build. It is printed when
// there is no build to serve, because then the only way anyone reaches the app is from another
// origin, and that is exactly the case that is broken.
//
// ── WHAT IT MAY NOT DO ──────────────────────────────────────────────────────────────────────────
//
// It reads no files, starts nothing, and changes NO behaviour. It is a pure function of facts the
// caller has already established, so it can be tested without an environment and cannot itself
// become the reason a server does not start. Every line it emits names the CONSEQUENCE first and the
// FIX second, because an operator reading a warning wants to know whether it matters before they
// want to know what to type.
// ============================================================

import { resolveCookieSecure } from './auth/cookiePolicy.js';

/**
 * The startup readiness lines, in order. Empty when there is nothing worth saying.
 *
 * @param {object}  facts
 * @param {object}  facts.env            the environment to judge (`process.env` in production).
 * @param {boolean} facts.servingClient  is this server serving a built client of its own?
 *                                       When true, a browser reaches the app on THIS origin and the
 *                                       CORS line is not applicable.
 * @returns {string[]} lines to print, each already prefixed.
 */
export function startupReadinessLines({ env = {}, servingClient = false } = {}) {
  const lines = [];
  const missing = (k) => !env[k] || String(env[k]).trim() === '';
  const production = env.NODE_ENV === 'production';

  // 1. THE FIRST ADMIN. Without the token, `POST /api/auth/setup` returns 403 and the log line that
  //    explains it is buried at request time — long after the operator has stopped watching.
  if (missing('RA_BOOTSTRAP_TOKEN')) {
    lines.push(
      'READINESS: RA_BOOTSTRAP_TOKEN is not set — if this install has no admin account yet, ' +
        'it cannot create one (setup returns 403). Set it, then POST /api/auth/setup. ' +
        'Existing installs are unaffected.'
    );
  }

  // 2. SESSIONS. In production the server already throws; there is nothing to warn about and saying
  //    it twice would teach the operator that these lines are noise.
  if (!production && missing('RA_SESSION_SECRET')) {
    lines.push(
      'READINESS: RA_SESSION_SECRET is not set — a random one is in use, so EVERY RESTART SIGNS ' +
        'EVERYONE OUT. Fine for development; set it for anything you come back to.'
    );
  }

  // 3. CORS — only when there is no client of our own to reach. See the header: with a build
  //    present, same-origin is the intended arrangement and this line would be misleading.
  if (!servingClient && missing('RA_CLIENT_ORIGIN')) {
    lines.push(
      'READINESS: RA_CLIENT_ORIGIN is not set and this server is serving no client build — a ' +
        'browser on any other origin will be REFUSED BY CORS with no error the operator can see. ' +
        'Either build the client (npm run build in client/) so this server serves it, or set ' +
        'RA_CLIENT_ORIGIN to the origin the client is served from.'
    );
  }

  // 4. THE TRANSPORT (B9, DELIVERY-CLEAN-3 piece 1). The one nobody was told about: the whole
  //    cookie-Secure posture hangs on NODE_ENV === 'production', and NODE_ENV is set in NO shipped
  //    file — not docker-compose.yml, not server/Dockerfile, not the .override example. So the
  //    DEFAULT deployment resolves `secure: false`, sign-in WORKS over plain HTTP, and the password
  //    and the session cookie travel in clear. Nothing breaks, which is exactly why nobody notices.
  //
  //    ★ ONLY when the answer is literally `false`. `resolveCookieSecure` can also return 'auto',
  //    which hands the decision to express-session's trust-proxy logic per request — that install
  //    may well be behind a TLS terminator, and warning it would be the noise this file's header
  //    warns against ("a line an operator learns to ignore").
  //
  //    ★ It warns and does not refuse, like every line above: an install on a private LAN over
  //    plain HTTP is a legitimate thing to run, and this is not the place to decide it is not.
  if (resolveCookieSecure(production, env) === false) {
    lines.push(
      'READINESS: the session cookie is NOT marked Secure, so SIGN-IN TRAVELS UNENCRYPTED — the ' +
        'password and the session cookie are readable by anything on the network path. This is ' +
        'the default when NODE_ENV is not "production", which no shipped file sets. Fine on a ' +
        'machine only you can reach; NOT fine on a public address. Put HTTPS in front (a reverse ' +
        'proxy terminates it — see docs/DEPLOY-NOTES.md §4) and set RA_COOKIE_SECURE=true, or ' +
        'RA_COOKIE_SECURE=auto if the proxy sets X-Forwarded-Proto.'
    );
  }

  // THE ONE POINTER. Three lines all have the same cause in a container, and naming the file once is
  // worth more than naming it three times.
  if (lines.length > 0) {
    lines.push(
      '           (In Docker these come from docker-compose.override.yml, which is gitignored — ' +
        'copy docker-compose.override.yml.example to create it.)'
    );
  }
  return lines;
}

/** Prints what `startupReadinessLines` returns. Separated so the decision is testable without I/O. */
export function reportStartupReadiness(facts, log = console.warn) {
  for (const line of startupReadinessLines(facts)) log(line);
}
