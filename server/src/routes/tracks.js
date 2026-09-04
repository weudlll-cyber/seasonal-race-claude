// ============================================================
// File:        tracks.js
// Path:        server/src/routes/tracks.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Track API routes — CRUD + background upload
// ============================================================

import express from 'express';
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  createReadStream,
} from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';
import { detectMagicType, IMAGE_MIME, MAX_IMAGE_BYTES, createUpload } from '../../utils/imageUpload.js';
import { attachPromoteExport } from './_defaultPromote.js';
import { DATA_ROOT } from '../dataPaths.js';
import { seedTypeFromSnapshot, readSeedType } from '../seedRuntime.js';
import { deliverSeedsOnce } from '../seedDelivery.js';
import { isSafeAssetFilename } from '../../utils/isSafeAssetFilename.js';

const DATA_DIR = join(DATA_ROOT, 'tracks');
const BG_DIR = join(DATA_ROOT, 'backgrounds');
const BACKUP_DIR = join(DATA_ROOT, 'tracks-backups');
const DEFAULT_TRACKS_MARKER = join(DATA_ROOT, '.tlh1-defaults-migrated');

// multer — memory storage, 10 MB limit, MIME pre-filter.
// Magic-byte validation in the route handler is the authoritative check (C4).
const upload = createUpload({ maxBytes: MAX_IMAGE_BYTES });

// Load all tracks into memory at startup.
function loadAllTracks() {
  const map = new Map();
  if (!existsSync(DATA_DIR)) return map;
  for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const track = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      map.set(track.id, track);
    } catch {
      console.warn(`[tracks] Failed to load ${file}`);
    }
  }
  return map;
}

// Copy missing default snapshots before building the in-memory map so loadAllTracks()
// reads the rich committed files on a fresh DATA_ROOT.
migrateDefaultTracks();
const tracksMap = loadAllTracks();

// The ten built-in default tracks — READ FROM THE SEEDS, never restated (TRACK-SEEDS-ONE-HOME-1).
//
// THIS WAS A LITERAL COPY OF ALL TEN, and it had drifted. Of 140 comparable values 32 disagreed
// with `server/seeds/tracks/*.json`, which is the source of truth: `garden-path` still said
// `snail` and `defaultLaps: 4` — the exact pairing FINGERPRINT-TRACK-DEFAULTS-1 repaired on
// 2026-09-02 at a different home, which never reached this one — and `city-circuit` still said
// `buggy`, stale since 2026-06-30.
//
// WHY THAT MATTERED, and it is not the `snail`. Nothing reads `defaultRacerTypeId` here. What IS
// read is `surfaceClasses` and `trackLights`, by the two startup migrations below, and SEVEN of the
// thirty-two disagreements were in those two fields — `dirt-oval` short three surface classes,
// `ice-track` short `air`, `garden-path` short `mud` and `sand`, and four tracks' light styles.
// Those migrations repair a stored record that LACKS the field, so a hand-edited record, a partial
// restore or a future seed that omits one would have been patched with the stale value and written
// to disk — and `surfaceClasses` decides which racer types may run a track. INERT TODAY (all ten
// delivered seeds carry both fields, so both migrations `continue`) is not the same claim as
// CANNOT MATTER, and only the first was ever true.
//
// GEOMETRY IS STRIPPED, keeping this export's meaning exactly what it was: metadata only. The
// points are drawn by the user in the Track Editor, `tracksMap` already holds them, and a second
// in-memory copy of 324 KB of geometry would buy nothing.
export const DEFAULT_TRACK_SEEDS = readSeedType('tracks').map(
  ({ innerPoints, outerPoints, centerPoints, ...rest }) => rest
);

// Lookup maps derived from seeds — used by startup migrations to patch tracks written
// before these fields existed.
const SEED_SURFACE_CLASSES = Object.fromEntries(
  DEFAULT_TRACK_SEEDS.map((s) => [s.id, s.surfaceClasses])
);
const SEED_TRACK_LIGHTS = Object.fromEntries(
  DEFAULT_TRACK_SEEDS.map((s) => [s.id, s.trackLights])
);

