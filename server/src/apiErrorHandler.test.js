// ============================================================
// File:        apiErrorHandler.test.js
// Path:        server/src/apiErrorHandler.test.js
// Project:     RaceArena — AUDIT-1 A5M-08 (2026-10-09)
// Description: An error is answered as JSON with no stack trace, the status unchanged, the text the
//              client shows unchanged, and a 4xx body never reaches the log.
//
// The app tests run with NODE_ENV=test — exactly the "not production" case in which Express's own
// handler printed the stack into an HTML page, so a missing handler shows up here as HTML.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createApp } from './app.js';
import { apiErrorHandler } from './apiErrorHandler.js';

afterEach(() => vi.restoreAllMocks());

describe('the real app (createApp)', () => {
  it('a malformed JSON body: 400 as JSON, no stack, and the body is not logged', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username":"a","password":"hunter2-secret');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ error: 'HTTP 400' });
    expect(res.text).not.toMatch(/at .*\.js/);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('hunter2');
  });

  it('a body over the 1 MB limit: 413 as JSON', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ pad: 'x'.repeat(1_100_000) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'HTTP 413' });
  });
});

describe('apiErrorHandler', () => {
  function appThatThrows(err) {
    const app = express();
    app.get('/x', () => {
      throw err;
    });
    app.use(apiErrorHandler);
    return app;
  }

  it('a throw in a route: 500 as JSON, the stack logged on the server and not sent', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appThatThrows(new Error('C:/secret/path/store.js exploded'))).get(
      '/x'
    );
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'HTTP 500' });
    expect(res.text).not.toContain('secret');
    expect(error).toHaveBeenCalled();
  });

  it('keeps a 4xx status an error carries, and treats a nonsense status as 500', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      (await request(appThatThrows(Object.assign(new Error(), { status: 418 }))).get('/x')).status
    ).toBe(418);
    expect(
      (await request(appThatThrows(Object.assign(new Error(), { status: 200 }))).get('/x')).status
    ).toBe(500);
  });
});
