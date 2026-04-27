// localStorage CRUD for editor-created track geometries.
// Key scheme:
//   racearena:trackGeometries:index  — JSON array of geometry IDs
//   racearena:trackGeometries:<id>   — full geometry JSON

import { catmullRomSpline } from './catmullRom.js';

function _computeSplineLengthPx(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

const GEOMETRIES_INDEX_KEY = 'racearena:trackGeometries:index';
const trackGeometryKey = (id) => `racearena:trackGeometries:${id}`;

const genId = () => {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is required; please use a modern browser.');
  }
  return `custom-${crypto.randomUUID()}`;
};

// Wrappers that convert browser localStorage errors into clear messages.
function lsGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    throw new Error(`localStorage is unavailable: ${e.message}`);
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    throw new Error(`localStorage is unavailable: ${e.message}`);
  }
}

function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    throw new Error(`localStorage is unavailable: ${e.message}`);
  }
}

function readIndex() {
  const raw = lsGet(GEOMETRIES_INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeIndex(ids) {
  lsSet(GEOMETRIES_INDEX_KEY, JSON.stringify(ids));
}

function validatePoints(pts, label) {
  if (!Array.isArray(pts) || pts.length === 0) {
    throw new Error(`Track ${label} must be a non-empty array of {x, y} points`);
  }
  for (const pt of pts) {
    if (typeof pt.x !== 'number' || typeof pt.y !== 'number') {
      throw new Error(`Each ${label} entry must have numeric x and y`);
    }
  }
}

function validateTrack(track) {
  if (!track.name || typeof track.name !== 'string' || !track.name.trim()) {
    throw new Error('Track name must be a non-empty string');
  }
  if (
    !track.backgroundImage ||
    typeof track.backgroundImage !== 'string' ||
    !track.backgroundImage.trim()
  ) {
    throw new Error('Track backgroundImage must be a non-empty string');
  }
  if (typeof track.closed !== 'boolean') {
    throw new Error('Track closed must be a boolean');
  }
  validatePoints(track.innerPoints, 'innerPoints');
  validatePoints(track.outerPoints, 'outerPoints');
}

/**
 * Returns metadata for all saved tracks, sorted by updatedAt descending.
 * @returns {{ id: string, name: string, backgroundImage: string, createdAt: string, updatedAt: string }[]}
 */
export function listTracks() {
  const ids = readIndex();
  const tracks = ids
    .map((id) => {
      const raw = lsGet(trackGeometryKey(id));
      if (!raw) return null;
      const t = JSON.parse(raw);
      return {
        id: t.id,
        name: t.name,
        backgroundImage: t.backgroundImage,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    })
    .filter(Boolean);
  return tracks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Returns the full track object or null if not found.
 * @param {string} id
 * @returns {object|null}
 */
export function getTrack(id) {
  const raw = lsGet(trackGeometryKey(id));
  if (!raw) return null;
  const t = JSON.parse(raw);
  if (!Array.isArray(t.effects)) {
    const effects = t.effectId ? [{ id: t.effectId, config: t.effectConfig ?? {} }] : [];
    return { ...t, effects };
  }
  return { ...t };
}

/**
 * Insert or update a track. Generates an id if absent.
 * Sets createdAt on insert; always refreshes updatedAt.
 * @param {object} track
 * @returns {object} the saved track with all timestamps
 */
export function saveTrack(track) {
  validateTrack(track);

  const now = new Date().toISOString();
  const id = track.id || genId();
  const isNew = !track.id;

  let createdAt = now;
  if (!isNew) {
    const existing = lsGet(trackGeometryKey(id));
    if (existing) {
      createdAt = JSON.parse(existing).createdAt ?? now;
    }
  }

  const saved = { ...track, id, createdAt, updatedAt: now };
  lsSet(trackGeometryKey(id), JSON.stringify(saved));

  const ids = readIndex();
  if (!ids.includes(id)) {
    ids.push(id);
    writeIndex(ids);
  }

  return saved;
}

/**
 * Delete a track by id. Returns true if it existed, false otherwise.
 * @param {string} id
 * @returns {boolean}
 */
export function deleteTrack(id) {
  const existing = lsGet(trackGeometryKey(id));
  if (existing === null) return false;
  lsRemove(trackGeometryKey(id));
  writeIndex(readIndex().filter((i) => i !== id));
  return true;
}

// Migration: add pathLengthPx to saved geometries that pre-date B-17.
// Runs once at module load; skips geometries that already have the field.
(function migratePathLength() {
  if (typeof localStorage === 'undefined') return;
  try {
    const ids = readIndex();
    for (const id of ids) {
      const raw = lsGet(trackGeometryKey(id));
      if (!raw) continue;
      const geo = JSON.parse(raw);
      if (typeof geo.pathLengthPx === 'number') continue;

      const closed = geo.closed ?? false;
      const samples = 200;
      let pathLengthPx;
      try {
        if (
          geo.sourceMode === 'center' &&
          Array.isArray(geo.centerPoints) &&
          geo.centerPoints.length >= (closed ? 3 : 2)
        ) {
          const curve = catmullRomSpline(geo.centerPoints, { closed, tension: 0.5, samples });
          pathLengthPx = _computeSplineLengthPx(curve);
        } else if (Array.isArray(geo.innerPoints) && Array.isArray(geo.outerPoints)) {
          const minPts = closed ? 3 : 2;
          if (geo.innerPoints.length >= minPts && geo.outerPoints.length >= minPts) {
            const inner = catmullRomSpline(geo.innerPoints, { closed, tension: 0.5, samples });
            const outer = catmullRomSpline(geo.outerPoints, { closed, tension: 0.5, samples });
            const mid = inner.map((p, i) => ({
              x: (p.x + outer[i].x) / 2,
              y: (p.y + outer[i].y) / 2,
            }));
            pathLengthPx = _computeSplineLengthPx(mid);
          }
        }
      } catch {
        // Skip geometries that can't be parsed (corrupted data)
      }

      if (typeof pathLengthPx === 'number' && pathLengthPx > 0) {
        lsSet(trackGeometryKey(id), JSON.stringify({ ...geo, pathLengthPx }));
      }
    }
  } catch {
    // Never let migration crash the app
  }
})();
