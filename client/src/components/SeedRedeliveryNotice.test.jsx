// ============================================================
// File:        SeedRedeliveryNotice.test.jsx
// Path:        client/src/components/SeedRedeliveryNotice.test.jsx
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: The banner's three obligations: say nothing when nothing is owed, NAME the record
//              when something is, and clear only through the server.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SeedRedeliveryNotice from './SeedRedeliveryNotice.jsx';
import { fetchSeedNotices, dismissSeedNotices } from '../services/seedNoticeApi.js';

vi.mock('../services/seedNoticeApi.js', () => ({
  fetchSeedNotices: vi.fn(),
  dismissSeedNotices: vi.fn(),
}));

const NOTICE = { unit: 'tracks/garden-path', kind: 'track', name: 'Garden Path', from: 1, to: 2 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SeedRedeliveryNotice', () => {
  it('renders nothing when the install is owed nothing', async () => {
    fetchSeedNotices.mockResolvedValue([]);
    const { container } = render(<SeedRedeliveryNotice />);
    await waitFor(() => expect(fetchSeedNotices).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('NAMES the record that was redelivered', async () => {
    fetchSeedNotices.mockResolvedValue([NOTICE]);
    render(<SeedRedeliveryNotice />);
    expect(await screen.findByText('Garden Path')).toBeInTheDocument();
    // The heading says WHAT happened; the list item says WHICH record and of what kind.
    expect(screen.getByText('Updated records replaced your settings')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('track Garden Path');
  });

  it('dismisses through the server and then goes away', async () => {
    fetchSeedNotices.mockResolvedValue([NOTICE]);
    dismissSeedNotices.mockResolvedValue(1);
    render(<SeedRedeliveryNotice />);
    await screen.findByText('Garden Path');
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitFor(() => expect(dismissSeedNotices).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Garden Path')).not.toBeInTheDocument());
  });

  it('KEEPS the banner when the dismissal does not land', async () => {
    // The install still owes the warning, so it must still be on screen.
    fetchSeedNotices.mockResolvedValue([NOTICE]);
    dismissSeedNotices.mockRejectedValue(new Error('offline'));
    render(<SeedRedeliveryNotice />);
    await screen.findByText('Garden Path');
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitFor(() => expect(dismissSeedNotices).toHaveBeenCalled());
    expect(screen.getByText('Garden Path')).toBeInTheDocument();
  });

  it('stays silent when the server cannot be reached at all', async () => {
    fetchSeedNotices.mockRejectedValue(new Error('offline'));
    const { container } = render(<SeedRedeliveryNotice />);
    await waitFor(() => expect(fetchSeedNotices).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
