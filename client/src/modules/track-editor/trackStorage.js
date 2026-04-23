// localStorage CRUD for editor-created tracks.
// Key scheme:
//   racearena:tracks:index           — JSON array of track IDs
//   racearena:tracks:<id>            — full track JSON

const INDEX_KEY = 'racearena:tracks:index';
const trackKey = (id) => `racearena:tracks:${id}`;

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
  const raw = lsGet(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeIndex(ids) {
  lsSet(INDEX_KEY, JSON.stringify(ids));
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
      const raw = lsGet(trackKey(id));
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
  const raw = lsGet(trackKey(id));
  return raw ? JSON.parse(raw) : null;
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
    const existing = lsGet(trackKey(id));
    if (existing) {
      createdAt = JSON.parse(existing).createdAt ?? now;
    }
  }

  const saved = { ...track, id, createdAt, updatedAt: now };
  lsSet(trackKey(id), JSON.stringify(saved));

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
  const existing = lsGet(trackKey(id));
  if (existing === null) return false;
  lsRemove(trackKey(id));
  writeIndex(readIndex().filter((i) => i !== id));
  return true;
}
