// ============================================================
// File:        PeriodEvaluation.jsx
// Path:        client/src/screens/DevScreen/sections/PeriodEvaluation.jsx
// Project:     RaceArena — PERIOD-EVALUATION-1 (2026-10-04)
// Description: The PERIOD EVALUATION the owner commissioned on 2026-09-25: over a period the user
//              chooses, a table of this team's races run in it, counted by NAME. Quick Tests do not
//              count — the server leaves them out (server/src/races/periodEvaluation.js).
//
//              By default it shows plain counts — races, wins, podiums. The POINTS RULE is a setting
//              in this section (`DEFAULT_PERIOD_EVALUATION_CONFIG`), off by default and with no
//              numbers adopted; a Points column appears only when it is on and carries a ladder.
//
//              The period is chosen in LOCAL dates and sent as instants: from the start of the
//              first day to the start of the day after the last, so both chosen days are whole.
// ============================================================

import { useState } from 'react';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { DEFAULT_PERIOD_EVALUATION_CONFIG } from '../../../modules/storage/defaults.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { fetchPeriodEvaluation } from '../../../services/racesApi.js';
import { parsePointsLadder, pointsActive, pointsFor } from '../../../modules/periodPoints.js';
import s from '../DevScreen.module.css';

/** A local calendar date as `YYYY-MM-DD`, for a date input. */
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The instant a local date STARTS, `days` days later. */
const startOfLocalDay = (dateText, days = 0) => {
  const [y, m, d] = dateText.split('-').map(Number);
  return new Date(y, m - 1, d + days).toISOString();
};

export default function PeriodEvaluation() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [toDate, setToDate] = useState(ymd(today));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useStorage(
    KEYS.PERIOD_EVALUATION_CONFIG,
    DEFAULT_PERIOD_EVALUATION_CONFIG
  );
  const [ladderText, setLadderText] = useState((config.pointsPerPlace ?? []).join(', '));

  const withPoints = pointsActive(config);
  const rows = result?.rows ?? [];
  const shown = withPoints
    ? rows
        .map((r) => ({ ...r, points: pointsFor(r, config.pointsPerPlace) }))
        .sort((a, b) => b.points - a.points)
    : rows;

  async function load() {
    setError('');
    if (!fromDate || !toDate || toDate < fromDate) {
      setError('Choose a period whose last day is not before its first.');
      return;
    }
    setLoading(true);
    try {
      setResult(await fetchPeriodEvaluation(startOfLocalDay(fromDate), startOfLocalDay(toDate, 1)));
    } catch (e) {
      setError(e?.message || 'The evaluation could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="period-evaluation">
      <div className={s.formGrid}>
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="pe-from">
            From{' '}
            <InfoTooltip text="The first day of the period, counted whole, in this computer's time zone." />
          </label>
          <input
            id="pe-from"
            type="date"
            className={s.input}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="pe-to">
            To{' '}
            <InfoTooltip text="The last day of the period, counted whole. A race finished on this day is included." />
          </label>
          <input
            id="pe-to"
            type="date"
            className={s.input}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>
      <button type="button" onClick={load} disabled={loading} data-testid="period-evaluation-load">
        {loading ? 'Loading…' : 'Evaluate this period'}
      </button>
      {error && (
        <p role="status" style={{ color: 'var(--color-danger, #c33)' }}>
          {error}
        </p>
      )}

      {result && (
        <>
          <p data-testid="period-evaluation-summary">
            {result.counted} race(s) counted · {result.quickTestsExcluded} Quick Test(s) and
            unmarked race(s) left out
          </p>
          <table data-testid="period-evaluation-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th>Races</th>
                <th>Wins</th>
                <th>Podiums</th>
                {withPoints && <th>Points</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td style={{ textAlign: 'center' }}>{r.races}</td>
                  <td style={{ textAlign: 'center' }}>{r.wins}</td>
                  <td style={{ textAlign: 'center' }}>{r.podiums}</td>
                  {withPoints && <td style={{ textAlign: 'center' }}>{r.points}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 style={{ marginTop: '1.2rem' }}>Points rule</h4>
      <div className={s.formGrid}>
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="pe-points-on">
            Award points{' '}
            <InfoTooltip text="Off by default: the evaluation shows races, wins and podiums only. On, it adds a Points column from the ladder below and orders by it." />
          </label>
          <input
            id="pe-points-on"
            type="checkbox"
            checked={!!config.pointsEnabled}
            onChange={(e) => setConfig({ ...config, pointsEnabled: e.target.checked })}
          />
        </div>
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="pe-points-ladder">
            Points per place{' '}
            <InfoTooltip text="Comma-separated, 1st place first. A place beyond the list scores 0. No ladder is set by default." />
          </label>
          <input
            id="pe-points-ladder"
            className={s.input}
            value={ladderText}
            onChange={(e) => setLadderText(e.target.value)}
            onBlur={() => setConfig({ ...config, pointsPerPlace: parsePointsLadder(ladderText) })}
          />
        </div>
      </div>
    </div>
  );
}
