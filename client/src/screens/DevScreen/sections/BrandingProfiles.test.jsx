// ============================================================
// File:        BrandingProfiles.test.jsx
// Path:        client/src/screens/DevScreen/sections/BrandingProfiles.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Render smoke-tests for BrandingProfiles — verifies section
//              subtitle and tooltip texts render correctly after PR-A3.1.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../modules/storage/useStorage.js', () => ({
  useStorage: vi.fn((_, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../modules/storage/storage.js', () => ({
  KEYS: { BRANDING: 'racearena:branding' },
  newId: vi.fn(() => 'test-id'),
}));

vi.mock('../../../modules/storage/defaults.js', () => ({
  DEFAULT_BRANDING: [],
}));

import BrandingProfiles from './BrandingProfiles.jsx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BrandingProfiles — tooltip render (PR-A3.1)', () => {
  it('renders without crashing', () => {
    render(<BrandingProfiles />);
    expect(screen.getByText(/Branding Profiles/)).toBeTruthy();
  });

  it('renders the section subtitle', () => {
    render(<BrandingProfiles />);
    expect(screen.getByText(/custom look/)).toBeTruthy();
  });

  it('renders sponsor overlay info tooltips', () => {
    render(<BrandingProfiles />);
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    const overlayTip = tooltips.find((el) => el.textContent.includes('sponsor branding'));
    const posTip = tooltips.find((el) => el.textContent.includes('important race action'));
    expect(overlayTip).toBeTruthy();
    expect(posTip).toBeTruthy();
  });

  it('renders form field tooltips when the new-profile form is open', () => {
    render(<BrandingProfiles />);
    fireEvent.click(screen.getByText('+ New Profile'));

    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    const profileNameTip = tooltips.find((el) => el.textContent.includes('helps you recognize it'));
    const primaryColorTip = tooltips.find((el) => el.textContent.includes('main accent color'));
    expect(profileNameTip).toBeTruthy();
    expect(primaryColorTip).toBeTruthy();
  });
});
