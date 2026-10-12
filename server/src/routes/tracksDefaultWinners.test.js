// ============================================================
// File:        tracksDefaultWinners.test.js
// Path:        server/src/routes/tracksDefaultWinners.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A2-14)
// Description: A new track is created WITHOUT `defaultWinners` (nothing has read it since
//              2026-10-06); a stored track that carries it — every shipped seed does, and the seeds
//              stay byte-identical so no installation is redelivered — keeps loading and keeps it
//              across a re-save.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { adminAgent } from '../../test/authAgent.js';
import { DATA_ROOT } from '../dataPaths.js';

const SEEDS_DIR = fileURLToPath(new URL('../../seeds/tracks/', import.meta.url));
const app = createApp();
let api;
const created = [];
beforeAll(async () => {
  api = await adminAgent(app);
});
afterAll(async () => {
  for (const id of created) await api.delete(`/api/tracks/${id}`).catch(() => {});
});

const NEW_TRACK = {
  name: 'Winners-free',
  closed: false,
  worldWidth: 1280,
  worldHeight: 720,
  centerPoints: [
    { x: 100, y: 100 },
    { x: 600, y: 300 },
  ],
};

describe('defaultWinners (A2-14)', () => {
  it('a NEW track is written without it — neither in the answer nor in the stored file', async () => {
    const res = await api.post('/api/tracks').send(NEW_TRACK);
    expect(res.status).toBe(201);
    created.push(res.body.id);
    expect(res.body).not.toHaveProperty('defaultWinners');
    const stored = JSON.parse(
      readFileSync(join(DATA_ROOT, 'tracks', `${res.body.id}.json`), 'utf8')
    );
    expect(stored).not.toHaveProperty('defaultWinners');
    // the other defaults are untouched
    expect(stored).toMatchObject({ defaultLaps: 2, defaultDurationSec: 60, surfaceClasses: [] });
  });

  it('every shipped seed still carries it (the seeds are not edited)', () => {
    const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(10);
    for (const f of files) {
      expect(JSON.parse(readFileSync(join(SEEDS_DIR, f), 'utf8')).defaultWinners).toBe(3);
    }
  });

  it('a stored track that has it loads with it and keeps it when re-saved as read', async () => {
    const before = await api.get('/api/tracks/dirt-oval');
    expect(before.status).toBe(200);
    expect(before.body.defaultWinners).toBe(3);
    const put = await api.put('/api/tracks/dirt-oval').send(before.body);
    expect(put.status).toBe(200);
    expect(put.body.defaultWinners).toBe(3);
  });
});
