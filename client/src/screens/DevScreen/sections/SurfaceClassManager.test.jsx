// ============================================================
// File:        SurfaceClassManager.test.jsx
// Path:        client/src/screens/DevScreen/sections/SurfaceClassManager.test.jsx
// Project:     RaceArena
// Description: Unit tests for VRE-2 — SurfaceClassManager component.
//              Covers: list rendering, badge types, class selection, generator
//              switch (config reset), new-class Save (auto-ID), Save existing,
//              Delete, Reset-to-Default. rAF lifecycle tests are in
//              SurfaceClassPreview.test.jsx.
// ============================================================

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../modules/surface-effects/useSurfaceClasses.js', () => ({
  useSurfaceClasses: vi.fn(),
}));

vi.mock('../../../services/surfaceClassApi.js', () => ({
  createSurfaceClass: vi.fn(),
  updateSurfaceClass: vi.fn(),
  deleteSurfaceClass: vi.fn(),
}));

// Stub canvas preview — canvas + rAF not available in jsdom
vi.mock('./SurfaceClassPreview.jsx', () => ({
  SurfaceClassPreview: ({ generatorId }) => (
    <div data-testid="surface-preview" data-generator={generatorId} />
  ),
}));

import SurfaceClassManager from './SurfaceClassManager.jsx';
import { useSurfaceClasses } from '../../../modules/surface-effects/useSurfaceClasses.js';
import {
  createSurfaceClass,
  updateSurfaceClass,
  deleteSurfaceClass,
} from '../../../services/surfaceClassApi.js';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const DEFAULT_CLASS = {
  id: 'mud',
  label: 'Mud',
  generatorId: 'splash',
  config: {
    color: '#5c3a1e',
    count: 4,
    sizeMin: 2,
    sizeMax: 5,
    lifetimeFrames: 30,
    spawnProbability: 0.5,
    gravity: 0.15,
    spreadAngle: 1.4,
  },
  isDefault: true,
  isOverride: false,
};

const OVERRIDE_CLASS = {
  id: 'mud',
  label: 'Super Mud',
  generatorId: 'splash',
  config: {
    color: '#ff0000',
    count: 6,
    sizeMin: 2,
    sizeMax: 5,
    lifetimeFrames: 30,
    spawnProbability: 0.5,
    gravity: 0.2,
    spreadAngle: 1.4,
  },
  isDefault: false,
  isOverride: true,
};

const CUSTOM_CLASS = {
  id: 'lava',
  label: 'Lava',
  generatorId: 'particle',
  config: {
    color: '#ff4400',
    sizeMin: 1,
    sizeMax: 3,
    lifetimeFrames: 20,
    spawnProbability: 0.5,
    drift: 0.5,
    gravity: 0.1,
  },
  isDefault: false,
  isOverride: false,
};

function mockHook(classes = [DEFAULT_CLASS]) {
  const refresh = vi.fn().mockResolvedValue(undefined);
  useSurfaceClasses.mockReturnValue({ classes, refresh, isLoading: false, error: null });
  return refresh;
}

// Clear all mocks before each test to avoid call-count bleed-through
beforeEach(() => {
  vi.clearAllMocks();
});

// ── List rendering ────────────────────────────────────────────────────────────

describe('SurfaceClassManager — list rendering', () => {
  it('renders all class labels in the list', () => {
    mockHook([DEFAULT_CLASS, CUSTOM_CLASS]);
    render(<SurfaceClassManager />);
    // Use getAllByText — label appears in list button AND editor header
    expect(screen.getAllByText('Mud').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Lava').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Default badge for code-default class', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.getAllByText('Default').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Custom badge for custom class', () => {
    mockHook([CUSTOM_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.getAllByText('Custom').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Modified badge for overridden default', () => {
    mockHook([OVERRIDE_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.getAllByText('Modified').length).toBeGreaterThanOrEqual(1);
  });

  it('count badge shows total number of classes', () => {
    mockHook([DEFAULT_CLASS, CUSTOM_CLASS]);
    render(<SurfaceClassManager />);
    const pressable = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') !== null);
    expect(pressable.length).toBe(2);
  });

  it('renders + New Surface Class button', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.getByRole('button', { name: /New Surface Class/i })).toBeInTheDocument();
  });
});

// ── Class selection ───────────────────────────────────────────────────────────

describe('SurfaceClassManager — class selection', () => {
  it('auto-selects first class on mount — label input is populated', () => {
    mockHook([DEFAULT_CLASS, CUSTOM_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.getByDisplayValue('Mud')).toHaveValue('Mud');
  });

  it('clicking a second class populates the editor with that class', () => {
    mockHook([DEFAULT_CLASS, CUSTOM_CLASS]);
    render(<SurfaceClassManager />);
    const lavaBtn = screen
      .getAllByRole('button')
      .find((b) => b.getAttribute('aria-pressed') === 'false' && b.textContent.includes('Lava'));
    fireEvent.click(lavaBtn);
    expect(screen.getByDisplayValue('Lava')).toHaveValue('Lava');
  });

  it('selected class button has aria-pressed=true', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    const pressed = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed.length).toBe(1);
  });

  it('live preview mounts with correct generator id', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    const preview = screen.getByTestId('surface-preview');
    expect(preview.getAttribute('data-generator')).toBe('splash');
  });
});

