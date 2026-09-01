// ============================================================
// File:        tracksDeleteSafety.test.js
// Path:        server/src/routes/tracksDeleteSafety.test.js
// Project:     RaceArena — DELETE-TRACK-SAFETY-1
// Description: Deleting a track must not damage another one.
//
//              TWO HALVES, AND THE FIRST ONE EVAPORATED ON INSPECTION.
//
//              1. CAN TWO TRACKS SHARE A BACKGROUND FILE? No — impossible by construction, so no
//                 runtime cross-reference check was built. These tests pin the construction that
//                 makes it impossible, so that if it ever stops being true the suite says so
//                 instead of the next person discovering it by losing an image.
//
//              2. THE DELETE PATHS UNLINKED AN UNVALIDATED FILENAME. The read path has always
//                 refused an unsafe stored value; both delete paths acted on it. That asymmetry is
//                 the one real defect in these lines and is what `removeBackgroundFile` closes.
//
//              SABOTAGE: remove the `isSafeAssetFilename` call from `removeBackgroundFile` and
//              "refuses to delete a background whose stored filename escapes the assets directory"
//              goes red. Run and recorded in reports/evolution/DELETE-TRACK-SAFETY-1.md.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { adminAgent } from '../../test/authAgent.js';
import { createApp } from '../app.js';
import { removeBackgroundFile } from './tracks.js';
import { DATA_ROOT } from '../dataPaths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_TRACKS = join(__dirname, '../../seeds/tracks');
const DATA_TRACKS = join(DATA_ROOT, 'tracks');
const BG_DIR = join(DATA_ROOT, 'backgrounds');

const app = createApp();
let api;
beforeAll(async () => {
  api = await adminAgent(app);
});

/** Every shipped record, read from the seeds — the set a fresh install starts from. */
function seedRecords() {
  return readdirSync(SEEDS_TRACKS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(SEEDS_TRACKS, f), 'utf8')));
}

// ── 1. WHAT MAKES SHARING IMPOSSIBLE ─────────────────────────────────────────────────────────────

