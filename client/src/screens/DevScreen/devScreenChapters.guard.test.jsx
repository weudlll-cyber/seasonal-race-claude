// ============================================================
// File:        devScreenChapters.guard.test.jsx
// Path:        client/src/screens/DevScreen/devScreenChapters.guard.test.jsx
// Project:     RaceArena — DEVSCREEN-CHAPTERS-1
// Created:     2026-10-05
// Description: THE CHAPTER GUARD. Holds the rebuilt Dev Screen to the design table
//              (reports/evolution/DEVSCREEN-CHAPTERS-1/design.json, 347 rows): every control
//              exactly once, in the chapter and sub-group the design gives it, in the design's
//              order, carrying the design's info text.
//
// HOW EACH CONTROL IS CHECKED — every control carries `data-control-id="<file>:<id>"`, on the
// control or on its row. ALL 347 ARE CHECKED BY RENDERING; none is covered by a source scan.
//
//   The real DevScreen is rendered as an ADMIN in the All view, every section real. The data the
//   server would send is given through mocked data modules, ONE ENTRY of each kind, shaped so that
//   every conditional control appears in some state:
//     - one player group, one brand (with a logo, so "Remove logo" shows), one race director;
//     - two tracks — one on a CLOSED geometry (Default Laps) and one OPEN (Default Duration);
//     - the built-in racer types plus one CUSTOM type, listed first ("Edit in Racer Editor" and
//       Delete show only for a custom one), and stored overrides on the horse that make every Reset in the racer
//       editor appear (the last standard field, the size floor, the surface classes, the cloud);
//     - two surface classes — one MODIFIED cloud class (Reset to Default) and one CUSTOM class
//       (Delete) — plus a generator switch through every generator, so every generator field shows;
//     - one stored race with a short key (Verify race shows for an admin on a stored race).
//   Every chapter is opened from the sidebar, then every form, modal and editor is OPENED by
//   clicking (Edit on each list, + the class list, Reset Password, the "New team…" choice). Each
//   state is a SNAPSHOT of the content. For every control in every snapshot:
//     - its id is a design row (else EXTRA);
//     - its chapter (the content's data-chapter) and sub-group (its section's heading) are the
//       design's (else WRONG PLACE);
//     - all its occurrences sit in ONE part (data-part) — a per-entry control repeated per row of
//       one list is one control; the same id in two parts is a DUPLICATE;
//     - it holds an info icon whose text is the design's info text, character for character;
//     - within the snapshot, controls appear in the design's position order.
//   After the walk every design row must have been seen (else MISSING).
//
// THE SIDEBAR IS A PLACEMENT OF ITS OWN. The view switch, Back to Setup and Log out sit in the fixed
// sidebar, reachable from every chapter (the owner's decision of 2026-10-05); design.json places
// them in "Sidebar (all chapters)". Every snapshot reads the sidebar as that one placement, so they
// are checked in every chapter state exactly like the content's controls — and one of them rendered
// inside a chapter as well is a WRONG PLACE and a DUPLICATE.
// ============================================================

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── The signed-in admin ──────────────────────────────────────────────────────
vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { username: 'admin', role: 'admin' },
    logout: () => {},
    changePassword: async () => {},
  }),
}));

// ── One entry of every server-backed kind ────────────────────────────────────
const GROUP = { id: 'g1', name: 'Crew', players: ['Ada', 'Bob'], isDefault: false };
vi.mock('../../services/playerGroupApi.js', () => ({
  fetchPlayerGroups: async () => [GROUP],
  createPlayerGroup: async () => ({}),
  updatePlayerGroup: async () => ({}),
  deletePlayerGroup: async () => ({}),
  setPlayerGroupDefault: async () => ({}),
  clearPlayerGroupDefault: async () => ({}),
  exportPlayerGroupSeed: async () => ({}),
}));
vi.mock('../../modules/storage/playerGroupMigration.js', () => ({
  migrateLocalPlayerGroupsToServer: async () => true,
}));

