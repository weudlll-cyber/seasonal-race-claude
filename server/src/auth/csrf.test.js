// ============================================================
// File:        csrf.test.js
// Path:        server/src/auth/csrf.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Unit + bare-harness behavioural tests for the CSRF Origin/Referer guard
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { getAllowedClientOrigins, normalizeOrigin, createCsrfOriginGuard, resolveCsrfStrict } from './csrf.js';

// ── Part A — unit tests ───────────────────────────────────────────────────────

describe('getAllowedClientOrigins', () => {
  let saved;
  beforeEach(() => { saved = process.env.RA_CLIENT_ORIGIN; });
  afterEach(() => {
    if (saved === undefined) delete process.env.RA_CLIENT_ORIGIN;
    else process.env.RA_CLIENT_ORIGIN = saved;
  });

  it('unset → []', () => {
    delete process.env.RA_CLIENT_ORIGIN;
    expect(getAllowedClientOrigins()).toEqual([]);
  });

  it("'http://a.test' → ['http://a.test']", () => {
    process.env.RA_CLIENT_ORIGIN = 'http://a.test';
    expect(getAllowedClientOrigins()).toEqual(['http://a.test']);
  });

  it("' http://a.test , http://b.test ' → trimmed two-element array", () => {
    process.env.RA_CLIENT_ORIGIN = ' http://a.test , http://b.test ';
    expect(getAllowedClientOrigins()).toEqual(['http://a.test', 'http://b.test']);
  });
});

describe('normalizeOrigin', () => {
  it('lowercases and removes trailing slash', () => {
    expect(normalizeOrigin('HTTP://A.test/')).toBe('http://a.test');
  });

  it('removes multiple trailing slashes', () => {
    expect(normalizeOrigin('https://example.com///')).toBe('https://example.com');
  });

  it('leaves a plain origin unchanged', () => {
    expect(normalizeOrigin('https://example.com')).toBe('https://example.com');
  });
});

// ── Part A2 — resolveCsrfStrict unit tests ────────────────────────────────────

describe('resolveCsrfStrict', () => {
  afterEach(() => { delete process.env.RA_CSRF_STRICT; });

  it('RA_CSRF_STRICT=true → true, overrides isProduction:false', () => {
    process.env.RA_CSRF_STRICT = 'true';
    expect(resolveCsrfStrict(false)).toBe(true);
  });

  it('RA_CSRF_STRICT=false → false, overrides isProduction:true', () => {
    process.env.RA_CSRF_STRICT = 'false';
    expect(resolveCsrfStrict(true)).toBe(false);
  });

  it('RA_CSRF_STRICT unset, isProduction:false → false', () => {
    expect(resolveCsrfStrict(false)).toBe(false);
  });

  it('RA_CSRF_STRICT unset, isProduction:true → true', () => {
    expect(resolveCsrfStrict(true)).toBe(true);
  });

  it("RA_CSRF_STRICT='auto', isProduction:false → false (auto falls through)", () => {
    process.env.RA_CSRF_STRICT = 'auto';
    expect(resolveCsrfStrict(false)).toBe(false);
  });

  it("RA_CSRF_STRICT='auto', isProduction:true → true (auto falls through)", () => {
    process.env.RA_CSRF_STRICT = 'auto';
    expect(resolveCsrfStrict(true)).toBe(true);
  });
});

// ── Part B — guard behaviour (bare express harness, strict:false) ─────────────

function makeCsrfApp() {
  const csrfGuard = createCsrfOriginGuard({
    getAllowedOrigins: () => ['https://client.example'],
  });
  const app = express();
  app.use(csrfGuard);
  app.post('/api/_m', (_req, res) => res.json({ ok: true }));
  app.get('/api/_g',  (_req, res) => res.json({ ok: true }));
  return app;
}

