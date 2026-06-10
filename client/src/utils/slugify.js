// ============================================================
// File:        slugify.js
// Path:        client/src/utils/slugify.js
// Project:     RaceArena
// Created:     2026-04-30
// Description: URL-safe slug generator and unique-suffix helper for surface-class IDs.
// ============================================================

/**
 * Convert a human-readable label into a URL-safe slug matching /^[a-z0-9_-]+$/.
 * Falls back to 'class' when the input contains no usable characters.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'class'
  );
}

/**
 * Return `base` if not in `existingIds`, otherwise append the lowest available
 * numeric suffix: `base-2`, `base-3`, …
 * @param {string} base
 * @param {Set<string>} existingIds
 * @returns {string}
 */
export function uniqueSlug(base, existingIds) {
  if (!existingIds.has(base)) return base;
  let n = 2;
  while (existingIds.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
