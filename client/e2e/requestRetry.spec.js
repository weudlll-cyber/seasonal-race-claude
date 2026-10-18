// ============================================================
// File:        client/e2e/requestRetry.spec.js
// Path:        client/e2e/requestRetry.spec.js
// Project:     RaceArena — APPREADY-HANGUP-1 (2026-10-18)
// Description: `getWithConnectionRetry` (requestRetry.js), against a real HTTP server on an ephemeral
//              port and Playwright's real APIRequestContext:
//                · the server DROPS the first connection (the socket destroyed before any answer —
//                  what the gate saw as `socket hang up`): the read gets the second answer;
//                · the server answers 500: returned at once, no second request;
//                · every connection dropped: it gives up after its attempts, with the error.
//              It touches no RaceArena server and needs no signed-in state.
// ============================================================

import { test, expect, request as playwrightRequest } from '@playwright/test';
import http from 'node:http';
import { getWithConnectionRetry, isDroppedConnection } from './requestRetry.js';

/** A server whose handler is `onRequest(n, req, res)`, n counting from 1; returns its base URL. */
async function serve(onRequest) {
  let n = 0;
  const server = http.createServer((req, res) => onRequest(++n, req, res));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    count: () => n,
    close: () =>
      new Promise((r) => {
        server.closeAllConnections();
        server.close(r);
      }),
  };
}

const drop = (req) => req.socket.destroy();
const answer = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

test.describe('getWithConnectionRetry — one more try after a dropped connection, nothing else', () => {
  let api;
  test.beforeEach(async () => {
    api = await playwrightRequest.newContext();
  });
  test.afterEach(async () => {
    await api.dispose();
  });

  test('a dropped connection: the next answer is returned', async () => {
    // Connections 1 and 2 are dropped, the rest answered.
    const srv = await serve((n, req, res) => (n <= 2 ? drop(req) : answer(res, 200, ['ok'])));
    try {
      // With no second try the drop IS the gate's failure — so the retry below catches the real error.
      await expect(
        getWithConnectionRetry(api, `${srv.base}/api/tracks`, { attempts: 1 })
      ).rejects.toThrow(/socket hang up|ECONNRESET/);
      const res = await getWithConnectionRetry(api, `${srv.base}/api/tracks`, { pauseMs: 10 });
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual(['ok']);
      expect(srv.count(), 'two dropped, then one answered').toBe(3);
    } finally {
      await srv.close();
    }
  });

  test('an HTTP error status is returned on the first answer, never retried', async () => {
    const srv = await serve((n, req, res) => answer(res, 500, { error: 'boom' }));
    try {
      const res = await getWithConnectionRetry(api, `${srv.base}/api/tracks`, { pauseMs: 10 });
      expect(res.status()).toBe(500);
      expect(srv.count(), 'a 500 is an answer: one request').toBe(1);
    } finally {
      await srv.close();
    }
  });

  test('every connection dropped: it gives up after its attempts, with the dropped-connection error', async () => {
    const srv = await serve((n, req) => drop(req));
    try {
      const err = await getWithConnectionRetry(api, `${srv.base}/api/tracks`, {
        attempts: 3,
        pauseMs: 10,
      }).catch((e) => e);
      expect(isDroppedConnection(err), String(err)).toBe(true);
      expect(srv.count(), 'three tries, then the error').toBe(3);
    } finally {
      await srv.close();
    }
  });

  test('isDroppedConnection: only connection errors', () => {
    expect(isDroppedConnection(new Error('apiRequestContext.get: socket hang up'))).toBe(true);
    expect(isDroppedConnection(new Error('read ECONNRESET'))).toBe(true);
    expect(isDroppedConnection(new Error('GET /api/tracks → 500'))).toBe(false);
    expect(isDroppedConnection(new Error('Timeout 30000ms exceeded'))).toBe(false);
  });
});
