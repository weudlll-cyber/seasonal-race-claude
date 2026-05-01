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

// Initial surfaceClasses assignments for the 5 code-default tracks.
const DEFAULT_TRACK_SURFACE_CLASSES = {
  'dirt-oval': ['earth'],
  'river-run': ['water'],
  'space-sprint': ['air'],
  'garden-path': ['grass', 'earth'],
  'city-circuit': ['asphalt'],
};

// Initial trackLights configuration for the 5 code-default tracks and custom tracks.
const DEFAULT_TRACK_LIGHTS_BY_ID = {
  'dirt-oval': { color: '#ff8844', style: 'sequence', speed: 1.0 },
  'river-run': { color: '#3aa0ff', style: 'sync_pulse', speed: 0.7 },
  'space-sprint': { color: '#a8d4ff', style: 'sequence', speed: 1.5 },
  'garden-path': { color: '#ffdd66', style: 'steady', speed: 1.0 },
  'city-circuit': { color: '#ffffff', style: 'sequence', speed: 1.0 },
};
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
    const classes = DEFAULT_TRACK_SURFACE_CLASSES[id] ?? [];
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
    const lights = DEFAULT_TRACK_LIGHTS_BY_ID[id] ?? CUSTOM_TRACK_LIGHTS_DEFAULT;
    const patched = { ...track, trackLights: lights };
    atomicWriteJson(join(DATA_DIR, `${id}.json`), patched);
    tracksMap.set(id, patched);
  }
}

migrateTrackLights();

// Strip geometry arrays and internal file references from the list response.
function toSummary({ innerPoints, outerPoints, centerPoints, backgroundImageFile, ...rest }) {
  return rest;
}

// Write JSON atomically: write to .tmp then rename.
function atomicWriteJson(filePath, data) {
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  renameSync(tmp, filePath);
}

function generateId() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

function generateGeometryId() {
  return `custom-${randomUUID()}`;
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
    geometryId: existing.geometryId,
    isDefault: existing.isDefault,
    backgroundImageFile: existing.backgroundImageFile,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  atomicWriteJson(join(DATA_DIR, `${existing.id}.json`), track);
  tracksMap.set(existing.id, track);

  const { backgroundImageFile: _drop, ...responseTrack } = track;
  res.json(responseTrack);
});

// DELETE /api/tracks/:id
router.delete('/:id', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const jsonPath = join(DATA_DIR, `${track.id}.json`);
  if (existsSync(jsonPath)) unlinkSync(jsonPath);

  if (track.backgroundImageFile) {
    const bgPath = join(BG_DIR, track.backgroundImageFile);
    if (existsSync(bgPath)) unlinkSync(bgPath);
  }

  tracksMap.delete(track.id);
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

  res.json({ backgroundImageFile: filename });
});

export default router;
