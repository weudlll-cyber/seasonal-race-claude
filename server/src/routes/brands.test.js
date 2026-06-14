// ============================================================
// File:        brands.test.js
// Path:        server/src/routes/brands.test.js
// Project:     RaceArena
// Description: Integration tests for /api/brands (D3).
//              Covers: CRUD, isDefault enforcement, logo upload/serve/delete,
//              magic-byte honesty proof, default seed, admin promote/export,
//              operator gating, validation, and corrupt-file-at-boot skip.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../app.js';
import { validateBody, loadAll, DATA_DIR } from './brands.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = createApp();
let admin;
let operator;

beforeAll(async () => {
  [admin, operator] = await Promise.all([adminAgent(app), operatorAgent(app)]);
});

const createdIds = [];

afterAll(async () => {
  for (const id of createdIds) {
    // Demote first in case the test promoted the brand to isDefault:true.
    await admin.post(`/api/brands/${id}/clear-default`).catch(() => {});
    await admin.delete(`/api/brands/${id}`).catch(() => {});
  }
});

// ── Minimal valid image buffers ───────────────────────────────────────────────

// 1×1 white JPEG (smallest valid JPEG)
const JPEG_MAGIC = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

// PNG signature bytes (8 bytes) + enough padding for the 12-byte magic-byte check
const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
]);

// Non-image content with a valid filename/MIME header — used for the honesty proof
const FAKE_IMAGE_BYTES = Buffer.from('This is not an image, just plain text.');

// ── Unit: validateBody ────────────────────────────────────────────────────────

describe('validateBody', () => {
  it('accepts a minimal valid body', () => {
    expect(validateBody({ name: 'Test Brand', eventName: 'Test Event' })).toEqual([]);
  });

  it('rejects empty name', () => {
    const errs = validateBody({ name: '', eventName: 'Event' });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toMatch(/name/i);
  });

  it('rejects whitespace-only name', () => {
    const errs = validateBody({ name: '   ', eventName: 'Event' });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects name longer than 100 characters', () => {
    const errs = validateBody({ name: 'X'.repeat(101), eventName: 'Event' });
    expect(errs.join(' ')).toMatch(/name/i);
  });

  it('rejects empty eventName', () => {
    const errs = validateBody({ name: 'Brand', eventName: '' });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toMatch(/eventName/i);
  });

  it('rejects invalid primaryColor (not hex)', () => {
    const errs = validateBody({ name: 'B', eventName: 'E', primaryColor: 'red' });
    expect(errs.join(' ')).toMatch(/primaryColor/i);
  });

  it('accepts valid primaryColor hex', () => {
    const errs = validateBody({ name: 'B', eventName: 'E', primaryColor: '#aabbcc' });
    expect(errs).toEqual([]);
  });

  it('rejects logoOpacity out of range', () => {
    const errs = validateBody({ name: 'B', eventName: 'E', logoOpacity: 1.5 });
    expect(errs.join(' ')).toMatch(/logoOpacity/i);
  });

  it('accepts logoOpacity = 0', () => {
    expect(validateBody({ name: 'B', eventName: 'E', logoOpacity: 0 })).toEqual([]);
  });

  it('rejects negative logoMaxHeight', () => {
    const errs = validateBody({ name: 'B', eventName: 'E', logoMaxHeight: -1 });
    expect(errs.join(' ')).toMatch(/logoMaxHeight/i);
  });

  it('rejects invalid logoCorner', () => {
    const errs = validateBody({ name: 'B', eventName: 'E', logoCorner: 'bottom-left' });
    expect(errs.join(' ')).toMatch(/logoCorner/i);
  });

  it('accepts valid logoCorner values', () => {
    expect(validateBody({ name: 'B', eventName: 'E', logoCorner: 'bottom-right' })).toEqual([]);
    expect(validateBody({ name: 'B', eventName: 'E', logoCorner: 'top-right' })).toEqual([]);
  });
});

// ── Unit: loadAll skips corrupt files ─────────────────────────────────────────

