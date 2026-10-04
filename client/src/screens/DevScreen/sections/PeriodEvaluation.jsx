// ============================================================
// File:        PeriodEvaluation.jsx
// Path:        client/src/screens/DevScreen/sections/PeriodEvaluation.jsx
// Project:     RaceArena — PERIOD-EVALUATION-1 (2026-10-04)
// Description: The PERIOD EVALUATION the owner commissioned on 2026-09-25: over a period the user
//              chooses, a table of this team's races run in it, counted by NAME. The counting rules
//              live on the server (server/src/races/periodEvaluation.js); this section chooses the
//              period, shows the table, and shows — or, for an admin, sets — the points rule.
//
// ── THE OWNER'S DECISIONS OF 2026-10-04 THAT THIS SECTION CARRIES ──────────────────────────────
//   · THE DEFAULT PERIOD IS THE CURRENT MONTH, first day to last.
//   · DAYS ARE UTC DAYS. A chosen day runs from 00:00 UTC to the next 00:00 UTC, whatever the
//     computer's own time zone, so two people evaluating the same month get the same table.
//   · A PERIOD LONGER THAN 366 DAYS IS REFUSED, here with the reason before asking, and by the
//     server in any case.
//   · THE POINTS RULE IS SERVER-WIDE: one rule, read from the server by everybody, changed by an
//     admin only. Everyone else sees the controls disabled, with a note saying why. A Points column
//     appears only when the rule is on and carries a ladder.
//   · It stays a Dev Screen section, and it is NOT admin-only to view.
// ============================================================

import { useEffect, useState } from 'react';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import {
  fetchPeriodEvaluation,
  fetchPointsRule,
  savePointsRule,
} from '../../../services/racesApi.js';
import { parsePointsLadder, pointsActive, pointsFor } from '../../../modules/periodPoints.js';
import s from '../DevScreen.module.css';

/** The longest period, in days — the server's `EVALUATION_MAX_DAYS`, which refuses anything longer. */
export const PERIOD_MAX_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A UTC calendar date as `YYYY-MM-DD`, for a date input. */
const ymdUtc = (d) => d.toISOString().slice(0, 10);

/** The instant a UTC date STARTS, `days` days later. */
const startOfUtcDay = (dateText, days = 0) =>
  new Date(Date.parse(`${dateText}T00:00:00.000Z`) + days * DAY_MS).toISOString();

/** The current month in UTC: its first and its last day. */
export function currentMonthUtc(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return { from: ymdUtc(new Date(Date.UTC(y, m, 1))), to: ymdUtc(new Date(Date.UTC(y, m + 1, 0))) };
}

/** Why this period cannot be evaluated, or '' when it can. Both days count whole. */
export function periodProblem(fromDate, toDate) {
  if (!fromDate || !toDate || toDate < fromDate) {
    return 'Choose a period whose last day is not before its first.';
  }
  const days =
    (Date.parse(startOfUtcDay(toDate, 1)) - Date.parse(startOfUtcDay(fromDate))) / DAY_MS;
  if (days > PERIOD_MAX_DAYS) {
    return `A period can be at most ${PERIOD_MAX_DAYS} days long, and this one is ${days}. Choose a shorter period.`;
  }
  return '';
}

