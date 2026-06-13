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
    .split(',').map((s) => s.trim()).filter(Boolean);
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

// ── CSRF Origin/Referer guard ─────────────────────────────────────────────────

export function createCsrfOriginGuard({ getAllowedOrigins = getAllowedClientOrigins } = {}) {
  return function csrfOriginGuard(req, res, next) {
    const path = req.path;
    if (path !== '/api' && !path.startsWith('/api/')) return next();  // scope: /api only

    const method = String(req.method).toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return next();  // mutating only

    // Determine the claimed origin: Origin header, else Referer's origin component.
    let candidate = req.get('origin') || null;
    if (!candidate) {
      const ref = req.get('referer');
      if (ref) {
        try { candidate = new URL(ref).origin; } catch { candidate = null; }
      }
    }

    // No Origin/Referer → non-browser client (curl, server-to-server). A browser CSRF attack
    // cannot suppress the Origin header, so absence is not a CSRF vector → allow.
    if (!candidate) return next();

    const self = `${req.protocol}://${req.get('host')}`;
    const allowed = new Set([
      normalizeOrigin(self),
      ...getAllowedOrigins().map(normalizeOrigin),
    ]);

    if (!allowed.has(normalizeOrigin(candidate))) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    next();
  };
}

export const csrfOriginGuard = createCsrfOriginGuard();
