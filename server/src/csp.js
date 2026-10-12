// ============================================================
// File:        csp.js
// Path:        server/src/csp.js
// Project:     RaceArena — AUDIT-1 D1 (2026-10-09)
// Description: THE ONE HOME for the Content-Security-Policy this server sends with every answer.
//
// ── AS TIGHT AS THE APP ALLOWS, AND EVERY LOOSENING NAMES WHAT NEEDS IT ─────────────────────────
// Each directive below was derived from what the built client actually loads (AUDIT-1 report,
// D1), not copied from a template:
//
//   script-src   'self' and ONE hash. The only inline script is the runtime-config line this server
//                injects into index.html (runtimeConfig.js). Its text is fixed for the life of the
//                process — it depends only on RA_PUBLIC_ORIGIN, read once — so a HASH covers it
//                exactly; a per-request nonce would buy nothing and cost a re-render per request.
//                No 'unsafe-inline', no 'unsafe-eval': the bundle uses neither.
//   style-src    'self' only. React's `style={{…}}` sets styles through the CSSOM
//                (`element.style.x = …`), which CSP does not govern; nothing in the client or the
//                built shell creates a <style> element or a markup style attribute. MEASURED, not
//                assumed: with style-src 'self' the browser spec (csp-no-violations) saw zero
//                violations across every main screen and a race.
//   img-src      'self' data: blob:. Sprites are turned into blob: URLs (spriteLoader.js), stored
//                sprites may be data: URLs, and logo and sprite previews use blob: before upload.
//   connect-src  'self' plus the configured public origin, in case a page is reached at another
//                address of the same install.
//   font-src     'self' — the fonts are self-hosted (client/src/styles/fonts.css).
//   object-src 'none', base-uri 'self', form-action 'self', frame-ancestors 'none' — nothing in the
//                app needs more, and frame-ancestors replaces the old X-Frame-Options.
//
// ★ SCOPE: only pages THIS server serves (the production image, `npm start`). The dev server on
// 5173 and the 4173 preview are served by Vite and scripts/serve-production.mjs, which send no CSP.
// ============================================================

import { resolvePublicOrigin, runtimeConfigScriptHash } from './runtimeConfig.js';

/**
 * The directives, for helmet's `contentSecurityPolicy.directives`.
 * @param {object} [env]
 */
export function cspDirectives(env = process.env) {
  const origin = resolvePublicOrigin(env);
  return {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", runtimeConfigScriptHash(origin)],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: origin ? ["'self'", origin] : ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    // NOT upgrade-insecure-requests (helmet's default set has it; app.js passes useDefaults: false):
    // it would break a plain-HTTP install on a LAN, the owner's own 4000 included. HTTPS is the
    // proxy's to enforce, with HSTS.
  };
}
