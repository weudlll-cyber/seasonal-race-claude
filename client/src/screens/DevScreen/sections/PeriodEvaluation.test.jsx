// PERIOD-EVALUATION-1: the section shows plain counts by default and adds Points only when the rule
// is on with a ladder. The server call is stubbed; its own rules are tested server-side.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../../services/racesApi.js', () => ({
  fetchPeriodEvaluation: vi.fn(async (from, to) => ({
    from,
    to,
    counted: 2,
    quickTestsExcluded: 1,
    rows: [
      { name: 'Ada', races: 2, wins: 1, podiums: 2, places: { 1: 1, 2: 1 } },
      { name: 'Bob', races: 2, wins: 1, podiums: 1, places: { 1: 1, 4: 1 } },
    ],
  })),
}));

import PeriodEvaluation from './PeriodEvaluation.jsx';
import { fetchPeriodEvaluation } from '../../../services/racesApi.js';
import { KEYS } from '../../../modules/storage/storage.js';

beforeEach(() => {
  localStorage.clear();
  fetchPeriodEvaluation.mockClear();
});

async function loadTable() {
  render(<PeriodEvaluation />);
  fireEvent.click(screen.getByTestId('period-evaluation-load'));
  await waitFor(() => screen.getByTestId('period-evaluation-table'));
  return screen.getByTestId('period-evaluation-table');
}

describe('PeriodEvaluation', () => {
  it('by default shows races, wins and podiums, and NO points column', async () => {
    const table = await loadTable();
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Name', 'Races', 'Wins', 'Podiums']);
    expect(screen.getByTestId('period-evaluation-summary').textContent).toMatch(
      /2 race\(s\) counted/
    );
  });

  it('asks for whole local days: from the start of the first to the start of the day after the last', async () => {
    render(<PeriodEvaluation />);
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: '2026-10-03' } });
    fireEvent.click(screen.getByTestId('period-evaluation-load'));
    await waitFor(() => expect(fetchPeriodEvaluation).toHaveBeenCalled());
    const [from, to] = fetchPeriodEvaluation.mock.calls[0];
    expect(from).toBe(new Date(2026, 9, 1).toISOString());
    expect(to).toBe(new Date(2026, 9, 4).toISOString());
  });

  it('with the points rule ON and a ladder, adds Points and orders by them', async () => {
    localStorage.setItem(
      KEYS.PERIOD_EVALUATION_CONFIG,
      JSON.stringify({ pointsEnabled: true, pointsPerPlace: [3, 2, 1] })
    );
    const table = await loadTable();
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Name', 'Races', 'Wins', 'Podiums', 'Points']);
    const firstRow = within(table).getAllByRole('row')[1];
    expect(firstRow.textContent).toMatch(/^Ada/); // Ada 3+2 = 5, Bob 3+0 = 3
  });
});
