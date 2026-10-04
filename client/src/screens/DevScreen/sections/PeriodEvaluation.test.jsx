// PERIOD-EVALUATION-1: the section — the owner's decisions of 2026-10-04 as they show on screen: the
// current month preselected, UTC days, the one-year limit explained, and the points rule read from
// the server, set by an admin only. The server calls are stubbed; the rules themselves are tested
// server-side (server/src/races/periodEvaluation.test.js).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

let role = 'operator';
vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { username: 'u', role } }),
}));

let storedRule = { pointsEnabled: false, pointsPerPlace: [] };
vi.mock('../../../services/racesApi.js', () => ({
  fetchPeriodEvaluation: vi.fn(async (from, to) => ({
    from,
    to,
    counted: 2,
    quickTestsExcluded: 1,
    rows: [
      { name: 'Bob', races: 2, wins: 1, podiums: 1, places: { 1: 1, 4: 1 } },
      { name: 'Ada', races: 2, wins: 1, podiums: 2, places: { 1: 1, 2: 1 } },
    ],
  })),
  fetchPointsRule: vi.fn(async () => storedRule),
  savePointsRule: vi.fn(async (rule) => rule),
}));

import PeriodEvaluation, { currentMonthUtc, periodProblem } from './PeriodEvaluation.jsx';
import {
  fetchPeriodEvaluation,
  fetchPointsRule,
  savePointsRule,
} from '../../../services/racesApi.js';

beforeEach(() => {
  role = 'operator';
  storedRule = { pointsEnabled: false, pointsPerPlace: [] };
  vi.mocked(fetchPeriodEvaluation).mockClear();
  vi.mocked(savePointsRule).mockClear();
});
afterEach(() => vi.useRealTimers());

async function shown() {
  render(<PeriodEvaluation />);
  await waitFor(() => expect(fetchPointsRule).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByLabelText(/^Points per place/)).toBeTruthy());
}

async function loadTable() {
  await shown();
  fireEvent.click(screen.getByTestId('period-evaluation-load'));
  await waitFor(() => screen.getByTestId('period-evaluation-table'));
  return screen.getByTestId('period-evaluation-table');
}

const cellsOf = (table, row) =>
  within(within(table).getAllByRole('row')[row])
    .getAllByRole('cell')
    .map((c) => c.textContent);
const nameInRow = (table, row) => cellsOf(table, row)[1];

const headersOf = (table) =>
  within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent);

describe('PeriodEvaluation — the period', () => {
  it('★ preselects the CURRENT MONTH, first day to last, in UTC', async () => {
    expect(currentMonthUtc(new Date('2026-02-10T23:30:00Z'))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    // 00:30 UTC on 1 March is still February somewhere west of UTC — the month is UTC's.
    expect(currentMonthUtc(new Date('2026-03-01T00:30:00Z')).from).toBe('2026-03-01');
    await shown();
    const now = currentMonthUtc();
    expect(screen.getByLabelText(/^From/).value).toBe(now.from);
    expect(screen.getByLabelText(/^To/).value).toBe(now.to);
  });

  it('★ asks for whole UTC days: 00:00 UTC of the first to 00:00 UTC after the last', async () => {
    await shown();
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: '2026-10-03' } });
    fireEvent.click(screen.getByTestId('period-evaluation-load'));
    await waitFor(() => expect(fetchPeriodEvaluation).toHaveBeenCalled());
    expect(fetchPeriodEvaluation.mock.calls[0]).toEqual([
      '2026-10-01T00:00:00.000Z',
      '2026-10-04T00:00:00.000Z',
    ]);
  });

  it('★ a period over 366 days is refused BEFORE asking, with the reason', async () => {
    // Both days count whole: 1 Jan 2028 to 31 Dec 2028 is a leap year, 366 days — allowed.
    expect(periodProblem('2028-01-01', '2028-12-31')).toBe('');
    expect(periodProblem('2026-01-01', '2027-01-01')).toBe(''); // 365 + the last day = 366
    await shown();
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: '2026-01-02' } });
    fireEvent.click(screen.getByTestId('period-evaluation-load'));
    expect(screen.getByTestId('period-evaluation-error').textContent).toBe(
      'A period can be at most 366 days long, and this one is 367. Choose a shorter period.'
    );
    expect(fetchPeriodEvaluation).not.toHaveBeenCalled();
  });
});

