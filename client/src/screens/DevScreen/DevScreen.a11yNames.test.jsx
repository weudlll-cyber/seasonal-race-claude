// ============================================================
// File:        DevScreen.a11yNames.test.jsx
// Path:        client/src/screens/DevScreen/DevScreen.a11yNames.test.jsx
// Project:     RaceArena — AUDIT-1 A8-01
// Created:     2026-10-12
// Description: Every number field in the Dev Screen's first chapter has an accessible name. The
//              audit's axe run found ten without one: each sat beside a visible <label> that was
//              not associated with it. They now carry that visible text as their aria-label; this
//              test pins the ten names and refuses an unnamed number field in the chapter.
// ============================================================

import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { username: 'admin', role: 'admin' },
    logout: () => {},
    changePassword: async () => {},
  }),
}));
vi.mock('../../services/playerGroupApi.js', () => ({ fetchPlayerGroups: async () => [] }));
vi.mock('../../modules/storage/playerGroupMigration.js', () => ({
  migrateLocalPlayerGroupsToServer: async () => true,
}));
vi.mock('../../services/brandApi.js', () => ({ fetchBrands: async () => [] }));
vi.mock('../../modules/branding/brandingSync.js', () => ({ syncBrandingMirror: async () => {} }));
vi.mock('../../modules/storage/useServerTracks.js', () => ({
  useServerTracksControl: () => ({ tracks: [], refresh: async () => {} }),
  useServerTracks: () => [],
}));

import DevScreen from './DevScreen.jsx';

// The visible label text of each field the audit found unnamed.
const NAMED = [
  'Max Players — Closed Tracks',
  'Max Players — Open Tracks',
  'Normal Speed (px/s)',
  'Min Speed',
  'Max Speed',
  'Reference Value',
  'Min Scale',
  'Max Scale',
  'Track Width (px)',
  'Racer Count',
];

// A number field's name, the three ways the chapter could give one. Read from the DOM rather than
// through role queries: the chapter holds several hundred elements, and computing the accessible
// tree for each query cost seconds under a loaded suite.
const nameOf = (input) =>
  input.getAttribute('aria-label') ||
  input.getAttribute('aria-labelledby') ||
  [...(input.labels ?? [])].map((l) => l.textContent).join(' ');

// The test mounts the whole Dev Screen, the same work A4-02 budgeted at 60 s for the chapter walks'
// hooks (devScreenChapters.guard / .savedSettings, CHAPTER_WALK_TIMEOUT_MS) — so the same budget,
// for this test only. On 2026-10-18 it failed at vitest's 5 s per-test limit in a premerge client
// suite that took 755 s (normally ~310 s, other builds running beside it) and passed when re-run on
// a quiet machine. A genuinely hung mount still fails, at 60 s.
const DEV_SCREEN_MOUNT_TIMEOUT_MS = 60_000;

describe('Dev Screen — number fields have accessible names (AUDIT-1 A8-01)', () => {
  // One render for both checks: the testing library unmounts after every test.
  it(
    'names the ten fields by their visible labels and leaves none in the chapter unnamed',
    async () => {
      localStorage.clear();
      render(
        <MemoryRouter>
          <DevScreen />
        </MemoryRouter>
      );
      await act(async () => {});
      const fields = [...document.querySelectorAll('input[type="number"]')];
      const names = fields.map(nameOf);
      for (const name of NAMED) expect(names).toContain(name);
      expect(fields.filter((f, i) => !names[i].trim())).toEqual([]);
    },
    DEV_SCREEN_MOUNT_TIMEOUT_MS
  );
});
