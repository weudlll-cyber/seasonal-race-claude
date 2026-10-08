// ============================================================
// File:        testAids.js
// Path:        server/src/settings/testAids.js
// Project:     RaceArena — TEST-AIDS-1 (the owner's decision of 2026-10-04)
// Description: THE TEST-AIDS SWITCH, stored ON THE SERVER — one value for the whole installation.
//
// ── WHAT IT IS ──────────────────────────────────────────────────────────────────────────────────
// The owner decided on 2026-10-04 that every developer-only display and aid (the build and settings
// badges, the race-plan pill, the hero rings, the camera marker, Quick Test, the diagnostic HUDs and
// logs, `?constSpeed`, the distribution page and the console probes — the numbered list is
// reports/release/DEV-DISPLAYS-1.md) hangs on ONE switch: stored here, readable by every signed-in
// user, set by admins only (`ROUTE_POLICY` in `server/src/auth/guards.js`), and SHIPPED OFF.
//
// ── OFF IS THE ANSWER TO EVERY DOUBT ────────────────────────────────────────────────────────────
// A missing file is OFF — so a fresh installation ships OFF without anything being written. An
// unreadable or invalid file is OFF too, said once in the log: a damaged setting must never show a
// test aid to an audience. The client follows the same rule for an answer it cannot get.
// ============================================================

import { join } from 'node:path';
import { createJsonSettingStore } from '../../utils/jsonSettingStore.js';
import { DATA_ROOT } from '../dataPaths.js';

export const DEFAULT_TEST_AIDS = Object.freeze({ enabled: false });

/**
 * Check a value sent by a client. Returns the value to store, or an `error` sentence for the person.
 *
 * @param {unknown} body
 * @returns {{ value?: {enabled: boolean}, error?: string }}
 */
export function validateTestAids(body) {
  if (!body || typeof body !== 'object' || typeof body.enabled !== 'boolean') {
    return { error: 'The test-aids switch is { "enabled": true } or { "enabled": false }.' };
  }
  return { value: { enabled: body.enabled } };
}

/** @param {string} [filePath] */
export function createTestAidsStore(filePath = join(DATA_ROOT, 'test-aids.json')) {
  return createJsonSettingStore({
    filePath,
    validate: (raw) => validateTestAids(raw).value ?? null,
    fallback: () => ({ ...DEFAULT_TEST_AIDS }),
    tag: 'test-aids',
    name: 'test-aids setting',
  });
}
