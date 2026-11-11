// ============================================================
// File:        runtimeConfig.js
// Path:        server/src/runtimeConfig.js
// Project:     RaceArena — RUNTIME-API-URL-1
// Created:     2026-09-07
// Description: THE ONE HOME for the installed instance's public address: how it is read, what
//              counts as valid, and how it reaches the browser.
//
//              ★ WHAT IT OWNS: reading `RA_PUBLIC_ORIGIN`, judging it, and rendering the one
//              `<script>` that hands it to the client bundle.
//              ★ WHAT IT DELIBERATELY DOES NOT DO: decide CORS, decide CSRF, start anything, or
//              touch the filesystem. `csrf.js` reads the SAME value for the allow-list and for the
//              self-origin; this file is where the value and its rules live, not a second copy of
//              either policy.
//
// ── WHY `RA_PUBLIC_ORIGIN` AND NOT A NEW VARIABLE ───────────────────────────────────────────────
//
// It already exists and already means exactly this: "canonical self-origin", documented in
// DEPLOYMENT.md and read by the CSRF guard (`csrf.js` → `corsOptions`). Adding a second variable for the same
// fact would create precisely the drift the brief forbids — two addresses that have to be kept in
// step, and a dead backend the day they are not. So ONE value now feeds three consumers:
//
//   · the CSRF guard's self-origin        (existing, unchanged)
//   · the CORS allow-list                 (added — `getAllowedClientOrigins`, derived not duplicated)
//   · the client bundle's API base        (added — injected into the served index.html)
//
// ── WHY INJECTION INTO index.html, AND NOT A FETCH ──────────────────────────────────────────────
//
// The alternatives were weighed rather than assumed:
//
//   · A `/api/runtime-config` FETCH is circular — the client would need the API's address in order
//     to ask where the API is. It only works same-origin, which is the case that needs it least.
//   · A separate `/runtime-config.js` FILE needs a `<script src>` in `index.html`, which then 404s
//     under `vite dev` and in the 4173 preview, where no server of ours is serving the page.
//   · INJECTION costs no extra request, works for deep links (the SPA fallback serves the same
//     shell for every route), and — the deciding property — is INVISIBLE when nothing is
//     configured. `mountSpaFallback` sends the file untouched in that case, so the dev server and
//     the preview behave exactly as they did.
//
// The script goes in `<head>`, before the module bundle at the end of `<body>`, because
// `API_BASE_URL` in `client/src/services/api.js` is a module-level constant evaluated at import.
//
// ── WEBSITE-EMBED-1 piece 2: THE BASE PATH LIVES HERE TOO ───────────────────────────────────────
//
// `RA_BASE_PATH` (e.g. `/games/race`) is the second half of "where this install is reached", so it
// has the same home as the origin: judged here, refused at start when wrong (index.js), and handed to
// the bundle in the SAME marker. Unset — the standalone install and every existing flow — the marker,
// the page and the CSP hash are byte-for-byte what they were: the `basePath` key is written only
// when a base path is set, and `apiBaseUrl` is then `<origin or ''><base path>`, which is why
// client/src/services/api.js needed no change (`${API_BASE_URL}/api/…` → `<base>/api/…`).
// ============================================================

import { createHash } from 'node:crypto';

/** The global the client reads. Must equal `RUNTIME_CONFIG_GLOBAL` in client/src/modules/runtimeMarker.js. */
export const RUNTIME_CONFIG_GLOBAL = '__RA_RUNTIME_CONFIG__';

/**
 * Is this a usable public address?
 *
 * ★ DELIBERATELY NARROW, because the failure this rejects is silent. An address that parses but is
 * not an origin — a path, a query, credentials — produces request URLs that are wrong in ways the
 * browser reports as a network error, which reads to the operator as "the server is down". So the
 * rule is: an absolute http(s) URL, with a host, and nothing after the origin.
 *
 * A trailing slash is accepted and normalised away; anything else after the origin is refused.
 *
 * @param {unknown} raw
 * @returns {{ok: true, origin: string} | {ok: false, reason: string}}
 */
