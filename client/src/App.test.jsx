// ============================================================
// File:        App.test.jsx
// Path:        client/src/App.test.jsx
// Project:     RaceArena
// Description: Honesty proof for document.title reactivity (D4, Copilot Punkt 8).
//              Verifies that the title updates when storageSet fills the BRANDING
//              mirror after mount — RED with old useState snapshot, GREEN with
//              reactive useActiveBrandProfile().
// ============================================================

import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Module mocks (screens + infra only — storage/branding are real) ───────────

vi.mock('./screens/SetupScreen/SetupScreen.jsx', () => ({ default: () => null }));
vi.mock('./screens/DevScreen/DevScreen.jsx', () => ({ default: () => null }));
vi.mock('./screens/RaceScreen/index.jsx', () => ({ default: () => null }));
vi.mock('./screens/ResultScreen/index.jsx', () => ({ default: () => null }));
vi.mock('./screens/TrackEditor/TrackEditor.jsx', () => ({ default: () => null }));
vi.mock('./screens/RacerEditor/RacerEditor.jsx', () => ({ default: () => null }));
vi.mock('./screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx', () => ({ default: () => null }));
vi.mock('./screens/Auth/LoginScreen.jsx', () => ({ default: () => null }));
vi.mock('./screens/Auth/SetupAdminScreen.jsx', () => ({ default: () => null }));

// ProtectedRoute passes children through — no auth gate in tests
vi.mock('./components/ProtectedRoute.jsx', () => ({
  default: ({ children }) => children,
}));

// BrandingSyncOnAuth + RacerSyncOnAuth + DebugOverlay are no-ops — we control state directly
vi.mock('./components/BrandingSyncOnAuth.jsx', () => ({ default: () => null }));
vi.mock('./components/RacerSyncOnAuth.jsx', () => ({ default: () => null }));
vi.mock('./components/DebugOverlay.jsx', () => ({ default: () => null }));
// RacersReadyGate passes children through — no racer-load gate in tests
vi.mock('./components/RacersReadyGate.jsx', () => ({ default: ({ children }) => children }));

// AuthProvider just renders children
vi.mock('./contexts/AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
}));

// TransitionProvider just renders children
vi.mock('./contexts/TransitionContext.jsx', () => ({
  TransitionProvider: ({ children }) => children,
  useFadeNavigate: () => () => {},
}));

import App from './App.jsx';
import { storageSet, KEYS } from './modules/storage/storage.js';

const MOCK_BRAND = {
  id: 'brand-a',
  name: 'Winter Cup',
  eventName: 'Winter Grand Prix',
  primaryColor: '#e63946',
  secondaryColor: '#f4a261',
  logoFile: null,
  logo: '',
  isDefault: false,
};

beforeEach(() => {
  localStorage.clear();
  document.title = 'RaceArena';
});

afterEach(() => {
  document.title = 'RaceArena';
});

// ── Honesty proof (L126) ──────────────────────────────────────────────────────

describe('App — document.title reactivity (D4 honesty proof, Copilot Punkt 8)', () => {
  it('title is default when mirror is empty at mount even if session points to a brand', () => {
    // ACTIVE_SESSION has a brand id but BRANDING mirror is empty — resolves to null
    localStorage.setItem(
      KEYS.ACTIVE_SESSION,
      JSON.stringify({ activeBrandingProfileId: 'brand-a' })
    );
    render(<App />);
    expect(document.title).toBe('RaceArena');
  });

  it('title updates reactively when storageSet fills the mirror after mount', async () => {
    // Same session setup — mirror starts empty
    localStorage.setItem(
      KEYS.ACTIVE_SESSION,
      JSON.stringify({ activeBrandingProfileId: 'brand-a' })
    );
    render(<App />);
    expect(document.title).toBe('RaceArena'); // mirror empty → default

    // syncBrandingMirror fills the mirror — STORAGE_CHANGE_EVENT fires
    await act(async () => {
      storageSet(KEYS.BRANDING, [MOCK_BRAND]);
    });

    // useActiveBrandProfile() re-resolves → title updates
    expect(document.title).toBe('Winter Grand Prix — RaceArena');
  });

  it('title stays default when no brand session is active', async () => {
    // BRANDING is pre-filled but no session selected
    await act(async () => {
      storageSet(KEYS.BRANDING, [MOCK_BRAND]);
    });
    render(<App />);
    expect(document.title).toBe('RaceArena');
  });

  it('title resets to default when brand is deselected via ACTIVE_SESSION update', async () => {
    localStorage.setItem(
      KEYS.ACTIVE_SESSION,
      JSON.stringify({ activeBrandingProfileId: 'brand-a' })
    );
    localStorage.setItem(KEYS.BRANDING, JSON.stringify([MOCK_BRAND]));

    render(<App />);
    expect(document.title).toBe('Winter Grand Prix — RaceArena');

    await act(async () => {
      storageSet(KEYS.ACTIVE_SESSION, { activeBrandingProfileId: null });
    });

    expect(document.title).toBe('RaceArena');
  });
});
