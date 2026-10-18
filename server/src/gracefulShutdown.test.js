// ============================================================
// File:        gracefulShutdown.test.js
// Path:        server/src/gracefulShutdown.test.js
// Project:     RaceArena — AUDIT-1 A10-01 (2026-10-09)
// Description: A shutdown signal lets the request in flight finish, refuses new ones, exits 0 —
//              and forces the exit when a request will not finish.
//
// A real HTTP server on an ephemeral port; the signal comes from an EventEmitter standing in for
// the process, and `exit` is recorded rather than called, so the test process itself never exits.
// ============================================================

import { describe, it, expect } from 'vitest';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { installGracefulShutdown } from './gracefulShutdown.js';

/**
 * A server whose `/slow` answers after `ms`, a promise for the `exit` code, and `slowArrived`, which
 * resolves when the server has RECEIVED the `/slow` request.
 *
 * The signal waits on `slowArrived` rather than a fixed pause: a 50 ms sleep failed once on
 * 2026-10-18 under a loaded suite — the request had not reached the server yet, the close found
 * nothing in flight and exited 0, and the forced-exit test read 0 instead of 1.
 */
async function harness({ ms = 300, timeoutMs = 5000 } = {}) {
  let arrived;
  const slowArrived = new Promise((r) => (arrived = r));
  const server = http.createServer((req, res) => {
    if (req.url === '/slow') {
      arrived();
      setTimeout(() => res.end('done'), ms);
    } else res.end('ok');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const signals = new EventEmitter();
  let exited;
  const exitCode = new Promise((r) => (exited = r));
  installGracefulShutdown(server, { signals, exit: exited, timeoutMs, log: () => {} });
  return { base, signals, exitCode, server, slowArrived };
}

describe('installGracefulShutdown (AUDIT-1 A10-01)', () => {
  it('SIGTERM: the request in flight finishes, a new one is refused, the exit code is 0', async () => {
    const { base, signals, exitCode, slowArrived } = await harness({ ms: 300 });
    const inFlight = fetch(`${base}/slow`).then((r) => r.text());
    await slowArrived; // the request is being handled now
    signals.emit('SIGTERM');
    await expect(inFlight).resolves.toBe('done');
    await expect(fetch(`${base}/`)).rejects.toThrow();
    await expect(exitCode).resolves.toBe(0);
  });

  it('SIGINT works the same way', async () => {
    const { signals, exitCode } = await harness();
    signals.emit('SIGINT');
    await expect(exitCode).resolves.toBe(0);
  });

  it('a request that will not finish: the exit is forced with 1 after the timeout', async () => {
    const { base, signals, exitCode, server, slowArrived } = await harness({
      ms: 60_000,
      timeoutMs: 200,
    });
    fetch(`${base}/slow`).catch(() => {});
    await slowArrived;
    signals.emit('SIGTERM');
    await expect(exitCode).resolves.toBe(1);
    server.closeAllConnections();
  });
});