const CUSTOM_TRACK_LIGHTS_DEFAULT = { color: '#ffffff', style: 'sequence', speed: 1.0 };

const VALID_LIGHT_STYLES = ['steady', 'sequence', 'sync_pulse', 'random_flash'];

function isValidHexColor(c) {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
}

function validateTrackLights(lights) {
  if (typeof lights !== 'object' || lights === null || Array.isArray(lights)) {
    return 'trackLights must be an object';
  }
  if ('color' in lights && !isValidHexColor(lights.color)) {
    return 'trackLights.color must be a valid #RRGGBB hex string';
  }
  if ('style' in lights && !VALID_LIGHT_STYLES.includes(lights.style)) {
    return `trackLights.style must be one of: ${VALID_LIGHT_STYLES.join(', ')}`;
  }
  if (
    'speed' in lights &&
    (typeof lights.speed !== 'number' || lights.speed < 0.1 || lights.speed > 3.0)
  ) {
    return 'trackLights.speed must be a number between 0.1 and 3.0';
  }
  return null;
}

// ── Input-validation bounds (SEC-C1 / SEC-C2 / SEC-H4) ───────────────────────

// Highest effect-count slider max across all shipped effects is 500 (dust,
// fireflies, rain, stars). Cap at 2× that to allow future effects headroom.
const EFFECT_COUNT_MAX = 1000;

// Track-editor MAX_BG_W = 8000, MAX_BG_H = 4096. Add 25 % margin.
const COORD_BOUND = 10000;

// Longest existing default track name is 14 chars ("Mountainstreet"). 100 is
// generous while blocking megabyte-length strings.
const TRACK_NAME_MAX = 100;

function isFiniteCoord(v) {
  return typeof v === 'number' && isFinite(v) && Math.abs(v) <= COORD_BOUND;
}

// Accepts both {x, y} objects (what the track editor sends) and [x, y] arrays.
function isValidPoint(p) {
  if (Array.isArray(p)) {
    return p.length === 2 && isFiniteCoord(p[0]) && isFiniteCoord(p[1]);
  }
  if (p !== null && typeof p === 'object') {
    return isFiniteCoord(p.x) && isFiniteCoord(p.y);
  }
  return false;
}

// Returns an error string if any point in the array is malformed, otherwise null.
function validatePoints(points, fieldName) {
  for (let i = 0; i < points.length; i++) {
    if (!isValidPoint(points[i])) {
      return `${fieldName}[${i}] must be a {x,y} object or [x,y] array with finite coordinates (|coord| ≤ ${COORD_BOUND})`;
    }
  }
  return null;
}

// Returns an error string if any effect config violates limits, otherwise null.
function validateEffects(effects) {
  if (!Array.isArray(effects)) return 'effects must be an array';
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    if (!e || typeof e !== 'object' || Array.isArray(e)) {
      return `effects[${i}] must be an object`;
    }
    if (e.config !== undefined) {
      if (typeof e.config !== 'object' || e.config === null || Array.isArray(e.config)) {
        return `effects[${i}].config must be a non-array object`;
      }
      if ('count' in e.config) {
        const c = e.config.count;
        if (
          typeof c !== 'number' ||
          !isFinite(c) ||
          !Number.isInteger(c) ||
          c < 0 ||
          c > EFFECT_COUNT_MAX
        ) {
          return `effects[${i}].config.count must be an integer between 0 and ${EFFECT_COUNT_MAX}`;
        }
      }
    }
  }
  return null;
}

// On startup: patch any stored track that lacks surfaceClasses.
// Idempotent — only mutates tracks where the field is missing.
function migrateTrackSurfaceClasses() {
  for (const [id, track] of tracksMap.entries()) {
    if (Array.isArray(track.surfaceClasses)) continue;
    const classes = SEED_SURFACE_CLASSES[id] ?? [];
    const patched = { ...track, surfaceClasses: classes };
    atomicWriteJson(join(DATA_DIR, `${id}.json`), patched);
    tracksMap.set(id, patched);
  }
}