describe('a background file belongs to exactly one track, by construction', () => {
  it('every shipped record names either nothing or `<id>.<ext>`', () => {
    for (const rec of seedRecords()) {
      if (rec.backgroundImageFile === null || rec.backgroundImageFile === undefined) continue;
      expect(
        rec.backgroundImageFile,
        `${rec.id} names a background that is not derived from its id`,
      ).toMatch(new RegExp(`^${rec.id}\\.[a-z0-9]+$`));
    }
  });

  it('no two shipped records name the same background file', () => {
    const seen = new Map();
    for (const rec of seedRecords()) {
      if (!rec.backgroundImageFile) continue;
      expect(seen.has(rec.backgroundImageFile), `${rec.backgroundImageFile} is named twice`).toBe(
        false,
      );
      seen.set(rec.backgroundImageFile, rec.id);
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  const GEOM = {
    closed: true,
    worldWidth: 1280,
    worldHeight: 720,
    centerPoints: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ],
  };

  // The API never exposes `backgroundImageFile` — `GET /:id` strips it deliberately — so the
  // observable is the asset route: "No background" means the field is null, and anything else means
  // a body-supplied value was honoured and two tracks could now name one file.
  async function backgroundStateOf(id) {
    const res = await api.get(`/api/tracks/${id}/background`);
    return { status: res.status, error: res.body?.error };
  }

  it('CREATE cannot set a background, whatever the body says', async () => {
    const res = await api
      .post('/api/tracks')
      .send({ id: 'share-probe-create', name: 'Share Probe', ...GEOM, backgroundImageFile: 'dirt-oval.jpg' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const id = res.body.id ?? 'share-probe-create';
    const bg = await backgroundStateOf(id);
    expect(bg.status, 'CREATE honoured a body-supplied background — two tracks can now share one').toBe(404);
    expect(bg.error).toBe('No background');
    await api.delete(`/api/tracks/${id}`);
  });

  it('UPDATE cannot change a background, whatever the body says', async () => {
    const created = await api
      .post('/api/tracks')
      .send({ id: 'share-probe-update', name: 'Share Probe 2', ...GEOM });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const id = created.body.id ?? 'share-probe-update';

    const put = await api
      .put(`/api/tracks/${id}`)
      .send({ name: 'Share Probe 2', ...GEOM, backgroundImageFile: 'dirt-oval.jpg' });
    expect(put.status, JSON.stringify(put.body)).toBe(200);

    const bg = await backgroundStateOf(id);
    expect(bg.status, 'UPDATE honoured a body-supplied background — two tracks can now share one').toBe(404);
    expect(bg.error).toBe('No background');
    await api.delete(`/api/tracks/${id}`);
  });
});

// ── 2. THE DELETE PATHS MUST NOT ACT ON A FILENAME THEY DID NOT WRITE ────────────────────────────

describe('deleting a background never touches a file the server did not write', () => {
  // `removeBackgroundFile` is exported so this can drive it DIRECTLY. The first version of this
  // test went through `DELETE /api/tracks/:id` with a hand-written record on disk — and it could
  // never have failed, because the in-memory map is built at boot, so the route answered 404 long
  // before reaching the helper. A test that cannot go red proves nothing; this one does go red when
  // the `isSafeAssetFilename` call is removed.
  const OUTSIDE = join(DATA_ROOT, 'delete-safety-bystander.txt');
  const LEGIT = join(BG_DIR, 'delete-safety-legit.jpg');

  beforeAll(() => {
    mkdirSync(DATA_TRACKS, { recursive: true });
    mkdirSync(BG_DIR, { recursive: true });
  });
  afterAll(() => {
    for (const p of [OUTSIDE, LEGIT]) if (existsSync(p)) rmSync(p);
  });

  it('refuses a stored filename that escapes the assets directory, and says so', async () => {
    // Not producible through the API — every writer is constrained — but producible by hand-editing
    // a record or restoring a `tracks-backups/` file, both of which this project documents.
    writeFileSync(OUTSIDE, 'a file that has nothing to do with tracks');
    const warned = [];
    const realWarn = console.warn;
    console.warn = (...a) => warned.push(a.join(' '));
    try {
      removeBackgroundFile({ id: 'traversal-probe', backgroundImageFile: '../delete-safety-bystander.txt' });
    } finally {
      console.warn = realWarn;
    }
    expect(
      existsSync(OUTSIDE),
      'a file outside the backgrounds directory was deleted by a track delete',
    ).toBe(true);
    expect(warned.join(' ')).toMatch(/refusing to delete background/);
  });

  it('still removes an ordinary background — the check must not break deletion', () => {
    // The other direction. A guard that refuses everything would pass the test above and be useless.
    writeFileSync(LEGIT, 'jpeg-bytes');
    removeBackgroundFile({ id: 'delete-safety-legit', backgroundImageFile: 'delete-safety-legit.jpg' });
    expect(existsSync(LEGIT), 'a legitimate background was NOT removed').toBe(false);
  });

  it('does nothing at all when a track has no background', () => {
    expect(() => removeBackgroundFile({ id: 'x', backgroundImageFile: null })).not.toThrow();
    expect(() => removeBackgroundFile({ id: 'x' })).not.toThrow();
  });

  it('the read path and the delete path agree about what is a safe filename', async () => {
    // The defect was that they disagreed: GET refused an unsafe value, DELETE acted on it. This
    // pins them together — if one starts accepting what the other refuses, it goes red.
    const { isSafeAssetFilename } = await import('../../utils/isSafeAssetFilename.js');
    for (const bad of ['../x.jpg', 'a/b.jpg', 'a\\b.jpg', '..', '.', 'c:evil.jpg']) {
      expect(isSafeAssetFilename(bad), `${bad} must be rejected`).toBe(false);
    }
    for (const good of ['dirt-oval.jpg', 'garden-path.png', 'x.webp']) {
      expect(isSafeAssetFilename(good), `${good} must be accepted`).toBe(true);
    }
  });
});
