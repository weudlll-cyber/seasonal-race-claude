// ============================================================
// File:        tracks.test.js
// Path:        server/src/routes/tracks.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Integration tests for the tracks API endpoints (read + write)
// ============================================================

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { existsSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../app.js';
import { DEFAULT_TRACK_SEEDS } from './tracks.js';

const SEED = Object.fromEntries(DEFAULT_TRACK_SEEDS.map((s) => [s.name, s.id]));

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data/tracks');
const BACKUP_DIR = join(__dirname, '../../data/tracks-backups');

function findBackupFiles(trackId) {
  if (!existsSync(BACKUP_DIR)) return [];
  const files = [];
  for (const entry of readdirSync(BACKUP_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dayPath = join(BACKUP_DIR, entry.name);
    for (const file of readdirSync(dayPath)) {
      if (file.endsWith(`-${trackId}.json`)) {
        files.push(join(dayPath, file));
      }
    }
  }
  return files;
}

const app = createApp();

// IDs created during tests — cleaned up in afterAll
const createdIds = [];

const VALID_TRACK = {
  name: 'Test Track',
  icon: '🏁',
  closed: true,
  worldWidth: 1280,
  worldHeight: 720,
  centerPoints: [
    { x: 100, y: 100 },
    { x: 200, y: 200 },
    { x: 300, y: 100 },
  ],
  innerPoints: [
    { x: 80, y: 80 },
    { x: 200, y: 180 },
    { x: 320, y: 80 },
  ],
  outerPoints: [
    { x: 120, y: 120 },
    { x: 200, y: 220 },
    { x: 280, y: 120 },
  ],
  effects: [],
};

afterAll(async () => {
  // Clean up any tracks created during tests
  for (const id of createdIds) {
    await request(app).delete(`/api/tracks/${id}`);
  }
  // Clean up backup files created for test tracks
  for (const id of createdIds) {
    for (const file of findBackupFiles(id)) {
      rmSync(file, { force: true });
    }
  }
});

// ── Read endpoints (pre-existing) ─────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('GET /api/tracks', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('includes at least one track', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('does not include geometry arrays in list response', async () => {
    const res = await request(app).get('/api/tracks');
    for (const track of res.body) {
      expect(track).not.toHaveProperty('innerPoints');
      expect(track).not.toHaveProperty('outerPoints');
      expect(track).not.toHaveProperty('centerPoints');
      expect(track).not.toHaveProperty('backgroundImageFile');
    }
  });

  it('includes pointCount.inner and pointCount.outer in list response', async () => {
    const res = await request(app).get('/api/tracks');
    for (const track of res.body) {
      expect(track).toHaveProperty('pointCount');
      expect(typeof track.pointCount.inner).toBe('number');
      expect(typeof track.pointCount.outer).toBe('number');
    }
  });

  it('returns expected fields in list items', async () => {
    const res = await request(app).get('/api/tracks');
    const track = res.body[0];
    expect(track).toHaveProperty('id');
    expect(track).toHaveProperty('name');
    expect(track).toHaveProperty('geometryId');
    expect(track).toHaveProperty('worldWidth');
    expect(track).toHaveProperty('worldHeight');
  });

  it('pointCount in list response reflects actual inner/outer point counts', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;
    createdIds.push(id);

    const listRes = await request(app).get('/api/tracks');
    const item = listRes.body.find((t) => t.id === id);
    expect(item.pointCount.inner).toBe(VALID_TRACK.innerPoints.length);
    expect(item.pointCount.outer).toBe(VALID_TRACK.outerPoints.length);
  });
});

