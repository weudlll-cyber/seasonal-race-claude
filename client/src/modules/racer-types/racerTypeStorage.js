// ============================================================
// File:        racerTypeStorage.js
// Path:        client/src/modules/racer-types/racerTypeStorage.js
// Project:     RaceArena
// Description: Persistence layer for user-created racer types.
//              Pure storage concern — no SpriteRacerType construction here.
//              All type instances are built in index.js from the raw configs
//              returned by this module.
// ============================================================

const STORAGE_KEY = 'racearena:racerTypes:v1';

const REQUIRED_FIELDS = [
  'id',
  'name',
  'emoji',
  'spriteDataUrl',
  'frameCount',
  'basePeriodMs',
  'displaySize',
  'trailStyle',
  'coats',
  'primaryColor',
];

/**
 * Load all stored racer type configs from localStorage.
 * Returns an array of raw config objects.
 * Never throws — returns [] on missing key or corrupt data.
 */
export function loadStoredRacerTypes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Persist a new or updated racer type config.
 * Validates required fields and ID format.
 *
 * @param {object} config  Raw config object (all storage fields).
 * @param {string[]} builtInIds  Built-in type IDs to check collision against.
 *   Passed by the caller (index.js) to avoid a circular import.
 * @returns {object} The saved config (same reference).
 * @throws {Error} On validation failure.
 */
export function saveStoredRacerType(config, builtInIds = []) {
  _validateConfig(config, builtInIds);
  const existing = loadStoredRacerTypes();
  const idx = existing.findIndex((t) => t.id === config.id);
  if (idx >= 0) {
    existing[idx] = config;
  } else {
    existing.push(config);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    throw new Error(`[racerTypeStorage] Failed to write localStorage: ${err.message}`);
  }
  return config;
}

/**
 * Remove a stored racer type by ID.
 * No-op if the ID is not found.
 */
export function deleteStoredRacerType(id) {
  const existing = loadStoredRacerTypes();
  const filtered = existing.filter((t) => t.id !== id);
  if (filtered.length === existing.length) return; // not found — no-op
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Best-effort — storage failure on delete is non-fatal.
  }
}

// ── Internal validation ───────────────────────────────────────────────────────

function _validateConfig(config, builtInIds) {
  if (!config || typeof config !== 'object') {
    throw new Error('[racerTypeStorage] config must be an object');
  }

  const { id } = config;

  if (!id || typeof id !== 'string') {
    throw new Error('[racerTypeStorage] id must be a non-empty string');
  }
  if (/\s/.test(id)) {
    throw new Error(`[racerTypeStorage] id "${id}" must not contain whitespace`);
  }
  if (builtInIds.includes(id)) {
    throw new Error(
      `[racerTypeStorage] id "${id}" collides with a built-in racer type — choose a different id`
    );
  }

  for (const field of REQUIRED_FIELDS) {
    if (config[field] == null) {
      throw new Error(`[racerTypeStorage] required field "${field}" is missing`);
    }
  }

  if (!Array.isArray(config.coats) || config.coats.length === 0) {
    throw new Error('[racerTypeStorage] coats must be a non-empty array');
  }
}