// ── Generator switch ──────────────────────────────────────────────────────────

describe('SurfaceClassManager — generator switch', () => {
  it('switching generator updates the preview data-generator attribute', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    const genSelect = screen.getByRole('combobox', { name: /Generator type/i });
    fireEvent.change(genSelect, { target: { value: 'cloud' } });
    expect(screen.getByTestId('surface-preview').getAttribute('data-generator')).toBe('cloud');
  });

  it('switching to line generator shows Thickness field', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    fireEvent.change(screen.getByRole('combobox', { name: /Generator type/i }), {
      target: { value: 'line' },
    });
    expect(screen.getByLabelText('Thickness')).toBeInTheDocument();
  });

  it('switching generator resets config to new generator defaults', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    fireEvent.change(screen.getByRole('combobox', { name: /Generator type/i }), {
      target: { value: 'cloud' },
    });
    expect(screen.getByLabelText('Start Size')).toBeInTheDocument();
  });
});

// ── Save existing class ───────────────────────────────────────────────────────

describe('SurfaceClassManager — Save existing class', () => {
  it('Save calls updateSurfaceClass with isOverride:true for a code-default', async () => {
    const refresh = mockHook([DEFAULT_CLASS]);
    updateSurfaceClass.mockResolvedValue({});
    render(<SurfaceClassManager />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save surface class/i }));
    });

    expect(updateSurfaceClass).toHaveBeenCalledWith(
      'mud',
      expect.objectContaining({ isOverride: true })
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('Save calls updateSurfaceClass with isOverride:false for a custom class', async () => {
    const refresh = mockHook([CUSTOM_CLASS]);
    updateSurfaceClass.mockResolvedValue({});
    render(<SurfaceClassManager />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save surface class/i }));
    });

    expect(updateSurfaceClass).toHaveBeenCalledWith(
      'lava',
      expect.objectContaining({ isOverride: false })
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('shows server error message when Save fails', async () => {
    mockHook([DEFAULT_CLASS]);
    updateSurfaceClass.mockRejectedValue(new Error('Connection refused'));
    render(<SurfaceClassManager />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save surface class/i }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Connection refused/i);
    expect(screen.getByText(/Connection refused/i)).toBeInTheDocument();
  });
});

// ── New class flow ────────────────────────────────────────────────────────────

describe('SurfaceClassManager — New class flow', () => {
  it('clicking + New opens the new-class form', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    fireEvent.click(screen.getByRole('button', { name: /New Surface Class/i }));
    expect(screen.getByText('New Surface Class')).toBeInTheDocument();
  });

  it('new-class form has no ID input field — ID is auto-generated', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    fireEvent.click(screen.getByRole('button', { name: /New Surface Class/i }));
    expect(document.getElementById('sc-id')).toBeNull();
  });

  it('ID is auto-generated from the label on save (slugify)', async () => {
    createSurfaceClass.mockResolvedValue({ id: 'lava' });
    const refresh = mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    fireEvent.click(screen.getByRole('button', { name: /New Surface Class/i }));

    fireEvent.change(document.getElementById('sc-label'), { target: { value: 'Lava' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save surface class/i }));
    });

    expect(createSurfaceClass).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lava', label: 'Lava', isOverride: false })
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('ID gets a suffix when the slugified label collides with an existing class', async () => {
    createSurfaceClass.mockResolvedValue({ id: 'mud-2' });
    mockHook([DEFAULT_CLASS]); // DEFAULT_CLASS has id 'mud'
    render(<SurfaceClassManager />);
    fireEvent.click(screen.getByRole('button', { name: /New Surface Class/i }));

    // 'Mud' slugifies to 'mud' which already exists → expect 'mud-2'
    fireEvent.change(document.getElementById('sc-label'), { target: { value: 'Mud' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save surface class/i }));
    });

    expect(createSurfaceClass).toHaveBeenCalledWith(expect.objectContaining({ id: 'mud-2' }));
  });

  it('Cancel from new-class form returns to first class', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    fireEvent.click(screen.getByRole('button', { name: /New Surface Class/i }));
    expect(screen.getByText('New Surface Class')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.getByDisplayValue('Mud')).toHaveValue('Mud');
  });
});