describe('loadAll: corrupt file is skipped (boot safety)', () => {
  it('does not throw and returns a Map when a file contains invalid JSON', () => {
    const tmpDir = join(DATA_DIR, '__test-corrupt__');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'broken.json'), 'NOT JSON {{{', 'utf8');
    writeFileSync(
      join(tmpDir, 'valid.json'),
      JSON.stringify({ id: 'ok', name: 'ok', eventName: 'ev', isDefault: false }),
      'utf8'
    );

    let map;
    expect(() => { map = loadAll(tmpDir); }).not.toThrow();
    expect(map).toBeInstanceOf(Map);
    expect(map.has('ok')).toBe(true);
    expect(map.size).toBe(1);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ── Default seed ──────────────────────────────────────────────────────────────

describe('Default seed', () => {
  it('GET / includes at least one isDefault:true brand at boot', async () => {
    const res = await admin.get('/api/brands');
    expect(res.status).toBe(200);
    const defaults = res.body.filter((b) => b.isDefault);
    expect(defaults.length).toBeGreaterThanOrEqual(1);
  });

  it('default seed brand has non-empty name and eventName', async () => {
    const res = await admin.get('/api/brands');
    const def = res.body.find((b) => b.isDefault);
    expect(typeof def.name).toBe('string');
    expect(def.name.length).toBeGreaterThan(0);
    expect(typeof def.eventName).toBe('string');
    expect(def.eventName.length).toBeGreaterThan(0);
  });

  it('second GET / does not duplicate the seed (idempotent)', async () => {
    const r1 = await admin.get('/api/brands');
    const r2 = await admin.get('/api/brands');
    const count1 = r1.body.filter((b) => b.id === 'seasonal-entertainment').length;
    const count2 = r2.body.filter((b) => b.id === 'seasonal-entertainment').length;
    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });
});

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /api/brands', () => {
  it('returns 200 with an array', async () => {
    const res = await admin.get('/api/brands');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

describe('GET /api/brands/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await admin.get('/api/brands/nonexistent-xyz-abc');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns the brand by id', async () => {
    const id = 'test-brand-get-by-id';
    await admin.post('/api/brands').send({ id, name: 'Get By Id', eventName: 'Event' });
    createdIds.push(id);

    const res = await admin.get(`/api/brands/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Get By Id');
  });
});

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /api/brands', () => {
  it('creates a brand and returns 201', async () => {
    const id = 'test-brand-post-basic';
    const res = await admin.post('/api/brands').send({
      id,
      name: 'Basic Brand',
      eventName: 'Basic Event',
      primaryColor: '#111111',
      secondaryColor: '#222222',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Basic Brand');
    expect(res.body.eventName).toBe('Basic Event');
    expect(typeof res.body.createdAt).toBe('string');
    expect(typeof res.body.updatedAt).toBe('string');
    createdIds.push(id);
  });

  it('auto-generates id when none is provided', async () => {
    const res = await admin.post('/api/brands').send({ name: 'Auto ID', eventName: 'Auto Event' });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    createdIds.push(res.body.id);
  });

  it('returns 409 when id already exists', async () => {
    const id = 'test-brand-post-dup';
    await admin.post('/api/brands').send({ id, name: 'Dup', eventName: 'Event' });
    createdIds.push(id);
    const res = await admin.post('/api/brands').send({ id, name: 'Dup2', eventName: 'Event2' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for missing name', async () => {
    const res = await admin.post('/api/brands').send({ id: 'test-brand-no-name', eventName: 'Event' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for missing eventName', async () => {
    const res = await admin.post('/api/brands').send({ name: 'Brand' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid id format (uppercase)', async () => {
    const res = await admin.post('/api/brands').send({
      id: 'InvalidBrand', name: 'G', eventName: 'E',
    });
    expect(res.status).toBe(400);
  });

  it('created brand appears in GET /', async () => {
    const id = 'test-brand-post-in-list';
    await admin.post('/api/brands').send({ id, name: 'In List', eventName: 'Listed Event' });
    createdIds.push(id);
    const res = await admin.get('/api/brands');
    expect(res.body.some((b) => b.id === id)).toBe(true);
  });
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────

describe('PUT /api/brands/:id', () => {
  it('updates name and eventName, returns 200', async () => {
    const id = 'test-brand-put-basic';
    await admin.post('/api/brands').send({ id, name: 'Original', eventName: 'Orig Event' });
    createdIds.push(id);

    const res = await admin.put(`/api/brands/${id}`).send({ name: 'Updated', eventName: 'Updated Event' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
    expect(res.body.eventName).toBe('Updated Event');
  });

  it('preserves createdAt on update', async () => {
    const id = 'test-brand-put-createdat';
    const created = await admin.post('/api/brands').send({ id, name: 'Preserve', eventName: 'E' });
    createdIds.push(id);

    const updated = await admin.put(`/api/brands/${id}`).send({ name: 'Preserve2', eventName: 'E2' });
    expect(updated.body.createdAt).toBe(created.body.createdAt);
  });

  it('returns 404 for unknown id', async () => {
    const res = await admin.put('/api/brands/nonexistent-put-xyz').send({ name: 'X', eventName: 'Y' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for empty name on update', async () => {
    const id = 'test-brand-put-badname';
    await admin.post('/api/brands').send({ id, name: 'Valid', eventName: 'E' });
    createdIds.push(id);
    const res = await admin.put(`/api/brands/${id}`).send({ name: '', eventName: 'E' });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe('DELETE /api/brands/:id', () => {
  it('deletes a non-default brand and returns 204', async () => {
    const id = 'test-brand-delete-ok';
    await admin.post('/api/brands').send({ id, name: 'Delete Me', eventName: 'E' });

    const res = await admin.delete(`/api/brands/${id}`);
    expect(res.status).toBe(204);

    const get = await admin.get(`/api/brands/${id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await admin.delete('/api/brands/nonexistent-del-xyz');
    expect(res.status).toBe(404);
  });

  it('deleted brand no longer appears in GET /', async () => {
    const id = 'test-brand-delete-from-list';
    await admin.post('/api/brands').send({ id, name: 'Transient', eventName: 'E' });
    await admin.delete(`/api/brands/${id}`);
    const res = await admin.get('/api/brands');
    expect(res.body.some((b) => b.id === id)).toBe(false);
  });
});

// ── HONESTY PROOF — Invariant 2 (isDefault never inherited from body) ─────────
//
// These tests are RED without the explicit `isDefault: false` / `isDefault: existing.isDefault`
// lines in POST and PUT handlers — a naïve spread of req.body would leak the field.
// WITH the protection they are GREEN.

describe('Honesty proof — Invariant 2: isDefault never inherited from POST/PUT body', () => {
  it('[POST] body isDefault:true is ignored — stored record has isDefault:false', async () => {
    const id = 'test-brand-inv2-post';
    const res = await admin.post('/api/brands').send({
      id, name: 'Proof POST', eventName: 'E', isDefault: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.isDefault).toBe(false);
    createdIds.push(id);
  });

  it('[PUT] body isDefault:true on a non-default brand — stored record stays false', async () => {
    const id = 'test-brand-inv2-put-promote';
    await admin.post('/api/brands').send({ id, name: 'PUT Proof', eventName: 'E' });
    createdIds.push(id);

    const res = await admin.put(`/api/brands/${id}`).send({
      name: 'PUT Proof Updated', eventName: 'E2', isDefault: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(false);
  });

  it('[PUT] body isDefault:false on an actual default — stored record stays true', async () => {
    const listRes = await admin.get('/api/brands');
    const def = listRes.body.find((b) => b.isDefault);
    expect(def).toBeDefined();

    const res = await admin.put(`/api/brands/${def.id}`).send({
      name: def.name, eventName: def.eventName, isDefault: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true);
  });
});

// ── HONESTY PROOF — Invariant 3: DELETE on default → 403 ─────────────────────

describe('Honesty proof — Invariant 3: DELETE on isDefault:true returns 403', () => {
  it('DELETE on the seeded default brand returns 403 (not 204)', async () => {
    const res = await admin.delete('/api/brands/seasonal-entertainment');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('default brand still exists after rejected DELETE', async () => {
    const res = await admin.get('/api/brands/seasonal-entertainment');
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true);
  });
});

// ── HONESTY PROOF — Magic-byte logo upload ────────────────────────────────────
//
// This is the designated honesty test (SPEC D3 L126):
//
// A non-image buffer is sent with Content-Type: image/jpeg and a *.jpg filename.
// Without magic-byte validation, the route would accept this and return 200.
// WITH magic-byte validation it must return 400.
//
// The test is RED if the route trusts req.file.mimetype (the client-supplied header);
// it is GREEN only when detectMagicType() is used as the authoritative check.

describe('Honesty proof — Magic-byte authoritative: fake image rejected (L126)', () => {
  it('[POST /:id/logo] non-image buffer sent as image/jpeg → 400 (magic-byte check)', async () => {
    const id = 'test-brand-logo-magic';
    await admin.post('/api/brands').send({ id, name: 'Logo Magic Test', eventName: 'E' });
    createdIds.push(id);

    const res = await admin
      .post(`/api/brands/${id}/logo`)
      .attach('logo', FAKE_IMAGE_BYTES, { filename: 'fake.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('[POST /:id/logo] real JPEG magic bytes → accepted', async () => {
    const id = 'test-brand-logo-real-jpeg';
    await admin.post('/api/brands').send({ id, name: 'Real JPEG', eventName: 'E' });
    createdIds.push(id);

    const res = await admin
      .post(`/api/brands/${id}/logo`)
      .attach('logo', JPEG_MAGIC, { filename: 'real.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('logoFile');
    expect(res.body.logoFile).toMatch(/\.jpg$/);
  });
});

// ── Logo routes ───────────────────────────────────────────────────────────────

describe('Logo: POST /:id/logo', () => {
  it('returns 404 for unknown brand', async () => {
    const res = await admin
      .post('/api/brands/nonexistent-logo/logo')
      .attach('logo', JPEG_MAGIC, { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when no file is uploaded', async () => {
    const id = 'test-brand-logo-nofile';
    await admin.post('/api/brands').send({ id, name: 'No File', eventName: 'E' });
    createdIds.push(id);

    const res = await admin.post(`/api/brands/${id}/logo`).send();
    expect(res.status).toBe(400);
  });

  it('updates logoFile on the brand record', async () => {
    const id = 'test-brand-logo-record';
    await admin.post('/api/brands').send({ id, name: 'Logo Record', eventName: 'E' });
    createdIds.push(id);

    await admin
      .post(`/api/brands/${id}/logo`)
      .attach('logo', JPEG_MAGIC, { filename: 'r.jpg', contentType: 'image/jpeg' });

    const get = await admin.get(`/api/brands/${id}`);
    expect(get.body.logoFile).toBeTruthy();
    expect(get.body.logoFile).toMatch(/\.jpg$/);
  });
});

describe('Logo: GET /:id/logo', () => {
  it('returns 404 when brand has no logo', async () => {
    const id = 'test-brand-logo-get-nologo';
    await admin.post('/api/brands').send({ id, name: 'No Logo', eventName: 'E' });
    createdIds.push(id);

    const res = await admin.get(`/api/brands/${id}/logo`);
    expect(res.status).toBe(404);
  });

  it('serves the logo with nosniff header after upload', async () => {
    const id = 'test-brand-logo-serve';
    await admin.post('/api/brands').send({ id, name: 'Serve Logo', eventName: 'E' });
    createdIds.push(id);

    await admin
      .post(`/api/brands/${id}/logo`)
      .attach('logo', JPEG_MAGIC, { filename: 's.jpg', contentType: 'image/jpeg' });

    const res = await admin.get(`/api/brands/${id}/logo`);
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('Logo: DELETE /:id/logo', () => {
  it('removes logo and sets logoFile to null', async () => {
    const id = 'test-brand-logo-delete';
    await admin.post('/api/brands').send({ id, name: 'Del Logo', eventName: 'E' });
    createdIds.push(id);

    await admin
      .post(`/api/brands/${id}/logo`)
      .attach('logo', JPEG_MAGIC, { filename: 'd.jpg', contentType: 'image/jpeg' });

    const del = await admin.delete(`/api/brands/${id}/logo`);
    expect(del.status).toBe(204);

    const get = await admin.get(`/api/brands/${id}`);
    expect(get.body.logoFile).toBeNull();
  });

  it('GET /:id/logo returns 404 after delete', async () => {
    const id = 'test-brand-logo-delete-get';
    await admin.post('/api/brands').send({ id, name: 'Del Logo Get', eventName: 'E' });
    createdIds.push(id);

    await admin
      .post(`/api/brands/${id}/logo`)
      .attach('logo', PNG_MAGIC, { filename: 'p.png', contentType: 'image/png' });
    await admin.delete(`/api/brands/${id}/logo`);

    const res = await admin.get(`/api/brands/${id}/logo`);
    expect(res.status).toBe(404);
  });
});

// ── Admin promote / demote / export-seed ─────────────────────────────────────

describe('Admin: POST /:id/set-default and POST /:id/clear-default', () => {
  it('admin can promote a non-default brand to isDefault:true', async () => {
    const id = 'test-brand-admin-promote';
    await admin.post('/api/brands').send({ id, name: 'Promote Me', eventName: 'E' });
    createdIds.push(id);

    const res = await admin.post(`/api/brands/${id}/set-default`);
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true);

    const get = await admin.get(`/api/brands/${id}`);
    expect(get.body.isDefault).toBe(true);
  });

  it('admin can demote a default brand to isDefault:false', async () => {
    const id = 'test-brand-admin-demote';
    await admin.post('/api/brands').send({ id, name: 'Demote Me', eventName: 'E' });
    createdIds.push(id);
    await admin.post(`/api/brands/${id}/set-default`);

    const res = await admin.post(`/api/brands/${id}/clear-default`);
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(false);
  });

  it('demoted brand can then be deleted', async () => {
    const id = 'test-brand-admin-demote-delete';
    await admin.post('/api/brands').send({ id, name: 'Demote Delete', eventName: 'E' });
    await admin.post(`/api/brands/${id}/set-default`);
    await admin.post(`/api/brands/${id}/clear-default`);

    const res = await admin.delete(`/api/brands/${id}`);
    expect(res.status).toBe(204);
  });

  it('set-default returns 404 for unknown id', async () => {
    const res = await admin.post('/api/brands/nonexistent-xyz/set-default');
    expect(res.status).toBe(404);
  });
});

describe('Admin: GET /:id/export-seed', () => {
  it('returns the full record as seed-ready JSON', async () => {
    const id = 'test-brand-export';
    const created = await admin.post('/api/brands').send({ id, name: 'Export Me', eventName: 'Exp Event' });
    createdIds.push(id);

    const res = await admin.get(`/api/brands/${id}/export-seed`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Export Me');
    expect(res.body.isDefault).toBe(created.body.isDefault);
  });

  it('export-seed returns 404 for unknown id', async () => {
    const res = await admin.get('/api/brands/nonexistent-xyz/export-seed');
    expect(res.status).toBe(404);
  });

  it('export-seed references logo asset when brand has a logo', async () => {
    // The default seed (seasonal-entertainment) has a logoFile set.
    const res = await admin.get('/api/brands/seasonal-entertainment/export-seed');
    expect(res.status).toBe(200);
    expect(res.body.logoFile).toBeTruthy();
    expect(res.body._logoAssetRelPath).toBeTruthy();
    expect(res.body._logoAssetRelPath).toContain(res.body.logoFile);
  });

  it('export-seed has no _logoAssetRelPath when brand has no logo', async () => {
    const id = 'test-brand-export-nologo';
    await admin.post('/api/brands').send({ id, name: 'No Logo Export', eventName: 'E' });
    createdIds.push(id);

    const res = await admin.get(`/api/brands/${id}/export-seed`);
    expect(res.status).toBe(200);
    expect(res.body.logoFile).toBeNull();
    expect(res.body._logoAssetRelPath).toBeUndefined();
  });
});

// ── Operator gating ───────────────────────────────────────────────────────────

describe('Operator gating: admin-only sub-routes return 403 for operator', () => {
  it('operator POST /set-default → 403', async () => {
    const res = await operator.post('/api/brands/seasonal-entertainment/set-default');
    expect(res.status).toBe(403);
  });

  it('operator POST /clear-default → 403', async () => {
    const res = await operator.post('/api/brands/seasonal-entertainment/clear-default');
    expect(res.status).toBe(403);
  });

  it('operator GET /export-seed → 403', async () => {
    const res = await operator.get('/api/brands/seasonal-entertainment/export-seed');
    expect(res.status).toBe(403);
  });
});

describe('Operator: can perform normal CRUD (operator+)', () => {
  it('operator GET / returns 200', async () => {
    const res = await operator.get('/api/brands');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('operator POST / creates a brand', async () => {
    const id = 'test-brand-operator-create';
    const res = await operator.post('/api/brands').send({ id, name: 'Op Brand', eventName: 'Op Event' });
    expect(res.status).toBe(201);
    expect(res.body.isDefault).toBe(false);
    createdIds.push(id);
  });

  it('operator PUT /:id updates a brand', async () => {
    const id = 'test-brand-operator-put';
    await operator.post('/api/brands').send({ id, name: 'Op Put', eventName: 'E' });
    createdIds.push(id);
    const res = await operator.put(`/api/brands/${id}`).send({ name: 'Op Put Updated', eventName: 'E2' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Op Put Updated');
  });

  it('operator DELETE /:id (non-default) returns 204', async () => {
    const id = 'test-brand-operator-delete';
    await operator.post('/api/brands').send({ id, name: 'Op Delete', eventName: 'E' });
    const res = await operator.delete(`/api/brands/${id}`);
    expect(res.status).toBe(204);
  });

  it('operator POST /:id/logo uploads a logo', async () => {
    const id = 'test-brand-operator-logo';
    await operator.post('/api/brands').send({ id, name: 'Op Logo', eventName: 'E' });
    createdIds.push(id);
    const res = await operator
      .post(`/api/brands/${id}/logo`)
      .attach('logo', JPEG_MAGIC, { filename: 'op.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
  });
});