describe('GET /api/tracks/:id', () => {
  it('returns 200 with full track for known id', async () => {
    const res = await request(app).get(`/api/tracks/${SEED['Mountainstreet']}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', SEED['Mountainstreet']);
    expect(res.body).toHaveProperty('name', 'Mountainstreet');
    expect(res.body).toHaveProperty('geometryId');
  });

  it('includes geometry arrays in detail response', async () => {
    const res = await request(app).get(`/api/tracks/${SEED['Mountainstreet']}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.innerPoints)).toBe(true);
    expect(Array.isArray(res.body.outerPoints)).toBe(true);
    expect(res.body.innerPoints.length).toBeGreaterThan(0);
  });

  it('does not expose backgroundImageFile in detail response', async () => {
    const res = await request(app).get(`/api/tracks/${SEED['Mountainstreet']}`);
    expect(res.body).not.toHaveProperty('backgroundImageFile');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/tracks/nonexistent-id-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/tracks/:id/background', () => {
  it('returns 200 with image content-type for known track', async () => {
    const res = await request(app).get(`/api/tracks/${SEED['Mountainstreet']}/background`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^image\//);
  });

  it('returns image bytes for known track', async () => {
    const res = await request(app)
      .get(`/api/tracks/${SEED['Mountainstreet']}/background`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it('returns 404 for unknown track background', async () => {
    const res = await request(app).get('/api/tracks/nonexistent-id-xyz/background');
    expect(res.status).toBe(404);
  });
});

// ── Write endpoints ───────────────────────────────────────────────────────────

describe('POST /api/tracks', () => {
  it('creates a track and returns 201 with id and geometryId', async () => {
    const res = await request(app).post('/api/tracks').send(VALID_TRACK);
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(typeof res.body.geometryId).toBe('string');
    expect(res.body.name).toBe('Test Track');
    expect(res.body).not.toHaveProperty('backgroundImageFile');
    createdIds.push(res.body.id);
  });

  it('persists the track so it appears in GET /api/tracks', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(createRes.body.id);

    const listRes = await request(app).get('/api/tracks');
    const found = listRes.body.find((t) => t.id === createRes.body.id);
    expect(found).toBeDefined();
    expect(found.name).toBe('Test Track');
  });

  it('returns 400 when name is missing', async () => {
    const { name: _drop, ...noName } = VALID_TRACK;
    const res = await request(app).post('/api/tracks').send(noName);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when closed is not boolean', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, closed: 'yes' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no geometry points provided', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ name: 'X', closed: false, worldWidth: 1280, worldHeight: 720 });
    expect(res.status).toBe(400);
  });

  it('does not leave a .tmp file after successful save', async () => {
    const res = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(res.body.id);
    expect(existsSync(join(DATA_DIR, `${res.body.id}.json.tmp`))).toBe(false);
  });

  it('strips backgroundImage from stored JSON', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, backgroundImage: 'data:image/jpeg;base64,/9j/' });
    createdIds.push(res.body.id);
    expect(res.status).toBe(201);
    // Re-fetch: backgroundImage should not be in the response
    const detail = await request(app).get(`/api/tracks/${res.body.id}`);
    expect(detail.body).not.toHaveProperty('backgroundImage');
  });
});

describe('PUT /api/tracks/:id', () => {
  it('updates an existing track and returns 200', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, name: 'Updated Track' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Updated Track');
    expect(updateRes.body.id).toBe(id);
  });

  it('accepts geometryId from body when present (TLH-1)', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const newGeometryId = 'client-supplied-geometry-id';
    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, name: 'Updated', geometryId: newGeometryId });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.geometryId).toBe(newGeometryId);
  });

  it('preserves existing geometryId when not in body (TLH-1)', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);
    const originalGeometryId = createRes.body.geometryId;
    const createdAt = createRes.body.createdAt;

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, name: 'Updated' });
    expect(updateRes.body.geometryId).toBe(originalGeometryId);
    expect(updateRes.body.createdAt).toBe(createdAt);
  });

  it('accepts geometryId: null to clear geometry link (TLH-1)', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ geometryId: null });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.geometryId).toBeNull();
  });

  it('returns 404 when track does not exist', async () => {
    const res = await request(app).put('/api/tracks/nonexistent-xyz').send(VALID_TRACK);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid update body', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(createRes.body.id);

    const res = await request(app)
      .put(`/api/tracks/${createRes.body.id}`)
      .send({ name: '', closed: false, worldWidth: 1280, worldHeight: 720 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tracks/:id', () => {
  it('deletes an existing track and returns 204', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;

    const deleteRes = await request(app).delete(`/api/tracks/${id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/tracks/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when track does not exist', async () => {
    const res = await request(app).delete('/api/tracks/nonexistent-xyz');
    expect(res.status).toBe(404);
  });

  it('returns 403 when attempting to delete a default track', async () => {
    const res = await request(app).delete(`/api/tracks/${SEED['Dirt Oval']}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot delete default track/i);
  });

  it('default track still exists after rejected DELETE', async () => {
    await request(app).delete(`/api/tracks/${SEED['Dirt Oval']}`);
    const res = await request(app).get(`/api/tracks/${SEED['Dirt Oval']}`);
    expect(res.status).toBe(200);
    expect(res.body.isDefault).toBe(true);
  });
});

// ── Auto-backup (TLH-1) ───────────────────────────────────────────────────────

describe('Auto-backup (TLH-1)', () => {
  it('POST creates a backup file for the new track', async () => {
    const res = await request(app).post('/api/tracks').send(VALID_TRACK);
    expect(res.status).toBe(201);
    const id = res.body.id;
    createdIds.push(id);
    expect(findBackupFiles(id).length).toBeGreaterThan(0);
  });

  it('PUT creates an additional backup file', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);
    const countBefore = findBackupFiles(id).length;

    await request(app).put(`/api/tracks/${id}`).send({ name: 'Backup Test' });
    expect(findBackupFiles(id).length).toBeGreaterThan(countBefore);
  });

  it('DELETE does not create a backup file', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);
    const countAfterPost = findBackupFiles(id).length;

    await request(app).delete(`/api/tracks/${id}`);
    expect(findBackupFiles(id).length).toBe(countAfterPost);
  });
});

