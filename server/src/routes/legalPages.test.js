// ============================================================
// File:        legalPages.test.js
// Path:        server/src/routes/legalPages.test.js
// Project:     RaceArena — LEGAL-PAGES-1
// Description: The operator's legal pages on the server: readable by ANYONE, signed in or not, through
//              the real guard stack; settable by an admin only; each text a string of bounded length;
//              a round trip keeps the text byte for byte; and the answer carries `RA_SOURCE_URL`.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { createSettingsRouter } from './settings.js';
import { createLegalPagesStore, LEGAL_TEXT_MAX_CHARS } from '../settings/legalPages.js';
import {
  createRequireAuth,
  createRequireAdmin,
  isPublicPath,
  requiredRole,
} from '../auth/guards.js';

let filePath;
let legalPages;
beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-legal-pages-${randomUUID()}.json`);
  legalPages = createLegalPagesStore(filePath);
});
afterEach(() => {
  if (existsSync(filePath)) unlinkSync(filePath);
  vi.restoreAllMocks();
});

/**
 * The REAL guards in front of the router: `role` null is a visitor who is not signed in. The store
 * the guard consults knows exactly the one user the fake session names.
 */
function appAs(role, env = {}) {
  const a = express();
  a.use(express.json({ limit: '1mb' }));
  a.use((req, _res, next) => {
    req.session = role ? { userId: 'u1', sessionEpoch: 0 } : {};
    next();
  });
  const store = {
    findAuthRecordById: (id) =>
      role && id === 'u1' ? { id, username: 'u', role, team: 'T', sessionEpoch: 0 } : null,
  };
  a.use(createRequireAuth({ store }));
  a.use(createRequireAdmin());
  a.use('/api/settings', createSettingsRouter({ legalPages, env }));
  return a;
}

const URL_PATH = '/api/settings/legal-pages';

describe('reading the legal pages is public', () => {
  it('is on the public allow-list as a GET, and only as a GET', () => {
    expect(isPublicPath('GET', URL_PATH)).toBe(true);
    expect(isPublicPath('PUT', URL_PATH)).toBe(false);
  });

  it('a visitor who is not signed in reads them — empty on a fresh installation', async () => {
    const res = await request(appAs(null)).get(URL_PATH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      legalNotice: '',
      privacyPolicy: '',
      maxChars: LEGAL_TEXT_MAX_CHARS,
      sourceUrl: null,
    });
  });

  it('a damaged file reads as two empty texts, said once in the log', async () => {
    writeFileSync(filePath, '{ "legalNotice": ');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await request(appAs(null)).get(URL_PATH);
    expect(res.body.legalNotice).toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('the answer carries RA_SOURCE_URL when the operator set it', async () => {
    const res = await request(appAs(null, { RA_SOURCE_URL: 'https://example.org/fork' })).get(
      URL_PATH
    );
    expect(res.body.sourceUrl).toBe('https://example.org/fork');
  });
});

describe('setting the legal pages is admin-only', () => {
  it('is classified admin by the route policy', () => {
    expect(requiredRole('PUT', URL_PATH)).toBe('admin');
  });

  it('a visitor who is not signed in is refused (401), an operator too (403)', async () => {
    expect((await request(appAs(null)).put(URL_PATH).send({ legalNotice: 'x' })).status).toBe(401);
    expect((await request(appAs('operator')).put(URL_PATH).send({ legalNotice: 'x' })).status).toBe(
      403
    );
    expect(legalPages.get().legalNotice).toBe('');
  });

  it('an admin sets them, and a visitor reads exactly what was stored (round trip)', async () => {
    const text = 'LEGAL NOTICE\n\nOperator\n  <b>x</b> & "quotes"\r\n\tend';
    const put = await request(appAs('admin'))
      .put(URL_PATH)
      .send({ legalNotice: text, privacyPolicy: 'P' });
    expect(put.status).toBe(200);
    expect(put.body.legalNotice).toBe(text);
    const got = await request(appAs(null)).get(URL_PATH);
    expect(got.body.legalNotice).toBe(text);
    expect(got.body.privacyPolicy).toBe('P');
  });

  it('a text left out keeps its stored value', async () => {
    legalPages.update({ legalNotice: 'N', privacyPolicy: 'P' });
    const put = await request(appAs('admin')).put(URL_PATH).send({ privacyPolicy: 'P2' });
    expect(put.body).toMatchObject({ legalNotice: 'N', privacyPolicy: 'P2' });
  });
});

describe('the bounds', () => {
  it(`a text of exactly the bound is stored; one character more is refused with 400`, async () => {
    const atCap = 'a'.repeat(LEGAL_TEXT_MAX_CHARS);
    expect(LEGAL_TEXT_MAX_CHARS).toBe(20_000);
    const ok = await request(appAs('admin')).put(URL_PATH).send({ legalNotice: atCap });
    expect(ok.status).toBe(200);
    const over = await request(appAs('admin'))
      .put(URL_PATH)
      .send({ legalNotice: atCap + 'a' });
    expect(over.status).toBe(400);
    expect(over.body.error).toMatch(/legalNotice must be text of at most 20000 characters/);
    expect(legalPages.get().legalNotice).toBe(atCap);
  });

  it('anything that is not a string, and any other key, is refused with 400', async () => {
    legalPages.update({ legalNotice: 'kept', privacyPolicy: '' });
    for (const body of [
      { legalNotice: 5 },
      { legalNotice: null },
      { privacyPolicy: ['a'] },
      { privacyPolicy: { a: 1 } },
      { other: 'x' },
      [],
    ]) {
      const res = await request(appAs('admin')).put(URL_PATH).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(typeof res.body.error).toBe('string');
    }
    expect(legalPages.get().legalNotice).toBe('kept');
  });
});
