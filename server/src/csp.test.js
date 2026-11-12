// ============================================================
// File:        csp.test.js
// Path:        server/src/csp.test.js
// Project:     RaceArena — AUDIT-1 D1 (2026-10-09)
// Description: The Content-Security-Policy is sent, admits the one inline script by its exact hash,
//              and admits nothing it does not need. WEBSITE-EXTRAS-1 piece 7b: frame-src 'self' in website
//              mode only (the website chat); standalone pinned byte-identical to master dcc9a250.
//
// The hash check is the one that matters: a browser computes it over the script's text, so the
// test computes it the same way from the page the server actually serves, rather than trusting
// the function that produced it.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import { cspDirectives } from './csp.js';
import { mountSpaFallback } from './staticClient.js';
import { createApp } from './app.js';

let dist;
beforeAll(() => {
  dist = mkdtempSync(join(os.tmpdir(), 'ra-csp-'));
  writeFileSync(
    join(dist, 'index.html'),
    '<!doctype html><html><head><title>t</title></head><body>APP</body></html>'
  );
});
afterAll(() => rmSync(dist, { recursive: true, force: true }));

/** An app that serves the shell under the policy, the way app.js wires the two together. */
function shellApp(env) {
  const app = express();
  app.use(
    helmet({ contentSecurityPolicy: { useDefaults: false, directives: cspDirectives(env) } })
  );
  mountSpaFallback(app, dist, env);
  return app;
}

const policyOf = (res) =>
  Object.fromEntries(
    res.headers['content-security-policy'].split(';').map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values];
    })
  );

describe('the Content-Security-Policy (AUDIT-1 D1)', () => {
  it('every answer of the real app carries it', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
  });

  for (const env of [{}, { RA_PUBLIC_ORIGIN: 'https://races.example.com' }]) {
    it(`admits the injected script by the hash of the text the page carries (${env.RA_PUBLIC_ORIGIN ?? 'same-origin'})`, async () => {
      const res = await request(shellApp(env)).get('/');
      const inline = /<script>([\s\S]*?)<\/script>/.exec(res.text)[1];
      const hash = `'sha256-${createHash('sha256').update(inline, 'utf8').digest('base64')}'`;
      expect(policyOf(res)['script-src']).toEqual(["'self'", hash]);
    });
  }

  it('admits no inline or eval script, no inline style, no plugin, no framing, no foreign base', async () => {
    const p = policyOf(await request(shellApp({})).get('/'));
    expect(p['script-src'].join(' ')).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(p['style-src']).toEqual(["'self'"]);
    expect(p['object-src']).toEqual(["'none'"]);
    expect(p['frame-ancestors']).toEqual(["'none'"]);
    expect(p['base-uri']).toEqual(["'self'"]);
    expect(p['upgrade-insecure-requests']).toBeUndefined();
  });

  it('connect-src names the configured public origin, and only that beside self', async () => {
    const p = policyOf(
      await request(shellApp({ RA_PUBLIC_ORIGIN: 'https://races.example.com' })).get('/')
    );
    expect(p['connect-src']).toEqual(["'self'", 'https://races.example.com']);
  });
});

// WEBSITE-EXTRAS-1 piece 7b (OWNER-5): the website's chat is framed in website mode only.
describe('the website chat frame: frame-src in website mode only', () => {
  // The two standalone headers EXACTLY as master dcc9a250 sent them, captured before the change:
  // standalone must stay byte-identical.
  const STANDALONE = {
    'same-origin':
      "default-src 'self';script-src 'self' 'sha256-nwe1DH+5Ksny3gJ+jlNcEEbEegSAUIk+GaaEz2gZ8Cs=';style-src 'self';img-src 'self' data: blob:;connect-src 'self';font-src 'self';object-src 'none';base-uri 'self';form-action 'self';frame-ancestors 'none'",
    'https://races.example.com':
      "default-src 'self';script-src 'self' 'sha256-wj6zS5LT2BPbCkjyPEolqdW/Qxiq/PfcUIvnF7kMozk=';style-src 'self';img-src 'self' data: blob:;connect-src 'self' https://races.example.com;font-src 'self';object-src 'none';base-uri 'self';form-action 'self';frame-ancestors 'none'",
  };
  const plainApp = (env) => {
    const app = express();
    app.use(
      helmet({ contentSecurityPolicy: { useDefaults: false, directives: cspDirectives(env) } })
    );
    app.get('/', (_req, res) => res.end('x'));
    return app;
  };

  for (const [label, header] of Object.entries(STANDALONE)) {
    it(`★ standalone (${label}) is byte-identical to before — no frame-src at all`, async () => {
      const env = label === 'same-origin' ? {} : { RA_PUBLIC_ORIGIN: label };
      const res = await request(plainApp(env)).get('/');
      expect(res.headers['content-security-policy']).toBe(header);
    });
  }

  it("★ website mode: frame-src 'self' (the chat on the website's own origin); frame-ancestors still 'none'", async () => {
    const p = policyOf(
      await request(plainApp({ RA_MODE: 'website', RA_BASE_PATH: '/games/race' })).get('/')
    );
    expect(p['frame-src']).toEqual(["'self'"]);
    expect(p['frame-ancestors']).toEqual(["'none'"]);
  });
});
