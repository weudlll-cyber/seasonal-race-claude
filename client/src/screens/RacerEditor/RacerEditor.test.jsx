// ============================================================
// File:        RacerEditor.test.jsx
// Path:        client/src/screens/RacerEditor/RacerEditor.test.jsx
// Project:     RaceArena
// Created:     2026-05-27
// Description: Component test for RacerEditor — verifies that saved racer
//              types use STANDARD_COAT_PALETTE instead of a single default coat.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRegisterRacerType, mockNavigate } = vi.hoisted(() => ({
  mockRegisterRacerType: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('../../modules/racer-types/index.js', () => ({
  registerRacerType: mockRegisterRacerType,
  RACER_TYPE_IDS: ['horse', 'rocket'],
}));

vi.mock('../../modules/racer-types/racerTypeStorage.js', () => ({
  loadStoredRacerTypes: vi.fn(() => []),
}));

vi.mock('../../utils/slugify.js', () => ({
  slugify: (str) => str.toLowerCase().replace(/\s+/g, '-'),
  uniqueSlug: (base) => base,
}));

vi.mock('./SpriteGeneratorPanel.jsx', () => ({
  SpriteGeneratorPanel: ({ onSpriteDataUrl }) => (
    <button data-testid="load-sprite" onClick={() => onSpriteDataUrl('data:image/png;base64,abc')}>
      Load Sprite
    </button>
  ),
}));

vi.mock('./RacerMetadataPanel.jsx', () => ({
  RacerMetadataPanel: ({ onMetadataChange }) => (
    <button
      data-testid="set-metadata"
      onClick={() =>
        onMetadataChange({
          name: 'Test Racer',
          emoji: '🐎',
          speedMultiplier: 1.0,
          displaySize: 40,
          trailStyle: 'dust',
          surfaceClasses: ['earth'],
          primaryColor: '#ff0000',
        })
      }
    >
      Set Metadata
    </button>
  ),
}));

import RacerEditor from './RacerEditor.jsx';
import { STANDARD_COAT_PALETTE } from '../../modules/racer-types/standardCoats.js';

describe('RacerEditor — save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves racer type with coats equal to STANDARD_COAT_PALETTE', () => {
    render(<RacerEditor />);
    fireEvent.click(screen.getByTestId('load-sprite'));
    fireEvent.click(screen.getByTestId('set-metadata'));
    fireEvent.click(screen.getByRole('button', { name: /Save Racer/i }));
    expect(mockRegisterRacerType).toHaveBeenCalledOnce();
    const payload = mockRegisterRacerType.mock.calls[0][0];
    expect(payload.coats).toEqual(STANDARD_COAT_PALETTE);
    expect(payload.defaultCoatId).toBe(STANDARD_COAT_PALETTE[0].id);
  });
});