export default function PeriodEvaluation() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [period, setPeriod] = useState(() => currentMonthUtc());
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // The server's points rule. `null` until it has answered: no Points column is guessed meanwhile.
  const [rule, setRule] = useState(null);
  const [ruleError, setRuleError] = useState('');
  const [draftOn, setDraftOn] = useState(false);
  const [ladderText, setLadderText] = useState('');
  const [ruleNote, setRuleNote] = useState('');

  useEffect(() => {
    let alive = true;
    fetchPointsRule()
      .then((r) => {
        if (!alive) return;
        setRule(r);
        setDraftOn(!!r.pointsEnabled);
        setLadderText((r.pointsPerPlace ?? []).join(', '));
      })
      .catch((e) => alive && setRuleError(e?.message || 'The points rule could not be loaded.'));
    return () => {
      alive = false;
    };
  }, []);

  const withPoints = pointsActive(rule);
  const rows = result?.rows ?? [];
  // With points on, the table is ordered by points; the server's order — wins, 2nd places, 3rd
  // places, races — decides between equal points, because the sort is stable.
  const shown = withPoints
    ? rows
        .map((r) => ({ ...r, points: pointsFor(r, rule.pointsPerPlace) }))
        .sort((a, b) => b.points - a.points)
    : rows;

  async function load() {
    setError('');
    const problem = periodProblem(period.from, period.to);
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    try {
      setResult(
        await fetchPeriodEvaluation(startOfUtcDay(period.from), startOfUtcDay(period.to, 1))
      );
    } catch (e) {
      setError(e?.message || 'The evaluation could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function saveRule() {
    setRuleNote('');
    setRuleError('');
    try {
      const saved = await savePointsRule({
        pointsEnabled: draftOn,
        pointsPerPlace: parsePointsLadder(ladderText),
      });
      setRule(saved);
      setLadderText(saved.pointsPerPlace.join(', '));
      setRuleNote('Saved. This is now the points rule for everyone on this server.');
    } catch (e) {
      setRuleError(e?.message || 'The points rule could not be saved.');
    }
  }

  return (
    <div data-testid="period-evaluation">
      <div className={s.formGrid}>
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="pe-from">
            From{' '}
            <InfoTooltip text="The first day of the period, counted whole. Days are UTC days, so everyone gets the same table." />
          </label>
          <input
            id="pe-from"
            type="date"
            className={s.input}
            value={period.from}
            onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
          />
        </div>
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="pe-to">
            To{' '}
            <InfoTooltip text="The last day of the period, counted whole (UTC). A race finished on this day is included. At most 366 days in all." />
          </label>
          <input
            id="pe-to"
            type="date"
            className={s.input}
            value={period.to}
            onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
          />
        </div>
      </div>
      <button type="button" onClick={load} disabled={loading} data-testid="period-evaluation-load">
        {loading ? 'Loading…' : 'Evaluate this period'}
      </button>
      {error && (
        <p
          role="status"
          data-testid="period-evaluation-error"
          style={{ color: 'var(--color-danger, #c33)' }}
        >
          {error}
        </p>
      )}

      {result && (
        <>
          <p data-testid="period-evaluation-summary">
            {result.counted} race(s) counted · {result.quickTestsExcluded} Quick Test(s) and
            unmarked race(s) left out · only racers who finished are counted
          </p>
          <table data-testid="period-evaluation-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th>Races</th>
                <th>Wins</th>
                <th>2nd</th>
                <th>3rd</th>
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
                  <td style={{ textAlign: 'center' }}>{r.places?.[2] ?? 0}</td>
                  <td style={{ textAlign: 'center' }}>{r.places?.[3] ?? 0}</td>
                  <td style={{ textAlign: 'center' }}>{r.podiums}</td>
                  {withPoints && <td style={{ textAlign: 'center' }}>{r.points}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 style={{ marginTop: '1.2rem' }}>Points rule</h4>
      {!isAdmin && (
        <p data-testid="points-rule-admin-note" style={{ fontSize: '0.78rem' }}>
          The points rule is the same for everyone on this server. Only an admin can change it.
        </p>
      )}
      <div className={s.formGrid}>
        <div className={s.formGroup}>
          <label className={s.label} htmlFor="pe-points-on">
            Award points{' '}
            <InfoTooltip text="Off by default: the evaluation shows races, wins, 2nd and 3rd places and podiums only. On, it adds a Points column from the ladder below and orders by it." />
          </label>
          <input
            id="pe-points-on"
            type="checkbox"
            disabled={!isAdmin || !rule}
            checked={draftOn}
            onChange={(e) => setDraftOn(e.target.checked)}
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
            disabled={!isAdmin || !rule}
            value={ladderText}
            onChange={(e) => setLadderText(e.target.value)}
          />
        </div>
      </div>
      {isAdmin && (
        <button type="button" onClick={saveRule} disabled={!rule} data-testid="points-rule-save">
          Save points rule
        </button>
      )}
      {ruleNote && <p role="status">{ruleNote}</p>}
      {ruleError && (
        <p role="alert" style={{ color: 'var(--color-danger, #c33)' }}>
          {ruleError}
        </p>
      )}
    </div>
  );
}
