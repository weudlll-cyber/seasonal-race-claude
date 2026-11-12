// ============================================================
// File:        runtimeMarker.js
// Path:        client/src/modules/runtimeMarker.js
// Project:     RaceArena — WEBSITE-EMBED-1 pieces 2 and 3a
// Created:     2026-11-11
// Description: THE ONE CLIENT HOME of the runtime marker the RaceArena server injects into the page
//              (server/src/runtimeConfig.js): its global's name, the base path the app is served
//              under, and the site mode. api.js reads the API address from the same marker and
//              imports the name from here.
//
// ── WHY IT LIVES IN modules/, NOT services/ ────────────────────────────────────────────────────
// The sprite loader (racer-types/spriteLoader.js) uses `appUrl`, and the Docker image carries the
// race engine — `client/src/modules/` and `client/src/racer-types/` whole, nothing else of
// client/src (server/Dockerfile, "THE RACE ENGINE") — to replay stored races. A helper in services/
// was not in the image and the replay could not import it (racesVerify.test.js caught it). Here it
// rides with the engine, and it imports nothing.
//
// ── WHAT IT ANSWERS ────────────────────────────────────────────────────────────────────────────
//   · BASE_PATH — "" at "/" (standalone, the 5173 dev server, the 4173 preview, every harness),
//     e.g. "/games/race" when the server runs with RA_BASE_PATH. The router's basename (App.jsx).
//   · appUrl(path) — a ROOT-ABSOLUTE app path made to work under the base path, for the few places
//     that hand one to the browser themselves: the sprite loader (every built-in sprite is
//     "/assets/…", and stored records may carry the same form) and the join link
//     (RegistrationPanel.jsx). Everything Vite writes into the build is relative (`base: './'`) and
//     needs nothing; the API's address carries the base path already (api.js).
//   · SITE_MODE — 'standalone' unless the server says 'website' (RA_MODE, piece 3a).
// ============================================================

/** The global the server writes. Must equal `RUNTIME_CONFIG_GLOBAL` in server/src/runtimeConfig.js. */
export const RUNTIME_CONFIG_GLOBAL = '__RA_RUNTIME_CONFIG__';

const marker = () =>
  typeof globalThis === 'undefined' ? undefined : globalThis[RUNTIME_CONFIG_GLOBAL];

/**
 * The base path from the marker, or "" when there is none. Tolerant like api.js: the marker is
 * written by another process, so anything that is not a clean "/…" path without a trailing slash
 * means "no base path" rather than an error.
 */
function runtimeBasePath() {
  const value = marker()?.basePath;
  if (typeof value !== 'string') return '';
  return /^\/[^/]/.test(value) && !value.endsWith('/') ? value : '';
}

/** "" at the root (today's install); "/games/race" under a base path. */
export const BASE_PATH = runtimeBasePath();

/** 'website' only when the server's marker says so; every other page is 'standalone'. */
export const SITE_MODE = marker()?.mode === 'website' ? 'website' : 'standalone';

/**
 * A root-absolute app path made to work under the base path: "/assets/x.png" →
 * "/games/race/assets/x.png". Anything else — a full URL, a data: or blob: URL, a relative path, a
 * protocol-relative "//host" — is returned unchanged. At the root this is the identity, so the
 * standalone app's URLs are byte-for-byte what they were.
 *
 * ★ A PATH ALREADY UNDER THE BASE IS LEFT ALONE. A server sprite URL is built from API_BASE_URL,
 * which already carries the base path ("/games/race/api/racers/…"); prefixing it again would ask
 * for "/games/race/games/race/…". The app has no route of its own named like the base path, so a
 * path that starts with it can only be one that has been made absolute already.
 *
 * @param {string} path
 * @returns {string}
 */
export function appUrl(path) {
  if (!BASE_PATH || typeof path !== 'string') return path;
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}
