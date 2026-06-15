// ============================================================
// File:        BrandingProfiles.test.jsx
// Path:        client/src/screens/DevScreen/sections/BrandingProfiles.test.jsx
// Project:     RaceArena
// Description: Tests for BrandingProfiles after D4 (server-backed).
//              Covers: initial load from server, CRUD → API calls, loading/error
//              states, default-brand 403 shown as visible error, logo upload,
//              and mirror sync after mutations.
// ============================================================

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../services/brandApi.js', () => ({
  fetchBrands: vi.fn(),
  createBrand: vi.fn(),
  updateBrand: vi.fn(),
  deleteBrand: vi.fn(),
  uploadBrandLogo: vi.fn(),
  deleteBrandLogo: vi.fn(),
}));

vi.mock('../../../modules/branding/brandingSync.js', () => ({
  syncBrandingMirror: vi.fn().mockResolvedValue(undefined),
}));

import BrandingProfiles from './BrandingProfiles.jsx';
import {
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
} from '../../../services/brandApi.js';
import { syncBrandingMirror } from '../../../modules/branding/brandingSync.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CUSTOM_BRAND = {
  id: 'brand-a',
  name: 'Christmas Party',
  eventName: 'Winter Race Championship',
  subtitle: '',
  primaryColor: '#e63946',
  secondaryColor: '#f4a261',
  sponsorText: '',
  logoFile: null,
  logo: '',
  isDefault: false,
  logoMaxHeight: 90,
  logoOpacity: 0.9,
  logoCorner: 'bottom-right',
};

const DEFAULT_BRAND = {
  id: 'seasonal-entertainment',
  name: 'Seasonal Entertainment',
  eventName: 'Seasonal Race',
  subtitle: '',
  primaryColor: '#2e9e3f',
  secondaryColor: '#f4a261',
  sponsorText: '',
  logoFile: 'seasonal-entertainment.jpg',
  logo: 'http://localhost:4000/api/brands/seasonal-entertainment/logo',
  isDefault: true,
  logoMaxHeight: 90,
  logoOpacity: 0.9,
  logoCorner: 'bottom-right',
};

function renderProfiles() {
  return render(<BrandingProfiles />);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchBrands.mockResolvedValue([CUSTOM_BRAND]);
  syncBrandingMirror.mockResolvedValue(undefined);
});

// ── Initial load from server ──────────────────────────────────────────────────

describe('BrandingProfiles — initial load from server', () => {
  it('renders loading state before data arrives', async () => {
    fetchBrands.mockReturnValue(new Promise(() => {})); // never resolves
    renderProfiles();
    expect(screen.getByText(/Loading brands/i)).toBeTruthy();
  });

  it('renders brand name from server after load', async () => {
    renderProfiles();
    await waitFor(() => expect(screen.getByText('Christmas Party')).toBeTruthy());
  });

  it('calls fetchBrands on mount', async () => {
    renderProfiles();
    await waitFor(() => expect(fetchBrands).toHaveBeenCalled());
  });

  it('renders section header', async () => {
    renderProfiles();
    await waitFor(() => expect(screen.getByText(/Branding Profiles/)).toBeTruthy());
  });

  it('shows empty state when server returns no brands', async () => {
    fetchBrands.mockResolvedValue([]);
    renderProfiles();
    await waitFor(() => expect(screen.getByText(/No branding profiles yet/i)).toBeTruthy());
  });

  it('shows ★ Default badge for default brand', async () => {
    fetchBrands.mockResolvedValue([DEFAULT_BRAND]);
    renderProfiles();
    await waitFor(() => expect(screen.getByText('★ Default')).toBeTruthy());
  });
});

// ── Load error state ──────────────────────────────────────────────────────────

describe('BrandingProfiles — server load error', () => {
  it('shows role=alert error message when fetchBrands fails', async () => {
    fetchBrands.mockRejectedValue(new Error('Server not reachable'));
    renderProfiles();
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toMatch(/Server not reachable/i);
    });
  });

  it('does not show the brand list when load fails', async () => {
    fetchBrands.mockRejectedValue(new Error('Network error'));
    renderProfiles();
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.queryByText('Christmas Party')).toBeNull();
  });
});

// ── CRUD — create ─────────────────────────────────────────────────────────────