describe('PeriodEvaluation — the table', () => {
  it('by default shows races, wins, 2nd and 3rd places, podiums — and NO points column', async () => {
    const table = await loadTable();
    expect(headersOf(table)).toEqual(['Place', 'Name', 'Races', 'Wins', '2nd', '3rd', 'Podiums']);
    // The server's order is kept as it came.
    expect(nameInRow(table, 1)).toBe('Bob');
  });

  it("with the SERVER's points rule on, adds Points and orders by them", async () => {
    storedRule = { pointsEnabled: true, pointsPerPlace: [3, 2, 1] };
    const table = await loadTable();
    expect(headersOf(table)).toEqual([
      'Place',
      'Name',
      'Races',
      'Wins',
      '2nd',
      '3rd',
      'Podiums',
      'Points',
    ]);
    expect(nameInRow(table, 1)).toBe('Ada'); // 5 against Bob's 3
  });
});

describe('PeriodEvaluation — the points rule is set by an admin only', () => {
  it('★ for everyone else the controls are DISABLED, with a note saying why', async () => {
    await shown();
    expect(screen.getByLabelText(/^Award points/).disabled).toBe(true);
    expect(screen.getByLabelText(/^Points per place/).disabled).toBe(true);
    expect(screen.queryByTestId('points-rule-save')).toBeNull();
    expect(screen.getByTestId('points-rule-admin-note').textContent).toMatch(
      /Only an admin can change it/
    );
  });

  it('an admin can set it, and it is saved to the server', async () => {
    role = 'admin';
    await shown();
    expect(screen.queryByTestId('points-rule-admin-note')).toBeNull();
    fireEvent.click(screen.getByLabelText(/^Award points/));
    fireEvent.change(screen.getByLabelText(/^Points per place/), {
      target: { value: '10, 6, 4' },
    });
    fireEvent.click(screen.getByTestId('points-rule-save'));
    await waitFor(() =>
      expect(savePointsRule).toHaveBeenCalledWith({
        pointsEnabled: true,
        pointsPerPlace: [10, 6, 4],
      })
    );
    expect(await screen.findByText(/the points rule for everyone on this server/)).toBeTruthy();
  });
});

describe('PeriodEvaluation — the look (the owner, 2026-10-04: restyle it)', () => {
  it('★ every header is its own column, a Place column leads, and equal rows share a place', async () => {
    vi.mocked(fetchPeriodEvaluation).mockResolvedValueOnce({
      from: 'a',
      to: 'b',
      counted: 3,
      quickTestsExcluded: 0,
      rows: [
        { name: 'Ada', races: 3, wins: 2, podiums: 3, places: { 1: 2, 2: 1 } },
        { name: 'Bob', races: 3, wins: 1, podiums: 2, places: { 1: 1, 3: 1 } },
        { name: 'Cy', races: 3, wins: 1, podiums: 2, places: { 1: 1, 3: 1 } },
        { name: 'Dee', races: 2, wins: 0, podiums: 0, places: { 4: 2 } },
      ],
    });
    const table = await loadTable();
    const headers = within(table).getAllByRole('columnheader');
    // Separate cells, each with its own text — not one run-together header.
    expect(headers).toHaveLength(7);
    expect(headers.map((h) => h.textContent)).toEqual([
      'Place',
      'Name',
      'Races',
      'Wins',
      '2nd',
      '3rd',
      'Podiums',
    ]);
    // Bob and Cy are equal on wins, 2nds, 3rds and races: they share 2nd, and Dee is 4th.
    expect([1, 2, 3, 4].map((row) => cellsOf(table, row)[0])).toEqual(['1', '2', '2', '4']);
    expect(cellsOf(table, 1)).toEqual(['1', 'Ada', '3', '2', '1', '0', '3']);
  });

  it('an empty period says so in one line instead of showing an empty table', async () => {
    vi.mocked(fetchPeriodEvaluation).mockResolvedValueOnce({
      from: 'a',
      to: 'b',
      counted: 0,
      quickTestsExcluded: 2,
      rows: [],
    });
    await shown();
    fireEvent.click(screen.getByTestId('period-evaluation-load'));
    expect((await screen.findByTestId('period-evaluation-empty')).textContent).toBe(
      'No real race was finished in this period.'
    );
    expect(screen.queryByTestId('period-evaluation-table')).toBeNull();
  });
});