export function judgePublicOrigin(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, reason: 'it is empty' };
  }
  const text = raw.trim();
  let url;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: `${JSON.stringify(text)} is not a URL` };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      reason: `the scheme must be http or https, not ${JSON.stringify(url.protocol.replace(':', ''))}`,
    };
  }
  if (!url.hostname) return { ok: false, reason: `${JSON.stringify(text)} has no host` };
  if (url.username || url.password) {
    return { ok: false, reason: 'it carries credentials, which never belong in a public address' };
  }
  if (url.search || url.hash) {
    return { ok: false, reason: 'it carries a query or a fragment; give the origin only' };
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    return {
      ok: false,
      reason: `it carries a path (${JSON.stringify(url.pathname)}); give the origin only, e.g. ${url.origin}`,
    };
  }
  return { ok: true, origin: url.origin };
}

/**
 * The configured public origin, or `null` when this instance is not configured.
 *
 * `null` is a legitimate answer, not a fault: an unconfigured instance is the owner's dev machine
 * and the client falls back to `http://localhost:4000` exactly as it always did. What is NOT
 * legitimate is a value that is present and wrong — see `assertPublicOriginUsable`.
 *
 * @param {object} [env]
 * @returns {string|null}
 */
export function resolvePublicOrigin(env = process.env) {
  const raw = env.RA_PUBLIC_ORIGIN;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const verdict = judgePublicOrigin(raw);
  return verdict.ok ? verdict.origin : null;
}

/**
 * The start-up gate. Returns the origin, or throws with a message naming what is wrong.
 *
 * ★ THE ASYMMETRY IS THE POINT. Absent → `null`, and the process starts: that is the dev machine.
 * Present but malformed → THROW, and the caller stops the process: that is a DEPLOYED instance
 * whose operator answered the question wrongly, and letting it fall back to `http://localhost:4000`
 * would serve every visitor a bundle pointing at their own laptop. A silent fallback in something
 * that was deployed is the failure this whole piece exists to remove.
 *
 * @param {object} [env]
 * @returns {string|null}
 */
export function assertPublicOriginUsable(env = process.env) {
  const raw = env.RA_PUBLIC_ORIGIN;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const verdict = judgePublicOrigin(raw);
  if (!verdict.ok) {
    throw new Error(
      `RA_PUBLIC_ORIGIN is set but unusable: ${verdict.reason}. ` +
        'It must be the full public address this install is reached at, origin only — ' +
        'for example https://races.example.com or http://198.51.100.7:4000. ' +
        'Run `npm run configure` to set it, or unset it entirely to run against http://localhost:4000.'
    );
  }
  return verdict.origin;
}

/**
 * Is this a usable base path? (WEBSITE-EMBED-1 piece 2.)
 *
 * Empty is the root — today's install — and is answered as `''`. Anything else (a lone "/" too) must
 * start with "/", must not end with one, and is made of URL-safe path characters only, with no
 * empty, "." or ".." segment. Narrow on purpose, like `judgePublicOrigin`: the value is written
 * verbatim into the page's `<base href>` and the cookie's Path, so anything a browser would
 * normalise, decode or escape is refused rather than repaired.
 *
 * @param {unknown} raw
 * @returns {{ok: true, basePath: string} | {ok: false, reason: string}}
 */
export function judgeBasePath(raw) {
  if (raw === undefined || raw === null) return { ok: true, basePath: '' };
  const text = String(raw).trim();
  if (text === '') return { ok: true, basePath: '' };
  if (!text.startsWith('/')) return { ok: false, reason: 'it must start with "/"' };
  if (text.endsWith('/')) return { ok: false, reason: 'it must not end with "/"' };
  if (!/^[A-Za-z0-9/_~.-]+$/.test(text)) {
    return {
      ok: false,
      reason: 'it may hold only letters, digits and / _ ~ . -',
    };
  }
  const segments = text.slice(1).split('/');
  if (segments.some((s) => s === '' || s === '.' || s === '..')) {
    return {
      ok: false,
      reason: 'it must not hold an empty, "." or ".." segment',
    };
  }
  return { ok: true, basePath: text };
}

/**
 * The configured base path, `''` when unset. THROWS on a value that is present and wrong — unlike
 * `resolvePublicOrigin` there is no safe fallback: answering at "/" when "/games/race" was asked
 * for would put the app where the proxy does not send anyone. index.js turns the throw into a
 * refusal to start before anything listens.
 *
 * @param {object} [env]
 * @returns {string}
 */