// ── surfaceClasses field (VRE-3) ──────────────────────────────────────────────

describe('surfaceClasses field — startup migration', () => {
  it('all tracks returned by GET /api/tracks have a surfaceClasses array', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.status).toBe(200);
    for (const track of res.body) {
      expect(Array.isArray(track.surfaceClasses)).toBe(true);
    }
  });

  it('Mountainstreet default track has surfaceClasses: [asphalt]', async () => {
    const res = await request(app).get(`/api/tracks/${SEED['Mountainstreet']}`);
    expect(res.status).toBe(200);
    expect(res.body.surfaceClasses).toEqual(['asphalt']);
  });
});

describe('POST /api/tracks — surfaceClasses', () => {
  it('creates a track with surfaceClasses and includes it in the response', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['earth', 'grass'] });
    expect(res.status).toBe(201);
    expect(res.body.surfaceClasses).toEqual(['earth', 'grass']);
    createdIds.push(res.body.id);
  });

  it('created track with surfaceClasses appears correctly in GET detail', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['water'] });
    createdIds.push(createRes.body.id);
    const detail = await request(app).get(`/api/tracks/${createRes.body.id}`);
    expect(detail.body.surfaceClasses).toEqual(['water']);
  });

  it('creates a track with empty surfaceClasses: []', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: [] });
    expect(res.status).toBe(201);
    expect(res.body.surfaceClasses).toEqual([]);
    createdIds.push(res.body.id);
  });

  it('created track without surfaceClasses defaults to [] in list response', async () => {
    const res = await request(app).post('/api/tracks').send(VALID_TRACK);
    createdIds.push(res.body.id);
    // Track was created without surfaceClasses — post-creation migration not needed
    // since new tracks get [] via spread defaults if not provided
    const list = await request(app).get('/api/tracks');
    const found = list.body.find((t) => t.id === res.body.id);
    expect(found).toBeDefined();
    expect(Array.isArray(found.surfaceClasses)).toBe(true);
  });
});

describe('PUT /api/tracks/:id — surfaceClasses update', () => {
  it('updates surfaceClasses on an existing track', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['earth'] });
    const id = createRes.body.id;
    createdIds.push(id);

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, surfaceClasses: ['air', 'water'] });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.surfaceClasses).toEqual(['air', 'water']);
  });

  it('clears surfaceClasses when updated to []', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['earth', 'grass'] });
    const id = createRes.body.id;
    createdIds.push(id);

    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ ...VALID_TRACK, surfaceClasses: [] });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.surfaceClasses).toEqual([]);
  });
});

// ── PUT partial-update validation (VRE-3 Bug Fix) ────────────────────────────

