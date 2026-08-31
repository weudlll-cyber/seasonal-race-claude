// ============================================================
// File:        staticClient.test.js
// Path:        server/src/staticClient.test.js
// Project:     RaceArena — SERVE-SPA-1
// Description: The four promises this piece makes, each as a test that can fail:
//                1. the app is served, at the root and at a deep link;
//                2. the API is NEVER answered with the app's HTML — the classic failure;
//                3. a missing ASSET 404s rather than coming back as the shell;
//                4. with no build the API is untouched and nothing is mounted.
//
//              These run against a real Express app through supertest, not against the module's
//              internals, because the question is what an HTTP caller receives.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import {
  mountClientAssets,
  mountSpaFallback,
  mountApiNotFound,
  clientBuildExists,
  resolveClientDist,
} from './staticClient.js';

let dist;
const SHELL = '<!doctype html><html><body>APP SHELL</body></html>';

beforeAll(() => {
  dist = mkdtempSync(join(os.tmpdir(), 'ra-dist-'));
  writeFileSync(join(dist, 'index.html'), SHELL);
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'assets', 'real.js'), 'export const x = 1;\n');
});
afterAll(() => rmSync(dist, { recursive: true, force: true }));

/**
 * An app in the same ORDER app.js uses: static and fallback above the guard, API below it, the
 * API's 404 last. The stand-in guard is what makes the ordering testable — if the mounts ever move
 * below it, the public-shell tests go red.
 */
function makeApp({ withBuild = true, authed = true } = {}) {
  const app = express();
  const target = withBuild ? dist : join(dist, 'nope');
  mountClientAssets(app, target, () => {});
  mountSpaFallback(app, target);
  app.use((req, res, next) =>
    authed ? next() : res.status(401).json({ error: 'not authenticated' }),
  );
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/tracks', (_req, res) => res.json([{ id: 'dirt-oval' }]));
  mountApiNotFound(app);
  return app;
}

describe('resolveClientDist', () => {
  it('honours RA_CLIENT_DIST and is module-relative otherwise', () => {
    expect(resolveClientDist({ RA_CLIENT_DIST: 'c:/somewhere/dist' })).toMatch(/somewhere/);
    const d = resolveClientDist({});
    expect(d).toMatch(/client[\\/]dist$/);
    // Never derived from the working directory — the defect dataPaths.js exists to avoid.
    expect(d).not.toBe(join(process.cwd(), 'client', 'dist'));
  });

  it('clientBuildExists is about index.html, not the directory', () => {
    expect(clientBuildExists(dist)).toBe(true);
    expect(clientBuildExists(join(dist, 'assets'))).toBe(false);
  });
});

describe('with a built client — the app is served', () => {
  const app = () => makeApp();

  it('serves the shell at the root', async () => {
    const r = await request(app()).get('/');
    expect(r.status).toBe(200);
    expect(r.text).toContain('APP SHELL');
  });

  it('serves the shell at a deep link, so a typed URL works', async () => {
    for (const p of ['/setup', '/race', '/race/anything/deep']) {
      const r = await request(app()).get(p);
      expect(r.status, p).toBe(200);
      expect(r.text, p).toContain('APP SHELL');
    }
  });

  it('serves a real asset as itself, not as the shell', async () => {
    const r = await request(app()).get('/assets/real.js');
    expect(r.status).toBe(200);
    expect(r.text).toContain('export const x');
  });

  it('serves the shell to a visitor who is NOT authenticated', async () => {
    // The whole point of mounting above the guard: the sign-in screen has to be reachable.
    const r = await request(makeApp({ authed: false })).get('/setup');
    expect(r.status).toBe(200);
    expect(r.text).toContain('APP SHELL');
  });
});

describe('the API is never answered with the app', () => {
  it('an unknown API path returns a JSON API error, not HTML', async () => {
    for (const p of ['/api/does-not-exist', '/api/tracsk', '/api/']) {
      const r = await request(makeApp()).get(p);
      expect(r.status, p).toBe(404);
      expect(r.headers['content-type'], p).toMatch(/json/);
      expect(r.text, p).not.toContain('APP SHELL');
    }
  });

  it('an unknown API path under a non-GET method is also an API error', async () => {
    const r = await request(makeApp()).post('/api/nope');
    expect(r.status).toBe(404);
    expect(r.headers['content-type']).toMatch(/json/);
    expect(r.text).not.toContain('APP SHELL');
  });

  it('an unknown API path reaches the AUTH guard rather than the shell', async () => {
    // Unauthenticated, the API's own guard must answer — the fallback must not step in front of it.
    const r = await request(makeApp({ authed: false })).get('/api/does-not-exist');
    expect(r.status).toBe(401);
    expect(r.text).not.toContain('APP SHELL');
  });

  it('real API routes answer exactly as before', async () => {
    const app = makeApp();
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
    expect((await request(app).get('/api/tracks')).body).toEqual([{ id: 'dirt-oval' }]);
  });
});

describe('a MISSING asset 404s rather than becoming the shell', () => {
  it('does not answer a missing script with HTML', async () => {
    // The browser would report a MIME-type error instead of a plain 404 — found by probing.
    const r = await request(makeApp()).get('/assets/index-STALE.js');
    expect(r.status).toBe(404);
    expect(r.text).not.toContain('APP SHELL');
  });

  it('the same for a missing stylesheet and image', async () => {
    for (const p of ['/assets/gone.css', '/img/missing.png']) {
      const r = await request(makeApp()).get(p);
      expect(r.status, p).toBe(404);
      expect(r.text, p).not.toContain('APP SHELL');
    }
  });
});

describe('with NO built client', () => {
  it('mounts nothing and says so once', () => {
    const said = [];
    const app = express();
    const mounted = mountClientAssets(app, join(dist, 'nope'), (m) => said.push(m));
    expect(mounted).toBe(false);
    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/no built client at/);
    expect(said[0]).toMatch(/npm run build/);
    expect(mountSpaFallback(app, join(dist, 'nope'))).toBe(false);
  });

  it('leaves the API working — a developer running the API alone is not blocked', async () => {
    const app = makeApp({ withBuild: false });
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
    const r = await request(app).get('/');
    expect(r.status).toBe(404);
    expect(r.text).not.toContain('APP SHELL');
  });
});