export function resolveBasePath(env = process.env) {
  const verdict = judgeBasePath(env.RA_BASE_PATH);
  if (!verdict.ok) {
    throw new Error(
      `RA_BASE_PATH is set but unusable: ${verdict.reason}. ` +
        'It is the path this install is reached under, e.g. /games/race, or unset for "/".'
    );
  }
  return verdict.basePath;
}

/**
 * The one `<script>` that hands the address to the bundle.
 *
 * `JSON.stringify` on the whole payload is what keeps this safe: the origin has already been
 * through `new URL()`, and stringifying the object rather than concatenating strings means a `<`
 * could not open a tag even if one survived. The `</` escape covers the one sequence that could
 * close this script element from inside a JSON string.
 *
 * @param {string|null} origin
 * @param {string} [basePath]  `''` (the root) unless RA_BASE_PATH is set
 * @param {string} [mode]      'standalone' unless RA_MODE=website (WEBSITE-EMBED-1 piece 3a)
 * @returns {string}
 */
export function runtimeConfigScript(origin, basePath = '', mode = 'standalone') {
  // ★★ THE MARKER IS WRITTEN EVEN WITH NO ORIGIN (the owner's decision, 2026-09-23: same-origin by
  // default for real deployments). `apiBaseUrl: ''` is not "unconfigured" — it is a POSITIVE
  // statement that this page was served by the RaceArena server and the API is on the page's own
  // origin. The client can only tell "our server, nothing configured" from "somebody else's static
  // server" if our server says so, and this is it saying so.
  // WEBSITE-EMBED-1: with a base path the API is under it, and the client's router needs it; with
  // none the payload is exactly the old one, so the standalone page and its CSP hash do not move.
  const config = { apiBaseUrl: `${origin ?? ''}${basePath}` };
  if (basePath) config.basePath = basePath;
  // Piece 3a: the sign-in screen offers the website's sign-in instead of a password form. Written
  // only in website mode, for the same reason as `basePath`: standalone's payload does not move.
  if (mode === 'website') config.mode = 'website';
  const payload = JSON.stringify(config).replace(/</g, '\\u003c');
  return `<script>window.${RUNTIME_CONFIG_GLOBAL}=${payload};</script>`;
}

/**
 * The CSP source expression that admits exactly the script `runtimeConfigScript(origin, basePath)`
 * renders: `'sha256-…'` over the text BETWEEN the tags, which is what a browser hashes. Lives beside
 * the script so the two cannot drift: change the script and the hash follows (AUDIT-1 D1, csp.js).
 *
 * @param {string|null} origin
 * @param {string} [basePath]
 * @param {string} [mode]
 * @returns {string}
 */
export function runtimeConfigScriptHash(origin, basePath = '', mode = 'standalone') {
  const body = runtimeConfigScript(origin, basePath, mode)
    .replace(/^<script>/, '')
    .replace(/<\/script>$/, '');
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
}

/** The shell's `<base href="/">` (client/index.html), as written by the build. */
const BASE_HREF_ROOT = /<base\s+href="\/"\s*\/?>/i;

/**
 * `html` with the runtime config inserted, and — when a base path is set — its `<base href="/">`
 * rewritten to `<base href="<base path>/">`, so every relative URL the build wrote (`./assets/…`,
 * the favicons, the fonts through the CSS) resolves under the base path.
 *
 * Inserted immediately after `<head>` so it runs before the module bundle. If there is no `<head>`
 * — which would mean someone replaced the shell — the script is prepended rather than dropped,
 * because an address that fails to arrive is the silent failure this piece removes.
 *
 * @param {string} html
 * @param {string|null} origin
 * @param {string} [basePath]
 * @param {string} [mode]
 * @returns {string}
 */
export function injectRuntimeConfig(html, origin, basePath = '', mode = 'standalone') {
  // ★ `origin` may be null — that is the SAME-ORIGIN case and it is injected, not skipped. This used
  // to `return html` unchanged, which is what left a standalone image's page indistinguishable from
  // a page served by any other static server.
  const script = runtimeConfigScript(origin ?? null, basePath, mode);
  // `basePath` has passed `judgeBasePath`: URL-safe characters only, so it needs no escaping here.
  const page = basePath ? html.replace(BASE_HREF_ROOT, `<base href="${basePath}/" />`) : html;
  const headOpen = /<head(\s[^>]*)?>/i;
  if (headOpen.test(page)) return page.replace(headOpen, (m) => `${m}${script}`);
  return script + page;
}