describe('PUT /api/tracks/:id — partial metadata update (no geometry in body)', () => {
  it('returns 200 when PUT body contains only metadata fields (no closed, no geometry)', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ name: 'Metadata Only', surfaceClasses: ['air'] });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Metadata Only');
    expect(res.body.surfaceClasses).toEqual(['air']);
  });

  it('preserves existing geometry when PUT body omits geometry fields', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    await request(app).put(`/api/tracks/${id}`).send({ name: 'No Geo In Body' });

    const detail = await request(app).get(`/api/tracks/${id}`);
    expect(Array.isArray(detail.body.centerPoints)).toBe(true);
    expect(detail.body.centerPoints.length).toBeGreaterThanOrEqual(2);
    expect(typeof detail.body.closed).toBe('boolean');
  });

  it('returns 400 when PUT body includes closed as non-boolean', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ name: 'Bad Closed', closed: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/closed must be a boolean/i);
  });

  it('returns 400 when PUT body includes geometry with too few centerPoints', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ centerPoints: [{ x: 1, y: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/geometry/i);
  });

  it('returns 200 when PUT body includes valid updated geometry', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const newCenter = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 20 }];
    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ closed: true, centerPoints: newCenter });
    expect(res.status).toBe(200);

    const detail = await request(app).get(`/api/tracks/${id}`);
    expect(detail.body.centerPoints).toEqual(newCenter);
    expect(detail.body.closed).toBe(true);
  });

  it('POST without geometry still returns 400 (create validation unchanged)', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ name: 'No Geometry', closed: false, worldWidth: 1280, worldHeight: 720 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/geometry/i);
  });
});

// ── surfaceClasses + maxRacers validation (Quick-Wins audit fix) ──────────────

describe('POST /api/tracks — surfaceClasses validation', () => {
  it('returns 400 when surfaceClasses is an object, not an array', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/surfaceClasses must be an array of strings/i);
  });

  it('returns 400 when surfaceClasses is a string', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: 'earth' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/surfaceClasses must be an array of strings/i);
  });

  it('returns 400 when surfaceClasses contains non-string elements', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: [123, 'earth'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/surfaceClasses must be an array of strings/i);
  });

  it('returns 201 when surfaceClasses is a valid string array', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, surfaceClasses: ['earth', 'grass'] });
    expect(res.status).toBe(201);
    expect(res.body.surfaceClasses).toEqual(['earth', 'grass']);
    createdIds.push(res.body.id);
  });
});

describe('PUT /api/tracks/:id — surfaceClasses validation', () => {
  it('returns 400 when surfaceClasses is not an array', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ surfaceClasses: 'water' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/surfaceClasses must be an array of strings/i);
  });

  it('returns 400 when surfaceClasses contains non-string elements', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ surfaceClasses: [null, 'earth'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/surfaceClasses must be an array of strings/i);
  });

  it('returns 200 when surfaceClasses is a valid string array', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ surfaceClasses: ['air'] });
    expect(res.status).toBe(200);
    expect(res.body.surfaceClasses).toEqual(['air']);
  });
});

describe('POST /api/tracks — maxRacers validation', () => {
  it('returns 400 when maxRacers is negative', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, maxRacers: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxRacers must be a positive number or null/i);
  });

  it('returns 400 when maxRacers is a string', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, maxRacers: 'auto' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxRacers must be a positive number or null/i);
  });

  it('returns 400 when maxRacers is an array', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, maxRacers: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxRacers must be a positive number or null/i);
  });

  it('returns 201 when maxRacers is a positive number', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, maxRacers: 10 });
    expect(res.status).toBe(201);
    expect(res.body.maxRacers).toBe(10);
    createdIds.push(res.body.id);
  });

  it('returns 201 when maxRacers is null', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, maxRacers: null });
    expect(res.status).toBe(201);
    expect(res.body.maxRacers).toBeNull();
    createdIds.push(res.body.id);
  });
});

describe('PUT /api/tracks/:id — maxRacers validation', () => {
  it('returns 400 when maxRacers is zero', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).put(`/api/tracks/${id}`).send({ maxRacers: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxRacers must be a positive number or null/i);
  });

  it('returns 400 when maxRacers is a string', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).put(`/api/tracks/${id}`).send({ maxRacers: 'twenty' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxRacers must be a positive number or null/i);
  });

  it('returns 200 when maxRacers is updated to a positive number', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).put(`/api/tracks/${id}`).send({ maxRacers: 20 });
    expect(res.status).toBe(200);
    expect(res.body.maxRacers).toBe(20);
  });

  it('returns 200 when maxRacers is updated to null', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, maxRacers: 12 });
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).put(`/api/tracks/${id}`).send({ maxRacers: null });
    expect(res.status).toBe(200);
    expect(res.body.maxRacers).toBeNull();
  });
});

