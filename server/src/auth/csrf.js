// ============================================================
// File:        csrf.js
// Path:        server/src/auth/csrf.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: CORS options + Origin/Referer CSRF guard for the same-origin posture (§4a/§7.1)
// ============================================================

// ── Allowed client origins ────────────────────────────────────────────────────

// Comma-separated explicit client origins for the cross-origin/dev case
// (e.g. RA_CLIENT_ORIGIN=http://localhost:5173). Unset → same-origin only.
export function getAllowedClientOrigins() {
  return (process.env.RA_CLIENT_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── CORS options ──────────────────────────────────────────────────────────────

export function normalizeOrigin(o) {
  return String(o).trim().toLowerCase().replace(/\/+$/, '');
}

// Built once at module load. origin:false → CORS disabled → same-origin only, cross-origin browsers
// blocked. NEVER wildcard + credentials (browsers reject it per CORS spec).
export const corsOptions = (() => {
  const list = getAllowedClientOrigins();
  return { origin: list.length ? list : false, credentials: true };
})();

// ── Strict-mode resolver ──────────────────────────────────────────────────────

// RA_CSRF_STRICT overrides the environment-derived default so operators can
// enable strict mode on a non-NODE_ENV=production host (e.g. staging).
// 'auto'/unset → falls back to isProduction (same pattern as resolveCookieSecure).
export function resolveCsrfStrict(isProduction) {
  const v = process.env.RA_CSRF_STRICT;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return isProduction; // 'auto' and unset both fall through to the env default
}

// ── CSRF Origin/Referer guard ─────────────────────────────────────────────────

export function createCsrfOriginGuard({
  getAllowedOrigins = getAllowedClientOrigins,
  strict = resolveCsrfStrict(process.env.NODE_ENV === 'production'),
  selfOrigin = process.env.RA_PUBLIC_ORIGIN || null,
} = {}) {
  return function csrfOriginGuard(req, res, next) {
    const path = req.path;
    if (path !== '/api' && !path.startsWith('/api/')) return next(); // scope: /api only

    const method = String(req.method).toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return next(); // mutating only

    // Determine the claimed origin: Origin header, else Referer's origin component.
    let candidate = req.get('origin') || null;
    if (!candidate) {
      const ref = req.get('referer');
      if (ref) {
        try {
          candidate = new URL(ref).origin;
        } catch {
          candidate = null;
        }
      }
    }

    // No Origin/Referer: in strict mode, a browser MUST send Origin on cross-site mutations
    // (fetch/form). Absence here means either a same-origin navigation or a non-browser client.
    // Strict: reject to enforce the requirement; non-strict: allow (curl, server-to-server).
    if (!candidate) {
      if (strict) return res.status(403).json({ error: 'origin required' });
      return next();
    }

    // Opaque origin ('null') and malformed values are not acceptable candidates.
    // They arise from sandboxed iframes or data: URIs — always treated as invalid.
    if (candidate === 'null') {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    try {
      new URL(candidate);
    } catch {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }

    // Self is the canonical server origin: explicit RA_PUBLIC_ORIGIN when set (production),
    // otherwise derived from the incoming Host header (dev/local).
    const self = selfOrigin ?? `${req.protocol}://${req.get('host')}`;
    const allowed = new Set([normalizeOrigin(self), ...getAllowedOrigins().map(normalizeOrigin)]);

    if (!allowed.has(normalizeOrigin(candidate))) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    next();
  };
}

export const csrfOriginGuard = createCsrfOriginGuard();