migrateTrackSurfaceClasses();

// On startup: patch any stored track that lacks trackLights.
// Idempotent — only mutates tracks where the field is missing or not an object.
function migrateTrackLights() {
  for (const [id, track] of tracksMap.entries()) {
    if (track.trackLights && typeof track.trackLights === 'object' && !Array.isArray(track.trackLights)) {
      continue;
    }
    const lights = SEED_TRACK_LIGHTS[id] ?? CUSTOM_TRACK_LIGHTS_DEFAULT;
    const patched = { ...track, trackLights: lights };
    atomicWriteJson(join(DATA_DIR, `${id}.json`), patched);
    tracksMap.set(id, patched);
  }
}

migrateTrackLights();

// Strip geometry arrays from list response; expose compact pointCount for display.
function toSummary({ innerPoints, outerPoints, centerPoints, backgroundImageFile, ...rest }) {
  return {
    ...rest,
    pointCount: {
      inner: (innerPoints || []).length,
      outer: (outerPoints || []).length,
    },
  };
}

function generateId() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

function generateGeometryId() {
  return `custom-${randomUUID()}`;
}

// Write a timestamped backup of a track record. Called after every POST/PUT write.
// Failures are non-fatal — a backup miss must never prevent the primary save.
function writeTrackBackup(trackId, trackData) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toISOString().slice(11, 23).replace(/[:.]/g, '-'); // HH-MM-SS-mmm
    const dayDir = join(BACKUP_DIR, dateStr);
    if (!existsSync(dayDir)) mkdirSync(dayDir, { recursive: true });
    atomicWriteJson(join(dayDir, `${timeStr}-${trackId}.json`), trackData);
  } catch (err) {
    console.warn(`[RaceArena] Backup write failed for ${trackId}: ${err.message}`);
  }
}

/**
 * Remove a track's background image — and ONLY if the stored filename is one this server could
 * have written.
 *
 * DELETE-TRACK-SAFETY-1. The READ path has always refused an unsafe stored value
 * (`GET /:id/background` calls `isSafeAssetFilename` before serving), while BOTH delete paths
 * unlinked it unchecked. That asymmetry runs the wrong way: a corrupt or crafted value was refused
 * where it would merely be SERVED and acted on where it would be DESTROYED.
 *
 * NOT REACHABLE THROUGH THE API, which is why this is a guard rather than a live bug: every writer
 * of `backgroundImageFile` is constrained — POST hardcodes `null`, PUT re-pins the existing value,
 * and the upload route derives `<track.id>.<ext>` from an id `isValidId` restricts to
 * `^[a-z0-9_-]+$`. It IS reachable through an operation this project documents: editing a record
 * under `server/data/tracks/` by hand, or restoring one of the `tracks-backups/` files — which
 * TRACK-BACKUPS-TRUTH-1 established is a manual copy with no schema check anywhere in it.
 *
 * On an unsafe value the file is LEFT ALONE and the operator is told. A stray image is the lesser
 * harm by a wide margin, and doing it silently would be the same defect one level down.
 */
export function removeBackgroundFile(track) {
  const name = track.backgroundImageFile;
  if (!name) return;
  if (!isSafeAssetFilename(name)) {
    console.warn(
      `[tracks] refusing to delete background for "${track.id}": stored filename ${JSON.stringify(name)} ` +
        'is not a plain filename this server could have written. The file was left in place.',
    );
    return;
  }
  const bgPath = join(BG_DIR, name);
  if (existsSync(bgPath)) unlinkSync(bgPath);
}