const BRAND = {
  id: 'b1',
  name: 'Brand',
  eventName: 'Event',
  subtitle: '',
  primaryColor: '#ff0000',
  secondaryColor: '#000000',
  sponsorText: '',
  logo: 'data:image/png;base64,AAAA',
  logoMaxHeight: 90,
  logoOpacity: 0.9,
  isDefault: false,
};
vi.mock('../../services/brandApi.js', () => ({
  fetchBrands: async () => [BRAND],
  createBrand: async () => ({}),
  updateBrand: async () => ({}),
  deleteBrand: async () => ({}),
  uploadBrandLogo: async () => ({}),
  deleteBrandLogo: async () => ({}),
  setBrandDefault: async () => ({}),
  clearBrandDefault: async () => ({}),
  exportBrandSeed: async () => ({}),
}));
vi.mock('../../modules/branding/brandingSync.js', () => ({ syncBrandingMirror: async () => {} }));

const TRACK = {
  icon: '🏁',
  color: '#ff8800',
  description: '',
  defaultRacerTypeId: 'horse',
  surfaceClasses: ['guard-cloud'],
  defaultWinners: 3,
  worldWidth: 1280,
  worldHeight: 720,
  isDefault: false,
  maxRacers: null,
};
const TRACKS = [
  { ...TRACK, id: 't-closed', name: 'Closed', geometryId: 'geo-closed', defaultLaps: 2 },
  { ...TRACK, id: 't-open', name: 'Open', geometryId: null, defaultDurationSec: 60 },
];
vi.mock('../../modules/storage/useServerTracks.js', () => ({
  useServerTracksControl: () => ({ tracks: TRACKS, refresh: async () => {} }),
  useServerTracks: () => TRACKS,
}));
vi.mock('../../modules/track-editor/trackStorage.js', () => ({
  listTracks: () => [{ id: 'geo-closed' }],
  getTrack: (id) => (id === 'geo-closed' ? { closed: true, effects: [] } : null),
}));

