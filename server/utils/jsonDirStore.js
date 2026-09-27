// ============================================================
// File:        jsonDirStore.js
// Path:        server/utils/jsonDirStore.js
// Project:     RaceArena — DELIVERY-CLEAN-3 piece 3 (P3)
// Created:     2026-09-27
//
// WHAT THIS OWNS: reading a directory of `<id>.json` records into an in-memory `Map`, and naming
// the file one of those records lives in.
//
// ── WHY IT EXISTS ───────────────────────────────────────────────────────────────────────────────
//
// `brands.js`, `playerGroups.js` and `racers.js` each carried their OWN copy of this loader —
// ★ three, not the two DELIVERY-CLEAN-1 §6.1 reported, because that clone report pairs files and
// never says how many copies a shape has in total. Diffed before unifying, as the brief required:
// the three bodies are **structurally identical with no behavioural drift**. They differed only in
// the local variable name (`brand` / `group` / `racer`, cosmetic) and in the log label, which is
// real and is why `label` is a parameter rather than a constant.
//
// ★ THE SKIP-AND-WARN BEHAVIOUR IS DELIBERATE AND IS PRESERVED EXACTLY. A record that fails to
// parse is skipped with a warning, not thrown: one corrupt file on disk must not stop the server
// from booting with the other ninety-nine. `brands.test.js` has a "corrupt-file-at-boot skip" case
// that depends on it.
//
// ★ WHAT IS NOT HERE. `DATA_DIR` stays with each route module: the three point at different
// directories, and that is a fact about each resource, not something to centralise. Writing is
// `atomicWriteJson.js`'s and is untouched.
// ============================================================

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load every `<id>.json` in `dir` into a `Map` keyed by each record's own `id`.
 *
 * @param {string} dir    the directory to read; a missing directory yields an empty Map.
 * @param {string} label  what to call this store in a warning, e.g. 'brands'.
 * @returns {Map<string, object>}
 */
export function loadJsonDir(dir, label) {
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const record = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      map.set(record.id, record);
    } catch {
      // Skip, do not throw — see the header: one bad file must not stop the boot.
      console.warn(`[${label}] Failed to load ${file} — skipping`);
    }
  }
  return map;
}

/**
 * The path a record with this id lives at.
 *
 * @param {string} dir
 * @param {string} id
 * @returns {string}
 */
export function jsonFilePath(dir, id) {
  return join(dir, `${id}.json`);
}
