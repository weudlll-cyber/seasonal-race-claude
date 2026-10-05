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
import { Ctl, Info } from './ControlInfo.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import {
  fetchPeriodEvaluation,
  fetchPointsRule,
  savePointsRule,
} from '../../../services/racesApi.js';
import { parsePointsLadder, pointsActive, pointsFor } from '../../../modules/periodPoints.js';
import s from '../DevScreen.module.css';

/** The longest period, in days — the server's `EVALUATION_MAX_DAYS`, which refuses anything longer. */
const PERIOD_MAX_DAYS = 366;
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

/** Number columns read right-aligned; `s.table` aligns every header left, so these say otherwise. */
const NUM = { textAlign: 'right' };

/**
 * The place of each row, in the order shown: 1, 2, 3 …, and rows EQUAL on what orders the table share
 * a place (competition ranking: 1, 2, 2, 4). Equal means equal points when the rule is on, otherwise
 * equal wins, 2nd places, 3rd places and races — the server's order, without the name that only
 * breaks ties for a stable listing.
 */
function placesOf(rows, withPoints) {
  const keyOf = (r) =>
    withPoints
      ? String(r.points)
      : [r.wins, r.places?.[2] ?? 0, r.places?.[3] ?? 0, r.races].join('|');
  const out = [];
  rows.forEach((r, i) => {
    out.push(i > 0 && keyOf(r) === keyOf(rows[i - 1]) ? out[i - 1] : i + 1);
  });
  return out;
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

  // Places for the table: 1, 2, 3 … with EQUAL rows sharing a place (1, 2, 2, 4). "Equal" is equal
  // on what orders the table — points when the rule is on, else wins, 2nd, 3rd places and races.
  const places = placesOf(shown, withPoints);

  // The look is the Race History section's, reused rather than restated: the same cards and column
  // layout, the shared `s.table` (header row, row lines, hover), the `s.btn` button classes, its small
  // muted info lines and its red alert line, and `s.emptyState` for an empty period.
  return (
    <div
      data-testid="period-evaluation"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div className={s.card}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Your team&rsquo;s real races in a period, counted by name. Quick Tests are left out, and
          only racers who finished count. Days are UTC days.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div
            className={s.formGroup}
            style={{ minWidth: '160px' }}
            data-control-id="PeriodEvaluation:from"
          >
            <label
              className={s.label}
              htmlFor="pe-from"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              From
              <Info id="PeriodEvaluation:from" />
            </label>
            <input
              id="pe-from"
              type="date"
              className={s.input}
              value={period.from}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
            />
          </div>
          <div
            className={s.formGroup}
            style={{ minWidth: '160px' }}
            data-control-id="PeriodEvaluation:to"
          >
            <label
              className={s.label}
              htmlFor="pe-to"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              To
              <Info id="PeriodEvaluation:to" />
            </label>
            <input
              id="pe-to"
              type="date"
              className={s.input}
              value={period.to}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
            />
          </div>
          <div className={s.btnRow} style={{ marginBottom: '0.05rem' }}>
            <Ctl id="PeriodEvaluation:period-evaluation-load">
              <button
                type="button"
                className={`${s.btn} ${s.btnPrimary}`}
                onClick={load}
                disabled={loading}
                data-testid="period-evaluation-load"
              >
                {loading ? 'Loading…' : 'Evaluate this period'}
              </button>
            </Ctl>
          </div>
        </div>
        {error && (
          <p
            role="status"
            data-testid="period-evaluation-error"
            style={{ fontSize: '0.78rem', color: '#e63946', marginTop: '0.75rem' }}
          >
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className={s.card}>
          <p
            data-testid="period-evaluation-summary"
            style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}
          >
            {result.counted} race(s) counted · {result.quickTestsExcluded} Quick Test(s) and
            unmarked race(s) left out · only racers who finished are counted
          </p>
          {shown.length === 0 ? (
            <p className={s.emptyState} data-testid="period-evaluation-empty">
              No real race was finished in this period.
            </p>
          ) : (
            <table className={s.table} data-testid="period-evaluation-table">
              <thead>
                <tr>
                  <th style={NUM}>Place</th>
                  <th>Name</th>
                  <th style={NUM}>Races</th>
                  <th style={NUM}>Wins</th>
                  <th style={NUM}>2nd</th>
                  <th style={NUM}>3rd</th>
                  <th style={NUM}>Podiums</th>
                  {withPoints && <th style={NUM}>Points</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={r.name}>
                    <td style={NUM}>{places[i]}</td>
                    <td>{r.name}</td>
                    <td style={NUM}>{r.races}</td>
                    <td style={NUM}>{r.wins}</td>
                    <td style={NUM}>{r.places?.[2] ?? 0}</td>
                    <td style={NUM}>{r.places?.[3] ?? 0}</td>
                    <td style={NUM}>{r.podiums}</td>
                    {withPoints && <td style={NUM}>{r.points}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className={s.card}>
        <h4 className={s.label} style={{ marginBottom: '0.75rem' }}>
          Points rule
        </h4>
        {!isAdmin && (
          <p
            data-testid="points-rule-admin-note"
            style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}
          >
            The points rule is the same for everyone on this server. Only an admin can change it.
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label
            className={s.label}
            htmlFor="pe-points-on"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.55rem',
            }}
            data-control-id="PeriodEvaluation:setDraftOn"
          >
            <input
              id="pe-points-on"
              type="checkbox"
              disabled={!isAdmin || !rule}
              checked={draftOn}
              onChange={(e) => setDraftOn(e.target.checked)}
            />
            Award points
            <Info id="PeriodEvaluation:setDraftOn" />
          </label>
          <div
            className={s.formGroup}
            style={{ minWidth: '220px', flex: 1 }}
            data-control-id="PeriodEvaluation:setLadderText"
          >
            <label
              className={s.label}
              htmlFor="pe-points-ladder"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Points per place
              <Info id="PeriodEvaluation:setLadderText" />
            </label>
            <input
              id="pe-points-ladder"
              className={s.input}
              placeholder="e.g. 10, 8, 6, 5, 4, 3, 2, 1"
              disabled={!isAdmin || !rule}
              value={ladderText}
              onChange={(e) => setLadderText(e.target.value)}
            />
          </div>
          {isAdmin && (
            <div className={s.btnRow} style={{ marginBottom: '0.05rem' }}>
              <Ctl id="PeriodEvaluation:points-rule-save">
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSecondary}`}
                  onClick={saveRule}
                  disabled={!rule}
                  data-testid="points-rule-save"
                >
                  Save points rule
                </button>
              </Ctl>
            </div>
          )}
        </div>
        {ruleNote && (
          <p
            role="status"
            style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.75rem' }}
          >
            {ruleNote}
          </p>
        )}
        {ruleError && (
          <p role="alert" style={{ fontSize: '0.78rem', color: '#e63946', marginTop: '0.75rem' }}>
            {ruleError}
          </p>
        )}
      </div>
    </div>
  );
}
