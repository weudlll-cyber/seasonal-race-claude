// ============================================================
// File:        trustProxy.js
// Path:        server/src/trustProxy.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A5M-07)
// Created:     2026-10-12
// Description: THE ONE HOME for how many reverse-proxy hops the server trusts: `RA_TRUST_PROXY`,
//              how it is judged, how it is applied to the Express app, and the one startup line
//              that recommends setting it.
//
// ── WHY IT EXISTS ──────────────────────────────────────────────────────────────────────────────
// Express's `trust proxy` decides whose address `req.ip` is. The sign-in rate limiter keys on
// `req.ip` (`auth/rateLimit.js`), so trusting a hop that is not there lets a client that reaches the
// port directly choose its own `X-Forwarded-For` — a fresh rate-limit key per attempt. Until this
// file, the trust was ONE hop whenever `NODE_ENV=production` and none otherwise, which is right
// behind exactly one proxy and wrong on a production-mode install whose port is reachable directly.
//
// ── ★ UNSET IS TODAY'S BEHAVIOUR, EXACTLY ──────────────────────────────────────────────────────
// Unset (or blank) → one hop when `NODE_ENV=production`, none otherwise — byte for byte the line
// `app.js` carried before. The only addition is one startup line (`trustProxyNotice`) recommending
// the explicit setting. Set → that number of hops; `0` trusts none (Express's own default, which is
// left untouched rather than set to 0).
//
// ── PRESENT AND WRONG REFUSES TO START ─────────────────────────────────────────────────────────
// The same rule as `RA_BIND_ADDRESS` (`bindAddress.js`) and `RA_PUBLIC_ORIGIN` (`runtimeConfig.js`):
// absent is a legitimate state; a value that is not a whole number is an operator's answer that
// cannot be one, and guessing a hop count from it would decide whose address the limiter believes.
// ============================================================

/**
 * The number of proxy hops to trust. Throws when the variable is set to something that is not a
 * whole number of hops.
 *
 * @param {object} [env]
 * @returns {number} 0 = trust no proxy
 */
export function resolveTrustProxy(env = process.env) {
  const raw = env.RA_TRUST_PROXY;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return env.NODE_ENV === 'production' ? 1 : 0;
  }
  const value = String(raw).trim();
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error(
      `RA_TRUST_PROXY is set but is not a whole number of proxy hops: "${value}". ` +
        'Use 1 behind one reverse proxy (Caddy, nginx), 0 when clients reach this port directly, ' +
        'or unset it to keep the old rule (one hop when NODE_ENV=production).'
    );
  }
  return Number(value);
}

/**
 * Applies the setting to an Express app. With 0 hops nothing is set, so Express keeps its own
 * default (trust nothing) — the same app the old `NODE_ENV` line produced outside production.
 *
 * @param {{ set: Function }} app
 * @param {object} [env]
 */
export function applyTrustProxy(app, env = process.env) {
  const hops = resolveTrustProxy(env);
  if (hops > 0) app.set('trust proxy', hops);
}

/**
 * The one startup line recommending the explicit setting, or `null` when it is set.
 *
 * @param {object} [env]
 * @returns {string|null}
 */
export function trustProxyNotice(env = process.env) {
  const raw = env.RA_TRUST_PROXY;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') return null;
  const now =
    env.NODE_ENV === 'production'
      ? 'trusting ONE proxy hop because NODE_ENV=production, so if this port is reachable ' +
        'directly a client can pick its own X-Forwarded-For and with it its sign-in rate-limit key'
      : 'trusting NO proxy because NODE_ENV is not production, so behind a reverse proxy every ' +
        'visitor shares the proxy’s address for the sign-in rate limit';
  return (
    `READINESS: RA_TRUST_PROXY is not set — ${now}. Set it to the number of reverse proxies in ` +
    'front of this server (1 behind Caddy or nginx), or 0 when clients reach this port directly.'
  );
}
