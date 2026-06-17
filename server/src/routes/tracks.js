// ============================================================
// File:        tracks.js
// Path:        server/src/routes/tracks.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Track API routes — CRUD + background upload
// ============================================================

import express from 'express';
import multer from 'multer';
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
import { attachPromoteExport } from './_defaultPromote.js';
import { DATA_ROOT } from '../dataPaths.js';
import { seedTypeFromSnapshot } from '../seedRuntime.js';
import { isSafeAssetFilename } from '../../utils/isSafeAssetFilename.js';

const DATA_DIR = join(DATA_ROOT, 'tracks');
const BG_DIR = join(DATA_ROOT, 'backgrounds');
const BACKUP_DIR = join(DATA_ROOT, 'tracks-backups');
const DEFAULT_TRACKS_MARKER = join(DATA_ROOT, '.tlh1-defaults-migrated');

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const MAX_BG_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Upload content validation (C4) ───────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Detect image type from magic bytes — ignores the user-supplied Content-Type header.
// Returns the detected MIME type string, or null if the content is not a recognized image.
export function detectMagicType(buf) {
  if (!buf || buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  return null;
}

// multer — memory storage, 10 MB limit.
// fileFilter rejects obviously non-image MIME types before buffering as a first guard.
// Magic-byte validation in the route handler is the authoritative check.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BG_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('INVALID_TYPE'), { code: 'INVALID_TYPE' }));
    }
  },
});

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