describe('BrandingProfiles — create brand', () => {
  it('Create Profile calls createBrand with name and eventName', async () => {
    createBrand.mockResolvedValue({ ...CUSTOM_BRAND, id: 'new-id', name: 'New Event' });
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByText('+ New Profile'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Party'), {
      target: { value: 'New Event' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Winter Race Championship'), {
      target: { value: 'Grand Prix' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Profile'));
    });

    expect(createBrand).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Event', eventName: 'Grand Prix' })
    );
  });

  it('does NOT send a logo field in the record body', async () => {
    createBrand.mockResolvedValue({ ...CUSTOM_BRAND, id: 'new-id' });
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByText('+ New Profile'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Party'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Winter Race Championship'), {
      target: { value: 'Y' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Profile'));
    });

    const [data] = createBrand.mock.calls[0];
    expect(data).not.toHaveProperty('logo');
  });

  it('calls fetchBrands again after create (refresh)', async () => {
    createBrand.mockResolvedValue({ ...CUSTOM_BRAND, id: 'new-id' });
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));
    const callsBefore = fetchBrands.mock.calls.length;

    fireEvent.click(screen.getByText('+ New Profile'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Party'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Winter Race Championship'), {
      target: { value: 'Y' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Profile'));
    });

    expect(fetchBrands.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('calls syncBrandingMirror after create', async () => {
    createBrand.mockResolvedValue({ ...CUSTOM_BRAND, id: 'new-id' });
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByText('+ New Profile'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Party'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Winter Race Championship'), {
      target: { value: 'Y' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Profile'));
    });

    expect(syncBrandingMirror).toHaveBeenCalled();
  });

  it('shows actionError when createBrand throws', async () => {
    createBrand.mockRejectedValue(new Error('name is required'));
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByText('+ New Profile'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Party'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Winter Race Championship'), {
      target: { value: 'Y' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Profile'));
    });

    expect(screen.getByRole('alert').textContent).toMatch(/name is required/i);
  });
});

// ── CRUD — update ─────────────────────────────────────────────────────────────

describe('BrandingProfiles — update brand', () => {
  it('Edit → Save Changes calls updateBrand with the brand id', async () => {
    updateBrand.mockResolvedValue({ ...CUSTOM_BRAND, name: 'Updated' });
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByTitle('Edit'));
    const nameInput = screen.getByPlaceholderText('e.g. Christmas Party');
    fireEvent.change(nameInput, { target: { value: 'Updated' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(updateBrand).toHaveBeenCalledWith(
      'brand-a',
      expect.objectContaining({ name: 'Updated' })
    );
  });

  it('calls syncBrandingMirror after update', async () => {
    updateBrand.mockResolvedValue(CUSTOM_BRAND);
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByTitle('Edit'));

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(syncBrandingMirror).toHaveBeenCalled();
  });
});

// ── Logo upload ───────────────────────────────────────────────────────────────

describe('BrandingProfiles — logo upload', () => {
  it('calls uploadBrandLogo after create when a file is selected', async () => {
    const createdId = 'new-brand-id';
    createBrand.mockResolvedValue({ ...CUSTOM_BRAND, id: createdId });
    uploadBrandLogo.mockResolvedValue({ logoFile: `${createdId}.png` });

    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByText('+ New Profile'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Party'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Winter Race Championship'), {
      target: { value: 'Y' },
    });

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fireEvent.change(fileInput);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Profile'));
    });

    expect(uploadBrandLogo).toHaveBeenCalledWith(createdId, file);
  });

  it('does NOT call uploadBrandLogo when no file is chosen', async () => {
    createBrand.mockResolvedValue({ ...CUSTOM_BRAND, id: 'new-id' });
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    fireEvent.click(screen.getByText('+ New Profile'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Party'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Winter Race Championship'), {
      target: { value: 'Y' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Profile'));
    });

    expect(uploadBrandLogo).not.toHaveBeenCalled();
  });
});

// ── CRUD — delete ─────────────────────────────────────────────────────────────

describe('BrandingProfiles — delete brand', () => {
  it('Delete calls deleteBrand after confirm', async () => {
    deleteBrand.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    await act(async () => {
      fireEvent.click(screen.getByTitle('Delete'));
    });

    expect(deleteBrand).toHaveBeenCalledWith('brand-a');
  });

  it('Delete does nothing when user cancels confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    await act(async () => {
      fireEvent.click(screen.getByTitle('Delete'));
    });

    expect(deleteBrand).not.toHaveBeenCalled();
  });

  it('calls syncBrandingMirror after delete', async () => {
    deleteBrand.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderProfiles();
    await waitFor(() => screen.getByText('Christmas Party'));

    await act(async () => {
      fireEvent.click(screen.getByTitle('Delete'));
    });

    expect(syncBrandingMirror).toHaveBeenCalled();
  });
});

// ── Default brand: 403 shown as visible error ─────────────────────────────────

describe('BrandingProfiles — default brand 403 visible error', () => {
  it('shows role=alert with server 403 message when deleting a default brand', async () => {
    fetchBrands.mockResolvedValue([DEFAULT_BRAND]);
    const err = Object.assign(new Error('Cannot delete a default brand'), { status: 403 });
    deleteBrand.mockRejectedValue(err);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderProfiles();
    await waitFor(() => screen.getByText('Seasonal Entertainment'));

    await act(async () => {
      fireEvent.click(screen.getByTitle('Delete'));
    });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/Cannot delete a default brand/i);
  });
});

// ── Tooltip render ────────────────────────────────────────────────────────────

describe('BrandingProfiles — tooltip render', () => {
  it('renders without crashing', async () => {
    renderProfiles();
    await waitFor(() => expect(screen.getByText(/Branding Profiles/)).toBeTruthy());
  });

  it('renders sponsor overlay info tooltips', async () => {
    renderProfiles();
    await waitFor(() => screen.getByText(/Branding Profiles/));
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips.some((el) => el.textContent.includes('sponsor branding'))).toBe(true);
    expect(tooltips.some((el) => el.textContent.includes('important race action'))).toBe(true);
  });

  it('renders form field tooltips when the new-profile form is open', async () => {
    renderProfiles();
    await waitFor(() => screen.getByText('+ New Profile'));
    fireEvent.click(screen.getByText('+ New Profile'));
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips.some((el) => el.textContent.includes('helps you recognize it'))).toBe(true);
    expect(tooltips.some((el) => el.textContent.includes('main accent color'))).toBe(true);
  });
});