const SURFACE_CLASSES = [
  {
    id: 'guard-cloud',
    label: 'Guard Cloud',
    generatorId: 'cloud',
    isOverride: true,
    config: { spawnProbability: 0.5, endSize: 10, lifetimeFrames: 40 },
  },
  { id: 'guard-custom', label: 'Guard Custom', generatorId: 'particle', config: {} },
];
vi.mock('../../modules/surface-effects/useSurfaceClasses.js', () => ({
  useSurfaceClasses: () => ({
    classes: SURFACE_CLASSES,
    refresh: async () => {},
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../racer-types/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // The custom type FIRST: its row carries all four row controls, so the first occurrence of each
    // is in one row and the order check reads a row's order, not an order across rows.
    listAllRacerTypes: () => [
      { id: 'guard-custom-type', speedMultiplier: 1 },
      ...actual.listAllRacerTypes(),
    ],
    getRacerTypeLabel: (id) =>
      id === 'guard-custom-type' ? 'Guard Custom Type' : actual.getRacerTypeLabel(id),
  };
});

vi.mock('../../services/racesApi.js', () => ({
  fetchRacesPage: async () => ({
    races: [
      {
        id: 's1',
        shortKey: 'ABC123',
        finishedAt: '2026-10-02T10:00:00.000Z',
        geometryId: 'geo-closed',
        elapsedSec: 61,
        names: ['Ada', 'Bob'],
        racePlanSeed: 7,
        winners: ['Ada'],
      },
    ],
    hasMore: false,
    offset: 0,
    limit: 20,
    team: 'T',
  }),
  verifyRace: async () => ({}),
  fetchPeriodEvaluation: async () => ({ rows: [], counted: 0, quickTestsExcluded: 0 }),
  fetchPointsRule: async () => ({ pointsEnabled: false, pointsPerPlace: [] }),
  savePointsRule: async (rule) => rule,
}));

vi.mock('../../services/usersApi.js', () => ({
  fetchUsers: async () => [{ id: 'u1', username: 'ada', role: 'operator', team: 'T' }],
  createUser: async () => ({}),
  updateUser: async () => ({}),
  deleteUser: async () => ({}),
}));

import DevScreen from './DevScreen.jsx';
import { CHAPTERS } from './devScreenChapters.js';
import { KEYS } from '../../modules/storage/storage.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DESIGN = JSON.parse(
  readFileSync(
    join(
      HERE,
      '..',
      '..',
      '..',
      '..',
      'reports',
      'evolution',
      'DEVSCREEN-CHAPTERS-1',
      'design.json'
    ),
    'utf8'
  )
);

/** The control id a design row is rendered under: "<file base name>:<id>". */
const idOf = (row) => `${row.section.replace(/^sections\//, '').replace(/\.jsx$/, '')}:${row.id}`;
const ROWS = new Map(DESIGN.map((r) => [idOf(r), r]));

/** The placement the design gives the controls of the fixed sidebar. */
const SIDEBAR = 'Sidebar (all chapters)';

const infoTextsOf = (el) =>
  [...el.querySelectorAll('[role="img"]')].map((i) => i.getAttribute('aria-label'));

function snapshot() {
  const main = document.querySelector('main');
  const chapter = main.getAttribute('data-chapter');
  const content = [...main.querySelectorAll('[data-control-id]')].map((el) => ({
    id: el.getAttribute('data-control-id'),
    chapter,
    subgroup: el.closest('section')?.querySelector('h2')?.textContent ?? null,
    part: el.closest('[data-part]')?.getAttribute('data-part') ?? null,
    infoTexts: infoTextsOf(el),
  }));
  const sidebar = [...document.querySelectorAll('nav [data-control-id]')].map((el) => ({
    id: el.getAttribute('data-control-id'),
    chapter: SIDEBAR,
    subgroup: SIDEBAR,
    part: 'sidebar',
    infoTexts: infoTextsOf(el),
  }));
  return [...content, ...sidebar];
}

/** The control element(s) of a control id, for clicking. */
const controls = (id) => [...document.querySelectorAll(`[data-control-id="${id}"]`)];
const settle = () => act(async () => {});

function openChapter(title) {
  fireEvent.click(screen.getByRole('button', { name: (name) => name.includes(title) }));
}

const snapshots = [];
const take = () => snapshots.push(snapshot());

// The states opened per chapter, beyond the chapter as it first shows.
const OPENERS = {
  'Look, labels and effects': async () => {
    // the modified class is opened first (Reset to Default); then the custom class (Delete)
    fireEvent.click(screen.getByText('Guard Custom', { selector: 'div' }));
    take();
    for (const option of document.querySelectorAll('#sc-generator option')) {
      fireEvent.change(document.querySelector('#sc-generator'), {
        target: { value: option.value },
      });
      take();
    }
  },
  'Tracks, racers, brands and groups': async () => {
    await waitFor(() => expect(controls('PlayerGroupsManager:handleEdit')).toHaveLength(1));
    fireEvent.click(controls('PlayerGroupsManager:handleEdit')[0].querySelector('button'));
    take();
    for (const i of [0, 1]) {
      // the closed track (Default Laps), then the open one (Default Duration)
      fireEvent.click(controls('TrackManager:handleEdit')[i].querySelector('button'));
      take();
    }
    await waitFor(() => expect(controls('BrandingProfiles:handleEdit')).toHaveLength(1));
    fireEvent.click(controls('BrandingProfiles:handleEdit')[0].querySelector('button'));
    take();
    // the horse, whose stored overrides make every Reset of the racer editor appear
    fireEvent.click(screen.getByTitle(/^Edit Horse .* tuning$/));
    take();
  },
  'Accounts and system': async () => {
    await waitFor(() => expect(controls('UserManagementSection:openResetForm')).toHaveLength(1));
    fireEvent.click(controls('UserManagementSection:openResetForm')[0].querySelector('button'));
    take();
    fireEvent.change(document.querySelector('#um-team'), { target: { value: '__new__' } });
    take();
  },
};

beforeAll(async () => {
  localStorage.clear();
  // Stored overrides on the horse that make every Reset of the racer editor appear.
  localStorage.setItem(
    KEYS.RACER_TYPE_OVERRIDES,
    JSON.stringify({
      horse: {
        leaderEllipseRy: 12,
        minTargetScreenPx: 40,
        surfaceClasses: ['guard-cloud'],
        surfaceEffectOverrides: { spawnProbability: 0.4, endSize: 12, lifetimeFrames: 30 },
      },
    })
  );
  render(
    <MemoryRouter>
      <DevScreen />
    </MemoryRouter>
  );
  for (const chapter of CHAPTERS) {
    openChapter(chapter.title);
    await settle();
    await settle();
    take();
    await OPENERS[chapter.title]?.();
  }
});

describe('DEVSCREEN-CHAPTERS-1 — the screen holds every control of the design, once, in place', () => {
  it('design.json is the 347-row table', () => {
    expect(DESIGN).toHaveLength(347);
    expect(ROWS.size).toBe(347);
  });

  it('the registry has the design chapters, in the design order', () => {
    const chapters = DESIGN.map((r) => r.chapter).filter((c) => c !== SIDEBAR);
    expect(CHAPTERS.map((c) => c.title)).toEqual([...new Set(chapters)]);
  });

  it('the sidebar holds the three controls the design places there', () => {
    const placed = DESIGN.filter((r) => r.chapter === SIDEBAR).map(idOf);
    expect(placed).toEqual([
      'DevScreen:handleViewChange',
      "DevScreen:navigate('/setup')",
      'DevScreen:logout',
    ]);
    // ...and every chapter state shows all three of them in the sidebar
    for (const snap of snapshots)
      expect(snap.filter((c) => c.part === 'sidebar').map((c) => c.id)).toEqual(placed);
  });

  it('no control the design does not list (EXTRA)', () => {
    const extra = new Set();
    for (const snap of snapshots) for (const c of snap) if (!ROWS.has(c.id)) extra.add(c.id);
    expect([...extra]).toEqual([]);
  });

  it('every control sits in the design chapter and sub-group (WRONG PLACE)', () => {
    const wrong = new Set();
    for (const snap of snapshots)
      for (const c of snap) {
        const row = ROWS.get(c.id);
        if (row && (row.chapter !== c.chapter || row.subgroup !== c.subgroup))
          wrong.add(
            `${c.id}: ${c.chapter} / ${c.subgroup} — design: ${row.chapter} / ${row.subgroup}`
          );
      }
    expect([...wrong]).toEqual([]);
  });

  it('every control is placed once — one part (DUPLICATE)', () => {
    const parts = new Map();
    for (const snap of snapshots)
      for (const c of snap) {
        if (!parts.has(c.id)) parts.set(c.id, new Set());
        parts.get(c.id).add(`${c.chapter} | ${c.part}`);
      }
    const dup = [...parts].filter(([, p]) => p.size > 1).map(([id, p]) => `${id}: ${[...p]}`);
    expect(dup).toEqual([]);
  });

  it('every control carries the design info text', () => {
    const bad = new Set();
    for (const snap of snapshots)
      for (const c of snap) {
        const row = ROWS.get(c.id);
        if (row && !c.infoTexts.includes(row.infoText)) bad.add(c.id);
      }
    expect([...bad]).toEqual([]);
  });

  it('within every state, controls appear in the design order', () => {
    const bad = new Set();
    for (const snap of snapshots) {
      const seen = [];
      for (const c of snap) if (ROWS.has(c.id) && !seen.includes(c.id)) seen.push(c.id);
      for (let i = 1; i < seen.length; i++) {
        const a = ROWS.get(seen[i - 1]);
        const b = ROWS.get(seen[i]);
        if (a.chapter === b.chapter && a.position > b.position)
          bad.add(`${seen[i - 1]} (${a.position}) before ${seen[i]} (${b.position})`);
      }
    }
    expect([...bad]).toEqual([]);
  });

  it('no design control is missing (MISSING)', () => {
    const seen = new Set(snapshots.flat().map((c) => c.id));
    const missing = DESIGN.map(idOf).filter((id) => !seen.has(id));
    expect(missing).toEqual([]);
  });
});