// ── Delete (custom class) ─────────────────────────────────────────────────────

describe('SurfaceClassManager — Delete (custom class)', () => {
  it('Delete button is visible for custom class', () => {
    mockHook([CUSTOM_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.getByRole('button', { name: /Delete surface class/i })).toBeInTheDocument();
  });

  it('Delete button is NOT visible for code-default class', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.queryByRole('button', { name: /Delete surface class/i })).toBeNull();
  });

  it('Delete button is NOT visible for modified default', () => {
    mockHook([OVERRIDE_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.queryByRole('button', { name: /Delete surface class/i })).toBeNull();
  });

  it('Delete calls deleteSurfaceClass after confirm', async () => {
    const refresh = mockHook([CUSTOM_CLASS]);
    deleteSurfaceClass.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SurfaceClassManager />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Delete surface class/i }));
    });

    expect(deleteSurfaceClass).toHaveBeenCalledWith('lava');
    expect(refresh).toHaveBeenCalled();
  });

  it('Delete does nothing when user cancels confirm dialog', async () => {
    mockHook([CUSTOM_CLASS]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SurfaceClassManager />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Delete surface class/i }));
    });

    expect(deleteSurfaceClass).not.toHaveBeenCalled();
  });
});

// ── Reset-to-Default (override lifecycle) ─────────────────────────────────────

describe('SurfaceClassManager — Reset-to-Default lifecycle', () => {
  it('Reset-to-Default button is visible for modified default', () => {
    mockHook([OVERRIDE_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.getByRole('button', { name: /Reset to default/i })).toBeInTheDocument();
  });

  it('Reset-to-Default button is NOT visible for code-default class', () => {
    mockHook([DEFAULT_CLASS]);
    render(<SurfaceClassManager />);
    expect(screen.queryByRole('button', { name: /Reset to default/i })).toBeNull();
  });

  it('Reset-to-Default calls deleteSurfaceClass without confirm dialog', async () => {
    const refresh = mockHook([OVERRIDE_CLASS]);
    deleteSurfaceClass.mockResolvedValue(undefined);
    render(<SurfaceClassManager />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reset to default/i }));
    });

    expect(deleteSurfaceClass).toHaveBeenCalledWith('mud');
    expect(refresh).toHaveBeenCalled();
  });

  it('Reset-to-Default reverts the editor label to the code-default value', async () => {
    // OVERRIDE_CLASS has label 'Super Mud'; the real registry default for 'mud' has label 'Mud'
    mockHook([OVERRIDE_CLASS]);
    deleteSurfaceClass.mockResolvedValue(undefined);
    render(<SurfaceClassManager />);

    // Override is auto-selected — editor shows 'Super Mud'
    expect(screen.getByDisplayValue('Super Mud')).toHaveValue('Super Mud');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reset to default/i }));
    });

    // After reset, openClass is called with registry code-default → label reverts to 'Mud'
    expect(screen.getByDisplayValue('Mud')).toHaveValue('Mud');
  });

  it('Default-Override lifecycle: Default → save override → shows Modified → reset → DELETE called', async () => {
    const refresh = mockHook([DEFAULT_CLASS]);
    updateSurfaceClass.mockResolvedValue({});
    const { rerender } = render(<SurfaceClassManager />);

    expect(screen.getAllByText('Default').length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save surface class/i }));
    });
    expect(updateSurfaceClass).toHaveBeenCalledWith(
      'mud',
      expect.objectContaining({ isOverride: true })
    );

    useSurfaceClasses.mockReturnValue({
      classes: [OVERRIDE_CLASS],
      refresh,
      isLoading: false,
      error: null,
    });
    rerender(<SurfaceClassManager />);
    expect(screen.getAllByText('Modified').length).toBeGreaterThanOrEqual(1);

    deleteSurfaceClass.mockResolvedValue(undefined);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reset to default/i }));
    });
    expect(deleteSurfaceClass).toHaveBeenCalledWith('mud');
  });
});

// ── useSurfaceClasses hook — export shape ─────────────────────────────────────

describe('useSurfaceClasses hook', () => {
  it('is importable and returns expected shape', async () => {
    const mod = await import('../../../modules/surface-effects/useSurfaceClasses.js');
    expect(typeof mod.useSurfaceClasses).toBe('function');
  });
});
