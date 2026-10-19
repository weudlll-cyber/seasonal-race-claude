// ============================================================
// File:        bindAddress.js
// Path:        server/src/bindAddress.js
// Project:     RaceArena — RELEASE-BASICS-1 (c)
// Created:     2026-10-01
// Description: THE ONE HOME for which network address the API listens on: `RA_BIND_ADDRESS`, how
//              it is judged, and the one `listen` call that uses it.
//
// ── ★ THE DEFAULT IS TODAY'S BEHAVIOUR, EXACTLY ────────────────────────────────────────────────
// Unset (or blank) → `listen(port, cb)` with NO host argument, byte for byte the call `index.js`
// made before this file existed. Node then listens on every interface (`::`, dual-stack, or
// `0.0.0.0` where IPv6 is absent). Nothing about an install that does not set the variable moves.
//
// ── WHY AN IP LITERAL ONLY ─────────────────────────────────────────────────────────────────────
// The setting exists for one case: a reverse proxy on the same machine, where the API should
// answer on `127.0.0.1` and nowhere else. A HOSTNAME would be resolved by `listen` at start, may
// resolve to several addresses of which Node binds one, and can change under a running install —
// so "which interface is this listening on?" would stop having a fixed answer. An IP literal does.
//
// ── PRESENT AND WRONG REFUSES TO START ─────────────────────────────────────────────────────────
// The same asymmetry `runtimeConfig.js` applies to `RA_PUBLIC_ORIGIN`, reused as a RULE rather
// than as code (that file deliberately owns the public address and nothing else): absent is a
// legitimate state and starts; present-but-unusable is an operator's answer that cannot be one,
// and starting anyway would listen somewhere they did not ask for.
// ============================================================

import { isIP } from 'node:net';

/**
 * The bind address this install asked for, or `null` for today's all-interfaces default.
 * Throws when the variable is set to something that is not an IP address.
 *
 * @param {object} [env]
 * @returns {string|null}
 */
export function resolveBindAddress(env = process.env) {
  const raw = env.RA_BIND_ADDRESS;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const value = String(raw).trim();
  if (isIP(value) === 0) {
    throw new Error(
      `RA_BIND_ADDRESS is set but is not an IP address: "${value}". ` +
        'Use 127.0.0.1 to answer only on this machine (behind a reverse proxy), ' +
        'or unset it to listen on every interface as before.'
    );
  }
  return value;
}

/**
 * The one `listen` call. With no address it passes NO host argument at all — not `undefined`,
 * not `'0.0.0.0'` — so the default is the exact call that existed before.
 *
 * ★ A FAILED LISTEN REACHES `onError`, NEVER `onListening` (A7-03 piece 4, 2026-10-19). Express 5's
 * `app.listen` registers its callback as the server's `error` listener too and calls it WITH the
 * error (its migration guide, "app.listen"), where Express 4 let `EADDRINUSE` crash the process.
 * Passed straight through, a taken port would have printed "server running" and kept the process
 * alive serving nothing. This splits the one callback into the two outcomes.
 *
 * @param {{ listen: Function }} app  an Express app (or anything with Node's `listen` signature)
 * @param {number|string} port
 * @param {string|null} address
 * @param {() => void} onListening  called once the socket is bound
 * @param {(err: Error) => void} onError  called instead when it could not be bound
 * @returns {import('node:http').Server}
 */
export function listenOn(app, port, address, onListening, onError) {
  const done = (err) => (err ? onError(err) : onListening());
  return address === null ? app.listen(port, done) : app.listen(port, address, done);
}