// Copy committed snapshot files (server/seeds/) into DATA_ROOT on first boot.
// Runs before loadAllTracks() so the map sees the rich seed files immediately.
function migrateDefaultTracks() {
  // SEED-REDELIVERY-1: versioned delivery runs FIRST, so a redelivered record is on disk before
  // loadAllTracks() builds the map. seedTypeFromSnapshot below still covers any seed file the
  // manifest does not name — check-seed-versions.mjs makes sure there is none.
  deliverSeedsOnce();
  seedTypeFromSnapshot('tracks');
  seedTypeFromSnapshot('backgrounds');
  // Legacy marker — no behavior gating; kept for operational reference only.
  if (!existsSync(DEFAULT_TRACKS_MARKER)) {
    writeFileSync(DEFAULT_TRACKS_MARKER, new Date().toISOString(), 'utf8');
  }
}

/**
 * Validate required fields for track CREATE (POST).
 * All structural and geometry fields are mandatory.
 * @returns {string[]} array of error messages, empty if valid
 */
function validateTrackBodyForCreate(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required');
  } else if (body.name.length > TRACK_NAME_MAX) {
    errors.push(`name must be ${TRACK_NAME_MAX} characters or fewer`);
  }
  if (typeof body.closed !== 'boolean') {
    errors.push('closed must be a boolean');
  }
  if (typeof body.worldWidth !== 'number' || typeof body.worldHeight !== 'number') {
    errors.push('worldWidth and worldHeight must be numbers');
  }
  const hasCenter =
    Array.isArray(body.centerPoints) && body.centerPoints.length >= 2;
  const hasInnerOuter =
    Array.isArray(body.innerPoints) &&
    body.innerPoints.length >= 2 &&
    Array.isArray(body.outerPoints) &&
    body.outerPoints.length >= 2;
  if (!hasCenter && !hasInnerOuter) {
    errors.push('geometry requires centerPoints (≥2) or innerPoints+outerPoints (each ≥2)');
  } else {
    for (const [arr, field] of [
      [body.centerPoints, 'centerPoints'],
      [body.innerPoints, 'innerPoints'],
      [body.outerPoints, 'outerPoints'],
    ]) {
      if (Array.isArray(arr)) {
        const err = validatePoints(arr, field);
        if (err) errors.push(err);
      }
    }
  }
  if ('surfaceClasses' in body) {
    if (!Array.isArray(body.surfaceClasses) || !body.surfaceClasses.every((c) => typeof c === 'string')) {
      errors.push('surfaceClasses must be an array of strings');
    }
  }
  if ('maxRacers' in body) {
    if (body.maxRacers !== null && (typeof body.maxRacers !== 'number' || body.maxRacers <= 0)) {
      errors.push('maxRacers must be a positive number or null');
    }
  }
  if ('trackLights' in body) {
    const err = validateTrackLights(body.trackLights);
    if (err) errors.push(err);
  }
  if ('effects' in body) {
    const err = validateEffects(body.effects);
    if (err) errors.push(err);
  }
  return errors;
}

/**
 * Validate fields for track UPDATE (PUT).
 * Only validates fields actually present in the body — omitted fields are
 * merged from the existing track, so they do not need to be re-sent.
 * Geometry is optional: if any geometry key is present it must be complete.
 * @returns {string[]} array of error messages, empty if valid
 */
