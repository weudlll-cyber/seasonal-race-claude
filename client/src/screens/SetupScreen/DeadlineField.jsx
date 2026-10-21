// ============================================================
// File:        DeadlineField.jsx
// Path:        client/src/screens/SetupScreen/DeadlineField.jsx
// Project:     RaceArena — REGISTRATION-1 (follow-up 1, the owner's request of 2026-10-21)
// Description: The date-and-time field of "Until…" and "Extend until": the browser's own
//              `datetime-local` input, themed like the Setup screen's other fields (its `playerInput`
//              class, reused, plus `color-scheme: dark` so the browser draws its picker dark too) —
//              no date library. Under it, in plain words, what the choice will do — "Closes Wed 22
//              Oct, 19:45 (in 1 day 2 h)" in the browser's locale, live — or, when the choice cannot
//              be accepted, why (`deadlineProblem`, modules/registration/timeLeft.js). The caller
//              disables its button while there is a problem.
// ============================================================

import { useId } from 'react';
import {
  closesSentence,
  deadlineProblem,
  localFromMs,
  msFromLocal,
} from '../../modules/registration/timeLeft.js';
import setupStyles from './SetupScreen.module.css';
import styles from './RegistrationPanel.module.css';

/**
 * @param {{ label: string, value: string, onChange: (v: string) => void, now: number,
 *           rules?: { openedAt?: number, after?: number }, testId?: string }} props
 */
export default function DeadlineField({ label, value, onChange, now, rules = {}, testId }) {
  const hintId = useId();
  const ms = msFromLocal(value);
  const problem = value ? deadlineProblem(ms, { now, ...rules }) : null;
  const openedAt = rules.openedAt ?? now;
  return (
    <div className={styles.deadline}>
      <input
        type="datetime-local"
        className={`${setupStyles.playerInput} ${styles.dateInput}`}
        aria-label={label}
        aria-invalid={problem ? true : undefined}
        aria-describedby={hintId}
        // The picker offers only what the server will accept, as far as the browser enforces it.
        min={localFromMs(Math.max(now, rules.after ?? now) + 60 * 1000)}
        max={localFromMs(openedAt + 30 * 24 * 60 * 60 * 1000)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p
        id={hintId}
        className={problem ? styles.error : styles.muted}
        role={problem ? 'alert' : undefined}
        data-testid={testId}
      >
        {!value ? 'Choose a date and a time.' : (problem ?? closesSentence(ms, now))}
      </p>
    </div>
  );
}
