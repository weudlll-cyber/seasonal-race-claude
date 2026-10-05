// ============================================================
// File:        jsonSettingStore.js
// Path:        server/utils/jsonSettingStore.js
// Project:     RaceArena — TEST-AIDS-1 (extracted from PERIOD-EVALUATION-1's pointsRule.js)
// Description: ONE server-wide setting in ONE JSON file: read it, fall back to its default when the
//              file is missing or not a valid value (said once in the log), and write it atomically.
//
// WHY A SHARED HELPER. The period evaluation's points rule was the first setting the owner made
// server-wide (2026-10-04); the test-aids switch is the second (TEST-AIDS-1). Both need exactly the
// same three behaviours, and the second one most of all needs the first: a switch that ships OFF
// must read OFF when its file is gone or damaged, never throw and never guess. One implementation
// keeps the two from drifting apart.
// ============================================================

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { atomicWriteJson } from './atomicWriteJson.js';

/**
 * @template T
 * @param {object} opts
 * @param {string} opts.filePath         where the setting lives
 * @param {(raw: unknown) => T | null} opts.validate  the value to use, or null when `raw` is not one
 * @param {() => T} opts.fallback        a FRESH default each call, so a caller may mutate it
 * @param {string} opts.tag              the log prefix, e.g. 'points-rule'
 * @param {string} opts.name             what the file should hold, e.g. 'points rule'
 * @returns {{ get(): T, set(value: T): T }}
 */
export function createJsonSettingStore({ filePath, validate, fallback, tag, name }) {
  return {
    get() {
      if (!existsSync(filePath)) return fallback();
      try {
        const value = validate(JSON.parse(readFileSync(filePath, 'utf8')));
        if (value) return value;
      } catch {
        // fall through to the default below
      }
      console.warn(`[${tag}] ${filePath} is not a valid ${name}; the default is used.`);
      return fallback();
    },
    set(value) {
      mkdirSync(dirname(filePath), { recursive: true });
      atomicWriteJson(filePath, value);
      return value;
    },
  };
}
