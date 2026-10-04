// ============================================================
// File:        SubCard.jsx
// Path:        client/src/screens/DevScreen/sections/SubCard.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: Shared card shell for DevScreen sections — title, optional subtitle,
//              disable-fade, and reset button slot. SubHeading is a lightweight in-card
//              group heading (label + optional note + optional per-group Reset) used when
//              several control groups share one card. `resetControlId` gives the Reset its
//              control id and info icon (DEVSCREEN-CHAPTERS-1).
// ============================================================

import { Ctl } from './ControlInfo.jsx';
import s from '../DevScreen.module.css';

const RESET_BTN_STYLE = {
  background: 'none',
  border: 'none',
  color: 'var(--color-muted)',
  fontSize: '0.72rem',
  cursor: 'pointer',
  padding: '0.1rem 0.2rem',
  opacity: 0.7,
};

// The Reset of a card or group — with its control id and info icon when it has one.
function ResetButton({ onReset, resetTestId, resetControlId }) {
  const button = (
    <button onClick={onReset} data-testid={resetTestId} style={RESET_BTN_STYLE}>
      Reset
    </button>
  );
  return resetControlId ? <Ctl id={resetControlId}>{button}</Ctl> : button;
}

// In-card group heading: a small divided heading with an optional descriptive note and an optional
// per-group Reset. Lets one SubCard hold several labelled control groups, each independently reset.
export function SubHeading({ label, note, onReset, resetTestId, resetControlId }) {
  return (
    <div
      style={{
        marginTop: '1.1rem',
        paddingTop: '0.6rem',
        borderTop: '1px solid var(--color-border, rgba(255,255,255,0.09))',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: note ? '0.2rem' : '0.6rem' }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.8rem',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: 'var(--color-muted)',
          }}
        >
          {label}
        </span>
        <span className={s.spacer} />
        {onReset && (
          <ResetButton
            onReset={onReset}
            resetTestId={resetTestId}
            resetControlId={resetControlId}
          />
        )}
      </div>
      {note && (
        <p style={{ fontSize: '0.76rem', color: 'var(--color-muted)', margin: '0 0 0.6rem' }}>
          {note}
        </p>
      )}
    </div>
  );
}

export function SubCard({
  title,
  subtitle,
  children,
  disabled,
  onReset,
  resetTestId,
  resetControlId,
}) {
  return (
    <div className={s.card} style={{ opacity: disabled ? 0.45 : 1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: subtitle ? '0.2rem' : '0.75rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</span>
        <span className={s.spacer} />
        {onReset && (
          <ResetButton
            onReset={onReset}
            resetTestId={resetTestId}
            resetControlId={resetControlId}
          />
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