function validateTrackBodyForUpdate(body) {
  const errors = [];
  if ('name' in body) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      errors.push('name is required');
    } else if (body.name.length > TRACK_NAME_MAX) {
      errors.push(`name must be ${TRACK_NAME_MAX} characters or fewer`);
    }
  }
  if ('closed' in body && typeof body.closed !== 'boolean') {
    errors.push('closed must be a boolean');
  }
  if ('worldWidth' in body && typeof body.worldWidth !== 'number') {
    errors.push('worldWidth must be a number');
  }
  if ('worldHeight' in body && typeof body.worldHeight !== 'number') {
    errors.push('worldHeight must be a number');
  }
  const hasAnyGeometry = 'centerPoints' in body || 'innerPoints' in body || 'outerPoints' in body;
  if (hasAnyGeometry) {
    const hasCenter = Array.isArray(body.centerPoints) && body.centerPoints.length >= 2;
    const hasInnerOuter =
      Array.isArray(body.innerPoints) &&
      body.innerPoints.length >= 2 &&
      Array.isArray(body.outerPoints) &&
      body.outerPoints.length >= 2;
    if (!hasCenter && !hasInnerOuter) {
      errors.push('geometry requires centerPoints (≥2) or innerPoints+outerPoints (each ≥2)');
    } else {
      for (const [arr, field] of [
        [body.centerPoints, 'centerPoints'],
        [body.innerPoints, 'innerPoints'],
        [body.outerPoints, 'outerPoints'],
      ]) {
        if (Array.isArray(arr)) {
          const err = validatePoints(arr, field);
          if (err) errors.push(err);
        }
      }
    }
  }
  if ('geometryId' in body) {
    if (body.geometryId !== null && typeof body.geometryId !== 'string') {
      errors.push('geometryId must be a string or null');
    }
  }
  if ('surfaceClasses' in body) {
    if (!Array.isArray(body.surfaceClasses) || !body.surfaceClasses.every((c) => typeof c === 'string')) {
      errors.push('surfaceClasses must be an array of strings');
    }
  }
  if ('maxRacers' in body) {
    if (body.maxRacers !== null && (typeof body.maxRacers !== 'number' || body.maxRacers <= 0)) {
      errors.push('maxRacers must be a positive number or null');
    }
  }
  if ('trackLights' in body) {
    const err = validateTrackLights(body.trackLights);
    if (err) errors.push(err);
  }
  if ('effects' in body) {
    const err = validateEffects(body.effects);
    if (err) errors.push(err);
  }
  return errors;
}

const router = express.Router();

// ── Read ──────────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  res.json([...tracksMap.values()].map(toSummary));
});

router.get('/:id', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  const { backgroundImageFile, ...trackData } = track;
  res.json(trackData);
});

router.get('/:id/background', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!track.backgroundImageFile) return res.status(404).json({ error: 'No background' });
  if (!isSafeAssetFilename(track.backgroundImageFile)) return res.status(404).json({ error: 'Background file missing' });

  const bgPath = join(BG_DIR, track.backgroundImageFile);
  if (!existsSync(bgPath)) return res.status(404).json({ error: 'Background file missing' });

  const ext = extname(track.backgroundImageFile).slice(1).toLowerCase();
  res.setHeader('Content-Type', IMAGE_MIME[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const stream = createReadStream(bgPath);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to read background' });
  });
  stream.pipe(res);
});

// ── Write ─────────────────────────────────────────────────────────────────────

// POST /api/tracks — create a new track
router.post('/', (req, res) => {
  const errors = validateTrackBodyForCreate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const id = generateId();
  const geometryId = req.body.geometryId || generateGeometryId();
  const now = new Date().toISOString();

  const { backgroundImage, ...rest } = req.body;
  const track = {
    // Sensible defaults — overridden by anything in req.body
    icon: '🏁',
    description: '',
    defaultRacerTypeId: 'horse',
    color: '#e63946',
    // Canonical race-length defaults. A custom track's topology is not known here, so both
    // are seeded: closed geometries read defaultLaps, open ones defaultDurationSec.
    defaultLaps: 2,
    defaultDurationSec: 60,
    defaultWinners: 3,
    surfaceClasses: [],
    trackLights: CUSTOM_TRACK_LIGHTS_DEFAULT,
    ...rest,
    id,
    geometryId,
    isDefault: false,
    backgroundImageFile: null,
    createdAt: req.body.createdAt || now,
    updatedAt: now,
  };

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  atomicWriteJson(join(DATA_DIR, `${id}.json`), track);
  tracksMap.set(id, track);
  writeTrackBackup(id, track);

  const { backgroundImageFile: _drop, ...responseTrack } = track;
  res.status(201).json(responseTrack);
});