// Metadata for the 10 built-in default tracks — kept for SEED_SURFACE_CLASSES /
// SEED_TRACK_LIGHTS lookup maps and external callers (tracks.test.js).
// Geometry fields are intentionally empty: they are drawn by the user via the Track Editor.
export const DEFAULT_TRACK_SEEDS = [
  {
    id: 'dirt-oval',
    name: 'Dirt Oval',
    icon: '🐴',
    description: 'Classic oval on packed earth — tight turns, lots of dust.',
    color: '#a0522d',
    defaultRacerTypeId: 'horse',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['earth'],
    trackLights: { color: '#ff8844', style: 'sequence', speed: 1.0 },
    worldWidth: 1280,
    worldHeight: 720,
    isDefault: true,
  },
  {
    id: 'river-run',
    name: 'River Run',
    icon: '🦆',
    description: 'Downstream sprint through meandering rapids and lily pads.',
    color: '#2196f3',
    defaultRacerTypeId: 'duck',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'easy',
    surfaceClasses: ['water'],
    trackLights: { color: '#3aa0ff', style: 'sync_pulse', speed: 0.7 },
    worldWidth: 1280,
    worldHeight: 720,
    isDefault: true,
  },
  {
    id: 'space-sprint',
    name: 'Space Sprint',
    icon: '🚀',
    description: 'Zero-gravity dash past asteroids and nebula clouds.',
    color: '#7c3aed',
    defaultRacerTypeId: 'rocket',
    defaultDuration: 90,
    defaultWinners: 3,
    difficulty: 'hard',
    surfaceClasses: ['air'],
    trackLights: { color: '#a8d4ff', style: 'sequence', speed: 1.5 },
    worldWidth: 1280,
    worldHeight: 720,
    isDefault: true,
  },
  {
    id: 'garden-path',
    name: 'Garden Path',
    icon: '🐌',
    description: 'A leisurely (yet surprisingly competitive) crawl through the roses.',
    color: '#16a34a',
    defaultRacerTypeId: 'snail',
    defaultDuration: 120,
    defaultWinners: 3,
    difficulty: 'easy',
    surfaceClasses: ['grass', 'earth'],
    trackLights: { color: '#ffdd66', style: 'steady', speed: 1.0 },
    worldWidth: 1280,
    worldHeight: 720,
    isDefault: true,
  },
  {
    id: 'city-circuit',
    name: 'City Circuit',
    icon: '🚙',
    description: 'High-speed urban track with hairpin corners and tunnel sections.',
    color: '#64748b',
    defaultRacerTypeId: 'buggy',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'hard',
    surfaceClasses: ['asphalt'],
    trackLights: { color: '#ffffff', style: 'sequence', speed: 1.0 },
    worldWidth: 1280,
    worldHeight: 720,
    isDefault: true,
  },
  {
    id: 'mountainstreet',
    name: 'Mountainstreet',
    icon: '🏞',
    description: 'A winding mountain road with sweeping corners and elevation changes.',
    color: '#e63946',
    defaultRacerTypeId: 'boarder',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['asphalt'],
    trackLights: { color: '#ffffff', style: 'sequence', speed: 1.0 },
    worldWidth: 6144,
    worldHeight: 4096,
    isDefault: true,
  },
  {
    id: 'ice-track',
    name: 'Ice Track',
    icon: '🎿',
    description: 'A slippery closed circuit on packed ice and snow.',
    color: '#e63946',
    defaultRacerTypeId: 'horse',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['ice', 'snow'],
    trackLights: { color: '#ffffff', style: 'sequence', speed: 1.0 },
    worldWidth: 1536,
    worldHeight: 1024,
    isDefault: true,
  },
  {
    id: 'seatrack',
    name: 'Seatrack',
    icon: '🐬',
    description: 'Open sea dash through waves and sunken ruins.',
    color: '#0077b6',
    defaultRacerTypeId: 'dolphin',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['water'],
    trackLights: { color: '#00b4d8', style: 'sync_pulse', speed: 0.7 },
    worldWidth: 6144,
    worldHeight: 4096,
    isDefault: true,
  },
  {
    id: 'searound',
    name: 'Searound',
    icon: '🌊',
    description: 'Circular sea circuit — racers loop around a sunken atoll.',
    color: '#023e8a',
    defaultRacerTypeId: 'manta',
    defaultDuration: 60,
    defaultWinners: 3,
    difficulty: 'medium',
    surfaceClasses: ['water'],
    trackLights: { color: '#0096c7', style: 'sync_pulse', speed: 0.9 },
    worldWidth: 3072,
    worldHeight: 2048,
    isDefault: true,
  },
  {
    id: 'luger-hill',
    name: 'Luger Hill',
    icon: '🛷',
    description: 'Steep luge descent through frozen mountain banks and open ridgelines.',
    color: '#e63946',
    defaultRacerTypeId: 'luge',
    defaultDuration: 90,
    defaultWinners: 3,
    difficulty: 'hard',
    surfaceClasses: ['ice', 'air'],
    trackLights: { color: '#0eaf2e', style: 'sequence', speed: 1.0 },
    worldWidth: 4096,
    worldHeight: 2728,
    isDefault: true,
  },
];

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

// Copy committed snapshot files (server/seeds/) into DATA_ROOT on first boot.
// Runs before loadAllTracks() so the map sees the rich seed files immediately.
function migrateDefaultTracks() {
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
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
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

  // eslint-disable-next-line no-unused-vars
  const { backgroundImage, ...rest } = req.body;
  const track = {
    // Sensible defaults — overridden by anything in req.body
    icon: '🏁',
    description: '',
    defaultRacerTypeId: 'horse',
    color: '#e63946',
    defaultDuration: 60,
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

  // eslint-disable-next-line no-unused-vars
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

  if (track.backgroundImageFile) {
    const bgPath = join(BG_DIR, track.backgroundImageFile);
    if (existsSync(bgPath)) unlinkSync(bgPath);
  }

  tracksMap.delete(track.id);
  res.status(204).send();
});

// DELETE /api/tracks/:id/background — remove background image from a track
router.delete('/:id/background', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  if (track.backgroundImageFile) {
    const bgPath = join(BG_DIR, track.backgroundImageFile);
    if (existsSync(bgPath)) unlinkSync(bgPath);
  }

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
          .json({ error: `File too large. Maximum ${MAX_BG_BYTES / 1024 / 1024} MB allowed.` });
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