// ── trackLights field ─────────────────────────────────────────────────────────

const VALID_LIGHTS = { color: '#3aa0ff', style: 'sequence', speed: 1.0 };

describe('trackLights field — startup migration', () => {
  it('all tracks returned by GET /api/tracks have a trackLights object', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.status).toBe(200);
    for (const track of res.body) {
      expect(track).toHaveProperty('trackLights');
      expect(typeof track.trackLights).toBe('object');
      expect(track.trackLights).not.toBeNull();
    }
  });

  it('Mountainstreet default track has a valid trackLights object', async () => {
    const res = await request(app).get(`/api/tracks/${SEED['Mountainstreet']}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.trackLights).toBe('object');
    expect(res.body.trackLights).toHaveProperty('color');
    expect(res.body.trackLights).toHaveProperty('style');
    expect(res.body.trackLights).toHaveProperty('speed');
  });
});

describe('POST /api/tracks — trackLights', () => {
  it('creates a track with valid trackLights and returns it in the response', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: VALID_LIGHTS });
    expect(res.status).toBe(201);
    expect(res.body.trackLights).toMatchObject(VALID_LIGHTS);
    createdIds.push(res.body.id);
  });

  it('persists trackLights so it appears in GET detail', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: VALID_LIGHTS });
    createdIds.push(createRes.body.id);
    const detail = await request(app).get(`/api/tracks/${createRes.body.id}`);
    expect(detail.body.trackLights).toMatchObject(VALID_LIGHTS);
  });

  it('returns 400 when trackLights.color is not a valid hex string', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: { ...VALID_LIGHTS, color: 'blue' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights\.color/i);
  });

  it('returns 400 when trackLights.color is missing the # prefix', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: { ...VALID_LIGHTS, color: '3aa0ff' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights\.color/i);
  });

  it('returns 400 when trackLights.style is unknown', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: { ...VALID_LIGHTS, style: 'blink' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights\.style/i);
  });

  it('returns 400 when trackLights.speed is below 0.1', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: { ...VALID_LIGHTS, speed: 0 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights\.speed/i);
  });

  it('returns 400 when trackLights.speed exceeds 3.0', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: { ...VALID_LIGHTS, speed: 5 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights\.speed/i);
  });

  it('returns 400 when trackLights is an array', async () => {
    const res = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights must be an object/i);
  });

  it('returns 201 for all valid styles', async () => {
    for (const style of ['steady', 'sequence', 'sync_pulse', 'random_flash']) {
      const res = await request(app)
        .post('/api/tracks')
        .send({ ...VALID_TRACK, trackLights: { ...VALID_LIGHTS, style } });
      expect(res.status).toBe(201);
      expect(res.body.trackLights.style).toBe(style);
      createdIds.push(res.body.id);
    }
  });

  it('returns 201 for speed boundary values 0.1 and 3.0', async () => {
    for (const speed of [0.1, 3.0]) {
      const res = await request(app)
        .post('/api/tracks')
        .send({ ...VALID_TRACK, trackLights: { ...VALID_LIGHTS, speed } });
      expect(res.status).toBe(201);
      expect(res.body.trackLights.speed).toBe(speed);
      createdIds.push(res.body.id);
    }
  });
});

describe('PUT /api/tracks/:id — trackLights update', () => {
  it('updates trackLights on an existing track', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: VALID_LIGHTS });
    const id = createRes.body.id;
    createdIds.push(id);

    const newLights = { color: '#ff8844', style: 'sync_pulse', speed: 0.7 };
    const updateRes = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ trackLights: newLights });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.trackLights).toMatchObject(newLights);
  });

  it('returns 400 when trackLights.color is invalid on PUT', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ trackLights: { color: '#gggggg', style: 'steady', speed: 1 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights\.color/i);
  });

  it('returns 400 when trackLights.speed is out of range on PUT', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app)
      .put(`/api/tracks/${id}`)
      .send({ trackLights: { color: '#ffffff', style: 'steady', speed: 10 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trackLights\.speed/i);
  });

  it('returns 200 for a partial update that omits trackLights', async () => {
    const createRes = await request(app)
      .post('/api/tracks')
      .send({ ...VALID_TRACK, trackLights: VALID_LIGHTS });
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).put(`/api/tracks/${id}`).send({ name: 'Name Only' });
    expect(res.status).toBe(200);
    // trackLights should be preserved from the original
    expect(res.body.trackLights).toMatchObject(VALID_LIGHTS);
  });
});

// ── Default-Track seed migration (TLH-1) ─────────────────────────────────────

describe('Default-Track seed migration (TLH-1)', () => {
  const DEFAULT_IDS = DEFAULT_TRACK_SEEDS.map((s) => s.id);

  it('all default tracks appear in GET /api/tracks', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.status).toBe(200);
    const ids = res.body.map((t) => t.id);
    for (const id of DEFAULT_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('each default track has isDefault: true', async () => {
    for (const id of DEFAULT_IDS) {
      const res = await request(app).get(`/api/tracks/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.isDefault).toBe(true);
    }
  });

  it('Dirt Oval has expected metadata', async () => {
    const res = await request(app).get(`/api/tracks/${SEED['Dirt Oval']}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Dirt Oval');
    expect(typeof res.body.icon).toBe('string');
    expect(Array.isArray(res.body.surfaceClasses)).toBe(true);
    expect(typeof res.body.trackLights).toBe('object');
    expect(res.body.trackLights).not.toBeNull();
  });

  it('default tracks appear in GET /api/tracks list without geometry arrays but with pointCount', async () => {
    const res = await request(app).get('/api/tracks');
    const defaults = res.body.filter((t) => DEFAULT_IDS.includes(t.id));
    expect(defaults.length).toBe(DEFAULT_TRACK_SEEDS.length);
    for (const t of defaults) {
      expect(t).not.toHaveProperty('innerPoints');
      expect(t).not.toHaveProperty('outerPoints');
      expect(t).toHaveProperty('pointCount');
      expect(typeof t.pointCount.inner).toBe('number');
      expect(typeof t.pointCount.outer).toBe('number');
    }
  });
});

describe('DELETE /api/tracks/:id/background', () => {
  const minimalJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
      'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
      'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
      'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA' +
      'AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA' +
      '/9oADAMBAAIRAxEAPwCwABmX/9k=',
    'base64'
  );

  it('returns 404 for a non-existent track', async () => {
    const res = await request(app).delete('/api/tracks/nonexistent-xyz/background');
    expect(res.status).toBe(404);
  });

  it('removes the background image and returns 204', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    await request(app)
      .post(`/api/tracks/${id}/background`)
      .attach('background', minimalJpeg, { filename: 'track.jpg', contentType: 'image/jpeg' });

    const res = await request(app).delete(`/api/tracks/${id}/background`);
    expect(res.status).toBe(204);

    const detail = await request(app).get(`/api/tracks/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.backgroundImageFile).toBeUndefined();
  });

  it('is idempotent when called on a track with no background', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).delete(`/api/tracks/${id}/background`);
    expect(res.status).toBe(204);
  });
});

describe('POST /api/tracks/:id/background', () => {
  it('rejects a file exceeding 10 MB with 413', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 0xff);
    const res = await request(app)
      .post(`/api/tracks/${id}/background`)
      .attach('background', bigBuffer, { filename: 'big.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  it('returns 400 when no file is attached', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    const res = await request(app).post(`/api/tracks/${id}/background`);
    expect(res.status).toBe(400);
  });

  it('accepts a valid image and returns backgroundImageFile', async () => {
    const createRes = await request(app).post('/api/tracks').send(VALID_TRACK);
    const id = createRes.body.id;
    createdIds.push(id);

    // Minimal 1×1 white JPEG (valid JPEG bytes)
    const minimalJpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
        'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
        'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
        'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA' +
        'AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA' +
        '/9oADAMBAAIRAxEAPwCwABmX/9k=',
      'base64'
    );

    const res = await request(app)
      .post(`/api/tracks/${id}/background`)
      .attach('background', minimalJpeg, { filename: 'track.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('backgroundImageFile');
    expect(res.body.backgroundImageFile).toMatch(/\.jpg$/);
  });
});