describe('csrfOriginGuard behaviour', () => {
  let app;
  beforeEach(() => { app = makeCsrfApp(); });

  it('POST /api/_m with no Origin/Referer → 200 (non-browser client allowed)', async () => {
    const res = await request(app).post('/api/_m');
    expect(res.status).toBe(200);
  });

  it("POST /api/_m Origin 'https://client.example' → 200 (allowed origin)", async () => {
    const res = await request(app).post('/api/_m').set('Origin', 'https://client.example');
    expect(res.status).toBe(200);
  });

  it("POST /api/_m Host 'example.test' + Origin 'http://example.test' → 200 (same-origin self)", async () => {
    const res = await request(app).post('/api/_m')
      .set('Host', 'example.test')
      .set('Origin', 'http://example.test');
    expect(res.status).toBe(200);
  });

  it("POST /api/_m Origin 'http://evil.test' → 403", async () => {
    const res = await request(app).post('/api/_m').set('Origin', 'http://evil.test');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('cross-origin request rejected');
  });

  it("POST /api/_m Referer 'https://client.example/page' (no Origin) → 200 (Referer fallback)", async () => {
    const res = await request(app).post('/api/_m').set('Referer', 'https://client.example/page');
    expect(res.status).toBe(200);
  });

  it("POST /api/_m Referer 'http://evil.test/x' (no Origin) → 403", async () => {
    const res = await request(app).post('/api/_m').set('Referer', 'http://evil.test/x');
    expect(res.status).toBe(403);
  });

  it("GET /api/_g Origin 'http://evil.test' → 200 (non-mutating not checked)", async () => {
    const res = await request(app).get('/api/_g').set('Origin', 'http://evil.test');
    expect(res.status).toBe(200);
  });
});

// ── Part C — strict:true behaviour ───────────────────────────────────────────

function makeStrictCsrfApp({ selfOrigin } = {}) {
  const csrfGuard = createCsrfOriginGuard({
    getAllowedOrigins: () => ['https://client.example'],
    strict: true,
    selfOrigin: selfOrigin ?? null,
  });
  const app = express();
  app.use(csrfGuard);
  app.post('/api/_m', (_req, res) => res.json({ ok: true }));
  app.get('/api/_g',  (_req, res) => res.json({ ok: true }));
  return app;
}

describe('csrfOriginGuard strict:true', () => {
  it('missing Origin AND Referer → 403 origin required', async () => {
    const app = makeStrictCsrfApp();
    const res = await request(app).post('/api/_m');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('origin required');
  });

  it("Origin 'null' (opaque) → 403", async () => {
    const app = makeStrictCsrfApp();
    const res = await request(app).post('/api/_m').set('Origin', 'null');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('cross-origin request rejected');
  });

  it("valid allowed Origin → 200", async () => {
    const app = makeStrictCsrfApp();
    const res = await request(app).post('/api/_m').set('Origin', 'https://client.example');
    expect(res.status).toBe(200);
  });

  it("valid same-origin (Host-derived) → 200", async () => {
    const app = makeStrictCsrfApp();
    const res = await request(app).post('/api/_m')
      .set('Host', 'example.test')
      .set('Origin', 'http://example.test');
    expect(res.status).toBe(200);
  });

  it("cross-origin evil → 403", async () => {
    const app = makeStrictCsrfApp();
    const res = await request(app).post('/api/_m').set('Origin', 'http://evil.test');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('cross-origin request rejected');
  });

  it('selfOrigin from RA_PUBLIC_ORIGIN is used when set', async () => {
    const app = makeStrictCsrfApp({ selfOrigin: 'https://myapp.example.com' });
    // Host-derived self is NOT in allowed; canonical selfOrigin IS
    const res = await request(app).post('/api/_m')
      .set('Host', 'localhost:4000')
      .set('Origin', 'https://myapp.example.com');
    expect(res.status).toBe(200);
  });

  it('GET non-mutating still passes even with missing Origin in strict mode', async () => {
    const app = makeStrictCsrfApp();
    const res = await request(app).get('/api/_g');
    expect(res.status).toBe(200);
  });
});
