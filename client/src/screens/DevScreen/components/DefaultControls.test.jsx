// ============================================================
// File:        DefaultControls.test.jsx
// Path:        client/src/screens/DevScreen/components/DefaultControls.test.jsx
// Project:     RaceArena
// Description: Tests for DefaultControls shared admin component.
//              Includes L126 honesty proof: operator sees nothing.
// ============================================================

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

import { DefaultControls } from './DefaultControls.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProps(overrides = {}) {
  return {
    id: 'item-abc',
    isDefault: false,
    onChanged: vi.fn().mockResolvedValue(undefined),
    setDefault: vi.fn().mockResolvedValue({}),
    clearDefault: vi.fn().mockResolvedValue({}),
    exportSeed: vi.fn().mockResolvedValue({ id: 'item-abc', name: 'Test' }),
    seedFilename: 'item-abc.json',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'admin' } });
});

// ── L126 HONESTY PROOF — operator sees nothing ────────────────────────────────
// RED without the admin gate (buttons were visible for all roles).
// GREEN after `if (user?.role !== 'admin') return null;` was added.

describe('DefaultControls — L126: operator role renders nothing', () => {
  it('renders null for role=operator (admin gate)', () => {
    useAuth.mockReturnValue({ user: { role: 'operator' } });
    const { container } = render(<DefaultControls {...makeProps()} />);
    expect(container.firstChild).toBeNull();
  });
});

// ── Admin role ────────────────────────────────────────────────────────────────

describe('DefaultControls — admin role, not default', () => {
  it('shows "Als Default setzen" when isDefault=false', () => {
    render(<DefaultControls {...makeProps({ isDefault: false })} />);
    expect(screen.getByText('Als Default setzen')).toBeInTheDocument();
    expect(screen.queryByText('Default entfernen')).toBeNull();
  });

  it('calls setDefault(id) then onChanged() when "Als Default setzen" clicked', async () => {
    const props = makeProps({ isDefault: false });
    render(<DefaultControls {...props} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Als Default setzen'));
    });
    expect(props.setDefault).toHaveBeenCalledWith('item-abc');
    expect(props.onChanged).toHaveBeenCalledOnce();
  });
});

describe('DefaultControls — admin role, is default', () => {
  it('shows "Default entfernen" when isDefault=true', () => {
    render(<DefaultControls {...makeProps({ isDefault: true })} />);
    expect(screen.getByText('Default entfernen')).toBeInTheDocument();
    expect(screen.queryByText('Als Default setzen')).toBeNull();
  });

  it('calls clearDefault(id) then onChanged() when "Default entfernen" clicked', async () => {
    const props = makeProps({ isDefault: true });
    render(<DefaultControls {...props} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Default entfernen'));
    });
    expect(props.clearDefault).toHaveBeenCalledWith('item-abc');
    expect(props.onChanged).toHaveBeenCalledOnce();
  });
});

describe('DefaultControls — export seed', () => {
  it('always shows "Als Seed exportieren"', () => {
    render(<DefaultControls {...makeProps()} />);
    expect(screen.getByText('Als Seed exportieren')).toBeInTheDocument();
  });

  it('calls exportSeed(id) and triggers a download on click', async () => {
    const mockUrl = 'blob:http://localhost/fake-url';
    const mockClick = vi.fn();
    const mockAnchor = { href: '', download: '', click: mockClick };

    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag, ...rest) =>
      tag === 'a' ? mockAnchor : origCreate(tag, ...rest)
    );
    const mockCreateObjectURL = vi.fn().mockReturnValue(mockUrl);
    const mockRevokeObjectURL = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(mockCreateObjectURL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(mockRevokeObjectURL);

    const props = makeProps();
    render(<DefaultControls {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Als Seed exportieren'));
    });

    await waitFor(() => {
      expect(props.exportSeed).toHaveBeenCalledWith('item-abc');
    });
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('item-abc.json');
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);

    vi.restoreAllMocks();
  });
});