// PUT /api/tracks/:id — update an existing track
router.put('/:id', (req, res) => {
  const existing = tracksMap.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Track not found' });

  const errors = validateTrackBodyForUpdate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const { backgroundImage, ...rest } = req.body;
  const track = {
    ...existing,
    ...rest,
    id: existing.id,
    geometryId: 'geometryId' in rest ? rest.geometryId : existing.geometryId,
    isDefault: existing.isDefault,
    backgroundImageFile: existing.backgroundImageFile,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  atomicWriteJson(join(DATA_DIR, `${existing.id}.json`), track);
  tracksMap.set(existing.id, track);
  writeTrackBackup(existing.id, track);

  const { backgroundImageFile: _drop, ...responseTrack } = track;
  res.json(responseTrack);
});

// DELETE /api/tracks/:id
router.delete('/:id', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (track.isDefault) {
    return res.status(403).json({
      error:
        'Cannot delete default track. Default tracks can be modified (geometry, background, metadata) but not deleted.',
    });
  }

  const jsonPath = join(DATA_DIR, `${track.id}.json`);
  if (existsSync(jsonPath)) unlinkSync(jsonPath);

  removeBackgroundFile(track);

  tracksMap.delete(track.id);
  res.status(204).send();
});

// DELETE /api/tracks/:id/background — remove background image from a track
router.delete('/:id/background', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  removeBackgroundFile(track);

  const updatedTrack = { ...track, backgroundImageFile: null, updatedAt: new Date().toISOString() };
  atomicWriteJson(join(DATA_DIR, `${track.id}.json`), updatedTrack);
  tracksMap.set(track.id, updatedTrack);
  writeTrackBackup(track.id, updatedTrack);

  res.status(204).send();
});

// POST /api/tracks/:id/background — upload background image (multipart/form-data)
router.post('/:id/background', (req, res, next) => {
  upload.single('background')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: `File too large. Maximum ${MAX_IMAGE_BYTES / 1024 / 1024} MB allowed.` });
      }
      if (err.code === 'INVALID_TYPE') {
        return res.status(400).json({ error: 'File type not allowed. Upload PNG, JPEG, or WebP only.' });
      }
      return res.status(400).json({ error: 'File upload failed.' });
    }
    next();
  });
}, (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: background)' });

  // Verify actual file content against magic bytes — ignores the client-supplied
  // Content-Type header so a polyglot file with a valid image MIME is still caught.
  const detectedType = detectMagicType(req.file.buffer);
  if (!detectedType) {
    return res.status(400).json({ error: 'File type not allowed. Upload PNG, JPEG, or WebP only.' });
  }

  const ext = detectedType === 'image/png' ? 'png' : detectedType === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${track.id}.${ext}`;
  const bgPath = join(BG_DIR, filename);

  if (!existsSync(BG_DIR)) mkdirSync(BG_DIR, { recursive: true });

  // Delete old background file if it had a different name (e.g. jpg → png swap)
  if (track.backgroundImageFile && track.backgroundImageFile !== filename) {
    const oldPath = join(BG_DIR, track.backgroundImageFile);
    if (existsSync(oldPath)) unlinkSync(oldPath);
  }

  writeFileSync(bgPath, req.file.buffer);

  const updatedTrack = {
    ...track,
    backgroundImageFile: filename,
    updatedAt: new Date().toISOString(),
  };
  atomicWriteJson(join(DATA_DIR, `${track.id}.json`), updatedTrack);
  tracksMap.set(track.id, updatedTrack);
  writeTrackBackup(track.id, updatedTrack);

  res.json({ backgroundImageFile: filename });
});

// ── Admin: promote / demote / export-seed ────────────────────────────────────
// Guarded admin-only via ROUTE_POLICY in guards.js (the CRUD + background routes above are operator+).

attachPromoteExport(router, {
  getRecord: (id) => tracksMap.get(id),
  saveRecord: (record) => {
    atomicWriteJson(join(DATA_DIR, `${record.id}.json`), record);
    tracksMap.set(record.id, record);
  },
  exportSeed: (_req, res, record) => {
    const seed = { ...record };
    if (record.backgroundImageFile) {
      seed._backgroundAssetRelPath = `server/data/backgrounds/${record.backgroundImageFile}`;
    }
    res.json(seed);
  },
});

export default router;
