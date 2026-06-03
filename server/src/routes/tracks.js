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
  renameSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  createReadStream,
} from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data/tracks');
const BG_DIR = join(__dirname, '../../data/backgrounds');
const BACKUP_DIR = join(__dirname, '../../data/tracks-backups');
const DEFAULT_TRACKS_MARKER = join(__dirname, '../../data/.tlh1-defaults-migrated');

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const MAX_BG_BYTES = 10 * 1024 * 1024; // 10 MB

// multer — memory storage, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BG_BYTES },
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

const tracksMap = loadAllTracks();

// Metadata for the 9 built-in default tracks — seeded as server records on first boot.
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

// Write JSON atomically: write to .tmp then rename.
// On Windows with OneDrive, renameSync can transiently fail with EPERM.
// Fall back to a direct overwrite and clean up the .tmp file in that case.
function atomicWriteJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, json, 'utf8');
  try {
    renameSync(tmp, filePath);
  } catch {
    writeFileSync(filePath, json, 'utf8');
    try { unlinkSync(tmp); } catch {}
  }
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

// Seed the built-in default tracks as server records.
// Runs on every boot but only creates tracks that are missing — idempotent for
// existing tracks. Marker file is written once for historical reference.
function migrateDefaultTracks() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const now = new Date().toISOString();
  for (const seed of DEFAULT_TRACK_SEEDS) {
    if (tracksMap.has(seed.id)) continue;
    const track = {
      ...seed,
      geometryId: null,
      backgroundImageFile: null,
      closed: false,
      centerPoints: [],
      innerPoints: [],
      outerPoints: [],
      effects: [],
      createdAt: now,
      updatedAt: now,
    };
    atomicWriteJson(join(DATA_DIR, `${seed.id}.json`), track);
    tracksMap.set(seed.id, track);
    console.log(`[RaceArena] Default track seeded: ${seed.name}`);
  }
  if (!existsSync(DEFAULT_TRACKS_MARKER)) {
    writeFileSync(DEFAULT_TRACKS_MARKER, new Date().toISOString(), 'utf8');
    console.log('[RaceArena] Default tracks seeded as server records (TLH-1)');
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
  if ('name' in body && (!body.name || typeof body.name !== 'string' || !body.name.trim())) {
    errors.push('name is required');
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
  return errors;
}

// TLH-1: seed default tracks after all consts are initialized.
migrateDefaultTracks();

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

  const bgPath = join(BG_DIR, track.backgroundImageFile);
  if (!existsSync(bgPath)) return res.status(404).json({ error: 'Background file missing' });

  const ext = extname(track.backgroundImageFile).slice(1).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  createReadStream(bgPath).pipe(res);
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
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: background)' });

  const mime = req.file.mimetype;
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
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

export default router;
