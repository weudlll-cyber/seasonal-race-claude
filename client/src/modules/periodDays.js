// ============================================================
// File:        periodDays.js
// Path:        client/src/modules/periodDays.js
// Project:     RaceArena — PERIOD-EVALUATION-1 (2026-10-04)
// Description: The period evaluation's DAYS, beside its points (`periodPoints.js`): the default
//              period (the current month), the instant a day starts, and why a period cannot be
//              evaluated. The owner's decisions of 2026-10-04 they carry are in the Dev Screen
//              section that uses them (`screens/DevScreen/sections/PeriodEvaluation.jsx`): DAYS ARE
//              UTC DAYS, and a period longer than 366 days is refused.
//
//              Moved out of that section on 2026-10-19 (chore/a7-03-close), unchanged: a component
//              file that also exports plain functions defeats React's fast refresh
//              (`react-refresh/only-export-components`).
// ============================================================

/** The longest period, in days — the server's `EVALUATION_MAX_DAYS`, which refuses anything longer. */
const PERIOD_MAX_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A UTC calendar date as `YYYY-MM-DD`, for a date input. */
const ymdUtc = (d) => d.toISOString().slice(0, 10);

/** The instant a UTC date STARTS, `days` days later. */
export const startOfUtcDay = (dateText, days = 0) =>
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
