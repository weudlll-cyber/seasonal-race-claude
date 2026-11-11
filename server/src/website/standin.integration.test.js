// ============================================================
// File:        standin.integration.test.js
// Path:        server/src/website/standin.integration.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: The local stand-in for the website proxy (scripts/website-standin.mjs) in front of
//              a real website-mode app, both on ephemeral 127.0.0.1 ports: picking a fake member on
//              the stand-in's page signs the browser in as that member, through the full path; and
//              identity headers a browser sends itself never get through. The secret is generated
//              per run and never printed.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { startStandin } from '../../../scripts/website-standin.mjs';

const BASE = '/games/race';
const SECRET = randomBytes(24).toString('base64url');
let dir;
let race;
let standin;
let origin;

const listen = (app) =>
  new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

beforeAll(async () => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-standin-'));
  const secretFile = join(dir, 'proxy-secret');
  writeFileSync(secretFile, SECRET, { mode: 0o600 });
  vi.resetModules();
  vi.stubEnv('RA_MODE', 'website');
  vi.stubEnv('RA_BASE_PATH', BASE);
  vi.stubEnv('RA_WEBSITE_PROXY_SECRET_FILE', secretFile);
  vi.stubEnv('RA_WEBSITE_TRUSTED_PROXIES', '127.0.0.1/32, ::1');
  const { createApp } = await import('../app.js');
  race = await listen(createApp());
  standin = await startStandin({
    port: 0,
    target: `http://127.0.0.1:${race.address().port}`,
    base: BASE,
    secret: SECRET,
  });
  origin = `http://127.0.0.1:${standin.address().port}`;
});

afterAll(async () => {
  await new Promise((r) => standin.close(r));
  await new Promise((r) => race.close(r));
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/** A tiny browser: follows redirects by hand and keeps the cookies it is given, per name. */
function browser() {
  const jar = new Map();
  async function go(path, init = {}) {
    let url = new URL(path, origin);
    for (let hops = 0; hops < 5; hops++) {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      const res = await fetch(url, {
        ...init,
        redirect: 'manual',
        headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) },
      });
      for (const c of res.headers.getSetCookie()) {
        const [pair] = c.split(';');
        const at = pair.indexOf('=');
        jar.set(pair.slice(0, at), pair.slice(at + 1));
      }
      if (res.status < 300 || res.status >= 400) return res;
      url = new URL(res.headers.get('location'), url);
    }
    throw new Error('too many redirects');
  }
  return { go };
}

describe('the website stand-in in front of a website-mode race', () => {
  it('its page offers the four fake members', async () => {
    const html = await (await fetch(`${origin}/`)).text();
    for (const k of ['member', 'host', 'admin', 'guest'])
      expect(html).toContain(`/_standin/as/${k}`);
  });

  it('picking "host" signs the browser in as a race operator, under the base path', async () => {
    const b = browser();
    const landed = await b.go('/_standin/as/host');
    expect(landed.status).toBe(200); // the app shell (or the API 404 page with no build)… either way, arrived
    const me = await b.go(`${BASE}/api/auth/me`);
    expect(me.status).toBe(200);
    const body = await me.json();
    expect(body.role).toBe('operator');
    expect(body.displayName).toBe('Hugo Host');
  });

  it('picking "member" gives a player identity only — no director API', async () => {
    const b = browser();
    await b.go('/_standin/as/member');
    expect((await b.go(`${BASE}/api/auth/me`)).status).toBe(401);
  });

  it('★ identity headers a browser sends itself are stripped, even on /auth/website', async () => {
    const b = browser();
    // Guest picked (the default): a browser forging an admin's headers and the secret gets nowhere.
    await b.go(`${BASE}/auth/website`, {
      headers: {
        'x-acting-user-id': 'forged',
        'x-acting-user': 'Forged',
        'x-acting-user-roles': 'admin',
        'x-ra-proxy-secret': 'whatever',
      },
    });
    expect((await b.go(`${BASE}/api/auth/me`)).status).toBe(401);
  });

  it('outside the base path the stand-in answers 404', async () => {
    expect((await fetch(`${origin}/elsewhere`)).status).toBe(404);
  });
});
